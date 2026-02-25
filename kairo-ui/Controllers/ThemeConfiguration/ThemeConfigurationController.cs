using CBS.Entities.Common;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;

namespace kairo_ui.Controllers.ThemeConfiguration
{
    [Route("ThemeConfiguration")]
    public class ThemeConfigurationController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly IConfiguration _config;
        private readonly ILogger<ThemeConfigurationController> _logger;

        public record ThemeSettingSave(string ScopeType, string ScopeRefID, string ThemeName, string SettingsJson, string OperatorID);
        public ThemeConfigurationController(
            IAuthService authService,
            IApiService apiService,
            IConfiguration configuration,
            ILogger<ThemeConfigurationController> logger)
        {
            _authService = authService;
            _apiService = apiService;
            _config = configuration;
            _logger = logger;
        }

        [Route("Index")]
        /// <summary>
        /// Theme Configuration view - requires authentication
        /// </summary>
        public IActionResult Index()
        {
            try
            {
                // Check if user is authenticated
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated access attempt to theme configuration");
                    return RedirectToAction("Index", "Login");
                }

                _logger.LogInformation("Theme Configuration loaded successfully");
                return PartialView();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading theme configuration");
                return RedirectToAction("Index", "Dashboard");
            }
        }

        /// <summary>
        /// API endpoint to save theme settings
        /// Invokes the view controller to process theme configuration
        /// </summary>
        /// <param name="requestData">Theme settings data</param>
        /// <returns>JSON response with save status</returns>
        [HttpPost]
        [Route("save-theme")]
        public async Task<IActionResult> SaveThemeSettings([FromBody] ThemeSettingDto requestData)
        {
            try
            {
                _logger.LogInformation("SaveThemeSettings API called");

                // Log the inbound request
                _logger.LogInformation($"Theme Save Request: {System.Text.Json.JsonSerializer.Serialize(requestData)}");

                // Validate authentication
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated theme save attempt");
                    return Unauthorized(new
                    {
                        Success = false,
                        ErrorMessage = "User is not authenticated"
                    });
                }

                // Process the theme settings save via the service layer
                //var result = await ProcessThemeSaveAsync(requestData);

                requestData.UserID = HttpContext.Session.GetString("user_name");
                requestData.OperatorID = HttpContext.Session.GetString("user_name");
                requestData.BranchID = HttpContext.Session.GetString("branch_code");
                requestData.BankID = "00";

                var response = await _apiService.CreateAsync<ResponseDetail<object>>("SystemCoreApi", ApiEndpoints.ADD_THEME, requestData);


                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving theme settings");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error saving theme settings: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// API endpoint to get effective theme settings
        /// Invokes the view controller to retrieve theme configuration
        /// </summary>
        /// <param name="requestData">Request parameters for theme retrieval</param>
        /// <returns>JSON response with effective theme settings</returns>
        [HttpPost]
        [Route("get-effective-theme")]
        public async Task<IActionResult> GetEffectiveTheme([FromBody] ThemeSettingDto requestData)
        {
            try
            {
                _logger.LogInformation("GetEffectiveTheme API called");

                // Log the inbound request
                _logger.LogInformation($"Theme Get Request: {System.Text.Json.JsonSerializer.Serialize(requestData)}");

                // Validate authentication
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated theme get attempt");
                    return Unauthorized(new
                    {
                        Success = false,
                        ErrorMessage = "User is not authenticated"
                    });
                }

                // Process the theme retrieval via the service layer
                //var result = await ProcessThemeRetrievalAsync(requestData);
                requestData.UserID = HttpContext.Session.GetString("user_name");
                requestData.BranchID = HttpContext.Session.GetString("branch_code");
                requestData.BankID = "00";

                var response = await _apiService.CreateAsync<ResponseDetail<object>>("SystemCoreApi", ApiEndpoints.GET_EFFECTIVETHEME, requestData);


                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving effective theme");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error retrieving effective theme: {ex.Message}"
                });
            }
        }

    }
    public class ThemeSettingDto()
    {
        public string? ScopeType { get; set; }
        public string? UserID { get; set; }
        public string? BranchID { get; set; }
        public string? BankID { get; set; }
        public string? ScopeRefID { get; set; }
        public string? ThemeName { get; set; }
        public object? SettingsJson { get; set; }
        public string? OperatorID { get; set; }
    };
}
