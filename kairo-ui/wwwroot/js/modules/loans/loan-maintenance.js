/**
 * Loan Maintenance Module (Migrated)
 * Strict migration-cheatsheet pattern: state + SearchModal + invokeControllerAsync + POST endpoints
 */
(function () {
    'use strict';

    const state = {
        moduleId: null,
        branchId: null,
        operatorId: null,
        currentMode: 'ENTRY',
        currentLoan: null,
        isDirty: false,
        searchModal: null,
        activeSubmodule: null
    };

    // Keep submodules intentionally deferred until dedicated pages are ready.
    // Submodules are now enabled - InstallmentSchedule and other view modules are ready
    const ENABLE_SUBMODULES = true;

    const endpoints = {
        getLoan: 'Loans/LoanMaintenance/GetLoan',
        editLoan: 'Loans/LoanMaintenance/EditLoan'
    };

    const LOOKUP_CONFIG = {
        BranchID: { tableID: 'BranchID', displayField: 'BranchName', valueField: 'BranchID', displayColumn: 'BranchName', valueColumn: 'OurBranchID' },
        ClientID: { tableID: 'ClientAccountID', displayField: 'ClientName', valueField: 'ClientID', displayColumn: 'ClientName', valueColumn: 'ClientID', searchColumn: 'ClientID' },
        AccountID: { tableID: 'LoanID', displayField: 'AccountName', valueField: 'AccountID', displayColumn: 'AccountName', valueColumn: 'AccountID', searchColumn: 'AccountID' },
        LoanSeries: { tableID: 'LoanSeriesID', displayField: 'LoanRefNo', valueField: 'LoanSeries', displayColumn: 'LoanRefNo', valueColumn: 'LoanSeries', searchColumn: 'LoanSeries' },
        RepaymentAccountID: { tableID: 'RepaymentAccountID', displayField: 'RepaymentAccountName', valueField: 'RepaymentAccountID', displayColumn: 'AccountName', valueColumn: 'AccountID', searchColumn: 'AccountID' },
        FundID: { tableID: 'FundID', displayField: null, valueField: 'FundID', displayColumn: 'FundName', valueColumn: 'FundID', searchColumn: 'FundID' },
        LegalOfficer: { tableID: 'ActiveOfficerID', displayField: 'LegalOfficerName', valueField: 'LegalOfficer', displayColumn: 'OfficerName', valueColumn: 'OfficerID', searchColumn: 'OfficerID' },
        CreditOfficer: { tableID: 'ActiveOfficerID', displayField: null, valueField: 'CreditOfficer', displayColumn: 'OfficerName', valueColumn: 'OfficerID', searchColumn: 'OfficerID' }
    };

    const SUBMODULE_ROUTES = {
        'loan-collaterals': '/Loans/LoanCollaterals',
        'writeoff-recovery': '/Loans/WriteoffRecovery',
        'insurance': '/Loans/Insurance',
        'guarantor': '/Loans/LoanGuarantor',
        'user-defined-fields': '/Loans/UserDefinedFields',
        'release-freeze': '/Loans/LoanReleaseFreeze',
        'loan-closing-opening': '/Loans/LoanClosingOpening',
        'loan-legal-remarks': '/Loans/LoanLegalRemarks',
        'loan-utilization': '/Loans/LoanUtilization',
        'loan-repayment-reversal': '/Loans/LoanRepaymentReversal',
        'legal-expense': '/Loans/LegalExpense',
        'repayment-accounts': '/Loans/RepaymentAccounts',
        'instruction': '/Loans/Instruction',
        'loan-disbursement-reversal': '/Loans/LoanDisbursementReversal',
        'installment-schedule': '/Loans/InstallmentSchedule/Index',
        'loan-statement': '/Loans/LoanStatement',
        'loan-history': '/Loans/LoanHistory',
        'collaterals': '/Loans/ViewCollaterals',
        'guarantors': '/Loans/ViewGuarantors',
        'loan-interest-worksheet': '/Loans/LoanInterestWorksheet',
        'penalty-interest-waive-off-history': '/Loans/PenaltyInterestWaiveOffHistory'
    };

    // Only show submodules that are migrated and ready to open.
    const AVAILABLE_SUBMODULES = new Set([
        'installment-schedule'
    ]);

    function init() {
        loadContext();
        applySubmoduleAvailability();
        wireSidebarUi();
        wireSectionToggles();
        wireLookupButtons();
        wireBlurLookups();
        wireActionButtons();
        wireAutoViewTriggers();
        wireSubmoduleSidebar();
        wireChildFormBridge();
        wireDirtyTracking();
        disableNavigationButtons();
        setEntryMode();
    }

    function applySubmoduleAvailability() {
        const items = Array.from(document.querySelectorAll('.sidebar-item[data-child-form]'));
        items.forEach((item) => {
            const key = item.getAttribute('data-child-form');
            const isAvailable = !!key && AVAILABLE_SUBMODULES.has(key) && !!SUBMODULE_ROUTES[key];
            // Keep full list visible; only availability controls whether click can open.
            item.hidden = false;
            item.dataset.available = isAvailable ? 'true' : 'false';
            item.setAttribute('aria-disabled', isAvailable ? 'false' : 'true');
        });

        document.querySelectorAll('.nav-section[data-nav-section]').forEach((section) => {
            const visibleItems = section.querySelectorAll('.sidebar-item[data-child-form]').length;
            const badge = section.querySelector('[data-nav-badge]');
            if (badge) {
                badge.textContent = String(visibleItems);
            }
            section.hidden = false;
        });
    }

    function wireChildFormBridge() {
        window.addEventListener('message', (event) => {
            const action = event?.data?.action;
            if (!action) return;

            if (action === 'close-child-form' || action === 'submoduleClosed') {
                closeSubmodule();
            }
        });
    }

    function closeSubmodule() {
        const overlay = document.querySelector('[data-child-inline]');
        const iframe = document.querySelector('[data-child-iframe]');
        const mainForm = document.querySelector('[data-main-form]');

        if (iframe) {
            iframe.src = 'about:blank';
        }

        if (overlay) {
            overlay.hidden = true;
        }

        if (mainForm) {
            mainForm.hidden = false;
        }

        state.activeSubmodule = null;
        showLoading(false);
    }

    function wireSidebarUi() {
        const sidebar = document.getElementById('main-sidebar');
        const toggleBtn = document.getElementById('sidebarToggle');
        const searchInput = document.getElementById('submoduleSearch');
        const clearBtn = document.getElementById('submoduleSearchClear');

        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                const expanded = !sidebar.classList.contains('collapsed');
                toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            });
        }

        document.querySelectorAll('.nav-section').forEach((section, idx) => {
            const header = section.querySelector('.nav-header');
            const arrowBtn = section.querySelector('.nav-arrow');
            const panel = section.querySelector('.nav-items');
            if (!header || !panel) return;

            const setOpen = (open) => {
                panel.hidden = !open;
                if (arrowBtn) {
                    arrowBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
                }
            };

            // Keep first two sections open by default for visibility.
            setOpen(idx < 2);

            const toggle = (e) => {
                if (e) e.preventDefault();
                setOpen(panel.hidden);
            };

            header.addEventListener('click', toggle);
            arrowBtn?.addEventListener('click', toggle);
        });

        const filterItems = () => {
            const query = (searchInput?.value || '').trim().toLowerCase();
            const items = Array.from(document.querySelectorAll('.sidebar-item[data-child-form]'));
            items.forEach(item => {
                const label = item.textContent?.trim().toLowerCase() || '';
                item.hidden = query.length > 0 && !label.includes(query);
            });
        };

        searchInput?.addEventListener('input', filterItems);
        clearBtn?.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            filterItems();
        });
    }

    function loadContext() {
        state.moduleId = getValue('moduleId_loanMaintenance') || '4300';
        state.branchId = getValue('BranchID') || sessionStorage.getItem('branch_code') || sessionStorage.getItem('OurBranchID') || '';
        state.operatorId = getValue('OperatorID') || sessionStorage.getItem('user_name') || sessionStorage.getItem('OperatorID') || '';

        if (!getValue('BranchID') && state.branchId) {
            setValue('BranchID', state.branchId);
        }
    }

    function getSearchModal() {
        if (state.searchModal) return state.searchModal;
        if (!window.SearchModal) return null;
        state.searchModal = new window.SearchModal(window.AppCore);
        return state.searchModal;
    }

    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.closest('.form-section');
                const content = section?.querySelector('[data-section-content]');
                const btn = header.querySelector('.section-toggle-btn');
                const icon = header.querySelector('.section-toggle-btn i');
                if (!content) return;

                const hidden = content.style.display === 'none';
                content.style.display = hidden ? '' : 'none';
                if (btn) btn.setAttribute('aria-expanded', hidden ? 'true' : 'false');
                if (icon) icon.className = hidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
            });
        });
    }

    function wireLookupButtons() {
        document.querySelectorAll('.btn-lookup[data-target-input]').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-target-input');
                openLookup(key);
            });
        });
    }

    function wireBlurLookups() {
        ['BranchID', 'ClientID', 'AccountID', 'LoanSeries', 'RepaymentAccountID', 'FundID', 'LegalOfficer'].forEach(key => {
            const cfg = LOOKUP_CONFIG[key];
            const el = document.getElementById(cfg?.valueField || key);
            if (!el) return;
            el.addEventListener('blur', () => runAutoLookup(key));
        });
    }

    function openLookup(lookupKey) {
        const cfg = LOOKUP_CONFIG[lookupKey];
        if (!cfg) return;

        const modal = getSearchModal();
        if (!modal) {
            showWarning('Search modal is not loaded');
            return;
        }

        const whereStmt = buildWhereStmt(lookupKey);
        const openCfg = {
            tableID: cfg.tableID,
            moduleID: state.moduleId,
            whereStmt,
            onSelect: row => {
                setValue(cfg.valueField, row[cfg.valueColumn] || row.ID || '');
                if (cfg.displayField) {
                    setValue(cfg.displayField, row[cfg.displayColumn] || row.Name || '');
                }
                if (lookupKey === 'AccountID') {
                    setValue('LoanSeries', row.LoanSeries || '');
                    setValue('LoanRefNo', row.LoanRefNo || '');
                    triggerViewFromAccountSelection('account-lookup');
                }
                if (lookupKey === 'LoanSeries') {
                    setValue('LoanRefNo', row.LoanRefNo || getValue('LoanRefNo'));
                    triggerViewFromAccountSelection('series-lookup');
                }
                state.isDirty = true;
                modal.close();
            }
        };

        modal.open(openCfg).catch(err => {
            console.error('[LoanMaintenance] lookup open failed:', err);
            showError('Unable to open lookup');
        });
    }

    function buildWhereStmt(lookupKey) {
        const branchId = getValue('BranchID');
        const clientId = getValue('ClientID');
        const accountId = getValue('AccountID');

        if (lookupKey === 'ClientID') return branchId ? `ProductTypeID='LN' AND OurBranchID='${branchId}'` : "ProductTypeID='LN'";
        if (lookupKey === 'AccountID') return branchId ? `OurBranchID='${branchId}'` : '';
        if (lookupKey === 'LoanSeries') return (branchId && accountId) ? `OurBranchID='${branchId}' AND AccountID='${accountId}'` : '';
        if (lookupKey === 'RepaymentAccountID') return clientId ? `ClientID='${clientId}' AND ProductTypeID IN ('SB','CA')` : '';
        if (lookupKey === 'LegalOfficer' || lookupKey === 'CreditOfficer') return branchId ? `ReportingBranchID='${branchId}' AND OfficerTypeID='CO'` : "OfficerTypeID='CO'";
        return '';
    }

    function buildAdvFilterString(lookupKey) {
        const branchId = getValue('BranchID');
        const clientId = getValue('ClientID');
        const accountId = getValue('AccountID');

        if (lookupKey === 'ClientID') return branchId ? `ProductTypeID='LN' AND OurBranchID='${escapeSqlLike(branchId)}'` : "ProductTypeID='LN'";
        if (lookupKey === 'AccountID') return branchId ? `OurBranchID='${escapeSqlLike(branchId)}'` : '';
        if (lookupKey === 'LoanSeries') return (branchId && accountId) ? `OurBranchID='${escapeSqlLike(branchId)}' AND AccountID='${escapeSqlLike(accountId)}'` : '';
        if (lookupKey === 'RepaymentAccountID') return clientId ? `ClientID='${escapeSqlLike(clientId)}' AND ProductTypeID IN ('SB','CA')` : "ProductTypeID IN ('SB','CA')";
        if (lookupKey === 'LegalOfficer' || lookupKey === 'CreditOfficer') return branchId ? `ReportingBranchID='${escapeSqlLike(branchId)}' AND OfficerTypeID='CO'` : "OfficerTypeID='CO'";
        return '';
    }

    async function runAutoLookup(lookupKey) {
        const cfg = LOOKUP_CONFIG[lookupKey];
        if (!cfg) return;

        const raw = getValue(cfg.valueField);
        if (!raw) {
            if (cfg.displayField) setValue(cfg.displayField, '');
            return;
        }

        const whereStmt = `${cfg.searchColumn || cfg.valueColumn || cfg.valueField} LIKE '%${escapeSqlLike(raw)}'`;
        const advFilter = buildAdvFilterString(lookupKey);

        try {
            const response = await window.AppCore.invokeControllerAsync('SearchModal/Search', {
                TableID: cfg.tableID,
                WhereStmt: whereStmt,
                AdvFilterString: advFilter,
                SearchKey: '',
                ModuleID: state.moduleId,
                PageSize: 10,
                RefID: '',
                PrevOrNext: 1,
                OurBranchID: getValue('BranchID') || state.branchId || ''
            });

            const rows = extractSearchRows(response);
            if (!rows.length) {
                if (cfg.displayField) setValue(cfg.displayField, '');
                return;
            }

            const row = rows[0];
            setValue(cfg.valueField, row[cfg.valueColumn] || row[cfg.searchColumn] || raw);
            if (cfg.displayField) {
                setValue(cfg.displayField, row[cfg.displayColumn] || row.Name || row.Description || '');
            }

            if (lookupKey === 'AccountID') {
                setValue('LoanSeries', row.LoanSeries || getValue('LoanSeries'));
                setValue('LoanRefNo', row.LoanRefNo || getValue('LoanRefNo'));
                triggerViewFromAccountSelection('account-blur-autolookup');
            }
            if (lookupKey === 'LoanSeries') {
                setValue('LoanRefNo', row.LoanRefNo || getValue('LoanRefNo'));
                triggerViewFromAccountSelection('series-blur-autolookup');
            }
        } catch (error) {
            console.warn('[LoanMaintenance] auto lookup failed for', lookupKey, error);
            if (cfg.displayField) setValue(cfg.displayField, '');
        }
    }

    function extractSearchRows(response) {
        if (!response || !response.success) return [];
        const data = response.data;
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.Details)) return data.Details;
        if (Array.isArray(data.details?.SearchResults)) return data.details.SearchResults;
        if (Array.isArray(data.Records)) return data.Records;
        if (data.Details) return [data.Details];
        return [];
    }

    function wireActionButtons() {
        bindAction('[data-action-mode="view"]', () => getLoan(0, 'A'));
        bindAction('[data-action-mode="add"]', handleAdd);
        bindAction('[data-action-mode="edit"]', () => {
            if (state.currentMode !== 'VIEW' || !state.currentLoan) {
                showWarning('Load a loan in View mode before editing');
                return;
            }
            if (!isLoanActive(state.currentLoan)) {
                showWarning('Only active loans can be edited. This loan is in a closed status.');
                return;
            }
            setMode('EDIT');
        });
        bindAction('[data-action-submit="save"]', handleSave);
        bindAction('[data-action-submit="cancel"]', handleCancel);

        bindAction('[data-action-nav="prev-account"]', () => getLoan(-1, 'A'));
        bindAction('[data-action-nav="next-account"]', () => getLoan(1, 'A'));
        bindAction('[data-action-nav="prev-series"]', () => getLoan(-1, 'S'));
        bindAction('[data-action-nav="next-series"]', () => getLoan(1, 'S'));
        bindAction('[data-action-nav="prev-ref"]', () => getLoan(-1, 'R'));
        bindAction('[data-action-nav="next-ref"]', () => getLoan(1, 'R'));
    }

    function wireAutoViewTriggers() {
        const refEl = document.getElementById('LoanRefNo');
        if (refEl) {
            refEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    getLoan(0, 'A');
                }
            });
        }
    }

    function triggerViewFromAccountSelection(source) {
        if (state.currentMode === 'EDIT') return;

        const branchId = getValue('BranchID');
        const accountId = getValue('AccountID');
        const loanSeries = getValue('LoanSeries');
        if (!branchId || !accountId || !loanSeries) return;

        console.log('[LoanMaintenance] auto-view triggered from', source);
        getLoan(0, 'A');
    }

    function bindAction(selector, handler) {
        const el = document.querySelector(selector);
        if (el) el.addEventListener('click', handler);
    }

    function wireSubmoduleSidebar() {
        document.querySelectorAll('[data-child-form]').forEach(item => {
            item.addEventListener('click', () => {
                const key = item.getAttribute('data-child-form');
                const isAvailable = item.dataset.available === 'true';
                if (!isAvailable) {
                    showWarning('Submodule is listed but not migrated yet.');
                    return;
                }
                openSubmodule(key);
            });
        });
    }

    function openSubmodule(key) {
        if (!ENABLE_SUBMODULES) {
            showWarning('Submodule "' + key + '" is not implemented yet. Focus is currently on main module stability.');
            return;
        }

        const route = SUBMODULE_ROUTES[key];
        if (!route) {
            showWarning('Submodule route not configured: ' + key);
            return;
        }

        const overlay = document.querySelector('[data-child-inline]');
        const iframe = document.querySelector('[data-child-iframe]');
        const mainForm = document.querySelector('[data-main-form]');

        if (!overlay || !iframe || !mainForm) return;

        if (state.activeSubmodule === key) {
            return;
        }

        const branchId = encodeURIComponent(getValue('BranchID'));
        const accountId = encodeURIComponent(getValue('AccountID'));
        const loanSeries = encodeURIComponent(getValue('LoanSeries'));
        const query = `?moduleId=${encodeURIComponent(state.moduleId || '')}&branchId=${branchId}&accountId=${accountId}&loanSeries=${loanSeries}`;

        showLoading(true);
        iframe.onload = () => showLoading(false);
        iframe.src = route + query;
        overlay.hidden = false;
        mainForm.hidden = true;
        state.activeSubmodule = key;

        window.LoanMaintenanceState = {
            OurBranchID: getValue('BranchID'),
            AccountID: getValue('AccountID'),
            LoanSeries: getValue('LoanSeries'),
            ClientID: getValue('ClientID'),
            OperatorID: state.operatorId
        };
    }

    function wireDirtyTracking() {
        const form = document.getElementById('loan-form');
        form?.querySelectorAll('input, select, textarea').forEach(el => {
            el.addEventListener('change', () => {
                if (state.currentMode !== 'VIEW') {
                    state.isDirty = true;
                }
            });
        });
    }

    async function getLoan(direction, directionType) {
        const payload = {
            OurBranchID: getValue('BranchID'),
            ClientID: getValue('ClientID'),
            AccountID: getValue('AccountID'),
            LoanSeries: getValue('LoanSeries'),
            LoanRefNo: getValue('LoanRefNo'),
            OperatorID: state.operatorId,
            Direction: direction,
            DirectionType: directionType
        };

        if (!payload.OurBranchID || !payload.AccountID) {
            showWarning('Branch and Account are required');
            return;
        }

        try {
            showLoading(true);
            const response = await window.AppCore.invokeControllerAsync(endpoints.getLoan, payload);
            if (!(response?.success)) {
                showError(extractMessage(response, 'Failed to load loan'));
                return;
            }

            const loanPayload = extractLoanPayload(response);
            const header = getFirstDetailRow(loanPayload, ['Details02', 'details02']);
            const status = getFirstDetailRow(loanPayload, ['Details01', 'details01']);
            if (!loanPayload || (!header && !status)) {
                showWarning('No data found');
                return;
            }

            bindLoanData(loanPayload);
            state.currentLoan = loanPayload;
            setViewMode();
            enableNavigationButtons();
            showSuccess('Loan loaded');
        } catch (error) {
            showError(extractMessage(error, 'Error loading loan'));
        } finally {
            showLoading(false);
        }
    }

    function handleAdd() {
        clearEditableFields();
        state.currentLoan = null;
        state.isDirty = false;
        disableNavigationButtons();
        setEntryMode();
    }

    async function handleSave() {
        if (state.currentMode !== 'EDIT') {
            showWarning('Switch to Edit mode before saving');
            return;
        }

        const payload = {
            OurBranchID: getValue('BranchID'),
            AccountID: getValue('AccountID'),
            LoanSeries: toInt(getValue('LoanSeries')),
            LoanRefNo: toInt(getValue('LoanRefNo')),
            PurposeCodeID: getValue('LoanPurpose'),
            FundID: getValue('FundID'),
            CreditOfficerID: getValue('CreditOfficer'),
            HealthCodeID: getValue('HealthCode'),
            RepaymentMethodID: getValue('RepaymentMethod'),
            RepaymentAccountID: getValue('RepaymentAccountID'),
            SuspendInterest: document.getElementById('StopInterestAccrual')?.checked ? 1 : 0,
            ModifiedBy: state.operatorId,
            ModifiedOn: '',
            SupervisedBy: '',
            NewRecord: 2,
            BusinessLineID: getValue('LineOfBusiness'),
            LegalOfficer: getValue('LegalOfficer'),
            LegalStatusID: getValue('LegalStatus')
        };

        try {
            showLoading(true);
            const response = await window.AppCore.invokeControllerAsync(endpoints.editLoan, payload);
            if (!(response?.success)) {
                showError(extractMessage(response, 'Failed to save loan'));
                return;
            }

            state.isDirty = false;
            setMode('VIEW');
            showSuccess('Loan updated successfully');
        } catch (error) {
            showError(extractMessage(error, 'Error while saving'));
        } finally {
            showLoading(false);
        }
    }

    function handleCancel() {
        if (state.currentMode === 'EDIT' && state.currentLoan) {
            bindLoanData(state.currentLoan);
            setViewMode();
        } else {
            handleAdd();
        }
        state.isDirty = false;
    }

    function extractLoanPayload(response) {
        const envelope = response?.data ?? response ?? null;
        if (!envelope) return null;

        const candidates = [
            envelope,
            envelope?.Details,
            envelope?.details
        ];

        for (const candidate of candidates) {
            if (!candidate) continue;
            if (hasLoanDetailSets(candidate)) return candidate;
        }

        return envelope;
    }

    function hasLoanDetailSets(payload) {
        return !!(
            Array.isArray(payload?.Details01)
            || Array.isArray(payload?.details01)
            || Array.isArray(payload?.Details02)
            || Array.isArray(payload?.details02)
        );
    }

    function getFirstDetailRow(payload, keys) {
        if (!payload || !Array.isArray(keys)) return null;
        for (const key of keys) {
            const set = payload[key];
            if (Array.isArray(set) && set.length > 0) {
                return set[0] || null;
            }
        }
        return null;
    }

    function isLoanActive(loanData) {
        if (!loanData) return false;
        const status = getFirstDetailRow(loanData, ['Details01', 'details01'])
            || getFirstDetailRow(loanData, ['Details', 'details'])
            || loanData;
        const closedStatuses = new Set(['B', 'C', 'F', 'N', 'P', 'W', 'X']);
        const statusCode = String(status?.LoanStatusID || status?.LoanStatus || '').trim();
        return !closedStatuses.has(statusCode) && statusCode.length > 0;
    }

    function bindLoanData(data) {
        const status = getFirstDetailRow(data, ['Details01', 'details01'])
            || getFirstDetailRow(data, ['Details', 'details'])
            || data;
        const header = getFirstDetailRow(data, ['Details02', 'details02'])
            || getFirstDetailRow(data, ['Details01', 'details01'])
            || status;

        const fields = {
            BranchID: header?.OurBranchID || header?.BranchID || status?.OurBranchID,
            BranchName: header?.BranchName || status?.BranchName,
            ClientID: header?.ClientID || status?.ClientID,
            ClientName: header?.ClientName || header?.Name || status?.ClientName || status?.Name,
            AccountID: header?.AccountID || status?.AccountID,
            AccountName: header?.AccountName || status?.AccountName || status?.Name,
            LoanSeries: header?.LoanSeries || status?.LoanSeries,
            LoanRefNo: header?.LoanRefNo || status?.LoanRefNo,
            LoanPurpose: header?.PurposeCodeID || status?.PurposeCodeID,
            CreditOfficer: header?.CreditOfficerID || header?.CreditOfficer || status?.CreditOfficerID || status?.CreditOfficer,
            HealthCode: header?.HealthCodeID || status?.HealthCodeID,
            LegalStatus: header?.LegalStatusID || status?.LegalStatusID,
            RepaymentMethod: header?.RepaymentMethodID || status?.RepaymentMethodID,
            LoanType: header?.LoanType || status?.LoanType,
            FundID: header?.FundID || status?.FundID,
            LineOfBusiness: header?.BusinessLineID || status?.BusinessLineID,
            LegalOfficer: header?.LegalOfficerID || header?.LegalOfficer || status?.LegalOfficerID || status?.LegalOfficer,
            LegalOfficerName: header?.LegalOfficerName || status?.LegalOfficerName,
            RepaymentAccountID: header?.RepaymentAccountID || status?.RepaymentAccountID,
            RepaymentAccountName: header?.RepaymentAccountName || status?.RepaymentAccountName,
            FileNumber: header?.FileNumber || status?.FileNumber
        };

        Object.keys(fields).forEach(id => setValue(id, fields[id]));

        setText('CreatedBy', header?.CreatedBy || status?.CreatedBy);
        setText('ModifiedBy', header?.ModifiedBy || status?.ModifiedBy);
        setText('SupervisedBy', header?.SupervisedBy || status?.SupervisedBy);
        setText('CreatedOn', formatDate(header?.CreatedOn || status?.CreatedOn));
        setText('ModifiedOn', formatDate(header?.ModifiedOn || status?.ModifiedOn));
        setText('SupervisedOn', formatDate(header?.SupervisedOn || status?.SupervisedOn));

        setText('LoanBalance', formatMoney(status?.LoanBalance));
        setText('LoanAmount', formatMoney(status?.LoanAmount));
        setText('DisbursedAmount', formatMoney(status?.DisbursedAmount));
        setText('FirstDisbursementDate', formatDate(status?.FirstDisbursementDate));
        setText('UnearnedInterest', formatMoney(status?.UnearnedInterest));
        setText('OutstandingPrincipal', formatMoney(status?.OutstandingPrincipal));
        setText('InterestReceivable', formatMoney(status?.InterestReceivable));
        setText('OutstandingInterest', formatMoney(status?.OutstandingInterest));
        setText('ODueInterestReceivable', formatMoney(status?.ODueInterestReceivable));
        setText('PenaltyReceivable', formatMoney(status?.PenaltyReceivable));
        setText('LossProvisionAmount', formatMoney(status?.LossProvisionAmount));
        setText('InterestSuspended', formatMoney(status?.InterestSuspended));
        setText('LoanStatus', status?.LoanStatus);
        setText('ArrearAmount', formatMoney(status?.ArrearAmount));
        setText('ArrearDays', status?.ArrearDays);
        setText('LastRescheduleDate', formatDate(status?.LastRescheduleDate));
        setText('NoOfReschedule', status?.NoOfReschedule);
        setText('ProductID', status?.ProductID);
        setText('CurrencyID', status?.CurrencyID);
        setText('SanctionAmount', formatMoney(status?.SanctionedAmount || status?.SanctionAmount));

        const closedStatuses = new Set(['B', 'C', 'F', 'N', 'P', 'W', 'X']);
        const statusCode = String(status?.LoanStatusID || status?.LoanStatus || '').trim();
        const imgClosed = document.getElementById('imgClosed');
        if (imgClosed) {
            imgClosed.hidden = !closedStatuses.has(statusCode);
        }

        if (document.getElementById('StopInterestAccrual')) {
            const suspend = header?.SuspendInterest ?? status?.SuspendInterest ?? header?.StopInterestAccrual ?? status?.StopInterestAccrual;
            document.getElementById('StopInterestAccrual').checked = suspend === 1 || suspend === true || suspend === '1';
        }
    }

    function setMode(mode) {
        state.currentMode = mode;

        const editableFieldIds = [
            'LoanPurpose', 'CreditOfficer', 'HealthCode', 'LegalStatus', 'RepaymentMethod',
            'StopInterestAccrual', 'LoanType', 'FundID', 'LineOfBusiness', 'LegalOfficer',
            'RepaymentAccountID', 'LoanRefNo', 'FileNumber'
        ];

        const canEdit = mode === 'EDIT';
        editableFieldIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (el.type === 'checkbox') {
                el.disabled = !canEdit;
            } else {
                el.readOnly = !canEdit;
                el.disabled = !canEdit;
            }
        });

        if (mode === 'ENTRY') {
            setActionButtonsState({ view: true, edit: false, save: false, cancel: true });
        } else if (mode === 'VIEW') {
            const canEdit = state.currentLoan && isLoanActive(state.currentLoan);
            setActionButtonsState({ view: false, edit: canEdit, save: false, cancel: true });
        } else {
            setActionButtonsState({ view: false, edit: false, save: true, cancel: true });
        }
    }

    function setEntryMode() {
        setMode('ENTRY');
        const branch = state.branchId || getValue('BranchID');
        if (branch) setValue('BranchID', branch);
    }

    function setViewMode() {
        setMode('VIEW');
    }

    function setActionButtonsState(flags) {
        setBtnEnabled('[data-action-mode="view"]', !!flags.view);
        setBtnEnabled('[data-action-mode="edit"]', !!flags.edit);
        setBtnEnabled('[data-action-submit="save"]', !!flags.save);
        setBtnEnabled('[data-action-submit="cancel"]', !!flags.cancel);
        setBtnEnabled('[data-action-mode="add"]', true);
    }

    function clearEditableFields() {
        ['ClientID','ClientName','AccountID','AccountName','LoanSeries','LoanRefNo','FileNumber','LoanPurpose','CreditOfficer','CreditOfficerName','HealthCode','LegalStatus','RepaymentMethod','LoanType','FundID','FundName','LineOfBusiness','LegalOfficer','LegalOfficerName','RepaymentAccountID','RepaymentAccountName'].forEach(id => setValue(id, ''));
        ['LoanBalance','LoanAmount','DisbursedAmount','FirstDisbursementDate','UnearnedInterest','OutstandingPrincipal','InterestReceivable','OutstandingInterest','ODueInterestReceivable','PenaltyReceivable','LossProvisionAmount','InterestSuspended','LoanStatus','ArrearAmount','ArrearDays','LastRescheduleDate','NoOfReschedule','ProductID','CurrencyID','SanctionAmount','CreatedBy','CreatedOn','ModifiedBy','ModifiedOn','SupervisedBy','SupervisedOn'].forEach(id => setText(id, ''));
        const chk = document.getElementById('StopInterestAccrual');
        if (chk) chk.checked = false;
        const imgClosed = document.getElementById('imgClosed');
        if (imgClosed) imgClosed.hidden = true;
    }

    function setBtnEnabled(selector, enabled) {
        const el = document.querySelector(selector);
        if (el) el.disabled = !enabled;
    }

    function enableNavigationButtons() {
        document.querySelectorAll('[data-action-nav]').forEach(btn => {
            btn.disabled = false;
        });
    }

    function disableNavigationButtons() {
        document.querySelectorAll('[data-action-nav]').forEach(btn => {
            btn.disabled = true;
        });
    }

    function showLoading(show) {
        const overlay = document.getElementById('pageLoadingOverlay');
        if (overlay) {
            overlay.hidden = !show;
        }
    }

    function showSuccess(msg) {
        window.AppCore?.showToastMessage?.(msg, 'success') || console.log(msg);
    }

    function showError(msg) {
        window.AppCore?.showToastMessage?.(msg, 'error') || console.error(msg);
    }

    function showWarning(msg) {
        window.AppCore?.showToastMessage?.(msg, 'warning') || console.warn(msg);
    }

    function extractMessage(source, fallback) {
        const candidates = [
            source?.message,
            source?.Message,
            source?.error,
            source?.ErrorMessage,
            source?.data?.message,
            source?.data?.Message,
            source?.data?.error,
            source?.data?.ErrorMessage
        ];
        for (const c of candidates) {
            if (typeof c === 'string' && c.trim()) return c.trim();
        }
        return fallback;
    }

    function getValue(id) {
        const el = document.getElementById(id);
        return el ? String(el.value || '').trim() : '';
    }

    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value == null ? '' : String(value);
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value == null ? '' : String(value);
    }

    function formatDate(value) {
        if (!value) return '';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return String(value);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    function formatMoney(value) {
        if (value == null || value === '') return '';
        const n = Number(String(value).replace(/,/g, ''));
        if (!Number.isFinite(n)) return String(value);
        return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function toInt(v) {
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : null;
    }

    function escapeSqlLike(value) {
        return String(value || '').replace(/'/g, "''");
    }

    window.LoanMaintenanceModule = {
        init,
        getLoan,
        handleSave,
        handleCancel,
        setMode,
        getState: () => ({ ...state })
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
