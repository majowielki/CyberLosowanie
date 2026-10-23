using CyberLosowanie.Constants;
using CyberLosowanie.Interfaces.Repositories;
using CyberLosowanie.Models;
using CyberLosowanie.Services;
using FluentAssertions;
using Moq;
using System.Security.Claims;

namespace CyberLosowanie.Test
{
    /// <summary>
    /// A token stays valid only while the account's security stamp matches the one
    /// it was issued with — a password reset signs every other session out.
    /// </summary>
    public class SessionStampValidatorTests
    {
        private readonly Mock<IApplicationUserRepository> _users = new();

        private static ClaimsPrincipal Principal(string? userId = "u1", string? stamp = "stamp-1")
        {
            var claims = new List<Claim>();
            if (userId != null) claims.Add(new Claim("id", userId));
            if (stamp != null) claims.Add(new Claim(CyberLosowanieConstants.SESSION_STAMP_CLAIM, stamp));
            return new ClaimsPrincipal(new ClaimsIdentity(claims, "jwt"));
        }

        [Fact]
        public async Task SameStamp_IsCurrent()
        {
            _users.Setup(u => u.GetByIdAsync("u1")).ReturnsAsync(new ApplicationUser { Id = "u1", SecurityStamp = "stamp-1" });

            (await SessionStampValidator.IsCurrentAsync(Principal(), _users.Object)).Should().BeTrue();
        }

        [Fact]
        public async Task StampChangedByPasswordReset_IsRejected()
        {
            _users.Setup(u => u.GetByIdAsync("u1")).ReturnsAsync(new ApplicationUser { Id = "u1", SecurityStamp = "stamp-2" });

            (await SessionStampValidator.IsCurrentAsync(Principal(), _users.Object)).Should().BeFalse();
        }

        [Fact]
        public async Task TokenFromBeforeTheStampClaim_IsRejected()
        {
            (await SessionStampValidator.IsCurrentAsync(Principal(stamp: null), _users.Object)).Should().BeFalse();
            _users.Verify(u => u.GetByIdAsync(It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task DeletedAccount_IsRejected()
        {
            _users.Setup(u => u.GetByIdAsync("u1")).ReturnsAsync((ApplicationUser?)null);

            (await SessionStampValidator.IsCurrentAsync(Principal(), _users.Object)).Should().BeFalse();
        }

        [Fact]
        public async Task MissingUserId_IsRejected()
        {
            (await SessionStampValidator.IsCurrentAsync(Principal(userId: null), _users.Object)).Should().BeFalse();
        }
    }
}
