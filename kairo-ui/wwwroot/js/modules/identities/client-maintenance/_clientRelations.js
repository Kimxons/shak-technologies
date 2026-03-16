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

function resolveRelationsContext(requestData, fallbackModuleId) {
    const parentContext = getRelationsParentContext() || {};
    const maintenanceCore = getRelationsClientMaintenanceCore();

    const moduleId = toRelationsString(
        requestData?.ModuleID ??
        fallbackModuleId ??
        maintenanceCore?.moduleId ??
        parentContext.moduleId
    );

    const clientId = toRelationsString(
        requestData?.ClientID ??
        maintenanceCore?.getClientId?.() ??
        maintenanceCore?.clientId ??
        parentContext.clientId
    );

    const requestId = toRelationsString(
        requestData?.RequestID ??
        maintenanceCore?.getRequestId?.() ??
        maintenanceCore?.requestId ??
        parentContext.requestId
    );

    return {
        ModuleID: moduleId,
        ClientID: clientId,
        RequestID: requestId
    };
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

window.initClientMaintenanceRelationsTab = window.initClientMaintenanceRelations = function (tabRoot, moduleId) {
    if (!tabRoot || tabRoot.dataset.cmRelationsInitialized === 'true') return;
    tabRoot.dataset.cmRelationsInitialized = 'true';

    const state = {
        ModuleID: moduleId,
        ClientID: '',
        RequestID: '',
        isEditMode: false
    };

    const context = resolveRelationsContext({}, moduleId);
    if (context.ClientID) state.ClientID = context.ClientID;
    if (context.RequestID) state.RequestID = context.RequestID;

    bindRelationsActionPanel(tabRoot);
    bindRelationsCrudStandalone(tabRoot, moduleId);
    initRelationsSearchModal(tabRoot, moduleId);

    // Initialize DOB date picker
    const dobInput = tabRoot.querySelector('#dt_relationDob');
    if (dobInput && window.flatpickr) {
        const monthMap = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
        const parseDOBDate = (dateStr) => {
            if (!dateStr) return null;
            const textMonthRegex = /^(\d{1,2})[-\/\s.,]+([a-z]{3,}?)[-\/\s.,]+(\d{4})$/i;
            let match = dateStr.match(textMonthRegex);
            if (match) {
                const day = parseInt(match[1], 10);
                const monthStr = match[2].toLowerCase().substring(0, 3);
                const month = monthMap[monthStr];
                const year = parseInt(match[3], 10);
                if (!isNaN(day) && month !== undefined && !isNaN(year)) return new Date(year, month, day);
            }
            try {
                const nativeDate = new Date(dateStr);
                if (!isNaN(nativeDate.getTime())) return nativeDate;
            } catch (_) { }
            return null;
        };
        const formatDOBDate = (date) => {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const day = String(date.getDate()).padStart(2, '0');
            return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
        };
        window.flatpickr(dobInput, {
            dateFormat: 'd-M-Y',
            mode: 'single',
            clickOpens: true,
            allowInput: true,
            parseDate: parseDOBDate,
            formatDate: formatDOBDate,
            maxDate: new Date(),
            onReady: function (selectedDates, dateStr, instance) {
                if (dobInput.disabled || dobInput.readOnly) instance.close();
            }
        });
    }

    tabRoot._cmRefreshData = async () => {
        await refreshRelationsTableStandalone(tabRoot, state);
    };
};

function bindRelationsCrudStandalone(tabRoot, moduleId) {
    if (!tabRoot) return;

    const state = {
        enabled: false,
        editing: null,
        mode: 'view',
        rows: []
    };

    const form = tabRoot.querySelector('[data-relations-form]') || tabRoot;
    const table = tabRoot.querySelector('[data-table="relations"]');

    const setMode = (mode) => {
        state.mode = mode || 'view';
    };

    const setEntryActionButtons = (enabled) => {
        const updateBtn = tabRoot.querySelector('[data-relation-action="update"]');
        const clearBtn = tabRoot.querySelector('[data-relation-action="clear"]');
        if (updateBtn) updateBtn.disabled = !enabled;
        if (clearBtn) clearBtn.disabled = !enabled;
    };

    const setFieldsEnabled = (enabled) => {
        state.enabled = enabled;
        form.querySelectorAll('[data-relation-field]').forEach((field) => {
            field.disabled = !enabled;
        });
        const lookupBtn = form.querySelector('[data-relation-action="lookup"]');
        if (lookupBtn) lookupBtn.disabled = !enabled;
        setEntryActionButtons(enabled);
    };

    const extractList = (response) => {
        if (!response) return [];
        const candidates = [
            response?.Details,
            response?.data?.Details,
            response?.data?.[0]?.Details,
            response?.Details?.[0]?.Details,
            response?.data,
            response
        ];
        const list = candidates.find((item) => Array.isArray(item)) || [];
        return Array.isArray(list) ? list : [];
    };

    const normalizeRelationRows = (rows) => (rows || []).map((row) => ({
        ID: row.ID ?? row.ClientToRelationID ?? null,
        ClientToRelationID: row.ClientToRelationID ?? row.ID ?? null,
        RelatedClientID: row.RelatedClientID ?? '',
        RelationID: row.RelationID ?? '',
        RelationTypeID: row.RelationTypeID ?? row.RelationType ?? '',
        IdentificationTypeID: row.IdentificationTypeID ?? '',
        IdentificationNumber: row.IdentificationNumber ?? row.IdentificationNo ?? '',
        IdentificationNo: row.IdentificationNo ?? row.IdentificationNumber ?? '',
        DateOfBirth: row.DateOfBirth ?? row.DOB ?? '',
        RelationRefNo: row.RelationRefNo ?? 1,
        SharePercent: row.SharePercent ?? '',
        Name: row.Name ?? '',
        TitleID: row.TitleID ?? '',
        GenderID: row.GenderID ?? '',
        FirstName: row.FirstName ?? '',
        MiddleName: row.MiddleName ?? '',
        LastName: row.LastName ?? '',
        Mobile: row.Mobile ?? row.MobileNo ?? ''
    }));

    const getSelectLabel = (selector, value) => {
        const el = form.querySelector(selector);
        if (!el || value === undefined || value === null || value === '') return '';
        const option = el.querySelector(`option[value="${value}"]`);
        return option ? option.textContent.trim() : '';
    };

    const renderRelationsTable = (rows) => {
        state.rows = Array.isArray(rows) ? rows : [];
        const tbody = table?.querySelector('tbody') || tabRoot.querySelector('#tbl_clientRelationsBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        state.rows.forEach((entry, index) => {
            const tr = document.createElement('tr');
            tr.dataset.index = String(index);
            tr.dataset.payload = JSON.stringify(entry);

            const relationLabel = getSelectLabel('[data-relation-field="RelationID"]', entry.RelationID) || entry.RelationID || '';
            const name = entry.Name || [entry.FirstName, entry.MiddleName, entry.LastName].filter(Boolean).join(' ') || '';
            const idLabel = entry.IdentificationNumber || entry.IdentificationNo || '';

            tr.innerHTML = `
                <td class="ps-2">${name}</td>
                <td>${relationLabel}</td>
                <td>${idLabel}</td>
                <td>${entry.SharePercent ?? ''}</td>
                <td>${entry.Mobile ?? ''}</td>
                <td>${entry.DateOfBirth ?? ''}</td>
            `;
            tbody.appendChild(tr);
        });
    };

    const refreshRelationsTable = async (requestData) => {
        const clientId = requestData?.ClientID || getRelationsClientMaintenanceCore()?.clientId || '';
        const requestIdVal = requestData?.RequestID || getRelationsClientMaintenanceCore()?.requestId || '';

        if (!clientId && !requestIdVal) {
            renderRelationsTable([]);
            return;
        }
        try {
            const response = await window.ClientMaintenanceRelationsService.get({
                ModuleID: moduleId || getRelationsClientMaintenanceCore().moduleId || '',
                ClientID: clientId,
                RequestID: requestIdVal
            });
            const rows = normalizeRelationRows(extractList(response));
            renderRelationsTable(rows);
            setMode('view');
        } catch (error) {
            showRelationsToast(`Relations load failed - ${error.message}`, 'error');
        }
    };

    const resetForm = () => {
        form.querySelectorAll('[data-relation-field]').forEach((field) => {
            if (field.type === 'checkbox') {
                field.checked = false;
            } else if (field._flatpickr) {
                field._flatpickr.clear();
            } else {
                field.value = '';
            }
        });
        const clientNameField = form.querySelector('#txt_relationClientName');
        if (clientNameField) clientNameField.value = '';
        state.editing = null;
        setMode('view');
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

        const identificationNumber = toRelationsString(payload.IdentificationNumber ?? payload.IdentificationNo);
        if (identificationNumber) {
            payload.IdentificationNumber = identificationNumber;
            payload.IdentificationNo = identificationNumber;
        }

        if (state.editing) {
            payload.ID = state.editing.ID || state.editing.ClientToRelationID || null;
            payload.ClientToRelationID = state.editing.ClientToRelationID || state.editing.ID || null;
        }

        const context = resolveRelationsContext({}, moduleId);
        Payload.ModuleID = context.ModuleID;
        Payload.ClientID = context.ClientID;
        Payload.RequestID = context.RequestID;
        return Payload;
        //return {
        //    ModuleID: context.ModuleID,
        //    ClientID: context.ClientID,
        //    RequestID: context.RequestID,
        //    Payload: payload
        //};
    };

    const applyRowPayload = (payload) => {
        if (!payload) return;
        form.querySelectorAll('[data-relation-field]').forEach((field) => {
            const key = field.dataset.relationField;
            if (!key) return;
            const fallbackKey = key === 'IdentificationNumber'
                ? 'IdentificationNo'
                : (key === 'IdentificationNo' ? 'IdentificationNumber' : '');
            const value = payload[key] ?? (fallbackKey ? payload[fallbackKey] : undefined);
            if (field.type === 'checkbox') {
                field.checked = Boolean(value);
            } else if (key === 'DateOfBirth') {
                // Use flatpickr API if available, otherwise fall back to raw value
                if (field._flatpickr) {
                    field._flatpickr.setDate(value || '', false);
                } else {
                    field.value = value ?? '';
                }
            } else {
                field.value = value ?? '';
            }
        });
    };

    const isDuplicateRelation = (relatedClientId) => {
        if (!relatedClientId) return false;
        const tbody = table?.querySelector('tbody') || tabRoot.querySelector('#tbl_clientRelationsBody');
        if (!tbody) return false;

        const rows = tbody.querySelectorAll('tr[data-payload]');
        for (const row of rows) {
            const existingPayload = JSON.parse(row.dataset.payload || '{}');
            if (state.editing && existingPayload.ID === state.editing.ID) continue;
            if (existingPayload.RelatedClientID === relatedClientId) {
                return true;
            }
        }
        return false;
    };

    const calculateTotalShare = (excludeCurrentEdit = false) => {
        const tbody = table?.querySelector('tbody') || tabRoot.querySelector('#tbl_clientRelationsBody');
        if (!tbody) return 0;

        const rows = tbody.querySelectorAll('tr[data-payload]');
        let total = 0;
        for (const row of rows) {
            const existingPayload = JSON.parse(row.dataset.payload || '{}');
            if (excludeCurrentEdit && state.editing && existingPayload.ID === state.editing.ID) continue;
            const share = parseFloat(existingPayload.SharePercent) || 0;
            total += share;
        }
        return total;
    };

    setFieldsEnabled(false);
    tabRoot._cmLoadData = (requestData) => refreshRelationsTable(requestData);

    const hasRelationsRows = () => Array.isArray(state.rows) && state.rows.length > 0;

    tabRoot._cmHasWorkflowData = () => hasRelationsRows();
    tabRoot._cmHandleWorkflowStep = () => {
        if (state.mode === 'add' || state.mode === 'edit') {
            showRelationsToast('Relations: click Update to save the current relation before proceeding.', 'warning');
            return { handled: true, canNavigate: false };
        }

        if (!hasRelationsRows()) {
            showRelationsToast('Relations: add and save at least one relation before clicking Next.', 'warning');
            return { handled: true, canNavigate: false };
        }

        return {
            handled: true,
            canNavigate: true,
            markPersisted: true
        };
    };

    const newBtn = tabRoot.querySelector('[data-relation-action="new"]');
    if (newBtn) newBtn.disabled = false;

    table?.addEventListener('click', (event) => {
        const row = event.target.closest('tr[data-index]');
        if (!row) return;
        table.querySelectorAll('tr[data-index]').forEach((tr) => {
            tr.classList.toggle('is-selected', tr === row);
        });
        const payload = row.dataset.payload ? JSON.parse(row.dataset.payload) : null;
        if (payload) {
            applyRowPayload(payload);
        }
        state.editing = payload || { index: row.dataset.index };
        setMode('view');
        setFieldsEnabled(false);
        enableRelationsGridRowActions(tabRoot, true);
    });

    table?.addEventListener('dblclick', (event) => {
        const row = event.target.closest('tr[data-index]');
        if (!row) return;
        table.querySelectorAll('tr[data-index]').forEach((tr) => {
            tr.classList.toggle('is-selected', tr === row);
        });
        const payload = row.dataset.payload ? JSON.parse(row.dataset.payload) : null;
        if (payload) {
            applyRowPayload(payload);
        }
        state.editing = payload || { index: row.dataset.index };
        setMode('edit');
        setFieldsEnabled(true);
    });

    tabRoot.querySelectorAll('[data-relation-action]').forEach((button) => {
        button.addEventListener('click', async () => {
            const action = button.dataset.relationAction;
            if (!action) return;
            if (!['new', 'alter', 'clear', 'remove', 'update'].includes(action)) {
                return;
            }

            if (action === 'new') {
                resetForm();
                setFieldsEnabled(true);
                setMode('add');
                button.disabled = true;
                return;
            }

            if (action === 'alter') {
                if (!state.editing) {
                    showRelationsToast('Select a relation first.', 'warning');
                    return;
                }
                setFieldsEnabled(true);
                setMode('edit');
                return;
            }

            if (action === 'clear') {
                resetForm();
                setFieldsEnabled(false);
                enableRelationsGridRowActions(tabRoot, false);
                setMode('view');
                const newBtn = tabRoot.querySelector('[data-relation-action="new"]');
                if (newBtn) newBtn.disabled = false;
                return;
            }

            if (action === 'remove') {
                if (!state.editing) {
                    showRelationsToast('Select a relation to remove.', 'warning');
                    return;
                }

                const confirmed = await requestRelationsConfirmation(
                    'Confirm Remove',
                    'Are you sure you want to remove this relation?'
                );
                if (!confirmed) return;
                setMode('delete');
            }

            const request = buildPayload();
            const relatedClientId = request?.Payload?.RelatedClientID;
            const sharePercent = parseFloat(request?.Payload?.SharePercent) || 0;

            const mode = state.mode === 'view'
                ? (state.editing ? 'edit' : 'add')
                : state.mode;

            if ((mode === 'edit' || mode === 'delete') && !state.editing) {
                showRelationsToast('Select a relation first.', 'warning');
                return;
            }

            if ((mode === 'add' || mode === 'edit') && relatedClientId) {
                if (isDuplicateRelation(relatedClientId)) {
                    showRelationsToast(
                        `Relation with Client ID "${relatedClientId}" already exists.`,
                        'warning'
                    );
                    return;
                }
            }

            if (mode === 'add' || mode === 'edit') {
                const currentTotal = calculateTotalShare(mode === 'edit');
                const newTotal = currentTotal + sharePercent;

                if (newTotal > 100) {
                    showRelationsToast(
                        `Total share percentage cannot exceed 100%. Current total: ${currentTotal.toFixed(2)}%, Attempting to add: ${sharePercent.toFixed(2)}%`,
                        'warning'
                    );
                    return;
                }
            }

            const service = window.ClientMaintenanceRelationsService;
            const handler = mode === 'delete'
                ? service.delete
                : (mode === 'edit' ? service.update : service.create);
            const actionLabel = mode === 'delete' ? 'remove' : (mode === 'edit' ? 'update' : 'create');

            try {
                const response = await handler(request);
                const success = response?.Success ?? response?.success ?? true;
                if (!success) {
                    const error = response?.ErrorMessage || response?.errorMessage || 'Relations request failed';
                    showRelationsToast(error, 'error');
                    return;
                }

                showRelationsToast(`Relations ${actionLabel} completed`, 'success');
                resetForm();
                setFieldsEnabled(false);
                enableRelationsGridRowActions(tabRoot, false);
                setMode('view');
                const newBtn = tabRoot.querySelector('[data-relation-action="new"]');
                if (newBtn) newBtn.disabled = false;
                await refreshRelationsTable({
                    ModuleID: request.ModuleID,
                    ClientID: request.ClientID,
                    RequestID: request.RequestID
                });
            } catch (error) {
                showRelationsToast(`Relations ${actionLabel} failed - ${error.message}`, 'error');
            }
        });
    });
}

function enableRelationsGridRowActions(tabRoot, hasSelection) {
    if (!tabRoot) return;

    const alterBtn = tabRoot.querySelector('[data-relation-action="alter"]');
    const removeBtn = tabRoot.querySelector('[data-relation-action="remove"]');

    if (alterBtn) alterBtn.disabled = !hasSelection;
    if (removeBtn) removeBtn.disabled = !hasSelection;
}

async function hydrateRelationFormFromRelatedClientId(tabRoot, relatedClientId) {
    if (!relatedClientId) return;

    try {
        const maintenanceCore = getRelationsClientMaintenanceCore();
        if (typeof maintenanceCore?.invokeControllerMethod !== 'function') return;

        const response = await maintenanceCore.invokeControllerMethod(
            'Identities/ClientMaintenance/Personal/get',
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


        const identificationTypeField = tabRoot.querySelector('[data-relation-field="IdentificationTypeiD"]');
        const identificationNoField = tabRoot.querySelector('[data-relation-field="IdentificationNo"]');
        const dobField = tabRoot.querySelector('[data-relation-field="DateOfBirth"]');
        const mobileField = tabRoot.querySelector('[data-relation-field="Mobile"]');

        if (firstNameField && clientData.FirstName) firstNameField.value = clientData.FirstName;
        if (middleNameField && clientData.MiddleName) middleNameField.value = clientData.MiddleName;
        if (lastNameField && clientData.LastName) lastNameField.value = clientData.LastName;
        if (genderField && clientData.GenderID) genderField.value = clientData.GenderID;

        if (identificationTypeField && clientData.IdentificationTypeiD) identificationTypeField.value = clientData.IdentificationTypeiD;
        if (identificationNoField && clientData.IdentificationNo) identificationNoField.value = clientData.IdentificationNo;
        if (dobField && clientData.DateOfBirth) dobField.value = clientData.DateOfBirth;
        if (mobileField && clientData.Mobile) mobileField.value = clientData.Mobile;

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

    const clientNameField = tabRoot.querySelector('#txt_relationClientName');
    const lookupIdDescription = window.ClientMaintenanceCore?.lookupIdDescription;
    let relationLookupInFlight = false;

    const autoLoadRelatedClientNameFromId = async (relatedClientId) => {
        const typedClientId = String(relatedClientId || '').trim();
        if (!typedClientId) {
            if (clientNameField) clientNameField.value = '';
            return;
        }

        if (relationLookupInFlight || typeof lookupIdDescription !== 'function') {
            return;
        }

        relationLookupInFlight = true;
        try {
            const result = await lookupIdDescription({
                controlTypeId: 'ClientID',
                id: typedClientId,
                bankId: '00',
                typeId: '',
                advanceFilter: '',
                moduleId: String(moduleId || window.ClientMaintenanceCore?.moduleId || ''),
                descriptionFieldCandidates: ['Name', 'ClientName', 'FullName']
            });

            if (clientNameField) {
                clientNameField.value = result?.description || '';
            }
        } catch (error) {
            console.warn('[Relations] Failed to auto-load related client name from ID:', error);
        } finally {
            relationLookupInFlight = false;
        }
    };

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
                console.log(selectedId);
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
            const relatedTarget = e.relatedTarget;
            if (relatedTarget instanceof HTMLElement && relatedTarget.matches('[data-relation-action="lookup"]')) {
                return;
            }

            const value = e.target.value?.trim();
            if (!value) {
                if (clientNameField) clientNameField.value = '';
                return;
            }

            await autoLoadRelatedClientNameFromId(value);
            await hydrateRelationFormFromRelatedClientId(tabRoot, value);
        });

        clientIdField.addEventListener('keydown', (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                openSearchModal();
            }
        });
    }
}

async function refreshRelationsTableStandalone(tabRoot, state) {
    if (!tabRoot) return;
    const context = resolveRelationsContext({}, state.ModuleID);

    const requestData = {
        ModuleID: context.ModuleID,
        ClientID: context.ClientID,
        RequestID: context.RequestID
    };

    if (typeof tabRoot._cmLoadData === 'function') {
        await tabRoot._cmLoadData(requestData);
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    const moduleRoot = document.querySelector('[data-section="client-relations"]');
    const moduleId = document.getElementById('moduleIdRelations')?.value || MODULEID_CLIENTRELATIONS;
    const viewState = getRelationsViewState();

    if (moduleRoot && typeof window.initClientMaintenanceRelations === 'function') {
        window.initClientMaintenanceRelations(moduleRoot, moduleId);

        if (viewState.AutoLoad && viewState.ClientID) {
            setTimeout(() => {
                if (moduleRoot._cmLoadData) {
                    moduleRoot._cmLoadData({
                        ClientID: viewState.ClientID,
                        RequestID: viewState.RequestID,
                        ModuleID: moduleId
                    });
                }
            }, 100);
        }
    }
});
