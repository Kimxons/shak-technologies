/**
 * Savings Refund Module
 * Handles center, group, client search with savings refund operations
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
    async function invokeSavingsRefundController(action, requestData) {
        const appCore = getAppCore();
        if (!appCore || typeof appCore.invokeControllerAsync !== 'function') {
            throw new Error('AppCore is not available (AppCore.invokeControllerAsync not found)');
        }

        const endpoint = `MicroFinance/SavingsRefund/${action}`;
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
            clearExitHistory();
            showSuccess(`Center '${centerName}' selected`);
        } else if (lookupType === 'group') {
            const groupId = data.SubGroupID || data.GroupID || data.ID || '';
            const groupName = data.SubGroupName || data.GroupName || data.Description || data.Name || '';
            if (idField) idField.value = groupId;
            if (nameField) nameField.value = groupName;
            clearClientFields();
            clearExitHistory();
            showSuccess(`Group '${groupName}' selected`);
        } else if (lookupType === 'client') {
            const clientId = data.GroupExitedClientID || data.ClientID || data.ID || '';
            const clientName = data.GroupExitedClientName || data.ClientName || data.Name || data.Description || '';
            if (idField) idField.value = clientId;
            if (nameField) nameField.value = clientName;

            // Populate exit history if available from search result
            if (data.ExitDate) $('ExitDate').value = data.ExitDate;
            if (data.ExitReason) $('ExitReason').value = data.ExitReason;
            if (data.NextOfKin) $('NextOfKin').value = data.NextOfKin;
            if (data.UnclaimedAmount != null) $('UnclaimedAmount').value = data.UnclaimedAmount;
            if (data.OsUnclaimed != null) $('OsUnclaimed').value = data.OsUnclaimed;

            showSuccess(`Client '${clientName}' selected`);
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

    function clearExitHistory() {
        if ($('ExitDate')) $('ExitDate').value = '';
        if ($('ExitReason')) $('ExitReason').value = '';
        if ($('NextOfKin')) $('NextOfKin').value = '';
        if ($('UnclaimedAmount')) $('UnclaimedAmount').value = '';
        if ($('OsUnclaimed')) $('OsUnclaimed').value = '';
    }

    function clearTransactionDetails() {
        if ($('TransactionType')) $('TransactionType').value = '';
        if ($('AccountType')) $('AccountType').value = '';
        if ($('AccountId')) $('AccountId').value = '';
        if ($('AccountName')) $('AccountName').value = '';
        if ($('Narration')) $('Narration').value = '';
        if ($('TransactionAmount')) $('TransactionAmount').value = '';
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
    // ID Validation Handlers (via OldAPI p_GetIDDescription)
    // =========================================================================
    async function handleViewCenter() {
        const centerId = ($('CenterId')?.value || '').trim();
        if (!centerId) { showWarning('Please enter a Center ID'); return; }

        try {
            showInfo('Loading center details...');
            const { ourBranchID, bankID } = getEnv();
            const result = await invokeSavingsRefundController('old-api', {
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
                clearExitHistory();
                showSuccess(`Center '${center.GroupName || center.Description}' loaded`);
            } else {
                showWarning('Center not found');
            }
        } catch (error) {
            console.error('[SavingsRefund] Error loading center:', error);
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
            const result = await invokeSavingsRefundController('old-api', {
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
                clearExitHistory();
                showSuccess(`Group '${group.SubGroupName || group.Description}' loaded`);
            } else {
                showWarning('Group not found');
            }
        } catch (error) {
            console.error('[SavingsRefund] Error loading group:', error);
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
            const result = await invokeSavingsRefundController('old-api', {
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
                showSuccess('Client loaded');
            } else {
                showWarning('Exited client not found');
            }
        } catch (error) {
            console.error('[SavingsRefund] Error loading client:', error);
            showError('Error loading client details');
        }
    }

    // =========================================================================
    // Transaction Type Change Handler
    // =========================================================================
    function handleTransactionTypeChange() {
        const type = $('TransactionType')?.value || '';
        const accountType = $('AccountType');
        const accountId = $('AccountId');
        const accountBtn = document.querySelector('[data-sr-lookup="account"]');

        if (type === 'transfer') {
            if (accountType) accountType.disabled = false;
            if (accountId) accountId.readOnly = false;
            if (accountBtn) accountBtn.disabled = false;
        } else {
            if (accountType) accountType.disabled = true;
            if (accountId) accountId.readOnly = true;
            if (accountBtn) accountBtn.disabled = true;
        }
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

        // Bind client details
        $('CenterId').value = coerceString(m.centerid ?? m.groupid ?? $('CenterId').value);
        $('CenterName').value = coerceString(m.centername ?? m.groupname ?? $('CenterName').value);
        $('GroupId').value = coerceString(m.groupid ?? m.subgroupid ?? $('GroupId').value);
        $('GroupName').value = coerceString(m.groupname ?? m.subgroupname ?? $('GroupName').value);
        $('ClientId').value = coerceString(m.clientid ?? $('ClientId').value);
        $('ClientName').value = coerceString(m.clientname ?? m.customername ?? m.name ?? $('ClientName').value);

        // Bind exit history
        $('ExitDate').value = coerceString(m.exitdate ?? '');
        $('ExitReason').value = coerceString(m.exitreason ?? '');
        $('NextOfKin').value = coerceString(m.nextofkin ?? '');
        $('UnclaimedAmount').value = m.unclaimedamount ?? '';
        $('OsUnclaimed').value = m.osunclaimed ?? m.osunclaimedamount ?? '';

        // Bind transaction details
        $('TransactionType').value = coerceString(m.transactiontype ?? m.trxtype ?? '');
        $('AccountType').value = coerceString(m.accounttype ?? m.accounttypeid ?? '');
        $('AccountId').value = coerceString(m.accountid ?? '');
        $('AccountName').value = coerceString(m.accountname ?? '');
        $('Narration').value = coerceString(m.narration ?? '');
        $('TransactionAmount').value = m.transactionamount ?? m.amount ?? '';

        return true;
    }

    // =========================================================================
    // Edit Mode & Button State
    // =========================================================================
    function setEditMode(enabled) {
        editMode = Boolean(enabled);

        // Transaction details become editable in edit mode
        const editableIds = ['Narration', 'TransactionAmount'];
        editableIds.forEach(id => {
            const el = $(id);
            if (el) el.readOnly = !editMode;
        });

        // Selects
        const transType = $('TransactionType');
        if (transType) transType.disabled = !editMode;

        // Account type depends on transaction type
        if (editMode) {
            handleTransactionTypeChange();
        } else {
            const accountType = $('AccountType');
            if (accountType) accountType.disabled = true;
            const accountId = $('AccountId');
            if (accountId) accountId.readOnly = true;
            const accountBtn = document.querySelector('[data-sr-lookup="account"]');
            if (accountBtn) accountBtn.disabled = true;
        }

        const btnSave = $('btnSave');
        if (btnSave) btnSave.disabled = !editMode;
    }

    function setIdentityDisabled(disabled) {
        ['CenterId', 'GroupId', 'ClientId'].forEach(id => {
            const el = $(id);
            if (el) el.disabled = Boolean(disabled);
        });
        document.querySelectorAll('[data-sr-lookup="center"], [data-sr-lookup="group"], [data-sr-lookup="client"]').forEach(btn => {
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
            'CenterId', 'CenterName', 'GroupId', 'GroupName', 'ClientId', 'ClientName'
        ].forEach(id => {
            const el = $(id);
            if (el) el.value = '';
        });

        clearExitHistory();
        clearTransactionDetails();
        currentData = null;
    }

    function getFormData() {
        return {
            centerId: ($('CenterId')?.value || '').trim(),
            groupId: ($('GroupId')?.value || '').trim(),
            clientId: ($('ClientId')?.value || '').trim(),
            transactionType: ($('TransactionType')?.value || '').trim(),
            accountType: ($('AccountType')?.value || '').trim(),
            accountId: ($('AccountId')?.value || '').trim(),
            narration: ($('Narration')?.value || '').trim(),
            transactionAmount: safeNumber($('TransactionAmount')?.value)
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
            showInfo('Loading savings refund details...');
            const { ourBranchID, operatorID } = getEnv();
            const result = await invokeSavingsRefundController('old-api', {
                FormId: 'p_GetSavingsRefundTrx',
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

            showSuccess('Savings refund details loaded.');
        } catch (e) {
            console.error('[SavingsRefund] View failed:', e);
            showError(e?.message || 'Failed to load savings refund details');
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

        showInfo('Add mode enabled - enter transaction details');
    }

    async function handleSave() {
        const formData = getFormData();
        if (!formData.clientId) {
            showError('Client ID required');
            return;
        }

        try {
            showInfo('Saving savings refund...');
            const { ourBranchID, operatorID } = getEnv();
            const result = await invokeSavingsRefundController('old-api', {
                FormId: 'p_AddSavingsRefundTrx',
                RequestData: {
                    OurBranchID: ourBranchID,
                    GroupID: formData.centerId,
                    SubGroupID: formData.groupId,
                    ClientID: formData.clientId,
                    TransactionType: formData.transactionType,
                    AccountType: formData.accountType,
                    AccountID: formData.accountId,
                    Narration: formData.narration,
                    TransactionAmount: formData.transactionAmount,
                    OperatorID: operatorID
                }
            });

            const apiErr = extractOldApiError(result);
            if (apiErr) {
                showError(apiErr.message);
                return;
            }

            setEditMode(false);
            showSuccess('Savings refund saved successfully');
        } catch (e) {
            console.error('[SavingsRefund] Save failed:', e);
            showError(e?.message || 'Failed to save savings refund');
        }
    }

    function handleCancel() {
        clearForm();

        // Re-enable identity fields
        ['CenterId', 'GroupId', 'ClientId'].forEach(id => {
            const el = $(id);
            if (el) el.disabled = false;
        });
        document.querySelectorAll('[data-sr-lookup]').forEach(btn => { btn.disabled = false; });

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
        document.querySelectorAll('[data-sr-lookup]').forEach(btn => {
            btn.addEventListener('click', () => {
                const lookupType = btn.getAttribute('data-sr-lookup');
                if (lookupType === 'account') {
                    showInfo('Account search - to be implemented');
                    return;
                }
                openSearchDialog(lookupType);
            });
        });

        // Action button listeners
        document.querySelectorAll('[data-sr-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-sr-action');
                switch (action) {
                    case 'view': handleView(); break;
                    case 'add': handleAdd(); break;
                    case 'save': handleSave(); break;
                    case 'cancel': handleCancel(); break;
                    case 'identification': showInfo('Identification - to be implemented'); break;
                }
            });
        });

        // Transaction type change handler
        const transType = $('TransactionType');
        if (transType) transType.addEventListener('change', handleTransactionTypeChange);

        // Field validation on enter/blur
        setupFieldListeners('CenterId', handleViewCenter);
        setupFieldListeners('GroupId', handleViewGroup);
        setupFieldListeners('ClientId', handleViewClient);

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
