namespace kairo_ui.Controllers.StaticData
{
    /// <summary>
    /// API endpoint constants for the Static Data module.
    /// Kept here (not in Services/ApiEndpointConstants.cs) to avoid modifying shared infrastructure.
    /// </summary>
    public static class StaticDataEndpoints
    {
        private const string BASE = "api/v1/StaticData";

        // Location
        public const string GET_LOCATION = BASE + "/GetLocation";
        public const string ADD_EDIT_LOCATION = BASE + "/AddEditLocation";
        public const string DELETE_LOCATION = BASE + "/DeleteLocation";

        // Contact Person
        public const string GET_CONTACT_PERSON = BASE + "/GetContactPerson";
        public const string ADD_EDIT_CONTACT_PERSON = BASE + "/AddEditContactPerson";
        public const string DELETE_CONTACT_PERSON = BASE + "/DeleteContactPerson";

        // Custodian
        public const string GET_CUSTODIAN = BASE + "/GetCustodian";
        public const string ADD_EDIT_CUSTODIAN = BASE + "/AddEditCustodian";
        public const string DELETE_CUSTODIAN = BASE + "/DeleteCustodian";
    }
}
