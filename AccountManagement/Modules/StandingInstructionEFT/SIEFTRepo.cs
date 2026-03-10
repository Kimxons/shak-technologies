using CBS.Entities.Common;
using AccountManagement.Helpers;
using AccountManagement.Modules.AccountMaintenance;
using Microsoft.EntityFrameworkCore;
using System.Runtime.CompilerServices;

namespace AccountManagement.Modules.StandingInstructionEFT
{
    public class SIEFTRepo : ISIEFTRepo
    {
        private readonly CommonDBCtxt _dal;

        public SIEFTRepo(CommonDBCtxt dal)
        {
            _dal = dal;
        }

        public async Task<ResponseDetail<object>> GetSIEFT(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data
                .FromSqlInterpolated(FormattableStringFactory.Create($"EXECUTE {DBObjectConstants.GET_SI_EFT} @RequestData={{0}}", requestJson))
                .AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr?.Details) ? null : System.Text.Json.JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr?.ResponseCode,
                ResponseMessage = respStr?.ResponseMessage
            };
        }

        public async Task<ResponseDetail<object>> CreateSIEFT(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data
                .FromSqlInterpolated(FormattableStringFactory.Create($"EXECUTE {DBObjectConstants.ADD_SI_EFT} @RequestData={{0}}", requestJson))
                .AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr?.Details) ? null : System.Text.Json.JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr?.ResponseCode,
                ResponseMessage = respStr?.ResponseMessage
            };
        }

        public async Task<ResponseDetail<object>> UpdateSIEFT(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data
                .FromSqlInterpolated(FormattableStringFactory.Create($"EXECUTE {DBObjectConstants.UPDATE_SI_EFT} @RequestData={{0}}", requestJson))
                .AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr?.Details) ? null : System.Text.Json.JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr?.ResponseCode,
                ResponseMessage = respStr?.ResponseMessage
            };
        }

        public async Task<ResponseDetail<object>> DeleteSIEFT(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data
                .FromSqlInterpolated(FormattableStringFactory.Create($"EXECUTE {DBObjectConstants.DELETE_SI_EFT} @RequestData={{0}}", requestJson))
                .AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr?.Details) ? null : System.Text.Json.JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr?.ResponseCode,
                ResponseMessage = respStr?.ResponseMessage
            };
        }

        public async Task<ResponseDetail<object>> StopResumeSIEFT(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data
                .FromSqlInterpolated(FormattableStringFactory.Create($"EXECUTE {DBObjectConstants.STOP_SI_EFT} @RequestData={{0}}", requestJson))
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
