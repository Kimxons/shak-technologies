using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.MicroFinance
{
    [Route("MicroFinance/SavingsRefund")]
    public class SavingsRefundController : Controller
    {
        private const string MicroFinanceApiName = "MicroFinanceApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IConfiguration _config;
        private readonly ILogger<SavingsRefundController> _logger;

        public SavingsRefundController(
            IAuthService authService,
            IOldApiService oldApiService,
            IConfiguration configuration,
            ILogger<SavingsRefundController> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _config = configuration;
            _logger = logger;
        }

        // ═════════════════════════════════════════════════════════════════
        // INDEX - Entry point from dashboard
        // ═════════════════════════════════════════════════════════════════

        [HttpGet]
        [Route("")]
        [Route("Index")]
        public IActionResult Index()
        {
            if (!_authService.IsAuthenticated())
            {
                _logger.LogWarning("Unauthenticated access attempt to Savings Refund");
                return RedirectToAction("Index", "Login");
            }

            _logger.LogInformation("Savings Refund loaded successfully");
            return PartialView("~/Views/MicroFinance/SavingsRefund.cshtml");
        }

        // ═════════════════════════════════════════════════════════════════
        // OLD API - Generic endpoint for OldAPI calls
        // ═════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("old-api")]
        public async Task<IActionResult> PostOldApi([FromBody] SavingsRefundOldApiRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated Savings Refund OldAPI attempt");
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

                _logger.LogInformation("Savings Refund OldAPI request for {FormId}: {Request}",
                    request.FormId, JsonSerializer.Serialize(envelope));

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    MicroFinanceApiName, "OldAPI", envelope);

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Savings Refund OldAPI request");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error processing request: {ex.Message}"
                });
            }
        }

        // ═════════════════════════════════════════════════════════════════
        // HELPERS
        // ═════════════════════════════════════════════════════════════════

        private object BuildOldApiEnvelope(string formId, JsonElement requestData)
        {
            var cleanFormId = formId.StartsWith("dbo.", StringComparison.OrdinalIgnoreCase)
                ? formId
                : $"dbo.{formId}";

            var requestDictionary = DeserializeRequestData(requestData);
            EnsureDefaults(requestDictionary);

            return new
            {
                RequestID = cleanFormId,
                FormId = cleanFormId,
                RequestData = requestDictionary,
                RequestTime = DateTime.Now.ToString("MM/dd/yyyy HH:mm:ss",
                    System.Globalization.CultureInfo.InvariantCulture),
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

            var dictionary = JsonSerializer.Deserialize<Dictionary<string, object?>>(
                requestData.GetRawText(), new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }) ?? new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

            return new Dictionary<string, object?>(dictionary, StringComparer.OrdinalIgnoreCase);
        }

        private void EnsureDefaults(IDictionary<string, object?> requestData)
        {
            SetIfMissing(requestData, "OperatorID",
                ResolveSessionValue("user_name", "user_id") ?? "web_portal");
            SetIfMissing(requestData, "OurBranchID",
                ResolveSessionValue("branch_code", "branch_id") ?? string.Empty);
            SetIfMissing(requestData, "BankID",
                ResolveSessionValue("bank_id", "bank_code") ?? "00");
        }

        private static void SetIfMissing(IDictionary<string, object?> requestData, string key, string value)
        {
            if (!requestData.TryGetValue(key, out var existing) ||
                string.IsNullOrWhiteSpace(Convert.ToString(existing)))
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

    // ═════════════════════════════════════════════════════════════════
    // DTOs
    // ═════════════════════════════════════════════════════════════════

    public class SavingsRefundOldApiRequest
    {
        public string? FormId { get; set; }
        public JsonElement RequestData { get; set; }
    }
}
