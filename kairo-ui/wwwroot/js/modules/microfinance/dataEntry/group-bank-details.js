(function () {
    'use strict';

    const state = {
        moduleId: document.getElementById('moduleId_group_bank_details')?.value || '100'
    };

    let searchModal = null;

    const LOOKUP_CONFIG = {
        Bank: {
            tableID: 'BankID',
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
            valueColumn: 'BranchID'
        }
    };

    const bankAccounts = [];
    let selectedAccount = null;

    const parentContext = {
        branchId: '',
        centerId: '',
        operatorId: ''
    };

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

    function populateBankAccountsTable(accounts) {
        const tbody = document.getElementById('bankAccountsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!accounts.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No records to display.</td></tr>';
            return;
        }

        accounts.forEach(account => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${account.AccountID || ''}</td>
                <td>${account.InstitutionName || ''}</td>
                <td>${account.BranchID || ''}</td>
                <td>${account.BranchName || ''}</td>
                <td>${account.Balance ?? ''}</td>
                <td>${account.TitleOfAccount || ''}</td>
                <td>${account.Signatory || ''}</td>
            `;
            row.addEventListener('click', () => {
                selectedAccount = account;
                populateForm(account);
            });
            tbody.appendChild(row);
        });
    }

    function populateForm(account) {
        if (!account) return;
        document.getElementById('AccountType').value = account.ProductTypeID || '';
        document.getElementById('InstitutionType').value = account.InstitutionTypeID || '';
        document.getElementById('BankId').value = account.BankID || '';
        document.getElementById('InstitutionName').value = account.InstitutionName || '';
        document.getElementById('BranchId').value = account.BranchID || '';
        document.getElementById('BranchName').value = account.BranchName || '';
        document.getElementById('TitleOfAccount').value = account.TitleOfAccount || '';
        document.getElementById('AccountId').value = account.AccountID || '';
        document.getElementById('Signatory').value = account.Signatory || '';
        document.getElementById('Balance').value = account.Balance ?? '';
        document.getElementById('AdvanceAmount').value = account.AdvanceAmount ?? '';
        document.getElementById('Terms').value = account.Term ?? '';
        document.getElementById('MonthlyPayment').value = account.MonthlyPayment ?? '';
    }

    async function loadBankAccounts() {
        resolveParentContext();

        if (!parentContext.centerId || !parentContext.branchId) {
            populateBankAccountsTable([]);
            return;
        }

        if (!window.GroupService?.getGroupBankAccounts) {
            console.warn('[GroupBankDetails] GroupService not available');
            return;
        }

        try {
            const requestData = {
                GroupID: parentContext.centerId,
                OurBranchID: parentContext.branchId,
                OperatorID: parentContext.operatorId
            };

            const response = await window.GroupService.getGroupBankAccounts(requestData);
            const accounts = normalizeBankAccounts(response);
            bankAccounts.length = 0;
            bankAccounts.push(...accounts);

            populateBankAccountsTable(bankAccounts);
            if (bankAccounts.length) {
                selectedAccount = bankAccounts[0];
                populateForm(selectedAccount);
            }
        } catch (error) {
            console.error('[GroupBankDetails] Failed to load bank accounts:', error);
            populateBankAccountsTable([]);
        }
    }

    function init() {
        const appCore = window.AppCore || window.parent?.AppCore || window.top?.AppCore;
        if (appCore && window.SearchModal) {
            searchModal = new window.SearchModal(appCore);
        }

        wireSectionToggles();
        wireLookupButtons();
        wireHeaderButtons();
        loadBankAccounts();
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

    function openLookup(key) {
        const config = LOOKUP_CONFIG[key];
        if (!config) {
            console.warn('[GroupBankDetails] Lookup config not found:', key);
            return;
        }

        if (!searchModal) {
            window.alert('Search modal is not available.');
            return;
        }

        searchModal.open({
            tableID: config.tableID,
            moduleID: state.moduleId,
            whereStmt: '',
            advFilterString: '',
            onSelect: (row) => {
                const value = row?.[config.valueColumn] ?? row?.[config.valueField] ?? '';
                const display = row?.[config.displayColumn] ?? row?.[config.displayField] ?? '';

                const valueField = document.getElementById(config.valueField);
                if (valueField) valueField.value = value || '';

                const displayField = document.getElementById(config.displayField);
                if (displayField) displayField.value = display || '';
            }
        }).catch(err => {
            console.error('[GroupBankDetails] Lookup open failed:', err);
        });
    }

    function wireHeaderButtons() {
        const closeBtn = document.getElementById('btnClose');
        const refreshBtn = document.getElementById('btnRefresh');

        closeBtn?.addEventListener('click', () => {
            window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');
        });

        refreshBtn?.addEventListener('click', () => {
            window.location.reload();
        });
    }

    window.groupBankDetailsActions = {
        view: () => loadBankAccounts(),
        add: () => console.info('[GroupBankDetails] Add action triggered'),
        edit: () => console.info('[GroupBankDetails] Edit action triggered'),
        delete: () => console.info('[GroupBankDetails] Delete action triggered'),
        save: () => console.info('[GroupBankDetails] Save action triggered'),
        cancel: () => window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*')
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
