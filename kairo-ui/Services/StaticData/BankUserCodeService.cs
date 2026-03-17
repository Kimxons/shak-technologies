using kairo_ui.Models.StaticData;
using System.Text.Json;

namespace kairo_ui.Services.StaticData
{
    public interface IBankUserCodeService
    {
        Task<JsonElement> GetAsync(BankUserCodeGetRequest request, CancellationToken cancellationToken = default);
        Task<JsonElement> SaveAsync(BankUserCodeSaveRequest request, CancellationToken cancellationToken = default);
    }

    public class BankUserCodeService : IBankUserCodeService
    {
        private const string OldApiName = "OldApi";

        private readonly IOldApiService _oldApiService;

        public BankUserCodeService(IOldApiService oldApiService)
        {
            _oldApiService = oldApiService;
        }

        public Task<JsonElement> GetAsync(BankUserCodeGetRequest request, CancellationToken cancellationToken = default)
        {
            var payload = new
            {
                BankID = request.BankID,
                OurBranchID = request.OurBranchID,
                ID = request.ID,
                OperatorID = request.OperatorID
            };

            return _oldApiService.CreateAsync<JsonElement>(OldApiName, OldApiDBConstants.GET_BANK_USER_CODE, payload);
        }

        public Task<JsonElement> SaveAsync(BankUserCodeSaveRequest request, CancellationToken cancellationToken = default)
        {
            var payload = new
            {
                BankID = request.BankID,
                ID = request.ID,
                OperatedBy = request.OperatedBy,
                OperatedOn = request.OperatedOn,
                SupervisedBy = request.SupervisedBy,
                DetailRecords = request.DetailRecords ?? string.Empty
            };

            return _oldApiService.CreateAsync<JsonElement>(OldApiName, OldApiDBConstants.ADD_EDIT_BANK_USER_CODES, payload);
        }
    }
}