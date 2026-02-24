using CBS.Entities.Common;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using SystemCoreApi.Helpers;
using SystemCoreApi.Modules.SystemCore;

namespace SystemCoreApi.Modules.SystemBankSettings
{
    public interface ISystemBankSettingRepo
    {
        Task<ResponseDetail<object>> GetSystemBankSettings(string requestJson, CancellationToken cancellationToken = default);
        Task<ResponseDetail<object>> CreateSystemBankSetting(string requestJson, CancellationToken cancellationToken = default);
        Task<ResponseDetail<object>> UpdateSystemBankSetting(string requestJson, CancellationToken cancellationToken = default);
        Task<ResponseDetail<object>> DeleteSystemBankSetting(string requestJson, CancellationToken cancellationToken = default);
    }

    public class SystemBankSettingRepo : ISystemBankSettingRepo
    {
        private readonly IDbContextFactory<CommonDBCtxt> _contextFactory;
        private readonly ILogger<SystemBankSettingRepo> _logger;

        public SystemBankSettingRepo(IDbContextFactory<CommonDBCtxt> contextFactory, ILogger<SystemBankSettingRepo> logger)
        {
            _contextFactory = contextFactory;
            _logger = logger;
        }

        public async Task<ResponseDetail<object>> GetSystemBankSettings(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<object> respObj = new();
            try
            {
                _logger.LogInformation("GetSystemBankSettings called with request: {RequestJson}", requestJson);

                using var context = _contextFactory.CreateDbContext();

                ResponseDetail<string> respStr = context.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_SYSTEM_BANK_SETTINGS} @RequestData={requestJson}")
                    .AsEnumerable().FirstOrDefault()!;
                await context.DisposeAsync();
                respObj = new()
                {
                    Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                    ResponseCode = respStr.ResponseCode,
                    ResponseMessage = respStr.ResponseMessage
                };

                _logger.LogInformation("GetSystemBankSettings retrieved settings");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSystemBankSettings");
                respObj.ResponseCode = "96";
                respObj.ResponseMessage = ex.Message;
            }

            return respObj;
        }

        public async Task<ResponseDetail<object>> CreateSystemBankSetting(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<object> respObj = new();
            try
            {
                _logger.LogInformation("CreateSystemBankSetting called with request: {RequestJson}", requestJson);

                using var context = _contextFactory.CreateDbContext();

                ResponseDetail<string> respStr = context.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.CREATE_SYSTEM_BANK_SETTING} @RequestData={requestJson}")
                    .AsEnumerable().FirstOrDefault()!;
                await context.DisposeAsync();
                respObj = new()
                {
                    Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                    ResponseCode = respStr.ResponseCode,
                    ResponseMessage = respStr.ResponseMessage
                };

                _logger.LogInformation("CreateSystemBankSetting executed successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CreateSystemBankSetting");
                respObj.ResponseCode = "96";
                respObj.ResponseMessage = ex.Message;
            }

            return respObj;
        }

        public async Task<ResponseDetail<object>> UpdateSystemBankSetting(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<object> respObj = new();
            try
            {
                _logger.LogInformation("UpdateSystemBankSetting called with request: {RequestJson}", requestJson);

                using var context = _contextFactory.CreateDbContext();

                ResponseDetail<string> respStr = context.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_SYSTEM_BANK_SETTING} @RequestData={requestJson}")
                    .AsEnumerable().FirstOrDefault()!;
                await context.DisposeAsync();
                respObj = new()
                {
                    Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                    ResponseCode = respStr.ResponseCode,
                    ResponseMessage = respStr.ResponseMessage
                };

                _logger.LogInformation("UpdateSystemBankSetting executed successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdateSystemBankSetting");
                respObj.ResponseCode = "96";
                respObj.ResponseMessage = ex.Message;
            }

            return respObj;
        }

        public async Task<ResponseDetail<object>> DeleteSystemBankSetting(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<object> respObj = new();
            try
            {
                _logger.LogInformation("DeleteSystemBankSetting called with request: {RequestJson}", requestJson);

                using var context = _contextFactory.CreateDbContext();

                ResponseDetail<string> respStr = context.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.DELETE_SYSTEM_BANK_SETTING} @RequestData={requestJson}")
                    .AsEnumerable().FirstOrDefault()!;
                await context.DisposeAsync();
                respObj = new()
                {
                    Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                    ResponseCode = respStr.ResponseCode,
                    ResponseMessage = respStr.ResponseMessage
                };

                _logger.LogInformation("DeleteSystemBankSetting executed successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in DeleteSystemBankSetting");
                respObj.ResponseCode = "96";
                respObj.ResponseMessage = ex.Message;
            }

            return respObj;
        }
    }
}
