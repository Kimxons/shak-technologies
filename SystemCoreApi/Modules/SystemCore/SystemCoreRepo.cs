using CBS.Entities.Common;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Text.Json;
using SystemCoreApi.Helpers;

namespace SystemCoreApi.Modules.SystemCore
{
    public interface ISystemCoreRepo
    {
        Task<ResponseDetail<object>> GetMainModuleDetails(string requestJson, CancellationToken cancellationToken = default);
        Task<ResponseDetail<object>> GetModuleDetails(string requestJson, CancellationToken cancellationToken = default);
        Task<ResponseDetail<object>> SaveThemeSettings(string requestJson, CancellationToken cancellationToken = default);
        Task<ResponseDetail<object>> GetEffectiveTheme(string requestJson, CancellationToken cancellationToken = default);
    }

    public class SystemCoreRepo : ISystemCoreRepo
    {
        private readonly IDbContextFactory<CommonDBCtxt> _contextFactory;
        private readonly ILogger<SystemCoreRepo> _logger;

        public SystemCoreRepo(IDbContextFactory<CommonDBCtxt> contextFactory, ILogger<SystemCoreRepo> logger)
        {
            _contextFactory = contextFactory;
            _logger = logger;
        }

        public async Task<ResponseDetail<object>> GetMainModuleDetails(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<object> respObj = new();
            try
            {
                _logger.LogInformation("GetMainModuleDetails called with request: {RequestJson}", requestJson);

                using var context = _contextFactory.CreateDbContext();

                //var mainModules = await context.Database.SqlQueryRaw<MainModuleDetail>(
                //    "EXEC p_v1_GetMainModuleDetails @RequestID, @Modules, @UserName",
                //    new SqlParameter("@RequestID", SqlDbType.VarChar) { Size = 50, Value = request.RequestID ?? (object)DBNull.Value },
                //    new SqlParameter("@Modules", SqlDbType.VarChar) { Size = -1, Value = request.Modules ?? (object)DBNull.Value },
                //    new SqlParameter("@UserName", SqlDbType.VarChar) { Size = 30, Value = request.UserName ?? (object)DBNull.Value }
                //).ToListAsync(cancellationToken);


                ResponseDetail<string> respStr = context.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_MAINMODULES} @RequestData={requestJson}")
                    .AsEnumerable().FirstOrDefault()!;
                await context.DisposeAsync();
                respObj = new()
                {
                    Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!)
              ,
                    ResponseCode = respStr.ResponseCode
              ,
                    ResponseMessage = respStr.ResponseMessage
                };

                //response.Details = mainModules;
                //response.ResponseCode = "00";
                //response.ResponseMessage = "Main modules retrieved successfully";

                _logger.LogInformation("GetMainModuleDetails retrieved {Count} modules", JsonSerializer.Deserialize<List<object>>(respStr.Details!)!.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetMainModuleDetails");
                respObj.ResponseCode = "96";
                respObj.ResponseMessage = ex.Message;
                //response.Details = new List<MainModuleDetail>();
            }

            return respObj;
        }

        public async Task<ResponseDetail<object>> GetModuleDetails(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<object> respObj = new();
            try
            {
                _logger.LogInformation("GetModuleDetails called with request: {RequestJson}", requestJson);

                using var context = _contextFactory.CreateDbContext();

                ResponseDetail<string> respStr = context.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_MODULES} @RequestData={requestJson}")
                    .AsEnumerable().FirstOrDefault()!;
                await context.DisposeAsync();
                respObj = new()
                {
                    Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                    ResponseCode = respStr.ResponseCode,
                    ResponseMessage = respStr.ResponseMessage
                };

                _logger.LogInformation("GetModuleDetails retrieved modules");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetModuleDetails");
                respObj.ResponseCode = "96";
                respObj.ResponseMessage = ex.Message;
            }

            return respObj;
        }

        public async Task<ResponseDetail<object>> SaveThemeSettings(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<object> respObj = new();
            try
            {
                _logger.LogInformation("SaveThemeSettings called with request: {RequestJson}", requestJson);

                using var context = _contextFactory.CreateDbContext();

                ResponseDetail<string> respStr = context.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.SAVE_THEME_SETTINGS} @RequestData={requestJson}")
                    .AsEnumerable().FirstOrDefault()!;
                await context.DisposeAsync();
                respObj = new()
                {
                    Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                    ResponseCode = respStr.ResponseCode,
                    ResponseMessage = respStr.ResponseMessage
                };

                _logger.LogInformation("SaveThemeSettings executed successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SaveThemeSettings");
                respObj.ResponseCode = "96";
                respObj.ResponseMessage = ex.Message;
            }

            return respObj;
        }

        public async Task<ResponseDetail<object>> GetEffectiveTheme(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<object> respObj = new();
            try
            {
                _logger.LogInformation("GetEffectiveTheme called with request: {RequestJson}", requestJson);

                using var context = _contextFactory.CreateDbContext();

                ResponseDetail<string> respStr = context.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_EFFECTIVE_THEME} @RequestData={requestJson}")
                    .AsEnumerable().FirstOrDefault()!;
                await context.DisposeAsync();
                respObj = new()
                {
                    Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                    ResponseCode = respStr.ResponseCode,
                    ResponseMessage = respStr.ResponseMessage
                };

                _logger.LogInformation("GetEffectiveTheme retrieved theme settings");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetEffectiveTheme");
                respObj.ResponseCode = "96";
                respObj.ResponseMessage = ex.Message;
            }

            return respObj;
        }
    }


}
