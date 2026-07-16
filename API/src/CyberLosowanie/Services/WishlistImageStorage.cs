using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using CyberLosowanie.Constants;
using CyberLosowanie.Interfaces.Services;

namespace CyberLosowanie.Services
{
    /// <summary>
    /// Azure Blob Storage implementation of <see cref="IWishlistImageStorage"/>.
    /// Uses the private "wishlist-images" container; images are only reachable
    /// through the authorized proxy endpoint, never via public URLs or SAS tokens.
    /// Local development runs against Azurite ("UseDevelopmentStorage=true").
    /// </summary>
    public class WishlistImageStorage : IWishlistImageStorage
    {
        private readonly BlobContainerClient _container;

        public WishlistImageStorage(BlobServiceClient blobServiceClient)
        {
            ArgumentNullException.ThrowIfNull(blobServiceClient);
            _container = blobServiceClient.GetBlobContainerClient(WishlistConstants.IMAGES_CONTAINER_NAME);
        }

        public async Task UploadAsync(string path, Stream content, string contentType)
        {
            await _container.CreateIfNotExistsAsync();
            var blob = _container.GetBlobClient(path);
            await blob.UploadAsync(content, new BlobUploadOptions
            {
                HttpHeaders = new BlobHttpHeaders { ContentType = contentType }
            });
        }

        public async Task<(Stream Content, string ContentType)?> DownloadAsync(string path)
        {
            var blob = _container.GetBlobClient(path);
            try
            {
                var response = await blob.DownloadStreamingAsync();
                return (response.Value.Content, response.Value.Details.ContentType);
            }
            catch (RequestFailedException ex) when (ex.Status == StatusCodes.Status404NotFound)
            {
                return null;
            }
        }

        public async Task DeleteAsync(string path)
        {
            await _container.GetBlobClient(path).DeleteIfExistsAsync();
        }

        public async Task<IReadOnlyList<string>> ListPathsAsync(string prefix)
        {
            var paths = new List<string>();
            try
            {
                await foreach (var blob in _container.GetBlobsAsync(BlobTraits.None, BlobStates.None, prefix, CancellationToken.None))
                {
                    paths.Add(blob.Name);
                }
            }
            catch (RequestFailedException ex) when (ex.Status == StatusCodes.Status404NotFound)
            {
                // Container not created yet — nothing stored, nothing to list.
            }
            return paths;
        }
    }
}
