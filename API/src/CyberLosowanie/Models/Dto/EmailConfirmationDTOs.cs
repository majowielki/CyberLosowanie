using System.ComponentModel.DataAnnotations;

namespace CyberLosowanie.Models.Dto
{
    /// <summary>Body of POST /api/auth/confirm-email — the two values from the emailed link.</summary>
    public class ConfirmEmailRequestDTO
    {
        [Required]
        [StringLength(64)]
        public string UserId { get; set; } = string.Empty;

        /// <summary>Base64Url-encoded Identity token, exactly as it appears in the link.</summary>
        [Required]
        [StringLength(2048)]
        public string Token { get; set; } = string.Empty;
    }

    /// <summary>Body of POST /api/auth/resend-confirmation.</summary>
    public class ResendConfirmationRequestDTO
    {
        /// <summary>Username or email — whatever the user typed on the login form.</summary>
        [Required(ErrorMessage = "Username or email is required")]
        [StringLength(256, MinimumLength = 1)]
        public string Login { get; set; } = string.Empty;
    }
}
