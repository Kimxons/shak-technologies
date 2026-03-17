using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using System.Text.Json;
using System.Xml.Linq;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData/DeviceManager")]
    public class DeviceManagerController : StaticDataModuleControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly ILogger<DeviceManagerController> _logger;

        public DeviceManagerController(
            IAuthService authService,
            IOldApiService oldApiService,
            ILogger<DeviceManagerController> logger)
            : base(authService, logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _logger = logger;
        }

        [HttpGet("")]
        [HttpGet("Index")]
        public IActionResult Index()
        {
            return RenderModuleView("DeviceManager");
        }

        [HttpPost("api/get-device-manager")]
        public async Task<IActionResult> GetDeviceManager([FromBody] DeviceManagerRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });
                }

                var branchId = string.IsNullOrWhiteSpace(request.BranchID)
                    ? HttpContext.Session.GetString("branch_code") ?? string.Empty
                    : request.BranchID;

                var payload = new
                {
                    DeviceID = request.DeviceID ?? string.Empty,
                    BranchID = branchId,
                    GLAccountID = request.GLAccountID ?? string.Empty
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_DEVICE_MANAGER,
                    payload);

                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading device manager rows");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost("api/save-device-manager")]
        public async Task<IActionResult> SaveDeviceManager([FromBody] DeviceManagerRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });
                }

                var branchId = string.IsNullOrWhiteSpace(request.OurBranchID)
                    ? (string.IsNullOrWhiteSpace(request.BranchID)
                        ? HttpContext.Session.GetString("branch_code") ?? string.Empty
                        : request.BranchID)
                    : request.OurBranchID;

                var operatorId = HttpContext.Session.GetString("user_name") ?? string.Empty;
                var normalizedXml = NormalizeDeviceManagerXml(request.ATMDevices, branchId, operatorId);

                var payload = new
                {
                    OurBranchID = branchId,
                    ATMDevices = normalizedXml,
                    OperatorID = operatorId
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.ADD_EDIT_DEVICE_MANAGER,
                    payload);

                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving device manager rows");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        internal static string NormalizeDeviceManagerXml(string? xml, string branchId, string operatorId)
        {
            if (string.IsNullOrWhiteSpace(xml))
            {
                throw new InvalidOperationException("Device save payload is empty.");
            }

            XDocument document;
            try
            {
                document = XDocument.Parse(xml, LoadOptions.PreserveWhitespace);
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException("Device save payload is not valid XML.", ex);
            }

            var sourceNode = document.Root?.Name.LocalName == "dt_DeviceManager"
                ? document.Root
                : document.Descendants().FirstOrDefault(node => node.Name.LocalName == "dt_DeviceManager");

            if (sourceNode == null)
            {
                throw new InvalidOperationException("Device save payload does not contain dt_DeviceManager.");
            }

            string Read(string name)
                => sourceNode.Elements().FirstOrDefault(element => element.Name.LocalName == name)?.Value?.Trim() ?? string.Empty;

            var now = DateTimeOffset.Now;
            var createdOn = NormalizeDate(Read("CreatedOn"), now);
            var modifiedOn = NormalizeDate(Read("ModifiedOn"), now);
            var supervisedOn = NormalizeDate(Read("SupervisedOn"), createdOn);

            var normalized = new XElement("dt_DeviceManager",
                new XElement("DeviceID", Read("DeviceID")),
                new XElement("BranchID", string.IsNullOrWhiteSpace(Read("BranchID")) ? branchId : Read("BranchID")),
                new XElement("BranchName", Read("BranchName")),
                new XElement("BankID", Read("BankID")),
                new XElement("GLAccountID", Read("GLAccountID")),
                new XElement("GLAccountName", Read("GLAccountName")),
                new XElement("IsActive", NormalizeBoolean(Read("IsActive"))),
                new XElement("IsLocal", NormalizeBoolean(Read("IsLocal"))),
                new XElement("Description", Read("Description")),
                new XElement("CreatedBy", NormalizeUser(Read("CreatedBy"), operatorId)),
                new XElement("CreatedOn", createdOn.ToString("yyyy-MM-ddTHH:mm:sszzz", CultureInfo.InvariantCulture)),
                new XElement("SupervisedBy", NormalizeUser(Read("SupervisedBy"), operatorId)),
                new XElement("SupervisedOn", supervisedOn.ToString("yyyy-MM-ddTHH:mm:sszzz", CultureInfo.InvariantCulture)),
                new XElement("ModifiedBy", NormalizeUser(operatorId, operatorId)),
                new XElement("ModifiedOn", modifiedOn.ToString("yyyy-MM-ddTHH:mm:sszzz", CultureInfo.InvariantCulture)),
                new XElement("ReceivableGLID", Read("ReceivableGLID")),
                new XElement("ReceivableGLName", Read("ReceivableGLName"))
            );

            return normalized.ToString(SaveOptions.DisableFormatting);
        }

        private static string NormalizeUser(string? value, string fallback)
        {
            var resolved = string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
            return string.Equals(resolved, "SYSTEM", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(fallback)
                ? fallback
                : resolved;
        }

        private static string NormalizeBoolean(string? value)
        {
            return bool.TryParse(value, out var parsed) && parsed ? "true" : "false";
        }

        private static DateTimeOffset NormalizeDate(string? rawValue, DateTimeOffset fallback)
        {
            if (string.IsNullOrWhiteSpace(rawValue))
            {
                return fallback;
            }

            if (DateTimeOffset.TryParse(rawValue, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out var parsedOffset))
            {
                return parsedOffset;
            }

            if (DateTimeOffset.TryParse(rawValue, CultureInfo.CurrentCulture, DateTimeStyles.AllowWhiteSpaces, out parsedOffset))
            {
                return parsedOffset;
            }

            if (DateTime.TryParse(rawValue, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out var parsedDateTime))
            {
                return new DateTimeOffset(parsedDateTime);
            }

            if (DateTime.TryParse(rawValue, CultureInfo.CurrentCulture, DateTimeStyles.AllowWhiteSpaces, out parsedDateTime))
            {
                return new DateTimeOffset(parsedDateTime);
            }

            return fallback;
        }
    }

    public class DeviceManagerRequest
    {
        public string? DeviceID { get; set; }
        public string? BranchID { get; set; }
        public string? GLAccountID { get; set; }
        public string? OurBranchID { get; set; }
        public string? ATMDevices { get; set; }
        public string? OperatorID { get; set; }
    }
}