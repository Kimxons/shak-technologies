(function () {
    'use strict';

    const MODES = { VIEW: 'View', ADD: 'Add', EDIT: 'Edit' };
    const SECTION_LABELS = {
        banks: 'Bank Details',
        limits: 'Bank Limit Maintenance',
        signatories: 'Clearing Bank Signatories',
        branches: 'Clearing Branches'
    };
    const LOOKUP_CONFIG = {
        bank: {
            tableID: 'MastClrBankID',
            title: 'Find Bank',
            moduleID: '2015',
            searchFields: [
                { name: 'bankId', label: 'Bank ID', column: 'BankID' },
                { name: 'bankName', label: 'Bank Name', column: 'BankName' }
            ],
            displayFields: [
                { key: 'BankID', label: 'Bank ID' },
                { key: 'BankName', label: 'Bank Name' }
            ]
        },
        client: {
            tableID: 'ClientID',
            title: 'Find Client',
            moduleID: '0',
            searchFields: [
                { name: 'clientId', label: 'Client ID', column: 'ClientID' },
                { name: 'clientName', label: 'Client Name', column: 'Name' }
            ],
            displayFields: [
                { key: 'ClientID', label: 'Client ID' },
                { key: 'Name', label: 'Client Name' }
            ]
        },
        currency: {
            tableID: 'MastCurrencyID',
            title: 'Find Currency',
            searchFields: [
                { name: 'currencyId', label: 'Currency ID', column: 'CurrencyID' },
                { name: 'description', label: 'Description', column: 'Description' }
            ],
            displayFields: [
                { key: 'CurrencyID', label: 'Currency ID' },
                { key: 'Description', label: 'Description' }
            ]
        },
        branch: {
            tableID: 'ClearingBranchID',
            title: 'Find Clearing Branch',
            moduleID: '2020',
            searchFields: [
                { name: 'branchId', label: 'Branch ID', column: 'ClearingBranchID' },
                { name: 'branchName', label: 'Branch Name', column: 'ClearingBranchName' }
            ],
            displayFields: [
                { key: 'ClearingBranchID', label: 'Branch ID' },
                { key: 'ClearingBranchName', label: 'Branch Name' }
            ]
        }
    };

    const state = {
        mode: MODES.VIEW,
        activeSection: 'banks',
        bankLoaded: false,
        currentBankRow: null,
        currentBranchRow: null,
        currentSignatoryRow: null,
        currentLimitRow: null,
        branchRows: [],
        signatoryRows: [],
        limitRows: [],
        bankUpdateCount: 0,
        branchUpdateCount: 0,
        signatoryUpdateCount: 0,
        limitUpdateCount: 0,
        canAdd: false
    };

    const service = window.OtherStaticDataService;
    let searchModal = null;

    function qs(selector, root) {
        return (root || document).querySelector(selector);
    }

    function qsa(selector, root) {
        return Array.from((root || document).querySelectorAll(selector));
    }

    function showToast(message, type) {
        if (window.AppCore && typeof window.AppCore.showNotification === 'function') {
            window.AppCore.showNotification(message, type === 'danger' ? 'error' : type || 'info');
            return;
        }

        if (window.AppCore && typeof window.AppCore.showToastMessage === 'function') {
            window.AppCore.showToastMessage(message, type === 'danger' ? 'error' : type || 'info');
            return;
        }

        if (window.NotificationService && typeof window.NotificationService.showToast === 'function') {
            window.NotificationService.showToast(message, type === 'danger' ? 'error' : type || 'info', type === 'danger' ? 5000 : 3000);
            return;
        }
        console[type === 'danger' ? 'error' : 'log'](message);
    }

    async function showAlertDialog(title, message) {
        if (window.AppCore && typeof window.AppCore.showAlert === 'function') {
            await window.AppCore.showAlert(title, message);
            return;
        }

        showToast(message, title === 'Error' ? 'danger' : 'warning');
    }

    async function showConfirmationDialog(title, message) {
        if (window.AppCore && typeof window.AppCore.showConfirmation === 'function') {
            return window.AppCore.showConfirmation(title, message);
        }

        return window.confirm(message);
    }

    function getEnv() {
        const e = window.Environment || {};
        let session = null;
        try {
            const raw = localStorage.getItem('nimble_auth_session');
            if (raw) {
                session = JSON.parse(raw);
            }
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

    function getSectionRoot(sectionKey) {
        return qs('[data-section="' + sectionKey + '"]');
    }

    function getConfiguredInitialSection() {
        const moduleRoot = qs('#bankMasterModule');
        const configured = moduleRoot ? String(moduleRoot.getAttribute('data-initial-section') || '').trim().toLowerCase() : '';
        return Object.prototype.hasOwnProperty.call(SECTION_LABELS, configured) ? configured : 'banks';
    }

    function setInlineAlert(sectionKey, message) {
        const alert = qs('[data-inline-alert="' + sectionKey + '"]');
        const text = qs('[data-inline-alert-text="' + sectionKey + '"]');
        if (!alert || !text) {
            return;
        }

        if (!message) {
            alert.classList.add('d-none');
            alert.setAttribute('hidden', '');
            return;
        }

        text.textContent = message;
        alert.classList.remove('d-none');
        alert.removeAttribute('hidden');
    }

    function clearAlerts() {
        Object.keys(SECTION_LABELS).forEach(function (key) {
            setInlineAlert(key, '');
        });
    }

    function initSearchModal() {
        if (!searchModal && typeof window.SearchModal === 'function' && window.AppCore) {
            searchModal = new window.SearchModal(window.AppCore);
        }
    }

    function openLookup(key, onSelect) {
        initSearchModal();
        if (!searchModal) {
            showToast('Search modal is unavailable.', 'warning');
            return;
        }

        const config = LOOKUP_CONFIG[key];
        const env = getEnv();

        searchModal.open({
            title: config.title,
            tableID: config.tableID,
            searchFields: config.searchFields,
            displayFields: config.displayFields,
            moduleID: config.moduleID,
            ourbranchId: env.ourBranchId,
            onSelect: onSelect
        });
    }

    function openBranchLookup(onSelect) {
        initSearchModal();
        if (!searchModal) {
            showToast('Search modal is unavailable.', 'warning');
            return;
        }

        const env = getEnv();
        const bankId = getCurrentBankId();
        if (!bankId) {
            showToast('Load a bank first.', 'warning');
            return;
        }

        const config = LOOKUP_CONFIG.branch;
        searchModal.open({
            title: config.title,
            tableID: config.tableID,
            searchFields: config.searchFields,
            displayFields: config.displayFields,
            advFilterString: `BankID='${bankId.replace(/'/g, "''")}'`,
            moduleID: config.moduleID,
            ourbranchId: env.ourBranchId,
            onSelect: onSelect
        });
    }

    function initSectionToggles() {
        qsa('[data-section-toggle]').forEach(function (header) {
            if (header.dataset.bound === '1') {
                return;
            }

            header.dataset.bound = '1';
            const section = header.closest('.form-section');
            const content = qs('[data-section-content]', section);
            const button = qs('.section-toggle-btn', header);
            const icon = qs('i.bi', button);

            const toggle = function () {
                const collapsed = content.hasAttribute('hidden');
                if (collapsed) {
                    content.removeAttribute('hidden');
                } else {
                    content.setAttribute('hidden', '');
                }

                const nextCollapsed = !collapsed;
                if (button) {
                    button.setAttribute('aria-expanded', String(!nextCollapsed));
                }
                if (icon) {
                    icon.classList.toggle('bi-chevron-up', !nextCollapsed);
                    icon.classList.toggle('bi-chevron-down', nextCollapsed);
                }
            };

            header.addEventListener('click', toggle);
            if (button) {
                button.addEventListener('click', function (event) {
                    event.stopPropagation();
                    toggle();
                });
            }
        });

        qsa('[data-inline-alert-close]').forEach(function (button) {
            button.addEventListener('click', function () {
                setInlineAlert(button.getAttribute('data-inline-alert-close'), '');
            });
        });
    }

    function setSection(sectionKey) {
        state.activeSection = sectionKey;
        const actionContext = qs('#bm_actionContext');
        const sectionSummary = qs('#bm_sectionSummary');

        qsa('.sidebar-item[data-submodule], .sidebar-item--enhanced[data-submodule]').forEach(function (button) {
            button.classList.toggle('active', button.getAttribute('data-submodule') === sectionKey);
        });

        Object.keys(SECTION_LABELS).forEach(function (key) {
            const section = getSectionRoot(key);
            if (!section) {
                return;
            }
            if (key === sectionKey) {
                section.removeAttribute('hidden');
            } else {
                section.setAttribute('hidden', '');
            }
        });

        if (actionContext) {
            actionContext.textContent = SECTION_LABELS[sectionKey] || 'Maintain Banks';
        }

        if (sectionSummary) {
            sectionSummary.textContent = state.bankLoaded
                ? 'Working with ' + (SECTION_LABELS[sectionKey] || 'Maintain Banks') + ' for bank ' + getCurrentBankId() + '.'
                : 'Load a bank to work with branch, signatory, and limit records.';
        }

        renderActionPanel();
        updateActionState();
        updateFieldAccess();
    }

    function renderActionPanel() {
        const container = qs('#bm_actionButtons');
        if (!container) {
            return;
        }

        if (state.activeSection === 'signatories') {
            container.innerHTML = [
                '<button class="btn-action" type="button" id="submoduleBtnSignature"><i class="bi bi-pen me-1"></i>Signature</button>',
                '<button class="btn-action" type="button" id="submoduleBtnPhoto"><i class="bi bi-image me-1"></i>Photo</button>',
                '<button class="btn-action" type="button" id="submoduleBtnBoth"><i class="bi bi-collection me-1"></i>Both</button>',
                '<button class="btn-action" type="button" id="submoduleBtnAdd"><i class="bi bi-plus-circle me-1"></i>Add</button>',
                '<button class="btn-action" type="button" id="submoduleBtnEdit"><i class="bi bi-pencil-square me-1"></i>Edit</button>',
                '<button class="btn-action" type="button" id="submoduleBtnDelete"><i class="bi bi-trash me-1"></i>Delete</button>',
                '<button class="btn-action btn-save" type="button" id="submoduleBtnSave"><i class="bi bi-save me-1"></i>Save</button>',
                '<button class="btn-action btn-cancel" type="button" id="submoduleBtnCancel"><i class="bi bi-x-circle me-1"></i>Cancel</button>',
                '<button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose"><i class="bi bi-box-arrow-right me-1"></i>Close</button>'
            ].join('');
        } else {
            container.innerHTML = [
                '<button class="btn-action btn-view" type="button" id="submoduleBtnView"><i class="bi bi-eye me-1"></i>View</button>',
                '<button class="btn-action btn-add" type="button" id="submoduleBtnAdd"><i class="bi bi-plus-circle me-1"></i>Add</button>',
                '<button class="btn-action btn-edit" type="button" id="submoduleBtnEdit"><i class="bi bi-pencil-square me-1"></i>Edit</button>',
                '<button class="btn-action btn-delete" type="button" id="submoduleBtnDelete"><i class="bi bi-trash me-1"></i>Delete</button>',
                '<button class="btn-action btn-save" type="button" id="submoduleBtnSave"><i class="bi bi-save me-1"></i>Save</button>',
                '<button class="btn-action btn-cancel" type="button" id="submoduleBtnCancel"><i class="bi bi-x-circle me-1"></i>Cancel</button>',
                '<button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose"><i class="bi bi-box-arrow-right me-1"></i>Close</button>'
            ].join('');
        }

        bindActionButtons();
    }

    function setButtonDisabled(button, disabled) {
        if (!button) {
            return;
        }
        button.disabled = !!disabled;
        button.classList.toggle('is-disabled', !!disabled);
    }

    function setMode(mode) {
        state.mode = mode;
        updateFieldAccess();
        updateActionState();
    }

    function updateFieldAccess() {
        Object.keys(SECTION_LABELS).forEach(function (sectionKey) {
            const root = getSectionRoot(sectionKey);
            if (!root) {
                return;
            }

            const editable = state.mode !== MODES.VIEW && state.activeSection === sectionKey && (sectionKey === 'banks' || state.bankLoaded);
            qsa('input, select, textarea, button.btn-lookup', root).forEach(function (element) {
                if (element.hasAttribute('data-always-enabled')) {
                    element.disabled = false;
                    return;
                }
                element.disabled = !editable;
            });
        });

        setButtonDisabled(qs('#submoduleBtnPhoto'), !state.bankLoaded || state.activeSection !== 'signatories');
        setButtonDisabled(qs('#submoduleBtnSignature'), !state.bankLoaded || state.activeSection !== 'signatories');
        setButtonDisabled(qs('#submoduleBtnBoth'), !state.bankLoaded || state.activeSection !== 'signatories');
    }

    function hasSectionRecord(sectionKey) {
        if (sectionKey === 'banks') {
            return state.bankLoaded;
        }
        if (sectionKey === 'branches') {
            return !!state.currentBranchRow;
        }
        if (sectionKey === 'signatories') {
            return !!state.currentSignatoryRow;
        }
        if (sectionKey === 'limits') {
            return !!state.currentLimitRow;
        }
        return false;
    }

    function updateActionState() {
        const editing = state.mode !== MODES.VIEW;
        const activeHasRecord = hasSectionRecord(state.activeSection);
        const allowChildActions = state.activeSection === 'banks' ? true : state.bankLoaded;

        setButtonDisabled(qs('#submoduleBtnView'), editing);
        setButtonDisabled(qs('#submoduleBtnAdd'), editing || !allowChildActions);
        setButtonDisabled(qs('#submoduleBtnEdit'), editing || !activeHasRecord);
        setButtonDisabled(qs('#submoduleBtnDelete'), editing || !activeHasRecord);
        setButtonDisabled(qs('#submoduleBtnSave'), !editing);
        setButtonDisabled(qs('#submoduleBtnCancel'), !editing && !activeHasRecord && !state.canAdd);
        setButtonDisabled(qs('#submoduleBtnClose'), false);
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function extractRows(source) {
        const rows = [];
        const seen = new Set();

        function tryParseJson(value) {
            if (typeof value !== 'string') {
                return null;
            }

            const trimmed = value.trim();
            if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) {
                return null;
            }

            try {
                return JSON.parse(trimmed);
            } catch (_) {
                return null;
            }
        }

        function isPlainObject(value) {
            return !!value && typeof value === 'object' && !Array.isArray(value);
        }

        function looksLikeStatusRow(value) {
            return isPlainObject(value) &&
                value.ResponseCode !== undefined &&
                value.ResponseMessage !== undefined &&
                Object.keys(value).length <= 4;
        }

        function walk(value) {
            if (!value) {
                return;
            }

            const parsed = tryParseJson(value);
            if (parsed) {
                walk(parsed);
                return;
            }

            if (typeof value === 'object') {
                if (seen.has(value)) {
                    return;
                }
                seen.add(value);
            }

            if (Array.isArray(value)) {
                value.forEach(walk);
                return;
            }

            if (!isPlainObject(value)) {
                return;
            }

            if (!looksLikeStatusRow(value)) {
                rows.push(value);
            }

            Object.keys(value).forEach(function (key) {
                walk(value[key]);
            });
        }

        walk(source);
        return rows;
    }

    function extractResponseMessage(response) {
        if (!response || typeof response !== 'object') {
            return '';
        }

        const keys = ['ResponseMessage', 'responseMessage', 'Message', 'message', 'StatusMessage', 'statusMessage', 'ErrorMessage', 'errorMessage'];
        for (let index = 0; index < keys.length; index += 1) {
            const value = response[keys[index]];
            if (typeof value === 'string' && value.trim()) {
                return value.trim();
            }
        }

        const rows = extractRows(response);
        for (let i = 0; i < rows.length; i += 1) {
            const message = extractResponseMessage(rows[i]);
            if (message) {
                return message;
            }
        }

        return '';
    }

    function responseSucceeded(response) {
        if (!response || typeof response !== 'object') {
            return true;
        }

        if (response.success === false || response.Success === false) {
            return false;
        }

        const code = response.ResponseCode || response.responseCode || response.Status || response.status;
        if (typeof code === 'string' && code.trim()) {
            return ['00', '0', '200', 'success', 'Details_Retrieved', 'Charge_Rate_Added'].indexOf(code.trim()) >= 0;
        }

        return true;
    }

    function toBool(value) {
        return value === true || value === 1 || value === '1' || value === 'true' || value === 'True' || value === 'Y';
    }

    function pickFirstValue(source, keys) {
        for (let index = 0; index < keys.length; index += 1) {
            const value = source ? source[keys[index]] : null;
            if (value !== undefined && value !== null && String(value).trim()) {
                return value;
            }
        }
        return '';
    }

    function normalizeIdentity(value) {
        return String(value || '').trim().toLowerCase();
    }

    function getBankRowId(row) {
        return pickFirstValue(row, ['BankID', 'bankID', 'BankId', 'bankId', 'BANKID', 'InstitutionID', 'institutionId']);
    }

    function getBankRowName(row) {
        return pickFirstValue(row, ['BankName', 'bankName', 'bankname', 'BANKNAME', 'ShortName', 'shortName', 'InstitutionName', 'institutionName', 'institutionname']);
    }

    function getLookupBankId(row) {
        return pickFirstValue(row, ['BankID', 'bankID', 'BankId', 'bankId', 'ClrBankID', 'ClearingBankID', 'ID']);
    }

    function getLookupBankName(row) {
        return pickFirstValue(row, ['BankName', 'bankName', 'ClearingBankName', 'Description', 'InstitutionName', 'Name']);
    }

    function getLookupClientId(row) {
        return pickFirstValue(row, ['ClientID', 'clientID', 'ClientId', 'clientId', 'CustomerID', 'customerId', 'ID']);
    }

    function getLookupClientName(row) {
        return pickFirstValue(row, ['ClientName', 'clientName', 'CLIENTNAME', 'Name', 'name', 'CustomerName', 'customerName', 'Description']);
    }

    function getBranchRowId(row) {
        return pickFirstValue(row, ['ClearingBranchID', 'BranchID', 'branchID', 'BranchId', 'branchId']);
    }

    function getBranchRowName(row) {
        return pickFirstValue(row, ['ClearingBranchName', 'BranchName', 'branchName', 'Name']);
    }

    function getLimitTypeName(row) {
        return pickFirstValue(row, ['LimitTypeName', 'LimitTypeDescription', 'LimitType', 'LimitTypeID', 'Description']);
    }

    function getLimitCurrencyName(row) {
        return pickFirstValue(row, ['CurrencyName', 'CurrencyDescription', 'Description', 'CurrencyID']);
    }

    function getLimitAmountValue(row) {
        return pickFirstValue(row, ['LimitAmount', 'Amount', 'Limit']);
    }

    function looksLikeBankRow(row) {
        return !!(getBankRowId(row) || getBankRowName(row));
    }

    function extractBankRows(response) {
        return extractRows(response)
            .filter(looksLikeBankRow);
    }

    async function queryBankRows(bankId, direction) {
        const env = getEnv();
        const response = await service.getBanks({
            BankID: bankId,
            OurBranchID: env.ourBranchId,
            OperatorID: env.operatorId,
            Direction: direction
        });

        return {
            response: response,
            rows: extractBankRows(response)
        };
    }

    function textValue(id) {
        const element = qs(id);
        return element ? String(element.value || '').trim() : '';
    }

    function setValue(id, value) {
        const element = qs(id);
        if (element) {
            element.value = value == null ? '' : value;
        }
    }

    function setChecked(id, value) {
        const element = qs(id);
        if (element) {
            element.checked = toBool(value);
        }
    }

    function setAudit(row) {
        qs('#bm_createdBy').textContent = row && (row.CreatedBy || row.createdBy) ? (row.CreatedBy || row.createdBy) : '-';
        qs('#bm_createdOn').textContent = row && (row.CreatedOn || row.createdOn) ? (row.CreatedOn || row.createdOn) : '-';
        qs('#bm_supervisedBy').textContent = row && (row.SupervisedBy || row.supervisedBy) ? (row.SupervisedBy || row.supervisedBy) : '-';
        qs('#bm_supervisedOn').textContent = row && (row.SupervisedOn || row.supervisedOn) ? (row.SupervisedOn || row.supervisedOn) : '-';
    }

    function getCurrentBankId() {
        return textValue('#bm_bankId');
    }

    function updateBankSummary() {
        const bankId = getCurrentBankId();
        const bankName = textValue('#bm_bankName') || textValue('#bm_bankNameSummary');
        const activeBankSummary = qs('#bm_activeBankSummary');
        if (activeBankSummary) {
            activeBankSummary.textContent = bankId ? (bankId + (bankName ? ' - ' + bankName : '')) : 'No bank selected';
        }
    }

    function syncSidebarRecordState() {
        if (!window.SidebarManager || typeof window.SidebarManager.setMainRecordLoaded !== 'function') {
            return;
        }

        window.SidebarManager.setMainRecordLoaded(state.bankLoaded, state.bankLoaded ? getCurrentBankId() : null);
    }

    function clearImagePreview() {
        qs('#bm_photoPreview').removeAttribute('src');
        qs('#bm_signaturePreview').removeAttribute('src');
    }

    function applyBankRow(row, bankId) {
        state.currentBankRow = row;
        state.bankLoaded = true;
        state.bankUpdateCount = Number(pickFirstValue(row, ['UpdateCount', 'updateCount']) || 0);
        setValue('#bm_bankId', getBankRowId(row) || bankId || '');
        setValue('#bm_bankNameSummary', getBankRowName(row) || '');
        setValue('#bm_bankName', pickFirstValue(row, ['BankName', 'bankName', 'BANKNAME']) || getBankRowName(row) || '');
        setValue('#bm_shortName', pickFirstValue(row, ['ShortName', 'shortName', 'SHORTNAME']));
        setValue('#bm_institutionTypeId', pickFirstValue(row, ['InstitutionTypeID', 'institutionTypeID', 'InstitutionTypeId', 'institutionTypeId']));
        setValue('#bm_creditRating', pickFirstValue(row, ['CreditRating', 'creditRating']));
        setValue('#bm_clientId', pickFirstValue(row, ['ClientID', 'clientID', 'ClientId', 'clientId']));
        setValue('#bm_clientName', pickFirstValue(row, ['ClientName', 'clientName', 'CLIENTNAME', 'Name']));
        setValue('#bm_clearingThrough', pickFirstValue(row, ['ClearingThrough', 'clearingThrough']));
        setValue('#bm_clearingThroughName', pickFirstValue(row, ['ClearingThroughName', 'clearingThroughName', 'ClearingBankName']));
        setValue('#bm_clearingAccountId', pickFirstValue(row, ['ClearingAccountID', 'clearingAccountID', 'ClearingAccountId', 'clearingAccountId']));
        setValue('#bm_bankAccountId', pickFirstValue(row, ['BankAccountID', 'bankAccountID', 'BankAccountId', 'bankAccountId']));
        setValue('#bm_limitClientId', pickFirstValue(row, ['ClientID', 'clientID', 'ClientId', 'clientId']));
        setValue('#bm_limitClientName', pickFirstValue(row, ['ClientName', 'clientName', 'CLIENTNAME', 'Name']));
        setChecked('#bm_isLocalClearing', pickFirstValue(row, ['IsLocalClearingBank', 'isLocalClearingBank']));
        setChecked('#bm_isForeignClearing', pickFirstValue(row, ['IsForeignClearingBank', 'isForeignClearingBank']));
        setAudit(row);
        updateBankSummary();
        syncSidebarRecordState();
    }

    function clearBankForm(keepId) {
        const currentId = textValue('#bm_bankId');
        setValue('#bm_bankId', keepId ? currentId : '');
        setValue('#bm_bankNameSummary', '');
        setValue('#bm_bankName', '');
        setValue('#bm_shortName', '');
        setValue('#bm_institutionTypeId', '');
        setValue('#bm_creditRating', '');
        setValue('#bm_clientId', '');
        setValue('#bm_clientName', '');
        setValue('#bm_clearingThrough', '');
        setValue('#bm_clearingThroughName', '');
        setValue('#bm_clearingAccountId', '');
        setValue('#bm_bankAccountId', '');
        setChecked('#bm_isLocalClearing', false);
        setChecked('#bm_isForeignClearing', false);
        setAudit(null);
        state.currentBankRow = null;
        state.bankLoaded = false;
        state.bankUpdateCount = 0;
        clearChildCollections();
        updateBankSummary();
        syncSidebarRecordState();
    }

    function clearChildCollections() {
        state.currentBranchRow = null;
        state.currentSignatoryRow = null;
        state.currentLimitRow = null;
        state.branchRows = [];
        state.signatoryRows = [];
        state.limitRows = [];
        clearBranchForm(false);
        clearSignatoryForm(false);
        clearLimitForm(false);
        renderBranches();
        renderSignatories();
        renderLimits();
    }

    async function loadBank(bankId, silent, fallbackRecord, useDialogAlerts) {
        const id = String(bankId || getCurrentBankId()).trim();
        if (!id) {
            if (useDialogAlerts) {
                await showAlertDialog('Warning', 'Enter or select a Bank ID.');
            } else {
                showToast('Enter or select a Bank ID.', 'warning');
            }
            return;
        }

        try {
            clearAlerts();
            const normalizedId = normalizeIdentity(id);
            const exactLookup = await queryBankRows(id, 0);

            let row = exactLookup.rows.find(function (candidate) {
                return normalizeIdentity(getBankRowId(candidate)) === normalizedId;
            }) || null;

            if (!row) {
                const forwardLookup = await queryBankRows(id, 1);
                row = forwardLookup.rows.find(function (candidate) {
                    return normalizeIdentity(getBankRowId(candidate)) === normalizedId;
                }) || null;
            }

            if (!row && fallbackRecord && normalizeIdentity(getLookupBankId(fallbackRecord)) === normalizedId) {
                row = fallbackRecord;
            }

            if (!row) {
                clearBankForm(true);
                state.canAdd = true;
                setMode(MODES.VIEW);
                if (useDialogAlerts) {
                    await showAlertDialog('Record Not Found', 'Record does not exist. Click Add to create it.');
                } else {
                    showToast('Bank record not found.', 'warning');
                }
                return;
            }

            applyBankRow(row, id);
            state.canAdd = false;
            setMode(MODES.VIEW);
            await loadChildSections();
            if (!silent) {
                showToast('Bank loaded.', 'success');
            }
        } catch (error) {
            if (useDialogAlerts) {
                await showAlertDialog('Error', 'Bank lookup failed.');
            } else {
                showToast('Bank lookup failed.', 'danger');
            }
        }
    }

    async function loadChildSections() {
        if (!state.bankLoaded) {
            clearChildCollections();
            return;
        }

        await Promise.all([
            loadBranches(true),
            loadSignatories(true),
            loadLimits(true)
        ]);
    }

    function applyBranchRow(row) {
        state.currentBranchRow = row;
        state.branchUpdateCount = Number(row.UpdateCount || 0);
        setValue('#bm_branchId', getBranchRowId(row));
        setValue('#bm_branchNameSummary', getBranchRowName(row));
        setValue('#bm_branchTypeId', row.BranchTypeID || '');
        setValue('#bm_branchName', getBranchRowName(row));
        setValue('#bm_branchAddress1', row.Address1 || '');
        setValue('#bm_branchAddress2', row.Address2 || '');
        setValue('#bm_branchCityId', row.CityID || '');
        setValue('#bm_branchCountryId', row.CountryID || '');
        setValue('#bm_branchZipCode', row.ZipCode || '');
        setValue('#bm_branchPhone1', row.Phone1 || '');
        setValue('#bm_branchPhone2', row.Phone2 || '');
        setValue('#bm_branchMobile', row.Mobile || '');
        setValue('#bm_branchEmail', row.EMail || row.EMailID || '');
        setValue('#bm_branchFax', row.Fax || '');
        setValue('#bm_branchSwiftCode', row.SWIFTCode || '');
        setValue('#bm_branchRemarks', row.Remarks || '');
        setChecked('#bm_isUpcountry', row.IsUpcountry);
        setValue('#bm_clearingCenter', row.ClearingDays || row.ClearingCenter || '');
        setAudit(row);
    }

    function clearBranchForm(keepId) {
        const currentId = textValue('#bm_branchId');
        setValue('#bm_branchId', keepId ? currentId : '');
        setValue('#bm_branchNameSummary', '');
        setValue('#bm_branchTypeId', '');
        setValue('#bm_branchName', '');
        setValue('#bm_branchAddress1', '');
        setValue('#bm_branchAddress2', '');
        setValue('#bm_branchCityId', '');
        setValue('#bm_branchCountryId', '');
        setValue('#bm_branchZipCode', '');
        setValue('#bm_branchPhone1', '');
        setValue('#bm_branchPhone2', '');
        setValue('#bm_branchMobile', '');
        setValue('#bm_branchEmail', '');
        setValue('#bm_branchFax', '');
        setValue('#bm_branchSwiftCode', '');
        setValue('#bm_branchRemarks', '');
        setChecked('#bm_isUpcountry', false);
        setValue('#bm_clearingCenter', '');
        state.currentBranchRow = null;
        state.branchUpdateCount = 0;
    }

    function renderBranches() {
        const tbody = qs('#bm_branchRows');
        const rows = state.branchRows;
        qs('#bm_branchCount').textContent = rows.length + ' rows';

        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-muted">No branches loaded.</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(function (row) {
            const branchId = getBranchRowId(row);
            const selected = state.currentBranchRow && String(getBranchRowId(state.currentBranchRow) || '') === String(branchId);
            return '<tr data-branch-id="' + escapeHtml(branchId) + '" class="' + (selected ? 'is-selected' : '') + '">' +
                '<td>' + escapeHtml(branchId) + '</td>' +
                '<td>' + escapeHtml(getBranchRowName(row)) + '</td>' +
                '<td>' + escapeHtml(row.SWIFTCode || '') + '</td>' +
                '</tr>';
        }).join('');

        qsa('tr[data-branch-id]', tbody).forEach(function (tr) {
            tr.addEventListener('click', function () {
                const row = rows.find(function (candidate) {
                    return String(getBranchRowId(candidate) || '') === tr.getAttribute('data-branch-id');
                });
                if (!row) {
                    return;
                }
                applyBranchRow(row);
                renderBranches();
                setMode(MODES.VIEW);
            });
        });
    }

    async function loadBranches(silent) {
        if (!state.bankLoaded) {
            state.branchRows = [];
            renderBranches();
            return;
        }

        const env = getEnv();
        try {
            const response = await service.getBranches({
                BankID: getCurrentBankId(),
                BranchID: '',
                OurBranchID: env.ourBranchId,
                OperatorID: env.operatorId,
                Direction: 0
            });

            state.branchRows = extractRows(response).filter(function (row) {
                return getBranchRowId(row) || getBranchRowName(row);
            });
            renderBranches();

            if (!silent) {
                showToast('Branches refreshed.', 'success');
            }
        } catch (error) {
            showToast('Unable to load branches.', 'danger');
        }
    }

    function applySignatoryRow(row) {
        state.currentSignatoryRow = row;
        state.signatoryUpdateCount = Number(row.UpdateCount || 0);
        setValue('#bm_signatoryId', row.SignatoryID || '');
        setValue('#bm_signatoryName', row.SignatoryName || '');
        setValue('#bm_imageId', row.ImageID || '');
        setAudit(row);
        clearImagePreview();
    }

    function clearSignatoryForm(keepId) {
        const currentId = textValue('#bm_signatoryId');
        setValue('#bm_signatoryId', keepId ? currentId : '');
        setValue('#bm_signatoryName', '');
        setValue('#bm_imageId', '');
        state.currentSignatoryRow = null;
        state.signatoryUpdateCount = 0;
        clearImagePreview();
    }

    function renderSignatories() {
        const tbody = qs('#bm_signatoryRows');
        const rows = state.signatoryRows;
        qs('#bm_signatoryCount').textContent = rows.length + ' rows';

        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-muted">No signatories loaded.</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(function (row) {
            const signatoryId = row.SignatoryID || '';
            const selected = state.currentSignatoryRow && String(state.currentSignatoryRow.SignatoryID || '') === String(signatoryId);
            return '<tr data-signatory-id="' + escapeHtml(signatoryId) + '" class="' + (selected ? 'is-selected' : '') + '">' +
                '<td>' + escapeHtml(signatoryId) + '</td>' +
                '<td>' + escapeHtml(row.SignatoryName || '') + '</td>' +
                '<td>' + escapeHtml(row.ImageID || '') + '</td>' +
                '</tr>';
        }).join('');

        qsa('tr[data-signatory-id]', tbody).forEach(function (tr) {
            tr.addEventListener('click', function () {
                const row = rows.find(function (candidate) {
                    return String(candidate.SignatoryID || '') === tr.getAttribute('data-signatory-id');
                });
                if (!row) {
                    return;
                }
                applySignatoryRow(row);
                renderSignatories();
                setMode(MODES.VIEW);
            });
        });
    }

    async function loadSignatories(silent) {
        if (!state.bankLoaded) {
            state.signatoryRows = [];
            renderSignatories();
            return;
        }

        const env = getEnv();
        try {
            const response = await service.getBankSignatories({
                BankID: getCurrentBankId(),
                SignatoryID: '',
                OurBranchID: env.ourBranchId,
                OperatorID: env.operatorId,
                Direction: 0
            });

            state.signatoryRows = extractRows(response).filter(function (row) {
                return row.SignatoryID || row.SignatoryName;
            });
            renderSignatories();

            if (!silent) {
                showToast('Signatories refreshed.', 'success');
            }
        } catch (error) {
            showToast('Unable to load signatories.', 'danger');
        }
    }

    function applyLimitRow(row) {
        state.currentLimitRow = row;
        state.limitUpdateCount = Number(row.UpdateCount || 0);
        setValue('#bm_limitClientId', row.ClientID || '');
        setValue('#bm_limitClientName', row.ClientName || '');
        setValue('#bm_clientBranchId', row.ClientBranchID || row.BranchID || '');
        setValue('#bm_limitType', row.LimitType || row.LimitTypeID || '');
        setValue('#bm_limitCurrencyId', row.CurrencyID || '');
        setValue('#bm_limitCurrencyName', getLimitCurrencyName(row));
        setValue('#bm_limitAmount', getLimitAmountValue(row));
        setValue('#bm_limitExpiryDate', normalizeDate(row.ExpiryDate));
        setValue('#bm_limitRemarks', pickFirstValue(row, ['Remarks', 'Remark']));
        setAudit(row);
    }

    function clearLimitForm(keepClient) {
        const currentClientId = textValue('#bm_limitClientId');
        setValue('#bm_limitClientId', keepClient ? currentClientId : '');
        setValue('#bm_limitClientName', '');
        setValue('#bm_clientBranchId', '');
        setValue('#bm_limitType', '');
        setValue('#bm_limitCurrencyId', '');
        setValue('#bm_limitCurrencyName', '');
        setValue('#bm_limitAmount', '');
        setValue('#bm_limitExpiryDate', '');
        setValue('#bm_limitRemarks', '');
        state.currentLimitRow = null;
        state.limitUpdateCount = 0;
    }

    function renderLimits() {
        const tbody = qs('#bm_limitRows');
        const rows = state.limitRows;
        qs('#bm_limitCount').textContent = rows.length + ' rows';

        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-muted">No limit rows loaded.</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(function (row, index) {
            const limitKey = String(row.ClientID || '') + '|' + String(row.LimitType || row.LimitTypeID || '') + '|' + index;
            const selected = state.currentLimitRow === row;
            return '<tr data-limit-key="' + escapeHtml(limitKey) + '" class="' + (selected ? 'is-selected' : '') + '">' +
                '<td>' + escapeHtml(getLimitTypeName(row)) + '</td>' +
                '<td>' + escapeHtml(getLimitCurrencyName(row)) + '</td>' +
                '<td>' + escapeHtml(getLimitAmountValue(row)) + '</td>' +
                '<td>' + escapeHtml(normalizeDate(row.ExpiryDate)) + '</td>' +
                '</tr>';
        }).join('');

        qsa('tr[data-limit-key]', tbody).forEach(function (tr, index) {
            tr.addEventListener('click', function () {
                const row = rows[index];
                if (!row) {
                    return;
                }
                applyLimitRow(row);
                renderLimits();
                setMode(MODES.VIEW);
            });
        });
    }

    async function loadLimits(silent) {
        if (!state.bankLoaded) {
            state.limitRows = [];
            renderLimits();
            return;
        }

        const env = getEnv();
        try {
            const clientBranchId = textValue('#bm_clientBranchId') || env.ourBranchId;
            const clientId = textValue('#bm_limitClientId') || textValue('#bm_clientId');
            const response = await service.getBankLimit({
                BankID: getCurrentBankId(),
                ClientBranchID: clientBranchId,
                ClientID: clientId,
                LimitType: '',
                OperatorID: env.operatorId,
                CurrencyID: ''
            });

            state.limitRows = extractRows(response).filter(function (row) {
                return getLimitTypeName(row) || row.CurrencyID || getLimitAmountValue(row);
            });
            renderLimits();

            if (!silent) {
                showToast('Bank limits refreshed.', 'success');
            }
        } catch (error) {
            showToast('Unable to load bank limits.', 'danger');
        }
    }

    function normalizeDate(value) {
        if (!value) {
            return '';
        }

        const text = String(value);
        if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
            return text;
        }

        const date = new Date(text);
        if (Number.isNaN(date.getTime())) {
            return '';
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }

    function nowString() {
        return new Date().toLocaleString('en-US');
    }

    async function saveBank() {
        const env = getEnv();
        const bankId = getCurrentBankId();
        if (!bankId) {
            showToast('Bank ID is required.', 'warning');
            return;
        }

        const payload = {
            BankID: bankId,
            InstitutionTypeID: textValue('#bm_institutionTypeId'),
            BankName: textValue('#bm_bankName'),
            ShortName: textValue('#bm_shortName'),
            ClientID: textValue('#bm_clientId'),
            CreditRating: textValue('#bm_creditRating'),
            IsLocalClearingBank: qs('#bm_isLocalClearing').checked ? 1 : 0,
            IsForeignClearingBank: qs('#bm_isForeignClearing').checked ? 1 : 0,
            ClearingThrough: textValue('#bm_clearingThrough'),
            ClearingAccountID: textValue('#bm_clearingAccountId'),
            BankAccountID: textValue('#bm_bankAccountId'),
            OurBranchID: env.ourBranchId,
            OperatorID: env.operatorId,
            CreatedBy: state.mode === MODES.ADD ? env.operatorId : '',
            CreatedOn: state.mode === MODES.ADD ? nowString() : '',
            ModifiedBy: env.operatorId,
            ModifiedOn: nowString(),
            UpdateCount: state.bankUpdateCount,
            NewRecord: state.mode === MODES.ADD ? 1 : 0
        };

        try {
            const response = await service.addEditBank(payload);
            if (!responseSucceeded(response)) {
                showToast(extractResponseMessage(response) || 'Save failed.', 'danger');
                return;
            }
            await loadBank(bankId, true);
            setMode(MODES.VIEW);
            showToast('Bank saved.', 'success');
        } catch (error) {
            showToast('Bank save failed.', 'danger');
        }
    }

    async function deleteBank() {
        const bankId = getCurrentBankId();
        if (!bankId || !state.bankLoaded) {
            showToast('Load a bank first.', 'warning');
            return;
        }

        if (!await showConfirmationDialog('Delete Bank', 'Are you sure you want to delete bank ' + bankId + '?')) {
            return;
        }

        try {
            const response = await service.deleteBank({ BankID: bankId, UpdateCount: state.bankUpdateCount });
            if (!responseSucceeded(response)) {
                showToast(extractResponseMessage(response) || 'Delete failed.', 'danger');
                return;
            }
            clearBankForm(false);
            setMode(MODES.VIEW);
            showToast('Bank deleted.', 'success');
        } catch (error) {
            showToast('Bank delete failed.', 'danger');
        }
    }

    async function saveBranch() {
        if (!state.bankLoaded) {
            showToast('Load a bank first.', 'warning');
            return;
        }

        const env = getEnv();
        const branchId = textValue('#bm_branchId');
        if (!branchId) {
            showToast('Branch ID is required.', 'warning');
            return;
        }

        const payload = {
            BankID: getCurrentBankId(),
            BranchID: branchId,
            BranchTypeID: textValue('#bm_branchTypeId'),
            BranchName: textValue('#bm_branchName'),
            Address1: textValue('#bm_branchAddress1'),
            Address2: textValue('#bm_branchAddress2'),
            CityID: textValue('#bm_branchCityId'),
            CountryID: textValue('#bm_branchCountryId'),
            ZipCode: textValue('#bm_branchZipCode'),
            Phone1: textValue('#bm_branchPhone1'),
            Phone2: textValue('#bm_branchPhone2'),
            Mobile: textValue('#bm_branchMobile'),
            Fax: textValue('#bm_branchFax'),
            EMail: textValue('#bm_branchEmail'),
            ContactPerson1: '',
            ContactPerson2: '',
            ourBranchID: env.ourBranchId,
            Remarks: textValue('#bm_branchRemarks'),
            IsUpcountry: qs('#bm_isUpcountry').checked ? 1 : 0,
            ClearingCenter: textValue('#bm_clearingCenter'),
            SWIFTCode: textValue('#bm_branchSwiftCode'),
            CreatedBy: state.mode === MODES.ADD ? env.operatorId : '',
            CreatedOn: state.mode === MODES.ADD ? nowString() : '',
            ModifiedBy: env.operatorId,
            ModifiedOn: nowString(),
            SupervisedBy: '',
            SupervisedOn: '',
            UpdateCount: state.branchUpdateCount,
            NewRecord: state.mode === MODES.ADD ? 1 : 0
        };

        try {
            const response = await service.addEditBranch(payload);
            if (!responseSucceeded(response)) {
                showToast(extractResponseMessage(response) || 'Save failed.', 'danger');
                return;
            }
            await loadBranches(true);
            const row = state.branchRows.find(function (candidate) { return String(candidate.BranchID || '') === branchId; });
            if (row) {
                applyBranchRow(row);
                renderBranches();
            }
            setMode(MODES.VIEW);
            showToast('Branch saved.', 'success');
        } catch (error) {
            showToast('Branch save failed.', 'danger');
        }
    }

    async function deleteBranch() {
        const branchId = textValue('#bm_branchId');
        if (!state.bankLoaded || !branchId) {
            showToast('Load a branch first.', 'warning');
            return;
        }

        if (!await showConfirmationDialog('Delete Branch', 'Are you sure you want to delete branch ' + branchId + '?')) {
            return;
        }

        try {
            const response = await service.deleteBranch({
                BankID: getCurrentBankId(),
                BranchID: branchId,
                UpdateCount: state.branchUpdateCount
            });
            if (!responseSucceeded(response)) {
                showToast(extractResponseMessage(response) || 'Delete failed.', 'danger');
                return;
            }
            clearBranchForm(false);
            await loadBranches(true);
            setMode(MODES.VIEW);
            showToast('Branch deleted.', 'success');
        } catch (error) {
            showToast('Branch delete failed.', 'danger');
        }
    }

    async function saveSignatory() {
        if (!state.bankLoaded) {
            showToast('Load a bank first.', 'warning');
            return;
        }

        const env = getEnv();
        const signatoryId = textValue('#bm_signatoryId');
        if (!signatoryId) {
            showToast('Signatory ID is required.', 'warning');
            return;
        }

        const payload = {
            BankID: getCurrentBankId(),
            SignatoryID: signatoryId,
            SignatoryName: textValue('#bm_signatoryName'),
            ImageID: textValue('#bm_imageId'),
            CreatedBy: state.mode === MODES.ADD ? env.operatorId : '',
            CreatedOn: state.mode === MODES.ADD ? nowString() : '',
            ModifiedBy: env.operatorId,
            ModifiedOn: nowString(),
            SupervisedBy: '',
            SupervisedOn: '',
            UpdateCount: state.signatoryUpdateCount,
            NewRecord: state.mode === MODES.ADD ? 1 : 0
        };

        try {
            const response = await service.addEditBankSignatory(payload);
            if (!responseSucceeded(response)) {
                showToast(extractResponseMessage(response) || 'Save failed.', 'danger');
                return;
            }
            await loadSignatories(true);
            const row = state.signatoryRows.find(function (candidate) { return String(candidate.SignatoryID || '') === signatoryId; });
            if (row) {
                applySignatoryRow(row);
                renderSignatories();
            }
            setMode(MODES.VIEW);
            showToast('Signatory saved.', 'success');
        } catch (error) {
            showToast('Signatory save failed.', 'danger');
        }
    }

    async function deleteSignatory() {
        const signatoryId = textValue('#bm_signatoryId');
        if (!state.bankLoaded || !signatoryId) {
            showToast('Load a signatory first.', 'warning');
            return;
        }

        if (!await showConfirmationDialog('Delete Signatory', 'Are you sure you want to delete signatory ' + signatoryId + '?')) {
            return;
        }

        try {
            const response = await service.deleteBankSignatory({
                BankID: getCurrentBankId(),
                SignatoryID: signatoryId,
                UpdateCount: state.signatoryUpdateCount
            });
            if (!responseSucceeded(response)) {
                showToast(extractResponseMessage(response) || 'Delete failed.', 'danger');
                return;
            }
            clearSignatoryForm(false);
            await loadSignatories(true);
            setMode(MODES.VIEW);
            showToast('Signatory deleted.', 'success');
        } catch (error) {
            showToast('Signatory delete failed.', 'danger');
        }
    }

    function xmlEscape(value) {
        return escapeHtml(value).replace(/&quot;/g, '"');
    }

    function buildLimitDetailXml(record) {
        return '<dt_BankLimit>' +
            '<BankID>' + xmlEscape(record.BankID) + '</BankID>' +
            '<ClientID>' + xmlEscape(record.ClientID) + '</ClientID>' +
            '<ClientBranchID>' + xmlEscape(record.ClientBranchID) + '</ClientBranchID>' +
            '<LimitType>' + xmlEscape(record.LimitType) + '</LimitType>' +
            '<CurrencyID>' + xmlEscape(record.CurrencyID) + '</CurrencyID>' +
            '<LimitAmount>' + xmlEscape(record.LimitAmount) + '</LimitAmount>' +
            '<Amount>' + xmlEscape(record.LimitAmount) + '</Amount>' +
            '<ExpiryDate>' + xmlEscape(record.ExpiryDate) + '</ExpiryDate>' +
            '<Remarks>' + xmlEscape(record.Remarks) + '</Remarks>' +
            '</dt_BankLimit>';
    }

    async function saveLimit() {
        if (!state.bankLoaded) {
            showToast('Load a bank first.', 'warning');
            return;
        }

        const env = getEnv();
        const record = {
            BankID: getCurrentBankId(),
            ClientID: textValue('#bm_limitClientId') || textValue('#bm_clientId'),
            ClientBranchID: textValue('#bm_clientBranchId') || env.ourBranchId,
            LimitType: textValue('#bm_limitType'),
            CurrencyID: textValue('#bm_limitCurrencyId'),
            LimitAmount: textValue('#bm_limitAmount'),
            ExpiryDate: textValue('#bm_limitExpiryDate') || '1900-01-01',
            Remarks: textValue('#bm_limitRemarks')
        };

        if (!record.ClientID || !record.LimitType || !record.CurrencyID) {
            showToast('Client, limit type, and currency are required.', 'warning');
            return;
        }

        const payload = {
            BankID: record.BankID,
            ClientID: record.ClientID,
            ClientBranchID: record.ClientBranchID,
            LimitType: record.LimitType,
            CurrencyID: record.CurrencyID,
            CreatedBy: state.mode === MODES.ADD ? env.operatorId : '',
            CreatedOn: state.mode === MODES.ADD ? nowString() : '',
            ModifiedBy: env.operatorId,
            ModifiedOn: nowString(),
            SupervisedBy: '',
            SupervisedOn: '',
            UpdateCount: state.limitUpdateCount,
            DetailRecords: buildLimitDetailXml(record)
        };

        try {
            const response = await service.addEditBankLimit(payload);
            if (!responseSucceeded(response)) {
                showToast(extractResponseMessage(response) || 'Save failed.', 'danger');
                return;
            }
            await loadLimits(true);
            setMode(MODES.VIEW);
            showToast('Bank limit saved.', 'success');
        } catch (error) {
            showToast('Bank limit save failed.', 'danger');
        }
    }

    async function deleteLimit() {
        if (!state.bankLoaded || !state.currentLimitRow) {
            showToast('Load a limit row first.', 'warning');
            return;
        }

        if (!await showConfirmationDialog('Delete Bank Limit', 'Are you sure you want to delete the selected bank limit?')) {
            return;
        }

        try {
            const response = await service.deleteBankLimit({
                BankID: getCurrentBankId(),
                ClientBranchID: textValue('#bm_clientBranchId'),
                ClientID: textValue('#bm_limitClientId'),
                LimitType: textValue('#bm_limitType'),
                UpdateCount: state.limitUpdateCount
            });
            if (!responseSucceeded(response)) {
                showToast(extractResponseMessage(response) || 'Delete failed.', 'danger');
                return;
            }
            clearLimitForm(false);
            await loadLimits(true);
            setMode(MODES.VIEW);
            showToast('Bank limit deleted.', 'success');
        } catch (error) {
            showToast('Bank limit delete failed.', 'danger');
        }
    }

    async function loadImage(kind) {
        const signatoryId = textValue('#bm_signatoryId');
        if (!signatoryId) {
            showToast('Select a signatory first.', 'warning');
            return;
        }

        const env = getEnv();
        try {
            const response = await fetch('/StaticData/BankMaster/api/get-' + (kind === 'photo' ? 'photo' : 'signature') + '-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    OurBranchID: env.ourBranchId,
                    SignatoryID: signatoryId,
                    OperatorID: env.operatorId
                })
            });

            const payload = await response.json();
            if (!payload || !payload.success || !payload.imageData) {
                showToast('No ' + kind + ' image found.', 'warning');
                return;
            }

            const target = kind === 'photo' ? qs('#bm_photoPreview') : qs('#bm_signaturePreview');
            target.src = payload.imageData.indexOf('data:image') === 0 ? payload.imageData : ('data:image/png;base64,' + payload.imageData);
        } catch (error) {
            showToast('Unable to load ' + kind + ' image.', 'danger');
        }
    }

    function beginAdd() {
        state.canAdd = true;
        if (state.activeSection === 'banks') {
            clearBankForm(true);
        } else if (state.activeSection === 'branches') {
            clearBranchForm(false);
        } else if (state.activeSection === 'signatories') {
            clearSignatoryForm(false);
        } else if (state.activeSection === 'limits') {
            clearLimitForm(false);
        }
        setMode(MODES.ADD);
    }

    function beginEdit() {
        if (!hasSectionRecord(state.activeSection)) {
            showToast('Load a record first.', 'warning');
            return;
        }
        state.canAdd = false;
        setMode(MODES.EDIT);
    }

    async function viewCurrentSection() {
        if (state.activeSection === 'banks') {
            const currentId = getCurrentBankId();
            const currentRowId = state.currentBankRow ? getBankRowId(state.currentBankRow) : '';
            const effectiveId = currentId || currentRowId;

            if (state.bankLoaded && state.currentBankRow && normalizeIdentity(currentRowId) === normalizeIdentity(effectiveId)) {
                clearAlerts();
                applyBankRow(state.currentBankRow, effectiveId);
                await loadChildSections();
                return;
            }

            await loadBank(effectiveId, false, state.currentBankRow, true);
            return;
        }

        if (!state.bankLoaded) {
            showToast('Load a bank first.', 'warning');
            return;
        }

        if (state.activeSection === 'branches') {
            const branchId = textValue('#bm_branchId');
            const row = state.branchRows.find(function (candidate) { return String(getBranchRowId(candidate) || '') === branchId; });
            if (row) {
                applyBranchRow(row);
                renderBranches();
            }
            return;
        }

        if (state.activeSection === 'signatories') {
            const signatoryId = textValue('#bm_signatoryId');
            const row = state.signatoryRows.find(function (candidate) { return String(candidate.SignatoryID || '') === signatoryId; });
            if (row) {
                applySignatoryRow(row);
                renderSignatories();
            }
            return;
        }

        if (state.activeSection === 'limits') {
            renderLimits();
        }
    }

    async function saveCurrentSection() {
        if (state.activeSection === 'banks') {
            await saveBank();
        } else if (state.activeSection === 'branches') {
            await saveBranch();
        } else if (state.activeSection === 'signatories') {
            await saveSignatory();
        } else if (state.activeSection === 'limits') {
            await saveLimit();
        }
    }

    async function deleteCurrentSection() {
        if (state.activeSection === 'banks') {
            await deleteBank();
        } else if (state.activeSection === 'branches') {
            await deleteBranch();
        } else if (state.activeSection === 'signatories') {
            await deleteSignatory();
        } else if (state.activeSection === 'limits') {
            await deleteLimit();
        }
    }

    function cancelCurrentSection() {
        if (state.activeSection === 'banks') {
            if (state.currentBankRow) {
                applyBankRow(state.currentBankRow, getCurrentBankId());
            } else {
                clearBankForm(false);
            }
        } else if (state.activeSection === 'branches') {
            if (state.currentBranchRow) {
                applyBranchRow(state.currentBranchRow);
            } else {
                clearBranchForm(false);
            }
            renderBranches();
        } else if (state.activeSection === 'signatories') {
            if (state.currentSignatoryRow) {
                applySignatoryRow(state.currentSignatoryRow);
            } else {
                clearSignatoryForm(false);
            }
            renderSignatories();
        } else if (state.activeSection === 'limits') {
            if (state.currentLimitRow) {
                applyLimitRow(state.currentLimitRow);
            } else {
                clearLimitForm(false);
            }
            renderLimits();
        }

        state.canAdd = false;
        setMode(MODES.VIEW);
    }

    function closeCurrentSection() {
        if (state.activeSection !== 'banks') {
            setSection('banks');
            setMode(MODES.VIEW);
            return;
        }

        showToast((SECTION_LABELS.banks || 'Current section') + ' is the active section.', 'info');
    }

    async function populateLimitTypes() {
        const select = qs('#bm_limitType');
        if (!select || !window.LookupService || typeof window.LookupService.getLimitTypes !== 'function') {
            return;
        }

        try {
            const options = await window.LookupService.getLimitTypes();
            const currentValue = select.value;
            const rendered = ['<option value="">Select limit type</option>'];
            (options || []).forEach(function (option) {
                rendered.push('<option value="' + escapeHtml(option.value) + '">' + escapeHtml(option.label || option.value) + '</option>');
            });
            select.innerHTML = rendered.join('');
            select.value = currentValue;
        } catch (_) {
            select.innerHTML = '<option value="">Select limit type</option>';
        }
    }

    function bindActionButtons() {
        const viewButton = qs('#submoduleBtnView');
        const addButton = qs('#submoduleBtnAdd');
        const editButton = qs('#submoduleBtnEdit');
        const deleteButton = qs('#submoduleBtnDelete');
        const saveButton = qs('#submoduleBtnSave');
        const cancelButton = qs('#submoduleBtnCancel');
        const closeButton = qs('#submoduleBtnClose');
        const photoButton = qs('#submoduleBtnPhoto');
        const signatureButton = qs('#submoduleBtnSignature');
        const bothButton = qs('#submoduleBtnBoth');

        if (viewButton) {
            viewButton.addEventListener('click', function () { void viewCurrentSection(); });
        }
        if (addButton) {
            addButton.addEventListener('click', beginAdd);
        }
        if (editButton) {
            editButton.addEventListener('click', beginEdit);
        }
        if (deleteButton) {
            deleteButton.addEventListener('click', function () { void deleteCurrentSection(); });
        }
        if (saveButton) {
            saveButton.addEventListener('click', function () { void saveCurrentSection(); });
        }
        if (cancelButton) {
            cancelButton.addEventListener('click', cancelCurrentSection);
        }
        if (closeButton) {
            closeButton.addEventListener('click', closeCurrentSection);
        }
        if (photoButton) {
            photoButton.addEventListener('click', function () { void loadImage('photo'); });
        }
        if (signatureButton) {
            signatureButton.addEventListener('click', function () { void loadImage('signature'); });
        }
        if (bothButton) {
            bothButton.addEventListener('click', async function () {
                await loadImage('photo');
                await loadImage('signature');
            });
        }
    }

    function bindEvents() {
        qsa('.sidebar-item[data-submodule], .sidebar-item--enhanced[data-submodule]').forEach(function (button) {
            button.addEventListener('click', function () {
                setSection(button.getAttribute('data-submodule'));
            });
            button.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSection(button.getAttribute('data-submodule'));
                }
            });
        });

        qs('#bm_searchBank').addEventListener('click', function () {
            openLookup('bank', function (record) {
                const bankId = getLookupBankId(record);
                const bankName = getLookupBankName(record);
                setValue('#bm_bankId', bankId);
                setValue('#bm_bankNameSummary', bankName);
                void loadBank(bankId, false, record);
            });
        });

        qs('#bm_searchClient').addEventListener('click', function () {
            openLookup('client', function (record) {
                setValue('#bm_clientId', getLookupClientId(record));
                setValue('#bm_clientName', getLookupClientName(record));
            });
        });

        qs('#bm_searchClearingThrough').addEventListener('click', function () {
            openLookup('bank', function (record) {
                setValue('#bm_clearingThrough', getLookupBankId(record));
                setValue('#bm_clearingThroughName', getLookupBankName(record));
            });
        });

        const branchLookupButton = qs('#bm_searchBranch');
        if (branchLookupButton) {
            branchLookupButton.addEventListener('click', function () {
                openBranchLookup(async function (record) {
                    const branchId = getBranchRowId(record);
                    setValue('#bm_branchId', branchId);
                    setValue('#bm_branchNameSummary', getBranchRowName(record));

                    if (!state.branchRows.length) {
                        await loadBranches(true);
                    }

                    const row = state.branchRows.find(function (candidate) {
                        return String(getBranchRowId(candidate) || '') === String(branchId || '');
                    });

                    if (row) {
                        applyBranchRow(row);
                        renderBranches();
                    }
                });
            });
        }

        qs('#bm_searchLimitCurrency').addEventListener('click', function () {
            openLookup('currency', function (record) {
                setValue('#bm_limitCurrencyId', record.CurrencyID || '');
                setValue('#bm_limitCurrencyName', record.Description || '');
            });
        });

        qs('#bm_bankId').addEventListener('blur', function () {
            if (textValue('#bm_bankId')) {
                void loadBank(textValue('#bm_bankId'), true);
            }
        });

    }

    function init() {
        if (!qs('#bankMasterModule') || !service) {
            return;
        }

        document.body.classList.add('bank-master');
        if (window.SidebarManager && typeof window.SidebarManager.init === 'function' && qs('#main-sidebar')) {
            window.SidebarManager.init({ moduleName: 'bank', isMainRecordLoaded: false, primaryRecordId: null });
        }
        initSectionToggles();
        bindEvents();
        void populateLimitTypes();
        updateBankSummary();
        syncSidebarRecordState();
        setSection(getConfiguredInitialSection());
        setMode(MODES.VIEW);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();