namespace kairo_ui.Models.Identities.ClientSupervision
{
    public class ClientSupervisionBaseRequest
    {
        public string? OperatorID { get; set; }
        public string? OurBranchID { get; set; }
        public string? BankID { get; set; }
    }

    public class ClientSupervisionPendingRequest : ClientSupervisionBaseRequest
    {
        public string? MainModuleID { get; set; }
        public string? BranchList { get; set; }
        public string? SearchKey { get; set; }
    }

    public class ClientSupervisionApprovalRequest : ClientSupervisionBaseRequest
    {
        public string? ClientID { get; set; }
        public string? ApprovedBy { get; set; }
        public string? strSearchKey { get; set; }
    }

    public class ClientSupervisionRejectionRequest : ClientSupervisionBaseRequest
    {
        public string? ClientID { get; set; }
        public string? strSearchkey { get; set; }
        public string? RejectReson { get; set; }
    }

    public class ClientSupervisionClientRequest : ClientSupervisionBaseRequest
    {
        public string? ClientID { get; set; }
        public string? RequestID { get; set; }
    }

    public class BranchListRequest : ClientSupervisionBaseRequest
    {
    }
}
