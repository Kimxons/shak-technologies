using CBS.Entities.Common;
using kairo_ui.Models;
using kairo_ui.Models.Identities.Client360;
using Microsoft.AspNetCore.Http.Extensions;
using System.Text.Json;

namespace kairo_ui.Services
{
    /// <summary>
    /// Generic API service interface for CRUD operations
    /// </summary>
    public interface IOldApiService
    {
        /// <summary>
        /// Fetches a collection of items from the specified endpoint
        /// </summary>
        Task<IEnumerable<T>> GetAsync<T>(string apiName, string formId, params IEnumerable<KeyValuePair<string, object>> qparams);

        /// <summary>
        /// Fetches a single item from the specified endpoint
        /// </summary>
        Task<T> GetSingleAsync<T>(string apiName, string formId, params IEnumerable<KeyValuePair<string, object>> qparams);

        /// <summary>
        /// Fetches paginated items from the specified endpoint
        /// </summary>
        Task<PaginatedResult<T>> GetPaginatedAsync<T>(string apiName, string formId, int page, int pageSize);

        /// <summary>
        /// Fetches a single item by ID from the specified endpoint
        /// </summary>
        Task<T> GetByIdAsync<T>(string apiName, string formId, int id);

        /// <summary>
        /// Creates a new item at the specified endpoint
        /// </summary>
        Task<T> CreateAsync<T>(string apiName, string formId, object data);

        /// <summary>
        /// Updates an existing item at the specified endpoint
        /// </summary>
        Task<T> UpdateAsync<T>(string apiName, string formId, int id, object data);

        /// <summary>
        /// Deletes an item from the specified endpoint
        /// </summary>
        Task DeleteAsync(string apiName, string formId, int id);

        /// <summary>
        /// Posts a pre-built envelope object directly to the endpoint without any additional wrapping.
        /// </summary>
        Task<T> PostRawAsync<T>(string apiName, object envelope);
    }

    /// <summary>
    /// Generic API service implementation for handling CRUD operations
    /// </summary>
    public class OldApiService : IOldApiService
    {
        private HttpClient _httpClient = new HttpClient();
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IHttpContextAccessor _httpContext;
        private readonly ILogger<OldApiService> _logger;
        private readonly string endpoint = "api/OldAPI";

        //private readonly string _apiBaseUrl;
        //private readonly JsonSerializerOptions _jsonSerializerOptions = new JsonSerializerOptions
        //{
        //    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        //    PropertyNameCaseInsensitive = true
        //};
        private readonly JsonSerializerOptions _jsonSerializerOptions = new()
        {
            PropertyNamingPolicy = null
        };

        public OldApiService(IHttpClientFactory httpClientFactory, IHttpContextAccessor httpContextAccessor, ILogger<OldApiService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _httpContext = httpContextAccessor;
            //_apiBaseUrl = string.Empty;
            //_apiBaseUrl = configuration?.GetValue<string>("ApiSettings:BaseUrl") ?? "http://localhost:5001/api";
        }

        /// <summary>
        /// Fetches a collection of items from the specified endpoint
        /// </summary>
        public async Task<IEnumerable<T>> GetAsync<T>(string apiName, string formId, params IEnumerable<KeyValuePair<string, object>> qparams)
        {
            var fullUrl = $"{endpoint}";
            try
            {
                _httpClient = _httpClientFactory.CreateClient(apiName);
                QueryBuilder qbuilder = [];
                foreach (KeyValuePair<string, object> q in qparams)
                {
                    qbuilder.Append(new KeyValuePair<string, string>(q.Key, Convert.ToString(q.Value)!));
                }
                fullUrl += qbuilder.ToQueryString();
                _logger.LogInformation("API GET Request: {Endpoint} | URL: {FullUrl}", endpoint, fullUrl);

                var startTime = DateTime.UtcNow;
                var response = await _httpClient.GetAsync(fullUrl);
                var duration = DateTime.UtcNow - startTime;

                _logger.LogInformation("API GET Response: {Endpoint} | Status: {StatusCode} | Duration: {DurationMs}ms",
                    endpoint, (int)response.StatusCode, duration.TotalMilliseconds);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("API GET Error: {Endpoint} | Status: {StatusCode} | Error: {ErrorContent}",
                        endpoint, (int)response.StatusCode, errorContent);
                    throw new HttpRequestException($"API returned {response.StatusCode}: {errorContent}");
                }

                var json = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<IEnumerable<T>>(json, _jsonSerializerOptions) ?? Enumerable.Empty<T>();
                var itemCount = (result as List<T>)?.Count ?? 0;

                _logger.LogInformation("API GET Success: {Endpoint} | Items: {ItemCount} | Response Size: {ResponseSize} bytes",
                    endpoint, itemCount, json.Length);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "API GET Exception: {Endpoint} | Error: {ErrorMessage} | URL: {FullUrl}",
                    endpoint, ex.Message, fullUrl);
                throw new Exception($"Failed to fetch {endpoint}: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Fetches a single item from the specified endpoint
        /// </summary>
        public async Task<T> GetSingleAsync<T>(string apiName, string formId, params IEnumerable<KeyValuePair<string, object>> qparams)
        {
            try
            {
                _httpClient = _httpClientFactory.CreateClient(apiName);
                var fullUrl = $"{endpoint}";
                QueryBuilder qbuilder = [];
                foreach (KeyValuePair<string, object> q in qparams)
                {
                    qbuilder.Append(new KeyValuePair<string, string>(q.Key, Convert.ToString(q.Value)!));
                }
                fullUrl += qbuilder.ToQueryString();
                _logger.LogInformation($"Fetching single item from: {fullUrl}");

                var response = await _httpClient.GetAsync(fullUrl);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"API error {response.StatusCode}: {errorContent}");
                    throw new HttpRequestException($"API returned {response.StatusCode}: {errorContent}");
                }

                var json = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<T>(json, _jsonSerializerOptions);

                _logger.LogInformation("Successfully fetched single item");
                return result!;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to fetch {endpoint}");
                throw new Exception($"Failed to fetch {endpoint}: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Fetches paginated items from the specified endpoint
        /// </summary>
        public async Task<PaginatedResult<T>> GetPaginatedAsync<T>(string apiName, string formId, int page, int pageSize)
        {
            try
            {
                _httpClient = _httpClientFactory.CreateClient(apiName);
                var fullUrl = $"{endpoint}?page={page}&pageSize={pageSize}";
                _logger.LogInformation($"Fetching paginated data from: {fullUrl}");

                var response = await _httpClient.GetAsync(fullUrl);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"API error {response.StatusCode}: {errorContent}");
                    return new PaginatedResult<T>
                    {
                        Items = [],
                        CurrentPage = page,
                        PageSize = pageSize,
                        TotalItems = 0,
                        TotalPages = 0
                    };
                }

                var json = await response.Content.ReadAsStringAsync();

                // Try to deserialize as PaginatedResult<T> first
                var result = JsonSerializer.Deserialize<PaginatedResult<T>>(json, _jsonSerializerOptions);

                // If that fails, try to deserialize as a list and wrap it
                if (result == null)
                {
                    var items = JsonSerializer.Deserialize<List<T>>(json, _jsonSerializerOptions) ?? [];
                    result = new PaginatedResult<T>
                    {
                        Items = items,
                        CurrentPage = page,
                        PageSize = pageSize,
                        TotalItems = items.Count,
                        TotalPages = (int)Math.Ceiling((double)items.Count / pageSize)
                    };
                }

                _logger.LogInformation($"Successfully fetched {result.Items.Count} items from {result.TotalItems} total");
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to fetch paginated {endpoint}");
                return new PaginatedResult<T>
                {
                    Items = [],
                    CurrentPage = page,
                    PageSize = pageSize,
                    TotalItems = 0,
                    TotalPages = 0
                };
            }
        }

        /// <summary>
        /// Fetches a single item by ID from the specified endpoint
        /// </summary>
        public async Task<T> GetByIdAsync<T>(string apiName, string formId, int id)
        {
            try
            {
                _httpClient = _httpClientFactory.CreateClient(apiName);
                var fullUrl = $"{endpoint}/{id}";
                _logger.LogInformation($"Fetching item by ID from: {fullUrl}");

                var response = await _httpClient.GetAsync(fullUrl);
                response.EnsureSuccessStatusCode();

                var json = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<T>(json, _jsonSerializerOptions);

                _logger.LogInformation($"Successfully fetched item with ID {id}");
                return result!;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to fetch {endpoint}/{id}");
                throw new Exception($"Failed to fetch {endpoint}/{id}: {ex.Message}", ex);
            }
        }


        /// <summary>
        /// Creates a new item at the specified endpoint
        /// </summary>
        public async Task<T> CreateAsync<T>(string apiName, string formId, object data)
        {
            var fullUrl = $"{endpoint}";
            try
            {
                _httpClient = _httpClientFactory.CreateClient(apiName);

                EnsureDefaults(data);
                OldDataRequest<object> apiReq = new()
                {
                    AppName = _httpContext.HttpContext!.Session.GetString("appname")!,
                    FormId = formId,
                    RequestId = _httpContext.HttpContext!.Connection.Id,
                    RequestTime = DateTime.UtcNow,
                    RequestData = data
                };
                var requestJson = JsonSerializer.Serialize(apiReq, _jsonSerializerOptions);
                _logger.LogInformation("API POST Request: {Endpoint} | URL: {FullUrl} | Payload Size: {PayloadSize} bytes | Data: {RequestData}",
                    endpoint, fullUrl, requestJson.Length, requestJson);

                var startTime = DateTime.UtcNow;
                var response = await _httpClient.PostAsJsonAsync(fullUrl, apiReq, _jsonSerializerOptions);
                var duration = DateTime.UtcNow - startTime;

                _logger.LogInformation("API POST Response: {Endpoint} | Status: {StatusCode} | Duration: {DurationMs}ms",
                    endpoint, (int)response.StatusCode, duration.TotalMilliseconds);

                response.EnsureSuccessStatusCode();

                var responseJson = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<T>(responseJson, _jsonSerializerOptions);

                _logger.LogInformation("API POST Success: {Endpoint} | Response Size: {ResponseSize} bytes | Response: {ResponseData}",
                    endpoint, responseJson.Length, "responseJson");
                return result!;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "API POST Exception: {Endpoint} | Error: {ErrorMessage} | URL: {FullUrl}",
                    endpoint, ex.Message, fullUrl);
                throw new Exception($"Failed to create {endpoint}: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Updates an existing item at the specified endpoint
        /// </summary>
        public async Task<T> UpdateAsync<T>(string apiName, string formId, int id, object data)
        {
            var fullUrl = $"{endpoint}/{id}";
            try
            {
                _httpClient = _httpClientFactory.CreateClient(apiName);
                EnsureDefaults(data);
                OldDataRequest<object> apiReq = new()
                {
                    AppName = _httpContext.HttpContext!.Session.GetString("appname")!,
                    RequestId = _httpContext.HttpContext!.Connection.Id,
                    RequestTime = DateTime.UtcNow,
                    RequestData = data
                };
                var requestJson = JsonSerializer.Serialize(apiReq, _jsonSerializerOptions);
                _logger.LogInformation("API PUT Request: {Endpoint} | URL: {FullUrl} | ID: {Id} | Payload Size: {PayloadSize} bytes | Data: {RequestData}",
                    endpoint, fullUrl, id, requestJson.Length, requestJson);

                var startTime = DateTime.UtcNow;
                var response = await _httpClient.PutAsJsonAsync(fullUrl, apiReq, _jsonSerializerOptions);
                var duration = DateTime.UtcNow - startTime;

                _logger.LogInformation("API PUT Response: {Endpoint} | Status: {StatusCode} | Duration: {DurationMs}ms",
                    endpoint, (int)response.StatusCode, duration.TotalMilliseconds);

                response.EnsureSuccessStatusCode();

                // Handle NoContent (204) response
                if (response.StatusCode == System.Net.HttpStatusCode.NoContent)
                {
                    _logger.LogInformation("API PUT Success: {Endpoint} | NoContent Response (204)", endpoint);
                    return default(T)!;
                }

                var responseJson = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<T>(responseJson, _jsonSerializerOptions);

                _logger.LogInformation("API PUT Success: {Endpoint} | ID: {Id} | Response Size: {ResponseSize} bytes | Response: {ResponseData}",
                    endpoint, id, responseJson.Length, responseJson);
                return result!;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "API PUT Exception: {Endpoint} | Error: {ErrorMessage} | URL: {FullUrl} | ID: {Id}",
                    endpoint, ex.Message, fullUrl, id);
                throw new Exception($"Failed to update {endpoint}/{id}: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Deletes an item from the specified endpoint
        /// </summary>
        public async Task DeleteAsync(string apiName, string formId, int id)
        {
            try
            {
                _httpClient = _httpClientFactory.CreateClient(apiName);
                var fullUrl = $"{endpoint}/{id}";
                _logger.LogInformation($"Deleting item at: {fullUrl}");

                var response = await _httpClient.DeleteAsync(fullUrl);
                response.EnsureSuccessStatusCode();

                _logger.LogInformation($"Successfully deleted item with ID {id}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to delete {endpoint}/{id}");
                throw new Exception($"Failed to delete {endpoint}/{id}: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Posts a pre-built envelope object directly to the endpoint without any additional wrapping.
        /// </summary>
        public async Task<T> PostRawAsync<T>(string apiName, object envelope)
        {
            var fullUrl = endpoint;
            try
            {
                _httpClient = _httpClientFactory.CreateClient(apiName);
                var requestJson = JsonSerializer.Serialize(envelope, _jsonSerializerOptions);
                _logger.LogInformation("API POST Raw Request: {Endpoint} | Payload Size: {PayloadSize} bytes | Data: {RequestData}",
                    fullUrl, requestJson.Length, requestJson);

                var startTime = DateTime.UtcNow;
                var response = await _httpClient.PostAsJsonAsync(fullUrl, envelope, _jsonSerializerOptions);
                var duration = DateTime.UtcNow - startTime;

                _logger.LogInformation("API POST Raw Response: {Endpoint} | Status: {StatusCode} | Duration: {DurationMs}ms",
                    fullUrl, (int)response.StatusCode, duration.TotalMilliseconds);

                response.EnsureSuccessStatusCode();

                var responseJson = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<T>(responseJson, _jsonSerializerOptions);
                return result!;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "API POST Raw Exception: {Endpoint} | Error: {ErrorMessage}", fullUrl, ex.Message);
                throw new Exception($"Failed to post to {fullUrl}: {ex.Message}", ex);
            }
        }

        private void EnsureDefaults<T>(T requestData) where T : class
        {
            var type = requestData.GetType();
            var operatorIdProp = type.GetProperty("OperatorID");
            var branchIdProp = type.GetProperty("OurBranchID");
            var bankIdProp = type.GetProperty("BankID");

            TrySetDefault(requestData, operatorIdProp, ResolveSessionValue("user_name", "user_id") ?? "web_portal");
            TrySetDefault(requestData, branchIdProp, ResolveSessionValue("branch_code", "branch_id") ?? string.Empty);
            TrySetDefault(requestData, bankIdProp, ResolveSessionValue("bank_id", "bank_code") ?? "00");
        }

        private static void TrySetDefault<T>(T requestData, System.Reflection.PropertyInfo? property, string value) where T : class
        {
            if (property is null || !property.CanWrite || property.PropertyType != typeof(string))
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(property.GetValue(requestData) as string))
            {
                property.SetValue(requestData, value);
            }
        }

        private string? ResolveSessionValue(params string[] keys)
        {
            foreach (var key in keys)
            {
                var value = _httpContext.HttpContext!.Session.GetString(key);
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }

            return null;
        }
    }

}
