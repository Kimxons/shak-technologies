/**
 * Account Sweeping Module - CRUD Operations
 * Manages account sweeping configurations with full CRUD functionality
 */

window.AccountSweepingModule = (function () {
    'use strict';

    const state = {
        accountId: null,
        branchId: null,
        operatorId: null,
        currentMode: 'VIEW',
        sweepingData: [],
        selectedIndex: -1,
        originalData: null
    };

    const API = {
        GET: '/AccountsMaintenance/api/get-account-sweeping',
        ADD: '/AccountsMaintenance/api/add-account-sweeping',
        UPDATE: '/AccountsMaintenance/api/update-account-sweeping',
        DELETE: '/AccountsMaintenance/api/delete-account-sweeping'
    };

    /**
     * Initialize the module
     */
    function init() {
        console.log('[AccountSweeping] Initializing module...');
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
            'delete': deleteData,
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
        console.log('[AccountSweeping] Setting mode:', mode);
        state.currentMode = mode;

        const isEditing = mode === 'ADD' || mode === 'EDIT';
        
        // Enable/disable form fields
        document.querySelectorAll('#sweepType, #targetAccountNumber, #minimumBalance, #sweepFrequency, #sweepDay, #sweepAmount, #sweepPercentage, #maxSweepAmount, #effectiveDate, #expiryDate, #isActive').forEach(field => {
            if (field) field.disabled = !isEditing;
        });

        // Update button states
        const buttons = {
            'view': { active: mode === 'VIEW', disabled: mode === 'VIEW' },
            'add': { active: mode === 'ADD', disabled: isEditing },
            'edit': { active: mode === 'EDIT', disabled: isEditing || state.sweepingData.length === 0 },
            'save': { active: false, disabled: !isEditing },
            'delete': { active: false, disabled: isEditing || state.sweepingData.length === 0 },
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
     * Load sweeping data from API
     */
    async function loadData() {
        console.log('[AccountSweeping] Loading sweeping data...');
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
            console.log('[AccountSweeping] Response:', result);

            if (isSuccess(result)) {
                const data = result?.Details || result?.Data || result?.data || [];
                state.sweepingData = Array.isArray(data) ? data : (data ? [data] : []);
                
                if (state.sweepingData.length > 0) {
                    state.selectedIndex = 0;
                    populateForm(state.sweepingData[0]);
                    renderGrid();
                } else {
                    clearForm();
                }
                showSuccess(`Loaded ${state.sweepingData.length} sweeping configuration(s)`);
            } else {
                showError(result?.ResponseMessage || 'Failed to load sweeping data');
            }
        } catch (error) {
            console.error('[AccountSweeping] Error:', error);
            showError('Failed to load sweeping data: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Render sweeping configurations grid
     */
    function renderGrid() {
        const tbody = document.querySelector('#sweepingGrid tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (state.sweepingData.length === 0) {
            tbody.innerHTML = '<tr class="table__empty"><td colspan="5">No sweeping configurations found.</td></tr>';
            return;
        }

        state.sweepingData.forEach((item, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            row.className = index === state.selectedIndex ? 'table-active' : '';
            row.innerHTML = `
                <td>${escapeHtml(item.SweepType || item.SweepTypeDescription) || '-'}</td>
                <td>${escapeHtml(item.TargetAccountNumber || item.ToAccountNumber) || '-'}</td>
                <td class="text-end">${formatNumber(item.MinimumBalance || 0)}</td>
                <td>${escapeHtml(item.SweepFrequency || item.FrequencyDescription) || '-'}</td>
                <td class="text-center">${item.IsActive ? '<i class="bi bi-check-circle text-success"></i>' : '<i class="bi bi-x-circle text-danger"></i>'}</td>
            `;
            row.addEventListener('click', () => selectItem(index));
            tbody.appendChild(row);
        });
    }

    /**
     * Select a sweeping configuration
     */
    function selectItem(index) {
        state.selectedIndex = index;
        populateForm(state.sweepingData[index]);
        renderGrid();
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

        setValue('sweepType', data.SweepType || data.SweepTypeID);
        setValue('targetAccountNumber', data.TargetAccountNumber || data.ToAccountNumber);
        setValue('minimumBalance', data.MinimumBalance || 0);
        setValue('sweepFrequency', data.SweepFrequency || data.FrequencyID);
        setValue('sweepDay', data.SweepDay || data.DayOfMonth);
        setValue('sweepAmount', data.SweepAmount || data.FixedAmount || 0);
        setValue('sweepPercentage', data.SweepPercentage || data.PercentageAmount || 0);
        setValue('maxSweepAmount', data.MaxSweepAmount || data.MaximumAmount || 0);
        setValue('effectiveDate', formatDisplayDate(data.EffectiveDate));
        setValue('expiryDate', formatDisplayDate(data.ExpiryDate));
        setValue('isActive', data.IsActive);

        populateAuditFields(data);
        state.originalData = { ...data };
    }

    /**
     * Get form data
     */
    function getFormData() {
        return {
            SweepType: document.getElementById('sweepType')?.value || '',
            TargetAccountNumber: document.getElementById('targetAccountNumber')?.value || '',
            MinimumBalance: parseFloat(document.getElementById('minimumBalance')?.value) || 0,
            SweepFrequency: document.getElementById('sweepFrequency')?.value || '',
            SweepDay: parseInt(document.getElementById('sweepDay')?.value) || 1,
            SweepAmount: parseFloat(document.getElementById('sweepAmount')?.value) || 0,
            SweepPercentage: parseFloat(document.getElementById('sweepPercentage')?.value) || 0,
            MaxSweepAmount: parseFloat(document.getElementById('maxSweepAmount')?.value) || 0,
            EffectiveDate: parseApiDate(document.getElementById('effectiveDate')?.value),
            ExpiryDate: parseApiDate(document.getElementById('expiryDate')?.value),
            IsActive: document.getElementById('isActive')?.checked || false
        };
    }

    /**
     * Save sweeping configuration
     */
    async function saveData() {
        console.log('[AccountSweeping] Saving sweeping configuration...');
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
                showSuccess(result?.ResponseMessage || 'Sweeping configuration saved successfully');
                setMode('VIEW');
                await loadData();
            } else {
                showError(result?.ResponseMessage || 'Failed to save sweeping configuration');
            }
        } catch (error) {
            console.error('[AccountSweeping] Save error:', error);
            showError('Failed to save: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Delete sweeping configuration
     */
    async function deleteData() {
        if (state.sweepingData.length === 0) {
            showWarning('No sweeping configuration to delete');
            return;
        }

        if (!confirm('Are you sure you want to delete this sweeping configuration?')) return;

        console.log('[AccountSweeping] Deleting sweeping configuration...');
        showLoading(true);

        try {
            const searchKey = `[${state.branchId}:${state.accountId}]`;
            const currentItem = state.sweepingData[state.selectedIndex];
            
            const payload = {
                SearchKey: searchKey,
                AccountID: state.accountId,
                SweepID: currentItem?.SweepID || currentItem?.ID,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId
            };

            const response = await fetch(API.DELETE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (isSuccess(result)) {
                showSuccess(result?.ResponseMessage || 'Sweeping configuration deleted successfully');
                await loadData();
            } else {
                showError(result?.ResponseMessage || 'Failed to delete');
            }
        } catch (error) {
            console.error('[AccountSweeping] Delete error:', error);
            showError('Failed to delete: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Validate form
     */
    function validateForm(data) {
        if (!data.TargetAccountNumber) {
            showWarning('Please enter a target account number');
            return false;
        }
        if (!data.SweepType) {
            showWarning('Please select a sweep type');
            return false;
        }
        return true;
    }

    /**
     * Cancel changes
     */
    function cancelChanges() {
        if (state.sweepingData.length > 0 && state.selectedIndex >= 0) {
            populateForm(state.sweepingData[state.selectedIndex]);
        } else {
            clearForm();
        }
        setMode('VIEW');
    }

    /**
     * Clear form
     */
    function clearForm() {
        ['sweepType', 'targetAccountNumber', 'minimumBalance', 'sweepFrequency', 'sweepDay', 'sweepAmount', 'sweepPercentage', 'maxSweepAmount', 'effectiveDate', 'expiryDate'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const isActiveEl = document.getElementById('isActive');
        if (isActiveEl) isActiveEl.checked = true;
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

        if (type === 'error' && window.parent?.showSystemToast) {
            window.parent.showSystemToast(message, { variant: type });
        }
    }

    // Public API
    return {
        init,
        loadData,
        saveData,
        deleteData,
        setMode,
        cancelChanges
    };
})();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.AccountSweepingModule?.init());
} else {
    window.AccountSweepingModule?.init();
}

console.log('✅ Account Sweeping module loaded');
