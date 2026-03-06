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
        editing: null
    };

    const form = tabRoot.querySelector('[data-relations-form]') || tabRoot;
    const table = tabRoot.querySelector('[data-table="relations"]');

    const setFieldsEnabled = (enabled) => {
        state.enabled = enabled;
        form.querySelectorAll('[data-relation-field]').forEach((field) => {
            field.disabled = !enabled;
        });
        const lookupBtn = form.querySelector('[data-relation-action="lookup"]');
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
  // Get client ID from parent context if not provided in requestData
   const clientId = requestData?.ClientID || 
  window.ClientMaintenanceCore?.getSelectedId?.() || 
       window.ClientMaintenanceCore?.clientId || '';
        
 if (!clientId) {
            renderRelationsTable([]);
            return;
        }
        try {
   const response = await window.ClientMaintenanceRelationsService.get({
     ModuleID: moduleId || window.ClientMaintenanceCore.moduleId || '',
    ClientID: clientId,
   RequestID: requestData?.RequestID || window.ClientMaintenanceCore.requestId || ''
  });
            const rows = normalizeRelationRows(extractList(response));
   renderRelationsTable(rows);
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
        state.editing = null;
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

        return {
            ModuleID: moduleId || window.ClientMaintenanceCore.moduleId || '',
            // Always use parent client ID from ClientMaintenanceCore
            ClientID: window.ClientMaintenanceCore?.getSelectedId?.() || 
    window.ClientMaintenanceCore?.clientId || '',
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

    setFieldsEnabled(false);
    tabRoot._cmLoadData = (requestData) => refreshRelationsTable(requestData);

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

    form.querySelectorAll('[data-relation-action]').forEach((button) => {
        button.addEventListener('click', async () => {
            const action = button.dataset.relationAction;
            if (!action) return;

            if (action === 'new') {
                resetForm();
                setFieldsEnabled(true);
                return;
            }

            if (action === 'alter') {
                if (!state.editing) {
                    window.ClientMaintenanceCore.showToast('Select a relation first.', 'warning');
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
            const service = window.ClientMaintenanceRelationsService;
            const isUpdate = action === 'update' && state.editing;
            const handler = action === 'remove' ? service.delete : (isUpdate ? service.update : service.create);

            try {
                const response = await handler(request);
                const success = response?.Success ?? response?.success ?? true;
                if (!success) {
                    const error = response?.ErrorMessage || response?.errorMessage || 'Relations request failed';
                    window.ClientMaintenanceCore.showToast(error, 'error');
                    return;
                }

                window.ClientMaintenanceCore.showToast(`Relations ${action} completed`, 'success');
                resetForm();
                setFieldsEnabled(false);
                await refreshRelationsTable();
            } catch (error) {
                window.ClientMaintenanceCore.showToast(`Relations ${action} failed - ${error.message}`, 'error');
            }
        });
    });
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
    
    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
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
            onSelect: (record) => {
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
            }
        });
    });
}
