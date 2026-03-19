using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;
using kairo_ui.Models.Shared;
using CBS.Entities.SystemCore;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData/BankMaster")]
    public class BankMasterController : StaticDataModuleControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IApiCachedService _apiCachedService;
        private readonly IOldApiService _oldApiService;
        private readonly ILogger<BankMasterController> _logger;
        private const string OldApiName = "OldApi";

        public BankMasterController(
            IAuthService authService,
            IApiCachedService apiCachedService,
            IOldApiService oldApiService,
            ILogger<BankMasterController> logger)
            : base(authService, logger)
        {
            _authService = authService;
            _apiCachedService = apiCachedService;
            _oldApiService = oldApiService;
            _logger = logger;
        }

        [HttpGet("")]
        [HttpGet("Index")]
        [HttpGet("~/StaticData/frmBankMaster.aspx")]
        public async Task<IActionResult> Index()
        {
            return await RenderSectionAsync("banks");
        }

        [HttpGet("~/StaticData/BankSignatory")]
        [HttpGet("~/StaticData/frmBankSignatory.aspx")]
        public async Task<IActionResult> BankSignatory()
        {
            return await RenderSectionAsync("signatories");
        }

        [HttpGet("~/StaticData/Branch")]
        [HttpGet("~/StaticData/frmBranch.aspx")]
        [HttpGet("~/StaticData/frmBranches.aspx")]
        public async Task<IActionResult> Branch()
        {
            return await RenderSectionAsync("branches");
        }

        [HttpGet("~/Treasury/BankLimitMaintenance")]
        [HttpGet("~/Treasury/frmBankLimitMaintenance.aspx")]
        public async Task<IActionResult> BankLimitMaintenance()
        {
            return await RenderSectionAsync("limits");
        }

        [HttpPost("api/get-bank-details")]
        public async Task<IActionResult> GetBankDetails([FromBody] BankDetailsRequest request)
        {
            if (!_authService.IsAuthenticated())
            {
                return Unauthorized(new { success = false, errorMessage = "Not authenticated" });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.BankID))
            {
                return BadRequest(new { success = false, errorMessage = "Bank ID is required" });
            }

            var payload = new
            {
                BankID = request.BankID,
                OurBranchID = request.OurBranchID,
                OperatorID = request.OperatorID,
                Direction = request.Direction
            };

            var response = await _oldApiService.CreateAsync<JsonElement>(
                OldApiName,
                "p_GetBanks",
                payload);

            var bankDetail = TryExtractBankDetailRow(response);
            return Ok(new { success = true, data = bankDetail });
        }

        [HttpPost("api/get-bank-signatories")]
        public async Task<IActionResult> GetBankSignatories([FromBody] BankSignatoryLookupRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { success = false, errorMessage = "Not authenticated" });
                }

                if (request == null || string.IsNullOrWhiteSpace(request.BankID))
                {
                    return Ok(new { ResponseCode = "XX", ResponseMessage = "Bank ID is required" });
                }

                EnsureRequestDefaults(request);

                var spInput = JsonSerializer.Serialize(new
                {
                    RequestData = new
                    {
                        BankID = request.BankID,
                        SignatoryID = request.SignatoryID ?? string.Empty,
                        OurBranchID = request.OurBranchID ?? string.Empty,
                        OperatorID = request.OperatorID ?? string.Empty,
                        Direction = request.Direction,
                        GetAll = request.GetAll
                    }
                });

                var payload = new RequestDataPayload { RequestData = spInput };
                var response = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    "dbo.p_V8_GetBankSignatories",
                    payload);

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving bank signatories for bank {BankID}", request?.BankID);
                return Ok(new { ResponseCode = "XX", ResponseMessage = ex.Message });
            }
        }

        [HttpPost("api/search-branches")]
        public async Task<IActionResult> SearchBranches([FromBody] BranchSearchRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { success = false, errorMessage = "Not authenticated" });
                }

                if (request == null || string.IsNullOrWhiteSpace(request.BankID))
                {
                    return Ok(new { ResponseCode = "XX", ResponseMessage = "Bank ID is required" });
                }

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    "dbo.pc_SearchSystemBranches",
                    new
                    {
                        BankID = request.BankID
                    });

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching branches for bank {BankID}", request?.BankID);
                return Ok(new { ResponseCode = "XX", ResponseMessage = ex.Message });
            }
        }

        [HttpPost("api/get-branch-details")]
        public async Task<IActionResult> GetBranchDetails([FromBody] BranchDetailsRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { success = false, errorMessage = "Not authenticated" });
                }

                if (request == null || string.IsNullOrWhiteSpace(request.BankID) || string.IsNullOrWhiteSpace(request.BranchID))
                {
                    return BadRequest(new { success = false, errorMessage = "Bank ID and Branch ID are required" });
                }

                EnsureRequestDefaults(request);

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    "dbo.p_GetBranches",
                    new
                    {
                        BankID = request.BankID,
                        BranchID = request.BranchID,
                        OurBranchID = request.OurBranchID ?? string.Empty,
                        OperatorID = request.OperatorID ?? string.Empty,
                        Direction = request.Direction
                    });

                var branchDetail = TryExtractBranchDetailRow(response);
                return Ok(new { success = true, data = branchDetail });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving branch {BranchID} for bank {BankID}", request?.BranchID, request?.BankID);
                return Ok(new { success = false, errorMessage = ex.Message });
            }
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

        private async Task<IActionResult> RenderSectionAsync(string section)
        {
            ViewData["InitialSection"] = string.IsNullOrWhiteSpace(section) ? "banks" : section;
            ViewData["SideBarModel"] = string.Equals(section, "banks", StringComparison.OrdinalIgnoreCase)
                ? BuildSideBarModel()
                : null;

            await PopulateDropdownsAsync();
            return RenderModuleView("BankMaster");
        }

        private async Task PopulateDropdownsAsync()
        {
            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "InstitutionTypeID",
                    "BranchTypeID",
                    "CityID",
                    "CountryID"
                });

                dropdownOptions.TryGetValue("InstitutionTypeID", out var institutionTypeOptions);
                dropdownOptions.TryGetValue("BranchTypeID", out var branchTypeOptions);
                dropdownOptions.TryGetValue("CityID", out var cityOptions);
                dropdownOptions.TryGetValue("CountryID", out var countryOptions);
                ViewData["InstitutionTypeOptions"] = institutionTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["BranchTypeOptions"] = branchTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["CityOptions"] = cityOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["CountryOptions"] = countryOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Bank Master dropdown options");
                ViewData["InstitutionTypeOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["BranchTypeOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["CityOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["CountryOptions"] = Enumerable.Empty<SelectListItem>();
            }
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
                        MenuDescription = "Clearing Bank",
                        ModuleName = "Maintain bank details",
                        MenuURL = "/StaticData/frmBankMaster.aspx",
                        CustomMenuURL = "banks",
                        ModuleIcon = "<i class='bi bi-bank sidebar-item__icon'></i>"
                    },
                    new()
                    {
                        ModuleTypeID = "D",
                        MenuItemOrder = 2,
                        MenuDescription = "Signatories",
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
                    },
                    new()
                    {
                        ModuleTypeID = "D",
                        MenuItemOrder = 4,
                        MenuDescription = "Bank Limit Maintenance",
                        ModuleName = "Manage bank limits",
                        MenuURL = "/Treasury/BankLimitMaintenance",
                        CustomMenuURL = "limits",
                        ModuleIcon = "<i class='bi bi-cash-stack sidebar-item__icon'></i>"
                    }
                }
            };
        }

        private void EnsureRequestDefaults(BankSignatoryLookupRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.OperatorID))
            {
                request.OperatorID = ResolveSessionValue("user_name", "user_id") ?? string.Empty;
            }

            if (string.IsNullOrWhiteSpace(request.OurBranchID))
            {
                request.OurBranchID = ResolveSessionValue("branch_code", "branch_id") ?? string.Empty;
            }
        }

        private void EnsureRequestDefaults(BranchDetailsRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.OperatorID))
            {
                request.OperatorID = ResolveSessionValue("user_name", "user_id") ?? string.Empty;
            }

            if (string.IsNullOrWhiteSpace(request.OurBranchID))
            {
                request.OurBranchID = ResolveSessionValue("branch_code", "branch_id") ?? string.Empty;
            }
        }

        private string? ResolveSessionValue(params string[] keys)
        {
            foreach (var key in keys)
            {
                var value = HttpContext.Session.GetString(key);
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }

            return null;
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

        private static JsonElement? TryExtractBankDetailRow(JsonElement response)
        {
            foreach (var candidate in EnumerateArrays(response))
            {
                foreach (var row in candidate.EnumerateArray())
                {
                    if (row.ValueKind != JsonValueKind.Object)
                    {
                        continue;
                    }

                    var bankId = GetString(row, "BankID", "bankID", "BankId", "bankId");
                    var bankName = GetString(row, "BankName", "bankName", "BANKNAME");

                    if (!string.IsNullOrWhiteSpace(bankId) && !string.IsNullOrWhiteSpace(bankName))
                    {
                        return row.Clone();
                    }
                }
            }

            return null;
        }

        private static JsonElement? TryExtractBranchDetailRow(JsonElement response)
        {
            foreach (var candidate in EnumerateArrays(response))
            {
                foreach (var row in candidate.EnumerateArray())
                {
                    if (row.ValueKind != JsonValueKind.Object)
                    {
                        continue;
                    }

                    var branchId = GetString(row, "BranchID", "branchID", "BranchId", "branchId", "ClearingBranchID");
                    var branchName = GetString(row, "BranchName", "branchName", "ClearingBranchName", "Name");

                    if (!string.IsNullOrWhiteSpace(branchId) && !string.IsNullOrWhiteSpace(branchName))
                    {
                        return row.Clone();
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

    public class BankSignatoryLookupRequest
    {
        public string? BankID { get; set; }
        public string? SignatoryID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public int Direction { get; set; }
        public int GetAll { get; set; }
    }

    public class BankDetailsRequest
    {
        public string? BankID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public int Direction { get; set; } = 0;
    }

    public class BranchSearchRequest
    {
        public string? BankID { get; set; }
    }

    public class BranchDetailsRequest
    {
        public string? BankID { get; set; }
        public string? BranchID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public int Direction { get; set; } = 0;
    }

    public class RequestDataPayload
    {
        public string RequestData { get; set; } = string.Empty;
    }
}