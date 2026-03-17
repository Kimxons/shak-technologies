using Asp.Versioning;
using AccountManagement.Helpers;
using CBS.Entities.Common;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace AccountManagement.Modules.StaticData
{
    [Route("api/v{version:apiVersion}/[controller]")]
    [ApiController]
    [ApiVersion(1.0)]
    public class StaticDataController : ControllerBase
    {
        private readonly ILogger<StaticDataController> _logger;
        private readonly IStaticDataRepo _repo;

        public StaticDataController(ILogger<StaticDataController> logger, IStaticDataRepo repo)
        {
            _logger = logger;
            _repo = repo;
        }

        [HttpPost("GetLocation")]
        public async Task<IActionResult> GetLocation([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.GetLocation, "GetLocation", cancellationToken);

        [HttpPost("AddEditLocation")]
        public async Task<IActionResult> AddEditLocation([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.AddEditLocation, "AddEditLocation", cancellationToken);

        [HttpPost("DeleteLocation")]
        public async Task<IActionResult> DeleteLocation([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.DeleteLocation, "DeleteLocation", cancellationToken);

        [HttpPost("GetContactPerson")]
        public async Task<IActionResult> GetContactPerson([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.GetContactPerson, "GetContactPerson", cancellationToken);

        [HttpPost("AddEditContactPerson")]
        public async Task<IActionResult> AddEditContactPerson([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.AddEditContactPerson, "AddEditContactPerson", cancellationToken);

        [HttpPost("DeleteContactPerson")]
        public async Task<IActionResult> DeleteContactPerson([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.DeleteContactPerson, "DeleteContactPerson", cancellationToken);

        [HttpPost("GetCustodian")]
        public async Task<IActionResult> GetCustodian([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.GetCustodian, "GetCustodian", cancellationToken);

        [HttpPost("AddEditCustodian")]
        public async Task<IActionResult> AddEditCustodian([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.AddEditCustodian, "AddEditCustodian", cancellationToken);

        [HttpPost("DeleteCustodian")]
        public async Task<IActionResult> DeleteCustodian([FromBody] InData reqDat, CancellationToken cancellationToken = default)
            => await HandleRequest(reqDat, _repo.DeleteCustodian, "DeleteCustodian", cancellationToken);

        private async Task<IActionResult> HandleRequest(InData reqDat, Func<string, CancellationToken, Task<ResponseDetail<object>>> operation, string methodName, CancellationToken cancellationToken)
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
                    resp = await operation(requestJson!, cancellationToken);

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
                _logger.Log(logLevel, "{@message}", new
                {
                    MethodName = methodName,
                    Request = reqDat,
                    Response = resp,
                    RemoteIp = Request.HttpContext.Connection.RemoteIpAddress!.MapToIPv4().ToString()
                });
            }

            return StatusCode(httpStatusCode, resp);
        }
    }
}
