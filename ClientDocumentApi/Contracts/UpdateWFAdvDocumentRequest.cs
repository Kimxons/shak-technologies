using System;
using System.ComponentModel.DataAnnotations;

namespace ClientDocumentApi.Contracts
{
    public class UpdateWFAdvDocumentRequest
    {
        public string? OurBranchID { get; set; }
        public string? ApplicationID { get; set; }
        public string? DocumentID { get; set; }
        public string? DocumentTypeID { get; set; }
        public string? ReceivedBy { get; set; }
        public DateTime? ReceivedDate { get; set; }
        public string? LocationID { get; set; }
        public string? Remarks { get; set; }

        [Required]
        public string? ModifiedBy { get; set; }
    }
}
