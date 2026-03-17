namespace AccountManagement.Modules.StaticData
{
    /// <summary>
    /// DB stored procedure constants for the Static Data module.
    /// Kept here (not in Helpers/SysConstants.cs) to avoid modifying shared infrastructure.
    /// </summary>
    public static class StaticDataDbConstants
    {
        // Location
        public const string GET_LOCATION = "dbo.P_GetLocation";
        public const string ADD_EDIT_LOCATION = "dbo.P_AddEditLocation";
        public const string DELETE_LOCATION = "dbo.P_DeleteLocation";

        // Contact Person
        public const string GET_CONTACT_PERSON = "dbo.P_GetContactPerson";
        public const string ADD_EDIT_CONTACT_PERSON = "dbo.P_AddEditContactPerson";
        public const string DELETE_CONTACT_PERSON = "dbo.P_DeleteContactPerson";

        // Custodian
        public const string GET_CUSTODIAN = "dbo.P_GetCustodian";
        public const string ADD_EDIT_CUSTODIAN = "dbo.P_AddEditCustodian";
        public const string DELETE_CUSTODIAN = "dbo.P_DeleteCustodian";
    }
}
