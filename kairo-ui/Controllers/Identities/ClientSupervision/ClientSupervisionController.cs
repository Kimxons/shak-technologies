using kairo_ui.Models;
using kairo_ui.Models.Identities.ClientSupervision;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.Identities.ClientSupervision
{
    // -----------------------------------------------------------------------
    // RequestDataPayload
    //
    // Used for all p_V8_Get* SPs that accept a single @RequestData VARCHAR(MAX).
    //
    // WHY a concrete class with a string property:
    //   OldApiService wraps our payload inside OldDataRequest.RequestData, then
    //   serializes and POSTs it. The backend API maps OldDataRequest.RequestData
    //   directly as the SP's @RequestData varchar parameter.
    //
    //   If we pass a nested object, the backend gets a JObject and throws
    //   "Failed to convert parameter value from a JObject to a String."
    //
    //   Solution: pre-serialize the full SP input as a JSON string so the backend
    //   receives a plain string for @RequestData. The SP then reads values using:
    //     JSON_VALUE(@RequestData, '$.RequestData.ClientID')
    //
    //   The class must also have NO OperatorID/OurBranchID/BankID properties so
    //   OldApiService.EnsureDefaults() does not inject extra SP parameters.
    // -----------------------------------------------------------------------
    public class RequestDataPayload
    {
        public string RequestData { get; set; } = string.Empty;
    }

    // -----------------------------------------------------------------------

    [Route("Identities/ClientSupervision")]
    public class ClientSupervisionController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<ClientSupervisionController> _logger;

        public ClientSupervisionController(
            IAuthService authService,
            IApiService apiService,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            ILogger<ClientSupervisionController> logger)
        {
            _authService = authService;
            _apiService = apiService;
            _oldApiService = oldApiService;
            _apiCachedService = apiCachedService;
            _logger = logger;
        }

        // -----------------------------------------------------------------------
        // INDEX
        // -----------------------------------------------------------------------

        [Route("Index")]
        public async Task<IActionResult> Index()
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated access attempt to Client Supervision");
                    return RedirectToAction("Index", "Login");
                }

                const int MODULE_ID_CLIENT_SUPERVISION = 7080;
                ViewData["ModuleId"] = MODULE_ID_CLIENT_SUPERVISION.ToString();

                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "ClientTypeID", "TitleID", "GenderID", "ResidentID", "CountryID",
                    "LiteracyLevelID", "IdentificationTypeID", "MaritalStatusID",
                    "BusinessOwnershipID", "BusinessLineID", "AddressTypeID", "RegionID",
                    "EmploymentStatusID", "CompanyTypeID", "OccupationID", "YN"
                });

                dropdownOptions.TryGetValue("ClientTypeID",         out var clientTypeOptions);
                dropdownOptions.TryGetValue("TitleID",              out var titleOptions);
                dropdownOptions.TryGetValue("GenderID",             out var genderOptions);
                dropdownOptions.TryGetValue("ResidentID",           out var residentOptions);
                dropdownOptions.TryGetValue("CountryID",            out var countryOptions);
                dropdownOptions.TryGetValue("LiteracyLevelID",      out var literacyLevelOptions);
                dropdownOptions.TryGetValue("IdentificationTypeID", out var identificationTypeOptions);
                dropdownOptions.TryGetValue("MaritalStatusID",      out var maritalStatusOptions);
                dropdownOptions.TryGetValue("BusinessOwnershipID",  out var constitutionOptions);
                dropdownOptions.TryGetValue("BusinessLineID",       out var lineOfBusinessOptions);
                dropdownOptions.TryGetValue("AddressTypeID",        out var addressTypeOptions);
                dropdownOptions.TryGetValue("RegionID",             out var regionOptions);
                dropdownOptions.TryGetValue("EmploymentStatusID",   out var employmentStatusOptions);
                dropdownOptions.TryGetValue("CompanyTypeID",        out var companyTypeOptions);
                dropdownOptions.TryGetValue("OccupationID",         out var occupationOptions);
                dropdownOptions.TryGetValue("YN",                   out var yesNoOptions);

                yesNoOptions ??= new List<SelectListItem>
                {
                    new SelectListItem { Value = "",  Text = "Select..." },
                    new SelectListItem { Value = "Y", Text = "Yes" },
                    new SelectListItem { Value = "N", Text = "No" }
                };

                ViewData["SupervisionClientTypeOptions"]         = clientTypeOptions          ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionTitleOptions"]              = titleOptions                ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionGenderOptions"]             = genderOptions               ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionResidentOptions"]           = residentOptions             ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionCountryOptions"]            = countryOptions              ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionLiteracyLevelOptions"]      = literacyLevelOptions        ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionIdentificationTypeOptions"] = identificationTypeOptions   ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionMaritalStatusOptions"]      = maritalStatusOptions        ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionConstitutionOptions"]       = constitutionOptions         ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionLineOfBusinessOptions"]     = lineOfBusinessOptions       ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionAddressTypeOptions"]        = addressTypeOptions          ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionRegionOptions"]             = regionOptions               ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionEmploymentStatusOptions"]   = employmentStatusOptions     ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionCompanyTypeOptions"]        = companyTypeOptions          ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionOccupationOptions"]         = occupationOptions           ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionYesNoOptions"]              = yesNoOptions;

                _logger.LogInformation("Client Supervision loaded successfully");
                return PartialView();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Client Supervision");
                return RedirectToAction("Index", "Dashboard");
            }
        }

        // -----------------------------------------------------------------------
        // BRANCH LIST
        // -----------------------------------------------------------------------

        [HttpPost]
        [Route("get-branch-list")]
        public async Task<IActionResult> GetBranchList([FromBody] BranchListRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                requestData ??= new BranchListRequest();
                EnsureDefaults(requestData);

                var operatorId = requestData.OperatorID
                    ?? HttpContext.Session.GetString("user_name")
                    ?? "web_portal";

                _logger.LogInformation("Fetching branch list for OperatorID: {OperatorID}", operatorId);

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_BRANCH_LIST,
                    new { OperatorID = operatorId });

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading branch list for Client Supervision");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error loading branches: {ex.Message}" });
            }
        }

        // -----------------------------------------------------------------------
        // PENDING SUPERVISIONS
        // -----------------------------------------------------------------------

       [HttpPost]
        [Route("get-pending-supervisions")]
        public async Task<IActionResult> GetPendingSupervisions([FromBody] ClientSupervisionPendingRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                if (requestData == null)
                    return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });

                EnsureDefaults(requestData);

                requestData.MainModuleID ??= string.Empty;

                // Use _oldApiService — p_getclientsupervisionpending expects direct parameters
                // like @OurBranchID, @OperatorID, @MainModuleID, @BranchList.
                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_CLIENT_SUPERVISION_PENDING,
                    new
                    {
                        OurBranchID = requestData.OurBranchID,
                        OperatorID = requestData.OperatorID,
                        MainModuleID = requestData.MainModuleID,
                        BranchList = requestData.BranchList
                    });

                             return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading pending client supervisions");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error loading pending supervisions: {ex.Message}" });
            }
        }

        // -----------------------------------------------------------------------
        // APPROVE / REJECT
        // -----------------------------------------------------------------------

        [HttpPost]
        [Route("approve-supervision")]
        public async Task<IActionResult> ApproveSupervision([FromBody] ClientSupervisionApprovalRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                if (requestData == null)
                    return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });

                EnsureDefaults(requestData);

                if (string.IsNullOrWhiteSpace(requestData.ApprovedBy))
                    requestData.ApprovedBy = requestData.OperatorID;

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.APPROVE_CLIENT_SUPERVISION,
                    new
                    {
                        OurBranchID = requestData.OurBranchID,
                        ClientID = requestData.ClientID,
                        ApprovedBy = requestData.ApprovedBy,
                        strSearchkey = requestData.strSearchKey
                    });

                return Ok(new
                {
                    Success = true,
                    Message = "Supervision approved successfully!",
                    ResponseCode = "00",
                    Details = response
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving client supervision");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error approving supervision: {ex.Message}" });
            }
        }

        [HttpPost]
        [Route("reject-supervision")]
        public async Task<IActionResult> RejectSupervision([FromBody] ClientSupervisionRejectionRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                if (requestData == null)
                    return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });

                EnsureDefaults(requestData);

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.REJECT_CLIENT_SUPERVISION,
                    new
                    {
                        OurBranchID = requestData.OurBranchID,
                        ClientID = requestData.ClientID,
                        OperatorID = requestData.OperatorID,
                        strSearchkey = requestData.strSearchkey,
                        RejectReson = requestData.RejectReson
                    });

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rejecting client supervision");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error rejecting supervision: {ex.Message}" });
            }
        }

        // -----------------------------------------------------------------------
        // CLIENT DETAIL ENDPOINTS
        // -----------------------------------------------------------------------

        [HttpPost]
        [Route("get-client-basic-details")]
        public async Task<IActionResult> GetClientBasicDetails([FromBody] ClientSupervisionClientRequest requestData) =>
            await ProxyClientDetailsViaSp(requestData, OldApiDBConstants.GET_CLIENT, "client basic details");

        [HttpPost]
        [Route("get-client-individual-details")]
        public async Task<IActionResult> GetClientIndividualDetails([FromBody] ClientSupervisionClientRequest requestData) =>
            await ProxyClientDetailsViaSp(requestData, OldApiDBConstants.GET_CLIENT_INDIVIDUAL, "client individual details");

        [HttpPost]
        [Route("get-client-corporate-details")]
        public async Task<IActionResult> GetClientCorporateDetails([FromBody] ClientSupervisionClientRequest requestData) =>
            await ProxyClientDetailsViaSp(requestData, OldApiDBConstants.GET_CLIENT_CORPORATE, "client corporate details");

        [HttpPost]
        [Route("get-client-address-details")]
        public async Task<IActionResult> GetClientAddressDetails([FromBody] ClientSupervisionClientRequest requestData) =>
            await ProxyClientDetailsViaSp(requestData, OldApiDBConstants.GET_CLIENT_ADDRESS, "client address details");

        [HttpPost]
        [Route("get-client-employment-details")]
        public async Task<IActionResult> GetClientEmploymentDetails([FromBody] ClientSupervisionClientRequest requestData) =>
            await ProxyClientDetailsViaSp(requestData, OldApiDBConstants.GET_CLIENT_EMPLOYMENT, "client employment details");

        [HttpPost]
        [Route("get-client-other-details")]
        public async Task<IActionResult> GetClientOtherDetails([FromBody] ClientSupervisionClientRequest requestData)
        {
            // No SP available for other/KYC details - return empty success
            return Ok(new { Success = true, ResponseCode = "00", Details = (object?)null });
        }

        // -----------------------------------------------------------------------
        // PHOTO / SIGNATURE
        // -----------------------------------------------------------------------

        [HttpPost]
        [Route("get-client-photo-signature")]
        public async Task<IActionResult> GetClientPhotoSignature([FromBody] ClientSupervisionClientRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                if (requestData == null)
                    return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });

                EnsureDefaults(requestData);


                var clientResponse = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_CLIENT_INDIVIDUAL_IMAGE,
                    new
                    {
                        OurBranchID = requestData.OurBranchID,
                        ClientID    = requestData.ClientID,
                        OperatorID  = requestData.OperatorID
                    });

                // Extract PhotoID and SignID — handle both flat and wrapped responses
                string photoId = "";
                string signId  = "";

                static void ExtractIds(JsonElement el, ref string photo, ref string sign)
                {
                    if (el.TryGetProperty("PhotoID", out var p)) photo = p.ToString();
                    if (el.TryGetProperty("SignID",  out var s)) sign  = s.ToString();
                }

                if (clientResponse.ValueKind == JsonValueKind.Object)
                {
                    if (clientResponse.TryGetProperty("Details", out var detailsEl))
                    {
                        var first = detailsEl.ValueKind == JsonValueKind.Array
                                    && detailsEl.GetArrayLength() > 0
                            ? detailsEl[0]
                            : detailsEl;
                        ExtractIds(first, ref photoId, ref signId);
                    }
                    else
                    {
                        ExtractIds(clientResponse, ref photoId, ref signId);
                    }
                }

                _logger.LogInformation(
                    "[GetClientPhotoSignature] ClientID={ClientID} PhotoID={PhotoID} SignID={SignID}",
                    requestData.ClientID, photoId, signId);

                if (string.IsNullOrWhiteSpace(photoId) && string.IsNullOrWhiteSpace(signId))
                    return Ok(new { Success = true, ResponseCode = "00", Details = Array.Empty<object>() });

                // Step 2: fetch actual image data from t_Image via p_V8_GetImages.
                // Pre-serialize the full SP input as a JSON string so the backend receives
                // a plain varchar for @RequestData. SP reads: $.RequestData.ImageID
                var images = new List<object>();

                async Task AddImage(string imageIdStr, string imageTypeId)
                {
                    if (string.IsNullOrWhiteSpace(imageIdStr) || imageIdStr == "0") return;
                    if (!long.TryParse(imageIdStr, out var imageIdLong)) return;

                    var spInput = JsonSerializer.Serialize(new
                    {
                        RequestData = new
                        {
                            ImageID     = imageIdLong,
                            ImageTypeID = imageTypeId,
                            OperatorID  = requestData.OperatorID,
                            OurBranchID = requestData.OurBranchID,
                            BankID      = requestData.BankID ?? "00"
                        }
                    });

                    var imageResponse = await _oldApiService.CreateAsync<JsonElement>(
                        "OldApi",
                        OldApiDBConstants.GET_CLIENT_IMAGES,
                        new RequestDataPayload { RequestData = spInput });

                    images.Add(new { ImageTypeID = imageTypeId, Data = imageResponse });
                }

                await AddImage(photoId, "P");
                await AddImage(signId,  "S");

                return Ok(new { Success = true, ResponseCode = "00", Details = images });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading client photo signature");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error loading photo signature: {ex.Message}" });
            }
        }

        // -----------------------------------------------------------------------
        // PRIVATE HELPERS
        // -----------------------------------------------------------------------

        /// <summary>
        /// Routes client detail requests to the appropriate V8 SP.
        ///
        /// All p_V8_Get* SPs accept a single @RequestData VARCHAR(MAX).
        /// The SP reads values using JSON_VALUE e.g: $.RequestData.ClientID
        ///
        /// We pre-serialize the full intended SP input as a JSON string and wrap
        /// it in RequestDataPayload so the backend receives a plain string for
        /// @RequestData rather than a JObject (which would cause a conversion error).
        ///
        /// RequestDataPayload has no OperatorID/OurBranchID/BankID properties so
        /// OldApiService.EnsureDefaults() does not inject extra SP parameters.
        /// </summary>
        private async Task<IActionResult> ProxyClientDetailsViaSp(
            ClientSupervisionClientRequest requestData, string spName, string operation)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                if (requestData == null)
                    return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });

                EnsureDefaults(requestData);
                requestData.RequestID ??= $"supervision_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";

                // Pre-serialize the full SP input as a JSON string.
                // Result: "{\"RequestData\":{\"ClientID\":\"...\", ...}}"
                // SP reads: JSON_VALUE(@RequestData, '$.RequestData.ClientID')
                var spInput = JsonSerializer.Serialize(new
                {
                    RequestData = new
                    {
                        ClientID    = requestData.ClientID,
                        OperatorID  = requestData.OperatorID,
                        OurBranchID = requestData.OurBranchID,
                        BankID      = requestData.BankID ?? "00",
                        RequestID   = requestData.RequestID
                    }
                });

                var payload = new RequestDataPayload { RequestData = spInput };

                _logger.LogInformation(
                    "[ProxyClientDetailsViaSp] SP={SP} ClientID={ClientID}",
                    spName, requestData.ClientID);

                var response = await _oldApiService.CreateAsync<JsonElement>("OldApi", spName, payload);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading {Operation}", operation);
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error loading {operation}: {ex.Message}" });
            }
        }

        private void EnsureDefaults<T>(T requestData) where T : class
        {
            var type = requestData.GetType();
            var operatorIdProp = type.GetProperty("OperatorID");
            var branchIdProp   = type.GetProperty("OurBranchID");
            var bankIdProp     = type.GetProperty("BankID");

            if (operatorIdProp != null && string.IsNullOrWhiteSpace(operatorIdProp.GetValue(requestData) as string))
                operatorIdProp.SetValue(requestData, ResolveSessionValue("user_name", "user_id") ?? "web_portal");

            if (branchIdProp != null && string.IsNullOrWhiteSpace(branchIdProp.GetValue(requestData) as string))
                branchIdProp.SetValue(requestData, ResolveSessionValue("branch_code", "branch_id") ?? string.Empty);

            if (bankIdProp != null && string.IsNullOrWhiteSpace(bankIdProp.GetValue(requestData) as string))
                bankIdProp.SetValue(requestData, ResolveSessionValue("bank_id", "bank_code") ?? "00");
        }

        private string? ResolveSessionValue(params string[] keys)
        {
            foreach (var key in keys)
            {
                var value = HttpContext.Session.GetString(key);
                if (!string.IsNullOrWhiteSpace(value))
                    return value;
            }
            return null;
        }
    }
}