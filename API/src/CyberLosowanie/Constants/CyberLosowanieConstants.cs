namespace CyberLosowanie.Constants
{
    public static class CyberLosowanieConstants
    {
        // Single source of truth for the number of cyberki. The seed in
        // ApplicationDbContext must produce exactly this many rows (ids MIN..MAX).
        public const int TOTAL_CYBERKI_COUNT = 12;
        public const int MIN_CYBEREK_ID = 1;
        public const int MAX_CYBEREK_ID = TOTAL_CYBERKI_COUNT;

        public const string Role_Admin = "admin";
        public const string Role_User = "user";

        // Error messages
        // Built from MIN/MAX so the numbers are never duplicated as literals (E1).
        public static readonly string INVALID_CYBEREK_ID =
            $"Cyberek ID must be between {MIN_CYBEREK_ID} and {MAX_CYBEREK_ID}";
        public const string CYBEREK_NOT_FOUND = "Cyberek not found";
        public const string USER_NOT_FOUND = "User not found";
        public const string INVALID_USERNAME = "Username cannot be null or empty";
        public const string INVALID_PASSWORD = "Password cannot be null or empty";
        public const string USERNAME_ALREADY_EXISTS = "Username already exists";
        public const string GIFT_ALREADY_ASSIGNED = "Gift has already been assigned";

        // Default values
        public const string DEFAULT_ERROR_MESSAGE = "An error occurred while processing your request";
        public const int DEFAULT_TOKEN_EXPIRATION_DAYS = 7;
    }
}