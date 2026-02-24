using CBS.Entities.Common;

namespace ClientManagement.Modules.ClientMaintenance
{
    public interface IClientRelationsRepo
    {
        public Task<ResponseDetail<object>> GetClientRelations(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateClientRelations(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> CreateClientRelations(string requestJson, CancellationToken cancellationToken = default);

    }
}
