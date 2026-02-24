namespace kairo_ui.Services
{
    public static class ApiEndpoints
    {
        public const string GET_BRANCHSETTINGS_IAM = "api/BranchSetting";

        public const string GET_SYSTEMBANKSETTINGS = "api/v1/SystemBankSettings/GetSystemBankSetting";
        public const string CREATE_SYSTEMBANKSETTINGS = "api/v1/SystemBankSettings/CreateSystemBankSetting";
        public const string UPDATE_SYSTEMBANKSETTINGS = "api/v1/SystemBankSettings/UpdateSystemBankSetting";
        public const string DELETE_SYSTEMBANKSETTINGS = "api/v1/SystemBankSettings/DeleteSystemBankSetting";



        public const string GET_MAINMODULES = "api/v1/SystemCore/main-modules";
        public const string GET_MODULES = "api/v1/SystemCore/modules";
        public const string GET_DASHBOARDMETRICS = "api/v1/dashboard/metrics";

        public const string ADD_THEME = "api/v1/SystemCore/add-theme";
        public const string GET_EFFECTIVETHEME = "api/v1/SystemCore/effective-theme";
    }
}
