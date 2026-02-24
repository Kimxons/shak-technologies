using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace ClientDocumentApi.Contracts
{
    public class UploadWFAdvDocumentRequest
    {
        [Required]
        public string? OurBranchID { get; set; }
        [Required]
        public string? ApplicationID { get; set; }
        [Required]
        public string? DocumentID { get; set; }
        public string? DocumentTypeID { get; set; }
        public string? ReceivedBy { get; set; }
        public DateTime? ReceivedDate { get; set; }
        public string? LocationID { get; set; }
        public string? Remarks { get; set; }
        [Required]
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }

        [Required]
        public IFormFile File { get; set; } = default!;
    }
}
