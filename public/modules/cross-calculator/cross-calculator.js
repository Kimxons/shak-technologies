// Cross Currency Calculator - Main JavaScript

// DOM Elements
const calculateBtn = document.getElementById('calculateBtn');
const cancelBtn = document.getElementById('cancelBtn');

// Form Elements
const rateType = document.getElementById('rateType');
const fromCurrency = document.getElementById('fromCurrency');
const fromCurrencyCode = document.getElementById('fromCurrencyCode');
const fromCurrencySymbol = document.getElementById('fromCurrencySymbol');
const toCurrency = document.getElementById('toCurrency');
const toCurrencyCode = document.getElementById('toCurrencyCode');
const toCurrencySymbol = document.getElementById('toCurrencySymbol');
const fixedAmount = document.getElementById('fixedAmount');
const exchangeRate = document.getElementById('exchangeRate');

// Result Elements
const resultAmount = document.getElementById('resultAmount');
const resultCurrency = document.getElementById('resultCurrency');

// Summary Elements
const summaryRateType = document.getElementById('summaryRateType');
const summaryFromCurrency = document.getElementById('summaryFromCurrency');
const summaryToCurrency = document.getElementById('summaryToCurrency');
const summaryOriginalAmount = document.getElementById('summaryOriginalAmount');
const summaryExchangeRate = document.getElementById('summaryExchangeRate');
const summaryConvertedAmount = document.getElementById('summaryConvertedAmount');

// Event Listeners
calculateBtn.addEventListener('click', calculateConversion);
cancelBtn.addEventListener('click', resetForm);

// Auto-populate currency code and symbol when currency is selected
fromCurrency.addEventListener('change', () => {
    updateCurrencyInfo('from');
    fetchExchangeRate();
});

toCurrency.addEventListener('change', () => {
    updateCurrencyInfo('to');
    fetchExchangeRate();
});

function updateCurrencyInfo(type) {
    const currencySelect = type === 'from' ? fromCurrency : toCurrency;
    const codeInput = type === 'from' ? fromCurrencyCode : toCurrencyCode;
    const symbolInput = type === 'from' ? fromCurrencySymbol : toCurrencySymbol;

    const selectedOption = currencySelect.options[currencySelect.selectedIndex];
    
    if (selectedOption.value) {
        codeInput.value = selectedOption.value;
        symbolInput.value = selectedOption.getAttribute('data-symbol') || '';
    } else {
        codeInput.value = '';
        symbolInput.value = '';
    }
}

function fetchExchangeRate() {
    if (!fromCurrency.value || !toCurrency.value) return;

    if (fromCurrency.value === toCurrency.value) {
        exchangeRate.value = '1.0000';
    } else {
        // Exchange rate fetch functionality - to be implemented with real API
        exchangeRate.value = '';
        showMessage('Exchange rate fetch - connect to backend API', 'info');
    }
}

function calculateConversion() {
    // Validate inputs
    if (!rateType.value) {
        alert('Please select a Rate Type');
        return;
    }

    if (!fromCurrency.value) {
        alert('Please select From Currency');
        return;
    }

    if (!toCurrency.value) {
        alert('Please select To Currency');
        return;
    }

    const amount = parseFloat(fixedAmount.value);
    if (!amount || amount <= 0) {
        alert('Please enter a valid Fixed Amount');
        return;
    }

    const rate = parseFloat(exchangeRate.value);
    if (!rate || rate <= 0) {
        alert('Please enter a valid Exchange Rate');
        return;
    }

    // Calculate conversion
    const convertedAmount = amount * rate;

    // Update result display
    resultAmount.textContent = formatCurrency(convertedAmount);
    resultCurrency.textContent = `${toCurrency.value} (${toCurrencySymbol.value})`;

    // Update summary table
    summaryRateType.textContent = rateType.value;
    summaryFromCurrency.textContent = `${fromCurrency.value} (${fromCurrencySymbol.value})`;
    summaryToCurrency.textContent = `${toCurrency.value} (${toCurrencySymbol.value})`;
    summaryOriginalAmount.textContent = `${fromCurrencySymbol.value} ${formatCurrency(amount)}`;
    summaryExchangeRate.textContent = `1 ${fromCurrency.value} = ${rate} ${toCurrency.value}`;
    summaryConvertedAmount.innerHTML = `<strong>${toCurrencySymbol.value} ${formatCurrency(convertedAmount)}</strong>`;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function resetForm() {
    // Reset all form fields
    rateType.value = '';
    fromCurrency.value = '';
    fromCurrencyCode.value = '';
    fromCurrencySymbol.value = '';
    toCurrency.value = '';
    toCurrencyCode.value = '';
    toCurrencySymbol.value = '';
    fixedAmount.value = '';
    exchangeRate.value = '';

    // Reset results
    resultAmount.textContent = '0.00';
    resultCurrency.textContent = '--';

    // Reset summary
    summaryRateType.textContent = '--';
    summaryFromCurrency.textContent = '--';
    summaryToCurrency.textContent = '--';
    summaryOriginalAmount.textContent = '--';
    summaryExchangeRate.textContent = '--';
    summaryConvertedAmount.innerHTML = '<strong>--</strong>';
}
