using CBS.Entities.Common;
using CBS.Entities.SystemCore;
using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance/ProfileChange")]
    public class ClientProfileChangeController : Controller
    {
        private readonly IAuthService _authService;
        private readonly ICommonUtilitiesService _commonUtilities;
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<ClientProfileChangeController> _logger;
        private const string OldApiName = "OldApi";

        public ClientProfileChangeController(
            IAuthService authService,
            ICommonUtilitiesService commonUtilities,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            ILogger<ClientProfileChangeController> logger)
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
                // Load dropdown options for profile change fields
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "TitleID",
                    "GenderID",
                    "ClientTypeID",
                    "ChangeReasonID"
                });

                dropdownOptions.TryGetValue("TitleID", out var titleOptions);
                dropdownOptions.TryGetValue("GenderID", out var genderOptions);
                dropdownOptions.TryGetValue("ClientTypeID", out var clientTypeOptions);
                dropdownOptions.TryGetValue("ChangeReasonID", out var changeReasonOptions);

                ViewData["TitleOptions"] = titleOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["GenderOptions"] = genderOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["ClientTypeOptions"] = clientTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["ChangeReasonOptions"] = changeReasonOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Profile Change dropdown options");
            }

            return PartialView("~/Views/Identities/ClientMaintenance/ClientProfileChange.cshtml");
        }

        [HttpPost, Route("get")]
        public async Task<IActionResult> Get([FromBody] System.Text.Json.Nodes.JsonNode requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());
                _logger.LogInformation("client-maintenance.profilechange.get request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _oldApiService.CreateAsync<JsonElement>(OldApiName, OldApiDBConstants.GET_CLIENT_PROFILE_CHANGES, requestData!);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.profilechange.get");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("create")]
        public async Task<IActionResult> Create([FromBody] System.Text.Json.Nodes.JsonNode requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());
                _logger.LogInformation("client-maintenance.profilechange.create request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _oldApiService.CreateAsync<JsonElement>(OldApiName, OldApiDBConstants.ADD_EDIT_CLIENT_PROFILE_CHANGE, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.profilechange.create");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }
    }
}
