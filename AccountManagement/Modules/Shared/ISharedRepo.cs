using CBS.Entities.Common;
using System.Text.Json;

namespace AccountManagement.Modules.Shared
{
    public interface ISharedRepo
    {
        public Task<ResponseDetail<object>> GetSystemSearchResult(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetSystemCodes(string requestJson, CancellationToken cancellationToken = default);
    }
}
