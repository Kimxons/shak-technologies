using CBS.Entities.SystemCore;
using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Net.Http.Headers;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance/PhotoSignature")]
    public class ClientPhotoSignatureController : ClientMaintenanceControllerBase
    {
        private readonly IApiCachedService _apiCachedService;
        private readonly IHttpClientFactory _httpClientFactory;

        public ClientPhotoSignatureController(IAuthService authService, IApiService apiService, IApiCachedService apiCachedService, IHttpClientFactory httpClientFactory, ILogger<ClientPhotoSignatureController> logger)
            : base(authService, apiService, logger)
        {
            _apiCachedService = apiCachedService;
            _httpClientFactory = httpClientFactory;
        }

        [HttpGet]
        [Route("Index")]
        public async Task<IActionResult> Index(string? moduleId = null, string? clientId = null, string? requestId = null)
        {
            if (!AuthService.IsAuthenticated()) return RedirectToAction("Index", "Login");

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
                Logger.LogError(ex, "Error loading Photo & Signature dropdown options");
            }

            return PartialView("~/Views/Identities/ClientMaintenance/_ClientPhotoSignature.cshtml");
        }

        [HttpPost, Route("get")]
        public async Task<IActionResult> Get([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.GET_CLIENT_PHOTO_SIGNATURE, requestData, "client-maintenance.photosignature.get", requestData?.ModuleID);

        [HttpPost, Route("create")]
        public async Task<IActionResult> Create([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.CREATE_CLIENT_PHOTO_SIGNATURE, requestData, "client-maintenance.photosignature.create", requestData?.ModuleID);

        [HttpPost, Route("update")]
        public async Task<IActionResult> Update([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.EDIT_CLIENT_PHOTO_SIGNATURE, requestData, "client-maintenance.photosignature.update", requestData?.ModuleID);

        [HttpPost, Route("delete")]
        public async Task<IActionResult> Delete([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.DELETE_CLIENT_PHOTO_SIGNATURE, requestData, "client-maintenance.photosignature.delete", requestData?.ModuleID);

        [HttpPost, Route("upload-temp-image")]
        public async Task<IActionResult> UploadTempImage()
        {
            var unauthenticated = EnsureAuthenticated("client-maintenance.photosignature.upload-temp-image");
            if (unauthenticated != null)
            {
                return unauthenticated;
            }

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
                Logger.LogError(ex, "Error uploading temporary image");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpGet, Route("get-temp-image/{tempImageId}")]
        public async Task<IActionResult> GetTempImage(string tempImageId)
        {
            var unauthenticated = EnsureAuthenticated("client-maintenance.photosignature.get-temp-image");
            if (unauthenticated != null)
            {
                return unauthenticated;
            }

            try
            {
                var client = _httpClientFactory.CreateClient("ClientManagementApi");
                var endpoint = string.Format(ApiEndpoints.GET_TEMP_IMAGE_BY_ID, tempImageId);
                var response = await client.GetAsync(endpoint);
                return await ToProxyResult(response);
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error getting temporary image {TempImageId}", tempImageId);
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpGet, Route("download-temp-image/{tempImageId}")]
        public async Task<IActionResult> DownloadTempImage(string tempImageId)
        {
            var unauthenticated = EnsureAuthenticated("client-maintenance.photosignature.download-temp-image");
            if (unauthenticated != null)
            {
                return unauthenticated;
            }

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
                Logger.LogError(ex, "Error downloading temporary image {TempImageId}", tempImageId);
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpDelete, Route("delete-temp-image/{tempImageId}")]
        public async Task<IActionResult> DeleteTempImage(string tempImageId)
        {
            var unauthenticated = EnsureAuthenticated("client-maintenance.photosignature.delete-temp-image");
            if (unauthenticated != null)
            {
                return unauthenticated;
            }

            try
            {
                var client = _httpClientFactory.CreateClient("ClientManagementApi");
                var endpoint = string.Format(ApiEndpoints.DELETE_TEMP_IMAGE, tempImageId);
                var response = await client.DeleteAsync(endpoint);
                return await ToProxyResult(response);
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error deleting temporary image {TempImageId}", tempImageId);
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpGet, Route("get-temp-images-by-client/{clientId}")]
        public async Task<IActionResult> GetTempImagesByClient(string clientId)
        {
            var unauthenticated = EnsureAuthenticated("client-maintenance.photosignature.get-temp-images-by-client");
            if (unauthenticated != null)
            {
                return unauthenticated;
            }

            try
            {
                var client = _httpClientFactory.CreateClient("ClientManagementApi");
                var endpoint = string.Format(ApiEndpoints.GET_TEMP_IMAGES_BY_CLIENT, clientId);
                var response = await client.GetAsync(endpoint);
                return await ToProxyResult(response);
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error getting temporary images by client {ClientId}", clientId);
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
