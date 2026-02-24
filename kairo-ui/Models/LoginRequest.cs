using System.ComponentModel.DataAnnotations;

namespace kairo_ui.Models
{
    /// <summary>
    /// Models the login request sent to the authentication endpoint
    /// </summary>
    public class LoginRequest
    {
        [Required]
        public string? Username { get; set; }

        [Required]
        public string? Password { get; set; }

        [Required]
        public string? BranchId { get; set; }
    }
}
