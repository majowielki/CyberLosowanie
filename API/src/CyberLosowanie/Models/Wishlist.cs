using System.ComponentModel.DataAnnotations;

namespace CyberLosowanie.Models
{
    /// <summary>
    /// One wishlist canvas per participant (unique index on <see cref="CyberekId"/>).
    /// The wishlist belongs to the Cyberek, not the ApplicationUser, so "my gifted
    /// person's wishlist" is a plain lookup by <c>ApplicationUser.GiftedCyberekId</c>.
    /// </summary>
    public class Wishlist
    {
        [Key]
        public int Id { get; set; }

        public int CyberekId { get; set; }

        /// <summary>
        /// Canonical vector canvas document (see Models/Dto/CanvasDocument.cs).
        /// Always produced by re-serializing the validated, typed model —
        /// raw client JSON is never stored.
        /// </summary>
        [Required]
        public string CanvasJson { get; set; } = string.Empty;

        public DateTime UpdatedAtUtc { get; set; }

        /// <summary>
        /// When the owner first sent the letter to their Santa. Until then the wishlist
        /// is a private draft: the Santa sees neither the document nor its images.
        /// Later saves stay visible to the Santa immediately.
        /// </summary>
        public DateTime? SentAtUtc { get; set; }

        /// <summary>
        /// Last time the owner pressed send / "notify Santa about changes" — the base
        /// for the "anything new since?" check and the notification cooldown. Set even
        /// when nobody has drawn the owner yet, so the owner cannot tell the difference.
        /// </summary>
        public DateTime? LastNotificationAtUtc { get; set; }

        /// <summary>Last time the Santa opened the letter (drives their "new changes" badge).</summary>
        public DateTime? SantaViewedAtUtc { get; set; }
    }
}
