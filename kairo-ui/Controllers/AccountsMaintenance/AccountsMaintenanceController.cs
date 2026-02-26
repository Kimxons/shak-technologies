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

        #region API Endpoints - Channel to Backend API

        // ============================================================================
        // NOTES
        // ============================================================================

        [HttpPost]
        [Route("api/get-notes")]
        public async Task<IActionResult> GetNotes([FromBody] GetNotesRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    ApiEndpoints.GET_NOTES,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting notes");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/update-notes")]
        public async Task<IActionResult> UpdateNotes([FromBody] UpdateNotesRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    ApiEndpoints.UPDATE_NOTES,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating notes");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        // ============================================================================
        // DOCUMENTS
        // ============================================================================

        [HttpPost]
        [Route("api/get-account-document")]
        public async Task<IActionResult> GetAccountDocument([FromBody] GetAccountDocumentRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    ApiEndpoints.GET_ACCOUNT_DOCUMENT,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account document");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/add-account-document")]
        public async Task<IActionResult> AddAccountDocument([FromBody] AddAccountDocumentRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    ApiEndpoints.ADD_ACCOUNT_DOCUMENT,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding account document");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/update-account-document")]
        public async Task<IActionResult> UpdateAccountDocument([FromBody] UpdateAccountDocumentRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    ApiEndpoints.UPDATE_ACCOUNT_DOCUMENT,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating account document");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/delete-account-document")]
        public async Task<IActionResult> DeleteAccountDocument([FromBody] DeleteAccountDocumentRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    ApiEndpoints.DELETE_ACCOUNT_DOCUMENT,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting account document");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        // ============================================================================
        // FREEZE/RELEASE
        // ============================================================================

        [HttpPost]
        [Route("api/get-account-freeze")]
        public async Task<IActionResult> GetAccountFreeze([FromBody] GetAccountFreezeRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    ApiEndpoints.GET_ACCOUNT_FREEZE,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account freeze");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/add-account-freeze")]
        public async Task<IActionResult> AddAccountFreeze([FromBody] AddAccountFreezeRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    ApiEndpoints.ADD_ACCOUNT_FREEZE,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding account freeze");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/release-account-freeze")]
        public async Task<IActionResult> ReleaseAccountFreeze([FromBody] ReleaseAccountFreezeRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    ApiEndpoints.RELEASE_ACCOUNT_FREEZE,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error releasing account freeze");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        // ============================================================================
        // CHEQUE BOOK
        // ============================================================================

        [HttpPost]
        [Route("api/get-cheque-books")]
        public async Task<IActionResult> GetChequeBooks([FromBody] GetChequeBooksRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    ApiEndpoints.GET_CHEQUE_BOOKS,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cheque books");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/get-cheque-book-requests")]
        public async Task<IActionResult> GetChequeBookRequests([FromBody] GetChequeBookRequestsRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    ApiEndpoints.GET_CHEQUE_BOOK_REQUESTS,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cheque book requests");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/add-cheque-book")]
        public async Task<IActionResult> AddChequeBook([FromBody] AddChequeBookRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    ApiEndpoints.ADD_CHEQUE_BOOK,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding cheque book");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        // ============================================================================
        // REMINDERS
        // ============================================================================

        [HttpPost]
        [Route("api/get-account-reminders")]
        public async Task<IActionResult> GetAccountReminders([FromBody] GetAccountRemindersRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    ApiEndpoints.GET_ACCOUNT_REMINDERS,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account reminders");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/add-account-reminder")]
        public async Task<IActionResult> AddAccountReminder([FromBody] AddAccountReminderRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    ApiEndpoints.ADD_ACCOUNT_REMINDER,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding account reminder");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/update-account-reminder")]
        public async Task<IActionResult> UpdateAccountReminder([FromBody] UpdateAccountReminderRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    ApiEndpoints.UPDATE_ACCOUNT_REMINDER,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating account reminder");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/delete-account-reminder")]
        public async Task<IActionResult> DeleteAccountReminder([FromBody] DeleteAccountReminderRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    ApiEndpoints.DELETE_ACCOUNT_REMINDER,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting account reminder");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

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
                    ApiEndpoints.GET_ACCOUNT,
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
                    ApiEndpoints.EDIT_ACCOUNT,
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
                    ApiEndpoints.CREATE_ACCOUNT,
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

        /// <summary>
        /// API endpoint - Save account (used by Add mode in frontend)
        /// </summary>
        [HttpPost]
        [Route("SaveAccount")]
        public async Task<IActionResult> SaveAccount([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    ApiEndpoints.CREATE_ACCOUNT,
                    requestData
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving account");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        /// <summary>
        /// API endpoint - Get account opening details (for Add mode)
        /// </summary>
        [HttpPost]
        [Route("GetAccountOpeningDetails")]
        public async Task<IActionResult> GetAccountOpeningDetails([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                // Note: Backend endpoint doesn't exist yet - this will need to be added to backend API
                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    ApiEndpoints.GET_ACCOUNT,
                    requestData
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account opening details");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        /// <summary>
        /// API endpoint - Get unclear balance details
        /// </summary>
        [HttpPost]
        [Route("GetUnClearBalance")]
        public async Task<IActionResult> GetUnClearBalance([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                // Note: Backend endpoint doesn't exist yet - this will need to be added to backend API
                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    ApiEndpoints.GET_ACCOUNT,
                    requestData
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting unclear balance");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
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

    // ============================================================================
    // NOTES Request DTOs
    // ============================================================================
    public class GetNotesRequest
    {
        public string? AccountId { get; set; }
    }

    public class UpdateNotesRequest
    {
        public string? AccountId { get; set; }
        public string? Notes { get; set; }
    }

    // ============================================================================
    // DOCUMENTS Request DTOs
    // ============================================================================
    public class GetAccountDocumentRequest
    {
        public string? AccountId { get; set; }
        public string? DocumentId { get; set; }
    }

    public class AddAccountDocumentRequest
    {
        public string? AccountId { get; set; }
        public string? DocumentType { get; set; }
        public string? DocumentClass { get; set; }
        public string? ReceivedBy { get; set; }
        public string? ReceivedDate { get; set; }
        public string? Location { get; set; }
        public string? Remarks { get; set; }
    }

    public class UpdateAccountDocumentRequest
    {
        public string? AccountId { get; set; }
        public string? DocumentId { get; set; }
        public string? DocumentType { get; set; }
        public string? DocumentClass { get; set; }
        public string? ReceivedBy { get; set; }
        public string? ReceivedDate { get; set; }
        public string? Location { get; set; }
        public string? Remarks { get; set; }
    }

    public class DeleteAccountDocumentRequest
    {
        public string? AccountId { get; set; }
        public string? DocumentId { get; set; }
    }

    // ============================================================================
    // FREEZE/RELEASE Request DTOs
    // ============================================================================
    public class GetAccountFreezeRequest
    {
        public string? AccountId { get; set; }
    }

    public class AddAccountFreezeRequest
    {
        public string? AccountId { get; set; }
        public string? FreezeAmount { get; set; }
        public string? FreezeReason { get; set; }
        public string? FreezeDate { get; set; }
    }

    public class ReleaseAccountFreezeRequest
    {
        public string? AccountId { get; set; }
        public string? FreezeId { get; set; }
    }

    // ============================================================================
    // CHEQUE BOOK Request DTOs
    // ============================================================================
    public class GetChequeBooksRequest
    {
        public string? AccountId { get; set; }
    }

    public class GetChequeBookRequestsRequest
    {
        public string? AccountId { get; set; }
    }

    public class AddChequeBookRequest
    {
        public string? AccountId { get; set; }
        public string? BookType { get; set; }
        public string? NoOfLeaves { get; set; }
        public string? ChequeStart { get; set; }
        public string? IssueDate { get; set; }
    }

    // ============================================================================
    // REMINDERS Request DTOs
    // ============================================================================
    public class GetAccountRemindersRequest
    {
        public string? AccountId { get; set; }
    }

    public class AddAccountReminderRequest
    {
        public string? AccountId { get; set; }
        public string? ReminderText { get; set; }
        public string? ReminderDate { get; set; }
        public string? ReminderType { get; set; }
    }

    public class UpdateAccountReminderRequest
    {
        public string? AccountId { get; set; }
        public string? ReminderId { get; set; }
        public string? ReminderText { get; set; }
        public string? ReminderDate { get; set; }
        public string? ReminderType { get; set; }
    }

    public class DeleteAccountReminderRequest
    {
        public string? AccountId { get; set; }
        public string? ReminderId { get; set; }
    }
}
