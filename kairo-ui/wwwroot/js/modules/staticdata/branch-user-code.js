(function () {
    'use strict';

    if (window.__kairoBranchUserCodeLoaded) return;
    window.__kairoBranchUserCodeLoaded = true;

    const MODES = {
        VIEW: 'view',
        ADD: 'add',
        EDIT: 'edit'
    };

    const API = {
        GET: '/StaticData/BranchUserCode/api/get',
        SAVE: '/StaticData/BranchUserCode/api/save'
    };

    const state = {
        currentMode: MODES.VIEW,
        gridAction: null,
        selectedCodeId: null,
        selectedCodeName: '',
        lastLoadedRecord: null,
        subCodes: [],
        recordNotFound: false
    };

    const qs = function (selector, root) { return (root || document).querySelector(selector); };
    const qsa = function (selector, root) { return (root || document).querySelectorAll(selector); };
    const systemUtilitiesService = window.SystemUtilitiesService || null;
    let searchModal = null;
    let searchModalAppCoreProxy = null;

    function getAppCore() {
        const win = window;
        return win.AppCore || (win.parent && win.parent !== win && win.parent.AppCore) || (win.top && win.top !== win && win.top.AppCore) || null;
    }

    function getEnv() {
        const e = window.Environment || {};
        let session = null;
        try {
            const raw = localStorage.getItem('nimble_auth_session');
            if (raw) session = JSON.parse(raw);
        } catch (_) {
            session = null;
        }
        session = session || {};

        const ourBranchId = String(
            e.OurBranchID || e.branchID || e.branchId ||
            sessionStorage.getItem('BranchID') || sessionStorage.getItem('OurBranchID') || sessionStorage.getItem('currentBranchId') ||
            session.branchID || session.BranchID || session.OurBranchID ||
            localStorage.getItem('BranchID') || '0101'
        ).trim();

        const operatorId = String(
            e.operatorID || e.operatorId || e.UserID ||
            sessionStorage.getItem('OperatorID') || sessionStorage.getItem('operatorId') ||
            session.operatorID || session.OperatorID ||
            localStorage.getItem('OperatorID') || 'CSADM'
        ).trim();

        return { ourBranchId: ourBranchId, operatorId: operatorId };
    }

    function getSearchModal() {
        if (searchModal) {
            return searchModal;
        }

        const appCore = getAppCore();
        if (!appCore) {
            return null;
        }

        if (!searchModalAppCoreProxy) {
            searchModalAppCoreProxy = Object.create(appCore);
            searchModalAppCoreProxy.invokeControllerAsync = async function (endpoint, payload) {
                if (endpoint === 'SearchModal/Search') {
                    return postJson('/StaticData/BranchUserCode/api/search-code-types', payload || {});
                }

                return appCore.invokeControllerAsync(endpoint, payload || {});
            };
        }

        if (typeof appCore.SearchModal === 'function') {
            searchModal = new appCore.SearchModal(searchModalAppCoreProxy);
            return searchModal;
        }

        if (typeof window.SearchModal !== 'function') {
            return null;
        }

        searchModal = new window.SearchModal(searchModalAppCoreProxy);
        return searchModal;
    }

    function getOurBranchId() {
        return getEnv().ourBranchId || null;
    }

    const LOOKUP_CONFIG = {
        codeType: {
            tableID: 'SystemSubCodeID',
            moduleID: '2008',
            getAdvFilterString: function () {
                return "ID = 'BranchUserCodeID'";
            },
            onSelect: function (selected) {
                if (!selected) return;

                const selectedCodeId = pick(selected, 'SubCodeID', 'subCodeID', 'ID', 'Id', 'SystemSubCodeID', 'CodeID');
                const selectedDescription = pick(selected, 'Description', 'description', 'Name', 'name', 'CodeDescription', 'SubCodeName', 'CodeName');

                if (!selectedCodeId) {
                    showWarningToast('No ID returned from search');
                    return;
                }

                updateSelectedCode(selectedCodeId, selectedDescription);
                loadCodeDetails(selectedCodeId);
            }
        }
    };

    function openLookup(type) {
        const modal = getSearchModal();
        if (!modal) {
            showErrorToast('Search is not available on this page');
            return;
        }

        const config = LOOKUP_CONFIG[type];
        if (!config) return;

        const env = getEnv();
        const tableID = typeof config.getTableID === 'function' ? config.getTableID() : config.tableID;
        const advFilterString = typeof config.getAdvFilterString === 'function'
            ? config.getAdvFilterString()
            : (config.advFilterString || '');

        modal.open({
            tableID: tableID,
            moduleID: String(config.moduleID || '1000'),
            whereStmt: '',
            advFilterString: advFilterString,
            searchKey: '',
            ourbranchId: env.ourBranchId,
            onSelect: config.onSelect
        }).catch(function (error) {
            showErrorToast(error && error.message ? error.message : 'Failed to load search');
        });
    }

    function postJson(url, payload) {
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin',
            body: JSON.stringify(payload || {})
        }).then(async function (response) {
            const contentType = String(response.headers.get('content-type') || '').toLowerCase();
            const responseBody = contentType.indexOf('application/json') >= 0
                ? await response.json()
                : await response.text();

            if (!response.ok) {
                const message = typeof responseBody === 'string'
                    ? responseBody
                    : getResponseMessage(responseBody, 'Request failed.');
                throw new Error(message || ('Request failed with status ' + response.status));
            }

            return responseBody;
        });
    }

    function setValue(id, value) {
        const element = document.getElementById(id);
        if (!element) return;
        if ('value' in element) {
            element.value = value == null ? '' : value;
            return;
        }

        element.textContent = value == null ? '' : value;
    }

    function getValue(id) {
        const element = document.getElementById(id);
        return element && 'value' in element ? String(element.value || '') : '';
    }

    function setButtonDisabled(button, disabled) {
        if (!button) return;
        button.disabled = !!disabled;
        button.classList.toggle('disabled', !!disabled);
    }

    function pick(source) {
        if (!source) return '';
        for (let index = 1; index < arguments.length; index += 1) {
            const key = arguments[index];
            if (source[key] !== undefined && source[key] !== null && String(source[key]).trim() !== '') {
                return String(source[key]);
            }
        }
        return '';
    }

    function getResponseMessage(payload, fallback) {
        return pick(
            payload,
            'ResponseMessage',
            'responseMessage',
            'ErrorMessage',
            'errorMessage',
            'Message',
            'message'
        ) || pick(payload && payload.data, 'ResponseMessage', 'responseMessage', 'ErrorMessage', 'errorMessage', 'Message', 'message') || String(fallback || 'Request failed.');
    }

    async function resolveCodeTypeDescription(codeId) {
        const normalized = String(codeId || '').trim();
        if (!normalized) {
            return '';
        }

        const appCore = getAppCore();
        if (!appCore || typeof appCore.invokeControllerAsync !== 'function') {
            return '';
        }

        try {
            const response = await appCore.invokeControllerAsync('SearchModal/GetIDDescription', {
                ControlTypeID: 'SystemSubCodeID',
                ID: normalized,
                ModuleID: '2008',
                OurBranchID: getOurBranchId()
            });

            if (!response || response.success !== true) {
                return '';
            }

            const data = response.data || {};
            return pick(data, 'Description', 'description', 'Name', 'name', 'CodeDescription', 'SubCodeName', 'CodeName');
        } catch (error) {
            return '';
        }
    }

    function normalizeResults(response) {
        if (response && response.success === true && Array.isArray(response.data)) {
            return response.data;
        }

        if (response && response.raw) {
            return normalizeResults(response.raw);
        }

        let results = [];

        if (response && response.data && Array.isArray(response.data.Details01)) {
            results = response.data.Details01;
        } else if (response && Array.isArray(response.Details01)) {
            results = response.Details01;
        } else if (response && response.data && Array.isArray(response.data.details01)) {
            results = response.data.details01;
        }

        return results.filter(function (record) {
            return !!pick(record, 'SubCodeID', 'subCodeID', 'SubCode', 'ID');
        });
    }

    function formatDateTime(value) {
        if (!value || value === 'null') return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString();
    }

    function getVisibleSubCodes() {
        return state.subCodes.filter(function (record) {
            return !record._isDeleted;
        });
    }

    function cloneSubCodeRecord(record) {
        return {
            SubCodeID: pick(record, 'SubCodeID', 'subCodeID', 'SubCode', 'ID'),
            Description: pick(record, 'Description', 'SubCodeName', 'CodeDescription', 'Name'),
            CreatedBy: pick(record, 'CreatedBy', 'createdBy', 'OperatedBy', 'operatedBy'),
            CreatedOn: pick(record, 'CreatedOn', 'createdOn', 'OperatedOn', 'operatedOn'),
            SupervisedBy: pick(record, 'SupervisedBy', 'supervisedBy', 'ApprovedBy', 'approvedBy'),
            SupervisedOn: pick(record, 'SupervisedOn', 'supervisedOn', 'ApprovedOn', 'approvedOn'),
            _isNew: !!record._isNew,
            _isModified: !!record._isModified,
            _isDeleted: !!record._isDeleted
        };
    }

    function normalizeLoadedSubCodes(subCodes) {
        return (subCodes || []).map(function (record) {
            return {
                SubCodeID: pick(record, 'SubCodeID', 'subCodeID', 'SubCode', 'ID'),
                Description: pick(record, 'Description', 'SubCodeName', 'CodeDescription', 'Name'),
                CreatedBy: pick(record, 'CreatedBy', 'createdBy', 'OperatedBy', 'operatedBy'),
                CreatedOn: pick(record, 'CreatedOn', 'createdOn', 'OperatedOn', 'operatedOn'),
                SupervisedBy: pick(record, 'SupervisedBy', 'supervisedBy', 'ApprovedBy', 'approvedBy'),
                SupervisedOn: pick(record, 'SupervisedOn', 'supervisedOn', 'ApprovedOn', 'approvedOn'),
                _isNew: false,
                _isModified: false,
                _isDeleted: false
            };
        });
    }

    function toSaveSubCodes() {
        return state.subCodes.filter(function (record) {
            return !!(record._isNew || record._isModified || record._isDeleted);
        }).map(function (record) {
            return {
                SubCodeID: record.SubCodeID,
                Description: record.Description,
                ButtonMark: record._isDeleted ? 'R' : (record._isNew ? 'N' : 'E')
            };
        });
    }

    function updateSelectedCode(codeId, description) {
        state.selectedCodeId = codeId || null;
        state.selectedCodeName = description || '';
        setValue('CodeID', codeId || '');
        setValue('CodeName', description || '');
    }

    function clearBehindTheScene() {
        setValue('CreatedBy', '');
        setValue('CreatedOn', '');
        setValue('SupervisedBy', '');
        setValue('SupervisedOn', '');
    }

    function populateBehindTheScene(record) {
        if (!record) {
            clearBehindTheScene();
            return;
        }

        setValue('CreatedBy', pick(record, 'CreatedBy', 'createdBy', 'OperatedBy', 'operatedBy') || '-');
        setValue('CreatedOn', formatDateTime(pick(record, 'CreatedOn', 'createdOn', 'OperatedOn', 'operatedOn')) || '-');
        setValue('SupervisedBy', pick(record, 'SupervisedBy', 'supervisedBy', 'ApprovedBy', 'approvedBy') || '-');
        setValue('SupervisedOn', formatDateTime(pick(record, 'SupervisedOn', 'supervisedOn', 'ApprovedOn', 'approvedOn')) || '-');
    }

    function ensureToastContainer() {
        const host = qs('#branchUserCodeModule');
        let element = host ? host.querySelector('[data-kairo-toast-container]') : null;
        if (element) return element;

        element = document.createElement('div');
        element.className = 'kairo-toast-container';
        element.setAttribute('data-kairo-toast-container', '');
        element.setAttribute('aria-live', 'polite');
        element.setAttribute('aria-relevant', 'additions');
        if (host) {
            host.appendChild(element);
        } else {
            document.body.appendChild(element);
        }

        return element;
    }

    function showToast(message, options) {
        const config = options || {};
        const container = ensureToastContainer();
        qsa('.kairo-toast', container).forEach(function (toast) { toast.remove(); });

        const toast = document.createElement('div');
        toast.className = 'kairo-toast kairo-toast--' + String(config.variant || 'info');
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-atomic', 'true');
        toast.textContent = String(message || '');
        container.appendChild(toast);

        window.setTimeout(function () { toast.classList.add('is-show'); }, 0);
        window.setTimeout(function () {
            toast.classList.remove('is-show');
            window.setTimeout(function () { toast.remove(); }, 180);
        }, Number(config.timeoutMs || 3500));
    }

    function showSuccessToast(message) { showToast(message, { variant: 'success', timeoutMs: 2800 }); }
    function showErrorToast(message) { showToast(message, { variant: 'danger', timeoutMs: 4200 }); }
    function showWarningToast(message) { showToast(message, { variant: 'warning', timeoutMs: 3200 }); }
    function showInfoToast(message) { showToast(message, { variant: 'info', timeoutMs: 3200 }); }

    function showSuccessMessage(message) {
        const banner = qs('.validation-summary');
        if (!banner) return;
        const text = qs('.validation-summary__text', banner);
        if (text) text.textContent = message;
        banner.style.display = 'flex';
        banner.style.alignItems = 'center';
        banner.classList.add('is-visible', 'validation-summary--success');
        const close = qs('.validation-summary__close', banner);
        if (close) {
            close.onclick = function () { hideValidationSummary(); };
        }
        window.setTimeout(function () { hideValidationSummary(); }, 5000);
    }

    function hideValidationSummary() {
        const banner = qs('.validation-summary');
        if (!banner) return;
        banner.style.display = 'none';
        banner.classList.remove('is-visible', 'validation-summary--success');
    }

    function updateGridButtons() {
        const isEditMode = state.currentMode === MODES.EDIT;
        const isAddMode = state.currentMode === MODES.ADD;
        const currentAction = state.gridAction;
        const hasCodeSelected = !!state.selectedCodeId;
        const hasRowSelected = !!state.lastLoadedRecord;

        const newButton = qs('[data-bruc-grid-action="new"]');
        const alterButton = qs('[data-bruc-grid-action="alter"]');
        const removeButton = qs('[data-bruc-grid-action="remove"]');
        const updateButton = qs('[data-bruc-grid-action="update"]');
        const clearButton = qs('[data-bruc-grid-action="clear"]');
        const subCodeField = qs('#SubCode');
        const descriptionField = qs('#Description');

        const fieldsEditable = (isAddMode && hasCodeSelected) ||
            (isEditMode && hasCodeSelected && (currentAction === 'new' || currentAction === 'alter'));

        if (subCodeField) subCodeField.disabled = !fieldsEditable;
        if (descriptionField) descriptionField.disabled = !fieldsEditable;

        if (isAddMode) {
            setButtonDisabled(newButton, true);
            setButtonDisabled(alterButton, true);
            setButtonDisabled(removeButton, true);
            setButtonDisabled(updateButton, false);
            setButtonDisabled(clearButton, false);
            return;
        }

        if (!isEditMode || !hasCodeSelected) {
            setButtonDisabled(newButton, true);
            setButtonDisabled(alterButton, true);
            setButtonDisabled(removeButton, true);
            setButtonDisabled(updateButton, true);
            setButtonDisabled(clearButton, true);
            return;
        }

        if (currentAction === 'new' || currentAction === 'alter') {
            setButtonDisabled(newButton, true);
            setButtonDisabled(alterButton, true);
            setButtonDisabled(removeButton, true);
            setButtonDisabled(updateButton, false);
            setButtonDisabled(clearButton, false);
            return;
        }

        setButtonDisabled(newButton, false);
        setButtonDisabled(alterButton, !hasRowSelected);
        setButtonDisabled(removeButton, !hasRowSelected);
        setButtonDisabled(updateButton, true);
        setButtonDisabled(clearButton, true);
    }

    function getActionButtons() {
        return {
            view: qs('[data-bruc-action="view"]'),
            add: qs('[data-bruc-action="add"]'),
            edit: qs('[data-bruc-action="edit"]'),
            save: qs('[data-bruc-action="save"]'),
            cancel: qs('[data-bruc-action="cancel"]')
        };
    }

    function updateActionButtons() {
        const buttons = getActionButtons();
        const hasCodeSelected = !!state.selectedCodeId;
        const hasSubCodes = !!getVisibleSubCodes().length;
        const isEditable = state.currentMode === MODES.ADD || state.currentMode === MODES.EDIT;

        if (state.currentMode === MODES.VIEW) {
            setButtonDisabled(buttons.view, true);
            setButtonDisabled(buttons.save, true);

            if (hasCodeSelected && !hasSubCodes) {
                setButtonDisabled(buttons.add, false);
                setButtonDisabled(buttons.edit, true);
                setButtonDisabled(buttons.cancel, false);
                return;
            }

            if (hasCodeSelected && hasSubCodes) {
                setButtonDisabled(buttons.add, true);
                setButtonDisabled(buttons.edit, false);
                setButtonDisabled(buttons.cancel, false);
                return;
            }

            setButtonDisabled(buttons.add, true);
            setButtonDisabled(buttons.edit, true);
            setButtonDisabled(buttons.cancel, true);
            return;
        }

        if (isEditable) {
            setButtonDisabled(buttons.view, false);
            setButtonDisabled(buttons.add, true);
            setButtonDisabled(buttons.edit, true);
            setButtonDisabled(buttons.save, false);
            setButtonDisabled(buttons.cancel, false);
        }
    }

    function setMode(mode, options) {
        const config = options || {};
        state.currentMode = mode;
        state.gridAction = null;

        const form = qs('#branch-user-code-form');
        if (!form) return;

        const isEditable = mode === MODES.ADD || mode === MODES.EDIT;
        qsa('input, select, textarea', form).forEach(function (element) {
            if (element.hasAttribute('data-always-enabled')) {
                element.disabled = false;
                return;
            }

            if (element.id === 'CodeID' || element.id === 'CodeName') {
                element.disabled = false;
                element.readOnly = true;
                return;
            }

            element.disabled = !isEditable;
        });

        qsa('button[data-always-enabled]', form).forEach(function (button) {
            button.disabled = false;
        });

        if (config.initial) {
            setButtonDisabled(getActionButtons().view, false);
            updateGridButtons();
            return;
        }

        updateActionButtons();
        updateGridButtons();
    }

    function renderSubCodesTable(subCodes) {
        const tbody = qs('#subCodesTable tbody');
        const countElement = qs('#subCodeCount');
        if (!tbody) return;

        const visibleSubCodes = (subCodes || []).filter(function (record) {
            return !record._isDeleted;
        });

        if (countElement) {
            countElement.textContent = String(visibleSubCodes.length);
        }

        if (!visibleSubCodes.length) {
            tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted py-4">No records to display.</td></tr>';
            return;
        }

        tbody.innerHTML = visibleSubCodes.map(function (record) {
            const subCodeId = pick(record, 'SubCodeID', 'subCodeID', 'SubCode', 'ID');
            const description = pick(record, 'Description', 'SubCodeName', 'CodeDescription', 'Name');
            const createdBy = pick(record, 'CreatedBy', 'createdBy', 'OperatedBy', 'operatedBy');
            const createdOn = pick(record, 'CreatedOn', 'createdOn', 'OperatedOn', 'operatedOn');
            const supervisedBy = pick(record, 'SupervisedBy', 'supervisedBy', 'ApprovedBy', 'approvedBy');
            const supervisedOn = pick(record, 'SupervisedOn', 'supervisedOn', 'ApprovedOn', 'approvedOn');

            return '<tr data-subcode-id="' + escapeHtml(subCodeId) + '" data-description="' + escapeHtml(description) + '" data-created-by="' + escapeHtml(createdBy) + '" data-created-on="' + escapeHtml(createdOn) + '" data-supervised-by="' + escapeHtml(supervisedBy) + '" data-supervised-on="' + escapeHtml(supervisedOn) + '"><td>' + escapeHtml(subCodeId) + '</td><td>' + escapeHtml(description) + '</td></tr>';
        }).join('');

        qsa('tr[data-subcode-id]', tbody).forEach(function (row) {
            row.addEventListener('click', handleSubCodeRowClick);
        });
    }

    function handleSubCodeRowClick(event) {
        if (state.currentMode !== MODES.EDIT) {
            return;
        }

        const row = event.currentTarget;
        const tbody = row.closest('tbody');
        qsa('tr', tbody).forEach(function (item) { item.classList.remove('table-primary'); });
        row.classList.add('table-primary');

        const record = state.subCodes.find(function (item) {
            return !item._isDeleted && pick(item, 'SubCodeID', 'subCodeID', 'SubCode', 'ID') === (row.dataset.subcodeId || '');
        }) || {
            SubCodeID: row.dataset.subcodeId || '',
            Description: row.dataset.description || '',
            CreatedBy: row.dataset.createdBy || '',
            CreatedOn: row.dataset.createdOn || '',
            SupervisedBy: row.dataset.supervisedBy || '',
            SupervisedOn: row.dataset.supervisedOn || ''
        };

        state.lastLoadedRecord = cloneSubCodeRecord(record);
        setValue('SubCode', record.SubCodeID);
        setValue('Description', record.Description);
        populateBehindTheScene(record);
        updateGridButtons();
        showInfoToast('Selected sub-code: ' + record.SubCodeID);
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function handleClearForm() {
        setValue('SubCode', '');
        setValue('Description', '');
        clearBehindTheScene();
        state.lastLoadedRecord = null;
        state.gridAction = null;
        qsa('#subCodesTable tbody tr').forEach(function (row) { row.classList.remove('table-primary'); });
        updateGridButtons();
    }

    function handleNewSubCode() {
        if (!state.selectedCodeId) {
            showErrorToast('Please select a Code Type first');
            return;
        }

        state.gridAction = 'new';
        state.lastLoadedRecord = null;
        setValue('SubCode', '');
        setValue('Description', '');
        clearBehindTheScene();
        qsa('#subCodesTable tbody tr').forEach(function (row) { row.classList.remove('table-primary'); });
        updateGridButtons();
        qs('#SubCode') && qs('#SubCode').focus();
        showInfoToast('Enter new sub-code details');
    }

    function handleAlterSubCode() {
        if (!state.lastLoadedRecord) {
            showErrorToast('Please select a sub-code to alter');
            return;
        }

        state.gridAction = 'alter';
        updateGridButtons();
        qs('#Description') && qs('#Description').focus();
        showInfoToast('Modify the description and click Update');
    }

    function handleRemoveSubCode() {
        const subCodeId = getValue('SubCode').trim();
        if (!subCodeId) {
            showErrorToast('Please select a sub-code to remove');
            return;
        }

        if (!window.confirm('Remove sub-code "' + subCodeId + '"?')) {
            return;
        }

        state.subCodes = state.subCodes.reduce(function (accumulator, record) {
            if (pick(record, 'SubCodeID', 'subCodeID', 'SubCode', 'ID') !== subCodeId) {
                accumulator.push(record);
                return accumulator;
            }

            if (record._isNew) {
                return accumulator;
            }

            accumulator.push(Object.assign({}, record, {
                _isDeleted: true,
                _isModified: false
            }));
            return accumulator;
        }, []);

        renderSubCodesTable(state.subCodes);
        handleClearForm();
        showSuccessToast('Sub-code "' + subCodeId + '" removed');
    }

    function hasRecordChanged(existingRecord, subCodeId, description) {
        return pick(existingRecord, 'SubCodeID', 'subCodeID', 'SubCode', 'ID') !== subCodeId ||
            pick(existingRecord, 'Description', 'SubCodeName', 'CodeDescription', 'Name') !== description;
    }

    function handleUpdateSubCode() {
        const subCodeId = getValue('SubCode').trim();
        const description = getValue('Description').trim();

        if (!subCodeId) {
            showErrorToast('Please enter a Sub Code ID');
            return;
        }

        if (!state.selectedCodeId) {
            showErrorToast('Please select a Code Type first');
            return;
        }

        const existingIndex = state.subCodes.findIndex(function (record) {
            return pick(record, 'SubCodeID', 'subCodeID', 'SubCode', 'ID') === subCodeId;
        });

        if (existingIndex >= 0) {
            const existingRecord = state.subCodes[existingIndex];
            const isChanged = hasRecordChanged(existingRecord, subCodeId, description);

            state.subCodes[existingIndex] = Object.assign({}, existingRecord, {
                SubCodeID: subCodeId,
                Description: description,
                _isDeleted: false,
                _isModified: existingRecord._isNew ? false : isChanged,
                _isNew: !!existingRecord._isNew
            });
            showSuccessToast('Sub-code "' + subCodeId + '" updated');
        } else {
            state.subCodes.push({
                SubCodeID: subCodeId,
                Description: description,
                CreatedBy: '',
                CreatedOn: '',
                SupervisedBy: '',
                SupervisedOn: '',
                _isNew: true,
                _isModified: false,
                _isDeleted: false
            });
            showSuccessToast('Sub-code "' + subCodeId + '" added');
        }

        state.recordNotFound = false;
        state.gridAction = null;
        state.lastLoadedRecord = null;
        renderSubCodesTable(state.subCodes);
        handleClearForm();
        updateGridButtons();
    }

    function handleView() {
        const codeId = getValue('CodeID').trim();
        if (!codeId) {
            showErrorToast('Please enter a Code ID first');
            return;
        }

        loadCodeDetails(codeId);
        setMode(MODES.VIEW);
    }

    function handleAdd() {
        if (!state.selectedCodeId) {
            showErrorToast('Please select a Code Type first (use View/Search)');
            return;
        }

        setMode(MODES.ADD);
        showInfoToast('Add mode - You can now add new sub-codes');
    }

    function handleEdit() {
        if (!state.selectedCodeId) {
            showErrorToast('Please select a Code Type first');
            return;
        }

        setMode(MODES.EDIT);
        showInfoToast('Edit mode - Select a sub-code to modify');
    }

    function handleCancel() {
        setValue('CodeID', '');
        setValue('CodeName', '');
        setValue('SubCode', '');
        setValue('Description', '');
        clearBehindTheScene();
        state.lastLoadedRecord = null;
        state.gridAction = null;
        state.subCodes = [];
        state.recordNotFound = false;
        state.selectedCodeId = null;
        state.selectedCodeName = '';
        renderSubCodesTable([]);
        setMode(MODES.VIEW);
        hideValidationSummary();
    }

    async function handleSave() {
        if (!state.selectedCodeId) {
            showErrorToast('Please select a Code Type first');
            return;
        }

        const pendingChanges = toSaveSubCodes();
        if (!pendingChanges.length) {
            showInfoToast('No changes to save');
            return;
        }

        try {
            const response = await postJson(API.SAVE, {
                ID: state.selectedCodeId,
                SubCodes: pendingChanges
            });

            if (response && response.success === false) {
                showErrorToast(response.message || getResponseMessage(response, 'Failed to save sub-codes'));
                return;
            }

            const message = response && response.success === true
                ? (response.message || 'Saved successfully.')
                : getResponseMessage(response, 'Saved successfully.');
            const selectedCodeId = state.selectedCodeId;

            showSuccessToast(message || ('Saved branch user code details for ' + selectedCodeId));
            setMode(MODES.VIEW);
            await loadCodeDetails(selectedCodeId, { quiet: true });
            handleClearForm();
        } catch (error) {
            showErrorToast(error && error.message ? error.message : 'Failed to save sub-codes');
        }
    }

    async function loadCodeDetails(codeId, options) {
        const config = options || {};

        if (!codeId) {
            renderSubCodesTable([]);
            clearBehindTheScene();
            return;
        }

        try {
            const response = await postJson(API.GET, { ID: codeId });

            if (response && response.success === false) {
                throw new Error(response.message || 'Failed to load code details');
            }

            const subCodes = normalizeResults(response);
            let description = getValue('CodeName').trim();
            if (!description) {
                description = await resolveCodeTypeDescription(codeId);
            }

            state.subCodes = normalizeLoadedSubCodes(subCodes);
            state.selectedCodeId = codeId;
            state.selectedCodeName = description;
            state.gridAction = null;
            state.recordNotFound = subCodes.length === 0;
            state.lastLoadedRecord = null;

            renderSubCodesTable(state.subCodes);
            updateSelectedCode(codeId, description);
            setValue('SubCode', '');
            setValue('Description', '');

            if (subCodes.length > 0) {
                populateBehindTheScene(subCodes[0]);
            } else {
                clearBehindTheScene();
            }

            updateActionButtons();
            updateGridButtons();

            if (!config.quiet) {
                if (subCodes.length > 0) {
                    showSuccessMessage('Loaded ' + subCodes.length + ' sub-code(s) for ' + codeId);
                } else {
                    showInfoToast('No sub-codes found for ' + codeId + '. Click Add to create.');
                }
            }
        } catch (error) {
            renderSubCodesTable([]);
            state.subCodes = [];
            state.lastLoadedRecord = null;
            state.selectedCodeId = null;
            state.selectedCodeName = '';
            setValue('CodeName', '');
            clearBehindTheScene();
            if (!config.quiet) {
                showErrorToast(error && error.message ? error.message : 'Failed to load code details');
            }
        }
    }

    function wireSearchButton() {
        const codeIdField = qs('#CodeID');
        if (!codeIdField) return;

        codeIdField.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            const codeId = codeIdField.value.trim();
            if (!codeId) return;

            resolveCodeTypeDescription(codeId)
                .then(function (description) {
                    updateSelectedCode(codeId, description);
                })
                .finally(function () {
                    loadCodeDetails(codeId);
                });
        });

        codeIdField.addEventListener('blur', function () {
            const codeId = codeIdField.value.trim();
            if (!codeId || codeId === state.selectedCodeId) return;
            resolveCodeTypeDescription(codeId)
                .then(function (description) {
                    updateSelectedCode(codeId, description);
                })
                .finally(function () {
                    loadCodeDetails(codeId, { quiet: true });
                });
        });
    }

    function handleActionButton(event) {
        const action = event.currentTarget.dataset.brucAction;

        switch (action) {
            case 'view': handleView(); break;
            case 'add': handleAdd(); break;
            case 'edit': handleEdit(); break;
            case 'save': handleSave(); break;
            case 'cancel': handleCancel(); break;
            case 'search':
                openLookup('codeType');
                break;
        }
    }

    function handleGridButton(event) {
        const action = event.currentTarget.dataset.brucGridAction;

        switch (action) {
            case 'new': handleNewSubCode(); break;
            case 'alter': handleAlterSubCode(); break;
            case 'remove': handleRemoveSubCode(); break;
            case 'update': handleUpdateSubCode(); break;
            case 'clear': handleClearForm(); break;
        }
    }

    function initializeActionButtons() {
        qsa('[data-bruc-action]').forEach(function (button) {
            button.addEventListener('click', handleActionButton);
        });
    }

    function initializeGridButtons() {
        qsa('[data-bruc-grid-action]').forEach(function (button) {
            button.addEventListener('click', handleGridButton);
        });
    }

    function initializeSectionToggles() {
        qsa('[data-section-toggle]').forEach(function (toggle) {
            toggle.addEventListener('click', function (event) {
                event.preventDefault();
                const section = toggle.closest('.form-section');
                if (!section) return;
                section.classList.toggle('collapsed');
                const collapsed = section.classList.contains('collapsed');
                const button = qs('.section-toggle-btn', toggle);
                const icon = qs('.section-toggle-btn i', toggle);
                const content = qs('[data-section-content]', section);

                if (button) button.setAttribute('aria-expanded', String(!collapsed));
                if (content) content.style.display = collapsed ? 'none' : '';
                if (icon) {
                    icon.classList.remove('bi-chevron-up', 'bi-chevron-down');
                    icon.classList.add(collapsed ? 'bi-chevron-down' : 'bi-chevron-up');
                }
            });
        });
    }

    function initialize() {
        wireSearchButton();
        initializeActionButtons();
        initializeGridButtons();
        initializeSectionToggles();
        setMode(MODES.VIEW, { initial: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();