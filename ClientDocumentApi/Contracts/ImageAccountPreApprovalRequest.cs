using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace ClientDocumentApi.Contracts
{
    public class UploadImageAccountPreApprovalRequest
    {
        [Required]
        [StringLength(50)]
        public string ImageTypeID { get; set; } = default!;

        [Required]
        [StringLength(40)]
        public string ClientID { get; set; } = default!;

        [Required]
        public IFormFile File { get; set; } = default!;

        [StringLength(255)]
        public string? Description { get; set; }

        [Required]
        public string? CreatedBy { get; set; }

        [Required]
        public DateTime? CreatedOn { get; set; } = DateTime.UtcNow;

        [StringLength(25)]
        public string? SupervisedBy { get; set; }

        public DateTime? SupervisedOn { get; set; }

        public byte[]? Digit { get; set; }

        public string? sImage { get; set; }

        [StringLength(12)]
        public string? OurBranchID { get; set; }
    }

    public class UpdateImageAccountPreApprovalRequest
    {
        [StringLength(255)]
        public string? Description { get; set; }

        [StringLength(25)]
        public string? SupervisedBy { get; set; }

        public DateTime? SupervisedOn { get; set; }

        public bool? IsClosed { get; set; }
    }
}
