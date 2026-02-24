using System.ComponentModel.DataAnnotations;

namespace ClientDocumentApi.Contracts
{
    public class AccountDocumentUploadRequest
    {
        [Required]
        [StringLength(12)]
        public string OurBranchID { get; set; } = string.Empty;

        [Required]
        [StringLength(40)]
        public string AccountID { get; set; } = string.Empty;

        [Required]
        [StringLength(4)]
        public string DocumentID { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string DocumentTypeID { get; set; } = string.Empty;

        [StringLength(25)]
        public string? ReceivedBy { get; set; }

        public DateTime? ReceivedDate { get; set; }

        public DateTime? ExpiryDate { get; set; }

        [StringLength(50)]
        public string? LocationID { get; set; }

        [StringLength(255)]
        public string? Remarks { get; set; }

        [Required]
        [StringLength(25)]
        public string CreatedBy { get; set; } = string.Empty;

        public DateTime? CreatedOn { get; set; }

        [StringLength(25)]
        public string? ModifiedBy { get; set; }

        public DateTime? ModifiedOn { get; set; }

        [StringLength(25)]
        public string? SupervisedBy { get; set; }

        public byte NewRecord { get; set; } = 1;  // 1 for new, 0 for edit

        public string? DetailRecords { get; set; }  // XML string like <dt_DocumentClasses><DocumentClassID></DocumentClassID></dt_DocumentClasses>

        [Required]
        public IFormFile File { get; set; } = null!;
    }
}
