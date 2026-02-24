// Interest Worksheet Module JavaScript
// Matching Overdraft Applications functionality

(function() {
    'use strict';

    // DOM Elements
    const form = document.getElementById('interestWorksheetForm');
    const statusMessage = document.getElementById('statusMessage');
    const interestTableBody = document.getElementById('interestTableBody');

    // Form fields
    const fromDateField = document.getElementById('fromDate');
    const toDateField = document.getElementById('toDate');

    // Initialize module
    function init() {
        attachEventListeners();
        setDefaultDates();
    }

    // Attach event listeners
    function attachEventListeners() {
        // Action buttons
        document.querySelector('[data-action="view"]')?.addEventListener('click', handleView);
        document.querySelector('[data-action="print"]')?.addEventListener('click', handlePrint);
        document.querySelector('[data-action="reversal"]')?.addEventListener('click', handleReversal);
        document.querySelector('[data-action="cancel"]')?.addEventListener('click', handleCancel);
        document.querySelector('[data-action="back"]')?.addEventListener('click', handleBack);

        // Status message close button
        document.querySelector('.status-close')?.addEventListener('click', hideStatus);

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

    // Action handlers
    function handleView(e) {
        e.preventDefault();
        
        if (!validateDateRange()) {
            return;
        }

        showStatus('Loading interest worksheet data...', 'info');
        
        // Simulate loading worksheet data
        setTimeout(() => {
            loadInterestWorksheet();
        }, 500);
    }

    function handlePrint(e) {
        e.preventDefault();
        
        if (!validateDateRange()) {
            return;
        }

        showStatus('Preparing worksheet for printing...', 'info');
        
        // Simulate print preparation
        setTimeout(() => {
            window.print();
        }, 500);
    }

    function handleReversal(e) {
        e.preventDefault();
        
        if (confirm('Are you sure you want to reverse the interest calculations?')) {
            showStatus('Processing reversal...', 'warning');
            
            setTimeout(() => {
                // Clear the table
                interestTableBody.innerHTML = '<tr class="empty-state"><td colspan="5">No records to display.</td></tr>';
                showStatus('Interest calculations reversed successfully', 'success');
            }, 1000);
        }
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
            showStatus('Closing interest worksheet...', 'info');
        }
    }

    // Load interest worksheet data (demo)
    function loadInterestWorksheet() {
        const fromDate = fromDateField?.value;
        const toDate = toDateField?.value;

        // Simulate interest calculation data
        const demoData = [
            {
                date: '2025-08-01',
                balance: '1,250,000.00',
                interestRate: '5.50',
                interest: '188.36',
                cumulative: '188.36'
            },
            {
                date: '2025-08-05',
                balance: '1,300,000.00',
                interestRate: '5.50',
                interest: '196.71',
                cumulative: '385.07'
            },
            {
                date: '2025-08-10',
                balance: '1,100,000.00',
                interestRate: '5.50',
                interest: '166.44',
                cumulative: '551.51'
            },
            {
                date: '2025-08-15',
                balance: '1,115,000.00',
                interestRate: '5.50',
                interest: '168.71',
                cumulative: '720.22'
            },
            {
                date: '2025-08-20',
                balance: '1,040,000.00',
                interestRate: '5.50',
                interest: '157.37',
                cumulative: '877.59'
            },
            {
                date: '2025-08-25',
                balance: '1,140,000.00',
                interestRate: '5.50',
                interest: '172.60',
                cumulative: '1,050.19'
            },
            {
                date: '2025-08-29',
                balance: '1,140,000.00',
                interestRate: '5.50',
                interest: '172.60',
                cumulative: '1,222.79'
            }
        ];

        populateInterestTable(demoData);
        showStatus(`Interest worksheet loaded successfully for ${formatDate(fromDate)} to ${formatDate(toDate)}`, 'success');
    }

    // Populate interest table
    function populateInterestTable(data) {
        if (!interestTableBody) return;

        if (!data || data.length === 0) {
            interestTableBody.innerHTML = '<tr class="empty-state"><td colspan="5">No records to display.</td></tr>';
            return;
        }

        interestTableBody.innerHTML = data.map(item => `
            <tr>
                <td>${escapeHtml(item.date)}</td>
                <td style="text-align: right;">${escapeHtml(item.balance)}</td>
                <td style="text-align: right;">${escapeHtml(item.interestRate)}%</td>
                <td style="text-align: right;">${escapeHtml(item.interest)}</td>
                <td style="text-align: right; font-weight: 600;">${escapeHtml(item.cumulative)}</td>
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
        interestTableBody.innerHTML = '<tr class="empty-state"><td colspan="5">No records to display.</td></tr>';
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
