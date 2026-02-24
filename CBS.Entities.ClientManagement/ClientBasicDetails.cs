using CBS.Entities.Common;
using System.ComponentModel.DataAnnotations;

namespace CBS.Entities.ClientMaintenance
{
    public partial class ClientBasicDetails : AuditDetail
    {
        private string? clientID = string.Empty; [StringLength(40)] public string? ClientID { get => clientID; set => clientID = value; }
        private string? clientTypeID = string.Empty; [Required][StringLength(50)] public string? ClientTypeID { get => clientTypeID; set => clientTypeID = value; }
        private string? name = string.Empty; [StringLength(200)] public string? Name { get => name; set => name = value; }
        private string? totalLimit = string.Empty; public string? TotalLimit { get => totalLimit; set => totalLimit = value; }
        private string? addressTypeID = string.Empty; public string? AddressTypeID { get => addressTypeID; set => addressTypeID = value; }
        private string? address1 = string.Empty; public string? Address1 { get => address1; set => address1 = value; }
        private string? address2 = string.Empty; public string? Address2 { get => address2; set => address2 = value; }
        private string? cityID = string.Empty; public string? CityID { get => cityID; set => cityID = value; }
        private string? countryID = string.Empty; public string? CountryID { get => countryID; set => countryID = value; }
        private string? zipcode = string.Empty; public string? Zipcode { get => zipcode; set => zipcode = value; }
        private string? phone1 = string.Empty; public string? Phone1 { get => phone1; set => phone1 = value; }
        private string? phone2 = string.Empty; public string? Phone2 { get => phone2; set => phone2 = value; }
        private string? mobile = string.Empty; public string? Mobile { get => mobile; set => mobile = value; }
        private string? fax = string.Empty; public string? Fax { get => fax; set => fax = value; }
        private string? email = string.Empty; public string? Email { get => email; set => email = value; }
        private string? photoID = string.Empty; public string? PhotoID { get => photoID; set => photoID = value; }
        private string? signID = string.Empty; public string? SignID { get => signID; set => signID = value; }
        private string? notes = string.Empty; public string? Notes { get => notes; set => notes = value; }
        private string? iD1 = string.Empty; public string? ID1 { get => iD1; set => iD1 = value; }
        private string? iD2 = string.Empty; public string? ID2 { get => iD2; set => iD2 = value; }
        private string? canSendGreetings = string.Empty; public string? CanSendGreetings { get => canSendGreetings; set => canSendGreetings = value; }
        private string? canSendOurSpecialOffers = string.Empty; public string? CanSendOurSpecialOffers { get => canSendOurSpecialOffers; set => canSendOurSpecialOffers = value; }
        private string? canSendAssociateSpecialOffer = string.Empty; public string? CanSendAssociateSpecialOffer { get => canSendAssociateSpecialOffer; set => canSendAssociateSpecialOffer = value; }
        private string? eStatementRequired = string.Empty; public string? EStatementRequired { get => eStatementRequired; set => eStatementRequired = value; }
        private string? mobileAlertRequired = string.Empty; public string? MobileAlertRequired { get => mobileAlertRequired; set => mobileAlertRequired = value; }
        private string? noOfEmployee = string.Empty; public string? NoOfEmployee { get => noOfEmployee; set => noOfEmployee = value; }
        private string? businessLineID = string.Empty; public string? BusinessLineID { get => businessLineID; set => businessLineID = value; }
        private string? businessOwnershipID = string.Empty; public string? BusinessOwnershipID { get => businessOwnershipID; set => businessOwnershipID = value; }
        private string? businessStartedYear = string.Empty; public string? BusinessStartedYear { get => businessStartedYear; set => businessStartedYear = value; }
        private string? openedBy = string.Empty; public string? OpenedBy { get => openedBy; set => openedBy = value; }
        private string? openedDate = string.Empty; public string? OpenedDate { get => openedDate; set => openedDate = value; }
        private string? openApprovedBy = string.Empty; public string? OpenApprovedBy { get => openApprovedBy; set => openApprovedBy = value; }
        private string? openApprovedDate = string.Empty; public string? OpenApprovedDate { get => openApprovedDate; set => openApprovedDate = value; }
        private string? closedBy = string.Empty; public string? ClosedBy { get => closedBy; set => closedBy = value; }
        private string? closeDate = string.Empty; public string? CloseDate { get => closeDate; set => closeDate = value; }
        private string? closeReasonID = string.Empty; public string? CloseReasonID { get => closeReasonID; set => closeReasonID = value; }
        private string? closeReason = string.Empty; public string? CloseReason { get => closeReason; set => closeReason = value; }
        private string? clientStatusID = string.Empty; public string? ClientStatusID { get => clientStatusID; set => clientStatusID = value; }
        private string? comments = string.Empty; public string? Comments { get => comments; set => comments = value; }
        private string? isExpired = string.Empty; public string? IsExpired { get => isExpired; set => isExpired = value; }
        private string? applicationID = string.Empty; public string? ApplicationID { get => applicationID; set => applicationID = value; }
        private string? updateCount = string.Empty; public string? UpdateCount { get => updateCount; set => updateCount = value; }
        private string? clientClassID = string.Empty; public string? ClientClassID { get => clientClassID; set => clientClassID = value; }
        private string? baseid = string.Empty; public string? Base { get => baseid; set => baseid = value; }
        private string? digit = string.Empty; public string? Digit { get => digit; set => digit = value; }
        private string? isModified = string.Empty; public string? IsModified { get => isModified; set => isModified = value; }
        private string? bioID = string.Empty; public string? BioID { get => bioID; set => bioID = value; }
        private string? workFlowID = string.Empty; public string? WorkFlowID { get => workFlowID; set => workFlowID = value; }
        private string? wFStageID = string.Empty; public string? WFStageID { get => wFStageID; set => wFStageID = value; }
        private string? isExported = string.Empty; public string? IsExported { get => isExported; set => isExported = value; }
        private string? exportedOn = string.Empty; public string? ExportedOn { get => exportedOn; set => exportedOn = value; }
        private string? languageID = string.Empty; public string? LanguageID { get => languageID; set => languageID = value; }
        private string? placeOfBirth = string.Empty; public string? PlaceOfBirth { get => placeOfBirth; set => placeOfBirth = value; }
        private string? recommendedBy = string.Empty; public string? RecommendedBy { get => recommendedBy; set => recommendedBy = value; }
        private string? knowFrom = string.Empty; public string? KnowFrom { get => knowFrom; set => knowFrom = value; }
        private string? bankID = string.Empty; public string? BankID { get => bankID; set => bankID = value; }
        private string? exportStatusID = string.Empty; public string? ExportStatusID { get => exportStatusID; set => exportStatusID = value; }
        private string? legacyClientID = string.Empty; public string? LegacyClientID { get => legacyClientID; set => legacyClientID = value; }
        private string? relationshipManagerID = string.Empty; public string? RelationshipManagerID { get => relationshipManagerID; set => relationshipManagerID = value; }
        private string? ourBranchIDMig = string.Empty; public string? OurBranchIDMig { get => ourBranchIDMig; set => ourBranchIDMig = value; }
        private string? subCityID = string.Empty; public string? SubCityID { get => subCityID; set => subCityID = value; }
        private string? regionID = string.Empty; public string? RegionID { get => regionID; set => regionID = value; }
        private string? wereda = string.Empty; public string? Wereda { get => wereda; set => wereda = value; }
        private string? kebele = string.Empty; public string? Kebele { get => kebele; set => kebele = value; }
        private string? houseNo = string.Empty; public string? HouseNo { get => houseNo; set => houseNo = value; }
        private string? tINNumber = string.Empty; public string? TINNumber { get => tINNumber; set => tINNumber = value; }
        
        private string? extraDetails = string.Empty;

        /// <summary>
        /// [{"id":1,"name":"","value":""}]
        /// </summary>
        public string? ExtraDetails { get => extraDetails; set => extraDetails = value; }

    }
}
