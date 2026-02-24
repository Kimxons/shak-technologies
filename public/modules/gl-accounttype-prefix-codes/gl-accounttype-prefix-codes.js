/**
 * GL AccountType Prefix Codes Page Logic
 * Handles UI interactions and data flow for GL AccountType Prefix Codes module
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
  const log = (m) => console.log('[GL AccountType Prefix Codes]', m);

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
    console.log(`[GAPTC ${type.toUpperCase()}]`, msg);
  }

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
   * Load GL Account Codes from API
   */
  async function loadGLAccountCodes() {
    try {
      log('Fetching GL Account Codes...');
      
      const result = await GeneralLedgerService.getGLAccountCodes({
        BankID: sessionData.BankID
      });

      console.log('API Response:', result);

      if (result.success && result.data) {
        let accountCodesData = null;
        
        if (result.data.Details && Array.isArray(result.data.Details)) {
          accountCodesData = result.data.Details;
          log(`Found data in Details: ${accountCodesData.length} records`);
        } else if (result.data.Details01 && Array.isArray(result.data.Details01)) {
          accountCodesData = result.data.Details01;
        } else if (result.data.Details02 && Array.isArray(result.data.Details02)) {
          accountCodesData = result.data.Details02;
        } else if (Array.isArray(result.data)) {
          accountCodesData = result.data;
        }

        if (accountCodesData && accountCodesData.length > 0) {
          currentData = accountCodesData;
          populateTable(accountCodesData);
          toast(`Loaded ${accountCodesData.length} account codes`, 'success');
          log('GL Account Codes loaded successfully');
        } else {
          currentData = [];
          populateTable([]);
          toast('No account codes found', 'warning');
        }
      } else {
        toast(result.message || 'Failed to load account codes', 'error');
      }
    } catch (error) {
      console.error('Error loading account codes:', error);
      toast('Error loading account codes: ' + error.message, 'error');
    }
  }

  /**
   * Populate table with account codes data
   */
  function populateTable(data) {
    const tbody = qs('table tbody');
    if (!tbody) return;

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-muted py-4">No records to display.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map((item, index) => `
      <tr data-index="${index}" style="cursor: pointer;">
        <td>${item.AccountTypeID || ''}</td>
        <td>${item.Description || ''}</td>
        <td>${item.AccountTypeCodeID || ''}</td>
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
   * Select a row and populate form
   */
  function selectRow(index) {
    qsa('table tbody tr').forEach(r => r.classList.remove('table-active'));
    const selectedRow = qs(`table tbody tr[data-index="${index}"]`);
    if (selectedRow) {
      selectedRow.classList.add('table-active');
    }

    selectedRecord = currentData[index];
    
    log('Selected record:' + JSON.stringify(selectedRecord));
    
    if (selectedRecord) {
      id('accountTypeID') && (id('accountTypeID').value = selectedRecord.AccountTypeID || '');
      id('description').value = selectedRecord.Description || '';
      id('code').value = selectedRecord.AccountTypeCodeID || '';
      
      id('createdBy').value = selectedRecord.CreatedBy || '';
      id('createdOn').value = selectedRecord.CreatedOn || '';
      id('modifiedBy').value = selectedRecord.ModifiedBy || '';
      id('modifiedOn').value = selectedRecord.ModifiedOn || '';
      
      log('Form populated with selected record');
    }
  }

  /**
   * Handle View button
   */
  async function handleView() {
    if (!GeneralLedgerService) {
      log('Services not loaded yet, initializing...');
      const loaded = await initServices();
      if (!loaded) {
        toast('Failed to initialize services', 'error');
        return;
      }
    }
    await loadGLAccountCodes();
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
    clearForm();
    toast('Cancelled', 'info');
  }

  /**
   * Clear form fields
   */
  function clearForm() {
    id('accountTypeID') && (id('accountTypeID').value = '');
    id('description') && (id('description').value = '');
    id('code') && (id('code').value = '');
    id('createdBy') && (id('createdBy').value = '');
    id('createdOn') && (id('createdOn').value = '');
    id('modifiedBy') && (id('modifiedBy').value = '');
    id('modifiedOn') && (id('modifiedOn').value = '');
    selectedRecord = null;
    qsa('table tbody tr').forEach(r => r.classList.remove('table-active'));
    log('Cleared');
  }

  /**
   * Initialize event listeners
   */
  async function init() {
    log('Initializing GL AccountType Prefix Codes...');
    
    id('alterBtn')?.addEventListener('click', () => toast('Alter mode enabled'));
    id('updateBtn')?.addEventListener('click', () => toast('Update saved'));
    id('clearBtn')?.addEventListener('click', clearForm);

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
