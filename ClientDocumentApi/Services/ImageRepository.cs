using ClientDocumentApi.Data;
using ClientDocumentApi.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ImageModel = ClientDocumentApi.Models.Image;

namespace ClientDocumentApi.Services
{
    public class ImageRepository : IImageRepository
    {
        private readonly ImageDbContext _context;
        private readonly IFileStorageService _fileStorage;

        public ImageRepository(ImageDbContext context, IFileStorageService fileStorage)
        {
            _context = context;
            _fileStorage = fileStorage;
        }

        public async Task<ImageModel> SaveAsync(IFormFile file, string? imageTypeID, string? description,
            string? imageStatusID, string? createdBy, DateTime? createdOn, CancellationToken cancellationToken = default)
        {
            if (file == null || file.Length == 0)
                throw new InvalidOperationException("A non-empty file is required.");

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
                    //base64Content = Convert.ToBase64String(imageData);
                }

                //// Generate thumbnail if it's an image
                //if (file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                //{
                //    try
                //    {
                //        using (var image = SixLabors.ImageSharp.Image.Load(imageData))
                //        {
                //            // Create a thumbnail (e.g., 150x150 max)
                //            image.Mutate(x => x.Resize(new ResizeOptions
                //            {
                //                Size = new Size(150, 150),
                //                Mode = ResizeMode.Max
                //            }));

                //            using (var thumbStream = new MemoryStream())
                //            {
                //                await image.SaveAsJpegAsync(thumbStream, cancellationToken);
                //                thumbnailData = thumbStream.ToArray();
                //            }
                //        }
                //    }
                //    catch
                //    {
                //        // If thumbnail generation fails, continue without it
                //        thumbnailData = null;
                //    }
                //}

                var entity = new ImageModel
                {
                    ImageTypeID = imageTypeID,
                    ImageData = imageData,
                    ThumbNailImage = thumbnailData,
                    Description = file.FileName,
                    ImageStatusID = imageStatusID ?? "NEW",
                    CreatedBy = createdBy,
                    CreatedOn = createdOn ?? DateTime.UtcNow,
                    ModifiedBy = null,
                    ModifiedOn = null,
                    UpdateCount = (byte)0,
                    sImage = base64Content,
                    MimeType = file.ContentType,
                    FilePath = filePath
                };

                _context.Images.Add(entity);
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

        public async Task<ImageModel?> GetByIdAsync(long imageID, CancellationToken cancellationToken = default)
        {
            return await _context.Images.FirstOrDefaultAsync(i => i.ImageID == imageID, cancellationToken);
        }

        public async Task<(byte[]? Data, string? MimeType, string? FileName)?> GetImageDataAsync(long imageID, CancellationToken cancellationToken = default)
        {
            var entity = await _context.Images
                .Select(i => new { i.ImageID, i.ImageData, i.MimeType, FileName = i.Description })
                .FirstOrDefaultAsync(i => i.ImageID == imageID, cancellationToken);

            if (entity == null)
                return null;

            return (entity.ImageData, entity.MimeType, entity.FileName);
        }

        public async Task<byte[]?> GetThumbnailAsync(long imageID, CancellationToken cancellationToken = default)
        {
            var entity = await _context.Images
                .Select(i => new { i.ImageID, i.ThumbNailImage })
                .FirstOrDefaultAsync(i => i.ImageID == imageID, cancellationToken);

            return entity?.ThumbNailImage;
        }

        public async Task<ImageModel> ReplaceAsync(long imageID, IFormFile file, string? modifiedBy, CancellationToken cancellationToken = default)
        {
            if (file == null || file.Length == 0)
                throw new InvalidOperationException("A non-empty file is required.");

            var entity = await _context.Images.FirstOrDefaultAsync(i => i.ImageID == imageID, cancellationToken);
            if (entity == null)
                throw new KeyNotFoundException($"Image with ID {imageID} not found.");

            string oldFilePath = entity.FilePath ?? string.Empty;
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

                // Thumbnail generation removed; keep thumbnailData as null
                // Update entity
                entity.ImageData = imageData;
                entity.ThumbNailImage = thumbnailData;
                entity.sImage = base64Content;
                entity.MimeType = file.ContentType;
                entity.FilePath = newFilePath;
                entity.ModifiedBy = modifiedBy;
                entity.ModifiedOn = DateTime.UtcNow;
                var nextUpdateCount = Math.Min(byte.MaxValue, (entity.UpdateCount ?? 0) + 1);
                entity.UpdateCount = (byte)nextUpdateCount;

                await _context.SaveChangesAsync(cancellationToken);

                shouldKeepNewFile = true;

                // Delete old file if it exists and is different
                if (!string.IsNullOrEmpty(oldFilePath) && oldFilePath != newFilePath)
                {
                    var oldPhysicalPath = Path.Combine(Directory.GetCurrentDirectory(), oldFilePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                    if (System.IO.File.Exists(oldPhysicalPath))
                    {
                        try
                        {
                            System.IO.File.Delete(oldPhysicalPath);
                        }
                        catch
                        {
                            // Ignore old file deletion errors
                        }
                    }
                }

                return entity;
            }
            finally
            {
                // Cleanup new file if operation failed
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
            var entity = await _context.Images.FirstOrDefaultAsync(i => i.ImageID == imageID, cancellationToken);
            if (entity == null)
                throw new KeyNotFoundException($"Image with ID {imageID} not found.");

            var filePath = entity.FilePath;

            try
            {
                _context.Images.Remove(entity);
                await _context.SaveChangesAsync(cancellationToken);

                // Delete associated file
                if (!string.IsNullOrEmpty(filePath))
                {
                    var physicalPath = Path.Combine(Directory.GetCurrentDirectory(), filePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                    if (System.IO.File.Exists(physicalPath))
                    {
                        try
                        {
                            System.IO.File.Delete(physicalPath);
                        }
                        catch
                        {
                            // Ignore file deletion errors
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to delete image with ID {imageID}.", ex);
            }
        }

        public async Task<ImageModel> UpdateMetadataAsync(long imageID, string? imageTypeID, string? description,
            string? imageStatusID, string? closedBy, DateTime? closedDate, string? supervisedBy,
            DateTime? supervisedOn, string? modifiedBy, CancellationToken cancellationToken = default)
        {
            var entity = await _context.Images.FirstOrDefaultAsync(i => i.ImageID == imageID, cancellationToken);
            if (entity == null)
                throw new KeyNotFoundException($"Image with ID {imageID} not found.");

            // Update only provided fields
            if (imageTypeID != null)
                entity.ImageTypeID = imageTypeID;

            if (description != null)
                entity.Description = description;

            if (imageStatusID != null)
                entity.ImageStatusID = imageStatusID;

            if (closedBy != null)
                entity.ClosedBy = closedBy;

            if (closedDate.HasValue)
                entity.ClosedDate = closedDate;

            if (supervisedBy != null)
                entity.SupervisedBy = supervisedBy;

            if (supervisedOn.HasValue)
                entity.SupervisedOn = supervisedOn;

            // Always update ModifiedBy and ModifiedOn
            entity.ModifiedBy = modifiedBy;
            entity.ModifiedOn = DateTime.UtcNow;
            entity.UpdateCount = (byte?)((entity.UpdateCount ?? 0) + 1);

            try
            {
                await _context.SaveChangesAsync(cancellationToken);
                return entity;
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to update image metadata for ID {imageID}.", ex);
            }
        }
    }
}
