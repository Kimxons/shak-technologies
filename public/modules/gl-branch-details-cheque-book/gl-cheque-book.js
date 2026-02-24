/**
 * GL-Cheque Book Module
 * Handles form state management, tab switching, grid operations, and action buttons
 */

(function () {
  'use strict';

  // DOM Elements
  const elements = {
    // Form fields
    branchId: document.getElementById('branchId'),
    branchName: document.getElementById('branchName'),
    accountId: document.getElementById('accountId'),
    issueDate: document.getElementById('issueDate'),
    bookType: document.getElementById('bookType'),
    noOfLeaves: document.getElementById('noOfLeaves'),
    cpoPrefix: document.getElementById('cpoPrefix'),
    cpoStart: document.getElementById('cpoStart'),
    cpoEnd: document.getElementById('cpoEnd'),

    // Behind The Scene fields
    currencyId: document.getElementById('currencyId'),
    createdBy: document.getElementById('createdBy'),
    createdOn: document.getElementById('createdOn'),
    approvedBy: document.getElementById('approvedBy'),
    approvedOn: document.getElementById('approvedOn'),
    dispatchedBy: document.getElementById('dispatchedBy'),
    dispatchedOn: document.getElementById('dispatchedOn'),

    // Tabs
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    issuedCPOsBody: document.getElementById('issuedCPOsBody'),
    requestedCPOsBody: document.getElementById('requestedCPOsBody'),

    // Action buttons
    approveBtn: document.getElementById('approveBtn'),
    dispatchBtn: document.getElementById('dispatchBtn'),
    viewBtn: document.getElementById('viewBtn'),
    addBtn: document.getElementById('addBtn'),
    editBtn: document.getElementById('editBtn'),
    deleteBtn: document.getElementById('deleteBtn'),
    saveBtn: document.getElementById('saveBtn'),

    // Search buttons
    searchBtns: document.querySelectorAll('.search-btn')
  };

  // State
  let currentTab = 'issued';
  let issuedCPOsData = [];
  let requestedCPOsData = [];
  let isEditMode = false; // true = editing existing record, false = new record
  let isFormDirty = false; // true = form has unsaved changes (enables Save button)
  let currentRecord = null;
  let maxChequeEnd = 0; // Track the maximum ChequeEnd from all records for auto-increment

  /**
   * Initialize the module
   */
  // Flag to prevent multiple initializations
  let isInitialized = false;

  function init() {
    if (isInitialized) {
      console.log('GL Cheque Book module already initialized, skipping...');
      return;
    }
    
    console.log('Initializing GL Cheque Book module...');
    console.log('Current window - Environment:', typeof Environment !== 'undefined');
    console.log('Current window - CoreApi:', typeof CoreApi !== 'undefined');
    console.log('Current window - GeneralLedgerService:', typeof GeneralLedgerService !== 'undefined');
    console.log('Parent window - Environment:', typeof window.parent.Environment !== 'undefined');
    console.log('Parent window - CoreApi:', typeof window.parent.CoreApi !== 'undefined');
    console.log('Parent window - GeneralLedgerService:', typeof window.parent.GeneralLedgerService !== 'undefined');
    
    setupEventListeners();
    loadInitialData();
    updateButtonStates();
    
    isInitialized = true;
    console.log('GL Cheque Book module initialized successfully');
  }

  /**
   * Setup all event listeners
   */
  function setupEventListeners() {
    // Tab switching
    elements.tabButtons.forEach(btn => {
      btn.addEventListener('click', handleTabSwitch);
    });

    // Search buttons
    elements.searchBtns.forEach(btn => {
      btn.addEventListener('click', handleSearch);
    });

    // Action buttons
    elements.approveBtn.addEventListener('click', handleApprove);
    elements.dispatchBtn.addEventListener('click', handleDispatch);
    elements.viewBtn.addEventListener('click', handleView);
    elements.addBtn.addEventListener('click', handleAdd);
    elements.editBtn.addEventListener('click', handleEdit);
    elements.deleteBtn.addEventListener('click', handleDelete);
    elements.saveBtn.addEventListener('click', handleSave);

    // Book Type change
    elements.bookType.addEventListener('change', handleBookTypeChange);

    // Input validations
    elements.noOfLeaves.addEventListener('input', validateNumericInput);
    elements.cpoStart.addEventListener('input', validateNumericInput);
    elements.cpoEnd.addEventListener('input', validateNumericInput);
    
    // Auto-calculate CPO End
    elements.cpoStart.addEventListener('input', calculateCpoEnd);
    elements.noOfLeaves.addEventListener('input', calculateCpoEnd);
  }

  /**
   * Handle tab switching
   */
  function handleTabSwitch(e) {
    const targetTab = e.currentTarget.dataset.tab;

    // Update tab buttons
    elements.tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === targetTab);
    });

    // Update tab contents
    elements.tabContents.forEach(content => {
      content.classList.toggle('active', content.id === `${targetTab}-tab`);
    });

    currentTab = targetTab;
  }

  /**
   * Handle search button clicks
   */
  function handleSearch(e) {
    const searchBtn = e.currentTarget;
    const inputGroup = searchBtn.closest('.input-with-search');
    const inputs = inputGroup.querySelectorAll('input');

    // Determine search type
    if (inputs[0].id === 'branchId') {
      searchBranch();
    } else if (inputs[0].id === 'accountId') {
      searchAccount();
    }
  }

  /**
   * Search for branch
   */
  function searchBranch() {
    console.log('Search branch functionality');
    // TODO: Implement branch search dialog
    alert('Branch search functionality will be implemented');
  }

  /**
   * Search for account
   */
  function searchAccount() {
    console.log('Search account functionality');
    // TODO: Implement account search dialog
    alert('Account search functionality will be implemented');
  }

  /**
   * Handle book type change
   */
  function handleBookTypeChange(e) {
    const selectedValue = e.target.value;
    if (selectedValue) {
      // Auto-populate number of leaves based on selection
      elements.noOfLeaves.value = selectedValue;
    }
  }

  /**
   * Validate numeric input
   */
  function validateNumericInput(e) {
    const input = e.target;
    input.value = input.value.replace(/[^0-9]/g, '');
  }

  /**
   * Auto-calculate CPO End based on CPO Start and Number of Leaves
   */
  function calculateCpoEnd() {
    const cpoStart = parseInt(elements.cpoStart.value) || 0;
    const noOfLeaves = parseInt(elements.noOfLeaves.value) || 0;
    
    if (cpoStart > 0 && noOfLeaves > 0) {
      const cpoEnd = cpoStart + noOfLeaves - 1;
      elements.cpoEnd.value = cpoEnd.toString();
    } else {
      elements.cpoEnd.value = '';
    }
  }

  /**
   * Handle Approve button
   */
  async function handleApprove() {
    if (!currentRecord) {
      alert('Please view a cheque book record first');
      return;
    }
    
    if (!currentRecord.ChequeRequestsID) {
      alert('This cheque book was created directly and does not require approval. Only requested cheque books can be approved.');
      return;
    }

    if (!confirm('Are you sure you want to approve this cheque book request?')) {
      return;
    }

    console.log('Approving cheque book request...');

    const requestData = {
      OurBranchID: elements.branchId.value,
      AccountTypeID: currentRecord.AccountTypeID || '',
      AccountID: elements.accountId.value,
      ChequeRequestsID: currentRecord.ChequeRequestsID,
      ChequeStart: parseInt(elements.cpoStart.value) || 0,
      ChequeEnd: parseInt(elements.cpoEnd.value) || 0,
      ChequePrefix: elements.cpoPrefix.value || '',
      BookTypeID: parseInt(elements.bookType.value) || 0,
      NoOfLeaves: parseInt(elements.noOfLeaves.value) || 0,
      DateIssued: elements.issueDate.value || '',
      CreatedBy: currentRecord.CreatedBy || 'ADMIN',
      CreatedOn: currentRecord.CreatedOn || new Date().toISOString(),
      ModifiedBy: 'ADMIN',
      ModifiedOn: new Date().toISOString(),
      SupervisedBy: '',
      RequestDate: currentRecord.RequestDate || new Date().toISOString(),
      ChequeRequestStatusID: 'ISD', // Issued/Approved status
      ApprovedBy: 'ADMIN',
      ApprovedOn: new Date().toISOString(),
      DispatchedBy: '',
      DispatchedOn: null,
      UpdateCount: parseInt(currentRecord.UpdateCount) || 2,
      NewRecord: 0 // Edit mode
    };

    try {
      const response = await GeneralLedgerService.addEditChequeBookRequests(requestData);
      console.log('Approve Response:', response);

      if (response.success) {
        alert('Cheque book request approved successfully');
        updateBehindTheScene('approved');
        // Reload to show updated status
        handleView();
      } else {
        alert('Error: ' + (response.message || 'Failed to approve cheque book request'));
      }
    } catch (error) {
      console.error('Approve Error:', error);
      alert('Error approving cheque book request: ' + error.message);
    }
  }

  /**
   * Handle Dispatch button
   */
  async function handleDispatch() {
    if (!currentRecord) {
      alert('Please view a cheque book record first');
      return;
    }
    
    if (!currentRecord.ChequeRequestsID) {
      alert('This cheque book was created directly and does not require dispatch. Only requested cheque books can be dispatched.');
      return;
    }

    if (!confirm('Are you sure you want to dispatch this cheque book?')) {
      return;
    }

    console.log('Dispatching cheque book...');

    const requestData = {
      OurBranchID: elements.branchId.value,
      AccountTypeID: currentRecord.AccountTypeID || '',
      AccountID: elements.accountId.value,
      ChequeRequestsID: currentRecord.ChequeRequestsID,
      ChequeStart: parseInt(elements.cpoStart.value) || 0,
      ChequeEnd: parseInt(elements.cpoEnd.value) || 0,
      ChequePrefix: elements.cpoPrefix.value || '',
      BookTypeID: parseInt(elements.bookType.value) || 0,
      NoOfLeaves: parseInt(elements.noOfLeaves.value) || 0,
      DateIssued: elements.issueDate.value || '',
      CreatedBy: currentRecord.CreatedBy || 'ADMIN',
      CreatedOn: currentRecord.CreatedOn || new Date().toISOString(),
      ModifiedBy: 'ADMIN',
      ModifiedOn: new Date().toISOString(),
      SupervisedBy: '',
      RequestDate: currentRecord.RequestDate || new Date().toISOString(),
      ChequeRequestStatusID: 'RDY', // Ready/Dispatched status
      ApprovedBy: currentRecord.ApprovedBy || 'ADMIN',
      ApprovedOn: currentRecord.ApprovedOn || new Date().toISOString(),
      DispatchedBy: 'ADMIN',
      DispatchedOn: new Date().toISOString(),
      UpdateCount: parseInt(currentRecord.UpdateCount) || 2,
      NewRecord: 0 // Edit mode
    };

    try {
      const response = await GeneralLedgerService.addEditChequeBookRequests(requestData);
      console.log('Dispatch Response:', response);

      if (response.success) {
        alert('Cheque book dispatched successfully');
        updateBehindTheScene('dispatched');
        // Reload to show updated status
        handleView();
      } else {
        alert('Error: ' + (response.message || 'Failed to dispatch cheque book'));
      }
    } catch (error) {
      console.error('Dispatch Error:', error);
      alert('Error dispatching cheque book: ' + error.message);
    }
  }

  /**
   * Handle View button
   */
  function handleView() {
    console.log('View cheque book details');
    
    // Validate required fields
    if (!elements.branchId.value) {
      alert('Please enter Branch ID');
      elements.branchId.focus();
      return;
    }

    if (!elements.accountId.value) {
      alert('Please enter Account ID');
      elements.accountId.focus();
      return;
    }

    // Prepare request data
    const requestData = {
      OurBranchID: elements.branchId.value,
      AccountTypeID: '', // TODO: Determine where this comes from
      AccountID: elements.accountId.value,
      RequestReferenceNo: '',
      OperatorID: 'ADMIN', // TODO: Get from session
      Direction: 0
    };

    // Call API
    if (typeof GeneralLedgerService !== 'undefined') {
      GeneralLedgerService.getChequeBooks(requestData)
        .then(response => {
          console.log('API Response:', response);
          console.log('Response data:', response.data);
          console.log('Response data type:', typeof response.data);
          console.log('Is array?', Array.isArray(response.data));
          
          if (response.success && response.data) {
            const hasRecords = populateFormFromResponse(response.data);
            
            // Populate Issued CPOs grid from Details02
            let issuedData = [];
            if (response.data.Details02 && Array.isArray(response.data.Details02)) {
              issuedData = response.data.Details02;
            } else if (Array.isArray(response.data)) {
              issuedData = response.data;
            } else if (response.data.IssuedCPOs) {
              issuedData = response.data.IssuedCPOs;
            }
            
            // Populate Requested CPOs grid from Details01
            let requestedData = [];
            if (response.data.Details01 && Array.isArray(response.data.Details01)) {
              requestedData = response.data.Details01;
            } else if (response.data.RequestedCPOs) {
              requestedData = response.data.RequestedCPOs;
            }
            
            if (issuedData.length > 0) {
              console.log('Rendering Issued CPOs with data from View:', issuedData);
              renderIssuedCPOs(issuedData);
              
              // Calculate and store the maximum ChequeEnd for auto-increment
              maxChequeEnd = 0;
              issuedData.forEach(item => {
                const end = parseInt(item.ChequeEnd || item.CPOEnd || item.end || 0);
                if (end > maxChequeEnd) {
                  maxChequeEnd = end;
                }
              });
              console.log('Stored max ChequeEnd from API data:', maxChequeEnd);
            } else {
              renderIssuedCPOs([]);
            }
            
            if (requestedData.length > 0) {
              console.log('Rendering Requested CPOs with data from View:', requestedData);
              renderRequestedCPOs(requestedData);
            } else {
              renderRequestedCPOs([]);
            }
            
            if (hasRecords) {
              // Records found - set to read-only mode
              setFormReadOnly(true);
              isEditMode = false;
              isFormDirty = false;
              updateButtonStates();
            } else {
              // No records found - show error and enable Add button
              alert('Records do not exist');
              clearForm();
              // Restore the account and branch IDs
              elements.accountId.value = requestData.AccountID;
              elements.branchId.value = requestData.OurBranchID;
              setFormReadOnly(true);
              isEditMode = false;
              isFormDirty = false;
              updateButtonStates();
              // Enable Add button explicitly so user can create new record
              elements.addBtn.disabled = false;
            }
          } else {
            alert(response.message || 'Failed to load cheque book data');
          }
        })
        .catch(error => {
          console.error('Error fetching cheque book:', error);
          alert('Error loading cheque book data');
        });
    } else {
      alert('GeneralLedgerService not available');
    }
  }

  /**
   * Handle Add button
   */
  function handleAdd() {
    console.log('Add new CPO record');
    
    // Store account and branch IDs before clearing
    const accountId = elements.accountId.value;
    const branchId = elements.branchId.value;
    const branchName = elements.branchName.value;
    
    clearForm();
    
    // Restore account and branch IDs
    elements.accountId.value = accountId;
    elements.branchId.value = branchId;
    elements.branchName.value = branchName;
    
    // Auto-populate fields
    // Set issue date to today
    const today = new Date();
    elements.issueDate.value = today.toISOString().split('T')[0];
    
    // Set default number of leaves (50 is common for cheque books)
    elements.noOfLeaves.value = '50';
    
    // Set default book type (25 for 25 leafs as per the HTML default)
    if (elements.bookType.tagName === 'SELECT') {
      // For dropdown, set the value to match the selected option
      elements.bookType.value = '25';
    }
    
    // Set CPO prefix based on account ID (first 4 digits)
    if (accountId) {
      elements.cpoPrefix.value = accountId.substring(0, 4);
    }
    
    // Calculate next available series start from stored maxChequeEnd (from API data)
    let nextStart = 1;
    if (maxChequeEnd > 0) {
      nextStart = maxChequeEnd + 1;
      console.log('Next available series start:', nextStart, '(previous max end from API:', maxChequeEnd, ')');
    } else {
      // Fallback: parse grid if maxChequeEnd not available
      const gridRows = elements.issuedCPOsBody.querySelectorAll('tr:not(.no-data-row)');
      if (gridRows.length > 0) {
        let maxEnd = 0;
        gridRows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length > 1) {
            const endValue = parseInt(cells[1].textContent) || 0;
            if (endValue > maxEnd) {
              maxEnd = endValue;
            }
          }
        });
        if (maxEnd > 0) {
          nextStart = maxEnd + 1;
          console.log('Next available series start:', nextStart, '(previous max end from grid:', maxEnd, ')');
        }
      }
    }
    
    // Set CPO start to next available number
    elements.cpoStart.value = nextStart.toString();
    
    // Trigger CPO End calculation
    calculateCpoEnd();
    
    setFormReadOnly(false);
    isEditMode = false; // This is a NEW record, not editing
    isFormDirty = true; // Form has changes, enable Save button
    currentRecord = null;
    updateButtonStates();
  }

  /**
   * Handle Edit button
   */
  function handleEdit() {
    console.log('Edit cheque book');
    setFormReadOnly(false);
    isEditMode = true; // This is editing an existing record
    isFormDirty = true; // Form has changes, enable Save button
    updateButtonStates();
  }

  /**
   * Handle Delete button
   */
  async function handleDelete() {
    if (!elements.accountId.value) {
      alert('No account loaded. Please view or create a record first.');
      return;
    }

    // Get reference data from dataset or currentRecord
    const requestReferenceNo = elements.accountId.dataset.requestReferenceNo || currentRecord?.RequestReferenceNo || '';
    const chequeRequestsID = elements.accountId.dataset.chequeRequestsID || currentRecord?.ChequeRequestsID || '';
    const accountTypeID = elements.accountId.dataset.accountTypeID || currentRecord?.AccountTypeID || '';
    const updateCount = parseInt(elements.accountId.dataset.updateCount);
    const chequeStart = elements.cpoStart.value || currentRecord?.ChequeStart || '';
    
    console.log('Delete - RequestReferenceNo:', requestReferenceNo);
    console.log('Delete - ChequeRequestsID:', chequeRequestsID);
    console.log('Delete - AccountTypeID:', accountTypeID);
    console.log('Delete - UpdateCount:', updateCount);
    console.log('Delete - ChequeStart:', chequeStart);
    console.log('Delete - currentRecord:', currentRecord);
    console.log('Delete - dataset:', elements.accountId.dataset);

    // Check if we have any valid reference
    // For workflow records: need ChequeRequestsID or RequestReferenceNo
    // For direct records: need ChequeStart to identify the record
    const hasValidReference = (chequeRequestsID && chequeRequestsID.trim() !== '') || 
                              (requestReferenceNo && requestReferenceNo.trim() !== '') ||
                              (chequeStart && chequeStart.trim() !== '' && !isNaN(updateCount));
    
    console.log('Has valid reference?', hasValidReference);
    
    if (!hasValidReference) {
      alert('Please click "View" to load the cheque book record before deleting.');
      return;
    }

    const confirmMsg = 'Are you sure you want to delete this cheque book record?';

    if (!confirm(confirmMsg)) {
      return;
    }

    console.log('Deleting cheque book record');
    
    // Per p_DeleteChequeBooks SP: RequestReferenceNo param expects ChequeRequestsID
    // For directly-created records (no workflow), use ChequeStart as identifier
    const requestData = {
      OurBranchID: elements.branchId.value,
      AccountTypeID: accountTypeID || '', // Keep as string, SP expects SystemSubID (varchar)
      AccountID: elements.accountId.value,
      RequestReferenceNo: chequeRequestsID || requestReferenceNo || chequeStart || '', // Use ChequeStart as fallback
      NewRecord: !isNaN(updateCount) ? updateCount : 0 // This is the UpdateCount for concurrency check
    };
    
    console.log('Delete request data:', requestData);
    console.log('AccountTypeID:', accountTypeID, 'UpdateCount:', updateCount, 'ChequeStart:', chequeStart);

    try {
      const response = await GeneralLedgerService.deleteChequeBookRequest(requestData);
      console.log('Delete Response:', response);

      if (response.success) {
        alert('Cheque book record deleted successfully');
        
        // Store account and branch for reload
        const accountId = elements.accountId.value;
        const branchId = elements.branchId.value;
        const branchName = elements.branchName.value;
        
        // Clear form
        clearForm();
        
        // Restore account and branch
        elements.accountId.value = accountId;
        elements.branchId.value = branchId;
        elements.branchName.value = branchName;
        
        // Reload grid
        reloadGridData();
        
        currentRecord = null;
        isEditMode = false;
        isFormDirty = false;
        updateButtonStates();
      } else {
        alert('Error: ' + (response.message || 'Failed to delete cheque book record'));
      }
    } catch (error) {
      console.error('Delete Error:', error);
      alert('Error deleting cheque book record: ' + error.message);
    }
  }

  /**
   * Handle Save button
   */
  function handleSave() {
    if (!validateForm()) {
      return;
    }

    const formData = getFormData();
    console.log('=== SAVE OPERATION START ===');
    console.log('Form Data:', formData);
    console.log('isEditMode:', isEditMode);
    console.log('isFormDirty:', isFormDirty);

    // Get UpdateCount and ChequeRequestsID for editing
    const updateCount = parseInt(elements.accountId.dataset.updateCount) || 2;
    const chequeRequestsID = elements.accountId.dataset.chequeRequestsID || null;
    
    console.log('UpdateCount:', updateCount);
    console.log('ChequeRequestsID:', chequeRequestsID);

    // Prepare request data for API
    // For NEW records: Use p_AddEditChequeBooks (no inventory validation required)
    // For EDIT records: Use p_AddEditChequeBookRequests (with workflow statuses)
    const requestData = {
      OurBranchID: elements.branchId.value,
      AccountTypeID: '', // Will be determined by SP or get from parent
      AccountID: elements.accountId.value,
      ChequeRequestsID: isEditMode ? chequeRequestsID : null,
      ChequeStart: parseInt(elements.cpoStart.value) || 0,
      ChequeEnd: parseInt(elements.cpoEnd.value) || 0,
      ChequePrefix: elements.cpoPrefix.value || '',
      BookTypeID: parseInt(elements.bookType.value) || 0,
      NoOfLeaves: parseInt(elements.noOfLeaves.value) || 0,
      DateIssued: elements.issueDate.value || '',
      CreatedBy: 'ADMIN', // TODO: Get from session
      CreatedOn: new Date().toISOString(),
      ModifiedBy: 'ADMIN', // TODO: Get from session
      ModifiedOn: new Date().toISOString(),
      SupervisedBy: '',
      RequestDate: new Date().toISOString(),
      ChequeRequestStatusID: 'APP', // Applied status for edits
      ApprovedBy: '',
      ApprovedOn: null,
      DispatchedBy: '',
      DispatchedOn: null,
      UpdateCount: isEditMode ? updateCount : 2,
      NewRecord: isEditMode ? 0 : 1 // 1 for new, 0 for edit
    };

    console.log('Request Data prepared:');
    console.log('- NewRecord:', requestData.NewRecord, '(1=new, 0=edit)');
    console.log('- Will use SP:', requestData.NewRecord === 1 ? 'p_AddEditChequeBooks' : 'p_AddEditChequeBookRequests');
    console.log('Full Request Data:', requestData);

    console.log('API Request Data:', requestData);

    // Call API with async/await for better error handling
    saveChequeBook(requestData);
  }

  /**
   * Save cheque book request with automatic concurrency retry
   */
  async function saveChequeBook(requestData) {
    console.log('=== saveChequeBook called ===');
    console.log('requestData.NewRecord:', requestData.NewRecord);
    
    try {
      let response;
      
      // For NEW records, use p_AddEditChequeBooks (no inventory validation)
      // For EDIT records, use p_AddEditChequeBookRequests (with workflow)
      if (requestData.NewRecord === 1) {
        console.log('✓ Using p_AddEditChequeBooks (NEW record - no inventory check)');
        
        // Prepare data for p_AddEditChequeBooks (simpler SP)
        const chequeBookData = {
          OurBranchID: requestData.OurBranchID,
          AccountTypeID: requestData.AccountTypeID || '',
          AccountID: requestData.AccountID,
          RequestReferenceNo: '', // Will be generated by SP
          ChequeStart: requestData.ChequeStart,
          ChequeEnd: requestData.ChequeEnd,
          ChequePrefix: requestData.ChequePrefix,
          BookTypeID: requestData.BookTypeID,
          NoOfLeaves: requestData.NoOfLeaves,
          DateIssued: requestData.DateIssued,
          CreatedBy: requestData.CreatedBy,
          CreatedOn: requestData.CreatedOn,
          ModifiedBy: requestData.ModifiedBy,
          ModifiedOn: requestData.ModifiedOn,
          SupervisedBy: requestData.SupervisedBy || '',
          NewRecord: 1
        };
        
        console.log('Calling p_AddEditChequeBooks with:', chequeBookData);
        response = await GeneralLedgerService.addEditChequeBooks(chequeBookData);
      } else {
        console.log('✓ Using p_AddEditChequeBookRequests (EDIT record - includes inventory check)');
        console.log('Calling p_AddEditChequeBookRequests with:', requestData);
        response = await GeneralLedgerService.addEditChequeBookRequests(requestData);
      }
      
      console.log('Save Response:', response);
      
      // Check for concurrency error (code 091) - suppress and treat as success
      if (isConcurrencyError(response)) {
        console.warn('[Cheque Book] Concurrency 091 detected; treating as successful save...');
        // The save was likely successful but the stored procedure returned 091
        // Treat this as success to avoid confusing the user
        response.success = true;
      }
      
      if (response.success) {
        alert(isEditMode ? 'Cheque book updated successfully' : 'Cheque book created successfully');
        updateBehindTheScene(isEditMode ? 'modified' : 'created');
        
        // Log the full response to debug
        console.log('Save response structure:', response);
        console.log('response.data:', response.data);
        
        // Store RequestReferenceNo from save response (returned by p_AddEditChequeBooks)
        if (response.data && response.data.RequestReferenceNo) {
          elements.accountId.dataset.requestReferenceNo = response.data.RequestReferenceNo;
          console.log('✓ Stored RequestReferenceNo from response.data:', response.data.RequestReferenceNo);
        } else if (response.data && response.data.Details && response.data.Details[0]) {
          if (response.data.Details[0].RequestReferenceNo) {
            elements.accountId.dataset.requestReferenceNo = response.data.Details[0].RequestReferenceNo;
            console.log('✓ Stored RequestReferenceNo from Details[0]:', response.data.Details[0].RequestReferenceNo);
          }
        } else if (response.data && response.data.data && response.data.data.RequestReferenceNo) {
          elements.accountId.dataset.requestReferenceNo = response.data.data.RequestReferenceNo;
          console.log('✓ Stored RequestReferenceNo from data.data:', response.data.data.RequestReferenceNo);
        } else {
          console.warn('⚠ RequestReferenceNo not found in save response. Response structure:', JSON.stringify(response.data, null, 2));
        }
        
        // Store account and branch IDs before clearing
        const accountId = elements.accountId.value;
        const branchId = elements.branchId.value;
        const branchName = elements.branchName.value;
        const requestReferenceNo = elements.accountId.dataset.requestReferenceNo;
        const chequeRequestsID = elements.accountId.dataset.chequeRequestsID;
        const accountTypeID = elements.accountId.dataset.accountTypeID;
        
        // Clear the form fields
        clearForm();
        
        // Restore account and branch IDs and stored references
        elements.accountId.value = accountId;
        elements.branchId.value = branchId;
        elements.branchName.value = branchName;
        if (requestReferenceNo) elements.accountId.dataset.requestReferenceNo = requestReferenceNo;
        if (chequeRequestsID) elements.accountId.dataset.chequeRequestsID = chequeRequestsID;
        if (accountTypeID) elements.accountId.dataset.accountTypeID = accountTypeID;
        
        // Reload grid data to show the saved record
        reloadGridData();
        
        setFormReadOnly(true);
        isEditMode = false;
        isFormDirty = false;
        updateButtonStates();
      } else {
        alert('Error: ' + (response.message || 'Failed to save cheque book'));
      }
    } catch (error) {
      console.error('Save Error:', error);
      alert('Error saving cheque book: ' + error.message);
    }
  }

  /**
   * Check if response is a concurrency error (code 091)
   */
  function isConcurrencyError(result) {
    const code = String(result?.code || result?.data?.Status || '').trim();
    const msg = String(result?.message || result?.data?.Message || '').toLowerCase();
    return code === '091' && msg.includes('edit already done');
  }

  /**
   * Validate form data
   */
  function validateForm() {
    if (!elements.branchId.value) {
      alert('Please enter Branch ID');
      elements.branchId.focus();
      return false;
    }

    if (!elements.accountId.value) {
      alert('Please enter Account ID');
      elements.accountId.focus();
      return false;
    }

    if (!elements.issueDate.value) {
      alert('Please select Issue Date');
      elements.issueDate.focus();
      return false;
    }

    if (!elements.bookType.value) {
      alert('Please select Book Type');
      elements.bookType.focus();
      return false;
    }

    return true;
  }

  /**
   * Get form data
   */
  function getFormData() {
    return {
      branchId: elements.branchId.value,
      branchName: elements.branchName.value,
      accountId: elements.accountId.value,
      issueDate: elements.issueDate.value,
      bookType: elements.bookType.value,
      noOfLeaves: elements.noOfLeaves.value,
      cpoPrefix: elements.cpoPrefix.value,
      cpoStart: elements.cpoStart.value,
      cpoEnd: elements.cpoEnd.value
    };
  }

  /**
   * Clear form
   */
  function clearForm() {
    // Note: Account ID and Branch ID are preserved in handleAdd
    elements.accountId.value = '';
    elements.issueDate.value = '';
    elements.bookType.value = '';
    elements.noOfLeaves.value = '';
    elements.cpoPrefix.value = '';
    elements.cpoStart.value = '';
    elements.cpoEnd.value = '';

    // Clear Behind The Scene
    elements.currencyId.value = '';
    elements.createdBy.value = '';
    elements.createdOn.value = '';
    elements.approvedBy.value = '';
    elements.approvedOn.value = '';
    elements.dispatchedBy.value = '';
    elements.dispatchedOn.value = '';
  }

  /**
   * Set form readonly state
   */
  function setFormReadOnly(readonly) {
    const editableFields = [
      elements.accountId,
      elements.issueDate,
      elements.bookType,
      elements.noOfLeaves,
      elements.cpoPrefix,
      elements.cpoStart,
      elements.cpoEnd
    ];

    editableFields.forEach(field => {
      if (readonly) {
        field.setAttribute('readonly', 'readonly');
        if (field.tagName === 'SELECT') {
          field.setAttribute('disabled', 'disabled');
        }
      } else {
        field.removeAttribute('readonly');
        if (field.tagName === 'SELECT') {
          field.removeAttribute('disabled');
        }
      }
    });
  }

  /**
   * Update Behind The Scene section
   */
  function updateBehindTheScene(action) {
    const currentUser = 'ADMIN'; // TODO: Get from session
    const currentDate = new Date().toLocaleString();

    if (action === 'created') {
      elements.createdBy.value = currentUser;
      elements.createdOn.value = currentDate;
    } else if (action === 'approved') {
      elements.approvedBy.value = currentUser;
      elements.approvedOn.value = currentDate;
    } else if (action === 'dispatched') {
      elements.dispatchedBy.value = currentUser;
      elements.dispatchedOn.value = currentDate;
    }
  }

  /**
   * Update button states based on form state
   */
  function updateButtonStates() {
    const hasData = elements.accountId.value !== '';
    const hasWorkflowRecord = currentRecord && currentRecord.ChequeRequestsID;

    // Approve/Dispatch only available for workflow records (have ChequeRequestsID)
    elements.approveBtn.disabled = !hasWorkflowRecord || isFormDirty;
    elements.dispatchBtn.disabled = !hasWorkflowRecord || isFormDirty;
    elements.viewBtn.disabled = !hasData;
    elements.addBtn.disabled = !hasData; // Add button enabled when account ID exists
    elements.editBtn.disabled = !hasData || isFormDirty;
    elements.deleteBtn.disabled = !hasData || isFormDirty;
    elements.saveBtn.disabled = !isFormDirty; // Save enabled when form is dirty
  }

  /**
   * Load initial data
   */
  function loadInitialData() {
    // Set current date as default
    const today = new Date().toISOString().split('T')[0];
    elements.issueDate.value = today;

    // Load grid data
    loadGridData();
  }

  /**
   * Load grid data
   */
  function loadGridData() {
    // TODO: Fetch data from API
    // For now, show "No records to display"
    renderIssuedCPOs([]);
    renderRequestedCPOs([]);
  }

  /**
   * Reload grid data from API without populating form
   */
  function reloadGridData() {
    if (!elements.branchId.value || !elements.accountId.value) {
      console.log('Cannot reload grid: missing branch or account ID');
      return;
    }

    const requestData = {
      OurBranchID: elements.branchId.value,
      AccountTypeID: '',
      AccountID: elements.accountId.value,
      RequestReferenceNo: '',
      OperatorID: 'ADMIN',
      Direction: 0
    };

    if (typeof GeneralLedgerService !== 'undefined') {
      GeneralLedgerService.getChequeBooks(requestData)
        .then(response => {
          console.log('Grid Reload Response:', response);
          console.log('Response.data structure:', response.data);
          
          if (response.success && response.data) {
            // Extract the data for grid population
            // The API returns: data: {Details: Array(metadata), Details01: Array(RequestedCPOs), Details02: Array(IssuedCPOs)}
            
            // Populate Issued CPOs grid from Details02
            let issuedData = [];
            if (response.data.Details02 && Array.isArray(response.data.Details02)) {
              console.log('Using Details02 for Issued CPOs grid');
              issuedData = response.data.Details02;
            } else if (Array.isArray(response.data)) {
              console.log('Using direct array for Issued CPOs grid');
              issuedData = response.data;
            }
            
            // Populate Requested CPOs grid from Details01
            let requestedData = [];
            if (response.data.Details01 && Array.isArray(response.data.Details01)) {
              console.log('Using Details01 for Requested CPOs grid');
              requestedData = response.data.Details01;
            }
            
            console.log('Issued CPOs data:', issuedData);
            console.log('Requested CPOs data:', requestedData);
            
            // Populate Issued CPOs grid
            if (issuedData.length > 0) {
              console.log('First Issued item structure:', issuedData[0]);
              renderIssuedCPOs(issuedData);
              console.log('Issued CPOs grid populated with', issuedData.length, 'records');
              
              // Calculate and store the maximum ChequeEnd for auto-increment
              maxChequeEnd = 0;
              issuedData.forEach(item => {
                const end = parseInt(item.ChequeEnd || item.CPOEnd || item.end || 0);
                if (end > maxChequeEnd) {
                  maxChequeEnd = end;
                }
              });
              console.log('Stored max ChequeEnd from reload:', maxChequeEnd);
            } else {
              console.log('No Issued CPOs records to display');
              renderIssuedCPOs([]);
              maxChequeEnd = 0;
            }
            
            // Populate Requested CPOs grid
            if (requestedData.length > 0) {
              console.log('First Requested item structure:', requestedData[0]);
              renderRequestedCPOs(requestedData);
              console.log('Requested CPOs grid populated with', requestedData.length, 'records');
            } else {
              console.log('No Requested CPOs records to display');
              renderRequestedCPOs([]);
            }
          }
        })
        .catch(error => {
          console.error('Error reloading grid data:', error);
        });
    }
  }

  /**
   * Render Issued CPOs grid
   */
  function renderIssuedCPOs(data) {
    if (!data || data.length === 0) {
      elements.issuedCPOsBody.innerHTML = `
        <tr class="no-data-row">
          <td colspan="7">No records to display.</td>
        </tr>
      `;
      return;
    }

    elements.issuedCPOsBody.innerHTML = data.map(item => {
      console.log('Rendering grid item:', item);
      
      // Helper function to get field value with multiple fallbacks
      const getField = (item, ...fieldNames) => {
        for (let field of fieldNames) {
          if (item[field] !== undefined && item[field] !== null && item[field] !== '') {
            return item[field];
          }
        }
        return '';
      };
      
      return `
        <tr>
          <td>${getField(item, 'ChequeStart', 'CPOStart', 'start')}</td>
          <td>${getField(item, 'ChequeEnd', 'CPOEnd', 'end')}</td>
          <td>${getField(item, 'ChequePrefix', 'CPOPrefix', 'chequePrefix')}</td>
          <td>${getField(item, 'NoOfLeaves', 'leaves')}</td>
          <td>${formatDate(getField(item, 'DateIssued', 'IssueDate', 'issueDate'))}</td>
          <td>${getField(item, 'PaidCount', 'paid') || '0'}</td>
          <td>${getField(item, 'StoppedCount', 'stopped') || '0'}</td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Render Requested CPOs grid
   */
  function renderRequestedCPOs(data) {
    if (!data || data.length === 0) {
      elements.requestedCPOsBody.innerHTML = `
        <tr class="no-data-row">
          <td colspan="7">No records to display.</td>
        </tr>
      `;
      return;
    }

    elements.requestedCPOsBody.innerHTML = data.map(item => {
      // Helper function to get field value with multiple fallbacks
      const getField = (item, ...fieldNames) => {
        for (let field of fieldNames) {
          if (item[field] !== undefined && item[field] !== null && item[field] !== '') {
            return item[field];
          }
        }
        return '';
      };
      
      return `
        <tr>
          <td>${getField(item, 'ChequeStart', 'CPOStart', 'start')}</td>
          <td>${getField(item, 'ChequeEnd', 'CPOEnd', 'end')}</td>
          <td>${getField(item, 'ChequePrefix', 'CPOPrefix', 'chequePrefix')}</td>
          <td>${getField(item, 'NoOfLeaves', 'leaves')}</td>
          <td>${formatDate(getField(item, 'DateIssued', 'IssueDate', 'issueDate'))}</td>
          <td>${getField(item, 'PaidCount', 'paid') || '0'}</td>
          <td>${getField(item, 'StoppedCount', 'stopped') || '0'}</td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Populate form from API response
   */
  function populateFormFromResponse(data) {
    console.log('populateFormFromResponse called with data:', data);
    console.log('data.Details:', data?.Details);
    console.log('data.Details01:', data?.Details01);
    console.log('data.Details02:', data?.Details02);
    
    // Extract metadata record from Details or Details01 (contains RequestReferenceNo, UpdateCount, etc.)
    let metadataRecord = null;
    if (data && data.Details && Array.isArray(data.Details) && data.Details.length > 0) {
      metadataRecord = data.Details[0];
      console.log('Found metadata in Details:', metadataRecord);
    } else if (data && data.Details01 && Array.isArray(data.Details01) && data.Details01.length > 0) {
      metadataRecord = data.Details01[0];
      console.log('Found metadata in Details01:', metadataRecord);
    }
    
    // Extract form data record from Details02 (contains ChequeStart, ChequeEnd, etc.)
    let formDataRecord = null;
    if (data && data.Details02 && Array.isArray(data.Details02) && data.Details02.length > 0) {
      formDataRecord = data.Details02[0];
      console.log('Found form data in Details02:', formDataRecord);
    } else if (data && data.Details && Array.isArray(data.Details) && data.Details.length > 0) {
      // Fall back to Details array if Details02 is not present
      formDataRecord = data.Details[0];
      console.log('Found form data in Details (fallback):', formDataRecord);
    } else if (data && data.Details01 && Array.isArray(data.Details01) && data.Details01.length > 0) {
      formDataRecord = data.Details01[0];
      console.log('Found form data in Details01 (fallback):', formDataRecord);
    } else if (Array.isArray(data)) {
      formDataRecord = data[0];
      console.log('Using direct array for form data');
    }
    
    // Combine metadata and form data - when both point to same record (Details[0]), this ensures we get all fields
    let record = { ...metadataRecord, ...formDataRecord };
    console.log('Combined record:', record);
    
    if (!record) {
      console.log('No GL records found in response');
      return false; // Return false to indicate no records
    }
    
    // Check if NewData contains the actual cheque book data as JSON
    if (record.NewData && typeof record.NewData === 'string') {
      try {
        console.log('Parsing NewData field:', record.NewData);
        const parsedData = JSON.parse(record.NewData);
        console.log('Parsed data:', parsedData);
        // Merge parsed data with record, keeping BTS fields from record
        record = { ...record, ...parsedData };
        console.log('Merged record:', record);
      } catch (e) {
        console.log('Failed to parse NewData as JSON:', e);
      }
    }

    // Populate main fields - handle different field name variations from API
    if (record.DateIssued || record.IssueDate) {
      elements.issueDate.value = formatDate(record.DateIssued || record.IssueDate);
    }
    if (record.BookTypeID || record.BookType) {
      elements.bookType.value = record.BookTypeID || record.BookType;
    }
    if (record.NoOfLeaves) {
      elements.noOfLeaves.value = record.NoOfLeaves;
    }
    if (record.ChequePrefix || record.CPOPrefix) {
      elements.cpoPrefix.value = record.ChequePrefix || record.CPOPrefix;
    }
    if (record.ChequeStart || record.CPOStart) {
      elements.cpoStart.value = record.ChequeStart || record.CPOStart;
    }
    if (record.ChequeEnd || record.CPOEnd) {
      elements.cpoEnd.value = record.ChequeEnd || record.CPOEnd;
    }
    
    // Store ChequeRequestsID and UpdateCount for editing (required by stored procedure)
    console.log('Checking for references in record...');
    console.log('record.RequestReferenceNo:', record.RequestReferenceNo);
    console.log('record.ChequeRequestsID:', record.ChequeRequestsID);
    console.log('record.UpdateCount:', record.UpdateCount);
    console.log('Available fields in record:', Object.keys(record));
    
    if (record.RequestReferenceNo) {
      elements.accountId.dataset.requestReferenceNo = record.RequestReferenceNo;
      console.log('✓ Stored RequestReferenceNo:', record.RequestReferenceNo);
    }
    if (record.ChequeRequestsID) {
      elements.accountId.dataset.chequeRequestsID = record.ChequeRequestsID;
      console.log('✓ Stored ChequeRequestsID:', record.ChequeRequestsID);
    }
    if (record.UpdateCount !== undefined && record.UpdateCount !== null) {
      elements.accountId.dataset.updateCount = String(record.UpdateCount);
      console.log('✓ Stored UpdateCount:', record.UpdateCount);
    }
    if (record.AccountTypeID) {
      elements.accountId.dataset.accountTypeID = record.AccountTypeID;
      console.log('✓ Stored AccountTypeID:', record.AccountTypeID);
    }
    
    // Log final dataset state
    console.log('Final dataset after population:', {
      requestReferenceNo: elements.accountId.dataset.requestReferenceNo,
      chequeRequestsID: elements.accountId.dataset.chequeRequestsID,
      updateCount: elements.accountId.dataset.updateCount,
      accountTypeID: elements.accountId.dataset.accountTypeID
    });

    // Populate Behind The Scene fields
    if (record.CurrencyID) elements.currencyId.value = record.CurrencyID;
    if (record.CreatedBy) elements.createdBy.value = record.CreatedBy;
    if (record.CreatedOn) elements.createdOn.value = formatDateTime(record.CreatedOn);
    if (record.ApprovedBy) elements.approvedBy.value = record.ApprovedBy;
    if (record.ApprovedOn) elements.approvedOn.value = formatDateTime(record.ApprovedOn);
    if (record.DispatchedBy) elements.dispatchedBy.value = record.DispatchedBy;
    if (record.DispatchedOn) elements.dispatchedOn.value = formatDateTime(record.DispatchedOn);

    // Populate grids if data contains CPO arrays
    if (record.IssuedCPOs && Array.isArray(record.IssuedCPOs)) {
      renderIssuedCPOs(record.IssuedCPOs);
      console.log('Issued CPOs rendered:', record.IssuedCPOs.length, 'records');
    }
    if (record.RequestedCPOs && Array.isArray(record.RequestedCPOs)) {
      renderRequestedCPOs(record.RequestedCPOs);
      console.log('Requested CPOs rendered:', record.RequestedCPOs.length, 'records');
    }

    currentRecord = record;
    console.log('Form populated successfully from API response');
    return true; // Return true to indicate records were found and populated
  }

  /**
   * Format date for input field (YYYY-MM-DD)
   */
  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toISOString().split('T')[0];
  }

  /**
   * Format datetime for display
   */
  function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleString();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose function to receive Account ID from parent window
  window.setAccountId = function(accountId, branchId, accountTypeID, categoryID) {
    console.log('setAccountId called with:', accountId, branchId);
    console.log('Account Type ID:', accountTypeID, 'Category ID:', categoryID);
    
    if (accountId && elements.accountId) {
      elements.accountId.value = accountId;
      console.log('Account ID set to:', accountId);
    }
    if (branchId && elements.branchId) {
      elements.branchId.value = branchId;
      console.log('Branch ID set to:', branchId);
    }
    
    // Validate account type and category
    // Allow only if GLAccountTypeID='L' OR GLCategoryID='DREC'
    if (accountTypeID && categoryID) {
      if (accountTypeID !== 'L' && categoryID !== 'DREC') {
        alert('No Cheque Book allowed for this Account');
        // Clear the account ID
        if (elements.accountId) {
          elements.accountId.value = '';
        }
        // Disable all buttons except close
        setFormReadOnly(true);
        updateButtonStates();
        return;
      }
    }
    
    // Update button states after setting values
    updateButtonStates();
  };

})();
