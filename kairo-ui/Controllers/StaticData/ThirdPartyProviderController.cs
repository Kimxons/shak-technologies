using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData/ThirdPartyProvider")]
    public class ThirdPartyProviderController : StaticDataModuleControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly ILogger<ThirdPartyProviderController> _logger;

        public ThirdPartyProviderController(
            IAuthService authService,
            IOldApiService oldApiService,
            ILogger<ThirdPartyProviderController> logger)
            : base(authService, logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _logger = logger;
        }

        [HttpGet("")]
        [HttpGet("Index")]
        public IActionResult Index()
        {
            return RenderModuleView("ThirdPartyProvider");
        }

        [HttpPost("api/get-third-party-provider")]
        public async Task<IActionResult> GetThirdPartyProvider([FromBody] JsonElement request)
        {
            return await ExecuteOldApiRequest(OldApiDBConstants.GET_THIRD_PARTY_PROVIDER, request, "Error loading Third Party Provider");
        }

        [HttpPost("api/save-third-party-provider")]
        public async Task<IActionResult> SaveThirdPartyProvider([FromBody] JsonElement request)
        {
            return await ExecuteOldApiRequest(OldApiDBConstants.ADD_EDIT_THIRD_PARTY_PROVIDER, request, "Error saving Third Party Provider");
        }

        [HttpPost("api/delete-third-party-provider")]
        public async Task<IActionResult> DeleteThirdPartyProvider([FromBody] JsonElement request)
        {
            return await ExecuteOldApiRequest(OldApiDBConstants.DELETE_THIRD_PARTY_PROVIDER, request, "Error deleting Third Party Provider");
        }

        [HttpPost("api/search-third-party-provider")]
        public async Task<IActionResult> SearchThirdPartyProvider([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });
                }

                var searchKey = string.Empty;
                if (request.ValueKind == JsonValueKind.Object && request.TryGetProperty("SearchKey", out var searchKeyElement))
                {
                    searchKey = searchKeyElement.GetString() ?? string.Empty;
                }

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_THIRD_PARTY_PROVIDER,
                    new { ID = string.Empty });

                var rows = ExtractRows(result)
                    .Where(row => MatchesSearch(row, searchKey))
                    .ToList();

                return Ok(new
                {
                    Success = true,
                    Data = new
                    {
                        Details = rows
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching Third Party Provider");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        private async Task<IActionResult> ExecuteOldApiRequest(string procedure, JsonElement request, string errorMessage)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });
                }

                var payload = request.ValueKind == JsonValueKind.Object
                    ? JsonSerializer.Deserialize<Dictionary<string, object?>>(request.GetRawText()) ?? new Dictionary<string, object?>()
                    : new Dictionary<string, object?>();

                var result = await _oldApiService.CreateAsync<JsonElement>("OldApi", procedure, payload);
                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, errorMessage);
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
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

        private static bool MatchesSearch(JsonElement row, string searchKey)
        {
            if (string.IsNullOrWhiteSpace(searchKey))
            {
                return true;
            }

            var term = searchKey.Trim();
            var serviceProvider = GetString(row, "ServiceProvider");
            var description = GetString(row, "Description");
            var id = GetString(row, "ID");
            var systemSubId = GetString(row, "SystemSubID");

            return serviceProvider.Contains(term, StringComparison.OrdinalIgnoreCase)
                || description.Contains(term, StringComparison.OrdinalIgnoreCase)
                || id.Contains(term, StringComparison.OrdinalIgnoreCase)
                || systemSubId.Contains(term, StringComparison.OrdinalIgnoreCase);
        }

        private static string GetString(JsonElement row, string key)
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
    }
}