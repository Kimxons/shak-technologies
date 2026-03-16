using CBS.Entities.Common;
using CBS.Entities.SystemCore;
using kairo_ui.Models.Dashboard;
using kairo_ui.Models.Shared;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.Shared
{
    [Route("SideBar")]
    public class SideBarController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly IConfiguration _config;
        private readonly ILogger<SideBarController> _logger;

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        public SideBarController(
            IAuthService authService,
            IApiService apiService,
            IApiCachedService apiCachedService,
            IConfiguration configuration,
            ILogger<SideBarController> logger)
        {
            _authService = authService;
            _apiService = apiService;
            _apiCachedService = apiCachedService;
            _config = configuration;
            _logger = logger;
        }

        [Route("Index")]
        public async Task<IActionResult> Index([FromQuery] SideBarDto request)
        {
            try
            {
                _logger.LogInformation($"[SideBar] Loading side bar for ModuleID: {request.ModuleID}");

                // Validate authentication
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("[SideBar] Unauthenticated access attempt");
                    return Unauthorized(new { success = false, message = "User not authenticated" });
                }

                // Get session data
                var branchId = HttpContext.Session.GetString("branch_code") ?? request.OurBranchID;
                var operatorId = HttpContext.Session.GetString("user_name") ?? string.Empty;

                // Get user roles and resources from session
                var rolesJson = HttpContext.Session.GetString("roles");
                List<string> userResources = new();

                if (!string.IsNullOrEmpty(rolesJson))
                {
                    var roles = JsonSerializer.Deserialize<List<string>>(rolesJson, JsonOptions) ?? [];
                    var roleNames = string.Join(",", roles);

                    _logger.LogInformation("[SideBar] User roles: {RoleNames}", roleNames);

                    // Fetch resources based on user roles
                    var roleResourcesResponse = await FetchRoleResources(roleNames);
                    if (roleResourcesResponse?.Resources != null)
                    {
                        userResources = roleResourcesResponse.Resources;
                        _logger.LogInformation("[SideBar] Fetched {ResourceCount} resources for user", userResources.Count);
                    }
                }

                // Build view model
                var viewModel = new SideBarViewDModel
                {
                    ModuleID = request.ModuleID,
                    OurBranchID = branchId,
                    RecentActivities = [],
                    SubModules = []
                };

                // Fetch submodules for the given ModuleID and filter by user resources
                if (request.ModuleID > 0)
                {
                    try
                    {
                        string auth_userJson = HttpContext.Session.GetString("auth_user")!;
                        JsonDocument jsonAuthUser = JsonDocument.Parse(auth_userJson);
                        var userName = jsonAuthUser.RootElement.GetProperty("username").GetString()!;

                        // Get submodules from cached service
                        var subModules = await _apiCachedService.GetSubModulesAsync(request.ModuleID, userName);

                        // Filter submodules by user resources (same logic as Dashboard)
                        viewModel.SubModules = FilterModulesByResources(subModules, userResources);

                        _logger.LogInformation("[SideBar] Loaded {Count} submodules for module {ModuleID}", viewModel.SubModules.Count, request.ModuleID);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "[SideBar] Could not fetch submodules, continuing without them");
                        viewModel.SubModules = new List<Module>();
                    }
                }

                // Fetch recent activities from SystemCore API
                if (!string.IsNullOrWhiteSpace(operatorId) && !string.IsNullOrWhiteSpace(branchId))
                {
                    try
                    {
                        viewModel.RecentActivities = await FetchRecentActivities(branchId, operatorId, request.ModuleID);
                        _logger.LogInformation($"[SideBar] Fetched {viewModel.RecentActivities?.Count ?? 0} recent activities");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "[SideBar] Could not fetch recent activities, continuing without them");
                        viewModel.RecentActivities = new List<RecentActivityItem>();
                    }
                }

                return PartialView("_SideBarPartial", viewModel);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SideBar] Error loading side bar");
                return StatusCode(500, new { success = false, message = "Error loading side bar", error = ex.Message });
            }
        }

        [HttpPost("AddRecentActivity")]
        public async Task<IActionResult> AddRecentActivity([FromBody] AddRecentActivityRequest request)
        {
            if (!_authService.IsAuthenticated())
            {
                _logger.LogWarning("[SideBar] Unauthenticated access attempt to AddRecentActivity");
                return Unauthorized(new { Success = false, ErrorMessage = "User not authenticated" });
            }

            if (request == null)
            {
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            }

            var accessedFields = request.AccessedFields?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(accessedFields))
            {
                return BadRequest(new { Success = false, ErrorMessage = "AccessedFields is required" });
            }

            try
            {
                var branchId = HttpContext.Session.GetString("branch_code") ?? request.OurBranchID ?? string.Empty;
                var operatorId = HttpContext.Session.GetString("user_name") ?? request.LoggedInOperator ?? string.Empty;
                var moduleId = request.ModuleID?.Trim() ?? string.Empty;

                if (string.IsNullOrWhiteSpace(branchId) || string.IsNullOrWhiteSpace(operatorId))
                {
                    return BadRequest(new { Success = false, ErrorMessage = "Operator or branch is missing" });
                }

                var requestData = new
                {
                    OurBranchID = branchId,
                    LoggedInOperator = operatorId,
                    ModuleID = moduleId,
                    AccessedFields = accessedFields
                    
                };

                _logger.LogInformation("[SideBar] AddRecentActivity for ModuleID: {ModuleID}, AccessedFields: {AccessedFields}", moduleId, accessedFields);

                var response = await _apiService.CreateAsync<ResponseDetail<object>>(
                    "SystemCoreApi",
                    ApiEndpoints.ADD_RECENT_ACTIVITY,
                    requestData
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SideBar] Error adding recent activity");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpGet("GetRecentActivities")]
        public async Task<IActionResult> GetRecentActivities([FromQuery] string moduleId)
        {
            if (!_authService.IsAuthenticated())
            {
                return Unauthorized(new { Success = false, ErrorMessage = "User not authenticated" });
            }

            try
            {
                var branchId = HttpContext.Session.GetString("branch_code") ?? string.Empty;
                var operatorId = HttpContext.Session.GetString("user_name") ?? string.Empty;

                if (string.IsNullOrWhiteSpace(branchId) || string.IsNullOrWhiteSpace(operatorId))
                {
                    return BadRequest(new { Success = false, ErrorMessage = "Operator or branch is missing" });
                }

                var requestData = new
                {
                    OurBranchID = branchId,
                    LoggedInOperator = operatorId,
                    ModuleID = moduleId ?? string.Empty
                };

                _logger.LogInformation("[SideBar] GetRecentActivities for ModuleID: {ModuleID}", moduleId);

                var response = await _apiService.CreateAsync<ResponseDetail<object>>(
                    "SystemCoreApi",
                    ApiEndpoints.GET_RECENT_ACTIVITIES,
                    requestData
                );

                _logger.LogInformation("[SideBar] GetRecentActivities raw response: {@Response}", response);

                // Extract activities array from response - handle various formats
                var activities = new List<object>();
                if (response?.Details != null)
                {
                    if (response.Details is System.Text.Json.JsonElement jsonElement)
                    {
                        // Try to find Activities array in the response
                        if (jsonElement.TryGetProperty("Activities", out var activitiesElement) || 
                            jsonElement.TryGetProperty("activities", out activitiesElement) ||
                            jsonElement.TryGetProperty("Data", out activitiesElement) ||
                            jsonElement.TryGetProperty("data", out activitiesElement))
                        {
                            if (activitiesElement.ValueKind == System.Text.Json.JsonValueKind.Array)
                            {
                                activities = System.Text.Json.JsonSerializer.Deserialize<List<object>>(activitiesElement.GetRawText()) ?? new List<object>();
                            }
                        }
                        else if (jsonElement.ValueKind == System.Text.Json.JsonValueKind.Array)
                        {
                            // Details itself is an array
                            activities = System.Text.Json.JsonSerializer.Deserialize<List<object>>(jsonElement.GetRawText()) ?? new List<object>();
                        }
                    }
                    else if (response.Details is IEnumerable<object> enumerable)
                    {
                        activities = enumerable.ToList();
                    }
                }

                _logger.LogInformation("[SideBar] GetRecentActivities returning {Count} activities", activities.Count);
                return Ok(new { Success = true, Activities = activities });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SideBar] Error getting recent activities");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        /// <summary>
        /// Fetches role resources from the API (same as Dashboard)
        /// </summary>
        private async Task<RoleResourcesResponse> FetchRoleResources(string roleNames)
        {
            try
            {
                _logger.LogInformation("[SideBar] Fetching role resources for roles: {RoleNames}", roleNames);
                var endpoint = $"api/role/resources?roleNames={Uri.EscapeDataString(roleNames)}";
                var response = await _authService.GetSingleAsync<RoleResourcesResponse>(endpoint);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SideBar] Error fetching role resources");
                return new RoleResourcesResponse();
            }
        }

        /// <summary>
        /// Filters modules by available resources (same logic as Dashboard)
        /// Resources are strings that should match ModuleID
        /// </summary>
        private List<Module> FilterModulesByResources(List<Module> modules, List<string> resources)
        {
            if (!resources.Any())
            {
                _logger.LogWarning("[SideBar] No resources available for filtering modules");
                return [];
            }

            var filtered = modules
                .Where(m => resources.Any(r => r.Equals(m.ModuleID.ToString(), StringComparison.OrdinalIgnoreCase)))
                .Where(m => m.IsActive) // Only active modules
                .ToList();

            _logger.LogInformation("[SideBar] Filtered {OriginalCount} modules to {FilteredCount} based on resources",
                 modules.Count, filtered.Count);

            return filtered;
        }

        private async Task<List<RecentActivityItem>> FetchRecentActivities(string branchId, string operatorId, int? moduleId)
        {
            try
            {
                // Prepare request data matching the SystemCore API format
                var requestData = new
                {
                   
                    OurBranchID = branchId,
                    OperatorID = operatorId,
                    ModuleID = moduleId?.ToString() ?? string.Empty
                    
                };

                _logger.LogDebug($"[SideBar] Request data: BranchID={branchId}, OperatorID={operatorId}, ModuleID={moduleId}");

                // Call the API using CreateAsync since PostAsync doesn't exist
                var response = await _apiService.CreateAsync<ResponseDetail<object>>("SystemCoreApi", ApiEndpoints.GET_RECENT_ACTIVITIES, requestData);

                if (response?.ResponseCode == "00")
                {
                    if (response?.Details != null)
                    {
                        var recentActivities = DeserializeRecentActivities(response.Details);
                        _logger.LogInformation("[SideBar] Successfully fetched {Count} recent activities", recentActivities.Count);
                        return recentActivities;
                    }
                }

                _logger.LogWarning("[SideBar] API returned null or empty response for recent activities");
                return new List<RecentActivityItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SideBar] Error fetching recent activities from SystemCore API");
                throw;
            }
        }

        private List<RecentActivityItem> DeserializeRecentActivities(object details)
        {
            try
            {
                if (details is List<RecentActivityItem> typedList)
                {
                    return typedList;
                }

                if (details is JsonElement jsonElement)
                {
                    if (jsonElement.ValueKind == JsonValueKind.Array)
                    {
                        return JsonSerializer.Deserialize<List<RecentActivityItem>>(jsonElement.GetRawText(), JsonOptions) ?? new List<RecentActivityItem>();
                    }

                    _logger.LogWarning("[SideBar] Recent activities details returned unexpected JSON kind: {JsonKind}", jsonElement.ValueKind);
                }

                var detailsJson = JsonSerializer.Serialize(details, JsonOptions);
                return JsonSerializer.Deserialize<List<RecentActivityItem>>(detailsJson, JsonOptions) ?? new List<RecentActivityItem>();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[SideBar] Failed to deserialize recent activities details");
                return new List<RecentActivityItem>();
            }
        }
    }

}
