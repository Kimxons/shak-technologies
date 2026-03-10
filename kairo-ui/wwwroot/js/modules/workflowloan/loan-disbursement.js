/**
 * Loan Disbursement Module
 * Main module for processing loan disbursements
 * Module ID: 7097
 */

(function () {
    'use strict';

    // Module state
    const state = {
        mode: 'VIEW', // VIEW, ADD, EDIT
        currentLoanData: null,
        moduleId: '7097',
        isInitialized: false
    };

    // API endpoints
    const endpoints = {
        getDisbursement: 'WorkFlowLoan/LoanDisbursement/GetDisbursement',
        saveDisbursement: 'WorkFlowLoan/LoanDisbursement/SaveDisbursement',
        getInstallments: 'WorkFlowLoan/LoanDisbursement/GetInstallments',
        getCharges: 'WorkFlowLoan/LoanDisbursement/GetCharges',
        getTillDetails: 'WorkFlowLoan/LoanDisbursement/GetTillDetails'
    };

    function isSuccess(response) {
        return !!(response && (response.success === true || response.Success === true));
    }

    function getResponseData(response) {
        return response?.data ?? response?.Data ?? null;
    }

    function getDetailsArray(response) {
        const data = getResponseData(response);
        return data?.Details || data?.details || [];
    }

    /**
     * Initialize module
     */
    function init() {
        if (state.isInitialized) return;

        console.log('[LoanDisbursement] Initializing module');
        
        attachEventHandlers();
        initializeSearchModals();
        setInitialState();
        
        state.isInitialized = true;
        console.log('[LoanDisbursement] Module initialized successfully');
    }

    /**
     * Set initial form state
     */
    function setInitialState() {
        setMode('VIEW');
        clearForm();

        const branchInput = document.getElementById('branchId');
        if (branchInput && branchInput.value) {
            setFieldValue('BranchID', branchInput.value);
        }
        
        // Set focus to account search
        const accountIdInput = document.getElementById('accountId');
        if (accountIdInput) {
            accountIdInput.focus();
        }
    }

    /**
     * Attach event handlers
     */
    function attachEventHandlers() {
        // Action buttons
        bindEvent('viewBtn', 'click', handleView);
        bindEvent('addBtn', 'click', handleAdd);
        bindEvent('saveBtn', 'click', handleSave);
        bindEvent('cancelBtn', 'click', handleCancel);
        bindEvent('deviateBtn', 'click', handleDeviate);
        
        // Modal buttons
        bindEvent('denominationBtn', 'click', () => showModal('denominationModal'));
        bindEvent('instScheduleBtn', 'click', handleInstallmentSchedule);
        bindEvent('disbScheduleBtn', 'click', handleDisbursementSchedule);
        bindEvent('viewChargeBtn', 'click', handleViewCharges);
        bindEvent('printContractBtn', 'click', () => showModal('printcontractModal'));
        
        // Field events
        bindEvent('disbursementAmount', 'input', calculateNetAmount);
        bindEvent('deduction', 'input', calculateNetAmount);
        bindEvent('exchangeRate', 'input', calculateLocalAmount);
        bindEvent('modeOfDisbursement', 'change', handleModeChange);
        
        // Section toggles
        attachSectionToggles();
        
        // Account lookup
        bindEvent('accountId', 'blur', handleAccountLookup);
    }

    /**
     * Initialize SearchModal handlers
     */
    function initializeSearchModals() {
        let searchModal = null;

        const getSearchModal = () => {
            if (searchModal) {
                return searchModal;
            }

            if (!window.SearchModal) {
                console.warn('[LoanDisbursement] SearchModal not available at click time');
                return null;
            }

            searchModal = new window.SearchModal(window.AppCore);
            return searchModal;
        };

        const openSearch = (config) => {
            const modal = getSearchModal();
            if (!modal) {
                notify('Search modal is not loaded yet. Please retry.', 'warning');
                return;
            }

            modal.open(config).catch((error) => {
                console.error('[LoanDisbursement] Failed to open search modal:', error);
            });
        };

        // Branch search
        const branchLookup = document.querySelector('.btn-lookup[data-target-input="branchId"]');
        if (branchLookup) {
            branchLookup.addEventListener('click', () => {
                openSearch({
                    tableID: 'BranchID',
                    moduleID: state.moduleId,
                    onSelect: (result) => {
                        setFieldValue('branchId', result.BranchID || result.ID);
                        setFieldValue('branchName', result.BranchName || result.Name);
                        getSearchModal()?.close();
                    }
                });
            });
        }

        // Client search
        const clientLookup = document.querySelector('.btn-lookup[data-target-input="clientId"]');
        if (clientLookup) {
            clientLookup.addEventListener('click', () => {
                openSearch({
                    tableID: 'ClientActiveID',
                    moduleID: state.moduleId,
                    onSelect: (result) => {
                        setFieldValue('clientId', result.ClientID || result.ID);
                        setFieldValue('clientName', result.ClientName || result.Name);
                        getSearchModal()?.close();
                    }
                });
            });
        }

        // Account search (Pending Disbursement)
        const accountLookup = document.querySelector('.btn-lookup[data-target-input="accountId"]');
        if (accountLookup) {
            accountLookup.addEventListener('click', () => {
                const branchId = getFieldValue('branchId');
                if (!branchId) {
                    notify('Please select a branch first', 'warning');
                    return;
                }
                
                openSearch({
                    tableID: 'PendingDisbAccountID',
                    moduleID: state.moduleId,
                    advFilterString: `OurBranchID='${branchId}'`,
                    onSelect: (result) => {
                        setFieldValue('accountId', result.AccountID || result.ID);
                        setFieldValue('accountName', result.AccountName || result.Name);
                        handleAccountLookup();
                        getSearchModal()?.close();
                    }
                });
            });
        }

        // Contra Branch search
        const contraBranchLookup = document.querySelector('.btn-lookup[data-target-input="contraBranchId"]');
        if (contraBranchLookup) {
            contraBranchLookup.addEventListener('click', () => {
                openSearch({
                    tableID: 'BranchID',
                    moduleID: state.moduleId,
                    onSelect: (result) => {
                        setFieldValue('contraBranchId', result.BranchID || result.ID);
                        setFieldValue('contraBranchName', result.BranchName || result.Name);
                        getSearchModal()?.close();
                    }
                });
            });
        }

        // Contra Account search
        const contraAccountLookup = document.querySelector('.btn-lookup[data-target-input="contraAccountId"]');
        if (contraAccountLookup) {
            contraAccountLookup.addEventListener('click', () => {
                const clientId = getFieldValue('clientId');
                const currencyId = getFieldValue('currencyId');
                const branchId = getFieldValue('branchId');
                
                if (!clientId || !currencyId) {
                    notify('Client and Currency required', 'warning');
                    return;
                }
                
                openSearch({
                    tableID: 'AccountCrTrxAllowID',
                    moduleID: state.moduleId,
                    advFilterString: `OurBranchID='${branchId}' AND ClientID='${clientId}' AND CurrencyID='${currencyId}'`,
                    onSelect: (result) => {
                        setFieldValue('contraAccountId', result.AccountID || result.ID);
                        setFieldValue('contraAccountName', result.AccountName || result.Name);
                        getSearchModal()?.close();
                    }
                });
            });
        }
    }

    /**
     * Handle View button
     */
    async function handleView() {
        const accountId = getFieldValue('accountId');
        const branchId = getFieldValue('branchId');
        
        if (!accountId || !branchId) {
            notify('Please select Branch and Account', 'warning');
            return;
        }
        
        await loadDisbursement(branchId, accountId);
    }

    /**
     * Load disbursement data
     */
    async function loadDisbursement(branchId, accountId) {
        try {
            setLoading(true);

            console.log('[LoanDisbursement] Loading data for Account:', accountId, ' Branch:', branchId);

            const response = await AppCore.invokeControllerAsync(endpoints.getDisbursement, {
                OurBranchID: branchId,
                AccountID: accountId
            });

            console.log('[LoanDisbursement] DB response (GetDisbursement):', response);

            if (isSuccess(response)) {
                const data = getDetailsArray(response)[0];
                if (data) {
                    populateForm(data);
                    state.currentLoanData = data;
                    setMode('VIEW');
                    notify('Loan data loaded successfully', 'success');
                } else {
                    notify('No data found for this account', 'info');
                }
            } else {
                const errorMsg = extractResponseMessage(response, 'Failed to load disbursement data');
                notify(errorMsg, 'error');
            }
        } catch (error) {
            console.error('[LoanDisbursement] Error loading data:', error);
            const errorMsg = extractResponseMessage(error, 'Error loading disbursement data');
            notify(errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    }

    /**
     * Populate form with data
     */
    function populateForm(data) {
        // Account Identification (already populated from search)
        setFieldValue('loanSeries', data.LoanSeries);
        
        // Disbursement
        setFieldValue('disbursementAmount', data.DisbursementAmount);
        setFieldValue('deduction', data.Deduction);
        setFieldValue('netDisbAmount', data.NetDisbAmount);
        setCheckboxValue('contractPrinted', data.IsContractPrinted);
        
        // Disbursement Details
        setFieldValue('modeOfDisbursement', data.DisbursementModeID);
        setFieldValue('till', data.TillID);
        setFieldValue('contraBranchId', data.ContraBranchID);
        setFieldValue('contraBranchName', data.ContraBranchName);
        setFieldValue('accountType', data.AccountTypeID);
        setFieldValue('contraAccountId', data.ContraAccountID);
        setFieldValue('contraAccountName', data.ContraAccountName);
        setFieldValue('chequeId', data.ChequeID);
        setFieldValue('referenceNo', data.ReferenceNo);
        setFieldValue('beneficiary', data.BeneficiaryName);
        setFieldValue('exchangeRate', data.ExchangeRate);
        setFieldValue('localAmount', data.LocalAmount);
        setFieldValue('forexGainLoss', data.ForexGainLoss);
        setFieldValue('narration', data.Narration);
        
        // Behind The Scene
        setFieldValue('applicationId', data.ApplicationID);
        setFieldValue('applicationDate', data.ApplicationDate);
        setFieldValue('productId', data.ProductID);
        setFieldValue('currencyId', data.CurrencyID);
        setFieldValue('loanAmount', data.LoanAmount);
        setFieldValue('modeDisbursementType', data.DisbursementType);
        setFieldValue('officerName', data.OfficerName);
        setFieldValue('loanType', data.LoanType);
        
        // Hidden fields for iframe context
        setFieldValue('BranchID', data.OurBranchID);
        setFieldValue('AccountID', data.AccountID);
        setFieldValue('LoanSeries', data.LoanSeries);
    }

    /**
     * Handle Add button
     */
    function handleAdd() {
        if (!state.currentLoanData) {
            notify('Please load loan data first using View', 'warning');
            return;
        }
        
        setMode('ADD');
        enableDisbursementFields();
        notify('Enter disbursement details', 'info');
    }

    /**
     * Handle Save button
     */
    async function handleSave() {
        if (!validateForm()) {
            return;
        }
        
        const formData = collectFormData();
        
        try {
            setLoading(true);
            
            const response = await AppCore.invokeControllerAsync(endpoints.saveDisbursement, formData);

            console.log('[LoanDisbursement] DB response (SaveDisbursement):', response);
            
            if (isSuccess(response)) {
                notify('Disbursement saved successfully', 'success');
                
                // Show transaction details
                const data = getDetailsArray(response)[0];
                if (data && data.TrxBatchID) {
                    notify(`Transaction: ${data.TrxBatchID}/${data.SerialID}`, 'info');
                }
                
                setMode('VIEW');
                
                // Reload data
                await loadDisbursement(formData.OurBranchID, formData.AccountID);
            } else {
                const errorMsg = extractResponseMessage(response, 'Failed to save disbursement');
                notify(errorMsg, 'error');
            }
        } catch (error) {
            console.error('[LoanDisbursement] Error saving:', error);
            const errorMsg = extractResponseMessage(error, 'Error saving disbursement');
            notify(errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    }

    /**
     * Collect form data for save
     */
    function collectFormData() {
        return {
            OurBranchID: getFieldValue('branchId'),
            AccountID: getFieldValue('accountId'),
            LoanSeries: getFieldValue('loanSeries'),
            ApplicationID: getFieldValue('applicationId'),
            CurrencyID: getFieldValue('currencyId'),
            ProductID: getFieldValue('productId'),
            DisbursementAmount: getFieldValue('disbursementAmount'),
            Deduction: getFieldValue('deduction'),
            NetDisbAmount: getFieldValue('netDisbAmount'),
            IsContractPrinted: getCheckboxValue('contractPrinted'),
            DisbursementModeID: getFieldValue('modeOfDisbursement'),
            TillID: getFieldValue('till'),
            ContraBranchID: getFieldValue('contraBranchId'),
            AccountTypeID: getFieldValue('accountType'),
            ContraAccountID: getFieldValue('contraAccountId'),
            ChequeID: getFieldValue('chequeId'),
            ReferenceNo: getFieldValue('referenceNo'),
            BeneficiaryName: getFieldValue('beneficiary'),
            ExchangeRate: getFieldValue('exchangeRate'),
            LocalAmount: getFieldValue('localAmount'),
            ForexGainLoss: getFieldValue('forexGainLoss'),
            Narration: getFieldValue('narration'),
            OperatedBy: getFieldValue('OperatorID')
        };
    }

    /**
     * Validate form
     */
    function validateForm() {
        const required = [
            { field: 'branchId', label: 'Branch' },
            { field: 'accountId', label: 'Account' },
            { field: 'disbursementAmount', label: 'Disbursement Amount' },
            { field: 'modeOfDisbursement', label: 'Mode of Disbursement' }
        ];
        
        for (const item of required) {
            const value = getFieldValue(item.field);
            if (!value || value === '') {
                notify(`${item.label} is required`, 'warning');
                document.getElementById(item.field)?.focus();
                return false;
            }
        }
        
        return true;
    }

    /**
     * Handle Cancel button
     */
    function handleCancel() {
        if (state.mode !== 'VIEW' && confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            setMode('VIEW');
            if (state.currentLoanData) {
                populateForm(state.currentLoanData);
            } else {
                clearForm();
            }
        }
    }

    /**
     * Handle Deviate button
     */
    function handleDeviate() {
        notify('Deviation functionality will be implemented', 'info');
    }

    /**
     * Handle Account Lookup
     */
    async function handleAccountLookup() {
        const accountId = getFieldValue('accountId');
        const branchId = getFieldValue('branchId');
        
        if (accountId && branchId) {
            await loadDisbursement(branchId, accountId);
        }
    }

    /**
     * Handle Installment Schedule button
     */
    async function handleInstallmentSchedule() {
        const accountId = getFieldValue('accountId');
        const branchId = getFieldValue('branchId');
        const loanSeries = getFieldValue('loanSeries');
        
        if (!accountId || !branchId) {
            notify('Please load loan data first', 'warning');
            return;
        }
        
        try {
            setLoading(true);

            const response = await AppCore.invokeControllerAsync(endpoints.getInstallments, {
                OurBranchID: branchId,
                AccountID: accountId,
                LoanSeries: loanSeries
            });

            console.log('[LoanDisbursement] DB response (GetInstallments):', response);

            if (!isSuccess(response)) {
                const errorMsg = extractResponseMessage(response, 'Failed to load installments');
                notify(errorMsg, 'error');
                return;
            }

            displayInstallments(getDetailsArray(response));
            showModal('instscheduleModal');
        } catch (error) {
            console.error('[LoanDisbursement] Error loading installments:', error);
            const errorMsg = extractResponseMessage(error, 'Error loading installment schedule');
            notify(errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    }

    /**
     * Handle Disbursement Schedule button
     */
    function handleDisbursementSchedule() {
        const accountId = getFieldValue('accountId');
        const branchId = getFieldValue('branchId');
        const applicationId = getFieldValue('applicationId');
        
        if (!accountId || !branchId || !applicationId) {
            notify('Please load loan data first', 'warning');
            return;
        }
        
        // Open disbursement schedule submodule
        const modal = new bootstrap.Modal(document.getElementById('disbscheduleModal'));
        const iframe = document.getElementById('disbscheduleIframe');
        
        iframe.src = `/WorkFlowLoan/LoanSanction/DisbursementSchedule?applicationId=${applicationId}`;
        
        modal.show();
    }

    /**
     * Handle View Charges button
     */
    async function handleViewCharges() {
        const applicationId = getFieldValue('applicationId');
        const branchId = getFieldValue('branchId');
        
        if (!applicationId || !branchId) {
            notify('Please load loan data first', 'warning');
            return;
        }
        
        try {
            setLoading(true);
            
            const response = await AppCore.invokeControllerAsync(endpoints.getCharges, {
                OurBranchID: branchId,
                ApplicationID: applicationId
            });

            console.log('[LoanDisbursement] DB response (GetCharges):', response);
            
            if (isSuccess(response)) {
                const charges = getDetailsArray(response);
                displayCharges(charges);
                showModal('chargesModal');
            } else {
                const errorMsg = extractResponseMessage(response, 'Failed to load charges');
                notify(errorMsg, 'error');
            }
        } catch (error) {
            console.error('[LoanDisbursement] Error loading charges:', error);
            const errorMsg = extractResponseMessage(error, 'Error loading charges');
            notify(errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    }

    /**
     * Display charges in modal
     */
    function displayCharges(charges) {
        const tbody = document.getElementById('chargesTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!charges || charges.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No charges to display.</td></tr>';
            return;
        }
        
        charges.forEach(charge => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${charge.ChargeType || ''}</td>
                <td class="text-end">${formatNumber(charge.Amount)}</td>
                <td>${charge.Description || ''}</td>
            `;
            tbody.appendChild(row);
        });
    }

    function displayInstallments(installments) {
        const tbody = document.getElementById('installmentsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!installments || installments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No installments to display.</td></tr>';
            return;
        }

        installments.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.InstallmentNo || item.SLNo || (index + 1)}</td>
                <td>${item.InstallmentDate || item.DueDate || ''}</td>
                <td class="text-end">${formatNumber(item.PrincipalAmount || item.Principal)}</td>
                <td class="text-end">${formatNumber(item.InterestAmount || item.Interest)}</td>
                <td class="text-end">${formatNumber(item.InstallmentAmount || item.Amount)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    /**
     * Calculate net disbursement amount
     */
    function calculateNetAmount() {
        const disbursementAmount = parseFloat(getFieldValue('disbursementAmount')) || 0;
        const deduction = parseFloat(getFieldValue('deduction')) || 0;
        const netAmount = disbursementAmount - deduction;
        
        setFieldValue('netDisbAmount', netAmount.toFixed(2));
        
        // Recalculate local amount if exchange rate exists
        calculateLocalAmount();
    }

    /**
     * Calculate local amount based on exchange rate
     */
    function calculateLocalAmount() {
        const netAmount = parseFloat(getFieldValue('netDisbAmount')) || 0;
        const exchangeRate = parseFloat(getFieldValue('exchangeRate')) || 1;
        const localAmount = netAmount * exchangeRate;
        
        setFieldValue('localAmount', localAmount.toFixed(2));
    }

    /**
     * Handle mode of disbursement change
     */
    function handleModeChange() {
        const mode = getFieldValue('modeOfDisbursement');
        
        // Enable/disable fields based on mode
        const tillField = document.getElementById('till');
        
        if (mode === 'CH') {
            // Cash - enable till
            if (tillField) tillField.disabled = false;
        } else {
            // Other modes - disable till
            if (tillField) tillField.disabled = true;
        }
    }

    /**
     * Set form mode
     */
    function setMode(mode) {
        state.mode = mode;
        
        const viewBtn = document.getElementById('viewBtn');
        const addBtn = document.getElementById('addBtn');
        const saveBtn = document.getElementById('saveBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        
        switch (mode) {
            case 'VIEW':
                enableButton(viewBtn);
                disableButton(saveBtn, cancelBtn);
                disableDisbursementFields();
                
                if (state.currentLoanData) {
                    enableButton(addBtn);
                } else {
                    disableButton(addBtn);
                }
                break;
                
            case 'ADD':
            case 'EDIT':
                enableButton(saveBtn, cancelBtn);
                disableButton(viewBtn, addBtn);
                enableDisbursementFields();
                break;
        }
    }

    /**
     * Enable disbursement fields
     */
    function enableDisbursementFields() {
        const fields = [
            'disbursementAmount', 'deduction', 'contractPrinted',
            'modeOfDisbursement', 'till', 'contraBranchId', 'accountType',
            'contraAccountId', 'chequeId', 'referenceNo', 'beneficiary',
            'exchangeRate', 'narration'
        ];
        
        fields.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.disabled = false;
        });
        
        // Enable lookup buttons
        document.querySelectorAll('.btn-lookup').forEach(btn => {
            btn.disabled = false;
        });
    }

    /**
     * Disable disbursement fields
     */
    function disableDisbursementFields() {
        const fields = [
            'disbursementAmount', 'deduction', 'contractPrinted',
            'modeOfDisbursement', 'till', 'contraBranchId', 'accountType',
            'contraAccountId', 'chequeId', 'referenceNo', 'beneficiary',
            'exchangeRate', 'narration'
        ];
        
        fields.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.disabled = true;
        });
        
        // Disable contra lookup buttons (keep search buttons enabled)
        const lookupButtons = document.querySelectorAll('.btn-lookup');
        if (lookupButtons.length > 3) {
            lookupButtons[3]?.setAttribute('disabled', 'true');
            lookupButtons[4]?.setAttribute('disabled', 'true');
        }
    }

    /**
     * Clear form
     */
    function clearForm() {
        document.getElementById('loanDisbursementForm')?.reset();
        state.currentLoanData = null;
        setMode('VIEW');
    }

    /**
     * Attach section toggle handlers
     */
    function attachSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', function(e) {
                e.preventDefault();
                const section = this.closest('[data-section]');
                const content = section.querySelector('[data-section-content]');
                const toggle = section.querySelector('.section-toggle-btn i');
                
                if (content) {
                    content.style.display = content.style.display === 'none' ? 'block' : 'none';
                }
                
                if (toggle) {
                    toggle.classList.toggle('bi-chevron-up');
                    toggle.classList.toggle('bi-chevron-down');
                }
            });
        });
    }

    // Utility functions
    function notify(message, type = 'info') {
        // Try AppCore methods first
        if (window.AppCore?.showToastMessage) {
            window.AppCore.showToastMessage(message, type);
            return;
        }

        if (window.AppCore?.showNotification) {
            window.AppCore.showNotification(message, type);
            return;
        }

        // Fall back to local message panel
        const panel = document.getElementById('messagePanel');
        const textEl = document.getElementById('messagePanelText');

        if (panel && textEl) {
            textEl.textContent = message;
            panel.className = 'am-message-panel ' + type + ' show';

            // Auto-dismiss after 5 seconds for non-error messages
            if (type !== 'error') {
                setTimeout(() => {
                    panel.classList.remove('show');
                }, 5000);
            }

            console.log(`[LoanDisbursement:${type}] ${message}`);
        } else {
            // Last resort: console only
            console.log(`[LoanDisbursement:${type}] ${message}`);
        }
    }

    function extractResponseMessage(source, fallback = 'Operation failed') {
        if (!source) {
            return fallback;
        }

        const candidates = [
            source.message,
            source.Message,
            source.error,
            source.ErrorMessage,
            source.data?.message,
            source.data?.Message,
            source.data?.error,
            source.data?.ErrorMessage,
            source.data?.data?.message,
            source.data?.data?.Message,
            source.data?.data?.error,
            source.data?.data?.ErrorMessage,
            source.response?.message,
            source.response?.Message,
            source.response?.error,
            source.response?.ErrorMessage,
            typeof source === 'string' ? source : null
        ];

        for (const candidate of candidates) {
            if (typeof candidate === 'string' && candidate.trim()) {
                return candidate.trim();
            }
        }

        return fallback;
    }

    function setLoading(show) {
        const overlay = document.getElementById('pageLoadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    function bindEvent(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    function showModal(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
    }

    function getFieldValue(fieldId) {
        const element = document.getElementById(fieldId);
        return element ? element.value : '';
    }

    function setFieldValue(fieldId, value) {
        const element = document.getElementById(fieldId);
        if (element) {
            element.value = value || '';
        }
    }

    function getCheckboxValue(fieldId) {
        const element = document.getElementById(fieldId);
        return element ? element.checked : false;
    }

    function setCheckboxValue(fieldId, value) {
        const element = document.getElementById(fieldId);
        if (element) {
            element.checked = !!value;
        }
    }

    function enableButton(...buttons) {
        buttons.forEach(btn => {
            if (btn) btn.disabled = false;
        });
    }

    function disableButton(...buttons) {
        buttons.forEach(btn => {
            if (btn) btn.disabled = true;
        });
    }

    function formatNumber(value) {
        if (!value) return '0.00';
        return parseFloat(value).toFixed(2);
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

