using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace ClientDocumentApi.Contracts
{
    public class UploadTempImageRequest
    {
        [Required]
        [StringLength(50)]
        public string ImageTypeID { get; set; } = default!;

        [Required]
        public IFormFile File { get; set; } = default!;

        [Required]
        public short? ModuleID { get; set; }

        public long? ImageID { get; set; }

        [StringLength(12)]
        public string? OurBranchID { get; set; }

        [StringLength(40)]
        public string? ClientID { get; set; }

        [StringLength(40)]
        public string? AccountID { get; set; }

        [StringLength(40)]
        public string? TempClientID { get; set; }

        [StringLength(100)]
        public string? RequestID { get; set; }

        [StringLength(255)]
        public string? Description { get; set; }

        public bool? CopyToClientImage { get; set; }
        [Required]
        public string? CreatedBy { get; set; }

        public DateTime? CreatedOn { get; set; } = DateTime.UtcNow;
    }
}
