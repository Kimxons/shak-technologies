using ClientDocumentApi.Options;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace ClientDocumentApi.Services
{
    public class FileStorageService : IFileStorageService
    {
        private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp"
        };

        private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/bmp",
            "image/tiff",
            "image/webp"
        };

        private readonly string _uploadRoot;
        private readonly string _requestPath;

        public FileStorageService(IWebHostEnvironment env, IOptions<StorageOptions> options)
        {
            var settings = options.Value ?? new StorageOptions();
            var relativePath = string.IsNullOrWhiteSpace(settings.UploadPath) ? "uploads" : settings.UploadPath;
            _uploadRoot = Path.GetFullPath(Path.Combine(env.ContentRootPath, relativePath));
            Directory.CreateDirectory(_uploadRoot);

            _requestPath = string.IsNullOrWhiteSpace(settings.RequestPath)
                ? "/uploads"
                : (settings.RequestPath.StartsWith("/") ? settings.RequestPath : "/" + settings.RequestPath.TrimStart('/'));
        }

        public async Task<string> SaveAsync(IFormFile file, CancellationToken cancellationToken = default)
        {
            if (file == null || file.Length == 0)
            {
                throw new InvalidOperationException("A non-empty file is required.");
            }

            if (!IsAllowed(file))
            {
                throw new InvalidOperationException("Only image and PDF files are allowed.");
            }

            var extension = Path.GetExtension(file.FileName);
            var fileName = $"{Guid.NewGuid()}{extension}";
            var destination = Path.Combine(_uploadRoot, fileName);

            await using var stream = new FileStream(destination, FileMode.Create, FileAccess.Write, FileShare.None, 81920, useAsync: true);
            await file.CopyToAsync(stream, cancellationToken);

            return $"{_requestPath.TrimEnd('/')}/{fileName}";
        }
        public void DiscardAsync(CancellationToken cancellationToken = default)
        {
            if (Directory.Exists(_uploadRoot))
            {
                foreach (string fileName in Directory.GetFiles(_uploadRoot))
                {
                    var destination = Path.Combine(_uploadRoot, fileName);
                    DateTime creationTime = File.GetCreationTimeUtc(destination);
                    TimeSpan fileAge = DateTime.UtcNow - creationTime;
                    if (fileAge >= TimeSpan.FromMinutes(5))
                        File.Delete(destination);
                }
            }
        }
        private static bool IsAllowed(IFormFile file)
        {
            var extension = Path.GetExtension(file.FileName);
            var contentType = file.ContentType ?? string.Empty;
            return AllowedExtensions.Contains(extension) && AllowedContentTypes.Contains(contentType);
        }
    }
}
