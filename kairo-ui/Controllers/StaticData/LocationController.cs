using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData/Location")]
    public class LocationController : StaticDataModuleControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly ILogger<LocationController> _logger;

        public LocationController(
            IAuthService authService,
            IApiService apiService,
            ILogger<LocationController> logger)
            : base(authService, logger)
        {
            _authService = authService;
            _apiService = apiService;
            _logger = logger;
        }

        [HttpGet("")]
        [HttpGet("Index")]
        public IActionResult Index() => RenderModuleView("Location");

        [HttpPost("get")]
        public async Task<IActionResult> Get([FromBody] LocationGetRequest request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { success = false, message = "Not authenticated" });

            try
            {
                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    StaticDataEndpoints.GET_LOCATION,
                    request
                );
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting location");
                return Ok(new { Success = false, ResponseCode = "99", ResponseMessage = ex.Message });
            }
        }

        [HttpPost("save")]
        public async Task<IActionResult> Save([FromBody] LocationSaveRequest request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { success = false, message = "Not authenticated" });

            try
            {
                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    StaticDataEndpoints.ADD_EDIT_LOCATION,
                    request
                );
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving location");
                return Ok(new { Success = false, ResponseCode = "99", ResponseMessage = ex.Message });
            }
        }

        [HttpPost("delete")]
        public async Task<IActionResult> Delete([FromBody] LocationDeleteRequest request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { success = false, message = "Not authenticated" });

            try
            {
                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    StaticDataEndpoints.DELETE_LOCATION,
                    request
                );
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting location");
                return Ok(new { Success = false, ResponseCode = "99", ResponseMessage = ex.Message });
            }
        }
    }

    public class LocationGetRequest
    {
        public string? LocationID { get; set; }
        public int Direction { get; set; } = 0;
        public string? OperatorID { get; set; }
    }

    public class LocationSaveRequest
    {
        public string? LocationID { get; set; }
        public string? LocationName { get; set; }
        public string? Building { get; set; }
        public string? RoomOffice { get; set; }
        public bool Store { get; set; }
        public string? CreatedBy { get; set; }
        public string? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public string? ModifiedOn { get; set; }
        public int NewRecord { get; set; }
        public string? OperatorID { get; set; }
    }

    public class LocationDeleteRequest
    {
        public string? LocationID { get; set; }
        public string? OperatorID { get; set; }
    }
}
