using System.ComponentModel.DataAnnotations;

namespace CyberLosowanie.Models
{
    public class Cyberek
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [StringLength(100, MinimumLength = 1)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [StringLength(100, MinimumLength = 1)]
        public string Surname { get; set; } = string.Empty;
        
        // Portraits are not stored here: they live in Blob Storage under the
        // cyberek id (CyberekImageConstants).
        public int GiftedCyberekId { get; set; }
        
        public List<int> BannedCyberki { get; set; } = [];
    }
}
