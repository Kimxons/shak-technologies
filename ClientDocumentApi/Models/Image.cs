using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClientDocumentApi.Models
{
    [Table("t_Image")]
    public class Image
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public long ImageID { get; set; }

        [StringLength(50)]
        public string? ImageTypeID { get; set; }

        public byte[]? ImageData { get; set; }

        public byte[]? ThumbNailImage { get; set; }

        [StringLength(1000)]
        public string? Description { get; set; }

        [StringLength(25)]
        public string? ClosedBy { get; set; }

        public DateTime? ClosedDate { get; set; }

        [StringLength(50)]
        public string? ImageStatusID { get; set; }

        [StringLength(25)]
        public string? CreatedBy { get; set; }

        public DateTime? CreatedOn { get; set; }

        [StringLength(25)]
        public string? ModifiedBy { get; set; }

        public DateTime? ModifiedOn { get; set; }

        [StringLength(25)]
        public string? SupervisedBy { get; set; }

        public DateTime? SupervisedOn { get; set; }

        public byte? UpdateCount { get; set; }

        public string? sImage { get; set; }

        [StringLength(255)]
        public string? MimeType { get; set; }

        [StringLength(1024)]
        public string? FilePath { get; set; }
    }
}
