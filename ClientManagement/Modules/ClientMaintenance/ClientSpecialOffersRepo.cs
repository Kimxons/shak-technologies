using CBS.Entities.Common;
using ClientManagement.Helpers;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace ClientManagement.Modules.ClientMaintenance
{
    public class ClientSpecialOffersRepo(ILogger<ClientSpecialOffersRepo> logger, IDbContextFactory<CommonDBCtxt> dbContextFactory) : IClientSpecialOffersRepo
    {
        private readonly ILogger<ClientSpecialOffersRepo> _logger = logger;
        private readonly IDbContextFactory<CommonDBCtxt> _dalFactory = dbContextFactory;

        public async Task<ResponseDetail<object>> GetClientSpecialOffers(string requestJson, CancellationToken cancellationToken = default)
        {
            using var _dal = _dalFactory.CreateDbContext();
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_CLIENT_SPECIAL_OFFERS} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
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

        public async Task<ResponseDetail<object>> CreateClientSpecialOffers(string requestJson, CancellationToken cancellationToken = default)
        {
            using var _dal = _dalFactory.CreateDbContext();
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.CREATE_CLIENT_SPECIAL_OFFERS} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
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

        public async Task<ResponseDetail<object>> UpdateClientSpecialOffers(string requestJson, CancellationToken cancellationToken = default)
        {
            using var _dal = _dalFactory.CreateDbContext();
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_CLIENT_SPECIAL_OFFERS} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
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
