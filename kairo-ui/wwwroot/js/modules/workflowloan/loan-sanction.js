/**
 * Loan Sanction Module
 * Migrated from legacy implementation to KAIRO MVC architecture
 * Follows MODULE_MIGRATION_CHEATSHEET 3.md guidelines
 */

(function () {
    'use strict';

    console.log('[LoanSanction] Module loading...');

    // ═══════════════════════════════════════════════════════════════════
    // MODULE CONSTANTS
    // ═══════════════════════════════════════════════════════════════════

    const MODULE_ID = '7065';
    const CONTROLLER_BASE = '/WorkFlowLoan/LoanSanction';

    // ═══════════════════════════════════════════════════════════════════
    // STATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    const state = {
        currentMode: 'INITIAL', // INITIAL, VIEW, EDIT
        currentSanction: null,
        currentApplicationData: null,
        isDirty: false,
        branchId: null,
        operatorId: null
    };

    // DOM element cache
    const elements = {};

    // SearchModal instance
    let searchModal = null;

    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════

    function init() {
        console.log('[LoanSanction] Initializing module...');

        try {
            // Hide loading overlay immediately
            showLoading(false);

            // Cache DOM elements
            cacheElements();

            // Load context from session
            loadContext();

            // Initialize SearchModal
            if (window.SearchModal && window.AppCore) {
                searchModal = new window.SearchModal(window.AppCore);
                console.log('[LoanSanction] SearchModal initialized');
            } else {
                console.warn('[LoanSanction] SearchModal or AppCore not available');
            }

            // Wire event listeners
            attachEventListeners();

            // Keep all screen sections expanded on initial load.
            initializeSectionStates();

            // Set initial state
            setStateInitial();

            // Set default date to today
            const today = new Date().toISOString().split('T')[0];
            if (elements.applicationDate) elements.applicationDate.value = today;

            console.log('[LoanSanction] Module initialized successfully');
        } catch (error) {
            console.error('[LoanSanction] Initialization error:', error);
            showToast('Error initializing module: ' + error.message, 'error');
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // DOM ELEMENT CACHING
    // ═══════════════════════════════════════════════════════════════════

    function cacheElements() {
        // Application Search fields
        elements.branchId = document.getElementById('branchId');
        elements.branchName = document.getElementById('branchName');
        elements.workflowTypeId = document.getElementById('workflowTypeId');
        elements.workflowTypeName = document.getElementById('workflowTypeName');
        elements.applicationId = document.getElementById('applicationId');
        elements.applicationName = document.getElementById('applicationName');
        elements.applicationDate = document.getElementById('applicationDate');

        // Sanction Details fields
        elements.approvedAmount = document.getElementById('approvedAmount');
        elements.modeOfDisbursement = document.getElementById('modeOfDisbursement');
        elements.noOfDisbursements = document.getElementById('noOfDisbursements');
        elements.firstDisbursementDate = document.getElementById('firstDisbursementDate');
        elements.collectInterestDuringGrace = document.getElementById('collectInterestDuringGrace');
        elements.repaymentTerm = document.getElementById('repaymentTerm');
        elements.gracePeriod = document.getElementById('gracePeriod');
        elements.installmentStartDate = document.getElementById('installmentStartDate');
        elements.templateSchedule = document.getElementById('templateSchedule');
        elements.markingRate = document.getElementById('markingRate');
        elements.interestRateType = document.getElementById('interestRateType');
        elements.interestRate = document.getElementById('interestRate');
        elements.baseRate = document.getElementById('baseRate');
        elements.mainRepaymentAccountId = document.getElementById('mainRepaymentAccountId');
        elements.mainRepaymentAccountName = document.getElementById('mainRepaymentAccountName');
        elements.approvedBy = document.getElementById('approvedBy');
        elements.approvedByName = document.getElementById('approvedByName');
        elements.approvedDate = document.getElementById('approvedDate');

        // Application Details (readonly)
        elements.clientId = document.getElementById('clientId');
        elements.clientName = document.getElementById('clientName');
        elements.city = document.getElementById('city');
        elements.phone = document.getElementById('phone');
        elements.mailingAddress = document.getElementById('mailingAddress');
        elements.loanSeries = document.getElementById('loanSeries');
        elements.loanType = document.getElementById('loanType');
        elements.productId = document.getElementById('productId');
        elements.currencyId = document.getElementById('currencyId');
        elements.sanctionAmount = document.getElementById('sanctionAmount');
        elements.appliedAmount = document.getElementById('appliedAmount');
        elements.term = document.getElementById('term');
        elements.interestRateDetails = document.getElementById('interestRateDetails');
        elements.installmentAmount = document.getElementById('installmentAmount');
        elements.applicationStatus = document.getElementById('applicationStatus');

        // Action buttons
        elements.viewBtn = document.getElementById('viewBtn');
        elements.sanctionBtn = document.getElementById('sanctionBtn');
        elements.deviateBtn = document.getElementById('deviateBtn');
        elements.cancelBtn = document.getElementById('cancelBtn');

        console.log('[LoanSanction] DOM elements cached');
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONTEXT LOADING
    // ═══════════════════════════════════════════════════════════════════

    function loadContext() {
        const sessionBranchCode = document.getElementById('sessionBranchCode_ls')?.value;
        const sessionBranchName = document.getElementById('sessionBranchName_ls')?.value;
        const sessionOperatorId = document.getElementById('sessionOperatorId_ls')?.value;

        state.branchId = sessionBranchCode || '';
        state.operatorId = sessionOperatorId || '';

        // Pre-populate branch if available
        if (sessionBranchCode && elements.branchId) {
            elements.branchId.value = sessionBranchCode;
        }
        if (sessionBranchName && elements.branchName) {
            elements.branchName.value = sessionBranchName;
        }

        console.log('[LoanSanction] Context loaded:', {
            branchId: state.branchId,
            operatorId: state.operatorId
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // EVENT LISTENERS
    // ═══════════════════════════════════════════════════════════════════

    function attachEventListeners() {
        // Action buttons
        if (elements.viewBtn) {
            elements.viewBtn.addEventListener('click', handleView);
        }
        if (elements.sanctionBtn) {
            elements.sanctionBtn.addEventListener('click', handleSanction);
        }
        if (elements.deviateBtn) {
            elements.deviateBtn.addEventListener('click', handleDeviate);
        }
        if (elements.cancelBtn) {
            elements.cancelBtn.addEventListener('click', handleCancel);
        }

        // Section toggles
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', handleSectionToggle);
        });

        // Lookup buttons
        document.querySelectorAll('.btn-lookup[data-lookup]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const lookupType = btn.getAttribute('data-lookup');
                handleLookup(lookupType);
            });
        });

        // Blur handlers for auto-lookup
        if (elements.branchId) {
            elements.branchId.addEventListener('blur', () => handleAutoLookup('Branch'));
        }
        if (elements.workflowTypeId) {
            elements.workflowTypeId.addEventListener('blur', () => handleAutoLookup('WorkflowType'));
        }
        if (elements.applicationId) {
            elements.applicationId.addEventListener('blur', () => handleAutoLookup('Application'));
        }

        console.log('[LoanSanction] Event listeners attached');
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION TOGGLE HANDLER
    // ═══════════════════════════════════════════════════════════════════

    function handleSectionToggle(e) {
        const header = e.currentTarget;
        const section = header.closest('.form-section');
        const content = section?.querySelector('[data-section-content]');
        const toggleButton = header.querySelector('.section-toggle-btn');
        const icon = header.querySelector('.section-toggle-btn i');

        if (content && icon) {
            const isHidden = content.style.display === 'none';
            content.style.display = isHidden ? '' : 'none';
            header.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
            if (toggleButton) {
                toggleButton.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
            }
            icon.className = isHidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
        }
    }

    function initializeSectionStates() {
        document.querySelectorAll('.form-section').forEach(section => {
            const header = section.querySelector('[data-section-toggle]');
            const content = section.querySelector('[data-section-content]');
            const toggleButton = header?.querySelector('.section-toggle-btn');
            const icon = header?.querySelector('.section-toggle-btn i');

            if (content) {
                content.style.display = '';
            }

            if (header) {
                header.setAttribute('aria-expanded', 'true');
            }

            if (toggleButton) {
                toggleButton.setAttribute('aria-expanded', 'true');
            }

            if (icon) {
                icon.className = 'bi bi-chevron-up';
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // LOOKUP HANDLERS (SearchModal Integration)
    // ═══════════════════════════════════════════════════════════════════

    function handleLookup(lookupType) {
        if (!searchModal) {
            showToast('Search functionality not available', 'error');
            return;
        }

        switch (lookupType) {
            case 'Branch':
                openBranchLookup();
                break;
            case 'WorkflowType':
                openWorkflowTypeLookup();
                break;
            case 'Application':
                openApplicationLookup();
                break;
            case 'RepaymentAccount':
                openRepaymentAccountLookup();
                break;
            case 'Officer':
                openOfficerLookup();
                break;
            default:
                console.warn('[LoanSanction] Unknown lookup type:', lookupType);
        }
    }

    function openBranchLookup() {
        const branchIdValue = elements.branchId?.value?.trim() || '';

        searchModal.open({
            title: 'Branch Search',
            tableID: 'BranchID',
            searchFields: [
                { name: 'BranchID', label: 'Branch ID', column: 'OurBranchID', value: branchIdValue },
                { name: 'BranchName', label: 'Branch Name', column: 'BranchName' }
            ],
            displayFields: [
                { key: 'OurBranchID', label: 'Branch ID' },
                { key: 'BranchName', label: 'Branch Name' }
            ],
            autoSearch: true,
            onSelect: (record) => {
                if (elements.branchId) elements.branchId.value = record.OurBranchID || '';
                if (elements.branchName) elements.branchName.value = record.BranchName || '';
                console.log('[LoanSanction] Branch selected:', record.OurBranchID);
            }
        });
    }

    function openWorkflowTypeLookup() {
        const branchId = elements.branchId?.value?.trim();
        if (!branchId) {
            showToast('Please select Branch ID first', 'warning');
            return;
        }

        const workflowTypeValue = elements.workflowTypeId?.value?.trim() || '';

        searchModal.open({
            title: 'Workflow Type Search',
            tableID: 'WFAdvTypeID',
            whereStmt: `BankID='00' AND ModuleID='LN'`,
            searchFields: [
                { name: 'WFAdvTypeID', label: 'Workflow Type ID', column: 'WFAdvTypeID', value: workflowTypeValue },
                { name: 'Description', label: 'Description', column: 'Description' }
            ],
            displayFields: [
                { key: 'WFAdvTypeID', label: 'Workflow Type ID' },
                { key: 'Description', label: 'Description' }
            ],
            autoSearch: true,
            onSelect: (record) => {
                if (elements.workflowTypeId) elements.workflowTypeId.value = record.WFAdvTypeID || '';
                if (elements.workflowTypeName) elements.workflowTypeName.value = record.Description || '';
                console.log('[LoanSanction] Workflow Type selected:', record.WFAdvTypeID);
            }
        });
    }

    function openApplicationLookup() {
        const branchId = elements.branchId?.value?.trim();
        if (!branchId) {
            showToast('Please select Branch ID first', 'warning');
            return;
        }

        const applicationIdValue = elements.applicationId?.value?.trim() || '';

        searchModal.open({
            title: 'Application Search',
            tableID: 'WFLoanApplicationID',
            whereStmt: `OurBranchID='${branchId}' AND WFAppStatusID IN('PEN','DISCH') AND WFAdvStageID='30SANC'`,
            searchFields: [
                { name: 'ApplicationID', label: 'Application ID', column: 'WFLoanApplicationID', value: applicationIdValue },
                { name: 'ClientName', label: 'Client Name', column: 'ClientName' }
            ],
            displayFields: [
                { key: 'WFLoanApplicationID', label: 'Application ID' },
                { key: 'ClientName', label: 'Client Name' }
            ],
            autoSearch: true,
            onSelect: async (record) => {
                if (elements.applicationId) elements.applicationId.value = record.WFLoanApplicationID || record.ApplicationID || '';
                if (elements.applicationName) elements.applicationName.value = record.ClientName || record.ApplicationNumber || '';
                console.log('[LoanSanction] Application selected:', record.WFLoanApplicationID);

                // Auto-load sanction details
                await loadSanctionDetails();
            }
        });
    }

    function openRepaymentAccountLookup() {
        const clientId = elements.clientId?.value?.trim();
        if (!clientId) {
            showToast('Client ID not available - load application first', 'warning');
            return;
        }

        const accountIdValue = elements.mainRepaymentAccountId?.value?.trim() || '';

        searchModal.open({
            title: 'Repayment Account Search',
            tableID: 'RepaymentAccountID',
            whereStmt: `ClientID='${clientId}' AND ProductID<>'AL' AND isDormant<>'1' AND isBlocked<>'1' AND AccountStatusID<>'AC'`,
            searchFields: [
                { name: 'AccountID', label: 'Account ID', column: 'AccountID', value: accountIdValue },
                { name: 'Name', label: 'Account Name', column: 'Name' }
            ],
            displayFields: [
                { key: 'AccountID', label: 'Account ID' },
                { key: 'Name', label: 'Account Name' }
            ],
            autoSearch: true,
            onSelect: (record) => {
                if (elements.mainRepaymentAccountId) elements.mainRepaymentAccountId.value = record.AccountID || '';
                if (elements.mainRepaymentAccountName) elements.mainRepaymentAccountName.value = record.Name || '';
                console.log('[LoanSanction] Repayment Account selected:', record.AccountID);
            }
        });
    }

    function openOfficerLookup() {
        const branchId = elements.branchId?.value?.trim();
        if (!branchId) {
            showToast('Please select Branch ID first', 'warning');
            return;
        }

        const officerIdValue = elements.approvedBy?.value?.trim() || '';

        searchModal.open({
            title: 'Sanction Authority Search',
            tableID: 'ActiveOfficerID',
            whereStmt: `BankID='00' AND ReportingBRanchID='${branchId}' AND IsSanctionAuthority='1'`,
            searchFields: [
                { name: 'OfficerID', label: 'Officer ID', column: 'OfficerID', value: officerIdValue },
                { name: 'Name', label: 'Officer Name', column: 'Name' }
            ],
            displayFields: [
                { key: 'OfficerID', label: 'Officer ID' },
                { key: 'Name', label: 'Officer Name' }
            ],
            autoSearch: true,
            onSelect: (record) => {
                if (elements.approvedBy) elements.approvedBy.value = record.OfficerID || '';
                if (elements.approvedByName) elements.approvedByName.value = record.Name || '';
                console.log('[LoanSanction] Officer selected:', record.OfficerID);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // AUTO-LOOKUP ON BLUR (Mimics Loan Maintenance pattern)
    // ═══════════════════════════════════════════════════════════════════

    async function handleAutoLookup(lookupType) {
        // Auto-lookup logic can be implemented similar to Loan Application Syndicate
        // For now, we'll skip to keep the implementation focused
        console.log('[LoanSanction] Auto-lookup triggered for:', lookupType);
    }

    // ═══════════════════════════════════════════════════════════════════
    // VIEW/LOAD SANCTION DETAILS
    // ═══════════════════════════════════════════════════════════════════

    async function handleView() {
        console.log('[LoanSanction] View button clicked');

        // Validate required fields
        const branchId = elements.branchId?.value?.trim();
        const applicationId = elements.applicationId?.value?.trim();

        if (!branchId) {
            showToast('Please enter Branch ID', 'error');
            elements.branchId?.focus();
            return;
        }

        if (!applicationId) {
            showToast('Please select Application ID', 'error');
            elements.applicationId?.focus();
            return;
        }

        await loadSanctionDetails();
    }

    async function loadSanctionDetails() {
        const branchId = elements.branchId?.value?.trim();
        const applicationId = elements.applicationId?.value?.trim();

        if (!branchId || !applicationId) {
            showToast('Branch ID and Application ID are required', 'error');
            return;
        }

        try {
            showLoading(true, 'Loading sanction details...');

            const response = await window.AppCore.invokeControllerAsync(
                `${CONTROLLER_BASE}/GetSanctionDetails`,
                {
                    OurBranchID: branchId,
                    ApplicationID: applicationId,
                    OperatorID: state.operatorId,
                    Direction: 0,
                    LogInBranchID: branchId
                }
            );

            console.log('[LoanSanction] DB response (GetSanctionDetails):', response);

            if (!response) {
                throw new Error('No response received from server.');
            }

            const isSuccess = response.success ?? response.Success;
            const responseData = response.data ?? response.Data ?? null;
            const hasLegacyPayload = !!(response.Details || response.Details01 || response.Details02);
            const payload = responseData || (hasLegacyPayload ? response : null);

            if (isSuccess === false) {
                showToast(extractResponseMessage(response, 'Failed to load sanction details'), 'error');
                return;
            }

            if (payload) {
                populateForm(payload);
                setStateView();
                showToast('Sanction details loaded successfully', 'success');
            } else {
                showToast(extractResponseMessage(response, 'Failed to load sanction details'), 'error');
            }
        } catch (error) {
            console.error('[LoanSanction] Error loading sanction details:', error);
            showToast('Error loading sanction details: ' + extractResponseMessage(error, error.message), 'error');
        } finally {
            showLoading(false);
        }
    }

    function populateForm(result) {
        const envelope = result?.data || result;
        const details = envelope?.Details || envelope?.data?.Details || null;
        const details01 = envelope?.Details01 || envelope?.data?.Details01 || null;
        const details02 = envelope?.Details02 || envelope?.data?.Details02 || null;

        const clientDetails = Array.isArray(details) ? details : (details ? [details] : []);
        const sanctionData = Array.isArray(details01) ? details01[0] : (details01 ? details01 : null);
        const rateInfo = Array.isArray(details02) ? details02[0] : (details02 ? details02 : null);

        state.currentSanction = sanctionData || null;

        if (clientDetails.length > 0) {
            const client = clientDetails[0];
            if (elements.clientId) elements.clientId.value = client.ClientID || '';
            if (elements.clientName) elements.clientName.value = client.ClientName || '';
            if (elements.mailingAddress) elements.mailingAddress.value = client.Address1 || '';
            if (elements.city) elements.city.value = client.City || '';
            if (elements.phone) elements.phone.value = client.Phone || '';
        }

        if (sanctionData) {
            if (elements.branchId) elements.branchId.value = sanctionData.OurBranchID || '';
            if (elements.branchName) elements.branchName.value = sanctionData.BranchName || '';
            if (elements.workflowTypeId) elements.workflowTypeId.value = sanctionData.WFAdvTypeID || '';
            if (elements.workflowTypeName) elements.workflowTypeName.value = sanctionData.WFAdvType || '';
            if (elements.applicationId) elements.applicationId.value = sanctionData.ApplicationID || '';
            if (elements.applicationDate) elements.applicationDate.value = formatDateForInput(sanctionData.ApplicationDate);
            if (elements.loanType) elements.loanType.value = sanctionData.LoanType || '';
            if (elements.productId) elements.productId.value = sanctionData.ProductID || '';
            if (elements.loanSeries) elements.loanSeries.value = sanctionData.LoanSeries || '';
            if (elements.currencyId) elements.currencyId.value = sanctionData.CurrencyID || '';

            if (elements.appliedAmount) elements.appliedAmount.value = formatMoney(sanctionData.AppliedAmount || 0);
            if (elements.sanctionAmount) elements.sanctionAmount.value = formatMoney(sanctionData.SanctionedAmount || 0);
            if (elements.approvedAmount) elements.approvedAmount.value = formatMoney(sanctionData.SanctionedAmount || 0);
            if (elements.baseRate) elements.baseRate.value = formatMoney(sanctionData.BaseRate || 0);
            if (elements.interestRate) elements.interestRate.value = formatMoney(sanctionData.InterestRate || 0);
            if (elements.interestRateType) elements.interestRateType.value = sanctionData.InterestRateType || '';
            if (elements.markingRate) elements.markingRate.value = formatMoney(sanctionData.MarkingRate || 0);
            if (elements.term) elements.term.value = sanctionData.Term || '';
            if (elements.repaymentTerm) elements.repaymentTerm.value = sanctionData.RepaymentTerm || '';
            if (elements.gracePeriod) elements.gracePeriod.value = sanctionData.GracePeriod || '';
            if (elements.installmentStartDate) elements.installmentStartDate.value = formatDateForInput(sanctionData.InstallmentStartDate);
            if (elements.installmentAmount) elements.installmentAmount.value = formatMoney(sanctionData.InstallmentAmount || 0);

            if (elements.modeOfDisbursement) elements.modeOfDisbursement.value = sanctionData.DisbursementModeID || '';
            if (elements.noOfDisbursements) elements.noOfDisbursements.value = sanctionData.NoOfDisbursements || '';
            if (elements.firstDisbursementDate) elements.firstDisbursementDate.value = formatDateForInput(sanctionData.DisbursementDate);
            if (elements.mainRepaymentAccountId) elements.mainRepaymentAccountId.value = sanctionData.RepaymentAccountID || '';
            if (elements.mainRepaymentAccountName) elements.mainRepaymentAccountName.value = sanctionData.RepaymentAccountName || '';

            if (elements.applicationStatus) elements.applicationStatus.value = sanctionData.WFAppStatus || '';
        }

        if (rateInfo) {
            if (elements.interestRateDetails) elements.interestRateDetails.value = formatMoney(rateInfo.EffectiveRate || 0);
        }

        console.log('[LoanSanction] Form populated with data');
    }

    // ═══════════════════════════════════════════════════════════════════
    // SANCTION HANDLER
    // ═══════════════════════════════════════════════════════════════════

    async function handleSanction() {
        console.log('[LoanSanction] Sanction button clicked');

        // Validate form
        if (!validateForm()) {
            return;
        }

        if (!confirm('Are you sure you want to sanction this loan application?')) {
            return;
        }

        try {
            showLoading(true, 'Processing sanction...');

            const sanctionData = collectFormData();

            const response = await window.AppCore.invokeControllerAsync(
                `${CONTROLLER_BASE}/SaveSanction`,
                sanctionData
            );

            console.log('[LoanSanction] DB response (SaveSanction):', response);

            if (response.success) {
                showToast('Sanction submitted successfully', 'success');
                setTimeout(() => clearForm(), 1500);
            } else {
                showToast(extractResponseMessage(response, 'Failed to save sanction'), 'error');
            }
        } catch (error) {
            console.error('[LoanSanction] Error saving sanction:', error);
            showToast('Error processing sanction: ' + extractResponseMessage(error, error.message), 'error');
        } finally {
            showLoading(false);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // DEVIATE HANDLER
    // ═══════════════════════════════════════════════════════════════════

    async function handleDeviate() {
        console.log('[LoanSanction] Deviate button clicked');

        const deviationReason = prompt('Please enter the reason for deviation:');

        if (!deviationReason || deviationReason.trim() === '') {
            showToast('Deviation reason is required', 'warning');
            return;
        }

        try {
            showLoading(true, 'Processing deviation...');

            const response = await window.AppCore.invokeControllerAsync(
                `${CONTROLLER_BASE}/DeviateApplication`,
                {
                    OurBranchID: elements.branchId?.value?.trim(),
                    ApplicationID: elements.applicationId?.value?.trim(),
                    OperatorID: state.operatorId,
                    DeviationStage: '',
                    DeviationReason: deviationReason
                }
            );

            console.log('[LoanSanction] DB response (DeviateApplication):', response);

            if (response.success) {
                showToast('Deviation submitted successfully', 'success');
                setTimeout(() => clearForm(), 1500);
            } else {
                showToast(extractResponseMessage(response, 'Failed to submit deviation'), 'error');
            }
        } catch (error) {
            console.error('[LoanSanction] Error deviating application:', error);
            showToast('Error processing deviation: ' + extractResponseMessage(error, error.message), 'error');
        } finally {
            showLoading(false);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // CANCEL HANDLER
    // ═══════════════════════════════════════════════════════════════════

    function handleCancel() {
        if (state.isDirty) {
            if (!confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
                return;
            }
        }
        clearForm();
    }

    // ═══════════════════════════════════════════════════════════════════
    // FORM VALIDATION
    // ═══════════════════════════════════════════════════════════════════

    function validateForm() {
        console.log('[LoanSanction] Validating form...');

        // Validate Approved By
        if (!elements.approvedBy?.value?.trim()) {
            showToast('Please enter Approved By officer', 'error');
            elements.approvedBy?.focus();
            return false;
        }

        // Validate Approved Amount
        const approvedAmount = parseMoneyInput(elements.approvedAmount?.value);
        if (!approvedAmount || approvedAmount <= 0) {
            showToast('Please enter a valid Approved Amount greater than 0', 'error');
            elements.approvedAmount?.focus();
            return false;
        }

        // Validate Mode of Disbursement
        if (!elements.modeOfDisbursement?.value?.trim()) {
            showToast('Please select Mode of Disbursement', 'error');
            elements.modeOfDisbursement?.focus();
            return false;
        }

        // Validate Installment Start Date
        if (!elements.installmentStartDate?.value) {
            showToast('Please enter Installment Start Date', 'error');
            elements.installmentStartDate?.focus();
            return false;
        }

        console.log('[LoanSanction] Form validation passed');
        return true;
    }

    // ═══════════════════════════════════════════════════════════════════
    // FORM DATA COLLECTION
    // ═══════════════════════════════════════════════════════════════════

    function collectFormData() {
        return {
            OurBranchID: elements.branchId?.value?.trim(),
            ApplicationID: elements.applicationId?.value?.trim(),
            OperatorID: state.operatorId,
            ApprovedAmount: parseMoneyInput(elements.approvedAmount?.value),
            ModeOfDisbursement: elements.modeOfDisbursement?.value?.trim(),
            NoOfDisbursements: parseInt(elements.noOfDisbursements?.value) || 0,
            FirstDisbursementDate: elements.firstDisbursementDate?.value,
            CollectInterestDuringGrace: elements.collectInterestDuringGrace?.checked || false,
            RepaymentTerm: parseInt(elements.repaymentTerm?.value) || 0,
            GracePeriod: parseInt(elements.gracePeriod?.value) || 0,
            InstallmentStartDate: elements.installmentStartDate?.value,
            TemplateSchedule: elements.templateSchedule?.value?.trim(),
            MarkingRate: parseMoneyInput(elements.markingRate?.value),
            InterestRateType: elements.interestRateType?.value?.trim(),
            InterestRate: parseMoneyInput(elements.interestRate?.value),
            BaseRate: parseMoneyInput(elements.baseRate?.value),
            MainRepaymentAccountId: elements.mainRepaymentAccountId?.value?.trim(),
            ApprovedBy: elements.approvedBy?.value?.trim(),
            ApprovedDate: elements.approvedDate?.value
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    // FORM CLEAR
    // ═══════════════════════════════════════════════════════════════════

    function clearForm() {
        // Clear all input fields
        Object.keys(elements).forEach(key => {
            const element = elements[key];
            if (element && element.id && element.id.startsWith('session') === false) {
                if (element.type === 'checkbox') {
                    element.checked = false;
                } else if (element.tagName !== 'BUTTON') {
                    element.value = '';
                }
            }
        });

        // Reset to today's date
        const today = new Date().toISOString().split('T')[0];
        if (elements.applicationDate) elements.applicationDate.value = today;

        // Reset state
        state.currentMode = 'INITIAL';
        state.currentSanction = null;
        state.currentApplicationData = null;
        state.isDirty = false;

        // Reset button states
        setStateInitial();

        console.log('[LoanSanction] Form cleared');
    }

    // ═══════════════════════════════════════════════════════════════════
    // STATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    function setStateInitial() {
        state.currentMode = 'INITIAL';

        // Enable initial fields
        enableFields([
            elements.branchId,
            elements.workflowTypeId,
            elements.applicationId,
            elements.applicationDate,
            elements.viewBtn
        ]);

        // Disable action fields and buttons
        disableFields([
            elements.approvedAmount,
            elements.modeOfDisbursement,
            elements.noOfDisbursements,
            elements.firstDisbursementDate,
            elements.gracePeriod,
            elements.installmentStartDate,
            elements.markingRate,
            elements.sanctionBtn,
            elements.deviateBtn,
            elements.cancelBtn
        ]);
    }

    function setStateView() {
        state.currentMode = 'VIEW';

        // Enable all editable fields
        enableFields([
            elements.approvedAmount,
            elements.modeOfDisbursement,
            elements.noOfDisbursements,
            elements.firstDisbursementDate,
            elements.gracePeriod,
            elements.installmentStartDate,
            elements.markingRate,
            elements.mainRepaymentAccountId,
            elements.approvedBy,
            elements.approvedDate,
            elements.sanctionBtn,
            elements.deviateBtn,
            elements.cancelBtn
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function enableFields(fields) {
        fields.forEach(field => {
            if (field && !field.hasAttribute('data-always-readonly')) {
                field.disabled = false;
            }
        });
    }

    function disableFields(fields) {
        fields.forEach(field => {
            if (field) {
                field.disabled = true;
            }
        });
    }

    function parseMoneyInput(value) {
        if (!value || value === '' || value === 'NaN') return 0;
        if (typeof value === 'number') return value;
        const cleaned = String(value).replace(/,/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    }

    function formatMoney(value) {
            function formatDateForInput(dateValue) {
                if (!dateValue) return '';
                if (typeof dateValue === 'string' && dateValue.includes('T')) {
                    return dateValue.split('T')[0];
                }
                return dateValue;
            }
        const num = parseMoneyInput(value);
        if (num === 0 || isNaN(num)) return '0.00';
        return num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function showLoading(show, message = 'Loading...') {
        const overlay = document.getElementById('pageLoadingOverlay');
        const textEl = document.getElementById('pageLoadingText');
        if (overlay) {
            if (show) {
                if (textEl) textEl.textContent = message;
                overlay.style.display = 'flex';
            } else {
                overlay.style.display = 'none';
            }
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
            source.response?.message,
            source.response?.Message,
            source.response?.error,
            source.response?.ErrorMessage,
            source.data?.message,
            source.data?.Message,
            source.data?.error,
            source.data?.ErrorMessage,
            source.data?.data?.message,
            source.data?.data?.Message,
            source.data?.data?.error,
            source.data?.data?.ErrorMessage
        ];

        for (const candidate of candidates) {
            if (typeof candidate === 'string' && candidate.trim()) {
                return candidate.trim();
            }
        }

        return fallback;
    }

    function showToast(message, type = 'info') {
        const panel = document.getElementById('amMessagePanel');
        const textEl = document.getElementById('messagePanelText');

        if (panel && textEl) {
            textEl.textContent = message;
            panel.className = 'am-message-panel am-message-panel--' + type + ' show';

            setTimeout(() => {
                panel.classList.remove('show');
            }, 5000);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODULE INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('[LoanSanction] Module script loaded');

})();
