namespace CyberLosowanie.Exceptions
{
    /// <summary>
    /// The caller is authenticated but not allowed to access the requested resource
    /// (e.g. a wishlist image of someone who is neither them nor their gifted person).
    /// Maps to 403 Forbidden.
    /// </summary>
    public class ForbiddenAccessException : DomainException
    {
        public ForbiddenAccessException(string message) : base(message)
        {
        }
    }
}
