using System;

namespace ClientDocumentApi.Contracts
{
    public class UpdateImageRequest
    {
        public string? ImageTypeID { get; set; }
        public string? Description { get; set; }
        public string? ImageStatusID { get; set; }
        public string? ModifiedBy { get; set; }
        public string? ClosedBy { get; set; }
        public DateTime? ClosedDate { get; set; }
        public string? SupervisedBy { get; set; }
        public DateTime? SupervisedOn { get; set; }
    }
}
