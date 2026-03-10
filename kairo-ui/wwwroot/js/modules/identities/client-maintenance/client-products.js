const CM_PRODUCTS_BASE = 'Identities/ClientMaintenance/Products';

function invokeClientMaintenanceProducts(action, requestData) {
    return window.ClientMaintenanceCore.invokeControllerMethod(CM_PRODUCTS_BASE, action, 'POST', requestData || {});
}

window.ClientMaintenanceProductsService = {
    get: (requestData) => invokeClientMaintenanceProducts('get', requestData),
    create: (requestData) => invokeClientMaintenanceProducts('create', requestData),
    update: (requestData) => invokeClientMaintenanceProducts('update', requestData),
    delete: (requestData) => invokeClientMaintenanceProducts('delete', requestData)
};

function parseJsonSafely(value) {
    if (typeof value !== 'string') {
        return value;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return value;
    }

    try {
        return JSON.parse(trimmed);
    } catch {
        return value;
    }
}

function coerceBool(value) {
    if (value === true || value === false) return value;
    if (value === 1 || value === '1') return true;
    if (value === 0 || value === '0') return false;

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === 'yes' || normalized === 'y') return true;
        if (normalized === 'false' || normalized === 'no' || normalized === 'n') return false;
    }

    return Boolean(value);
}

function coerceFlag(value) {
    if (value === true || value === false) return value;

    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
        return numeric === 1;
    }

    return coerceBool(value);
}

function parseNestedPayload(value) {
    let current = value;

    for (let depth = 0; depth < 4; depth += 1) {
        if (typeof current === 'string') {
            const parsed = parseJsonSafely(current);
            if (parsed === current) {
                break;
            }
            current = parsed;
            continue;
        }

        if (current && typeof current === 'object' && !Array.isArray(current)) {
            if (Object.prototype.hasOwnProperty.call(current, 'Details')) {
                current = current.Details;
                continue;
            }

            if (Object.prototype.hasOwnProperty.call(current, 'details')) {
                current = current.details;
                continue;
            }
        }

        break;
    }

    if (typeof current === 'string') {
        return parseJsonSafely(current);
    }

    return current;
}

function hasProductsServicesShape(value) {
    return !!(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        (
            Object.prototype.hasOwnProperty.call(value, 'Products') ||
            Object.prototype.hasOwnProperty.call(value, 'Services') ||
            Object.prototype.hasOwnProperty.call(value, 'products') ||
            Object.prototype.hasOwnProperty.call(value, 'services')
        )
    );
}

function unwrapProductsServicesPayload(response) {
    const candidates = [
        response?.data?.[0]?.Details,
        response?.data?.[0]?.details,
        response?.Details?.[0]?.Details,
        response?.Details?.[0]?.details,
        response?.details?.[0]?.Details,
        response?.details?.[0]?.details,
        response?.[0]?.Details,
        response?.[0]?.details,
        response?.Details,
        response?.details,
        response?.data?.Details,
        response?.data?.details,
        response?.data,
        response
    ];

    for (const candidate of candidates) {
        const parsed = parseNestedPayload(candidate);

        if (hasProductsServicesShape(parsed)) {
            return parsed;
        }

        if (Array.isArray(parsed) && parsed.length > 0 && hasProductsServicesShape(parsed[0])) {
            return parsed[0];
        }
    }

    return {};
}

function toArray(value) {
    const parsed = parseNestedPayload(value);
    return Array.isArray(parsed) ? parsed : [];
}

function normalizeProducts(details) {
    let rawProducts = toArray(details?.Products ?? details?.products);

    if (!rawProducts.length && Array.isArray(details)) {
        const looksLikeProductRows = details.some((item) => item && (item.ProductID || item.ProductTypeID || item.IsSelected !== undefined));
        if (looksLikeProductRows) {
            rawProducts = details;
        }
    }

    return rawProducts.map((item, index) => ({
        id: String(item?.ProductID ?? item?.id ?? item?.ProductCode ?? index + 1),
        productTypeId: String(item?.ProductTypeID ?? item?.productTypeId ?? item?.ProductType ?? item?.type ?? ''),
        description: String(item?.Description ?? item?.description ?? item?.ProductName ?? item?.Name ?? ''),
        isSelected: coerceFlag(item?.IsSelected ?? item?.isSelected ?? item?.Selected),
        serialNo: Number(item?.SerialNo) || index + 1
    }));
}

function normalizeServices(details) {
    let rawServices = toArray(details?.Services ?? details?.services);

    if (!rawServices.length && Array.isArray(details)) {
        const looksLikeServiceRows = details.some((item) => item && (item.SubCodeID || item.ServiceID || item.StatusID !== undefined));
        if (looksLikeServiceRows) {
            rawServices = details;
        }
    }

    return rawServices.map((item, index) => ({
        id: String(item?.SubCodeID ?? item?.ServiceID ?? item?.id ?? index + 1),
        code: String(item?.SubCodeID ?? item?.ServiceID ?? item?.code ?? item?.ServiceCode ?? ''),
        description: String(item?.Description ?? item?.description ?? item?.Category ?? item?.ServiceCategory ?? ''),
        status: coerceFlag(item?.StatusID ?? item?.status ?? item?.IsActive ?? item?.Active),
        serialNo: Number(item?.SerialNo) || index + 1
    }));
}

function extractResponseCode(response) {
    const value =
        response?.ResponseCode ??
        response?.responseCode ??
        response?.code ??
        response?.data?.[0]?.ResponseCode ??
        response?.Details?.[0]?.ResponseCode ??
        null;

    if (value === null || value === undefined || value === '') {
        return null;
    }

    return String(value);
}

function extractResponseMessage(response) {
    return (
        response?.ResponseMessage ||
        response?.responseMessage ||
        response?.message ||
        response?.ErrorMessage ||
        response?.errorMessage ||
        response?.data?.[0]?.ResponseMessage ||
        response?.Details?.[0]?.ResponseMessage ||
        ''
    );
}

function escapeHtml(value) {
    const text = String(value ?? '');
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getPagedData(pager, items) {
    const list = Array.isArray(items) ? items : [];
    const pageSize = Math.max(1, Number(pager.pageSize) || 10);
    const totalItems = list.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const page = Math.min(Math.max(1, Number(pager.page) || 1), totalPages);
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);

    pager.page = page;
    pager.pageSize = pageSize;

    return {
        page,
        pageSize,
        totalItems,
        totalPages,
        startIndex,
        endIndex,
        items: list.slice(startIndex, endIndex)
    };
}

function ensurePagerBindings(tabRoot, type, paginationState, rerender) {
    const pagerEl = tabRoot.querySelector(`[data-pager='${type}']`);
    if (!pagerEl) {
        return null;
    }

    if (pagerEl.dataset.cmBound !== '1') {
        pagerEl.dataset.cmBound = '1';

        pagerEl.addEventListener('click', (event) => {
            const prevButton = event.target.closest('[data-pager-prev]');
            const nextButton = event.target.closest('[data-pager-next]');
            if (!prevButton && !nextButton) {
                return;
            }

            event.preventDefault();
            const pager = paginationState[type];
            if (!pager) {
                return;
            }

            if (prevButton) {
                pager.page = Math.max(1, (pager.page || 1) - 1);
            }

            if (nextButton) {
                pager.page = (pager.page || 1) + 1;
            }

            rerender();
        });

        pagerEl.addEventListener('change', (event) => {
            const sizeSelect = event.target.closest('[data-pager-size]');
            if (!sizeSelect) {
                return;
            }

            const pager = paginationState[type];
            if (!pager) {
                return;
            }

            pager.pageSize = Number(sizeSelect.value) || 10;
            pager.page = 1;
            rerender();
        });
    }

    return pagerEl;
}

function syncPager(pagerEl, pageData) {
    if (!pagerEl) {
        return;
    }

    const info = pagerEl.querySelector('[data-pager-info]');
    const prevButton = pagerEl.querySelector('[data-pager-prev]');
    const nextButton = pagerEl.querySelector('[data-pager-next]');
    const sizeSelect = pagerEl.querySelector('[data-pager-size]');

    if (sizeSelect && String(sizeSelect.value) !== String(pageData.pageSize)) {
        sizeSelect.value = String(pageData.pageSize);
    }

    if (info) {
        if (pageData.totalItems === 0) {
            info.textContent = 'No items';
        } else {
            const start = pageData.startIndex + 1;
            const end = pageData.endIndex;
            info.textContent = `Showing ${start}-${end} of ${pageData.totalItems} (Page ${pageData.page} of ${pageData.totalPages})`;
        }
    }

    if (prevButton) {
        prevButton.disabled = pageData.page <= 1;
    }

    if (nextButton) {
        nextButton.disabled = pageData.page >= pageData.totalPages;
    }
}

window.initClientMaintenanceProductsTab = function (tabRoot, moduleId) {
    if (!tabRoot) return;

    const productsTableBody = tabRoot.querySelector('[data-products-body]') || tabRoot.querySelector('#tbl_clientProductsBody');
    const servicesTableBody = tabRoot.querySelector('[data-services-body]') || tabRoot.querySelector('#tbl_clientServicesBody');

    const state = {
        products: [],
        services: [],
        pagination: {
            products: { page: 1, pageSize: 10 },
            services: { page: 1, pageSize: 10 }
        }
    };

    let productsPagerEl = null;
    let servicesPagerEl = null;

    const renderProductsTable = () => {
        if (!productsTableBody) return;

        const pageData = getPagedData(state.pagination.products, state.products);
        syncPager(productsPagerEl, pageData);
        productsTableBody.innerHTML = '';

        if (!pageData.items.length) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="3" class="text-center text-muted py-3">No products available</td>';
            productsTableBody.appendChild(tr);
            return;
        }

        pageData.items.forEach((product) => {
            const key = `${product.productTypeId}::${product.id}`;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="ps-2">${escapeHtml(product.description)}</td>
                <td>${escapeHtml(product.productTypeId)}</td>
                <td class="text-center">
                    <input type="checkbox"
                           data-product-checkbox
                           data-product-key="${escapeHtml(key)}"
                           ${product.isSelected ? 'checked' : ''} />
                </td>
            `;
            productsTableBody.appendChild(tr);
        });
    };

    const renderServicesTable = () => {
        if (!servicesTableBody) return;

        const pageData = getPagedData(state.pagination.services, state.services);
        syncPager(servicesPagerEl, pageData);
        servicesTableBody.innerHTML = '';

        if (!pageData.items.length) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="3" class="text-center text-muted py-3">No services available</td>';
            servicesTableBody.appendChild(tr);
            return;
        }

        pageData.items.forEach((service) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="ps-2">${escapeHtml(service.code)}</td>
                <td>${escapeHtml(service.description)}</td>
                <td class="text-center">
                    <input type="checkbox"
                           data-service-checkbox
                           data-service-id="${escapeHtml(service.id)}"
                           ${service.status ? 'checked' : ''} />
                </td>
            `;
            servicesTableBody.appendChild(tr);
        });
    };

    productsPagerEl = ensurePagerBindings(tabRoot, 'products', state.pagination, renderProductsTable);
    servicesPagerEl = ensurePagerBindings(tabRoot, 'services', state.pagination, renderServicesTable);

    productsTableBody?.addEventListener('change', (event) => {
        const checkbox = event.target.closest('[data-product-checkbox]');
        if (!checkbox) return;

        const key = checkbox.dataset.productKey || '';
        const product = state.products.find((item) => `${item.productTypeId}::${item.id}` === key);
        if (product) {
            product.isSelected = checkbox.checked;
        }
    });

    servicesTableBody?.addEventListener('change', (event) => {
        const checkbox = event.target.closest('[data-service-checkbox]');
        if (!checkbox) return;

        const serviceId = checkbox.dataset.serviceId || '';
        const service = state.services.find((item) => item.id === serviceId);
        if (service) {
            service.status = checkbox.checked;
        }
    });

    const refreshProductsTable = async (requestData) => {
        const clientId = requestData?.ClientID || window.ClientMaintenanceCore?.clientId || '';
        const requestId = requestData?.RequestID || window.ClientMaintenanceCore?.requestId || '';

        try {
            const response = await window.ClientMaintenanceProductsService.get({
                ModuleID: moduleId || window.ClientMaintenanceCore?.moduleId || '',
                ClientID: clientId,
                RequestID: requestId
            });

            const responseCode = extractResponseCode(response);
            if (responseCode && responseCode !== '00') {
                const responseMessage = extractResponseMessage(response) || `Request failed (${responseCode})`;
                throw new Error(responseMessage);
            }

            const details = unwrapProductsServicesPayload(response);
            state.products = normalizeProducts(details);
            state.services = normalizeServices(details);
            state.pagination.products.page = 1;
            state.pagination.services.page = 1;

            renderProductsTable();
            renderServicesTable();
        } catch (error) {
            console.error('Products/Services load failed:', error);
            window.ClientMaintenanceCore?.showToast?.(`Products load failed - ${error.message}`, 'error');
            state.products = [];
            state.services = [];
            state.pagination.products.page = 1;
            state.pagination.services.page = 1;
            renderProductsTable();
            renderServicesTable();
        }
    };

    tabRoot._cmLoadData = (requestData) => refreshProductsTable(requestData);
    window.ClientMaintenanceCore.registerTabLoadFunction('Products', (requestData) => refreshProductsTable(requestData));

    refreshProductsTable({});

    bindClientMaintenanceCrud(tabRoot, moduleId, window.ClientMaintenanceProductsService, 'products');
};
