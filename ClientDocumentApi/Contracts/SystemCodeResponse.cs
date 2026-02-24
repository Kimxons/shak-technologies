namespace ClientDocumentApi.Contracts
{
    public class SystemCodeResponse
    {
        public string ResponseCode { get; set; } = default!;
        public string? ResponseMessage { get; set; }
        public List<SystemCodeDetail>? Details { get; set; }
    }

    public class SystemCodeDetail
    {
        public string CodeID { get; set; } = default!;
        public string? SubCodeID { get; set; }
        public string? CodeDescription { get; set; }
        public string? ParentCodeID { get; set; }
        public int DisplayOrder { get; set; }
    }
}
