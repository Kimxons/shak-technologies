using System.ComponentModel.DataAnnotations;

namespace CBS.Entities.Common
{
    public partial class Response
    {
        private string responsecode = string.Empty;
        public string ResponseCode { get => responsecode; set => responsecode = value; }
        private string responsemessage = string.Empty;
        public string ResponseMessage { get => responsemessage; set => responsemessage = value; }
    }
}
