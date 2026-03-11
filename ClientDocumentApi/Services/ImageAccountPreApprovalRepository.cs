using ClientDocumentApi.Contracts;
using ClientDocumentApi.Data;
using ClientDocumentApi.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace ClientDocumentApi.Services
{
    public class ImageAccountPreApprovalRepository : IImageAccountPreApprovalRepository
    {
        private readonly TempImageDbContext _context;
        private readonly IFileStorageService _fileStorage;
        private readonly ICommonRepository _commonRepository;

        public ImageAccountPreApprovalRepository(TempImageDbContext context, IFileStorageService fileStorage, ICommonRepository commonRepository)
        {
            _context = context;
            _fileStorage = fileStorage;
            _commonRepository = commonRepository;
        }

        public async Task<ImageAccountPreApproval> SaveAsync(IFormFile file, string imageTypeID, string clientID,
            string? description, string? createdBy, DateTime? createdOn, string? supervisedBy,
            DateTime? supervisedOn, byte[]? digit, string? sImage, string? ourBranchID,
            CancellationToken cancellationToken = default)
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

                var entity = new ImageAccountPreApproval
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
                    OurBranchID = ourBranchID,
                    IsModified = false
                };

                _context.ImageAccountPreApprovals.Add(entity);
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

        public async Task<ImageAccountPreApproval?> GetByIdAsync(long imageID, CancellationToken cancellationToken = default)
        {
            return await _context.ImageAccountPreApprovals.FirstOrDefaultAsync(i => i.ImageID == imageID, cancellationToken);
        }

        public async Task<(byte[]? Data, string? MimeType, string? FileName)?> GetImageDataAsync(long imageID, CancellationToken cancellationToken = default)
        {
            var entity = await _context.ImageAccountPreApprovals
                .Select(i => new { i.ImageID, i.Image, FileName = i.Description })
                .FirstOrDefaultAsync(i => i.ImageID == imageID, cancellationToken);

            if (entity == null)
                return null;

            return (entity.Image, "application/octet-stream", entity.FileName);
        }

        public async Task<byte[]?> GetThumbnailAsync(long imageID, CancellationToken cancellationToken = default)
        {
            var entity = await _context.ImageAccountPreApprovals
                .Select(i => new { i.ImageID, i.ThumbNailImage })
                .FirstOrDefaultAsync(i => i.ImageID == imageID, cancellationToken);

            return entity?.ThumbNailImage;
        }

        public async Task<IEnumerable<ImageAccountPreApproval>> GetByClientIdAsync(string clientID, CancellationToken cancellationToken = default)
        {
            return await _context.ImageAccountPreApprovals
                .Where(i => i.ClientID == clientID)
                .ToListAsync(cancellationToken);
        }

        public async Task<IEnumerable<ImageAccountPreApproval>> GetByImageIdsAsync(List<long> imageIds, CancellationToken cancellationToken = default)
        {
            if (imageIds == null || imageIds.Count == 0)
                return new List<ImageAccountPreApproval>();

            return await _context.ImageAccountPreApprovals
                .Where(i => imageIds.Contains(i.ImageID))
                .ToListAsync(cancellationToken);
        }

        public async Task<ImageAccountPreApproval> UpdateMetadataAsync(long imageID, string? description, string? supervisedBy,
            DateTime? supervisedOn, bool? isClosed, string? modifiedBy, CancellationToken cancellationToken = default)
        {
            var entity = await _context.ImageAccountPreApprovals.FirstOrDefaultAsync(i => i.ImageID == imageID, cancellationToken);
            if (entity == null)
                throw new KeyNotFoundException($"Image Account Pre-Approval with ID {imageID} not found.");

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

        public async Task<ImageAccountPreApproval> ReplaceAsync(long imageID, IFormFile file, string? modifiedBy, CancellationToken cancellationToken = default)
        {
            if (file == null || file.Length == 0)
                throw new InvalidOperationException("A non-empty file is required.");

            var entity = await _context.ImageAccountPreApprovals.FirstOrDefaultAsync(i => i.ImageID == imageID, cancellationToken);
            if (entity == null)
                throw new KeyNotFoundException($"Image Account Pre-Approval with ID {imageID} not found.");

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
            var entity = await _context.ImageAccountPreApprovals.FirstOrDefaultAsync(i => i.ImageID == imageID, cancellationToken);
            if (entity == null)
                throw new KeyNotFoundException($"Image Account Pre-Approval with ID {imageID} not found.");

            _context.ImageAccountPreApprovals.Remove(entity);
            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task<List<ImageAccountPreApproval>> GetByRequestIdAsync(string requestID, CancellationToken cancellationToken = default)
        {

            if (string.IsNullOrWhiteSpace(requestID))
                throw new ArgumentException("RequestID cannot be null or empty.", nameof(requestID));

            return await _context.ImageAccountPreApprovals
                .Where(i => i.ClientID == requestID)
                .ToListAsync(cancellationToken);
        }

        public async Task<List<object>> GetByRequestIdEnrichedAsync(string requestID, CancellationToken cancellationToken = default)
        {

            if (string.IsNullOrEmpty(requestID))
                return [];
            IEnumerable<ImageAccountPreApproval>? lsTempImages = await GetByRequestIdAsync(requestID, cancellationToken);
            SystemCodeResponse sresp = await _commonRepository.GetSystemCodesAsync(["ImageTypeID"], cancellationToken);
            return lsTempImages.Select(ti => new
            {
                ti.ImageID,
                ti.ImageTypeID,
                ImageTypeDescription = sresp.Details?.FirstOrDefault(d => d.CodeID == nameof(ti.ImageTypeID) && d.SubCodeID == ti.ImageTypeID)?.CodeDescription,
                ti.ClientID,
                ti.Image,
                ti.ThumbNailImage,
                ti.Description,
                ti.IsClosed,
                ti.CreatedBy,
                ti.CreatedOn,
                ti.SupervisedBy,
                ti.SupervisedOn,
                ti.sImage,
                ti.Digit,
                ti.IsModified,
                ti.MimeType,
                ti.OurBranchID,
                ti.FilePath
            }).ToList<object>();
        }

        public async Task<List<object>> GetByClientIdEnrichedAsync(string clientID, CancellationToken cancellationToken = default)
        {

            if (string.IsNullOrEmpty(clientID))
                return [];
            IEnumerable<ImageAccountPreApproval>? lsTempImages = await GetByClientIdAsync(clientID, cancellationToken);
            SystemCodeResponse sresp = await _commonRepository.GetSystemCodesAsync(["ImageTypeID"], cancellationToken);
            return lsTempImages.Select(ti => new
            {
                ti.ImageID,
                ti.ImageTypeID,
                ImageTypeDescription = sresp.Details?.FirstOrDefault(d => d.CodeID == nameof(ti.ImageTypeID) && d.SubCodeID == ti.ImageTypeID)?.CodeDescription,
                ti.ClientID,
                ti.Image,
                ti.ThumbNailImage,
                ti.Description,
                ti.IsClosed,
                ti.CreatedBy,
                ti.CreatedOn,
                ti.SupervisedBy,
                ti.SupervisedOn,
                ti.sImage,
                ti.Digit,
                ti.IsModified,
                ti.MimeType,
                ti.OurBranchID,
                ti.FilePath
            }).ToList<object>();
        }
    }
}
