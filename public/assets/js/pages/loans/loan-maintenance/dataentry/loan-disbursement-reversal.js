/**
 * Loan Disbursement Reversal - Modern Implementation
 * Module ID: 4553
 * 
 * Business Logic:
 * - View: Fetches loan details for reversal validation
 * - Edit: Enables reason and remarks fields for reversal
 * - Save: Submits reversal request with validation
 * - Cancel: Resets form or cancels edit mode
 * 
 * Flow:
 * 1. User enters Branch/Client/Account
 * 2. Click View to fetch loan details
 * 3. Click Edit to enable reversal fields
 * 4. Enter Reason and Remarks
 * 5. Click Save to process reversal
 */

(function () {
  'use strict';

  // ========================================
  // Constants & Configuration
  // ========================================
  const MODULE_ID = '4553';
  const PAGE_NAME = 'LoanDisbursementReversal';

  // Form state
  let currentMode = 'VIEW'; // VIEW, EDIT
  let loanReversalData = null;
  let searchModal = null;

  // ========================================
  // DOM Elements
  // ========================================
  const elements = {
    // Inputs
    branchID: document.getElementById('BranchID'),
    branchName: document.getElementById('BranchName'),
    clientID: document.getElementById('ClientID'),
    clientName: document.getElementById('ClientName'),
    accountID: document.getElementById('AccountID'),
    accountName: document.getElementById('AccountName'),
    loanSeries: document.getElementById('LoanSeries'),
    reasonID: document.getElementById('ReasonID'),
    remarks: document.getElementById('Remarks'),
    
    // BTS Fields
    loanAmount: document.getElementById('LoanAmount'),
    loanBalance: document.getElementById('LoanBalance'),
    productID: document.getElementById('ProductID'),
    currencyID: document.getElementById('CurrencyID'),
    maturityDate: document.getElementById('MaturityDate'),
    loanStatus: document.getElementById('LoanStatus'),
    disbursedBy: document.getElementById('DisbursedBy'),
    lastDisbursementDate: document.getElementById('LastDisbursementDate'),
    reversalType: document.getElementById('ReversalType'),
    loanType: document.getElementById('LoanType'),
    applicationID: document.getElementById('ApplicationID'),

    // Buttons
    btnView: document.querySelector('[data-action="view"]'),
    btnEdit: document.querySelector('[data-action="edit"]'),
    btnSave: document.querySelector('[data-action="save"]'),
    btnCancel: document.querySelector('[data-action="cancel"]'),
    btnBack: document.querySelector('[data-action="back"]'),

    // Search Buttons
    btnBranchSearch: document.getElementById('btnBranchSearch'),
    btnClientSearch: document.getElementById('btnClientSearch'),
    btnAccountSearch: document.getElementById('btnAccountSearch')
  };

  // ========================================
  // Initialization
  // ========================================
  document.addEventListener('DOMContentLoaded', function () {
    console.log(`[${PAGE_NAME}] Initializing module...`);
    initializeSearchModal();
    initializeEventListeners();
    initializeReasonDropdown();
    setInitialState();
    console.log(`[${PAGE_NAME}] Module initialized successfully`);
  });

  /**
   * Initialize Search Modal Component
   */
  function initializeSearchModal() {
    if (typeof SearchModal === 'undefined') {
      console.error(`[${PAGE_NAME}] SearchModal component not loaded`);
      return;
    }
    searchModal = new SearchModal('searchModal');
  }

  /**
   * Initialize Event Listeners
   */
  function initializeEventListeners() {
    // Button Actions
    elements.btnView?.addEventListener('click', handleView);
    elements.btnEdit?.addEventListener('click', handleEdit);
    elements.btnSave?.addEventListener('click', handleSave);
    elements.btnCancel?.addEventListener('click', handleCancel);
    elements.btnBack?.addEventListener('click', handleBack);

    // Search Buttons
    elements.btnBranchSearch?.addEventListener('click', () => openBranchSearch());
    elements.btnClientSearch?.addEventListener('click', () => openClientSearch());
    elements.btnAccountSearch?.addEventListener('click', () => openAccountSearch());

    // Keyboard Events
    elements.branchID?.addEventListener('keydown', handleBranchKeyDown);
    elements.clientID?.addEventListener('keydown', handleClientKeyDown);
    elements.accountID?.addEventListener('keydown', handleAccountKeyDown);

    // Enter Key Navigation
    elements.branchID?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (elements.branchID.value.trim()) {
          elements.clientID?.focus();
        }
      }
    });

    elements.clientID?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (elements.clientID.value.trim()) {
          elements.accountID?.focus();
        }
      }
    });

    elements.accountID?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (elements.accountID.value.trim()) {
          handleView();
        }
      }
    });
  }

  /**
   * Initialize Reason Dropdown
   */
  async function initializeReasonDropdown() {
    // TODO: Fetch from database using p_GetSearchResult with TableID='LoanReversalReasonID'
    // For now, adding common reversal reasons
    const reasons = [
      { value: '', text: 'Select Reason' },
      { value: 'R001', text: 'Wrong Disbursement' },
      { value: 'R002', text: 'Duplicate Entry' },
      { value: 'R003', text: 'Client Request' },
      { value: 'R004', text: 'System Error' },
      { value: 'R005', text: 'Account Closed' },
      { value: 'R006', text: 'Other' }
    ];

    elements.reasonID.innerHTML = '';
    reasons.forEach(reason => {
      const option = document.createElement('option');
      option.value = reason.value;
      option.textContent = reason.text;
      elements.reasonID.appendChild(option);
    });
  }

  /**
   * Set Initial Form State
   */
  function setInitialState() {
    currentMode = 'VIEW';
    clearForm();
    setFormMode('VIEW');
    
    // Set default branch from session
    if (typeof AuthService !== 'undefined' && AuthService.getSession) {
      const session = AuthService.getSession();
      if (session?.BranchID) {
        elements.branchID.value = session.BranchID;
        elements.branchName.value = session.BranchName || '';
        elements.branchID.disabled = true;
      }
    }

    elements.accountID?.focus();
  }

  // ========================================
  // Form Mode Management
  // ========================================
  /**
   * Set form mode and enable/disable fields accordingly
   */
  function setFormMode(mode) {
    currentMode = mode;

    switch (mode) {
      case 'VIEW':
        // Enable search fields
        elements.branchID.disabled = false;
        elements.clientID.disabled = false;
        elements.accountID.disabled = false;

        // Disable reversal fields
        elements.reasonID.disabled = true;
        elements.remarks.disabled = true;

        // Button states
        elements.btnView.disabled = false;
        elements.btnEdit.disabled = true;
        elements.btnSave.disabled = true;
        elements.btnCancel.disabled = true;
        break;

      case 'VIEW_LOADED':
        // Disable search fields after loading data
        elements.branchID.disabled = true;
        elements.clientID.disabled = true;
        elements.accountID.disabled = true;

        // Keep reversal fields disabled
        elements.reasonID.disabled = true;
        elements.remarks.disabled = true;

        // Button states
        elements.btnView.disabled = true;
        elements.btnEdit.disabled = false;
        elements.btnSave.disabled = true;
        elements.btnCancel.disabled = false;
        break;

      case 'EDIT':
        // All search fields stay disabled
        elements.branchID.disabled = true;
        elements.clientID.disabled = true;
        elements.accountID.disabled = true;

        // Enable reversal fields
        elements.reasonID.disabled = false;
        elements.remarks.disabled = false;

        // Button states
        elements.btnView.disabled = true;
        elements.btnEdit.disabled = true;
        elements.btnSave.disabled = false;
        elements.btnCancel.disabled = false;
        break;
    }
  }

  // ========================================
  // Button Handlers
  // ========================================
  /**
   * Handle View Button Click
   */
  async function handleView() {
    console.log(`[${PAGE_NAME}] View button clicked`);

    // Validate inputs
    if (!validateViewInputs()) {
      return;
    }

    const branchID = elements.branchID.value.trim();
    const clientID = elements.clientID.value.trim();
    const accountID = elements.accountID.value.trim();

    // Show loading
    elements.btnView.disabled = true;
    elements.btnView.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Loading...';

    try {
      // Fetch loan reversal details
      const response = await LoanDisbursementReversalService.getLoanReversalDetails(
        branchID,
        clientID,
        accountID
      );

      if (!response.success) {
        showMessage('error', response.error || 'Failed to load loan details');
        setFormMode('VIEW');
        return;
      }

      if (!response.data) {
        showMessage('error', 'No loan reversal details found for this account');
        setFormMode('VIEW');
        return;
      }

      // Store data and populate form
      loanReversalData = response.data;
      populateFormData(response.data);
      setFormMode('VIEW_LOADED');
      showMessage('success', 'Loan details loaded successfully');

    } catch (error) {
      console.error(`[${PAGE_NAME}] Error in handleView:`, error);
      showMessage('error', error.message || 'An error occurred while loading loan details');
      setFormMode('VIEW');
    } finally {
      elements.btnView.disabled = false;
      elements.btnView.textContent = 'View';
    }
  }

  /**
   * Handle Edit Button Click
   */
  async function handleEdit() {
    console.log(`[${PAGE_NAME}] Edit button clicked`);

    if (!loanReversalData) {
      showMessage('error', 'Please load loan details first');
      return;
    }

    // TODO: Check user rights
    // For now, directly enable edit mode
    setFormMode('EDIT');
    elements.reasonID.focus();
    showMessage('info', 'Edit mode enabled. Please enter reason and remarks');
  }

  /**
   * Handle Save Button Click
   */
  async function handleSave() {
    console.log(`[${PAGE_NAME}] Save button clicked`);

    // Validate inputs
    if (!validateSaveInputs()) {
      return;
    }

    // Confirmation dialog
    if (!confirm('Are you sure you want to reverse this loan disbursement?')) {
      return;
    }

    const reversalData = {
      OurBranchID: elements.branchID.value.trim(),
      ClientID: elements.clientID.value.trim(),
      LoanAccountID: elements.accountID.value.trim(),
      LoanSeries: loanReversalData.LoanSeries || '',
      ApplicationID: loanReversalData.ApplicationID || '',
      ReversalTypeID: loanReversalData.ReversalTypeID || '',
      LoanReversalReasonID: elements.reasonID.value,
      Remarks: elements.remarks.value.trim()
    };

    // Show loading
    elements.btnSave.disabled = true;
    elements.btnSave.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';

    try {
      const response = await LoanDisbursementReversalService.saveLoanReversal(reversalData, 'EDIT');

      if (!response.success) {
        showMessage('error', response.error || 'Failed to save loan reversal');
        return;
      }

      showMessage('success', response.message || 'Loan reversal saved successfully');
      
      // Reset form after successful save
      setTimeout(() => {
        resetForm();
      }, 1500);

    } catch (error) {
      console.error(`[${PAGE_NAME}] Error in handleSave:`, error);
      showMessage('error', error.message || 'An error occurred while saving');
    } finally {
      elements.btnSave.disabled = false;
      elements.btnSave.textContent = 'Save';
    }
  }

  /**
   * Handle Cancel Button Click
   */
  function handleCancel() {
    console.log(`[${PAGE_NAME}] Cancel button clicked`);

    if (currentMode === 'EDIT') {
      // Confirm cancellation
      if (!confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
        return;
      }

      // Return to VIEW_LOADED mode
      elements.reasonID.value = '';
      elements.remarks.value = '';
      setFormMode('VIEW_LOADED');
      showMessage('info', 'Edit cancelled');
    } else {
      // Reset entire form
      resetForm();
    }
  }

  /**
   * Handle Back Button Click
   */
  function handleBack() {
    console.log(`[${PAGE_NAME}] Back button clicked`);
    
    if (currentMode === 'EDIT') {
      if (!confirm('You have unsaved changes. Are you sure you want to go back?')) {
        return;
      }
    }

    // Navigate back
    window.history.back();
  }

  // ========================================
  // Search Functionality
  // ========================================
  /**
   * Open Branch Search Modal
   */
  async function openBranchSearch() {
    if (!searchModal) {
      showMessage('error', 'Search component not available');
      return;
    }

    const searchKey = elements.branchID.value.trim() || '';

    const config = {
      title: 'Search Branch',
      searchPlaceholder: 'Enter Branch ID or Name',
      columns: [
        { field: 'OurBranchID', header: 'Branch ID', width: '120px' },
        { field: 'BranchName', header: 'Branch Name', width: '250px' }
      ],
      searchFunction: async (key) => {
        return await LoanDisbursementReversalService.searchBranches(key || searchKey);
      },
      onSelect: (selectedRow) => {
        elements.branchID.value = selectedRow.OurBranchID || '';
        elements.branchName.value = selectedRow.BranchName || '';
        elements.clientID?.focus();
      }
    };

    searchModal.open(config);
  }

  /**
   * Open Client Search Modal
   */
  async function openClientSearch() {
    if (!searchModal) {
      showMessage('error', 'Search component not available');
      return;
    }

    const branchID = elements.branchID.value.trim();
    if (!branchID) {
      showMessage('error', 'Please select a branch first');
      elements.branchID?.focus();
      return;
    }

    const searchKey = elements.clientID.value.trim() || '';

    const config = {
      title: 'Search Client',
      searchPlaceholder: 'Enter Client ID or Name',
      columns: [
        { field: 'ClientID', header: 'Client ID', width: '120px' },
        { field: 'ClientName', header: 'Client Name', width: '250px' }
      ],
      searchFunction: async (key) => {
        return await LoanDisbursementReversalService.searchClients(branchID, key || searchKey);
      },
      onSelect: (selectedRow) => {
        elements.clientID.value = selectedRow.ClientID || '';
        elements.clientName.value = selectedRow.ClientName || '';
        elements.accountID?.focus();
      }
    };

    searchModal.open(config);
  }

  /**
   * Open Account Search Modal
   */
  async function openAccountSearch() {
    if (!searchModal) {
      showMessage('error', 'Search component not available');
      return;
    }

    const branchID = elements.branchID.value.trim();
    if (!branchID) {
      showMessage('error', 'Please select a branch first');
      elements.branchID?.focus();
      return;
    }

    const clientID = elements.clientID.value.trim();
    const searchKey = elements.accountID.value.trim() || '';

    const config = {
      title: 'Search Loan Account',
      searchPlaceholder: 'Enter Account ID',
      columns: [
        { field: 'AccountID', header: 'Account ID', width: '150px' },
        { field: 'AccountName', header: 'Account Name', width: '200px' },
        { field: 'ProductID', header: 'Product', width: '100px' }
      ],
      searchFunction: async (key) => {
        return await LoanDisbursementReversalService.searchAccounts(branchID, clientID, key || searchKey);
      },
      onSelect: (selectedRow) => {
        elements.accountID.value = selectedRow.AccountID || '';
        elements.accountName.value = selectedRow.AccountName || '';
        // Optionally auto-trigger View
        handleView();
      }
    };

    searchModal.open(config);
  }

  // ========================================
  // Keyboard Handlers
  // ========================================
  /**
   * Handle Branch ID Keydown (F2 for search)
   */
  function handleBranchKeyDown(event) {
    if (event.key === 'F2') {
      event.preventDefault();
      openBranchSearch();
    }
  }

  /**
   * Handle Client ID Keydown (F2 for search)
   */
  function handleClientKeyDown(event) {
    if (event.key === 'F2') {
      event.preventDefault();
      openClientSearch();
    }
  }

  /**
   * Handle Account ID Keydown (F2 for search)
   */
  function handleAccountKeyDown(event) {
    if (event.key === 'F2') {
      event.preventDefault();
      openAccountSearch();
    }
  }

  // ========================================
  // Data Population
  // ========================================
  /**
   * Populate form with loan reversal data
   */
  function populateFormData(data) {
    // Account Details (already filled from search)
    if (data.ClientID) {
      elements.clientID.value = data.ClientID;
      elements.clientName.value = data.ClientName || '';
    }
    elements.accountName.value = data.AccountName || '';
    elements.loanSeries.value = data.LoanSeries || '';

    // BTS Fields
    elements.loanAmount.value = formatCurrency(data.LoanAmount);
    elements.loanBalance.value = formatCurrency(data.LoanBalance);
    elements.productID.value = data.ProductID || '';
    elements.currencyID.value = data.CurrencyID || '';
    elements.maturityDate.value = formatDate(data.MaturityDate);
    elements.loanStatus.value = data.LoanStatus || '';
    elements.disbursedBy.value = data.LastDisbursedBy || '';
    elements.lastDisbursementDate.value = formatDate(data.LastDisbursementDate);
    elements.reversalType.value = data.ReversalType || '';
    elements.loanType.value = data.LoanType || '';
    elements.applicationID.value = data.ApplicationID || '';
  }

  // ========================================
  // Validation
  // ========================================
  /**
   * Validate inputs before View
   */
  function validateViewInputs() {
    clearFieldErrors();

    const branchID = elements.branchID.value.trim();
    const accountID = elements.accountID.value.trim();

    if (!branchID) {
      showFieldError(elements.branchID, 'Branch ID is required');
      elements.branchID.focus();
      return false;
    }

    if (!accountID) {
      showFieldError(elements.accountID, 'Account ID is required');
      elements.accountID.focus();
      return false;
    }

    return true;
  }

  /**
   * Validate inputs before Save
   */
  function validateSaveInputs() {
    clearFieldErrors();

    const reasonID = elements.reasonID.value.trim();
    const remarks = elements.remarks.value.trim();

    if (!reasonID) {
      showFieldError(elements.reasonID, 'Reason is required');
      elements.reasonID.focus();
      return false;
    }

    if (!remarks) {
      showFieldError(elements.remarks, 'Remarks are required');
      elements.remarks.focus();
      return false;
    }

    if (remarks.length < 5) {
      showFieldError(elements.remarks, 'Remarks must be at least 5 characters');
      elements.remarks.focus();
      return false;
    }

    return true;
  }

  /**
   * Show field-level error
   */
  function showFieldError(element, message) {
    element.classList.add('is-invalid');
    showMessage('error', message);
  }

  /**
   * Clear all field errors
   */
  function clearFieldErrors() {
    document.querySelectorAll('.is-invalid').forEach(el => {
      el.classList.remove('is-invalid');
    });
  }

  // ========================================
  // Utility Functions
  // ========================================
  /**
   * Clear all form fields
   */
  function clearForm() {
    // Keep branch (usually session-locked)
    elements.clientID.value = '';
    elements.clientName.value = '';
    elements.accountID.value = '';
    elements.accountName.value = '';
    elements.loanSeries.value = '';
    elements.reasonID.value = '';
    elements.remarks.value = '';

    // BTS Fields
    elements.loanAmount.value = '';
    elements.loanBalance.value = '';
    elements.productID.value = '';
    elements.currencyID.value = '';
    elements.maturityDate.value = '';
    elements.loanStatus.value = '';
    elements.disbursedBy.value = '';
    elements.lastDisbursementDate.value = '';
    elements.reversalType.value = '';
    elements.loanType.value = '';
    elements.applicationID.value = '';

    loanReversalData = null;
  }

  /**
   * Reset form to initial state
   */
  function resetForm() {
    clearForm();
    setInitialState();
  }

  /**
   * Format currency
   */
  function formatCurrency(value) {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
   * Format date
   */
  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
    } catch {
      return dateStr;
    }
  }

  /**
   * Show message using Bootstrap Toast
   */
  function showMessage(type, message) {
    const toastEl = document.getElementById('liveToast');
    const toastTitle = document.getElementById('toastTitle');
    const toastBody = document.getElementById('toastBody');

    if (!toastEl || !toastTitle || !toastBody) {
      console.warn(`[${PAGE_NAME}] Toast elements not found, using alert`);
      alert(message);
      return;
    }

    // Set title based on type
    const titles = {
      success: 'Success',
      error: 'Error',
      info: 'Information',
      warning: 'Warning'
    };

    toastTitle.textContent = titles[type] || 'Notification';
    toastBody.textContent = message;

    // Set color based on type
    toastEl.classList.remove('bg-success', 'bg-danger', 'bg-info', 'bg-warning', 'text-white');
    if (type === 'success') {
      toastEl.classList.add('bg-success', 'text-white');
    } else if (type === 'error') {
      toastEl.classList.add('bg-danger', 'text-white');
    } else if (type === 'warning') {
      toastEl.classList.add('bg-warning');
    } else {
      toastEl.classList.add('bg-info', 'text-white');
    }

    const toast = new bootstrap.Toast(toastEl);
    toast.show();
  }

  console.log(`[${PAGE_NAME}] Script loaded successfully`);

})();
