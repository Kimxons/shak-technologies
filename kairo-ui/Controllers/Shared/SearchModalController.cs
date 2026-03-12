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
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly IConfiguration _config;
        private readonly ILogger<SearchModalController> _logger;

        // Table IDs that are not configured in SystemCoreApi and need OldApi fallback
        // NOTE: InstructionID is handled by SystemCoreApi (GetSystemSearch returns 00) - do not add here
        private static readonly HashSet<string> _fallbackTableIds = new(StringComparer.OrdinalIgnoreCase)
        {
        };

        public SearchModalController(
            IAuthService authService,
            IApiService apiService,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            IConfiguration configuration,
            ILogger<SearchModalController> logger)
        {
            _authService = authService;
            _apiService = apiService;
            _oldApiService = oldApiService;
            _apiCachedService = apiCachedService;
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
                if (request == null)
                {
                    _logger.LogWarning("[SearchModal] Null request payload");
                    return BadRequest(new { success = false, message = "Invalid search request payload" });
                }

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

                // Route through OldApi for table IDs not configured in SystemCoreApi
                if (_fallbackTableIds.Contains(request.TableID))
                {
                    return await SearchViaOldApi(request, searchRequestData);
                }

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
        /// Resolve an entered ID into its display description/name.
        /// POST: /SearchModal/GetIDDescription
        /// </summary>
        [HttpPost]
        [Route("GetIDDescription")]
        public async Task<IActionResult> GetIDDescription([FromBody] SearchIdDescriptionRequestDto request)
        {
            try
            {
                if (request == null)
                {
                    _logger.LogWarning("[SearchModal] Null GetIDDescription request payload");
                    return BadRequest(new { success = false, message = "Invalid request payload" });
                }

                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("[SearchModal] Unauthenticated GetIDDescription attempt");
                    return Unauthorized(new { success = false, message = "User not authenticated" });
                }

                if (string.IsNullOrWhiteSpace(request.ControlTypeID) || string.IsNullOrWhiteSpace(request.ID))
                {
                    return BadRequest(new { success = false, message = "ControlTypeID and ID are required" });
                }

                request.OurBranchID = string.IsNullOrWhiteSpace(request.OurBranchID)
                    ? HttpContext.Session.GetString("OurBranchID") ?? HttpContext.Session.GetString("branch_code") ?? string.Empty
                    : request.OurBranchID;

                request.LanguageID = string.IsNullOrWhiteSpace(request.LanguageID)
                    ? HttpContext.Session.GetString("LanguageID") ?? "en"
                    : request.LanguageID;

                request.BankID = string.IsNullOrWhiteSpace(request.BankID) ? "00" : request.BankID;
                request.TypeID ??= string.Empty;
                request.AdvanceFilter ??= string.Empty;
                request.ModuleID ??= "100";

                var apiRequestData = new
                {
                    ControlTypeID = request.ControlTypeID,
                    ID = request.ID,
                    BankID = request.BankID,
                    TypeID = request.TypeID,
                    AdvanceFilter = request.AdvanceFilter,
                    LanguageID = request.LanguageID,
                    OurBranchID = request.OurBranchID,
                    ModuleID = request.ModuleID
                };

                _logger.LogInformation(
                    "[SearchModal] GetIDDescription request - ControlTypeID: {ControlTypeID}, ID: {ID}, Branch: {Branch}",
                    request.ControlTypeID,
                    request.ID,
                    request.OurBranchID
                );

                var response = await _apiService.CreateAsync<JsonElement>("SystemCoreApi", ApiEndpoints.GET_ID_DESCRIPTION, apiRequestData);

                var responseCode = string.Empty;
                var responseMessage = string.Empty;

                if (response.ValueKind == JsonValueKind.Object)
                {
                    if (response.TryGetProperty("ResponseCode", out var responseCodeEl))
                    {
                        responseCode = responseCodeEl.GetString() ?? string.Empty;
                    }

                    if (response.TryGetProperty("ResponseMessage", out var responseMessageEl))
                    {
                        responseMessage = responseMessageEl.GetString() ?? string.Empty;
                    }
                }

                var isSuccess = string.Equals(responseCode, "00", StringComparison.OrdinalIgnoreCase);
                return Ok(new
                {
                    success = isSuccess,
                    data = response,
                    message = string.IsNullOrWhiteSpace(responseMessage)
                        ? (isSuccess ? "Lookup completed successfully" : "Lookup returned no matching record")
                        : responseMessage
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SearchModal] GetIDDescription error");
                return StatusCode(500, new
                {
                    success = false,
                    message = "GetIDDescription failed",
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

                // Use cached service for search configuration
                var searchConfig = await _apiCachedService.GetSearchConfigurationAsync(tableID);

                if (searchConfig != null)
                {
                    _logger.LogInformation($"[SearchModal] Search config loaded - SearchID: {searchConfig.SearchID}, Fields: {searchConfig.SearchFields.Count}");
                    return searchConfig;
                }

                // Fallback for table IDs not yet configured in SystemCoreApi
                var fallback = GetFallbackSearchConfig(tableID);
                if (fallback != null)
                {
                    _logger.LogInformation($"[SearchModal] Using fallback config for TableID: {tableID}");
                    return fallback;
                }

                _logger.LogWarning($"[SearchModal] No valid search configuration found for TableID: {tableID}");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[SearchModal] Error fetching search configuration for TableID: {tableID}");
                return GetFallbackSearchConfig(tableID);
            }
        }

        /// <summary>
        /// Hardcoded search configurations for table IDs not yet in SystemCoreApi.
        /// These mirror the legacy system's search metadata.
        /// </summary>
        private static SearchConfigDto? GetFallbackSearchConfig(string tableID)
        {
            return tableID switch
            {
                "InstructionID" => new SearchConfigDto
                {
                    SearchID = "InstructionID",
                    SearchName = "Standing Instruction",
                    KeyForNavigation = "SIID",
                    SearchFields = new List<SearchFieldDto>
                    {
                        new() { FieldName = "SIID", DisplayName = "SI ID", FieldOrder = 1 },
                        new() { FieldName = "DebitAccountID", DisplayName = "Debit Account", FieldOrder = 2 },
                        new() { FieldName = "AccountName", DisplayName = "Account Name", FieldOrder = 3 }
                    }
                },
                _ => null
            };
        }

        /// <summary>
        /// Execute search via OldApi (p_GetSearchResult) for table IDs not in SystemCoreApi.
        /// </summary>
        private async Task<IActionResult> SearchViaOldApi(SearchResultRequestDto request, object searchRequestData)
        {
            try
            {
                _logger.LogInformation($"[SearchModal] Routing search for {request.TableID} through OldApi");

                var oldApiRequest = new
                {
                    TableID = request.TableID,
                    SearchID = request.TableID,
                    WhereStmt = request.WhereStmt ?? string.Empty,
                    AdvFilterString = request.AdvFilterString ?? string.Empty,
                    SearchKey = request.SearchKey ?? string.Empty,
                    PrevOrNext = request.PrevOrNext ?? 0,
                    Reference = request.RefID ?? string.Empty,
                    PageSize = request.PageSize ?? 20,
                    OurBranchID = request.OurBranchID ?? string.Empty,
                    OperatorID = request.OperatorID ?? string.Empty,
                    ModuleID = request.ModuleID ?? "100",
                    LanguageID = "en"
                };

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_SEARCHRESULT,
                    oldApiRequest
                );

                // Extract results from the OldApi response
                var results = new List<object>();
                var responseCode = "99";
                var responseMessage = "No results found";

                if (response.ValueKind != JsonValueKind.Undefined && response.ValueKind != JsonValueKind.Null)
                {
                    // Try to extract ResponseCode
                    if (response.TryGetProperty("ResponseCode", out var codeEl))
                        responseCode = codeEl.GetString() ?? "99";

                    if (response.TryGetProperty("ResponseMessage", out var msgEl))
                        responseMessage = msgEl.GetString() ?? string.Empty;

                    // Try multiple possible result locations
                    JsonElement? detailsArray = null;
                    if (response.TryGetProperty("Details", out var details))
                        detailsArray = details;
                    else if (response.TryGetProperty("Details01", out var details01))
                        detailsArray = details01;

                    if (detailsArray.HasValue)
                    {
                        if (detailsArray.Value.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var item in detailsArray.Value.EnumerateArray())
                                results.Add(item);
                        }
                        else if (detailsArray.Value.ValueKind == JsonValueKind.String)
                        {
                            // Details might be a JSON string that needs parsing
                            var parsed = JsonDocument.Parse(detailsArray.Value.GetString()!);
                            if (parsed.RootElement.ValueKind == JsonValueKind.Array)
                            {
                                foreach (var item in parsed.RootElement.EnumerateArray())
                                    results.Add(item);
                            }
                        }
                    }
                }

                _logger.LogInformation($"[SearchModal] OldApi search returned {results.Count} results");

                if (responseCode == "00" && results.Count > 0)
                {
                    return Ok(new
                    {
                        success = true,
                        data = new { ResponseCode = responseCode, ResponseMessage = responseMessage, Details = results },
                        message = responseMessage
                    });
                }

                return Ok(new { success = false, message = responseMessage });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[SearchModal] OldApi search error for {request.TableID}");
                return StatusCode(500, new { success = false, message = "Search failed: " + ex.Message });
            }
        }
    }
}
