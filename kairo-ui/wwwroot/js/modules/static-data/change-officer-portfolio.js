(function () {
    'use strict';

    const LOOKUP_MODULE_ID = '5060';
    const PORTFOLIO_SEARCH_PAGE_SIZE = 1000;
    const PORTFOLIO_OFFICER_FILTER_FIELDS = ['GroupOfficerID', 'CenterOfficerID', 'OfficerID'];
    const API = {
        OFFICER_DETAILS: 'StaticData/ChangeOfficerPortfolio/officer-details',
        PORTFOLIO: 'StaticData/ChangeOfficerPortfolio/portfolio',
        TRANSFER: 'StaticData/ChangeOfficerPortfolio/transfer'
    };
    const MODE = {
        VIEW: 'view',
        CHANGE: 'change'
    };
    const GUIDANCE_STATE = {
        INFO: 'info',
        SUCCESS: 'success',
        WARNING: 'warning'
    };
    const state = {
        mode: MODE.VIEW,
        allCenters: [],
        centers: [],
        diagnostics: null
    };
    let designationOptionsLoaded = false;
    let pendingDesignationValue = '';

    function getAppCore() {
        const current = window;
        return current.AppCore || current.parent?.AppCore || current.top?.AppCore || null;
    }

    function getElement(id) {
        return document.getElementById(id);
    }

    function ensureToastContainer() {
        return getElement('toastContainer') || document.querySelector('[data-kairo-toast-container]');
    }

    function showToast(message, variant) {
        const container = ensureToastContainer();
        if (!container) {
            return;
        }

        container.innerHTML = '';
        const toast = document.createElement('div');
        toast.className = `kairo-toast kairo-toast--${variant || 'info'}`;
        toast.setAttribute('role', 'alert');
        toast.textContent = String(message || '');
        container.appendChild(toast);

        setTimeout(() => toast.classList.add('is-show'), 0);
        setTimeout(() => toast.remove(), 4500);
    }

    function showError(message) { showToast(message, 'danger'); }
    function showSuccess(message) { showToast(message, 'success'); }
    function showInfo(message) { showToast(message, 'info'); }
    function showWarning(message) { showToast(message, 'warning'); }

    function safeSerialize(value) {
        try {
            return JSON.stringify(value, null, 2);
        } catch {
            return String(value ?? '');
        }
    }

    function renderDiagnostics() {
        const panel = getElement('cop_debugPanel');
        const output = getElement('cop_debugOutput');
        if (!panel || !output) {
            return;
        }

        if (!state.diagnostics) {
            panel.hidden = true;
            output.value = '';
            return;
        }

        panel.hidden = false;
        output.value = safeSerialize(state.diagnostics);
        window.__copDiagnostics = state.diagnostics;
    }

    function setDiagnostics(snapshot) {
        state.diagnostics = snapshot;
        renderDiagnostics();
        window.__copDiagnostics = snapshot;
        console.log('[COP] Diagnostics snapshot', snapshot);
    }

    function clearDiagnostics() {
        state.diagnostics = null;
        renderDiagnostics();
        window.__copDiagnostics = null;
    }

    function tryParseJson(value) {
        if (typeof value !== 'string') {
            return value;
        }

        const trimmed = value.trim();
        if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
            return value;
        }

        try {
            return JSON.parse(trimmed);
        } catch {
            return value;
        }
    }

    function getPropertyValue(record, key) {
        if (!record || typeof record !== 'object') {
            return undefined;
        }

        if (Object.prototype.hasOwnProperty.call(record, key)) {
            return record[key];
        }

        const normalizedKey = String(key || '').toLowerCase();
        if (!normalizedKey) {
            return undefined;
        }

        const actualKey = Object.keys(record).find((candidate) => candidate.toLowerCase() === normalizedKey);
        return actualKey ? record[actualKey] : undefined;
    }

    function getFieldValue(record, keys) {
        const normalizedRecord = tryParseJson(record);
        for (const key of keys) {
            const value = getPropertyValue(normalizedRecord, key);
            if (value !== null && value !== undefined) {
                return String(value);
            }
        }

        return '';
    }

    function escapeSqlLiteral(value) {
        return String(value || '').replace(/'/g, "''");
    }

    function extractRowsFromPayload(payload) {
        const normalizedPayload = tryParseJson(payload);
        if (!normalizedPayload) {
            return [];
        }

        if (Array.isArray(normalizedPayload)) {
            return normalizedPayload;
        }

        const details = getPropertyValue(normalizedPayload, 'Details');
        if (Array.isArray(details)) {
            return details;
        }

        if (details && typeof details === 'object') {
            const detailResults = getPropertyValue(details, 'SearchResults');
            if (Array.isArray(detailResults)) {
                return detailResults;
            }

            return [details];
        }

        const lowerDetails = getPropertyValue(normalizedPayload, 'details');
        if (Array.isArray(lowerDetails)) {
            return lowerDetails;
        }

        const lowerDetailResults = getPropertyValue(lowerDetails, 'SearchResults');
        if (Array.isArray(lowerDetailResults)) {
            return lowerDetailResults;
        }

        if (lowerDetailResults && typeof lowerDetailResults === 'object') {
            return [lowerDetailResults];
        }

        const rows = getPropertyValue(normalizedPayload, 'Rows');
        if (Array.isArray(rows)) {
            return rows;
        }

        const lowerRows = getPropertyValue(normalizedPayload, 'rows');
        if (Array.isArray(lowerRows)) {
            return lowerRows;
        }

        const records = getPropertyValue(normalizedPayload, 'Records');
        if (Array.isArray(records)) {
            return records;
        }

        const lowerRecords = getPropertyValue(normalizedPayload, 'records');
        if (Array.isArray(lowerRecords)) {
            return lowerRecords;
        }

        const searchResults = getPropertyValue(normalizedPayload, 'SearchResults');
        if (Array.isArray(searchResults)) {
            return searchResults;
        }

        if (searchResults && typeof searchResults === 'object') {
            return [searchResults];
        }

        return [];
    }

    function extractSearchRows(response) {
        const normalizedResponse = tryParseJson(response);
        if (!normalizedResponse) {
            return [];
        }

        const success = getPropertyValue(normalizedResponse, 'success');
        const successUpper = getPropertyValue(normalizedResponse, 'Success');
        if (success === false || successUpper === false) {
            return [];
        }

        const candidates = [
            normalizedResponse,
            getPropertyValue(normalizedResponse, 'data'),
            getPropertyValue(normalizedResponse, 'Data'),
            getPropertyValue(getPropertyValue(normalizedResponse, 'data'), 'data'),
            getPropertyValue(getPropertyValue(normalizedResponse, 'data'), 'Data'),
            getPropertyValue(getPropertyValue(normalizedResponse, 'Data'), 'data'),
            getPropertyValue(getPropertyValue(normalizedResponse, 'Data'), 'Data'),
            getPropertyValue(normalizedResponse, 'RawBody')
        ];

        for (const candidate of candidates) {
            const rows = extractRowsFromPayload(candidate);
            if (rows.length > 0) {
                return rows;
            }
        }

        return [];
    }

    function extractLookupDetails(response) {
        const payload = response?.data || response?.Data || response;
        if (!payload || payload.ResponseCode && payload.ResponseCode !== '00') {
            return null;
        }

        if (payload.Details) {
            return Array.isArray(payload.Details) ? payload.Details[0] : payload.Details;
        }

        return null;
    }

    function currentDesignation() {
        return getElement('cop_designation')?.value?.trim() || '';
    }

    function currentPortfolioType() {
        return String(getElement('cop_portfolioType')?.value || 'G').trim().toUpperCase() || 'G';
    }

    function portfolioTypeLabel(portfolioType) {
        switch (String(portfolioType || '').trim().toUpperCase()) {
            case 'P':
                return 'Product';
            case 'A':
                return 'Account';
            case 'G':
            default:
                return 'Group';
        }
    }

    function getSourceOfficerType() {
        return String(pendingDesignationValue || currentDesignation() || '').trim().toUpperCase();
    }

    function describeBranchRule(portfolioType, officerTypeId) {
        const normalizedPortfolioType = String(portfolioType || '').trim().toUpperCase() || 'G';
        const normalizedOfficerType = String(officerTypeId || '').trim().toUpperCase();

        if (!normalizedOfficerType) {
            return {
                state: GUIDANCE_STATE.INFO,
                message: '',
                isSupported: false
            };
        }

        if (normalizedPortfolioType === 'G') {
            return {
                state: GUIDANCE_STATE.SUCCESS,
                message: `${designationLabel(normalizedOfficerType)} source selected. Group transfers use the group branch and update the selected centers together with related account and loan ownership references.`,
                isSupported: true
            };
        }

        if (normalizedPortfolioType === 'P') {
            if (normalizedOfficerType === 'AO') {
                return {
                    state: GUIDANCE_STATE.SUCCESS,
                    message: 'Account Officer source selected. Product transfers follow the AO branch and update account portfolio ownership for the selected records.',
                    isSupported: true
                };
            }

            if (normalizedOfficerType === 'CO') {
                return {
                    state: GUIDANCE_STATE.SUCCESS,
                    message: 'Credit Officer source selected. Product transfers follow the CO branch and update loan portfolio ownership for the selected records.',
                    isSupported: true
                };
            }

            return {
                state: GUIDANCE_STATE.WARNING,
                message: `${designationLabel(normalizedOfficerType)} is not handled by the Product branch in p_ChangePortfolio. Use an AO or CO source officer, or choose Group/Account instead.`,
                isSupported: false
            };
        }

        if (normalizedOfficerType === 'AO') {
            return {
                state: GUIDANCE_STATE.SUCCESS,
                message: 'Account Officer source selected. Account transfers follow the AO branch and update account officer ownership for the selected records.',
                isSupported: true
            };
        }

        if (normalizedOfficerType === 'CO' || normalizedOfficerType === 'CM') {
            return {
                state: GUIDANCE_STATE.SUCCESS,
                message: `${designationLabel(normalizedOfficerType)} source selected. Account transfers follow the ${normalizedOfficerType} branch and update both loan and account ownership references for the selected records.`,
                isSupported: true
            };
        }

        return {
            state: GUIDANCE_STATE.WARNING,
            message: `${designationLabel(normalizedOfficerType)} is not handled by the Account branch in p_ChangePortfolio. Use AO, CO, or CM as the source officer, or choose Group instead.`,
            isSupported: false
        };
    }

    function renderBranchGuidance() {
        const guidanceElement = getElement('cop_branchGuidance');
        if (!guidanceElement) {
            return;
        }

        const guidance = describeBranchRule(currentPortfolioType(), getSourceOfficerType());
        guidanceElement.dataset.guidanceState = guidance.state;
        guidanceElement.textContent = guidance.message;
    }

    function ensureSupportedBranch(showMessage) {
        const guidance = describeBranchRule(currentPortfolioType(), getSourceOfficerType());
        renderBranchGuidance();
        if (!guidance.isSupported && showMessage) {
            showWarning(guidance.message);
        }

        return guidance.isSupported;
    }

    function buildOfficerTypeFilterClauses(officerTypes) {
        const normalizedTypes = Array.from(new Set((Array.isArray(officerTypes) ? officerTypes : [])
            .map((officerType) => String(officerType || '').trim().toUpperCase())
            .filter(Boolean)));

        if (normalizedTypes.length === 0) {
            return [];
        }

        if (normalizedTypes.length === 1) {
            return [`OfficerTypeID='${escapeSqlLiteral(normalizedTypes[0])}'`];
        }

        const joinedTypes = normalizedTypes.map((officerType) => `'${escapeSqlLiteral(officerType)}'`).join(', ');
        return [`OfficerTypeID IN (${joinedTypes})`];
    }

    function getSignInOfficerTypes(portfolioType, sourceOfficerType) {
        const normalizedPortfolioType = String(portfolioType || '').trim().toUpperCase() || 'G';
        const normalizedSourceOfficerType = String(sourceOfficerType || '').trim().toUpperCase();

        if (!normalizedSourceOfficerType) {
            return [];
        }

        if (normalizedPortfolioType === 'G') {
            return [];
        }

        if (normalizedPortfolioType === 'P') {
            if (normalizedSourceOfficerType === 'AO') {
                return ['AO'];
            }

            if (normalizedSourceOfficerType === 'CO') {
                return ['CO'];
            }

            return [];
        }

        if (normalizedSourceOfficerType === 'AO') {
            return ['AO'];
        }

        if (normalizedSourceOfficerType === 'CO' || normalizedSourceOfficerType === 'CM') {
            return ['CO', 'CM'];
        }

        return [];
    }

    function buildSignInOfficerSearchClauses() {
        const clauses = [];
        const branchId = getElement('cop_branchId')?.value?.trim() || '';
        if (branchId) {
            clauses.push(`ReportingBranchID='${escapeSqlLiteral(branchId)}'`);
        }

        clauses.push(...buildOfficerTypeFilterClauses(getSignInOfficerTypes(currentPortfolioType(), getSourceOfficerType())));
        return clauses;
    }

    function currentSignInOfficerFilter() {
        return buildSignInOfficerSearchClauses().join(' AND ');
    }

    function currentPortfolioContextLabel() {
        const portfolioLabel = portfolioTypeLabel(currentPortfolioType());
        const sourceOfficerType = getSourceOfficerType();
        return sourceOfficerType
            ? `${portfolioLabel} transfer context for ${designationLabel(sourceOfficerType)}`
            : `${portfolioLabel} transfer context`;
    }

    function buildOfficerSearchClauses() {
        const clauses = [];
        const branchId = getElement('cop_branchId')?.value?.trim() || '';
        if (branchId) {
            clauses.push(`ReportingBranchID='${escapeSqlLiteral(branchId)}'`);
        }

        const designation = currentDesignation();
        if (designation) {
            clauses.push(`OfficerTypeID='${escapeSqlLiteral(designation)}'`);
        }

        return clauses;
    }

    function currentOfficerFilter() {
        return buildOfficerSearchClauses().join(' AND ');
    }

    function extractOfficerDetails(response) {
        const payload = response?.Data || response?.data || response;
        return payload?.Data || payload?.data || payload || null;
    }

    function extractOfficerName(details) {
        return getFieldValue(details, ['OfficerName', 'Name', 'Description']);
    }

    function extractOfficerId(details) {
        return getFieldValue(details, ['OfficerID', 'OfficerId', 'ID', 'Code']);
    }

    function extractOfficerType(details) {
        return getFieldValue(details, ['OfficerTypeID', 'OfficerTypeId', 'DesignationID', 'DesignationId', 'Designation']);
    }

    function findDesignationOption(designationElement, designationValue) {
        if (!designationElement || !designationValue) {
            return null;
        }

        const normalized = String(designationValue).trim().toUpperCase();
        return Array.from(designationElement.options || []).find((option) =>
            String(option.value || '').trim().toUpperCase() === normalized);
    }

    function designationLabel(officerTypeId) {
        const designationElement = getElement('cop_designation');
        const matchedOption = findDesignationOption(designationElement, officerTypeId);
        if (matchedOption?.textContent?.trim()) {
            return matchedOption.textContent.trim();
        }

        const normalized = String(officerTypeId || '').trim().toUpperCase();
        if (normalized === 'CO') {
            return 'Credit Officer';
        }

        if (normalized === 'AO') {
            return 'Account Officer';
        }

        if (normalized === 'CM') {
            return 'Credit Manager';
        }

        return normalized;
    }

    function setDerivedDesignation(officerTypeId) {
        const designationElement = getElement('cop_designation');
        if (!designationElement) {
            return;
        }

        const normalized = String(officerTypeId || '').trim();
        pendingDesignationValue = normalized;

        const matchedOption = findDesignationOption(designationElement, normalized);
        designationElement.value = matchedOption ? matchedOption.value : '';
        designationElement.title = normalized ? `Derived from selected officer: ${designationLabel(normalized)}` : '';
        renderBranchGuidance();
    }

    async function loadDesignationOptions() {
        const designationElement = getElement('cop_designation');
        const lookupService = window.LookupService;
        if (!designationElement || designationOptionsLoaded || !lookupService || typeof lookupService.getDesignations !== 'function') {
            return;
        }

        try {
            const options = await lookupService.getDesignations();
            const currentValue = designationElement.value?.trim() || pendingDesignationValue || '';

            designationElement.innerHTML = '';

            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = designationElement.dataset.placeholder || 'Select designation';
            designationElement.appendChild(placeholderOption);

            (Array.isArray(options) ? options : []).forEach((option) => {
                if (!option?.value) {
                    return;
                }

                const element = document.createElement('option');
                element.value = String(option.value).trim();
                element.textContent = option.label || option.value;
                designationElement.appendChild(element);
            });

            const matchedOption = findDesignationOption(designationElement, currentValue);
            designationElement.value = matchedOption ? matchedOption.value : '';
            designationElement.title = currentValue ? `Get from selected officer: ${designationLabel(currentValue)}` : '';
            designationOptionsLoaded = true;
            renderBranchGuidance();
        } catch (error) {
            console.error('Failed to load designation options for Change Officer Portfolio.', error);
        }
    }

    function applyOfficerDetails(fieldPrefix, details, fallbackDetails) {
        const idElement = getElement(`${fieldPrefix}Id`);
        const resolvedOfficerId = extractOfficerId(details) || extractOfficerId(fallbackDetails);
        if (idElement && resolvedOfficerId) {
            idElement.value = resolvedOfficerId;
        }

        const nameElement = getElement(`${fieldPrefix}Name`);
        const resolvedName = extractOfficerName(details) || extractOfficerName(fallbackDetails) || nameElement?.value?.trim() || '';
        if (nameElement && resolvedName) {
            nameElement.value = resolvedName;
        }

        if (fieldPrefix === 'cop_officer') {
            setDerivedDesignation(extractOfficerType(details) || extractOfficerType(fallbackDetails));
            clearPortfolioResults();
        }
    }

    async function loadOfficerDetails(fieldPrefix, officerId, fallbackDetails) {
        const appCore = getAppCore();
        if (!appCore || !officerId) {
            return null;
        }

        try {
            const response = await appCore.invokeControllerAsync(API.OFFICER_DETAILS, {
                OfficerID: officerId,
                BranchID: getElement('cop_branchId')?.value?.trim() || ''
            });

            const details = extractOfficerDetails(response);
            if (!details && !fallbackDetails) {
                return null;
            }

            applyOfficerDetails(fieldPrefix, details, fallbackDetails);
            return details || fallbackDetails || null;
        } catch (error) {
            if (!fallbackDetails) {
                throw error;
            }

            applyOfficerDetails(fieldPrefix, null, fallbackDetails);
            return fallbackDetails;
        }
    }

    function compareIds(left, right) {
        const leftValue = String(left || '').trim();
        const rightValue = String(right || '').trim();
        if (!leftValue || !rightValue) {
            return 0;
        }
        if (leftValue.length === rightValue.length) {
            return leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' });
        }
        return leftValue.localeCompare(rightValue, undefined, { sensitivity: 'base' });
    }

    function setMode(mode) {
        state.mode = mode;
        const canEdit = mode === MODE.CHANGE && state.centers.length > 0;

        const signInOfficerElement = getElement('cop_signInOfficerId');
        if (signInOfficerElement) {
            signInOfficerElement.disabled = !canEdit;
        }

        const effectiveDateElement = getElement('cop_effectiveDate');
        if (effectiveDateElement) {
            effectiveDateElement.disabled = false;
        }

        const selectAll = getElement('cop_selectAll');
        if (selectAll) {
            selectAll.disabled = !canEdit;
            selectAll.checked = false;
        }

        document.querySelectorAll('[data-cop-row-select]').forEach((checkbox) => {
            checkbox.disabled = !canEdit;
            checkbox.checked = false;
        });
    }

    function buildGroupSearchClauses(branchId) {
        const normalizedBranchId = String(branchId || '').trim();
        if (!normalizedBranchId) {
            return ['1=1'];
        }

        return [`OurBranchID='${escapeSqlLiteral(normalizedBranchId)}'`];
    }

    function buildGroupSearchFilter() {
        const branchId = getElement('cop_branchId')?.value?.trim() || '';
        return buildGroupSearchClauses(branchId).join(' AND ');
    }

    function buildBranchCentersFilters(branchId, officerId) {
        const baseClauses = buildGroupSearchClauses(branchId);
        const normalizedOfficerId = String(officerId || '').trim();
        if (normalizedOfficerId) {
            const escapedOfficerId = escapeSqlLiteral(normalizedOfficerId);
            return PORTFOLIO_OFFICER_FILTER_FIELDS.map((fieldName) => ({
                fieldName,
                filter: [...baseClauses, `${fieldName}='${escapedOfficerId}'`].join(' AND ')
            }));
        }

        return [{
            fieldName: null,
            filter: baseClauses.join(' AND ')
        }];
    }

    function extractSearchMessage(response) {
        const normalizedResponse = tryParseJson(response);
        if (!normalizedResponse || typeof normalizedResponse !== 'object') {
            return '';
        }

        const candidates = [
            getPropertyValue(normalizedResponse, 'message'),
            getPropertyValue(normalizedResponse, 'Message'),
            getPropertyValue(getPropertyValue(normalizedResponse, 'data'), 'ResponseMessage'),
            getPropertyValue(getPropertyValue(normalizedResponse, 'Data'), 'ResponseMessage')
        ];

        for (const candidate of candidates) {
            if (candidate !== null && candidate !== undefined && String(candidate).trim()) {
                return String(candidate).trim();
            }
        }

        return '';
    }

    function summarizeSearchAttempts(searchAttempts) {
        const messages = searchAttempts
            .map((attempt) => attempt.message)
            .filter((message) => message && !/^failed$/i.test(message));

        if (messages.length > 0) {
            return messages[0];
        }

        const attemptedFields = searchAttempts
            .map((attempt) => attempt.fieldName)
            .filter(Boolean);

        if (attemptedFields.length > 0) {
            return `No active groups found for the selected officer using ${attemptedFields.join(', ')}.`;
        }

        return 'No active groups found for the selected branch.';
    }

    async function openLookup(lookupKey) {
        const appCore = getAppCore();
        if (!appCore || typeof window.SearchModal !== 'function') {
            showError('Search dialog is not available.');
            return;
        }

        const searchModal = new window.SearchModal(appCore);
        const configs = {
            branch: {
                title: 'Branch Search',
                tableID: 'BranchID',
                searchFields: [
                    { name: 'branchId', label: 'Branch ID', column: 'OurBranchID' },
                    { name: 'branchName', label: 'Branch Name', column: 'BranchName' }
                ],
                displayFields: [
                    { key: 'OurBranchID', label: 'Branch ID' },
                    { key: 'BranchName', label: 'Branch Name' }
                ],
                onSelect: (row) => {
                    getElement('cop_branchId').value = getFieldValue(row, ['OurBranchID', 'BranchID', 'ID']);
                    getElement('cop_branchName').value = getFieldValue(row, ['BranchName', 'Description', 'Name']);
                    clearPortfolioResults();
                }
            },
            officer: {
                title: 'Officer Search',
                tableID: 'ActiveOfficerID',
                searchFields: [
                    { name: 'officerId', label: 'Officer ID', column: 'OfficerID' },
                    { name: 'officerName', label: 'Officer Name', column: 'OfficerName' }
                ],
                displayFields: [
                    { key: 'OfficerID', label: 'Officer ID' },
                    { key: 'OfficerName', label: 'Officer Name' }
                ],
                advFilterString: currentOfficerFilter(),
                onSelect: (row) => applyLookupSelection('cop_officer', row)
            },
            'sign-in-officer': {
                title: 'Sign-In Officer Search',
                tableID: 'ActiveOfficerID',
                searchFields: [
                    { name: 'officerId', label: 'Officer ID', column: 'OfficerID' },
                    { name: 'officerName', label: 'Officer Name', column: 'OfficerName' }
                ],
                displayFields: [
                    { key: 'OfficerID', label: 'Officer ID' },
                    { key: 'OfficerName', label: 'Officer Name' }
                ],
                advFilterString: currentSignInOfficerFilter(),
                onSelect: (row) => applyLookupSelection('cop_signInOfficer', row)
            },
            'from-group': {
                title: 'From Group Search',
                tableID: 'GroupID',
                searchFields: [
                    { name: 'groupId', label: 'Group ID', column: 'GroupID' },
                    { name: 'groupName', label: 'Group Name', column: 'GroupName' }
                ],
                displayFields: [
                    { key: 'GroupID', label: 'Group ID' },
                    { key: 'GroupName', label: 'Group Name' }
                ],
                advFilterString: buildGroupSearchFilter(),
                onSelect: (row) => applyLookupSelection('cop_fromGroup', row)
            },
            'to-group': {
                title: 'To Group Search',
                tableID: 'GroupID',
                searchFields: [
                    { name: 'groupId', label: 'Group ID', column: 'GroupID' },
                    { name: 'groupName', label: 'Group Name', column: 'GroupName' }
                ],
                displayFields: [
                    { key: 'GroupID', label: 'Group ID' },
                    { key: 'GroupName', label: 'Group Name' }
                ],
                advFilterString: buildGroupSearchFilter(),
                onSelect: (row) => applyLookupSelection('cop_toGroup', row)
            }
        };

        const config = configs[lookupKey];
        if (!config) {
            showWarning('Unsupported lookup.');
            return;
        }

        try {
            await searchModal.open({
                ...config,
                moduleIDOverride: Number(LOOKUP_MODULE_ID)
            });
        } catch (error) {
            showError(error?.message || 'Unable to open search dialog.');
        }
    }

    function applyLookupSelection(prefix, row) {
        const idElement = getElement(`${prefix}Id`);
        const nameElement = getElement(`${prefix}Name`);
        if (!idElement || !nameElement) {
            return;
        }

        const isOfficer = prefix === 'cop_officer' || prefix === 'cop_signInOfficer';
        idElement.value = getFieldValue(row, isOfficer ? ['OfficerID', 'ID'] : ['GroupID', 'ID']);
        nameElement.value = getFieldValue(row, isOfficer ? ['OfficerName', 'Name', 'Description'] : ['GroupName', 'Name', 'Description']);

        if (isOfficer) {
            loadOfficerDetails(prefix, idElement.value, row)
                .catch(() => showWarning(`Officer '${idElement.value}' details could not be loaded.`));
            return;
        }

        if (prefix === 'cop_officer') {
            clearPortfolioResults();
        }

        if (prefix === 'cop_fromGroup' || prefix === 'cop_toGroup') {
            applyRangeFilter();
        }
    }

    async function validateLookup(controlTypeId, idValue, options) {
        const appCore = getAppCore();
        if (!appCore || !idValue) {
            return null;
        }

        const response = await appCore.invokeControllerAsync('SearchModal/GetIDDescription', {
            ControlTypeID: controlTypeId,
            ID: idValue,
            OurBranchID: getElement('cop_branchId')?.value?.trim() || '',
            ModuleID: LOOKUP_MODULE_ID,
            BankID: '00',
            TypeID: options?.typeId || '',
            AdvanceFilter: options?.advanceFilter || '',
            LanguageID: 'en'
        });

        return extractLookupDetails(response);
    }

    async function validateBranch() {
        const branchId = getElement('cop_branchId')?.value?.trim() || '';
        if (!branchId) {
            getElement('cop_branchName').value = '';
            return false;
        }

        const details = await validateLookup('BranchID', branchId);
        if (!details) {
            getElement('cop_branchName').value = '';
            showWarning(`Branch '${branchId}' was not found.`);
            return false;
        }

        getElement('cop_branchName').value = getFieldValue(details, ['BranchName', 'Description', 'Name']);
        return true;
    }

    async function validateOfficer(fieldPrefix) {
        const officerId = getElement(`${fieldPrefix}Id`)?.value?.trim() || '';
        if (!officerId) {
            getElement(`${fieldPrefix}Name`).value = '';
            if (fieldPrefix === 'cop_officer') {
                setDerivedDesignation('');
            }
            return false;
        }

        let fallbackDetails = null;
        try {
            fallbackDetails = await validateLookup('ActiveOfficerID', officerId, {
                advanceFilter: fieldPrefix === 'cop_signInOfficer'
                    ? currentSignInOfficerFilter()
                    : currentOfficerFilter()
            });
        } catch {
            fallbackDetails = null;
        }

        const details = await loadOfficerDetails(fieldPrefix, officerId, fallbackDetails);
        if (!details) {
            getElement(`${fieldPrefix}Id`).value = '';
            getElement(`${fieldPrefix}Name`).value = '';
            if (fieldPrefix === 'cop_officer') {
                setDerivedDesignation('');
            }
            showWarning(`Officer '${officerId}' was not found.`);
            return false;
        }

        return true;
    }

    async function validateGroup(fieldPrefix) {
        const groupId = getElement(`${fieldPrefix}Id`)?.value?.trim() || '';
        if (!groupId) {
            getElement(`${fieldPrefix}Name`).value = '';
            applyRangeFilter();
            return false;
        }

        const details = await validateLookup('GroupID', groupId);
        if (!details) {
            getElement(`${fieldPrefix}Id`).value = '';
            getElement(`${fieldPrefix}Name`).value = '';
            showWarning(`Group '${groupId}' was not found.`);
            applyRangeFilter();
            return false;
        }

        getElement(`${fieldPrefix}Name`).value = getFieldValue(details, ['GroupName', 'Description', 'Name']);
        applyRangeFilter();
        return true;
    }

    function applyRangeFilter() {
        const fromGroupId = getElement('cop_fromGroupId')?.value?.trim() || '';
        const toGroupId = getElement('cop_toGroupId')?.value?.trim() || '';

        state.centers = state.allCenters.filter((row) => {
            if (!fromGroupId && !toGroupId) {
                return true;
            }

            const currentId = String(row.centerId || '').trim();
            if (!currentId) {
                return false;
            }

            if (fromGroupId && compareIds(currentId, fromGroupId) < 0) {
                return false;
            }

            if (toGroupId && compareIds(currentId, toGroupId) > 0) {
                return false;
            }

            return true;
        });

        renderCenters();
    }

    async function loadPortfolio() {
        const appCore = getAppCore();
        if (!appCore) {
            showError('AppCore is not available.');
            return;
        }

        const branchId = getElement('cop_branchId')?.value?.trim() || '';
        const officerId = getElement('cop_officerId')?.value?.trim() || '';
        if (!branchId || !officerId) {
            showWarning('Branch and Officer ID are required before viewing portfolio.');
            return;
        }

        try {
            const searchAttempts = [];
            let searchRequest = null;
            let searchResponse = null;
            let searchRows = [];

            for (const filterAttempt of buildBranchCentersFilters(branchId, officerId)) {
                const currentSearchRequest = {
                    TableID: 'GroupID',
                    WhereStmt: '',
                    AdvFilterString: filterAttempt.filter,
                    SearchKey: [],
                    ModuleID: LOOKUP_MODULE_ID,
                    PageSize: PORTFOLIO_SEARCH_PAGE_SIZE,
                    RefID: '',
                    PrevOrNext: 0,
                    OurBranchID: branchId
                };

                const currentSearchResponse = await appCore.invokeControllerAsync('SearchModal/Search', currentSearchRequest);
                const currentSearchRows = extractSearchRows(currentSearchResponse);
                const currentMessage = extractSearchMessage(currentSearchResponse);

                searchAttempts.push({
                    fieldName: filterAttempt.fieldName,
                    searchRequest: currentSearchRequest,
                    searchResponse: currentSearchResponse,
                    extractedRowCount: currentSearchRows.length,
                    message: currentMessage
                });

                searchRequest = currentSearchRequest;
                searchResponse = currentSearchResponse;
                searchRows = currentSearchRows;

                if (currentSearchRows.length > 0) {
                    break;
                }
            }

            const candidateCenters = searchRows.map((row) => ({
                centerId: getFieldValue(row, ['GroupID', 'GroupId', 'groupID', 'groupId', 'CenterID', 'CenterId', 'centerID', 'centerId', 'ID', 'Id', 'id']),
                centerName: getFieldValue(row, ['GroupName', 'Groupname', 'groupName', 'groupname', 'CenterName', 'Centername', 'centerName', 'centername', 'Description', 'description', 'Name', 'name']),
                updateCount: Number.parseInt(getFieldValue(row, ['UpdateCount', 'Updatecount', 'updateCount', 'updatecount']), 10) || 0
            })).filter((row) => row.centerId);

            setDiagnostics({
                capturedAt: new Date().toISOString(),
                branchId,
                officerId,
                searchAttempts,
                searchRequest,
                searchResponse,
                extractedRowCount: searchRows.length,
                extractedRows: searchRows,
                candidateCenterCount: candidateCenters.length,
                candidateCenters
            });

            if (candidateCenters.length === 0) {
                clearPortfolioResults();
                showWarning(summarizeSearchAttempts(searchAttempts));
                return;
            }

            if (candidateCenters.length >= PORTFOLIO_SEARCH_PAGE_SIZE) {
                showWarning(`Loaded the first ${PORTFOLIO_SEARCH_PAGE_SIZE} active groups for this branch. Narrow the group range if the portfolio looks incomplete.`);
            }

            const response = await appCore.invokeControllerAsync(API.PORTFOLIO, {
                BranchID: branchId,
                OfficerID: officerId,
                Centers: candidateCenters.map((center) => ({
                    CenterID: center.centerId,
                    CenterName: center.centerName,
                    UpdateCount: center.updateCount
                }))
            });

            const payload = response?.Data || response?.data || response;
            const portfolio = payload?.Data || payload?.data || payload;
            const rows = Array.isArray(portfolio?.Centers) ? portfolio.Centers : Array.isArray(portfolio?.centers) ? portfolio.centers : [];

            state.allCenters = rows.map((row) => ({
                centerId: getFieldValue(row, ['CenterID', 'CenterId', 'centerID', 'centerId', 'GroupID', 'GroupId', 'groupID', 'groupId', 'ID', 'Id', 'id']),
                centerName: getFieldValue(row, ['CenterName', 'Centername', 'centerName', 'centername', 'GroupName', 'Groupname', 'groupName', 'groupname', 'Description', 'description', 'Name', 'name']),
                updateCount: Number.parseInt(getFieldValue(row, ['UpdateCount', 'Updatecount', 'updateCount', 'updatecount']), 10) || 0
            })).filter((row) => row.centerId);

            setMode(MODE.VIEW);
            applyRangeFilter();
            showSuccess(`${state.centers.length} center(s) loaded.`);
        } catch (error) {
            showError(error?.message || 'Unable to load officer portfolio.');
        }
    }

    function renderCenters() {
        const tbody = getElement('cop_centersTableBody');
        const selectAll = getElement('cop_selectAll');
        const summaryText = getElement('cop_summaryText');
        if (!tbody || !summaryText) {
            return;
        }

        const contextLabel = currentPortfolioContextLabel();

        if (state.centers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No records to display.</td></tr>';
            if (selectAll) {
                selectAll.disabled = true;
                selectAll.checked = false;
            }
            summaryText.textContent = state.allCenters.length > 0
                ? `No centers match the selected group range for the current ${contextLabel}.`
                : `No portfolio loaded for the current ${contextLabel}.`;
            return;
        }

        tbody.innerHTML = state.centers.map((center) => [
            '<tr>',
            `<td><input type="checkbox" class="form-check-input" data-cop-row-select="${center.centerId}" ${state.mode !== MODE.CHANGE ? 'disabled' : ''}></td>`,
            `<td>${center.centerId}</td>`,
            `<td>${center.centerName || ''}</td>`,
            '</tr>'
        ].join('')).join('');

        if (selectAll) {
            selectAll.disabled = state.mode !== MODE.CHANGE;
            selectAll.checked = false;
        }

        summaryText.textContent = `${state.centers.length} center(s) loaded for ${contextLabel} using source officer ${getElement('cop_officerId')?.value?.trim() || '-'}.`;
    }

    function clearPortfolioResults() {
        state.allCenters = [];
        state.centers = [];
        clearDiagnostics();
        renderCenters();
        setMode(MODE.VIEW);
    }

    function getSelectedCenters() {
        return Array.from(document.querySelectorAll('[data-cop-row-select]:checked'))
            .map((checkbox) => checkbox.getAttribute('data-cop-row-select'))
            .filter(Boolean)
            .map((centerId) => {
                const existing = state.centers.find((row) => row.centerId === centerId);
                return {
                    CenterID: existing?.centerId || centerId,
                    CenterName: existing?.centerName || '',
                    UpdateCount: existing?.updateCount || 0
                };
            });
    }

    async function saveTransfer() {
        if (state.mode !== MODE.CHANGE) {
            showWarning('Use Change first before saving transfers.');
            return;
        }

        if (!ensureSupportedBranch(true)) {
            return;
        }

        const selectedCenters = getSelectedCenters();
        if (selectedCenters.length === 0) {
            showWarning('Select at least one center to transfer.');
            return;
        }

        const signInOfficerId = getElement('cop_signInOfficerId')?.value?.trim() || '';
        const effectiveDate = getElement('cop_effectiveDate')?.value?.trim() || '';
        if (!signInOfficerId || !effectiveDate) {
            showWarning('Sign-In Officer ID and Effective Date are required.');
            return;
        }

        const appCore = getAppCore();
        const confirmed = appCore && typeof appCore.showConfirmation === 'function'
            ? await appCore.showConfirmation('Confirm Transfer', `Transfer ${selectedCenters.length} center(s) to officer ${signInOfficerId}?`)
            : window.confirm(`Transfer ${selectedCenters.length} center(s) to officer ${signInOfficerId}?`);
        if (!confirmed) {
            return;
        }

        try {
            const response = await appCore.invokeControllerAsync(API.TRANSFER, {
                BranchID: getElement('cop_branchId')?.value?.trim() || '',
                OfficerID: getElement('cop_officerId')?.value?.trim() || '',
                SignInOfficerID: signInOfficerId,
                PortfolioType: getElement('cop_portfolioType')?.value || 'G',
                FromGroupID: getElement('cop_fromGroupId')?.value?.trim() || '',
                ToGroupID: getElement('cop_toGroupId')?.value?.trim() || '',
                EffectiveDate: effectiveDate,
                Centers: selectedCenters
            });

            const payload = response?.Data || response?.data || response;
            const result = payload?.Data || payload?.data || payload;
            const successCount = result?.SuccessCount ?? result?.successCount ?? 0;
            const errors = result?.Errors || result?.errors || [];

            if (errors.length > 0) {
                showWarning(`Transferred ${successCount} center(s). ${errors.length} failed.`);
            } else {
                showSuccess(`Transferred ${successCount} center(s) successfully.`);
            }

            await loadPortfolio();
        } catch (error) {
            showError(error?.message || 'Transfer failed.');
        }
    }

    function bindEvents() {
        getElement('cop_copyDiagnostics')?.addEventListener('click', async () => {
            const output = getElement('cop_debugOutput');
            const value = output?.value || '';
            if (!value) {
                showWarning('No diagnostics captured yet.');
                return;
            }

            try {
                await navigator.clipboard.writeText(value);
                showSuccess('Diagnostics copied.');
            } catch {
                output.focus();
                output.select();
                showInfo('Clipboard access failed. Diagnostics selected for manual copy.');
            }
        });

        document.querySelectorAll('[data-cop-lookup]').forEach((button) => {
            button.addEventListener('click', () => openLookup(button.getAttribute('data-cop-lookup')));
        });

        getElement('cop_branchId')?.addEventListener('blur', () => {
            validateBranch().catch(() => showWarning('Branch validation failed.'));
        });

        getElement('cop_officerId')?.addEventListener('blur', () => {
            validateOfficer('cop_officer').catch(() => showWarning('Officer validation failed.'));
        });

        getElement('cop_portfolioType')?.addEventListener('change', () => {
            renderBranchGuidance();
            renderCenters();
        });

        getElement('cop_signInOfficerId')?.addEventListener('blur', () => {
            validateOfficer('cop_signInOfficer').catch(() => showWarning('Sign-In Officer validation failed.'));
        });

        getElement('cop_fromGroupId')?.addEventListener('blur', () => {
            validateGroup('cop_fromGroup').catch(() => showWarning('Group validation failed.'));
        });

        getElement('cop_toGroupId')?.addEventListener('blur', () => {
            validateGroup('cop_toGroup').catch(() => showWarning('Group validation failed.'));
        });

        getElement('cop_btnView')?.addEventListener('click', () => loadPortfolio());
        getElement('cop_btnChange')?.addEventListener('click', () => {
            if (state.centers.length === 0) {
                showWarning('Load the portfolio before switching to change mode.');
                return;
            }

            if (!ensureSupportedBranch(true)) {
                return;
            }

            setMode(MODE.CHANGE);
            renderCenters();
            showInfo(`${describeBranchRule(currentPortfolioType(), getSourceOfficerType()).message} Select the centers to transfer, then provide the Sign-In Officer and Effective Date.`);
        });

        getElement('cop_btnSave')?.addEventListener('click', () => saveTransfer());
        getElement('cop_btnCancel')?.addEventListener('click', () => {
            clearPortfolioResults();
            ['cop_officerId', 'cop_officerName', 'cop_fromGroupId', 'cop_fromGroupName', 'cop_toGroupId', 'cop_toGroupName', 'cop_signInOfficerId', 'cop_signInOfficerName'].forEach((id) => {
                const element = getElement(id);
                if (element) {
                    element.value = '';
                }
            });
            setDerivedDesignation('');
            setMode(MODE.VIEW);
        });

        getElement('cop_selectAll')?.addEventListener('change', (event) => {
            const checked = event.target.checked;
            document.querySelectorAll('[data-cop-row-select]:not(:disabled)').forEach((checkbox) => {
                checkbox.checked = checked;
            });
        });
    }

    function initializeDefaults() {
        loadDesignationOptions().catch(() => undefined);

        const branchId = getElement('cop_defaultBranchId')?.value?.trim();
        if (branchId) {
            getElement('cop_branchId').value = branchId;
            validateBranch().catch(() => undefined);
        }

        setDerivedDesignation('');

        const today = new Date();
        getElement('cop_effectiveDate').value = today.toISOString().slice(0, 10);
        setMode(MODE.VIEW);
        renderCenters();
        renderDiagnostics();
        renderBranchGuidance();
    }

    document.addEventListener('DOMContentLoaded', () => {
        bindEvents();
        initializeDefaults();
    });
})();