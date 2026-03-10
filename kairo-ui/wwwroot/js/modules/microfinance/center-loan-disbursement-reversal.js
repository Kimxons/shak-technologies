/**
 * Center Loan / Disbursement Reversal Module
 * MVC conversion of legacy center-loan-disbursement-reversal module
 */
(function () {
    'use strict';

    // Legacy lookups typically use module 5060; posting uses 5092.
    const DEFAULT_SEARCH_MODULE_ID = '5060';

    const state = {
        moduleId: null,
        branchId: null,
        operatorId: null,
        currentMode: 'VIEW', // VIEW, VIEW_LOADED, EDIT
        currentData: null,
        accounts: [],
        activeRowIndex: null
    };

    function getAppCore() {
        const win = window;
        return win.AppCore || (win.parent && win.parent !== win && win.parent.AppCore) || (win.top && win.top !== win && win.top.AppCore) || null;
    }

    function init() {
        loadContext();
        wireSectionToggles();
        wireOnTopFeedback();
        wireLookups();
        wireFieldValidation();
        wireActionButtons();

        applyInitialUiState();
        // Prefill branch id if we have it
        if (state.branchId) {
            const branchIdEl = document.getElementById('txt_branchId');
            if (branchIdEl && !branchIdEl.value) branchIdEl.value = state.branchId;
        }
    }

    function loadContext() {
        state.moduleId = document.getElementById('moduleId_centerLoanDisbursementReversal')?.value || '5092';
        state.branchId = sessionStorage.getItem('branch_code') || sessionStorage.getItem('OurBranchID') || '';
        state.operatorId = sessionStorage.getItem('user_name') || sessionStorage.getItem('OperatorID') || 'CSADM';
    }

    // ─────────────────────────────────────────────────────────────
    // Feedback (Account Maintenance / Exit Types style)
    // ─────────────────────────────────────────────────────────────

    function wireOnTopFeedback() {
        document.getElementById('cldrValidationClose')?.addEventListener('click', hideOnTopMessage);
        hideOnTopMessage();
    }

    function showOnTopMessage(type, message) {
        const summary = document.getElementById('cldrValidationSummary');
        const iconEl = document.getElementById('cldrValidationIcon');
        const textEl = document.getElementById('cldrValidationText');
        if (!summary || !iconEl || !textEl) return;

        const normalizedType = String(type || 'info').toLowerCase();
        const isSuccess = normalizedType === 'success';

        summary.classList.toggle('validation-summary--success', isSuccess);
        summary.classList.add('is-visible');
        summary.style.display = '';
        textEl.textContent = message || '';

        const iconClassByType = {
            success: 'bi bi-check-circle validation-summary__icon',
            error: 'bi bi-exclamation-circle validation-summary__icon',
            warning: 'bi bi-exclamation-triangle validation-summary__icon',
            info: 'bi bi-info-circle validation-summary__icon'
        };
        iconEl.className = iconClassByType[normalizedType] || iconClassByType.error;

        summary.setAttribute('role', isSuccess ? 'status' : 'alert');
        summary.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        const appCore = getAppCore();
        appCore?.showToastMessage?.(message, normalizedType === 'error' ? 'error' : normalizedType);
    }

    function hideOnTopMessage() {
        const summary = document.getElementById('cldrValidationSummary');
        const iconEl = document.getElementById('cldrValidationIcon');
        const textEl = document.getElementById('cldrValidationText');
        if (!summary || !iconEl || !textEl) return;

        textEl.textContent = '';
        summary.classList.remove('is-visible');
        summary.classList.remove('validation-summary--success');
        summary.style.display = 'none';
        iconEl.className = 'bi bi-exclamation-circle validation-summary__icon';
    }

    const showSuccess = (m) => showOnTopMessage('success', m);
    const showError = (m) => showOnTopMessage('error', m);
    const showWarning = (m) => showOnTopMessage('warning', m);
    const showInfo = (m) => showOnTopMessage('info', m);

    // ─────────────────────────────────────────────────────────────
    // Section toggles
    // ─────────────────────────────────────────────────────────────

    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', (e) => {
                e.preventDefault();
                const section = header.closest('.form-section');
                const content = section?.querySelector('[data-section-content]');
                const btn = header.querySelector('.section-toggle-btn');
                const icon = btn?.querySelector('i');
                if (!content || !btn || !icon) return;

                const isExpanded = btn.getAttribute('aria-expanded') === 'true';
                btn.setAttribute('aria-expanded', String(!isExpanded));
                content.hidden = isExpanded;
                icon.className = isExpanded ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
            });
        });
    }

    // ─────────────────────────────────────────────────────────────
    // SearchModal lookups (centralized config)
    // ─────────────────────────────────────────────────────────────

    let searchModal = null;

    const LOOKUP_CONFIG = {
        branch: {
            title: 'Branch Search',
            tableID: 'BranchID',
            getAdvFilterString: () => '',
            onSelect: (row) => {
                const branchId = pickRowValue(row, ['OurBranchID', 'BranchID']);
                const branchName = pickRowValue(row, ['BranchName']);
                if (!branchId) {
                    showWarning('Invalid branch selection');
                    return;
                }

                setFieldValue('txt_branchId', branchId);
                setFieldValue('txt_branchName', branchName);

                clearCenterGroupScheme({ preserveBranch: true });
                showSuccess(`Branch '${branchName || branchId}' selected`);
            }
        },
        center: {
            title: 'Center Search',
            tableID: 'GroupID',
            getAdvFilterString: () => {
                const branchId = String(getFieldValue('txt_branchId') || state.branchId || '').trim();
                const safeBranch = escapeSqlString(branchId);
                return safeBranch ? `OurBranchID='${safeBranch}' AND GroupStatusID='A'` : `GroupStatusID='A'`;
            },
            onSelect: (row) => {
                const centerId = pickRowValue(row, ['GroupID']);
                const centerName = pickRowValue(row, ['GroupName']);
                if (!centerId) {
                    showWarning('Invalid center selection');
                    return;
                }

                setFieldValue('txt_centerId', centerId);
                setFieldValue('txt_centerName', centerName);

                clearGroupScheme();
                showSuccess(`Center '${centerName || centerId}' selected`);
            }
        },
        group: {
            title: 'Search Groups',
            tableID: 'SubGroupID',
            getAdvFilterString: () => {
                const branchId = String(getFieldValue('txt_branchId') || state.branchId || '').trim();
                const centerId = String(getFieldValue('txt_centerId') || '').trim();
                if (!centerId) return '';

                const safeBranch = escapeSqlString(branchId || '');
                const safeCenter = escapeSqlString(centerId);
                // Match legacy: OurBranchID + GroupID (center)
                const parts = [];
                if (safeBranch) parts.push(`OurBranchID='${safeBranch}'`);
                parts.push(`GroupID='${safeCenter}'`);
                return parts.join(' AND ');
            },
            onSelect: (row) => {
                const groupId = pickRowValue(row, ['SubGroupID']);
                const groupName = pickRowValue(row, ['SubGroupName']);
                if (!groupId) {
                    showWarning('Invalid group selection');
                    return;
                }

                setFieldValue('txt_groupId', groupId);
                setFieldValue('txt_groupName', groupName);

                showSuccess(`Group '${groupName || groupId}' selected`);
            }
        },
        scheme: {
            title: 'Loan Scheme Search',
            tableID: 'GroupLoanSchemeID',
            getAdvFilterString: () => {
                const branchId = String(getFieldValue('txt_branchId') || state.branchId || '').trim();
                const centerId = String(getFieldValue('txt_centerId') || '').trim();
                if (!centerId) return '';

                const safeBranch = escapeSqlString(branchId);
                const safeCenter = escapeSqlString(centerId);
                // Match legacy: GroupID=center and OurBranchID=branch
                const parts = [`GroupID = '${safeCenter}'`];
                if (safeBranch) parts.push(`OurBranchID = '${safeBranch}'`);
                return parts.join(' AND ');
            },
            onSelect: (row) => {
                const schemeId = pickRowValue(row, ['LoanSchemeID', 'GroupLoanSchemeID']);
                const schemeName = pickRowValue(row, ['Description', 'GroupLoanSchemeName']);
                if (!schemeId) {
                    showWarning('Invalid scheme selection');
                    return;
                }

                setFieldValue('txt_schemeId', schemeId);
                setFieldValue('txt_schemeName', schemeName);

                showSuccess(`Scheme '${schemeName || schemeId}' selected`);
            }
        }
    };

    function wireLookups() {
        document.querySelectorAll('.btn-lookup[data-lookup]').forEach(btn => {
            btn.addEventListener('click', () => openLookup(btn.getAttribute('data-lookup')));
        });
    }

    function ensureSearchModal() {
        const appCore = getAppCore();
        if (!appCore) {
            showError('AppCore not available for search');
            return null;
        }
        if (typeof window.SearchModal !== 'function') {
            showError('SearchModal script not loaded');
            return null;
        }

        // Create a fresh instance to avoid stale state
        return new window.SearchModal(appCore);
    }

    function openLookup(key) {
        const cfg = LOOKUP_CONFIG[key];
        if (!cfg) return;

        if (key !== 'branch') {
            const branchId = String(getFieldValue('txt_branchId') || state.branchId || '').trim();
            if (!branchId) {
                showWarning('Please select a Branch first');
                document.getElementById('txt_branchId')?.focus();
                return;
            }
        }

        if (key === 'group' || key === 'scheme') {
            const centerId = String(getFieldValue('txt_centerId') || '').trim();
            if (!centerId) {
                showWarning('Please select a Center first');
                document.getElementById('txt_centerId')?.focus();
                return;
            }
        }

        searchModal = ensureSearchModal();
        if (!searchModal) return;

        const advFilterString = cfg.getAdvFilterString ? cfg.getAdvFilterString() : '';

        searchModal.open({
            tableID: cfg.tableID,
            moduleID: DEFAULT_SEARCH_MODULE_ID,
            whereStmt: '',
            advFilterString,
            searchKey: '',
            ourbranchId: String(getFieldValue('txt_branchId') || state.branchId || '').trim() || null,
            onSelect: (row) => cfg.onSelect?.(row)
        }).catch(err => {
            console.error('[CLDR] Open lookup failed:', err);
            showError('Failed to open search');
        });
    }

    function pickRowValue(row, keys) {
        if (!row || typeof row !== 'object') return '';
        const rowKeys = Object.keys(row);
        for (const key of keys) {
            const actual = rowKeys.find(rk => rk.toLowerCase() === String(key).toLowerCase());
            if (actual) {
                const val = row[actual];
                if (val !== undefined && val !== null && String(val).trim() !== '') return String(val).trim();
            }
        }
        return '';
    }

    function escapeSqlString(value) {
        return String(value ?? '').replace(/'/g, "''");
    }

    // ─────────────────────────────────────────────────────────────
    // Field validation via p_GetIDDescription
    // ─────────────────────────────────────────────────────────────

    function wireFieldValidation() {
        setupValidateOnBlurEnter('txt_branchId', () => validateIdDescription('BranchID', getFieldValue('txt_branchId'), 'txt_branchId', 'txt_branchName', '', true));
        setupValidateOnBlurEnter('txt_centerId', () => {
            const branchId = String(getFieldValue('txt_branchId') || state.branchId || '').trim();
            const adv = branchId ? `OurBranchID='${escapeSqlString(branchId)}'` : '';
            return validateIdDescription('GroupID', getFieldValue('txt_centerId'), 'txt_centerId', 'txt_centerName', adv, true);
        });
        setupValidateOnBlurEnter('txt_groupId', () => {
            const centerId = String(getFieldValue('txt_centerId') || '').trim();
            const adv = centerId ? `GroupID='${escapeSqlString(centerId)}'` : '';
            return validateIdDescription('SubGroupID', getFieldValue('txt_groupId'), 'txt_groupId', 'txt_groupName', adv, false);
        });
        setupValidateOnBlurEnter('txt_schemeId', () => validateIdDescription('GroupLoanSchemeID', getFieldValue('txt_schemeId'), 'txt_schemeId', 'txt_schemeName', '', false));
    }

    function setupValidateOnBlurEnter(fieldId, handler) {
        const el = document.getElementById(fieldId);
        if (!el) return;

        el.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handler();
            }
        });
        el.addEventListener('blur', () => {
            const v = String(el.value || '').trim();
            if (v) handler();
        });
    }

    async function validateIdDescription(controlTypeId, idValueRaw, idFieldId, nameFieldId, advanceFilter, clearDependents) {
        const appCore = getAppCore();
        if (!appCore) return;

        const idValue = String(idValueRaw || '').trim();
        if (!idValue) {
            setFieldValue(nameFieldId, '');
            return;
        }

        try {
            const response = await appCore.invokeControllerAsync('GroupLoanReversal/validate', {
                OurBranchID: String(getFieldValue('txt_branchId') || state.branchId || '').trim(),
                ControlTypeID: controlTypeId,
                ID: idValue,
                BankID: '00',
                TypeID: '',
                AdvanceFilter: advanceFilter || '',
                LanguageID: 'en'
            });

            const details = extractDetailsArray(response);
            if (details.length) {
                const name = details[0]?.Name || details[0]?.Description || details[0]?.GroupName || details[0]?.SubGroupName || details[0]?.BranchName || '';
                if (name) {
                    setFieldValue(nameFieldId, name);
                    if (clearDependents) {
                        if (idFieldId === 'txt_branchId') {
                            clearCenterGroupScheme({ preserveBranch: true });
                        }
                        if (idFieldId === 'txt_centerId') {
                            clearGroupScheme();
                        }
                    }
                    return;
                }
            }

            // Invalid
            setFieldValue(idFieldId, '');
            setFieldValue(nameFieldId, '');
            showError(`Invalid ${controlTypeId} ID`);
        } catch (err) {
            setFieldValue(idFieldId, '');
            setFieldValue(nameFieldId, '');
            showError('Validation failed: ' + (err?.message || 'Unknown error'));
        }
    }

    function extractDetailsArray(response) {
        if (!response || typeof response !== 'object') return [];
        if (Array.isArray(response.Details)) return response.Details;
        if (Array.isArray(response.Details01)) return response.Details01;
        if (Array.isArray(response.Details02)) return response.Details02;
        return [];
    }

    // ─────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────

    function wireActionButtons() {
        document.querySelector('[data-action="view"]')?.addEventListener('click', handleView);
        document.querySelector('[data-action="edit"]')?.addEventListener('click', handleEdit);
        document.querySelector('[data-action="save"]')?.addEventListener('click', handleSave);
        document.querySelector('[data-action="cancel"]')?.addEventListener('click', handleCancel);

        document.getElementById('cldrSelectAll')?.addEventListener('change', handleSelectAll);
        document.getElementById('cldrLoanAccountsTable')?.addEventListener('change', (e) => {
            const target = e.target;
            if (!(target instanceof HTMLInputElement)) return;
            if (target.type === 'checkbox' && target.dataset.rowIndex) {
                if (state.currentMode === 'EDIT' && target.checked) {
                    // Uncheck all other checkboxes
                    document.querySelectorAll('#cldrLoanAccountsTable input[type="checkbox"][data-row-index]').forEach(cb => {
                        if (cb !== target) cb.checked = false;
                    });
                }
                handleRowSelect(target);
            }
        });

        // Row click (in Edit mode) selects row + updates BTS details
        document.getElementById('cldrLoanAccountsTable')?.addEventListener('click', (e) => {
            const target = e.target;
            if (!(target instanceof Element)) return;

            // Ignore direct clicks on checkbox itself (handled by change)
            if (target.closest('input[type="checkbox"]')) return;

            const tr = target.closest('tr');
            const tbody = tr?.parentElement;
            if (!tr || !tbody || tbody.tagName.toLowerCase() !== 'tbody') return;

            if (state.currentMode !== 'EDIT') return;

            const cb = tr.querySelector('input[type="checkbox"][data-row-index]');
            if (!(cb instanceof HTMLInputElement)) return;

            // If disabled (e.g., reversal not allowed), do nothing
            if (cb.disabled) {
                // Still allow the user to see details by clicking the row
                const idx = Number(cb.dataset.rowIndex);
                setActiveRow(idx);
                return;
            }

            cb.checked = !cb.checked;
            // Manually trigger handler logic
            handleRowSelect(cb);
        });
    }

    async function handleView() {
        const appCore = getAppCore();
        if (!appCore) return;

        const branchId = String(getFieldValue('txt_branchId') || '').trim();
        const centerId = String(getFieldValue('txt_centerId') || '').trim();
        const groupId = String(getFieldValue('txt_groupId') || '').trim();
        const schemeId = String(getFieldValue('txt_schemeId') || '').trim();

        if (!branchId || !centerId || !groupId || !schemeId) {
            showError('Branch ID, Center ID, Group ID and Scheme ID are required');
            return;
        }

        try {
            showInfo('Loading loan reversals...');

            const response = await appCore.invokeControllerAsync('GroupLoanReversal/get', {
                OurBranchID: branchId,
                GroupID: centerId,
                LoanSchemeID: schemeId,
                OperatorID: state.operatorId
            });

            const status = response?.Status;
            if (status !== undefined && status !== null && String(status) !== '' && String(status) !== '00' && String(status) !== '0') {
                showError(response?.Message || 'Request failed');
                return;
            }

            const details = Array.isArray(response?.Details) ? response.Details : [];
            const details01 = Array.isArray(response?.Details01) ? response.Details01 : [];

            // If no detail rows are returned, do not populate behind-the-scene fields.
            // Also clear any previous BTS values so they don't linger.
            if (!details || details.length === 0) {
                bindGrid([]);
                setFieldValue('txt_productId', '');
                setFieldValue('txt_currencyId', '');
                setFieldValue('txt_reversalType', '');
                setFieldValue('txt_disbursementType', '');

                // No rows to work with: keep lookups enabled and prevent Edit/Save.
                state.currentData = null;
                setMode('VIEW');
                // Requirement: when no details found, disable View and enable Cancel.
                setActionButtonsState({ canView: false, canEdit: false, canSave: false, canCancel: true });
                showError('No details Found');
                return;
            }

            bindGrid(details);
            bindBehindTheScene(details01, details);

            state.currentData = { branchId, centerId, groupId, schemeId, details, details01 };
            setMode('VIEW_LOADED');

            showSuccess('Loaded loan reversals successfully');
        } catch (err) {
            console.error('[CLDR] View failed:', err);
            showError('View failed: ' + (err?.message || 'Unknown error'));
        }
    }

    function handleEdit() {
        if (!state.currentData) {
            showError('Click View first');
            return;
        }
        if (state.currentMode === 'EDIT') return;

        setMode('EDIT');
        showInfo('Edit mode enabled');
    }

    async function handleSave() {
        const appCore = getAppCore();
        if (!appCore) return;

        if (state.currentMode !== 'EDIT') {
            showError('Click Edit first');
            return;
        }

        const reasonId = String(getFieldValue('ddl_loanReversalReason') || '').trim();
        if (!reasonId) {
            showError('Select cancellation reason');
            document.getElementById('ddl_loanReversalReason')?.focus();
            return;
        }

        const selectedRawRows = getSelectedRawRows();
        if (selectedRawRows.length === 0) {
            showError('Select loan account(s) to reverse');
            return;
        }

        const missing = selectedRawRows.find(r =>
            (r.ApplicationID ?? r.applicationId) == null ||
            (r.LoanSeries ?? r.loanSeries) == null ||
            (r.ReversalTypeID ?? r.reversalTypeId) == null ||
            (r.DisbursedDate ?? r.TrxDate ?? r.disbursedDate) == null ||
            (r.LoanAccountID ?? r.loanAcctId ?? r.LoanAcctId) == null
        );
        if (missing) {
            showError('Selected record missing required reversal fields');
            return;
        }

        const xmlData = buildLoanRevAppListXml(selectedRawRows);

        const branchId = String(getFieldValue('txt_branchId') || '').trim();
        const centerId = String(getFieldValue('txt_centerId') || '').trim();
        const schemeId = String(getFieldValue('txt_schemeId') || '').trim();
        const remarks = String(getFieldValue('txt_remarks') || '').trim();

        setActionButtonsState({ canView: false, canEdit: false, canSave: false, canCancel: true });
        showInfo('Saving reversal...');

        try {
            const response = await appCore.invokeControllerAsync('GroupLoanReversal/save', {
                OurBranchID: branchId,
                GroupID: centerId,
                LoanSchemeID: schemeId,
                LoanRevAppList: xmlData,
                LoanReversalReasonID: reasonId,
                Remarks: remarks,
                OperatorID: state.operatorId,
                ModuleID: state.moduleId
            });

            const status = response?.Status;
            if (status !== undefined && status !== null && String(status) !== '' && String(status) !== '00' && String(status) !== '0') {
                showError(response?.Message || 'Error in reversal');
                setMode('EDIT');
                return;
            }

            const details = Array.isArray(response?.Details) ? response.Details : [];
            const trxBatchId = details?.[0]?.TrxBatchID;

            showSuccess(`Successful Reversal${trxBatchId ? ` (TrxBatchID: ${trxBatchId})` : ''}`);
            handleCancel({ silent: true });
        } catch (err) {
            console.error('[CLDR] Save failed:', err);
            showError('Error in reversal: ' + (err?.message || 'Unknown error'));
            setMode('EDIT');
        }
    }

    function handleCancel(opts) {
        const silent = !!opts?.silent;

        const branchId = String(getFieldValue('txt_branchId') || state.branchId || '').trim();
        const branchName = String(getFieldValue('txt_branchName') || '').trim();

        // Clear everything except branch
        clearCenterGroupScheme({ preserveBranch: true });
        setFieldValue('txt_branchId', branchId);
        setFieldValue('txt_branchName', branchName);

        // Clear BTS
        setFieldValue('txt_productId', '');
        setFieldValue('txt_currencyId', '');
        setFieldValue('txt_reversalType', '');
        setFieldValue('txt_disbursementType', '');

        // Clear reason/remarks
        setFieldValue('ddl_loanReversalReason', '');
        setFieldValue('txt_remarks', '');

        // Reset grid
        state.accounts = [];
        state.currentData = null;
        renderEmptyGrid();

        applyInitialUiState();
        document.getElementById('txt_centerId')?.focus();

        if (!silent) showInfo('Cancelled');
    }

    // ─────────────────────────────────────────────────────────────
    // UI state / mode
    // ─────────────────────────────────────────────────────────────

    function applyInitialUiState() {
        setMode('VIEW');
        hideOnTopMessage();
    }

    function setMode(mode) {
        state.currentMode = mode;

        const isView = mode === 'VIEW';
        const isLoaded = mode === 'VIEW_LOADED';
        const isEdit = mode === 'EDIT';

        // Lookups enabled only in VIEW mode
        setLookupControlsEnabled(isView);

        // Reason fields enabled only in EDIT
        const reasonEl = document.getElementById('ddl_loanReversalReason');
        const remarksEl = document.getElementById('txt_remarks');
        if (reasonEl) reasonEl.disabled = !isEdit;
        if (remarksEl) remarksEl.disabled = !isEdit;

        // Grid selection enabled only in EDIT
        setGridSelectionEnabled(isEdit);

        if (isEdit) {
            // Ensure the user can select at least one row in Edit mode.
            ensureAtLeastOneRowSelected();
        }

        if (isView) {
            setActionButtonsState({ canView: true, canEdit: false, canSave: false, canCancel: false });
        } else if (isLoaded) {
            setActionButtonsState({ canView: false, canEdit: true, canSave: false, canCancel: true });
        } else if (isEdit) {
            setActionButtonsState({ canView: false, canEdit: false, canSave: true, canCancel: true });
        }
    }

    function setActionButtonsState({ canView, canEdit, canSave, canCancel }) {
        const viewBtn = document.querySelector('[data-action="view"]');
        const editBtn = document.querySelector('[data-action="edit"]');
        const saveBtn = document.querySelector('[data-action="save"]');
        const cancelBtn = document.querySelector('[data-action="cancel"]');

        if (viewBtn) viewBtn.disabled = !canView;
        if (editBtn) editBtn.disabled = !canEdit;
        if (saveBtn) saveBtn.disabled = !canSave;
        if (cancelBtn) cancelBtn.disabled = !canCancel;
    }

    function setLookupControlsEnabled(enabled) {
        ['txt_branchId', 'txt_centerId', 'txt_groupId', 'txt_schemeId'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !enabled;
        });
        document.querySelectorAll('.btn-lookup[data-lookup]').forEach(btn => {
            btn.disabled = !enabled;
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Grid
    // ─────────────────────────────────────────────────────────────

    function bindGrid(details) {
        const rows = Array.isArray(details) ? details : [];
        state.accounts = rows.map(r => ({
            clientId: r.ClientID,
            clientName: r.ClientName,
            applicationId: r.ApplicationID,
            loanAccountId: r.LoanAccountID,
            loanAmount: r.LoanAmount,
            disbursedAmount: r.DisbursedAmount,
            disbursedBy: r.DisbursedBy,
            allowReversal: r.AllowReversal,
            raw: r
        }));

        state.activeRowIndex = null;

        const tbody = document.querySelector('#cldrLoanAccountsTable tbody');
        if (!tbody) return;

        if (state.accounts.length === 0) {
            renderEmptyGrid();
            return;
        }

        tbody.innerHTML = state.accounts.map((a, idx) => {
            const allow = isReversalAllowed(a.allowReversal);
            return `
                <tr>
                    <td>
                        <input class="form-check-input" type="checkbox" data-row-index="${idx}" ${allow ? '' : 'data-allow-reversal="0"'} disabled aria-label="Select row" />
                    </td>
                    <td>${escapeHtml(a.clientId || '')}</td>
                    <td>${escapeHtml(a.clientName || '')}</td>
                    <td>${escapeHtml(a.applicationId || '')}</td>
                    <td>${escapeHtml(a.loanAccountId || '')}</td>
                    <td class="text-end">${escapeHtml(a.loanAmount ?? '')}</td>
                    <td class="text-end">${escapeHtml(a.disbursedAmount ?? '')}</td>
                    <td>${escapeHtml(a.disbursedBy || '')}</td>
                </tr>
            `;
        }).join('');

        // Reset select all
        const selectAll = document.getElementById('cldrSelectAll');
        if (selectAll) {
            selectAll.checked = false;
            selectAll.disabled = true;
        }

        // Default BTS reversal type from first row (View mode), but allow row-click to override later
        if (state.accounts.length > 0) {
            setActiveRow(0);
        }
    }

    function renderEmptyGrid() {
        const tbody = document.querySelector('#cldrLoanAccountsTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr class="empty-row"><td colspan="8" class="text-center text-muted">No records to display</td></tr>';
        const selectAll = document.getElementById('cldrSelectAll');
        if (selectAll) {
            selectAll.checked = false;
            selectAll.disabled = true;
        }
    }

    function setGridSelectionEnabled(enabled) {
        const selectAll = document.getElementById('cldrSelectAll');
        if (selectAll) selectAll.disabled = !enabled || state.accounts.length === 0;

        document.querySelectorAll('#cldrLoanAccountsTable input[type="checkbox"][data-row-index]').forEach(cb => {
            const allow = isReversalAllowed(cb.getAttribute('data-allow-reversal') ?? state.accounts[Number(cb.dataset.rowIndex)]?.allowReversal);
            cb.disabled = !enabled || !allow;
            if (!enabled) cb.checked = false;
        });

        if (!enabled && selectAll) selectAll.checked = false;

        // When leaving Edit mode, clear selection but keep current BTS as loaded.
        if (!enabled) {
            clearActiveRowHighlight();
        }
    }

    function ensureAtLeastOneRowSelected() {
        if (state.currentMode !== 'EDIT') return;

        const anyChecked = document.querySelector('#cldrLoanAccountsTable input[type="checkbox"][data-row-index]:checked');
        if (anyChecked instanceof HTMLInputElement) {
            // Keep existing selection; just sync active row.
            setActiveRow(Number(anyChecked.dataset.rowIndex));
            return;
        }

        const firstSelectable = Array.from(document.querySelectorAll('#cldrLoanAccountsTable input[type="checkbox"][data-row-index]'))
            .find(cb => cb instanceof HTMLInputElement && !cb.disabled);

        if (firstSelectable instanceof HTMLInputElement) {
            firstSelectable.checked = true;
            handleRowSelect(firstSelectable);
        }
    }

    function handleSelectAll(e) {
        const selectAll = e?.target;
        if (!selectAll) return;
        const shouldCheck = !!selectAll.checked;

        if (state.currentMode !== 'EDIT') {
            selectAll.checked = false;
            return;
        }

        let blocked = 0;
        document.querySelectorAll('#cldrLoanAccountsTable input[type="checkbox"][data-row-index]').forEach(cb => {
            const allow = isReversalAllowed(cb.getAttribute('data-allow-reversal') ?? state.accounts[Number(cb.dataset.rowIndex)]?.allowReversal);
            if (!shouldCheck) {
                cb.checked = false;
                return;
            }
            if (allow) {
                cb.checked = true;
            } else {
                cb.checked = false;
                blocked++;
            }
        });

        // Update BTS details based on first checked row
        const firstChecked = document.querySelector('#cldrLoanAccountsTable input[type="checkbox"][data-row-index]:checked');
        if (firstChecked instanceof HTMLInputElement) {
            setActiveRow(Number(firstChecked.dataset.rowIndex));
        } else if (!shouldCheck) {
            // If cleared all, clear row-specific BTS field
            setFieldValue('txt_reversalType', '');
            clearActiveRowHighlight();
        }

        if (blocked > 0) {
            showError('Reversal Not Allowed');
        }
    }

    function handleRowSelect(cb) {
        if (state.currentMode !== 'EDIT') {
            cb.checked = false;
            return;
        }

        if (cb.checked) {
            const idx = Number(cb.dataset.rowIndex);
            const allow = isReversalAllowed(state.accounts[idx]?.allowReversal);
            if (!allow) {
                cb.checked = false;
                showError('Reversal Not Allowed');
                return;
            }

            setActiveRow(idx);
        } else {
            // If unchecking active row, fall back to another checked row (if any)
            const anyChecked = document.querySelector('#cldrLoanAccountsTable input[type="checkbox"][data-row-index]:checked');
            if (anyChecked instanceof HTMLInputElement) {
                setActiveRow(Number(anyChecked.dataset.rowIndex));
            } else {
                state.activeRowIndex = null;
                setFieldValue('txt_reversalType', '');
                clearActiveRowHighlight();
            }
        }
    }

    function setActiveRow(idx) {
        if (!Number.isFinite(idx) || idx < 0 || idx >= state.accounts.length) return;

        state.activeRowIndex = idx;
        applyActiveRowHighlight(idx);
        bindSelectedRowDetails(state.accounts[idx]?.raw || null);
    }

    function bindSelectedRowDetails(raw) {
        if (!raw || typeof raw !== 'object') return;

        // Row-specific BTS fields
        setFieldValue('txt_reversalType', raw.ReversalType || raw.ReversalTypeDesc || raw.ReversalTypeID || '');
    }

    function clearActiveRowHighlight() {
        document.querySelectorAll('#cldrLoanAccountsTable tbody tr').forEach(tr => tr.classList.remove('table-active'));
    }

    function applyActiveRowHighlight(idx) {
        clearActiveRowHighlight();
        const tr = document.querySelector(`#cldrLoanAccountsTable input[type="checkbox"][data-row-index="${idx}"]`)?.closest('tr');
        tr?.classList.add('table-active');
    }

    function getSelectedRawRows() {
        const checked = Array.from(document.querySelectorAll('#cldrLoanAccountsTable input[type="checkbox"][data-row-index]:checked'));
        return checked
            .map(cb => Number(cb.dataset.rowIndex))
            .filter(i => Number.isFinite(i) && i >= 0 && i < state.accounts.length)
            .map(i => state.accounts[i]?.raw)
            .filter(Boolean);
    }

    function isReversalAllowed(value) {
        if (value === true) return true;
        if (value === false || value == null) return false;
        if (typeof value === 'number') return value === 1;

        const s = String(value).trim().toLowerCase();
        return s === '1' || s === 'true' || s === 'tru' || s === 'y' || s === 'yes';
    }

    // ─────────────────────────────────────────────────────────────
    // Behind-the-scene binding
    // ─────────────────────────────────────────────────────────────

    function bindBehindTheScene(details01, details) {
        const bts = Array.isArray(details01) && details01.length ? details01[0] : null;
        if (bts) {
            setFieldValue('txt_productId', bts.ProductID || '');
            setFieldValue('txt_currencyId', bts.CurrencyID || '');
            setFieldValue('txt_disbursementType', bts.GrpDisbType || '');
        }

        const first = Array.isArray(details) && details.length ? details[0] : null;
        if (first) {
            setFieldValue('txt_reversalType', first.ReversalType || '');
        }
    }

    // ─────────────────────────────────────────────────────────────
    // XML building
    // ─────────────────────────────────────────────────────────────

    function escapeXml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    function buildLoanRevAppListXml(selectedRows) {
        const items = selectedRows.map(r => {
            const appId = r.ApplicationID ?? r.applicationId;
            const loanSeries = r.LoanSeries ?? r.loanSeries;
            const reversalTypeId = r.ReversalTypeID ?? r.reversalTypeId;
            const trxDate = r.DisbursedDate ?? r.TrxDate ?? r.disbursedDate;
            const loanAccountId = r.LoanAccountID ?? r.loanAcctId ?? r.LoanAcctId;

            return (
                `<dt_GroupLoanReversals>` +
                `<ApplicationID>${escapeXml(appId)}</ApplicationID>` +
                `<LoanSeries>${escapeXml(loanSeries)}</LoanSeries>` +
                `<ReversalTypeID>${escapeXml(reversalTypeId)}</ReversalTypeID>` +
                `<TrxDate>${escapeXml(trxDate)}</TrxDate>` +
                `<TrxBatchID>0</TrxBatchID>` +
                `<LoanAccountID>${escapeXml(loanAccountId)}</LoanAccountID>` +
                `</dt_GroupLoanReversals>`
            );
        }).join('');

        return `<NewDataSet>${items}</NewDataSet>`;
    }

    // ─────────────────────────────────────────────────────────────
    // Small DOM helpers
    // ─────────────────────────────────────────────────────────────

    function getFieldValue(id) {
        const el = document.getElementById(id);
        if (!el) return '';
        return 'value' in el ? el.value : '';
    }

    function setFieldValue(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        if ('value' in el) el.value = value;
    }

    function clearCenterGroupScheme({ preserveBranch } = {}) {
        if (!preserveBranch) {
            setFieldValue('txt_branchId', '');
            setFieldValue('txt_branchName', '');
        }
        setFieldValue('txt_centerId', '');
        setFieldValue('txt_centerName', '');
        setFieldValue('txt_groupId', '');
        setFieldValue('txt_groupName', '');
        setFieldValue('txt_schemeId', '');
        setFieldValue('txt_schemeName', '');
    }

    function clearGroupScheme() {
        setFieldValue('txt_groupId', '');
        setFieldValue('txt_groupName', '');
        setFieldValue('txt_schemeId', '');
        setFieldValue('txt_schemeName', '');
    }

    function clearSchemeOnly() {
        setFieldValue('txt_schemeId', '');
        setFieldValue('txt_schemeName', '');
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
