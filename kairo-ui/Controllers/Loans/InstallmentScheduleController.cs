using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.Loans
{
    /// <summary>
    /// Installment Schedule View Controller
    /// 
    /// Migration Pattern: Read-only view module for loan installment schedules
    /// - Loads installment data from legacy API
    /// - Displays in tabular format
    /// - No edit/create/delete operations
    /// </summary>
    [Route("Loans/InstallmentSchedule")]
    public class InstallmentScheduleController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly ILogger<InstallmentScheduleController> _logger;

        public InstallmentScheduleController(
            IAuthService authService,
            IOldApiService oldApiService,
            ILogger<InstallmentScheduleController> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _logger = logger;
        }

        /// <summary>
        /// GET: Loads Installment Schedule view
        /// 
        /// Parameters (can come from query string, parent context, or session):
        /// - moduleId: Module identifier (from parent form context)
        /// - entityId: Entity identifier (from parent form context)
        /// - requestId: Request identifier (from parent form context)
        /// </summary>
        [HttpGet]
        [Route("Index")]
        public async Task<IActionResult> Index(string? moduleId = null, string? entityId = null, string? requestId = null)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return RedirectToAction("Index", "Login");

                // Pass context to view (populated from parent Loan Maintenance form)
                ViewData["ModuleId"] = moduleId ?? string.Empty;
                ViewData["EntityId"] = entityId ?? string.Empty;
                ViewData["RequestId"] = requestId ?? string.Empty;

                _logger.LogInformation("[InstallmentSchedule] Index loaded. ModuleId: {ModuleId}, EntityId: {EntityId}", moduleId, entityId);

                return View("InstallmentSchedule");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[InstallmentSchedule] Error in Index");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// POST: get
        /// 
        /// Fetches installment schedule data for a specific loan
        /// 
        /// Request Format:
        /// {
        ///   "OurBranchID": "01",
        ///   "AccountID": "1000001",
        ///   "LoanSeries": 1
        /// }
        /// </summary>
        [HttpPost]
        [Route("get")]
        public async Task<IActionResult> Get([FromBody] GetInstallmentsRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (string.IsNullOrWhiteSpace(request?.OurBranchID) || 
                    string.IsNullOrWhiteSpace(request?.AccountID) || 
                    request?.LoanSeries == null)
                {
                    return BadRequest(new { success = false, message = "Required parameters missing" });
                }

                _logger.LogInformation(
                    "[InstallmentSchedule] Fetching installments for Branch: {Branch}, Account: {Account}, Series: {Series}",
                    request.OurBranchID,
                    request.AccountID,
                    request.LoanSeries);

                // Call Old API to fetch installment schedule
                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApiName",
                    OldApiDBConstants.GETLOANINSTALLMENTS,
                    request
                );

                if (result.ValueKind == JsonValueKind.Undefined)
                {
                    return Ok(new { success = false, message = "No schedule found" });
                }

                // Check success response
                if (IsOldApiSuccess(result))
                {
                    // Extract the Details array from response
                    var details = ExtractDetails(result);
                    _logger.LogInformation("[InstallmentSchedule] Successfully fetched {Count} installments", 
                        details?.Count() ?? 0);

                    return Ok(new { success = true, data = details });
                }
                else
                {
                    var errorMsg = ExtractErrorMessage(result);
                    _logger.LogWarning("[InstallmentSchedule] API Error: {Message}", errorMsg);
                    return Ok(new { success = false, message = errorMsg });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[InstallmentSchedule] Error in get");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // HELPER METHODS
        // ═══════════════════════════════════════════════════════════════════

        /// <summary>
        /// Check if Old API response indicates success
        /// </summary>
        private bool IsOldApiSuccess(JsonElement response)
        {
            if (response.ValueKind != JsonValueKind.Object)
                return false;

            // Check ResponseCode = "00"
            if (response.TryGetProperty("ResponseCode", out var code))
            {
                var codeStr = code.GetString() ?? string.Empty;
                return codeStr == "00" || codeStr == "0";
            }

            return false;
        }

        /// <summary>
        /// Extract Details array from Old API response
        /// Handles multiple response envelope formats
        /// </summary>
        private IEnumerable<object>? ExtractDetails(JsonElement response)
        {
            try
            {
                // Try Details property first (most common)
                if (response.TryGetProperty("Details", out var details))
                {
                    if (details.ValueKind == JsonValueKind.Array)
                        return details.EnumerateArray().Cast<object>();
                }

                // Try details (camelCase)
                if (response.TryGetProperty("details", out var detailsCamel))
                {
                    if (detailsCamel.ValueKind == JsonValueKind.Array)
                        return detailsCamel.EnumerateArray().Cast<object>();
                }

                // Return empty if no details found
                return Enumerable.Empty<object>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[InstallmentSchedule] Error extracting Details");
                return Enumerable.Empty<object>();
            }
        }

        /// <summary>
        /// Extract error message from Old API response
        /// </summary>
        private string ExtractErrorMessage(JsonElement response)
        {
            try
            {
                if (response.TryGetProperty("ResponseMessage", out var msg))
                    return msg.GetString() ?? "Unknown error";

                if (response.TryGetProperty("Message", out var msg2))
                    return msg2.GetString() ?? "Unknown error";

                return "Request failed";
            }
            catch
            {
                return "Unknown error";
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // REQUEST/RESPONSE DTOs
    // ═══════════════════════════════════════════════════════════════════

    public class GetInstallmentsRequest
    {
        public string? OurBranchID { get; set; }
        public string? AccountID { get; set; }
        public long? LoanSeries { get; set; }
    }
}
