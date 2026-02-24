using CBS.Entities.Common;
using System.ComponentModel.DataAnnotations;

namespace CBS.Entities.ClientMaintenance
{
    public partial class ClientCorporate : AuditDetail
    {
        private string? clientID = string.Empty; [StringLength(40)] public string? ClientID { get => clientID; set => clientID = value; }
        private string? companyName = string.Empty; [Required][StringLength(200)] public string? CompanyName { get => companyName; set => companyName = value; }
        private string? registrationDate = string.Empty; public string? RegistrationDate { get => registrationDate; set => registrationDate = value; }
        private string? registrationNumber = string.Empty; [Required][StringLength(50)] public string? RegistrationNumber { get => registrationNumber; set => registrationNumber = value; }
        private string? registratedAt = string.Empty; public string? RegistratedAt { get => registratedAt; set => registratedAt = value; }
        private string? registeredOffice = string.Empty; public string? RegisteredOffice { get => registeredOffice; set => registeredOffice = value; }
        private string? businessDescription = string.Empty; public string? BusinessDescription { get => businessDescription; set => businessDescription = value; }
        private string? website = string.Empty; public string? Website { get => website; set => website = value; }
        private string? identificationTypeID = string.Empty; [Required][StringLength(50)] public string? IdentificationTypeID { get => identificationTypeID; set => identificationTypeID = value; }
        private string? corporateIssueBy = string.Empty; public string? CorporateIssueBy { get => corporateIssueBy; set => corporateIssueBy = value; }
        private string? corporateIssueDate = string.Empty; public string? CorporateIssueDate { get => corporateIssueDate; set => corporateIssueDate = value; }
        private string? corporateExpireDate = string.Empty; public string? CorporateExpireDate { get => corporateExpireDate; set => corporateExpireDate = value; }
        private string? buisnesslinedescription = string.Empty; public string? Buisnesslinedescription { get => buisnesslinedescription; set => buisnesslinedescription = value; }
        private string? countryofincorporation = string.Empty; public string? Countryofincorporation { get => countryofincorporation; set => countryofincorporation = value; }
        private string? corporateTinnumber = string.Empty; public string? CorporateTinnumber { get => corporateTinnumber; set => corporateTinnumber = value; }
        private string? businessLineID = string.Empty; public string? BusinessLineID { get => businessLineID; set => businessLineID = value; }
        private string? businessOwnershipID = string.Empty; public string? BusinessOwnershipID { get => businessOwnershipID; set => businessOwnershipID = value; }
        private string? vATRegNumber = string.Empty; public string? VATRegNumber { get => vATRegNumber; set => vATRegNumber = value; }
        private string? vATRegDate = string.Empty; public string? VATRegDate { get => vATRegDate; set => vATRegDate = value; }

        private string? extraDetails = string.Empty;

        /// <summary>
        /// [{"id":1,"name":"","value":""}]
        /// </summary>
        public string? ExtraDetails { get => extraDetails; set => extraDetails = value; }

    }
}
