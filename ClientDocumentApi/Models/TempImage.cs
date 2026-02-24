using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClientDocumentApi.Models
{
    [Table("t_ImageTemp")]
    public class TempImage
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public long TempImageID { get; set; }

        public short? ModuleID { get; set; }

        public long? ImageID { get; set; }

        [Required]
        [StringLength(50)]
        public string ImageTypeID { get; set; } = default!;

        [StringLength(12)]
        public string? OurBranchID { get; set; }

        [StringLength(40)]
        public string? ClientID { get; set; }

        [StringLength(40)]
        public string? AccountID { get; set; }

        [StringLength(40)]
        public string? TempClientID { get; set; }

        //[StringLength(100)]
        //public string? RequestID { get; set; }

        public byte[]? Image { get; set; }

        public byte[]? ThumbNailImage { get; set; }

        [StringLength(255)]
        public string? Description { get; set; }

        public bool? CopyToClientImage { get; set; }

        [StringLength(25)]
        public string? CreatedBy { get; set; }

        public DateTime? CreatedOn { get; set; }

        //[Required]
        public string? sImage { get; set; } = default!;

        [StringLength(25)]
        public string? ModifiedBy { get; set; }

        public DateTime? ModifiedOn { get; set; }

        [StringLength(25)]
        public string? DeletedBy { get; set; }

        public DateTime? DeletedOn { get; set; }

        public byte? UpdateCount { get; set; }

        [StringLength(255)]
        public string? MimeType { get; set; }

        [StringLength(1024)]
        public string? FilePath { get; set; }
    }
}
