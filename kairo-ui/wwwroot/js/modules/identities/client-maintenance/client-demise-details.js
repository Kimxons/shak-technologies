const CM_DEMISE_DETAILS_BASE = 'Identities/ClientMaintenance/DemiseDetails';

function getDemiseDetailsAppCore() {
    const win = window;
    return win.AppCore ||
        (win.parent && win.parent !== win && win.parent.AppCore) ||
        (win.top && win.top !== win && win.top.AppCore) ||
        null;
}

function getDemiseDetailsClientMaintenanceCore() {
    const win = window;
    return win.ClientMaintenanceCore ||
        (win.parent && win.parent !== win && win.parent.ClientMaintenanceCore) ||
        (win.top && win.top !== win && win.top.ClientMaintenanceCore) ||
        null;
}

function getDemiseDetailsSidebarManager() {
    const win = window;
    try {
        return (win.parent && win.parent !== win && win.parent.SidebarManager) ||
            (win.top && win.top !== win && win.top.SidebarManager) ||
            null;
    } catch (_error) {
        return null;
    }
}

function getDemiseDetailsParentContext() {
    const maintenanceCore = getDemiseDetailsClientMaintenanceCore();
    if (maintenanceCore?.getParentContext) {
        return maintenanceCore.getParentContext();
    }

    const sidebarManager = getDemiseDetailsSidebarManager();
    if (sidebarManager?.getParentContext) {
        return sidebarManager.getParentContext();
    }

    return null;
}

function toDemiseDetailsString(value) {
    return value === undefined || value === null ? '' : String(value).trim();
}

function firstNonEmptyDemiseDetailsString(...values) {
    for (const value of values) {
        const normalized = toDemiseDetailsString(value);
        if (normalized) {
            return normalized;
        }
    }

    return '';
}

function getDemiseDetailsViewState() {
    return window.ClientDemiseDetailsState || {};
}

function resolveDemiseDetailsContext(requestData, fallbackModuleId) {
    const viewState = getDemiseDetailsViewState();
    const parentContext = getDemiseDetailsParentContext() || {};
    const maintenanceCore = getDemiseDetailsClientMaintenanceCore();

    const moduleId = firstNonEmptyDemiseDetailsString(
        requestData?.ModuleID,
        fallbackModuleId,
        maintenanceCore?.moduleId,
        parentContext.moduleId,
        viewState.ModuleID
    );

    const clientId = firstNonEmptyDemiseDetailsString(
        requestData?.ClientID,
        maintenanceCore?.getClientId?.(),
        maintenanceCore?.clientId,
        parentContext.clientId,
        viewState.ClientID
    );

    const requestId = firstNonEmptyDemiseDetailsString(
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
        AutoLoad: Boolean(viewState.AutoLoad),
        IsStandalone: Boolean(viewState.IsStandalone)
    };
}

function shouldAutoLoadStandaloneDemiseDetails(context) {
    return Boolean(context?.IsStandalone && (context?.ClientID || context?.RequestID));
}

function invokeClientMaintenanceDemiseDetails(action, requestData) {
    const maintenanceCore = getDemiseDetailsClientMaintenanceCore();
    if (maintenanceCore?.invokeControllerMethod) {
        return maintenanceCore.invokeControllerMethod(CM_DEMISE_DETAILS_BASE, action, 'POST', requestData || {});
    }

    const appCore = getDemiseDetailsAppCore();
    if (appCore?.invokeControllerByMethodAsync) {
        return appCore.invokeControllerByMethodAsync(`${CM_DEMISE_DETAILS_BASE}/${action}`, 'POST', requestData || {});
    }

    return Promise.reject(new Error('Demise details controller invocation is not available.'));
}

window.ClientMaintenanceDemiseDetailsService = {
    get: (requestData) => invokeClientMaintenanceDemiseDetails('get', requestData),
    create: (requestData) => invokeClientMaintenanceDemiseDetails('create', requestData),
    update: (requestData) => invokeClientMaintenanceDemiseDetails('update', requestData),
    delete: (requestData) => invokeClientMaintenanceDemiseDetails('delete', requestData)
};

function showDemiseDetailsToast(message, type = 'info') {
    const maintenanceCore = getDemiseDetailsClientMaintenanceCore();
    if (maintenanceCore?.showToast) {
        maintenanceCore.showToast(message, type);
        return;
    }

    if (window.ToastManager) {
        const toastMethod = type === 'error'
            ? 'showError'
            : (type === 'warning' ? 'showWarning' : (type === 'success' ? 'showSuccess' : null));
        if (toastMethod && typeof window.ToastManager[toastMethod] === 'function') {
            window.ToastManager[toastMethod](message);
            return;
        }
    }

    if (window.NotificationService?.showToast) {
        window.NotificationService.showToast(message, type, 4000);
        return;
    }

    console.log(`[${type}] ${message}`);
}

async function requestDemiseDetailsConfirmation(title, message) {
    const appCore = getDemiseDetailsAppCore();
    if (appCore?.showConfirmation) {
        return Boolean(await appCore.showConfirmation(title, message));
    }

    if (window.DialogSystem?.confirm) {
        return Boolean(await window.DialogSystem.confirm({
            title,
            message,
            confirmText: 'Delete',
            cancelText: 'Cancel'
        }));
    }

    return window.confirm(message);
}

function getDemiseDetailsResponseCode(response) {
    return toDemiseDetailsString(response?.ResponseCode ?? response?.responseCode);
}

function getDemiseDetailsResponseMessage(response, fallbackMessage) {
    return response?.ResponseMessage ??
        response?.responseMessage ??
        response?.Message ??
        response?.message ??
        response?.ErrorMessage ??
        response?.errorMessage ??
        fallbackMessage;
}

function isDemiseDetailsResponseSuccess(response) {
    const successFlag = response?.Success ?? response?.success;
    if (typeof successFlag === 'boolean') {
        return successFlag;
    }

    const responseCode = getDemiseDetailsResponseCode(response).toUpperCase();
    if (responseCode) {
        return responseCode === '000' || responseCode === '00' || responseCode === 'SUCCESS';
    }

    return true;
}

function isDemiseDetailsNoDataResponse(response) {
    const responseCode = getDemiseDetailsResponseCode(response).toUpperCase();
    const responseMessage = toDemiseDetailsString(getDemiseDetailsResponseMessage(response, ''));
    return responseCode === 'DBEX000020' || /do not exist/i.test(responseMessage);
}

function extractDemiseDetailsList(response) {
    const candidates = [
        response?.Details,
        response?.details,
        response?.data?.Details,
        response?.data?.details,
        response?.Data,
        response?.data
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            return candidate;
        }
    }

    return [];
}

function closeDemiseDetailsView() {
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
            parentWindowRef?.postMessage({ type: 'submoduleClose', source: 'ClientDemiseDetails' }, '*');
            handled = Boolean(parentWindowRef);
        } catch (_error) {
        }
    }

    try { parentWindowRef?.postMessage({ action: 'submoduleClosed', source: 'ClientDemiseDetails' }, '*'); } catch (_error) { }
    try { parentWindowRef?.postMessage({ type: 'accountMaintenanceChildClose', source: 'ClientDemiseDetails' }, '*'); } catch (_error) { }
    try { parentWindowRef?.postMessage({ type: 'CLOSE_DATAENTRY', source: 'ClientDemiseDetails' }, '*'); } catch (_error) { }

    if (!handled) {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.close();
        }
    }
}

function bindDemiseDetailsActionPanel(moduleRoot) {
    if (!moduleRoot) return;

    const actionScope =
        moduleRoot.closest('.window') ||
        moduleRoot.closest('[data-cm-layout="client-demise-details"]') ||
        moduleRoot.parentElement ||
        moduleRoot;

    if (!actionScope || actionScope.dataset.cmDemiseDetailsActionDelegated === 'true') return;
    actionScope.dataset.cmDemiseDetailsActionDelegated = 'true';

    const handleRefresh = async (event) => {
        event.preventDefault();
        if (typeof moduleRoot._cmRefreshData === 'function') {
            await moduleRoot._cmRefreshData();
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
            closeDemiseDetailsView();
        }
    });

    actionScope.addEventListener('kairo:titlebar:refresh', handleRefresh);
    actionScope.addEventListener('kairo:titlebar:close', (event) => {
        event.preventDefault();
        closeDemiseDetailsView();
    });
}

window.initClientMaintenanceDemiseDetails = function (moduleRoot, moduleId) {
    if (!moduleRoot || moduleRoot.dataset.cmDemiseDetailsInitialized === 'true') return;
    moduleRoot.dataset.cmDemiseDetailsInitialized = 'true';

    const configuredModuleId = toDemiseDetailsString(moduleId || getDemiseDetailsViewState().ModuleID);
    const initialContext = resolveDemiseDetailsContext(null, configuredModuleId);
    const state = {
        details: [],
        selectedDetail: null,
        mode: 'view',
        lastContext: { ...initialContext },
        initialLoadApplied: false,
        autoLoadInFlight: false
    };

    const form = moduleRoot.querySelector('[data-demisedetails-form]');
    const table = moduleRoot.querySelector('[data-table="demise-details"]');
    const tbody = table?.querySelector('[data-demisedetails-body]');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const fileInput = document.getElementById('file_documentImage');
    const buttons = {
        new: moduleRoot.querySelector('[data-demisedetail-action="new"]'),
        alter: moduleRoot.querySelector('[data-demisedetail-action="alter"]'),
        remove: moduleRoot.querySelector('[data-demisedetail-action="remove"]'),
        update: moduleRoot.querySelector('[data-demisedetail-action="update"]'),
        clear: moduleRoot.querySelector('[data-demisedetail-action="clear"]'),
        browse: moduleRoot.querySelector('[data-demisedetail-action="browse-file"]')
    };

    const setLoading = (show) => {
        if (loadingOverlay) {
            loadingOverlay.hidden = !show;
        }
    };

    const setFieldsEnabled = (enabled) => {
        const nextEnabled = Boolean(enabled);
        form?.querySelectorAll('[data-demisedetail-field]').forEach((field) => {
            field.disabled = !nextEnabled;
            if (field.matches('input:not([type="checkbox"]), textarea')) {
                field.readOnly = !nextEnabled;
            }
        });

        const documentImageField = form?.querySelector('#txt_documentImage');
        if (documentImageField) {
            documentImageField.readOnly = true;
        }

        if (buttons.browse) {
            buttons.browse.disabled = !nextEnabled;
        }
    };

    const clearTableSelection = () => {
        table?.querySelectorAll('tr[data-index]').forEach((row) => row.classList.remove('table-active'));
    };

    const clearForm = () => {
        if (!form) return;
        form.reset();
        form.querySelector('#hdn_demiseDetailId').value = '';
        state.selectedDetail = null;
        clearTableSelection();
    };

    const populateForm = (detail) => {
        if (!form || !detail) return;

        form.querySelector('#hdn_demiseDetailId').value = detail.DemiseDetailID || detail.ID || '';
        form.querySelector('#txt_demiseDate').value = detail.DemiseDate ? formatDateForInput(detail.DemiseDate) : '';
        form.querySelector('#ddl_reasonId').value = detail.ReasonID || '';
        form.querySelector('#ddl_documentProofId').value = detail.DocumentProofID || '';
        form.querySelector('#txt_notificationDate').value = detail.NotificationDate ? formatDateForInput(detail.NotificationDate) : '';
        form.querySelector('#txt_documentImage').value = detail.DocumentImage || '';
        form.querySelector('#txa_remarks').value = detail.Remarks || '';
    };

    const applyActionState = () => {
        const hasSelection = Boolean(state.selectedDetail);
        const isCreateMode = state.mode === 'create';
        const isUpdateMode = state.mode === 'update';
        const isEditing = isCreateMode || isUpdateMode;

        if (buttons.new) buttons.new.disabled = hasSelection || isEditing;
        if (buttons.alter) buttons.alter.disabled = !hasSelection || isEditing;
        if (buttons.remove) buttons.remove.disabled = !hasSelection || isEditing;
        if (buttons.update) buttons.update.disabled = !isEditing;
        if (buttons.clear) buttons.clear.disabled = !isEditing;
    };

    const resetViewState = () => {
        clearForm();
        state.mode = 'view';
        setFieldsEnabled(false);
        applyActionState();
    };

    const normalizeDetailRows = (rows) => (rows || []).map((row) => {
        const recordId = row.DemiseDetailID ?? row.ID ?? null;
        return {
            ID: row.ID ?? recordId,
            DemiseDetailID: recordId,
            DemiseDate: row.DemiseDate ?? '',
            ReasonID: row.ReasonID ?? '',
            ReasonName: row.ReasonName ?? row.Reason ?? '',
            DocumentProofID: row.DocumentProofID ?? '',
            DocumentProofName: row.DocumentProofName ?? row.DocumentProof ?? '',
            NotificationDate: row.NotificationDate ?? '',
            DocumentImage: row.DocumentImage ?? '',
            Remarks: row.Remarks ?? '',
            UpdateCount: row.UpdateCount ?? null
        };
    });

    const renderTable = (details) => {
        state.details = Array.isArray(details) ? details : [];
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!state.details.length) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="6" class="text-center text-muted py-3">No demise details registered</td>';
            tbody.appendChild(tr);
            return;
        }

        state.details.forEach((detail, index) => {
            const tr = document.createElement('tr');
            tr.dataset.index = String(index);
            tr.dataset.payload = JSON.stringify(detail);

            tr.innerHTML = `
                <td class="ps-2">${escapeHtml(detail.DemiseDate ? formatDate(detail.DemiseDate) : '')}</td>
                <td>${escapeHtml(detail.ReasonName || '')}</td>
                <td>${escapeHtml(detail.DocumentProofName || '')}</td>
                <td>${escapeHtml(detail.NotificationDate ? formatDate(detail.NotificationDate) : '')}</td>
                <td>${escapeHtml(detail.Remarks || '')}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-link p-0" data-demisedetail-action="select-row" data-detail-index="${index}" title="Select this record" aria-label="Select demise detail">
                        <i class="bi bi-hand-index"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });
    };

    const getFormData = () => {
        if (!form) return {};
        return {
            demiseDetailId: form.querySelector('#hdn_demiseDetailId')?.value || '',
            demiseDate: form.querySelector('#txt_demiseDate')?.value || '',
            reasonId: form.querySelector('#ddl_reasonId')?.value || '',
            documentProofId: form.querySelector('#ddl_documentProofId')?.value || '',
            notificationDate: form.querySelector('#txt_notificationDate')?.value || '',
            documentImage: form.querySelector('#txt_documentImage')?.value || '',
            remarks: form.querySelector('#txa_remarks')?.value || ''
        };
    };

    const validateForm = (formData) => {
        if (!formData.demiseDate) {
            showDemiseDetailsToast('Demise Date is required', 'warning');
            form?.querySelector('#txt_demiseDate')?.focus();
            return false;
        }
        if (!formData.reasonId) {
            showDemiseDetailsToast('Reason is required', 'warning');
            form?.querySelector('#ddl_reasonId')?.focus();
            return false;
        }
        return true;
    };

    const refreshTable = async (requestData = {}, refreshOptions = {}) => {
        const context = resolveDemiseDetailsContext(requestData, configuredModuleId);
        state.lastContext = { ...state.lastContext, ...context };

        resetViewState();

        if (!context.ClientID && !context.RequestID) {
            renderTable([]);
            if (refreshOptions.markInitialLoad) {
                state.initialLoadApplied = true;
            }
            return [];
        }

        setLoading(true);
        try {
            const response = await window.ClientMaintenanceDemiseDetailsService.get({
                ModuleID: context.ModuleID,
                ClientID: context.ClientID,
                RequestID: context.RequestID
            });

            if (!isDemiseDetailsResponseSuccess(response) && !isDemiseDetailsNoDataResponse(response)) {
                throw new Error(getDemiseDetailsResponseMessage(response, 'Unable to load demise details.'));
            }

            const details = isDemiseDetailsNoDataResponse(response)
                ? []
                : normalizeDetailRows(extractDemiseDetailsList(response));

            renderTable(details);

            if (refreshOptions.markInitialLoad) {
                state.initialLoadApplied = true;
            }

            return details;
        } catch (error) {
            console.error('Error loading demise details:', error);
            renderTable([]);
            showDemiseDetailsToast(`Demise details load failed - ${error.message}`, 'error');
            return [];
        } finally {
            setLoading(false);
            applyActionState();
        }
    };

    const selectDetail = (detail, row) => {
        if (!detail || state.mode === 'create' || state.mode === 'update') return;

        clearTableSelection();
        row?.classList.add('table-active');
        state.selectedDetail = detail;
        populateForm(detail);
        state.mode = 'view';
        setFieldsEnabled(false);
        applyActionState();
    };

    const submitCurrentMode = async (mode) => {
        if (!['create', 'update', 'delete'].includes(mode)) {
            showDemiseDetailsToast('Choose New, Alter, or Remove before updating demise details.', 'warning');
            return;
        }

        if ((mode === 'update' || mode === 'delete') && !state.selectedDetail) {
            showDemiseDetailsToast('Select a demise detail first.', 'warning');
            return;
        }

        const formData = getFormData();
        if ((mode === 'create' || mode === 'update') && !validateForm(formData)) {
            return;
        }

        const context = resolveDemiseDetailsContext(state.lastContext, configuredModuleId);
        if (!context.ClientID && !context.RequestID) {
            showDemiseDetailsToast('Client or request context is required', 'warning');
            return;
        }

        const payload = {
            ModuleID: context.ModuleID,
            ClientID: context.ClientID,
            RequestID: context.RequestID,
            DemiseDetailID: formData.demiseDetailId || state.selectedDetail?.DemiseDetailID || state.selectedDetail?.ID || null,
            DemiseDate: formData.demiseDate,
            ReasonID: formData.reasonId,
            DocumentProofID: formData.documentProofId,
            NotificationDate: formData.notificationDate,
            DocumentImage: formData.documentImage,
            Remarks: formData.remarks
        };

        const actionHandler = mode === 'create'
            ? window.ClientMaintenanceDemiseDetailsService.create
            : (mode === 'update'
                ? window.ClientMaintenanceDemiseDetailsService.update
                : window.ClientMaintenanceDemiseDetailsService.delete);

        if (mode === 'delete') {
            delete payload.DemiseDate;
            delete payload.ReasonID;
            delete payload.DocumentProofID;
            delete payload.NotificationDate;
            delete payload.DocumentImage;
            delete payload.Remarks;
        }

        setLoading(true);
        try {
            const response = await actionHandler(payload);
            if (!isDemiseDetailsResponseSuccess(response)) {
                throw new Error(getDemiseDetailsResponseMessage(response, `Demise detail ${mode} failed.`));
            }

            const successMessage = mode === 'delete'
                ? 'Demise detail deleted successfully'
                : `Demise detail ${mode === 'create' ? 'added' : 'updated'} successfully`;

            showDemiseDetailsToast(successMessage, 'success');
            state.mode = 'view';
            await refreshTable(state.lastContext, { markInitialLoad: state.initialLoadApplied });
        } catch (error) {
            showDemiseDetailsToast(`Demise detail ${mode} failed - ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const bindStandaloneBootstrap = () => {
        if (typeof moduleRoot._cmMaybeAutoLoadDemiseDetails === 'function') {
            void moduleRoot._cmMaybeAutoLoadDemiseDetails(initialContext);
        }

        if (moduleRoot.dataset.cmDemiseDetailsParentContextBound === 'true') {
            return;
        }

        moduleRoot.dataset.cmDemiseDetailsParentContextBound = 'true';
        window.addEventListener('message', (event) => {
            const data = event?.data;
            if (!data || typeof data !== 'object') return;
            if (data.type !== 'parentContext' && data.action !== 'parentContextLoaded') return;

            const parentData = data.data || {};
            const nextContext = resolveDemiseDetailsContext({
                ModuleID: parentData.moduleId,
                ClientID: parentData.clientId,
                RequestID: parentData.requestId
            }, configuredModuleId);

            if (typeof moduleRoot._cmMaybeAutoLoadDemiseDetails === 'function') {
                void moduleRoot._cmMaybeAutoLoadDemiseDetails(nextContext);
                return;
            }

            if (typeof moduleRoot._cmLoadData === 'function') {
                void moduleRoot._cmLoadData(nextContext);
            }
        });
    };

    fileInput?.addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        const txtDocumentImage = form?.querySelector('#txt_documentImage');
        if (file && txtDocumentImage) {
            txtDocumentImage.value = file.name;
        }
    });

    buttons.new?.addEventListener('click', () => {
        clearTableSelection();
        clearForm();
        state.mode = 'create';
        setFieldsEnabled(true);
        applyActionState();
    });

    buttons.alter?.addEventListener('click', () => {
        if (!state.selectedDetail) {
            showDemiseDetailsToast('Select a record to alter.', 'warning');
            return;
        }

        state.mode = 'update';
        setFieldsEnabled(true);
        applyActionState();
    });

    buttons.clear?.addEventListener('click', () => {
        resetViewState();
    });

    buttons.remove?.addEventListener('click', async () => {
        if (!state.selectedDetail) {
            showDemiseDetailsToast('Select a record to remove.', 'warning');
            return;
        }

        const confirmed = await requestDemiseDetailsConfirmation(
            'Confirm Deletion',
            'Are you sure you want to delete this demise detail?'
        );

        if (!confirmed) return;

        state.mode = 'delete';
        await submitCurrentMode('delete');
    });

    buttons.update?.addEventListener('click', async () => {
        if (state.mode !== 'create' && state.mode !== 'update') {
            showDemiseDetailsToast('Click New or Alter before updating demise details.', 'warning');
            return;
        }

        await submitCurrentMode(state.mode);
    });

    buttons.browse?.addEventListener('click', () => {
        if (state.mode !== 'create' && state.mode !== 'update') {
            return;
        }

        fileInput?.click();
    });

    table?.addEventListener('click', (event) => {
        const actionBtn = event.target.closest('[data-demisedetail-action="select-row"]');
        const row = event.target.closest('tr[data-index]');
        if (!row) return;

        const index = actionBtn
            ? parseInt(actionBtn.dataset.detailIndex, 10)
            : parseInt(row.dataset.index || '-1', 10);

        if (Number.isNaN(index) || !state.details[index]) return;
        selectDetail(state.details[index], row);
    });

    moduleRoot._cmLoadData = (requestData, refreshOptions = {}) => refreshTable(requestData, {
        markInitialLoad: !state.initialLoadApplied,
        ...refreshOptions
    });
    moduleRoot._cmRefreshData = (requestData, refreshOptions = {}) => refreshTable(requestData, {
        markInitialLoad: !state.initialLoadApplied,
        ...refreshOptions
    });
    moduleRoot._cmMaybeAutoLoadDemiseDetails = (requestData) => {
        const context = resolveDemiseDetailsContext(requestData, configuredModuleId);
        if (state.initialLoadApplied || state.autoLoadInFlight || !shouldAutoLoadStandaloneDemiseDetails(context)) {
            return Promise.resolve([]);
        }

        state.autoLoadInFlight = true;
        return refreshTable(context, { markInitialLoad: true }).finally(() => {
            state.autoLoadInFlight = false;
        });
    };
    moduleRoot._cmSetEditMode = () => {
        setFieldsEnabled(state.mode === 'create' || state.mode === 'update');
        applyActionState();
    };

    bindDemiseDetailsActionPanel(moduleRoot);
    setFieldsEnabled(false);
    applyActionState();
    bindStandaloneBootstrap();
};

function formatDate(value) {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return window.GlobalUtils?.formatDate
        ? window.GlobalUtils.formatDate(date)
        : date.toLocaleDateString();
}

function formatDateForInput(value) {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function escapeHtml(value) {
    const text = String(value ?? '');
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function autoInitializeStandaloneDemiseDetailsView() {
    const moduleRoot = document.querySelector('[data-section="client-demise-details"]');
    if (!moduleRoot || typeof window.initClientMaintenanceDemiseDetails !== 'function') return;

    const moduleId = document.getElementById('moduleIdDemiseDetails')?.value || '';
    window.initClientMaintenanceDemiseDetails(moduleRoot, moduleId);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitializeStandaloneDemiseDetailsView);
} else {
    autoInitializeStandaloneDemiseDetailsView();
}
