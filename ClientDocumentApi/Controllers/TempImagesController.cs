using CBS.Entities.Common;
using ClientDocumentApi.Contracts;
using ClientDocumentApi.Models;
using ClientDocumentApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TempImageModel = ClientDocumentApi.Models.TempImage;

namespace ClientDocumentApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TempImagesController : ControllerBase
    {
        private readonly ITempImageRepository _tempImageRepository;

        public TempImagesController(ITempImageRepository tempImageRepository)
        {
            _tempImageRepository = tempImageRepository;
        }

        [HttpPost]
        [RequestSizeLimit(50 * 1024 * 1024)]
        public async Task<IActionResult> Upload([FromForm] InData<UploadTempImageRequest> request, CancellationToken cancellationToken)
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
                var entity = await _tempImageRepository.SaveAsync(request.RequestData!.File, request.RequestData!.ImageTypeID,
                    request.RequestData!.ModuleID, request.RequestData!.ImageID, request.RequestData!.OurBranchID, request.RequestData!.ClientID,
                    //request.RequestData!.AccountID, request.RequestData!.TempClientID ?? request.RequestId, request.RequestData!.Description, request.RequestData!.CopyToClientImage,
                    request.RequestData!.AccountID, request.RequestData!.TempClientID, request.RequestData!.Description, request.RequestData!.CopyToClientImage,
                    request.RequestData!.CreatedBy, request.RequestData!.CreatedOn, request.RequestData!.RequestID, cancellationToken);

                return CreatedAtAction(nameof(GetById), new { tempImageId = entity.TempImageID }, new
                {
                    responseCode = "00",
                    responseMessage = "Temporary image uploaded successfully",
                    details = entity
                });
            }
            catch (Exception ex)
            {

                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to upload temporary image", details = ex.Message });
            }
        }

        [HttpGet("{tempImageId:long}")]
        public async Task<ActionResult<TempImageModel>> GetById(long tempImageId, CancellationToken cancellationToken)
        {
            var entity = await _tempImageRepository.GetByIdAsync(tempImageId, cancellationToken);
            if (entity == null)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Temporary image not found",
                    details = new { tempImageId }
                });
            }

            return Ok(new
            {
                responseCode = "00",
                responseMessage = "Success",
                details = entity
            });
        }

        [HttpGet("{tempImageId:long}/download")]
        public async Task<IActionResult> Download(long tempImageId, CancellationToken cancellationToken)
        {
            var imageData = await _tempImageRepository.GetImageDataAsync(tempImageId, cancellationToken);

            if (imageData == null)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Temporary image not found",
                    details = new { tempImageId }
                });
            }

            var (data, mimeType, fileName) = imageData.Value;
            if (data == null)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Temporary image not found",
                    details = new { tempImageId }
                });
            }

            return File(data, mimeType ?? "application/octet-stream", fileName ?? "download");
        }

        [HttpGet("{tempImageId:long}/thumbnail")]
        public async Task<IActionResult> GetThumbnail(long tempImageId, CancellationToken cancellationToken)
        {
            var thumbnail = await _tempImageRepository.GetThumbnailAsync(tempImageId, cancellationToken);

            if (thumbnail == null)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Thumbnail not found",
                    details = new { tempImageId }
                });
            }

            return File(thumbnail, "image/jpeg");
        }

        [HttpDelete("{tempImageId:long}")]
        public async Task<IActionResult> Delete(long tempImageId, CancellationToken cancellationToken)
        {
            try
            {


                var entity = await _tempImageRepository.GetByIdAsync(tempImageId, cancellationToken);
                if (entity == null)
                {
                    return NotFound(new
                    {
                        responseCode = "96",
                        responseMessage = "Temporary image not found",
                        details = new { tempImageId }
                    });
                }
                await _tempImageRepository.DeleteAsync(tempImageId, cancellationToken);
                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Temporary image deleted successfully",
                    details = new { tempImageId }
                });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Temporary image not found",
                    details = new { tempImageId }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to delete temporary image", details = ex.Message });
            }
        }

        [HttpPut("{tempImageId:long}")]
        public async Task<IActionResult> Update(long tempImageId, [FromBody] InData<UpdateTempImageRequest> request, CancellationToken cancellationToken)
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
                var entity = await _tempImageRepository.UpdateMetadataAsync(tempImageId, request.RequestData!.ModuleID,
                    request.RequestData!.ImageID, request.RequestData!.ImageTypeID, request.RequestData!.OurBranchID, request.RequestData!.ClientID,
                    request.RequestData!.AccountID, request.RequestData!.TempClientID, request.RequestData!.Description, request.RequestData!.CopyToClientImage,
                    request.RequestData!.ModifiedBy, cancellationToken);

                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Temporary image metadata updated successfully",
                    details = entity
                });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Temporary image not found",
                    details = new { tempImageId }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to update temporary image", details = ex.Message });
            }
        }

        [HttpPut("{tempImageId:long}/replace")]
        [RequestSizeLimit(50 * 1024 * 1024)]
        public async Task<IActionResult> ReplaceImage(long tempImageId, [FromForm] InData<ReplaceImageRequest> request, CancellationToken cancellationToken)
        {
            if (request.RequestData?.File == null || request.RequestData.File.Length == 0)
            {
                return BadRequest(new
                {
                    responseCode = "96",
                    responseMessage = "File is required",
                    details = new { tempImageId }
                });
            }

            try
            {
                var entity = await _tempImageRepository.ReplaceAsync(tempImageId, request.RequestData.File, request.RequestData.ModifiedBy, cancellationToken);

                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Temporary image replaced successfully",
                    details = entity
                });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new
                {
                    responseCode = "96",
                    responseMessage = "Temporary image not found",
                    details = new { tempImageId }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to replace temporary image", details = ex.Message });
            }
        }

        [HttpGet("{tempClientId}")]
        public async Task<IActionResult> GetByTempClientId(string? tempClientId, [FromQuery] string? requestId, CancellationToken cancellationToken)
        {
            try
            {
                var entities = await _tempImageRepository.GetByTempClientIdAsync(tempClientId, cancellationToken);

                if (entities == null)
                {
                    return NotFound(new
                    {
                        responseCode = "96",
                        responseMessage = "Temporary image not found",
                        details = new { tempClientId }
                    });
                }
                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Success",
                    details = entities
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    responseCode = "96",
                    responseMessage = "Invalid tempClientId",
                    details = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to retrieve temporary images", details = ex.Message });
            }
        }

        [HttpDelete("{tempClientId}")]
        public async Task<IActionResult> DeleteByTempClientId(string tempClientId, CancellationToken cancellationToken)
        {
            try
            {

                var entity = await _tempImageRepository.GetByTempClientIdAsync(tempClientId, cancellationToken);
                if (entity == null)
                {
                    return NotFound(new
                    {
                        responseCode = "96",
                        responseMessage = "Temporary image not found",
                        details = new { tempClientId }
                    });
                }
                await _tempImageRepository.DeleteByTempClientIdAsync(tempClientId, cancellationToken);

                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "All temporary images for temp client deleted successfully",
                    details = new { tempClientId }
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    responseCode = "96",
                    responseMessage = "Invalid tempClientId",
                    details = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to delete temporary images", details = ex.Message });
            }
        }

        //[HttpGet("client/{clientId}")]
        //public async Task<IActionResult> GetByClientId(string? clientId, [FromQuery] string? requestId, CancellationToken cancellationToken)
        //{
        //    try
        //    {
        //        //var entities = await _tempImageRepository.GetByClientIdAsync(clientId, cancellationToken);
        //        var entities = await _tempImageRepository.GetByClientIdEnrichedAsync(clientId, cancellationToken);

        //        // If no records found and requestId is available, try fetching by requestId
        //        if ((entities == null || entities.Count == 0) && !string.IsNullOrWhiteSpace(requestId))
        //        {
        //            //entities = await _tempImageRepository.GetByRequestIdAsync(requestId, cancellationToken);
        //            entities = await _tempImageRepository.GetByClientIdEnrichedAsync(requestId, cancellationToken);
        //        }

        //        if (entities == null || entities.Count == 0)
        //        {
        //            return NotFound(new
        //            {
        //                responseCode = "96",
        //                responseMessage = "Temporary images not found",
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
        //    catch (ArgumentException ex)
        //    {
        //        return BadRequest(new
        //        {
        //            responseCode = "96",
        //            responseMessage = "Invalid clientId or requestId",
        //            details = ex.Message
        //        });
        //    }
        //    catch (Exception ex)
        //    {
        //        return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to retrieve temporary images", details = ex.Message });
        //    }
        //}

        [HttpDelete("client/{clientId}")]
        public async Task<IActionResult> DeleteByClientId(string clientId, CancellationToken cancellationToken)
        {
            try
            {
                var entities = await _tempImageRepository.GetByClientIdAsync(clientId, cancellationToken);
                if (entities == null || entities.Count == 0)
                {
                    return NotFound(new
                    {
                        responseCode = "96",
                        responseMessage = "Temporary images not found",
                        details = new { clientId }
                    });
                }
                await _tempImageRepository.DeleteByClientIdAsync(clientId, cancellationToken);

                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "All temporary images for client deleted successfully",
                    details = new { clientId }
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    responseCode = "96",
                    responseMessage = "Invalid clientId",
                    details = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to delete temporary images", details = ex.Message });
            }
        }

        [HttpGet("client")]
        public async Task<IActionResult> GetByClientId([FromQuery] string? clientId, [FromQuery] string? requestId, CancellationToken cancellationToken)
        {
            try
            {
                //var entities = await _tempImageRepository.GetByClientIdAsync(clientId, cancellationToken);
                var entities = await _tempImageRepository.GetByClientIdEnrichedAsync(clientId!, cancellationToken);

                // If no records found and requestId is available, try fetching by requestId
                if ((entities == null || entities.Count == 0) && !string.IsNullOrWhiteSpace(requestId))
                {
                    entities = await _tempImageRepository.GetByRequestIdEnrichedAsync(requestId, cancellationToken);
                    //entities = await _tempImageRepository.GetByClientIdEnrichedAsync(requestId, cancellationToken);
                }

                if (entities == null || entities.Count == 0)
                {
                    //return NotFound(new
                    //{
                    //    responseCode = "96",
                    //    responseMessage = "Temporary images not found",
                    //    details = new { clientId, requestId }
                    //});
                    return Ok(new ResponseDetail<object>
                    {
                        ResponseCode = "96",
                        ResponseMessage = "Temporary images not found",
                        Details = new { clientId, requestId }
                    });
                }
                return Ok(new ResponseDetail<object>
                {
                    ResponseCode = "00",
                    ResponseMessage = "Success",
                    Details = entities
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new ResponseDetail<object>
                {
                    ResponseCode = "96",
                    ResponseMessage = "Invalid clientId or requestId",
                    Details = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to retrieve temporary images", details = ex.Message });
            }
        }

        [HttpDelete("client")]
        public async Task<IActionResult> DeleteByClientId([FromQuery] string? clientId, [FromQuery] string? requestId, CancellationToken cancellationToken)
        {
            try
            {
                var entities = await _tempImageRepository.GetByClientIdAsync(clientId!, cancellationToken);
                if (entities == null || entities.Count == 0)
                {
                    entities = await _tempImageRepository.GetByRequestIdAsync(requestId!, cancellationToken);
                    if (entities == null || entities.Count == 0)
                    {
                        return Ok(new
                        {
                            responseCode = "96",
                            responseMessage = "Temporary images not found",
                            details = new { clientId }
                        });
                    }
                    else
                    {
                        await _tempImageRepository.DeleteByRequestIdAsync(requestId!, cancellationToken);
                    }
                }
                else
                {
                    await _tempImageRepository.DeleteByClientIdAsync(clientId!, cancellationToken);
                }

                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "All temporary images for client deleted successfully",
                    details = new { clientId }
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    responseCode = "96",
                    responseMessage = "Invalid clientId",
                    details = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to delete temporary images", details = ex.Message });
            }
        }

        [HttpGet("account/{accountId}")]
        public async Task<IActionResult> GetByAccountId(string? accountId, [FromQuery] string? requestId, CancellationToken cancellationToken)
        {
            try
            {
                var entities = await _tempImageRepository.GetByAccountIdAsync(accountId, cancellationToken);

                // If no records found and requestId is available, try fetching by requestId
                if ((entities == null || entities.Count == 0) && !string.IsNullOrWhiteSpace(requestId))
                {
                    entities = await _tempImageRepository.GetByRequestIdAsync(requestId, cancellationToken);
                }

                if (entities == null || entities.Count == 0)
                {
                    return Ok(new
                    {
                        responseCode = "96",
                        responseMessage = "Temporary images not found",
                        details = new { accountId, requestId }
                    });
                }
                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Success",
                    details = entities
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    responseCode = "96",
                    responseMessage = "Invalid accountId or requestId",
                    details = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to retrieve temporary images", details = ex.Message });
            }
        }

        [HttpDelete("account/{accountId}")]
        public async Task<IActionResult> DeleteByAccountId(string accountId, CancellationToken cancellationToken)
        {
            try
            {
                var entities = await _tempImageRepository.GetByAccountIdAsync(accountId, cancellationToken);
                if (entities == null || entities.Count == 0)
                {
                    return Ok(new
                    {
                        responseCode = "96",
                        responseMessage = "Temporary images not found",
                        details = new { accountId }
                    });
                }
                await _tempImageRepository.DeleteByAccountIdAsync(accountId, cancellationToken);

                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "All temporary images for account deleted successfully",
                    details = new { accountId }
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    responseCode = "96",
                    responseMessage = "Invalid accountId",
                    details = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { responseCode = "99", responseMessage = "Failed to delete temporary images", details = ex.Message });
            }
        }
    }
}
