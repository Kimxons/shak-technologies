using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.AccountsMaintenance
{
    [Route("AccountsMaintenance")]
    public class AccountsMaintenanceController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly IConfiguration _config;
        private readonly ILogger<AccountsMaintenanceController> _logger;

        public AccountsMaintenanceController(
            IAuthService authService,
            IApiService apiService,
            IConfiguration configuration,
            ILogger<AccountsMaintenanceController> logger)
        {
            _authService = authService;
            _apiService = apiService;
            _config = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Accounts Maintenance view - requires authentication
        /// </summary>
        [Route("Index")]
        public IActionResult Index()
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated access attempt to Accounts Maintenance");
                    return RedirectToAction("Index", "Login");
                }

                _logger.LogInformation("Accounts Maintenance loaded successfully");
                return PartialView();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Accounts Maintenance");
                return RedirectToAction("Index", "Dashboard");
            }
        }

        #region Submodule Partial Views

        /// <summary>
        /// Load Data Entry submodule
        /// </summary>
        [Route("DataEntry")]
        public IActionResult DataEntry()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            return PartialView("_DataEntry");
        }

        /// <summary>
        /// Load Documents submodule
        /// </summary>
        [Route("Documents")]
        public IActionResult Documents()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            return PartialView("Documents");
        }

        /// <summary>
        /// Load Signatories submodule
        /// </summary>
        [Route("Signatories")]
        public IActionResult Signatories()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            return PartialView("Signatories");
        }

        /// <summary>
        /// Load Account Sweeping submodule
        /// </summary>
        [Route("AccountSweeping")]
        public IActionResult AccountSweeping()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            return PartialView("AccountSweeping");
        }

        /// <summary>
        /// Load Nomination submodule
        /// </summary>
        [Route("Nomination")]
        public IActionResult Nomination()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            return PartialView("Nomination");
        }

        /// <summary>
        /// Load Closing submodule
        /// </summary>
        [Route("Closing")]
        public IActionResult Closing()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            return PartialView("Closing");
        }

        /// <summary>
        /// Load Charge Rates submodule
        /// </summary>
        [Route("ChargeRates")]
        public IActionResult ChargeRates()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            return PartialView("ChargeRates");
        }

        /// <summary>
        /// Load Blocking/Unblocking submodule
        /// </summary>
        [Route("Blocking")]
        public IActionResult Blocking()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            return PartialView("Blocking");
        }

        /// <summary>
        /// Load User Defined Fields submodule
        /// </summary>
        [Route("UserDefinedFields")]
        public IActionResult UserDefinedFields()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            return PartialView("UserDefinedFields");
        }

        // Additional Data Entry Submodules
        [Route("AccountClassification")]
        public IActionResult AccountClassification() => _authService.IsAuthenticated() ? PartialView("AccountClassification") : Unauthorized();

        [Route("AccountNotification")]
        public IActionResult AccountNotification() => _authService.IsAuthenticated() ? PartialView("AccountNotification") : Unauthorized();

        [Route("SpecialConditions")]
        public IActionResult SpecialConditions() => _authService.IsAuthenticated() ? PartialView("SpecialConditions") : Unauthorized();

        [Route("InterestRates")]
        public IActionResult InterestRates() => _authService.IsAuthenticated() ? PartialView("InterestRates") : Unauthorized();

        [Route("CardMaintenance")]
        public IActionResult CardMaintenance() => _authService.IsAuthenticated() ? PartialView("CardMaintenance") : Unauthorized();

        [Route("AccountNotes")]
        public IActionResult AccountNotes() => _authService.IsAuthenticated() ? PartialView("AccountNotes") : Unauthorized();

        [Route("FreezeRelease")]
        public IActionResult FreezeRelease() => _authService.IsAuthenticated() ? PartialView("FreezeRelease") : Unauthorized();

        [Route("ChequeBook")]
        public IActionResult ChequeBook() => _authService.IsAuthenticated() ? PartialView("ChequeBook") : Unauthorized();

        [Route("StopPaymentVoid")]
        public IActionResult StopPaymentVoid() => _authService.IsAuthenticated() ? PartialView("StopPaymentVoid") : Unauthorized();

        [Route("CancelStopPayment")]
        public IActionResult CancelStopPayment() => _authService.IsAuthenticated() ? PartialView("CancelStopPayment") : Unauthorized();

        [Route("ActivateDormant")]
        public IActionResult ActivateDormant() => _authService.IsAuthenticated() ? PartialView("ActivateDormant") : Unauthorized();

        [Route("Reminders")]
        public IActionResult Reminders() => _authService.IsAuthenticated() ? PartialView("Reminders") : Unauthorized();

        [Route("AccountActivation")]
        public IActionResult AccountActivation() => _authService.IsAuthenticated() ? PartialView("AccountActivation") : Unauthorized();

        [Route("AccountTransfer")]
        public IActionResult AccountTransfer() => _authService.IsAuthenticated() ? PartialView("AccountTransfer") : Unauthorized();

        // View Submodules
        [Route("StatementView")]
        public IActionResult StatementView() => _authService.IsAuthenticated() ? PartialView("StatementView") : Unauthorized();

        [Route("SignaturePhoto")]
        public IActionResult SignaturePhoto() => _authService.IsAuthenticated() ? PartialView("SignaturePhoto") : Unauthorized();

        [Route("ClientPortfolio")]
        public IActionResult ClientPortfolio() => _authService.IsAuthenticated() ? PartialView("ClientPortfolio") : Unauthorized();

        [Route("LoanRepaymentDetails")]
        public IActionResult LoanRepaymentDetails() => _authService.IsAuthenticated() ? PartialView("LoanRepaymentDetails") : Unauthorized();

        [Route("DebitInterestWorksheet")]
        public IActionResult DebitInterestWorksheet() => _authService.IsAuthenticated() ? PartialView("DebitInterestWorksheet") : Unauthorized();

        [Route("CreditInterestWorksheet")]
        public IActionResult CreditInterestWorksheet() => _authService.IsAuthenticated() ? PartialView("CreditInterestWorksheet") : Unauthorized();

        #endregion

        /// <summary>
        /// API endpoint - Search accounts
        /// </summary>
        [HttpPost]
        [Route("search-accounts")]
        public async Task<IActionResult> SearchAccounts([FromBody] AccountSearchRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated account search attempt");
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

                _logger.LogInformation("Account search request: {Request}", JsonSerializer.Serialize(requestData));

                // Call backend API through ApiService
                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    "api/accounts/search",
                    requestData
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching accounts");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error searching accounts: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// API endpoint - Get account details by ID
        /// </summary>
        [HttpPost]
        [Route("get-account")]
        public async Task<IActionResult> GetAccount([FromBody] AccountDetailsRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });
                }

                _logger.LogInformation("Get account request: {Request}", JsonSerializer.Serialize(requestData));

                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    "api/accounts/details",
                    requestData
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving account details");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error retrieving account: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// API endpoint - Update account
        /// </summary>
        [HttpPost]
        [Route("update-account")]
        public async Task<IActionResult> UpdateAccount([FromBody] AccountUpdateRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });
                }

                _logger.LogInformation("Update account request: {Request}", JsonSerializer.Serialize(requestData));

                // Inject session data
                requestData.UserID = HttpContext.Session.GetString("user_name");
                requestData.OperatorID = HttpContext.Session.GetString("user_name");
                requestData.BranchID = HttpContext.Session.GetString("branch_code");
                requestData.BankID = "00";

                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    "api/accounts/update",
                    requestData
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating account");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error updating account: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// API endpoint - Create new account
        /// </summary>
        [HttpPost]
        [Route("create-account")]
        public async Task<IActionResult> CreateAccount([FromBody] AccountCreateRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });
                }

                _logger.LogInformation("Create account request: {Request}", JsonSerializer.Serialize(requestData));

                // Inject session data
                requestData.UserID = HttpContext.Session.GetString("user_name");
                requestData.OperatorID = HttpContext.Session.GetString("user_name");
                requestData.BranchID = HttpContext.Session.GetString("branch_code");
                requestData.BankID = "00";

                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    "api/accounts/create",
                    requestData
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating account");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error creating account: {ex.Message}"
                });
            }
        }
    }

    // Request DTOs
    public class AccountSearchRequest
    {
        public string? AccountNumber { get; set; }
        public string? AccountName { get; set; }
        public string? ClientID { get; set; }
        public string? BranchID { get; set; }
        public string? ProductCode { get; set; }
        public string? AccountStatus { get; set; }
    }

    public class AccountDetailsRequest
    {
        public string? AccountNumber { get; set; }
        public string? AccountID { get; set; }
    }

    public class AccountUpdateRequest
    {
        public string? AccountNumber { get; set; }
        public string? AccountID { get; set; }
        public string? AccountName { get; set; }
        public string? ProductCode { get; set; }
        public string? CurrencyCode { get; set; }
        public string? Status { get; set; }
        public string? UserID { get; set; }
        public string? OperatorID { get; set; }
        public string? BranchID { get; set; }
        public string? BankID { get; set; }
    }

    public class AccountCreateRequest
    {
        public string? ClientID { get; set; }
        public string? AccountName { get; set; }
        public string? ProductCode { get; set; }
        public string? CurrencyCode { get; set; }
        public string? AccountTypeCode { get; set; }
        public string? UserID { get; set; }
        public string? OperatorID { get; set; }
        public string? BranchID { get; set; }
        public string? BankID { get; set; }
    }
}
