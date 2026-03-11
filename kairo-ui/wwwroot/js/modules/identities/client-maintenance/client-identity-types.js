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
            tr.innerHTML = '<td colspan="7" class="text-center text-muted py-3">No identity types registered</td>';
            tbody.appendChild(tr);
            return;
        }

        records.forEach((record, index) => {
            const tr = document.createElement('tr');
            tr.dataset.recordIndex = index;
            tr.style.cursor = 'pointer';

            const idTypeName = record?.Description || record?.IdentityType || record?.IdentityTypeID || '-';
            const idNo = record?.IdentificationNo || record?.IDNumber || '-';
            const format = record?.Format || record?.IDFormat || '-';
            const issueDate = record?.IssueDate
                ? formatDate(record.IssueDate)
                : '-';
            const placeOfIssue = record?.PlaceOfIssue || '-';
            const serialNo = record?.SerialNo || '-';

            tr.innerHTML = `
                <td class="ps-2">${escapeHtml(idTypeName)}</td>
                <td>${escapeHtml(idNo)}</td>
                <td>${escapeHtml(format)}</td>
                <td>${escapeHtml(issueDate)}</td>
                <td>${escapeHtml(placeOfIssue)}</td>
                <td>${escapeHtml(serialNo)}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-primary" data-identitytype-action="select" data-record-index="${index}" title="Select">
                        <i class="bi bi-check2"></i>
                    </button>
                </td>
            `;

            tr.addEventListener('click', (e) => {
                if (e.target.closest('[data-identitytype-action="select"]')) return;
                selectRecord(records[index], tr);
            });

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
            field.value = value.split('T')[0];
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
        setFieldValue('ddl_identityType', record.IdentityTypeID);
        setFieldValue('txt_identityFormat', record.Format);
        setFieldValue('txt_identityNumber', record.IdentificationNo || record.IDNumber);
        setFieldValue('txt_identitySerialNo', record.SerialNo);
        setFieldValue('txt_identityPlaceOfIssue', record.PlaceOfIssue);
        setFieldValue('dt_identityIssueDate', record.IssueDate);
        setFieldValue('txt_identityLocation', record.Location);
        setFieldValue('txt_identityDocumentImage', record.DocumentImage || '');
    };

    const clearForm = () => {
        form?.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(f => {
            if (f.type === 'checkbox') f.checked = false;
            else f.value = '';
        });
        setFieldValue('hdn_identityTypeId', '');
        state.selectedRecord = null;
        tbody?.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
    };

    const getFormData = () => ({
        ClientIdentityTypeID: getFieldValue('hdn_identityTypeId'),
        IdentityTypeID: getFieldValue('ddl_identityType'),
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
        if (!getFieldValue('ddl_identityType')) errors.push('Identification Type is required');
        if (!getFieldValue('txt_identityNumber')) errors.push('Identification Number is required');
        if (errors.length > 0) {
            window.ClientMaintenanceCore?.showToast(errors.join(', '), 'error');
            return false;
        }
        return true;
    };

    // ──────────────────────────────────────────────────────────
    // FORM STATE (view / add / edit)
    // ──────────────────────────────────────────────────────────
    const setFormState = (mode) => {
        state.mode = mode;

        const newBtn = tabRoot.querySelector('[data-identitytype-action="new"]');
        const alterBtn = tabRoot.querySelector('[data-identitytype-action="alter"]');
        const removeBtn = tabRoot.querySelector('[data-identitytype-action="remove"]');
        const updateBtn = tabRoot.querySelector('[data-identitytype-action="update"]');
        const clearBtn = tabRoot.querySelector('[data-identitytype-action="clear"]');

        const fields = form?.querySelectorAll('input:not([type="hidden"]), select, textarea');
        const allowEdit = Boolean(window.ClientMaintenanceCore?.isEditMode);

        if (!allowEdit) {
            fields?.forEach(f => f.disabled = true);
            [newBtn, alterBtn, removeBtn, updateBtn, clearBtn].forEach(b => { if (b) b.disabled = true; });
            return;
        }

        if (mode === 'view') {
            fields?.forEach(f => f.disabled = true);
            if (newBtn) newBtn.disabled = false;
            if (alterBtn) alterBtn.disabled = !state.selectedRecord;
            if (removeBtn) removeBtn.disabled = !state.selectedRecord;
            if (updateBtn) updateBtn.disabled = true;
            if (clearBtn) clearBtn.disabled = false;
        } else if (mode === 'add' || mode === 'edit') {
            fields?.forEach(f => f.disabled = false);
            if (newBtn) newBtn.disabled = true;
            if (alterBtn) alterBtn.disabled = true;
            if (removeBtn) removeBtn.disabled = true;
            if (updateBtn) updateBtn.disabled = false;
            if (clearBtn) clearBtn.disabled = false;
        }
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
        // Handle single-object response
        const obj = response?.Details01 || response?.data?.Details01;
        if (obj) return Array.isArray(obj) ? obj : [obj];
        return [];
    };

    const refreshTable = async (requestData) => {
        try {
            const response = await window.ClientMaintenanceIdentityTypesService.get({
                ModuleID: moduleId || window.ClientMaintenanceCore?.moduleId || '',
                ClientID: requestData?.ClientID || window.ClientMaintenanceCore?.clientId || '',
                RequestID: requestData?.RequestID || window.ClientMaintenanceCore?.requestId || ''
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

        const confirmed = await window.ClientMaintenanceCore?.showDialog?.(
            'Delete Identity Type',
            'Are you sure you want to delete this identity type record?',
            'YesNo'
        ) ?? confirm('Are you sure you want to delete this identity type record?');

        if (!confirmed) return;

        try {
            const response = await window.ClientMaintenanceIdentityTypesService.delete({
                ModuleID: moduleId || window.ClientMaintenanceCore?.moduleId || '',
                ClientID: window.ClientMaintenanceCore?.clientId || '',
                RequestID: window.ClientMaintenanceCore?.requestId || '',
                ClientIdentityTypeID: state.selectedRecord.ClientIdentityTypeID || state.selectedRecord.ID
            });

            if (response?.ResponseCode === '00' || response?.responseCode === '00' || response?.Success || response?.success) {
                window.ClientMaintenanceCore?.showToast('Identity type deleted successfully', 'success');
                clearForm();
                await refreshTable({});
            } else {
                window.ClientMaintenanceCore?.showToast(response?.ResponseMessage || response?.ErrorMessage || response?.message || 'Delete failed', 'error');
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
            } else if (state.mode === 'edit') {
                response = await window.ClientMaintenanceIdentityTypesService.update({
                    ModuleID: moduleId || window.ClientMaintenanceCore?.moduleId || '',
                    ClientID: window.ClientMaintenanceCore?.clientId || '',
                    RequestID: window.ClientMaintenanceCore?.requestId || '',
                    ...formData
                });
            }

            if (response?.ResponseCode === '00' || response?.responseCode === '00' || response?.Success || response?.success) {
                window.ClientMaintenanceCore?.showToast(
                    `Identity type ${state.mode === 'add' ? 'created' : 'updated'} successfully`,
                    'success'
                );
                clearForm();
                await refreshTable({});
            } else {
                window.ClientMaintenanceCore?.showToast(
                    response?.ResponseMessage || response?.ErrorMessage || response?.message || 'Update failed',
                    'error'
                );
            }
        } catch (error) {
            console.error('[IdentityTypes] Update error:', error);
            window.ClientMaintenanceCore?.showToast?.(`Update failed - ${error.message}`, 'error');
        }
    };

    const handleClear = () => {
        clearForm();
        setFormState('view');
    };

    // ──────────────────────────────────────────────────────────
    // EVENT LISTENERS
    // ──────────────────────────────────────────────────────────
    tabRoot.querySelectorAll('[data-identitytype-action="new"]').forEach(btn => btn.addEventListener('click', handleNew));
    tabRoot.querySelectorAll('[data-identitytype-action="alter"]').forEach(btn => btn.addEventListener('click', handleAlter));
    tabRoot.querySelectorAll('[data-identitytype-action="remove"]').forEach(btn => btn.addEventListener('click', handleRemove));
    tabRoot.querySelectorAll('[data-identitytype-action="update"]').forEach(btn => btn.addEventListener('click', handleUpdate));
    tabRoot.querySelectorAll('[data-identitytype-action="clear"]').forEach(btn => btn.addEventListener('click', handleClear));

    tbody?.addEventListener('click', (e) => {
        const selectBtn = e.target.closest('[data-identitytype-action="select"]');
        if (selectBtn) {
            const index = parseInt(selectBtn.dataset.recordIndex);
            if (!isNaN(index) && state.records[index]) {
                const row = selectBtn.closest('tr');
                selectRecord(state.records[index], row);
            }
        }
    });

    // ──────────────────────────────────────────────────────────
    // EXTERNAL HOOKS (called by client-maintenance.js)
    // ──────────────────────────────────────────────────────────
    tabRoot._cmLoadData = (requestData) => refreshTable(requestData || {});

    // Initial state
    setFormState('view');
    refreshTable({});
};

// ──────────────────────────────────────────────────────────
// UTILITIES
// ──────────────────────────────────────────────────────────
function escapeHtmlIdentityTypes(value) {
    const text = String(value ?? '');
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Locally scoped alias so we don't clash with any global escapeHtml
const escapeHtml = (typeof window.escapeHtml === 'function')
    ? window.escapeHtml
    : escapeHtmlIdentityTypes;

function formatDate(dateString) {
    if (!dateString) return '-';
    if (String(dateString).startsWith('1900') || String(dateString).startsWith('0001')) return '-';
    try {
        return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return dateString;
    }
}
