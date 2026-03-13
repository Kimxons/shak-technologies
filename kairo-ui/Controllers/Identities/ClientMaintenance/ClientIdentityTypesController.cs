using CBS.Entities.Common;
using CBS.Entities.SystemCore;
using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance/IdentityTypes")]
    public class ClientIdentityTypesController : Controller
    {
        private readonly IAuthService _authService;
        private readonly ICommonUtilitiesService _commonUtilities;
        private readonly IApiCachedService _apiCachedService;
        private readonly IOldApiService _oldApiService;
        private readonly ILogger<ClientIdentityTypesController> _logger;
        private const string OldApiName = "OldApi";

        public ClientIdentityTypesController(
            IAuthService authService,
            ICommonUtilitiesService commonUtilities,
            IApiCachedService apiCachedService,
            IOldApiService oldApiService,
            ILogger<ClientIdentityTypesController> logger)
        {
            _authService = authService;
            _commonUtilities = commonUtilities;
            _apiCachedService = apiCachedService;
            _oldApiService = oldApiService;
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
                // Load dropdown options for identification type
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "IdentificationTypeID"
                });

                dropdownOptions.TryGetValue("IdentificationTypeID", out var idTypeOptions);
                ViewData["IdentificationTypeOptions"] = idTypeOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Identity Types tab dropdown options");
            }

            return View("~/Views/Identities/ClientMaintenance/ClientIdentityTypes.cshtml");
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
                // p_GetClientIdentityType only accepts: ClientID, OperatorID, IdentityTypeID
                var getRequest = new
                {
                    ClientID = requestData["ClientID"]?.ToString() ?? string.Empty,
                    OperatorID = requestData["OperatorID"]?.ToString() ?? _commonUtilities.ResolveSessionValue("user_name", "user_id") ?? string.Empty,
                    IdentityTypeID = requestData["IdentityTypeID"]?.ToString() ?? string.Empty
                };
                
                _logger.LogInformation("client-maintenance.identitytypes.get request: {Request}", JsonSerializer.Serialize(getRequest));
                var response = await _oldApiService.CreateAsync<JsonElement>(OldApiName, OldApiDBConstants.GET_CLIENT_IDENTITY_TYPE, getRequest);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.identitytypes.get");
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
                _logger.LogInformation("client-maintenance.identitytypes.create request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _oldApiService.CreateAsync<JsonElement>(OldApiName, OldApiDBConstants.ADD_EDIT_CLIENT_IDENTITY_TYPES, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.identitytypes.create");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("update")]
        public async Task<IActionResult> Update([FromBody] System.Text.Json.Nodes.JsonNode requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());
                _logger.LogInformation("client-maintenance.identitytypes.update request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _oldApiService.CreateAsync<JsonElement>(OldApiName, OldApiDBConstants.ADD_EDIT_CLIENT_IDENTITY_TYPES, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.identitytypes.update");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("delete")]
        public async Task<IActionResult> Delete([FromBody] System.Text.Json.Nodes.JsonNode requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());
                _logger.LogInformation("client-maintenance.identitytypes.delete request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _oldApiService.CreateAsync<JsonElement>(OldApiName, OldApiDBConstants.DELETE_CLIENT_IDENTITY_TYPES, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.identitytypes.delete");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }
    }
}
