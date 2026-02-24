using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace ClientDocumentApi.Contracts
{
    public class ReplaceImageRequest
    {
        [Required]
        public IFormFile File { get; set; } = default!;

        public string? ModifiedBy { get; set; }
    }
}
