/**
 * Account Signatories Module - Integrated with Parent Layout
 * Uses REST API pattern with staging collection for batch saves
 */

window.AccountSignatoriesModule = (function () {
    'use strict';

    const state = {
        accountId: null,
        branchId: null,
        operatorId: null,
        moduleId: 20,
        currentMode: 'VIEW', // VIEW, ADD, EDIT, ALTER
        signatories: [],  // Full list from database
        selectedRow: null,
        pendingChanges: []  // Track: { action: 'add'|'edit'|'delete', data: {...}, index: number }
    };

    /**
     * Initialize the module
     */
    function init() {
        console.log('[AccountSignatories] Initializing module...');

        // Get account context from parent
        getAccountContext();

        if (!state.accountId) {
            showError('No account selected. Please select an account first.');
            return;
        }

        console.log('[AccountSignatories] Account context:', state);

        // Wire up header controls
        wireHeaderControls();

        // Wire up action buttons
        wireActionButtons();

        // Wire up row selection
        wireRowEvents();

        // Wire up section toggles
        wireSectionToggles();

        // Set initial mode
        setMode('VIEW');

        // Load signatories
        loadSignatories();
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

        if (!state.branchId) {
            console.warn('[AccountSignatories] BranchID is missing from context');
        }
        if (!state.accountId) {
            console.warn('[AccountSignatories] AccountID is missing from context');
        }
    }

    /**
     * Wire header control buttons
     */
    function wireHeaderControls() {
        const refreshBtn = document.querySelector('[data-action="refresh"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadSignatories();
            });
        }

        const maximizeBtn = document.querySelector('[data-action="maximize"]');
        if (maximizeBtn) {
            maximizeBtn.addEventListener('click', () => {
                const windowEl = document.querySelector('.window');
                if (windowEl) {
                    windowEl.classList.toggle('maximized');
                }
                const icon = maximizeBtn.querySelector('i');
                if (icon) {
                    icon.classList.toggle('bi-square');
                    icon.classList.toggle('bi-fullscreen-exit');
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
     * Wire action buttons
     */
    function wireActionButtons() {
        // Form section buttons
        const actions = ['new', 'alter', 'remove', 'update', 'clear', 'close-form'];
        actions.forEach(action => {
            const btn = document.querySelector(`.form-section .btn[data-action="${action}"]`);
            if (btn) {
                btn.addEventListener('click', () => handleFormAction(action));
            }
        });

        // Action panel buttons
        const panelActions = ['signature', 'photo', 'both', 'add', 'edit', 'save', 'cancel'];
        panelActions.forEach(action => {
            const btn = document.querySelector(`.action-panel .btn-action[data-action="${action}"]`);
            if (btn) {
                btn.addEventListener('click', () => handlePanelAction(action));
            }
        });

        // Refresh list button
        const refreshListBtn = document.querySelector('[data-action="refresh-list"]');
        if (refreshListBtn) {
            refreshListBtn.addEventListener('click', () => loadSignatories());
        }

        // Search buttons
        document.querySelectorAll('.btn-lookup').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-lookup');
                openSearch(targetId);
            });
        });

        // Image zoom and download buttons
        const zoomSigBtn = document.querySelector('[data-action="zoom-sig"]');
        if (zoomSigBtn) {
            zoomSigBtn.addEventListener('click', () => zoomImage('signature'));
        }

        const zoomPhotoBtn = document.querySelector('[data-action="zoom-photo"]');
        if (zoomPhotoBtn) {
            zoomPhotoBtn.addEventListener('click', () => zoomImage('photo'));
        }

        const downloadSigBtn = document.querySelector('[data-action="download-sig"]');
        if (downloadSigBtn) {
            downloadSigBtn.addEventListener('click', () => downloadImage('signature'));
        }

        const downloadPhotoBtn = document.querySelector('[data-action="download-photo"]');
        if (downloadPhotoBtn) {
            downloadPhotoBtn.addEventListener('click', () => downloadImage('photo'));
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
                const isExpanded = this.getAttribute('aria-expanded') !== 'false';

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
     * Wire row selection events
     */
    function wireRowEvents() {
        const tableBody = document.getElementById('signatoryTableBody');
        if (tableBody) {
            tableBody.addEventListener('click', (e) => {
                const row = e.target.closest('tr[data-index]');
                if (!row) return;

                const idx = parseInt(row.dataset.index, 10);
                selectRow(idx);
            });
        }
    }

    /**
     * Select a row in the grid
     */
    function selectRow(index) {
        const tableBody = document.getElementById('signatoryTableBody');
        if (!tableBody) return;

        // Remove previous selection
        tableBody.querySelectorAll('tr.selected').forEach(r => r.classList.remove('selected'));

        // Select this row
        const row = tableBody.querySelector(`tr[data-index="${index}"]`);
        if (row) {
            row.classList.add('selected');
            state.selectedRow = index;

            // Populate form with row data
            const data = state.signatories[index];
            if (data) {
                populateForm(data);
                setMode('EDIT');
                showInfo('Signatory selected. Click ALTER to modify.');
                
                // Auto-load signature and photo for selected signatory
                const signatoryId = data.SignatoryID || data.signatoryID;
                const signatoryName = data.SignatoryName || data.signatoryName || signatoryId;
                displaySignatoryImage('signature', signatoryId, signatoryName);
                displaySignatoryImage('photo', signatoryId, signatoryName);
            }
        }
    }

    /**
     * Set form mode
     */
    function setMode(mode) {
        console.log('[AccountSignatories] Setting mode:', mode);
        state.currentMode = mode;

        const formSection = document.querySelector('.form-section');
        
        // Form section buttons
        const newBtn = document.querySelector('.form-section .btn[data-action="new"]');
        const alterBtn = document.querySelector('.form-section .btn[data-action="alter"]');
        const removeBtn = document.querySelector('.form-section .btn[data-action="remove"]');
        const updateBtn = document.querySelector('.form-section .btn[data-action="update"]');
        const clearBtn = document.querySelector('.form-section .btn[data-action="clear"]');
        const closeBtn = document.querySelector('.form-section .btn[data-action="close-form"]');

        // Action panel buttons
        const signatureBtn = document.querySelector('.action-panel .btn-action[data-action="signature"]');
        const photoBtn = document.querySelector('.action-panel .btn-action[data-action="photo"]');
        const bothBtn = document.querySelector('.action-panel .btn-action[data-action="both"]');
        const addBtn = document.querySelector('.action-panel .btn-action[data-action="add"]');
        const editBtn = document.querySelector('.action-panel .btn-action[data-action="edit"]');
        const saveBtn = document.querySelector('.action-panel .btn-action[data-action="save"]');
        const cancelBtn = document.querySelector('.action-panel .btn-action[data-action="cancel"]');

        const setEnabled = (btn, enabled) => {
            if (btn) btn.disabled = !enabled;
        };

        // Determine if there are pending changes
        const hasPendingChanges = state.pendingChanges.length > 0;
        const hasSelection = state.selectedRow !== null;
        const hasData = state.signatories.length > 0;

        switch (mode) {
            case 'VIEW':
                // View mode - Edit button enabled, others depend on state
                setEnabled(signatureBtn, hasSelection);
                setEnabled(photoBtn, hasSelection);
                setEnabled(bothBtn, hasSelection);
                setEnabled(editBtn, true);
                setEnabled(addBtn, false);
                setEnabled(saveBtn, hasPendingChanges);
                setEnabled(cancelBtn, hasPendingChanges);

                // Form buttons disabled in VIEW
                setEnabled(newBtn, false);
                setEnabled(alterBtn, false);
                setEnabled(removeBtn, false);
                setEnabled(updateBtn, false);
                setEnabled(clearBtn, false);
                setEnabled(closeBtn, false);

                setFormFieldsReadonly(true);
                break;

            case 'ADD':
                // Add mode - form is editable, Update button saves to staging
                setEnabled(signatureBtn, false);
                setEnabled(photoBtn, false);
                setEnabled(bothBtn, false);
                setEnabled(addBtn, false);
                setEnabled(editBtn, false);
                setEnabled(saveBtn, false);
                setEnabled(cancelBtn, true);

                setEnabled(newBtn, false);
                setEnabled(alterBtn, false);
                setEnabled(removeBtn, false);
                setEnabled(updateBtn, true);  // Update adds to staging
                setEnabled(clearBtn, true);
                setEnabled(closeBtn, true);

                setFormFieldsReadonly(false);
                break;

            case 'EDIT':
                // Row selected - can alter, remove, or enter edit mode
                setEnabled(signatureBtn, true);
                setEnabled(photoBtn, true);
                setEnabled(bothBtn, true);
                setEnabled(editBtn, true);
                setEnabled(addBtn, false);
                setEnabled(saveBtn, hasPendingChanges);
                setEnabled(cancelBtn, hasPendingChanges);

                setEnabled(newBtn, true);
                setEnabled(alterBtn, true);
                setEnabled(removeBtn, true);
                setEnabled(updateBtn, false);
                setEnabled(clearBtn, true);
                setEnabled(closeBtn, true);

                setFormFieldsReadonly(true);
                break;

            case 'ALTER':
                // Alter mode - form is editable for selected row
                setEnabled(signatureBtn, true);
                setEnabled(photoBtn, true);
                setEnabled(bothBtn, true);
                setEnabled(addBtn, false);
                setEnabled(editBtn, false);
                setEnabled(saveBtn, true);
                setEnabled(cancelBtn, true);

                setEnabled(newBtn, false);
                setEnabled(alterBtn, false);
                setEnabled(removeBtn, false);
                setEnabled(updateBtn, true);  // Update saves changes to staging
                setEnabled(clearBtn, true);
                setEnabled(closeBtn, true);

                setFormFieldsReadonly(false);
                break;
        }
    }

    /**
     * Set form fields to readonly or editable
     */
    function setFormFieldsReadonly(readonly) {
        const form = document.querySelector('[data-main-form]');
        if (!form) return;

        // Text inputs
        form.querySelectorAll('input[type="text"]').forEach(el => {
            el.readOnly = readonly;
            el.classList.toggle('readonly', readonly);
        });

        // Select dropdowns
        form.querySelectorAll('select').forEach(el => {
            el.disabled = readonly;
            el.classList.toggle('readonly', readonly);
        });

        // Checkbox
        const mandatory = document.getElementById('isMandatory');
        if (mandatory) {
            mandatory.disabled = readonly;
        }

        // Lookup buttons
        document.querySelectorAll('.btn-lookup').forEach(btn => {
            btn.disabled = readonly;
            btn.style.opacity = readonly ? '0.5' : '1';
        });
    }

    /**
     * Handle form section action buttons
     */
    function handleFormAction(action) {
        console.log('[AccountSignatories] Form action:', action);

        switch (action) {
            case 'new':
                // Clear form and enter ADD mode
                clearForm();
                state.selectedRow = null;
                setMode('ADD');
                showInfo('Enter signatory details and click Update to add.');
                document.getElementById('signatoryId')?.focus();
                break;

            case 'alter':
                // Enter ALTER mode for selected row
                if (state.selectedRow !== null) {
                    setMode('ALTER');
                    showInfo('Modify details and click Update to stage changes.');
                    document.getElementById('signatoryId')?.focus();
                } else {
                    showWarning('Please select a signatory first.');
                }
                break;

            case 'remove':
                // Mark selected row for deletion
                if (state.selectedRow !== null) {
                    markForDeletion(state.selectedRow);
                } else {
                    showWarning('Please select a signatory first.');
                }
                break;

            case 'update':
                // Stage current form data
                stageCurrentChanges();
                break;

            case 'clear':
                // Clear form
                clearForm();
                setMode(state.selectedRow !== null ? 'EDIT' : 'VIEW');
                break;

            case 'close-form':
                // Close form section or reset
                clearForm();
                state.selectedRow = null;
                setMode('VIEW');
                break;
        }
    }

    /**
     * Handle action panel buttons
     */
    function handlePanelAction(action) {
        console.log('[AccountSignatories] Panel action:', action);

        switch (action) {
            case 'signature':
            case 'photo':
            case 'both':
                openImageCapture(action);
                break;

            case 'add':
                // Same as 'new'
                clearForm();
                state.selectedRow = null;
                setMode('ADD');
                showInfo('Enter signatory details and click Update to add.');
                break;

            case 'edit':
                // Enter general edit mode
                setMode('EDIT');
                showInfo('Select a signatory to edit, or click New to add.');
                break;

            case 'save':
                // Save all staged changes to database
                saveAllChanges();
                break;

            case 'cancel':
                // Cancel pending changes
                cancelPendingChanges();
                break;
        }
    }

    /**
     * Stage current form changes
     */
    function stageCurrentChanges() {
        const formData = collectFormData();

        // Validate
        if (!formData.SignatoryID) {
            showError('Signatory ID is required.');
            return;
        }
        if (!formData.SignatoryTypeID) {
            showError('Signatory Type is required.');
            return;
        }

        if (state.currentMode === 'ADD') {
            // Add new signatory to staging
            formData._isNew = true;
            formData._rowAction = 'ADD';
            const newIndex = state.signatories.length;
            state.signatories.push(formData);
            state.pendingChanges.push({ action: 'add', data: formData, index: newIndex });

            showSuccess('Signatory added to staging. Click Save to persist.');
        } else if (state.currentMode === 'ALTER' && state.selectedRow !== null) {
            // Update existing signatory in staging
            const existing = state.signatories[state.selectedRow];
            Object.assign(existing, formData);
            existing._isModified = true;
            existing._rowAction = 'UPDATE';

            // Check if already in pending changes
            const existingChange = state.pendingChanges.find(c => c.index === state.selectedRow);
            if (existingChange) {
                existingChange.data = formData;
            } else {
                state.pendingChanges.push({ action: 'edit', data: formData, index: state.selectedRow });
            }

            showSuccess('Changes staged. Click Save to persist.');
        }

        // Refresh grid
        renderGrid(state.signatories);

        // Reset form
        clearForm();
        state.selectedRow = null;
        setMode('VIEW');
    }

    /**
     * Mark a row for deletion
     */
    function markForDeletion(index) {
        const signatory = state.signatories[index];
        if (!signatory) return;

        if (signatory._isNew) {
            // Remove from array entirely if it was new (not yet saved)
            state.signatories.splice(index, 1);
            state.pendingChanges = state.pendingChanges.filter(c => c.index !== index);
            showInfo('New signatory removed.');
        } else {
            // Mark existing for deletion
            signatory._isDeleted = true;
            signatory._rowAction = 'REMOVE';
            state.pendingChanges.push({ action: 'delete', data: signatory, index: index });
            showWarning('Signatory marked for deletion. Click Save to persist.');
        }

        // Refresh grid
        renderGrid(state.signatories);

        // Clear selection
        clearForm();
        state.selectedRow = null;
        setMode('VIEW');
    }

    /**
     * Cancel pending changes
     */
    function cancelPendingChanges() {
        state.pendingChanges = [];
        loadSignatories();
        showInfo('Changes cancelled.');
    }

    /**
     * Collect form data
     */
    function collectFormData() {
        const getValue = (id) => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : '';
        };

        const sigTypeSelect = document.getElementById('signatoryType');
        const sigTypeValue = sigTypeSelect ? sigTypeSelect.value : '';
        const sigTypeText = sigTypeSelect?.options[sigTypeSelect.selectedIndex]?.text || '';

        return {
            SignatoryID: getValue('signatoryId'),
            SignatoryName: getValue('signatoryName') || getValue('signatoryId'),
            GroupID: getValue('groupId'),
            SignatoryTypeID: sigTypeValue,
            SignatoryType: sigTypeText,
            ReferenceID: getValue('sequenceNo'),
            Limit: getValue('limit'),
            Mandates: getValue('mandates'),
            IsMandatory: document.getElementById('isMandatory')?.checked || false
        };
    }

    /**
     * Populate form with signatory data
     */
    function populateForm(data) {
        if (!data) return;

        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value ?? '';
        };

        setValue('signatoryId', data.SignatoryID || '');
        setValue('signatoryName', data.SignatoryName || '');
        setValue('groupId', data.GroupID || data.Limit || '');
        setValue('sequenceNo', data.ReferenceID || data.SequenceNo || '');
        setValue('limit', data.Limit || '');
        setValue('mandates', data.Mandates || '');

        // Signatory Type dropdown
        const sigTypeSelect = document.getElementById('signatoryType');
        if (sigTypeSelect) {
            sigTypeSelect.value = data.SignatoryTypeID || '';
        }

        // Is Mandatory checkbox
        const mandatory = document.getElementById('isMandatory');
        if (mandatory) {
            mandatory.checked = data.IsMandatory === true || data.IsMandatory === 'true' || data.IsMandatory === 1;
        }
    }

    /**
     * Clear form
     */
    function clearForm() {
        const fields = ['signatoryId', 'signatoryName', 'groupId', 'sequenceNo', 'limit', 'mandates'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        const sigTypeSelect = document.getElementById('signatoryType');
        if (sigTypeSelect) sigTypeSelect.value = '';

        const mandatory = document.getElementById('isMandatory');
        if (mandatory) mandatory.checked = false;

        // Remove row selection
        const tableBody = document.getElementById('signatoryTableBody');
        if (tableBody) {
            tableBody.querySelectorAll('tr.selected').forEach(r => r.classList.remove('selected'));
        }
    }

    /**
     * Load signatories from API
     */
    async function loadSignatories() {
        console.log('[AccountSignatories] Loading signatories...');
        showLoading(true);

        // Refresh context
        getAccountContext();

        try {
            const searchKey = `[${state.branchId}:${state.accountId}]`;

            const payload = {
                SearchKey: searchKey,
                SearchID: searchKey,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId,
                ModuleID: state.moduleId
            };

            console.log('[AccountSignatories] Load payload:', payload);

            const csrfToken = document.querySelector('input[name="__RequestVerificationToken"]')?.value;

            const response = await fetch('/AccountsMaintenance/api/get-account-signatories', {
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
            console.log('[AccountSignatories] Response:', result);

            const isSuccess = result?.ResponseCode === '00' ||
                result?.ResponseCode === 0 ||
                result?.success === true ||
                result?.Success === true;

            if (!isSuccess) {
                const errorMsg = result?.ResponseMessage || result?.message || 'Failed to load signatories';
                showError(errorMsg);
                renderGrid([]);
                return;
            }

            // Extract data - handle various response structures
            let rows = [];
            const data = result?.Details || result?.Data || result?.data || result;

            if (Array.isArray(data)) {
                rows = data;
            } else if (data?.Details02 && Array.isArray(data.Details02)) {
                rows = data.Details02;
            } else if (data?.Details01 && Array.isArray(data.Details01)) {
                rows = data.Details01;
            } else if (data?.Details && Array.isArray(data.Details)) {
                rows = data.Details;
            }

            // Clear pending changes
            state.pendingChanges = [];
            state.signatories = rows;

            renderGrid(rows);

            if (rows.length > 0) {
                showSuccess(`Loaded ${rows.length} signator${rows.length !== 1 ? 'ies' : 'y'}.`);
            }

            // Populate BTS section
            populateBtsFields(data);

        } catch (error) {
            console.error('[AccountSignatories] Error loading:', error);
            showError('Failed to load signatories: ' + error.message);
            renderGrid([]);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Save all changes to database
     */
    async function saveAllChanges() {
        console.log('[AccountSignatories] Saving all changes...');

        if (state.pendingChanges.length === 0) {
            showInfo('No changes to save.');
            return;
        }

        showLoading(true);

        try {
            // Build XML payload for signatories
            const signatoriesXml = buildSignatoriesXml();

            const searchKey = `[${state.branchId}:${state.accountId}]`;

            const payload = {
                SearchKey: searchKey,
                SearchID: searchKey,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId,
                ModuleID: state.moduleId,
                SignatoriesXml: signatoriesXml
            };

            console.log('[AccountSignatories] Save payload:', payload);

            const csrfToken = document.querySelector('input[name="__RequestVerificationToken"]')?.value;

            const response = await fetch('/AccountsMaintenance/api/add-edit-account-signatories', {
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
            console.log('[AccountSignatories] Save response:', result);

            const isSuccess = result?.ResponseCode === '00' ||
                result?.ResponseCode === 0 ||
                result?.success === true ||
                result?.Success === true;

            if (!isSuccess) {
                const errorMsg = result?.ResponseMessage || result?.message || 'Failed to save signatories';
                showError(errorMsg);
                return;
            }

            // Clear pending changes and reload
            state.pendingChanges = [];
            showSuccess('Signatories saved successfully.');

            // Reload from database
            await loadSignatories();

            // Reset to VIEW mode
            clearForm();
            state.selectedRow = null;
            setMode('VIEW');

        } catch (error) {
            console.error('[AccountSignatories] Error saving:', error);
            showError('Failed to save signatories: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Build XML payload for signatories
     */
    function buildSignatoriesXml() {
        let xml = '';

        state.signatories.forEach((sig, index) => {
            // Determine button mark
            let buttonMark = '';
            if (sig._isNew) {
                buttonMark = 'A';  // Add
            } else if (sig._isDeleted) {
                buttonMark = 'R';  // Remove
            } else if (sig._isModified) {
                buttonMark = 'U';  // Update
            } else {
                return;  // Skip unchanged rows
            }

            const referenceID = sig.ReferenceID || sig.SequenceNo || (index + 1).toString();

            xml += '<dt_AccountOperatedBy>';
            xml += `<ReferenceID>${escapeXml(referenceID)}</ReferenceID>`;
            xml += `<SignatoryTypeID>${escapeXml(sig.SignatoryTypeID || '')}</SignatoryTypeID>`;
            xml += `<SignatoryID>${escapeXml(sig.SignatoryID || '')}</SignatoryID>`;
            xml += `<SignatoryName>${escapeXml(sig.SignatoryName || sig.SignatoryID || '')}</SignatoryName>`;
            xml += `<ButtonMark>${buttonMark}</ButtonMark>`;

            if (buttonMark !== 'R') {
                // Note: SP expects "IsMendetory" (typo in DB schema)
                xml += `<IsMendetory>${sig.IsMandatory ? 'true' : 'false'}</IsMendetory>`;
            }

            xml += '</dt_AccountOperatedBy>';
        });

        return xml;
    }

    /**
     * Escape XML special characters
     */
    function escapeXml(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Render signatories grid
     */
    function renderGrid(data) {
        const tableBody = document.getElementById('signatoryTableBody');
        if (!tableBody) return;

        state.signatories = data || [];

        // Filter out deleted records for display
        const visibleRecords = state.signatories.filter(row => !row._isDeleted);

        if (visibleRecords.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4 text-muted">
                        <i class="bi bi-inbox fs-3 d-block mb-2"></i>
                        <span>No signatories found</span>
                    </td>
                </tr>
            `;
            updateStatus(`Ready - No records`);
            return;
        }

        tableBody.innerHTML = visibleRecords.map((row, visibleIdx) => {
            // Find original index in state.signatories array
            const originalIdx = state.signatories.indexOf(row);

            // Get display values
            const signatoryId = row.SignatoryID || row.signatoryID || '-';
            const signatoryName = row.SignatoryName || row.signatoryName || '-';
            const sigType = row.SignatoryType || row.SignatoryTypeID || '-';
            const limit = row.Limit || row.GroupID || '-';
            const seqNo = row.ReferenceID || row.SequenceNo || '-';
            const isMandatory = row.IsMandatory === true || row.IsMandatory === 'true' || row.IsMandatory === 1;

            // Row status
            const isNewRow = row._isNew === true;
            const isModifiedRow = row._isModified === true;
            const rowClass = isNewRow ? 'table-info' : isModifiedRow ? 'table-warning' : '';
            const statusBadge = isNewRow ? '<span class="badge bg-success">NEW</span>' :
                isModifiedRow ? '<span class="badge bg-warning">MOD</span>' : '';

            return `
                <tr class="${rowClass}" data-index="${originalIdx}" tabindex="0">
                    <td>${escapeHtml(signatoryId)} ${statusBadge}</td>
                    <td>${escapeHtml(signatoryName)}</td>
                    <td>${escapeHtml(sigType)}</td>
                    <td>${escapeHtml(limit)}</td>
                    <td>${escapeHtml(seqNo)}</td>
                    <td>
                        ${isMandatory ?
                            '<i class="bi bi-check-circle-fill text-success" title="Yes"></i>' :
                            '<i class="bi bi-dash-circle text-muted" title="No"></i>'}
                    </td>
                </tr>
            `;
        }).join('');

        updateStatus(`Ready - ${visibleRecords.length} record${visibleRecords.length !== 1 ? 's' : ''}`);
    }

    /**
     * Escape HTML special characters
     */
    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    /**
     * Populate BTS (Behind The Scene) fields
     */
    function populateBtsFields(data) {
        // Try to get from parent state
        if (window.parent?.AccountMaintenanceState) {
            const parentState = window.parent.AccountMaintenanceState;
            const operatingMode = document.getElementById('operatingMode');
            const operatingInstruction = document.getElementById('operatingInstruction');

            if (operatingMode) {
                operatingMode.textContent = parentState.OperatingModeDescription || parentState.OperatingModeID || '-';
            }
            if (operatingInstruction) {
                operatingInstruction.textContent = parentState.OperatingInstructions || '-';
            }
        }

        // Populate audit fields if available
        if (data) {
            const setField = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value || '-';
            };

            setField('createdBy', data.CreatedBy || data.OpenedBy);
            setField('createdOn', data.CreatedOn || data.OpenedDate);
            setField('modifiedBy', data.ModifiedBy || data.UpdatedBy);
            setField('modifiedOn', data.ModifiedOn || data.UpdatedOn);
            setField('supervisedBy', data.SupervisedBy);
            setField('supervisedOn', data.SupervisedOn);
        }
    }

    /**
     * Open search modal
     */
    function openSearch(targetId) {
        console.log('[AccountSignatories] Opening search for:', targetId);
        // TODO: Implement search modal integration
        showInfo('Search functionality coming soon.');
    }

    /**
     * Open image capture / display signatory images
     */
    function openImageCapture(captureType) {
        if (state.selectedRow === null) {
            showWarning('Please select a signatory first.');
            return;
        }

        const signatory = state.signatories[state.selectedRow];
        console.log('[AccountSignatories] Loading images:', captureType, 'for:', signatory?.SignatoryID);
        
        const signatoryId = signatory?.SignatoryID || signatory?.signatoryID;
        const signatoryName = signatory?.SignatoryName || signatory?.signatoryName || signatoryId;
        
        if (captureType === 'signature' || captureType === 'both') {
            displaySignatoryImage('signature', signatoryId, signatoryName);
        }
        
        if (captureType === 'photo' || captureType === 'both') {
            displaySignatoryImage('photo', signatoryId, signatoryName);
        }
    }

    /**
     * Display signatory image (signature or photo) in the UI
     */
    function displaySignatoryImage(imageType, signatoryId, signatoryName) {
        const containerId = imageType === 'signature' ? 'signatureImage' : 'photoImage';
        const container = document.getElementById(containerId);
        
        if (!container) {
            console.warn(`[AccountSignatories] Container #${containerId} not found`);
            return;
        }

        // Get signatory data to check for embedded image data
        const signatory = state.selectedRow !== null ? state.signatories[state.selectedRow] : null;
        const dataFieldName = imageType === 'signature' ? 'SignatureData' : 'PhotoData';
        const base64Field = imageType === 'signature' ? 'sImage' : 'pImage';
        
        // Check if signatory has embedded base64 data
        const embeddedData = signatory?.[dataFieldName] || signatory?.[base64Field] || 
                           signatory?.SignatureImage || signatory?.PhotoImage;
        
        if (embeddedData) {
            // Render embedded base64 image
            displayBase64Image(container, embeddedData, imageType, signatoryName);
            return;
        }

        // No embedded data - show placeholder since image API isn't implemented yet
        const iconClass = imageType === 'signature' ? 'bi-pen' : 'bi-person-bounding-box';
        container.innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="bi ${iconClass} fs-1 d-block mb-2"></i>
                <span>${imageType === 'signature' ? 'Signature' : 'Photo'} for ${signatoryName}</span>
                <small class="d-block mt-1 text-secondary">Select from signatories list</small>
            </div>
        `;
        
        console.log(`[AccountSignatories] ${imageType} selected for ${signatoryName} (SignatoryID: ${signatoryId})`);
    }

    /**
     * Display base64 encoded image
     */
    function displayBase64Image(container, base64Data, imageType, signatoryName) {
        let cleanBase64 = base64Data;
        let mimeType = 'image/png';
        
        // Remove data URI prefix if present
        if (base64Data.indexOf('data:') === 0) {
            // Already has data URI
            mimeType = base64Data.split(';')[0].split(':')[1] || 'image/png';
            cleanBase64 = base64Data.split(',')[1] || base64Data;
        } else {
            // Detect image type from base64 header
            if (cleanBase64.charAt(0) === '/') {
                mimeType = 'image/jpeg';
            } else if (cleanBase64.charAt(0) === 'i') {
                mimeType = 'image/png';
            } else if (cleanBase64.charAt(0) === 'R') {
                mimeType = 'image/gif';
            }
        }

        const imgSrc = `data:${mimeType};base64,${cleanBase64}`;
        const altText = `${imageType === 'signature' ? 'Signature' : 'Photo'} of ${signatoryName}`;
        
        container.innerHTML = `
            <img src="${imgSrc}" alt="${altText}" class="img-fluid" 
                 style="max-height: 200px; object-fit: contain;">
        `;
        
        showInfo(`${imageType.charAt(0).toUpperCase() + imageType.slice(1)} displayed for ${signatoryName}`);
    }

    /**
     * Zoom image in modal
     */
    function zoomImage(imageType) {
        const containerId = imageType === 'signature' ? 'signatureImage' : 'photoImage';
        const container = document.getElementById(containerId);
        const img = container?.querySelector('img');
        
        if (!img) {
            showWarning(`No ${imageType} loaded to zoom.`);
            return;
        }

        // Create zoom modal
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'imageZoomModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${imageType === 'signature' ? 'Signature' : 'Photo'}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <img src="${img.src}" class="img-fluid" alt="${img.alt}">
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        const bsModal = new bootstrap.Modal(modal);
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
        bsModal.show();
    }

    /**
     * Download image
     */
    function downloadImage(imageType) {
        const containerId = imageType === 'signature' ? 'signatureImage' : 'photoImage';
        const container = document.getElementById(containerId);
        const img = container?.querySelector('img');
        
        if (!img || !img.src) {
            showWarning(`No ${imageType} loaded to download.`);
            return;
        }

        const link = document.createElement('a');
        link.href = img.src;
        link.download = `${imageType}_${state.signatories[state.selectedRow]?.SignatoryID || 'unknown'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Close submodule
     */
    function closeSubmodule() {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                action: 'submoduleClosed',
                source: 'Account Signatories'
            }, '*');
        }
    }

    // UI Helper functions
    function showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.hidden = !show;
        updateStatus(show ? 'Loading...' : 'Ready');
    }

    function updateStatus(text) {
        const statusBar = document.querySelector('.de-status-bar');
        if (statusBar) statusBar.textContent = text;
    }

    function showMessage(message, type) {
        const messageBar = document.querySelector('.de-message-bar');
        const icon = messageBar?.querySelector('i');
        const span = messageBar?.querySelector('span');

        if (messageBar && span) {
            span.textContent = message;

            messageBar.classList.remove('success', 'error', 'warning', 'info');
            messageBar.classList.add(type);

            if (icon) {
                const iconMap = {
                    success: 'bi-check-circle',
                    error: 'bi-exclamation-circle',
                    warning: 'bi-exclamation-triangle',
                    info: 'bi-info-circle'
                };
                icon.className = `bi ${iconMap[type] || 'bi-info-circle'}`;
            }

            // Auto-hide after 5 seconds
            setTimeout(() => {
                span.textContent = '';
                messageBar.classList.remove(type);
            }, 5000);
        }
    }

    function showSuccess(message) { showMessage(message, 'success'); }
    function showError(message) { showMessage(message, 'error'); }
    function showWarning(message) { showMessage(message, 'warning'); }
    function showInfo(message) { showMessage(message, 'info'); }

    // Public API
    return {
        init,
        setMode,
        loadSignatories,
        saveAllChanges
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.AccountSignatoriesModule.init();
    });
} else {
    window.AccountSignatoriesModule.init();
}
