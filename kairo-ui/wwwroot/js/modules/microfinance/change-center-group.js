/**
 * Change Center/Group Module
 * Handles center and group search, client selection, and group transfer operations
 * Converted from legacy HTML/JS to KAIRO MVC pattern
 */

(function () {
    'use strict';

    const DEFAULT_SEARCH_MODULE_ID = String(window.Environment?.defaultSearchModuleId || window.Environment?.microfinanceModuleId || '5060');

    function getAppCore() {
        const win = window;
        return win.AppCore || (win.parent && win.parent !== win && win.parent.AppCore) || (win.top && win.top !== win && win.top.AppCore) || null;
    }

    // =========================================================================
    // Service Invoker - ALL API calls use POST via AppCore.invokeControllerAsync
    // =========================================================================
    async function invokeChangeCenterGroupController(action, requestData) {
        const appCore = getAppCore();
        if (!appCore || typeof appCore.invokeControllerAsync !== 'function') {
            throw new Error('AppCore is not available (AppCore.invokeControllerAsync not found)');
        }

        const endpoint = `MicroFinance/ChangeCenterGroup/${action}`;
        return appCore.invokeControllerAsync(endpoint, requestData || {});
    }

    // =========================================================================
    // State Management
    // =========================================================================
    let selectedClients = [];
    let clientsData = [];
    let isNextStepActive = false;

    // =========================================================================
    // Environment Helper
    // =========================================================================
    function getEnv() {
        const e = window.Environment || {};
        const bankID = e.defaultBankId || e.defaultBankID || e.bankID || e.bankId ||
                       sessionStorage.getItem('BankID') || localStorage.getItem('BankID') || '00';
        const ourBranchID = e.OurBranchID || e.branchID || e.branchId ||
                            sessionStorage.getItem('BranchID') || localStorage.getItem('BranchID') || '0603';
        const operatorID = e.operatorID || e.operatorId ||
                           sessionStorage.getItem('OperatorID') || localStorage.getItem('OperatorID') || 'CSADM';
        return { bankID, ourBranchID, operatorID };
    }

    // =========================================================================
    // DOM Helpers
    // =========================================================================
    function $(id) { return document.getElementById(id); }

    function coerceString(v) {
        return (v === undefined || v === null) ? '' : String(v);
    }

    // =========================================================================
    // Toast Notifications
    // =========================================================================
    function ensureToastContainer() {
        let el = document.querySelector('[data-kairo-toast-container]');
        if (!el) el = $('toastContainer');
        if (el) return el;

        el = document.createElement('div');
        el.className = 'kairo-toast-container';
        el.setAttribute('data-kairo-toast-container', '');
        el.setAttribute('aria-live', 'polite');
        el.setAttribute('aria-relevant', 'additions');
        document.body.appendChild(el);
        return el;
    }

    function showToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
        const container = ensureToastContainer();
        container.querySelectorAll('.kairo-toast').forEach(t => t.remove());

        const toast = document.createElement('div');
        toast.className = `kairo-toast kairo-toast--${variant}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-atomic', 'true');

        const body = document.createElement('div');
        body.className = 'kairo-toast__body';
        body.textContent = String(message || '');

        toast.appendChild(body);
        container.appendChild(toast);

        const remove = () => {
            try {
                toast.classList.remove('is-show');
                setTimeout(() => toast.remove(), 160);
            } catch { /* ignore */ }
        };

        setTimeout(() => toast.classList.add('is-show'), 0);
        if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
    }

    function showSuccess(msg) { showToast(msg, { variant: 'success' }); }
    function showError(msg) { showToast(msg, { variant: 'danger' }); }
    function showWarning(msg) { showToast(msg, { variant: 'warning' }); }
    function showInfo(msg) { showToast(msg, { variant: 'info' }); }

    // =========================================================================
    // Status Bar
    // =========================================================================
    function showStatus(message, type) {
        const el = $('statusMsg');
        if (!el) return;
        const textEl = el.querySelector('.status-text');
        if (textEl) textEl.textContent = message;
        el.classList.remove('hidden', 'success', 'error', 'warning', 'info');
        el.classList.add(type || 'info');
        clearTimeout(showStatus._t);
        showStatus._t = setTimeout(() => el.classList.add('hidden'), 4000);
    }

    // =========================================================================
    // Search Dialog Management (SearchModal pattern)
    // =========================================================================
    const searchDialogConfig = {
        'center': {
            title: 'Center Search',
            targetId: 'CenterId',
            targetName: 'CenterName',
            tableID: 'GroupID',
            moduleIDOverride: 5060,
            getAdvFilterString: () => {
                const { ourBranchID } = getEnv();
                const safeBranchId = String(ourBranchID || '').replace(/'/g, "''");
                return safeBranchId ? `OurBranchID='${safeBranchId}' AND GroupStatusID='A'` : "GroupStatusID='A'";
            },
            searchFields: [
                { name: 'centerId', label: 'Center ID', column: 'GroupID' },
                { name: 'centerName', label: 'Center Name', column: 'GroupName' }
            ],
            displayFields: [
                { key: 'GroupID', label: 'Center ID' },
                { key: 'GroupName', label: 'Center Name' }
            ]
        },
        'group': {
            title: 'Group Search',
            targetId: 'GroupId',
            targetName: 'GroupName',
            tableID: 'SubGroupID',
            moduleIDOverride: 5060,
            getAdvFilterString: () => {
                const { ourBranchID } = getEnv();
                const centerId = $('CenterId')?.value?.trim() || '';
                const safeBranchId = String(ourBranchID || '').replace(/'/g, "''");
                const safeCenterId = String(centerId).replace(/'/g, "''");
                const parts = [];
                if (safeBranchId) parts.push(`OurBranchID='${safeBranchId}'`);
                if (safeCenterId) parts.push(`GroupID='${safeCenterId}'`);
                return parts.join(' AND ');
            },
            searchFields: [
                { name: 'groupId', label: 'Group ID', column: 'SubGroupID' },
                { name: 'groupName', label: 'Group Name', column: 'SubGroupName' }
            ],
            displayFields: [
                { key: 'SubGroupID', label: 'Group ID' },
                { key: 'SubGroupName', label: 'Group Name' }
            ]
        },
        'newCenter': {
            title: 'Select New Center',
            targetId: 'NewCenterId',
            targetName: 'NewCenterName',
            tableID: 'GroupID',
            moduleIDOverride: 5060,
            getAdvFilterString: () => {
                const { ourBranchID } = getEnv();
                const safeBranchId = String(ourBranchID || '').replace(/'/g, "''");
                return safeBranchId ? `OurBranchID='${safeBranchId}' AND GroupStatusID='A'` : "GroupStatusID='A'";
            },
            searchFields: [
                { name: 'centerId', label: 'Center ID', column: 'GroupID' },
                { name: 'centerName', label: 'Center Name', column: 'GroupName' }
            ],
            displayFields: [
                { key: 'GroupID', label: 'Center ID' },
                { key: 'GroupName', label: 'Center Name' }
            ]
        },
        'newGroup': {
            title: 'Select New Group',
            targetId: 'NewGroupId',
            targetName: 'NewGroupName',
            tableID: 'SubGroupID',
            moduleIDOverride: 5060,
            getAdvFilterString: () => {
                const { ourBranchID } = getEnv();
                const newCenterId = $('NewCenterId')?.value?.trim() || '';
                const safeBranchId = String(ourBranchID || '').replace(/'/g, "''");
                const safeNewCenterId = String(newCenterId).replace(/'/g, "''");
                const parts = [];
                if (safeBranchId) parts.push(`OurBranchID='${safeBranchId}'`);
                if (safeNewCenterId) parts.push(`GroupID='${safeNewCenterId}'`);
                return parts.join(' AND ');
            },
            searchFields: [
                { name: 'groupId', label: 'Group ID', column: 'SubGroupID' },
                { name: 'groupName', label: 'Group Name', column: 'SubGroupName' }
            ],
            displayFields: [
                { key: 'SubGroupID', label: 'Group ID' },
                { key: 'SubGroupName', label: 'Group Name' }
            ]
        }
    };

    function ensureSharedSearchModal() {
        const appCore = getAppCore();
        if (!appCore) {
            showError('Search dialog unavailable (AppCore missing).');
            return null;
        }
        if (typeof window.SearchModal !== 'function') {
            showError('Search dialog script not loaded.');
            return null;
        }
        return new window.SearchModal(appCore);
    }

    function mapSelectedData(lookupType, data) {
        if (!data) return;
        const config = searchDialogConfig[lookupType];
        if (!config) return;

        const idField = $(config.targetId);
        const nameField = $(config.targetName);

        if (lookupType === 'center') {
            const centerId = data.GroupID || data.CenterID || data.ID || '';
            const centerName = data.GroupName || data.CenterName || data.Description || data.Name || '';
            if (idField) idField.value = centerId;
            if (nameField) nameField.value = centerName;
            // Clear dependent fields
            clearGroupFields();
            clearClientTable();
            showSuccess(`Center '${centerName}' selected`);
        } else if (lookupType === 'group') {
            const groupId = data.SubGroupID || data.GroupID || data.ID || '';
            const groupName = data.SubGroupName || data.GroupName || data.Description || data.Name || '';
            if (idField) idField.value = groupId;
            if (nameField) nameField.value = groupName;
            showSuccess(`Group '${groupName}' selected`);
            // Auto-load members after group selection
            loadGroupMembers();
        } else if (lookupType === 'newCenter') {
            const centerId = data.GroupID || data.CenterID || data.ID || '';
            const centerName = data.GroupName || data.CenterName || data.Description || data.Name || '';
            if (idField) idField.value = centerId;
            if (nameField) nameField.value = centerName;
            // Clear new group when new center changes
            if ($('NewGroupId')) $('NewGroupId').value = '';
            if ($('NewGroupName')) $('NewGroupName').value = '';
            showSuccess(`New Center '${centerName}' selected`);
            updateActionButtons();
        } else if (lookupType === 'newGroup') {
            const groupId = data.SubGroupID || data.GroupID || data.ID || '';
            const groupName = data.SubGroupName || data.GroupName || data.Description || data.Name || '';
            if (idField) idField.value = groupId;
            if (nameField) nameField.value = groupName;
            showSuccess(`New Group '${groupName}' selected`);
            updateActionButtons();
        }
    }

    function openSearchDialog(lookupType) {
        const config = searchDialogConfig[lookupType];
        if (!config) { showWarning(`Unknown lookup type: ${lookupType}`); return; }

        if (lookupType === 'group') {
            if (!$('CenterId')?.value?.trim()) { showWarning('Please select a Center first'); return; }
        }
        if (lookupType === 'newGroup') {
            if (!$('NewCenterId')?.value?.trim()) { showWarning('Please select a New Center first'); return; }
        }

        const modal = ensureSharedSearchModal();
        if (!modal || !config.tableID) {
            showError('Shared search dialog is not available.');
            return;
        }

        const advFilterString = typeof config.getAdvFilterString === 'function'
            ? config.getAdvFilterString() : (config.advFilterString || '');

        const { ourBranchID } = getEnv();

        modal.open({
            title: config.title,
            tableID: config.tableID,
            moduleID: config.moduleIDOverride || Number(DEFAULT_SEARCH_MODULE_ID),
            whereStmt: '',
            advFilterString,
            searchKey: '',
            ourbranchId: ourBranchID,
            onSelect: (record) => mapSelectedData(lookupType, record)
        });
    }

    // =========================================================================
    // Field Helpers
    // =========================================================================
    function clearGroupFields() {
        if ($('GroupId')) $('GroupId').value = '';
        if ($('GroupName')) $('GroupName').value = '';
    }

    // =========================================================================
    // Data Extraction Utilities
    // =========================================================================
    function extractOldApiError(resp) {
        const root = resp?.data ?? resp;
        const status = String(root?.Status ?? root?.status ?? '').trim();
        const message = String(root?.Message ?? root?.message ?? '').trim();
        if (!status) return null;
        if (status === '0' || status === '200') return null;
        return { status, message: message || `Request failed (Status ${status})` };
    }

    // =========================================================================
    // Background Search — uses SearchModal/Search (same endpoint as the search button)
    // =========================================================================
    async function backgroundSearch(tableID, advFilterString, whereStmt, moduleID) {
        const appCore = getAppCore();
        if (!appCore || typeof appCore.invokeControllerAsync !== 'function') {
            throw new Error('AppCore is not available');
        }

        const { ourBranchID } = getEnv();
        const response = await appCore.invokeControllerAsync('SearchModal/Search', {
            TableID: tableID,
            WhereStmt: whereStmt || '',
            AdvFilterString: advFilterString || '',
            SearchKey: '',
            ModuleID: String(moduleID || DEFAULT_SEARCH_MODULE_ID),
            PageSize: 20,
            RefID: '',
            PrevOrNext: 1,
            OurBranchID: ourBranchID
        });

        let results = [];
        if (response?.success && response?.data) {
            const d = response.data;
            if (Array.isArray(d)) {
                results = d;
            } else if (d.Details) {
                results = Array.isArray(d.Details) ? d.Details : [d.Details];
            } else if (d.details?.SearchResults) {
                results = Array.isArray(d.details.SearchResults) ? d.details.SearchResults : [];
            } else if (d.Records) {
                results = Array.isArray(d.Records) ? d.Records : [];
            }
        }
        return results;
    }

    // =========================================================================
    // ID Validation Handlers (via SearchModal/Search)
    // =========================================================================
    async function handleViewCenter() {
        const centerId = ($('CenterId')?.value || '').trim();
        if (!centerId) { showWarning('Please enter a Center ID'); return; }

        try {
            const config = searchDialogConfig['center'];
            const advFilter = config.getAdvFilterString();
            const safeId = String(centerId).replace(/'/g, "''");
            const whereStmt = `GroupID='${safeId}'`;

            const results = await backgroundSearch(config.tableID, advFilter, whereStmt, config.moduleIDOverride);

            if (results.length > 0) {
                mapSelectedData('center', results[0]);
            } else {
                $('CenterName').value = '';
                showWarning('Center not found');
            }
        } catch (error) {
            console.error('[ChangeCenterGroup] Error loading center:', error);
            showError('Error loading center details');
        }
    }

    async function handleViewGroup() {
        const groupId = ($('GroupId')?.value || '').trim();
        if (!groupId) { showWarning('Please enter a Group ID'); return; }

        const centerId = ($('CenterId')?.value || '').trim();
        if (!centerId) { showWarning('Please select a Center first'); return; }

        try {
            const config = searchDialogConfig['group'];
            const advFilter = config.getAdvFilterString();
            const safeId = String(groupId).replace(/'/g, "''");
            const whereStmt = `SubGroupID='${safeId}'`;

            const results = await backgroundSearch(config.tableID, advFilter, whereStmt, config.moduleIDOverride);

            if (results.length > 0) {
                mapSelectedData('group', results[0]);
            } else {
                $('GroupName').value = '';
                showWarning('Group not found');
            }
        } catch (error) {
            console.error('[ChangeCenterGroup] Error loading group:', error);
            showError('Error loading group details');
        }
    }

    async function handleViewNewCenter() {
        const newCenterId = ($('NewCenterId')?.value || '').trim();
        if (!newCenterId) { showWarning('Please enter a New Center ID'); return; }

        try {
            const config = searchDialogConfig['newCenter'];
            const advFilter = config.getAdvFilterString();
            const safeId = String(newCenterId).replace(/'/g, "''");
            const whereStmt = `GroupID='${safeId}'`;

            const results = await backgroundSearch(config.tableID, advFilter, whereStmt, config.moduleIDOverride);

            if (results.length > 0) {
                mapSelectedData('newCenter', results[0]);
            } else {
                $('NewCenterName').value = '';
                showWarning('Center not found');
            }
        } catch (error) {
            console.error('[ChangeCenterGroup] Error loading new center:', error);
            showError('Error loading new center details');
        }
    }

    async function handleViewNewGroup() {
        const newGroupId = ($('NewGroupId')?.value || '').trim();
        if (!newGroupId) { showWarning('Please enter a New Group ID'); return; }

        const newCenterId = ($('NewCenterId')?.value || '').trim();
        if (!newCenterId) { showWarning('Please select a New Center first'); return; }

        try {
            const config = searchDialogConfig['newGroup'];
            const advFilter = config.getAdvFilterString();
            const safeId = String(newGroupId).replace(/'/g, "''");
            const whereStmt = `SubGroupID='${safeId}'`;

            const results = await backgroundSearch(config.tableID, advFilter, whereStmt, config.moduleIDOverride);

            if (results.length > 0) {
                mapSelectedData('newGroup', results[0]);
            } else {
                $('NewGroupName').value = '';
                showWarning('Group not found');
            }
        } catch (error) {
            console.error('[ChangeCenterGroup] Error loading new group:', error);
            showError('Error loading new group details');
        }
    }

    // =========================================================================
    // Client Table Rendering
    // =========================================================================
    function formatDate(dateStr) {
        if (!dateStr) return '';
        if (window.GlobalUtils?.formatDate) {
            return window.GlobalUtils.formatDate(dateStr);
        }
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
            return dateStr;
        }
    }

    function renderClientTable(members) {
        const tbody = $('clientTableBody');
        if (!tbody) return;

        if (!members || members.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No records to display.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        members.forEach((member, index) => {
            const clientId = member.ClientID || member.MemberID || '';
            const clientName = member.ClientName || member.MemberName || member.Name || '';
            const clientType = member.ClientType || member.MemberType || 'Individual';
            const regDate = formatDate(member.RegistrationDate || member.RegDate || '');
            const joinDate = formatDate(member.JoinDate || member.JoiningDate || '');

            const tr = document.createElement('tr');
            tr.setAttribute('data-member-index', String(index));

            // Checkbox cell
            const tdCheck = document.createElement('td');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'form-check-input';
            cb.value = clientId;
            cb.addEventListener('change', handleRowCheckbox);
            tdCheck.appendChild(cb);
            tr.appendChild(tdCheck);

            // Data cells
            [clientId, clientName, clientType, regDate, joinDate].forEach(text => {
                const td = document.createElement('td');
                td.textContent = text;
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });
    }

    function clearClientTable() {
        const tbody = $('clientTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No records to display.</td></tr>';
        }
        const selectAll = $('selectAll');
        if (selectAll) {
            selectAll.disabled = true;
            selectAll.checked = false;
            selectAll.indeterminate = false;
        }
        selectedClients = [];
        clientsData = [];
        updateActionButtons();
    }

    // =========================================================================
    // Checkbox Handling
    // =========================================================================
    function handleRowCheckbox() {
        updateSelectedClients();
        updateActionButtons();

        const allCheckboxes = document.querySelectorAll('#clientTable tbody input[type="checkbox"]');
        const checkedCount = document.querySelectorAll('#clientTable tbody input[type="checkbox"]:checked').length;
        const selectAll = $('selectAll');

        if (checkedCount === 0) {
            selectAll.checked = false;
            selectAll.indeterminate = false;
        } else if (checkedCount === allCheckboxes.length) {
            selectAll.checked = true;
            selectAll.indeterminate = false;
        } else {
            selectAll.checked = false;
            selectAll.indeterminate = true;
        }
    }

    function handleSelectAll() {
        const selectAll = $('selectAll');
        const checkboxes = document.querySelectorAll('#clientTable tbody input[type="checkbox"]');
        checkboxes.forEach(cb => { cb.checked = selectAll.checked; });
        updateSelectedClients();
        updateActionButtons();
    }

    function updateSelectedClients() {
        const checkboxes = document.querySelectorAll('#clientTable tbody input[type="checkbox"]:checked');
        selectedClients = Array.from(checkboxes).map(cb => cb.value);
    }

    // =========================================================================
    // Action Button State Management
    // =========================================================================
    function updateActionButtons() {
        const hasSelection = selectedClients.length > 0;
        const hasNewCenter = ($('NewCenterId')?.value || '').trim() !== '';
        const hasNewGroup = ($('NewGroupId')?.value || '').trim() !== '';

        const selectBtn = $('btnSelect');
        const nextBtn = $('btnNext');
        const changeBtn = $('btnChange');

        if (isNextStepActive) {
            if (selectBtn) selectBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = true;
            if (changeBtn) changeBtn.disabled = !(hasNewCenter && hasNewGroup);
        } else {
            if (selectBtn) selectBtn.disabled = !hasSelection;
            if (nextBtn) nextBtn.disabled = !hasSelection;
            if (changeBtn) changeBtn.disabled = true;
        }
    }

    // =========================================================================
    // Load Group Members via OldAPI
    // =========================================================================
    async function loadGroupMembers() {
        const centerId = ($('CenterId')?.value || '').trim();
        const groupId = ($('GroupId')?.value || '').trim();

        if (!centerId) {
            showWarning('Please select a Center first');
            return;
        }

        const tbody = $('clientTableBody');

        try {
            showInfo('Loading group members...');
            if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading members...</td></tr>';

            const { ourBranchID, operatorID } = getEnv();
            // Use dedicated endpoint (same pattern as center-loan-scheme)
            const result = await invokeChangeCenterGroupController('group-member-list', {
                OurBranchID: ourBranchID,
                GroupID: centerId,
                SubGroupID: groupId || '',
                OperatorID: operatorID,
                ModuleID: 5067
            });

            const apiErr = extractOldApiError(result);
            if (apiErr) {
                showWarning(apiErr.message);
                clearClientTable();
                return;
            }

            // Extract members from response
            const root = result?.data ?? result;
            let members = [];
            const details01 = root?.Details01 ?? root?.details01;
            const details = root?.Details ?? root?.details;

            if (Array.isArray(details01) && details01.length > 0) {
                members = details01;
            } else if (Array.isArray(details) && details.length > 0) {
                members = details;
            }

            clientsData = members;
            renderClientTable(members);

            const selectAll = $('selectAll');
            if (members.length > 0) {
                if (selectAll) selectAll.disabled = false;
                showSuccess(`Loaded ${members.length} member(s)`);
            } else {
                if (selectAll) selectAll.disabled = true;
                if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No members found for this group</td></tr>';
                showInfo('No members found');
            }

            updateActionButtons();

        } catch (e) {
            console.error('[ChangeCenterGroup] Error loading members:', e);
            if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Error loading members</td></tr>';
            showError('Error loading group members');
        }
    }

    // =========================================================================
    // Action Handlers
    // =========================================================================
    async function handleView() {
        const centerId = ($('CenterId')?.value || '').trim();
        if (!centerId) {
            showWarning('Please enter a Center ID');
            $('CenterId')?.focus();
            return;
        }

        // Fetch center details using GroupService.getGroupDetails pattern (p_GetGroupDetails)
        try {
            showInfo('Loading center details...');
            const { ourBranchID, operatorID } = getEnv();
            // Use dedicated endpoint (same pattern as center-loan-scheme)
            const result = await invokeChangeCenterGroupController('group-details', {
                OurBranchID: ourBranchID,
                GroupID: centerId,
                OperatorID: operatorID,
                Direction: 0
            });

            const apiErr = extractOldApiError(result);
            if (apiErr) {
                showWarning(apiErr.message);
                return;
            }

            // GroupService.getGroupDetails returns center data in Details02[0]
            const root = result?.data ?? result;
            const details02 = root?.Details02 ?? root?.details02;
            const center = Array.isArray(details02) && details02.length > 0 ? details02[0] : null;

            if (center && (center.GroupName || center.GroupID)) {
                $('CenterName').value = center.GroupName || '';
                showSuccess(`Center '${center.GroupName}' loaded`);

                // If group is also provided, load members
                const groupId = ($('GroupId')?.value || '').trim();
                if (groupId) {
                    await loadGroupMembers();
                }
            } else {
                showWarning('Center not found');
            }
        } catch (error) {
            console.error('[ChangeCenterGroup] View error:', error);
            showError('Error loading center details');
        }
    }

    function handleSelect() {
        updateSelectedClients();
        if (selectedClients.length === 0) {
            showWarning('Please select at least one client');
            return;
        }
        showSuccess(`${selectedClients.length} client(s) selected`);
    }

    function handleNext() {
        updateSelectedClients();
        if (selectedClients.length === 0) {
            showWarning('Please select at least one client first');
            return;
        }

        const currentCenterId = ($('CenterId')?.value || '').trim();
        const currentCenterName = ($('CenterName')?.value || '').trim();
        if (!currentCenterId) {
            showWarning('Please select a Center first');
            return;
        }

        // Show the New Group section
        const newGroupSection = $('newGroupSection');
        if (newGroupSection) newGroupSection.classList.remove('d-none');

        // Pre-fill with current center
        if ($('NewCenterId')) $('NewCenterId').value = currentCenterId;
        if ($('NewCenterName')) $('NewCenterName').value = currentCenterName;

        // Clear new group fields
        if ($('NewGroupId')) $('NewGroupId').value = '';
        if ($('NewGroupName')) $('NewGroupName').value = '';

        isNextStepActive = true;
        updateActionButtons();

        showInfo(`Select a new Center/Group for ${selectedClients.length} client(s)`);
    }

    async function handleChange() {
        updateSelectedClients();
        if (selectedClients.length === 0) {
            showError('Please select clients first');
            return;
        }

        const newCenterId = ($('NewCenterId')?.value || '').trim();
        const newGroupId = ($('NewGroupId')?.value || '').trim();

        if (!newCenterId || !newGroupId) {
            showError('Please select a new Center and Group');
            return;
        }

        // Confirm the transfer
        const appCore = getAppCore();
        if (appCore && typeof appCore.showConfirmation === 'function') {
            const confirmed = await appCore.showConfirmation(
                'Confirm Transfer',
                `Are you sure you want to transfer ${selectedClients.length} client(s) to Center: ${newCenterId}, Group: ${newGroupId}?`
            );
            if (!confirmed) return;
        } else {
            if (!confirm(`Are you sure you want to transfer ${selectedClients.length} client(s) to Center: ${newCenterId}, Group: ${newGroupId}?`)) return;
        }

        try {
            showInfo('Processing center/group change...');
            const { ourBranchID, operatorID } = getEnv();

            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            for (const clientId of selectedClients) {
                const clientData = clientsData.find(c =>
                    (c.ClientID || c.MemberID) === clientId
                ) || {};

                try {
                    const currentDate = new Date().toISOString();
                    // Use dedicated endpoint (same pattern as center-loan-scheme)
                    const result = await invokeChangeCenterGroupController('change-member-group', {
                        ClientID: clientId,
                        RefID: clientData.RefID || 0,
                        OurBranchID: ourBranchID,
                        GroupID: newCenterId,
                        SubGroupID: newGroupId,
                        RegistrationDate: clientData.RegistrationDate || currentDate,
                        JoinDate: currentDate,
                        GroupMemberTypeID: clientData.GroupMemberTypeID || 'MEMBER',
                        CreatedBy: operatorID,
                        CreatedOn: currentDate,
                        ModifiedBy: operatorID,
                        ModifiedOn: currentDate,
                        SupervisedBy: clientData.SupervisedBy || operatorID,
                        NewRecord: 1
                    });

                    const apiErr = extractOldApiError(result);
                    if (apiErr) {
                        errorCount++;
                        errors.push(`${clientId}: ${apiErr.message}`);
                    } else {
                        successCount++;
                    }
                } catch (clientError) {
                    errorCount++;
                    errors.push(`${clientId}: ${clientError.message || 'Error'}`);
                }
            }

            // Show results
            if (errorCount === 0) {
                showSuccess(`Successfully transferred ${successCount} client(s) to new group`);
                setTimeout(() => handleCancel(), 2000);
            } else if (successCount > 0) {
                showWarning(`Transferred ${successCount} client(s), ${errorCount} failed`);
            } else {
                showError(`Failed to transfer clients: ${errors[0] || 'Unknown error'}`);
            }

        } catch (e) {
            console.error('[ChangeCenterGroup] Change failed:', e);
            showError(e?.message || 'Error processing center/group change');
        }
    }

    function handleCancel() {
        // Reset center/group fields
        ['CenterId', 'CenterName', 'GroupId', 'GroupName'].forEach(id => {
            const el = $(id);
            if (el) el.value = '';
        });

        // Hide and reset new group section
        const newGroupSection = $('newGroupSection');
        if (newGroupSection) newGroupSection.classList.add('d-none');
        ['NewCenterId', 'NewCenterName', 'NewGroupId', 'NewGroupName'].forEach(id => {
            const el = $(id);
            if (el) el.value = '';
        });

        // Reset state
        selectedClients = [];
        clientsData = [];
        isNextStepActive = false;

        clearClientTable();
        updateActionButtons();

        const btnView = $('btnView');
        if (btnView) btnView.disabled = false;

        showInfo('Cancelled');
    }

    // =========================================================================
    // Field Event Helpers
    // =========================================================================
    function setupFieldListeners(fieldId, handler) {
        const field = $(fieldId);
        if (!field) return;

        field.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handler();
            }
        });

        field.addEventListener('blur', () => {
            const value = field.value.trim();
            if (value) handler();
        });
    }

    // =========================================================================
    // Initialization
    // =========================================================================
    function init() {
        // Search button listeners
        document.querySelectorAll('[data-ccg-lookup]').forEach(btn => {
            btn.addEventListener('click', () => {
                const lookupType = btn.getAttribute('data-ccg-lookup');
                openSearchDialog(lookupType);
            });
        });

        // Action button listeners
        document.querySelectorAll('[data-ccg-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-ccg-action');
                switch (action) {
                    case 'view': handleView(); break;
                    case 'select': handleSelect(); break;
                    case 'next': handleNext(); break;
                    case 'change': handleChange(); break;
                    case 'cancel': handleCancel(); break;
                }
            });
        });

        // Select all checkbox
        const selectAll = $('selectAll');
        if (selectAll) selectAll.addEventListener('change', handleSelectAll);

        // Field validation on enter/blur
        setupFieldListeners('CenterId', handleViewCenter);
        setupFieldListeners('GroupId', handleViewGroup);
        setupFieldListeners('NewCenterId', handleViewNewCenter);
        setupFieldListeners('NewGroupId', handleViewNewGroup);

        // Initial state
        updateActionButtons();
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
