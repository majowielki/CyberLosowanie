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
    }
}
