// Deposit Calculator - Main JavaScript

// DOM Elements
const calculateBtn = document.getElementById('calculateBtn');
const cancelBtn = document.getElementById('cancelBtn');

// Form Elements
const depositType = document.getElementById('depositType');
const fixedAmount = document.getElementById('fixedAmount');
const interestRate = document.getElementById('interestRate');
const compoundingFrequency = document.getElementById('compoundingFrequency');
const termType = document.getElementById('termType');
const noOfTerms = document.getElementById('noOfTerms');
const startDate = document.getElementById('startDate');
const maturityDate = document.getElementById('maturityDate');
const numberOfDays = document.getElementById('numberOfDays');
const interestPaymentFrequency = document.getElementById('interestPaymentFrequency');
const interestPayment = document.getElementById('interestPayment');
const isInterestTaxable = document.getElementById('isInterestTaxable');
const taxRate = document.getElementById('taxRate');

// Result Elements
const resultTotalInterest = document.getElementById('resultTotalInterest');
const resultTax = document.getElementById('resultTax');
const resultNetInterest = document.getElementById('resultNetInterest');
const resultMaturityAmount = document.getElementById('resultMaturityAmount');
const scheduleTableBody = document.getElementById('scheduleTableBody');

// Event Listeners
calculateBtn.addEventListener('click', calculateDeposit);
cancelBtn.addEventListener('click', resetForm);

// Auto-calculate maturity date when start date or terms change
startDate.addEventListener('change', calculateMaturityDate);
noOfTerms.addEventListener('input', calculateMaturityDate);
termType.addEventListener('change', calculateMaturityDate);

// Enable/disable tax rate based on checkbox
isInterestTaxable.addEventListener('change', () => {
    taxRate.disabled = !isInterestTaxable.checked;
    if (!isInterestTaxable.checked) {
        taxRate.value = '';
    }
});

// Set default start date to today
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    startDate.value = today;
    taxRate.disabled = true;
});

function calculateMaturityDate() {
    if (!startDate.value || !noOfTerms.value || !termType.value) return;

    const start = new Date(startDate.value);
    const terms = parseInt(noOfTerms.value);
    const type = termType.value;

    let maturity = new Date(start);

    switch(type) {
        case 'Monthly':
            maturity.setMonth(maturity.getMonth() + terms);
            break;
        case 'Quarterly':
            maturity.setMonth(maturity.getMonth() + (terms * 3));
            break;
        case 'Half Yearly':
            maturity.setMonth(maturity.getMonth() + (terms * 6));
            break;
        case 'Yearly':
            maturity.setFullYear(maturity.getFullYear() + terms);
            break;
    }

    maturityDate.value = maturity.toISOString().split('T')[0];

    // Calculate number of days
    const daysDiff = Math.ceil((maturity - start) / (1000 * 60 * 60 * 24));
    numberOfDays.value = daysDiff;
}

function calculateDeposit() {
    // Validate inputs
    const principal = parseFloat(fixedAmount.value);
    const rate = parseFloat(interestRate.value);
    const terms = parseInt(noOfTerms.value);

    if (!depositType.value || !principal || !rate || !terms || !startDate.value) {
        alert('Please fill in all required fields: Deposit Type, Fixed Amount, Interest Rate, No. of Terms, and Start Date');
        return;
    }

    const days = parseInt(numberOfDays.value) || 365;
    const compounding = compoundingFrequency.value || 'Annually';
    const taxable = isInterestTaxable.checked;
    const tax = taxable ? parseFloat(taxRate.value) || 0 : 0;

    // Calculate total interest
    let totalInterest = 0;
    
    // Simple interest calculation (can be enhanced for compound interest)
    if (compounding === 'At Maturity' || !compounding) {
        // Simple interest
        totalInterest = (principal * rate * days) / (365 * 100);
    } else {
        // Compound interest
        const periods = getCompoundingPeriods(compounding, days);
        const ratePerPeriod = rate / (100 * getPeriodsPerYear(compounding));
        totalInterest = principal * (Math.pow(1 + ratePerPeriod, periods) - 1);
    }

    // Calculate tax
    const taxAmount = (totalInterest * tax) / 100;
    const netInterest = totalInterest - taxAmount;
    const maturityAmount = principal + netInterest;

    // Update results
    resultTotalInterest.textContent = formatCurrency(totalInterest);
    resultTax.textContent = formatCurrency(taxAmount);
    resultNetInterest.textContent = formatCurrency(netInterest);
    resultMaturityAmount.textContent = formatCurrency(maturityAmount);

    // Calculate interest payment per frequency
    if (interestPaymentFrequency.value) {
        const paymentPeriods = getPaymentPeriods(interestPaymentFrequency.value, days);
        const paymentAmount = totalInterest / paymentPeriods;
        interestPayment.value = formatCurrency(paymentAmount);
    }

    // Generate schedule
    generateSchedule(principal, rate, days, compounding, taxable, tax);
}

function getCompoundingPeriods(frequency, days) {
    const year = 365;
    switch(frequency) {
        case 'Monthly': return Math.ceil(days / 30);
        case 'Quarterly': return Math.ceil(days / 91);
        case 'Half Yearly': return Math.ceil(days / 182);
        case 'Yearly': return Math.ceil(days / year);
        default: return 1;
    }
}

function getPeriodsPerYear(frequency) {
    switch(frequency) {
        case 'Monthly': return 12;
        case 'Quarterly': return 4;
        case 'Half Yearly': return 2;
        case 'Yearly': return 1;
        default: return 1;
    }
}

function getPaymentPeriods(frequency, days) {
    return getCompoundingPeriods(frequency, days);
}

function generateSchedule(principal, rate, days, compounding, taxable, taxPercentage) {
    scheduleTableBody.innerHTML = '';
    
    const periods = getCompoundingPeriods(interestPaymentFrequency.value || compounding, days);
    const start = new Date(startDate.value);
    let balance = principal;
    const periodsPerYear = getPeriodsPerYear(interestPaymentFrequency.value || compounding);
    const ratePerPeriod = rate / (100 * periodsPerYear);

    for (let i = 1; i <= periods; i++) {
        const row = document.createElement('tr');
        
        const interest = balance * ratePerPeriod;
        const tax = taxable ? (interest * taxPercentage) / 100 : 0;
        const netInterest = interest - tax;
        
        // Calculate payment date
        const paymentDate = new Date(start);
        const daysPerPeriod = Math.floor(days / periods);
        paymentDate.setDate(paymentDate.getDate() + (daysPerPeriod * i));

        row.innerHTML = `
            <td>${i}</td>
            <td>${paymentDate.toLocaleDateString()}</td>
            <td>${formatCurrency(principal)}</td>
            <td>${formatCurrency(interest)}</td>
            <td>${formatCurrency(tax)}</td>
            <td>${formatCurrency(netInterest)}</td>
            <td>${formatCurrency(balance + netInterest)}</td>
        `;
        
        scheduleTableBody.appendChild(row);
        balance += netInterest;
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function resetForm() {
    // Reset all form fields
    depositType.value = '';
    fixedAmount.value = '';
    interestRate.value = '';
    compoundingFrequency.value = '';
    termType.value = '';
    noOfTerms.value = '';
    const today = new Date().toISOString().split('T')[0];
    startDate.value = today;
    maturityDate.value = '';
    numberOfDays.value = '';
    interestPaymentFrequency.value = '';
    interestPayment.value = '';
    isInterestTaxable.checked = false;
    taxRate.value = '';
    taxRate.disabled = true;

    // Reset results
    resultTotalInterest.textContent = '0.00';
    resultTax.textContent = '0.00';
    resultNetInterest.textContent = '0.00';
    resultMaturityAmount.textContent = '0.00';

    // Reset table
    scheduleTableBody.innerHTML = `
        <tr class="empty-row">
            <td colspan="7">No records to display.</td>
        </tr>
    `;
}
