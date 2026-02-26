
namespace kairo_ui.Models.Identities.Client360
{

    public class Client360BaseRequest
    {
        public string? OperatorID { get; set; }
        public string? OurBranchID { get; set; }
        public string? BankID { get; set; }
    }

    public class Client360ValidateRequest : Client360BaseRequest
    {
        public string? ControlTypeID { get; set; }
        public string? ID { get; set; }
        public string? TypeID { get; set; }
        public string? AdvanceFilter { get; set; }
        public string? LanguageID { get; set; }
    }

    public class Client360SearchRequest : Client360BaseRequest
    {
        public string? TableID { get; set; }
        public string? WhereStmt { get; set; }
        public string? PrevOrNext { get; set; }
        public string? RefID { get; set; }
        public string? ModuleID { get; set; }
        public string? AdvFilterString { get; set; }
        public string? SearchKey { get; set; }
        public string? LanguageID { get; set; }
    }

    public class Client360ViewRequest : Client360BaseRequest
    {
        public string? ClientID { get; set; }
    }
}