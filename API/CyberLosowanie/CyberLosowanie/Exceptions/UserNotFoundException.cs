namespace CyberLosowanie.Exceptions
{
    public class UserNotFoundException : Exception
    {
        public string UserName { get; }

        public UserNotFoundException(string userName) 
            : base($"User with username '{userName}' not found")
        {
            UserName = userName;
        }

        public UserNotFoundException(string userName, Exception innerException) 
            : base($"User with username '{userName}' not found", innerException)
        {
            UserName = userName;
        }
    }
}