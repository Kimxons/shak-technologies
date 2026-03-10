using ClientDocumentApi.Models;
using Microsoft.AspNetCore.Http;

namespace ClientDocumentApi.Services
{
    public interface IImageAccountPreApprovalRepository
    {
        Task<ImageAccountPreApproval> SaveAsync(IFormFile file, string imageTypeID, string clientID,
            string? description, string? createdBy, DateTime? createdOn, string? supervisedBy,
            DateTime? supervisedOn, byte[]? digit, string? sImage, string? ourBranchID,
            CancellationToken cancellationToken = default);

        Task<ImageAccountPreApproval?> GetByIdAsync(long imageID, CancellationToken cancellationToken = default);

        Task<(byte[]? Data, string? MimeType, string? FileName)?> GetImageDataAsync(long imageID, CancellationToken cancellationToken = default);

        Task<byte[]?> GetThumbnailAsync(long imageID, CancellationToken cancellationToken = default);

        Task<IEnumerable<ImageAccountPreApproval>> GetByClientIdAsync(string clientID, CancellationToken cancellationToken = default);

        Task<IEnumerable<ImageAccountPreApproval>> GetByImageIdsAsync(List<long> imageIds, CancellationToken cancellationToken = default);

        Task<ImageAccountPreApproval> UpdateMetadataAsync(long imageID, string? description, string? supervisedBy,
            DateTime? supervisedOn, bool? isClosed, string? modifiedBy, CancellationToken cancellationToken = default);

        Task<ImageAccountPreApproval> ReplaceAsync(long imageID, IFormFile file, string? modifiedBy, CancellationToken cancellationToken = default);

        Task DeleteAsync(long imageID, CancellationToken cancellationToken = default);


        /// <summary>
        /// Get all temp images for a specific request
        /// </summary>
        Task<List<ImageAccountPreApproval>> GetByRequestIdAsync(string requestID, CancellationToken cancellationToken = default);
        /// <summary>
        /// Get all temp images for a specific request with enriched details
        /// </summary>
        /// <param name="requestID"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        Task<List<object>> GetByRequestIdEnrichedAsync(string requestID, CancellationToken cancellationToken = default);

        /// <summary>
        /// Get all temp images for a specific client with enriched data
        /// </summary>
        Task<List<object>> GetByClientIdEnrichedAsync(string clientID, CancellationToken cancellationToken = default);
    }
}
