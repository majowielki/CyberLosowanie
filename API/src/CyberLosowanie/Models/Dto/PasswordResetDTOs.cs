using System.ComponentModel.DataAnnotations;

namespace CyberLosowanie.Models.Dto
{
    /// <summary>Body of POST /api/auth/forgot-password.</summary>
    public class ForgotPasswordRequestDTO
    {
        /// <summary>Username or email — like the login form.</summary>
        [Required(ErrorMessage = "Username or email is required")]
        [StringLength(256, MinimumLength = 1)]
        public string Login { get; set; } = string.Empty;
    }

    /// <summary>Body of POST /api/auth/reset-password — the two values from the emailed link and the new password.</summary>
    public class ResetPasswordRequestDTO
    {
        [Required]
        [StringLength(64)]
        public string UserId { get; set; } = string.Empty;

        /// <summary>Base64Url-encoded Identity token, exactly as it appears in the link.</summary>
        [Required]
        [StringLength(2048)]
        public string Token { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required")]
        [StringLength(100, ErrorMessage = "Password cannot exceed 100 characters")]
        public string NewPassword { get; set; } = string.Empty;
    }
}
