// GL Account Statement View Module JavaScript
// Matching Overdraft Applications functionality

(function() {
    'use strict';

    // DOM Elements
    const form = document.getElementById('statementViewForm');
    const statusMessage = document.getElementById('statusMessage');
    const statementTableBody = document.getElementById('statementTableBody');

    // Form fields
    const statementForField = document.getElementById('statementFor');
    const fromDateField = document.getElementById('fromDate');
    const toDateField = document.getElementById('toDate');
    const reportCurrencyField = document.getElementById('reportCurrency');

    // Initialize module
    function init() {
        attachEventListeners();
        setDefaultDates();
    }

    // Attach event listeners
    function attachEventListeners() {
        // Action buttons
        document.querySelector('[data-action="print"]')?.addEventListener('click', handlePrint);
        document.querySelector('[data-action="view"]')?.addEventListener('click', handleView);
        document.querySelector('[data-action="display-trx"]')?.addEventListener('click', handleDisplayTrx);
        document.querySelector('[data-action="image"]')?.addEventListener('click', handleImage);
        document.querySelector('[data-action="internal-transfer"]')?.addEventListener('click', handleInternalTransfer);
        document.querySelector('[data-action="cancel"]')?.addEventListener('click', handleCancel);
        document.querySelector('[data-action="back"]')?.addEventListener('click', handleBack);

        // Status message close button
        document.querySelector('.status-close')?.addEventListener('click', hideStatus);

        // Statement For dropdown change
        statementForField?.addEventListener('change', handleStatementForChange);

        // Form submission
        form?.addEventListener('submit', handleSubmit);
    }

    // Set default dates
    function setDefaultDates() {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        if (fromDateField && !fromDateField.value) {
            fromDateField.value = formatDateForInput(firstDayOfMonth);
        }
        
        if (toDateField && !toDateField.value) {
            toDateField.value = formatDateForInput(today);
        }
    }

    // Handle statement period change
    function handleStatementForChange(e) {
        const value = e.target.value;
        const today = new Date();
        let fromDate, toDate;

        switch(value) {
            case 'current-month':
                fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
                toDate = today;
                break;
            case 'last-month':
                fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                toDate = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'current-year':
                fromDate = new Date(today.getFullYear(), 0, 1);
                toDate = today;
                break;
            case 'last-year':
                fromDate = new Date(today.getFullYear() - 1, 0, 1);
                toDate = new Date(today.getFullYear() - 1, 11, 31);
                break;
            case 'custom':
                // User will enter custom dates
                return;
            default:
                return;
        }

        if (fromDateField) fromDateField.value = formatDateForInput(fromDate);
        if (toDateField) toDateField.value = formatDateForInput(toDate);
    }

    // Action handlers
    function handlePrint(e) {
        e.preventDefault();
        
        if (!validateDateRange()) {
            return;
        }

        showStatus('Preparing statement for printing...', 'info');
        
        // Simulate print preparation
        setTimeout(() => {
            window.print();
        }, 500);
    }

    function handleView(e) {
        e.preventDefault();
        
        if (!validateDateRange()) {
            return;
        }

        showStatus('Loading statement data...', 'info');
        
        // Simulate loading statement data
        setTimeout(() => {
            loadStatementData();
        }, 500);
    }

    function handleDisplayTrx(e) {
        e.preventDefault();
        
        if (!validateDateRange()) {
            return;
        }

        showStatus('Displaying transaction details...', 'info');
        
        // Simulate loading detailed transactions
        setTimeout(() => {
            loadStatementData(true);
        }, 500);
    }

    function handleImage(e) {
        e.preventDefault();
        showStatus('Image viewer functionality would open here', 'info');
    }

    function handleInternalTransfer(e) {
        e.preventDefault();
        showStatus('Internal transfer functionality would open here', 'info');
    }

    function handleCancel(e) {
        e.preventDefault();
        
        if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            resetForm();
            showStatus('Form reset successfully', 'info');
        }
    }

    function handleBack(e) {
        e.preventDefault();
        
        // Navigate back or close the module
        if (window.history.length > 1) {
            window.history.back();
        } else {
            showStatus('Closing statement view...', 'info');
        }
    }

    // Load statement data (demo)
    function loadStatementData(detailed = false) {
        const fromDate = fromDateField?.value;
        const toDate = toDateField?.value;
        const currency = reportCurrencyField?.value;

        // Simulate statement data
        const demoData = [
            {
                trxDate: '2025-08-01',
                particulars: 'Opening Balance',
                debit: '',
                credit: '',
                balance: '1,250,000.00',
                trDef: 'OB'
            },
            {
                trxDate: '2025-08-05',
                particulars: 'Customer Deposit - ACC123456',
                debit: '',
                credit: '50,000.00',
                balance: '1,300,000.00',
                trDef: 'DEP'
            },
            {
                trxDate: '2025-08-10',
                particulars: 'Loan Disbursement - LN789012',
                debit: '200,000.00',
                credit: '',
                balance: '1,100,000.00',
                trDef: 'LDIS'
            },
            {
                trxDate: '2025-08-15',
                particulars: 'Interest Credit',
                debit: '',
                credit: '15,000.00',
                balance: '1,115,000.00',
                trDef: 'INT'
            },
            {
                trxDate: '2025-08-20',
                particulars: 'Withdrawal - ACC456789',
                debit: '75,000.00',
                credit: '',
                balance: '1,040,000.00',
                trDef: 'WD'
            },
            {
                trxDate: '2025-08-25',
                particulars: 'Transfer In - Branch 0102',
                debit: '',
                credit: '100,000.00',
                balance: '1,140,000.00',
                trDef: 'TFIN'
            },
            {
                trxDate: '2025-08-29',
                particulars: 'Closing Balance',
                debit: '',
                credit: '',
                balance: '1,140,000.00',
                trDef: 'CB'
            }
        ];

        populateStatementTable(demoData);
        showStatus(`Statement loaded successfully for ${formatDate(fromDate)} to ${formatDate(toDate)}`, 'success');
    }

    // Populate statement table
    function populateStatementTable(data) {
        if (!statementTableBody) return;

        if (!data || data.length === 0) {
            statementTableBody.innerHTML = '<tr class="empty-state"><td colspan="6">No records to display.</td></tr>';
            return;
        }

        statementTableBody.innerHTML = data.map(item => `
            <tr>
                <td>${escapeHtml(item.trxDate)}</td>
                <td>${escapeHtml(item.particulars)}</td>
                <td style="text-align: right;">${escapeHtml(item.debit)}</td>
                <td style="text-align: right;">${escapeHtml(item.credit)}</td>
                <td style="text-align: right; font-weight: 600;">${escapeHtml(item.balance)}</td>
                <td>${escapeHtml(item.trDef)}</td>
            </tr>
        `).join('');
    }

    // Form submission handler
    function handleSubmit(e) {
        e.preventDefault();
        handleView(e);
    }

    // Validate date range
    function validateDateRange() {
        const fromDate = fromDateField?.value;
        const toDate = toDateField?.value;

        if (!fromDate || !toDate) {
            showStatus('Please select both From Date and To Date', 'error');
            return false;
        }

        if (new Date(fromDate) > new Date(toDate)) {
            showStatus('From Date cannot be later than To Date', 'error');
            return false;
        }

        return true;
    }

    // Reset form
    function resetForm() {
        form?.reset();
        setDefaultDates();
        statementTableBody.innerHTML = '<tr class="empty-state"><td colspan="6">No records to display.</td></tr>';
    }

    // Status message functions
    function showStatus(message, type = 'info') {
        if (!statusMessage) return;

        const iconMap = {
            success: 'bi-check-circle-fill',
            error: 'bi-exclamation-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };

        const icon = statusMessage.querySelector('.bi');
        const text = statusMessage.querySelector('.status-text');

        if (icon && text) {
            icon.className = `bi ${iconMap[type] || iconMap.info}`;
            text.textContent = message;
            statusMessage.className = `status ${type}`;
            
            // Auto-hide after 5 seconds
            setTimeout(hideStatus, 5000);
        }
    }

    function hideStatus() {
        if (statusMessage) {
            statusMessage.classList.add('hidden');
        }
    }

    // Utility functions
    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    function formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(date);
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
