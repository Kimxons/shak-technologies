(function () {
    const bodyClass = 'third-party-service-providers';
    const MODES = { VIEW: 'View', ADD: 'Add', EDIT: 'Edit' };
    const state = { mode: MODES.VIEW, hasLoaded: false, canAdd: false, updateCount: 0 };
    const thirdPartyProviderService = window.ThirdPartyProviderStaticDataService || window.StaticDataService;
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
    function extractFirstRow(response) {
        if (!response) return null;
        const candidate = response.data || response.Details || response;
        if (Array.isArray(candidate)) return candidate[0] || null;
        if (candidate && typeof candidate === 'object') {
            for (const value of Object.values(candidate)) {
                if (Array.isArray(value) && value.length) return value[0];
            }
            return candidate;
        }
        return null;
    }
    function setAudit(row) {
        qs('#spn_providerCreatedBy').textContent = row?.CreatedBy || row?.createdBy || '-';
        qs('#spn_providerCreatedOn').textContent = row?.CreatedOn || row?.createdOn || '-';
        qs('#spn_providerSupervisedBy').textContent = row?.SupervisedBy || row?.supervisedBy || '-';
        qs('#spn_providerSupervisedOn').textContent = row?.SupervisedOn || row?.supervisedOn || '-';
    }
    function updateButtons() {
        const editing = state.mode !== MODES.VIEW;
        setButtonDisabled(qs('#btn_providerView'), editing);
        setButtonDisabled(qs('#btn_providerAdd'), !(state.canAdd || (!state.hasLoaded && qs('#txt_serviceProviderId').value.trim())) || editing);
        setButtonDisabled(qs('#btn_providerEdit'), !state.hasLoaded || editing);
        setButtonDisabled(qs('#btn_providerDelete'), !state.hasLoaded || editing);
        setButtonDisabled(qs('#btn_providerSave'), !editing);
        setButtonDisabled(qs('#btn_providerCancel'), !(editing || state.hasLoaded || state.canAdd));
    }
    function setMode(mode) {
        state.mode = mode;
        const editable = mode !== MODES.VIEW;
        ['#txt_providerDescription', '#txt_providerAccountId', '#txt_webService', '#chk_liveValidation', '#txt_validationMethod', '#txt_postingMethod', '#txt_exportFormat', '#chk_isExport', '#txt_currencyId'].forEach((sel) => {
            const el = qs(sel);
            if (el) el.disabled = !editable;
        });
        ['#btn_searchProviderAccount', '#btn_searchCurrency'].forEach((sel) => {
            const button = qs(sel);
            if (button) button.disabled = !editable;
        });
        updateButtons();
    }
    function clearForm(keepId) {
        const id = qs('#txt_serviceProviderId').value.trim();
        qs('#txt_serviceProviderSummary').value = '';
        qs('#txt_providerDescription').value = '';
        qs('#txt_providerAccountId').value = '';
        qs('#txt_providerAccountName').value = '';
        qs('#txt_webService').value = '';
        qs('#chk_liveValidation').checked = false;
        qs('#txt_validationMethod').value = '';
        qs('#txt_postingMethod').value = '';
        qs('#txt_exportFormat').value = '';
        qs('#chk_isExport').checked = false;
        qs('#txt_currencyId').value = '';
        qs('#txt_currencyName').value = '';
        if (!keepId) qs('#txt_serviceProviderId').value = '';
        else qs('#txt_serviceProviderId').value = id;
        setAudit(null);
        state.hasLoaded = false;
        state.updateCount = 0;
    }
    function applyRecord(row, id) {
        qs('#txt_serviceProviderId').value = row?.ServiceProvider || row?.ID || row?.SystemSubID || id || '';
        qs('#txt_serviceProviderSummary').value = row?.Description || '';
        qs('#txt_providerDescription').value = row?.Description || '';
        qs('#txt_providerAccountId').value = row?.GLAccountID || row?.AccountId || row?.AccountID || '';
        qs('#txt_providerAccountName').value = row?.AccountName || '';
        qs('#txt_webService').value = row?.WebService || row?.WebServiceURL || '';
        qs('#chk_liveValidation').checked = Boolean(row?.IsLiveValidation);
        qs('#txt_validationMethod').value = row?.ValidationMethod || '';
        qs('#txt_postingMethod').value = row?.PostingMethod || '';
        qs('#txt_exportFormat').value = row?.ExportFormat || '';
        qs('#chk_isExport').checked = Boolean(row?.IsExport);
        qs('#txt_currencyId').value = row?.CurrencyID || row?.CurrencyId || '';
        qs('#txt_currencyName').value = row?.CurrencyName || '';
        state.updateCount = Number(row?.UpdateCount || 0);
        setAudit(row);
    }
    async function loadRecord(selectedId) {
        const id = (selectedId || qs('#txt_serviceProviderId').value).trim();
        if (!id) {
            setToast('Enter Service Provider ID.', 'warning');
            return;
        }
        try {
            const response = await thirdPartyProviderService.getThirdPartyProvider({ ID: id });
            const row = extractFirstRow(response);
            if (!row || !(row.ServiceProvider || row.ID || row.SystemSubID || id)) {
                clearForm(true);
                state.canAdd = true;
                setMode(MODES.VIEW);
                setInlineAlert('Record does not exist. Click Add to create it.');
                setToast('Record does not exist.', 'warning');
                return;
            }
            setInlineAlert('');
            applyRecord(row, id);
            state.hasLoaded = true;
            state.canAdd = false;
            setMode(MODES.VIEW);
            setToast('Third Party Provider loaded.', 'success');
        } catch (error) {
            setInlineAlert('Third Party Provider lookup failed.');
            setToast('Third Party Provider lookup failed.', 'danger');
        }
    }
    async function saveRecord() {
        const id = qs('#txt_serviceProviderId').value.trim();
        if (!id) {
            setToast('Service Provider ID is required.', 'warning');
            return;
        }
        const now = new Date();
        const operatorId = window.AuthService?.getSession?.()?.operatorId || 'web_portal';
        const isAdd = state.mode === MODES.ADD;
        const payload = {
            ID: id,
            Description: qs('#txt_providerDescription').value.trim(),
            GLAccountID: qs('#txt_providerAccountId').value.trim(),
            WebService: qs('#txt_webService').value.trim(),
            IsLiveValidation: qs('#chk_liveValidation').checked ? 1 : 0,
            ValidationMethod: qs('#txt_validationMethod').value.trim(),
            PostingMethod: qs('#txt_postingMethod').value.trim(),
            IsExport: qs('#chk_isExport').checked ? 1 : 0,
            ExportFormat: qs('#txt_exportFormat').value.trim(),
            CurrencyID: qs('#txt_currencyId').value.trim(),
            CreatedBy: isAdd ? operatorId : '',
            CreatedOn: isAdd ? now.toLocaleString('en-US') : '',
            ModifiedBy: operatorId,
            ModifiedOn: '',
            SupervisedBy: '',
            SupervisedOn: '',
            NewRecord: isAdd ? 1 : state.updateCount
        };
        try {
            const response = await thirdPartyProviderService.addEditThirdPartyProvider(payload);
            if (!response?.success) {
                setToast(response?.message || 'Save failed.', 'danger');
                return;
            }
            state.canAdd = false;
            await loadRecord(id);
            setToast('Third Party Provider saved.', 'success');
        } catch (error) {
            setToast('Save failed.', 'danger');
        }
    }
    async function deleteRecord() {
        const id = qs('#txt_serviceProviderId').value.trim();
        if (!id || !state.hasLoaded) {
            setToast('Load a record first.', 'warning');
            return;
        }
        if (!window.confirm(`Delete Service Provider '${id}'?`)) return;
        try {
            const response = await thirdPartyProviderService.deleteThirdPartyProvider({ ID: id, NewRecord: 0 });
            if (!response?.success) {
                setToast(response?.message || 'Delete failed.', 'danger');
                return;
            }
            clearForm(false);
            state.canAdd = false;
            setMode(MODES.VIEW);
            setToast('Third Party Provider deleted.', 'success');
        } catch (error) {
            setToast('Delete failed.', 'danger');
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
    function openCurrencyLookup(onSelect) {
        initSearchModal();
        if (!searchModal) return;
        searchModal.open({
            title: 'Find Currency',
            tableID: 'MastCurrencyID',
            searchFields: [{ name: 'currencyId', label: 'Currency ID', column: 'CurrencyID' }, { name: 'description', label: 'Description', column: 'Description' }],
            displayFields: [{ key: 'CurrencyID', label: 'Currency ID' }, { key: 'Description', label: 'Description' }],
            onSelect: onSelect
        });
    }
    function bindEvents() {
        qs('#btn_searchProvider')?.addEventListener('click', () => void loadRecord());
        qs('#btn_providerView')?.addEventListener('click', () => void loadRecord());
        qs('#btn_providerAdd')?.addEventListener('click', () => {
            clearForm(true);
            state.canAdd = true;
            setMode(MODES.ADD);
            setToast('Add mode.', 'info');
        });
        qs('#btn_providerEdit')?.addEventListener('click', () => {
            if (!state.hasLoaded) return;
            setMode(MODES.EDIT);
            setToast('Edit mode.', 'info');
        });
        qs('#btn_providerSave')?.addEventListener('click', () => void saveRecord());
        qs('#btn_providerDelete')?.addEventListener('click', () => void deleteRecord());
        qs('#btn_providerCancel')?.addEventListener('click', () => {
            if (state.hasLoaded) void loadRecord();
            else clearForm(false);
            state.canAdd = false;
            setMode(MODES.VIEW);
            setInlineAlert('');
            setToast('Changes cancelled.', 'info');
        });
        qs('#btn_searchProviderAccount')?.addEventListener('click', () => openGlLookup((row) => {
            qs('#txt_providerAccountId').value = row.AccountID || row.GLAccountID || '';
            qs('#txt_providerAccountName').value = row.GLName || row.AccountName || '';
        }));
        qs('#btn_searchCurrency')?.addEventListener('click', () => openCurrencyLookup((row) => {
            qs('#txt_currencyId').value = row.CurrencyID || '';
            qs('#txt_currencyName').value = row.Description || '';
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