using Azure;
using Azure.Storage.Blobs;
using CyberLosowanie.Constants;
using CyberLosowanie.Interfaces.Services;

namespace CyberLosowanie.Services
{
    /// <summary>
    /// Azure Blob Storage implementation of <see cref="ICyberekImageStorage"/>.
    /// Uses the private "cyberki-images" container — the portraits are photos of
    /// real people, so they are only reachable through the authorized endpoint.
    /// Local development runs against Azurite ("UseDevelopmentStorage=true").
    /// </summary>
    public class CyberekImageStorage : ICyberekImageStorage
    {
        private readonly BlobContainerClient _container;

        public CyberekImageStorage(BlobServiceClient blobServiceClient)
        {
            ArgumentNullException.ThrowIfNull(blobServiceClient);
            _container = blobServiceClient.GetBlobContainerClient(CyberekImageConstants.CONTAINER_NAME);
        }

        public async Task<(Stream Content, string ContentType)?> DownloadAsync(int cyberekId, string kind)
        {
            var blob = _container.GetBlobClient(CyberekImageConstants.BlobPath(cyberekId, kind));
            try
            {
                var response = await blob.DownloadStreamingAsync();
                var contentType = response.Value.Details.ContentType;
                return (response.Value.Content,
                    string.IsNullOrWhiteSpace(contentType) ? CyberekImageConstants.ContentType(kind) : contentType);
            }
            catch (RequestFailedException ex) when (ex.Status == StatusCodes.Status404NotFound)
            {
                // Missing blob or missing container (images not uploaded yet).
                return null;
            }
        }
    }
}
