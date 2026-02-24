using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace ClientDocumentApi.Contracts
{
    public class UploadClientDocumentRequest
    {
        [StringLength(40)]
        public string? ClientID { get; set; } = string.Empty;

        [Required]
        public string? DocumentID { get; set; }
        //[Required]
        [StringLength(50)]
        public string? DocumentTypeID { get; set; }

        //[Required]
        public string? ReceivedBy { get; set; }
        //[Required]
        public DateTime? ReceivedDate { get; set; }

        //[Required]
        public string? LocationID { get; set; }
        public string? Remarks { get; set; }
        [Required]
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public int? UpdateCount { get; set; }
        public long? ImageID { get; set; }
        public DateTime? DeletedOn { get; set; }
        public string? DeletedBy { get; set; }
        public string? DocumentReferenceNo { get; set; }
        public DateTime? DocumentDate { get; set; }
        public string? SendingBank { get; set; }
        public string? RequestID { get; set; }

        [Required]
        public IFormFile File { get; set; } = default!;
    }
}
