using CBS.Entities.Common;

namespace ClientManagement.Modules.ClientMaintenance
{
    public interface IClientAddressRepo
    {
        public Task<ResponseDetail<object>> GetClientAddress(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateClientAddress(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> CreateClientAddress(string requestJson, CancellationToken cancellationToken = default);

    }
}
