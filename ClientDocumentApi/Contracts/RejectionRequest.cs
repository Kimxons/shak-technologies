namespace ClientDocumentApi.Contracts
{
    /// <summary>
    /// Request model for rejecting images by client ID
    /// </summary>
    public class RejectionRequest
    {
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
