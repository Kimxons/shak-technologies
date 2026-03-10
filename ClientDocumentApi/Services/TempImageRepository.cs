using Azure.Core;
using ClientDocumentApi.Contracts;
using ClientDocumentApi.Data;
using ClientDocumentApi.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace ClientDocumentApi.Services
{
    public class TempImageRepository : ITempImageRepository
    {
        private readonly TempImageDbContext _context;
        private readonly DocumentDbContext _documentContext;
        private readonly IFileStorageService _fileStorage;
        private readonly ICommonRepository _commonRepository;
        private readonly IImageAccountPreApprovalRepository _imageAccountPreApprovalRepository;
        private sealed record ProcedureResponse(string ResponseCode, string? ResponseMessage, string? Details);
        public TempImageRepository(TempImageDbContext context, DocumentDbContext documentContext, IFileStorageService fileStorage, ICommonRepository commonRepository, IImageAccountPreApprovalRepository imageAccountPreApprovalRepository)
        {
            _context = context;
            _documentContext = documentContext;
            _fileStorage = fileStorage;
            _commonRepository = commonRepository;
            _imageAccountPreApprovalRepository = imageAccountPreApprovalRepository;
        }

        public async Task<TempImage> SaveAsync(IFormFile file, string imageTypeID, short? moduleID, long? imageID,
            string? ourBranchID, string? clientID, string? accountID, string? tempClientID,
            string? description, bool? copyToClientImage, string? createdBy, DateTime? createdOn,
            string? requestID, CancellationToken cancellationToken = default)
        {
            if (file == null || file.Length == 0)
                throw new InvalidOperationException("A non-empty file is required.");

            if (string.IsNullOrWhiteSpace(imageTypeID))
                throw new InvalidOperationException("ImageTypeID is required.");

            string filePath = string.Empty;
            bool shouldKeepFile = false;
            long tempImageID = 0;
            try
            {
                if (string.IsNullOrEmpty(tempClientID) && string.IsNullOrEmpty(clientID))
                {
                    throw new InvalidOperationException($"Temp Client ID required.");
                }
                tempClientID = tempClientID ?? clientID;

                tempClientID = tempClientID ?? requestID;
                clientID = string.IsNullOrEmpty(clientID) ? tempClientID : clientID;

                if (moduleID <= 0)
                {
                    throw new InvalidOperationException($"Valid module ID required.");
                }
                //Verify image is not already persisted
                // Get the temp image to ensure it does not exist
                var tempImage = await _context.TempImages.FirstOrDefaultAsync(i => i.TempClientID!.Equals(tempClientID) && i.ImageTypeID.Equals(imageTypeID) && i.DeletedBy! == null, cancellationToken);
                if (tempImage != null)
                    throw new KeyNotFoundException($"Temp image with temp client id {tempClientID} exists.");

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

                var entity = new TempImage
                {
                    ModuleID = moduleID,
                    ImageID = imageID,
                    ImageTypeID = imageTypeID,
                    OurBranchID = ourBranchID,
                    ClientID = clientID,
                    AccountID = accountID,
                    TempClientID = tempClientID,
                    //RequestID = requestID,
                    Image = imageData,
                    ThumbNailImage = thumbnailData,
                    Description = description ?? file.FileName,
                    CopyToClientImage = copyToClientImage,
                    CreatedBy = createdBy,
                    CreatedOn = createdOn ?? DateTime.UtcNow,
                    UpdateCount = (byte)0,
                    sImage = base64Content ?? string.Empty
                };

                _context.TempImages.Add(entity);
                await _context.SaveChangesAsync(cancellationToken);
                tempImageID = entity.TempImageID;

                // Also save to ImageAccountPreApproval table if clientID is provided
                if (!string.IsNullOrWhiteSpace(clientID))
                {
                    try
                    {
                        // Create a MemoryStream from the image data to create an IFormFile
                        var stream = new MemoryStream(imageData);
                        var formFile = new FormFile(stream, 0, imageData.Length, "file", description ?? file.FileName)
                        {
                            Headers = new HeaderDictionary(),
                            ContentType = file.ContentType
                        };

                        await _imageAccountPreApprovalRepository.SaveAsync(
                            formFile,
                            imageTypeID,
                            clientID,
                            description ?? file.FileName,
                            createdBy,
                            createdOn ?? DateTime.UtcNow,
                            null, // supervisedBy
                            null, // supervisedOn
                            null, // digit
                            base64Content, // sImage
                            ourBranchID,
                            cancellationToken
                        );
                    }
                    catch (Exception ex)
                    {
                        // Log the error but don't fail the main upload
                        // Consider adding proper logging here
                        Console.WriteLine($"Failed to save to ImageAccountPreApproval: {ex.Message}");
                    }
                }

                // Update client and signatory image references based on imageTypeID
                // This will throw an exception if it fails, causing the entire upload to fail
                if (!string.IsNullOrWhiteSpace(clientID) || !string.IsNullOrWhiteSpace(tempClientID))
                {
                    await UpdateClientAndSignatoryImageReferencesAsync(entity.TempImageID, imageTypeID,
                        clientID, tempClientID, cancellationToken);
                }

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
                        if (tempImageID != 0)
                        {
                            var tempImage = await _context.TempImages.FirstOrDefaultAsync(i => i.TempImageID == tempImageID, cancellationToken);
                            if (tempImage != null)
                            {
                                _context.TempImages.Remove(tempImage);
                                await _context.SaveChangesAsync(cancellationToken);
                            }
                        }
                    }
                    catch
                    {
                        // Ignore cleanup errors
                    }
                }
            }
        }

        public async Task<TempImage?> GetByIdAsync(long tempImageID, CancellationToken cancellationToken = default)
        {
            return await _context.TempImages.FirstOrDefaultAsync(i => i.TempImageID == tempImageID, cancellationToken);
        }

        public async Task<(byte[]? Data, string? MimeType, string? FileName)?> GetImageDataAsync(long tempImageID, CancellationToken cancellationToken = default)
        {
            var entity = await _context.TempImages
                .Select(i => new { i.TempImageID, i.Image, FileName = i.Description })
                .FirstOrDefaultAsync(i => i.TempImageID == tempImageID, cancellationToken);

            if (entity == null)
                return null;

            return (entity.Image, "application/octet-stream", entity.FileName);
        }

        public async Task<byte[]?> GetThumbnailAsync(long tempImageID, CancellationToken cancellationToken = default)
        {
            var entity = await _context.TempImages
                .Select(i => new { i.TempImageID, i.ThumbNailImage })
                .FirstOrDefaultAsync(i => i.TempImageID == tempImageID, cancellationToken);

            return entity?.ThumbNailImage;
        }

        public async Task<TempImage> ReplaceAsync(long tempImageID, IFormFile file, string? modifiedBy, CancellationToken cancellationToken = default)
        {
            if (file == null || file.Length == 0)
                throw new InvalidOperationException("A non-empty file is required.");

            var entity = await _context.TempImages.FirstOrDefaultAsync(i => i.TempImageID == tempImageID, cancellationToken);
            if (entity == null)
                throw new KeyNotFoundException($"Temp image with ID {tempImageID} not found.");

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
                entity.ModifiedBy = modifiedBy;
                entity.ModifiedOn = DateTime.UtcNow;
                var nextUpdateCount = Math.Min(byte.MaxValue, (entity.UpdateCount ?? 0) + 1);
                entity.UpdateCount = (byte)nextUpdateCount;

                await _context.SaveChangesAsync(cancellationToken);

                shouldKeepNewFile = true;

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

        public async Task DeleteAsync(long tempImageID, CancellationToken cancellationToken = default)
        {
            var entity = await _context.TempImages.FirstOrDefaultAsync(i => i.TempImageID == tempImageID, cancellationToken);
            if (entity == null)
                throw new KeyNotFoundException($"Temp image with ID {tempImageID} not found.");

            try
            {
                _context.TempImages.Remove(entity);
                await _context.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to delete temp image with ID {tempImageID}.", ex);
            }
        }

        public async Task<TempImage> UpdateMetadataAsync(long tempImageID, short? moduleID, long? imageID,
            string? imageTypeID, string? ourBranchID, string? clientID, string? accountID,
            string? tempClientID, string? description, bool? copyToClientImage, string? modifiedBy,
            CancellationToken cancellationToken = default)
        {
            var entity = await _context.TempImages.FirstOrDefaultAsync(i => i.TempImageID == tempImageID, cancellationToken);
            if (entity == null)
                throw new KeyNotFoundException($"Temp image with ID {tempImageID} not found.");

            // Update only provided fields
            if (moduleID.HasValue)
                entity.ModuleID = moduleID;

            if (imageID.HasValue)
                entity.ImageID = imageID;

            if (imageTypeID != null)
                entity.ImageTypeID = imageTypeID;

            if (ourBranchID != null)
                entity.OurBranchID = ourBranchID;

            if (clientID != null)
                entity.ClientID = clientID;

            if (accountID != null)
                entity.AccountID = accountID;

            if (tempClientID != null)
                entity.TempClientID = tempClientID;

            if (description != null)
                entity.Description = description;

            if (copyToClientImage.HasValue)
                entity.CopyToClientImage = copyToClientImage;

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
                throw new InvalidOperationException($"Failed to update temp image metadata for ID {tempImageID}.", ex);
            }
        }

        public async Task<List<TempImage>> GetByTempClientIdAsync(string clientID, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(clientID))
                throw new ArgumentException("TempClientID cannot be null or empty.", nameof(clientID));
            var tempImage = await _context.TempImages
                .Where(i => i.TempClientID == clientID)
                .ToListAsync(cancellationToken);
            if (tempImage == null || !tempImage.Any())
            {
                //throw new KeyNotFoundException($"No temp images found for TempClientID {clientID}.");
                tempImage = await GetByClientIdAsync(clientID, cancellationToken);
            }
            return tempImage;
        }

        public async Task DeleteByTempClientIdAsync(string clientID, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(clientID))
                throw new ArgumentException("TempClientID cannot be null or empty.", nameof(clientID));

            try
            {
                var entitiesObj = await GetByClientIdAsync(clientID, cancellationToken);
                var entities = entitiesObj.Cast<TempImage>().ToList();
                if (entities.Any())
                {
                    _context.TempImages.RemoveRange(entities);
                    await _context.SaveChangesAsync(cancellationToken);
                }
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to delete temp images for TempClientID {clientID}.", ex);
            }
        }
        public async Task<List<object>> GetByClientIdEnrichedAsync(string clientID, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrEmpty(clientID))
                return [];
            List<TempImage>? lsTempImages = await GetByClientIdAsync(clientID, cancellationToken);
            SystemCodeResponse sresp = await _commonRepository.GetSystemCodesAsync(["ImageTypeID"], cancellationToken);
            return lsTempImages.Select(ti => new
            {
                ti.TempImageID,
                ti.ModuleID,
                ti.ImageID,
                ti.ImageTypeID,
                ImageTypeDescription = sresp.Details?.FirstOrDefault(d => d.CodeID == nameof(ti.ImageTypeID) && d.SubCodeID == ti.ImageTypeID)?.CodeDescription,
                ti.OurBranchID,
                ti.ClientID,
                ti.AccountID,
                ti.TempClientID,
                ti.Description,
                ti.CopyToClientImage,
                ti.CreatedBy,
                ti.CreatedOn,
                ti.ModifiedBy,
                ti.ModifiedOn,
                ti.FilePath
            }).ToList<object>();
        }
        public async Task<List<TempImage>> GetByClientIdAsync(string clientID, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrEmpty(clientID))
                return [];
            if (string.IsNullOrWhiteSpace(clientID))
                throw new ArgumentException("ClientID cannot be null or empty.", nameof(clientID));
            List<TempImage> tempImage = [];

            //throw new KeyNotFoundException($"No temp images found for TempClientID {clientID}.");

            //var clients = await _documentContext.Clients
            //.Where(i => i.ClientID == clientID)
            //.ToListAsync(cancellationToken);

            var results = await _documentContext.Database.SqlQueryRaw<ProcedureResponse>(
                "EXEC p_V1_GetClientBasicDetails @ClientID = @ClientID, @RequestID = @RequestID",
                new SqlParameter("@ClientID", SqlDbType.VarChar) { Size = 40, Value = string.IsNullOrWhiteSpace(clientID) ? DBNull.Value : clientID },
                new SqlParameter("@RequestID", SqlDbType.VarChar) { Size = 36, Value = string.IsNullOrWhiteSpace(clientID) ? DBNull.Value : clientID }
            ).ToListAsync(cancellationToken);

            var result = results.FirstOrDefault();
            var responseCode = result?.ResponseCode ?? string.Empty;
            var responseMessage = result?.ResponseMessage;
            var detailsJson = result?.Details;

            if (!string.Equals(responseCode, "00", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidDataException(string.Format("Stored procedure reported failure {0}", responseMessage));
            }

            if (string.IsNullOrWhiteSpace(detailsJson))
            {
                throw new InvalidDataException(string.Format("Stored procedure returned success without details {0}", responseMessage));
            }
            JsonDocument client;
            try
            {
                //var documents = JsonSerializer.Deserialize<IEnumerable<ClientDocument>>(detailsJson);
                client = JsonDocument.Parse(detailsJson);

            }
            catch (JsonException jex)
            {
                responseCode = "96";
                responseMessage = jex.Message;
                // Return raw details if the JSON shape does not align with ClientDocument.
                throw new Exception(string.Format("Failed to deserialize details JSON: {0}", detailsJson), jex);
            }

            if (client != null)
            {

                tempImage = await _context.TempImages
               .Where(i => i.ClientID == client!.RootElement.GetProperty("ClientID").GetString())
               .ToListAsync(cancellationToken);
                if (tempImage != null && tempImage!.Any())
                {
                    return tempImage!;
                }
                List<long> imgIds = [];
                if (client!.RootElement.GetProperty("PhotoID").ValueKind != JsonValueKind.Null)
                    imgIds.Add(client!.RootElement.GetProperty("PhotoID").GetInt64());

                if (client!.RootElement.GetProperty("SignID").ValueKind != JsonValueKind.Null)
                    imgIds.Add(client!.RootElement.GetProperty("SignID").GetInt64());

                if (client!.RootElement.GetProperty("BioID").ValueKind != JsonValueKind.Null)
                    imgIds.Add(client!.RootElement.GetProperty("BioID").GetInt64());

                tempImage = await _context.TempImages
               .Where(i => imgIds.Contains(i.TempImageID))
               .ToListAsync(cancellationToken);
                if (tempImage != null && tempImage!.Any())
                {
                    return tempImage!;
                }
            }


            return tempImage!;
        }

        public async Task DeleteByClientIdAsync(string clientID, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(clientID))
                throw new ArgumentException("ClientID cannot be null or empty.", nameof(clientID));

            try
            {
                var entities = await GetByClientIdAsync(clientID, cancellationToken);

                if (entities.Any())
                {
                    _context.TempImages.RemoveRange(entities);
                    await _context.SaveChangesAsync(cancellationToken);
                }
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to delete temp images for ClientID {clientID}.", ex);
            }
        }

        public async Task<List<TempImage>> GetByAccountIdAsync(string accountID, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(accountID))
                throw new ArgumentException("AccountID cannot be null or empty.", nameof(accountID));

            return await _context.TempImages
                .Where(i => i.AccountID == accountID)
                .ToListAsync(cancellationToken);
        }

        public async Task DeleteByAccountIdAsync(string accountID, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(accountID))
                throw new ArgumentException("AccountID cannot be null or empty.", nameof(accountID));

            try
            {
                var entities = await _context.TempImages
                    .Where(i => i.AccountID == accountID)
                    .ToListAsync(cancellationToken);

                if (entities.Any())
                {
                    _context.TempImages.RemoveRange(entities);
                    await _context.SaveChangesAsync(cancellationToken);
                }
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to delete temp images for AccountID {accountID}.", ex);
            }
        }

        public async Task<List<TempImage>> GetByRequestIdAsync(string requestID, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(requestID))
                throw new ArgumentException("RequestID cannot be null or empty.", nameof(requestID));

            return await _context.TempImages
                .Where(i => i.ClientID == requestID)
                .ToListAsync(cancellationToken);
        }
        public async Task<List<object>> GetByRequestIdEnrichedAsync(string requestID, CancellationToken cancellationToken = default)
        {
            List<TempImage>? lsTempImages = await GetByRequestIdAsync(requestID, cancellationToken);
            SystemCodeResponse sresp = await _commonRepository.GetSystemCodesAsync(["ImageTypeID"], cancellationToken);
            return lsTempImages.Select(ti => new
            {
                ti.TempImageID,
                ti.ModuleID,
                ti.ImageID,
                ti.ImageTypeID,
                ImageTypeDescription = sresp.Details?.FirstOrDefault(d => d.CodeID == nameof(ti.ImageTypeID) && d.SubCodeID == ti.ImageTypeID)?.CodeDescription,
                ti.OurBranchID,
                ti.ClientID,
                ti.AccountID,
                ti.TempClientID,
                ti.Description,
                ti.CopyToClientImage,
                ti.CreatedBy,
                ti.CreatedOn,
                ti.ModifiedBy,
                ti.ModifiedOn,
                ti.FilePath
            }).ToList<object>();
        }
        public async Task DeleteByRequestIdAsync(string requestID, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(requestID))
                throw new ArgumentException("RequestID cannot be null or empty.", nameof(requestID));

            try
            {
                var entities = await _context.TempImages
                    .Where(i => i.ClientID == requestID)
                    .ToListAsync(cancellationToken);

                if (entities.Any())
                {
                    _context.TempImages.RemoveRange(entities);
                    await _context.SaveChangesAsync(cancellationToken);
                }
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to delete temp images for RequestID {requestID}.", ex);
            }
        }

        public async Task UpdateClientAndSignatoryImageReferencesAsync(long tempImageID, string imageTypeID,
            string? clientID, string? signatoryID, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(imageTypeID))
                throw new ArgumentException("ImageTypeID cannot be null or empty.", nameof(imageTypeID));

            try
            {
                // Get the temp image to ensure it exists
                var tempImage = await _context.TempImages.FirstOrDefaultAsync(i => i.TempImageID == tempImageID, cancellationToken);
                if (tempImage == null)
                    throw new KeyNotFoundException($"Temp image with ID {tempImageID} not found.");

                // Determine which fields to update based on imageTypeID
                string? fieldToUpdate = imageTypeID.ToUpper() switch
                {
                    "P" => "PhotoID",      // Photo
                    "S" => "SignID",       // Signature
                    "B" => "BioID",       // Biometric
                    _ => null
                };

                if (string.IsNullOrWhiteSpace(fieldToUpdate))
                    return; // No update needed for this imageTypeID

                long imageID = tempImageID;

                // Update t_WFClient table if clientID is provided
                if (!string.IsNullOrWhiteSpace(clientID))
                {
                    var wfClient = await _documentContext.WFClients
                        .FirstOrDefaultAsync(c => c.ClientID == clientID, cancellationToken);
                    if (wfClient == null)
                    {
                        wfClient = await _documentContext.WFClients
                           .FirstOrDefaultAsync(c => c.RequestID == tempImage.ClientID, cancellationToken);
                    }
                    if (wfClient == null)
                        throw new KeyNotFoundException($"Workflow Client with ID {clientID} not found.");

                    if (wfClient != null)
                    {
                        if (fieldToUpdate == "PhotoID")
                            wfClient.PhotoID = imageID;
                        else if (fieldToUpdate == "SignID")
                            wfClient.SignID = imageID;
                        else if (fieldToUpdate == "BioID")
                            wfClient.BioID = imageID;

                        _documentContext.WFClients.Update(wfClient);
                    }
                    //var clients = await _documentContext.Clients
                    //    .FirstOrDefaultAsync(c => c.ClientID == clientID, cancellationToken);
                    //if (clients != null)
                    //{
                    //    if (fieldToUpdate == "PhotoID")
                    //        clients.PhotoID = imageID;
                    //    else if (fieldToUpdate == "SignID")
                    //        clients.SignID = imageID;
                    //    else if (fieldToUpdate == "BioID")
                    //        clients.BioID = imageID;

                    //    _documentContext.Clients.Update(clients);
                    //}
                }

                // Update t_AccountOperatedby table if signatoryID is provided
                if (!string.IsNullOrWhiteSpace(signatoryID))
                {
                    var accountOperated = await _documentContext.AccountOperatedbys
                        .FirstOrDefaultAsync(a => a.SignatoryID == signatoryID, cancellationToken);

                    //if (accountOperated == null)
                    //    throw new KeyNotFoundException($"Signatory with ID {signatoryID} not found.");
                    if (accountOperated != null)
                    {
                        if (fieldToUpdate == "PhotoID")
                            accountOperated.PhotoID = imageID;
                        else if (fieldToUpdate == "SignID")
                            accountOperated.SignID = imageID;
                        _documentContext.AccountOperatedbys.Update(accountOperated);
                    }
                }

                // Save changes to the document context
                await _documentContext.SaveChangesAsync(cancellationToken);
            }
            catch (KeyNotFoundException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to update client and signatory image references for TempImageID {tempImageID}.", ex);
            }
        }
    }
}
