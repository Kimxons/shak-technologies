using Asp.Versioning;
using CBS.Entities.Common;
using SystemCoreApi.Helpers;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace SystemCoreApi.Modules.Shared
{
    [Route("api/v{version:apiVersion}/[controller]")]
    [ApiController]
    [ApiVersion(1.0)]
    //[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class SharedController(ILogger<SharedController> logger, ISharedRepo repo) : ControllerBase
    {
        private readonly ILogger<SharedController> _logger = logger;
        private readonly ISharedRepo _repo = repo;

        [HttpPost("GetSystemSearch")]
        public async Task<IActionResult> GetSystemSearch([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null || Utils.IsValidJson(Convert.ToString(reqDat.RequestData)!) == false)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty or Invalid Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    //reqDat.RequestData = Regex.Unescape(JsonSerializer.Serialize(reqDat.RequestData));
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repo.GetSystemSearch(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }
        [HttpPost("GetSystemSearchResult")]
        public async Task<IActionResult> GetSystemSearchResult([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null || Utils.IsValidJson(Convert.ToString(reqDat.RequestData)!) == false)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty or Invalid Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    //reqDat.RequestData = Regex.Unescape(JsonSerializer.Serialize(reqDat.RequestData));
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repo.GetSystemSearchResult(requestJson!, cancellationToken);
                    if (resp == null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }
        [HttpPost("GetSystemCode")]
        public async Task<IActionResult> GetSystemCode([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null || Utils.IsValidJson(Convert.ToString(reqDat.RequestData)!) == false)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty or Invalid Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    //reqDat.RequestData = Regex.Unescape(JsonSerializer.Serialize(reqDat.RequestData));
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repo.GetSystemCodes(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }
        [HttpPost("GetIDDescription")]
        public async Task<IActionResult> GetIDDescription([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null || Utils.IsValidJson(Convert.ToString(reqDat.RequestData)!) == false)
                {
                    logLevel = LogLevel.Error;
                    resp = new ResponseDetail<string>
                    {
                        ResponseCode = "APIEX96",
                        ResponseMessage = "Empty or Invalid Body"
                    };
                    httpStatusCode = 400;
                }
                else
                {
                    string? requestJson = await Utils.GetRequestBody(Request);
                    requestJson = string.IsNullOrEmpty(requestJson) ? JsonSerializer.Serialize(reqDat) : requestJson;
                    requestJson = Regex.Unescape(requestJson);
                    resp = await _repo.GetIDDescription(requestJson!, cancellationToken);
                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        resp = new ResponseDetail<string>
                        {
                            ResponseCode = "APIEX96",
                            ResponseMessage = "Empty response"
                        };
                        httpStatusCode = 400;
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                resp = new Response
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = ex.Message,
                };
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new { MethodName = Request.Path.ToString(), Request = reqDat, Response = resp, RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString() });
            }
            return StatusCode(httpStatusCode, resp);

        }
    }
}
