/**
 * Group Collection Allocation Module
 * Implements transaction allocation functionality using the service layer pattern
 */
(async function() {
  'use strict';

  const { ServiceLoader } = window;

  // Load dependencies
  await ServiceLoader.loadCore();
  await ServiceLoader.loadTransactionService();
  await ServiceLoader.loadLookupService();
  await ServiceLoader.loadSearchService();

  // Get services
  const TransactionService = window.TransactionService;
  const LookupService = window.LookupService;
  const SearchService = window.SearchService;

  // State management
  let currentAllocationData = null;
  let currentMode = 'view'; // view, edit, create
  let operatorID = 'web_portal'; // TODO: Get from session/auth

  // DOM Elements
  const formElements = {
    groupIdField: document.getElementById('groupIdField'),
    schemeIdField: document.getElementById('schemeIdField'),
    valueDateField: document.getElementById('valueDateField'),
    allocationTypeSelect: document.getElementById('allocationTypeSelect'),
    savingsTab: document.getElementById('savingsTab'),
    loansTab: document.getElementById('loansTab'),
    othersTab: document.getElementById('othersTab'),
    savingsTabContent: document.getElementById('savingsTabContent'),
    loansTabContent: document.getElementById('loansTabContent'),
    othersTabContent: document.getElementById('othersTabContent'),
    savingsTableBody: document.getElementById('savingsTableBody'),
    loansTableBody: document.getElementById('loansTableBody'),
    othersTableBody: document.getElementById('othersTableBody'),
    totalAllocatedField: document.getElementById('totalAllocatedField'),
    totalReceivedField: document.getElementById('totalReceivedField'),
    unallocatedField: document.getElementById('unallocatedField'),
    createdByField: document.getElementById('createdByField'),
    modifiedByField: document.getElementById('modifiedByField'),
    supervisedByField: document.getElementById('supervisedByField'),
    createdOnField: document.getElementById('createdOnField'),
    modifiedOnField: document.getElementById('modifiedOnField'),
    supervisedOnField: document.getElementById('supervisedOnField'),
    viewBtn: document.getElementById('viewBtn'),
    editBtn: document.getElementById('editBtn'),
    deleteBtn: document.getElementById('deleteBtn'),
    saveBtn: document.getElementById('saveBtn'),
    cancelBtn: document.getElementById('cancelBtn')
  };

  /**
   * Initialize the module
   */
  async function initializeModule() {
    try {
      console.log('Initializing Group Collection Allocation module...');

      // Populate dropdowns
      await populateDropdowns();

      // Bind event listeners
      bindEvents();

      // Set initial state
      setFormMode('view');

      console.log('✅ Group Collection Allocation module initialized successfully');
    } catch (error) {
      console.error('Error initializing module:', error);
      showError('Failed to initialize module: ' + error.message);
    }
  }

  /**
   * Populate all dropdowns
   */
  async function populateDropdowns() {
    try {
      // Allocation Type dropdown
      const allocationTypes = await LookupService.getSystemCodeOptions('AllocationTypeID');
      populateDropdown(formElements.allocationTypeSelect, allocationTypes);
    } catch (error) {
      console.error('Error populating dropdowns:', error);
      throw error;
    }
  }

  /**
   * Populate a select element with options
   */
  function populateDropdown(selectElement, options) {
    if (!selectElement) return;

    const currentValue = selectElement.value;
    selectElement.innerHTML = '<option value="">--Select--</option>';
    
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      selectElement.appendChild(option);
    });

    if (currentValue) {
      selectElement.value = currentValue;
    }
  }

  /**
   * Bind event listeners
   */
  function bindEvents() {
    // Tab clicks
    if (formElements.savingsTab) {
      formElements.savingsTab.addEventListener('click', () => switchTab('savings'));
    }
    if (formElements.loansTab) {
      formElements.loansTab.addEventListener('click', () => switchTab('loans'));
    }
    if (formElements.othersTab) {
      formElements.othersTab.addEventListener('click', () => switchTab('others'));
    }

    // Right side panel buttons
    if (formElements.viewBtn) {
      formElements.viewBtn.addEventListener('click', handleViewAction);
    }
    if (formElements.editBtn) {
      formElements.editBtn.addEventListener('click', handleEditAction);
    }
    if (formElements.deleteBtn) {
      formElements.deleteBtn.addEventListener('click', handleDeleteAction);
    }
    if (formElements.saveBtn) {
      formElements.saveBtn.addEventListener('click', handleSaveAction);
    }
    if (formElements.cancelBtn) {
      formElements.cancelBtn.addEventListener('click', handleCancelAction);
    }

    // Search buttons
    setupSearchHandlers();
  }

  /**
   * Setup search button handlers
   */
  function setupSearchHandlers() {
    const searchButtons = document.querySelectorAll('[data-search]');
    searchButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const searchType = btn.getAttribute('data-search');
        await handleSearch(searchType);
      });
    });
  }

  /**
   * Switch active tab
   */
  function switchTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.gca-tab').forEach(tab => {
      tab.classList.remove('active');
    });

    // Hide all tab contents
    document.querySelectorAll('.gca-tab-content').forEach(content => {
      content.style.display = 'none';
    });

    // Activate clicked tab
    if (tabName === 'savings') {
      formElements.savingsTab.classList.add('active');
      formElements.savingsTabContent.style.display = 'flex';
    } else if (tabName === 'loans') {
      formElements.loansTab.classList.add('active');
      formElements.loansTabContent.style.display = 'flex';
    } else if (tabName === 'others') {
      formElements.othersTab.classList.add('active');
      formElements.othersTabContent.style.display = 'flex';
    }

    console.log('Switched to tab:', tabName);
  }

  /**
   * Handle search functionality
   */
  async function handleSearch(searchType) {
    console.log('Searching for:', searchType);

    if (searchType === 'groupId') {
      await searchGroupCollection();
    }
  }

  /**
   * Search for group collection allocation
   */
  async function searchGroupCollection() {
    try {
      const groupId = formElements.groupIdField?.value;
      const allocationTypeId = formElements.allocationTypeSelect?.value;

      if (!groupId) {
        showError('Please enter a Group ID');
        return;
      }

      if (!allocationTypeId) {
        showError('Please select an Allocation Type');
        return;
      }

      showLoading(true);

      // Prepare request data
      const requestData = {
        OurBranchID: '002', // TODO: Get from session
        TrxSerialID: parseInt(groupId) || 0,
        AllocationTypeID: allocationTypeId,
        OperatorID: operatorID
      };

      console.log('🔍 Searching with:', requestData);
      logApiRequest('getGCLoanCollection', requestData);

      const result = await TransactionService.getGCLoanCollection(requestData);
      
      logApiResponse('getGCLoanCollection', result);

      if (result.success) {
        currentAllocationData = result.data;
        
        // Patch form fields from response
        patchFormFields(result.data);
        
        displayAllocationData(result.data);
        showSuccess('Data loaded successfully');
      } else {
        showError(result.message || 'Failed to load allocation data');
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
   * Patch form fields from response data
   */
  function patchFormFields(data) {
    if (!data) return;

    console.log('📝 Patching form fields from data:', data);

    // Patch main form fields
    if (formElements.groupIdField && (data.GroupID || data.groupId)) {
      formElements.groupIdField.value = data.GroupID || data.groupId || '';
    }
    
    if (formElements.schemeIdField && (data.SchemeID || data.schemeId)) {
      formElements.schemeIdField.value = data.SchemeID || data.schemeId || '';
    }
    
    if (formElements.valueDateField && (data.ValueDate || data.valueDate)) {
      formElements.valueDateField.value = data.ValueDate || data.valueDate || '';
    }
    
    if (formElements.allocationTypeSelect && (data.AllocationTypeID || data.allocationTypeId)) {
      formElements.allocationTypeSelect.value = data.AllocationTypeID || data.allocationTypeId || '';
    }
  }

  /**
   * Display allocation data in tables
   */
  function displayAllocationData(data) {
    if (!data) {
      clearAllTables();
      return;
    }

    console.log('📊 Displaying allocation data:', data);

    // Handle different possible response structures
    const savingsData = data.savings || data.Savings || data.Details || [];
    const loansData = data.loans || data.Loans || data.Details01 || [];
    const othersData = data.others || data.Others || data.Details02 || [];

    // If data is a single array, use it for the active tab
    if (Array.isArray(data)) {
      displayTableData(formElements.savingsTableBody, data);
      displayTableData(formElements.loansTableBody, []);
      displayTableData(formElements.othersTableBody, []);
    } else {
      displayTableData(formElements.savingsTableBody, savingsData);
      displayTableData(formElements.loansTableBody, loansData);
      displayTableData(formElements.othersTableBody, othersData);
    }

    // Update summary fields
    updateSummaryFields(data);
  }

  /**
   * Display data in a table
   */
  function displayTableData(tableBody, dataArray) {
    if (!tableBody) return;

    if (!dataArray || dataArray.length === 0) {
      tableBody.innerHTML = `
        <tr style="text-align: center; color: #64748b; font-size: 0.8rem;">
          <td colspan="6" style="padding: 20px;">No records to display.</td>
        </tr>
      `;
      return;
    }

    console.log('📝 Patching table data:', dataArray.length, 'rows');

    let html = '';
    dataArray.forEach((row, index) => {
      // Try different possible field names from backend
      const groupId = row.GroupID || row.groupId || row.group_id || '';
      const clientId = row.ClientID || row.clientId || row.client_id || '';
      const accountId = row.AccountID || row.accountId || row.account_id || row.AccountNo || '';
      const clientName = row.ClientName || row.clientName || row.client_name || row.Name || '';
      const expectedAmount = row.ExpectedAmount || row.expectedAmount || row.expected_amount || row.Amount || 0;
      const receivedAmount = row.ReceivedAmount || row.receivedAmount || row.received_amount || row.Received || '';

      html += `
        <tr data-row-index="${index}">
          <td>${groupId}</td>
          <td>${clientId}</td>
          <td>${accountId}</td>
          <td>${clientName}</td>
          <td style="text-align: right;">${formatCurrency(expectedAmount)}</td>
          <td>
            <input type="number" 
              class="form-control received-amount-input" 
              value="${receivedAmount}" 
              data-index="${index}"
              data-expected="${expectedAmount}"
              ${currentMode === 'view' ? 'readonly' : ''}
              style="${currentMode === 'view' ? 'background-color: #f9fafb;' : ''}"
              step="0.01"
              min="0"
            />
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;

    // Add event listeners to received amount inputs for calculation
    if (currentMode !== 'view') {
      const inputs = tableBody.querySelectorAll('.received-amount-input');
      inputs.forEach(input => {
        input.addEventListener('input', calculateTotals);
      });
    }
  }

  /**
   * Update summary fields
   */
  function updateSummaryFields(data) {
    // Calculate or use provided totals
    let totalAllocated = 0;
    let totalReceived = 0;

    // Try to get from data first
    totalAllocated = data.totalAllocated || data.TotalAllocated || data.total_allocated || 0;
    totalReceived = data.totalReceived || data.TotalReceived || data.total_received || 0;

    // If not in data, calculate from tables
    if (totalAllocated === 0) {
      totalAllocated = calculateTotalExpected();
    }
    if (totalReceived === 0) {
      totalReceived = calculateTotalReceived();
    }

    const unallocated = totalAllocated - totalReceived;

    if (formElements.totalAllocatedField) {
      formElements.totalAllocatedField.value = formatCurrency(totalAllocated);
    }
    if (formElements.totalReceivedField) {
      formElements.totalReceivedField.value = formatCurrency(totalReceived);
    }
    if (formElements.unallocatedField) {
      formElements.unallocatedField.value = formatCurrency(unallocated);
    }

    // Patch audit fields
    if (formElements.createdByField) {
      formElements.createdByField.value = data.createdBy || data.CreatedBy || data.created_by || '';
    }
    if (formElements.modifiedByField) {
      formElements.modifiedByField.value = data.modifiedBy || data.ModifiedBy || data.modified_by || '';
    }
    if (formElements.supervisedByField) {
      formElements.supervisedByField.value = data.supervisedBy || data.SupervisedBy || data.supervised_by || '';
    }
    if (formElements.createdOnField) {
      formElements.createdOnField.value = formatDateTime(data.createdOn || data.CreatedOn || data.created_on || '');
    }
    if (formElements.modifiedOnField) {
      formElements.modifiedOnField.value = formatDateTime(data.modifiedOn || data.ModifiedOn || data.modified_on || '');
    }
    if (formElements.supervisedOnField) {
      formElements.supervisedOnField.value = formatDateTime(data.supervisedOn || data.SupervisedOn || data.supervised_on || '');
    }

    console.log('💰 Summary updated - Allocated:', totalAllocated, 'Received:', totalReceived, 'Unallocated:', unallocated);
  }

  /**
   * Calculate total expected amount from all tables
   */
  function calculateTotalExpected() {
    let total = 0;
    const tables = [formElements.savingsTableBody, formElements.loansTableBody, formElements.othersTableBody];
    
    tables.forEach(table => {
      if (!table) return;
      const inputs = table.querySelectorAll('.received-amount-input');
      inputs.forEach(input => {
        const expected = parseFloat(input.getAttribute('data-expected')) || 0;
        total += expected;
      });
    });

    return total;
  }

  /**
   * Calculate total received amount from all tables
   */
  function calculateTotalReceived() {
    let total = 0;
    const tables = [formElements.savingsTableBody, formElements.loansTableBody, formElements.othersTableBody];
    
    tables.forEach(table => {
      if (!table) return;
      const inputs = table.querySelectorAll('.received-amount-input');
      inputs.forEach(input => {
        const received = parseFloat(input.value) || 0;
        total += received;
      });
    });

    return total;
  }

  /**
   * Calculate and update totals when amounts change
   */
  function calculateTotals() {
    const totalAllocated = calculateTotalExpected();
    const totalReceived = calculateTotalReceived();
    const unallocated = totalAllocated - totalReceived;

    if (formElements.totalAllocatedField) {
      formElements.totalAllocatedField.value = formatCurrency(totalAllocated);
    }
    if (formElements.totalReceivedField) {
      formElements.totalReceivedField.value = formatCurrency(totalReceived);
    }
    if (formElements.unallocatedField) {
      formElements.unallocatedField.value = formatCurrency(unallocated);
    }
  }

  /**
   * Clear all tables
   */
  function clearAllTables() {
    displayTableData(formElements.savingsTableBody, []);
    displayTableData(formElements.loansTableBody, []);
    displayTableData(formElements.othersTableBody, []);
  }

  /**
   * Handle View action
   */
  async function handleViewAction() {
    console.log('👁️ View button clicked');
    
    // If we already have data, just display it
    if (currentAllocationData) {
      setFormMode('view');
      displayAllocationData(currentAllocationData);
      return;
    }
    
    // Otherwise, search for data
    await searchGroupCollection();
  }

  /**
   * Handle Edit action
   */
  function handleEditAction() {
    console.log('✏️ Edit button clicked');
    
    if (!currentAllocationData) {
      showError('Please load data first using the View button');
      return;
    }

    setFormMode('edit');
    displayAllocationData(currentAllocationData);
    showInfo('Edit mode enabled. Modify the Received Amount values and click Save.');
  }

  /**
   * Handle Delete action
   */
  async function handleDeleteAction() {
    console.log('🗑️ Delete button clicked');
    
    if (!currentAllocationData) {
      showError('No data to delete. Please load data first.');
      return;
    }

    if (!confirm('Are you sure you want to delete this allocation?\n\nThis action cannot be undone.')) {
      console.log('Delete cancelled by user');
      return;
    }

    try {
      showLoading(true);

      const requestData = {
        AllocationID: currentAllocationData.allocationId || currentAllocationData.AllocationID,
        GroupID: formElements.groupIdField?.value,
        OperatorID: operatorID
      };

      logApiRequest('deleteGCAllocation', requestData);

      const result = await TransactionService.deleteGCAllocation(requestData);
      
      logApiResponse('deleteGCAllocation', result);

      if (result.success) {
        showSuccess('Allocation deleted successfully');
        handleCancelAction();
      } else {
        showError(result.message || 'Failed to delete allocation');
      }

      showLoading(false);
    } catch (error) {
      console.error('❌ Delete error:', error);
      showError('An error occurred while deleting: ' + error.message);
      showLoading(false);
    }
  }

  /**
   * Handle Save action
   */
  async function handleSaveAction() {
    console.log('💾 Save button clicked');
    
    if (!currentAllocationData && currentMode === 'view') {
      showError('No data to save. Please load or create data first.');
      return;
    }

    try {
      showLoading(true);

      // Collect form data
      const formData = collectFormData();

      console.log('💾 Saving data:', formData);
      
      logApiRequest(currentMode === 'edit' ? 'updateGCAllocation' : 'saveGCAllocation', formData);

      const result = currentMode === 'edit' 
        ? await TransactionService.updateGCAllocation(formData)
        : await TransactionService.saveGCAllocation(formData);

      logApiResponse(currentMode === 'edit' ? 'updateGCAllocation' : 'saveGCAllocation', result);

      if (result.success) {
        showSuccess('Allocation saved successfully');
        setFormMode('view');
        // Refresh data
        await searchGroupCollection();
      } else {
        showError(result.message || 'Failed to save allocation');
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
    
    if (currentMode !== 'view' && currentAllocationData) {
      if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        return;
      }
    }
    
    clearForm();
    setFormMode('view');
    currentAllocationData = null;
    console.log('✅ Form cleared and reset to view mode');
  }

  /**
   * Collect form data
   */
  function collectFormData() {
    // Collect all received amounts from tables
    const savingsAllocations = collectTableAllocations(formElements.savingsTableBody, 'Savings');
    const loansAllocations = collectTableAllocations(formElements.loansTableBody, 'Loans');
    const othersAllocations = collectTableAllocations(formElements.othersTableBody, 'Others');

    const formData = {
      GroupID: formElements.groupIdField?.value || '',
      SchemeID: formElements.schemeIdField?.value || '',
      ValueDate: formElements.valueDateField?.value || '',
      AllocationTypeID: formElements.allocationTypeSelect?.value || '',
      OperatorID: operatorID,
      OurBranchID: '002', // TODO: Get from session
      Allocations: {
        Savings: savingsAllocations,
        Loans: loansAllocations,
        Others: othersAllocations
      },
      TotalAllocated: calculateTotalExpected(),
      TotalReceived: calculateTotalReceived()
    };

    console.log('📦 Collected form data:', formData);
    return formData;
  }

  /**
   * Collect allocations from a specific table
   */
  function collectTableAllocations(tableBody, type) {
    if (!tableBody) return [];

    const allocations = [];
    const rows = tableBody.querySelectorAll('tr[data-row-index]');

    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      const input = row.querySelector('.received-amount-input');

      if (cells.length >= 6 && input) {
        allocations.push({
          Type: type,
          GroupID: cells[0].textContent.trim(),
          ClientID: cells[1].textContent.trim(),
          AccountID: cells[2].textContent.trim(),
          ClientName: cells[3].textContent.trim(),
          ExpectedAmount: parseFloat(input.getAttribute('data-expected')) || 0,
          ReceivedAmount: parseFloat(input.value) || 0
        });
      }
    });

    return allocations;
  }

  /**
   * Clear all form fields
   */
  function clearForm() {
    if (formElements.groupIdField) formElements.groupIdField.value = '';
    if (formElements.schemeIdField) formElements.schemeIdField.value = '';
    if (formElements.valueDateField) formElements.valueDateField.value = '';
    if (formElements.allocationTypeSelect) formElements.allocationTypeSelect.value = '';
    
    clearAllTables();
    
    if (formElements.totalAllocatedField) formElements.totalAllocatedField.value = '';
    if (formElements.totalReceivedField) formElements.totalReceivedField.value = '';
    if (formElements.unallocatedField) formElements.unallocatedField.value = '';
    if (formElements.createdByField) formElements.createdByField.value = '';
    if (formElements.modifiedByField) formElements.modifiedByField.value = '';
    if (formElements.supervisedByField) formElements.supervisedByField.value = '';
    if (formElements.createdOnField) formElements.createdOnField.value = '';
    if (formElements.modifiedOnField) formElements.modifiedOnField.value = '';
    if (formElements.supervisedOnField) formElements.supervisedOnField.value = '';
  }

  /**
   * Set form mode (view/edit/create)
   */
  function setFormMode(mode) {
    currentMode = mode;
    
    // Search criteria fields should ALWAYS be editable (not affected by mode)
    // Users need to be able to enter Group ID, Allocation Type, etc. to search
    
    // Enable/disable buttons based on mode
    if (formElements.saveBtn) {
      formElements.saveBtn.disabled = mode === 'view';
    }
    if (formElements.editBtn) {
      formElements.editBtn.disabled = mode !== 'view';
    }
    if (formElements.deleteBtn) {
      formElements.deleteBtn.disabled = mode !== 'view';
    }
    
    console.log('🔄 Form mode set to:', mode);
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
   * Format date/time value
   */
  function formatDateTime(value) {
    if (!value) return '';
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return value;
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return value;
    }
  }

  /**
   * Show loading indicator
   */
  function showLoading(show) {
    console.log(show ? '⏳ Loading...' : '✅ Loading complete');
    
    // Disable all buttons during loading
    const buttons = [
      formElements.viewBtn,
      formElements.editBtn,
      formElements.deleteBtn,
      formElements.saveBtn,
      formElements.cancelBtn
    ];
    
    buttons.forEach(btn => {
      if (btn) btn.disabled = show;
    });

    // Change cursor
    document.body.style.cursor = show ? 'wait' : 'default';
  }

  /**
   * Show error message
   */
  function showError(message) {
    console.error('❌ Error:', message);
    alert('Error: ' + message);
    // TODO: Replace with toast notification system
  }

  /**
   * Show success message
   */
  function showSuccess(message) {
    console.log('✅ Success:', message);
    alert(message);
    // TODO: Replace with toast notification system
  }

  /**
   * Show info message
   */
  function showInfo(message) {
    console.info('ℹ️ Info:', message);
    alert(message);
    // TODO: Replace with toast notification system
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
  await initializeModule();

})();

