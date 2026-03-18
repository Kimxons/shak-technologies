using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace kairo_ui.Controllers.AccountsMaintenance
{
    [Route("AccountsMaintenance")]
    public class AccountsMaintenanceController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly IOldApiService _oldApiService;
        private readonly IConfiguration _config;
        private readonly ILogger<AccountsMaintenanceController> _logger;
        private readonly ICommonUtilitiesService _commonUtilities;

        public AccountsMaintenanceController(
            IAuthService authService,
            IApiService apiService,
            IApiCachedService apiCachedService,
            IOldApiService oldApiService,
            IConfiguration configuration,
            ILogger<AccountsMaintenanceController> logger,
            ICommonUtilitiesService commonUtilities)
        {
            _authService = authService;
            _apiService = apiService;
            _apiCachedService = apiCachedService;
            _oldApiService = oldApiService;
            _config = configuration;
            _logger = logger;
            _commonUtilities = commonUtilities;
        }

        /// <summary>
        /// Accounts Maintenance view - requires authentication
        /// </summary>
        [Route("Index")]
        public async Task<IActionResult> Index()
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated access attempt to Accounts Maintenance");
                    return RedirectToAction("Index", "Login");
                }

                // Load dropdown options for main screen
                try
                {
                    var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                    {
                        "CityID",
                        "CountryID",
                        "OperatingModeID",
                        "AccountClassID",
                        "AccountOfficerID"
                    });

                    dropdownOptions.TryGetValue("CityID", out var cityOptions);
                    dropdownOptions.TryGetValue("CountryID", out var countryOptions);
                    dropdownOptions.TryGetValue("OperatingModeID", out var operatingModeOptions);
                    dropdownOptions.TryGetValue("AccountClassID", out var accountClassOptions);
                    dropdownOptions.TryGetValue("AccountOfficerID", out var accountOfficerOptions);

                    ViewData["CityOptions"] = cityOptions ?? Enumerable.Empty<SelectListItem>();
                    ViewData["CountryOptions"] = countryOptions ?? Enumerable.Empty<SelectListItem>();
                    ViewData["OperatingModeOptions"] = operatingModeOptions ?? Enumerable.Empty<SelectListItem>();
                    ViewData["AccountClassOptions"] = accountClassOptions ?? Enumerable.Empty<SelectListItem>();
                    ViewData["AccountOfficerOptions"] = accountOfficerOptions ?? Enumerable.Empty<SelectListItem>();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error loading Index dropdown options");
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
        [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
        public async Task<IActionResult> Documents()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "DocumentClassID",
                    "DocumentTypeID",
                    "DocumentLocationID"
                });

                dropdownOptions.TryGetValue("DocumentClassID", out var documentClassOptions);
                dropdownOptions.TryGetValue("DocumentTypeID", out var documentTypeOptions);
                dropdownOptions.TryGetValue("DocumentLocationID", out var documentLocationOptions);

                ViewData["DocumentClassOptions"] = documentClassOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["DocumentTypeOptions"] = documentTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["DocumentLocationOptions"] = documentLocationOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Documents dropdown options");
                ViewData["DocumentClassOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["DocumentTypeOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["DocumentLocationOptions"] = Enumerable.Empty<SelectListItem>();
            }

            return PartialView("Documents");
        }

        /// <summary>
        /// Load Signatories submodule
        /// </summary>
        [Route("Signatories")]
        public async Task<IActionResult> Signatories()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "SignatoryTypeID",
                        "AgentMandateID"
                });

                dropdownOptions.TryGetValue("SignatoryTypeID", out var signatoryTypeOptions);
                dropdownOptions.TryGetValue("AgentMandateID", out var mandatesOptions);

                ViewData["SignatoryTypeOptions"] = signatoryTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["MandatesOptions"] = mandatesOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Signatories dropdown options");
            }

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
        public async Task<IActionResult> Closing()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "AccountCloseReasonID"
                });

                dropdownOptions.TryGetValue("AccountCloseReasonID", out var closeReasonOptions);

                ViewData["AccountCloseReasonOptions"] = closeReasonOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Closing dropdown options");
            }

            return PartialView("Closing");
        }

        /// <summary>
        /// Load Charge Rates submodule
        /// </summary>
        [Route("ChargeRates")]
        public async Task<IActionResult> ChargeRates()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "CalculationMethodID"
                });

                dropdownOptions.TryGetValue("CalculationMethodID", out var calculationMethodOptions);

                ViewData["CeilingAmountTypeOptions"] = new List<SelectListItem>
                {
                    new SelectListItem { Value = "0", Text = "Equal To" },
                    new SelectListItem { Value = "<=", Text = "<=" },
                    new SelectListItem { Value = "<", Text = "<" },
                    new SelectListItem { Value = ">=", Text = ">=" },
                    new SelectListItem { Value = ">", Text = ">" }
                };
                ViewData["CalculationMethodOptions"] = calculationMethodOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading ChargeRates dropdown options");
            }

            return PartialView("ChargeRates");
        }

        /// <summary>
        /// Load Blocking/Unblocking submodule
        /// </summary>
        [Route("Blocking")]
        public async Task<IActionResult> Blocking()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "BlockedReasonID",
                    "UnBlockedReasonID"
                });

                dropdownOptions.TryGetValue("BlockedReasonID", out var blockedReasonOptions);
                dropdownOptions.TryGetValue("UnBlockedReasonID", out var unBlockedReasonOptions);

                ViewData["BlockedReasonOptions"] = blockedReasonOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["UnBlockedReasonOptions"] = unBlockedReasonOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Blocking dropdown options");
            }

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
        public async Task<IActionResult> AccountClassification()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            try
            {
                ViewData["ClassificationCodeOptions"] = await LoadAccountClassificationCodeOptionsAsync();
                ViewData["ClassificationSubCodeOptions"] = Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading AccountClassification dropdown options");
                ViewData["ClassificationCodeOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["ClassificationSubCodeOptions"] = Enumerable.Empty<SelectListItem>();
            }

            return PartialView("AccountClassification");
        }

        [Route("AccountNotification")]
        public async Task<IActionResult> AccountNotification()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "NotificationFreqID"
                });

                dropdownOptions.TryGetValue("NotificationFreqID", out var frequencyOptions);

                ViewData["FrequencyOptions"] = frequencyOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading AccountNotification dropdown options");
            }

            return PartialView("AccountNotification");
        }

        [Route("SpecialConditions")]
        public IActionResult SpecialConditions() => _authService.IsAuthenticated() ? PartialView("SpecialConditions") : Unauthorized();

        [Route("InterestRates")]
        public async Task<IActionResult> InterestRates()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "InterestTypeID"
                });

                dropdownOptions.TryGetValue("InterestTypeID", out var rateTypeOptions);

                ViewData["InterestRateTypeOptions"] = rateTypeOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading InterestRates dropdown options");
            }

            return PartialView("InterestRates");
        }

        [Route("CardMaintenance")]
        public async Task<IActionResult> CardMaintenance()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "CardProviderID",
                    "CardTypeID",
                    "CardDeactivationReasonID",
                    "CardStatusID"
                });

                dropdownOptions.TryGetValue("CardProviderID", out var cardProviderOptions);
                dropdownOptions.TryGetValue("CardTypeID", out var cardTypeOptions);
                dropdownOptions.TryGetValue("CardDeactivationReasonID", out var cardReasonOptions);
                dropdownOptions.TryGetValue("CardStatusID", out var cardStatusOptions);

                ViewData["CardProviderOptions"] = cardProviderOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["CardTypeOptions"] = cardTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["CardDeactivationReasonOptions"] = cardReasonOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["CardStatusOptions"] = cardStatusOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading CardMaintenance dropdown options");
            }

            return PartialView("CardMaintenance");
        }

        [Route("AccountNotes")]
        public IActionResult AccountNotes() => _authService.IsAuthenticated() ? PartialView("AccountNotes") : Unauthorized();

        [Route("FreezeRelease")]
        public IActionResult FreezeRelease() => _authService.IsAuthenticated() ? PartialView("FreezeRelease") : Unauthorized();

        [Route("ChequeBook")]
        public async Task<IActionResult> ChequeBook()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "BookTypeID"
                });

                dropdownOptions.TryGetValue("BookTypeID", out var bookTypeOptions);

                ViewData["BookTypeOptions"] = bookTypeOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading ChequeBook dropdown options");
            }

            return PartialView("ChequeBook");
        }

        [Route("StopPaymentVoid")]
        public async Task<IActionResult> StopPaymentVoid()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "StopPayReasonID",
                    "VoidReasonID",
                    "ChequePrefix"
                });

                dropdownOptions.TryGetValue("StopPayReasonID", out var stopPayReasonOptions);
                dropdownOptions.TryGetValue("VoidReasonID", out var voidReasonOptions);
                dropdownOptions.TryGetValue("ChequePrefix", out var chequePrefixOptions);

                ViewData["StopPaymentReasonOptions"] = stopPayReasonOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["VoidReasonOptions"] = voidReasonOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["ChequePrefixOptions"] = chequePrefixOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading StopPaymentVoid dropdown options");
                ViewData["StopPaymentReasonOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["VoidReasonOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["ChequePrefixOptions"] = Enumerable.Empty<SelectListItem>();
            }

            return PartialView("StopPaymentVoid");
        }

        [Route("ActivateDormant")]
        public IActionResult ActivateDormant() => _authService.IsAuthenticated() ? PartialView("ActivateDormant") : Unauthorized();

        [Route("Reminders")]
        public IActionResult Reminders() => _authService.IsAuthenticated() ? PartialView("Reminders") : Unauthorized();

        [Route("AccountActivation")]
        public IActionResult AccountActivation() => _authService.IsAuthenticated() ? PartialView("AccountActivation") : Unauthorized();

        [Route("AccountTransfer")]
        public async Task<IActionResult> AccountTransfer()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "TransferTypeID",
                    "TransferReasonID"
                });

                dropdownOptions.TryGetValue("TransferTypeID", out var transferTypeOptions);
                dropdownOptions.TryGetValue("TransferReasonID", out var transferReasonOptions);

                ViewData["TransferTypeOptions"] = transferTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["TransferReasonOptions"] = transferReasonOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading AccountTransfer dropdown options");
            }

            return PartialView("AccountTransfer");
        }

        // View Submodules
        [Route("StatementView")]
        public IActionResult StatementView() => _authService.IsAuthenticated() ? PartialView("StatementView") : Unauthorized();

        [Route("SignaturePhoto")]
        public async Task<IActionResult> SignaturePhoto()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "OperatingModeID"
                });

                dropdownOptions.TryGetValue("OperatingModeID", out var operatingModeOptions);

                ViewData["OperatingModeOptions"] = operatingModeOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading SignaturePhoto dropdown options");
            }

            return PartialView("SignaturePhoto");
        }

        [Route("ClientPortfolio")]
        public async Task<IActionResult> ClientPortfolio()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "PortfolioTypeID"
                });

                dropdownOptions.TryGetValue("PortfolioTypeID", out var portfolioTypeOptions);

                ViewData["PortfolioTypeOptions"] = portfolioTypeOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading ClientPortfolio dropdown options");
            }

            return PartialView("ClientPortfolio");
        }

        [Route("LoanRepaymentDetails")]
        public IActionResult LoanRepaymentDetails() => _authService.IsAuthenticated() ? PartialView("LoanRepaymentDetails") : Unauthorized();

        [Route("DebitInterestWorksheet")]
        public IActionResult DebitInterestWorksheet() => _authService.IsAuthenticated() ? PartialView("DebitInterestWorksheet") : Unauthorized();

        [Route("CreditInterestWorksheet")]
        public IActionResult CreditInterestWorksheet() => _authService.IsAuthenticated() ? PartialView("CreditInterestWorksheet") : Unauthorized();

        #endregion

        #region API Endpoints - Channel to Backend API

        [HttpPost]
        [Route("api/get-blocked-reasons")]
        public async Task<IActionResult> GetBlockedReasons()
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "BlockedReasonID"
                });

                dropdownOptions.TryGetValue("BlockedReasonID", out var options);
                return Ok(new { Details = options ?? Enumerable.Empty<SelectListItem>() });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading blocked reasons");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/get-unblocked-reasons")]
        public async Task<IActionResult> GetUnblockedReasons()
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "UnBlockedReasonID"
                });

                dropdownOptions.TryGetValue("UnBlockedReasonID", out var options);
                return Ok(new { Details = options ?? Enumerable.Empty<SelectListItem>() });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading unblocked reasons");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

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

                // Mapping SearchKey to SearchID for backend SP compatibility (p_GetNotes_V0)
                if (string.IsNullOrEmpty(request.SearchID) && !string.IsNullOrEmpty(request.SearchKey))
                {
                    request.SearchID = request.SearchKey;
                }

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
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

                // Mapping SearchKey to SearchID for backend SP compatibility
                if (string.IsNullOrEmpty(request.SearchID) && !string.IsNullOrEmpty(request.SearchKey))
                {
                    request.SearchID = request.SearchKey;
                }

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
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
        // SIGNATORIES
        // ============================================================================

        [HttpPost]
        [Route("api/get-account-signatories")]
        public async Task<IActionResult> GetAccountSignatories([FromBody] GetAccountSignatoriesRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                // Mapping SearchKey to SearchID for backend SP compatibility
                if (string.IsNullOrEmpty(request.SearchID) && !string.IsNullOrEmpty(request.SearchKey))
                {
                    request.SearchID = request.SearchKey;
                }

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_ACCOUNT_SIGNATORIES,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account signatories");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/add-account-signatories")]
        public async Task<IActionResult> AddAccountSignatories([FromBody] AddAccountSignatoriesRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.ADD_ACCOUNT_SIGNATORIES,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding account signatories");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }



        [HttpPost]
        [Route("api/edit-account-signatories")]
        public async Task<IActionResult> EditAccountSignatories([FromBody] EditAccountSignatoriesRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.EDIT_ACCOUNT_SIGNATORIES,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error editing account signatories");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        /// <summary>
        /// API endpoint - Get signature image for a signatory
        /// </summary>
        [HttpPost]
        [Route("api/get-signature-image")]
        public async Task<IActionResult> GetSignatureImage([FromBody] SignatoryImageRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, errorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var payload = new
                {
                    OurBranchID = request.OurBranchID,
                    SignatoryID = request.SignatoryID,
                    ImageType = "S", // S for Signature
                    OperatorID = request.OperatorID
                };

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_SIGNATORY_IMAGE,
                    payload
                );

                // Extract image data from response
                if (response.TryGetProperty("Data", out var data) &&
                    data.ValueKind == JsonValueKind.Array &&
                    data.GetArrayLength() > 0)
                {
                    var firstItem = data[0];
                    if (firstItem.TryGetProperty("ImageData", out var imageData) ||
                        firstItem.TryGetProperty("SignatureImage", out imageData) ||
                        firstItem.TryGetProperty("Image", out imageData))
                    {
                        return Ok(new { success = true, imageData = imageData.GetString() });
                    }
                }

                return Ok(new { success = false, imageData = (string?)null });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting signature image");
                return Ok(new { success = false, imageData = (string?)null, errorMessage = ex.Message });
            }
        }

        /// <summary>
        /// API endpoint - Get photo image for a signatory
        /// </summary>
        [HttpPost]
        [Route("api/get-photo-image")]
        public async Task<IActionResult> GetPhotoImage([FromBody] SignatoryImageRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, errorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var payload = new
                {
                    OurBranchID = request.OurBranchID,
                    SignatoryID = request.SignatoryID,
                    ImageType = "P", // P for Photo
                    OperatorID = request.OperatorID
                };

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_SIGNATORY_IMAGE,
                    payload
                );

                // Extract image data from response
                if (response.TryGetProperty("Data", out var data) &&
                    data.ValueKind == JsonValueKind.Array &&
                    data.GetArrayLength() > 0)
                {
                    var firstItem = data[0];
                    if (firstItem.TryGetProperty("ImageData", out var imageData) ||
                        firstItem.TryGetProperty("PhotoImage", out imageData) ||
                        firstItem.TryGetProperty("Image", out imageData))
                    {
                        return Ok(new { success = true, imageData = imageData.GetString() });
                    }
                }

                return Ok(new { success = false, imageData = (string?)null });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting photo image");
                return Ok(new { success = false, imageData = (string?)null, errorMessage = ex.Message });
            }
        }

        /// <summary>
        /// API endpoint - Get client images (signature/photo) from ClientDocumentApi
        /// </summary>
        [HttpGet]
        [Route("api/get-client-images/{clientId}")]
        public async Task<IActionResult> GetClientImages(string clientId)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, errorMessage = "Not authenticated" });

                if (string.IsNullOrWhiteSpace(clientId))
                    return BadRequest(new { success = false, errorMessage = "ClientID is required" });

                // Build the endpoint URL using the constant
                var endpoint = string.Format(ApiEndpoints.GET_IMAGE_ACCOUNTS_BY_CLIENT, clientId);

                _logger.LogInformation("Fetching client images from ClientDocumentApi: {Endpoint}", endpoint);

                var response = await _apiService.GetAsync<JsonElement>(
                    "ClientDocumentApi",
                    endpoint,
                    []
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting client images for ClientID: {ClientID}", clientId);
                return Ok(new { success = false, errorMessage = ex.Message });
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

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
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

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
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

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
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

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
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

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
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

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
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
        [Route("api/update-account-freeze")]
        public async Task<IActionResult> UpdateAccountFreeze([FromBody] AddAccountFreezeRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.UPDATE_ACCOUNT_FREEZE,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating account freeze");
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

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
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

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
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

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
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

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
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

        [HttpPost]
        [Route("api/add-cheque-book-request")]
        public async Task<IActionResult> AddChequeBookRequest([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.ADD_CHEQUE_BOOK_REQUEST,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding cheque book request");
                var errorMessage = ex.InnerException?.Message ?? ex.Message;
                return Ok(new { Success = false, ResponseCode = "99", ResponseMessage = errorMessage, ErrorMessage = errorMessage });
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

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
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

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
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

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
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

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
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

        // ============================================================================
        // NOMINATION (NOMINEES)
        // ============================================================================

        [HttpPost]
        [Route("api/get-account-nominee")]
        public async Task<IActionResult> GetAccountNominee([FromBody] GenericAccountRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_ACCOUNT_NOMINEE,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account nominee");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/check-account-nominee-opening")]
        public async Task<IActionResult> CheckAccountNomineeOpening([FromBody] GenericAccountRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.CHECK_ACCOUNT_NOMINEE_OPENING,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking account nominee opening");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/add-account-nominee")]
        public async Task<IActionResult> AddAccountNominee([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.ADD_ACCOUNT_NOMINEE,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding account nominee");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/update-account-nominee")]
        public async Task<IActionResult> UpdateAccountNominee([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.UPDATE_ACCOUNT_NOMINEE,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating account nominee");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/delete-account-nominee")]
        public async Task<IActionResult> DeleteAccountNominee([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.DELETE_ACCOUNT_NOMINEE,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting account nominee");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        // ============================================================================
        // SPECIAL CONDITIONS
        // ============================================================================

        [HttpPost]
        [Route("api/get-account-special-conditions")]
        public async Task<IActionResult> GetAccountSpecialConditions([FromBody] GenericAccountRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_ACCOUNT_SPECIAL_CONDITIONS,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account special conditions");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/add-account-special-condition")]
        public async Task<IActionResult> AddAccountSpecialCondition([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.ADD_ACCOUNT_SPECIAL_CONDITION,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding account special condition");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/update-account-special-condition")]
        public async Task<IActionResult> UpdateAccountSpecialCondition([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.UPDATE_ACCOUNT_SPECIAL_CONDITION,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating account special condition");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/delete-account-special-condition")]
        public async Task<IActionResult> DeleteAccountSpecialCondition([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.DELETE_ACCOUNT_SPECIAL_CONDITION,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting account special condition");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        // ============================================================================
        // INTEREST RATES
        // ============================================================================

        [HttpPost]
        [Route("api/get-account-interest-rate")]
        public async Task<IActionResult> GetAccountInterestRate([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_ACCOUNT_INTEREST_RATE,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account interest rate");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/add-account-interest-rate")]
        public async Task<IActionResult> AddAccountInterestRate([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.ADD_ACCOUNT_INTEREST_RATE,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding account interest rate");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/update-account-interest-rate")]
        public async Task<IActionResult> UpdateAccountInterestRate([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.UPDATE_ACCOUNT_INTEREST_RATE,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating account interest rate");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/delete-account-interest-rate")]
        public async Task<IActionResult> DeleteAccountInterestRate([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.DELETE_ACCOUNT_INTEREST_RATE,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting account interest rate");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        // ============================================================================
        // ACCOUNT CLOSING
        // ============================================================================

        [HttpPost]
        [Route("api/get-account-closing")]
        public async Task<IActionResult> GetAccountClosingDetails([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestData = JsonSerializer.Deserialize<GenericAccountRequest>(request.GetRawText()) ?? new GenericAccountRequest();

                _commonUtilities.EnsureDefaults(requestData);

                var payload = new AccountClosingDetailsPayload
                {
                    OurBranchID = requestData.OurBranchID,
                    AccountID = requestData.AccountID,
                    OperatorID = requestData.OperatorID
                };

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_ACCOUNT_CLOSING_DETAILS,
                    payload
                );

                var responseCode = ExtractResponseCode(response);
                var isSuccess = IsSuccessResponse(response);
                var hasData = HasClosingData(response);
                var message = ExtractResponseMessage(response, string.Empty);

                return Ok(new
                {
                    success = isSuccess,
                    code = string.IsNullOrWhiteSpace(responseCode) ? (isSuccess ? "00" : "99") : responseCode,
                    message = string.IsNullOrWhiteSpace(message)
                        ? (hasData ? "Closing details loaded successfully." : "Failed to load closing details.")
                        : message,
                    data = response
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account closing details");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/close-account")]
        public async Task<IActionResult> CloseAccount([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestData = JsonSerializer.Deserialize<AccountClosingSaveRequest>(request.GetRawText()) ?? new AccountClosingSaveRequest();

                _commonUtilities.EnsureDefaults(requestData);

                var payload = new AccountClosingProcedureRequest
                {
                    OurBranchID = requestData.OurBranchID,
                    AccountID = requestData.AccountID,
                    CloseReasonID = requestData.CloseReasonID,
                    CloseReason = string.IsNullOrWhiteSpace(requestData.Remarks) ? requestData.CloseReason : requestData.Remarks,
                    ClosedBy = string.IsNullOrWhiteSpace(requestData.ClosedBy) ? requestData.OperatorID : requestData.ClosedBy,
                    UpdateCount = requestData.UpdateCount,
                    SysTrx = requestData.SysTrx,
                    UserTrx = requestData.UserTrx
                };

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.ADD_ACCOUNT_CLOSING_DETAILS,
                    payload
                );

                var responseCode = ExtractResponseCode(response);
                var isSuccess = IsSuccessResponse(response);
                var message = ExtractResponseMessage(response, string.Empty);

                return Ok(new
                {
                    success = isSuccess,
                    code = string.IsNullOrWhiteSpace(responseCode) ? (isSuccess ? "00" : "99") : responseCode,
                    message = string.IsNullOrWhiteSpace(message)
                        ? (isSuccess ? "Account closed successfully." : "Failed to close account.")
                        : message,
                    data = response
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error closing account");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/transfer-account")]
        public async Task<IActionResult> TransferAccount([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.TRANSFER_ACCOUNT,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error transferring account");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        private static string ExtractResponseCode(JsonElement response)
        {
            return GetString(response, "ResponseCode", "responseCode", "Status", "status")
                ?? FindStatusCodeInDetailSets(response)
                ?? string.Empty;
        }

        private static string ExtractResponseMessage(JsonElement response, string fallback)
        {
            return GetString(response, "ResponseMessage", "responseMessage", "Message", "message", "ErrorMessage", "errorMessage")
                ?? FindStatusMessageInDetailSets(response)
                ?? fallback;
        }

        private static bool IsSuccessResponse(JsonElement response)
        {
            var responseCode = ExtractResponseCode(response);
            if (!string.IsNullOrWhiteSpace(responseCode))
            {
                return string.Equals(responseCode, "00", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(responseCode, "0", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(responseCode, "000", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(responseCode, "Success", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(responseCode, "OK", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(responseCode, "True", StringComparison.OrdinalIgnoreCase);
            }

            return HasClosingData(response);
        }

        private static bool HasClosingData(JsonElement response)
        {
            foreach (var row in EnumerateClosingRows(response))
            {
                if (LooksLikeClosingSummaryRow(row) || LooksLikeClosingComponentRow(row))
                {
                    return true;
                }
            }

            return false;
        }

        private static IEnumerable<JsonElement> EnumerateClosingRows(JsonElement response)
        {
            foreach (var candidate in EnumerateClosingCandidates(response))
            {
                if (candidate.ValueKind == JsonValueKind.Object)
                {
                    yield return candidate;
                }
            }

            foreach (var detailSet in EnumerateDetailSets(response))
            {
                foreach (var row in detailSet.EnumerateArray())
                {
                    if (row.ValueKind != JsonValueKind.Object)
                    {
                        continue;
                    }
                    yield return row;
                }
            }
        }

        private static IEnumerable<JsonElement> EnumerateClosingCandidates(JsonElement response)
        {
            yield return response;

            if (TryGetPropertyIgnoreCase(response, "data", out var data))
            {
                yield return data;
            }

            if (TryGetPropertyIgnoreCase(response, "Data", out var dataUpper))
            {
                yield return dataUpper;
            }

            foreach (var container in new[] { response, data, dataUpper })
            {
                if (container.ValueKind != JsonValueKind.Object)
                {
                    continue;
                }

                if (TryGetPropertyIgnoreCase(container, "Details", out var details))
                {
                    yield return details;
                }

                if (TryGetPropertyIgnoreCase(container, "details", out var detailsLower))
                {
                    yield return detailsLower;
                }
            }
        }

        private static bool LooksLikeClosingSummaryRow(JsonElement row)
        {
            return HasAnyProperty(row,
                "Balance",
                "InterestPayable",
                "InterestReceivable",
                "PenaltyReceivable",
                "ClosingCharge",
                "ChargeCurrencyID",
                "TaxAmount",
                "CurrencyID");
        }

        private static bool LooksLikeClosingComponentRow(JsonElement row)
        {
            return HasAnyProperty(row,
                "ComponentID",
                "TrxBranchID",
                "AccountTypeID",
                "AccountID",
                "MainGLID");
        }

        private static bool HasAnyProperty(JsonElement row, params string[] propertyNames)
        {
            foreach (var propertyName in propertyNames)
            {
                if (TryGetPropertyIgnoreCase(row, propertyName, out _))
                {
                    return true;
                }
            }

            return false;
        }

        private static IEnumerable<JsonElement> EnumerateDetailSets(JsonElement response, params string[] preferredPropertyNames)
        {
            var yielded = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var propertyName in preferredPropertyNames ?? Array.Empty<string>())
            {
                foreach (var detailSet in EnumerateDetailSetsByName(response, propertyName))
                {
                    if (yielded.Add(detailSet.GetRawText()))
                    {
                        yield return detailSet;
                    }
                }
            }

            foreach (var detailSet in EnumerateDetailSets(response))
            {
                if (yielded.Add(detailSet.GetRawText()))
                {
                    yield return detailSet;
                }
            }
        }

        private static IEnumerable<JsonElement> EnumerateDetailSets(JsonElement response)
        {
            foreach (var propertyName in new[] { "Details", "Details01", "Details1", "Details02", "details", "details01", "details1", "details02" })
            {
                foreach (var detailSet in EnumerateDetailSetsByName(response, propertyName))
                {
                    yield return detailSet;
                }
            }
        }

        private static IEnumerable<JsonElement> EnumerateDetailSetsByName(JsonElement response, string propertyName)
        {
            if (!TryGetPropertyIgnoreCase(response, propertyName, out var propertyValue))
            {
                yield break;
            }

            if (propertyValue.ValueKind == JsonValueKind.Array)
            {
                yield return propertyValue;
                yield break;
            }

            if (propertyValue.ValueKind != JsonValueKind.Object)
            {
                yield break;
            }

            foreach (var nestedPropertyName in new[] { propertyName, "Details", "Details01", "Details1", "Details02", "details", "details01", "details1", "details02" })
            {
                if (TryGetPropertyIgnoreCase(propertyValue, nestedPropertyName, out var nestedValue)
                    && nestedValue.ValueKind == JsonValueKind.Array)
                {
                    yield return nestedValue;
                }
            }
        }

        private static string? FindStatusCodeInDetailSets(JsonElement response)
        {
            foreach (var detailSet in EnumerateDetailSets(response))
            {
                foreach (var row in detailSet.EnumerateArray())
                {
                    var code = GetString(row, "ResponseCode", "responseCode", "Status", "status");
                    if (!string.IsNullOrWhiteSpace(code))
                    {
                        return code;
                    }
                }
            }

            return null;
        }

        private static string? FindStatusMessageInDetailSets(JsonElement response)
        {
            foreach (var detailSet in EnumerateDetailSets(response))
            {
                foreach (var row in detailSet.EnumerateArray())
                {
                    var message = GetString(row, "ResponseMessage", "responseMessage", "Message", "message", "ErrorMessage", "errorMessage");
                    if (!string.IsNullOrWhiteSpace(message))
                    {
                        return message;
                    }
                }
            }

            return null;
        }

        private static string? GetString(JsonElement element, params string[] propertyNames)
        {
            foreach (var propertyName in propertyNames)
            {
                if (!TryGetPropertyIgnoreCase(element, propertyName, out var propertyValue))
                {
                    continue;
                }

                var value = ConvertElementToString(propertyValue);
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }

            return null;
        }

        private static string? ConvertElementToString(JsonElement element)
        {
            return element.ValueKind switch
            {
                JsonValueKind.String => element.GetString(),
                JsonValueKind.Number => element.ToString(),
                JsonValueKind.True => bool.TrueString,
                JsonValueKind.False => bool.FalseString,
                _ => null
            };
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

        private sealed class AccountClassificationLookupOption
        {
            public string Value { get; init; } = string.Empty;
            public string Text { get; init; } = string.Empty;
            public string CodeID { get; init; } = string.Empty;
            public string SubCodeID { get; init; } = string.Empty;
            public string CodeDescription { get; init; } = string.Empty;
        }

        private async Task<IEnumerable<SelectListItem>> LoadAccountClassificationCodeOptionsAsync()
        {
            var requestData = BuildAccountClassificationCodeLookupRequest("02");

            var rows = await GetLegacyUserCodesAsync(OldApiDBConstants.GET_ALL_USER_CODES, requestData, "Details", "Details01");
            if (rows.Count == 0)
            {
                rows = GetDefaultAccountClassificationCodeRows();
            }

            return rows.Select(row => new SelectListItem
            {
                Value = row.Value,
                Text = row.Text
            }).ToList();
        }

        private async Task<List<AccountClassificationLookupOption>> GetLegacyUserCodesAsync(string formId, Dictionary<string, object> requestData, params string[] preferredDetailSetNames)
        {
            var response = await _oldApiService.CreateAsync<JsonElement>(
                "OldApi",
                formId,
                requestData);

            var results = new List<AccountClassificationLookupOption>();
            var seenValues = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var detailSet in EnumerateDetailSets(response, preferredDetailSetNames))
            {
                foreach (var row in detailSet.EnumerateArray())
                {
                    var value = GetString(row, "SubCodeID", "CodeID", "ID", "Value");
                    if (string.IsNullOrWhiteSpace(value) || !seenValues.Add(value))
                    {
                        continue;
                    }

                    var text = GetString(row, "CodeDescription", "Description", "Name", "Text") ?? value;
                    results.Add(new AccountClassificationLookupOption
                    {
                        Value = value,
                        Text = text,
                        CodeID = GetString(row, "CodeID", "SubCodeID", "ID", "Value") ?? value,
                        SubCodeID = GetString(row, "SubCodeID", "CodeID", "ID", "Value") ?? value,
                        CodeDescription = text
                    });
                }

            }

            return results;
        }

        private static List<AccountClassificationLookupOption> GetDefaultAccountClassificationCodeRows()
        {
            return new List<AccountClassificationLookupOption>
            {
                new() { Value = "01", Text = "DEPOSIT ECONOMIC SECTOR", CodeID = "01", SubCodeID = "01", CodeDescription = "DEPOSIT ECONOMIC SECTOR" },
                new() { Value = "02", Text = "GEOGRAPHICAL REGION", CodeID = "02", SubCodeID = "02", CodeDescription = "GEOGRAPHICAL REGION" },
                new() { Value = "03", Text = "ADVANCES ECONOMIC SECTOR", CodeID = "03", SubCodeID = "03", CodeDescription = "ADVANCES ECONOMIC SECTOR" },
                new() { Value = "04", Text = "RISK CLASSIFICATION OF ADVANES", CodeID = "04", SubCodeID = "04", CodeDescription = "RISK CLASSIFICATION OF ADVANES" },
                new() { Value = "05", Text = "CATEGORY", CodeID = "05", SubCodeID = "05", CodeDescription = "CATEGORY" },
                new() { Value = "06", Text = "RESIDENT FOREIGN CURRENCY", CodeID = "06", SubCodeID = "06", CodeDescription = "RESIDENT FOREIGN CURRENCY" },
                new() { Value = "07", Text = "TYPE OF INDUSTRY", CodeID = "07", SubCodeID = "07", CodeDescription = "TYPE OF INDUSTRY" },
                new() { Value = "08", Text = "TYPE OF BUSINESS", CodeID = "08", SubCodeID = "08", CodeDescription = "TYPE OF BUSINESS" },
                new() { Value = "09", Text = "ACCOUNT TYPE", CodeID = "09", SubCodeID = "09", CodeDescription = "ACCOUNT TYPE" }
            };
        }

        private static string? GetRequestValue(IDictionary<string, object> requestData, params string[] keys)
        {
            foreach (var key in keys)
            {
                if (!requestData.TryGetValue(key, out var rawValue) || rawValue == null)
                {
                    continue;
                }

                var value = rawValue.ToString();
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }

            return null;
        }

        private Dictionary<string, object> BuildAccountClassificationCodeLookupRequest(string moduleId)
        {
            return new Dictionary<string, object>
            {
                ["ModuleID"] = string.IsNullOrWhiteSpace(moduleId) ? "02" : moduleId
            };
        }

        private Dictionary<string, object> BuildAccountClassificationSubCodeLookupRequest(string classificationCode, IDictionary<string, object> requestData)
        {
            return new Dictionary<string, object>
            {
                ["ID"] = classificationCode,
                ["OperatorID"] = GetRequestValue(requestData, "OperatorID")
                    ?? _commonUtilities.ResolveSessionValue("user_name", "user_id")
                    ?? "web_portal",
                ["OurBranchID"] = GetRequestValue(requestData, "OurBranchID")
                    ?? _commonUtilities.ResolveSessionValue("branch_code", "branch_id")
                    ?? string.Empty
            };
        }

        // ============================================================================
        // BLOCKING
        // ============================================================================

        [HttpPost]
        [Route("api/block-entity")]
        public async Task<IActionResult> BlockEntity([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.BLOCK_ENTITY,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error blocking entity");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/unblock-entity")]
        public async Task<IActionResult> UnblockEntity([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.UNBLOCK_ENTITY,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error unblocking entity");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/get-blocked-history")]
        public async Task<IActionResult> GetBlockedHistory([FromBody] GenericAccountRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_BLOCKED_HISTORY,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting blocked history");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/get-blocked-details")]
        public async Task<IActionResult> GetBlockedDetails([FromBody] GenericAccountRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_BLOCKED_DETAILS,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting blocked details");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        // ============================================================================
        // CHARGE RATES
        // ============================================================================

        [HttpPost]
        [Route("api/get-account-charge-rate")]
        public async Task<IActionResult> GetAccountChargeRate([FromBody] AccountChargeRateRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_ACCOUNT_CHARGE_RATE,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account charge rate");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/add-account-charge-rate")]
        public async Task<IActionResult> AddAccountChargeRate([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.ADD_ACCOUNT_CHARGE_RATE,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding account charge rate");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/update-account-charge-rate")]
        public async Task<IActionResult> UpdateAccountChargeRate([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.UPDATE_ACCOUNT_CHARGE_RATE,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating account charge rate");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/delete-account-charge-rate")]
        public async Task<IActionResult> DeleteAccountChargeRate([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.DELETE_ACCOUNT_CHARGE_RATE,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting account charge rate");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        // ============================================================================
        // ACCOUNT SWEEPING
        // ============================================================================

        [HttpPost]
        [Route("api/get-account-sweeping")]
        public async Task<IActionResult> GetAccountSweeping([FromBody] GenericAccountRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_ACCOUNT_SWEEPING,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account sweeping");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/add-account-sweeping")]
        public async Task<IActionResult> AddAccountSweeping([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.ADD_ACCOUNT_SWEEPING,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding account sweeping");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/update-account-sweeping")]
        public async Task<IActionResult> UpdateAccountSweeping([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.UPDATE_ACCOUNT_SWEEPING,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating account sweeping");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/delete-account-sweeping")]
        public async Task<IActionResult> DeleteAccountSweeping([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.DELETE_ACCOUNT_SWEEPING,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting account sweeping");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        // ============================================================================
        // ACCOUNT CLASSIFICATION
        // ============================================================================

        [HttpPost]
        [Route("api/get-account-classification")]
        public async Task<IActionResult> GetAccountClassification([FromBody] GenericAccountRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_ACCOUNT_CLASSIFICATION,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account classification");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/get-account-classification-codes")]
        public async Task<IActionResult> GetAccountClassificationCodes([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestData = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                var moduleId = GetRequestValue(requestData, "ModuleID") ?? "02";
                var procedureRequest = BuildAccountClassificationCodeLookupRequest(moduleId);

                var response = await GetLegacyUserCodesAsync(OldApiDBConstants.GET_ALL_USER_CODES, procedureRequest, "Details", "Details01");

                return Ok(new
                {
                    Success = true,
                    Details = response.Count > 0 ? response : GetDefaultAccountClassificationCodeRows()
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account classification codes");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/get-account-classification-subcodes")]
        public async Task<IActionResult> GetAccountClassificationSubCodes([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestData = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                var classificationCode = GetRequestValue(requestData, "ID", "ClassificationCode", "ClassificationCodeID", "ClassReq");
                if (string.IsNullOrWhiteSpace(classificationCode))
                {
                    return Ok(new
                    {
                        Success = true,
                        Details = Array.Empty<AccountClassificationLookupOption>()
                    });
                }

                var procedureRequest = BuildAccountClassificationSubCodeLookupRequest(classificationCode, requestData);

                var response = await GetLegacyUserCodesAsync(OldApiDBConstants.GET_USER_CODES, procedureRequest, "Details02", "details02");

                return Ok(new
                {
                    Success = true,
                    Details = response
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account classification sub codes");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/add-account-classification")]
        public async Task<IActionResult> AddAccountClassification([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.ADD_ACCOUNT_CLASSIFICATION,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding account classification");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/update-account-classification")]
        public async Task<IActionResult> UpdateAccountClassification([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.UPDATE_ACCOUNT_CLASSIFICATION,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating account classification");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/delete-account-classification")]
        public async Task<IActionResult> DeleteAccountClassification([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.DELETE_ACCOUNT_CLASSIFICATION,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting account classification");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        // ============================================================================
        // USER DEFINED FIELDS
        // NOTE: Backend stored procedures not yet implemented - returning stub response
        // ============================================================================

        [HttpPost]
        [Route("api/get-user-defined-fields")]
        public IActionResult GetUserDefinedFields([FromBody] GenericAccountRequest request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

            // Return empty data with success - feature not yet implemented in backend
            _logger.LogInformation("GetUserDefinedFields called - backend feature not yet implemented");
            return Ok(new
            {
                Success = true,
                Message = "User Defined Fields feature is not yet available.",
                Details = Array.Empty<object>(),
                Data = Array.Empty<object>()
            });
        }

        [HttpPost]
        [Route("api/add-user-defined-fields")]
        public IActionResult AddUserDefinedFields([FromBody] JsonElement request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

            // Feature not yet implemented in backend
            _logger.LogInformation("AddUserDefinedFields called - backend feature not yet implemented");
            return Ok(new
            {
                Success = false,
                Message = "User Defined Fields feature is not yet available. This feature will be enabled in a future release."
            });
        }

        [HttpPost]
        [Route("api/update-user-defined-fields")]
        public IActionResult UpdateUserDefinedFields([FromBody] JsonElement request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

            // Feature not yet implemented in backend
            _logger.LogInformation("UpdateUserDefinedFields called - backend feature not yet implemented");
            return Ok(new
            {
                Success = false,
                Message = "User Defined Fields feature is not yet available. This feature will be enabled in a future release."
            });
        }

        [HttpPost]
        [Route("api/delete-user-defined-fields")]
        public IActionResult DeleteUserDefinedFields([FromBody] JsonElement request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

            // Feature not yet implemented in backend
            _logger.LogInformation("DeleteUserDefinedFields called - backend feature not yet implemented");
            return Ok(new
            {
                Success = false,
                Message = "User Defined Fields feature is not yet available. This feature will be enabled in a future release."
            });
        }

        // ============================================================================
        // ACCOUNT NOTIFICATION
        // ============================================================================

        [HttpPost]
        [Route("api/get-account-notification")]
        public async Task<IActionResult> GetAccountNotification([FromBody] GenericAccountRequest request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

            try
            {
                if (string.IsNullOrWhiteSpace(request.OperatorID))
                    request.OperatorID = HttpContext.Session.GetString("user_name") ?? "SYSTEM";

                // SP p_GetProductNotificationDetails accepts exactly 3 parameters
                var payload = new
                {
                    AccountID = request.AccountID,
                    ModuleID = request.ModuleID ?? 2091,
                    ProductID = request.RelevantID ?? request.AccountTypeID ?? "null"
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_PRODUCT_NOTIFICATION_DETAILS,
                    payload);

                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account notifications");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/add-account-notification")]
        public async Task<IActionResult> AddAccountNotification([FromBody] AccountNotificationSaveRequest request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

            try
            {
                if (string.IsNullOrWhiteSpace(request.OperatorID))
                    request.OperatorID = HttpContext.Session.GetString("user_name") ?? "SYSTEM";
                if (string.IsNullOrWhiteSpace(request.OurBranchID))
                    request.OurBranchID = HttpContext.Session.GetString("branch_code") ?? string.Empty;

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.EDIT_ACCOUNT_PRODUCT_NOTIFICATION,
                    request);

                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding account notification");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/update-account-notification")]
        public async Task<IActionResult> UpdateAccountNotification([FromBody] AccountNotificationSaveRequest request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

            try
            {
                if (string.IsNullOrWhiteSpace(request.OperatorID))
                    request.OperatorID = HttpContext.Session.GetString("user_name") ?? "SYSTEM";
                if (string.IsNullOrWhiteSpace(request.OurBranchID))
                    request.OurBranchID = HttpContext.Session.GetString("branch_code") ?? string.Empty;

                // SP p_EditAccountProductNotification accepts exactly these 5 parameters
                var payload = new
                {
                    XMLData = request.XMLData ?? string.Empty,
                    OperatorID = request.OperatorID,
                    ProductID = request.ProductID ?? "null",
                    BranchID = request.OurBranchID,
                    AccountID = request.AccountID ?? string.Empty
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.EDIT_ACCOUNT_PRODUCT_NOTIFICATION,
                    payload);

                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating account notification");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/delete-account-notification")]
        public async Task<IActionResult> DeleteAccountNotification([FromBody] GenericAccountRequest request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

            try
            {
                if (string.IsNullOrWhiteSpace(request.OperatorID))
                    request.OperatorID = HttpContext.Session.GetString("user_name") ?? "SYSTEM";
                if (string.IsNullOrWhiteSpace(request.OurBranchID))
                    request.OurBranchID = HttpContext.Session.GetString("branch_code") ?? string.Empty;

                var payload = new
                {
                    request.AccountID,
                    request.OurBranchID,
                    request.OperatorID,
                    NotificationID = request.SearchID ?? string.Empty
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.EDIT_ACCOUNT_PRODUCT_NOTIFICATION,
                    payload);

                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting account notification");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        // ============================================================================
        // CARD MAINTENANCE
        // NOTE: Backend stored procedures not yet implemented - returning stub response
        // ============================================================================

        [HttpPost]
        [Route("api/get-next-tracking-card-id")]
        public async Task<IActionResult> GetNextTrackingCardId([FromBody] GenericAccountRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_NEXT_TRACKING_CARD_ID,
                    new
                    {
                        BankID = HttpContext.Session.GetString("bank_id") ?? "00",
                        OurBranchID = request.OurBranchID,
                        AccountID = request.AccountID
                    }
                );

                return Ok(new { Success = true, data = response });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting next tracking card ID");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/get-account-card")]
        public async Task<IActionResult> GetAccountCard([FromBody] GenericAccountRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_ACCOUNT_CARD,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account cards");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/add-account-card")]
        public async Task<IActionResult> AddAccountCard([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.ADD_ACCOUNT_CARD,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding account card");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/update-account-card")]
        public async Task<IActionResult> UpdateAccountCard([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.UPDATE_ACCOUNT_CARD,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating account card");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/delete-account-card")]
        public async Task<IActionResult> DeleteAccountCard([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.DELETE_ACCOUNT_CARD,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting account card");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        // ============================================================================
        // STOP PAYMENT
        // ============================================================================

        [HttpPost]
        [Route("api/get-stop-payments")]
        public async Task<IActionResult> GetStopPayments([FromBody] GenericAccountRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_STOP_PAYMENTS,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting stop payments");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/add-stop-payment")]
        public async Task<IActionResult> AddStopPayment([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.ADD_STOP_PAYMENT,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding stop payment");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/update-stop-payment")]
        public async Task<IActionResult> UpdateStopPayment([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.UPDATE_STOP_PAYMENT,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating stop payment");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/delete-stop-payment")]
        public async Task<IActionResult> DeleteStopPayment([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.DELETE_STOP_PAYMENT,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting stop payment");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        // ============================================================================
        // DORMANT ACCOUNT
        // ============================================================================

        [HttpPost]
        [Route("api/get-account-dormant")]
        public async Task<IActionResult> GetAccountDormant([FromBody] GenericAccountRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_ACCOUNT_DORMANT,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account dormant");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/edit-account-dormant")]
        public async Task<IActionResult> EditAccountDormant([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.EDIT_ACCOUNT_DORMANT,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error editing account dormant");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        // ============================================================================
        // ACCOUNT ACTIVATION
        // ============================================================================

        [HttpPost]
        [Route("api/get-account-activation")]
        public async Task<IActionResult> GetAccountActivation([FromBody] GenericAccountRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_ACCOUNT_ACTIVATION,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account activation");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/update-account-activation")]
        public async Task<IActionResult> UpdateAccountActivation([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.UPDATE_ACCOUNT_ACTIVATION,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating account activation");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        // ============================================================================
        // ACCOUNT TRANSFER
        // ============================================================================

        [HttpPost]
        [Route("api/get-account-transfer-details")]
        public async Task<IActionResult> GetAccountTransferDetails([FromBody] GenericAccountRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_ACCOUNT_TRANSFER_DETAILS,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account transfer details");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/add-account-transfer-details")]
        public async Task<IActionResult> AddAccountTransferDetails([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.ADD_ACCOUNT_TRANSFER_DETAILS,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding account transfer details");
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
                    "AccountManagementApi",
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

                // Inject session data
                requestData.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(requestData.OurBranchID))
                {
                    requestData.OurBranchID = HttpContext.Session.GetString("branch_code");
                }

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
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
        public async Task<IActionResult> UpdateAccount([FromBody] JsonNode requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                // Get OperatorID - prefer client value, fallback to server session
                var operatorId = !string.IsNullOrEmpty(requestData["OperatorID"]?.ToString())
                    ? requestData["OperatorID"]!.ToString()
                    : _commonUtilities.ResolveSessionValue("user_name", "user_id");

                // Set OperatorID
                requestData["OperatorID"] = operatorId;

                // Use client-provided ModifiedBy if valid, otherwise use OperatorID
                if (string.IsNullOrEmpty(requestData["ModifiedBy"]?.ToString()))
                {
                    requestData["ModifiedBy"] = operatorId;
                }

                // Set OurBranchID if not provided
                if (string.IsNullOrEmpty(requestData["OurBranchID"]?.ToString()))
                {
                    requestData["OurBranchID"] = _commonUtilities.ResolveSessionValue("branch_code", "branch_id") ?? string.Empty;
                }

                // Set BankID
                if (requestData["BankID"] == null)
                {
                    requestData["BankID"] = "00";
                }

                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString() ?? "AM");
                _logger.LogInformation("account-maintenance.update request: {Request}", JsonSerializer.Serialize(requestData));

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.EDIT_ACCOUNT,
                    requestData
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: account-maintenance.update");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        /// <summary>
        /// API endpoint - Create new account
        /// </summary>
        [HttpPost]
        [Route("create-account")]
        public async Task<IActionResult> CreateAccount([FromBody] JsonNode requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                // Get OperatorID - prefer client value, fallback to server session
                var operatorId = !string.IsNullOrEmpty(requestData["OperatorID"]?.ToString())
                    ? requestData["OperatorID"]!.ToString()
                    : _commonUtilities.ResolveSessionValue("user_name", "user_id");

                // Set OperatorID, CreatedBy, and OpenedBy to OperatorID value
                requestData["OperatorID"] = operatorId;

                // Use client-provided CreatedBy if valid, otherwise use OperatorID
                if (string.IsNullOrEmpty(requestData["CreatedBy"]?.ToString()))
                {
                    requestData["CreatedBy"] = operatorId;
                }

                // Use client-provided OpenedBy if valid, otherwise use OperatorID
                if (string.IsNullOrEmpty(requestData["OpenedBy"]?.ToString()))
                {
                    requestData["OpenedBy"] = operatorId;
                }

                // Set OurBranchID if not provided
                if (string.IsNullOrEmpty(requestData["OurBranchID"]?.ToString()))
                {
                    requestData["OurBranchID"] = _commonUtilities.ResolveSessionValue("branch_code", "branch_id") ?? string.Empty;
                }

                // Set BankID
                if (requestData["BankID"] == null)
                {
                    requestData["BankID"] = "00";
                }

                // Set RequestID if empty
                if (string.IsNullOrEmpty(requestData["RequestID"]?.ToString()))
                {
                    requestData["RequestID"] = HttpContext!.Connection.Id;
                }

                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString() ?? "AM");
                _logger.LogInformation("account-maintenance.create request: {Request}", JsonSerializer.Serialize(requestData));

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.CREATE_ACCOUNT,
                    requestData
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: account-maintenance.create");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        /// <summary>
        /// API endpoint - Get client basic details (for account creation auto-populate)
        /// </summary>
        [HttpPost]
        [Route("get-client-basic-details")]
        public async Task<IActionResult> GetClientBasicDetails([FromBody] GetClientBasicDetailsRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });
                }

                _logger.LogInformation("Get client basic details request: {Request}", JsonSerializer.Serialize(requestData));

                // Inject session data with fallbacks (following ClientMaintenanceControllerBase pattern)
                if (string.IsNullOrWhiteSpace(requestData.OperatorID))
                {
                    requestData.OperatorID = HttpContext.Session.GetString("user_name")
                        ?? HttpContext.Session.GetString("user_id")
                        ?? "web_portal";
                }

                if (string.IsNullOrWhiteSpace(requestData.OurBranchID))
                {
                    requestData.OurBranchID = HttpContext.Session.GetString("branch_code")
                        ?? HttpContext.Session.GetString("branch_id")
                        ?? "0101";
                }

                // Get BankID from session (required field)
                var bankId = HttpContext.Session.GetString("bank_id")
                    ?? HttpContext.Session.GetString("bank_code")
                    ?? "00";

                // Request structure matching ClientMaintenanceCrudRequest (required for GET_CLIENT_BASIC_DETAILS)
                // ClientTypeID is required by the API validation
                var apiRequest = new
                {
                    ClientID = requestData.ClientID,
                    OurBranchID = requestData.OurBranchID,
                    OperatorID = requestData.OperatorID,
                    BankID = bankId,
                    ClientTypeID = "I"  // Required field - default to Individual, backend will return actual type
                };

                _logger.LogInformation("Sending to ClientManagement API: {ApiRequest}", JsonSerializer.Serialize(apiRequest));

                var response = await _apiService.CreateAsync<JsonElement>(
                    "ClientManagementApi",
                    ApiEndpoints.GET_CLIENT_BASIC_DETAILS,
                    apiRequest
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving client basic details");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error retrieving client details: {ex.Message}"
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
                    "AccountManagementApi",
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
                    "AccountManagementApi",
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
                    "AccountManagementApi",
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

        // ============================================================================
        // VIEW SUBMODULES - READ-ONLY DATA RETRIEVAL
        // ============================================================================

        /// <summary>
        /// API endpoint - Get client portfolio for account maintenance
        /// </summary>
        [HttpPost]
        [Route("api/get-client-portfolio")]
        public async Task<IActionResult> GetClientPortfolio([FromBody] GenericAccountRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var payload = new
                {
                    OurBranchID = request.OurBranchID,
                    ClientID = request.SearchID ?? request.SearchKey,
                    OperatorID = request.OperatorID,
                    Base = request.ModuleTypeID ?? "A"
                };

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_CLIENT_PORTFOLIO,
                    payload
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting client portfolio");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        /// <summary>
        /// API endpoint - Get loan repayment details/schedule
        /// </summary>
        [HttpPost]
        [Route("api/get-loan-repayment-schedule")]
        public async Task<IActionResult> GetLoanRepaymentSchedule([FromBody] GenericAccountRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var payload = new
                {
                    OurBranchID = request.OurBranchID,
                    AccountID = request.AccountID,
                    OperatorID = request.OperatorID
                };

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_LOAN_REPAYMENT_DETAILS,
                    payload
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting loan repayment schedule");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        /// <summary>
        /// API endpoint - Get debit interest worksheet
        /// </summary>
        [HttpPost]
        [Route("api/get-debit-interest-worksheet")]
        public async Task<IActionResult> GetDebitInterestWorksheet([FromBody] InterestWorksheetRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                // Pass only the expected parameters to the stored procedure
                var apiRequest = new
                {
                    FromDate = request.FromDate,
                    ToDate = request.ToDate,
                    OurBranchID = request.OurBranchID,
                    AccountID = request.AccountID,
                    ClientID = request.ClientID
                };

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_DEBIT_INTEREST_WORKSHEET,
                    apiRequest
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting debit interest worksheet");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        /// <summary>
        /// API endpoint - Get credit interest worksheet
        /// </summary>
        [HttpPost]
        [Route("api/get-credit-interest-worksheet")]
        public async Task<IActionResult> GetCreditInterestWorksheet([FromBody] InterestWorksheetRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                // Pass only the expected parameters to the stored procedure
                var apiRequest = new
                {
                    FromDate = request.FromDate,
                    ToDate = request.ToDate,
                    OurBranchID = request.OurBranchID,
                    AccountID = request.AccountID,
                    ClientID = request.ClientID
                };

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_CREDIT_INTEREST_WORKSHEET,
                    apiRequest
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting credit interest worksheet");
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
        public string? OurBranchID { get; set; }
        public string? ClientID { get; set; }
        public string? OperatorID { get; set; }
        public int Direction { get; set; }
        public string? DirectionType { get; set; }
    }

    public class AccountUpdateRequest
    {
        // Key identifiers
        public string? AccountNumber { get; set; }
        public string? AccountID { get; set; }
        public string? OurBranchID { get; set; }
        public string? ClientID { get; set; }
        public string? ProductID { get; set; }

        // Account details
        public string? AccountName { get; set; }
        public string? Name { get; set; }  // Database column name (t_AccountCustomer.Name)
        public string? ShortName { get; set; }
        public string? ProductCode { get; set; }
        public string? CurrencyCode { get; set; }
        public string? CurrencyID { get; set; }
        public string? Status { get; set; }

        // Address fields
        public string? Address1 { get; set; }
        public string? Address2 { get; set; }
        public string? CityID { get; set; }
        public string? CountryID { get; set; }

        // Contact fields
        public string? PhoneHome { get; set; }
        public string? Phone1 { get; set; }  // API field name
        public string? PhoneWork { get; set; }
        public string? Phone2 { get; set; }  // API field name
        public string? Fax { get; set; }
        public string? Mobile { get; set; }
        public string? EmailID { get; set; }
        public string? ContactPerson { get; set; }

        // Operating details
        public string? OperatingModeID { get; set; }
        public string? OperatingInstructions { get; set; }

        // Classification and officers
        public string? AccountClassID { get; set; }
        public string? AccountOfficerID { get; set; }
        public string? LiquidationAccountID { get; set; }
        public string? SalesOfficerID { get; set; }

        // Passbook
        public string? PassbookSerialID { get; set; }
        public bool? ExemptPassBook { get; set; }

        // System fields (injected by server)
        public string? UserID { get; set; }
        public string? OperatorID { get; set; }
        public string? BranchID { get; set; }
        public string? BankID { get; set; }

        // Update tracking
        public int? UpdateCount { get; set; }
        public string? ModifiedBy { get; set; }
    }

    public class AccountCreateRequest
    {
        // Key identifiers
        public string? ClientID { get; set; }
        public string? OurBranchID { get; set; }
        public string? ProductID { get; set; }

        // Account details
        public string? AccountName { get; set; }
        public string? Name { get; set; }  // Database column name (t_AccountCustomer.Name)
        public string? ShortName { get; set; }
        public string? ProductCode { get; set; }
        public string? CurrencyCode { get; set; }
        public string? CurrencyID { get; set; }
        public string? AccountTypeCode { get; set; }

        // Address fields
        public string? Address1 { get; set; }
        public string? Address2 { get; set; }
        public string? CityID { get; set; }
        public string? CountryID { get; set; }

        // Contact fields
        public string? PhoneHome { get; set; }
        public string? Phone1 { get; set; }  // API field name
        public string? PhoneWork { get; set; }
        public string? Phone2 { get; set; }  // API field name
        public string? Fax { get; set; }
        public string? Mobile { get; set; }
        public string? EmailID { get; set; }
        public string? ContactPerson { get; set; }

        // Operating details
        public string? OperatingModeID { get; set; }
        public string? OperatingInstructions { get; set; }

        // Classification and officers
        public string? AccountClassID { get; set; }
        public string? AccountOfficerID { get; set; }
        public string? LiquidationAccountID { get; set; }
        public string? SalesOfficerID { get; set; }

        // Passbook
        public string? PassbookSerialID { get; set; }
        public bool? ExemptPassBook { get; set; }

        // System fields (injected by server)
        public string? UserID { get; set; }
        public string? OperatorID { get; set; }
        public string? BranchID { get; set; }
        public string? BankID { get; set; }
        public string? CreatedBy { get; set; }

        // Opening details (not nullable)
        public string? OpenedBy { get; set; }
        public string? OpenedDate { get; set; }
    }

    // ============================================================================
    // NOTES Request DTOs
    // ============================================================================
    public class GetNotesRequest
    {
        public string? AccountId { get; set; }
        public string? SearchKey { get; set; }
        public string? SearchID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public int? ModuleID { get; set; }
    }

    public class UpdateNotesRequest
    {
        public string? AccountId { get; set; }
        public string? SearchKey { get; set; }
        public string? SearchID { get; set; }
        public string? Notes { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public int? ModuleID { get; set; }
    }

    // ============================================================================
    // SIGNATORIES Request DTOs
    // ============================================================================
    public class GetAccountSignatoriesRequest
    {
        public string? AccountID { get; set; }
        public string? SearchKey { get; set; }
        public string? SearchID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public string? BankID { get; set; }
        public int? ModuleID { get; set; }
        public int? Direction { get; set; }      // 0=First, 1=Next, -1=Previous
        public string? SignatoryID { get; set; }  // Current signatory ID for navigation
        public bool? IncludeAgentMandate { get; set; }
        public bool? IncludeClosed { get; set; }
        public int? RequestedReferenceID { get; set; }
    }

    public class AddAccountSignatoriesRequest
    {
        public string? AccountID { get; set; }
        public string? SearchKey { get; set; }
        public string? SearchID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public string? OperatedBy { get; set; }
        public string? OperatedOn { get; set; }
        public string? SupervisedBy { get; set; }
        public string? BankID { get; set; }
        public int? ModuleID { get; set; }
        public string? OperatingModeID { get; set; }
        public string? OperatingInstructionID { get; set; }
        public int? UpdateCount { get; set; }
        public string? SignatoriesXml { get; set; }  // XML format: <ListOfSignatory><Signatory>...</Signatory></ListOfSignatory>
        public object? DetailRecords { get; set; }
    }

    public class EditAccountSignatoriesRequest
    {
        public string? AccountID { get; set; }
        public string? SearchKey { get; set; }
        public string? SearchID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public string? BankID { get; set; }
        public int? ModuleID { get; set; }
        public string? OperatingModeID { get; set; }
        public string? OperatingInstructionID { get; set; }
        public string? SignatoriesXml { get; set; }  // XML format: <ListOfSignatory><Signatory>...</Signatory></ListOfSignatory>
    }

    public class SignatoryItem
    {
        public string? OperatingSeq { get; set; }
        public string? ClientID { get; set; }
        public string? ClientName { get; set; }
        public string? SignatoryTypeID { get; set; }
        public string? SignatoryTypeName { get; set; }
        public string? RowAction { get; set; }  // ADD, UPDATE, REMOVE
    }

    // ============================================================================
    // DOCUMENTS Request DTOs
    // ============================================================================
    public class GetAccountDocumentRequest
    {
        public string? AccountID { get; set; }
        public string? DocumentID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public int? Direction { get; set; }
    }

    public class AddAccountDocumentRequest
    {
        public string? AccountID { get; set; }
        public string? DocumentID { get; set; }
        public string? DocumentTypeID { get; set; }
        public string? DocumentClasses { get; set; }
        public string? ReceivedBy { get; set; }
        public string? ReceivedDate { get; set; }
        public string? ExpiryDate { get; set; }
        public string? ImageID { get; set; }
        public string? LocationID { get; set; }
        public string? Remarks { get; set; }
        public string? OurBranchID { get; set; }
        public string? CreatedBy { get; set; }
        public int? NewRecord { get; set; }
    }

    public class UpdateAccountDocumentRequest
    {
        public string? AccountID { get; set; }
        public string? DocumentID { get; set; }
        public string? DocumentTypeID { get; set; }
        public string? DocumentClasses { get; set; }
        public string? ReceivedBy { get; set; }
        public string? ReceivedDate { get; set; }
        public string? ExpiryDate { get; set; }
        public string? ImageID { get; set; }
        public string? LocationID { get; set; }
        public string? Remarks { get; set; }
        public string? OurBranchID { get; set; }
        public string? CreatedBy { get; set; }
        public int? NewRecord { get; set; }
    }

    public class DeleteAccountDocumentRequest
    {
        public string? AccountID { get; set; }
        public string? DocumentID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
    }

    // ============================================================================
    // FREEZE/RELEASE Request DTOs
    // ============================================================================
    public class GetAccountFreezeRequest
    {
        public string? AccountID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
    }

    public class AddAccountFreezeRequest
    {
        public string? AccountID { get; set; }
        public string? FreezedValue { get; set; }
        public string? FreezedReason { get; set; }
        public string? FreezeAmount { get; set; }
        public string? FreezeReason { get; set; }
        public string? FreezeDate { get; set; }
        public string? FreezedDate { get; set; }
        public string? EffectiveDate { get; set; }
        public string? OurBranchID { get; set; }
        public string? BranchID { get; set; }
        public string? OperatorID { get; set; }
        public string? CreatedBy { get; set; }
        public string? MakerID { get; set; }
        public string? ModifiedBy { get; set; }
        public string? ReferenceID { get; set; }
    }

    public class ReleaseAccountFreezeRequest
    {
        public string? AccountID { get; set; }
        public string? FreezeId { get; set; }
        public string? ReleaseReason { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
    }

    // ============================================================================
    // CHEQUE BOOK Request DTOs
    // ============================================================================
    public class GetChequeBooksRequest
    {
        public string? AccountID { get; set; }
        public string? AccountTypeID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
    }

    public class GetChequeBookRequestsRequest
    {
        public string? AccountID { get; set; }
        public string? AccountTypeID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
    }

    public class AddChequeBookRequest
    {
        public string? AccountID { get; set; }
        public string? AccountTypeID { get; set; }
        public string? BookType { get; set; }
        public string? BookTypeID { get; set; }
        public string? NoOfLeaves { get; set; }
        public string? ChequeStart { get; set; }
        public string? ChequeEnd { get; set; }
        public string? ChequePrefix { get; set; }
        public string? IssueDate { get; set; }
        public string? DateIssued { get; set; }
        public string? RequestDate { get; set; }
        public string? ChequeRequestsID { get; set; }
        public string? ChequeRequestStatusID { get; set; }
        public string? ApprovedBy { get; set; }
        public string? ApprovedOn { get; set; }
        public string? DispatchedBy { get; set; }
        public string? DispatchedOn { get; set; }
        public string? CreatedBy { get; set; }
        public string? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public string? ModifiedOn { get; set; }
        public string? SupervisedBy { get; set; }
        public int? UpdateCount { get; set; }
        public int? NewRecord { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
    }

    // ============================================================================
    // REMINDERS Request DTOs
    // ============================================================================
    public class GetAccountRemindersRequest
    {
        public string? AccountID { get; set; }
        public string? ReminderID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public int? Direction { get; set; }
    }

    public class AddAccountReminderRequest
    {
        public string? AccountID { get; set; }
        public string? ReminderID { get; set; }
        public string? Reminder { get; set; }
        public string? ColorID { get; set; }
        public string? Priority { get; set; }
        public string? ReminderStartDate { get; set; }
        public string? ReminderEndDate { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public string? CreatedBy { get; set; }
        public string? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public string? ModifiedOn { get; set; }
        public string? SupervisedBy { get; set; }
        public string? SupervisedOn { get; set; }
        public int? NewRecord { get; set; }
        public int? UpdateCount { get; set; }
    }

    public class UpdateAccountReminderRequest
    {
        public string? AccountID { get; set; }
        public string? ReminderID { get; set; }
        public string? Reminder { get; set; }
        public string? ColorID { get; set; }
        public string? Priority { get; set; }
        public string? ReminderStartDate { get; set; }
        public string? ReminderEndDate { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public string? CreatedBy { get; set; }
        public string? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public string? ModifiedOn { get; set; }
        public string? SupervisedBy { get; set; }
        public string? SupervisedOn { get; set; }
        public int? NewRecord { get; set; }
        public int? UpdateCount { get; set; }
    }

    public class DeleteAccountReminderRequest
    {
        public string? AccountID { get; set; }
        public string? ReminderID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public int? NewRecord { get; set; }
    }

    // ============================================================================
    // CLIENT DETAILS Request DTO (for account creation auto-populate)
    // ============================================================================
    public class GetClientBasicDetailsRequest
    {
        public string? ClientID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
    }

    // ============================================================================
    // GENERIC ACCOUNT Request DTO (reusable for multiple submodules)
    // ============================================================================
    public class GenericAccountRequest
    {
        public string? AccountID { get; set; }
        public string? AccountTypeID { get; set; }
        public string? AccountNumber { get; set; }
        public string? NomineeClientID { get; set; }
        public string? NomineeID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public string? SearchKey { get; set; }
        public string? SearchID { get; set; }
        public int? Direction { get; set; }
        public int? ModuleID { get; set; }
        public string? ModuleTypeID { get; set; }
        public string? RelevantID { get; set; }
    }

    public class AccountChargeRateRequest
    {
        public string? AccountID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public string? ChargeID { get; set; }
        public string? EffectiveDate { get; set; }
        public int? EffectiveDateID { get; set; }
    }

    public class AccountClosingSaveRequest
    {
        public string? OurBranchID { get; set; }
        public string? AccountID { get; set; }
        public string? CloseReasonID { get; set; }
        public string? CloseReason { get; set; }
        public string? ClosedBy { get; set; }
        public string? OperatorID { get; set; }
        public int? UpdateCount { get; set; }
        public string? Remarks { get; set; }
        public string? SysTrx { get; set; }
        public string? UserTrx { get; set; }
    }

    public class AccountClosingDetailsPayload
    {
        public string? OurBranchID { get; set; }
        public string? AccountID { get; set; }
        public string? OperatorID { get; set; }
    }

    public class AccountClosingProcedureRequest
    {
        public string? OurBranchID { get; set; }
        public string? AccountID { get; set; }
        public string? CloseReasonID { get; set; }
        public string? CloseReason { get; set; }
        public string? ClosedBy { get; set; }
        public int? UpdateCount { get; set; }
        public string? SysTrx { get; set; }
        public string? UserTrx { get; set; }
    }

    // ============================================================================
    // ACCOUNT NOTIFICATION Save Request DTO
    // ============================================================================
    public class AccountNotificationSaveRequest
    {
        public string? AccountID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public string? ProductID { get; set; }
        public string? NotificationID { get; set; }
        public string? NotificationFrequency { get; set; }
        public string? NoOfDays { get; set; }
        public string? ExecutionDate { get; set; }
        public string? XMLData { get; set; }
        public string? SearchKey { get; set; }
    }

    // ============================================================================
    // INTEREST WORKSHEET Request DTO (for debit/credit interest worksheets)
    // ============================================================================
    public class InterestWorksheetRequest
    {
        public string? AccountID { get; set; }
        public string? OurBranchID { get; set; }
        public string? ClientID { get; set; }
        public string? OperatorID { get; set; }
        public string? FromDate { get; set; }
        public string? ToDate { get; set; }
        public string? InterestType { get; set; }  // "D" for Debit, "C" for Credit
        public string? Period { get; set; }        // Period selection (0=Select, 1=This Month, 2=Last Month, 3=Custom)
        public int? PeriodType { get; set; }       // Alias for Period
    }

    // ============================================================================
    // SIGNATORY IMAGE Request DTO (for signature/photo images)
    // ============================================================================
    public class SignatoryImageRequest
    {
        public string? OurBranchID { get; set; }
        public string? SignatoryID { get; set; }
        public string? OperatorID { get; set; }
    }
}
