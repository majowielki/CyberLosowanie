using System.ComponentModel.DataAnnotations;

namespace CyberLosowanie.Models.Dto
{
    public class RegisterRequestDTO
    {
        [Required(ErrorMessage = "Username is required")]
        [StringLength(256, MinimumLength = 1, ErrorMessage = "Username must be between 1 and 256 characters")]
        public string UserName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Password must be at least 1 character long")]
        public string Password { get; set; } = string.Empty;
    }
}
