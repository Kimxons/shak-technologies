using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CBS.Entities.Common
{
    public partial class InData
    {
        private string requestid = string.Empty;
        [Required]
        public string RequestId { get => requestid; set => requestid = value; }
        private object? datajson = null;
        [Required]
        public object? RequestData { get => datajson; set => datajson = value; }
        [Required]
        public DateTime RequestTime { get; set; }
        private string appname = string.Empty;
        [Required]
        public string AppName { get => appname; set => appname = value; }
        //[Required]
        private string? checksum = string.Empty;
        public string? Checksum { get => checksum; set => checksum = value; }
    }

}
