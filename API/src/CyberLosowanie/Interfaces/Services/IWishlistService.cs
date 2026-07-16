using CyberLosowanie.Models.Dto;

namespace CyberLosowanie.Interfaces.Services
{
    public interface IWishlistService
    {
        /// <summary>
        /// The caller's own wishlist, or null when they have not saved one yet
        /// ("not drawn yet" is a normal state, not an error).
        /// </summary>
        Task<WishlistResponse?> GetMyWishlistAsync(string userName);

        /// <summary>
        /// Upsert of the caller's wishlist: validates the document (limits, schema,
        /// image ownership), stores its canonical form and cleans up orphaned images.
        /// </summary>
        Task<WishlistResponse> SaveMyWishlistAsync(string userName, string canvasJson);

        /// <summary>
        /// Wishlist of the person the caller drew (<c>GiftedCyberekId</c>), or null
        /// when that person has not saved one. Throws
        /// <see cref="Exceptions.WishlistConflictException"/> when the caller has not
        /// completed the draw.
        /// </summary>
        Task<WishlistResponse?> GetGiftedWishlistAsync(string userName);

        /// <summary>
        /// Validates (size, magic bytes) and stores an uploaded image under the
        /// caller's blob prefix. Returns the blob path to reference in the document.
        /// </summary>
        Task<UploadImageResponse> UploadImageAsync(string userName, Stream content, long contentLength);

        /// <summary>
        /// Streams a wishlist image. The caller must be the owner
        /// (<c>CyberekId == cyberekId</c>) or their Santa (<c>GiftedCyberekId == cyberekId</c>);
        /// otherwise <see cref="Exceptions.ForbiddenAccessException"/>. Null when the image
        /// does not exist.
        /// </summary>
        Task<WishlistImageResult?> GetImageAsync(string userName, int cyberekId, string fileName);
    }

    /// <summary>Binary result of the image proxy endpoint.</summary>
    public record WishlistImageResult(Stream Content, string ContentType);
}
