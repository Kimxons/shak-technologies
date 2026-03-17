using CBS.Entities.Common;
using ClientDocumentApi.Contracts;
using ClientDocumentApi.Models;
using ClientDocumentApi.Services;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;

namespace ClientDocumentApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ImageAccountPreApprovalsController : ControllerBase
    {
        private readonly IImageAccountPreApprovalRepository _repository;

        public ImageAccountPreApprovalsController(IImageAccountPreApprovalRepository repository)
        {
            _repository = repository;
        }

        [HttpPost]
        [RequestSizeLimit(50 * 1024 * 1024)]
        public async Task<IActionResult> Upload([FromForm] InDataRequest<UploadImageAccountPreApprovalRequest> request, CancellationToken cancellationToken)
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
                    request.RequestData.OurBranchID,
                    cancellationToken);

                return CreatedAtAction(nameof(GetById), new { imageId = entity.ImageID }, new
                {
                    responseCode = "00",
                    responseMessage = "Image Account Pre-Approval uploaded successfully",
                    details = entity
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to upload image account pre-approval", details = ex.Message });
            }
        }

        [HttpGet("{imageId:long}")]
        public async Task<ActionResult<ImageAccountPreApproval>> GetById(long imageId, CancellationToken cancellationToken)
        {
            var entity = await _repository.GetByIdAsync(imageId, cancellationToken);
            if (entity == null)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Image Account Pre-Approval not found",
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

        //[HttpGet("client/{clientId}")]
        //public async Task<IActionResult> GetByClientId(string clientId, CancellationToken cancellationToken)
        //{
        //    try
        //    {
        //        IEnumerable<ImageAccountPreApproval> entities = await _repository.GetByClientIdAsync(clientId, cancellationToken);
        //        IEnumerable<ImageAccountPreApproval> lsResp = entities.Select(i => new ImageAccountPreApproval
        //        {

        //        });
        //        return Ok(new
        //        {
        //            responseCode = "00",
        //            responseMessage = "Success",
        //            details = entities
        //        });
        //    }
        //    catch (Exception ex)
        //    {
        //        return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to retrieve image accounts pre-approval", details = ex.Message });
        //    }
        //}

        //[HttpGet("client/{clientId}")]
        //public async Task<IActionResult> GetByClientId([FromQuery]string? clientId, [FromQuery] string? requestId, CancellationToken cancellationToken)
        //{
        //    try
        //    {
        //        IEnumerable<object> entities = await _repository.GetByClientIdEnrichedAsync(clientId!, cancellationToken);
        //        //IEnumerable<ImageAccountPreApproval> lsResp = entities.Select(i => new ImageAccountPreApproval
        //        //{

        //        //});
        //        if ((entities == null || entities.Count() == 0) && !string.IsNullOrWhiteSpace(requestId))
        //        {
        //            entities = await _repository.GetByRequestIdEnrichedAsync(requestId, cancellationToken);
        //            //entities = await _tempImageRepository.GetByClientIdEnrichedAsync(requestId, cancellationToken);
        //        }

        //        if (entities == null || entities.Count() == 0)
        //        {
        //            return Ok(new
        //            {
        //                responseCode = "96",
        //                responseMessage = "Image Pre-approval images not found",
        //                details = new { clientId, requestId }
        //            });
        //        }
        //        return Ok(new
        //        {
        //            responseCode = "00",
        //            responseMessage = "Success",
        //            details = entities
        //        });
        //    }
        //    catch (Exception ex)
        //    {
        //        return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to retrieve image accounts pre-approval", details = ex.Message });
        //    }
        //}

        [HttpGet("client")]
        public async Task<IActionResult> GetByClientId([FromQuery] string? clientId, [FromQuery] string? requestId, CancellationToken cancellationToken)
        {
            try
            {
                IEnumerable<object> entities = await _repository.GetByClientIdEnrichedAsync(clientId!, cancellationToken);
                //IEnumerable<ImageAccountPreApproval> lsResp = entities.Select(i => new ImageAccountPreApproval
                //{

                //});
                if ((entities == null || entities.Count() == 0) && !string.IsNullOrWhiteSpace(requestId))
                {
                    entities = await _repository.GetByRequestIdEnrichedAsync(requestId, cancellationToken);
                    //entities = await _tempImageRepository.GetByClientIdEnrichedAsync(requestId, cancellationToken);
                }

                if (entities == null || entities.Count() == 0)
                {
                    return Ok(new ResponseDetail<object>
                    {
                        ResponseCode = "96",
                        ResponseMessage = "Image Pre-approval images not found",
                        Details = new { clientId, requestId }
                    });
                }
                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Success",
                    details = entities
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to retrieve image accounts pre-approval", details = ex.Message });
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
                    responseMessage = "Image Account Pre-Approval not found",
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
        public async Task<IActionResult> Update(long imageId, [FromBody] InDataRequest<UpdateImageAccountPreApprovalRequest> request, CancellationToken cancellationToken)
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
                    responseMessage = "Image Account Pre-Approval metadata updated successfully",
                    details = entity
                });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Image Account Pre-Approval not found",
                    details = new { imageId }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to update image account pre-approval", details = ex.Message });
            }
        }

        [HttpPut("{imageId:long}/replace")]
        [RequestSizeLimit(50 * 1024 * 1024)]
        public async Task<IActionResult> ReplaceImage(long imageId, [FromForm] InDataRequest<ReplaceImageRequest> request, CancellationToken cancellationToken)
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
                    responseMessage = "Image Account Pre-Approval replaced successfully",
                    details = entity
                });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Image Account Pre-Approval not found",
                    details = new { imageId }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to replace image account pre-approval", details = ex.Message });
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
                        responseMessage = "Image Account Pre-Approval not found",
                        details = new { imageId }
                    });
                }

                await _repository.DeleteAsync(imageId, cancellationToken);
                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Image Account Pre-Approval deleted successfully",
                    details = new { imageId }
                });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Image Account Pre-Approval not found",
                    details = new { imageId }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to delete image account pre-approval", details = ex.Message });
            }
        }
    }
}
