using CBS.Entities.Common;
using System.ComponentModel.DataAnnotations;

namespace CBS.Entities.ClientMaintenance
{
    public partial class ClientMultipleAddress : AuditDetail
    {
        private string? clientID = string.Empty; [StringLength(40)] public string? ClientID { get => clientID; set => clientID = value; }
        private string? addressTypeID = string.Empty; [Required][StringLength(50)] public string? AddressTypeID { get => addressTypeID; set => addressTypeID = value; }
        private string? address1 = string.Empty; [Required][StringLength(40)] public string? Address1 { get => address1; set => address1 = value; }
        private string? address2 = string.Empty; public string? Address2 { get => address2; set => address2 = value; }
        private string? landMark = string.Empty; public string? LandMark { get => landMark; set => landMark = value; }
        private string? cityID = string.Empty; public string? CityID { get => cityID; set => cityID = value; }
        private string? countryID = string.Empty; [StringLength(2)] public string? CountryID { get => countryID; set => countryID = value; }
        private string? zIPCode = string.Empty; public string? ZIPCode { get => zIPCode; set => zIPCode = value; }
        private string? phone1 = string.Empty; [Phone] public string? Phone1 { get => phone1; set => phone1 = value; }
        private string? phone2 = string.Empty; [Phone] public string? Phone2 { get => phone2; set => phone2 = value; }
        private string? mobile = string.Empty; [Phone] public string? Mobile { get => mobile; set => mobile = value; }
        private string? fax = string.Empty; public string? Fax { get => fax; set => fax = value; }
        private string? email = string.Empty; [EmailAddress] public string? Email { get => email; set => email = value; }
        private bool? isMailingAddress = false; [Required] public bool? IsMailingAddress { get => isMailingAddress; set => isMailingAddress = value; }
        private int? updateCount = 0; [Required] public int? UpdateCount { get => updateCount; set => updateCount = value; }

        private string? extraDetails = string.Empty;

        /// <summary>
        /// [{"id":1,"name":"","value":""}]
        /// </summary>
        public string? ExtraDetails { get => extraDetails; set => extraDetails = value; }

    }
}
