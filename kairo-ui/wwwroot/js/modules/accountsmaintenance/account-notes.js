/**
 * Account Notes Module - Integrated with Parent Layout
 * This module integrates seamlessly into the Account Maintenance parent page
 */

window.AccountNotesModule = (function () {
    'use strict';

    const state = {
        accountId: null,
        branchId: null,
        operatorId: null,
        originalNotes: '',
        currentMode: 'VIEW',
        moduleId: 20 // Enforce integer type
    };

    /**
     * Initialize the module
     */
    function init() {
        console.log('[AccountNotes] Initializing module...');

        // Get account context from parent
        getAccountContext();

        if (!state.accountId) {
            showError('No account selected. Please select an account first.');
            return;
        }

        console.log('[AccountNotes] Account context:', state);

        // Wire up header controls
        wireHeaderControls();

        // NOTE: Action buttons are now wired by the parent script (modern-account-maintenance.js)

        // Wire up section toggles
        wireSectionToggles();

        // Set initial mode
        // The parent script will call setMode after wiring the buttons.

        // Load notes
        loadNotes();
    }

    /**
     * Get account context from parent page
     */
    function getAccountContext() {
        // Try to get from parent page's AccountMaintenanceState
        if (window.parent && window.parent !== window && window.parent.AccountMaintenanceState) {
            const parentState = window.parent.AccountMaintenanceState;
            state.accountId = parentState.AccountID;
            state.branchId = parentState.OurBranchID || parentState.BranchID;
            state.operatorId = parentState.OperatorID;
        } else {
            // Fallback to sessionStorage
            state.accountId = sessionStorage.getItem('currentAccountID');
            state.branchId = sessionStorage.getItem('currentBranchID');
            state.operatorId = sessionStorage.getItem('currentOperatorID') || 'SYSTEM';
        }

        // Validate context
        if (!state.branchId) {
            console.warn('[AccountNotes] BranchID is missing from context');
        }
        if (!state.accountId) {
             console.warn('[AccountNotes] AccountID is missing from context');
        }
    }

    /**
     * Wire header control buttons
     */
    function wireHeaderControls() {
        const refreshBtn = document.querySelector('[data-action="refresh"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadNotes();
            });
        }

        const maximizeBtn = document.querySelector('[data-action="maximize"]');
        if (maximizeBtn) {
            maximizeBtn.addEventListener('click', () => {
                const sidebar = document.getElementById('main-sidebar');
                if (sidebar) {
                    sidebar.classList.toggle('collapsed');
                }
                const icon = maximizeBtn.querySelector('i');
                if (icon) {
                    icon.classList.toggle('bi-arrows-fullscreen');
                    icon.classList.toggle('bi-arrows-angle-contract');
                }
            });
        }

        const closeBtn = document.querySelector('[data-action="close"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                closeSubmodule();
            });
        }
    }

    /**
     * Wire section toggle buttons
     */
    function wireSectionToggles() {
        const toggleBtns = document.querySelectorAll('.section-toggle-btn');
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const section = this.closest('.form-section');
                const content = section.querySelector('.section-content');
                const icon = this.querySelector('i');
                const isExpanded = this.getAttribute('aria-expanded') === 'true';

                if (content) {
                    content.hidden = isExpanded;
                }

                this.setAttribute('aria-expanded', !isExpanded);

                if (icon) {
                    icon.classList.toggle('bi-chevron-up');
                    icon.classList.toggle('bi-chevron-down');
                }
            });
        });
    }

    /**
     * Set form mode (VIEW or EDIT)
     */
    function setMode(mode) {
        console.log('[AccountNotes] Setting mode:', mode);
        state.currentMode = mode;

        const textarea = document.getElementById('accountNotesTextarea');
        // Buttons are in the parent document, but we can select them by their unique IDs
        const viewBtn = document.getElementById('submoduleBtnView');
        const editBtn = document.getElementById('submoduleBtnEdit');
        const saveBtn = document.getElementById('submoduleBtnSave');
        const cancelBtn = document.getElementById('submoduleBtnCancel');

        if (mode === 'VIEW') {
            if (textarea) {
                textarea.disabled = true;
                textarea.classList.remove('editing');
            }

            if (viewBtn) {
                viewBtn.classList.add('active');
                viewBtn.disabled = true;
            }
            if (editBtn) {
                editBtn.classList.remove('active');
                editBtn.disabled = false;
            }
            if (saveBtn) {
                saveBtn.disabled = true;
            }
            if (cancelBtn) {
                cancelBtn.disabled = true;
            }
        } else if (mode === 'EDIT') {
            if (textarea) {
                textarea.disabled = false;
                textarea.classList.add('editing');
                textarea.focus();
            }

            if (viewBtn) {
                viewBtn.classList.remove('active');
                viewBtn.disabled = false;
            }
            if (editBtn) {
                editBtn.classList.add('active');
                editBtn.disabled = true;
            }
            if (saveBtn) {
                saveBtn.disabled = false;
            }
            if (cancelBtn) {
                cancelBtn.disabled = false;
            }
        }
    }

    /**
     * Load notes from API
     */
    async function loadNotes() {
        console.log('[AccountNotes] Loading notes...');
        showLoading(true);

        // Ensure context is fresh
        getAccountContext();

        try {
            // Construct SearchKey in format [OurBranchID:AccountID]
            const searchKey = `[${state.branchId}:${state.accountId}]`;

            const payload = {
                SearchKey: searchKey,
                SearchID: searchKey, // Adding SearchID for backend compatibility (p_GetNotes_V0)
                OurBranchID: state.branchId,
                OperatorID: state.operatorId,
                ModuleID: state.moduleId
            };
            
            console.log('[AccountNotes] Payload:', payload);

            const csrfToken = document.querySelector('input[name="__RequestVerificationToken"]')?.value;

            const response = await fetch('/AccountsMaintenance/api/get-notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken && { 'RequestVerificationToken': csrfToken })
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('[AccountNotes] Response:', result);

            const isSuccess = result?.ResponseCode === '00' || 
                            result?.ResponseCode === 0 || 
                            result?.success === true ||
                            result?.Success === true;

            if (!isSuccess) {
                const errorMsg = result?.ResponseMessage || result?.message || result?.ErrorMessage || 'Failed to load notes';
                showError(errorMsg);
                return;
            }

            const data = result?.Details || result?.Data || result?.data || {};
            const notes = data?.Notes || data?.notes || '';

            state.originalNotes = notes;

            const textarea = document.getElementById('accountNotesTextarea');
            if (textarea) {
                textarea.value = notes;
            }

            populateAuditFields(data);
            showSuccess('Notes loaded successfully');

        } catch (error) {
            console.error('[AccountNotes] Error loading notes:', error);
            showError('Failed to load notes: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Save notes to API
     */
    async function saveNotes() {
        console.log('[AccountNotes] Saving notes...');
        showLoading(true);

        try {
            const textarea = document.getElementById('accountNotesTextarea');
            if (!textarea) {
                throw new Error('Notes textarea not found');
            }

            const notes = textarea.value.trim();

            if (notes === '') {
                showWarning('Please enter notes before saving');
                showLoading(false);
                return;
            }

            // Construct SearchKey in format [OurBranchID:AccountID]
            const searchKey = `[${state.branchId}:${state.accountId}]`;

            const payload = {
                SearchKey: searchKey,
                SearchID: searchKey, // Adding SearchID for backend compatibility
                Notes: notes,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId,
                ModuleID: state.moduleId
            };

            const csrfToken = document.querySelector('input[name="__RequestVerificationToken"]')?.value;

            const response = await fetch('/AccountsMaintenance/api/update-notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken && { 'RequestVerificationToken': csrfToken })
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('[AccountNotes] Save response:', result);

            // Normalize response check
            const data = result.data || result;
            const isSuccess = result.success || (data && (data.ResponseCode === '00' || data.ResponseCode === '000'));

            if (!isSuccess) {
                const errorMsg = result?.ResponseMessage || result?.message || result?.ErrorMessage || (data && data.ResponseMessage) || 'Failed to save notes';
                showError(errorMsg);
                return;
            }

            state.originalNotes = notes;
            
            // Show backend success message if available
            const successMsg = (data && data.ResponseMessage) || 'Notes saved successfully';
            showSuccess(successMsg);
            
            setMode('VIEW');

            // Reload to get updated audit trail
            setTimeout(() => {
                loadNotes();
            }, 500);

        } catch (error) {
            console.error('[AccountNotes] Error saving notes:', error);
            showError('Failed to save notes: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Cancel changes
     */
    function cancelChanges() {
        const textarea = document.getElementById('accountNotesTextarea');
        if (textarea) {
            textarea.value = state.originalNotes;
        }
        setMode('VIEW');
    }

    /**
     * Close submodule and return to parent
     */
    function closeSubmodule() {
        // Notify parent to close submodule and restore its UI
        if (window.parent && window.parent.AccountMaintenanceCore) {
            window.parent.AccountMaintenanceCore.closeSubmodule();
        } else {
            console.error('[AccountNotes] Cannot find parent to close submodule.');
            // Fallback just in case
            location.reload();
        }
    }

    /**
     * Populate audit trail fields
     */
    function populateAuditFields(data) {
        if (!data) return;

        const fields = {
            'notesCreatedBy': data.CreatedBy || data.createdBy || '-',
            'notesModifiedBy': data.ModifiedBy || data.modifiedBy || '-',
            'notesSupervisedBy': data.SupervisedBy || data.supervisedBy || '-',
            'notesCreatedOn': formatDate(data.CreatedOn || data.createdOn) || '-',
            'notesModifiedOn': formatDate(data.ModifiedOn || data.modifiedOn) || '-',
            'notesSupervisedOn': formatDate(data.SupervisedOn || data.supervisedOn) || '-'
        };

        Object.keys(fields).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = fields[id];
            }
        });
    }

    /**
     * Format date for display
     */
    function formatDate(dateString) {
        if (!dateString || dateString === '-') return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            if (window.GlobalUtils?.formatDateTime) {
                return window.GlobalUtils.formatDateTime(dateString);
            }
            return date.toLocaleString();
        } catch (e) {
            return dateString;
        }
    }

    /**
     * Show loading overlay
     */
    function showLoading(show) {
        const overlay = document.getElementById('notesLoadingOverlay');
        if (overlay) {
            overlay.hidden = !show;
        }
    }

    /**
     * Show success message
     */
    function showSuccess(message) {
        showMessage(message, 'success', 'bi-check-circle');
    }

    /**
     * Show warning message
     */
    function showWarning(message) {
        showMessage(message, 'warning', 'bi-exclamation-triangle');
    }

    /**
     * Show error message
     */
    function showError(message) {
        showMessage(message, 'error', 'bi-exclamation-circle');
    }

    /**
     * Show message
     */
    function showMessage(message, type, iconClass) {
        // 1. Use global system only for critical errors
        if (type === 'error') {
            if (window.parent && typeof window.parent.showSystemToast === 'function') {
                window.parent.showSystemToast(message, { variant: type });
            } else if (typeof window.showSystemToast === 'function') {
                window.showSystemToast(message, { variant: type });
            }
        }

        // 2. Always show submodule's internal message panel (Preferred "sattle" local feedback)
        const panel = document.getElementById('notesMessagePanel');
        if (!panel) return;

        panel.className = `submodule-message-panel submodule-message-panel--${type}`;
        panel.hidden = false;

        const icon = panel.querySelector('i');
        if (icon) {
            icon.className = iconClass;
        }

        const span = panel.querySelector('span');
        if (span) {
            span.textContent = message;
        }

        const duration = type === 'error' ? 5000 : 3000;
        setTimeout(() => {
            panel.hidden = true;
        }, duration);
    }

    // Public API
    return {
        init: init,
        loadNotes: loadNotes,
        saveNotes: saveNotes,
        setMode: setMode,
        cancelChanges: cancelChanges
    };
})();

// Auto-initialize when loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (window.AccountNotesModule) {
            window.AccountNotesModule.init();
        }
    });
} else {
    if (window.AccountNotesModule) {
        window.AccountNotesModule.init();
    }
}

console.log('✅ Account Notes module loaded');
