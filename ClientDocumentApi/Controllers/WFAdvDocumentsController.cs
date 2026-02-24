using ClientDocumentApi.Contracts;
using ClientDocumentApi.Data;
using ClientDocumentApi.Models;
using ClientDocumentApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using static System.Net.Mime.MediaTypeNames;

namespace ClientDocumentApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WFAdvDocumentsController : ControllerBase
    {
        private readonly DocumentDbContext _context;
        private readonly IFileStorageService _fileStorage;
        private readonly IImageRepository _imageRepository;

        public WFAdvDocumentsController(DocumentDbContext context, IFileStorageService fileStorage, IImageRepository imageRepository)
        {
            _context = context;
            _fileStorage = fileStorage;
            _imageRepository = imageRepository;
        }

        [HttpPost]
        [RequestSizeLimit(50 * 1024 * 1024)]
        public async Task<IActionResult> Upload([FromForm] InData<UploadWFAdvDocumentRequest> request, CancellationToken cancellationToken)
        {
            string filePath = string.Empty;
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

            if (string.IsNullOrWhiteSpace(request.RequestData!.OurBranchID) || string.IsNullOrWhiteSpace(request.RequestData!.ApplicationID))
            {
                return BadRequest(new
                {
                    responseCode = "96",
                    responseMessage = "OurBranchID and ApplicationID are required",
                    details = new { request.RequestData!.OurBranchID, request.RequestData!.ApplicationID }
                });
            }

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

                try
                {
                    var existing = await _context.WFAdvDocuments.FindAsync(
                        new object?[] { request.RequestData!.OurBranchID, request.RequestData!.ApplicationID, request.RequestData!.DocumentID },
                        cancellationToken);

                    if (existing != null)
                    {
                        return Conflict(new
                        {
                            responseCode = "96",
                            responseMessage = "WF Advance document already exists for this key",
                            details = new { request.RequestData!.OurBranchID, request.RequestData!.ApplicationID, request.RequestData!.DocumentID }
                        });
                    }

                    var imageEntity = await _imageRepository.SaveAsync(
                        request.RequestData!.File,
                        "D",
                        request.RequestData!.Remarks,
                        "NEW",
                        request.RequestData!.CreatedBy,
                        request.RequestData!.CreatedOn,
                        cancellationToken);

                    imageID = imageEntity.ImageID;
                    filePath = await _fileStorage.SaveAsync(request.RequestData!.File, cancellationToken);

                    var entity = new WFAdvDocument
                    {
                        OurBranchID = request.RequestData!.OurBranchID,
                        ApplicationID = request.RequestData!.ApplicationID,
                        DocumentID = request.RequestData!.DocumentID,
                        DocumentTypeID = request.RequestData!.DocumentTypeID ?? "C",
                        ImageID = imageID,
                        MimeType = request.RequestData!.File.ContentType,
                        ReceivedBy = request.RequestData!.ReceivedBy,
                        ReceivedDate = request.RequestData!.ReceivedDate ?? DateTime.UtcNow,
                        LocationID = request.RequestData!.LocationID,
                        Remarks = request.RequestData!.Remarks,
                        CreatedBy = request.RequestData!.CreatedBy,
                        CreatedOn = request.RequestData!.CreatedOn ?? DateTime.UtcNow,
                        UpdateCount = (byte)0,
                        FilePath = filePath
                    };

                    _context.WFAdvDocuments.Add(entity);
                    await _context.SaveChangesAsync(cancellationToken);

                    await transaction.CommitAsync(cancellationToken);

                    succeeded = true;
                    return CreatedAtAction(
                        nameof(GetByKey),
                        new
                        {
                            branchId = entity.OurBranchID,
                            applicationId = entity.ApplicationID,
                            documentId = entity.DocumentID
                        },
                        new
                        {
                            responseCode = "00",
                            responseMessage = "WF Advance document created successfully",
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
                    if (imageID != 0)
                    {
                        await _imageRepository.DeleteAsync(imageID, cancellationToken);
                        //await Delete(imageID, cancellationToken);
                    }

                    return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to upload WF Advance document", details = ex.Message });
                }
                finally
                {
                    // Cleanup file if operation failed
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

        [HttpGet("{branchId}/{applicationId}/{documentId}")]
        public async Task<ActionResult<WFAdvDocument>> GetByKey(string branchId, string applicationId, string documentId, CancellationToken cancellationToken)
        {
            var entity = await _context.WFAdvDocuments.FindAsync(new object?[] { branchId, applicationId, documentId }, cancellationToken);
            if (entity == null)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "WF Advance document not found",
                    details = new { branchId, applicationId, documentId }
                });
            }

            return Ok(new
            {
                responseCode = "00",
                responseMessage = "Success",
                details = entity
            });
        }

        [HttpGet("application/{applicationId}")]
        public async Task<ActionResult<IEnumerable<WFAdvDocument>>> GetByApplication(string applicationId, CancellationToken cancellationToken)
        {
            var items = await _context.WFAdvDocuments
                .Where(d => d.ApplicationID == applicationId)
                .OrderByDescending(d => d.ReceivedDate ?? d.CreatedOn)
                .ToListAsync(cancellationToken);

            return Ok(new
            {
                responseCode = "00",
                responseMessage = "Success",
                details = items
            });
        }

        [HttpGet("branch/{branchId}")]
        public async Task<ActionResult<IEnumerable<WFAdvDocument>>> GetByBranch(string branchId, CancellationToken cancellationToken)
        {
            var items = await _context.WFAdvDocuments
                .Where(d => d.OurBranchID == branchId)
                .OrderByDescending(d => d.ReceivedDate ?? d.CreatedOn)
                .ToListAsync(cancellationToken);

            return Ok(new
            {
                responseCode = "00",
                responseMessage = "Success",
                details = items
            });
        }

        [HttpPut("{branchId}/{applicationId}/{documentId}")]
        public async Task<IActionResult> Update(string branchId, string applicationId, string documentId, [FromBody] InData<UpdateWFAdvDocumentRequest> request, CancellationToken cancellationToken)
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

            var entity = await _context.WFAdvDocuments.FindAsync(new object?[] { branchId, applicationId, documentId }, cancellationToken);
            if (entity == null)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "WF Advance document not found",
                    details = new { branchId, applicationId, documentId }
                });
            }

            if (!string.IsNullOrEmpty(request.RequestData!.OurBranchID) && request.RequestData!.OurBranchID != branchId)
            {
                return BadRequest(new
                {
                    responseCode = "96",
                    responseMessage = "OurBranchID is part of the key and cannot be changed",
                    details = new { branchId, applicationId, documentId }
                });
            }

            if (!string.IsNullOrEmpty(request.RequestData!.ApplicationID) && request.RequestData!.ApplicationID != applicationId)
            {
                return BadRequest(new
                {
                    responseCode = "96",
                    responseMessage = "ApplicationID is part of the key and cannot be changed",
                    details = new { branchId, applicationId, documentId }
                });
            }

            if (!string.IsNullOrEmpty(request.RequestData!.DocumentID) && request.RequestData!.DocumentID != documentId)
            {
                return BadRequest(new
                {
                    responseCode = "96",
                    responseMessage = "DocumentID is part of the key and cannot be changed",
                    details = new { branchId, applicationId, documentId }
                });
            }

            if (request.RequestData!.DocumentTypeID != null)
                entity.DocumentTypeID = request.RequestData!.DocumentTypeID;

            if (request.RequestData!.ReceivedBy != null)
                entity.ReceivedBy = request.RequestData!.ReceivedBy;

            if (request.RequestData!.ReceivedDate.HasValue)
                entity.ReceivedDate = request.RequestData!.ReceivedDate;

            if (request.RequestData!.LocationID != null)
                entity.LocationID = request.RequestData!.LocationID;

            if (request.RequestData!.Remarks != null)
                entity.Remarks = request.RequestData!.Remarks;

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
                    responseMessage = "WF Advance document updated successfully",
                    details = entity
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to update WF Advance document", details = ex.Message });
            }
        }

        [HttpPut("{branchId}/{applicationId}/{documentId}/replace-file")]
        [RequestSizeLimit(50 * 1024 * 1024)]
        public async Task<IActionResult> ReplaceFile(string branchId, string applicationId, string documentId, [FromForm] IFormFile file, [FromForm] string? modifiedBy, CancellationToken cancellationToken)
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
                    details = new { branchId, applicationId, documentId }
                });
            }

            var entity = await _context.WFAdvDocuments.FindAsync(new object?[] { branchId, applicationId, documentId }, cancellationToken);
            if (entity == null)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "WF Advance document not found",
                    details = new { branchId, applicationId, documentId }
                });
            }

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

                try
                {
                    oldFilePath = entity.FilePath ?? string.Empty;

                    // Save new file
                    newFilePath = await _fileStorage.SaveAsync(file, cancellationToken);

                    // Update entity
                    entity.FilePath = newFilePath;
                    entity.MimeType = file.ContentType;
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

                    return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to replace file", details = ex.Message });
                }
                finally
                {
                    // Cleanup new file if operation failed
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

        [HttpDelete("{branchId}/{applicationId}/{documentId}")]
        public async Task<IActionResult> Delete(string branchId, string applicationId, string documentId, CancellationToken cancellationToken)
        {
            var entity = await _context.WFAdvDocuments.FindAsync(new object?[] { branchId, applicationId, documentId }, cancellationToken);
            if (entity == null)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "WF Advance document not found",
                    details = new { branchId, applicationId, documentId }
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
                    _context.WFAdvDocuments.Remove(entity);

                    if (entity.ImageID.HasValue)
                    {
                        await _imageRepository.DeleteAsync(entity.ImageID.Value, cancellationToken);
                    }
                    else
                    {
                        await _context.SaveChangesAsync(cancellationToken);
                    }

                    await transaction.CommitAsync(cancellationToken);

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

                    result = Ok(new
                    {
                        responseCode = "00",
                        responseMessage = "WF Advance document deleted successfully",
                        details = new { branchId, applicationId, documentId }
                    });
                }
                catch (Exception ex)
                {
                    result = StatusCode(500, new { responseCode = "99", responseMessage = "Failed to delete WF Advance document", details = ex.Message });
                }
            });

            return result;
        }
    }
}
