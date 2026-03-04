namespace kairo_ui.Models.Identities.ClientMaintenance
{
    public class ClientMaintenanceBaseRequest
    {
        public string? OperatorID { get; set; }
        public string? OurBranchID { get; set; }
        public string? BankID { get; set; }
        public string? ModuleID { get; set; }
        public string? ClientID { get; set; }
    }

    public class ClientMaintenanceValidateRequest : ClientMaintenanceBaseRequest
    {
        public string? ControlTypeID { get; set; }
        public string? ID { get; set; }
        public string? TypeID { get; set; }
        public string? AdvanceFilter { get; set; }
        public string? LanguageID { get; set; }
    }

    public class ClientMaintenanceCrudRequest : ClientMaintenanceBaseRequest
    {
        public string? RecordID { get; set; }
        public Dictionary<string, object?>? Payload { get; set; }
    }
}