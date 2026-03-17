using System.Globalization;
using System.Text.Json;
using kairo_ui.Services;

namespace kairo_ui.Features.StaticData.ChangeOfficerPortfolio
{
    public sealed class ChangeOfficerPortfolioRepository
    {
        private const string OldApiClientName = "OldApi";
        private readonly IOldApiService _oldApiService;

        public ChangeOfficerPortfolioRepository(IOldApiService oldApiService)
        {
            _oldApiService = oldApiService;
        }

        public Task<JsonElement> GetGroupDetailsAsync(string branchId, string centerId, string operatorId)
        {
            var requestData = new
            {
                OurBranchID = branchId,
                GroupID = centerId,
                OperatorID = operatorId,
                Direction = 0
            };

            return _oldApiService.CreateAsync<JsonElement>(OldApiClientName, OldApiDBConstants.GET_GROUP_DETAILS, requestData);
        }

        public Task<JsonElement> GetOfficerDetailsAsync(string officerId, string branchId, string bankId, string operatorId, string appName)
        {
            var requestData = new Dictionary<string, object?>
            {
                ["BankID"] = string.IsNullOrWhiteSpace(bankId) ? "00" : bankId,
                ["OfficerID"] = officerId,
                ["OurBranchID"] = branchId,
                ["OperatorID"] = operatorId
            };

            return _oldApiService.PostRawAsync<JsonElement>(OldApiClientName, BuildEnvelope(OldApiDBConstants.GETACCOUNTOFFICERDETAILS, requestData, appName));
        }

        public Task<JsonElement> ChangePortfolioAsync(Dictionary<string, object?> requestData, string appName)
        {
            return _oldApiService.PostRawAsync<JsonElement>(OldApiClientName, BuildEnvelope(OldApiDBConstants.CHANGE_PORTFOLIO, requestData, appName));
        }

        private static object BuildEnvelope(string formId, IDictionary<string, object?> requestData, string appName)
        {
            return new
            {
                RequestID = formId,
                FormId = formId,
                RequestData = requestData,
                RequestTime = DateTime.UtcNow.ToString("MM/dd/yyyy HH:mm:ss", CultureInfo.InvariantCulture),
                AppName = string.IsNullOrWhiteSpace(appName) ? "PROJECT_KAIRO" : appName,
                Checksum = string.Empty
            };
        }
    }
}