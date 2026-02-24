using Microsoft.EntityFrameworkCore;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClientDocumentApi.Models
{
    [Table("t_WFAdvDocument")]
    [PrimaryKey(nameof(OurBranchID),nameof(ApplicationID),nameof(DocumentID))]
    public class WFAdvDocument
    {
        //[Key,Column(Order =1)]
        [StringLength(12)]
        public string? OurBranchID { get; set; }
        //[Key, Column(Order = 2)]
        [StringLength(100)]
        public string? ApplicationID { get; set; }
        //[Key, Column(Order = 3)]
        [StringLength(50)]
        public string? DocumentID { get; set; }

        [Required]
        [StringLength(50)]
        public string? DocumentTypeID { get; set; }

        public long? ImageID { get; set; }

        [StringLength(200)]
        public string? MimeType { get; set; }

        [StringLength(25)]
        public string? ReceivedBy { get; set; }

        public DateTime? ReceivedDate { get; set; }

        [StringLength(50)]
        public string? LocationID { get; set; }

        [StringLength(500)]
        public string? Remarks { get; set; }

        [StringLength(1000)]
        public string? FilePath { get; set; }

        [StringLength(25)]
        public string? CreatedBy { get; set; }

        public DateTime? CreatedOn { get; set; }

        [StringLength(25)]
        public string? ModifiedBy { get; set; }

        public DateTime? ModifiedOn { get; set; }

        public byte? UpdateCount { get; set; }
    }
}
