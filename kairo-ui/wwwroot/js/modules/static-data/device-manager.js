(function () {
    const bodyClass = 'device-maintenance';
    const MODES = { VIEW: 'View', EDIT: 'Edit' };
    const state = { mode: MODES.VIEW, rows: [], selectedIndex: -1, gridAction: null };
    const deviceManagerService = window.DeviceManagerStaticDataService || window.StaticDataService;
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
    function getFormData() {
        return {
            BranchId: qs('#txt_deviceBranchId').value.trim(),
            BranchName: qs('#txt_deviceBranchName').value.trim(),
            DeviceId: qs('#txt_deviceId').value.trim(),
            DeviceDescription: qs('#txt_deviceDescription').value.trim(),
            SettlementGl: qs('#txt_settlementGlId').value.trim(),
            SettlementGlName: qs('#txt_settlementGlName').value.trim(),
            ReceivableGl: qs('#txt_receivableDeviceGlId').value.trim(),
            ReceivableGlName: qs('#txt_receivableDeviceGlName').value.trim(),
            BankId: qs('#txt_deviceBankId').value.trim(),
            IsActive: qs('#chk_deviceActive').checked,
            IsLocal: qs('#chk_deviceLocal').checked,
            CreatedBy: qs('#spn_deviceCreatedBy').textContent === '-' ? '' : qs('#spn_deviceCreatedBy').textContent,
            CreatedOn: qs('#spn_deviceCreatedOn').textContent === '-' ? '' : qs('#spn_deviceCreatedOn').textContent,
            ModifiedBy: qs('#spn_deviceModifiedBy').textContent === '-' ? '' : qs('#spn_deviceModifiedBy').textContent,
            ModifiedOn: qs('#spn_deviceModifiedOn').textContent === '-' ? '' : qs('#spn_deviceModifiedOn').textContent
        };
    }
    function setFormData(row) {
        qs('#txt_deviceBranchId').value = row?.BranchId || '';
        qs('#txt_deviceBranchName').value = row?.BranchName || '';
        qs('#txt_deviceId').value = row?.DeviceId || '';
        qs('#txt_deviceDescription').value = row?.DeviceDescription || '';
        qs('#txt_settlementGlId').value = row?.SettlementGl || '';
        qs('#txt_settlementGlName').value = row?.SettlementGlName || '';
        qs('#txt_receivableDeviceGlId').value = row?.ReceivableGl || '';
        qs('#txt_receivableDeviceGlName').value = row?.ReceivableGlName || '';
        qs('#txt_deviceBankId').value = row?.BankId || '';
        qs('#chk_deviceActive').checked = !!row?.IsActive;
        qs('#chk_deviceLocal').checked = !!row?.IsLocal;
        qs('#spn_deviceCreatedBy').textContent = row?.CreatedBy || '-';
        qs('#spn_deviceCreatedOn').textContent = row?.CreatedOn || '-';
        qs('#spn_deviceModifiedBy').textContent = row?.ModifiedBy || '-';
        qs('#spn_deviceModifiedOn').textContent = row?.ModifiedOn || '-';
    }
    function clearForm(keepBranch) {
        const branchId = qs('#txt_deviceBranchId').value.trim();
        const branchName = qs('#txt_deviceBranchName').value.trim();
        setFormData({
            BranchId: keepBranch ? branchId : '',
            BranchName: keepBranch ? branchName : '',
            DeviceId: '', DeviceDescription: '', SettlementGl: '', SettlementGlName: '', ReceivableGl: '', ReceivableGlName: '', BankId: '', IsActive: false, IsLocal: false, CreatedBy: '-', CreatedOn: '-', ModifiedBy: '-', ModifiedOn: '-'
        });
    }
    function setMode(mode) {
        state.mode = mode;
        const editable = mode === MODES.EDIT && (state.gridAction === 'new' || state.gridAction === 'alter');
        ['#txt_deviceId', '#txt_deviceDescription', '#txt_settlementGlId', '#txt_receivableDeviceGlId', '#txt_deviceBankId', '#chk_deviceActive', '#chk_deviceLocal'].forEach((sel) => {
            const el = qs(sel);
            if (el) el.disabled = !editable;
        });
        ['#btn_searchSettlementGl', '#btn_searchReceivableDeviceGl'].forEach((sel) => {
            const button = qs(sel);
            if (button) button.disabled = !editable;
        });
        setButtonDisabled(qs('#btn_deviceView'), false);
        setButtonDisabled(qs('#btn_deviceEdit'), !qs('#txt_deviceBranchId').value.trim());
        setButtonDisabled(qs('#btn_deviceSave'), state.mode !== MODES.EDIT || !state.rows.length);
        setButtonDisabled(qs('#btn_deviceCancel'), false);
        setButtonDisabled(qs('#btn_deviceBack'), false);
        setButtonDisabled(qs('#btn_deviceNew'), state.mode !== MODES.EDIT);
        setButtonDisabled(qs('#btn_deviceAlter'), state.mode !== MODES.EDIT || state.selectedIndex < 0);
        setButtonDisabled(qs('#btn_deviceRemove'), state.mode !== MODES.EDIT || state.selectedIndex < 0);
        setButtonDisabled(qs('#btn_deviceUpdate'), !(state.mode === MODES.EDIT && (state.gridAction === 'new' || state.gridAction === 'alter')));
        setButtonDisabled(qs('#btn_deviceClear'), state.mode !== MODES.EDIT);
    }
    function renderRows() {
        const tbody = qs('#tbl_deviceRows');
        if (!tbody) return;
        if (!state.rows.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3 text-muted">No records to display.</td></tr>';
            return;
        }
        tbody.innerHTML = state.rows.map((row, index) => `
            <tr data-index="${index}" class="${index === state.selectedIndex ? 'table-active' : ''}">
                <td>${row.DeviceId || ''}</td>
                <td>${row.BranchId || ''}</td>
                <td>${row.SettlementGl || ''}</td>
                <td>${row.ReceivableGl || ''}</td>
                <td>${row.IsActive ? 'Yes' : 'No'}</td>
                <td>${row.DeviceDescription || ''}</td>
            </tr>`).join('');
        qsa('tr[data-index]', tbody).forEach((rowEl) => {
            rowEl.addEventListener('click', () => {
                state.selectedIndex = Number(rowEl.dataset.index);
                setFormData(state.rows[state.selectedIndex]);
                renderRows();
                setMode(state.mode);
            });
        });
    }
    async function loadRows() {
        const branchId = qs('#txt_deviceBranchId').value.trim();
        if (!branchId) {
            setToast('Enter or select a Branch ID first.', 'warning');
            return;
        }
        try {
            const response = await deviceManagerService.getDevice({ BranchID: branchId, DeviceID: '', GLAccountID: '' });
            const list = (response?.data?.Details || response?.Details || response?.data || []).filter?.(Boolean) || [];
            state.rows = list.map((row) => ({
                DeviceId: row.DeviceID || row.DeviceId || '',
                BranchId: row.OurBranchID || row.BranchID || branchId,
                BranchName: qs('#txt_deviceBranchName').value.trim(),
                SettlementGl: row.GLAccountID || row.SettlementGL || row.SettlementGl || '',
                SettlementGlName: row.GLAccountName || row.SettlementGLName || row.SettlementGlName || '',
                ReceivableGl: row.ReceivableGLID || row.ReceivableGL || row.ReceivableGl || '',
                ReceivableGlName: row.ReceivableGLName || row.ReceivableGlName || '',
                BankId: row.BankID || row.BankId || '',
                IsActive: row.IsActive === 1 || row.IsActive === true || row.IsActive === 'true',
                IsLocal: row.IsLocal === 1 || row.IsLocal === true || row.IsLocal === 'true',
                DeviceDescription: row.Description || row.DeviceDescription || '',
                CreatedBy: row.CreatedBy || '',
                CreatedOn: row.CreatedOn || '',
                ModifiedBy: row.ModifiedBy || '',
                ModifiedOn: row.ModifiedOn || ''
            }));
            state.selectedIndex = state.rows.length ? 0 : -1;
            if (state.selectedIndex >= 0) setFormData(state.rows[state.selectedIndex]);
            else clearForm(true);
            renderRows();
            state.gridAction = null;
            setMode(MODES.VIEW);
            setInlineAlert('');
            setToast(`Loaded ${state.rows.length} device(s).`, 'success');
        } catch (error) {
            setInlineAlert('Device lookup failed.');
            setToast('Device lookup failed.', 'danger');
        }
    }
    function buildGridXml() {
        const operatorId = window.AuthService?.getSession?.()?.operatorId || 'SYSTEM';
        const isoDate = new Date().toLocaleString('en-US');
        let xml = '<NewDataSet>';
        state.rows.forEach((row) => {
            xml += '<dt_DeviceManager>';
            xml += `<DeviceID>${row.DeviceId || ''}</DeviceID>`;
            xml += `<BranchID>${row.BranchId || ''}</BranchID>`;
            xml += `<BranchName>${row.BranchName || ''}</BranchName>`;
            xml += `<BankID>${row.BankId || '00'}</BankID>`;
            xml += `<GLAccountID>${row.SettlementGl || ''}</GLAccountID>`;
            xml += `<GLAccountName>${row.SettlementGlName || ''}</GLAccountName>`;
            xml += `<IsActive>${row.IsActive ? 'true' : 'false'}</IsActive>`;
            xml += `<IsLocal>${row.IsLocal ? 'true' : 'false'}</IsLocal>`;
            xml += `<Description>${row.DeviceDescription || ''}</Description>`;
            xml += `<CreatedBy>${row.CreatedBy || operatorId}</CreatedBy>`;
            xml += `<CreatedOn>${row.CreatedOn || isoDate}</CreatedOn>`;
            xml += `<ModifiedBy>${operatorId}</ModifiedBy>`;
            xml += `<ModifiedOn>${isoDate}</ModifiedOn>`;
            xml += `<ReceivableGLID>${row.ReceivableGl || ''}</ReceivableGLID>`;
            xml += `<ReceivableGLName>${row.ReceivableGlName || ''}</ReceivableGLName>`;
            xml += '<DS_DeviceManager_Id>0</DS_DeviceManager_Id>';
            xml += '</dt_DeviceManager>';
        });
        xml += '</NewDataSet>';
        return xml;
    }
    async function saveRows() {
        const branchId = qs('#txt_deviceBranchId').value.trim();
        if (!branchId || !state.rows.length) {
            setToast('Load or add at least one device first.', 'warning');
            return;
        }
        const operatorId = window.AuthService?.getSession?.()?.operatorId || 'SYSTEM';
        try {
            const response = await deviceManagerService.addEditDevice({ OurBranchID: branchId, ATMDevices: buildGridXml(), OperatorID: operatorId });
            if (!response?.success) {
                setToast(response?.message || 'Save failed.', 'danger');
                return;
            }
            state.gridAction = null;
            setMode(MODES.VIEW);
            await loadRows();
            setToast('Devices saved.', 'success');
        } catch (error) {
            setToast('Save failed.', 'danger');
        }
    }
    async function deleteSelected() {
        const row = state.rows[state.selectedIndex];
        if (!row) {
            setToast('Select a device first.', 'warning');
            return;
        }
        if (!window.confirm(`Delete Device '${row.DeviceId}' from branch '${row.BranchId}'?`)) return;
        try {
            const response = await deviceManagerService.deleteDevice({ BranchID: row.BranchId, DeviceID: row.DeviceId });
            if (!response?.success) {
                setToast(response?.message || 'Delete failed.', 'danger');
                return;
            }
            await loadRows();
            setToast('Device deleted.', 'success');
        } catch (error) {
            setToast('Delete failed.', 'danger');
        }
    }
    function openBranchLookup() {
        initSearchModal();
        if (!searchModal) return;
        searchModal.open({
            title: 'Find Branch',
            tableID: 'BranchID',
            searchFields: [{ name: 'branchId', label: 'Branch ID', column: 'OurBranchID' }, { name: 'branchName', label: 'Branch Name', column: 'BranchName' }],
            displayFields: [{ key: 'OurBranchID', label: 'Branch ID' }, { key: 'BranchName', label: 'Branch Name' }],
            onSelect: (row) => {
                qs('#txt_deviceBranchId').value = row.OurBranchID || row.BranchID || '';
                qs('#txt_deviceBranchName').value = row.BranchName || row.Description || '';
                state.rows = [];
                state.selectedIndex = -1;
                renderRows();
                clearForm(true);
                setMode(state.mode);
            }
        });
    }
    function openGlLookup(target) {
        initSearchModal();
        if (!searchModal) return;
        searchModal.open({
            title: 'Find GL Account',
            tableID: 'RecGLAccountID',
            searchFields: [{ name: 'accountId', label: 'Account ID', column: 'AccountID' }, { name: 'accountName', label: 'Account Name', column: 'GLName' }],
            displayFields: [{ key: 'AccountID', label: 'Account ID' }, { key: 'GLName', label: 'Name' }, { key: 'CurrencyID', label: 'Currency' }],
            onSelect: (row) => {
                if (target === 'settlement') {
                    qs('#txt_settlementGlId').value = row.AccountID || row.GLAccountID || '';
                    qs('#txt_settlementGlName').value = row.GLName || row.AccountName || '';
                } else {
                    qs('#txt_receivableDeviceGlId').value = row.AccountID || row.GLAccountID || '';
                    qs('#txt_receivableDeviceGlName').value = row.GLName || row.AccountName || '';
                }
            }
        });
    }
    function bindEvents() {
        qs('#btn_searchDeviceBranch')?.addEventListener('click', openBranchLookup);
        qs('#btn_searchSettlementGl')?.addEventListener('click', () => openGlLookup('settlement'));
        qs('#btn_searchReceivableDeviceGl')?.addEventListener('click', () => openGlLookup('receivable'));
        qs('#btn_deviceView')?.addEventListener('click', () => void loadRows());
        qs('#btn_deviceEdit')?.addEventListener('click', () => {
            if (!qs('#txt_deviceBranchId').value.trim()) {
                setToast('Select a branch first.', 'warning');
                return;
            }
            state.gridAction = null;
            setMode(MODES.EDIT);
            setToast('Edit mode. Use the grid actions to manage rows.', 'info');
        });
        qs('#btn_deviceSave')?.addEventListener('click', () => void saveRows());
        qs('#btn_deviceCancel')?.addEventListener('click', () => {
            state.gridAction = null;
            if (state.selectedIndex >= 0) setFormData(state.rows[state.selectedIndex]);
            else clearForm(true);
            setMode(MODES.VIEW);
            setToast('Changes cancelled.', 'info');
        });
        qs('#btn_deviceBack')?.addEventListener('click', () => {
            state.rows = [];
            state.selectedIndex = -1;
            state.gridAction = null;
            clearForm(false);
            renderRows();
            setMode(MODES.VIEW);
        });
        qs('#btn_deviceNew')?.addEventListener('click', () => {
            state.gridAction = 'new';
            clearForm(true);
            setMode(MODES.EDIT);
            setToast('New row mode.', 'info');
        });
        qs('#btn_deviceAlter')?.addEventListener('click', () => {
            if (state.selectedIndex < 0) {
                setToast('Select a device row first.', 'warning');
                return;
            }
            state.gridAction = 'alter';
            setMode(MODES.EDIT);
            setToast('Alter row mode.', 'info');
        });
        qs('#btn_deviceRemove')?.addEventListener('click', () => void deleteSelected());
        qs('#btn_deviceClear')?.addEventListener('click', () => clearForm(true));
        qs('#btn_deviceUpdate')?.addEventListener('click', () => {
            if (!(state.gridAction === 'new' || state.gridAction === 'alter')) return;
            const row = getFormData();
            if (!row.BranchId || !row.DeviceId) {
                setToast('Branch ID and Device ID are required.', 'warning');
                return;
            }
            if (state.gridAction === 'new') {
                state.rows.push(row);
                state.selectedIndex = state.rows.length - 1;
            } else if (state.selectedIndex >= 0) {
                state.rows[state.selectedIndex] = row;
            }
            state.gridAction = null;
            setFormData(row);
            renderRows();
            setMode(MODES.EDIT);
            setToast('Grid row updated.', 'success');
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        addBodyClass();
        initSectionToggles();
        initSearchModal();
        bindEvents();
        renderRows();
        setMode(MODES.VIEW);
    });
})();