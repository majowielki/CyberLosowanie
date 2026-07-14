namespace CyberLosowanie.Exceptions
{
    /// <summary>
    /// Represents an unexpected failure in the data-access / infrastructure layer.
    /// Deliberately NOT a <see cref="DomainException"/>: it is treated as an
    /// unexpected server error (HTTP 500) rather than a client error (4xx).
    /// </summary>
    public class DataAccessException : Exception
    {
        public DataAccessException(string message) : base(message)
        {
        }

        public DataAccessException(string message, Exception innerException)
            : base(message, innerException)
        {
        }
    }
}
