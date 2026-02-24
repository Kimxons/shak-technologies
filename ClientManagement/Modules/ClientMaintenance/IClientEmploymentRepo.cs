using CBS.Entities.Common;

namespace ClientManagement.Modules.ClientMaintenance
{
    public interface IClientEmploymentRepo
    {
        public Task<ResponseDetail<object>> GetClientEmployment(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateClientEmployment(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> CreateClientEmployment(string requestJson, CancellationToken cancellationToken = default);

    }
}
