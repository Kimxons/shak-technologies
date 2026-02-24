using CBS.Entities.Common;
using AccountManagement.Helpers;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace AccountManagement.Modules.Shared
{
    public class SharedRepo : ISharedRepo
    {
        private readonly SharedDAL _dal;
        public SharedRepo(SharedDAL dal)
        {
            _dal = dal;
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
    }
}
