namespace CyberLosowanie.Exceptions
{
    public class BusinessValidationException : Exception
    {
        public List<string> ValidationErrors { get; }

        public BusinessValidationException(string message) : base(message)
        {
            ValidationErrors = new List<string> { message };
        }

        public BusinessValidationException(List<string> validationErrors) 
            : base(string.Join("; ", validationErrors))
        {
            ValidationErrors = validationErrors ?? new List<string>();
        }

        public BusinessValidationException(string message, Exception innerException) 
            : base(message, innerException)
        {
            ValidationErrors = new List<string> { message };
        }
    }
}