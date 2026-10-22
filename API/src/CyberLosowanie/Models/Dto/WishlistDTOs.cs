using CyberLosowanie.Constants;
using System.ComponentModel.DataAnnotations;

namespace CyberLosowanie.Models.Dto
{
    /// <summary>Body of PUT /api/wishlist/my — upsert of the caller's wishlist.</summary>
    public class SaveWishlistRequestDTO
    {
        [Required]
        public string CanvasJson { get; set; } = string.Empty;
    }

    /// <summary>Body of POST /api/wishlist/my/send — send the letter or notify Santa about changes.</summary>
    public class SendWishlistRequestDTO
    {
        /// <summary>Optional note quoted in the email ("what changed?").</summary>
        [StringLength(WishlistConstants.MAX_SANTA_NOTE_LENGTH)]
        public string? Note { get; set; }
    }

    /// <summary>
    /// Wishlist payload returned to the client. The letter fields are filled only
    /// for the owner; the Santa gets the document alone.
    /// </summary>
    public class WishlistResponse
    {
        public string CanvasJson { get; set; } = string.Empty;
        public DateTime UpdatedAtUtc { get; set; }

        /// <summary>Owner only: when the letter was first sent (null = draft).</summary>
        public DateTime? SentAtUtc { get; set; }

        /// <summary>Owner only: last send / "notify about changes".</summary>
        public DateTime? LastNotificationAtUtc { get; set; }
    }

    /// <summary>Santa's view of the letter state, for the navigation badge.</summary>
    public class GiftedWishlistStatusResponse
    {
        /// <summary>The person I drew has sent their letter.</summary>
        public bool IsSent { get; set; }

        /// <summary>Sent, and saved again since I last opened it (or never opened).</summary>
        public bool HasUnseenChanges { get; set; }
    }

    /// <summary>Result of POST /api/wishlist/my/images — blob path to reference in the document.</summary>
    public class UploadImageResponse
    {
        public string Path { get; set; } = string.Empty;
    }

    public static class WishlistMappingExtensions
    {
        public static WishlistResponse ToOwnerResponse(this Models.Wishlist wishlist) => new()
        {
            CanvasJson = wishlist.CanvasJson,
            UpdatedAtUtc = wishlist.UpdatedAtUtc,
            SentAtUtc = wishlist.SentAtUtc,
            LastNotificationAtUtc = wishlist.LastNotificationAtUtc
        };

        public static WishlistResponse ToSantaResponse(this Models.Wishlist wishlist) => new()
        {
            CanvasJson = wishlist.CanvasJson,
            UpdatedAtUtc = wishlist.UpdatedAtUtc
        };
    }
}
