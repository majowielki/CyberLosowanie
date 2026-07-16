using System.ComponentModel.DataAnnotations;

namespace CyberLosowanie.Models.Dto
{
    /// <summary>Body of PUT /api/wishlist/my — upsert of the caller's wishlist.</summary>
    public class SaveWishlistRequestDTO
    {
        [Required]
        public string CanvasJson { get; set; } = string.Empty;
    }

    /// <summary>Wishlist payload returned to the client (owner or their Santa).</summary>
    public class WishlistResponse
    {
        public string CanvasJson { get; set; } = string.Empty;
        public DateTime UpdatedAtUtc { get; set; }
    }

    /// <summary>Result of POST /api/wishlist/my/images — blob path to reference in the document.</summary>
    public class UploadImageResponse
    {
        public string Path { get; set; } = string.Empty;
    }

    public static class WishlistMappingExtensions
    {
        public static WishlistResponse ToResponse(this Models.Wishlist wishlist) => new()
        {
            CanvasJson = wishlist.CanvasJson,
            UpdatedAtUtc = wishlist.UpdatedAtUtc
        };
    }
}
