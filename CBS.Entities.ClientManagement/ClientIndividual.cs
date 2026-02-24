using CBS.Entities.Common;
using System.ComponentModel.DataAnnotations;

namespace CBS.Entities.ClientMaintenance
{
    public partial class ClientIndividual : AuditDetail
    {
        private string? clientID = string.Empty; [StringLength(40)] public string? ClientID { get => clientID; set => clientID = value; }
        private string? titleID = string.Empty; [Required][StringLength(50)] public string? TitleID { get => titleID; set => titleID = value; }
        private string? firstName = string.Empty; [Required][StringLength(200)] public string? FirstName { get => firstName; set => firstName = value; }
        private string? lastName = string.Empty; [Required][StringLength(200)] public string? LastName { get => lastName; set => lastName = value; }
        private string? middleName = string.Empty; [StringLength(200)] public string? MiddleName { get => middleName; set => middleName = value; }
        private string? genderID = string.Empty; [StringLength(50)] public string? GenderID { get => genderID; set => genderID = value; }
        private string? nationalityID = string.Empty; [StringLength(50)] public string? NationalityID { get => nationalityID; set => nationalityID = value; }
        private DateTime? dateOfBirth = DateTime.Now.Subtract(TimeSpan.FromDays(6570)).Date; public DateTime? DateOfBirth { get => dateOfBirth; set => dateOfBirth = value; }
        private string? isDOBGiven = string.Empty; public string? IsDOBGiven { get => isDOBGiven; set => isDOBGiven = value; }
        private string? age = string.Empty; public string? Age { get => age; set => age = value; }
        private string? ageAsOn = string.Empty; public string? AgeAsOn { get => ageAsOn; set => ageAsOn = value; }
        private string? bloodGroupID = string.Empty; public string? BloodGroupID { get => bloodGroupID; set => bloodGroupID = value; }
        private string? canDonateBlood = string.Empty; public string? CanDonateBlood { get => canDonateBlood; set => canDonateBlood = value; }
        private string? residentID = string.Empty; [StringLength(50)] public string? ResidentID { get => residentID; set => residentID = value; }
        private string? literacyLevelID = string.Empty; [StringLength(50)] public string? LiteracyLevelID { get => literacyLevelID; set => literacyLevelID = value; }
        private string? passportNo = string.Empty; [StringLength(50)] public string? PassportNo { get => passportNo; set => passportNo = value; }
        private string? passportIssuedCityID = string.Empty; [StringLength(50)] public string? PassportIssuedCityID { get => passportIssuedCityID; set => passportIssuedCityID = value; }
        private string? passportExpiryDate = string.Empty; public string? PassportExpiryDate { get => passportExpiryDate; set => passportExpiryDate = value; }
        private string? maritalStatusID = string.Empty; [StringLength(50)] public string? MaritalStatusID { get => maritalStatusID; set => maritalStatusID = value; }
        private string? spouseID = string.Empty; [StringLength(40)] public string? SpouseID { get => spouseID; set => spouseID = value; }
        private string? nextOfKinID = string.Empty; [StringLength(40)] public string? NextOfKinID { get => nextOfKinID; set => nextOfKinID = value; }
        private string? numberOfHouseMembers = string.Empty; public string? NumberOfHouseMembers { get => numberOfHouseMembers; set => numberOfHouseMembers = value; }
        private string? numberOfChildren = string.Empty; public string? NumberOfChildren { get => numberOfChildren; set => numberOfChildren = value; }
        private string? numberOfDependents = string.Empty; public string? NumberOfDependents { get => numberOfDependents; set => numberOfDependents = value; }
        private bool? isSalaried = false; public bool? IsSalaried { get => isSalaried; set => isSalaried = value; }
        private string? occupationID = string.Empty; [StringLength(50)] public string? OccupationID { get => occupationID; set => occupationID = value; }
        private string? designationID = string.Empty; [StringLength(50)] public string? DesignationID { get => designationID; set => designationID = value; }
        private string? companyTypeID = string.Empty; [StringLength(50)] public string? CompanyTypeID { get => companyTypeID; set => companyTypeID = value; }
        private string? employerName = string.Empty; [StringLength(200)] public string? EmployerName { get => employerName; set => employerName = value; }
        private string? workingSince = string.Empty; public string? WorkingSince { get => workingSince; set => workingSince = value; }
        private string? salary = string.Empty; public string? Salary { get => salary; set => salary = value; }
        private string? familyIncome = string.Empty; public string? FamilyIncome { get => familyIncome; set => familyIncome = value; }
        private string? otherIncome = string.Empty; public string? OtherIncome { get => otherIncome; set => otherIncome = value; }
        private string? rentExpense = string.Empty; public string? RentExpense { get => rentExpense; set => rentExpense = value; }
        private string? otherExpenses = string.Empty; public string? OtherExpenses { get => otherExpenses; set => otherExpenses = value; }
        private string? workPermitNo = string.Empty; public string? WorkPermitNo { get => workPermitNo; set => workPermitNo = value; }
        private string? employerCode = string.Empty; public string? EmployerCode { get => employerCode; set => employerCode = value; }
        private string? identificationTypeID = string.Empty; [Required][StringLength(50)] public string? IdentificationTypeID { get => identificationTypeID; set => identificationTypeID = value; }
        private string? ourBranchIDMig = string.Empty; public string? OurBranchIDMig { get => ourBranchIDMig; set => ourBranchIDMig = value; }
        private string? employeeID = string.Empty; public string? EmployeeID { get => employeeID; set => employeeID = value; }
        private string? nationality = string.Empty; [StringLength(50)] public string? Nationality { get => nationality; set => nationality = value; }
        private string? position = string.Empty; public string? Position { get => position; set => position = value; }
        private string? averageMonthlyIncome = string.Empty; public string? AverageMonthlyIncome { get => averageMonthlyIncome; set => averageMonthlyIncome = value; }
        private string? averageAnnualIncome = string.Empty; public string? AverageAnnualIncome { get => averageAnnualIncome; set => averageAnnualIncome = value; }
        private string? passportIssueDate = string.Empty; public string? PassportIssueDate { get => passportIssueDate; set => passportIssueDate = value; }
        private string? occupationdescription = string.Empty; public string? Occupationdescription { get => occupationdescription; set => occupationdescription = value; }
        private string? designationdescription = string.Empty; public string? Designationdescription { get => designationdescription; set => designationdescription = value; }
        private string? companytypedescription = string.Empty; public string? Companytypedescription { get => companytypedescription; set => companytypedescription = value; }

        private string? extraDetails = string.Empty;

        /// <summary>
        /// [{"id":1,"name":"","value":""}]
        /// </summary>
        public string? ExtraDetails { get => extraDetails; set => extraDetails = value; }

    }
}
