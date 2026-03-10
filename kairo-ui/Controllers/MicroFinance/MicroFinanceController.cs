using kairo_ui.Models.MicroFinance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using System.Text.Json;

namespace kairo_ui.Controllers.MicroFinance
{
    [Route("MicroFinance")]
    public class MicroFinanceController : Controller
    {
        private const string MicroFinanceApiName = "MicroFinanceApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IConfiguration _config;
        private readonly ILogger<MicroFinanceController> _logger;

        public MicroFinanceController(
            IAuthService authService,
            IOldApiService oldApiService,
            IConfiguration configuration,
            ILogger<MicroFinanceController> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _config = configuration;
            _logger = logger;
        }

        [HttpPost]
        [Route("group-loan-schemes")]
        public async Task<IActionResult> GetGroupLoanSchemes([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated Microfinance group loan schemes attempt");
                    return Unauthorized(new
                    {
                        Success = false,
                        ErrorMessage = "User is not authenticated"
                    });
                }
                
                var response = await _oldApiService.CreateAsync<JsonElement>(MicroFinanceApiName, OldApiDBConstants.GET_GROUP_LOAN_SCHEMES, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching Microfinance group loan schemes");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error processing microfinance request: {ex.Message}"
                });
            }
        }

        [Route("Index")]
        public IActionResult Index()
        {
            return RedirectToAction(nameof(GroupLoanScheme));
        }

        [Route("GroupLoanScheme")]
        public IActionResult GroupLoanScheme()
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated access attempt to Microfinance Group Loan Scheme");
                    return RedirectToAction("Index", "Login");
                }

                _logger.LogInformation("Microfinance Group Loan Scheme loaded successfully");
                return PartialView("~/Views/MicroFinance/GroupLoanScheme.cshtml");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Microfinance Group Loan Scheme");
                return RedirectToAction("Index", "Dashboard");
            }
        }

        [Route("GroupMaintenance")]
        [Route("Groups")]
        public IActionResult GroupMaintenance()
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated access attempt to Microfinance Group Maintenance");
                    return RedirectToAction("Index", "Login");
                }

                _logger.LogInformation("Microfinance Group Maintenance loaded successfully");
                return PartialView("~/Views/MicroFinance/GroupMaintenance.cshtml");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Microfinance Group Maintenance");
                return RedirectToAction("Index", "Dashboard");
            }
        }

        [HttpPost]
        [Route("old-api")]
        public async Task<IActionResult> PostOldApi([FromBody] MicroFinanceOldApiRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated Microfinance OldAPI attempt");
                    return Unauthorized(new
                    {
                        Success = false,
                        ErrorMessage = "User is not authenticated"
                    });
                }

                if (request == null || string.IsNullOrWhiteSpace(request.FormId))
                {
                    return BadRequest(new
                    {
                        Success = false,
                        ErrorMessage = "FormId and request data are required"
                    });
                }

                var envelope = BuildOldApiEnvelope(request.FormId!, request.RequestData);

                _logger.LogInformation("Microfinance OldAPI request for {FormId}: {Request}", request.FormId, JsonSerializer.Serialize(envelope));

                var response = await _oldApiService.CreateAsync<JsonElement>(MicroFinanceApiName, "OldAPI", envelope);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Microfinance OldAPI request");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error processing microfinance request: {ex.Message}"
                });
            }
        }

        private object BuildOldApiEnvelope(string formId, JsonElement requestData)
        {
            var cleanFormId = formId.StartsWith("dbo.", StringComparison.OrdinalIgnoreCase)
                ? formId
                : $"dbo.{formId}";

            var requestDictionary = DeserializeRequestData(requestData);
            EnsureMicroFinanceDefaults(requestDictionary);

            return new
            {
                RequestID = cleanFormId,
                FormId = cleanFormId,
                RequestData = requestDictionary,
                RequestTime = DateTime.Now.ToString("MM/dd/yyyy HH:mm:ss", CultureInfo.InvariantCulture),
                AppName = ResolveOldApiAppName(),
                Checksum = string.Empty
            };
        }

        private Dictionary<string, object?> DeserializeRequestData(JsonElement requestData)
        {
            if (requestData.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
            {
                return new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            }

            var dictionary = JsonSerializer.Deserialize<Dictionary<string, object?>>(requestData.GetRawText(), new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

            return new Dictionary<string, object?>(dictionary, StringComparer.OrdinalIgnoreCase);
        }

        private void EnsureMicroFinanceDefaults(IDictionary<string, object?> requestData)
        {
            SetIfMissing(requestData, "OperatorID", ResolveSessionValue("user_name", "user_id") ?? "web_portal");
            SetIfMissing(requestData, "OurBranchID", ResolveSessionValue("branch_code", "branch_id") ?? string.Empty);
            SetIfMissing(requestData, "BankID", ResolveSessionValue("bank_id", "bank_code") ?? "00");
        }

        private void SetIfMissing(IDictionary<string, object?> requestData, string key, string value)
        {
            if (!requestData.TryGetValue(key, out var existing) || string.IsNullOrWhiteSpace(Convert.ToString(existing)))
            {
                requestData[key] = value;
            }
        }

        private string ResolveOldApiAppName()
        {
            return _config["ApiSettings:OldApiAppName"]
                ?? _config["ApiSettings:AppName"]
                ?? "PROJECT_KAIRO";
        }

        private string? ResolveSessionValue(params string[] keys)
        {
            foreach (var key in keys)
            {
                var value = HttpContext.Session.GetString(key);
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }

            return null;
        }
    }
}