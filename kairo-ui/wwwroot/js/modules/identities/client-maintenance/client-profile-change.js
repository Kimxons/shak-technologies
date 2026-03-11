const CM_PROFILE_CHANGE_BASE = 'Identities/ClientMaintenance/ProfileChange';

function getProfileChangeAppCore() {
    const win = window;
    return win.AppCore ||
        (win.parent && win.parent !== win && win.parent.AppCore) ||
        (win.top && win.top !== win && win.top.AppCore) ||
        null;
}

function getProfileChangeClientMaintenanceCore() {
    const win = window;
    return win.ClientMaintenanceCore ||
        (win.parent && win.parent !== win && win.parent.ClientMaintenanceCore) ||
        (win.top && win.top !== win && win.top.ClientMaintenanceCore) ||
        null;
}

function getProfileChangeSidebarManager() {
    const win = window;
    try {
        return (win.parent && win.parent !== win && win.parent.SidebarManager) ||
            (win.top && win.top !== win && win.top.SidebarManager) ||
            null;
    } catch (_error) {
        return null;
    }
}

function getProfileChangeParentContext() {
    const maintenanceCore = getProfileChangeClientMaintenanceCore();
    if (maintenanceCore?.getParentContext) {
        return maintenanceCore.getParentContext();
    }

    const sidebarManager = getProfileChangeSidebarManager();
    if (sidebarManager?.getParentContext) {
        return sidebarManager.getParentContext();
    }

    return null;
}

function toProfileChangeString(value) {
    return value === undefined || value === null ? '' : String(value).trim();
}

function resolveProfileChangeContext(requestData, fallbackModuleId) {
    const parentContext = getProfileChangeParentContext() || {};
    const maintenanceCore = getProfileChangeClientMaintenanceCore();

    const moduleId = toProfileChangeString(
        requestData?.ModuleID ??
        fallbackModuleId ??
        maintenanceCore?.moduleId ??
        parentContext.moduleId
    );

    const clientId = toProfileChangeString(
        requestData?.ClientID ??
        maintenanceCore?.getClientId?.() ??
        maintenanceCore?.clientId ??
        parentContext.clientId
    );

    const requestId = toProfileChangeString(
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

function invokeClientMaintenanceProfileChange(action, requestData) {
    const maintenanceCore = getProfileChangeClientMaintenanceCore();
    if (maintenanceCore?.invokeControllerMethod) {
        return maintenanceCore.invokeControllerMethod(CM_PROFILE_CHANGE_BASE, action, 'POST', requestData || {});
    }

    const appCore = getProfileChangeAppCore();
    if (appCore?.invokeControllerByMethodAsync) {
        return appCore.invokeControllerByMethodAsync(`${CM_PROFILE_CHANGE_BASE}/${action}`, 'POST', requestData || {});
    }

    return Promise.reject(new Error('Profile change controller invocation is not available.'));
}

window.ClientMaintenanceProfileChangeService = {
    get: (requestData) => invokeClientMaintenanceProfileChange('get', requestData),
    create: (requestData) => invokeClientMaintenanceProfileChange('create', requestData)
};

function closeProfileChangeView() {
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
            parentWindowRef?.postMessage({ type: 'submoduleClose', source: 'ClientProfileChange' }, '*');
            handled = Boolean(parentWindowRef);
        } catch (_error) {
        }
    }

    try { parentWindowRef?.postMessage({ action: 'submoduleClosed', source: 'ClientProfileChange' }, '*'); } catch (_error) { }
    try { parentWindowRef?.postMessage({ type: 'accountMaintenanceChildClose', source: 'ClientProfileChange' }, '*'); } catch (_error) { }
    try { parentWindowRef?.postMessage({ type: 'CLOSE_DATAENTRY', source: 'ClientProfileChange' }, '*'); } catch (_error) { }

    if (!handled) {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.close();
        }
    }
}

function bindProfileChangeActionPanel(moduleRoot) {
    if (!moduleRoot) return;

    const actionScope =
        moduleRoot.closest('.window') ||
        moduleRoot.closest('[data-cm-layout="client-profile-change"]') ||
        moduleRoot.parentElement ||
        moduleRoot;

    if (!actionScope || actionScope.dataset.cmProfileChangeActionDelegated === 'true') return;
    actionScope.dataset.cmProfileChangeActionDelegated = 'true';

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
            closeProfileChangeView();
        }
    });

    actionScope.addEventListener('kairo:titlebar:refresh', handleRefresh);
    actionScope.addEventListener('kairo:titlebar:close', (event) => {
        event.preventDefault();
        closeProfileChangeView();
    });
}

window.initClientMaintenanceProfileChange = function (moduleRoot, moduleId) {
    if (!moduleRoot || moduleRoot.dataset.cmProfileChangeInitialized === 'true') return;
    moduleRoot.dataset.cmProfileChangeInitialized = 'true';

    const state = {
        profileData: null,
        changeHistory: [],
        mode: 'view'
    };

    const form = moduleRoot.querySelector('[data-profilechange-form]');
    const table = moduleRoot.querySelector('[data-table="profile-changes"]');
    const tbody = table?.querySelector('[data-profilechanges-body]');

    const renderTable = (changes) => {
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!Array.isArray(changes) || changes.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="9" class="text-center text-muted py-3">No profile change records</td>';
            tbody.appendChild(tr);
            return;
        }

        changes.forEach((change) => {
            const tr = document.createElement('tr');

            const changedDate = change?.ChangedDate ? formatDate(change.ChangedDate) : '';
            const name = change?.ClientName || change?.Name || '';
            const gender = change?.GenderName || change?.Gender || '';
            const isDOBGiven = change?.IsDOBGiven || change?.DOBGiven ? 'Yes' : 'No';
            const dob = change?.DateOfBirth ? formatDate(change.DateOfBirth) : '';
            const age = change?.Age || '';
            const ageAsOn = change?.AgeAsOn ? formatDate(change.AgeAsOn) : '';
            const createdBy = change?.CreatedBy || '';
            const supervisedBy = change?.SupervisedBy || '';

            tr.innerHTML = `
                <td class="ps-2">${escapeHtml(changedDate)}</td>
                <td>${escapeHtml(name)}</td>
                <td>${escapeHtml(gender)}</td>
                <td>${escapeHtml(isDOBGiven)}</td>
                <td>${escapeHtml(dob)}</td>
                <td>${escapeHtml(age)}</td>
                <td>${escapeHtml(ageAsOn)}</td>
                <td>${escapeHtml(createdBy)}</td>
                <td>${escapeHtml(supervisedBy)}</td>
            `;

            tbody.appendChild(tr);
        });
    };

    const populateForm = (profile) => {
        if (!form || !profile) return;

        form.querySelector('#hdn_profileChangeId').value = profile?.ProfileChangeID || profile?.ID || '';
        form.querySelector('#txt_clientName').value = profile?.ClientName || '';
        form.querySelector('#ddl_title').value = profile?.TitleID || '';
        form.querySelector('#txt_firstName').value = profile?.FirstName || '';
        form.querySelector('#txt_middleName').value = profile?.MiddleName || '';
        form.querySelector('#txt_lastName').value = profile?.LastName || '';
        form.querySelector('#ddl_gender').value = profile?.GenderID || '';
        form.querySelector('#txt_dob').value = profile?.DateOfBirth ? formatDateForInput(profile.DateOfBirth) : '';
        form.querySelector('#txt_age').value = profile?.Age || '';
        form.querySelector('#txt_ageAsOn').value = profile?.AgeAsOn ? formatDateForInput(profile.AgeAsOn) : '';
        form.querySelector('#ddl_clientType').value = profile?.ClientTypeID || '';
        form.querySelector('#txt_documentsReceived').value = profile?.DocumentsReceived || '';
        form.querySelector('#txt_receivedOn').value = profile?.ReceivedOn ? formatDateForInput(profile.ReceivedOn) : '';
        form.querySelector('#ddl_changedReason').value = profile?.ChangeReasonID || '';
        form.querySelector('#txa_remarks').value = profile?.Remarks || '';

        // Calculate age if DOB is present
        calculateAge();
    };

    const setFormState = (mode) => {
        state.mode = mode;
        const isView = mode === 'view';
        const allowEdit = Boolean(getProfileChangeClientMaintenanceCore()?.isEditMode);

        // Form fields (except readonly fields and clientName which is always readonly)
        const fields = form?.querySelectorAll('input:not([type="hidden"]):not([readonly]), select, textarea');
        fields?.forEach(field => {
            if (field.id !== 'txt_clientName' && field.id !== 'txt_age') {
                field.disabled = !allowEdit || isView;
            }
        });

        if (!allowEdit) {
            ['#btn_editProfileChange', '#btn_saveProfileChange', '#btn_cancelProfileChange']
                .forEach((selector) => {
                    const btn = moduleRoot.querySelector(selector);
                    if (btn) {
                        btn.disabled = true;
                        btn.style.display = '';
                    }
                });
            return;
        }

        // Buttons
        toggleButton('#btn_editProfileChange', isView);
        toggleButton('#btn_saveProfileChange', !isView);
        toggleButton('#btn_cancelProfileChange', !isView);
    };

    const toggleButton = (selector, enabled) => {
        const btn = moduleRoot.querySelector(selector);
        if (btn) {
            btn.disabled = !enabled;
            btn.style.display = enabled ? '' : 'none';
        }
    };

    const refreshData = async (requestData = {}) => {
        try {
            const context = resolveProfileChangeContext(requestData, moduleId);
            if (!context.ClientID && !context.RequestID) {
                console.warn('No ClientID/RequestID available for profile change');
                return;
            }

            const payload = {
                ModuleID: context.ModuleID,
                ClientID: context.ClientID,
                RequestID: context.RequestID
            };

            const result = await window.ClientMaintenanceProfileChangeService.get(payload);

            if (result?.success || result?.Success) {
                const data = result?.data || result?.Data || {};
                state.profileData = data?.Profile || data;
                state.changeHistory = Array.isArray(data?.History) ? data.History : (Array.isArray(data) ? data : []);

                populateForm(state.profileData);
                renderTable(state.changeHistory);
            } else {
                console.error('Failed to load profile change data:', result?.message || result?.ErrorMessage);
            }
        } catch (error) {
            console.error('Error loading profile change data:', error);
        }
    };

    const handleEdit = () => {
        setFormState('edit');
    };

    const handleSave = async () => {
        if (!form) return;

        const formData = getFormData();
        if (!validateForm(formData)) return;

        const context = resolveProfileChangeContext({}, moduleId);
        if (!context.ClientID && !context.RequestID) {
            window.ToastManager?.showError('Client or request context is required');
            return;
        }

        const payload = {
            ModuleID: context.ModuleID,
            ClientID: context.ClientID,
            RequestID: context.RequestID,
            ProfileChangeID: formData.profileChangeId || null,
            TitleID: formData.titleId,
            FirstName: formData.firstName,
            MiddleName: formData.middleName,
            LastName: formData.lastName,
            GenderID: formData.genderId,
            DateOfBirth: formData.dob,
            Age: formData.age,
            AgeAsOn: formData.ageAsOn,
            ClientTypeID: formData.clientTypeId,
            DocumentsReceived: formData.documentsReceived,
            ReceivedOn: formData.receivedOn,
            ChangeReasonID: formData.changeReasonId,
            Remarks: formData.remarks
        };

        try {
            const result = await window.ClientMaintenanceProfileChangeService.create(payload);

            if (result?.success || result?.Success) {
                window.ToastManager?.showSuccess('Profile change saved successfully');
                setFormState('view');
                await refreshData();
            } else {
                window.ToastManager?.showError(result?.message || result?.ErrorMessage || 'Save failed');
            }
        } catch (error) {
            console.error('Error saving profile change:', error);
            window.ToastManager?.showError('An error occurred while saving');
        }
    };

    const handleCancel = () => {
        if (state.profileData) {
            populateForm(state.profileData);
        }
        setFormState('view');
    };

    const getFormData = () => {
        if (!form) return {};
        return {
            profileChangeId: form.querySelector('#hdn_profileChangeId')?.value || '',
            titleId: form.querySelector('#ddl_title')?.value || '',
            firstName: form.querySelector('#txt_firstName')?.value || '',
            middleName: form.querySelector('#txt_middleName')?.value || '',
            lastName: form.querySelector('#txt_lastName')?.value || '',
            genderId: form.querySelector('#ddl_gender')?.value || '',
            dob: form.querySelector('#txt_dob')?.value || '',
            age: form.querySelector('#txt_age')?.value || '',
            ageAsOn: form.querySelector('#txt_ageAsOn')?.value || '',
            clientTypeId: form.querySelector('#ddl_clientType')?.value || '',
            documentsReceived: form.querySelector('#txt_documentsReceived')?.value || '',
            receivedOn: form.querySelector('#txt_receivedOn')?.value || '',
            changeReasonId: form.querySelector('#ddl_changedReason')?.value || '',
            remarks: form.querySelector('#txa_remarks')?.value || ''
        };
    };

    const validateForm = (formData) => {
        if (!formData.firstName) {
            window.ToastManager?.showWarning('First Name is required');
            form?.querySelector('#txt_firstName')?.focus();
            return false;
        }
        if (!formData.lastName) {
            window.ToastManager?.showWarning('Last Name is required');
            form?.querySelector('#txt_lastName')?.focus();
            return false;
        }
        if (!formData.changeReasonId) {
            window.ToastManager?.showWarning('Changed Reason is required');
            form?.querySelector('#ddl_changedReason')?.focus();
            return false;
        }
        return true;
    };

    const calculateAge = () => {
        const dobInput = form?.querySelector('#txt_dob');
        const ageInput = form?.querySelector('#txt_age');
        const ageAsOnInput = form?.querySelector('#txt_ageAsOn');

        if (!dobInput?.value) {
            if (ageInput) ageInput.value = '';
            return;
        }

        try {
            const dob = new Date(dobInput.value);
            const ageAsOnDate = ageAsOnInput?.value ? new Date(ageAsOnInput.value) : new Date();

            let age = ageAsOnDate.getFullYear() - dob.getFullYear();
            const monthDiff = ageAsOnDate.getMonth() - dob.getMonth();

            if (monthDiff < 0 || (monthDiff === 0 && ageAsOnDate.getDate() < dob.getDate())) {
                age--;
            }

            if (ageInput) ageInput.value = age >= 0 ? age : '';
        } catch (error) {
            console.error('Error calculating age:', error);
            if (ageInput) ageInput.value = '';
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        if (window.GlobalUtils?.formatDate) {
            return window.GlobalUtils.formatDate(dateStr);
        }
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        if (window.GlobalUtils?.parseDateInput) {
            const parsed = window.GlobalUtils.parseDateInput(dateStr);
            if (parsed) return parsed;
        }
        try {
            const date = new Date(dateStr);
            return date.toISOString().split('T')[0];
        } catch {
            return '';
        }
    };

    // Date change handlers to calculate age
    const dobInput = form?.querySelector('#txt_dob');
    const ageAsOnInput = form?.querySelector('#txt_ageAsOn');

    if (dobInput) {
        dobInput.addEventListener('change', calculateAge);
    }

    if (ageAsOnInput) {
        ageAsOnInput.addEventListener('change', calculateAge);
    }

    const bindStandaloneBootstrap = () => {
        if (moduleRoot.dataset.cmProfileChangeParentContextBound === 'true') {
            return;
        }

        moduleRoot.dataset.cmProfileChangeParentContextBound = 'true';
        window.addEventListener('message', (event) => {
            const data = event?.data;
            if (!data || typeof data !== 'object') return;
            if (data.type !== 'parentContext' && data.action !== 'parentContextLoaded') return;

            const parentData = data.data || {};
            if (typeof moduleRoot._cmLoadData === 'function') {
                void moduleRoot._cmLoadData({
                    ModuleID: parentData.moduleId,
                    ClientID: parentData.clientId,
                    RequestID: parentData.requestId
                });
            }
        });
    };

    // Event delegation for action buttons
    moduleRoot.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-profilechange-action]');
        if (actionBtn) {
            const action = actionBtn.dataset.profilechangeAction;

            switch (action) {
                case 'edit':
                    handleEdit();
                    break;
                case 'save':
                    handleSave();
                    break;
                case 'cancel':
                    handleCancel();
                    break;
            }
        }
    });

    // Register load function for external calls
    moduleRoot._cmLoadData = (requestData) => refreshData(requestData);
    moduleRoot._cmRefreshData = (requestData) => refreshData(requestData);

    // Initial state
    bindProfileChangeActionPanel(moduleRoot);
    setFormState('view');
    bindStandaloneBootstrap();
    refreshData({});
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

function autoInitializeStandaloneProfileChangeView() {
    const moduleRoot = document.querySelector('[data-section="client-profile-change"]');
    if (!moduleRoot || typeof window.initClientMaintenanceProfileChange !== 'function') return;

    const moduleId = document.getElementById('moduleIdProfileChange')?.value || '';
    window.initClientMaintenanceProfileChange(moduleRoot, moduleId);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitializeStandaloneProfileChangeView);
} else {
    autoInitializeStandaloneProfileChangeView();
}
