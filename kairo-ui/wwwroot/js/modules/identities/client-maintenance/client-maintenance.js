/* Client Maintenance View - JavaScript Controller */

const CLIENT_MAINTENANCE_CONTROLLER_BASE = 'Identities/ClientMaintenance';

function getAppCore() {
    const win = window;
    return win.AppCore ||
        (win.parent && win.parent !== win && win.parent.AppCore) ||
        (win.top && win.top !== win && win.top.AppCore) ||
        null;
}

function invokeController(basePath, action, requestData) {
    return new Promise((resolve, reject) => {
        const appCore = getAppCore();
        if (!appCore || typeof appCore.invokeController !== 'function') {
            reject(new Error('AppCore is not available (AppCore.invokeController not found)'));
            return;
        }

        const endpoint = `${basePath}/${action}`;
        appCore.invokeController(endpoint, requestData || {}, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
}

function invokeControllerMethod(basePath, action, method, requestData, options) {
    return new Promise((resolve, reject) => {
        const appCore = getAppCore();
        if (!appCore || typeof appCore.invokeControllerByMethodAsync !== 'function') {
            reject(new Error('AppCore is not available (AppCore.invokeControllerByMethodAsync not found)'));
            return;
        }

        const endpoint = `${basePath}/${action}`;
        appCore.invokeControllerByMethodAsync(endpoint, method || 'POST', requestData || {}, options || {})
            .then(resolve)
            .catch(reject);
    });
}

function invokeControllerGet(basePath, action, requestData) {
    return invokeControllerMethod(basePath, action, 'GET', requestData || {}, { useQueryString: true });
}

function invokeControllerUpdate(basePath, action, requestData) {
    return invokeControllerMethod(basePath, action, 'PUT', requestData || {}, { useQueryString: false });
}

function invokeControllerDelete(basePath, action, requestData) {
    return invokeControllerMethod(basePath, action, 'DELETE', requestData || {}, { useQueryString: false });
}

function invokeControllerMultipart(basePath, action, formData, method = 'POST') {
    return invokeControllerMethod(basePath, action, method, null, {
        body: formData,
        includeJsonContentType: false
    });
}

function invokeControllerDownload(basePath, action, requestData) {
    return invokeControllerMethod(basePath, action, 'GET', requestData || {}, {
        responseType: 'blob',
        useQueryString: true
    });
}

function invokeClientMaintenanceController(action, requestData) {
    return invokeController(CLIENT_MAINTENANCE_CONTROLLER_BASE, action, requestData);
}

window.ClientMaintenanceCore = {
    getAppCore,
    invokeController,
    invokeControllerMethod,
    invokeControllerGet,
    invokeControllerUpdate,
    invokeControllerDelete,
    invokeControllerMultipart,
    invokeControllerDownload,
    invokeClientMaintenanceController,
    moduleId: null,
    clientId: null,
    requestId: null,
    showToast(message, type = 'info') {
        if (window.NotificationService?.showToast) {
            window.NotificationService.showToast(message, type, 4000);
            return;
        }
        console.log(`[${type}] ${message}`);
    }
};

const ClientMaintenanceService = {
    validateClient(requestData) {
        return invokeClientMaintenanceController('validate-client', requestData);
    },
    getBasic(requestData) {
        return invokeClientMaintenanceController('get-basic', requestData);
    },
    createBasic(requestData) {
        return invokeClientMaintenanceController('create-basic', requestData);
    },
    updateBasic(requestData) {
        return invokeClientMaintenanceController('update-basic', requestData);
    },
    deleteBasic(requestData) {
        return invokeClientMaintenanceController('delete-basic', requestData);
    }
};

window.ClientMaintenanceService = ClientMaintenanceService;

const clientMaintenanceTabConfig = [
    { key: 'Personal', pane: 'dv_tabClientPersonal', route: 'Personal/Index', initFn: 'initClientMaintenancePersonalTab' },
    { key: 'Corporate', pane: 'dv_tabClientCorporate', route: 'Corporate/Index', initFn: 'initClientMaintenanceCorporateTab' },
    { key: 'Address', pane: 'dv_tabClientAddress', route: 'Address/Index', initFn: 'initClientMaintenanceAddressTab' },
    { key: 'Relations', pane: 'dv_tabClientRelations', route: 'Relations/Index', initFn: 'initClientMaintenanceRelationsTab' },
    { key: 'Employment', pane: 'dv_tabClientEmployment', route: 'Employment/Index', initFn: 'initClientMaintenanceEmploymentTab' },
    { key: 'Offers', pane: 'dv_tabClientOffers', route: 'Offers/Index', initFn: 'initClientMaintenanceOffersTab' },
    { key: 'GroupDetail', pane: 'dv_tabClientGroupDetail', route: 'GroupDetail/Index', initFn: 'initClientMaintenanceGroupDetailTab' },
    { key: 'Kyc', pane: 'dv_tabClientKyc', route: 'Kyc/Index', initFn: 'initClientMaintenanceKycTab' },
    { key: 'Products', pane: 'dv_tabClientProducts', route: 'Products/Index', initFn: 'initClientMaintenanceProductsTab' },
    { key: 'PhotoSignature', pane: 'dv_tabClientPhotoSignature', route: 'PhotoSignature/Index', initFn: 'initClientMaintenancePhotoSignatureTab' },
    { key: 'Documents', pane: 'dv_tabClientDocuments', route: 'Documents/Index', initFn: 'initClientMaintenanceDocumentsTab' },
    { key: 'Submit', pane: 'dv_tabClientSubmit', route: 'Submit/Index', initFn: 'initClientMaintenanceSubmitTab' }
];

window.bindClientMaintenanceCrud = function (tabRoot, moduleId, service, tabName) {
    if (!tabRoot || !service) return;

    const buildRequest = () => {
        const payload = {};
        tabRoot.querySelectorAll('input, select, textarea').forEach((element) => {
            const key = element.name || element.id;
            if (!key) return;
            payload[key] = element.type === 'checkbox' ? element.checked : element.value;
        });

        return {
            ModuleID: moduleId || window.ClientMaintenanceCore.moduleId || '',
            ClientID: window.ClientMaintenanceCore.clientId || '',
            Payload: payload
        };
    };

    tabRoot.querySelectorAll('[data-cm-action]').forEach((button) => {
        button.addEventListener('click', async () => {
            const action = button.getAttribute('data-cm-action');
            if (!action || typeof service[action] !== 'function') return;

            try {
                const response = await service[action](buildRequest());
                const success = response?.Success ?? response?.success ?? true;
                if (!success) {
                    const error = response?.ErrorMessage || response?.errorMessage || `${tabName}: request failed`;
                    window.ClientMaintenanceCore.showToast(error, 'error');
                    return;
                }

                window.ClientMaintenanceCore.showToast(`${tabName}: ${action} completed`, 'success');
            } catch (error) {
                window.ClientMaintenanceCore.showToast(`${tabName}: ${action} failed - ${error.message}`, 'error');
            }
        });
    });
};

function normalizeSingleRow(response) {
    const candidates = [
        response?.Details?.[0],
        response?.Details,
        response?.data?.Details?.[0],
        response?.data?.Details,
        response?.data?.[0]?.Details?.[0],
        response?.data?.[0]?.Details,
        response?.data,
        response
    ];

    for (const candidate of candidates) {
        if (!candidate) continue;
        if (Array.isArray(candidate)) {
            if (candidate.length > 0 && typeof candidate[0] === 'object') return candidate[0];
            continue;
        }
        if (typeof candidate === 'object') {
            return candidate;
        }
    }

    return null;
}

function setFieldValue(root, selector, value) {
    const field = root?.querySelector(selector);
    if (!field) return;
    field.value = value ?? '';
}

function applyBasicDetailsToPersonal(row) {
    const personalPane = document.getElementById('dv_tabClientPersonal');
    if (!personalPane) return;

    const map = [
        ['#ddl_personalTitle', row?.TitleID],
        ['#txt_personalFirstName', row?.FirstName],
        ['#txt_personalMiddleName', row?.MiddleName],
        ['#txt_personalLastName', row?.LastName],
        ['#ddl_personalGender', row?.GenderID],
        ['#dt_personalDob', row?.DateOfBirth],
        ['#ddl_personalNationality', row?.NationalityID],
        ['#ddl_personalResidentStatus', row?.ResidentID],
        ['#ddl_personalIdType', row?.IdentificationTypeID],
        ['#txt_personalIdNumber', row?.NationalId || row?.IdentificationNo],
        ['#dt_personalIssueDate', row?.IDIssueDate],
        ['#txt_personalIssuedBy', row?.IssuedBy],
        ['#dt_personalExpiryDate', row?.IDExpiryDate],
        ['#ddl_personalLiteracyLevel', row?.LiteracyLevel],
        ['#ddl_personalMaritalStatus', row?.MaritalStatus],
        ['#txt_personalHouseMembers', row?.NumberOfHouseMembers],
        ['#txt_personalChildren', row?.NumberOfChildren],
        ['#txt_personalDependents', row?.NumberOfDependents],
        ['#txt_personalMotherName', row?.MotherName],
        ['#ddl_personalBloodGroup', row?.BloodGroup],
        ['#txt_personalOpenedBy', row?.CreatedBy],
        ['#dt_personalOpenedOn', row?.OpenedOn],
        ['#ddl_personalRelationshipManager', row?.RelationshipManagerID]
    ];

    map.forEach(([selector, value]) => setFieldValue(personalPane, selector, value));

    const canDonate = personalPane.querySelector('#chk_personalCanDonateBlood');
    if (canDonate) {
        canDonate.checked = Boolean(row?.CanDonateBlood);
    }

    const openedByName = personalPane.querySelector('#txt_personalOpenedByName');
    if (openedByName) {
        openedByName.value = row?.CreatedByName || row?.OpenedByName || '';
    }
}

async function loadClientBasicDetails(clientId) {
    if (!clientId) return;
    try {
        const response = await window.ClientMaintenanceService.getBasic({
            ModuleID: window.ClientMaintenanceCore.moduleId || '',
            ClientID: clientId
        });

        const success = response?.Success ?? response?.success ?? true;
        if (!success) {
            const error = response?.ErrorMessage || response?.errorMessage || 'Failed to load client basic details';
            window.ClientMaintenanceCore.showToast(error, 'error');
            return;
        }

        const row = normalizeSingleRow(response);
        if (row) {
            applyBasicDetailsToPersonal(row);
        }
    } catch (error) {
        window.ClientMaintenanceCore.showToast(`Failed to load client - ${error.message}`, 'error');
    }
}

function initMainClientSearch(shell) {
    const clientSearchBtn = shell.querySelector('[data-main-client-search]');
    const applicationSearchBtn = shell.querySelector('[data-main-application-search]');
    const clientIdInput = shell.querySelector('#txt_mainClientId');
    const clientNameInput = shell.querySelector('#txt_mainClientName');
    const applicationIdInput = shell.querySelector('#txt_mainApplicationId');
    const applicationNameInput = shell.querySelector('#txt_mainApplicationName');

    if (!clientSearchBtn && !applicationSearchBtn) return;

    const appCore = getAppCore();
    if (!appCore || !window.SearchModal) return;

    clientSearchBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        let searchModal = new window.SearchModal(appCore);

        searchModal.open({
            title: 'Client Search',
            tableID: 'ClientID',
            moduleID: window.ClientMaintenanceCore.moduleId || '',
            searchFields: [
                { name: 'ClientID', label: 'Client ID', column: 'ClientID', value: clientIdInput?.value || '' },
                { name: 'Name', label: 'Client Name', column: 'Name' }
            ],
            autoSearch: false,
            onSelect: async (record) => {
                const selectedClientId = record?.ClientID || '';
                const selectedClientName = record?.Name || '';
                if (clientIdInput) clientIdInput.value = selectedClientId;
                if (clientNameInput) clientNameInput.value = selectedClientName;
                window.ClientMaintenanceCore.clientId = selectedClientId;
                if (applicationIdInput) applicationIdInput.value = '';
                if (applicationNameInput) applicationNameInput.value = '';
                await loadClientBasicDetails(selectedClientId);
            }
        });
    });

    applicationSearchBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        let searchModal = new window.SearchModal(appCore);

        searchModal.open({
            title: 'Find Pipeline Application',
            tableID: 'WFClientID',
            moduleID: window.ClientMaintenanceCore.moduleId || '',
            searchFields: [
                { name: 'ClientID', label: 'Application ID', column: 'ClientID', value: applicationIdInput?.value || '' },
                { name: 'Name', label: 'Client Name', column: 'Name' }
            ],
            autoSearch: false,
            onSelect: (record) => {
                const selectedRequestId = record?.ClientID || '';
                const selectedName = record?.Name || '';
                if (applicationIdInput) applicationIdInput.value = selectedRequestId;
                if (applicationNameInput) applicationNameInput.value = selectedName;
                window.ClientMaintenanceCore.requestId = selectedRequestId;

                const selectedClientId = record?.RealClientID || record?.ExistingClientID || '';
                if (selectedClientId) {
                    if (clientIdInput) clientIdInput.value = selectedClientId;
                    if (clientNameInput && !clientNameInput.value) clientNameInput.value = selectedName;
                    window.ClientMaintenanceCore.clientId = selectedClientId;
                    loadClientBasicDetails(selectedClientId);
                }
            }
        });
    });

    // Add Enter and F2 key handlers for Client ID search
    clientIdInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === 'F2') {
            event.preventDefault();
            clientSearchBtn?.click();
        }
    });

    // Add Enter and F2 key handlers for Application ID search
    applicationIdInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === 'F2') {
            event.preventDefault();
            applicationSearchBtn?.click();
        }
    });
}

async function loadTabPartial(config) {
    const pane = document.getElementById(config.pane);
    if (!pane || pane.dataset.loaded === 'true') return;

    const moduleId = encodeURIComponent(window.ClientMaintenanceCore.moduleId || '');
    const response = await fetch(`${config.route}?moduleId=${moduleId}`, {
        method: 'GET',
        credentials: 'same-origin'
    });

    if (!response.ok) {
        throw new Error(`Failed to load ${config.key} tab (${response.status})`);
    }

    pane.innerHTML = await response.text();
    pane.dataset.loaded = 'true';

    const initializer = window[config.initFn];
    if (typeof initializer === 'function') {
        initializer(pane, window.ClientMaintenanceCore.moduleId || '');
    }
}

async function loadSidebar(moduleId) {
    const sidebarContainer = document.getElementById('sidebarContainer');
    //const sidebarContainer = document.getElementsByClassName('main-container');
    if (!sidebarContainer) return;

    try {
        const params = new URLSearchParams({
            ModuleID: moduleId || '0',
            OurBranchID: ''
        });

        const response = await fetch(`/SideBar/Index?${params.toString()}`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Accept': 'text/html'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load sidebar (${response.status})`);
        }

        const html = await response.text();
        sidebarContainer.innerHTML = html;
        //sidebarContainer.insertAdjacentHTML('afterbegin', html);

        // Initialize sidebar JavaScript if the script is available
        if (window.SidebarManager && typeof window.SidebarManager.init === 'function') {
            window.SidebarManager.init();
        }
    } catch (error) {
        console.error('[Client Maintenance] Error loading sidebar:', error);
        window.ClientMaintenanceCore.showToast('Failed to load sidebar', 'error');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const shell = document.querySelector('[data-client-maintenance]');
    if (!shell) return;

    window.ClientMaintenanceCore.moduleId = shell.getAttribute('data-module-id') || '';

    // Load sidebar first
    await loadSidebar(window.ClientMaintenanceCore.moduleId);

    // Initialize main client search
    initMainClientSearch(shell);

    try {
        await loadTabPartial(clientMaintenanceTabConfig[0]);
    } catch (error) {
        window.ClientMaintenanceCore.showToast(error.message, 'error');
    }

    document.getElementById('nav_clientMaintenanceTabs')?.addEventListener('shown.bs.tab', async (event) => {
        const targetSelector = event.target?.getAttribute('data-bs-target') || '';
        const paneId = targetSelector.replace('#', '');
        const config = clientMaintenanceTabConfig.find((x) => x.pane === paneId);
        if (!config) return;

        try {
            await loadTabPartial(config);
        } catch (error) {
            window.ClientMaintenanceCore.showToast(error.message, 'error');
        }
    });
});
