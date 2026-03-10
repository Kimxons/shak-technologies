const CM_INTRODUCER_BASE = 'Identities/ClientMaintenance/Introducer';

function invokeClientMaintenanceIntroducer(action, requestData) {
    return window.ClientMaintenanceCore.invokeControllerMethod(CM_INTRODUCER_BASE, action, 'POST', requestData || {});
}

window.ClientMaintenanceIntroducerService = {
    get: (requestData) => invokeClientMaintenanceIntroducer('get', requestData),
    create: (requestData) => invokeClientMaintenanceIntroducer('create', requestData),
    update: (requestData) => invokeClientMaintenanceIntroducer('update', requestData),
    delete: (requestData) => invokeClientMaintenanceIntroducer('delete', requestData)
};

window.initClientMaintenanceIntroducer = function (tabRoot, moduleId) {
    if (!tabRoot) return;

    const state = {
        introducers: [],
        selectedIntroducer: null,
        mode: 'view'
    };

    const form = tabRoot.querySelector('[data-introducer-form]');
    const table = tabRoot.querySelector('[data-table="introducers"]');
    const tbody = table?.querySelector('[data-introducers-body]');

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
            tr.dataset.introducerIndex = index;
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

            tr.addEventListener('click', (e) => {
                if (e.target.closest('[data-introducer-action="select"]')) return;
                selectIntroducer(introducers[index], tr);
            });

            tbody.appendChild(tr);
        });
    };

    const selectIntroducer = (introducer, rowElement) => {
        tbody?.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
        rowElement?.classList.add('table-active');

        state.selectedIntroducer = introducer;
        populateForm(introducer);
        setFormState('view');
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
        form?.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(field => {
            field.value = '';
        });
        setFieldValue('hdn_introducerId', '');
        state.selectedIntroducer = null;
        tbody?.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
    };

    const setFieldValue = (id, value) => {
        const field = form?.querySelector(`#${id}`);
        if (!field) return;
        field.value = value || '';
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

    const getFieldValue = (id) => {
        const field = form?.querySelector(`#${id}`);
        return field?.value || '';
    };

    const validateForm = () => {
        const errors = [];

        if (!getFieldValue('txt_introducerCode')) {
            errors.push('Introducer is required');
        }

        if (errors.length > 0) {
            window.ClientMaintenanceCore?.showToast(errors.join(', '), 'error');
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
        const allowEdit = Boolean(window.ClientMaintenanceCore?.isEditMode);

        if (!allowEdit) {
            fields?.forEach(f => f.disabled = true);
            if (newBtn) newBtn.disabled = true;
            if (alterBtn) alterBtn.disabled = true;
            if (removeBtn) removeBtn.disabled = true;
            if (updateBtn) updateBtn.disabled = true;
            if (clearBtn) clearBtn.disabled = true;
            return;
        }

        if (mode === 'view') {
            fields?.forEach(f => f.disabled = true);
            if (newBtn) newBtn.disabled = false;
            if (alterBtn) alterBtn.disabled = !state.selectedIntroducer;
            if (removeBtn) removeBtn.disabled = !state.selectedIntroducer;
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

    const refreshTable = async (requestData) => {
        try {
            const response = await window.ClientMaintenanceIntroducerService.get({
                ModuleID: moduleId || window.ClientMaintenanceCore?.moduleId || '',
                ClientID: requestData?.ClientID || window.ClientMaintenanceCore?.clientId || '',
                RequestID: requestData?.RequestID || window.ClientMaintenanceCore?.requestId || ''
            });

            const introducers = extractIntroducers(response);
            state.introducers = introducers;
            renderTable(introducers);
            setFormState('view');
        } catch (error) {
            console.error('Introducer load failed:', error);
            window.ClientMaintenanceCore?.showToast?.(`Failed to load introducer details - ${error.message}`, 'error');
            state.introducers = [];
            renderTable([]);
        }
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

    const handleNew = () => {
        clearForm();
        setFormState('add');
        window.ClientMaintenanceCore?.showToast('Enter new introducer details', 'info');
    };

    const handleAlter = () => {
        if (!state.selectedIntroducer) {
            window.ClientMaintenanceCore?.showToast('Please select an introducer to edit', 'warning');
            return;
        }
        setFormState('edit');
    };

    const handleRemove = async () => {
        if (!state.selectedIntroducer) {
            window.ClientMaintenanceCore?.showToast('Please select an introducer to remove', 'warning');
            return;
        }

        const confirmed = await window.ClientMaintenanceCore?.showDialog(
            'Delete Introducer',
            'Are you sure you want to delete this introducer?',
            'YesNo'
        );

        if (!confirmed) return;

        try {
            const response = await window.ClientMaintenanceIntroducerService.delete({
                ModuleID: moduleId || window.ClientMaintenanceCore?.moduleId || '',
                ClientID: window.ClientMaintenanceCore?.clientId || '',
                RequestID: window.ClientMaintenanceCore?.requestId || '',
                ID: state.selectedIntroducer.ID || state.selectedIntroducer.IntroducerDetailID
            });

            if (response?.ResponseCode === '00' || response?.responseCode === '00') {
                window.ClientMaintenanceCore?.showToast('Introducer deleted successfully', 'success');
                clearForm();
                await refreshTable({});
            } else {
                window.ClientMaintenanceCore?.showToast(response?.ResponseMessage || response?.message || 'Delete failed', 'error');
            }
        } catch (error) {
            console.error('Delete introducer error:', error);
            window.ClientMaintenanceCore?.showToast?.(`Delete failed - ${error.message}`, 'error');
        }
    };

    const handleUpdate = async () => {
        if (!validateForm()) return;

        const formData = getFormData();

        try {
            let response;

            if (state.mode === 'add') {
                response = await window.ClientMaintenanceIntroducerService.create({
                    ModuleID: moduleId || window.ClientMaintenanceCore?.moduleId || '',
                    ClientID: window.ClientMaintenanceCore?.clientId || '',
                    RequestID: window.ClientMaintenanceCore?.requestId || '',
                    ...formData
                });
            } else if (state.mode === 'edit') {
                response = await window.ClientMaintenanceIntroducerService.update({
                    ModuleID: moduleId || window.ClientMaintenanceCore?.moduleId || '',
                    ClientID: window.ClientMaintenanceCore?.clientId || '',
                    RequestID: window.ClientMaintenanceCore?.requestId || '',
                    ...formData
                });
            }

            if (response?.ResponseCode === '00' || response?.responseCode === '00') {
                window.ClientMaintenanceCore?.showToast(
                    `Introducer ${state.mode === 'add' ? 'created' : 'updated'} successfully`,
                    'success'
                );
                clearForm();
                await refreshTable({});
            } else {
                window.ClientMaintenanceCore?.showToast(
                    response?.ResponseMessage || response?.message || 'Update failed',
                    'error'
                );
            }
        } catch (error) {
            console.error('Update introducer error:', error);
            window.ClientMaintenanceCore?.showToast?.(`Update failed - ${error.message}`, 'error');
        }
    };

    const handleClear = () => {
        clearForm();
        setFormState('view');
    };

    const handleLookupIntroducer = () => {
        if (state.mode === 'view') {
            window.ClientMaintenanceCore?.showToast('Click "New" or "Alter" to search for introducers', 'info');
            return;
        }

        window.ClientMaintenanceCore?.openSearchModal({
            searchType: 'Client',
            title: 'Search Introducer',
            onSelect: (selected) => {
                if (selected) {
                    setFieldValue('txt_introducerCode', selected.ClientID || selected.Code || selected.ID);
                    setFieldValue('txt_introducerName', selected.ClientName || selected.Name);
                }
            }
        });
    };

    // Event Listeners
    tabRoot.querySelector('[data-introducer-action="new"]')?.addEventListener('click', handleNew);
    tabRoot.querySelector('[data-introducer-action="alter"]')?.addEventListener('click', handleAlter);
    tabRoot.querySelector('[data-introducer-action="remove"]')?.addEventListener('click', handleRemove);
    tabRoot.querySelector('[data-introducer-action="update"]')?.addEventListener('click', handleUpdate);
    tabRoot. querySelector('[data-introducer-action="clear"]')?.addEventListener('click', handleClear);
    tabRoot.querySelector('[data-introducer-action="lookup-introducer"]')?.addEventListener('click', handleLookupIntroducer);

    tbody?.addEventListener('click', (e) => {
        const selectBtn = e.target.closest('[data-introducer-action="select"]');
        if (selectBtn) {
            const index = parseInt(selectBtn.dataset.introducerIndex);
            if (!isNaN(index) && state.introducers[index]) {
                const row = selectBtn.closest('tr');
                selectIntroducer(state.introducers[index], row);
            }
        }
    });

    // Register load function for external calls
    tabRoot._cmLoadData = (requestData) => refreshTable(requestData);

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
        .replace(/'/g, '&#39;');
}
