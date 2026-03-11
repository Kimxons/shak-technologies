const CM_INTRODUCER_BASE = 'Identities/ClientMaintenance/Introducer';

function getIntroducerAppCore() {
    const win = window;
    return win.AppCore ||
        (win.parent && win.parent !== win && win.parent.AppCore) ||
        (win.top && win.top !== win && win.top.AppCore) ||
        null;
}

function getIntroducerClientMaintenanceCore() {
    const win = window;
    return win.ClientMaintenanceCore ||
        (win.parent && win.parent !== win && win.parent.ClientMaintenanceCore) ||
        (win.top && win.top !== win && win.top.ClientMaintenanceCore) ||
        null;
}

function getIntroducerSidebarManager() {
    const win = window;
    try {
        return (win.parent && win.parent !== win && win.parent.SidebarManager) ||
            (win.top && win.top !== win && win.top.SidebarManager) ||
            null;
    } catch (_error) {
        return null;
    }
}

function getIntroducerParentContext() {
    const maintenanceCore = getIntroducerClientMaintenanceCore();
    if (maintenanceCore?.getParentContext) {
        return maintenanceCore.getParentContext();
    }

    const sidebarManager = getIntroducerSidebarManager();
    if (sidebarManager?.getParentContext) {
        return sidebarManager.getParentContext();
    }

    return null;
}

function toIntroducerString(value) {
    return value === undefined || value === null ? '' : String(value).trim();
}

function firstNonEmptyIntroducerString(...values) {
    for (const value of values) {
        const normalized = toIntroducerString(value);
        if (normalized) {
            return normalized;
        }
    }

    return '';
}

function getIntroducerViewState() {
    return window.ClientIntroducerState || {};
}

function resolveIntroducerContext(requestData, fallbackModuleId) {
    const viewState = getIntroducerViewState();
    const parentContext = getIntroducerParentContext() || {};
    const maintenanceCore = getIntroducerClientMaintenanceCore();

    const moduleId = firstNonEmptyIntroducerString(
        requestData?.ModuleID,
        fallbackModuleId,
        maintenanceCore?.moduleId,
        parentContext.moduleId,
        viewState.ModuleID
    );

    const clientId = firstNonEmptyIntroducerString(
        requestData?.ClientID,
        maintenanceCore?.getClientId?.(),
        maintenanceCore?.clientId,
        parentContext.clientId,
        viewState.ClientID
    );

    const requestId = firstNonEmptyIntroducerString(
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

function shouldAutoLoadStandaloneIntroducer(context) {
    return Boolean(context?.IsStandalone && (context?.ClientID || context?.RequestID));
}

function invokeClientMaintenanceIntroducer(action, requestData) {
    const maintenanceCore = getIntroducerClientMaintenanceCore();
    if (maintenanceCore?.invokeControllerMethod) {
        return maintenanceCore.invokeControllerMethod(CM_INTRODUCER_BASE, action, 'POST', requestData || {});
    }

    const appCore = getIntroducerAppCore();
    if (appCore?.invokeControllerByMethodAsync) {
        return appCore.invokeControllerByMethodAsync(`${CM_INTRODUCER_BASE}/${action}`, 'POST', requestData || {});
    }

    return Promise.reject(new Error('Introducer controller invocation is not available.'));
}

window.ClientMaintenanceIntroducerService = {
    get: (requestData) => invokeClientMaintenanceIntroducer('get', requestData),
    create: (requestData) => invokeClientMaintenanceIntroducer('create', requestData),
    update: (requestData) => invokeClientMaintenanceIntroducer('update', requestData),
    delete: (requestData) => invokeClientMaintenanceIntroducer('delete', requestData)
};

function showIntroducerToast(message, type = 'info') {
    const maintenanceCore = getIntroducerClientMaintenanceCore();
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

async function requestIntroducerConfirmation(title, message) {
    const appCore = getIntroducerAppCore();
    if (appCore?.showConfirmation) {
        return Boolean(await appCore.showConfirmation(title, message));
    }

    return window.confirm(message);
}

function getIntroducerResponseCode(response) {
    return toIntroducerString(response?.ResponseCode ?? response?.responseCode);
}

function getIntroducerResponseMessage(response, fallbackMessage) {
    return response?.ResponseMessage ??
        response?.responseMessage ??
        response?.Message ??
        response?.message ??
        response?.ErrorMessage ??
        response?.errorMessage ??
        fallbackMessage;
}

function isIntroducerResponseSuccess(response) {
    const successFlag = response?.Success ?? response?.success;
    if (typeof successFlag === 'boolean') {
        return successFlag;
    }

    const responseCode = getIntroducerResponseCode(response).toUpperCase();
    if (responseCode) {
        return responseCode === '000' || responseCode === '00' || responseCode === 'SUCCESS';
    }

    return true;
}

function isIntroducerNoDataResponse(response) {
    const responseCode = getIntroducerResponseCode(response).toUpperCase();
    const responseMessage = toIntroducerString(getIntroducerResponseMessage(response, ''));
    return responseCode === 'DBEX000020' || /do not exist/i.test(responseMessage);
}

function getIntroducerSearchModal() {
    const appCore = getIntroducerAppCore();
    if (!appCore || !window.SearchModal) {
        return null;
    }

    if (!window._clientMaintenanceIntroducerSearchModal) {
        window._clientMaintenanceIntroducerSearchModal = new window.SearchModal(appCore);
    }

    return window._clientMaintenanceIntroducerSearchModal;
}

function closeIntroducerView() {
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
            parentWindowRef?.postMessage({ type: 'submoduleClose', source: 'ClientIntroducer' }, '*');
            handled = Boolean(parentWindowRef);
        } catch (_error) {
        }
    }

    try { parentWindowRef?.postMessage({ action: 'submoduleClosed', source: 'ClientIntroducer' }, '*'); } catch (_error) { }
    try { parentWindowRef?.postMessage({ type: 'accountMaintenanceChildClose', source: 'ClientIntroducer' }, '*'); } catch (_error) { }
    try { parentWindowRef?.postMessage({ type: 'CLOSE_DATAENTRY', source: 'ClientIntroducer' }, '*'); } catch (_error) { }

    if (!handled) {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.close();
        }
    }
}

function bindIntroducerActionPanel(tabRoot) {
    if (!tabRoot) return;

    const actionScope =
        tabRoot.closest('.window') ||
        tabRoot.closest('[data-cm-layout="client-introducer"]') ||
        tabRoot.parentElement ||
        tabRoot;

    if (!actionScope || actionScope.dataset.cmIntroducerActionDelegated === 'true') return;
    actionScope.dataset.cmIntroducerActionDelegated = 'true';

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
            closeIntroducerView();
        }
    });

    actionScope.addEventListener('kairo:titlebar:refresh', handleRefresh);
    actionScope.addEventListener('kairo:titlebar:close', (event) => {
        event.preventDefault();
        closeIntroducerView();
    });
}

window.initClientMaintenanceIntroducer = function (tabRoot, moduleId) {
    if (!tabRoot || tabRoot.dataset.cmIntroducerInitialized === 'true') return;
    tabRoot.dataset.cmIntroducerInitialized = 'true';

    const configuredModuleId = toIntroducerString(moduleId || getIntroducerViewState().ModuleID);
    const initialContext = resolveIntroducerContext(null, configuredModuleId);
    const state = {
        introducers: [],
        selectedIntroducer: null,
        mode: 'view',
        lastContext: { ...initialContext },
        initialLoadApplied: false,
        autoLoadInFlight: false
    };

    const form = tabRoot.querySelector('[data-introducer-form]');
    const table = tabRoot.querySelector('[data-table="introducers"]');
    const tbody = table?.querySelector('[data-introducers-body]');

    const setFieldValue = (id, value) => {
        const field = form?.querySelector(`#${id}`);
        if (!field) return;
        field.value = value || '';
    };

    const getFieldValue = (id) => {
        const field = form?.querySelector(`#${id}`);
        return field?.value || '';
    };

    const renderTable = (introducers) => {
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!Array.isArray(introducers) || introducers.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="6" class="text-center text-muted py-3">No introducer details registered</td>';
            tbody.appendChild(tr);
            return;
        }

        introducers.forEach((introducer, index) => {
            const tr = document.createElement('tr');
            tr.dataset.introducerIndex = String(index);
            tr.style.cursor = 'pointer';

            const introducerCode = introducer?.IntroducerID || introducer?.IntroducerCode || '';
            const introducerName = introducer?.IntroducerName || introducer?.Name || '';
            const contact = introducer?.ContactNumber || '';
            const email = introducer?.EmailAddress || '';
            const relationship = introducer?.Relationship || '';

            tr.innerHTML = `
                <td class="ps-2">${escapeHtml(introducerCode)}</td>
                <td>${escapeHtml(introducerName)}</td>
                <td>${escapeHtml(contact)}</td>
                <td>${escapeHtml(email)}</td>
                <td>${escapeHtml(relationship)}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-primary" data-introducer-action="select" data-introducer-index="${index}">
                        <i class="bi bi-check2"></i>
                    </button>
                </td>
            `;

            tr.addEventListener('click', (event) => {
                if (event.target.closest('[data-introducer-action="select"]')) return;
                selectIntroducer(introducers[index], tr);
            });

            tbody.appendChild(tr);
        });
    };

    const populateForm = (introducer) => {
        if (!introducer) return;

        setFieldValue('hdn_introducerId', introducer.ID || introducer.IntroducerDetailID);
        setFieldValue('txt_introducerCode', introducer.IntroducerID || introducer.IntroducerCode);
        setFieldValue('txt_introducerName', introducer.IntroducerName || introducer.Name);
        setFieldValue('txt_introducerContact', introducer.ContactNumber);
        setFieldValue('txt_introducerEmail', introducer.EmailAddress);
        setFieldValue('txt_introducerRelation', introducer.Relationship);
        setFieldValue('txt_introducerAddress', introducer.Address);
        setFieldValue('txt_introducerRemarks', introducer.Remarks);
    };

    const clearForm = () => {
        form?.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach((field) => {
            field.value = '';
        });
        setFieldValue('hdn_introducerId', '');
        state.selectedIntroducer = null;
        tbody?.querySelectorAll('tr').forEach((row) => row.classList.remove('table-active'));
    };

    const selectIntroducer = (introducer, rowElement) => {
        tbody?.querySelectorAll('tr').forEach((row) => row.classList.remove('table-active'));
        rowElement?.classList.add('table-active');

        state.selectedIntroducer = introducer;
        populateForm(introducer);
        setFormState('view');
    };

    const getFormData = () => {
        return {
            ID: getFieldValue('hdn_introducerId'),
            IntroducerID: getFieldValue('txt_introducerCode'),
            IntroducerName: getFieldValue('txt_introducerName'),
            ContactNumber: getFieldValue('txt_introducerContact'),
            EmailAddress: getFieldValue('txt_introducerEmail'),
            Relationship: getFieldValue('txt_introducerRelation'),
            Address: getFieldValue('txt_introducerAddress'),
            Remarks: getFieldValue('txt_introducerRemarks')
        };
    };

    const validateForm = () => {
        const errors = [];

        if (!getFieldValue('txt_introducerCode')) {
            errors.push('Introducer is required');
        }

        if (errors.length > 0) {
            showIntroducerToast(errors.join(', '), 'error');
            return false;
        }

        return true;
    };

    const setFormState = (mode) => {
        state.mode = mode;

        const newBtn = tabRoot.querySelector('[data-introducer-action="new"]');
        const alterBtn = tabRoot.querySelector('[data-introducer-action="alter"]');
        const removeBtn = tabRoot.querySelector('[data-introducer-action="remove"]');
        const updateBtn = tabRoot.querySelector('[data-introducer-action="update"]');
        const clearBtn = tabRoot.querySelector('[data-introducer-action="clear"]');

        const fields = form?.querySelectorAll('input:not([type="hidden"]), select, textarea');
        const isEditing = mode === 'add' || mode === 'edit';
        const hasSelection = Boolean(state.selectedIntroducer);

        fields?.forEach((field) => {
            field.disabled = !isEditing;
            if (field.matches('input:not([type="checkbox"]), textarea')) {
                field.readOnly = !isEditing;
            }
        });

        ['#txt_introducerCode', '#txt_introducerName'].forEach((selector) => {
            const field = form?.querySelector(selector);
            if (field) {
                field.readOnly = true;
            }
        });

        tabRoot.querySelectorAll('[data-introducer-action="lookup-introducer"]').forEach((button) => {
            button.disabled = !isEditing;
        });

        if (newBtn) newBtn.disabled = hasSelection || isEditing;
        if (alterBtn) alterBtn.disabled = !hasSelection || isEditing;
        if (removeBtn) removeBtn.disabled = !hasSelection || isEditing;
        if (updateBtn) updateBtn.disabled = !isEditing;
        if (clearBtn) clearBtn.disabled = !isEditing;
    };

    const extractIntroducers = (response) => {
        const candidates = [
            response?.Details,
            response?.details,
            response?.data?.Details,
            response?.data?.details,
            response?.Data,
            response?.data
        ];

        for (const candidate of candidates) {
            if (Array.isArray(candidate)) return candidate;
        }

        return [];
    };

    const refreshTable = async (requestData = {}, refreshOptions = {}) => {
        const context = resolveIntroducerContext(requestData, configuredModuleId);
        state.lastContext = { ...state.lastContext, ...context };

        clearForm();
        setFormState('view');

        if (!context.ClientID && !context.RequestID) {
            state.introducers = [];
            renderTable([]);
            if (refreshOptions.markInitialLoad) {
                state.initialLoadApplied = true;
            }
            return [];
        }

        try {
            const response = await window.ClientMaintenanceIntroducerService.get({
                ModuleID: context.ModuleID,
                ClientID: context.ClientID,
                RequestID: context.RequestID
            });

            if (!isIntroducerResponseSuccess(response) && !isIntroducerNoDataResponse(response)) {
                throw new Error(getIntroducerResponseMessage(response, 'Unable to load introducer details.'));
            }

            const introducers = isIntroducerNoDataResponse(response) ? [] : extractIntroducers(response);
            state.introducers = introducers;
            renderTable(introducers);

            if (refreshOptions.markInitialLoad) {
                state.initialLoadApplied = true;
            }

            return introducers;
        } catch (error) {
            console.error('Introducer load failed:', error);
            showIntroducerToast(`Failed to load introducer details - ${error.message}`, 'error');
            state.introducers = [];
            renderTable([]);
            return [];
        }
    };

    const bindStandaloneBootstrap = () => {
        if (typeof tabRoot._cmMaybeAutoLoadIntroducer === 'function') {
            void tabRoot._cmMaybeAutoLoadIntroducer(initialContext);
        }

        if (tabRoot.dataset.cmIntroducerParentContextBound === 'true') {
            return;
        }

        tabRoot.dataset.cmIntroducerParentContextBound = 'true';
        window.addEventListener('message', (event) => {
            const data = event?.data;
            if (!data || typeof data !== 'object') return;
            if (data.type !== 'parentContext' && data.action !== 'parentContextLoaded') return;

            const parentData = data.data || {};
            const nextContext = resolveIntroducerContext({
                ModuleID: parentData.moduleId,
                ClientID: parentData.clientId,
                RequestID: parentData.requestId
            }, configuredModuleId);

            if (typeof tabRoot._cmMaybeAutoLoadIntroducer === 'function') {
                void tabRoot._cmMaybeAutoLoadIntroducer(nextContext);
                return;
            }

            if (typeof tabRoot._cmLoadData === 'function') {
                void tabRoot._cmLoadData(nextContext);
            }
        });
    };

    const handleNew = () => {
        clearForm();
        setFormState('add');
        showIntroducerToast('Enter new introducer details', 'info');
    };

    const handleAlter = () => {
        if (!state.selectedIntroducer) {
            showIntroducerToast('Please select an introducer to edit', 'warning');
            return;
        }

        setFormState('edit');
    };

    const handleRemove = async () => {
        if (!state.selectedIntroducer) {
            showIntroducerToast('Please select an introducer to remove', 'warning');
            return;
        }

        const confirmed = await requestIntroducerConfirmation(
            'Delete Introducer',
            'Are you sure you want to delete this introducer?'
        );

        if (!confirmed) return;

        try {
            const context = resolveIntroducerContext(state.lastContext, configuredModuleId);
            const response = await window.ClientMaintenanceIntroducerService.delete({
                ModuleID: context.ModuleID,
                ClientID: context.ClientID,
                RequestID: context.RequestID,
                ID: state.selectedIntroducer.ID || state.selectedIntroducer.IntroducerDetailID
            });

            if (isIntroducerResponseSuccess(response)) {
                showIntroducerToast('Introducer deleted successfully', 'success');
                clearForm();
                await refreshTable({});
            } else {
                showIntroducerToast(getIntroducerResponseMessage(response, 'Delete failed'), 'error');
            }
        } catch (error) {
            console.error('Delete introducer error:', error);
            showIntroducerToast(`Delete failed - ${error.message}`, 'error');
        }
    };

    const handleUpdate = async () => {
        if (!validateForm()) return;

        const formData = getFormData();
        const context = resolveIntroducerContext(state.lastContext, configuredModuleId);

        try {
            let response;

            if (state.mode === 'add') {
                response = await window.ClientMaintenanceIntroducerService.create({
                    ModuleID: context.ModuleID,
                    ClientID: context.ClientID,
                    RequestID: context.RequestID,
                    ...formData
                });
            } else if (state.mode === 'edit') {
                response = await window.ClientMaintenanceIntroducerService.update({
                    ModuleID: context.ModuleID,
                    ClientID: context.ClientID,
                    RequestID: context.RequestID,
                    ...formData
                });
            }

            if (isIntroducerResponseSuccess(response)) {
                showIntroducerToast(
                    `Introducer ${state.mode === 'add' ? 'created' : 'updated'} successfully`,
                    'success'
                );
                clearForm();
                await refreshTable({});
            } else {
                showIntroducerToast(getIntroducerResponseMessage(response, 'Update failed'), 'error');
            }
        } catch (error) {
            console.error('Update introducer error:', error);
            showIntroducerToast(`Update failed - ${error.message}`, 'error');
        }
    };

    const handleClear = () => {
        clearForm();
        setFormState('view');
    };

    const handleLookupIntroducer = () => {
        if (state.mode === 'view') {
            showIntroducerToast('Click "New" or "Alter" to search for introducers', 'info');
            return;
        }

        const searchModal = getIntroducerSearchModal();
        if (!searchModal) {
            return;
        }

        searchModal.open({
            tableID: 'ClientID',
            moduleID: configuredModuleId || '0',
            onSelect: (selected) => {
                if (!selected) return;

                setFieldValue('txt_introducerCode', selected.ClientID || selected.Code || selected.ID);
                setFieldValue('txt_introducerName', selected.ClientName || selected.Name);
            }
        });
    };

    tabRoot.querySelector('[data-introducer-action="new"]')?.addEventListener('click', handleNew);
    tabRoot.querySelector('[data-introducer-action="alter"]')?.addEventListener('click', handleAlter);
    tabRoot.querySelector('[data-introducer-action="remove"]')?.addEventListener('click', handleRemove);
    tabRoot.querySelector('[data-introducer-action="update"]')?.addEventListener('click', handleUpdate);
    tabRoot.querySelector('[data-introducer-action="clear"]')?.addEventListener('click', handleClear);
    tabRoot.querySelector('[data-introducer-action="lookup-introducer"]')?.addEventListener('click', handleLookupIntroducer);

    tbody?.addEventListener('click', (event) => {
        const selectBtn = event.target.closest('[data-introducer-action="select"]');
        if (!selectBtn) return;

        const index = parseInt(selectBtn.dataset.introducerIndex, 10);
        if (Number.isNaN(index) || !state.introducers[index]) return;

        const row = selectBtn.closest('tr');
        selectIntroducer(state.introducers[index], row);
    });

    tabRoot._cmLoadData = (requestData, refreshOptions = {}) => refreshTable(requestData, {
        markInitialLoad: !state.initialLoadApplied,
        ...refreshOptions
    });
    tabRoot._cmRefreshData = (requestData, refreshOptions = {}) => refreshTable(requestData, {
        markInitialLoad: !state.initialLoadApplied,
        ...refreshOptions
    });
    tabRoot._cmMaybeAutoLoadIntroducer = (requestData) => {
        const context = resolveIntroducerContext(requestData, configuredModuleId);
        if (state.initialLoadApplied || state.autoLoadInFlight || !shouldAutoLoadStandaloneIntroducer(context)) {
            return Promise.resolve([]);
        }

        state.autoLoadInFlight = true;
        return refreshTable(context, { markInitialLoad: true }).finally(() => {
            state.autoLoadInFlight = false;
        });
    };
    tabRoot._cmSetEditMode = () => {
        setFormState(state.mode);
    };

    bindIntroducerActionPanel(tabRoot);
    setFormState('view');
    bindStandaloneBootstrap();
};

function escapeHtml(value) {
    const text = String(value ?? '');
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function autoInitializeStandaloneIntroducerView() {
    const moduleRoot = document.querySelector('[data-section="client-introducer"]');
    if (!moduleRoot || typeof window.initClientMaintenanceIntroducer !== 'function') return;

    const moduleId = document.getElementById('moduleIdIntroducer')?.value || '';
    window.initClientMaintenanceIntroducer(moduleRoot, moduleId);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitializeStandaloneIntroducerView);
} else {
    autoInitializeStandaloneIntroducerView();
}
