/**
 * Group Collection Reversal Module
 * Implements reversal functionality using the service layer pattern
 */
(async function() {
  'use strict';

  const { ServiceLoader } = window;

  // Load dependencies
  console.log('🔄 Loading Group Collection Reversal dependencies...');
  await ServiceLoader.loadCore();
  await ServiceLoader.loadTransactionService();
  await ServiceLoader.loadLookupService();

  // Get services
  const TransactionService = window.TransactionService;
  const LookupService = window.LookupService;

  console.log('✅ Services loaded successfully');

  // State management
  let currentReversalData = null;
  let currentMode = 'view';
  let operatorID = 'CSADM'; // TODO: Get from session/auth
  let selectedReceipt = null; // Track selected receipt

  // DOM Elements
  const formElements = {
    centerIdField: document.getElementById('centerIdField'),
    schemeIdField: document.getElementById('schemeIdField'),
    receiptTableBody: document.getElementById('receiptTableBody'),
    receiptDetailsTableBody: document.getElementById('receiptDetailsTableBody'),
    clientWiseDetailsTableBody: document.getElementById('clientWiseDetailsTableBody'),
    viewBtn: document.getElementById('viewBtn'),
    editBtn: document.getElementById('editBtn'),
    saveBtn: document.getElementById('saveBtn'),
    cancelBtn: document.getElementById('cancelBtn')
  };

  /**
   * Initialize the module
   */
  async function initializeModule() {
    try {
      console.log('🚀 Initializing Group Collection Reversal module...');
      
      // Bind event listeners
      bindEvents();
      
      // Don't auto-load data - wait for user to click search or view button
      console.log('ℹ️ Ready. Enter Group ID or Loan Scheme ID and click search.');
      
      console.log('✅ Module initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing module:', error);
      showError('Failed to initialize module: ' + error.message);
    }
  }

  /**
   * Bind event listeners
   */
  function bindEvents() {
    console.log('🔗 Binding event listeners...');
    
    // Search buttons
    const searchButtons = document.querySelectorAll('[data-search]');
    searchButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const searchType = btn.getAttribute('data-search');
        await handleSearch(searchType);
      });
    });
    
    // Action buttons
    if (formElements.viewBtn) {
      formElements.viewBtn.addEventListener('click', handleViewAction);
    }
    
    if (formElements.editBtn) {
      formElements.editBtn.addEventListener('click', handleEditAction);
    }
    
    if (formElements.saveBtn) {
      formElements.saveBtn.addEventListener('click', handleSaveAction);
    }
    
    if (formElements.cancelBtn) {
      formElements.cancelBtn.addEventListener('click', handleCancelAction);
    }
  }

  /**
   * Load reversal details (initial load or refresh)
   * Makes two separate API calls and combines results
   */
  async function loadReversalDetails() {
    try {
      console.log('🔍 Loading reversal details...');
      showLoading(true);
      
      // Read form values
      const groupId = formElements.centerIdField?.value || '';
      const schemeId = formElements.schemeIdField?.value || '';
      
      // Build request data with correct structure
      const requestData = {
        OurBranchID: '0603',
        GroupID: groupId,
        LoanSchemeID: schemeId,
        OperatorID: 'CSADM'
      };
      
      console.log('📤 Request Data:', requestData);
      
      // Call 1: Get Reversal Details
      logApiRequest('getGCReversalDetail', requestData);
      const reversalResult = await TransactionService.getGCReversalDetail(requestData);
      logApiResponse('getGCReversalDetail', reversalResult);
      
      // Call 2: Get Group Default Scheme
      logApiRequest('getGroupDefaultScheme', requestData);
      // const schemeResult = await TransactionService.getGroupDefaultScheme(requestData);
      // logApiResponse('getGroupDefaultScheme', schemeResult);
      
      // Combine results
      const combinedData = {
        reversalDetails: reversalResult.success ? reversalResult.data : null,
        // schemeDetails: schemeResult.success ? schemeResult.data : null
      };
      
      if (reversalResult.success /* || schemeResult.success */) {
        console.log('✅ Data loaded successfully');
        currentReversalData = combinedData;
        displayReversalData(combinedData);
      } else {
        console.log('⚠️ No data found');
        const errorMessage = reversalResult.message || 'No data found';
        showError(errorMessage);
      }
      
      showLoading(false);
    } catch (error) {
      console.error('❌ Error loading reversal details:', error);
      showError('Failed to load reversal details: ' + error.message);
      showLoading(false);
    }
  }

  /**
   * Handle search functionality
   * Makes two separate API calls and combines results
   */
  async function handleSearch(searchType) {
    try {
      console.log(`🔍 Searching for ${searchType}...`);
      
      const groupId = formElements.centerIdField?.value;
      const schemeId = formElements.schemeIdField?.value;
      
      if (!groupId && !schemeId) {
        showError('Please enter Group ID or Loan Scheme ID');
        return;
      }
      
      showLoading(true);
      
      // Build request data with correct structure
      const requestData = {
        OurBranchID: '0603',
        GroupID: groupId || '',
        LoanSchemeID: schemeId || '',
        OperatorID: operatorID
      };
      
      console.log('📤 Request Data:', requestData);
      
      // Call 1: Get Reversal Details
      logApiRequest('getGCReversalDetail', requestData);
      const reversalResult = await TransactionService.getGCReversalDetail(requestData);
      logApiResponse('getGCReversalDetail', reversalResult);
      
      // Call 2: Get Group Default Scheme
      logApiRequest('getGroupDefaultScheme', requestData);
      const schemeResult = await TransactionService.getGroupDefaultScheme(requestData);
      logApiResponse('getGroupDefaultScheme', schemeResult);
      
      // Combine results
      const combinedData = {
        reversalDetails: reversalResult.success ? reversalResult.data : null,
        schemeDetails: schemeResult.success ? schemeResult.data : null
      };
      
      if (reversalResult.success || schemeResult.success) {
        console.log('✅ Search successful');
        currentReversalData = combinedData;
        displayReversalData(combinedData);
        showSuccess('Data loaded successfully');
      } else {
        console.log('❌ Search failed');
        const errorMessage = reversalResult.message || schemeResult.message || 'No data found';
        showError(errorMessage);
        clearAllTables();
      }
      
      showLoading(false);
    } catch (error) {
      console.error('❌ Search error:', error);
      showError('An error occurred while searching: ' + error.message);
      showLoading(false);
    }
  }

  /**
   * Display reversal data in tables and patch form fields
   */
  function displayReversalData(data) {
    if (!data) {
      clearAllTables();
      return;
    }

    console.log('📊 Displaying reversal data:', data);

    // Extract data from combined results
    const reversalDetails = data.reversalDetails || data;
    const schemeDetails = data.schemeDetails || null;

    // Handle different response structures from reversalDetails
    const receiptData = reversalDetails.receipts || reversalDetails.Receipts || reversalDetails.Details || [];
    const receiptDetailsData = reversalDetails.receiptDetails || reversalDetails.ReceiptDetails || reversalDetails.Details01 || [];
    const clientWiseData = reversalDetails.clientWiseDetails || reversalDetails.ClientWiseDetails || reversalDetails.Details02 || [];

    // Patch form fields with flexible field mapping
    patchFormFields(reversalDetails, schemeDetails);

    // Display receipt data
    displayReceiptTable(receiptData);
    
    // Display receipt details
    displayReceiptDetailsTable(receiptDetailsData);
    
    // Display client-wise details
    displayClientWiseTable(clientWiseData);
  }

  /**
   * Patch form fields from API response with flexible field name mapping
   */
  function patchFormFields(reversalDetails, schemeDetails) {
    console.log('📝 Patching form fields...');

    // Field mapping configuration - supports multiple naming conventions
    const fieldMappings = [
      { element: formElements.centerIdField, keys: ['GroupID', 'groupID', 'groupId', 'group_id', 'CenterID', 'centerID'] },
      { element: formElements.schemeIdField, keys: ['LoanSchemeID', 'loanSchemeID', 'loanSchemeId', 'loan_scheme_id', 'SchemeID', 'schemeID'] }
    ];

    // Patch from reversalDetails
    if (reversalDetails) {
      fieldMappings.forEach(mapping => {
        if (mapping.element) {
          const value = findValueByKeys(reversalDetails, mapping.keys);
          if (value !== null && value !== undefined) {
            mapping.element.value = value;
            console.log(`✓ Patched ${mapping.element.id}:`, value);
          }
        }
      });
    }

    // Patch from schemeDetails if available
    if (schemeDetails) {
      console.log('📋 Scheme Details:', schemeDetails);
      fieldMappings.forEach(mapping => {
        if (mapping.element) {
          const value = findValueByKeys(schemeDetails, mapping.keys);
          if (value !== null && value !== undefined) {
            mapping.element.value = value;
            console.log(`✓ Patched ${mapping.element.id} from scheme:`, value);
          }
        }
      });
    }
  }

  /**
   * Find value by trying multiple key variations
   */
  function findValueByKeys(obj, keys) {
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        return obj[key];
      }
    }
    return null;
  }

  /**
   * Display receipt table with clickable rows
   */
  function displayReceiptTable(data) {
    if (!formElements.receiptTableBody) return;

    if (!data || data.length === 0) {
      formElements.receiptTableBody.innerHTML = `
        <tr style="text-align: center; color: #64748b; font-size: 0.8rem;">
          <td colspan="4" style="padding: 20px;">No records to display.</td>
        </tr>
      `;
      return;
    }

    let html = '';
    data.forEach((row, index) => {
      const tscSerial = row.TscSerial || row.tscSerial || row.tsc_serial || '';
      const createdBy = row.CreatedBy || row.createdBy || row.created_by || '';
      const supervision = row.Supervision || row.supervision || '';
      const receivedAmount = row.ReceivedAmount || row.receivedAmount || row.received_amount || 0;

      html += `
        <tr style="cursor: pointer;" class="receipt-row" data-index="${index}" onclick="window.GCReversal_selectReceipt(${index})">
          <td>${tscSerial}</td>
          <td>${createdBy}</td>
          <td>${supervision}</td>
          <td style="text-align: right;">${formatCurrency(receivedAmount)}</td>
        </tr>
      `;
    });

    formElements.receiptTableBody.innerHTML = html;
    console.log(`✅ Displayed ${data.length} receipt records`);
  }

  /**
   * Handle receipt row selection
   */
  window.GCReversal_selectReceipt = function(index) {
    const reversalDetails = currentReversalData?.reversalDetails || currentReversalData;
    const receiptData = reversalDetails?.receipts || reversalDetails?.Receipts || reversalDetails?.Details || [];
    
    if (receiptData[index]) {
      selectedReceipt = receiptData[index];
      console.log('📌 Selected receipt:', selectedReceipt);
      
      // Highlight selected row
      const rows = formElements.receiptTableBody.querySelectorAll('.receipt-row');
      rows.forEach((row, i) => {
        if (i === index) {
          row.style.backgroundColor = '#e0f2fe';
        } else {
          row.style.backgroundColor = '';
        }
      });
      
      showInfo(`Selected: ${selectedReceipt.TscSerial || selectedReceipt.tscSerial || 'Receipt'}`);
    }
  };

  /**
   * Original display function (removed flexible mapping)
   */
  function displayReceiptTable_old(data) {
    if (!formElements.receiptTableBody) return;

    if (!data || data.length === 0) {
      formElements.receiptTableBody.innerHTML = `
        <tr style="text-align: center; color: #64748b; font-size: 0.8rem;">
          <td colspan="4" style="padding: 20px;">No records to display.</td>
        </tr>
      `;
      return;
    }

    let html = '';
    data.forEach((row, index) => {
      html += `
        <tr>
          <td>${row.TscSerial || row.tsc_serial || row.TscSerialNo || ''}</td>
          <td>${row.CreatedBy || row.created_by || ''}</td>
          <td>${row.Supervision || row.supervision || row.SupervisedBy || ''}</td>
          <td style="text-align: right;">${formatCurrency(row.ReceivedAmount || row.received_amount || 0)}</td>
        </tr>
      `;
    });

    formElements.receiptTableBody.innerHTML = html;
  }

  /**
   * Display receipt details table
   */
  function displayReceiptDetailsTable(data) {
    if (!formElements.receiptDetailsTableBody) return;

    if (!data || data.length === 0) {
      formElements.receiptDetailsTableBody.innerHTML = `
        <tr style="text-align: center; color: #64748b; font-size: 0.8rem;">
          <td colspan="2" style="padding: 20px;">No records to display.</td>
        </tr>
      `;
      return;
    }

    let html = '';
    data.forEach((row, index) => {
      html += `
        <tr>
          <td>${row.Component || row.component || row.ComponentName || ''}</td>
          <td style="text-align: right;">${formatCurrency(row.ReceivedAmount || row.received_amount || 0)}</td>
        </tr>
      `;
    });

    formElements.receiptDetailsTableBody.innerHTML = html;
  }

  /**
   * Display client-wise table
   */
  function displayClientWiseTable(data) {
    if (!formElements.clientWiseDetailsTableBody) return;

    if (!data || data.length === 0) {
      formElements.clientWiseDetailsTableBody.innerHTML = `
        <tr style="text-align: center; color: #64748b; font-size: 0.8rem;">
          <td colspan="3" style="padding: 20px;">No records to display.</td>
        </tr>
      `;
      return;
    }

    let html = '';
    data.forEach((row, index) => {
      html += `
        <tr>
          <td>${row.ClientID || row.client_id || ''}</td>
          <td>${row.ClientName || row.client_name || ''}</td>
          <td style="text-align: right;">${formatCurrency(row.ReceivedAmount || row.received_amount || 0)}</td>
        </tr>
      `;
    });

    formElements.clientWiseDetailsTableBody.innerHTML = html;
  }

  /**
   * Clear all tables
   */
  function clearAllTables() {
    displayReceiptTable([]);
    displayReceiptDetailsTable([]);
    displayClientWiseTable([]);
  }

  /**
   * Clear form
   */
  function clearForm() {
    console.log('🧹 Clearing form...');
    
    if (formElements.centerIdField) formElements.centerIdField.value = '';
    if (formElements.schemeIdField) formElements.schemeIdField.value = '';
    
    clearAllTables();
    currentReversalData = null;
    selectedReceipt = null;
  }

  /**
   * Handle View action
   */
  async function handleViewAction() {
    console.log('👁️ View button clicked');
    await loadReversalDetails();
  }

  /**
   * Handle Edit action - enables editing for selected receipt
   */
  function handleEditAction() {
    console.log('✏️ Edit button clicked');
    
    if (!currentReversalData) {
      showError('Please load data first');
      return;
    }

    if (!selectedReceipt) {
      showError('Please select a receipt to edit');
      return;
    }
    
    currentMode = 'edit';
    console.log('📝 Editing receipt:', selectedReceipt);
    showSuccess('Edit mode enabled. You can now modify the receipt.');
  }

  /**
   * Handle Save action - saves/reverses the selected receipt
   */
  async function handleSaveAction() {
    console.log('💾 Save button clicked');
    
    if (!currentReversalData) {
      showError('No data to save');
      return;
    }

    if (!selectedReceipt) {
      showError('Please select a receipt to reverse');
      return;
    }

    if (!confirm('Are you sure you want to reverse this receipt?')) {
      return;
    }
    
    try {
      showLoading(true);
      
      // Collect all form data and selected receipt data
      const requestData = {
        OurBranchID: '0603',
        GroupID: formElements.centerIdField?.value || '',
        LoanSchemeID: formElements.schemeIdField?.value || '',
        TscSerial: selectedReceipt.TscSerial || selectedReceipt.tscSerial || '',
        ReceivedAmount: selectedReceipt.ReceivedAmount || selectedReceipt.receivedAmount || 0,
        OperatorID: operatorID
      };
      
      logApiRequest('saveGCReversal', requestData);
      
      const result = await TransactionService.saveGCReversal(requestData);
      
      logApiResponse('saveGCReversal', result);
      
      if (result.success) {
        showSuccess('Reversal completed successfully!');
        currentMode = 'view';
        selectedReceipt = null;
        await loadReversalDetails();
      } else {
        showError(result.message || 'Failed to complete reversal');
      }
      
      showLoading(false);
    } catch (error) {
      console.error('❌ Save error:', error);
      showError('An error occurred while saving: ' + error.message);
      showLoading(false);
    }
  }

  /**
   * Handle Cancel action
   */
  function handleCancelAction() {
    console.log('❌ Cancel button clicked');
    
    if (currentMode !== 'view' && currentReversalData) {
      if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        return;
      }
    }
    
    clearForm();
    currentMode = 'view';
  }

  /**
   * Format currency value
   */
  function formatCurrency(value) {
    const numValue = parseFloat(value) || 0;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue);
  }

  /**
   * Show loading indicator
   */
  function showLoading(show) {
    console.log(show ? '⏳ Loading...' : '✅ Loading complete');
    
    const buttons = [
      formElements.viewBtn,
      formElements.editBtn,
      formElements.saveBtn,
      formElements.cancelBtn
    ];
    
    buttons.forEach(btn => {
      if (btn) btn.disabled = show;
    });
    
    document.body.style.cursor = show ? 'wait' : 'default';
  }

  /**
   * Show snackbar notification
   */
  function showSnackbar(message, type = 'info') {
    const snackbar = document.getElementById('snackbar');
    if (!snackbar) {
      console.warn('Snackbar element not found, falling back to alert');
      alert(message);
      return;
    }
    
    snackbar.textContent = message;
    snackbar.className = 'show ' + type;
    
    setTimeout(() => {
      snackbar.className = snackbar.className.replace('show', '');
    }, 3000);
  }

  /**
   * Show error message
   */
  function showError(message) {
    console.error('❌ Error:', message);
    showSnackbar(message, 'error');
  }

  /**
   * Show success message
   */
  function showSuccess(message) {
    console.log('✅ Success:', message);
    showSnackbar(message, 'success');
  }

  /**
   * Show info message
   */
  function showInfo(message) {
    console.info('ℹ️ Info:', message);
    showSnackbar(message, 'info');
  }

  /**
   * Log API request for debugging
   */
  function logApiRequest(endpoint, requestData) {
    console.groupCollapsed(`🌐 API Request: ${endpoint}`);
    console.log('Request Data:', requestData);
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
  }

  /**
   * Log API response for debugging
   */
  function logApiResponse(endpoint, result) {
    console.groupCollapsed(`📡 API Response: ${endpoint}`);
    console.log('Success:', result.success);
    console.log('Code:', result.code);
    console.log('Message:', result.message);
    console.log('Data:', result.data);
    console.groupEnd();
  }

  // Initialize module
  initializeModule();
})();
