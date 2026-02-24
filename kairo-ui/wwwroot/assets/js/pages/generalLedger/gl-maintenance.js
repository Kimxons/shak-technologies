/**
 * GL Maintenance Page
 * Manages GL Maintenance form and interactions using service layer
 */
const GL_MAINTENANCE_JS_VERSION = '2026-01-29.1';
console.log(`🚀🚀🚀 GL Maintenance JavaScript file is loading... (v${GL_MAINTENANCE_JS_VERSION})`);

(async function() {
  console.log('🚀 IIFE starting...');
  const { ServiceLoader } = window;
  
  console.log('📦 Loading services...');
  // Load dependencies (keep page usable even if a service fails)
  try {
    await ServiceLoader.loadCore();
    await ServiceLoader.loadGeneralLedgerService();
    await ServiceLoader.loadLookupService();
    await ServiceLoader.loadSearchService();
    console.log('✅ Services loaded');
    console.log('✅ GeneralLedgerService available:', !!window.GeneralLedgerService);
    console.log('✅ LookupService available:', !!window.LookupService);
    console.log('✅ SearchService available:', !!window.SearchService);
  } catch (error) {
    console.error('❌ Service loading failed:', error);
  }
  
  // Get services (may be undefined if loading failed)
  const GeneralLedgerService = window.GeneralLedgerService;
  const LookupService = window.LookupService;
  const SearchService = window.SearchService;
  
  // DOM references
  const byId = (id) => document.getElementById(id);
  
  // Form fields
  const fields = {
    glAccountId: byId('glAccountIdField'),
    description: byId('descriptionField'),
    shortName: byId('shortNameField'),
    currencyId: byId('currencyIdField'),
    currencyDesc: byId('currencyDescField'),
    mainAccountId: byId('mainAccountIdField'),
    glType: byId('glTypeSelect'),
    glSubTypeGroup: byId('glSubTypeGroupSelect'),
    glSubType: byId('glSubTypeSelect'),
    glCategory: byId('glCategorySelect'),
    postingType: byId('postingTypeSelect'),
    glClass: byId('glClassSelect'),
    contraAccountId: byId('contraAccountIdField'),
    doRevaluation: byId('doRevaluationCheckbox'),
    remarks: byId('remarksField')
  };
  
  // Audit fields
  const auditFields = {
    closedBy: byId('closedByField'),
    closedOn: byId('closedOnField'),
    closedReason: byId('closedReasonField'),
    createdBy: byId('createdByField'),
    modifiedBy: byId('modifiedByField'),
    supervisedBy: byId('supervisedByField'),
    createdOn: byId('createdOnField'),
    modifiedOn: byId('modifiedOnField'),
    supervisedOn: byId('supervisedOnField')
  };
  
  // Action buttons
  const buttons = {
    close: byId('closeBtn'),
    view: byId('viewBtn'),
    add: byId('addBtn'),
    edit: byId('editBtn'),
    delete: byId('deleteBtn'),
    save: byId('saveBtn'),
    cancel: byId('cancelBtn')
  };
  
  // Search buttons
  const searchButtons = {
    glAccountId: byId('glAccountIdSearchBtn'),
    currencyId: byId('currencyIdSearchBtn'),
    mainAccountId: byId('mainAccountIdSearchBtn'),
    contraAccountId: byId('contraAccountIdSearchBtn')
  };
  
  // State
  let currentMode = 'view'; // view, add, edit
  let currentRecord = null;

  function prepareAddModeForAccountId(accountId) {
    const trimmed = String(accountId || '').trim();
    if (!trimmed) return;

    currentRecord = null;
    // Clear all fields EXCEPT the AccountID we're about to add
    Object.entries(fields).forEach(([key, field]) => {
      if (!field || key === 'glAccountId') return;
      if (field.type === 'checkbox') {
        field.checked = false;
      } else if (field.tagName === 'SELECT') {
        field.selectedIndex = 0;
      } else {
        field.value = '';
      }
    });
    
    // Ensure AccountID stays populated
    if (fields.glAccountId) fields.glAccountId.value = trimmed;
    
    // Keep page in view mode until user explicitly clicks Add
    setMode('view');
    if (buttons.add) {
      buttons.add.disabled = false;
      buttons.add.focus();
    }
  }
  
  // Session data (replace with actual session values)
  const sessionData = {
    BankID: window.Config?.BankID || localStorage.getItem('BankID') || "00",
    OurBranchID: window.Config?.BranchID || localStorage.getItem('BranchID') || "1201",
    OperatorID: window.Config?.OperatorID || localStorage.getItem('OperatorID') || "SYS"
  };
  
  console.log('🔧 Session Data:', sessionData);
  
  /**
   * Initialize page
   */
  async function initPage() {
    console.log('🚀 Initializing GL Maintenance page...');
    console.log('Session data:', sessionData);
    
    try {
      // Populate dropdowns from system codes/lookups
      if (LookupService) {
        await populateDropdowns();
      } else {
        console.warn('⚠️ LookupService not available; skipping dropdown population');
      }
      
      // Set up event listeners
      setupEventListeners();
      
      // Set initial mode
      setMode('view');
      
      console.log('✅ GL Maintenance page initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing GL Maintenance page:', error);
      alert('Failed to initialize page. Check console for details.');
    }
  }
  
  /**
   * Populate all dropdowns
   */
  async function populateDropdowns() {
    try {
      // GL Type (Account Type)
      const glTypes = await LookupService.getSystemCodeOptions("GLAccountTypeID");
      populateSelect(fields.glType, glTypes);
      
      // GL Category
      const categories = await LookupService.getSystemCodeOptions("GLCategoryID");
      populateSelect(fields.glCategory, categories);
      
      // Posting Type
      const postingTypes = await LookupService.getSystemCodeOptions("PostingTypeID");
      populateSelect(fields.postingType, postingTypes);
      
      // GL Class (using ClassID for Special Condition Class with ClassType='G')
      let glClasses = await LookupService.getSystemCodeOptions("ClassID");
      
      // Fallback to hardcoded data if API doesn't return GL Class options
      if (!glClasses || glClasses.length === 0) {
        console.warn('⚠️ GL Class API returned no data, using fallback');
        glClasses = [
          { value: "12344", label: "3443", order: 1 },
          { value: "GLA", label: "GL ACCOUNTS", order: 2 },
          { value: "GLBALL", label: "GL- Blocking All", order: 3 },
          { value: "GLBC", label: "GL- Blocking Credit", order: 4 },
          { value: "GLBD", label: "GL- Blocking Debit", order: 5 },
          { value: "GLBL", label: "GL- Blocking All", order: 6 },
          { value: "GLBLC", label: "GL Blocking Credit", order: 7 },
          { value: "GLBLD", label: "GL Blocking Debit", order: 8 },
          { value: "GLCLASS", label: "Kairo project GL Class", order: 9 },
          { value: "TEST02", label: "Updated Test Special Condition Class 2", order: 10 }
        ];
      }
      
      populateSelect(fields.glClass, glClasses);
      
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
    console.log('🔧 Setting up event listeners...');
    console.log('Search buttons:', searchButtons);
    
    // Action buttons
    buttons.close?.addEventListener('click', handleClose);
    buttons.view?.addEventListener('click', handleView);
    buttons.add?.addEventListener('click', () => {
      // Preserve AccountID if user already typed one (common after "record does not exist")
      const existingAccountId = String(fields.glAccountId?.value || '').trim();
      clearForm();
      if (existingAccountId && fields.glAccountId) fields.glAccountId.value = existingAccountId;
      setMode('add');
      if (buttons.save) buttons.save.disabled = false;
      (fields.description || fields.glAccountId)?.focus();
    });
    buttons.edit?.addEventListener('click', () => {
      if (!currentRecord) {
        alert('Please load a record to edit');
        return;
      }
      setMode('edit');
      fields.description?.focus();
    });
    buttons.delete?.addEventListener('click', handleDelete);
    buttons.save?.addEventListener('click', handleSave);
    buttons.cancel?.addEventListener('click', handleCancel);
    
    // Search buttons with logging
    if (searchButtons.glAccountId) {
      console.log('✅ GL Account ID search button found, adding click handler');
      searchButtons.glAccountId.addEventListener('click', (e) => {
        console.log('🔍 GL Account ID search button clicked!');
        e.preventDefault();
        openGLSearchModal();
      });
    } else {
      console.error('❌ GL Account ID search button NOT found!');
    }
    
    searchButtons.currencyId?.addEventListener('click', () => handleSearch('currencyId'));
    searchButtons.mainAccountId?.addEventListener('click', () => handleSearch('mainAccountId'));
    searchButtons.contraAccountId?.addEventListener('click', () => handleSearch('contraAccountId'));
    
    // Dropdown change handlers
    fields.glType?.addEventListener('change', handleGLTypeChange);
    fields.glSubTypeGroup?.addEventListener('change', handleGLSubTypeGroupChange);
    fields.doRevaluation?.addEventListener('change', handleDoRevaluationChange);
    
    // Currency ID auto-populate handler - trigger on input change
    fields.currencyId?.addEventListener('input', async function() {
      const currencyId = this.value.trim().toUpperCase();
      this.value = currencyId; // Auto-uppercase
      
      if (!currencyId) {
        if (fields.currencyDesc) fields.currencyDesc.value = '';
        return;
      }
      
      // Fetch currency description as user types
      await fetchCurrencyDescription(currencyId);
    });
    
    // Also trigger on blur
    fields.currencyId?.addEventListener('blur', async function() {
      const currencyId = this.value.trim().toUpperCase();
      this.value = currencyId;
      if (currencyId) {
        await fetchCurrencyDescription(currencyId);
      } else if (fields.currencyDesc) {
        fields.currencyDesc.value = '';
      }
    });
    
    // Also trigger on Enter key
    fields.currencyId?.addEventListener('keypress', async function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const currencyId = this.value.trim().toUpperCase();
        this.value = currencyId;
        if (currencyId) {
          await fetchCurrencyDescription(currencyId);
        }
      }
    });
  }
  
  /**
   * Fetch currency description by currency ID
   */
  async function fetchCurrencyDescription(currencyId) {
    try {
      console.log('🔍 Fetching currency description for:', currencyId);
      
      if (!fields.currencyDesc) {
        console.error('❌ currencyDescField not found in DOM');
        return;
      }
      
      // Hardcoded currency list (same as modal)
      const currencies = [
        { CurrencyID: "AED", Description: "UAE DIRHAM" },
        { CurrencyID: "AUD", Description: "AUSTRALIAN DOLLAR" },
        { CurrencyID: "CAD", Description: "CANADIAN DOLLAR" },
        { CurrencyID: "CHF", Description: "SWISS FRANC" },
        { CurrencyID: "CNY", Description: "CHINESE YUAN" },
        { CurrencyID: "DJF", Description: "DJIBOUTI FRANC" },
        { CurrencyID: "DKK", Description: "DANISH KRONER" },
        { CurrencyID: "ETB", Description: "BIRR" },
        { CurrencyID: "EUR", Description: "EURO" },
        { CurrencyID: "GBP", Description: "POUND STERLING" },
        { CurrencyID: "INR", Description: "INDIAN RUPEE" },
        { CurrencyID: "JPY", Description: "JAPANESE YEN" },
        { CurrencyID: "KES", Description: "KENYA SHILLING" },
        { CurrencyID: "KWD", Description: "KUWAITI DINAR" },
        { CurrencyID: "NOK", Description: "NORWIGIAN KRONER" },
        { CurrencyID: "SAR", Description: "SAUDI RIYAL" },
        { CurrencyID: "SDR", Description: "SDR" },
        { CurrencyID: "SEK", Description: "SWDISH KRONER" },
        { CurrencyID: "USD", Description: "USD DOLLAR" },
        { CurrencyID: "ZAR", Description: "SOUTH AFRICA RAND" }
      ];
      
      // Find matching currency (case-insensitive)
      const currency = currencies.find(c => 
        c.CurrencyID.toUpperCase() === currencyId.toUpperCase()
      );
      
      if (currency) {
        fields.currencyDesc.value = currency.Description;
        console.log('✅ Currency description populated:', currency.Description);
      } else {
        console.warn('⚠️ Currency not found:', currencyId);
        fields.currencyDesc.value = '';
      }
    } catch (error) {
      console.error('❌ Error fetching currency description:', error);
      if (fields.currencyDesc) fields.currencyDesc.value = '';
    }
  }
  
  /**
   * Set form mode (view, add, edit)
   */
  function setMode(mode) {
    currentMode = mode;
    const isReadOnly = mode === 'view';
    
    // Set field states
    Object.entries(fields).forEach(([key, field]) => {
      if (!field) return;
      
      // GL Account ID should always be editable for searching/viewing
      if (key === 'glAccountId') {
        field.disabled = false;
        field.readOnly = false;
        return;
      }
      
      // Other fields follow the mode
      if (field.type === 'checkbox') {
        field.disabled = isReadOnly;
      } else if (field.tagName === 'SELECT') {
        field.disabled = isReadOnly;
      } else {
        field.disabled = isReadOnly;
      }
    });
    
    // Audit fields always readonly
    Object.values(auditFields).forEach(field => {
      if (field) field.readOnly = true;
    });

    // Button state
    const hasRecord = !!currentRecord;
    if (buttons.add) buttons.add.disabled = false;
    if (buttons.save) buttons.save.disabled = (mode === 'view');
    if (buttons.edit) buttons.edit.disabled = !(mode === 'view' && hasRecord);
    if (buttons.delete) buttons.delete.disabled = !(mode === 'view' && hasRecord);
    
    // Update button styles (add 'active' class or similar if needed)
    console.log(`Mode set to: ${mode}`);
  }
  
  /**
   * Load GL Account by ID
   */
  async function loadGL(accountID, direction = 0) {
    try {
      const requestParams = {
        BankID: sessionData.BankID,
        OurBranchID: sessionData.OurBranchID,
        AccountID: accountID,
        OperatorID: sessionData.OperatorID,
        Direction: direction
      };
      
      console.log('📤 Sending request:', requestParams);
      
      const result = await window.GeneralLedgerService.getGL(requestParams);
      
      console.log('🔍 Full API Response:', JSON.stringify(result, null, 2));
      
      if (result.success && result.data) {
        let recordData = null;
        
        // GL data is in Details02 array
        if (result.data.Details02 && Array.isArray(result.data.Details02) && result.data.Details02.length > 0) {
          recordData = result.data.Details02[0];
          console.log('📦 Details02[0] (GL Account Data):', recordData);
        } else if (result.data.Details && Array.isArray(result.data.Details) && result.data.Details.length > 0) {
          recordData = result.data.Details[0];
          console.log('📦 Details[0]:', recordData);
          
          // Check if NewData contains JSON string with actual GL data
          if (recordData.NewData && typeof recordData.NewData === 'string' && recordData.NewData.trim() !== '') {
            try {
              const parsedData = JSON.parse(recordData.NewData);
              console.log('📝 Parsed NewData:', parsedData);
              recordData = parsedData;
            } catch (e) {
              console.log('⚠️ NewData is not valid JSON:', e);
            }
          }
        } else if (Array.isArray(result.data)) {
          recordData = result.data[0];
        } else {
          recordData = result.data;
        }
        
        console.log('✅ Final Record Data:', recordData);
        
        // Check if we have actual GL account fields
        const hasGLData = recordData && (
          recordData.AccountID || 
          recordData.Description || 
          recordData.GLAccountTypeID ||
          recordData.accountID ||
          recordData.description
        );
        
        if (hasGLData) {
          currentRecord = recordData;
          await populateForm(currentRecord);
          setMode('view');
        } else {
          console.error('❌ No GL account data in response');
          alert('Record does not exist. Click Add to create a new GL Account.');
          prepareAddModeForAccountId(accountID);
        }
      } else {
        console.error('❌ API Error:', result.message);
        alert(result.message || 'Record does not exist. Click Add to create a new GL Account.');
        prepareAddModeForAccountId(accountID);
      }
    } catch (error) {
      console.error('❌ Error loading GL account:', error);
      alert('Failed to load GL account. Click Add to create a new GL Account.');
      prepareAddModeForAccountId(accountID);
    }
  }
  
  /**
   * Populate form with record data
   */
  async function populateForm(record) {
    if (!record) return;

    const readField = (obj, keys, fallback = '') => {
      for (const key of keys) {
        const value = obj?.[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') return value;
      }
      return fallback;
    };

    const setSelectValue = (selectEl, value) => {
      if (!selectEl) return;
      const desired = value === undefined || value === null ? '' : String(value).trim();
      selectEl.value = desired;

      if (desired && String(selectEl.value).trim() !== desired) {
        const desiredLower = desired.toLowerCase();
        const options = Array.from(selectEl.options || []);
        const byValue = options.find(o => String(o.value || '').trim() === desired);
        const byText = options.find(o => String(o.textContent || '').trim().toLowerCase() === desiredLower);
        const match = byValue || byText;
        if (match) selectEl.value = match.value;
      }
    };

    const toBool = (value) => {
      if (value === true || value === false) return value;
      const s = String(value ?? '').trim().toLowerCase();
      return s === '1' || s === 'true' || s === 'y' || s === 'yes';
    };

    console.log('🔍 Populating form with record:', record);
    console.log('🔍 All record keys:', Object.keys(record || {}));

    // Base fields
    if (fields.glAccountId) fields.glAccountId.value = readField(record, ['AccountID', 'accountID', 'GLAccountID'], '');
    if (fields.description) fields.description.value = readField(record, ['Description', 'description', 'GLName', 'Name'], '');
    if (fields.shortName) fields.shortName.value = readField(record, ['ShortName', 'shortName'], '');
    if (fields.currencyId) fields.currencyId.value = readField(record, ['CurrencyID', 'currencyId'], '');
    if (fields.mainAccountId) fields.mainAccountId.value = readField(record, ['MainGLAccountID', 'MainAccountID', 'mainAccountId'], '');
    if (fields.contraAccountId) fields.contraAccountId.value = readField(record, ['ContraAccountID', 'contraAccountId'], '');
    if (fields.remarks) fields.remarks.value = readField(record, ['Remarks', 'remarks'], '');
    if (fields.doRevaluation) fields.doRevaluation.checked = toBool(readField(record, ['IsRevaluate', 'DoRevaluation', 'DoReValuation', 'isRevaluate'], false));

    // Non-dependent selects
    const glTypeValue = readField(record, ['GLAccountTypeID', 'GLType', 'GLTypeID'], '');
    console.log('🔍 GL Type value from record:', glTypeValue);
    setSelectValue(fields.glType, glTypeValue);

    const glCategoryValue = readField(record, ['GLCategoryID', 'GLCateGoryID', 'GLCateGoryId', 'GLCategory'], '');
    console.log('🔍 GL Category value from record:', glCategoryValue);
    setSelectValue(fields.glCategory, glCategoryValue);

    const postingTypeValue = readField(record, ['PostingTypeID', 'PostingTypeId', 'PostingType'], '');
    console.log('🔍 Posting Type value from record:', postingTypeValue);
    setSelectValue(fields.postingType, postingTypeValue);

    const glClassValue = readField(record, ['GLClassID', 'GLClassId', 'GLClass'], '');
    console.log('🔍 GL Class value from record:', glClassValue);
    setSelectValue(fields.glClass, glClassValue);

    // Dependent selects (need async population)
    const groupValue = readField(record, ['GLTypeGroupID', 'GLSubTypeGroupID', 'GLTypeGroup'], '');
    const subTypeValue = readField(record, ['GLSubAccountTypeID', 'GLSubTypeID', 'GLSubAccountTypeId'], '');

    try {
      if (glTypeValue) {
        await handleGLTypeChange();
      }
      setSelectValue(fields.glSubTypeGroup, groupValue);

      if (glTypeValue && groupValue) {
        await handleGLSubTypeGroupChange();
      }
      setSelectValue(fields.glSubType, subTypeValue);
    } catch (e) {
      console.warn('⚠️ Failed to populate dependent dropdowns:', e);
      setSelectValue(fields.glSubTypeGroup, groupValue);
      setSelectValue(fields.glSubType, subTypeValue);
    }

    // Audit fields
    if (auditFields.closedBy) auditFields.closedBy.value = readField(record, ['ClosedBy'], '');
    if (auditFields.closedOn) auditFields.closedOn.value = readField(record, ['ClosedDate', 'ClosedOn'], '');
    if (auditFields.closedReason) auditFields.closedReason.value = readField(record, ['ClosedReason'], '');
    if (auditFields.createdBy) auditFields.createdBy.value = readField(record, ['CreatedBy'], '');
    if (auditFields.createdOn) auditFields.createdOn.value = readField(record, ['CreatedOn'], '');
    if (auditFields.modifiedBy) auditFields.modifiedBy.value = readField(record, ['ModifiedBy'], '');
    if (auditFields.modifiedOn) auditFields.modifiedOn.value = readField(record, ['ModifiedOn'], '');
    if (auditFields.supervisedBy) auditFields.supervisedBy.value = readField(record, ['SupervisedBy'], '');
    if (auditFields.supervisedOn) auditFields.supervisedOn.value = readField(record, ['SupervisedOn'], '');

    console.log('✅ Form populated successfully');
  }
  
  /**
   * Get form data
   */
  function getFormData() {
    const formatRequestTime = (date = new Date()) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    const now = formatRequestTime(new Date());
    const isAddMode = currentMode === 'add';
    
    return {
      BankID: sessionData.BankID,
      AccountID: fields.glAccountId.value,
      Description: fields.description.value,
      ShortName: fields.shortName.value || '',
      CurrencyID: fields.currencyId.value,
      GLAccountTypeID: fields.glType.value,
      GLTypeGroupID: fields.glSubTypeGroup.value || '',
      GLSubAccountTypeID: fields.glSubType.value || '',
      GLCateGoryID: fields.glCategory.value,
      PostingTypeID: fields.postingType.value,
      GLClassID: fields.glClass.value || '',
      ContraAccountID: fields.contraAccountId.value.trim() || '',  // Empty string, not null
      MainGLAccountID: fields.mainAccountId.value.trim() || '',    // Empty string, not null
      IsRevaluate: fields.doRevaluation.checked ? 1 : 0,
      AccessLevel: 0,
      Remarks: fields.remarks.value || '',
      CreatedBy: 'SYS',
      CreatedOn: now,
      ModifiedBy: 'SYS',
      ModifiedOn: now,
      SupervisedBy: 'SYS',
      UpdateCount: isAddMode ? 1 : (currentRecord?.UpdateCount || 0),
      ModuleID: '8010'
    };
  }
  
  /**
   * Clear form
   */
  function clearForm() {
    Object.values(fields).forEach(field => {
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
   * Handle close
   */
  function handleClose() {
    if (confirm('Are you sure you want to close?')) {
      window.close();
    }
  }
  
  /**
   * Handle view - Load GL account data
   */
  async function handleView() {
    const accountID = fields.glAccountId.value.trim();
    
    if (!accountID) {
      alert('Please enter a GL Account ID first');
      fields.glAccountId.focus();
      return;
    }
    
    console.log('🔍 Viewing GL Account:', accountID);
    
    try {
      // Show loading state
      const originalText = buttons.view?.textContent;
      if (buttons.view) buttons.view.textContent = 'Loading...';
      
      const requestData = {
        BankID: sessionData.BankID,
        OurBranchID: sessionData.OurBranchID,
        AccountID: accountID,
        OperatorID: sessionData.OperatorID,
        Direction: 0 // 0 for exact match
      };
      
      console.log('📤 Request:', requestData);
      const result = await window.GeneralLedgerService.getGL(requestData);
      console.log('📥 Response:', result);
      console.log('📥 Response.data:', result.data);
      console.log('📥 Response.data.Details:', result.data?.Details);
      console.log('📥 Response.data.Details01:', result.data?.Details01);
      console.log('📥 Response.data.Details02:', result.data?.Details02);
      
      if (buttons.view) buttons.view.textContent = originalText;
      
      if (result.success && result.data) {
        // Check if we have data
        let record = null;
        
        // Check Details02 FIRST - this has the actual GL account data
        if (result.data.Details02 && result.data.Details02.length > 0) {
          record = result.data.Details02[0];
          console.log('📋 Record from Details02:', record);
        } else if (result.data.Details && result.data.Details.length > 0) {
          record = result.data.Details[0];
          console.log('📋 Record from Details:', record);
        } else if (result.data.Details01 && result.data.Details01.length > 0) {
          record = result.data.Details01[0];
          console.log('📋 Record from Details01:', record);
        } else if (Array.isArray(result.data) && result.data.length > 0) {
          record = result.data[0];
          console.log('📋 Record from data array:', record);
        } else if (typeof result.data === 'object' && !Array.isArray(result.data)) {
          record = result.data;
          console.log('📋 Record from data object:', record);
        }
        
        console.log('🔎 Final extracted record:', record);
        
        if (record) {
          console.log('🔎 Record keys:', Object.keys(record));
          console.log('🔎 Record.AccountID:', record.AccountID);
          console.log('🔎 Record.Description:', record.Description);
          console.log('🔎 Record.GLAccountTypeID:', record.GLAccountTypeID);
        }
        
        // Check if record actually has GL account data (not just a status/empty object)
        const hasActualGLData = record && (
          record.AccountID || record.accountID || 
          record.Description || record.description ||
          record.GLAccountTypeID || record.CurrencyID
        );
        
        console.log('🔎 hasActualGLData:', hasActualGLData);
        
        if (hasActualGLData) {
          // Record exists - populate all fields
          currentRecord = record;
          await populateForm(record);
          setMode('view');
          console.log('✅ Record loaded successfully');
        } else {
          // Record does not exist
          alert('Record does not exist. Click Add to create a new GL Account.');
          prepareAddModeForAccountId(accountID);
        }
      } else {
        // API returned no data or error
        alert('Record does not exist. Click Add to create a new GL Account.');
        prepareAddModeForAccountId(accountID);
      }
    } catch (error) {
      console.error('❌ Error viewing GL Account:', error);
      if (buttons.view) buttons.view.textContent = 'View';
      alert('Record does not exist. Click Add to create a new GL Account.');
      prepareAddModeForAccountId(accountID);
    }
  }
  
  /**
   * Handle save
   */
  async function handleSave() {
    try {
      // Validate required fields
      if (!fields.glAccountId.value.trim()) {
        alert('GL Account ID is required');
        fields.glAccountId.focus();
        return;
      }
      
      if (!fields.description.value.trim()) {
        alert('Description is required');
        fields.description.focus();
        return;
      }
      
      if (!fields.currencyId.value.trim()) {
        alert('Currency ID is required');
        fields.currencyId.focus();
        return;
      }
      
      if (!fields.glType.value || fields.glType.value === '--Select--' || fields.glType.value === '') {
        alert('GL Type is required');
        fields.glType.focus();
        return;
      }
      
      if (!fields.glSubTypeGroup.value || fields.glSubTypeGroup.value === '--Select--' || fields.glSubTypeGroup.value === '') {
        alert('GL Sub Type Group is required');
        fields.glSubTypeGroup.focus();
        return;
      }
      
      if (!fields.glSubType.value || fields.glSubType.value === '--Select--' || fields.glSubType.value === '') {
        alert('GL Sub Type is required');
        fields.glSubType.focus();
        return;
      }
      
      if (!fields.glCategory.value || fields.glCategory.value === '--Select--' || fields.glCategory.value === '') {
        alert('GL Category is required');
        fields.glCategory.focus();
        return;
      }
      
      // Check if this is a new record (Add mode)
      const isNewRecord = currentMode === 'add' || !currentRecord;
      
      if (isNewRecord) {
        // Show branch inclusion confirmation
        showBranchInclusionConfirmation();
      } else {
        // Existing record - save directly
        await performSave(false);
      }
    } catch (error) {
      console.error('Error saving GL account:', error);
      alert('Failed to save GL account. Please try again.');
    }
  }
  
  /**
   * Show branch inclusion confirmation modal
   */
  function showBranchInclusionConfirmation() {
    const accountNo = fields.glAccountId.value.trim();
    document.getElementById('branchAccountNo').textContent = accountNo;
    
    const modal = new bootstrap.Modal(document.getElementById('branchInclusionModal'));
    modal.show();
    
    // Handle Yes button
    document.getElementById('branchInclusionYesBtn').onclick = async function() {
      modal.hide();
      await performSave(true); // Include in branches
    };
    
    // Handle No button
    document.getElementById('branchInclusionNoBtn').onclick = async function() {
      modal.hide();
      await performSave(false); // Don't include in branches
    };
  }
  
  /**
   * Perform the actual save operation
   */
  async function performSave(includeInBranches) {
    try {
      const formData = getFormData();
      
      // Add CopyAllBranches parameter based on user's choice
      // 1 = Copy to all branches, 0 = Current branch only
      formData.CopyAllBranches = includeInBranches ? 1 : 0;
      
      console.log('💾 Saving GL account:', formData);
      console.log('🌍 Include in branches (CopyAllBranches):', formData.CopyAllBranches);
      
      const saveFn = window.GeneralLedgerService.addEditGL || window.GeneralLedgerService.saveGL;
      
      // Save with CopyAllBranches parameter
      const result = await saveFn.call(window.GeneralLedgerService, formData);
      
      if (result.success) {
        const message = includeInBranches 
          ? 'GL Account saved successfully and replicated to all branches!' 
          : 'GL Account saved successfully!';
        
        console.log('✅ Save successful with CopyAllBranches =', formData.CopyAllBranches);
        
        alert(message);
        currentRecord = result.data;
        if (result.data) {
          await populateForm(result.data);
        }
        setMode('view');
      } else {
        // Show backend validation error
        const errorMsg = result.message || 'Failed to save GL account';
        console.error('❌ Save failed:', errorMsg);
        
        // If error is about contra/main GL not existing in branches AND user wanted to copy to all branches
        // Automatically retry with CopyAllBranches = 0 (save to current branch only)
        if (includeInBranches && 
            (errorMsg.toLowerCase().includes('contra') || errorMsg.toLowerCase().includes('main')) && 
            errorMsg.toLowerCase().includes('branch')) {
          
          console.warn('⚠️ Referenced GL account not in all branches, retrying with CopyAllBranches=0...');
          
          if (confirm(errorMsg + '\n\nThe referenced GL account (Contra/Main) does not exist in all branches.\n\nDo you want to save this GL account to the CURRENT BRANCH ONLY instead?')) {
            // Retry with CopyAllBranches = 0
            await performSave(false);
          }
        } else {
          alert(errorMsg);
        }
      }
    } catch (error) {
      console.error('Error saving GL account:', error);
      alert('Failed to save GL account. Please try again.');
    }
  }
  
  /**
   * Get list of all branches
   */
  async function getAllBranches() {
    try {
      console.log('🏢 Fetching all branches...');
      
      // Try using GeneralLedgerService.getSearchResult for OurBranchID
      if (window.GeneralLedgerService && window.GeneralLedgerService.getSearchResult) {
        console.log('🔍 Using GeneralLedgerService.getSearchResult for branches...');
        
        const requestData = {
          TableID: 'OurBranchID',
          AdvFilterString: `OurBankID = '${sessionData.BankID || '00'}'`,
          WhereStmt: '',
          PrevOrNext: 0,
          RefID: '',
          OperatorID: sessionData.OperatorID || 'SYS',
          ModuleID: 8100,
          OurBranchID: sessionData.OurBranchID || '1201',
          SearchKey: '',
          LanguageID: 'en'
        };
        
        const result = await window.GeneralLedgerService.getSearchResult(requestData);
        console.log('🏢 Branch search response:', result);
        
        if (result.success && result.data) {
          let branches = [];
          
          // Handle different response structures
          if (Array.isArray(result.data)) {
            branches = result.data;
          } else if (result.data.Details && Array.isArray(result.data.Details)) {
            branches = result.data.Details;
          } else if (result.data.Details01 && Array.isArray(result.data.Details01)) {
            branches = result.data.Details01;
          } else if (result.data.Details02 && Array.isArray(result.data.Details02)) {
            branches = result.data.Details02;
          }
          
          if (branches.length > 0) {
            console.log(`✅ Found ${branches.length} branches via search:`, branches);
            return branches;
          }
        }
      }
      
      console.warn('⚠️ API branch fetch failed or returned no results, using hardcoded branch list');
      
      // Hardcoded fallback - common branch list
      const fallbackBranches = [
        {"OurBranchID":"0101","BranchName":"Head Office"},
        {"OurBranchID":"0102","BranchName":"Head Office IFRS"},
        {"OurBranchID":"0103","BranchName":"Regional Office"},
        {"OurBranchID":"0201","BranchName":"Fenoteselam District"},
        {"OurBranchID":"0301","BranchName":"Bahir Dar District"},
        {"OurBranchID":"0401","BranchName":"Debre Markos District"},
        {"OurBranchID":"0501","BranchName":"Gondar District"},
        {"OurBranchID":"0601","BranchName":"Dessie District"},
        {"OurBranchID":"0701","BranchName":"Mekelle District"},
        {"OurBranchID":"0801","BranchName":"Adama District"},
        {"OurBranchID":"0901","BranchName":"Hawassa District"},
        {"OurBranchID":"1001","BranchName":"Jimma District"},
        {"OurBranchID":"1101","BranchName":"Nekemte District"},
        {"OurBranchID":"1201","BranchName":"Addis Ababa District"}
      ];
      
      console.log(`✅ Using ${fallbackBranches.length} hardcoded branches as fallback`);
      return fallbackBranches;
      
    } catch (error) {
      console.error('❌ Error getting branch list:', error);
      
      // Return minimal fallback on error
      return [
        {"OurBranchID":"0101","BranchName":"Head Office"},
        {"OurBranchID":"1201","BranchName":"Addis Ababa District"}
      ];
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
    
    if (!confirm('Are you sure you want to delete this GL account?')) {
      return;
    }
    
    try {
      const result = await window.GeneralLedgerService.deleteGL({
        BankID: sessionData.BankID,
        AccountID: fields.glAccountId.value,
        NewRecord: currentRecord?.UpdateCount || 0
      });
      
      if (result.success) {
        alert('GL Account deleted successfully!');
        clearForm();
        setMode('view');
      } else {
        alert(result.message || 'Failed to delete GL account');
      }
    } catch (error) {
      console.error('Error deleting GL account:', error);
      alert('Failed to delete GL account. Please try again.');
    }
  }
  
  /**
   * Handle cancel
   */
  async function handleCancel() {
    clearForm();
    currentRecord = null;
    setMode('view');
  }
  
  /**
   * Handle search/lookup
   */
  async function handleSearch(fieldType) {
    console.log('🔍 handleSearch called with fieldType:', fieldType);
    
    switch (fieldType) {
      case 'glAccountId':
        console.log('🔍 Opening GL Account search modal...');
        openGLSearchModal();
        break;
      case 'currencyId':
        console.log('🔍 Currency search');
        // Open currency search modal/form directly
        openCurrencySearchModal();
        break;
      case 'mainAccountId':
        console.log('🔍 Main account search (not implemented yet)');
        // TODO: Implement main account search modal
        const mainAccValue = prompt('Enter Main Account ID to search:');
        if (mainAccValue) fields.mainAccountId.value = mainAccValue;
        break;
      case 'contraAccountId':
        console.log('🔍 Contra account search (not implemented yet)');
        // TODO: Implement contra account search modal
        const contraValue = prompt('Enter Contra Account ID to search:');
        if (contraValue) fields.contraAccountId.value = contraValue;
        break;
      default:
        console.warn('Unknown field type:', fieldType);
    }
  }
  
  /**
   * Open GL Search Modal
   */
  function openGLSearchModal() {
    console.log('🚀 Opening GL Search Modal...');
    
    const modalElement = byId('glSearchModal');
    if (!modalElement) {
      alert('ERROR: Search modal not found in HTML');
      return;
    }
    
    if (typeof bootstrap === 'undefined') {
      alert('ERROR: Bootstrap not loaded');
      return;
    }
    
    // Use getOrCreateInstance to avoid creating duplicate modal instances
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.show();
    
    // Load data immediately
    setTimeout(() => {
      performGLSearch();
    }, 300);
  }
  
  /**
   * Open Currency Search Modal
   */
  function openCurrencySearchModal() {
    console.log('🚀 Opening Currency Search Modal...');
    
    const modalElement = byId('currencySearchModal');
    if (!modalElement) {
      alert('ERROR: Currency search modal not found in HTML');
      return;
    }
    
    if (typeof bootstrap === 'undefined') {
      alert('ERROR: Bootstrap not loaded');
      return;
    }
    
    // Use getOrCreateInstance to avoid creating duplicate modal instances
    // This prevents the backdrop from persisting after the modal is closed
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.show();
  }
  
  /**
   * Clear GL Search Results
   */
  function clearGLSearchResults() {
    const searchFields = ['glSearchAccountId', 'glSearchDesc', 'glSearchShortName', 'glSearchTypeId'];
    searchFields.forEach(fieldId => {
      const field = byId(fieldId);
      if (field) field.value = '';
    });
    
    const tbody = byId('glSearchTable')?.querySelector('tbody');
    if (tbody) tbody.innerHTML = '';
  }
  
  /**
   * Perform GL Search
   */
  async function performGLSearch() {
    console.log('🔍 ===== STARTING GL SEARCH =====');
    console.log('🔍 Checking window.GeneralLedgerService:', window.GeneralLedgerService);
    console.log('🔍 ServiceLoader available:', !!window.ServiceLoader);

    const escapeSqlLiteral = (value) => String(value ?? '').replace(/'/g, "''");
    
    const accountId = byId('glSearchAccountId')?.value.trim() || '';
    const desc = byId('glSearchDesc')?.value.trim() || '';
    console.log('🔍 Search inputs:', { accountId, desc });
    
    const tbody = byId('glSearchTable')?.querySelector('tbody');
    if (!tbody) {
      console.error('❌ Table body not found!');
      alert('Table element not found. Check the HTML structure.');
      return;
    }
    
    console.log('✅ Table body found');
    
    // Show loading message
    tbody.innerHTML = '<tr><td colspan="2" class="text-center"><em>Loading...</em></td></tr>';
    
    // Check if service is available (always check window.GeneralLedgerService to get latest value)
    if (!window.GeneralLedgerService) {
      console.error('❌ GeneralLedgerService is not available!');
      console.log('🔄 Attempting to load service now...');
      
      // Try to load the service now as a fallback
      try {
        if (window.ServiceLoader) {
          await window.ServiceLoader.loadGeneralLedgerService();
          console.log('✅ Service loaded successfully on retry');
        }
      } catch (err) {
        console.error('❌ Failed to load service:', err);
      }
      
      // Check again
      if (!window.GeneralLedgerService) {
        tbody.innerHTML = '<tr><td colspan="2" class="text-danger text-center">Service not loaded. Please refresh the page.</td></tr>';
        return;
      }
    }
    
    console.log('✅ GeneralLedgerService is available');
    
    if (!window.GeneralLedgerService.getSearchResult) {
      console.error('❌ getSearchResult method not found!');
      tbody.innerHTML = '<tr><td colspan="2" class="text-danger text-center">Search method not available.</td></tr>';
      return;
    }
    
    console.log('✅ getSearchResult method exists');
    
    // Build filter string
    // Required base filter per contract: BankID = '00' (or current session BankID)
    const advFilter = [`BankID = '${escapeSqlLiteral(sessionData.BankID)}'`];
    if (accountId) {
      const accountIdType = byId('glSearchAccountIdType')?.value || 'Like';
      const operator = accountIdType === 'Like' ? 'LIKE' : '=';
      const rawValue = accountIdType === 'Like' ? `%${accountId}%` : accountId;
      advFilter.push(`AccountID ${operator} '${escapeSqlLiteral(rawValue)}'`);
    }
    if (desc) {
      const descType = byId('glSearchDescType')?.value || 'Like';
      const operator = descType === 'Like' ? 'LIKE' : '=';
      const rawValue = descType === 'Like' ? `%${desc}%` : desc;
      advFilter.push(`Description ${operator} '${escapeSqlLiteral(rawValue)}'`);
    }
    const requestData = {
      TableID: 'GeneralLedgerID',
      AdvFilterString: advFilter.join(' AND '),
      WhereStmt: '',
      PrevOrNext: 0,
      RefID: null,
      OperatorID: sessionData.OperatorID,
      ModuleID: 8010,
      OurBranchID: sessionData.OurBranchID,
      // Many OldAPI samples explicitly pass SearchKey=NULL
      SearchKey: null,
      LanguageID: 'en'
    };
    
    console.log('📤 Request data:', JSON.stringify(requestData, null, 2));
    
    try {
      const searchFn = SearchService?.searchClients
        ? SearchService.searchClients.bind(SearchService)
        : window.GeneralLedgerService.getSearchResult.bind(window.GeneralLedgerService);

      console.log('🌐 Calling API...', SearchService?.searchClients ? '(via SearchService)' : '(via GeneralLedgerService)');
      const result = await searchFn(requestData);
      console.log('📥 API Response received');
      console.log('📥 Full result:', JSON.stringify(result, null, 2));
      console.log('📥 Result type:', typeof result);
      console.log('📥 Result keys:', result ? Object.keys(result) : 'null');
      
      tbody.innerHTML = '';
      
      if (result) {
        if (result.success === false) {
          const msg = String(result.message || result.code || 'Search failed');
          console.warn('⚠️ Search API returned failure:', msg, result);
          tbody.innerHTML = `<tr><td colspan="2" class="text-danger text-center">Search failed: ${msg}</td></tr>`;
          return;
        }

        let data = null;
        
        // Try multiple possible data locations
        if (result.data) {
          console.log('📊 Found result.data');
          console.log('📊 result.data type:', typeof result.data);
          console.log('📊 result.data:', JSON.stringify(result.data, null, 2));
          
          if (result.data.Details01 && Array.isArray(result.data.Details01) && result.data.Details01.length > 0) {
            data = result.data.Details01;
            console.log('✅ Using Details01, length:', data.length);
          } else if (result.data.Details && Array.isArray(result.data.Details)) {
            data = result.data.Details;
            console.log('✅ Using Details, length:', data.length);
          } else if (Array.isArray(result.data)) {
            data = result.data;
            console.log('✅ Using data array directly, length:', data.length);
          } else if (typeof result.data === 'object' && result.data !== null) {
            // Single object response
            data = [result.data];
            console.log('✅ Using data as single object');
          }
        } else if (result.Details01 && Array.isArray(result.Details01)) {
          data = result.Details01;
          console.log('✅ Using result.Details01, length:', data.length);
        } else if (result.Details && Array.isArray(result.Details)) {
          data = result.Details;
          console.log('✅ Using result.Details, length:', data.length);
        } else if (Array.isArray(result)) {
          data = result;
          console.log('✅ Using result as array, length:', data.length);
        }
        
        // Handle common OldAPI wrapper shape: [{ ResponseCode, ResponseMessage, Details: [...] }]
        if (Array.isArray(data)) {
          const first = data[0];
          if (data.length === 1 && first && typeof first === 'object') {
            if (Array.isArray(first.Details01)) {
              console.log('✅ Unwrapped nested Details01 from first status wrapper');
              data = first.Details01;
            } else if (Array.isArray(first.Details)) {
              console.log('✅ Unwrapped nested Details from first status wrapper');
              data = first.Details;
            }
          }

          if (Array.isArray(data)) {
            const wrapper = data.find(r => r && typeof r === 'object' && r.ResponseCode !== undefined && (Array.isArray(r.Details) || Array.isArray(r.Details01)));
            if (wrapper) {
              if (Array.isArray(wrapper.Details01)) {
                console.log('✅ Unwrapped Details01 from status wrapper row');
                data = wrapper.Details01;
              } else if (Array.isArray(wrapper.Details)) {
                console.log('✅ Unwrapped Details from status wrapper row');
                data = wrapper.Details;
              }
            }
          }
        }

        console.log('📊 Final data to render:', data);
        
        if (data && data.length > 0) {
          console.log('📊 First row sample:', JSON.stringify(data[0], null, 2));
          data.forEach((row, idx) => {
            const accountID = row.AccountID || row.accountID || row.ACCOUNTID || row.GLAccountID || row.GeneralLedgerID || '';
            const description = row.Description || row.description || row.DESCRIPTION || row.GLName || row.Name || '';
            
            console.log(`Row ${idx}:`, { accountID, description });
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>${accountID}</td>
              <td>${description}</td>
            `;
            tr.style.cursor = 'pointer';
            tr.addEventListener('click', function() {
              tbody.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
              tr.classList.add('table-active');
            });

            tr.addEventListener('dblclick', function() {
              tbody.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
              tr.classList.add('table-active');
              applyGLSelection(accountID, description);
            });
            tbody.appendChild(tr);
          });
          console.log(`✅ Successfully rendered ${data.length} GL accounts`);
        } else {
          console.warn('⚠️ No data to display');
          const msg = result?.message ? `No results. (${String(result.message)})` : 'No results found.';
          tbody.innerHTML = `<tr><td colspan="2" class="text-muted text-center">${msg}</td></tr>`;
        }
      } else {
        console.error('❌ Result is null or undefined');
        tbody.innerHTML = '<tr><td colspan="2" class="text-warning text-center">No response from server. Check browser console.</td></tr>';
      }
    } catch (error) {
      console.error('❌ ERROR in performGLSearch:');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Full error:', error);
      tbody.innerHTML = `<tr><td colspan="2" class="text-danger text-center">Error: ${error.message}<br/>Check browser console (F12) for details.</td></tr>`;
    }
    
    console.log('🔍 ===== GL SEARCH COMPLETED =====');
  }
  
  /**
   * Select GL from Search Modal
   */
  function applyGLSelection(accountId, description) {
    const resolvedAccountId = String(accountId || '').trim();
    if (!resolvedAccountId) {
      alert('Invalid selection: missing Account ID');
      return;
    }

    if (fields.glAccountId) fields.glAccountId.value = resolvedAccountId;
    if (fields.description && description !== undefined) fields.description.value = String(description || '');

    // Load full GL record (same behavior as View)
    loadGL(resolvedAccountId);

    // Close modal
    const modalElement = byId('glSearchModal');
    const modal = modalElement ? bootstrap.Modal.getInstance(modalElement) : null;
    if (modal) modal.hide();
  }

  function selectGLFromSearch() {
    const tbody = byId('glSearchTable')?.querySelector('tbody');
    const selected = tbody?.querySelector('tr.table-active');
    
    if (selected) {
      const accountId = selected.children[0]?.textContent || '';
      const description = selected.children[1]?.textContent || '';

      applyGLSelection(accountId, description);
    } else {
      alert('Please select a record from the list.');
    }
  }
  
  /**
   * Handle GL Type change
   */
  async function handleGLTypeChange() {
    const glType = fields.glType.value;
    if (!glType || glType === '--Select--') {
      // Clear sub type group dropdown
      fields.glSubTypeGroup.innerHTML = '<option value="">--Select--</option>';
      fields.glSubType.innerHTML = '<option value="">--Select--</option>';
      return;
    }
    
    try {
      const result = await window.GeneralLedgerService.getGLTypeGroup({
        BankID: sessionData.BankID,
        OurBranchID: sessionData.OurBranchID,
        GLAccountTypeID: glType,
        OperatorID: sessionData.OperatorID
      });
      
      if (result.success && result.data) {
        const options = result.data.map(item => ({
          value: item.GLTypeGroupID,
          label: item.GLTypeGroupName || item.GLTypeGroupID
        }));
        populateSelect(fields.glSubTypeGroup, options);
      }
    } catch (error) {
      console.error('Error loading GL type groups:', error);
    }
  }
  
  /**
   * Handle GL Sub Type Group change
   */
  async function handleGLSubTypeGroupChange() {
    const glType = fields.glType.value;
    const glSubTypeGroup = fields.glSubTypeGroup.value;
    
    console.log('🔄 GL Sub Type Group changed:', { glType, glSubTypeGroup });
    
    if (!glType || !glSubTypeGroup || glSubTypeGroup === '--Select--') {
      fields.glSubType.innerHTML = '<option value="">--Select--</option>';
      return;
    }
    
    try {
      const requestData = {
        BankID: sessionData.BankID,
        OurBranchID: sessionData.OurBranchID,
        GLAccountTypeID: glType,
        GLTypeGroupID: glSubTypeGroup,
        OperatorID: sessionData.OperatorID
      };
      
      console.log('📤 Fetching GL Sub Types with:', requestData);
      const result = await window.GeneralLedgerService.getGLSubAccountType(requestData);
      console.log('📥 GL Sub Type API result:', result);
      
      if (result.success && result.data) {
        let dataArray = result.data;
        console.log('📊 Raw data:', dataArray);
        
        // Handle different response structures - prefer Details01 over Details
        if (dataArray.Details01 && Array.isArray(dataArray.Details01) && dataArray.Details01.length > 0) {
          console.log('✅ Using Details01 array');
          dataArray = dataArray.Details01;
        } else if (dataArray.Details && Array.isArray(dataArray.Details)) {
          console.log('✅ Using Details array');
          dataArray = dataArray.Details;
        } else if (!Array.isArray(dataArray)) {
          console.log('⚠️ Converting to array');
          dataArray = [dataArray];
        }
        
        console.log('📊 Processed data array:', dataArray);
        console.log('📊 Array length:', dataArray.length);
        if (dataArray.length > 0) {
          console.log('📊 First item:', dataArray[0]);
          console.log('📊 First item keys:', Object.keys(dataArray[0]));
        }
        
        const options = dataArray.map(item => {
          // Based on the provided response structure: SubCodeID and CodeDescription
          const value = item.SubCodeID || item.GLSubAccountTypeID || item.GLSubTypeID || item.SubTypeID || item.CodeID;
          const label = item.CodeDescription || item.GLSubAccountTypeName || item.GLSubTypeName || item.Description || value;
          console.log('Mapping item:', { item, value, label });
          return { value, label };
        });
        
        console.log('📊 Mapped options:', options);
        populateSelect(fields.glSubType, options);
        console.log('✅ GL Sub Type dropdown populated with', options.length, 'options');
      } else {
        console.error('❌ API returned no data or failed');
        fields.glSubType.innerHTML = '<option value="">--Select--</option>';
      }
    } catch (error) {
      console.error('❌ Error loading GL sub account types:', error);
      fields.glSubType.innerHTML = '<option value="">--Select--</option>';
    }
  }
  
  /**
   * Handle Do Revaluation checkbox change
   */
  function handleDoRevaluationChange() {
    const isChecked = fields.doRevaluation.checked;
    console.log('Do Revaluation:', isChecked);
    // Implement any additional logic needed
  }
  
  /**
   * Setup GL Search Modal event listeners
   */
  function setupGLSearchModalListeners() {
    // Search button
    const glSearchBtn = byId('glSearchBtn');
    if (glSearchBtn) {
      glSearchBtn.addEventListener('click', performGLSearch);
    }
    
    // OK button
    const glSearchOkBtn = byId('glSearchOkBtn');
    if (glSearchOkBtn) {
      glSearchOkBtn.addEventListener('click', selectGLFromSearch);
    }
    
    // Enter key in search inputs
    const searchInputIds = ['glSearchAccountId', 'glSearchDesc', 'glSearchShortName', 'glSearchTypeId'];
    searchInputIds.forEach(inputId => {
      const input = byId(inputId);
      if (input) {
        input.addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            performGLSearch();
          }
        });
      }
    });
  }
  
  // Initialize the page
  initPage();
  
  // Setup GL Search Modal listeners
  setupGLSearchModalListeners();
})();
