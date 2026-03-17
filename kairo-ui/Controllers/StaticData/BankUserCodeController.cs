using kairo_ui.Models.StaticData;
using kairo_ui.Services;
using kairo_ui.Services.StaticData;
using Microsoft.AspNetCore.Mvc;
using System.Security;
using System.Text.Json;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData/BankUserCode")]
    public class BankUserCodeController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IBankUserCodeService _bankUserCodeService;
        private readonly ILogger<BankUserCodeController> _logger;

        public BankUserCodeController(
            IAuthService authService,
            IBankUserCodeService bankUserCodeService,
            ILogger<BankUserCodeController> logger)
        {
            _authService = authService;
            _bankUserCodeService = bankUserCodeService;
            _logger = logger;
        }

        [HttpGet("")]
        [HttpGet("BankUserCode")]
        [HttpGet("Index")]
        [HttpGet("~/StaticData/BankUserCodes")]
        [HttpGet("~/StaticData/BankUserCode")]
        [HttpGet("~/StaticData/frmBankUserCodes.aspx")]
        [HttpGet("~/StaticData/frmBankUserCode.aspx")]
        [HttpGet("~/MoneaSys/BankUserCode")]
        [HttpGet("~/MoneaSys/BankUserCode/BankUserCode")]
        [HttpGet("~/MoneaSys/StaticData/BankUserCode")]
        public IActionResult BankUserCode()
        {
            if (!_authService.IsAuthenticated())
            {
                _logger.LogWarning("Unauthenticated access attempt to Bank User Code");
                return RedirectToAction("Index", "Login");
            }

            return View("BankUserCode");
        }

        [HttpPost("api/get")]
        [HttpPost("~/BankUserCode/api/get")]
        [HttpPost("~/StaticData/BankUserCodes/api/get")]
        [HttpPost("~/StaticData/BankUserCode/api/get")]
        [HttpPost("~/MoneaSys/BankUserCode/api/get")]
        [HttpPost("~/MoneaSys/StaticData/BankUserCode/api/get")]
        public async Task<IActionResult> Get([FromBody] BankUserCodeGetRequest? request, CancellationToken cancellationToken)
        {
            if (!_authService.IsAuthenticated())
            {
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            }

            try
            {
                var effectiveRequest = request ?? new BankUserCodeGetRequest();
                ApplyRequestDefaults(effectiveRequest);

                if (string.IsNullOrWhiteSpace(effectiveRequest.ID))
                {
                    return BadRequest(new { Success = false, ErrorMessage = "Code ID is required." });
                }

                var response = await _bankUserCodeService.GetAsync(effectiveRequest, cancellationToken);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Bank User Code for {CodeId}", request?.ID);
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost("api/save")]
        [HttpPost("~/BankUserCode/api/save")]
        [HttpPost("~/StaticData/BankUserCodes/api/save")]
        [HttpPost("~/StaticData/BankUserCode/api/save")]
        [HttpPost("~/MoneaSys/BankUserCode/api/save")]
        [HttpPost("~/MoneaSys/StaticData/BankUserCode/api/save")]
        public async Task<IActionResult> Save([FromBody] JsonElement requestData, CancellationToken cancellationToken)
        {
            if (!_authService.IsAuthenticated())
            {
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            }

            try
            {
                var saveRequest = BuildSaveRequest(requestData);

                if (string.IsNullOrWhiteSpace(saveRequest.ID))
                {
                    return BadRequest(new { Success = false, ErrorMessage = "Code ID is required." });
                }

                var response = await _bankUserCodeService.SaveAsync(saveRequest, cancellationToken);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving Bank User Code");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        private void ApplyRequestDefaults(BankUserCodeGetRequest request)
        {
            request.BankID = FirstNonEmpty(
                request.BankID,
                HttpContext.Session.GetString("bank_id"),
                HttpContext.Session.GetString("bank_code"),
                "00");

            request.OurBranchID = FirstNonEmpty(
                request.OurBranchID,
                HttpContext.Session.GetString("branch_code"),
                HttpContext.Session.GetString("branch_id"),
                "0101");

            request.OperatorID = FirstNonEmpty(
                request.OperatorID,
                HttpContext.Session.GetString("user_name"),
                HttpContext.Session.GetString("user_id"),
                "SYSTEM");
        }

        private BankUserCodeSaveRequest BuildSaveRequest(JsonElement requestData)
        {
            var bankId = FirstNonEmpty(
                ReadString(requestData, "BankID"),
                HttpContext.Session.GetString("bank_id"),
                HttpContext.Session.GetString("bank_code"),
                "00");

            var operatorId = FirstNonEmpty(
                ReadString(requestData, "OperatedBy"),
                ReadString(requestData, "OperatorID"),
                HttpContext.Session.GetString("user_name"),
                HttpContext.Session.GetString("user_id"),
                "SYSTEM");

            return new BankUserCodeSaveRequest
            {
                BankID = bankId,
                ID = ReadString(requestData, "ID"),
                OperatedBy = operatorId,
                OperatedOn = FirstNonEmpty(ReadString(requestData, "OperatedOn"), DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss")),
                SupervisedBy = ReadString(requestData, "SupervisedBy"),
                DetailRecords = BuildDetailRecordsXml(requestData)
            };
        }

        private static string BuildDetailRecordsXml(JsonElement requestData)
        {
            if (!requestData.TryGetProperty("SubCodes", out var subCodesElement) || subCodesElement.ValueKind != JsonValueKind.Array)
            {
                return string.Empty;
            }

            var fragments = new List<string>();
            foreach (var item in subCodesElement.EnumerateArray())
            {
                var subCodeId = ReadString(item, "SubCodeID", "subCodeID", "SubCode", "ID");
                var description = ReadString(item, "Description", "SubCodeName", "CodeDescription", "Name");
                var buttonMark = FirstNonEmpty(
                    ReadString(item, "ButtonMark", "buttonMark"),
                    ReadBoolean(item, "_isDeleted") ? "R" : string.Empty,
                    ReadBoolean(item, "_isNew") ? "N" : string.Empty,
                    ReadBoolean(item, "_isModified") ? "E" : string.Empty,
                    "E");

                if (string.IsNullOrWhiteSpace(subCodeId))
                {
                    continue;
                }

                fragments.Add($"<dt_BankUserCode><SubCodeID>{Escape(subCodeId)}</SubCodeID><Description>{Escape(description)}</Description><ButtonMark>{Escape(buttonMark)}</ButtonMark></dt_BankUserCode>");
            }

            return string.Concat(fragments);
        }

        private static string Escape(string? value)
        {
            return SecurityElement.Escape(value ?? string.Empty) ?? string.Empty;
        }

        private static string ReadString(JsonElement element, params string[] propertyNames)
        {
            foreach (var propertyName in propertyNames)
            {
                if (element.ValueKind != JsonValueKind.Object)
                {
                    break;
                }

                if (element.TryGetProperty(propertyName, out var property))
                {
                    if (property.ValueKind == JsonValueKind.String)
                    {
                        return property.GetString() ?? string.Empty;
                    }

                    if (property.ValueKind != JsonValueKind.Null && property.ValueKind != JsonValueKind.Undefined)
                    {
                        return property.ToString();
                    }
                }
            }

            return string.Empty;
        }

        private static bool ReadBoolean(JsonElement element, params string[] propertyNames)
        {
            foreach (var propertyName in propertyNames)
            {
                if (element.ValueKind != JsonValueKind.Object)
                {
                    break;
                }

                if (!element.TryGetProperty(propertyName, out var property))
                {
                    continue;
                }

                if (property.ValueKind == JsonValueKind.True)
                {
                    return true;
                }

                if (property.ValueKind == JsonValueKind.False)
                {
                    return false;
                }

                if (property.ValueKind == JsonValueKind.String && bool.TryParse(property.GetString(), out var parsed))
                {
                    return parsed;
                }
            }

            return false;
        }

        private static string FirstNonEmpty(params string?[] values)
        {
            foreach (var value in values)
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value.Trim();
                }
            }

            return string.Empty;
        }
    }
}