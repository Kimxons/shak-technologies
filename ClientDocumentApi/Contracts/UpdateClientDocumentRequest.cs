using System;
using System.ComponentModel.DataAnnotations;

namespace ClientDocumentApi.Contracts
{
    public class UpdateClientDocumentRequest
    {
        [StringLength(40)]
        public string? ClientID { get; set; }
        [Required]
        [StringLength(50)]
        public string? DocumentID { get; set; }
        
        [StringLength(50)]
        public string? DocumentTypeID { get; set; }
        public string? ReceivedBy { get; set; }
        public DateTime? ReceivedDate { get; set; }
        public string? LocationID { get; set; }

        [Required]
        public string? Remarks { get; set; }

        [Required]
        public string? ModifiedBy { get; set; }
        public string? DocumentReferenceNo { get; set; }
        public DateTime? DocumentDate { get; set; }
        public string? SendingBank { get; set; }
        public string? RequestID { get; set; }
    }
}
