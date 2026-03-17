(function () {
    const bodyClass = 'insurance-code';
    const MODES = { VIEW: 'View', ADD: 'Add', EDIT: 'Edit' };
    const state = { mode: MODES.VIEW, hasLoaded: false, canAdd: false };
    const insuranceCodeService = window.InsuranceCodeStaticDataService || window.StaticDataService;

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
        qs('#spn_createdBy').textContent = row?.CreatedBy || row?.createdBy || row?.OperatedBy || '-';
        qs('#spn_createdOn').textContent = row?.CreatedOn || row?.createdOn || row?.OperatedOn || '-';
        qs('#spn_modifiedBy').textContent = row?.ModifiedBy || row?.modifiedBy || '-';
        qs('#spn_modifiedOn').textContent = row?.ModifiedOn || row?.modifiedOn || '-';
        qs('#spn_supervisedBy').textContent = row?.SupervisedBy || row?.supervisedBy || row?.ApprovedBy || '-';
        qs('#spn_supervisedOn').textContent = row?.SupervisedOn || row?.supervisedOn || row?.ApprovedOn || '-';
    }
    function clearForm(keepId) {
        const id = qs('#txt_insuranceCode').value.trim();
        qs('#txt_description').value = '';
        qs('#chk_isActive').checked = false;
        setAudit(null);
        if (!keepId) qs('#txt_insuranceCode').value = '';
        else qs('#txt_insuranceCode').value = id;
        qs('#txt_description').readOnly = false;
        state.hasLoaded = false;
    }
    function updateButtons() {
        const isEditing = state.mode !== MODES.VIEW;
        setButtonDisabled(qs('#btn_view'), isEditing);
        setButtonDisabled(qs('#btn_add'), !(state.canAdd || (!state.hasLoaded && qs('#txt_insuranceCode').value.trim())) || isEditing);
        setButtonDisabled(qs('#btn_edit'), !state.hasLoaded || isEditing);
        setButtonDisabled(qs('#btn_delete'), !state.hasLoaded || isEditing);
        setButtonDisabled(qs('#btn_save'), !isEditing);
        setButtonDisabled(qs('#btn_cancel'), !(isEditing || state.hasLoaded || state.canAdd));
    }
    function setMode(mode) {
        state.mode = mode;
        const editable = mode !== MODES.VIEW;
        qs('#txt_description').disabled = !editable;
        qs('#chk_isActive').disabled = !editable;
        updateButtons();
    }
    async function loadRecord(selectedCode) {
        const code = (selectedCode || qs('#txt_insuranceCode').value).trim();
        if (!code) {
            setToast('Enter Insurance Code.', 'warning');
            return;
        }
        setInlineAlert('');
        try {
            const response = await insuranceCodeService.getInsuranceCode(code);
            const row = extractFirstRow(response);
            if (!row || !(row.InsuranceCode || row.insurancecode || row.Code || code)) {
                clearForm(true);
                state.canAdd = true;
                setMode(MODES.VIEW);
                setInlineAlert('Record does not exist. Click Add to create it.');
                setToast('Record does not exist.', 'warning');
                return;
            }
            qs('#txt_insuranceCode').value = row.InsuranceCode || row.insurancecode || row.Code || code;
            qs('#txt_description').value = row.Description || row.description || '';
            qs('#chk_isActive').checked = Boolean(row.Status ?? row.status ?? row.IsActive ?? row.isactive);
            setAudit(row);
            state.hasLoaded = true;
            state.canAdd = false;
            setMode(MODES.VIEW);
            setToast('Insurance Code loaded.', 'success');
        } catch (error) {
            setInlineAlert('Insurance Code lookup failed.');
            setToast('Insurance Code lookup failed.', 'danger');
        }
    }
    async function saveRecord() {
        const insuranceCode = qs('#txt_insuranceCode').value.trim();
        if (!insuranceCode) {
            setToast('Insurance Code is required.', 'warning');
            return;
        }
        const now = new Date();
        const createdBy = qs('#spn_createdBy').textContent && qs('#spn_createdBy').textContent !== '-' ? qs('#spn_createdBy').textContent : (window.AuthService?.getSession?.()?.operatorId || 'web_portal');
        const createdOn = qs('#spn_createdOn').textContent && qs('#spn_createdOn').textContent !== '-' ? qs('#spn_createdOn').textContent : now.toLocaleString('en-US');
        const payload = {
            InsuranceCode: insuranceCode,
            Description: qs('#txt_description').value.trim(),
            Status: qs('#chk_isActive').checked ? 1 : 0,
            CreatedBy: createdBy,
            CreatedOn: createdOn,
            ModifiedBy: window.AuthService?.getSession?.()?.operatorId || 'web_portal',
            ModifiedOn: now.toLocaleString('en-US'),
            NewRecord: state.mode === MODES.ADD ? 1 : 0
        };
        try {
            const response = await insuranceCodeService.addEditInsuranceCode(payload);
            if (!response?.success) {
                setToast(response?.message || 'Save failed.', 'danger');
                return;
            }
            setToast('Insurance Code saved.', 'success');
            state.canAdd = false;
            await loadRecord(insuranceCode);
        } catch (error) {
            setToast('Save failed.', 'danger');
        }
    }
    async function deleteRecord() {
        const insuranceCode = qs('#txt_insuranceCode').value.trim();
        if (!insuranceCode || !state.hasLoaded) {
            setToast('Load a record first.', 'warning');
            return;
        }
        if (!window.confirm(`Delete Insurance Code '${insuranceCode}'?`)) return;
        try {
            const response = await insuranceCodeService.deleteInsuranceCode(insuranceCode);
            if (!response?.success) {
                setToast(response?.message || 'Delete failed.', 'danger');
                return;
            }
            clearForm(false);
            state.canAdd = false;
            setMode(MODES.VIEW);
            updateButtons();
            setToast('Insurance Code deleted.', 'success');
        } catch (error) {
            setToast('Delete failed.', 'danger');
        }
    }
    function bindEvents() {
        qs('#btn_searchInsuranceCode')?.addEventListener('click', () => void loadRecord());
        qs('#btn_view')?.addEventListener('click', () => void loadRecord());
        qs('#btn_add')?.addEventListener('click', () => {
            clearForm(true);
            state.canAdd = true;
            setMode(MODES.ADD);
            setToast('Add mode.', 'info');
        });
        qs('#btn_edit')?.addEventListener('click', () => {
            if (!state.hasLoaded) return;
            setMode(MODES.EDIT);
            setToast('Edit mode.', 'info');
        });
        qs('#btn_save')?.addEventListener('click', () => void saveRecord());
        qs('#btn_delete')?.addEventListener('click', () => void deleteRecord());
        qs('#btn_cancel')?.addEventListener('click', () => {
            if (state.hasLoaded) void loadRecord();
            else clearForm(false);
            state.canAdd = false;
            setMode(MODES.VIEW);
            setInlineAlert('');
            setToast('Changes cancelled.', 'info');
        });
        qs('#txt_insuranceCode')?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                void loadRecord();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        addBodyClass();
        initSectionToggles();
        bindEvents();
        setMode(MODES.VIEW);
    });
})();