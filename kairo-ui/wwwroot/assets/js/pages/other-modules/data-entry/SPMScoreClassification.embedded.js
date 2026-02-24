/**
 * SPM Score Classification Page
 * Handles loading and displaying score classifications for a Risk Acceptance Level
 */
(async function initSPMScoreClassificationPage() {
  'use strict';

  // Load required services
  const { ServiceLoader } = window;
  if (ServiceLoader) {
    await ServiceLoader.loadCore();
    await ServiceLoader.loadSPMRiskAcceptanceLevelService();
  }

  const SPMRiskAcceptanceLevelService = window.SPMRiskAcceptanceLevelService;
  const byId = (id) => document.getElementById(id);

  function getAuthSession() {
    try {
      const storageKey = window.CoreBankingConfig?.auth?.storageKey || 'nimble_auth_session';
      const raw = window.localStorage?.getItem?.(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function getOperatorId() {
    const auth = getAuthSession();
    return (
      auth?.operatorID ||
      auth?.OperatorID ||
      auth?.operatorId ||
      auth?.operator ||
      sessionStorage.getItem('operatorId') ||
      localStorage.getItem('OperatorID') ||
      localStorage.getItem('currentUser') ||
      window.Config?.OperatorID ||
      'web_portal'
    );
  }

  function getBranchId() {
    const auth = getAuthSession();
    return (
      auth?.branchID ||
      auth?.BranchID ||
      auth?.branchId ||
      sessionStorage.getItem('branchId') ||
      localStorage.getItem('branchId') ||
      window.Environment?.OurBranchID ||
      ''
    );
  }

  // Session data - get actual logged-in user from storage
  const sessionData = {
    OurBranchID: getBranchId(),
    OperatorID: getOperatorId()
  };

  function isParentReady() {
    try {
      return sessionStorage.getItem('spmRiskAcceptanceLevelReady') === '1';
    } catch (_) {
      return false;
    }
  }

  // Get RAID from URL params or sessionStorage (passed from parent form)
  // IMPORTANT: only allow it if the parent form has actually VIEW-loaded a record.
  function getRAID() {
    const urlParams = new URLSearchParams(window.location.search);
    const raid = urlParams.get('RAID') || sessionStorage.getItem('currentRAID') || '';
    return isParentReady() ? raid : '';
  }

  const currentRAID = getRAID();
  console.log('Current RAID:', currentRAID);

  if (window.CoreBankingConfig?.enableLogging) {
    try {
      const storageKey = window.CoreBankingConfig?.auth?.storageKey || 'nimble_auth_session';
      const raw = window.localStorage?.getItem?.(storageKey);
      const session = raw ? JSON.parse(raw) : null;
      const token = session?.token || session?.accessToken || session?.AccessToken;
      console.log('[SPMScoreClassification] Auth token present:', !!token);
    } catch (_) {
      console.log('[SPMScoreClassification] Auth token present: false');
    }
  }

  // Current mode and in-memory list for new records
  let currentMode = 'view'; // 'view', 'add', 'edit'
  let pendingRecords = []; // Records added via "Add To List" but not yet saved
  let existingRecords = []; // Records loaded from server
  let selectedRowData = null; // Currently selected row for alter/remove
  let isAlterMode = false; // Flag to track if we're editing an existing row

  // =============================================
  // DOM REFERENCES
  // =============================================
  
  // Action panel buttons (right side)
  const actionButtons = {
    add: document.querySelector('.action-panel .btn-action[title="Add"]'),
    edit: document.querySelector('.action-panel .btn-action[title="Edit"]'),
    save: document.querySelector('.action-panel .btn-action[title="Save"]'),
    cancel: document.querySelector('.action-panel [data-spmsc-cancel]')
  };

  // Centered form action buttons
  const formActionButtons = {
    new: document.querySelector('.form-action-buttons .btn-form-action:nth-child(1)'),     // New
    addToList: document.querySelector('.form-action-buttons .btn-form-action:nth-child(2)'), // Add To List
    alter: document.querySelector('.form-action-buttons .btn-form-action:nth-child(3)'),    // Alter
    remove: document.querySelector('.form-action-buttons .btn-form-action:nth-child(4)')    // Remove
  };

  // Form fields
  const formFields = {
    scoreFrom: byId('scoreFrom'),
    scoreTo: byId('scoreTo'),
    scoreClassification: byId('scoreClassification'),
    scoreDecision: byId('scoreDecision')
  };

  function showMessage(text, variant) {
    const panel = document.querySelector('.am-message-panel');
    const panelText = document.querySelector('.am-message-panel span');
    if (!panel || !panelText) return;

    panelText.textContent = String(text ?? '');
    panel.classList.add('show');

    // Minimal styling (don’t add new theme tokens)
    if (variant === 'danger') {
      panel.style.backgroundColor = '#f8d7da';
      panel.style.borderColor = '#f5c6cb';
      panel.style.color = '#721c24';
    } else if (variant === 'warning') {
      panel.style.backgroundColor = '#fff3cd';
      panel.style.borderColor = '#ffeeba';
      panel.style.color = '#856404';
    } else {
      panel.style.backgroundColor = '';
      panel.style.borderColor = '';
      panel.style.color = '';
    }
  }

  // =============================================
  // BUTTON STATE MANAGEMENT
  // =============================================
  
  function setActionButtonState(states) {
    if (actionButtons.add) actionButtons.add.disabled = !states.add;
    if (actionButtons.edit) actionButtons.edit.disabled = !states.edit;
    if (actionButtons.save) actionButtons.save.disabled = !states.save;
  }

  function setFormActionButtonState(states) {
    if (formActionButtons.new) formActionButtons.new.disabled = !states.new;
    if (formActionButtons.addToList) formActionButtons.addToList.disabled = !states.addToList;
    if (formActionButtons.alter) formActionButtons.alter.disabled = !states.alter;
    if (formActionButtons.remove) formActionButtons.remove.disabled = !states.remove;
  }

  function setFormFieldsEnabled(enabled) {
    Object.values(formFields).forEach(field => {
      if (field) {
        field.disabled = !enabled;
        if (field.tagName === 'INPUT') {
          field.readOnly = !enabled;
        }
      }
    });
  }

  function clearFormFields() {
    Object.values(formFields).forEach(field => {
      if (field) field.value = '';
    });
  }

  // =============================================
  // ROUTING FUNCTIONALITY
  // =============================================
  const cancelBtn = document.querySelector('[data-spmsc-cancel]');
  
  document.querySelectorAll('[data-spmral-route]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      const route = btn.dataset.spmralRoute;
      if (route) {
        window.location.href = route;
      }
    });
  });

  cancelBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    const url = new URL('../views/SPMRiskAcceptanceLevel.html', window.location.href);
    url.searchParams.set('t', String(Date.now()));
    window.location.href = url.toString();
  });

  document.querySelectorAll('[data-spmral-toggle]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      const toggleKey = btn.dataset.spmralToggle;
      if (!toggleKey) return;
      const target = document.querySelector(`[data-spmral-subnav="${toggleKey}"]`);
      if (!target) return;

      const willOpen = target.hidden;
      target.hidden = !willOpen;
      btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      btn.classList.toggle('is-open', willOpen);
    });
  });

  // =============================================
  // ADD MODE HANDLERS
  // =============================================

  function handleAdd() {
    // Business rule: if a RAID already has scores set, don't allow adding another.
    if (Array.isArray(existingRecords) && existingRecords.length > 0) {
      alert('Score From value is already set');
      return;
    }

    currentMode = 'add';
    // Enable New button, disable others
    setFormActionButtonState({ new: true, addToList: false, alter: false, remove: false });
    // Disable action panel buttons except Cancel, enable Save
    setActionButtonState({ add: false, edit: false, save: true });
    // Keep form fields disabled until "New" is clicked
    setFormFieldsEnabled(false);
    console.log('✅ Add mode enabled - click New to add a new classification');
  }

  function handleEdit() {
    // Edit mode - allow modifying existing records
    if (!Array.isArray(existingRecords) || existingRecords.length === 0) {
      alert('No records to edit.');
      return;
    }

    currentMode = 'edit';
    selectedRowData = null; // Clear any previous selection
    // Disable New button since records exist, keep Alter/Remove disabled until row is double-clicked
    setFormActionButtonState({ new: false, addToList: false, alter: false, remove: false });
    // Disable action panel buttons - Save will be enabled after changes are made via Add To List
    setActionButtonState({ add: false, edit: false, save: false });
    // Keep form fields disabled until row is double-clicked
    setFormFieldsEnabled(false);
    clearFormFields();
    console.log('✅ Edit mode enabled - double-click a row to edit');
  }

  function handleNew() {
    // Clear selection and reset alter mode when starting new entry
    selectedRowData = null;
    isAlterMode = false;
    // Clear row highlighting
    const tableBody = document.querySelector('.form-section-table tbody');
    tableBody?.querySelectorAll('tr').forEach(tr => tr.classList.remove('table-primary'));
    // Clear and enable form fields
    clearFormFields();
    setFormFieldsEnabled(true);
    // Enable Add To List button, disable Alter/Remove
    setFormActionButtonState({ new: true, addToList: true, alter: false, remove: false });
    // Focus first field
    formFields.scoreFrom?.focus();
    console.log('✅ New record mode - enter data and click Add To List');
  }

  function handleAddToList() {
    const scoreFrom = formFields.scoreFrom?.value?.trim();
    const scoreTo = formFields.scoreTo?.value?.trim();
    const classificationId = formFields.scoreClassification?.value?.trim();
    const decisionId = formFields.scoreDecision?.value?.trim();
    
    // Get display text from lookup maps (more reliable than reading dropdown text which may be modified by API)
    const classificationText = classificationId ? (scoreClassificationLookup[classificationId] || '') : '';
    const decisionText = decisionId ? (scoreDecisionLookup[decisionId] || '') : '';
    
    console.log('📝 handleAddToList:', { classificationId, classificationText, decisionId, decisionText });

    // Validation
    if (!scoreFrom) {
      alert('Score From is required');
      formFields.scoreFrom?.focus();
      return;
    }

    if (!scoreTo) {
      alert('Score To is required');
      formFields.scoreTo?.focus();
      return;
    }

    if (!classificationId) {
      alert('Score Classification is required');
      formFields.scoreClassification?.focus();
      return;
    }

    if (!decisionId) {
      alert('Score Decision is required');
      formFields.scoreDecision?.focus();
      return;
    }

    // If in alter mode, update the existing row instead of adding new
    if (isAlterMode && selectedRowData) {
      const originalScoreFrom = normalizeScoreValue(selectedRowData.ScoreFrom ?? selectedRowData.Score_From);
      
      // Check for duplicate ScoreFrom (excluding the current row being edited)
      const normalizedScoreFrom = normalizeScoreValue(scoreFrom);
      const existingScoreFroms = getAllScoreFromValues().filter(sf => sf !== originalScoreFrom);
      if (existingScoreFroms.includes(normalizedScoreFrom)) {
        alert('Score From value is already set');
        formFields.scoreFrom?.focus();
        return;
      }
      
      // Find and update the record in existingRecords or pendingRecords
      const existingIndex = existingRecords.findIndex(rec => 
        normalizeScoreValue(rec.ScoreFrom ?? rec.Score_From) === originalScoreFrom
      );
      
      if (existingIndex !== -1) {
        // Update existing record and mark as modified
        existingRecords[existingIndex] = {
          ...existingRecords[existingIndex],
          ScoreFrom: scoreFrom,
          ScoreTo: scoreTo,
          ScoreClassificationID: classificationId,
          ScoreDecisionID: decisionId,
          ScoreClassificationDesc: classificationText !== '--Select--' ? classificationText : '',
          ScoreDecisionDesc: decisionText !== '--Select--' ? decisionText : '',
          isModified: true
        };
      } else {
        // Check in pending records
        const pendingIndex = pendingRecords.findIndex(rec => 
          normalizeScoreValue(rec.ScoreFrom) === originalScoreFrom
        );
        
        if (pendingIndex !== -1) {
          pendingRecords[pendingIndex] = {
            ...pendingRecords[pendingIndex],
            ScoreFrom: scoreFrom,
            ScoreTo: scoreTo,
            ScoreClassificationID: classificationId,
            ScoreDecisionID: decisionId,
            ScoreClassificationDesc: classificationText !== '--Select--' ? classificationText : '',
            ScoreDecisionDesc: decisionText !== '--Select--' ? decisionText : '',
            isPending: true
          };
        }
      }
      
      // Re-render table
      renderTableWithPending();
      
      // Reset alter mode and clear form
      isAlterMode = false;
      selectedRowData = null;
      clearFormFields();
      setFormFieldsEnabled(false);
      
      // Enable Save button, disable New since records exist
      setActionButtonState({ add: false, edit: true, save: true });
      setFormActionButtonState({ new: false, addToList: false, alter: false, remove: false });
      
      console.log('✅ Record updated in list');
      return;
    }

    // Normal add mode - check for duplicate ScoreFrom
    const normalizedScoreFrom = normalizeScoreValue(scoreFrom);
    const existingScoreFroms = getAllScoreFromValues();
    if (existingScoreFroms.includes(normalizedScoreFrom)) {
      alert('Score From value is already set');
      formFields.scoreFrom?.focus();
      return;
    }

    // Add to pending records
    const newRecord = {
      ScoreFrom: scoreFrom,
      ScoreTo: scoreTo,
      ScoreClassificationDesc: classificationText !== '--Select--' ? classificationText : '',
      ScoreDecisionDesc: decisionText !== '--Select--' ? decisionText : '',
      ScoreClassificationID: classificationId || '',
      ScoreDecisionID: decisionId || '',
      isPending: true // Mark as pending (not yet saved)
    };

    pendingRecords.push(newRecord);
    
    // Re-render table with all records (existing + pending)
    renderTableWithPending();
    
    // Clear form for next entry
    clearFormFields();
    formFields.scoreFrom?.focus();
    
    console.log('✅ Added to list:', newRecord);
    console.log('Pending records:', pendingRecords);
  }

  function handleAlter() {
    if (!selectedRowData) {
      alert('Please double-click a row to select it first.');
      return;
    }

    // Enter alter mode - enable editing and Add To List button
    isAlterMode = true;
    
    // Keep form fields enabled (they should already be populated from double-click)
    setFormFieldsEnabled(true);
    
    // Enable Add To List to update the row, disable Alter (we're now in alter mode)
    setFormActionButtonState({ new: false, addToList: true, alter: false, remove: true });
    
    // Focus first field for editing
    formFields.scoreFrom?.focus();
    
    console.log('✅ Alter mode enabled - edit fields and click Add To List to update');
  }

  async function handleRemove() {
    if (!selectedRowData) {
      alert('Please double-click a row to select it first.');
      return;
    }

    const confirmed = confirm('Are you sure you want to remove this record?\n\nThis will delete the record from the database.');
    if (!confirmed) return;

    const originalScoreFrom = normalizeScoreValue(selectedRowData.ScoreFrom ?? selectedRowData.Score_From);
    
    // Remove from existing records
    const existingIndex = existingRecords.findIndex(rec => 
      normalizeScoreValue(rec.ScoreFrom ?? rec.Score_From) === originalScoreFrom
    );
    
    if (existingIndex !== -1) {
      existingRecords.splice(existingIndex, 1);
    } else {
      // Remove from pending records
      const pendingIndex = pendingRecords.findIndex(rec => 
        normalizeScoreValue(rec.ScoreFrom) === originalScoreFrom
      );
      
      if (pendingIndex !== -1) {
        pendingRecords.splice(pendingIndex, 1);
      }
    }

    // Save to DB with remaining records (empty array will clear all)
    try {
      const allRecords = [...existingRecords, ...pendingRecords];
      const detailXml = buildRiskAcceptanceDetailsXml(allRecords, currentRAID, sessionData.OperatorID);
      
      const response = await SPMRiskAcceptanceLevelService.saveScoreClassification({
        RAID: currentRAID,
        OperatorID: sessionData.OperatorID,
        DetailRecords: detailXml
      });

      if (!response?.success) {
        alert('Error removing record: ' + (response?.message || 'Unknown error'));
        // Reload to restore state
        await loadScoreClassifications();
        return;
      }

      // Reload from server to confirm deletion
      await loadScoreClassifications();
      
      alert('Record removed successfully!');
      
      // Clear form and selection, reset alter mode
      clearFormFields();
      selectedRowData = null;
      isAlterMode = false;
      setFormFieldsEnabled(false);
      
      // Check if any records remain - if none, switch to Add mode
      const hasRecords = Array.isArray(existingRecords) && existingRecords.length > 0;
      if (hasRecords) {
        setFormActionButtonState({ new: false, addToList: false, alter: false, remove: false });
        setActionButtonState({ add: false, edit: true, save: false });
      } else {
        // No more records - enable Add
        currentMode = 'view';
        setFormActionButtonState({ new: false, addToList: false, alter: false, remove: false });
        setActionButtonState({ add: true, edit: false, save: false });
      }
      
      console.log('✅ Record removed from database');
    } catch (error) {
      console.error('Error removing record:', error);
      alert('Error removing record: ' + error.message);
      // Reload to restore state
      await loadScoreClassifications();
    }
  }

  function getAllScoreFromValues() {
    const values = [];
    
    // Get from existing records
    existingRecords.forEach(rec => {
      const scoreFrom = rec.ScoreFrom ?? rec.Score_From;
      if (scoreFrom !== undefined && scoreFrom !== null) values.push(normalizeScoreValue(scoreFrom));
    });

    // Get from pending records
    pendingRecords.forEach(rec => {
      if (rec.ScoreFrom !== undefined && rec.ScoreFrom !== null) values.push(normalizeScoreValue(rec.ScoreFrom));
    });

    return values;
  }

  function normalizeScoreValue(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';

    // If it's numeric, normalize 10, 10.0, 10.00 all to "10"
    const asNumber = Number(raw);
    if (!Number.isNaN(asNumber) && raw.match(/^[-+]?\d+(\.\d+)?$/)) {
      return String(asNumber);
    }

    return raw;
  }

  // =============================================
  // SAVE FUNCTIONALITY
  // =============================================

  async function handleSave() {
    // Check if there are any changes to save (new records OR modified existing records)
    const hasNewRecords = pendingRecords.length > 0;
    const hasModifiedRecords = existingRecords.some(rec => rec.isModified);
    
    if (!hasNewRecords && !hasModifiedRecords) {
      alert('No changes to save. Use Edit to modify existing records or Add to create new ones.');
      return;
    }

    if (!currentRAID) {
      alert('RAID is required');
      return;
    }

    // Build XML for ALL records (existing + pending) - this replaces all score classifications for this RAID
    const allRecords = [...existingRecords, ...pendingRecords];
    const detailXml = buildRiskAcceptanceDetailsXml(allRecords, currentRAID, sessionData.OperatorID);

    console.log('[SPMScoreClassification] Save payload:', {
      RAID: currentRAID,
      OperatorID: sessionData.OperatorID,
      DetailRecords: detailXml,
      totalRecords: allRecords.length,
      newRecordsCount: pendingRecords.length,
      modifiedRecordsCount: existingRecords.filter(r => r.isModified).length
    });

    try {
      const response = await SPMRiskAcceptanceLevelService.saveScoreClassification({
        RAID: currentRAID,
        OperatorID: sessionData.OperatorID,
        DetailRecords: detailXml
      });

      console.log('[SPMScoreClassification] Save response:', response);

      if (!response?.success) {
        alert('Error saving: ' + (response?.message || 'Unknown error'));
        return;
      }

      // Success! Merge pending records into existing records (with correct display text)
      // Don't reload from server to avoid server returning wrong descriptions
      const allSavedRecords = [...existingRecords, ...pendingRecords].map(rec => ({
        ...rec,
        isPending: false,
        isModified: false
      }));
      
      existingRecords = allSavedRecords;
      pendingRecords = [];
      
      // Re-render table with local data (has correct display text)
      renderTable(existingRecords);
      
      // Format current date as DD/Mon/YYYY
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = now.toLocaleString('en-US', { month: 'short' });
      const year = now.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;
      
      // Update audit fields based on what was saved
      if (hasNewRecords) {
        // New records added - populate Created By and Created On
        const createdByField = byId('scCreatedBy');
        const createdOnField = byId('scCreatedOn');
        if (createdByField) createdByField.value = sessionData.OperatorID || '';
        if (createdOnField) createdOnField.value = formattedDate;
        
        // Store in sessionStorage for persistence when navigating back
        try {
          sessionStorage.setItem('scCreatedBy', sessionData.OperatorID || '');
          sessionStorage.setItem('scCreatedOn', formattedDate);
        } catch (_) {}
      }
      
      if (hasModifiedRecords) {
        // Existing records modified - populate Modified By and Modified On
        const modifiedByField = byId('scModifiedBy');
        const modifiedOnField = byId('scModifiedOn');
        if (modifiedByField) modifiedByField.value = sessionData.OperatorID || '';
        if (modifiedOnField) modifiedOnField.value = formattedDate;
        
        // Store in sessionStorage for persistence when navigating back
        try {
          sessionStorage.setItem('scModifiedBy', sessionData.OperatorID || '');
          sessionStorage.setItem('scModifiedOn', formattedDate);
        } catch (_) {}
      }

      alert('Score Classification(s) saved successfully!');
      resetToViewMode();
    } catch (error) {
      console.error('Error saving score classification:', error);
      alert('Error saving score classification: ' + error.message);
    }
  }

  /**
   * Build XML for DetailRecords matching the exact format expected by dbo.p_AddEditScoreClassification:
   * - Node path: /dt_RiskAcceptanceDetails (no NewDataSet wrapper)
   * - Fields: RAID, ScoreFrom, ScoreTo, ScoreClassificationID, ScoreDecisionID, CreatedBy, ModifiedBy
   */
  function buildRiskAcceptanceDetailsXml(records, raid, operatorId) {
    const list = Array.isArray(records) ? records : [];
    if (!list.length) return '';

    const raidText = String(raid ?? '').trim();
    const createdBy = String(operatorId ?? '').trim();

    return list.map((rec) => {
      const safeRow = rec && typeof rec === 'object' ? rec : {};
      
      const scId = safeRow.ScoreClassificationID || safeRow.ScoreClassificationId || '';
      const sdId = safeRow.ScoreDecisionID || safeRow.ScoreDecisionId || '';
      
      // For modified records, include ModifiedBy
      const modifiedBy = safeRow.isModified ? createdBy : '';

      return (
        '<dt_RiskAcceptanceDetails>' +
        `<RAID>${escapeXml(raidText)}</RAID>` +
        `<ScoreFrom>${escapeXml(safeRow.ScoreFrom)}</ScoreFrom>` +
        `<ScoreTo>${escapeXml(safeRow.ScoreTo)}</ScoreTo>` +
        `<ScoreClassificationID>${escapeXml(scId)}</ScoreClassificationID>` +
        `<ScoreDecisionID>${escapeXml(sdId)}</ScoreDecisionID>` +
        `<CreatedBy>${escapeXml(createdBy)}</CreatedBy>` +
        `<ModifiedBy>${escapeXml(modifiedBy)}</ModifiedBy>` +
        '</dt_RiskAcceptanceDetails>'
      );
    }).join('');
  }

  function escapeXml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function resetToViewMode() {
    currentMode = 'view';
    setFormFieldsEnabled(false);
    clearFormFields();
    // If RAID exists and records exist, enable Edit; otherwise enable Add
    const hasRecords = Array.isArray(existingRecords) && existingRecords.length > 0;
    setActionButtonState({ add: !!currentRAID && !hasRecords, edit: hasRecords, save: false });
    setFormActionButtonState({ new: false, addToList: false, alter: false, remove: false });
  }

  // =============================================
  // LOAD SCORE CLASSIFICATIONS
  // =============================================

  async function loadScoreClassifications() {
    if (!currentRAID) {
      console.log('No RAID provided - cannot load score classifications');
      return;
    }

    if (!SPMRiskAcceptanceLevelService) {
      console.error('SPMRiskAcceptanceLevelService not loaded');
      return;
    }

    try {
      const response = await SPMRiskAcceptanceLevelService.getScoreClassification({
        RAID: currentRAID
      });

      console.log('Score Classification response:', response);

      if (response.success && response.data) {
        const data = response.data;
        const dataObj = (data && typeof data === 'object' && !Array.isArray(data)) ? data : null;

        // Table records
        existingRecords = extractScoreClassificationRecords(data);
        
        // Debug: log what the server returned (ALL fields including audit)
        console.log('📊 Existing records from server:', existingRecords);
        existingRecords.forEach((rec, i) => {
          console.log(`  Record ${i + 1} - ALL FIELDS:`, JSON.stringify(rec, null, 2));
          console.log(`  Record ${i + 1} - Audit fields:`, {
            CreatedBy: rec.CreatedBy || rec.Created_By || '(not found)',
            CreatedOn: rec.CreatedOn || rec.Created_On || rec.DateCreated || '(not found)',
            ModifiedBy: rec.ModifiedBy || rec.Modified_By || '(not found)',
            ModifiedOn: rec.ModifiedOn || rec.Modified_On || rec.DateModified || '(not found)'
          });
        });
        
        renderTable(existingRecords);
        
        // NOTE: Dropdowns are hardcoded in HTML with correct values - do NOT repopulate from API
        // HTML options: Classification (1=Insignificant, 2=Average), Decision (1=Decline, 2=Accept)
        // API Details02/Details03 may contain different/outdated values
        console.log('ℹ️ Using hardcoded dropdown options from HTML (not API)');
        
        // Populate Behind The Scene audit fields from first record
        if (existingRecords.length > 0) {
          populateAuditFields(existingRecords[0]);
        }

        // Enable Add and Cancel buttons since we have RAID and data loaded.
        // If records already exist for this RAID, enable Edit instead of Add.
        const hasRecords = Array.isArray(existingRecords) && existingRecords.length > 0;
        setActionButtonState({ add: !hasRecords, edit: hasRecords, save: false });
        if (actionButtons.cancel) actionButtons.cancel.disabled = false;
      } else {
        console.log('No score classifications found or error:', response.message);
        existingRecords = [];
        renderTable([]);
        // Still enable Add and Cancel since we have RAID
        setActionButtonState({ add: true, edit: false, save: false });
        if (actionButtons.cancel) actionButtons.cancel.disabled = false;
      }
    } catch (error) {
      console.error('Error loading score classifications:', error);
    }
  }

  function extractScoreClassificationRecords(data) {
    // CoreApi can normalize responses so `data` is already the Details array.
    if (Array.isArray(data)) return data;

    // Common shapes observed in OldAPI wrappers:
    // - { Details: [] }
    // - { Details: { Details: [] } }
    // - { Details01: [] }
    const candidates = [
      data?.Details,
      data?.Details01,
      data?.Details?.Details,
      data?.Details?.Details01,
      data?.data?.Details,
      data?.data?.Details?.Details
    ];

    for (const c of candidates) {
      if (Array.isArray(c)) return c;
      if (c && typeof c === 'object' && Array.isArray(c.Details)) return c.Details;

      // Sometimes a single record is returned as an object instead of an array
      if (c && typeof c === 'object') {
        const looksLikeRow =
          'ScoreFrom' in c || 'Score_From' in c ||
          'ScoreTo' in c || 'Score_To' in c ||
          'ScoreClassificationID' in c || 'ScoreClassificationDesc' in c ||
          'ScoreDecisionID' in c || 'ScoreDecisionDesc' in c;
        if (looksLikeRow) return [c];
      }
    }
    return [];
  }

  function populateDropdown(selectEl, items, valueField, textField) {
    if (!selectEl || !Array.isArray(items) || items.length === 0) {
      // Don't clear existing options if API returns empty - preserve hardcoded options
      console.log(`Skipping ${selectEl?.id} - no items from API, keeping existing options`);
      return;
    }
    
    // Only clear and repopulate if we have items from API
    selectEl.innerHTML = '<option value="">--Select--</option>';
    
    items.forEach(item => {
      const value = item[valueField] || item.ID || item.Value || '';
      const text = item[textField] || item.Description || item.Name || item.Text || value;
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      selectEl.appendChild(option);
    });
    
    console.log(`✅ Populated ${selectEl.id} with ${items.length} options`);
  }

  function populateAuditFields(data) {
    const createdByField = byId('scCreatedBy');
    const createdOnField = byId('scCreatedOn');
    const modifiedByField = byId('scModifiedBy');
    const modifiedOnField = byId('scModifiedOn');

    // First try to get from API response data
    if (createdByField) createdByField.value = data.CreatedBy || '';
    if (createdOnField) createdOnField.value = data.CreatedOn || '';
    if (modifiedByField) modifiedByField.value = data.ModifiedBy || '';
    if (modifiedOnField) modifiedOnField.value = data.ModifiedOn || '';
    
    // Then check sessionStorage for any values saved after a recent save operation
    // (these take precedence as they reflect the most recent action)
    try {
      const storedCreatedBy = sessionStorage.getItem('scCreatedBy');
      const storedCreatedOn = sessionStorage.getItem('scCreatedOn');
      const storedModifiedBy = sessionStorage.getItem('scModifiedBy');
      const storedModifiedOn = sessionStorage.getItem('scModifiedOn');
      
      if (storedCreatedBy && createdByField) createdByField.value = storedCreatedBy;
      if (storedCreatedOn && createdOnField) createdOnField.value = storedCreatedOn;
      if (storedModifiedBy && modifiedByField) modifiedByField.value = storedModifiedBy;
      if (storedModifiedOn && modifiedOnField) modifiedOnField.value = storedModifiedOn;
    } catch (_) {}
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  // Lookup maps for converting IDs to display text
  const scoreClassificationLookup = {
    '1': 'Insignificant',
    '2': 'Average'
  };
  
  const scoreDecisionLookup = {
    '1': 'Decline',
    '2': 'Accept'
  };

  function getClassificationText(row) {
    // Always use lookup map to ensure consistency with hardcoded HTML options
    // Handle various field name variations from server
    const id = String(
      row.ScoreClassificationID || 
      row.ScoreClassificationId || 
      row.ScoreClassification || 
      row.Score_ClassificationID ||
      row.Score_Classification ||
      row.ClassificationID ||
      ''
    );
    
    console.log(`🔍 getClassificationText: id="${id}", lookup[id]="${scoreClassificationLookup[id]}", desc="${row.ScoreClassificationDesc}"`);
    
    if (id && scoreClassificationLookup[id]) {
      return scoreClassificationLookup[id];
    }
    // Only fallback to description if ID not found in lookup
    return row.ScoreClassificationDesc || row.Score_ClassificationDesc || id;
  }

  function getDecisionText(row) {
    // Always use lookup map to ensure consistency with hardcoded HTML options
    // Handle various field name variations from server
    const id = String(
      row.ScoreDecisionID || 
      row.ScoreDecisionId || 
      row.ScoreDecision || 
      row.Score_DecisionID ||
      row.Score_Decision ||
      row.DecisionID ||
      ''
    );
    if (id && scoreDecisionLookup[id]) {
      return scoreDecisionLookup[id];
    }
    // Only fallback to description if ID not found in lookup
    return row.ScoreDecisionDesc || row.Score_DecisionDesc || id;
  }

  function renderTable(records) {
    const tbody = document.querySelector('.form-section-table tbody');
    if (!tbody) return;

    if (!records || records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-3 text-muted">No records to display.</td></tr>';
      return;
    }

    tbody.innerHTML = records.map(row => {
      const scoreFrom = row.ScoreFrom ?? row.Score_From ?? '';
      const scoreTo = row.ScoreTo ?? row.Score_To ?? '';
      const classification = getClassificationText(row);
      const decision = getDecisionText(row);
      const isPending = row.isPending ? ' style="background-color: #fffde7;"' : ''; // Highlight pending rows
      
      return `
        <tr data-score-row='${JSON.stringify(row)}'${isPending}>
          <td>${escapeHtml(String(scoreFrom))}</td>
          <td>${escapeHtml(String(scoreTo))}</td>
          <td>${escapeHtml(classification)}</td>
          <td>${escapeHtml(decision)}</td>
        </tr>
      `;
    }).join('');

    console.log(`✅ Rendered ${records.length} score classification(s)`);
  }

  function renderTableWithPending() {
    // Combine existing records with pending records
    const allRecords = [...existingRecords, ...pendingRecords];
    renderTable(allRecords);
  }

  // =============================================
  // WIRE UP EVENT HANDLERS
  // =============================================

  // Action panel Add button
  if (actionButtons.add) {
    actionButtons.add.addEventListener('click', handleAdd);
  }

  // Action panel Edit button
  if (actionButtons.edit) {
    actionButtons.edit.addEventListener('click', handleEdit);
  }

  // Action panel Save button
  if (actionButtons.save) {
    actionButtons.save.addEventListener('click', handleSave);
  }

  // Centered New button
  if (formActionButtons.new) {
    formActionButtons.new.addEventListener('click', handleNew);
  }

  // Centered Add To List button
  if (formActionButtons.addToList) {
    formActionButtons.addToList.addEventListener('click', handleAddToList);
  }

  // Centered Alter button
  if (formActionButtons.alter) {
    formActionButtons.alter.addEventListener('click', handleAlter);
  }

  // Centered Remove button
  if (formActionButtons.remove) {
    formActionButtons.remove.addEventListener('click', handleRemove);
  }

  // Double-click on table row to select and populate form for editing
  const tableBody = document.querySelector('.form-section-table tbody');
  if (tableBody) {
    tableBody.addEventListener('dblclick', (e) => {
      // Only respond to double-clicks in edit mode
      if (currentMode !== 'edit') return;
      
      const row = e.target.closest('tr[data-score-row]');
      if (!row) return;
      
      try {
        const rowData = JSON.parse(row.dataset.scoreRow);
        if (!rowData) return;
        
        // Store selected row data
        selectedRowData = rowData;
        
        // Populate form fields
        formFields.scoreFrom.value = rowData.ScoreFrom ?? rowData.Score_From ?? '';
        formFields.scoreTo.value = rowData.ScoreTo ?? rowData.Score_To ?? '';
        
        // Helper function to set dropdown value with multiple fallback strategies
        function setDropdownValue(selectEl, id, desc, lookupMap) {
          if (!selectEl) return;
          
          const options = Array.from(selectEl.options);
          const idStr = String(id || '').trim();
          const descStr = String(desc || '').trim();
          
          console.log(`Setting ${selectEl.id}: ID="${idStr}", Desc="${descStr}"`);
          console.log('Available options:', options.map(o => ({ value: o.value, text: o.text })));
          
          // Strategy 1: Match by ID value directly
          if (idStr) {
            const matchById = options.find(o => String(o.value).trim() === idStr);
            if (matchById) {
              selectEl.value = matchById.value;
              console.log(`✓ Matched by ID: ${matchById.value}`);
              return;
            }
          }
          
          // Strategy 2: Match by description text (case-insensitive)
          if (descStr) {
            const matchByDesc = options.find(o => 
              o.text.toLowerCase().trim() === descStr.toLowerCase()
            );
            if (matchByDesc) {
              selectEl.value = matchByDesc.value;
              console.log(`✓ Matched by description: ${matchByDesc.value}`);
              return;
            }
          }
          
          // Strategy 3: Use lookup map to get description, then match
          if (idStr && lookupMap && lookupMap[idStr]) {
            const mappedDesc = lookupMap[idStr];
            const matchByLookup = options.find(o => 
              o.text.toLowerCase().trim() === mappedDesc.toLowerCase()
            );
            if (matchByLookup) {
              selectEl.value = matchByLookup.value;
              console.log(`✓ Matched via lookup map: ${matchByLookup.value}`);
              return;
            }
          }
          
          // Strategy 4: Partial text match
          if (descStr) {
            const matchByPartial = options.find(o => 
              o.text.toLowerCase().includes(descStr.toLowerCase()) ||
              descStr.toLowerCase().includes(o.text.toLowerCase())
            );
            if (matchByPartial) {
              selectEl.value = matchByPartial.value;
              console.log(`✓ Matched by partial text: ${matchByPartial.value}`);
              return;
            }
          }
          
          console.warn(`✗ No match found for ${selectEl.id}`);
        }
        
        // Set Score Classification dropdown
        setDropdownValue(
          formFields.scoreClassification,
          rowData.ScoreClassificationID,
          rowData.ScoreClassificationDesc,
          scoreClassificationLookup
        );
        
        // Set Score Decision dropdown
        setDropdownValue(
          formFields.scoreDecision,
          rowData.ScoreDecisionID,
          rowData.ScoreDecisionDesc,
          scoreDecisionLookup
        );
        
        // Keep form fields DISABLED - only enable when Alter is clicked
        setFormFieldsEnabled(false);
        // Enable Alter and Remove buttons
        setFormActionButtonState({ new: false, addToList: false, alter: true, remove: true });
        
        // Highlight selected row
        tableBody.querySelectorAll('tr').forEach(tr => tr.classList.remove('table-primary'));
        row.classList.add('table-primary');
        
        console.log('✅ Row selected for editing:', rowData);
      } catch (err) {
        console.error('Error parsing row data:', err);
      }
    });
  }

  // =============================================
  // INITIALIZATION
  // =============================================

  // Initial state - disable ALL controls until parent form loads data
  setFormFieldsEnabled(false);
  setFormActionButtonState({ new: false, addToList: false, alter: false, remove: false });
  setActionButtonState({ add: false, edit: false, save: false });
  
  // Check if RAID exists AND parent form has successfully loaded a record
  if (!currentRAID) {
    // User came directly without VIEW-loading the parent form
    console.log('⚠️ Parent not ready - please view a record in SPM Risk Acceptance Level first');
    
    // Show error message similar to legacy system
    const messagePanel = document.querySelector('.am-message-panel');
    const messagePanelText = document.querySelector('.am-message-panel span');
    if (messagePanelText && messagePanel) {
      messagePanelText.textContent = 'Database error occurred, Please contact System Administrator[No:1023]';
      messagePanel.classList.add('show');
      // Add error styling
      messagePanel.style.backgroundColor = '#f8d7da';
      messagePanel.style.borderColor = '#f5c6cb';
      messagePanel.style.color = '#721c24';
    }
    
    // Disable Cancel button too since nothing is loaded
    if (actionButtons.cancel) {
      actionButtons.cancel.disabled = true;
    }
  } else {
    // RAID exists - load data, then enable Add button
    loadScoreClassifications();
  }

  console.log('✅ SPM Score Classification page initialized');
})();
