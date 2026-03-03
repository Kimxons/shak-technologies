using CBS.Entities.Common;
using kairo_ui.Models.Shared;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.Shared
{
    [Route("SearchModal")]
    public class SearchModalController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly IConfiguration _config;
        private readonly ILogger<SearchModalController> _logger;

        public SearchModalController(
            IAuthService authService,
            IApiService apiService,
            IConfiguration configuration,
            ILogger<SearchModalController> logger)
        {
            _authService = authService;
            _apiService = apiService;
            _config = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Render the search modal partial view with search configuration
        /// GET: /Shared/SearchModal/Index?TableID=ClientID&ModuleID=1000
        /// </summary>
        //[HttpGet]
        [Route("Index")]
        public async Task<IActionResult> Index([FromQuery] SearchModalRequestDto request)
        {
            try
            {
                _logger.LogInformation($"[SearchModal] Loading search modal for TableID: {request.TableID}");

                // Validate authentication
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("[SearchModal] Unauthenticated access attempt");
                    return Unauthorized(new { success = false, message = "User not authenticated" });
                }

                // Validate required parameters
                if (string.IsNullOrWhiteSpace(request.TableID))
                {
                    return BadRequest(new { success = false, message = "TableID is required" });
                }

                // Get search configuration from SystemCoreApi
                var searchConfig = await GetSearchConfiguration(request.TableID);

                if (searchConfig == null)
                {
                    _logger.LogWarning($"[SearchModal] No search configuration found for TableID: {request.TableID}");
                    return NotFound(new { success = false, message = $"No search configuration found for TableID: {request.TableID}" });
                }

                // Build view model
                var viewModel = new SearchModalViewModel
                {
                    TableID = request.TableID,
                    WhereStmt = request.WhereStmt ?? string.Empty,
                    AdvFilterString = request.AdvFilterString ?? string.Empty,
                    SearchKey = request.SearchKey ?? string.Empty,
                    ModuleID = request.ModuleID ?? "100",
                    PrevOrNext = request.PrevOrNext ?? 1,
                    PageSize = request.PageSize ?? 10,
                    RefID = request.RefID ?? string.Empty,
                    SearchConfig = searchConfig,
                    SearchTitle = $"Search {searchConfig.SearchName}",
                    OurBranchID = request.OurBranchID ?? HttpContext.Session.GetString("OurBranchID") ?? HttpContext.Session.GetString("branch_code") ?? string.Empty
                };

                _logger.LogInformation($"[SearchModal] Returning search modal view for {searchConfig.SearchName}");
                return PartialView("_SearchModal", viewModel);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SearchModal] Error loading search modal");
                return StatusCode(500, new { success = false, message = "Error loading search modal", error = ex.Message });
            }
        }

        /// <summary>
        /// Execute search and return results
        /// POST: /Shared/SearchModal/Search
        /// </summary>
        [HttpPost]
        [Route("Search")]
        public async Task<IActionResult> Search([FromBody] SearchResultRequestDto request)
        {
            try
            {
                _logger.LogInformation($"[SearchModal] Executing search for TableID: {request.TableID}");

                // Validate authentication
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("[SearchModal] Unauthenticated search attempt");
                    return Unauthorized(new { success = false, message = "User not authenticated" });
                }

                // Validate required parameters
                if (string.IsNullOrWhiteSpace(request.TableID))
                {
                    return BadRequest(new { success = false, message = "TableID is required" });
                }

                // Get session values for OurBranchID and OperatorID if not provided
                request.OurBranchID ??= HttpContext.Session.GetString("OurBranchID") ?? HttpContext.Session.GetString("branch_code") ?? string.Empty;
                request.OperatorID = HttpContext.Session.GetString("OperatorID") ?? HttpContext.Session.GetString("user_name") ?? string.Empty;

                _logger.LogInformation($"[SearchModal] Search params - TableID: {request.TableID}, Branch: {request.OurBranchID}, Operator: {request.OperatorID}");

                // Build request data for SystemCoreApi
                var searchRequestData = new
                {
                    TableID = request.TableID,
                    SearchID = request.TableID,
                    WhereStmt = request.WhereStmt ?? string.Empty,
                    AdvFilterString = request.AdvFilterString ?? string.Empty,
                    Filter = request.AdvFilterString ?? string.Empty,
                    SearchKey = request.SearchKey ?? string.Empty,
                    PrevOrNext = request.PrevOrNext ?? 1,
                    Reference = request.RefID ?? string.Empty,
                    PageSize = request.PageSize ?? 10,
                    OurBranchID = request.OurBranchID,
                    OperatorID = request.OperatorID,
                    LoggedInUserId = request.OperatorID,
                    ModuleID = request.ModuleID ?? "100",
                    LanguageID = "en"
                };

                _logger.LogInformation($"[SearchModal] Calling SystemCoreApi endpoint: {ApiEndpoints.GET_SYSTEM_SEARCH_RESULT}");

                // Call SystemCoreApi GetSystemSearchResult endpoint using IApiService
                var response = await _apiService.CreateAsync<ResponseDetail<object>>("SystemCoreApi", ApiEndpoints.GET_SYSTEM_SEARCH_RESULT, searchRequestData);

                _logger.LogInformation($"[SearchModal] Search response received - ResponseCode: {response?.ResponseCode}");

                if (response?.ResponseCode == "00")
                {
                    return Ok(new
                    {
                        success = true,
                        data = response,
                        message = response.ResponseMessage ?? "Search completed successfully"
                    });
                }
                else
                {
                    return Ok(new
                    {
                        success = false,
                        message = response?.ResponseMessage ?? "Search returned no results"
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SearchModal] Search execution error");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Search execution failed",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// Get search configuration from SystemCoreApi
        /// Calls api/v1/Shared/GetSystemSearch endpoint
        /// </summary>
        private async Task<SearchConfigDto?> GetSearchConfiguration(string tableID)
        {
            try
            {
                _logger.LogInformation($"[SearchModal] Fetching search config for TableID: {tableID}");

                var configRequestData = new
                {
                    SearchID = tableID
                };

                // Call SystemCoreApi GetSystemSearch endpoint using IApiService
                var response = await _apiService.CreateAsync<ResponseDetail<object>>("SystemCoreApi", ApiEndpoints.GET_SYSTEM_SEARCH, configRequestData);

                _logger.LogInformation($"[SearchModal] Config response received - ResponseCode: {response?.ResponseCode}");

                if (response?.ResponseCode == "00" && response.Details != null)
                {
                    // Parse the Details object to SearchConfigDto
                    var detailsJson = JsonSerializer.Serialize(response.Details);
                    var searchConfig = JsonSerializer.Deserialize<SearchConfigDto>(detailsJson, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                    if (searchConfig != null)
                    {
                        _logger.LogInformation($"[SearchModal] Search config loaded - SearchID: {searchConfig.SearchID}, Fields: {searchConfig.SearchFields.Count}");
                        return searchConfig;
                    }
                }

                _logger.LogWarning($"[SearchModal] No valid search configuration found for TableID: {tableID}");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[SearchModal] Error fetching search configuration for TableID: {tableID}");
                return null;
            }
        }
    }
}
