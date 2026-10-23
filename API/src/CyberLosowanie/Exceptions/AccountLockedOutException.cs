using CyberLosowanie.Constants;

namespace CyberLosowanie.Exceptions
{
    /// <summary>
    /// Sign-in refused because the account is locked after too many wrong passwords.
    /// Maps to 429 Too Many Requests; the lock ends on its own or with a password reset.
    /// </summary>
    public class AccountLockedOutException : DomainException
    {
        public AccountLockedOutException()
            : base(CyberLosowanieConstants.ACCOUNT_LOCKED_OUT)
        {
        }
    }
}
