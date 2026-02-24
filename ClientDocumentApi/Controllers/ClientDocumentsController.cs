using ClientDocumentApi.Contracts;
using ClientDocumentApi.Data;
using ClientDocumentApi.Models;
using ClientDocumentApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Data;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using static System.Net.Mime.MediaTypeNames;
using ImageModel = ClientDocumentApi.Models.Image;

namespace ClientDocumentApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ClientDocumentsController : ControllerBase
    {
        private readonly DocumentDbContext _context;
        private readonly IFileStorageService _fileStorage;
        private readonly IImageRepository _imageRepository;

        private sealed record ProcedureResponse(string ResponseCode, string? ResponseMessage, string? Details);

        public ClientDocumentsController(DocumentDbContext context, IFileStorageService fileStorage, IImageRepository imageRepository)
        {
            _context = context;
            _fileStorage = fileStorage;
            _imageRepository = imageRepository;
        }

        [HttpPost]
        [RequestSizeLimit(50 * 1024 * 1024)]
        public Task<IActionResult> Upload([FromForm] InData<UploadClientDocumentRequest> request, CancellationToken cancellationToken)
        {
            return UploadWithImageInternalAsync(request.RequestData!, cancellationToken);
        }

        private async Task<IActionResult> UploadWithImageInternalAsync(UploadClientDocumentRequest request, CancellationToken cancellationToken)
        {
            string? filePath = string.Empty;
            bool succeeded = false;
            long imageID = 0;
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    responseCode = "96",
                    responseMessage = "Validation failed",
                    details = ModelState
                });
            }
            if (string.IsNullOrEmpty(request.ClientID) && string.IsNullOrEmpty(request.RequestID))
            {
                return StatusCode(500, new
                {
                    error = "Client id or Request Id should not be empty",
                    responseCode = "96",
                    responseMessage = "Client id or Request Id should not be empty",
                    details = default(string)
                });
            }
            request.ClientID = request.ClientID ?? request.RequestID;
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                try
                {
                    var imageEntity = await _imageRepository.SaveAsync(
                        request.File,
                        "D",
                        request.Remarks,
                        "NEW",
                        request.CreatedBy,
                        request.CreatedOn,
                        cancellationToken);

                    imageID = imageEntity.ImageID;
                    filePath = imageEntity.FilePath;
                    //filePath = await _fileStorage.SaveAsync(request.File, cancellationToken);

                    // Call stored procedure to create client document (returns result set with ResponseCode/ResponseMessage/Details)
                    var resultList = await _context.Database.SqlQueryRaw<ProcedureResponse>(
                        "EXEC p_V1_CreateClientDocuments " +
                        "@RequestID = @RequestID, @ClientID = @ClientID, @DocumentID = @DocumentID, @DocumentTypeID = @DocumentTypeID, " +
                        "@ReceivedBy = @ReceivedBy, @ReceivedDate = @ReceivedDate, @LocationID = @LocationID, @MimeType = @MimeType, @Description = @Description, " +
                        "@ImageID = @ImageID, @sImage = @sImage, @Remarks = @Remarks, @CreatedOn = @CreatedOn, @CreatedBy = @CreatedBy, " +
                        "@ModifiedBy = @ModifiedBy, @ModifiedOn = @ModifiedOn, @UpdateCount = @UpdateCount, @FilePath = @FilePath",
                        new SqlParameter("@RequestID", SqlDbType.VarChar) { Size = 500, Value = (object?)request.RequestID ?? DBNull.Value },
                        new SqlParameter("@ClientID", SqlDbType.VarChar) { Size = 40, Value = (object?)request.ClientID ?? DBNull.Value },
                        new SqlParameter("@DocumentID", SqlDbType.VarChar) { Size = 50, Value = (object?)request.DocumentID ?? DBNull.Value },
                        new SqlParameter("@DocumentTypeID", SqlDbType.VarChar) { Size = 50, Value = (object?)request.DocumentTypeID ?? DBNull.Value },
                        new SqlParameter("@ReceivedBy", SqlDbType.VarChar) { Size = 25, Value = (object?)request.ReceivedBy ?? DBNull.Value },
                        new SqlParameter("@ReceivedDate", SqlDbType.DateTime) { Value = (object?)request.ReceivedDate ?? DBNull.Value },
                        new SqlParameter("@LocationID", SqlDbType.VarChar) { Size = 50, Value = (object?)request.LocationID ?? DBNull.Value },
                        new SqlParameter("@MimeType", SqlDbType.VarChar) { Size = 500, Value = (object?)request.File?.ContentType ?? DBNull.Value },
                        new SqlParameter("@Description", SqlDbType.VarChar) { Size = 500, Value = (object?)request.Remarks ?? DBNull.Value },
                        new SqlParameter("@ImageID", SqlDbType.BigInt) { Value = imageID },
                        new SqlParameter("@sImage", SqlDbType.NVarChar) { Value = (object?)imageEntity.sImage ?? DBNull.Value },
                        new SqlParameter("@Remarks", SqlDbType.VarChar) { Size = 500, Value = (object?)request.Remarks ?? DBNull.Value },
                        new SqlParameter("@CreatedOn", SqlDbType.DateTime) { Value = request.CreatedOn ?? DateTime.UtcNow },
                        new SqlParameter("@CreatedBy", SqlDbType.VarChar) { Size = 25, Value = (object?)request.CreatedBy ?? DBNull.Value },
                        new SqlParameter("@ModifiedBy", SqlDbType.VarChar) { Size = 25, Value = (object?)request.ModifiedBy ?? DBNull.Value },
                        new SqlParameter("@ModifiedOn", SqlDbType.DateTime) { Value = (object?)request.ModifiedOn ?? DBNull.Value },
                        new SqlParameter("@UpdateCount", SqlDbType.TinyInt) { Value = (byte)(request.UpdateCount ?? 0) },
                        new SqlParameter("@FilePath", SqlDbType.VarChar) { Size = 1000, Value = filePath ?? string.Empty }
                    ).ToListAsync(cancellationToken);

                    var result = resultList.FirstOrDefault();

                    var responseCode = result?.ResponseCode ?? string.Empty;
                    var responseMessage = result?.ResponseMessage;
                    var details = result?.Details;

                    if (!string.Equals(responseCode, "00", StringComparison.OrdinalIgnoreCase))
                    {
                        if (imageID != 0)
                        {
                            await _imageRepository.DeleteAsync(imageID, cancellationToken);
                            await Delete(imageID, cancellationToken);
                        }
                        return StatusCode(500, new
                        {
                            error = "Stored procedure reported failure",
                            responseCode,
                            responseMessage,
                            details
                        });
                    }
                    JsonObject jDetails = JsonObject.Parse(details!)!.AsObject();
                    jDetails.Add("documentID", request.DocumentID);
                    jDetails.Add("imageID", imageID);
                    jDetails.Add("filePath", filePath);
                    jDetails.Add("fileName", request.File!.FileName);
                    succeeded = true;
                    return Ok(new
                    {
                        //documentID = request.DocumentID,
                        //imageID = imageID,
                        //filePath = filePath,
                        //fileName = request.File!.FileName,
                        responseCode,
                        responseMessage,
                        details
                    });
                }
                catch (Exception ex)
                {
                    try
                    {
                        // Procedure handles its own transaction; nothing to rollback here
                    }
                    catch
                    {
                    }
                    if (imageID != 0)
                    {
                        await _imageRepository.DeleteAsync(imageID, cancellationToken);
                        await Delete(imageID, cancellationToken);
                    }
                    return StatusCode(500, new { error = "Failed to upload document with image", details = ex.Message });
                }
                finally
                {
                    if (!succeeded && !string.IsNullOrEmpty(filePath) && System.IO.File.Exists(filePath))
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
            });
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ClientDocument>> GetById(int id, CancellationToken cancellationToken)
        {
            var entity = await _context.ClientDocuments.FirstOrDefaultAsync(d => d.RowID == id, cancellationToken);
            if (entity == null)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Document not found",
                    details = new { id }
                });
            }

            return Ok(new
            {
                responseCode = "00",
                responseMessage = "Success",
                details = entity
            });
        }

        [HttpGet("client/{clientId?}")]
        public async Task<IActionResult> GetByClient(string? clientId, [FromQuery] string? requestId, CancellationToken cancellationToken)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                var results = await _context.Database.SqlQueryRaw<ProcedureResponse>(
                    "EXEC p_v1_GetClientDocuments @ClientID = @ClientID, @RequestID = @RequestID",
                    new SqlParameter("@ClientID", SqlDbType.VarChar) { Size = 40, Value = string.IsNullOrWhiteSpace(clientId) ? DBNull.Value : clientId },
                    new SqlParameter("@RequestID", SqlDbType.VarChar) { Size = 36, Value = (object?)requestId ?? DBNull.Value }
                ).ToListAsync(cancellationToken);

                var result = results.FirstOrDefault();
                var responseCode = result?.ResponseCode ?? string.Empty;
                var responseMessage = result?.ResponseMessage;
                var detailsJson = result?.Details;

                if (!string.Equals(responseCode, "00", StringComparison.OrdinalIgnoreCase))
                {
                    return StatusCode(500, new
                    {
                        error = "Stored procedure reported failure",
                        responseCode,
                        responseMessage,
                        details = detailsJson
                    });
                }

                if (string.IsNullOrWhiteSpace(detailsJson))
                {
                    return StatusCode(500, new
                    {
                        error = "Stored procedure returned success without details",
                        responseCode,
                        responseMessage,
                        details = detailsJson
                    });
                }

                try
                {
                    //var documents = JsonSerializer.Deserialize<IEnumerable<ClientDocument>>(detailsJson);
                    var documents = JsonArray.Parse(detailsJson);
                    return Ok(new
                    {
                        responseCode,
                        responseMessage,
                        details = documents
                    });
                }
                catch (JsonException jex)
                {
                    responseCode = "96";
                    responseMessage = jex.Message;
                    // Return raw details if the JSON shape does not align with ClientDocument.
                    return Ok(new
                    {
                        responseCode,
                        responseMessage,
                        details = detailsJson
                    });
                }
            });
        }

        [HttpGet("client/{clientId}/document/{documentId}")]
        public async Task<IActionResult> GetByClientAndDocument(string clientId, string documentId, [FromQuery] string? requestId, CancellationToken cancellationToken)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                var results = await _context.Database.SqlQueryRaw<ProcedureResponse>(
                    "EXEC p_v1_GetClientDocuments @RequestID = @RequestID, @ClientID = @ClientID, @DocumentID = @DocumentID",
                    new SqlParameter("@RequestID", SqlDbType.VarChar) { Size = 100, Value = (object?)requestId ?? DBNull.Value },
                    new SqlParameter("@ClientID", SqlDbType.VarChar) { Size = 40, Value = string.IsNullOrWhiteSpace(clientId) ? DBNull.Value : clientId },
                    new SqlParameter("@DocumentID", SqlDbType.VarChar) { Size = 40, Value = string.IsNullOrWhiteSpace(documentId) ? DBNull.Value : documentId }
                ).ToListAsync(cancellationToken);

                var result = results.FirstOrDefault();
                var responseCode = result?.ResponseCode ?? string.Empty;
                var responseMessage = result?.ResponseMessage;
                var detailsJson = result?.Details;

                if (!string.Equals(responseCode, "00", StringComparison.OrdinalIgnoreCase))
                {
                    return StatusCode(500, new
                    {
                        error = "Stored procedure reported failure",
                        responseCode,
                        responseMessage,
                        details = detailsJson
                    });
                }

                if (string.IsNullOrWhiteSpace(detailsJson))
                {
                    return StatusCode(500, new
                    {
                        error = "Stored procedure returned success without details",
                        responseCode,
                        responseMessage,
                        details = detailsJson
                    });
                }

                try
                {
                    var documents = JsonArray.Parse(detailsJson);
                    return Ok(new
                    {
                        responseCode,
                        responseMessage,
                        details = documents
                    });
                }
                catch (JsonException jex)
                {
                    responseCode = "96";
                    responseMessage = jex.Message;
                    // Return raw details if the JSON shape does not align with ClientDocument.
                    return Ok(new
                    {
                        responseCode,
                        responseMessage,
                        details = detailsJson
                    });
                }
            });
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(long id, [FromBody] InData<UpdateClientDocumentRequest> request, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    responseCode = "96",
                    responseMessage = "Validation failed",
                    details = ModelState
                });
            }

            var entity = await _context.ClientDocuments.FirstOrDefaultAsync(d => d.RowID == id, cancellationToken);
            if (entity == null)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Document not found",
                    details = new { id }
                });
            }

            //// Update only provided fields
            //if (request.ClientID != null)
            //    entity.ClientID = request.ClientID;

            if (request.RequestData!.DocumentID != null)
                entity.DocumentID = request.RequestData!.DocumentID;

            if (request.RequestData!.DocumentTypeID != null)
                entity.DocumentTypeID = request.RequestData!.DocumentTypeID;

            if (request.RequestData!.ReceivedBy != null)
                entity.ReceivedBy = request.RequestData.ReceivedBy;

            if (request.RequestData.ReceivedDate.HasValue)
                entity.ReceivedDate = request.RequestData.ReceivedDate;

            if (!string.IsNullOrEmpty(request.RequestData.LocationID))
                entity.LocationID = request.RequestData.LocationID;

            if (request.RequestData!.Remarks != null)
                entity.Remarks = request.RequestData!.Remarks;

            if (request.RequestData!.DocumentReferenceNo != null)
                entity.DocumentReferenceNo = request.RequestData!.DocumentReferenceNo;

            if (request.RequestData!.DocumentDate.HasValue)
                entity.DocumentDate = request.RequestData!.DocumentDate;

            if (request.RequestData!.SendingBank != null)
                entity.SendingBank = request.RequestData!.SendingBank;

            //if (request.RequestID != null)
            //    entity.RequestID = request.RequestID;

            // Always update ModifiedBy and ModifiedOn
            entity.ModifiedBy = request.RequestData!.ModifiedBy;
            entity.ModifiedOn = DateTime.UtcNow;
            var nextUpdateCount = Math.Min(byte.MaxValue, (entity.UpdateCount ?? 0) + 1);
            entity.UpdateCount = (byte)nextUpdateCount;

            try
            {
                await _context.SaveChangesAsync(cancellationToken);
                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Document updated successfully",
                    details = entity
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    responseCode = "99",
                    responseMessage = "Failed to update document",
                    details = ex.Message
                });
            }
        }

        [HttpPut("{id:int}/replace-file")]
        [RequestSizeLimit(50 * 1024 * 1024)]
        public async Task<IActionResult> ReplaceFile(long id, [FromForm] IFormFile file, [FromForm] string? modifiedBy, CancellationToken cancellationToken)
        {
            string oldFilePath = string.Empty;
            string newFilePath = string.Empty;
            bool succeeded = false;

            if (file == null || file.Length == 0)
            {
                return BadRequest(new
                {
                    responseCode = "96",
                    responseMessage = "File is required",
                    details = new { id }
                });
            }

            var entity = await _context.ClientDocuments.FirstOrDefaultAsync(d => d.RowID == id, cancellationToken);
            if (entity == null)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Document not found",
                    details = new { id }
                });
            }

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

                try
                {
                    oldFilePath = entity.FilePath;

                    newFilePath = await _fileStorage.SaveAsync(file, cancellationToken);

                    string? base64Content = null;
                    using (var memoryStream = new MemoryStream())
                    {
                        await file.CopyToAsync(memoryStream, cancellationToken);
                        base64Content = Convert.ToBase64String(memoryStream.ToArray());
                    }

                    entity.FilePath = newFilePath;
                    entity.sImage = base64Content;
                    entity.ModifiedBy = modifiedBy;
                    entity.ModifiedOn = DateTime.UtcNow;
                    var nextUpdateCount = Math.Min(byte.MaxValue, (entity.UpdateCount ?? 0) + 1);
                    entity.UpdateCount = (byte)nextUpdateCount;

                    await _context.SaveChangesAsync(cancellationToken);

                    if (entity.ImageID.HasValue)
                    {
                        await _imageRepository.ReplaceAsync(entity.ImageID.Value, file, modifiedBy, cancellationToken);
                    }

                    await transaction.CommitAsync(cancellationToken);

                    succeeded = true;

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
                            }
                        }
                    }

                    return Ok(new
                    {
                        responseCode = "00",
                        responseMessage = "File replaced successfully",
                        details = entity
                    });
                }
                catch (Exception ex)
                {
                    try
                    {
                        await transaction.RollbackAsync(cancellationToken);
                    }
                    catch
                    {
                    }

                    return StatusCode(500, new
                    {
                        responseCode = "99",
                        responseMessage = "Failed to replace file",
                        details = ex.Message
                    });
                }
                finally
                {
                    if (!succeeded && !string.IsNullOrEmpty(newFilePath) && System.IO.File.Exists(newFilePath))
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
            });
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
        {
            var entity = await _context.ClientDocuments.FirstOrDefaultAsync(d => d.ImageID == id, cancellationToken);
            if (entity == null)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Document not found",
                    details = new { id }
                });
            }

            var filePath = entity.FilePath;

            var strategy = _context.Database.CreateExecutionStrategy();
            IActionResult result = NoContent();

            await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

                try
                {
                    _context.ClientDocuments.Remove(entity);

                    if (entity.ImageID.HasValue)
                    {
                        await _imageRepository.DeleteAsync(entity.ImageID.Value, cancellationToken);
                    }
                    else
                    {
                        await _context.SaveChangesAsync(cancellationToken);
                    }

                    await transaction.CommitAsync(cancellationToken);

                    // Delete associated file stored for the client document
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

                    result = NoContent();
                }
                catch (Exception ex)
                {
                    result = StatusCode(500, new { error = "Failed to delete document", details = ex.Message });
                }
            });

            return result;
        }
    }
}
