using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.AccountUtilities
{
    [Route("AccountUtilities")]
    public class AccountUtilitiesController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<AccountUtilitiesController> _logger;

        public AccountUtilitiesController(
            IAuthService authService,
            IApiService apiService,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            ILogger<AccountUtilitiesController> logger)
        {
            _authService = authService;
            _apiService = apiService;
            _oldApiService = oldApiService;
            _apiCachedService = apiCachedService;
            _logger = logger;
        }

        #region Submodule Views

        /// <summary>
        /// Standing Instruction Demand Draft (ModuleID 1920)
        /// </summary>
        [Route("StandingInstructionDemandDraft/Index")]
        public async Task<IActionResult> StandingInstructionDemandDraft()
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return RedirectToAction("Index", "Login");

                try
                {
                    var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                    {
                        "CityID",
                        "SITransferTypeID",
                        "ChargeRecoveryID"
                    });

                    dropdownOptions.TryGetValue("CityID", out var cityOptions);
                    dropdownOptions.TryGetValue("SITransferTypeID", out var siTransferTypeOptions);
                    dropdownOptions.TryGetValue("ChargeRecoveryID", out var chargeRecoveryOptions);

                    ViewData["CityOptions"] = cityOptions ?? Enumerable.Empty<SelectListItem>();
                    ViewData["SITransferTypeOptions"] = siTransferTypeOptions ?? Enumerable.Empty<SelectListItem>();
                    ViewData["ChargeRecoveryOptions"] = chargeRecoveryOptions ?? Enumerable.Empty<SelectListItem>();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error loading StandingInstructionDemandDraft dropdown options");
                    ViewData["CityOptions"] = Enumerable.Empty<SelectListItem>();
                    ViewData["SITransferTypeOptions"] = Enumerable.Empty<SelectListItem>();
                    ViewData["ChargeRecoveryOptions"] = Enumerable.Empty<SelectListItem>();
                }

                return PartialView("StandingInstructionDemandDraft");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Standing Instruction Demand Draft");
                return RedirectToAction("Index", "Dashboard");
            }
        }

        /// <summary>
        /// Standing Instruction EFT (ModuleID 1906)
        /// </summary>
        [Route("StandingInstructionEFT/Index")]
        public async Task<IActionResult> StandingInstructionEFT()
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return RedirectToAction("Index", "Login");

                try
                {
                    var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                    {
                        "CityID",
                        "SITransferTypeID",
                        "ChargeRecoveryID"
                    });

                    dropdownOptions.TryGetValue("CityID", out var cityOptions);
                    dropdownOptions.TryGetValue("SITransferTypeID", out var siTransferTypeOptions);
                    dropdownOptions.TryGetValue("ChargeRecoveryID", out var chargeRecoveryOptions);

                    ViewData["CityOptions"] = cityOptions ?? Enumerable.Empty<SelectListItem>();
                    ViewData["SITransferTypeOptions"] = siTransferTypeOptions ?? Enumerable.Empty<SelectListItem>();
                    ViewData["ChargeRecoveryOptions"] = chargeRecoveryOptions ?? Enumerable.Empty<SelectListItem>();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error loading StandingInstructionEFT dropdown options");
                    ViewData["CityOptions"] = Enumerable.Empty<SelectListItem>();
                    ViewData["SITransferTypeOptions"] = Enumerable.Empty<SelectListItem>();
                    ViewData["ChargeRecoveryOptions"] = Enumerable.Empty<SelectListItem>();
                }

                // Load SI Type combo via OldApiService (p_GetSITypeCombo)
                try
                {
                    var bankId = HttpContext.Session.GetString("bank_id")
                        ?? HttpContext.Session.GetString("bank_code")
                        ?? "00";

                    var siTypeResponse = await _oldApiService.CreateAsync<JsonElement>(
                        "AccountManagementApi",
                        OldApiDBConstants.GET_SI_TYPE_COMBO,
                        new { BankID = bankId, ModuleID = 1906 }
                    );

                    ViewData["SITypeOptions"] = ParseSITypeComboToSelectList(siTypeResponse);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error loading SI Type combo options");
                    ViewData["SITypeOptions"] = Enumerable.Empty<SelectListItem>();
                }

                return PartialView("StandingInstructionEFT");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Standing Instruction EFT");
                return RedirectToAction("Index", "Dashboard");
            }
        }
        /// <summary>
        /// Direct Debit Maintenance 
        /// </summary>
        [Route("DirectDebitMaintenance/Index")]
        public async Task<IActionResult> DirectDebitMaintenance()
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return RedirectToAction("Index", "Login");

                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "DirectDebitTypeID",
                    "TransferFrequencyID",
                    "ChargeRecoveryID"
                });

                dropdownOptions.TryGetValue("DirectDebitTypeID", out var directDebitTypeOptions);
                dropdownOptions.TryGetValue("TransferFrequencyID", out var transferFrequencyOptions);
                dropdownOptions.TryGetValue("ChargeRecoveryID", out var chargeRecoveryOptions);

                ViewData["DirectDebitTypeOptions"] = directDebitTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["TransferFrequencyOptions"] = transferFrequencyOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["ChargeRecoveryOptions"] = chargeRecoveryOptions ?? Enumerable.Empty<SelectListItem>();

                return PartialView("DirectDebitMaintenance");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Direct Debit Maintenance");
                return RedirectToAction("Index", "Dashboard");
            }
        }

        /// <summary>
        /// Standing Instruction Type
        /// </summary>
        [Route("StandingInstructionType/Index")]
        public async Task<IActionResult> StandingInstructionType()
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return RedirectToAction("Index", "Login");

                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "SITransferTypeID",
                    "FailedChargeTypeID"
                });

                dropdownOptions.TryGetValue("SITransferTypeID", out var siTransferTypeOptions);
                dropdownOptions.TryGetValue("FailedChargeTypeID", out var failedChargeTypeOptions);

                ViewData["SITransferTypeOptions"] = siTransferTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["FailedChargeTypeOptions"] = failedChargeTypeOptions ?? Enumerable.Empty<SelectListItem>();

                return PartialView("StandingInstructionType");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Standing Instruction Type");
                return RedirectToAction("Index", "Dashboard");
            }
        }

        #endregion

        #region API Endpoints - Standing Instruction Demand Draft

        [HttpPost]
        [Route("api/get-si-demand-draft")]
        public async Task<IActionResult> GetSIDemandDraft([FromBody] SIRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                if (string.IsNullOrEmpty(request.SearchID) && !string.IsNullOrEmpty(request.SearchKey))
                    request.SearchID = request.SearchKey;

                request.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(request.OurBranchID))
                    request.OurBranchID = HttpContext.Session.GetString("branch_code");

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_SI_DEMAND_DRAFT,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting SI Demand Draft");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/create-si-demand-draft")]
        public async Task<IActionResult> CreateSIDemandDraft([FromBody] SIDemandDraftRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                request.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(request.OurBranchID))
                    request.OurBranchID = HttpContext.Session.GetString("branch_code");

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.CREATE_SI_DEMAND_DRAFT,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating SI Demand Draft");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/update-si-demand-draft")]
        public async Task<IActionResult> UpdateSIDemandDraft([FromBody] SIDemandDraftRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                request.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(request.OurBranchID))
                    request.OurBranchID = HttpContext.Session.GetString("branch_code");

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.UPDATE_SI_DEMAND_DRAFT,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating SI Demand Draft");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/delete-si-demand-draft")]
        public async Task<IActionResult> DeleteSIDemandDraft([FromBody] SIRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                request.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(request.OurBranchID))
                    request.OurBranchID = HttpContext.Session.GetString("branch_code");

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.DELETE_SI_DEMAND_DRAFT,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting SI Demand Draft");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/stop-si-demand-draft")]
        public async Task<IActionResult> StopSIDemandDraft([FromBody] SIRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                request.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(request.OurBranchID))
                    request.OurBranchID = HttpContext.Session.GetString("branch_code");

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.STOP_SI_DEMAND_DRAFT,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error stopping SI Demand Draft");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        #endregion

        #region API Endpoints - Standing Instruction EFT

        [HttpPost]
        [Route("api/get-si-eft")]
        public async Task<IActionResult> GetSIEFT([FromBody] SIRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                if (string.IsNullOrEmpty(request.SearchID) && !string.IsNullOrEmpty(request.SearchKey))
                    request.SearchID = request.SearchKey;

                request.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(request.OurBranchID))
                    request.OurBranchID = HttpContext.Session.GetString("branch_code");

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_SI_EFT,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting SI EFT");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/create-si-eft")]
        public async Task<IActionResult> CreateSIEFT([FromBody] SIEFTRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                request.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(request.OurBranchID))
                    request.OurBranchID = HttpContext.Session.GetString("branch_code");

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.CREATE_SI_EFT,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating SI EFT");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/update-si-eft")]
        public async Task<IActionResult> UpdateSIEFT([FromBody] SIEFTRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                request.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(request.OurBranchID))
                    request.OurBranchID = HttpContext.Session.GetString("branch_code");

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.UPDATE_SI_EFT,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating SI EFT");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/delete-si-eft")]
        public async Task<IActionResult> DeleteSIEFT([FromBody] SIRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                request.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(request.OurBranchID))
                    request.OurBranchID = HttpContext.Session.GetString("branch_code");

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.DELETE_SI_EFT,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting SI EFT");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/stop-si-eft")]
        public async Task<IActionResult> StopSIEFT([FromBody] SIRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                request.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(request.OurBranchID))
                    request.OurBranchID = HttpContext.Session.GetString("branch_code");

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.STOP_SI_EFT,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error stopping SI EFT");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        #endregion

        #region Shared Helpers

        /// <summary>
        /// Generic dropdown loader using the legacy lookup service (SystemCodeOptions).
        /// Used by client-side JS to populate selects for TrfFrequencyID, ChargingCurrencyID, etc.
        /// </summary>
        [HttpGet]
        [Route("get-dropdown-options")]
        public async Task<IActionResult> GetDropdownOptions([FromQuery] string codeId, [FromQuery] string? valueField = null)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(codeId))
                    return BadRequest(new { success = false, message = "codeId is required" });

                var options = await _apiCachedService.GetSystemCodeOptionsAsync(codeId);

                var result = options.Select(o => new
                {
                    value = string.Equals(valueField, "ChargingCurrencyID", StringComparison.OrdinalIgnoreCase)
                        ? (o.ChargingCurrencyID ?? o.SubCodeID)
                        : o.SubCodeID,
                    label = o.CodeDescription ?? o.SubCodeID
                });

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading dropdown options for {CodeId}", codeId);
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Fetches SI Type combo options via old API (p_GetSITypeCombo).
        /// Requires BankID and ModuleID.
        /// </summary>
        [HttpPost]
        [Route("api/get-si-type-combo")]
        public async Task<IActionResult> GetSITypeCombo([FromBody] SITypeComboRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                var bankId = HttpContext.Session.GetString("bank_id")
                    ?? HttpContext.Session.GetString("bank_code")
                    ?? request.BankID
                    ?? "00";

                var requestData = new
                {
                    BankID = bankId,
                    ModuleID = request.ModuleID
                };

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    OldApiDBConstants.GET_SI_TYPE_COMBO,
                    requestData
                );

                return Ok(new { success = true, data = response });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading SI Type combo");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        #endregion

        #region Helpers

        /// <summary>
        /// Parses the SI Type combo response (from p_GetSITypeCombo) into SelectListItem list.
        /// </summary>
        private static IEnumerable<SelectListItem> ParseSITypeComboToSelectList(JsonElement response)
        {
            var items = new List<SelectListItem>();
            try
            {
                JsonElement rows = default;

                if (response.TryGetProperty("Details", out var details))
                {
                    if (details.TryGetProperty("Details01", out var d01) && d01.ValueKind == JsonValueKind.Array)
                        rows = d01;
                    else if (details.TryGetProperty("Details02", out var d02) && d02.ValueKind == JsonValueKind.Array)
                        rows = d02;
                    else if (details.ValueKind == JsonValueKind.Array)
                        rows = details;
                }
                else if (response.ValueKind == JsonValueKind.Array)
                {
                    rows = response;
                }

                if (rows.ValueKind != JsonValueKind.Array) return items;

                foreach (var row in rows.EnumerateArray())
                {
                    var value = row.TryGetProperty("SITypeID", out var id) ? id.GetString()
                        : row.TryGetProperty("SubCodeID", out var sub) ? sub.GetString()
                        : row.TryGetProperty("ID", out var genId) ? genId.GetString()
                        : null;

                    var text = row.TryGetProperty("SITypeDescription", out var desc) ? desc.GetString()
                        : row.TryGetProperty("Description", out var d) ? d.GetString()
                        : row.TryGetProperty("CodeDescription", out var cd) ? cd.GetString()
                        : row.TryGetProperty("Name", out var n) ? n.GetString()
                        : null;

                    if (!string.IsNullOrEmpty(value))
                        items.Add(new SelectListItem { Value = value, Text = text ?? value });
                }
            }
            catch { /* Return empty on parse failure */ }
            return items;
        }

        #endregion
    }

    // Request DTOs
    public class SIRequest
    {
        public string? SearchKey { get; set; }
        public string? SearchID { get; set; }
        public string? AccountID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public string? StandingInstructionID { get; set; }
        public int Direction { get; set; }
        public string? DirectionType { get; set; }
    }

    public class SITypeComboRequest
    {
        public string? BankID { get; set; }
        public int ModuleID { get; set; } = 1906;
    }

    public class SIDemandDraftRequest
    {
        public string? AccountID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public string? StandingInstructionID { get; set; }
        public string? ReferenceNo { get; set; }
        public string? SITransferType { get; set; }
        public string? EffectiveDate { get; set; }
        public string? TransferCurrencyID { get; set; }
        public string? AmountIn { get; set; }
        public decimal? FixedAmount { get; set; }
        public string? BeneficiaryName { get; set; }
        public bool AccountPayee { get; set; }
        public string? PayeeAccountID { get; set; }
        public string? PayableAt { get; set; }
        public string? TransferFrequency { get; set; }
        public int? NoOfExecution { get; set; }
        public int? RegularExecutionDay { get; set; }
        public string? FirstExecutionDate { get; set; }
        public string? ChargeRecovery { get; set; }
        public string? MailingAddress { get; set; }
        public string? Address1 { get; set; }
        public string? Address2 { get; set; }
        public string? City { get; set; }
        public string? ZipCode { get; set; }
        public string? Phone { get; set; }
        public string? LandMark { get; set; }
    }

    public class SIEFTRequest
    {
        public string? AccountID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public string? StandingInstructionID { get; set; }
        public string? ReferenceNo { get; set; }
        public string? SITransferType { get; set; }
        public string? EffectiveDate { get; set; }
        public string? TransferCurrencyID { get; set; }
        public string? AmountIn { get; set; }
        public decimal? FixedAmount { get; set; }
        public string? BeneficiaryName { get; set; }
        public string? BeneficiaryAccountID { get; set; }
        public string? BeneficiaryBankID { get; set; }
        public string? BeneficiaryBranchID { get; set; }
        public string? TransferFrequency { get; set; }
        public int? NoOfExecution { get; set; }
        public int? RegularExecutionDay { get; set; }
        public string? FirstExecutionDate { get; set; }
        public string? ChargeRecovery { get; set; }
    }
}
