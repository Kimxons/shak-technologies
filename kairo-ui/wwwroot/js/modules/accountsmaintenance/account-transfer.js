/**
 * Account Transfer Module - CRUD Operations
 * Manages account transfer details with full CRUD functionality
 */

window.AccountTransferModule = (function () {
    'use strict';

    const state = {
        accountId: null,
        branchId: null,
        operatorId: null,
        currentMode: 'VIEW',
        transferData: null,
        originalData: null
    };

    const API = {
        GET: '/AccountsMaintenance/api/get-account-transfer-details',
        ADD: '/AccountsMaintenance/api/add-account-transfer-details'
    };

    /**
     * Initialize the module
     */
    function init() {
        console.log('[Transfer] Initializing module...');
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
            'close': closeSubmodule,
            'initiate-transfer': initiateTransfer
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
        console.log('[Transfer] Setting mode:', mode);
        state.currentMode = mode;

        const isEditing = mode === 'ADD' || mode === 'EDIT';
        
        // Enable/disable form fields
        document.querySelectorAll('#transferType, #toBranch, #toAccountNumber, #transferReason, #transferDate, #remarks, #closeOriginal').forEach(field => {
            if (field) field.disabled = !isEditing;
        });

        // Update button states
        const buttons = {
            'view': { active: mode === 'VIEW', disabled: mode === 'VIEW' },
            'add': { active: mode === 'ADD', disabled: isEditing },
            'edit': { active: mode === 'EDIT', disabled: isEditing || !state.transferData },
            'save': { active: false, disabled: !isEditing },
            'cancel': { active: false, disabled: !isEditing },
            'initiate-transfer': { active: false, disabled: !isEditing }
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
     * Load transfer details from API
     */
    async function loadData() {
        console.log('[Transfer] Loading transfer details...');
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
            console.log('[Transfer] Response:', result);

            if (isSuccess(result)) {
                const data = result?.Details || result?.Data || result?.data;
                state.transferData = Array.isArray(data) ? data[0] : data;
                
                if (state.transferData) {
                    populateForm(state.transferData);
                    renderHistoryGrid(result?.TransferHistory || []);
                } else {
                    clearForm();
                }
                showSuccess('Transfer details loaded');
            } else {
                clearForm();
                // Not an error - may just be no transfer setup
                console.log('[Transfer] No transfer data found');
            }
        } catch (error) {
            console.error('[Transfer] Error:', error);
            showError('Failed to load transfer details: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Render transfer history grid
     */
    function renderHistoryGrid(history) {
        const tbody = document.querySelector('#transferHistoryGrid tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!history || history.length === 0) {
            tbody.innerHTML = '<tr class="table__empty"><td colspan="5">No transfer history found.</td></tr>';
            return;
        }

        history.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDisplayDate(item.TransferDate) || '-'}</td>
                <td>${escapeHtml(item.FromBranch || item.FromBranchName) || '-'}</td>
                <td>${escapeHtml(item.ToBranch || item.ToBranchName) || '-'}</td>
                <td>${escapeHtml(item.TransferReason || item.Reason) || '-'}</td>
                <td>${getStatusBadge(item.Status)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    /**
     * Get status badge
     */
    function getStatusBadge(status) {
        const statuses = {
            'COMPLETED': '<span class="badge bg-success">Completed</span>',
            'PENDING': '<span class="badge bg-warning text-dark">Pending</span>',
            'REJECTED': '<span class="badge bg-danger">Rejected</span>',
            'CANCELLED': '<span class="badge bg-secondary">Cancelled</span>'
        };
        return statuses[status?.toUpperCase()] || `<span class="badge bg-secondary">${escapeHtml(status) || '-'}</span>`;
    }

    /**
     * Populate form with data
     */
    function populateForm(data) {
        if (!data) return;

        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = !!value;
                } else {
                    el.value = value || '';
                }
            }
        };

        setValue('transferType', data.TransferType || data.TransferTypeID);
        setValue('toBranch', data.ToBranch || data.ToBranchID);
        setValue('toAccountNumber', data.ToAccountNumber);
        setValue('transferReason', data.TransferReason || data.ReasonID);
        setValue('transferDate', formatDisplayDate(data.TransferDate));
        setValue('remarks', data.Remarks || data.Notes);
        setValue('closeOriginal', data.CloseOriginal);

        // Display current account info
        const currentBranchEl = document.getElementById('currentBranch');
        if (currentBranchEl) currentBranchEl.textContent = data.CurrentBranch || state.branchId;

        const currentAccountEl = document.getElementById('currentAccount');
        if (currentAccountEl) currentAccountEl.textContent = data.CurrentAccountNumber || state.accountId;

        populateAuditFields(data);
        state.originalData = { ...data };
    }

    /**
     * Get form data
     */
    function getFormData() {
        return {
            TransferType: document.getElementById('transferType')?.value || '',
            ToBranch: document.getElementById('toBranch')?.value || '',
            ToAccountNumber: document.getElementById('toAccountNumber')?.value || '',
            TransferReason: document.getElementById('transferReason')?.value || '',
            TransferDate: parseApiDate(document.getElementById('transferDate')?.value),
            Remarks: document.getElementById('remarks')?.value || '',
            CloseOriginal: document.getElementById('closeOriginal')?.checked || false
        };
    }

    /**
     * Save transfer details
     */
    async function saveData() {
        console.log('[Transfer] Saving transfer details...');
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

            const response = await fetch(API.ADD, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (isSuccess(result)) {
                showSuccess(result?.ResponseMessage || 'Transfer details saved successfully');
                setMode('VIEW');
                await loadData();
            } else {
                showError(result?.ResponseMessage || 'Failed to save transfer details');
            }
        } catch (error) {
            console.error('[Transfer] Save error:', error);
            showError('Failed to save: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Initiate account transfer
     */
    async function initiateTransfer() {
        if (!confirm('Are you sure you want to initiate this account transfer? This action may close the original account.')) return;

        console.log('[Transfer] Initiating transfer...');
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
                OperatorID: state.operatorId,
                InitiateTransfer: true
            };

            const response = await fetch(API.ADD, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (isSuccess(result)) {
                showSuccess(result?.ResponseMessage || 'Account transfer initiated successfully');
                setMode('VIEW');
                await loadData();
            } else {
                showError(result?.ResponseMessage || 'Failed to initiate transfer');
            }
        } catch (error) {
            console.error('[Transfer] Initiate error:', error);
            showError('Failed to initiate transfer: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Validate form
     */
    function validateForm(data) {
        if (!data.ToBranch) {
            showWarning('Please select a destination branch');
            return false;
        }
        if (!data.TransferReason) {
            showWarning('Please select a transfer reason');
            return false;
        }
        return true;
    }

    /**
     * Cancel changes
     */
    function cancelChanges() {
        if (state.transferData) {
            populateForm(state.transferData);
        } else {
            clearForm();
        }
        setMode('VIEW');
    }

    /**
     * Clear form
     */
    function clearForm() {
        ['transferType', 'toBranch', 'toAccountNumber', 'transferReason', 'transferDate', 'remarks'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const closeOriginalEl = document.getElementById('closeOriginal');
        if (closeOriginalEl) closeOriginalEl.checked = false;
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
        initiateTransfer,
        setMode,
        cancelChanges
    };
})();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.AccountTransferModule?.init());
} else {
    window.AccountTransferModule?.init();
}

console.log('✅ Account Transfer module loaded');
