using CBS.Entities.Common;
using ClientManagement.Helpers;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace ClientManagement.Modules.ClientMaintenance
{
    public class ClientProductAndServicesRepo(ILogger<ClientProductAndServicesRepo> logger, IDbContextFactory<CommonDBCtxt> dbContextFactory) : IClientProductAndServicesRepo
    {
        private readonly ILogger<ClientProductAndServicesRepo> _logger = logger;
        private readonly IDbContextFactory<CommonDBCtxt> _dalFactory = dbContextFactory;

        public async Task<ResponseDetail<object>> GetClientProductAndServices(string requestJson, CancellationToken cancellationToken = default)
        {
            using var _dal = _dalFactory.CreateDbContext();
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_CLIENT_PRODUCT_AND_SERVICES} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
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

        public async Task<ResponseDetail<object>> CreateClientProductAndServices(string requestJson, CancellationToken cancellationToken = default)
        {
            using var _dal = _dalFactory.CreateDbContext();
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.CREATE_CLIENT_PRODUCT_AND_SERVICES} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
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

        public async Task<ResponseDetail<object>> UpdateClientProductAndServices(string requestJson, CancellationToken cancellationToken = default)
        {
            using var _dal = _dalFactory.CreateDbContext();
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_CLIENT_PRODUCT_AND_SERVICES} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
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
