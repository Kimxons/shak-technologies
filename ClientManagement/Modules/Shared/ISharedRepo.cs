using CBS.Entities.Common;

namespace ClientManagement.Modules.Shared
{
    public interface ISharedRepo
    {
        public Task<ResponseDetail<object>> GetSystemSearch(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetSystemSearchResult(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetSystemCodes(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetAccountTransactions(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetBatchTrxList(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetMember360(string requestJson, CancellationToken cancellationToken = default);
    }
}
