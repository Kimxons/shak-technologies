using System.Text.Json;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace kairo_ui.Controllers.AccountsMaintenance
{
    [Route("AccountsMaintenance/CancelStopPayment")]
    public class CancelStopPaymentController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiCachedService _apiCachedService;
        private readonly IApiService _apiService;
        private readonly ICommonUtilitiesService _commonUtilities;
        private readonly ILogger<CancelStopPaymentController> _logger;

        public CancelStopPaymentController(
            IAuthService authService,
            IApiCachedService apiCachedService,
            IApiService apiService,
            ICommonUtilitiesService commonUtilities,
            ILogger<CancelStopPaymentController> logger)
        {
            _authService = authService;
            _apiCachedService = apiCachedService;
            _apiService = apiService;
            _commonUtilities = commonUtilities;
            _logger = logger;
        }

        [HttpGet]
        [Route("")]
        [Route("Index")]
        public async Task<IActionResult> Index()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized();

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "CancelPaymentID"
                });

                dropdownOptions.TryGetValue("CancelPaymentID", out var reasonOptions);
                ViewData["CancelStopPaymentReasonOptions"] = reasonOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading CancelStopPayment dropdown options");
                ViewData["CancelStopPaymentReasonOptions"] = Enumerable.Empty<SelectListItem>();
            }

            return PartialView("~/Views/AccountsMaintenance/CancelStopPayment.cshtml");
        }

        [HttpPost]
        [Route("api/get")]
        public async Task<IActionResult> Get([FromBody] GenericAccountRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                _commonUtilities.EnsureDefaults(request);

                if (string.IsNullOrWhiteSpace(request.AccountTypeID))
                {
                    request.AccountTypeID = "C";
                }

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_CANCEL_STOP_PAYMENTS,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cancel stop payments");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/create")]
        public async Task<IActionResult> Create([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.ADD_CANCEL_STOP_PAYMENT,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding cancel stop payment");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/update")]
        public async Task<IActionResult> Update([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.UPDATE_CANCEL_STOP_PAYMENT,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating cancel stop payment");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/delete")]
        public async Task<IActionResult> Delete([FromBody] JsonElement request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var requestDict = JsonSerializer.Deserialize<Dictionary<string, object>>(request.GetRawText()) ?? new Dictionary<string, object>();
                if (!requestDict.ContainsKey("NewRecord"))
                {
                    requestDict["NewRecord"] = -1;
                }

                _commonUtilities.EnsureDefaults(requestDict);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.UPDATE_CANCEL_STOP_PAYMENT,
                    requestDict
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting cancel stop payment");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }
    }
}
