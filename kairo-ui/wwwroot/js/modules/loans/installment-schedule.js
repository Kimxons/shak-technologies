/**
 * Installment Schedule Module
 * 
 * Migration Pattern: Read-only view module for loan installment schedules
 * - Loads installment data via controller endpoint
 * - Displays in tabular format
 * - No edit/create/delete operations
 * - Supports parent context loading (from Loan Maintenance form)
 */
(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════
    // STATE & CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════

    const state = {
        moduleId: null,
        entityId: null,
        branchId: null,
        accountId: null,
        loanSeries: null,
        currentData: null,
        isLoading: false
    };

    const endpoints = {
        getInstallments: 'Loans/InstallmentSchedule/get'
    };

    // ═══════════════════════════════════════════════════════════════════
    // DOM ELEMENTS
    // ═══════════════════════════════════════════════════════════════════

    const elements = {
        pageLoadingOverlay: document.getElementById('pageLoadingOverlay'),
        tableBody: document.getElementById('installmentScheduleBody'),
        recordCount: document.getElementById('recordCount'),
        refreshBtn: document.querySelector('[data-action="refresh"]'),
        closeBtn: document.querySelector('[data-action="close"]'),
        printBtn: document.querySelector('[data-action="print"]'),
        viewBtn: document.querySelector('[data-action="view"]')
    };

    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════

    function init() {
        console.log('[InstallmentSchedule] Initializing module...');

        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ action: 'submoduleOpened' }, '*');
        }
        
        loadContext();
        wireEventHandlers();
        
        // Auto-load if context is available
        if (hasRequiredContext()) {
            loadInstallmentSchedule();
        } else {
            showWarning('Loan context not available. Please load from Loan Maintenance.');
        }

        console.log('[InstallmentSchedule] Module initialized');
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONTEXT LOADING
    // ═══════════════════════════════════════════════════════════════════

    function loadContext() {
        // Try to get context from hidden fields
        state.moduleId = document.getElementById('moduleId_installmentSchedule')?.value || '';
        state.entityId = document.getElementById('entityId_installmentSchedule')?.value || '';

        // Try to get loan context from parent window (if in iframe)
        if (window.parent && window.parent !== window) {
            try {
                state.branchId = window.parent.document.getElementById('BranchID')?.value || '';
                state.accountId = window.parent.document.getElementById('AccountID')?.value || '';
                state.loanSeries = window.parent.document.getElementById('LoanSeries')?.value || '';
            } catch (e) {
                console.warn('[InstallmentSchedule] Could not access parent context:', e.message);
            }
        }

        // Try sessionStorage as fallback
        if (!state.branchId) state.branchId = sessionStorage.getItem('OurBranchID') || '';
        if (!state.accountId) state.accountId = sessionStorage.getItem('AccountID') || '';
        if (!state.loanSeries) state.loanSeries = sessionStorage.getItem('LoanSeries') || '';

        console.log('[InstallmentSchedule] Context loaded:', {
            moduleId: state.moduleId,
            branchId: state.branchId,
            accountId: state.accountId,
            loanSeries: state.loanSeries
        });
    }

    function hasRequiredContext() {
        return state.branchId && state.accountId && state.loanSeries;
    }

    // ═══════════════════════════════════════════════════════════════════
    // EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════════════

    function wireEventHandlers() {
        if (elements.refreshBtn) {
            elements.refreshBtn.addEventListener('click', loadInstallmentSchedule);
        }

        if (elements.closeBtn) {
            elements.closeBtn.addEventListener('click', handleClose);
        }

        if (elements.printBtn) {
            elements.printBtn.addEventListener('click', handlePrint);
        }

        if (elements.viewBtn) {
            elements.viewBtn.addEventListener('click', () => {
                showInformation('Installment Schedule - View mode. No editing available.');
            });
        }

        // Handle Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        });
    }

    function handleClose() {
        if (window.parent && window.parent !== window) {
            // Legacy-compatible close signal for parent container
            window.parent.postMessage({ action: 'submoduleClosed' }, '*');
        } else {
            // Direct close if not in iframe
            history.back();
        }
    }

    function handlePrint() {
        window.print();
    }

    // ═══════════════════════════════════════════════════════════════════
    // DATA LOADING
    // ═══════════════════════════════════════════════════════════════════

    async function loadInstallmentSchedule() {
        try {
            if (!hasRequiredContext()) {
                showWarning('Required loan context not available');
                return;
            }

            showLoading(true);
            state.isLoading = true;

            const payload = {
                OurBranchID: state.branchId,
                AccountID: state.accountId,
                LoanSeries: state.loanSeries
            };

            console.log('[InstallmentSchedule] Fetching installments with payload:', payload);

            const response = await window.AppCore.invokeControllerAsync(endpoints.getInstallments, payload);

            console.log('[InstallmentSchedule] API Response:', response);

            if (!response?.success) {
                showError(response?.message || 'Failed to load installment schedule');
                return;
            }

            // Extract data from response
            let installments = response.data;
            if (!Array.isArray(installments)) {
                installments = [];
            }

            if (installments.length === 0) {
                showWarning('No installments found for this loan');
                renderEmptyState();
                return;
            }

            // Store and render
            state.currentData = installments;
            renderSchedule(installments);
            showSuccess('Installment schedule loaded');

        } catch (error) {
            console.error('[InstallmentSchedule] Error loading schedule:', error);
            showError('Error loading installment schedule: ' + extractErrorMessage(error));
        } finally {
            showLoading(false);
            state.isLoading = false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // RENDERING
    // ═══════════════════════════════════════════════════════════════════

    function renderSchedule(data) {
        if (!elements.tableBody) {
            console.error('[InstallmentSchedule] Table body element not found');
            return;
        }

        if (!Array.isArray(data) || data.length === 0) {
            renderEmptyState();
            return;
        }

        console.log('[InstallmentSchedule] Rendering', data.length, 'installments');

        const rows = data.map((item) => {
            const instNo = getFieldValue(item, ['InstallmentNo', 'Installment_No', 'INSTALLMENT_NO', 'InstNo']) || '-';
            const dueDate = getFieldValue(item, ['InstallmentDueDate', 'Installment_Due_Date', 'DueDate', 'DUE_DATE']) || '-';
            const loanBal = getFieldValue(item, ['LoanBalance', 'Loan_Balance', 'LOAN_BALANCE', 'ClosingBalance', 'Balance']) || 0;
            const principalBal = getFieldValue(item, ['PrincipalBalance', 'Principal_Balance', 'PRINCIPAL_BALANCE', 'Outstanding']) || 0;
            const instAmount = getFieldValue(item, ['InstallmentAmount', 'Installment_Amount', 'EMI', 'EMI_Amount']) || 0;
            const principalDue = getFieldValue(item, ['PrincipalDue', 'Principal_Due', 'PRINCIPAL_DUE', 'Principal']) || 0;
            const intRate = getFieldValue(item, ['InterestRate', 'Interest_Rate', 'INTEREST_RATE', 'IntRate']) || '-';
            const intDue = getFieldValue(item, ['InterestDue', 'Interest_Due', 'INTEREST_DUE', 'Interest']) || 0;
            const expInt = getFieldValue(item, ['ExpectedInterest', 'Expected_Interest', 'EXPECTED_INTEREST']) || 0;
            const taxAmount = getFieldValue(item, ['Tax', 'TAX', 'TaxAmount']) || 0;
            const otherAmount = getFieldValue(item, ['Others', 'OtherCharges', 'OTHER_CHARGES']) || 0;
            const status = getFieldValue(item, ['PaidStatus', 'Paid_Status', 'Status', 'STATUS']) || '-';

            return `
                <tr>
                    <td class="text-center">${htmlEncode(String(instNo))}</td>
                    <td class="text-center">${formatDate(dueDate)}</td>
                    <td class="text-end">${formatMoney(loanBal)}</td>
                    <td class="text-end">${formatMoney(principalBal)}</td>
                    <td class="text-end">${formatMoney(instAmount)}</td>
                    <td class="text-end">${formatMoney(principalDue)}</td>
                    <td class="text-center">${htmlEncode(String(intRate))}</td>
                    <td class="text-end">${formatMoney(intDue)}</td>
                    <td class="text-end">${formatMoney(expInt)}</td>
                    <td class="text-end">${formatMoney(taxAmount)}</td>
                    <td class="text-end">${formatMoney(otherAmount)}</td>
                    <td class="text-center">${htmlEncode(String(status))}</td>
                </tr>
            `;
        }).join('');

        elements.tableBody.innerHTML = rows;
        updateRecordCount(data.length);
    }

    function renderEmptyState() {
        if (!elements.tableBody) return;
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center text-muted py-3">
                    <i class="bi bi-inbox me-2"></i>No records to display.
                </td>
            </tr>
        `;
        updateRecordCount(0);
    }

    function updateRecordCount(count) {
        if (elements.recordCount) {
            elements.recordCount.textContent = `(${count} record${count !== 1 ? 's' : ''})`;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get field value from object, trying multiple possible field names
     */
    function getFieldValue(obj, fieldNames) {
        if (!obj || !Array.isArray(fieldNames)) return null;
        for (const fieldName of fieldNames) {
            if (fieldName in obj && obj[fieldName] != null) {
                return obj[fieldName];
            }
        }
        return null;
    }

    /**
     * Format money values
     */
    function formatMoney(value) {
        if (value === null || value === undefined || value === '') return '-';

        let numValue = String(value).replace(/,/g, '');
        numValue = parseFloat(numValue);

        if (isNaN(numValue)) return '-';

        return numValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    /**
     * Format date values
     */
    function formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;

            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        } catch {
            return dateStr;
        }
    }

    /**
     * HTML encode to prevent XSS
     */
    function htmlEncode(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Show/hide loading overlay
     */
    function showLoading(show) {
        if (elements.pageLoadingOverlay) {
            elements.pageLoadingOverlay.hidden = !show;
        }
    }

    /**
     * Extract error message from error object
     */
    function extractErrorMessage(error) {
        if (typeof error === 'string') return error;
        if (error?.message) return error.message;
        if (error?.data?.message) return error.data.message;
        return 'Unknown error occurred';
    }

    // ═══════════════════════════════════════════════════════════════════
    // TOAST NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════════

    function showSuccess(message) {
        window.AppCore?.showToastMessage?.(message, 'success') || console.log(message);
    }

    function showError(message) {
        window.AppCore?.showToastMessage?.(message, 'error') || console.error(message);
    }

    function showWarning(message) {
        window.AppCore?.showToastMessage?.(message, 'warning') || console.warn(message);
    }

    function showInformation(message) {
        window.AppCore?.showToastMessage?.(message, 'info') || console.log(message);
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODULE LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose refresh function globally if needed
    window.reloadInstallmentSchedule = loadInstallmentSchedule;

})();
