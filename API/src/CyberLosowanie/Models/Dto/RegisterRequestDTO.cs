using System.ComponentModel.DataAnnotations;

namespace CyberLosowanie.Models.Dto
{
    public class RegisterRequestDTO
    {
        [Required(ErrorMessage = "Username is required")]
        [StringLength(256, MinimumLength = 1, ErrorMessage = "Username must be between 1 and 256 characters")]
        public string UserName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Email address is not valid")]
        [StringLength(256, ErrorMessage = "Email cannot exceed 256 characters")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required")]
        [StringLength(100, ErrorMessage = "Password cannot exceed 100 characters")]
        public string Password { get; set; } = string.Empty;

        /// <summary>UI language at registration; unsupported values fall back to the default.</summary>
        [StringLength(5)]
        public string? Language { get; set; }
    }
}
