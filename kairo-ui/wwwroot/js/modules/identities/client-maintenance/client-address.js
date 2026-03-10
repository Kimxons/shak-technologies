const CM_ADDRESS_BASE = 'Identities/ClientMaintenance/Address';

function invokeClientMaintenanceAddress(action, requestData) {
    return window.ClientMaintenanceCore.invokeControllerMethod(CM_ADDRESS_BASE, action, 'POST', requestData || {});
}

window.ClientMaintenanceAddressService = {
    get: (requestData) => invokeClientMaintenanceAddress('get', requestData),
    create: (requestData) => invokeClientMaintenanceAddress('create', requestData),
    update: (requestData) => invokeClientMaintenanceAddress('update', requestData),
    delete: (requestData) => invokeClientMaintenanceAddress('delete', requestData)
    // Note: Dropdown options are now rendered server-side in the Razor view
    // getAllOptions() endpoint is deprecated - maintain for backward compatibility only
};

// Helper function to load dropdown options from controller
// DEPRECATED: Dropdowns are now server-side rendered
/*
async function loadAddressDropdownOptions(selectElementId, action) {
    try {
        const selectElement = document.getElementById(selectElementId);
        if (!selectElement) return;
        const result = await invokeClientMaintenanceAddress(action, {});
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

window.initClientMaintenanceAddressTab = function (tabRoot, moduleId) {
    initAddressValidation();
    bindAddressCrud(tabRoot, moduleId);
};

// Helper function to populate a single dropdown from options array
// DEPRECATED: Dropdowns are now server-side rendered
/*
function populateAddressDropdownOptions(selectElementId, optionsList) {
    try {
        const selectElement = document.getElementById(selectElementId);
        if (!selectElement || !optionsList) return;

        while (selectElement.options.length > 1) {
            selectElement.remove(1);
        }

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
*/

function initAddressValidation() {
    const utils = window.ValidationUtils;
    if (!utils) return;

    // Email validation
    const emailInput = document.getElementById('txt_addressEmail');
    if (emailInput) {
        emailInput.addEventListener('blur', () => {
            if (emailInput.value && !utils.isValidEmail(emailInput.value)) {
                utils.showError(emailInput, 'Please enter a valid email address');
            } else {
                utils.clearError(emailInput);
            }
        });
    }

    // Phone fields - phone format
    const phoneWorkInput = document.getElementById('txt_addressPhoneWork');
    const phoneHomeInput = document.getElementById('txt_addressPhoneHome');
    const mobileInput = document.getElementById('txt_addressMobile');

    [phoneWorkInput, phoneHomeInput, mobileInput].forEach(input => {
        if (input) utils.restrictPhone(input, 15);
    });

    // Zip code - alphanumeric
    const zipCodeInput = document.getElementById('txt_addressZipCode');
    if (zipCodeInput) utils.restrictAlphanumeric(zipCodeInput);

    // House number - alphanumeric
    const houseNoInput = document.getElementById('txt_addressHouseNo');
    if (houseNoInput) utils.restrictAlphanumeric(houseNoInput);
}

function bindAddressCrud(tabRoot, moduleId) {
    if (!tabRoot) return;

    const state = {
        enabled: false,
        editing: null,
        mode: 'view'
    };

    const form = tabRoot.querySelector('[data-address-form]') || tabRoot;
    const table = tabRoot.querySelector('[data-table="addresses"]');

    const setMode = (mode) => {
        state.mode = mode || 'view';
    };

    const setEntryActionButtons = (enabled) => {
        const updateBtn = tabRoot.querySelector('[data-address-action="update"]');
        const clearBtn = tabRoot.querySelector('[data-address-action="clear"]');
        if (updateBtn) updateBtn.disabled = !enabled;
        if (clearBtn) clearBtn.disabled = !enabled;
    };

    const setFieldsEnabled = (enabled) => {
        const allowEdit = Boolean(window.ClientMaintenanceCore?.isEditMode);
        const nextEnabled = allowEdit && enabled;

        state.enabled = nextEnabled;
        form.querySelectorAll('[data-address-field]').forEach((field) => {
            field.disabled = !nextEnabled;
        });
        setEntryActionButtons(nextEnabled);
    };

    const getSelectLabel = (selector, value) => {
        const el = form.querySelector(selector);
        if (!el || value === undefined || value === null || value === '') return '';
        const option = el.querySelector(`option[value="${value}"]`);
        return option ? option.textContent.trim() : '';
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

    const normalizeAddressRows = (rows) => (rows || []).map((row) => ({
        ID: row.ID ?? row.AddressID ?? row.AddressId ?? null,
        AddressTypeID: row.AddressTypeID ?? row.AddressTypeId ?? '',
        IsMailingAddress: row.IsMailingAddress ?? row.IsMailing ?? false,
        Address1: row.Address1 ?? row.AddressLine1 ?? '',
        Address2: row.Address2 ?? row.AddressLine2 ?? '',
        CityID: row.CityID ?? row.CityId ?? '',
        CountryID: row.CountryID ?? row.CountryId ?? '',
        Region: row.Region ?? row.RegionID ?? row.RegionId ?? '',
        SubCityZone: row.SubCityZone ?? row.SubCityID ?? row.SubCityId ?? '',
        Wereda: row.Wereda ?? '',
        Kebele: row.Kebele ?? '',
        HouseNumber: row.HouseNumber ?? row.HouseNo ?? '',
        ZipCode: row.ZipCode ?? row.ZIPCode ?? '',
        Language: row.Language ?? '',
        LandMark: row.LandMark ?? row.Landmark ?? '',
        PhoneWork: row.PhoneWork ?? row.Phone1 ?? '',
        PhoneHome: row.PhoneHome ?? row.Phone2 ?? '',
        Mobile: row.Mobile ?? row.MobileNo ?? '',
        Email: row.Email ?? '',
        UpdateCount: row.UpdateCount ?? null
    }));

    const renderAddressTable = (rows) => {
        const tbody = table?.querySelector('tbody') || tabRoot.querySelector('#tbl_clientAddressBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        (rows || []).forEach((entry, index) => {
            const tr = document.createElement('tr');
            tr.dataset.index = String(index);
            tr.dataset.payload = JSON.stringify(entry);

            const addressLabel = [entry.Address1, entry.Address2].filter(Boolean).join(', ');
            const typeLabel = getSelectLabel('[data-address-field="AddressTypeID"]', entry.AddressTypeID) || entry.AddressTypeID || '';
            const cityLabel = getSelectLabel('[data-address-field="CityID"]', entry.CityID) || entry.CityID || '';
            const regionLabel = getSelectLabel('[data-address-field="Region"]', entry.Region) || entry.Region || '';
            const mailing = entry.IsMailingAddress ? '<i class="bi bi-check-circle-fill text-success"></i>' : '';

            tr.innerHTML = `
                <td class="ps-2">${typeLabel}</td>
                <td>${addressLabel}</td>
                <td>${cityLabel}</td>
                <td>${regionLabel}</td>
                <td>${entry.Mobile || ''}</td>
                <td class="text-center">${mailing}</td>
            `;
            tbody.appendChild(tr);
        });
    };

    const refreshAddressTable = async (requestData) => {
        // Get client ID and request ID from parent context
        const clientId = requestData?.ClientID || window.ClientMaintenanceCore?.clientId || '';
        const requestId = requestData?.RequestID || window.ClientMaintenanceCore?.requestId || '';
        
        // Need at least one identifier (ClientID or RequestID) to fetch addresses
        if (!clientId && !requestId) {
            renderAddressTable([]);
            return;
        }
        try {
            const response = await window.ClientMaintenanceAddressService.get({
                ModuleID: moduleId || window.ClientMaintenanceCore.moduleId || '',
                ClientID: clientId,
                RequestID: requestId
            });
   const rows = normalizeAddressRows(extractList(response));
            renderAddressTable(rows);
                        setMode(rows.length > 0 ? 'edit' : 'view');
        } catch (error) {
    window.ClientMaintenanceCore.showToast(`Address load failed - ${error.message}`, 'error');
  }
    };

    const resetForm = () => {
        form.querySelectorAll('[data-address-field]').forEach((field) => {
            if (field.type === 'checkbox') {
                field.checked = false;
            } else {
                field.value = '';
            }
        });
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
        form.querySelectorAll('[data-address-field]').forEach((field) => {
       const key = field.dataset.addressField;
       if (!key) return;
     payload[key] = readFieldValue(field);
        });

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
        form.querySelectorAll('[data-address-field]').forEach((field) => {
            const key = field.dataset.addressField;
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
    tabRoot._cmLoadData = (requestData) => refreshAddressTable(requestData);
    window.ClientMaintenanceCore.registerTabLoadFunction('Address', (requestData) => refreshAddressTable(requestData));

    // Initialize all action buttons as disabled until edit mode
    const newBtn = tabRoot.querySelector('[data-address-action="new"]');
    if (newBtn) newBtn.disabled = true;
    enableGridRowActions(tabRoot, false);

    // Edit mode handler - called from main client maintenance view
    tabRoot._cmSetEditMode = (isEditMode) => {
        if (isEditMode) {
            // Enable New button to add addresses in edit mode
            const newBtn = tabRoot.querySelector('[data-address-action="new"]');
            if (newBtn) newBtn.disabled = false;
        } else {
            // Disable action buttons when exiting edit mode
            setFieldsEnabled(false);
            const newBtn = tabRoot.querySelector('[data-address-action="new"]');
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

    tabRoot.querySelectorAll('[data-address-action]').forEach((button) => {
        button.addEventListener('click', async () => {
            const action = button.dataset.addressAction;
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
                    window.ClientMaintenanceCore.showToast('Select an address first.', 'warning');
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
                const newBtn = tabRoot.querySelector('[data-address-action="new"]');
                if (newBtn) newBtn.disabled = false;
                return;
            }

            // Confirm before removing
            if (action === 'remove') {
                if (!state.editing) {
                    window.ClientMaintenanceCore.showToast('Select an address to remove.', 'warning');
                    return;
                }
                
                const appCore = window.ClientMaintenanceCore?.getAppCore?.() || window.AppCore;
                let confirmed = false;
                if (!appCore || !appCore.showConfirmation) {
                    confirmed = window.confirm('Are you sure you want to remove this address?');
                } else {
                    confirmed = await appCore.showConfirmation(
                        'Confirm Remove',
                        'Are you sure you want to remove this address?'
                    );
                }
                if (!confirmed) return;
                setMode('delete');
            }

            const request = buildPayload();
            const service = window.ClientMaintenanceAddressService;
            const mode = state.mode === 'view'
                ? (state.editing ? 'edit' : 'add')
                : state.mode;

            if ((mode === 'edit' || mode === 'delete') && !state.editing) {
                window.ClientMaintenanceCore.showToast('Select an address first.', 'warning');
                return;
            }

            const handler = mode === 'delete'
                ? service.delete
                : (mode === 'edit' ? service.update : service.create);
            const actionLabel = mode === 'delete' ? 'remove' : (mode === 'edit' ? 'update' : 'create');

            try {
                const response = await handler(request);
                const success = response?.Success ?? response?.success ?? true;
                if (!success) {
                    const error = response?.ErrorMessage || response?.errorMessage || 'Address request failed';
                    window.ClientMaintenanceCore.showToast(error, 'error');
                    return;
                }

                window.ClientMaintenanceCore.showToast(`Address ${actionLabel} completed`, 'success');
                resetForm();
                setFieldsEnabled(false);
                enableGridRowActions(tabRoot, false);
                setMode('view');
                // Re-enable New button after successful save
                const newBtn = tabRoot.querySelector('[data-address-action="new"]');
                if (newBtn) newBtn.disabled = false;
                await refreshAddressTable();
            } catch (error) {
                window.ClientMaintenanceCore.showToast(`Address ${actionLabel} failed - ${error.message}`, 'error');
            }
        });
    });
}
