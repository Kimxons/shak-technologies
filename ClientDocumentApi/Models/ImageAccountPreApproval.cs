using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClientDocumentApi.Models
{
    [Table("t_ImageAccountPreApproval")]
    public class ImageAccountPreApproval
    {
        [Key]
        public long ImageID { get; set; }

        [Required]
        [StringLength(50)]
        public string ImageTypeID { get; set; } = default!;

        [Required]
        [StringLength(40)]
        public string ClientID { get; set; } = default!;

        [Required]
        public byte[]? Image { get; set; }

        public byte[]? ThumbNailImage { get; set; }

        [StringLength(255)]
        public string? Description { get; set; }

        public bool IsClosed { get; set; }

        [Required]
        [StringLength(25)]
        public string CreatedBy { get; set; } = default!;

        [Required]
        public DateTime? CreatedOn { get; set; }

        [StringLength(25)]
        public string? SupervisedBy { get; set; }

        public DateTime? SupervisedOn { get; set; }

        public string? sImage { get; set; }

        public byte[]? Digit { get; set; }

        public bool IsModified { get; set; }

        [StringLength(12)]
        public string? OurBranchID { get; set; }

        [StringLength(255)]
        public string? MimeType { get; set; }

        [StringLength(1024)]
        public string? FilePath { get; set; }
    }
}
