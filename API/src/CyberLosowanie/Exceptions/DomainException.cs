namespace CyberLosowanie.Exceptions
{
    /// <summary>
    /// Base type for expected business/domain errors. These map to 4xx responses
    /// in the global exception handler and must never be wrapped into an
    /// infrastructure exception (they are excluded from generic catch blocks).
    /// </summary>
    public abstract class DomainException : Exception
    {
        protected DomainException(string message) : base(message)
        {
        }

        protected DomainException(string message, Exception innerException)
            : base(message, innerException)
        {
        }
    }
}
