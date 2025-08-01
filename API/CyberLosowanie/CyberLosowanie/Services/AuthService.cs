using CyberLosowanie.Constants;
using CyberLosowanie.Interfaces.Repositories;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using CyberLosowanie.Models.Dto;
using Microsoft.AspNetCore.Identity;
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

        public AuthService(
            IApplicationUserRepository userRepository,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            IConfiguration configuration)
        {
            _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _roleManager = roleManager ?? throw new ArgumentNullException(nameof(roleManager));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        }

        public async Task<LoginResponseDTO> LoginAsync(LoginRequestDTO request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.Password))
                throw new ArgumentException("Username and password are required");

            var user = await _userRepository.GetByUsernameAsync(request.UserName);
            if (user == null)
                throw new UnauthorizedAccessException("Invalid username or password");

            var isValid = await _userManager.CheckPasswordAsync(user, request.Password);
            if (!isValid)
                throw new UnauthorizedAccessException("Invalid username or password");

            var token = GenerateJwtToken(user);

            return new LoginResponseDTO
            {
                UserName = user.UserName,
                Token = token
            };
        }

        public async Task<bool> RegisterAsync(RegisterRequestDTO request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.Password))
                throw new ArgumentException("Username and password are required");

            var existingUser = await _userRepository.GetByUsernameAsync(request.UserName);
            if (existingUser != null)
                throw new InvalidOperationException("Username already exists");

            var newUser = new ApplicationUser
            {
                UserName = request.UserName
            };

            var result = await _userManager.CreateAsync(newUser, request.Password);
            if (!result.Succeeded)
                throw new InvalidOperationException($"User creation failed: {string.Join(", ", result.Errors.Select(e => e.Description))}");

            if (!await _roleManager.RoleExistsAsync(CyberLosowanieConstants.Role_Admin))
            {
                await _roleManager.CreateAsync(new IdentityRole(CyberLosowanieConstants.Role_Admin));
                await _roleManager.CreateAsync(new IdentityRole(CyberLosowanieConstants.Role_User));
            }

            await _userManager.AddToRoleAsync(newUser, CyberLosowanieConstants.Role_User);
            return true;
        }

        private string GenerateJwtToken(ApplicationUser user)
        {
            var secretKey = _configuration.GetValue<string>("ApiSettings:Secret");
            if (string.IsNullOrEmpty(secretKey))
                throw new InvalidOperationException("JWT secret key is not configured");

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(secretKey);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim("fullName", user.UserName ?? string.Empty),
                    new Claim("id", user.Id ?? string.Empty),
                    new Claim("cyberekId", user.CyberekId.ToString()),
                    new Claim("giftedCyberekId", user.GiftedCyberekId.ToString())
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}