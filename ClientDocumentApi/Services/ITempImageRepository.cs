using ClientDocumentApi.Models;
using Microsoft.AspNetCore.Http;

namespace ClientDocumentApi.Services
{
    public interface ITempImageRepository
    {
        /// <summary>
        /// Save a temporary image to database and file system
        /// </summary>
        Task<TempImage> SaveAsync(IFormFile file, string imageTypeID, short? moduleID, long? imageID,
            string? ourBranchID, string? clientID, string? accountID, string? tempClientID,
            string? description, bool? copyToClientImage, string? createdBy, DateTime? createdOn,
            string? requestID, CancellationToken cancellationToken = default);

        /// <summary>
        /// Retrieve temporary image by ID
        /// </summary>
        Task<TempImage?> GetByIdAsync(long tempImageID, CancellationToken cancellationToken = default);

        /// <summary>
        /// Get temp image with only binary data (for download endpoint optimization)
        /// </summary>
        Task<(byte[]? Data, string? MimeType, string? FileName)?> GetImageDataAsync(long tempImageID, CancellationToken cancellationToken = default);

        /// <summary>
        /// Get temp image thumbnail
        /// </summary>
        Task<byte[]?> GetThumbnailAsync(long tempImageID, CancellationToken cancellationToken = default);

        /// <summary>
        /// Replace an existing temp image with new file
        /// </summary>
        Task<TempImage> ReplaceAsync(long tempImageID, IFormFile file, string? modifiedBy, CancellationToken cancellationToken = default);

        /// <summary>
        /// Delete temp image from database and file system
        /// </summary>
        Task DeleteAsync(long tempImageID, CancellationToken cancellationToken = default);

        /// <summary>
        /// Update temp image metadata only (without replacing file)
        /// </summary>
        Task<TempImage> UpdateMetadataAsync(long tempImageID, short? moduleID, long? imageID,
            string? imageTypeID, string? ourBranchID, string? clientID, string? accountID,
            string? tempClientID, string? description, bool? copyToClientImage, string? modifiedBy,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Update PhotoID or SignID in t_Client and t_AccountOperatedby based on imageTypeID
        /// </summary>
        Task UpdateClientAndSignatoryImageReferencesAsync(long tempImageID, string imageTypeID,
            string? clientID, string? signatoryID, CancellationToken cancellationToken = default);

        /// <summary>
        /// Get all temp images for a specific temp client
        /// </summary>
        Task<List<TempImage>> GetByTempClientIdAsync(string clientID, CancellationToken cancellationToken = default);

        /// <summary>
        /// Delete all temp images for a specific temp client
        /// </summary>
        Task DeleteByTempClientIdAsync(string clientID, CancellationToken cancellationToken = default);

        /// <summary>
        /// Get all temp images for a specific client
        /// </summary>
        Task<List<TempImage>> GetByClientIdAsync(string clientID, CancellationToken cancellationToken = default);
        /// <summary>
        /// Get all temp images for a specific client with enriched data
        /// </summary>
        Task<List<object>> GetByClientIdEnrichedAsync(string clientID, CancellationToken cancellationToken = default);

        /// <summary>
        /// Delete all temp images for a specific client
        /// </summary>
        Task DeleteByClientIdAsync(string clientID, CancellationToken cancellationToken = default);

        /// <summary>
        /// Get all temp images for a specific account
        /// </summary>
        Task<List<TempImage>> GetByAccountIdAsync(string accountID, CancellationToken cancellationToken = default);

        /// <summary>
        /// Delete all temp images for a specific account
        /// </summary>
        Task DeleteByAccountIdAsync(string accountID, CancellationToken cancellationToken = default);

        /// <summary>
        /// Get all temp images for a specific request
        /// </summary>
        Task<List<TempImage>> GetByRequestIdAsync(string requestID, CancellationToken cancellationToken = default);
        /// <summary>
        /// Get all temp images for a specific request with enriched details
        /// </summary>
        /// <param name="requestID"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        Task<List<object>> GetByRequestIdEnrichedAsync(string requestID, CancellationToken cancellationToken = default);

        /// <summary>
        /// Delete all temp images for a specific request
        /// </summary>
        Task DeleteByRequestIdAsync(string requestID, CancellationToken cancellationToken = default);
    }
}
