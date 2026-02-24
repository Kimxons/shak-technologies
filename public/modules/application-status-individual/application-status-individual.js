/**
 * Application Status - Individual Module - JavaScript
 * Following Kairo Banking Application Standards
 */

(async function() {
    'use strict';

    // Load services
    const { ServiceLoader } = window;
    await ServiceLoader.loadCore();
    await ServiceLoader.loadApplicationStatusIndividualService();
    await ServiceLoader.loadSearchService();

    // Get services
    const ApplicationStatusIndividualService = window.ApplicationStatusIndividualService;
    const SearchService = window.SearchService;

    // State Management Variables
    let currentApplication = null;
    let statusReasonsData = [];

    // DOM Elements
    const elements = {
        // Search Inputs
        branchId: document.getElementById('branchId'),
        branchName: document.getElementById('branchName'),
        workflowTypeId: document.getElementById('workflowTypeId'),
        workflowTypeName: document.getElementById('workflowTypeName'),
        applicationId: document.getElementById('applicationId'),
        
        // Application Details
        clientId: document.getElementById('clientId'),
        mailingAddress: document.getElementById('mailingAddress'),
        city: document.getElementById('city'),
        phone: document.getElementById('phone'),
        accountId: document.getElementById('accountId'),
        productId: document.getElementById('productId'),
        loanAmount: document.getElementById('loanAmount'),
        currencyId: document.getElementById('currencyId'),
        term: document.getElementById('term'),
        repaymentTerm: document.getElementById('repaymentTerm'),
        interestRate: document.getElementById('interestRate'),
        interestRateType: document.getElementById('interestRateType'),
        installmentAmount: document.getElementById('installmentAmount'),
        calculationMethod: document.getElementById('calculationMethod'),
        netCollateralValue: document.getElementById('netCollateralValue'),
        applicationStatus: document.getElementById('applicationStatus'),
        
        // Buttons
        viewBtn: document.getElementById('viewBtn'),
        cancelBtn: document.getElementById('cancelBtn'),
        
        // Search Buttons
        searchBranchBtn: document.getElementById('searchBranchBtn'),
        searchWorkflowTypeBtn: document.getElementById('searchWorkflowTypeBtn'),
        searchApplicationBtn: document.getElementById('searchApplicationBtn'),
        
        // Table
        statusReasonsTableBody: document.getElementById('statusReasonsTableBody'),
        
        // Status Message
        statusMessage: document.getElementById('statusMessage')
    };

    // Initialize Module
    function init() {
        attachEventListeners();
        loadInitialData();
    }

    // Attach Event Listeners
    function attachEventListeners() {
        // Action Buttons
        elements.viewBtn.addEventListener('click', handleView);
        elements.cancelBtn.addEventListener('click', handleCancel);
        
        // Search Buttons
        elements.searchBranchBtn.addEventListener('click', () => searchRecord('branch'));
        elements.searchWorkflowTypeBtn.addEventListener('click', () => searchRecord('workflowType'));
        elements.searchApplicationBtn.addEventListener('click', () => searchRecord('application'));
        
        // Enter Key Navigation
        document.querySelectorAll('.form-input:not([readonly])').forEach(input => {
            input.addEventListener('keydown', handleEnterKey);
        });
    }

    // Handle Enter Key
    function handleEnterKey(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const inputs = Array.from(document.querySelectorAll('.form-input:not([readonly]):not([disabled])'));
            const currentIndex = inputs.indexOf(event.target);
            if (currentIndex < inputs.length - 1) {
                inputs[currentIndex + 1].focus();
            }
        }
    }

    // View Function
    async function handleView() {
        if (!elements.branchId.value || !elements.branchId.value.trim()) {
            showStatusMessage('Please enter a Branch ID to view application status.', 'warning');
            elements.branchId.focus();
            return;
        }

        if (!elements.applicationId.value || !elements.applicationId.value.trim()) {
            showStatusMessage('Please enter an Application ID to view application status.', 'warning');
            elements.applicationId.focus();
            return;
        }
        
        async function fetchApplicationStatus() {
            try {
                const requestData = {
                    OurBranchID: elements.branchId.value.trim(),
                    ApplicationID: elements.applicationId.value.trim(),
                    OperatorID: "web_portal" // Get from logged-in user context
                };

                showStatusMessage('Loading application status...', 'info');

                const result = await ApplicationStatusIndividualService.getIndApplPendingDetail(requestData);

                if (result.success) {
                    // Backend returns Details, Details01, Details02
                    const applicationData = result.data.Details || result.data;
                    const clientData = result.data.Details01 ? result.data.Details01[0] : null;
                    const statusReasons = result.data.Details02 || [];
                    
                    if (applicationData && applicationData.length > 0) {
                        currentApplication = applicationData[0];
                        populateApplicationDetails(currentApplication, clientData);
                        
                        statusReasonsData = statusReasons;
                        populateStatusReasonsTable(statusReasonsData);
                        
                        showStatusMessage('Application status loaded successfully.', 'success');
                    } else {
                        showStatusMessage('No application found for the specified criteria.', 'info');
                        clearApplicationDetails();
                        clearTable();
                    }
                } else {
                    // Handle specific error codes
                    if (result.code === '091') {
                        showStatusMessage('Application not found. Please check and try again.', 'warning');
                    } else {
                        showStatusMessage(result.message || 'Failed to load application status', 'error');
                    }
                    clearApplicationDetails();
                    clearTable();
                }
            } catch (error) {
                console.error('Error loading application status:', error);
                showStatusMessage('Error loading application status: ' + error.message, 'error');
                clearApplicationDetails();
                clearTable();
            }
        }
        
        fetchApplicationStatus();
    }

    // Cancel Function
    function handleCancel() {
        clearForm();
        clearTable();
        showStatusMessage('Form cleared.', 'info');
    }

    // Search Record
    function searchRecord(type) {
        // TODO: Implement search modal or lookup functionality
        showStatusMessage(`Search ${type} functionality to be implemented.`, 'info');
        
        // Simulate search result
        switch(type) {
            case 'branch':
                if (elements.branchId.value === '0325') {
                    elements.branchName.value = 'Tillil';
                }
                break;
            case 'workflowType':
                elements.workflowTypeName.value = 'Sample Workflow Type';
                break;
            case 'application':
                // Trigger view if application ID is entered
                if (elements.applicationId.value) {
                    handleView();
                }
                break;
        }
    }

    // Load Initial Data
    function loadInitialData() {
        // Set default values if needed
        console.log('Application Status - Individual module initialized');
    }

    // Populate Application Details
    function populateApplicationDetails(application, clientData) {
        elements.clientId.value = application.ClientID || '';
        elements.accountId.value = application.AccountID || '';
        elements.productId.value = application.ProductID || '';
        elements.loanAmount.value = application.LoanAmount || '';
        elements.currencyId.value = application.CurrencyID || '';
        elements.term.value = application.LoanTerm || '';
        elements.repaymentTerm.value = application.RepaymentTerm || '';
        elements.interestRate.value = application.InterestRate || '';
        elements.interestRateType.value = application.InterestRateType || '';
        elements.installmentAmount.value = application.InstallmentAmount || '';
        elements.calculationMethod.value = application.CalculationMethod || '';
        elements.netCollateralValue.value = application.NetCollateralValue || '';
        elements.applicationStatus.value = application.WFAppStatus || application.ApplicationStatus || '';
        
        // Populate client data if available
        if (clientData) {
            elements.mailingAddress.value = clientData.Address1 || '';
            elements.city.value = clientData.City || '';
            elements.phone.value = clientData.Mobile || clientData.Phone1 || '';
        }
    }

    // Clear Application Details
    function clearApplicationDetails() {
        elements.clientId.value = '';
        elements.mailingAddress.value = '';
        elements.city.value = '';
        elements.phone.value = '';
        elements.accountId.value = '';
        elements.productId.value = '';
        elements.loanAmount.value = '';
        elements.currencyId.value = '';
        elements.term.value = '';
        elements.repaymentTerm.value = '';
        elements.interestRate.value = '';
        elements.interestRateType.value = '';
        elements.installmentAmount.value = '';
        elements.calculationMethod.value = '';
        elements.netCollateralValue.value = '';
        elements.applicationStatus.value = '';
    }

    // Populate Status Reasons Table
    function populateStatusReasonsTable(reasons) {
        elements.statusReasonsTableBody.innerHTML = '';
        
        if (!reasons || reasons.length === 0) {
            elements.statusReasonsTableBody.innerHTML = `
                <tr class="no-records">
                    <td colspan="4">No Records To Display</td>
                </tr>
            `;
            return;
        }
        
        reasons.forEach(reason => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${reason.RuleName || ''}</td>
                <td>${reason.RuleType || ''}</td>
                <td>${reason.IsPassed || ''}</td>
                <td>${reason.Remarks || ''}</td>
            `;
            elements.statusReasonsTableBody.appendChild(row);
        });
    }

    // Clear Form
    function clearForm() {
        elements.branchId.value = '';
        elements.branchName.value = '';
        elements.workflowTypeId.value = '';
        elements.workflowTypeName.value = '';
        elements.applicationId.value = '';
        
        clearApplicationDetails();
        
        currentApplication = null;
        statusReasonsData = [];
    }

    // Clear Table
    function clearTable() {
        elements.statusReasonsTableBody.innerHTML = `
            <tr class="no-records">
                <td colspan="4">No Records To Display</td>
            </tr>
        `;
    }

    // Show Status Message
    function showStatusMessage(message, type = 'info') {
        elements.statusMessage.textContent = message;
        elements.statusMessage.className = `status-message ${type}`;
        elements.statusMessage.style.display = 'block';
        
        setTimeout(() => {
            elements.statusMessage.style.display = 'none';
        }, 5000);
    }

    // Initialize on DOM Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
