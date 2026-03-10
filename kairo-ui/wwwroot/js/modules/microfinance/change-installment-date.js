/**
 * Change Installment Date Module
 * Handles branch, center, and scheme search, installment date changes
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
    async function invokeChangeInstDateController(action, requestData) {
        const appCore = getAppCore();
        if (!appCore || typeof appCore.invokeControllerAsync !== 'function') {
            throw new Error('AppCore is not available (AppCore.invokeControllerAsync not found)');
        }

        const endpoint = `MicroFinance/ChangeInstallmentDate/${action}`;
        return appCore.invokeControllerAsync(endpoint, requestData || {});
    }

    // =========================================================================
    // State Management
    // =========================================================================
    let currentBranch = null;
    let currentCenter = null;
    let currentScheme = null;
    let installmentsData = [];
    let editMode = false;

    const parentContext = {
        branchId: '',
        centerId: '',
        centerName: '',
        schemeId: ''
    };

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
    // Toast Notifications
    // =========================================================================
    function ensureToastContainer() {
        let el = document.querySelector('[data-kairo-toast-container]');
        if (!el) {
            el = document.getElementById('toastContainer');
        }
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
    // Search Dialog Management (SearchModal pattern)
    // =========================================================================
    let sharedSearchModal = null;

    const searchDialogConfig = {
        'branch': {
            title: 'Branch Search',
            targetId: 'BranchId',
            targetName: 'BranchName',
            tableID: 'BranchID',
            moduleIDOverride: Number(DEFAULT_SEARCH_MODULE_ID),
            getAdvFilterString: () => {
                const { bankID } = getEnv();
                const safeBankId = String(bankID || '').replace(/'/g, "''");
                return `BankID ='${safeBankId}'`;
            },
            searchFields: [
                { name: 'branchId', label: 'Branch ID', column: 'OurBranchID' },
                { name: 'branchName', label: 'Branch Name', column: 'BranchName' }
            ],
            displayFields: [
                { key: 'OurBranchID', label: 'Branch ID' },
                { key: 'BranchName', label: 'Branch Name' }
            ]
        },
        'center': {
            title: 'Center Search',
            targetId: 'CenterId',
            targetName: 'CenterName',
            tableID: 'GroupID',
            moduleIDOverride: 5060,
            getAdvFilterString: () => {
                const branchId = document.getElementById('BranchId')?.value?.trim() || '';
                const safeBranchId = String(branchId).replace(/'/g, "''");
                return safeBranchId ? `OurBranchID ='${safeBranchId}'` : '';
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
        'scheme': {
            title: 'Loan Scheme Search',
            targetId: 'SchemeId',
            targetName: 'SchemeName',
            tableID: 'GroupDefaultSchemeID',
            moduleIDOverride: 5060,
            getAdvFilterString: () => "SchemeTypeID = 'P'",
            searchFields: [
                { name: 'schemeId', label: 'Scheme ID', column: 'LoanSchemeID' },
                { name: 'schemeName', label: 'Scheme Name', column: 'Description' }
            ],
            displayFields: [
                { key: 'LoanSchemeID', label: 'Scheme ID' },
                { key: 'Description', label: 'Scheme Name' },
                { key: 'GroupProductID', label: 'Group Product ID' }
            ]
        }
    };

    function ensureSharedSearchModal() {
        const appCore = getAppCore();
        if (!appCore) {
            console.error('[ChangeInstallmentDate] AppCore not available for SearchModal');
            showError('Search dialog unavailable (AppCore missing).');
            return null;
        }

        if (typeof window.SearchModal !== 'function') {
            console.error('[ChangeInstallmentDate] window.SearchModal is not available');
            showError('Search dialog script not loaded.');
            return null;
        }

        return new window.SearchModal(appCore);
    }

    function mapSelectedData(lookupType, data) {
        if (!data) return;

        const config = searchDialogConfig[lookupType];
        if (!config) return;

        const idField = document.getElementById(config.targetId);
        const nameField = document.getElementById(config.targetName);

        if (lookupType === 'branch') {
            const branchId = data.OurBranchID || data.BranchID || data.ID || '';
            const branchName = data.BranchName || data.Description || data.Name || '';
            if (idField) idField.value = branchId;
            if (nameField) nameField.value = branchName;
            parentContext.branchId = branchId;
            currentBranch = data;
            // Clear dependent fields
            clearCenterFields();
            clearSchemeFields();
            showSuccess(`Branch '${branchName}' selected`);
        } else if (lookupType === 'center') {
            const centerId = data.GroupID || data.CenterID || data.ID || '';
            const centerName = data.GroupName || data.CenterName || data.Description || data.Name || '';
            if (idField) idField.value = centerId;
            if (nameField) nameField.value = centerName;
            parentContext.centerId = centerId;
            parentContext.centerName = centerName;
            currentCenter = data;
            // Clear dependent fields
            clearSchemeFields();
            showSuccess(`Center '${centerName}' selected`);
        } else if (lookupType === 'scheme') {
            const schemeId = data.LoanSchemeID || data.SchemeId || data.ID || '';
            const schemeName = data.Description || data.SchemeName || data.Name || '';
            if (idField) idField.value = schemeId;
            if (nameField) nameField.value = schemeName;
            parentContext.schemeId = schemeId;
            currentScheme = data;
            showSuccess(`Scheme '${schemeName}' selected`);
        }
    }

    function openSearchDialog(lookupType) {
        const config = searchDialogConfig[lookupType];
        if (!config) {
            showWarning(`Unknown lookup type: ${lookupType}`);
            return;
        }

        // Validate dependencies
        if (lookupType === 'center') {
            const branchId = document.getElementById('BranchId')?.value?.trim();
            if (!branchId) {
                showWarning('Please select a Branch first');
                return;
            }
        }
        if (lookupType === 'scheme') {
            const centerId = document.getElementById('CenterId')?.value?.trim();
            if (!centerId) {
                showWarning('Please select a Center first');
                return;
            }
        }

        const modal = ensureSharedSearchModal();
        if (!modal || !config.tableID) {
            showError('Shared search dialog is not available.');
            return;
        }

        const advFilterString = typeof config.getAdvFilterString === 'function'
            ? config.getAdvFilterString()
            : (config.advFilterString || '');

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
    // Initialization
    // =========================================================================
    function init() {
        console.log('[ChangeInstallmentDate] Initializing...');
        setupEventListeners();
        initializeDefaultValues();
        console.log('[ChangeInstallmentDate] Initialized');
    }

    function initializeDefaultValues() {
        const branchId = document.getElementById('BranchId')?.value || '0101';
        const branchName = document.getElementById('BranchName')?.value || 'Head Office';
        parentContext.branchId = branchId;

        // Initialize change mode (default is 'holiday', so disable Day of Week)
        handleChangeModeChange();

        // Initially disable save button
        setSaveButtonState(false);

        console.log('[ChangeInstallmentDate] Initialized with branch:', branchId, branchName);
    }

    // =========================================================================
    // Event Listeners
    // =========================================================================
    function setupEventListeners() {
        // Lookup buttons (data-cid-lookup)
        document.querySelectorAll('[data-cid-lookup]').forEach(btn => {
            btn.addEventListener('click', function () {
                const lookupType = this.getAttribute('data-cid-lookup');
                openSearchDialog(lookupType);
            });
        });

        // Action buttons (data-cid-action)
        document.querySelectorAll('[data-cid-action]').forEach(btn => {
            btn.addEventListener('click', function () {
                const action = this.getAttribute('data-cid-action');
                handleActionClick(action);
            });
        });

        // Generate button
        const generateBtn = document.getElementById('btnGenerate');
        if (generateBtn) {
            generateBtn.addEventListener('click', handleGenerate);
        }

        // Enter key handlers
        document.getElementById('BranchId')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleViewBranch(); }
        });
        document.getElementById('CenterId')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleViewCenter(); }
        });
        document.getElementById('SchemeId')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleViewScheme(); }
        });

        // Blur handlers - fetch details when tabbing away
        document.getElementById('BranchId')?.addEventListener('blur', (e) => {
            const branchId = e.target.value.trim();
            if (branchId && branchId !== parentContext.branchId) {
                handleViewBranch();
            }
        });
        document.getElementById('CenterId')?.addEventListener('blur', (e) => {
            const centerId = e.target.value.trim();
            if (centerId && centerId !== parentContext.centerId) {
                handleViewCenter();
            }
        });
        document.getElementById('SchemeId')?.addEventListener('blur', (e) => {
            const schemeId = e.target.value.trim();
            if (schemeId && schemeId !== parentContext.schemeId) {
                handleViewScheme();
            }
        });

        // Radio button change
        document.querySelectorAll('input[name="ChangeMode"]').forEach(radio => {
            radio.addEventListener('change', handleChangeModeChange);
        });

        // Section toggles
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', function () {
                const section = this.closest('.form-section');
                const content = section.querySelector('[data-section-content]');
                const btn = this.querySelector('.section-toggle-btn');
                const icon = btn.querySelector('i');
                const isExpanded = btn.getAttribute('aria-expanded') === 'true';

                btn.setAttribute('aria-expanded', !isExpanded);
                content.hidden = isExpanded;
                icon.className = isExpanded ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
            });
        });
    }

    // =========================================================================
    // Action Handlers
    // =========================================================================
    function handleActionClick(action) {
        switch (action) {
            case 'save': handleSave(); break;
            case 'cancel': handleCancel(); break;
            case 'previous': break; // Navigation placeholder
            case 'next': break;     // Navigation placeholder
        }
    }

    // =========================================================================
    // View Handlers — background search via SearchModal/Search (same as search button)
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

    async function handleViewBranch() {
        const branchId = document.getElementById('BranchId').value.trim();
        if (!branchId) { showWarning('Please enter a Branch ID'); return; }

        try {
            const config = searchDialogConfig['branch'];
            const advFilter = config.getAdvFilterString();
            const safeId = String(branchId).replace(/'/g, "''");
            const whereStmt = `OurBranchID='${safeId}'`;

            const results = await backgroundSearch(config.tableID, advFilter, whereStmt, config.moduleIDOverride);

            if (results.length > 0) {
                mapSelectedData('branch', results[0]);
            } else {
                document.getElementById('BranchName').value = '';
                showWarning('Branch not found');
            }
        } catch (error) {
            console.error('[ChangeInstallmentDate] Error loading branch:', error);
            showError('Error loading branch details');
        }
    }

    async function handleViewCenter() {
        const centerId = document.getElementById('CenterId').value.trim();
        if (!centerId) { showWarning('Please enter a Center ID'); return; }

        const branchId = parentContext.branchId || document.getElementById('BranchId')?.value?.trim();
        if (!branchId) { showWarning('Please select a Branch first'); return; }

        try {
            const config = searchDialogConfig['center'];
            const advFilter = config.getAdvFilterString();
            const safeId = String(centerId).replace(/'/g, "''");
            const whereStmt = `GroupID='${safeId}'`;

            const results = await backgroundSearch(config.tableID, advFilter, whereStmt, config.moduleIDOverride);

            if (results.length > 0) {
                mapSelectedData('center', results[0]);
            } else {
                document.getElementById('CenterName').value = '';
                showWarning('Center not found');
            }
        } catch (error) {
            console.error('[ChangeInstallmentDate] Error loading center:', error);
            showError('Error loading center details');
        }
    }

    async function handleViewScheme() {
        const schemeId = document.getElementById('SchemeId').value.trim();
        if (!schemeId) { showWarning('Please enter a Scheme ID'); return; }

        try {
            const config = searchDialogConfig['scheme'];
            const advFilter = config.getAdvFilterString();
            const safeId = String(schemeId).replace(/'/g, "''");
            const whereStmt = `LoanSchemeID='${safeId}'`;

            const results = await backgroundSearch(config.tableID, advFilter, whereStmt, config.moduleIDOverride);

            if (results.length > 0) {
                mapSelectedData('scheme', results[0]);
            } else {
                document.getElementById('SchemeName').value = '';
                showWarning('Scheme not found');
            }
        } catch (error) {
            console.error('[ChangeInstallmentDate] Error loading scheme:', error);
            showError('Error loading scheme details');
        }
    }

    // =========================================================================
    // Change Mode Handler
    // =========================================================================
    function handleChangeModeChange() {
        const mode = document.querySelector('input[name="ChangeMode"]:checked')?.value;
        const dateField = document.getElementById('InstallmentDate');
        const dayOfWeekField = document.getElementById('DayOfWeek');

        if (mode === 'holiday') {
            if (dateField) dateField.disabled = false;
            if (dayOfWeekField) {
                dayOfWeekField.disabled = true;
                dayOfWeekField.value = '--Select--';
            }
        } else if (mode === 'meeting') {
            if (dateField) {
                dateField.disabled = true;
                dateField.value = '';
            }
            if (dayOfWeekField) dayOfWeekField.disabled = false;
        }
    }

    // =========================================================================
    // Generate Installments (via OldAPI: dbo.p_GetGroupLoanInstDateChange)
    // =========================================================================
    async function handleGenerate() {
        const branchId = document.getElementById('BranchId').value.trim();
        const centerId = document.getElementById('CenterId').value.trim();
        const schemeId = document.getElementById('SchemeId').value.trim();

        if (!centerId) { showWarning('Please select a Center first'); return; }
        if (!schemeId) { showWarning('Please select a Scheme first'); return; }

        const mode = document.querySelector('input[name="ChangeMode"]:checked')?.value;
        const installmentDate = document.getElementById('InstallmentDate').value;
        const dayOfWeek = document.getElementById('DayOfWeek').value;

        if (mode === 'holiday' && !installmentDate) {
            showWarning('Please select a Date'); return;
        }
        if (mode === 'meeting' && (!dayOfWeek || dayOfWeek === '--Select--')) {
            showWarning('Please select a Day of Week'); return;
        }

        showInfo('Generating installments...');

        const dayOfWeekMap = {
            'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
            'Thursday': 4, 'Friday': 5, 'Saturday': 6
        };

        const requestData = {
            OurBranchID: branchId || getEnv().ourBranchID,
            GroupID: centerId,
            LoanSchemeID: schemeId,
            HoliDayDate: mode === 'holiday' ? installmentDate : null,
            DayOfWeek: mode === 'meeting' ? dayOfWeekMap[dayOfWeek] : null,
            OperatorID: getEnv().operatorID
        };

        try {
            // Use dedicated endpoint (same pattern as center-loan-scheme)
            const result = await invokeChangeInstDateController('generate-installments', requestData);

            const root = result?.data ?? result;
            const data = root?.Details || root?.Details01 || root?.details || [];
            installmentsData = Array.isArray(data) ? data : [];

            renderInstallmentsTable(installmentsData);
            setSaveButtonState(installmentsData.length > 0);
            showSuccess(`Generated ${installmentsData.length} installment(s)`);
        } catch (error) {
            console.error('[ChangeInstallmentDate] Error generating installments:', error);
            showError('Error generating installments');
            setSaveButtonState(false);
        }
    }

    // =========================================================================
    // Render Installments Table
    // =========================================================================
    function renderInstallmentsTable(data) {
        const tbody = document.getElementById('installmentTableBody');
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No records to display.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${formatDate(item.ActualInstDate) || item.ActualInstDate || '-'}</td>
                <td>${formatDate(item.NewInstDate) || item.NewInstDate || '-'}</td>
                <td>${formatAmount(item.ExpectedAmount) || item.ExpectedAmount || '-'}</td>
            </tr>
        `).join('');
    }

    // =========================================================================
    // Save Handler
    // =========================================================================
    async function handleSave() {
        const centerId = document.getElementById('CenterId').value.trim();
        const schemeId = document.getElementById('SchemeId').value.trim();

        if (!centerId || !schemeId) {
            showWarning('Please fill required fields');
            return;
        }

        if (installmentsData.length === 0) {
            showWarning('No installments to save. Please generate first.');
            return;
        }

        // Use AppCore confirmation dialog
        const appCore = getAppCore();
        if (appCore && typeof appCore.showConfirmation === 'function') {
            const confirmed = await appCore.showConfirmation(
                'Save Changes',
                `Are you sure you want to save the installment date changes for ${installmentsData.length} installment(s)?`
            );
            if (!confirmed) return;
        }

        try {
            showInfo('Saving installment date changes...');
            const { ourBranchID, operatorID } = getEnv();
            const branchId = document.getElementById('BranchId').value.trim();
            const centerId = document.getElementById('CenterId').value.trim();
            const schemeId = document.getElementById('SchemeId').value.trim();
            const mode = document.querySelector('input[name="ChangeMode"]:checked')?.value;
            const installmentDate = document.getElementById('InstallmentDate').value;
            const dayOfWeek = document.getElementById('DayOfWeek').value;

            const dayOfWeekMap = {
                'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
                'Thursday': 4, 'Friday': 5, 'Saturday': 6
            };

            const result = await invokeChangeInstDateController('change-installment-date', {
                OurBranchID: branchId || ourBranchID,
                GroupID: centerId,
                LoanSchemeID: schemeId,
                HoliDayDate: mode === 'holiday' ? installmentDate : null,
                DayOfWeek: mode === 'meeting' ? dayOfWeekMap[dayOfWeek] : null,
                OperatorID: operatorID
            });

            const root = result?.data ?? result;
            const status = String(root?.Status ?? root?.status ?? '').trim();
            if (status && status !== '0' && status !== '200') {
                showError(root?.Message || root?.message || 'Failed to save changes');
                return;
            }

            showSuccess('Installment date changes saved successfully');
            setSaveButtonState(false);
        } catch (error) {
            console.error('[ChangeInstallmentDate] Save error:', error);
            showError('Error saving installment date changes');
        }
    }

    // =========================================================================
    // Cancel Handler
    // =========================================================================
    function handleCancel() {
        document.getElementById('BranchId').value = '0101';
        document.getElementById('BranchName').value = 'Head Office';
        clearCenterFields();
        clearSchemeFields();

        document.getElementById('Description').value = '';
        document.getElementById('InstallmentDate').value = '';
        document.getElementById('DayOfWeek').value = '--Select--';
        document.getElementById('ProductId').value = '';
        document.getElementById('Currency').value = '';

        // Reset table
        const tbody = document.getElementById('installmentTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No records to display.</td></tr>';
        }

        // Reset state
        currentCenter = null;
        currentScheme = null;
        installmentsData = [];
        editMode = false;

        setSaveButtonState(false);
        showInfo('Cancelled');
    }

    // =========================================================================
    // Field Helpers
    // =========================================================================
    function clearCenterFields() {
        document.getElementById('CenterId').value = '';
        document.getElementById('CenterName').value = '';
        parentContext.centerId = '';
        parentContext.centerName = '';
        currentCenter = null;
        setSaveButtonState(false);
    }

    function clearSchemeFields() {
        document.getElementById('SchemeId').value = '';
        document.getElementById('SchemeName').value = '';
        parentContext.schemeId = '';
        currentScheme = null;
        setSaveButtonState(false);
    }

    function setSaveButtonState(enabled) {
        const saveBtn = document.querySelector('[data-cid-action="save"]');
        if (saveBtn) {
            saveBtn.disabled = !enabled;
        }
    }

    // =========================================================================
    // Formatting Utilities
    // =========================================================================
    function formatDate(dateStr) {
        if (!dateStr) return null;
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

    function formatAmount(amount) {
        if (amount === null || amount === undefined) return null;
        const num = parseFloat(amount);
        if (isNaN(num)) return amount;
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // =========================================================================
    // Auto-Initialize
    // =========================================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('[ChangeInstallmentDate] Module loaded');
})();
