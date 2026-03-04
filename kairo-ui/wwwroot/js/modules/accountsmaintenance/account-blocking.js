/**
 * Account Blocking Module - Block/Unblock Operations
 * Manages account blocking and unblocking with history
 */

window.AccountBlockingModule = (function () {
    'use strict';

    const state = {
        accountId: null,
        branchId: null,
        operatorId: null,
        currentMode: 'VIEW',
        blockedDetails: null,
        blockedHistory: [],
        originalData: null
    };

    const API = {
        GET_DETAILS: '/AccountsMaintenance/api/get-blocked-details',
        GET_HISTORY: '/AccountsMaintenance/api/get-blocked-history',
        BLOCK: '/AccountsMaintenance/api/block-entity',
        UNBLOCK: '/AccountsMaintenance/api/unblock-entity'
    };

    /**
     * Initialize the module
     */
    function init() {
        console.log('[Blocking] Initializing module...');
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
            'block': () => setMode('BLOCK'),
            'unblock': unblockEntity,
            'save': saveBlock,
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
        console.log('[Blocking] Setting mode:', mode);
        state.currentMode = mode;

        const isEditing = mode === 'BLOCK';
        
        // Enable/disable form fields
        document.querySelectorAll('#blockReasonId, #blockingType, #debitBlock, #creditBlock, #remarks').forEach(field => {
            if (field) field.disabled = !isEditing;
        });

        // Update button states
        const isBlocked = state.blockedDetails && (
            state.blockedDetails.IsBlocked || 
            state.blockedDetails.DebitBlock || 
            state.blockedDetails.CreditBlock
        );

        const buttons = {
            'view': { active: mode === 'VIEW', disabled: mode === 'VIEW' },
            'block': { active: mode === 'BLOCK', disabled: isEditing || isBlocked },
            'unblock': { active: false, disabled: !isBlocked },
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

        if (mode === 'BLOCK') {
            clearBlockForm();
        }
    }

    /**
     * Load blocking data from API
     */
    async function loadData() {
        console.log('[Blocking] Loading blocking data...');
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

            // Load current blocked details
            const detailsResponse = await fetch(API.GET_DETAILS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const detailsResult = await detailsResponse.json();
            console.log('[Blocking] Details response:', detailsResult);

            // Load blocking history
            const historyResponse = await fetch(API.GET_HISTORY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const historyResult = await historyResponse.json();
            console.log('[Blocking] History response:', historyResult);

            if (isSuccess(detailsResult)) {
                const data = detailsResult?.Details || detailsResult?.Data || detailsResult?.data;
                state.blockedDetails = Array.isArray(data) ? data[0] : data;
                populateBlockDetails(state.blockedDetails);
            }

            if (isSuccess(historyResult)) {
                const histData = historyResult?.Details || historyResult?.Data || historyResult?.data || [];
                state.blockedHistory = Array.isArray(histData) ? histData : [histData];
                renderHistoryGrid();
            }

            updateBlockStatus();
            showSuccess('Blocking data loaded');

        } catch (error) {
            console.error('[Blocking] Error:', error);
            showError('Failed to load blocking data: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Populate block details
     */
    function populateBlockDetails(data) {
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

        setValue('blockReasonId', data.BlockReasonID || data.ReasonID);
        setValue('blockReasonDesc', data.BlockReasonDescription || data.ReasonDescription);
        setValue('blockingType', data.BlockingType || data.BlockType);
        setValue('debitBlock', data.DebitBlock || data.IsDebitBlocked);
        setValue('creditBlock', data.CreditBlock || data.IsCreditBlocked);
        setValue('remarks', data.Remarks || data.BlockRemarks);

        populateAuditFields(data);
    }

    /**
     * Render blocking history grid
     */
    function renderHistoryGrid() {
        const tbody = document.querySelector('#blockingHistoryGrid tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (state.blockedHistory.length === 0) {
            tbody.innerHTML = '<tr class="table__empty"><td colspan="5">No blocking history found.</td></tr>';
            return;
        }

        state.blockedHistory.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(item.BlockedOn || item.ActionDate) || '-'}</td>
                <td>${escapeHtml(item.BlockedBy || item.ActionBy) || '-'}</td>
                <td>${escapeHtml(item.Action || item.ActionType) || '-'}</td>
                <td>${escapeHtml(item.Reason || item.BlockReason) || '-'}</td>
                <td>${escapeHtml(item.Remarks) || '-'}</td>
            `;
            tbody.appendChild(row);
        });
    }

    /**
     * Update block status indicator
     */
    function updateBlockStatus() {
        const statusEl = document.getElementById('blockStatus');
        if (!statusEl) return;

        const isBlocked = state.blockedDetails && (
            state.blockedDetails.IsBlocked || 
            state.blockedDetails.DebitBlock || 
            state.blockedDetails.CreditBlock
        );

        statusEl.className = isBlocked ? 'badge bg-danger' : 'badge bg-success';
        statusEl.textContent = isBlocked ? 'BLOCKED' : 'NOT BLOCKED';

        // Update mode after status update
        setMode('VIEW');
    }

    /**
     * Save block
     */
    async function saveBlock() {
        console.log('[Blocking] Saving block...');
        showLoading(true);

        try {
            const formData = getBlockFormData();
            if (!validateBlockForm(formData)) return;

            const searchKey = `[${state.branchId}:${state.accountId}]`;
            const payload = {
                ...formData,
                SearchKey: searchKey,
                AccountID: state.accountId,
                EntityType: 'ACCOUNT',
                OurBranchID: state.branchId,
                OperatorID: state.operatorId
            };

            const response = await fetch(API.BLOCK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (isSuccess(result)) {
                showSuccess(result?.ResponseMessage || 'Account blocked successfully');
                await loadData();
            } else {
                showError(result?.ResponseMessage || 'Failed to block account');
            }
        } catch (error) {
            console.error('[Blocking] Save error:', error);
            showError('Failed to block account: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Unblock entity
     */
    async function unblockEntity() {
        if (!confirm('Are you sure you want to unblock this account?')) return;

        console.log('[Blocking] Unblocking...');
        showLoading(true);

        try {
            const searchKey = `[${state.branchId}:${state.accountId}]`;
            const payload = {
                SearchKey: searchKey,
                AccountID: state.accountId,
                EntityType: 'ACCOUNT',
                OurBranchID: state.branchId,
                OperatorID: state.operatorId,
                UnblockRemarks: 'Unblocked via Account Maintenance'
            };

            const response = await fetch(API.UNBLOCK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (isSuccess(result)) {
                showSuccess(result?.ResponseMessage || 'Account unblocked successfully');
                await loadData();
            } else {
                showError(result?.ResponseMessage || 'Failed to unblock account');
            }
        } catch (error) {
            console.error('[Blocking] Unblock error:', error);
            showError('Failed to unblock account: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Get block form data
     */
    function getBlockFormData() {
        return {
            BlockReasonID: document.getElementById('blockReasonId')?.value || '',
            BlockingType: document.getElementById('blockingType')?.value || '',
            DebitBlock: document.getElementById('debitBlock')?.checked || false,
            CreditBlock: document.getElementById('creditBlock')?.checked || false,
            Remarks: document.getElementById('remarks')?.value || ''
        };
    }

    /**
     * Validate block form
     */
    function validateBlockForm(data) {
        if (!data.BlockReasonID) {
            showWarning('Please select a block reason');
            return false;
        }
        if (!data.DebitBlock && !data.CreditBlock) {
            showWarning('Please select at least one blocking type (Debit or Credit)');
            return false;
        }
        return true;
    }

    /**
     * Cancel changes
     */
    function cancelChanges() {
        populateBlockDetails(state.blockedDetails);
        setMode('VIEW');
    }

    /**
     * Clear block form
     */
    function clearBlockForm() {
        ['blockReasonId', 'blockingType', 'remarks'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        ['debitBlock', 'creditBlock'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.checked = false;
        });
    }

    /**
     * Populate audit fields
     */
    function populateAuditFields(data) {
        if (!data) return;
        const fields = {
            'MakerID': data.BlockedBy || data.CreatedBy || '-',
            'MakerDT': formatDate(data.BlockedOn || data.CreatedOn) || '-',
            'ModifierID': data.UnblockedBy || data.ModifiedBy || '-',
            'ModifierDT': formatDate(data.UnblockedOn || data.ModifiedOn) || '-'
        };

        Object.keys(fields).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = fields[id];
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
        saveBlock,
        unblockEntity,
        setMode,
        cancelChanges
    };
})();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.AccountBlockingModule?.init());
} else {
    window.AccountBlockingModule?.init();
}

console.log('✅ Account Blocking module loaded');
