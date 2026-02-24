/**
 * SPM Risk Acceptance Level Page
 * Handles all page interactions including CRUD operations and search
 */
(async function initSPMRiskAcceptanceLevelPage() {
  'use strict';

  // Load required services
  const { ServiceLoader } = window;
  if (ServiceLoader) {
    await ServiceLoader.loadCore();
    await ServiceLoader.loadSearchService();
    await ServiceLoader.loadSPMRiskAcceptanceLevelService();
  }

  const SearchService = window.SearchService;
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

  // Session data - prefer real authenticated identity from nimble_auth_session
  const sessionData = {
    OurBranchID: getBranchId(),
    OperatorID: getOperatorId()
  };

  // Current mode: 'view', 'add', 'edit'
  let currentMode = 'view';

  // =============================================
  // ROUTING FUNCTIONALITY
  // =============================================
  
  // Store current form data in sessionStorage for restoration when returning from child forms
  function storeFormDataForNavigation() {
    const formData = {
      riskAcceptanceId: byId('riskAcceptanceId')?.value || '',
      riskAcceptanceDescription: byId('riskAcceptanceDescription')?.value || '',
      createdBy: byId('createdBy')?.value || '',
      createdOn: byId('createdOn')?.value || '',
      modifiedBy: byId('modifiedBy')?.value || '',
      modifiedOn: byId('modifiedOn')?.value || ''
    };
    sessionStorage.setItem('spmRiskAcceptanceFormData', JSON.stringify(formData));
  }
  
  // Restore form data from sessionStorage (when returning from child form)
  function restoreFormDataFromSession() {
    try {
      const stored = sessionStorage.getItem('spmRiskAcceptanceFormData');
      if (!stored) return false;
      
      const formData = JSON.parse(stored);
      if (!formData || !formData.riskAcceptanceId) return false;
      
      // Restore form fields
      if (byId('riskAcceptanceId')) byId('riskAcceptanceId').value = formData.riskAcceptanceId;
      if (byId('riskAcceptanceDescription')) byId('riskAcceptanceDescription').value = formData.riskAcceptanceDescription;
      if (byId('createdBy')) byId('createdBy').value = formData.createdBy;
      if (byId('createdOn')) byId('createdOn').value = formData.createdOn;
      if (byId('modifiedBy')) byId('modifiedBy').value = formData.modifiedBy;
      if (byId('modifiedOn')) byId('modifiedOn').value = formData.modifiedOn;
      
      // Enable Edit/Delete since we have data loaded
      setButtonState({ view: true, add: true, edit: true, delete: true, save: false, cancel: true });
      
      console.log('✅ Form data restored from session');
      return true;
    } catch (err) {
      console.warn('Could not restore form data from session:', err);
      return false;
    }
  }
  
  document.querySelectorAll('[data-spmral-route]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      const route = btn.dataset.spmralRoute;
      if (route) {
        // Store form data before navigating to child form
        storeFormDataForNavigation();
        
        // Store and pass current internal RAID for child forms.
        // NOTE: the Risk Acceptance ID field is a user-facing ID and may NOT equal the internal RAID
        // that child SPs expect.
        const storedRaid = sessionStorage.getItem('currentRAID');
        const storedRaidSafe = storedRaid && String(storedRaid).trim();
        const riskIdDisplay = byId('riskAcceptanceId')?.value?.trim();

        // Avoid overwriting a valid internal RAID with the display ID.
        const raidToUse = storedRaidSafe || riskIdDisplay || '';
        if (raidToUse) sessionStorage.setItem('currentRAID', String(raidToUse));

        // Also pass RAID in the URL for extra resilience.
        // The child screen will still gate activation using spmRiskAcceptanceLevelReady.
        const url = new URL(route, window.location.href);
        if (raidToUse) url.searchParams.set('RAID', String(raidToUse));
        url.searchParams.set('t', String(Date.now()));
        window.location.href = url.toString();
      }
    });
  });

  function extractFirstRowFromOldApiResponse(response) {
    const candidates = [
      response?.data?.Details,
      response?.data?.Details01,
      response?.data,
      response?.Details,
      response?.Details01
    ];

    for (const c of candidates) {
      if (!c) continue;
      if (Array.isArray(c)) return c[0] || null;
      if (c && typeof c === 'object' && Array.isArray(c.Details)) return c.Details[0] || null;
      if (c && typeof c === 'object') return c;
    }
    return null;
  }

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
  // ACTION BUTTONS
  // =============================================
  const actionButtons = {
    view: document.querySelector('.cm-shell__action:nth-child(2)'),
    add: document.querySelector('.cm-shell__action:nth-child(3)'),
    edit: document.querySelector('.cm-shell__action:nth-child(4)'),
    delete: document.querySelector('.cm-shell__action:nth-child(5)'),
    save: document.querySelector('.cm-shell__action--success'),
    cancel: document.querySelector('.cm-shell__action--danger')
  };

  function setButtonState(states) {
    Object.keys(states).forEach(key => {
      if (actionButtons[key]) {
        actionButtons[key].disabled = !states[key];
      }
    });
  }

  function setFieldsReadOnly(readOnly) {
    const riskIdField = byId('riskAcceptanceId');
    const descField = byId('riskAcceptanceDescription');
    
    if (riskIdField) riskIdField.readOnly = readOnly;
    if (descField) descField.readOnly = readOnly;
  }

  function clearForm() {
    byId('riskAcceptanceId').value = '';
    byId('riskAcceptanceDescription').value = '';
    byId('createdBy').value = '';
    byId('createdOn').value = '';
    byId('modifiedBy').value = '';
    byId('modifiedOn').value = '';
  }

  function populateForm(data) {
    console.log('Populating form with data:', data); // Debug: see actual API fields
    
    // UI field label is "Risk Acceptance ID". Prefer the display RiskAcceptanceID when present.
    byId('riskAcceptanceId').value = data.RiskAcceptanceID || data.RAID || '';
    byId('riskAcceptanceDescription').value = data.RADescription || data.Description || '';
    
    // Audit fields - map common API field name variations
    byId('createdBy').value = data.CreatedBy || data.Created_By || data.Maker || data.MakerID || data.AddedBy || data.EnteredBy || '';
    byId('createdOn').value = data.CreatedOn || data.Created_On || data.DateCreated || data.CreatedDate || data.MakeDate || data.AddDate || '';
    byId('modifiedBy').value = data.ModifiedBy || data.Modified_By || data.Checker || data.CheckerID || data.UpdatedBy || data.ApprovedBy || '';
    byId('modifiedOn').value = data.ModifiedOn || data.Modified_On || data.DateModified || data.ModifiedDate || data.CheckDate || data.UpdatedDate || '';
  }

  // =============================================
  // VIEW FUNCTIONALITY
  // =============================================
  async function handleView() {
    const riskId = byId('riskAcceptanceId')?.value?.trim();
    
    if (!riskId) {
      alert('Please enter or select a Risk Acceptance ID first.');
      return;
    }

    try {
      if (!SPMRiskAcceptanceLevelService) {
        console.error('SPMRiskAcceptanceLevelService not loaded');
        alert('Service not available. Please refresh the page.');
        return;
      }

      const response = await SPMRiskAcceptanceLevelService.getRiskAcceptanceLevel({
        RAID: riskId
      });

      console.log('View response:', response);

      if (response.success && response.data) {
        // Extract data from response (handle different response structures)
        const details = response.data.Details || response.data;
        const record = Array.isArray(details) ? details[0] : details;

        if (record) {
          populateForm(record);

          // Mark parent form as having successfully loaded/viewed a RAID.
          // Child form (SPM Score Classification) will only activate controls when this flag is set.
          // Child (Score Classification) SP expects the internal RAID.
          // Store BOTH display ID and internal RAID for debugging + routing safety.
          const internalRaid = record.RAID || '';
          const displayId = record.RiskAcceptanceID || riskId;
          try {
            if (internalRaid) {
              sessionStorage.setItem('currentRAID', String(internalRaid));
            } else {
              // Fallback: if backend does not return RAID, keep whatever user entered.
              sessionStorage.setItem('currentRAID', String(displayId ?? ''));
            }
            sessionStorage.setItem('currentRiskAcceptanceID', String(displayId ?? ''));
            sessionStorage.setItem('spmRiskAcceptanceLevelReady', '1');
            sessionStorage.setItem('spmRiskAcceptanceLevelReadyAt', String(Date.now()));
          } catch (_) {}

          currentMode = 'view';
          setButtonState({ view: true, add: true, edit: true, delete: true, save: false, cancel: true });
          setFieldsReadOnly(true);
          console.log('✅ Record loaded successfully');
        } else {
          // No record found - keep ID, disable View, enable only Add/Cancel
          alert('No record found for the given Risk Acceptance ID.');
          setButtonState({ view: false, add: true, edit: false, delete: false, save: false, cancel: true });
        }
      } else {
        // API error or no data - keep ID, disable View, enable only Add/Cancel
        alert(response.message || 'No record found for the given Risk Acceptance ID.');
        setButtonState({ view: false, add: true, edit: false, delete: false, save: false, cancel: true });
      }
    } catch (error) {
      console.error('View error:', error);
      alert('Error fetching record. Please try again.');
    }
  }

  // =============================================
  // ADD FUNCTIONALITY
  // =============================================
  function handleAdd() {
    // Save the current Risk Acceptance ID before clearing
    const currentRiskId = byId('riskAcceptanceId')?.value?.trim() || '';
    
    clearForm();
    
    // Restore the Risk Acceptance ID
    byId('riskAcceptanceId').value = currentRiskId;

    // Clear parent-ready flag and stored form data when starting a fresh Add
    try {
      sessionStorage.removeItem('spmRiskAcceptanceLevelReady');
      sessionStorage.removeItem('spmRiskAcceptanceLevelReadyAt');
      sessionStorage.removeItem('currentRAID');
      sessionStorage.removeItem('spmRiskAcceptanceFormData');
    } catch (_) {}

    currentMode = 'add';
    setButtonState({ view: false, add: false, edit: false, delete: false, save: true, cancel: true });
    setFieldsReadOnly(false);
    byId('riskAcceptanceDescription')?.focus();
    console.log('✅ Add mode enabled');
  }

  // =============================================
  // EDIT FUNCTIONALITY
  // =============================================
  function handleEdit() {
    const riskId = byId('riskAcceptanceId')?.value?.trim();
    
    if (!riskId) {
      alert('Please view a record first before editing.');
      return;
    }

    currentMode = 'edit';
    setButtonState({ view: false, add: false, edit: false, delete: false, save: true, cancel: true });
    
    // In edit mode, RAID is read-only (can't change primary key), only description is editable
    byId('riskAcceptanceId').readOnly = true;
    byId('riskAcceptanceDescription').readOnly = false;
    
    // Disable lookup button - can't change primary key
    const lookupBtn = byId('btnSearchRiskAcceptance');
    if (lookupBtn) lookupBtn.disabled = true;
    
    byId('riskAcceptanceDescription')?.focus();
    
    console.log('✅ Edit mode enabled');
  }

  // =============================================
  // DELETE FUNCTIONALITY
  // =============================================
  async function handleDelete() {
    const riskId = byId('riskAcceptanceId')?.value?.trim();
    
    if (!riskId) {
      alert('Please view a record first before deleting.');
      return;
    }

    // Confirm deletion
    const confirmed = confirm(`Are you sure you want to delete Risk Acceptance Level "${riskId}"?\n\nThis action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    try {
      if (!SPMRiskAcceptanceLevelService) {
        console.error('SPMRiskAcceptanceLevelService not loaded');
        alert('Service not available. Please refresh the page.');
        return;
      }

      const response = await SPMRiskAcceptanceLevelService.deleteRiskAcceptanceLevel({
        RAID: riskId,
        OperatorID: sessionData.OperatorID
      });

      console.log('Delete response:', response);

      if (response.success) {
        alert('Record deleted successfully!');
        clearForm();
        currentMode = 'view';
        // Return to initial state - only View enabled
        setButtonState({ view: true, add: false, edit: false, delete: false, save: false, cancel: false });
        // Keep ID field editable for user to enter, only description readonly
        byId('riskAcceptanceId').readOnly = false;
        byId('riskAcceptanceDescription').readOnly = true;
        // Focus on ID field
        byId('riskAcceptanceId')?.focus();
        console.log('✅ Record deleted successfully');
      } else {
        alert(response.message || 'Failed to delete record.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Error deleting record. Please try again.');
    }
  }

  // =============================================
  // SAVE FUNCTIONALITY
  // =============================================
  async function handleSave() {
    const riskId = byId('riskAcceptanceId')?.value?.trim();
    const description = byId('riskAcceptanceDescription')?.value?.trim();

    // Validation
    if (!riskId) {
      alert('Risk Acceptance ID is required.');
      byId('riskAcceptanceId')?.focus();
      return;
    }

    if (!description) {
      alert('Description is required.');
      byId('riskAcceptanceDescription')?.focus();
      return;
    }

    try {
      if (!SPMRiskAcceptanceLevelService) {
        console.error('SPMRiskAcceptanceLevelService not loaded');
        alert('Service not available. Please refresh the page.');
        return;
      }

      const response = await SPMRiskAcceptanceLevelService.saveRiskAcceptanceLevel({
        RAID: riskId,
        RADescription: description,
        OperatorID: sessionData.OperatorID
      });

      console.log('Save response:', response);

      if (response.success) {
        alert(currentMode === 'add' ? 'Record created successfully!' : 'Record updated successfully!');

        // Some environments return the newly-created internal RAID from the save SP.
        // Capture it immediately so child modules can open right after Save.
        const savedRow = extractFirstRowFromOldApiResponse(response);
        const internalRaid = savedRow?.RAID || savedRow?.Raid || '';
        const displayId = savedRow?.RiskAcceptanceID || savedRow?.RiskAcceptanceId || riskId;
        try {
          if (displayId) sessionStorage.setItem('currentRiskAcceptanceID', String(displayId));
          if (internalRaid) {
            sessionStorage.setItem('currentRAID', String(internalRaid));
          }
          // Treat Save as a successful parent context initialization (equivalent to View).
          sessionStorage.setItem('spmRiskAcceptanceLevelReady', '1');
          sessionStorage.setItem('spmRiskAcceptanceLevelReadyAt', String(Date.now()));
        } catch (_) {}

        currentMode = 'view';
        setFieldsReadOnly(true);
        
        // Re-enable lookup button
        const lookupBtn = byId('btnSearchRiskAcceptance');
        if (lookupBtn) lookupBtn.disabled = false;
        
        // Reload the record to get audit fields + ensure internal RAID is stored.
        // If the save SP returned an internal RAID, prefer it for the reload.
        if (internalRaid) {
          byId('riskAcceptanceId').value = String(displayId || riskId);
          await handleView();
        } else {
          await handleView();
        }
        
        // After successful save, only enable Edit, Delete, Cancel
        setButtonState({ view: false, add: false, edit: true, delete: true, save: false, cancel: true });
        console.log('✅ Record saved successfully');
      } else {
        alert(response.message || 'Failed to save record.');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Error saving record. Please try again.');
    }
  }

  // Wire up action button handlers
  if (actionButtons.view) {
    actionButtons.view.addEventListener('click', handleView);
  }

  if (actionButtons.add) {
    actionButtons.add.addEventListener('click', handleAdd);
  }

  if (actionButtons.edit) {
    actionButtons.edit.addEventListener('click', handleEdit);
  }

  if (actionButtons.delete) {
    actionButtons.delete.addEventListener('click', handleDelete);
  }

  if (actionButtons.save) {
    actionButtons.save.addEventListener('click', handleSave);
  }

  if (actionButtons.cancel) {
    actionButtons.cancel.addEventListener('click', () => {
      clearForm();

      // Clear parent-ready flag and stored form data when form is cleared/cancelled
      try {
        sessionStorage.removeItem('spmRiskAcceptanceLevelReady');
        sessionStorage.removeItem('spmRiskAcceptanceLevelReadyAt');
        sessionStorage.removeItem('currentRAID');
        sessionStorage.removeItem('spmRiskAcceptanceFormData');
      } catch (_) {}

      currentMode = 'view';
      setButtonState({ view: true, add: false, edit: false, delete: false, save: false, cancel: false });
      // Keep ID field editable, only description readonly
      byId('riskAcceptanceId').readOnly = false;
      byId('riskAcceptanceDescription').readOnly = true;
      
      // Re-enable lookup button
      const lookupBtn = byId('btnSearchRiskAcceptance');
      if (lookupBtn) lookupBtn.disabled = false;
      
      // Focus on ID field
      byId('riskAcceptanceId')?.focus();
    });
  }

  // Initial button state - Only View enabled
  setButtonState({ view: true, add: false, edit: false, delete: false, save: false, cancel: false });
  // Keep ID field editable for user to enter, only description readonly
  byId('riskAcceptanceId').readOnly = false;
  byId('riskAcceptanceDescription').readOnly = true;
  
  // Focus on Risk Acceptance ID field on form open
  byId('riskAcceptanceId')?.focus();

  // =============================================
  // RISK ACCEPTANCE ID SEARCH FUNCTIONALITY
  // =============================================

  // Modal reference
  let riskAcceptanceLookupModal = null;

  function getModal() {
    if (!riskAcceptanceLookupModal) {
      const modalEl = byId('riskAcceptanceLookupModal');
      if (modalEl) {
        riskAcceptanceLookupModal = new bootstrap.Modal(modalEl);
      }
    }
    return riskAcceptanceLookupModal;
  }

  function openSearchPanel() {
    const modal = getModal();
    if (modal) {
      resetSearchPanel();
      modal.show();
      // Auto-load all records on modal open
      setTimeout(() => performSearch(null, true), 100);
    }
  }

  function closeSearchPanel() {
    const modal = getModal();
    if (modal) modal.hide();
  }

  function resetSearchPanel() {
    const searchId = byId('riskAcceptanceSearchId');
    const searchDesc = byId('riskAcceptanceSearchDesc');
    const modeId = byId('riskAcceptanceSearchModeId');
    const modeDesc = byId('riskAcceptanceSearchModeDesc');
    const results = byId('riskAcceptanceSearchResults');
    const empty = byId('riskAcceptanceSearchEmpty');
    const loading = byId('riskAcceptanceSearchLoading');

    if (searchId) searchId.value = '';
    if (searchDesc) searchDesc.value = '';
    if (modeId) modeId.value = 'Like';
    if (modeDesc) modeDesc.value = 'Like';
    if (results) results.innerHTML = '';
    if (empty) {
      empty.style.display = 'block';
      empty.textContent = 'Enter at least one filter above and click Search to query risk acceptance levels.';
    }
    if (loading) loading.classList.add('d-none');
  }

  function escapeSqlValue(value) {
    return String(value ?? '').replace(/'/g, "''");
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  function extractSearchRows(response) {
    const candidates = [
      response?.Details?.SearchResults,
      response?.Details,
      response?.SearchResults,
      response?.data?.Details,
      response?.data?.Details?.SearchResults,
      response?.data
    ];
    for (const c of candidates) {
      if (!c) continue;
      if (Array.isArray(c)) return c;
      if (typeof c === 'object') return [c];
    }
    return [];
  }

  async function performSearch(event, forceLoadAll = false) {
    if (event) event.preventDefault();

    const searchIdEl = byId('riskAcceptanceSearchId');
    const searchDescEl = byId('riskAcceptanceSearchDesc');
    const idValue = (searchIdEl?.value || '').trim();
    const descValue = (searchDescEl?.value || '').trim();
    const idMode = byId('riskAcceptanceSearchModeId')?.value || 'Like';
    const descMode = byId('riskAcceptanceSearchModeDesc')?.value || 'Like';
    const results = byId('riskAcceptanceSearchResults');
    const empty = byId('riskAcceptanceSearchEmpty');
    const loading = byId('riskAcceptanceSearchLoading');

    if (results) results.innerHTML = '';
    if (empty) empty.style.display = 'none';
    if (loading) loading.classList.remove('d-none');

    const clauses = [];
    const buildClause = (col, mode, val) => {
      if (!val) return null;
      const escaped = escapeSqlValue(val);
      return mode === 'Exact' ? `${col} = '${escaped}'` : `${col} LIKE '%${escaped}%'`;
    };

    const idClause = buildClause('RiskAcceptanceID', idMode, idValue);
    const descClause = buildClause('Description', descMode, descValue);
    [idClause, descClause].forEach(c => c && clauses.push(c));

    const whereStmt = clauses.join(' AND ');

    // If no filters and not forcing load all, show empty message
    if (!whereStmt && !forceLoadAll) {
      if (loading) loading.classList.add('d-none');
      if (empty) {
        empty.style.display = 'block';
        empty.textContent = 'Enter at least one filter above and click Search to query risk acceptance levels.';
      }
      return;
    }

    // For loading all, use a condition that matches everything
    const finalWhereStmt = forceLoadAll && !whereStmt ? '1=1' : whereStmt;

    const payload = {
      TableID: 'RiskAcceptanceID',
      WhereStmt: finalWhereStmt,
      AdvFilterString: '',
      PrevOrNext: '0',
      RefID: '',
      OperatorID: sessionData.OperatorID,
      ModuleID: 1000,
      OurBranchID: sessionData.OurBranchID
    };

    try {
      let rows = [];
      
      if (SearchService && typeof SearchService.search === 'function') {
        const response = await SearchService.search(payload);
        rows = extractSearchRows(response);
      }

      if (loading) loading.classList.add('d-none');

      if (!rows || rows.length === 0) {
        if (empty) {
          empty.style.display = 'block';
          empty.textContent = 'No risk acceptance levels found matching your criteria.';
        }
        return;
      }

      // Sort by RAID ascending
      rows.sort((a, b) => {
        const idA = String(a.RAID || a.RiskAcceptanceID || '').toLowerCase();
        const idB = String(b.RAID || b.RiskAcceptanceID || '').toLowerCase();
        return idA.localeCompare(idB);
      });

      // Render results
      if (results) {
        results.innerHTML = rows.map(row => {
          const id = row.RAID || row.RiskAcceptanceID || '';
          const desc = row.RADescription || row.Description || row.RiskAcceptanceDesc || row.Name || '';
          return `
            <tr>
              <td>${escapeHtml(id)}</td>
              <td>${escapeHtml(desc)}</td>
              <td class="text-end">
                <button type="button" class="btn btn-sm btn-outline-primary" 
                        data-select-risk-acceptance='${JSON.stringify({ RiskAcceptanceID: id, Description: desc })}'>
                  <i class="bi bi-check-lg me-1"></i>Select
                </button>
              </td>
            </tr>
          `;
        }).join('');

        // Attach select handlers
        results.querySelectorAll('[data-select-risk-acceptance]').forEach(btn => {
          btn.addEventListener('click', function() {
            const data = JSON.parse(this.getAttribute('data-select-risk-acceptance'));
            selectRiskAcceptance(data);
          });
        });
      }
    } catch (error) {
      console.error('Risk acceptance search error:', error);
      if (loading) loading.classList.add('d-none');
      if (empty) {
        empty.style.display = 'block';
        empty.textContent = 'Error searching risk acceptance levels. Please try again.';
      }
    }
  }

  function selectRiskAcceptance(data) {
    const riskIdField = byId('riskAcceptanceId');
    const descField = byId('riskAcceptanceDescription');

    if (riskIdField) {
      riskIdField.value = data.RiskAcceptanceID || '';
    }
    if (descField) {
      descField.value = data.Description || '';
    }

    closeSearchPanel();
  }

  // Wire up search event handlers
  function initSearchEvents() {
    // Open modal button
    const openBtn = byId('btnSearchRiskAcceptance');
    openBtn?.addEventListener('click', openSearchPanel);

    // Form submit
    const form = byId('riskAcceptanceLookupForm');
    form?.addEventListener('submit', performSearch);

    // Reset button
    const resetBtn = byId('riskAcceptanceSearchReset');
    resetBtn?.addEventListener('click', resetSearchPanel);

    // Refresh button
    const refreshBtn = byId('riskAcceptanceSearchRefresh');
    refreshBtn?.addEventListener('click', () => {
      resetSearchPanel();
      performSearch(null, true);
    });

    // Cancel button
    const cancelBtn = byId('riskAcceptanceSearchCancel');
    cancelBtn?.addEventListener('click', closeSearchPanel);
  }

  // Initialize search events
  initSearchEvents();
  
  // On page load, check if we're returning from a child form and restore data
  restoreFormDataFromSession();
  
  console.log('✅ SPM Risk Acceptance Level page initialized');
  console.log('✅ SPMRiskAcceptanceLevelService loaded:', !!SPMRiskAcceptanceLevelService);
})();
