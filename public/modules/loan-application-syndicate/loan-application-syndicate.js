/**
 * Loan Application Syndicate Module - JavaScript
 * Following Kairo Banking Application Standards
 */

(async function() {
    'use strict';

    // Load dependencies
    const { ServiceLoader } = window;
    
    try {
        console.log('Loading Bank Syndicate services...');
        await ServiceLoader.loadCore();
        await ServiceLoader.loadBankSyndicateService();
        console.log('Bank Syndicate services loaded successfully');
    } catch (error) {
        console.error('Error loading services:', error);
        alert('Failed to load required services. Please refresh the page.');
        return;
    }

    // Get service
    const BankSyndicateService = window.BankSyndicateService;
    
    if (!BankSyndicateService) {
        console.error('BankSyndicateService not found on window object');
        alert('Bank Syndicate Service not available. Please refresh the page.');
        return;
    }

    // State Management Variables
    let isEditMode = false;
    let currentRecord = null;
    let bankSyndicateData = [];
    let selectedBankIndex = null;
    let elements = null;

    // Initialize Module
    function init() {
        // Initialize DOM Elements after DOM is ready
        elements = {
            // Branch and Application
            branchId: document.getElementById('branchId'),
            branchName: document.getElementById('branchName'),
            applicationId: document.getElementById('applicationId'),
            date: document.getElementById('date'),
            
            // Client and Product
            clientBranchId: document.getElementById('clientBranchId'),
            clientBranchName: document.getElementById('clientBranchName'),
            clientId: document.getElementById('clientId'),
            productId: document.getElementById('productId'),
            mainRepaymentAccountId: document.getElementById('mainRepaymentAccountId'),
            donorId: document.getElementById('donorId'),
            
            // Loan Details
            loanPurpose: document.getElementById('loanPurpose'),
            lineOfBusiness: document.getElementById('lineOfBusiness'),
            officerId: document.getElementById('officerId'),
            loanAmount: document.getElementById('loanAmount'),
            currencyId: document.getElementById('currencyId'),
            term: document.getElementById('term'),
            interestRate: document.getElementById('interestRate'),
            commissionRate: document.getElementById('commissionRate'),
            taxRate: document.getElementById('taxRate'),
            effectiveRate: document.getElementById('effectiveRate'),
            disbursementDate: document.getElementById('disbursementDate'),
            monthlyProfit: document.getElementById('monthlyProfit'),
            monthlyTurnOver: document.getElementById('monthlyTurnOver'),
            totalAssets: document.getElementById('totalAssets'),
            businessLocation: document.getElementById('businessLocation'),
            businessStatus: document.getElementById('businessStatus'),
            startupCapitalCollateral: document.getElementById('startupCapitalCollateral'),
            spread: document.getElementById('spread'),
            loanLimitType: document.getElementById('loanLimitType'),
            fileNumber: document.getElementById('fileNumber'),
            applicationStatus: document.getElementById('applicationStatus'),
            salesOfficer: document.getElementById('salesOfficer'),
            
            // Bank Syndicate
            bankId: document.getElementById('bankId'),
            percentage: document.getElementById('percentage'),
            
            // Action Buttons
            moreInfoBtn: document.getElementById('moreInfoBtn'),
            viewBtn: document.getElementById('viewBtn'),
            addBtn: document.getElementById('addBtn'),
            editBtn: document.getElementById('editBtn'),
            deleteBtn: document.getElementById('deleteBtn'),
            saveBtn: document.getElementById('saveBtn'),
            
            // Bank Action Buttons
            newBtn: document.getElementById('newBtn'),
            alterBtn: document.getElementById('alterBtn'),
            removeBtn: document.getElementById('removeBtn'),
            updateBtn: document.getElementById('updateBtn'),
            clearBtn: document.getElementById('clearBtn'),
            
            // Search Buttons
            searchBranchBtn: document.getElementById('searchBranchBtn'),
            searchApplicationBtn: document.getElementById('searchApplicationBtn'),
            searchClientBranchBtn: document.getElementById('searchClientBranchBtn'),
            searchClientBtn: document.getElementById('searchClientBtn'),
            searchProductBtn: document.getElementById('searchProductBtn'),
            searchAccountBtn: document.getElementById('searchAccountBtn'),
            searchDonorBtn: document.getElementById('searchDonorBtn'),
            searchOfficerBtn: document.getElementById('searchOfficerBtn'),
            searchSalesOfficerBtn: document.getElementById('searchSalesOfficerBtn'),
            searchBankBtn: document.getElementById('searchBankBtn'),
            
            // Table
            bankTableBody: document.getElementById('bankTableBody'),
            
            // Status Message
            statusMessage: document.getElementById('statusMessage')
        };

        console.log('Elements initialized:', elements);
        
        attachEventListeners();
        // Don't disable fields on init - allow user to enter Branch ID and Application ID
        // disableFormFields();
        setDefaultDate();
        loadInitialData();
    }

    // Attach Event Listeners
    function attachEventListeners() {
        // Main Action Buttons
        elements.moreInfoBtn.addEventListener('click', handleMoreInfo);
        elements.viewBtn.addEventListener('click', handleView);
        elements.addBtn.addEventListener('click', handleAdd);
        elements.editBtn.addEventListener('click', handleEdit);
        elements.deleteBtn.addEventListener('click', handleDelete);
        elements.saveBtn.addEventListener('click', handleSave);
        
        // Bank Action Buttons
        elements.newBtn.addEventListener('click', handleBankNew);
        elements.alterBtn.addEventListener('click', handleBankAlter);
        elements.removeBtn.addEventListener('click', handleBankRemove);
        elements.updateBtn.addEventListener('click', handleBankUpdate);
        elements.clearBtn.addEventListener('click', handleBankClear);
        
        // Search Buttons
        elements.searchBranchBtn.addEventListener('click', () => searchRecord('branch'));
        elements.searchApplicationBtn.addEventListener('click', () => searchRecord('application'));
        elements.searchClientBranchBtn.addEventListener('click', () => searchRecord('clientBranch'));
        elements.searchClientBtn.addEventListener('click', () => searchRecord('client'));
        elements.searchProductBtn.addEventListener('click', () => searchRecord('product'));
        elements.searchAccountBtn.addEventListener('click', () => searchRecord('account'));
        elements.searchDonorBtn.addEventListener('click', () => searchRecord('donor'));
        elements.searchOfficerBtn.addEventListener('click', () => searchRecord('officer'));
        elements.searchSalesOfficerBtn.addEventListener('click', () => searchRecord('salesOfficer'));
        elements.searchBankBtn.addEventListener('click', () => searchRecord('bank'));
        
        // Table Row Selection
        elements.bankTableBody.addEventListener('click', handleBankRowSelection);
        
        // Enter Key Navigation
        document.querySelectorAll('.form-input:not([readonly])').forEach(input => {
            input.addEventListener('keydown', handleEnterKey);
        });
    }

    // Set Default Date
    function setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        elements.date.value = today;
    }

    // Handle Enter Key
    function handleEnterKey(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const inputs = Array.from(document.querySelectorAll('.form-input:not([readonly]):not([disabled]), .form-select:not([disabled])'));
            const currentIndex = inputs.indexOf(event.target);
            if (currentIndex < inputs.length - 1) {
                inputs[currentIndex + 1].focus();
            }
        }
    }

    // CRUD Operations
    function handleMoreInfo() {
        showStatusMessage('More Info functionality to be implemented.', 'info');
    }

    function handleView() {
        if (!elements.branchId.value) {
            showStatusMessage('Please enter a Branch ID first.', 'warning');
            elements.branchId.focus();
            return;
        }
        
        if (!elements.applicationId.value) {
            showStatusMessage('Please enter an Application ID to view.', 'warning');
            elements.applicationId.focus();
            return;
        }
        
        console.log('View button clicked - fetching data...');
        showStatusMessage('Loading application data...', 'info');
        fetchBankSyndicateData();
    }

    async function fetchBankSyndicateData() {
        if (!elements.applicationId.value) {
            showStatusMessage('Application ID is required', 'warning');
            return;
        }

        if (!BankSyndicateService) {
            showStatusMessage('Bank Syndicate Service not loaded. Please refresh the page.', 'error');
            console.error('BankSyndicateService is undefined');
            return;
        }

        try {
            showStatusMessage('Fetching bank syndicate data...', 'info');

            const requestData = {
                OurBranchID: elements.branchId.value || '',
                ApplicationID: elements.applicationId.value || '',
                OperatorID: 'OperatorID' // Should come from session
            };

            console.log('Fetching bank syndicate with request:', requestData);
            const response = await BankSyndicateService.getBankSyndicate(requestData);
            console.log('Bank syndicate response:', response);

            // Extract the actual data from CoreApi normalized response
            const apiData = response.data || response;
            console.log('Extracted API data:', apiData);

            if (apiData) {
                // Populate Details (Rate Information)
                if (apiData.Details && apiData.Details.length > 0) {
                    const rateInfo = apiData.Details[0];
                    // You can populate rate fields here if they exist in your form
                    console.log('Rate Information:', rateInfo);
                }

                // Populate Details02 (Main Application Data)
                if (apiData.Details02 && apiData.Details02.length > 0) {
                    const appData = apiData.Details02[0];
                    populateApplicationData(appData);
                    currentRecord = appData;
                    showStatusMessage('Bank syndicate data loaded successfully', 'success');
                } else {
                    showStatusMessage('No application data found', 'info');
                }

                // Populate Details01 (Bank Syndicate List - if exists)
                if (apiData.Details01 && apiData.Details01.length > 0) {
                    bankSyndicateData = apiData.Details01.map(bank => ({
                        bankId: bank.BankID || '',
                        bankName: bank.BankName || '',
                        percentage: bank.Percentage || '',
                        modifiedBy: bank.ModifiedBy || '',
                        modifiedOn: bank.ModifiedOn || ''
                    }));
                    populateBankTable();
                } else {
                    bankSyndicateData = [];
                    populateBankTable();
                }

                disableFormFields();
                updateButtonStates(true, false, false);
            } else {
                showStatusMessage('No data returned from server', 'info');
            }
        } catch (error) {
            console.error('Error fetching bank syndicate data:', error);
            showStatusMessage('Error loading data: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    function populateApplicationData(data) {
        console.log('populateApplicationData called with:', data);
        console.log('Elements object:', elements);
        
        // Branch and Application
        if (elements.branchId) {
            elements.branchId.value = data.OurBranchID || '';
            console.log('Set branchId to:', data.OurBranchID);
        }
        if (elements.applicationId) {
            elements.applicationId.value = data.ApplicationID || '';
            console.log('Set applicationId to:', data.ApplicationID);
        }
        if (elements.date) {
            elements.date.value = data.ApplicationDate ? data.ApplicationDate.split('T')[0] : '';
            console.log('Set date to:', data.ApplicationDate);
        }

        // Client and Product
        if (elements.clientBranchId) {
            elements.clientBranchId.value = data.ClientBranchID || '';
            console.log('Set clientBranchId to:', data.ClientBranchID);
        }
        if (elements.clientId) {
            elements.clientId.value = data.ClientID || '';
            console.log('Set clientId to:', data.ClientID);
        }
        if (elements.productId) {
            elements.productId.value = data.ProductID || '';
            console.log('Set productId to:', data.ProductID);
        }
        if (elements.mainRepaymentAccountId) {
            elements.mainRepaymentAccountId.value = data.RepaymentAccountID || '';
            console.log('Set mainRepaymentAccountId to:', data.RepaymentAccountID);
        }
        if (elements.donorId) {
            elements.donorId.value = data.DonorID || '';
            console.log('Set donorId to:', data.DonorID);
        }

        // Loan Details
        if (elements.loanPurpose) {
            elements.loanPurpose.value = data.PurposeCodeID || '';
            console.log('Set loanPurpose to:', data.PurposeCodeID);
        }
        if (elements.lineOfBusiness) {
            elements.lineOfBusiness.value = data.BusinessLineID || '';
            console.log('Set lineOfBusiness to:', data.BusinessLineID);
        }
        if (elements.officerId) {
            elements.officerId.value = data.CreditOfficerID || '';
            console.log('Set officerId to:', data.CreditOfficerID);
        }
        if (elements.loanAmount) {
            elements.loanAmount.value = data.LoanAmount || '';
            console.log('Set loanAmount to:', data.LoanAmount);
        }
        if (elements.currencyId) {
            elements.currencyId.value = data.CurrencyID || '';
            console.log('Set currencyId to:', data.CurrencyID);
        }
        if (elements.term) {
            elements.term.value = data.LoanTerm || '';
            console.log('Set term to:', data.LoanTerm);
        }
        if (elements.interestRate) {
            elements.interestRate.value = ''; // Not in response
        }
        if (elements.commissionRate) {
            elements.commissionRate.value = data.CommissionRate || '';
            console.log('Set commissionRate to:', data.CommissionRate);
        }
        if (elements.taxRate) {
            elements.taxRate.value = data.TaxRate || '';
            console.log('Set taxRate to:', data.TaxRate);
        }
        if (elements.effectiveRate) {
            elements.effectiveRate.value = data.EffectiveRate || '';
            console.log('Set effectiveRate to:', data.EffectiveRate);
        }
        if (elements.disbursementDate) {
            elements.disbursementDate.value = data.DisbursementDate ? data.DisbursementDate.split('T')[0] : '';
            console.log('Set disbursementDate to:', data.DisbursementDate);
        }
        if (elements.fileNumber) {
            elements.fileNumber.value = data.FileNumber || '';
            console.log('Set fileNumber to:', data.FileNumber);
        }
        if (elements.applicationStatus) {
            elements.applicationStatus.value = data.WFAppStatus || '';
            console.log('Set applicationStatus to:', data.WFAppStatus);
        }
        if (elements.salesOfficer) {
            elements.salesOfficer.value = data.SalesOfficerID || '';
            console.log('Set salesOfficer to:', data.SalesOfficerID);
        }

        console.log('Application data populated successfully');
    }

    function handleAdd() {
        clearForm();
        enableFormFields();
        isEditMode = true;
        updateButtonStates(false, false, true);
        elements.branchId.focus();
        showStatusMessage('Ready to add new loan application syndicate.', 'info');
    }

    function handleEdit() {
        if (!currentRecord) {
            showStatusMessage('Please view a record first before editing.', 'warning');
            return;
        }
        enableFormFields();
        isEditMode = true;
        updateButtonStates(false, false, true);
        showStatusMessage('Edit mode enabled.', 'info');
    }

    function handleDelete() {
        if (!currentRecord) {
            showStatusMessage('Please select a record to delete.', 'warning');
            return;
        }
        
        if (confirm('Are you sure you want to delete this record?')) {
            // TODO: Delete record via backend
            showStatusMessage('Record deleted successfully.', 'success');
            clearForm();
            updateButtonStates(false, false, false);
        }
    }

    function handleSave() {
        if (!validateForm()) {
            return;
        }
        
        // TODO: Save to backend
        showStatusMessage('Record saved successfully.', 'success');
        disableFormFields();
        isEditMode = false;
        updateButtonStates(true, false, false);
    }

    // Bank Syndicate Operations
    function handleBankNew() {
        elements.bankId.value = '';
        elements.percentage.value = '';
        selectedBankIndex = null;
        elements.bankId.focus();
    }

    function handleBankAlter() {
        if (selectedBankIndex === null) {
            showStatusMessage('Please select a bank record to alter.', 'warning');
            return;
        }
        
        const bank = bankSyndicateData[selectedBankIndex];
        elements.bankId.value = bank.bankId;
        elements.percentage.value = bank.percentage;
    }

    function handleBankRemove() {
        if (selectedBankIndex === null) {
            showStatusMessage('Please select a bank record to remove.', 'warning');
            return;
        }
        
        if (confirm('Are you sure you want to remove this bank?')) {
            bankSyndicateData.splice(selectedBankIndex, 1);
            populateBankTable();
            handleBankClear();
            showStatusMessage('Bank removed successfully.', 'success');
        }
    }

    function handleBankUpdate() {
        if (!elements.bankId.value || !elements.percentage.value) {
            showStatusMessage('Please enter Bank ID and Percentage.', 'warning');
            return;
        }
        
        const bankData = {
            bankId: elements.bankId.value,
            bankName: 'Bank Name', // TODO: Get from backend
            percentage: elements.percentage.value
        };
        
        if (selectedBankIndex !== null) {
            bankSyndicateData[selectedBankIndex] = bankData;
            showStatusMessage('Bank updated successfully.', 'success');
        } else {
            bankSyndicateData.push(bankData);
            showStatusMessage('Bank added successfully.', 'success');
        }
        
        populateBankTable();
        handleBankClear();
    }

    function handleBankClear() {
        elements.bankId.value = '';
        elements.percentage.value = '';
        selectedBankIndex = null;
        
        // Remove selection from table
        elements.bankTableBody.querySelectorAll('tr').forEach(row => {
            row.classList.remove('selected');
        });
    }

    // Handle Bank Row Selection
    function handleBankRowSelection(event) {
        const row = event.target.closest('tr');
        if (!row || row.classList.contains('no-records')) return;
        
        elements.bankTableBody.querySelectorAll('tr').forEach(r => {
            r.classList.remove('selected');
        });
        
        row.classList.add('selected');
        selectedBankIndex = parseInt(row.dataset.index);
        
        const bank = bankSyndicateData[selectedBankIndex];
        elements.bankId.value = bank.bankId;
        elements.percentage.value = bank.percentage;
    }

    // Populate Bank Table
    function populateBankTable() {
        elements.bankTableBody.innerHTML = '';
        
        if (bankSyndicateData.length === 0) {
            elements.bankTableBody.innerHTML = `
                <tr class="no-records">
                    <td colspan="3">No records to display.</td>
                </tr>
            `;
            return;
        }
        
        bankSyndicateData.forEach((bank, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            row.innerHTML = `
                <td>${bank.bankId}</td>
                <td>${bank.bankName}</td>
                <td>${bank.percentage}</td>
            `;
            elements.bankTableBody.appendChild(row);
        });
    }

    // Search Record
    function searchRecord(type) {
        showStatusMessage(`Search ${type} functionality to be implemented.`, 'info');
        
        // Simulate search
        switch(type) {
            case 'branch':
                if (elements.branchId.value === '0325') {
                    elements.branchName.value = 'Tillil';
                }
                break;
            case 'clientBranch':
                if (elements.clientBranchId.value === '0325') {
                    elements.clientBranchName.value = 'Tillil';
                }
                break;
        }
    }

    // Form Validation
    function validateForm() {
        if (!elements.branchId.value) {
            showStatusMessage('Branch ID is required.', 'error');
            elements.branchId.focus();
            return false;
        }
        
        if (!elements.applicationId.value) {
            showStatusMessage('Application ID is required.', 'error');
            elements.applicationId.focus();
            return false;
        }
        
        return true;
    }

    // Enable/Disable Form Fields
    function enableFormFields() {
        document.querySelectorAll('.form-input:not([readonly]), .form-select').forEach(field => {
            field.disabled = false;
        });
    }

    function disableFormFields() {
        document.querySelectorAll('.form-input:not([readonly]), .form-select').forEach(field => {
            field.disabled = true;
        });
    }

    // Update Button States
    function updateButtonStates(hasRecord, canEdit, isSaving) {
        elements.editBtn.disabled = !hasRecord || isSaving;
        elements.deleteBtn.disabled = !hasRecord || isSaving;
        elements.saveBtn.disabled = !isSaving;
    }

    // Clear Form
    function clearForm() {
        document.querySelectorAll('.form-input').forEach(input => {
            if (!input.hasAttribute('readonly')) {
                input.value = '';
            }
        });
        
        document.querySelectorAll('.form-select').forEach(select => {
            select.selectedIndex = 0;
        });
        
        setDefaultDate();
        bankSyndicateData = [];
        populateBankTable();
        currentRecord = null;
        isEditMode = false;
    }

    // Load Initial Data
    function loadInitialData() {
        console.log('Loan Application Syndicate module initialized');
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
