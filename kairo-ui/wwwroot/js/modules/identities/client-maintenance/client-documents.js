const CM_DOCUMENTS_BASE = 'Identities/ClientMaintenance/Documents';

function invokeClientMaintenanceDocuments(action, requestData) {
    return window.ClientMaintenanceCore.invokeControllerMethod(CM_DOCUMENTS_BASE, action, 'POST', requestData || {});
}

window.ClientMaintenanceDocumentsService = {
    get: (requestData) => invokeClientMaintenanceDocuments('get', requestData),
    create: (requestData) => invokeClientMaintenanceDocuments('create', requestData),
    update: (requestData) => invokeClientMaintenanceDocuments('update', requestData),
    delete: (requestData) => invokeClientMaintenanceDocuments('delete', requestData)
};

window.initClientMaintenanceDocumentsTab = function (tabRoot, moduleId) {
    bindDocumentsCrud(tabRoot, moduleId);
    initDocumentsSearchModal(tabRoot, moduleId);
};

function bindDocumentsCrud(tabRoot, moduleId) {
    if (!tabRoot) return;

    const state = {
        enabled: false,
        editing: null
    };

    const form = tabRoot.querySelector('[data-documents-form]') || tabRoot;
    const table = tabRoot.querySelector('[data-table="documents"]');

    const setFieldsEnabled = (enabled) => {
        state.enabled = enabled;
        form.querySelectorAll('[data-document-field]').forEach((field) => {
            field.disabled = !enabled;
        });
        const lookupBtn = form.querySelector('[data-document-action="lookup-receiver"]');
        if (lookupBtn) lookupBtn.disabled = !enabled;
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

    const getSelectLabel = (selector, value) => {
        const el = form.querySelector(selector);
        if (!el || value === undefined || value === null || value === '') return '';
        const option = el.querySelector(`option[value="${value}"]`);
        return option ? option.textContent.trim() : '';
    };

    const normalizeDocumentRows = (rows) => (rows || []).map((row) => ({
        ID: row.ID ?? row.DocumentID ?? null,
        DocumentID: row.DocumentID ?? '',
        DocumentTypeID: row.DocumentTypeID ?? '',
        LocationID: row.LocationID ?? '',
        Image: row.Image ?? row.DocumentImage ?? '',
        Remarks: row.Remarks ?? '',
        ReceivedBy: row.ReceivedBy ?? '',
        ReceivedDate: row.ReceivedDate ?? '',
        ReceivedByName: row.ReceivedByName ?? row.Name ?? ''
    }));

    const renderDocumentsTable = (rows) => {
        const tbody = table?.querySelector('tbody') || tabRoot.querySelector('#tbl_clientDocumentsBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        (rows || []).forEach((entry, index) => {
            const tr = document.createElement('tr');
            tr.dataset.index = String(index);
            tr.dataset.payload = JSON.stringify(entry);

            const docLabel = getSelectLabel('[data-document-field="DocumentID"]', entry.DocumentID) || entry.DocumentID || '';
            const typeLabel = getSelectLabel('[data-document-field="DocumentTypeID"]', entry.DocumentTypeID) || entry.DocumentTypeID || '';
            const locationLabel = getSelectLabel('[data-document-field="LocationID"]', entry.LocationID) || entry.LocationID || '';
            const receivedDate = entry.ReceivedDate || '';

            tr.innerHTML = `
                <td class="ps-2">${docLabel}</td>
                <td>${typeLabel}</td>
                <td>${locationLabel}</td>
                <td>${entry.ReceivedBy || ''}</td>
                <td>${receivedDate}</td>
                <td class="text-center"></td>
            `;
            tbody.appendChild(tr);
        });
    };

    const refreshDocumentsTable = async () => {
        const clientId = window.ClientMaintenanceCore.clientId || '';
        if (!clientId) {
            renderDocumentsTable([]);
            return;
        }
        try {
            const response = await window.ClientMaintenanceDocumentsService.get({
                ModuleID: moduleId || window.ClientMaintenanceCore.moduleId || '',
                ClientID: clientId
            });
            const rows = normalizeDocumentRows(extractList(response));
            renderDocumentsTable(rows);
        } catch (error) {
            window.ClientMaintenanceCore.showToast(`Documents load failed - ${error.message}`, 'error');
        }
    };

    const resetForm = () => {
        form.querySelectorAll('[data-document-field]').forEach((field) => {
            if (field.type === 'checkbox') {
                field.checked = false;
            } else if (field.type === 'file') {
                field.value = '';
            } else {
                field.value = '';
            }
        });
        const receiverName = form.querySelector('#txt_documentReceivedByName');
        if (receiverName) receiverName.value = '';
        state.editing = null;
    };

    const readFieldValue = (field) => {
        if (field.type === 'checkbox') {
            return field.checked;
        }
        if (field.type === 'file') {
            return field.files?.[0] || null;
        }
        return field.value ?? '';
    };

    const buildPayload = () => {
        const payload = {};
        form.querySelectorAll('[data-document-field]').forEach((field) => {
            const key = field.dataset.documentField;
            if (!key) return;
            payload[key] = readFieldValue(field);
        });

        return {
            ModuleID: moduleId || window.ClientMaintenanceCore.moduleId || '',
            ClientID: window.ClientMaintenanceCore.clientId || '',
            Payload: payload
        };
    };

    const applyRowPayload = (payload) => {
        if (!payload) return;
        form.querySelectorAll('[data-document-field]').forEach((field) => {
            const key = field.dataset.documentField;
            if (!key) return;
            const value = payload[key];
            if (field.type === 'checkbox') {
                field.checked = Boolean(value);
            } else if (field.type !== 'file') {
                field.value = value ?? '';
            }
        });
        const receiverName = form.querySelector('#txt_documentReceivedByName');
        if (receiverName) {
            receiverName.value = payload.ReceivedByName || '';
        }
    };

    setFieldsEnabled(false);
    refreshDocumentsTable();

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
        setFieldsEnabled(false);
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
        setFieldsEnabled(true);
    });

    form.querySelectorAll('[data-document-action]').forEach((button) => {
        button.addEventListener('click', async () => {
            const action = button.dataset.documentAction;
            if (!action) return;

            if (action === 'new') {
                resetForm();
                setFieldsEnabled(true);
                return;
            }

            if (action === 'alter') {
                if (!state.editing) {
                    window.ClientMaintenanceCore.showToast('Select a document first.', 'warning');
                    return;
                }
                setFieldsEnabled(true);
                return;
            }

            if (action === 'clear') {
                resetForm();
                setFieldsEnabled(false);
                return;
            }

            const request = buildPayload();
            const service = window.ClientMaintenanceDocumentsService;
            const isUpdate = action === 'update' && state.editing;
            const handler = action === 'remove' ? service.delete : (isUpdate ? service.update : service.create);

            try {
                const response = await handler(request);
                const success = response?.Success ?? response?.success ?? true;
                if (!success) {
                    const error = response?.ErrorMessage || response?.errorMessage || 'Documents request failed';
                    window.ClientMaintenanceCore.showToast(error, 'error');
                    return;
                }

                window.ClientMaintenanceCore.showToast(`Documents ${action} completed`, 'success');
                resetForm();
                setFieldsEnabled(false);
                await refreshDocumentsTable();
            } catch (error) {
                window.ClientMaintenanceCore.showToast(`Documents ${action} failed - ${error.message}`, 'error');
            }
        });
    });
}

/**
 * Initialize SearchModal for finding document receivers (clients)
 */
function initDocumentsSearchModal(tabRoot, moduleId) {
    if (!tabRoot) return;
    
    const searchBtn = tabRoot.querySelector('[data-document-action="lookup-receiver"]');
    if (!searchBtn) return;
    
    // Get or create SearchModal instance
    let searchModal = window._documentsSearchModal;
    if (!searchModal && window.SearchModal) {
        searchModal = new window.SearchModal();
        window._documentsSearchModal = searchModal;
    }
    
    if (!searchModal) {
        console.warn('[Documents] SearchModal not available');
        return;
    }
    
    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const currentValue = tabRoot.querySelector('[data-document-field="ReceivedBy"]')?.value || '';
        
        searchModal.open({
            title: 'Find Document Receiver',
            tableID: 'ClientID',
            moduleID: moduleId,
            searchFields: [
                { name: 'ClientID', label: 'Client ID', column: 'ClientID', value: currentValue },
                { name: 'Name', label: 'Client Name', column: 'Name' }
            ],
            autoSearch: false,
            onSelect: (record) => {
                // Populate the received by field with the selected client ID
                const receivedByField = tabRoot.querySelector('[data-document-field="ReceivedBy"]');
                if (receivedByField) {
                    receivedByField.value = record.ClientID || '';
                }
                
                // Also update the display name if available
                const receivedByNameField = tabRoot.querySelector('#txt_documentReceivedByName');
                if (receivedByNameField) {
                    receivedByNameField.value = record.Name || '';
                }
            }
        });
    });
}
