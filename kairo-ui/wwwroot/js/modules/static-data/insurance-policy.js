(function () {
    const bodyClass = 'insurance-policy';
    const MODES = { VIEW: 'View', ADD: 'Add', EDIT: 'Edit' };
    const state = { mode: MODES.VIEW, hasLoaded: false, canAdd: false };
    const insurancePolicyService = window.InsurancePolicyStaticDataService || window.StaticDataService;

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
        qs('#spn_policyCreatedBy').textContent = row?.CreatedBy || row?.createdBy || '-';
        qs('#spn_policyCreatedOn').textContent = row?.CreatedOn || row?.createdOn || '-';
        qs('#spn_policyModifiedBy').textContent = row?.ModifiedBy || row?.modifiedBy || '-';
        qs('#spn_policyModifiedOn').textContent = row?.ModifiedOn || row?.modifiedOn || '-';
        qs('#spn_policySupervisedBy').textContent = row?.SupervisedBy || row?.supervisedBy || '-';
        qs('#spn_policySupervisedOn').textContent = row?.SupervisedOn || row?.supervisedOn || '-';
    }
    function updateButtons() {
        const editing = state.mode !== MODES.VIEW;
        setButtonDisabled(qs('#btn_policyView'), editing);
        setButtonDisabled(qs('#btn_policyAdd'), !(state.canAdd || (!state.hasLoaded && qs('#txt_policyNo').value.trim())) || editing);
        setButtonDisabled(qs('#btn_policyEdit'), !state.hasLoaded || editing);
        setButtonDisabled(qs('#btn_policyDelete'), !state.hasLoaded || editing);
        setButtonDisabled(qs('#btn_policySave'), !editing);
        setButtonDisabled(qs('#btn_policyCancel'), !(editing || state.hasLoaded || state.canAdd));
    }
    function setMode(mode) {
        state.mode = mode;
        const editable = mode !== MODES.VIEW;
        ['#txt_policyDate', '#txt_insuranceCode', '#txt_companyId', '#txt_address', '#ddl_city', '#txt_phone', '#ddl_country', '#txt_agentName', '#chk_policyActive'].forEach((sel) => {
            const el = qs(sel);
            if (el) el.disabled = !editable;
        });
        ['#btn_searchInsuranceCode', '#btn_searchCompany'].forEach((sel) => {
            const button = qs(sel);
            if (button) button.disabled = !editable;
        });
        updateButtons();
    }
    function clearForm(keepId) {
        const policyNo = qs('#txt_policyNo').value.trim();
        qs('#txt_policySummary').value = '';
        qs('#txt_policyDate').value = '';
        qs('#txt_insuranceCode').value = '';
        qs('#txt_insuranceCodeDesc').value = '';
        qs('#txt_companyId').value = '';
        qs('#txt_companyName').value = '';
        qs('#txt_address').value = '';
        qs('#ddl_city').value = '';
        qs('#txt_phone').value = '';
        qs('#ddl_country').value = '';
        qs('#txt_agentName').value = '';
        qs('#chk_policyActive').checked = false;
        if (!keepId) qs('#txt_policyNo').value = '';
        else qs('#txt_policyNo').value = policyNo;
        setAudit(null);
        state.hasLoaded = false;
    }
    function applyRecord(row, policyNo) {
        qs('#txt_policyNo').value = row?.PolicyNo || policyNo || '';
        qs('#txt_policySummary').value = row?.CompanyName || row?.InsuranceCompanyName || row?.Description || '';
        const policyDate = String(row?.PolicyDate || row?.Date || row?.EffectiveDate || '').trim();
        if (policyDate) {
            const match = policyDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (match) qs('#txt_policyDate').value = `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
        }
        qs('#txt_insuranceCode').value = row?.InsuranceCode || '';
        qs('#txt_insuranceCodeDesc').value = row?.Description || '';
        qs('#txt_companyId').value = row?.CompanyID || row?.InsuranceID || '';
        qs('#txt_companyName').value = row?.CompanyName || row?.InsuranceName || '';
        qs('#txt_address').value = row?.Address || '';
        qs('#ddl_city').value = row?.CityID || '';
        qs('#txt_phone').value = row?.Phone || '';
        qs('#ddl_country').value = row?.CountryID || '';
        qs('#txt_agentName').value = row?.AgentName || '';
        qs('#chk_policyActive').checked = Boolean(row?.Status ?? row?.IsActive ?? row?.status);
        setAudit(row);
    }
    async function loadPolicy(selectedPolicyNo) {
        const policyNo = (selectedPolicyNo || qs('#txt_policyNo').value).trim();
        if (!policyNo) {
            setToast('Enter Policy No.', 'warning');
            return;
        }
        setInlineAlert('');
        try {
            const response = await insurancePolicyService.getInsurancePolicy(policyNo);
            const row = extractFirstRow(response);
            if (!row || !(row.PolicyNo || policyNo)) {
                clearForm(true);
                state.canAdd = true;
                setMode(MODES.VIEW);
                setInlineAlert('No policy found. Click Add to create it.');
                setToast('No policy found.', 'warning');
                return;
            }
            applyRecord(row, policyNo);
            state.hasLoaded = true;
            state.canAdd = false;
            setMode(MODES.VIEW);
            setToast('Policy loaded.', 'success');
        } catch (error) {
            setInlineAlert('Policy lookup failed.');
            setToast('Policy lookup failed.', 'danger');
        }
    }
    async function populateDropdowns() {
        if (!window.LookupService) return;
        try {
            const cities = await window.LookupService.getCities();
            qs('#ddl_city').innerHTML = '<option value="">--Select--</option>' + cities.map((item) => `<option value="${item.value}">${item.label}</option>`).join('');
        } catch (error) {
            console.warn('Failed loading cities', error);
        }
        try {
            const countries = await window.LookupService.getCountries();
            qs('#ddl_country').innerHTML = '<option value="">--Select--</option>' + countries.map((item) => `<option value="${item.value}">${item.label}</option>`).join('');
        } catch (error) {
            console.warn('Failed loading countries', error);
        }
    }
    async function savePolicy() {
        const policyNo = qs('#txt_policyNo').value.trim();
        if (!policyNo) {
            setToast('Policy No is required.', 'warning');
            return;
        }
        const now = new Date();
        const createdBy = state.mode === MODES.ADD ? (window.AuthService?.getSession?.()?.operatorId || 'web_portal') : (qs('#spn_policyCreatedBy').textContent === '-' ? '' : qs('#spn_policyCreatedBy').textContent);
        const createdOn = state.mode === MODES.ADD ? now.toLocaleString('en-US') : (qs('#spn_policyCreatedOn').textContent === '-' ? '' : qs('#spn_policyCreatedOn').textContent);
        const payload = {
            PolicyNo: policyNo,
            PolicyDate: qs('#txt_policyDate').value ? new Date(qs('#txt_policyDate').value).toLocaleDateString('en-US') : '',
            InsuranceCode: qs('#txt_insuranceCode').value.trim(),
            Description: qs('#txt_insuranceCodeDesc').value.trim(),
            CompanyID: qs('#txt_companyId').value.trim(),
            CompanyName: qs('#txt_companyName').value.trim(),
            Address: qs('#txt_address').value.trim(),
            CityID: qs('#ddl_city').value,
            Phone: qs('#txt_phone').value.trim(),
            CountryID: qs('#ddl_country').value,
            CountryName: qs('#ddl_country').selectedOptions[0]?.text || '',
            AgentName: qs('#txt_agentName').value.trim(),
            Status: qs('#chk_policyActive').checked ? 1 : 0,
            CreatedBy: createdBy,
            CreatedOn: createdOn,
            ModifiedBy: window.AuthService?.getSession?.()?.operatorId || 'web_portal',
            ModifiedOn: now.toLocaleString('en-US'),
            NewRecord: state.mode === MODES.ADD ? 1 : 0
        };
        try {
            const response = await insurancePolicyService.addEditInsurancePolicy(payload);
            if (!response?.success) {
                setToast(response?.message || 'Save failed.', 'danger');
                return;
            }
            state.canAdd = false;
            await loadPolicy(policyNo);
            setToast('Insurance Policy saved.', 'success');
        } catch (error) {
            setToast('Save failed.', 'danger');
        }
    }
    async function deletePolicy() {
        const policyNo = qs('#txt_policyNo').value.trim();
        if (!policyNo || !state.hasLoaded) {
            setToast('Load a policy first.', 'warning');
            return;
        }
        if (!window.confirm(`Delete Insurance Policy '${policyNo}'?`)) return;
        try {
            const response = await insurancePolicyService.deleteInsurancePolicy(policyNo);
            if (!response?.success) {
                setToast(response?.message || 'Delete failed.', 'danger');
                return;
            }
            clearForm(false);
            state.canAdd = false;
            setMode(MODES.VIEW);
            setToast('Insurance Policy deleted.', 'success');
        } catch (error) {
            setToast('Delete failed.', 'danger');
        }
    }
    function bindLookups() {
        qs('#btn_searchInsuranceCode')?.addEventListener('click', async () => {
            if (!window.InsuranceCodeSearchService?.openSearchModal) return;
            await window.InsuranceCodeSearchService.openSearchModal((code, description) => {
                qs('#txt_insuranceCode').value = code || '';
                qs('#txt_insuranceCodeDesc').value = description || '';
            });
        });
        qs('#btn_searchCompany')?.addEventListener('click', async () => {
            if (!window.InsuranceSearchService?.openSearchModal) return;
            await window.InsuranceSearchService.openSearchModal((companyId, companyName) => {
                qs('#txt_companyId').value = companyId || '';
                qs('#txt_companyName').value = companyName || '';
            });
        });
    }
    function bindEvents() {
        qs('#btn_searchPolicy')?.addEventListener('click', () => void loadPolicy());
        qs('#btn_policyView')?.addEventListener('click', () => void loadPolicy());
        qs('#btn_policyAdd')?.addEventListener('click', () => {
            clearForm(true);
            state.canAdd = true;
            setMode(MODES.ADD);
            setToast('Add mode.', 'info');
        });
        qs('#btn_policyEdit')?.addEventListener('click', () => {
            if (!state.hasLoaded) return;
            setMode(MODES.EDIT);
            setToast('Edit mode.', 'info');
        });
        qs('#btn_policySave')?.addEventListener('click', () => void savePolicy());
        qs('#btn_policyDelete')?.addEventListener('click', () => void deletePolicy());
        qs('#btn_policyCancel')?.addEventListener('click', () => {
            if (state.hasLoaded) void loadPolicy();
            else clearForm(false);
            state.canAdd = false;
            setMode(MODES.VIEW);
            setInlineAlert('');
            setToast('Changes cancelled.', 'info');
        });
        qs('#txt_policyNo')?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                void loadPolicy();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', async () => {
        addBodyClass();
        initSectionToggles();
        bindLookups();
        bindEvents();
        setMode(MODES.VIEW);
        await populateDropdowns();
    });
})();