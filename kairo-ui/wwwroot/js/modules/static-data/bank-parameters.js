(function () {
    const state = {
        current: null,
        original: null,
        editing: false
    };

    const fieldMap = {
        txt_bankId: 'BankID',
        txt_bankName: 'BankName',
        txt_shortName: 'ShortName',
        txt_address1: 'Address1',
        txt_address2: 'Address2',
        txt_cityId: 'CityID',
        txt_countryId: 'CountryID',
        txt_zipCode: 'ZipCode',
        txt_phone1: 'Phone1',
        txt_phone2: 'Phone2',
        txt_mobile: 'Mobile',
        txt_fax: 'Fax',
        txt_email: 'EMailID',
        txt_bankRegNumber: 'BankRegNumber',
        txt_maximumLoanCycle: 'MaximumLoanCycle'
    };

    function qs(selector, root = document) { return root.querySelector(selector); }
    function qsa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }

    function showMessage(message, type = 'info') {
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
            text.textContent = '';
            return;
        }

        text.textContent = message;
        alert.classList.remove('d-none');
        alert.removeAttribute('hidden');
    }

    function formatDate(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toISOString().slice(0, 10);
    }

    function formatAudit(value) {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString();
    }

    function clone(value) {
        return value ? JSON.parse(JSON.stringify(value)) : null;
    }

    function populateForm(data) {
        Object.entries(fieldMap).forEach(([id, key]) => {
            const input = qs(`#${id}`);
            if (input) {
                input.value = data?.[key] ?? '';
            }
        });

        const auditedDate = qs('#txt_auditedDate');
        if (auditedDate) auditedDate.value = formatDate(data?.AuditedDate);

        const microFinance = qs('#chk_isMicroFinance');
        if (microFinance) microFinance.checked = !!data?.IsMicroFinance;

        const createdBy = qs('#spn_createdBy');
        const createdOn = qs('#spn_createdOn');
        const modifiedBy = qs('#spn_modifiedBy');
        const modifiedOn = qs('#spn_modifiedOn');

        if (createdBy) createdBy.textContent = data?.CreatedBy || '-';
        if (createdOn) createdOn.textContent = formatAudit(data?.CreatedOn);
        if (modifiedBy) modifiedBy.textContent = data?.ModifiedBy || '-';
        if (modifiedOn) modifiedOn.textContent = formatAudit(data?.ModifiedOn);
    }

    function readForm() {
        const payload = clone(state.current) || {};

        Object.entries(fieldMap).forEach(([id, key]) => {
            const input = qs(`#${id}`);
            payload[key] = input ? input.value.trim() : '';
        });

        payload.MaximumLoanCycle = payload.MaximumLoanCycle ? Number(payload.MaximumLoanCycle) : null;
        payload.AuditedDate = qs('#txt_auditedDate')?.value || null;
        payload.IsMicroFinance = !!qs('#chk_isMicroFinance')?.checked;

        return payload;
    }

    function setEditing(editing) {
        state.editing = editing;

        Object.keys(fieldMap).forEach((id) => {
            const input = qs(`#${id}`);
            if (!input) return;

            input.disabled = !editing || id === 'txt_bankId';
        });

        const auditedDate = qs('#txt_auditedDate');
        const microFinance = qs('#chk_isMicroFinance');
        if (auditedDate) auditedDate.disabled = !editing;
        if (microFinance) microFinance.disabled = !editing;

        const editBtn = qs('#btn_bankEdit');
        const saveBtn = qs('#btn_bankSave');
        const cancelBtn = qs('#btn_bankCancel');

        if (editBtn) editBtn.disabled = editing || !state.current;
        if (saveBtn) saveBtn.disabled = !editing;
        if (cancelBtn) cancelBtn.disabled = !editing;
    }

    async function load(forceRefresh = false) {
        setInlineAlert('');

        try {
            const response = await fetch(`/StaticData/BankParameters/get?forceRefresh=${forceRefresh ? 'true' : 'false'}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to load bank settings.');
            }

            state.current = result.data || {};
            state.original = clone(state.current);
            populateForm(state.current);
            setEditing(false);
        } catch (error) {
            const message = error?.message || 'Failed to load bank settings.';
            setInlineAlert(message);
            showMessage(message, 'danger');
        }
    }

    async function save() {
        const payload = readForm();
        if (!payload.BankName) {
            setInlineAlert('Bank Name is required.');
            showMessage('Bank Name is required.', 'warning');
            return;
        }

        setInlineAlert('');

        try {
            const response = await fetch('/StaticData/BankParameters/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to save bank settings.');
            }

            showMessage(result.message || 'Bank settings saved.', 'success');
            await load(true);
        } catch (error) {
            const message = error?.message || 'Failed to save bank settings.';
            setInlineAlert(message);
            showMessage(message, 'danger');
        }
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
                const hidden = content.hasAttribute('hidden');
                if (hidden) content.removeAttribute('hidden');
                else content.setAttribute('hidden', '');

                const expanded = hidden;
                button?.setAttribute('aria-expanded', String(expanded));
                icon?.classList.toggle('bi-chevron-up', expanded);
                icon?.classList.toggle('bi-chevron-down', !expanded);
            };

            header.addEventListener('click', toggle);
            button?.addEventListener('click', (event) => {
                event.stopPropagation();
                toggle();
            });
        });

        qs('[data-inline-alert-close]')?.addEventListener('click', () => setInlineAlert(''));
    }

    function bindEvents() {
        qs('#btn_bankView')?.addEventListener('click', () => load(true));
        qs('#btn_bankEdit')?.addEventListener('click', () => {
            state.original = clone(state.current);
            setEditing(true);
        });
        qs('#btn_bankSave')?.addEventListener('click', save);
        qs('#btn_bankCancel')?.addEventListener('click', () => {
            populateForm(state.original || state.current || {});
            setInlineAlert('');
            setEditing(false);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        initSectionToggles();
        bindEvents();
        setEditing(false);
        load(false);
    });
})();