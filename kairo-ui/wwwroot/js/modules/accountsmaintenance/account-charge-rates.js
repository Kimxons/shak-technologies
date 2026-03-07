/**
 * Account Charge Rates Module - CRUD Operations
 * Manages account charge rates with full CRUD functionality
 */

window.AccountChargeRatesModule = (function () {
    'use strict';

    const state = {
        accountId: null,
        branchId: null,
        operatorId: null,
        currentMode: 'VIEW',
        chargeRates: [],
        chargeSettings: [],  // Grid settings data
        selectedIndex: -1,
        originalData: null
    };

    const API = {
        GET: '/AccountsMaintenance/api/get-account-charge-rate',
        ADD: '/AccountsMaintenance/api/add-account-charge-rate',
        UPDATE: '/AccountsMaintenance/api/update-account-charge-rate',
        DELETE: '/AccountsMaintenance/api/delete-account-charge-rate'
    };

    // Utility functions
    function formatNumber(n) { return n === null || n === undefined ? '0.00' : parseFloat(n).toFixed(2); }
    function escapeHtml(str) { if (!str) return ''; const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

    /**
     * Initialize the module
     */
    function init() {
        console.log('[ChargeRates] Initializing module...');
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

        // Wire grid action buttons (New, Alter, Remove, Update, Clear)
        wireGridActionButtons();
    }

    /**
     * Wire grid action buttons for charge settings table
     */
    function wireGridActionButtons() {
        const gridActions = {
            'new': gridNew,
            'alter': gridAlter,
            'remove': gridRemove,
            'update': gridUpdate,
            'clear': gridClear
        };

        Object.keys(gridActions).forEach(action => {
            document.querySelector(`[data-grid-action="${action}"]`)?.addEventListener('click', gridActions[action]);
        });
    }

    /**
     * Grid New - Clear form for new entry
     */
    function gridNew() {
        state.selectedIndex = -1;
        clearSettingsForm();
        enableSettingsForm(true);
    }

    /**
     * Grid Alter - Load selected row for editing
     */
    function gridAlter() {
        if (state.selectedIndex < 0 || !state.chargeSettings || state.chargeSettings.length === 0) {
            showWarning('Please select a row to alter');
            return;
        }
        populateSettingsForm(state.chargeSettings[state.selectedIndex]);
        enableSettingsForm(true);
    }

    /**
     * Grid Remove - Remove selected row
     */
    function gridRemove() {
        if (state.selectedIndex < 0 || !state.chargeSettings || state.chargeSettings.length === 0) {
            showWarning('Please select a row to remove');
            return;
        }
        if (!confirm('Are you sure you want to remove this charge setting?')) return;
        
        state.chargeSettings.splice(state.selectedIndex, 1);
        state.selectedIndex = -1;
        renderSettingsGrid();
        clearSettingsForm();
        showSuccess('Charge setting removed');
    }

    /**
     * Grid Update - Add/update row in grid
     */
    function gridUpdate() {
        const setting = getSettingsFormData();
        if (!setting.CeilingAmount && !setting.CeilingAmountType) {
            showWarning('Please fill in the settings');
            return;
        }

        if (!state.chargeSettings) state.chargeSettings = [];

        if (state.selectedIndex >= 0) {
            // Update existing row
            state.chargeSettings[state.selectedIndex] = setting;
        } else {
            // Add new row
            state.chargeSettings.push(setting);
        }

        state.selectedIndex = -1;
        renderSettingsGrid();
        clearSettingsForm();
        showSuccess('Charge setting updated');
    }

    /**
     * Grid Clear - Clear settings form
     */
    function gridClear() {
        state.selectedIndex = -1;
        clearSettingsForm();
    }

    /**
     * Get settings form data
     */
    function getSettingsFormData() {
        return {
            CeilingAmountType: document.getElementById('ceilingAmountType')?.value || '',
            CeilingAmount: parseFloat(document.getElementById('ceilingAmount')?.value) || 0,
            CalculationMethod: document.getElementById('calculationMethod')?.value || '',
            MinCharge: parseFloat(document.getElementById('minCharge')?.value) || 0,
            MaximumCharge: parseFloat(document.getElementById('maximumCharge')?.value) || 0,
            Value: parseFloat(document.getElementById('value')?.value) || 0,
            FixedAmount: parseFloat(document.getElementById('fixedAmount')?.value) || 0
        };
    }

    /**
     * Populate settings form
     */
    function populateSettingsForm(data) {
        if (!data) return;
        document.getElementById('ceilingAmountType').value = data.CeilingAmountType || data.CeilingAmountTypeID || '';
        document.getElementById('ceilingAmount').value = data.CeilingAmount || '';
        document.getElementById('calculationMethod').value = data.CalculationMethod || data.CalculationMethodID || '';
        document.getElementById('minCharge').value = data.MinCharge || data.MinimumCharge || '';
        document.getElementById('maximumCharge').value = data.MaximumCharge || '';
        document.getElementById('value').value = data.Value || '';
        document.getElementById('fixedAmount').value = data.FixedAmount || '';
    }

    /**
     * Clear settings form
     */
    function clearSettingsForm() {
        ['ceilingAmountType', 'ceilingAmount', 'calculationMethod', 'minCharge', 'maximumCharge', 'value', 'fixedAmount'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    }

    /**
     * Enable/disable settings form
     */
    function enableSettingsForm(enable) {
        ['ceilingAmountType', 'ceilingAmount', 'calculationMethod', 'minCharge', 'maximumCharge', 'value', 'fixedAmount'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !enable;
        });
    }

    /**
     * Render settings grid
     */
    function renderSettingsGrid() {
        const tbody = document.getElementById('chargeSettingsBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!state.chargeSettings || state.chargeSettings.length === 0) {
            tbody.innerHTML = '<tr class="no-records-row"><td colspan="6" class="text-center text-muted">No records to display.</td></tr>';
            return;
        }

        state.chargeSettings.forEach((setting, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            row.className = index === state.selectedIndex ? 'table-active' : '';
            row.innerHTML = `
                <td>${formatNumber(setting.CeilingAmount || 0)}</td>
                <td>${formatNumber(setting.MinCharge || setting.MinimumCharge || 0)}</td>
                <td>${formatNumber(setting.MaximumCharge || 0)}</td>
                <td>${escapeHtml(setting.CalculationMethod || setting.CalculationMethodID || '-')}</td>
                <td>${formatNumber(setting.Value || 0)}</td>
                <td>${formatNumber(setting.FixedAmount || 0)}</td>
            `;
            row.addEventListener('click', () => selectSettingRow(index));
            tbody.appendChild(row);
        });
    }

    /**
     * Select a setting row
     */
    function selectSettingRow(index) {
        state.selectedIndex = index;
        renderSettingsGrid();
        populateSettingsForm(state.chargeSettings[index]);
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
        console.log('[ChargeRates] Setting mode:', mode);
        state.currentMode = mode;

        const isEditing = mode === 'ADD' || mode === 'EDIT';
        
        // Enable/disable form fields
        document.querySelectorAll('#chargeCode, #chargeDescription, #chargeType, #chargeAmount, #chargePercentage, #effectiveDate, #expiryDate, #isActive').forEach(field => {
            if (field) field.disabled = !isEditing;
        });

        // Update button states
        const buttons = {
            'view': { active: mode === 'VIEW', disabled: mode === 'VIEW' },
            'add': { active: mode === 'ADD', disabled: isEditing },
            'edit': { active: mode === 'EDIT', disabled: isEditing || state.chargeRates.length === 0 },
            'save': { active: false, disabled: !isEditing },
            'delete': { active: false, disabled: isEditing || state.chargeRates.length === 0 },
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
     * Load charge rates from API
     */
    async function loadData() {
        console.log('[ChargeRates] Loading charge rates...');
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
            console.log('[ChargeRates] Response:', result);

            if (isSuccess(result)) {
                const data = result?.Details || result?.Data || result?.data || [];
                state.chargeRates = Array.isArray(data) ? data : (data ? [data] : []);
                
                if (state.chargeRates.length > 0) {
                    state.selectedIndex = 0;
                    populateForm(state.chargeRates[0]);
                    renderGrid();
                } else {
                    clearForm();
                }
                showSuccess(`Loaded ${state.chargeRates.length} charge rate(s)`);
            } else {
                showError(result?.ResponseMessage || 'Failed to load charge rates');
            }
        } catch (error) {
            console.error('[ChargeRates] Error:', error);
            showError('Failed to load charge rates: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Render charge rates grid (if applicable)
     */
    function renderGrid() {
        const tbody = document.querySelector('#chargeRatesGrid tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (state.chargeRates.length === 0) {
            tbody.innerHTML = '<tr class="table__empty"><td colspan="5">No charge rates found.</td></tr>';
            return;
        }

        state.chargeRates.forEach((rate, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            row.className = index === state.selectedIndex ? 'table-active' : '';
            row.innerHTML = `
                <td>${escapeHtml(rate.ChargeCode || rate.ChargeID) || '-'}</td>
                <td>${escapeHtml(rate.ChargeDescription || rate.Description) || '-'}</td>
                <td class="text-end">${formatNumber(rate.ChargeAmount || rate.Amount || 0)}</td>
                <td class="text-end">${formatNumber(rate.ChargePercentage || rate.Percentage || 0)}%</td>
                <td class="text-center">${rate.IsActive ? '<i class="bi bi-check-circle text-success"></i>' : '<i class="bi bi-x-circle text-danger"></i>'}</td>
            `;
            row.addEventListener('click', () => selectRate(index));
            tbody.appendChild(row);
        });
    }

    /**
     * Select a charge rate
     */
    function selectRate(index) {
        state.selectedIndex = index;
        populateForm(state.chargeRates[index]);
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

        setValue('chargeCode', data.ChargeCode || data.ChargeID);
        setValue('chargeDescription', data.ChargeDescription || data.Description);
        setValue('chargeType', data.ChargeType || data.ChargeTypeID);
        setValue('chargeAmount', data.ChargeAmount || data.Amount || 0);
        setValue('chargePercentage', data.ChargePercentage || data.Percentage || 0);
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
            ChargeCode: document.getElementById('chargeCode')?.value || '',
            ChargeDescription: document.getElementById('chargeDescription')?.value || '',
            ChargeType: document.getElementById('chargeType')?.value || '',
            ChargeAmount: parseFloat(document.getElementById('chargeAmount')?.value) || 0,
            ChargePercentage: parseFloat(document.getElementById('chargePercentage')?.value) || 0,
            EffectiveDate: parseApiDate(document.getElementById('effectiveDate')?.value),
            ExpiryDate: parseApiDate(document.getElementById('expiryDate')?.value),
            IsActive: document.getElementById('isActive')?.checked || false
        };
    }

    /**
     * Save charge rate
     */
    async function saveData() {
        console.log('[ChargeRates] Saving charge rate...');
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
                showSuccess(result?.ResponseMessage || 'Charge rate saved successfully');
                setMode('VIEW');
                await loadData();
            } else {
                showError(result?.ResponseMessage || 'Failed to save charge rate');
            }
        } catch (error) {
            console.error('[ChargeRates] Save error:', error);
            showError('Failed to save charge rate: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Delete charge rate
     */
    async function deleteData() {
        if (state.chargeRates.length === 0) {
            showWarning('No charge rate to delete');
            return;
        }

        if (!confirm('Are you sure you want to delete this charge rate?')) return;

        console.log('[ChargeRates] Deleting charge rate...');
        showLoading(true);

        try {
            const searchKey = `[${state.branchId}:${state.accountId}]`;
            const currentRate = state.chargeRates[state.selectedIndex];
            
            const payload = {
                SearchKey: searchKey,
                AccountID: state.accountId,
                ChargeCode: currentRate?.ChargeCode || currentRate?.ChargeID,
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
                showSuccess(result?.ResponseMessage || 'Charge rate deleted successfully');
                await loadData();
            } else {
                showError(result?.ResponseMessage || 'Failed to delete charge rate');
            }
        } catch (error) {
            console.error('[ChargeRates] Delete error:', error);
            showError('Failed to delete charge rate: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Validate form
     */
    function validateForm(data) {
        if (!data.ChargeCode) {
            showWarning('Please enter a charge code');
            return false;
        }
        return true;
    }

    /**
     * Cancel changes
     */
    function cancelChanges() {
        if (state.chargeRates.length > 0 && state.selectedIndex >= 0) {
            populateForm(state.chargeRates[state.selectedIndex]);
        } else {
            clearForm();
        }
        setMode('VIEW');
    }

    /**
     * Clear form
     */
    function clearForm() {
        ['chargeCode', 'chargeDescription', 'chargeType', 'chargeAmount', 'chargePercentage', 'effectiveDate', 'expiryDate'].forEach(id => {
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
        return parseFloat(num || 0).toFixed(2);
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
    document.addEventListener('DOMContentLoaded', () => window.AccountChargeRatesModule?.init());
} else {
    window.AccountChargeRatesModule?.init();
}

console.log('✅ Account Charge Rates module loaded');
