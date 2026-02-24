using ClientDocumentApi.Contracts;
using ClientDocumentApi.Models;
using ClientDocumentApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace ClientDocumentApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ImageAccountsController : ControllerBase
    {
        private readonly IImageAccountRepository _repository;
        private readonly IImageAccountPreApprovalRepository _preApprovalRepository;

        public ImageAccountsController(IImageAccountRepository repository, IImageAccountPreApprovalRepository preApprovalRepository)
        {
            _repository = repository;
            _preApprovalRepository = preApprovalRepository;
        }

        [HttpPost]
        [RequestSizeLimit(50 * 1024 * 1024)]
        public async Task<IActionResult> Upload([FromForm] InData<UploadImageAccountRequest> request, CancellationToken cancellationToken)
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
                var entity = await _repository.SaveAsync(
                    request.RequestData!.File,
                    request.RequestData.ImageTypeID,
                    request.RequestData.ClientID,
                    request.RequestData.Description,
                    request.RequestData.CreatedBy,
                    request.RequestData.CreatedOn,
                    request.RequestData.SupervisedBy,
                    request.RequestData.SupervisedOn,
                    request.RequestData.Digit,
                    request.RequestData.sImage,
                    request.RequestData.BioStatus,
                    request.RequestData.LegacyImageID,
                    request.RequestData.OurBranchIDMig,
                    cancellationToken);

                return CreatedAtAction(nameof(GetById), new { imageId = entity.ImageID }, new
                {
                    responseCode = "00",
                    responseMessage = "Image Account uploaded successfully",
                    details = entity
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to upload image account", details = ex.Message });
            }
        }

        [HttpGet("{imageId:long}")]
        public async Task<ActionResult<ImageAccount>> GetById(long imageId, CancellationToken cancellationToken)
        {
            var entity = await _repository.GetByIdAsync(imageId, cancellationToken);
            if (entity == null)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Image Account not found",
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

        [HttpGet("client/{clientId}")]
        public async Task<IActionResult> GetByClientId(string clientId, CancellationToken cancellationToken)
        {
            try
            {
                var entities = await _repository.GetByClientIdAsync(clientId, cancellationToken);
                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Success",
                    details = entities
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to retrieve image accounts", details = ex.Message });
            }
        }

        [HttpPost("by-ids")]
        public async Task<IActionResult> GetByImageIds([FromBody] List<long> imageIds, CancellationToken cancellationToken)
        {
            if (imageIds == null || imageIds.Count == 0)
            {
                return BadRequest(new
                {
                    responseCode = "96",
                    responseMessage = "ImageIds list cannot be empty",
                    details = new List<CombinedImageAccountResponse>()
                });
            }

            try
            {
                var imageAccountsTask = _repository.GetByImageIdsAsync(imageIds, cancellationToken);
                var preApprovalAccountsTask = _preApprovalRepository.GetByImageIdsAsync(imageIds, cancellationToken);

                await Task.WhenAll(imageAccountsTask, preApprovalAccountsTask);

                var imageAccounts = await imageAccountsTask;
                var preApprovalAccounts = await preApprovalAccountsTask;

                // Combine results from both repositories
                var combined = new List<CombinedImageAccountResponse>();

                // Add ImageAccount records
                foreach (var account in imageAccounts)
                {
                    combined.Add(new CombinedImageAccountResponse
                    {
                        ImageID = account.ImageID,
                        ImageTypeID = account.ImageTypeID,
                        ClientID = account.ClientID,
                        Image = account.Image,
                        ThumbNailImage = account.ThumbNailImage,
                        Description = account.Description,
                        IsClosed = account.IsClosed,
                        CreatedBy = account.CreatedBy,
                        CreatedOn = account.CreatedOn,
                        SupervisedBy = account.SupervisedBy,
                        SupervisedOn = account.SupervisedOn,
                        sImage = account.sImage,
                        IsModified = account.IsModified,
                        MimeType = account.MimeType,
                        FilePath = account.FilePath
                    });
                }

                // Add ImageAccountPreApproval records
                foreach (var preApproval in preApprovalAccounts)
                {
                    combined.Add(new CombinedImageAccountResponse
                    {
                        ImageID = preApproval.ImageID,
                        ImageTypeID = preApproval.ImageTypeID,
                        ClientID = preApproval.ClientID,
                        Image = preApproval.Image,
                        ThumbNailImage = preApproval.ThumbNailImage,
                        Description = preApproval.Description,
                        IsClosed = preApproval.IsClosed,
                        CreatedBy = preApproval.CreatedBy,
                        CreatedOn = preApproval.CreatedOn,
                        SupervisedBy = preApproval.SupervisedBy,
                        SupervisedOn = preApproval.SupervisedOn,
                        sImage = preApproval.sImage,
                        IsModified = preApproval.IsModified,
                        MimeType = preApproval.MimeType,
                        FilePath = preApproval.FilePath
                    });
                }

                // Sort by ImageID for consistent ordering
                var sorted = combined.OrderBy(x => x.ImageID).ToList();

                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Records retrieved successfully",
                    details = sorted
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to retrieve image accounts", details = ex.Message });
            }
        }

        [HttpGet("{imageId:long}/download")]
        public async Task<IActionResult> Download(long imageId, CancellationToken cancellationToken)
        {
            var imageData = await _repository.GetImageDataAsync(imageId, cancellationToken);

            if (imageData == null)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Image Account not found",
                    details = new { imageId }
                });
            }

            var (data, mimeType, fileName) = imageData.Value;
            if (data == null)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Image data not found",
                    details = new { imageId }
                });
            }

            return File(data, mimeType ?? "application/octet-stream", fileName ?? "download");
        }

        [HttpGet("{imageId:long}/thumbnail")]
        public async Task<IActionResult> GetThumbnail(long imageId, CancellationToken cancellationToken)
        {
            var thumbnail = await _repository.GetThumbnailAsync(imageId, cancellationToken);

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

        [HttpPut("{imageId:long}")]
        public async Task<IActionResult> Update(long imageId, [FromBody] InData<UpdateImageAccountRequest> request, CancellationToken cancellationToken)
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
                var entity = await _repository.UpdateMetadataAsync(
                    imageId,
                    request.RequestData!.Description,
                    request.RequestData.SupervisedBy,
                    request.RequestData.SupervisedOn,
                    request.RequestData.IsClosed,
                    null,
                    cancellationToken);

                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Image Account metadata updated successfully",
                    details = entity
                });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Image Account not found",
                    details = new { imageId }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to update image account", details = ex.Message });
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
                var entity = await _repository.ReplaceAsync(imageId, request.RequestData.File, request.RequestData.ModifiedBy, cancellationToken);

                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Image Account replaced successfully",
                    details = entity
                });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Image Account not found",
                    details = new { imageId }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to replace image account", details = ex.Message });
            }
        }

        [HttpDelete("{imageId:long}")]
        public async Task<IActionResult> Delete(long imageId, CancellationToken cancellationToken)
        {
            try
            {
                var entity = await _repository.GetByIdAsync(imageId, cancellationToken);
                if (entity == null)
                {
                    return NotFound(new
                    {
                        responseCode = "96",
                        responseMessage = "Image Account not found",
                        details = new { imageId }
                    });
                }

                await _repository.DeleteAsync(imageId, cancellationToken);
                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Image Account deleted successfully",
                    details = new { imageId }
                });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Image Account not found",
                    details = new { imageId }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to delete image account", details = ex.Message });
            }
        }
    }
}
