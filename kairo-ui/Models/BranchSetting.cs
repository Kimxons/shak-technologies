using System;

namespace kairo_ui.Models
{
    /// <summary>
    /// Represents a branch setting from the BranchSetting API
    /// </summary>
    public class BranchSetting
    {
        public int Id { get; set; }
        public string BranchCode { get; set; }
        public string BranchName { get; set; }
        public string Description { get; set; }
        public bool IsHeadOffice { get; set; }
        public bool IsActive { get; set; }
        public string Address { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public DateTime CreatedAt { get; set; }
        public string CreatedBy { get; set; }
        public DateTime? LastModifiedAt { get; set; }
        public string LastModifiedBy { get; set; }
    }
}
