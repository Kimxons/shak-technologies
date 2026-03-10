(function () {
    'use strict';

    const state = {
        moduleId: document.getElementById('moduleId_group_bank_details')?.value || '100'
    };

    let searchModal = null;
    let mainMode = 'view';
    let inlineMode = 'idle';
    let selectedAccount = null;
    const supervisionState = {
        required: false,
        locked: false,
        eventType: 'NONE'
    };

    const LOOKUP_CONFIG = {
        Bank: {
            tableID: 'LCBankID',
            displayField: 'InstitutionName',
            valueField: 'BankId',
            displayColumn: 'BankName',
            valueColumn: 'BankID'
        },
        Branch: {
            tableID: 'BranchID',
            displayField: 'BranchName',
            valueField: 'BranchId',
            displayColumn: 'BranchName',
            valueColumn: 'OurBranchID'
        }
    };

    const bankAccounts = [];

    const FORM_IDS = {
        accountType: 'AccountType',
        institutionType: 'InstitutionType',
        bankId: 'BankId',
        institutionName: 'InstitutionName',
        branchId: 'BranchId',
        branchName: 'BranchName',
        titleOfAccount: 'TitleOfAccount',
        accountId: 'AccountId',
        signatory: 'Signatory',
        balance: 'Balance',
        advanceAmount: 'AdvanceAmount',
        terms: 'Terms',
        monthlyPayment: 'MonthlyPayment'
    };

    const parentContext = {
        branchId: '',
        centerId: '',
        operatorId: ''
    };

    function formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch {
            return dateString || '-';
        }
    }

    function populateAuditFields(account) {
        if (!account) {
            document.getElementById('createdBy').textContent = '-';
            document.getElementById('createdOn').textContent = '-';
            document.getElementById('modifiedBy').textContent = '-';
            document.getElementById('modifiedOn').textContent = '-';
            document.getElementById('supervisedBy').textContent = '-';
            document.getElementById('supervisedOn').textContent = '-';
            return;
        }

        document.getElementById('createdBy').textContent = account.CreatedBy || account.createdBy || '-';
        document.getElementById('createdOn').textContent = formatDate(account.CreatedOn || account.createdOn);
        document.getElementById('modifiedBy').textContent = account.ModifiedBy || account.modifiedBy || '-';
        document.getElementById('modifiedOn').textContent = formatDate(account.ModifiedOn || account.modifiedOn);
        document.getElementById('supervisedBy').textContent = account.SupervisedBy || account.supervisedBy || '-';
        document.getElementById('supervisedOn').textContent = formatDate(account.SupervisedOn || account.supervisedOn);
    }

    function extractBackendErrorMessage(response, fallbackMessage) {
        const payload = response?.data ?? response;
        const details0 = Array.isArray(payload?.Details) ? payload.Details[0] : null;
        const details1 = Array.isArray(payload?.Details01) ? payload.Details01[0] : null;
        const err = response?.error || payload?.error || details0?.Error || details1?.Error;
        const msg = response?.message
            || payload?.message
            || payload?.Message
            || details0?.Message
            || details1?.Message
            || err?.message
            || err?.Message
            || (typeof err === 'string' ? err : '');

        return (msg && String(msg).trim()) ? String(msg).trim() : fallbackMessage;
    }

    function normalizeRightsPayload(response) {
        const payload = response?.data ?? response;
        if (Array.isArray(payload?.Details01)) return payload.Details01[0];
        if (Array.isArray(payload?.Details)) return payload.Details[0];
        if (Array.isArray(payload?.data)) return payload.data[0];
        return payload;
    }

    function extractSupervisionFlag(payload) {
        if (payload === undefined || payload === null) return false;
        if (payload === true || payload === 'true') return true;
        if (payload === false || payload === 'false') return false;
        if (payload === '1' || payload === 1) return true;
        if (payload === '0' || payload === 0) return false;

        const record = normalizeRightsPayload(payload);
        const flag = record?.IsSupervised
            ?? record?.isSupervised
            ?? record?.AskSupervision
            ?? record?.askSupervision
            ?? record?.Supervised
            ?? record?.supervised;

        if (flag === true || flag === 'true') return true;
        if (flag === false || flag === 'false') return false;
        if (flag === '1' || flag === 1) return true;
        if (flag === '0' || flag === 0) return false;
        return false;
    }

    function extractRightsAllowed(payload) {
        const record = normalizeRightsPayload(payload);
        const flag = record?.HasRights
            ?? record?.hasRights
            ?? record?.HasRight
            ?? record?.hasRight
            ?? record?.CanProceed
            ?? record?.canProceed;

        if (flag === false || flag === 'false' || flag === '0' || flag === 0) return false;
        return true;
    }

    function getMaxUpdateCount() {
        if (!bankAccounts.length) return 0;
        return Math.max(...bankAccounts.map(acc => acc.originalUpdateCount ?? 0));
    }

    async function ensureUserRights(eventType) {
        // TODO: Implement p_UserRights stored procedure
        // Temporarily disabled - always return true to allow operations
        resolveParentContext();
        supervisionState.required = false;
        supervisionState.eventType = eventType;
        return true;

        /* COMMENTED OUT UNTIL p_UserRights IS IMPLEMENTED
        if (!window.GroupService?.checkUserRights) {
            showMessage('User rights service not available', 'error');
            return false;
        }

        try {
            const requestData = {
                OperatorID: parentContext.operatorId,
                ModuleID: state.moduleId,
                EventType: eventType,
                OurBranchID: parentContext.branchId,
                ClientID: parentContext.centerId || '',
                AccountID: '',
                SVUpdateCount: getMaxUpdateCount()
            };

            const response = await window.GroupService.checkUserRights(requestData);
            const isAllowed = response?.success === false
                ? false
                : extractRightsAllowed(response);

            if (!isAllowed) {
                showMessage(response?.message || 'You do not have rights to perform this action', 'error');
                return false;
            }

            supervisionState.required = extractSupervisionFlag(response);
            supervisionState.eventType = eventType;
            return true;
        } catch (error) {
            console.error('[GroupBankDetails] User rights check failed:', error);
            showMessage('Failed to verify user rights', 'error');
            return false;
        }
        */
    }

    function promptForRemarks(eventType) {
        const message = `Enter remarks for ${eventType.toLowerCase()} supervision:`;
        const remarks = window.prompt(message, '');
        if (remarks === null) return null;
        return remarks.trim();
    }

    function setSupervisionLock(locked) {
        supervisionState.locked = locked;
    }

    function getInput(id) {
        return document.getElementById(id);
    }

    function getValue(id) {
        return getInput(id)?.value?.trim() || '';
    }

    function setValue(id, value) {
        const input = getInput(id);
        if (input) {
            input.value = value ?? '';
        }
    }

    function setDisabled(element, disabled) {
        if (element) {
            element.disabled = disabled;
        }
    }

    function setReadonly(element, readonly) {
        if (element) {
            element.readOnly = readonly;
        }
    }

    function clearBankFields() {
        setValue(FORM_IDS.bankId, '');
        setValue(FORM_IDS.institutionName, '');
        clearBranchFields();
    }

    function clearBranchFields() {
        setValue(FORM_IDS.branchId, '');
        setValue(FORM_IDS.branchName, '');
    }

    async function fetchBankDetails(bankId) {
        if (!bankId) return;

        try {
            const LookupService = window.parent?.LookupService || window.LookupService;
            if (!LookupService) {
                console.warn('[GroupBankDetails] LookupService not available');
                return;
            }

            // Use search to get bank details
            const requestData = {
                TableID: 'LCBankID',
                ModuleID: state.moduleId,
                WhereStmt: '',
                AdvFilterString: `BankID='${bankId}'`
            };

            const response = await LookupService.search(requestData);
            console.log('[GroupBankDetails] Bank details response:', response);
            
            if (response?.success && response?.data?.length > 0) {
                const bank = response.data[0];
                console.log('[GroupBankDetails] Bank record:', bank);
                
                // Try multiple field name variations
                const bankName = bank.BankName || bank.bankname || bank.BANKNAME 
                    || bank.ShortName || bank.shortname || bank.SHORTNAME
                    || bank.InstitutionName || bank.institutionname || '';
                    
                setValue(FORM_IDS.institutionName, bankName);
                console.log('[GroupBankDetails] Set institution name to:', bankName);
            } else {
                showMessage('Bank not found', 'warning');
                setValue(FORM_IDS.institutionName, '');
            }
        } catch (error) {
            console.error('[GroupBankDetails] Failed to fetch bank details:', error);
        }
    }

    async function fetchBranchDetails(branchId) {
        if (!branchId) return;

        const bankId = getValue(FORM_IDS.bankId);
        if (!bankId) {
            showMessage('Please select a bank first', 'warning');
            setValue(FORM_IDS.branchId, '');
            return;
        }

        try {
            const LookupService = window.parent?.LookupService || window.LookupService;
            if (!LookupService) {
                console.warn('[GroupBankDetails] LookupService not available');
                return;
            }

            resolveParentContext();
            const advFilter = parentContext.branchId 
                ? `BankID='${bankId}' AND (OurBranchID='${branchId}' OR BranchID='${branchId}') AND OurBranchID='${parentContext.branchId}'`
                : `BankID='${bankId}' AND (OurBranchID='${branchId}' OR BranchID='${branchId}')`;

            const requestData = {
                TableID: 'BranchID',
                ModuleID: state.moduleId,
                WhereStmt: '',
                AdvFilterString: advFilter
            };

            const response = await LookupService.search(requestData);
            console.log('[GroupBankDetails] Branch details response:', response);
            
            if (response?.success && response?.data?.length > 0) {
                const branch = response.data[0];
                console.log('[GroupBankDetails] Branch record:', branch);
                
                // Try multiple field name variations
                const branchName = branch.BranchName || branch.branchname || branch.BRANCHNAME || '';
                setValue(FORM_IDS.branchName, branchName);
                console.log('[GroupBankDetails] Set branch name to:', branchName);
            } else {
                showMessage('Branch not found', 'warning');
                setValue(FORM_IDS.branchName, '');
            }
        } catch (error) {
            console.error('[GroupBankDetails] Failed to fetch branch details:', error);
        }
    }

    function resolveParentContext() {
        const parentDoc = window.parent?.document;
        parentContext.branchId = parentDoc?.getElementById('branchId')?.value?.trim() || '';
        parentContext.centerId = parentDoc?.getElementById('centerId')?.value?.trim() || '';
        parentContext.operatorId = window.parent?.Environment?.OperatorID
            || window.parent?.Environment?.operatorId
            || window.Environment?.OperatorID
            || window.Environment?.operatorId
            || 'CSADM';
    }

    function normalizeBankAccounts(response) {
        const payload = response?.data ?? response;
        if (Array.isArray(payload?.Details01)) return payload.Details01;
        if (Array.isArray(payload?.Details)) return payload.Details;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload)) return payload;
        return [];
    }

    function getVisibleAccounts() {
        return bankAccounts.filter(account => account.ButtonMark !== 'R');
    }

    function getPendingAccounts() {
        return bankAccounts.filter(account => account.ButtonMark);
    }

    function populateBankAccountsTable(accounts) {
        const tbody = document.getElementById('bankAccountsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!accounts.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No records to display.</td></tr>';
            return;
        }

        accounts.forEach((account, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            row.innerHTML = `
                <td>${account.AccountID || ''}</td>
                <td>${account.InstitutionName || ''}</td>
                <td>${account.BranchID || ''}</td>
                <td>${account.BranchName || ''}</td>
                <td>${account.Balance ?? ''}</td>
                <td>${account.TitleOfAccount || ''}</td>
                <td>${account.Signatory || ''}</td>
            `;
            row.style.cursor = 'pointer';
            row.addEventListener('click', () => {
                selectAccount(account, row);
            });
            tbody.appendChild(row);
        });
    }

    function selectAccount(account, rowElement) {
        selectedAccount = account || null;
        
        // Remove active class from all rows
        document.querySelectorAll('#bankAccountsTableBody tr').forEach(tr => {
            tr.classList.remove('table-active');
        });
        
        // Add active class to clicked row
        if (rowElement) {
            rowElement.classList.add('table-active');
        }
        
        // Populate audit fields with selected account data
        populateAuditFields(account);
        
        // Populate form with selected row's data
        populateForm(account);
        
        updateButtonStates();
    }

    function populateForm(account) {
        if (!account) return;
        setValue(FORM_IDS.accountType, account.ProductTypeID || '');
        setValue(FORM_IDS.institutionType, account.InstitutionTypeID || '');
        setValue(FORM_IDS.bankId, account.BankID || '');
        setValue(FORM_IDS.institutionName, account.InstitutionName || '');
        setValue(FORM_IDS.branchId, account.BranchID || '');
        setValue(FORM_IDS.branchName, account.BranchName || '');
        setValue(FORM_IDS.titleOfAccount, account.TitleOfAccount || '');
        setValue(FORM_IDS.accountId, account.AccountID || '');
        setValue(FORM_IDS.signatory, account.Signatory || '');
        setValue(FORM_IDS.balance, account.Balance ?? '');
        setValue(FORM_IDS.advanceAmount, account.AdvanceAmount ?? '');
        setValue(FORM_IDS.terms, account.Term ?? '');
        setValue(FORM_IDS.monthlyPayment, account.MonthlyPayment ?? '');
        applyInstitutionTypeRules(inlineMode !== 'idle');
        applyAccountTypeRules(inlineMode !== 'idle');
    }

    function clearForm() {
        document.querySelectorAll('input, select').forEach(input => {
            input.value = '';
        });

        // Remove active class from all rows when clearing
        document.querySelectorAll('#bankAccountsTableBody tr').forEach(tr => {
            tr.classList.remove('table-active');
        });

        // Clear audit fields
        populateAuditFields(null);

        if (mainMode !== 'edit') {
            selectedAccount = null;
        }

        applyInstitutionTypeRules(inlineMode !== 'idle');
        applyAccountTypeRules(inlineMode !== 'idle');

        updateButtonStates();
    }

    function setFormInputsEnabled(enabled) {
        const inputs = document.querySelectorAll('#AccountType, #InstitutionType, #BankId, #InstitutionName, #BranchId, #BranchName, #TitleOfAccount, #AccountId, #Signatory, #Balance, #AdvanceAmount, #Terms, #MonthlyPayment');
        inputs.forEach(input => {
            input.disabled = !enabled;
        });

        document.querySelectorAll('.btn-lookup[data-lookup]').forEach(btn => {
            btn.disabled = !enabled;
        });

        applyInstitutionTypeRules(enabled);
        applyAccountTypeRules(enabled);
    }

    function applyInstitutionTypeRules(isEditing) {
        const institutionType = getValue(FORM_IDS.institutionType);
        const isClearing = institutionType === 'C';
        const bankIdInput = getInput(FORM_IDS.bankId);
        const bankNameInput = getInput(FORM_IDS.institutionName);
        const branchIdInput = getInput(FORM_IDS.branchId);
        const branchNameInput = getInput(FORM_IDS.branchName);
        const bankLookupBtn = document.querySelector('.btn-lookup[data-lookup="Bank"]');
        const branchLookupBtn = document.querySelector('.btn-lookup[data-lookup="Branch"]');

        if (!isEditing) {
            setDisabled(bankIdInput, true);
            setDisabled(branchIdInput, true);
            setDisabled(bankNameInput, true);
            setDisabled(branchNameInput, true);
            setReadonly(bankIdInput, true);
            setReadonly(branchIdInput, true);
            setReadonly(bankNameInput, true);
            setReadonly(branchNameInput, true);
            setDisabled(bankLookupBtn, true);
            setDisabled(branchLookupBtn, true);
            return;
        }

        if (isClearing) {
            setDisabled(bankIdInput, false);
            setDisabled(branchIdInput, false);
            setDisabled(bankNameInput, false);
            setDisabled(branchNameInput, false);
            setReadonly(bankIdInput, true);
            setReadonly(branchIdInput, true);
            setReadonly(bankNameInput, true);
            setReadonly(branchNameInput, true);
            setDisabled(bankLookupBtn, false);
            setDisabled(branchLookupBtn, !getValue(FORM_IDS.bankId));
        } else {
            setDisabled(bankIdInput, true);
            setDisabled(branchIdInput, true);
            setDisabled(bankNameInput, false);
            setDisabled(branchNameInput, false);
            setReadonly(bankIdInput, true);
            setReadonly(branchIdInput, true);
            setReadonly(bankNameInput, false);
            setReadonly(branchNameInput, false);
            // Keep lookups available in edit/add to let users select from search modal.
            setDisabled(bankLookupBtn, false);
            setDisabled(branchLookupBtn, !getValue(FORM_IDS.bankId));
        }
    }

    function applyAccountTypeRules(isEditing) {
        const accountType = getValue(FORM_IDS.accountType);
        const advanceAmountInput = getInput(FORM_IDS.advanceAmount);
        const monthlyPaymentInput = getInput(FORM_IDS.monthlyPayment);
        const termsInput = getInput(FORM_IDS.terms);

        if (!isEditing) {
            setDisabled(advanceAmountInput, true);
            setDisabled(monthlyPaymentInput, true);
            setDisabled(termsInput, true);
            return;
        }

        if (accountType === 'LN') {
            setDisabled(advanceAmountInput, false);
            setDisabled(monthlyPaymentInput, false);
            setDisabled(termsInput, false);
        } else if (accountType === 'RD') {
            setDisabled(advanceAmountInput, true);
            setValue(FORM_IDS.advanceAmount, '');
            setDisabled(monthlyPaymentInput, false);
            setDisabled(termsInput, false);
        } else {
            setDisabled(advanceAmountInput, true);
            setDisabled(monthlyPaymentInput, true);
            setDisabled(termsInput, true);
            setValue(FORM_IDS.advanceAmount, '');
            setValue(FORM_IDS.monthlyPayment, '');
            setValue(FORM_IDS.terms, '');
        }
    }

    function updateButtonStates() {
        const visibleAccounts = getVisibleAccounts();
        const hasSelection = !!selectedAccount;
        const hasData = visibleAccounts.length > 0;
        const hasPending = getPendingAccounts().length > 0;
        const isInlineEditing = inlineMode !== 'idle';

        const btnView = document.querySelector('[data-action="view"]');
        const btnAdd = document.querySelector('[data-action="add"]');
        const btnEdit = document.querySelector('[data-action="edit"]');
        const btnDelete = document.querySelector('[data-action="delete"]');
        const btnSave = document.querySelector('[data-action="save"]');
        const btnCancel = document.querySelector('[data-action="cancel"]');

        if (supervisionState.locked) {
            if (btnView) btnView.disabled = false;
            if (btnAdd) btnAdd.disabled = true;
            if (btnEdit) btnEdit.disabled = true;
            if (btnDelete) btnDelete.disabled = true;
            if (btnSave) btnSave.disabled = true;
            if (btnCancel) btnCancel.disabled = true;
        } else if (mainMode === 'view') {
            if (btnView) btnView.disabled = true;
            if (btnAdd) btnAdd.disabled = hasData;
            if (btnEdit) btnEdit.disabled = !hasData;
            if (btnDelete) btnDelete.disabled = !hasData;
            if (btnSave) btnSave.disabled = true;
            if (btnCancel) btnCancel.disabled = true;
        } else {
            if (btnView) btnView.disabled = true;
            if (btnAdd) btnAdd.disabled = true;
            if (btnEdit) btnEdit.disabled = true;
            if (btnDelete) btnDelete.disabled = true;
            if (btnSave) btnSave.disabled = !hasPending;
            if (btnCancel) btnCancel.disabled = false;
        }

        const btnInlineNew = document.querySelector('[data-cbd-inline="new"]');
        const btnInlineAlter = document.querySelector('[data-cbd-inline="alter"]');
        const btnInlineRemove = document.querySelector('[data-cbd-inline="remove"]');
        const btnInlineUpdate = document.querySelector('[data-cbd-inline="update"]');
        const btnInlineClear = document.querySelector('[data-cbd-inline="clear"]');

        if (supervisionState.locked) {
            if (btnInlineNew) btnInlineNew.disabled = true;
            if (btnInlineAlter) btnInlineAlter.disabled = true;
            if (btnInlineRemove) btnInlineRemove.disabled = true;
            if (btnInlineUpdate) btnInlineUpdate.disabled = true;
            if (btnInlineClear) btnInlineClear.disabled = true;
        } else if (mainMode === 'add') {
            if (btnInlineNew) btnInlineNew.disabled = true;
            if (btnInlineAlter) btnInlineAlter.disabled = true;
            if (btnInlineRemove) btnInlineRemove.disabled = true;
            if (btnInlineUpdate) btnInlineUpdate.disabled = false;
            if (btnInlineClear) btnInlineClear.disabled = false;
        } else if (mainMode === 'edit') {
            if (isInlineEditing) {
                if (btnInlineNew) btnInlineNew.disabled = true;
                if (btnInlineAlter) btnInlineAlter.disabled = true;
                if (btnInlineRemove) btnInlineRemove.disabled = true;
                if (btnInlineUpdate) btnInlineUpdate.disabled = false;
                if (btnInlineClear) btnInlineClear.disabled = false;
            } else {
                if (btnInlineNew) btnInlineNew.disabled = false;
                if (btnInlineAlter) btnInlineAlter.disabled = !hasSelection;
                if (btnInlineRemove) btnInlineRemove.disabled = !hasSelection;
                if (btnInlineUpdate) btnInlineUpdate.disabled = true;
                if (btnInlineClear) btnInlineClear.disabled = true;
            }
        } else {
            if (btnInlineNew) btnInlineNew.disabled = true;
            if (btnInlineAlter) btnInlineAlter.disabled = true;
            if (btnInlineRemove) btnInlineRemove.disabled = true;
            if (btnInlineUpdate) btnInlineUpdate.disabled = true;
            if (btnInlineClear) btnInlineClear.disabled = true;
        }

        setFormInputsEnabled(!supervisionState.locked && (isInlineEditing || mainMode === 'add'));
    }

    function setButtonStatesForDataExists() {
        mainMode = 'view';
        inlineMode = 'idle';
        updateButtonStates();
    }

    function setButtonStatesForNoData() {
        mainMode = 'view';
        inlineMode = 'idle';
        updateButtonStates();
    }

    async function loadBankAccounts() {
        resolveParentContext();
        setSupervisionLock(false);

        if (!parentContext.centerId || !parentContext.branchId) {
            bankAccounts.length = 0;
            populateBankAccountsTable([]);
            clearForm();
            setButtonStatesForNoData();
            showMessage('Please select Branch and Center first.', 'warning');
            return;
        }

        if (!window.GroupService?.getGroupBankAccounts) {
            showMessage('GroupService not available', 'error');
            return;
        }

        try {
            const requestData = {
                GroupID: parentContext.centerId,
                OurBranchID: parentContext.branchId,
                OperatorID: parentContext.operatorId
            };

            const response = await window.GroupService.getGroupBankAccounts(requestData);
            const accounts = normalizeBankAccounts(response).map(account => ({
                ...account,
                originalUpdateCount: account.UpdateCount ?? account.updateCount ?? 0,
                ButtonMark: account.ButtonMark || ''
            }));

            bankAccounts.length = 0;
            bankAccounts.push(...accounts);
            selectedAccount = null;
            populateBankAccountsTable(getVisibleAccounts());
            clearForm();

            if (bankAccounts.length > 0) {
                setButtonStatesForDataExists();
            } else {
                setButtonStatesForNoData();
            }
        } catch (error) {
            console.error('[GroupBankDetails] Failed to load bank accounts:', error);
            bankAccounts.length = 0;
            populateBankAccountsTable([]);
            clearForm();
            setButtonStatesForNoData();
            showMessage('Failed to load bank accounts', 'error');
        }
    }

    function getFormData() {
        return {
            accountId: getValue(FORM_IDS.accountId),
            accountType: getValue(FORM_IDS.accountType),
            institutionType: getValue(FORM_IDS.institutionType),
            bankId: getValue(FORM_IDS.bankId),
            institutionName: getValue(FORM_IDS.institutionName),
            branchId: getValue(FORM_IDS.branchId),
            branchName: getValue(FORM_IDS.branchName),
            titleOfAccount: getValue(FORM_IDS.titleOfAccount),
            signatory: getValue(FORM_IDS.signatory),
            balance: getValue(FORM_IDS.balance),
            advanceAmount: getValue(FORM_IDS.advanceAmount),
            terms: getValue(FORM_IDS.terms),
            monthlyPayment: getValue(FORM_IDS.monthlyPayment)
        };
    }

    function validateFormData(data) {
        if (!data.accountType) {
            showMessage('Account Type is required', 'error');
            return false;
        }

        if (!data.institutionType) {
            showMessage('Institution Type is required', 'error');
            return false;
        }

        if (data.institutionType === 'C') {
            if (!data.bankId) {
                showMessage('Bank ID is required', 'error');
                return false;
            }
            if (!data.institutionName) {
                showMessage('Institution Name is required', 'error');
                return false;
            }
            if (!data.branchId) {
                showMessage('Branch ID is required', 'error');
                return false;
            }
            if (!data.branchName) {
                showMessage('Branch Name is required', 'error');
                return false;
            }
            if (!data.accountId) {
                showMessage('Account ID is required', 'error');
                return false;
            }
        } else {
            if (!data.institutionName) {
                showMessage('Institution Name is required', 'error');
                return false;
            }
            if (!data.branchName) {
                showMessage('Branch Name is required', 'error');
                return false;
            }
        }

        if (!data.titleOfAccount) {
            showMessage('Title of Account is required', 'error');
            return false;
        }

        if (!data.signatory) {
            showMessage('Signatory is required', 'error');
            return false;
        }

        const balanceValue = parseFloat(data.balance);
        if (!Number.isFinite(balanceValue) || balanceValue <= 0) {
            showMessage('Balance must be greater than zero', 'error');
            return false;
        }

        if (data.accountType === 'LN') {
            if (!validateNonNegative(data.advanceAmount, 'Advance Amount')) return false;
            if (!validateNonNegative(data.monthlyPayment, 'Monthly Payment')) return false;
            if (!validateNonNegative(data.terms, 'Terms')) return false;
        } else if (data.accountType === 'RD') {
            if (!validateNonNegative(data.monthlyPayment, 'Monthly Payment')) return false;
            if (!validateNonNegative(data.terms, 'Terms')) return false;
        }

        if (data.terms) {
            const termsValue = parseInt(data.terms, 10);
            if (!Number.isFinite(termsValue) || termsValue > 32767) {
                showMessage('Terms value is out of range', 'error');
                return false;
            }
        }

        return true;
    }

    function validateNonNegative(value, label) {
        if (value === '' || value === null || value === undefined) {
            showMessage(`${label} is required`, 'error');
            return false;
        }
        const numeric = parseFloat(value);
        if (!Number.isFinite(numeric) || numeric < 0) {
            showMessage(`${label} must be zero or greater`, 'error');
            return false;
        }
        return true;
    }

    function normalizeRecordFromForm(formData, baseRecord = {}) {
        return {
            ...baseRecord,
            AccountID: formData.accountId,
            ProductTypeID: formData.accountType,
            InstitutionTypeID: formData.institutionType,
            BankID: formData.bankId,
            InstitutionName: formData.institutionName,
            BranchID: formData.branchId,
            BranchName: formData.branchName,
            TitleOfAccount: formData.titleOfAccount,
            Signatory: formData.signatory,
            Balance: formData.balance,
            AdvanceAmount: formData.advanceAmount,
            Term: formData.terms,
            MonthlyPayment: formData.monthlyPayment
        };
    }

    function refreshGrid() {
        populateBankAccountsTable(getVisibleAccounts());
    }

    function generateBankAccountsXml(accounts) {
        if (!accounts || accounts.length === 0) {
            return '';
        }

        let xml = '';

        accounts.forEach((account, index) => {
            const serialId = index + 1; // 1-based SerialID for each record
            
            xml += '<dt_WFClientBankAccounts>';
            xml += `<OurBranchID>${parentContext.branchId || ''}</OurBranchID>`;
            xml += `<SerialID>${serialId}</SerialID>`;
            xml += `<InstitutionTypeID>${account.InstitutionTypeID || ''}</InstitutionTypeID>`;
            xml += `<InstitutionType>${getInstitutionTypeText(account.InstitutionTypeID)}</InstitutionType>`;
            xml += `<ProductTypeID>${account.ProductTypeID || ''}</ProductTypeID>`;
            xml += `<AdvanceAmount>${account.AdvanceAmount || '0'}</AdvanceAmount>`;
            xml += `<MonthlyPayment>${account.MonthlyPayment || '0'}</MonthlyPayment>`;
            xml += `<Balance>${account.Balance || '0'}</Balance>`;
            xml += `<Term>${account.Term || '0'}</Term>`;
            xml += `<BankID>${account.BankID || ''}</BankID>`;
            xml += `<BranchName>${account.BranchName || ''}</BranchName>`;
            xml += `<ButtonMark>${account.ButtonMark || ''}</ButtonMark>`;
            xml += `<ProductType>${getAccountTypeText(account.ProductTypeID)}</ProductType>`;
            xml += `<InstitutionName>${account.InstitutionName || ''}</InstitutionName>`;
            xml += `<TitleOfAccount>${account.TitleOfAccount || ''}</TitleOfAccount>`;
            xml += `<Signatory>${account.Signatory || ''}</Signatory>`;
            xml += `<AccountID>${account.AccountID || ''}</AccountID>`;
            xml += `<BranchID>${account.BranchID || ''}</BranchID>`;
            xml += `<GroupID>${parentContext.centerId || ''}</GroupID>`;
            xml += '</dt_WFClientBankAccounts>';
        });

        return xml;
    }

    function getInstitutionTypeText(typeId) {
        const select = getInput(FORM_IDS.institutionType);
        if (!select) return '';
        const option = Array.from(select.options).find(opt => opt.value === typeId);
        return option ? option.text : '';
    }

    function getAccountTypeText(typeId) {
        const select = getInput(FORM_IDS.accountType);
        if (!select) return '';
        const option = Array.from(select.options).find(opt => opt.value === typeId);
        return option ? option.text : '';
    }

    async function addNewAccount() {
        if (!await ensureUserRights('ADD')) return;
        mainMode = 'add';
        inlineMode = 'new';
        selectedAccount = null;
        clearForm();
        updateButtonStates();
    }

    function editAccount() {
        if (getVisibleAccounts().length === 0) {
            showMessage('No bank accounts to edit', 'warning');
            return;
        }
        ensureUserRights('EDIT').then(allowed => {
            if (!allowed) return;
            mainMode = 'edit';
            inlineMode = 'idle';
            selectedAccount = null;
            updateButtonStates();
        });
    }

    async function deleteAccount() {
        if (getVisibleAccounts().length === 0) {
            showMessage('No bank accounts to delete', 'warning');
            return;
        }

        if (!await ensureUserRights('DELETE')) return;

        const confirmed = window.confirm('Are you sure you want to delete all bank accounts for this group? This action cannot be undone.');
        if (!confirmed) return;

        try {
            let remarks = '';
            if (supervisionState.required) {
                const input = promptForRemarks('DELETE');
                if (input === null) return;
                remarks = input;
            }

            const requestData = {
                OurBranchID: parentContext.branchId,
                GroupID: parentContext.centerId,
                OperatorID: parentContext.operatorId,
                SupervisedBy: supervisionState.required ? parentContext.operatorId : '',
                Remarks: remarks
            };

            const response = await window.GroupService.deleteGroupBankAccounts(requestData);
            const hasError = !!(response?.error || response?.data?.error || response?.success === false || response?.data?.success === false);
            if (!hasError) {
                showMessage('All bank accounts deleted successfully', 'success');
                bankAccounts.length = 0;
                selectedAccount = null;
                clearForm();

                if (supervisionState.required) {
                    setSupervisionLock(true);
                    mainMode = 'view';
                    inlineMode = 'idle';
                    updateButtonStates();
                    showMessage('Delete submitted for supervision', 'info');
                } else {
                    await loadBankAccounts();
                    mainMode = 'view';
                    inlineMode = 'idle';
                    updateButtonStates();
                }
            } else {
                showMessage(extractBackendErrorMessage(response, 'Failed to delete bank accounts'), 'error');
            }
        } catch (error) {
            console.error('[GroupBankDetails] Delete error:', error);
            showMessage(error?.message || 'Failed to delete bank accounts', 'error');
        }
    }

    async function saveAccount() {
        if (getVisibleAccounts().length === 0) {
            showMessage('No data to save', 'warning');
            return;
        }

        if (mainMode === 'edit' && getPendingAccounts().length === 0) {
            showMessage('No changes to save', 'warning');
            return;
        }

        try {
            if (supervisionState.required) {
                const input = promptForRemarks('SAVE');
                if (input === null) return;
            }

            const detailRecordsXml = generateBankAccountsXml(bankAccounts);
            const maxUpdateCount = bankAccounts.length > 0
                ? Math.max(...bankAccounts.map(acc => acc.originalUpdateCount ?? 0))
                : 0;
            const updateCount = Math.max(0, Math.min(255, Number(maxUpdateCount) || 0));

            // Match dbo.p_AddEditGroupBankAccounts parameter names exactly.
            const requestData = {
                OurBranchID: parentContext.branchId,
                GroupID: parentContext.centerId,
                OperatedOn: new Date().toISOString(),
                OperatedBy: parentContext.operatorId,
                SupervisedBy: supervisionState.required ? parentContext.operatorId : null,
                UpdateCount: updateCount,
                DetailRecords: detailRecordsXml
            };

            const response = await window.GroupService.addEditGroupBankAccounts(requestData);
            const hasError = !!(response?.error || response?.data?.error || response?.success === false || response?.data?.success === false);
            if (!hasError) {
                if (supervisionState.required) {
                    showMessage('Changes submitted for supervision', 'info');
                    setSupervisionLock(true);
                    mainMode = 'view';
                    inlineMode = 'idle';
                    selectedAccount = null;
                    updateButtonStates();
                } else {
                    showMessage('Bank accounts saved successfully', 'success');
                    await loadBankAccounts();
                    mainMode = 'view';
                    inlineMode = 'idle';
                    selectedAccount = null;
                    updateButtonStates();
                }
            } else {
                showMessage(extractBackendErrorMessage(response, 'Failed to save bank accounts'), 'error');
            }
        } catch (error) {
            console.error('[GroupBankDetails] Save error:', error);
            showMessage(error?.message || 'Failed to save bank accounts', 'error');
        }
    }

    function cancelOperation() {
        const hasChanges = getPendingAccounts().length > 0;
        if ((mainMode === 'add' || mainMode === 'edit') && hasChanges) {
            const confirmed = window.confirm('Discard changes?');
            if (!confirmed) return;
        }
        mainMode = 'view';
        inlineMode = 'idle';
        supervisionState.required = false;
        selectedAccount = null;
        clearForm();
        loadBankAccounts();
    }

    function handleInlineAction(action) {
        switch (action) {
            case 'new':
                if (mainMode !== 'edit') return;
                inlineMode = 'new';
                selectedAccount = null;
                clearForm();
                updateButtonStates();
                break;
            case 'alter':
                if (mainMode !== 'edit' || !selectedAccount) return;
                inlineMode = 'alter';
                populateForm(selectedAccount);
                updateButtonStates();
                break;
            case 'remove':
                if (mainMode !== 'edit') return;
                removeSelectedAccount();
                break;
            case 'update':
                updateAccount();
                break;
            case 'clear':
                if (inlineMode === 'idle') return;
                if (!window.confirm('Clear current changes?')) return;
                inlineMode = mainMode === 'add' ? 'new' : 'idle';
                selectedAccount = null;
                clearForm();
                updateButtonStates();
                break;
        }
    }

    function updateAccount() {
        const formData = getFormData();
        if (!validateFormData(formData)) return;

        if (mainMode === 'add' || inlineMode === 'new') {
            const newRecord = normalizeRecordFromForm(formData, {
                originalUpdateCount: 0,
                ButtonMark: 'N'
            });
            bankAccounts.push(newRecord);
            showMessage('Account added to grid', 'success');
        } else if (inlineMode === 'alter' && selectedAccount) {
            const accountIdToMatch = selectedAccount.AccountID || selectedAccount.accountId;
            const index = bankAccounts.findIndex(acc => (acc.AccountID || acc.accountId) === accountIdToMatch);
            if (index > -1) {
                const existing = bankAccounts[index];
                bankAccounts[index] = normalizeRecordFromForm(formData, {
                    ...existing,
                    ButtonMark: existing.ButtonMark === 'N' ? 'N' : 'A'
                });
                showMessage('Account updated in grid', 'success');
            }
        }

        refreshGrid();
        if (mainMode === 'add') {
            inlineMode = 'new';
        } else {
            inlineMode = 'idle';
        }
        selectedAccount = null;
        clearForm();
        updateButtonStates();
    }

    function removeSelectedAccount() {
        if (!selectedAccount) return;
        const visibleAccounts = getVisibleAccounts();
        if (visibleAccounts.length === 1 && mainMode === 'edit') {
            showMessage('At least one record must remain', 'warning');
            return;
        }

        const accountIdToMatch = selectedAccount.AccountID || selectedAccount.accountId;
        const index = bankAccounts.findIndex(acc => (acc.AccountID || acc.accountId) === accountIdToMatch);
        if (index > -1) {
            const existing = bankAccounts[index];
            if (existing.ButtonMark === 'N') {
                bankAccounts.splice(index, 1);
            } else {
                bankAccounts[index] = {
                    ...existing,
                    ButtonMark: 'R'
                };
            }

            refreshGrid();
            selectedAccount = null;
            clearForm();
            showMessage('Account removed from grid', 'success');

            inlineMode = 'idle';
            updateButtonStates();
        }
    }

    function init() {
        // Try to get AppCore from parent window (since this runs in iframe)
        const appCore = window.parent?.AppCore || window.top?.AppCore || window.AppCore;
        
        // Try to get SearchModal from parent or current window
        const SearchModalClass = window.parent?.SearchModal || window.SearchModal;
        
        // Initialize search modal with better error handling
        if (SearchModalClass) {
            try {
                searchModal = new SearchModalClass(appCore);
                console.log('[GroupBankDetails] SearchModal initialized successfully from', window.parent?.SearchModal ? 'parent' : 'window');
            } catch (error) {
                console.error('[GroupBankDetails] Failed to initialize SearchModal:', error);
            }
        } else {
            console.warn('[GroupBankDetails] SearchModal class not found in window or parent. Lookup functionality will be limited.');
        }

        wireSectionToggles();
        wireLookupButtons();
        wireHeaderButtons();
        wireInlineButtons();
        wireFieldEvents();
        loadBankAccounts();
        updateButtonStates();
    }

    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.closest('.form-section');
                const content = section?.querySelector('[data-section-content]');
                const icon = header.querySelector('.section-toggle-btn i');

                if (!content) return;

                const isHidden = content.hidden === true;
                content.hidden = !isHidden;
                if (icon) {
                    icon.className = isHidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
                }
            });
        });
    }

    function wireLookupButtons() {
        document.querySelectorAll('.btn-lookup[data-lookup]').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-lookup');
                openLookup(key);
            });
        });
    }

    function wireFieldEvents() {
        const institutionType = getInput(FORM_IDS.institutionType);
        institutionType?.addEventListener('change', () => {
            clearBankFields();
            applyInstitutionTypeRules(inlineMode !== 'idle');
        });

        const accountType = getInput(FORM_IDS.accountType);
        accountType?.addEventListener('change', () => {
            applyAccountTypeRules(inlineMode !== 'idle');
        });

        const bankId = getInput(FORM_IDS.bankId);
        bankId?.addEventListener('change', () => {
            clearBranchFields();
            applyInstitutionTypeRules(inlineMode !== 'idle');
        });

        // Add blur handlers for auto-fetch
        bankId?.addEventListener('blur', async () => {
            const value = bankId.value?.trim();
            if (value && !getValue(FORM_IDS.institutionName)) {
                await fetchBankDetails(value);
            }
        });

        const branchId = getInput(FORM_IDS.branchId);
        branchId?.addEventListener('blur', async () => {
            const value = branchId.value?.trim();
            if (value && !getValue(FORM_IDS.branchName)) {
                await fetchBranchDetails(value);
            }
        });
    }

    function openLookup(key) {
        const config = LOOKUP_CONFIG[key];
        if (!config) {
            console.warn('[GroupBankDetails] Lookup config not found:', key);
            return;
        }

        // Try to initialize searchModal if it wasn't initialized earlier
        if (!searchModal) {
            const appCore = window.parent?.AppCore || window.top?.AppCore || window.AppCore;
            const SearchModalClass = window.parent?.SearchModal || window.SearchModal;
            
            if (SearchModalClass) {
                try {
                    searchModal = new SearchModalClass(appCore);
                    console.log('[GroupBankDetails] SearchModal lazy-initialized from', window.parent?.SearchModal ? 'parent' : 'window');
                } catch (error) {
                    console.error('[GroupBankDetails] Failed to lazy-initialize SearchModal:', error);
                    showMessage('Search functionality is not available. Please refresh the page.', 'error');
                    return;
                }
            } else {
                console.error('[GroupBankDetails] SearchModal class not found in window or parent');
                showMessage('Search functionality is not available. Please ensure searchModal.js is loaded.', 'error');
                return;
            }
        }

        // Ensure modal instance always has a valid AppCore reference before opening.
        if (!searchModal.appCore) {
            searchModal.appCore = window.parent?.AppCore || window.top?.AppCore || window.AppCore;
        }

        resolveParentContext();
        let advFilterString = '';
        if (key === 'Branch') {
            const bankId = getValue(FORM_IDS.bankId);
            if (!bankId) {
                showMessage('Please select a bank first', 'warning');
                return;
            }
            const branchId = parentContext.branchId ? `OurBranchID='${parentContext.branchId}'` : '';
            advFilterString = branchId
                ? `BankID='${bankId}' AND ${branchId}`
                : `BankID='${bankId}'`;
        }

        searchModal.open({
            tableID: config.tableID,
            moduleID: state.moduleId,
            whereStmt: '',
            advFilterString,
            onSelect: (row) => {
                console.log('[GroupBankDetails] Search row selected:', row);
                console.log('[GroupBankDetails] Config:', config);
                
                // Try multiple case variations for the value column (BankID)
                const value = row?.[config.valueColumn] 
                    ?? row?.[config.valueColumn.toLowerCase()] 
                    ?? row?.[config.valueColumn.toUpperCase()] 
                    ?? row?.[config.valueField] 
                    ?? '';
                
                // Try multiple case variations for the display column (BankName)
                const display = row?.[config.displayColumn] 
                    ?? row?.[config.displayColumn.toLowerCase()] 
                    ?? row?.[config.displayColumn.toUpperCase()] 
                    ?? row?.['ShortName']
                    ?? row?.['shortname']
                    ?? row?.[config.displayField] 
                    ?? '';

                console.log('[GroupBankDetails] Extracted value:', value, 'display:', display);

                const valueField = getInput(config.valueField);
                if (valueField) {
                    valueField.value = value || '';
                    console.log('[GroupBankDetails] Set', config.valueField, 'to:', value);
                }

                const displayField = getInput(config.displayField);
                if (displayField) {
                    displayField.value = display || '';
                    console.log('[GroupBankDetails] Set', config.displayField, 'to:', display);
                }

                if (key === 'Bank') {
                    clearBranchFields();
                    applyInstitutionTypeRules(inlineMode !== 'idle');
                }
            }
        }).catch(err => {
            console.error('[GroupBankDetails] Lookup open failed:', err);
            showMessage('Failed to open search: ' + (err.message || 'Unknown error'), 'error');
        });
    }

    function wireHeaderButtons() {
        const closeBtn = document.getElementById('btnClose');
        const refreshBtn = document.getElementById('btnRefresh');

        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('[GroupBankDetails] Close button clicked');
                closeSubmodule();
            });
        } else {
            console.warn('[GroupBankDetails] Close button not found');
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('[GroupBankDetails] Refresh button clicked');
                window.location.reload();
            });
        } else {
            console.warn('[GroupBankDetails] Refresh button not found');
        }
    }

    function closeSubmodule() {
        try {
            const parent = window.parent;
            
            // Primary method: Parent has closeChildForm function (MVC standard)
            if (typeof parent.closeChildForm === 'function') {
                console.log('[GroupBankDetails] Calling parent.closeChildForm()');
                parent.closeChildForm();
                return;
            }
            
            // Fallback 1: Parent has closeFrame function
            if (typeof parent.closeFrame === 'function') {
                console.log('[GroupBankDetails] Calling parent.closeFrame()');
                parent.closeFrame();
                return;
            }
            
            // Fallback 2: Set iframe src to about:blank
            if (parent !== window && parent.document) {
                const iframe = parent.document.querySelector('iframe[data-child-iframe], iframe[src*="GroupBankDetails"]');
                if (iframe) {
                    console.log('[GroupBankDetails] Setting iframe src to about:blank');
                    iframe.src = 'about:blank';
                    return;
                }
            }
            
            // Fallback 3: Parent might have hideDataEntry
            if (typeof parent.hideDataEntry === 'function') {
                console.log('[GroupBankDetails] Calling parent.hideDataEntry()');
                parent.hideDataEntry();
                return;
            }
            
            console.warn('[GroupBankDetails] No close method found in parent');
        } catch (error) {
            console.error('[GroupBankDetails] Error closing submodule:', error);
        }
    }

    function wireInlineButtons() {
        document.querySelectorAll('[data-cbd-inline]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-cbd-inline');
                handleInlineAction(action);
            });
        });
    }

    window.groupBankDetailsActions = {
        view: () => {
            mainMode = 'view';
            inlineMode = 'idle';
            selectedAccount = null;
            clearForm();
            loadBankAccounts();
            showMessage('View mode activated', 'info');
        },
        add: () => addNewAccount(),
        edit: () => editAccount(),
        delete: () => deleteAccount(),
        save: () => saveAccount(),
        cancel: () => cancelOperation()
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
