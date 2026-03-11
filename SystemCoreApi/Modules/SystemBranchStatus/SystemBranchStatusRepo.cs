using CBS.Entities.Common;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using SystemCoreApi.Helpers;
using SystemCoreApi.Modules.SystemCore;

namespace SystemCoreApi.Modules.SystemBranchStatus
{
    public interface ISystemBranchStatusRepo
    {
        Task<ResponseDetail<object>> GetSystemBranchStatus(string requestJson, CancellationToken cancellationToken = default);
    }

    public class SystemBranchStatusRepo : ISystemBranchStatusRepo
    {
        private readonly IDbContextFactory<CommonDBCtxt> _contextFactory;
        private readonly ILogger<SystemBranchStatusRepo> _logger;

        public SystemBranchStatusRepo(IDbContextFactory<CommonDBCtxt> contextFactory, ILogger<SystemBranchStatusRepo> logger)
        {
            _contextFactory = contextFactory;
            _logger = logger;
        }

        public async Task<ResponseDetail<object>> GetSystemBranchStatus(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<object> respObj = new();
            try
            {
                _logger.LogInformation("GetSystemBranchStatus called with request: {RequestJson}", requestJson);

                using var context = _contextFactory.CreateDbContext();

                ResponseDetail<string> respStr = context.Data
                    .FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_SYSTEM_BRANCH_STATUS} @RequestData={requestJson}")
                    .AsEnumerable().FirstOrDefault()!;
                await context.DisposeAsync();
                respObj = new()
                {
                    Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                    ResponseCode = respStr.ResponseCode,
                    ResponseMessage = respStr.ResponseMessage
                };

                _logger.LogInformation("GetSystemBranchStatus retrieved branch status");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSystemBranchStatus");
                respObj.ResponseCode = "96";
                respObj.ResponseMessage = ex.Message;
            }

            return respObj;
        }
    }
}
