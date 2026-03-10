/**
 * Exit Process Module
 * Handles client exit details, transactions, forfeits, and portfolio
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
    async function invokeExitProcessController(action, requestData) {
        const appCore = getAppCore();
        if (!appCore || typeof appCore.invokeControllerAsync !== 'function') {
            throw new Error('AppCore is not available (AppCore.invokeControllerAsync not found)');
        }

        const endpoint = `MicroFinance/ExitProcess/${action}`;
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
        const ourBranchID = e.branchID || e.branchId || e.OurBranchID || e.defaultOurBranchId ||
            sessionStorage.getItem('BranchID') || sessionStorage.getItem('OurBranchID') || localStorage.getItem('BranchID') || '0101';
        const operatorID = e.operatorID || e.operatorId ||
            sessionStorage.getItem('OperatorID') || sessionStorage.getItem('operatorId') || localStorage.getItem('OperatorID') || 'CSADM';
        return { bankID, ourBranchID, operatorID };
    }

    function getOurBranchName() {
        return window.Environment?.OurBranchName || window.Environment?.defaultOurBranchName ||
            sessionStorage.getItem('OurBranchName') || sessionStorage.getItem('branchName') || '';
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

    function coerceNumberOrBlank(v) {
        if (v === undefined || v === null || v === '') return '';
        const n = Number(v);
        return Number.isFinite(n) ? String(n) : '';
    }

    // =========================================================================
    // Toast Notifications
    // =========================================================================
    function ensureToastContainer() {
        let el = document.querySelector('[data-kairo-toast-container]');
        if (!el) el = document.getElementById('toastContainer');
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

    function hideStatus() {
        const el = $('statusMsg');
        if (el) el.classList.add('hidden');
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
            moduleIDOverride: Number(DEFAULT_SEARCH_MODULE_ID),
            getAdvFilterString: () => {
                const { bankID } = getEnv();
                const safeBankId = String(bankID || '').replace(/'/g, "''");
                return `BankID ='${safeBankId}'`;
            },
            searchFields: [
                { name: 'branchId', label: 'Branch ID', column: 'OurBranchID' },
                { name: 'branchName', label: 'Branch Name', column: 'BranchName' }
            ],
            displayFields: [
                { key: 'OurBranchID', label: 'Branch ID' },
                { key: 'BranchName', label: 'Branch Name' }
            ]
        },
        'center': {
            title: 'Center Search',
            targetId: 'CenterId',
            targetName: 'CenterName',
            tableID: 'GroupID',
            moduleIDOverride: 5060,
            getAdvFilterString: () => {
                const branchId = $('BranchId')?.value?.trim() || '';
                const safeBranchId = String(branchId).replace(/'/g, "''");
                return safeBranchId ? `OurBranchID ='${safeBranchId}' AND GroupStatusID='A'` : "GroupStatusID='A'";
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
                const branchId = $('BranchId')?.value?.trim() || '';
                const centerId = $('CenterId')?.value?.trim() || '';
                const safeBranchId = String(branchId).replace(/'/g, "''");
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
            title: 'Client Search',
            targetId: 'ClientId',
            targetName: 'ClientName',
            tableID: 'GroupClientID',
            moduleIDOverride: 5060,
            getAdvFilterString: () => {
                const branchId = $('BranchId')?.value?.trim() || '';
                const centerId = $('CenterId')?.value?.trim() || '';
                const groupId = $('GroupId')?.value?.trim() || '';
                const safeBranchId = String(branchId).replace(/'/g, "''");
                const safeCenterId = String(centerId).replace(/'/g, "''");
                const safeGroupId = String(groupId).replace(/'/g, "''");
                const parts = [];
                if (safeBranchId) parts.push(`OurBranchID='${safeBranchId}'`);
                if (safeCenterId) parts.push(`GroupID='${safeCenterId}'`);
                if (safeGroupId) parts.push(`SubGroupID='${safeGroupId}'`);
                return parts.join(' AND ');
            },
            searchFields: [
                { name: 'clientId', label: 'Client ID', column: 'ClientID' },
                { name: 'clientName', label: 'Client Name', column: 'Name' }
            ],
            displayFields: [
                { key: 'ClientID', label: 'Client ID' },
                { key: 'Name', label: 'Client Name' }
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
            clearCenterFields();
            clearGroupFields();
            clearClientFields();
            showSuccess(`Branch '${branchName}' selected`);
        } else if (lookupType === 'center') {
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
            const clientId = data.ClientID || data.GroupClientID || data.ID || '';
            const clientName = data.Name || data.ClientName || data.CustomerName || data.Description || '';
            if (idField) idField.value = clientId;
            if (nameField) nameField.value = clientName;
            showSuccess(`Client '${clientName}' selected`);
        }
    }

    function openSearchDialog(lookupType) {
        const config = searchDialogConfig[lookupType];
        if (!config) { showWarning(`Unknown lookup type: ${lookupType}`); return; }

        if (lookupType === 'center') {
            if (!$('BranchId')?.value?.trim()) { showWarning('Please select a Branch first'); return; }
        }
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

    function pickValue(row, keys) {
        const map = normalizeRowKeyMap(row);
        for (const key of keys) {
            const v = map[String(key).toLowerCase()];
            if (v !== undefined && v !== null) return v;
        }
        return undefined;
    }

    function collectDetailDatasets(root) {
        const datasets = [];
        const seen = new Set();
        const push = (arr) => { if (Array.isArray(arr) && !seen.has(arr)) { seen.add(arr); datasets.push(arr); } };

        push(Array.isArray(root) ? root : null);
        if (root && typeof root === 'object') {
            Object.keys(root).forEach(k => { if (/^Details(\d+)?$/i.test(k)) push(root[k]); });
        }
        if (root && typeof root === 'object' && Array.isArray(root.Details) && root.Details.length === 1) {
            const inner = root.Details[0];
            if (inner && typeof inner === 'object') {
                Object.keys(inner).forEach(k => { if (/^Details(\d+)?$/i.test(k)) push(inner[k]); });
                if (Array.isArray(inner.Details)) push(inner.Details);
            }
        }
        return datasets;
    }

    function epExtractDetailsArray(resp) {
        const root = resp?.data ?? resp;
        const direct = root?.Details ?? root?.details;
        if (Array.isArray(direct)) return direct;
        const datasets = collectDetailDatasets(root);
        const match = datasets.find(arr => Array.isArray(arr) && arr.some(r => r && typeof r === 'object'));
        return Array.isArray(match) ? match : [];
    }

    function findFirstRowWithKeys(root, candidateKeys) {
        const keysLower = candidateKeys.map(k => String(k).toLowerCase());
        const datasets = collectDetailDatasets(root);
        for (const d of datasets) {
            for (const row of d) {
                if (!row || typeof row !== 'object') continue;
                const m = normalizeRowKeyMap(row);
                if (keysLower.some(k => m[k] !== undefined && m[k] !== null && String(m[k]).trim() !== '')) return row;
            }
        }
        return null;
    }

    function composeClientNameFromRows({ nameRow, personRow } = {}) {
        const direct = coerceString(pickValue(nameRow, ['ClientName', 'CustomerName', 'Name']));
        if (direct) return direct;
        const first = coerceString(pickValue(personRow, ['FirstName']));
        const middle = coerceString(pickValue(personRow, ['MiddleName']));
        const last = coerceString(pickValue(personRow, ['LastName']));
        const title = coerceString(pickValue(personRow, ['TitleID', 'Title']));
        return [title, first, middle, last].map(s => s.trim()).filter(Boolean).join(' ');
    }

    function looksLikeHeaderRow(row) {
        if (!row || typeof row !== 'object') return false;
        const m = normalizeRowKeyMap(row);
        return m.clientid !== undefined || m.exitdate !== undefined || m.netpayable !== undefined ||
            m.forfeitsavingsamount !== undefined || m.forfeitsavings !== undefined;
    }

    function epExtractUpdateCount(resp) {
        const root = resp?.data ?? resp;
        const details = root?.Details ?? root?.details;
        const first = Array.isArray(details) ? details[0] : null;
        const raw = first?.UpdateCount ?? first?.updateCount;
        const n = Number(raw);
        return Number.isFinite(n) ? n : 0;
    }

    function epExtractOldApiError(resp) {
        const root = resp?.data ?? resp;
        const status = String(root?.Status ?? root?.status ?? '').trim();
        const message = String(root?.Message ?? root?.message ?? '').trim();
        if (!status) return null;
        if (status === '0' || status === '200') return null;
        return { status, message: message || `Request failed (Status ${status})` };
    }

    function epExtractOldApiDetails(resp) {
        const baseRoot = resp?.data ?? resp;
        const rootsToTry = [baseRoot, baseRoot?.data, baseRoot?.Data, baseRoot?.result, baseRoot?.Result].filter(x => x && typeof x === 'object');

        const looksLikeExitTrxRow = (r) => {
            if (!r || typeof r !== 'object') return false;
            const m = normalizeRowKeyMap(r);
            return m.accountid !== undefined || m.accountname !== undefined || m.trxdescription !== undefined || m.amount !== undefined;
        };

        for (const root of rootsToTry) {
            const direct = root?.Details ?? root?.details;
            if (Array.isArray(direct) && direct.some(looksLikeExitTrxRow)) return direct;
            const datasets = collectDetailDatasets(root);
            const match = datasets.find(arr => Array.isArray(arr) && arr.some(looksLikeExitTrxRow));
            if (match) return match;
        }
        return [];
    }

    function epMapExitTrxRowsToGrids(detailsRows, { forfeitSavingsAmount = 0 } = {}) {
        const rows = Array.isArray(detailsRows) ? detailsRows : [];
        const forfeitSavings = safeNumber(forfeitSavingsAmount);
        const shouldShowForfeits = forfeitSavings > 0;

        const normalizeBool = (v) => {
            if (typeof v === 'boolean') return v;
            const s = String(v ?? '').trim().toLowerCase();
            return s === 'true' || s === '1' || s === 'y' || s === 'yes';
        };

        const looksLikeSavingsForfeit = ({ accountName, trxDescription }) => {
            const hay = `${String(accountName || '')} ${String(trxDescription || '')}`.toLowerCase();
            return hay.includes('savings') || hay.includes('compulsory') || hay.includes('voluntary') || hay.includes('interest payable');
        };

        const mapped = rows.map(r => {
            if (!r || typeof r !== 'object') return null;
            const m = normalizeRowKeyMap(r);
            const apiHasFlag = ('IsForfeit' in r || 'isForfeit' in r) || ('isforfeit' in m);
            const apiFlag = apiHasFlag ? normalizeBool(m.isforfeit ?? r.IsForfeit ?? r.isForfeit) : null;
            const accountId = m.accountid ?? '';
            const accountName = m.accountname ?? '';
            const trxDescription = m.trxdescription ?? m.description ?? '';
            const trxType = m.trxtypeid ?? m.transactiontype ?? '';
            const accountType = m.accounttypeid ?? m.accounttype ?? '';
            const amount = m.amount ?? '';

            let isForfeit = false;
            if (shouldShowForfeits) {
                isForfeit = apiFlag !== null ? apiFlag : looksLikeSavingsForfeit({ accountName, trxDescription });
            }

            return {
                isForfeit,
                accountsRow: { accountId, accountName, amount, trxDescription },
                forfeitRow: { accountType, accountId, description: trxDescription || accountName, transactionType: trxType, amount }
            };
        }).filter(Boolean);

        const forfeitRows = shouldShowForfeits ? mapped.filter(x => x.isForfeit).map(x => x.forfeitRow) : [];
        const trxRows = mapped.filter(x => !x.isForfeit).map(x => x.accountsRow);
        return { trxRows, forfeitRows };
    }

    // =========================================================================
    // Form Bind from API Response
    // =========================================================================
    function tryApplyApiToFormPayload(payload) {
        if (!payload) return false;
        const root = payload.data ?? payload;
        const datasets = collectDetailDatasets(root);

        let headerRow = null;
        for (const d of datasets) {
            const row = d.find(looksLikeHeaderRow);
            if (row) { headerRow = row; break; }
        }

        const fallbackNameRow = findFirstRowWithKeys(root, ['ClientName', 'CustomerName', 'Name']);
        const fallbackPersonRow = findFirstRowWithKeys(root, ['FirstName', 'MiddleName', 'LastName', 'TitleID']);
        const fallbackGroupRow = findFirstRowWithKeys(root, ['GroupID', 'GroupName', 'SubGroupID']);

        let didBindAny = false;
        if (headerRow) {
            didBindAny = true;
            $('CenterId').value = coerceString(pickValue(headerRow, ['CenterID', 'CenterId']) ?? $('CenterId').value);
            $('CenterName').value = coerceString(pickValue(headerRow, ['CenterName', 'CenterDescription']) ?? $('CenterName').value);
            $('GroupId').value = coerceString(pickValue(headerRow, ['GroupID', 'GroupId']) ?? $('GroupId').value);
            $('GroupName').value = coerceString(pickValue(headerRow, ['GroupName', 'GroupDescription']) ?? $('GroupName').value);
            $('ClientId').value = coerceString(pickValue(headerRow, ['ClientID', 'ClientId']) ?? $('ClientId').value);
            $('ClientName').value = coerceString(pickValue(headerRow, ['ClientName', 'CustomerName', 'Name']) ?? $('ClientName').value);

            const exitType = pickValue(headerRow, ['ExitTypeID', 'ExitTypeId', 'ExitReason', 'ExitReasonID']);
            if (exitType !== undefined) $('ExitReason').value = coerceString(exitType);
            const exitDate = pickValue(headerRow, ['ExitDate', 'ExitDateValue', 'DateOfExit']);
            if (exitDate !== undefined) $('ExitDate').value = coerceString(exitDate).slice(0, 10);

            $('TotalRecoverable').value = coerceNumberOrBlank(pickValue(headerRow, ['TotalRecoverable']));
            $('TotalPayable').value = coerceNumberOrBlank(pickValue(headerRow, ['TotalPayable']));
            $('ForfeitSavings').value = coerceNumberOrBlank(pickValue(headerRow, ['ForfeitSavingsAmount', 'ForfeitSavings']));
            $('ForfeitCollateral').value = coerceNumberOrBlank(pickValue(headerRow, ['ForfeitCollateralsAmount', 'ForfeitCollateralAmount', 'ForfeitCollateral']));
            $('ChargeOffLoss').value = coerceNumberOrBlank(pickValue(headerRow, ['ChargeOffLossAmount', 'ChargeOffLoss', 'ChargeOffLoan']));
            $('ChargeOffInsurance').value = coerceNumberOrBlank(pickValue(headerRow, ['ChargeOffInsuranceAmount', 'ChargeOffInsurance']));
            $('NetPayable').value = coerceNumberOrBlank(pickValue(headerRow, ['NetPayable']));
            $('NetReceivable').value = coerceNumberOrBlank(pickValue(headerRow, ['NetReceivable']));

            $('PrimaryCollateral').value = coerceNumberOrBlank(pickValue(headerRow, ['PrimaryCollateral', 'PrimaryCollateralAmount']));
            $('SecondaryCollateral').value = coerceNumberOrBlank(pickValue(headerRow, ['SecondaryCollateral', 'SecondaryCollateralAmount']));
            $('AdditionalCollateral').value = coerceNumberOrBlank(pickValue(headerRow, ['AdditionalCollateral', 'AdditionalCollateralAmount']));
            $('CreditInterest').value = coerceNumberOrBlank(pickValue(headerRow, ['CreditInterest', 'CreditInterestAmount']));
            $('Tax').value = coerceNumberOrBlank(pickValue(headerRow, ['TaxOnCreditInterest', 'Tax', 'TaxAmount']));
            $('DebitInterest').value = coerceNumberOrBlank(pickValue(headerRow, ['DebitInterest', 'DebitInterestAmount']));
            $('LoanBalance').value = coerceNumberOrBlank(pickValue(headerRow, ['LoanBalance', 'DebitLoanBalance']));
        }

        if (!$('ClientName').value.trim()) {
            const name = composeClientNameFromRows({ nameRow: fallbackNameRow, personRow: fallbackPersonRow });
            if (name) { $('ClientName').value = name; didBindAny = true; }
        }

        if (fallbackGroupRow) {
            if (!$('CenterId').value.trim()) {
                const v = coerceString(pickValue(fallbackGroupRow, ['GroupID', 'GroupId', 'CenterID', 'CenterId']));
                if (v) { $('CenterId').value = v; didBindAny = true; }
            }
            if (!$('CenterName').value.trim()) {
                const v = coerceString(pickValue(fallbackGroupRow, ['GroupName', 'GroupDescription', 'CenterName']));
                if (v) { $('CenterName').value = v; didBindAny = true; }
            }
            if (!$('GroupId').value.trim()) {
                const v = coerceString(pickValue(fallbackGroupRow, ['SubGroupID', 'SubGroupId']));
                if (v) { $('GroupId').value = v; didBindAny = true; }
            }
            if (!$('GroupName').value.trim()) {
                const v = coerceString(pickValue(fallbackGroupRow, ['SubGroupName', 'SubGroupDescription']));
                if (v) { $('GroupName').value = v; didBindAny = true; }
            }
        }

        // Bind accounts/forfeits datasets
        const looksLikeAccountsRow = (r) => {
            if (!r || typeof r !== 'object') return false;
            const m = normalizeRowKeyMap(r);
            return m.accountid !== undefined || m.accountname !== undefined || m.trxdescription !== undefined;
        };

        for (const arr of datasets) {
            if (arr.some(looksLikeAccountsRow)) {
                didBindAny = true;
                renderAccounts(arr.map(r => {
                    const m = normalizeRowKeyMap(r);
                    return { accountId: m.accountid ?? '', accountName: m.accountname ?? '', amount: m.amount ?? '', trxDescription: m.trxdescription ?? '' };
                }));
                break;
            }
        }

        return didBindAny;
    }

    // =========================================================================
    // Rendering
    // =========================================================================
    function renderAccounts(rows) {
        const body = $('accountsBody');
        if (!body) return;
        const items = Array.isArray(rows) ? rows : [];
        body.innerHTML = '';

        if (items.length === 0) {
            body.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No records to display.</td></tr>';
            return;
        }

        items.forEach(r => {
            const tr = document.createElement('tr');
            ['accountId', 'accountName', 'amount', 'trxDescription'].forEach(k => {
                const td = document.createElement('td');
                if (k === 'amount') td.className = 'text-end';
                td.textContent = r?.[k] ?? '';
                tr.appendChild(td);
            });
            body.appendChild(tr);
        });
    }

    function renderForfeits(rows) {
        const body = $('forfeitBody');
        if (!body) return;
        const items = Array.isArray(rows) ? rows : [];
        body.innerHTML = '';

        if (items.length === 0) {
            body.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No records to display.</td></tr>';
            if ($('TotalForfeitAmount')) $('TotalForfeitAmount').value = '';
            return;
        }

        let total = 0;
        items.forEach(r => {
            const tr = document.createElement('tr');
            ['accountType', 'accountId', 'description', 'transactionType', 'amount'].forEach(k => {
                const td = document.createElement('td');
                if (k === 'amount') td.className = 'text-end';
                td.textContent = r?.[k] ?? '';
                tr.appendChild(td);
            });
            body.appendChild(tr);
            total += safeNumber(r?.amount);
        });

        if ($('TotalForfeitAmount')) $('TotalForfeitAmount').value = String(total);
    }

    // =========================================================================
    // Edit Mode & Button State
    // =========================================================================
    function setEditMode(enabled) {
        editMode = Boolean(enabled);
        const editableIds = [
            'ExitReason', 'ExitDate', 'TotalRecoverable', 'TotalPayable', 'ForfeitSavings',
            'ForfeitCollateral', 'ChargeOffLoss', 'ChargeOffInsurance', 'NetPayable', 'NetReceivable',
            'PrimaryCollateral', 'CreditInterest', 'Tax', 'SecondaryCollateral', 'AdditionalCollateral',
            'LoanBalance', 'DebitInterest', 'Others', 'NetBalance'
        ];
        editableIds.forEach(id => {
            const el = $(id);
            if (el) el.disabled = !editMode;
        });
        const btnSave = $('btnSave');
        if (btnSave) btnSave.disabled = !editMode;
    }

    function setIdentityDisabled(disabled) {
        ['BranchId', 'CenterId', 'GroupId', 'ClientId', 'ExitReason'].forEach(id => {
            const el = $(id);
            if (el) el.disabled = Boolean(disabled);
        });
        document.querySelectorAll('[data-ep-lookup]').forEach(btn => { btn.disabled = Boolean(disabled); });
    }

    function applyButtonStateAfterView(updateCount) {
        const btnView = $('btnView');
        const btnAdd = $('btnAdd');
        const btnSave = $('btnSave');
        const btnPrint = $('btnPrint');

        if (btnView) btnView.disabled = true;
        if (btnSave) btnSave.disabled = true;
        if (btnAdd) btnAdd.hidden = false;

        if (updateCount <= 0) {
            if (btnAdd) btnAdd.disabled = false;
            if (btnPrint) btnPrint.disabled = true;
        } else {
            if (btnAdd) btnAdd.disabled = true;
            if (btnPrint) btnPrint.disabled = false;
        }
    }

    // =========================================================================
    // Form Operations
    // =========================================================================
    function clearForm() {
        [
            'CenterId', 'CenterName', 'GroupId', 'GroupName', 'ClientId', 'ClientName',
            'ExitReason', 'ExitDate', 'TotalRecoverable', 'TotalPayable', 'ForfeitSavings',
            'ForfeitCollateral', 'ChargeOffLoss', 'ChargeOffInsurance', 'NetPayable', 'NetReceivable',
            'TotalForfeitAmount', 'PrimaryCollateral', 'CreditInterest', 'Tax', 'SecondaryCollateral',
            'AdditionalCollateral', 'LoanBalance', 'DebitInterest', 'Others', 'NetBalance'
        ].forEach(id => {
            const el = $(id);
            if (el) el.value = '';
        });
        renderAccounts([]);
        renderForfeits([]);
    }

    function getFormData() {
        return {
            branchId: ($('BranchId')?.value || '').trim(),
            centerId: ($('CenterId')?.value || '').trim(),
            groupId: ($('GroupId')?.value || '').trim(),
            clientId: ($('ClientId')?.value || '').trim(),
            exitReason: ($('ExitReason')?.value || '').trim(),
            exitDate: ($('ExitDate')?.value || '').trim(),
            totalRecoverable: safeNumber($('TotalRecoverable')?.value),
            totalPayable: safeNumber($('TotalPayable')?.value),
            forfeitSavings: safeNumber($('ForfeitSavings')?.value),
            forfeitCollateral: safeNumber($('ForfeitCollateral')?.value),
            chargeOffLoss: safeNumber($('ChargeOffLoss')?.value),
            chargeOffInsurance: safeNumber($('ChargeOffInsurance')?.value),
            netPayable: safeNumber($('NetPayable')?.value),
            netReceivable: safeNumber($('NetReceivable')?.value)
        };
    }

    // =========================================================================
    // Validation
    // =========================================================================
    function validateRequiredForView() {
        const v = (id) => String($(id)?.value || '').trim();
        const missing = (msg, focusId) => ({ ok: false, message: msg, focusId });

        if (!v('BranchId')) return missing('Branch ID is required', 'BranchId');
        if (!v('BranchName')) return missing('Branch Name is required', 'BranchId');
        if (!v('CenterId')) return missing('Center ID is required', 'CenterId');
        if (!v('CenterName')) return missing('Center Name is required', 'CenterId');
        if (!v('GroupId')) return missing('Group ID is required', 'GroupId');
        if (!v('GroupName')) return missing('Group Name is required', 'GroupId');
        if (!v('ClientId')) return missing('Client ID is required', 'ClientId');
        if (!v('ClientName')) return missing('Client Name is required', 'ClientId');
        if (!v('ExitReason')) return missing('Exit Reason is required', 'ExitReason');

        return { ok: true };
    }

    // =========================================================================
    // ID Validation Handlers (via OldAPI)
    // =========================================================================
    async function handleViewBranch() {
        const branchId = ($('BranchId')?.value || '').trim();
        if (!branchId) { showWarning('Please enter a Branch ID'); return; }

        try {
            showInfo('Loading branch details...');
            const result = await invokeExitProcessController('old-api', {
                FormId: 'p_GetIDDescription',
                RequestData: {
                    OurBranchID: branchId,
                    ControlTypeID: 'BranchID',
                    ID: branchId,
                    BankID: getEnv().bankID,
                    TypeID: '',
                    AdvanceFilter: '',
                    LanguageID: 'en'
                }
            });
            const details = result?.Details || result?.data?.Details || [];
            const branch = Array.isArray(details) ? details[0] : details;
            if (branch && (branch.BranchName || branch.Description)) {
                $('BranchName').value = branch.BranchName || branch.Description || '';
                clearAllDependents();
                showSuccess(`Branch '${branch.BranchName || branch.Description}' loaded`);
            } else {
                showWarning('Branch not found');
            }
        } catch (error) {
            console.error('[ExitProcess] Error loading branch:', error);
            showError('Error loading branch details');
        }
    }

    async function handleViewCenter() {
        const centerId = ($('CenterId')?.value || '').trim();
        if (!centerId) { showWarning('Please enter a Center ID'); return; }

        try {
            showInfo('Loading center details...');
            const branchId = ($('BranchId')?.value || '').trim() || getEnv().ourBranchID;
            const result = await invokeExitProcessController('old-api', {
                FormId: 'p_GetIDDescription',
                RequestData: {
                    OurBranchID: branchId,
                    ControlTypeID: 'GroupID',
                    ID: centerId,
                    BankID: getEnv().bankID,
                    TypeID: '',
                    AdvanceFilter: `OurBranchID='${branchId}'`,
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
            console.error('[ExitProcess] Error loading center:', error);
            showError('Error loading center details');
        }
    }

    async function handleViewGroup() {
        const groupId = ($('GroupId')?.value || '').trim();
        if (!groupId) { showWarning('Please enter a Group ID'); return; }

        const branchId = ($('BranchId')?.value || '').trim() || getEnv().ourBranchID;
        const centerId = ($('CenterId')?.value || '').trim();
        if (!centerId) { showWarning('Please select a Center first'); return; }

        try {
            showInfo('Loading group details...');
            const result = await invokeExitProcessController('old-api', {
                FormId: 'p_GetIDDescription',
                RequestData: {
                    OurBranchID: branchId,
                    ControlTypeID: 'SubGroupID',
                    ID: groupId,
                    BankID: getEnv().bankID,
                    TypeID: '',
                    AdvanceFilter: `OurBranchID='${branchId}' AND GroupID='${centerId}'`,
                    LanguageID: 'en'
                }
            });
            const details = result?.Details || result?.data?.Details || [];
            const group = Array.isArray(details) ? details[0] : details;
            if (group && (group.SubGroupName || group.SubGroupID || group.Description)) {
                $('GroupName').value = group.SubGroupName || group.Description || group.SubGroupID || '';
                clearClientFields();
                showSuccess(`Group loaded`);
            } else {
                showWarning('Group not found');
            }
        } catch (error) {
            console.error('[ExitProcess] Error loading group:', error);
            showError('Error loading group details');
        }
    }

    async function handleViewClient() {
        const clientId = ($('ClientId')?.value || '').trim();
        if (!clientId) { showWarning('Please enter a Client ID'); return; }

        const branchId = ($('BranchId')?.value || '').trim() || getEnv().ourBranchID;
        const centerId = ($('CenterId')?.value || '').trim();
        const groupId = ($('GroupId')?.value || '').trim();
        if (!centerId || !groupId) {
            showWarning('Please select Center and Group first');
            return;
        }

        try {
            showInfo('Loading client details...');
            const result = await invokeExitProcessController('old-api', {
                FormId: 'p_GetIDDescription',
                RequestData: {
                    OurBranchID: branchId,
                    ControlTypeID: 'GroupClientActiveID',
                    ID: clientId,
                    BankID: getEnv().bankID,
                    TypeID: '',
                    AdvanceFilter: `OurBranchID='${branchId}' AND GroupID='${centerId}' AND SubGroupID='${groupId}'`,
                    LanguageID: 'en'
                }
            });
            const details = result?.Details || result?.data?.Details || [];
            const client = Array.isArray(details) ? details[0] : details;
            if (client && (client.ClientName || client.CustomerName || client.Name)) {
                $('ClientName').value = client.ClientName || client.CustomerName || client.Name || '';
                showSuccess(`Client loaded`);
            } else {
                showWarning('Client not found');
            }
        } catch (error) {
            console.error('[ExitProcess] Error loading client:', error);
            showError('Error loading client details');
        }
    }

    // =========================================================================
    // Exit Types Dropdown (SearchModal: ExitTypeID)
    // =========================================================================
    async function loadExitTypes() {
        const select = $('ExitReason');
        if (!select || select.dataset.exitTypesLoaded === '1') return;

        const placeholder = select.querySelector('option[value=""]');
        select.innerHTML = '';
        if (placeholder) select.appendChild(placeholder);
        else {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Select Exit Type ID';
            select.appendChild(opt);
        }

        select.disabled = true;

        try {
            const { ourBranchID, operatorID } = getEnv();
            const result = await invokeExitProcessController('old-api', {
                FormId: 'p_GetSearchResult',
                RequestData: {
                    TableID: 'ExitTypeID',
                    WhereStmt: '1=1',
                    AdvFilterString: '',
                    PrevOrNext: '1',
                    RefID: '',
                    OperatorID: operatorID,
                    ModuleID: 1000,
                    OurBranchID: ourBranchID
                }
            });

            const details = result?.Details || result?.data?.Details || [];
            const rows = Array.isArray(details) ? details : [];

            const normalized = rows.map(r => {
                const id = (r.ExitTypeID || r.ID || r.Id || '').toString().trim();
                const desc = (r.Description || r.Name || r.ExitTypeName || '').toString().trim();
                return { id, desc };
            }).filter(x => x.id);

            normalized.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

            if (normalized.length === 0) {
                showWarning('No Exit Types found');
                return;
            }

            for (const x of normalized) {
                const opt = document.createElement('option');
                opt.value = x.id;
                opt.textContent = x.desc ? `${x.id} - ${x.desc}` : x.id;
                select.appendChild(opt);
            }

            select.dataset.exitTypesLoaded = '1';
        } catch (e) {
            console.warn('[ExitProcess] Failed to load Exit Types:', e);
            showWarning(`Failed to load Exit Types: ${e?.message || e}`);
        } finally {
            select.disabled = false;
        }
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

        const branchId = ($('BranchId')?.value || '').trim();
        const centerId = ($('CenterId')?.value || '').trim();
        const groupId = ($('GroupId')?.value || '').trim();
        const clientId = ($('ClientId')?.value || '').trim();
        const exitTypeId = ($('ExitReason')?.value || '').trim();

        try {
            showInfo('Loading exit details...');
            const result = await invokeExitProcessController('old-api', {
                FormId: 'p_GetExitTrx',
                RequestData: {
                    OurBranchID: branchId,
                    GroupID: centerId,
                    SubGroupID: groupId,
                    ClientID: clientId,
                    ExitTypeID: exitTypeId,
                    OperatorID: getEnv().operatorID
                }
            });

            const apiErr = epExtractOldApiError(result);
            if (apiErr) {
                showWarning(apiErr.message);
                return;
            }

            const didBind = tryApplyApiToFormPayload(result);
            if (!didBind) {
                showWarning('No records returned for the given parameters.');
                return;
            }

            currentData = { clientId, api: result };
            setEditMode(false);
            setIdentityDisabled(true);

            const updateCount = epExtractUpdateCount(result);
            applyButtonStateAfterView(updateCount);
            showSuccess('Exit details loaded.');
        } catch (e) {
            console.error('[ExitProcess] View failed:', e);
            showError(e?.message || 'Failed to load exit details');
        }
    }

    async function handleAdd() {
        const validation = validateRequiredForView();
        if (!validation.ok) {
            showWarning(validation.message);
            if (validation.focusId) $(validation.focusId)?.focus();
            return;
        }

        const branchId = ($('BranchId')?.value || '').trim();
        const centerId = ($('CenterId')?.value || '').trim();
        const groupId = ($('GroupId')?.value || '').trim();
        const clientId = ($('ClientId')?.value || '').trim();
        const exitTypeId = ($('ExitReason')?.value || '').trim();

        const getAmount = (id) => safeNumber($(id)?.value);

        try {
            showInfo('Loading exit transactions...');
            const forfeitSavingsAmount = getAmount('ForfeitSavings');

            const result = await invokeExitProcessController('old-api', {
                FormId: 'p_GetExitTrx',
                RequestData: {
                    OurBranchID: branchId,
                    GroupID: centerId,
                    SubGroupID: groupId,
                    ClientID: clientId,
                    RefID: '1',
                    ExitTypeID: exitTypeId,
                    ForfeitSavingsAmount: forfeitSavingsAmount,
                    ForfeitCollateralsAmount: getAmount('ForfeitCollateral'),
                    SecondaryCollateral: getAmount('SecondaryCollateral'),
                    AdditionalCollateral: getAmount('AdditionalCollateral'),
                    CreditInterest: getAmount('CreditInterest'),
                    TaxOnCreditInterest: getAmount('Tax'),
                    DebitInterest: getAmount('DebitInterest'),
                    NetPayable: getAmount('NetPayable'),
                    ChargeOffLossAmount: getAmount('ChargeOffLoss'),
                    ChargeOffInsuranceAmount: getAmount('ChargeOffInsurance')
                }
            });

            const apiErr = epExtractOldApiError(result);
            if (apiErr) {
                showWarning(apiErr.message);
                return;
            }

            const details = epExtractOldApiDetails(result);
            const { trxRows, forfeitRows } = epMapExitTrxRowsToGrids(details, { forfeitSavingsAmount });

            renderAccounts(trxRows);
            renderForfeits(forfeitRows);

            currentData = { clientId, accounts: trxRows, forfeits: forfeitRows, api: result };
            setEditMode(true);
            setIdentityDisabled(true);

            const btnAdd = $('btnAdd');
            const btnSave = $('btnSave');
            const btnCancel = $('btnCancel');
            const btnPrint = $('btnPrint');
            if (btnSave) btnSave.disabled = false;
            if (btnCancel) btnCancel.disabled = false;
            if (btnAdd) btnAdd.disabled = true;
            if (btnPrint) btnPrint.disabled = false;

            showSuccess('Exit transactions loaded.');
        } catch (e) {
            console.error('[ExitProcess] Add failed:', e);
            showError(e?.message || 'Failed to load exit transactions');
        }
    }

    function handleSave() {
        const formData = getFormData();
        if (!formData.clientId) {
            showError('Client ID required');
            return;
        }

        // TODO: Implement save via OldAPI when stored procedure is available
        showWarning('Save functionality - API integration pending');
    }

    function handleCancel() {
        clearForm();

        // Reset branch to logged-in context
        const { ourBranchID } = getEnv();
        const branchName = getOurBranchName();
        if ($('BranchId')) { $('BranchId').value = ourBranchID; }
        if ($('BranchName')) { $('BranchName').value = branchName; }

        // Enable identity fields
        ['BranchId', 'CenterId', 'GroupId', 'ClientId', 'ExitReason'].forEach(id => {
            const el = $(id);
            if (el) el.disabled = false;
        });
        document.querySelectorAll('[data-ep-lookup]').forEach(btn => { btn.disabled = false; });

        const btnView = $('btnView');
        if (btnView) btnView.disabled = false;
        const btnAdd = $('btnAdd');
        if (btnAdd) btnAdd.disabled = true;
        const btnSave = $('btnSave');
        if (btnSave) btnSave.disabled = true;

        setEditMode(false);
        currentData = null;

        // Reset exit date to working date
        initExitDate();

        showInfo('Cancelled');
    }

    function handlePrint() {
        if (!currentData) {
            showError('Load a record first');
            return;
        }

        const val = (id) => $(id)?.value || '';
        const exitReasonText = $('ExitReason')?.options[$('ExitReason')?.selectedIndex]?.text || '';

        const accountsBody = $('accountsBody');
        const accountRows = accountsBody ? Array.from(accountsBody.querySelectorAll('tr')) : [];
        let accountsHtml = '';
        if (accountRows.length > 0 && !accountRows[0].querySelector('.text-muted')) {
            accountRows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                if (cells.length >= 4) {
                    accountsHtml += `<tr><td>${cells[0].textContent}</td><td>${cells[1].textContent}</td><td class="text-end">${cells[2].textContent}</td><td>${cells[3].textContent}</td></tr>`;
                }
            });
        } else {
            accountsHtml = '<tr><td colspan="4" class="text-center">No records to display.</td></tr>';
        }

        const forfeitBody = $('forfeitBody');
        const forfeitRows = forfeitBody ? Array.from(forfeitBody.querySelectorAll('tr')) : [];
        let forfeitsHtml = '';
        if (forfeitRows.length > 0 && !forfeitRows[0].querySelector('.text-muted')) {
            forfeitRows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                if (cells.length >= 5) {
                    forfeitsHtml += `<tr><td>${cells[0].textContent}</td><td>${cells[1].textContent}</td><td>${cells[2].textContent}</td><td>${cells[3].textContent}</td><td class="text-end">${cells[4].textContent}</td></tr>`;
                }
            });
        } else {
            forfeitsHtml = '<tr><td colspan="5" class="text-center">No records to display.</td></tr>';
        }

        const generatedOn = window.GlobalUtils?.formatDateTime
            ? window.GlobalUtils.formatDateTime(new Date())
            : new Date().toLocaleString();

        const printContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Exit Process Report</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:20px;font-size:12px;line-height:1.4}
.report-header{text-align:center;margin-bottom:20px;border-bottom:2px solid #333;padding-bottom:10px}
.report-header h1{font-size:20px;margin-bottom:5px}
.client-info{margin-bottom:15px;display:grid;grid-template-columns:repeat(2,1fr);gap:8px;background:#f5f5f5;padding:10px;border:1px solid #ddd}
.info-row{display:flex;gap:5px}.info-label{font-weight:bold;min-width:120px}
.section{margin-bottom:20px;page-break-inside:avoid}.section-title{background:#4a5568;color:white;padding:8px;font-weight:bold;font-size:14px;margin-bottom:10px}
table{width:100%;border-collapse:collapse;margin-bottom:10px}th,td{border:1px solid #ddd;padding:6px;text-align:left}
th{background:#e2e8f0;font-weight:bold}.text-end{text-align:right}.text-center{text-align:center}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.grid-item{display:flex;flex-direction:column;border:1px solid #ddd;padding:6px;background:#f9f9f9}
.grid-label{font-size:10px;color:#666;margin-bottom:2px}.grid-value{font-weight:bold;text-align:right}
.total-row{background:#e2e8f0;font-weight:bold}
@media print{body{padding:10px}.section{page-break-inside:avoid}}</style></head>
<body>
<div class="report-header"><h1>Exit Process Report</h1><p>Generated on ${generatedOn}</p></div>
<div class="client-info">
<div class="info-row"><span class="info-label">Branch:</span><span>${val('BranchId')} - ${val('BranchName')}</span></div>
<div class="info-row"><span class="info-label">Center:</span><span>${val('CenterId')} - ${val('CenterName')}</span></div>
<div class="info-row"><span class="info-label">Group:</span><span>${val('GroupId')} - ${val('GroupName')}</span></div>
<div class="info-row"><span class="info-label">Client:</span><span>${val('ClientId')} - ${val('ClientName')}</span></div>
<div class="info-row"><span class="info-label">Exit Reason:</span><span>${exitReasonText}</span></div>
<div class="info-row"><span class="info-label">Exit Date:</span><span>${val('ExitDate')}</span></div>
</div>
<div class="section"><div class="section-title">Exit Details</div><div class="grid">
<div class="grid-item"><span class="grid-label">Total Recoverable</span><span class="grid-value">${val('TotalRecoverable')}</span></div>
<div class="grid-item"><span class="grid-label">Total Payable</span><span class="grid-value">${val('TotalPayable')}</span></div>
<div class="grid-item"><span class="grid-label">Forfeit Savings</span><span class="grid-value">${val('ForfeitSavings')}</span></div>
<div class="grid-item"><span class="grid-label">Forfeit Collateral</span><span class="grid-value">${val('ForfeitCollateral')}</span></div>
<div class="grid-item"><span class="grid-label">Charge-Off Loss</span><span class="grid-value">${val('ChargeOffLoss')}</span></div>
<div class="grid-item"><span class="grid-label">Charge-Off Insurance</span><span class="grid-value">${val('ChargeOffInsurance')}</span></div>
<div class="grid-item"><span class="grid-label">Net Payable</span><span class="grid-value">${val('NetPayable')}</span></div>
<div class="grid-item"><span class="grid-label">Net Receivable</span><span class="grid-value">${val('NetReceivable')}</span></div>
</div></div>
<div class="section"><div class="section-title">Transactions</div><table><thead><tr><th>Account ID</th><th>Account Name</th><th class="text-end">Amount</th><th>Description</th></tr></thead><tbody>${accountsHtml}</tbody></table></div>
<div class="section"><div class="section-title">Forfeit Details</div><table><thead><tr><th>Account Type</th><th>Account ID</th><th>Description</th><th>Transaction Type</th><th class="text-end">Amount</th></tr></thead><tbody>${forfeitsHtml}</tbody><tfoot><tr class="total-row"><td colspan="4" class="text-end">Total Forfeit Amount:</td><td class="text-end">${val('TotalForfeitAmount')}</td></tr></tfoot></table></div>
<div class="section"><div class="section-title">Client Portfolio</div><div class="grid">
<div class="grid-item"><span class="grid-label">Primary Collateral</span><span class="grid-value">${val('PrimaryCollateral')}</span></div>
<div class="grid-item"><span class="grid-label">Loan Balance</span><span class="grid-value">${val('LoanBalance')}</span></div>
<div class="grid-item"><span class="grid-label">Credit Interest</span><span class="grid-value">${val('CreditInterest')}</span></div>
<div class="grid-item"><span class="grid-label">Debit Interest</span><span class="grid-value">${val('DebitInterest')}</span></div>
<div class="grid-item"><span class="grid-label">Tax</span><span class="grid-value">${val('Tax')}</span></div>
<div class="grid-item"><span class="grid-label">Others</span><span class="grid-value">${val('Others')}</span></div>
<div class="grid-item"><span class="grid-label">Secondary Collateral</span><span class="grid-value">${val('SecondaryCollateral')}</span></div>
<div class="grid-item"><span class="grid-label">Net Balance</span><span class="grid-value">${val('NetBalance')}</span></div>
<div class="grid-item"><span class="grid-label">Additional Collateral</span><span class="grid-value">${val('AdditionalCollateral')}</span></div>
</div></div></body></html>`;

        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:absolute;width:0;height:0;border:none';
        document.body.appendChild(iframe);
        const iframeDoc = iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(printContent);
        iframeDoc.close();
        iframe.onload = () => {
            setTimeout(() => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
                setTimeout(() => document.body.removeChild(iframe), 100);
            }, 100);
        };
    }

    // =========================================================================
    // Initialization
    // =========================================================================
    function initExitDate() {
        const exitDateEl = $('ExitDate');
        if (exitDateEl && !exitDateEl.value) {
            const env = window.Environment || {};
            const workingDateStr = env.workingDate || env.WorkingDate || env.systemDate || env.SystemDate;
            let d = workingDateStr ? new Date(workingDateStr) : null;
            if (!d || isNaN(d.getTime())) d = new Date();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            exitDateEl.value = `${year}-${month}-${day}`;
        }
    }

    function initBranch() {
        const { ourBranchID } = getEnv();
        const branchName = getOurBranchName();
        const branchIdEl = $('BranchId');
        const branchNameEl = $('BranchName');

        if (branchIdEl && !branchIdEl.value.trim() && ourBranchID) {
            branchIdEl.value = ourBranchID;
        }
        if (branchNameEl && !branchNameEl.value.trim() && branchName) {
            branchNameEl.value = branchName;
        }

        // If we have ID but no name, resolve via server
        if (branchIdEl?.value.trim() && !branchNameEl?.value.trim()) {
            handleViewBranch();
        }
    }

    function setupEventListeners() {
        // Lookup buttons
        document.querySelectorAll('[data-ep-lookup]').forEach(btn => {
            btn.addEventListener('click', function () {
                const lookupType = this.getAttribute('data-ep-lookup');
                openSearchDialog(lookupType);
            });
        });

        // Action buttons
        $('btnView')?.addEventListener('click', handleView);
        $('btnAdd')?.addEventListener('click', handleAdd);
        $('btnSave')?.addEventListener('click', handleSave);
        $('btnPrint')?.addEventListener('click', handlePrint);
        $('btnCancel')?.addEventListener('click', handleCancel);

        // Enter key / blur handlers for ID fields
        $('BranchId')?.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); handleViewBranch(); } });
        $('CenterId')?.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); handleViewCenter(); } });
        $('GroupId')?.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); handleViewGroup(); } });
        $('ClientId')?.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); handleViewClient(); } });

        $('BranchId')?.addEventListener('blur', () => {
            const val = ($('BranchId')?.value || '').trim();
            if (val && !$('BranchName')?.value.trim()) handleViewBranch();
        });
        $('CenterId')?.addEventListener('blur', () => {
            const val = ($('CenterId')?.value || '').trim();
            if (val && !$('CenterName')?.value.trim()) handleViewCenter();
        });
        $('GroupId')?.addEventListener('blur', () => {
            const val = ($('GroupId')?.value || '').trim();
            if (val && !$('GroupName')?.value.trim()) handleViewGroup();
        });
        $('ClientId')?.addEventListener('blur', () => {
            const val = ($('ClientId')?.value || '').trim();
            if (val && !$('ClientName')?.value.trim()) handleViewClient();
        });

        // Exit Reason lazy load
        $('ExitReason')?.addEventListener('focus', loadExitTypes);
        $('ExitReason')?.addEventListener('click', loadExitTypes);

        // Section toggles
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', function () {
                const section = this.closest('.form-section');
                const content = section.querySelector('[data-section-content]');
                const btn = this.querySelector('.section-toggle-btn');
                const icon = btn.querySelector('i');
                const isExpanded = btn.getAttribute('aria-expanded') === 'true';

                btn.setAttribute('aria-expanded', !isExpanded);
                content.hidden = isExpanded;
                icon.className = isExpanded ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
            });
        });
    }

    function init() {
        console.log('[ExitProcess] Initializing...');
        setupEventListeners();
        initBranch();
        initExitDate();
        loadExitTypes();

        // Initial button state
        setEditMode(false);
        renderAccounts([]);
        renderForfeits([]);

        const btnAdd = $('btnAdd');
        if (btnAdd) btnAdd.disabled = true;

        console.log('[ExitProcess] Initialized');
    }

    // =========================================================================
    // Auto-Initialize
    // =========================================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('[ExitProcess] Module loaded');
})();
