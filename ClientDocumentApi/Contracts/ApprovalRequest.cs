namespace ClientDocumentApi.Contracts
{
    /// <summary>
    /// Request model for approving images by client ID
    /// </summary>
    public class ApprovalRequest
    {
        /// <summary>
        /// User who is approving the images
        /// </summary>
        public string? ApprovedBy { get; set; }
    }
}
