/**
 * Account Notes - JavaScript Implementation
 * Follows Client360 pattern for consistency
 */

(function (global) {
    'use strict';

    console.log('✅ [ACCOUNT-NOTES] Module loading...');

    // ============================================================================
    // SERVICE LAYER (Following Client360 pattern)
    // ============================================================================

    /**
     * Safe AppCore getter (supports iframe/parent contexts)
     */
    function getAppCore() {
        const win = window;
        return win.AppCore ||
            (win.parent && win.parent !== win && win.parent.AppCore) ||
            (win.top && win.top !== win && win.top.AppCore) ||
            null;
    }

    /**
     * Generic controller invoker (matches Client360 pattern)
     */
    function invokeAccountMaintenanceController(endpoint, requestData) {
        return new Promise((resolve, reject) => {
            const appCore = getAppCore();
            if (!appCore || typeof appCore.invokeController !== 'function') {
                reject(new Error('AppCore is not available (AppCore.invokeController not found)'));
                return;
            }

            appCore.invokeController(endpoint, requestData || {}, (error, response) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });
    }

    /**
     * Get API endpoints (from global constants)
     */
    function getApiEndpoints() {
        return window.ApiEndpoints?.AccountMaintenance || null;
    }

    /**
     * Account Maintenance Service (matches Client360Service pattern)
     */
    const AccountMaintenanceService = {
        getNotes(requestData) {
            const endpoints = getApiEndpoints();
            if (!endpoints || !endpoints.GET_NOTES) {
                return Promise.reject(new Error('API endpoints not loaded. Ensure api-endpoints.js is loaded before account-notes.js'));
            }
            return invokeAccountMaintenanceController(endpoints.GET_NOTES, requestData);
        },
        updateNotes(requestData) {
            const endpoints = getApiEndpoints();
            if (!endpoints || !endpoints.UPDATE_NOTES) {
                return Promise.reject(new Error('API endpoints not loaded. Ensure api-endpoints.js is loaded before account-notes.js'));
            }
            return invokeAccountMaintenanceController(endpoints.UPDATE_NOTES, requestData);
        }
    };

    // Export service to global scope
    global.AccountMaintenanceService = AccountMaintenanceService;

    // ============================================================================
    // UI STATE & DOM
    // ============================================================================

    // State
    let currentAccountId = null;
    let isEditMode = false;
    let originalNotes = '';

    // DOM Elements
    let notesTextarea = null;
    let btnView = null;
    let btnEdit = null;
    let btnSave = null;
    let btnCancel = null;
    let auditFields = {};

    /**
     * Initialize the module
     */
    function init() {
        console.log('[ACCOUNT-NOTES] Initializing...');

        // Get DOM elements
        notesTextarea = document.getElementById('notes');
        btnView = document.querySelector('[data-action="view"]');
        btnEdit = document.querySelector('[data-action="edit"]');
        btnSave = document.querySelector('[data-action="save"]');
        btnCancel = document.querySelector('[data-action="cancel"]');

        // Get audit fields
        auditFields = {
            createdBy: document.getElementById('CreatedBy'),
            modifiedBy: document.getElementById('ModifiedBy'),
            supervisedBy: document.getElementById('SupervisedBy'),
            createdOn: document.getElementById('CreatedOn'),
            modifiedOn: document.getElementById('ModifiedOn'),
            supervisedOn: document.getElementById('SupervisedOn')
        };

        // Wire up button events
        if (btnView) btnView.addEventListener('click', handleView);
        if (btnEdit) btnEdit.addEventListener('click', handleEdit);
        if (btnSave) btnSave.addEventListener('click', handleSave);
        if (btnCancel) btnCancel.addEventListener('click', handleCancel);

        // Listen for account selection from parent window
        window.addEventListener('message', handleAccountSelection);

        // Initial state: View mode (read-only)
        setMode('view');

        console.log('✅ [ACCOUNT-NOTES] Initialized successfully');
    }

    /**
     * Handle account selection from parent window
     */
    function handleAccountSelection(event) {
        if (event.data && event.data.action === 'accountSelected') {
            const accountId = event.data.accountId;
            console.log('[ACCOUNT-NOTES] Account selected:', accountId);
            loadNotes(accountId);
        }
    }

    /**
     * Load notes for account
     */
    async function loadNotes(accountId) {
        try {
            console.log('[ACCOUNT-NOTES] Loading notes for account:', accountId);

            currentAccountId = accountId;
            showLoading(true);

            // Use service layer (matches Client360 pattern)
            const response = await AccountMaintenanceService.getNotes({
                AccountId: accountId
            });

            console.log('[ACCOUNT-NOTES] Response:', response);

            // Check old API status pattern
            const status = getOldApiStatus(response);
            if (!status.ok) {
                showMessage(status.message || 'Failed to load notes', 'error');
                return;
            }

            // Extract data from response
            const data = response?.Data || response?.data || {};

            // Populate notes
            if (notesTextarea) {
                notesTextarea.value = data.Notes || '';
                originalNotes = data.Notes || '';
            }

            // Populate audit fields
            populateAuditFields(data);

            showMessage('Notes loaded successfully', 'success');
        } catch (error) {
            console.error('[ACCOUNT-NOTES] Error loading notes:', error);
            showMessage('Error loading notes: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    /**
     * Handle View button click
     */
    function handleView() {
        setMode('view');
        showMessage('View mode enabled', 'info');
    }

    /**
     * Handle Edit button click
     */
    function handleEdit() {
        if (!currentAccountId) {
            showMessage('Please select an account first', 'warning');
            return;
        }

        setMode('edit');
        notesTextarea.focus();
        showMessage('Edit mode enabled', 'info');
    }

    /**
     * Handle Save button click
     */
    async function handleSave() {
        if (!currentAccountId) {
            showMessage('No account selected', 'error');
            return;
        }

        const notes = notesTextarea.value.trim();

        // Check if notes changed
        if (notes === originalNotes) {
            showMessage('No changes to save', 'info');
            setMode('view');
            return;
        }

        try {
            console.log('[ACCOUNT-NOTES] Saving notes...');
            showLoading(true);

            // Use service layer (matches Client360 pattern)
            const response = await AccountMaintenanceService.updateNotes({
                AccountId: currentAccountId,
                Notes: notes
            });

            console.log('[ACCOUNT-NOTES] Save response:', response);

            // Check old API status pattern
            const status = getOldApiStatus(response);
            if (!status.ok) {
                showMessage(status.message || 'Failed to save notes', 'error');
                return;
            }

            originalNotes = notes;
            showMessage('Notes saved successfully', 'success');
            setMode('view');

            // Reload to get updated audit fields
            await loadNotes(currentAccountId);
        } catch (error) {
            console.error('[ACCOUNT-NOTES] Error saving notes:', error);
            showMessage('Error saving notes: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    /**
     * Handle Cancel button click
     */
    function handleCancel() {
        // Restore original notes
        if (notesTextarea) {
            notesTextarea.value = originalNotes;
        }

        setMode('view');
        showMessage('Changes cancelled', 'info');
    }

    /**
     * Set mode (view/edit)
     */
    function setMode(mode) {
        isEditMode = mode === 'edit';

        // Update textarea state
        if (notesTextarea) {
            notesTextarea.readOnly = !isEditMode;
            notesTextarea.classList.toggle('readonly', !isEditMode);
        }

        // Update button states
        if (btnView) {
            btnView.disabled = !isEditMode;
            btnView.classList.toggle('active', !isEditMode);
        }

        if (btnEdit) {
            btnEdit.disabled = isEditMode;
            btnEdit.classList.toggle('active', isEditMode);
        }

        if (btnSave) {
            btnSave.style.display = isEditMode ? '' : 'none';
        }

        if (btnCancel) {
            btnCancel.style.display = isEditMode ? '' : 'none';
        }
    }

    /**
     * Populate audit fields
     */
    function populateAuditFields(data) {
        if (auditFields.createdBy) auditFields.createdBy.textContent = data.CreatedBy || '-';
        if (auditFields.modifiedBy) auditFields.modifiedBy.textContent = data.ModifiedBy || '-';
        if (auditFields.supervisedBy) auditFields.supervisedBy.textContent = data.SupervisedBy || '-';
        if (auditFields.createdOn) auditFields.createdOn.textContent = data.CreatedOn || '-';
        if (auditFields.modifiedOn) auditFields.modifiedOn.textContent = data.ModifiedOn || '-';
        if (auditFields.supervisedOn) auditFields.supervisedOn.textContent = data.SupervisedOn || '-';
    }

    /**
     * Check old API status pattern (from Client360)
     */
    function getOldApiStatus(payload) {
        const candidates = [];
        if (payload) candidates.push(payload);
        if (Array.isArray(payload?.Details) && payload.Details.length) candidates.push(payload.Details[0]);
        if (Array.isArray(payload?.Details01) && payload.Details01.length) candidates.push(payload.Details01[0]);

        for (const candidate of candidates) {
            const code = candidate?.ResponseCode ?? candidate?.responseCode ?? candidate?.Status ?? candidate?.status ?? candidate?.code;
            if (code === undefined || code === null) continue;
            const normalized = String(code).trim();
            const ok = normalized === '' || normalized === '00' || normalized === '0' || normalized.toLowerCase() === 'ok' || normalized.toLowerCase() === 'success';
            const message = candidate?.ResponseMessage ?? candidate?.responseMessage ?? candidate?.Message ?? candidate?.message ?? '';
            return { ok, code: normalized, message };
        }

        return { ok: true, code: '', message: '' };
    }

    /**
     * Show loading overlay
     */
    function showLoading(show) {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.hidden = !show;
        }
    }

    /**
     * Show message to user (following Client360 pattern)
     */
    function showMessage(message, type = 'info') {
        console.log(`[ACCOUNT-NOTES] ${type.toUpperCase()}: ${message}`);

        const normalizedType = String(type || 'info').toLowerCase();

        // Prefer centralized NotificationService (used elsewhere in the app)
        if (window.NotificationService && typeof window.NotificationService.showToast === 'function') {
            window.NotificationService.showToast(message, normalizedType, 4000);
            return;
        }

        // Next, use an app-provided global toast if present
        if (typeof window.showToast === 'function') {
            window.showToast(message, normalizedType);
            return;
        }

        // Bootstrap 5 toast fallback
        if (window.bootstrap && typeof window.bootstrap.Toast === 'function') {
            const variantMap = {
                success: 'success',
                info: 'info',
                warning: 'warning',
                warn: 'warning',
                error: 'danger',
                danger: 'danger'
            };
            const variant = variantMap[normalizedType] || 'info';

            let container = document.getElementById('account-notes-toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'account-notes-toast-container';
                container.className = 'toast-container position-fixed top-0 end-0 p-3';
                container.style.zIndex = '11000';
                document.body.appendChild(container);
            }

            const toastEl = document.createElement('div');
            toastEl.className = `toast align-items-center text-bg-${variant} border-0`;
            toastEl.setAttribute('role', 'alert');
            toastEl.setAttribute('aria-live', 'assertive');
            toastEl.setAttribute('aria-atomic', 'true');
            toastEl.innerHTML = `
                <div class="d-flex">
                    <div class="toast-body">${String(message ?? '')}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            `.trim();

            container.appendChild(toastEl);
            const toast = new window.bootstrap.Toast(toastEl, { delay: 4000 });
            toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
            toast.show();
            return;
        }

        // Last resort: console log
        console.log(`[${normalizedType.toUpperCase()}] ${message}`);
    }

    /**
     * Public API
     */
    global.AccountNotes = {
        init,
        loadNotes
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ [ACCOUNT-NOTES] Module loaded');

})(typeof window !== 'undefined' ? window : global);
