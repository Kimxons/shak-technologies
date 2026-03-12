using CBS.Entities.Common;
using CBS.Entities.SystemCore;
using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance/Portfolio")]
    public class ClientPortfolioController : Controller
    {
        private readonly IAuthService _authService;
        private readonly ICommonUtilitiesService _commonUtilities;
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<ClientPortfolioController> _logger;
        private const string OldApiName = "OldApi";

        public ClientPortfolioController(
            IAuthService authService,
            ICommonUtilitiesService commonUtilities,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            ILogger<ClientPortfolioController> logger)
        {
            _authService = authService;
            _commonUtilities = commonUtilities;
            _oldApiService = oldApiService;
            _apiCachedService = apiCachedService;
            _logger = logger;
        }

        [HttpGet]
        [Route("Index")]
        public async Task<IActionResult> Index(string? moduleId = null, string? clientId = null, string? requestId = null)
        {
            if (!_authService.IsAuthenticated()) return RedirectToAction("Index", "Login");

            ViewData["ModuleId"] = moduleId ?? string.Empty;
            ViewData["ClientId"] = clientId ?? string.Empty;
            ViewData["RequestId"] = requestId ?? string.Empty;
            ViewData["AutoLoad"] = (!string.IsNullOrWhiteSpace(clientId) || !string.IsNullOrWhiteSpace(requestId)).ToString().ToLower();

            try
            {
                // Load dropdown options for report type and product type
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "PortfolioReportTypeID",
                    "ProductTypeID"
                });

                dropdownOptions.TryGetValue("PortfolioReportTypeID", out var reportTypeOptions);
                dropdownOptions.TryGetValue("ProductTypeID", out var productTypeOptions);

                ViewData["ReportTypeOptions"] = reportTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["ProductTypeOptions"] = productTypeOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Portfolio dropdown options");
            }

            return PartialView("~/Views/Identities/ClientMaintenance/ClientPortfolio.cshtml");
        }

        [HttpPost, Route("get")]
        public async Task<IActionResult> Get([FromBody] JsonDocument requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData?.RootElement.GetProperty("ModuleID").GetString());
                _logger.LogInformation("client-maintenance.portfolio.get request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _oldApiService.CreateAsync<JsonElement>(OldApiName, OldApiDBConstants.GET_CLIENT_PORTFOLIO, requestData!);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.portfolio.get");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }
    }
}
