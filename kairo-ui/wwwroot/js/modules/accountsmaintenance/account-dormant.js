/**
 * Account Dormant Module - CRUD Operations
 * Manages account dormancy status with full CRUD functionality
 */

window.AccountDormantModule = (function () {
    'use strict';

    const state = {
        accountId: null,
        branchId: null,
        operatorId: null,
        currentMode: 'VIEW',
        dormantData: null,
        originalData: null
    };

    const API = {
        GET: '/AccountsMaintenance/api/get-account-dormant',
        UPDATE: '/AccountsMaintenance/api/edit-account-dormant'
    };

    /**
     * Initialize the module
     */
    function init() {
        console.log('[Dormant] Initializing module...');
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
            'edit': () => setMode('EDIT'),
            'save': saveData,
            'cancel': cancelChanges,
            'close': closeSubmodule,
            'activate': activateAccount,
            'mark-dormant': markDormant
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
        console.log('[Dormant] Setting mode:', mode);
        state.currentMode = mode;

        const isEditing = mode === 'EDIT';
        
        // Enable/disable form fields
        document.querySelectorAll('#dormantReason, #dormantDate, #reactivationDate, #remarks').forEach(field => {
            if (field) field.disabled = !isEditing;
        });

        // Update button states
        const buttons = {
            'view': { active: mode === 'VIEW', disabled: mode === 'VIEW' },
            'edit': { active: mode === 'EDIT', disabled: isEditing },
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
    }

    /**
     * Load dormant data from API
     */
    async function loadData() {
        console.log('[Dormant] Loading dormant data...');
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
            console.log('[Dormant] Response:', result);

            if (isSuccess(result)) {
                const data = result?.Details || result?.Data || result?.data;
                state.dormantData = Array.isArray(data) ? data[0] : data;
                
                if (state.dormantData) {
                    populateForm(state.dormantData);
                    updateStatusDisplay(state.dormantData);
                } else {
                    clearForm();
                    updateStatusDisplay(null);
                }
                showSuccess('Dormant status loaded');
            } else {
                clearForm();
                updateStatusDisplay(null);
            }
        } catch (error) {
            console.error('[Dormant] Error:', error);
            showError('Failed to load dormant data: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Update status display
     */
    function updateStatusDisplay(data) {
        const statusEl = document.getElementById('dormantStatus');
        const indicatorEl = document.querySelector('.dormant-indicator');
        
        const isDormant = data?.IsDormant || data?.DormantStatus === 'Y';
        
        if (statusEl) {
            statusEl.textContent = isDormant ? 'DORMANT' : 'ACTIVE';
            statusEl.className = `badge ${isDormant ? 'bg-warning text-dark' : 'bg-success'}`;
        }
        
        if (indicatorEl) {
            indicatorEl.classList.toggle('dormant', isDormant);
            indicatorEl.classList.toggle('active', !isDormant);
        }

        // Update action buttons based on status
        const activateBtn = document.querySelector('[data-action="activate"]');
        const markDormantBtn = document.querySelector('[data-action="mark-dormant"]');
        
        if (activateBtn) activateBtn.disabled = !isDormant;
        if (markDormantBtn) markDormantBtn.disabled = isDormant;
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

        setValue('dormantReason', data.DormantReason || data.ReasonID);
        setValue('dormantDate', formatDisplayDate(data.DormantDate || data.DormancyDate));
        setValue('reactivationDate', formatDisplayDate(data.ReactivationDate || data.LastActiveDate));
        setValue('remarks', data.Remarks || data.Notes);
        
        // Display account status info
        setValue('lastActivityDate', formatDisplayDate(data.LastActivityDate));
        setValue('dormantDays', data.DormantDays || data.DaysSinceLastActivity || '0');
        setValue('dormancyThreshold', data.DormancyThreshold || data.InactiveDaysThreshold || '365');

        populateAuditFields(data);
        state.originalData = { ...data };
    }

    /**
     * Get form data
     */
    function getFormData() {
        return {
            DormantReason: document.getElementById('dormantReason')?.value || '',
            DormantDate: parseApiDate(document.getElementById('dormantDate')?.value),
            ReactivationDate: parseApiDate(document.getElementById('reactivationDate')?.value),
            Remarks: document.getElementById('remarks')?.value || ''
        };
    }

    /**
     * Save dormant data
     */
    async function saveData() {
        console.log('[Dormant] Saving dormant data...');
        showLoading(true);

        try {
            const formData = getFormData();

            const searchKey = `[${state.branchId}:${state.accountId}]`;
            const payload = {
                ...formData,
                SearchKey: searchKey,
                AccountID: state.accountId,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId
            };

            const response = await fetch(API.UPDATE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (isSuccess(result)) {
                showSuccess(result?.ResponseMessage || 'Dormant data saved successfully');
                setMode('VIEW');
                await loadData();
            } else {
                showError(result?.ResponseMessage || 'Failed to save dormant data');
            }
        } catch (error) {
            console.error('[Dormant] Save error:', error);
            showError('Failed to save: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Activate dormant account
     */
    async function activateAccount() {
        if (!confirm('Are you sure you want to reactivate this dormant account?')) return;

        console.log('[Dormant] Activating account...');
        showLoading(true);

        try {
            const searchKey = `[${state.branchId}:${state.accountId}]`;
            const payload = {
                SearchKey: searchKey,
                AccountID: state.accountId,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId,
                Action: 'ACTIVATE',
                IsDormant: false
            };

            const response = await fetch(API.UPDATE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (isSuccess(result)) {
                showSuccess(result?.ResponseMessage || 'Account activated successfully');
                await loadData();
            } else {
                showError(result?.ResponseMessage || 'Failed to activate account');
            }
        } catch (error) {
            console.error('[Dormant] Activate error:', error);
            showError('Failed to activate: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Mark account as dormant
     */
    async function markDormant() {
        const reason = document.getElementById('dormantReason')?.value;
        if (!reason) {
            showWarning('Please select a dormancy reason first');
            return;
        }

        if (!confirm('Are you sure you want to mark this account as dormant?')) return;

        console.log('[Dormant] Marking account as dormant...');
        showLoading(true);

        try {
            const formData = getFormData();
            const searchKey = `[${state.branchId}:${state.accountId}]`;
            const payload = {
                ...formData,
                SearchKey: searchKey,
                AccountID: state.accountId,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId,
                Action: 'MARK_DORMANT',
                IsDormant: true
            };

            const response = await fetch(API.UPDATE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (isSuccess(result)) {
                showSuccess(result?.ResponseMessage || 'Account marked as dormant');
                await loadData();
            } else {
                showError(result?.ResponseMessage || 'Failed to mark account as dormant');
            }
        } catch (error) {
            console.error('[Dormant] Mark dormant error:', error);
            showError('Failed to mark as dormant: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Cancel changes
     */
    function cancelChanges() {
        if (state.dormantData) {
            populateForm(state.dormantData);
        } else {
            clearForm();
        }
        setMode('VIEW');
    }

    /**
     * Clear form
     */
    function clearForm() {
        ['dormantReason', 'dormantDate', 'reactivationDate', 'remarks', 'lastActivityDate', 'dormantDays', 'dormancyThreshold'].forEach(id => {
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
        activateAccount,
        markDormant,
        setMode,
        cancelChanges
    };
})();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.AccountDormantModule?.init());
} else {
    window.AccountDormantModule?.init();
}

console.log('✅ Account Dormant module loaded');
