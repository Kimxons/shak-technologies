(function () {
    const bodyClass = 'bin-maintenance';
    const MODES = { VIEW: 'View', ADD: 'Add', EDIT: 'Edit' };
    const state = { mode: MODES.VIEW, hasLoaded: false, canAdd: false };
    const breftBinsService = window.BreftBinsStaticDataService || window.StaticDataService;
    let searchModal = null;

    function qs(sel, root = document) { return root.querySelector(sel); }
    function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
    function addBodyClass() { document.body.classList.add(bodyClass); }
    function setToast(message, type = 'info') {
        if (window.NotificationService?.showToast) {
            window.NotificationService.showToast(message, type === 'danger' ? 'error' : type, type === 'danger' ? 5000 : 3000);
            return;
        }
        console[type === 'danger' ? 'error' : 'log'](message);
    }
    function initSearchModal() {
        if (!searchModal && typeof window.SearchModal === 'function' && window.AppCore) {
            searchModal = new window.SearchModal(window.AppCore);
        }
    }
    function setButtonDisabled(button, disabled) {
        if (!button) return;
        button.disabled = !!disabled;
        button.classList.toggle('is-disabled', !!disabled);
    }
    function initSectionToggles() {
        qsa('[data-section-toggle]').forEach((header) => {
            if (header.dataset.bound === '1') return;
            header.dataset.bound = '1';
            const section = header.closest('.form-section');
            const content = qs('[data-section-content]', section);
            const button = qs('.section-toggle-btn', header);
            const icon = qs('i.bi', button);
            const toggle = () => {
                const collapsed = content.hasAttribute('hidden');
                if (collapsed) content.removeAttribute('hidden');
                else content.setAttribute('hidden', '');
                const nextCollapsed = !collapsed;
                button.setAttribute('aria-expanded', String(!nextCollapsed));
                icon.classList.toggle('bi-chevron-up', !nextCollapsed);
                icon.classList.toggle('bi-chevron-down', nextCollapsed);
            };
            header.addEventListener('click', toggle);
            button?.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
        });
        qs('[data-inline-alert-close]')?.addEventListener('click', () => setInlineAlert(''));
    }
    function setInlineAlert(message) {
        const alert = qs('[data-inline-alert]');
        const text = qs('[data-inline-alert-text]');
        if (!alert || !text) return;
        if (!message) {
            alert.classList.add('d-none');
            alert.setAttribute('hidden', '');
            return;
        }
        text.textContent = message;
        alert.classList.remove('d-none');
        alert.removeAttribute('hidden');
    }
    function updateButtons() {
        const editing = state.mode !== MODES.VIEW;
        setButtonDisabled(qs('#btn_binView'), editing);
        setButtonDisabled(qs('#btn_binAdd'), !(state.canAdd || (!state.hasLoaded && qs('#txt_binId').value.trim())) || editing);
        setButtonDisabled(qs('#btn_binEdit'), !state.hasLoaded || editing);
        setButtonDisabled(qs('#btn_binSave'), !editing);
        setButtonDisabled(qs('#btn_binCancel'), !(editing || state.hasLoaded || state.canAdd));
    }
    function setMode(mode) {
        state.mode = mode;
        const editable = mode !== MODES.VIEW;
        ['#txt_payableGlId', '#txt_receivableGlId'].forEach((sel) => {
            const input = qs(sel);
            if (input) input.disabled = !editable;
        });
        ['#btn_searchPayableGl', '#btn_searchReceivableGl'].forEach((sel) => {
            const button = qs(sel);
            if (button) button.disabled = !editable;
        });
        updateButtons();
    }
    function setAudit(row) {
        qs('#spn_binCreatedBy').textContent = row?.CreatedBy || row?.OperatorID || '-';
        qs('#spn_binCreatedOn').textContent = row?.CreatedOn || row?.DateCreated || '-';
    }
    function clearForm(keepId) {
        const id = qs('#txt_binId').value.trim();
        qs('#txt_binSummary').value = '';
        qs('#txt_payableGlId').value = '';
        qs('#txt_payableGlName').value = '';
        qs('#txt_receivableGlId').value = '';
        qs('#txt_receivableGlName').value = '';
        if (!keepId) qs('#txt_binId').value = '';
        else qs('#txt_binId').value = id;
        setAudit(null);
        state.hasLoaded = false;
    }
    async function loadRecord(selectedBin) {
        const binId = (selectedBin || qs('#txt_binId').value).trim();
        if (!binId) {
            setToast('Enter Bin.', 'warning');
            return;
        }
        try {
            const response = await breftBinsService.getBreftBins({ BinID: binId });
            const row = response?.data?.Details01?.[0] || response?.data?.Details?.[0] || response?.Details?.[0] || null;
            if (!row) {
                clearForm(true);
                state.canAdd = true;
                setMode(MODES.VIEW);
                setInlineAlert('Bin does not exist. Click Add to create it.');
                setToast('Bin does not exist.', 'warning');
                return;
            }
            qs('#txt_binId').value = row.Bin || row.BinID || binId;
            qs('#txt_binSummary').value = row.Bin || row.BinID || binId;
            qs('#txt_payableGlId').value = row.PayableGLID || row.PayableGlId || row.PayableGlID || '';
            qs('#txt_payableGlName').value = row.PayableGLName || row.PayableGlName || '';
            qs('#txt_receivableGlId').value = row.ReceivableGLID || row.ReceivableGlId || row.ReceivableGlID || '';
            qs('#txt_receivableGlName').value = row.ReceivableGLName || row.ReceivableGlName || '';
            setAudit(row);
            state.hasLoaded = true;
            state.canAdd = false;
            setInlineAlert('');
            setMode(MODES.VIEW);
            setToast('Bin loaded.', 'success');
        } catch (error) {
            setInlineAlert('Bin lookup failed.');
            setToast('Bin lookup failed.', 'danger');
        }
    }
    async function saveRecord() {
        const binId = qs('#txt_binId').value.trim();
        if (!binId) {
            setToast('Bin is required.', 'warning');
            return;
        }
        const session = window.AuthService?.getSession?.() || {};
        const payload = {
            OurBranchID: session.branchID || session.branchId || window.Environment?.BranchID || '',
            Bin: binId,
            PayableGLID: qs('#txt_payableGlId').value.trim(),
            ReceivableGLID: qs('#txt_receivableGlId').value.trim(),
            OperatorID: session.operatorID || session.operatorId || window.Environment?.OperatorID || 'SYSTEM'
        };
        try {
            const response = await breftBinsService.addEditBreftBins(payload);
            if (response?.ReturnCode < 0 || response?.data?.ReturnCode < 0) {
                setToast(response?.ReturnMessage || response?.data?.ReturnMessage || 'Save failed.', 'danger');
                return;
            }
            state.canAdd = false;
            await loadRecord(binId);
            setToast('Bin saved.', 'success');
        } catch (error) {
            setToast('Save failed.', 'danger');
        }
    }
    function openGlLookup(onSelect) {
        initSearchModal();
        if (!searchModal) return;
        searchModal.open({
            title: 'Find GL Account',
            tableID: 'RecGLAccountID',
            searchFields: [{ name: 'accountId', label: 'Account ID', column: 'AccountID' }, { name: 'accountName', label: 'Account Name', column: 'GLName' }],
            displayFields: [{ key: 'AccountID', label: 'Account ID' }, { key: 'GLName', label: 'Name' }, { key: 'CurrencyID', label: 'Currency' }],
            onSelect: onSelect
        });
    }
    function bindEvents() {
        qs('#btn_viewBin')?.addEventListener('click', () => void loadRecord());
        qs('#btn_binView')?.addEventListener('click', () => void loadRecord());
        qs('#btn_binAdd')?.addEventListener('click', () => {
            clearForm(true);
            state.canAdd = true;
            setMode(MODES.ADD);
            setToast('Add mode.', 'info');
        });
        qs('#btn_binEdit')?.addEventListener('click', () => {
            if (!state.hasLoaded) return;
            setMode(MODES.EDIT);
            setToast('Edit mode.', 'info');
        });
        qs('#btn_binSave')?.addEventListener('click', () => void saveRecord());
        qs('#btn_binCancel')?.addEventListener('click', () => {
            if (state.hasLoaded) void loadRecord();
            else clearForm(false);
            state.canAdd = false;
            setMode(MODES.VIEW);
            setInlineAlert('');
            setToast('Changes cancelled.', 'info');
        });
        qs('#btn_searchPayableGl')?.addEventListener('click', () => openGlLookup((row) => {
            qs('#txt_payableGlId').value = row.AccountID || row.GLAccountID || '';
            qs('#txt_payableGlName').value = row.GLName || row.AccountName || '';
        }));
        qs('#btn_searchReceivableGl')?.addEventListener('click', () => openGlLookup((row) => {
            qs('#txt_receivableGlId').value = row.AccountID || row.GLAccountID || '';
            qs('#txt_receivableGlName').value = row.GLName || row.AccountName || '';
        }));
    }

    document.addEventListener('DOMContentLoaded', () => {
        addBodyClass();
        initSectionToggles();
        initSearchModal();
        bindEvents();
        setMode(MODES.VIEW);
    });
})();