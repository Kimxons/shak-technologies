using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace ClientDocumentApi.Contracts
{
    public class UploadImageRequest
    {
        public string? ImageTypeID { get; set; }
        
        [Required]
        public IFormFile File { get; set; } = default!;
        
        public string? Description { get; set; }
        public string? ImageStatusID { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
    }
}
