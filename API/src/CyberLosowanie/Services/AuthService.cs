using CyberLosowanie.Constants;
using CyberLosowanie.Exceptions;
using CyberLosowanie.Interfaces.Repositories;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using CyberLosowanie.Models.Dto;
using CyberLosowanie.Services.Email;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace CyberLosowanie.Services
{
    public class AuthService : IAuthService
    {
        private readonly IApplicationUserRepository _userRepository;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private readonly AppLinks _appLinks;
        private readonly ILogger<AuthService> _logger;

        public AuthService(
            IApplicationUserRepository userRepository,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            IConfiguration configuration,
            IEmailService emailService,
            AppLinks appLinks,
            ILogger<AuthService> logger)
        {
            _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _roleManager = roleManager ?? throw new ArgumentNullException(nameof(roleManager));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
            _appLinks = appLinks ?? throw new ArgumentNullException(nameof(appLinks));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<LoginResponseDTO> LoginAsync(LoginRequestDTO request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            // Defence in depth: the API boundary (DataAnnotations) already rejects
            // empty credentials; this guards direct service callers.
            if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.Password))
                throw new BusinessValidationException("Username and password are required");

            var user = await FindByLoginAsync(request.UserName);
            if (user == null)
                throw new UnauthorizedAccessException("Invalid username or password");

            var isValid = await _userManager.CheckPasswordAsync(user, request.Password);
            if (!isValid)
                throw new UnauthorizedAccessException("Invalid username or password");

            // Checked only after the password, so the confirmation state of an
            // account is never revealed to someone who does not own it.
            if (!user.EmailConfirmed)
                throw new ForbiddenAccessException(EmailConstants.EMAIL_NOT_CONFIRMED);

            var token = GenerateJwtToken(user);

            return new LoginResponseDTO
            {
                UserName = user.UserName ?? string.Empty,
                Token = token
            };
        }

        public async Task<bool> RegisterAsync(RegisterRequestDTO request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.Password)
                || string.IsNullOrWhiteSpace(request.Email))
                throw new BusinessValidationException("Username, email and password are required");

            var userName = NormalizeLogin(request.UserName);
            var existingUser = await _userRepository.GetByUsernameAsync(userName);
            if (existingUser != null)
                throw new BusinessValidationException(CyberLosowanieConstants.USERNAME_ALREADY_EXISTS);

            var email = request.Email.Trim();
            var existingEmail = await _userRepository.GetByEmailAsync(email);
            if (existingEmail != null)
                throw new BusinessValidationException(EmailConstants.EMAIL_ALREADY_EXISTS);

            var newUser = new ApplicationUser
            {
                UserName = userName,
                Email = email,
                PreferredLanguage = EmailConstants.NormalizeLanguage(request.Language)
            };

            var result = await _userManager.CreateAsync(newUser, request.Password);
            if (!result.Succeeded)
                throw new BusinessValidationException(result.Errors.Select(e => e.Description).ToList());

            if (!await _roleManager.RoleExistsAsync(CyberLosowanieConstants.Role_Admin))
            {
                await _roleManager.CreateAsync(new IdentityRole(CyberLosowanieConstants.Role_Admin));
                await _roleManager.CreateAsync(new IdentityRole(CyberLosowanieConstants.Role_User));
            }

            await _userManager.AddToRoleAsync(newUser, CyberLosowanieConstants.Role_User);

            // The account exists at this point; a delivery failure must not turn the
            // registration into an error — the user can request the link again.
            await TrySendConfirmationAsync(newUser);
            return true;
        }

        public async Task ConfirmEmailAsync(ConfirmEmailRequestDTO request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var user = await _userRepository.GetByIdAsync(request.UserId);
            if (user == null)
                throw new BusinessValidationException(EmailConstants.INVALID_CONFIRMATION_LINK);

            // Opening the link twice (or a mail scanner opening it first) is not an error.
            if (user.EmailConfirmed)
                return;

            string token;
            try
            {
                token = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(request.Token));
            }
            catch (FormatException)
            {
                throw new BusinessValidationException(EmailConstants.INVALID_CONFIRMATION_LINK);
            }

            var result = await _userManager.ConfirmEmailAsync(user, token);
            if (!result.Succeeded)
                throw new BusinessValidationException(EmailConstants.INVALID_CONFIRMATION_LINK);
        }

        public async Task ResendConfirmationAsync(ResendConfirmationRequestDTO request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var user = await FindByLoginAsync(request.Login);
            if (user == null || user.EmailConfirmed)
                return;

            await TrySendConfirmationAsync(user);
        }

        /// <summary>Usernames may themselves contain '@', so a username match wins over an email match.</summary>
        private async Task<ApplicationUser?> FindByLoginAsync(string login)
        {
            var normalized = NormalizeLogin(login);
            return await _userRepository.GetByUsernameAsync(normalized)
                ?? (normalized.Contains('@') ? await _userRepository.GetByEmailAsync(normalized) : null);
        }

        /// <summary>
        /// Trimmed, Unicode NFC. A Polish letter can arrive precomposed ("ó") or as a
        /// base letter plus a combining accent, depending on the keyboard; NFC makes
        /// both the same name, so an account made on one device signs in on another.
        /// </summary>
        private static string NormalizeLogin(string login) => login.Trim().Normalize(NormalizationForm.FormC);

        private async Task TrySendConfirmationAsync(ApplicationUser user)
        {
            try
            {
                var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
                var link = _appLinks.Build(EmailConstants.CONFIRM_EMAIL_PATH, new Dictionary<string, string?>
                {
                    ["userId"] = user.Id,
                    ["token"] = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token))
                });

                await _emailService.SendAsync(EmailTemplates.ConfirmEmail(
                    user.Email!, user.PreferredLanguage, user.UserName ?? string.Empty, link));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Could not send the confirmation email to user {UserId}", user.Id);
            }
        }

        private string GenerateJwtToken(ApplicationUser user)
        {
            var secretKey = _configuration.GetValue<string>("ApiSettings:Secret");
            if (string.IsNullOrEmpty(secretKey))
                throw new InvalidOperationException("JWT secret key is not configured");

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(secretKey);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim("fullName", user.UserName ?? string.Empty),
                    new Claim("id", user.Id ?? string.Empty),
                    new Claim("cyberekId", user.CyberekId.ToString()),
                    new Claim("giftedCyberekId", user.GiftedCyberekId.ToString())
                }),
                Expires = DateTime.UtcNow.AddDays(CyberLosowanieConstants.DEFAULT_TOKEN_EXPIRATION_DAYS),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}