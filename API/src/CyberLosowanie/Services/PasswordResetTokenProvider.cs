using CyberLosowanie.Constants;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace CyberLosowanie.Services
{
    /// <summary>
    /// Identity's data-protection token provider, used only for password reset
    /// links so they can expire much sooner than the email confirmation links
    /// (which keep the default provider's one day).
    /// </summary>
    public class PasswordResetTokenProvider<TUser> : DataProtectorTokenProvider<TUser> where TUser : class
    {
        public PasswordResetTokenProvider(
            IDataProtectionProvider dataProtectionProvider,
            IOptions<PasswordResetTokenProviderOptions> options,
            ILogger<DataProtectorTokenProvider<TUser>> logger)
            : base(dataProtectionProvider, options, logger)
        {
        }
    }

    public class PasswordResetTokenProviderOptions : DataProtectionTokenProviderOptions
    {
        public PasswordResetTokenProviderOptions()
        {
            Name = EmailConstants.PASSWORD_RESET_TOKEN_PROVIDER;
            TokenLifespan = EmailConstants.PASSWORD_RESET_TOKEN_LIFESPAN;
        }
    }
}
