using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.Shared
{
    [Route("Statement")]
    public class StatementViewController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly IConfiguration _config;
        private readonly ILogger<StatementViewController> _logger;

        public StatementViewController(
            IAuthService authService,
            IApiService apiService,
            IConfiguration configuration,
            ILogger<StatementViewController> logger)
        {
            _authService = authService;
            _apiService = apiService;
            _config = configuration;
            _logger = logger;
        }

        [Route("Index")]
        public IActionResult Index(string? moduleId, string? branchId, string? accountId)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated access attempt to Statement View");
                    return RedirectToAction("Index", "Login");
                }

                _logger.LogInformation("Statement View loaded successfully with ModuleID: {ModuleID}, BranchID: {BranchID}, AccountID: {AccountID}", moduleId, branchId, accountId);

                // Store parameters in ViewBag to be used by JavaScript
                ViewBag.ModuleID = moduleId;
                ViewBag.BranchID = branchId;
                ViewBag.AccountID = accountId;

                return PartialView("~/Views/Shared/_StatementView.cshtml");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Statement View");
                return RedirectToAction("Index", "Dashboard");
            }
        }

        [HttpPost]
        [Route("get-transactions")]
        public async Task<IActionResult> GetAccountTransactions([FromBody] StatementRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated Statement transactions request");
                    return Unauthorized(new
                    {
                        Success = false,
                        ErrorMessage = "User is not authenticated"
                    });
                }

                if (requestData == null)
                {
                    return BadRequest(new
                    {
                        Success = false,
                        ErrorMessage = "Request data is required"
                    });
                }

                EnsureStatementDefaults(requestData);

                _logger.LogInformation("Statement transactions request: {Request}", JsonSerializer.Serialize(requestData));

                var response = await _apiService.CreateAsync<JsonElement>("ClientManagementApi", ApiEndpoints.GET_ACCOUNT_TRANSACTIONS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching account transactions");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error fetching transactions: {ex.Message}"
                });
            }
        }

        [HttpPost]
        [Route("get-batch-details")]
        public async Task<IActionResult> GetBatchTransactionsList([FromBody] BatchDetailsRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated Statement batch details request");
                    return Unauthorized(new
                    {
                        Success = false,
                        ErrorMessage = "User is not authenticated"
                    });
                }

                if (requestData == null)
                {
                    return BadRequest(new
                    {
                        Success = false,
                        ErrorMessage = "Request data is required"
                    });
                }

                EnsureBatchDetailsDefaults(requestData);

                _logger.LogInformation("Statement batch details request: {Request}", JsonSerializer.Serialize(requestData));

                var response = await _apiService.CreateAsync<JsonElement>("ClientManagementApi", ApiEndpoints.GET_BATCH_TRANSACTIONS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching batch transaction details");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error fetching batch details: {ex.Message}"
                });
            }
        }

        private void EnsureStatementDefaults(StatementRequest requestData)
        {
            if (string.IsNullOrWhiteSpace(requestData.OperatorID))
            {
                requestData.OperatorID = ResolveSessionValue("user_name", "user_id") ?? "web_portal";
            }

            if (string.IsNullOrWhiteSpace(requestData.OurBranchID))
            {
                requestData.OurBranchID = requestData.OurBranchID ?? ResolveSessionValue("branch_code", "branch_id") ?? string.Empty;
            }
        }

        private void EnsureBatchDetailsDefaults(BatchDetailsRequest requestData)
        {
            if (string.IsNullOrWhiteSpace(requestData.OperatorID))
            {
                requestData.OperatorID = ResolveSessionValue("user_name", "user_id") ?? "web_portal";
            }

            if (string.IsNullOrWhiteSpace(requestData.OurBranchID))
            {
                requestData.OurBranchID = ResolveSessionValue("branch_code", "branch_id") ?? string.Empty;
            }
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

    public class StatementRequest
    {
        public string? OurBranchID { get; set; }
        public string? AccountID { get; set; }
        public string? FromDate { get; set; }
        public string? ToDate { get; set; }
        public string? OperatorID { get; set; }
    }

    public class BatchDetailsRequest
    {
        public string? OurBranchID { get; set; }
        public string? BatchID { get; set; }
        public int ModuleID { get; set; } = 1500;
        public string? TrxDate { get; set; }
        public string? TrxRowID { get; set; }
        public string? OperatorID { get; set; }
    }
}
