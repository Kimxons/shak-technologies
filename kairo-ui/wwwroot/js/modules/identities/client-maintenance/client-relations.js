const CM_RELATIONS_BASE = 'Identities/ClientMaintenance/Relations';
const MODULEID_CLIENTRELATIONS = 1011;

function getRelationsAppCore() {
    const win = window;
    return win.AppCore ||
        (win.parent && win.parent !== win && win.parent.AppCore) ||
        (win.top && win.top !== win && win.top.AppCore) ||
        null;
}

function getRelationsClientMaintenanceCore() {
    const win = window;
    return win.ClientMaintenanceCore ||
        (win.parent && win.parent !== win && win.parent.ClientMaintenanceCore) ||
        (win.top && win.top !== win && win.top.ClientMaintenanceCore) ||
        null;
}

function getRelationsSidebarManager() {
    const win = window;
    try {
        return (win.parent && win.parent !== win && win.parent.SidebarManager) ||
            (win.top && win.top !== win && win.top.SidebarManager) ||
            null;
    } catch (_error) {
        return null;
    }
}

function getRelationsParentContext() {
    const maintenanceCore = getRelationsClientMaintenanceCore();
    if (maintenanceCore?.getParentContext) {
        return maintenanceCore.getParentContext();
    }

    const sidebarManager = getRelationsSidebarManager();
    if (sidebarManager?.getParentContext) {
        return sidebarManager.getParentContext();
    }

    return null;
}

function toRelationsString(value) {
    return value === undefined || value === null ? '' : String(value).trim();
}

function firstNonEmptyRelationsString(...values) {
    for (const value of values) {
        const normalized = toRelationsString(value);
        if (normalized) {
            return normalized;
        }
    }

    return '';
}

function resolveRelationsContext(requestData, fallbackModuleId) {
    const viewState = getRelationsViewState();
    const parentContext = getRelationsParentContext() || {};
    const maintenanceCore = getRelationsClientMaintenanceCore();

    const moduleId = firstNonEmptyRelationsString(
        requestData?.ModuleID,
        fallbackModuleId,
        maintenanceCore?.moduleId,
        parentContext.moduleId,
        viewState.ModuleID
    );

    const clientId = firstNonEmptyRelationsString(
        requestData?.ClientID,
        maintenanceCore?.getClientId?.(),
        maintenanceCore?.clientId,
        parentContext.clientId,
        viewState.ClientID
    );

    const requestId = firstNonEmptyRelationsString(
        requestData?.RequestID,
        maintenanceCore?.getRequestId?.(),
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

function shouldAutoLoadStandaloneRelations(context) {
    return Boolean(
        context?.IsStandalone &&
        (context?.ClientID || context?.RequestID)
    );
}

function invokeClientMaintenanceRelations(action, requestData) {
    const maintenanceCore = getRelationsClientMaintenanceCore();
    if (maintenanceCore?.invokeControllerMethod) {
        return maintenanceCore.invokeControllerMethod(CM_RELATIONS_BASE, action, 'POST', requestData || {});
    }

    const appCore = getRelationsAppCore();
    if (appCore?.invokeControllerByMethodAsync) {
        return appCore.invokeControllerByMethodAsync(`${CM_RELATIONS_BASE}/${action}`, 'POST', requestData || {});
    }

    return Promise.reject(new Error('Relations controller invocation is not available.'));
}

window.ClientMaintenanceRelationsService = {
    get: (requestData) => invokeClientMaintenanceRelations('get', requestData),
    create: (requestData) => invokeClientMaintenanceRelations('create', requestData),
    update: (requestData) => invokeClientMaintenanceRelations('update', requestData),
    delete: (requestData) => invokeClientMaintenanceRelations('delete', requestData)
};

function showRelationsToast(message, type = 'info') {
    const maintenanceCore = getRelationsClientMaintenanceCore();
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

async function requestRelationsConfirmation(title, message) {
    const appCore = getRelationsAppCore();
    if (appCore?.showConfirmation) {
        return Boolean(await appCore.showConfirmation(title, message));
    }

    return window.confirm(message);
}

function getRelationsViewState() {
    return window.ClientRelationsState || {};
}

function parseRelationsCandidate(candidate) {
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

function extractRelationsList(response) {
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
        const parsed = parseRelationsCandidate(candidate);
        if (Array.isArray(parsed)) {
            return parsed;
        }
    }

    return [];
}

function getRelationsResponseCode(response) {
    return toRelationsString(response?.ResponseCode ?? response?.responseCode);
}

function getRelationsResponseMessage(response, fallbackMessage) {
    return response?.ResponseMessage ??
        response?.responseMessage ??
        response?.Message ??
        response?.message ??
        response?.ErrorMessage ??
        response?.errorMessage ??
        fallbackMessage;
}

function isRelationsResponseSuccess(response) {
    const successFlag = response?.Success ?? response?.success;
    if (typeof successFlag === 'boolean') {
        return successFlag;
    }

    const responseCode = getRelationsResponseCode(response).toUpperCase();
    if (responseCode) {
        return responseCode === '000' || responseCode === '00' || responseCode === 'SUCCESS';
    }

    return true;
}

function isRelationsNoDataResponse(response) {
    const responseCode = getRelationsResponseCode(response).toUpperCase();
    const responseMessage = toRelationsString(getRelationsResponseMessage(response, ''));
    return responseCode === 'DBEX000020' || /do not exist/i.test(responseMessage);
}

function closeRelationsView() {
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
            parentWindowRef?.postMessage({ type: 'submoduleClose', source: 'ClientRelations' }, '*');
            handled = Boolean(parentWindowRef);
        } catch (_error) {
        }
    }

    try { parentWindowRef?.postMessage({ action: 'submoduleClosed', source: 'ClientRelations' }, '*'); } catch (_error) { }
    try { parentWindowRef?.postMessage({ type: 'accountMaintenanceChildClose', source: 'ClientRelations' }, '*'); } catch (_error) { }
    try { parentWindowRef?.postMessage({ type: 'CLOSE_DATAENTRY', source: 'ClientRelations' }, '*'); } catch (_error) { }

    if (!handled) {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.close();
        }
    }
}

function bindRelationsActionPanel(tabRoot) {
    if (!tabRoot) return;

    const actionScope =
        tabRoot.closest('.window') ||
        tabRoot.closest('[data-relations-host="standalone"]') ||
        tabRoot.parentElement ||
        tabRoot;

    if (!actionScope || actionScope.dataset.cmRelationsActionDelegated === 'true') return;
    actionScope.dataset.cmRelationsActionDelegated = 'true';

    const handleRefresh = async (event) => {
        event.preventDefault();
        if (typeof tabRoot._cmRefreshData === 'function') {
            await tabRoot._cmRefreshData();
        }
    };

    actionScope.addEventListener('click', async (event) => {
        const actionButton = event.target.closest('[data-action]');
        if (!actionButton || !actionScope.contains(actionButton)) return;

        const action = String(actionButton.getAttribute('data-action') || '').toLowerCase();
        if (action === 'refresh') {
            await handleRefresh(event);
            return;
        }

        if (action === 'close') {
            event.preventDefault();
            closeRelationsView();
        }
    });

    actionScope.addEventListener('kairo:titlebar:refresh', handleRefresh);
    actionScope.addEventListener('kairo:titlebar:close', (event) => {
        event.preventDefault();
        closeRelationsView();
    });
}

window.initClientMaintenanceRelationsTab = window.initClientMaintenanceRelations = function (tabRoot, moduleId, options = {}) {
    if (!tabRoot || tabRoot.dataset.cmRelationsInitialized === 'true') return;
    tabRoot.dataset.cmRelationsInitialized = 'true';

    const configuredModuleId = toRelationsString(moduleId || options?.moduleId || getRelationsViewState().ModuleID || MODULEID_CLIENTRELATIONS);

    bindRelationsCrudStandalone(tabRoot, configuredModuleId, options);
    bindRelationsActionPanel(tabRoot);
    initRelationsSearchModal(tabRoot, configuredModuleId);
    bindStandaloneRelationsBootstrap(tabRoot, configuredModuleId, options);
};

function bindRelationsCrudStandalone(tabRoot, moduleId, options = {}) {
    if (!tabRoot) return;

    const configuredModuleId = toRelationsString(moduleId || options?.moduleId || getRelationsViewState().ModuleID);
    const initialContext = resolveRelationsContext(null, configuredModuleId);
    const standaloneHost = tabRoot.matches('[data-relations-host="standalone"]') || Boolean(tabRoot.closest('[data-relations-host="standalone"]'));
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

    const form = tabRoot.querySelector('[data-relations-form]') || tabRoot;
    const table = tabRoot.querySelector('[data-table="relations"]');
    const tbody = table?.querySelector('tbody') || tabRoot.querySelector('#tbl_clientRelationsBody');
    const loadingOverlay = tabRoot.querySelector('#loadingOverlay') || document.getElementById('loadingOverlay');
    const buttons = {
        new: tabRoot.querySelector('[data-relation-action="new"]'),
        alter: tabRoot.querySelector('[data-relation-action="alter"]'),
        remove: tabRoot.querySelector('[data-relation-action="remove"]'),
        update: tabRoot.querySelector('[data-relation-action="update"]'),
        clear: tabRoot.querySelector('[data-relation-action="clear"]')
    };

    const canEditRelations = () => state.isStandalone;

    const setLoading = (show) => {
        if (loadingOverlay) {
            loadingOverlay.hidden = !show;
        }
    };

    const setFieldsEnabled = (enabled) => {
        const nextEnabled = Boolean(enabled) && canEditRelations();
        form.querySelectorAll('[data-relation-field]').forEach((field) => {
            field.disabled = !nextEnabled;

            if (field.matches('input:not([type="checkbox"]), textarea')) {
                field.readOnly = !nextEnabled;
            }
        });

        const lookupBtn = form.querySelector('[data-relation-action="lookup"]');
        if (lookupBtn) {
            lookupBtn.disabled = !nextEnabled;
        }
    };

    const clearTableSelection = () => {
        table?.querySelectorAll('tr[data-index]').forEach((row) => {
            row.classList.remove('is-selected');
        });
    };

    const resetFormFields = () => {
        form.querySelectorAll('[data-relation-field]').forEach((field) => {
            if (field.type === 'checkbox') {
                field.checked = false;
                return;
            }

            field.value = '';
        });

        const clientNameField = form.querySelector('#txt_relationClientName');
        if (clientNameField) {
            clientNameField.value = '';
        }
    };

    const applyActionState = () => {
        const editable = canEditRelations();
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

    const normalizeRelationRows = (rows) => (rows || []).map((row) => {
        const recordId = row.ClientToRelationID ?? row.ID ?? null;
        return {
            ID: row.ID ?? recordId,
            ClientToRelationID: recordId,
            RelatedClientID: row.RelatedClientID ?? '',
            RelationID: row.RelationID ?? '',
            RelationTypeID: row.RelationTypeID ?? row.RelationType ?? '',
            IdentificationTypeID: row.IdentificationTypeID ?? '',
            IdentificationNo: row.IdentificationNo ?? row.IdentificationNumber ?? '',
            RelationRefNo: row.RelationRefNo ?? 1,
            SharePercent: row.SharePercent ?? '',
            Name: row.Name ?? '',
            TitleID: row.TitleID ?? '',
            GenderID: row.GenderID ?? '',
            FirstName: row.FirstName ?? '',
            MiddleName: row.MiddleName ?? '',
            LastName: row.LastName ?? '',
            Mobile: row.Mobile ?? row.MobileNo ?? '',
            UpdateCount: row.UpdateCount ?? null
        };
    });

    const renderRelationsTable = (rows) => {
        state.rows = Array.isArray(rows) ? rows : [];
        if (!tbody) return;

        tbody.innerHTML = '';

        state.rows.forEach((entry, index) => {
            const tr = document.createElement('tr');
            tr.dataset.index = String(index);
            tr.dataset.payload = JSON.stringify(entry);

            const relationLabel = getSelectLabel('[data-relation-field="RelationID"]', entry.RelationID) || entry.RelationID || '';
            const name = entry.Name || [entry.FirstName, entry.MiddleName, entry.LastName].filter(Boolean).join(' ') || '';
            const idLabel = entry.IdentificationNo || '';

            tr.innerHTML = `
                <td class="ps-2">${name}</td>
                <td>${relationLabel}</td>
                <td>${idLabel}</td>
                <td>${entry.SharePercent ?? ''}</td>
                <td>${entry.Mobile ?? ''}</td>
            `;

            tbody.appendChild(tr);
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
        form.querySelectorAll('[data-relation-field]').forEach((field) => {
            const key = field.dataset.relationField;
            if (!key) return;
            payload[key] = readFieldValue(field);
        });

        if (state.selectedRecord) {
            const selectedId = state.selectedRecord.ID ?? state.selectedRecord.ClientToRelationID;
            const relationId = state.selectedRecord.ClientToRelationID ?? state.selectedRecord.ID;

            if (selectedId !== null && selectedId !== undefined && selectedId !== '') {
                payload.ID = selectedId;
            }

            if (relationId !== null && relationId !== undefined && relationId !== '') {
                payload.ClientToRelationID = relationId;
            }

            if (state.selectedRecord.UpdateCount !== null && state.selectedRecord.UpdateCount !== undefined && state.selectedRecord.UpdateCount !== '') {
                payload.UpdateCount = state.selectedRecord.UpdateCount;
            }
        }

        const context = resolveRelationsContext(state.lastContext, configuredModuleId);
        context.IsStandalone = state.isStandalone;
        state.lastContext = { ...state.lastContext, ...context };

        const recordId = state.selectedRecord?.ClientToRelationID ?? state.selectedRecord?.ID ?? null;

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

        form.querySelectorAll('[data-relation-field]').forEach((field) => {
            const key = field.dataset.relationField;
            if (!key) return;
            const value = payload[key];

            if (field.type === 'checkbox') {
                field.checked = Boolean(value);
            } else {
                field.value = value ?? '';
            }
        });

        const clientNameField = form.querySelector('#txt_relationClientName');
        if (clientNameField) {
            clientNameField.value = payload.Name || [payload.FirstName, payload.MiddleName, payload.LastName].filter(Boolean).join(' ');
        }
    };

    const isDuplicateRelation = (relatedClientId) => {
        if (!relatedClientId) return false;

        const candidate = toRelationsString(relatedClientId);
        const currentId = state.selectedRecord?.ClientToRelationID ?? state.selectedRecord?.ID;

        for (const row of state.rows) {
            const rowId = row.ClientToRelationID ?? row.ID;
            if (currentId !== null && currentId !== undefined && currentId !== '' && String(rowId) === String(currentId)) {
                continue;
            }

            if (toRelationsString(row.RelatedClientID) === candidate) {
                return true;
            }
        }

        return false;
    };

    const calculateTotalShare = (excludeCurrentEdit = false) => {
        const currentId = state.selectedRecord?.ClientToRelationID ?? state.selectedRecord?.ID;
        return state.rows.reduce((sum, row) => {
            const rowId = row.ClientToRelationID ?? row.ID;
            if (
                excludeCurrentEdit &&
                currentId !== null &&
                currentId !== undefined &&
                currentId !== '' &&
                String(rowId) === String(currentId)
            ) {
                return sum;
            }

            const share = parseFloat(row.SharePercent) || 0;
            return sum + share;
        }, 0);
    };

    const refreshRelationsTable = async (requestData, refreshOptions = {}) => {
        const context = resolveRelationsContext(requestData, configuredModuleId);
        context.IsStandalone = state.isStandalone;
        state.lastContext = { ...state.lastContext, ...context };

        resetViewState();

        if (!context.ClientID && !context.RequestID) {
            renderRelationsTable([]);
            if (refreshOptions.markInitialLoad) {
                state.initialLoadApplied = true;
            }
            return [];
        }

        setLoading(true);

        try {
            const response = await window.ClientMaintenanceRelationsService.get({
                ModuleID: context.ModuleID,
                ClientID: context.ClientID,
                RequestID: context.RequestID,
                ApplicationID: context.ApplicationID || null
            });

            if (!isRelationsResponseSuccess(response) && !isRelationsNoDataResponse(response)) {
                throw new Error(getRelationsResponseMessage(response, 'Unable to load relation details.'));
            }

            const rows = isRelationsNoDataResponse(response) ? [] : normalizeRelationRows(extractRelationsList(response));
            renderRelationsTable(rows);

            const isInitialNoData =
                (isRelationsNoDataResponse(response) || rows.length === 0) &&
                Boolean(refreshOptions.markInitialLoad) &&
                !state.initialLoadApplied &&
                !refreshOptions.suppressNoDataInfoToast;

            if (isInitialNoData) {
                showRelationsToast('No client relation details were found for the selected client.', 'info');
            }

            return rows;
        } catch (error) {
            renderRelationsTable([]);
            if (!refreshOptions.suppressErrorToast) {
                showRelationsToast(`Relations load failed - ${error.message}`, 'error');
            }
            return [];
        } finally {
            setLoading(false);
            applyActionState();
            // Mark initial load as applied regardless of success/failure to prevent retry loops
            if (refreshOptions.markInitialLoad) {
                state.initialLoadApplied = true;
            }
        }
    };

    const selectRelationsRow = (rowElement, payload) => {
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
            showRelationsToast('Choose New, Alter, or Remove before submitting.', 'warning');
            return;
        }

        if ((mode === 'update' || mode === 'delete') && !state.selectedRecord) {
            showRelationsToast('Select a relation first.', 'warning');
            return;
        }

        const request = buildPayload();
        if (!request.ClientID && !request.RequestID) {
            showRelationsToast('No client context is available for this relation action.', 'warning');
            return;
        }

        const relatedClientId = toRelationsString(request?.Payload?.RelatedClientID);
        const sharePercent = parseFloat(request?.Payload?.SharePercent) || 0;

        if ((mode === 'create' || mode === 'update') && relatedClientId && isDuplicateRelation(relatedClientId)) {
            showRelationsToast(`Relation with Client ID "${relatedClientId}" already exists.`, 'warning');
            return;
        }

        if (mode === 'create' || mode === 'update') {
            const currentTotal = calculateTotalShare(mode === 'update');
            const newTotal = currentTotal + sharePercent;
            if (newTotal > 100) {
                showRelationsToast(
                    `Total share percentage cannot exceed 100%. Current total: ${currentTotal.toFixed(2)}%, Attempting to add: ${sharePercent.toFixed(2)}%`,
                    'warning'
                );
                return;
            }
        }

        const actionHandler = mode === 'create'
            ? window.ClientMaintenanceRelationsService.create
            : (mode === 'update'
                ? window.ClientMaintenanceRelationsService.update
                : window.ClientMaintenanceRelationsService.delete);

        const actionLabel = mode === 'create' ? 'create' : (mode === 'update' ? 'update' : 'delete');

        setLoading(true);
        try {
            const response = await actionHandler(request);
            if (!isRelationsResponseSuccess(response)) {
                throw new Error(getRelationsResponseMessage(response, `Relations ${actionLabel} failed.`));
            }

            showRelationsToast(`Relations ${actionLabel} completed`, 'success');
            state.mode = 'view';
            await refreshRelationsTable(state.lastContext, { markInitialLoad: state.initialLoadApplied });
        } catch (error) {
            showRelationsToast(`Relations ${actionLabel} failed - ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    table?.addEventListener('click', (event) => {
        const row = event.target.closest('tr[data-index]');
        if (!row) return;

        const payload = row.dataset.payload ? JSON.parse(row.dataset.payload) : null;
        selectRelationsRow(row, payload);
    });

    if (buttons.new) {
        buttons.new.addEventListener('click', () => {
            if (!canEditRelations()) return;

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
                showRelationsToast('Select a relation first.', 'warning');
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
                showRelationsToast('Select a relation to remove.', 'warning');
                return;
            }

            const confirmed = await requestRelationsConfirmation(
                'Confirm Remove',
                'Are you sure you want to remove this relation?'
            );
            if (!confirmed) return;

            state.mode = 'delete';
            await submitCurrentMode('delete');
        });
    }

    if (buttons.update) {
        buttons.update.addEventListener('click', async () => {
            if (state.mode !== 'create' && state.mode !== 'update') {
                showRelationsToast('Click New or Alter before updating a relation.', 'warning');
                return;
            }

            await submitCurrentMode(state.mode);
        });
    }

    tabRoot._cmLoadData = (requestData, refreshOptions = {}) => refreshRelationsTable(requestData, {
        markInitialLoad: !state.initialLoadApplied,
        ...refreshOptions
    });
    tabRoot._cmRefreshData = (requestData, refreshOptions = {}) => refreshRelationsTable(requestData, {
        markInitialLoad: !state.initialLoadApplied,
        ...refreshOptions
    });
    tabRoot._cmMaybeAutoLoadRelations = (requestData) => {
        const context = resolveRelationsContext(requestData, configuredModuleId);
        context.IsStandalone = state.isStandalone;

        if (state.initialLoadApplied || state.autoLoadInFlight || !shouldAutoLoadStandaloneRelations(context)) {
            return Promise.resolve([]);
        }

        state.autoLoadInFlight = true;
        return refreshRelationsTable(context, {
            suppressErrorToast: true,
            markInitialLoad: true
        }).finally(() => {
            state.autoLoadInFlight = false;
        });
    };

    tabRoot._cmSetEditMode = () => {
        if (!canEditRelations() && (state.mode === 'create' || state.mode === 'update')) {
            resetViewState();
            return;
        }

        setFieldsEnabled(state.mode === 'create' || state.mode === 'update');
        applyActionState();
    };

    const maintenanceCore = getRelationsClientMaintenanceCore();
    if (!state.isStandalone && maintenanceCore?.registerTabLoadFunction) {
        maintenanceCore.registerTabLoadFunction('Relations', (requestData) => refreshRelationsTable(requestData));
    }

    setFieldsEnabled(false);
    applyActionState();
}

function bindStandaloneRelationsBootstrap(tabRoot, moduleId, options = {}) {
    const standaloneRoot = Boolean(
        options?.isStandalone ??
        getRelationsViewState().IsStandalone ??
        tabRoot.matches('[data-relations-host="standalone"]') ??
        tabRoot.closest('[data-relations-host="standalone"]')
    );

    if (!standaloneRoot) return;

    const initialContext = resolveRelationsContext(null, moduleId);
    initialContext.IsStandalone = true;
    if (typeof tabRoot._cmMaybeAutoLoadRelations === 'function') {
        void tabRoot._cmMaybeAutoLoadRelations(initialContext);
    }

    if (tabRoot.dataset.cmRelationsParentContextBound === 'true') {
        return;
    }

    tabRoot.dataset.cmRelationsParentContextBound = 'true';
    window.addEventListener('message', (event) => {
        const data = event?.data;
        if (!data || typeof data !== 'object') return;
        if (data.type !== 'parentContext' && data.action !== 'parentContextLoaded') return;

        const parentData = data.data || {};
        const nextContext = resolveRelationsContext({
            ModuleID: parentData.moduleId,
            ClientID: parentData.clientId,
            RequestID: parentData.requestId
        }, moduleId);

        nextContext.IsStandalone = true;
        if (typeof tabRoot._cmMaybeAutoLoadRelations === 'function') {
            void tabRoot._cmMaybeAutoLoadRelations(nextContext);
        }
    });
}

async function hydrateRelationFormFromRelatedClientId(tabRoot, relatedClientId) {
    if (!relatedClientId) return;
    
    try {
        const maintenanceCore = getRelationsClientMaintenanceCore();
        if (typeof maintenanceCore?.invokeControllerMethod !== 'function') return;

        const response = await maintenanceCore.invokeControllerMethod(
            'Identities/ClientMaintenance/ClientIndividual',
            'get',
            'POST',
            {
                ModuleID: maintenanceCore.moduleId || '',
                ClientID: relatedClientId
            }
        );
        
        if (!response?.Success && !response?.success) return;
        
        const clientData = response?.Data || response?.data || response?.Payload || {};
        
        const firstNameField = tabRoot.querySelector('[data-relation-field="FirstName"]');
        const middleNameField = tabRoot.querySelector('[data-relation-field="MiddleName"]');
        const lastNameField = tabRoot.querySelector('[data-relation-field="LastName"]');
        const genderField = tabRoot.querySelector('[data-relation-field="GenderID"]');
        const clientNameField = tabRoot.querySelector('#txt_relationClientName');
        
        if (firstNameField && clientData.FirstName) firstNameField.value = clientData.FirstName;
        if (middleNameField && clientData.MiddleName) middleNameField.value = clientData.MiddleName;
        if (lastNameField && clientData.LastName) lastNameField.value = clientData.LastName;
        if (genderField && clientData.GenderID) genderField.value = clientData.GenderID;
        
        if (clientNameField) {
            const name = [clientData.FirstName, clientData.MiddleName, clientData.LastName]
                .filter(Boolean).join(' ') || clientData.Name || '';
            clientNameField.value = name;
        }
    } catch (error) {
        console.warn('[Relations] Failed to hydrate from related client ID:', error);
    }
}

function initRelationsSearchModal(tabRoot, moduleId) {
    if (!tabRoot) return;
    
    const searchBtn = tabRoot.querySelector('[data-relation-action="lookup"]');
    if (!searchBtn) return;

    const appCore = getRelationsAppCore();
    if (!appCore) {
        console.warn('[Relations] AppCore not available for SearchModal');
        return;
    }
    
    let searchModal = window._relationsSearchModal;
    if (!searchModal && window.SearchModal) {
        searchModal = new window.SearchModal(appCore);
        window._relationsSearchModal = searchModal;
    }
    
    if (!searchModal) {
        console.warn('[Relations] SearchModal not available');
        return;
    }
    
    const openSearchModal = () => {
        const currentValue = tabRoot.querySelector('[data-relation-field="RelatedClientID"]')?.value || '';
        
        searchModal.open({
            title: 'Find Related Client',
            tableID: 'ClientID',
            moduleID: moduleId,
            searchFields: [
                { name: 'ClientID', label: 'Client ID', column: 'ClientID', value: currentValue },
                { name: 'Name', label: 'Client Name', column: 'Name' }
            ],
            autoSearch: false,
            onSelect: async (record) => {
                const clientIdField = tabRoot.querySelector('[data-relation-field="RelatedClientID"]');
                if (clientIdField) {
                    clientIdField.value = record.ClientID || '';
                }

                const clientNameField = tabRoot.querySelector('#txt_relationClientName');
                if (clientNameField) {
                    clientNameField.value = record.Name || '';
                }
                
                const firstNameField = tabRoot.querySelector('[data-relation-field="FirstName"]');
                const middleNameField = tabRoot.querySelector('[data-relation-field="MiddleName"]');
                const lastNameField = tabRoot.querySelector('[data-relation-field="LastName"]');
                const genderField = tabRoot.querySelector('[data-relation-field="GenderID"]');
                
                if (firstNameField) firstNameField.value = record.FirstName || '';
                if (middleNameField) middleNameField.value = record.MiddleName || '';
                if (lastNameField) lastNameField.value = record.LastName || '';
                if (genderField) genderField.value = record.GenderID || '';

                const selectedId = record.ClientID || '';
                if (selectedId) {
                    await hydrateRelationFormFromRelatedClientId(tabRoot, selectedId);
                }
            }
        });
    };
    
    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openSearchModal();
    });
    
    const clientIdField = tabRoot.querySelector('[data-relation-field="RelatedClientID"]');
    if (clientIdField) {
        clientIdField.addEventListener('blur', async (e) => {
            const value = e.target.value?.trim();
            if (value) {
                await hydrateRelationFormFromRelatedClientId(tabRoot, value);
            }
        });
        
        clientIdField.addEventListener('keydown', (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                openSearchModal();
            }
        });
    }
}

function autoInitializeStandaloneRelationsView() {
    const standaloneRoot = document.querySelector('[data-relations-host="standalone"]');
    if (!standaloneRoot) return;

    const viewState = getRelationsViewState();
    window.initClientMaintenanceRelations(standaloneRoot, viewState.ModuleID || '', { isStandalone: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitializeStandaloneRelationsView);
} else {
    autoInitializeStandaloneRelationsView();
}
