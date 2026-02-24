using System;
using System.ComponentModel.DataAnnotations;

namespace ClientDocumentApi.Contracts
{
    public class CombinedImageAccountResponse
    {
        public long ImageID { get; set; }

        [StringLength(50)]
        public string ImageTypeID { get; set; } = default!;

        [StringLength(40)]
        public string ClientID { get; set; } = default!;

        public byte[]? Image { get; set; }

        public byte[]? ThumbNailImage { get; set; }

        [StringLength(255)]
        public string? Description { get; set; }

        public bool IsClosed { get; set; }

        [StringLength(25)]
        public string CreatedBy { get; set; } = default!;

        public DateTime? CreatedOn { get; set; }

        [StringLength(25)]
        public string? SupervisedBy { get; set; }

        public DateTime? SupervisedOn { get; set; }

        public string? sImage { get; set; }

        public bool IsModified { get; set; }

        [StringLength(255)]
        public string? MimeType { get; set; }

        [StringLength(1024)]
        public string? FilePath { get; set; }

        //public string Source { get; set; } = default!; // "ImageAccount" or "ImageAccountPreApproval"
    }
}
