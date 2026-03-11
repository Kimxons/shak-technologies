using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.MicroFinance
{
    [Route("MicroFinance/ExitProcess")]
    public class ExitProcessController : Controller
    {
        private const string MicroFinanceApiName = "MicroFinanceApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IConfiguration _config;
        private readonly ILogger<ExitProcessController> _logger;

        public ExitProcessController(
            IAuthService authService,
            IOldApiService oldApiService,
            IConfiguration configuration,
            ILogger<ExitProcessController> logger)
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
                _logger.LogWarning("Unauthenticated access attempt to Exit Process");
                return RedirectToAction("Index", "Login");
            }

            // Fetch session values for authenticated user
            var userName = HttpContext.Session.GetString("user_name");
            var branchCode = HttpContext.Session.GetString("branch_code");
            ViewBag.UserName = userName;
            ViewBag.BranchCode = branchCode;

            _logger.LogInformation("Exit Process loaded successfully");
            return PartialView("~/Views/MicroFinance/ExitProcess.cshtml");
        }

        // ═════════════════════════════════════════════════════════════════
        // OLD API - Generic endpoint for OldAPI calls
        // ═════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("old-api")]
        public async Task<IActionResult> PostOldApi([FromBody] ExitProcessOldApiRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated Exit Process OldAPI attempt");
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

                _logger.LogInformation("Exit Process OldAPI request for {FormId}: {Request}",
                    request.FormId, JsonSerializer.Serialize(envelope));

                var response = await _oldApiService.PostRawAsync<JsonElement>(
                    MicroFinanceApiName, envelope);

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Exit Process OldAPI request");
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

            var result = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

            if (requestData.ValueKind == JsonValueKind.Object)
            {
                foreach (var property in requestData.EnumerateObject())
                {
                    result[property.Name] = UnwrapJsonElement(property.Value);
                }
            }

            return result;
        }

        private static object? UnwrapJsonElement(JsonElement element)
        {
            return element.ValueKind switch
            {
                JsonValueKind.String => element.GetString(),
                JsonValueKind.Number => element.TryGetInt64(out long l) ? l :
                                       element.TryGetDouble(out double d) ? d :
                                       element.GetDecimal(),
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Null => null,
                JsonValueKind.Array => element.EnumerateArray().Select(UnwrapJsonElement).ToArray(),
                JsonValueKind.Object => element.EnumerateObject()
                    .ToDictionary(p => p.Name, p => UnwrapJsonElement(p.Value), StringComparer.OrdinalIgnoreCase),
                _ => element.GetRawText()
            };
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

    public class ExitProcessOldApiRequest
    {
        public string? FormId { get; set; }
        public JsonElement RequestData { get; set; }
    }
}
