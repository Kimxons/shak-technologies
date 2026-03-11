const CM_ADDRESS_BASE = 'Identities/ClientMaintenance/Address';
const MODULEID_CLIENTADDRESS = 1010;
function getAddressAppCore() {
    const win = window;
    return win.AppCore ||
        (win.parent && win.parent !== win && win.parent.AppCore) ||
        (win.top && win.top !== win && win.top.AppCore) ||
        null;
}

function getAddressClientMaintenanceCore() {
    const win = window;
    return win.ClientMaintenanceCore ||
        (win.parent && win.parent !== win && win.parent.ClientMaintenanceCore) ||
        (win.top && win.top !== win && win.top.ClientMaintenanceCore) ||
        null;
}

function getAddressSidebarManager() {
    const win = window;
    try {
        return (win.parent && win.parent !== win && win.parent.SidebarManager) ||
            (win.top && win.top !== win && win.top.SidebarManager) ||
            null;
    } catch (_error) {
        return null;
    }
}

function invokeClientMaintenanceAddress(action, requestData) {
    const maintenanceCore = getAddressClientMaintenanceCore();
    if (maintenanceCore?.invokeControllerMethod) {
        return maintenanceCore.invokeControllerMethod(CM_ADDRESS_BASE, action, 'POST', requestData || {});
    }

    const appCore = getAddressAppCore();
    if (appCore?.invokeControllerByMethodAsync) {
        return appCore.invokeControllerByMethodAsync(`${CM_ADDRESS_BASE}/${action}`, 'POST', requestData || {});
    }

    return Promise.reject(new Error('Address controller invocation is not available.'));
}

window.ClientMaintenanceAddressService = {
    get: (requestData) => invokeClientMaintenanceAddress('get', requestData),
    create: (requestData) => invokeClientMaintenanceAddress('create', requestData),
    update: (requestData) => invokeClientMaintenanceAddress('update', requestData),
    delete: (requestData) => invokeClientMaintenanceAddress('delete', requestData)
};

function showAddressToast(message, type = 'info') {
    const maintenanceCore = getAddressClientMaintenanceCore();
    if (maintenanceCore?.showToast) {
        maintenanceCore.showToast(message, type);
        return;
    }

    if (window.NotificationService?.showToast) {
        window.NotificationService.showToast(message, type, 4000);
        return;
    }

    console.log(`[${type}] ${message}`);
}

async function requestAddressConfirmation(title, message) {
    const appCore = getAddressAppCore();
    if (appCore?.showConfirmation) {
        return Boolean(await appCore.showConfirmation(title, message));
    }

    return window.confirm(message);
}

function getAddressViewState() {
    return window.ClientAddressState || {};
}

function getParentAddressContext() {
    const maintenanceCore = getAddressClientMaintenanceCore();
    if (maintenanceCore?.getParentContext) {
        return maintenanceCore.getParentContext();
    }

    const sidebarManager = getAddressSidebarManager();
    if (sidebarManager?.getParentContext) {
        return sidebarManager.getParentContext();
    }

    return null;
}

function toTrimmedString(value) {
    return value === undefined || value === null ? '' : String(value).trim();
}

function firstNonEmptyString(...values) {
    for (const value of values) {
        const normalized = toTrimmedString(value);
        if (normalized) {
            return normalized;
        }
    }

    return '';
}

function resolveAddressContext(requestData, fallbackModuleId) {
    const viewState = getAddressViewState();
    const parentContext = getParentAddressContext() || {};
    const maintenanceCore = getAddressClientMaintenanceCore();

    const moduleId = firstNonEmptyString(
        requestData?.ModuleID,
        fallbackModuleId,
        maintenanceCore?.moduleId,
        parentContext.moduleId,
        viewState.ModuleID
    );

    const clientId = firstNonEmptyString(
        requestData?.ClientID,
        maintenanceCore?.clientId,
        parentContext.clientId,
        viewState.ClientID
    );

    const requestId = firstNonEmptyString(
        requestData?.RequestID,
        maintenanceCore?.requestId,
        parentContext.requestId,
        viewState.RequestID
    );

    return {
        ModuleID: moduleId,
        ClientID: clientId,
        RequestID: requestId,
        ApplicationID: requestId || '',
        AutoLoad: Boolean(viewState.AutoLoad),
        IsStandalone: Boolean(viewState.IsStandalone)
    };
}

function shouldAutoLoadStandaloneAddress(context) {
    return Boolean(
        context?.IsStandalone &&
        (context?.ClientID || context?.RequestID)
    );
}

function parseAddressCandidate(candidate) {
    if (candidate === null || candidate === undefined || candidate === '') {
        return null;
    }

    if (typeof candidate === 'string') {
        try {
            return JSON.parse(candidate);
        } catch (_error) {
            return null;
        }
    }

    return candidate;
}

function extractList(response) {
    if (!response) return [];

    const candidates = [
        response?.Details,
        response?.data?.Details,
        response?.data?.[0]?.Details,
        response?.Details?.[0]?.Details,
        response?.Data,
        response?.data,
        response
    ];

    for (const candidate of candidates) {
        const parsed = parseAddressCandidate(candidate);
        if (Array.isArray(parsed)) {
            return parsed;
        }
    }

    return [];
}

function getResponseCode(response) {
    return toTrimmedString(response?.ResponseCode ?? response?.responseCode);
}

function getResponseMessage(response, fallbackMessage) {
    return response?.ResponseMessage ??
        response?.responseMessage ??
        response?.Message ??
        response?.message ??
        response?.ErrorMessage ??
        response?.errorMessage ??
        fallbackMessage;
}

function isResponseSuccess(response) {
    const successFlag = response?.Success ?? response?.success;
    if (typeof successFlag === 'boolean') {
        return successFlag;
    }

    const responseCode = getResponseCode(response).toUpperCase();
    if (responseCode) {
        return responseCode === '000' || responseCode === '00' || responseCode === 'SUCCESS';
    }

    return true;
}

function isNoDataResponse(response) {
    const responseCode = getResponseCode(response).toUpperCase();
    const responseMessage = toTrimmedString(getResponseMessage(response, ''));
    return responseCode === 'DBEX000020' || /do not exist/i.test(responseMessage);
}

window.initClientMaintenanceAddressTab = function (tabRoot, moduleId, options = {}) {
    if (!tabRoot || tabRoot.dataset.cmAddressInitialized === 'true') {
        return;
    }

    tabRoot.dataset.cmAddressInitialized = 'true';

    initAddressValidation(tabRoot);
    bindAddressCrud(tabRoot, moduleId, options);
    bindAddressActionPanel(tabRoot);
    bindStandaloneAddressBootstrap(tabRoot, moduleId, options);
};

function bindAddressActionPanel(tabRoot) {
    if (!tabRoot) return;

    const actionScope = tabRoot.closest('.window') || tabRoot;
    if (actionScope.dataset.addressActionDelegated === 'true') return;

    actionScope.dataset.addressActionDelegated = 'true';

    actionScope.addEventListener('click', async (event) => {
        const actionButton = event.target.closest('[data-action]');
        if (!actionButton || !actionScope.contains(actionButton)) return;

        const action = String(actionButton.getAttribute('data-action') || '').toLowerCase();
        if (action === 'refresh') {
            event.preventDefault();
            if (typeof tabRoot._cmRefreshData === 'function') {
                await tabRoot._cmRefreshData();
            }
            return;
        }

        if (action === 'close') {
            event.preventDefault();
            closeAddressView();
        }
    });

    actionScope.addEventListener('kairo:titlebar:refresh', async (event) => {
        event.preventDefault();
        if (typeof tabRoot._cmRefreshData === 'function') {
            await tabRoot._cmRefreshData();
        }
    });

    actionScope.addEventListener('kairo:titlebar:close', (event) => {
        event.preventDefault();
        closeAddressView();
    });
}

function closeAddressView() {
    const parentWindowRef = window.parent && window.parent !== window ? window.parent : null;
    let handled = false;

    try {
        if (parentWindowRef?.SidebarManager?.closeChildForm) {
            parentWindowRef.SidebarManager.closeChildForm();
            handled = true;
        }
    } catch (_error) {
    }

    if (!handled) {
        try {
            parentWindowRef?.postMessage({ type: 'submoduleClose', source: 'ClientAddress' }, '*');
            handled = Boolean(parentWindowRef);
        } catch (_error) {
        }
    }

    try { parentWindowRef?.postMessage({ action: 'submoduleClosed', source: 'ClientAddress' }, '*'); } catch (_error) { }
    try { parentWindowRef?.postMessage({ type: 'accountMaintenanceChildClose', source: 'ClientAddress' }, '*'); } catch (_error) { }
    try { parentWindowRef?.postMessage({ type: 'CLOSE_DATAENTRY', source: 'ClientAddress' }, '*'); } catch (_error) { }

    if (!handled) {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.close();
        }
    }
}

function initAddressValidation(scopeRoot = document) {
    const utils = window.ValidationUtils;
    if (!utils) return;

    const formRoot = scopeRoot.querySelector('[data-address-form]') || scopeRoot;

    const emailInput = formRoot.querySelector('#txt_addressEmail');
    if (emailInput) {
        emailInput.addEventListener('blur', () => {
            if (emailInput.value && !utils.isValidEmail(emailInput.value)) {
                utils.showError(emailInput, 'Please enter a valid email address');
            } else {
                utils.clearError(emailInput);
            }
        });
    }

    const phoneWorkInput = formRoot.querySelector('#txt_addressPhoneWork');
    const phoneHomeInput = formRoot.querySelector('#txt_addressPhoneHome');
    const mobileInput = formRoot.querySelector('#txt_addressMobile');

    [phoneWorkInput, phoneHomeInput, mobileInput].forEach((input) => {
        if (input) utils.restrictPhone(input, 15);
    });

    const zipCodeInput = formRoot.querySelector('#txt_addressZipCode');
    if (zipCodeInput) utils.restrictAlphanumeric(zipCodeInput);

    const houseNoInput = formRoot.querySelector('#txt_addressHouseNo');
    if (houseNoInput) utils.restrictAlphanumeric(houseNoInput);
}

function bindAddressCrud(tabRoot, moduleId, options = {}) {
    if (!tabRoot) return;

    const configuredModuleId = toTrimmedString(moduleId || options?.moduleId || getAddressViewState().ModuleID);
    const initialContext = resolveAddressContext(null, configuredModuleId);
    const standaloneHost = tabRoot.matches('[data-address-host="standalone"]') || Boolean(tabRoot.closest('[data-address-host="standalone"]'));
    const state = {
        mode: 'view',
        selectedRecord: null,
        rows: [],
        isStandalone: Boolean(options?.isStandalone ?? initialContext.IsStandalone ?? standaloneHost),
        lastContext: { ...initialContext },
        initialLoadApplied: false,
        autoLoadInFlight: false
    };

    state.lastContext.IsStandalone = state.isStandalone;

    const form = tabRoot.querySelector('[data-address-form]') || tabRoot;
    const table = tabRoot.querySelector('[data-table="addresses"]');
    const tbody = table?.querySelector('tbody') || tabRoot.querySelector('#tbl_clientAddressBody');
    const loadingOverlay = tabRoot.querySelector('#loadingOverlay') || document.getElementById('loadingOverlay');
    const buttons = {
        new: tabRoot.querySelector('[data-address-action="new"]'),
        alter: tabRoot.querySelector('[data-address-action="alter"]'),
        remove: tabRoot.querySelector('[data-address-action="remove"]'),
        update: tabRoot.querySelector('[data-address-action="update"]'),
        clear: tabRoot.querySelector('[data-address-action="clear"]')
    };

    const canEditAddresses = () => state.isStandalone;

    const setLoading = (show) => {
        if (loadingOverlay) {
            loadingOverlay.hidden = !show;
        }
    };

    const setFieldsEnabled = (enabled) => {
        const nextEnabled = Boolean(enabled) && canEditAddresses();
        form.querySelectorAll('[data-address-field]').forEach((field) => {
            field.disabled = !nextEnabled;

            // Keep text-style inputs read-only while locked as an extra safeguard.
            if (field.matches('input:not([type="checkbox"]), textarea')) {
                field.readOnly = !nextEnabled;
            }
        });
    };

    const clearTableSelection = () => {
        table?.querySelectorAll('tr[data-index]').forEach((row) => {
            row.classList.remove('is-selected');
        });
    };

    const resetFormFields = () => {
        form.querySelectorAll('[data-address-field]').forEach((field) => {
            if (field.type === 'checkbox') {
                field.checked = false;
                return;
            }

            field.value = '';
        });
    };

    const applyActionState = () => {
        const editable = canEditAddresses();
        const hasSelection = Boolean(state.selectedRecord);
        const isCreateMode = state.mode === 'create';
        const isUpdateMode = state.mode === 'update';
        const isEditing = isCreateMode || isUpdateMode;

        if (buttons.new) {
            buttons.new.disabled = !editable || hasSelection || isEditing;
        }

        if (buttons.alter) {
            buttons.alter.disabled = !editable || !hasSelection || isEditing;
        }

        if (buttons.remove) {
            buttons.remove.disabled = !editable || !hasSelection || isEditing;
        }

        if (buttons.update) {
            buttons.update.disabled = !editable || !isEditing;
        }

        if (buttons.clear) {
            buttons.clear.disabled = !editable || !isEditing;
        }
    };

    const resetViewState = () => {
        clearTableSelection();
        resetFormFields();
        state.selectedRecord = null;
        state.mode = 'view';
        setFieldsEnabled(false);
        applyActionState();
    };

    const getSelectLabel = (selector, value) => {
        const selectElement = form.querySelector(selector);
        if (!selectElement || value === undefined || value === null || value === '') {
            return '';
        }

        const matchingOption = Array.from(selectElement.options).find((option) => option.value === String(value));
        return matchingOption ? matchingOption.textContent.trim() : '';
    };

    const normalizeAddressRows = (rows) => (rows || []).map((row) => {
        const recordId = row.RecordID ?? row.ID ?? row.AddressID ?? row.AddressId ?? null;
        return {
            ID: row.ID ?? recordId,
            RecordID: recordId,
            AddressID: row.AddressID ?? row.AddressId ?? recordId,
            ClientID: row.ClientID ?? '',
            AddressTypeID: row.AddressTypeID ?? row.AddressTypeId ?? '',
            IsMailingAddress: row.IsMailingAddress ?? row.IsMailing ?? false,
            Address1: row.Address1 ?? row.AddressLine1 ?? '',
            Address2: row.Address2 ?? row.AddressLine2 ?? '',
            CityID: row.CityID ?? row.CityId ?? '',
            CountryID: row.CountryID ?? row.CountryId ?? '',
            Region: row.Region ?? row.RegionID ?? row.RegionId ?? '',
            SubCityZone: row.SubCityZone ?? row.SubCityID ?? row.SubCityId ?? '',
            Wereda: row.Wereda ?? '',
            Kebele: row.Kebele ?? '',
            HouseNumber: row.HouseNumber ?? row.HouseNo ?? '',
            ZipCode: row.ZipCode ?? row.ZIPCode ?? '',
            Language: row.Language ?? row.LanguageID ?? '',
            LandMark: row.LandMark ?? row.Landmark ?? '',
            PhoneWork: row.PhoneWork ?? row.Phone1 ?? '',
            PhoneHome: row.PhoneHome ?? row.Phone2 ?? '',
            Mobile: row.Mobile ?? row.MobileNo ?? '',
            Email: row.Email ?? '',
            UpdateCount: row.UpdateCount ?? null,
            CreatedBy: row.CreatedBy ?? '',
            CreatedOn: row.CreatedOn ?? '',
            ModifiedBy: row.ModifiedBy ?? '',
            ModifiedOn: row.ModifiedOn ?? ''
        };
    });

    const renderAddressTable = (rows) => {
        state.rows = Array.isArray(rows) ? rows : [];
        if (!tbody) return;

        tbody.innerHTML = '';

        state.rows.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.dataset.index = String(index);
            row.dataset.payload = JSON.stringify(entry);

            const addressLabel = [entry.Address1, entry.Address2].filter(Boolean).join(', ');
            const typeLabel = getSelectLabel('[data-address-field="AddressTypeID"]', entry.AddressTypeID) || entry.AddressTypeID || '';
            const cityLabel = getSelectLabel('[data-address-field="CityID"]', entry.CityID) || entry.CityID || '';
            const regionLabel = getSelectLabel('[data-address-field="Region"]', entry.Region) || entry.Region || '';
            const mailing = entry.IsMailingAddress ? '<i class="bi bi-check-circle-fill text-success"></i>' : '';

            row.innerHTML = `
                <td class="ps-2">${typeLabel}</td>
                <td>${addressLabel}</td>
                <td>${cityLabel}</td>
                <td>${regionLabel}</td>
                <td>${entry.Mobile || ''}</td>
                <td class="text-center">${mailing}</td>
            `;

            tbody.appendChild(row);
        });
    };

    const readFieldValue = (field) => {
        if (field.type === 'checkbox') {
            return field.checked;
        }

        return field.value ?? '';
    };

    const buildPayload = () => {
        const payload = {};
        form.querySelectorAll('[data-address-field]').forEach((field) => {
            const key = field.dataset.addressField;
            if (!key) return;
            payload[key] = readFieldValue(field);
        });

        if (state.selectedRecord) {
            if (state.selectedRecord.ID !== null && state.selectedRecord.ID !== undefined && state.selectedRecord.ID !== '') {
                payload.ID = state.selectedRecord.ID;
            }

            if (state.selectedRecord.RecordID !== null && state.selectedRecord.RecordID !== undefined && state.selectedRecord.RecordID !== '') {
                payload.RecordID = state.selectedRecord.RecordID;
            }

            if (state.selectedRecord.AddressID !== null && state.selectedRecord.AddressID !== undefined && state.selectedRecord.AddressID !== '') {
                payload.AddressID = state.selectedRecord.AddressID;
            }

            if (state.selectedRecord.UpdateCount !== null && state.selectedRecord.UpdateCount !== undefined && state.selectedRecord.UpdateCount !== '') {
                payload.UpdateCount = state.selectedRecord.UpdateCount;
            }
        }

        const context = resolveAddressContext(state.lastContext, configuredModuleId);
        context.IsStandalone = state.isStandalone;
        state.lastContext = { ...state.lastContext, ...context };

        const recordId = state.selectedRecord?.RecordID ?? state.selectedRecord?.ID ?? state.selectedRecord?.AddressID ?? null;

        return {
            ModuleID: context.ModuleID,
            ClientID: context.ClientID,
            RequestID: context.RequestID,
            ApplicationID: context.ApplicationID || null,
            RecordID: recordId,
            Payload: payload
        };
    };

    const applyRowPayload = (payload) => {
        if (!payload) return;

        form.querySelectorAll('[data-address-field]').forEach((field) => {
            const key = field.dataset.addressField;
            if (!key) return;
            const value = payload[key];

            if (field.type === 'checkbox') {
                field.checked = Boolean(value);
            } else {
                field.value = value ?? '';
            }
        });
    };

    const refreshAddressTable = async (requestData, refreshOptions = {}) => {
        const context = resolveAddressContext(requestData, configuredModuleId);
        context.IsStandalone = state.isStandalone;
        state.lastContext = { ...state.lastContext, ...context };

        resetViewState();

        if (!context.ClientID && !context.RequestID) {
            renderAddressTable([]);
            if (refreshOptions.markInitialLoad) {
                state.initialLoadApplied = true;
            }
            return [];
        }

        setLoading(true);

        try {
            const response = await window.ClientMaintenanceAddressService.get({
                ModuleID: context.ModuleID,
                ClientID: context.ClientID,
                RequestID: context.RequestID,
                ApplicationID: context.ApplicationID || null
            });

            if (!isResponseSuccess(response) && !isNoDataResponse(response)) {
                throw new Error(getResponseMessage(response, 'Unable to load address details.'));
            }

            const rows = isNoDataResponse(response) ? [] : normalizeAddressRows(extractList(response));
            renderAddressTable(rows);

            const isInitialNoData =
                (isNoDataResponse(response) || rows.length === 0) &&
                Boolean(refreshOptions.markInitialLoad) &&
                !state.initialLoadApplied &&
                !refreshOptions.suppressNoDataInfoToast;

            if (isInitialNoData) {
                showAddressToast('No client address details were found for the selected client.', 'info');
            }

            if (refreshOptions.markInitialLoad) {
                state.initialLoadApplied = true;
            }

            return rows;
        } catch (error) {
            renderAddressTable([]);
            if (!refreshOptions.suppressErrorToast) {
                showAddressToast(`Address load failed - ${error.message}`, 'error');
            }
            return [];
        } finally {
            setLoading(false);
            applyActionState();
        }
    };

    const selectAddressRow = (rowElement, payload) => {
        if (!rowElement || !payload) return;
        if (state.mode === 'create' || state.mode === 'update') return;

        clearTableSelection();
        rowElement.classList.add('is-selected');
        applyRowPayload(payload);

        state.selectedRecord = payload;
        state.mode = 'view';
        setFieldsEnabled(false);
        applyActionState();
    };

    const submitCurrentMode = async (mode) => {
        if (!['create', 'update', 'delete'].includes(mode)) {
            showAddressToast('Choose New, Alter, or Remove before submitting.', 'warning');
            return;
        }

        if ((mode === 'update' || mode === 'delete') && !state.selectedRecord) {
            showAddressToast('Select an address first.', 'warning');
            return;
        }

        const request = buildPayload();
        if (!request.ClientID && !request.RequestID) {
            showAddressToast('No client context is available for this address action.', 'warning');
            return;
        }

        const actionHandler = mode === 'create'
            ? window.ClientMaintenanceAddressService.create
            : (mode === 'update'
                ? window.ClientMaintenanceAddressService.update
                : window.ClientMaintenanceAddressService.delete);

        const actionLabel = mode === 'create' ? 'create' : (mode === 'update' ? 'update' : 'delete');

        setLoading(true);
        try {
            const response = await actionHandler(request);
            if (!isResponseSuccess(response)) {
                throw new Error(getResponseMessage(response, `Address ${actionLabel} failed.`));
            }

            showAddressToast(`Address ${actionLabel} completed`, 'success');
            state.mode = 'view';
            await refreshAddressTable(state.lastContext, { markInitialLoad: state.initialLoadApplied });
        } catch (error) {
            showAddressToast(`Address ${actionLabel} failed - ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    table?.addEventListener('click', (event) => {
        const row = event.target.closest('tr[data-index]');
        if (!row) return;

        const payload = row.dataset.payload ? JSON.parse(row.dataset.payload) : null;
        selectAddressRow(row, payload);
    });

    if (buttons.new) {
        buttons.new.addEventListener('click', () => {
            if (!canEditAddresses()) return;

            clearTableSelection();
            resetFormFields();
            state.selectedRecord = null;
            state.mode = 'create';
            setFieldsEnabled(true);
            applyActionState();
        });
    }

    if (buttons.alter) {
        buttons.alter.addEventListener('click', () => {
            if (!state.selectedRecord) {
                showAddressToast('Select an address first.', 'warning');
                return;
            }

            state.mode = 'update';
            setFieldsEnabled(true);
            applyActionState();
        });
    }

    if (buttons.clear) {
        buttons.clear.addEventListener('click', () => {
            resetViewState();
        });
    }

    if (buttons.remove) {
        buttons.remove.addEventListener('click', async () => {
            if (!state.selectedRecord) {
                showAddressToast('Select an address to remove.', 'warning');
                return;
            }

            const confirmed = await requestAddressConfirmation(
                'Confirm Remove',
                'Are you sure you want to remove this address?'
            );

            if (!confirmed) return;

            state.mode = 'delete';
            await submitCurrentMode('delete');
        });
    }

    if (buttons.update) {
        buttons.update.addEventListener('click', async () => {
            if (state.mode !== 'create' && state.mode !== 'update') {
                showAddressToast('Click New or Alter before updating an address.', 'warning');
                return;
            }

            await submitCurrentMode(state.mode);
        });
    }

    tabRoot._cmLoadData = (requestData, refreshOptions = {}) => refreshAddressTable(requestData, {
        markInitialLoad: !state.initialLoadApplied,
        ...refreshOptions
    });
    tabRoot._cmRefreshData = (requestData, refreshOptions = {}) => refreshAddressTable(requestData, {
        markInitialLoad: !state.initialLoadApplied,
        ...refreshOptions
    });
    tabRoot._cmMaybeAutoLoadAddress = (requestData) => {
        const context = resolveAddressContext(requestData, configuredModuleId);
        context.IsStandalone = state.isStandalone;

        if (state.initialLoadApplied || state.autoLoadInFlight || !shouldAutoLoadStandaloneAddress(context)) {
            return Promise.resolve([]);
        }

        state.autoLoadInFlight = true;
        return refreshAddressTable(context, {
            suppressErrorToast: true,
            markInitialLoad: true
        }).finally(() => {
            state.autoLoadInFlight = false;
        });
    };

    tabRoot._cmSetEditMode = () => {
        if (!canEditAddresses() && (state.mode === 'create' || state.mode === 'update')) {
            resetViewState();
            return;
        }

        setFieldsEnabled(state.mode === 'create' || state.mode === 'update');
        applyActionState();
    };

    const maintenanceCore = getAddressClientMaintenanceCore();
    if (!state.isStandalone && maintenanceCore?.registerTabLoadFunction) {
        maintenanceCore.registerTabLoadFunction('Address', (requestData) => refreshAddressTable(requestData));
    }

    setFieldsEnabled(false);
    applyActionState();
}

function bindStandaloneAddressBootstrap(tabRoot, moduleId, options = {}) {
    const standaloneRoot = Boolean(
        options?.isStandalone ??
        getAddressViewState().IsStandalone ??
        tabRoot.matches('[data-address-host="standalone"]') ??
        tabRoot.closest('[data-address-host="standalone"]')
    );

    if (!standaloneRoot) return;

    const initialContext = resolveAddressContext(null, moduleId);
    initialContext.IsStandalone = true;
    if (typeof tabRoot._cmMaybeAutoLoadAddress === 'function') {
        void tabRoot._cmMaybeAutoLoadAddress(initialContext);
    }

    if (tabRoot.dataset.cmAddressParentContextBound === 'true') {
        return;
    }

    tabRoot.dataset.cmAddressParentContextBound = 'true';
    window.addEventListener('message', (event) => {
        const data = event?.data;
        if (!data || typeof data !== 'object') return;
        if (data.type !== 'parentContext' && data.action !== 'parentContextLoaded') return;

        const parentData = data.data || {};
        const nextContext = resolveAddressContext({
            ModuleID: parentData.moduleId,
            ClientID: parentData.clientId,
            RequestID: parentData.requestId
        }, moduleId);

        nextContext.IsStandalone = true;
        if (typeof tabRoot._cmMaybeAutoLoadAddress === 'function') {
            void tabRoot._cmMaybeAutoLoadAddress(nextContext);
        }
    });
}

function autoInitializeStandaloneAddressView() {
    debugger;
    const standaloneRoot = document.querySelector('[data-address-host="standalone"]');
    if (!standaloneRoot) return;

    const viewState = getAddressViewState();
    window.initClientMaintenanceAddressTab(standaloneRoot, viewState.ModuleID || '', { isStandalone: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitializeStandaloneAddressView);
} else {
    autoInitializeStandaloneAddressView();
}
