using CBS.Entities.SystemCore;
using System;
using System.Collections.Generic;

namespace kairo_ui.Models.Dashboard
{
    /// <summary>
    /// Represents a role from the /api/role/resources endpoint
    /// </summary>
    public class RoleInfo
    {
        public int Id { get; set; }
        public string? Name { get; set; }
    }

    /// <summary>
    /// Response from /api/role/resources endpoint
    /// </summary>
    public class RoleResourcesResponse
    {
        public List<RoleInfo> Roles { get; set; } = [];
        public List<string> Resources { get; set; } = [];
        public int TotalResources { get; set; }
    }

    ///// <summary>
    ///// Represents a Main Module from /api/main-modules endpoint
    ///// </summary>
    //public class MainModule
    //{
    //    public short MainModuleID { get; set; }
    //    public short MenuID { get; set; }
    //    public string? Description { get; set; }
    //    public string? ShortCutKey { get; set; }
    //    public byte MainModuleOrder { get; set; }
    //    public bool IsActive { get; set; }
    //    public bool IsMenuItem { get; set; }
    //    public string? LicenseKey { get; set; }
    //    public string? MainModuleIcon { get; set; }
    //}

    ///// <summary>
    ///// Represents a Module from /api/modules endpoint
    ///// </summary>
    //public class Module
    //{
    //    public short ModuleID { get; set; }
    //    public string? ModuleTypeID { get; set; }
    //    public short MainModuleID { get; set; }
    //    public short? LockModuleID { get; set; }
    //    public string? ModuleName { get; set; }
    //    public string? Abbreviation { get; set; }
    //    public bool CanAdd { get; set; }
    //    public bool CanEdit { get; set; }
    //    public bool CanDelete { get; set; }
    //    public bool CanView { get; set; }
    //    public char? SupervisionType { get; set; }
    //    public bool AskSupervision { get; set; }
    //    public bool AskSupervisionLimit { get; set; }
    //    public bool AskCreditLimit { get; set; }
    //    public bool AskDebitLimit { get; set; }
    //    public string? Remarks { get; set; }
    //    public bool IsTrxModule { get; set; }
    //    public bool IsMenuItem { get; set; }
    //    public string? MenuURL { get; set; }
    //    public string? MenuDescription { get; set; }
    //    public short? ParentMenuModuleID { get; set; }
    //    public byte? MenuItemOrder { get; set; }
    //    public string? ShortCutKey { get; set; }
    //    public bool IsDataCenterMenu { get; set; }
    //    public bool IsBankLevelMenu { get; set; }
    //    public string? MenuTypeID { get; set; }
    //    public bool ImplementAccessRights { get; set; }
    //    public bool IsActive { get; set; }
    //    public string? CustomMenuURL { get; set; }
    //    public bool IsModuleConfigurable { get; set; }
    //    public bool IsSwiftMessage { get; set; }
    //    public string? ModuleIcon { get; set; }
    //}

    /// <summary>
    /// Represents a menu item for the start menu
    /// </summary>
    public class StartMenuItem
    {
        public short ModuleID { get; set; }
        public short MainModuleID { get; set; }
        public string? ModuleName { get; set; }
        public string? Abbreviation { get; set; }
        public string? MenuURL { get; set; }
        public string? MenuDescription { get; set; }
        public string? ModuleIcon { get; set; }
        public bool CanAdd { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }
        public bool CanView { get; set; }
        public byte? MenuItemOrder { get; set; }
        public string? ShortCutKey { get; set; }
        public short? ParentMenuModuleID { get; set; }
    }

    /// <summary>
    /// View model for start menu and resources loaded on dashboard
    /// </summary>
    public class StartMenuViewModel
    {
        public List<MainModule> MainModules { get; set; } = [];
        public List<StartMenuItem> MenuItems { get; set; } = [];
        public List<string> AvailableResources { get; set; } = [];
        public List<BranchSetting> UserBranches { get; set; } = [];
        public string? CurrentBranchCode { get; set; }
        public int CurrentBranchId { get; set; }
    }
}
