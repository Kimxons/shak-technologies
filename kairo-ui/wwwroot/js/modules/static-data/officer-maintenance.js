(function () {
    if (window.__kairoOfficerMaintenanceLoaded) {
        return;
    }
    window.__kairoOfficerMaintenanceLoaded = true;

    const MODES = {
        VIEW: 'View',
        ADD: 'Add',
        UPDATE: 'Update'
    };

    const VIEWS = {
        OFFICER: 'officer',
        BRANCH_ASSIGNED: 'branch-assigned'
    };

    const state = {
        view: VIEWS.OFFICER,
        officerMode: MODES.VIEW,
        branchMode: MODES.VIEW,
        branchGridAction: null,
        branchAssignedRows: [],
        selectedBranchRowIndex: -1,
        hasLoaded: false,
        recordNotFound: false,
        currentUpdateCount: 0,
        isBusy: false
    };

    let officerSearchModal = null;
    let clientSearchModal = null;
    let branchSearchModal = null;
    let reportingOfficerSearchModal = null;
    let accountSearchModal = null;
    const MODULE_API_BASE = '/MicroFinance/AccountOfficers/api';

    function qs(selector, root = document) {
        return root.querySelector(selector);
    }

    function qsa(selector, root = document) {
        return Array.from(root.querySelectorAll(selector));
    }

    async function requestModuleApi(path, payload = {}) {
        const response = await fetch(`${MODULE_API_BASE}/${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(payload || {})
        });

        const result = await response.json().catch(() => ({}));
        const success = result?.Success ?? result?.success ?? response.ok;
        if (!response.ok || success === false) {
            throw new Error(result?.ErrorMessage || result?.message || `Request failed (${response.status})`);
        }

        return result?.Data ?? result?.data ?? result;
    }

    function getContext() {
        const authSession = typeof window.AuthService?.getSession === 'function'
            ? (window.AuthService.getSession() || {})
            : {};
        return {
            BankID:
                authSession.bankID ||
                authSession.bankId ||
                authSession.BankID ||
                authSession.BankId ||
                window.sessionStorage?.getItem?.('BankID') ||
                window.localStorage?.getItem?.('BankID') ||
                window.Environment?.BankID ||
                window.Environment?.bankID ||
                window.Environment?.defaultBankId ||
                '00',
            OurBranchID:
                authSession.branchID ||
                authSession.branchId ||
                authSession.OurBranchID ||
                window.sessionStorage?.getItem?.('branchID') ||
                window.sessionStorage?.getItem?.('BranchID') ||
                window.Environment?.OurBranchID ||
                window.Environment?.defaultOurBranchId ||
                '0101',
            OperatorID:
                authSession.operatorID ||
                authSession.operatorId ||
                authSession.OperatorID ||
                window.sessionStorage?.getItem?.('operatorID') ||
                window.sessionStorage?.getItem?.('OperatorID') ||
                window.Environment?.OperatorID ||
                window.Environment?.UserID ||
                'KAIROADMIN'
        };
    }

    function getCaseInsensitive(row, ...keys) {
        if (!row || typeof row !== 'object') {
            return '';
        }

        const sourceKeys = Object.keys(row);
        for (const key of keys) {
            const actualKey = sourceKeys.find((candidate) => candidate.toLowerCase() === String(key).toLowerCase());
            if (!actualKey) {
                continue;
            }

            const value = row[actualKey];
            if (value === null || value === undefined) {
                return '';
            }

            return value;
        }

        return '';
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function escapeXml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    function formatAmount(value) {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
    }

    function normalizeInteger(value) {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? String(parsed) : '0';
    }

    function normalizeDateToInput(value) {
        if (!value) {
            return '';
        }

        const stringValue = String(value).trim();
        if (!stringValue) {
            return '';
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
            return stringValue;
        }

        const slashMatch = stringValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (slashMatch) {
            return `${slashMatch[3]}-${String(slashMatch[1]).padStart(2, '0')}-${String(slashMatch[2]).padStart(2, '0')}`;
        }

        const date = new Date(stringValue);
        if (!Number.isNaN(date.getTime())) {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }

        return '';
    }

    function formatLegacyDate(value, includeTime = true) {
        const normalized = normalizeDateToInput(value);
        if (!normalized) {
            return '';
        }

        const parts = normalized.split('-');
        return `${parts[1]}/${parts[2]}/${parts[0]}${includeTime ? ' 00:00:00' : ''}`;
    }

    function getFieldValue(id) {
        const element = qs(`#${id}`);
        if (!element) {
            return '';
        }

        return element.tagName === 'SPAN'
            ? (element.textContent || '').trim()
            : (element.value || '').trim();
    }

    function setFieldValue(id, value) {
        const element = qs(`#${id}`);
        if (!element) {
            return;
        }

        const nextValue = value == null ? '' : String(value);
        if (element.tagName === 'SPAN') {
            element.textContent = nextValue;
            return;
        }

        if (element.type === 'checkbox') {
            const normalized = nextValue.toLowerCase();
            element.checked = nextValue === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'y';
            return;
        }

        if (element._flatpickr) {
            element._flatpickr.setDate(nextValue || null, true);
        }

        element.value = nextValue;
    }

    function hideSummary() {
        const summary = qs('.validation-summary');
        if (!summary) {
            return;
        }

        summary.hidden = true;
        summary.classList.remove('validation-summary--success', 'validation-summary--error');
    }

    function showSummary(message, variant) {
        const summary = qs('.validation-summary');
        if (!summary) {
            return;
        }

        const text = qs('.validation-summary__text', summary);
        const icon = qs('.validation-summary__icon', summary);
        if (text) {
            text.textContent = message;
        }

        summary.hidden = false;
        summary.classList.remove('validation-summary--success', 'validation-summary--error');
        summary.classList.add(variant === 'error' ? 'validation-summary--error' : 'validation-summary--success');

        if (icon) {
            icon.className = variant === 'error'
                ? 'bi bi-exclamation-triangle validation-summary__icon'
                : 'bi bi-check-circle validation-summary__icon';
        }
    }

    function showToast(message, variant = 'info') {
        if (typeof window.NotificationService?.show === 'function') {
            window.NotificationService.show(message, variant);
            return;
        }

        if (typeof window.AppCore?.showToastMessage === 'function') {
            const mapped = variant === 'danger' ? 'error' : variant;
            window.AppCore.showToastMessage(message, mapped);
            return;
        }

        const panel = qs('#amMessagePanel');
        const text = qs('#messagePanelText');
        if (panel && text) {
            text.textContent = message;
            panel.classList.add('show');
        }
    }

    function setToast(message, variant = 'info') {
        showToast(message, variant);
    }

    function setButtonDisabled(button, disabled) {
        if (!button) {
            return;
        }

        button.disabled = !!disabled;
        button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
        button.classList.toggle('is-disabled', !!disabled);
    }

    function getActionButtons() {
        return {
            view: qs('[data-shell-mode="View"]'),
            add: qs('[data-shell-mode="Add"]'),
            edit: qs('[data-shell-mode="Update"]'),
            del: qs('[data-om-action="delete"]'),
            save: qs('[data-om-action="save"]'),
            cancel: qs('[data-om-action="cancel"]'),
            resign: qs('[data-om-action="resign"]'),
            branches: qs('[data-om-view-trigger="branch-assigned"]')
        };
    }

    function updateActionButtons() {
        const buttons = getActionButtons();
        const hasOfficerId = !!getFieldValue('OfficerId');
        const isEditable = state.officerMode === MODES.ADD || state.officerMode === MODES.UPDATE;
        const canEditLoaded = state.officerMode === MODES.VIEW && state.hasLoaded;

        setButtonDisabled(buttons.view, state.isBusy || !hasOfficerId || isEditable);
        setButtonDisabled(buttons.add, state.isBusy || state.hasLoaded || state.officerMode !== MODES.VIEW);
        setButtonDisabled(buttons.edit, state.isBusy || !canEditLoaded);
        setButtonDisabled(buttons.del, state.isBusy || !canEditLoaded);
        setButtonDisabled(buttons.resign, state.isBusy || !canEditLoaded);
        setButtonDisabled(buttons.save, state.isBusy || !isEditable);
        setButtonDisabled(buttons.cancel, state.isBusy || (!hasOfficerId && !state.hasLoaded && !isEditable));
        setButtonDisabled(buttons.branches, state.isBusy || !state.hasLoaded);
    }

    function updateBranchGridButtons() {
        const isEditable = state.branchMode === MODES.UPDATE;
        const currentAction = state.branchGridAction;

        const newButton = qs('[data-om-ba-grid="new"]');
        const alterButton = qs('[data-om-ba-grid="alter"]');
        const removeButton = qs('[data-om-ba-grid="remove"]');
        const updateButton = qs('[data-om-ba-grid="update"]');
        const clearButton = qs('[data-om-ba-grid="clear"]');
        const saveButton = qs('[data-om-ba-action="save"]');
        const editButton = qs('[data-om-ba-action="edit"]');

        setButtonDisabled(saveButton, state.isBusy || !isEditable);
        setButtonDisabled(editButton, state.isBusy || !state.hasLoaded || isEditable);

        if (!isEditable) {
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
        setButtonDisabled(alterButton, state.selectedBranchRowIndex < 0);
        setButtonDisabled(removeButton, state.selectedBranchRowIndex < 0);
        setButtonDisabled(updateButton, true);
        setButtonDisabled(clearButton, true);
    }

    function setOfficerMode(nextMode) {
        state.officerMode = nextMode;
        const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;
        const isAddMode = nextMode === MODES.ADD;
        const mainForm = qs('[data-main-form]');

        qsa('input, select, textarea, button', mainForm).forEach((element) => {
            if (element.matches('[data-om-audit], .validation-summary__close')) {
                return;
            }

            if (element.matches('[data-always-enabled]')) {
                setButtonDisabled(element, state.isBusy);
                return;
            }

            if (element.type === 'button') {
                return;
            }

            if (isEditable) {
                element.removeAttribute('disabled');
            } else {
                element.setAttribute('disabled', 'disabled');
            }
        });

        if (isAddMode) {
            qs('#OfficerId')?.setAttribute('disabled', 'disabled');
            setButtonDisabled(qs('#btnOfficerLookup'), true);
        } else if (!state.isBusy) {
            qs('#OfficerId')?.removeAttribute('disabled');
            setButtonDisabled(qs('#btnOfficerLookup'), false);
        }

        updateActionButtons();
    }

    function setBranchMode(nextMode) {
        state.branchMode = nextMode;
        const isEditable = nextMode === MODES.UPDATE;
        const container = qs('#branchAssignedContainer');

        qsa('input, select', container).forEach((element) => {
            if (isEditable) {
                element.removeAttribute('disabled');
            } else {
                element.setAttribute('disabled', 'disabled');
            }
        });

        updateBranchGridButtons();
    }

    function setView(nextView) {
        state.view = nextView;
        qs('[data-om-view="officer"]')?.toggleAttribute('hidden', nextView !== VIEWS.OFFICER);
        qs('[data-om-view="branch-assigned"]')?.toggleAttribute('hidden', nextView !== VIEWS.BRANCH_ASSIGNED);
        qs('[data-om-actions-view="officer"]')?.toggleAttribute('hidden', nextView !== VIEWS.OFFICER);
        qs('[data-om-actions-view="branch-assigned"]')?.toggleAttribute('hidden', nextView !== VIEWS.BRANCH_ASSIGNED);

        if (nextView === VIEWS.OFFICER) {
            setOfficerMode(state.officerMode);
        } else {
            setBranchMode(state.branchMode);
        }
    }

    function initSectionToggles() {
        qsa('[data-section-toggle]').forEach((header) => {
            if (header.dataset.bound === '1') {
                return;
            }

            header.dataset.bound = '1';
            const section = header.closest('.form-section');
            const content = qs('[data-section-content]', section);
            const button = qs('.section-toggle-btn', header);
            const icon = qs('i.bi', button);

            const toggle = () => {
                const isHidden = content.hasAttribute('hidden');
                if (isHidden) {
                    content.removeAttribute('hidden');
                } else {
                    content.setAttribute('hidden', '');
                }

                button?.setAttribute('aria-expanded', String(isHidden));
                icon?.classList.toggle('bi-chevron-up', isHidden);
                icon?.classList.toggle('bi-chevron-down', !isHidden);
            };

            header.addEventListener('click', toggle);
            button?.addEventListener('click', (event) => {
                event.stopPropagation();
                toggle();
            });
        });
    }

    function initDatePickers() {
        if (typeof window.flatpickr !== 'function') {
            return;
        }

        qsa('[data-date-picker]').forEach((element) => {
            if (element._flatpickr) {
                return;
            }

            window.flatpickr(element, {
                dateFormat: 'Y-m-d',
                allowInput: true
            });
        });
    }

    async function ensureServicesLoaded() {
        if (typeof window.fetch !== 'function') {
            throw new Error('Officer maintenance dependencies are not loaded.');
        }
    }

    async function initializeSearchModals() {
        if (typeof window.ServiceLoader?.loadSearchService === 'function') {
            await window.ServiceLoader.loadSearchService();
        }

        if (typeof window.SearchModal !== 'function') {
            throw new Error('Search modal is not available.');
        }

        const context = getContext();
        const baseOptions = {
            moduleID: '5130',
            getOperatorId: () => context.OperatorID,
            getOurBranchId: () => context.OurBranchID
        };

        officerSearchModal = new window.SearchModal({ prefix: 'om-officer', ...baseOptions });
        clientSearchModal = new window.SearchModal({ prefix: 'om-client', ...baseOptions });
        branchSearchModal = new window.SearchModal({ prefix: 'om-branch', ...baseOptions });
        reportingOfficerSearchModal = new window.SearchModal({ prefix: 'om-reporting-officer', ...baseOptions });
        accountSearchModal = new window.SearchModal({ prefix: 'om-account', ...baseOptions });
    }

    async function loadOptions(selectId, codeId) {
        const select = qs(`#${selectId}`);
        if (!select) {
            return;
        }

        const response = await requestModuleApi('system-codes', { CodeID: codeId });
        let rows = response?.Details || response?.data || response || [];
        if (!Array.isArray(rows)) {
            rows = [rows].filter(Boolean);
        }

        const normalized = rows
            .map((row) => ({
                value: String(getCaseInsensitive(row, 'SubCodeID', 'Value', 'CodeID') || ''),
                label: String(getCaseInsensitive(row, 'CodeDescription', 'Label', 'Description') || ''),
                order: Number(getCaseInsensitive(row, 'DisplayOrder', 'Order') || 0)
            }))
            .filter((row) => row.value)
            .sort((left, right) => left.order - right.order);

        select.innerHTML = '<option value="">--Select--</option>';
        normalized.forEach((option) => {
            const element = document.createElement('option');
            element.value = option.value;
            element.textContent = `${option.value} - ${option.label}`;
            select.appendChild(element);
        });
    }

    function extractFirstRow(response) {
        const candidates = [
            response?.data?.Details02,
            response?.data?.Details2,
            response?.data?.Details01,
            response?.data?.Details1,
            response?.data?.Details,
            response?.Details02,
            response?.Details2,
            response?.Details01,
            response?.Details1,
            response?.Details,
            response?.data
        ];

        for (const candidate of candidates) {
            if (Array.isArray(candidate) && candidate.length) {
                const row = candidate[0];
                if (getCaseInsensitive(row, 'OfficerID', 'OfficerId')) {
                    return row;
                }
            }

            if (candidate && !Array.isArray(candidate) && getCaseInsensitive(candidate, 'OfficerID', 'OfficerId')) {
                return candidate;
            }
        }

        return null;
    }

    function applyOfficerToForm(row) {
        setFieldValue('OfficerId', getCaseInsensitive(row, 'OfficerID', 'OfficerId'));
        setFieldValue('OfficerName', getCaseInsensitive(row, 'OfficerName', 'Name', 'Names'));
        setFieldValue('ClientId', getCaseInsensitive(row, 'ClientID', 'ClientId'));
        setFieldValue('ClientName', getCaseInsensitive(row, 'ClientName', 'Client'));
        setFieldValue('JoinedOn', normalizeDateToInput(getCaseInsensitive(row, 'JoinedDate', 'JoinedOn')));
        setFieldValue('Designation', getCaseInsensitive(row, 'OfficerTypeID', 'Designation'));
        setFieldValue('BaseBranch', getCaseInsensitive(row, 'ReportingBranchID', 'BaseBranch', 'OurBranchID'));
        setFieldValue('BaseBranchName', getCaseInsensitive(row, 'ReportingBranch', 'ReportingBranchName', 'BranchName'));
        setFieldValue('ReportingTo', getCaseInsensitive(row, 'ReportingOfficerID', 'ReportingTo'));
        setFieldValue('ReportingToName', getCaseInsensitive(row, 'ReportingOfficer', 'ReportingOfficerName'));
        setFieldValue('AccountId', getCaseInsensitive(row, 'AccountID', 'AccountId'));
        setFieldValue('AccountName', getCaseInsensitive(row, 'AccountName', 'Account'));
        setFieldValue('SanctioningAuthority', getCaseInsensitive(row, 'IsSanctionAuthority', 'SanctioningAuthority'));
        setFieldValue('Period', getCaseInsensitive(row, 'RestrictedPeriodID', 'Period'));
        setFieldValue('NoOfLoans', normalizeInteger(getCaseInsensitive(row, 'NoOfLoans')));
        setFieldValue('FixedAmount', formatAmount(getCaseInsensitive(row, 'RestrictedAmount', 'FixedAmount')));
        setFieldValue('Status', getCaseInsensitive(row, 'Status', 'STATUSFLAG') || 'Active');
        setFieldValue('ResignedOn', normalizeDateToInput(getCaseInsensitive(row, 'ResignedDate', 'ResignedOn')));
        setFieldValue('CreatedBy', getCaseInsensitive(row, 'CreatedBy'));
        setFieldValue('CreatedOn', normalizeDateToInput(getCaseInsensitive(row, 'CreatedOn')));
        setFieldValue('ModifiedBy', getCaseInsensitive(row, 'ModifiedBy'));
        setFieldValue('ModifiedOn', normalizeDateToInput(getCaseInsensitive(row, 'ModifiedOn')));
        setFieldValue('SupervisedBy', getCaseInsensitive(row, 'SupervisedBy'));
        setFieldValue('SupervisedOn', normalizeDateToInput(getCaseInsensitive(row, 'SupervisedOn')));

        setFieldValue('BaReportingBranch', getCaseInsensitive(row, 'ReportingBranchID', 'BaseBranch', 'OurBranchID'));
        setFieldValue('BaReportingBranchName', getCaseInsensitive(row, 'ReportingBranch', 'ReportingBranchName', 'BranchName'));
        setFieldValue('BaPeriod', getCaseInsensitive(row, 'RestrictedPeriodID', 'Period'));
        setFieldValue('BaNoOfLoans', normalizeInteger(getCaseInsensitive(row, 'NoOfLoans')));
        setFieldValue('BaFixedAmount', formatAmount(getCaseInsensitive(row, 'RestrictedAmount', 'FixedAmount')));

        state.currentUpdateCount = Number(getCaseInsensitive(row, 'UpdateCount', 'Updatecount', 'UpdateCnt') || 0);
    }

    function parseDetailRecords(xmlString) {
        if (!xmlString || typeof xmlString !== 'string') {
            return [];
        }

        const rows = [];
        const pattern = /<dt_AccountOfficerDetail>([\s\S]*?)<\/dt_AccountOfficerDetail>/gi;
        let match;

        while ((match = pattern.exec(xmlString)) !== null) {
            const content = match[1];
            const getTag = (tag) => {
                const tagMatch = content.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`, 'i'));
                return tagMatch ? tagMatch[1] : '';
            };

            const branchId = getTag('AssignedBranchID');
            if (!branchId) {
                continue;
            }

            rows.push({
                AssignedBranchID: branchId,
                RestrictedPeriodID: getTag('RestrictedPeriodID'),
                NoOfLoans: getTag('NoOfLoans') || getTag('NoOFLoans') || getTag('NoofLoans'),
                RestrictedAmount: getTag('RestrictedAmount')
            });
        }

        return rows;
    }

    function renderBranchAssignedGrid() {
        const tbody = qs('.om-ba-grid tbody');
        const count = qs('#baRecordCount');
        if (!tbody) {
            return;
        }

        if (count) {
            count.textContent = String(state.branchAssignedRows.length);
        }

        if (!state.branchAssignedRows.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No records to display.</td></tr>';
            updateBranchGridButtons();
            return;
        }

        tbody.innerHTML = state.branchAssignedRows.map((row, index) => `
            <tr class="ba-grid-row ${state.selectedBranchRowIndex === index ? 'table-primary' : ''}" data-index="${index}" style="cursor: pointer;">
                <td>${escapeHtml(row.branchId)}</td>
                <td>${escapeHtml(row.branchName)}</td>
                <td>${escapeHtml(row.periodText || row.period)}</td>
                <td>${escapeHtml(row.noOfLoans)}</td>
                <td>${escapeHtml(formatAmount(row.fixedAmount))}</td>
            </tr>`).join('');

        qsa('.ba-grid-row', tbody).forEach((rowElement) => {
            rowElement.addEventListener('click', () => {
                state.selectedBranchRowIndex = Number.parseInt(rowElement.dataset.index, 10);
                qsa('.ba-grid-row', tbody).forEach((candidate) => candidate.classList.remove('table-primary'));
                rowElement.classList.add('table-primary');

                const selected = state.branchAssignedRows[state.selectedBranchRowIndex];
                setFieldValue('BaCreatedBy', selected?.createdBy || '');
                setFieldValue('BaCreatedOn', normalizeDateToInput(selected?.createdOn || ''));
                setFieldValue('BaModifiedBy', selected?.modifiedBy || '');
                setFieldValue('BaModifiedOn', normalizeDateToInput(selected?.modifiedOn || ''));
                setFieldValue('BaSupervisedBy', selected?.supervisedBy || '');
                setFieldValue('BaSupervisedOn', normalizeDateToInput(selected?.supervisedOn || ''));
                updateBranchGridButtons();
            });
        });

        updateBranchGridButtons();
    }

    function renderBranchAssignmentsGrid(rows) {
        state.branchAssignedRows = (rows || []).map((row) => ({
            branchId: String(getCaseInsensitive(row, 'AssignedBranchID', 'BranchID', 'OurBranchID') || ''),
            branchName: String(getCaseInsensitive(row, 'BranchName', 'Branch', 'BranchDescription') || ''),
            period: String(getCaseInsensitive(row, 'RestrictedPeriodID', 'Period') || ''),
            periodText: String(getCaseInsensitive(row, 'RestrictedPeriodID', 'Period') || ''),
            noOfLoans: normalizeInteger(getCaseInsensitive(row, 'NoOfLoans', 'NoOFLoans')),
            fixedAmount: formatAmount(getCaseInsensitive(row, 'RestrictedAmount', 'FixedAmount')),
            createdBy: String(getCaseInsensitive(row, 'CreatedBy') || ''),
            createdOn: String(getCaseInsensitive(row, 'CreatedOn') || ''),
            modifiedBy: String(getCaseInsensitive(row, 'ModifiedBy') || ''),
            modifiedOn: String(getCaseInsensitive(row, 'ModifiedOn') || ''),
            supervisedBy: String(getCaseInsensitive(row, 'SupervisedBy') || ''),
            supervisedOn: String(getCaseInsensitive(row, 'SupervisedOn') || ''),
            isNew: false,
            isAltered: false
        })).filter((row) => row.branchId);

        state.selectedBranchRowIndex = -1;
        renderBranchAssignedGrid();
    }

    async function fetchBranchAssignmentsViaApi(officerId) {
        const context = getContext();
        const response = await requestModuleApi('branch-details', {
            BankID: context.BankID,
            OfficerID: officerId,
            OurBranchID: context.OurBranchID,
            OperatorID: context.OperatorID
        });

        const rows = response?.Details01 || response?.Details || response?.data || [];
        renderBranchAssignmentsGrid(Array.isArray(rows) ? rows : []);
    }

    async function loadBranchAssignments(officerId, row) {
        const detailRecords = getCaseInsensitive(row, 'DetailRecords');
        if (detailRecords) {
            renderBranchAssignmentsGrid(parseDetailRecords(detailRecords));
            return;
        }

        await fetchBranchAssignmentsViaApi(officerId);
    }

    async function fetchOfficer(officerId, direction = 0, options = {}) {
        const id = String(officerId || '').trim();
        if (!id) {
            if (!options.quiet) {
                setToast('Please enter Officer ID.', 'warning');
            }
            return;
        }

        await ensureServicesLoaded();
        state.isBusy = true;
        updateActionButtons();

        try {
            const context = getContext();
            const response = await requestModuleApi('get', {
                BankID: context.BankID,
                OurBranchID: context.OurBranchID,
                OfficerID: id,
                OperatorID: context.OperatorID,
                Direction: direction
            });

            const row = extractFirstRow(response);
            if (!row) {
                state.hasLoaded = false;
                state.recordNotFound = true;
                clearOfficerForm({ keepOfficerId: true });
                if (!options.quiet) {
                    setToast('Record not found. You can add a new officer.', 'info');
                }
                return;
            }

            applyOfficerToForm(row);
            await loadBranchAssignments(id, row);
            state.hasLoaded = true;
            state.recordNotFound = false;
            setOfficerMode(MODES.VIEW);
            updateBranchAssignedButtonState();
            if (!options.quiet) {
                showSummary(`Officer ${id} loaded successfully.`, 'success');
            }
        } catch (error) {
            console.error('[OfficerMaintenance] fetchOfficer failed', error);
            if (!options.quiet) {
                showSummary(error.message || 'Error fetching officer.', 'error');
                setToast(error.message || 'Error fetching officer.', 'danger');
            }
        } finally {
            state.isBusy = false;
            updateActionButtons();
        }
    }

    function clearOfficerForm(options = {}) {
        const keepOfficerId = !!options.keepOfficerId;
        const officerId = keepOfficerId ? getFieldValue('OfficerId') : '';
        const officerName = keepOfficerId ? getFieldValue('OfficerName') : '';

        qsa('#officers-maintenance-form input, #officers-maintenance-form select, #officers-maintenance-form textarea').forEach((element) => {
            if (element.type === 'checkbox') {
                element.checked = false;
            } else {
                element.value = '';
            }

            if (element._flatpickr) {
                element._flatpickr.clear();
            }
        });

        qsa('[data-om-audit], #branchAssignedContainer .audit-value').forEach((element) => {
            element.textContent = '';
        });

        if (keepOfficerId) {
            setFieldValue('OfficerId', officerId);
            setFieldValue('OfficerName', officerName);
        }

        setFieldValue('Status', '');
        hideSummary();
        clearBranchAssignedFilters();
        renderBranchAssignmentsGrid([]);
        state.currentUpdateCount = 0;
        state.selectedBranchRowIndex = -1;
        state.branchGridAction = null;
        state.hasLoaded = false;
        updateActionButtons();
        updateBranchAssignedButtonState();
    }

    function clearBranchAssignedFilters() {
        setFieldValue('BaReportingBranch', '');
        setFieldValue('BaReportingBranchName', '');
        setFieldValue('BaPeriod', '');
        setFieldValue('BaNoOfLoans', '0');
        setFieldValue('BaFixedAmount', '0.00');
        setFieldValue('BaCreatedBy', '');
        setFieldValue('BaCreatedOn', '');
        setFieldValue('BaModifiedBy', '');
        setFieldValue('BaModifiedOn', '');
        setFieldValue('BaSupervisedBy', '');
        setFieldValue('BaSupervisedOn', '');
    }

    function buildOfficerPayload() {
        const context = getContext();
        const now = new Date();
        const pad = (value) => String(value).padStart(2, '0');
        const timestamp = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        const createdBy = getFieldValue('CreatedBy');
        const createdOn = formatLegacyDate(getFieldValue('CreatedOn'));

        return {
            BankID: context.BankID,
            OfficerID: getFieldValue('OfficerId'),
            Name: getFieldValue('OfficerName'),
            ClientID: getFieldValue('ClientId'),
            JoinedDate: formatLegacyDate(getFieldValue('JoinedOn')),
            OfficerTypeID: getFieldValue('Designation'),
            ReportingBranchID: getFieldValue('BaseBranch'),
            ReportingOfficerID: getFieldValue('ReportingTo'),
            RestrictedPeriodID: getFieldValue('Period'),
            NoOfLoans: normalizeInteger(getFieldValue('NoOfLoans')),
            RestrictedAmount: formatAmount(getFieldValue('FixedAmount')),
            IsSanctionAuthority: !!qs('#SanctioningAuthority')?.checked,
            AccountID: getFieldValue('AccountId'),
            CreatedBy: createdBy || context.OperatorID,
            CreatedOn: createdOn || timestamp,
            ModifiedBy: context.OperatorID,
            ModifiedOn: timestamp,
            SupervisedBy: getFieldValue('SupervisedBy'),
            NewRecord: state.officerMode === MODES.ADD ? 1 : (state.currentUpdateCount || 0)
        };
    }

    function buildBranchDetailsXml(rows) {
        const changedRows = rows.filter((row) => row.isNew || row.isAltered);
        if (!changedRows.length) {
            return '';
        }

        return `<dt_AccountOfficerDetail>${changedRows.map((row) => `
            <dt_AccountOfficerDetail>
                <AssignedBranchID>${escapeXml(row.branchId)}</AssignedBranchID>
                <RestrictedPeriodID>${escapeXml(row.period)}</RestrictedPeriodID>
                <NoOFLoans>${escapeXml(row.noOfLoans)}</NoOFLoans>
                <RestrictedAmount>${escapeXml(row.fixedAmount)}</RestrictedAmount>
                <ButtonMark>${row.isNew ? 'N' : 'A'}</ButtonMark>
            </dt_AccountOfficerDetail>`).join('')}
        </dt_AccountOfficerDetail>`;
    }

    async function handleSaveOfficer() {
        if (state.officerMode === MODES.VIEW) {
            return;
        }

        const form = qs('#officers-maintenance-form');
        if (form && typeof form.reportValidity === 'function' && !form.reportValidity()) {
            setToast('Please fill the required fields.', 'warning');
            return;
        }

        if (state.officerMode === MODES.ADD) {
            setFieldValue('OfficerId', getFieldValue('ClientId'));
            setFieldValue('OfficerName', getFieldValue('ClientName') || getFieldValue('OfficerName'));
        }

        state.isBusy = true;
        updateActionButtons();

        try {
            const payload = buildOfficerPayload();
            await requestModuleApi('save', payload);

            const detailXml = buildBranchDetailsXml(state.branchAssignedRows);
            if (detailXml) {
                const context = getContext();
                await requestModuleApi('save-branch-details', {
                    BankID: context.BankID,
                    OfficerID: payload.OfficerID,
                    OperatedBy: context.OperatorID,
                    UpdateCount: payload.NewRecord,
                    DetailRecords: detailXml
                });
            }

            showSummary(`Officer ${payload.OfficerID} saved successfully.`, 'success');
            setToast('Officer saved successfully.', 'success');
            await fetchOfficer(payload.OfficerID, 0, { quiet: true });
        } catch (error) {
            console.error('[OfficerMaintenance] save failed', error);
            showSummary(error.message || 'Error saving officer.', 'error');
            setToast(error.message || 'Error saving officer.', 'danger');
        } finally {
            state.isBusy = false;
            updateActionButtons();
        }
    }

    async function handleDeleteOfficer() {
        if (!state.hasLoaded) {
            setToast('Load a record before deleting.', 'warning');
            return;
        }

        const officerId = getFieldValue('OfficerId');
        if (!officerId || !window.confirm(`Delete officer ${officerId}?`)) {
            return;
        }

        state.isBusy = true;
        updateActionButtons();

        try {
            const context = getContext();
            await requestModuleApi('delete', {
                BankID: context.BankID,
                OfficerID: officerId,
                NewRecord: state.currentUpdateCount || 0
            });

            clearOfficerForm();
            setOfficerMode(MODES.VIEW);
            showSummary(`Officer ${officerId} deleted successfully.`, 'success');
        } catch (error) {
            console.error('[OfficerMaintenance] delete failed', error);
            showSummary(error.message || 'Error deleting officer.', 'error');
            setToast(error.message || 'Error deleting officer.', 'danger');
        } finally {
            state.isBusy = false;
            updateActionButtons();
        }
    }

    async function handleResignOfficer() {
        if (!state.hasLoaded) {
            setToast('Load a record before resigning.', 'warning');
            return;
        }

        const officerId = getFieldValue('OfficerId');
        if (!officerId || !window.confirm(`Resign officer ${officerId}?`)) {
            return;
        }

        state.isBusy = true;
        updateActionButtons();

        try {
            const context = getContext();
            const now = new Date();
            const pad = (value) => String(value).padStart(2, '0');
            const timestamp = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
            await requestModuleApi('resign', {
                OurBranchID: context.OurBranchID,
                OfficerID: officerId,
                ResignedDate: formatLegacyDate(getFieldValue('ResignedOn')) || timestamp,
                ModifiedBy: context.OperatorID,
                ModifiedOn: timestamp,
                SupervisedBy: getFieldValue('SupervisedBy'),
                NewRecord: state.currentUpdateCount || 0
            });

            showSummary(`Officer ${officerId} resigned successfully.`, 'success');
            await fetchOfficer(officerId, 0, { quiet: true });
        } catch (error) {
            console.error('[OfficerMaintenance] resign failed', error);
            showSummary(error.message || 'Error resigning officer.', 'error');
            setToast(error.message || 'Error resigning officer.', 'danger');
        } finally {
            state.isBusy = false;
            updateActionButtons();
        }
    }

    async function handleSaveBranchAssignments() {
        if (state.branchMode !== MODES.UPDATE) {
            return;
        }

        const detailXml = buildBranchDetailsXml(state.branchAssignedRows);
        if (!detailXml) {
            setToast('No branch changes to save.', 'info');
            return;
        }

        state.isBusy = true;
        updateActionButtons();

        try {
            const context = getContext();
            const officerId = getFieldValue('OfficerId');
            await requestModuleApi('save-branch-details', {
                BankID: context.BankID,
                OfficerID: officerId,
                OperatedBy: context.OperatorID,
                UpdateCount: state.currentUpdateCount || 0,
                DetailRecords: detailXml
            });

            state.branchMode = MODES.VIEW;
            state.branchGridAction = null;
            await fetchBranchAssignmentsViaApi(officerId);
            setBranchMode(MODES.VIEW);
            setToast('Branch assignments saved successfully.', 'success');
        } catch (error) {
            console.error('[OfficerMaintenance] branch save failed', error);
            setToast(error.message || 'Error saving branch assignments.', 'danger');
        } finally {
            state.isBusy = false;
            updateActionButtons();
            updateBranchGridButtons();
        }
    }

    async function openOfficerSearch() {
        const context = getContext();
        await officerSearchModal.open({
            title: 'Find Officer',
            tableID: 'OfficerID',
            moduleID: '5130',
            advFilterString: `BankID = '${String(context.BankID).replace(/'/g, "''")}'`,
            searchFields: [
                { name: 'OfficerID', label: 'Officer ID', column: 'OfficerID', value: getFieldValue('OfficerId') },
                { name: 'OfficerName', label: 'Officer Name', column: 'OfficerName', value: getFieldValue('OfficerName') }
            ],
            onSelect: (record) => {
                const officerId = getCaseInsensitive(record, 'OfficerID', 'OfficerId');
                const officerName = getCaseInsensitive(record, 'OfficerName', 'Name');
                setFieldValue('OfficerId', officerId);
                setFieldValue('OfficerName', officerName);
                if (officerId) {
                    void fetchOfficer(officerId, 0, { quiet: false });
                }
            }
        });
    }

    async function openClientSearch() {
        await clientSearchModal.open({
            title: 'Find Client',
            tableID: 'ClientAccountID',
            moduleID: '5130',
            searchFields: [
                { name: 'ClientID', label: 'Client ID', column: 'ClientID', value: getFieldValue('ClientId') },
                { name: 'ClientName', label: 'Client Name', column: 'ClientName', value: getFieldValue('ClientName') }
            ],
            onSelect: (record) => {
                setFieldValue('ClientId', getCaseInsensitive(record, 'ClientID', 'ClientId'));
                setFieldValue('ClientName', getCaseInsensitive(record, 'ClientName', 'Name', 'Description'));
            }
        });
    }

    async function openBranchSearch(target) {
        await branchSearchModal.open({
            title: 'Find Branch',
            tableID: 'BranchID',
            moduleID: '5130',
            searchFields: [
                { name: 'BranchID', label: 'Branch ID', column: 'OurBranchID', value: getFieldValue(target === 'ba' ? 'BaReportingBranch' : 'BaseBranch') },
                { name: 'BranchName', label: 'Branch Name', column: 'BranchName', value: getFieldValue(target === 'ba' ? 'BaReportingBranchName' : 'BaseBranchName') }
            ],
            onSelect: (record) => {
                const branchId = getCaseInsensitive(record, 'OurBranchID', 'BranchID', 'BranchId');
                const branchName = getCaseInsensitive(record, 'BranchName', 'Name');
                if (target === 'ba') {
                    setFieldValue('BaReportingBranch', branchId);
                    setFieldValue('BaReportingBranchName', branchName);
                } else {
                    setFieldValue('BaseBranch', branchId);
                    setFieldValue('BaseBranchName', branchName);
                }
            }
        });
    }

    async function openReportingOfficerSearch() {
        const context = getContext();
        await reportingOfficerSearchModal.open({
            title: 'Find Reporting Officer',
            tableID: 'OfficerID',
            moduleID: '5130',
            advFilterString: `BankID = '${String(context.BankID).replace(/'/g, "''")}'`,
            searchFields: [
                { name: 'OfficerID', label: 'Officer ID', column: 'OfficerID', value: getFieldValue('ReportingTo') },
                { name: 'OfficerName', label: 'Officer Name', column: 'OfficerName', value: getFieldValue('ReportingToName') }
            ],
            onSelect: (record) => {
                setFieldValue('ReportingTo', getCaseInsensitive(record, 'OfficerID', 'OfficerId'));
                setFieldValue('ReportingToName', getCaseInsensitive(record, 'OfficerName', 'Name'));
            }
        });
    }

    async function openAccountSearch() {
        await accountSearchModal.open({
            title: 'Find Account',
            tableID: 'ClientAccountID',
            moduleID: '5130',
            searchFields: [
                { name: 'AccountID', label: 'Account ID', column: 'AccountID', value: getFieldValue('AccountId') },
                { name: 'AccountName', label: 'Account Name', column: 'Name', value: getFieldValue('AccountName') }
            ],
            onSelect: (record) => {
                setFieldValue('AccountId', getCaseInsensitive(record, 'AccountID', 'AccountId'));
                setFieldValue('AccountName', getCaseInsensitive(record, 'AccountName', 'Name'));
            }
        });
    }

    function updateBranchAssignedButtonState() {
        setButtonDisabled(qs('[data-om-view-trigger="branch-assigned"]'), state.isBusy || !state.hasLoaded);
    }

    function bindModeButtons() {
        qsa('[data-shell-mode]').forEach((button) => {
            button.addEventListener('click', () => {
                const mode = button.getAttribute('data-shell-mode');
                if (mode === 'View') {
                    void fetchOfficer(getFieldValue('OfficerId'), 0, { quiet: false });
                    return;
                }

                if (mode === 'Add') {
                    clearOfficerForm();
                    setOfficerMode(MODES.ADD);
                    setToast('Adding a new officer record.', 'info');
                    return;
                }

                if (mode === 'Update') {
                    if (!state.hasLoaded) {
                        setToast('Load a record before editing.', 'warning');
                        return;
                    }

                    setOfficerMode(MODES.UPDATE);
                }
            });
        });
    }

    function bindActions() {
        qs('[data-om-action="save"]')?.addEventListener('click', () => void handleSaveOfficer());
        qs('[data-om-action="delete"]')?.addEventListener('click', () => void handleDeleteOfficer());
        qs('[data-om-action="resign"]')?.addEventListener('click', () => void handleResignOfficer());
        qs('[data-om-action="more-info"]')?.addEventListener('click', () => {
            const officerId = getFieldValue('OfficerId');
            setToast(
                officerId
                    ? `Officer ${officerId} is available for downstream loan and account workflows.`
                    : 'Load an officer to see related workflow information.',
                'info'
            );
        });

        qs('[data-om-action="cancel"]')?.addEventListener('click', () => {
            if (state.hasLoaded && state.officerMode !== MODES.VIEW) {
                void fetchOfficer(getFieldValue('OfficerId'), 0, { quiet: true });
            } else {
                clearOfficerForm();
                setOfficerMode(MODES.VIEW);
            }
        });

        qs('[data-om-view-trigger="branch-assigned"]')?.addEventListener('click', () => {
            if (!state.hasLoaded) {
                setToast('Load an officer first to manage assigned branches.', 'warning');
                return;
            }

            setView(VIEWS.BRANCH_ASSIGNED);
            setBranchMode(MODES.VIEW);
        });

        qs('[data-om-ba-action="back"]')?.addEventListener('click', () => {
            setView(VIEWS.OFFICER);
        });

        qs('[data-om-ba-action="edit"]')?.addEventListener('click', () => {
            if (!state.hasLoaded) {
                return;
            }

            setBranchMode(MODES.UPDATE);
        });

        qs('[data-om-ba-action="cancel"]')?.addEventListener('click', () => {
            if (state.hasLoaded) {
                void fetchBranchAssignmentsViaApi(getFieldValue('OfficerId'));
            }

            clearBranchAssignedFilters();
            state.branchGridAction = null;
            state.selectedBranchRowIndex = -1;
            setBranchMode(MODES.VIEW);
        });

        qs('[data-om-ba-action="save"]')?.addEventListener('click', () => void handleSaveBranchAssignments());

        qs('[data-om-ba-grid="new"]')?.addEventListener('click', () => {
            state.branchGridAction = 'new';
            state.selectedBranchRowIndex = -1;
            clearBranchAssignedFilters();
            updateBranchGridButtons();
        });

        qs('[data-om-ba-grid="alter"]')?.addEventListener('click', () => {
            if (state.selectedBranchRowIndex < 0) {
                setToast('Select a row to alter.', 'warning');
                return;
            }

            state.branchGridAction = 'alter';
            const row = state.branchAssignedRows[state.selectedBranchRowIndex];
            setFieldValue('BaReportingBranch', row.branchId);
            setFieldValue('BaReportingBranchName', row.branchName);
            setFieldValue('BaPeriod', row.period);
            setFieldValue('BaNoOfLoans', row.noOfLoans);
            setFieldValue('BaFixedAmount', row.fixedAmount);
            updateBranchGridButtons();
        });

        qs('[data-om-ba-grid="remove"]')?.addEventListener('click', () => {
            if (state.selectedBranchRowIndex < 0) {
                setToast('Select a row to remove.', 'warning');
                return;
            }

            state.branchAssignedRows.splice(state.selectedBranchRowIndex, 1);
            state.selectedBranchRowIndex = -1;
            renderBranchAssignedGrid();
        });

        qs('[data-om-ba-grid="update"]')?.addEventListener('click', () => {
            const branchId = getFieldValue('BaReportingBranch');
            if (!branchId) {
                setToast('Select a branch first.', 'warning');
                return;
            }

            const branchRecord = {
                branchId,
                branchName: getFieldValue('BaReportingBranchName'),
                period: getFieldValue('BaPeriod'),
                periodText: qs('#BaPeriod')?.selectedOptions?.[0]?.text || getFieldValue('BaPeriod'),
                noOfLoans: normalizeInteger(getFieldValue('BaNoOfLoans')),
                fixedAmount: formatAmount(getFieldValue('BaFixedAmount')),
                createdBy: getFieldValue('BaCreatedBy'),
                createdOn: getFieldValue('BaCreatedOn'),
                modifiedBy: getFieldValue('BaModifiedBy'),
                modifiedOn: getFieldValue('BaModifiedOn'),
                supervisedBy: getFieldValue('BaSupervisedBy'),
                supervisedOn: getFieldValue('BaSupervisedOn'),
                isNew: state.branchGridAction === 'new',
                isAltered: state.branchGridAction === 'alter'
            };

            if (state.branchGridAction === 'new') {
                if (state.branchAssignedRows.some((row) => row.branchId === branchRecord.branchId)) {
                    setToast('This branch is already assigned.', 'warning');
                    return;
                }

                state.branchAssignedRows.push(branchRecord);
            } else if (state.branchGridAction === 'alter' && state.selectedBranchRowIndex >= 0) {
                const existing = state.branchAssignedRows[state.selectedBranchRowIndex];
                branchRecord.isNew = existing?.isNew || false;
                branchRecord.isAltered = !existing?.isNew;
                state.branchAssignedRows[state.selectedBranchRowIndex] = branchRecord;
            }

            state.branchGridAction = null;
            state.selectedBranchRowIndex = -1;
            clearBranchAssignedFilters();
            renderBranchAssignedGrid();
        });

        qs('[data-om-ba-grid="clear"]')?.addEventListener('click', () => {
            state.branchGridAction = null;
            state.selectedBranchRowIndex = -1;
            clearBranchAssignedFilters();
            updateBranchGridButtons();
        });
    }

    function bindLookups() {
        qs('#btnOfficerLookup')?.addEventListener('click', () => void openOfficerSearch());
        qs('#btnClientLookup')?.addEventListener('click', () => void openClientSearch());
        qs('#btnBaseBranchLookup')?.addEventListener('click', () => void openBranchSearch('base'));
        qs('#btnBaBranchLookup')?.addEventListener('click', () => void openBranchSearch('ba'));
        qs('#btnReportingOfficerLookup')?.addEventListener('click', () => void openReportingOfficerSearch());
        qs('#btnAccountLookup')?.addEventListener('click', () => void openAccountSearch());
        qs('#OfficerId')?.addEventListener('blur', () => {
            if (state.officerMode === MODES.VIEW && getFieldValue('OfficerId')) {
                void fetchOfficer(getFieldValue('OfficerId'), 0, { quiet: true });
            }
        });
    }

    function normalizeNumericInputs() {
        ['#FixedAmount', '#BaFixedAmount'].forEach((selector) => {
            qs(selector)?.addEventListener('blur', (event) => {
                event.target.value = formatAmount(event.target.value);
            });
        });

        ['#NoOfLoans', '#BaNoOfLoans'].forEach((selector) => {
            qs(selector)?.addEventListener('blur', (event) => {
                event.target.value = normalizeInteger(event.target.value);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', async () => {
        try {
            initSectionToggles();
            initDatePickers();
            hideSummary();
            qs('.validation-summary__close')?.addEventListener('click', hideSummary);
            await ensureServicesLoaded();
            await initializeSearchModals();
            await loadOptions('Designation', 'OfficerTypeID');
            await loadOptions('Period', 'PaymentFrequencyID');
            await loadOptions('BaPeriod', 'PaymentFrequencyID');
            bindModeButtons();
            bindActions();
            bindLookups();
            normalizeNumericInputs();
            setView(VIEWS.OFFICER);
            setOfficerMode(MODES.VIEW);
            setBranchMode(MODES.VIEW);
            updateBranchAssignedButtonState();
            updateActionButtons();
        } catch (error) {
            console.error('[OfficerMaintenance] initialization failed', error);
            showSummary(error.message || 'Officer maintenance failed to initialize.', 'error');
        }
    });
})();