/**
 * GL Category Prefix Codes Page Logic
 * Handles UI interactions and data flow for GL Category Prefix Codes module
 */

(function(){
  'use strict';

  // State management
  let currentMode = 'view';
  let currentData = [];
  let selectedRecord = null;
  let GeneralLedgerService = null;
  let isEditing = false;
  let isAltering = false;

  // Session data
  const sessionData = {
    BankID: localStorage.getItem('BankID') || '00',
    OurBranchID: localStorage.getItem('BranchID') || '1201',
    OperatorID: localStorage.getItem('OperatorID') || 'SYS'
  };

  function qs(sel, ctx){ return (ctx||document).querySelector(sel); }
  function qsa(sel, ctx){ return Array.from((ctx||document).querySelectorAll(sel)); }

  function toast(msg, type = 'info'){
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
    console.log(`[GCPC ${type.toUpperCase()}]`, msg);
  }

  // Enable/disable code and description fields
  function setFormEditable(editable) {
    qs('#description').disabled = !editable;
    qs('#code').disabled = !editable;
  }

  // Enable/disable toolbar buttons
  function setToolbarState({ alter = false, update = false, save = false }) {
    qs('#alterBtn').disabled = !alter;
    qs('#updateBtn').disabled = !update;
    qs('#saveBtn').disabled = !save;
  }

  /**
   * Initialize services
   */
  async function initServices() {
    try {
      console.log('🔧 Loading services...');
      
      // Check if ServiceLoader exists
      if (!window.ServiceLoader) {
        console.error('❌ ServiceLoader not found');
        toast('Failed to load ServiceLoader', 'error');
        return false;
      }

      await window.ServiceLoader.loadCore();
      await window.ServiceLoader.loadGeneralLedgerService();
      
      GeneralLedgerService = window.GeneralLedgerService;
      
      if (!GeneralLedgerService) {
        console.error('❌ GeneralLedgerService not found');
        toast('Failed to load GeneralLedgerService', 'error');
        return false;
      }
      
      console.log('✅ Services loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Error loading services:', error);
      toast('Error loading services: ' + error.message, 'error');
      return false;
    }
  }

  /**
   * Load GL Category Codes from API
   */
  async function loadGLCategoryCodes() {
    try {
      console.log('📤 Fetching GL Category Codes...');
      
      const result = await GeneralLedgerService.getGLCategoryCodes({
        BankID: sessionData.BankID
      });

      console.log('📥 API Response:', result);

      if (result.success && result.data) {
        let categoriesData = null;
        
        // Check various response structures
        if (result.data.Details && Array.isArray(result.data.Details)) {
          categoriesData = result.data.Details;
          console.log('📦 Found data in Details:', categoriesData.length, 'records');
        } else if (result.data.Details01 && Array.isArray(result.data.Details01)) {
          categoriesData = result.data.Details01;
          console.log('📦 Found data in Details01:', categoriesData.length, 'records');
        } else if (result.data.Details02 && Array.isArray(result.data.Details02)) {
          categoriesData = result.data.Details02;
          console.log('📦 Found data in Details02:', categoriesData.length, 'records');
        } else if (Array.isArray(result.data)) {
          categoriesData = result.data;
          console.log('📦 Found data in array:', categoriesData.length, 'records');
        }

        if (categoriesData && categoriesData.length > 0) {
          currentData = categoriesData;
          populateTable(categoriesData);
          toast(`Loaded ${categoriesData.length} category codes`, 'success');
          console.log('✅ GL Category Codes loaded successfully');
        } else {
          currentData = [];
          populateTable([]);
          toast('No category codes found', 'warning');
        }
      } else {
        toast(result.message || 'Failed to load category codes', 'error');
      }
    } catch (error) {
      console.error('❌ Error loading category codes:', error);
      toast('Error loading category codes: ' + error.message, 'error');
    }
  }

  /**
   * Populate table with category codes data
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
        <td>${item.AccountTypeID || item.GLCategoryID || item.CategoryID || ''}</td>
        <td>${item.Description || item.CategoryDescription || ''}</td>
      </tr>
    `).join('');

    console.log(`📋 Table populated with ${data.length} records`);

    // Add click handlers to rows
    qsa('table tbody tr', tbody).forEach(row => {
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
    // Highlight selected row
    qsa('table tbody tr').forEach(r => r.classList.remove('table-active'));
    const selectedRow = qs(`table tbody tr[data-index="${index}"]`);
    if (selectedRow) {
      selectedRow.classList.add('table-active');
    }

    // Store selected record
    selectedRecord = currentData[index];
    
    console.log('📝 Selected record:', selectedRecord);
    
    // Populate form fields - use CategoryCodeID for the code field
    if (selectedRecord) {
      qs('#description').value = selectedRecord.Description || selectedRecord.CategoryDescription || '';
      qs('#code').value = selectedRecord.CategoryCodeID?.trim() || selectedRecord.PrefixCode || selectedRecord.AccountTypeID || '';
      // Populate audit fields
      qs('#createdBy').value = selectedRecord.CreatedBy || '';
      qs('#createdOn').value = selectedRecord.CreatedOn || '';
      qs('#modifiedBy').value = selectedRecord.ModifiedBy || '';
      qs('#modifiedOn').value = selectedRecord.ModifiedOn || '';
      // After selecting, fields are read-only, only Edit is enabled
      setFormEditable(false);
      setToolbarState({ alter: false, update: false, save: false });
      qs('#editBtn').disabled = false;
      isEditing = false;
      isAltering = false;
      console.log('✅ Form populated with selected record');
    }
  }

  /**
   * Handle View button
   */
  async function handleView() {
    if (!GeneralLedgerService) {
      console.log('⏳ Services not loaded yet, initializing...');
      const loaded = await initServices();
      if (!loaded) {
        toast('Failed to initialize services', 'error');
        return;
      }
    }
    await loadGLCategoryCodes();
  }

  /**
   * Handle Edit button
   */
  function handleEdit() {
    if (!selectedRecord) {
      toast('Select a record to edit', 'warning');
      return;
    }
    isEditing = true;
    isAltering = false;
    setToolbarState({ alter: true, update: false, save: false });
    setFormEditable(false); // Still read-only until Alter
    toast('Click Alter to start editing', 'info');
  }

  function handleAlter() {
    if (!isEditing) {
      toast('Click Edit first', 'warning');
      return;
    }
    isAltering = true;
    setFormEditable(true); // Now fields are editable
    setToolbarState({ alter: false, update: true, save: false });
    toast('Fields are now editable', 'info');
  }

  function handleUpdate() {
    if (!isEditing || !isAltering) {
      toast('Click Edit and Alter first', 'warning');
      return;
    }

    // Validate inputs
    const description = qs('#description').value.trim();
    const code = qs('#code').value.trim();

    if (!description || !code) {
      toast('Description and Code cannot be empty', 'warning');
      return;
    }

    // Update selectedRecord with form values
    if (selectedRecord) {
      selectedRecord.Description = description;
      selectedRecord.PrefixCode = code;
    }

    setFormEditable(false); // Lock fields after update
    setToolbarState({ alter: false, update: false, save: true });
    toast('Ready to save changes', 'success');
  }

  /**
   * Handle Save button
   */
  async function handleSave() {
    if (!selectedRecord) {
      toast('No record selected', 'warning');
      return;
    }

    // Get values from form
    const description = qs('#description').value.trim();
    const code = qs('#code').value.trim();

    if (!description || !code) {
      toast('Description and Code are required', 'warning');
      return;
    }

    // Get the category ID from various possible field names
    const categoryID = selectedRecord.GLCategoryID 
      || selectedRecord.CategoryID 
      || selectedRecord.AccountTypeID 
      || selectedRecord.CategoryCodeID 
      || '';

    console.log('📝 Selected Record:', selectedRecord);
    console.log('📝 Category ID:', categoryID);
    console.log('📝 New Code:', code);
    console.log('📝 New Description:', description);

    // Build XML - use AccountTypeID as the key, only update Description
    // The CategoryCodeID field appears to not be used (all are just spaces)
    const xml = `<Details>
  <Detail>
    <AccountTypeID>${selectedRecord.AccountTypeID || ''}</AccountTypeID>
    <Description>${description}</Description>
  </Detail>
</Details>`;

    const payload = {
      BankID: sessionData.BankID,
      DetailRecord: xml,
      OperatorID: sessionData.OperatorID
    };

    console.log('📤 Saving GL Category Code with XML:', xml);
    console.log('📤 Full Payload:', JSON.stringify(payload, null, 2));

    try {
      if (!GeneralLedgerService) {
        toast('Service not available. Please refresh the page.', 'error');
        return;
      }

      const result = await GeneralLedgerService.addEditGLCategoryPrefixCode(payload);
      
      console.log('📥 Save response:', result);

      if (result.success) {
        toast('Saved successfully', 'success');
        await loadGLCategoryCodes();
        clearForm();
        isEditing = false;
        isAltering = false;
        setToolbarState({ alter: false, update: false, save: false });
      } else {
        toast(result.message || 'Save failed', 'error');
        console.error('❌ Save failed:', result);
      }
    } catch (error) {
      console.error('❌ Error saving:', error);
      toast('Error saving: ' + error.message, 'error');
    }
  }

  /**
   * Handle Cancel button
   */
  function handleCancel() {
    currentMode = 'view';
    clearForm();
    setFormEditable(false);
    setToolbarState({ alter: false, update: false, save: false });
    isEditing = false;
    isAltering = false;
    toast('Cancelled', 'info');
  }

  /**
   * Clear form fields
   */
  function clearForm() {
    qsa('input[type="text"], input[type="search"], textarea').forEach(i => i.value = '');
    selectedRecord = null;
    qsa('table tbody tr').forEach(r => r.classList.remove('table-active'));
    setFormEditable(false);
    setToolbarState({ alter: false, update: false, save: false });
    isEditing = false;
    isAltering = false;
  }

  /**
   * Initialize toolbar and event listeners
   */
  async function initToolbar(){
    console.log('🚀 Initializing GL Category Prefix Codes...');
    const root = document;
    const on = (sel, evt, fn) => qsa(sel, root).forEach(el => el.addEventListener(evt, fn));

    on('[data-action="alter"]', 'click', handleAlter);
    on('[data-action="update"]', 'click', handleUpdate);
    on('[data-action="clear"]', 'click', clearForm);

    on('[data-action="view"]', 'click', handleView);
    on('[data-action="edit"]', 'click', handleEdit);
    on('[data-action="save"]', 'click', handleSave);
    on('[data-action="cancel"]', 'click', handleCancel);

    // On load, disable fields and toolbar except View
    setFormEditable(false);
    setToolbarState({ alter: false, update: false, save: false });
    qs('#editBtn').disabled = true;

    console.log('✅ Event listeners attached');
    // Pre-load services
    await initServices();
  }

  window.addEventListener('DOMContentLoaded', initToolbar);
  
  console.log('✅ GL Category Prefix Codes module loaded');
})();
