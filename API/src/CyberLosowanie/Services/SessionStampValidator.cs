using CyberLosowanie.Constants;
using CyberLosowanie.Interfaces.Repositories;
using System.Security.Claims;

namespace CyberLosowanie.Services
{
    /// <summary>
    /// Checks that a signed-in request still belongs to a live session: the JWT
    /// carries the account's security stamp from sign-in, and Identity changes the
    /// stamp when the password is reset. A token from before the reset (another
    /// device, or someone who had taken over the account) is rejected, as is a
    /// token for a deleted account or one issued before the stamp claim existed.
    /// Runs on every authorized request (JwtBearerEvents.OnTokenValidated).
    /// </summary>
    public static class SessionStampValidator
    {
        public static async Task<bool> IsCurrentAsync(ClaimsPrincipal principal, IApplicationUserRepository users)
        {
            ArgumentNullException.ThrowIfNull(principal);
            ArgumentNullException.ThrowIfNull(users);

            var userId = principal.FindFirst("id")?.Value;
            var stamp = principal.FindFirst(CyberLosowanieConstants.SESSION_STAMP_CLAIM)?.Value;
            if (string.IsNullOrEmpty(userId) || stamp == null)
                return false;

            var user = await users.GetByIdAsync(userId);
            return user != null && string.Equals(user.SecurityStamp ?? string.Empty, stamp, StringComparison.Ordinal);
        }
    }
}
