using CBS.Entities.SystemCore;
using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Net.Http.Headers;

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
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.GET_CLIENT_PHOTO_SIGNATURE, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.photosignature.get");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("create")]
        public async Task<IActionResult> Create([FromBody] ClientMaintenanceCrudRequest requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData?.ModuleID);
                _logger.LogInformation("client-maintenance.photosignature.create request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.CREATE_CLIENT_PHOTO_SIGNATURE, requestData);
                return Ok(response);
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
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.EDIT_CLIENT_PHOTO_SIGNATURE, requestData);
                return Ok(response);
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
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.DELETE_CLIENT_PHOTO_SIGNATURE, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.photosignature.delete");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
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

                var client = _httpClientFactory.CreateClient("ClientManagementApi");
                var response = await client.PostAsync(ApiEndpoints.UPLOAD_TEMP_IMAGE, multipart);
                return await ToProxyResult(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading temporary image");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpGet, Route("get-temp-image/{tempImageId}")]
        public async Task<IActionResult> GetTempImage(string tempImageId)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

            try
            {
                var client = _httpClientFactory.CreateClient("ClientManagementApi");
                var endpoint = string.Format(ApiEndpoints.GET_TEMP_IMAGE_BY_ID, tempImageId);
                var response = await client.GetAsync(endpoint);
                return await ToProxyResult(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting temporary image {TempImageId}", tempImageId);
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpGet, Route("download-temp-image/{tempImageId}")]
        public async Task<IActionResult> DownloadTempImage(string tempImageId)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

            try
            {
                var client = _httpClientFactory.CreateClient("ClientManagementApi");
                var endpoint = string.Format(ApiEndpoints.DOWNLOAD_TEMP_IMAGE, tempImageId);
                var response = await client.GetAsync(endpoint);

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
        public async Task<IActionResult> DeleteTempImage(string tempImageId)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

            try
            {
                var client = _httpClientFactory.CreateClient("ClientManagementApi");
                var endpoint = string.Format(ApiEndpoints.DELETE_TEMP_IMAGE, tempImageId);
                var response = await client.DeleteAsync(endpoint);
                return await ToProxyResult(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting temporary image {TempImageId}", tempImageId);
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpGet, Route("get-temp-images-by-client/{clientId}")]
        public async Task<IActionResult> GetTempImagesByClient(string clientId)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

            try
            {
                var client = _httpClientFactory.CreateClient("ClientManagementApi");
                var endpoint = string.Format(ApiEndpoints.GET_TEMP_IMAGES_BY_CLIENT, clientId);
                var response = await client.GetAsync(endpoint);
                return await ToProxyResult(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting temporary images by client {ClientId}", clientId);
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
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
