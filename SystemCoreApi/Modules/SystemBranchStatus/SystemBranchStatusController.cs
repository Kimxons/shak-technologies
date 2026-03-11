using Asp.Versioning;
using CBS.Entities.Common;
using CBS.Entities.SystemCore;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text.RegularExpressions;
using SystemCoreApi.Helpers;

namespace SystemCoreApi.Modules.SystemBranchStatus
{
    [Route("api/v{version:apiVersion}/[controller]")]
    [ApiController]
    [ApiVersion(1.0)]
    public class SystemBranchStatusController : ControllerBase
    {
        private readonly ILogger<SystemBranchStatusController> _logger;
        private readonly ISystemBranchStatusRepo _repoSystemBranchStatus;

        public SystemBranchStatusController(
            ILogger<SystemBranchStatusController> logger,
            ISystemBranchStatusRepo repoSystemBranchStatus)
        {
            _logger = logger;
            _repoSystemBranchStatus = repoSystemBranchStatus;
        }

        [HttpPost("GetSystemBranchStatus")]
        public async Task<IActionResult> GetSystemBranchStatus(
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

                    resp = await _repoSystemBranchStatus.GetSystemBranchStatus(requestJson!, cancellationToken);

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
