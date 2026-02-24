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
  let currentMode = 'view'; // view, add
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
  // TOAST NOTIFICATION
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

    // Verify all elements exist
    console.log(`[${PAGE_NAME}] Elements initialized`);

    // Wire up search button handlers
    wireUpSearchButtons();

    // Wire up blur handlers for auto-population
    attachBlurHandlers();
    
    // Wire up action buttons
    wireUpActionButtons();
    
    // Set initial state
    setFormMode('view');
    
    console.log(`[${PAGE_NAME}] Ready`);
  }

  // ========================================
  // SEARCH BUTTON HANDLERS
  // ========================================
  function wireUpSearchButtons() {
    const getValue = (id) => document.getElementById(id)?.value?.trim?.() || "";
    const moduleID = '4300';
    const getOperatorId = () => (typeof window.getOperatorId === 'function' ? window.getOperatorId() : 'web_portal');
    const getOurBranchId = () => getValue('BranchID');

    // Wait for SearchModal to be available
    function waitForSearchModal(callback, maxWaitMs = 5000, intervalMs = 100) {
      const start = Date.now();
      (function poll() {
        if (window.SearchModal) {
          callback();
        } else if (Date.now() - start < maxWaitMs) {
          setTimeout(poll, intervalMs);
        } else {
          console.warn('[LoanRateChange] SearchModal not available after timeout');
        }
      })();
    }

    waitForSearchModal(() => {
      // Create modal instances once and reuse them
      const branchModal = new window.SearchModal({
        prefix: 'lrc-branch-search',
        moduleID,
        getOperatorId,
        getOurBranchId
      });

      // BranchID search
      const branchSearchBtn = document.querySelector('[id="BranchID"]').parentElement.querySelector('button');
      if (branchSearchBtn) {
        branchSearchBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const branchIDValue = getValue('BranchID');
          branchModal.open({
            tableID: 'BranchID',
            searchFields: [
              { name: 'BranchID', label: 'Branch ID', column: 'OurBranchID', value: branchIDValue },
              { name: 'BranchName', label: 'Branch Name', column: 'BranchName' }
            ],
            autoSearch: !!branchIDValue,
            onSelect: (record) => {
              elements.branchID.value = record.OurBranchID || '';
              elements.branchName.value = record.BranchName || '';
            }
          });
        });
      }

      // Create client modal instance
      const clientModal = new window.SearchModal({
        prefix: 'lrc-client-search',
        moduleID,
        getOperatorId,
        getOurBranchId
      });

      // ClientID search
      const clientSearchBtn = document.querySelector('[id="ClientID"]').parentElement.querySelector('button');
      if (clientSearchBtn) {
        clientSearchBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const branchID = getValue('BranchID');
          if (!branchID) {
            showToast('warning', 'Please enter Branch ID first');
            return;
          }
          const clientIDValue = getValue('ClientID');
          clientModal.open({
            tableID: 'ClientAccountID',
            whereStmt: `ProductTypeID='LN' AND OurBranchID = '${branchID}'`,
            searchFields: [
              { name: 'ClientID', label: 'Client ID', column: 'ClientID', value: clientIDValue },
              { name: 'ClientName', label: 'Client Name', column: 'ClientName' }
            ],
            autoSearch: !!clientIDValue,
            onSelect: (record) => {
              elements.clientID.value = record.ClientID || '';
              elements.clientName.value = record.ClientName || record.Name || '';
            }
          });
        });
      }

      // Create account modal instance
      const accountModal = new window.SearchModal({
        prefix: 'lrc-account-search',
        moduleID,
        getOperatorId,
        getOurBranchId
      });

      // AccountID search
      const accountSearchBtn = document.querySelector('[id="AccountID"]').parentElement.querySelector('button');
      if (accountSearchBtn) {
        accountSearchBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const branchID = getValue('BranchID');
          if (!branchID) {
            showToast('warning', 'Please enter Branch ID first');
            return;
          }
          const accountIDValue = getValue('AccountID');
          accountModal.open({
            tableID: 'LoanID',
            whereStmt: `OurBranchID = '${branchID}' AND LoanStatusID IN ('A','N')`,
            searchFields: [
              { name: 'AccountID', label: 'Account ID', column: 'AccountID', value: accountIDValue },
              { name: 'Name', label: 'Account Name', column: 'Name' }
            ],
            autoSearch: !!accountIDValue,
            onSelect: (record) => {
              elements.accountID.value = record.AccountID || '';
              elements.accountName.value = record.Name || '';
              elements.loanSeries.value = record.LoanSeries || '';
            }
          });
        });
      }
    });
  }

  // ========================================
  // BLUR HANDLERS FOR AUTO-POPULATION
  // ========================================
  function attachBlurHandlers() {
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

  async function handleBranchBlur() {
    const branchId = elements.branchID.value.trim();
    if (!branchId) return;

    try {
      const result = await window.LoanRateChangeService?.searchBranches(branchId);
      if (result?.data && result.data.length > 0) {
        const branch = result.data[0];
        elements.branchName.value = branch.BranchName || '';
      }
    } catch (error) {
      console.warn(`[${PAGE_NAME}] Error in branch blur:`, error);
    }
  }

  async function handleClientBlur() {
    const branchId = elements.branchID.value.trim();
    const clientId = elements.clientID.value.trim();
    if (!branchId || !clientId) return;

    try {
      const result = await window.LoanRateChangeService?.searchClients(branchId, clientId);
      if (result?.data && result.data.length > 0) {
        const client = result.data.find(c => c.ClientID === clientId);
        if (client) {
          elements.clientName.value = client.ClientName || '';
        }
      }
    } catch (error) {
      console.warn(`[${PAGE_NAME}] Error in client blur:`, error);
    }
  }

  async function handleAccountBlur() {
    const branchId = elements.branchID.value.trim();
    const clientId = elements.clientID.value.trim();
    const accountId = elements.accountID.value.trim();
    if (!branchId || !accountId) return;

    try {
      const result = await window.LoanRateChangeService?.searchAccounts(branchId, clientId, accountId);
      if (result?.data && result.data.length > 0) {
        const account = result.data.find(a => a.AccountID === accountId);
        if (account) {
          elements.accountName.value = account.Name || '';
          elements.loanSeries.value = account.LoanSeries || '';
        }
      }
    } catch (error) {
      console.warn(`[${PAGE_NAME}] Error in account blur:`, error);
    }
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
        
        // Automatically switch to New Schedule tab
        switchToNewScheduleTab();
      } else {
        console.warn('[LoanRateChange] Failed to generate new schedule:', response?.error);
        showToast('warning', response?.error || 'Could not generate new schedule');
      }
    } catch (error) {
      console.error('[LoanRateChange] Error generating new schedule:', error);
      showToast('error', error.message || 'Error generating new schedule');
    }
  }

  // ========================================
  // ACTION BUTTON HANDLERS
  // ========================================
  function wireUpActionButtons() {
    const viewBtn = document.querySelector('[data-action="view"]');
    const addBtn = document.querySelector('[data-action="add"]');
    const saveBtn = document.querySelector('[data-action="save"]');
    const cancelBtn = document.querySelector('[data-action="cancel"]');
    const backBtn = document.querySelector('[data-action="back"]');

    if (viewBtn) viewBtn.addEventListener('click', handleView);
    if (addBtn) addBtn.addEventListener('click', handleAdd);
    if (saveBtn) saveBtn.addEventListener('click', handleSave);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
    if (backBtn) backBtn.addEventListener('click', handleBack);
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
    const loanSeries = elements.loanSeries.value.trim();
    
    (async () => {
      try {
        if (!window.LoanRateChangeService?.getLoanDetails) {
          console.warn('[LoanRateChange] LoanRateChangeService.getLoanDetails not available');
          showToast('error', 'Loan service not available');
          return;
        }

        console.log('[LoanRateChange] Calling LoanRateChangeService.getLoanDetails with:', { branchID, clientID, accountID, loanSeries });
        const response = await window.LoanRateChangeService.getLoanDetails(branchID, clientID, accountID, loanSeries);
        
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
        console.warn('[LoanRateChange] saveLoanRateChange not available');
        showToast('error', 'Save service not available');
        return;
      }

      console.log('[LoanRateChange] Calling saveLoanRateChange with:', {
        branchId: elements.branchID.value.trim(),
        accountId: elements.accountID.value.trim(),
        loanSeries: elements.loanSeries.value,
        proposedRate: proposedRate,
        operatorId: getOperatorId()
      });

      const response = await window.LoanRateChangeService.saveLoanRateChange(
        elements.branchID.value.trim(),
        elements.accountID.value.trim(),
        elements.loanSeries.value,
        proposedRate,
        getOperatorId()
      );

      console.log('[LoanRateChange] Save response:', response);

      if (response && response.success) {
        showToast('success', 'Loan rate change saved successfully');
        currentMode = 'view';
        resetForm();
        setFormMode('view');
      } else {
        showToast('error', response?.error || 'Failed to save rate change');
      }
    } catch (error) {
      console.error('[LoanRateChange] Error saving:', error);
      showToast('error', error.message || 'An error occurred while saving');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  function handleCancel() {
    console.log('[LoanRateChange] Cancel clicked');
    // On main screen: Cancel just abandons the proposed rate input
    // It does NOT clear loaded data or grids - they remain as they were
    elements.proposedInterestRate.value = '';
    newScheduleData = null;
    elements.newScheduleBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-3">No new schedule to display. Enter proposed rate and click View to generate.</td></tr>';
    currentMode = 'view';
    setFormMode('view');
    showToast('info', 'Rate change cancelled - data remains loaded');
  }

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
    if (!data) {
      console.warn('[LoanRateChange] populateFormData called with no data');
      return;
    }
    
    console.log('[LoanRateChange] populateFormData received data:', data);
    console.log('[LoanRateChange] LoanAmount:', data.LoanAmount);
    console.log('[LoanRateChange] CurrentInterestRate:', data.CurrentInterestRate);
    console.log('[LoanRateChange] LoanStatus:', data.LoanStatus);
    
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
    
    console.log('[LoanRateChange] Form fields populated');
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

  /**
   * Switch to the "New Schedule" tab to display newly generated schedule
   */
  function switchToNewScheduleTab() {
    try {
      // Find the "New Schedule" tab button
      const newScheduleTab = document.querySelector('[data-lrc-tab="new-schedule"]');
      if (!newScheduleTab) {
        console.warn('[LoanRateChange] New Schedule tab button not found');
        return;
      }

      // Find all tab buttons and panels
      const tabButtons = Array.from(document.querySelectorAll('[data-lrc-tab]'));
      const panels = Array.from(document.querySelectorAll('[data-lrc-panel]'));

      if (tabButtons.length === 0 || panels.length === 0) {
        console.warn('[LoanRateChange] Tab elements not properly initialized');
        return;
      }

      // Update tab buttons - set new-schedule as active
      tabButtons.forEach(btn => {
        const isActive = btn.getAttribute('data-lrc-tab') === 'new-schedule';
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive);
      });

      // Update panels - show new-schedule, hide others
      panels.forEach(panel => {
        const isActive = panel.getAttribute('data-lrc-panel') === 'new-schedule';
        if (isActive) {
          panel.removeAttribute('hidden');
        } else {
          panel.setAttribute('hidden', '');
        }
      });

      console.log('[LoanRateChange] Switched to New Schedule tab');
    } catch (error) {
      console.error('[LoanRateChange] Error switching tabs:', error);
    }
  }

  function resetForm() {
    elements.branchID.value = '';
    elements.branchName.value = '';
    elements.clientID.value = '';
    elements.clientName.value = '';
    elements.accountID.value = '';
    elements.accountName.value = '';
    elements.loanSeries.value = '';
    elements.currentInterestRate.value = '';
    elements.proposedInterestRate.value = '';
    
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
    
    elements.currentScheduleBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-3">No schedule</td></tr>';
    elements.newScheduleBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-3">No schedule generated</td></tr>';
    
    loanRateChangeData = null;
    currentScheduleData = null;
    newScheduleData = null;
    currentMode = 'view';
    setFormMode('view');
  }

  // ========================================
  // PAGE INITIALIZATION
  // ========================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log(`[${PAGE_NAME}] Script loaded successfully`);

})(window);
