using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CBS.Entities.Common
{
    public class OldDataRequest<T>
    {
        private string requestid = string.Empty;
        [Required]
        public string RequestId { get => requestid; set => requestid = value; }
        private string formid = string.Empty;
        [Required]
        public string FormId { get => formid; set => formid = value; }
        private T? datajson;
        [Required]
        public T? RequestData { get => datajson; set => datajson = value; }
        [Required]
        public DateTime RequestTime { get; set; } = DateTime.Now;
        private string appname = "PROJECT_KAIRO";
        [Required]
        public string AppName { get => appname; set => appname = value; }
        //[Required]
        private string? checksum = string.Empty;
        public string? Checksum { get => checksum; set => checksum = value; }
    }
}
