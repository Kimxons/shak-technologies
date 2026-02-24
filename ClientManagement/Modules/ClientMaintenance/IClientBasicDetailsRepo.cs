using CBS.Entities.Common;

namespace ClientManagement.Modules.ClientMaintenance
{
    public interface IClientBasicDetailsRepo
    {
        public Task<ResponseDetail<object>> GetClientBasicDetails(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateClientBasicDetails(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> CreateClientBasicDetails(string requestJson, CancellationToken cancellationToken = default);

    }
}
