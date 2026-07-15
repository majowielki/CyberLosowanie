namespace CyberLosowanie.Exceptions
{
    /// <summary>
    /// The chosen gift target was available when the user saw it, but is not anymore —
    /// taken by a concurrent draw, or committing it would strand another participant
    /// with no valid option. Maps to 409 Conflict: the client should refresh the list
    /// of available boxes and let the user pick again.
    /// </summary>
    public class GiftTargetUnavailableException : DomainException
    {
        public int GiverCyberekId { get; }
        public int TargetCyberekId { get; }

        public GiftTargetUnavailableException(int giverCyberekId, int targetCyberekId, string message)
            : base(message)
        {
            GiverCyberekId = giverCyberekId;
            TargetCyberekId = targetCyberekId;
        }

        public GiftTargetUnavailableException(int giverCyberekId, int targetCyberekId, string message, Exception innerException)
            : base(message, innerException)
        {
            GiverCyberekId = giverCyberekId;
            TargetCyberekId = targetCyberekId;
        }
    }
}
