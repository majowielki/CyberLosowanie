using CyberLosowanie.Constants;
using Microsoft.AspNetCore.Identity;

namespace CyberLosowanie.Models
{
    public class ApplicationUser : IdentityUser
    {
        public int CyberekId { get; set; }
        public int GiftedCyberekId { get; set; }

        /// <summary>
        /// UI language chosen at registration ("pl" / "en"). Emails sent to this user
        /// — including ones triggered by someone else (letter to Santa) — use it.
        /// </summary>
        public string PreferredLanguage { get; set; } = EmailConstants.DEFAULT_LANGUAGE;
    }
}
