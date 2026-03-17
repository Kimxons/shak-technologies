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
    function escapeSql(value) {
        return String(value || '').replace(/'/g, "''");
    }
    function escapeXml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
    function formatXmlDate(value = new Date()) {
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const pad = (num, size = 2) => String(num).padStart(size, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());
        const millis = pad(date.getMilliseconds(), 3);
        const offsetMinutes = -date.getTimezoneOffset();
        const offsetSign = offsetMinutes >= 0 ? '+' : '-';
        const absOffsetMinutes = Math.abs(offsetMinutes);
        const offsetHours = pad(Math.floor(absOffsetMinutes / 60));
        const offsetMins = pad(absOffsetMinutes % 60);
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${millis}${offsetSign}${offsetHours}:${offsetMins}`;
    }
    function getCurrentBranchId() {
        const session = window.AuthService?.getSession?.() || {};
        const fromSession =
            session.branchID || session.BranchID || session.OurBranchID || session.branchId || session.ourBranchId;
        const fromForm = qs('#txt_deviceBranchId')?.value?.trim?.() || '';
        const fromEnvironmentDefault = window.Environment?.defaultOurBranchId || window.Environment?.DefaultOurBranchId;
        const fromEnvironment = window.Environment?.BranchID || window.Environment?.branchID || window.Environment?.OurBranchID;
        const fromSelectedRow = state.selectedIndex >= 0 ? (state.rows[state.selectedIndex]?.BranchId || '') : '';
        return String(fromSession || fromForm || fromSelectedRow || fromEnvironmentDefault || fromEnvironment || '').trim();
    }
    function getSessionContext() {
        const session = window.AuthService?.getSession?.() || {};
        const branchId = getCurrentBranchId();
        const operatorId = String(
            session.operatorID || session.OperatorID || session.operatorId || session.OperatorId || window.Environment?.OperatorID || 'SYSTEM'
        ).trim() || 'SYSTEM';
        return { branchId, operatorId };
    }
    function getFormData() {
        const selectedRow = state.selectedIndex >= 0 ? state.rows[state.selectedIndex] : null;
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
            ModifiedOn: qs('#spn_deviceModifiedOn').textContent === '-' ? '' : qs('#spn_deviceModifiedOn').textContent,
            SupervisedBy: selectedRow?.SupervisedBy || '',
            SupervisedOn: selectedRow?.SupervisedOn || ''
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
    function clearForm() {
        setFormData({
            BranchId: '', BranchName: '',
            DeviceId: '', DeviceDescription: '', SettlementGl: '', SettlementGlName: '', ReceivableGl: '', ReceivableGlName: '', BankId: '', IsActive: false, IsLocal: false, CreatedBy: '-', CreatedOn: '-', ModifiedBy: '-', ModifiedOn: '-', SupervisedBy: '', SupervisedOn: ''
        });
    }
    function setMode(mode) {
        state.mode = mode;
        const isView = mode === MODES.VIEW;
        const isEdit = mode === MODES.EDIT && !state.gridAction;
        const isRowAction = mode === MODES.EDIT && (state.gridAction === 'new' || state.gridAction === 'alter');

        // Form fields editable only when entering a new row or altering an existing one
        ['#txt_deviceBranchId', '#txt_deviceId', '#txt_deviceDescription', '#txt_settlementGlId', '#txt_receivableDeviceGlId', '#txt_deviceBankId', '#chk_deviceActive', '#chk_deviceLocal'].forEach((sel) => {
            const el = qs(sel);
            if (el) el.disabled = !isRowAction;
        });
        ['#btn_searchDeviceBranch', '#btn_searchSettlementGl', '#btn_searchReceivableDeviceGl'].forEach((sel) => {
            const button = qs(sel);
            if (button) button.disabled = !isRowAction;
        });

        // Side panel — VIEW: Edit+Cancel+Back; EDIT: Save+Cancel; NEW/ALTER: Cancel only
        setButtonDisabled(qs('#btn_deviceView'), true);
        setButtonDisabled(qs('#btn_deviceAdd'), !isView && !isEdit);
        setButtonDisabled(qs('#btn_deviceEdit'), !isView);
        setButtonDisabled(qs('#btn_deviceSave'), !isEdit || !state.rows.length);
        setButtonDisabled(qs('#btn_deviceCancel'), false);
        setButtonDisabled(qs('#btn_deviceBack'), !isView);

        // Grid toolbar — EDIT: New+Alter+Remove; NEW/ALTER: Update+Clear
        setButtonDisabled(qs('#btn_deviceNew'), !isEdit);
        setButtonDisabled(qs('#btn_deviceAlter'), !isEdit || state.selectedIndex < 0);
        setButtonDisabled(qs('#btn_deviceRemove'), !isEdit || state.selectedIndex < 0);
        setButtonDisabled(qs('#btn_deviceUpdate'), !isRowAction);
        setButtonDisabled(qs('#btn_deviceClear'), !isRowAction);
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
        const { branchId } = getSessionContext();
        try {
            window.__deviceManagerAllowGetDevice = true;
            const response = await deviceManagerService.getDevice({ DeviceID: '', BranchID: branchId, GLAccountID: '' });
            const list = Array.isArray(response?.data?.Details01)
                ? response.data.Details01.filter(Boolean)
                : Array.isArray(response?.Details01)
                    ? response.Details01.filter(Boolean)
                    : Array.isArray(response?.Details)
                        ? response.Details.filter(Boolean)
                        : [];
            state.rows = list.map((row) => ({
                DeviceId: row.DeviceID || row.DeviceId || '',
                BranchId: row.BranchID || row.BranchId || row.OurBranchID || branchId,
                BranchName: row.BranchName || '',
                SettlementGl: row.GLAccountID || '',
                SettlementGlName: row.GLAccountName || '',
                ReceivableGl: row.ReceivableGLID || '',
                ReceivableGlName: row.ReceivableGLName || '',
                BankId: row.BankID || row.BankId || '',
                IsActive: row.IsActive === 1 || row.IsActive === true || row.IsActive === 'true',
                IsLocal: row.IsLocal === 1 || row.IsLocal === true || row.IsLocal === 'true',
                DeviceDescription: row.Description || '',
                CreatedBy: row.CreatedBy || '',
                CreatedOn: row.CreatedOn || '',
                ModifiedBy: row.ModifiedBy || '',
                ModifiedOn: row.ModifiedOn || '',
                SupervisedBy: row.SupervisedBy || '',
                SupervisedOn: row.SupervisedOn || ''
            }));
            state.selectedIndex = state.rows.length ? 0 : -1;
            if (state.selectedIndex >= 0) setFormData(state.rows[state.selectedIndex]);
            else clearForm();
            if (state.selectedIndex >= 0 && !qs('#txt_deviceBranchId').value.trim()) {
                qs('#txt_deviceBranchId').value = state.rows[state.selectedIndex]?.BranchId || branchId || '';
            }
            renderRows();
            state.gridAction = null;
            setMode(MODES.VIEW);
            setInlineAlert('');
            if (state.rows.length) setToast(`Loaded ${state.rows.length} device(s).`, 'success');
        } catch (error) {
            setInlineAlert('Device lookup failed.');
            setToast('Device lookup failed.', 'danger');
        } finally {
            window.__deviceManagerAllowGetDevice = false;
        }
    }
    function getRowForSave() {
        if (state.selectedIndex >= 0 && state.rows[state.selectedIndex]) {
            return state.rows[state.selectedIndex];
        }
        return getFormData();
    }
    function buildGridXml() {
        const { operatorId } = getSessionContext();
        const nowStamp = formatXmlDate();
        const row = getRowForSave();
        let xml = '<dt_DeviceManager>';
        xml += `<DeviceID>${escapeXml(row.DeviceId)}</DeviceID>`;
        xml += `<BranchID>${escapeXml(row.BranchId)}</BranchID>`;
        xml += `<BranchName>${escapeXml(row.BranchName)}</BranchName>`;
        xml += `<BankID>${escapeXml(row.BankId || '00')}</BankID>`;
        xml += `<GLAccountID>${escapeXml(row.SettlementGl)}</GLAccountID>`;
        xml += `<GLAccountName>${escapeXml(row.SettlementGlName)}</GLAccountName>`;
        xml += `<IsActive>${row.IsActive ? 'true' : 'false'}</IsActive>`;
        xml += `<IsLocal>${row.IsLocal ? 'true' : 'false'}</IsLocal>`;
        xml += `<Description>${escapeXml(row.DeviceDescription)}</Description>`;
        xml += `<CreatedBy>${escapeXml(row.CreatedBy || operatorId)}</CreatedBy>`;
        xml += `<CreatedOn>${escapeXml(row.CreatedOn || nowStamp)}</CreatedOn>`;
        xml += `<SupervisedBy>${escapeXml(row.SupervisedBy || operatorId)}</SupervisedBy>`;
        xml += `<SupervisedOn>${escapeXml(row.SupervisedOn || row.CreatedOn || nowStamp)}</SupervisedOn>`;
        xml += `<ModifiedBy>${escapeXml(operatorId)}</ModifiedBy>`;
        xml += `<ModifiedOn>${escapeXml(nowStamp)}</ModifiedOn>`;
        xml += `<ReceivableGLID>${escapeXml(row.ReceivableGl)}</ReceivableGLID>`;
        xml += `<ReceivableGLName>${escapeXml(row.ReceivableGlName)}</ReceivableGLName>`;
        xml += '</dt_DeviceManager>';
        return xml;
    }
    async function saveRows() {
        if (!state.rows.length) {
            setToast('No devices to save.', 'warning');
            return;
        }
        const { branchId: sessionBranchId, operatorId } = getSessionContext();
        const rowForSave = getRowForSave();
        const expectedDeviceIds = [rowForSave?.DeviceId].filter(Boolean);
        const branchId = sessionBranchId
            || qs('#txt_deviceBranchId').value.trim()
            || state.rows[state.selectedIndex >= 0 ? state.selectedIndex : 0]?.BranchId || '';
        if (!branchId) {
            setToast('Branch ID is required.', 'warning');
            return;
        }
        try {
            const response = await deviceManagerService.addEditDevice({ OurBranchID: branchId, ATMDevices: buildGridXml(), OperatorID: operatorId });
            if (!response?.success) {
                setToast(response?.message || 'Save failed.', 'danger');
                return;
            }
            await loadRows();
            const persisted = expectedDeviceIds.every((deviceId) => state.rows.some((row) => row.DeviceId === deviceId));
            if (!persisted) {
                setToast('Save request completed, but the device was not persisted by the database.', 'danger');
                return;
            }
            setToast('Devices saved.', 'success');
        } catch (error) {
            setToast('Save failed.', 'danger');
        }
    }
    function deleteSelected() {
        if (state.selectedIndex < 0) {
            setToast('Select a device row first.', 'warning');
            return;
        }
        const row = state.rows[state.selectedIndex];
        if (!row) return;
        if (!window.confirm(`Remove Device '${row.DeviceId}' from the list?`)) return;
        state.rows.splice(state.selectedIndex, 1);
        state.selectedIndex = state.rows.length > 0 ? Math.min(state.selectedIndex, state.rows.length - 1) : -1;
        if (state.selectedIndex >= 0) setFormData(state.rows[state.selectedIndex]);
        else clearForm();
        renderRows();
        setMode(MODES.EDIT);
        setToast('Device removed. Click Save to persist changes.', 'success');
    }
    function getGlId(row) {
        return row?.AccountID || row?.GLAccountID || row?.GeneralLedgerID || row?.GLID || '';
    }
    function getGlName(row) {
        return row?.GLName || row?.AccountName || row?.Description || row?.GLAccountName || '';
    }
    function openBranchLookup() {
        initSearchModal();
        if (!searchModal) {
            setToast('Branch search is not available right now.', 'danger');
            return;
        }
        searchModal.open({
            title: 'Find Branch',
            tableID: 'BranchID',
            searchFields: [{ name: 'branchId', label: 'Branch ID', column: 'OurBranchID' }, { name: 'branchName', label: 'Branch Name', column: 'BranchName' }],
            displayFields: [{ key: 'OurBranchID', label: 'Branch ID' }, { key: 'BranchName', label: 'Branch Name' }],
            onSelect: (row) => {
                qs('#txt_deviceBranchId').value = row.OurBranchID || row.BranchID || '';
                qs('#txt_deviceBranchName').value = row.BranchName || row.Description || '';
            }
        });
    }
    function openGlLookup(target) {
        initSearchModal();
        if (!searchModal) {
            setToast('GL search is not available right now.', 'danger');
            return;
        }
        const branchId = getCurrentBranchId();
        if (!branchId) {
            setToast('Branch ID is required for GL search. Select or enter branch first.', 'warning');
            return;
        }
        const advFilter = `GLAccountTypeID IN ('L','A') AND OurBranchID = '${escapeSql(branchId)}'`;
        searchModal.open({
            title: 'Find GL Account',
            tableID: 'GLBranchID',
            whereStmt: '',
            advFilterString: advFilter,
            moduleID: 3082,
            ourbranchId: branchId,
            searchFields: [{ name: 'accountId', label: 'Account ID', column: 'AccountID' }, { name: 'accountName', label: 'Account Name', column: 'GLName' }],
            displayFields: [{ key: 'AccountID', label: 'Account ID' }, { key: 'GLName', label: 'Name' }, { key: 'CurrencyID', label: 'Currency' }],
            onSelect: (row) => {
                const glId = getGlId(row);
                const glName = getGlName(row);
                if (target === 'settlement') {
                    qs('#txt_settlementGlId').value = glId;
                    qs('#txt_settlementGlName').value = glName;
                } else if (target === 'receivable') {
                    qs('#txt_receivableDeviceGlId').value = glId;
                    qs('#txt_receivableDeviceGlName').value = glName;
                }
            }
        });
    }
    function bindEvents() {
        const beginAddMode = () => {
            state.gridAction = 'new';
            clearForm();
            setMode(MODES.EDIT);
            setToast('Add device mode. Fill in the details and click Update.', 'info');
        };

        qs('#btn_searchDeviceBranch')?.addEventListener('click', openBranchLookup);
        qs('#btn_searchSettlementGl')?.addEventListener('click', () => openGlLookup('settlement'));
        qs('#btn_searchReceivableDeviceGl')?.addEventListener('click', () => openGlLookup('receivable'));

        // View is always disabled in the side panel — kept for synthetic-click safety only
        qs('#btn_deviceView')?.addEventListener('click', (event) => {
            if (event && event.isTrusted === false) return;
            void loadRows();
        });

        qs('#btn_deviceEdit')?.addEventListener('click', () => {
            state.gridAction = null;
            setMode(MODES.EDIT);
            setToast('Edit mode. Use the grid actions to manage rows.', 'info');
        });

        qs('#btn_deviceAdd')?.addEventListener('click', beginAddMode);

        qs('#btn_deviceSave')?.addEventListener('click', () => void saveRows());

        qs('#btn_deviceCancel')?.addEventListener('click', async () => {
            state.gridAction = null;
            setMode(MODES.VIEW);
            await loadRows();
            setToast('Changes cancelled.', 'info');
        });

        qs('#btn_deviceBack')?.addEventListener('click', () => {
            state.rows = [];
            state.selectedIndex = -1;
            state.gridAction = null;
            clearForm();
            renderRows();
            setMode(MODES.VIEW);
        });

        qs('#btn_deviceNew')?.addEventListener('click', beginAddMode);

        qs('#btn_deviceAlter')?.addEventListener('click', () => {
            if (state.selectedIndex < 0) {
                setToast('Select a device row first.', 'warning');
                return;
            }
            state.gridAction = 'alter';
            setMode(MODES.EDIT);
            setToast('Alter mode. Edit the details and click Update.', 'info');
        });

        qs('#btn_deviceRemove')?.addEventListener('click', () => deleteSelected());

        qs('#btn_deviceClear')?.addEventListener('click', () => clearForm());

        qs('#btn_deviceUpdate')?.addEventListener('click', () => {
            if (!(state.gridAction === 'new' || state.gridAction === 'alter')) return;
            const row = getFormData();
            const { branchId, operatorId } = getSessionContext();
            row.BranchId = row.BranchId || branchId;
            row.CreatedBy = row.CreatedBy || operatorId;
            row.ModifiedBy = operatorId;
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
            setToast('Row updated. Click Save to persist all changes.', 'success');
        });
    }

    function initializePage() {
        addBodyClass();
        initSectionToggles();
        initSearchModal();
        bindEvents();
        renderRows();
        setMode(MODES.VIEW);
        void loadRows();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePage);
    } else {
        initializePage();
    }
})();