using ClientDocumentApi.Contracts;
using ClientDocumentApi.Models;
using ClientDocumentApi.Services;
using Microsoft.AspNetCore.Mvc;
using ImageModel = ClientDocumentApi.Models.Image;

namespace ClientDocumentApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ImagesController : ControllerBase
    {
        private readonly IImageRepository _imageRepository;
        private readonly ITempImageRepository _tempImageRepository;
        private readonly IImageAccountPreApprovalRepository _imageAccountPreApprovalRepository;
        private readonly IImageAccountRepository _imageAccountRepository;

        public ImagesController(
            IImageRepository imageRepository,
            ITempImageRepository tempImageRepository,
            IImageAccountPreApprovalRepository imageAccountPreApprovalRepository,
            IImageAccountRepository imageAccountRepository)
        {
            _imageRepository = imageRepository;
            _tempImageRepository = tempImageRepository;
            _imageAccountPreApprovalRepository = imageAccountPreApprovalRepository;
            _imageAccountRepository = imageAccountRepository;
        }

        [HttpPost]
        [RequestSizeLimit(50 * 1024 * 1024)]
        public async Task<IActionResult> Upload([FromForm] InData<UploadImageRequest> request, CancellationToken cancellationToken)
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

            try
            {
                var entity = await _imageRepository.SaveAsync(request.RequestData!.File, request.RequestData!.ImageTypeID,
                    request.RequestData!.Description, request.RequestData!.ImageStatusID, request.RequestData!.CreatedBy, request.RequestData!.CreatedOn, cancellationToken);

                return CreatedAtAction(nameof(GetById), new { imageId = entity.ImageID }, new
                {
                    responseCode = "00",
                    responseMessage = "Image uploaded successfully",
                    details = entity
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to upload image", details = ex.Message });
            }
        }

        [HttpGet("{imageId:long}")]
        public async Task<ActionResult<ImageModel>> GetById(long imageId, CancellationToken cancellationToken)
        {
            var entity = await _imageRepository.GetByIdAsync(imageId, cancellationToken);
            if (entity == null)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Image not found",
                    details = new { imageId }
                });
            }

            return Ok(new
            {
                responseCode = "00",
                responseMessage = "Success",
                details = entity
            });
        }

        [HttpGet("{imageId:long}/download")]
        public async Task<IActionResult> Download(long imageId, CancellationToken cancellationToken)
        {
            var imageData = await _imageRepository.GetImageDataAsync(imageId, cancellationToken);

            if (imageData == null)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Image not found",
                    details = new { imageId }
                });
            }

            var (data, mimeType, fileName) = imageData.Value;
            if (data == null)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Image not found",
                    details = new { imageId }
                });
            }

            return File(data, mimeType ?? "application/octet-stream", fileName ?? "download");
        }

        [HttpGet("{imageId:long}/thumbnail")]
        public async Task<IActionResult> GetThumbnail(long imageId, CancellationToken cancellationToken)
        {
            var thumbnail = await _imageRepository.GetThumbnailAsync(imageId, cancellationToken);

            if (thumbnail == null)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Thumbnail not found",
                    details = new { imageId }
                });
            }

            return File(thumbnail, "image/jpeg");
        }

        [HttpDelete("{imageId:long}")]
        public async Task<IActionResult> Delete(long imageId, CancellationToken cancellationToken)
        {
            try
            {
                await _imageRepository.DeleteAsync(imageId, cancellationToken);
                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Image deleted successfully",
                    details = new { imageId }
                });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Image not found",
                    details = new { imageId }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to delete image", details = ex.Message });
            }
        }

        [HttpPut("{imageId:long}")]
        public async Task<IActionResult> Update(long imageId, [FromBody] InData<UpdateImageRequest> request, CancellationToken cancellationToken)
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

            try
            {
                var entity = await _imageRepository.UpdateMetadataAsync(imageId, request.RequestData!.ImageTypeID, request.RequestData!.Description,
                    request.RequestData!.ImageStatusID, request.RequestData!.ClosedBy, request.RequestData!.ClosedDate, request.RequestData!.SupervisedBy,
                    request.RequestData!.SupervisedOn, request.RequestData!.ModifiedBy, cancellationToken);

                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Image metadata updated successfully",
                    details = entity
                });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Image not found",
                    details = new { imageId }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to update image", details = ex.Message });
            }
        }

        [HttpPut("{imageId:long}/replace")]
        [RequestSizeLimit(50 * 1024 * 1024)]
        public async Task<IActionResult> ReplaceImage(long imageId, [FromForm] InData<ReplaceImageRequest> request, CancellationToken cancellationToken)
        {
            if (request.RequestData?.File == null || request.RequestData.File.Length == 0)
            {
                return BadRequest(new
                {
                    responseCode = "96",
                    responseMessage = "File is required",
                    details = new { imageId }
                });
            }

            try
            {
                var entity = await _imageRepository.ReplaceAsync(imageId, request.RequestData.File, request.RequestData.ModifiedBy, cancellationToken);

                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Image replaced successfully",
                    details = entity
                });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Image not found",
                    details = new { imageId }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to replace image", details = ex.Message });
            }
        }

        /// <summary>
        /// Approve images by ClientId - moves from temp tables to permanent tables
        /// </summary>
        [HttpPost("approve-by-client/{clientId}")]
        public async Task<IActionResult> ApproveByClientId(string clientId, [FromBody] InData<ApprovalRequest>? request, CancellationToken cancellationToken)
        {
            try
            {
                var approvedBy = request?.RequestData?.ApprovedBy ?? "System";
                var approvedOn = DateTime.UtcNow;

                // Get temp images for this client
                var tempImages = await _tempImageRepository.GetByClientIdAsync(clientId, cancellationToken);
                
                // Get pre-approval images for this client
                var preApprovalImages = (await _imageAccountPreApprovalRepository.GetByClientIdAsync(clientId, cancellationToken)).ToList();

                if (!tempImages.Any() && !preApprovalImages.Any())
                {
                    return NotFound(new
                    {
                        responseCode = "96",
                        responseMessage = "No images found for approval",
                        details = new { clientId }
                    });
                }

                var movedTempImages = new List<object>();
                var movedPreApprovalImages = new List<object>();

                // Move temp images to t_Image
                foreach (var tempImage in tempImages)
                {
                    if (tempImage.Image != null)
                    {
                        // Create IFormFile from byte array
                        var stream = new MemoryStream(tempImage.Image);
                        var formFile = new FormFile(stream, 0, tempImage.Image.Length, "file", tempImage.Description ?? "image")
                        {
                            Headers = new HeaderDictionary(),
                            ContentType = "application/octet-stream"
                        };

                        var savedImage = await _imageRepository.SaveAsync(
                            formFile,
                            tempImage.ImageTypeID,
                            tempImage.Description,
                            "APPROVED",
                            approvedBy,
                            approvedOn,
                            cancellationToken
                        );

                        movedTempImages.Add(new { tempImage.TempImageID, NewImageID = savedImage.ImageID });

                        // Delete from temp after successful move
                        await _tempImageRepository.DeleteAsync(tempImage.TempImageID, cancellationToken);
                    }
                }

                // Move pre-approval images to t_ImageAccount
                foreach (var preApprovalImage in preApprovalImages)
                {
                    if (preApprovalImage.Image != null)
                    {
                        // Create IFormFile from byte array
                        var stream = new MemoryStream(preApprovalImage.Image);
                        var formFile = new FormFile(stream, 0, preApprovalImage.Image.Length, "file", preApprovalImage.Description ?? "image")
                        {
                            Headers = new HeaderDictionary(),
                            ContentType = "application/octet-stream"
                        };

                        var savedImageAccount = await _imageAccountRepository.SaveAsync(
                            formFile,
                            preApprovalImage.ImageTypeID,
                            preApprovalImage.ClientID,
                            preApprovalImage.Description,
                            approvedBy,
                            approvedOn,
                            approvedBy,
                            approvedOn,
                            preApprovalImage.Digit,
                            preApprovalImage.sImage,
                            false,
                            null,
                            preApprovalImage.OurBranchID,
                            cancellationToken
                        );

                        movedPreApprovalImages.Add(new { preApprovalImage.ImageID, NewImageAccountID = savedImageAccount.ImageID });

                        // Delete from pre-approval after successful move
                        await _imageAccountPreApprovalRepository.DeleteAsync(preApprovalImage.ImageID, cancellationToken);
                    }
                }

                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Images approved and moved successfully",
                    details = new
                    {
                        clientId,
                        approvedBy,
                        approvedOn,
                        movedFromTempImages = movedTempImages.Count,
                        movedFromPreApproval = movedPreApprovalImages.Count,
                        tempImages = movedTempImages,
                        preApprovalImages = movedPreApprovalImages
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to approve images", details = ex.Message });
            }
        }

        /// <summary>
        /// Reject images by ClientId - deletes from temp tables
        /// </summary>
        [HttpPost("reject-by-client/{clientId}")]
        public async Task<IActionResult> RejectByClientId(string clientId, [FromBody] InData<RejectionRequest>? request, CancellationToken cancellationToken)
        {
            try
            {
                var rejectedBy = request?.RequestData?.RejectedBy ?? "System";
                var reason = request?.RequestData?.Reason ?? "Rejected";

                // Get counts before deletion
                var tempImages = await _tempImageRepository.GetByClientIdAsync(clientId, cancellationToken);
                var preApprovalImages = (await _imageAccountPreApprovalRepository.GetByClientIdAsync(clientId, cancellationToken)).ToList();

                if (!tempImages.Any() && !preApprovalImages.Any())
                {
                    return NotFound(new
                    {
                        responseCode = "96",
                        responseMessage = "No images found for rejection",
                        details = new { clientId }
                    });
                }

                var deletedTempCount = tempImages.Count;
                var deletedPreApprovalCount = preApprovalImages.Count;

                // Delete from temp images
                await _tempImageRepository.DeleteByClientIdAsync(clientId, cancellationToken);

                // Delete from pre-approval images
                foreach (var preApprovalImage in preApprovalImages)
                {
                    await _imageAccountPreApprovalRepository.DeleteAsync(preApprovalImage.ImageID, cancellationToken);
                }

                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Images rejected and deleted successfully",
                    details = new
                    {
                        clientId,
                        rejectedBy,
                        reason,
                        deletedFromTempImages = deletedTempCount,
                        deletedFromPreApproval = deletedPreApprovalCount
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to reject images", details = ex.Message });
            }
        }

        /// <summary>
        /// Approve specific images by IDs - moves from temp tables to permanent tables
        /// </summary>
        [HttpPost("approve-by-ids")]
        public async Task<IActionResult> ApproveByIds([FromBody] InData<ApprovalByIdsRequest> request, CancellationToken cancellationToken)
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

            try
            {
                var approvedBy = request.RequestData!.ApprovedBy ?? "System";
                var approvedOn = DateTime.UtcNow;
                var movedTempImages = new List<object>();
                var movedPreApprovalImages = new List<object>();

                // Process temp image IDs
                if (request.RequestData.TempImageIds != null && request.RequestData.TempImageIds.Any())
                {
                    foreach (var tempImageId in request.RequestData.TempImageIds)
                    {
                        var tempImage = await _tempImageRepository.GetByIdAsync(tempImageId, cancellationToken);
                        if (tempImage != null && tempImage.Image != null)
                        {
                            // Create IFormFile from byte array
                            var stream = new MemoryStream(tempImage.Image);
                            var formFile = new FormFile(stream, 0, tempImage.Image.Length, "file", tempImage.Description ?? "image")
                            {
                                Headers = new HeaderDictionary(),
                                ContentType = "application/octet-stream"
                            };

                            var savedImage = await _imageRepository.SaveAsync(
                                formFile,
                                tempImage.ImageTypeID,
                                tempImage.Description,
                                "APPROVED",
                                approvedBy,
                                approvedOn,
                                cancellationToken
                            );

                            movedTempImages.Add(new { tempImage.TempImageID, NewImageID = savedImage.ImageID });

                            // Delete from temp after successful move
                            await _tempImageRepository.DeleteAsync(tempImage.TempImageID, cancellationToken);
                        }
                    }
                }

                // Process pre-approval image IDs
                if (request.RequestData.PreApprovalImageIds != null && request.RequestData.PreApprovalImageIds.Any())
                {
                    var preApprovalImages = await _imageAccountPreApprovalRepository.GetByImageIdsAsync(
                        request.RequestData.PreApprovalImageIds.ToList(), cancellationToken);

                    foreach (var preApprovalImage in preApprovalImages)
                    {
                        if (preApprovalImage.Image != null)
                        {
                            // Create IFormFile from byte array
                            var stream = new MemoryStream(preApprovalImage.Image);
                            var formFile = new FormFile(stream, 0, preApprovalImage.Image.Length, "file", preApprovalImage.Description ?? "image")
                            {
                                Headers = new HeaderDictionary(),
                                ContentType = "application/octet-stream"
                            };

                            var savedImageAccount = await _imageAccountRepository.SaveAsync(
                                formFile,
                                preApprovalImage.ImageTypeID,
                                preApprovalImage.ClientID,
                                preApprovalImage.Description,
                                approvedBy,
                                approvedOn,
                                approvedBy,
                                approvedOn,
                                preApprovalImage.Digit,
                                preApprovalImage.sImage,
                                false,
                                null,
                                preApprovalImage.OurBranchID,
                                cancellationToken
                            );

                            movedPreApprovalImages.Add(new { preApprovalImage.ImageID, NewImageAccountID = savedImageAccount.ImageID });

                            // Delete from pre-approval after successful move
                            await _imageAccountPreApprovalRepository.DeleteAsync(preApprovalImage.ImageID, cancellationToken);
                        }
                    }
                }

                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Images approved and moved successfully",
                    details = new
                    {
                        approvedBy,
                        approvedOn,
                        movedFromTempImages = movedTempImages.Count,
                        movedFromPreApproval = movedPreApprovalImages.Count,
                        tempImages = movedTempImages,
                        preApprovalImages = movedPreApprovalImages
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to approve images", details = ex.Message });
            }
        }

        /// <summary>
        /// Reject specific images by IDs - deletes from temp tables
        /// </summary>
        [HttpPost("reject-by-ids")]
        public async Task<IActionResult> RejectByIds([FromBody] InData<RejectionByIdsRequest> request, CancellationToken cancellationToken)
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

            try
            {
                var rejectedBy = request.RequestData!.RejectedBy ?? "System";
                var reason = request.RequestData.Reason ?? "Rejected";
                var deletedTempCount = 0;
                var deletedPreApprovalCount = 0;

                // Process temp image IDs
                if (request.RequestData.TempImageIds != null && request.RequestData.TempImageIds.Any())
                {
                    foreach (var tempImageId in request.RequestData.TempImageIds)
                    {
                        try
                        {
                            await _tempImageRepository.DeleteAsync(tempImageId, cancellationToken);
                            deletedTempCount++;
                        }
                        catch (KeyNotFoundException)
                        {
                            // Image not found, continue
                        }
                    }
                }

                // Process pre-approval image IDs
                if (request.RequestData.PreApprovalImageIds != null && request.RequestData.PreApprovalImageIds.Any())
                {
                    foreach (var imageId in request.RequestData.PreApprovalImageIds)
                    {
                        try
                        {
                            await _imageAccountPreApprovalRepository.DeleteAsync(imageId, cancellationToken);
                            deletedPreApprovalCount++;
                        }
                        catch (KeyNotFoundException)
                        {
                            // Image not found, continue
                        }
                    }
                }

                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Images rejected and deleted successfully",
                    details = new
                    {
                        rejectedBy,
                        reason,
                        deletedFromTempImages = deletedTempCount,
                        deletedFromPreApproval = deletedPreApprovalCount
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to reject images", details = ex.Message });
            }
        }
    }
}
