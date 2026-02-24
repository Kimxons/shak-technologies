(function (global) {
  const controls = document.querySelectorAll('[data-window-action]');

  // State management
  const rdState = {
    mode: 'VIEW',
    hasLoaded: false,
    combos: [],
    selectedCombo: null,
    selectedComboIndex: -1,
    rules: [],
    updateCount: 0,
    accountingRuleId: null,
    productTypeId: null,
    filteredCombos: [],
    eventComponentMapping: [],
    comboData: {
      events: [],
      debitTags: [],
      creditTags: [],
      mapping: []
    },
    productTypeMapping: {}
  };

  const MODES = {
    VIEW: 'VIEW',
    ADD: 'ADD',
    EDIT: 'EDIT'
  };

  function getUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    return {
      acRuleId: params.get('acRuleId'),
      productTypeId: params.get('productTypeId')
    };
  }

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function setToast(message, variant = 'success') {
    // Prefer SweetAlert2 toast if available
    if (global.Swal) {
      const icon =
        variant === 'success'
          ? 'success'
          : variant === 'danger'
            ? 'error'
            : variant === 'warning'
              ? 'warning'
              : 'info';

      global.Swal.fire({
        icon,
        title: message,
        timer: 2500,
        showConfirmButton: false,
        position: 'top-end',
        toast: true,
        timerProgressBar: true
      });
      return;
    }

    // Fallback console log
    console.log(`[RuleDetails] ${variant.toUpperCase()}: ${message}`);
  }

  function setButtonDisabled(buttonEl, disabled) {
    if (!buttonEl) return;
    buttonEl.disabled = !!disabled;
  }

  function clearRuleDetailsForm() {
    const componentSelect = qs('#Component') || qs('select[aria-label*="Component"]');
    const debitSelect = qs('#DebitAccountTag') || qs('select[aria-label*="Debit"]');
    const creditSelect = qs('#CreditAccountTag') || qs('select[aria-label*="Credit"]');
    const narrationInput = qs('#Narration') || qs('input[aria-label="Narration"]');

    if (componentSelect) componentSelect.value = '';
    if (debitSelect) debitSelect.value = '';
    if (creditSelect) creditSelect.value = '';
    if (narrationInput) narrationInput.value = '';

    rdState.selectedCombo = null;
    rdState.selectedComboIndex = -1;
  }

  function setFormMode(nextMode) {
    rdState.mode = nextMode;

    const componentSelect = qs('#Component') || qs('select[aria-label*="Component"]');
    const debitSelect = qs('#DebitAccountTag') || qs('select[aria-label*="Debit"]');
    const creditSelect = qs('#CreditAccountTag') || qs('select[aria-label*="Credit"]');
    const narrationInput = qs('#Narration') || qs('input[aria-label="Narration"]');

    const isEditable = nextMode === MODES.ADD || nextMode === MODES.EDIT;

    if (componentSelect) componentSelect.disabled = !isEditable;
    if (debitSelect) debitSelect.disabled = !isEditable;
    if (creditSelect) creditSelect.disabled = !isEditable;
    if (narrationInput) narrationInput.disabled = !isEditable;

    updateRuleDetailsButtons();
  }

  function updateRuleDetailsButtons() {
    // Try multiple selector strategies for inline action buttons
    let actionBtns = qsa('button[data-inline-action]');
    if (actionBtns.length === 0) {
      console.log('[RuleDetails] Inline action button selector failed, trying fallback');
      actionBtns = qsa('.form-section button.btn-sm.btn-secondary');
      if (actionBtns.length === 0) {
        console.log('[RuleDetails] Action button selector 2 failed, trying selector 3');
        actionBtns = qsa('button.btn-sm');
        if (actionBtns.length === 0) {
          console.log('[RuleDetails] Action button selector 3 failed, trying all buttons');
          actionBtns = qsa('button');
        }
      }
    }

    // Find side buttons using the correct selector matching the HTML structure
    const sideButtonsContainer = qs('.action-panel .action-buttons');
    let sideBtns = sideButtonsContainer ? qsa('button[data-action]', sideButtonsContainer) : [];

    if (!sideBtns || sideBtns.length === 0) {
      console.log('[RuleDetails] Side buttons container not found, trying fallback selectors');
      sideBtns = qsa('.action-panel button[data-action]');
    }

    const hasNoRecords = !rdState.rules || rdState.rules.length === 0;
    const hasRecords = rdState.rules && rdState.rules.length > 0;
    const hasSelected = rdState.selectedCombo !== null;
    const isEditable = rdState.mode === MODES.ADD || rdState.mode === MODES.EDIT;

    console.log('[RuleDetails] updateRuleDetailsButtons called');
    console.log('[RuleDetails] - mode:', rdState.mode);
    console.log('[RuleDetails] - actionBtns found:', actionBtns.length);
    console.log('[RuleDetails] - sideBtns found:', sideBtns?.length || 0);
    console.log('[RuleDetails] - hasNoRecords:', hasNoRecords);
    console.log('[RuleDetails] - hasRecords:', hasRecords);
    console.log('[RuleDetails] - hasSelected:', hasSelected);
    console.log('[RuleDetails] - isEditable:', isEditable);

    if (sideBtns && sideBtns.length > 0) {
      console.log('[RuleDetails] ✓ Found', sideBtns.length, 'side buttons');

      // Side panel buttons - map by data-action attribute for reliability
      const viewBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'view');
      const addBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'add');
      const editBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'edit');
      const delBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'delete');
      const saveBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'save');
      const cancelBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'cancel');

      // On initial load (VIEW mode with no records): only View button enabled
      if (rdState.mode === MODES.VIEW) {
        setButtonDisabled(viewBtn, false);      // View: always enabled in VIEW mode
        setButtonDisabled(addBtn, hasNoRecords);     // Add: disabled if no records exist
        setButtonDisabled(editBtn, true);       // Edit: disabled in VIEW mode
        setButtonDisabled(delBtn, true);        // Delete: disabled in VIEW mode
        setButtonDisabled(saveBtn, true);       // Save: disabled in VIEW mode
        setButtonDisabled(cancelBtn, true);     // Cancel: disabled in VIEW mode
      } else if (isEditable) {
        // In ADD/EDIT mode: enable form controls and save/cancel buttons
        setButtonDisabled(viewBtn, false);      // View: always enabled
        setButtonDisabled(addBtn, true);        // Add: disabled while editing
        setButtonDisabled(editBtn, true);       // Edit: disabled while editing
        setButtonDisabled(delBtn, true);        // Delete: disabled while editing
        setButtonDisabled(saveBtn, false);      // Save: enabled in edit mode
        setButtonDisabled(cancelBtn, false);    // Cancel: enabled in edit mode
      }

      console.log('[RuleDetails] Side button states - View:', !viewBtn?.disabled, 'Add:', !addBtn?.disabled, 'Edit:', !editBtn?.disabled, 'Delete:', !delBtn?.disabled, 'Save:', !saveBtn?.disabled, 'Cancel:', !cancelBtn?.disabled);
    } else {
      console.warn('[RuleDetails] ⚠️ No side buttons found - attempting to disable all action buttons');
      // Direct selector for buttons as fallback
      const addBtnDirect = qs('button[data-action="add"]');
      const editBtnDirect = qs('button[data-action="edit"]');
      const delBtnDirect = qs('button[data-action="delete"]');
      const saveBtnDirect = qs('button[data-action="save"]');
      const cancelBtnDirect = qs('button[data-action="cancel"]');
      
      if (rdState.mode === MODES.VIEW) {
        if (addBtnDirect) setButtonDisabled(addBtnDirect, hasNoRecords);
        if (editBtnDirect) setButtonDisabled(editBtnDirect, true);
        if (delBtnDirect) setButtonDisabled(delBtnDirect, true);
        if (saveBtnDirect) setButtonDisabled(saveBtnDirect, true);
        if (cancelBtnDirect) setButtonDisabled(cancelBtnDirect, true);
      }
    }

    // Action buttons - mirror side panel buttons
    if (actionBtns.length >= 5) {
      if (rdState.mode === MODES.VIEW) {
        setButtonDisabled(actionBtns[0], hasNoRecords);      // New - disabled if no records
        setButtonDisabled(actionBtns[1], true);              // Alter - disabled in VIEW mode
        setButtonDisabled(actionBtns[2], true);              // Remove - disabled in VIEW mode
        setButtonDisabled(actionBtns[3], true);              // Update - disabled in VIEW mode
        setButtonDisabled(actionBtns[4], true);              // Clear - disabled in VIEW mode
      } else if (isEditable) {
        setButtonDisabled(actionBtns[0], true);              // New - disabled while editing
        setButtonDisabled(actionBtns[1], true);              // Alter - disabled while editing
        setButtonDisabled(actionBtns[2], true);              // Remove - disabled while editing
        setButtonDisabled(actionBtns[3], false);             // Update - enabled in edit mode
        setButtonDisabled(actionBtns[4], false);             // Clear - enabled in edit mode
      }

      console.log('[RuleDetails] Action buttons state - New:', !actionBtns[0]?.disabled, 'Alter:', !actionBtns[1]?.disabled, 'Remove:', !actionBtns[2]?.disabled, 'Update:', !actionBtns[3]?.disabled, 'Clear:', !actionBtns[4]?.disabled);
    } else {
      console.warn('[RuleDetails] ⚠️ Expected 5+ action buttons but found:', actionBtns.length);
    }
  }

  async function loadAndMapProductTypes() {
    try {
      console.log('[RuleDetails] INFO: Loading Product Types for mapping...');

      if (!global.ProductLgLcService?.getProductTypes) {
        console.warn('[RuleDetails] ProductLgLcService.getProductTypes not available');
        return {};
      }

      const requestData = { CodeID: 'ProductTypeID' };
      console.log('[RuleDetails] Requesting product types with:', requestData);

      const response = await global.ProductLgLcService.getProductTypes(requestData);
      console.log('[RuleDetails] Product types response:', response);

      if (!response?.success) {
        console.error('[RuleDetails] Product types fetch failed:', response);
        return {};
      }

      // Extract product types from response
      let productTypes = [];
      const payload = response?.data && typeof response.data === 'object' ? response.data : response;

      if (Array.isArray(payload?.Details)) {
        productTypes = payload.Details;
        console.log('[RuleDetails] Using Details array');
      } else if (Array.isArray(payload?.Details01)) {
        productTypes = payload.Details01;
        console.log('[RuleDetails] Using Details01 array');
      } else if (Array.isArray(payload?.Details02)) {
        productTypes = payload.Details02;
        console.log('[RuleDetails] Using Details02 array');
      } else if (Array.isArray(payload)) {
        productTypes = payload;
        console.log('[RuleDetails] Using payload array');
      }

      console.log('[RuleDetails] Found', productTypes.length, 'product types:', productTypes);

      // Create mapping from ProductTypeID to display name
      const mapping = {};
      productTypes.forEach((pt) => {
        const id = pt.SubCodeID || pt.Value || pt.CodeID || pt.ProductTypeID || pt.ID || '';
        const label = pt.CodeDescription || pt.Description || pt.Label || pt.ProductTypeName || pt.Name || '';
        if (id && label) {
          mapping[id] = label;
          console.log('[RuleDetails] Mapped', id, '→', label);
        }
      });

      console.log('[RuleDetails] Final product type mapping:', mapping);
      rdState.productTypeMapping = mapping;
      return mapping;
    } catch (err) {
      console.error('[RuleDetails] Error loading product types:', err);
      return {};
    }
  }

  async function loadProductAccountingRule() {
    // Try URL parameters first, then fallback to state (set from parent)
    const params = getUrlParameters();
    const acRuleId = params.acRuleId || rdState.accountingRuleId;

    if (!acRuleId) {
      console.log('[RuleDetails] No accounting rule ID provided (URL or parent)');
      return;
    }

    // Store in state for later use
    rdState.accountingRuleId = acRuleId;

    // Ensure ProductLgLcService is available
    if (!global.ProductLgLcService) {
      console.warn('[RuleDetails] ProductLgLcService is not available, skipping product type load');
      return;
    }

    try {
      setToast('Loading Product Accounting Rule...', 'info');

      // Get session data from AuthService or Environment
      let BankID = '00';
      let OurBranchID = '0101';
      let OperatorID = 'WEB_PORTAL';

      // Try to get from AuthService first (from parent window)
      try {
        const parentSession = window.parent?.AuthService?.getSession?.();
        if (parentSession) {
          BankID = parentSession.bankID || parentSession.BankID || parentSession.bankId || BankID;
          OurBranchID = parentSession.branchID || parentSession.BranchID || parentSession.branchId || OurBranchID;
          OperatorID = parentSession.operatorID || parentSession.OperatorID || parentSession.operatorId || OperatorID;
        }
      } catch (e) {
        console.log('[RuleDetails] Could not access parent AuthService:', e.message);
      }

      // Try to get from Environment
      const Environment = window.parent?.Environment || window.Environment || {};
      BankID = Environment.defaultBankId || Environment.bankId || BankID;
      OurBranchID = Environment.defaultOurBranchId || Environment.branchId || OurBranchID;

      // Try to get from localStorage/sessionStorage
      const storageBankID = localStorage.getItem('BankID') || sessionStorage.getItem('BankID');
      const storageBranchID = localStorage.getItem('OurBranchID') || sessionStorage.getItem('OurBranchID');
      const storageOperatorID = localStorage.getItem('OperatorID') || sessionStorage.getItem('OperatorID');

      if (storageBankID) BankID = storageBankID;
      if (storageBranchID) OurBranchID = storageBranchID;
      if (storageOperatorID) OperatorID = storageOperatorID;

      const requestData = {
        BankID: BankID,
        OurBranchID: OurBranchID,
        AcRuleID: acRuleId,
        OperatorID: OperatorID
      };

      console.log('[RuleDetails] Loading product accounting rule with:', requestData);

      // Use ProductLgLcService to call the stored procedure
      const response = await global.ProductLgLcService.getProductAcRule(requestData);
      console.log('[RuleDetails] Product accounting rule response:', response);

      if (!response?.success) {
        console.warn('[RuleDetails] Failed to load product accounting rule:', response);
        setToast('Failed to load Product Accounting Rule details.', 'warning');
        return;
      }

      // Extract product type from response using same logic as accounting-rule.js
      const fullResponse = response?.data && typeof response.data === 'object' ? response.data : response;

      // Extract the record from Details01[0] (primary location for rule data)
      let ruleRecord = null;
      if (Array.isArray(fullResponse?.Details01) && fullResponse.Details01.length > 0) {
        ruleRecord = fullResponse.Details01[0];
      } else if (fullResponse?.Details01 && typeof fullResponse.Details01 === 'object') {
        ruleRecord = fullResponse.Details01;
      }

      if (!ruleRecord && Array.isArray(fullResponse?.Details) && fullResponse.Details.length > 0) {
        ruleRecord = fullResponse.Details[0];
      }

      console.log('[RuleDetails] Raw ruleRecord:', ruleRecord);

      // Use productTypeId from parent state if available, otherwise from API response
      const productTypeId = rdState.productTypeId || ruleRecord?.ProductTypeID || ruleRecord?.ProductType || '';

      // Product type name - use the mapping from system codes
      let productTypeName = '';
      console.log('[RuleDetails] Looking up productTypeId:', productTypeId);
      console.log('[RuleDetails] Available mapping:', rdState.productTypeMapping);

      if (rdState.productTypeMapping && Object.keys(rdState.productTypeMapping).length > 0) {
        if (rdState.productTypeMapping[productTypeId]) {
          productTypeName = rdState.productTypeMapping[productTypeId];
          console.log('[RuleDetails] ✓ Found product type name from mapping:', productTypeName);
        } else {
          console.log('[RuleDetails] ✗ ProductTypeID not found in mapping. Available keys:', Object.keys(rdState.productTypeMapping));
        }
      } else {
        console.warn('[RuleDetails] Mapping is empty or not initialized');
      }

      console.log('[RuleDetails] Final extracted:', { productTypeId, productTypeName });

      if (productTypeId) {
        // Store both ID and name in state
        rdState.productTypeId = productTypeId;
        rdState.productTypeName = productTypeName;

        // Populate the Product Types field with the name/description
        const productTypeInput = qs('#ProductTypes') || qs('input[aria-label="Product Types"]');
        if (productTypeInput) {
          // Display the name if available, otherwise the ID
          const displayValue = productTypeName || productTypeId;
          productTypeInput.value = displayValue;
          productTypeInput.readOnly = true; // Make it read-only since it's linked to the accounting rule
          console.log('[RuleDetails] BEFORE: productTypeInput.value =', productTypeInput.value);
          console.log('[RuleDetails] ACTUAL field value after set:', productTypeInput.value);
          console.log('[RuleDetails] Populated Product Types field with:', displayValue);
          setToast(`Product type loaded: ${displayValue}`, 'success');
        }

        // Now load combos with the product type ID
        console.log('[RuleDetails] Now loading combos with product type:', productTypeId);
        await loadAccountingRuleCombos();
      } else {
        console.warn('[RuleDetails] No product type ID found in response');
      }
    } catch (err) {
      console.error('[RuleDetails] Error loading product accounting rule:', err);
      setToast('Error loading Product Accounting Rule.', 'warning');
    }
  }

  async function ensureSearchServiceLoaded() {
    if (global.SearchService) {
      return true;
    }

    console.log('[RuleDetails] SearchService not found, attempting to load it...');

    try {
      const script = document.createElement('script');
      script.src = '/assets/js/services/shared/searchService.js';
      script.async = false;

      return new Promise((resolve) => {
        script.onload = () => {
          console.log('[RuleDetails] SearchService loaded successfully');
          resolve(!!global.SearchService);
        };
        script.onerror = () => {
          console.error('[RuleDetails] Failed to load SearchService script');
          resolve(false);
        };
        document.head.appendChild(script);
      });
    } catch (err) {
      console.error('[RuleDetails] Error loading SearchService:', err);
      return false;
    }
  }

  async function loadAccountingRuleCombos() {
    // Ensure CoreApi is available
    if (!global.CoreApi) {
      console.error('[RuleDetails] CoreApi is not available');
      setToast('Core API service is not available.', 'danger');
      return;
    }

    setToast('Loading Accounting Rule Combos...', 'info');

    try {
      const Environment = window.parent?.Environment || window.Environment || {};

      // Use the current product type ID as the Module parameter
      // If not set yet, will be populated from URL or accounting rule
      const moduleParam = rdState.productTypeId || 'Product';

      const requestData = {
        RequestID: 'dbo.p_GetSysAccountingRuleCombos',
        FormId: 'dbo.p_GetSysAccountingRuleCombos',
        RequestData: {
          Module: moduleParam,
          LanguageID: 'ENG'
        },
        RequestTime: new Date().toLocaleString('en-GB'),
        AppName: 'PROJECT_KAIRO',
        Checksum: ''
      };

      console.log('[RuleDetails] Loading combos with request:', requestData);

      // Use CoreApi to call the stored procedure directly
      const baseUrl = (Environment.baseUrlCommon || "http://172.16.2.31:3306").replace(/\/+$/, "");
      const endpoint = `${baseUrl}/api/OldAPI`;

      const response = await global.CoreApi.post(endpoint, requestData);
      console.log('[RuleDetails] Combos response:', response);

      if (!response?.success) {
        console.warn('[RuleDetails] Failed to load combos:', response);
        setToast('Failed to load Accounting Rule Combos.', 'warning');
        return;
      }

      // Extract combos from response - Details structure maps to different dropdowns
      const eventComboData = response?.data?.Details || response?.Details || [];
      const debitAccountTagData = response?.data?.Details01 || response?.Details01 || [];
      const creditAccountTagData = response?.data?.Details01 || response?.Details01 || [];
      const eventComponentMapping = response?.data?.Details03 || response?.Details03 || [];

      console.log('[RuleDetails] Event data:', eventComboData);
      console.log('[RuleDetails] Debit account tag data:', debitAccountTagData);
      console.log('[RuleDetails] Credit account tag data:', creditAccountTagData);
      console.log('[RuleDetails] Event-Component mapping:', eventComponentMapping);

      // Populate all dropdowns
      populateEventDropdownFromData(eventComboData);
      populateDebitAccountTagDropdown(debitAccountTagData);
      populateCreditAccountTagDropdown(creditAccountTagData);

      // Store the mapping for later use
      rdState.eventComponentMapping = eventComponentMapping;
      rdState.comboData = {
        events: eventComboData,
        debitTags: debitAccountTagData,
        creditTags: creditAccountTagData,
        mapping: eventComponentMapping
      };

      // Get URL parameters
      const params = getUrlParameters();
      rdState.accountingRuleId = params.acRuleId;
      rdState.productTypeId = params.productTypeId;

      setToast(`Loaded combo data for product type: ${moduleParam}`, 'success');

      // Update button states after loading combos - ensures Add button is enabled even with no details
      updateRuleDetailsButtons();
    } catch (err) {
      console.error('[RuleDetails] Error loading combos:', err);
      setToast('Error loading Accounting Rule Combos. Check console for details.', 'danger');
    }
  }

  function populateEventDropdownFromData(eventData) {
    const eventSelect = qs('#Event');
    if (!eventSelect) return;

    // Clear existing options except the first one (--Select--)
    while (eventSelect.options.length > 1) {
      eventSelect.remove(1);
    }

    // Add event options
    eventData.forEach((event) => {
      const option = document.createElement('option');
      option.value = event.SubCodeID || event.EventID || '';
      option.textContent = event.Description || event.EventDescription || option.value;
      eventSelect.appendChild(option);
    });

    console.log('[RuleDetails] Populated Event dropdown with', eventData.length, 'items');

    // Add change listener to filter components and account tags
    if (!eventSelect._changeListenerAdded) {
      eventSelect.addEventListener('change', () => {
        const selectedEvent = eventSelect.value;
        console.log('[RuleDetails] Event changed to:', selectedEvent);

        if (selectedEvent) {
          // Filter components based on selected event from the mapping (Details03)
          const matchingMappings = rdState.eventComponentMapping.filter(m => m.EventID === selectedEvent);
          const uniqueComponents = [...new Set(matchingMappings.map(m => m.ComponentID))];
          console.log('[RuleDetails] Matching components for event', selectedEvent, ':', uniqueComponents);

          // Populate component dropdown with the matching components
          populateComponentDropdownForEvent(uniqueComponents);
        } else {
          // Reset component dropdown
          populateComponentDropdownForEvent([]);
        }
      });
      eventSelect._changeListenerAdded = true;
    }
  }

  function populateComponentDropdownForEvent(componentIds) {
    const componentSelect = qs('#Component');
    if (!componentSelect) return;

    // Clear existing options except the first one
    while (componentSelect.options.length > 1) {
      componentSelect.remove(1);
    }

    // Get the full component data from state
    const allComponents = rdState.comboData?.mapping || [];

    if (componentIds.length === 0) {
      console.log('[RuleDetails] No components to display');
      return;
    }

    // Add matching component options
    componentIds.forEach((componentId) => {
      // Find component description from the mapping
      const componentData = allComponents.find(m => m.ComponentID === componentId);
      const description = componentData?.Description || componentId;

      const option = document.createElement('option');
      option.value = componentId;
      option.textContent = description;
      componentSelect.appendChild(option);
    });

    console.log('[RuleDetails] Populated Component dropdown with', componentIds.length, 'items');
  }

  function populateDebitAccountTagDropdown(debitTagData) {
    const debitSelect = qs('#DebitAccountTag');
    if (!debitSelect) return;

    // Clear existing options except the first one
    while (debitSelect.options.length > 1) {
      debitSelect.remove(1);
    }

    // Add debit account tag options
    debitTagData.forEach((tag) => {
      const option = document.createElement('option');
      option.value = tag.SubCodeID || '';
      option.textContent = tag.Description || option.value;
      debitSelect.appendChild(option);
    });

    console.log('[RuleDetails] Populated Debit Account Tag dropdown with', debitTagData.length, 'items');

    // Add change listener to debit account tag dropdown
    if (!debitSelect._changeListenerAdded) {
      debitSelect.addEventListener('change', () => {
        const selectedDebit = debitSelect.value;
        console.log('[RuleDetails] Debit Account Tag changed to:', selectedDebit);

        // You can add grid population or other logic here
        onDebitAccountTagChanged(selectedDebit);
      });
      debitSelect._changeListenerAdded = true;
    }
  }

  function populateCreditAccountTagDropdown(creditTagData) {
    const creditSelect = qs('#CreditAccountTag');
    if (!creditSelect) return;

    // Clear existing options except the first one
    while (creditSelect.options.length > 1) {
      creditSelect.remove(1);
    }

    // Add credit account tag options
    creditTagData.forEach((tag) => {
      const option = document.createElement('option');
      option.value = tag.SubCodeID || '';
      option.textContent = tag.Description || option.value;
      creditSelect.appendChild(option);
    });

    console.log('[RuleDetails] Populated Credit Account Tag dropdown with', creditTagData.length, 'items');

    // Add change listener to credit account tag dropdown
    if (!creditSelect._changeListenerAdded) {
      creditSelect.addEventListener('change', () => {
        const selectedCredit = creditSelect.value;
        console.log('[RuleDetails] Credit Account Tag changed to:', selectedCredit);

        // You can add grid population or other logic here
        onCreditAccountTagChanged(selectedCredit);
      });
      creditSelect._changeListenerAdded = true;
    }
  }

  function onDebitAccountTagChanged(debitTag) {
    console.log('[RuleDetails] Debit Account Tag selected:', debitTag);
    // Add logic to handle debit tag selection
    // e.g., populate grid, update form state, etc.
  }

  function onCreditAccountTagChanged(creditTag) {
    console.log('[RuleDetails] Credit Account Tag selected:', creditTag);
    // Add logic to handle credit tag selection
    // e.g., populate grid, update form state, etc.
  }

  function setupComponentToNarrationAutoFill(componentSelect) {
    if (!componentSelect || componentSelect._narrationAutoFillAdded) return;

    const narrationInput = qs('#Narration') || qs('input[aria-label="Narration"]');
    if (!narrationInput) {
      console.warn('[RuleDetails] Narration input field not found for auto-fill setup');
      return;
    }

    componentSelect.addEventListener('change', () => {
      const selectedOption = componentSelect.options[componentSelect.selectedIndex];
      const componentText = selectedOption?.textContent || '';

      if (componentText && componentText !== '--Select--') {
        narrationInput.value = componentText;
        console.log('[RuleDetails] Auto-filled Narration with:', componentText);
      }
    });

    componentSelect._narrationAutoFillAdded = true;
    console.log('[RuleDetails] Component-to-Narration auto-fill listener added');
  }

  async function enrichRowsWithTransactionDetails(rows, BankID, EventID) {
    try {
      console.log('[RuleDetails] Enriching rows with transaction details...');

      // Check if service is available
      if (!global.ProductLgLcService?.getProductAcRuleTrx) {
        console.warn('[RuleDetails] ProductLgLcService.getProductAcRuleTrx not available');
        return rows;
      }

      // Get ProductID and Module from state
      const productTypeId = rdState.productTypeId || 'Product';

      const requestData = {
        BankID: BankID,
        ProductID: productTypeId,
        EventID: EventID,
        Module: productTypeId
      };

      console.log('[RuleDetails] Fetching transaction details with:', requestData);

      const response = await global.ProductLgLcService.getProductAcRuleTrx(requestData);
      console.log('[RuleDetails] Transaction details response:', response);

      if (!response?.success) {
        console.warn('[RuleDetails] Failed to load transaction details:', response);
        return rows; // Return original rows if fetch fails
      }

      // Extract transaction data from response
      const trxData = response?.data || response;
      let transactions = [];

      // Try different response structures
      if (Array.isArray(trxData?.Details)) {
        transactions = trxData.Details;
      } else if (Array.isArray(trxData?.Details01)) {
        transactions = trxData.Details01;
      } else if (Array.isArray(trxData)) {
        transactions = trxData;
      }

      console.log('[RuleDetails] Found', transactions.length, 'transaction records');

      // Create a lookup map for transactions by ComponentID
      const trxMap = {};
      transactions.forEach(trx => {
        const componentID = trx.ComponentID || trx.Component || '';
        if (componentID) {
          if (!trxMap[componentID]) {
            trxMap[componentID] = [];
          }
          trxMap[componentID].push(trx);
        }
      });

      console.log('[RuleDetails] Transaction map:', trxMap);

      // Enrich each row with transaction details
      const enrichedRows = rows.map(row => {
        const componentID = row.ComponentID || row.Component || '';
        const componentTrxs = trxMap[componentID] || [];

        // Find debit and credit transactions
        const debitTrx = componentTrxs.find(t =>
          (t.TrxType === 'DR' || t.TrxType === 'Debit' || t.DrCr === 'DR')
        );
        const creditTrx = componentTrxs.find(t =>
          (t.TrxType === 'CR' || t.TrxType === 'Credit' || t.DrCr === 'CR')
        );

        // Enrich row with transaction descriptions
        return {
          ...row,
          DebitTrxID: debitTrx?.TrxDescription || debitTrx?.Description || row.DebitTrxID || row.DrTrxDescription || '',
          CreditTrxID: creditTrx?.TrxDescription || creditTrx?.Description || row.CreditTrxID || row.CrTrxDescription || '',
          DrTrxDescription: debitTrx?.TrxDescription || debitTrx?.Description || row.DrTrxDescription || '',
          CrTrxDescription: creditTrx?.TrxDescription || creditTrx?.Description || row.CrTrxDescription || ''
        };
      });

      console.log('[RuleDetails] Enriched rows with transaction details:', enrichedRows);
      return enrichedRows;

    } catch (err) {
      console.error('[RuleDetails] Error enriching rows with transaction details:', err);
      return rows; // Return original rows on error
    }
  }

  async function loadRuleDetailsGrid() {
    try {
      console.log('[RuleDetails] INFO: Loading Rule Details Grid...');

      // Get required parameters
      let BankID = '00';
      let OurBranchID = '0101';
      let OperatorID = '101';

      try {
        const parentSession = window.parent?.AuthService?.userSession || window.AuthService?.userSession || {};
        if (parentSession && typeof parentSession === 'object') {
          BankID = parentSession.bankID || parentSession.BankID || parentSession.bankId || BankID;
          OurBranchID = parentSession.branchID || parentSession.BranchID || parentSession.branchId || OurBranchID;
          OperatorID = parentSession.operatorID || parentSession.OperatorID || parentSession.operatorId || OperatorID;
        }
      } catch (e) {
        console.log('[RuleDetails] Could not access parent AuthService:', e.message);
      }

      // Try to get from Environment
      const Environment = window.parent?.Environment || window.Environment || {};
      BankID = Environment.defaultBankId || Environment.bankId || BankID;
      OurBranchID = Environment.defaultOurBranchId || Environment.branchId || OurBranchID;

      // Try to get from localStorage/sessionStorage
      const storageBankID = localStorage.getItem('BankID') || sessionStorage.getItem('BankID');
      const storageBranchID = localStorage.getItem('OurBranchID') || sessionStorage.getItem('OurBranchID');
      const storageOperatorID = localStorage.getItem('OperatorID') || sessionStorage.getItem('OperatorID');

      if (storageBankID) BankID = storageBankID;
      if (storageBranchID) OurBranchID = storageBranchID;
      if (storageOperatorID) OperatorID = storageOperatorID;

      // Get the current selections from dropdowns
      const acRuleId = rdState.accountingRuleId || '';
      const eventSelect = qs('#Event');
      const sysEventID = eventSelect?.value || '';

      if (!acRuleId || !sysEventID) {
        console.warn('[RuleDetails] Missing required data: AcRuleID or EventID');
        setToast('Please select an Accounting Rule and Event first.', 'warning');
        return;
      }

      const requestData = {
        BankID: BankID,
        AcRuleID: acRuleId,
        SysEventID: sysEventID,
        OurBranchID: OurBranchID,
        OperatorID: OperatorID
      };

      console.log('[RuleDetails] Loading grid data with request:', requestData);

      // Call the ProductLgLcService
      if (!global.ProductLgLcService?.getProductAcRuleDetail) {
        console.error('[RuleDetails] ProductLgLcService.getProductAcRuleDetail not available');
        setToast('Service not available.', 'danger');
        return;
      }

      const response = await global.ProductLgLcService.getProductAcRuleDetail(requestData);
      console.log('[RuleDetails] Grid data response:', response);

      if (!response?.success) {
        console.warn('[RuleDetails] Failed to load grid data:', response);
        setToast('Failed to load Rule Details.', 'warning');
        return;
      }

      // Extract and populate grid
      // Response structure: { success: true, data: { Details: [...], Details01: [...], Details02: [...], Details03: [...] } }
      let rows = [];
      let dropdownData = {};

      console.log('[RuleDetails] Response structure check:', {
        hasData: !!response.data,
        hasDetails: !!response.Details,
        dataIsArray: Array.isArray(response.data),
        hasDataDetails: Array.isArray(response.data?.Details),
        hasDataDetails01: Array.isArray(response.data?.Details01),
        hasDataDetails02: Array.isArray(response.data?.Details02),
        hasDataDetails03: Array.isArray(response.data?.Details03)
      });

      const gridData = response?.data || response;
      console.log('[RuleDetails] Grid data after extraction:', gridData);
      console.log('[RuleDetails] Details01 content:', gridData?.Details01);
      console.log('[RuleDetails] Details02 content:', gridData?.Details02);
      console.log('[RuleDetails] Details03 content:', gridData?.Details03);

      // PRIORITY: Try Details01 first (this is where the actual grid data is)
      if (Array.isArray(gridData?.Details01)) {
        console.log('[RuleDetails] ✓ Using gridData.Details01 as the grid data source');
        rows = gridData.Details01;
      }
      // FALLBACK: Then try Details if Details01 is not available
      else if (Array.isArray(gridData?.Details)) {
        console.log('[RuleDetails] ✓ Details01 not found, using gridData.Details instead');
        rows = gridData.Details;
      }
      // FINAL FALLBACK: Try as direct array
      else if (Array.isArray(gridData)) {
        console.log('[RuleDetails] ✓ Using gridData directly (it\'s an array)');
        rows = gridData;
      } else {
        console.warn('[RuleDetails] ✗ Could not find row data in any expected format');
      }

      // Extract dropdown data from response
      // Details02 may contain available components for this rule
      // Details03 may contain available debit/credit tags for this rule
      if (Array.isArray(gridData?.Details02)) {
        console.log('[RuleDetails] ✓ Extracting dropdown data from Details02 (Components)');
        dropdownData.components = gridData.Details02;
      }

      if (Array.isArray(gridData?.Details03)) {
        console.log('[RuleDetails] ✓ Extracting dropdown data from Details03 (Tags)');
        dropdownData.tags = gridData.Details03;
      }

      // Store dropdown data in state for use in Add button handler
      rdState.currentRuleDropdownData = {
        components: dropdownData.components || [],
        debitTags: dropdownData.tags || [],
        creditTags: dropdownData.tags || []
      };

      console.log('[RuleDetails] Stored dropdown data:', rdState.currentRuleDropdownData);
      console.log('[RuleDetails] Final extracted', rows.length, 'rows for grid:', JSON.stringify(rows));

      // Fetch transaction details for each row to populate Debit Trx ID and Credit Trx ID
      if (rows.length > 0) {
        console.log('[RuleDetails] Fetching transaction details for', rows.length, 'rows');
        rows = await enrichRowsWithTransactionDetails(rows, BankID, sysEventID);
      }

      // Always call populateRuleDetailsGrid even if rows is empty
      console.log('[RuleDetails] About to call populateRuleDetailsGrid with', rows.length, 'rows');
      populateRuleDetailsGrid(rows);

      // Update button states after loading grid data
      updateRuleDetailsButtons();

      if (rows.length > 0) {
        setToast(`Loaded ${rows.length} rule detail(s).`, 'success');
      } else {
        setToast('No rule details found for this event.', 'info');
      }
    } catch (err) {
      console.error('[RuleDetails] Error loading grid:', err);
      setToast('Error loading Rule Details. Check console for details.', 'danger');
    }
  }

  async function loadEventSpecificDropdowns() {
    try {
      const eventSelect = qs('#Event');
      const selectedEventID = eventSelect?.value;

      if (!selectedEventID) {
        console.warn('[RuleDetails] No event selected');
        return;
      }

      console.log('[RuleDetails] Loading dropdowns for event:', selectedEventID);

      // Filter component mappings for this event
      const eventMappings = rdState.comboData.mapping?.filter(m => m.EventID === selectedEventID) || [];
      const uniqueComponentIds = [...new Set(eventMappings.map(m => m.ComponentID))];

      console.log('[RuleDetails] Components for event', selectedEventID, ':', uniqueComponentIds);

      // Populate Component dropdown with filtered components
      const componentSelect = qs('#Component');
      if (componentSelect) {
        while (componentSelect.options.length > 1) {
          componentSelect.remove(1);
        }

        uniqueComponentIds.forEach(componentId => {
          // Look up the description from the mapping data
          const componentData = rdState.comboData.mapping?.find(m => m.ComponentID === componentId);
          const description = componentData?.Description || componentId;

          const option = document.createElement('option');
          option.value = componentId;
          option.textContent = description;  // Display description instead of ID
          componentSelect.appendChild(option);
        });
        console.log('[RuleDetails] Component dropdown populated with', uniqueComponentIds.length, 'items');

        // Set up Component-to-Narration auto-fill
        setupComponentToNarrationAutoFill(componentSelect);
      }

      // Populate Debit Account Tag dropdown
      const debitSelect = qs('#DebitAccountTag');
      if (debitSelect && rdState.comboData.debitTags) {
        while (debitSelect.options.length > 1) {
          debitSelect.remove(1);
        }

        rdState.comboData.debitTags.forEach(tag => {
          const option = document.createElement('option');
          option.value = tag.SubCodeID || tag.DebitAccountTagID || '';
          option.textContent = tag.Description || tag.DebitAccountTag || option.value;
          debitSelect.appendChild(option);
        });
        console.log('[RuleDetails] Debit Account Tag dropdown populated with', rdState.comboData.debitTags.length, 'items');
      }

      // Populate Credit Account Tag dropdown
      const creditSelect = qs('#CreditAccountTag');
      if (creditSelect && rdState.comboData.creditTags) {
        while (creditSelect.options.length > 1) {
          creditSelect.remove(1);
        }

        rdState.comboData.creditTags.forEach(tag => {
          const option = document.createElement('option');
          option.value = tag.SubCodeID || tag.CreditAccountTagID || '';
          option.textContent = tag.Description || tag.CreditAccountTag || option.value;
          creditSelect.appendChild(option);
        });
        console.log('[RuleDetails] Credit Account Tag dropdown populated with', rdState.comboData.creditTags.length, 'items');
      }

      setToast('Dropdowns loaded for selected event', 'success');
    } catch (err) {
      console.error('[RuleDetails] Error loading event-specific dropdowns:', err);
      setToast('Error loading dropdowns. Check console for details.', 'danger');
    }
  }

  function populateRuleDetailsGrid(rows) {
    try {
      // Try to find tbody in multiple ways - account for different DOM structures
      let tbody = qs('#RuleDetailsBody');

      // If not found in current document, try looking for table body more broadly
      if (!tbody) {
        tbody = document.querySelector('tbody#RuleDetailsBody');
      }

      // If still not found, try finding the table and its tbody
      if (!tbody) {
        const table = qs('table');
        if (table && table.querySelector('tbody')) {
          tbody = table.querySelector('tbody');
          console.log('[RuleDetails] Found tbody via table search');
        }
      }

      console.log('[RuleDetails] populateRuleDetailsGrid called with rows:', rows);
      console.log('[RuleDetails] rows.length:', rows?.length);
      console.log('[RuleDetails] rows type:', typeof rows);
      console.log('[RuleDetails] Looking for tbody with id="RuleDetailsBody"');
      console.log('[RuleDetails] tbody found?', !!tbody);
      console.log('[RuleDetails] tbody element:', tbody?.tagName, tbody?.id);

      if (!tbody) {
        console.error('[RuleDetails] ✗ CRITICAL: Grid body element (#RuleDetailsBody) not found!');
        console.log('[RuleDetails] Available tbodies on page:', document.querySelectorAll('tbody').length);
        document.querySelectorAll('tbody').forEach((el, idx) => {
          console.log('[RuleDetails] tbody[' + idx + ']:', el.id || 'no-id', el.className, 'children:', el.children.length);
        });
        return;
      }

      console.log('[RuleDetails] ✓ Grid body element found');
      console.log('[RuleDetails] Clearing existing rows');

      // Clear existing rows
      tbody.innerHTML = '';

      console.log('[RuleDetails] BEFORE check - rows:', rows);
      console.log('[RuleDetails] BEFORE check - !rows:', !rows);
      console.log('[RuleDetails] BEFORE check - rows.length:', rows?.length);
      console.log('[RuleDetails] BEFORE check - rows.length === 0:', rows?.length === 0);
      console.log('[RuleDetails] BEFORE check - Array.isArray(rows):', Array.isArray(rows));

      if (!rows || rows.length === 0) {
        console.warn('[RuleDetails] EMPTY STATE: rows is null/undefined or empty');
        console.log('[RuleDetails] rows value:', rows);
        console.log('[RuleDetails] rows?.length:', rows?.length);

        // Only show empty message if truly empty (not an empty array we just initialized)
        // Check if this is initial load vs. after adding records
        const isInitialLoad = !Array.isArray(rows) || (Array.isArray(rows) && rdState.rules.length === 0);

        if (isInitialLoad) {
          // Show empty message with guidance
          tbody.innerHTML = `
            <tr>
              <td colspan="5" class="py-4 text-center text-muted">
                <i class="bi bi-inbox display-6 d-block mb-2"></i>
                <small><strong>No records loaded.</strong><br/>Click the <em>Add</em> button to create a new rule detail, or click <em>View</em> to load existing details.</small>
              </td>
            </tr>
          `;
          console.log('[RuleDetails] ✓ Empty state displayed');
        }

        // Store rules in state even if empty
        rdState.rules = rows || [];
        updateRuleDetailsButtons();
        return;
      }

      console.log('[RuleDetails] PROCEED: rows has data, populating grid with', rows.length, 'rows');

      // Populate grid rows with proper field mapping
      rows.forEach((row, index) => {
        console.log('[RuleDetails] Processing row', index + 1, ':', row);

        const tr = document.createElement('tr');

        // Map response fields to grid columns (show display values)
        const component = row.Component || row.ComponentID || row.ComponentName || '';
        const debitAccountTag = row.DebitAccountTag || row.DrAccountTag || row.DrAccountTagID || row.DebitAccountTagID || '';
        const creditAccountTag = row.CreditAccountTag || row.CrAccountTag || row.CrAccountTagID || row.CreditAccountTagID || '';
        const debitTrxID = row.DebitTrxID || row.DrTrxDescription || row.DrTrxDescriptionID || '';
        const creditTrxID = row.CreditTrxID || row.CrTrxDescription || row.CrTrxDescriptionID || '';
        const narration = row.Narration || row.NarrationText || '';

        console.log('[RuleDetails] Row data for grid:', { component, debitAccountTag, creditAccountTag, debitTrxID, creditTrxID, narration });

        // Log all possible keys for debugging
        console.log('[RuleDetails][DEBUG] Raw row object:', row);


        tr.innerHTML = `
          <td>${component}</td>
          <td>${debitAccountTag}</td>
          <td>${creditAccountTag}</td>
          <td>${debitTrxID}</td>
          <td>${creditTrxID}</td>
        `;

        // Add data attributes for row reference (use all possible keys)
        tr.dataset.slNo = row.SLNo || row.SlNo || index + 1;
        tr.dataset.eventID = row.EventID || row.SysEventID || '';
        tr.dataset.componentID = row.ComponentID || row.Component || '';
        tr.dataset.componentDisplay = component;  // Store the display text for matching
        tr.dataset.drAccountTagID = row.DrAccountTagID || row.DebitAccountTagID || row.DrAccountTag || row.DebitAccountTag || '';
        tr.dataset.crAccountTagID = row.CrAccountTagID || row.CreditAccountTagID || row.CrAccountTag || row.CreditAccountTag || '';
        tr.dataset.narration = narration;

        // Log the data attributes for this row
        console.log('[RuleDetails][DEBUG] Set data attributes:', {
          componentID: tr.dataset.componentID,
          drAccountTagID: tr.dataset.drAccountTagID,
          crAccountTagID: tr.dataset.crAccountTagID,
          narration: tr.dataset.narration
        });

        tbody.appendChild(tr);

        console.log('[RuleDetails] ✓ Added row', index + 1, '- Component:', component);
      });

      console.log('[RuleDetails] ✓ Grid populated with', rows.length, 'rows successfully');
      console.log('[RuleDetails] tbody now contains', tbody.rows.length, 'rows');
      console.log('[RuleDetails][DEBUG] tbody innerHTML after population:', tbody.innerHTML);
      console.log('[RuleDetails][DEBUG] First cell of first row:', tbody.rows.length > 0 ? tbody.rows[0].cells[0]?.textContent : 'No rows');

      // Store rules in state to enable buttons
      rdState.rules = rows;
      updateRuleDetailsButtons();

      // Bind click handlers to grid rows
      bindGridRowClickHandlers();
    } catch (error) {
      console.error('[RuleDetails] ERROR in populateRuleDetailsGrid:', error);
      console.error('[RuleDetails] Error stack:', error.stack);
    }
  }

  function bindGridRowClickHandlers() {
    const tbody = qs('#RuleDetailsBody');
    const rows = qsa('#RuleDetailsBody tr', tbody);

    rows.forEach((row, index) => {
      // Skip empty state row
      if (row.cells.length === 1 && row.cells[0].getAttribute('colspan') === '5') {
        return;
      }

      row.style.cursor = 'pointer';
      row.addEventListener('click', function () {
        populateInputFieldsFromRow(this);
      });
    });
  }

  function populateInputFieldsFromRow(row) {
    // Clear previous selection highlight
    const allRows = qsa('#RuleDetailsBody tr');
    allRows.forEach(r => r.classList.remove('table-active'));

    // Highlight selected row
    row.classList.add('table-active');

    // Get data from row attributes (IDs and display values)
    const componentID = row.dataset.componentID || '';
    const componentDisplay = row.dataset.componentDisplay || '';  // Use stored display text
    const drAccountTagID = row.dataset.drAccountTagID || '';
    const crAccountTagID = row.dataset.crAccountTagID || '';
    const narration = row.dataset.narration || '';

    // Also get display text from cells as fallback
    const cells = row.querySelectorAll('td');
    const cellComponentDisplay = cells.length > 0 ? cells[0].textContent.trim() : '';
    const debitDisplay = cells.length > 1 ? cells[1].textContent.trim() : '';
    const creditDisplay = cells.length > 2 ? cells[2].textContent.trim() : '';

    // Log what is being read from the row
    console.log('[RuleDetails][DEBUG] Reading from row:', {
      componentID,
      componentDisplay,
      drAccountTagID,
      crAccountTagID,
      narration,
      cellComponentDisplay,
      debitDisplay,
      creditDisplay
    });

    // Helper function to find form fields with multiple selector strategies
    function findFormField(primaryId, ariaLabelPattern) {
      let field = qs('#' + primaryId);
      if (field) {
        console.log('[RuleDetails][DEBUG] Found field by ID:', primaryId);
        return field;
      }

      // Try aria-label selector
      if (ariaLabelPattern) {
        field = qs(`[aria-label*="${ariaLabelPattern}"]`);
        if (field) {
          console.log('[RuleDetails][DEBUG] Found field by aria-label pattern:', ariaLabelPattern);
          return field;
        }
      }

      // Try name attribute
      field = qs(`[name="${primaryId}"]`);
      if (field) {
        console.log('[RuleDetails][DEBUG] Found field by name:', primaryId);
        return field;
      }

      console.warn('[RuleDetails][DEBUG] Could not find field:', primaryId, ariaLabelPattern);
      return null;
    }

    // Populate input fields with flexible selector strategy
    const componentSelect = findFormField('Component', 'Component');
    const debitSelect = findFormField('DebitAccountTag', 'Debit');
    const creditSelect = findFormField('CreditAccountTag', 'Credit');
    const narrationInput = findFormField('Narration', 'Narration');

    console.log('[RuleDetails][DEBUG] Form fields found:', {
      componentSelect: !!componentSelect,
      debitSelect: !!debitSelect,
      creditSelect: !!creditSelect,
      narrationInput: !!narrationInput
    });

    console.log('[RuleDetails] Populating fields - Component:', componentID, 'DebitTag:', drAccountTagID, 'CreditTag:', crAccountTagID);

    // Populate Component dropdown (match by display text first, then ID)
    if (componentSelect) {
      console.log('[RuleDetails][DEBUG] Available Component options:', Array.from(componentSelect.options).map(o => ({ value: o.value, text: o.text })));

      // Use the stored componentDisplay or fall back to cell text
      const effectiveComponentDisplay = componentDisplay || cellComponentDisplay;

      const componentOption = Array.from(componentSelect.options).find(opt => {
        // Prioritize matching by text (description) first
        const matches = opt.text === effectiveComponentDisplay ||
          opt.text.trim() === effectiveComponentDisplay ||
          opt.value === componentID;
        if (!matches) console.log('[RuleDetails][DEBUG] Component option check:', { optValue: opt.value, optText: opt.text, componentID, effectiveComponentDisplay });
        return matches;
      });

      if (componentOption) {
        componentSelect.value = componentOption.value;
        componentSelect.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('[RuleDetails] ✓ Component set to:', componentOption.value, '(' + componentOption.text + ')');
      } else {
        console.warn('[RuleDetails] ✗ Component option not found for ID:', componentID, 'Display:', effectiveComponentDisplay);
        console.log('[RuleDetails][DEBUG] Available values:', Array.from(componentSelect.options).map(o => o.value).join(', '));
      }
    }

    // Populate Debit Account Tag dropdown (match by ID)
    if (debitSelect) {
      console.log('[RuleDetails][DEBUG] Available Debit options:', Array.from(debitSelect.options).map(o => ({ value: o.value, text: o.text })));

      // Try to find by value (ID) first, then by text
      const debitOption = Array.from(debitSelect.options).find(opt => {
        const matches = opt.value === drAccountTagID || opt.text === debitDisplay || opt.text.trim() === debitDisplay;
        if (!matches) console.log('[RuleDetails][DEBUG] Debit option check:', { optValue: opt.value, optText: opt.text, drAccountTagID, debitDisplay });
        return matches;
      });

      if (debitOption) {
        debitSelect.value = debitOption.value;
        debitSelect.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('[RuleDetails] ✓ Debit Account Tag set to:', debitOption.value, '(' + debitOption.text + ')');
      } else {
        console.warn('[RuleDetails] ✗ Debit Account Tag option not found for ID:', drAccountTagID, 'Display:', debitDisplay);
        console.log('[RuleDetails][DEBUG] Available values:', Array.from(debitSelect.options).map(o => o.value).join(', '));
      }
    }

    // Populate Credit Account Tag dropdown (match by ID)
    if (creditSelect) {
      console.log('[RuleDetails][DEBUG] Available Credit options:', Array.from(creditSelect.options).map(o => ({ value: o.value, text: o.text })));

      // Try to find by value (ID) first, then by text
      const creditOption = Array.from(creditSelect.options).find(opt => {
        const matches = opt.value === crAccountTagID || opt.text === creditDisplay || opt.text.trim() === creditDisplay;
        if (!matches) console.log('[RuleDetails][DEBUG] Credit option check:', { optValue: opt.value, optText: opt.text, crAccountTagID, creditDisplay });
        return matches;
      });

      if (creditOption) {
        creditSelect.value = creditOption.value;
        creditSelect.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('[RuleDetails] ✓ Credit Account Tag set to:', creditOption.value, '(' + creditOption.text + ')');
      } else {
        console.warn('[RuleDetails] ✗ Credit Account Tag option not found for ID:', crAccountTagID, 'Display:', creditDisplay);
        console.log('[RuleDetails][DEBUG] Available values:', Array.from(creditSelect.options).map(o => o.value).join(', '));
      }
    }

    // Populate Narration input
    if (narrationInput) {
      narrationInput.value = narration;
      console.log('[RuleDetails] ✓ Narration set to:', narration);
    } else {
      console.warn('[RuleDetails] ✗ Narration input field not found');
    }

    console.log('[RuleDetails] Input fields populated from row data');
  }

  function extractCombos(response) {
    const payload = response?.data && typeof response.data === 'object' ? response.data : response;
    if (!payload) return [];

    console.log('[RuleDetails] Extracting combos from payload:', payload);

    // Check for Details array (primary structure)
    if (Array.isArray(payload.Details)) {
      return payload.Details;
    }

    // Check if payload itself is an array
    if (Array.isArray(payload)) {
      return payload;
    }

    // Check for nested Details01
    if (Array.isArray(payload.Details01)) {
      return payload.Details01;
    }

    // Check for nested Details02
    if (Array.isArray(payload.Details02)) {
      return payload.Details02;
    }

    return [];
  }

  function populateEventDropdown(combos) {
    const eventSelect = qs('#Event') || qs('select[aria-label="Event"]');
    if (!eventSelect) return;

    // Filter combos by product type if specified
    let filteredCombos = combos;
    if (rdState.productTypeId) {
      filteredCombos = combos.filter(c => (c.ProductTypeID || c.ProductType) === rdState.productTypeId);
    }

    // Get unique events from filtered combos
    const uniqueEvents = [...new Set(filteredCombos.map(c => c.EventID || c.Event || '').filter(Boolean))];

    // Clear existing options (keep --Select--)
    while (eventSelect.options.length > 1) {
      eventSelect.remove(1);
    }

    // Add event options
    uniqueEvents.forEach((event) => {
      const option = document.createElement('option');
      option.value = event;
      option.textContent = event;
      eventSelect.appendChild(option);
    });

    // Add change listener
    if (!eventSelect._changeListenerAdded) {
      eventSelect.addEventListener('change', () => {
        const selectedEvent = eventSelect.value;
        const productTypeInput = qs('#ProductTypes') || qs('input[aria-label="Product Types"]');

        if (selectedEvent) {
          let matchingCombos = rdState.combos.filter(c => (c.EventID || c.Event) === selectedEvent);

          // If product type is specified, filter by that too
          if (rdState.productTypeId) {
            matchingCombos = matchingCombos.filter(c => (c.ProductTypeID || c.ProductType) === rdState.productTypeId);
          }

          const productTypeIds = [...new Set(matchingCombos.map(c => c.ProductTypeID || c.ProductType || '').filter(Boolean))];
          if (productTypeInput) {
            // Display product type names instead of IDs using the mapping
            const productTypeNames = productTypeIds.map(id => rdState.productTypeMapping?.[id] || id);
            productTypeInput.value = productTypeNames.join(', ');
          }

          // Repopulate Component and Account Tag dropdowns based on selected event
          populateComponentDropdowns(matchingCombos);

          rdState.filteredCombos = matchingCombos;
          populateComboGridPanel(matchingCombos);
        } else {
          if (productTypeInput) {
            // Reset to the originally loaded product type name
            const originalName = rdState.productTypeName || rdState.productTypeId || '';
            productTypeInput.value = originalName;
          }
          // Reset all dropdowns
          populateComponentDropdowns([]);
          rdState.filteredCombos = [];
          populateComboGridPanel([]);
        }
      });
      eventSelect._changeListenerAdded = true;
    }

    console.log('[RuleDetails] Event dropdown populated with', uniqueEvents.length, 'events');
  }

  function populateComponentDropdowns(combos) {
    const componentSelect = qs('#Component') || qs('select[aria-label*="Component"]');
    const debitSelect = qs('#DebitAccountTag') || qs('select[aria-label*="Debit"]');
    const creditSelect = qs('#CreditAccountTag') || qs('select[aria-label*="Credit"]');

    // Get unique components
    const uniqueComponents = [...new Set(combos.map(c => c.Component || c.ComponentID || '').filter(Boolean))];
    const uniqueDebitTags = [...new Set(combos.map(c => c.DebitAccountTag || '').filter(Boolean))];
    const uniqueCreditTags = [...new Set(combos.map(c => c.CreditAccountTag || '').filter(Boolean))];

    if (componentSelect) {
      while (componentSelect.options.length > 1) {
        componentSelect.remove(1);
      }
      uniqueComponents.forEach(comp => {
        const opt = document.createElement('option');
        opt.value = comp;
        opt.textContent = comp;
        componentSelect.appendChild(opt);
      });
    }

    if (debitSelect) {
      while (debitSelect.options.length > 1) {
        debitSelect.remove(1);
      }
      uniqueDebitTags.forEach(tag => {
        const opt = document.createElement('option');
        opt.value = tag;
        opt.textContent = tag;
        debitSelect.appendChild(opt);
      });
    }

    if (creditSelect) {
      while (creditSelect.options.length > 1) {
        creditSelect.remove(1);
      }
      uniqueCreditTags.forEach(tag => {
        const opt = document.createElement('option');
        opt.value = tag;
        opt.textContent = tag;
        creditSelect.appendChild(opt);
      });
    }
  }

  function populateComboGridPanel(combos) {
    const tbody = qs('#ruleDetailsGridPanel tbody');
    if (!tbody) return;

    // Clear existing rows
    tbody.innerHTML = '';

    if (!combos || combos.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="5" class="py-2">No Records To Display</td>';
      tbody.appendChild(tr);
      updateRuleDetailsButtons();
      return;
    }

    combos.forEach((combo, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${combo.Component || combo.ComponentID || ''}</td>
        <td>${combo.DebitAccountTag || ''}</td>
        <td>${combo.CreditAccountTag || ''}</td>
        <td>${combo.DebitTrxID || ''}</td>
        <td>${combo.CreditTrxID || ''}</td>
      `;
      tr.style.cursor = 'pointer';

      // Add selection handler
      tr.addEventListener('click', () => {
        // Remove active class from all rows
        qsa('#ruleDetailsGridPanel tbody tr').forEach(row => row.classList.remove('table-active'));
        // Add active class to clicked row
        tr.classList.add('table-active');
        rdState.selectedCombo = combo;
        rdState.selectedComboIndex = rdState.filteredCombos.indexOf(combo);
        populateRuleDetailsFields(combo);
        updateRuleDetailsButtons();
      });

      tbody.appendChild(tr);
    });

    console.log('[RuleDetails] Grid populated with', combos.length, 'rule(s)');
    updateRuleDetailsButtons();
  }

  function populateRuleDetailsFields(combo) {
    const componentSelect = qs('#Component') || qs('select[aria-label*="Component"]');
    const debitSelect = qs('#DebitAccountTag') || qs('select[aria-label*="Debit"]');
    const creditSelect = qs('#CreditAccountTag') || qs('select[aria-label*="Credit"]');
    const narrationInput = qs('#Narration') || qs('input[aria-label="Narration"]');

    if (componentSelect) componentSelect.value = combo.Component || combo.ComponentID || '';
    if (debitSelect) debitSelect.value = combo.DebitAccountTag || '';
    if (creditSelect) creditSelect.value = combo.CreditAccountTag || '';
    if (narrationInput) narrationInput.value = combo.Narration || '';

    console.log('[RuleDetails] Rule details fields populated');
  }

  function bindActionButtons() {
    const actionBtns = qsa('button[data-inline-action]');

    console.log('[RuleDetails] ========== BINDING ACTION BUTTONS ==========');
    console.log('[RuleDetails] Found', actionBtns.length, 'action buttons');
    actionBtns.forEach((btn, idx) => {
      console.log('[RuleDetails] Button[' + idx + ']:', btn.getAttribute('data-inline-action'), 'disabled:', btn.disabled);
    });

    if (actionBtns.length >= 5) {
      // New button
      actionBtns[0].addEventListener('click', () => {
        console.log('[RuleDetails] NEW button clicked');
        const hasLoaded = rdState.rules && rdState.rules.length > 0;

        // FIRST: Get field references BEFORE anything else
        const componentSelect = qs('#Component') || qs('select[aria-label*="Component"]');
        const debitSelect = qs('#DebitAccountTag') || qs('select[aria-label*="Debit"]');
        const creditSelect = qs('#CreditAccountTag') || qs('select[aria-label*="Credit"]');
        const narrationInput = qs('#Narration') || qs('input[aria-label="Narration"]');

        console.log('[RuleDetails] NEW: Field references obtained');
        console.log('[RuleDetails] NEW: componentSelect:', !!componentSelect);
        console.log('[RuleDetails] NEW: debitSelect:', !!debitSelect);
        console.log('[RuleDetails] NEW: creditSelect:', !!creditSelect);
        console.log('[RuleDetails] NEW: narrationInput:', !!narrationInput);

        // SECOND: Clear the form
        clearRuleDetailsForm();

        // THIRD: Explicitly ENABLE all fields IMMEDIATELY (BEFORE setFormMode)
        if (componentSelect) {
          componentSelect.disabled = false;
          console.log('[RuleDetails] NEW: Enabled componentSelect');
        }
        if (debitSelect) {
          debitSelect.disabled = false;
          console.log('[RuleDetails] NEW: Enabled debitSelect');
        }
        if (creditSelect) {
          creditSelect.disabled = false;
          console.log('[RuleDetails] NEW: Enabled creditSelect');
        }
        if (narrationInput) {
          narrationInput.disabled = false;
          console.log('[RuleDetails] NEW: Enabled narrationInput');
        }

        // Verify they are enabled
        console.log('[RuleDetails] NEW: After enable - Component disabled:', componentSelect?.disabled);
        console.log('[RuleDetails] NEW: After enable - Debit disabled:', debitSelect?.disabled);
        console.log('[RuleDetails] NEW: After enable - Credit disabled:', creditSelect?.disabled);
        console.log('[RuleDetails] NEW: After enable - Narration disabled:', narrationInput?.disabled);

        // FOURTH: Set form mode (this will also enable fields, but won't override our setting)
        setFormMode(MODES.ADD);

        // FIFTH: Get the selected event and populate dropdowns accordingly
        const eventSelect = qs('#Event');
        const selectedEventID = eventSelect?.value;

        console.log('[RuleDetails] NEW: Selected Event ID:', selectedEventID);

        // Use dropdown data from the current rule response if available
        const componentsData = rdState.currentRuleDropdownData?.components || rdState.comboData?.mapping || [];
        const debitTagsData = rdState.currentRuleDropdownData?.debitTags || rdState.comboData?.debitTags || [];
        const creditTagsData = rdState.currentRuleDropdownData?.creditTags || rdState.comboData?.creditTags || [];

        console.log('[RuleDetails] NEW: Using dropdown data:', {
          hasCurrentRuleData: !!rdState.currentRuleDropdownData,
          componentsCount: componentsData.length,
          debitTagsCount: debitTagsData.length,
          creditTagsCount: creditTagsData.length
        });

        if (selectedEventID) {
          // Event is selected - populate Component dropdown ONLY with components for this event
          console.log('[RuleDetails] NEW: Event selected, loading event-specific components');

          // Filter components based on the selected event from current rule data
          const eventMappings = componentsData.filter(m => !m.EventID || m.EventID === selectedEventID);
          const uniqueComponentIds = [...new Set(eventMappings.map(m => m.ComponentID || m.Component))].filter(Boolean);

          console.log('[RuleDetails] NEW: Components for event', selectedEventID, ':', uniqueComponentIds);

          // Clear component dropdown and populate with event-specific components
          if (componentSelect) {
            while (componentSelect.options.length > 1) {
              componentSelect.remove(1);
            }

            uniqueComponentIds.forEach(componentId => {
              const componentData = componentsData.find(m => m.ComponentID === componentId || m.Component === componentId);
              const description = componentData?.Description || componentId;

              const option = document.createElement('option');
              option.value = componentId;
              option.textContent = description;
              componentSelect.appendChild(option);
            });

            console.log('[RuleDetails] NEW: Populated Component dropdown with', uniqueComponentIds.length, 'items for this event');

            // Set up Component-to-Narration auto-fill
            setupComponentToNarrationAutoFill(componentSelect);
          }

          // Populate Debit Account Tag dropdown
          if (debitSelect && debitTagsData) {
            while (debitSelect.options.length > 1) {
              debitSelect.remove(1);
            }

            debitTagsData.forEach(tag => {
              const option = document.createElement('option');
              option.value = tag.SubCodeID || tag.DebitAccountTagID || tag.TagID || '';
              option.textContent = tag.Description || tag.DebitAccountTag || option.value;
              debitSelect.appendChild(option);
            });

            console.log('[RuleDetails] NEW: Populated Debit Account Tag dropdown with', debitTagsData.length, 'items');
          }

          // Populate Credit Account Tag dropdown
          if (creditSelect && creditTagsData) {
            while (creditSelect.options.length > 1) {
              creditSelect.remove(1);
            }

            creditTagsData.forEach(tag => {
              const option = document.createElement('option');
              option.value = tag.SubCodeID || tag.CreditAccountTagID || tag.TagID || '';
              option.textContent = tag.Description || tag.CreditAccountTag || option.value;
              creditSelect.appendChild(option);
            });

            console.log('[RuleDetails] NEW: Populated Credit Account Tag dropdown with', creditTagsData.length, 'items');
          }
        } else {
          // No event selected - clear Component dropdown with message
          console.log('[RuleDetails] NEW: No event selected, clearing Component dropdown');

          if (componentSelect) {
            while (componentSelect.options.length > 1) {
              componentSelect.remove(1);
            }
            // Add placeholder option
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = '--Select an Event first--';
            placeholderOption.disabled = true;
            componentSelect.appendChild(placeholderOption);
          }
        }

        // Final check
        console.log('[RuleDetails] NEW: Final state - Component disabled:', componentSelect?.disabled);
        console.log('[RuleDetails] NEW: Final state - Debit disabled:', debitSelect?.disabled);
        console.log('[RuleDetails] NEW: Final state - Credit disabled:', creditSelect?.disabled);
        console.log('[RuleDetails] NEW: Final state - Narration disabled:', narrationInput?.disabled);

        if (!hasLoaded) {
          setToast('No records loaded. You can create a new rule detail. Enter the details and click Save.', 'info');
        } else {
          setToast('Enter rule details and click Save to add.', 'info');
        }
      });

      // Alter button - enables editing of selected row
      actionBtns[1].addEventListener('click', async () => {
        console.log('[RuleDetails] ALTER button clicked');

        // Check if there's a selected row in the grid
        const selectedRow = qs('#RuleDetailsBody tr.table-active');

        if (!selectedRow || selectedRow.cells.length === 1) {
          setToast('Please select a row from the grid to edit.', 'warning');
          return;
        }

        // Get field references
        const componentSelect = qs('#Component') || qs('select[aria-label*="Component"]');
        const debitSelect = qs('#DebitAccountTag') || qs('select[aria-label*="Debit"]');
        const creditSelect = qs('#CreditAccountTag') || qs('select[aria-label*="Credit"]');
        const narrationInput = qs('#Narration') || qs('input[aria-label="Narration"]');
        const eventSelect = qs('#Event');

        // First, ensure dropdowns are populated for the current event
        const selectedEventID = eventSelect?.value;
        if (selectedEventID) {
          console.log('[RuleDetails] ALTER: Populating dropdowns for event:', selectedEventID);
          await loadEventSpecificDropdowns();
        }

        // Now populate the form fields from the selected row
        // This will set the dropdown values to match the row data
        populateInputFieldsFromRow(selectedRow);

        // Enable all fields for editing
        if (componentSelect) {
          componentSelect.disabled = false;
          console.log('[RuleDetails] ALTER: Component enabled');
        }
        if (debitSelect) {
          debitSelect.disabled = false;
          console.log('[RuleDetails] ALTER: Debit enabled');
        }
        if (creditSelect) {
          creditSelect.disabled = false;
          console.log('[RuleDetails] ALTER: Credit enabled');
        }
        if (narrationInput) {
          narrationInput.disabled = false;
          console.log('[RuleDetails] ALTER: Narration enabled');
        }

        // Set mode to EDIT
        setFormMode(MODES.EDIT);

        // Store the selected row data and index for later update
        const rowIndex = Array.from(selectedRow.parentElement.children).indexOf(selectedRow);
        rdState.selectedCombo = {
          rowElement: selectedRow,
          rowIndex: rowIndex,
          componentID: selectedRow.dataset.componentID,
          drAccountTagID: selectedRow.dataset.drAccountTagID,
          crAccountTagID: selectedRow.dataset.crAccountTagID,
          narration: selectedRow.dataset.narration
        };

        console.log('[RuleDetails] ALTER: Row data stored:', rdState.selectedCombo);
        setToast('Edit the fields and click Update to save changes.', 'info');
      });

      // Remove button
      actionBtns[2].addEventListener('click', () => {
        console.log('[RuleDetails] ========== REMOVE BUTTON CLICKED ==========');

        // Check if there's a selected row in the grid
        const selectedRow = qs('#RuleDetailsBody tr.table-active');

        console.log('[RuleDetails] Selected row:', selectedRow);
        console.log('[RuleDetails] Selected row cells length:', selectedRow?.cells?.length);
        console.log('[RuleDetails] rdState.rules:', rdState.rules);
        console.log('[RuleDetails] rdState.rules length:', rdState.rules?.length);

        if (!selectedRow || selectedRow.cells.length === 1) {
          console.warn('[RuleDetails] No valid row selected');
          setToast('Please select a row from the grid to remove.', 'warning');
          return;
        }

        // Get the row index
        const tbody = selectedRow.parentElement;
        const allRows = Array.from(tbody.children);
        const rowIndex = allRows.indexOf(selectedRow);

        console.log('[RuleDetails] Total rows in tbody:', allRows.length);
        console.log('[RuleDetails] Row index:', rowIndex);
        console.log('[RuleDetails] Row to remove:', {
          index: rowIndex,
          componentID: selectedRow.dataset.componentID,
          drAccountTagID: selectedRow.dataset.drAccountTagID,
          crAccountTagID: selectedRow.dataset.crAccountTagID
        });

        // Confirm deletion
        if (!confirm('Remove this rule detail? This action cannot be undone.')) {
          console.log('[RuleDetails] User cancelled deletion');
          return;
        }

        console.log('[RuleDetails] User confirmed deletion');

        // Validate rdState.rules exists and has items
        if (!rdState.rules || !Array.isArray(rdState.rules)) {
          console.error('[RuleDetails] rdState.rules is not an array:', rdState.rules);
          setToast('Error: Cannot remove record - data structure invalid.', 'danger');
          return;
        }

        if (rdState.rules.length === 0) {
          console.error('[RuleDetails] rdState.rules is empty');
          setToast('Error: No records to remove.', 'danger');
          return;
        }

        // Validate row index
        if (rowIndex < 0 || rowIndex >= rdState.rules.length) {
          console.error('[RuleDetails] Invalid row index:', rowIndex, 'Array length:', rdState.rules.length);
          setToast('Error: Invalid row selection.', 'danger');
          return;
        }

        console.log('[RuleDetails] BEFORE removal - rdState.rules:', JSON.stringify(rdState.rules));
        console.log('[RuleDetails] Removing record at index:', rowIndex);
        console.log('[RuleDetails] Record to remove:', rdState.rules[rowIndex]);

        // Remove from rdState.rules array
        const removedRecord = rdState.rules.splice(rowIndex, 1);

        console.log('[RuleDetails] AFTER removal - rdState.rules:', JSON.stringify(rdState.rules));
        console.log('[RuleDetails] Removed record:', removedRecord);
        console.log('[RuleDetails] Remaining records count:', rdState.rules.length);

        // Refresh the grid
        console.log('[RuleDetails] Refreshing grid with', rdState.rules.length, 'records');
        populateRuleDetailsGrid(rdState.rules);

        // Clear form fields
        clearRuleDetailsForm();

        // Reset to VIEW mode
        setFormMode(MODES.VIEW);

        // Clear selection state
        rdState.selectedCombo = null;
        rdState.selectedComboIndex = -1;

        setToast('Rule detail removed successfully.', 'success');
        console.log('[RuleDetails] ========== REMOVE OPERATION COMPLETED ==========');
      });

      // Update button - handles both ADD and EDIT modes
      console.log('[RuleDetails] Binding Update button (actionBtns[3])');
      console.log('[RuleDetails] Update button element:', actionBtns[3]);
      console.log('[RuleDetails] Update button text:', actionBtns[3]?.textContent);
      console.log('[RuleDetails] Update button disabled:', actionBtns[3]?.disabled);

      actionBtns[3].addEventListener('click', (event) => {
        console.log('[RuleDetails] ========================================');
        console.log('[RuleDetails] UPDATE BUTTON CLICKED!');
        console.log('[RuleDetails] Event:', event);
        console.log('[RuleDetails] Target:', event.target);
        console.log('[RuleDetails] Current mode:', rdState.mode);
        console.log('[RuleDetails] MODES.ADD:', MODES.ADD);
        console.log('[RuleDetails] Mode is ADD?', rdState.mode === MODES.ADD);
        console.log('[RuleDetails] Button disabled?', actionBtns[3].disabled);
        console.log('[RuleDetails] ========================================');

        if (rdState.mode === MODES.ADD) {
          // ADD mode: Create new record from form fields and add to grid
          console.log('[RuleDetails] Processing ADD mode - creating new record');

          // Get form field values
          const componentSelect = qs('#Component');
          const debitSelect = qs('#DebitAccountTag');
          const creditSelect = qs('#CreditAccountTag');
          const narrationInput = qs('#Narration');
          const eventSelect = qs('#Event');

          const componentID = componentSelect?.value || '';
          const componentText = componentSelect?.options[componentSelect?.selectedIndex]?.textContent || '';
          const debitTagID = debitSelect?.value || '';
          const debitTagText = debitSelect?.options[debitSelect?.selectedIndex]?.textContent || '';
          const creditTagID = creditSelect?.value || '';
          const creditTagText = creditSelect?.options[creditSelect?.selectedIndex]?.textContent || '';
          const narration = narrationInput?.value || '';
          const eventID = eventSelect?.value || '';

          console.log('[RuleDetails] Form values:', { componentID, debitTagID, creditTagID, narration, eventID });

          // Validate required fields
          if (!componentID || !debitTagID || !creditTagID) {
            setToast('Please fill in all required fields (Component, Debit Tag, Credit Tag).', 'warning');
            return;
          }

          // Create new record object
          const newRecord = {
            SLNo: (rdState.rules?.length || 0) + 1,
            EventID: eventID,
            ComponentID: componentID,
            Component: componentText,
            DrAccountTagID: debitTagID,
            DebitAccountTag: debitTagText,
            CrAccountTagID: creditTagID,
            CreditAccountTag: creditTagText,
            DrTrxDescription: '',  // Not in current form
            DebitTrxID: '',
            CrTrxDescription: '',  // Not in current form
            CreditTrxID: '',
            Narration: narration
          };

          console.log('[RuleDetails] New record created:', newRecord);

          // Add to rules array
          if (!rdState.rules) {
            rdState.rules = [];
          }
          rdState.rules.push(newRecord);

          console.log('[RuleDetails] Added to rdState.rules, total records:', rdState.rules.length);
          console.log('[RuleDetails] Current rdState.rules:', rdState.rules);

          // Refresh grid
          console.log('[RuleDetails] Calling populateRuleDetailsGrid with', rdState.rules.length, 'records');
          populateRuleDetailsGrid(rdState.rules);

          // Update button states after successful add
          const sideButtonsContainer = qs('.action-panel .action-buttons');
          if (sideButtonsContainer) {
            const sideBtns = qsa('button[data-action]', sideButtonsContainer);
            const saveBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'save');
            const cancelBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'cancel');
            const viewBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'view');
            const addBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'add');
            const editBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'edit');
            const delBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'delete');
            
            setButtonDisabled(saveBtn, false);     // Enable Save
            setButtonDisabled(cancelBtn, false);   // Enable Cancel
            setButtonDisabled(viewBtn, false);     // Enable View
            setButtonDisabled(addBtn, true);       // Disable Add
            setButtonDisabled(editBtn, false);     // Enable Edit (grid has records)
            setButtonDisabled(delBtn, false);      // Enable Delete (grid has records)
          }
          
          // Update inline action buttons
          const newBtn = actionBtns[0];
          const alterBtn = actionBtns[1];
          const removeBtn = actionBtns[2];
          const clearBtn = actionBtns[4];
          
          setButtonDisabled(newBtn, false);       // Enable New
          setButtonDisabled(alterBtn, false);     // Enable Alter
          setButtonDisabled(removeBtn, false);    // Enable Remove
          setButtonDisabled(actionBtns[3], true); // Disable Update
          setButtonDisabled(clearBtn, true);      // Disable Clear
          
          console.log('[RuleDetails] ADD: Button states after grid population:');
          console.log('[RuleDetails] - New ENABLED:', !newBtn?.disabled);
          console.log('[RuleDetails] - Alter ENABLED:', !alterBtn?.disabled);
          console.log('[RuleDetails] - Remove ENABLED:', !removeBtn?.disabled);
          console.log('[RuleDetails] - Update disabled:', actionBtns[3]?.disabled);
          console.log('[RuleDetails] - Clear disabled:', clearBtn?.disabled);

          // Clear form fields (except Product Types and Event)
          if (componentSelect) componentSelect.value = '';
          if (debitSelect) debitSelect.value = '';
          if (creditSelect) creditSelect.value = '';
          if (narrationInput) narrationInput.value = '';
          // Keep Event dropdown selected so user can add more records for same event

          // Reset to VIEW mode
          setFormMode(MODES.VIEW);

          setToast('Rule detail added to grid successfully.', 'success');
          console.log('[RuleDetails] ADD operation completed successfully');

        } else if (rdState.mode === MODES.EDIT && rdState.selectedCombo) {
          // EDIT mode: Update the existing record with amended values
          console.log('[RuleDetails] Processing EDIT mode - updating existing record');

          // Get form field values (the amended values)
          const componentSelect = qs('#Component');
          const debitSelect = qs('#DebitAccountTag');
          const creditSelect = qs('#CreditAccountTag');
          const narrationInput = qs('#Narration');
          const eventSelect = qs('#Event');

          const componentID = componentSelect?.value || '';
          const componentText = componentSelect?.options[componentSelect?.selectedIndex]?.textContent || '';
          const debitTagID = debitSelect?.value || '';
          const debitTagText = debitSelect?.options[debitSelect?.selectedIndex]?.textContent || '';
          const creditTagID = creditSelect?.value || '';
          const creditTagText = creditSelect?.options[creditSelect?.selectedIndex]?.textContent || '';
          const narration = narrationInput?.value || '';
          const eventID = eventSelect?.value || '';

          console.log('[RuleDetails] Amended form values:', { componentID, debitTagID, creditTagID, narration, eventID });

          // Validate required fields
          if (!componentID || !debitTagID || !creditTagID) {
            setToast('Please fill in all required fields (Component, Debit Tag, Credit Tag).', 'warning');
            return;
          }

          // Find the record in rdState.rules using the rowIndex
          const rowIndex = rdState.selectedCombo.rowIndex;
          if (rowIndex >= 0 && rowIndex < rdState.rules.length) {
            // Update the record in the array
            rdState.rules[rowIndex] = {
              ...rdState.rules[rowIndex],
              EventID: eventID,
              ComponentID: componentID,
              Component: componentText,
              DrAccountTagID: debitTagID,
              DebitAccountTag: debitTagText,
              CrAccountTagID: creditTagID,
              CreditAccountTag: creditTagText,
              Narration: narration
            };

            console.log('[RuleDetails] Updated record at index', rowIndex, ':', rdState.rules[rowIndex]);

            // Refresh grid with updated data
            console.log('[RuleDetails] Refreshing grid with updated data');
            populateRuleDetailsGrid(rdState.rules);

            // Update button states after successful update
            const sideButtonsContainer = qs('.action-panel .action-buttons');
            if (sideButtonsContainer) {
              const sideBtns = qsa('button[data-action]', sideButtonsContainer);
              const saveBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'save');
              const cancelBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'cancel');
              const viewBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'view');
              const editBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'edit');
              const delBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'delete');
              
              setButtonDisabled(saveBtn, false);     // Enable Save
              setButtonDisabled(cancelBtn, false);   // Enable Cancel
              setButtonDisabled(viewBtn, false);     // Enable View
              setButtonDisabled(editBtn, false);     // Enable Edit (grid has records)
              setButtonDisabled(delBtn, false);      // Enable Delete (grid has records)
            }
            
            // Update inline action buttons
            const newBtn = actionBtns[0];
            const alterBtn = actionBtns[1];
            const removeBtn = actionBtns[2];
            const clearBtn = actionBtns[4];
            
            setButtonDisabled(newBtn, false);       // Enable New
            setButtonDisabled(alterBtn, false);     // Enable Alter
            setButtonDisabled(removeBtn, false);    // Enable Remove
            setButtonDisabled(actionBtns[3], true); // Disable Update
            setButtonDisabled(clearBtn, true);      // Disable Clear
            
            console.log('[RuleDetails] EDIT: Button states after grid population:');
            console.log('[RuleDetails] - New ENABLED:', !newBtn?.disabled);
            console.log('[RuleDetails] - Alter ENABLED:', !alterBtn?.disabled);
            console.log('[RuleDetails] - Remove ENABLED:', !removeBtn?.disabled);
            console.log('[RuleDetails] - Update disabled:', actionBtns[3]?.disabled);
            console.log('[RuleDetails] - Clear disabled:', clearBtn?.disabled);

            // Clear form fields
            if (componentSelect) componentSelect.value = '';
            if (debitSelect) debitSelect.value = '';
            if (creditSelect) creditSelect.value = '';
            if (narrationInput) narrationInput.value = '';

            // Reset to VIEW mode
            setFormMode(MODES.VIEW);

            // Clear selection
            rdState.selectedCombo = null;
            rdState.selectedComboIndex = -1;

            setToast('Rule detail updated successfully.', 'success');
            console.log('[RuleDetails] EDIT operation completed successfully');
          } else {
            console.error('[RuleDetails] Invalid row index:', rowIndex);
            setToast('Error: Could not find the record to update.', 'danger');
          }
        } else {
          setToast('Please select a rule detail to update.', 'warning');
        }
      });

      // Clear button
      actionBtns[4].addEventListener('click', () => {
        console.log('[RuleDetails] Clear button clicked');
        console.log('[RuleDetails] Clearing form fields and resetting to VIEW mode');

        // Get form field references
        const componentSelect = qs('#Component') || qs('select[aria-label*="Component"]');
        const debitSelect = qs('#DebitAccountTag') || qs('select[aria-label*="Debit"]');
        const creditSelect = qs('#CreditAccountTag') || qs('select[aria-label*="Credit"]');
        const narrationInput = qs('#Narration') || qs('input[aria-label="Narration"]');

        // Reset dropdowns to default "--Select--" option
        if (componentSelect) {
          componentSelect.value = '';
          console.log('[RuleDetails] Component dropdown reset to default');
        }
        if (debitSelect) {
          debitSelect.value = '';
          console.log('[RuleDetails] Debit Account Tag dropdown reset to default');
        }
        if (creditSelect) {
          creditSelect.value = '';
          console.log('[RuleDetails] Credit Account Tag dropdown reset to default');
        }

        // Clear narration field
        if (narrationInput) {
          narrationInput.value = '';
          console.log('[RuleDetails] Narration field cleared');
        }

        // Clear grid row selection (remove highlight)
        const allRows = qsa('#RuleDetailsBody tr');
        allRows.forEach(r => r.classList.remove('table-active'));
        console.log('[RuleDetails] Grid row selection cleared');

        // Clear selection state but keep rules data intact
        rdState.selectedCombo = null;
        rdState.selectedComboIndex = -1;
        console.log('[RuleDetails] Selection state cleared');

        // Reset to VIEW mode - this will disable Clear and Update buttons
        // and enable New, Alter, Remove buttons (based on grid state)
        setFormMode(MODES.VIEW);
        console.log('[RuleDetails] Mode reset to VIEW');

        setToast('Form cleared. Grid data preserved.', 'info');
        console.log('[RuleDetails] Clear operation completed - form cleared, buttons updated');
      });
    }

    // Bind the View button in the Actions card
    bindViewButton();
  }

  function bindViewButton() {
    // Find the View button - use data-action attribute
    let viewButton = qs('button[data-action="view"]');
    if (!viewButton) {
      // Fallback to old selector
      viewButton = qs('.action-panel button[data-action="view"]');
    }
    if (viewButton) {
      // Remove any existing listeners to prevent duplicates
      const newBtn = viewButton.cloneNode(true);
      viewButton.parentNode?.replaceChild(newBtn, viewButton);
      viewButton = newBtn;
      viewButton.addEventListener('click', async () => {
        console.log('[RuleDetails] View button clicked');
        // Check if event is selected
        const eventSelect = qs('#Event');
        if (!eventSelect || !eventSelect.value) {
          setToast('Please select an event first', 'warning');
          return;
        }
        // Load event-specific dropdowns
        await loadEventSpecificDropdowns();
        // Prepare request for ProductLgLcService.getProductAcRuleDetail
        let BankID = '00';
        let OurBranchID = '0101';
        let OperatorID = '101';
        try {
          const parentSession = window.parent?.AuthService?.userSession || window.AuthService?.userSession || {};
          if (parentSession && typeof parentSession === 'object') {
            BankID = parentSession.bankID || parentSession.BankID || parentSession.bankId || BankID;
            OurBranchID = parentSession.branchID || parentSession.BranchID || parentSession.branchId || OurBranchID;
            OperatorID = parentSession.operatorID || parentSession.OperatorID || parentSession.operatorId || OperatorID;
          }
        } catch (e) { }
        const acRuleId = rdState.accountingRuleId || '';
        const sysEventID = eventSelect.value;
        if (!acRuleId || !sysEventID) {
          setToast('Please select an Accounting Rule and Event first.', 'warning');
          return;
        }
        const requestData = {
          BankID: BankID,
          AcRuleID: acRuleId,
          SysEventID: sysEventID,
          OurBranchID: OurBranchID,
          OperatorID: OperatorID
        };
        console.log('[RuleDetails] Calling ProductLgLcService.getProductAcRuleDetail with:', requestData);
        if (!global.ProductLgLcService?.getProductAcRuleDetail) {
          setToast('Service not available.', 'danger');
          return;
        }
        const response = await global.ProductLgLcService.getProductAcRuleDetail(requestData);
        console.log('[RuleDetails] Service response:', response);
        let rows = [];
        const gridData = response?.data || response;
        if (Array.isArray(gridData?.Details01)) {
          rows = gridData.Details01;
        } else if (Array.isArray(gridData?.Details)) {
          rows = gridData.Details;
        } else if (Array.isArray(gridData)) {
          rows = gridData;
        }
        console.log('[RuleDetails][DEBUG] rows to populate grid:', rows);
        // Populate the grid with rows from service response (do NOT clear here, populateRuleDetailsGrid will do it)
        populateRuleDetailsGrid(rows);
        
        // If no records found, disable View button and enable Add/Cancel buttons
        if (rows.length === 0) {
          console.log('[RuleDetails] No records found - adjusting button states');
          const sideButtonsContainer = qs('.action-panel .action-buttons');
          if (sideButtonsContainer) {
            const sideBtns = qsa('button[data-action]', sideButtonsContainer);
            const viewBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'view');
            const addBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'add');
            const cancelBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'cancel');
            
            setButtonDisabled(viewBtn, true);      // Disable View button
            setButtonDisabled(addBtn, false);      // Enable Add button
            setButtonDisabled(cancelBtn, false);   // Enable Cancel button
            
            console.log('[RuleDetails] Button states updated - View:', viewBtn?.disabled, 'Add:', addBtn?.disabled, 'Cancel:', cancelBtn?.disabled);
          }
        }
        
        // Only auto-populate if there are real data rows
        if (rows.length > 0) {
          const tbody = qs('#RuleDetailsBody');
          if (tbody && tbody.rows.length > 0) {
            const firstRow = tbody.rows[0];
            // Check if this is a real data row (has 5+ cells and not placeholder)
            if (firstRow.cells.length >= 5 && !firstRow.textContent.includes('No records to display')) {
              console.log('[RuleDetails][DEBUG] Auto-populating form from first row');
              populateInputFieldsFromRow(firstRow);
            } else {
              console.warn('[RuleDetails][DEBUG] First row is placeholder, skipping auto-populate. Cells:', firstRow.cells.length);
            }
          } else {
            console.warn('[RuleDetails][DEBUG] tbody is empty or not found after grid population');
          }
        }
        setToast(`Loaded ${rows.length} rule detail(s).`, rows.length > 0 ? 'success' : 'info');
      });
      console.log('[RuleDetails] View button bound successfully');
    } else {
      console.warn('[RuleDetails] View button not found');
    }
  }

  function bindSideButtons() {
    // Find the side panel buttons using the actual HTML structure
    // The buttons are in .action-panel .action-buttons
    const sideButtonsContainer = qs('.action-panel .action-buttons');

    if (!sideButtonsContainer) {
      console.warn('[RuleDetails] Side buttons container not found');
      return;
    }

    const sideBtns = qsa('button[data-action]', sideButtonsContainer);

    if (!sideBtns || sideBtns.length === 0) {
      console.warn('[RuleDetails] No side buttons found in container');
      return;
    }

    console.log('[RuleDetails] Found', sideBtns.length, 'side buttons');

    // Map buttons by their data-action attribute for reliability
    const viewBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'view');
    const addBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'add');
    const editBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'edit');
    const delBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'delete');
    const saveBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'save');
    const cancelBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'cancel');

    console.log('[RuleDetails] Side buttons mapped:', {
      view: !!viewBtn,
      add: !!addBtn,
      edit: !!editBtn,
      delete: !!delBtn,
      save: !!saveBtn,
      cancel: !!cancelBtn
    });

    viewBtn?.addEventListener('click', () => {
      clearRuleDetailsForm();
      setFormMode(MODES.VIEW);
      setToast('View mode activated.', 'info');
    });

    addBtn?.addEventListener('click', () => {
      console.log('[RuleDetails] ADD (side button) clicked');
      const hasLoaded = rdState.rules && rdState.rules.length > 0;

      // FIRST: Get field references BEFORE anything else
      const componentSelect = qs('#Component') || qs('select[aria-label*="Component"]');
      const debitSelect = qs('#DebitAccountTag') || qs('select[aria-label*="Debit"]');
      const creditSelect = qs('#CreditAccountTag') || qs('select[aria-label*="Credit"]');
      const narrationInput = qs('#Narration') || qs('input[aria-label="Narration"]');
      const eventSelect = qs('#Event');
      const productTypesInput = qs('#ProductTypes');

      console.log('[RuleDetails] ADD: Field references obtained');
      console.log('[RuleDetails] ADD: componentSelect:', !!componentSelect);
      console.log('[RuleDetails] ADD: debitSelect:', !!debitSelect);
      console.log('[RuleDetails] ADD: creditSelect:', !!creditSelect);
      console.log('[RuleDetails] ADD: narrationInput:', !!narrationInput);

      // SECOND: Clear the form
      clearRuleDetailsForm();

      // THIRD: Explicitly ENABLE rule detail fields and DISABLE filter fields
      if (componentSelect) {
        componentSelect.disabled = false;
        console.log('[RuleDetails] ADD: Enabled componentSelect');
      }
      if (debitSelect) {
        debitSelect.disabled = false;
        console.log('[RuleDetails] ADD: Enabled debitSelect');
      }
      if (creditSelect) {
        creditSelect.disabled = false;
        console.log('[RuleDetails] ADD: Enabled creditSelect');
      }
      if (narrationInput) {
        narrationInput.disabled = false;
        console.log('[RuleDetails] ADD: Enabled narrationInput');
      }

      console.log('[RuleDetails] ADD: Fields explicitly configured');

      // FOURTH: Set form mode
      setFormMode(MODES.ADD);

      // FOURTH-B: Re-enforce Event and ProductTypes disabling AFTER setFormMode
      if (eventSelect) {
        eventSelect.disabled = true;
        console.log('[RuleDetails] ADD: Re-enforced Event dropdown disabled');
      }
      if (productTypesInput) {
        productTypesInput.disabled = true;
        console.log('[RuleDetails] ADD: Re-enforced ProductTypes input disabled');
      }

      // FIFTH: Update button states - only Cancel, Update, and Clear should be active
      const sideButtonsContainer = qs('.action-panel .action-buttons');
      if (sideButtonsContainer) {
        const sideBtns = qsa('button[data-action]', sideButtonsContainer);
        const viewBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'view');
        const addBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'add');
        const editBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'edit');
        const delBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'delete');
        const saveBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'save');
        const cancelBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'cancel');
        const backBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'back');
        
        setButtonDisabled(viewBtn, true);      // Disable View
        setButtonDisabled(addBtn, true);       // Disable Add
        setButtonDisabled(editBtn, true);      // Disable Edit
        setButtonDisabled(delBtn, true);       // Disable Delete
        setButtonDisabled(saveBtn, true);      // Disable Save
        setButtonDisabled(cancelBtn, false);   // Enable Cancel
        setButtonDisabled(backBtn, true);      // Disable Back
        
        console.log('[RuleDetails] ADD: Button states updated - Cancel:', !cancelBtn?.disabled);
      }
      
      // UPDATE: Also update inline action buttons
      const actionBtns = qsa('button[data-inline-action]');
      if (actionBtns.length >= 5) {
        setButtonDisabled(actionBtns[0], true);    // New - DISABLE (should not be activated)
        setButtonDisabled(actionBtns[1], true);    // Alter - disable
        setButtonDisabled(actionBtns[2], true);    // Remove - disable
        setButtonDisabled(actionBtns[3], false);   // Update - ENABLE
        setButtonDisabled(actionBtns[4], false);   // Clear - ENABLE
        
        console.log('[RuleDetails] ADD: Inline action button states - New disabled:', actionBtns[0]?.disabled, 'Alter disabled:', actionBtns[1]?.disabled, 'Remove disabled:', actionBtns[2]?.disabled, 'Update enabled:', !actionBtns[3]?.disabled, 'Clear enabled:', !actionBtns[4]?.disabled);
      }

      // SIXTH: Get the selected event and populate dropdowns accordingly
      const selectedEventID = eventSelect?.value;

      console.log('[RuleDetails] ADD: Selected Event ID:', selectedEventID);

      // Use dropdown data from the current rule response if available
      const componentsData = rdState.currentRuleDropdownData?.components || rdState.comboData?.mapping || [];
      const debitTagsData = rdState.currentRuleDropdownData?.debitTags || rdState.comboData?.debitTags || [];
      const creditTagsData = rdState.currentRuleDropdownData?.creditTags || rdState.comboData?.creditTags || [];

      console.log('[RuleDetails] ADD: Using dropdown data:', {
        hasCurrentRuleData: !!rdState.currentRuleDropdownData,
        componentsCount: componentsData.length,
        debitTagsCount: debitTagsData.length,
        creditTagsCount: creditTagsData.length
      });

      if (selectedEventID) {
        // Event is selected - populate Component dropdown ONLY with components for this event
        console.log('[RuleDetails] ADD: Event selected, loading event-specific components');

        // Filter components based on the selected event from current rule data
        const eventMappings = componentsData.filter(m => !m.EventID || m.EventID === selectedEventID);
        const uniqueComponentIds = [...new Set(eventMappings.map(m => m.ComponentID || m.Component))].filter(Boolean);

        console.log('[RuleDetails] ADD: Components for event', selectedEventID, ':', uniqueComponentIds);

        // Clear component dropdown and populate with event-specific components
        if (componentSelect) {
          while (componentSelect.options.length > 1) {
            componentSelect.remove(1);
          }

          uniqueComponentIds.forEach(componentId => {
            const componentData = componentsData.find(m => m.ComponentID === componentId || m.Component === componentId);
            const description = componentData?.Description || componentId;

            const option = document.createElement('option');
            option.value = componentId;
            option.textContent = description;
            componentSelect.appendChild(option);
          });

          console.log('[RuleDetails] ADD: Populated Component dropdown with', uniqueComponentIds.length, 'items for this event');
        }

        // Populate Debit Account Tag dropdown
        if (debitSelect && debitTagsData) {
          while (debitSelect.options.length > 1) {
            debitSelect.remove(1);
          }

          debitTagsData.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.SubCodeID || tag.DebitAccountTagID || tag.TagID || '';
            option.textContent = tag.Description || tag.DebitAccountTag || option.value;
            debitSelect.appendChild(option);
          });

          console.log('[RuleDetails] ADD: Populated Debit Account Tag dropdown with', debitTagsData.length, 'items');
        }

        // Populate Credit Account Tag dropdown
        if (creditSelect && creditTagsData) {
          while (creditSelect.options.length > 1) {
            creditSelect.remove(1);
          }

          creditTagsData.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.SubCodeID || tag.CreditAccountTagID || tag.TagID || '';
            option.textContent = tag.Description || tag.CreditAccountTag || option.value;
            creditSelect.appendChild(option);
          });

          console.log('[RuleDetails] ADD: Populated Credit Account Tag dropdown with', creditTagsData.length, 'items');
        }
      } else {
        // No event selected - clear Component dropdown with message
        console.log('[RuleDetails] ADD: No event selected, clearing Component dropdown');

        if (componentSelect) {
          while (componentSelect.options.length > 1) {
            componentSelect.remove(1);
          }
          // Add placeholder option
          const placeholderOption = document.createElement('option');
          placeholderOption.value = '';
          placeholderOption.textContent = '--Select an Event first--';
          placeholderOption.disabled = true;
          componentSelect.appendChild(placeholderOption);
        }
      }

      if (!hasLoaded) {
        setToast('No records loaded. You can create a new rule detail. Enter the details and click Save.', 'info');
      } else {
        setToast('Add mode activated. Fill in the details and click Update or Clear.', 'info');
      }
    });

    editBtn?.addEventListener('click', () => {
      if (rdState.selectedCombo) {
        // Populate form fields from selected combo
        populateRuleDetailsFields(rdState.selectedCombo);
        setFormMode(MODES.EDIT);
        setToast('Edit mode activated. Modify the details and click Save.', 'info');
      } else {
        setToast('Please select a rule detail to edit.', 'warning');
      }
    });

    delBtn?.addEventListener('click', () => {
      if (rdState.selectedCombo) {
        const component = rdState.selectedCombo.Component || rdState.selectedCombo.ComponentID || '';
        if (confirm(`Delete rule detail for '${component}'? This action cannot be undone.`)) {
          removeRuleDetail();
        }
      }
    });

    saveBtn?.addEventListener('click', () => {
      if (rdState.mode === MODES.ADD || rdState.mode === MODES.EDIT) {
        saveRuleDetail();
      }
    });

    cancelBtn?.addEventListener('click', () => {
      console.log('[RuleDetails] Cancel button clicked');
      console.log('[RuleDetails] Clearing form and resetting to VIEW mode');

      // Clear all form fields
      clearRuleDetailsForm();

      // Clear Event dropdown
      const eventSelect = qs('#Event');
      if (eventSelect) {
        eventSelect.value = '';
        eventSelect.disabled = false;  // Re-enable Event dropdown
        console.log('[RuleDetails] Event dropdown cleared and re-enabled');
      }
      
      // Re-enable ProductTypes input
      const productTypesInput = qs('#ProductTypes');
      if (productTypesInput) {
        productTypesInput.disabled = false;  // Re-enable ProductTypes input
        console.log('[RuleDetails] ProductTypes input re-enabled');
      }

      // Clear grid data - reset to empty state
      const tbody = qs('#RuleDetailsBody');
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="py-4 text-center text-muted">
              <i class="bi bi-inbox display-6 d-block mb-2"></i>
              <small>No records to display</small>
            </td>
          </tr>
        `;
        console.log('[RuleDetails] Grid cleared and reset to empty state');
      }

      // Clear state data
      rdState.rules = [];
      rdState.selectedCombo = null;
      rdState.selectedComboIndex = -1;
      rdState.currentRuleDropdownData = null;
      rdState.accountingRuleId = null;
      console.log('[RuleDetails] State data cleared');

      // Reset form mode back to VIEW (disables all input fields)
      setFormMode(MODES.VIEW);
      
      // Re-enable View and Back buttons after VIEW mode
      ensureBackButtonAlwaysEnabled();
      const sideButtonsContainer = qs('.action-panel .action-buttons');
      if (sideButtonsContainer) {
        const sideBtns = qsa('button[data-action]', sideButtonsContainer);
        const viewBtn = sideBtns.find(btn => btn.getAttribute('data-action') === 'view');
        setButtonDisabled(viewBtn, false);  // Re-enable View button
        console.log('[RuleDetails] View button re-enabled');
      }

      // Clear grid selection
      const allRows = qsa('#RuleDetailsBody tr');
      allRows.forEach(r => r.classList.remove('table-active'));
      console.log('[RuleDetails] Grid row selection cleared');

      setToast('Screen cleared. All data and state reset.', 'info');
      console.log('[RuleDetails] Cancel operation completed - all data cleared');
    });
  }

  function saveRuleDetail() {
    const componentSelect = qs('#Component') || qs('select[aria-label*="Component"]');
    const debitSelect = qs('#DebitAccountTag') || qs('select[aria-label*="Debit"]');
    const creditSelect = qs('#CreditAccountTag') || qs('select[aria-label*="Credit"]');
    const narrationInput = qs('#Narration') || qs('input[aria-label="Narration"]');

    const component = componentSelect?.value || '';
    const debitTag = debitSelect?.value || '';
    const creditTag = creditSelect?.value || '';
    const narration = narrationInput?.value || '';

    console.log('[RuleDetails] saveRuleDetail - component:', component, 'debitTag:', debitTag, 'creditTag:', creditTag, 'narration:', narration);

    if (!component || !debitTag || !creditTag) {
      setToast('Please fill in all required fields (Component, Debit Tag, Credit Tag).', 'warning');
      return;
    }

    // Save to backend
    saveRuleDetailToBackend(component, debitTag, creditTag, narration);
  }

  async function saveRuleDetailToBackend(component, debitTag, creditTag, narration) {
    try {
      setToast('Saving rule detail...', 'info');

      // Validate required fields
      if (!component || !debitTag || !creditTag) {
        setToast('Please fill in all required fields (Component, Debit Tag, Credit Tag).', 'warning');
        return;
      }

      // Get session data
      let BankID = '00';
      let OurBranchID = '0101';
      let OperatorID = 'WEB_PORTAL';

      try {
        const parentSession = window.parent?.AuthService?.getSession?.() || window.AuthService?.userSession || {};
        if (parentSession && typeof parentSession === 'object') {
          BankID = parentSession.bankID || parentSession.BankID || parentSession.bankId || BankID;
          OurBranchID = parentSession.branchID || parentSession.BranchID || parentSession.branchId || OurBranchID;
          OperatorID = parentSession.operatorID || parentSession.OperatorID || parentSession.operatorId || OperatorID;
        }
      } catch (e) {
        console.log('[RuleDetails] Could not access parent AuthService:', e.message);
      }

      // Try to get from Environment
      const Environment = window.parent?.Environment || window.Environment || {};
      BankID = Environment.defaultBankId || Environment.bankId || BankID;
      OurBranchID = Environment.defaultOurBranchId || Environment.branchId || OurBranchID;

      // Try to get from localStorage/sessionStorage
      const storageBankID = localStorage.getItem('BankID') || sessionStorage.getItem('BankID');
      const storageBranchID = localStorage.getItem('OurBranchID') || sessionStorage.getItem('OurBranchID');
      const storageOperatorID = localStorage.getItem('OperatorID') || sessionStorage.getItem('OperatorID');

      if (storageBankID) BankID = storageBankID;
      if (storageBranchID) OurBranchID = storageBranchID;
      if (storageOperatorID) OperatorID = storageOperatorID;

      // Get required values from state
      const acRuleId = rdState.accountingRuleId || '';
      const eventSelect = qs('#Event');
      const eventID = eventSelect?.value || '';

      if (!acRuleId || !eventID) {
        setToast('Please select an Accounting Rule and Event first.', 'warning');
        return;
      }

      // Build DetailRecords XML
      const detailRecordsXml = buildDetailRecordsXML(component, debitTag, creditTag, narration);

      console.log('[RuleDetails] Built DetailRecords XML:', detailRecordsXml);

      // Build the request structure as per the sample provided
      const requestData = {
        RequestID: 'dbo.p_AddEditProductAcRuleDetail',
        FormId: 'dbo.p_AddEditProductAcRuleDetail',
        RequestData: {
          BankID: BankID,
          AcRuleID: acRuleId,
          EventID: eventID,
          OperatedBy: OperatorID,
          OperatedOn: new Date().toLocaleString('en-GB'),
          SupervisedBy: OperatorID,
          UpdateCount: rdState.updateCount || 0,
          DetailRecords: detailRecordsXml
        },
        RequestTime: new Date().toLocaleString('en-GB'),
        AppName: 'PROJECT_KAIRO',
        Checksum: ''
      };

      console.log('[RuleDetails] Calling service with request:', requestData);

      // Use CoreApi to call the stored procedure
      if (!global.CoreApi) {
        setToast('Core API service is not available.', 'danger');
        return;
      }

      const Environment2 = window.parent?.Environment || window.Environment || {};
      const baseUrl = (Environment2.baseUrlCommon || 'http://172.16.2.31:3306').replace(/\/+$/, '');
      const endpoint = `${baseUrl}/api/OldAPI`;

      const response = await global.CoreApi.post(endpoint, requestData);
      console.log('[RuleDetails] Service response:', response);

      if (response?.success) {
        setToast('Rule detail saved successfully.', 'success');

        // Update count for next save (if in EDIT mode)
        if (response.data?.UpdateCount !== undefined) {
          rdState.updateCount = response.data.UpdateCount;
          console.log('[RuleDetails] Updated count:', rdState.updateCount);
        }

        // Reset form to VIEW mode
        clearRuleDetailsForm();
        setFormMode(MODES.VIEW);

        // Reload grid with updated data
        await loadRuleDetailsGrid();
      } else {
        console.error('[RuleDetails] Save failed:', response);
        const errorMsg = response?.message || response?.error || 'Failed to save rule detail';
        setToast(errorMsg + '. Check console for details.', 'warning');
      }
    } catch (err) {
      console.error('[RuleDetails] Error saving rule detail:', err);
      setToast('Error saving rule detail. Check console for details.', 'danger');
    }
  }

  function buildDetailRecordsXML(component, debitTag, creditTag, narration) {
    // Build XML structure for DetailRecords
    // Format: <DetailRecords><DetailRecord><Field>Value</Field>...</DetailRecord></DetailRecords>
    const xml = `
      <DetailRecords>
        <DetailRecord>
          <ComponentID>${escapeXML(component)}</ComponentID>
          <Component>${escapeXML(component)}</Component>
          <DrAccountTagID>${escapeXML(debitTag)}</DrAccountTagID>
          <DebitAccountTag>${escapeXML(debitTag)}</DebitAccountTag>
          <CrAccountTagID>${escapeXML(creditTag)}</CrAccountTagID>
          <CreditAccountTag>${escapeXML(creditTag)}</CreditAccountTag>
          <Narration>${escapeXML(narration)}</Narration>
        </DetailRecord>
      </DetailRecords>
    `.trim();

    console.log('[RuleDetails] Built DetailRecords XML:', xml);
    return xml;
  }

  function escapeXML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function removeRuleDetail() {
    if (rdState.selectedComboIndex >= 0) {
      rdState.filteredCombos.splice(rdState.selectedComboIndex, 1);
      const eventSelect = qs('select[aria-label="Event"]');
      if (eventSelect?.value) {
        const matchingCombos = rdState.combos.filter(c => (c.EventID || c.Event) === eventSelect.value);
        rdState.filteredCombos = matchingCombos;
      }
      populateRuleDetailsGrid(rdState.filteredCombos);
      clearRuleDetailsForm();
      setToast('Rule detail removed successfully.', 'success');
    }
    updateRuleDetailsButtons();
  }

  function closeParentModal() {
    try {
      if (window.parent && window.parent !== window) {
        const modalEl = window.parent.document.querySelector('.modal.show');
        if (modalEl && window.parent.bootstrap && window.parent.bootstrap.Modal) {
          const instance = window.parent.bootstrap.Modal.getInstance(modalEl) || new window.parent.bootstrap.Modal(modalEl);
          instance.hide();
          return;
        }
      }
    } catch (e) {
      // noop
    }

    try {
      window.close();
    } catch (e) {
      // noop
    }
  }

  function minimize() {
    document.body.classList.add('cm-window-minimized');
  }

  function restore() {
    document.body.classList.remove('cm-window-minimized');
  }

  controls.forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-window-action');
      if (action === 'close') closeParentModal();
      if (action === 'minimize') minimize();
      if (action === 'restore') restore();
    });
  });

  function ensureBackButtonAlwaysEnabled() {
    const backBtn = qs('button[data-action="back"]');
    if (backBtn) {
      setButtonDisabled(backBtn, false);
      console.log('[RuleDetails] Back button is enabled');
    }
  }

  const backBtn = qs('button[data-action="back"]');
  ensureBackButtonAlwaysEnabled();
  backBtn?.addEventListener('click', () => {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ action: 'submoduleClosed' }, '*');
        return;
      }
    } catch (e) {
      // noop
    }

    closeParentModal();
  });

  function positionOrderControls() {
    const gridPanel = document.getElementById('ruleDetailsGridPanel');
    const orderSlot = document.getElementById('orderSlot');
    const orderControls = document.getElementById('orderControls');
    if (!gridPanel || !orderSlot || !orderControls) return;

    const panelRect = gridPanel.getBoundingClientRect();
    const slotRect = orderSlot.getBoundingClientRect();

    const targetCenterY = panelRect.top + panelRect.height / 2;
    const orderHeight = orderControls.getBoundingClientRect().height || orderControls.offsetHeight || 0;

    const marginTop = targetCenterY - slotRect.top - orderHeight / 2;
    orderControls.style.marginTop = `${Math.max(0, Math.round(marginTop))}px`;
  }

  positionOrderControls();
  window.addEventListener('resize', positionOrderControls);

  // Listen for init message from parent (accounting-rule.html)
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'init' && event.data.data) {
      const requestData = event.data.data.RequestData || event.data.data;
      console.log('[RuleDetails] Received init data from parent:', requestData);
      
      // Store the accounting rule ID and product type from parent
      if (requestData.AccountingRuleId) {
        rdState.accountingRuleId = requestData.AccountingRuleId;
        console.log('[RuleDetails] Set AccountingRuleId from parent:', rdState.accountingRuleId);
      }
      if (requestData.ProductType) {
        rdState.productTypeId = requestData.ProductType;
        console.log('[RuleDetails] Set ProductType from parent:', rdState.productTypeId);
        
        // Update the Product Type display field if it exists
        const productTypeField = qs('#ProductType') || qs('input[aria-label*="Product Type"]');
        if (productTypeField) {
          productTypeField.value = requestData.ProductTypeDescription || requestData.ProductType;
        }
      }
      
      // Trigger data load with parent data
      initWithParentData(requestData);
    }
  });

  // Initialize with data from parent
  async function initWithParentData(requestData) {
    console.log('[RuleDetails] Initializing with parent data:', requestData);
    
    // Update UI fields with parent data
    const acRuleIdField = qs('#AccountingRuleId') || qs('input[aria-label*="Accounting Rule"]');
    if (acRuleIdField && requestData.AccountingRuleId) {
      acRuleIdField.value = requestData.AccountingRuleId;
    }
    
    const productTypeField = qs('#ProductType') || qs('input[aria-label*="Product Type"]');
    if (productTypeField && requestData.ProductTypeDescription) {
      productTypeField.value = requestData.ProductTypeDescription;
    }
    
    // Load data based on parent context
    await loadAndMapProductTypes();
    await loadProductAccountingRule();
    bindActionButtons();
    bindSideButtons();
    setFormMode(MODES.VIEW);
    updateRuleDetailsButtons();
    ensureBackButtonAlwaysEnabled();  // Ensure Back button remains enabled after parent initialization
  }

  // Initialize on load
  window.addEventListener('load', async () => {
    console.log('[RuleDetails] Initializing Rule Details page');
    
    // Check for URL parameters first (for standalone access)
    const params = getUrlParameters();
    if (params.acRuleId) {
      rdState.accountingRuleId = params.acRuleId;
      console.log('[RuleDetails] Set AccountingRuleId from URL:', rdState.accountingRuleId);
    }
    if (params.productTypeId) {
      rdState.productTypeId = params.productTypeId;
      console.log('[RuleDetails] Set ProductType from URL:', rdState.productTypeId);
    }
    
    // Also try to get from parent's childFormRequestData (for iframe access)
    try {
      if (window.parent && window.parent !== window && window.parent.childFormRequestData) {
        const parentData = window.parent.childFormRequestData;
        const requestData = parentData.RequestData || parentData;
        
        if (requestData.AccountingRuleId && !rdState.accountingRuleId) {
          rdState.accountingRuleId = requestData.AccountingRuleId;
          console.log('[RuleDetails] Set AccountingRuleId from parent window:', rdState.accountingRuleId);
        }
        if (requestData.ProductType && !rdState.productTypeId) {
          rdState.productTypeId = requestData.ProductType;
          console.log('[RuleDetails] Set ProductType from parent window:', rdState.productTypeId);
          
          // Update the Product Type display field
          const productTypeField = qs('#ProductType') || qs('input[aria-label*="Product Type"]');
          if (productTypeField) {
            productTypeField.value = requestData.ProductTypeDescription || requestData.ProductType;
          }
        }
      }
    } catch (e) {
      console.log('[RuleDetails] Could not access parent window data:', e.message);
    }
    
    await loadAndMapProductTypes();  // Load product types first for mapping
    await loadProductAccountingRule();  // This will call loadAccountingRuleCombos internally
    bindActionButtons();
    bindSideButtons();
    setFormMode(MODES.VIEW);
    updateRuleDetailsButtons();
    ensureBackButtonAlwaysEnabled();  // Ensure Back button remains enabled after initialization
  });
})(window);
