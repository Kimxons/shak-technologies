namespace ClientDocumentApi.Contracts
{
    /// <summary>
    /// Request model for rejecting specific images by their IDs
    /// </summary>
    public class RejectionByIdsRequest
    {
        /// <summary>
        /// List of temp image IDs to reject
        /// </summary>
        public List<long>? TempImageIds { get; set; }

        /// <summary>
        /// List of pre-approval image IDs to reject
        /// </summary>
        public List<long>? PreApprovalImageIds { get; set; }

        /// <summary>
        /// User who is rejecting the images
        /// </summary>
        public string? RejectedBy { get; set; }

        /// <summary>
        /// Reason for rejection
        /// </summary>
        public string? Reason { get; set; }
    }
}
