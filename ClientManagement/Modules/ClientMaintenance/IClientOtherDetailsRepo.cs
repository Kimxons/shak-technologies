using CBS.Entities.Common;

namespace ClientManagement.Modules.ClientMaintenance
{
    public interface IClientOtherDetailsRepo
    {
        public Task<ResponseDetail<object>> GetClientOtherDetails(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> CreateClientOtherDetails(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateClientOtherDetails(string requestJson, CancellationToken cancellationToken = default);
    }
}
