using CBS.Entities.Common;

namespace CBS.Entities.ClientMaintenance
{
    public partial class ClientEmployment : AuditDetail
    {
        private string? columnID = string.Empty; public string? ColumnID { get => columnID; set => columnID = value; }
        private string? clientID = string.Empty; public string? ClientID { get => clientID; set => clientID = value; }
        private string? employerID = string.Empty; public string? EmployerID { get => employerID; set => employerID = value; }
        private string? departmentCodeID = string.Empty; public string? DepartmentCodeID { get => departmentCodeID; set => departmentCodeID = value; }
        private string? workingSince = string.Empty; public string? WorkingSince { get => workingSince; set => workingSince = value; }
        private string? salary = string.Empty; public string? Salary { get => salary; set => salary = value; }
        private string? familyIncome = string.Empty; public string? FamilyIncome { get => familyIncome; set => familyIncome = value; }
        private string? otherIncome = string.Empty; public string? OtherIncome { get => otherIncome; set => otherIncome = value; }
        private string? rentExpense = string.Empty; public string? RentExpense { get => rentExpense; set => rentExpense = value; }
        private string? otherExpenses = string.Empty; public string? OtherExpenses { get => otherExpenses; set => otherExpenses = value; }
        private string? workPermitNo = string.Empty; public string? WorkPermitNo { get => workPermitNo; set => workPermitNo = value; }
        private string? employerCode = string.Empty; public string? EmployerCode { get => employerCode; set => employerCode = value; }
        private string? averageMonthlyIncome = string.Empty; public string? AverageMonthlyIncome { get => averageMonthlyIncome; set => averageMonthlyIncome = value; }
        private string? averageAnnualIncome = string.Empty; public string? AverageAnnualIncome { get => averageAnnualIncome; set => averageAnnualIncome = value; }
        private string? occupationdescription = string.Empty; public string? Occupationdescription { get => occupationdescription; set => occupationdescription = value; }
        private string? designationDescription = string.Empty; public string? DesignationDescription { get => designationDescription; set => designationDescription = value; }
        private string? companytypeDescription = string.Empty; public string? CompanytypeDescription { get => companytypeDescription; set => companytypeDescription = value; }
        private string? updateCount = string.Empty; public string? UpdateCount { get => updateCount; set => updateCount = value; }

        private string? extraDetails = string.Empty;

        /// <summary>
        /// [{"id":1,"name":"","value":""}]
        /// </summary>
        public string? ExtraDetails { get => extraDetails; set => extraDetails = value; }

    }
}
