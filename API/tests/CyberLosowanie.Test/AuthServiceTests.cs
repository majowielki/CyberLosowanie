using CyberLosowanie.Exceptions;
using CyberLosowanie.Interfaces.Repositories;
using CyberLosowanie.Models;
using CyberLosowanie.Models.Dto;
using CyberLosowanie.Services;
using CyberLosowanie.Test.TestSupport;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
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

        private AuthService CreateService() =>
            new(_userRepo.Object, _userManager.Object, _roleManager.Object, _configuration);

        #region Constructor guards

        [Fact]
        public void Constructor_NullDependencies_ThrowArgumentNullException()
        {
            Assert.Throws<ArgumentNullException>(() => new AuthService(null!, _userManager.Object, _roleManager.Object, _configuration));
            Assert.Throws<ArgumentNullException>(() => new AuthService(_userRepo.Object, null!, _roleManager.Object, _configuration));
            Assert.Throws<ArgumentNullException>(() => new AuthService(_userRepo.Object, _userManager.Object, null!, _configuration));
            Assert.Throws<ArgumentNullException>(() => new AuthService(_userRepo.Object, _userManager.Object, _roleManager.Object, null!));
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
            var user = new ApplicationUser { UserName = "john", Id = "u1", CyberekId = 3, GiftedCyberekId = 7 };
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

            await Assert.ThrowsAsync<BusinessValidationException>(
                () => CreateService().RegisterAsync(new RegisterRequestDTO { UserName = "john", Password = "pw" }));
        }

        [Fact]
        public async Task RegisterAsync_WhenCreateFails_ThrowsBusinessValidationException()
        {
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync((ApplicationUser)null!);
            _userManager.Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>(), "weak"))
                .ReturnsAsync(IdentityResult.Failed(new IdentityError { Description = "Password too weak" }));

            await Assert.ThrowsAsync<BusinessValidationException>(
                () => CreateService().RegisterAsync(new RegisterRequestDTO { UserName = "john", Password = "weak" }));
        }

        [Fact]
        public async Task RegisterAsync_OnSuccess_CreatesUserAndAssignsUserRole()
        {
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync((ApplicationUser)null!);
            _userManager.Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>(), "StrongPass1"))
                .ReturnsAsync(IdentityResult.Success);
            _roleManager.Setup(m => m.RoleExistsAsync(It.IsAny<string>())).ReturnsAsync(true);
            _userManager.Setup(m => m.AddToRoleAsync(It.IsAny<ApplicationUser>(), "user"))
                .ReturnsAsync(IdentityResult.Success);

            var result = await CreateService().RegisterAsync(new RegisterRequestDTO { UserName = "john", Password = "StrongPass1" });

            result.Should().BeTrue();
            _userManager.Verify(m => m.AddToRoleAsync(It.IsAny<ApplicationUser>(), "user"), Times.Once);
        }

        #endregion
    }
}
