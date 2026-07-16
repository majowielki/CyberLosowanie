namespace CyberLosowanie.Interfaces.Services
{
    /// <summary>
    /// Blob storage abstraction for wishlist images. Paths are container-relative:
    /// "{cyberekId}/{guid}.{ext}". Implemented on Azure Blob Storage
    /// (Services/WishlistImageStorage); tests mock this interface.
    /// </summary>
    public interface IWishlistImageStorage
    {
        Task UploadAsync(string path, Stream content, string contentType);

        /// <summary>Null when the blob does not exist.</summary>
        Task<(Stream Content, string ContentType)?> DownloadAsync(string path);

        Task DeleteAsync(string path);

        /// <summary>All blob paths under the given prefix (e.g. "{cyberekId}/").</summary>
        Task<IReadOnlyList<string>> ListPathsAsync(string prefix);
    }
}
