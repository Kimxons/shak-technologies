namespace kairo_ui.Models.StaticData
{
    public class BankUserCodeGetRequest
    {
        public string? BankID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public string? ID { get; set; }
    }

    public class BankUserCodeSaveRequest
    {
        public string? BankID { get; set; }
        public string? ID { get; set; }
        public string? OperatedBy { get; set; }
        public string? OperatedOn { get; set; }
        public string? SupervisedBy { get; set; }
        public string? DetailRecords { get; set; }
    }
}