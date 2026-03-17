using CBS.Entities.Common;
using CBS.Entities.SystemCore;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData/BankParameters")]
    public class BankParametersController : StaticDataModuleControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<BankParametersController> _logger;

        public BankParametersController(
            IAuthService authService,
            IApiService apiService,
            IApiCachedService apiCachedService,
            ILogger<BankParametersController> logger)
            : base(authService, logger)
        {
            _authService = authService;
            _apiService = apiService;
            _apiCachedService = apiCachedService;
            _logger = logger;
        }

        [HttpGet("")]
        [HttpGet("Index")]
        public IActionResult Index()
        {
            return RenderModuleView("BankParameters");
        }

        [HttpGet("get")]
        public async Task<IActionResult> Get(bool forceRefresh = false)
        {
            if (!_authService.IsAuthenticated())
            {
                return Unauthorized(new { success = false, message = "User is not authenticated." });
            }

            try
            {
                var settings = await _apiCachedService.GetSystemBankSettingsAsync(forceRefresh);
                settings ??= await FetchSystemBankSettingsDirectAsync();
                if (settings == null)
                {
                    return Ok(new
                    {
                        success = true,
                        data = new SystemBankSetting
                        {
                            BankID = "00",
                            BankName = HttpContext.Session.GetString("bank_name") ?? string.Empty
                        },
                        isEmpty = true,
                        message = "Bank settings were not found. Default values loaded."
                    });
                }

                return Ok(new { success = true, data = settings });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching bank parameters");
                return StatusCode(500, new { success = false, message = "Failed to fetch bank settings." });
            }
        }

        private async Task<SystemBankSetting?> FetchSystemBankSettingsDirectAsync()
        {
            var branchCode = HttpContext.Session.GetString("branch_code") ?? string.Empty;
            var operatorId = HttpContext.Session.GetString("user_name") ?? string.Empty;

            if (string.IsNullOrWhiteSpace(operatorId))
            {
                _logger.LogWarning("Bank settings direct fetch skipped because operator session value is missing.");
                return null;
            }

            var request = new
            {
                RequestID = HttpContext.Connection.Id,
                BankID = "00",
                OurBranchID = branchCode,
                OperatorID = operatorId
            };

            var response = await _apiService.CreateAsync<ResponseDetail<JsonDocument>>(
                "SystemCoreApi",
                ApiEndpoints.GET_SYSTEMBANKSETTINGS,
                request);

            if (response?.Details == null)
            {
                _logger.LogWarning("Bank settings direct fetch returned no details. ResponseCode: {ResponseCode}", response?.ResponseCode ?? "NULL");
                return null;
            }

            if (!response.Details.RootElement.TryGetProperty("SystemBankSettingData", out var settingsData))
            {
                _logger.LogWarning("Bank settings direct fetch response did not contain SystemBankSettingData.");
                return null;
            }

            var settings = JsonSerializer.Deserialize<SystemBankSetting>(settingsData.GetRawText(), new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (!string.IsNullOrWhiteSpace(settings?.BankName))
            {
                HttpContext.Session.SetString("bank_name", settings.BankName);
            }

            return settings;
        }

        [HttpPost("save")]
        public async Task<IActionResult> Save([FromBody] SystemBankSetting requestData)
        {
            if (!_authService.IsAuthenticated())
            {
                return Unauthorized(new { success = false, message = "User is not authenticated." });
            }

            if (requestData == null)
            {
                return BadRequest(new { success = false, message = "Bank settings payload is required." });
            }

            try
            {
                var existing = await _apiCachedService.GetSystemBankSettingsAsync();
                var operatorId = HttpContext.Session.GetString("user_name") ?? "SYSTEM";
                var branchCode = HttpContext.Session.GetString("branch_code") ?? string.Empty;
                var now = DateTime.UtcNow;

                requestData.BankID = string.IsNullOrWhiteSpace(requestData.BankID)
                    ? existing?.BankID ?? "00"
                    : requestData.BankID;

                requestData.CreatedBy = string.IsNullOrWhiteSpace(requestData.CreatedBy)
                    ? existing?.CreatedBy ?? operatorId
                    : requestData.CreatedBy;
                requestData.CreatedOn ??= existing?.CreatedOn ?? now;
                requestData.ModifiedBy = operatorId;
                requestData.ModifiedOn = now;
                requestData.SupervisedBy ??= existing?.SupervisedBy;
                requestData.SupervisedOn ??= existing?.SupervisedOn;

                var endpoint = existing == null
                    ? ApiEndpoints.CREATE_SYSTEMBANKSETTINGS
                    : ApiEndpoints.UPDATE_SYSTEMBANKSETTINGS;

                var response = await _apiService.CreateAsync<ResponseDetail<object>>(
                    "SystemCoreApi",
                    endpoint,
                    new
                    {
                        RequestID = HttpContext.Connection.Id,
                        BankID = requestData.BankID,
                        OurBranchID = branchCode,
                        OperatorID = operatorId,
                        SystemBankSettingData = requestData
                    });

                await _apiCachedService.InvalidateSystemBankSettingsAsync();

                var success = string.Equals(response?.ResponseCode, "00", StringComparison.OrdinalIgnoreCase);
                return Ok(new
                {
                    success,
                    message = response?.ResponseMessage ?? (success ? "Bank settings saved." : "Save failed."),
                    response
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving bank parameters");
                return StatusCode(500, new { success = false, message = "Failed to save bank settings." });
            }
        }
    }
}