namespace CyberLosowanie.Exceptions
{
    public class CyberekNotFoundException : Exception
    {
        public int CyberekId { get; }

        public CyberekNotFoundException(int id) 
            : base($"Cyberek with ID {id} not found")
        {
            CyberekId = id;
        }

        public CyberekNotFoundException(int id, Exception innerException) 
            : base($"Cyberek with ID {id} not found", innerException)
        {
            CyberekId = id;
        }
    }
}