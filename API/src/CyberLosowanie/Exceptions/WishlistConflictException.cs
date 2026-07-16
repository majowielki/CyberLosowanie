namespace CyberLosowanie.Exceptions
{
    /// <summary>
    /// The wishlist operation is valid in itself but the caller's draw state does not
    /// allow it yet — no cyberek selected, or the draw is not completed. Maps to
    /// 409 Conflict: the client should finish the corresponding draw step first.
    /// </summary>
    public class WishlistConflictException : DomainException
    {
        public WishlistConflictException(string message) : base(message)
        {
        }
    }
}
