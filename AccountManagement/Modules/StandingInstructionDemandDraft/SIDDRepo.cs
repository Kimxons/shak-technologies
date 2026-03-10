using CBS.Entities.Common;
using AccountManagement.Helpers;
using AccountManagement.Modules.AccountMaintenance;
using Microsoft.EntityFrameworkCore;
using System.Runtime.CompilerServices;

namespace AccountManagement.Modules.StandingInstructionDemandDraft
{
    public class SIDDRepo : ISIDDRepo
    {
        private readonly CommonDBCtxt _dal;

        public SIDDRepo(CommonDBCtxt dal)
        {
            _dal = dal;
        }

        public async Task<ResponseDetail<object>> GetSIDemandDraft(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data
                .FromSqlInterpolated(FormattableStringFactory.Create($"EXECUTE {DBObjectConstants.GET_SI_DD} @RequestData={{0}}", requestJson))
                .AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr?.Details) ? null : System.Text.Json.JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr?.ResponseCode,
                ResponseMessage = respStr?.ResponseMessage
            };
        }

        public async Task<ResponseDetail<object>> CreateSIDemandDraft(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data
                .FromSqlInterpolated(FormattableStringFactory.Create($"EXECUTE {DBObjectConstants.ADD_SI_DD} @RequestData={{0}}", requestJson))
                .AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr?.Details) ? null : System.Text.Json.JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr?.ResponseCode,
                ResponseMessage = respStr?.ResponseMessage
            };
        }

        public async Task<ResponseDetail<object>> UpdateSIDemandDraft(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data
                .FromSqlInterpolated(FormattableStringFactory.Create($"EXECUTE {DBObjectConstants.UPDATE_SI_DD} @RequestData={{0}}", requestJson))
                .AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr?.Details) ? null : System.Text.Json.JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr?.ResponseCode,
                ResponseMessage = respStr?.ResponseMessage
            };
        }

        public async Task<ResponseDetail<object>> DeleteSIDemandDraft(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data
                .FromSqlInterpolated(FormattableStringFactory.Create($"EXECUTE {DBObjectConstants.DELETE_SI_DD} @RequestData={{0}}", requestJson))
                .AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr?.Details) ? null : System.Text.Json.JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr?.ResponseCode,
                ResponseMessage = respStr?.ResponseMessage
            };
        }

        public async Task<ResponseDetail<object>> StopSIDemandDraft(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data
                .FromSqlInterpolated(FormattableStringFactory.Create($"EXECUTE {DBObjectConstants.STOP_SI_DD} @RequestData={{0}}", requestJson))
                .AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr?.Details) ? null : System.Text.Json.JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr?.ResponseCode,
                ResponseMessage = respStr?.ResponseMessage
            };
        }
    }
}
