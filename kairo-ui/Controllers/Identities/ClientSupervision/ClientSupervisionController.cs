using kairo_ui.Models.Identities.ClientSupervision;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;
using CBS.Entities.SystemCore;

namespace kairo_ui.Controllers.Identities.ClientSupervision
{
    [Route("Identities/ClientSupervision")]
    public class ClientSupervisionController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<ClientSupervisionController> _logger;

        public ClientSupervisionController(
            IAuthService authService,
            IApiService apiService,
            IApiCachedService apiCachedService,
            ILogger<ClientSupervisionController> logger)
        {
            _authService = authService;
            _apiService = apiService;
            _apiCachedService = apiCachedService;
            _logger = logger;
        }

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

                // Set module ID for search modals
                const int MODULE_ID_CLIENT_SUPERVISION = 7080;
                ViewData["ModuleId"] = MODULE_ID_CLIENT_SUPERVISION.ToString();

                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "ClientTypeID",
                    "TitleID",
                    "GenderID",
                    "ResidentID",
                    "CountryID",
                    "LiteracyLevelID",
                    "IdentificationTypeID",
                    "MaritalStatusID",
                    "BusinessOwnershipID",
                    "BusinessLineID",
                    "AddressTypeID",
                    "RegionID",
                    "EmploymentStatusID",
                    "CompanyTypeID",
                    "OccupationID",
                    "YN"
                });

                dropdownOptions.TryGetValue("ClientTypeID", out var clientTypeOptions);
                dropdownOptions.TryGetValue("TitleID", out var titleOptions);
                dropdownOptions.TryGetValue("GenderID", out var genderOptions);
                dropdownOptions.TryGetValue("ResidentID", out var residentOptions);
                dropdownOptions.TryGetValue("CountryID", out var countryOptions);
                dropdownOptions.TryGetValue("LiteracyLevelID", out var literacyLevelOptions);
                dropdownOptions.TryGetValue("IdentificationTypeID", out var identificationTypeOptions);
                dropdownOptions.TryGetValue("MaritalStatusID", out var maritalStatusOptions);
                dropdownOptions.TryGetValue("BusinessOwnershipID", out var constitutionOptions);
                dropdownOptions.TryGetValue("BusinessLineID", out var lineOfBusinessOptions);
                dropdownOptions.TryGetValue("AddressTypeID", out var addressTypeOptions);
                dropdownOptions.TryGetValue("RegionID", out var regionOptions);
                dropdownOptions.TryGetValue("EmploymentStatusID", out var employmentStatusOptions);
                dropdownOptions.TryGetValue("CompanyTypeID", out var companyTypeOptions);
                dropdownOptions.TryGetValue("OccupationID", out var occupationOptions);
                dropdownOptions.TryGetValue("YN", out var yesNoOptions);

                yesNoOptions ??= new List<SelectListItem>
                {
                    new SelectListItem { Value = "", Text = "Select..." },
                    new SelectListItem { Value = "Y", Text = "Yes" },
                    new SelectListItem { Value = "N", Text = "No" }
                };

                ViewData["SupervisionClientTypeOptions"] = clientTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionTitleOptions"] = titleOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionGenderOptions"] = genderOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionResidentOptions"] = residentOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionCountryOptions"] = countryOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionLiteracyLevelOptions"] = literacyLevelOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionIdentificationTypeOptions"] = identificationTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionMaritalStatusOptions"] = maritalStatusOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionConstitutionOptions"] = constitutionOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionLineOfBusinessOptions"] = lineOfBusinessOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionAddressTypeOptions"] = addressTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionRegionOptions"] = regionOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionEmploymentStatusOptions"] = employmentStatusOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionCompanyTypeOptions"] = companyTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionOccupationOptions"] = occupationOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["SupervisionYesNoOptions"] = yesNoOptions;

                _logger.LogInformation("Client Supervision loaded successfully");
                return PartialView();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Client Supervision");
                return RedirectToAction("Index", "Dashboard");
            }
        }

        [HttpPost]
        [Route("get-branch-list")]
        public async Task<IActionResult> GetBranchList([FromBody] BranchListRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
                }

                requestData ??= new BranchListRequest();
                EnsureDefaults(requestData);

                var response = await _apiService.CreateAsync<JsonElement>("SystemCoreApi", ApiEndpoints.GET_BRANCHSETTINGS_IAM, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading branch list for Client Supervision");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error loading branches: {ex.Message}" });
            }
        }

        [HttpPost]
        [Route("get-pending-supervisions")]
        public async Task<IActionResult> GetPendingSupervisions([FromBody] ClientSupervisionPendingRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
                }

                if (requestData == null)
                {
                    return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
                }

                EnsureDefaults(requestData);
                var response = await _apiService.CreateAsync<JsonElement>("ClientManagementApi", ApiEndpoints.GET_CLIENT_SUPERVISION_PENDING, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading pending client supervisions");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error loading pending supervisions: {ex.Message}" });
            }
        }

        [HttpPost]
        [Route("approve-supervision")]
        public async Task<IActionResult> ApproveSupervision([FromBody] ClientSupervisionApprovalRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
                }

                if (requestData == null)
                {
                    return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
                }

                EnsureDefaults(requestData);
                if (string.IsNullOrWhiteSpace(requestData.ApprovedBy))
                {
                    requestData.ApprovedBy = requestData.OperatorID;
                }

                var response = await _apiService.CreateAsync<JsonElement>("ClientManagementApi", ApiEndpoints.APPROVE_CLIENT_SUPERVISION, requestData);
                return Ok(response);
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
                {
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
                }

                if (requestData == null)
                {
                    return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
                }

                EnsureDefaults(requestData);
                var response = await _apiService.CreateAsync<JsonElement>("ClientManagementApi", ApiEndpoints.REJECT_CLIENT_SUPERVISION, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rejecting client supervision");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error rejecting supervision: {ex.Message}" });
            }
        }

        [HttpPost]
        [Route("get-client-basic-details")]
        public async Task<IActionResult> GetClientBasicDetails([FromBody] ClientSupervisionClientRequest requestData) =>
            await ProxyClientDetails(requestData, ApiEndpoints.GET_CLIENT_BASIC_DETAILS, "client basic details");

        [HttpPost]
        [Route("get-client-individual-details")]
        public async Task<IActionResult> GetClientIndividualDetails([FromBody] ClientSupervisionClientRequest requestData) =>
            await ProxyClientDetails(requestData, ApiEndpoints.GET_CLIENT_INDIVIDUAL, "client individual details");

        [HttpPost]
        [Route("get-client-corporate-details")]
        public async Task<IActionResult> GetClientCorporateDetails([FromBody] ClientSupervisionClientRequest requestData) =>
            await ProxyClientDetails(requestData, ApiEndpoints.GET_CLIENT_CORPORATE, "client corporate details");

        [HttpPost]
        [Route("get-client-address-details")]
        public async Task<IActionResult> GetClientAddressDetails([FromBody] ClientSupervisionClientRequest requestData) =>
            await ProxyClientDetails(requestData, ApiEndpoints.GET_CLIENT_ADDRESS, "client address details");

        [HttpPost]
        [Route("get-client-employment-details")]
        public async Task<IActionResult> GetClientEmploymentDetails([FromBody] ClientSupervisionClientRequest requestData) =>
            await ProxyClientDetails(requestData, ApiEndpoints.GET_CLIENT_EMPLOYMENT, "client employment details");

        [HttpPost]
        [Route("get-client-other-details")]
        public async Task<IActionResult> GetClientOtherDetails([FromBody] ClientSupervisionClientRequest requestData) =>
            await ProxyClientDetails(requestData, ApiEndpoints.GET_CLIENT_KYC, "client other details");

        [HttpPost]
        [Route("get-client-photo-signature")]
        public async Task<IActionResult> GetClientPhotoSignature([FromBody] ClientSupervisionClientRequest requestData) =>
            await ProxyClientDetails(requestData, ApiEndpoints.GET_CLIENT_PHOTO_SIGNATURE, "client photo signature");

        private async Task<IActionResult> ProxyClientDetails(ClientSupervisionClientRequest requestData, string endpoint, string operation)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
                }

                if (requestData == null)
                {
                    return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
                }

                EnsureDefaults(requestData);
                requestData.RequestID ??= $"supervision_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";

                var response = await _apiService.CreateAsync<JsonElement>("ClientManagementApi", endpoint, requestData);
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
            var branchIdProp = type.GetProperty("OurBranchID");
            var bankIdProp = type.GetProperty("BankID");

            if (operatorIdProp != null && string.IsNullOrWhiteSpace(operatorIdProp.GetValue(requestData) as string))
            {
                operatorIdProp.SetValue(requestData, ResolveSessionValue("user_name", "user_id") ?? "web_portal");
            }

            if (branchIdProp != null && string.IsNullOrWhiteSpace(branchIdProp.GetValue(requestData) as string))
            {
                branchIdProp.SetValue(requestData, ResolveSessionValue("branch_code", "branch_id") ?? string.Empty);
            }

            if (bankIdProp != null && string.IsNullOrWhiteSpace(bankIdProp.GetValue(requestData) as string))
            {
                bankIdProp.SetValue(requestData, ResolveSessionValue("bank_id", "bank_code") ?? "00");
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
}
