namespace CyberLosowanie.Constants
{
    public static class CyberLosowanieConstants
    {
        public const int TOTAL_CYBERKI_COUNT = 12;
        public const int BANNED_CYBERKI_PER_USER = 3;
        public const int MIN_CYBEREK_ID = 1;
        public const int MAX_CYBEREK_ID = 12;

        public const string Role_Admin = "admin";
        public const string Role_User = "user";

        // Error messages
        public const string INVALID_CYBEREK_ID = "Cyberek ID must be between 1 and 12";
        public const string CYBEREK_NOT_FOUND = "Cyberek not found";
        public const string USER_NOT_FOUND = "User not found";
        public const string INVALID_USERNAME = "Username cannot be null or empty";
        public const string INVALID_PASSWORD = "Password cannot be null or empty";
        public const string USERNAME_ALREADY_EXISTS = "Username already exists";
        public const string INVALID_CREDENTIALS = "Invalid username or password";
        public const string GIFT_ALREADY_ASSIGNED = "Gift has already been assigned";
        public const string INVALID_GIFT_TARGET = "Invalid gift target";
        public const string INSUFFICIENT_AVAILABLE_TARGETS = "Not enough available gift targets";

        // Default values
        public const string DEFAULT_ERROR_MESSAGE = "An error occurred while processing your request";
        public const int DEFAULT_TOKEN_EXPIRATION_DAYS = 7;
    }
}