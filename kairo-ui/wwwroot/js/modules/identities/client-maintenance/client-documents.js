const CM_DOCUMENTS_BASE = 'Identities/ClientMaintenance/Documents';

function invokeClientMaintenanceDocuments(action, requestData) {
    // For FormData payloads, pass options to prevent JSON content-type header
    // This allows the multipart/form-data header with boundary to be set by the browser
    if (requestData instanceof FormData) {
        return window.ClientMaintenanceCore.invokeControllerMethod(
            CM_DOCUMENTS_BASE,
            action,
            'POST',
            requestData,
            { skipJsonHeader: true }
        );
    }
    // For regular object payloads, use standard JSON submission
    return window.ClientMaintenanceCore.invokeControllerMethod(
        CM_DOCUMENTS_BASE,
        action,
        'POST',
        requestData || {}
    );
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
        editing: null,
        mode: 'view'
    };

    const form = tabRoot.querySelector('[data-documents-form]') || tabRoot;
    const table = tabRoot.querySelector('[data-table="documents"]');

    const setMode = (mode) => {
        state.mode = mode || 'view';
    };

    const setEntryActionButtons = (enabled) => {
        const updateBtn = tabRoot.querySelector('[data-document-action="update"]');
        const clearBtn = tabRoot.querySelector('[data-document-action="clear"]');
        if (updateBtn) updateBtn.disabled = !enabled;
        if (clearBtn) clearBtn.disabled = !enabled;
    };

    const syncDateFieldState = (field, enabled) => {
        if (!field || !field._flatpickr) {
            return;
        }

        const isDisabled = !enabled;
        try {
            field._flatpickr.set('clickOpens', enabled);
            field._flatpickr.set('allowInput', enabled);
            if (field._flatpickr.altInput) {
                field._flatpickr.altInput.disabled = isDisabled;
                field._flatpickr.altInput.readOnly = isDisabled;
            }
            if (isDisabled) {
                field._flatpickr.close();
            }
        } catch (error) {
            console.warn('[Documents] Failed to sync date field state:', error);
        }
    };

    const setFieldsEnabled = (enabled) => {
        const allowEdit = Boolean(window.ClientMaintenanceCore?.isEditMode);
        const nextEnabled = allowEdit && enabled;

        state.enabled = nextEnabled;
        form.querySelectorAll('[data-document-field]').forEach((field) => {
            field.disabled = !nextEnabled;
            syncDateFieldState(field, nextEnabled);
        });
        const lookupBtn = form.querySelector('[data-document-action="lookup-receiver"]');
        if (lookupBtn) lookupBtn.disabled = !nextEnabled;
        setEntryActionButtons(nextEnabled);
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
        ImageID: row.ImageID ?? row.ID ?? null,
        TempImageID: row.TempImageID ?? null,
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

    const refreshDocumentsTable = async (requestData) => {
        // Get client ID and request ID from parent context
        const clientId = requestData?.ClientID || window.ClientMaintenanceCore?.clientId || '';
        const requestId = requestData?.RequestID || window.ClientMaintenanceCore?.requestId || '';

        // Need at least one identifier (ClientID or RequestID) to fetch documents
        if (!clientId && !requestId) {
            renderDocumentsTable([]);
            return;
        }
        try {
            const response = await window.ClientMaintenanceDocumentsService.get({
                ModuleID: moduleId || window.ClientMaintenanceCore.moduleId || '',
                ClientID: clientId,
                RequestID: requestId
            });
            console.log(response);
            const rows = normalizeDocumentRows(extractList(response));
            console.log(rows);
            renderDocumentsTable(rows);
            setMode(rows.length > 0 ? 'edit' : 'view');
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
            } else if (field._flatpickr) {
                field._flatpickr.clear();
            } else {
                field.value = '';
            }
        });
        const receiverName = form.querySelector('#txt_documentReceivedByName');
        if (receiverName) receiverName.value = '';
        state.editing = null;
        setMode('view');
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

    const isSelectValueValid = (field) => {
        const value = String(field?.value || '').trim();
        if (!value) {
            return false;
        }

        const selectedOption = field?.options?.[field.selectedIndex];
        if (!selectedOption) {
            return false;
        }

        const optionText = String(selectedOption.text || '').trim().toLowerCase();
        const placeholderPatterns = ['select', 'choose', 'pick', 'option', '---', '...'];
        return !placeholderPatterns.some((pattern) => optionText.includes(pattern));
    };

    const focusField = (field) => {
        if (!field) {
            return;
        }

        if (field._flatpickr?.altInput) {
            field._flatpickr.altInput.focus();
            return;
        }

        field.focus();
    };

    const validateRequiredFields = (mode) => {
        const requiredFields = [
            { key: 'DocumentID', label: 'Document ID' },
            { key: 'DocumentTypeID', label: 'Document Type' },
            { key: 'LocationID', label: 'Location' },
            { key: 'ReceivedBy', label: 'Received By' },
            { key: 'ReceivedDate', label: 'Received Date' }
        ];

        const missingFields = [];
        const invalidElements = [];

        requiredFields.forEach(({ key, label }) => {
            const field = form.querySelector(`[data-document-field="${key}"]`);
            if (!field) {
                return;
            }

            const tagName = String(field.tagName || '').toLowerCase();
            const value = String(field.value || '').trim();
            const isValid = tagName === 'select' ? isSelectValueValid(field) : value.length > 0;

            if (!isValid) {
                missingFields.push(label);
                invalidElements.push(field);
            }
        });

        if (mode === 'add') {
            const fileField = form.querySelector('[data-document-field="Image"]');
            const hasFile = Boolean(fileField?.files?.length);
            if (!hasFile) {
                missingFields.push('Document File');
                if (fileField) {
                    invalidElements.push(fileField);
                }
            }
        }

        if (missingFields.length > 0) {
            window.ClientMaintenanceCore.showToast(`Please fill in required fields: ${missingFields.join(', ')}`, 'warning');
            focusField(invalidElements[0]);
            return false;
        }

        return true;
    };

    const buildPayload = () => {
        // Check if we have file uploads - if so use FormData, otherwise use plain object
        const hasFileUpload = Array.from(form.querySelectorAll('[data-document-field][type="file"]'))
            .some(field => field.files && field.files[0]);

        if (hasFileUpload) {
            // Use FormData for multipart/form-data submission
            const formData = new FormData();
            form.querySelectorAll('[data-document-field]').forEach((field) => {
                const key = field.dataset.documentField;
                if (!key) return;
                
                if (field.type === 'file') {
                    if (field.files && field.files[0]) {
                        formData.append(key, field.files[0]);
                    }
                } else if (field.type === 'checkbox') {
                    formData.append(key, field.checked ? '1' : '0');
                } else {
                    formData.append(key, field.value ?? '');
                }
            });

            const selectedImageId = state.editing?.ImageID ?? state.editing?.ID ?? null;
            const selectedTempImageId = state.editing?.TempImageID ?? null;

            if (selectedImageId !== null && selectedImageId !== undefined && selectedImageId !== '') {
                formData.append('ImageID', selectedImageId);
            }

            if (selectedTempImageId !== null && selectedTempImageId !== undefined && selectedTempImageId !== '') {
                formData.append('TempImageID', selectedTempImageId);
            }

            const requestId = window.ClientMaintenanceCore.requestId || '';
            formData.append('ModuleID', moduleId || window.ClientMaintenanceCore.moduleId || '');
            formData.append('ClientID', window.ClientMaintenanceCore.clientId || '');
            formData.append('RequestID', requestId);
            formData.append('ApplicationID', requestId);
            
            return formData;
        }
        
        // Regular object payload for non-file operations
        const payload = {};
        form.querySelectorAll('[data-document-field]').forEach((field) => {
            const key = field.dataset.documentField;
            if (!key) return;
            payload[key] = readFieldValue(field);
        });

        const selectedImageId = state.editing?.ImageID ?? state.editing?.ID ?? null;
        const selectedTempImageId = state.editing?.TempImageID ?? null;

        if (selectedImageId !== null && selectedImageId !== undefined && selectedImageId !== '') {
            payload.ImageID = selectedImageId;
        }

        if (selectedTempImageId !== null && selectedTempImageId !== undefined && selectedTempImageId !== '') {
            payload.TempImageID = selectedTempImageId;
        }

        const requestId = window.ClientMaintenanceCore.requestId || '';

        payload.ModuleID = moduleId || window.ClientMaintenanceCore.moduleId || '';
        payload.ClientID = window.ClientMaintenanceCore.clientId || '';
        payload.RequestID = requestId;
        payload.ApplicationID = requestId;

        return payload;
    };

    const fetchSingleDocumentDetails = async (rowPayload) => {
        if (!rowPayload) return rowPayload;

        const imageId = rowPayload.ImageID ?? rowPayload.ID ?? null;
        const tempImageId = rowPayload.TempImageID ?? null;
        const requestedId = imageId ?? tempImageId;

        if (requestedId === null || requestedId === undefined || requestedId === '') {
            return rowPayload;
        }

        const requestId = window.ClientMaintenanceCore.requestId || '';
        const response = await window.ClientMaintenanceDocumentsService.get({
            ModuleID: moduleId || window.ClientMaintenanceCore.moduleId || '',
            ClientID: window.ClientMaintenanceCore.clientId || '',
            RequestID: requestId,
            ApplicationID: requestId,
            Payload: {
                ImageID: requestedId,
                TempImageID: tempImageId
            }
        });

        const details = response?.Details ?? response?.data?.Details ?? response?.data ?? null;
        const single = Array.isArray(details) ? details[0] : details;
        if (!single || typeof single !== 'object') {
            return rowPayload;
        }

        return {
            ...rowPayload,
            ...single,
            ImageID: single.ImageID ?? rowPayload.ImageID ?? rowPayload.ID ?? null,
            TempImageID: single.TempImageID ?? rowPayload.TempImageID ?? null
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
    tabRoot._cmLoadData = (requestData) => refreshDocumentsTable(requestData);
    window.ClientMaintenanceCore.registerTabLoadFunction('Documents', (requestData) => refreshDocumentsTable(requestData));

    // Initialize all action buttons as disabled until edit mode
    const newBtn = tabRoot.querySelector('[data-document-action="new"]');
    if (newBtn) newBtn.disabled = true;
    enableGridRowActions(tabRoot, false);

    // Edit mode handler - called from main client maintenance view
    tabRoot._cmSetEditMode = (isEditMode) => {
        if (isEditMode) {
            // Enable New button to add documents in edit mode
            const newBtn = tabRoot.querySelector('[data-document-action="new"]');
            if (newBtn) newBtn.disabled = false;
        } else {
            // Disable action buttons when exiting edit mode
            setFieldsEnabled(false);
            const newBtn = tabRoot.querySelector('[data-document-action="new"]');
            if (newBtn) newBtn.disabled = true;
            enableGridRowActions(tabRoot, false);
        }
    };

    table?.addEventListener('click', async (event) => {
        const row = event.target.closest('tr[data-index]');
        if (!row) return;
        table.querySelectorAll('tr[data-index]').forEach((tr) => {
            tr.classList.toggle('is-selected', tr === row);
        });
        const basePayload = row.dataset.payload ? JSON.parse(row.dataset.payload) : null;
        let payload = basePayload;
        if (basePayload) {
            try {
                payload = await fetchSingleDocumentDetails(basePayload);
            } catch {
                payload = basePayload;
            }
            applyRowPayload(payload);
        }
        state.editing = payload || { index: row.dataset.index };
        setMode('edit');
        setFieldsEnabled(false);
        // Enable action buttons (update, remove, clear) when row is selected
        enableGridRowActions(tabRoot, true);
    });

    table?.addEventListener('dblclick', async (event) => {
        const row = event.target.closest('tr[data-index]');
        if (!row) return;
        table.querySelectorAll('tr[data-index]').forEach((tr) => {
            tr.classList.toggle('is-selected', tr === row);
        });
        const basePayload = row.dataset.payload ? JSON.parse(row.dataset.payload) : null;
        let payload = basePayload;
        if (basePayload) {
            try {
                payload = await fetchSingleDocumentDetails(basePayload);
            } catch {
                payload = basePayload;
            }
            applyRowPayload(payload);
        }
        state.editing = payload || { index: row.dataset.index };
        setMode('edit');
        setFieldsEnabled(true);
    });

    tabRoot.querySelectorAll('[data-document-action]').forEach((button) => {
        button.addEventListener('click', async () => {
            const action = button.dataset.documentAction;
            if (!action) return;
            if (!['new', 'alter', 'clear', 'remove', 'update'].includes(action)) {
                return;
            }

            if (action === 'new') {
                resetForm();
                setFieldsEnabled(true);
                setMode('add');
                // Disable New button after clicking
                button.disabled = true;
                return;
            }

            if (action === 'alter') {
                if (!state.editing) {
                    window.ClientMaintenanceCore.showToast('Select a document first.', 'warning');
                    return;
                }
                setFieldsEnabled(true);
                setMode('edit');
                return;
            }

            if (action === 'clear') {
                resetForm();
                setFieldsEnabled(false);
                enableGridRowActions(tabRoot, false);
                setMode('view');
                // Re-enable New button
                const newBtn = tabRoot.querySelector('[data-document-action="new"]');
                if (newBtn) newBtn.disabled = false;
                return;
            }

            // Confirm before removing
            if (action === 'remove') {
                if (!state.editing) {
                    window.ClientMaintenanceCore.showToast('Select a document to remove.', 'warning');
                    return;
                }

                const appCore = window.ClientMaintenanceCore?.getAppCore?.() || window.AppCore;
                let confirmed = false;
                if (!appCore || !appCore.showConfirmation) {
                    confirmed = window.confirm('Are you sure you want to remove this document?');
                } else {
                    confirmed = await appCore.showConfirmation(
                        'Confirm Remove',
                        'Are you sure you want to remove this document?'
                    );
                }
                if (!confirmed) return;
                setMode('delete');
            }

            const service = window.ClientMaintenanceDocumentsService;
            const mode = state.mode === 'view'
                ? (state.editing ? 'edit' : 'add')
                : state.mode;

            if ((mode === 'edit' || mode === 'delete') && !state.editing) {
                window.ClientMaintenanceCore.showToast('Select a document first.', 'warning');
                return;
            }

            if ((mode === 'add' || mode === 'edit') && !validateRequiredFields(mode)) {
                return;
            }

            const request = buildPayload();

            const handler = mode === 'delete'
                ? service.delete
                : (mode === 'edit' ? service.update : service.create);
            const actionLabel = mode === 'delete' ? 'remove' : (mode === 'edit' ? 'update' : 'create');

            try {
                const response = await handler(request);
                const success = response?.Success ?? response?.success ?? true;
                if (!success) {
                    const error = response?.ErrorMessage || response?.errorMessage || 'Documents request failed';
                    window.ClientMaintenanceCore.showToast(error, 'error');
                    return;
                }

                window.ClientMaintenanceCore.showToast(`Documents ${actionLabel} completed`, 'success');
                resetForm();
                setFieldsEnabled(false);
                enableGridRowActions(tabRoot, false);
                setMode('view');
                // Re-enable New button after successful save
                const newBtn = tabRoot.querySelector('[data-document-action="new"]');
                if (newBtn) newBtn.disabled = false;
                await refreshDocumentsTable();
            } catch (error) {
                window.ClientMaintenanceCore.showToast(`Documents ${actionLabel} failed - ${error.message}`, 'error');
            }
        });
    });
}

/**
 * Initialize SearchModal for finding document receivers (clients)
 */
function initDocumentsSearchModal(tabRoot, moduleId) {
    if (!tabRoot) return;

    const receivedByField = tabRoot.querySelector('[data-document-field="ReceivedBy"]');
    const receivedByNameField = tabRoot.querySelector('#txt_documentReceivedByName');
    const searchBtn = tabRoot.querySelector('[data-document-action="lookup-receiver"]');
    if (!searchBtn || !receivedByField || !receivedByNameField) return;

    const appCore = window.ClientMaintenanceCore?.getAppCore?.() || window.AppCore;
    if (!appCore) {
        console.warn('[Documents] AppCore not available for SearchModal');
        return;
    }

    // Get or create SearchModal instance
    let searchModal = window._documentsSearchModal;
    if (!searchModal && window.SearchModal) {
        searchModal = new window.SearchModal(appCore);
        window._documentsSearchModal = searchModal;
    }

    if (!searchModal) {
        console.warn('[Documents] SearchModal not available');
        return;
    }

    const setReceivedByFields = (record, fallbackId = '') => {
        const receiverId = record?.OperatorID || record?.LoginID || record?.UserID || record?.UserId || fallbackId;
        const receiverName = record?.ClientName || record?.Name || record?.UserName || record?.FullName || '';

        receivedByField.value = receiverId;
        receivedByNameField.value = receiverName;
    };

    let receiverLookupInFlight = false;

    const autoLoadReceivedByNameFromId = async () => {
        const typedOperatorId = String(receivedByField.value || '').trim();
        if (!typedOperatorId) {
            receivedByNameField.value = '';
            return;
        }

        if (receivedByField.readOnly || receivedByField.disabled || receiverLookupInFlight) {
            return;
        }

        const lookupIdDescription = window.ClientMaintenanceCore?.lookupIdDescription;
        if (typeof lookupIdDescription !== 'function') {
            return;
        }

        receiverLookupInFlight = true;
        try {
            const result = await lookupIdDescription({
                controlTypeId: 'OperatorID',
                id: typedOperatorId,
                bankId: '00',
                typeId: '',
                advanceFilter: '',
                moduleId: String(moduleId || window.ClientMaintenanceCore?.moduleId || ''),
                descriptionFieldCandidates: ['ClientName', 'Name', 'UserName', 'FullName']
            });

            const record = result?.record;
            if (!record) {
                receivedByNameField.value = '';
                return;
            }

            setReceivedByFields(record, typedOperatorId);
        } catch (error) {
            console.warn('[Documents] Failed to auto-load receiver name from ID:', error);
        } finally {
            receiverLookupInFlight = false;
        }
    };

    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const currentValue = receivedByField.value || '';

        searchModal.open({
            title: 'Find User for Document Receiver',
            tableID: 'OperatorID',
            moduleID: moduleId,
            searchFields: [
                { name: 'OperatorID', label: 'Operator ID', column: 'OperatorID', value: currentValue },
                { name: 'ClientName', label: 'User Name', column: 'ClientName' }
            ],
            autoSearch: false,
            onSelect: (record) => {
                setReceivedByFields(record);
            }
        });
    });

    receivedByField.addEventListener('blur', (e) => {
        const relatedTarget = e.relatedTarget;
        if (relatedTarget instanceof HTMLElement && relatedTarget.matches('[data-document-action="lookup-receiver"]')) {
            return;
        }

        void autoLoadReceivedByNameFromId();
    });

    receivedByField.addEventListener('keydown', (e) => {
        if (e.key === 'F2') {
            e.preventDefault();
            searchBtn.click();
        }
    });
}
