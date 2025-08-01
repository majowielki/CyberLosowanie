namespace CyberLosowanie.Exceptions
{
    public class InvalidGiftAssignmentException : Exception
    {
        public int CyberekId { get; }
        public int TargetId { get; }

        public InvalidGiftAssignmentException(int cyberekId, int targetId, string message) 
            : base(message)
        {
            CyberekId = cyberekId;
            TargetId = targetId;
        }

        public InvalidGiftAssignmentException(int cyberekId, int targetId, string message, Exception innerException) 
            : base(message, innerException)
        {
            CyberekId = cyberekId;
            TargetId = targetId;
        }
    }
}