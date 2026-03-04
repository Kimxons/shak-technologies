/**
 * Account Special Conditions Module - CRUD Operations
 * Manages account special conditions with grid-based editing
 */

window.AccountSpecialConditionsModule = (function () {
    'use strict';

    const state = {
        accountId: null,
        branchId: null,
        operatorId: null,
        currentMode: 'VIEW',
        conditions: [],
        originalConditions: [],
        modifiedConditions: new Set(),
        currentPage: 1,
        pageSize: 10
    };

    const API = {
        GET: '/AccountsMaintenance/api/get-account-special-conditions',
        ADD: '/AccountsMaintenance/api/add-account-special-condition',
        UPDATE: '/AccountsMaintenance/api/update-account-special-condition',
        DELETE: '/AccountsMaintenance/api/delete-account-special-condition'
    };

    /**
     * Initialize the module
     */
    function init() {
        console.log('[SpecialConditions] Initializing module...');
        getAccountContext();

        if (!state.accountId) {
            showError('No account selected. Please select an account first.');
            return;
        }

        wireHeaderControls();
        wireActionButtons();
        wireSearchFilter();
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
    }

    /**
     * Wire action panel buttons
     */
    function wireActionButtons() {
        const actions = {
            'edit': () => setMode('EDIT'),
            'save': saveData,
            'cancel': cancelChanges
        };

        Object.keys(actions).forEach(action => {
            document.querySelector(`[data-action="${action}"]`)?.addEventListener('click', actions[action]);
        });
    }

    /**
     * Wire search filter
     */
    function wireSearchFilter() {
        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.getElementById('clearSearch');

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value.toLowerCase().trim();
                filterConditions(searchTerm);
                if (clearBtn) clearBtn.classList.toggle('d-none', !searchTerm);
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearBtn.classList.add('d-none');
                filterConditions('');
            });
        }
    }

    /**
     * Wire section toggle buttons
     */
    function wireSectionToggles() {
        document.querySelectorAll('.section-toggle-btn, [data-section-toggle]').forEach(btn => {
            btn.addEventListener('click', function() {
                const section = this.closest('.form-section');
                const content = section.querySelector('.section-content, #btsBody');
                const icon = this.querySelector('i') || section.querySelector('.section-toggle-btn i');
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
        console.log('[SpecialConditions] Setting mode:', mode);
        state.currentMode = mode;
        state.modifiedConditions.clear();

        const isEditing = mode === 'EDIT';

        // Enable/disable grid editing
        document.querySelectorAll('#conditionsGrid input[type="checkbox"], #conditionsGrid input[type="text"]').forEach(field => {
            if (field) field.disabled = !isEditing;
        });

        // Update button states
        const editBtn = document.querySelector('[data-action="edit"]');
        const saveBtn = document.querySelector('[data-action="save"]');
        const cancelBtn = document.querySelector('[data-action="cancel"]');

        if (editBtn) editBtn.disabled = isEditing;
        if (saveBtn) saveBtn.disabled = !isEditing;
        if (cancelBtn) cancelBtn.disabled = !isEditing;

        if (!isEditing) {
            state.originalConditions = JSON.parse(JSON.stringify(state.conditions));
        }
    }

    /**
     * Load conditions from API
     */
    async function loadData() {
        console.log('[SpecialConditions] Loading conditions...');
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
            console.log('[SpecialConditions] Response:', result);

            if (isSuccess(result)) {
                const data = result?.Details || result?.Data || result?.data || [];
                state.conditions = Array.isArray(data) ? data : (data ? [data] : []);
                state.originalConditions = JSON.parse(JSON.stringify(state.conditions));
                
                renderGrid();
                updateRecordCount();
                showSuccess(`Loaded ${state.conditions.length} condition(s)`);
            } else {
                showError(result?.ResponseMessage || 'Failed to load conditions');
            }
        } catch (error) {
            console.error('[SpecialConditions] Error:', error);
            showError('Failed to load conditions: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Render the conditions grid
     */
    function renderGrid() {
        const tbody = document.querySelector('#conditionsGrid tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (state.conditions.length === 0) {
            tbody.innerHTML = '<tr class="table__empty"><td colspan="4">No special conditions found.</td></tr>';
            return;
        }

        const isEditing = state.currentMode === 'EDIT';

        state.conditions.forEach((condition, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            row.innerHTML = `
                <td class="text-center">
                    <input type="checkbox" class="form-check-input" data-field="Apply" 
                           ${condition.Apply ? 'checked' : ''} ${!isEditing ? 'disabled' : ''}>
                </td>
                <td>${escapeHtml(condition.Description || condition.ConditionDescription || '')}</td>
                <td class="text-center">
                    <input type="checkbox" class="form-check-input" data-field="Set" 
                           ${condition.Set || condition.IsSet ? 'checked' : ''} ${!isEditing ? 'disabled' : ''}>
                </td>
                <td>
                    <input type="text" class="form-control form-control-sm" data-field="Value" 
                           value="${escapeHtml(condition.Value || condition.ConditionValue || '')}" 
                           ${!isEditing ? 'disabled' : ''}>
                </td>
            `;

            // Wire change handlers
            row.querySelectorAll('input').forEach(input => {
                input.addEventListener('change', () => {
                    state.modifiedConditions.add(index);
                    updateCondition(index, input.dataset.field, 
                        input.type === 'checkbox' ? input.checked : input.value);
                });
            });

            tbody.appendChild(row);
        });
    }

    /**
     * Update a condition in state
     */
    function updateCondition(index, field, value) {
        if (state.conditions[index]) {
            state.conditions[index][field] = value;
        }
    }

    /**
     * Filter conditions by search term
     */
    function filterConditions(searchTerm) {
        const rows = document.querySelectorAll('#conditionsGrid tbody tr:not(.table__empty)');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = !searchTerm || text.includes(searchTerm) ? '' : 'none';
        });
    }

    /**
     * Update record count display
     */
    function updateRecordCount() {
        const countEl = document.getElementById('recordCount');
        if (countEl) {
            countEl.textContent = `${state.conditions.length} record${state.conditions.length !== 1 ? 's' : ''}`;
        }
    }

    /**
     * Save modified conditions
     */
    async function saveData() {
        if (state.modifiedConditions.size === 0) {
            showWarning('No changes to save');
            return;
        }

        console.log('[SpecialConditions] Saving conditions...');
        showLoading(true);

        try {
            const searchKey = `[${state.branchId}:${state.accountId}]`;
            let successCount = 0;
            let errorCount = 0;

            for (const index of state.modifiedConditions) {
                const condition = state.conditions[index];
                const payload = {
                    ...condition,
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
                    successCount++;
                } else {
                    errorCount++;
                }
            }

            if (errorCount === 0) {
                showSuccess(`${successCount} condition(s) saved successfully`);
                setMode('VIEW');
                await loadData();
            } else {
                showWarning(`Saved ${successCount}, failed ${errorCount}`);
            }
        } catch (error) {
            console.error('[SpecialConditions] Save error:', error);
            showError('Failed to save conditions: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Cancel changes
     */
    function cancelChanges() {
        state.conditions = JSON.parse(JSON.stringify(state.originalConditions));
        state.modifiedConditions.clear();
        renderGrid();
        setMode('VIEW');
    }

    /**
     * Populate audit fields
     */
    function populateAuditFields(data) {
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
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.hidden = !show;
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
        const panel = document.querySelector('.de-message-bar');
        if (panel) {
            panel.className = `de-message-bar de-message-bar--${type}`;
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
        setMode,
        cancelChanges
    };
})();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.AccountSpecialConditionsModule?.init());
} else {
    window.AccountSpecialConditionsModule?.init();
}

console.log('✅ Account Special Conditions module loaded');
