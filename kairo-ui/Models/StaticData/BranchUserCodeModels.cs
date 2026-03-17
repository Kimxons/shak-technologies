namespace kairo_ui.Models.StaticData
{
    public sealed class BranchUserCodeGetRequest
    {
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public string? ID { get; set; }
    }

    public sealed class BranchUserCodeSaveRequest
    {
        public string? OurBranchID { get; set; }
        public string? ID { get; set; }
        public string? OperatedBy { get; set; }
        public string? OperatedOn { get; set; }
        public string? SupervisedBy { get; set; }
        public string? DetailRecords { get; set; }
    }

    public sealed class BranchUserCodeTypeOption
    {
        public string ID { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }
}