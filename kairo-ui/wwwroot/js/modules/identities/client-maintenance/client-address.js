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
        editing: null
    };

    const form = tabRoot.querySelector('[data-address-form]') || tabRoot;
    const table = tabRoot.querySelector('[data-table="addresses"]');

    const setFieldsEnabled = (enabled) => {
        state.enabled = enabled;
        form.querySelectorAll('[data-address-field]').forEach((field) => {
            field.disabled = !enabled;
        });
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

    const refreshAddressTable = async () => {
        const clientId = window.ClientMaintenanceCore.clientId || '';
        if (!clientId) {
            renderAddressTable([]);
            return;
        }
        try {
            const response = await window.ClientMaintenanceAddressService.get({
                ModuleID: moduleId || window.ClientMaintenanceCore.moduleId || '',
                ClientID: clientId
            });
            const rows = normalizeAddressRows(extractList(response));
            renderAddressTable(rows);
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
            ClientID: window.ClientMaintenanceCore.clientId || '',
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
    refreshAddressTable();

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

    form.querySelectorAll('[data-address-action]').forEach((button) => {
        button.addEventListener('click', async () => {
            const action = button.dataset.addressAction;
            if (!action) return;

            if (action === 'new') {
                resetForm();
                setFieldsEnabled(true);
                return;
            }

            if (action === 'alter') {
                if (!state.editing) {
                    window.ClientMaintenanceCore.showToast('Select an address first.', 'warning');
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
            const service = window.ClientMaintenanceAddressService;
            const isUpdate = action === 'update' && state.editing;
            const handler = action === 'remove' ? service.delete : (isUpdate ? service.update : service.create);

            try {
                const response = await handler(request);
                const success = response?.Success ?? response?.success ?? true;
                if (!success) {
                    const error = response?.ErrorMessage || response?.errorMessage || 'Address request failed';
                    window.ClientMaintenanceCore.showToast(error, 'error');
                    return;
                }

                window.ClientMaintenanceCore.showToast(`Address ${action} completed`, 'success');
                resetForm();
                setFieldsEnabled(false);
                await refreshAddressTable();
            } catch (error) {
                window.ClientMaintenanceCore.showToast(`Address ${action} failed - ${error.message}`, 'error');
            }
        });
    });
}
