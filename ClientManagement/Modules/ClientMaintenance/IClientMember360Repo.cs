using CBS.Entities.Common;

namespace ClientManagement.Modules.ClientMaintenance
{
    public interface IClientMember360Repo
    {
        public Task<ResponseDetail<object>> GetMember360(string requestJson, CancellationToken cancellationToken = default);
    }
}
