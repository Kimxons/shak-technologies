using CBS.Entities.Common;
using CBS.Entities.SystemCore;
using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance/DemiseDetails")]
    public class ClientDemiseDetailsController : Controller
    {
        private readonly IAuthService _authService;
        private readonly ICommonUtilitiesService _commonUtilities;
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<ClientDemiseDetailsController> _logger;
        private const string OldApiName = "OldApi";

        public ClientDemiseDetailsController(
            IAuthService authService,
            ICommonUtilitiesService commonUtilities,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            ILogger<ClientDemiseDetailsController> logger)
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
                // Load dropdown options for demise reasons and document proof types
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "DemiseReasonID",
                    "DocumentProofID"
                });

                dropdownOptions.TryGetValue("DemiseReasonID", out var demiseReasonOptions);
                dropdownOptions.TryGetValue("DocumentProofID", out var documentProofOptions);

                ViewData["DemiseReasonOptions"] = demiseReasonOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["DocumentProofOptions"] = documentProofOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Demise Details dropdown options");
            }

            return PartialView("~/Views/Identities/ClientMaintenance/ClientDemiseDetails.cshtml");
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
                _logger.LogInformation("client-maintenance.demisedetails.get request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _oldApiService.CreateAsync<JsonElement>(OldApiName, OldApiDBConstants.GET_CLIENT_DEMISE_DETAILS, requestData!);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.demisedetails.get");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("create")]
        public async Task<IActionResult> Create([FromBody] ClientMaintenanceCrudRequest requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData?.ModuleID);
                _logger.LogInformation("client-maintenance.demisedetails.create request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _oldApiService.CreateAsync<JsonElement>(OldApiName, OldApiDBConstants.ADD_EDIT_CLIENT_DEMISE_DETAILS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.demisedetails.create");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("update")]
        public async Task<IActionResult> Update([FromBody] ClientMaintenanceCrudRequest requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData?.ModuleID);
                _logger.LogInformation("client-maintenance.demisedetails.update request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _oldApiService.CreateAsync<JsonElement>(OldApiName, OldApiDBConstants.ADD_EDIT_CLIENT_DEMISE_DETAILS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.demisedetails.update");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("delete")]
        public async Task<IActionResult> Delete([FromBody] ClientMaintenanceCrudRequest requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData?.ModuleID);
                _logger.LogInformation("client-maintenance.demisedetails.delete request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _oldApiService.CreateAsync<JsonElement>(OldApiName, OldApiDBConstants.DELETE_CLIENT_DEMISE_DETAILS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.demisedetails.delete");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }
    }
}
