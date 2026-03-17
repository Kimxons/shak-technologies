using CBS.Entities.SystemCore;
using kairo_ui.Models.MicroFinance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using System.Text.Json;

namespace kairo_ui.Controllers.MicroFinance
{
    [Route("MicroFinance")]
    public class MicroFinanceController : Controller
    {
        private const string MicroFinanceApiName = "MicroFinanceApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly IConfiguration _config;
        private readonly ILogger<MicroFinanceController> _logger;

        public MicroFinanceController(
            IAuthService authService,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            IConfiguration configuration,
            ILogger<MicroFinanceController> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _apiCachedService = apiCachedService;
            _config = configuration;
            _logger = logger;
        }

        [HttpPost]
        [Route("group-loan-schemes")]
        public async Task<IActionResult> GetGroupLoanSchemes([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated Microfinance group loan schemes attempt");
                    return Unauthorized(new
                    {
                        Success = false,
                        ErrorMessage = "User is not authenticated"
                    });
                }
                
                var response = await _oldApiService.CreateAsync<JsonElement>(MicroFinanceApiName, OldApiDBConstants.GET_GROUP_LOAN_SCHEMES, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching Microfinance group loan schemes");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error processing microfinance request: {ex.Message}"
                });
            }
        }

        [HttpPost]
        [Route("save-group-loan-scheme")]
        public async Task<IActionResult> SaveGroupLoanScheme([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                var response = await _oldApiService.CreateAsync<JsonElement>(MicroFinanceApiName, OldApiDBConstants.ADD_EDIT_GROUP_LOAN_SCHEMES, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving Microfinance group loan scheme");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error saving scheme: {ex.Message}" });
            }
        }

        [HttpPost]
        [Route("delete-group-loan-scheme")]
        public async Task<IActionResult> DeleteGroupLoanScheme([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                var response = await _oldApiService.CreateAsync<JsonElement>(MicroFinanceApiName, OldApiDBConstants.DELETE_GROUP_LOAN_SCHEMES, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting Microfinance group loan scheme");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error deleting scheme: {ex.Message}" });
            }
        }

        [Route("Index")]
        public IActionResult Index()
        {            return RedirectToAction(nameof(GroupLoanScheme));
        }

        [Route("DataEntry/CenterLoanMenu")]
        public async Task<IActionResult> CenterLoanMenu(string? schemeId = null, string? loanProductId = null)
        {
            if (!_authService.IsAuthenticated())
                return RedirectToAction("Index", "Login");

            var systemCodes = await _apiCachedService.GetMultipleSystemCodeOptionsAsync(new[]
            {
                "SavingPaymentTypeID",
                "SavingsTypeID"
            });

            systemCodes.TryGetValue("SavingPaymentTypeID", out var slRecoveryTypeOptions);
            ViewData["SLRecoveryTypeOptions"] = slRecoveryTypeOptions ?? new List<SystemCodeDetail>();

            systemCodes.TryGetValue("SavingsTypeID", out var savingsCollectionTypeOptions);
            ViewData["SavingsCollectionTypeOptions"] = savingsCollectionTypeOptions ?? new List<SystemCodeDetail>();

            ViewData["SchemeId"] = schemeId ?? string.Empty;
            ViewData["LoanProductId"] = loanProductId ?? string.Empty;
            return PartialView("~/Views/MicroFinance/DataEntry/CenterLoanMenu.cshtml");
        }

        [HttpPost]
        [Route("get-group-loan-menu")]
        public async Task<IActionResult> GetGroupLoanMenu([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                var response = await _oldApiService.CreateAsync<JsonElement>(MicroFinanceApiName, OldApiDBConstants.GET_GROUP_LOAN_MENU, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching group loan menu");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error fetching menu: {ex.Message}" });
            }
        }

        [HttpPost]
        [Route("save-group-loan-menu")]
        public async Task<IActionResult> SaveGroupLoanMenu([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                var response = await _oldApiService.CreateAsync<JsonElement>(MicroFinanceApiName, OldApiDBConstants.ADD_EDIT_GROUP_LOAN_MENU, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving group loan menu");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error saving menu: {ex.Message}" });
            }
        }

        [HttpPost]
        [Route("delete-group-loan-menu")]
        public async Task<IActionResult> DeleteGroupLoanMenu([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                var response = await _oldApiService.CreateAsync<JsonElement>(MicroFinanceApiName, OldApiDBConstants.DELETE_GROUP_LOAN_MENU, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting group loan menu");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error deleting menu: {ex.Message}" });
            }
        }

        [HttpPost]
        [Route("get-interest-menu-combo")]
        public async Task<IActionResult> GetInterestMenuCombo([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                var response = await _oldApiService.CreateAsync<JsonElement>(MicroFinanceApiName, OldApiDBConstants.GET_INTEREST_MENU_COMBO, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching interest menu combo");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error fetching interest menu: {ex.Message}" });
            }
        }

        [Route("DataEntry/GroupLoanSchemeProducts")]
        public IActionResult GroupLoanSchemeProducts(string? schemeId = null)
        {
            if (!_authService.IsAuthenticated())
                return RedirectToAction("Index", "Login");

            ViewData["SchemeId"] = schemeId ?? string.Empty;
            return PartialView("~/Views/MicroFinance/DataEntry/GroupLoanSchemeProducts.cshtml");
        }

        [HttpPost]
        [Route("get-group-loan-scheme-products")]
        public async Task<IActionResult> GetGroupLoanSchemeProducts([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                var response = await _oldApiService.CreateAsync<JsonElement>(MicroFinanceApiName, OldApiDBConstants.GET_GROUP_LOAN_SCHEME_PRODUCTS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching group loan scheme products");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error fetching products: {ex.Message}" });
            }
        }

        [HttpPost]
        [Route("save-group-loan-scheme-products")]
        public async Task<IActionResult> SaveGroupLoanSchemeProducts([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                var response = await _oldApiService.CreateAsync<JsonElement>(MicroFinanceApiName, OldApiDBConstants.ADD_EDIT_GROUP_LOAN_SCHEME_PRODUCTS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving group loan scheme products");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error saving products: {ex.Message}" });
            }
        }

        [Route("GroupLoanScheme")]
        public async Task<IActionResult> GroupLoanScheme()
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated access attempt to Microfinance Group Loan Scheme");
                    return RedirectToAction("Index", "Login");
                }

                var systemCodes = await _apiCachedService.GetMultipleSystemCodeOptionsAsync(new[]
                {
                    "LoanCycleTypeID",
                    "SavingPaymentTypeID",
                    "SavingsTypeID",
                    "PrimaryCollateralID",
                    "SecondaryCollateralID",
                    "AdditionalCollateralID"
                });

                systemCodes.TryGetValue("LoanCycleTypeID", out var loanCycleTypeOptions);
                ViewData["LoanCycleTypeOptions"] = loanCycleTypeOptions ?? new List<SystemCodeDetail>();

                systemCodes.TryGetValue("SavingPaymentTypeID", out var slRecoveryTypeOptions);
                ViewData["SLRecoveryTypeOptions"] = slRecoveryTypeOptions ?? new List<SystemCodeDetail>();

                systemCodes.TryGetValue("SavingsTypeID", out var savingsCollectionTypeOptions);
                ViewData["SavingsCollectionTypeOptions"] = savingsCollectionTypeOptions ?? new List<SystemCodeDetail>();

                systemCodes.TryGetValue("PrimaryCollateralID", out var primaryCollateralOptions);
                ViewData["PrimaryCollateralOptions"] = primaryCollateralOptions ?? new List<SystemCodeDetail>();

                systemCodes.TryGetValue("SecondaryCollateralID", out var secondaryCollateralOptions);
                ViewData["SecondaryCollateralOptions"] = secondaryCollateralOptions ?? new List<SystemCodeDetail>();

                systemCodes.TryGetValue("AdditionalCollateralID", out var additionalCollateralOptions);
                ViewData["AdditionalCollateralOptions"] = additionalCollateralOptions ?? new List<SystemCodeDetail>();

                _logger.LogInformation("Microfinance Group Loan Scheme loaded successfully");
                return PartialView("~/Views/MicroFinance/GroupLoanScheme.cshtml");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Microfinance Group Loan Scheme");
                return RedirectToAction("Index", "Dashboard");
            }
        }

        [Route("GroupMaintenance")]
        [Route("Groups")]
        public IActionResult GroupMaintenance()
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated access attempt to Microfinance Group Maintenance");
                    return RedirectToAction("Index", "Login");
                }

                _logger.LogInformation("Microfinance Group Maintenance loaded successfully");
                return PartialView("~/Views/MicroFinance/GroupMaintenance.cshtml");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Microfinance Group Maintenance");
                return RedirectToAction("Index", "Dashboard");
            }
        }

        [HttpPost]
        [Route("old-api")]
        public async Task<IActionResult> PostOldApi([FromBody] MicroFinanceOldApiRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated Microfinance OldAPI attempt");
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

                _logger.LogInformation("Microfinance OldAPI request for {FormId}: {Request}", request.FormId, JsonSerializer.Serialize(envelope));

                var response = await _oldApiService.PostRawAsync<JsonElement>(MicroFinanceApiName, envelope);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Microfinance OldAPI request");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error processing microfinance request: {ex.Message}"
                });
            }
        }

        private object BuildOldApiEnvelope(string formId, JsonElement requestData)
        {
            // Backend expects RequestID with "dbo." prefix, FormID without it
            var withDbo    = formId.StartsWith("dbo.", StringComparison.OrdinalIgnoreCase) ? formId : $"dbo.{formId}";
            var withoutDbo = withDbo.Substring(4); // strip "dbo."

            var requestDictionary = DeserializeRequestData(requestData);
            EnsureMicroFinanceDefaults(requestDictionary, withDbo);

            return new
            {
                RequestID   = withDbo,
                FormID      = withoutDbo,
                RequestData = requestDictionary,
                RequestTime = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss", CultureInfo.InvariantCulture),
                AppName     = ResolveOldApiAppName(),
                Checksum    = string.Empty
            };
        }

        private Dictionary<string, object?> DeserializeRequestData(JsonElement requestData)
        {
            if (requestData.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
            {
                return new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            }

            var raw = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(requestData.GetRawText(), new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? [];

            var result = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            foreach (var (key, element) in raw)
            {
                result[key] = UnwrapJsonElement(element);
            }
            return result;
        }

        private static object? UnwrapJsonElement(JsonElement element) => element.ValueKind switch
        {
            JsonValueKind.String  => element.GetString(),
            JsonValueKind.True    => true,
            JsonValueKind.False   => false,
            JsonValueKind.Null    => null,
            JsonValueKind.Number  => element.TryGetInt64(out long l)  ? (object)l
                                   : element.TryGetDouble(out double d) ? d
                                   : element.GetRawText(),
            _                     => element.GetRawText()
        };

        private void EnsureMicroFinanceDefaults(IDictionary<string, object?> requestData, string formId)
        {
            var normalizedFormId = (formId ?? string.Empty).Trim();

            // Lookup/dropdown procedures below do not accept OperatorID/OurBranchID.
            // Injecting those causes SQL argument mismatch and empty dropdowns.
            var skipBranchAndOperator =
                normalizedFormId.Equals("dbo.p_GetSpConditionCalssCombo", StringComparison.OrdinalIgnoreCase)
                || normalizedFormId.Equals("p_GetSpConditionCalssCombo", StringComparison.OrdinalIgnoreCase)
                || normalizedFormId.Equals("dbo.p_GetSpConditionClassCombo", StringComparison.OrdinalIgnoreCase)
                || normalizedFormId.Equals("p_GetSpConditionClassCombo", StringComparison.OrdinalIgnoreCase)
                || normalizedFormId.Equals("dbo.pc_SearchSystemBranches", StringComparison.OrdinalIgnoreCase)
                || normalizedFormId.Equals("pc_SearchSystemBranches", StringComparison.OrdinalIgnoreCase)
                || normalizedFormId.Equals("dbo.p_AddEditGroupLoanMenu", StringComparison.OrdinalIgnoreCase)
                || normalizedFormId.Equals("p_AddEditGroupLoanMenu", StringComparison.OrdinalIgnoreCase);

            if (!skipBranchAndOperator)
            {
                SetIfMissing(requestData, "OperatorID", ResolveSessionValue("user_name", "user_id") ?? "web_portal");
                SetIfMissing(requestData, "OurBranchID", ResolveSessionValue("branch_code", "branch_id") ?? string.Empty);
            }

            // Some procedures (e.g., dbo.p_GetGroupDetails) do not declare BankID.
            // Injecting it causes "too many arguments specified" at SQL execution time.
            if (!normalizedFormId.Equals("dbo.p_GetGroupDetails", StringComparison.OrdinalIgnoreCase)
                && !normalizedFormId.Equals("p_GetGroupDetails", StringComparison.OrdinalIgnoreCase))
            {
                SetIfMissing(requestData, "BankID", ResolveSessionValue("bank_id", "bank_code") ?? "00");
            }
        }

        private void SetIfMissing(IDictionary<string, object?> requestData, string key, string value)
        {
            if (!requestData.TryGetValue(key, out var existing) || string.IsNullOrWhiteSpace(Convert.ToString(existing)))
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
}