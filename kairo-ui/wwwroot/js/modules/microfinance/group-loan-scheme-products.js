/**
 * Group Loan Scheme Products - Migrated JS Module
 * Uses invokeCenterLoanController (AppCore pattern) � no GroupService dependency.
 */
(function () {
    'use strict';

    // =========================================================================
    // State
    // =========================================================================
    let productsData       = [];
    let isEditMode         = false;
    let originalSelections = [];

    // Scheme context injected by controller via hidden input
    const parentSchemeId = document.getElementById('parentSchemeId')?.value?.trim() || '';

    // =========================================================================
    // AppCore Invoker
    // =========================================================================
    function getAppCore() {
        const w = window;
        return w.AppCore
            || (w.parent && w.parent !== w && w.parent.AppCore)
            || (w.top && w.top !== w && w.top.AppCore)
            || null;
    }

    function invokeController(action, requestData) {
        return new Promise((resolve, reject) => {
            const appCore = getAppCore();
            if (!appCore || typeof appCore.invokeController !== 'function') {
                reject(new Error('AppCore.invokeController not found'));
                return;
            }
            appCore.invokeController(`MicroFinance/${action}`, requestData || {}, (error, response) => {
                resolve(error && !response ? { ErrorMessage: error.message } : response);
            });
        });
    }

    // =========================================================================
    // OldAPI status helper
    // =========================================================================
    function getOldApiStatus(payload) {
        const candidates = [payload,
            Array.isArray(payload?.Details)   && payload.Details.length   ? payload.Details[0]   : null,
            Array.isArray(payload?.Details01)  && payload.Details01.length ? payload.Details01[0] : null,
            Array.isArray(payload?.Details02)  && payload.Details02.length ? payload.Details02[0] : null
        ].filter(Boolean);

        for (const c of candidates) {
            const code = c?.ResponseCode ?? c?.responseCode ?? c?.Status ?? c?.status ?? c?.code;
            if (code === undefined || code === null) continue;
            const norm = String(code).trim();
            const ok   = norm === '' || norm === '00' || norm === '0'
                      || norm.toLowerCase() === 'ok' || norm.toLowerCase() === 'success';
            return { ok, code: norm, message: c?.ResponseMessage ?? c?.responseMessage ?? c?.Message ?? c?.message ?? '' };
        }
        return { ok: true, code: '', message: '' };
    }

    // =========================================================================
    // Context Helper (Client360 pattern: AuthService → sessionStorage → Environment fallback)
    // =========================================================================
    function getContext() {
        const session = window.AuthService?.getSession?.() || {};
        return {
            OperatorID:
                session.operatorID ||
                session.operatorId ||
                session.OperatorID ||
                window.sessionStorage?.getItem?.('operatorID') ||
                window.Environment?.OperatorID ||
                'web_portal',
            OurBranchID:
                session.branchID ||
                session.branchId ||
                session.OurBranchID ||
                window.sessionStorage?.getItem?.('branchID') ||
                window.Environment?.OurBranchID ||
                '',
            BankID:
                session.bankID ||
                session.bankId ||
                session.BankID ||
                session.BankId ||
                window.sessionStorage?.getItem?.('BankID') ||
                window.localStorage?.getItem?.('BankID') ||
                window.Environment?.BankID ||
                window.Environment?.bankID ||
                '00'
        };
    }

    // =========================================================================
    // Toast
    // =========================================================================
    function showToast(message, variant = 'info') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.className = 'kairo-toast-container';
            container.id = 'toastContainer';
            document.body.appendChild(container);
        }
        container.querySelectorAll('.kairo-toast').forEach(t => t.remove());
        const toast = document.createElement('div');
        toast.className = `kairo-toast kairo-toast--${variant}`;
        toast.setAttribute('role', 'alert');
        const body = document.createElement('div');
        body.className = 'kairo-toast__body';
        body.textContent = String(message || '');
        toast.appendChild(body);
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('is-show'), 0);
        setTimeout(() => {
            toast.classList.remove('is-show');
            setTimeout(() => { try { toast.remove(); } catch { } }, 300);
        }, 5000);
    }
    const showSuccess = m => showToast(m, 'success');
    const showError   = m => showToast(m, 'danger');
    const showWarning = m => showToast(m, 'warning');
    const showInfo    = m => showToast(m, 'info');

    // =========================================================================
    // Load Products
    // =========================================================================
    async function loadProducts() {
        if (!parentSchemeId) {
            showWarning('No scheme ID available. Please load a scheme first.');
            renderEmpty('No scheme selected.');
            return;
        }

        const { BankID, OperatorID } = getContext();
        const requestData = { BankID: BankID, LoanSchemeID: parentSchemeId, OperatorID: OperatorID };

        try {
            showInfo('Loading products...');
            const resp    = await invokeController('get-group-loan-scheme-products', requestData);
            const payload = resp?.raw ?? resp?.data ?? resp;
            const status  = getOldApiStatus(payload);

            if (!status.ok) {
                productsData = [];
                renderEmpty(status.message || 'No products found for this scheme.');
                showWarning(status.message || 'No products found.');
                return;
            }

            // Products are in Details02
            const rows = payload?.Details02 ?? payload?.details02 ?? payload?.Details ?? payload?.details ?? [];
            productsData = Array.isArray(rows) ? rows : [];

            renderProductsTable(productsData);

            // Populate audit from first selected product
            const selected = productsData.find(p => toBool(p.IsSelected));
            if (selected) populateAudit(selected);

            showSuccess(`Loaded ${productsData.length} product(s)`);
        } catch (err) {
            console.error('[GroupLoanSchemeProducts] loadProducts error:', err);
            productsData = [];
            renderEmpty('Failed to load products.');
            showError('Failed to load products: ' + (err.message || 'Unknown error'));
        }
    }

    // =========================================================================
    // Render Table
    // =========================================================================
    function renderProductsTable(products) {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        if (!products || products.length === 0) {
            renderEmpty('No products available for this scheme.');
            return;
        }

        tbody.innerHTML = '';
        products.forEach((product, index) => {
            const isSelected = toBool(product.IsSelected);
            const isDefault  = toBool(product.IsDefault);
            const allowEdit  = toBool(product.AllowEdit);

            const row = document.createElement('tr');
            row.dataset.index     = index;
            row.dataset.productId = product.ProductID || '';
            row.dataset.allowEdit = allowEdit ? 'true' : 'false';
            row.classList.add('product-row');
            if (isSelected) row.classList.add('product-row--selected');
            if (isDefault)  row.classList.add('product-row--default');
            if (allowEdit)  row.classList.add('product-row--editable');
            else            row.classList.add('product-row--locked');

            row.innerHTML = `
                <td class="text-center">
                    <input class="form-check-input" type="checkbox"
                           aria-label="Select row"
                           ${isSelected ? 'checked' : ''}
                           disabled
                           data-allow-edit="${allowEdit}" />
                </td>
                <td>${escapeHtml(product.ProductTypeID || '')}</td>
                <td>${escapeHtml(product.ProductID || '')}</td>
                <td>${escapeHtml(product.ProductDescription || '')}</td>
                <td>${isDefault ? 'Yes' : 'No'}</td>
            `;
            tbody.appendChild(row);
        });

        storeOriginalSelections();
    }

    function renderEmpty(message) {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-2 d-block mb-2"></i>
                    ${escapeHtml(message)}
                </td>
            </tr>`;
    }

    // =========================================================================
    // Edit / Save / Cancel
    // =========================================================================
    function handleEdit() {
        if (productsData.length === 0) {
            showWarning('No products to edit.');
            return;
        }
        isEditMode = true;
        storeOriginalSelections();

        document.querySelector('[data-section="products"] table')?.classList.add('products-edit-mode');

        document.querySelectorAll('#productsTableBody input[type="checkbox"]').forEach(cb => {
            if (cb.dataset.allowEdit === 'true') {
                cb.disabled = false;
                cb.addEventListener('change', onCheckboxChange);
            }
        });

        setBtn('btnSave', false);
        setBtn('btnEdit', true);
        showInfo('Edit mode � check/uncheck products then Save.');
    }

    async function handleSave() {
        if (!isEditMode) { showWarning('Please enter Edit mode first.'); return; }
        if (!parentSchemeId) { showError('No scheme ID available.'); return; }

        const { BankID, OperatorID } = getContext();
        const allProducts = [];

        document.querySelectorAll('#productsTableBody tr').forEach((row, index) => {
            const cb = row.querySelector('input[type="checkbox"]');
            if (!cb) return;
            const orig = productsData[index];
            if (!orig) return;
            allProducts.push({
                IsSelected:          toBool(orig.IsSelected) ? 'true' : 'false',
                LoanSchemeID:        parentSchemeId,
                ProductID:           orig.ProductID || '',
                ProductDescription:  orig.ProductDescription || '',
                ProductTypeID:       orig.ProductTypeID || '',
                IsDefault:           toBool(orig.IsDefault) ? 'true' : 'false',
                AllowEdit:           toBool(orig.AllowEdit) ? 'true' : 'false',
                UpdateCount:         orig.UpdateCount || '',
                Selected:            cb.checked ? 'true' : 'false'
            });
        });

        if (allProducts.length === 0) { showWarning('No products available to save.'); return; }
        if (!allProducts.some(p => p.Selected === 'true')) {
            showWarning('Please select at least one product.');
            return;
        }

        const now = new Date().toISOString().slice(0, 19);
        const requestData = {
            BankID:        BankID,
            LoanSchemeID:  parentSchemeId,
            CreatedBy:     OperatorID,
            CreatedOn:     now,
            SupervisedBy:  OperatorID,
            DetailRecord:  buildXml(allProducts)
        };

        try {
            showInfo('Saving products...');
            const resp    = await invokeController('save-group-loan-scheme-products', requestData);
            const payload = resp?.raw ?? resp?.data ?? resp;
            const status  = getOldApiStatus(payload);

            if (status.ok) {
                showSuccess('Products saved successfully');
                exitEditMode();
                await loadProducts();
            } else {
                showError(status.message || 'Failed to save products');
            }
        } catch (err) {
            console.error('[GroupLoanSchemeProducts] handleSave error:', err);
            showError('Failed to save products: ' + (err.message || 'Unknown error'));
        }
    }

    function handleCancel() {
        if (isEditMode) {
            restoreOriginalSelections();
            updateRowStyling();
            exitEditMode();
            showInfo('Changes cancelled.');
        } else {
            closeChildForm();
        }
    }

    function exitEditMode() {
        isEditMode = false;
        document.querySelector('[data-section="products"] table')?.classList.remove('products-edit-mode');
        document.querySelectorAll('#productsTableBody input[type="checkbox"]').forEach(cb => {
            cb.disabled = true;
            cb.removeEventListener('change', onCheckboxChange);
        });
        setBtn('btnSave', true);
        setBtn('btnEdit', false);
    }

    function onCheckboxChange(e) {
        const row = e.target.closest('tr');
        if (!row) return;
        e.target.checked
            ? row.classList.add('product-row--selected')
            : row.classList.remove('product-row--selected');
    }

    // =========================================================================
    // Selection helpers
    // =========================================================================
    function storeOriginalSelections() {
        originalSelections = [];
        document.querySelectorAll('#productsTableBody input[type="checkbox"]')
            .forEach((cb, i) => { originalSelections[i] = cb.checked; });
    }

    function restoreOriginalSelections() {
        document.querySelectorAll('#productsTableBody input[type="checkbox"]')
            .forEach((cb, i) => {
                if (originalSelections[i] !== undefined) cb.checked = originalSelections[i];
            });
    }

    function updateRowStyling() {
        document.querySelectorAll('#productsTableBody tr').forEach(row => {
            const cb = row.querySelector('input[type="checkbox"]');
            if (!cb) return;
            cb.checked
                ? row.classList.add('product-row--selected')
                : row.classList.remove('product-row--selected');
        });
    }

    // =========================================================================
    // Audit fields
    // =========================================================================
    function populateAudit(data) {
        const fmt = v => {
            if (!v) return '';
            try {
                const d = new Date(v);
                if (isNaN(d.getTime())) return String(v);
                return d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            } catch { return String(v); }
        };
        setAuditVal('ClpCreatedBy',    data.CreatedBy    || '');
        setAuditVal('ClpCreatedOn',    fmt(data.CreatedOn));
        setAuditVal('ClpSupervisedBy', data.SupervisedBy || '');
        setAuditVal('ClpSupervisedOn', fmt(data.SupervisedOn));
    }

    function setAuditVal(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value || '-';
    }

    // =========================================================================
    // XML builder for DetailRecord
    // =========================================================================
    function buildXml(products) {
        return products.map(p => [
            '<dt_GroupLoanSchemeProducts>',
            `<IsSelected>${p.IsSelected}</IsSelected>`,
            `<LoanSchemeID>${xmlEsc(p.LoanSchemeID)}</LoanSchemeID>`,
            `<ProductID>${xmlEsc(p.ProductID)}</ProductID>`,
            `<ProductDescription>${xmlEsc(p.ProductDescription)}</ProductDescription>`,
            `<ProductTypeID>${xmlEsc(p.ProductTypeID)}</ProductTypeID>`,
            `<IsDefault>${p.IsDefault}</IsDefault>`,
            `<AllowEdit>${p.AllowEdit}</AllowEdit>`,
            `<UpdateCount>${p.UpdateCount}</UpdateCount>`,
            `<Selected>${p.Selected}</Selected>`,
            '</dt_GroupLoanSchemeProducts>'
        ].join('')).join('');
    }

    function xmlEsc(v) {
        return String(v || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    // =========================================================================
    // Utilities
    // =========================================================================
    function toBool(v) {
        if (typeof v === 'boolean') return v;
        if (typeof v === 'number')  return v !== 0;
        if (typeof v === 'string')  return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
        return false;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text || '');
        return div.innerHTML;
    }

    function setVal(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value ?? '';
    }

    function setBtn(id, disabled) {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = disabled;
    }

    function closeChildForm() {
        try {
            const parent = window.parent;

            // Primary: parent has closeChildForm (MVC standard)
            if (typeof parent.closeChildForm === 'function') {
                parent.closeChildForm();
                return;
            }

            // Fallback: set iframe src to about:blank
            if (parent !== window && parent.document) {
                const iframe = parent.document.querySelector('iframe[data-child-iframe]');
                if (iframe) { iframe.src = 'about:blank'; return; }
            }

            window.close();
        } catch { window.close(); }
    }

    // =========================================================================
    // Section Toggles
    // =========================================================================
    function initSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', function () {
                const section  = this.closest('.form-section');
                const btn      = this.querySelector('.section-toggle-btn');
                const icon     = btn?.querySelector('i');
                const expanded = btn?.getAttribute('aria-expanded') === 'true';
                btn?.setAttribute('aria-expanded', String(!expanded));
                section?.classList.toggle('collapsed');
                if (icon) icon.className = expanded ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
            });
        });
    }

    // =========================================================================
    // Event Wiring
    // =========================================================================
    function initEventListeners() {
        // Action panel buttons
        document.querySelectorAll('[data-clp-action]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                switch (btn.dataset.clpAction) {
                    case 'edit':   handleEdit();   break;
                    case 'save':   handleSave();   break;
                    case 'cancel': handleCancel(); break;
                }
            });
        });

        // Window control buttons (refresh / close)
        document.querySelectorAll('[data-window-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const a = btn.dataset.windowAction;
                if (a === 'close')   closeChildForm();
                if (a === 'refresh') { exitEditMode(); loadProducts(); }
            });
        });
    }

    // =========================================================================
    // Init
    // =========================================================================
    function initialize() {
        console.log('[GroupLoanSchemeProducts] Initializing � SchemeID:', parentSchemeId);
        initSectionToggles();
        initEventListeners();
        loadProducts();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    window.GroupLoanSchemeProducts = { loadProducts, handleEdit, handleSave, handleCancel };
})();
