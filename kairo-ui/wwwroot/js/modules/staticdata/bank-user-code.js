(function () {
    'use strict';

    if (window.__kairoBankUserCodeLoaded) return;
    window.__kairoBankUserCodeLoaded = true;

    const MODES = {
        VIEW: 'view',
        ADD: 'add',
        EDIT: 'edit'
    };

    const API = {
        GET: '/BankUserCode/api/get',
        SAVE: '/BankUserCode/api/save'
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
    let knownCodeTypes = [];

    let codeSearchModal = null;
    let codeSearchState = {
        allResults: []
    };

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

    function normalizeResults(response) {
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

    async function ensureKnownCodeTypesLoaded() {
        if (knownCodeTypes.length) {
            return knownCodeTypes;
        }

        if (systemUtilitiesService && typeof systemUtilitiesService.getBankUserCodeTypes === 'function') {
            knownCodeTypes = await systemUtilitiesService.getBankUserCodeTypes();
        }

        return knownCodeTypes;
    }

    function findKnownCodeType(codeId) {
        const normalizedCodeId = String(codeId || '').trim().toLowerCase();
        if (!normalizedCodeId) {
            return null;
        }

        if (systemUtilitiesService && typeof systemUtilitiesService.findBankUserCodeType === 'function') {
            return systemUtilitiesService.findBankUserCodeType(codeId);
        }

        return knownCodeTypes.find(function (item) {
            return String(item.ID || '').trim().toLowerCase() === normalizedCodeId;
        }) || null;
    }

    async function searchKnownCodeTypes(criteria) {
        await ensureKnownCodeTypesLoaded();

        if (systemUtilitiesService && typeof systemUtilitiesService.searchBankUserCodeTypes === 'function') {
            return systemUtilitiesService.searchBankUserCodeTypes(criteria);
        }

        return knownCodeTypes.slice();
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
        const host = qs('#bankUserCodeModule');
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

        const newButton = qs('[data-buc-action="new"]');
        const alterButton = qs('[data-buc-action="alter"]');
        const removeButton = qs('[data-buc-action="remove"]');
        const updateButton = qs('[data-buc-action="update"]');
        const clearButton = qs('[data-buc-action="clear"]');
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
            view: qs('[data-buc-action="view"]'),
            add: qs('[data-buc-action="add"]'),
            edit: qs('[data-buc-action="edit"]'),
            save: qs('[data-buc-action="save"]'),
            cancel: qs('[data-buc-action="cancel"]')
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

        const form = qs('#bank-user-code-form');
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
            tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted py-4">No sub-codes found.</td></tr>';
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

        if (!getVisibleSubCodes().length) {
            state.recordNotFound = true;
        }

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

            const message = getResponseMessage(response, 'Saved successfully.');
            const count = getVisibleSubCodes().length;
            const selectedCodeId = state.selectedCodeId;

            if (count > 0) {
                showSuccessToast(message || ('Saved ' + count + ' sub-code(s) for ' + selectedCodeId));
            } else {
                showSuccessToast(message || ('Removed all sub-codes for ' + selectedCodeId));
            }

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
            const subCodes = normalizeResults(response);
            const knownCodeType = findKnownCodeType(codeId);

            state.subCodes = normalizeLoadedSubCodes(subCodes);
            state.selectedCodeId = codeId;
            state.selectedCodeName = knownCodeType ? knownCodeType.Description : getValue('CodeName').trim();
            state.gridAction = null;
            state.recordNotFound = subCodes.length === 0;
            state.lastLoadedRecord = null;

            renderSubCodesTable(state.subCodes);
            updateSelectedCode(codeId, knownCodeType ? knownCodeType.Description : state.selectedCodeName);
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
            state.recordNotFound = false;
            setValue('CodeName', '');
            clearBehindTheScene();
            if (!config.quiet) {
                showErrorToast(error && error.message ? error.message : 'Failed to load code details');
            }
        }
    }

    function createCodeSearchModal() {
        if (qs('#codeSearchModal')) return;

        document.body.insertAdjacentHTML('beforeend', [
            '<div class="modal fade" id="codeSearchModal" tabindex="-1" aria-labelledby="codeSearchModalLabel" aria-hidden="true">',
            '  <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">',
            '    <div class="modal-content">',
            '      <div class="modal-header" style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%);">',
            '        <h5 class="modal-title text-white" id="codeSearchModalLabel">System Sub Code</h5>',
            '        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>',
            '      </div>',
            '      <div class="modal-body">',
            '        <form id="codeSearchForm">',
            '          <div class="row g-3 align-items-end">',
            '            <div class="col-md-6">',
            '              <div class="d-flex align-items-center gap-2">',
            '                <label class="form-label mb-0" style="min-width: 100px;">Account Type</label>',
            '                <select id="codeSearchIdMode" class="form-select form-select-sm" style="width: 90px;">',
            '                  <option value="Like">Like</option>',
            '                  <option value="Exact">Exact</option>',
            '                </select>',
            '                <input type="text" id="codeSearchId" class="form-control form-control-sm">',
            '              </div>',
            '            </div>',
            '            <div class="col-md-6">',
            '              <div class="d-flex align-items-center gap-2">',
            '                <label class="form-label mb-0" style="min-width: 100px;">Description</label>',
            '                <select id="codeSearchDescMode" class="form-select form-select-sm" style="width: 90px;">',
            '                  <option value="Like">Like</option>',
            '                  <option value="Exact">Exact</option>',
            '                </select>',
            '                <input type="text" id="codeSearchDesc" class="form-control form-control-sm">',
            '              </div>',
            '            </div>',
            '          </div>',
            '          <div class="text-center mt-3">',
            '            <button type="submit" id="codeSearchSubmit" class="btn btn-secondary px-4">Search</button>',
            '          </div>',
            '        </form>',
            '      </div>',
            '      <div class="modal-results px-3 pb-3">',
            '        <div class="mb-2" style="background: #e8f4fc; padding: 6px 12px; border-left: 3px solid #1e7cc4;">',
            '          <strong>Search Results</strong>',
            '        </div>',
            '        <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">',
            '          <table class="table table-sm table-hover align-middle mb-0">',
            '            <thead style="background: #1e7cc4; color: white; position: sticky; top: 0;">',
            '              <tr><th style="width: 40px; color: white;">#</th><th style="color: white;">SubCodeID</th><th style="color: white;">Description</th></tr>',
            '            </thead>',
            '            <tbody id="codeSearchResults"></tbody>',
            '          </table>',
            '        </div>',
            '        <div id="codeSearchEmpty" class="text-center py-4 text-muted">Enter search criteria and click Search.</div>',
            '        <div id="codeSearchLoading" class="d-none text-center py-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>',
            '      </div>',
            '      <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button></div>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join(''));

        wireCodeSearchModalEvents();
    }

    function wireCodeSearchModalEvents() {
        const form = qs('#codeSearchForm');
        if (form) {
            form.addEventListener('submit', handleCodeSearch);
        }
        const tbody = qs('#codeSearchResults');
        if (tbody) {
            tbody.addEventListener('click', handleCodeResultClick);
        }
    }

    function openCodeSearchModal() {
        createCodeSearchModal();
        const element = qs('#codeSearchModal');
        if (!element) return;

        qs('#codeSearchForm') && qs('#codeSearchForm').reset();
        qs('#codeSearchResults').innerHTML = '';
        qs('#codeSearchEmpty').classList.remove('d-none');
        qs('#codeSearchEmpty').textContent = 'Loading all code types...';

        if (!codeSearchModal) {
            codeSearchModal = new bootstrap.Modal(element);
        }

        codeSearchModal.show();
        window.setTimeout(function () {
            handleCodeSearch();
            qs('#codeSearchId') && qs('#codeSearchId').focus();
        }, 220);
    }

    function handleCodeSearch(event) {
        if (event) event.preventDefault();

        const searchId = (qs('#codeSearchId') && qs('#codeSearchId').value || '').trim().toLowerCase();
        const searchIdMode = qs('#codeSearchIdMode') && qs('#codeSearchIdMode').value || 'Like';
        const description = (qs('#codeSearchDesc') && qs('#codeSearchDesc').value || '').trim().toLowerCase();
        const descriptionMode = qs('#codeSearchDescMode') && qs('#codeSearchDescMode').value || 'Like';
        const tbody = qs('#codeSearchResults');
        const empty = qs('#codeSearchEmpty');
        const loader = qs('#codeSearchLoading');

        if (tbody) tbody.innerHTML = '';
        if (empty) empty.classList.add('d-none');
        if (loader) loader.classList.remove('d-none');

        searchKnownCodeTypes({
            codeId: searchId,
            codeIdMode: searchIdMode,
            description: description,
            descriptionMode: descriptionMode
        }).then(function (results) {
            codeSearchState.allResults = results;
            renderCodeSearchResults();

            if (results.length) {
                showSuccessToast('Found ' + results.length + ' code type(s)');
            } else if (empty) {
                empty.textContent = 'No code types found matching your criteria.';
                empty.classList.remove('d-none');
            }
        }).catch(function (error) {
            if (empty) {
                empty.textContent = 'Failed to search code types. Please try again.';
                empty.classList.remove('d-none');
            }
            showErrorToast(error && error.message ? error.message : 'Failed to search code types');
        }).finally(function () {
            if (loader) loader.classList.add('d-none');
        });
    }

    function renderCodeSearchResults() {
        const tbody = qs('#codeSearchResults');
        const empty = qs('#codeSearchEmpty');
        if (!tbody) return;

        const results = codeSearchState.allResults || [];
        if (!results.length) {
            tbody.innerHTML = '';
            if (empty) {
                empty.textContent = 'No code types found.';
                empty.classList.remove('d-none');
            }
            return;
        }

        if (empty) empty.classList.add('d-none');
        tbody.innerHTML = results.map(function (item, index) {
            const background = index % 2 === 0 ? '#ffffff' : '#e8f4fc';
            return '<tr data-code-id="' + escapeHtml(item.ID) + '" data-description="' + escapeHtml(item.Description) + '" style="cursor: pointer; background: ' + background + ';"><td>' + (index + 1) + '</td><td>' + escapeHtml(item.ID) + '</td><td>' + escapeHtml(item.Description) + '</td></tr>';
        }).join('');
    }

    function handleCodeResultClick(event) {
        const row = event.target.closest('tr');
        if (!row) return;

        const codeId = row.dataset.codeId || '';
        const description = row.dataset.description || '';
        updateSelectedCode(codeId, description);

        if (codeSearchModal) {
            codeSearchModal.hide();
        }

        showInfoToast('Selected: ' + codeId + ' - ' + description);
        loadCodeDetails(codeId);
    }

    function wireSearchButton() {
        const lookupButton = qs('.kairo-user-control__lookup');
        if (lookupButton) {
            lookupButton.addEventListener('click', openCodeSearchModal);
        }

        const codeIdField = qs('#CodeID');
        if (!codeIdField) return;

        codeIdField.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            const codeId = codeIdField.value.trim();
            if (!codeId) return;

            const selected = findKnownCodeType(codeId);
            updateSelectedCode(codeId, selected ? selected.Description : '');
            loadCodeDetails(codeId);
        });

        codeIdField.addEventListener('blur', function () {
            const codeId = codeIdField.value.trim();
            if (!codeId || codeId === state.selectedCodeId) return;
            const selected = findKnownCodeType(codeId);
            updateSelectedCode(codeId, selected ? selected.Description : '');
            loadCodeDetails(codeId, { quiet: true });
        });
    }

    function handleActionButton(event) {
        const action = event.currentTarget.dataset.bucAction;

        switch (action) {
            case 'view': handleView(); break;
            case 'add': handleAdd(); break;
            case 'edit': handleEdit(); break;
            case 'save': handleSave(); break;
            case 'cancel': handleCancel(); break;
            case 'new': handleNewSubCode(); break;
            case 'alter': handleAlterSubCode(); break;
            case 'remove': handleRemoveSubCode(); break;
            case 'update': handleUpdateSubCode(); break;
            case 'clear': handleClearForm(); break;
        }
    }

    function initializeActionButtons() {
        qsa('[data-buc-action]').forEach(function (button) {
            button.addEventListener('click', handleActionButton);
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
        ensureKnownCodeTypesLoaded().catch(function () { return []; });
        wireSearchButton();
        initializeActionButtons();
        initializeSectionToggles();
        setMode(MODES.VIEW, { initial: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();