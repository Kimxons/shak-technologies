namespace kairo_ui.Models.Identities.RejectLog
{
    public class RejectLogRequest
    {
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
    }

    public class CloseRejectClientRequest
    {
        public string? OurBranchID { get; set; }
        public string? ClientID { get; set; }
        public string? OperatorID { get; set; }
        public string? RejectReson { get; set; }
    }

    public class ResendRejectClientRequest
    {
        public string? OurBranchID { get; set; }
        public string? ClientID { get; set; }
        public string? AccountID { get; set; }
        public string? OperatorID { get; set; }
    }
}
