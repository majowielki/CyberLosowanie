using Microsoft.AspNetCore.Identity;

namespace CyberLosowanie.Models
{
    public class ApplicationUser : IdentityUser
    {
        public int CyberekId { get; set; }
        public int GiftedCyberekId { get; set; }
    }
}
