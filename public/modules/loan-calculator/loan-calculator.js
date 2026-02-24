// Loan Calculator - Main JavaScript

// DOM Elements
const calculateBtn = document.getElementById('calculateBtn');
const cancelBtn = document.getElementById('cancelBtn');
const printBtn = document.getElementById('printBtn');

// Form Elements
const principleAmount = document.getElementById('principleAmount');
const method = document.getElementById('method');
const terms = document.getElementById('terms');
const noOfInstallments = document.getElementById('noOfInstallments');
const interestRate = document.getElementById('interestRate');
const interestCalcPeriod = document.getElementById('interestCalcPeriod');
const interestRounding = document.getElementById('interestRounding');
const repaymentFrequency = document.getElementById('repaymentFrequency');
const installmentRounding = document.getElementById('installmentRounding');
const gracePeriod = document.getElementById('gracePeriod');
const rule78 = document.getElementById('rule78');
const termExcludesGrace = document.getElementById('termExcludesGrace');
const collectInterestDuringGrace = document.getElementById('collectInterestDuringGrace');

// Result Elements
const resultInstallment = document.getElementById('resultInstallment');
const resultInterest = document.getElementById('resultInterest');
const resultLastInstallment = document.getElementById('resultLastInstallment');
const resultTotalPayments = document.getElementById('resultTotalPayments');
const scheduleTableBody = document.getElementById('scheduleTableBody');

// Event Listeners - Calculator Actions
calculateBtn.addEventListener('click', calculateLoan);
printBtn.addEventListener('click', printCalculator);
cancelBtn.addEventListener('click', resetForm);

// Functions
function calculateLoan() {
    // Validate inputs
    const principal = parseFloat(principleAmount.value);
    const rate = parseFloat(interestRate.value);
    const installments = parseInt(noOfInstallments.value);

    if (!principal || !rate || !installments) {
        alert('Please fill in all required fields: Principle Amount, Interest Rate, and Number of Installments');
        return;
    }

    const selectedMethod = method.value;
    const repayFreq = repaymentFrequency.value;
    
    let installmentAmount = 0;
    let totalInterest = 0;
    let lastInstallment = 0;
    let totalPayments = 0;

    // Calculate based on method
    if (selectedMethod === 'Flat') {
        totalInterest = calculateFlatInterest(principal, rate, installments);
        totalPayments = principal + totalInterest;
        installmentAmount = roundValue(totalPayments / installments, installmentRounding.value);
        lastInstallment = totalPayments - (installmentAmount * (installments - 1));
    } else if (selectedMethod === 'Reducing') {
        const result = calculateReducingBalance(principal, rate, installments);
        installmentAmount = result.installment;
        totalInterest = result.totalInterest;
        totalPayments = result.totalPayment;
        lastInstallment = installmentAmount;
    } else {
        // Default to flat for other methods
        totalInterest = calculateFlatInterest(principal, rate, installments);
        totalPayments = principal + totalInterest;
        installmentAmount = roundValue(totalPayments / installments, installmentRounding.value);
        lastInstallment = totalPayments - (installmentAmount * (installments - 1));
    }

    // Update results
    resultInstallment.textContent = formatCurrency(installmentAmount);
    resultInterest.textContent = formatCurrency(totalInterest);
    resultLastInstallment.textContent = formatCurrency(lastInstallment);
    resultTotalPayments.textContent = formatCurrency(totalPayments);

    // Generate schedule
    generateSchedule(principal, rate, installments, installmentAmount, selectedMethod);
}

function calculateFlatInterest(principal, rate, installments) {
    // Simple interest calculation
    const interestPerPeriod = (principal * rate) / 100;
    return roundValue(interestPerPeriod * installments, interestRounding.value);
}

function calculateReducingBalance(principal, rate, installments) {
    // Monthly interest rate
    const monthlyRate = rate / 100 / 12;
    
    // EMI formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
    const installment = principal * monthlyRate * Math.pow(1 + monthlyRate, installments) / 
                       (Math.pow(1 + monthlyRate, installments) - 1);
    
    const roundedInstallment = roundValue(installment, installmentRounding.value);
    const totalPayment = roundedInstallment * installments;
    const totalInterest = totalPayment - principal;

    return {
        installment: roundedInstallment,
        totalPayment: totalPayment,
        totalInterest: roundValue(totalInterest, interestRounding.value)
    };
}

function roundValue(value, roundingType) {
    const roundTo = parseFloat(roundingType.split(' ')[1]);
    
    if (roundingType.startsWith('Nearest')) {
        return Math.round(value / roundTo) * roundTo;
    } else if (roundingType.startsWith('Down')) {
        return Math.floor(value / roundTo) * roundTo;
    }
    
    return Math.round(value * 100) / 100;
}

function generateSchedule(principal, rate, installments, installmentAmount, selectedMethod) {
    scheduleTableBody.innerHTML = '';
    
    let balance = principal;
    const monthlyRate = rate / 100 / 12;

    for (let i = 1; i <= installments; i++) {
        const row = document.createElement('tr');
        
        let interestAmount = 0;
        let principalAmount = 0;
        
        if (selectedMethod === 'Reducing') {
            interestAmount = roundValue(balance * monthlyRate, interestRounding.value);
            principalAmount = installmentAmount - interestAmount;
            balance -= principalAmount;
        } else {
            // Flat method
            interestAmount = roundValue((principal * rate) / 100 / installments, interestRounding.value);
            principalAmount = installmentAmount - interestAmount;
        }

        row.innerHTML = `
            <td>${i}</td>
            <td>${i === 1 ? 'Yes' : 'No'}</td>
            <td>${formatCurrency(installmentAmount)}</td>
            <td>${formatCurrency(principalAmount)}</td>
            <td>${formatCurrency(interestAmount)}</td>
        `;
        
        scheduleTableBody.appendChild(row);
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
    principleAmount.value = '';
    interestRate.value = '';
    noOfInstallments.value = '';
    terms.value = '';
    interestCalcPeriod.value = '';
    repaymentFrequency.value = '';
    gracePeriod.value = '';
    rule78.checked = false;
    termExcludesGrace.checked = false;
    collectInterestDuringGrace.checked = false;

    // Reset results
    resultInstallment.textContent = '0.00';
    resultInterest.textContent = '0.00';
    resultLastInstallment.textContent = '0.00';
    resultTotalPayments.textContent = '0.00';

    // Reset table
    scheduleTableBody.innerHTML = `
        <tr class="empty-row">
            <td colspan="5">No records to display.</td>
        </tr>
    `;
}

function printCalculator() {
    window.print();
}

// Initialize with default values
document.addEventListener('DOMContentLoaded', () => {
    // Set some sensible defaults
    method.value = 'Flat';
    repaymentFrequency.value = 'Yearly';
    interestRounding.value = 'Nearest 0.01';
    installmentRounding.value = 'Nearest 0.01';
});
