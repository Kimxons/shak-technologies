/**
 * Group Insurance Type Page
 * Manages Group Insurance Type form and interactions using service layer
 */
(async function() {
  const { ServiceLoader } = window;
  
  // Load dependencies
  await ServiceLoader.loadCore();
  await ServiceLoader.loadGroupInsuranceTypeService();
  await ServiceLoader.loadLookupService();
  await ServiceLoader.loadSearchService();
  
  // Get services
  const GroupInsuranceTypeService = window.GroupInsuranceTypeService;
  const LookupService = window.LookupService;
  const SearchService = window.SearchService;
  
  // DOM references
  const byId = (id) => document.getElementById(id);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  
  // Main form elements
  const mainForm = byId('group-insurance-type-form');
  const mainFields = {
    insuranceTypeId: byId('insuranceTypeId'),
    description: byId('description'),
    insuranceCategory: byId('insuranceCategory'),
    insuranceCompanyId: byId('insuranceCompanyId'),
    validFrom: byId('validFrom'),
    validTo: byId('validTo'),
    insuranceBenefit: byId('insuranceBenefit'),
    insuredAmount: byId('insuredAmount'),
    earlyRenewalDays: byId('earlyRenewalDays'),
    insuredPeriod: byId('insuredPeriod'),
    premiumFrequency: byId('premiumFrequency'),
    premium: byId('premium'),
    premiumInInstallments: byId('premiumInInstallments'),
    installmentFrequency: byId('installmentFrequency'),
    noOfInstallments: byId('noOfInstallments'),
    premiumId: byId('premiumId'),
    insuranceClassId: byId('insuranceClassId')
  };
  
  const auditFields = {
    createdBy: byId('createdBy'),
    modifiedBy: byId('modifiedBy'),
    supervisedBy: byId('supervisedBy'),
    createdOn: byId('createdOn'),
    modifiedOn: byId('modifiedOn'),
    supervisedOn: byId('supervisedOn')
  };
  
  // Claim Type elements
  const claimTypeFields = {
    insuranceClaimType: byId('insuranceClaimType'),
    fixedAmount: byId('fixedAmount'),
    remarks: byId('remarks')
  };
  
  const claimTypeAuditFields = {
    createdBy: byId('ctCreatedBy'),
    modifiedBy: byId('ctModifiedBy'),
    supervisedBy: byId('ctSupervisedBy'),
    createdOn: byId('ctCreatedOn'),
    modifiedOn: byId('ctModifiedOn'),
    supervisedOn: byId('ctSupervisedOn')
  };
  
  // Action buttons
  const viewBtn = byId('viewBtn');
  const addBtn = byId('addBtn');
  const editBtn = byId('editBtn');
  const deleteBtn = byId('deleteBtn');
  const saveBtn = byId('saveBtn');
  const cancelBtn = byId('cancelBtn');
  
  // Claim Type buttons
  const dataEntryBtn = byId('dataEntryBtn');
  const openClaimTypeBtn = byId('openClaimTypeBtn');
  const claimTypeOverlay = byId('claimTypeOverlay');
  const closeClaimTypeBtn = byId('closeClaimTypeBtn');
  const ctBackBtn = byId('ctBackBtn');
  const ctActionButtons = qsa('[data-ct-action]');
  
  // State
  let currentRecord = null;
  let currentMode = 'view';
  let ctCurrentRecord = null;
  let ctCurrentMode = 'view';
  let claimTypeUnlocked = false;
  
  // Session data (replace with actual session values)
  const sessionData = {
    BankID: "001",
    OurBranchID: "002",
    OperatorID: "web_portal"
  };
  
  /**
   * Initialize page
   */
  async function initPage() {
    try {
      // Populate dropdowns from system codes
      await populateDropdowns();
      
      // Set up event listeners
      setupEventListeners();
      
      // Initialize to view mode
      setMode('view');
      setCtMode('view');
      
      // Load initial data (optional)
      // await loadInsuranceType('SOME_ID');
      
      console.log('✅ Group Insurance Type page initialized');
    } catch (error) {
      console.error('Failed to initialize page:', error);
      alert('Failed to load page. Please refresh.');
    }
  }
  
  /**
   * Populate dropdowns with system codes
   */
  async function populateDropdowns() {
    try {
      // Populate Insurance Category if it's from system codes
      // const categories = await LookupService.getSystemCodeOptions("InsuranceCategoryID");
      // populateSelect(mainFields.insuranceCategory, categories);
      
      // Populate Premium Frequency if from system codes
      // const frequencies = await LookupService.getSystemCodeOptions("PremiumFrequencyID");
      // populateSelect(mainFields.premiumFrequency, frequencies);
      
      // Populate Installment Frequency if from system codes
      // const installmentFreqs = await LookupService.getSystemCodeOptions("InstallmentFrequencyID");
      // populateSelect(mainFields.installmentFrequency, installmentFreqs);
      
      // Populate Valid From/To (these might be from system codes)
      // const validityPeriods = await LookupService.getSystemCodeOptions("ValidityPeriodID");
      // populateSelect(mainFields.validFrom, validityPeriods);
      // populateSelect(mainFields.validTo, validityPeriods);
      
      console.log('✅ Dropdowns populated');
    } catch (error) {
      console.error('Failed to populate dropdowns:', error);
    }
  }
  
  /**
   * Populate a select element with options
   */
  function populateSelect(selectElement, options, includeEmpty = true) {
    if (!selectElement) return;
    
    let html = includeEmpty ? '<option value="">--Select--</option>' : '';
    options.forEach(opt => {
      html += `<option value="${opt.value}">${opt.label}</option>`;
    });
    selectElement.innerHTML = html;
  }
  
  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    // Mode buttons
    viewBtn?.addEventListener('click', () => setMode('view'));
    addBtn?.addEventListener('click', () => {
      clearForm();
      setMode('add');
      mainFields.insuranceTypeId?.focus();
    });
    editBtn?.addEventListener('click', () => {
      if (!currentRecord) {
        alert('Please load a record to edit');
        return;
      }
      setMode('edit');
      mainFields.description?.focus();
    });
    
    // Workflow buttons
    deleteBtn?.addEventListener('click', handleDelete);
    saveBtn?.addEventListener('click', handleSave);
    cancelBtn?.addEventListener('click', handleCancel);
    
    // Lookup buttons
    qsa('[data-lookup]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-lookup');
        handleLookup(key);
      });
    });
    
    // Claim Type
    dataEntryBtn?.addEventListener('click', () => {
      claimTypeUnlocked = true;
      if (openClaimTypeBtn) openClaimTypeBtn.hidden = false;
    });
    
    openClaimTypeBtn?.addEventListener('click', openClaimTypeWindow);
    closeClaimTypeBtn?.addEventListener('click', closeClaimTypeWindow);
    ctBackBtn?.addEventListener('click', closeClaimTypeWindow);
    
    claimTypeOverlay?.addEventListener('click', (e) => {
      if (e.target === claimTypeOverlay) closeClaimTypeWindow();
    });
    
    // Claim Type action buttons
    ctActionButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-ct-action');
        handleClaimTypeAction(action);
      });
    });
  }
  
  /**
   * Set form mode (view, add, edit)
   */
  function setMode(mode) {
    currentMode = mode;
    const readOnly = mode === 'view';
    
    // Set field states
    Object.entries(mainFields).forEach(([key, field]) => {
      if (!field) return;
      
      if (field.type === 'checkbox') {
        field.disabled = readOnly;
      } else if (field.tagName === 'SELECT') {
        field.disabled = readOnly;
      } else {
        field.readOnly = readOnly;
      }
    });
    
    // Audit fields always readonly
    Object.values(auditFields).forEach(field => {
      if (field) field.readOnly = true;
    });
    
    // Update active button
    [viewBtn, addBtn, editBtn].forEach(btn => {
      if (!btn) return;
      btn.classList.toggle('is-active', 
        (mode === 'view' && btn === viewBtn) ||
        (mode === 'add' && btn === addBtn) ||
        (mode === 'edit' && btn === editBtn)
      );
    });
  }
  
  /**
   * Load insurance type by ID
   */
  async function loadInsuranceType(insuranceTypeID, direction = 0) {
    try {
      const result = await GroupInsuranceTypeService.getGroupInsuranceType({
        BankID: sessionData.BankID,
        OurBranchID: sessionData.OurBranchID,
        InsuranceTypeID: insuranceTypeID,
        OperatorID: sessionData.OperatorID,
        Direction: direction
      });
      
      if (result.success && result.data && result.data.length > 0) {
        currentRecord = result.data[0];
        populateForm(currentRecord);
        setMode('view');
      } else {
        alert(result.message || 'Record not found');
      }
    } catch (error) {
      console.error('Error loading insurance type:', error);
      alert('Failed to load record. Please try again.');
    }
  }
  
  /**
   * Populate form with record data
   */
  function populateForm(record) {
    if (!record) return;
    
    mainFields.insuranceTypeId.value = record.InsuranceTypeID || '';
    mainFields.description.value = record.Description || '';
    mainFields.insuranceCategory.value = record.InsuranceCategory || '';
    mainFields.insuranceCompanyId.value = record.InsuranceCompanyID || '';
    mainFields.validFrom.value = record.ValidFrom || '';
    mainFields.validTo.value = record.ValidTo || '';
    mainFields.insuranceBenefit.value = record.InsuranceBenefit || '';
    mainFields.insuredAmount.value = record.InsuredAmount || '';
    mainFields.earlyRenewalDays.value = record.EarlyRenewalDays || '';
    mainFields.insuredPeriod.value = record.InsuredPeriod || '';
    mainFields.premiumFrequency.value = record.PremiumFrequency || '';
    mainFields.premium.value = record.Premium || '';
    mainFields.premiumInInstallments.checked = record.PremiumInInstallments || false;
    mainFields.installmentFrequency.value = record.InstallmentFrequency || '';
    mainFields.noOfInstallments.value = record.NoOfInstallments || '';
    mainFields.premiumId.value = record.PremiumID || '';
    mainFields.insuranceClassId.value = record.InsuranceClassID || '';
    
    // Audit fields
    auditFields.createdBy.value = record.CreatedBy || '';
    auditFields.createdOn.value = record.CreatedOn || '';
    auditFields.modifiedBy.value = record.ModifiedBy || '';
    auditFields.modifiedOn.value = record.ModifiedOn || '';
    auditFields.supervisedBy.value = record.SupervisedBy || '';
    auditFields.supervisedOn.value = record.SupervisedOn || '';
  }
  
  /**
   * Get form data
   */
  function getFormData() {
    return {
      BankID: sessionData.BankID,
      OurBranchID: sessionData.OurBranchID,
      OperatorID: sessionData.OperatorID,
      InsuranceTypeID: mainFields.insuranceTypeId.value,
      Description: mainFields.description.value,
      InsuranceCategory: mainFields.insuranceCategory.value,
      InsuranceCompanyID: mainFields.insuranceCompanyId.value,
      ValidFrom: mainFields.validFrom.value,
      ValidTo: mainFields.validTo.value,
      InsuranceBenefit: mainFields.insuranceBenefit.value,
      InsuredAmount: mainFields.insuredAmount.value,
      EarlyRenewalDays: mainFields.earlyRenewalDays.value,
      InsuredPeriod: mainFields.insuredPeriod.value,
      PremiumFrequency: mainFields.premiumFrequency.value,
      Premium: mainFields.premium.value,
      PremiumInInstallments: mainFields.premiumInInstallments.checked,
      InstallmentFrequency: mainFields.installmentFrequency.value,
      NoOfInstallments: mainFields.noOfInstallments.value,
      PremiumID: mainFields.premiumId.value,
      InsuranceClassID: mainFields.insuranceClassId.value
    };
  }
  
  /**
   * Clear form
   */
  function clearForm() {
    Object.values(mainFields).forEach(field => {
      if (!field) return;
      if (field.type === 'checkbox') {
        field.checked = false;
      } else if (field.tagName === 'SELECT') {
        field.selectedIndex = 0;
      } else {
        field.value = '';
      }
    });
    
    Object.values(auditFields).forEach(field => {
      if (field) field.value = '';
    });
    
    currentRecord = null;
  }
  
  /**
   * Handle save
   */
  async function handleSave() {
    try {
      // Validate required fields
      if (!mainFields.insuranceTypeId.value.trim()) {
        alert('Insurance Type ID is required');
        mainFields.insuranceTypeId.focus();
        return;
      }
      
      if (!mainFields.description.value.trim()) {
        alert('Description is required');
        mainFields.description.focus();
        return;
      }
      
      const formData = getFormData();
      const result = await GroupInsuranceTypeService.saveGroupInsuranceType(formData);
      
      if (result.success) {
        alert('Record saved successfully!');
        currentRecord = result.data;
        if (result.data) {
          populateForm(result.data);
        }
        setMode('view');
      } else {
        alert(result.message || 'Failed to save record');
      }
    } catch (error) {
      console.error('Error saving record:', error);
      alert('Failed to save record. Please try again.');
    }
  }
  
  /**
   * Handle delete
   */
  async function handleDelete() {
    if (!currentRecord) {
      alert('Please select a record to delete');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this insurance type?')) {
      return;
    }
    
    try {
      const result = await GroupInsuranceTypeService.deleteGroupInsuranceType({
        BankID: sessionData.BankID,
        OurBranchID: sessionData.OurBranchID,
        InsuranceTypeID: mainFields.insuranceTypeId.value,
        OperatorID: sessionData.OperatorID
      });
      
      if (result.success) {
        alert('Record deleted successfully!');
        clearForm();
        setMode('view');
      } else {
        alert(result.message || 'Failed to delete record');
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Failed to delete record. Please try again.');
    }
  }
  
  /**
   * Handle cancel
   */
  function handleCancel() {
    if (currentRecord) {
      populateForm(currentRecord);
    } else {
      clearForm();
    }
    setMode('view');
  }
  
  /**
   * Handle lookup (opens search modal - implement as needed)
   */
  function handleLookup(key) {
    // Implement lookup/search modal functionality
    console.log(`Lookup for: ${key}`);
    alert(`Lookup dialog for ${key} - implement search modal`);
  }
  
  // =============================================
  // CLAIM TYPE FUNCTIONS
  // =============================================
  
  /**
   * Set claim type mode
   */
  function setCtMode(mode) {
    ctCurrentMode = mode;
    const readOnly = mode === 'view';
    
    Object.values(claimTypeFields).forEach(field => {
      if (!field) return;
      
      if (field.tagName === 'SELECT') {
        field.disabled = readOnly;
      } else {
        field.readOnly = readOnly;
      }
    });
    
    Object.values(claimTypeAuditFields).forEach(field => {
      if (field) field.readOnly = true;
    });
  }
  
  /**
   * Open claim type window
   */
  function openClaimTypeWindow() {
    if (!claimTypeUnlocked || !claimTypeOverlay) return;
    claimTypeOverlay.hidden = false;
    setCtMode('view');
    clearCtForm();
  }
  
  /**
   * Close claim type window
   */
  function closeClaimTypeWindow() {
    if (!claimTypeOverlay) return;
    claimTypeOverlay.hidden = true;
  }
  
  /**
   * Clear claim type form
   */
  function clearCtForm() {
    Object.values(claimTypeFields).forEach(field => {
      if (!field) return;
      if (field.tagName === 'SELECT') {
        field.selectedIndex = 0;
      } else {
        field.value = '';
      }
    });
    
    Object.values(claimTypeAuditFields).forEach(field => {
      if (field) field.value = '';
    });
    
    ctCurrentRecord = null;
  }
  
  /**
   * Populate claim type form
   */
  function populateCtForm(record) {
    if (!record) return;
    
    claimTypeFields.insuranceClaimType.value = record.InsuranceClaimType || '';
    claimTypeFields.fixedAmount.value = record.FixedAmount || '';
    claimTypeFields.remarks.value = record.Remarks || '';
    
    claimTypeAuditFields.createdBy.value = record.CreatedBy || '';
    claimTypeAuditFields.createdOn.value = record.CreatedOn || '';
    claimTypeAuditFields.modifiedBy.value = record.ModifiedBy || '';
    claimTypeAuditFields.modifiedOn.value = record.ModifiedOn || '';
    claimTypeAuditFields.supervisedBy.value = record.SupervisedBy || '';
    claimTypeAuditFields.supervisedOn.value = record.SupervisedOn || '';
  }
  
  /**
   * Get claim type form data
   */
  function getCtFormData() {
    return {
      BankID: sessionData.BankID,
      OurBranchID: sessionData.OurBranchID,
      OperatorID: sessionData.OperatorID,
      InsuranceTypeID: mainFields.insuranceTypeId.value,
      InsuranceClaimType: claimTypeFields.insuranceClaimType.value,
      FixedAmount: claimTypeFields.fixedAmount.value,
      Remarks: claimTypeFields.remarks.value
    };
  }
  
  /**
   * Handle claim type actions
   */
  async function handleClaimTypeAction(action) {
    switch (action) {
      case 'view':
        setCtMode('view');
        if (ctCurrentRecord) populateCtForm(ctCurrentRecord);
        break;
        
      case 'add':
        clearCtForm();
        setCtMode('add');
        claimTypeFields.insuranceClaimType?.focus();
        break;
        
      case 'edit':
        if (!ctCurrentRecord) {
          alert('Please select a record to edit');
          return;
        }
        setCtMode('edit');
        claimTypeFields.fixedAmount?.focus();
        break;
        
      case 'delete':
        if (!ctCurrentRecord) {
          alert('Please select a record to delete');
          return;
        }
        if (confirm('Are you sure you want to delete this claim type?')) {
          await handleCtDelete();
        }
        break;
        
      case 'save':
        await handleCtSave();
        break;
        
      case 'cancel':
        if (ctCurrentRecord) {
          populateCtForm(ctCurrentRecord);
        } else {
          clearCtForm();
        }
        setCtMode('view');
        break;
    }
  }
  
  /**
   * Save claim type
   */
  async function handleCtSave() {
    try {
      const formData = getCtFormData();
      const result = await GroupInsuranceTypeService.saveClaimType(formData);
      
      if (result.success) {
        alert('Claim type saved successfully!');
        ctCurrentRecord = result.data;
        if (result.data) {
          populateCtForm(result.data);
        }
        setCtMode('view');
      } else {
        alert(result.message || 'Failed to save claim type');
      }
    } catch (error) {
      console.error('Error saving claim type:', error);
      alert('Failed to save claim type. Please try again.');
    }
  }
  
  /**
   * Delete claim type
   */
  async function handleCtDelete() {
    try {
      const result = await GroupInsuranceTypeService.deleteClaimType({
        BankID: sessionData.BankID,
        OurBranchID: sessionData.OurBranchID,
        // Add claim type ID field
        OperatorID: sessionData.OperatorID
      });
      
      if (result.success) {
        alert('Claim type deleted successfully!');
        clearCtForm();
        setCtMode('view');
      } else {
        alert(result.message || 'Failed to delete claim type');
      }
    } catch (error) {
      console.error('Error deleting claim type:', error);
      alert('Failed to delete claim type. Please try again.');
    }
  }
  
  // Initialize the page
  initPage();
})();
