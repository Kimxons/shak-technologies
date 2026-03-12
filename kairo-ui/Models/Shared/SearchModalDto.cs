namespace kairo_ui.Models.Shared
{
    /// <summary>
    /// Request DTO for search modal initialization
    /// </summary>
    public class SearchModalRequestDto
    {
        public string TableID { get; set; } = string.Empty;
        public string? WhereStmt { get; set; }
        public string? AdvFilterString { get; set; }
        public object? SearchKey { get; set; }
        public string? ModuleID { get; set; } = "100";
        public int? PrevOrNext { get; set; } = 1; // 1=Next, -1=Previous, 0=No direction
        public int? PageSize { get; set; } = 10;
        public string? RefID { get; set; } = string.Empty; // Last value of KeyForNavigation for cursor-based pagination
        public string? OurBranchID { get; set; } = string.Empty;
    }

    /// <summary>
    /// Response DTO for search field configuration
    /// </summary>
    public class SearchFieldDto
    {
        public string FieldName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public int FieldOrder { get; set; }
    }

    /// <summary>
    /// Response DTO for search configuration from SystemCoreApi
    /// </summary>
    public class SearchConfigDto
    {
        public string SearchID { get; set; } = string.Empty;
        public string SearchName { get; set; } = string.Empty;
        public string KeyForNavigation { get; set; } = string.Empty;
        public List<SearchFieldDto> SearchFields { get; set; } = new();
    }

    /// <summary>
    /// Request DTO for search result execution (includes session data)
    /// </summary>
    public class SearchResultRequestDto : SearchModalRequestDto
    {
        public string? OperatorID { get; set; }
    }

    /// <summary>
    /// Request DTO for resolving an ID into a display description via Shared/GetIDDescription
    /// </summary>
    public class SearchIdDescriptionRequestDto
    {
        public string? ControlTypeID { get; set; }
        public string? ID { get; set; }
        public string? BankID { get; set; } = "00";
        public string? TypeID { get; set; } = string.Empty;
        public string? AdvanceFilter { get; set; } = string.Empty;
        public string? LanguageID { get; set; } = string.Empty;
        public string? ModuleID { get; set; } = "100";
        public string? OurBranchID { get; set; } = string.Empty;
    }

    /// <summary>
    /// View model for search modal Index view
    /// </summary>
    public class SearchModalViewModel
    {
        public string? TableID { get; set; } = string.Empty;
        public string? WhereStmt { get; set; } = string.Empty;
        public string? AdvFilterString { get; set; } = string.Empty;
        public object? SearchKey { get; set; } = string.Empty;
        public string? ModuleID { get; set; } = "100";
        public int PrevOrNext { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string? RefID { get; set; } = string.Empty;
        public SearchConfigDto? SearchConfig { get; set; }
        public string? SearchTitle { get; set; } = "Search";
        public string? OurBranchID { get; set; } = string.Empty;
    }
}
