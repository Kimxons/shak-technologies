/**
 * Forfeit Recovery Module
 * Handles center, group, client, and officer search with forfeit recovery operations
 * Converted from legacy HTML/JS to KAIRO MVC pattern
 */

(function () {
    'use strict';

    const DEFAULT_SEARCH_MODULE_ID = String(window.Environment?.defaultSearchModuleId || window.Environment?.microfinanceModuleId || '5060');

    function getAppCore() {
        const win = window;
        return win.AppCore || (win.parent && win.parent !== win && win.parent.AppCore) || (win.top && win.top !== win && win.top.AppCore) || null;
    }

    // =========================================================================
    // Service Invoker - ALL API calls use POST via AppCore.invokeControllerAsync
    // =========================================================================
    async function invokeForfeitRecoveryController(action, requestData) {
        const appCore = getAppCore();
        if (!appCore || typeof appCore.invokeControllerAsync !== 'function') {
            throw new Error('AppCore is not available (AppCore.invokeControllerAsync not found)');
        }

        const endpoint = `MicroFinance/ForfeitRecovery/${action}`;
        return appCore.invokeControllerAsync(endpoint, requestData || {});
    }

    // =========================================================================
    // State Management
    // =========================================================================
    let currentData = null;
    let editMode = false;

    // =========================================================================
    // Environment Helper
    // =========================================================================
    function getEnv() {
        const e = window.Environment || {};
        const bankID = e.defaultBankId || e.defaultBankID || e.bankID || e.bankId ||
            sessionStorage.getItem('BankID') || localStorage.getItem('BankID') || '00';
        // Branch code logic: fetch from session/environment, fallback to '0603'
        let branchCode = e.branch_code || e.branchID || e.branchId || e.OurBranchID || e.defaultOurBranchId ||
            sessionStorage.getItem('BranchID') || sessionStorage.getItem('OurBranchID') || localStorage.getItem('BranchID');
        if (!branchCode || branchCode === '' || branchCode === 'null' || branchCode === 'undefined') {
            branchCode = '0603';
        }
        const operatorID = e.operatorID || e.operatorId ||
            sessionStorage.getItem('OperatorID') || sessionStorage.getItem('operatorId') || localStorage.getItem('OperatorID') || 'CSADM';
        return { bankID, ourBranchID: branchCode, operatorID };
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
        'center': {
            title: 'Center Search',
            targetId: 'CenterId',
            targetName: 'CenterName',
            tableID: 'GroupID',
            moduleIDOverride: 5060,
            getAdvFilterString: () => {
                const { ourBranchID } = getEnv();
                const safeBranchId = String(ourBranchID || '').replace(/'/g, "''");
                return safeBranchId ? `OurBranchID='${safeBranchId}' AND GroupStatusID='A'` : "GroupStatusID='A'";
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
        'group': {
            title: 'Group Search',
            targetId: 'GroupId',
            targetName: 'GroupName',
            tableID: 'SubGroupID',
            moduleIDOverride: 5060,
            getAdvFilterString: () => {
                const { ourBranchID } = getEnv();
                const centerId = $('CenterId')?.value?.trim() || '';
                const safeBranchId = String(ourBranchID || '').replace(/'/g, "''");
                const safeCenterId = String(centerId).replace(/'/g, "''");
                const parts = [];
                if (safeBranchId) parts.push(`OurBranchID='${safeBranchId}'`);
                if (safeCenterId) parts.push(`GroupID='${safeCenterId}'`);
                return parts.join(' AND ');
            },
            searchFields: [
                { name: 'groupId', label: 'Group ID', column: 'SubGroupID' },
                { name: 'groupName', label: 'Group Name', column: 'SubGroupName' }
            ],
            displayFields: [
                { key: 'SubGroupID', label: 'Group ID' },
                { key: 'SubGroupName', label: 'Group Name' }
            ]
        },
        'client': {
            title: 'Exited Client Search',
            targetId: 'ClientId',
            targetName: 'ClientName',
            tableID: 'GroupExitedClientID',
            moduleIDOverride: 5170,
            getAdvFilterString: () => {
                const { ourBranchID } = getEnv();
                const centerId = $('CenterId')?.value?.trim() || '';
                const groupId = $('GroupId')?.value?.trim() || '';
                const safeBranchId = String(ourBranchID || '').replace(/'/g, "''");
                const safeCenterId = String(centerId).replace(/'/g, "''");
                const safeGroupId = String(groupId).replace(/'/g, "''");
                const parts = [];
                if (safeBranchId) parts.push(`OurBranchID='${safeBranchId}'`);
                if (safeCenterId) parts.push(`GroupID='${safeCenterId}'`);
                if (safeGroupId) parts.push(`SubGroupID='${safeGroupId}'`);
                return parts.join(' AND ');
            },
            searchFields: [
                { name: 'clientId', label: 'Client ID', column: 'GroupExitedClientID' },
                { name: 'clientName', label: 'Client Name', column: 'GroupExitedClientName' }
            ],
            displayFields: [
                { key: 'GroupExitedClientID', label: 'Client ID' },
                { key: 'GroupExitedClientName', label: 'Client Name' }
            ]
        },
        'officer': {
            title: 'Credit Officer Search',
            targetId: 'CreditOfficer',
            targetName: 'OfficerName',
            tableID: 'ActiveOfficerID',
            moduleIDOverride: 5060,
            getAdvFilterString: () => {
                return "BankID='00' AND OfficerTypeID in ('CO','AO')";
            },
            searchFields: [
                { name: 'officerId', label: 'Officer ID', column: 'OfficerID' },
                { name: 'officerName', label: 'Officer Name', column: 'OfficerName' }
            ],
            displayFields: [
                { key: 'OfficerID', label: 'Officer ID' },
                { key: 'OfficerName', label: 'Officer Name' }
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

        if (lookupType === 'center') {
            const centerId = data.GroupID || data.CenterID || data.ID || '';
            const centerName = data.GroupName || data.CenterName || data.Description || data.Name || '';
            if (idField) idField.value = centerId;
            if (nameField) nameField.value = centerName;
            clearGroupFields();
            clearClientFields();
            showSuccess(`Center '${centerName}' selected`);
        } else if (lookupType === 'group') {
            const groupId = data.SubGroupID || data.GroupID || data.ID || '';
            const groupName = data.SubGroupName || data.GroupName || data.Description || data.Name || '';
            if (idField) idField.value = groupId;
            if (nameField) nameField.value = groupName;
            clearClientFields();
            showSuccess(`Group '${groupName}' selected`);
        } else if (lookupType === 'client') {
            const clientId = data.GroupExitedClientID || data.ClientID || data.ID || '';
            const clientName = data.GroupExitedClientName || data.ClientName || data.Name || data.Description || '';
            if (idField) idField.value = clientId;
            if (nameField) nameField.value = clientName;
            showSuccess(`Client '${clientName}' selected`);
        } else if (lookupType === 'officer') {
            const officerId = data.OfficerID || data.ActiveOfficerID || data.ID || '';
            const officerName = data.OfficerName || data.Name || data.Description || '';
            if (idField) idField.value = officerId;
            if (nameField) nameField.value = officerName;
            showSuccess(`Officer '${officerName}' selected`);
        }
    }

    function openSearchDialog(lookupType) {
        const config = searchDialogConfig[lookupType];
        if (!config) { showWarning(`Unknown lookup type: ${lookupType}`); return; }

        if (lookupType === 'group') {
            if (!$('CenterId')?.value?.trim()) { showWarning('Please select a Center first'); return; }
        }
        if (lookupType === 'client') {
            if (!$('CenterId')?.value?.trim()) { showWarning('Please select a Center first'); return; }
            if (!$('GroupId')?.value?.trim()) { showWarning('Please select a Group first'); return; }
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
            ourbranchId: ourBranchID,
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

    function clearGroupFields() {
        if ($('GroupId')) $('GroupId').value = '';
        if ($('GroupName')) $('GroupName').value = '';
    }

    function clearClientFields() {
        if ($('ClientId')) $('ClientId').value = '';
        if ($('ClientName')) $('ClientName').value = '';
    }

    function clearAllDependents() {
        clearCenterFields();
        clearGroupFields();
        clearClientFields();
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

    function extractDetailsArray(resp) {
        const root = resp?.data ?? resp;
        const direct = root?.Details ?? root?.details;
        if (Array.isArray(direct)) return direct;
        return [];
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
    // ID Validation Handlers (via OldAPI p_GetIDDescription)
    // =========================================================================
    async function handleViewCenter() {
        const centerId = ($('CenterId')?.value || '').trim();
        if (!centerId) { showWarning('Please enter a Center ID'); return; }

        try {
            showInfo('Loading center details...');
            const { ourBranchID, bankID } = getEnv();
            const result = await invokeForfeitRecoveryController('old-api', {
                FormId: 'p_GetIDDescription',
                RequestData: {
                    OurBranchID: ourBranchID,
                    ControlTypeID: 'GroupID',
                    ID: centerId,
                    BankID: bankID,
                    TypeID: '',
                    AdvanceFilter: `OurBranchID='${ourBranchID}'`,
                    LanguageID: 'en'
                }
            });
            const details = result?.Details || result?.data?.Details || [];
            const center = Array.isArray(details) ? details[0] : details;
            if (center && (center.GroupName || center.Description)) {
                $('CenterName').value = center.GroupName || center.Description || '';
                clearGroupFields();
                clearClientFields();
                showSuccess(`Center '${center.GroupName || center.Description}' loaded`);
            } else {
                showWarning('Center not found');
            }
        } catch (error) {
            console.error('[ForfeitRecovery] Error loading center:', error);
            showError('Error loading center details');
        }
    }

    async function handleViewGroup() {
        const groupId = ($('GroupId')?.value || '').trim();
        if (!groupId) { showWarning('Please enter a Group ID'); return; }

        const centerId = ($('CenterId')?.value || '').trim();
        if (!centerId) { showWarning('Please select a Center first'); return; }

        try {
            showInfo('Loading group details...');
            const { ourBranchID, bankID } = getEnv();
            const result = await invokeForfeitRecoveryController('old-api', {
                FormId: 'p_GetIDDescription',
                RequestData: {
                    OurBranchID: ourBranchID,
                    ControlTypeID: 'SubGroupID',
                    ID: groupId,
                    BankID: bankID,
                    TypeID: '',
                    AdvanceFilter: `OurBranchID='${ourBranchID}' AND GroupID='${centerId}'`,
                    LanguageID: 'en'
                }
            });
            const details = result?.Details || result?.data?.Details || [];
            const group = Array.isArray(details) ? details[0] : details;
            if (group && (group.SubGroupName || group.Description)) {
                $('GroupName').value = group.SubGroupName || group.Description || '';
                clearClientFields();
                showSuccess(`Group '${group.SubGroupName || group.Description}' loaded`);
            } else {
                showWarning('Group not found');
            }
        } catch (error) {
            console.error('[ForfeitRecovery] Error loading group:', error);
            showError('Error loading group details');
        }
    }

    async function handleViewClient() {
        const clientId = ($('ClientId')?.value || '').trim();
        if (!clientId) { showWarning('Please enter a Client ID'); return; }

        const centerId = ($('CenterId')?.value || '').trim();
        const groupId = ($('GroupId')?.value || '').trim();
        if (!centerId || !groupId) {
            showWarning('Please select Center and Group first');
            return;
        }

        try {
            showInfo('Loading client details...');
            const { ourBranchID, bankID } = getEnv();
            const result = await invokeForfeitRecoveryController('old-api', {
                FormId: 'p_GetIDDescription',
                RequestData: {
                    OurBranchID: ourBranchID,
                    ControlTypeID: 'GroupExitedClientID',
                    ID: clientId,
                    BankID: bankID,
                    TypeID: '',
                    AdvanceFilter: `OurBranchID='${ourBranchID}' AND GroupID='${centerId}' AND SubGroupID='${groupId}'`,
                    LanguageID: 'en'
                }
            });
            const details = result?.Details || result?.data?.Details || [];
            const client = Array.isArray(details) ? details[0] : details;
            if (client && (client.GroupExitedClientName || client.ClientName || client.Name || client.Description)) {
                $('ClientName').value = client.GroupExitedClientName || client.ClientName || client.Name || client.Description || '';
                showSuccess(`Client loaded`);
            } else {
                showWarning('Exited client not found');
            }
        } catch (error) {
            console.error('[ForfeitRecovery] Error loading client:', error);
            showError('Error loading client details');
        }
    }

    async function handleViewOfficer() {
        const officerId = ($('CreditOfficer')?.value || '').trim();
        if (!officerId) { showWarning('Please enter an Officer ID'); return; }

        try {
            showInfo('Loading officer details...');
            const { ourBranchID, bankID } = getEnv();
            const result = await invokeForfeitRecoveryController('old-api', {
                FormId: 'p_GetIDDescription',
                RequestData: {
                    OurBranchID: ourBranchID,
                    ControlTypeID: 'ActiveOfficerID',
                    ID: officerId,
                    BankID: bankID,
                    TypeID: '',
                    AdvanceFilter: "BankID='00' AND OfficerTypeID in ('CO','AO')",
                    LanguageID: 'en'
                }
            });
            const details = result?.Details || result?.data?.Details || [];
            const officer = Array.isArray(details) ? details[0] : details;
            if (officer && (officer.OfficerName || officer.Name || officer.Description)) {
                $('OfficerName').value = officer.OfficerName || officer.Name || officer.Description || '';
                showSuccess(`Officer '${officer.OfficerName || officer.Name || officer.Description}' loaded`);
            } else {
                showWarning('Officer not found');
            }
        } catch (error) {
            console.error('[ForfeitRecovery] Error loading officer:', error);
            showError('Error loading officer details');
        }
    }

    // =========================================================================
    // Rendering
    // =========================================================================
    function renderTransactionTable(rows) {
        const body = $('transactionBody');
        if (!body) return;
        const items = Array.isArray(rows) ? rows : [];
        body.innerHTML = '';

        if (items.length === 0) {
            body.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No records to display.</td></tr>';
            return;
        }

        items.forEach(r => {
            const tr = document.createElement('tr');
            ['accountType', 'accountId', 'description', 'transactionType', 'amount'].forEach(k => {
                const td = document.createElement('td');
                if (k === 'amount') td.className = 'text-end';
                td.textContent = r?.[k] ?? '';
                tr.appendChild(td);
            });
            body.appendChild(tr);
        });
    }

    function renderRecoveryTable(rows) {
        const body = $('recoveryBody');
        if (!body) return;
        const items = Array.isArray(rows) ? rows : [];
        body.innerHTML = '';

        if (items.length === 0) {
            body.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No records to display.</td></tr>';
            return;
        }

        items.forEach(r => {
            const tr = document.createElement('tr');
            ['name', 'accountId', 'forfeitedAmount', 'osForfeit', 'recoveredAmount', 'recoveryStatus'].forEach(k => {
                const td = document.createElement('td');
                if (k === 'forfeitedAmount' || k === 'osForfeit' || k === 'recoveredAmount') td.className = 'text-end';
                td.textContent = r?.[k] ?? '';
                tr.appendChild(td);
            });
            body.appendChild(tr);
        });
    }

    // =========================================================================
    // Form Bind from API Response
    // =========================================================================
    function tryApplyApiToForm(payload) {
        if (!payload) return false;
        const root = payload.data ?? payload;
        const details = root?.Details ?? root?.details;
        const rows = Array.isArray(details) ? details : [];

        if (rows.length === 0) return false;
        const row = rows[0];
        const m = normalizeRowKeyMap(row);

        // Bind header fields
        $('CenterId').value = coerceString(m.centerid ?? m.groupid ?? $('CenterId').value);
        $('CenterName').value = coerceString(m.centername ?? m.groupname ?? $('CenterName').value);
        $('GroupId').value = coerceString(m.groupid ?? m.subgroupid ?? $('GroupId').value);
        $('GroupName').value = coerceString(m.groupname ?? m.subgroupname ?? $('GroupName').value);
        $('ClientId').value = coerceString(m.clientid ?? $('ClientId').value);
        $('ClientName').value = coerceString(m.clientname ?? m.customername ?? m.name ?? $('ClientName').value);

        $('AmountRecovered').value = m.amountrecovered ?? m.amount ?? '';
        $('ExchangeRate').value = m.exchangerate ?? '1.00';
        $('CreditOfficer').value = coerceString(m.creditofficerid ?? m.officerid ?? '');
        $('OfficerName').value = coerceString(m.officername ?? m.creditofficername ?? '');
        $('Remarks').value = coerceString(m.remarks ?? '');

        const recoveredChargeOff = $('RecoveredChargeOff');
        const recoveredForfeit = $('RecoveredForfeit');
        if (recoveredChargeOff) recoveredChargeOff.checked = normalizeBool(m.recoveredchargeoff ?? m.recoveredagainstchargeoff);
        if (recoveredForfeit) recoveredForfeit.checked = normalizeBool(m.recoveredforfeit ?? m.recoveredagainstforfeit);

        // Bind transaction rows (Details2 or secondary dataset)
        const transactions = root?.Details2 ?? root?.details2 ?? [];
        if (Array.isArray(transactions) && transactions.length > 0) {
            renderTransactionTable(transactions.map(r => {
                const rm = normalizeRowKeyMap(r);
                return {
                    accountType: rm.accounttypeid ?? rm.accounttype ?? '',
                    accountId: rm.accountid ?? '',
                    description: rm.description ?? rm.trxdescription ?? '',
                    transactionType: rm.transactiontype ?? rm.trxtypeid ?? '',
                    amount: rm.amount ?? ''
                };
            }));
        }

        // Bind recovery rows (Details3 or tertiary dataset)
        const recoveryRows = root?.Details3 ?? root?.details3 ?? [];
        if (Array.isArray(recoveryRows) && recoveryRows.length > 0) {
            renderRecoveryTable(recoveryRows.map(r => {
                const rm = normalizeRowKeyMap(r);
                return {
                    name: rm.name ?? rm.clientname ?? '',
                    accountId: rm.accountid ?? '',
                    forfeitedAmount: rm.forfeitedamount ?? rm.amount ?? '',
                    osForfeit: rm.osforfeit ?? rm.osamount ?? '',
                    recoveredAmount: rm.recoveredamount ?? '',
                    recoveryStatus: rm.recoverystatus ?? rm.status ?? ''
                };
            }));
        }

        return true;
    }

    function normalizeBool(v) {
        if (typeof v === 'boolean') return v;
        const s = String(v ?? '').trim().toLowerCase();
        return s === 'true' || s === '1' || s === 'y' || s === 'yes';
    }

    // =========================================================================
    // Edit Mode & Button State
    // =========================================================================
    function setEditMode(enabled) {
        editMode = Boolean(enabled);
        const editableIds = ['AmountRecovered', 'ExchangeRate', 'Remarks'];
        editableIds.forEach(id => {
            const el = $(id);
            if (el) el.readOnly = !editMode;
        });
        const checkIds = ['RecoveredChargeOff', 'RecoveredForfeit'];
        checkIds.forEach(id => {
            const el = $(id);
            if (el) el.disabled = !editMode;
        });
        const officerField = $('CreditOfficer');
        if (officerField) officerField.readOnly = !editMode;

        const btnSave = $('btnSave');
        if (btnSave) btnSave.disabled = !editMode;
    }

    function setIdentityDisabled(disabled) {
        ['CenterId', 'GroupId', 'ClientId'].forEach(id => {
            const el = $(id);
            if (el) el.disabled = Boolean(disabled);
        });
        document.querySelectorAll('[data-fr-lookup="center"], [data-fr-lookup="group"], [data-fr-lookup="client"]').forEach(btn => {
            btn.disabled = Boolean(disabled);
        });
    }

    function enableActionButtons() {
        const btnAdd = $('btnAdd');
        const btnSave = $('btnSave');
        const btnCancel = $('btnCancel');
        if (btnAdd) btnAdd.disabled = false;
        if (btnSave) btnSave.disabled = false;
        if (btnCancel) btnCancel.disabled = false;
    }

    function disableActionButtons() {
        const btnAdd = $('btnAdd');
        const btnSave = $('btnSave');
        const btnCancel = $('btnCancel');
        if (btnAdd) btnAdd.disabled = true;
        if (btnSave) btnSave.disabled = true;
        if (btnCancel) btnCancel.disabled = true;
    }

    // =========================================================================
    // Form Operations
    // =========================================================================
    function clearForm() {
        [
            'CenterId', 'CenterName', 'GroupId', 'GroupName', 'ClientId', 'ClientName',
            'AmountRecovered', 'ExchangeRate', 'CreditOfficer', 'OfficerName', 'Remarks'
        ].forEach(id => {
            const el = $(id);
            if (el) el.value = '';
        });

        const recoveredChargeOff = $('RecoveredChargeOff');
        const recoveredForfeit = $('RecoveredForfeit');
        if (recoveredChargeOff) recoveredChargeOff.checked = false;
        if (recoveredForfeit) recoveredForfeit.checked = false;

        renderTransactionTable([]);
        renderRecoveryTable([]);
        currentData = null;
    }

    function getFormData() {
        return {
            centerId: ($('CenterId')?.value || '').trim(),
            groupId: ($('GroupId')?.value || '').trim(),
            clientId: ($('ClientId')?.value || '').trim(),
            amountRecovered: safeNumber($('AmountRecovered')?.value),
            exchangeRate: safeNumber($('ExchangeRate')?.value),
            creditOfficer: ($('CreditOfficer')?.value || '').trim(),
            remarks: ($('Remarks')?.value || '').trim(),
            recoveredChargeOff: $('RecoveredChargeOff')?.checked || false,
            recoveredForfeit: $('RecoveredForfeit')?.checked || false
        };
    }

    // =========================================================================
    // Validation
    // =========================================================================
    function validateRequiredForView() {
        const v = (id) => String($(id)?.value || '').trim();
        const missing = (msg, focusId) => ({ ok: false, message: msg, focusId });

        if (!v('CenterId')) return missing('Center ID is required', 'CenterId');
        if (!v('CenterName')) return missing('Center Name is required', 'CenterId');
        if (!v('GroupId')) return missing('Group ID is required', 'GroupId');
        if (!v('GroupName')) return missing('Group Name is required', 'GroupId');
        if (!v('ClientId')) return missing('Client ID is required', 'ClientId');
        if (!v('ClientName')) return missing('Client Name is required', 'ClientId');

        return { ok: true };
    }

    // =========================================================================
    // Action Handlers
    // =========================================================================
    async function handleView() {
        const validation = validateRequiredForView();
        if (!validation.ok) {
            showWarning(validation.message);
            if (validation.focusId) $(validation.focusId)?.focus();
            return;
        }

        const centerId = ($('CenterId')?.value || '').trim();
        const groupId = ($('GroupId')?.value || '').trim();
        const clientId = ($('ClientId')?.value || '').trim();

        try {
            showInfo('Loading forfeit recovery details...');
            const { ourBranchID, operatorID } = getEnv();
            const result = await invokeForfeitRecoveryController('old-api', {
                FormId: 'p_GetForfeitRecoveryTrx',
                RequestData: {
                    OurBranchID: ourBranchID,
                    GroupID: centerId,
                    SubGroupID: groupId,
                    ClientID: clientId,
                    RefID: '',
                    OperatorID: operatorID
                }
            });

            const apiErr = extractOldApiError(result);
            if (apiErr) {
                showWarning(apiErr.message);
                return;
            }

            const didBind = tryApplyApiToForm(result);
            if (!didBind) {
                showWarning('No records returned for the given parameters.');
                return;
            }

            currentData = { clientId, api: result };
            setEditMode(false);
            setIdentityDisabled(true);
            enableActionButtons();

            const btnView = $('btnView');
            if (btnView) btnView.disabled = true;

            showSuccess('Forfeit recovery details loaded.');
        } catch (e) {
            console.error('[ForfeitRecovery] View failed:', e);
            showError(e?.message || 'Failed to load forfeit recovery details');
        }
    }

    function handleAdd() {
        setEditMode(true);
        setIdentityDisabled(true);

        const btnAdd = $('btnAdd');
        const btnSave = $('btnSave');
        const btnCancel = $('btnCancel');
        if (btnAdd) btnAdd.disabled = true;
        if (btnSave) btnSave.disabled = false;
        if (btnCancel) btnCancel.disabled = false;

        showInfo('Add mode enabled - enter forfeit recovery details');
    }

    async function handleSave() {
        const formData = getFormData();
        if (!formData.clientId) {
            showError('Client ID required');
            return;
        }

        try {
            showInfo('Saving forfeit recovery...');
            const { ourBranchID, operatorID } = getEnv();
            const result = await invokeForfeitRecoveryController('old-api', {
                FormId: 'p_AddForfeitRecoveryTrx',
                RequestData: {
                    OurBranchID: ourBranchID,
                    GroupID: formData.centerId,
                    SubGroupID: formData.groupId,
                    ClientID: formData.clientId,
                    AmountRecovered: formData.amountRecovered,
                    ExchangeRate: formData.exchangeRate,
                    CreditOfficerID: formData.creditOfficer,
                    Remarks: formData.remarks,
                    RecoveredAgainstChargeOff: formData.recoveredChargeOff ? '1' : '0',
                    RecoveredAgainstForfeit: formData.recoveredForfeit ? '1' : '0',
                    OperatorID: operatorID
                }
            });

            const apiErr = extractOldApiError(result);
            if (apiErr) {
                showError(apiErr.message);
                return;
            }

            setEditMode(false);
            showSuccess('Forfeit recovery saved successfully');
        } catch (e) {
            console.error('[ForfeitRecovery] Save failed:', e);
            showError(e?.message || 'Failed to save forfeit recovery');
        }
    }

    function handleContinue() {
        if (!currentData) {
            showError('Load client data first');
            return;
        }
        showInfo('Proceeding to next step');
    }

    function handleCancel() {
        clearForm();

        // Re-enable identity fields
        ['CenterId', 'GroupId', 'ClientId'].forEach(id => {
            const el = $(id);
            if (el) el.disabled = false;
        });
        document.querySelectorAll('[data-fr-lookup]').forEach(btn => { btn.disabled = false; });

        const btnView = $('btnView');
        if (btnView) btnView.disabled = false;

        setEditMode(false);
        disableActionButtons();
        currentData = null;

        showInfo('Cancelled');
    }

    // =========================================================================
    // Field Event Helpers
    // =========================================================================
    function setupFieldListeners(fieldId, handler) {
        const field = $(fieldId);
        if (!field) return;

        field.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handler();
            }
        });

        field.addEventListener('blur', () => {
            const value = field.value.trim();
            if (value) handler();
        });
    }

    // =========================================================================
    // Initialization
    // =========================================================================
    function init() {
        // Search button listeners
        document.querySelectorAll('[data-fr-lookup]').forEach(btn => {
            btn.addEventListener('click', () => {
                const lookupType = btn.getAttribute('data-fr-lookup');
                openSearchDialog(lookupType);
            });
        });

        // Action button listeners
        document.querySelectorAll('[data-fr-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-fr-action');
                switch (action) {
                    case 'view': handleView(); break;
                    case 'add': handleAdd(); break;
                    case 'save': handleSave(); break;
                    case 'cancel': handleCancel(); break;
                }
            });
        });

        // Continue button
        const btnContinue = $('btnContinue');
        if (btnContinue) btnContinue.addEventListener('click', handleContinue);

        // Field validation on enter/blur
        setupFieldListeners('CenterId', handleViewCenter);
        setupFieldListeners('GroupId', handleViewGroup);
        setupFieldListeners('ClientId', handleViewClient);
        setupFieldListeners('CreditOfficer', handleViewOfficer);

        // Initial state
        disableActionButtons();
        setEditMode(false);
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
