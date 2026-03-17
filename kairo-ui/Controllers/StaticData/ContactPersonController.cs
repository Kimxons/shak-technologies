using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData/ContactPerson")]
    public class ContactPersonController : StaticDataModuleControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly ILogger<ContactPersonController> _logger;

        public ContactPersonController(
            IAuthService authService,
            IApiService apiService,
            ILogger<ContactPersonController> logger)
            : base(authService, logger)
        {
            _authService = authService;
            _apiService = apiService;
            _logger = logger;
        }

        [HttpGet("")]
        [HttpGet("Index")]
        public IActionResult Index() => RenderModuleView("ContactPerson");

        [HttpGet("Page")]
        [Route("~/StaticData/ContactPersonPage")]
        public IActionResult Page() => RenderModuleView("ContactPersonPage");

        [HttpPost("get")]
        public async Task<IActionResult> Get([FromBody] ContactPersonGetRequest request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { success = false, message = "Not authenticated" });

            try
            {
                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    StaticDataEndpoints.GET_CONTACT_PERSON,
                    request
                );
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting contact person");
                return Ok(new { Success = false, ResponseCode = "99", ResponseMessage = ex.Message });
            }
        }

        [HttpPost("save")]
        public async Task<IActionResult> Save([FromBody] ContactPersonSaveRequest request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { success = false, message = "Not authenticated" });

            try
            {
                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    StaticDataEndpoints.ADD_EDIT_CONTACT_PERSON,
                    request
                );
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving contact person");
                return Ok(new { Success = false, ResponseCode = "99", ResponseMessage = ex.Message });
            }
        }

        [HttpPost("delete")]
        public async Task<IActionResult> Delete([FromBody] ContactPersonDeleteRequest request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { success = false, message = "Not authenticated" });

            try
            {
                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    StaticDataEndpoints.DELETE_CONTACT_PERSON,
                    request
                );
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting contact person");
                return Ok(new { Success = false, ResponseCode = "99", ResponseMessage = ex.Message });
            }
        }
    }

    public class ContactPersonGetRequest
    {
        public string? ContactPersonID { get; set; }
        public int Direction { get; set; } = 0;
        public string? OperatorID { get; set; }
    }

    public class ContactPersonSaveRequest
    {
        public string? ContactPersonID { get; set; }
        public string? ContactPersonDesc { get; set; }
        public string? Title { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public bool IsActive { get; set; }
        public string? CreatedBy { get; set; }
        public string? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public string? ModifiedOn { get; set; }
        public int NewRecord { get; set; }
        public string? OperatorID { get; set; }
    }

    public class ContactPersonDeleteRequest
    {
        public string? ContactPersonID { get; set; }
        public string? OperatorID { get; set; }
    }
}
