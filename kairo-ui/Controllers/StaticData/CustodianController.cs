using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData/Custodian")]
    public class CustodianController : StaticDataModuleControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly ILogger<CustodianController> _logger;

        public CustodianController(
            IAuthService authService,
            IApiService apiService,
            ILogger<CustodianController> logger)
            : base(authService, logger)
        {
            _authService = authService;
            _apiService = apiService;
            _logger = logger;
        }

        [HttpGet("")]
        [HttpGet("Index")]
        public IActionResult Index() => RenderModuleView("CustodianPage");

        [HttpGet("Page")]
        [Route("~/StaticData/CustodianPage")]
        public IActionResult Page() => RenderModuleView("CustodianPage");

        [HttpPost("get")]
        public async Task<IActionResult> Get([FromBody] CustodianGetRequest request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { success = false, message = "Not authenticated" });

            try
            {
                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    StaticDataEndpoints.GET_CUSTODIAN,
                    request
                );
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting custodian");
                return Ok(new { Success = false, ResponseCode = "99", ResponseMessage = ex.Message });
            }
        }

        [HttpPost("save")]
        public async Task<IActionResult> Save([FromBody] CustodianSaveRequest request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { success = false, message = "Not authenticated" });

            try
            {
                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    StaticDataEndpoints.ADD_EDIT_CUSTODIAN,
                    request
                );
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving custodian");
                return Ok(new { Success = false, ResponseCode = "99", ResponseMessage = ex.Message });
            }
        }

        [HttpPost("delete")]
        public async Task<IActionResult> Delete([FromBody] CustodianDeleteRequest request)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { success = false, message = "Not authenticated" });

            try
            {
                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    StaticDataEndpoints.DELETE_CUSTODIAN,
                    request
                );
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting custodian");
                return Ok(new { Success = false, ResponseCode = "99", ResponseMessage = ex.Message });
            }
        }
    }

    public class CustodianGetRequest
    {
        public string? CustodianID { get; set; }
        public int Direction { get; set; } = 0;
        public string? OperatorID { get; set; }
    }

    public class CustodianSaveRequest
    {
        public string? CustodianID { get; set; }
        public string? Name { get; set; }
        public string? Department { get; set; }
        public string? Section { get; set; }
        public string? CreatedBy { get; set; }
        public string? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public string? ModifiedOn { get; set; }
        public int NewRecord { get; set; }
        public string? OperatorID { get; set; }
    }

    public class CustodianDeleteRequest
    {
        public string? CustodianID { get; set; }
        public string? OperatorID { get; set; }
    }
}
