console.log('🚀 GL Budget module script loaded!');

(function () {
  'use strict';

  console.log('🚀 GL Budget IIFE executing...');

  // ============================
  // Utility Functions
  // ============================
  const id = (elementId) => document.getElementById(elementId);
  const log = (...args) => console.log('📊 [GL Budget]', ...args);
  const warn = (...args) => console.warn('⚠️ [GL Budget]', ...args);
  const error = (...args) => console.error('❌ [GL Budget]', ...args);

  // ============================
  // Module State
  // ============================
  let currentMode = 'view'; // 'view', 'edit', 'new'
  let currentData = [];
  let selectedRecord = null;
  let generalLedgerService = null;

  // ============================
  // Session Data
  // ============================
  function getSessionData() {
    const data = {
      BranchID: localStorage.getItem('BranchID') || '',
      OperatorID: localStorage.getItem('OperatorID') || ''
    };
    log('Session data retrieved:', data);
    return data;
  }

  // ============================
  // Initialization
  // ============================
  async function initializeGLBudget() {
    log('🔧 Initializing GL Budget module...');

    try {
      // Check GeneralLedgerService availability
      if (typeof GeneralLedgerService === 'undefined') {
        error('GeneralLedgerService not found! Check script loading order.');
        return;
      }
      log('✅ GeneralLedgerService found');

      // Use GeneralLedgerService directly
      generalLedgerService = GeneralLedgerService;
      log('✅ GeneralLedgerService loaded:', generalLedgerService);

      // Initialize event listeners
      attachEventListeners();

      // Set initial mode
      setMode('view');

      log('✅ GL Budget module initialized successfully');
    } catch (err) {
      error('Failed to initialize module:', err);
    }
  }

  // ============================
  // Load Budget Data
  // ============================
  async function loadBudgetData() {
    log('📤 Loading budget data...');

    try {
      const session = getSessionData();
      const requestData = {
        OurBranchID: id('branchId')?.value || session.BranchID,
        ReportTypeID: id('reportType')?.value || '',
        BudgetTypeID: id('budgetType')?.value || '',
        FinYearTypeID: id('financialYear')?.value || '',
        SlabTypeID: id('periodType')?.value || '',
        OperatorID: session.OperatorID
      };

      log('📤 Request data:', requestData);

      if (!generalLedgerService) {
        error('GeneralLedgerService not initialized');
        return;
      }

      console.log('🚀 CALLING API WITH:', requestData);
      const result = await generalLedgerService.getGLBudget(requestData);
      console.log('✅ API RETURNED:', result);
      log('📥 API Response received');
      
      // Debug logging to see actual structure
      console.log('🔍 typeof result:', typeof result);
      console.log('🔍 API Response Keys:', Object.keys(result || {}));
      console.log('🔍 result.success:', result.success);
      console.log('🔍 result.data type:', typeof result.data, 'isArray:', Array.isArray(result.data));
      console.log('🔍 result.data:', result.data);
      
      if (result.data && typeof result.data === 'object') {
        if (Array.isArray(result.data)) {
          console.log('🔍 result.data is ARRAY with length:', result.data.length);
          if (result.data.length > 0) {
            console.log('🔍 result.data[0]:', result.data[0]);
            console.log('🔍 Keys in result.data[0]:', Object.keys(result.data[0]));
          }
        } else {
          console.log('🔍 result.data is OBJECT');
          console.log('🔍 result.data Keys:', Object.keys(result.data));
          console.log('🔍 result.data.Details01:', result.data.Details01);
        }
      }
      console.log('🔍 Full Response stringify:', JSON.stringify(result, null, 2));

      // Handle different response formats - PRIORITIZE Details01
      let budgetData = [];
      
      if (result) {
        // PRIORITY 1: Check result.data.Details01 (most common for this API)
        if (result.data && result.data.Details01 && Array.isArray(result.data.Details01)) {
          budgetData = result.data.Details01;
          log('✅ Budget data extracted from result.data.Details01:', budgetData.length, 'records');
        }
        // PRIORITY 2: Check if result directly has Details01
        else if (result.Details01 && Array.isArray(result.Details01)) {
          budgetData = result.Details01;
          log('✅ Budget data extracted from result.Details01:', budgetData.length, 'records');
        }
        // PRIORITY 3: Check result.Details.Details01
        else if (result.Details && result.Details.Details01 && Array.isArray(result.Details.Details01)) {
          budgetData = result.Details.Details01;
          log('✅ Budget data extracted from result.Details.Details01:', budgetData.length, 'records');
        }
        // PRIORITY 4: Check if result is directly an array WITH budget fields
        else if (Array.isArray(result) && result.length > 0 && (result[0].AccountID || result[0].Budget1)) {
          budgetData = result;
          log('✅ Budget data is direct array:', budgetData.length, 'records');
        }
        // PRIORITY 5: Check if result.Details is an array with actual budget data (not metadata)
        else if (Array.isArray(result.Details) && result.Details.length > 0 && (result.Details[0].AccountID || result.Details[0].Budget1)) {
          budgetData = result.Details;
          log('✅ Budget data extracted from result.Details (array):', budgetData.length, 'records');
        }
        // PRIORITY 6: Check if result.data is an array WITH budget fields (not metadata)
        else if (result.data && Array.isArray(result.data) && result.data.length > 0 && (result.data[0].AccountID || result.data[0].Budget1)) {
          budgetData = result.data;
          log('✅ Budget data extracted from result.data (array):', budgetData.length, 'records');
        }
        // Check for success property - but still try to extract data
        else if (result.success === false) {
          warn('API returned error:', result.message || 'Unknown error');
          return;
        }
        else {
          // Last resort: Search all properties for arrays with budget data
          log('⚠️ Standard extraction failed, searching all properties...');
          for (const key in result) {
            if (Array.isArray(result[key]) && result[key].length > 0) {
              // Check if it looks like budget data (has AccountID or Budget1)
              if (result[key][0].AccountID || result[key][0].Budget1) {
                budgetData = result[key];
                log(`✅ Found budget data at result.${key}:`, budgetData.length, 'records');
                break;
              }
            }
          }
          
          if (!budgetData.length) {
            log('⚠️ No budget data (Details01) found in API response');
            log('Response contains only metadata - this indicates an empty result set');
            alert(`No budget data found for Branch ${requestData.OurBranchID}\n\nThe API returned successfully but with no budget records.\nThis branch may not have imported budget data yet.\n\n💡 Try branch 0603 which has imported budget data.`);
            populateTable([]);
            return;
          }
        }
      }

      currentData = budgetData;
      populateTable(budgetData);
    } catch (err) {
      error('Failed to load budget data:', err);
      populateTable([]);
    }
  }

  // ============================
  // Populate Table
  // ============================
  function populateTable(data) {
    log('🔍 Populating table with', data ? data.length : 0, 'records');
    log('📊 First record sample:', data && data.length > 0 ? data[0] : 'No data');

    const tbody = document.getElementById('budgetTableBody');
    if (!tbody) {
      error('❌ Table body not found! DOM element #budgetTableBody is missing');
      return;
    }
    log('✅ Table body element found');

    if (!data || data.length === 0) {
      log('⚠️ No data to display - showing empty state');
      tbody.innerHTML = '<tr><td colspan="15" class="text-muted py-4">No records to display.</td></tr>';
      return;
    }

    log('🔨 Building HTML for', data.length, 'rows...');
    const html = data.map((record, index) => `
      <tr class="budget-row" data-index="${index}" style="cursor: pointer;">
        <td>${record.AccountID || ''}</td>
        <td>${record.Type || ''}</td>
        <td>${record.Description || ''}</td>
        <td class="text-end">${formatAmount(record.Budget1)}</td>
        <td class="text-end">${formatAmount(record.Budget2)}</td>
        <td class="text-end">${formatAmount(record.Budget3)}</td>
        <td class="text-end">${formatAmount(record.Budget4)}</td>
        <td class="text-end">${formatAmount(record.Budget5)}</td>
        <td class="text-end">${formatAmount(record.Budget6)}</td>
        <td class="text-end">${formatAmount(record.Budget7)}</td>
        <td class="text-end">${formatAmount(record.Budget8)}</td>
        <td class="text-end">${formatAmount(record.Budget9)}</td>
        <td class="text-end">${formatAmount(record.Budget10)}</td>
        <td class="text-end">${formatAmount(record.Budget11)}</td>
        <td class="text-end">${formatAmount(record.Budget12)}</td>
      </tr>
    `).join('');

    log('✅ HTML built, length:', html.length, 'characters');
    tbody.innerHTML = html;
    log('✅ Table body updated with innerHTML');

    // Attach row click handlers
    const rows = document.querySelectorAll('.budget-row');
    log('🎯 Attaching click handlers to', rows.length, 'rows');
    rows.forEach(row => {
      row.addEventListener('click', handleRowClick);
    });

    log('✅ Table populated successfully with', data.length, 'records');
  }

  // ============================
  // Format Amount
  // ============================
  function formatAmount(value) {
    if (!value || value === '0' || value === 0) return '-';
    const num = parseFloat(value);
    return isNaN(num) ? '-' : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ============================
  // Handle Row Click
  // ============================
  function handleRowClick(event) {
    const row = event.currentTarget;
    const index = parseInt(row.dataset.index, 10);
    const record = currentData[index];

    log('🔍 Row clicked:', index, record);

    // Highlight selected row
    document.querySelectorAll('.budget-row').forEach(r => r.classList.remove('table-active'));
    row.classList.add('table-active');

    selectedRecord = record;
    
    if (currentMode === 'edit') {
      populateFormForEdit(record);
    }
  }

  // ============================
  // Populate Form for Edit
  // ============================
  function populateFormForEdit(record) {
    if (!record) return;
    log('📝 Populating form for edit:', record);

    // Note: This is a read-only view in the grid
    // For actual editing, you would enable input fields or show a modal
    // Currently the form fields are dropdowns at the top for filtering
  }

  // ============================
  // Handle View Action
  // ============================
  function handleViewAction() {
    log('👁️ View button clicked');
    setMode('view');
    loadBudgetData();
  }

  // ============================
  // Handle Edit Action
  // ============================
  function handleEditAction() {
    log('✏️ Edit button clicked');
    
    if (!selectedRecord) {
      warn('No record selected for editing');
      alert('Please select a budget record from the table first.');
      return;
    }

    setMode('edit');
    log('Edit mode enabled for record:', selectedRecord);
    // In a full implementation, you would show editable input fields
  }

  // ============================
  // Handle Save Action
  // ============================
  async function handleSaveAction() {
    log('💾 Save button clicked');

    if (currentMode === 'view') {
      warn('Cannot save in view mode');
      return;
    }

    try {
      const session = getSessionData();
      const requestData = {
        OurBranchID: id('branchId')?.value || session.BranchID,
        BudgetTypeID: id('budgetType')?.value || '',
        ReportTypeID: id('reportType')?.value || '',
        FinYearTypeID: id('financialYear')?.value || '',
        SlabTypeID: id('periodType')?.value || '',
        OperatorID: session.OperatorID,
        // Add monthly budget values here
        // This would come from editable form fields
      };

      log('Saving budget data:', requestData);

      const result = await (currentMode === 'edit' 
        ? generalLedgerService.editGLBudget(requestData)
        : generalLedgerService.saveGLBudget(requestData));

      if (result.success) {
        log('✅ Budget saved successfully');
        alert('Budget saved successfully!');
        setMode('view');
        loadBudgetData();
      } else {
        error('Save failed:', result.message);
        alert('Failed to save budget: ' + result.message);
      }
    } catch (err) {
      error('Save error:', err);
      alert('An error occurred while saving the budget.');
    }
  }

  // ============================
  // Handle Cancel Action
  // ============================
  function handleCancelAction() {
    log('❌ Cancel button clicked');
    setMode('view');
    selectedRecord = null;
    
    // Clear row selection
    document.querySelectorAll('.budget-row').forEach(r => r.classList.remove('table-active'));
  }

  // ============================
  // Handle Browse Action
  // ============================
  function handleBrowseAction() {
    log('🔍 Browse button clicked');
    // Implement browse/search functionality
    loadBudgetData();
  }

  // ============================
  // Handle Print Action
  // ============================
  function handlePrintAction() {
    log('🖨️ Print button clicked');
    // Implement print functionality
    window.print();
  }

  // ============================
  // Set Mode
  // ============================
  function setMode(mode) {
    currentMode = mode;
    log('Mode changed to:', mode);

    const saveBtn = id('saveBtn');
    const editBtn = id('editBtn');
    const cancelBtn = id('cancelBtn');

    if (mode === 'view') {
      saveBtn?.setAttribute('disabled', 'disabled');
      cancelBtn?.setAttribute('disabled', 'disabled');
      editBtn?.removeAttribute('disabled');
    } else if (mode === 'edit' || mode === 'new') {
      saveBtn?.removeAttribute('disabled');
      cancelBtn?.removeAttribute('disabled');
      editBtn?.setAttribute('disabled', 'disabled');
    }
  }

  // ============================
  // Attach Event Listeners
  // ============================
  function attachEventListeners() {
    log('🔧 Attaching event listeners...');

    const viewBtn = id('viewBtn');
    const editBtn = id('editBtn');
    const saveBtn = id('saveBtn');
    const cancelBtn = id('cancelBtn');
    const browseBtn = id('browseBtn');
    const printBtn = id('printBtn');

    if (viewBtn) viewBtn.addEventListener('click', handleViewAction);
    else warn('⚠️ View button not found');

    if (editBtn) editBtn.addEventListener('click', handleEditAction);
    else warn('⚠️ Edit button not found');

    if (saveBtn) saveBtn.addEventListener('click', handleSaveAction);
    else warn('⚠️ Save button not found');

    if (cancelBtn) cancelBtn.addEventListener('click', handleCancelAction);
    else warn('⚠️ Cancel button not found');

    if (browseBtn) browseBtn.addEventListener('click', handleBrowseAction);
    else warn('⚠️ Browse button not found');

    if (printBtn) printBtn.addEventListener('click', handlePrintAction);
    else warn('⚠️ Print button not found');

    log('✅ Event listeners attached');
  }

  // ============================
  // Module Entry Point
  // ============================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGLBudget);
  } else {
    initializeGLBudget();
  }
})();
