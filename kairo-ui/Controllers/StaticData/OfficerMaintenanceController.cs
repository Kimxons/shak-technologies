using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData/OfficerMaintenance")]
    [Route("StaticData/AccountOfficers")]
    [Route("MicroFinance/AccountOfficers")]
    public class OfficerMaintenanceController : StaticDataModuleControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ICommonUtilitiesService _commonUtilities;
        private readonly ILogger<OfficerMaintenanceController> _logger;

        public OfficerMaintenanceController(
            IAuthService authService,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            ICommonUtilitiesService commonUtilities,
            ILogger<OfficerMaintenanceController> logger)
            : base(authService, logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _apiCachedService = apiCachedService;
            _commonUtilities = commonUtilities;
            _logger = logger;
        }

        [HttpGet("")]
        [HttpGet("Index")]
        public IActionResult Index()
        {
            return RenderModuleView("OfficerMaintenance");
        }

        [HttpPost("api/system-codes")]
        public async Task<IActionResult> GetSystemCodes([FromBody] JsonElement request)
        {
            if (!_authService.IsAuthenticated())
            {
                return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });
            }

            try
            {
                var codeId = ReadString(request, "CodeID", "CodeId");
                if (string.IsNullOrWhiteSpace(codeId))
                {
                    return BadRequest(new { Success = false, ErrorMessage = "CodeID is required" });
                }

                var options = await _apiCachedService.GetSystemCodeOptionsAsync(codeId, false);
                return Ok(new { Success = true, Data = options });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting system codes for Officer Maintenance");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost("api/get")]
        public async Task<IActionResult> GetOfficer([FromBody] JsonElement request)
        {
            return await ExecuteOldApiAsync(OldApiDBConstants.GET_ACCOUNT_OFFICERS, request, includeDefaults: true);
        }

        [HttpPost("api/branch-details")]
        public async Task<IActionResult> GetOfficerBranchDetails([FromBody] JsonElement request)
        {
            return await ExecuteOldApiAsync(OldApiDBConstants.GETACCOUNTOFFICERDETAILS, request, includeDefaults: true);
        }

        [HttpPost("api/save")]
        public async Task<IActionResult> SaveOfficer([FromBody] JsonElement request)
        {
            return await ExecuteOldApiAsync(OldApiDBConstants.ADD_EDIT_ACCOUNT_OFFICERS, request, includeDefaults: true);
        }

        [HttpPost("api/save-branch-details")]
        public async Task<IActionResult> SaveOfficerBranchDetails([FromBody] JsonElement request)
        {
            return await ExecuteOldApiAsync(OldApiDBConstants.ADD_EDIT_ACCOUNT_OFFICER_DETAIL, request, includeDefaults: true);
        }

        [HttpPost("api/delete")]
        public async Task<IActionResult> DeleteOfficer([FromBody] JsonElement request)
        {
            return await ExecuteOldApiAsync(OldApiDBConstants.DELETE_ACCOUNT_OFFICERS, request, includeDefaults: true);
        }

        [HttpPost("api/resign")]
        public async Task<IActionResult> ResignOfficer([FromBody] JsonElement request)
        {
            return await ExecuteOldApiAsync(OldApiDBConstants.RESIGN_ACCOUNT_OFFICERS, request, includeDefaults: true);
        }

        private async Task<IActionResult> ExecuteOldApiAsync(string formId, JsonElement request, bool includeDefaults)
        {
            if (!_authService.IsAuthenticated())
            {
                return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });
            }

            try
            {
                var payload = request.ValueKind == JsonValueKind.Object
                    ? JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>()
                    : new Dictionary<string, object>();

                if (includeDefaults)
                {
                    ApplySessionDefaults(payload);
                }

                var result = await _oldApiService.CreateAsync<JsonElement>("OldApi", formId, payload);
                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing OldApi procedure {FormId} for Officer Maintenance", formId);
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        private void ApplySessionDefaults(Dictionary<string, object> payload)
        {
            var operatorId = _commonUtilities.ResolveSessionValue("user_name", "user_id") ?? "web_portal";
            var branchId = _commonUtilities.ResolveSessionValue("branch_code", "branch_id") ?? string.Empty;
            var bankId = _commonUtilities.ResolveSessionValue("bank_id", "bank_code") ?? "00";

            if (!payload.ContainsKey("OperatorID") || string.IsNullOrWhiteSpace(payload["OperatorID"]?.ToString()))
            {
                payload["OperatorID"] = operatorId;
            }

            if (!payload.ContainsKey("OurBranchID") || string.IsNullOrWhiteSpace(payload["OurBranchID"]?.ToString()))
            {
                payload["OurBranchID"] = branchId;
            }

            if (!payload.ContainsKey("BankID") || string.IsNullOrWhiteSpace(payload["BankID"]?.ToString()))
            {
                payload["BankID"] = bankId;
            }
        }

        private static string? ReadString(JsonElement element, params string[] names)
        {
            if (element.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            foreach (var property in element.EnumerateObject())
            {
                foreach (var name in names)
                {
                    if (!string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (property.Value.ValueKind == JsonValueKind.String)
                    {
                        return property.Value.GetString();
                    }

                    if (property.Value.ValueKind != JsonValueKind.Null && property.Value.ValueKind != JsonValueKind.Undefined)
                    {
                        return property.Value.ToString();
                    }
                }
            }

            return null;
        }
    }
}