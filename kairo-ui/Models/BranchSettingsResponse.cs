using System.Collections.Generic;

namespace kairo_ui.Models
{
    /// <summary>
    /// Represents the API response for branch settings
    /// </summary>
    public class BranchSettingsResponse
    {
        public List<BranchSetting> Data { get; set; } = [];
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}
