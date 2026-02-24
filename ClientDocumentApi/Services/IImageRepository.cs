using ClientDocumentApi.Models;
using Microsoft.AspNetCore.Http;

namespace ClientDocumentApi.Services
{
    public interface IImageRepository
    {
        /// <summary>
        /// Save an image to database and file system
        /// </summary>
        Task<Image> SaveAsync(IFormFile file, string? imageTypeID, string? description, 
            string? imageStatusID, string? createdBy, DateTime? createdOn, CancellationToken cancellationToken = default);

        /// <summary>
        /// Retrieve image by ID
        /// </summary>
        Task<Image?> GetByIdAsync(long imageID, CancellationToken cancellationToken = default);

        /// <summary>
        /// Get image with only binary data (for download/download endpoint optimization)
        /// </summary>
        Task<(byte[]? Data, string? MimeType, string? FileName)?> GetImageDataAsync(long imageID, CancellationToken cancellationToken = default);

        /// <summary>
        /// Get image thumbnail
        /// </summary>
        Task<byte[]?> GetThumbnailAsync(long imageID, CancellationToken cancellationToken = default);

        /// <summary>
        /// Replace an existing image with new file
        /// </summary>
        Task<Image> ReplaceAsync(long imageID, IFormFile file, string? modifiedBy, CancellationToken cancellationToken = default);

        /// <summary>
        /// Delete image from database and file system
        /// </summary>
        Task DeleteAsync(long imageID, CancellationToken cancellationToken = default);

        /// <summary>
        /// Update image metadata only (without replacing file)
        /// </summary>
        Task<Image> UpdateMetadataAsync(long imageID, string? imageTypeID, string? description, 
            string? imageStatusID, string? closedBy, DateTime? closedDate, string? supervisedBy, 
            DateTime? supervisedOn, string? modifiedBy, CancellationToken cancellationToken = default);
    }
}
