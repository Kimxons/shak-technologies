#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CBS.Entities.SystemCore
{

    public class SystemBankSetting
    {
        public string? BankID { get; set; }
        public string? BankName { get; set; }
        public string? ShortName { get; set; }
        public string? Address1 { get; set; }
        public string? Address2 { get; set; }
        public string? CityID { get; set; }
        public string? CountryID { get; set; }
        public string? ZipCode { get; set; }
        public string? Phone1 { get; set; }
        public string? Phone2 { get; set; }
        public string? Mobile { get; set; }
        public string? Fax { get; set; }
        public string? EMailID { get; set; }
        public string? BankRegNumber { get; set; }
        public DateTime? AuditedDate { get; set; }
        public bool? IsMicroFinance { get; set; }
        public long? ImageID { get; set; }
        public string? AvailableBalance { get; set; }
        public string? TotalBalance { get; set; }
        public bool? EnforcePasswordPolicy { get; set; }
        public bool? AutoClientID { get; set; }
        public bool? ClientIDFormulaMandatory { get; set; }
        public byte? ClientIDLength { get; set; }
        public bool? AutoAccountID { get; set; }
        public bool? AccountIDFormulaMandatory { get; set; }
        public byte? AccountIDLength { get; set; }
        public bool? AutoGLID { get; set; }
        public bool? GLIDFormulaMandatory { get; set; }
        public byte? GLIDLength { get; set; }
        public bool? AutoReceiptID { get; set; }
        public bool? ReceiptIDFormulaMandatory { get; set; }
        public byte? ReceiptIDLength { get; set; }
        public bool? AutoGroupID { get; set; }
        public bool? GroupIDFormulaMandatory { get; set; }
        public byte? GroupIDLength { get; set; }
        public bool? AutoSubGroupID { get; set; }
        public bool? SubGroupIDFormulaMandatory { get; set; }
        public byte? SubGroupIDLength { get; set; }
        public byte? MaximumLoanCycle { get; set; }
        public string? NameSetting { get; set; }
        public short? ClientIntroducerKnownFor { get; set; }
        public byte? IntroducerMinDealingWithBank { get; set; }
        public byte? MaximumLoansPerClient { get; set; }
        public byte? MinorUptoAge { get; set; }
        public decimal? MaximumInterestRate { get; set; }
        public byte? ValidChequeDays { get; set; }
        public byte? ChequeIDLength { get; set; }
        public string? RoundingID { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public string? SupervisedBy { get; set; }
        public DateTime? SupervisedOn { get; set; }
        public byte? UpdateCount { get; set; }
        public int? MaxFICCAAccounts { get; set; }
        public string? ClientCheckDigitType { get; set; }
        public int? LoanApplicationIDLen { get; set; }
        public byte[]? Digit { get; set; }
        public int? GLAccountLength { get; set; }
        public bool? AutoLimitID { get; set; }
        public bool? LimitIDFormulaMandatory { get; set; }
        public byte? LimitIDLength { get; set; }
        public string? BackUpPath { get; set; }
        public string? CSBankID { get; set; }
        public string? LocalBin { get; set; }
        public int? MinCreditScore { get; set; }
        public decimal? IARate { get; set; }
    }
#nullable disable
}
