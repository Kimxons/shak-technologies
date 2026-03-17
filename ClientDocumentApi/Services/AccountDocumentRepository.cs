using CBS.Entities.Common;
using ClientDocumentApi.Contracts;
using ClientDocumentApi.Data;
using ClientDocumentApi.Models;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace ClientDocumentApi.Services
{
    public class AccountDocumentRepository : IAccountDocumentRepository
    {
        private readonly DocumentDbContext _context;
        private readonly IImageRepository _imageRepository;
        private readonly ILogger<AccountDocumentRepository> _logger;

        public AccountDocumentRepository(
            DocumentDbContext context,
            IImageRepository imageRepository,
            ILogger<AccountDocumentRepository> logger)
        {
            _context = context;
            _imageRepository = imageRepository;
            _logger = logger;
        }

        public async Task<(bool Success, long ImageID, string Message)> UploadAccountDocumentAsync(
            InDataRequest<AccountDocumentUploadRequest> request,
            CancellationToken cancellationToken = default)
        {
            try
            {
                if (request?.RequestData == null)
                {
                    return (false, 0, "Request data is null");
                }

                var data = request.RequestData;

                // Validate required fields
                if (string.IsNullOrWhiteSpace(data.OurBranchID) ||
                    string.IsNullOrWhiteSpace(data.AccountID) ||
                    string.IsNullOrWhiteSpace(data.DocumentID) ||
                    string.IsNullOrWhiteSpace(data.DocumentTypeID) ||
                    data.File == null || data.File.Length == 0)
                {
                    return (false, 0, "Missing required fields: OurBranchID, AccountID, DocumentID, DocumentTypeID, or File");
                }

                _logger.LogInformation("Starting account document upload for AccountID: {AccountID}, DocumentID: {DocumentID}",
                    data.AccountID, data.DocumentID);

                // Step 1: Save the image to t_Image table using ImageRepository
                long imageId = 0;
                //using (var memoryStream = new MemoryStream())
                //{
                //await data.File.CopyToAsync(memoryStream, cancellationToken);
                var image = await _imageRepository.SaveAsync(data.File, "D", data.Remarks, null, data.CreatedBy, data.CreatedOn, cancellationToken);
                imageId = image.ImageID;

                _logger.LogInformation("Image saved successfully with ImageID: {ImageID}", imageId);
                //}

                // Step 2: Call the stored procedure p_AddEditAccountDocuments
                var parameters = new[]
                {
                    new SqlParameter("@OurBranchID", SqlDbType.VarChar, 12) { Value = data.OurBranchID },
                    new SqlParameter("@AccountID", SqlDbType.VarChar, 40) { Value = data.AccountID },
                    new SqlParameter("@DocumentID", SqlDbType.NVarChar, 4) { Value = data.DocumentID },
                    new SqlParameter("@DocumentTypeID", SqlDbType.VarChar, 50) { Value = data.DocumentTypeID },
                    new SqlParameter("@ReceivedBy", SqlDbType.VarChar, 25) { Value = (object?)data.ReceivedBy ?? DBNull.Value },
                    new SqlParameter("@ReceivedDate", SqlDbType.SmallDateTime) { Value = (object?)data.ReceivedDate ?? DBNull.Value },
                    new SqlParameter("@ExpiryDate", SqlDbType.SmallDateTime) { Value = (object?)data.ExpiryDate ?? DBNull.Value },
                    new SqlParameter("@ImageID", SqlDbType.BigInt) { Value = imageId },
                    new SqlParameter("@LocationID", SqlDbType.VarChar, 50) { Value = (object?)data.LocationID ?? DBNull.Value },
                    new SqlParameter("@Remarks", SqlDbType.VarChar, 255) { Value = (object?)data.Remarks ?? DBNull.Value },
                    new SqlParameter("@CreatedBy", SqlDbType.VarChar, 25) { Value = data.CreatedBy },
                    new SqlParameter("@CreatedOn", SqlDbType.SmallDateTime) { Value = (object?)data.CreatedOn ?? DBNull.Value },
                    new SqlParameter("@ModifiedBy", SqlDbType.VarChar, 25) { Value = (object?)data.ModifiedBy ?? DBNull.Value },
                    new SqlParameter("@ModifiedOn", SqlDbType.SmallDateTime) { Value = (object?)data.ModifiedOn ?? DBNull.Value },
                    new SqlParameter("@SupervisedBy", SqlDbType.VarChar, 25) { Value = (object?)data.SupervisedBy ?? DBNull.Value },
                    new SqlParameter("@NewRecord", SqlDbType.TinyInt) { Value = data.NewRecord },
                    new SqlParameter("@DetailRecords", SqlDbType.Xml) { Value = (object?)data.DetailRecords ?? DBNull.Value }
                };

                _logger.LogInformation("Executing stored procedure p_AddEditAccountDocuments for AccountID: {AccountID}", data.AccountID);

                var result = await _context.Database.ExecuteSqlRawAsync(
                    "EXEC p_AddEditAccountDocuments @OurBranchID, @AccountID, @DocumentID, @DocumentTypeID, @ReceivedBy, @ReceivedDate, @ExpiryDate, @ImageID, @LocationID, @Remarks, @CreatedBy, @CreatedOn, @ModifiedBy, @ModifiedOn, @SupervisedBy, @NewRecord, @DetailRecords",
                    parameters,
                    cancellationToken);

                _logger.LogInformation("Stored procedure executed successfully. Result: {Result}", result);

                return (true, imageId, $"Document uploaded successfully. ImageID: {imageId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading account document for AccountID: {AccountID}",
                    request?.RequestData?.AccountID ?? "unknown");
                return (false, 0, $"Error: {ex.Message}");
            }
        }

        public async Task<(bool Success, List<ClientDocument> Documents, string Message)> GetAccountDocumentsByAccountIdAsync(
            string accountId,
            CancellationToken cancellationToken = default)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(accountId))
                {
                    return (false, new List<ClientDocument>(), "Account ID is required");
                }

                _logger.LogInformation("Fetching documents for AccountID: {AccountID}", accountId);

                var documents = await _context.ClientDocuments
                    .Where(d => d.ClientID == accountId && d.DeletedOn == null)
                    .OrderByDescending(d => d.CreatedOn)
                    .ToListAsync(cancellationToken);

                _logger.LogInformation("Found {Count} documents for AccountID: {AccountID}", documents.Count, accountId);

                return (true, documents, $"Retrieved {documents.Count} documents");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching documents for AccountID: {AccountID}", accountId);
                return (false, new List<ClientDocument>(), $"Error: {ex.Message}");
            }
        }
    }
}
