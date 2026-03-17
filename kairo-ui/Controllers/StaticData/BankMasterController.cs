using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using kairo_ui.Models.Shared;
using CBS.Entities.SystemCore;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData/BankMaster")]
    public class BankMasterController : StaticDataModuleControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly ILogger<BankMasterController> _logger;

        public BankMasterController(
            IAuthService authService,
            IOldApiService oldApiService,
            ILogger<BankMasterController> logger)
            : base(authService, logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _logger = logger;
        }

        [HttpGet("")]
        [HttpGet("Index")]
        [HttpGet("~/StaticData/frmBankMaster.aspx")]
        public IActionResult Index()
        {
            return RenderSection("banks");
        }

        [HttpGet("~/StaticData/BankSignatory")]
        [HttpGet("~/StaticData/frmBankSignatory.aspx")]
        public IActionResult BankSignatory()
        {
            return RenderSection("signatories");
        }

        [HttpGet("~/StaticData/Branch")]
        [HttpGet("~/StaticData/frmBranch.aspx")]
        [HttpGet("~/StaticData/frmBranches.aspx")]
        public IActionResult Branch()
        {
            return RenderSection("branches");
        }

        [HttpGet("~/Treasury/BankLimitMaintenance")]
        [HttpGet("~/Treasury/frmBankLimitMaintenance.aspx")]
        public IActionResult BankLimitMaintenance()
        {
            return RenderSection("limits");
        }

        [HttpPost("api/get-photo-image")]
        public async Task<IActionResult> GetPhotoImage([FromBody] SignatoryImageRequest request)
        {
            return await GetImageInternalAsync(request, "P");
        }

        [HttpPost("api/get-signature-image")]
        public async Task<IActionResult> GetSignatureImage([FromBody] SignatoryImageRequest request)
        {
            return await GetImageInternalAsync(request, "S");
        }

        private IActionResult RenderSection(string section)
        {
            ViewData["InitialSection"] = string.IsNullOrWhiteSpace(section) ? "banks" : section;
            ViewData["SideBarModel"] = string.Equals(section, "banks", StringComparison.OrdinalIgnoreCase)
                ? BuildSideBarModel()
                : null;
            return RenderModuleView("BankMaster");
        }

        private static SideBarViewDModel BuildSideBarModel()
        {
            return new SideBarViewDModel
            {
                ModuleID = 0,
                UseSubmoduleNavigation = true,
                RecentActivities = new List<RecentActivityItem>(),
                SubModules = new List<Module>
                {
                    new()
                    {
                        ModuleTypeID = "D",
                        MenuItemOrder = 1,
                        MenuDescription = "Bank Limit Maintenance",
                        ModuleName = "Manage bank limits",
                        MenuURL = "/Treasury/BankLimitMaintenance",
                        CustomMenuURL = "limits",
                        ModuleIcon = "<i class='bi bi-cash-stack sidebar-item__icon'></i>"
                    },
                    new()
                    {
                        ModuleTypeID = "D",
                        MenuItemOrder = 2,
                        MenuDescription = "Clearing Bank Signatories",
                        ModuleName = "Manage signatories",
                        MenuURL = "/StaticData/BankSignatory",
                        CustomMenuURL = "signatories",
                        ModuleIcon = "<i class='bi bi-person-badge sidebar-item__icon'></i>"
                    },
                    new()
                    {
                        ModuleTypeID = "D",
                        MenuItemOrder = 3,
                        MenuDescription = "Clearing Branches",
                        ModuleName = "Maintain branch records under the active bank",
                        MenuURL = "/StaticData/Branch",
                        CustomMenuURL = "branches",
                        ModuleIcon = "<i class='bi bi-diagram-3 sidebar-item__icon'></i>"
                    }
                }
            };
        }

        private async Task<IActionResult> GetImageInternalAsync(SignatoryImageRequest? request, string imageType)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { success = false, errorMessage = "Not authenticated" });
                }

                if (request == null || string.IsNullOrWhiteSpace(request.SignatoryID))
                {
                    return Ok(new { success = false, imageData = (string?)null, errorMessage = "Signatory ID is required" });
                }

                var payload = new
                {
                    OurBranchID = request.OurBranchID,
                    SignatoryID = request.SignatoryID,
                    ImageType = imageType,
                    OperatorID = request.OperatorID
                };

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_SIGNATORY_IMAGE,
                    payload);

                var imageData = TryExtractImageData(response, imageType);
                return Ok(new { success = !string.IsNullOrWhiteSpace(imageData), imageData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving signatory image type {ImageType}", imageType);
                return Ok(new { success = false, imageData = (string?)null, errorMessage = ex.Message });
            }
        }

        private static string? TryExtractImageData(JsonElement response, string imageType)
        {
            foreach (var candidate in EnumerateArrays(response))
            {
                foreach (var row in candidate.EnumerateArray())
                {
                    var imageData = GetString(
                        row,
                        "ImageData",
                        imageType == "P" ? "PhotoImage" : "SignatureImage",
                        "Image",
                        "Photo",
                        "Signature");

                    if (!string.IsNullOrWhiteSpace(imageData))
                    {
                        return imageData;
                    }
                }
            }

            return null;
        }

        private static IEnumerable<JsonElement> EnumerateArrays(JsonElement element)
        {
            if (element.ValueKind == JsonValueKind.Array)
            {
                yield return element;
                yield break;
            }

            if (element.ValueKind != JsonValueKind.Object)
            {
                yield break;
            }

            foreach (var property in element.EnumerateObject())
            {
                if (property.Value.ValueKind == JsonValueKind.Array)
                {
                    yield return property.Value;
                    continue;
                }

                foreach (var nested in EnumerateArrays(property.Value))
                {
                    yield return nested;
                }
            }
        }

        private static string? GetString(JsonElement element, params string[] propertyNames)
        {
            foreach (var propertyName in propertyNames)
            {
                if (!TryGetPropertyIgnoreCase(element, propertyName, out var propertyValue))
                {
                    continue;
                }

                var value = propertyValue.ValueKind switch
                {
                    JsonValueKind.String => propertyValue.GetString(),
                    JsonValueKind.Number => propertyValue.ToString(),
                    JsonValueKind.True => bool.TrueString,
                    JsonValueKind.False => bool.FalseString,
                    _ => null
                };

                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }

            return null;
        }

        private static bool TryGetPropertyIgnoreCase(JsonElement element, string propertyName, out JsonElement propertyValue)
        {
            if (element.ValueKind == JsonValueKind.Object)
            {
                foreach (var property in element.EnumerateObject())
                {
                    if (string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
                    {
                        propertyValue = property.Value;
                        return true;
                    }
                }
            }

            propertyValue = default;
            return false;
        }
    }

    public class SignatoryImageRequest
    {
        public string? OurBranchID { get; set; }
        public string? SignatoryID { get; set; }
        public string? OperatorID { get; set; }
    }
}