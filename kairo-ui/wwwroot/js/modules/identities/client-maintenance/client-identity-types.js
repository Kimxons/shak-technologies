const CM_IDENTITY_TYPES_BASE = 'Identities/ClientMaintenance/IdentityTypes';
const MODULEID_IDENTITYTYPES = 1010; // Standard module ID for identities/client maintenance

function getIdentityAppCore() {
    const win = window;
    return win.AppCore ||
        (win.parent && win.parent !== win && win.parent.AppCore) ||
        (win.top && win.top !== win && win.top.AppCore) ||
        null;
}

function getIdentityClientMaintenanceCore() {
    const win = window;
    return win.ClientMaintenanceCore ||
        (win.parent && win.parent !== win && win.parent.ClientMaintenanceCore) ||
        (win.top && win.top !== win && win.top.ClientMaintenanceCore) ||
        null;
}

function getIdentitySidebarManager() {
    const win = window;
    try {
        return (win.parent && win.parent !== win && win.parent.SidebarManager) ||
            (win.top && win.top !== win && win.top.SidebarManager) ||
            null;
    } catch (_error) {
        return null;
    }
}

function invokeClientMaintenanceIdentityTypes(action, requestData) {
    const maintenanceCore = getIdentityClientMaintenanceCore();
    if (maintenanceCore?.invokeControllerMethod) {
        return maintenanceCore.invokeControllerMethod(CM_IDENTITY_TYPES_BASE, action, 'POST', requestData || {});
    }

    const appCore = getIdentityAppCore();
    if (appCore?.invokeControllerByMethodAsync) {
        return appCore.invokeControllerByMethodAsync(`${CM_IDENTITY_TYPES_BASE}/${action}`, 'POST', requestData || {});
    }

    return Promise.reject(new Error('Identity Types controller invocation is not available.'));
}

window.ClientMaintenanceIdentityTypesService = {
    get: (requestData) => invokeClientMaintenanceIdentityTypes('get', requestData),
    create: (requestData) => invokeClientMaintenanceIdentityTypes('create', requestData),
    update: (requestData) => invokeClientMaintenanceIdentityTypes('update', requestData),
    delete: (requestData) => invokeClientMaintenanceIdentityTypes('delete', requestData)
};

function showIdentityToast(message, type = 'info') {
    const maintenanceCore = getIdentityClientMaintenanceCore();
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

async function requestIdentityConfirmation(title, message) {
    const appCore = getIdentityAppCore();
    if (appCore?.showConfirmation) {
        return Boolean(await appCore.showConfirmation(title, message));
    }

    return window.confirm(message);
}

function getIdentityViewState() {
    return window.ClientIdentityTypesState || {};
}

function getParentIdentityContext() {
    const maintenanceCore = getIdentityClientMaintenanceCore();
    if (maintenanceCore?.getParentContext) {
        return maintenanceCore.getParentContext();
    }

    const sidebarManager = getIdentitySidebarManager();
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

function resolveIdentityContext(requestData, fallbackModuleId) {
    const viewState = getIdentityViewState();
    const parentContext = getParentIdentityContext() || {};
    const maintenanceCore = getIdentityClientMaintenanceCore();

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
        IsStandalone: Boolean(viewState.IsStandalone)
    };
}

function escapeHtmlIT(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.initClientMaintenanceIdentityTypesTab = function (tabRoot, moduleId) {
    if (!tabRoot || tabRoot.dataset.cmIdentityTypesInitialized === 'true') return;
    tabRoot.dataset.cmIdentityTypesInitialized = 'true';

    const state = {
        mode: 'view', // 'view', 'add', 'edit'
        selectedRecordId: null,
        records: []
    };

    const form = tabRoot.querySelector('[data-identitytypes-form]');
    const tableBody = tabRoot.querySelector('[data-identitytypes-body]');
    const loadingOverlay = tabRoot.querySelector('#identityTypesLoadingOverlay');

    const fields = {
        ClientIdentityTypeID: form.querySelector('#hdn_identityTypeId'),
        IdentityTypeID: form.querySelector('#txt_identityType'),
        IdentityTypeName: form.querySelector('#txt_identityTypeName'),
        Format: form.querySelector('#txt_identityFormat'),
        IdentificationNo: form.querySelector('#txt_identityNumber'),
        SerialNo: form.querySelector('#txt_identitySerialNo'),
        PlaceOfIssue: form.querySelector('#txt_identityPlaceOfIssue'),
        IssueDate: form.querySelector('#dt_identityIssueDate'),
        Location: form.querySelector('#txt_identityLocation'),
        DocumentImage: form.querySelector('#txt_identityDocumentImage')
    };

    const auditFields = {
        CreatedBy: tabRoot.querySelector('#idt_auditCreatedBy'),
        CreatedOn: tabRoot.querySelector('#idt_auditCreatedOn'),
        ModifiedBy: tabRoot.querySelector('#idt_auditModifiedBy'),
        ModifiedOn: tabRoot.querySelector('#idt_auditModifiedOn'),
        SupervisedBy: tabRoot.querySelector('#idt_auditSupervisedBy'),
        SupervisedOn: tabRoot.querySelector('#idt_auditSupervisedOn')
    };

    const actionButtons = {
        new: tabRoot.querySelector('[data-identitytype-action="new"]'),
        alter: tabRoot.querySelector('[data-identitytype-action="alter"]'),
        remove: tabRoot.querySelector('[data-identitytype-action="remove"]'),
        update: tabRoot.querySelector('[data-identitytype-action="update"]'),
        clear: tabRoot.querySelector('[data-identitytype-action="clear"]')
    };

    const setLoading = (isLoading) => {
        if (loadingOverlay) loadingOverlay.hidden = !isLoading;
    };

    const setFormState = (mode) => {
        state.mode = mode;
        const isReadonly = mode === 'view';

        Object.values(fields).forEach(field => {
            if (!field) return;
            if (field.id === 'txt_identityType' || field.id === 'txt_identityTypeName' || field.id === 'txt_identityDocumentImage') {
                field.readOnly = true;
            } else {
                field.readOnly = isReadonly;
                field.disabled = isReadonly;
            }
        });

        const lookupBtn = form.querySelector('[data-identitytype-action="lookup-type"]');
        if (lookupBtn) lookupBtn.disabled = isReadonly;
        
        const browseBtn = form.querySelector('[data-identitytype-action="browse-image"]');
        if (browseBtn) browseBtn.disabled = isReadonly;

        actionButtons.new.disabled = mode !== 'view';
        actionButtons.alter.disabled = mode !== 'view' || !state.selectedRecordId;
        actionButtons.remove.disabled = mode !== 'view' || !state.selectedRecordId;
        actionButtons.update.disabled = mode === 'view';
        actionButtons.clear.disabled = mode === 'view';
    };

    const clearForm = () => {
        Object.values(fields).forEach(field => { if (field) field.value = ''; });
        Object.values(auditFields).forEach(field => { if (field) field.textContent = '-'; });
        state.selectedRecordId = null;
        tableBody.querySelectorAll('tr').forEach(tr => tr.classList.remove('is-selected'));
    };

    const populateAuditFields = (data) => {
        if (auditFields.CreatedBy) auditFields.CreatedBy.textContent = data.CreatedBy || '-';
        if (auditFields.CreatedOn) auditFields.CreatedOn.textContent = data.CreatedOn || '-';
        if (auditFields.ModifiedBy) auditFields.ModifiedBy.textContent = data.ModifiedBy || '-';
        if (auditFields.ModifiedOn) auditFields.ModifiedOn.textContent = data.ModifiedOn || '-';
        if (auditFields.SupervisedBy) auditFields.SupervisedBy.textContent = data.SupervisedBy || '-';
        if (auditFields.SupervisedOn) auditFields.SupervisedOn.textContent = data.SupervisedOn || '-';
    };

    const refreshTable = async (requestData) => {
        const context = resolveIdentityContext(requestData, moduleId);
        if (!context.ClientID && !context.RequestID) {
            tableBody.innerHTML = '<tr><td colspan="3" class="text-center">No client selected</td></tr>';
            return;
        }

        setLoading(true);
        try {
            const response = await window.ClientMaintenanceIdentityTypesService.get(context);
            
            // Handle different response structures
            let details = response?.Details || response?.data?.Details || response?.Data || response?.data || [];
            if (typeof details === 'string') {
                try { details = JSON.parse(details); } catch(e) { details = []; }
            }
            if (!Array.isArray(details)) details = [];

            state.records = details;
            
            if (details.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="3" class="text-center">No identity types found</td></tr>';
            } else {
                tableBody.innerHTML = details.map((rec, index) => `
                    <tr data-index="${index}" style="cursor:pointer;">
                        <td class="ps-2">${escapeHtmlIT(rec.IdentityTypeName || rec.IdentityTypeID)}</td>
                        <td>${escapeHtmlIT(rec.IdentificationNo)}</td>
                        <td>${escapeHtmlIT(rec.Format)}</td>
                    </tr>
                `).join('');

                tableBody.querySelectorAll('tr').forEach(tr => {
                    tr.addEventListener('click', () => {
                        const idx = tr.dataset.index;
                        const record = state.records[idx];
                        
                        tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('is-selected'));
                        tr.classList.add('is-selected');

                        state.selectedRecordId = record.ClientIdentityTypeID || record.RecordID;
                        
                        fields.ClientIdentityTypeID.value = state.selectedRecordId;
                        fields.IdentityTypeID.value = record.IdentityTypeID || '';
                        fields.IdentityTypeName.value = record.IdentityTypeName || '';
                        fields.Format.value = record.Format || '';
                        fields.IdentificationNo.value = record.IdentificationNo || '';
                        fields.SerialNo.value = record.SerialNo || '';
                        fields.PlaceOfIssue.value = record.PlaceOfIssue || '';
                        fields.IssueDate.value = record.IssueDate ? record.IssueDate.split('T')[0] : '';
                        fields.Location.value = record.Location || '';
                        fields.DocumentImage.value = record.DocumentImage || '';

                        populateAuditFields(record);
                        setFormState('view');
                    });
                });
            }
        } catch (err) {
            showIdentityToast('Failed to load identity types: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const openIdentityTypeLookup = () => {
        if (!window.SearchModal) {
            showIdentityToast('Search modal is not available', 'error');
            return;
        }

        window.SearchModal.open({
            title: 'Select Identification Type',
            endpoint: 'Common/GetIdentificationTypes',
            columns: [
                { title: 'ID', field: 'IdentityTypeID' },
                { title: 'Description', field: 'Description' },
                { title: 'Format', field: 'Format' }
            ],
            onSelect: (item) => {
                fields.IdentityTypeID.value = item.IdentityTypeID;
                fields.IdentityTypeName.value = item.Description;
                fields.Format.value = item.Format || '';
            }
        });
    };

    // Event Listeners
    tabRoot.addEventListener('click', async (e) => {
        const actionBtn = e.target.closest('[data-identitytype-action]');
        if (!actionBtn) return;

        const action = actionBtn.dataset.identitytypeAction;

        if (action === 'new') {
            clearForm();
            setFormState('add');
        } else if (action === 'alter') {
            setFormState('edit');
        } else if (action === 'clear') {
            clearForm();
            setFormState('view');
        } else if (action === 'lookup-type') {
            openIdentityTypeLookup();
        } else if (action === 'refresh') {
            await refreshTable({});
        } else if (action === 'close') {
            const maintenanceCore = getIdentityClientMaintenanceCore();
            if (maintenanceCore?.closeSubmodule) {
                maintenanceCore.closeSubmodule();
            } else {
                window.parent.postMessage({ type: 'submoduleClose', source: 'ClientIdentityTypes' }, '*');
            }
        } else if (action === 'remove') {
            const confirmed = await requestIdentityConfirmation('Confirm Removal', 'Are you sure you want to remove this identity record?');
            if (!confirmed) return;

            setLoading(true);
            try {
                const context = resolveIdentityContext({}, moduleId);
                const response = await window.ClientMaintenanceIdentityTypesService.delete({
                    ...context,
                    RecordID: state.selectedRecordId
                });
                if (response.Success || response.responseCode === '00' || response.ResponseCode === '000') {
                    showIdentityToast('Identity record removed successfully', 'success');
                    clearForm();
                    await refreshTable({});
                } else {
                    showIdentityToast(response.ResponseMessage || 'Failed to remove record', 'error');
                }
            } catch (err) {
                showIdentityToast('Error removing record: ' + err.message, 'error');
            } finally {
                setLoading(false);
            }
        } else if (action === 'update') {
            const formData = new FormData(form);
            const payload = Object.fromEntries(formData.entries());
            
            // ClientIdentityTypeID is in the form as a hidden field
            const context = resolveIdentityContext({}, moduleId);
            const requestData = {
                ...context,
                RecordID: state.mode === 'edit' ? state.selectedRecordId : null,
                Payload: payload
            };

            setLoading(true);
            try {
                const serviceAction = state.mode === 'add' ? 'create' : 'update';
                const response = await window.ClientMaintenanceIdentityTypesService[serviceAction](requestData);
                
                if (response.Success || response.responseCode === '00' || response.ResponseCode === '000') {
                    showIdentityToast(`Identity record ${state.mode === 'add' ? 'created' : 'updated'} successfully`, 'success');
                    setFormState('view');
                    await refreshTable({});
                } else {
                    showIdentityToast(response.ResponseMessage || 'Failed to save record', 'error');
                }
            } catch (err) {
                showIdentityToast('Error saving record: ' + err.message, 'error');
            } finally {
                setLoading(false);
            }
        }
    });

    // Listen for context updates from parent
    if (window.parent && window.parent !== window) {
        window.addEventListener('message', (event) => {
            if (event.data && (event.data.type === 'parentContext' || event.data.action === 'parentContextLoaded')) {
                refreshTable(event.data.context || event.data.payload);
            }
        });
    }

    // Initial load
    setFormState('view');
    refreshTable({});
    
    // External exposure for manual refresh
    tabRoot._cmRefreshData = () => refreshTable({});
};

// Standalone initialization
(function() {
    function tryInit() {
        const root = document.querySelector('[data-ktb-window]');
        if (root && root.dataset.identitytypesHost === 'standalone') {
            const viewState = window.ClientIdentityTypesState || {};
            window.initClientMaintenanceIdentityTypesTab(root, viewState.ModuleID || 1010);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    } else {
        tryInit();
    }
})();
