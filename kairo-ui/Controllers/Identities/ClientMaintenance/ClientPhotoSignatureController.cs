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
    [Route("Identities/ClientMaintenance/PhotoSignature")]
    public class ClientPhotoSignatureController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly ICommonUtilitiesService _commonUtilities;
        private readonly IApiCachedService _apiCachedService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<ClientPhotoSignatureController> _logger;

        public ClientPhotoSignatureController(IAuthService authService, IApiService apiService, ICommonUtilitiesService commonUtilities, IApiCachedService apiCachedService, IHttpClientFactory httpClientFactory, ILogger<ClientPhotoSignatureController> logger)
        {
            _authService = authService;
            _apiService = apiService;
            _commonUtilities = commonUtilities;
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
                    "ImageTypeID"
                });

                dropdownOptions.TryGetValue("ImageTypeID", out var imageTypeOptions);
                ViewData["ImageTypeOptions"] = imageTypeOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Photo & Signature dropdown options");
            }

            return PartialView("~/Views/Identities/ClientMaintenance/_ClientPhotoSignature.cshtml");
        }

        [HttpGet]
        [Route("ClientPhotoSignature")]
        public async Task<IActionResult> ClientPhotoSignature(string? moduleId = null, string? clientId = null, string? requestId = null)
        {
            if (!_authService.IsAuthenticated()) return RedirectToAction("Index", "Login");

            ViewData["ModuleId"] = moduleId ?? string.Empty;
            ViewData["ClientId"] = clientId ?? string.Empty;
            ViewData["RequestId"] = requestId ?? string.Empty;
            ViewData["AutoLoad"] = (!string.IsNullOrWhiteSpace(clientId) || !string.IsNullOrWhiteSpace(requestId)).ToString().ToLower();

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "ImageTypeID"
                });

                dropdownOptions.TryGetValue("ImageTypeID", out var imageTypeOptions);
                ViewData["ImageTypeOptions"] = imageTypeOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading standalone Photo & Signature dropdown options");
            }

            return View("~/Views/Identities/ClientMaintenance/ClientPhotoSignature.cshtml");
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
                _logger.LogInformation("client-maintenance.photosignature.get request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));
                var client = _httpClientFactory.CreateClient("ClientDocumentApi");
                var requestKey = ResolveRequestKey(requestData);
                string endpoint;

                if (!string.IsNullOrWhiteSpace(requestData.ClientID))
                {
                    endpoint = string.Format(ApiEndpoints.GET_IMAGE_ACCOUNTS_BY_CLIENT, requestData.ClientID);
                }
                else if (!string.IsNullOrWhiteSpace(requestKey))
                {
                    endpoint = string.Format(ApiEndpoints.GET_IMAGE_ACCOUNT_PREAPPROVALS_BY_CLIENT, string.Empty, requestKey);
                }
                else
                {
                    return BadRequest(new { Success = false, ErrorMessage = "ClientID or RequestID is required" });
                }

                //var response = await client.GetAsync(endpoint);
                //var payload = await ReadClientDocumentApiResponseAsync(response);
                //return StatusCode((int)response.StatusCode, payload);
                var response = await _apiService.GetAsync<ResponseDetail<object>>("ClientDocumentApi", endpoint, []);
                return StatusCode(200, response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.photosignature.get");
                //return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
                return StatusCode(500, new ResponseDetail<object> { Details = ex.ToString(), ResponseCode = "UIEX500", ResponseMessage = ex.Message });
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
                using var multipart = BuildMultipartContent(form, "UploadImageAccountPreApproval");

                var client = _httpClientFactory.CreateClient("ClientDocumentApi");
                var response = await client.PostAsync(ApiEndpoints.UPLOAD_IMAGE_ACCOUNT_PREAPPROVAL, multipart);
                var payload = await ReadClientDocumentApiResponseAsync(response);
                return StatusCode((int)response.StatusCode, payload);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.photosignature.create");
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
                _logger.LogInformation("client-maintenance.photosignature.update request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));
                var imageId = ResolvePayloadLong(requestData, "ImageID", "ID", "imageId");
                var requestKey = ResolveRequestKey(requestData);
                var useImageAccount = !string.IsNullOrWhiteSpace(requestData.ClientID);
                if (!imageId.HasValue)
                {
                    return BadRequest(new { Success = false, ErrorMessage = "ImageID is required" });
                }
                if (!useImageAccount && string.IsNullOrWhiteSpace(requestKey))
                {
                    return BadRequest(new { Success = false, ErrorMessage = "ClientID or RequestID is required" });
                }

                var updateRequest = new
                {
                    RequestId = HttpContext.Connection.Id,
                    FormID = useImageAccount ? "UpdateImageAccount" : "UpdateImageAccountPreApproval",
                    AppName = HttpContext.Session.GetString("appname") ?? "KAIRO FRONT END",
                    RequestTime = DateTime.UtcNow,
                    CheckSum = string.Empty,
                    RequestData = new
                    {
                        Description = ResolvePayloadString(requestData, "Description", "Remarks"),
                        SupervisedBy = ResolvePayloadString(requestData, "SupervisedBy"),
                        SupervisedOn = ResolvePayloadDateTime(requestData, "SupervisedOn"),
                        IsClosed = ResolvePayloadBool(requestData, "IsClosed")
                    }
                };

                var client = _httpClientFactory.CreateClient("ClientDocumentApi");
                var endpoint = string.Format(useImageAccount ? ApiEndpoints.UPDATE_IMAGE_ACCOUNT : ApiEndpoints.UPDATE_IMAGE_ACCOUNT_PREAPPROVAL, imageId.Value);
                var response = await client.PutAsJsonAsync(endpoint, updateRequest);
                var payload = await ReadClientDocumentApiResponseAsync(response);
                return StatusCode((int)response.StatusCode, payload);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.photosignature.update");
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
                _logger.LogInformation("client-maintenance.photosignature.delete request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));
                var imageId = ResolvePayloadLong(requestData, "ImageID", "ID", "imageId");
                var requestKey = ResolveRequestKey(requestData);
                var useImageAccount = !string.IsNullOrWhiteSpace(requestData.ClientID);
                if (!imageId.HasValue)
                {
                    return BadRequest(new { Success = false, ErrorMessage = "ImageID is required" });
                }
                if (!useImageAccount && string.IsNullOrWhiteSpace(requestKey))
                {
                    return BadRequest(new { Success = false, ErrorMessage = "ClientID or RequestID is required" });
                }

                var client = _httpClientFactory.CreateClient("ClientDocumentApi");
                var endpoint = string.Format(useImageAccount ? ApiEndpoints.DELETE_IMAGE_ACCOUNT : ApiEndpoints.DELETE_IMAGE_ACCOUNT_PREAPPROVAL, imageId.Value);
                var response = await client.DeleteAsync(endpoint);
                var payload = await ReadClientDocumentApiResponseAsync(response);
                return StatusCode((int)response.StatusCode, payload);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.photosignature.delete");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("validate-image")]
        public async Task<IActionResult> ValidateImage([FromForm] IFormFile? file, [FromForm] string? imageTypeId)
        {
            if (!_authService.IsAuthenticated())
            {
                return Unauthorized(new { Success = false, Code = "AUTH_401", Message = "User is not authenticated", Data = (object?)null });
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { Success = false, Code = "INVALID_INPUT", Message = "Image file is required.", Data = (object?)null });
            }

            var type = (imageTypeId ?? string.Empty).Trim().ToUpperInvariant();
            var endpoint = type switch
            {
                "P" => ApiEndpoints.DETECT_PHOTO,
                "S" => ApiEndpoints.DETECT_SIGNATURE,
                _ => string.Empty
            };

            if (string.IsNullOrWhiteSpace(endpoint))
            {
                return BadRequest(new { Success = false, Code = "INVALID_TYPE", Message = "ImageTypeID must be 'P' (Photo) or 'S' (Signature).", Data = (object?)null });
            }

            try
            {
                using var multipart = new MultipartFormDataContent();
                var streamContent = new StreamContent(file.OpenReadStream());
                if (!string.IsNullOrWhiteSpace(file.ContentType))
                {
                    streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse(file.ContentType);
                }

                var fileName = string.IsNullOrWhiteSpace(file.FileName) ? "image.jpg" : file.FileName;
                multipart.Add(streamContent, "file", fileName);

                var client = _httpClientFactory.CreateClient("ImageRecognitionApi");
                var response = await client.PostAsync(endpoint, multipart);
                var rawResponse = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    var errorMessage = TryExtractDetectionErrorMessage(rawResponse) ?? response.ReasonPhrase ?? "Image validation failed.";
                    return StatusCode((int)response.StatusCode, new
                    {
                        Success = false,
                        Code = "DETECTION_ERROR",
                        Message = errorMessage,
                        Data = (object?)null
                    });
                }

                var parsedResponse = TryParseJsonElement(rawResponse);
                var serviceError = TryExtractDetectionErrorMessage(parsedResponse);
                if (!string.IsNullOrWhiteSpace(serviceError))
                {
                    return Ok(new
                    {
                        Success = false,
                        Code = "DETECTION_ERROR",
                        Message = serviceError,
                        Data = (object?)null
                    });
                }

                var hasFace = ReadDetectionBool(parsedResponse, "has_face", "hasFace");
                var faceCount = ReadDetectionInt(parsedResponse, "count", "face_count", "faceCount");
                var hasSignature = ReadDetectionBool(parsedResponse, "has_signature", "hasSignature");

                if (faceCount < 0)
                {
                    faceCount = 0;
                }

                var isValid = type == "P" ? hasFace : hasSignature;
                var effectiveFaceCount = faceCount > 0 ? faceCount : (hasFace ? 1 : 0);
                var message = type == "P"
                    ? (isValid ? $"{effectiveFaceCount} face(s) detected" : "No face detected in image")
                    : (isValid ? "Signature detected" : "No signature detected in image");

                return Ok(new
                {
                    Success = isValid,
                    Code = isValid ? "00" : "VALIDATION_FAILED",
                    Message = message,
                    Data = new
                    {
                        has_face = hasFace,
                        count = effectiveFaceCount,
                        has_signature = hasSignature
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.photosignature.validate-image");
                return StatusCode(500, new
                {
                    Success = false,
                    Code = "DETECTION_ERROR",
                    Message = "Image validation failed.",
                    Data = (object?)null
                });
            }
        }

        [HttpPost, Route("upload-temp-image")]
        public async Task<IActionResult> UploadTempImage()
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

            if (!Request.HasFormContentType)
            {
                return BadRequest(new { Success = false, ErrorMessage = "multipart/form-data content is required" });
            }

            try
            {
                var form = await Request.ReadFormAsync();
                using var multipart = new MultipartFormDataContent();

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

                AppendEnvelopeFields(multipart, form, "UploadImageAccountPreApproval");

                var client = _httpClientFactory.CreateClient("ClientDocumentApi");
                var response = await client.PostAsync(ApiEndpoints.UPLOAD_IMAGE_ACCOUNT_PREAPPROVAL, multipart);
                var payload = await ReadClientDocumentApiResponseAsync(response);
                return StatusCode((int)response.StatusCode, payload);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading temporary image");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpGet, Route("get-temp-image/{tempImageId}")]
        public async Task<IActionResult> GetTempImage(string tempImageId, [FromQuery] string? clientId = null, [FromQuery] string? requestId = null, [FromQuery] string? applicationId = null)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

            try
            {
                var client = _httpClientFactory.CreateClient("ClientDocumentApi");
                var requestKey = ResolveRequestKey(requestId, applicationId);
                var useImageAccount = !string.IsNullOrWhiteSpace(clientId);
                HttpResponseMessage response;

                if (useImageAccount)
                {
                    var endpoint = string.Format(ApiEndpoints.GET_IMAGE_ACCOUNT_BY_ID, tempImageId);
                    response = await client.GetAsync(endpoint);
                }
                else if (!string.IsNullOrWhiteSpace(requestKey))
                {
                    var endpoint = string.Format(ApiEndpoints.GET_IMAGE_ACCOUNT_PREAPPROVAL_BY_ID, tempImageId);
                    response = await client.GetAsync(endpoint);
                }
                else
                {
                    var endpoint = string.Format(ApiEndpoints.GET_IMAGE_ACCOUNT_BY_ID, tempImageId);
                    response = await client.GetAsync(endpoint);
                    if (response.StatusCode == HttpStatusCode.NotFound)
                    {
                        endpoint = string.Format(ApiEndpoints.GET_IMAGE_ACCOUNT_PREAPPROVAL_BY_ID, tempImageId);
                        response = await client.GetAsync(endpoint);
                    }
                }

                var payload = await ReadClientDocumentApiResponseAsync(response);
                return StatusCode((int)response.StatusCode, payload);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting temporary image {TempImageId}", tempImageId);
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpGet, Route("download-temp-image/{tempImageId}")]
        public async Task<IActionResult> DownloadTempImage(string tempImageId, [FromQuery] string? clientId = null, [FromQuery] string? requestId = null, [FromQuery] string? applicationId = null)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

            try
            {
                var client = _httpClientFactory.CreateClient("ClientDocumentApi");
                var requestKey = ResolveRequestKey(requestId, applicationId);
                var useImageAccount = !string.IsNullOrWhiteSpace(clientId);
                var endpoint = string.Format(useImageAccount ? ApiEndpoints.DOWNLOAD_IMAGE_ACCOUNT : ApiEndpoints.DOWNLOAD_IMAGE_ACCOUNT_PREAPPROVAL, tempImageId);
                var response = await client.GetAsync(endpoint);

                if (!useImageAccount && string.IsNullOrWhiteSpace(requestKey) && response.StatusCode == HttpStatusCode.NotFound)
                {
                    endpoint = string.Format(ApiEndpoints.DOWNLOAD_IMAGE_ACCOUNT_PREAPPROVAL, tempImageId);
                    response = await client.GetAsync(endpoint);
                }

                if (!response.IsSuccessStatusCode)
                {
                    return await ToProxyResult(response);
                }

                var bytes = await response.Content.ReadAsByteArrayAsync();
                var contentType = response.Content.Headers.ContentType?.ToString() ?? "application/octet-stream";
                var fileName = response.Content.Headers.ContentDisposition?.FileNameStar
                    ?? response.Content.Headers.ContentDisposition?.FileName
                    ?? $"temp-image-{tempImageId}";

                return File(bytes, contentType, fileName.Trim('"'));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading temporary image {TempImageId}", tempImageId);
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpDelete, Route("delete-temp-image/{tempImageId}")]
        public async Task<IActionResult> DeleteTempImage(string tempImageId, [FromQuery] string? clientId = null, [FromQuery] string? requestId = null, [FromQuery] string? applicationId = null)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

            try
            {
                var client = _httpClientFactory.CreateClient("ClientDocumentApi");
                var requestKey = ResolveRequestKey(requestId, applicationId);
                var useImageAccount = !string.IsNullOrWhiteSpace(clientId);
                var endpoint = string.Format(useImageAccount ? ApiEndpoints.DELETE_IMAGE_ACCOUNT : ApiEndpoints.DELETE_IMAGE_ACCOUNT_PREAPPROVAL, tempImageId);
                var response = await client.DeleteAsync(endpoint);

                if (!useImageAccount && string.IsNullOrWhiteSpace(requestKey) && response.StatusCode == HttpStatusCode.NotFound)
                {
                    endpoint = string.Format(ApiEndpoints.DELETE_IMAGE_ACCOUNT_PREAPPROVAL, tempImageId);
                    response = await client.DeleteAsync(endpoint);
                }

                var payload = await ReadClientDocumentApiResponseAsync(response);
                return StatusCode((int)response.StatusCode, payload);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting temporary image {TempImageId}", tempImageId);
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpGet, Route("get-temp-images-by-client/{clientId}")]
        public async Task<IActionResult> GetTempImagesByClient(string clientId, [FromQuery] string? requestId = null, [FromQuery] string? applicationId = null)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

            try
            {
                var client = _httpClientFactory.CreateClient("ClientDocumentApi");
                var requestKey = ResolveRequestKey(requestId, applicationId);
                string endpoint;

                if (!string.IsNullOrWhiteSpace(clientId))
                {
                    endpoint = string.Format(ApiEndpoints.GET_IMAGE_ACCOUNTS_BY_CLIENT, clientId);
                }
                else if (!string.IsNullOrWhiteSpace(requestKey))
                {
                    endpoint = string.Format(ApiEndpoints.GET_IMAGE_ACCOUNT_PREAPPROVALS_BY_CLIENT, requestKey);
                }
                else
                {
                    return BadRequest(new { Success = false, ErrorMessage = "ClientID or RequestID is required" });
                }

                var response = await client.GetAsync(endpoint);
                var payload = await ReadClientDocumentApiResponseAsync(response);
                return StatusCode((int)response.StatusCode, payload);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting temporary images by client {ClientId}", clientId);
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

        private static string? ResolveRequestKey(string? requestId, string? applicationId)
        {
            if (!string.IsNullOrWhiteSpace(requestId))
            {
                return requestId;
            }

            return string.IsNullOrWhiteSpace(applicationId) ? null : applicationId;
        }

        private static JsonElement? TryParseJsonElement(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                return null;
            }

            try
            {
                using var document = JsonDocument.Parse(raw);
                return document.RootElement.Clone();
            }
            catch (JsonException)
            {
                return null;
            }
        }

        private static string? TryExtractDetectionErrorMessage(string? raw)
        {
            var parsed = TryParseJsonElement(raw ?? string.Empty);
            return TryExtractDetectionErrorMessage(parsed);
        }

        private static string? TryExtractDetectionErrorMessage(JsonElement? parsed)
        {
            if (!parsed.HasValue || parsed.Value.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            if (TryGetPropertyIgnoreCase(parsed.Value, "error", out var errorValue))
            {
                var extracted = ReadJsonElementAsString(errorValue);
                if (!string.IsNullOrWhiteSpace(extracted))
                {
                    return extracted;
                }
            }

            return null;
        }

        private static bool ReadDetectionBool(JsonElement? parsed, params string[] propertyNames)
        {
            if (!parsed.HasValue || parsed.Value.ValueKind != JsonValueKind.Object)
            {
                return false;
            }

            foreach (var name in propertyNames)
            {
                if (!TryGetPropertyIgnoreCase(parsed.Value, name, out var value))
                {
                    continue;
                }

                switch (value.ValueKind)
                {
                    case JsonValueKind.True:
                        return true;
                    case JsonValueKind.False:
                        return false;
                    case JsonValueKind.String:
                        {
                            var text = value.GetString();
                            if (bool.TryParse(text, out var boolResult))
                            {
                                return boolResult;
                            }
                            if (int.TryParse(text, out var intResult))
                            {
                                return intResult > 0;
                            }
                            break;
                        }
                    case JsonValueKind.Number:
                        {
                            if (value.TryGetInt32(out var intResult))
                            {
                                return intResult > 0;
                            }
                            break;
                        }
                }
            }

            return false;
        }

        private static int ReadDetectionInt(JsonElement? parsed, params string[] propertyNames)
        {
            if (!parsed.HasValue || parsed.Value.ValueKind != JsonValueKind.Object)
            {
                return 0;
            }

            foreach (var name in propertyNames)
            {
                if (!TryGetPropertyIgnoreCase(parsed.Value, name, out var value))
                {
                    continue;
                }

                if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var intResult))
                {
                    return intResult;
                }

                if (value.ValueKind == JsonValueKind.String && int.TryParse(value.GetString(), out var parsedInt))
                {
                    return parsedInt;
                }
            }

            return 0;
        }

        private static bool TryGetPropertyIgnoreCase(JsonElement element, string propertyName, out JsonElement value)
        {
            if (element.ValueKind == JsonValueKind.Object)
            {
                foreach (var property in element.EnumerateObject())
                {
                    if (string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
                    {
                        value = property.Value;
                        return true;
                    }
                }
            }

            value = default;
            return false;
        }

        private static string? ReadJsonElementAsString(JsonElement element)
        {
            return element.ValueKind switch
            {
                JsonValueKind.String => element.GetString(),
                JsonValueKind.Number => element.ToString(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                _ => null
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

        private static async Task<IActionResult> ToProxyResult(HttpResponseMessage response)
        {
            var statusCode = (int)response.StatusCode;
            var mediaType = response.Content.Headers.ContentType?.ToString() ?? "application/json";
            var content = await response.Content.ReadAsStringAsync();

            return new ContentResult
            {
                StatusCode = statusCode,
                Content = content,
                ContentType = mediaType
            };
        }
    }
}
