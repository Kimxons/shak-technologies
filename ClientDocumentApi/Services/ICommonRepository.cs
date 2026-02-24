using ClientDocumentApi.Contracts;

namespace ClientDocumentApi.Services
{
    public interface ICommonRepository
    {
        Task<SystemCodeResponse> GetSystemCodesAsync(List<string> codeIds, CancellationToken cancellationToken = default);
    }
}
