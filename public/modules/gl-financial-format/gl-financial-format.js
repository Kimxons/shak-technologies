/**
 * GL Financial Format Page Logic
 * Handles Balance Sheet and Profit & Loss Statement formats
 */
(function(){
  'use strict';

  // State management
  let currentMode = 'view';
  let currentData = [];
  let selectedRecord = null;
  let GeneralLedgerService = null;

  // Session data
  const sessionData = {
    BankID: localStorage.getItem('BankID') || '00',
    OurBranchID: localStorage.getItem('BranchID') || '1201',
    OperatorID: localStorage.getItem('OperatorID') || 'SYS'
  };

  const qs = (sel) => document.querySelector(sel);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));
  const id = (x) => document.getElementById(x);
  const log = (m) => console.log('[GL Financial Format]', m);

  function toast(msg, type = 'info') {
    if(window.parent && window.parent.bootstrap){
      try {
        const toastEl = window.parent.document.getElementById('globalToast');
        if (toastEl) {
          toastEl.querySelector('.toast-body').textContent = msg;
          const t = new window.parent.bootstrap.Toast(toastEl);
          t.show();
          return;
        }
      } catch(e){}
    }
    console.log(`[GLFF ${type.toUpperCase()}]`, msg);
  }

  // Report type mapping
  const reportTypes = {
    'BS': 'Balance Sheet',
    'PL': 'Profit and Loss Statement'
  };

  /**
   * Initialize services
   */
  async function initServices() {
    try {
      log('Loading services...');
      
      if (!window.ServiceLoader) {
        console.error('ServiceLoader not found');
        toast('Failed to load ServiceLoader', 'error');
        return false;
      }

      await window.ServiceLoader.loadCore();
      await window.ServiceLoader.loadGeneralLedgerService();
      
      GeneralLedgerService = window.GeneralLedgerService;
      
      if (!GeneralLedgerService) {
        console.error('GeneralLedgerService not found');
        toast('Failed to load GeneralLedgerService', 'error');
        return false;
      }
      
      log('Services loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading services:', error);
      toast('Error loading services: ' + error.message, 'error');
      return false;
    }
  }

  /**
   * Populate report type dropdown
   */
  function populateReportTypeDropdown() {
    const dropdown = id('glReportType');
    if (!dropdown) return;

    dropdown.innerHTML = '<option value="">--Select--</option>';
    
    Object.entries(reportTypes).forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      dropdown.appendChild(option);
    });

    log('Report type dropdown populated');
  }

  /**
   * Load GL Financial Format data from API
   */
  async function loadFinancialFormatData() {
    try {
      const reportType = id('glReportType')?.value;
      console.log('🔍 loadFinancialFormatData called');
      console.log('📋 Selected report type:', reportType);

      if (!reportType) {
        toast('Please select a report type (Balance Sheet or Profit & Loss)', 'warning');
        id('glReportType')?.focus();
        return;
      }

      log(`Fetching ${reportTypes[reportType]} format...`);
      console.log('📤 Sending API request with data:', {
        BankID: sessionData.BankID,
        OurBranchID: sessionData.OurBranchID,
        ReportTypeID: reportType,
        OperatorID: sessionData.OperatorID
      });
      
      const result = await GeneralLedgerService.getGLFinancialFormat({
        BankID: sessionData.BankID,
        OurBranchID: sessionData.OurBranchID,
        ReportTypeID: reportType,
        OperatorID: sessionData.OperatorID
      });

      console.log('📥 API Response:', result);

      if (result.success && result.data) {
        console.log('✅ API call successful, processing data...');
        
        // Extract types from Details01 (Account Types: A, L, R, S)
        let typesData = [];
        if (result.data.Details01 && Array.isArray(result.data.Details01)) {
          typesData = result.data.Details01;
          console.log('📊 Types data (Details01):', typesData);
        }

        // Extract group types from Details02
        let groupTypesData = [];
        if (result.data.Details02 && Array.isArray(result.data.Details02)) {
          groupTypesData = result.data.Details02;
          console.log('📊 Group Types data (Details02):', groupTypesData);
        }

        // Extract sub types from Details03
        let subTypesData = [];
        if (result.data.Details03 && Array.isArray(result.data.Details03)) {
          subTypesData = result.data.Details03;
          console.log('📊 Sub Types data (Details03):', subTypesData);
        }

        // Extract account data from Details04
        let accountsData = [];
        if (result.data.Details04 && Array.isArray(result.data.Details04)) {
          accountsData = result.data.Details04;
          console.log('📊 Accounts data (Details04):', accountsData);
        }

        // Populate all sections
        if (typesData.length > 0) {
          populateTypes(typesData);
        } else {
          console.warn('⚠️ No types data found');
        }

        if (groupTypesData.length > 0) {
          populateGroupTypes(groupTypesData);
        }

        if (subTypesData.length > 0) {
          populateSubTypes(subTypesData);
        }

        if (accountsData.length > 0) {
          currentData = accountsData;
          populateTable(accountsData);
          toast(`Loaded ${accountsData.length} account(s)`, 'success');
          log('GL Financial Format loaded successfully');
        } else {
          currentData = [];
          populateTable([]);
          toast('Data loaded', 'success');
        }
      } else {
        console.error('❌ API call failed:', result.message);
        toast(result.message || 'Failed to load format data', 'error');
        hideTypes();
      }
    } catch (error) {
      console.error('❌ Error loading financial format:', error);
      toast('Error loading format data: ' + error.message, 'error');
      hideTypes();
    }
  }

  /**
   * Populate types table (A, L, R, S)
   */
  function populateTypes(types) {
    const typesSection = id('typesSection');
    const tbody = id('typesTableBody');
    
    if (!tbody) return;

    tbody.innerHTML = '';

    types.forEach((type, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="text-center">${index + 1}</td>
        <td>${type.SubCodeID || ''}</td>
        <td>${type.Description || ''}</td>
      `;
      tbody.appendChild(row);
    });

    if (typesSection) {
      typesSection.style.display = 'block';
    }
    
    log(`Populated ${types.length} types`);
  }

  /**
   * Populate group types table
   */
  function populateGroupTypes(groupTypes) {
    const section = id('groupSubTypeSection');
    const tbody = id('groupTypeTableBody');
    
    if (!tbody) return;

    tbody.innerHTML = '';

    groupTypes.forEach((item, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="text-center">${index + 1}</td>
        <td>${item.GLTypeGroupID || ''}</td>
        <td>${item.GLTypeGroup || ''}</td>
      `;
      tbody.appendChild(row);
    });

    if (section) {
      section.style.display = 'flex';
    }
    
    log(`Populated ${groupTypes.length} group types`);
  }

  /**
   * Populate sub types table
   */
  function populateSubTypes(subTypes) {
    const tbody = id('subTypeTableBody');
    
    if (!tbody) return;

    tbody.innerHTML = '';

    subTypes.forEach((item, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="text-center">${index + 1}</td>
        <td>${item.GLSubAccountTypeID || ''}</td>
        <td>${item.Description || ''}</td>
      `;
      tbody.appendChild(row);
    });
    
    log(`Populated ${subTypes.length} sub types`);
  }

  /**
   * Hide all sections
   */
  function hideAllSections() {
    const typesSection = id('typesSection');
    const groupSubSection = id('groupSubTypeSection');
    
    if (typesSection) typesSection.style.display = 'none';
    if (groupSubSection) groupSubSection.style.display = 'none';
  }

  /**
   * Populate table with format data
   */
  function populateTable(data) {
    const tbody = qs('table tbody');
    if (!tbody) return;

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" class="text-muted py-4">No records to display.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map((item, index) => `
      <tr data-index="${index}" style="cursor: pointer;">
        <td>${item.AccountID || ''}</td>
        <td>${item.Description || ''}</td>
      </tr>
    `).join('');

    log(`Table populated with ${data.length} records`);

    // Add click handlers to rows
    qsa('table tbody tr').forEach(row => {
      row.addEventListener('click', function() {
        const index = this.dataset.index;
        if (index !== undefined) {
          selectRow(parseInt(index));
        }
      });
    });
  }

  /**
   * Select a row
   */
  function selectRow(index) {
    qsa('table tbody tr').forEach(r => r.classList.remove('table-active'));
    const selectedRow = qs(`table tbody tr[data-index="${index}"]`);
    if (selectedRow) {
      selectedRow.classList.add('table-active');
    }

    selectedRecord = currentData[index];
    
    log('Selected record:' + JSON.stringify(selectedRecord));
  }

  /**
   * Handle View button
   */
  async function handleView() {
    console.log('🔘 View button clicked');
    
    if (!GeneralLedgerService) {
      log('Services not loaded yet, initializing...');
      const loaded = await initServices();
      if (!loaded) {
        toast('Failed to initialize services', 'error');
        return;
      }
    }
    
    console.log('✅ GeneralLedgerService available:', !!GeneralLedgerService);
    await loadFinancialFormatData();
  }

  /**
   * Handle Edit button
   */
  function handleEdit() {
    currentMode = 'edit';
    toast('Edit mode enabled', 'info');
  }

  /**
   * Handle Save button
   */
  function handleSave() {
    toast('Save functionality coming soon', 'info');
  }

  /**
   * Handle Cancel button
   */
  function handleCancel() {
    currentMode = 'view';
    toast('Cancelled', 'info');
  }

  /**
   * Handle Print button
   */
  function handlePrint() {
    toast('Print functionality coming soon', 'info');
  }

  /**
   * Initialize event listeners
   */
  async function init() {
    log('Initializing GL Financial Format...');
    
    // Populate dropdowns
    populateReportTypeDropdown();

    // Attach event listeners
    id('printBtn')?.addEventListener('click', handlePrint);
    id('viewBtn')?.addEventListener('click', handleView);
    id('editBtn')?.addEventListener('click', handleEdit);
    id('saveBtn')?.addEventListener('click', handleSave);
    id('cancelBtn')?.addEventListener('click', handleCancel);
    
    log('Event listeners attached');
    
    // Pre-load services
    await initServices();
  }

  window.addEventListener('DOMContentLoaded', init);
  
  log('Module loaded');
})();
