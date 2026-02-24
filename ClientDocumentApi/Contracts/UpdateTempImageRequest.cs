using System;

namespace ClientDocumentApi.Contracts
{
    public class UpdateTempImageRequest
    {
        public short? ModuleID { get; set; }

        public long? ImageID { get; set; }

        public string? ImageTypeID { get; set; }

        public string? OurBranchID { get; set; }

        public string? ClientID { get; set; }

        public string? AccountID { get; set; }

        public string? TempClientID { get; set; }

        public string? Description { get; set; }

        public bool? CopyToClientImage { get; set; }

        public string? ModifiedBy { get; set; }
    }
}
