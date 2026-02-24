using ClientDocumentApi.Contracts;
using ClientDocumentApi.Models;

namespace ClientDocumentApi.Services
{
    public interface IAccountDocumentRepository
    {
        Task<(bool Success, long ImageID, string Message)> UploadAccountDocumentAsync(
            InData<AccountDocumentUploadRequest> request, 
            CancellationToken cancellationToken = default);

        Task<(bool Success, List<ClientDocument> Documents, string Message)> GetAccountDocumentsByAccountIdAsync(
            string accountId,
            CancellationToken cancellationToken = default);
    }
}
