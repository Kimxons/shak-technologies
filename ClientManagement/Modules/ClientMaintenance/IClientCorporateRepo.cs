using CBS.Entities.Common;

namespace ClientManagement.Modules.ClientMaintenance
{
    public interface IClientCorporateRepo
    {
        public Task<ResponseDetail<object>> GetClientCorporate(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateClientCorporate(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> CreateClientCorporate(string requestJson, CancellationToken cancellationToken = default);

    }
}
