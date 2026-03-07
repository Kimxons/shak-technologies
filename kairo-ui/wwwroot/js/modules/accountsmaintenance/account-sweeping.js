/**
 * Account Sweeping Module - CRUD Operations
 * Manages account sweeping configurations with full CRUD functionality
 * Uses MVC pattern with proper API service integration
 */

window.AccountSweepingModule = (function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════
    // STATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    const state = {
        accountId: null,
        branchId: null,
        operatorId: null,
        currentMode: 'VIEW',
        sweepingData: null,
        originalData: null,
        updateCount: 0,
        searchModal: null
    };

    const API = {
        GET: '/AccountsMaintenance/api/get-account-sweeping',
        ADD: '/AccountsMaintenance/api/add-account-sweeping',
        UPDATE: '/AccountsMaintenance/api/update-account-sweeping',
        DELETE: '/AccountsMaintenance/api/delete-account-sweeping'
    };

    const FORM_FIELDS = ['accountTransferId', 'accountTransferName', 'minThreshold', 'maxThreshold', 
                          'sweepingDenomination', 'startDate', 'endDate', 'lastSweepingDate'];

    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    function init() {
        console.log('[AccountSweeping] Initializing module...');
        getAccountContext();

        if (!state.accountId) {
            showMessage('No account selected. Please select an account first.', 'warning');
            return;
        }

        wireEvents();
        setMode('VIEW');
        loadData();
    }

    function getAccountContext() {
        // Try parent state first
        if (window.AccountMaintenanceState) {
            const ps = window.AccountMaintenanceState;
            state.accountId = ps.AccountID;
            state.branchId = ps.OurBranchID || ps.BranchID;
            state.operatorId = ps.OperatorID;
        } else if (window.parent?.AccountMaintenanceState) {
            const ps = window.parent.AccountMaintenanceState;
            state.accountId = ps.AccountID;
            state.branchId = ps.OurBranchID || ps.BranchID;
            state.operatorId = ps.OperatorID;
        } else {
            // Fallback to session storage
            state.accountId = sessionStorage.getItem('currentAccountID');
            state.branchId = sessionStorage.getItem('currentBranchID');
            state.operatorId = sessionStorage.getItem('currentOperatorID') || localStorage.getItem('OperatorID') || 'SYSTEM';
        }
        console.log('[AccountSweeping] Context:', { accountId: state.accountId, branchId: state.branchId });
    }

    // ═══════════════════════════════════════════════════════════════════
    // EVENT WIRING
    // ═══════════════════════════════════════════════════════════════════
    function wireEvents() {
        // Action buttons
        document.querySelectorAll('[data-action]').forEach(btn => {
            if (btn._swWired) return;
            btn._swWired = true;
            const action = btn.getAttribute('data-action');
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                handleAction(action);
            });
        });

        // Section toggles
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            if (header._swWired) return;
            header._swWired = true;
            header.addEventListener('click', () => toggleSection(header));
        });

        // Lookup buttons
        document.querySelectorAll('[data-lookup]').forEach(btn => {
            if (btn._swWired) return;
            btn._swWired = true;
            btn.addEventListener('click', () => openLookup(btn.getAttribute('data-lookup')));
        });

        // Form change tracking
        document.querySelectorAll('#frmSweeping input, #frmSweeping select').forEach(el => {
            if (el._swWired) return;
            el._swWired = true;
            el.addEventListener('change', () => { if (state.currentMode !== 'VIEW') state.isDirty = true; });
        });
    }

    function handleAction(action) {
        switch (action) {
            case 'view': setMode('VIEW'); break;
            case 'add': setMode('ADD'); break;
            case 'edit': setMode('EDIT'); break;
            case 'save': saveData(); break;
            case 'delete': deleteData(); break;
            case 'cancel': cancelChanges(); break;
        }
    }

    function toggleSection(header) {
        const section = header.closest('.form-section');
        const content = section?.querySelector('[data-section-content]');
        const btn = section?.querySelector('.section-toggle-btn');
        const icon = btn?.querySelector('i');
        const isExpanded = btn?.getAttribute('aria-expanded') === 'true';
        
        if (content) content.hidden = isExpanded;
        btn?.setAttribute('aria-expanded', String(!isExpanded));
        if (icon) {
            icon.classList.toggle('bi-chevron-up');
            icon.classList.toggle('bi-chevron-down');
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    function setMode(mode) {
        console.log('[AccountSweeping] Setting mode:', mode);
        state.currentMode = mode;
        const isEditing = mode === 'ADD' || mode === 'EDIT';

        // Enable/disable form fields
        FORM_FIELDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                // Keep lastSweepingDate always disabled
                if (id === 'lastSweepingDate') {
                    el.disabled = true;
                } else if (id === 'accountTransferName') {
                    el.disabled = true; // Always readonly
                } else {
                    el.disabled = !isEditing;
                }
            }
        });

        // Lookup buttons
        document.querySelectorAll('[data-lookup]').forEach(btn => {
            btn.disabled = !isEditing;
        });

        // Update action button states
        updateActionButtons(mode, isEditing);

        if (mode === 'ADD') {
            clearForm();
            state.sweepingData = null;
            state.originalData = null;
        }
    }

    function updateActionButtons(mode, isEditing) {
        const hasData = state.sweepingData !== null;
        
        const buttons = {
            'view': { active: mode === 'VIEW', disabled: mode === 'VIEW' },
            'add': { active: mode === 'ADD', disabled: isEditing },
            'edit': { active: mode === 'EDIT', disabled: isEditing || !hasData },
            'save': { active: false, disabled: !isEditing },
            'delete': { active: false, disabled: isEditing || !hasData },
            'cancel': { active: false, disabled: !isEditing }
        };

        Object.entries(buttons).forEach(([action, config]) => {
            const btn = document.querySelector(`[data-action="${action}"]`);
            if (btn) {
                btn.classList.toggle('active', config.active);
                btn.disabled = config.disabled;
                btn.style.opacity = config.disabled ? '0.5' : '1';
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // DATA OPERATIONS
    // ═══════════════════════════════════════════════════════════════════
    async function loadData() {
        console.log('[AccountSweeping] Loading data...');
        showLoading(true);

        try {
            const payload = {
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
                const data = result?.Details || result?.Data || result?.data;
                state.sweepingData = Array.isArray(data) ? data[0] : data;
                state.updateCount = state.sweepingData?.UpdateCount || 0;
                
                if (state.sweepingData) {
                    populateForm(state.sweepingData);
                    state.originalData = { ...state.sweepingData };
                } else {
                    clearForm();
                }
                showMessage('Sweeping configuration loaded', 'success');
            } else {
                // No data found is not an error - just empty
                if (result?.ResponseCode === '01' || result?.ResponseMessage?.includes('not found')) {
                    clearForm();
                    showMessage('No sweeping configuration found', 'info');
                } else {
                    showMessage(result?.ResponseMessage || 'Failed to load data', 'error');
                }
            }
        } catch (error) {
            console.error('[AccountSweeping] Load error:', error);
            showMessage('Failed to load data: ' + error.message, 'error');
        } finally {
            showLoading(false);
            updateActionButtons(state.currentMode, false);
        }
    }

    async function saveData() {
        console.log('[AccountSweeping] Saving data...');
        
        const formData = getFormData();
        if (!validateForm(formData)) return;

        showLoading(true);

        try {
            const payload = {
                ...formData,
                AccountID: state.accountId,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId,
                UpdateCount: state.updateCount
            };

            const endpoint = state.currentMode === 'ADD' ? API.ADD : API.UPDATE;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (isSuccess(result)) {
                showMessage(result?.ResponseMessage || 'Saved successfully', 'success');
                setMode('VIEW');
                await loadData();
            } else {
                showMessage(result?.ResponseMessage || 'Failed to save', 'error');
            }
        } catch (error) {
            console.error('[AccountSweeping] Save error:', error);
            showMessage('Failed to save: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    async function deleteData() {
        if (!state.sweepingData) {
            showMessage('No configuration to delete', 'warning');
            return;
        }

        if (!confirm('Are you sure you want to delete this sweeping configuration?')) return;

        console.log('[AccountSweeping] Deleting data...');
        showLoading(true);

        try {
            const payload = {
                AccountID: state.accountId,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId,
                SweepID: state.sweepingData?.SweepID || state.sweepingData?.ID
            };

            const response = await fetch(API.DELETE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (isSuccess(result)) {
                showMessage(result?.ResponseMessage || 'Deleted successfully', 'success');
                state.sweepingData = null;
                clearForm();
                updateActionButtons('VIEW', false);
            } else {
                showMessage(result?.ResponseMessage || 'Failed to delete', 'error');
            }
        } catch (error) {
            console.error('[AccountSweeping] Delete error:', error);
            showMessage('Failed to delete: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    function cancelChanges() {
        if (state.originalData) {
            populateForm(state.originalData);
        } else {
            clearForm();
        }
        setMode('VIEW');
    }

    // ═══════════════════════════════════════════════════════════════════
    // FORM HELPERS
    // ═══════════════════════════════════════════════════════════════════
    function populateForm(data) {
        if (!data) return;

        setValue('accountTransferId', data.AccountTransferID || data.ToAccountID || data.TransferAccountID);
        setValue('accountTransferName', data.AccountTransferName || data.ToAccountName || data.TransferAccountName);
        setValue('minThreshold', data.MinThreshold || data.MinimumThreshold || 0);
        setValue('maxThreshold', data.MaxThreshold || data.MaximumThreshold || 0);
        setValue('sweepingDenomination', data.SweepingDenomination || data.Denomination || 0);
        setValue('startDate', formatDateForInput(data.StartDate || data.EffectiveDate));
        setValue('endDate', formatDateForInput(data.EndDate || data.ExpiryDate));
        setValue('lastSweepingDate', formatDisplayDate(data.LastSweepingDate || data.LastSweepDate));

        // Audit fields
        setText('MakerID', data.CreatedBy || data.MakerID || '-');
        setText('MakerDT', formatDisplayDate(data.CreatedOn || data.MakerDT));
        setText('CheckerID', data.SupervisedBy || data.CheckerID || '-');
        setText('CheckerDT', formatDisplayDate(data.SupervisedOn || data.CheckerDT));
        setText('ModifierID', data.ModifiedBy || data.ModifierID || '-');
        setText('ModifierDT', formatDisplayDate(data.ModifiedOn || data.ModifierDT));
    }

    function getFormData() {
        return {
            AccountTransferID: getValue('accountTransferId'),
            AccountTransferName: getValue('accountTransferName'),
            MinThreshold: parseFloat(getValue('minThreshold')) || 0,
            MaxThreshold: parseFloat(getValue('maxThreshold')) || 0,
            SweepingDenomination: parseFloat(getValue('sweepingDenomination')) || 0,
            StartDate: getValue('startDate'),
            EndDate: getValue('endDate')
        };
    }

    function validateForm(data) {
        if (!data.AccountTransferID) {
            showMessage('Please select a transfer account', 'warning');
            document.getElementById('accountTransferId')?.focus();
            return false;
        }
        if (data.MinThreshold < 0 || data.MaxThreshold < 0) {
            showMessage('Threshold values cannot be negative', 'warning');
            return false;
        }
        if (data.MaxThreshold > 0 && data.MinThreshold > data.MaxThreshold) {
            showMessage('Min threshold cannot be greater than max threshold', 'warning');
            return false;
        }
        return true;
    }

    function clearForm() {
        FORM_FIELDS.forEach(id => setValue(id, ''));
        ['MakerID', 'MakerDT', 'CheckerID', 'CheckerDT', 'ModifierID', 'ModifierDT'].forEach(id => setText(id, '-'));
    }

    // ═══════════════════════════════════════════════════════════════════
    // LOOKUP
    // ═══════════════════════════════════════════════════════════════════
    function openLookup(lookupType) {
        if (state.currentMode === 'VIEW') return;

        // Use SearchModal if available
        if (window.SearchModal) {
            if (!state.searchModal) {
                state.searchModal = new SearchModal(window.AppCore);
            }
            state.searchModal.open({
                tableID: 'AccountID',
                moduleID: 'AccountMaintenance',
                ourbranchId: state.branchId,
                onSelect: (row) => {
                    setValue('accountTransferId', row.AccountID);
                    setValue('accountTransferName', row.AccountName || row.AccountTitle);
                }
            });
        } else {
            // Fallback - manual entry allowed
            console.log('[AccountSweeping] SearchModal not available, manual entry enabled');
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    function getValue(id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
    }

    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value ?? '';
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value ?? '-';
    }

    function isSuccess(result) {
        return result?.ResponseCode === '00' || result?.ResponseCode === 0 || 
               result?.success === true || result?.Success === true;
    }

    function formatDateForInput(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().split('T')[0];
        } catch { return ''; }
    }

    function formatDisplayDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch { return dateString; }
    }

    function showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.hidden = !show;
    }

    function showMessage(message, type = 'info') {
        const panel = document.querySelector('.am-message-panel');
        if (panel) {
            panel.hidden = false;
            panel.className = `am-message-panel am-message-panel--${type}`;
            const icon = panel.querySelector('i');
            const span = panel.querySelector('span');
            
            if (icon) {
                const iconClass = type === 'success' ? 'bi-check-circle' : 
                                  type === 'warning' ? 'bi-exclamation-triangle' :
                                  type === 'error' ? 'bi-exclamation-circle' : 'bi-info-circle';
                icon.className = `bi ${iconClass}`;
            }
            if (span) span.textContent = message;
            
            setTimeout(() => { panel.hidden = true; }, type === 'error' ? 5000 : 3000);
        }

        // Also try parent toast
        const toast = window.showSystemToast || window.parent?.showSystemToast;
        if (toast) {
            toast(message, { variant: type === 'error' ? 'danger' : type });
        }
        
        console.log(`[AccountSweeping] ${type.toUpperCase()}: ${message}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    return {
        init,
        loadData,
        saveData,
        deleteData,
        setMode,
        cancelChanges
    };
})();

// Auto-initialize when DOM is ready
(function() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => window.AccountSweepingModule?.init(), 100);
        });
    } else {
        setTimeout(() => window.AccountSweepingModule?.init(), 100);
    }
})();

console.log('[AccountSweeping] Module loaded');
