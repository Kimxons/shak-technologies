using ClientDocumentApi.Models;
using Microsoft.AspNetCore.Http;

namespace ClientDocumentApi.Services
{
    public interface IImageAccountRepository
    {
        Task<ImageAccount> SaveAsync(IFormFile file, string imageTypeID, string clientID,
            string? description, string? createdBy, DateTime? createdOn, string? supervisedBy, 
            DateTime? supervisedOn, byte[]? digit, string? sImage, bool bioStatus, 
            long? legacyImageID, string? ourBranchIDMig, CancellationToken cancellationToken = default);

        Task<ImageAccount?> GetByIdAsync(long imageID, CancellationToken cancellationToken = default);

        Task<(byte[]? Data, string? MimeType, string? FileName)?> GetImageDataAsync(long imageID, CancellationToken cancellationToken = default);

        Task<byte[]?> GetThumbnailAsync(long imageID, CancellationToken cancellationToken = default);

        Task<IEnumerable<ImageAccount>> GetByClientIdAsync(string clientID, CancellationToken cancellationToken = default);

        Task<IEnumerable<ImageAccount>> GetByImageIdsAsync(List<long> imageIds, CancellationToken cancellationToken = default);

        Task<ImageAccount> UpdateMetadataAsync(long imageID, string? description, string? supervisedBy,
            DateTime? supervisedOn, bool? isClosed, string? modifiedBy, CancellationToken cancellationToken = default);

        Task<ImageAccount> ReplaceAsync(long imageID, IFormFile file, string? modifiedBy, CancellationToken cancellationToken = default);

        Task DeleteAsync(long imageID, CancellationToken cancellationToken = default);
    }
}
