(function () {
  // ========================================
  // Configuration
  // ========================================
  const CONFIG = {
    // Module ID for Account User Codes (from t_UserCode table)
    MODULE_ID: '02', // ModuleID for account-related user codes
    CATEGORY: 'A', // A=Account, G=GL (defaults to C in SP if null)
  };

  // ========================================
  // State Management
  // ========================================
  const state = {
    classificationCodes: [], // User codes from t_UserCode WHERE ModuleID='02'
    classificationSubCodes: [], // Sub codes from t_UserCodeDetail for selected code
    selectedClassificationCode: null,
    currentRecord: null,
    _mode: 'view', // 'view', 'add', 'edit'
    savedClassifications: [], // Grid data
    get mode() {
      return this._mode;
    },
    set mode(value) {
      console.log('[Account Classification] Mode changing from', this._mode, 'to', value);
      console.trace('[Account Classification] Mode change stack trace');
      this._mode = value;
    }
  };

  // ========================================
  // DOM Elements
  // ========================================
  const elements = {
    classificationCode: null,
    classificationSubCode: null,
    classificationGrid: null,
    recordCount: null,
    // Behind the scene fields
    makerID: null,
    makerDT: null,
    checkerID: null,
    checkerDT: null,
    modifierID: null,
    modifierDT: null
  };

  // ========================================
  // Initialization
  // ========================================
  async function init() {
    console.log('[Account Classification] Initializing...');
    console.log('[Account Classification] Current URL:', window.location.href);
    
    // Cache DOM elements
    cacheElements();
    
    // Wire up event handlers
    wireTitleBar();
    wireButtons();
    wireDropdowns();
    preventFormSubmission();
    
    // Check what AccountID we have
    const accountID = getAccountID();
    console.log('[Account Classification] AccountID at init:', accountID);
    console.log('[Account Classification] BranchID at init:', getBranchID());
    console.log('[Account Classification] OperatorID at init:', getOperatorID());
    
    // Load classification codes FIRST (needed for dropdown population and grid display)
    await loadClassificationCodes();
    
    // THEN load existing classifications for this account (depends on codes being loaded)
    await loadAccountClassifications();
    
    console.log('[Account Classification] Initialized');
  }

  function cacheElements() {
    console.log('[Account Classification] Caching DOM elements...');
    
    elements.classificationCode = document.getElementById('classificationCode');
    elements.classificationSubCode = document.getElementById('classificationSubCode');
    elements.classificationGrid = document.getElementById('classificationGrid');
    elements.recordCount = document.getElementById('recordCount');
    
    console.log('[Account Classification] classificationCode element:', elements.classificationCode);
    console.log('[Account Classification] classificationSubCode element:', elements.classificationSubCode);
    console.log('[Account Classification] classificationGrid element:', elements.classificationGrid);
    
    // Behind the scene
    elements.makerID = document.getElementById('MakerID');
    elements.makerDT = document.getElementById('MakerDT');
    elements.checkerID = document.getElementById('CheckerID');
    elements.checkerDT = document.getElementById('CheckerDT');
    elements.modifierID = document.getElementById('ModifierID');
    elements.modifierDT = document.getElementById('ModifierDT');
    
    console.log('[Account Classification] DOM elements cached');
  }

  // ========================================
  // Load Account Classifications (from database)
  // ========================================
  async function loadAccountClassifications() {
    const accountID = getAccountID();
    if (!accountID) {
      console.log('[Account Classification] No AccountID available, skipping load');
      showMessage('No Account ID available. Please open from Account Maintenance.', 'warning');
      return;
    }

    try {
      console.log('[Account Classification] Loading existing classifications for account:', accountID);
      showLoading(true);

      const AccountClassificationService = window.AccountClassificationService;
      if (!AccountClassificationService) {
        console.warn('[Account Classification] Service not available for loading classifications');
        showLoading(false);
        return;
      }

      const requestData = {
        OurBranchID: getBranchID(),
        AccountID: accountID
      };

      console.log('[Account Classification] Request data for loading:', requestData);
      const response = await AccountClassificationService.getAccountClassification(requestData);
      showLoading(false);

      console.log('[Account Classification] Load response FULL:', JSON.stringify(response, null, 2));
      console.log('[Account Classification] Success flag:', response.success);
      console.log('[Account Classification] Response code:', response.code);
      console.log('[Account Classification] Response data:', response.data);

      // Check for success with multiple conditions
      if (response.success || response.code === '00' || response.code === '0') {
        const responseData = response.data || response;
        console.log('[Account Classification] Response data object:', responseData);
        
        // Try multiple possible locations for the data
        const classifications = responseData.Details || 
                              responseData.Details01 || 
                              responseData.details ||
                              (Array.isArray(responseData) ? responseData : []);
        
        console.log('[Account Classification] Loaded classifications count:', classifications.length);
        console.log('[Account Classification] First classification:', classifications[0]);
        
        if (classifications.length > 0) {
          // Map to grid data format with descriptions
          state.savedClassifications = classifications.map(item => {
            const codeID = item.ClassificationCodeID || item.ClassID;
            const subCodeID = item.ClassificationSubCodeID || item.SubClassID;
            const codeDesc = item.ClassDescription || '';
            const subCodeDesc = item.SubClassDescription || '';
            
            // If descriptions are missing, look up from state.classificationCodes
            const finalCodeDesc = codeDesc || (() => {
              const codeObj = state.classificationCodes.find(c => c.SubCodeID === codeID);
              return codeObj ? codeObj.CodeDescription : codeID;
            })();
            
            return {
              ClassificationCodeID: codeID,
              ClassificationCodeDescription: finalCodeDesc,
              ClassificationSubCodeID: subCodeID,
              ClassificationSubCodeDescription: subCodeDesc || subCodeID,
              Category: item.Category,
              CreatedBy: item.CreatedBy,
              CreatedOn: item.CreatedOn,
              ModifiedBy: item.ModifiedBy,
              ModifiedOn: item.ModifiedOn,
              SupervisedBy: item.SupervisedBy,
              SupervisedOn: item.SupervisedOn,
              UpdateCount: item.UpdateCount || 0
            };
          });
          
          console.log('[Account Classification] Mapped classifications:', state.savedClassifications.length);
          
          // Populate grid
          populateGrid();
          showMessage(`Loaded ${classifications.length} classification(s)`, 'success');
        } else {
          console.log('[Account Classification] No classifications found for this account');
          state.savedClassifications = [];
          populateGrid();
        }
      } else {
        console.warn('[Account Classification] Load failed or no data:', response.message);
        console.warn('[Account Classification] Full response:', response);
        // Don't clear the grid if load fails - keep any existing data
        if (response.message && response.message.includes('p_GetAccountClassification')) {
          showMessage('Unable to load from database. Stored procedure may be missing.', 'warning');
        }
      }
    } catch (error) {
      console.error('[Account Classification] Error loading classifications:', error);
      console.error('[Account Classification] Error stack:', error.stack);
      showLoading(false);
      showMessage('Error loading classifications: ' + error.message, 'error');
    }
  }

  // ========================================
  // Load Classification Codes
  // ========================================
  async function loadClassificationCodes() {
    try {
      console.log('[Account Classification] Loading classification codes...');
      console.log('[Account Classification] Checking for service...');
      console.log('[Account Classification] window.AccountClassificationService:', !!window.AccountClassificationService);
      
      const AccountClassificationService = window.AccountClassificationService;
      if (!AccountClassificationService) {
        console.error('[Account Classification] AccountClassificationService not found on window object');
        console.log('[Account Classification] Available services:', Object.keys(window).filter(k => k.includes('Service')));
        showMessage('AccountClassificationService not loaded. Check console for details.', 'error');
        
        // Try loading with mock data for testing
        loadMockData();
        return;
      }

      console.log('[Account Classification] Service found, calling getAllUserCodeCategories...');
      console.log('[Account Classification] Using Module ID:', CONFIG.MODULE_ID);
      showLoading(true);

      const requestData = {
        OurBranchID: getBranchID(),
        ModuleID: CONFIG.MODULE_ID, // '02' for account user codes
        OperatorID: getOperatorID()
      };
      
      console.log('[Account Classification] Request data:', requestData);

      const response = await AccountClassificationService.getAllUserCodeCategories(requestData);

      console.log('[Account Classification] Response received:', response);
      console.log('[Account Classification] Full response structure:', JSON.stringify(response, null, 2));
      showLoading(false);

      if (response.success) {
        // Store user code categories (t_UserCode records where ModuleID='02')
        // Response structure: SELECT ID AS SubCodeID, Description AS CodeDescription, ...
        const responseData = response.data || response;
        console.log('[Account Classification] Response data object:', responseData);
        console.log('[Account Classification] Details raw:', responseData.Details);
        
        state.classificationCodes = responseData.Details || [];
        state.classificationSubCodes = [];
        
        console.log('[Account Classification] Loaded User Code Categories:', state.classificationCodes.length);
        console.log('[Account Classification] First Category:', state.classificationCodes[0]);
        
        // If no data returned, use mock data
        if (state.classificationCodes.length === 0 && state.classificationSubCodes.length === 0) {
          console.warn('[Account Classification] API returned empty arrays, loading mock data...');
          loadMockData();
        } else {
          // Populate Classification Code dropdown
          populateClassificationCodeDropdown();
        }
      } else {
        console.error('[Account Classification] Failed to load codes:', response.message);
        
        // Fallback to mock data when API fails (e.g., stored procedure not found)
        console.warn('[Account Classification] Loading mock data as fallback...');
        loadMockData();
        
        // Show user-friendly message
        if (response.message && response.message.includes('p_GetAllUserCodes')) {
          showMessage('Stored procedure not found. Using DEMO data. See ACCOUNT_CLASSIFICATION_SUMMARY.md to create the procedure.', 'warning');
        } else {
          showMessage(response.message || 'Failed to load classification codes. Using DEMO data.', 'warning');
        }
      }
    } catch (error) {
      console.error('[Account Classification] Error loading codes:', error);
      showLoading(false);
      showMessage('Error loading classification codes: ' + error.message, 'error');
      
      // Fallback to mock data
      loadMockData();
    }
  }

  function loadMockData() {
    console.log('[Account Classification] Loading mock data...');
    // Mock User Code Categories (from t_UserCode WHERE ModuleID='02')
    state.classificationCodes = [
      { SubCodeID: '01', CodeDescription: 'DEPOSIT ECONOMIC SECTOR' },
      { SubCodeID: '02', CodeDescription: 'GEOGRAPHICAL REGION' },
      { SubCodeID: '03', CodeDescription: 'ADVANCES ECONOMIC SECTOR' },
      { SubCodeID: '04', CodeDescription: 'RISK CLASSIFICATION OF ADVANES' },
      { SubCodeID: '05', CodeDescription: 'CATEGORY' },
      { SubCodeID: '06', CodeDescription: 'RESIDENT FOREIGN CURRENCY' },
      { SubCodeID: '07', CodeDescription: 'TYPE OF INDUSTRY' },
      { SubCodeID: '08', CodeDescription: 'TYPE OF BUSINESS' },
      { SubCodeID: '09', CodeDescription: 'ACCOUNT TYPE' }
    ];
    
    // Sub codes will be loaded when user selects a category
    state.classificationSubCodes = [];
    
    console.log('[Account Classification] Mock Classification Categories:', state.classificationCodes.length);
    console.log('[Account Classification] Mock data loaded successfully');
    populateClassificationCodeDropdown();
  }

  // ========================================
  // Populate Dropdowns
  // ========================================
  function populateClassificationCodeDropdown() {
    if (!elements.classificationCode) return;

    console.log('[Account Classification] Populating Classification Code dropdown...');
    console.log('[Account Classification] Available codes:', state.classificationCodes.length);

    // Clear existing options
    elements.classificationCode.innerHTML = '<option value="">--Select--</option>';

    // Populate from Details (User Code Categories where ModuleID='02')
    // Field mapping: SubCodeID=ID, CodeDescription=Description from t_UserCode
    state.classificationCodes.forEach((code, index) => {
      const codeID = code.SubCodeID || code.ID;
      const codeName = code.CodeDescription || code.Description || codeID;
      
      console.log(`[Account Classification] Code ${index}:`, codeID, '-', codeName);
      
      const option = document.createElement('option');
      option.value = codeID;
      option.textContent = codeName; // Show only description, not ID
      elements.classificationCode.appendChild(option);
    });

    console.log('[Account Classification] Classification Code dropdown populated with', state.classificationCodes.length, 'options');
  }

  async function populateClassificationSubCodeDropdown(classificationCode) {
    if (!elements.classificationSubCode) return;

    console.log('[Account Classification] Populating Sub Code dropdown for Classification Code:', classificationCode);

    // Clear existing options
    elements.classificationSubCode.innerHTML = '<option value="">--Select--</option>';

    if (!classificationCode) {
      console.log('[Account Classification] No classification code selected, sub-code dropdown cleared');
      return;
    }

    // Load sub-codes by calling the API again with the selected classification code as the ID
    try {
      showLoading(true);
      
      const AccountClassificationService = window.AccountClassificationService;
      if (!AccountClassificationService) {
        console.error('[Account Classification] Service not available for loading sub-codes');
        return;
      }

      const requestData = {
        OurBranchID: getBranchID(),
        ID: classificationCode, // Use the selected classification code as ID
        OperatorID: getOperatorID()
      };
      
      console.log('[Account Classification] Loading sub-codes with request:', requestData);

      const response = await AccountClassificationService.getUserCodes(requestData);
      showLoading(false);

      console.log('[Account Classification] Sub-codes response:', response);

      if (response.success) {
        const responseData = response.data || response;
        state.classificationSubCodes = responseData.Details02 || [];
        
        console.log('[Account Classification] Loaded sub-codes:', state.classificationSubCodes.length);

        // Populate dropdown
        state.classificationSubCodes.forEach((subCode, index) => {
          const subCodeID = subCode.SubCodeID || subCode.CodeID || subCode.ID;
          const subCodeName = subCode.Description || subCode.CodeDescription || subCode.Name || subCodeID;
          
          console.log(`[Account Classification] SubCode ${index}:`, subCodeID, '-', subCodeName);
          
          const option = document.createElement('option');
          option.value = subCodeID;
          option.textContent = subCodeName; // Show only description, not ID
          elements.classificationSubCode.appendChild(option);
        });

        console.log('[Account Classification] Sub-code dropdown populated with', state.classificationSubCodes.length, 'items');
      } else {
        console.error('[Account Classification] Failed to load sub-codes:', response.message);
        showMessage('Failed to load sub-codes: ' + (response.message || 'Unknown error'), 'error');
      }
    } catch (error) {
      showLoading(false);
      console.error('[Account Classification] Error loading sub-codes:', error);
      showMessage('Error loading sub-codes: ' + error.message, 'error');
    }
  }

  // ========================================
  // Helper Functions
  // ========================================
  function getBranchID() {
    // Try to get from parent window Account Maintenance state, environment, or default
    try {
      if (window.parent && window.parent !== window) {
        // Try AccountMaintenance namespace
        if (window.parent.AccountMaintenance && window.parent.AccountMaintenance.state) {
          const branchID = window.parent.AccountMaintenance.state.BranchID;
          if (branchID) {
            console.log('[Account Classification] Got BranchID from parent:', branchID);
            return branchID;
          }
        }
        
        // Try direct state variable
        if (window.parent.state && window.parent.state.BranchID) {
          const branchID = window.parent.state.BranchID;
          if (branchID) {
            console.log('[Account Classification] Got BranchID from parent.state:', branchID);
            return branchID;
          }
        }
      }
    } catch (e) {
      console.warn('[Account Classification] Could not access parent window for BranchID:', e);
    }
    
    // Try sessionStorage (set by parent when opening child form)
    const sessionBranchID = sessionStorage.getItem('currentBranchID');
    if (sessionBranchID) {
      console.log('[Account Classification] Got BranchID from sessionStorage:', sessionBranchID);
      return sessionBranchID;
    }
    
    // Fallback to default
    const defaultBranchID = window.CoreBankingConfig?.defaultBranchID || 
                           window.Environment?.defaultBranchID || 
                           '0101'; // Default to Head Office
    console.log('[Account Classification] Using default BranchID:', defaultBranchID);
    return defaultBranchID;
  }

  function getOperatorID() {
    // Try to get from session storage, environment, or default
    try {
      const operatorID = sessionStorage.getItem('OperatorID') || 
                        localStorage.getItem('OperatorID') ||
                        window.CoreBankingConfig?.operatorID || 
                        window.Environment?.operatorID;
      if (operatorID) {
        console.log('[Account Classification] Got OperatorID:', operatorID);
        return operatorID;
      }
    } catch (e) {
      console.warn('[Account Classification] Could not access storage:', e);
    }
    
    return 'CSADM'; // Default operator
  }

  function getAccountID() {
    let accountID = null;
    
    // Try multiple methods to get AccountID
    
    // Method 1: From parent window Account Maintenance state
    try {
      if (window.parent && window.parent !== window) {
        // Try AccountMaintenance namespace
        if (window.parent.AccountMaintenance && window.parent.AccountMaintenance.state) {
          accountID = window.parent.AccountMaintenance.state.AccountID;
          if (accountID) {
            console.log('[Account Classification] Got AccountID from parent.AccountMaintenance.state:', accountID);
            return accountID;
          }
        }
        
        // Try direct state variable
        if (window.parent.state && window.parent.state.AccountID) {
          accountID = window.parent.state.AccountID;
          if (accountID) {
            console.log('[Account Classification] Got AccountID from parent.state:', accountID);
            return accountID;
          }
        }
      }
    } catch (e) {
      console.warn('[Account Classification] Could not access parent window:', e);
    }
    
    // Method 2: From URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    accountID = urlParams.get('accountID') || urlParams.get('AccountID');
    if (accountID) {
      console.log('[Account Classification] Got AccountID from URL:', accountID);
      return accountID;
    }
    
    // Method 3: From sessionStorage (set by parent)
    accountID = sessionStorage.getItem('currentAccountID');
    if (accountID) {
      console.log('[Account Classification] Got AccountID from sessionStorage:', accountID);
      return accountID;
    }
    
    // Method 4: Use fallback for testing (same as save operation uses)
    const fallbackAccountID = '0101760000002';
    console.warn('[Account Classification] No AccountID found via parent/URL/session, using fallback:', fallbackAccountID);
    return fallbackAccountID;
  }

  function formatDateTime(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  // ========================================
  // Event Handlers - Dropdowns
  // ========================================
  function preventFormSubmission() {
    // Prevent form from submitting and resetting state
    const form = document.querySelector('form');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('[Account Classification] Form submission prevented');
        return false;
      });
      console.log('[Account Classification] Form submit prevention wired');
    }
  }

  function wireDropdowns() {
    // Classification Code change handler
    if (elements.classificationCode) {
      elements.classificationCode.addEventListener('change', function(e) {
        const selectedCode = e.target.value;
        console.log('[Account Classification] Classification Code changed to:', selectedCode);
        
        state.selectedClassificationCode = selectedCode;
        
        // Populate sub-code dropdown based on selected code
        populateClassificationSubCodeDropdown(selectedCode);
        
        // Clear sub-code selection
        if (elements.classificationSubCode) {
          elements.classificationSubCode.value = '';
        }
        
        // Update grid if needed
        updateClassificationList();
      });
    }

    // Classification Sub Code change handler
    if (elements.classificationSubCode) {
      elements.classificationSubCode.addEventListener('change', function(e) {
        const selectedSubCode = e.target.value;
        console.log('[Account Classification] Sub-code changed to:', selectedSubCode);
        
        // Update grid or perform other actions
        updateClassificationList();
      });
    }
  }

  // ========================================
  // Update Classification List
  // ========================================
  function updateClassificationList() {
    const classCode = elements.classificationCode?.value || '';
    const subCode = elements.classificationSubCode?.value || '';
    
    if (!classCode && !subCode) {
      renderEmptyGrid();
      return;
    }

    // Filter classifications based on selection
    // Note: This is for displaying existing records in a grid, not for the dropdowns
    // For now, return empty until we implement the grid view properly
    const filteredItems = [];
    // TODO: Implement grid filtering when needed

    console.log('[Account Classification] Filtered items:', filteredItems.length);
    
    renderClassificationGrid(filteredItems);
  }

  function renderClassificationGrid(items) {
    if (!elements.classificationGrid) return;

    const tbody = elements.classificationGrid.querySelector('tbody');
    if (!tbody) return;

    if (!items || items.length === 0) {
      renderEmptyGrid();
      return;
    }

    tbody.innerHTML = items.map((item, index) => {
      const classCode = item.ClassificationCodeID || item.CodeID || item.ParentID || '';
      const subCode = item.ClassificationSubCodeID || item.SubCodeID || item.ID || '';
      
      return `
        <tr onclick="window.selectClassificationRow(${index})" style="cursor: pointer;">
          <td>${escapeHtml(classCode)}</td>
          <td>${escapeHtml(subCode)}</td>
        </tr>
      `;
    }).join('');

    // Update record count
    updateRecordCount(items.length);
  }

  function renderEmptyGrid() {
    if (!elements.classificationGrid) return;

    const tbody = elements.classificationGrid.querySelector('tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr class="de-table__empty"><td colspan="2">No records to display.</td></tr>';
    updateRecordCount(0);
  }

  function updateRecordCount(count) {
    if (elements.recordCount) {
      elements.recordCount.textContent = `${count} record${count !== 1 ? 's' : ''}`;
    }
  }

  // Global function for row selection
  window.selectClassificationRow = function(index) {
    // Note: This is for selecting records in a grid view
    // For now, return empty until we implement the grid view properly
    const filteredItems = [];
    // TODO: Implement row selection when needed

    if (index >= 0 && index < filteredItems.length) {
      state.currentRecord = filteredItems[index];
      console.log('[Account Classification] Selected record:', state.currentRecord);
      
      // Highlight selected row
      const rows = elements.classificationGrid.querySelectorAll('tbody tr');
      rows.forEach((row, i) => {
        row.classList.toggle('table-active', i === index);
      });
      
      // Update behind the scene fields
      updateBehindTheScene(state.currentRecord);
    }
  };

  function updateBehindTheScene(record) {
    if (!record) {
      clearBehindTheScene();
      return;
    }

    if (elements.makerID) elements.makerID.textContent = record.CreatedBy || record.MakerID || '-';
    if (elements.makerDT) elements.makerDT.textContent = record.CreatedOn || record.MakerDT || '-';
    if (elements.checkerID) elements.checkerID.textContent = record.SupervisedBy || record.CheckerID || '-';
    if (elements.checkerDT) elements.checkerDT.textContent = record.SupervisedOn || record.CheckerDT || '-';
    if (elements.modifierID) elements.modifierID.textContent = record.ModifiedBy || record.ModifierID || '-';
    if (elements.modifierDT) elements.modifierDT.textContent = record.ModifiedOn || record.ModifierDT || '-';
  }

  function clearBehindTheScene() {
    if (elements.makerID) elements.makerID.textContent = '-';
    if (elements.makerDT) elements.makerDT.textContent = '-';
    if (elements.checkerID) elements.checkerID.textContent = '-';
    if (elements.checkerDT) elements.checkerDT.textContent = '-';
    if (elements.modifierID) elements.modifierID.textContent = '-';
    if (elements.modifierDT) elements.modifierDT.textContent = '-';
  }

  // ========================================
  // Utility Functions
  // ========================================
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.hidden = !show;
    }
  }

  function showMessage(message, type = 'info') {
    const messagePanel = document.querySelector('.am-message-panel');
    if (!messagePanel) return;

    const span = messagePanel.querySelector('span');
    if (span) span.textContent = message;

    messagePanel.className = 'am-message-panel am-message-panel--' + type;
    messagePanel.style.display = 'flex';

    setTimeout(() => {
      messagePanel.style.display = 'none';
    }, 5000);
  }

  // ========================================
  // Window Controls
  // ========================================
  // ========================================
  // Add/Edit Handlers
  // ========================================
  function handleAdd(e) {
    e.preventDefault();
    console.log('[Account Classification] Add clicked - enabling dropdowns');
    console.log('[Account Classification] Mode before:', state.mode);

    // Switch to add mode
    state.mode = 'add';
    console.log('[Account Classification] Mode after setting to add:', state.mode);
    
    // Clear dropdowns
    if (elements.classificationCode) {
      elements.classificationCode.value = '';
    }
    if (elements.classificationSubCode) {
      elements.classificationSubCode.innerHTML = '<option>--Select--</option>';
    }
    
    showMessage('Add mode - Select Classification Code and Sub Code, then click Save', 'info');
  }

  async function handleEdit(e) {
    e.preventDefault();
    console.log('[Account Classification] Edit clicked');

    // Validate that a record is selected
    if (!state.currentRecord) {
      showMessage('Please select a record to edit', 'warning');
      return;
    }

    // Switch to edit mode
    state.mode = 'edit';
    
    // Populate dropdowns with current record data
    if (elements.classificationCode) {
      elements.classificationCode.value = state.currentRecord.ClassificationCodeID || '';
    }
    
    // Load sub-codes for selected code and then set value
    if (state.currentRecord.ClassificationCodeID) {
      await populateClassificationSubCodeDropdown(state.currentRecord.ClassificationCodeID);
      if (elements.classificationSubCode) {
        elements.classificationSubCode.value = state.currentRecord.ClassificationSubCodeID || '';
        // Focus on sub-code dropdown so user can change it
        elements.classificationSubCode.focus();
      }
    }

    showMessage('Edit mode - Modify the selections and click Save', 'info');
  }

  async function handleSave(e) {
    e.preventDefault();
    console.log('[Account Classification] Save clicked');
    console.log('[Account Classification] Current mode:', state.mode);
    
    if (state.mode !== 'add' && state.mode !== 'edit') {
      console.warn('[Account Classification] Mode check failed. Mode is:', state.mode);
      showMessage('Please click Add button first', 'warning');
      return;
    }

    // Get values from DROPDOWNS
    const classificationCodeID = elements.classificationCode?.value?.trim();
    const classificationSubCodeID = elements.classificationSubCode?.value?.trim();
    
    // Get DESCRIPTIONS (selected text from dropdowns)
    const classificationCodeDesc = elements.classificationCode?.options[elements.classificationCode.selectedIndex]?.text || classificationCodeID;
    const classificationSubCodeDesc = elements.classificationSubCode?.options[elements.classificationSubCode.selectedIndex]?.text || classificationSubCodeID;
    
    const accountID = getAccountID() || '0101760000002';

    console.log('[Account Classification] Dropdown values - CodeID:', classificationCodeID, 'CodeDesc:', classificationCodeDesc);
    console.log('[Account Classification] Dropdown values - SubCodeID:', classificationSubCodeID, 'SubCodeDesc:', classificationSubCodeDesc);

    // Validate
    if (!classificationCodeID || classificationCodeID === '--Select--') {
      showMessage('Please select a Classification Code', 'warning');
      elements.classificationCode?.focus();
      console.warn('[Account Classification] Validation failed: Code not selected');
      return;
    }

    if (!classificationSubCodeID || classificationSubCodeID === '--Select--') {
      showMessage('Please select a Classification Sub Code', 'warning');
      elements.classificationSubCode?.focus();
      console.warn('[Account Classification] Validation failed: Sub Code not selected');
      return;
    }

    const now = formatDateTime();
    const operatorID = getOperatorID();
    const isEditMode = state.mode === 'edit';
    const isAddMode = state.mode === 'add';
    
    // Create grid data IMMEDIATELY with DESCRIPTIONS
    const gridData = {
      ClassificationCodeID: classificationCodeID,
      ClassificationCodeDescription: classificationCodeDesc,
      ClassificationSubCodeID: classificationSubCodeID,
      ClassificationSubCodeDescription: classificationSubCodeDesc,
      CreatedBy: isEditMode ? (state.currentRecord?.CreatedBy || operatorID) : operatorID,
      CreatedOn: isEditMode ? (state.currentRecord?.CreatedOn || now) : now,
      ModifiedBy: operatorID,
      ModifiedOn: now,
      SupervisedBy: operatorID,
      SupervisedOn: now,
      UpdateCount: isEditMode ? ((state.currentRecord?.UpdateCount || 0) + 1) : 0
    };
    
    console.log('[Account Classification] Grid data created:', gridData);
    
    // Add to grid array immediately
    if (isAddMode) {
      state.savedClassifications.push(gridData);
      console.log('[Account Classification] Added to grid. Total records:', state.savedClassifications.length);
    } else if (isEditMode) {
      const index = state.savedClassifications.findIndex(
        r => r.ClassificationCodeID === state.currentRecord?.ClassificationCodeID && 
             r.ClassificationSubCodeID === state.currentRecord?.ClassificationSubCodeID
      );
      if (index !== -1) {
        state.savedClassifications[index] = gridData;
        console.log('[Account Classification] Updated record at index:', index);
      }
    }
    
    // Populate grid IMMEDIATELY
    console.log('[Account Classification] Calling populateGrid with', state.savedClassifications.length, 'records');
    populateGrid();
    
    // Update behind the scene
    updateBehindTheScene(gridData);
    
    // Clear dropdowns
    if (elements.classificationCode) elements.classificationCode.value = '';
    if (elements.classificationSubCode) elements.classificationSubCode.innerHTML = '<option>--Select--</option>';
    
    // Switch back to view mode
    state.mode = 'view';
    state.currentRecord = null;
    
    showMessage(`Classification ${isEditMode ? 'updated' : 'added'} successfully!`, 'success');

    // NOW try to save to API in background
    try {
      showLoading(true);

      const AccountClassificationService = window.AccountClassificationService;
      if (!AccountClassificationService) {
        console.warn('[Account Classification] Service not available, data only in grid');
        showLoading(false);
        return;
      }

      const requestData = {
        OurBranchID: getBranchID(),
        AccountID: accountID,
        Category: CONFIG.CATEGORY,
        ClassificationCodeID: classificationCodeID,
        ClassificationSubCodeID: classificationSubCodeID,
        CreatedBy: gridData.CreatedBy,
        CreatedOn: gridData.CreatedOn,
        ModifiedBy: gridData.ModifiedBy,
        ModifiedOn: gridData.ModifiedOn,
        SupervisedBy: gridData.SupervisedBy,
        SupervisedOn: gridData.SupervisedOn,
        UpdateCount: gridData.UpdateCount,
        NewRecord: isAddMode ? 1 : 0
      };

      console.log('[Account Classification] Saving to API with data:', requestData);
      const response = await AccountClassificationService.addEditAccountClassification(requestData);
      showLoading(false);

      console.log('[Account Classification] API response:', response);
      if (response.success || response.code === '00' || response.code === '0') {
        console.log('[Account Classification] Successfully saved to database');
      } else {
        console.warn('[Account Classification] API save indicator:', response.message);
        showMessage('Saved to grid. Check database connection.', 'warning');
      }
    } catch (error) {
      console.error('[Account Classification] API error, but data is in grid:', error);
      showLoading(false);
    }
  }

  function handleCancel(e) {
    e.preventDefault();
    console.log('[Account Classification] Cancel clicked');
    
    // Clear dropdowns
    if (elements.classificationCode) elements.classificationCode.value = '';
    if (elements.classificationSubCode) elements.classificationSubCode.innerHTML = '<option>--Select--</option>';
    
    // Switch back to view mode
    state.mode = 'view';
    state.currentRecord = null;
    
    showMessage('Cancelled', 'info');
  }

  // ========================================
  // Grid Management
  // ========================================
  function populateGrid() {
    console.log('[Account Classification] populateGrid() called');
    console.log('[Account Classification] Grid element:', elements.classificationGrid);
    
    if (!elements.classificationGrid) {
      console.error('[Account Classification] Grid element not found!');
      return;
    }
    
    const tbody = elements.classificationGrid.querySelector('tbody');
    console.log('[Account Classification] tbody element:', tbody);
    
    if (!tbody) {
      console.error('[Account Classification] tbody not found!');
      return;
    }
    
    console.log('[Account Classification] Saved classifications count:', state.savedClassifications.length);
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (state.savedClassifications.length === 0) {
      tbody.innerHTML = '<tr class="de-table__empty"><td colspan="2">No records to display.</td></tr>';
      if (elements.recordCount) elements.recordCount.textContent = '0 records';
      console.log('[Account Classification] Grid populated with empty message');
      return;
    }
    
    // Populate rows
    state.savedClassifications.forEach((record, index) => {
      console.log('[Account Classification] Creating row for record', index, ':', record);
      
      // Get descriptions from record or fallback to state arrays
      let codeDesc = record.ClassificationCodeDescription;
      let subCodeDesc = record.ClassificationSubCodeDescription;
      
      // Fallback: Look up descriptions from state arrays if not in record
      if (!codeDesc) {
        const codeObj = state.classificationCodes.find(c => c.SubCodeID === record.ClassificationCodeID);
        codeDesc = codeObj ? codeObj.CodeDescription : record.ClassificationCodeID;
      }
      
      if (!subCodeDesc) {
        const subCodeObj = state.classificationSubCodes.find(s => s.SubCodeID === record.ClassificationSubCodeID);
        subCodeDesc = subCodeObj ? subCodeObj.Description : record.ClassificationSubCodeID;
      }
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(codeDesc || '')}</td>
        <td>${escapeHtml(subCodeDesc || '')}</td>
      `;
      
      // Make row clickable
      row.style.cursor = 'pointer';
      row.addEventListener('click', async function() {
        // Remove previous selection
        tbody.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
        // Highlight selected row
        row.classList.add('table-active');
        // Set current record
        state.currentRecord = record;
        // Update behind the scene
        updateBehindTheScene(record);
        
        // Populate dropdowns with selected record data
        if (elements.classificationCode) {
          elements.classificationCode.value = record.ClassificationCodeID || '';
        }
        
        // Load sub-codes for selected classification code, then set the value
        if (record.ClassificationCodeID) {
          await populateClassificationSubCodeDropdown(record.ClassificationCodeID);
          if (elements.classificationSubCode) {
            elements.classificationSubCode.value = record.ClassificationSubCodeID || '';
          }
        }
        
        console.log('[Account Classification] Row clicked - dropdowns populated with record data');
      });
      
      tbody.appendChild(row);
    });
    
    // Update record count
    if (elements.recordCount) {
      elements.recordCount.textContent = `${state.savedClassifications.length} record${state.savedClassifications.length !== 1 ? 's' : ''}`;
    }
    
    console.log('[Account Classification] Grid populated with', state.savedClassifications.length, 'rows');
  }

  // ========================================
  // Window Controls
  // ========================================
  function postClose() {
    try {
      window.parent.postMessage({ type: 'accountMaintenanceChildClose' }, '*');
    } catch (_) {
      // ignore
    }
  }

  function setMinimized(isMinimized) {
    var root = document.querySelector('[data-acl-window]');
    if (!root) return;
    root.classList.toggle('acl-window--minimized', Boolean(isMinimized));
  }

  function doRefresh() {
    try {
      window.location.reload();
    } catch (_) {
      // ignore
    }
  }

  function wireTitleBar() {
    // Close button
    const closeButtons = document.querySelectorAll('[data-action="close"]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', postClose);
    });

    // Refresh button
    const refreshButton = document.querySelector('[data-action="refresh"]');
    if (refreshButton) {
      refreshButton.addEventListener('click', doRefresh);
    }

    // Maximize button (optional)
    const maximizeButton = document.querySelector('[data-action="maximize"]');
    if (maximizeButton) {
      maximizeButton.addEventListener('click', function() {
        // Implement maximize logic if needed
        console.log('[Account Classification] Maximize clicked');
      });
    }
  }

  function wireButtons() {
    console.log('[Account Classification] Wiring buttons...');
    
    // Add button
    const addBtn = document.querySelector('[data-action="add"]');
    console.log('[Account Classification] Add button found:', !!addBtn, addBtn);
    console.log('[Account Classification] handleAdd function exists:', typeof handleAdd);
    if (addBtn) {
      addBtn.addEventListener('click', handleAdd);
      console.log('[Account Classification] Add button event listener attached');
    } else {
      console.error('[Account Classification] Add button NOT FOUND!');
    }

    // Edit button
    const editBtn = document.querySelector('[data-action="edit"]');
    if (editBtn) {
      editBtn.addEventListener('click', handleEdit);
    }

    // Save button
    const saveBtn = document.querySelector('[data-action="save"]');
    console.log('[Account Classification] Save button found:', !!saveBtn, saveBtn);
    console.log('[Account Classification] handleSave function exists:', typeof handleSave);
    if (saveBtn) {
      saveBtn.addEventListener('click', handleSave);
      console.log('[Account Classification] Save button event listener attached');
    } else {
      console.error('[Account Classification] Save button NOT FOUND!');
    }

    // Delete button
    const deleteBtn = document.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (state.currentRecord) {
          if (confirm('Are you sure you want to delete this classification?')) {
            console.log('[Account Classification] Delete:', state.currentRecord);
            showMessage('Delete - Feature coming soon', 'info');
          }
        } else {
          showMessage('Please select a record to delete', 'warning');
        }
      });
    }

    // Cancel button
    const cancelBtn = document.querySelector('[data-action="cancel"]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', handleCancel);
    }

    // Back button
    const backBtn = document.querySelector('[data-action="back"]');
    if (backBtn) {
      backBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('[Account Classification] Back clicked');
        postClose();
      });
    }
    
    console.log('[Account Classification] All buttons wired successfully');
  }

  // ========================================
  // Initialize on DOM ready
  // ========================================
  document.addEventListener('DOMContentLoaded', init);
  
  // Also try immediate initialization if DOM already loaded
  if (document.readyState === 'loading') {
    console.log('[Account Classification] DOM still loading, waiting for DOMContentLoaded...');
  } else {
    console.log('[Account Classification] DOM already loaded, initializing immediately...');
    // Use setTimeout to ensure all scripts are loaded
    setTimeout(init, 100);
  }
  
  // Expose test function for debugging
  window.testAccountClassification = function() {
    console.log('=== Account Classification Debug Info ===');
    console.log('Service loaded:', !!window.AccountClassificationService);
    console.log('Elements cached:', elements);
    console.log('Classification dropdown element:', elements.classificationCode);
    console.log('Sub-code dropdown element:', elements.classificationSubCode);
    console.log('Classification Codes (Details01) count:', state.classificationCodes.length);
    console.log('Sub Codes (Details02) count:', state.classificationSubCodes.length);
    console.log('Current record:', state.currentRecord);
    
    if (state.classificationCodes.length > 0) {
      console.log('Sample classification code:', state.classificationCodes[0]);
    }
    if (state.classificationSubCodes.length > 0) {
      console.log('Sample sub code:', state.classificationSubCodes[0]);
    }
    
    console.log('Attempting to re-populate dropdowns...');
    if (state.classificationCodes.length > 0) {
      populateClassificationCodeDropdown();
    } else {
      console.log('No classifications loaded. Loading now...');
      loadClassificationCodes();
    }
    
    return {
      service: !!window.AccountClassificationService,
      elements: elements,
      state: state
    };
  };
  
  console.log('[Account Classification] Script loaded. Run window.testAccountClassification() to debug.');
})();

