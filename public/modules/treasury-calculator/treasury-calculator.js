// Treasury Calculator - Main JavaScript

// DOM Elements
const calculateBtn = document.getElementById('calculateBtn');
const cancelBtn = document.getElementById('cancelBtn');

// Form Elements - Inputs
const securityType = document.getElementById('securityType');
const faceValue = document.getElementById('faceValue');
const couponRate = document.getElementById('couponRate');
const quotedYield = document.getElementById('quotedYield');
const maturity = document.getElementById('maturity');

// Form Elements - Results
const offerPrice = document.getElementById('offerPrice');
const offerPayment = document.getElementById('offerPayment');
const discountAmount = document.getElementById('discountAmount');
const premiumAmount = document.getElementById('premiumAmount');
const interest = document.getElementById('interest');
const taxAmount = document.getElementById('taxAmount');
const totalOfferPayment = document.getElementById('totalOfferPayment');

// Constants
const TAX_RATE = 0.15; // 15% withholding tax
const DAYS_IN_YEAR = 365;

// Event Listeners
calculateBtn.addEventListener('click', calculate);
cancelBtn.addEventListener('click', resetForm);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Form is ready
});

function calculate() {
    // Validate inputs
    if (!securityType.value) {
        showMessage('Please select a security type', 'warning');
        securityType.focus();
        return;
    }

    if (!faceValue.value || parseFloat(faceValue.value) <= 0) {
        showMessage('Please enter a valid face value', 'warning');
        faceValue.focus();
        return;
    }

    if (!maturity.value || parseInt(maturity.value) <= 0) {
        showMessage('Please enter a valid maturity period', 'warning');
        maturity.focus();
        return;
    }

    // Get input values
    const face = parseFloat(faceValue.value);
    const coupon = parseFloat(couponRate.value) || 0;
    const yield_rate = parseFloat(quotedYield.value) || 0;
    const days = parseInt(maturity.value);

    // Calculate based on security type
    const type = securityType.value;
    let results;

    if (type === 'bills') {
        results = calculateTreasuryBill(face, yield_rate, days);
    } else if (type === 'bonds') {
        results = calculateTreasuryBond(face, coupon, yield_rate, days);
    } else if (type === 'zero-coupon-bonds') {
        results = calculateZeroCouponBond(face, yield_rate, days);
    } else {
        showMessage('Please select a security type', 'warning');
        return;
    }

    // Display results
    displayResults(results);
}

function calculateTreasuryBill(faceVal, yieldRate, days) {
    // Treasury Bill calculation (discount instrument)
    const discountFactor = (yieldRate / 100) * (days / DAYS_IN_YEAR);
    const discount = faceVal * discountFactor;
    const price = faceVal - discount;
    const interestAmount = faceVal - price;
    const tax = interestAmount * TAX_RATE;
    const payment = price;
    const totalPayment = payment;

    return {
        offerPrice: price,
        offerPayment: payment,
        discountAmount: discount,
        premiumAmount: 0,
        interest: interestAmount,
        taxAmount: tax,
        totalOfferPayment: totalPayment
    };
}

function calculateTreasuryBond(faceVal, couponRate, yieldRate, days) {
    // Treasury Bond/Note calculation (coupon instrument)
    const years = days / DAYS_IN_YEAR;
    const couponPayment = faceVal * (couponRate / 100) * years;
    
    // Simple pricing formula
    let price;
    if (yieldRate === couponRate || yieldRate === 0) {
        price = faceVal;
    } else if (yieldRate > couponRate) {
        // Discount bond
        const discountFactor = (yieldRate - couponRate) / 100 * years;
        price = faceVal * (1 - discountFactor);
    } else {
        // Premium bond
        const premiumFactor = (couponRate - yieldRate) / 100 * years;
        price = faceVal * (1 + premiumFactor);
    }

    const discount = price < faceVal ? faceVal - price : 0;
    const premium = price > faceVal ? price - faceVal : 0;
    const tax = couponPayment * TAX_RATE;
    const payment = price;
    const totalPayment = payment;

    return {
        offerPrice: price,
        offerPayment: payment,
        discountAmount: discount,
        premiumAmount: premium,
        interest: couponPayment,
        taxAmount: tax,
        totalOfferPayment: totalPayment
    };
}

function calculateCommercialPaper(faceVal, yieldRate, days) {
    // Commercial Paper calculation (similar to T-Bill)
    const discountFactor = (yieldRate / 100) * (days / DAYS_IN_YEAR);
    const discount = faceVal * discountFactor;
    const price = faceVal - discount;
    const interestAmount = faceVal - price;
    const tax = interestAmount * TAX_RATE;
    const payment = price;
    const totalPayment = payment;

    return {
        offerPrice: price,
        offerPayment: payment,
        discountAmount: discount,
        premiumAmount: 0,
        interest: interestAmount,
        taxAmount: tax,
        totalOfferPayment: totalPayment
    };
}

function calculateZeroCouponBond(faceVal, yieldRate, days) {
    // Zero Coupon Bond calculation (no coupon payments, sold at discount)
    const years = days / DAYS_IN_YEAR;
    const discountFactor = Math.pow(1 + (yieldRate / 100), years);
    const price = faceVal / discountFactor;
    const discount = faceVal - price;
    const interestAmount = discount;
    const tax = interestAmount * TAX_RATE;
    const payment = price;
    const totalPayment = payment;

    return {
        offerPrice: price,
        offerPayment: payment,
        discountAmount: discount,
        premiumAmount: 0,
        interest: interestAmount,
        taxAmount: tax,
        totalOfferPayment: totalPayment
    };
}

function displayResults(results) {
    offerPrice.value = formatCurrency(results.offerPrice);
    offerPayment.value = formatCurrency(results.offerPayment);
    discountAmount.value = formatCurrency(results.discountAmount);
    premiumAmount.value = formatCurrency(results.premiumAmount);
    interest.value = formatCurrency(results.interest);
    taxAmount.value = formatCurrency(results.taxAmount);
    totalOfferPayment.value = formatCurrency(results.totalOfferPayment);

    showMessage('Calculation completed successfully', 'success');
}

function resetForm() {
    // Clear all inputs
    securityType.value = '';
    faceValue.value = '';
    couponRate.value = '';
    quotedYield.value = '';
    maturity.value = '';

    // Clear all results
    offerPrice.value = '';
    offerPayment.value = '';
    discountAmount.value = '';
    premiumAmount.value = '';
    interest.value = '';
    taxAmount.value = '';
    totalOfferPayment.value = '';

    showMessage('Form reset successfully', 'info');
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function showMessage(message, type) {
    // Simple alert for now - can be replaced with toast notifications
    const icon = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };

    alert(`${icon[type] || ''} ${message}`);
}
