using CBS.Entities.Common;
using ClientManagement.Helpers;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace ClientManagement.Modules.ClientMaintenance
{
    public class ClientMember360Repo(ILogger<ClientMember360Repo> logger, IDbContextFactory<CommonDBCtxt> dbContextFactory) : IClientMember360Repo
    {
        private readonly ILogger<ClientMember360Repo> _logger = logger;
        private readonly IDbContextFactory<CommonDBCtxt> _dalFactory = dbContextFactory;

        public async Task<ResponseDetail<object>> GetMember360(string requestJson, CancellationToken cancellationToken = default)
        {
            using var _dal = _dalFactory.CreateDbContext();
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_MEMBER360} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            await _dal.DisposeAsync();
            ResponseDetail<object> respObj = new()
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!)
           ,
                ResponseCode = respStr.ResponseCode
           ,
                ResponseMessage = respStr.ResponseMessage
            };
            return respObj;
        }
    }
}
