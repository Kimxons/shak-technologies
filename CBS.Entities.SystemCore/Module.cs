using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CBS.Entities.SystemCore
{
    [Table("t_Module")]
    public class Module
    {
        [Key]
        public short ModuleID { get; set; }
        public string? ModuleTypeID { get; set; }
        [ForeignKey("MainModuleID")]
        public short MainModuleID { get; set; }
        public short? LockModuleID { get; set; }
        public string? ModuleName { get; set; }
        public string? Abbreviation { get; set; }
        public bool CanAdd { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }
        public bool CanView { get; set; }
        public char? SupervisionType { get; set; }
        public bool AskSupervision { get; set; }
        public bool AskSupervisionLimit { get; set; }
        public bool AskCreditLimit { get; set; }
        public bool AskDebitLimit { get; set; }
        public string? Remarks { get; set; }
        public bool IsTrxModule { get; set; }
        public bool IsMenuItem { get; set; }
        public string? MenuURL { get; set; }
        public string? MenuDescription { get; set; }
        public short? ParentMenuModuleID { get; set; }
        public byte? MenuItemOrder { get; set; }
        public string? ShortCutKey { get; set; }
        public bool IsDataCenterMenu { get; set; }
        public bool IsBankLevelMenu { get; set; }
        public string? MenuTypeID { get; set; }
        public bool ImplementAccessRights { get; set; }
        public bool IsActive { get; set; }
        public string? CustomMenuURL { get; set; }
        public bool IsModuleConfigurable { get; set; }
        public bool IsSwiftMessage { get; set; }
        public string? ModuleIcon { get; set; }
    }
}
