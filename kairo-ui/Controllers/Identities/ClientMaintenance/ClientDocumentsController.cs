using CBS.Entities.Common;
using CBS.Entities.SystemCore;
using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance/Documents")]
    public class ClientDocumentsController : Controller
    {
        private readonly IAuthService _authService;
        private readonly ICommonUtilitiesService _commonUtilities;
        private readonly IApiCachedService _apiCachedService;
        private readonly IApiService _apiService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<ClientDocumentsController> _logger;

        public ClientDocumentsController(IAuthService authService, ICommonUtilitiesService commonUtilities, IApiService apiService, IApiCachedService apiCachedService, IHttpClientFactory httpClientFactory, ILogger<ClientDocumentsController> logger)
        {
            _authService = authService;
            _commonUtilities = commonUtilities;
            _apiService = apiService;
            _apiCachedService = apiCachedService;
            _httpClientFactory = httpClientFactory;
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
                // Use GetMultipleDropdownCodeOptionsAsync - returns SelectListItem format
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "DocumentID",
                    "DocumentTypeID",
                    "DocumentLocationID"
                });

                dropdownOptions.TryGetValue("DocumentID", out var documentIdOptions);
                dropdownOptions.TryGetValue("DocumentTypeID", out var documentTypeOptions);
                dropdownOptions.TryGetValue("DocumentLocationID", out var documentLocationOptions);

                ViewData["DocumentIdOptions"] = documentIdOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["DocumentTypeOptions"] = documentTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["DocumentLocationOptions"] = documentLocationOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Documents tab dropdown options");
            }

            return PartialView("~/Views/Identities/ClientMaintenance/_ClientDocuments.cshtml");
        }

        [HttpPost, Route("get")]
        public async Task<IActionResult> Get([FromBody] ClientMaintenanceCrudRequest requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData?.ModuleID);
                _logger.LogInformation("client-maintenance.documents.get request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));

                //var client = _httpClientFactory.CreateClient("ClientDocumentApi");
                var imageId = ResolvePayloadLong(requestData, "ImageID", "ImageId", "ID", "imageId", "TempImageID", "tempImageId");
                var requestKey = ResolveRequestKey(requestData);
                //HttpResponseMessage response;
                object? response;
                if (!string.IsNullOrWhiteSpace(requestData.ClientID))
                {
                    if (imageId.HasValue)
                    {
                        var endpoint = string.Format(ApiEndpoints.GET_IMAGE_BY_ID, imageId.Value);
                        //response = await client.GetAsync(endpoint);
                        response = await _apiService.GetSingleAsync<ResponseDetail<object>>("ClientDocumentApi", endpoint, []);
                    }
                    else
                    {
                        var endpoint = string.Format(ApiEndpoints.GET_IMAGES_BY_CLIENT, requestData.ClientID);
                        //response = await client.GetAsync(endpoint);
                        response = await _apiService.GetAsync<ResponseDetail<object>>("ClientDocumentApi", endpoint, []);
                    }
                }
                else if (!string.IsNullOrWhiteSpace(requestKey))
                {
                    if (imageId.HasValue)
                    {
                        var endpoint = string.Format(ApiEndpoints.GET_TEMP_IMAGE_BY_ID, imageId.Value);
                        //response = await client.GetAsync(endpoint);
                        response = await _apiService.GetAsync<ResponseDetail<object>>("ClientDocumentApi", endpoint, []);
                    }
                    else
                    {
                        var endpoint = string.Format(ApiEndpoints.GET_TEMP_IMAGES_BY_CLIENT, string.Empty, requestKey);
                        //var endpointWithQuery = string.IsNullOrWhiteSpace(requestKey)
                        //    ? endpoint
                        //    : $"{endpoint}?requestId={Uri.EscapeDataString(requestKey)}";
                        //response = await client.GetAsync(endpointWithQuery);
                        //response = await client.GetAsync(endpoint);
                        response = await _apiService.GetAsync<ResponseDetail<object>>("ClientDocumentApi", endpoint, []);
                    }
                }
                else
                {
                    return BadRequest(new { Success = false, ErrorMessage = "ClientID or RequestID is required" });
                }

                //var payload = await ReadClientDocumentApiResponseAsync(response);
                //return StatusCode((int)response.StatusCode, payload);
                return StatusCode(200, response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.documents.get");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("create")]
        public async Task<IActionResult> Create()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (!Request.HasFormContentType)
                return BadRequest(new { Success = false, ErrorMessage = "multipart/form-data content is required" });
            try
            {
                var form = await Request.ReadFormAsync();
                using var multipart = BuildMultipartContent(form, "UploadTempImage");

                var client = _httpClientFactory.CreateClient("ClientDocumentApi");
                var response = await client.PostAsync(ApiEndpoints.UPLOAD_TEMP_IMAGE, multipart);
                var payload = await ReadClientDocumentApiResponseAsync(response);
                return StatusCode((int)response.StatusCode, payload);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.documents.create");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("update")]
        public async Task<IActionResult> Update([FromBody] ClientMaintenanceCrudRequest requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData?.ModuleID);
                _logger.LogInformation("client-maintenance.documents.update request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));

                var client = _httpClientFactory.CreateClient("ClientDocumentApi");
                var imageId = ResolvePayloadLong(requestData, "ImageID", "ImageId", "imageId");
                HttpResponseMessage response;

                if (imageId.HasValue)
                {
                    var endpoint = string.Format(ApiEndpoints.UPDATE_IMAGE, imageId.Value);
                    var updateRequest = BuildImageUpdateRequest(requestData);
                    response = await client.PutAsJsonAsync(endpoint, updateRequest);
                }
                else
                {
                    var tempImageId = ResolvePayloadLong(requestData, "TempImageID", "ID", "tempImageId");
                    if (!tempImageId.HasValue)
                    {
                        return BadRequest(new { Success = false, ErrorMessage = "TempImageID is required" });
                    }

                    var endpoint = string.Format(ApiEndpoints.UPDATE_TEMP_IMAGE, tempImageId.Value);
                    var updateRequest = BuildTempImageUpdateRequest(requestData);
                    response = await client.PutAsJsonAsync(endpoint, updateRequest);
                }

                var payload = await ReadClientDocumentApiResponseAsync(response);
                return StatusCode((int)response.StatusCode, payload);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.documents.update");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("delete")]
        public async Task<IActionResult> Delete([FromBody] ClientMaintenanceCrudRequest requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData?.ModuleID);
                _logger.LogInformation("client-maintenance.documents.delete request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));

                var client = _httpClientFactory.CreateClient("ClientDocumentApi");
                var imageId = ResolvePayloadLong(requestData, "ImageID", "ImageId", "imageId");
                HttpResponseMessage response;

                if (imageId.HasValue)
                {
                    var endpoint = string.Format(ApiEndpoints.DELETE_IMAGE, imageId.Value);
                    response = await client.DeleteAsync(endpoint);
                }
                else
                {
                    var tempImageId = ResolvePayloadLong(requestData, "TempImageID", "ID", "tempImageId");
                    if (!tempImageId.HasValue)
                    {
                        return BadRequest(new { Success = false, ErrorMessage = "TempImageID is required" });
                    }

                    var endpoint = string.Format(ApiEndpoints.DELETE_TEMP_IMAGE, tempImageId.Value);
                    response = await client.DeleteAsync(endpoint);
                }

                var payload = await ReadClientDocumentApiResponseAsync(response);
                return StatusCode((int)response.StatusCode, payload);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.documents.delete");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        private MultipartFormDataContent BuildMultipartContent(IFormCollection form, string formId)
        {
            var multipart = new MultipartFormDataContent();
            foreach (var key in form.Keys)
            {
                var values = form[key];
                foreach (var value in values)
                {
                    multipart.Add(new StringContent(value ?? string.Empty), key);
                }
            }

            foreach (var file in form.Files)
            {
                var streamContent = new StreamContent(file.OpenReadStream());
                if (!string.IsNullOrWhiteSpace(file.ContentType))
                {
                    streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse(file.ContentType);
                }
                multipart.Add(streamContent, file.Name, file.FileName);
            }

            AppendEnvelopeFields(multipart, form, formId);
            return multipart;
        }

        private void AppendEnvelopeFields(MultipartFormDataContent multipart, IFormCollection form, string formId)
        {
            var requestId = HttpContext.Connection.Id;
            var appName = HttpContext.Session.GetString("appname") ?? "KAIRO FRONT END";
            var requestTime = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");

            if (!form.ContainsKey("RequestId"))
            {
                multipart.Add(new StringContent(requestId), "RequestId");
            }
            if (!form.ContainsKey("FormID"))
            {
                multipart.Add(new StringContent(formId), "FormID");
            }
            if (!form.ContainsKey("AppName"))
            {
                multipart.Add(new StringContent(appName), "AppName");
            }
            if (!form.ContainsKey("RequestTime"))
            {
                multipart.Add(new StringContent(requestTime), "RequestTime");
            }
            if (!form.ContainsKey("CheckSum"))
            {
                multipart.Add(new StringContent(string.Empty), "CheckSum");
            }
        }

        private static string? ResolveRequestKey(ClientMaintenanceCrudRequest requestData)
        {
            if (!string.IsNullOrWhiteSpace(requestData?.RequestID))
            {
                return requestData.RequestID;
            }

            return string.IsNullOrWhiteSpace(requestData?.ApplicationID) ? null : requestData.ApplicationID;
        }

        private object BuildImageUpdateRequest(ClientMaintenanceCrudRequest requestData)
        {
            return new
            {
                RequestId = HttpContext.Connection.Id,
                FormID = "UpdateImage",
                AppName = HttpContext.Session.GetString("appname") ?? "KAIRO FRONT END",
                RequestTime = DateTime.UtcNow,
                CheckSum = string.Empty,
                RequestData = new
                {
                    ImageTypeID = ResolvePayloadString(requestData, "ImageTypeID", "DocumentTypeID", "DocumentID"),
                    Description = ResolvePayloadString(requestData, "Description", "Remarks"),
                    ImageStatusID = ResolvePayloadString(requestData, "ImageStatusID"),
                    ClosedBy = ResolvePayloadString(requestData, "ClosedBy"),
                    ClosedDate = ResolvePayloadDateTime(requestData, "ClosedDate"),
                    SupervisedBy = ResolvePayloadString(requestData, "SupervisedBy"),
                    SupervisedOn = ResolvePayloadDateTime(requestData, "SupervisedOn"),
                    ModifiedBy = requestData.OperatorID ?? ResolvePayloadString(requestData, "ModifiedBy")
                }
            };
        }

        private object BuildTempImageUpdateRequest(ClientMaintenanceCrudRequest requestData)
        {
            return new
            {
                RequestId = HttpContext.Connection.Id,
                FormID = "UpdateTempImage",
                AppName = HttpContext.Session.GetString("appname") ?? "KAIRO FRONT END",
                RequestTime = DateTime.UtcNow,
                CheckSum = string.Empty,
                RequestData = new
                {
                    ModuleID = ResolvePayloadShort(requestData, "ModuleID"),
                    ImageID = ResolvePayloadLong(requestData, "ImageID"),
                    ImageTypeID = ResolvePayloadString(requestData, "ImageTypeID", "DocumentTypeID"),
                    OurBranchID = requestData.OurBranchID ?? ResolvePayloadString(requestData, "OurBranchID"),
                    ClientID = requestData.ClientID ?? ResolvePayloadString(requestData, "ClientID"),
                    AccountID = ResolvePayloadString(requestData, "AccountID"),
                    TempClientID = ResolvePayloadString(requestData, "TempClientID"),
                    Description = ResolvePayloadString(requestData, "Description", "Remarks"),
                    CopyToClientImage = ResolvePayloadBool(requestData, "CopyToClientImage"),
                    ModifiedBy = requestData.OperatorID ?? ResolvePayloadString(requestData, "ModifiedBy")
                }
            };
        }

        private static long? ResolvePayloadLong(ClientMaintenanceCrudRequest requestData, params string[] keys)
        {
            if (requestData == null)
            {
                return null;
            }

            if (!string.IsNullOrWhiteSpace(requestData.RecordID) && long.TryParse(requestData.RecordID, out var recordId))
            {
                return recordId;
            }

            var payload = requestData.Payload;
            if (payload == null)
            {
                return null;
            }

            foreach (var key in keys)
            {
                if (!payload.TryGetValue(key, out var value) || value == null)
                {
                    continue;
                }

                if (value is JsonElement element)
                {
                    if (element.ValueKind == JsonValueKind.Number && element.TryGetInt64(out var numericValue))
                    {
                        return numericValue;
                    }

                    var textValue = element.ToString();
                    if (long.TryParse(textValue, out var parsedValue))
                    {
                        return parsedValue;
                    }
                }
                else if (long.TryParse(value.ToString(), out var parsedValue))
                {
                    return parsedValue;
                }
            }

            return null;
        }

        private static short? ResolvePayloadShort(ClientMaintenanceCrudRequest requestData, params string[] keys)
        {
            var payload = requestData?.Payload;
            if (payload == null)
            {
                return null;
            }

            foreach (var key in keys)
            {
                if (!payload.TryGetValue(key, out var value) || value == null)
                {
                    continue;
                }

                if (value is JsonElement element)
                {
                    if (element.ValueKind == JsonValueKind.Number && element.TryGetInt16(out var numericValue))
                    {
                        return numericValue;
                    }
                    if (short.TryParse(element.ToString(), out var parsedValue))
                    {
                        return parsedValue;
                    }
                }
                else if (short.TryParse(value.ToString(), out var parsedValue))
                {
                    return parsedValue;
                }
            }

            return null;
        }

        private static string? ResolvePayloadString(ClientMaintenanceCrudRequest requestData, params string[] keys)
        {
            var payload = requestData?.Payload;
            if (payload == null)
            {
                return null;
            }

            foreach (var key in keys)
            {
                if (!payload.TryGetValue(key, out var value) || value == null)
                {
                    continue;
                }

                if (value is JsonElement element)
                {
                    return element.ValueKind == JsonValueKind.String ? element.GetString() : element.ToString();
                }

                return value.ToString();
            }

            return null;
        }

        private static DateTime? ResolvePayloadDateTime(ClientMaintenanceCrudRequest requestData, params string[] keys)
        {
            var payload = requestData?.Payload;
            if (payload == null)
            {
                return null;
            }

            foreach (var key in keys)
            {
                if (!payload.TryGetValue(key, out var value) || value == null)
                {
                    continue;
                }

                if (value is JsonElement element)
                {
                    if (element.ValueKind == JsonValueKind.String && DateTime.TryParse(element.GetString(), out var parsedDate))
                    {
                        return parsedDate;
                    }
                    if (element.ValueKind == JsonValueKind.Number && element.TryGetInt64(out var epochMs))
                    {
                        return DateTimeOffset.FromUnixTimeMilliseconds(epochMs).UtcDateTime;
                    }
                }
                else if (DateTime.TryParse(value.ToString(), out var parsedDate))
                {
                    return parsedDate;
                }
            }

            return null;
        }

        private static bool? ResolvePayloadBool(ClientMaintenanceCrudRequest requestData, params string[] keys)
        {
            var payload = requestData?.Payload;
            if (payload == null)
            {
                return null;
            }

            foreach (var key in keys)
            {
                if (!payload.TryGetValue(key, out var value) || value == null)
                {
                    continue;
                }

                if (value is JsonElement element)
                {
                    if (element.ValueKind == JsonValueKind.True || element.ValueKind == JsonValueKind.False)
                    {
                        return element.GetBoolean();
                    }
                    if (element.ValueKind == JsonValueKind.String && bool.TryParse(element.GetString(), out var parsedBool))
                    {
                        return parsedBool;
                    }
                }
                else if (bool.TryParse(value.ToString(), out var parsedBool))
                {
                    return parsedBool;
                }
            }

            return null;
        }

        private static async Task<ResponseDetail<object>> ReadClientDocumentApiResponseAsync(HttpResponseMessage response)
        {
            var content = await response.Content.ReadAsStringAsync();
            var fallbackCode = response.IsSuccessStatusCode ? "00" : "96";
            var fallbackMessage = response.ReasonPhrase ?? (response.IsSuccessStatusCode ? "Success" : "Request failed");

            var mapped = new ResponseDetail<object>
            {
                ResponseCode = fallbackCode,
                ResponseMessage = fallbackMessage
            };

            if (string.IsNullOrWhiteSpace(content))
            {
                return mapped;
            }

            try
            {
                using var doc = JsonDocument.Parse(content);
                var root = doc.RootElement;

                if (root.TryGetProperty("responseCode", out var code) || root.TryGetProperty("ResponseCode", out code))
                {
                    mapped.ResponseCode = code.GetString() ?? mapped.ResponseCode;
                }

                if (root.TryGetProperty("responseMessage", out var message) || root.TryGetProperty("ResponseMessage", out message))
                {
                    mapped.ResponseMessage = message.GetString() ?? mapped.ResponseMessage;
                }

                if (root.TryGetProperty("details", out var details) || root.TryGetProperty("Details", out details))
                {
                    mapped.Details = details.ValueKind == JsonValueKind.Undefined ? null : details.Clone();
                }
            }
            catch (JsonException)
            {
                mapped.ResponseMessage = content;
            }

            return mapped;
        }
    }
}
