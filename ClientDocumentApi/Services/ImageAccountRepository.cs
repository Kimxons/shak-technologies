using ClientDocumentApi.Data;
using ClientDocumentApi.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace ClientDocumentApi.Services
{
    public class ImageAccountRepository : IImageAccountRepository
    {
        private readonly ImageDbContext _context;
        private readonly IFileStorageService _fileStorage;

        public ImageAccountRepository(ImageDbContext context, IFileStorageService fileStorage)
        {
            _context = context;
            _fileStorage = fileStorage;
        }

        public async Task<ImageAccount> SaveAsync(IFormFile file, string imageTypeID, string clientID,
            string? description, string? createdBy, DateTime? createdOn, string? supervisedBy,
            DateTime? supervisedOn, byte[]? digit, string? sImage, bool bioStatus,
            long? legacyImageID, string? ourBranchIDMig, CancellationToken cancellationToken = default)
        {
            if (file == null || file.Length == 0)
                throw new InvalidOperationException("A non-empty file is required.");

            if (string.IsNullOrWhiteSpace(imageTypeID))
                throw new InvalidOperationException("ImageTypeID is required.");

            if (string.IsNullOrWhiteSpace(clientID))
                throw new InvalidOperationException("ClientID is required.");

            if (string.IsNullOrWhiteSpace(createdBy))
                throw new InvalidOperationException("CreatedBy is required.");

            string filePath = string.Empty;
            bool shouldKeepFile = false;

            try
            {
                // Save file to disk
                filePath = await _fileStorage.SaveAsync(file, cancellationToken);

                byte[] imageData;
                byte[]? thumbnailData = null;
                string? base64Content = null;

                // Read the file into memory
                using (var memoryStream = new MemoryStream())
                {
                    await file.CopyToAsync(memoryStream, cancellationToken);
                    imageData = memoryStream.ToArray();
                    base64Content = string.IsNullOrEmpty(sImage) ? Convert.ToBase64String(imageData) : sImage;
                }

                var entity = new ImageAccount
                {
                    ImageTypeID = imageTypeID,
                    ClientID = clientID,
                    Image = imageData,
                    ThumbNailImage = thumbnailData,
                    Description = description ?? file.FileName,
                    IsClosed = false,
                    CreatedBy = createdBy,
                    CreatedOn = createdOn ?? DateTime.UtcNow,
                    SupervisedBy = supervisedBy,
                    SupervisedOn = supervisedOn,
                    Digit = digit,
                    sImage = base64Content ?? string.Empty,
                    BioStatus = bioStatus,
                    LegacyImageID = legacyImageID,
                    OurBranchIDMig = ourBranchIDMig,
                    IsModified = false
                };

                _context.ImageAccounts.Add(entity);
                await _context.SaveChangesAsync(cancellationToken);

                shouldKeepFile = true;

                return entity;
            }
            finally
            {
                // Cleanup file if operation failed
                if (!shouldKeepFile && !string.IsNullOrEmpty(filePath) && System.IO.File.Exists(filePath))
                {
                    try
                    {
                        System.IO.File.Delete(filePath);
                    }
                    catch
                    {
                        // Ignore cleanup errors
                    }
                }
            }
        }

        public async Task<ImageAccount?> GetByIdAsync(long imageID, CancellationToken cancellationToken = default)
        {
            return await _context.ImageAccounts.FirstOrDefaultAsync(i => i.ImageID == imageID, cancellationToken);
        }

        public async Task<(byte[]? Data, string? MimeType, string? FileName)?> GetImageDataAsync(long imageID, CancellationToken cancellationToken = default)
        {
            var entity = await _context.ImageAccounts
                .Select(i => new { i.ImageID, i.Image, FileName = i.Description })
                .FirstOrDefaultAsync(i => i.ImageID == imageID, cancellationToken);

            if (entity == null)
                return null;

            return (entity.Image, "application/octet-stream", entity.FileName);
        }

        public async Task<byte[]?> GetThumbnailAsync(long imageID, CancellationToken cancellationToken = default)
        {
            var entity = await _context.ImageAccounts
                .Select(i => new { i.ImageID, i.ThumbNailImage })
                .FirstOrDefaultAsync(i => i.ImageID == imageID, cancellationToken);

            return entity?.ThumbNailImage;
        }

        public async Task<IEnumerable<ImageAccount>> GetByClientIdAsync(string clientID, CancellationToken cancellationToken = default)
        {
            return await _context.ImageAccounts
                .Where(i => i.ClientID == clientID)
                .ToListAsync(cancellationToken);
        }

        public async Task<IEnumerable<ImageAccount>> GetByImageIdsAsync(List<long> imageIds, CancellationToken cancellationToken = default)
        {
            if (imageIds == null || imageIds.Count == 0)
                return new List<ImageAccount>();

            return await _context.ImageAccounts
                .Where(i => imageIds.Contains(i.ImageID))
                .ToListAsync(cancellationToken);
        }

        public async Task<ImageAccount> UpdateMetadataAsync(long imageID, string? description, string? supervisedBy,
            DateTime? supervisedOn, bool? isClosed, string? modifiedBy, CancellationToken cancellationToken = default)
        {
            var entity = await _context.ImageAccounts.FirstOrDefaultAsync(i => i.ImageID == imageID, cancellationToken);
            if (entity == null)
                throw new KeyNotFoundException($"Image Account with ID {imageID} not found.");

            if (!string.IsNullOrWhiteSpace(description))
                entity.Description = description;

            if (!string.IsNullOrWhiteSpace(supervisedBy))
                entity.SupervisedBy = supervisedBy;

            if (supervisedOn.HasValue)
                entity.SupervisedOn = supervisedOn;

            if (isClosed.HasValue)
                entity.IsClosed = isClosed.Value;

            entity.IsModified = true;

            await _context.SaveChangesAsync(cancellationToken);
            return entity;
        }

        public async Task<ImageAccount> ReplaceAsync(long imageID, IFormFile file, string? modifiedBy, CancellationToken cancellationToken = default)
        {
            if (file == null || file.Length == 0)
                throw new InvalidOperationException("A non-empty file is required.");

            var entity = await _context.ImageAccounts.FirstOrDefaultAsync(i => i.ImageID == imageID, cancellationToken);
            if (entity == null)
                throw new KeyNotFoundException($"Image Account with ID {imageID} not found.");

            string newFilePath = string.Empty;
            bool shouldKeepNewFile = false;

            try
            {
                // Save new file to disk
                newFilePath = await _fileStorage.SaveAsync(file, cancellationToken);

                byte[] imageData;
                byte[]? thumbnailData = null;
                string? base64Content = null;

                // Read the file into memory
                using (var memoryStream = new MemoryStream())
                {
                    await file.CopyToAsync(memoryStream, cancellationToken);
                    imageData = memoryStream.ToArray();
                    base64Content = Convert.ToBase64String(imageData);
                }

                // Update entity
                entity.Image = imageData;
                entity.ThumbNailImage = thumbnailData;
                entity.sImage = base64Content ?? string.Empty;
                entity.IsModified = true;

                await _context.SaveChangesAsync(cancellationToken);

                shouldKeepNewFile = true;

                return entity;
            }
            finally
            {
                // Cleanup file if operation failed
                if (!shouldKeepNewFile && !string.IsNullOrEmpty(newFilePath) && System.IO.File.Exists(newFilePath))
                {
                    try
                    {
                        System.IO.File.Delete(newFilePath);
                    }
                    catch
                    {
                        // Ignore cleanup errors
                    }
                }
            }
        }

        public async Task DeleteAsync(long imageID, CancellationToken cancellationToken = default)
        {
            var entity = await _context.ImageAccounts.FirstOrDefaultAsync(i => i.ImageID == imageID, cancellationToken);
            if (entity == null)
                throw new KeyNotFoundException($"Image Account with ID {imageID} not found.");

            _context.ImageAccounts.Remove(entity);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
