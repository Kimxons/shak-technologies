const CM_EMPLOYMENT_BASE = 'Identities/ClientMaintenance/Employment';

function invokeClientMaintenanceEmployment(action, requestData) {
    return window.ClientMaintenanceCore.invokeControllerMethod(CM_EMPLOYMENT_BASE, action, 'POST', requestData || {});
}

window.ClientMaintenanceEmploymentService = {
    get: (requestData) => invokeClientMaintenanceEmployment('get', requestData),
    create: (requestData) => invokeClientMaintenanceEmployment('create', requestData),
    update: (requestData) => invokeClientMaintenanceEmployment('update', requestData),
    delete: (requestData) => invokeClientMaintenanceEmployment('delete', requestData)
};

function initEmploymentValidation() {
    const utils = window.ValidationUtils;
    if (!utils) return;

    // Income type toggle for self-employed section
    const salaryRadio = document.getElementById('rad_incomeSalaried');
    const selfRadio = document.getElementById('rad_incomeSelf');
    const selfEmployedSection = document.getElementById('selfEmployedSection');

    const toggleSelfEmployed = () => {
        if (selfEmployedSection) {
            const isSelfEmployed = selfRadio && selfRadio.checked;
            if (isSelfEmployed) {
                selfEmployedSection.classList.remove('d-none');
            } else {
                selfEmployedSection.classList.add('d-none');
            }
        }
    };

    if (salaryRadio) salaryRadio.addEventListener('change', toggleSelfEmployed);
    if (selfRadio) selfRadio.addEventListener('change', toggleSelfEmployed);

    // Working Since - not future
    const workingSinceInput = document.getElementById('dt_employmentWorkingSince');
    if (workingSinceInput) utils.setupDateField(workingSinceInput, { notFuture: true });

    // Income and expense fields - accounting format
    const monthlyIncomeInput = document.getElementById('txt_employmentMonthlyIncome');
    const annualIncomeInput = document.getElementById('txt_employmentAnnualIncome');
    const otherIncomeInput = document.getElementById('txt_employmentOtherIncome');
    const totalIncomeInput = document.getElementById('txt_employmentTotalIncome');
    const rentExpensesInput = document.getElementById('txt_employmentRentExpenses');
    const otherExpensesInput = document.getElementById('txt_employmentOtherExpenses');
    const totalExpensesInput = document.getElementById('txt_employmentTotalExpenses');
    const netSavingsInput = document.getElementById('txt_employmentNetSavings');

    [monthlyIncomeInput, otherIncomeInput, rentExpensesInput, otherExpensesInput].forEach(input => {
        if (input) utils.applyAccountingFormat(input);
    });

    // Auto-calculate annual income from monthly (monthly * 12)
    const calculateAnnualIncome = () => {
        if (monthlyIncomeInput && annualIncomeInput) {
            const monthly = parseFloat(monthlyIncomeInput.value.replace(/,/g, '')) || 0;
            const annual = monthly * 12;
            annualIncomeInput.value = utils.formatAccounting(annual);
            calculateTotals();
        }
    };

    // Calculate totals
    const calculateTotals = () => {
        const monthly = parseFloat(monthlyIncomeInput?.value.replace(/,/g, '') || 0);
        const other = parseFloat(otherIncomeInput?.value.replace(/,/g, '') || 0);
        const rent = parseFloat(rentExpensesInput?.value.replace(/,/g, '') || 0);
        const otherExp = parseFloat(otherExpensesInput?.value.replace(/,/g, '') || 0);

        const totalInc = monthly + other;
        const totalExp = rent + otherExp;
        const savings = totalInc - totalExp;

        if (totalIncomeInput) totalIncomeInput.value = utils.formatAccounting(totalInc);
        if (totalExpensesInput) totalExpensesInput.value = utils.formatAccounting(totalExp);
        if (netSavingsInput) netSavingsInput.value = utils.formatAccounting(savings);
    };

    if (monthlyIncomeInput) monthlyIncomeInput.addEventListener('blur', calculateAnnualIncome);
    [otherIncomeInput, rentExpensesInput, otherExpensesInput].forEach(input => {
        if (input) input.addEventListener('blur', calculateTotals);
    });

    // Business Started Year - valid year, not future
    const businessYearInput = document.getElementById('txt_employmentBusinessStartedYear');
    if (businessYearInput) {
        utils.restrictNumeric(businessYearInput);
        businessYearInput.addEventListener('blur', () => {
            if (businessYearInput.value && !utils.isValidYear(businessYearInput.value)) {
                utils.showError(businessYearInput, 'Please enter a valid year');
            } else {
                utils.clearError(businessYearInput);
            }
        });
    }

    // Number of employees - numeric, min 0
    const numEmployeesInput = document.getElementById('txt_employmentNumberOfEmployees');
    if (numEmployeesInput) {
        utils.restrictNumeric(numEmployeesInput);
        numEmployeesInput.setAttribute('min', '0');
    }
}

window.initClientMaintenanceEmploymentTab = function (tabRoot, moduleId) {
    bindClientMaintenanceCrud(tabRoot, moduleId, window.ClientMaintenanceEmploymentService, 'employment');
    initEmploymentValidation();
};
