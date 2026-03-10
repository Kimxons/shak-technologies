/**
 * Center Loan Menu - Migrated JS Module
 * Uses invokeCenterLoanController (AppCore pattern) — no GroupService dependency.
 */
(function () {
    'use strict';

    const DEFAULT_MODULE_ID = 5020; // Center Loan Menu / Group Loan module ID

    // =========================================================================
    // State
    // =========================================================================
    let currentMenu = null;
    let isEditMode = false;
    let isAddMode = false;

    // Scheme context passed from parent via hidden inputs
    const parentSchemeId = document.getElementById('parentSchemeId')?.value?.trim() || '';
    const parentLoanProductId = document.getElementById('parentLoanProductId')?.value?.trim() || '';

    // =========================================================================
    // AppCore Invoker (same pattern as center-loan-scheme.js)
    // =========================================================================
    function getAppCore() {
        const win = window;
        return win.AppCore
            || (win.parent && win.parent !== win && win.parent.AppCore)
            || (win.top && win.top !== win && win.top.AppCore)
            || null;
    }

    function invokeController(action, requestData) {
        return new Promise((resolve, reject) => {
            const appCore = getAppCore();
            if (!appCore || typeof appCore.invokeController !== 'function') {
                reject(new Error('AppCore.invokeController not found'));
                return;
            }
            appCore.invokeController(`MicroFinance/${action}`, requestData || {}, (error, response) => {
                if (error) {
                    resolve(response ?? { ErrorMessage: error.message });
                } else {
                    resolve(response);
                }
            });
        });
    }

    // =========================================================================
    // Search Dialog
    // =========================================================================
    const searchDialogConfig = {
        'loan-cycle': {
            title: 'Loan Cycle / Level Search',
            tableID: 'GPLNMenuEffDate',
            moduleIDOverride: DEFAULT_MODULE_ID,
            getAdvFilterString: () => {
                const safe = s => String(s || '').replace(/'/g, "''");
                return parentSchemeId ? `LoanSchemeID='${safe(parentSchemeId)}'` : '';
            }
        },
        'loan-level': {
            title: 'Loan Level Search',
            tableID: 'GPLNMenuEffDate',
            moduleIDOverride: DEFAULT_MODULE_ID,
            getAdvFilterString: () => {
                const safe = s => String(s || '').replace(/'/g, "''");
                const parts = [];
                if (parentSchemeId) parts.push(`LoanSchemeID='${safe(parentSchemeId)}'`);
                const cycleNo = document.getElementById('LoanCycleNo')?.value?.trim();
                if (cycleNo) parts.push(`LoanCycleNo='${safe(cycleNo)}'`);
                return parts.join(' AND ');
            }
        }
    };

    function ensureSharedSearchModal() {
        if (typeof window.SearchModal !== 'function') {
            showError('Search dialog script not loaded.');
            return null;
        }
        const appCore = getAppCore();
        if (!appCore) {
            showError('Search dialog unavailable (AppCore missing).');
            return null;
        }
        const appCoreCompat = {
            invokeControllerGetViewAsync: typeof appCore.invokeControllerGetViewAsync === 'function'
                ? (ep, q) => appCore.invokeControllerGetViewAsync(ep, q)
                : async (ep, q) => {
                    const qs = new URLSearchParams(q || {}).toString();
                    const r = await fetch(`/${ep}?${qs}`, { credentials: 'same-origin' });
                    if (!r.ok) throw new Error(`View load failed (${r.status})`);
                    return r.text();
                },
            invokeControllerAsync: typeof appCore.invokeControllerAsync === 'function'
                ? (ep, d) => appCore.invokeControllerAsync(ep, d)
                : async (ep, d) => {
                    const r = await fetch(`/${ep}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                        body: JSON.stringify(d || {})
                    });
                    if (!r.ok) throw new Error(`Request failed (${r.status})`);
                    return r.json();
                },
            showToastMessage: typeof appCore.showToastMessage === 'function'
                ? (...a) => appCore.showToastMessage(...a)
                : () => {}
        };
        return new window.SearchModal(appCoreCompat);
    }

    function openSearchDialog(lookupType) {
        const config = searchDialogConfig[lookupType];
        if (!config) { showWarning(`Unknown lookup: ${lookupType}`); return; }

        const modal = ensureSharedSearchModal();
        if (!modal) return;

        const { ourBranchID } = getEnv();
        const advFilterString = typeof config.getAdvFilterString === 'function'
            ? config.getAdvFilterString() : (config.advFilterString || '');

        modal.open({
            title: config.title,
            tableID: config.tableID,
            moduleID: config.moduleIDOverride || DEFAULT_MODULE_ID,
            whereStmt: '',
            advFilterString,
            searchKey: '',
            ourbranchId: ourBranchID,
            onSelect: (record) => mapLookupSelection(lookupType, record)
        });
    }

    function mapLookupSelection(lookupType, data) {
        if (!data) return;
        if (lookupType === 'loan-cycle') {
            const cycleNo = data.LoanCycleNo || data.loanCycleNo || '';
            const levelNo = data.LoanLevelNo || data.loanLevelNo || '';
            const effDate = data.EffectiveDate || data.effectiveDate || '';
            setVal('LoanCycleNo', cycleNo);
            // Also fill Level and Date as they come from the same row
            if (levelNo) setVal('LoanLevelNo', levelNo);
            if (effDate) {
                const fmtDate = formatDateForInput(effDate);
                setVal('EffectiveDate', fmtDate);
            }
            showInfo(`Loan Cycle ${cycleNo} selected`);
        } else if (lookupType === 'loan-level') {
            const levelNo = data.LoanLevelNo || data.loanLevelNo || '';
            const effDate = data.EffectiveDate || data.effectiveDate || '';
            setVal('LoanLevelNo', levelNo);
            if (effDate) setVal('EffectiveDate', formatDateForInput(effDate));
            showInfo(`Loan Level ${levelNo} selected`);
        }
    }

    // =========================================================================
    // OldAPI status helper (mirrors center-loan-scheme.js)
    // =========================================================================
    function getOldApiStatus(payload) {
        const candidates = [];
        if (payload) candidates.push(payload);
        if (Array.isArray(payload?.Details) && payload.Details.length) candidates.push(payload.Details[0]);
        if (Array.isArray(payload?.Details01) && payload.Details01.length) candidates.push(payload.Details01[0]);
        if (Array.isArray(payload?.Details02) && payload.Details02.length) candidates.push(payload.Details02[0]);

        for (const c of candidates) {
            const code = c?.ResponseCode ?? c?.responseCode ?? c?.Status ?? c?.status ?? c?.code;
            if (code === undefined || code === null) continue;
            const norm = String(code).trim();
            const ok = norm === '' || norm === '00' || norm === '0'
                || norm.toLowerCase() === 'ok' || norm.toLowerCase() === 'success';
            const message = c?.ResponseMessage ?? c?.responseMessage ?? c?.Message ?? c?.message ?? '';
            return { ok, code: norm, message };
        }
        return { ok: true, code: '', message: '' };
    }

    // =========================================================================
    // Environment
    // =========================================================================
    function getEnv() {
        const e = window.Environment || window.AppEnvironment || {};
        const bankID = e.bankID || e.bankId || sessionStorage.getItem('BankID') || '00';
        const ourBranchID = e.ourBranchID || e.branchID || sessionStorage.getItem('OurBranchID') || '';
        const operatorID = e.operatorID || e.operatorId || sessionStorage.getItem('OperatorID') || 'CSADM';
        return { bankID, ourBranchID, operatorID };
    }

    // =========================================================================
    // Toast
    // =========================================================================
    function showToast(message, variant = 'info') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.className = 'kairo-toast-container';
            container.id = 'toastContainer';
            document.body.appendChild(container);
        }
        container.querySelectorAll('.kairo-toast').forEach(t => t.remove());
        const toast = document.createElement('div');
        toast.className = `kairo-toast kairo-toast--${variant}`;
        toast.setAttribute('role', 'alert');
        const body = document.createElement('div');
        body.className = 'kairo-toast__body';
        body.textContent = String(message || '');
        toast.appendChild(body);
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('is-show'), 0);
        setTimeout(() => {
            toast.classList.remove('is-show');
            setTimeout(() => { try { toast.remove(); } catch { } }, 300);
        }, 5000);
    }
    const showSuccess = m => showToast(m, 'success');
    const showError   = m => showToast(m, 'danger');
    const showWarning = m => showToast(m, 'warning');
    const showInfo    = m => showToast(m, 'info');

    // =========================================================================
    // Form Mode
    // =========================================================================
    function setFormMode(mode) {
        const keyFields = ['LoanCycleNo', 'LoanLevelNo', 'EffectiveDate'];
        const allInputs = document.querySelectorAll('.form-card input:not([readonly]), .form-card select');
        allInputs.forEach(el => {
            if (keyFields.includes(el.id)) {
                el.disabled = (mode === 'edit');
            } else {
                el.disabled = ['default', 'view-with-data', 'view-no-data'].includes(mode);
            }
        });

        const q = s => document.querySelector(`[data-mcs-action="${s}"]`);
        const btnView   = q('view');
        const btnAdd    = q('add');
        const btnEdit   = q('edit');
        const btnDelete = q('delete');
        const btnSave   = q('save');
        const btnCancel = q('cancel');

        const setDisabled = (btn, val) => { if (btn) btn.disabled = val; };

        switch (mode) {
            case 'default':
                setDisabled(btnView,   false);
                setDisabled(btnAdd,    false);
                setDisabled(btnEdit,   true);
                setDisabled(btnDelete, true);
                setDisabled(btnSave,   true);
                setDisabled(btnCancel, false);
                break;
            case 'view-with-data':
                setDisabled(btnView,   true);
                setDisabled(btnAdd,    false);
                setDisabled(btnEdit,   false);
                setDisabled(btnDelete, false);
                setDisabled(btnSave,   true);
                setDisabled(btnCancel, false);
                break;
            case 'view-no-data':
                setDisabled(btnView,   true);
                setDisabled(btnAdd,    false);
                setDisabled(btnEdit,   true);
                setDisabled(btnDelete, true);
                setDisabled(btnSave,   true);
                setDisabled(btnCancel, false);
                break;
            case 'add':
            case 'edit':
                setDisabled(btnView,   true);
                setDisabled(btnAdd,    true);
                setDisabled(btnEdit,   true);
                setDisabled(btnDelete, true);
                setDisabled(btnSave,   false);
                setDisabled(btnCancel, false);
                break;
        }

        // Ensure key lookup fields are always enabled in non-edit modes
        if (mode !== 'edit') {
            keyFields.forEach(id => {
                const f = document.getElementById(id);
                if (f) { f.disabled = false; f.removeAttribute('disabled'); }
            });
        }
    }

    // =========================================================================
    // View
    // =========================================================================
    function handleView() {
        const loanCycleNo   = document.getElementById('LoanCycleNo')?.value?.trim();
        const loanLevelNo   = document.getElementById('LoanLevelNo')?.value?.trim();
        const effectiveDate = document.getElementById('EffectiveDate')?.value?.trim();

        const missing = [];
        if (!loanCycleNo)   missing.push('Loan Cycle No');
        if (!loanLevelNo)   missing.push('Loan Level No');
        if (!effectiveDate) missing.push('Effective Date');

        if (missing.length) {
            showWarning(`Please fill in: ${missing.join(', ')}`);
            return;
        }

        isEditMode = false;
        isAddMode  = false;
        showInfo('Loading menu...');
        loadMenuData(loanCycleNo, loanLevelNo, effectiveDate);
    }

    // =========================================================================
    // Load Menu Data
    // =========================================================================
    async function loadMenuData(loanCycleNo, loanLevelNo, effectiveDate) {
        if (!parentSchemeId) {
            showWarning('No scheme ID available. Please load a scheme first.');
            setFormMode('default');
            return;
        }

        const { bankID, ourBranchID, operatorID } = getEnv();
        const formattedDate = effectiveDate && !effectiveDate.includes('T')
            ? effectiveDate + 'T00:00:00' : effectiveDate;

        const requestData = {
            BankID:         bankID,
            OurBranchID:    ourBranchID,
            LoanSchemeID:   parentSchemeId,
            LoanCycleNo:    parseInt(loanCycleNo, 10) || 0,
            LoanLevelNo:    parseInt(loanLevelNo, 10) || 0,
            EffectiveDate:  formattedDate,
            OperatorID:     operatorID
        };

        try {
            const resp    = await invokeController('old-api', {
                FormId:      'p_GetGroupLoanMenu',
                RequestData: requestData
            });
            const payload = resp?.raw ?? resp?.data ?? resp;
            const status  = getOldApiStatus(payload);

            if (!status.ok) {
                showError(status.message || 'Failed to load menu');
                setFormMode('view-no-data');
                return;
            }

            // SP returns Details01 = product defaults, Details02 = menu record
            const productDefaults = payload?.Details01 ?? [];
            const menuRows        = payload?.Details02 ?? payload?.Details ?? [];

            const productData  = Array.isArray(productDefaults) ? productDefaults[0] : null;
            const menuRecord   = Array.isArray(menuRows) && menuRows.length ? menuRows[0] : null;

            // Populate Behind-the-Scene (product defaults) regardless
            if (productData) {
                setVal('MenuLoanProductId',           productData.LoanProductID || '');
                setVal('MenuCurrencyId',              productData.CurrencyID || '');
                setVal('MenuTermExcludesGracePeriod', productData.IsTermExcludesGracePeriod !== undefined
                    ? (productData.IsTermExcludesGracePeriod ? 'Yes' : 'No') : '');
                setVal('MenuLoanPeriod',              productData.InstallmentFrequency || '');
                setVal('MenuCalculationMethod',       productData.CalculationMethod || '');
                // Load interest menu dropdown for this scheme
                await loadInterestMenuCombo(parentSchemeId);
            }

            if (menuRecord && menuRecord.LoanSchemeID) {
                currentMenu = mapToViewModel(menuRecord, productData);
                populateForm(currentMenu);
                setFormMode('view-with-data');
                showSuccess('Menu loaded successfully');
            } else {
                currentMenu = null;
                setFormMode('view-no-data');
                showInfo('No menu found for the specified criteria. Use Add to create one.');
            }
        } catch (err) {
            console.error('[CenterLoanMenu] loadMenuData error:', err);
            showError('Error loading menu: ' + (err.message || 'Unknown error'));
            setFormMode('default');
        }
    }

    // =========================================================================
    // Map API ? View Model
    // =========================================================================
    function mapToViewModel(data, product) {
        product = product || {};
        return {
            LoanCycleNo:                   data.LoanCycleNo || '',
            LoanLevelNo:                   data.LoanLevelNo || '',
            EffectiveDate:                 formatDateForInput(data.EffectiveDate),
            MinimumLoanAmount:             data.MinLoanAmount || '',
            MaximumLoanAmount:             data.MaxLoanAmount || '',
            DefaultLoanAmount:             data.DefaultLoanAmount || '',
            Term:                          data.Term || '',
            InterestMenuId:                data.InterestRateID || '',
            InstallmentGracePeriod:        data.InstallmentGracePeriod || '',
            MaxAdjustmentDays:             data.MaxAdjustmentDays || '',
            MenuSavingToLoanRatio:         data.CollateralRatio || '',
            MenuSLRecoveryType:            data.SLRecoveryType || '',
            MenuCollectSavingWithInstallment: toBool(data.CollectSavingWithInst),
            MenuSavingsCollectionType:     data.SavingsTypeID || '',
            MenuSavingsValue:              data.SavingsAmount || '',
            MenuLoanProductId:             product.LoanProductID || '',
            MenuCurrencyId:                product.CurrencyID || '',
            MenuTermExcludesGracePeriod:   product.IsTermExcludesGracePeriod !== undefined
                ? (product.IsTermExcludesGracePeriod ? 'Yes' : 'No') : '',
            MenuLoanPeriod:                product.InstallmentFrequency || '',
            MenuCalculationMethod:         product.CalculationMethod || '',
            MenuCreatedBy:                 data.CreatedBy || '',
            MenuCreatedOn:                 formatDateTime(data.CreatedOn),
            MenuModifiedBy:                data.ModifiedBy || '',
            MenuModifiedOn:                formatDateTime(data.ModifiedOn),
            MenuSupervisedBy:              data.SupervisedBy || '',
            MenuSupervisedOn:              formatDateTime(data.SupervisedOn),
            UpdateCount:                   data.UpdateCount || 0,
            LoanSchemeID:                  data.LoanSchemeID || ''
        };
    }

    function toBool(val) {
        if (typeof val === 'boolean') return val;
        if (typeof val === 'number')  return val !== 0;
        if (typeof val === 'string')  return val === '1' || val.toLowerCase() === 'true' || val.toLowerCase() === 'yes';
        return false;
    }

    function formatDateForInput(v) {
        if (!v) return '';
        try { return new Date(v).toISOString().split('T')[0]; } catch { return ''; }
    }

    function formatDateTime(v) {
        if (!v) return '';
        try {
            const d = new Date(v);
            if (isNaN(d.getTime())) return String(v);
            return d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        } catch { return String(v); }
    }

    // =========================================================================
    // Populate / Clear Form
    // =========================================================================
    function populateForm(vm) {
        Object.entries(vm).forEach(([key, value]) => {
            const el = document.getElementById(key);
            if (!el) return;
            if (el.type === 'checkbox') { el.checked = !!value; }
            else { el.value = value ?? ''; }
        });
        toggleSavingsFields(document.getElementById('MenuCollectSavingWithInstallment')?.checked || false);
    }

    function setVal(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value ?? '';
    }

    function clearForm() {
        const form = document.querySelector('.form-card');
        if (!form) return;
        form.querySelectorAll('input:not([readonly])').forEach(el => {
            if (el.type === 'checkbox') el.checked = false;
            else el.value = '';
        });
        form.querySelectorAll('select').forEach(el => { el.selectedIndex = 0; });
        currentMenu = null;
    }

    // =========================================================================
    // Add / Edit / Delete / Save / Cancel
    // =========================================================================
    function handleAdd() {
        const preserve = ['LoanCycleNo', 'LoanLevelNo', 'EffectiveDate',
            'MenuLoanProductId', 'MenuCurrencyId', 'MenuTermExcludesGracePeriod',
            'MenuLoanPeriod', 'MenuCalculationMethod'];
        const saved = {};
        preserve.forEach(id => { saved[id] = document.getElementById(id)?.value || ''; });

        clearForm();
        preserve.forEach(id => setVal(id, saved[id]));

        isAddMode  = true;
        isEditMode = false;
        setFormMode('add');
        toggleSavingsFields(false);
        showInfo('Add mode — fill in the menu details and save.');
    }

    function handleEdit() {
        if (!currentMenu) { showWarning('Please view a menu first before editing.'); return; }
        isEditMode = true;
        isAddMode  = false;
        setFormMode('edit');
        toggleSavingsFields(document.getElementById('MenuCollectSavingWithInstallment')?.checked || false);
        showInfo('Edit mode — make your changes and save.');
    }

    async function handleDelete() {
        if (!currentMenu) { showWarning('Please view a menu first before deleting.'); return; }

        const confirmed = window.confirm('Are you sure you want to delete this menu entry?');
        if (!confirmed) return;

        const { bankID } = getEnv();
        const requestData = {
            BankID:        bankID,
            LoanSchemeID:  parentSchemeId,
            LoanCycleNo:   parseInt(document.getElementById('LoanCycleNo')?.value, 10) || 0,
            LoanLevelNo:   parseInt(document.getElementById('LoanLevelNo')?.value, 10) || 0,
            EffectiveDate: document.getElementById('EffectiveDate')?.value || '',
            UpdateCount:   currentMenu?.UpdateCount || 0
        };

        try {
            showInfo('Deleting menu...');
            const resp    = await invokeController('old-api', {
                FormId:      'p_DeleteGroupLoanMenu',
                RequestData: requestData
            });
            const payload = resp?.raw ?? resp?.data ?? resp;
            const status  = getOldApiStatus(payload);

            if (status.ok) {
                showSuccess('Menu deleted successfully');
                clearForm();
                setFormMode('default');
            } else {
                showError(status.message || 'Failed to delete menu');
            }
        } catch (err) {
            console.error('[CenterLoanMenu] handleDelete error:', err);
            showError('Failed to delete menu: ' + (err.message || 'Unknown error'));
        }
    }

    async function handleSave() {
        if (!isAddMode && !isEditMode) { showWarning('Please enter Add or Edit mode first.'); return; }
        if (!validateForm()) return;
        if (!parentSchemeId) { showError('No scheme ID available. Please load a scheme first.'); return; }

        const { bankID, operatorID } = getEnv();
        const now          = new Date().toISOString().slice(0, 19);
        const loanCycleNo  = document.getElementById('LoanCycleNo')?.value?.trim() || '';
        const loanLevelNo  = document.getElementById('LoanLevelNo')?.value?.trim() || '';
        const effectiveDate = document.getElementById('EffectiveDate')?.value?.trim() || '';
        const formattedDate = effectiveDate && !effectiveDate.includes('T')
            ? effectiveDate + 'T00:00:00' : effectiveDate;

        // Only send fields the SP accepts — no extra audit columns beyond what it expects
        const requestData = {
            BankID:                 bankID,
            LoanSchemeID:           parentSchemeId,
            LoanCycleNo:            parseInt(loanCycleNo, 10) || 0,
            LoanLevelNo:            parseInt(loanLevelNo, 10) || 0,
            EffectiveDate:          formattedDate,
            MinLoanAmount:          parseFloat(document.getElementById('MinimumLoanAmount')?.value) || 0,
            MaxLoanAmount:          parseFloat(document.getElementById('MaximumLoanAmount')?.value) || 0,
            DefaultLoanAmount:      parseFloat(document.getElementById('DefaultLoanAmount')?.value) || 0,
            Term:                   parseInt(document.getElementById('Term')?.value, 10) || 0,
            InterestRateID:         document.getElementById('InterestMenuId')?.value || '',
            InstallmentGracePeriod: parseInt(document.getElementById('InstallmentGracePeriod')?.value, 10) || 0,
            MaxAdjustmentDays:      parseInt(document.getElementById('MaxAdjustmentDays')?.value, 10) || 0,
            SavingsTypeID:          document.getElementById('MenuSavingsCollectionType')?.value || '',
            SavingsAmount:          parseFloat(document.getElementById('MenuSavingsValue')?.value) || 0,
            CollateralRatio:        parseFloat(document.getElementById('MenuSavingToLoanRatio')?.value) || 0,
            SLRecoveryType:         document.getElementById('MenuSLRecoveryType')?.value || null,
            CollectSavingWithInst:  document.getElementById('MenuCollectSavingWithInstallment')?.checked ? true : false,
            CreatedBy:   isAddMode ? operatorID : (currentMenu?.MenuCreatedBy || ''),
            CreatedOn:   isAddMode ? now : (currentMenu?.MenuCreatedOn || ''),
            ModifiedBy:  isEditMode ? operatorID : (isAddMode ? null : (currentMenu?.MenuModifiedBy || null)),
            ModifiedOn:  isEditMode ? now : (isAddMode ? null : (currentMenu?.MenuModifiedOn || null)),
            SupervisedBy: null,
            SupervisedOn: null,
            UpdateCount: isAddMode ? 1 : (currentMenu?.UpdateCount || 0)
        };

        try {
            showInfo('Saving menu...');
            const resp    = await invokeController('old-api', {
                FormId:      'p_AddEditGroupLoanMenu',
                RequestData: requestData
            });
            const payload = resp?.raw ?? resp?.data ?? resp;
            const status  = getOldApiStatus(payload);

            if (status.ok) {
                showSuccess(isAddMode ? 'Menu created successfully' : 'Menu updated successfully');
                isAddMode  = false;
                isEditMode = false;
                await loadMenuData(loanCycleNo, loanLevelNo, effectiveDate);
            } else {
                showError(status.message || 'Failed to save menu');
            }
        } catch (err) {
            const msg = err?.response?.ErrorMessage || err?.response?.ResponseMessage || err?.message || 'Unknown error';
            showError(`Failed to save menu: ${msg}`);
        }
    }

    function handleCancel() {
        isAddMode = false;
        isEditMode = false;
        clearForm();
        setFormMode('default');
        showInfo('Form cleared.');
    }

    // =========================================================================
    // Validation
    // =========================================================================
    function validateForm() {
        const loanCycleNo   = document.getElementById('LoanCycleNo')?.value?.trim();
        const loanLevelNo   = document.getElementById('LoanLevelNo')?.value?.trim();
        const effectiveDate = document.getElementById('EffectiveDate')?.value?.trim();

        if (!loanCycleNo)   { showError('Loan Cycle No is required');  document.getElementById('LoanCycleNo')?.focus();   return false; }
        if (!loanLevelNo)   { showError('Loan Level No is required');   document.getElementById('LoanLevelNo')?.focus();   return false; }
        if (!effectiveDate) { showError('Effective Date is required');  document.getElementById('EffectiveDate')?.focus(); return false; }
        return true;
    }

    // =========================================================================
    // Interest Menu Combo (dropdown)
    // =========================================================================
    async function loadInterestMenuCombo(loanSchemeID) {
        if (!loanSchemeID) return;
        const { bankID } = getEnv();
        try {
            const resp    = await invokeController('old-api', {
                FormId:      'p_getInterestmenucombo',
                RequestData: { BankID: bankID, LoanSchemeID: loanSchemeID }
            });
            const payload = resp?.raw ?? resp?.data ?? resp;
            const rows    = payload?.Details01 ?? payload?.Details ?? payload?.details ?? [];
            const items   = Array.isArray(rows) ? rows : [];

            const select = document.getElementById('InterestMenuId');
            if (!select || !items.length) return;

            while (select.options.length > 1) select.remove(1);
            items.forEach(opt => {
                const o = document.createElement('option');
                o.value       = opt.RateID || opt.InterestMenuID || opt.value || '';
                o.textContent = opt.Description || opt.label || o.value;
                select.appendChild(o);
            });
        } catch (err) {
            console.warn('[CenterLoanMenu] loadInterestMenuCombo error:', err);
        }
    }

    // =========================================================================
    // Savings fields toggle
    // =========================================================================
    function toggleSavingsFields(isChecked) {
        const inEditOrAdd = isAddMode || isEditMode;
        ['MenuSavingsCollectionType', 'MenuSavingsValue'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !isChecked || !inEditOrAdd;
        });
        if (!isChecked) {
            document.getElementById('MenuSavingsCollectionType') && (document.getElementById('MenuSavingsCollectionType').selectedIndex = 0);
            setVal('MenuSavingsValue', '');
        }
    }

    // =========================================================================
    // Window / close
    // =========================================================================
    function closeChildForm() {
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ action: 'submoduleClosed', source: 'Center Loan Menu' }, '*');
            } else {
                window.close();
            }
        } catch { window.close(); }
    }

    // =========================================================================
    // Section Toggles
    // =========================================================================
    function initSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', function () {
                const section = this.closest('.form-section');
                const btn     = this.querySelector('.section-toggle-btn');
                const icon    = btn?.querySelector('i');
                const expanded = btn?.getAttribute('aria-expanded') === 'true';
                btn?.setAttribute('aria-expanded', String(!expanded));
                section?.classList.toggle('collapsed');
                if (icon) icon.className = expanded ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
            });
        });
    }

    // =========================================================================
    // Event Wiring
    // =========================================================================
    function initEventListeners() {
        // Lookup buttons
        document.querySelectorAll('[data-mcs-lookup]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                openSearchDialog(btn.dataset.mcsLookup);
            });
        });

        // Action buttons
        const actionMap = {
            view:   handleView,
            add:    handleAdd,
            edit:   handleEdit,
            delete: handleDelete,
            save:   handleSave,
            cancel: handleCancel
        };
        Object.entries(actionMap).forEach(([action, fn]) => {
            document.querySelector(`[data-mcs-action="${action}"]`)
                ?.addEventListener('click', e => { e.preventDefault(); fn(); });
        });

        // Window action buttons (refresh / close)
        document.querySelectorAll('[data-window-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const a = btn.dataset.windowAction;
                if (a === 'close') closeChildForm();
                else if (a === 'refresh') window.location.reload();
            });
        });

        // Savings checkbox
        document.getElementById('MenuCollectSavingWithInstallment')
            ?.addEventListener('change', function () { toggleSavingsFields(this.checked); });
    }

    // =========================================================================
    // Init
    // =========================================================================
    function initialize() {
        console.log('[CenterLoanMenu] Initializing — SchemeID:', parentSchemeId);
        initSectionToggles();
        initEventListeners();
        setFormMode('default');

        // If scheme context available, pre-load interest menu combo
        if (parentSchemeId) {
            loadInterestMenuCombo(parentSchemeId);
        }

        console.log('[CenterLoanMenu] Ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    window.CenterLoanMenu = {
        handleView, handleAdd, handleEdit, handleDelete, handleSave, handleCancel,
        showSuccess, showError, showWarning, showInfo
    };
})();
