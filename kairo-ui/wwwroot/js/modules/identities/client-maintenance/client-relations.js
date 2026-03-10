const CM_RELATIONS_BASE = 'Identities/ClientMaintenance/Relations';

function invokeClientMaintenanceRelations(action, requestData) {
    return window.ClientMaintenanceCore.invokeControllerMethod(CM_RELATIONS_BASE, action, 'POST', requestData || {});
}

window.ClientMaintenanceRelationsService = {
    get: (requestData) => invokeClientMaintenanceRelations('get', requestData),
    create: (requestData) => invokeClientMaintenanceRelations('create', requestData),
    update: (requestData) => invokeClientMaintenanceRelations('update', requestData),
    delete: (requestData) => invokeClientMaintenanceRelations('delete', requestData)
    // Note: Dropdown options are now rendered server-side in the Razor view
    // getAllOptions() endpoint is deprecated - maintain for backward compatibility only
};

// Helper function to load dropdown options from controller
// DEPRECATED: Dropdowns are now server-side rendered
/*
async function loadRelationsDropdownOptions(selectElementId, action) {
    try {
        const selectElement = document.getElementById(selectElementId);
        if (!selectElement) return;
        const result = await invokeClientMaintenanceRelations(action, {});
        if (!result.success || !result.data) return;

        while (selectElement.options.length > 1) {
            selectElement.remove(1);
        }

        result.data.forEach((option) => {
            const optEl = document.createElement('option');
            optEl.value = option.value;
            optEl.textContent = option.label;
            selectElement.appendChild(optEl);
        });
    } catch (error) {
        console.error(`Error loading dropdown options for ${selectElementId}:`, error);
    }
}
*/

window.initClientMaintenanceRelationsTab = function (tabRoot, moduleId) {
    initRelationsValidation();
    bindRelationsCrud(tabRoot, moduleId);
    initRelationsSearchModal(tabRoot, moduleId);
};

// Helper function to populate a single dropdown from options array
function populateRelationsDropdownOptions(selectElementId, optionsList) {
    try {
        const selectElement = document.getElementById(selectElementId);
        if (!selectElement || !optionsList) return;

        // Clear existing options except the first one (placeholder)
        while (selectElement.options.length > 1) {
            selectElement.remove(1);
        }

        // Add new options
        optionsList.forEach((option) => {
            const optEl = document.createElement('option');
            optEl.value = option.value;
            optEl.textContent = option.label;
            selectElement.appendChild(optEl);
        });
    } catch (error) {
        console.error(`Error populating dropdown ${selectElementId}:`, error);
    }
}

function initRelationsValidation() {
    const utils = window.ValidationUtils;
    if (!utils) return;

    // Name fields - alphabetic only
    const firstNameInput = document.getElementById('txt_relationFirstName');
    const middleNameInput = document.getElementById('txt_relationMiddleName');
    const lastNameInput = document.getElementById('txt_relationLastName');

    [firstNameInput, middleNameInput, lastNameInput].forEach(input => {
        if (input) utils.restrictAlphabetic(input);
    });

    // Share percentage - numeric, 0-100
    const shareInput = document.getElementById('txt_relationShare');
    if (shareInput) {
        shareInput.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (value < 0) e.target.value = 0;
            if (value > 100) e.target.value = 100;
        });

        shareInput.addEventListener('blur', () => {
            if (shareInput.value && !utils.isWithinRange(shareInput.value, 0, 100)) {
                utils.showError(shareInput, 'Share must be between 0 and 100');
            } else {
                utils.clearError(shareInput);
            }
        });
    }

    // Mobile - phone format
    const mobileInput = document.getElementById('txt_relationMobile');
    if (mobileInput) utils.restrictPhone(mobileInput, 15);

    // Related Client ID - alphanumeric
    const clientIdInput = document.getElementById('txt_relationClientId');
    if (clientIdInput) utils.restrictAlphanumeric(clientIdInput);
}

function bindRelationsCrud(tabRoot, moduleId) {
    if (!tabRoot) return;

    const state = {
        enabled: false,
        editing: null,
        mode: 'view'
    };

    const form = tabRoot.querySelector('[data-relations-form]') || tabRoot;
    const table = tabRoot.querySelector('[data-table="relations"]');

    const setMode = (mode) => {
        state.mode = mode || 'view';
    };

    const setEntryActionButtons = (enabled) => {
        const updateBtn = tabRoot.querySelector('[data-relation-action="update"]');
        const clearBtn = tabRoot.querySelector('[data-relation-action="clear"]');
        if (updateBtn) updateBtn.disabled = !enabled;
        if (clearBtn) clearBtn.disabled = !enabled;
    };

    const setFieldsEnabled = (enabled) => {
        const allowEdit = Boolean(window.ClientMaintenanceCore?.isEditMode);
        const nextEnabled = allowEdit && enabled;

        state.enabled = nextEnabled;
        form.querySelectorAll('[data-relation-field]').forEach((field) => {
            field.disabled = !nextEnabled;
        });
        const lookupBtn = form.querySelector('[data-relation-action="lookup"]');
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

    const normalizeRelationRows = (rows) => (rows || []).map((row) => ({
        ID: row.ID ?? row.ClientToRelationID ?? null,
        ClientToRelationID: row.ClientToRelationID ?? row.ID ?? null,
        RelatedClientID: row.RelatedClientID ?? '',
        RelationID: row.RelationID ?? '',
        RelationTypeID: row.RelationTypeID ?? row.RelationType ?? '',
        IdentificationTypeID: row.IdentificationTypeID ?? '',
        IdentificationNo: row.IdentificationNo ?? row.IdentificationNumber ?? '',
        RelationRefNo: row.RelationRefNo ?? 1,
        SharePercent: row.SharePercent ?? '',
        Name: row.Name ?? '',
        TitleID: row.TitleID ?? '',
        GenderID: row.GenderID ?? '',
        FirstName: row.FirstName ?? '',
        MiddleName: row.MiddleName ?? '',
        LastName: row.LastName ?? '',
        Mobile: row.Mobile ?? row.MobileNo ?? ''
    }));

    const getSelectLabel = (selector, value) => {
        const el = form.querySelector(selector);
        if (!el || value === undefined || value === null || value === '') return '';
        const option = el.querySelector(`option[value="${value}"]`);
        return option ? option.textContent.trim() : '';
    };

    const renderRelationsTable = (rows) => {
        const tbody = table?.querySelector('tbody') || tabRoot.querySelector('#tbl_clientRelationsBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        (rows || []).forEach((entry, index) => {
            const tr = document.createElement('tr');
            tr.dataset.index = String(index);
            tr.dataset.payload = JSON.stringify(entry);

            const relationLabel = getSelectLabel('[data-relation-field="RelationID"]', entry.RelationID) || entry.RelationID || '';
            const name = entry.Name || [entry.FirstName, entry.MiddleName, entry.LastName].filter(Boolean).join(' ') || '';
            const idLabel = entry.IdentificationNo || '';

            tr.innerHTML = `
                <td class="ps-2">${name}</td>
                <td>${relationLabel}</td>
                <td>${idLabel}</td>
                <td>${entry.SharePercent ?? ''}</td>
                <td>${entry.Mobile ?? ''}</td>
            `;
            tbody.appendChild(tr);
        });
    };

    const refreshRelationsTable = async (requestData) => {
        // Get client ID and request ID from parent context
        const clientId = requestData?.ClientID || window.ClientMaintenanceCore?.clientId || '';
        const requestId = requestData?.RequestID || window.ClientMaintenanceCore?.requestId || '';
        
        // Need at least one identifier (ClientID or RequestID) to fetch relations
        if (!clientId && !requestId) {
            renderRelationsTable([]);
            return;
        }
        try {
            const response = await window.ClientMaintenanceRelationsService.get({
                ModuleID: moduleId || window.ClientMaintenanceCore.moduleId || '',
                ClientID: clientId,
                RequestID: requestId
            });
            const rows = normalizeRelationRows(extractList(response));
            renderRelationsTable(rows);
            setMode(rows.length > 0 ? 'edit' : 'view');
        } catch (error) {
            window.ClientMaintenanceCore.showToast(`Relations load failed - ${error.message}`, 'error');
        }
    };

    const resetForm = () => {
        form.querySelectorAll('[data-relation-field]').forEach((field) => {
            if (field.type === 'checkbox') {
                field.checked = false;
            } else {
                field.value = '';
            }
        });
        const clientNameField = form.querySelector('#txt_relationClientName');
        if (clientNameField) clientNameField.value = '';
        state.editing = null;
        setMode('view');
    };

    const readFieldValue = (field) => {
        if (field.type === 'checkbox') {
            return field.checked;
        }
        return field.value ?? '';
    };

    const buildPayload = () => {
        const payload = {};
        form.querySelectorAll('[data-relation-field]').forEach((field) => {
            const key = field.dataset.relationField;
            if (!key) return;
            payload[key] = readFieldValue(field);
        });

        // Include ID fields from editing state for update/delete operations
        if (state.editing) {
            payload.ID = state.editing.ID || state.editing.ClientToRelationID || null;
            payload.ClientToRelationID = state.editing.ClientToRelationID || state.editing.ID || null;
        }

        return {
            ModuleID: moduleId || window.ClientMaintenanceCore.moduleId || '',
            // Use actual ClientID and RequestID from parent context
            ClientID: window.ClientMaintenanceCore?.clientId || '',
            RequestID: window.ClientMaintenanceCore?.requestId || '',
            Payload: payload
        };
    };

    const applyRowPayload = (payload) => {
        if (!payload) return;
        form.querySelectorAll('[data-relation-field]').forEach((field) => {
            const key = field.dataset.relationField;
            if (!key) return;
            const value = payload[key];
            if (field.type === 'checkbox') {
                field.checked = Boolean(value);
            } else {
                field.value = value ?? '';
            }
        });
    };

    // Validation: Check for duplicate RelatedClientID
    const isDuplicateRelation = (relatedClientId) => {
        if (!relatedClientId) return false;
        const tbody = table?.querySelector('tbody') || tabRoot.querySelector('#tbl_clientRelationsBody');
        if (!tbody) return false;
        
        const rows = tbody.querySelectorAll('tr[data-payload]');
        for (const row of rows) {
            const existingPayload = JSON.parse(row.dataset.payload || '{}');
            // Skip the row we're currently editing
            if (state.editing && existingPayload.ID === state.editing.ID) continue;
            if (existingPayload.RelatedClientID === relatedClientId) {
                return true;
            }
        }
        return false;
    };

    // Validation: Calculate total share percentage
    const calculateTotalShare = (excludeCurrentEdit = false) => {
        const tbody = table?.querySelector('tbody') || tabRoot.querySelector('#tbl_clientRelationsBody');
        if (!tbody) return 0;
        
        const rows = tbody.querySelectorAll('tr[data-payload]');
        let total = 0;
        for (const row of rows) {
            const existingPayload = JSON.parse(row.dataset.payload || '{}');
            // Skip the row we're currently editing when checking for update
            if (excludeCurrentEdit && state.editing && existingPayload.ID === state.editing.ID) continue;
            const share = parseFloat(existingPayload.SharePercent) || 0;
            total += share;
        }
        return total;
    };

    setFieldsEnabled(false);
    tabRoot._cmLoadData = (requestData) => refreshRelationsTable(requestData);
    window.ClientMaintenanceCore.registerTabLoadFunction('Relations', (requestData) => refreshRelationsTable(requestData));

    // Initialize all action buttons as disabled until edit mode
    const newBtn = tabRoot.querySelector('[data-relation-action="new"]');
    if (newBtn) newBtn.disabled = true;
    enableGridRowActions(tabRoot, false);

    // Edit mode handler - called from main client maintenance view
    tabRoot._cmSetEditMode = (isEditMode) => {
        if (isEditMode) {
            // Enable New button to add relations in edit mode
            const newBtn = tabRoot.querySelector('[data-relation-action="new"]');
            if (newBtn) newBtn.disabled = false;
        } else {
            // Disable action buttons when exiting edit mode
            setFieldsEnabled(false);
            const newBtn = tabRoot.querySelector('[data-relation-action="new"]');
            if (newBtn) newBtn.disabled = true;
            enableGridRowActions(tabRoot, false);
        }
    };

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
        setMode('edit');
        setFieldsEnabled(false);
        // Enable action buttons (update/alter, remove, clear) when row is selected
        enableGridRowActions(tabRoot, true);
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
        setMode('edit');
        setFieldsEnabled(true);
    });

    tabRoot.querySelectorAll('[data-relation-action]').forEach((button) => {
        button.addEventListener('click', async () => {
            const action = button.dataset.relationAction;
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
                    window.ClientMaintenanceCore.showToast('Select a relation first.', 'warning');
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
                const newBtn = tabRoot.querySelector('[data-relation-action="new"]');
                if (newBtn) newBtn.disabled = false;
                return;
            }

            // Validation: Remove requires selection
            if (action === 'remove') {
                if (!state.editing) {
                    window.ClientMaintenanceCore.showToast('Select a relation to remove.', 'warning');
                    return;
                }
                
                // Confirm before removing
                const appCore = window.ClientMaintenanceCore?.getAppCore?.() || window.AppCore;
                let confirmed = false;
                if (!appCore || !appCore.showConfirmation) {
                    confirmed = window.confirm('Are you sure you want to remove this relation?');
                } else {
                    confirmed = await appCore.showConfirmation(
                        'Confirm Remove',
                        'Are you sure you want to remove this relation?'
                    );
                }
                if (!confirmed) return;
                setMode('delete');
            }

            const request = buildPayload();
            const relatedClientId = request?.Payload?.RelatedClientID;
            const sharePercent = parseFloat(request?.Payload?.SharePercent) || 0;

            const mode = state.mode === 'view'
                ? (state.editing ? 'edit' : 'add')
                : state.mode;

            if ((mode === 'edit' || mode === 'delete') && !state.editing) {
                window.ClientMaintenanceCore.showToast('Select a relation first.', 'warning');
                return;
            }

            // Validation: Duplicate check for create/update
            if ((mode === 'add' || mode === 'edit') && relatedClientId) {
                if (isDuplicateRelation(relatedClientId)) {
                    window.ClientMaintenanceCore.showToast(
                        `Relation with Client ID "${relatedClientId}" already exists.`,
                        'warning'
                    );
                    return;
                }
            }

            // Validation: Total share cannot exceed 100%
            if (mode === 'add' || mode === 'edit') {
                const currentTotal = calculateTotalShare(mode === 'edit');
                const newTotal = currentTotal + sharePercent;
                
                if (newTotal > 100) {
                    window.ClientMaintenanceCore.showToast(
                        `Total share percentage cannot exceed 100%. Current total: ${currentTotal.toFixed(2)}%, Attempting to add: ${sharePercent.toFixed(2)}%`,
                        'warning'
                    );
                    return;
                }
            }

            const service = window.ClientMaintenanceRelationsService;
            const handler = mode === 'delete'
                ? service.delete
                : (mode === 'edit' ? service.update : service.create);
            const actionLabel = mode === 'delete' ? 'remove' : (mode === 'edit' ? 'update' : 'create');

            try {
                const response = await handler(request);
                const success = response?.Success ?? response?.success ?? true;
                if (!success) {
                    const error = response?.ErrorMessage || response?.errorMessage || 'Relations request failed';
                    window.ClientMaintenanceCore.showToast(error, 'error');
                    return;
                }

                window.ClientMaintenanceCore.showToast(`Relations ${actionLabel} completed`, 'success');
                resetForm();
                setFieldsEnabled(false);
                enableGridRowActions(tabRoot, false);
                setMode('view');
                // Re-enable New button after successful save
                const newBtn = tabRoot.querySelector('[data-relation-action="new"]');
                if (newBtn) newBtn.disabled = false;
                await refreshRelationsTable();
            } catch (error) {
                window.ClientMaintenanceCore.showToast(`Relations ${actionLabel} failed - ${error.message}`, 'error');
            }
        });
    });
}

/**
 * Hydrate relation form fields from related client ID
 */
async function hydrateRelationFormFromRelatedClientId(tabRoot, relatedClientId) {
    if (!relatedClientId || !window.ClientMaintenanceCore) return;
    
    try {
        // Use ClientMaintenance service to fetch individual client details
        if (typeof window.ClientMaintenanceCore.invokeControllerMethod !== 'function') return;

        const response = await window.ClientMaintenanceCore.invokeControllerMethod(
            'Identities/ClientMaintenance/ClientIndividual',
            'get',
            'POST',
            {
                ModuleID: window.ClientMaintenanceCore.moduleId || '',
                ClientID: relatedClientId
            }
        );
        
        if (!response?.Success && !response?.success) return;
        
        const clientData = response?.Data || response?.data || response?.Payload || {};
        
        // Populate name fields
        const firstNameField = tabRoot.querySelector('[data-relation-field="FirstName"]');
        const middleNameField = tabRoot.querySelector('[data-relation-field="MiddleName"]');
        const lastNameField = tabRoot.querySelector('[data-relation-field="LastName"]');
        const genderField = tabRoot.querySelector('[data-relation-field="GenderID"]');
        const clientNameField = tabRoot.querySelector('#txt_relationClientName');
        
        if (firstNameField && clientData.FirstName) firstNameField.value = clientData.FirstName;
        if (middleNameField && clientData.MiddleName) middleNameField.value = clientData.MiddleName;
        if (lastNameField && clientData.LastName) lastNameField.value = clientData.LastName;
        if (genderField && clientData.GenderID) genderField.value = clientData.GenderID;
        
        if (clientNameField) {
            const name = [clientData.FirstName, clientData.MiddleName, clientData.LastName]
                .filter(Boolean).join(' ') || clientData.Name || '';
            clientNameField.value = name;
        }
    } catch (error) {
        console.warn('[Relations] Failed to hydrate from related client ID:', error);
    }
}

/**
 * Initialize SearchModal for finding related clients
 */
function initRelationsSearchModal(tabRoot, moduleId) {
    if (!tabRoot) return;
    
    const searchBtn = tabRoot.querySelector('[data-relation-action="lookup"]');
    if (!searchBtn) return;

    const appCore = window.ClientMaintenanceCore?.getAppCore?.() || window.AppCore;
    if (!appCore) {
        console.warn('[Relations] AppCore not available for SearchModal');
        return;
    }
    
    // Get or create SearchModal instance
    let searchModal = window._relationsSearchModal;
    if (!searchModal && window.SearchModal) {
        searchModal = new window.SearchModal(appCore);
        window._relationsSearchModal = searchModal;
    }
    
    if (!searchModal) {
        console.warn('[Relations] SearchModal not available');
        return;
    }
    
    // Helper function to open the search modal
    const openSearchModal = () => {
        const currentValue = tabRoot.querySelector('[data-relation-field="RelatedClientID"]')?.value || '';
        
        searchModal.open({
            title: 'Find Related Client',
            tableID: 'ClientID',
            moduleID: moduleId,
            searchFields: [
                { name: 'ClientID', label: 'Client ID', column: 'ClientID', value: currentValue },
                { name: 'Name', label: 'Client Name', column: 'Name' }
            ],
            autoSearch: false,
            onSelect: async (record) => {
                // Populate the related client ID
                const clientIdField = tabRoot.querySelector('[data-relation-field="RelatedClientID"]');
                if (clientIdField) {
                    clientIdField.value = record.ClientID || '';
                }

                const clientNameField = tabRoot.querySelector('#txt_relationClientName');
                if (clientNameField) {
                    clientNameField.value = record.Name || '';
                }
                
                // Populate name fields from the selected client if available
                const firstNameField = tabRoot.querySelector('[data-relation-field="FirstName"]');
                const middleNameField = tabRoot.querySelector('[data-relation-field="MiddleName"]');
                const lastNameField = tabRoot.querySelector('[data-relation-field="LastName"]');
                const genderField = tabRoot.querySelector('[data-relation-field="GenderID"]');
                
                if (firstNameField) firstNameField.value = record.FirstName || '';
                if (middleNameField) middleNameField.value = record.MiddleName || '';
                if (lastNameField) lastNameField.value = record.LastName || '';
                if (genderField) genderField.value = record.GenderID || '';

                const selectedId = record.ClientID || '';
                if (selectedId) {
                    await hydrateRelationFormFromRelatedClientId(tabRoot, selectedId);
                }
            }
        });
    };
    
    // Button click handler
    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openSearchModal();
    });
    
    // Add blur event handler for auto-hydration when RelatedClientID is manually entered
    const clientIdField = tabRoot.querySelector('[data-relation-field="RelatedClientID"]');
    if (clientIdField) {
        clientIdField.addEventListener('blur', async (e) => {
            const value = e.target.value?.trim();
            if (value) {
                await hydrateRelationFormFromRelatedClientId(tabRoot, value);
            }
        });
        
        // F2 key handler to open search modal
        clientIdField.addEventListener('keydown', (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                openSearchModal();
            }
        });
    }
}
