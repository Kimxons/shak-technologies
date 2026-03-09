/* Client Maintenance View - JavaScript Controller */

const CLIENT_MAINTENANCE_CONTROLLER_BASE = 'Identities/ClientMaintenance';

/**
 * CLIENT MAINTENANCE PARENT CONTEXT
 * 
 * This module maintains the parent client record state and makes it available
 * to all submodules via:
 * 
 * 1. window.ClientMaintenanceCore.getParentClientId() - Returns the active client ID
 * 2. window.ClientMaintenanceCore.getParentRequestId() - Returns the active request ID  
 * 3. window.ClientMaintenanceCore.getParentContext() - Returns full context object
 * 
 * Submodules (sidebar items) can access the parent client ID in their searches:
 * - The parent client ID is automatically passed to tab partial views via _cmLoadData
 * - Sidebar submodules can access via window.parent.ClientMaintenanceCore when in iframe
 * - The SidebarManager tracks the main record loaded state and prevents submodule
 *   access until a client record is loaded
 * 
 * State is updated when:
 * - Client is selected via Client ID search
 * - Application is selected via Application ID search
 * - Workflow is reset/cancelled
 */

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
    useRequestId: false,
    workflowId: null,
    workflowStageRequestId: 0,
    // Registry to track loaded tabs and their load functions
    _loadedTabsRegistry: new Map(),

    /**
     * Register a tab's load function
     * Called by tab initializers when they set up the _cmLoadData function
     */
    registerTabLoadFunction(tabKey, loadFunction) {
        if (tabKey && typeof loadFunction === 'function') {
            this._loadedTabsRegistry.set(tabKey, loadFunction);
            console.log(`[ClientMaintenance] Registered load function for tab: ${tabKey}`);
        }
    },

    /**
     * Get all registered tab load functions
     */
    getLoadedTabLoadFunctions() {
        return Array.from(this._loadedTabsRegistry.values());
    },

    /**
     * Clear the registry (useful for reset)
     */
    clearTabRegistry() {
        this._loadedTabsRegistry.clear();
    },

    getSelectedId() {
        if (this.useRequestId) {
            return this.requestId || '';
        }
        return this.clientId || this.requestId || '';
    },
    showToast(message, type = 'info') {
        if (window.NotificationService?.showToast) {
            window.NotificationService.showToast(message, type, 4000);
            return;
        }
        console.log(`[${type}] ${message}`);
    },
    /**
     * Expose the parent client ID for submodules to access
     * This allows child forms/submodules to get the active client context
     */
    getParentClientId() {
        return this.clientId || '';
    },
    /**
     * Expose the parent request ID for submodules to access
     */
    getParentRequestId() {
        return this.requestId || '';
    },
    /**
       * Get the full context for submodules (includes clientId, requestId, moduleId)
       */
    getParentContext() {
        return {
            moduleId: this.moduleId || '',
            clientId: this.clientId || '',
            requestId: this.requestId || '',
            useRequestId: this.useRequestId,
            selectedId: this.getSelectedId()
        };
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
    },
    getWorkflowStage(requestData) {
        return invokeClientMaintenanceController('get-workflow-stage', requestData);
    }
};

window.ClientMaintenanceService = ClientMaintenanceService;

const clientMaintenanceTabCatalog = [
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

const clientMaintenanceStageAliases = {
    'personal': 'Personal',
    'personal detail': 'Personal',
    'corporate': 'Corporate',
    'corporate detail': 'Corporate',
    'address': 'Address',
    'relations': 'Relations',
    'employment': 'Employment',
    'offers': 'Offers',
    'group detail': 'GroupDetail',
    'other details': 'Kyc',
    'kyc': 'Kyc',
    'products and services': 'Products',
    'products services': 'Products',
    'photo and signature': 'PhotoSignature',
    'photo signature': 'PhotoSignature',
    'documents': 'Documents',
    'submit': 'Submit',
    'submission': 'Submit'
};

const clientMaintenanceTabMap = new Map(
    clientMaintenanceTabCatalog.map((item) => [item.key.toLowerCase(), item])
);

const clientMaintenanceTabServiceMap = {
    Personal: 'ClientMaintenancePersonalService',
    Corporate: 'ClientMaintenanceCorporateService',
    Address: 'ClientMaintenanceAddressService',
    Relations: 'ClientMaintenanceRelationsService',
    Employment: 'ClientMaintenanceEmploymentService',
    Offers: 'ClientMaintenanceOffersService',
    GroupDetail: 'ClientMaintenanceGroupDetailService',
    Kyc: 'ClientMaintenanceKycService',
    Products: 'ClientMaintenanceProductsService',
    PhotoSignature: 'ClientMaintenancePhotoSignatureService',
    Documents: 'ClientMaintenanceDocumentsService',
    Submit: 'ClientMaintenanceSubmitService'
};

const clientMaintenanceTabScriptMap = {
    Personal: '/js/modules/identities/client-maintenance/client-personal.js',
    Corporate: '/js/modules/identities/client-maintenance/client-corporate.js',
    Address: '/js/modules/identities/client-maintenance/client-address.js',
    Relations: '/js/modules/identities/client-maintenance/client-relations.js',
    Employment: '/js/modules/identities/client-maintenance/client-employment.js',
    Offers: '/js/modules/identities/client-maintenance/client-offers.js',
    GroupDetail: '/js/modules/identities/client-maintenance/client-group-detail.js',
    Kyc: '/js/modules/identities/client-maintenance/client-kyc.js',
    Products: '/js/modules/identities/client-maintenance/client-products.js',
    PhotoSignature: '/js/modules/identities/client-maintenance/client-photo-signature.js',
    Documents: '/js/modules/identities/client-maintenance/client-documents.js',
    Submit: '/js/modules/identities/client-maintenance/client-submit.js'
};

const loadedTabScriptSet = new Set();
const tabScriptLoadPromiseMap = new Map();

function resolveTabScriptUrl(scriptPath) {
    const normalizedPath = scriptPath.startsWith('/') ? scriptPath : `/${scriptPath}`;
    const marker = '/js/modules/identities/client-maintenance/client-maintenance.js';

    const currentScript = Array.from(document.scripts || []).find((script) => {
        const src = String(script?.src || '').toLowerCase();
        return src.includes(marker);
    });

    if (!currentScript?.src) {
        return normalizedPath;
    }

    const currentSrc = String(currentScript.src || '');
    const markerIndex = currentSrc.toLowerCase().indexOf(marker);
    if (markerIndex === -1) {
        return normalizedPath;
    }

    return `${currentSrc.substring(0, markerIndex)}${normalizedPath}`;
}

async function ensureTabScriptLoaded(config) {
    console.log(config);
    const tabKey = config?.key || '';
    const scriptPath = clientMaintenanceTabScriptMap[tabKey];
    console.log(scriptPath);
    if (!scriptPath) return;

    const normalizedPath = scriptPath.toLowerCase();
    const scriptUrl = resolveTabScriptUrl(scriptPath);

    console.log(scriptUrl);
    console.log(normalizedPath);
    console.log(loadedTabScriptSet);
    if (loadedTabScriptSet.has(normalizedPath)) {
        let isExistingScript = Array.from(document.scripts || []).find((script) => {
            const src = String(script?.src || '').toLowerCase();
            return src.includes(normalizedPath);
        });
        console.log(isExistingScript);
        if (isExistingScript)
            return;
    }

    console.log(tabScriptLoadPromiseMap);
    if (tabScriptLoadPromiseMap.has(normalizedPath)) {
        await tabScriptLoadPromiseMap.get(normalizedPath);
        return;
    }

    const existingScript = Array.from(document.head.querySelectorAll('script') || []).find((script) => {
        //const existingScript = Array.from(document.scripts || []).find((script) => {
        const src = String(script?.src || '').toLowerCase();
        return src.includes(normalizedPath);
    });
    console.log(existingScript);
    if (existingScript) {
        loadedTabScriptSet.add(normalizedPath);
        return;
    }

    const loadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.type = "text/javascript";
        script.async = false;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load script for ${tabKey}: ${scriptUrl}`));
        document.head.appendChild(script);
    }).finally(() => {
        tabScriptLoadPromiseMap.delete(normalizedPath);
    });
    console.log("finished loading scripts")
    tabScriptLoadPromiseMap.set(normalizedPath, loadPromise);
    await loadPromise;

    loadedTabScriptSet.add(normalizedPath);
}

let clientMaintenanceStageTabs = [];

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

                // Mark tab as completed after successful save operations
                if (action === 'create' || action === 'update') {
                    // Capitalize first letter to match tab key format
                    const tabKey = tabName.charAt(0).toUpperCase() + tabName.slice(1);
                    markTabAsCompleted(tabKey);
                }
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

function normalizeDetailsArray(response) {
    const candidates = [
        response?.Details,
        response?.data?.Details,
        response?.data?.[0]?.Details,
        response?.data
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) return candidate;
    }

    return [];
}

function normalizeStageName(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractStageKey(stage) {
    const rawUrl = stage?.StageUrl || stage?.stageUrl || '';
    const normalizedUrl = String(rawUrl || '').replace(/\\/g, '/');
    const urlMatch = normalizedUrl.match(/ClientMaintenance\/([^/]+)\//i);
    if (urlMatch && urlMatch[1]) {
        return urlMatch[1];
    }

    const stageName = normalizeStageName(stage?.WFStage || stage?.Stage || stage?.stage || '');
    return clientMaintenanceStageAliases[stageName] || '';
}

function buildWorkflowStageTabs(stages) {
    if (!Array.isArray(stages)) return [];

    const items = stages
        .filter((stage) => stage && stage.IsApplicable !== false)
        .map((stage, index) => {
            const key = extractStageKey(stage);
            if (!key) return null;

            const config = clientMaintenanceTabMap.get(String(key).toLowerCase());
            if (!config) return null;

            const orderValue = Number(stage.StageOrder);

            return {
                ...config,
                label: stage.WFStage || config.key,
                stageOrder: Number.isFinite(orderValue) ? orderValue : index + 1,
                workflowStageId: stage.WFStageID || '',
                workflowStageUrl: stage.StageUrl || ''
            };
        })
        .filter(Boolean);

    items.sort((a, b) => {
        if (a.stageOrder !== b.stageOrder) {
            return a.stageOrder - b.stageOrder;
        }
        return String(a.label || a.key).localeCompare(String(b.label || b.key));
    });

    const seen = new Set();
    return items.filter((item) => {
        const key = item.key.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function renderWorkflowStageTabs(stageTabs, emptyMessage) {
    const navTabs = document.getElementById('nav_clientMaintenanceTabs');
    const tabContent = document.getElementById('dv_clientMaintenanceTabContent');
    if (!navTabs || !tabContent) return;

    navTabs.innerHTML = '';
    tabContent.innerHTML = '';

    if (!Array.isArray(stageTabs) || stageTabs.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'text-muted py-2';
        placeholder.setAttribute('data-cm-empty-stages', '');
        placeholder.textContent = emptyMessage || 'No workflow stages found.';
        tabContent.appendChild(placeholder);
        return;
    }

    stageTabs.forEach((tab, index) => {
        const isActive = index === 0;
        const navItem = document.createElement('li');
        navItem.className = 'nav-item';
        navItem.setAttribute('role', 'presentation');

        const button = document.createElement('button');
        button.type = 'button';
        button.id = `btn_tabClient${tab.key}`;
        button.className = `nav-link${isActive ? ' active' : ''}`;
        button.setAttribute('data-bs-toggle', 'tab');
        button.setAttribute('data-bs-target', `#${tab.pane}`);
        button.setAttribute('role', 'tab');
        button.setAttribute('data-cm-tab-key', tab.key);
        if (tab.workflowStageId) {
            button.setAttribute('data-cm-wfstage-id', tab.workflowStageId);
        }

        // Create indicator with number and check icon
        const indicator = document.createElement('span');
        indicator.className = 'cm-tab-indicator';

        const numberSpan = document.createElement('span');
        numberSpan.className = 'cm-tab-indicator__number';
        numberSpan.textContent = index + 1;

        const checkIcon = document.createElement('i');
        checkIcon.className = 'bi bi-check-lg cm-tab-indicator__check';

        indicator.appendChild(numberSpan);
        indicator.appendChild(checkIcon);

        const labelSpan = document.createElement('span');
        labelSpan.textContent = tab.label || tab.key;

        button.appendChild(indicator);
        button.appendChild(labelSpan);

        navItem.appendChild(button);
        navTabs.appendChild(navItem);

        const pane = document.createElement('div');
        pane.className = `tab-pane fade${isActive ? ' show active' : ''}`;
        pane.id = tab.pane;
        pane.setAttribute('role', 'tabpanel');
        pane.setAttribute('data-cm-partial', tab.key);
        if (tab.workflowStageId) {
            pane.setAttribute('data-cm-wfstage-id', tab.workflowStageId);
        }

        tabContent.appendChild(pane);
    });
}

/**
 * Marks a tab as completed by adding the 'is-completed' class
 * @param {string} tabKey - The tab key (e.g., 'Personal', 'Address')
 */
function markTabAsCompleted(tabKey) {
    if (!tabKey) return;

    const navTabs = document.getElementById('nav_clientMaintenanceTabs');
    if (!navTabs) return;

    const tabButton = navTabs.querySelector(`[data-cm-tab-key="${tabKey}"]`);
    if (tabButton && !tabButton.classList.contains('is-completed')) {
        tabButton.classList.add('is-completed');
    }
}

/**
 * Clears all completed states from tabs
 */
function clearAllTabCompletions() {
    const navTabs = document.getElementById('nav_clientMaintenanceTabs');
    if (!navTabs) return;

    const completedTabs = navTabs.querySelectorAll('.nav-link.is-completed');
    completedTabs.forEach(tab => tab.classList.remove('is-completed'));
}

function buildTabRequest() {
    const moduleId = window.ClientMaintenanceCore.moduleId || '';
    const requestId = window.ClientMaintenanceCore.requestId || '';
    const selectedId = window.ClientMaintenanceCore.getSelectedId();
    const effectiveClientId = window.ClientMaintenanceCore.clientId || selectedId;

    if (!effectiveClientId && !requestId) return null;

    return {
        ModuleID: moduleId,
        ClientID: effectiveClientId,
        RequestID: requestId
    };
}

function normalizeDataKey(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildDataLookup(row) {
    const lookup = new Map();
    if (!row || typeof row !== 'object') return lookup;

    Object.entries(row).forEach(([key, value]) => {
        const rawKey = String(key || '').trim();
        if (!rawKey) return;

        const lower = rawKey.toLowerCase();
        const compact = normalizeDataKey(rawKey);
        if (!lookup.has(lower)) lookup.set(lower, value);
        if (compact && !lookup.has(compact)) lookup.set(compact, value);
    });

    return lookup;
}

function getLookupValue(lookup, candidates) {
    if (!lookup || !Array.isArray(candidates)) return undefined;

    for (const candidate of candidates) {
        const raw = String(candidate || '').trim();
        if (!raw) continue;

        const lower = raw.toLowerCase();
        const compact = normalizeDataKey(raw);
        if (lookup.has(lower)) return lookup.get(lower);
        if (compact && lookup.has(compact)) return lookup.get(compact);
    }

    return undefined;
}

function buildFieldCandidates(field) {
    const candidates = [];
    const add = (value) => {
        const text = String(value || '').trim();
        if (text && !candidates.includes(text)) {
            candidates.push(text);
        }
    };

    const name = field.getAttribute('name') || '';
    const id = field.getAttribute('id') || '';
    const dataField = field.getAttribute('data-field') || '';

    add(name);
    add(id);
    add(dataField);

    [name, id, dataField].forEach((rawToken) => {
        const token = String(rawToken || '').trim();
        if (!token) return;

        const withoutControlPrefix = token.replace(/^(txt|ddl|dt|chk|rad|txa|file|btn|tbl|frm|lbl)_/i, '');
        add(withoutControlPrefix);

        if (withoutControlPrefix.includes('_')) {
            const afterUnderscore = withoutControlPrefix.substring(withoutControlPrefix.indexOf('_') + 1);
            add(afterUnderscore);
            add(afterUnderscore.replace(/^[a-z]+(?=[A-Z])/, ''));
        }

        add(withoutControlPrefix.replace(/^[a-z]+(?=[A-Z])/, ''));
    });

    return candidates;
}

function parseBooleanValue(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;

    const text = String(value || '').trim().toLowerCase();
    if (!text) return false;

    return ['true', '1', 'y', 'yes', 'on', 'checked'].includes(text);
}

function resetPaneFormFields(pane) {
    if (!pane) return;

    const fields = Array.from(pane.querySelectorAll('input, select, textarea'));
    const resetRadioGroups = new Set();

    fields.forEach((field) => {
        const type = String(field.type || '').toLowerCase();
        const tag = field.tagName.toLowerCase();

        if (type === 'hidden') return;

        if (type === 'radio') {
            const groupName = field.name || field.id || '';
            if (!groupName || resetRadioGroups.has(groupName)) return;

            resetRadioGroups.add(groupName);
            fields
                .filter((item) => String(item.type || '').toLowerCase() === 'radio' && (item.name || item.id || '') === groupName)
                .forEach((radio) => { radio.checked = false; });
            return;
        }

        if (type === 'checkbox') {
            field.checked = false;
            return;
        }

        if (tag === 'select') {
            field.value = '';
            return;
        }

        field.value = '';
    });
}

function applyResponseDataToPane(pane, response, explicitFieldMap) {
    if (!pane) return;

    const row = normalizeSingleRow(response);
    resetPaneFormFields(pane);
    if (!row) return;

    const lookup = buildDataLookup(row);
    const fields = Array.from(pane.querySelectorAll('input, select, textarea'));
    const processedRadioGroups = new Set();

    fields.forEach((field) => {
        const type = String(field.type || '').toLowerCase();
        if (type === 'hidden') return;

        if (type === 'radio') {
            const groupName = field.name || field.id || '';
            if (!groupName || processedRadioGroups.has(groupName)) return;
            processedRadioGroups.add(groupName);

            const candidates = buildFieldCandidates(field);
            // If explicit field map provided, check it first for direct ID match
            let value = undefined;
            if (explicitFieldMap) {
                for (const [apiKey, fieldId] of Object.entries(explicitFieldMap)) {
                    if (fieldId === (field.id || field.name)) {
                        value = lookup.get(normalizeDataKey(apiKey));
                        if (value != null) break;
                    }
                }
            }
            // Fall back to generic field candidate matching
            if (value == null) {
                value = getLookupValue(lookup, candidates);
            }
            if (value == null || value === '') return;

            const group = fields.filter((item) => String(item.type || '').toLowerCase() === 'radio' && (item.name || item.id || '') === groupName);
            const normalizedValue = String(value).trim().toLowerCase();

            let matched = group.find((radio) => String(radio.value || '').trim().toLowerCase() === normalizedValue);
            if (!matched) {
                const expectedTruth = parseBooleanValue(value);
                matched = group.find((radio) => parseBooleanValue(radio.value) === expectedTruth);
            }

            if (matched) {
                matched.checked = true;
                matched.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return;
        }

        const candidates = buildFieldCandidates(field);
        // If explicit field map provided, check it first for direct ID match
        let value = undefined;
        if (explicitFieldMap) {
            for (const [apiKey, fieldId] of Object.entries(explicitFieldMap)) {
                if (fieldId === (field.id || field.name)) {
                    value = lookup.get(normalizeDataKey(apiKey));
                    if (value != null) break;
                }
            }
        }
        // Fall back to generic field candidate matching
        if (value == null) {
            value = getLookupValue(lookup, candidates);
        }
        if (value == null) return;

        if (type === 'checkbox') {
            field.checked = parseBooleanValue(value);
            field.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }

        if (field.tagName.toLowerCase() === 'select') {
            const normalized = String(value);
            const hasOption = Array.from(field.options || []).some((option) => String(option.value) === normalized);
            if (!hasOption && normalized) {
                const option = document.createElement('option');
                option.value = normalized;
                option.textContent = normalized;
                field.appendChild(option);
            }
            field.value = normalized;
            field.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }

        field.value = value ?? '';
    });
}

async function autoLoadTabData(config, pane) {
    const requestData = buildTabRequest();
    if (!requestData || !config) return;

    if (pane && typeof pane._cmLoadData === 'function') {
        try {
            await pane._cmLoadData(requestData);
            markTabAsCompleted(config.key);
        } catch (error) {
            console.error(`Error loading data for ${config.key} tab:`, error);
        }
        return;
    }

    const serviceName = clientMaintenanceTabServiceMap[config.key];
    const service = serviceName ? window[serviceName] : null;
    if (!service || typeof service.get !== 'function') return;

    try {
        const response = await service.get(requestData);

        // Get explicit field map for this tab if available
        const fieldMapKey = getFieldMapKeyForTab(config.key);
        const fieldMap = fieldMapKey ? window[fieldMapKey] : undefined;

        applyResponseDataToPane(pane, response, fieldMap);
    } catch (error) {
        window.ClientMaintenanceCore.showToast(`${config.key} load failed - ${error.message}`, 'error');
    }
}

function getFieldMapKeyForTab(tabKey) {
    // Map tab keys to their field map constants
    const fieldMapRegistry = {
        'Personal': 'PERSONAL_FIELD_MAP',
        'Corporate': 'CORPORATE_FIELD_MAP',
        'Employment': 'EMPLOYMENT_FIELD_MAP',
        'KYC': 'KYC_FIELD_MAP',
        'Products': 'PRODUCTS_FIELD_MAP',
        'Offers': 'OFFERS_FIELD_MAP',
        'GroupDetail': 'GROUPDETAIL_FIELD_MAP',
        'Submit': 'SUBMIT_FIELD_MAP'
    };
    return fieldMapRegistry[tabKey];
}

async function preloadWorkflowTabs(stageTabs) {
    if (!Array.isArray(stageTabs) || stageTabs.length === 0) return;

    for (const stageTab of stageTabs) {
        try {
            await loadTabPartial(stageTab, true);
        } catch (error) {
            console.error(`Failed to preload ${stageTab?.key || 'unknown'} tab:`, error);
            window.ClientMaintenanceCore.showToast(`${stageTab?.key || 'Tab'} load failed - ${error.message}`, 'error');
        }
    }
}

async function loadWorkflowStagesForClientType(clientTypeId) {
    const moduleId = window.ClientMaintenanceCore.moduleId || '';
    const normalizedType = clientTypeId == null ? '' : String(clientTypeId).trim();

    // Clear completion states when loading new workflow
    clearAllTabCompletions();

    if (!normalizedType) {
        clientMaintenanceStageTabs = [];
        window.ClientMaintenanceCore.workflowId = null;
        renderWorkflowStageTabs([], 'Select a client type to load workflow stages.');
        return;
    }

    if (normalizedType === window.ClientMaintenanceCore.workflowId && clientMaintenanceStageTabs.length > 0) {
        if (window.ClientMaintenanceCore.getSelectedId()) {
            await preloadWorkflowTabs(clientMaintenanceStageTabs);
        }
        return;
    }

    const requestId = ++window.ClientMaintenanceCore.workflowStageRequestId;
    clientMaintenanceStageTabs = [];
    renderWorkflowStageTabs([], 'Loading workflow stages...');

    try {
        const response = await window.ClientMaintenanceService.getWorkflowStage({
            ModuleID: moduleId || '',
            WorkflowID: normalizedType
        });

        if (requestId !== window.ClientMaintenanceCore.workflowStageRequestId) return;

        const success = response?.Success ?? response?.success ?? (response?.ResponseCode ? response.ResponseCode === '00' : true);
        if (!success) {
            const errorMessage = response?.ErrorMessage || response?.errorMessage || response?.ResponseMessage || 'Failed to load workflow stages';
            renderWorkflowStageTabs([], errorMessage);
            window.ClientMaintenanceCore.showToast(errorMessage, 'error');
            return;
        }

        const stages = normalizeDetailsArray(response);
        const stageTabs = buildWorkflowStageTabs(stages);
        clientMaintenanceStageTabs = stageTabs;
        window.ClientMaintenanceCore.workflowId = normalizedType;

        if (stageTabs.length === 0) {
            renderWorkflowStageTabs([], 'No workflow stages configured for the selected client type.');
            updateSaveButtonState();
            updateTabNavigationButtons();
            return;
        }

        renderWorkflowStageTabs(stageTabs);
        updateSaveButtonState();
        updateTabNavigationButtons();

        if (window.ClientMaintenanceCore.getSelectedId()) {
            await preloadWorkflowTabs(stageTabs);
        } else {
            /*await loadTabPartial(stageTabs[0]);*/
            stageTabs.forEach((tab) => loadTabPartial(tab, true));
        }
    } catch (error) {
        if (requestId !== window.ClientMaintenanceCore.workflowStageRequestId) return;
        const message = `Failed to load workflow stages - ${error.message}`;
        renderWorkflowStageTabs([], message);
        updateSaveButtonState();
        updateTabNavigationButtons();
        window.ClientMaintenanceCore.showToast(message, 'error');
    }
}

function ensureBehindSceneVisible() {
    const section = document.querySelector('.form-section[data-section="behind-scene"]');
    if (!section) return;
    section.classList.remove('collapsed');
    const toggleBtn = section.querySelector('.section-toggle-btn');
    if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', 'true');
    }
}

function initSectionToggles() {
    document.querySelectorAll('.form-section [data-section-toggle]').forEach((header) => {
        const section = header.closest('.form-section');
        if (!section) return;

        const toggleBtn = header.querySelector('.section-toggle-btn');
        header.addEventListener('click', (event) => {
            if (event.target.closest('button') && !event.target.closest('.section-toggle-btn')) return;

            section.classList.toggle('collapsed');
            const isCollapsed = section.classList.contains('collapsed');
            if (toggleBtn) {
                toggleBtn.setAttribute('aria-expanded', (!isCollapsed).toString());
            }
        });
    });
}

function setFieldValue(root, selector, value) {
    const field = root?.querySelector(selector);
    if (!field) return;
    field.value = value ?? '';
}

function setSelectValueWithFallback(selectElement, value, fallbackText) {
    if (!selectElement) return;

    const normalized = value == null ? '' : String(value);
    if (!normalized) {
        selectElement.value = '';
        return;
    }

    const hasOption = Array.from(selectElement.options || []).some((option) => String(option.value) === normalized);
    if (!hasOption) {
        const option = document.createElement('option');
        option.value = normalized;
        option.textContent = fallbackText || normalized;
        selectElement.appendChild(option);
    }

    selectElement.value = normalized;
}

function applyBasicDetailsToMain(row) {
    const shell = document.querySelector('[data-client-maintenance]');
    if (!shell) return;

    const clientType = row?.ClientTypeID || row?.ClientType || '';
    const clientGroup = row?.ClientGroupID || row?.ClientGroup || '';
    const clientGroupLabel = row?.ClientGroupName || row?.ClientGroupDescription || clientGroup;

    const clientTypeSelect = shell.querySelector('#ddl_mainClientType');
    const clientGroupSelect = shell.querySelector('#ddl_mainClientGroup');

    setSelectValueWithFallback(clientTypeSelect, clientType, clientType);
    setSelectValueWithFallback(clientGroupSelect, clientGroup, clientGroupLabel);

    const normalizedType = clientType == null ? '' : String(clientType).trim();
    const activeWorkflowType = window.ClientMaintenanceCore.workflowId == null
        ? ''
        : String(window.ClientMaintenanceCore.workflowId).trim();

    if (!normalizedType || normalizedType !== activeWorkflowType || clientMaintenanceStageTabs.length === 0) {
        loadWorkflowStagesForClientType(normalizedType);
    }
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

/**
 * Load data for all initialized tabs
 * This invokes the Get/View JS functions of all partial views/stages/steps
 */
async function loadAllTabsData() {
    const requestData = buildTabRequest();
    if (!requestData) {
        console.log('[ClientMaintenance] loadAllTabsData: No request data available');
        return;
    }

    if (Array.isArray(clientMaintenanceStageTabs) && clientMaintenanceStageTabs.length > 0) {
        await preloadWorkflowTabs(clientMaintenanceStageTabs);
        return;
    }

    // Get all registered tab load functions
    const loadFunctions = window.ClientMaintenanceCore.getLoadedTabLoadFunctions();
    if (loadFunctions.length === 0) {
        console.log('[ClientMaintenance] loadAllTabsData: No tabs registered yet');
        return;
    }

    console.log(`[ClientMaintenance] loadAllTabsData: Loading data for ${loadFunctions.length} registered tabs`);

    // Call all load functions in parallel with the request data
    const loadPromises = loadFunctions.map(async (loadFunction) => {
        try {
            await loadFunction(requestData);
        } catch (error) {
            console.warn('[ClientMaintenance] Failed to load tab data:', error);
        }
    });

    await Promise.all(loadPromises);
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
            applyBasicDetailsToMain(row);
            applyBasicDetailsToPersonal(row);
        }

        // Load all tab data after basic details are loaded
        await loadAllTabsData();
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
    const clientTypeSelect = shell.querySelector('#ddl_mainClientType');
    const clientGroupSelect = shell.querySelector('#ddl_mainClientGroup');

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
                const selectedClientType = record?.ClientTypeID || record?.ClientType || '';
                const selectedClientGroup = record?.ClientGroupID || record?.ClientGroup || '';
                const selectedClientGroupLabel = record?.ClientGroupName || record?.ClientGroupDescription || selectedClientGroup;

                if (clientIdInput) clientIdInput.value = selectedClientId;
                if (clientNameInput) clientNameInput.value = selectedClientName;
                setSelectValueWithFallback(clientTypeSelect, selectedClientType, selectedClientType);
                setSelectValueWithFallback(clientGroupSelect, selectedClientGroup, selectedClientGroupLabel);

                window.ClientMaintenanceCore.requestId = '';
                window.ClientMaintenanceCore.useRequestId = false;
                window.ClientMaintenanceCore.clientId = selectedClientId || '';

                await loadWorkflowStagesForClientType(selectedClientType);

                if (applicationIdInput) applicationIdInput.value = '';
                if (applicationNameInput) applicationNameInput.value = '';
                enableCancelButton();
                await loadClientBasicDetails(selectedClientId);

                // Notify sidebar that main client record is loaded
                if (window.SidebarManager && typeof window.SidebarManager.setMainRecordLoaded === 'function') {
                    window.SidebarManager.setMainRecordLoaded(true, selectedClientId);
                    console.log('[Client Maintenance] Notified sidebar of loaded client:', selectedClientId);
                }
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
            onSelect: async (record) => {
                const selectedRequestId = record?.ClientID || '';
                const selectedName = record?.Name || '';
                const selectedClientType = record?.ClientTypeID || record?.ClientType || '';
                const selectedClientGroup = record?.ClientGroupID || record?.ClientGroup || '';
                const selectedClientGroupLabel = record?.ClientGroupName || record?.ClientGroupDescription || selectedClientGroup;
                const selectedClientId = record?.RealClientID || record?.ExistingClientID || '';

                if (applicationIdInput) applicationIdInput.value = selectedRequestId;
                if (applicationNameInput) applicationNameInput.value = selectedName;

                window.ClientMaintenanceCore.requestId = selectedRequestId;
                window.ClientMaintenanceCore.useRequestId = true;
                window.ClientMaintenanceCore.clientId = selectedClientId || window.ClientMaintenanceCore.clientId || '';

                setSelectValueWithFallback(clientTypeSelect, selectedClientType, selectedClientType);
                setSelectValueWithFallback(clientGroupSelect, selectedClientGroup, selectedClientGroupLabel);
                await loadWorkflowStagesForClientType(selectedClientType);

                enableCancelButton();
                if (selectedClientId) {
                    if (clientIdInput) clientIdInput.value = selectedClientId;
                    if (clientNameInput && !clientNameInput.value) clientNameInput.value = selectedName;
                    await loadClientBasicDetails(selectedClientId);
                } else {
                    // If no client ID, still load all tab data with the request ID
                    await loadAllTabsData();
                }

                // Notify sidebar that main client record is loaded
                if (window.SidebarManager && typeof window.SidebarManager.setMainRecordLoaded === 'function') {
                    window.SidebarManager.setMainRecordLoaded(true, selectedClientId || selectedRequestId);
                    console.log('[Client Maintenance] Notified sidebar of loaded application:', selectedRequestId);
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

async function loadTabPartial(config, forceDataRefresh = false) {
    const pane = document.getElementById(config.pane);
    if (!pane) return;

    if (pane.dataset.loaded === 'true') {
        if (forceDataRefresh) {
            await ensureTabScriptLoaded(config);

            const initializer = window[config.initFn];
            if (typeof pane._cmLoadData !== 'function' && typeof initializer === 'function') {
                initializer(pane, window.ClientMaintenanceCore.moduleId || '');
            }

            await autoLoadTabData(config, pane);
        }
        return;
    }

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

    await ensureTabScriptLoaded(config);

    const initializer = window[config.initFn];
    if (typeof initializer === 'function') {
        initializer(pane, window.ClientMaintenanceCore.moduleId || '');
    } else {
        console.warn(`[ClientMaintenance] Initializer not found for ${config.key}: ${config.initFn}`);
    }

    await autoLoadTabData(config, pane);
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

    ensureBehindSceneVisible();
    initSectionToggles();

    // Load sidebar first
    await loadSidebar(window.ClientMaintenanceCore.moduleId);

    // Initialize sidebar manager with module name
    if (window.SidebarManager && typeof window.SidebarManager.init === 'function') {
        window.SidebarManager.init({
            moduleName: 'Client',
            isMainRecordLoaded: false,
            primaryRecordId: null
        });
        console.log('[Client Maintenance] Initialized sidebar manager');
    }

    // Initialize main client search
    initMainClientSearch(shell);

    const clientTypeSelect = shell.querySelector('#ddl_mainClientType');
    if (clientTypeSelect) {
        clientTypeSelect.addEventListener('change', async () => {
            await loadWorkflowStagesForClientType(clientTypeSelect.value);
        });

        if (clientTypeSelect.value) {
            await loadWorkflowStagesForClientType(clientTypeSelect.value);
        } else {
            renderWorkflowStageTabs([], 'Select a client type to load workflow stages.');
        }
    }

    document.getElementById('nav_clientMaintenanceTabs')?.addEventListener('shown.bs.tab', async (event) => {
        const targetSelector = event.target?.getAttribute('data-bs-target') || '';
        const paneId = targetSelector.replace('#', '');
        const config = clientMaintenanceStageTabs.find((x) => x.pane === paneId);
        if (!config) return;

        try {
            await loadTabPartial(config);
        } catch (error) {
            window.ClientMaintenanceCore.showToast(error.message, 'error');
        }

        // Update button states when tab changes
        updateSaveButtonState();
        updateTabNavigationButtons();
    });

    // Wire up Previous/Next navigation buttons
    document.getElementById('btn_cmPrevious')?.addEventListener('click', () => {
        navigateToPreviousTab();
    });

    document.getElementById('btn_cmNext')?.addEventListener('click', () => {
        navigateToNextTab();
    });

    document.getElementById('btn_cmCancel')?.addEventListener('click', (event) => {
        event.preventDefault();
        resetClientMaintenance();
    });

    // Initialize horizontal tab scrolling
    initializeTabHorizontalScroll();

    // Initialize button states on page load
    updateSaveButtonState();
    updateTabNavigationButtons();
    setClientLoadedState(false);
});

/**
 * Initialize horizontal scrolling for tabs
 */
function initializeTabHorizontalScroll() {
    const tabsContainer = document.querySelector('.cm-tabs-container');
    const scrollLeftBtn = document.getElementById('btn_tabsScrollLeft');
    const scrollRightBtn = document.getElementById('btn_tabsScrollRight');

    if (!tabsContainer || !scrollLeftBtn || !scrollRightBtn) return;

    const scrollAmount = 200; // pixels to scroll per click

    // Update scroll button states
    const updateScrollButtons = () => {
        const isAtStart = tabsContainer.scrollLeft <= 0;
        const isAtEnd = tabsContainer.scrollLeft >= (tabsContainer.scrollWidth - tabsContainer.clientWidth - 10);

        scrollLeftBtn.disabled = isAtStart;
        scrollRightBtn.disabled = isAtEnd;
    };

    // Scroll left
    scrollLeftBtn.addEventListener('click', () => {
        tabsContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        setTimeout(updateScrollButtons, 150);
    });

    // Scroll right
    scrollRightBtn.addEventListener('click', () => {
        tabsContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        setTimeout(updateScrollButtons, 150);
    });

    // Update buttons on scroll
    tabsContainer.addEventListener('scroll', updateScrollButtons);

    // Update buttons on window resize
    window.addEventListener('resize', updateScrollButtons);

    // Initial state
    updateScrollButtons();

    // Update when tabs are rendered
    const observer = new MutationObserver(() => {
        setTimeout(updateScrollButtons, 100);
    });

    observer.observe(tabsContainer, { childList: true, subtree: true });
}

/**
 * Update save button state based on current tab
 */
function updateSaveButtonState() {
    const saveBtn = document.querySelector('[data-submit-action="save"]');
    if (!saveBtn) return;

    // Get current active tab
    const activeTab = document.querySelector('#nav_clientMaintenanceTabs .nav-link.active');
    if (!activeTab) {
        saveBtn.disabled = true;
        return;
    }

    // Get the tab key from data attribute
    const tabKey = activeTab.getAttribute('data-cm-tab-key');

    // Enable save only if on Submit tab
    const isSubmitTab = tabKey === 'Submit' || tabKey?.toLowerCase() === 'submit';
    saveBtn.disabled = !isSubmitTab;
}

/**
 * Get the current active tab index
 */
function getCurrentTabIndex() {
    const activeTab = document.querySelector('#nav_clientMaintenanceTabs .nav-link.active');
    if (!activeTab) return -1;

    const tabs = Array.from(document.querySelectorAll('#nav_clientMaintenanceTabs .nav-link'));
    return tabs.indexOf(activeTab);
}

/**
 * Navigate to previous tab
 */
function navigateToPreviousTab() {
    const currentIndex = getCurrentTabIndex();
    if (currentIndex <= 0) return;

    const tabs = Array.from(document.querySelectorAll('#nav_clientMaintenanceTabs .nav-link'));
    const prevTab = tabs[currentIndex - 1];
    if (prevTab) {
        const bsTab = new bootstrap.Tab(prevTab);
        bsTab.show();
    }
}

/**
 * Navigate to next tab
 */
function navigateToNextTab() {
    const currentIndex = getCurrentTabIndex();
    const tabs = Array.from(document.querySelectorAll('#nav_clientMaintenanceTabs .nav-link'));

    if (currentIndex >= tabs.length - 1) return;

    const nextTab = tabs[currentIndex + 1];
    if (nextTab) {
        const bsTab = new bootstrap.Tab(nextTab);
        bsTab.show();
    }
}

/**
 * Update tab navigation button states
 */
function updateTabNavigationButtons() {
    const currentIndex = getCurrentTabIndex();
    const tabs = Array.from(document.querySelectorAll('#nav_clientMaintenanceTabs .nav-link'));

    const prevBtn = document.getElementById('btn_cmPrevious');
    const nextBtn = document.getElementById('btn_cmNext');

    if (prevBtn) {
        prevBtn.disabled = currentIndex <= 0 || tabs.length === 0;
    }

    if (nextBtn) {
        nextBtn.disabled = currentIndex >= tabs.length - 1 || tabs.length === 0;
    }
}

/**
 * Invoke update or create on current tab based on whether data exists
 */
async function saveCurrentTabData() {
    const activeTab = document.querySelector('#nav_clientMaintenanceTabs .nav-link.active');
    if (!activeTab) return;

    const tabKey = activeTab.getAttribute('data-cm-tab-key');
    const tabPaneSelector = activeTab.getAttribute('data-bs-target');
    const tabPane = document.querySelector(tabPaneSelector);

    if (!tabPane) return;

    // Get the service from the catalog
    const serviceKey = `Client${tabKey}Service`;
    const service = window[serviceKey];

    if (!service) {
        window.ClientMaintenanceCore.showToast(`Service for ${tabKey} not found`, 'error');
        return;
    }

    // Check if tab has loaded data (look for _cmLoadData or data indicators)
    const hasLoadedData = tabPane.querySelector('[data-cm-loaded]') !== null ||
        tabPane.querySelectorAll('input[value], select option:selected, textarea').length > 0;

    try {
        // Build request
        const moduleId = window.ClientMaintenanceCore.moduleId || '';
        const selectedId = window.ClientMaintenanceCore.getSelectedId();
        const requestId = window.ClientMaintenanceCore.requestId || '';

        const request = {
            ModuleID: moduleId,
            ClientID: selectedId,
            RequestID: requestId,
            Payload: {}
        };

        // Collect form data from tab
        tabPane.querySelectorAll('input, select, textarea').forEach((element) => {
            const key = element.name || element.id;
            if (!key) return;
            request.Payload[key] = element.type === 'checkbox' ? element.checked : element.value;
        });

        // Determine if we should call create or update
        const action = hasLoadedData ? 'update' : 'create';

        if (typeof service[action] !== 'function') {
            window.ClientMaintenanceCore.showToast(`${action} action not available for ${tabKey}`, 'error');
            return;
        }

        const response = await service[action](request);
        const success = response?.Success ?? response?.success ?? true;

        if (!success) {
            const error = response?.ErrorMessage || response?.errorMessage || `Failed to ${action}`;
            window.ClientMaintenanceCore.showToast(error, 'error');
            return;
        }

        window.ClientMaintenanceCore.showToast(`${tabKey}: ${action} completed`, 'success');
    } catch (error) {
        window.ClientMaintenanceCore.showToast(`Error: ${error.message}`, 'error');
    }
}

/**
 * Enable cancel button when client or application data is loaded
 */
function enableCancelButton() {
    setClientLoadedState(true);
}

function setClientLoadedState(isLoaded) {
    const cancelBtn = document.getElementById('btn_cmCancel');
    const clearBtn = document.getElementById('btn_cmClear') || document.querySelector('[data-submit-action="clear"]');
    const recordPrevBtn = document.querySelector('[data-record-nav="prev"]');
    const recordNextBtn = document.querySelector('[data-record-nav="next"]');

    if (cancelBtn) cancelBtn.disabled = !isLoaded;
    if (clearBtn) clearBtn.disabled = !isLoaded;
    if (recordPrevBtn) recordPrevBtn.disabled = !isLoaded;
    if (recordNextBtn) recordNextBtn.disabled = !isLoaded;
}

/**
 * Reset workflow and clear all fields
 */
async function resetClientMaintenance() {
    // Use AppCore.showConfirmation dialog
    const appCore = getAppCore();
    if (!appCore || !appCore.showConfirmation) {
        console.warn('AppCore dialog not available, using window.confirm');
        if (!window.confirm('Are you sure you want to clear all data and reset the workflow? This action cannot be undone.')) {
            return;
        }
    } else {
        const confirmed = await appCore.showConfirmation(
            'Reset Workflow',
            'Are you sure you want to clear all data and reset the workflow? This action cannot be undone.'
        );
        if (!confirmed) return;
    }

    try {
        // Clear all input fields
        const clientIdInput = document.getElementById('txt_mainClientId');
        const clientNameInput = document.getElementById('txt_mainClientName');
        const applicationIdInput = document.getElementById('txt_mainApplicationId');
        const applicationNameInput = document.getElementById('txt_mainApplicationName');
        const clientTypeSelect = document.getElementById('ddl_mainClientType');
        const clientGroupSelect = document.getElementById('ddl_mainClientGroup');

        if (clientIdInput) clientIdInput.value = '';
        if (clientNameInput) clientNameInput.value = '';
        if (applicationIdInput) applicationIdInput.value = '';
        if (applicationNameInput) applicationNameInput.value = '';
        if (clientTypeSelect) clientTypeSelect.value = '';
        if (clientGroupSelect) clientGroupSelect.value = '';

        // Clear CoreData
        window.ClientMaintenanceCore.clientId = null;
        window.ClientMaintenanceCore.requestId = null;
        window.ClientMaintenanceCore.useRequestId = false;
        window.ClientMaintenanceCore.workflowId = null;

        // Clear all tab content
        const tabContentWrapper = document.getElementById('dv_clientMaintenanceTabContent');
        if (tabContentWrapper) {
            tabContentWrapper.innerHTML = '<div class="text-muted py-2" data-cm-empty-stages>Select a client type to load workflow stages.</div>';
        }

        // Clear all tabs
        const navTabs = document.getElementById('nav_clientMaintenanceTabs');
        if (navTabs) {
            navTabs.innerHTML = '';
        }

        // Reset all tab tracking
        window.ClientMaintenanceCore.clearTabRegistry();
        clientMaintenanceStageTabs = [];
        clearAllTabCompletions();

        // Reset action buttons to disabled state
        setClientLoadedState(false);

        // Disable navigation buttons
        updateTabNavigationButtons();

        // Update save button state
        updateSaveButtonState();

        // Notify sidebar that the client record has been cleared
        if (window.SidebarManager && typeof window.SidebarManager.setMainRecordLoaded === 'function') {
            window.SidebarManager.setMainRecordLoaded(false, null);
            console.log('[Client Maintenance] Notified sidebar of cleared client state');
        }

        window.ClientMaintenanceCore.showToast('Workflow reset successfully', 'success');
    } catch (error) {
        window.ClientMaintenanceCore.showToast(`Error resetting workflow: ${error.message}`, 'error');
    }
}
