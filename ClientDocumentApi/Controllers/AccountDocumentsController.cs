using ClientDocumentApi.Contracts;
using ClientDocumentApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace ClientDocumentApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AccountDocumentsController : ControllerBase
    {
        private readonly IAccountDocumentRepository _accountDocumentRepository;
        private readonly ILogger<AccountDocumentsController> _logger;

        public AccountDocumentsController(
            IAccountDocumentRepository accountDocumentRepository,
            ILogger<AccountDocumentsController> logger)
        {
            _accountDocumentRepository = accountDocumentRepository;
            _logger = logger;
        }

        /// <summary>
        /// Upload account document with details and save to t_Image table
        /// Calls stored procedure p_AddEditAccountDocuments
        /// </summary>
        /// <param name="request">Account document upload request with file and metadata</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Upload result with ImageID</returns>
        [HttpPost("upload")]
        [RequestSizeLimit(50 * 1024 * 1024)]  // 50 MB limit
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> UploadAccountDocument(
            [FromForm] InData<AccountDocumentUploadRequest> request,
            CancellationToken cancellationToken)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    _logger.LogWarning("Invalid model state for document upload");
                    return BadRequest(new
                    {
                        responseCode = "96",
                        responseMessage = "Validation failed",
                        details = ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage))
                    });
                }

                if (request?.RequestData?.File == null || request.RequestData.File.Length == 0)
                {
                    _logger.LogWarning("No file provided in upload request");
                    return BadRequest(new
                    {
                        responseCode = "96",
                        responseMessage = "No file provided"
                    });
                }

                // Validate file size (50 MB max)
                if (request.RequestData.File.Length > 50 * 1024 * 1024)
                {
                    return BadRequest(new
                    {
                        responseCode = "96",
                        responseMessage = "File size exceeds maximum allowed size of 50 MB"
                    });
                }

                _logger.LogInformation("Processing document upload for AccountID: {AccountID}, DocumentID: {DocumentID}",
                    request.RequestData.OurBranchID, request.RequestData.AccountID);

                var (success, imageId, message) = await _accountDocumentRepository.UploadAccountDocumentAsync(request, cancellationToken);

                if (!success)
                {
                    _logger.LogError("Failed to upload document: {Message}", message);
                    return StatusCode(StatusCodes.Status500InternalServerError, new
                    {
                        responseCode = "99",
                        responseMessage = "Failed to upload document",
                        details = message
                    });
                }

                _logger.LogInformation("Document uploaded successfully with ImageID: {ImageID}", imageId);
                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Document uploaded successfully",
                    details = new { imageId, fileName = request.RequestData.File.FileName }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception occurred during document upload");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    responseCode = "99",
                    responseMessage = "An unexpected error occurred",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// Upload document with minimal required fields
        /// </summary>
        [HttpPost("quick-upload")]
        [RequestSizeLimit(50 * 1024 * 1024)]
        public async Task<IActionResult> QuickUploadAccountDocument(
            [FromForm] string ourBranchID,
            [FromForm] string accountID,
            [FromForm] string documentID,
            [FromForm] string documentTypeID,
            [FromForm] string createdBy,
            [FromForm] IFormFile file,
            [FromForm] string? receivedBy = null,
            [FromForm] string? remarks = null,
            [FromForm] string? locationID = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(ourBranchID) || string.IsNullOrWhiteSpace(accountID) ||
                    string.IsNullOrWhiteSpace(documentID) || string.IsNullOrWhiteSpace(documentTypeID) ||
                    string.IsNullOrWhiteSpace(createdBy) || file == null || file.Length == 0)
                {
                    return BadRequest(new
                    {
                        responseCode = "96",
                        responseMessage = "Missing required fields"
                    });
                }

                var requestData = new AccountDocumentUploadRequest
                {
                    OurBranchID = ourBranchID,
                    AccountID = accountID,
                    DocumentID = documentID,
                    DocumentTypeID = documentTypeID,
                    CreatedBy = createdBy,
                    ReceivedBy = receivedBy,
                    Remarks = remarks,
                    LocationID = locationID,
                    File = file,
                    NewRecord = 1,
                    CreatedOn = DateTime.UtcNow
                };

                var request = new InData<AccountDocumentUploadRequest> { RequestData = requestData };

                var (success, imageId, message) = await _accountDocumentRepository.UploadAccountDocumentAsync(request, cancellationToken);

                if (!success)
                {
                    return StatusCode(StatusCodes.Status500InternalServerError, new
                    {
                        responseCode = "99",
                        responseMessage = "Failed to upload document",
                        details = message
                    });
                }

                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Document uploaded successfully",
                    details = new { imageId, fileName = file.FileName }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception occurred during quick document upload");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    responseCode = "99",
                    responseMessage = "An unexpected error occurred",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// Get account documents by AccountID from t_ClientDocument table
        /// </summary>
        /// <param name="accountId">The account ID to fetch documents for</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>List of documents for the account</returns>
        [HttpGet("by-account/{accountId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetAccountDocumentsByAccountId(
            string accountId,
            CancellationToken cancellationToken)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(accountId))
                {
                    _logger.LogWarning("Account ID is required");
                    return BadRequest(new
                    {
                        responseCode = "96",
                        responseMessage = "Account ID is required"
                    });
                }

                _logger.LogInformation("Fetching documents for AccountID: {AccountID}", accountId);

                var (success, documents, message) = await _accountDocumentRepository.GetAccountDocumentsByAccountIdAsync(accountId, cancellationToken);

                if (!success)
                {
                    _logger.LogError("Failed to fetch documents: {Message}", message);
                    return StatusCode(StatusCodes.Status500InternalServerError, new
                    {
                        responseCode = "99",
                        responseMessage = "Failed to fetch documents",
                        details = message
                    });
                }

                if (!documents.Any())
                {
                    _logger.LogInformation("No documents found for AccountID: {AccountID}", accountId);
                    return NotFound(new
                    {
                        responseCode = "98",
                        responseMessage = "No documents found for the specified account"
                    });
                }

                _logger.LogInformation("Successfully retrieved {Count} documents for AccountID: {AccountID}", documents.Count, accountId);
                return Ok(new
                {
                    responseCode = "00",
                    responseMessage = "Documents retrieved successfully",
                    details = new
                    {
                        accountId,
                        documentCount = documents.Count,
                        documents = documents.Select(d => new
                        {
                            d.RowID,
                            d.ClientID,
                            d.DocumentID,
                            d.DocumentTypeID,
                            d.ReceivedBy,
                            d.ReceivedDate,
                            d.LocationID,
                            d.Remarks,
                            d.CreatedBy,
                            d.CreatedOn,
                            d.ModifiedBy,
                            d.ModifiedOn,
                            d.ImageID,
                            d.DocumentReferenceNo,
                            d.DocumentDate,
                            d.SendingBank,
                            d.FilePath
                        }).ToList()
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception occurred while fetching documents for AccountID: {AccountID}", accountId);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    responseCode = "99",
                    responseMessage = "An unexpected error occurred",
                    details = ex.Message
                });
            }
        }
    }
}
