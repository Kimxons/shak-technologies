using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ClientDocumentApi.Contracts
{
    public partial class InData<T>
    {
        [Required]
        private string requestid = string.Empty;
        public string RequestId { get => requestid; set => requestid = value; }
        [Required]
        private string formid = string.Empty;
        public string FormID { get => formid; set => formid = value; }
        [Required]
        public T? RequestData { get; set; }
        [Required]
        public DateTime RequestTime { get; set; }
        [Required]
        private string appname = string.Empty;
        public string AppName { get => appname; set => appname = value; }
        private string? checksum = string.Empty;
        public string? CheckSum { get => checksum; set => checksum = value; }
    }
}
