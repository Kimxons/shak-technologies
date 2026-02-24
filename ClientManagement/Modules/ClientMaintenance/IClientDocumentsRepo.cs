using CBS.Entities.Common;

namespace ClientManagement.Modules.ClientMaintenance
{
    public interface IClientDocumentsRepo
    {
        public Task<ResponseDetail<object>> GetClientDocuments(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateClientDocuments(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> CreateClientDocuments(string requestJson, CancellationToken cancellationToken = default);

    }
}
