/**
 * Account Interest Rates Module - CRUD Operations
 * Manages account interest rates with rate slabs
 */

window.AccountInterestRatesModule = (function () {
    'use strict';

    const state = {
        accountId: null,
        branchId: null,
        operatorId: null,
        currentMode: 'VIEW',
        rateData: null,
        slabs: [],
        originalData: null
    };

    const API = {
        GET: '/AccountsMaintenance/api/get-account-interest-rate',
        ADD: '/AccountsMaintenance/api/add-account-interest-rate',
        UPDATE: '/AccountsMaintenance/api/update-account-interest-rate',
        DELETE: '/AccountsMaintenance/api/delete-account-interest-rate'
    };

    /**
     * Initialize the module
     */
    function init() {
        console.log('[InterestRates] Initializing module...');
        getAccountContext();

        if (!state.accountId) {
            showError('No account selected. Please select an account first.');
            return;
        }

        wireHeaderControls();
        wireActionButtons();
        wireSectionToggles();
        wireDatePickers();
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
     * Wire date pickers
     */
    function wireDatePickers() {
        document.querySelectorAll('[data-date-toggle]').forEach(btn => {
            const targetId = btn.dataset.dateToggle;
            const displayInput = document.getElementById(targetId);
            const pickerInput = document.getElementById(`${targetId}_picker`);

            if (btn && pickerInput && displayInput) {
                btn.addEventListener('click', () => {
                    if (!displayInput.disabled) pickerInput.click();
                });
                pickerInput.addEventListener('change', () => {
                    displayInput.value = formatDisplayDate(pickerInput.value);
                });
            }
        });
    }

    /**
     * Set form mode
     */
    function setMode(mode) {
        console.log('[InterestRates] Setting mode:', mode);
        state.currentMode = mode;

        const isEditing = mode === 'ADD' || mode === 'EDIT';
        
        // Enable/disable form fields
        document.querySelectorAll('#rateType, #effectiveDate, #expiryDate, #refId').forEach(field => {
            if (field) field.disabled = !isEditing;
        });

        // Enable/disable date picker buttons
        document.querySelectorAll('[data-date-toggle]').forEach(btn => {
            btn.disabled = !isEditing;
        });

        // Enable/disable slab grid editing
        document.querySelectorAll('#rateSlabGrid input').forEach(field => {
            if (field) field.disabled = !isEditing;
        });

        // Update button states
        const buttons = {
            'view': { active: mode === 'VIEW', disabled: mode === 'VIEW' },
            'add': { active: mode === 'ADD', disabled: isEditing },
            'edit': { active: mode === 'EDIT', disabled: isEditing || !state.rateData },
            'save': { active: false, disabled: !isEditing },
            'delete': { active: false, disabled: isEditing || !state.rateData },
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
     * Load interest rate data from API
     */
    async function loadData() {
        console.log('[InterestRates] Loading interest rates...');
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
            console.log('[InterestRates] Response:', result);

            if (isSuccess(result)) {
                const data = result?.Details || result?.Data || result?.data;
                if (Array.isArray(data) && data.length > 0) {
                    state.rateData = data[0];
                    state.slabs = data[0].Slabs || data[0].RateSlabs || [];
                } else if (data && !Array.isArray(data)) {
                    state.rateData = data;
                    state.slabs = data.Slabs || data.RateSlabs || [];
                } else {
                    state.rateData = null;
                    state.slabs = [];
                }
                
                populateForm(state.rateData);
                renderSlabGrid();
                state.originalData = state.rateData ? JSON.parse(JSON.stringify(state.rateData)) : null;
                showSuccess('Interest rate data loaded');
            } else {
                showError(result?.ResponseMessage || 'Failed to load interest rates');
            }
        } catch (error) {
            console.error('[InterestRates] Error:', error);
            showError('Failed to load interest rates: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Populate form with data
     */
    function populateForm(data) {
        if (!data) {
            clearForm();
            return;
        }

        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        };

        setValue('rateType', data.RateType || data.rateType || data.InterestRateTypeID);
        setValue('baseRate', formatNumber(data.BaseRate || data.baseRate || 0));
        setValue('effectiveDate', formatDisplayDate(data.EffectiveDate || data.effectiveDate));
        setValue('expiryDate', formatDisplayDate(data.ExpiryDate || data.expiryDate));
        setValue('refId', data.RefID || data.refId || data.ReferenceID);

        populateAuditFields(data);
    }

    /**
     * Render rate slab grid
     */
    function renderSlabGrid() {
        const tbody = document.querySelector('#rateSlabGrid tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (state.slabs.length === 0) {
            tbody.innerHTML = '<tr class="table__empty"><td colspan="5">No rate slabs defined. Click ADD to create one.</td></tr>';
            return;
        }

        const isEditing = state.currentMode === 'ADD' || state.currentMode === 'EDIT';

        state.slabs.forEach((slab, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            row.innerHTML = `
                <td><input type="number" class="form-control form-control-sm text-end" data-field="FromAmount" 
                           value="${slab.FromAmount || 0}" ${!isEditing ? 'disabled' : ''}></td>
                <td><input type="number" class="form-control form-control-sm text-end" data-field="ToAmount" 
                           value="${slab.ToAmount || 0}" ${!isEditing ? 'disabled' : ''}></td>
                <td><input type="number" class="form-control form-control-sm text-end" data-field="Spread" 
                           value="${slab.Spread || slab.SpreadMargin || 0}" step="0.0001" ${!isEditing ? 'disabled' : ''}></td>
                <td><input type="number" class="form-control form-control-sm text-end" data-field="InterestRate" 
                           value="${slab.InterestRate || slab.Rate || 0}" step="0.0001" ${!isEditing ? 'disabled' : ''}></td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-danger" data-delete-slab="${index}" 
                            ${!isEditing ? 'disabled' : ''} title="Remove slab">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;

            // Wire change handlers for inputs
            row.querySelectorAll('input').forEach(input => {
                input.addEventListener('change', () => {
                    updateSlab(index, input.dataset.field, parseFloat(input.value) || 0);
                });
            });

            // Wire delete button
            row.querySelector('[data-delete-slab]')?.addEventListener('click', () => {
                deleteSlab(index);
            });

            tbody.appendChild(row);
        });
    }

    /**
     * Update a slab in state
     */
    function updateSlab(index, field, value) {
        if (state.slabs[index]) {
            state.slabs[index][field] = value;
        }
    }

    /**
     * Delete a slab
     */
    function deleteSlab(index) {
        state.slabs.splice(index, 1);
        renderSlabGrid();
    }

    /**
     * Get form data
     */
    function getFormData() {
        return {
            RateType: document.getElementById('rateType')?.value || '',
            InterestRateTypeID: document.getElementById('rateType')?.value || '',
            BaseRate: parseFloat(document.getElementById('baseRate')?.value) || 0,
            EffectiveDate: parseApiDate(document.getElementById('effectiveDate')?.value),
            ExpiryDate: parseApiDate(document.getElementById('expiryDate')?.value),
            RefID: document.getElementById('refId')?.value || '',
            Slabs: state.slabs
        };
    }

    /**
     * Save interest rate data
     */
    async function saveData() {
        console.log('[InterestRates] Saving interest rate...');
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
                showSuccess(result?.ResponseMessage || 'Interest rate saved successfully');
                setMode('VIEW');
                await loadData();
            } else {
                showError(result?.ResponseMessage || 'Failed to save interest rate');
            }
        } catch (error) {
            console.error('[InterestRates] Save error:', error);
            showError('Failed to save interest rate: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Delete interest rate
     */
    async function deleteData() {
        if (!state.rateData) {
            showWarning('No interest rate to delete');
            return;
        }

        if (!confirm('Are you sure you want to delete this interest rate?')) return;

        console.log('[InterestRates] Deleting interest rate...');
        showLoading(true);

        try {
            const searchKey = `[${state.branchId}:${state.accountId}]`;
            const payload = {
                SearchKey: searchKey,
                AccountID: state.accountId,
                RateID: state.rateData.RateID || state.rateData.InterestRateID,
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
                showSuccess(result?.ResponseMessage || 'Interest rate deleted successfully');
                await loadData();
            } else {
                showError(result?.ResponseMessage || 'Failed to delete interest rate');
            }
        } catch (error) {
            console.error('[InterestRates] Delete error:', error);
            showError('Failed to delete interest rate: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Validate form
     */
    function validateForm(data) {
        if (!data.RateType) {
            showWarning('Please select a rate type');
            return false;
        }
        return true;
    }

    /**
     * Cancel changes
     */
    function cancelChanges() {
        if (state.originalData) {
            state.rateData = JSON.parse(JSON.stringify(state.originalData));
            state.slabs = state.rateData.Slabs || state.rateData.RateSlabs || [];
            populateForm(state.rateData);
            renderSlabGrid();
        } else {
            clearForm();
        }
        setMode('VIEW');
    }

    /**
     * Clear form
     */
    function clearForm() {
        ['rateType', 'baseRate', 'effectiveDate', 'expiryDate', 'refId'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = id === 'baseRate' ? '0.0000' : '';
        });
        state.slabs = [];
        renderSlabGrid();
        clearAuditFields();
    }

    /**
     * Populate audit fields
     */
    function populateAuditFields(data) {
        if (!data) return;
        const fields = {
            'CreatedBy': data.CreatedBy || '-',
            'CreatedOn': formatDate(data.CreatedOn) || '-',
            'ModifiedBy': data.ModifiedBy || '-',
            'ModifiedOn': formatDate(data.ModifiedOn) || '-',
            'SupervisedBy': data.SupervisedBy || '-',
            'SupervisedOn': formatDate(data.SupervisedOn) || '-'
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
        ['CreatedBy', 'CreatedOn', 'ModifiedBy', 'ModifiedOn', 'SupervisedBy', 'SupervisedOn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '-';
        });
    }

    // Utility functions
    function isSuccess(result) {
        return result?.ResponseCode === '00' || result?.ResponseCode === 0 || 
               result?.success === true || result?.Success === true;
    }

    function formatNumber(num) {
        return parseFloat(num || 0).toFixed(4);
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
        // Try parsing DD/MMM/YYYY format
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
    document.addEventListener('DOMContentLoaded', () => window.AccountInterestRatesModule?.init());
} else {
    window.AccountInterestRatesModule?.init();
}

console.log('✅ Account Interest Rates module loaded');
