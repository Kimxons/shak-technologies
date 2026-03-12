using Asp.Versioning;
using CBS.Entities.Common;
using AccountManagement.Helpers;
using Microsoft.AspNetCore.Mvc;
using System.Text.RegularExpressions;

namespace AccountManagement.Modules.StandingInstructionDemandDraft
{
    [Route("api/v{version:apiVersion}/AccountMaintenance")]
    [ApiController]
    [ApiVersion(1.0)]
    public class StandingInstructionDemandDraftController : ControllerBase
    {
        private readonly ILogger<StandingInstructionDemandDraftController> _logger;
        private readonly ISIDDRepo _repo;

        public StandingInstructionDemandDraftController(ILogger<StandingInstructionDemandDraftController> logger, ISIDDRepo repo)
        {
            _logger = logger;
            _repo = repo;
        }

        [HttpPost("GetSIDemandDraft")]
        public async Task<IActionResult> GetSIDemandDraft([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await Execute(reqDat, _repo.GetSIDemandDraft, nameof(GetSIDemandDraft), cancellationToken);
        }

        [HttpPost("CreateSIDemandDraft")]
        public async Task<IActionResult> CreateSIDemandDraft([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await Execute(reqDat, _repo.CreateSIDemandDraft, nameof(CreateSIDemandDraft), cancellationToken);
        }

        [HttpPost("UpdateSIDemandDraft")]
        public async Task<IActionResult> UpdateSIDemandDraft([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await Execute(reqDat, _repo.UpdateSIDemandDraft, nameof(UpdateSIDemandDraft), cancellationToken);
        }

        [HttpPost("DeleteSIDemandDraft")]
        public async Task<IActionResult> DeleteSIDemandDraft([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await Execute(reqDat, _repo.DeleteSIDemandDraft, nameof(DeleteSIDemandDraft), cancellationToken);
        }

        [HttpPost("StopSIDemandDraft")]
        public async Task<IActionResult> StopSIDemandDraft([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await Execute(reqDat, _repo.StopSIDemandDraft, nameof(StopSIDemandDraft), cancellationToken);
        }

        [HttpPost("SearchSIDemandDraft")]
        public async Task<IActionResult> SearchSIDemandDraft([FromBody] InData reqDat, CancellationToken cancellationToken = default)
        {
            return await Execute(reqDat, _repo.SearchSIDemandDraft, nameof(SearchSIDemandDraft), cancellationToken);
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
