using System.ComponentModel.DataAnnotations;

namespace kairo_ui.Models.StaticData.ChangeOfficerPortfolio
{
    public sealed class ChangeOfficerPortfolioOfficerRequest
    {
        [Required]
        public string OfficerID { get; set; } = string.Empty;

        public string? BranchID { get; set; }
        public string? BankID { get; set; }
    }

    public sealed class ChangeOfficerPortfolioTransferRequest
    {
        [Required]
        public string BranchID { get; set; } = string.Empty;

        [Required]
        public string OfficerID { get; set; } = string.Empty;

        [Required]
        public string SignInOfficerID { get; set; } = string.Empty;

        public string? PortfolioType { get; set; }
        public string? FromGroupID { get; set; }
        public string? ToGroupID { get; set; }
        public string? EffectiveDate { get; set; }
        public List<ChangeOfficerPortfolioCenterSelection> Centers { get; set; } = [];
    }

    public sealed class ChangeOfficerPortfolioPortfolioRequest
    {
        [Required]
        public string BranchID { get; set; } = string.Empty;

        [Required]
        public string OfficerID { get; set; } = string.Empty;

        public List<ChangeOfficerPortfolioCenterSelection> Centers { get; set; } = [];
    }

    public sealed class ChangeOfficerPortfolioCenterSelection
    {
        [Required]
        public string CenterID { get; set; } = string.Empty;

        public string? CenterName { get; set; }
        public int? UpdateCount { get; set; }
    }

    public sealed class ChangeOfficerPortfolioContext
    {
        public string BranchID { get; set; } = string.Empty;
        public string OperatorID { get; set; } = string.Empty;
        public string AppName { get; set; } = string.Empty;
        public string BankID { get; set; } = "00";
    }

    public sealed class ChangeOfficerPortfolioOfficerSummary
    {
        public string BankID { get; set; } = string.Empty;
        public string OfficerID { get; set; } = string.Empty;
        public string OfficerName { get; set; } = string.Empty;
        public string OfficerTypeID { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string AssignedBranchID { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public string RestrictedPeriodID { get; set; } = string.Empty;
        public string RestrictedPeriod { get; set; } = string.Empty;
        public string NumberOfLoans { get; set; } = string.Empty;
        public string RestrictedAmount { get; set; } = string.Empty;
        public string IsAllowToDelete { get; set; } = string.Empty;
        public string ErrorMessage { get; set; } = string.Empty;
        public string IsBaseBranch { get; set; } = string.Empty;
        public string IsDisbursementRestriction { get; set; } = string.Empty;
        public string CreatedBy { get; set; } = string.Empty;
        public string CreatedOn { get; set; } = string.Empty;
        public string ModifiedBy { get; set; } = string.Empty;
        public string ModifiedOn { get; set; } = string.Empty;
        public string SupervisedBy { get; set; } = string.Empty;
        public string SupervisedOn { get; set; } = string.Empty;
        public string UpdateCount { get; set; } = string.Empty;
    }

    public sealed class ChangeOfficerPortfolioTransferResult
    {
        public int SuccessCount { get; set; }
        public int ErrorCount { get; set; }
        public List<string> Errors { get; set; } = [];
    }

    public sealed class ChangeOfficerPortfolioPortfolioResult
    {
        public List<ChangeOfficerPortfolioCenterSelection> Centers { get; set; } = [];
    }
}