using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClientDocumentApi.Models
{
    [Table("t_ClientDocument")]
    public class ClientDocument
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public long RowID { get; set; }

        [Required]
        [StringLength(40)]
        public string ClientID { get; set; } = string.Empty;

        [Required]
        [StringLength(8)]
        public string DocumentID { get; set; } = string.Empty;

        [StringLength(50)]
        public string? DocumentTypeID { get; set; }
        public string? ReceivedBy { get; set; }
        public DateTime? ReceivedDate { get; set; }
        public string? LocationID { get; set; }
        public string? Remarks { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public byte? UpdateCount { get; set; }
        public long? ImageID { get; set; }
        public DateTime? DeletedOn { get; set; }
        public string? DeletedBy { get; set; }
        public string? sImage { get; set; }
        public string? DocumentReferenceNo { get; set; }
        public DateTime? DocumentDate { get; set; }
        public string? SendingBank { get; set; }

        [StringLength(36)]
        public string? RequestID { get; set; }

        [Required]
        [StringLength(1024)]
        public string FilePath { get; set; } = string.Empty;
    }
}
