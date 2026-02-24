using CBS.Entities.Common;

namespace ClientManagement.Modules.ClientMaintenance
{
    public interface IClientIndividualRepo
    {

        public Task<ResponseDetail<object>> GetClientIndividual(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateClientIndividual(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> CreateClientIndividual(string requestJson, CancellationToken cancellationToken = default);

    }
}
