// Tax Maintenance (standardized UI)

// ========================================
// STATE MANAGEMENT
// ========================================
let currentMode = 'view'; // view, add, edit
let selectedTaxId = null;
let taxData = [];

// ========================================
// SMALL HELPERS
// ========================================
function isMainTaxMaintenancePage() {
    return document.body && document.body.dataset && document.body.dataset.page === 'tax-maintenance';
}

function getMessageBar() {
    return document.querySelector('.am-message-panel');
}

function showMessage(text, type, timeoutMs) {
    const t = type || 'info';
    const ms = typeof timeoutMs === 'number' ? timeoutMs : 3000;
    const bar = getMessageBar();
    if (!bar) return;

    bar.className = `am-message-panel show ${t}`;
    const span = bar.querySelector('span');
    if (span) span.textContent = text;

    window.clearTimeout(showMessage._t);
    showMessage._t = window.setTimeout(() => {
        bar.classList.remove('show');
    }, ms);
}

function safeGet(id) {
    return document.getElementById(id);
}

function closeThisWindowOrModal() {
    const modalId = document.body?.dataset?.closeModal;
    if (modalId && window.parent && window.parent !== window) {
        try {
            const parentDoc = window.parent.document;
            const el = parentDoc.getElementById(modalId);
            const inst = window.parent.bootstrap?.Modal?.getInstance(el) || (el ? new window.parent.bootstrap.Modal(el) : null);
            if (inst) {
                inst.hide();
                return;
            }

            // If embedded as a module page (iframe), "close" should return to dashboard.
            if (!modalId && window.self !== window.top && isMainTaxMaintenancePage()) {
                window.location.href = '../../dashboard.html';
                return;
            }
        } catch (e) {
            // fall through
        }
    }

    // Fallbacks
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.close();
    }
}

// ========================================
// STANDARD SHELL WIRING
// ========================================
function initSectionToggles() {
    const toggles = document.querySelectorAll('[data-section-toggle]');
    toggles.forEach((header) => {
        const section = header.closest('.form-section');
        const content = section ? section.querySelector('[data-section-content]') : null;
        const btn = section ? section.querySelector('.section-toggle-btn') : null;
        const icon = btn ? btn.querySelector('i') : null;
        if (!content || !btn) return;

        const setExpanded = (expanded) => {
            btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            content.hidden = !expanded;
            if (icon) {
                icon.classList.toggle('bi-chevron-up', expanded);
                icon.classList.toggle('bi-chevron-down', !expanded);
            }
        };

        // default open
        if (!btn.hasAttribute('aria-expanded')) setExpanded(true);

        const toggle = () => {
            const expanded = btn.getAttribute('aria-expanded') !== 'false';
            setExpanded(!expanded);
        };

        header.addEventListener('click', toggle);
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle();
        });
    });
}

function initHeaderControls() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');

        if (action === 'refresh') {
            if (isMainTaxMaintenancePage()) {
                loadTaxData();
                showMessage('Refreshed', 'info');
            } else {
                window.location.reload();
            }
            return;
        }

        if (action === 'maximize') {
            const win = document.querySelector('.window');
            if (win) win.classList.toggle('maximized');
            return;
        }

        if (action === 'minimize') {
            // No-op for now (kept for parity)
            return;
        }

        if (action === 'close') {
            closeThisWindowOrModal();
            return;
        }
    });
}

function initSidebar() {
    const sidebar = safeGet('main-sidebar');
    const toggleBtn = safeGet('sidebarToggle');
    const main = document.querySelector('.main-container');

    if (toggleBtn && sidebar && main) {
        toggleBtn.addEventListener('click', () => {
            const collapsed = sidebar.classList.toggle('collapsed');
            main.classList.toggle('sidebar-collapsed', collapsed);
            toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        });
    }

    // nav sections
    document.querySelectorAll('[data-nav-section]').forEach((section) => {
        const arrow = section.querySelector('.nav-arrow');
        const items = section.querySelector('.nav-items');
        if (!arrow || !items) return;

        arrow.addEventListener('click', (e) => {
            e.preventDefault();
            const open = section.classList.toggle('is-open');
            arrow.setAttribute('aria-expanded', open ? 'true' : 'false');
            items.hidden = !open;
            const icon = arrow.querySelector('i');
            if (icon) {
                icon.classList.toggle('bi-chevron-down', open);
                icon.classList.toggle('bi-chevron-right', !open);
            }
        });

        // default open
        if (!section.classList.contains('is-open')) {
            items.hidden = true;
            arrow.setAttribute('aria-expanded', 'false');
        } else {
            items.hidden = false;
            arrow.setAttribute('aria-expanded', 'true');
        }
    });

    // open submodules
    const openers = document.querySelectorAll('[data-open-modal]');
    openers.forEach((el) => {
        const open = () => {
            const modalId = el.getAttribute('data-open-modal');
            openModal(modalId);
        };
        el.addEventListener('click', open);
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                open();
            }
        });
    });

    // sidebar search
    const search = safeGet('submoduleSearch');
    const clear = safeGet('submoduleSearchClear');

    const applyFilter = () => {
        if (!search) return;
        const q = (search.value || '').trim().toLowerCase();
        document.querySelectorAll('.sidebar-item').forEach((item) => {
            const txt = (item.textContent || '').trim().toLowerCase();
            item.style.display = !q || txt.includes(q) ? '' : 'none';
        });
        if (clear) clear.style.visibility = q ? 'visible' : '';
    };

    if (search) {
        search.addEventListener('input', applyFilter);
    }
    if (clear && search) {
        clear.addEventListener('click', () => {
            search.value = '';
            applyFilter();
            search.focus();
        });
    }
}

// ========================================
// BOOTSTRAP MODALS (MAIN PAGE)
// ========================================
function openModal(modalId) {
    if (!modalId) return;
    const el = document.getElementById(modalId);
    if (!el || !window.bootstrap?.Modal) return;
    const inst = window.bootstrap.Modal.getInstance(el) || new window.bootstrap.Modal(el);
    inst.show();
}

// Expose for iframe pages that still call parent
window.openModal = openModal;
window.closeModal = function closeModal(modalId) {
    if (!modalId) return;
    const el = document.getElementById(modalId);
    if (!el || !window.bootstrap?.Modal) return;
    const inst = window.bootstrap.Modal.getInstance(el) || new window.bootstrap.Modal(el);
    inst.hide();
};

// ========================================
// CRUD OPERATIONS (MAIN PAGE)
// ========================================
function handleView() {
    if (!selectedTaxId) {
        showMessage('Please select a tax record to view', 'info');
        return;
    }

    currentMode = 'view';
    disableFormFields();
    loadTaxDetails(selectedTaxId);
    setEditing(false);
    showMessage('Viewing tax details', 'info');
}

function handleAdd() {
    currentMode = 'add';
    clearForm();
    enableFormFields();
    const taxId = safeGet('taxId');
    if (taxId) taxId.disabled = true;
    setEditing(true);
    showMessage('Enter new tax details', 'info');
}

function handleEdit() {
    if (!selectedTaxId) {
        showMessage('Please select a tax record to edit', 'info');
        return;
    }

    currentMode = 'edit';
    enableFormFields();
    const taxId = safeGet('taxId');
    if (taxId) taxId.disabled = true;
    setEditing(true);
    showMessage('Edit mode enabled', 'info');
}

function handleSave() {
    if (!validateForm()) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }

    const formData = {
        taxId: safeGet('taxId')?.value || '',
        description: safeGet('description')?.value || '',
        taxType: safeGet('taxType')?.value || '',
        calculationMethod: safeGet('calculationMethod')?.value || '',
        cessId: safeGet('cessId')?.value || '',
        roundingCode: safeGet('roundingCode')?.value || '',
        payableGlId: safeGet('payableGlId')?.value || '',
        paidGlId: safeGet('paidGlId')?.value || '',
        payableFrequency: safeGet('payableFrequency')?.value || '',
        remarks: safeGet('remarks')?.value || ''
    };

    if (currentMode === 'add') {
        console.log('Adding new tax:', formData);
        showMessage('Tax record added successfully', 'success');
        taxData.push(formData);
    } else if (currentMode === 'edit') {
        console.log('Updating tax:', formData);
        showMessage('Tax record updated successfully', 'success');
    }

    disableEdit();
    loadTaxData();
    updateAuditTrail();
}

function handleDelete() {
    if (!selectedTaxId) {
        showMessage('Please select a tax record to delete', 'info');
        return;
    }

    if (confirm('Are you sure you want to delete this tax record?')) {
        console.log('Deleting tax ID:', selectedTaxId);
        showMessage('Tax record deleted successfully', 'success');
        taxData = taxData.filter((tax) => tax.taxId !== selectedTaxId);
        clearForm();
        loadTaxData();
        selectedTaxId = null;
    }
}

function handleCancel() {
    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
        disableEdit();
        if (selectedTaxId) {
            loadTaxDetails(selectedTaxId);
        } else {
            clearForm();
        }
        showMessage('Changes cancelled', 'info');
    }
}

function handleBack() {
    if (currentMode !== 'view') {
        if (!confirm('You have unsaved changes. Are you sure you want to go back?')) return;
    }
    window.location.href = '../../dashboard.html';
}

function setEditing(on) {
    const btnView = document.querySelector('.action-panel [data-action="view"]');
    const btnAdd = document.querySelector('.action-panel [data-action="add"]');
    const btnEdit = document.querySelector('.action-panel [data-action="edit"]');
    const btnDelete = document.querySelector('.action-panel [data-action="delete"]');
    const btnSave = document.querySelector('.action-panel [data-action="save"]');
    const btnCancel = document.querySelector('.action-panel [data-action="cancel"]');

    if (btnView) btnView.disabled = false;
    if (btnAdd) btnAdd.disabled = false;
    if (btnEdit) btnEdit.disabled = on;
    if (btnDelete) btnDelete.disabled = on;
    if (btnSave) btnSave.disabled = !on;
    if (btnCancel) btnCancel.disabled = !on;
}

// ========================================
// FORM MANAGEMENT (MAIN PAGE)
// ========================================
function enableFormFields() {
    const form = safeGet('taxForm');
    if (!form) return;
    form.querySelectorAll('input, select, textarea, button.btn-lookup').forEach((el) => {
        if (el.id === 'taxId') return;
        el.disabled = false;
    });
}

function disableFormFields() {
    const form = safeGet('taxForm');
    if (!form) return;
    form.querySelectorAll('input, select, textarea, button.btn-lookup').forEach((el) => {
        el.disabled = true;
    });
}

function disableEdit() {
    currentMode = 'view';
    disableFormFields();
    setEditing(false);
}

function clearForm() {
    const ids = ['taxId', 'description', 'taxType', 'calculationMethod', 'cessId', 'roundingCode', 'payableGlId', 'paidGlId', 'payableFrequency', 'remarks'];
    ids.forEach((id) => {
        const el = safeGet(id);
        if (!el) return;
        el.value = '';
    });

    // Clear audit trail
    ['createdBy', 'createdDate', 'createdTime', 'modifiedBy', 'modifiedDate', 'modifiedTime'].forEach((id) => {
        const el = safeGet(id);
        if (el) el.textContent = '-';
    });
}

function validateForm() {
    const taxType = safeGet('taxType')?.value;
    const description = safeGet('description')?.value;
    const calculationMethod = safeGet('calculationMethod')?.value;
    return !!(taxType && description && calculationMethod);
}

// ========================================
// DATA LOADING (MAIN PAGE)
// ========================================
function loadTaxData() {
    const tbody = safeGet('taxTableBody');
    if (!tbody) return;

    const rows = [
        {
            taxId: 'TAX001',
            description: 'Value Added Tax',
            taxType: 'VAT',
            calculationMethod: 'Percentage',
            roundingCode: '0.01',
            status: 'Active'
        },
        {
            taxId: 'TAX002',
            description: 'Goods and Services Tax',
            taxType: 'GST',
            calculationMethod: 'Amount Level',
            roundingCode: '0.01',
            status: 'Active'
        }
    ];

    tbody.innerHTML = '';
    rows.forEach((r) => {
        const tr = document.createElement('tr');
        tr.dataset.taxId = r.taxId;
        tr.innerHTML = `
            <td><input type="checkbox" aria-label="Select row" /></td>
            <td>${r.taxId}</td>
            <td>${r.description}</td>
            <td>${r.taxType}</td>
            <td>${r.calculationMethod}</td>
            <td>${r.roundingCode}</td>
            <td><span class="badge text-bg-success">${r.status}</span></td>
        `.trim();
        tr.addEventListener('click', (e) => {
            // avoid toggling when clicking checkbox
            if (e.target && e.target.matches('input[type="checkbox"]')) return;
            selectRow(tr, r.taxId);
        });
        tbody.appendChild(tr);
    });
}

function loadTaxDetails(taxId) {
    if (!taxId) return;
    if (taxId === 'TAX001') {
        const setVal = (id, v) => {
            const el = safeGet(id);
            if (el) el.value = v;
        };

        setVal('taxId', 'TAX001');
        setVal('description', 'Value Added Tax');
        setVal('taxType', 'VAT');
        setVal('calculationMethod', 'Percentage');
        setVal('cessId', '');
        setVal('roundingCode', '0.01');
        setVal('payableGlId', 'GL12345');
        setVal('paidGlId', 'GL12346');
        setVal('payableFrequency', 'Monthly');
        setVal('remarks', 'Standard VAT applicable on all taxable supplies');
        updateAuditTrail();
    }
}

function updateAuditTrail() {
    const now = new Date();
    const currentUser = 'ADMIN';

    const setText = (id, val) => {
        const el = safeGet(id);
        if (el) el.textContent = val;
    };

    if (currentMode === 'add') {
        setText('createdBy', currentUser);
        setText('createdDate', now.toLocaleDateString());
        setText('createdTime', now.toLocaleTimeString());
        setText('modifiedBy', '-');
        setText('modifiedDate', '-');
        setText('modifiedTime', '-');
    } else {
        setText('createdBy', 'SYSTEM');
        setText('createdDate', '2024-01-15');
        setText('createdTime', '10:30:00');
        setText('modifiedBy', currentUser);
        setText('modifiedDate', now.toLocaleDateString());
        setText('modifiedTime', now.toLocaleTimeString());
    }
}

// ========================================
// TABLE INTERACTIONS (MAIN PAGE)
// ========================================
function selectRow(row, taxId) {
    const tbody = safeGet('taxTableBody');
    if (!tbody) return;
    tbody.querySelectorAll('tr.selected').forEach((tr) => tr.classList.remove('selected'));
    row.classList.add('selected');
    selectedTaxId = taxId;
    loadTaxDetails(taxId);
}

function refreshTable() {
    loadTaxData();
    showMessage('Table refreshed', 'info');
}

function exportTable() {
    showMessage('Exporting table data...', 'info');
    console.log('Export functionality would be implemented here');
}

// ========================================
// SEARCH
// ========================================
function searchTax() {
    const taxId = safeGet('taxId')?.value;
    if (taxId) {
        loadTaxDetails(taxId);
        showMessage('Tax record found', 'success');
    } else {
        showMessage('Please enter a Tax ID to search', 'info');
    }
}

// ========================================
// BOOTSTRAP / DOM WIRING
// ========================================
function initMainFormEvents() {
    if (!isMainTaxMaintenancePage()) return;
    const form = safeGet('taxForm');
    if (!form) return;

    // Action panel
    const wire = (action, fn) => {
        const btn = document.querySelector(`.action-panel [data-action="${action}"]`);
        if (btn) btn.addEventListener('click', fn);
    };
    wire('view', handleView);
    wire('add', handleAdd);
    wire('edit', handleEdit);
    wire('delete', handleDelete);
    wire('save', handleSave);
    wire('cancel', handleCancel);
    wire('back', handleBack);

    // Form-level buttons
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        if (action === 'searchTax') searchTax();
        if (action === 'refreshTable') refreshTable();
        if (action === 'exportTable') exportTable();
    });

    const selectAll = safeGet('taxSelectAll');
    if (selectAll) {
        selectAll.addEventListener('change', () => {
            const tbody = safeGet('taxTableBody');
            if (!tbody) return;
            tbody.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
                cb.checked = selectAll.checked;
            });
        });
    }
}

function initializeMainPageState() {
    if (!isMainTaxMaintenancePage()) return;
    disableFormFields();
    setEditing(false);
    loadTaxData();
}

document.addEventListener('DOMContentLoaded', () => {
    initHeaderControls();
    initSectionToggles();
    initSidebar();
    initMainFormEvents();
    initializeMainPageState();
});

// Expose CRUD handlers for compatibility (if any legacy calls remain)
window.handleView = handleView;
window.handleAdd = handleAdd;
window.handleEdit = handleEdit;
window.handleSave = handleSave;
window.handleDelete = handleDelete;
window.handleCancel = handleCancel;
window.handleBack = handleBack;
