using CBS.Entities.Common;
using ClientManagement.Helpers;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace ClientManagement.Modules.ClientMaintenance
{
    public partial class ClientIndividualRepo(ILogger<ClientIndividualRepo> logger, IDbContextFactory<CommonDBCtxt> dbContextFactory) : IClientIndividualRepo
    {

        private readonly ILogger<ClientIndividualRepo> _logger = logger;
        private readonly IDbContextFactory<CommonDBCtxt> _dalFactory = dbContextFactory;

        public async Task<ResponseDetail<object>> CreateClientIndividual(string requestJson, CancellationToken cancellationToken = default)
        {
            using var _dal = _dalFactory.CreateDbContext();
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.CREATE_CLIENT_INDIVIDUAL} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
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

        public async Task<ResponseDetail<object>> GetClientIndividual(string requestJson, CancellationToken cancellationToken = default)
        {
            using var _dal = _dalFactory.CreateDbContext();
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_CLIENT_INDIVIDUAL} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
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

        public async Task<ResponseDetail<object>> UpdateClientIndividual(string requestJson, CancellationToken cancellationToken = default)
        {
            using var _dal = _dalFactory.CreateDbContext();
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_CLIENT_INDIVIDUAL} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
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
