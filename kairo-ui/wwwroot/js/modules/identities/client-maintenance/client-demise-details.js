const CM_DEMISE_DETAILS_BASE = 'Identities/ClientMaintenance/DemiseDetails';

function invokeClientMaintenanceDemiseDetails(action, requestData) {
    return window.ClientMaintenanceCore.invokeControllerMethod(CM_DEMISE_DETAILS_BASE, action, 'POST', requestData || {});
}

window.ClientMaintenanceDemiseDetailsService = {
    get: (requestData) => invokeClientMaintenanceDemiseDetails('get', requestData),
    create: (requestData) => invokeClientMaintenanceDemiseDetails('create', requestData),
    update: (requestData) => invokeClientMaintenanceDemiseDetails('update', requestData),
    delete: (requestData) => invokeClientMaintenanceDemiseDetails('delete', requestData)
};

window.initClientMaintenanceDemiseDetails = function (moduleRoot, moduleId) {
    if (!moduleRoot) return;

    const state = {
        details: [],
        selectedDetail: null,
        mode: 'view'
    };

    const form = moduleRoot.querySelector('[data-demisedetails-form]');
    const table = moduleRoot.querySelector('[data-table="demise-details"]');
    const tbody = table?.querySelector('[data-demisedetails-body]');

    const renderTable = (details) => {
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!Array.isArray(details) || details.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="6" class="text-center text-muted py-3">No demise details registered</td>';
            tbody.appendChild(tr);
            return;
        }

        details.forEach((detail, index) => {
            const tr = document.createElement('tr');
            tr.dataset.detailIndex = index;
            tr.style.cursor = 'pointer';

            const demiseDate = detail?.DemiseDate ? formatDate(detail.DemiseDate) : '';
            const reason = detail?.ReasonName || detail?.Reason || '';
            const documentProof = detail?.DocumentProofName || detail?.DocumentProof || '';
            const notificationDate = detail?.NotificationDate ? formatDate(detail.NotificationDate) : '';
            const remarks = detail?.Remarks || '';

            tr.innerHTML = `
                <td class="ps-2">${escapeHtml(demiseDate)}</td>
                <td>${escapeHtml(reason)}</td>
                <td>${escapeHtml(documentProof)}</td>
                <td>${escapeHtml(notificationDate)}</td>
                <td>${escapeHtml(remarks)}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-link p-0" data-demisedetail-action="select-row" data-detail-index="${index}"
                        title="Select this record" aria-label="Select demise detail">
                        <i class="bi bi-hand-index"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });
    };

    const clearForm = () => {
        if (!form) return;
        form.reset();
        form.querySelector('#hdn_demiseDetailId').value = '';
        state.selectedDetail = null;
        highlightSelectedRow(null);
    };

    const populateForm = (detail) => {
        if (!form || !detail) return;

        form.querySelector('#hdn_demiseDetailId').value = detail?.DemiseDetailID || detail?.ID || '';
        form.querySelector('#txt_demiseDate').value = detail?.DemiseDate ? formatDateForInput(detail.DemiseDate) : '';
        form.querySelector('#ddl_reasonId').value = detail?.ReasonID || '';
        form.querySelector('#ddl_documentProofId').value = detail?.DocumentProofID || '';
        form.querySelector('#txt_notificationDate').value = detail?.NotificationDate ? formatDateForInput(detail.NotificationDate) : '';
        form.querySelector('#txt_documentImage').value = detail?.DocumentImage || '';
        form.querySelector('#txa_remarks').value = detail?.Remarks || '';
    };

    const setFormState = (mode) => {
        state.mode = mode;
        const isView = mode === 'view';
        const isAdd = mode === 'add';
        const isEdit = mode === 'edit';

        // Form fields
        const fields = form?.querySelectorAll('input:not([type="hidden"]), select, textarea');
        fields?.forEach(field => {
            field.disabled = isView;
            if (field.id === 'txt_documentImage') {
                field.readOnly = true; // Always readonly, file selected via browse
            }
        });

        // Buttons
        toggleButton('#btn_addDemiseDetail', isView);
        toggleButton('#btn_editDemiseDetail', isView && state.selectedDetail !== null);
        toggleButton('#btn_deleteDemiseDetail', isView && state.selectedDetail !== null);
        toggleButton('#btn_saveDemiseDetail', !isView);
        toggleButton('#btn_cancelDemiseDetail', !isView);

        if (isView) {
            clearForm();
        }
    };

    const toggleButton = (selector, enabled) => {
        const btn = moduleRoot.querySelector(selector);
        if (btn) {
            btn.disabled = !enabled;
            btn.style.display = enabled ? '' : 'none';
        }
    };

    const highlightSelectedRow = (row) => {
        tbody?.querySelectorAll('tr').forEach(tr => tr.classList.remove('table-active'));
        if (row) row.classList.add('table-active');
    };

    const selectDetail = (detail, row) => {
        state.selectedDetail = detail;
        populateForm(detail);
        highlightSelectedRow(row);
        setFormState('view');
    };

    const refreshTable = async (requestData = {}) => {
        try {
            const clientId = window.ClientMaintenanceCore?.getClientId?.() || requestData?.ClientID;
            if (!clientId) {
                console.warn('No ClientID available for demise details');
                renderTable([]);
                return;
            }

            const payload = {
                ClientID: clientId,
                ModuleID: moduleId,
                ...requestData
            };

            const result = await window.ClientMaintenanceDemiseDetailsService.get(payload);

            if (result?.success || result?.Success) {
                const data = result?.data || result?.Data || [];
                state.details = Array.isArray(data) ? data : [];
                renderTable(state.details);
            } else {
                console.error('Failed to load demise details:', result?.message || result?.ErrorMessage);
                renderTable([]);
            }
        } catch (error) {
            console.error('Error loading demise details:', error);
            renderTable([]);
        }
    };

    const handleAdd = () => {
        clearForm();
        state.selectedDetail = null;
        setFormState('add');
    };

    const handleEdit = () => {
        if (!state.selectedDetail) {
            window.ToastManager?.showWarning('Please select a record to edit');
            return;
        }
        setFormState('edit');
    };

    const handleSave = async () => {
        if (!form) return;

        const formData = getFormData();
        if (!validateForm(formData)) return;

        const clientId = window.ClientMaintenanceCore?.getClientId?.();
        if (!clientId) {
            window.ToastManager?.showError('Client ID is required');
            return;
        }

        const isUpdate = state.mode === 'edit' && formData.demiseDetailId;
        const payload = {
            ClientID: clientId,
            ModuleID: moduleId,
            DemiseDetailID: formData.demiseDetailId || null,
            DemiseDate: formData.demiseDate,
            ReasonID: formData.reasonId,
            DocumentProofID: formData.documentProofId,
            NotificationDate: formData.notificationDate,
            DocumentImage: formData.documentImage,
            Remarks: formData.remarks
        };

        try {
            const result = isUpdate
                ? await window.ClientMaintenanceDemiseDetailsService.update(payload)
                : await window.ClientMaintenanceDemiseDetailsService.create(payload);

            if (result?.success || result?.Success) {
                window.ToastManager?.showSuccess(isUpdate ? 'Demise detail updated successfully' : 'Demise detail added successfully');
                setFormState('view');
                await refreshTable();
            } else {
                window.ToastManager?.showError(result?.message || result?.ErrorMessage || 'Save failed');
            }
        } catch (error) {
            console.error('Error saving demise detail:', error);
            window.ToastManager?.showError('An error occurred while saving');
        }
    };

    const handleDelete = async () => {
        if (!state.selectedDetail) {
            window.ToastManager?.showWarning('Please select a record to delete');
            return;
        }

        const confirmed = await window.DialogSystem?.confirm({
            title: 'Confirm Deletion',
            message: 'Are you sure you want to delete this demise detail?',
            confirmText: 'Delete',
            cancelText: 'Cancel'
        });

        if (!confirmed) return;

        const clientId = window.ClientMaintenanceCore?.getClientId?.();
        const payload = {
            ClientID: clientId,
            ModuleID: moduleId,
            DemiseDetailID: state.selectedDetail?.DemiseDetailID || state.selectedDetail?.ID
        };

        try {
            const result = await window.ClientMaintenanceDemiseDetailsService.delete(payload);

            if (result?.success || result?.Success) {
                window.ToastManager?.showSuccess('Demise detail deleted successfully');
                setFormState('view');
                await refreshTable();
            } else {
                window.ToastManager?.showError(result?.message || result?.ErrorMessage || 'Delete failed');
            }
        } catch (error) {
            console.error('Error deleting demise detail:', error);
            window.ToastManager?.showError('An error occurred while deleting');
        }
    };

    const handleCancel = () => {
        if (state.selectedDetail) {
            populateForm(state.selectedDetail);
        } else {
            clearForm();
        }
        setFormState('view');
    };

    const handleBrowseFile = () => {
        const fileInput = document.getElementById('file_documentImage');
        if (fileInput) {
            fileInput.click();
        }
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
            window.ToastManager?.showWarning('Demise Date is required');
            form?.querySelector('#txt_demiseDate')?.focus();
            return false;
        }
        if (!formData.reasonId) {
            window.ToastManager?.showWarning('Reason is required');
            form?.querySelector('#ddl_reasonId')?.focus();
            return false;
        }
        return true;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toISOString().split('T')[0];
        } catch {
            return '';
        }
    };

    // File input change handler
    const fileInput = document.getElementById('file_documentImage');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const txtDocumentImage = form?.querySelector('#txt_documentImage');
            if (file && txtDocumentImage) {
                txtDocumentImage.value = file.name;
            }
        });
    }

    // Event delegation for action buttons
    moduleRoot.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-demisedetail-action]');
        if (actionBtn) {
            const action = actionBtn.dataset.demisedetailAction;

            switch (action) {
                case 'add':
                    handleAdd();
                    break;
                case 'edit':
                    handleEdit();
                    break;
                case 'save':
                    handleSave();
                    break;
                case 'delete':
                    handleDelete();
                    break;
                case 'cancel':
                    handleCancel();
                    break;
                case 'browse-file':
                    handleBrowseFile();
                    break;
                case 'select-row':
                    const index = parseInt(actionBtn.dataset.detailIndex);
                    if (!isNaN(index) && state.details[index]) {
                        const row = actionBtn.closest('tr');
                        selectDetail(state.details[index], row);
                    }
                    break;
            }
        }
    });

    // Register load function for external calls
    moduleRoot._cmLoadData = (requestData) => refreshTable(requestData);

    // Initial state
    setFormState('view');
    refreshTable({});
};

function escapeHtml(value) {
    const text = String(value ?? '');
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
