using Asp.Versioning;
using CBS.Entities.Common;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text.RegularExpressions;
using SystemCoreApi.Helpers;

namespace SystemCoreApi.Modules.SystemCore
{
    [Route("api/v{version:apiVersion}/[controller]")]
    [ApiController]
    [ApiVersion(1.0)]
    public class SystemCoreController : ControllerBase
    {
        private readonly ILogger<SystemCoreController> _logger;
        private readonly ISystemCoreRepo _repoSystemCore;

        public SystemCoreController(
            ILogger<SystemCoreController> logger,
            ISystemCoreRepo repoSystemCore)
        {
            _logger = logger;
            _repoSystemCore = repoSystemCore;
        }

        /// <summary>
        /// Fetches main module details from the system
        /// </summary>
        /// <param name="reqDat">Request containing RequestID, Modules, and UserName</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>List of main module details</returns>
        [HttpPost("main-modules")]
        public async Task<IActionResult> GetMainModules(
            [FromBody] InDataRequest<object?> reqDat,
            CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;

            try
            {
                if (reqDat is null)
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

                    resp = await _repoSystemCore.GetMainModuleDetails(requestJson!, cancellationToken);

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
                httpStatusCode = 500;
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new
                {
                    MethodName = Request.Path.ToString(),
                    Request = reqDat,
                    Response = resp,
                    RemoteIp = Request.HttpContext.Connection.RemoteIpAddress?.MapToIPv4().ToString()
                });
            }

            return StatusCode(httpStatusCode, resp);
        }

        /// <summary>
        /// Fetches module details from the system
        /// </summary>
        /// <param name="reqDat">Request containing RequestID, Modules, and UserName</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Module details</returns>
        [HttpPost("modules")]
        public async Task<IActionResult> GetModules(
            [FromBody] InDataRequest<object?> reqDat,
            CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;

            try
            {
                if (reqDat is null)
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

                    resp = await _repoSystemCore.GetModuleDetails(requestJson!, cancellationToken);

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
                httpStatusCode = 500;
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new
                {
                    MethodName = Request.Path.ToString(),
                    Request = reqDat,
                    Response = resp,
                    RemoteIp = Request.HttpContext.Connection.RemoteIpAddress?.MapToIPv4().ToString()
                });
            }

            return StatusCode(httpStatusCode, resp);
        }

        /// <summary>
        /// Saves theme settings for a user/scope
        /// </summary>
        /// <param name="reqDat">Request containing theme configuration data as JSON</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Result of the theme save operation</returns>
        [HttpPost("add-theme")]
        public async Task<IActionResult> SaveThemeSettings(
            [FromBody] InDataRequest<object?> reqDat,
            CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;

            try
            {
                if (reqDat is null)
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

                    resp = await _repoSystemCore.SaveThemeSettings(requestJson!, cancellationToken);

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
                httpStatusCode = 500;
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new
                {
                    MethodName = Request.Path.ToString(),
                    Request = reqDat,
                    Response = resp,
                    RemoteIp = Request.HttpContext.Connection.RemoteIpAddress?.MapToIPv4().ToString()
                });
            }

            return StatusCode(httpStatusCode, resp);
        }

        /// <summary>
        /// Retrieves the effective theme settings for a user/scope
        /// </summary>
        /// <param name="reqDat">Request containing scope information for theme retrieval</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Effective theme settings</returns>
        [HttpPost("effective-theme")]
        public async Task<IActionResult> GetEffectiveTheme(
            [FromBody] InDataRequest<object?> reqDat,
            CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;

            try
            {
                if (reqDat is null)
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

                    resp = await _repoSystemCore.GetEffectiveTheme(requestJson!, cancellationToken);

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
                httpStatusCode = 500;
            }
            finally
            {
                _logger.Log(logLevel, "{@message}", new
                {
                    MethodName = Request.Path.ToString(),
                    Request = reqDat,
                    Response = resp,
                    RemoteIp = Request.HttpContext.Connection.RemoteIpAddress?.MapToIPv4().ToString()
                });
            }

            return StatusCode(httpStatusCode, resp);
        }
    }

}
