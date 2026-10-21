namespace CyberLosowanie.Interfaces.Services
{
    /// <summary>
    /// Read access to the cyberek portraits (see CyberekImageConstants). Implemented
    /// on Azure Blob Storage (Services/CyberekImageStorage); tests mock this interface.
    /// </summary>
    public interface ICyberekImageStorage
    {
        /// <summary>Null when the image does not exist.</summary>
        Task<(Stream Content, string ContentType)?> DownloadAsync(int cyberekId, string kind);
    }
}
