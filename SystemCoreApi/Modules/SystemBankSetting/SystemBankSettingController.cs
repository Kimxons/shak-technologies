using Asp.Versioning;
using CBS.Entities.Common;
using CBS.Entities.SystemCore;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text.RegularExpressions;
using SystemCoreApi.Helpers;

namespace SystemCoreApi.Modules.SystemBankSettings
{
    [Route("api/v{version:apiVersion}/[controller]")]
    [ApiController]
    [ApiVersion(1.0)]
    public class SystemBankSettingsController : ControllerBase
    {
        private readonly ILogger<SystemBankSettingsController> _logger;
        private readonly ISystemBankSettingRepo _repoSystemBankSetting;

        public SystemBankSettingsController(
            ILogger<SystemBankSettingsController> logger,
            ISystemBankSettingRepo repoSystemBankSetting)
        {
            _logger = logger;
            _repoSystemBankSetting = repoSystemBankSetting;
        }

        [HttpPost("GetSystemBankSetting")]
        public async Task<IActionResult> GetSystemBankSettings(
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

                    resp = await _repoSystemBankSetting.GetSystemBankSettings(requestJson!, cancellationToken);

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

        [HttpPost("CreateSystemBankSetting")]
        public async Task<IActionResult> CreateSystemBankSetting(
            [FromBody] InDataRequest<SystemBankSetting?> reqDat,
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

                    resp = await _repoSystemBankSetting.CreateSystemBankSetting(requestJson!, cancellationToken);

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

        [HttpPost("UpdateSystemBankSetting")]
        public async Task<IActionResult> UpdateSystemBankSetting(
            [FromBody] InDataRequest<SystemBankSetting?> reqDat,
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

                    resp = await _repoSystemBankSetting.UpdateSystemBankSetting(requestJson!, cancellationToken);

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

        [HttpPost("DeleteSystemBankSetting")]
        public async Task<IActionResult> DeleteSystemBankSetting(
            [FromBody] InDataRequest<SystemBankSetting?> reqDat,
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

                    resp = await _repoSystemBankSetting.DeleteSystemBankSetting(requestJson!, cancellationToken);

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
