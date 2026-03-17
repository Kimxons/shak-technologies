using CBS.Entities.Common;
using CBS.Entities.SystemCore;
using kairo_ui.Services.Caching;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Services
{
    /// <summary>
    /// Interface for cached API service - wraps API calls with caching
    /// </summary>
    public interface IApiCachedService
    {
        /// <summary>
        /// Fetches main modules with caching (4 hours cache)
        /// </summary>
        Task<List<MainModule>> GetMainModulesAsync(List<string> modules, string userName, bool forceRefresh = false);

        /// <summary>
        /// Fetches all modules with caching (1 hour cache)
        /// </summary>
        Task<List<Module>> GetModulesAsync(string userName, bool forceRefresh = false);

        /// <summary>
        /// Fetches submodules for a specific parent module with caching (1 hour cache)
        /// </summary>
        /// <param name="parentModuleId">Parent module ID to get submodules for</param>
        /// <param name="userName">Username for API request</param>
        /// <param name="forceRefresh">Bypass cache and fetch fresh data</param>
        /// <returns>List of submodules where ParentMenuModuleID matches the parentModuleId</returns>
        Task<List<Module>> GetSubModulesAsync(int parentModuleId, string userName, bool forceRefresh = false);

        /// <summary>
        /// Fetches system bank settings with caching (4 hours cache)
        /// </summary>
        Task<SystemBankSetting?> GetSystemBankSettingsAsync(bool forceRefresh = false);

        /// <summary>
        /// Fetches search configuration with caching (2 hours cache)
        /// </summary>
        Task<kairo_ui.Models.Shared.SearchConfigDto?> GetSearchConfigurationAsync(string tableId, bool forceRefresh = false);

        /// <summary>
        /// Fetches system code options with caching (4 hours cache)
        /// </summary>
        /// <param name="codeId">System code identifier (e.g., "ClientTypeID", "GenderID")</param>
        /// <param name="forceRefresh">Bypass cache and fetch fresh data</param>
        /// <returns>List of system code details</returns>
        Task<List<SystemCodeDetail>> GetSystemCodeOptionsAsync(string codeId, bool forceRefresh = false);

        /// <summary>
        /// Fetches multiple system code options with caching (4 hours cache)
        /// Optimized for loading multiple dropdowns at once
        /// </summary>
        /// <param name="codeIds">Array of system code identifiers to fetch</param>
        /// <param name="forceRefresh">Bypass cache and fetch fresh data</param>
        /// <returns>Dictionary mapping code IDs to their system code details</returns>
        Task<Dictionary<string, List<SystemCodeDetail>>> GetMultipleSystemCodeOptionsAsync(string[] codeIds, bool forceRefresh = false);

        /// <summary>
        /// Fetches multiple system code options with caching (4 hours cache) and formats them as SelectListItem for dropdown binding
        /// Returns data in ASP.NET Core standard SelectListItem format for easy Razor view dropdown binding
        /// </summary>
        /// <param name="codeIds">Array of system code identifiers to fetch</param>
        /// <param name="forceRefresh">Bypass cache and fetch fresh data</param>
        /// <returns>Dictionary mapping code IDs to their formatted SelectListItem options</returns>
        Task<Dictionary<string, IEnumerable<SelectListItem>>> GetMultipleDropdownCodeOptionsAsync(string[] codeIds, bool forceRefresh = false);

        /// <summary>
        /// Invalidates cached main modules
        /// </summary>
        Task InvalidateMainModulesAsync();

        /// <summary>
        /// Invalidates cached modules
        /// </summary>
        Task InvalidateModulesAsync();

        /// <summary>
        /// Invalidates cached system bank settings
        /// </summary>
        Task InvalidateSystemBankSettingsAsync();

        /// <summary>
        /// Invalidates cached search configuration for a specific table
        /// </summary>
        Task InvalidateSearchConfigurationAsync(string tableId);

        /// <summary>
        /// Invalidates cached system code options for a specific code
        /// </summary>
        /// <param name="codeId">System code identifier to invalidate</param>
        Task InvalidateSystemCodeOptionsAsync(string codeId);
    }

    /// <summary>
    /// Cached API service implementation - adds caching layer to API calls
    /// Implements production-ready caching for frequently accessed system data
    /// </summary>
    public class ApiCachedService : IApiCachedService
    {
        private readonly IApiService _apiService;
        private readonly IProductionCachingRepository _cache;
        private readonly IHttpContextAccessor _httpContext;
        private readonly ILogger<ApiCachedService> _logger;

        public ApiCachedService(
            IApiService apiService,
       IProductionCachingRepository cache,
          IHttpContextAccessor httpContextAccessor,
      ILogger<ApiCachedService> logger)
        {
            _apiService = apiService;
            _cache = cache;
            _httpContext = httpContextAccessor;
            _logger = logger;
        }

        /// <summary>
        /// Fetches main modules with caching
        /// Cache key format: MODULE:MAIN_MODULES (global cache)
        /// </summary>
        public async Task<List<MainModule>> GetMainModulesAsync(List<string> modules, string userName, bool forceRefresh = false)
        {
            try
            {
                // Use global cache key without username - data is same for all users
                var cacheKey = CachingConstants.MAIN_MODULES;

                _logger.LogInformation("[ApiCachedService] Fetching main modules - Key: {CacheKey}, ForceRefresh: {ForceRefresh}",
     cacheKey, forceRefresh);

                if (forceRefresh)
                {
                    await _cache.RemoveAsync(cacheKey);
                }

                var mainModules = await _cache.GetOrCreateAsync(
                cacheKey,
     async () =>
        {
            _logger.LogInformation("[ApiCachedService] Cache miss for main modules - Fetching from API");
            return await FetchMainModulesFromApi(modules, userName);
        },
         CachingConstants.ModuleStructurePolicy);

                _logger.LogInformation("[ApiCachedService] Retrieved {Count} main modules", mainModules?.Count ?? 0);
                return mainModules ?? new List<MainModule>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ApiCachedService] Error fetching main modules");
                return new List<MainModule>();
            }
        }

        /// <summary>
        /// Fetches all modules with caching
        /// Cache key format: MODULE:ALL_MODULES (global cache)
        /// </summary>
        public async Task<List<Module>> GetModulesAsync(string userName, bool forceRefresh = false)
        {
            try
            {
                // Use global cache key without username - data is same for all users
                var cacheKey = $"{CachingConstants.MODULE_DATA_PREFIX}ALL_MODULES";

                _logger.LogInformation("[ApiCachedService] Fetching modules - Key: {CacheKey}, ForceRefresh: {ForceRefresh}",
                cacheKey, forceRefresh);

                if (forceRefresh)
                {
                    await _cache.RemoveAsync(cacheKey);
                }

                var modules = await _cache.GetOrCreateAsync(
                cacheKey,
              async () =>
                   {
                       _logger.LogInformation("[ApiCachedService] Cache miss for modules - Fetching from API");
                       return await FetchModulesFromApi(userName);
                   },
              CachingConstants.ModuleStructurePolicy);

                _logger.LogInformation("[ApiCachedService] Retrieved {Count} modules", modules?.Count ?? 0);
                return modules ?? new List<Module>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ApiCachedService] Error fetching modules");
                return new List<Module>();
            }
        }

        /// <summary>
        /// Fetches submodules for a specific parent module with caching
        /// Cache key format: MODULE:SUBMODULES:{parentModuleId} (global cache)
        /// </summary>
        public async Task<List<Module>> GetSubModulesAsync(int parentModuleId, string userName, bool forceRefresh = false)
        {
            try
            {
                // Use global cache key - submodules are same for all users with same parent
                var cacheKey = $"{CachingConstants.MODULE_DATA_PREFIX}SUBMODULES:{parentModuleId}";

                _logger.LogInformation("[ApiCachedService] Fetching submodules - Key: {CacheKey}, ParentModuleId: {ParentModuleId}, ForceRefresh: {ForceRefresh}",
            cacheKey, parentModuleId, forceRefresh);

                if (forceRefresh)
                {
                    await _cache.RemoveAsync(cacheKey);
                }

                var subModules = await _cache.GetOrCreateAsync(
             cacheKey,
                   async () =>
                   {
                       _logger.LogInformation("[ApiCachedService] Cache miss for submodules - Fetching from API");
                       // Fetch all modules and filter by ParentMenuModuleID
                       var allModules = await FetchModulesFromApi(userName);
                       var filtered = allModules
       .Where(m => m.ParentMenuModuleID == parentModuleId)
    .OrderBy(m => m.MenuItemOrder ?? 999)
      .ToList();

                       _logger.LogInformation("[ApiCachedService] Filtered {Count} submodules for parent {ParentModuleId}",
                filtered.Count, parentModuleId);
                       return filtered;
                   },
                        CachingConstants.ModuleStructurePolicy);

                _logger.LogInformation("[ApiCachedService] Retrieved {Count} submodules for parent {ParentModuleId}",
                    subModules?.Count ?? 0, parentModuleId);
                return subModules ?? new List<Module>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ApiCachedService] Error fetching submodules for parent {ParentModuleId}", parentModuleId);
                return new List<Module>();
            }
        }

        /// <summary>
        /// Fetches system bank settings with caching
        /// Cache key format: SETTINGS:BANK
        /// </summary>
        public async Task<SystemBankSetting?> GetSystemBankSettingsAsync(bool forceRefresh = false)
        {
            try
            {
                var cacheKey = CachingConstants.SYSTEM_BANK_SETTINGS;

                _logger.LogInformation("[ApiCachedService] Fetching system bank settings - Key: {CacheKey}, ForceRefresh: {ForceRefresh}",
        cacheKey, forceRefresh);

                if (forceRefresh)
                {
                    await _cache.RemoveAsync(cacheKey);
                }

                var settings = await _cache.GetOrCreateAsync(
                 cacheKey,
              async () =>
           {
               _logger.LogInformation("[ApiCachedService] Cache miss for bank settings - Fetching from API");
               return await FetchSystemBankSettingsFromApi();
           },
             CachingConstants.SystemCodesPolicy); // Long-lived, high priority, compressed

                _logger.LogInformation("[ApiCachedService] Retrieved system bank settings: {BankName}",
        settings?.BankName ?? "N/A");
                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ApiCachedService] Error fetching system bank settings");
                return null;
            }
        }

        /// <summary>
        /// Fetches search configuration with caching
        /// Cache key format: LOOKUP:SEARCH_CONFIG:{tableId}
        /// </summary>
        public async Task<kairo_ui.Models.Shared.SearchConfigDto?> GetSearchConfigurationAsync(string tableId, bool forceRefresh = false)
        {
            try
            {
                var cacheKey = $"{CachingConstants.LOOKUP_PREFIX}SEARCH_CONFIG:{tableId}";

                _logger.LogInformation("[ApiCachedService] Fetching search config - Key: {CacheKey}, ForceRefresh: {ForceRefresh}",
                  cacheKey, forceRefresh);

                if (forceRefresh)
                {
                    await _cache.RemoveAsync(cacheKey);
                }

                var searchConfig = await _cache.GetOrCreateAsync(
                       cacheKey,
                   async () =>
                 {
                     _logger.LogInformation("[ApiCachedService] Cache miss for search config - Fetching from API");
                     return await FetchSearchConfigurationFromApi(tableId);
                 },
                        CachingConstants.LookupDataPolicy); // Long-lived, compressed

                _logger.LogInformation("[ApiCachedService] Retrieved search config: {SearchName}, Fields: {FieldCount}",
                        searchConfig?.SearchName ?? "N/A", searchConfig?.SearchFields?.Count ?? 0);
                return searchConfig;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ApiCachedService] Error fetching search configuration for TableID: {TableID}", tableId);
                return null;
            }
        }

        /// <summary>
        /// Fetches system code options with caching
        /// Cache key format: SYSCODES:{codeId}
        /// </summary>
        /// <param name="codeId">System code identifier (e.g., "ClientTypeID", "GenderID")</param>
        /// <param name="forceRefresh">Bypass cache and fetch fresh data</param>
        /// <returns>List of system code details</returns>
        public async Task<List<SystemCodeDetail>> GetSystemCodeOptionsAsync(string codeId, bool forceRefresh = false)
        {
            try
            {
                var cacheKey = CachingConstants.GetSystemCodeOptionsKey(codeId);

                _logger.LogInformation("[ApiCachedService] Fetching system code options - Key: {CacheKey}, ForceRefresh: {ForceRefresh}",
               cacheKey, forceRefresh);

                if (forceRefresh)
                {
                    await _cache.RemoveAsync(cacheKey);
                }

                var systemCodes = await _cache.GetOrCreateAsync(
                cacheKey,
             async () =>
                        {
                            _logger.LogInformation("[ApiCachedService] Cache miss for system codes - Fetching from API");
                            return await FetchSystemCodeOptionsFromApi(codeId);
                        },
                               CachingConstants.SystemCodesPolicy); // Long-lived, high priority, compressed

                _logger.LogInformation("[ApiCachedService] Retrieved {Count} system code options for {CodeId}",
                    systemCodes?.Count ?? 0, codeId);
                return systemCodes ?? new List<SystemCodeDetail>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ApiCachedService] Error fetching system code options for CodeID: {CodeID}", codeId);
                return new List<SystemCodeDetail>();
            }
        }

        // ============================================================================
        // CACHE INVALIDATION METHODS
        // ============================================================================

        /// <summary>
        /// Invalidates all cached main modules
        /// </summary>
        public async Task InvalidateMainModulesAsync()
        {
            try
            {
                _logger.LogInformation("[ApiCachedService] Invalidating main modules cache");
                // Remove global main modules cache (no wildcards needed since it's a single key)
                await _cache.RemoveAsync(CachingConstants.MAIN_MODULES);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ApiCachedService] Error invalidating main modules cache");
            }
        }

        /// <summary>
        /// Invalidates all cached modules
        /// </summary>
        public async Task InvalidateModulesAsync()
        {
            try
            {
                _logger.LogInformation("[ApiCachedService] Invalidating modules cache");
                // Remove global modules cache (no wildcards needed since it's a single key)
                await _cache.RemoveAsync($"{CachingConstants.MODULE_DATA_PREFIX}ALL_MODULES");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ApiCachedService] Error invalidating modules cache");
            }
        }

        /// <summary>
        /// Invalidates cached system bank settings
        /// </summary>
        public async Task InvalidateSystemBankSettingsAsync()
        {
            try
            {
                _logger.LogInformation("[ApiCachedService] Invalidating system bank settings cache");
                await _cache.RemoveAsync(CachingConstants.SYSTEM_BANK_SETTINGS);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ApiCachedService] Error invalidating system bank settings cache");
            }
        }

        /// <summary>
        /// Invalidates cached search configuration for a specific table
        /// </summary>
        public async Task InvalidateSearchConfigurationAsync(string tableId)
        {
            try
            {
                var cacheKey = $"{CachingConstants.LOOKUP_PREFIX}SEARCH_CONFIG:{tableId}";
                _logger.LogInformation("[ApiCachedService] Invalidating search config cache for TableID: {TableID}", tableId);
                await _cache.RemoveAsync(cacheKey);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ApiCachedService] Error invalidating search config cache for TableID: {TableID}", tableId);
            }
        }

        /// <summary>
        /// Invalidates cached system code options for a specific code
        /// </summary>
        public async Task InvalidateSystemCodeOptionsAsync(string codeId)
        {
            try
            {
                var cacheKey = CachingConstants.GetSystemCodeOptionsKey(codeId);
                _logger.LogInformation("[ApiCachedService] Invalidating system code cache for CodeID: {CodeID}", codeId);
                await _cache.RemoveAsync(cacheKey);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ApiCachedService] Error invalidating system code cache for CodeID: {CodeID}", codeId);
            }
        }

        // ============================================================================
        // PRIVATE API FETCH METHODS
        // ============================================================================

        /// <summary>
        /// Fetches main modules from SystemCoreApi
        /// </summary>
        private async Task<List<MainModule>> FetchMainModulesFromApi(List<string> modules, string userName)
        {
            try
            {
                var requestId = _httpContext.HttpContext?.Connection.Id ?? Guid.NewGuid().ToString();
                var apiRequest = new
                {
                    RequestID = requestId,
                    Modules = modules,
                    UserName = userName
                };

                _logger.LogDebug("[ApiCachedService] API Request for main modules - UserName: {UserName}, Modules: {ModuleCount}",
             userName, modules.Count);

                var response = await _apiService.CreateAsync<ResponseDetail<object>>(
           "SystemCoreApi",
              ApiEndpoints.GET_MAINMODULES,
          apiRequest);

                if (response?.ResponseCode == "00" && response.Details != null)
                {
                    var detailsJson = JsonSerializer.Serialize(response.Details);
                    var mainModules = JsonSerializer.Deserialize<List<MainModule>>(detailsJson, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                    _logger.LogInformation("[ApiCachedService] Successfully fetched {Count} main modules from API",
                       mainModules?.Count ?? 0);
                    return mainModules ?? new List<MainModule>();
                }

                _logger.LogWarning("[ApiCachedService] API returned unsuccessful response for main modules - Code: {ResponseCode}",
                      response?.ResponseCode ?? "NULL");
                return new List<MainModule>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ApiCachedService] Error fetching main modules from API");
                throw;
            }
        }

        /// <summary>
        /// Fetches modules from SystemCoreApi
        /// </summary>
        private async Task<List<Module>> FetchModulesFromApi(string userName)
        {
            try
            {
                var requestId = _httpContext.HttpContext?.Connection.Id ?? Guid.NewGuid().ToString();
                var apiRequest = new
                {
                    RequestID = requestId,
                    UserName = userName
                };

                _logger.LogDebug("[ApiCachedService] API Request for modules - UserName: {UserName}", userName);

                var response = await _apiService.CreateAsync<ResponseDetail<object>>(
        "SystemCoreApi",
  ApiEndpoints.GET_MODULES,
    apiRequest);

                if (response?.ResponseCode == "00" && response.Details != null)
                {
                    var detailsJson = JsonSerializer.Serialize(response.Details);
                    var modules = JsonSerializer.Deserialize<List<Module>>(detailsJson, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                    _logger.LogInformation("[ApiCachedService] Successfully fetched {Count} modules from API",
                       modules?.Count ?? 0);
                    return modules ?? new List<Module>();
                }

                _logger.LogWarning("[ApiCachedService] API returned unsuccessful response for modules - Code: {ResponseCode}",
                       response?.ResponseCode ?? "NULL");
                return new List<Module>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ApiCachedService] Error fetching modules from API");
                throw;
            }
        }

        /// <summary>
        /// Fetches system bank settings from SystemCoreApi
        /// </summary>
        private async Task<SystemBankSetting?> FetchSystemBankSettingsFromApi()
        {
            try
            {
                var requestId = _httpContext.HttpContext?.Connection.Id ?? Guid.NewGuid().ToString();
                var session = _httpContext.HttpContext?.Session;
                var branchCode = session?.GetString("branch_code") ?? string.Empty;
                var operatorId = session?.GetString("user_name") ?? string.Empty;
                var apiRequest = new
                {
                    RequestID = requestId,
                    BankID = "00",
                    OurBranchID = branchCode,
                    OperatorID = operatorId
                };

                _logger.LogDebug("[ApiCachedService] API Request for system bank settings | BranchCode: {BranchCode} | OperatorId: {OperatorId}",
                    branchCode,
                    operatorId);

                var response = await _apiService.CreateAsync<ResponseDetail<object>>(
             "SystemCoreApi",
              ApiEndpoints.GET_SYSTEMBANKSETTINGS,
          apiRequest);

                if (response?.ResponseCode == "00" && response.Details != null)
                {
                    var settings = DeserializeSystemBankSettings(response.Details);

                    _logger.LogInformation("[ApiCachedService] Successfully fetched system bank settings from API - Bank: {BankName}",
                         settings?.BankName ?? "N/A");
                    return settings;
                }

                _logger.LogWarning("[ApiCachedService] API returned unsuccessful response for bank settings - Code: {ResponseCode}",
             response?.ResponseCode ?? "NULL");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ApiCachedService] Error fetching system bank settings from API");
                throw;
            }
        }

        private static SystemBankSetting? DeserializeSystemBankSettings(object details)
        {
            if (details is null)
            {
                return null;
            }

            var serializerOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            if (details is JsonElement element)
            {
                if (element.ValueKind == JsonValueKind.Object &&
                    element.TryGetProperty("SystemBankSettingData", out var nestedSettings))
                {
                    return JsonSerializer.Deserialize<SystemBankSetting>(nestedSettings.GetRawText(), serializerOptions);
                }

                return JsonSerializer.Deserialize<SystemBankSetting>(element.GetRawText(), serializerOptions);
            }

            var detailsJson = JsonSerializer.Serialize(details);
            using var jsonDocument = JsonDocument.Parse(detailsJson);
            var root = jsonDocument.RootElement;

            if (root.ValueKind == JsonValueKind.Object &&
                root.TryGetProperty("SystemBankSettingData", out var settingsData))
            {
                return JsonSerializer.Deserialize<SystemBankSetting>(settingsData.GetRawText(), serializerOptions);
            }

            return JsonSerializer.Deserialize<SystemBankSetting>(detailsJson, serializerOptions);
        }

        /// <summary>
        /// Fetches search configuration from SystemCoreApi
        /// </summary>
        private async Task<kairo_ui.Models.Shared.SearchConfigDto?> FetchSearchConfigurationFromApi(string tableId)
        {
            try
            {
                var apiRequest = new
                {
                    SearchID = tableId
                };

                _logger.LogDebug("[ApiCachedService] API Request for search config - TableID: {TableID}", tableId);

                var response = await _apiService.CreateAsync<ResponseDetail<object>>(
             "SystemCoreApi",
                 ApiEndpoints.GET_SYSTEM_SEARCH,
                     apiRequest);

                if (response?.ResponseCode == "00" && response.Details != null)
                {
                    var detailsJson = JsonSerializer.Serialize(response.Details);
                    var searchConfig = JsonSerializer.Deserialize<kairo_ui.Models.Shared.SearchConfigDto>(detailsJson, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                    _logger.LogInformation("[ApiCachedService] Successfully fetched search config from API - SearchID: {SearchID}, Fields: {FieldCount}",
                       searchConfig?.SearchID ?? "N/A", searchConfig?.SearchFields?.Count ?? 0);
                    return searchConfig;
                }

                _logger.LogWarning("[ApiCachedService] API returned unsuccessful response for search config - Code: {ResponseCode}",
            response?.ResponseCode ?? "NULL");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ApiCachedService] Error fetching search configuration from API for TableID: {TableID}", tableId);
                throw;
            }
        }

        /// <summary>
        /// Fetches system code options from SystemCoreApi
        /// Calls the p_v1_GetSystemCodes stored procedure
        /// </summary>
        /// <param name="codeId">System code identifier (e.g., "ClientTypeID")</param>
        /// <returns>List of system code details</returns>
        private async Task<List<SystemCodeDetail>> FetchSystemCodeOptionsFromApi(string codeId)
        {
            try
            {
                var apiRequest = new
                {
                    CodeID = codeId
                };

                _logger.LogDebug("[ApiCachedService] API Request for system codes - CodeID: {CodeID}", codeId);

                // Use the dedicated GET_SYSTEM_CODES endpoint instead of GET_SYSTEM_SEARCH
                var response = await _apiService.CreateAsync<ResponseDetail<object>>(
                        "SystemCoreApi",
                 ApiEndpoints.GET_SYSTEM_CODES, // Changed from GET_SYSTEM_SEARCH to GET_SYSTEM_CODES
                       apiRequest);

                if (response?.ResponseCode == "00" && response.Details != null)
                {
                    // Parse response - system codes can be in Details, Details01, or nested structure
                    var detailsJson = JsonSerializer.Serialize(response.Details);

                    // Try to deserialize as list directly
                    try
                    {
                        var directList = JsonSerializer.Deserialize<List<SystemCodeDetail>>(detailsJson, new JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        });

                        if (directList != null && directList.Count > 0)
                        {
                            _logger.LogInformation("[ApiCachedService] Successfully fetched {Count} system codes from API (direct) - CodeID: {CodeID}",
                                     directList.Count, codeId);
                            return directList;
                        }
                    }
                    catch
                    {
                        // If direct deserialization fails, try nested structure
                    }

                    // Try nested structure (Details.Details01 or similar)
                    try
                    {
                        var nestedResponse = JsonSerializer.Deserialize<JsonDocument>(detailsJson);
                        if (nestedResponse != null)
                        {
                            // Try different property names for nested data
                            var possiblePaths = new[] { "Details01", "Details", "Data", "data", "details" };
                            foreach (var path in possiblePaths)
                            {
                                if (nestedResponse.RootElement.TryGetProperty(path, out var nestedArray))
                                {
                                    var systemCodes = JsonSerializer.Deserialize<List<SystemCodeDetail>>(
                                     nestedArray.GetRawText(),
                                     new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                                    if (systemCodes != null && systemCodes.Count > 0)
                                    {
                                        _logger.LogInformation("[ApiCachedService] Successfully fetched {Count} system codes from API (nested.{Path}) - CodeID: {CodeID}",
                                        systemCodes.Count, path, codeId);
                                        return systemCodes;
                                    }
                                }
                            }
                        }
                    }
                    catch
                    {
                        // If nested parsing fails, continue
                    }

                    _logger.LogWarning("[ApiCachedService] API returned data but could not parse system codes - CodeID: {CodeID}", codeId);
                    return new List<SystemCodeDetail>();
                }

                _logger.LogWarning("[ApiCachedService] API returned unsuccessful response for system codes - Code: {ResponseCode}",
                  response?.ResponseCode ?? "NULL");
                return new List<SystemCodeDetail>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ApiCachedService] Error fetching system codes from API for CodeID: {CodeID}", codeId);
                throw;
            }
        }

        /// <summary>
        /// Fetches multiple system code options with caching
        /// Batch loads multiple system codes at once - useful for views with multiple dropdowns
        /// </summary>
        public async Task<Dictionary<string, List<SystemCodeDetail>>> GetMultipleSystemCodeOptionsAsync(string[] codeIds, bool forceRefresh = false)
        {
            try
            {
                var result = new Dictionary<string, List<SystemCodeDetail>>();

                if (codeIds == null || codeIds.Length == 0)
                {
                    return result;
                }

                _logger.LogInformation("[ApiCachedService] Fetching multiple system code options - CodeIDs: {CodeIDs}, ForceRefresh: {ForceRefresh}",
                     string.Join(",", codeIds), forceRefresh);

                // Fetch all codes in parallel
                var tasks = codeIds.Select(codeId => GetSystemCodeOptionsAsync(codeId, forceRefresh)).ToList();
                var responses = await Task.WhenAll(tasks);

                // Map results by code ID
                for (int i = 0; i < codeIds.Length; i++)
                {
                    result[codeIds[i]] = responses[i];
                }

                _logger.LogInformation("[ApiCachedService] Retrieved system codes for {Count} code IDs", result.Count);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ApiCachedService] Error fetching multiple system code options");
                return new Dictionary<string, List<SystemCodeDetail>>();
            }
        }

        /// <summary>
        /// Fetches multiple system code options with caching and formats them as SelectListItem for dropdown binding
        /// Returns data in ASP.NET Core standard SelectListItem format for easy Razor view dropdown binding
        /// </summary>
        /// <summary>
        /// Fetches multiple system code options with caching and formats them as SelectListItem for dropdown binding
        /// Returns data in ASP.NET Core standard SelectListItem format for easy Razor view dropdown binding
        /// Includes a default "Select..." option as the first item for better UX
        /// </summary>
        public async Task<Dictionary<string, IEnumerable<SelectListItem>>> GetMultipleDropdownCodeOptionsAsync(string[] codeIds, bool forceRefresh = false)
        {
            try
            {
                _logger.LogInformation("[ApiCachedService] Fetching multiple dropdown code options - CodeIDs: {CodeIDs}, ForceRefresh: {ForceRefresh}",
                    string.Join(",", codeIds), forceRefresh);

                // Fetch all codes in parallel
                var tasks = codeIds.Select(codeId => GetSystemCodeOptionsAsync(codeId, forceRefresh)).ToList();
                var responses = await Task.WhenAll(tasks);

                // Transform to SelectListItem format with default option prepended
                var result = new Dictionary<string, IEnumerable<SelectListItem>>();

                // Create default "Select..." option
                var defaultOption = new SelectListItem
                {
                    Value = "",
                    Text = "Select..."
                };
                // Map results by code ID
                for (int i = 0; i < codeIds.Length; i++)
                {

                    // Transform system codes to SelectListItem
                    var codeOptions = responses[i]
                        .Where(code => code.IsActive)
                        .OrderBy(code => code.DisplayOrder)
                        .Select(code => new SelectListItem
                        {
                            Value = code.SubCodeID,
                            Text = code.CodeDescription ?? code.SubCodeID
                        })
                        .ToList();

                    // Prepend default option
                    codeOptions.Insert(0, defaultOption);

                    result[codeIds[i]] = codeOptions;
                }

                _logger.LogInformation("[ApiCachedService] Formatted {Count} dropdown code options as SelectListItem with default option", result.Count);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ApiCachedService] Error fetching multiple dropdown code options");
                return new Dictionary<string, IEnumerable<SelectListItem>>();
            }
        }

    }
}
