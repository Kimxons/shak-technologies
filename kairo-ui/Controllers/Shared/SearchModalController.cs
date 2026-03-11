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
            "InstructionID",
            "BranchID",
            "OurBranchID",
            "ClientID"
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

                // Route InstructionID searches through AccountManagement API directly
                // (OldApi p_GetSearchResult does not have a working config for this table)
                if (string.Equals(request.TableID, "InstructionID", StringComparison.OrdinalIgnoreCase))
                {
                    return await SearchSIViaAccountManagementApi(request);
                }

                if (string.Equals(request.TableID, "BranchID", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(request.TableID, "OurBranchID", StringComparison.OrdinalIgnoreCase))
                {
                    return await SearchBranchesViaOldApi(request);
                }

                if (string.Equals(request.TableID, "ClientID", StringComparison.OrdinalIgnoreCase))
                {
                    return await SearchClientsViaOldApi(request);
                }

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
        /// Search Standing Instructions via AccountManagement API.
        /// Used for TableID=InstructionID because OldApi p_GetSearchResult has no config for this table.
        /// </summary>
        private async Task<IActionResult> SearchSIViaAccountManagementApi(SearchResultRequestDto request)
        {
            try
            {
                _logger.LogInformation($"[SearchModal] Routing InstructionID search through AccountManagement API, Branch: {request.OurBranchID}");

                // Extract any user-typed filter from the SearchKey filters dictionary
                string siIdFilter = string.Empty;
                string accountIdFilter = string.Empty;
                if (request.SearchKey is System.Text.Json.JsonElement je && je.ValueKind == System.Text.Json.JsonValueKind.Object)
                {
                    if (je.TryGetProperty("SIID", out var siEl))
                    {
                        if (siEl.ValueKind == System.Text.Json.JsonValueKind.Object && siEl.TryGetProperty("value", out var valEl))
                            siIdFilter = valEl.GetString() ?? string.Empty;
                        else if (siEl.ValueKind == System.Text.Json.JsonValueKind.String)
                            siIdFilter = siEl.GetString() ?? string.Empty;
                    }

                    if (je.TryGetProperty("DebitAccountID", out var acEl))
                    {
                        if (acEl.ValueKind == System.Text.Json.JsonValueKind.Object && acEl.TryGetProperty("value", out var valEl))
                            accountIdFilter = valEl.GetString() ?? string.Empty;
                        else if (acEl.ValueKind == System.Text.Json.JsonValueKind.String)
                            accountIdFilter = acEl.GetString() ?? string.Empty;
                    }
                }

                var siRequest = new
                {
                    OurBranchID    = request.OurBranchID ?? string.Empty,
                    SIID           = siIdFilter,
                    DebitAccountID = accountIdFilter
                };

                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.SEARCH_SI_DEMAND_DRAFT,
                    siRequest
                );

                if (response.ValueKind == System.Text.Json.JsonValueKind.Undefined ||
                    response.ValueKind == System.Text.Json.JsonValueKind.Null)
                {
                    return Ok(new { success = false, message = "No results found" });
                }

                string responseCode = "99";
                if (response.TryGetProperty("ResponseCode", out var codeEl))
                    responseCode = codeEl.GetString() ?? "99";

                if (responseCode != "00")
                {
                    string msg = string.Empty;
                    if (response.TryGetProperty("ResponseMessage", out var msgEl)) msg = msgEl.GetString() ?? string.Empty;
                    return Ok(new { success = false, message = string.IsNullOrEmpty(msg) ? "No results found" : msg });
                }

                // Normalise the results into a list of objects the SearchModal JS can render
                var results = new List<object>();
                System.Text.Json.JsonElement? detailsEl = null;
                if (response.TryGetProperty("Details", out var d1)) detailsEl = d1;
                else if (response.TryGetProperty("details", out var d2)) detailsEl = d2;

                if (detailsEl.HasValue)
                {
                    if (detailsEl.Value.ValueKind == System.Text.Json.JsonValueKind.Array)
                    {
                        foreach (var item in detailsEl.Value.EnumerateArray()) results.Add(item);
                    }
                    else if (detailsEl.Value.ValueKind == System.Text.Json.JsonValueKind.Object)
                    {
                        results.Add(detailsEl.Value);
                    }
                    else if (detailsEl.Value.ValueKind == System.Text.Json.JsonValueKind.String)
                    {
                        var parsed = System.Text.Json.JsonDocument.Parse(detailsEl.Value.GetString()!);
                        if (parsed.RootElement.ValueKind == System.Text.Json.JsonValueKind.Array)
                            foreach (var item in parsed.RootElement.EnumerateArray()) results.Add(item);
                        else
                            results.Add(parsed.RootElement);
                    }
                }

                if (results.Count == 0)
                    return Ok(new { success = false, message = "No results found" });

                // Return results as a direct array in data so searchModal.js Array.isArray() branch handles it
                return Ok(new
                {
                    success = true,
                    data = results,
                    message = "Success"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SearchModal] AccountManagement SI search error");
                return StatusCode(500, new { success = false, message = "Search failed: " + ex.Message });
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
                        new() { FieldName = "AccountName", DisplayName = "Account Name", FieldOrder = 3 },
                        new() { FieldName = "ReferenceNo", DisplayName = "Reference No", FieldOrder = 4 }
                    }
                },
                "ClientID" => new SearchConfigDto
                {
                    SearchID = "ClientID",
                    SearchName = "Client",
                    KeyForNavigation = "ClientID",
                    SearchFields = new List<SearchFieldDto>
                    {
                        new() { FieldName = "ClientID", DisplayName = "Client ID", FieldOrder = 1 },
                        new() { FieldName = "Name", DisplayName = "Name", FieldOrder = 2 },
                        new() { FieldName = "IDNumber", DisplayName = "ID Number", FieldOrder = 3 },
                        new() { FieldName = "MobileNo", DisplayName = "MobileNo", FieldOrder = 4 },
                        new() { FieldName = "ClientApplicationID", DisplayName = "Client Application ID", FieldOrder = 5 },
                        new() { FieldName = "AccountID", DisplayName = "Account ID", FieldOrder = 6 },
                        new() { FieldName = "MotherName", DisplayName = "MotherName", FieldOrder = 7 }
                    }
                },
                "BranchID" or "OurBranchID" => new SearchConfigDto
                {
                    SearchID = tableID,
                    SearchName = "Branch",
                    KeyForNavigation = "OurBranchID",
                    SearchFields = new List<SearchFieldDto>
                    {
                        new() { FieldName = "OurBranchID", DisplayName = "Branch ID", FieldOrder = 1 },
                        new() { FieldName = "BranchName", DisplayName = "Branch Name", FieldOrder = 2 }
                    }
                },
                _ => null
            };
        }

        private async Task<IActionResult> SearchBranchesViaOldApi(SearchResultRequestDto request)
        {
            try
            {
                _logger.LogInformation("[SearchModal] Routing branch search through SEARCH_SYSTEM_BRANCHES");

                var bankId = HttpContext.Session.GetString("bank_id")
                    ?? HttpContext.Session.GetString("bank_code")
                    ?? "00";

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.SEARCH_SYSTEM_BRANCHES,
                    new
                    {
                        BankID = bankId
                    });

                var rows = new List<JsonElement>();
                if (response.ValueKind != JsonValueKind.Undefined && response.ValueKind != JsonValueKind.Null)
                {
                    if (response.TryGetProperty("Details", out var details) && details.ValueKind == JsonValueKind.Array)
                    {
                        rows.AddRange(details.EnumerateArray());
                    }
                    else if (response.TryGetProperty("Details01", out var details01) && details01.ValueKind == JsonValueKind.Array)
                    {
                        rows.AddRange(details01.EnumerateArray());
                    }
                }

                var filters = ExtractSearchFilters(request.SearchKey);
                var filteredRows = rows.Where(row => MatchesFilters(row, filters)).ToList();

                return Ok(new
                {
                    success = filteredRows.Count > 0,
                    data = new
                    {
                        ResponseCode = filteredRows.Count > 0 ? "00" : "99",
                        ResponseMessage = filteredRows.Count > 0 ? "Search completed successfully" : "No results found",
                        Details = filteredRows
                    },
                    message = filteredRows.Count > 0 ? "Search completed successfully" : "No results found"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SearchModal] Branch search error");
                return StatusCode(500, new { success = false, message = "Search failed: " + ex.Message });
            }
        }

        private async Task<IActionResult> SearchClientsViaOldApi(SearchResultRequestDto request)
        {
            try
            {
                _logger.LogInformation("[SearchModal] Routing client search through OldApi with local filter matching");

                var branchId = request.OurBranchID ?? HttpContext.Session.GetString("OurBranchID") ?? HttpContext.Session.GetString("branch_code") ?? string.Empty;
                var filters = ExtractSearchFilters(request.SearchKey);
                var primarySearchTerm = ExtractPrimarySearchTerm(request.SearchKey);
                var rows = await LoadClientRowsViaOldApi(request, branchId, filters.Count == 0 ? string.Empty : primarySearchTerm);
                var filteredRows = rows.Where(row => MatchesFilters(row, filters)).ToList();

                return Ok(new
                {
                    success = filteredRows.Count > 0,
                    data = new
                    {
                        ResponseCode = filteredRows.Count > 0 ? "00" : "99",
                        ResponseMessage = filteredRows.Count > 0 ? "Search completed successfully" : "No results found",
                        Details = filteredRows
                    },
                    message = filteredRows.Count > 0 ? "Search completed successfully" : "No results found"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SearchModal] Client search error");
                return StatusCode(500, new { success = false, message = "Search failed: " + ex.Message });
            }
        }

        private async Task<List<JsonElement>> LoadClientRowsViaOldApi(SearchResultRequestDto request, string branchId, string? primarySearchTerm)
        {
            var searchCandidates = new List<string>();
            var normalizedPrimaryTerm = primarySearchTerm?.Trim() ?? string.Empty;

            if (!string.IsNullOrWhiteSpace(normalizedPrimaryTerm))
            {
                searchCandidates.Add(normalizedPrimaryTerm);
            }
            else
            {
                searchCandidates.Add(string.Empty);
            }

            foreach (var fallbackTerm in new[] { "%", "*" })
            {
                if (!searchCandidates.Contains(fallbackTerm, StringComparer.Ordinal))
                {
                    searchCandidates.Add(fallbackTerm);
                }
            }

            foreach (var searchTerm in searchCandidates)
            {
                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_SEARCHRESULT_DBO,
                    new
                    {
                        TableID = request.TableID,
                        AdvFilterString = request.AdvFilterString ?? string.Empty,
                        WhereStmt = BuildClientWhereClause(branchId),
                        PrevOrNext = 0,
                        RefID = string.Empty,
                        OperatorID = request.OperatorID ?? string.Empty,
                        ModuleID = 0,
                        OurBranchID = branchId,
                        SearchKey = searchTerm,
                        LanguageID = "en"
                    });

                var rows = ExtractRows(response);
                if (rows.Count > 0)
                {
                    _logger.LogInformation("[SearchModal] Client search seed '{SearchSeed}' returned {RowCount} row(s)", searchTerm, rows.Count);
                    return rows;
                }
            }

            return [];
        }

        private static Dictionary<string, (string Value, string Mode)> ExtractSearchFilters(object? searchKey)
        {
            var result = new Dictionary<string, (string Value, string Mode)>(StringComparer.OrdinalIgnoreCase);
            if (searchKey is null)
            {
                return result;
            }

            if (searchKey is JsonElement json && json.ValueKind == JsonValueKind.Object)
            {
                foreach (var property in json.EnumerateObject())
                {
                    if (property.Value.ValueKind != JsonValueKind.Object)
                    {
                        continue;
                    }

                    var value = property.Value.TryGetProperty("value", out var valueEl)
                        ? valueEl.GetString() ?? string.Empty
                        : string.Empty;
                    var mode = property.Value.TryGetProperty("mode", out var modeEl)
                        ? modeEl.GetString() ?? "like"
                        : "like";

                    if (!string.IsNullOrWhiteSpace(value))
                    {
                        result[property.Name] = (value.Trim(), mode.Trim());
                    }
                }
            }

            return result;
        }

        private static bool MatchesFilters(JsonElement row, Dictionary<string, (string Value, string Mode)> filters)
        {
            if (filters.Count == 0)
            {
                return true;
            }

            foreach (var filter in filters)
            {
                var cellValue = GetJsonElementString(row, filter.Key);
                if (!MatchesFilter(cellValue, filter.Value.Value, filter.Value.Mode))
                {
                    return false;
                }
            }

            return true;
        }

        private static string GetJsonElementString(JsonElement row, string key)
        {
            foreach (var property in row.EnumerateObject())
            {
                if (string.Equals(property.Name, key, StringComparison.OrdinalIgnoreCase))
                {
                    return property.Value.ToString();
                }
            }

            return string.Empty;
        }

        private static bool MatchesFilter(string sourceValue, string filterValue, string mode)
        {
            var source = sourceValue?.Trim() ?? string.Empty;
            var filter = filterValue?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(filter))
            {
                return true;
            }

            return (mode ?? "like").Trim().ToLowerInvariant() switch
            {
                "equals" => string.Equals(source, filter, StringComparison.OrdinalIgnoreCase),
                "startswith" => source.StartsWith(filter, StringComparison.OrdinalIgnoreCase),
                "endswith" => source.EndsWith(filter, StringComparison.OrdinalIgnoreCase),
                _ => source.Contains(filter, StringComparison.OrdinalIgnoreCase)
            };
        }

        private static string ExtractPrimarySearchTerm(object? searchKey)
        {
            if (searchKey is null)
            {
                return string.Empty;
            }

            if (searchKey is string text)
            {
                return text.Trim();
            }

            if (searchKey is JsonElement json)
            {
                if (json.ValueKind == JsonValueKind.String)
                {
                    return json.GetString()?.Trim() ?? string.Empty;
                }

                if (json.ValueKind == JsonValueKind.Object)
                {
                    var preferredFields = new[]
                    {
                        "ClientID",
                        "Name",
                        "IDNumber",
                        "MobileNo",
                        "ClientApplicationID",
                        "AccountID",
                        "MotherName",
                        "OurBranchID",
                        "BranchID",
                        "BranchName"
                    };

                    foreach (var field in preferredFields)
                    {
                        if (!json.TryGetProperty(field, out var property) || property.ValueKind == JsonValueKind.Null)
                        {
                            continue;
                        }

                        var value = property.ValueKind switch
                        {
                            JsonValueKind.Object when property.TryGetProperty("value", out var nestedValue) => nestedValue.GetString(),
                            JsonValueKind.String => property.GetString(),
                            JsonValueKind.Number => property.ToString(),
                            JsonValueKind.True => bool.TrueString,
                            JsonValueKind.False => bool.FalseString,
                            _ => null
                        };

                        if (!string.IsNullOrWhiteSpace(value))
                        {
                            return value.Trim();
                        }
                    }

                    foreach (var property in json.EnumerateObject())
                    {
                        var value = property.Value.ValueKind switch
                        {
                            JsonValueKind.Object when property.Value.TryGetProperty("value", out var nestedValue) => nestedValue.GetString(),
                            JsonValueKind.String => property.Value.GetString(),
                            JsonValueKind.Number => property.Value.ToString(),
                            JsonValueKind.True => bool.TrueString,
                            JsonValueKind.False => bool.FalseString,
                            _ => null
                        };

                        if (!string.IsNullOrWhiteSpace(value))
                        {
                            return value.Trim();
                        }
                    }
                }
            }

            return searchKey.ToString()?.Trim() ?? string.Empty;
        }

        private static List<JsonElement> ExtractRows(JsonElement response)
        {
            if (response.ValueKind == JsonValueKind.Array)
            {
                return response.EnumerateArray().Select(item => item.Clone()).ToList();
            }

            if (response.ValueKind != JsonValueKind.Object)
            {
                return [];
            }

            foreach (var propertyName in new[] { "Details01", "Details1", "Details", "data", "Data", "Records" })
            {
                if (TryGetPropertyIgnoreCase(response, propertyName, out var propertyValue))
                {
                    var rows = NormalizeRows(propertyValue);
                    if (rows.Count > 0)
                    {
                        return rows;
                    }
                }
            }

            foreach (var property in response.EnumerateObject())
            {
                var rows = NormalizeRows(property.Value);
                if (rows.Count > 0)
                {
                    return rows;
                }
            }

            return [];
        }

        private static List<JsonElement> NormalizeRows(JsonElement value)
        {
            if (value.ValueKind == JsonValueKind.Array)
            {
                return value.EnumerateArray().Select(item => item.Clone()).ToList();
            }

            if (value.ValueKind == JsonValueKind.Object)
            {
                if (TryGetPropertyIgnoreCase(value, "SearchResults", out var searchResults))
                {
                    return NormalizeRows(searchResults);
                }

                if (TryGetPropertyIgnoreCase(value, "Details", out var nestedDetails))
                {
                    return NormalizeRows(nestedDetails);
                }
            }

            return [];
        }

        private static bool TryGetPropertyIgnoreCase(JsonElement element, string propertyName, out JsonElement propertyValue)
        {
            if (element.ValueKind == JsonValueKind.Object)
            {
                foreach (var property in element.EnumerateObject())
                {
                    if (string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
                    {
                        propertyValue = property.Value;
                        return true;
                    }
                }
            }

            propertyValue = default;
            return false;
        }

        private static string BuildClientWhereClause(string? branchId)
        {
            if (string.IsNullOrWhiteSpace(branchId))
            {
                return string.Empty;
            }

            return $"OurBranchID = '{branchId.Replace("'", "''", StringComparison.Ordinal)}'";
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
                    SearchKey = ExtractPrimarySearchTerm(request.SearchKey),
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
