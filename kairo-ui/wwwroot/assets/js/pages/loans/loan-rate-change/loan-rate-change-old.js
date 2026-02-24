(function (global) {
  'use strict';

  if (global.__LoanRateChangeLoaded) {
    console.warn("loan-rate-change.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__LoanRateChangeLoaded = true;

  const PAGE_NAME = 'LoanRateChange';
  const MODULE_ID = '4554';

  console.log(`[${PAGE_NAME}] Script loading...`);

  // ========================================
  // STATE & CONFIGURATION
  // ========================================
  let currentMode = 'VIEW'; // VIEW, ADD, EDIT
  let loanRateChangeData = null;
  let currentScheduleData = null;
  let newScheduleData = null;

  // Form DOM Elements - initialized in init()
  let elements = {};

  // Helper functions for getting form values
  const getValue = (id) => document.getElementById(id)?.value?.trim?.() || "";
  const getOperatorId = () => (typeof window.getOperatorId === 'function' ? window.getOperatorId() : 'web_portal');
  const getOurBranchId = () => getValue('BranchID');

  // ========================================
  // TOAST NOTIFICATION (Required early for init)
  // ========================================
  function showToast(type, message) {
    const toast = document.getElementById('liveToast');
    const toastHeader = document.getElementById('toastHeader');
    const toastTitle = document.getElementById('toastTitle');
    const toastBody = document.getElementById('toastBody');

    if (!toast || !toastHeader || !toastTitle || !toastBody) {
      console.warn(`[${PAGE_NAME}] Toast elements not found, using alert`);
      alert(message);
      return;
    }

    toastHeader.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info', 'text-white');
    
    if (type === 'success') {
      toastHeader.classList.add('bg-success', 'text-white');
      toastTitle.textContent = 'Success';
    } else if (type === 'error') {
      toastHeader.classList.add('bg-danger', 'text-white');
      toastTitle.textContent = 'Error';
    } else if (type === 'warning') {
      toastHeader.classList.add('bg-warning', 'text-white');
      toastTitle.textContent = 'Warning';
    } else {
      toastHeader.classList.add('bg-info', 'text-white');
      toastTitle.textContent = 'Information';
    }
    
    toastBody.textContent = message;
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
  }

  // ========================================
  // INITIALIZATION
  // ========================================
  function init() {
    console.log(`[${PAGE_NAME}] Initializing...`);
    
    const root = document.querySelector('[data-lrc-root]');
    if (!root) {
      console.error(`[${PAGE_NAME}] Root element not found`);
      return;
    }

    // Initialize DOM element references
    elements = {
      form: document.getElementById('loanRateChangeForm'),
      branchID: document.getElementById('BranchID'),
      branchName: document.getElementById('BranchName'),
      clientID: document.getElementById('ClientID'),
      clientName: document.getElementById('ClientName'),
      accountID: document.getElementById('AccountID'),
      accountName: document.getElementById('AccountName'),
      loanSeries: document.getElementById('LoanSeries'),
      
      // Rate change details
      currentInterestRate: document.getElementById('CurrentInterestRate'),
      proposedInterestRate: document.getElementById('ProposedInterestRate'),
      
      // BTS Fields
      loanAmount: document.getElementById('LoanAmount'),
      loanBalance: document.getElementById('LoanBalance'),
      productID: document.getElementById('ProductID'),
      currencyID: document.getElementById('CurrencyID'),
      maturityDate: document.getElementById('MaturityDate'),
      loanStatus: document.getElementById('LoanStatus'),
      outstandingPrincipal: document.getElementById('OutstandingPrincipal'),
      overduePrincipal: document.getElementById('OverduePrincipal'),
      overdueInterest: document.getElementById('OverdueInterest'),
      currentInstallment: document.getElementById('CurrentInstallment'),
      totalTerm: document.getElementById('TotalTerm'),
      balanceTerm: document.getElementById('BalanceTerm'),
      
      // Tables
      currentScheduleBody: document.querySelector('[data-lrc-current-rows]'),
      newScheduleBody: document.querySelector('[data-lrc-new-rows]')
    };

    // Initialize search functionality
    initializeLookupButtons();
    
    // Wire up blur handlers for auto-population
    attachBlurHandlers();
    
    // Wire up action buttons
    wireUpActionButtons();
    
    // Set initial state
    setFormMode('view');
    
    console.log(`[${PAGE_NAME}] Ready`);
  }

  // ========================================
  // SEARCH MODAL INITIALIZATION
  // ========================================
  function initializeLookupButtons() {
    console.log('[LoanRateChange] Initializing lookup buttons...');
    
    const moduleID = '4554';

    // Wait for SearchModal to be available
    function waitForSearchModal(callback, maxWaitMs = 5000, intervalMs = 100) {
      const start = Date.now();
      (function poll() {
        if (window.SearchModal) {
          console.log('[LoanRateChange] SearchModal loaded, initializing modals...');
          callback();
        } else if (Date.now() - start < maxWaitMs) {
          setTimeout(poll, intervalMs);
        } else {
          console.warn('[LoanRateChange] SearchModal not available after timeout');
        }
      })();
    }

    waitForSearchModal(() => {
      try {
        // BranchID search
        const branchSearchBtn = document.querySelector('button[aria-label="Lookup branch"]');
        if (branchSearchBtn) {
          branchSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[LoanRateChange] Branch search button clicked');
            
            const branchIDValue = getValue('BranchID');
            
            const branchModal = new window.SearchModal({
              prefix: 'lrc-branch-search',
              moduleID,
              getOperatorId,
              getOurBranchId
            });
            
            branchModal.open({
              tableID: 'BranchID',
              searchFields: [
                { name: 'BranchID', label: 'Branch ID', column: 'OurBranchID', value: branchIDValue },
                { name: 'BranchName', label: 'Branch Name', column: 'BranchName' }
              ],
              autoSearch: !!branchIDValue,
              onSelect: (record) => {
                console.log('[LoanRateChange] Branch selected:', record);
                document.getElementById('BranchID').value = record.OurBranchID || '';
                document.getElementById('BranchName').value = record.BranchName || '';
              }
            });
          });
        } else {
          console.warn('[LoanRateChange] Branch search button not found');
        }

        // ClientID search
        const clientSearchBtn = document.querySelector('button[aria-label="Search client"]');
        if (clientSearchBtn) {
          clientSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[LoanRateChange] Client search button clicked');
            
            const branchID = getValue('BranchID');
            if (!branchID) {
              showToast('error', 'Please enter Branch ID first');
              return;
            }
            
            const clientIDValue = getValue('ClientID');
            
            const clientModal = new window.SearchModal({
              prefix: 'lrc-client-search',
              moduleID,
              getOperatorId,
              getOurBranchId
            });
            
            clientModal.open({
              tableID: 'ClientAccountID',
              whereStmt: `ProductTypeID='LN' AND OurBranchID = '${branchID}'`,
              searchFields: [
                { name: 'ClientID', label: 'Client ID', column: 'ClientID', value: clientIDValue },
                { name: 'ClientName', label: 'Client Name', column: 'ClientName' }
              ],
              autoSearch: !!clientIDValue,
              onSelect: (record) => {
                console.log('[LoanRateChange] Client selected:', record);
                document.getElementById('ClientID').value = record.ClientID || '';
                const clientName = record.ClientName || record.Name || '';
                const clientNameEl = document.getElementById('ClientName');
                if (clientNameEl) clientNameEl.value = clientName;
              }
            });
          });
        } else {
          console.warn('[LoanRateChange] Client search button not found');
        }

        // AccountID search
        const accountSearchBtn = document.querySelector('button[aria-label="Search account"]');
        if (accountSearchBtn) {
          accountSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[LoanRateChange] Account search button clicked');
            
            const branchID = getValue('BranchID');
            if (!branchID) {
              showToast('error', 'Please enter Branch ID first');
              return;
            }
            
            const clientID = getValue('ClientID');
            const accountIDValue = getValue('AccountID');
            
            let whereStmt = `OurBranchID = '${branchID}'`;
            if (clientID) {
              whereStmt += ` AND ClientID = '${clientID}'`;
            }
            
            const accountModal = new window.SearchModal({
              prefix: 'lrc-account-search',
              moduleID,
              getOperatorId,
              getOurBranchId
            });
            
            accountModal.open({
              tableID: 'LoanID',
              whereStmt,
              searchFields: [
                { name: 'AccountID', label: 'Account ID', column: 'AccountID', value: accountIDValue },
                { name: 'LoanID', label: 'Loan ID', column: 'LoanID' },
                { name: 'LoanSeries', label: 'Loan Series', column: 'LoanSeries' }
              ],
              autoSearch: !!accountIDValue,
              onSelect: (record) => {
                console.log('[LoanRateChange] Account selected:', record);
                document.getElementById('AccountID').value = record.AccountID || '';
                document.getElementById('LoanSeries').value = record.LoanSeries || '';
                const accountName = record.AccountName || record.Name || '';
                const accountNameEl = document.getElementById('AccountName');
                if (accountNameEl) accountNameEl.value = accountName;
              }
            });
          });
        } else {
          console.warn('[LoanRateChange] Account search button not found');
        }
        
        console.log('[LoanRateChange] All lookup buttons initialized successfully');
      } catch (error) {
        console.error('[LoanRateChange] Error initializing lookup buttons:', error);
      }
    });
  }

  // ========================================
  // ACTION BUTTON HANDLERS
  // ========================================
  function wireUpActionButtons() {
    const buttons = document.querySelectorAll('[data-action]');
    
    buttons.forEach(btn => {
      const action = btn.getAttribute('data-action');
      btn.addEventListener('click', () => {
        switch(action) {
          case 'view':
            handleView();
            break;
          case 'add':
            handleAdd();
            break;
          case 'save':
            handleSave();
            break;
          case 'cancel':
            handleCancel();
            break;
          case 'back':
            handleBack();
            break;
        }
      });
    });
  }

  // ========================================
  // BLUR HANDLERS FOR AUTO-POPULATION
  // ========================================
  function attachBlurHandlers() {
    console.log('[LoanRateChange] Attaching blur handlers...');
    
    if (elements.branchID) {
      elements.branchID.addEventListener('blur', handleBranchBlur);
    }
    
    if (elements.clientID) {
      elements.clientID.addEventListener('blur', handleClientBlur);
    }
    
    if (elements.accountID) {
      elements.accountID.addEventListener('blur', handleAccountBlur);
    }
    
    if (elements.proposedInterestRate) {
      elements.proposedInterestRate.addEventListener('blur', handleProposedRateBlur);
    }
  }

  function handleView() {
    console.log('[LoanRateChange] View clicked');
    
    if (!validateViewInputs()) {
      return;
    }
    
    const viewBtn = document.querySelector('[data-action="view"]');
    if (viewBtn) viewBtn.disabled = true;
    
    const branchID = elements.branchID.value.trim();
    const clientID = elements.clientID.value.trim();
    const accountID = elements.accountID.value.trim();
    
    (async () => {
      try {
        if (!window.LoanRateChangeService?.getLoanDetails) {
          console.warn('[LoanRateChange] LoanRateChangeService.getLoanDetails not available');
          showToast('error', 'Loan service not available');
          return;
        }

        console.log('[LoanRateChange] Calling LoanRateChangeService.getLoanDetails with:', { branchID, clientID, accountID });
        const response = await window.LoanRateChangeService.getLoanDetails(branchID, clientID, accountID);
        
        console.log('[LoanRateChange] Service response:', response);

        if (response && response.success && response.data) {
          // Store the data
          loanRateChangeData = response.data;
          
          // Populate form fields
          populateFormData(response.data);
          
          // Populate current schedule if available
          if (response.data.CurrentSchedule && Array.isArray(response.data.CurrentSchedule)) {
            currentScheduleData = response.data.CurrentSchedule;
            populateCurrentSchedule(currentScheduleData);
          }
          
          // Set form to VIEW mode (ProposedRate will be disabled)
          setFormMode('view');
          
          showToast('success', 'Loan details loaded successfully. Click ADD to modify rate.');
        } else {
          showToast('error', response?.error || response?.message || 'Failed to load loan details');
        }
      } catch (error) {
        console.error('[LoanRateChange] Error loading loan details:', error);
        showToast('error', error.message || 'An error occurred while loading loan details');
      } finally {
        if (viewBtn) viewBtn.disabled = false;
      }
    })();
  }

  function handleAdd() {
    console.log('[LoanRateChange] Add clicked');
    if (!loanRateChangeData) {
      showToast('error', 'Please load loan details first by clicking View');
      return;
    }
    console.log('[LoanRateChange] Entering ADD mode - ProposedRate field will be enabled');
    currentMode = 'add';
    setFormMode('add');
    elements.proposedInterestRate.focus();
    showToast('info', 'Enter proposed rate and we will calculate the new schedule');
  }

  async function handleSave() {
    console.log('[LoanRateChange] Save clicked');
    
    if (!loanRateChangeData) {
      showToast('error', 'Please load loan details first');
      return;
    }
    
    const proposedRate = parseFloat(elements.proposedInterestRate.value);
    if (!proposedRate || proposedRate <= 0) {
      showToast('error', 'Please enter a valid Proposed Interest Rate');
      elements.proposedInterestRate.focus();
      return;
    }
    
    if (!confirm('Are you sure you want to save this rate change?')) {
      return;
    }
    
    const saveBtn = document.querySelector('[data-action="save"]');
    if (saveBtn) saveBtn.disabled = true;
    
    try {
      if (!window.LoanRateChangeService?.saveLoanRateChange) {
        showToast('error', 'Service not available');
        return;
      }
      
      const rateChangeData = {
        OurBranchID: elements.branchID.value.trim(),
        ClientID: elements.clientID.value.trim(),
        AccountID: elements.accountID.value.trim(),
        LoanSeries: elements.loanSeries.value,
        ProposedInterestRate: proposedRate
      };
      
      console.log('[LoanRateChange] Saving rate change with data:', rateChangeData);
      const response = await window.LoanRateChangeService.saveLoanRateChange(rateChangeData, '');
      
      if (response && response.success) {
        showToast('success', response.message || 'Loan rate change saved successfully');
        setTimeout(() => {
          resetForm();
        }, 1500);
      } else {
        showToast('error', response?.error || 'Failed to save rate change');
      }
    } catch (error) {
      console.error('[LoanRateChange] Save error:', error);
      showToast('error', error.message || 'An error occurred while saving');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  function handleCancel() {
    console.log('[LoanRateChange] Cancel clicked');
    if (elements.proposedInterestRate.value.trim()) {
      if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        return;
      }
    }
    elements.proposedInterestRate.value = '';
    newScheduleData = [];
    populateNewSchedule([]);
    setFormMode('view');
  }

  function handleBack() {
    console.log('[LoanRateChange] Back clicked');
    resetForm();
    window.history.back();
  }

  // ========================================
  // FORM MODE MANAGEMENT
  // ========================================
  function setFormMode(mode) {
    console.log('[LoanRateChange] Setting mode:', mode);
    
    const viewBtn = document.querySelector('[data-action="view"]');
    const addBtn = document.querySelector('[data-action="add"]');
    const saveBtn = document.querySelector('[data-action="save"]');
    const cancelBtn = document.querySelector('[data-action="cancel"]');
    
    if (mode === 'view') {
      if (viewBtn) viewBtn.disabled = false;
      if (addBtn) addBtn.disabled = false;
      if (saveBtn) saveBtn.disabled = true;
      if (cancelBtn) cancelBtn.disabled = true;
      
      // Disable input fields
      elements.proposedInterestRate.disabled = true;
    } else if (mode === 'add') {
      if (viewBtn) viewBtn.disabled = true;
      if (addBtn) addBtn.disabled = true;
      if (saveBtn) saveBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      
      // Enable input fields
      elements.proposedInterestRate.disabled = false;
    }
  }

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================
  function validateViewInputs() {
    if (!elements.branchID.value.trim()) {
      showToast('error', 'Please enter Branch ID');
      elements.branchID.focus();
      return false;
    }
    
    if (!elements.accountID.value.trim()) {
      showToast('error', 'Please enter Account ID');
      elements.accountID.focus();
      return false;
    }
    
    return true;
  }

  function populateFormData(data) {
    if (!data) return;
    
    elements.loanSeries.value = data.LoanSeries || '';
    elements.currentInterestRate.value = data.CurrentInterestRate || '';
    
    // Populate Behind The Scene fields
    elements.loanAmount.value = formatCurrency(data.LoanAmount);
    elements.loanBalance.value = formatCurrency(data.LoanBalance);
    elements.productID.value = data.ProductID || '';
    elements.currencyID.value = data.CurrencyID || '';
    elements.maturityDate.value = data.MaturityDate || '';
    elements.loanStatus.value = data.LoanStatus || '';
    elements.outstandingPrincipal.value = formatCurrency(data.OutstandingPrincipal);
    elements.overduePrincipal.value = formatCurrency(data.OverduePrincipal);
    elements.overdueInterest.value = formatCurrency(data.OverdueInterest);
    elements.currentInstallment.value = formatCurrency(data.CurrentInstallment);
    elements.totalTerm.value = data.TotalTerm || '';
    elements.balanceTerm.value = data.BalanceTerm || '';
  }

  function populateCurrentSchedule(scheduleData) {
    if (!scheduleData || !Array.isArray(scheduleData)) {
      elements.currentScheduleBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-3">No current schedule</td></tr>';
      return;
    }

    let html = '';
    scheduleData.forEach(row => {
      html += '<tr>';
      html += `<td style="text-align: center;">${row.InstNo || ''}</td>`;
      html += `<td style="text-align: center;">${row.InstDate || ''}</td>`;
      html += `<td style="text-align: right;">${formatCurrency(row.LoanBalance)}</td>`;
      html += `<td style="text-align: right;">${formatCurrency(row.InstAmount)}</td>`;
      html += `<td style="text-align: right;">${formatCurrency(row.PrnAmount)}</td>`;
      html += `<td style="text-align: right;">${formatCurrency(row.IntAmount)}</td>`;
      html += '</tr>';
    });
    elements.currentScheduleBody.innerHTML = html || '<tr><td colspan="6" class="text-center text-muted p-3">No data</td></tr>';
  }

  function populateNewSchedule(scheduleData) {
    if (!scheduleData || !Array.isArray(scheduleData)) {
      elements.newScheduleBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-3">No schedule generated</td></tr>';
      return;
    }

    let html = '';
    scheduleData.forEach(row => {
      html += '<tr>';
      html += `<td style="text-align: center;">${row.InstNo || ''}</td>`;
      html += `<td style="text-align: center;">${row.InstDate || ''}</td>`;
      html += `<td style="text-align: right;">${formatCurrency(row.LoanBalance)}</td>`;
      html += `<td style="text-align: right;">${formatCurrency(row.InstAmount)}</td>`;
      html += `<td style="text-align: right;">${formatCurrency(row.PrnAmount)}</td>`;
      html += `<td style="text-align: right;">${formatCurrency(row.IntAmount)}</td>`;
      html += '</tr>';
    });
    elements.newScheduleBody.innerHTML = html || '<tr><td colspan="6" class="text-center text-muted p-3">No data</td></tr>';
  }

  function formatCurrency(value) {
    if (!value && value !== 0) return '';
    return parseFloat(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function handleAdd() {
    console.log(`[${PAGE_NAME}] Add button clicked`);
    if (!loanRateChangeData) {
      showMessage('error', 'Please load loan details first');
      return;
    }
    setFormMode('ADD');
    elements.proposedInterestRate.focus();
    elements.eventIDField.value = 'ADD';
  }

  async function handleSave() {
    console.log(`[${PAGE_NAME}] Save button clicked`);
    
    if (!validateSaveInputs()) {
      return;
    }

    if (!confirm('Are you sure you want to save this rate change?')) {
      return;
    }

    elements.btnSave.disabled = true;
    elements.btnSave.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';

    try {
      const rateChangeData = {
        OurBranchID: elements.branchID.value.trim(),
        ClientID: elements.clientID.value.trim(),
        AccountID: elements.accountID.value.trim(),
        LoanSeries: elements.loanSeries.value,
        CurrentInterestRate: loanRateChangeData?.CurrentInterestRate || 0,
        ProposedInterestRate: parseFloat(elements.proposedInterestRate.value) || 0
      };

      const remarks = elements.remarks.value.trim();

      const response = await LoanRateChangeService.saveLoanRateChange(rateChangeData, remarks);

      if (!response.success) {
        showMessage('error', response.error || 'Failed to save rate change');
        return;
      }

      showMessage('success', response.message || 'Loan rate change saved successfully');
      
      setTimeout(() => {
        resetForm();
      }, 1500);

    } catch (error) {
      console.error(`[${PAGE_NAME}] Save error:`, error);
      showMessage('error', error.message || 'An error occurred while saving');
    } finally {
      elements.btnSave.disabled = false;
      elements.btnSave.textContent = 'Save';
    }
  }

  function handleCancel() {
    console.log(`[${PAGE_NAME}] Cancel button clicked`);
    if (currentMode === 'ADD' || currentMode === 'EDIT') {
      if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        return;
      }
      setFormMode('VIEW');
    } else {
      resetForm();
    }
  }

  // ========================================
  // SEARCH HANDLERS
  // ========================================
  async function openSearchModal(type) {
    // For now, placeholder - in production this would open SearchModal component
    console.log(`[${PAGE_NAME}] Search ${type} clicked`);
    showMessage('info', `Search ${type} feature coming soon`);
  }

  async function handleProposedRateBlur() {
    // Only generate new schedule if in ADD mode and ProposedRate has changed
    if (currentMode !== 'add') {
      return;
    }
    
    const proposedRate = parseFloat(elements.proposedInterestRate.value);
    
    if (!proposedRate || proposedRate <= 0) {
      console.log('[LoanRateChange] Invalid proposed rate, skipping generation');
      return;
    }
    
    if (!loanRateChangeData) {
      console.warn('[LoanRateChange] No loan data available');
      showToast('warning', 'Please load loan details first');
      return;
    }
    
    try {
      if (!window.LoanRateChangeService?.generateNewSchedule) {
        console.warn('[LoanRateChange] generateNewSchedule not available');
        return;
      }
      
      console.log('[LoanRateChange] Generating new schedule with proposed rate:', proposedRate);
      const response = await window.LoanRateChangeService.generateNewSchedule(
        elements.branchID.value.trim(),
        elements.accountID.value.trim(),
        elements.loanSeries.value,
        proposedRate
      );
      
      console.log('[LoanRateChange] New schedule response:', response);
      
      if (response && response.success && Array.isArray(response.data)) {
        newScheduleData = response.data;
        populateNewSchedule(newScheduleData);
        showToast('success', 'New schedule generated successfully');
        console.log('[LoanRateChange] New schedule generated successfully');
      } else {
        console.warn('[LoanRateChange] Failed to generate new schedule:', response?.error);
        showToast('warning', response?.error || 'Could not generate new schedule');
      }
    } catch (error) {
      console.error('[LoanRateChange] Error generating new schedule:', error);
      showToast('error', error.message || 'Error generating new schedule');
    }
  }

  async function handleBranchBlur() {
    const branchID = elements.branchID.value.trim();
    
    if (!branchID) {
      elements.branchName.value = '';
      return;
    }

    try {
      if (!window.SearchService) {
        console.warn(`[${PAGE_NAME}] SearchService not available`);
        return;
      }

      const whereStmt = `OurBranchID LIKE '%${branchID.replace(/'/g, "''")}'`;
      const operatorId = getOperatorId();

      const response = await window.SearchService.searchClients({
        TableID: 'BranchID',
        WhereStmt: whereStmt,
        AdvFilterString: '',
        PrevOrNext: '1',
        RefID: '',
        OperatorID: operatorId,
        ModuleID: '4554',
        OurBranchID: branchID,
        SearchKey: ''
      });

      const responseData = response?.Details || response?.Data || [];
      if (responseData && responseData.length > 0) {
        const record = responseData[0];
        elements.branchName.value = record.BranchName || record.Name || '';
        console.log(`[${PAGE_NAME}] Branch lookup success:`, record);
      } else {
        elements.branchName.value = '';
        console.warn(`[${PAGE_NAME}] No match found for Branch ID: ${branchID}`);
      }
    } catch (error) {
      console.error(`[${PAGE_NAME}] Branch lookup error:`, error);
      elements.branchName.value = '';
    }
  }

  async function handleClientBlur() {
    const branchID = elements.branchID.value.trim();
    const clientID = elements.clientID.value.trim();
    
    if (!clientID) {
      elements.clientName.value = '';
      return;
    }

    try {
      if (!window.SearchService) {
        console.warn(`[${PAGE_NAME}] SearchService not available`);
        return;
      }

      const whereStmt = `ClientID LIKE '%${clientID.replace(/'/g, "''")}'`;
      const advFilter = `ProductTypeID='LN'`;
      const operatorId = getOperatorId();

      const response = await window.SearchService.searchClients({
        TableID: 'ClientAccountID',
        WhereStmt: whereStmt,
        AdvFilterString: advFilter,
        PrevOrNext: '1',
        RefID: '',
        OperatorID: operatorId,
        ModuleID: '4554',
        OurBranchID: branchID || '',
        SearchKey: ''
      });

      const responseData = response?.Details || response?.Data || [];
      if (responseData && responseData.length > 0) {
        const record = responseData[0];
        elements.clientName.value = record.ClientName || record.Name || '';
        console.log(`[${PAGE_NAME}] Client lookup success:`, record);
      } else {
        elements.clientName.value = '';
        console.warn(`[${PAGE_NAME}] No match found for Client ID: ${clientID}`);
      }
    } catch (error) {
      console.error(`[${PAGE_NAME}] Client lookup error:`, error);
      elements.clientName.value = '';
    }
  }

  async function handleAccountBlur() {
    const branchID = elements.branchID.value.trim();
    const accountID = elements.accountID.value.trim();
    
    if (!accountID) {
      elements.accountName.value = '';
      elements.loanSeries.value = '';
      return;
    }

    try {
      if (!window.SearchService) {
        console.warn(`[${PAGE_NAME}] SearchService not available`);
        return;
      }

      const whereStmt = `AccountID LIKE '%${accountID.replace(/'/g, "''")}'`;
      const advFilter = branchID ? `OurBranchID=${branchID} AND LoanStatusID IN ("A")` : `LoanStatusID IN ("A")`;
      const operatorId = getOperatorId();

      const response = await window.SearchService.searchClients({
        TableID: 'LoanID',
        WhereStmt: whereStmt,
        AdvFilterString: advFilter,
        PrevOrNext: '1',
        RefID: '',
        OperatorID: operatorId,
        ModuleID: '4554',
        OurBranchID: branchID || '',
        SearchKey: ''
      });

      const responseData = response?.Details || response?.Data || [];
      if (responseData && responseData.length > 0) {
        const record = responseData[0];
        elements.accountName.value = record.AccountName || record.Name || '';
        elements.loanSeries.value = record.LoanSeries || '';
        console.log(`[${PAGE_NAME}] Account lookup success:`, record);
      } else {
        elements.accountName.value = '';
        elements.loanSeries.value = '';
        console.warn(`[${PAGE_NAME}] No match found for Account ID: ${accountID}`);
      }
    } catch (error) {
      console.error(`[${PAGE_NAME}] Account lookup error:`, error);
      elements.accountName.value = '';
      elements.loanSeries.value = '';
    }
  }

  // ========================================
  // DATA POPULATION
  // ========================================
  function populateFormData(data) {
    if (!data) return;

    // Basic loan info
    elements.loanAmount.value = formatCurrency(data.LoanAmount);
    elements.loanBalance.value = formatCurrency(data.LoanBalance);
    elements.productID.value = data.ProductID || '';
    elements.currencyID.value = data.CurrencyID || '';
    elements.maturityDate.value = formatDate(data.MaturityDate);
    elements.loanStatus.value = data.LoanStatus || '';
    elements.outstandingPrincipal.value = formatCurrency(data.OutstandingPrincipal);
    elements.overduePrincipal.value = formatCurrency(data.OverduePrincipal);
    elements.overdueInterest.value = formatCurrency(data.OverdueInterest);
    elements.currentInstallment.value = formatCurrency(data.CurrentInstallment);
    elements.totalTerm.value = data.TotalTerm || '';
    elements.balanceTerm.value = data.BalanceTerm || '';
    
    // Current rate
    elements.currentInterestRate.value = data.CurrentInterestRate || '';
  }

  function populateCurrentSchedule(scheduleData) {
    if (!scheduleData || !Array.isArray(scheduleData)) {
      elements.currentScheduleBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted p-3">No schedule data</td></tr>';
      return;
    }

    let html = '';
    scheduleData.forEach(row => {
      html += '<tr>';
      html += `<td style="text-align: center;">${row.InstNo || ''}</td>`;
      html += `<td style="text-align: right;">${formatCurrency(row.Principal)}</td>`;
      html += `<td style="text-align: right;">${formatCurrency(row.Interest)}</td>`;
      html += `<td style="text-align: right;">${formatCurrency(row.Amount)}</td>`;
      html += `<td style="text-align: right;">${formatCurrency(row.Balance)}</td>`;
      html += '</tr>';
    });
    elements.currentScheduleBody.innerHTML = html || '<tr><td colspan="5" class="text-center text-muted p-3">No data</td></tr>';
  }

  function populateNewSchedule(scheduleData) {
    if (!scheduleData || !Array.isArray(scheduleData)) {
      elements.newScheduleBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted p-3">No schedule generated</td></tr>';
      return;
    }

    let html = '';
    scheduleData.forEach(row => {
      html += '<tr>';
      html += `<td style="text-align: center;">${row.InstNo || ''}</td>`;
      html += `<td style="text-align: right;">${formatCurrency(row.Principal)}</td>`;
      html += `<td style="text-align: right;">${formatCurrency(row.Interest)}</td>`;
      html += `<td style="text-align: right;">${formatCurrency(row.Amount)}</td>`;
      html += `<td style="text-align: right;">${formatCurrency(row.Balance)}</td>`;
      html += '</tr>';
    });
    elements.newScheduleBody.innerHTML = html || '<tr><td colspan="5" class="text-center text-muted p-3">No data</td></tr>';
  }

  // ========================================
  // VALIDATION
  // ========================================
  function validateViewInputs() {
    if (!elements.branchID.value.trim()) {
      showMessage('error', 'Branch ID is required');
      elements.branchID.focus();
      return false;
    }

    if (!elements.accountID.value.trim()) {
      showMessage('error', 'Account ID is required');
      elements.accountID.focus();
      return false;
    }

    return true;
  }

  function validateSaveInputs() {
    if (!elements.proposedInterestRate.value.trim()) {
      showMessage('error', 'Proposed Interest Rate is required');
      elements.proposedInterestRate.focus();
      return false;
    }

    const rate = parseFloat(elements.proposedInterestRate.value);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      showMessage('error', 'Proposed Interest Rate must be between 0 and 100');
      elements.proposedInterestRate.focus();
      return false;
    }

    if (!elements.effectiveFromDate.value.trim()) {
      showMessage('error', 'Effective From Date is required');
      elements.effectiveFromDate.focus();
      return false;
    }

    return true;
  }

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================
  function resetForm() {
    clearForm();
    setInitialBranch();
    setFormMode('VIEW');
    loanRateChangeData = null;
    currentScheduleData = null;
    newScheduleData = null;
    elements.currentScheduleBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted p-3">Click View to load schedule</td></tr>';
    elements.newScheduleBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted p-3">Generate schedule by entering rate and clicking View</td></tr>';
  }

  function clearForm() {
    elements.clientID.value = '';
    elements.clientName.value = '';
    elements.accountID.value = '';
    elements.accountName.value = '';
    elements.loanSeries.value = '';
    elements.proposedInterestRate.value = '';
    elements.effectiveFromDate.value = '';
    elements.remarks.value = '';
    elements.remarksCount.textContent = '0';

    elements.loanAmount.value = '';
    elements.loanBalance.value = '';
    elements.productID.value = '';
    elements.currencyID.value = '';
    elements.maturityDate.value = '';
    elements.loanStatus.value = '';
    elements.outstandingPrincipal.value = '';
    elements.overduePrincipal.value = '';
    elements.overdueInterest.value = '';
    elements.currentInstallment.value = '';
    elements.totalTerm.value = '';
    elements.balanceTerm.value = '';
    elements.currentInterestRate.value = '';
  }

  function formatCurrency(value) {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-GB');
    } catch {
      return dateStr;
    }
  }

  function showMessage(type, message) {
    const toastEl = document.getElementById('liveToast');
    const toastTitle = document.getElementById('toastTitle');
    const toastBody = document.getElementById('toastBody');

    if (!toastEl || !toastTitle || !toastBody) {
      console.warn(`[${PAGE_NAME}] Toast elements not found, using alert`);
      alert(message);
      return;
    }

    const titles = {
      success: 'Success',
      error: 'Error',
      info: 'Information',
      warning: 'Warning'
    };

    toastTitle.textContent = titles[type] || 'Notification';
    toastBody.textContent = message;

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

  // ========================================
  // PAGE LOAD
  // ========================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log(`[${PAGE_NAME}] Script loaded successfully`);

})(window);
