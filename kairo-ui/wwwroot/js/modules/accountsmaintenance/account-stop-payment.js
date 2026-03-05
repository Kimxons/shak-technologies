/**
 * Account Stop Payment Module - CRUD Operations
 * Manages stop payment instructions with full CRUD functionality
 */

window.AccountStopPaymentModule = (function () {
    'use strict';

    const state = {
        accountId: null,
        branchId: null,
        operatorId: null,
        currentMode: 'VIEW',
        stopPayments: [],
        selectedIndex: -1,
        originalData: null
    };

    const API = {
        GET: '/AccountsMaintenance/api/get-stop-payments',
        ADD: '/AccountsMaintenance/api/add-stop-payment',
        UPDATE: '/AccountsMaintenance/api/update-stop-payment'
    };

    /**
     * Initialize the module
     */
    function init() {
        console.log('[StopPayment] Initializing module...');
        getAccountContext();

        if (!state.accountId) {
            showError('No account selected. Please select an account first.');
            return;
        }

        wireHeaderControls();
        wireActionButtons();
        wireSectionToggles();
        setMode('VIEW');
        loadData();
    }

    /**
     * Get account context from parent page
     */
    function getAccountContext() {
        if (window.parent && window.parent !== window && window.parent.AccountMaintenanceState) {
            const parentState = window.parent.AccountMaintenanceState;
            state.accountId = parentState.AccountID;
            state.branchId = parentState.OurBranchID || parentState.BranchID;
            state.operatorId = parentState.OperatorID;
        } else {
            state.accountId = sessionStorage.getItem('currentAccountID');
            state.branchId = sessionStorage.getItem('currentBranchID');
            state.operatorId = sessionStorage.getItem('currentOperatorID') || 'SYSTEM';
        }
    }

    /**
     * Wire header control buttons
     */
    function wireHeaderControls() {
        document.querySelector('[data-action="refresh"]')?.addEventListener('click', loadData);
        document.querySelector('[data-action="close"]')?.addEventListener('click', closeSubmodule);
        document.querySelector('[data-action="maximize"]')?.addEventListener('click', toggleMaximize);
    }

    /**
     * Wire action panel buttons
     */
    function wireActionButtons() {
        const actions = {
            'view': () => setMode('VIEW'),
            'add': () => setMode('ADD'),
            'edit': () => setMode('EDIT'),
            'save': saveData,
            'cancel': cancelChanges,
            'close': closeSubmodule
        };

        Object.keys(actions).forEach(action => {
            document.querySelector(`[data-action="${action}"]`)?.addEventListener('click', actions[action]);
        });
    }

    /**
     * Wire section toggle buttons
     */
    function wireSectionToggles() {
        document.querySelectorAll('.section-toggle-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const section = this.closest('.form-section');
                const content = section.querySelector('.section-content, [data-section-content]');
                const icon = this.querySelector('i');
                const isExpanded = this.getAttribute('aria-expanded') === 'true';

                if (content) content.hidden = isExpanded;
                this.setAttribute('aria-expanded', !isExpanded);
                if (icon) {
                    icon.classList.toggle('bi-chevron-up');
                    icon.classList.toggle('bi-chevron-down');
                }
            });
        });
    }

    /**
     * Set form mode
     */
    function setMode(mode) {
        console.log('[StopPayment] Setting mode:', mode);
        state.currentMode = mode;

        const isEditing = mode === 'ADD' || mode === 'EDIT';
        
        // Enable/disable form fields
        document.querySelectorAll('#chequeNumber, #chequeNumberFrom, #chequeNumberTo, #stopReason, #stopDate, #expiryDate, #remarks, #beneficiaryName, #amount').forEach(field => {
            if (field) field.disabled = !isEditing;
        });

        // Update button states
        const buttons = {
            'view': { active: mode === 'VIEW', disabled: mode === 'VIEW' },
            'add': { active: mode === 'ADD', disabled: isEditing },
            'edit': { active: mode === 'EDIT', disabled: isEditing || state.stopPayments.length === 0 },
            'save': { active: false, disabled: !isEditing },
            'cancel': { active: false, disabled: !isEditing }
        };

        Object.keys(buttons).forEach(action => {
            const btn = document.querySelector(`[data-action="${action}"]`);
            if (btn) {
                btn.classList.toggle('active', buttons[action].active);
                btn.disabled = buttons[action].disabled;
            }
        });

        if (mode === 'ADD') {
            clearForm();
        }
    }

    /**
     * Load stop payments from API
     */
    async function loadData() {
        console.log('[StopPayment] Loading stop payments...');
        showLoading(true);

        try {
            const searchKey = `[${state.branchId}:${state.accountId}]`;
            const payload = {
                SearchKey: searchKey,
                SearchID: searchKey,
                AccountID: state.accountId,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId
            };

            const response = await fetch(API.GET, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            console.log('[StopPayment] Response:', result);

            if (isSuccess(result)) {
                const data = result?.Details || result?.Data || result?.data || [];
                state.stopPayments = Array.isArray(data) ? data : (data ? [data] : []);
                
                if (state.stopPayments.length > 0) {
                    state.selectedIndex = 0;
                    populateForm(state.stopPayments[0]);
                }
                renderGrid();
                showSuccess(`Loaded ${state.stopPayments.length} stop payment(s)`);
            } else {
                showError(result?.ResponseMessage || 'Failed to load stop payments');
            }
        } catch (error) {
            console.error('[StopPayment] Error:', error);
            showError('Failed to load stop payments: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Render stop payments grid
     */
    function renderGrid() {
        const tbody = document.querySelector('#stopPaymentsGrid tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (state.stopPayments.length === 0) {
            tbody.innerHTML = '<tr class="table__empty"><td colspan="6">No stop payments found.</td></tr>';
            return;
        }

        state.stopPayments.forEach((item, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            row.className = index === state.selectedIndex ? 'table-active' : '';
            row.innerHTML = `
                <td>${escapeHtml(item.ChequeNumber || item.ChequeNo) || '-'}</td>
                <td>${escapeHtml(item.BeneficiaryName || item.Beneficiary) || '-'}</td>
                <td class="text-end">${formatNumber(item.Amount || 0)}</td>
                <td>${formatDisplayDate(item.StopDate) || '-'}</td>
                <td>${formatDisplayDate(item.ExpiryDate) || '-'}</td>
                <td>${escapeHtml(item.StopReason || item.Reason) || '-'}</td>
            `;
            row.addEventListener('click', () => selectItem(index));
            tbody.appendChild(row);
        });
    }

    /**
     * Select a stop payment
     */
    function selectItem(index) {
        state.selectedIndex = index;
        populateForm(state.stopPayments[index]);
        renderGrid();
    }

    /**
     * Populate form with data
     */
    function populateForm(data) {
        if (!data) return;

        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        };

        setValue('chequeNumber', data.ChequeNumber || data.ChequeNo);
        setValue('chequeNumberFrom', data.ChequeNumberFrom || data.FromChequeNo);
        setValue('chequeNumberTo', data.ChequeNumberTo || data.ToChequeNo);
        setValue('stopReason', data.StopReason || data.ReasonID);
        setValue('stopDate', formatDisplayDate(data.StopDate));
        setValue('expiryDate', formatDisplayDate(data.ExpiryDate));
        setValue('remarks', data.Remarks || data.Notes);
        setValue('beneficiaryName', data.BeneficiaryName || data.Beneficiary);
        setValue('amount', data.Amount || 0);

        // Display status
        const statusEl = document.getElementById('stopStatus');
        if (statusEl) {
            statusEl.textContent = data.Status || data.StatusDescription || 'Active';
            statusEl.className = `badge ${data.Status === 'Cancelled' ? 'bg-secondary' : 'bg-danger'}`;
        }

        populateAuditFields(data);
        state.originalData = { ...data };
    }

    /**
     * Get form data
     */
    function getFormData() {
        return {
            ChequeNumber: document.getElementById('chequeNumber')?.value || '',
            ChequeNumberFrom: document.getElementById('chequeNumberFrom')?.value || '',
            ChequeNumberTo: document.getElementById('chequeNumberTo')?.value || '',
            StopReason: document.getElementById('stopReason')?.value || '',
            StopDate: parseApiDate(document.getElementById('stopDate')?.value),
            ExpiryDate: parseApiDate(document.getElementById('expiryDate')?.value),
            Remarks: document.getElementById('remarks')?.value || '',
            BeneficiaryName: document.getElementById('beneficiaryName')?.value || '',
            Amount: parseFloat(document.getElementById('amount')?.value) || 0
        };
    }

    /**
     * Save stop payment
     */
    async function saveData() {
        console.log('[StopPayment] Saving stop payment...');
        showLoading(true);

        try {
            const formData = getFormData();
            if (!validateForm(formData)) return;

            const searchKey = `[${state.branchId}:${state.accountId}]`;
            const payload = {
                ...formData,
                SearchKey: searchKey,
                AccountID: state.accountId,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId
            };

            const endpoint = state.currentMode === 'ADD' ? API.ADD : API.UPDATE;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (isSuccess(result)) {
                showSuccess(result?.ResponseMessage || 'Stop payment saved successfully');
                setMode('VIEW');
                await loadData();
            } else {
                showError(result?.ResponseMessage || 'Failed to save stop payment');
            }
        } catch (error) {
            console.error('[StopPayment] Save error:', error);
            showError('Failed to save: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Validate form
     */
    function validateForm(data) {
        if (!data.ChequeNumber && !data.ChequeNumberFrom) {
            showWarning('Please enter a cheque number or cheque number range');
            return false;
        }
        if (!data.StopReason) {
            showWarning('Please select a stop reason');
            return false;
        }
        return true;
    }

    /**
     * Cancel changes
     */
    function cancelChanges() {
        if (state.stopPayments.length > 0 && state.selectedIndex >= 0) {
            populateForm(state.stopPayments[state.selectedIndex]);
        } else {
            clearForm();
        }
        setMode('VIEW');
    }

    /**
     * Clear form
     */
    function clearForm() {
        ['chequeNumber', 'chequeNumberFrom', 'chequeNumberTo', 'stopReason', 'stopDate', 'expiryDate', 'remarks', 'beneficiaryName', 'amount'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        clearAuditFields();
    }

    /**
     * Populate audit fields
     */
    function populateAuditFields(data) {
        if (!data) return;
        const fields = {
            'MakerID': data.CreatedBy || '-',
            'MakerDT': formatDate(data.CreatedOn) || '-',
            'ModifierID': data.ModifiedBy || '-',
            'ModifierDT': formatDate(data.ModifiedOn) || '-'
        };

        Object.keys(fields).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = fields[id];
        });
    }

    /**
     * Clear audit fields
     */
    function clearAuditFields() {
        ['MakerID', 'MakerDT', 'ModifierID', 'ModifierDT'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '-';
        });
    }

    // Utility functions
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function isSuccess(result) {
        return result?.ResponseCode === '00' || result?.ResponseCode === 0 || 
               result?.success === true || result?.Success === true;
    }

    function formatNumber(num) {
        return parseFloat(num || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatDate(dateString) {
        if (!dateString || dateString === '-') return '-';
        try {
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? dateString : date.toLocaleString();
        } catch (e) {
            return dateString;
        }
    }

    function formatDisplayDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${date.getDate().toString().padStart(2, '0')}/${months[date.getMonth()]}/${date.getFullYear()}`;
        } catch (e) {
            return dateString;
        }
    }

    function parseApiDate(displayDate) {
        if (!displayDate) return null;
        const months = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 
                        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
        const match = displayDate.match(/(\d{2})\/(\w{3})\/(\d{4})/);
        if (match) {
            const date = new Date(parseInt(match[3]), months[match[2]], parseInt(match[1]));
            return date.toISOString();
        }
        return displayDate;
    }

    function showLoading(show) {
        const overlay = document.querySelector('.loading-overlay, .de-loading-overlay');
        if (overlay) overlay.hidden = !show;
    }

    function toggleMaximize() {
        const sidebar = document.getElementById('main-sidebar');
        if (sidebar) sidebar.classList.toggle('collapsed');
    }

    function closeSubmodule() {
        if (window.parent && window.parent.AccountMaintenanceCore) {
            window.parent.AccountMaintenanceCore.closeSubmodule();
        }
    }

    function showSuccess(message) { showMessage(message, 'success'); }
    function showWarning(message) { showMessage(message, 'warning'); showLoading(false); }
    function showError(message) { showMessage(message, 'error'); }

    function showMessage(message, type) {
        const panel = document.querySelector('.am-message-panel, .de-message-bar');
        if (panel) {
            panel.className = `am-message-panel am-message-panel--${type}`;
            panel.hidden = false;
            const icon = panel.querySelector('i');
            const span = panel.querySelector('span');
            if (icon) icon.className = type === 'success' ? 'bi bi-check-circle' : 
                                       type === 'warning' ? 'bi bi-exclamation-triangle' : 'bi bi-exclamation-circle';
            if (span) span.textContent = message;
            setTimeout(() => { panel.hidden = true; }, type === 'error' ? 5000 : 3000);
        }
    }

    // Public API
    return {
        init,
        loadData,
        saveData,
        setMode,
        cancelChanges
    };
})();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.AccountStopPaymentModule?.init());
} else {
    window.AccountStopPaymentModule?.init();
}

console.log('✅ Account Stop Payment module loaded');
