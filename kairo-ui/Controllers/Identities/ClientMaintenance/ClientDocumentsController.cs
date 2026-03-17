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
using System.Text.Json.Nodes;

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
        public async Task<IActionResult> Get([FromBody] JsonNode requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());
                _logger.LogInformation("client-maintenance.documents.get request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));

                var imageId = _commonUtilities.ResolveRequestDataLong(requestData!, "ImageID", "ImageId", "ID", "imageId", "TempImageID", "tempImageId");
                var requestKey = ResolveRequestKey(requestData!);
                object? response;
                if (!string.IsNullOrWhiteSpace(requestData["ClientID"]!.ToString()))
                {
                    if (imageId.HasValue)
                    {
                        var endpoint = string.Format(ApiEndpoints.GET_IMAGE_BY_ID, imageId.Value);
                        response = await _apiService.GetSingleAsync<ResponseDetail<object>>("ClientDocumentApi", endpoint, []);
                    }
                    else
                    {
                        var endpoint = string.Format(ApiEndpoints.GET_IMAGES_BY_CLIENT, requestData["ClientID"]!.ToString());
                        response = await _apiService.GetAsync<ResponseDetail<object>>("ClientDocumentApi", endpoint, []);
                    }
                }
                else if (!string.IsNullOrWhiteSpace(requestKey))
                {
                    if (imageId.HasValue)
                    {
                        var endpoint = string.Format(ApiEndpoints.GET_TEMP_IMAGE_BY_ID, imageId.Value);
                        response = await _apiService.GetAsync<ResponseDetail<object>>("ClientDocumentApi", endpoint, []);
                    }
                    else
                    {
                        var endpoint = string.Format(ApiEndpoints.GET_TEMP_IMAGES_BY_CLIENT, string.Empty, requestKey);
                        response = await _apiService.GetAsync<ResponseDetail<object>>("ClientDocumentApi", endpoint, []);
                    }
                }
                else
                {
                    return BadRequest(new { Success = false, ErrorMessage = "ClientID or RequestID is required" });
                }

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
                using var multipart = BuildMultipartContent(form);

                var response = await _apiService.CreateMultipartAsync<ResponseDetail<object>>("ClientDocumentApi", ApiEndpoints.UPLOAD_CLIENT_DOCUMENT, multipart);
                return StatusCode(200, response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.documents.create");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("update")]
        public async Task<IActionResult> Update([FromBody] JsonNode requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());
                _logger.LogInformation("client-maintenance.documents.update request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));

                var imageId = _commonUtilities.ResolveRequestDataLong(requestData!, "ImageID", "ImageId", "imageId");
                if (string.IsNullOrEmpty(requestData["RequestID"]?.ToString()))
                {
                    requestData["RequestID"] = HttpContext!.Connection.Id;
                }
                if (string.IsNullOrEmpty(requestData["CreatedBy"]?.ToString()))
                {
                    requestData["CreatedBy"] = _commonUtilities.ResolveSessionValue("user_name", "user_id");
                }
                if (string.IsNullOrEmpty(requestData["CreatedOn"]?.ToString()))
                {
                    requestData["CreatedOn"] = DateTime.UtcNow.ToString("dd MMM yyyy HH:mm:ss.fff");
                }
                if (string.IsNullOrEmpty(requestData["OurBranchID"]?.ToString()))
                {
                    requestData["OurBranchID"] = _commonUtilities.ResolveSessionValue("branch_code", "branch_id") ?? string.Empty;
                }
                if (string.IsNullOrEmpty(requestData["ModifiedBy"]?.ToString()))
                {
                    requestData["ModifiedBy"] = _commonUtilities.ResolveSessionValue("user_name", "user_id");
                }

                if (string.IsNullOrEmpty(requestData["ModifiedOn"]?.ToString()))
                {
                    requestData["ModifiedOn"] = DateTime.UtcNow.ToString("dd MMM yyyy HH:mm:ss.fff");
                }
                ResponseDetail<object> response = new();
                if (imageId.HasValue)
                {

                    response = await _apiService.UpdateAsync<ResponseDetail<object>>("ClientDocumentApi", ApiEndpoints.UPDATE_IMAGE, imageId, requestData);
                }
                else
                {
                    var tempImageId = _commonUtilities.ResolveRequestDataLong(requestData!, "TempImageID", "ID", "tempImageId");
                    if (!tempImageId.HasValue)
                    {
                        return BadRequest(new { Success = false, ErrorMessage = "TempImageID is required" });
                    }
                    response = await _apiService.UpdateAsync<ResponseDetail<object>>("ClientDocumentApi", ApiEndpoints.UPDATE_TEMP_IMAGE, tempImageId, requestData);
                }

                return StatusCode(200, response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.documents.update");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("delete")]
        public async Task<IActionResult> Delete([FromBody] JsonNode requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());
                _logger.LogInformation("client-maintenance.documents.delete request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));

                var client = _httpClientFactory.CreateClient("ClientDocumentApi");
                var imageId = _commonUtilities.ResolveRequestDataLong(requestData!, "ImageID", "ImageId", "imageId");
                HttpResponseMessage response;

                if (imageId.HasValue)
                {
                    var endpoint = string.Format(ApiEndpoints.DELETE_IMAGE, imageId.Value);
                    response = await client.DeleteAsync(endpoint);
                }
                else
                {
                    var tempImageId = _commonUtilities.ResolveRequestDataLong(requestData!, "TempImageID", "ID", "tempImageId");
                    if (!tempImageId.HasValue)
                    {
                        return BadRequest(new { Success = false, ErrorMessage = "TempImageID is required" });
                    }

                    var endpoint = string.Format(ApiEndpoints.DELETE_TEMP_IMAGE, tempImageId.Value);
                    response = await client.DeleteAsync(endpoint);
                }
                return StatusCode(200, response);

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.documents.delete");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        private MultipartFormDataContent BuildMultipartContent(IFormCollection form)
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

            return multipart;
        }
        private static string? ResolveRequestKey(JsonNode requestData)
        {
            if (!string.IsNullOrWhiteSpace(requestData["RequestID"]!.ToString()))
            {
                return requestData["RequestID"]!.ToString();
            }

            return string.IsNullOrWhiteSpace(requestData["ApplicationID"]!.ToString()) ? null : requestData["ApplicationID"]!.ToString();
        }
    }
}
