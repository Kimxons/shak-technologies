// Sample data for Group Maintenance
const centerData = [];

// ---------------------------------------------------------------------------
// Toast helpers (aligned with modern Account Maintenance system to show
// system-level toasts like "Please close 'X' first" in a consistent style)
// ---------------------------------------------------------------------------

function ensureToastContainer() {
    let el = document.querySelector('[data-kairo-toast-container]');
    if (!el) {
        el = document.getElementById('toastContainer');
    }
    if (el) return el;

    el = document.createElement('div');
    el.className = 'kairo-toast-container';
    el.setAttribute('data-kairo-toast-container', '');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(el);
    return el;
}

function showToast(message, { title = 'Validation', variant = 'danger', timeoutMs = 9000 } = {}) {
    const container = ensureToastContainer();

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
        } catch {
            // ignore
        }
    };

    setTimeout(() => toast.classList.add('is-show'), 0);
    if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
}

function showSystemToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
    const container = ensureToastContainer();
    const existingToasts = container.querySelectorAll('.kairo-toast');
    existingToasts.forEach(t => t.remove());

    showToast(message, { title, variant, timeoutMs });
}

function showSnackbar(message, type = 'info') {
    console.log('[GroupMaintenance] showSnackbar:', type, message);

    let variant = 'info';
    if (type === 'success') variant = 'success';
    else if (type === 'error') variant = 'danger';
    else if (type === 'warning') variant = 'warning';

    showSystemToast(message, { title: 'Notice', variant });
}

async function showConfirmationDialog(title, message, variant) {
    if (typeof window.showConfirmationDialog === 'function') {
        return window.showConfirmationDialog(title, message, variant);
    }

    return Promise.resolve(window.confirm(message || title || 'Are you sure?'));
}

const MICROFINANCE_CONTROLLER_BASE = 'MicroFinance';

function getAppCore() {
    const win = window;
    return win.AppCore ||
        (win.parent && win.parent !== win && win.parent.AppCore) ||
        (win.top && win.top !== win && win.top.AppCore) ||
        null;
}

function invokeMicroFinanceController(action, requestData) {
    return new Promise((resolve, reject) => {
        const appCore = getAppCore();
        if (!appCore || typeof appCore.invokeController !== 'function') {
            reject(new Error('AppCore is not available (AppCore.invokeController not found)'));
            return;
        }

        const endpoint = `${MICROFINANCE_CONTROLLER_BASE}/${action}`;
        appCore.invokeController(endpoint, requestData || {}, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
}

function callMicroFinanceOldApi(formId, requestData) {
    return invokeMicroFinanceController('old-api', {
        formId,
        requestData: requestData || {}
    });
}

function unwrapOldApiRows(response) {
    const payload = response?.data ?? response;
    if (Array.isArray(payload?.Details)) return payload.Details;
    if (Array.isArray(payload?.Details01)) return payload.Details01;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload)) return payload;
    return [];
}

let sharedSearchModal = null;
let resolvedBranchSearchTableId = null;
let isBranchSearchModalUnavailable = false;

function getFieldValue(source, ...keys) {
    if (!source || typeof source !== 'object') return '';
    for (const key of keys) {
        const actual = Object.keys(source).find(k => k.toLowerCase() === String(key).toLowerCase());
        if (actual && source[actual] !== undefined && source[actual] !== null) {
            return source[actual];
        }
    }
    return '';
}

function ensureSharedSearchModal() {
    if (sharedSearchModal && typeof sharedSearchModal.open === 'function') {
        return sharedSearchModal;
    }

    if (typeof window.SearchModal !== 'function') {
        console.error('[GroupMaintenance] SearchModal is not available');
        return null;
    }

    const appCore = getAppCore();
    if (!appCore) {
        console.error('[GroupMaintenance] AppCore is not available for SearchModal');
        return null;
    }

    if (typeof appCore.invokeControllerGetViewAsync !== 'function') {
        appCore.invokeControllerGetViewAsync = async (endpoint, query) => {
            const qs = new URLSearchParams(query || {}).toString();
            const resp = await fetch(`/${endpoint}?${qs}`, { credentials: 'same-origin' });
            if (!resp.ok) throw new Error(`Failed to load view (${resp.status})`);
            return resp.text();
        };
    }

    if (typeof appCore.invokeControllerAsync !== 'function') {
        appCore.invokeControllerAsync = async (endpoint, data) => {
            const resp = await fetch(`/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(data || {})
            });
            if (!resp.ok) throw new Error(`Request failed (${resp.status})`);
            return resp.json();
        };
    }

    sharedSearchModal = new window.SearchModal(appCore);
    return sharedSearchModal;
}

function openLookupSearch(config, onSelect) {
    const modal = ensureSharedSearchModal();
    if (!modal) {
        showSnackbar('Search modal is not available.', 'error');
        return;
    }

    modal.open({
        tableID: config.tableID,
        moduleID: 5060,
        whereStmt: config.whereStmt || '',
        advFilterString: config.advFilterString || '',
        searchKey: '',
        onSelect: (row) => {
            if (typeof onSelect === 'function') onSelect(row || {});
        }
    }).catch(err => {
        console.error('[GroupMaintenance] SearchModal open failed:', err);
        showSnackbar('Unable to open search dialog.', 'error');
    });
}

let currentCenter = null;
let isEditMode = false;
let isAddMode = false;
let activeOfficerSearchContext = null;

const LOOKUP_HANDLERS = {
    Branch: () => handleBranchSearch(),
    Center: () => handleCenterSearch(),
    CenterProduct: () => handleCenterProductSearch(),
    PrimaryScheme: () => handlePrimarySchemeSearch(),
    CreditOfficer: () => handleCreditOfficerSearch(),
    GroupFormedBy: () => handleGroupFormedBySearch(),
    Ngo: () => handleNgoSearch()
};

function wireLookupButtons() {
    document.querySelectorAll('.btn-lookup[data-lookup]').forEach(btn => {
        if (btn.dataset.lookupWired === 'true') return;

        btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-lookup');
            const handler = LOOKUP_HANDLERS[key];
            if (typeof handler === 'function') {
                handler();
            } else {
                console.warn('[GroupMaintenance] Lookup handler not found:', key);
            }
        });

        btn.dataset.lookupWired = 'true';
    });
}

function canUseSearchDialogs() {
    return isAddMode || isEditMode;
}

function getLocalDateString() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function showCenterCreatedMessage(groupId) {
    const messageContainer = document.getElementById('centerCreatedMessage');
    const messageText = document.getElementById('centerCreatedText');

    if (messageContainer && messageText) {
        messageText.textContent = `Center created successfully, group ID: ${groupId}`;
        messageContainer.hidden = false;
    }
}

function hideCenterCreatedMessage() {
    const messageContainer = document.getElementById('centerCreatedMessage');
    if (messageContainer) {
        messageContainer.hidden = true;
    }
}

function clearCenterFields() {
    const fieldsToClear = [
        'centerId', 'centerName', 'centerProductId', 'centerProductName',
        'primarySchemeId', 'primarySchemeName', 'creditOfficer', 'creditOfficerName',
        'registrationNo', 'groupFormedBy', 'groupFormedByName', 'village', 'location', 'centre',
        'ngoId', 'ngoName', 'formationDate', 'firstMeetingDate', 'nextMeetingDate',
        'meetingDay', 'groupClass', 'totalSavingsAcs', 'totalSavingsBalance',
        'totalLoanAcs', 'totalLoanBalance', 'zeroBalance', 'loanCycleType', 'loanCycleNo',
        'savingOsLoan', 'meetingFrequency', 'createdBy', 'modifiedBy', 'supervisedBy',
        'createdOn', 'modifiedOn', 'supervisedOn', 'status', 'statusReason',
        'firstDay', 'nextDay', 'meetingTime', 'meetingPlace'
    ];

    fieldsToClear.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.value = '';
        }
    });

    if (!isAddMode) {
        document.getElementById('centerName')?.setAttribute('readonly', 'readonly');
    }
}

function extractDateForInput(dateString) {
    if (!dateString) return '';

    try {
        if (dateString.includes('T')) {
            const datePart = dateString.split('T')[0];
            if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
                return datePart;
            }
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }

        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        return '';
    } catch (e) {
        return '';
    }
}

function setDateInputValue(inputEl, dateValue) {
    if (!inputEl || !dateValue) return;

    if (inputEl._flatpickr) {
        try {
            inputEl._flatpickr.setDate(dateValue, true, 'Y-m-d');
        } catch (e) {
            inputEl.value = dateValue;
        }
        return;
    }

    const wasDisabled = inputEl.disabled;
    const wasReadonly = inputEl.readOnly;
    inputEl.disabled = false;
    inputEl.readOnly = false;

    inputEl.value = '';

    if (inputEl.type === 'date') {
        try {
            const [year, month, day] = dateValue.split('-').map(Number);
            const dateObj = new Date(year, month - 1, day);
            inputEl.valueAsDate = dateObj;
            inputEl.value = dateValue;
        } catch (e) {
            inputEl.value = dateValue;
        }
    } else {
        inputEl.value = dateValue;
    }

    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));

    inputEl.disabled = wasDisabled;
    inputEl.readOnly = wasReadonly;

}

function wireChildFormLinks() {
    document.querySelectorAll('.sidebar-item[data-child-form]').forEach(item => {
        if (item.dataset.childFormWired === 'true') return;

        item.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();

            const centerId = document.getElementById('centerId')?.value?.trim();
            const branchId = document.getElementById('branchId')?.value?.trim();

            if (!centerId || !branchId) {
                showSnackbar('Please load a center first before accessing data entry pages.', 'warning');
                return;
            }

            if (!window.currentCenter) {
                window.currentCenter = { GroupID: centerId, OurBranchID: branchId };
                currentCenter = window.currentCenter;
            }

            const formName = item.dataset.childForm;
            if (typeof window.openChildForm === 'function') {
                window.openChildForm(formName);
            }
        }, true);

        item.dataset.childFormWired = 'true';
    });
}

async function initializeCenterMaintenance() {
    if (window.ServiceLoader?.loadCore) {
        await window.ServiceLoader.loadCore();
    }

    if (!window.LookupService) {
        console.warn('[GroupMaintenance] LookupService not available');
    }

    if (!window.GroupService) {
        console.warn('[GroupMaintenance] GroupService not available');
    }

    await loadGroupClassOptions();

    const branchInput = document.getElementById('branchId');
    const existingBranchId = branchInput?.value?.trim() || '';
    const branchId = existingBranchId || window.Environment?.OurBranchID || window.Environment?.defaultOurBranchId;
    if (branchId && branchInput && !existingBranchId) {
        branchInput.value = branchId;
        await fetchBranchDetails(branchId);
    } else if (existingBranchId) {
        await fetchBranchDetails(existingBranchId);
    }

    setupEventListeners();
    wireLookupButtons();
    wireChildFormLinks();

    const maxDate = window.Environment?.workingDate || getLocalDateString();
    const formationDateInput = document.getElementById('formationDate');
    if (formationDateInput) {
        formationDateInput.setAttribute('max', maxDate);
    }
    const firstMeetingDateInput = document.getElementById('firstMeetingDate');
    if (firstMeetingDateInput) {
        firstMeetingDateInput.setAttribute('max', maxDate);
    }
    const nextMeetingDateInput = document.getElementById('nextMeetingDate');
    if (nextMeetingDateInput) {
        nextMeetingDateInput.setAttribute('max', maxDate);
    }
}

async function loadGroupClassOptions() {
    try {
        const requestData = {
            BankID: '00',
            ClasificationType: 'T'
        };

        console.log('[GroupMaintenance] Loading Group Class options...');

        let response = null;
        if (window.GroupService?.getSpConditionClassCombo) {
            response = await window.GroupService.getSpConditionClassCombo(requestData);
        } else {
            response = await callMicroFinanceOldApi('dbo.p_GetSpConditionCalssCombo', requestData);
        }

        const rows = unwrapOldApiRows(response?.data ?? response);
        if (rows.length > 0) {
            populateGroupClassDropdown(rows);
            console.log('[GroupMaintenance] Group Class options loaded');
        } else {
            console.warn('[GroupMaintenance] No Group Class options returned');
        }
    } catch (error) {
        console.error('[GroupMaintenance] Error loading Group Class options:', error);
    }
}

function populateGroupClassDropdown(options) {
    const select = document.getElementById('groupClass');
    if (!select) {
        console.warn('[GroupMaintenance] groupClass select not found');
        return;
    }

    while (select.options.length > 1) {
        select.remove(1);
    }

    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.SubCodeID || opt.subcodeid || opt.ClassID || opt.ID || opt.value || '';
        option.textContent = opt.Description || opt.description || opt.ClassDesc || opt.Name || opt.label || option.value;
        select.appendChild(option);
    });

    console.log('[GroupMaintenance] Group Class dropdown populated with', options.length, 'options');
}

function setupEventListeners() {
    document.getElementById('centerId').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleCenterSearch();
    });

    document.getElementById('centerId').addEventListener('change', () => {
        const centerId = document.getElementById('centerId').value.trim();
        const branchId = document.getElementById('branchId').value.trim();
        if (centerId && branchId && !isAddMode) {
            handleView();
        }
    });

    document.getElementById('branchId').addEventListener('change', async () => {
        const centerId = document.getElementById('centerId').value.trim();
        const branchId = document.getElementById('branchId').value.trim();

        if (branchId) {
            await fetchBranchDetails(branchId);
        }

        if (centerId && branchId && !isAddMode) {
            handleView();
        }
    });

    document.getElementById('meetingTime').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    document.getElementById('branchId').addEventListener('blur', async (e) => {
        const branchId = e.target.value.trim();
        if (branchId) {
            await fetchBranchDetails(branchId);
        }
    });

    document.getElementById('centerProductId').addEventListener('blur', async (e) => {
        const productId = e.target.value.trim();
        if (productId) {
            await fetchGroupProductDetails(productId);
        }
    });

    document.getElementById('primarySchemeId').addEventListener('blur', async (e) => {
        const schemeId = e.target.value.trim();
        if (schemeId && window.LookupService) {
            await fetchSchemeDetails(schemeId);
        }
    });

    document.getElementById('creditOfficer').addEventListener('blur', async (e) => {
        const officerId = e.target.value.trim();
        if (officerId && window.LookupService) {
            await fetchOfficerDetails(officerId, 'creditOfficer');
        }
    });

    document.getElementById('groupFormedBy').addEventListener('blur', async (e) => {
        const officerId = e.target.value.trim();
        if (officerId && window.LookupService) {
            await fetchOfficerDetails(officerId, 'groupFormedBy');
        }
    });

}

async function handleBranchSearch() {
    const applyBranchSelection = async (rowLike) => {
        const branchId = String(getFieldValue(rowLike, 'OurBranchID', 'BranchID', 'ID', 'branchId')).trim();
        const branchName = String(getFieldValue(rowLike, 'BranchName', 'Name', 'Description', 'branchName')).trim();
        if (!branchId) return;

        document.getElementById('branchId').value = branchId;
        document.getElementById('branchName').value = branchName;

        const wasInAddMode = isAddMode;
        clearCenterFields();
        if (wasInAddMode) {
            isAddMode = true;
            setEditMode(true);
        }

        if (!branchName) {
            await fetchBranchDetails(branchId);
        }
    };

    const fallbackBranchSearch = () => {
        if (window.BranchSearchService && typeof window.BranchSearchService.openSearchModal === 'function') {
            window.BranchSearchService.openSearchModal((branchId, branchName) => {
                applyBranchSelection({ branchId, branchName });
            });
            return true;
        }
        return false;
    };

    const appCore = getAppCore();
    if (!window.SearchModal || !appCore) {
        if (!fallbackBranchSearch()) {
            showSnackbar('Search modal is not available.', 'error');
        }
        return;
    }

    const currentBranchId = document.getElementById('branchId')?.value?.trim() || '';
    const currentBranchName = document.getElementById('branchName')?.value?.trim() || '';

    let initialSearchKey = '';
    if (currentBranchId) {
        initialSearchKey += `OurBranchID LIKE '%${currentBranchId}%'`;
    }
    if (currentBranchName) {
        if (initialSearchKey) initialSearchKey += ' AND ';
        initialSearchKey += `BranchName LIKE '%${currentBranchName}%'`;
    }

    const candidateTableIds = resolvedBranchSearchTableId
        ? [resolvedBranchSearchTableId]
        : ['t_SystemBranchSetting', 'OurBranchID', 'BranchID'];

    for (const tableID of candidateTableIds) {
        try {
            const searchModal = new window.SearchModal(appCore);
            await searchModal.open({
                tableID,
                moduleID: 5060,
                whereStmt: '',
                advFilterString: "BankID='00'",
                searchKey: initialSearchKey,
                onSelect: (row) => applyBranchSelection(row)
            });

            resolvedBranchSearchTableId = tableID;
            return;
        } catch (err) {
            const msg = String(err?.message || '').toLowerCase();
            if (!msg.includes('not found')) {
                console.error('[GroupMaintenance] Branch search modal error:', err);
                break;
            }
        }
    }

    if (!fallbackBranchSearch()) {
        showSnackbar('Branch search configuration was not found.', 'error');
    }
}

function runLookupSearch(options) {
    if (!options) return;

    if (options.requireEditMode && !canUseSearchDialogs()) {
        showSnackbar(options.editModeMessage || 'Search is only available in Add or Edit mode.', 'warning');
        return;
    }

    const branchId = document.getElementById('branchId')?.value?.trim() || '';
    if (options.requireBranch && !branchId) {
        showSnackbar('Please select a branch first', 'warning');
        return;
    }

    const config = options.buildConfig(branchId);
    openLookupSearch(config, options.onSelect);
}

function handleCenterSearch() {
    if (isAddMode) {
        showSnackbar('Center ID is auto-generated during Add mode.', 'info');
        return;
    }

    runLookupSearch({
        requireEditMode: false,
        requireBranch: true,
        buildConfig: (branchId) => ({
            tableID: 'GroupID',
            advFilterString: branchId ? `OurBranchID='${branchId}'` : ''
        }),
        onSelect: (row) => {
            const groupId = String(getFieldValue(row, 'GroupID', 'ID')).trim();
            const groupName = String(getFieldValue(row, 'GroupName', 'Name', 'Description')).trim();
            if (!groupId) return;

            document.getElementById('centerId').value = groupId;
            document.getElementById('centerName').value = groupName;
            handleView();
        }
    });
}

function handleCenterProductSearch() {
    runLookupSearch({
        requireEditMode: true,
        editModeMessage: 'Center Product search is only available in Add or Edit mode.',
        requireBranch: false,
        buildConfig: () => ({
            tableID: 'GroupProductID',
            advFilterString: "BankID='00'"
        }),
        onSelect: (row) => {
            const productId = String(getFieldValue(row, 'GroupProductID', 'ProductID', 'ID')).trim();
            const productName = String(getFieldValue(row, 'GroupProductName', 'Description', 'Name')).trim();
            if (!productId) return;

            document.getElementById('centerProductId').value = productId;
            document.getElementById('centerProductName').value = productName;
        }
    });
}

function handlePrimarySchemeSearch() {
    const productId = document.getElementById('centerProductId')?.value?.trim();
    if (!productId) {
        showSnackbar('Please select a product first', 'warning');
        return;
    }

    runLookupSearch({
        requireEditMode: true,
        editModeMessage: 'Scheme search is only available in Add or Edit mode.',
        requireBranch: false,
        buildConfig: () => ({
            tableID: 'GroupDefaultSchemeID',
            advFilterString: `GroupProductID='${productId}' AND SchemeTypeID='P'`
        }),
        onSelect: (row) => {
            const schemeId = String(getFieldValue(row, 'LoanSchemeID', 'SchemeID', 'ID')).trim();
            const schemeName = String(getFieldValue(row, 'Description', 'LoanSchemeName', 'Name')).trim();
            if (!schemeId) return;

            document.getElementById('primarySchemeId').value = schemeId;
            document.getElementById('primarySchemeName').value = schemeName;
        }
    });
}

function handleCreditOfficerSearch() {
    runLookupSearch({
        requireEditMode: true,
        editModeMessage: 'Officer search is only available in Add or Edit mode.',
        requireBranch: true,
        buildConfig: (branchId) => ({
            tableID: 'ActiveOfficerID',
            advFilterString: `BankID='00' AND OfficerTypeID in ('CO','AO') AND ReportingBranchID='${branchId}'`
        }),
        onSelect: (row) => {
            const officerId = String(getFieldValue(row, 'OfficerID', 'ID')).trim();
            const officerName = String(getFieldValue(row, 'Name', 'OfficerName', 'Description')).trim();
            if (!officerId) return;

            document.getElementById('creditOfficer').value = officerId;
            document.getElementById('creditOfficerName').value = officerName;
        }
    });
}

function handleGroupFormedBySearch() {
    runLookupSearch({
        requireEditMode: true,
        editModeMessage: 'Officer search is only available in Add or Edit mode.',
        requireBranch: true,
        buildConfig: (branchId) => ({
            tableID: 'ActiveOfficerID',
            advFilterString: `BankID='00' AND OfficerTypeID in ('CO','AO') AND ReportingBranchID='${branchId}'`
        }),
        onSelect: (row) => {
            const officerId = String(getFieldValue(row, 'OfficerID', 'ID')).trim();
            const officerName = String(getFieldValue(row, 'Name', 'OfficerName', 'Description')).trim();
            if (!officerId) return;

            document.getElementById('groupFormedBy').value = officerId;
            document.getElementById('groupFormedByName').value = officerName;
        }
    });
}

function handleNgoSearch() {
    runLookupSearch({
        requireEditMode: true,
        editModeMessage: 'NGO search is only available in Add or Edit mode.',
        requireBranch: true,
        buildConfig: (branchId) => ({
            tableID: 'NGOBranchID',
            advFilterString: branchId ? `BranchID='${branchId}'` : ''
        }),
        onSelect: (row) => {
            const ngoId = String(getFieldValue(row, 'NGOID', 'NGOBranchID', 'ID')).trim();
            const ngoName = String(getFieldValue(row, 'NGOName', 'Name', 'Description')).trim();
            if (!ngoId) return;

            document.getElementById('ngoId').value = ngoId;
            document.getElementById('ngoName').value = ngoName;
        }
    });
}

async function fetchBranchDetails(branchId) {
    try {
        const requestData = {
            BankID: '00'
        };

        if (!window.LookupService || typeof window.LookupService.getBranches !== 'function') {
            document.getElementById('branchName').value = '';
            showSnackbar('Lookup service is not available', 'error');
            return;
        }

        const result = await window.LookupService.getBranches(requestData);

        let branches = [];
        if (Array.isArray(result?.data)) {
            branches = result.data;
        } else if (Array.isArray(result?.Details)) {
            branches = result.Details;
        } else if (Array.isArray(result?.data?.Details)) {
            branches = result.data.Details;
        } else if (Array.isArray(result?.data?.Details01)) {
            branches = result.data.Details01;
        }

        const lowerBranchId = String(branchId || '').toLowerCase();
        const filteredBranches = branches.filter(b =>
            String(b?.OurBranchID || b?.BranchID || '').toLowerCase().includes(lowerBranchId)
        );

        if (filteredBranches.length === 1) {
            const branch = filteredBranches[0];
            document.getElementById('branchName').value = branch.BranchName || branch.Name || '';
        } else if (filteredBranches.length === 0) {
            document.getElementById('branchName').value = '';
            showSnackbar('Branch not found', 'warning');
        } else {
            document.getElementById('branchName').value = '';
            showSnackbar('Multiple branches match, please use search dialog', 'warning');
        }
    } catch (error) {
        document.getElementById('branchName').value = '';
        showSnackbar('Error fetching branch details', 'error');
    }
}

function mapMeetingDay(meetingDayId) {
    const dayMap = {
        '1': 'Monday',
        '2': 'Tuesday',
        '3': 'Wednesday',
        '4': 'Thursday',
        '5': 'Friday',
        '6': 'Saturday',
        '7': 'Sunday'
    };
    if (!meetingDayId) return '';
    return dayMap[String(meetingDayId).trim()] || '';
}

function applyGroupDetails(details01, details02) {
    if (details02) {
        document.getElementById('branchId').value = details02.OurBranchID || document.getElementById('branchId')?.value || '';
        document.getElementById('branchName').value = details02.BranchName || '';
        document.getElementById('centerId').value = details02.GroupID || '';
        document.getElementById('centerName').value = details02.GroupName || '';
        document.getElementById('centerProductId').value = details02.GroupProductID || '';
        document.getElementById('centerProductName').value = details02.GroupProductName || '';
        document.getElementById('primarySchemeId').value = details02.DefaultLoanSchemeID || '';
        document.getElementById('primarySchemeName').value = details02.DefaultLoanScheme || '';
        document.getElementById('creditOfficer').value = details02.CreditOfficerID || '';
        document.getElementById('creditOfficerName').value = details02.CreditOfficerName || '';
        document.getElementById('groupFormedBy').value = details02.GroupFormedBy || '';
        document.getElementById('groupFormedByName').value = details02.GroupFormedByName || '';
        document.getElementById('ngoId').value = details02.NGOID || '';
        document.getElementById('ngoName').value = details02.NGOName || '';
        document.getElementById('registrationNo').value = details02.RegistrationNo || '';
        document.getElementById('groupClass').value = details02.GroupClassID || '';
        document.getElementById('meetingDay').value = mapMeetingDay(details02.MeetingDayID) || '';
        document.getElementById('meetingTime').value = details02.MeetingTime || '';
        document.getElementById('meetingPlace').value = details02.MeetingPlace || '';
        document.getElementById('status').value = details02.GroupStatusID || 'A';
        document.getElementById('firstDay').value = details02.FirstDay || '';
        document.getElementById('nextDay').value = details02.NextDay || '';

        setDateInputValue(document.getElementById('formationDate'), extractDateForInput(details02.FormationDate));
        setDateInputValue(document.getElementById('firstMeetingDate'), extractDateForInput(details02.FirstMeetingDate));
        setDateInputValue(document.getElementById('nextMeetingDate'), extractDateForInput(details02.NextMeetingDate));

        document.getElementById('createdBy').value = details02.CreatedBy || '';
        document.getElementById('createdOn').value = extractDateForInput(details02.CreatedOn) || '';
        document.getElementById('modifiedBy').value = details02.ModifiedBy || '';
        document.getElementById('modifiedOn').value = extractDateForInput(details02.ModifiedOn) || '';
        document.getElementById('supervisedBy').value = details02.SupervisedBy || '';
        document.getElementById('supervisedOn').value = extractDateForInput(details02.SupervisedOn) || '';

        currentCenter = details02;
        window.currentCenter = currentCenter;
    }

    if (details01) {
        document.getElementById('totalMembers').value = details01.TotalMembers ?? '';
        document.getElementById('totalSavingsAcs').value = details01.TotalSavingACs ?? '';
        document.getElementById('totalSavingsBalance').value = details01.TotalSavingsBalance ?? '';
        document.getElementById('totalLoanAcs').value = details01.TotalLoanACs ?? '';
        document.getElementById('totalLoanBalance').value = details01.TotalLoanBalance ?? '';
        document.getElementById('zeroBalance').value = details01.TotalZeroSavingACs ?? '';
        document.getElementById('meetingFrequency').value = details01.MeetingFrequency || details01.MeetingFrequencyID || '';
        document.getElementById('loanCycleType').value = details01.LoanCycleType || details01.LoanCycleTypeID || '';
        document.getElementById('loanCycleNo').value = details01.LoanCycleNo ?? '';
        document.getElementById('savingOsLoan').value = details01.SavingsTOOSLoan ?? '';
    }
}

async function handleView() {
    const centerId = document.getElementById('centerId')?.value?.trim();
    const branchId = document.getElementById('branchId')?.value?.trim();

    if (!centerId || !branchId) {
        showSnackbar('Please provide Center ID and Branch ID', 'warning');
        return;
    }

    if (!window.GroupService?.getGroupDetails) {
        showSnackbar('GroupService not loaded', 'error');
        return;
    }

    try {
        const requestData = {
            OurBranchID: branchId,
            GroupID: centerId,
            OperatorID: window.Environment?.OperatorID || window.Environment?.operatorId || 'CSADM',
            Direction: 0
        };

        const result = await window.GroupService.getGroupDetails(requestData);
        const details01 = result?.data?.Details01?.[0]
            || result?.Details01?.[0]
            || null;
        const details02 = result?.data?.Details02?.[0]
            || result?.Details02?.[0]
            || null;

        if (!details01 && !details02) {
            showSnackbar(result?.message || 'No group details found', 'warning');
            return;
        }

        applyGroupDetails(details01, details02);

        isEditMode = false;
        isAddMode = false;
    } catch (error) {
        showSnackbar('Error loading group details', 'error');
    }
}

window.handleBranchSearch = handleBranchSearch;
window.handleCenterSearch = handleCenterSearch;
window.handleCenterProductSearch = handleCenterProductSearch;
window.handlePrimarySchemeSearch = handlePrimarySchemeSearch;
window.handleCreditOfficerSearch = handleCreditOfficerSearch;
window.handleGroupFormedBySearch = handleGroupFormedBySearch;
window.handleNgoSearch = handleNgoSearch;
window.handleView = handleView;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeCenterMaintenance();
    });
} else {
    initializeCenterMaintenance();
}
