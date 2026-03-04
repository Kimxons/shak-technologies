using kairo_ui.Services.Caching;

namespace kairo_ui.Services
{
    /// <summary>
    /// Constants for caching keys and configuration
    /// </summary>
    public static class CachingConstants
    {
        // ============================================================================
        // CACHE KEY PREFIXES
        // ============================================================================

        /// <summary>Prefix for system code caches</summary>
        public const string SYSTEM_CODES_PREFIX = "SYSCODES:";

        /// <summary>Prefix for lookup data caches</summary>
        public const string LOOKUP_PREFIX = "LOOKUP:";

        /// <summary>Prefix for user session caches</summary>
        public const string USER_SESSION_PREFIX = "USER:";

        /// <summary>Prefix for module data caches</summary>
        public const string MODULE_DATA_PREFIX = "MODULES:";

        /// <summary>Prefix for recent activities cache</summary>
        public const string RECENT_ACTIVITIES_PREFIX = "RECENT_ACT:";

        /// <summary>Prefix for search results cache</summary>
        public const string SEARCH_RESULTS_PREFIX = "SEARCH:";

        /// <summary>Prefix for theme settings cache</summary>
        public const string THEME_PREFIX = "THEME:";

        /// <summary>Prefix for dashboard metrics cache</summary>
        public const string DASHBOARD_PREFIX = "DASHBOARD:";

        // ============================================================================
        // SPECIFIC CACHE KEYS
        // ============================================================================

        /// <summary>Main modules cache key</summary>
        public const string MAIN_MODULES = MODULE_DATA_PREFIX + "MAIN_MODULES";

        /// <summary>Sub modules cache key template - use with moduleId</summary>
        public const string SUB_MODULES_TEMPLATE = MODULE_DATA_PREFIX + "SUB_MODULES:{0}";

        /// <summary>System bank settings cache key</summary>
        public const string SYSTEM_BANK_SETTINGS = "SETTINGS:BANK";

        /// <summary>Branch settings cache key template - use with branchId</summary>
        public const string BRANCH_SETTINGS_TEMPLATE = "SETTINGS:BRANCH:{0}";

        /// <summary>User effective theme cache key template - use with userId</summary>
        public const string USER_THEME_TEMPLATE = THEME_PREFIX + "USER:{0}";

        /// <summary>Recent activities cache key template - use with operatorId and moduleId</summary>
        public const string RECENT_ACTIVITIES_TEMPLATE = RECENT_ACTIVITIES_PREFIX + "{0}:MODULE:{1}";

        /// <summary>Dashboard metrics cache key template - use with branchId</summary>
        public const string DASHBOARD_METRICS_TEMPLATE = DASHBOARD_PREFIX + "METRICS:{0}";

        /// <summary>System code options cache key template - use with codeId</summary>
        public const string SYSTEM_CODE_OPTIONS_TEMPLATE = SYSTEM_CODES_PREFIX + "{0}";

        /// <summary>Search results cache key template - use with tableId and searchTerm hash</summary>
        public const string SEARCH_RESULTS_TEMPLATE = SEARCH_RESULTS_PREFIX + "{0}:{1}";

        // ============================================================================
        // CACHE EXPIRATION TIMES (in minutes)
        // ============================================================================

        /// <summary>Short-lived cache (5 minutes) - for frequently changing data</summary>
        public const int EXPIRATION_SHORT = 5;

        /// <summary>Medium-lived cache (30 minutes) - for moderately stable data</summary>
        public const int EXPIRATION_MEDIUM = 30;

        /// <summary>Long-lived cache (2 hours) - for stable reference data</summary>
        public const int EXPIRATION_LONG = 120;

        /// <summary>Very long-lived cache (24 hours) - for rarely changing data</summary>
        public const int EXPIRATION_VERY_LONG = 1440;

        /// <summary>System codes expiration (4 hours) - system codes rarely change</summary>
        public const int EXPIRATION_SYSTEM_CODES = 240;

        /// <summary>Theme settings expiration (1 hour)</summary>
        public const int EXPIRATION_THEME = 60;

        /// <summary>Recent activities expiration (10 minutes)</summary>
        public const int EXPIRATION_RECENT_ACTIVITIES = 10;

        /// <summary>Search results expiration (15 minutes)</summary>
        public const int EXPIRATION_SEARCH_RESULTS = 15;

        /// <summary>Dashboard metrics expiration (5 minutes)</summary>
        public const int EXPIRATION_DASHBOARD_METRICS = 5;

        /// <summary>Module structure expiration (6 hours) - includes submodules</summary>
        public const int EXPIRATION_MODULES = 360;

        // ============================================================================
        // SLIDING EXPIRATION CONFIGURATIONS
        // ============================================================================

        /// <summary>Use sliding expiration for user session data</summary>
        public const bool USE_SLIDING_FOR_USER_SESSION = true;

        /// <summary>Use sliding expiration for recent activities</summary>
        public const bool USE_SLIDING_FOR_RECENT_ACTIVITIES = true;

        /// <summary>Use sliding expiration for search results</summary>
        public const bool USE_SLIDING_FOR_SEARCH = true;

        // ============================================================================
        // CACHE SIZE LIMITS
        // ============================================================================

        /// <summary>Maximum number of search result entries to cache</summary>
        public const int MAX_SEARCH_CACHE_ENTRIES = 100;

        /// <summary>Maximum number of recent activity entries per user</summary>
        public const int MAX_RECENT_ACTIVITIES_PER_USER = 50;

        // ============================================================================
        // HELPER METHODS
        // ============================================================================

        /// <summary>
        /// Generates a cache key for sub-modules
        /// </summary>
        public static string GetSubModulesKey(int moduleId)
               => string.Format(SUB_MODULES_TEMPLATE, moduleId);

        /// <summary>
        /// Generates a cache key for branch settings
        /// </summary>
        public static string GetBranchSettingsKey(string branchId)
            => string.Format(BRANCH_SETTINGS_TEMPLATE, branchId);

        /// <summary>
        /// Generates a cache key for user theme
        /// </summary>
        public static string GetUserThemeKey(string userId)
       => string.Format(USER_THEME_TEMPLATE, userId);

        /// <summary>
        /// Generates a cache key for recent activities
        /// </summary>
        public static string GetRecentActivitiesKey(string operatorId, string? moduleId = null)
        {
            var module = string.IsNullOrWhiteSpace(moduleId) ? "ALL" : moduleId;
            return string.Format(RECENT_ACTIVITIES_TEMPLATE, operatorId, module);
        }

        /// <summary>
        /// Generates a cache key for dashboard metrics
        /// </summary>
        public static string GetDashboardMetricsKey(string branchId)
     => string.Format(DASHBOARD_METRICS_TEMPLATE, branchId);

        /// <summary>
        /// Generates a cache key for system code options
        /// </summary>
        public static string GetSystemCodeOptionsKey(string codeId)
       => string.Format(SYSTEM_CODE_OPTIONS_TEMPLATE, codeId);

        /// <summary>
        /// Generates a cache key for search results
        /// </summary>
        public static string GetSearchResultsKey(string tableId, string searchTermHash)
    => string.Format(SEARCH_RESULTS_TEMPLATE, tableId, searchTermHash);

        // ============================================================================
        // CACHE POLICIES (Production-Ready)
        // ============================================================================

        /// <summary>Policy for system codes - long-lived, high priority, compressed</summary>
        public static CachePolicy SystemCodesPolicy => new()
        {
            AbsoluteExpiration = TimeSpan.FromHours(4),
            Priority = CachePriority.High,
            UseDistributedCache = true,
            UseMemoryCache = true,
            EnableCompression = true
        };

        /// <summary>Policy for user session data - sliding expiration</summary>
        public static CachePolicy UserSessionPolicy => new()
        {
            SlidingExpiration = TimeSpan.FromMinutes(30),
            Priority = CachePriority.High,
            UseDistributedCache = true,
            UseMemoryCache = true
        };

        /// <summary>Policy for recent activities - short-lived</summary>
        public static CachePolicy RecentActivitiesPolicy => new()
        {
            SlidingExpiration = TimeSpan.FromMinutes(10),
            Priority = CachePriority.Normal,
            UseDistributedCache = false,
            UseMemoryCache = true
        };

        /// <summary>Policy for search results - medium-lived with sliding</summary>
        public static CachePolicy SearchResultsPolicy => new()
        {
            SlidingExpiration = TimeSpan.FromMinutes(15),
            Priority = CachePriority.Low,
            UseDistributedCache = false,
            UseMemoryCache = true
        };

        /// <summary>Policy for dashboard metrics - very short-lived</summary>
        public static CachePolicy DashboardMetricsPolicy => new()
        {
            AbsoluteExpiration = TimeSpan.FromMinutes(5),
            Priority = CachePriority.Normal,
            UseDistributedCache = false,
            UseMemoryCache = true
        };

        /// <summary>Policy for module structure - long-lived (6 hours for submodules)</summary>
        public static CachePolicy ModuleStructurePolicy => new()
        {
            AbsoluteExpiration = TimeSpan.FromHours(6),
            Priority = CachePriority.High,
            UseDistributedCache = true,
            UseMemoryCache = true
        };

        /// <summary>Policy for theme settings - medium-lived</summary>
        public static CachePolicy ThemePolicy => new()
        {
            AbsoluteExpiration = TimeSpan.FromHours(1),
            Priority = CachePriority.Normal,
            UseDistributedCache = true,
            UseMemoryCache = true
        };

        /// <summary>Policy for lookup/reference data - long-lived, compressed</summary>
        public static CachePolicy LookupDataPolicy => new()
        {
            AbsoluteExpiration = TimeSpan.FromHours(2),
            Priority = CachePriority.High,
            UseDistributedCache = true,
            UseMemoryCache = true,
            EnableCompression = true
        };
    }
}
