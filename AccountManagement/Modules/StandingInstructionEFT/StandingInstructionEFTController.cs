using Asp.Versioning;
using CBS.Entities.Common;
using AccountManagement.Helpers;
using Microsoft.AspNetCore.Mvc;
using System.Text.RegularExpressions;

namespace AccountManagement.Modules.StandingInstructionEFT
{
    [Route("api/v{version:apiVersion}/AccountMaintenance")]
    [ApiController]
    [ApiVersion(1.0)]
    public class StandingInstructionEFTController : ControllerBase
    {
        private readonly ILogger<StandingInstructionEFTController> _logger;
        private readonly ISIEFTRepo _repo;

        public StandingInstructionEFTController(ILogger<StandingInstructionEFTController> logger, ISIEFTRepo repo)
        {
            _logger = logger;
            _repo = repo;
        }

        [HttpPost("GetSIEFT")]
        public async Task<IActionResult> GetSIEFT([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await Execute(reqDat, _repo.GetSIEFT, nameof(GetSIEFT), cancellationToken);
        }

        [HttpPost("CreateSIEFT")]
        public async Task<IActionResult> CreateSIEFT([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await Execute(reqDat, _repo.CreateSIEFT, nameof(CreateSIEFT), cancellationToken);
        }

        [HttpPost("UpdateSIEFT")]
        public async Task<IActionResult> UpdateSIEFT([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await Execute(reqDat, _repo.UpdateSIEFT, nameof(UpdateSIEFT), cancellationToken);
        }

        [HttpPost("DeleteSIEFT")]
        public async Task<IActionResult> DeleteSIEFT([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await Execute(reqDat, _repo.DeleteSIEFT, nameof(DeleteSIEFT), cancellationToken);
        }

        [HttpPost("StopResumeSIEFT")]
        public async Task<IActionResult> StopResumeSIEFT([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await Execute(reqDat, _repo.StopResumeSIEFT, nameof(StopResumeSIEFT), cancellationToken);
        }

        private async Task<IActionResult> Execute(
            InData reqDat,
            Func<string, CancellationToken, Task<ResponseDetail<object>>> action,
            string methodName,
            CancellationToken cancellationToken)
        {
            int httpStatusCode = 200;
            object? resp = null;
            try
            {
                if (reqDat is null || Utils.IsValidJson(Convert.ToString(reqDat.RequestData)!) == false)
                {
                    resp = new ResponseDetail<string> { ResponseCode = "APIEX96", ResponseMessage = "Empty or Invalid Body" };
                    httpStatusCode = 400;
                }
                else
                {
                    string requestJson = Regex.Unescape(System.Text.Json.JsonSerializer.Serialize(reqDat.RequestData));
                    resp = await action(requestJson, cancellationToken);
                    if (resp is null)
                    {
                        resp = new ResponseDetail<string> { ResponseCode = "APIEX96", ResponseMessage = "Empty response" };
                        httpStatusCode = 400;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "{MethodName} failed", methodName);
                resp = new ResponseDetail<string> { ResponseCode = "APIEX96", ResponseMessage = ex.Message };
                httpStatusCode = 500;
            }
            return StatusCode(httpStatusCode, resp);
        }
    }
}
