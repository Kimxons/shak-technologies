namespace kairo_ui.Models.Identities.ClientApproval
{
    /// <summary>
    /// Base request model for Client Approval operations
    /// </summary>
    public class ClientApprovalBaseRequest
    {
        public string? OperatorID { get; set; }
        public string? OurBranchID { get; set; }
        public string? BankID { get; set; }
    }

    /// <summary>
    /// Request model for getting pending approvals
    /// </summary>
    public class ClientApprovalFilterRequest : ClientApprovalBaseRequest
    {
        public string? LogInBranchID { get; set; }
        public string? GroupID { get; set; }
        public string? ClientTypeID { get; set; }
        public string? ClientID { get; set; }
    }

    /// <summary>
    /// Request model for getting client approval details
    /// </summary>
    public class ClientApprovalDetailRequest : ClientApprovalFilterRequest
    {
    }

    /// <summary>
    /// Request model for getting status reasons/workflow fields
    /// </summary>
    public class StatusReasonsRequest : ClientApprovalBaseRequest
    {
        public string? RequestID { get; set; }
        public string? FormId { get; set; }
        public string? WorkflowID { get; set; }
    }

    /// <summary>
    /// Request model for approving clients
    /// </summary>
    public class ClientApprovalActionRequest : ClientApprovalBaseRequest
    {
        public string? ApprovedBy { get; set; }
        public string? ApprovedOn { get; set; }
        public string? DetailRecords { get; set; } // XML of clients to approve
    }

    /// <summary>
    /// Request model for rejecting clients
    /// </summary>
    public class ClientApprovalRejectionRequest : ClientApprovalBaseRequest
    {
        public string? RejectedBy { get; set; }
        public string? RejectedReason { get; set; }
        public string? DetailRecords { get; set; } // XML of clients to reject
    }

    /// <summary>
    /// Request model for adding client to supervision queue
    /// </summary>
    public class ClientSupervisionDataRequest : ClientApprovalBaseRequest
    {
        public string? ClientID { get; set; }
        public int ModuleID { get; set; } = 6961;
        public int LockModuleID { get; set; } = 6961;
        public string? Searchkey { get; set; }
        public string? LockKey { get; set; }
        public int EventID { get; set; } = 1;
        public string? NewData { get; set; }
        public string? OldData { get; set; }
        public string? Remarks { get; set; }
        public int NewRecord { get; set; } = 1;
        public string? IPAddress { get; set; }
    }
}
