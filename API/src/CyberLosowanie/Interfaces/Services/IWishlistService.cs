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
        /// Sends the saved letter to the caller's Santa (first call), or notifies them
        /// about changes (later calls: only after a save since the last notification
        /// and outside the cooldown — otherwise <see cref="Exceptions.WishlistConflictException"/>).
        /// </summary>
        Task<WishlistResponse> SendMyWishlistAsync(string userName, string? note);

        /// <summary>
        /// Wishlist of the person the caller drew (<c>GiftedCyberekId</c>), or null
        /// when that person has not sent their letter yet; opening it marks it seen.
        /// Throws <see cref="Exceptions.WishlistConflictException"/> when the caller
        /// has not completed the draw.
        /// </summary>
        Task<WishlistResponse?> GetGiftedWishlistAsync(string userName);

        /// <summary>Whether the gifted person's letter is sent and has changes the caller has not seen.</summary>
        Task<GiftedWishlistStatusResponse> GetGiftedWishlistStatusAsync(string userName);

        /// <summary>
        /// Validates (size, magic bytes) and stores an uploaded image under the
        /// caller's blob prefix. Returns the blob path to reference in the document.
        /// </summary>
        Task<UploadImageResponse> UploadImageAsync(string userName, Stream content, long contentLength);

        /// <summary>
        /// Streams a wishlist image. The caller must be the owner
        /// (<c>CyberekId == cyberekId</c>) or their Santa (<c>GiftedCyberekId == cyberekId</c>,
        /// only once the letter is sent);
        /// otherwise <see cref="Exceptions.ForbiddenAccessException"/>. Null when the image
        /// does not exist.
        /// </summary>
        Task<WishlistImageResult?> GetImageAsync(string userName, int cyberekId, string fileName);
    }

    /// <summary>Binary result of the image proxy endpoint.</summary>
    public record WishlistImageResult(Stream Content, string ContentType);
}
