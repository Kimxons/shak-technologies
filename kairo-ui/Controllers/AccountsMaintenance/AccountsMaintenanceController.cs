using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

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
                    "MandatesID"
                });

                dropdownOptions.TryGetValue("SignatoryTypeID", out var signatoryTypeOptions);
                dropdownOptions.TryGetValue("MandatesID", out var mandatesOptions);

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
                    "CeilingAmountTypeID",
                    "CalculationMethodID"
                });

                dropdownOptions.TryGetValue("CeilingAmountTypeID", out var ceilingAmountTypeOptions);
                dropdownOptions.TryGetValue("CalculationMethodID", out var calculationMethodOptions);

                ViewData["CeilingAmountTypeOptions"] = ceilingAmountTypeOptions ?? Enumerable.Empty<SelectListItem>();
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
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "AssetClassificationID",
                    "AssetSubClassificationID"
                });

                dropdownOptions.TryGetValue("AssetClassificationID", out var classificationCodeOptions);
                dropdownOptions.TryGetValue("AssetSubClassificationID", out var classificationSubCodeOptions);

                ViewData["ClassificationCodeOptions"] = classificationCodeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["ClassificationSubCodeOptions"] = classificationSubCodeOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading AccountClassification dropdown options");
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
                    "FrequencyID"
                });

                dropdownOptions.TryGetValue("FrequencyID", out var frequencyOptions);

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
                    "StopPaymentReasonID"
                });

                dropdownOptions.TryGetValue("StopPaymentReasonID", out var reasonOptions);

                ViewData["StopPaymentReasonOptions"] = reasonOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading StopPaymentVoid dropdown options");
            }

            return PartialView("StopPaymentVoid");
        }

        [Route("CancelStopPayment")]
        public async Task<IActionResult> CancelStopPayment()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            try
            {
                // Use same reason code as StopPaymentVoid since cancel uses same reasons
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "StopPaymentReasonID"
                });

                dropdownOptions.TryGetValue("StopPaymentReasonID", out var reasonOptions);

                ViewData["CancelStopPaymentReasonOptions"] = reasonOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading CancelStopPayment dropdown options");
            }

            return PartialView("CancelStopPayment");
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
        public async Task<IActionResult> GetAccountInterestRate([FromBody] GenericAccountRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_ACCOUNT_INTEREST_RATE,
                    request
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

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.DELETE_ACCOUNT_INTEREST_RATE,
                    request
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

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_ACCOUNT_CLOSING_DETAILS,
                    requestDict
                );

                return Ok(response);
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

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.CLOSE_ACCOUNT,
                    requestDict
                );

                return Ok(response);
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
        public async Task<IActionResult> GetAccountChargeRate([FromBody] GenericAccountRequest request)
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
        // NOTE: Backend stored procedures not yet implemented - returning stub response
        // ============================================================================

        [HttpPost]
        [Route("api/get-account-notification")]
        public IActionResult GetAccountNotification([FromBody] GenericAccountRequest request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

            // Return empty data with success - feature not yet implemented in backend
            _logger.LogInformation("GetAccountNotification called - backend feature not yet implemented");
            return Ok(new
            {
                Success = true,
                Message = "Account Notification feature is not yet available.",
                Details = Array.Empty<object>(),
                Data = Array.Empty<object>()
            });
        }

        [HttpPost]
        [Route("api/add-account-notification")]
        public IActionResult AddAccountNotification([FromBody] JsonElement request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

            // Feature not yet implemented in backend
            _logger.LogInformation("AddAccountNotification called - backend feature not yet implemented");
            return Ok(new
            {
                Success = false,
                Message = "Account Notification feature is not yet available. This feature will be enabled in a future release."
            });
        }

        [HttpPost]
        [Route("api/update-account-notification")]
        public IActionResult UpdateAccountNotification([FromBody] JsonElement request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

            // Feature not yet implemented in backend
            _logger.LogInformation("UpdateAccountNotification called - backend feature not yet implemented");
            return Ok(new
            {
                Success = false,
                Message = "Account Notification feature is not yet available. This feature will be enabled in a future release."
            });
        }

        [HttpPost]
        [Route("api/delete-account-notification")]
        public IActionResult DeleteAccountNotification([FromBody] JsonElement request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

            // Feature not yet implemented in backend
            _logger.LogInformation("DeleteAccountNotification called - backend feature not yet implemented");
            return Ok(new
            {
                Success = false,
                Message = "Account Notification feature is not yet available. This feature will be enabled in a future release."
            });
        }

        // ============================================================================
        // CARD MAINTENANCE
        // NOTE: Backend stored procedures not yet implemented - returning stub response
        // ============================================================================

        [HttpPost]
        [Route("api/get-account-card")]
        public IActionResult GetAccountCard([FromBody] GenericAccountRequest request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

            // Return empty data with success - feature not yet implemented in backend
            _logger.LogInformation("GetAccountCard called - backend feature not yet implemented");
            return Ok(new
            {
                Success = true,
                Message = "Card Maintenance feature is not yet available.",
                Details = Array.Empty<object>(),
                Data = Array.Empty<object>()
            });
        }

        [HttpPost]
        [Route("api/add-account-card")]
        public IActionResult AddAccountCard([FromBody] JsonElement request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

            // Feature not yet implemented in backend
            _logger.LogInformation("AddAccountCard called - backend feature not yet implemented");
            return Ok(new
            {
                Success = false,
                Message = "Card Maintenance feature is not yet available. This feature will be enabled in a future release."
            });
        }

        [HttpPost]
        [Route("api/update-account-card")]
        public IActionResult UpdateAccountCard([FromBody] JsonElement request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

            // Feature not yet implemented in backend
            _logger.LogInformation("UpdateAccountCard called - backend feature not yet implemented");
            return Ok(new
            {
                Success = false,
                Message = "Card Maintenance feature is not yet available. This feature will be enabled in a future release."
            });
        }

        [HttpPost]
        [Route("api/delete-account-card")]
        public IActionResult DeleteAccountCard([FromBody] JsonElement request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

            // Feature not yet implemented in backend
            _logger.LogInformation("DeleteAccountCard called - backend feature not yet implemented");
            return Ok(new
            {
                Success = false,
                Message = "Card Maintenance feature is not yet available. This feature will be enabled in a future release."
            });
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
        // CANCEL STOP PAYMENT
        // ============================================================================

        [HttpPost]
        [Route("api/get-cancel-stop-payments")]
        public async Task<IActionResult> GetCancelStopPayments([FromBody] GenericAccountRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_CANCEL_STOP_PAYMENTS,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cancel stop payments");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/add-cancel-stop-payment")]
        public async Task<IActionResult> AddCancelStopPayment([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.ADD_CANCEL_STOP_PAYMENT,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding cancel stop payment");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/update-cancel-stop-payment")]
        public async Task<IActionResult> UpdateCancelStopPayment([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.UPDATE_CANCEL_STOP_PAYMENT,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating cancel stop payment");
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
                    "AccountManagementApi",
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
                    "AccountManagementApi",
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
        public string? FaxNo { get; set; }
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
        public string? FaxNo { get; set; }
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
    }

    public class AddAccountSignatoriesRequest
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
        public string? FreezeAmount { get; set; }
        public string? FreezeReason { get; set; }
        public string? FreezeDate { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
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
        public string? NoOfLeaves { get; set; }
        public string? ChequeStart { get; set; }
        public string? IssueDate { get; set; }
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
    }

    public class AddAccountReminderRequest
    {
        public string? AccountID { get; set; }
        public string? Reminder { get; set; }
        public string? ColorID { get; set; }
        public string? Priority { get; set; }
        public string? ReminderStartDate { get; set; }
        public string? ReminderEndDate { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public int? NewRecord { get; set; }
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
        public int? UpdateCount { get; set; }
    }

    public class DeleteAccountReminderRequest
    {
        public string? AccountID { get; set; }
        public string? ReminderID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
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
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public string? SearchKey { get; set; }
        public string? SearchID { get; set; }
        public int? ModuleID { get; set; }
        public string? ModuleTypeID { get; set; }
        public string? RelevantID { get; set; }
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
