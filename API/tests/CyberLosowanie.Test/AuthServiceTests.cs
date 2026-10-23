using CyberLosowanie.Constants;
using CyberLosowanie.Exceptions;
using CyberLosowanie.Interfaces.Repositories;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using CyberLosowanie.Models.Dto;
using CyberLosowanie.Services;
using CyberLosowanie.Services.Email;
using CyberLosowanie.Test.TestSupport;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.IdentityModel.Tokens;
using Moq;
using System.IdentityModel.Tokens.Jwt;
using System.Text;

namespace CyberLosowanie.Test
{
    /// <summary>
    /// Tests for authentication flows and JWT generation. The signing-key encoding is
    /// asserted end-to-end so the ASCII/UTF8 mismatch (S3) can never regress.
    /// </summary>
    public class AuthServiceTests
    {
        // 64 chars — comfortably above the 256-bit minimum HMAC-SHA256 requires.
        private const string Secret = "test-secret-key-that-is-long-enough-for-hmac-sha256-0123456789ab";

        private readonly Mock<IApplicationUserRepository> _userRepo = new();
        private readonly Mock<UserManager<ApplicationUser>> _userManager = IdentityMocks.MockUserManager();
        private readonly Mock<RoleManager<IdentityRole>> _roleManager = IdentityMocks.MockRoleManager();
        private readonly IConfiguration _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["ApiSettings:Secret"] = Secret })
            .Build();

        private readonly Mock<IEmailService> _email = new();
        private readonly AppLinks _appLinks = new("https://app.test");

        private AuthService CreateService() =>
            new(_userRepo.Object, _userManager.Object, _roleManager.Object, _configuration,
                _email.Object, _appLinks, NullLogger<AuthService>.Instance);

        #region Constructor guards

        [Fact]
        public void Constructor_NullDependencies_ThrowArgumentNullException()
        {
            var logger = NullLogger<AuthService>.Instance;
            Assert.Throws<ArgumentNullException>(() => new AuthService(null!, _userManager.Object, _roleManager.Object, _configuration, _email.Object, _appLinks, logger));
            Assert.Throws<ArgumentNullException>(() => new AuthService(_userRepo.Object, null!, _roleManager.Object, _configuration, _email.Object, _appLinks, logger));
            Assert.Throws<ArgumentNullException>(() => new AuthService(_userRepo.Object, _userManager.Object, null!, _configuration, _email.Object, _appLinks, logger));
            Assert.Throws<ArgumentNullException>(() => new AuthService(_userRepo.Object, _userManager.Object, _roleManager.Object, null!, _email.Object, _appLinks, logger));
            Assert.Throws<ArgumentNullException>(() => new AuthService(_userRepo.Object, _userManager.Object, _roleManager.Object, _configuration, null!, _appLinks, logger));
            Assert.Throws<ArgumentNullException>(() => new AuthService(_userRepo.Object, _userManager.Object, _roleManager.Object, _configuration, _email.Object, null!, logger));
            Assert.Throws<ArgumentNullException>(() => new AuthService(_userRepo.Object, _userManager.Object, _roleManager.Object, _configuration, _email.Object, _appLinks, null!));
        }

        private static RegisterRequestDTO Registration(string password = "StrongPass1", string email = "john@example.com") =>
            new() { UserName = "john", Email = email, Password = password, Language = "en" };

        private void SetupSuccessfulCreate()
        {
            _userManager.Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>(), "StrongPass1"))
                .ReturnsAsync(IdentityResult.Success);
            _roleManager.Setup(m => m.RoleExistsAsync(It.IsAny<string>())).ReturnsAsync(true);
            _userManager.Setup(m => m.AddToRoleAsync(It.IsAny<ApplicationUser>(), "user"))
                .ReturnsAsync(IdentityResult.Success);
            _userManager.Setup(m => m.GenerateEmailConfirmationTokenAsync(It.IsAny<ApplicationUser>()))
                .ReturnsAsync("raw+token/with=chars");
        }

        #endregion

        #region LoginAsync

        [Fact]
        public async Task LoginAsync_WithNullRequest_ThrowsArgumentNullException()
        {
            await Assert.ThrowsAsync<ArgumentNullException>(() => CreateService().LoginAsync(null!));
        }

        [Theory]
        [InlineData("", "pw")]
        [InlineData("user", "")]
        public async Task LoginAsync_WithMissingCredentials_ThrowsBusinessValidationException(string userName, string password)
        {
            var request = new LoginRequestDTO { UserName = userName, Password = password };

            await Assert.ThrowsAsync<BusinessValidationException>(() => CreateService().LoginAsync(request));
        }

        [Fact]
        public async Task LoginAsync_WhenUserNotFound_ThrowsUnauthorized()
        {
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync((ApplicationUser)null!);

            await Assert.ThrowsAsync<UnauthorizedAccessException>(
                () => CreateService().LoginAsync(new LoginRequestDTO { UserName = "john", Password = "pw" }));
        }

        [Fact]
        public async Task LoginAsync_WithWrongPassword_ThrowsUnauthorized()
        {
            var user = new ApplicationUser { UserName = "john" };
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync(user);
            _userManager.Setup(m => m.CheckPasswordAsync(user, "wrong")).ReturnsAsync(false);

            await Assert.ThrowsAsync<UnauthorizedAccessException>(
                () => CreateService().LoginAsync(new LoginRequestDTO { UserName = "john", Password = "wrong" }));
        }

        [Fact]
        public async Task LoginAsync_OnSuccess_ReturnsTokenSignedWithUtf8KeyAndExpectedClaims()
        {
            var user = new ApplicationUser { UserName = "john", Id = "u1", CyberekId = 3, GiftedCyberekId = 7, EmailConfirmed = true };
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync(user);
            _userManager.Setup(m => m.CheckPasswordAsync(user, "correct")).ReturnsAsync(true);

            var result = await CreateService().LoginAsync(new LoginRequestDTO { UserName = "john", Password = "correct" });

            result.UserName.Should().Be("john");
            result.Token.Should().NotBeNullOrEmpty();

            // The token must validate against a UTF8-encoded key — the whole point of S3.
            var handler = new JwtSecurityTokenHandler();
            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Secret)),
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = false
            };

            var principal = handler.ValidateToken(result.Token, validationParameters, out _);
            principal.FindFirst("fullName")!.Value.Should().Be("john");
            principal.FindFirst("id")!.Value.Should().Be("u1");
            principal.FindFirst("cyberekId")!.Value.Should().Be("3");
            principal.FindFirst("giftedCyberekId")!.Value.Should().Be("7");
        }

        [Fact]
        public async Task LoginAsync_ByEmail_FindsTheAccount()
        {
            var user = new ApplicationUser { UserName = "john", Id = "u1", Email = "john@example.com", EmailConfirmed = true };
            _userRepo.Setup(r => r.GetByUsernameAsync("john@example.com")).ReturnsAsync((ApplicationUser?)null);
            _userRepo.Setup(r => r.GetByEmailAsync("john@example.com")).ReturnsAsync(user);
            _userManager.Setup(m => m.CheckPasswordAsync(user, "correct")).ReturnsAsync(true);

            var result = await CreateService().LoginAsync(new LoginRequestDTO { UserName = "john@example.com", Password = "correct" });

            result.UserName.Should().Be("john");
        }

        [Fact]
        public async Task LoginAsync_EmailNotConfirmed_ThrowsForbiddenAfterPasswordCheck()
        {
            var user = new ApplicationUser { UserName = "john", Id = "u1", EmailConfirmed = false };
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync(user);
            _userManager.Setup(m => m.CheckPasswordAsync(user, "correct")).ReturnsAsync(true);

            var ex = await Assert.ThrowsAsync<ForbiddenAccessException>(
                () => CreateService().LoginAsync(new LoginRequestDTO { UserName = "john", Password = "correct" }));

            ex.Message.Should().Be(EmailConstants.EMAIL_NOT_CONFIRMED);
        }

        [Fact]
        public async Task LoginAsync_EmailNotConfirmedAndWrongPassword_ThrowsUnauthorized()
        {
            // The confirmation state must not leak to someone without the password.
            var user = new ApplicationUser { UserName = "john", Id = "u1", EmailConfirmed = false };
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync(user);
            _userManager.Setup(m => m.CheckPasswordAsync(user, "wrong")).ReturnsAsync(false);

            await Assert.ThrowsAsync<UnauthorizedAccessException>(
                () => CreateService().LoginAsync(new LoginRequestDTO { UserName = "john", Password = "wrong" }));
        }

        #endregion

        #region RegisterAsync

        [Fact]
        public async Task RegisterAsync_WithNullRequest_ThrowsArgumentNullException()
        {
            await Assert.ThrowsAsync<ArgumentNullException>(() => CreateService().RegisterAsync(null!));
        }

        [Fact]
        public async Task RegisterAsync_WhenUsernameExists_ThrowsBusinessValidationException()
        {
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync(new ApplicationUser { UserName = "john" });

            await Assert.ThrowsAsync<BusinessValidationException>(() => CreateService().RegisterAsync(Registration()));
        }

        [Fact]
        public async Task RegisterAsync_WhenEmailExists_ThrowsBusinessValidationException()
        {
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync((ApplicationUser?)null);
            _userRepo.Setup(r => r.GetByEmailAsync("john@example.com")).ReturnsAsync(new ApplicationUser { UserName = "other" });

            var ex = await Assert.ThrowsAsync<BusinessValidationException>(() => CreateService().RegisterAsync(Registration()));

            ex.ValidationErrors.Should().Contain(EmailConstants.EMAIL_ALREADY_EXISTS);
            _userManager.Verify(m => m.CreateAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task RegisterAsync_WhenCreateFails_ThrowsBusinessValidationException()
        {
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync((ApplicationUser)null!);
            _userManager.Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>(), "weak"))
                .ReturnsAsync(IdentityResult.Failed(new IdentityError { Description = "Password too weak" }));

            await Assert.ThrowsAsync<BusinessValidationException>(() => CreateService().RegisterAsync(Registration("weak")));
        }

        [Fact]
        public async Task RegisterAsync_OnSuccess_CreatesUserAndSendsConfirmationLink()
        {
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync((ApplicationUser)null!);
            SetupSuccessfulCreate();
            ApplicationUser? created = null;
            _userManager.Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>(), "StrongPass1"))
                .Callback<ApplicationUser, string>((u, _) => { created = u; u.Id = "new-id"; })
                .ReturnsAsync(IdentityResult.Success);
            EmailMessage? sent = null;
            _email.Setup(e => e.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()))
                .Callback<EmailMessage, CancellationToken>((m, _) => sent = m)
                .Returns(Task.CompletedTask);

            var result = await CreateService().RegisterAsync(Registration());

            result.Should().BeTrue();
            created!.Email.Should().Be("john@example.com");
            created.PreferredLanguage.Should().Be("en");
            _userManager.Verify(m => m.AddToRoleAsync(It.IsAny<ApplicationUser>(), "user"), Times.Once);

            sent!.To.Should().Be("john@example.com");
            sent.TextBody.Should().Contain($"https://app.test/confirm-email?userId=new-id&token={EncodedToken("raw+token/with=chars")}");
        }

        [Fact]
        public async Task RegisterAsync_WhenEmailDeliveryFails_StillSucceeds()
        {
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync((ApplicationUser)null!);
            SetupSuccessfulCreate();
            _email.Setup(e => e.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException("SMTP down"));

            var result = await CreateService().RegisterAsync(Registration());

            result.Should().BeTrue();
        }

        [Fact]
        public async Task RegisterAsync_UnsupportedLanguage_FallsBackToDefault()
        {
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync((ApplicationUser)null!);
            SetupSuccessfulCreate();
            ApplicationUser? created = null;
            _userManager.Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>(), "StrongPass1"))
                .Callback<ApplicationUser, string>((u, _) => created = u)
                .ReturnsAsync(IdentityResult.Success);

            var request = Registration();
            request.Language = "de";
            await CreateService().RegisterAsync(request);

            created!.PreferredLanguage.Should().Be(EmailConstants.DEFAULT_LANGUAGE);
        }

        #endregion

        #region ConfirmEmailAsync

        private static string EncodedToken(string token) => WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));

        [Fact]
        public async Task ConfirmEmailAsync_UnknownUser_ThrowsBusinessValidation()
        {
            _userRepo.Setup(r => r.GetByIdAsync("nope")).ReturnsAsync((ApplicationUser?)null);

            await Assert.ThrowsAsync<BusinessValidationException>(() => CreateService().ConfirmEmailAsync(
                new ConfirmEmailRequestDTO { UserId = "nope", Token = EncodedToken("t") }));
        }

        [Fact]
        public async Task ConfirmEmailAsync_AlreadyConfirmed_IsIdempotent()
        {
            _userRepo.Setup(r => r.GetByIdAsync("u1")).ReturnsAsync(new ApplicationUser { Id = "u1", EmailConfirmed = true });

            await CreateService().ConfirmEmailAsync(new ConfirmEmailRequestDTO { UserId = "u1", Token = "garbage!" });

            _userManager.Verify(m => m.ConfirmEmailAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task ConfirmEmailAsync_MalformedToken_ThrowsBusinessValidation()
        {
            _userRepo.Setup(r => r.GetByIdAsync("u1")).ReturnsAsync(new ApplicationUser { Id = "u1" });

            await Assert.ThrowsAsync<BusinessValidationException>(() => CreateService().ConfirmEmailAsync(
                new ConfirmEmailRequestDTO { UserId = "u1", Token = "not*base64url" }));
        }

        [Fact]
        public async Task ConfirmEmailAsync_RejectedToken_ThrowsBusinessValidation()
        {
            var user = new ApplicationUser { Id = "u1" };
            _userRepo.Setup(r => r.GetByIdAsync("u1")).ReturnsAsync(user);
            _userManager.Setup(m => m.ConfirmEmailAsync(user, "expired"))
                .ReturnsAsync(IdentityResult.Failed(new IdentityError { Description = "Invalid token." }));

            await Assert.ThrowsAsync<BusinessValidationException>(() => CreateService().ConfirmEmailAsync(
                new ConfirmEmailRequestDTO { UserId = "u1", Token = EncodedToken("expired") }));
        }

        [Fact]
        public async Task ConfirmEmailAsync_ValidToken_PassesDecodedTokenToIdentity()
        {
            var user = new ApplicationUser { Id = "u1" };
            _userRepo.Setup(r => r.GetByIdAsync("u1")).ReturnsAsync(user);
            _userManager.Setup(m => m.ConfirmEmailAsync(user, "raw+token/with=chars")).ReturnsAsync(IdentityResult.Success);

            await CreateService().ConfirmEmailAsync(
                new ConfirmEmailRequestDTO { UserId = "u1", Token = EncodedToken("raw+token/with=chars") });

            _userManager.Verify(m => m.ConfirmEmailAsync(user, "raw+token/with=chars"), Times.Once);
        }

        #endregion

        #region ResendConfirmationAsync

        [Fact]
        public void AllowedUsernameCharacters_IncludePolishLettersButNoSpace()
        {
            const string allowed = CyberLosowanieConstants.ALLOWED_USERNAME_CHARACTERS;

            foreach (var letter in "ąćęłńóśźżĄĆĘŁŃÓŚŹŻ")
                allowed.Should().Contain(letter.ToString());
            // Identity's defaults stay allowed, so every existing account keeps working.
            foreach (var letter in new UserOptions().AllowedUserNameCharacters)
                allowed.Should().Contain(letter.ToString());
            allowed.Should().NotContain(" ");
        }

        [Fact]
        public async Task RegisterAsync_DecomposedPolishLetters_AreStoredPrecomposed()
        {
            // "Zośka" typed as "s" + combining acute (U+0301) and with stray spaces.
            const string decomposed = " Zośka ";
            _userRepo.Setup(r => r.GetByUsernameAsync("Zośka")).ReturnsAsync((ApplicationUser?)null);
            ApplicationUser? created = null;
            _userManager.Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>(), "StrongPass1"))
                .Callback<ApplicationUser, string>((u, _) => created = u)
                .ReturnsAsync(IdentityResult.Success);

            await CreateService().RegisterAsync(new RegisterRequestDTO
            {
                UserName = decomposed, Email = "zoska@example.com", Password = "StrongPass1", Language = "pl"
            });

            created!.UserName.Should().Be("Zośka");
            created.UserName!.Length.Should().Be(5);
        }

        [Fact]
        public async Task LoginAsync_DecomposedPolishLetters_FindTheAccount()
        {
            var user = new ApplicationUser { UserName = "Michał Żółć".Replace(" ", ""), Id = "u1", EmailConfirmed = true };
            _userRepo.Setup(r => r.GetByUsernameAsync("MichałŻółć")).ReturnsAsync(user);
            _userManager.Setup(m => m.CheckPasswordAsync(user, "correct")).ReturnsAsync(true);

            // Ż = Z + dot above (U+0307), ó = o + acute (U+0301), ć = c + acute.
            var result = await CreateService().LoginAsync(new LoginRequestDTO
            {
                UserName = "MichałŻółć", Password = "correct"
            });

            result.UserName.Should().Be("MichałŻółć");
        }

        [Fact]
        public async Task ResendConfirmationAsync_UnknownOrConfirmedAccount_SendsNothing()
        {
            _userRepo.Setup(r => r.GetByUsernameAsync("ghost")).ReturnsAsync((ApplicationUser?)null);
            _userRepo.Setup(r => r.GetByUsernameAsync("done")).ReturnsAsync(new ApplicationUser { UserName = "done", EmailConfirmed = true });

            await CreateService().ResendConfirmationAsync(new ResendConfirmationRequestDTO { Login = "ghost" });
            await CreateService().ResendConfirmationAsync(new ResendConfirmationRequestDTO { Login = "done" });

            _email.Verify(e => e.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task ResendConfirmationAsync_UnconfirmedAccount_SendsNewLink()
        {
            var user = new ApplicationUser { Id = "u1", UserName = "john", Email = "john@example.com" };
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync(user);
            _userManager.Setup(m => m.GenerateEmailConfirmationTokenAsync(user)).ReturnsAsync("tok");

            await CreateService().ResendConfirmationAsync(new ResendConfirmationRequestDTO { Login = "john" });

            _email.Verify(e => e.SendAsync(It.Is<EmailMessage>(m => m.To == "john@example.com"), It.IsAny<CancellationToken>()), Times.Once);
        }

        #endregion
    }
}
