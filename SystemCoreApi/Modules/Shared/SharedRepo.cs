using CBS.Entities.Common;
using SystemCoreApi.Helpers;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace SystemCoreApi.Modules.Shared
{
    public class SharedRepo(SharedDAL dal) : ISharedRepo
    {
        private readonly SharedDAL _dal = dal;

        public async Task<ResponseDetail<object>> GetSystemSearch(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.SharedData.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_SYSTEMSEARCH} @RequestData={requestJson}")
                .AsEnumerable().FirstOrDefault()!;
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
        public async Task<ResponseDetail<object>> GetSystemSearchResult(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.SharedData.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_SYSTEMSEARCH_RESULT} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
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
        public async Task<ResponseDetail<object>> GetSystemCodes(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.SharedData.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_SYSTEMCODES} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
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
        public async Task<ResponseDetail<object>> GetIDDescription(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.SharedData.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_ID_DESCRIPTION} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
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
