using Microsoft.AspNetCore.Http;
using System.Threading;
using System.Threading.Tasks;

namespace ClientDocumentApi.Services
{
    public interface IFileStorageService
    {
        Task<string> SaveAsync(IFormFile file, CancellationToken cancellationToken = default);
        void DiscardAsync(CancellationToken cancellationToken = default);
    }
}
