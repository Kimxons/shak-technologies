/**
 * Account Nomination Module - CRUD Operations
 * Manages account nominees with full CREATE, READ, UPDATE, DELETE functionality
 */

window.AccountNominationModule = (function () {
    'use strict';

    const state = {
        accountId: null,
        branchId: null,
        operatorId: null,
        currentMode: 'VIEW',
        nominees: [],
        selectedIndex: -1,
        originalData: null
    };

    const API = {
        GET: '/AccountsMaintenance/api/get-account-nominee',
        ADD: '/AccountsMaintenance/api/add-account-nominee',
        UPDATE: '/AccountsMaintenance/api/update-account-nominee',
        DELETE: '/AccountsMaintenance/api/delete-account-nominee'
    };

    /**
     * Initialize the module
     */
    function init() {
        console.log('[AccountNomination] Initializing module...');
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
                const content = section.querySelector('.section-content');
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
        console.log('[AccountNomination] Setting mode:', mode);
        state.currentMode = mode;

        const isEditing = mode === 'ADD' || mode === 'EDIT';
        
        // Enable/disable form fields
        document.querySelectorAll('#nomineeId, #nominationPercentage, #isDependent, #isNominationRollover, #remarks').forEach(field => {
            if (field) field.disabled = !isEditing;
        });

        // Update button states
        const buttons = {
            'view': { active: mode === 'VIEW', disabled: mode === 'VIEW' },
            'add': { active: mode === 'ADD', disabled: isEditing },
            'edit': { active: mode === 'EDIT', disabled: isEditing || state.nominees.length === 0 },
            'save': { active: false, disabled: !isEditing },
            'delete': { active: false, disabled: isEditing || state.nominees.length === 0 },
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
     * Load nominees from API
     */
    async function loadData() {
        console.log('[AccountNomination] Loading nominees...');
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
            console.log('[AccountNomination] Response:', result);

            if (isSuccess(result)) {
                const data = result?.Details || result?.Data || result?.data || [];
                state.nominees = Array.isArray(data) ? data : (data ? [data] : []);
                
                if (state.nominees.length > 0) {
                    state.selectedIndex = 0;
                    populateForm(state.nominees[0]);
                } else {
                    clearForm();
                }
                showSuccess(`Loaded ${state.nominees.length} nominee(s)`);
            } else {
                showError(result?.ResponseMessage || 'Failed to load nominees');
            }
        } catch (error) {
            console.error('[AccountNomination] Error:', error);
            showError('Failed to load nominees: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Save nominee data
     */
    async function saveData() {
        console.log('[AccountNomination] Saving nominee...');
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
                showSuccess(result?.ResponseMessage || 'Nominee saved successfully');
                setMode('VIEW');
                await loadData();
            } else {
                showError(result?.ResponseMessage || 'Failed to save nominee');
            }
        } catch (error) {
            console.error('[AccountNomination] Save error:', error);
            showError('Failed to save nominee: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Delete nominee
     */
    async function deleteData() {
        if (state.nominees.length === 0) {
            showWarning('No nominee to delete');
            return;
        }

        if (!confirm('Are you sure you want to delete this nominee?')) return;

        console.log('[AccountNomination] Deleting nominee...');
        showLoading(true);

        try {
            const searchKey = `[${state.branchId}:${state.accountId}]`;
            const currentNominee = state.nominees[state.selectedIndex];
            
            const payload = {
                SearchKey: searchKey,
                AccountID: state.accountId,
                NomineeID: currentNominee?.NomineeID || document.getElementById('nomineeId')?.value,
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
                showSuccess(result?.ResponseMessage || 'Nominee deleted successfully');
                await loadData();
            } else {
                showError(result?.ResponseMessage || 'Failed to delete nominee');
            }
        } catch (error) {
            console.error('[AccountNomination] Delete error:', error);
            showError('Failed to delete nominee: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Cancel changes
     */
    function cancelChanges() {
        if (state.nominees.length > 0 && state.selectedIndex >= 0) {
            populateForm(state.nominees[state.selectedIndex]);
        } else {
            clearForm();
        }
        setMode('VIEW');
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

        const setChecked = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.checked = !!value;
        };

        setValue('nomineeId', data.NomineeID || data.nomineeId);
        setValue('nomineeName', data.NomineeName || data.nomineeName);
        setValue('nominationPercentage', data.NominationPercentage || data.nominationPercentage);
        setValue('remarks', data.Remarks || data.remarks);
        setChecked('isDependent', data.IsDependent || data.isDependent);
        setChecked('isNominationRollover', data.IsNominationRollover || data.isNominationRollover);

        // Audit fields
        populateAuditFields(data);
        
        state.originalData = { ...data };
    }

    /**
     * Get form data
     */
    function getFormData() {
        return {
            NomineeID: document.getElementById('nomineeId')?.value || '',
            NomineeName: document.getElementById('nomineeName')?.value || '',
            NominationPercentage: parseFloat(document.getElementById('nominationPercentage')?.value) || 0,
            IsDependent: document.getElementById('isDependent')?.checked || false,
            IsNominationRollover: document.getElementById('isNominationRollover')?.checked || false,
            Remarks: document.getElementById('remarks')?.value || ''
        };
    }

    /**
     * Validate form
     */
    function validateForm(data) {
        if (!data.NomineeID) {
            showWarning('Please select a nominee');
            return false;
        }
        if (data.NominationPercentage <= 0 || data.NominationPercentage > 100) {
            showWarning('Nomination percentage must be between 1 and 100');
            return false;
        }
        return true;
    }

    /**
     * Clear form
     */
    function clearForm() {
        ['nomineeId', 'nomineeName', 'nominationPercentage', 'remarks'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        ['isDependent', 'isNominationRollover'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.checked = false;
        });
        clearAuditFields();
    }

    /**
     * Populate audit fields
     */
    function populateAuditFields(data) {
        const fields = {
            'MakerID': data.CreatedBy || data.MakerID || '-',
            'MakerDT': formatDate(data.CreatedOn || data.MakerDT) || '-',
            'CheckerID': data.SupervisedBy || data.CheckerID || '-',
            'CheckerDT': formatDate(data.SupervisedOn || data.CheckerDT) || '-',
            'ModifierID': data.ModifiedBy || data.ModifierID || '-',
            'ModifierDT': formatDate(data.ModifiedOn || data.ModifierDT) || '-'
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
        ['MakerID', 'MakerDT', 'CheckerID', 'CheckerDT', 'ModifierID', 'ModifierDT'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '-';
        });
    }

    // Utility functions
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
    document.addEventListener('DOMContentLoaded', () => window.AccountNominationModule?.init());
} else {
    window.AccountNominationModule?.init();
}

console.log('✅ Account Nomination module loaded');
