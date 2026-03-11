using System.Collections.Generic;

namespace kairo_ui.Models.Login
{
    /// <summary>
    /// View model for the login page
    /// </summary>
    public class LoginViewModel
    {
        public string? Username { get; set; }
        public string? Password { get; set; }
        public string? BranchId { get; set; }
        public List<BranchSetting>? Branches { get; set; } = [];
        public string? ErrorMessage { get; set; }
    }
}
