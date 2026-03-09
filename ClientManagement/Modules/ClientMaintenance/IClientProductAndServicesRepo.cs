using CBS.Entities.Common;

namespace ClientManagement.Modules.ClientMaintenance
{
    public interface IClientProductAndServicesRepo
    {
        public Task<ResponseDetail<object>> GetClientProductAndServices(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> CreateClientProductAndServices(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateClientProductAndServices(string requestJson, CancellationToken cancellationToken = default);
    }
}
