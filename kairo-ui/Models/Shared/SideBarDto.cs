using CBS.Entities.SystemCore;

namespace kairo_ui.Models.Shared
{
    public class SideBarDto
    {
        public int ModuleID { get; set; }
        public string? OurBranchID { get; set; }
    }

    public class SideBarViewDModel
    {
        public int ModuleID { get; set; }
        public string? OurBranchID { get; set; } = string.Empty;
        public List<RecentActivityItem>? RecentActivities { get; set; } = new();
        public List<Module>? SubModules { get; set; } = new();
    }

    // Recent Activities Request/Response Models
    public class GetRecentActivitiesRequest
    {
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public string? ModuleID { get; set; }
    }

    public class AddRecentActivityRequest
    {
        public string? OurBranchID { get; set; }
        public string? LoggedInOperator { get; set; }
        public string? ModuleID { get; set; }
        public string? AccessedFields { get; set; }
        public string? Narration { get; set; }
    }

    public class RecentActivityItem
    {
        public string? OurBranchID { get; set; }
        public string? LoggedInOperator { get; set; }
        public int ModuleID { get; set; }
        public string? AccessedFields { get; set; }
        public string? Narration { get; set; }
        public DateTime? AccessedDateTime { get; set; }
    }

    public class RecentActivitiesResponse
    {
        public bool Success { get; set; }
        public string? Code { get; set; }
        public string? Message { get; set; }
        public List<RecentActivityItem>? Data { get; set; }
    }
}
