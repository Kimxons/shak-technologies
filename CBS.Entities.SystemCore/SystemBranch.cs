using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CBS.Entities.SystemCore
{

    /// <summary>
    /// Represents the t_SystemBranchSetting table.
    /// </summary>
    public class SystemBranchSetting
    {
        [Key]
        [Required]
        [StringLength(12)]
        public string OurBranchID { get; set; } = null!;              // BranchID (varchar 12)

        [Required]
        [StringLength(12)]
        public string BankID { get; set; } = null!;                    // BankID (varchar 12)

        [Required]
        [StringLength(200)]
        public string BranchName { get; set; } = null!;                // Names (varchar 200)

        [StringLength(200)]
        public string? ShortName { get; set; }                          // ShortNames (varchar 200, nullable)

        [StringLength(12)]
        public string? ReportingBranchID { get; set; }                  // BranchID (varchar 12, nullable)

        [Required]
        [StringLength(6)]
        public string BranchPrefix { get; set; } = null!;               // nvarchar(6)

        // CurrencyID – assuming int; adjust if needed (could be string)
        public int CurrencyID { get; set; }

        [Required]
        [StringLength(200)]  // assuming Address length
        public string Address1 { get; set; } = null!;                   // Address

        [StringLength(200)]
        public string? Address2 { get; set; }                            // Address (nullable)

        [Required]
        [StringLength(50)]   // UserSubID is varchar(50)
        public string CityID { get; set; } = null!;                     // CityID (UserSubID)

        [Required]
        [StringLength(6)]
        public string CountryID { get; set; } = null!;                  // nvarchar(6)

        [StringLength(10)]
        public string? ZipCode { get; set; }                             // nvarchar(10)

        [Phone]
        [StringLength(20)]
        public string? Phone1 { get; set; }                              // Phone (nullable)

        [Phone]
        [StringLength(20)]
        public string? Phone2 { get; set; }                              // Phone (nullable)

        [Phone]
        [StringLength(20)]
        public string? Mobile { get; set; }                              // Phone (nullable)

        [Phone]
        [StringLength(20)]
        public string? Fax { get; set; }                                 // Fax (nullable)

        [EmailAddress]
        [StringLength(200)]
        public string? EMailID { get; set; }                             // EmailID (varchar 200, nullable)

        [StringLength(50)]
        public string? LicenseNumber { get; set; }                       // nvarchar(50)

        [Column(TypeName = "smalldatetime")]
        public DateTime? AMCExpiryDate { get; set; }

        [Required]
        [DataType(DataType.Currency)]
        public decimal CashLimit { get; set; }                           // Amount (money)

        [Required]
        [DataType(DataType.Currency)]
        public decimal AllowableLargestAmount { get; set; }              // Amount (money)

        public bool IsHeadOffice { get; set; }
        public bool IsClearingCenter { get; set; }
        public byte ClearingDays { get; set; }
        public bool IsLocked { get; set; }
        public bool? IsDataCenter { get; set; }

        [Column(TypeName = "numeric(4,2)")]
        public decimal? TimeZoneDiff { get; set; }

        [Required]
        [Column(TypeName = "smalldatetime")]
        public DateTime AuditedDate { get; set; }

        [Column(TypeName = "smalldatetime")]
        public DateTime? MigrationDate { get; set; }

        // SystemSubID – assumed varchar(50)
        [StringLength(50)]
        public string? HolidayHandlingTypeID { get; set; }               // SystemSubID (nullable)

        [Required]
        [StringLength(30)]   // OperatorID is varchar(30)
        public string CreatedBy { get; set; } = null!;                  // CreatedBy (OperatorID)

        [Required]
        [Column(TypeName = "smalldatetime")]
        public DateTime CreatedOn { get; set; }

        [StringLength(30)]
        public string? ModifiedBy { get; set; }                          // ModifiedBy (OperatorID, nullable)

        [Column(TypeName = "smalldatetime")]
        public DateTime? ModifiedOn { get; set; }

        [StringLength(30)]
        public string? SupervisedBy { get; set; }                        // SupervisedBy (OperatorID, nullable)

        [Column(TypeName = "smalldatetime")]
        public DateTime? SupervisedOn { get; set; }

        public byte UpdateCount { get; set; }

        [StringLength(50)]
        public string? BankRegNumber { get; set; }                       // varchar(50)

        [Column(TypeName = "datetime")]
        public DateTime? LastDividendsPayDate { get; set; }

        public byte? ApportioningPercent { get; set; }
        public bool? ApportionInterest { get; set; }

        [StringLength(50)]
        public string? TaxApportionAccountID { get; set; }               // varchar(50)

        [StringLength(50)]
        public string? InterestApportionAccountID { get; set; }          // varchar(50)

        public byte[]? Digit { get; set; }                                // varbinary(50)

        [DataType(DataType.Currency)]
        public decimal? MinCashAmt { get; set; }                          // money

        [StringLength(12)]
        public string? AlternateBankID { get; set; }                      // varchar(12)

        public bool? IsIBDBranch { get; set; }
    }

    /// <summary>
    /// Represents the t_SystemBranchStatus table.
    /// </summary>
    public class SystemBranchStatus
    {
        [Key]
        [Required]
        [StringLength(12)]
        public string OurBranchID { get; set; } = null!;                  // BranchID (varchar 12)

        // BranchStatus: 1 = online, 0 = offline (from extended property)
        public bool BranchStatus { get; set; }

        public bool IsDayOpen { get; set; }
        public bool IsTrxAllow { get; set; }
        public bool IsReadyForClosing { get; set; }

        [Required]
        [StringLength(1, MinimumLength = 1)]
        public string BranchProcessStatusID { get; set; } = null!;        // char(1)

        [Required]
        [Column(TypeName = "smalldatetime")]
        public DateTime SODDate { get; set; }

        [Required]
        [Column(TypeName = "smalldatetime")]
        public DateTime EODDate { get; set; }

        [Required]
        [Column(TypeName = "smalldatetime")]
        public DateTime CEDate { get; set; }

        [Required]
        [Column(TypeName = "smalldatetime")]
        public DateTime EOMDate { get; set; }

        [Required]
        [Column(TypeName = "smalldatetime")]
        public DateTime EOYDate { get; set; }

        [Required]
        [Column(TypeName = "smalldatetime")]
        public DateTime StartYear { get; set; }

        [Required]
        [Column(TypeName = "smalldatetime")]
        public DateTime EndYear { get; set; }

        [Required]
        [Column(TypeName = "smalldatetime")]
        public DateTime SIDate { get; set; }

        [Column(TypeName = "smalldatetime")]
        public DateTime? SMSChargeAppDate { get; set; }

        [Column(TypeName = "smalldatetime")]
        public DateTime? BHomeDate { get; set; }

        [Column(TypeName = "smalldatetime")]
        public DateTime? BackUpDate { get; set; }

        [Column(TypeName = "smalldatetime")]
        public DateTime? ClgFileGeneratedDate { get; set; }

        [Column(TypeName = "smalldatetime")]
        public DateTime? ClgFileGeneratedDateFCY { get; set; }

        [Column(TypeName = "smalldatetime")]
        public DateTime? ClgFileGeneratedDateUnpaids { get; set; }

        public bool? IsLogging { get; set; }

        [StringLength(200)]
        public string? AMLLicenseNumber { get; set; }                    // varchar(200)
    }

}
