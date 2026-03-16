/* Client Maintenance View - JavaScript Controller */

const CLIENT_MAINTENANCE_CONTROLLER_BASE = 'Identities/ClientMaintenance';

/**
 * CLIENT MAINTENANCE PARENT CONTEXT
 * 
 * This module maintains the parent client record state and makes it available
 * to all submodules via:
 * 
 * 1. window.ClientMaintenanceCore.getParentClientId() - Returns the active client ID
 * 2. window.ClientMaintenanceCore.getParentRequestId() - Returns the active request ID  
 * 3. window.ClientMaintenanceCore.getParentContext() - Returns full context object
 * 
 * Submodules (sidebar items) can access the parent client ID in their searches:
 * - The parent client ID is automatically passed to tab partial views via _cmLoadData
 * - Sidebar submodules can access via window.parent.ClientMaintenanceCore when in iframe
 * - The SidebarManager tracks the main record loaded state and prevents submodule
 *   access until a client record is loaded
 * 
 * State is updated when:
 * - Client is selected via Client ID search
 * - Application is selected via Application ID search
 * - Workflow is reset/cancelled
 */

function getAppCore() {
    const win = window;
    return win.AppCore ||
        (win.parent && win.parent !== win && win.parent.AppCore) ||
        (win.top && win.top !== win && win.top.AppCore) ||
        null;
}

function invokeController(basePath, action, requestData) {
    return new Promise((resolve, reject) => {
        const appCore = getAppCore();
        if (!appCore || typeof appCore.invokeController !== 'function') {
            reject(new Error('AppCore is not available (AppCore.invokeController not found)'));
            return;
        }

        const endpoint = `${basePath}/${action}`;
        const isClientMaintenanceRoute = String(basePath || '').toLowerCase().startsWith(CLIENT_MAINTENANCE_CONTROLLER_BASE.toLowerCase());
        const effectiveRequestData = isClientMaintenanceRoute
            ? enrichClientMaintenanceRequestData(requestData)
            : (requestData || {});

        appCore.invokeController(endpoint, effectiveRequestData || {}, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
}

function invokeControllerMethod(basePath, action, method, requestData, options) {
    return new Promise((resolve, reject) => {
        const appCore = getAppCore();
        if (!appCore || typeof appCore.invokeControllerByMethodAsync !== 'function') {
            reject(new Error('AppCore is not available (AppCore.invokeControllerByMethodAsync not found)'));
            return;
        }

        const endpoint = `${basePath}/${action}`;
        const effectiveOptions = options ? { ...options } : {};
        const isClientMaintenanceRoute = String(basePath || '').toLowerCase().startsWith(CLIENT_MAINTENANCE_CONTROLLER_BASE.toLowerCase());
        const hasFormBody = effectiveOptions.body instanceof FormData;
        const effectiveRequestData = isClientMaintenanceRoute && !hasFormBody
            ? enrichClientMaintenanceRequestData(requestData)
            : (requestData || {});

        if (isClientMaintenanceRoute && hasFormBody) {
            effectiveOptions.body = enrichClientMaintenanceRequestData(effectiveOptions.body);
        }

        appCore.invokeControllerByMethodAsync(endpoint, method || 'POST', effectiveRequestData || {}, effectiveOptions)
            .then(resolve)
            .catch(reject);
    });
}

function invokeControllerGet(basePath, action, requestData) {
    return invokeControllerMethod(basePath, action, 'GET', requestData || {}, { useQueryString: true });
}

function invokeControllerUpdate(basePath, action, requestData) {
    return invokeControllerMethod(basePath, action, 'PUT', requestData || {}, { useQueryString: false });
}

function invokeControllerDelete(basePath, action, requestData) {
    return invokeControllerMethod(basePath, action, 'DELETE', requestData || {}, { useQueryString: false });
}

function invokeControllerMultipart(basePath, action, formData, method = 'POST') {
    return invokeControllerMethod(basePath, action, method, null, {
        body: formData,
        includeJsonContentType: false
    });
}

function invokeControllerDownload(basePath, action, requestData) {
    return invokeControllerMethod(basePath, action, 'GET', requestData || {}, {
        responseType: 'blob',
        useQueryString: true
    });
}

function invokeClientMaintenanceController(action, requestData) {
    return invokeController(CLIENT_MAINTENANCE_CONTROLLER_BASE, action, requestData);
}

const CLIENT_MAINTENANCE_MONTH_MAP = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11
};

const CLIENT_MAINTENANCE_SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CLIENT_MAINTENANCE_RESPONSE_META_KEYS = new Set([
    'responsecode',
    'responsemessage',
    'success',
    'errormessage',
    'error',
    'message',
    'status',
    'statuscode',
    'details',
    'details01',
    'data',
    'records',
    'searchresults'
]);

function formatClientMaintenanceIsoDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatClientMaintenanceDisplayDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';

    const day = String(date.getDate()).padStart(2, '0');
    const month = CLIENT_MAINTENANCE_SHORT_MONTHS[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function parseClientMaintenanceDateValue(value) {
    if (value == null || value === '') return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    const text = String(value).trim();
    if (!text) return null;

    let match = text.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
    if (match) {
        return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }

    match = text.match(/^(\d{1,2})[-\/\s.,]+([a-z]{3,})[-\/\s.,]+(\d{4})$/i);
    if (match) {
        const month = CLIENT_MAINTENANCE_MONTH_MAP[String(match[2]).toLowerCase()];
        if (month !== undefined) {
            return new Date(Number(match[3]), month, Number(match[1]));
        }
    }

    match = text.match(/^(\d{1,2})[-\/\s.,]+(\d{1,2})[-\/\s.,]+(\d{4})$/);
    if (match) {
        return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    }

    const nativeDate = new Date(text);
    return Number.isNaN(nativeDate.getTime()) ? null : nativeDate;
}

function syncClientMaintenanceDateInput(input) {
    if (!input || !input._flatpickr) return;

    const isDisabled = Boolean(input.disabled || input.readOnly);
    try {
        input._flatpickr.set('clickOpens', !isDisabled);
        input._flatpickr.set('allowInput', !isDisabled);
        if (input._flatpickr.altInput) {
            input._flatpickr.altInput.disabled = isDisabled;
            input._flatpickr.altInput.readOnly = isDisabled;
        }
        if (isDisabled) input._flatpickr.close();
    } catch (error) {
        console.warn('[ClientMaintenance] Failed to sync flatpickr state:', error);
    }
}

function initializeClientMaintenanceDatePickers(scopeRoot = document) {
    if (!scopeRoot || typeof window.flatpickr !== 'function') return;

    const dateInputs = Array.from(scopeRoot.querySelectorAll('input[type="date"]')).filter((input) => {
        return !input.hasAttribute('data-no-flatpickr');
    });

    dateInputs.forEach((input) => {
        if (input._flatpickr) {
            syncClientMaintenanceDateInput(input);
            return;
        }

        try {
            window.flatpickr(input, {
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'd-M-Y',
                altInputClass: input.className || 'form-control',
                parseDate: parseClientMaintenanceDateValue,
                formatDate: (date, format) => {
                    if (format === 'Y-m-d') {
                        return formatClientMaintenanceIsoDate(date);
                    }

                    return formatClientMaintenanceDisplayDate(date);
                },
                disableMobile: true,
                monthSelectorType: 'dropdown',
                minDate: input.getAttribute('min') || undefined,
                maxDate: input.getAttribute('max') || undefined,
                clickOpens: !(input.disabled || input.readOnly),
                allowInput: !(input.disabled || input.readOnly),
                onReady: (_selectedDates, _dateStr, instance) => {
                    if (instance?.altInput) {
                        instance.altInput.placeholder = input.getAttribute('placeholder') || 'dd-MMM-yyyy';
                        instance.altInput.readOnly = Boolean(input.readOnly);
                        instance.altInput.disabled = Boolean(input.disabled);
                        if (input.getAttribute('aria-label')) instance.altInput.setAttribute('aria-label', input.getAttribute('aria-label'));
                        if (input.getAttribute('aria-describedby')) instance.altInput.setAttribute('aria-describedby', input.getAttribute('aria-describedby'));
                    }
                    syncClientMaintenanceDateInput(instance.input);
                },
                onOpen: (_selectedDates, _dateStr, instance) => {
                    if (instance.input.disabled || instance.input.readOnly) {
                        instance.close();
                    }
                }
            });
        } catch (error) {
            console.warn('[ClientMaintenance] Failed to initialize flatpickr:', error);
        }
    });
}

function syncClientMaintenanceFlatpickrInScope(scopeRoot = document) {
    if (!scopeRoot) return;

    scopeRoot.querySelectorAll('input').forEach((input) => {
        syncClientMaintenanceDateInput(input);
    });
}

function getClientMaintenanceClientTypeId() {
    const shell = document.querySelector('[data-client-maintenance]');
    const selectedClientType = String(shell?.querySelector('#ddl_mainClientType')?.value || '').trim();
    if (selectedClientType) {
        return selectedClientType;
    }

    const workflowType = window.ClientMaintenanceCore?.workflowId;
    return workflowType == null ? '' : String(workflowType).trim();
}

function buildClientMaintenanceRequestContext(options = {}) {
    const requireSelection = Boolean(options.requireSelection);
    const shell = document.querySelector('[data-client-maintenance]');
    const moduleId =
        String(window.ClientMaintenanceCore?.moduleId || shell?.getAttribute('data-module-id') || '').trim();
    const clientId =
        String(window.ClientMaintenanceCore?.clientId || shell?.querySelector('#txt_mainClientId')?.value || '').trim();
    const requestId =
        String(window.ClientMaintenanceCore?.requestId || shell?.querySelector('#txt_mainApplicationId')?.value || '').trim();
    const clientTypeId = getClientMaintenanceClientTypeId();

    if (requireSelection && !clientId && !requestId) {
        return null;
    }

    const context = {
        ModuleID: moduleId,
        ClientID: clientId,
        RequestID: requestId,
        ApplicationID: requestId
    };

    if (clientTypeId) {
        context.ClientTypeID = clientTypeId;
    }

    return context;
}

function setClientMaintenanceFormDataIfMissing(formData, key, value) {
    if (!(formData instanceof FormData)) return;
    const normalizedValue = value == null ? '' : String(value).trim();
    if (!normalizedValue) return;

    const existingValue = formData.get(key);
    if (existingValue == null || String(existingValue).trim() === '') {
        formData.set(key, normalizedValue);
    }
}

function setClientMaintenanceObjectIfMissing(target, key, value) {
    if (!target || typeof target !== 'object') return;

    const normalizedValue = value == null ? '' : String(value).trim();
    if (!normalizedValue) return;

    const existingValue = target[key];
    if (existingValue == null || String(existingValue).trim() === '') {
        target[key] = normalizedValue;
    }
}

function resolveClientMaintenanceTransportContext() {
    const context = buildClientMaintenanceRequestContext({ requireSelection: false }) || {};
    const moduleId = String(context.ModuleID || '').trim();
    const clientId = String(context.ClientID || '').trim();
    const requestId = String(context.RequestID || '').trim();
    const applicationId = String(context.ApplicationID || requestId).trim();
    const clientTypeId = String(context.ClientTypeID || '').trim();

    return {
        ModuleID: moduleId,
        ClientID: clientId,
        RequestID: requestId,
        ApplicationID: applicationId || requestId,
        ClientTypeID: clientTypeId
    };
}

function enrichClientMaintenanceFormData(formData, context) {
    if (!(formData instanceof FormData)) {
        return formData;
    }

    const effectiveContext = context || resolveClientMaintenanceTransportContext();

    setClientMaintenanceFormDataIfMissing(formData, 'ModuleID', effectiveContext.ModuleID);
    setClientMaintenanceFormDataIfMissing(formData, 'ClientID', effectiveContext.ClientID);
    setClientMaintenanceFormDataIfMissing(formData, 'RequestID', effectiveContext.RequestID);
    setClientMaintenanceFormDataIfMissing(formData, 'ApplicationID', effectiveContext.ApplicationID || effectiveContext.RequestID);
    setClientMaintenanceFormDataIfMissing(formData, 'ClientTypeID', effectiveContext.ClientTypeID);

    setClientMaintenanceFormDataIfMissing(formData, 'RequestData.ModuleID', effectiveContext.ModuleID);
    setClientMaintenanceFormDataIfMissing(formData, 'RequestData.ClientID', effectiveContext.ClientID);
    setClientMaintenanceFormDataIfMissing(formData, 'RequestData.RequestID', effectiveContext.RequestID);
    setClientMaintenanceFormDataIfMissing(formData, 'RequestData.ApplicationID', effectiveContext.ApplicationID || effectiveContext.RequestID);
    setClientMaintenanceFormDataIfMissing(formData, 'RequestData.ClientTypeID', effectiveContext.ClientTypeID);

    return formData;
}

function enrichClientMaintenanceRequestData(requestData) {
    const context = resolveClientMaintenanceTransportContext();

    if (requestData instanceof FormData) {
        return enrichClientMaintenanceFormData(requestData, context);
    }

    const payload = requestData && typeof requestData === 'object'
        ? { ...requestData }
        : {};

    if (payload.RequestData && typeof payload.RequestData === 'object' && !Array.isArray(payload.RequestData)) {
        payload.RequestData = { ...payload.RequestData };
    }

    setClientMaintenanceObjectIfMissing(payload, 'ModuleID', context.ModuleID);
    setClientMaintenanceObjectIfMissing(payload, 'ClientID', context.ClientID);
    setClientMaintenanceObjectIfMissing(payload, 'RequestID', context.RequestID);
    setClientMaintenanceObjectIfMissing(payload, 'ApplicationID', context.ApplicationID || context.RequestID);
    setClientMaintenanceObjectIfMissing(payload, 'ClientTypeID', context.ClientTypeID);

    if (payload.RequestData && typeof payload.RequestData === 'object' && !Array.isArray(payload.RequestData)) {
        setClientMaintenanceObjectIfMissing(payload.RequestData, 'ModuleID', context.ModuleID);
        setClientMaintenanceObjectIfMissing(payload.RequestData, 'ClientID', context.ClientID);
        setClientMaintenanceObjectIfMissing(payload.RequestData, 'RequestID', context.RequestID);
        setClientMaintenanceObjectIfMissing(payload.RequestData, 'ApplicationID', context.ApplicationID || context.RequestID);
        setClientMaintenanceObjectIfMissing(payload.RequestData, 'ClientTypeID', context.ClientTypeID);
    }

    setClientMaintenanceObjectIfMissing(payload, 'RequestID', payload.ApplicationID);
    setClientMaintenanceObjectIfMissing(payload, 'ApplicationID', payload.RequestID);

    return payload;
}

function normalizeLookupRows(candidate) {
    if (candidate == null) return [];

    if (Array.isArray(candidate)) {
        return candidate.filter((item) => item != null);
    }

    if (typeof candidate === 'string') {
        const text = candidate.trim();
        if (!text) return [];
        try {
            const parsed = JSON.parse(text);
            return normalizeLookupRows(parsed);
        } catch (_) {
            return [];
        }
    }

    if (typeof candidate === 'object') {
        if (candidate.Details != null) return normalizeLookupRows(candidate.Details);
        if (candidate.Details01 != null) return normalizeLookupRows(candidate.Details01);
        if (candidate.details != null) return normalizeLookupRows(candidate.details);
        if (candidate.SearchResults != null) return normalizeLookupRows(candidate.SearchResults);
        if (candidate.Records != null) return normalizeLookupRows(candidate.Records);
        return [candidate];
    }

    return [];
}

function getLookupRowsFromIdDescriptionResponse(response) {
    const payload = response?.data ?? response?.Data ?? response?.raw ?? response;
    const candidates = [
        payload,
        payload?.data,
        payload?.Data,
        payload?.details,
        payload?.Details,
        payload?.Details01
    ];

    for (const candidate of candidates) {
        const rows = normalizeLookupRows(candidate);
        if (rows.length) return rows;
    }

    return [];
}

function getIdDescriptionResponseCode(response) {
    const payload = response?.data ?? response?.Data ?? response?.raw ?? response;
    const candidates = [
        payload?.ResponseCode,
        payload?.responseCode,
        payload?.data?.ResponseCode,
        payload?.data?.responseCode
    ];

    for (const candidate of candidates) {
        const value = String(candidate ?? '').trim();
        if (value) return value;
    }

    return '';
}

function getIdDescriptionMessage(response, fallback = '') {
    const payload = response?.data ?? response?.Data ?? response?.raw ?? response;
    const candidates = [
        response?.message,
        response?.Message,
        payload?.ResponseMessage,
        payload?.responseMessage,
        payload?.data?.ResponseMessage,
        payload?.data?.responseMessage
    ];

    for (const candidate of candidates) {
        const value = String(candidate ?? '').trim();
        if (value) return value;
    }

    return fallback;
}

function getLookupRecordValue(record, candidates) {
    if (!record || typeof record !== 'object' || !Array.isArray(candidates) || !candidates.length) {
        return '';
    }

    const lookup = buildDataLookup(record);
    const value = getLookupValue(lookup, candidates);
    return String(value ?? '').trim();
}

async function lookupClientMaintenanceIdDescription(options = {}) {
    const appCore = getAppCore();
    if (!appCore || typeof appCore.invokeControllerAsync !== 'function') {
        return {
            success: false,
            record: null,
            description: '',
            message: 'AppCore.invokeControllerAsync is not available'
        };
    }

    const controlTypeId = String(options.controlTypeId || options.tableID || options.tableId || '').trim();
    const idValue = String(options.id || '').trim();

    if (!controlTypeId || !idValue) {
        return {
            success: false,
            record: null,
            description: '',
            message: 'ControlTypeID and ID are required'
        };
    }

    const requestPayload = {
        ControlTypeID: controlTypeId,
        ID: idValue,
        BankID: String(options.bankId ?? options.BankID ?? '00'),
        TypeID: String(options.typeId ?? options.TypeID ?? ''),
        AdvanceFilter: String(options.advanceFilter ?? options.AdvanceFilter ?? ''),
        LanguageID: String(options.languageId ?? options.LanguageID ?? ''),
        ModuleID: String(options.moduleId ?? options.ModuleID ?? window.ClientMaintenanceCore?.moduleId ?? ''),
        OurBranchID: String(
            options.ourBranchId ??
            options.OurBranchID ??
            window.Environment?.ourBranchId ??
            window.Environment?.ourBranchID ??
            ''
        )
    };

    const response = await appCore.invokeControllerAsync('SearchModal/GetIDDescription', requestPayload);
    const explicitSuccess = response?.success ?? response?.Success;
    const responseCode = getIdDescriptionResponseCode(response);

    if (explicitSuccess === false || (responseCode && responseCode !== '00')) {
        return {
            success: false,
            record: null,
            description: '',
            response,
            message: getIdDescriptionMessage(response, 'Lookup returned no matching record')
        };
    }

    const rows = getLookupRowsFromIdDescriptionResponse(response);
    const record = rows[0] || null;
    const descriptionCandidates = Array.isArray(options.descriptionFieldCandidates) && options.descriptionFieldCandidates.length
        ? options.descriptionFieldCandidates
        : ['Description', 'Name', 'ClientName', 'AccountName', 'BranchName', 'BankName', 'UserName', 'FullName'];

    return {
        success: Boolean(record),
        record,
        description: getLookupRecordValue(record, descriptionCandidates),
        response,
        message: getIdDescriptionMessage(response, '')
    };
}

window.ClientMaintenanceCore = {
    getAppCore,
    invokeController,
    invokeControllerMethod,
    invokeControllerGet,
    invokeControllerUpdate,
    invokeControllerDelete,
    invokeControllerMultipart,
    invokeControllerDownload,
    lookupIdDescription: lookupClientMaintenanceIdDescription,
    invokeClientMaintenanceController,
    moduleId: null,
    clientId: null,
    clientName: null,
    requestId: null,
    useRequestId: false,
    workflowId: null,
    workflowStageRequestId: 0,
    isMainWorkflowLocked: false,
    isEditMode: false,
    canEditCurrent: false,
    shellState: 'idle',
    hasLoadedRecord: false,
    singleStageEditLockActive: false,
    recentActivityTrackedClientId: null,
    _shellLoadingDepth: 0,
    // Registry to track loaded tabs and their load functions
    _loadedTabsRegistry: new Map(),

    /**
     * Register a tab's load function
     * Called by tab initializers when they set up the _cmLoadData function
     */
    registerTabLoadFunction(tabKey, loadFunction) {
        if (tabKey && typeof loadFunction === 'function') {
            this._loadedTabsRegistry.set(tabKey, loadFunction);
            console.log(`[ClientMaintenance] Registered load function for tab: ${tabKey}`);
        }
    },

    /**
     * Get all registered tab load functions
     */
    getLoadedTabLoadFunctions() {
        return Array.from(this._loadedTabsRegistry.values());
    },

    /**
     * Clear the registry (useful for reset)
     */
    clearTabRegistry() {
        this._loadedTabsRegistry.clear();
    },

    getSelectedId() {
        if (this.useRequestId) {
            return this.requestId || '';
        }
        return this.clientId || this.requestId || '';
    },
    showToast(message, type = 'info') {
        if (window.NotificationService?.showToast) {
            window.NotificationService.showToast(message, type, 4000);
            return;
        }
        console.log(`[${type}] ${message}`);
    },
    /**
     * Expose the parent client ID for submodules to access
     * This allows child forms/submodules to get the active client context
     */
    getParentClientId() {
        return this.clientId || '';
    },
    /**
     * Expose the parent request ID for submodules to access
     */
    getParentRequestId() {
        return this.requestId || '';
    },
    /**
       * Get the full context for submodules (includes clientId, requestId, moduleId, clientTypeId)
       */
    getParentContext() {
        const mainClientNameInput = document.getElementById('txt_mainClientName');
        const clientName = String(this.clientName || mainClientNameInput?.value || '').trim();
        return {
            moduleId: this.moduleId || '',
            clientId: this.clientId || '',
            clientName,
            requestId: this.requestId || '',
            clientTypeId: getClientMaintenanceClientTypeId(),
            useRequestId: this.useRequestId,
            selectedId: this.getSelectedId()
        };
    }
};

function getClientMaintenanceShellLoadingElements() {
    const shell = document.querySelector('[data-client-maintenance]');
    if (!shell) return {};

    return {
        shell,
        overlay: shell.querySelector('[data-cm-shell-loading-overlay]'),
        text: shell.querySelector('[data-cm-shell-loading-text]')
    };
}

function setClientMaintenanceShellLoading(isLoading, message) {
    const { shell, overlay, text } = getClientMaintenanceShellLoadingElements();
    if (!shell || !overlay) return;

    if (text && message) {
        text.textContent = String(message);
    }

    overlay.hidden = !isLoading;
    shell.setAttribute('aria-busy', isLoading ? 'true' : 'false');
}

function beginClientMaintenanceShellLoading(message = 'Loading...') {
    if (!window.ClientMaintenanceCore) return;

    const nextDepth = Number(window.ClientMaintenanceCore._shellLoadingDepth || 0) + 1;
    window.ClientMaintenanceCore._shellLoadingDepth = nextDepth;
    setClientMaintenanceShellLoading(true, message);
}

function endClientMaintenanceShellLoading() {
    if (!window.ClientMaintenanceCore) return;

    const nextDepth = Math.max(0, Number(window.ClientMaintenanceCore._shellLoadingDepth || 0) - 1);
    window.ClientMaintenanceCore._shellLoadingDepth = nextDepth;

    if (nextDepth === 0) {
        setClientMaintenanceShellLoading(false);
    }
}

async function withClientMaintenanceShellLoading(work, message = 'Loading...') {
    beginClientMaintenanceShellLoading(message);
    try {
        return await work();
    } finally {
        endClientMaintenanceShellLoading();
    }
}

const ClientMaintenanceService = {
    validateClient(requestData) {
        return invokeClientMaintenanceController('validate-client', requestData);
    },
    getBasic(requestData) {
        return invokeClientMaintenanceController('get-basic', requestData);
    },
    createBasic(requestData) {
        return invokeClientMaintenanceController('create-basic', requestData);
    },
    updateBasic(requestData) {
        return invokeClientMaintenanceController('update-basic', requestData);
    },
    deleteBasic(requestData) {
        return invokeClientMaintenanceController('delete-basic', requestData);
    },
    getWorkflowStage(requestData) {
        return invokeClientMaintenanceController('get-workflow-stage', requestData);
    }
};

window.ClientMaintenanceService = ClientMaintenanceService;

const clientMaintenanceTabCatalog = [
    { key: 'Personal', pane: 'dv_tabClientPersonal', route: 'Personal/Index', initFn: 'initClientMaintenancePersonalTab' },
    { key: 'Corporate', pane: 'dv_tabClientCorporate', route: 'Corporate/Index', initFn: 'initClientMaintenanceCorporateTab' },
    { key: 'Address', pane: 'dv_tabClientAddress', route: 'Address/Index', initFn: 'initClientMaintenanceAddressTab' },
    { key: 'Relations', pane: 'dv_tabClientRelations', route: 'Relations/Index', initFn: 'initClientMaintenanceRelationsTab' },
    { key: 'Employment', pane: 'dv_tabClientEmployment', route: 'Employment/Index', initFn: 'initClientMaintenanceEmploymentTab' },
    { key: 'Offers', pane: 'dv_tabClientOffers', route: 'Offers/Index', initFn: 'initClientMaintenanceOffersTab' },
    { key: 'GroupDetail', pane: 'dv_tabClientGroupDetail', route: 'GroupDetail/Index', initFn: 'initClientMaintenanceGroupDetailTab' },
    { key: 'Kyc', pane: 'dv_tabClientKyc', route: 'Kyc/Index', initFn: 'initClientMaintenanceKycTab' },
    { key: 'Products', pane: 'dv_tabClientProducts', route: 'Products/Index', initFn: 'initClientMaintenanceProductsTab' },
    { key: 'PhotoSignature', pane: 'dv_tabClientPhotoSignature', route: 'PhotoSignature/Index', initFn: 'initClientMaintenancePhotoSignatureTab' },
    { key: 'Documents', pane: 'dv_tabClientDocuments', route: 'Documents/Index', initFn: 'initClientMaintenanceDocumentsTab' },
    { key: 'IdentityTypes', pane: 'dv_tabClientIdentityTypes', route: 'IdentityTypes/Index', initFn: 'initClientMaintenanceIdentityTypesTab' },
    { key: 'Submit', pane: 'dv_tabClientSubmit', route: 'Submit/Index', initFn: 'initClientMaintenanceSubmitTab' }
];
//{ key: 'Submit', pane: 'dv_tabClientSubmit', route: 'Submit/Index', initFn: 'initClientMaintenanceSubmitTab' }
const clientMaintenanceStageAliases = {
    'personal': 'Personal',
    'personal detail': 'Personal',
    'corporate': 'Corporate',
    'corporate detail': 'Corporate',
    'address': 'Address',
    'relations': 'Relations',
    'employment': 'Employment',
    'offers': 'Offers',
    'group detail': 'GroupDetail',
    'other details': 'Kyc',
    'kyc': 'Kyc',
    'products and services': 'Products',
    'products services': 'Products',
    'photo and signature': 'PhotoSignature',
    'photo signature': 'PhotoSignature',
    'documents': 'Documents',
    'identity types': 'IdentityTypes',
    'client identity types': 'IdentityTypes',
    'submit': 'Submit',
    'submission': 'Submit'
};

const clientMaintenanceTabMap = new Map(
    clientMaintenanceTabCatalog.map((item) => [item.key.toLowerCase(), item])
);

const clientMaintenanceTabServiceMap = {
    Personal: 'ClientMaintenancePersonalService',
    Corporate: 'ClientMaintenanceCorporateService',
    Address: 'ClientMaintenanceAddressService',
    Relations: 'ClientMaintenanceRelationsService',
    Employment: 'ClientMaintenanceEmploymentService',
    Offers: 'ClientMaintenanceOffersService',
    GroupDetail: 'ClientMaintenanceGroupDetailService',
    Kyc: 'ClientMaintenanceKycService',
    Products: 'ClientMaintenanceProductsService',
    PhotoSignature: 'ClientMaintenancePhotoSignatureService',
    Documents: 'ClientMaintenanceDocumentsService',
    IdentityTypes: 'ClientMaintenanceIdentityTypesService',
    Submit: 'ClientMaintenanceSubmitService'
};

const clientMaintenanceTabScriptMap = {
    Personal: '/js/modules/identities/client-maintenance/client-personal.js',
    Corporate: '/js/modules/identities/client-maintenance/client-corporate.js',
    Address: '/js/modules/identities/client-maintenance/_clientAddress.js',
    Relations: '/js/modules/identities/client-maintenance/_clientRelations.js',
    Employment: '/js/modules/identities/client-maintenance/client-employment.js',
    Offers: '/js/modules/identities/client-maintenance/client-offers.js',
    GroupDetail: '/js/modules/identities/client-maintenance/client-group-detail.js',
    Kyc: '/js/modules/identities/client-maintenance/client-kyc.js',
    Products: '/js/modules/identities/client-maintenance/client-products.js',
    PhotoSignature: '/js/modules/identities/client-maintenance/client-photo-signature.js',
    Documents: '/js/modules/identities/client-maintenance/client-documents.js',
    IdentityTypes: '/js/modules/identities/client-maintenance/client-identity-types.js',
    Submit: '/js/modules/identities/client-maintenance/client-submit.js'
};

const loadedTabScriptSet = new Set();
const tabScriptLoadPromiseMap = new Map();

function resolveTabScriptUrl(scriptPath) {
    const normalizedPath = scriptPath.startsWith('/') ? scriptPath : `/${scriptPath}`;
    const marker = '/js/modules/identities/client-maintenance/client-maintenance.js';

    const currentScript = Array.from(document.scripts || []).find((script) => {
        const src = String(script?.src || '').toLowerCase();
        return src.includes(marker);
    });

    if (!currentScript?.src) {
        return normalizedPath;
    }

    const currentSrc = String(currentScript.src || '');
    const markerIndex = currentSrc.toLowerCase().indexOf(marker);
    if (markerIndex === -1) {
        return normalizedPath;
    }

    return `${currentSrc.substring(0, markerIndex)}${normalizedPath}`;
}

async function ensureTabScriptLoaded(config) {
    console.log(config);
    const tabKey = config?.key || '';
    const scriptPath = clientMaintenanceTabScriptMap[tabKey];
    console.log(scriptPath);
    if (!scriptPath) return;

    const normalizedPath = scriptPath.toLowerCase();
    const scriptUrl = resolveTabScriptUrl(scriptPath);

    //console.log(scriptUrl);
    //console.log(normalizedPath);
    //console.log(loadedTabScriptSet);
    if (loadedTabScriptSet.has(normalizedPath)) {
        let isExistingScript = Array.from(document.scripts || []).find((script) => {
            const src = String(script?.src || '').toLowerCase();
            return src.includes(normalizedPath);
        });
        //console.log(isExistingScript);
        if (isExistingScript)
            return;
    }

    //console.log(tabScriptLoadPromiseMap);
    if (tabScriptLoadPromiseMap.has(normalizedPath)) {
        await tabScriptLoadPromiseMap.get(normalizedPath);
        return;
    }

    const existingScript = Array.from(document.head.querySelectorAll('script') || []).find((script) => {
        //const existingScript = Array.from(document.scripts || []).find((script) => {
        const src = String(script?.src || '').toLowerCase();
        return src.includes(normalizedPath);
    });
    console.log(existingScript);
    if (existingScript) {
        loadedTabScriptSet.add(normalizedPath);
        return;
    }

    const loadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.type = "text/javascript";
        script.async = false;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load script for ${tabKey}: ${scriptUrl}`));
        document.head.appendChild(script);
    }).finally(() => {
        tabScriptLoadPromiseMap.delete(normalizedPath);
    });
    console.log("finished loading scripts")
    tabScriptLoadPromiseMap.set(normalizedPath, loadPromise);
    await loadPromise;

    loadedTabScriptSet.add(normalizedPath);
}

let clientMaintenanceStageTabs = [];
const addWorkflowPersistedStepMap = new Map();
let addWorkflowBasicDetailsPersisted = false;

// Tracks whether each tab has existing server data in edit mode.
// true = data found on load (use update), false = no data found (use create).
// Untracked entries default to update to preserve backward-compat for custom-load tabs.
const editModeExistingStepMap = new Map();

function normalizeAddWorkflowStepKey(tabKey) {
    return String(tabKey || '').trim().toLowerCase();
}

function clearAddWorkflowPersistedSteps() {
    addWorkflowPersistedStepMap.clear();
    addWorkflowBasicDetailsPersisted = false;
}

function markAddWorkflowStepPersisted(tabKey) {
    const key = normalizeAddWorkflowStepKey(tabKey);
    if (!key) return;
    addWorkflowPersistedStepMap.set(key, true);
}

function hasAddWorkflowStepPersisted(tabKey) {
    const key = normalizeAddWorkflowStepKey(tabKey);
    if (!key) return false;
    return addWorkflowPersistedStepMap.get(key) === true;
}

function markEditModeStepExists(tabKey, exists) {
    const key = normalizeAddWorkflowStepKey(tabKey);
    if (!key) return;
    editModeExistingStepMap.set(key, exists === true);
}

function hasEditModeStepExists(tabKey) {
    const key = normalizeAddWorkflowStepKey(tabKey);
    if (!key) return true;
    const val = editModeExistingStepMap.get(key);
    // Unknown entries default to true so untracked tabs keep using update (safe).
    return val !== false;
}

function clearEditModeExistingSteps() {
    editModeExistingStepMap.clear();
}

window.bindClientMaintenanceCrud = function (tabRoot, moduleId, service, tabName) {
    if (!tabRoot || !service) return;

    const buildRequest = () => {
        const payload = {};
        tabRoot.querySelectorAll('input, select, textarea').forEach((element) => {
            const key = element.name || element.id;
            if (!key) return;
            payload[key] = element.type === 'checkbox' ? element.checked : element.value;
        });
        payload["ModuleID"] = moduleId || window.ClientMaintenanceCore.moduleId || '';
        payload["ClientID"] = window.ClientMaintenanceCore.clientId || '';
        payload["ClientTypeID"] = getClientMaintenanceClientTypeId();
        return payload;
        //return {
        //    ModuleID: moduleId || window.ClientMaintenanceCore.moduleId || '',
        //    ClientID: window.ClientMaintenanceCore.clientId || '',
        //    Payload: payload
        //};
    };

    tabRoot.querySelectorAll('[data-cm-action]').forEach((button) => {
        button.addEventListener('click', async () => {
            const action = button.getAttribute('data-cm-action');
            if (!action || typeof service[action] !== 'function') return;

            try {
                const response = await service[action](buildRequest());
                const success = response?.Success ?? response?.success ?? true;
                if (!success) {
                    const error = response?.ErrorMessage || response?.errorMessage || `${tabName}: request failed`;
                    window.ClientMaintenanceCore.showToast(error, 'error');
                    return;
                }

                window.ClientMaintenanceCore.showToast(`${tabName}: ${action} completed`, 'success');

                // Mark tab as completed after successful save operations
                if (action === 'create' || action === 'update') {
                    // Capitalize first letter to match tab key format
                    const tabKey = tabName.charAt(0).toUpperCase() + tabName.slice(1);
                    markTabAsCompleted(tabKey);
                }
            } catch (error) {
                window.ClientMaintenanceCore.showToast(`${tabName}: ${action} failed - ${error.message}`, 'error');
            }
        });
    });
};

function normalizeSingleRow(response) {
    return extractSingleDataRow(response);
}

function normalizeDetailsArray(response) {
    return extractDetailsArray(response);
}

function parseResponseCandidate(candidate) {
    if (typeof candidate !== 'string') return candidate;

    const text = candidate.trim();
    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch (_) {
        return candidate;
    }
}

function isMeaningfulResponseValue(value) {
    if (value == null) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
}

function isMeaningfulDataObject(candidate) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
        return false;
    }

    return Object.entries(candidate).some(([key, value]) => {
        const normalizedKey = normalizeDataKey(key);
        if (!normalizedKey || CLIENT_MAINTENANCE_RESPONSE_META_KEYS.has(normalizedKey)) {
            return false;
        }

        return isMeaningfulResponseValue(value);
    });
}

function getNestedResponseCandidates(candidate) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
        return [];
    }

    return [
        candidate.Details,
        candidate.details,
        candidate.Details01,
        candidate.details01,
        candidate.Data,
        candidate.data,
        candidate.Records,
        candidate.records,
        candidate.SearchResults,
        candidate.searchResults
    ];
}

function extractSingleDataRow(candidate, depth = 0) {
    if (depth > 5 || candidate == null) {
        return null;
    }

    const parsedCandidate = parseResponseCandidate(candidate);
    if (parsedCandidate == null) {
        return null;
    }

    if (Array.isArray(parsedCandidate)) {
        for (const item of parsedCandidate) {
            const row = extractSingleDataRow(item, depth + 1);
            if (row) return row;
        }
        return null;
    }

    if (typeof parsedCandidate !== 'object') {
        return null;
    }

    for (const nested of getNestedResponseCandidates(parsedCandidate)) {
        const row = extractSingleDataRow(nested, depth + 1);
        if (row) return row;
    }

    return isMeaningfulDataObject(parsedCandidate) ? parsedCandidate : null;
}

function extractDetailsArray(candidate, depth = 0) {
    if (depth > 5 || candidate == null) {
        return [];
    }

    const parsedCandidate = parseResponseCandidate(candidate);
    if (parsedCandidate == null) {
        return [];
    }

    if (Array.isArray(parsedCandidate)) {
        return parsedCandidate
            .map((item) => extractSingleDataRow(item, depth + 1))
            .filter((item) => item != null);
    }

    if (typeof parsedCandidate !== 'object') {
        return [];
    }

    for (const nested of getNestedResponseCandidates(parsedCandidate)) {
        const rows = extractDetailsArray(nested, depth + 1);
        if (rows.length > 0) {
            return rows;
        }
    }

    return isMeaningfulDataObject(parsedCandidate) ? [parsedCandidate] : [];
}

function normalizeStageName(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractStageKey(stage) {
    const rawUrl = stage?.StageUrl || stage?.stageUrl || '';
    const normalizedUrl = String(rawUrl || '').replace(/\\/g, '/');
    const urlMatch = normalizedUrl.match(/ClientMaintenance\/([^/]+)\//i);
    if (urlMatch && urlMatch[1]) {
        return urlMatch[1];
    }

    const stageName = normalizeStageName(stage?.WFStage || stage?.Stage || stage?.stage || '');
    return clientMaintenanceStageAliases[stageName] || '';
}

function buildWorkflowStageTabs(stages) {
    if (!Array.isArray(stages)) return [];

    const items = stages
        .filter((stage) => stage && stage.IsApplicable !== false)
        .map((stage, index) => {
            const key = extractStageKey(stage);
            if (!key) return null;

            const config = clientMaintenanceTabMap.get(String(key).toLowerCase());
            if (!config) return null;

            const orderValue = Number(stage.StageOrder);

            return {
                ...config,
                label: stage.WFStage || config.key,
                stageOrder: Number.isFinite(orderValue) ? orderValue : index + 1,
                workflowStageId: stage.WFStageID || '',
                workflowStageUrl: stage.StageUrl || ''
            };
        })
        .filter(Boolean);

    items.sort((a, b) => {
        if (a.stageOrder !== b.stageOrder) {
            return a.stageOrder - b.stageOrder;
        }
        return String(a.label || a.key).localeCompare(String(b.label || b.key));
    });

    const seen = new Set();
    return items.filter((item) => {
        const key = item.key.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function renderWorkflowStageTabs(stageTabs, emptyMessage) {
    const navTabs = document.getElementById('nav_clientMaintenanceTabs');
    const tabContent = document.getElementById('dv_clientMaintenanceTabContent');
    if (!navTabs || !tabContent) return;

    navTabs.innerHTML = '';
    tabContent.innerHTML = '';

    if (!Array.isArray(stageTabs) || stageTabs.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'text-muted py-2';
        placeholder.setAttribute('data-cm-empty-stages', '');
        placeholder.textContent = emptyMessage || 'No workflow stages found.';
        tabContent.appendChild(placeholder);
        return;
    }

    stageTabs.forEach((tab, index) => {
        const isActive = index === 0;
        const navItem = document.createElement('li');
        navItem.className = 'nav-item';
        navItem.setAttribute('role', 'presentation');

        const button = document.createElement('button');
        button.type = 'button';
        button.id = `btn_tabClient${tab.key}`;
        button.className = `nav-link${isActive ? ' active' : ''}`;
        button.setAttribute('data-bs-toggle', 'tab');
        button.setAttribute('data-bs-target', `#${tab.pane}`);
        button.setAttribute('role', 'tab');
        button.setAttribute('data-cm-tab-key', tab.key);
        if (tab.workflowStageId) {
            button.setAttribute('data-cm-wfstage-id', tab.workflowStageId);
        }

        // Create indicator with number and check icon
        const indicator = document.createElement('span');
        indicator.className = 'cm-tab-indicator';

        const numberSpan = document.createElement('span');
        numberSpan.className = 'cm-tab-indicator__number';
        numberSpan.textContent = index + 1;

        const checkIcon = document.createElement('i');
        checkIcon.className = 'bi bi-check-lg cm-tab-indicator__check';

        indicator.appendChild(numberSpan);
        indicator.appendChild(checkIcon);

        const labelSpan = document.createElement('span');
        labelSpan.textContent = tab.label || tab.key;

        button.appendChild(indicator);
        button.appendChild(labelSpan);

        navItem.appendChild(button);
        navTabs.appendChild(navItem);

        const pane = document.createElement('div');
        pane.className = `tab-pane fade${isActive ? ' show active' : ''}`;
        pane.id = tab.pane;
        pane.setAttribute('role', 'tabpanel');
        pane.setAttribute('data-cm-partial', tab.key);
        if (tab.workflowStageId) {
            pane.setAttribute('data-cm-wfstage-id', tab.workflowStageId);
        }

        tabContent.appendChild(pane);
    });
}

/**
 * Marks a tab as completed by adding the 'is-completed' class
 * @param {string} tabKey - The tab key (e.g., 'Personal', 'Address')
 */
function markTabAsCompleted(tabKey) {
    if (!tabKey) return;

    const navTabs = document.getElementById('nav_clientMaintenanceTabs');
    if (!navTabs) return;

    const tabButton = navTabs.querySelector(`[data-cm-tab-key="${tabKey}"]`);
    if (tabButton && !tabButton.classList.contains('is-completed')) {
        tabButton.classList.add('is-completed');
    }
}

/**
 * Unlock all workflow tabs (allow navigation to any tab)
 */
function unlockAllWorkflowTabs() {
    const navTabs = document.getElementById('nav_clientMaintenanceTabs');
    if (!navTabs) return;

    const tabs = navTabs.querySelectorAll('.nav-link');
    tabs.forEach((tab) => {
        tab.style.pointerEvents = '';
        tab.classList.remove('disabled-tab');
    });
}

/**
 * Clears all completed states from tabs
 */
function clearAllTabCompletions() {
    const navTabs = document.getElementById('nav_clientMaintenanceTabs');
    if (!navTabs) return;

    const completedTabs = navTabs.querySelectorAll('.nav-link.is-completed');
    completedTabs.forEach(tab => tab.classList.remove('is-completed'));
}

function buildTabRequest() {
    const requestContext = buildClientMaintenanceRequestContext({ requireSelection: true });
    if (!requestContext) return null;

    const moduleId = requestContext.ModuleID || '';
    const requestId = requestContext.RequestID || '';
    const clientId = requestContext.ClientID || '';
    const useRequestId = window.ClientMaintenanceCore.useRequestId;

    // When working with ApplicationID/RequestID (useRequestId=true):
    // - Pass the application ID to RequestID parameter
    // - Pass the linked client ID (if any) to ClientID parameter
    // When working with ClientID (useRequestId=false):
    // - Pass client ID to ClientID parameter
    // - Pass request ID (if any) to RequestID parameter
    const effectiveClientId = clientId || '';
    const effectiveRequestId = requestId || '';

    return {
        ModuleID: moduleId,
        ClientID: effectiveClientId,
        RequestID: effectiveRequestId,
        ApplicationID: effectiveRequestId,
        ClientTypeID: requestContext.ClientTypeID || ''
    };
}

function normalizeDataKey(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildDataLookup(row) {
    const lookup = new Map();
    if (!row || typeof row !== 'object') return lookup;

    Object.entries(row).forEach(([key, value]) => {
        const rawKey = String(key || '').trim();
        if (!rawKey) return;

        const lower = rawKey.toLowerCase();
        const compact = normalizeDataKey(rawKey);
        if (!lookup.has(lower)) lookup.set(lower, value);
        if (compact && !lookup.has(compact)) lookup.set(compact, value);
    });

    return lookup;
}

function getLookupValue(lookup, candidates) {
    if (!lookup || !Array.isArray(candidates)) return undefined;

    for (const candidate of candidates) {
        const raw = String(candidate || '').trim();
        if (!raw) continue;

        const lower = raw.toLowerCase();
        const compact = normalizeDataKey(raw);
        if (lookup.has(lower)) return lookup.get(lower);
        if (compact && lookup.has(compact)) return lookup.get(compact);
    }

    return undefined;
}

function buildFieldCandidates(field) {
    const candidates = [];
    const add = (value) => {
        const text = String(value || '').trim();
        if (text && !candidates.includes(text)) {
            candidates.push(text);
        }
    };

    const name = field.getAttribute('name') || '';
    const id = field.getAttribute('id') || '';
    const dataField = field.getAttribute('data-field') || '';

    add(name);
    add(id);
    add(dataField);

    [name, id, dataField].forEach((rawToken) => {
        const token = String(rawToken || '').trim();
        if (!token) return;

        const withoutControlPrefix = token.replace(/^(txt|ddl|dt|chk|rad|txa|file|btn|tbl|frm|lbl)_/i, '');
        add(withoutControlPrefix);

        if (withoutControlPrefix.includes('_')) {
            const afterUnderscore = withoutControlPrefix.substring(withoutControlPrefix.indexOf('_') + 1);
            add(afterUnderscore);
            add(afterUnderscore.replace(/^[a-z]+(?=[A-Z])/, ''));
        }

        add(withoutControlPrefix.replace(/^[a-z]+(?=[A-Z])/, ''));
    });

    return candidates;
}

function parseBooleanValue(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;

    const text = String(value || '').trim().toLowerCase();
    if (!text) return false;

    return ['true', '1', 'y', 'yes', 'on', 'checked'].includes(text);
}

function resetPaneFormFields(pane) {
    if (!pane) return;

    const fields = Array.from(pane.querySelectorAll('input, select, textarea'));
    const resetRadioGroups = new Set();

    fields.forEach((field) => {
        const type = String(field.type || '').toLowerCase();
        const tag = field.tagName.toLowerCase();

        if (type === 'hidden') return;

        if (type === 'radio') {
            const groupName = field.name || field.id || '';
            if (!groupName || resetRadioGroups.has(groupName)) return;

            resetRadioGroups.add(groupName);
            fields
                .filter((item) => String(item.type || '').toLowerCase() === 'radio' && (item.name || item.id || '') === groupName)
                .forEach((radio) => { radio.checked = false; });
            return;
        }

        if (type === 'checkbox') {
            field.checked = false;
            return;
        }

        if (tag === 'select') {
            field.value = '';
            return;
        }

        field.value = '';
    });
}

function applyResponseDataToPane(pane, response, explicitFieldMap) {
    if (!pane) return;

    const row = normalizeSingleRow(response);
    pane.setAttribute('data-cm-loaded', row ? 'true' : 'false');
    resetPaneFormFields(pane);
    if (!row) return;

    const lookup = buildDataLookup(row);
    const fields = Array.from(pane.querySelectorAll('input, select, textarea'));
    const processedRadioGroups = new Set();

    fields.forEach((field) => {
        const type = String(field.type || '').toLowerCase();
        if (type === 'hidden') return;

        if (type === 'radio') {
            const groupName = field.name || field.id || '';
            if (!groupName || processedRadioGroups.has(groupName)) return;
            processedRadioGroups.add(groupName);

            const candidates = buildFieldCandidates(field);
            // If explicit field map provided, check it first for direct ID match
            let value = undefined;
            if (explicitFieldMap) {
                for (const [apiKey, fieldId] of Object.entries(explicitFieldMap)) {
                    if (fieldId === (field.id || field.name)) {
                        value = lookup.get(normalizeDataKey(apiKey));
                        if (value != null) break;
                    }
                }
            }
            // Fall back to generic field candidate matching
            if (value == null) {
                value = getLookupValue(lookup, candidates);
            }
            if (value == null || value === '') return;

            const group = fields.filter((item) => String(item.type || '').toLowerCase() === 'radio' && (item.name || item.id || '') === groupName);
            const normalizedValue = String(value).trim().toLowerCase();

            let matched = group.find((radio) => String(radio.value || '').trim().toLowerCase() === normalizedValue);
            if (!matched) {
                const expectedTruth = parseBooleanValue(value);
                matched = group.find((radio) => parseBooleanValue(radio.value) === expectedTruth);
            }

            if (matched) {
                matched.checked = true;
                matched.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return;
        }

        const candidates = buildFieldCandidates(field);
        // If explicit field map provided, check it first for direct ID match
        let value = undefined;
        if (explicitFieldMap) {
            for (const [apiKey, fieldId] of Object.entries(explicitFieldMap)) {
                if (fieldId === (field.id || field.name)) {
                    value = lookup.get(normalizeDataKey(apiKey));
                    if (value != null) break;
                }
            }
        }
        // Fall back to generic field candidate matching
        if (value == null) {
            value = getLookupValue(lookup, candidates);
        }
        if (value == null) return;

        if (type === 'checkbox') {
            field.checked = parseBooleanValue(value);
            field.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }

        if (field.tagName.toLowerCase() === 'select') {
            const normalized = String(value);
            const hasOption = Array.from(field.options || []).some((option) => String(option.value) === normalized);
            if (!hasOption && normalized) {
                const option = document.createElement('option');
                option.value = normalized;
                option.textContent = normalized;
                field.appendChild(option);
            }
            field.value = normalized;
            field.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }

        field.value = value ?? '';
    });
}

async function autoLoadTabData(config, pane) {
    const requestData = buildTabRequest();
    if (!requestData || !config) return;

    if (pane && typeof pane._cmLoadData === 'function') {
        try {
            await pane._cmLoadData(requestData);
            markTabAsCompleted(config.key);
        } catch (error) {
            console.error(`Error loading data for ${config.key} tab:`, error);
        }
        return;
    }

    const serviceName = clientMaintenanceTabServiceMap[config.key];
    const service = serviceName ? window[serviceName] : null;
    if (!service || typeof service.get !== 'function') return;

    console.log(serviceName);
    try {
        const response = await service.get(requestData);
        console.log(response);
        // Get explicit field map for this tab if available
        const fieldMapKey = getFieldMapKeyForTab(config.key);
        const fieldMap = fieldMapKey ? window[fieldMapKey] : undefined;

        // Track whether this tab has existing server data for edit-mode create/update decisions.
        const row = normalizeSingleRow(response);
        markEditModeStepExists(config.key, row != null);

        applyResponseDataToPane(pane, response, fieldMap);
    } catch (error) {
        if (pane) {
            pane.setAttribute('data-cm-loaded', 'false');
        }
        window.ClientMaintenanceCore.showToast(`${config.key} load failed - ${error.message}`, 'error');
    }
}

function getFieldMapKeyForTab(tabKey) {
    // Map tab keys to their field map constants
    const fieldMapRegistry = {
        'Personal': 'PERSONAL_FIELD_MAP',
        'Corporate': 'CORPORATE_FIELD_MAP',
        'Employment': 'EMPLOYMENT_FIELD_MAP',
        'KYC': 'KYC_FIELD_MAP',
        'Products': 'PRODUCTS_FIELD_MAP',
        'Offers': 'OFFERS_FIELD_MAP',
        'GroupDetail': 'GROUPDETAIL_FIELD_MAP',
        'Submit': 'SUBMIT_FIELD_MAP'
    };
    return fieldMapRegistry[tabKey];
}

async function preloadWorkflowTabs(stageTabs) {
    if (!Array.isArray(stageTabs) || stageTabs.length === 0) return;

    // Load all tabs in parallel using Promise.allSettled so that failures in one tab
    // don't prevent other tabs from loading
    const loadPromises = stageTabs.map((stageTab) =>
        loadTabPartial(stageTab, true)
            .catch((error) => {
                console.error(`Failed to preload ${stageTab?.key || 'unknown'} tab:`, error);
                window.ClientMaintenanceCore.showToast(`${stageTab?.key || 'Tab'} load failed - ${error.message}`, 'error');
                // Don't rethrow - let other tabs continue loading
                return null;
            })
    );

    // Wait for all load operations to complete (successful or failed)
    await Promise.all(loadPromises);
}

async function loadWorkflowStagesForClientType(clientTypeId) {
    const moduleId = window.ClientMaintenanceCore.moduleId || '';
    const normalizedType = clientTypeId == null ? '' : String(clientTypeId).trim();

    // Clear completion states when loading new workflow
    clearAllTabCompletions();

    if (!normalizedType) {
        if (window.ClientMaintenanceCore.getSelectedId && window.ClientMaintenanceCore.getSelectedId() && clientMaintenanceStageTabs.length > 0) {
            console.warn('[ClientMaintenance] Client type empty while a record is selected; keeping existing workflow stages.');
            return;
        }
        clientMaintenanceStageTabs = [];
        window.ClientMaintenanceCore.workflowId = null;
        renderWorkflowStageTabs([], 'Select a client type to load workflow stages.');
        return;
    }

    if (normalizedType === window.ClientMaintenanceCore.workflowId && clientMaintenanceStageTabs.length > 0) {
        if (window.ClientMaintenanceCore.getSelectedId()) {
            await preloadWorkflowTabs(clientMaintenanceStageTabs);
        }
        return;
    }

    const requestId = ++window.ClientMaintenanceCore.workflowStageRequestId;
    clientMaintenanceStageTabs = [];
    renderWorkflowStageTabs([], 'Loading workflow stages...');

    try {
        const response = await window.ClientMaintenanceService.getWorkflowStage({
            ModuleID: moduleId || '',
            WorkflowID: normalizedType
        });

        if (requestId !== window.ClientMaintenanceCore.workflowStageRequestId) return;

        const success = response?.Success ?? response?.success ?? (response?.ResponseCode ? response.ResponseCode === '00' : true);
        if (!success) {
            const errorMessage = response?.ErrorMessage || response?.errorMessage || response?.ResponseMessage || 'Failed to load workflow stages';
            renderWorkflowStageTabs([], errorMessage);
            window.ClientMaintenanceCore.showToast(errorMessage, 'error');
            return;
        }

        const stages = normalizeDetailsArray(response);
        const stageTabs = buildWorkflowStageTabs(stages);
        clientMaintenanceStageTabs = stageTabs;
        window.ClientMaintenanceCore.workflowId = normalizedType;

        if (stageTabs.length === 0) {
            renderWorkflowStageTabs([], 'No workflow stages configured for the selected client type.');
            updateSaveButtonState();
            updateTabNavigationButtons();
            return;
        }

        renderWorkflowStageTabs(stageTabs);
        updateSaveButtonState();
        updateTabNavigationButtons();

        if (window.ClientMaintenanceCore.getSelectedId()) {
            // Load all partial views with record selected
            await preloadWorkflowTabs(stageTabs);
        } else {
            // No record selected - load partials in parallel but don't load data
            const loadPartialPromises = stageTabs.map((tab) =>
                loadTabPartial(tab, true)
                    .catch((error) => {
                        console.error(`Failed to load ${tab?.key || 'unknown'} tab HTML:`, error);
                        window.ClientMaintenanceCore.showToast(`${tab?.key || 'Tab'} load failed - ${error.message}`, 'error');
                        // Continue loading other tabs even if this one fails
                        return null;
                    })
            );
            // Wait for all partial loads to complete
            await Promise.all(loadPartialPromises);
        }
    } catch (error) {
        if (requestId !== window.ClientMaintenanceCore.workflowStageRequestId) return;
        const message = `Failed to load workflow stages - ${error.message}`;
        renderWorkflowStageTabs([], message);
        updateSaveButtonState();
        updateTabNavigationButtons();
        window.ClientMaintenanceCore.showToast(message, 'error');
    }
}

function ensureBehindSceneVisible() {
    const section = document.querySelector('.form-section[data-section="behind-scene"]');
    if (!section) return;
    section.classList.remove('collapsed');
    const toggleBtn = section.querySelector('.section-toggle-btn');
    if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', 'true');
    }
}

function initSectionToggles() {
    document.querySelectorAll('.form-section [data-section-toggle]').forEach((header) => {
        const section = header.closest('.form-section');
        if (!section) return;

        const toggleBtn = header.querySelector('.section-toggle-btn');
        header.addEventListener('click', (event) => {
            if (event.target.closest('button') && !event.target.closest('.section-toggle-btn')) return;

            section.classList.toggle('collapsed');
            const isCollapsed = section.classList.contains('collapsed');
            if (toggleBtn) {
                toggleBtn.setAttribute('aria-expanded', (!isCollapsed).toString());
            }
        });
    });
}

function setFieldValue(root, selector, value) {
    const field = root?.querySelector(selector);
    if (!field) return;

    const normalizedValue = value == null ? '' : String(value).trim();
    if (field._flatpickr) {
        if (!normalizedValue) {
            field._flatpickr.clear();
        } else {
            field._flatpickr.setDate(normalizedValue, true);
        }
        return;
    }

    const dataType = String(field.getAttribute('data-type') || '').toLowerCase();
    if (!normalizedValue) {
        field.value = '';
        return;
    }

    if (dataType === 'datetime' && window.GlobalUtils?.formatDateTime) {
        field.value = window.GlobalUtils.formatDateTime(normalizedValue);
        return;
    }

    if (dataType === 'date' && window.GlobalUtils?.formatDate) {
        field.value = window.GlobalUtils.formatDate(normalizedValue);
        return;
    }

    field.value = value ?? '';
}

function setSelectValueWithFallback(selectElement, value, fallbackText) {
    if (!selectElement) return;

    const normalized = value == null ? '' : String(value);
    if (!normalized) {
        selectElement.value = '';
        return;
    }

    const hasOption = Array.from(selectElement.options || []).some((option) => String(option.value) === normalized);
    if (!hasOption) {
        const option = document.createElement('option');
        option.value = normalized;
        option.textContent = fallbackText || normalized;
        selectElement.appendChild(option);
    }

    selectElement.value = normalized;
}

async function applyBasicDetailsToMain(row) {
    const shell = document.querySelector('[data-client-maintenance]');
    if (!shell) return;

    const clientType = row?.ClientTypeID || row?.ClientType || '';
    const clientGroup = row?.ClientGroupID || row?.ClientGroup || '';
    const clientGroupLabel = row?.ClientGroupName || row?.ClientGroupDescription || clientGroup;

    const clientTypeSelect = shell.querySelector('#ddl_mainClientType');
    const clientGroupSelect = shell.querySelector('#ddl_mainClientGroup');

    const normalizedType = clientType == null ? '' : String(clientType).trim();
    const normalizedGroup = clientGroup == null ? '' : String(clientGroup).trim();

    if (normalizedType) {
        setSelectValueWithFallback(clientTypeSelect, normalizedType, normalizedType);
    }

    if (normalizedGroup) {
        setSelectValueWithFallback(clientGroupSelect, normalizedGroup, clientGroupLabel);
    }

    const activeWorkflowType = window.ClientMaintenanceCore.workflowId == null
        ? ''
        : String(window.ClientMaintenanceCore.workflowId).trim();
    const currentType = clientTypeSelect ? String(clientTypeSelect.value || '').trim() : '';
    const effectiveType = normalizedType || currentType || activeWorkflowType;

    if (effectiveType && (effectiveType !== activeWorkflowType || clientMaintenanceStageTabs.length === 0)) {
        await loadWorkflowStagesForClientType(effectiveType);
    }
}

function applyBasicDetailsToPersonal(row) {
    const personalPane = document.getElementById('dv_tabClientPersonal');
    if (!personalPane) return;

    const map = [
        ['#ddl_personalTitle', row?.TitleID],
        ['#txt_personalFirstName', row?.FirstName],
        ['#txt_personalMiddleName', row?.MiddleName],
        ['#txt_personalLastName', row?.LastName],
        ['#ddl_personalGender', row?.GenderID],
        ['#dt_personalDob', row?.DateOfBirth],
        ['#ddl_personalNationality', row?.NationalityID],
        ['#ddl_personalResidentStatus', row?.ResidentID],
        ['#ddl_personalIdType', row?.IdentificationTypeID],
        ['#txt_personalIdNumber', row?.NationalId || row?.IdentificationNo],
        ['#dt_personalIssueDate', row?.IDIssueDate],
        ['#txt_personalIssuedBy', row?.IssuedBy],
        ['#dt_personalExpiryDate', row?.IDExpiryDate],
        ['#ddl_personalLiteracyLevel', row?.LiteracyLevel],
        ['#ddl_personalMaritalStatus', row?.MaritalStatus],
        ['#txt_personalHouseMembers', row?.NumberOfHouseMembers],
        ['#txt_personalChildren', row?.NumberOfChildren],
        ['#txt_personalDependents', row?.NumberOfDependents],
        ['#txt_personalMotherName', row?.MotherName],
        ['#ddl_personalBloodGroup', row?.BloodGroup],
        ['#txt_personalOpenedBy', row?.CreatedBy],
        ['#dt_personalOpenedOn', row?.OpenedOn ?? row?.OpenedDate],
        ['#ddl_personalRelationshipManager', row?.RelationshipManagerID]
    ];

    map.forEach(([selector, value]) => setFieldValue(personalPane, selector, value));

    const canDonate = personalPane.querySelector('#chk_personalCanDonateBlood');
    if (canDonate) {
        canDonate.checked = Boolean(row?.CanDonateBlood);
    }

    const openedByName = personalPane.querySelector('#txt_personalOpenedByName');
    if (openedByName) {
        openedByName.value = row?.CreatedByName || row?.OpenedByName || '';
    }
}

function pickFirstNonEmpty(values) {
    if (!Array.isArray(values)) return '';

    for (const value of values) {
        if (value == null) continue;
        const text = String(value).trim();
        if (text) {
            return value;
        }
    }

    return '';
}

function isPendingWorkflowStatus(row) {
    if (!row || typeof row !== 'object') return false;

    const candidates = [
        row?.WFClientStatusID,
        row?.ClientStatusID,
        row?.ClientStatus,
        row?.ClientStatusDescription,
        row?.Status
    ];

    return candidates.some((value) => {
        if (value == null) return false;
        const text = String(value).trim().toLowerCase();
        if (!text) return false;
        return text === 'p' || text === 'pending' || text.includes('pending');
    });
}

function formatAuditDate(value) {
    if (value == null) return '';

    const text = String(value).trim();
    if (!text) return '';

    const date = new Date(text);
    if (Number.isNaN(date.getTime())) {
        return text;
    }

    if (window.GlobalUtils?.formatDateTime) {
        return window.GlobalUtils.formatDateTime(date);
    }

    return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function setBehindSceneValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const text = String(value ?? '').trim();
    element.textContent = text || '-';
}

function resetBehindSceneFields() {
    [
        'auditStatus',
        'auditOpenDate',
        'auditClosedDate',
        'auditCreatedBy',
        'auditCreatedOn',
        'auditModifiedBy',
        'auditModifiedOn',
        'auditSupervisedBy',
        'auditSupervisedOn'
    ].forEach((id) => setBehindSceneValue(id, '-'));
}

function applyBasicDetailsToBehindScene(row) {
    if (!row || typeof row !== 'object') {
        resetBehindSceneFields();
        return;
    }

    setBehindSceneValue('auditStatus', pickFirstNonEmpty([
        row?.ClientStatusDescription,
        row?.ClientStatus,
        row?.ClientStatusID,
        row?.Status,
        row?.WFClientStatusID
    ]));

    setBehindSceneValue('auditOpenDate', formatAuditDate(pickFirstNonEmpty([
        row?.OpenedDate,
        row?.OpenedOn,
        row?.OpenDate
    ])));

    setBehindSceneValue('auditClosedDate', formatAuditDate(pickFirstNonEmpty([
        row?.CloseDate,
        row?.ClosedDate
    ])));

    setBehindSceneValue('auditCreatedBy', pickFirstNonEmpty([
        row?.CreatedBy,
        row?.OpenedBy
    ]));

    setBehindSceneValue('auditCreatedOn', formatAuditDate(pickFirstNonEmpty([
        row?.CreatedOn,
        row?.CreatedDate
    ])));

    setBehindSceneValue('auditModifiedBy', pickFirstNonEmpty([
        row?.ModifiedBy
    ]));

    setBehindSceneValue('auditModifiedOn', formatAuditDate(pickFirstNonEmpty([
        row?.ModifiedOn,
        row?.ModifiedDate
    ])));

    setBehindSceneValue('auditSupervisedBy', pickFirstNonEmpty([
        row?.SupervisedBy
    ]));

    setBehindSceneValue('auditSupervisedOn', formatAuditDate(pickFirstNonEmpty([
        row?.SupervisedOn,
        row?.SupervisedDate
    ])));
}

/**
 * Load data for all initialized tabs
 * This invokes the Get/View JS functions of all partial views/stages/steps
 */
async function loadAllTabsData() {
    const requestData = buildTabRequest();
    if (!requestData) {
        console.log('[ClientMaintenance] loadAllTabsData: No request data available');
        return;
    }

    if (Array.isArray(clientMaintenanceStageTabs) && clientMaintenanceStageTabs.length > 0) {
        await preloadWorkflowTabs(clientMaintenanceStageTabs);
        return;
    }

    // Get all registered tab load functions
    const loadFunctions = window.ClientMaintenanceCore.getLoadedTabLoadFunctions();
    if (loadFunctions.length === 0) {
        console.log('[ClientMaintenance] loadAllTabsData: No tabs registered yet');
        return;
    }

    console.log(`[ClientMaintenance] loadAllTabsData: Loading data for ${loadFunctions.length} registered tabs`);

    // Call all load functions in parallel with the request data
    const loadPromises = loadFunctions.map(async (loadFunction) => {
        try {
            await loadFunction(requestData);
        } catch (error) {
            console.warn('[ClientMaintenance] Failed to load tab data:', error);
        }
    });

    await Promise.all(loadPromises);
}

function buildRecentActivityAccessedFields({ selectionMode, clientId, requestId } = {}) {
    const mode = String(selectionMode || '').toLowerCase();
    const resolvedClientId = String(clientId || '').trim();

    // Track recent activity only when the user selected by ClientID (not Request/Application flows).
    if (mode !== 'client' || !resolvedClientId) {
        return '';
    }

    return `ClientID:${resolvedClientId}`;
}

async function addRecentActivityAndRefreshSidebar(accessedFields) {
    const trimmedFields = String(accessedFields || '').trim();
    if (!trimmedFields) return;

    try {
        const moduleId = window.ClientMaintenanceCore?.moduleId || '1000';
        const response = await invokeController('SideBar', 'AddRecentActivity', {
            ModuleID: moduleId,
            AccessedFields: trimmedFields
        });

        const responseCode = response?.ResponseCode || response?.responseCode || '';
        const success = response?.Success === true || response?.success === true || responseCode === '00';

        if (!success) {
            const message = response?.ErrorMessage || response?.ResponseMessage || response?.responseMessage || response?.message || 'Failed to add recent activity';
            console.warn('[Client Maintenance] Recent activity not tracked:', message);
            return;
        }

        await loadSidebar(moduleId);
    } catch (error) {
        console.warn('[Client Maintenance] Error tracking recent activity:', error);
    }
}

async function loadClientBasicDetails(selectionContext) {
    const context = typeof selectionContext === 'string'
        ? { clientId: selectionContext }
        : (selectionContext || {});

    const clientId = String(context.clientId || context.ClientID || '').trim();
    const requestId = String(context.requestId || context.RequestID || '').trim();
    const direction = context.direction ?? null;  // -1=previous, 1=next, 0=current, null=not specified
    const selectionMode = context.selectionMode || (window.ClientMaintenanceCore.useRequestId ? 'request' : 'client');
    const lockClientId = selectionMode === 'request';
    const lockRequestId = selectionMode === 'client';

    if (window.ClientMaintenanceCore) {
        window.ClientMaintenanceCore.canEditCurrent = false;
    }

    if (!clientId && !requestId) return;

    try {
        const requestData = {
            ModuleID: window.ClientMaintenanceCore.moduleId || ''
        };

        if (clientId) {
            requestData.ClientID = clientId;
        }

        if (requestId) {
            requestData.RequestID = requestId;
        }

        if (direction !== null && direction !== undefined) {
            requestData.Direction = direction;
        }

        const response = await window.ClientMaintenanceService.getBasic(requestData);

        const success = response?.Success ?? response?.success ?? true;
        if (!success) {
            const error = response?.ErrorMessage || response?.errorMessage || 'Failed to load client basic details';
            window.ClientMaintenanceCore.showToast(error, 'error');
            return;
        }

        const row = normalizeSingleRow(response);
        const hasLoadedRow = Boolean(row);
        if (row) {
            await applyBasicDetailsToMain(row);
            applyBasicDetailsToPersonal(row);
            applyBasicDetailsToBehindScene(row);

            if (window.ClientMaintenanceCore) {
                const isPending = isPendingWorkflowStatus(row);
                window.ClientMaintenanceCore.canEditCurrent = window.ClientMaintenanceCore.useRequestId && isPending;
                window.ClientMaintenanceCore.shellState = 'loaded';
                window.ClientMaintenanceCore.hasLoadedRecord = true;
            }

            // Keep parent context aligned with IDs resolved from get-basic.
            const resolvedClientId = String(row?.ClientID || row?.ClientId || clientId).trim();
            const resolvedRequestId = String(row?.RequestID || row?.RequestId || requestId).trim();
            const resolvedClientName = String(pickFirstNonEmpty([
                row?.Name,
                row?.ClientName,
                row?.ClientFullName,
                row?.FullName,
                row?.ApplicantName
            ]) || '').trim();

            const mainClientNameInput = document.getElementById('txt_mainClientName');
            if (mainClientNameInput && resolvedClientName) {
                mainClientNameInput.value = resolvedClientName;
            }
            window.ClientMaintenanceCore.clientName = resolvedClientName;

            if (resolvedClientId && !lockClientId) {
                window.ClientMaintenanceCore.clientId = resolvedClientId;
                const mainClientIdInput = document.getElementById('txt_mainClientId');
                if (mainClientIdInput && !String(mainClientIdInput.value || '').trim()) {
                    mainClientIdInput.value = resolvedClientId;
                }
            }

            if (resolvedRequestId && !lockRequestId) {
                window.ClientMaintenanceCore.requestId = resolvedRequestId;
                const mainApplicationIdInput = document.getElementById('txt_mainApplicationId');
                if (mainApplicationIdInput && !String(mainApplicationIdInput.value || '').trim()) {
                    mainApplicationIdInput.value = resolvedRequestId;
                }
            }

            const accessedFields = buildRecentActivityAccessedFields({
                selectionMode,
                clientId: resolvedClientId,
                requestId: resolvedRequestId
            });
            const trackedClientId = String(window.ClientMaintenanceCore?.recentActivityTrackedClientId || '').trim();
            if (accessedFields && trackedClientId !== resolvedClientId) {
                await addRecentActivityAndRefreshSidebar(accessedFields);
                if (window.ClientMaintenanceCore) {
                    window.ClientMaintenanceCore.recentActivityTrackedClientId = resolvedClientId;
                }
            }
        } else {
            resetBehindSceneFields();
            if (window.ClientMaintenanceCore) {
                window.ClientMaintenanceCore.canEditCurrent = false;
                window.ClientMaintenanceCore.shellState = 'idle';
                window.ClientMaintenanceCore.hasLoadedRecord = false;
            }
        }

        setClientLoadedState(hasLoadedRow);

        // Load all tab data after basic details are loaded
        // If tab data loading fails, just show error message but keep workflow visible
        try {
            await loadAllTabsData();
        } catch (error) {
            window.ClientMaintenanceCore.showToast(`Failed to load some tab data - ${error.message}`, 'error');
            console.error('[ClientMaintenance] Error loading tab data:', error);
            // Continue - don't fail the whole operation, just show the error
        } finally {
            setClientEditMode(false);
        }
    } catch (error) {
        if (window.ClientMaintenanceCore) {
            window.ClientMaintenanceCore.canEditCurrent = false;
        }
        window.ClientMaintenanceCore.showToast(`Failed to load client - ${error.message}`, 'error');
    }
}

function initMainClientSearch(shell) {
    const clientSearchBtn = shell.querySelector('[data-main-client-search]');
    const applicationSearchBtn = shell.querySelector('[data-main-application-search]');
    const clientIdInput = shell.querySelector('#txt_mainClientId');
    const clientNameInput = shell.querySelector('#txt_mainClientName');
    const applicationIdInput = shell.querySelector('#txt_mainApplicationId');
    const applicationNameInput = shell.querySelector('#txt_mainApplicationName');
    const clientTypeSelect = shell.querySelector('#ddl_mainClientType');
    const clientGroupSelect = shell.querySelector('#ddl_mainClientGroup');

    if (!clientSearchBtn && !applicationSearchBtn) return;

    const appCore = getAppCore();
    if (!appCore || !window.SearchModal) return;

    let isClientBlurLookupInProgress = false;

    const loadClientFromTypedId = async () => {
        if (window.ClientMaintenanceCore?.isMainWorkflowLocked) return;

        const typedClientId = String(clientIdInput?.value || '').trim();
        if (!typedClientId) {
            if (clientNameInput) clientNameInput.value = '';
            return;
        }

        const activeClientId = String(window.ClientMaintenanceCore?.clientId || '').trim();
        const activeClientName = String(clientNameInput?.value || '').trim();
        if (typedClientId === activeClientId && activeClientName) {
            return;
        }

        if (isClientBlurLookupInProgress) return;
        isClientBlurLookupInProgress = true;

        try {
            if (clientNameInput) clientNameInput.value = '';
            if (applicationIdInput) applicationIdInput.value = '';
            if (applicationNameInput) applicationNameInput.value = '';

            window.ClientMaintenanceCore.requestId = '';
            window.ClientMaintenanceCore.useRequestId = false;
            window.ClientMaintenanceCore.clientId = typedClientId;

            await withClientMaintenanceShellLoading(async () => {
                await loadClientBasicDetails({ clientId: typedClientId, selectionMode: 'client' });
            }, 'Loading client details...');

            const resolvedName = String(clientNameInput?.value || '').trim();
            if (!resolvedName) {
                return;
            }

            enableCancelButton();
            setMainWorkflowLocked(true);

            if (window.SidebarManager && typeof window.SidebarManager.setMainRecordLoaded === 'function') {
                window.SidebarManager.setMainRecordLoaded(true, typedClientId);
                console.log('[Client Maintenance] Notified sidebar of loaded client:', typedClientId);
            }
        } catch (error) {
            window.ClientMaintenanceCore.showToast(`Failed to load client details - ${error.message}`, 'error');
            console.error('[Client Maintenance] Error loading client details from Client ID blur:', error);
        } finally {
            isClientBlurLookupInProgress = false;
        }
    };

    clientIdInput?.addEventListener('blur', async (event) => {
        const relatedTarget = event.relatedTarget;
        if (relatedTarget instanceof HTMLElement && relatedTarget.matches('[data-main-client-search]')) {
            return;
        }

        await loadClientFromTypedId();
    });

    clientSearchBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        if (window.ClientMaintenanceCore?.isMainWorkflowLocked) return;
        let searchModal = new window.SearchModal(appCore);

        searchModal.open({
            title: 'Client Search',
            tableID: 'ClientID',
            moduleID: window.ClientMaintenanceCore.moduleId || '',
            searchFields: [
                { name: 'ClientID', label: 'Client ID', column: 'ClientID', value: clientIdInput?.value || '' },
                { name: 'Name', label: 'Client Name', column: 'Name' }
            ],
            autoSearch: false,
            onSelect: async (record) => {
                try {
                    await withClientMaintenanceShellLoading(async () => {
                        const selectedClientId = record?.ClientID || '';
                        const selectedClientName = record?.Name || '';
                        const selectedClientType = record?.ClientTypeID || record?.ClientType || '';
                        const selectedClientGroup = record?.ClientGroupID || record?.ClientGroup || '';
                        const selectedClientGroupLabel = record?.ClientGroupName || record?.ClientGroupDescription || selectedClientGroup;

                        if (clientIdInput) clientIdInput.value = selectedClientId;
                        if (clientNameInput) clientNameInput.value = selectedClientName;
                        setSelectValueWithFallback(clientTypeSelect, selectedClientType, selectedClientType);
                        setSelectValueWithFallback(clientGroupSelect, selectedClientGroup, selectedClientGroupLabel);

                        window.ClientMaintenanceCore.requestId = '';
                        window.ClientMaintenanceCore.useRequestId = false;
                        window.ClientMaintenanceCore.clientId = selectedClientId || '';

                        await loadWorkflowStagesForClientType(selectedClientType);

                        if (applicationIdInput) applicationIdInput.value = '';
                        if (applicationNameInput) applicationNameInput.value = '';
                        enableCancelButton();
                        setMainWorkflowLocked(true);

                        try {
                            await loadClientBasicDetails({ clientId: selectedClientId, selectionMode: 'client' });
                        } catch (error) {
                            window.ClientMaintenanceCore.showToast(`Failed to load client details - ${error.message}`, 'error');
                            console.error('[Client Maintenance] Error loading client details:', error);
                        }

                        if (window.SidebarManager && typeof window.SidebarManager.setMainRecordLoaded === 'function') {
                            window.SidebarManager.setMainRecordLoaded(true, selectedClientId);
                            console.log('[Client Maintenance] Notified sidebar of loaded client:', selectedClientId);
                        }
                    }, 'Loading client workflow...');
                } catch (error) {
                    window.ClientMaintenanceCore.showToast(`Error during client selection: ${error.message}`, 'error');
                    console.error('[Client Maintenance] Error in client selection:', error);
                }
            }
        });
    });

    applicationSearchBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        if (window.ClientMaintenanceCore?.isMainWorkflowLocked) return;
        let searchModal = new window.SearchModal(appCore);

        searchModal.open({
            title: 'Find Pipeline Application',
            tableID: 'WFClientID',
            moduleID: window.ClientMaintenanceCore.moduleId || '',
            searchFields: [
                { name: 'RequestID', label: 'Application ID', column: 'ApplicationID', value: applicationIdInput?.value || '' },
                { name: 'Name', label: 'Client Name', column: 'Name' }
            ],
            autoSearch: false,
            onSelect: async (record) => {
                try {
                    await withClientMaintenanceShellLoading(async () => {
                        const selectedRequestId = record?.ApplicationID || record?.ClientID || '';
                        const selectedName = record?.Name || '';
                        const selectedClientType = record?.ClientTypeID || record?.ClientType || '';
                        const selectedClientGroup = record?.ClientGroupID || record?.ClientGroup || '';
                        const selectedClientGroupLabel = record?.ClientGroupName || record?.ClientGroupDescription || selectedClientGroup;

                        if (applicationIdInput) applicationIdInput.value = selectedRequestId;
                        if (applicationNameInput) applicationNameInput.value = selectedName;

                        window.ClientMaintenanceCore.requestId = selectedRequestId;
                        window.ClientMaintenanceCore.useRequestId = true;
                        window.ClientMaintenanceCore.clientId = '';
                        window.ClientMaintenanceCore.recentActivityTrackedClientId = null;

                        setSelectValueWithFallback(clientTypeSelect, selectedClientType, selectedClientType);
                        setSelectValueWithFallback(clientGroupSelect, selectedClientGroup, selectedClientGroupLabel);
                        await loadWorkflowStagesForClientType(selectedClientType);

                        enableCancelButton();
                        setMainWorkflowLocked(true);
                        if (clientIdInput) clientIdInput.value = '';

                        try {
                            await loadClientBasicDetails({
                                clientId: null,
                                requestId: selectedRequestId,
                                selectionMode: 'request'
                            });
                        } catch (error) {
                            window.ClientMaintenanceCore.showToast(`Failed to load application details - ${error.message}`, 'error');
                            console.error('[Client Maintenance] Error loading application details:', error);
                        }

                        if (window.SidebarManager && typeof window.SidebarManager.setMainRecordLoaded === 'function') {
                            window.SidebarManager.setMainRecordLoaded(false, null);
                            console.log('[Client Maintenance] Submodules locked for application selection:', selectedRequestId);
                        }
                    }, 'Loading application workflow...');
                } catch (error) {
                    window.ClientMaintenanceCore.showToast(`Error during application selection: ${error.message}`, 'error');
                    console.error('[Client Maintenance] Error in application selection:', error);
                }
            }
        });
    });

    // Add Enter and F2 key handlers for Client ID search
    clientIdInput?.addEventListener('keydown', (event) => {
        if (window.ClientMaintenanceCore?.isMainWorkflowLocked) return;
        if (event.key === 'Enter' || event.key === 'F2') {
            event.preventDefault();
            clientSearchBtn?.click();
        }
    });

    // Add Enter and F2 key handlers for Application ID search
    applicationIdInput?.addEventListener('keydown', (event) => {
        if (window.ClientMaintenanceCore?.isMainWorkflowLocked) return;
        if (event.key === 'Enter' || event.key === 'F2') {
            event.preventDefault();
            applicationSearchBtn?.click();
        }
    });
}

async function loadTabPartial(config, forceDataRefresh = false) {
    const pane = document.getElementById(config.pane);
    if (!pane) return;

    if (pane.dataset.loaded === 'true') {
        if (forceDataRefresh) {
            try {
                await ensureTabScriptLoaded(config);

                const initializer = window[config.initFn];
                if (typeof pane._cmLoadData !== 'function' && typeof initializer === 'function') {
                    initializer(pane, window.ClientMaintenanceCore.moduleId || '');
                }

                await autoLoadTabData(config, pane);
            } catch (error) {
                console.error(`Error refreshing ${config.key} tab:`, error);
                window.ClientMaintenanceCore.showToast(`${config.key} tab refresh failed - ${error.message}`, 'error');
                // Continue - don't prevent other tabs from loading
            }
        }

        initializeClientMaintenanceDatePickers(pane);
        applyTabEditMode(pane, window.ClientMaintenanceCore?.isEditMode);
        return;
    }

    const query = new URLSearchParams({
        moduleId: window.ClientMaintenanceCore.moduleId || ''
    });

    const clientTypeId = getClientMaintenanceClientTypeId();
    if (clientTypeId) {
        query.set('ClientTypeID', clientTypeId);
    }

    const response = await fetch(`${config.route}?${query.toString()}`, {
        method: 'GET',
        credentials: 'same-origin'
    });

    if (!response.ok) {
        throw new Error(`Failed to load ${config.key} tab (${response.status})`);
    }

    pane.innerHTML = await response.text();
    pane.dataset.loaded = 'true';

    try {
        await ensureTabScriptLoaded(config);

        const initializer = window[config.initFn];
        if (typeof initializer === 'function') {
            initializer(pane, window.ClientMaintenanceCore.moduleId || '');
        } else {
            console.warn(`[ClientMaintenance] Initializer not found for ${config.key}: ${config.initFn}`);
        }

        await autoLoadTabData(config, pane);
    } catch (error) {
        console.error(`Error initializing ${config.key} tab after loading HTML:`, error);
        window.ClientMaintenanceCore.showToast(`${config.key} tab initialization failed - ${error.message}`, 'error');
        // Continue - tab HTML is already loaded, just data/initialization failed
    }

    initializeClientMaintenanceDatePickers(pane);
    applyTabEditMode(pane, window.ClientMaintenanceCore?.isEditMode);
}

async function loadSidebar(moduleId) {
    const sidebarContainer = document.getElementById('sidebarContainer');
    //const sidebarContainer = document.getElementsByClassName('main-container');
    if (!sidebarContainer) return;

    try {
        const params = new URLSearchParams({
            ModuleID: moduleId || '0',
            OurBranchID: ''
        });

        const response = await fetch(`/SideBar/Index?${params.toString()}`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Accept': 'text/html'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load sidebar (${response.status})`);
        }

        const html = await response.text();
        sidebarContainer.innerHTML = html;
        //sidebarContainer.insertAdjacentHTML('afterbegin', html);

        // Initialize sidebar JavaScript if the script is available
        if (window.SidebarManager && typeof window.SidebarManager.init === 'function') {
            window.SidebarManager.init();
        }
    } catch (error) {
        console.error('[Client Maintenance] Error loading sidebar:', error);
        window.ClientMaintenanceCore.showToast('Failed to load sidebar', 'error');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const shell = document.querySelector('[data-client-maintenance]');
    if (!shell) return;

    window.ClientMaintenanceCore.moduleId = shell.getAttribute('data-module-id') || '';
    window.ClientMaintenanceCore.shellState = 'idle';
    window.ClientMaintenanceCore.hasLoadedRecord = false;

    ensureBehindSceneVisible();
    initSectionToggles();

    // Load sidebar first
    await loadSidebar(window.ClientMaintenanceCore.moduleId);

    // Initialize sidebar manager with module name
    if (window.SidebarManager && typeof window.SidebarManager.init === 'function') {
        window.SidebarManager.init({
            moduleName: 'Client',
            isMainRecordLoaded: false,
            primaryRecordId: null
        });
        console.log('[Client Maintenance] Initialized sidebar manager');
    }

    // Initialize main client search
    initMainClientSearch(shell);
    initializeClientMaintenanceDatePickers(shell);

    const clientTypeSelect = shell.querySelector('#ddl_mainClientType');
    if (clientTypeSelect) {
        clientTypeSelect.addEventListener('change', async () => {
            await withClientMaintenanceShellLoading(async () => {
                await loadWorkflowStagesForClientType(clientTypeSelect.value);
            }, 'Loading workflow stages...');
        });

        if (clientTypeSelect.value) {
            await withClientMaintenanceShellLoading(async () => {
                await loadWorkflowStagesForClientType(clientTypeSelect.value);
            }, 'Loading workflow stages...');
        } else {
            renderWorkflowStageTabs([], 'Select a client type to load workflow stages.');
        }
    }

    document.getElementById('nav_clientMaintenanceTabs')?.addEventListener('shown.bs.tab', async (event) => {
        const targetSelector = event.target?.getAttribute('data-bs-target') || '';
        const paneId = targetSelector.replace('#', '');
        const config = clientMaintenanceStageTabs.find((x) => x.pane === paneId);
        if (!config) return;

        try {
            // Load the tab partial view
            await loadTabPartial(config);

            // After loading, check if this tab has existing data (was previously saved)
            // If yes and not in edit mode, we should prepare for edit/update operations
            const pane = document.getElementById(paneId);
            if (pane && detectTabHasExistingData(pane)) {
                // This tab has been previously saved and has data loaded
                // Ensure edit mode is enabled for this tab so the next save uses UPDATE action
                // Note: The global isEditMode flag controls the mode across all tabs
                // For tabs with existing data, we want them to use UPDATE action when navigating next

                // If this tab has the "is-completed" class, it means it was previously saved
                // We should ensure edit mode applies to it
                const tabButton = event.target;
                if (tabButton?.classList.contains('is-completed')) {
                    // Tab was previously saved - ensure edit mode is active for proper update handling
                    if (!window.ClientMaintenanceCore?.isEditMode) {
                        // Don't force global edit mode here as that would affect all tabs
                        // Instead, the processTabWorkflowStep will detect existing data and use UPDATE
                        // But we want to make sure the user understands they can edit this saved tab
                    }
                }
            }

            // Recent activity is tracked when a ClientID record is initially loaded.
            // Do not track on every tab switch (Next/Previous) to avoid duplicate entries.
        } catch (error) {
            window.ClientMaintenanceCore.showToast(error.message, 'error');
        }

        if (window.ClientMaintenanceCore?.singleStageEditLockActive) {
            const tabs = Array.from(document.querySelectorAll('#nav_clientMaintenanceTabs .nav-link'));
            const activeIndex = tabs.indexOf(event.target);
            if (activeIndex >= 0) {
                lockWorkflowTabsToSingleStage(activeIndex, true);
            }
        }

        // Update button states when tab changes
        updateSaveButtonState();
        updateTabNavigationButtons();
    });

    // Wire up Previous/Next navigation buttons
    document.getElementById('btn_cmPrevious')?.addEventListener('click', () => {
        navigateToPreviousTab();
    });

    document.getElementById('btn_cmNext')?.addEventListener('click', () => {
        navigateToNextTab();
    });

    document.getElementById('btn_cmCancel')?.addEventListener('click', (event) => {
        event.preventDefault();
        resetClientMaintenance();
    });

    document.querySelector('[data-action-btn="new"]')?.addEventListener('click', async (event) => {
        event.preventDefault();
        await beginNewClientMaintenance();
    });

    // Edit button handler - enables edit mode for all partial views
    document.querySelector('[data-action-btn="edit"]')?.addEventListener('click', (event) => {
        event.preventDefault();

        const shouldLockToSingleStage = Boolean(
            window.ClientMaintenanceCore?.useRequestId &&
            window.ClientMaintenanceCore?.canEditCurrent
        );

        setClientEditMode(true, { showToast: !shouldLockToSingleStage });

        if (window.ClientMaintenanceCore) {
            window.ClientMaintenanceCore.singleStageEditLockActive = shouldLockToSingleStage;
        }

        if (shouldLockToSingleStage) {
            focusFirstWorkflowStageWithFetchedDetails();
            window.ClientMaintenanceCore?.showToast(
                'Edit mode enabled. Continue from the first workflow stage that has loaded details.',
                'info'
            );
        } else {
            unlockAllWorkflowTabs();
        }

        // Disable Edit button after clicking it
        const editBtn = document.querySelector('[data-action-btn="edit"]');
        if (editBtn) editBtn.disabled = true;
    });

    // Wire up action panel record navigation buttons (Prev/Next client navigation)
    document.querySelector('[data-record-nav="prev"]')?.addEventListener('click', async (event) => {
        event.preventDefault();
        if (window.ClientMaintenanceCore?.clientId) {
            await withClientMaintenanceShellLoading(async () => {
                await loadClientBasicDetails({
                    clientId: window.ClientMaintenanceCore.clientId,
                    requestId: window.ClientMaintenanceCore.requestId,
                    direction: -1
                });
            }, 'Loading client details...');
        }
    });

    document.querySelector('[data-record-nav="next"]')?.addEventListener('click', async (event) => {
        event.preventDefault();
        if (window.ClientMaintenanceCore?.clientId) {
            await withClientMaintenanceShellLoading(async () => {
                await loadClientBasicDetails({
                    clientId: window.ClientMaintenanceCore.clientId,
                    requestId: window.ClientMaintenanceCore.requestId,
                    direction: 1
                });
            }, 'Loading client details...');
        }
    });

    // Initialize horizontal tab scrolling
    initializeTabHorizontalScroll();

    // Initialize button states on page load
    updateSaveButtonState();
    updateTabNavigationButtons();
    setClientLoadedState(false);
});

/**
 * Initialize horizontal scrolling for tabs
 */
function initializeTabHorizontalScroll() {
    const tabsContainer = document.querySelector('.cm-tabs-container');
    const scrollLeftBtn = document.getElementById('btn_tabsScrollLeft');
    const scrollRightBtn = document.getElementById('btn_tabsScrollRight');

    if (!tabsContainer || !scrollLeftBtn || !scrollRightBtn) return;

    const scrollAmount = 200; // pixels to scroll per click

    // Update scroll button states
    const updateScrollButtons = () => {
        const isAtStart = tabsContainer.scrollLeft <= 0;
        const isAtEnd = tabsContainer.scrollLeft >= (tabsContainer.scrollWidth - tabsContainer.clientWidth - 10);

        scrollLeftBtn.disabled = isAtStart;
        scrollRightBtn.disabled = isAtEnd;
    };

    // Scroll left
    scrollLeftBtn.addEventListener('click', () => {
        tabsContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        setTimeout(updateScrollButtons, 150);
    });

    // Scroll right
    scrollRightBtn.addEventListener('click', () => {
        tabsContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        setTimeout(updateScrollButtons, 150);
    });

    // Update buttons on scroll
    tabsContainer.addEventListener('scroll', updateScrollButtons);

    // Update buttons on window resize
    window.addEventListener('resize', updateScrollButtons);

    // Initial state
    updateScrollButtons();

    // Update when tabs are rendered
    const observer = new MutationObserver(() => {
        setTimeout(updateScrollButtons, 100);
    });

    observer.observe(tabsContainer, { childList: true, subtree: true });
}

/**
 * Update save button state based on current tab
 */
function updateSaveButtonState() {
    const saveBtn = document.querySelector('[data-submit-action="save"]');
    if (!saveBtn) return;

    // Get current active tab
    const activeTab = document.querySelector('#nav_clientMaintenanceTabs .nav-link.active');
    if (!activeTab) {
        saveBtn.disabled = true;
        return;
    }

    // Get the tab key from data attribute
    const tabKey = activeTab.getAttribute('data-cm-tab-key');

    // Enable save only if on Submit tab
    const isSubmitTab = tabKey === 'Submit' || tabKey?.toLowerCase() === 'submit';
    saveBtn.disabled = !isSubmitTab;
}

/**
 * Get the current active tab index
 */
function getCurrentTabIndex() {
    const activeTab = document.querySelector('#nav_clientMaintenanceTabs .nav-link.active');
    if (!activeTab) return -1;

    const tabs = Array.from(document.querySelectorAll('#nav_clientMaintenanceTabs .nav-link'));
    return tabs.indexOf(activeTab);
}

/**
 * Navigate to previous tab
 */
function navigateToPreviousTab() {
    const currentIndex = getCurrentTabIndex();
    if (currentIndex <= 0) return;

    const tabs = Array.from(document.querySelectorAll('#nav_clientMaintenanceTabs .nav-link'));
    const prevTab = tabs[currentIndex - 1];
    if (prevTab) {
        // When navigating back, clear the completed/disabled state from current tab and all subsequent tabs
        // This allows them to be edited/revisited without being locked
        tabs.forEach((tab, index) => {
            if (index >= currentIndex) {
                // Remove the "is-completed" marker from the current tab onwards
                tab.classList.remove('is-completed');
                // Remove the "disabled-tab" visual indicator
                tab.classList.remove('disabled-tab');
                // Restore pointer events (allow clicking)
                tab.style.pointerEvents = '';
            }
        });

        const bsTab = new bootstrap.Tab(prevTab);
        bsTab.show();
    }
}

/**
 * Get all mandatory/required fields from a tab pane
 * Returns array of {field, label} objects for required fields
 */
function getTabMandatoryFields(pane) {
    if (!pane) return [];

    const mandatoryFields = [];
    const form = pane.querySelector('form') || pane;

    // Get all elements with required attribute
    const requiredElements = form.querySelectorAll('[required]');

    requiredElements.forEach((element) => {
        const label = form.querySelector(`label[for="${element.id}"]`)?.textContent?.trim() || element.name || element.id;
        mandatoryFields.push({
            field: element,
            name: element.name || element.id,
            id: element.id,
            label: label.replace('*', '').trim(),
            tagName: element.tagName.toLowerCase(),
            type: element.type?.toLowerCase() || ''
        });
    });

    return mandatoryFields;
}

/**
 * Check if a field has a valid value
 */
/**
 * Check if a field has a valid value
 * For selects, ensures a real value is selected (not default placeholder)
 */
function isFieldValueValid(field) {
    if (!field) return false;

    const tagName = field.tagName?.toLowerCase() || '';
    const type = field.type?.toLowerCase() || '';

    if (type === 'checkbox' || type === 'radio') {
        return field.checked;
    }

    if (tagName === 'select') {
        const value = String(field.value || '').trim();

        // Empty value is invalid
        if (!value) return false;

        // Get the currently selected option
        const selectedOption = field.options[field.selectedIndex];
        if (!selectedOption) return false;

        // Check if selected option's text is a placeholder (contains "Select", "Choose", etc.)
        const optionText = String(selectedOption.text || '').trim().toLowerCase();
        const placeholderPatterns = ['select', 'choose', 'pick', 'option', '---', '...'];
        const isPlaceholder = placeholderPatterns.some(pattern => optionText.includes(pattern));

        // For required selects, reject placeholder options even if they have a value
        if (isPlaceholder && field.hasAttribute('required')) {
            return false;
        }

        return true;
    }

    // For text, number, date, etc.
    const value = String(field.value || '').trim();
    return value.length > 0;
}

/**
 * Validate all mandatory fields in a tab
 * Returns { isValid: boolean, emptyFields: [] }
 */
function validateTabMandatoryFields(pane, tabKey) {
    const mandatoryFields = getTabMandatoryFields(pane);
    const emptyFields = [];

    mandatoryFields.forEach((fieldInfo) => {
        if (!isFieldValueValid(fieldInfo.field)) {
            emptyFields.push(fieldInfo);
        }
    });

    const result = {
        isValid: emptyFields.length === 0,
        emptyFields: emptyFields,
        mandatoryCount: mandatoryFields.length,
        filledCount: mandatoryFields.length - emptyFields.length
    };

    return result;
}

/**
 * Get form data from the current tab pane
 */
function getTabDataFromPane(pane) {
    const payload = {};

    if (!pane) return payload;

    const fields = pane.querySelectorAll('input, select, textarea');
    fields.forEach((element) => {
        const key = element.name || element.id;
        if (!key || key.startsWith('_')) return; // Skip internal fields

        const type = element.type?.toLowerCase() || '';
        if (type === 'hidden' || type === 'button' || type === 'submit') return;

        if (type === 'checkbox') {
            payload[key] = element.checked;
        } else if (type === 'radio') {
            // Only add checked radio buttons
            const otherRadios = pane.querySelectorAll(`input[type="radio"][name="${key}"]`);
            if (element.checked || !payload[key]) {
                payload[key] = element.value || (element.checked ? true : false);
            }
        } else {
            payload[key] = element.value || '';
        }
    });

    return payload;
}

/**
 * Detect if a tab pane has existing loaded data
 */
function detectTabHasExistingData(pane) {
    if (!pane) return false;

    const explicitLoadedState = getPaneLoadedState(pane);
    if (explicitLoadedState != null) {
        return explicitLoadedState;
    }

    // Check if there are any filled form fields (indicates data was loaded)
    const fields = pane.querySelectorAll('input:not([type="hidden"]), textarea, select');
    let filledCount = 0;

    fields.forEach((field) => {
        const type = field.type?.toLowerCase() || '';
        if (type === 'radio') {
            return;
        }

        if (type === 'checkbox') {
            if (field.checked) filledCount++;
            return;
        }

        if (field.tagName.toLowerCase() === 'select') {
            if (field.value && String(field.value).trim()) {
                filledCount++;
            }
            return;
        }

        if (field.value && String(field.value).trim()) {
            filledCount++;
        }
    });

    return filledCount > 0;
}

function getPaneLoadedState(pane) {
    if (!pane) return null;

    const ownMarker = pane.getAttribute('data-cm-loaded');
    if (ownMarker === 'true') return true;
    if (ownMarker === 'false') return false;

    const nestedTrueMarker = pane.querySelector('[data-cm-loaded="true"]');
    if (nestedTrueMarker) return true;

    const nestedFalseMarker = pane.querySelector('[data-cm-loaded="false"]');
    if (nestedFalseMarker) return false;

    return null;
}

/**
 * Lock/unlock remaining tabs during workflow (Add mode)
 */
function lockRemainingWorkflowTabs(currentTabIndex, isLocked) {
    const navTabs = document.getElementById('nav_clientMaintenanceTabs');
    if (!navTabs) return;

    const tabs = Array.from(navTabs.querySelectorAll('.nav-link'));
    tabs.forEach((tab, index) => {
        // Allow access only up to the currently unlocked stage index.
        // Anything beyond remains disabled until the previous stage is saved successfully.
        if (index <= currentTabIndex) {
            tab.style.pointerEvents = '';
            tab.classList.remove('disabled-tab');
        } else {
            tab.style.pointerEvents = isLocked ? 'none' : '';
            if (isLocked) {
                tab.classList.add('disabled-tab');
            } else {
                tab.classList.remove('disabled-tab');
            }
        }
    });
}

function lockWorkflowTabsToSingleStage(activeTabIndex, isLocked = true) {
    const navTabs = document.getElementById('nav_clientMaintenanceTabs');
    if (!navTabs) return;

    const tabs = Array.from(navTabs.querySelectorAll('.nav-link'));
    tabs.forEach((tab, index) => {
        const canAccess = !isLocked || index === activeTabIndex;
        tab.style.pointerEvents = canAccess ? '' : 'none';
        tab.classList.toggle('disabled-tab', !canAccess);
    });
}

function paneHasWorkflowFetchedDetails(pane) {
    if (!pane) return false;

    if (typeof pane._cmHasWorkflowData === 'function') {
        try {
            if (pane._cmHasWorkflowData() === true) {
                return true;
            }
        } catch (error) {
            console.warn('[ClientMaintenance] _cmHasWorkflowData check failed:', error);
        }
    }

    if (pane.querySelector('table tbody tr')) {
        return true;
    }

    return detectTabHasExistingData(pane);
}

function getFirstWorkflowTabWithFetchedDetailsIndex() {
    const tabs = Array.from(document.querySelectorAll('#nav_clientMaintenanceTabs .nav-link'));
    if (tabs.length === 0) {
        return 0;
    }

    for (let index = 0; index < tabs.length; index++) {
        const tab = tabs[index];
        const paneSelector = tab?.getAttribute('data-bs-target');
        const pane = paneSelector ? document.querySelector(paneSelector) : null;
        if (paneHasWorkflowFetchedDetails(pane)) {
            return index;
        }
    }

    const currentIndex = getCurrentTabIndex();
    return currentIndex >= 0 ? currentIndex : 0;
}

function focusFirstWorkflowStageWithFetchedDetails() {
    const targetIndex = getFirstWorkflowTabWithFetchedDetailsIndex();
    lockWorkflowTabsToSingleStage(targetIndex, true);
    activateWorkflowTabAt(targetIndex);
    updateTabNavigationButtons();
    return targetIndex;
}

/**
 * Build a request object for tab actions (create/update)
 */
function buildTabActionRequest(tabKey, payload) {
    const requestContext = buildClientMaintenanceRequestContext({ requireSelection: false }) || {};

    payload.ModuleID = String(requestContext.ModuleID || window.ClientMaintenanceCore?.moduleId || '').trim();
    payload.ClientID = String(requestContext.ClientID || window.ClientMaintenanceCore?.clientId || '').trim();
    payload.RequestID = String(requestContext.RequestID || window.ClientMaintenanceCore?.requestId || '').trim();
    payload.ApplicationID = String(payload.ApplicationID || payload.RequestID || requestContext.ApplicationID || '').trim();

    const clientTypeId = String(requestContext.ClientTypeID || getClientMaintenanceClientTypeId() || '').trim();
    if (!payload.ClientTypeID && clientTypeId) {
        payload.ClientTypeID = clientTypeId;
    }

    return payload;
    //return {
    //    ModuleID: moduleId,
    //    ClientID: clientId,
    //    RequestID: requestId,
    //    Payload: payload || {}
    //};
}

function syncBasicDetailsContextFromResponse(response, requestData) {
    const row = normalizeSingleRow(response) || {};

    const resolvedClientId = String(
        row?.ClientID ??
        row?.ClientId ??
        requestData?.ClientID ??
        ''
    ).trim();

    const resolvedRequestId = String(
        row?.RequestID ??
        row?.RequestId ??
        row?.ApplicationID ??
        row?.ApplicationId ??
        requestData?.RequestID ??
        requestData?.ApplicationID ??
        ''
    ).trim();

    const resolvedClientName = String(
        row?.Name ??
        row?.ClientName ??
        row?.ClientFullName ??
        row?.FullName ??
        requestData?.Name ??
        requestData?.ClientName ??
        ''
    ).trim();

    if (resolvedClientId) {
        window.ClientMaintenanceCore.clientId = resolvedClientId;
        const mainClientIdInput = document.getElementById('txt_mainClientId');
        if (mainClientIdInput) {
            mainClientIdInput.value = resolvedClientId;
        }
    }

    if (resolvedRequestId) {
        window.ClientMaintenanceCore.requestId = resolvedRequestId;
        const mainApplicationIdInput = document.getElementById('txt_mainApplicationId');
        if (mainApplicationIdInput) {
            mainApplicationIdInput.value = resolvedRequestId;
        }
    }

    if (resolvedClientName) {
        window.ClientMaintenanceCore.clientName = resolvedClientName;
        const mainClientNameInput = document.getElementById('txt_mainClientName');
        if (mainClientNameInput) {
            mainClientNameInput.value = resolvedClientName;
        }
    }
}

async function invokeBasicDetailsAction(action, requestData) {
    const service = window.ClientMaintenanceService;
    const handler = action === 'create'
        ? service?.createBasic
        : service?.updateBasic;

    if (typeof handler !== 'function') {
        return {
            success: false,
            response: null,
            errorMessage: `Basic details ${action} action is not available`
        };
    }

    try {
        const response = await handler(requestData || {});
        const success = response?.Success === true ||
            response?.success === true ||
            response?.ResponseCode === '00' ||
            response?.responseCode === '00';

        if (!success) {
            return {
                success: false,
                response,
                errorMessage: response?.ErrorMessage ||
                    response?.errorMessage ||
                    response?.ResponseMessage ||
                    response?.responseMessage ||
                    `Basic details ${action} failed`
            };
        }

        syncBasicDetailsContextFromResponse(response, requestData);

        return {
            success: true,
            response,
            errorMessage: null
        };
    } catch (error) {
        return {
            success: false,
            response: null,
            errorMessage: error?.message || `Basic details ${action} failed`
        };
    }
}

/**
 * Invoke a tab service action (create or update)
 * Returns { success: boolean, response: object, errorMessage: string }
 */
async function invokeTabAction(tabKey, action, requestData) {
    const serviceKey = `ClientMaintenance${tabKey}Service`;
    const service = window[serviceKey];
    console.log(tabKey);
    if (!service || typeof service[action] !== 'function') {
        return {
            success: false,
            response: null,
            errorMessage: `Service or action not found for ${tabKey}.${action}`
        };
    }

    try {
        const response = await service[action](requestData);

        // Check for success marker in response
        const isSuccess = response?.Success === true ||
            response?.success === true ||
            response?.ResponseCode === '00' ||
            response?.responseCode === '00';

        if (!isSuccess) {
            const errorMsg = response?.ErrorMessage ||
                response?.errorMessage ||
                response?.ResponseMessage ||
                response?.responseMessage ||
                `${action} operation failed`;

            return {
                success: false,
                response: response,
                errorMessage: errorMsg
            };
        }

        return {
            success: true,
            response: response,
            errorMessage: null
        };
    } catch (error) {
        return {
            success: false,
            response: null,
            errorMessage: error?.message || 'Network or service error'
        };
    }
}

/**
 * Process workflow step: validate → save → navigate
 * This is called when Next button is clicked
 */
async function processTabWorkflowStep(tabKey, pane, tabIndex) {
    if (!pane || !tabKey) return false;

    const isAddMode = window.ClientMaintenanceCore?.shellState === 'add';
    const isFirstWorkflowStep = Number(tabIndex) === 0;

    if (typeof pane._cmHandleWorkflowStep === 'function') {
        const workflowStepState = await pane._cmHandleWorkflowStep({
            tabKey,
            tabIndex,
            isAddMode,
            isFirstWorkflowStep
        });

        if (workflowStepState?.handled === true) {
            if (workflowStepState.canNavigate !== true) {
                const hookMessage = String(workflowStepState?.errorMessage || '').trim();
                if (hookMessage) {
                    window.ClientMaintenanceCore.showToast(`${tabKey}: ${hookMessage}`, 'warning');
                }
                return false;
            }

            if (isAddMode && workflowStepState.markPersisted !== false) {
                markAddWorkflowStepPersisted(tabKey);
            }

            markTabAsCompleted(tabKey);

            if (isAddMode) {
                lockRemainingWorkflowTabs(tabIndex + 1, true);
            }

            return true;
        }
    }

    if (typeof pane._cmConsumeWorkflowPersistedState === 'function') {
        const persistedState = await pane._cmConsumeWorkflowPersistedState({
            tabKey,
            tabIndex,
            isAddMode,
            isFirstWorkflowStep
        });

        if (persistedState?.persisted === true) {
            if (isAddMode) {
                markAddWorkflowStepPersisted(tabKey);
            }

            markTabAsCompleted(tabKey);

            if (isAddMode) {
                lockRemainingWorkflowTabs(tabIndex + 1, true);
            }

            return true;
        }
    }

    // Step 1: Validate mandatory fields
    const validation = validateTabMandatoryFields(pane, tabKey);
    if (!validation.isValid) {
        const emptyLabels = validation.emptyFields.map(f => f.label).join(', ');
        window.ClientMaintenanceCore.showToast(
            `${tabKey}: Please fill in required fields: ${emptyLabels}`,
            'warning'
        );
        // Optionally, focus on first empty field
        if (validation.emptyFields.length > 0) {
            validation.emptyFields[0].field?.focus?.();
        }
        return false; // Don't navigate
    }

    // Step 1.5: Call tab-specific validation if available (e.g., age validation)
    if (typeof pane._cmValidate === 'function') {
        const customValidationResult = pane._cmValidate();
        if (customValidationResult === false) {
            return false; // Don't navigate, error panel should be shown by _cmValidate
        }
    }

    // Step 2: Resolve action mode.
    // In Add workflow, a step must stay in create mode until its own create call succeeds.
    // Do not infer persistence from filled fields; only trust successful server responses.

    // Build request once and use the same request path for both basic-details and step actions.
    const payload = getTabDataFromPane(pane);
    const requestData = buildTabActionRequest(tabKey, payload);

    if (isFirstWorkflowStep) {
        const basicAction = isAddMode
            ? (addWorkflowBasicDetailsPersisted ? 'update' : 'create')
            : 'update';

        window.ClientMaintenanceCore.showToast(
            `Basic details: ${basicAction === 'create' ? 'creating' : 'updating'}...`,
            'info'
        );

        const basicResult = await invokeBasicDetailsAction(basicAction, requestData);
        if (!basicResult.success) {
            window.ClientMaintenanceCore.showToast(
                `Basic details: ${basicResult.errorMessage}`,
                'error'
            );
            return false;
        }

        // Keep the same request object aligned with context refreshed by basic-details response.
        requestData.ModuleID = String(window.ClientMaintenanceCore?.moduleId || requestData.ModuleID || '').trim();
        requestData.ClientID = String(window.ClientMaintenanceCore?.clientId || requestData.ClientID || '').trim();
        requestData.RequestID = String(window.ClientMaintenanceCore?.requestId || requestData.RequestID || '').trim();

        if (isAddMode && basicAction === 'create') {
            addWorkflowBasicDetailsPersisted = true;
        }
    }

    const isPersistedStep = hasAddWorkflowStepPersisted(tabKey);
    const isEditExistingStep = hasEditModeStepExists(tabKey);
    const action = isAddMode
        ? (isPersistedStep ? 'update' : 'create')
        : (isEditExistingStep ? 'update' : 'create');

    // Log the action determination for debugging workflow issues
    console.log(`[ClientMaintenance] Tab: ${tabKey}, IsAddMode: ${isAddMode}, IsPersistedStep: ${isPersistedStep}, IsEditExistingStep: ${isEditExistingStep}, Action: ${action}`);

    // Step 4: Invoke the action
    window.ClientMaintenanceCore.showToast(`${tabKey}: Saving...`, 'info');
    const result = await invokeTabAction(tabKey, action, requestData);

    // Step 5: Handle response
    if (!result.success) {
        window.ClientMaintenanceCore.showToast(
            `${tabKey}: ${result.errorMessage}`,
            'error'
        );
        return false; // Don't navigate
    }

    if (isAddMode && action === 'create') {
        markAddWorkflowStepPersisted(tabKey);
    } else if (!isAddMode && action === 'create') {
        // In edit mode a successful create means the step now has server data.
        markEditModeStepExists(tabKey, true);
    }

    // Step 6: On success, display confirmation message
    window.ClientMaintenanceCore.showToast(
        `${tabKey}: ${action === 'create' ? 'Created' : 'Updated'} successfully`,
        'success'
    );

    // Mark this tab as completed
    markTabAsCompleted(tabKey);

    // Step 7: Lock remaining tabs if in Add workflow (until all tabs complete)
    if (isAddMode) {
        // Unlock exactly the next stage only after current stage saves successfully.
        lockRemainingWorkflowTabs(tabIndex + 1, true);
    }

    return true; // Allow navigation
}

/**
 * Navigate to next tab with validation and save
 * Enhanced to validate mandatory fields and invoke save/create operations
 * Only allows navigation on successful response
 */
async function navigateToNextTab() {
    const currentIndex = getCurrentTabIndex();
    const tabs = Array.from(document.querySelectorAll('#nav_clientMaintenanceTabs .nav-link'));

    // Check if on last tab
    if (currentIndex >= tabs.length - 1) {
        window.ClientMaintenanceCore.showToast('You are on the last step. Click Submit to complete the workflow.', 'info');
        return;
    }

    // Get current tab info
    const currentTab = tabs[currentIndex];
    if (!currentTab) return;

    const tabKey = currentTab.getAttribute('data-cm-tab-key');
    const tabPaneSelector = currentTab.getAttribute('data-bs-target');
    const pane = tabPaneSelector ? document.querySelector(tabPaneSelector) : null;

    if (!pane || !tabKey) {
        window.ClientMaintenanceCore.showToast('Unable to determine current tab. Please try again.', 'error');
        return;
    }

    // Check if we're in a workflow mode (Add or Edit)
    const isInWorkflow = window.ClientMaintenanceCore?.shellState === 'add' ||
        window.ClientMaintenanceCore?.isEditMode === true;

    if (!isInWorkflow) {
        // Not in workflow mode - just navigate without validation
        const nextTab = tabs[currentIndex + 1];
        if (nextTab) {
            const bsTab = new bootstrap.Tab(nextTab);
            bsTab.show();
        }
        return;
    }

    // In workflow mode - validate and save before navigating
    const canNavigate = await processTabWorkflowStep(tabKey, pane, currentIndex);

    if (canNavigate) {
        // Navigate to next tab
        const nextTab = tabs[currentIndex + 1];
        if (nextTab) {
            const bsTab = new bootstrap.Tab(nextTab);
            bsTab.show();
            // Give the tab time to show, then update button states
            setTimeout(() => updateTabNavigationButtons(), 100);
        }
    }
}

/**
 * Update tab navigation button states
 */
function updateTabNavigationButtons() {
    const currentIndex = getCurrentTabIndex();
    const tabs = Array.from(document.querySelectorAll('#nav_clientMaintenanceTabs .nav-link'));

    const prevBtn = document.getElementById('btn_cmPrevious');
    const nextBtn = document.getElementById('btn_cmNext');

    if (prevBtn) {
        prevBtn.disabled = currentIndex <= 0 || tabs.length === 0;
    }

    if (nextBtn) {
        nextBtn.disabled = currentIndex >= tabs.length - 1 || tabs.length === 0;
    }
}

function activateWorkflowTabAt(index) {
    const tabs = Array.from(document.querySelectorAll('#nav_clientMaintenanceTabs .nav-link'));
    if (index < 0 || index >= tabs.length) return false;

    const tab = tabs[index];
    if (!tab) return false;

    if (tab.classList.contains('active')) {
        updateTabNavigationButtons();
        return true;
    }

    if (window.bootstrap?.Tab) {
        new window.bootstrap.Tab(tab).show();
    } else {
        tab.click();
    }

    return true;
}

function activateFirstWorkflowTab() {
    return activateWorkflowTabAt(0);
}

/**
 * Invoke update or create on current tab based on whether data exists
 */
async function saveCurrentTabData() {
    const activeTab = document.querySelector('#nav_clientMaintenanceTabs .nav-link.active');
    if (!activeTab) return;

    const tabKey = activeTab.getAttribute('data-cm-tab-key');
    const tabPaneSelector = activeTab.getAttribute('data-bs-target');
    const tabPane = document.querySelector(tabPaneSelector);

    if (!tabPane) return;

    // Get the service from the catalog
    const serviceKey = `Client${tabKey}Service`;
    const service = window[serviceKey];

    if (!service) {
        window.ClientMaintenanceCore.showToast(`Service for ${tabKey} not found`, 'error');
        return;
    }

    // Check if tab has loaded data (look for _cmLoadData or data indicators)
    const explicitLoadedState = getPaneLoadedState(tabPane);
    const hasLoadedData = explicitLoadedState === true ||
        (explicitLoadedState == null && tabPane.querySelectorAll('input[value], select option:selected, textarea').length > 0);

    try {
        // Build request
        const moduleId = window.ClientMaintenanceCore.moduleId || '';
        const selectedId = window.ClientMaintenanceCore.getSelectedId();
        const requestId = window.ClientMaintenanceCore.requestId || '';

        const request = {
            ModuleID: moduleId,
            ClientID: selectedId,
            RequestID: requestId,
            Payload: {}
        };

        // Collect form data from tab
        tabPane.querySelectorAll('input, select, textarea').forEach((element) => {
            const key = element.name || element.id;
            if (!key) return;
            request.Payload[key] = element.type === 'checkbox' ? element.checked : element.value;
        });

        // Determine if we should call create or update
        const action = hasLoadedData ? 'update' : 'create';

        if (typeof service[action] !== 'function') {
            window.ClientMaintenanceCore.showToast(`${action} action not available for ${tabKey}`, 'error');
            return;
        }

        const response = await service[action](request);
        const success = response?.Success ?? response?.success ?? true;

        if (!success) {
            const error = response?.ErrorMessage || response?.errorMessage || `Failed to ${action}`;
            window.ClientMaintenanceCore.showToast(error, 'error');
            return;
        }

        window.ClientMaintenanceCore.showToast(`${tabKey}: ${action} completed`, 'success');
    } catch (error) {
        window.ClientMaintenanceCore.showToast(`Error: ${error.message}`, 'error');
    }
}

function storeControlState(control) {
    if (!control) return;
    if (control.dataset.cmPrevDisabled === undefined) {
        control.dataset.cmPrevDisabled = control.disabled ? 'true' : 'false';
    }
    if (typeof control.readOnly === 'boolean' && control.dataset.cmPrevReadOnly === undefined) {
        control.dataset.cmPrevReadOnly = control.readOnly ? 'true' : 'false';
    }
}

function restoreControlState(control) {
    if (!control) return;
    if (control.dataset.cmPrevDisabled !== undefined) {
        control.disabled = control.dataset.cmPrevDisabled === 'true';
        delete control.dataset.cmPrevDisabled;
    }
    if (typeof control.readOnly === 'boolean' && control.dataset.cmPrevReadOnly !== undefined) {
        control.readOnly = control.dataset.cmPrevReadOnly === 'true';
        delete control.dataset.cmPrevReadOnly;
    }
}

function toggleFormControl(control, isEditMode) {
    if (!control) return;
    const tag = String(control.tagName || '').toLowerCase();
    const type = String(control.type || '').toLowerCase();

    if (type === 'hidden') return;

    if (isEditMode) {
        restoreControlState(control);
        syncClientMaintenanceDateInput(control);
        return;
    }

    storeControlState(control);

    if (tag === 'select' || type === 'checkbox' || type === 'radio' || type === 'file' || type === 'date') {
        control.disabled = true;
        syncClientMaintenanceDateInput(control);
        return;
    }

    if (type === 'button' || type === 'submit' || type === 'reset') {
        control.disabled = true;
        syncClientMaintenanceDateInput(control);
        return;
    }

    if (typeof control.readOnly === 'boolean') {
        control.readOnly = true;
    } else {
        control.disabled = true;
    }

    syncClientMaintenanceDateInput(control);
}

function toggleButtonControl(button, isEditMode) {
    if (!button) return;
    if (button.classList.contains('section-toggle-btn')) return;

    if (isEditMode) {
        restoreControlState(button);
        return;
    }

    storeControlState(button);
    button.disabled = true;
}

function ensureTabEditObserver(tabRoot) {
    if (!tabRoot || tabRoot._cmEditObserver) return;

    tabRoot._cmEditObserver = new MutationObserver((mutations) => {
        if (window.ClientMaintenanceCore?.isEditMode) return;

        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (!(node instanceof HTMLElement)) return;

                if (node.matches('input, select, textarea')) {
                    toggleFormControl(node, false);
                }

                if (node.matches('button')) {
                    toggleButtonControl(node, false);
                }

                node.querySelectorAll('input, select, textarea').forEach((field) => {
                    toggleFormControl(field, false);
                });

                syncClientMaintenanceFlatpickrInScope(node);

                node.querySelectorAll('button').forEach((button) => {
                    toggleButtonControl(button, false);
                });
            });
        });
    });

    tabRoot._cmEditObserver.observe(tabRoot, { childList: true, subtree: true });
}

function applyTabEditMode(tabRoot, isEditMode) {
    if (!tabRoot) return;

    ensureTabEditObserver(tabRoot);

    tabRoot.querySelectorAll('input, select, textarea').forEach((field) => {
        toggleFormControl(field, isEditMode);
    });

    tabRoot.querySelectorAll('button').forEach((button) => {
        toggleButtonControl(button, isEditMode);
    });

    if (typeof tabRoot._cmSetEditMode === 'function') {
        tabRoot._cmSetEditMode(isEditMode);
    }

    initializeClientMaintenanceDatePickers(tabRoot);
    syncClientMaintenanceFlatpickrInScope(tabRoot);
}

/**
 * Set client maintenance edit mode
 * When enabled, partial view fields become editable and grid action buttons are enabled
 */
function setClientEditMode(isEditMode, options = {}) {
    const editMode = Boolean(isEditMode);
    if (window.ClientMaintenanceCore) {
        window.ClientMaintenanceCore.isEditMode = editMode;

        if (!editMode) {
            window.ClientMaintenanceCore.singleStageEditLockActive = false;
            if (window.ClientMaintenanceCore.shellState !== 'add') {
                unlockAllWorkflowTabs();
            }
        }
    }

    const stageTabs = Array.isArray(clientMaintenanceStageTabs) ? clientMaintenanceStageTabs : [];
    stageTabs.forEach((config) => {
        const pane = document.getElementById(config.pane);
        if (pane) {
            applyTabEditMode(pane, editMode);
        }
    });

    if (editMode && options.showToast !== false && window.ClientMaintenanceCore?.showToast) {
        const toastMessage = options.toastMessage || 'Edit mode enabled - you can now modify records';
        window.ClientMaintenanceCore.showToast(toastMessage, 'info');
    }
}

/**
 * Enable grid selection with action buttons
 * Called by partial view modules when a row is selected in edit mode
 */
function enableGridRowActions(tabRoot, hasSelection) {
    if (!tabRoot) return;

    const canEnable = Boolean(window.ClientMaintenanceCore?.isEditMode);
    const enableActions = Boolean(hasSelection) && canEnable;

    const actionTargets = new Set(['update', 'alter', 'remove', 'delete', 'clear']);
    const buttons = tabRoot.querySelectorAll('button');

    buttons.forEach((button) => {
        const actionKeys = Object.keys(button.dataset || {}).filter((key) => key.toLowerCase().endsWith('action'));
        if (actionKeys.length === 0) return;
        const hasMatch = actionKeys.some((key) => actionTargets.has(String(button.dataset[key] || '').toLowerCase()));
        if (hasMatch) {
            button.disabled = !enableActions;
        }
    });
}

if (window.ClientMaintenanceCore) {
    window.ClientMaintenanceCore.setClientEditMode = setClientEditMode;
    window.ClientMaintenanceCore.enableGridRowActions = enableGridRowActions;
}

/**
 * Enable cancel button when client or application data is loaded
 */
function enableCancelButton() {
    setClientLoadedState(true);
}

async function beginNewClientMaintenance() {
    const shell = document.querySelector('[data-client-maintenance]');
    if (!shell || !window.ClientMaintenanceCore) return;

    const clientTypeSelect = shell.querySelector('#ddl_mainClientType');
    const selectedClientType = String(clientTypeSelect?.value || '').trim();

    if (!selectedClientType) {
        window.ClientMaintenanceCore.showToast('Choose a client type before clicking Add.', 'warning');
        clientTypeSelect?.focus();
        return;
    }

    await withClientMaintenanceShellLoading(async () => {
        await loadWorkflowStagesForClientType(selectedClientType);
    }, 'Loading workflow stages...');

    if (!Array.isArray(clientMaintenanceStageTabs) || clientMaintenanceStageTabs.length === 0) {
        window.ClientMaintenanceCore.showToast('No workflow stages are available for the selected client type.', 'warning');
        clientTypeSelect?.focus();
        return;
    }

    const clientIdInput = document.getElementById('txt_mainClientId');
    const clientNameInput = document.getElementById('txt_mainClientName');
    const applicationIdInput = document.getElementById('txt_mainApplicationId');
    const applicationNameInput = document.getElementById('txt_mainApplicationName');

    if (clientIdInput) clientIdInput.value = '';
    if (clientNameInput) clientNameInput.value = '';
    if (applicationIdInput) applicationIdInput.value = '';
    if (applicationNameInput) applicationNameInput.value = '';

    window.ClientMaintenanceCore.clientId = null;
    window.ClientMaintenanceCore.clientName = null;
    window.ClientMaintenanceCore.requestId = null;
    window.ClientMaintenanceCore.useRequestId = false;
    window.ClientMaintenanceCore.recentActivityTrackedClientId = null;
    window.ClientMaintenanceCore.canEditCurrent = false;
    window.ClientMaintenanceCore.hasLoadedRecord = false;
    window.ClientMaintenanceCore.shellState = 'add';
    window.ClientMaintenanceCore.singleStageEditLockActive = false;
    clearAddWorkflowPersistedSteps();
    clearEditModeExistingSteps();

    resetBehindSceneFields();
    setMainWorkflowLocked(true);
    setClientEditMode(true, { showToast: false });
    activateFirstWorkflowTab();
    // Lock remaining tabs during Add workflow - only first tab is accessible initially
    lockRemainingWorkflowTabs(0, true);
    setClientLoadedState(false);
    updateSaveButtonState();
    updateTabNavigationButtons();

    if (window.SidebarManager && typeof window.SidebarManager.setMainRecordLoaded === 'function') {
        window.SidebarManager.setMainRecordLoaded(false, null);
    }
}

function setMainWorkflowLocked(isLocked) {
    const shell = document.querySelector('[data-client-maintenance]');
    if (!shell || !window.ClientMaintenanceCore) return;

    window.ClientMaintenanceCore.isMainWorkflowLocked = Boolean(isLocked);

    const textInputs = [
        '#txt_mainClientId',
        '#txt_mainClientName',
        '#txt_mainApplicationId',
        '#txt_mainApplicationName'
    ];

    const selects = [
        '#ddl_mainClientType',
        '#ddl_mainClientGroup'
    ];

    textInputs.forEach((selector) => {
        const field = shell.querySelector(selector);
        if (field) {
            field.readOnly = isLocked;
        }
    });

    selects.forEach((selector) => {
        const field = shell.querySelector(selector);
        if (field) {
            field.disabled = isLocked;
        }
    });

    shell.querySelectorAll('[data-main-client-search], [data-main-application-search]').forEach((button) => {
        button.disabled = isLocked;
    });
}

function setClientLoadedState(isLoaded) {
    if (window.ClientMaintenanceCore) {
        window.ClientMaintenanceCore.hasLoadedRecord = Boolean(isLoaded);
        if (isLoaded) {
            window.ClientMaintenanceCore.shellState = 'loaded';
        } else if (window.ClientMaintenanceCore.shellState !== 'add') {
            window.ClientMaintenanceCore.shellState = 'idle';
        }
    }

    // Action buttons
    const viewBtn = document.querySelector('[data-action-btn="view"]');
    const addBtn = document.querySelector('[data-action-btn="new"]');
    const editBtn = document.querySelector('[data-action-btn="edit"]');

    // Submission buttons
    const cancelBtn = document.getElementById('btn_cmCancel');
    const clearBtn = document.getElementById('btn_cmClear') || document.querySelector('[data-submit-action="clear"]');
    const recordPrevBtn = document.querySelector('[data-record-nav="prev"]');
    const recordNextBtn = document.querySelector('[data-record-nav="next"]');
    const hasLoadedRecord = Boolean(window.ClientMaintenanceCore?.hasLoadedRecord);
    const isAddMode = window.ClientMaintenanceCore?.shellState === 'add';
    const hasActiveWorkflow = isAddMode || hasLoadedRecord;

    // When a record is loaded/fetched/viewed:
    // - View and Add buttons are disabled (can't view/add another while editing)
    // - Edit and Cancel buttons are enabled (can edit current or cancel)
    // When no record is loaded:
    // - View and Add buttons are enabled (can search for record or add new)
    // - Edit and Cancel buttons are disabled (nothing to edit)

    if (viewBtn) viewBtn.disabled = hasActiveWorkflow;
    if (addBtn) addBtn.disabled = hasActiveWorkflow;
    const allowEdit = hasLoadedRecord && window.ClientMaintenanceCore?.useRequestId && window.ClientMaintenanceCore?.canEditCurrent;
    if (editBtn) editBtn.disabled = !allowEdit;

    if (cancelBtn) cancelBtn.disabled = !hasActiveWorkflow;
    if (clearBtn) clearBtn.disabled = !hasLoadedRecord;
    if (recordPrevBtn) recordPrevBtn.disabled = !hasLoadedRecord;
    if (recordNextBtn) recordNextBtn.disabled = !hasLoadedRecord;
}

/**
 * Reset workflow and clear all fields
 */
async function resetClientMaintenance() {
    // Use AppCore.showConfirmation dialog
    const appCore = getAppCore();
    if (!appCore || !appCore.showConfirmation) {
        console.warn('AppCore dialog not available, using window.confirm');
        if (!window.confirm('Are you sure you want to clear all data and reset the workflow? This action cannot be undone.')) {
            return;
        }
    } else {
        const confirmed = await appCore.showConfirmation(
            'Reset Workflow',
            'Are you sure you want to clear all data and reset the workflow? This action cannot be undone.'
        );
        if (!confirmed) return;
    }

    try {
        // Clear all input fields
        const clientIdInput = document.getElementById('txt_mainClientId');
        const clientNameInput = document.getElementById('txt_mainClientName');
        const applicationIdInput = document.getElementById('txt_mainApplicationId');
        const applicationNameInput = document.getElementById('txt_mainApplicationName');
        const clientTypeSelect = document.getElementById('ddl_mainClientType');
        const clientGroupSelect = document.getElementById('ddl_mainClientGroup');

        if (clientIdInput) clientIdInput.value = '';
        if (clientNameInput) clientNameInput.value = '';
        if (applicationIdInput) applicationIdInput.value = '';
        if (applicationNameInput) applicationNameInput.value = '';
        if (clientTypeSelect) clientTypeSelect.value = '';
        if (clientGroupSelect) clientGroupSelect.value = '';

        setMainWorkflowLocked(false);

        // Clear CoreData
        window.ClientMaintenanceCore.clientId = null;
        window.ClientMaintenanceCore.clientName = null;
        window.ClientMaintenanceCore.requestId = null;
        window.ClientMaintenanceCore.useRequestId = false;
        window.ClientMaintenanceCore.recentActivityTrackedClientId = null;
        window.ClientMaintenanceCore.workflowId = null;
        window.ClientMaintenanceCore.canEditCurrent = false;
        window.ClientMaintenanceCore.shellState = 'idle';
        window.ClientMaintenanceCore.hasLoadedRecord = false;
        window.ClientMaintenanceCore.singleStageEditLockActive = false;
        clearAddWorkflowPersistedSteps();
        clearEditModeExistingSteps();

        // Clear all tab content
        const tabContentWrapper = document.getElementById('dv_clientMaintenanceTabContent');
        if (tabContentWrapper) {
            tabContentWrapper.innerHTML = '<div class="text-muted py-2" data-cm-empty-stages>Select a client type to load workflow stages.</div>';
        }

        // Clear all tabs
        const navTabs = document.getElementById('nav_clientMaintenanceTabs');
        if (navTabs) {
            navTabs.innerHTML = '';
        }

        // Reset all tab tracking
        window.ClientMaintenanceCore.clearTabRegistry();
        clientMaintenanceStageTabs = [];
        clearAllTabCompletions();
        unlockAllWorkflowTabs();
        resetBehindSceneFields();

        // Exit edit mode for all partial views
        setClientEditMode(false);

        // Reset action buttons to disabled state
        setClientLoadedState(false);

        // Disable navigation buttons
        updateTabNavigationButtons();

        // Update save button state
        updateSaveButtonState();

        // Notify sidebar that the client record has been cleared
        if (window.SidebarManager && typeof window.SidebarManager.setMainRecordLoaded === 'function') {
            window.SidebarManager.setMainRecordLoaded(false, null);
            console.log('[Client Maintenance] Notified sidebar of cleared client state');
        }

        window.ClientMaintenanceCore.showToast('Workflow reset successfully', 'success');
    } catch (error) {
        window.ClientMaintenanceCore.showToast(`Error resetting workflow: ${error.message}`, 'error');
    }
}
