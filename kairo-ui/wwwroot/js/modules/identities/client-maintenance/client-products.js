const CM_PRODUCTS_BASE = 'Identities/ClientMaintenance/Products';

// Explicit field mapping for Products tab: API response key => form field ID/name
const PRODUCTS_FIELD_MAP = {
    'ProductID': 'sel_productsProduct',
    'ProductCode': 'txt_productsProductCode',
    'ProductName': 'txt_productsProductName',
    'Status': 'sel_productsStatus',
    'OpenedOn': 'dt_productsOpenedOn',
    'Amount': 'txt_productsAmount',
    'Outstanding': 'txt_productsOutstanding'
};

function invokeClientMaintenanceProducts(action, requestData) {
    return window.ClientMaintenanceCore.invokeControllerMethod(CM_PRODUCTS_BASE, action, 'POST', requestData || {});
}

window.ClientMaintenanceProductsService = {
    get: (requestData) => invokeClientMaintenanceProducts('get', requestData),
    create: (requestData) => invokeClientMaintenanceProducts('create', requestData),
    update: (requestData) => invokeClientMaintenanceProducts('update', requestData),
    delete: (requestData) => invokeClientMaintenanceProducts('delete', requestData)
};

/**
 * Extract products list from API response
 */
function extractProductsList(response) {
    const candidates = [
        response?.Details?.Products,
        response?.data?.Details?.Products,
        response?.Details,
        response?.data?.Details,
        response?.data,
        response?.Products
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) return candidate;
    }

    return [];
}

/**
 * Extract services list from API response
 */
function extractServicesList(response) {
    const candidates = [
        response?.Details?.Services,
        response?.data?.Details?.Services,
        response?.Services
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) return candidate;
    }

    return [];
}

window.initClientMaintenanceProductsTab = function (tabRoot, moduleId) {
    if (!tabRoot) return;

    const productsTableBody = tabRoot.querySelector('#tbl_clientProductsBody');
    const servicesTableBody = tabRoot.querySelector('#tbl_clientServicesBody');

    /**
     * Render products table
     */
    const renderProductsTable = (products) => {
        if (!productsTableBody) return;
        
        productsTableBody.innerHTML = '';

        if (!Array.isArray(products) || products.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="3" class="text-center text-muted py-3">No products available</td>';
            productsTableBody.appendChild(tr);
            return;
        }

        products.forEach((product) => {
            const tr = document.createElement('tr');
            tr.dataset.productId = product.ProductID || '';
            
            const productName = product.ProductName || product.Name || '';
            const productType = product.ProductType || product.Type || '';
            const isSelected = product.IsSelected || product.Selected || false;
            const checkboxId = `chk_product_${product.ProductID || Math.random()}`;

            tr.innerHTML = `
                <td class="ps-2">${productName}</td>
                <td>${productType}</td>
                <td class="text-center">
                    <input type="checkbox" id="${checkboxId}" 
                           data-product-checkbox 
                           data-product-id="${product.ProductID || ''}"
                           ${isSelected ? 'checked' : ''} />
                </td>
            `;
            productsTableBody.appendChild(tr);
        });
    };

    /**
     * Render services table
     */
    const renderServicesTable = (services) => {
        if (!servicesTableBody) return;
        
        servicesTableBody.innerHTML = '';

        if (!Array.isArray(services) || services.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="3" class="text-center text-muted py-3">No services available</td>';
            servicesTableBody.appendChild(tr);
            return;
        }

        services.forEach((service) => {
            const tr = document.createElement('tr');
            tr.dataset.serviceId = service.ServiceID || '';
            
            const serviceName = service.ServiceName || service.Name || '';
            const serviceCategory = service.Category || service.ServiceCategory || '';
            const isActive = service.IsActive || service.Active || false;
            const checkboxId = `chk_service_${service.ServiceID || Math.random()}`;

            tr.innerHTML = `
                <td class="ps-2">${serviceName}</td>
                <td>${serviceCategory}</td>
                <td class="text-center">
                    <input type="checkbox" id="${checkboxId}" 
                           data-service-checkbox 
                           data-service-id="${service.ServiceID || ''}"
                           ${isActive ? 'checked' : ''} />
                </td>
            `;
            servicesTableBody.appendChild(tr);
        });
    };

    /**
     * Refresh products and services tables
     * Always makes GET call regardless of ClientID/RequestID presence
     */
    const refreshProductsTable = async (requestData) => {
        // Build request with available parameters (ClientID and RequestID are optional)
        const clientId = requestData?.ClientID || 
                        window.ClientMaintenanceCore?.getSelectedId?.() || 
                        window.ClientMaintenanceCore?.clientId || '';
        
        const requestId = requestData?.RequestID || 
                         window.ClientMaintenanceCore?.requestId || '';

        try {
            // Always make the GET call, even without ClientID or RequestID
            const response = await window.ClientMaintenanceProductsService.get({
                ModuleID: moduleId || window.ClientMaintenanceCore?.moduleId || '',
                ClientID: clientId,
                RequestID: requestId
            });

            const products = extractProductsList(response);
            const services = extractServicesList(response);

            renderProductsTable(products);
            renderServicesTable(services);
        } catch (error) {
            console.error('Products load failed:', error);
            window.ClientMaintenanceCore?.showToast?.(`Products load failed - ${error.message}`, 'error');
            // Render empty tables on error
            renderProductsTable([]);
            renderServicesTable([]);
        }
    };

    // Set up _cmLoadData so it's called when tab is activated or client changes
    tabRoot._cmLoadData = (requestData) => refreshProductsTable(requestData);

    // Initial load - always call on tab initialization
    refreshProductsTable({});

    // Bind CRUD operations if needed
    bindClientMaintenanceCrud(tabRoot, moduleId, window.ClientMaintenanceProductsService, 'products');
};
