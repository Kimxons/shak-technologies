/**
 * Center Penalty Interest Waive Off Module
 * Handles branch, center, scheme lookups with penalty waive-off CRUD operations
 * Migrated from legacy HTML/JS to KAIRO MVC pattern
 */

(function () {
    'use strict';

    const CONTROLLER_BASE = 'MicroFinance/CenterPenaltyInterestWaiveOff';
    const DEFAULT_SEARCH_MODULE_ID = String(window.Environment?.defaultSearchModuleId || window.Environment?.microfinanceModuleId || '4560');

    function getAppCore() {
        const win = window;
        return win.AppCore || (win.parent && win.parent !== win && win.parent.AppCore) || (win.top && win.top !== win && win.top.AppCore) || null;
    }

    // =========================================================================
    // Service Invoker - ALL API calls use POST via AppCore.invokeControllerAsync
    // =========================================================================
    async function invokeController(action, requestData) {
        const appCore = getAppCore();
        if (!appCore || typeof appCore.invokeControllerAsync !== 'function') {
            throw new Error('AppCore is not available (AppCore.invokeControllerAsync not found)');
        }

        const endpoint = `${CONTROLLER_BASE}/${action}`;
        return appCore.invokeControllerAsync(endpoint, requestData || {});
    }

    // =========================================================================
    // State Management
    // =========================================================================
    let editMode = false;
    let penaltyAccountsData = [];
    let penaltySummaryData = null;

    const parentContext = {
        branchId: '',
        centerId: '',
        schemeId: ''
    };

    // =========================================================================
    // Environment Helper
    // =========================================================================
    function getEnv() {
        const e = window.Environment || {};
        const bankID = e.defaultBankId || e.defaultBankID || e.bankID || e.bankId ||
            sessionStorage.getItem('BankID') || localStorage.getItem('BankID') || '00';
        const ourBranchID = e.branchID || e.branchId || e.OurBranchID || e.defaultOurBranchId ||
            sessionStorage.getItem('BranchID') || sessionStorage.getItem('OurBranchID') || localStorage.getItem('BranchID') || '0101';
        const operatorID = e.operatorID || e.operatorId ||
            sessionStorage.getItem('OperatorID') || sessionStorage.getItem('operatorId') || localStorage.getItem('OperatorID') || 'CSADM';
        return { bankID, ourBranchID, operatorID };
    }

    // =========================================================================
    // DOM Helpers
    // =========================================================================
    function $(id) { return document.getElementById(id); }

    function safeNumber(value) {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }

    function coerceString(v) {
        return (v === undefined || v === null) ? '' : String(v);
    }

    // =========================================================================
    // Toast Notifications
    // =========================================================================
    function ensureToastContainer() {
        let el = document.querySelector('[data-kairo-toast-container]');
        if (!el) el = $('toastContainer');
        if (el) return el;

        el = document.createElement('div');
        el.className = 'kairo-toast-container';
        el.setAttribute('data-kairo-toast-container', '');
        el.setAttribute('aria-live', 'polite');
        el.setAttribute('aria-relevant', 'additions');
        document.body.appendChild(el);
        return el;
    }

    function showToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
        const container = ensureToastContainer();
        container.querySelectorAll('.kairo-toast').forEach(t => t.remove());

        const toast = document.createElement('div');
        toast.className = `kairo-toast kairo-toast--${variant}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-atomic', 'true');

        const body = document.createElement('div');
        body.className = 'kairo-toast__body';
        body.textContent = String(message || '');

        toast.appendChild(body);
        container.appendChild(toast);

        const remove = () => {
            try {
                toast.classList.remove('is-show');
                setTimeout(() => toast.remove(), 160);
            } catch { /* ignore */ }
        };

        setTimeout(() => toast.classList.add('is-show'), 0);
        if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
    }

    function showSuccess(msg) { showToast(msg, { variant: 'success' }); }
    function showError(msg) { showToast(msg, { variant: 'danger' }); }
    function showWarning(msg) { showToast(msg, { variant: 'warning' }); }
    function showInfo(msg) { showToast(msg, { variant: 'info' }); }

    // =========================================================================
    // Status Bar
    // =========================================================================
    function showStatus(message, type) {
        const el = $('statusMsg');
        if (!el) return;
        const textEl = el.querySelector('.status-text');
        if (textEl) textEl.textContent = message;
        el.classList.remove('hidden', 'success', 'error', 'warning', 'info');
        el.classList.add(type || 'info');
        clearTimeout(showStatus._t);
        showStatus._t = setTimeout(() => el.classList.add('hidden'), 4000);
    }

    // =========================================================================
    // Search Dialog Management (SearchModal pattern)
    // =========================================================================
    const searchDialogConfig = {
        'branch': {
            title: 'Branch Search',
            targetId: 'BranchId',
            targetName: 'BranchName',
            tableID: 'BranchID',
            moduleIDOverride: 4560,
            getAdvFilterString: () => '',
            searchFields: [
                { name: 'branchId', label: 'Branch ID', column: 'OurBranchID' },
                { name: 'branchName', label: 'Branch Name', column: 'BranchName' }
            ],
            displayFields: [
                { key: 'OurBranchID', label: 'Branch ID' },
                { key: 'BranchName', label: 'Branch Name' },
                { key: 'CurrencyID', label: 'Currency ID' }
            ]
        },
        'center': {
            title: 'Center Search',
            targetId: 'CenterId',
            targetName: 'CenterName',
            tableID: 'GroupID',
            moduleIDOverride: 4560,
            getAdvFilterString: () => {
                const branchId = coerceString($('BranchId')?.value).trim();
                const safeBranchId = String(branchId || '').replace(/'/g, "''");
                return safeBranchId ? `OurBranchID='${safeBranchId}'` : '';
            },
            searchFields: [
                { name: 'centerId', label: 'Center ID', column: 'GroupID' },
                { name: 'centerName', label: 'Center Name', column: 'GroupName' }
            ],
            displayFields: [
                { key: 'GroupID', label: 'Center ID' },
                { key: 'GroupName', label: 'Center Name' }
            ]
        },
        'scheme': {
            title: 'Loan Scheme Search',
            targetId: 'SchemeId',
            targetName: 'SchemeName',
            tableID: 'GroupLoanSchemeID',
            moduleIDOverride: 4560,
            getAdvFilterString: () => {
                const branchId = coerceString($('BranchId')?.value).trim();
                const centerId = coerceString($('CenterId')?.value).trim();
                const safeBranch = branchId.replace(/'/g, "''");
                const safeCenter = centerId.replace(/'/g, "''");
                const parts = [];
                if (safeCenter) parts.push(`GroupID='${safeCenter}'`);
                if (safeBranch) parts.push(`OurBranchID='${safeBranch}'`);
                return parts.join(' AND ');
            },
            searchFields: [
                { name: 'schemeId', label: 'Scheme ID', column: 'LoanSchemeID' },
                { name: 'description', label: 'Description', column: 'Description' }
            ],
            displayFields: [
                { key: 'LoanSchemeID', label: 'Scheme ID' },
                { key: 'Description', label: 'Description' }
            ]
        }
    };

    function ensureSharedSearchModal() {
        const appCore = getAppCore();
        if (!appCore) {
            showError('Search dialog unavailable (AppCore missing).');
            return null;
        }
        if (typeof window.SearchModal !== 'function') {
            showError('Search dialog script not loaded.');
            return null;
        }
        return new window.SearchModal(appCore);
    }

    function mapSelectedData(lookupType, data) {
        if (!data) return;
        const config = searchDialogConfig[lookupType];
        if (!config) return;

        const idField = $(config.targetId);
        const nameField = $(config.targetName);

        if (lookupType === 'branch') {
            const branchId = data.OurBranchID || data.BranchID || data.ID || '';
            const branchName = data.BranchName || data.Description || data.Name || '';
            if (idField) idField.value = branchId;
            if (nameField) nameField.value = branchName;
            parentContext.branchId = branchId;
            clearCenterFields();
            clearSchemeFields();
            clearPenaltyData();
            clearBehindTheScene();
            showSuccess(`Branch '${branchName}' selected`);
        } else if (lookupType === 'center') {
            const centerId = data.GroupID || data.CenterID || data.ID || '';
            const centerName = data.GroupName || data.CenterName || data.Description || data.Name || '';
            if (idField) idField.value = centerId;
            if (nameField) nameField.value = centerName;
            parentContext.centerId = centerId;
            clearSchemeFields();
            clearPenaltyData();
            clearBehindTheScene();
            fetchDefaultAdvanceType(centerId);
            showSuccess(`Center '${centerName}' selected`);
        } else if (lookupType === 'scheme') {
            const schemeId = data.LoanSchemeID || data.SchemeID || data.ID || '';
            const schemeName = data.Description || data.SchemeName || data.Name || '';
            if (idField) idField.value = schemeId;
            if (nameField) nameField.value = schemeName;
            parentContext.schemeId = schemeId;
            clearPenaltyData();
            clearBehindTheScene();
            showSuccess(`Scheme '${schemeName}' selected`);
        }
    }

    function openSearchDialog(lookupType) {
        const config = searchDialogConfig[lookupType];
        if (!config) { showWarning(`Unknown lookup type: ${lookupType}`); return; }

        if (lookupType === 'center') {
            if (!$('BranchId')?.value?.trim()) { showWarning('Please select a Branch first'); return; }
        }
        if (lookupType === 'scheme') {
            if (!$('BranchId')?.value?.trim()) { showWarning('Please select a Branch first'); return; }
            if (!$('CenterId')?.value?.trim()) { showWarning('Please select a Center first'); return; }
        }

        const modal = ensureSharedSearchModal();
        if (!modal || !config.tableID) {
            showError('Shared search dialog is not available.');
            return;
        }

        const advFilterString = typeof config.getAdvFilterString === 'function'
            ? config.getAdvFilterString() : (config.advFilterString || '');

        const { ourBranchID } = getEnv();

        modal.open({
            title: config.title,
            tableID: config.tableID,
            moduleID: config.moduleIDOverride || Number(DEFAULT_SEARCH_MODULE_ID),
            whereStmt: '',
            advFilterString,
            searchKey: '',
            ourbranchId: lookupType === 'scheme'
                ? coerceString($('BranchId')?.value).trim()
                : ourBranchID,
            onSelect: (record) => mapSelectedData(lookupType, record)
        });
    }

    // =========================================================================
    // Field Helpers
    // =========================================================================
    function clearCenterFields() {
        if ($('CenterId')) $('CenterId').value = '';
        if ($('CenterName')) $('CenterName').value = '';
    }

    function clearSchemeFields() {
        if ($('SchemeId')) $('SchemeId').value = '';
        if ($('SchemeName')) $('SchemeName').value = '';
    }

    function clearPenaltyData() {
        penaltyAccountsData = [];
        penaltySummaryData = null;
        renderPenaltyTable([]);
        if ($('PenaltyWaivedOff')) $('PenaltyWaivedOff').value = '';
        if ($('Reason')) { $('Reason').value = ''; $('Reason').disabled = true; }
    }

    function clearBehindTheScene() {
        const reset = (id) => { const el = $(id); if (el) el.textContent = '-'; };
        reset('spn_waiveOffStatus');
        reset('spn_createdBy');
        reset('spn_createdOn');
        reset('spn_modifiedBy');
        reset('spn_modifiedOn');
        reset('spn_supervisedBy');
        reset('spn_supervisedOn');
    }

    // =========================================================================
    // Data Extraction Utilities
    // =========================================================================
    function normalizeRowKeyMap(obj) {
        const out = {};
        if (!obj || typeof obj !== 'object') return out;
        Object.keys(obj).forEach(k => { out[String(k).toLowerCase()] = obj[k]; });
        return out;
    }

    function extractOldApiError(resp) {
        const root = resp?.data ?? resp;
        const status = String(root?.Status ?? root?.status ?? '').trim();
        const message = String(root?.Message ?? root?.message ?? '').trim();
        if (!status) return null;
        if (status === '0' || status === '200') return null;
        return { status, message: message || `Request failed (Status ${status})` };
    }

    // =========================================================================
    // Auto-populate Scheme from Default Advance Type
    // =========================================================================
    async function fetchDefaultAdvanceType(centerId) {
        if (!centerId) return;

        const branchId = coerceString($('BranchId')?.value).trim();
        if (!branchId) return;

        const { operatorID } = getEnv();

        try {
            const resp = await invokeController('get-default-adv-type', {
                OurBranchID: branchId,
                GroupID: centerId,
                OperatorID: operatorID
            });

            const apiError = extractOldApiError(resp);
            if (apiError) return;

            const details = resp?.Details ?? resp?.data?.Details ?? [];
            if (Array.isArray(details) && details.length > 0) {
                const row = details[0];
                const loanSchemeId = coerceString(row.LoanSchemeID).trim();
                const loanScheme = coerceString(row.LoanScheme || row.Description).trim();
                if (loanSchemeId) {
                    if ($('SchemeId')) $('SchemeId').value = loanSchemeId;
                    if ($('SchemeName')) $('SchemeName').value = loanScheme;
                    showInfo(`Scheme auto-populated: ${loanSchemeId}`);
                }
            }
        } catch (err) {
            console.error('Error fetching default advance type:', err);
        }
    }

    // =========================================================================
    // ID Validation (p_GetIDDescription)
    // =========================================================================
    async function validateField(fieldId, controlTypeID, onSuccess, onError) {
        const value = coerceString($(fieldId)?.value).trim();
        if (!value) return;

        const { ourBranchID, operatorID } = getEnv();

        try {
            const resp = await invokeController('validate', {
                ControlTypeID: controlTypeID,
                ControlID: value,
                OurBranchID: ourBranchID,
                OperatorID: operatorID
            });

            const apiError = extractOldApiError(resp);
            if (apiError) {
                showWarning(apiError.message);
                if (onError) onError();
                return;
            }

            const details = resp?.Details ?? resp?.data?.Details ?? [];
            if (Array.isArray(details) && details.length > 0) {
                if (onSuccess) onSuccess(details[0]);
            } else {
                showWarning(`No description found for ${controlTypeID}: ${value}`);
                if (onError) onError();
            }
        } catch (err) {
            console.error(`Validation error for ${controlTypeID}:`, err);
            if (onError) onError();
        }
    }

    // =========================================================================
    // Penalty Table Rendering
    // =========================================================================
    function renderPenaltyTable(accounts) {
        const tbody = document.querySelector('#penaltyTable tbody');
        if (!tbody) return;

        if (!accounts || accounts.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="10" class="text-center text-muted">No records to display</td></tr>';
            return;
        }

        tbody.innerHTML = accounts.map((account, index) => {
            const accountId = coerceString(account.AccountID);
            const accountName = coerceString(account.AccountName);
            const penaltyAmount = safeNumber(account.PenaltyAmount);
            const penaltyWaivedOff = safeNumber(account.PenaltyWaivedOff).toFixed(2);
            const penaltyInterestSuspended = account.PenaltyInterestSuspended != null
                ? safeNumber(account.PenaltyInterestSuspended).toFixed(2) : '';
            const penaltyReceivable = account.PenaltyReceivable != null
                ? safeNumber(account.PenaltyReceivable).toFixed(2) : '';
            const oDuePenaltyReceivable = account.ODuePenaltyReceivable != null
                ? safeNumber(account.ODuePenaltyReceivable).toFixed(2) : '';
            const penaltyAccruedUpto = coerceString(account.PenaltyAccruedUpto);
            const penaltyAppliedUpto = coerceString(account.PenaltyAppliedUpto);

            return `
                <tr data-row-index="${index}">
                    <td>
                        <input type="checkbox" class="form-check-input" data-row-checkbox="${index}" disabled>
                    </td>
                    <td>${accountId}</td>
                    <td>${accountName}</td>
                    <td class="text-end">${penaltyAmount.toFixed(2)}</td>
                    <td>
                        <input type="number" class="form-control form-control-sm"
                            data-row-waiveoff="${index}"
                            data-max-amount="${penaltyAmount}"
                            value="${penaltyWaivedOff}"
                            disabled step="0.01" min="0" max="${penaltyAmount}">
                    </td>
                    <td class="text-end">${penaltyInterestSuspended}</td>
                    <td class="text-end">${penaltyReceivable}</td>
                    <td class="text-end">${oDuePenaltyReceivable}</td>
                    <td>${penaltyAccruedUpto}</td>
                    <td>${penaltyAppliedUpto}</td>
                </tr>
            `;
        }).join('');

        // Wire up event listeners for checkboxes and waive-off inputs
        accounts.forEach((_, index) => {
            const checkbox = document.querySelector(`[data-row-checkbox="${index}"]`);
            const waiveOffInput = document.querySelector(`[data-row-waiveoff="${index}"]`);

            if (checkbox) {
                checkbox.addEventListener('change', () => handleRowCheckboxChange(index));
            }
            if (waiveOffInput) {
                waiveOffInput.addEventListener('input', () => handleWaiveOffChange(index));
            }
        });
    }

    // =========================================================================
    // Grid Interaction Handlers
    // =========================================================================
    function handleRowCheckboxChange(rowIndex) {
        const checkbox = document.querySelector(`[data-row-checkbox="${rowIndex}"]`);
        const waiveOffInput = document.querySelector(`[data-row-waiveoff="${rowIndex}"]`);

        if (checkbox && waiveOffInput) {
            waiveOffInput.disabled = !checkbox.checked;

            if (penaltyAccountsData[rowIndex]) {
                penaltyAccountsData[rowIndex].IsSelect = checkbox.checked;

                if (!checkbox.checked) {
                    waiveOffInput.value = '0.00';
                    penaltyAccountsData[rowIndex].PenaltyWaivedOff = 0;
                    updateTotalWaivedOff();
                }
            }
        }

        updateSelectAllState();
    }

    function handleWaiveOffChange(rowIndex) {
        const waiveOffInput = document.querySelector(`[data-row-waiveoff="${rowIndex}"]`);
        if (!waiveOffInput) return;

        const value = safeNumber(waiveOffInput.value);
        const maxAmount = safeNumber(waiveOffInput.getAttribute('data-max-amount'));

        if (value < 0) {
            showWarning('Penalty Waived Off cannot be negative');
            waiveOffInput.value = '0.00';
            updateTotalWaivedOff();
            return;
        }

        if (value > maxAmount) {
            showWarning(`Penalty Waived Off cannot exceed Penalty Amount (${maxAmount.toFixed(2)})`);
            waiveOffInput.value = maxAmount.toFixed(2);
            updateTotalWaivedOff();
            return;
        }

        if (penaltyAccountsData[rowIndex]) {
            penaltyAccountsData[rowIndex].PenaltyWaivedOff = value;
        }

        updateTotalWaivedOff();
    }

    function handleSelectAll() {
        const selectAll = $('selectAllPenalty');
        if (!selectAll) return;

        const isChecked = selectAll.checked;
        const checkboxes = document.querySelectorAll('[data-row-checkbox]');

        checkboxes.forEach(cb => {
            cb.checked = isChecked;
            const rowIndex = parseInt(cb.getAttribute('data-row-checkbox'), 10);
            const waiveOffInput = document.querySelector(`[data-row-waiveoff="${rowIndex}"]`);

            if (waiveOffInput) {
                waiveOffInput.disabled = !isChecked;
                if (!isChecked) {
                    waiveOffInput.value = '0.00';
                    if (penaltyAccountsData[rowIndex]) {
                        penaltyAccountsData[rowIndex].PenaltyWaivedOff = 0;
                    }
                }
            }

            if (penaltyAccountsData[rowIndex]) {
                penaltyAccountsData[rowIndex].IsSelect = isChecked;
            }
        });

        updateTotalWaivedOff();
    }

    function updateSelectAllState() {
        const selectAll = $('selectAllPenalty');
        if (!selectAll) return;

        const checkboxes = document.querySelectorAll('[data-row-checkbox]');
        if (checkboxes.length === 0) {
            selectAll.checked = false;
            return;
        }

        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        selectAll.checked = allChecked;
    }

    function updateTotalWaivedOff() {
        let total = 0;
        const waiveOffInputs = document.querySelectorAll('[data-row-waiveoff]');
        waiveOffInputs.forEach(input => {
            const value = safeNumber(input.value);
            if (value >= 0) total += value;
        });

        const totalControl = $('PenaltyWaivedOff');
        if (totalControl) totalControl.value = total.toFixed(2);
    }

    function enableGridControls(enabled) {
        const checkboxes = document.querySelectorAll('[data-row-checkbox]');
        checkboxes.forEach(cb => { cb.disabled = !enabled; });

        const selectAll = $('selectAllPenalty');
        if (selectAll) selectAll.disabled = !enabled;

        const waiveOffInputs = document.querySelectorAll('[data-row-waiveoff]');
        waiveOffInputs.forEach(input => {
            const rowIndex = input.getAttribute('data-row-waiveoff');
            const rowCheckbox = document.querySelector(`[data-row-checkbox="${rowIndex}"]`);
            input.disabled = !(enabled && rowCheckbox && rowCheckbox.checked);
        });

        if (!enabled) {
            checkboxes.forEach(cb => { cb.checked = false; });
            if (selectAll) selectAll.checked = false;
            penaltyAccountsData.forEach(acct => { acct.IsSelect = false; });
        }
    }

    // =========================================================================
    // Behind The Scene Population
    // =========================================================================
    function populateBehindTheScene(summary) {
        if (!summary) return;

        const set = (id, val) => { const el = $(id); if (el) el.textContent = val || '-'; };
        set('spn_waiveOffStatus', coerceString(summary.WaiveOffStatus || summary.Status));
        set('spn_createdBy', coerceString(summary.CreatedBy));
        set('spn_createdOn', coerceString(summary.CreatedOn));
        set('spn_modifiedBy', coerceString(summary.ModifiedBy));
        set('spn_modifiedOn', coerceString(summary.ModifiedOn));
        set('spn_supervisedBy', coerceString(summary.SupervisedBy));
        set('spn_supervisedOn', coerceString(summary.SupervisedOn));
    }

    // =========================================================================
    // Form State Management After View
    // =========================================================================
    function applyFormStateAfterView(summary) {
        const updateCount = summary?.UpdateCount || 0;

        // Disable identifier fields after view
        if ($('BranchId')) $('BranchId').disabled = true;
        if ($('CenterId')) $('CenterId').disabled = true;
        if ($('SchemeId')) $('SchemeId').disabled = true;

        const branchBtn = document.querySelector('[data-cpiw-lookup="branch"]');
        const centerBtn = document.querySelector('[data-cpiw-lookup="center"]');
        const schemeBtn = document.querySelector('[data-cpiw-lookup="scheme"]');
        if (branchBtn) branchBtn.disabled = true;
        if (centerBtn) centerBtn.disabled = true;
        if (schemeBtn) schemeBtn.disabled = true;

        // Button states based on UpdateCount
        const viewBtn = document.querySelector('[data-cpiw-action="view"]');
        const addBtn = document.querySelector('[data-cpiw-action="add"]');
        const editBtn = document.querySelector('[data-cpiw-action="edit"]');
        const deleteBtn = document.querySelector('[data-cpiw-action="delete"]');
        const saveBtn = document.querySelector('[data-cpiw-action="save"]');
        const cancelBtn = document.querySelector('[data-cpiw-action="cancel"]');

        if (viewBtn) viewBtn.disabled = true;
        if (addBtn) addBtn.disabled = updateCount !== 0;
        if (editBtn) editBtn.disabled = updateCount === 0;
        if (deleteBtn) deleteBtn.disabled = updateCount === 0;
        if (saveBtn) saveBtn.disabled = true;
        if (cancelBtn) cancelBtn.disabled = false;

        // Reason stays disabled until Add/Edit
        if ($('Reason')) $('Reason').disabled = true;
    }

    // =========================================================================
    // Action Handlers
    // =========================================================================

    // VIEW - Fetch penalty waive-off data
    async function handleView() {
        const branchId = coerceString($('BranchId')?.value).trim();
        const centerId = coerceString($('CenterId')?.value).trim();
        const schemeId = coerceString($('SchemeId')?.value).trim();

        if (!branchId) { showWarning('Please select Branch ID first'); return; }
        if (!centerId) { showWarning('Please select Center ID first'); return; }
        if (!schemeId) { showWarning('Please select Scheme ID first'); return; }

        const { operatorID } = getEnv();

        try {
            const resp = await invokeController('get', {
                OurBranchID: branchId,
                GroupID: centerId,
                LoanSchemeID: schemeId,
                OperatorID: operatorID
            });

            const apiError = extractOldApiError(resp);
            if (apiError) {
                showError('Failed to load penalty data: ' + apiError.message);
                return;
            }

            const accounts = resp?.Details ?? resp?.data?.Details ?? [];
            const summaryArr = resp?.Details01 ?? resp?.data?.Details01 ?? [];
            const summary = Array.isArray(summaryArr) && summaryArr.length > 0 ? summaryArr[0] : null;

            penaltyAccountsData = Array.isArray(accounts) ? accounts : [];
            penaltySummaryData = summary;

            renderPenaltyTable(penaltyAccountsData);
            updateTotalWaivedOff();
            populateBehindTheScene(summary);
            applyFormStateAfterView(summary);

            showSuccess(`Loaded ${penaltyAccountsData.length} penalty account(s)`);
        } catch (err) {
            console.error('Error fetching penalty data:', err);
            showError('Error loading penalty data');
        }
    }

    // ADD - Enable grid controls for adding waive-off entries
    function handleAdd() {
        editMode = true;
        enableGridControls(true);

        if ($('Reason')) $('Reason').disabled = false;

        const addBtn = document.querySelector('[data-cpiw-action="add"]');
        const saveBtn = document.querySelector('[data-cpiw-action="save"]');
        const editBtn = document.querySelector('[data-cpiw-action="edit"]');

        if (addBtn) addBtn.disabled = true;
        if (saveBtn) saveBtn.disabled = false;
        if (editBtn) editBtn.disabled = true;

        showInfo('Add mode enabled - select accounts and enter waive-off amounts');
    }

    // EDIT - Toggle edit mode
    function handleEdit() {
        editMode = !editMode;
        enableGridControls(editMode);

        if ($('Reason')) $('Reason').disabled = !editMode;

        const saveBtn = document.querySelector('[data-cpiw-action="save"]');
        if (saveBtn) saveBtn.disabled = !editMode;

        if (editMode) {
            showInfo('Edit mode enabled');
        } else {
            showInfo('Edit mode cancelled');
        }
    }

    // DELETE - Delete penalty waive-off record
    async function handleDelete() {
        if (!confirm('Are you sure you want to delete this penalty waive-off record?')) return;

        const branchId = coerceString($('BranchId')?.value).trim();
        const centerId = coerceString($('CenterId')?.value).trim();
        const schemeId = coerceString($('SchemeId')?.value).trim();
        const { operatorID } = getEnv();

        try {
            const resp = await invokeController('delete', {
                OurBranchID: branchId,
                GroupID: centerId,
                LoanSchemeID: schemeId,
                OperatorID: operatorID
            });

            const apiError = extractOldApiError(resp);
            if (apiError) {
                showError('Delete failed: ' + apiError.message);
                return;
            }

            showSuccess('Penalty waive-off record deleted successfully');
            handleCancel();
        } catch (err) {
            console.error('Error deleting penalty waive-off:', err);
            showError('Error deleting record');
        }
    }

    // SAVE - Save penalty waive-off entries
    async function handleSave() {
        const reason = coerceString($('Reason')?.value).trim();
        if (!reason) {
            showWarning('Please enter a reason');
            $('Reason')?.focus();
            return;
        }

        // Collect selected accounts with waive-off amounts
        const selectedAccounts = [];
        penaltyAccountsData.forEach((acct, idx) => {
            const checkbox = document.querySelector(`[data-row-checkbox="${idx}"]`);
            const waiveOffInput = document.querySelector(`[data-row-waiveoff="${idx}"]`);

            if (checkbox && checkbox.checked && waiveOffInput) {
                selectedAccounts.push({
                    AccountID: coerceString(acct.AccountID),
                    PenaltyWaivedOff: safeNumber(waiveOffInput.value),
                    IsSelect: true
                });
            }
        });

        if (selectedAccounts.length === 0) {
            showWarning('Please select at least one account to waive off');
            return;
        }

        const branchId = coerceString($('BranchId')?.value).trim();
        const centerId = coerceString($('CenterId')?.value).trim();
        const schemeId = coerceString($('SchemeId')?.value).trim();
        const totalWaivedOff = coerceString($('PenaltyWaivedOff')?.value).trim();
        const { operatorID } = getEnv();

        try {
            const resp = await invokeController('add', {
                OurBranchID: branchId,
                GroupID: centerId,
                LoanSchemeID: schemeId,
                Reason: reason,
                PenaltyWaivedOff: totalWaivedOff,
                OperatorID: operatorID,
                Accounts: selectedAccounts
            });

            const apiError = extractOldApiError(resp);
            if (apiError) {
                showError('Save failed: ' + apiError.message);
                return;
            }

            showSuccess('Penalty waive off saved successfully');
            editMode = false;
            enableGridControls(false);
            if ($('Reason')) $('Reason').disabled = true;

            const saveBtn = document.querySelector('[data-cpiw-action="save"]');
            if (saveBtn) saveBtn.disabled = true;

            // Re-fetch to refresh state
            await handleView();
        } catch (err) {
            console.error('Error saving penalty waive-off:', err);
            showError('Error saving record');
        }
    }

    // CANCEL - Reset form to initial state
    function handleCancel() {
        // Clear all fields
        if ($('BranchId')) { $('BranchId').value = ''; $('BranchId').disabled = false; }
        if ($('BranchName')) $('BranchName').value = '';
        if ($('CenterId')) { $('CenterId').value = ''; $('CenterId').disabled = false; }
        if ($('CenterName')) $('CenterName').value = '';
        if ($('SchemeId')) { $('SchemeId').value = ''; $('SchemeId').disabled = false; }
        if ($('SchemeName')) $('SchemeName').value = '';
        if ($('Reason')) { $('Reason').value = ''; $('Reason').disabled = true; }
        if ($('PenaltyWaivedOff')) $('PenaltyWaivedOff').value = '';

        clearBehindTheScene();

        // Re-enable lookup buttons
        const branchBtn = document.querySelector('[data-cpiw-lookup="branch"]');
        const centerBtn = document.querySelector('[data-cpiw-lookup="center"]');
        const schemeBtn = document.querySelector('[data-cpiw-lookup="scheme"]');
        if (branchBtn) branchBtn.disabled = false;
        if (centerBtn) centerBtn.disabled = false;
        if (schemeBtn) schemeBtn.disabled = false;

        // Reset data
        penaltyAccountsData = [];
        penaltySummaryData = null;
        editMode = false;
        parentContext.branchId = '';
        parentContext.centerId = '';
        parentContext.schemeId = '';

        // Clear grid
        renderPenaltyTable([]);

        // Reset button states
        const viewBtn = document.querySelector('[data-cpiw-action="view"]');
        const addBtn = document.querySelector('[data-cpiw-action="add"]');
        const editBtn = document.querySelector('[data-cpiw-action="edit"]');
        const deleteBtn = document.querySelector('[data-cpiw-action="delete"]');
        const saveBtn = document.querySelector('[data-cpiw-action="save"]');
        const cancelBtn = document.querySelector('[data-cpiw-action="cancel"]');
        const superviseBtn = document.querySelector('[data-cpiw-action="supervise"]');
        const historyBtn = document.querySelector('[data-cpiw-action="history"]');

        if (viewBtn) viewBtn.disabled = false;
        if (addBtn) addBtn.disabled = true;
        if (editBtn) editBtn.disabled = true;
        if (deleteBtn) deleteBtn.disabled = true;
        if (saveBtn) saveBtn.disabled = true;
        if (cancelBtn) cancelBtn.disabled = false;
        if (superviseBtn) superviseBtn.disabled = true;
        if (historyBtn) historyBtn.disabled = true;

        showInfo('Cancelled');
    }

    // =========================================================================
    // Background Search — fetch details by ID via SearchModal/Search
    // =========================================================================
    async function backgroundSearch(tableID, advFilterString, whereStmt, moduleID) {
        const appCore = getAppCore();
        if (!appCore || typeof appCore.invokeControllerAsync !== 'function') {
            throw new Error('AppCore is not available');
        }

        const { ourBranchID } = getEnv();
        const response = await appCore.invokeControllerAsync('SearchModal/Search', {
            TableID: tableID,
            WhereStmt: whereStmt || '',
            AdvFilterString: advFilterString || '',
            SearchKey: '',
            ModuleID: String(moduleID || DEFAULT_SEARCH_MODULE_ID),
            PageSize: 20,
            RefID: '',
            PrevOrNext: 1,
            OurBranchID: ourBranchID
        });

        let results = [];
        if (response?.success && response?.data) {
            const d = response.data;
            if (Array.isArray(d)) {
                results = d;
            } else if (d.Details) {
                results = Array.isArray(d.Details) ? d.Details : [d.Details];
            } else if (d.details?.SearchResults) {
                results = Array.isArray(d.details.SearchResults) ? d.details.SearchResults : [];
            } else if (d.Records) {
                results = Array.isArray(d.Records) ? d.Records : [];
            }
        }
        return results;
    }

    async function handleViewBranch() {
        const branchId = coerceString($('BranchId')?.value).trim();
        if (!branchId) { showWarning('Please enter a Branch ID'); return; }

        try {
            const config = searchDialogConfig['branch'];
            const advFilter = config.getAdvFilterString();
            const safeId = String(branchId).replace(/'/g, "''");
            const whereStmt = `OurBranchID='${safeId}'`;

            const results = await backgroundSearch(config.tableID, advFilter, whereStmt, config.moduleIDOverride);

            if (results.length > 0) {
                mapSelectedData('branch', results[0]);
            } else {
                if ($('BranchName')) $('BranchName').value = '';
                showWarning('Branch not found');
            }
        } catch (error) {
            console.error('[CenterPenaltyWaiveOff] Error loading branch:', error);
            showError('Error loading branch details');
        }
    }

    async function handleViewCenter() {
        const centerId = coerceString($('CenterId')?.value).trim();
        if (!centerId) { showWarning('Please enter a Center ID'); return; }

        const branchId = parentContext.branchId || coerceString($('BranchId')?.value).trim();
        if (!branchId) { showWarning('Please select a Branch first'); return; }

        try {
            const config = searchDialogConfig['center'];
            const advFilter = config.getAdvFilterString();
            const safeId = String(centerId).replace(/'/g, "''");
            const whereStmt = `GroupID='${safeId}'`;

            const results = await backgroundSearch(config.tableID, advFilter, whereStmt, config.moduleIDOverride);

            if (results.length > 0) {
                mapSelectedData('center', results[0]);
            } else {
                if ($('CenterName')) $('CenterName').value = '';
                showWarning('Center not found');
            }
        } catch (error) {
            console.error('[CenterPenaltyWaiveOff] Error loading center:', error);
            showError('Error loading center details');
        }
    }

    async function handleViewScheme() {
        const schemeId = coerceString($('SchemeId')?.value).trim();
        if (!schemeId) { showWarning('Please enter a Scheme ID'); return; }

        try {
            const config = searchDialogConfig['scheme'];
            const advFilter = config.getAdvFilterString();
            const safeId = String(schemeId).replace(/'/g, "''");
            const whereStmt = `LoanSchemeID='${safeId}'`;

            const results = await backgroundSearch(config.tableID, advFilter, whereStmt, config.moduleIDOverride);

            if (results.length > 0) {
                mapSelectedData('scheme', results[0]);
            } else {
                if ($('SchemeName')) $('SchemeName').value = '';
                showWarning('Scheme not found');
            }
        } catch (error) {
            console.error('[CenterPenaltyWaiveOff] Error loading scheme:', error);
            showError('Error loading scheme details');
        }
    }

    // =========================================================================
    // Field Blur & Enter Key Listeners (autofill on blur)
    // =========================================================================
    function setupFieldListeners() {
        // Enter key handlers
        $('BranchId')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleViewBranch(); }
        });
        $('CenterId')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleViewCenter(); }
        });
        $('SchemeId')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleViewScheme(); }
        });

        // Blur handlers - fetch details when tabbing away
        $('BranchId')?.addEventListener('blur', (e) => {
            const branchId = e.target.value.trim();
            if (branchId && branchId !== parentContext.branchId) {
                handleViewBranch();
            }
        });
        $('CenterId')?.addEventListener('blur', (e) => {
            const centerId = e.target.value.trim();
            if (centerId && centerId !== parentContext.centerId) {
                handleViewCenter();
            }
        });
        $('SchemeId')?.addEventListener('blur', (e) => {
            const schemeId = e.target.value.trim();
            if (schemeId && schemeId !== parentContext.schemeId) {
                handleViewScheme();
            }
        });
    }

    // =========================================================================
    // Initialization
    // =========================================================================
    function init() {
        // Wire lookup buttons
        document.querySelectorAll('[data-cpiw-lookup]').forEach(btn => {
            btn.addEventListener('click', () => {
                const lookupType = btn.getAttribute('data-cpiw-lookup');
                openSearchDialog(lookupType);
            });
        });

        // Wire action buttons
        const actionHandlers = {
            'view': handleView,
            'add': handleAdd,
            'edit': handleEdit,
            'delete': handleDelete,
            'save': handleSave,
            'cancel': handleCancel
        };

        document.querySelectorAll('[data-cpiw-action]').forEach(btn => {
            const action = btn.getAttribute('data-cpiw-action');
            if (actionHandlers[action]) {
                btn.addEventListener('click', actionHandlers[action]);
            }
        });

        // Wire selectAll checkbox
        const selectAll = $('selectAllPenalty');
        if (selectAll) {
            selectAll.addEventListener('change', handleSelectAll);
        }

        // Wire field change listeners
        setupFieldListeners();

        // Initial state
        if ($('Reason')) $('Reason').disabled = true;
    }

    // =========================================================================
    // Bootstrap
    // =========================================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
