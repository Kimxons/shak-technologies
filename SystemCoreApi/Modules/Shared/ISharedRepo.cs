using CBS.Entities.Common;

namespace SystemCoreApi.Modules.Shared
{
    public interface ISharedRepo
    {
        public Task<ResponseDetail<object>> GetSystemSearch(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetSystemSearchResult(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetSystemCodes(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetIDDescription(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetRecentActivities(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> AddRecentActivity(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetWorkflowStage(string requestJson, CancellationToken cancellationToken = default);
    }
}
