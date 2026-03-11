const CM_IDENTITY_TYPES_BASE = 'Identities/ClientMaintenance/IdentityTypes';

function invokeClientMaintenanceIdentityTypes(action, requestData) {
    return window.ClientMaintenanceCore.invokeControllerMethod(CM_IDENTITY_TYPES_BASE, action, 'POST', requestData || {});
}

window.ClientMaintenanceIdentityTypesService = {
    get: (requestData) => invokeClientMaintenanceIdentityTypes('get', requestData),
    create: (requestData) => invokeClientMaintenanceIdentityTypes('create', requestData),
    update: (requestData) => invokeClientMaintenanceIdentityTypes('update', requestData),
    delete: (requestData) => invokeClientMaintenanceIdentityTypes('delete', requestData)
};

window.initClientMaintenanceIdentityTypesTab = function (tabRoot, moduleId) {
    if (!tabRoot) return;

    const state = {
        records: [],
        selectedRecord: null,
        mode: 'view'
    };

    const form = tabRoot.querySelector('[data-identitytypes-form]');
    const tbody = tabRoot.querySelector('[data-identitytypes-body]');

    // ──────────────────────────────────────────────────────────
    // TABLE RENDERING
    // ──────────────────────────────────────────────────────────
    const renderTable = (records) => {
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!Array.isArray(records) || records.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="3" class="text-center text-muted py-3">No identity types registered</td>';
            tbody.appendChild(tr);
            return;
        }

        records.forEach((record, index) => {
            const tr = document.createElement('tr');
            tr.dataset.recordIndex = index;
            tr.style.cursor = 'pointer';

            const idTypeName = escapeHtmlIT(record?.Description || record?.IdentityType || record?.IdentityTypeID || '-');
            const idNo = escapeHtmlIT(record?.IdentificationNo || record?.IDNumber || '-');
            const format = escapeHtmlIT(record?.Format || record?.IDFormat || '-');

            tr.innerHTML = `
                <td class="ps-2">${idTypeName}</td>
                <td>${idNo}</td>
                <td>${format}</td>
            `;

            tr.addEventListener('click', () => selectRecord(records[index], tr));

            tbody.appendChild(tr);
        });
    };

    // ──────────────────────────────────────────────────────────
    // SELECTION
    // ──────────────────────────────────────────────────────────
    const selectRecord = (record, rowEl) => {
        tbody?.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
        rowEl?.classList.add('table-active');
        state.selectedRecord = record;
        populateForm(record);
        populateAuditFields(record);
        setFormState('view');
    };

    // ──────────────────────────────────────────────────────────
    // FORM HELPERS
    // ──────────────────────────────────────────────────────────
    const setFieldValue = (id, value) => {
        const field = form?.querySelector(`#${id}`);
        if (!field) return;
        if (field.tagName === 'SELECT') {
            field.value = value || '';
        } else if (field.type === 'checkbox') {
            field.checked = Boolean(value);
        } else if (field.type === 'date' && value) {
            field.value = String(value).split('T')[0];
        } else {
            field.value = value || '';
        }
    };

    const getFieldValue = (id) => {
        const field = form?.querySelector(`#${id}`);
        if (!field) return '';
        if (field.type === 'checkbox') return field.checked;
        return field.value || '';
    };

    const populateForm = (record) => {
        if (!record) return;
        setFieldValue('hdn_identityTypeId', record.ClientIdentityTypeID || record.ID || '');
        setFieldValue('txt_identityType', record.IdentityTypeID || '');
        setFieldValue('txt_identityTypeName', record.Description || record.IdentityType || '');
        setFieldValue('txt_identityFormat', record.Format || '');
        setFieldValue('txt_identityNumber', record.IdentificationNo || record.IDNumber || '');
        setFieldValue('txt_identitySerialNo', record.SerialNo || '');
        setFieldValue('txt_identityPlaceOfIssue', record.PlaceOfIssue || '');
        setFieldValue('dt_identityIssueDate', record.IssueDate || '');
        setFieldValue('txt_identityLocation', record.Location || '');
        setFieldValue('txt_identityDocumentImage', record.DocumentImage || '');
    };

    const populateAuditFields = (record) => {
        const root = tabRoot;
        const setText = (id, val) => {
            const el = root.querySelector(`#${id}`) || document.getElementById(id);
            if (el) el.textContent = formatDateDisplay(val) || '-';
        };
        const setTextRaw = (id, val) => {
            const el = root.querySelector(`#${id}`) || document.getElementById(id);
            if (el) el.textContent = val || '-';
        };
        setTextRaw('idt_auditCreatedBy', record?.CreatedBy);
        setText('idt_auditCreatedOn', record?.CreatedOn);
        setTextRaw('idt_auditModifiedBy', record?.ModifiedBy);
        setText('idt_auditModifiedOn', record?.ModifiedOn);
        setTextRaw('idt_auditSupervisedBy', record?.SupervisedBy);
        setText('idt_auditSupervisedOn', record?.SupervisedOn);
    };

    const clearAuditFields = () => {
        ['idt_auditCreatedBy', 'idt_auditCreatedOn', 'idt_auditModifiedBy',
         'idt_auditModifiedOn', 'idt_auditSupervisedBy', 'idt_auditSupervisedOn'].forEach(id => {
            const el = tabRoot.querySelector(`#${id}`) || document.getElementById(id);
            if (el) el.textContent = '-';
        });
    };

    const clearForm = () => {
        form?.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(f => {
            if (f.type === 'checkbox') f.checked = false;
            else f.value = '';
        });
        setFieldValue('hdn_identityTypeId', '');
        state.selectedRecord = null;
        tbody?.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
        clearAuditFields();
    };

    const getFormData = () => ({
        ClientIdentityTypeID: getFieldValue('hdn_identityTypeId'),
        IdentityTypeID: getFieldValue('txt_identityType'),
        Format: getFieldValue('txt_identityFormat'),
        IdentificationNo: getFieldValue('txt_identityNumber'),
        SerialNo: getFieldValue('txt_identitySerialNo'),
        PlaceOfIssue: getFieldValue('txt_identityPlaceOfIssue'),
        IssueDate: getFieldValue('dt_identityIssueDate'),
        Location: getFieldValue('txt_identityLocation'),
        DocumentImage: getFieldValue('txt_identityDocumentImage')
    });

    // ──────────────────────────────────────────────────────────
    // VALIDATION
    // ──────────────────────────────────────────────────────────
    const validateForm = () => {
        const errors = [];
        if (!getFieldValue('txt_identityType')) errors.push('Identification Type is required');
        if (!getFieldValue('txt_identityNumber')) errors.push('Identification Number is required');
        if (errors.length > 0) {
            window.ClientMaintenanceCore?.showToast(errors.join(', '), 'error');
            return false;
        }
        return true;
    };

    // ──────────────────────────────────────────────────────────
    // FORM STATE
    // ──────────────────────────────────────────────────────────
    const setFormState = (mode) => {
        state.mode = mode;

        const newBtn = tabRoot.querySelector('[data-identitytype-action="new"]');
        const alterBtn = tabRoot.querySelector('[data-identitytype-action="alter"]');
        const removeBtn = tabRoot.querySelector('[data-identitytype-action="remove"]');
        const updateBtn = tabRoot.querySelector('[data-identitytype-action="update"]');
        const clearBtn = tabRoot.querySelector('[data-identitytype-action="clear"]');
        const lookupBtn = tabRoot.querySelector('[data-identitytype-action="lookup-type"]');

        const fields = form?.querySelectorAll('input:not([type="hidden"]):not([data-identitytype-action]), select, textarea');
        const allowEdit = Boolean(window.ClientMaintenanceCore?.isEditMode);

        if (!allowEdit) {
            fields?.forEach(f => { f.disabled = true; f.readOnly = true; });
            if (lookupBtn) lookupBtn.disabled = true;
            [newBtn, alterBtn, removeBtn, updateBtn, clearBtn].forEach(b => { if (b) b.disabled = true; });
            return;
        }

        if (mode === 'view') {
            fields?.forEach(f => { f.disabled = true; f.readOnly = true; });
            if (lookupBtn) lookupBtn.disabled = true;
            if (newBtn) newBtn.disabled = false;
            if (alterBtn) alterBtn.disabled = !state.selectedRecord;
            if (removeBtn) removeBtn.disabled = !state.selectedRecord;
            if (updateBtn) updateBtn.disabled = true;
            if (clearBtn) clearBtn.disabled = !state.selectedRecord;
        } else if (mode === 'add' || mode === 'edit') {
            fields?.forEach(f => { f.disabled = false; f.readOnly = false; });
            if (lookupBtn) lookupBtn.disabled = false;
            if (newBtn) newBtn.disabled = true;
            if (alterBtn) alterBtn.disabled = true;
            if (removeBtn) removeBtn.disabled = true;
            if (updateBtn) updateBtn.disabled = false;
            if (clearBtn) clearBtn.disabled = false;
        }
    };

    // ──────────────────────────────────────────────────────────
    // IDENTITY TYPE LOOKUP
    // ──────────────────────────────────────────────────────────
    const openIdentityTypeLookup = () => {
        if (state.mode === 'view') return;

        const appCore = window.ClientMaintenanceCore?.getAppCore?.() || window.AppCore;
        if (!appCore || !window.SearchModal) {
            console.warn('[IdentityTypes] SearchModal not available');
            return;
        }

        let searchModal = window._identityTypeSearchModal;
        if (!searchModal) {
            searchModal = new window.SearchModal(appCore);
            window._identityTypeSearchModal = searchModal;
        }

        searchModal.open({
            title: 'Search Identification Type',
            tableID: 'IdentityType',
            moduleID: moduleId || window.ClientMaintenanceCore?.moduleId || '',
            searchFields: [
                { name: 'IdentityTypeID', label: 'Type Code', column: 'IdentityTypeID' },
                { name: 'Description', label: 'Description', column: 'Description' }
            ],
            autoSearch: true,
            onSelect: (record) => {
                if (!record) return;
                const code = record?.IdentityTypeID || record?.Code || record?.ID || record?.Value || '';
                const description = record?.Description || record?.Name || record?.Text || code;
                const format = record?.Format || record?.IDFormat || '';

                setFieldValue('txt_identityType', code);
                setFieldValue('txt_identityTypeName', description);
                if (format) setFieldValue('txt_identityFormat', format);

                const numberInput = form?.querySelector('#txt_identityNumber');
                if (numberInput) numberInput.focus();
            }
        });
    };

    // ──────────────────────────────────────────────────────────
    // DATA LOADING
    // ──────────────────────────────────────────────────────────
    const extractRecords = (response) => {
        const candidates = [
            response?.Details,
            response?.details,
            response?.data?.Details,
            response?.data?.details,
            response?.Data,
            response?.data
        ];
        for (const c of candidates) {
            if (Array.isArray(c)) return c;
        }
        const obj = response?.Details01 || response?.data?.Details01;
        if (obj) return Array.isArray(obj) ? obj : [obj];
        return [];
    };

    const refreshTable = async (requestData) => {
        try {
            const response = await window.ClientMaintenanceIdentityTypesService.get({
                ModuleID: moduleId || window.ClientMaintenanceCore?.moduleId || '',
                ClientID: requestData?.ClientID || requestData?.clientId || window.ClientMaintenanceCore?.clientId || '',
                RequestID: requestData?.RequestID || requestData?.requestId || window.ClientMaintenanceCore?.requestId || ''
            });
            const records = extractRecords(response);
            state.records = records;
            renderTable(records);
            setFormState('view');
        } catch (error) {
            console.error('[IdentityTypes] Load failed:', error);
            window.ClientMaintenanceCore?.showToast?.(`Failed to load identity types - ${error.message}`, 'error');
            state.records = [];
            renderTable([]);
        }
    };

    // ──────────────────────────────────────────────────────────
    // ACTION HANDLERS
    // ──────────────────────────────────────────────────────────
    const handleNew = () => {
        clearForm();
        setFormState('add');
        tabRoot.querySelector('#txt_identityType')?.focus();
        window.ClientMaintenanceCore?.showToast('Enter new identity type details', 'info');
    };

    const handleAlter = () => {
        if (!state.selectedRecord) {
            window.ClientMaintenanceCore?.showToast('Please select an identity type to edit', 'warning');
            return;
        }
        setFormState('edit');
    };

    const handleRemove = async () => {
        if (!state.selectedRecord) {
            window.ClientMaintenanceCore?.showToast('Please select an identity type to remove', 'warning');
            return;
        }

        const confirmed = typeof window.ClientMaintenanceCore?.showDialog === 'function'
            ? await window.ClientMaintenanceCore.showDialog(
                'Delete Identity Type',
                'Are you sure you want to delete this identity type record?',
                'YesNo'
            )
            : confirm('Are you sure you want to delete this identity type record?');

        if (!confirmed) return;

        try {
            const response = await window.ClientMaintenanceIdentityTypesService.delete({
                ModuleID: moduleId || window.ClientMaintenanceCore?.moduleId || '',
                ClientID: window.ClientMaintenanceCore?.clientId || '',
                RequestID: window.ClientMaintenanceCore?.requestId || '',
                ClientIdentityTypeID: state.selectedRecord.ClientIdentityTypeID || state.selectedRecord.ID
            });

            if (response?.ResponseCode === '00' || response?.responseCode === '00' ||
                response?.Success || response?.success) {
                window.ClientMaintenanceCore?.showToast('Identity type deleted successfully', 'success');
                clearForm();
                await refreshTable({});
            } else {
                window.ClientMaintenanceCore?.showToast(
                    response?.ResponseMessage || response?.ErrorMessage || response?.message || 'Delete failed', 'error'
                );
            }
        } catch (error) {
            console.error('[IdentityTypes] Delete error:', error);
            window.ClientMaintenanceCore?.showToast?.(`Delete failed - ${error.message}`, 'error');
        }
    };

    const handleUpdate = async () => {
        if (!validateForm()) return;
        const formData = getFormData();

        try {
            let response;
            if (state.mode === 'add') {
                response = await window.ClientMaintenanceIdentityTypesService.create({
                    ModuleID: moduleId || window.ClientMaintenanceCore?.moduleId || '',
                    ClientID: window.ClientMaintenanceCore?.clientId || '',
                    RequestID: window.ClientMaintenanceCore?.requestId || '',
                    ...formData
                });
            } else {
                response = await window.ClientMaintenanceIdentityTypesService.update({
                    ModuleID: moduleId || window.ClientMaintenanceCore?.moduleId || '',
                    ClientID: window.ClientMaintenanceCore?.clientId || '',
                    RequestID: window.ClientMaintenanceCore?.requestId || '',
                    ...formData
                });
            }

            if (response?.ResponseCode === '00' || response?.responseCode === '00' ||
                response?.Success || response?.success) {
                window.ClientMaintenanceCore?.showToast(
                    `Identity type ${state.mode === 'add' ? 'created' : 'updated'} successfully`, 'success'
                );
                clearForm();
                await refreshTable({});
            } else {
                window.ClientMaintenanceCore?.showToast(
                    response?.ResponseMessage || response?.ErrorMessage || response?.message || 'Save failed', 'error'
                );
            }
        } catch (error) {
            console.error('[IdentityTypes] Save error:', error);
            window.ClientMaintenanceCore?.showToast?.(`Save failed - ${error.message}`, 'error');
        }
    };

    const handleClear = () => {
        clearForm();
        setFormState('view');
    };

    const handleRefresh = () => refreshTable({});

    const handleClose = () => {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'CLOSE_DATAENTRY' }, '*');
        }
    };

    // ──────────────────────────────────────────────────────────
    // EVENT LISTENERS
    // ──────────────────────────────────────────────────────────
    tabRoot.querySelectorAll('[data-identitytype-action="new"]').forEach(b => b.addEventListener('click', handleNew));
    tabRoot.querySelectorAll('[data-identitytype-action="alter"]').forEach(b => b.addEventListener('click', handleAlter));
    tabRoot.querySelectorAll('[data-identitytype-action="remove"]').forEach(b => b.addEventListener('click', handleRemove));
    tabRoot.querySelectorAll('[data-identitytype-action="update"]').forEach(b => b.addEventListener('click', handleUpdate));
    tabRoot.querySelectorAll('[data-identitytype-action="clear"]').forEach(b => b.addEventListener('click', handleClear));
    tabRoot.querySelectorAll('[data-identitytype-action="refresh"]').forEach(b => b.addEventListener('click', handleRefresh));
    tabRoot.querySelectorAll('[data-identitytype-action="close"]').forEach(b => b.addEventListener('click', handleClose));
    tabRoot.querySelectorAll('[data-identitytype-action="lookup-type"]').forEach(b => b.addEventListener('click', openIdentityTypeLookup));

    // ──────────────────────────────────────────────────────────
    // EXTERNAL HOOKS
    // ──────────────────────────────────────────────────────────
    tabRoot._cmLoadData = (requestData) => refreshTable(requestData || {});

    // Initial state
    setFormState('view');
    refreshTable({});
};

// ──────────────────────────────────────────────────────────
// UTILITIES
// ──────────────────────────────────────────────────────────
function escapeHtmlIT(value) {
    const text = String(value ?? '');
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDateDisplay(dateString) {
    if (!dateString) return '-';
    const str = String(dateString);
    if (str.startsWith('1900') || str.startsWith('0001')) return '-';
    try {
        return new Date(dateString).toLocaleString();
    } catch {
        return dateString;
    }
}
