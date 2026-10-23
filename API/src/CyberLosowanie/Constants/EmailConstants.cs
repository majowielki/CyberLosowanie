namespace CyberLosowanie.Constants
{
    /// <summary>Email delivery settings and the user-facing auth messages around it.</summary>
    public static class EmailConstants
    {
        // Languages emails are written in (mirrors the frontend i18n languages).
        public const string DEFAULT_LANGUAGE = "pl";
        public static readonly string[] SUPPORTED_LANGUAGES = ["pl", "en"];

        // Frontend routes the emailed links point to (relative to App:PublicBaseUrl).
        public const string CONFIRM_EMAIL_PATH = "confirm-email";
        public const string RESET_PASSWORD_PATH = "reset-password";

        // A password reset link is a key to the account: short-lived (and single
        // use — resetting the password changes the security stamp it is tied to).
        public const string PASSWORD_RESET_TOKEN_PROVIDER = "PasswordReset";
        public static readonly TimeSpan PASSWORD_RESET_TOKEN_LIFESPAN = TimeSpan.FromHours(2);
        public const string GIFTED_WISHLIST_PATH = "wishlist/gifted";

        // Rate limiter policy for endpoints that send email on an anonymous request.
        public const string EMAIL_RATE_LIMIT_POLICY = "email";

        // Error messages
        public const string EMAIL_ALREADY_EXISTS = "An account with this email already exists";
        public const string EMAIL_NOT_CONFIRMED = "Email address has not been confirmed yet";
        public const string INVALID_CONFIRMATION_LINK = "The confirmation link is invalid or has expired";
        public const string INVALID_RESET_LINK = "The password reset link is invalid or has expired";

        public static string NormalizeLanguage(string? language) =>
            language != null && SUPPORTED_LANGUAGES.Contains(language.ToLowerInvariant())
                ? language.ToLowerInvariant()
                : DEFAULT_LANGUAGE;
    }
}
