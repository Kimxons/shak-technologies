using System.ComponentModel.DataAnnotations;

namespace ClientDocumentApi.Contracts
{
    /// <summary>
    /// Request model for approving specific images by their IDs
    /// </summary>
    public class ApprovalByIdsRequest
    {
        /// <summary>
        /// List of temp image IDs to approve
        /// </summary>
        public List<long>? TempImageIds { get; set; }

        /// <summary>
        /// List of pre-approval image IDs to approve
        /// </summary>
        public List<long>? PreApprovalImageIds { get; set; }

        /// <summary>
        /// User who is approving the images
        /// </summary>
        public string? ApprovedBy { get; set; }
    }
}
