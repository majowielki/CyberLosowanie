namespace CyberLosowanie.Exceptions
{
    /// <summary>
    /// The cyberek a user tried to claim already belongs to another participant —
    /// picked in the meantime, or never offered (the pick list hides taken ones).
    /// Maps to 409 Conflict: the client should refresh the list and pick again.
    /// </summary>
    public class CyberekTakenException : DomainException
    {
        public int CyberekId { get; }

        public CyberekTakenException(int cyberekId)
            : base("This cyberek is already taken by another participant. Refresh the list and choose a different one.")
        {
            CyberekId = cyberekId;
        }

        public CyberekTakenException(int cyberekId, Exception innerException)
            : base("This cyberek is already taken by another participant. Refresh the list and choose a different one.", innerException)
        {
            CyberekId = cyberekId;
        }
    }
}
