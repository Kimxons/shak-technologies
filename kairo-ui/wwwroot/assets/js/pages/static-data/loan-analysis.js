(() => {
  if (window.__kairoLoanAnalysisLoaded) return;
  window.__kairoLoanAnalysisLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update"
  };

  const state = {
    mode: MODES.VIEW,
    hasLoaded: false,
    isBusy: false,
    slabs: [],
    updateCount: 0,
    selectedSlabIndex: -1,
    gridAction: null,  // 'new', 'alter', or null
    recordNotFound: false
  };

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  // ==================== SESSION/CONTEXT HELPERS ====================
  function getSession() {
    try {
      const raw = localStorage.getItem('nimble_auth_session');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function getContext() {
    const session = getSession() || {};
    return {
      bankId: session.BankID || session.bankId || session.bankID || '00',
      branchId: session.OurBranchID || session.ourBranchID || session.branchId || '0101',
      ourBranchId: session.OurBranchID || session.ourBranchID || session.branchId || '0101',
      operatorId: session.OperatorID || session.operatorID || session.name || 'SYSTEM'
    };
  }

  function setMode(nextMode) {
    state.mode = nextMode;

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#loan-analysis-form");
    if (!form) return;

    const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        return;
      }
      el.disabled = !isEditable;
    });

    // Keep search buttons enabled in all modes.
    qsa("[data-always-enabled]", form).forEach((el) => {
      el.disabled = false;
    });

    // Update mode buttons based on current state
    updateModeButtons();

    // Update grid buttons based on mode and state
    updateGridButtons();
  }

  // ==================== MODE BUTTON STATE ====================
  function updateModeButtons() {
    const viewBtn = qs('[data-shell-mode="View"]');
    const addBtn = qs('[data-shell-mode="Add"]');
    const updateBtn = qs('[data-shell-mode="Update"]');
    const saveBtn = qs('[data-la-action="save"]');
    const cancelBtn = qs('[data-la-action="cancel"]');
    const deleteBtn = qs('[data-la-action="delete"]');

    const isEditable = state.mode === MODES.ADD || state.mode === MODES.UPDATE;
    const hasLoaded = state.hasLoaded;
    const recordNotFound = state.recordNotFound;

    if (state.mode === MODES.VIEW) {
      if (!hasLoaded && !recordNotFound) {
        // Initial state - only View is enabled
        setButtonDisabled(viewBtn, false);
        setButtonDisabled(addBtn, true);
        setButtonDisabled(updateBtn, true);
        setButtonDisabled(saveBtn, true);
        setButtonDisabled(cancelBtn, true);
        setButtonDisabled(deleteBtn, true);
      } else if (recordNotFound) {
        // Record not found - View and Add enabled
        setButtonDisabled(viewBtn, false);
        setButtonDisabled(addBtn, false);
        setButtonDisabled(updateBtn, true);
        setButtonDisabled(saveBtn, true);
        setButtonDisabled(cancelBtn, true);
        setButtonDisabled(deleteBtn, true);
      } else {
        // Record loaded - View disabled, Edit/Delete/Cancel enabled
        setButtonDisabled(viewBtn, true);
        setButtonDisabled(addBtn, true);
        setButtonDisabled(updateBtn, false);
        setButtonDisabled(saveBtn, true);
        setButtonDisabled(cancelBtn, false);
        setButtonDisabled(deleteBtn, false);
      }
    } else if (isEditable) {
      // In Add or Update mode - only Save/Cancel enabled, others disabled
      setButtonDisabled(viewBtn, true);
      setButtonDisabled(addBtn, true);
      setButtonDisabled(updateBtn, true);
      setButtonDisabled(saveBtn, false);
      setButtonDisabled(cancelBtn, false);
      setButtonDisabled(deleteBtn, true);
    }
  }

  // ==================== GRID BUTTON STATE ====================
  function updateGridButtons() {
    const isEditable = state.mode === MODES.ADD || state.mode === MODES.UPDATE;
    const hasRowSelected = state.selectedSlabIndex >= 0;
    const currentAction = state.gridAction;

    const newBtn = qs('[data-la-grid-action="new"]');
    const alterBtn = qs('[data-la-grid-action="alter"]');
    const removeBtn = qs('[data-la-grid-action="remove"]');
    const updateBtn = qs('[data-la-grid-action="update"]');
    const clearBtn = qs('[data-la-grid-action="clear"]');

    // Get detail fields
    const descField = qs('#DetailDescription');
    const fromField = qs('#FromValue');
    const toField = qs('#ToValue');

    // Fields editable when in editable mode with new/alter action
    const fieldsEditable = isEditable && (currentAction === 'new' || currentAction === 'alter');
    if (descField) descField.disabled = !fieldsEditable;
    if (fromField) fromField.disabled = !fieldsEditable;
    if (toField) toField.disabled = !fieldsEditable;

    if (!isEditable) {
      // View mode - disable all grid buttons
      setButtonDisabled(newBtn, true);
      setButtonDisabled(alterBtn, true);
      setButtonDisabled(removeBtn, true);
      setButtonDisabled(updateBtn, true);
      setButtonDisabled(clearBtn, true);
    } else if (currentAction === 'new' || currentAction === 'alter') {
      // In New/Alter action - New, Alter, Remove are inactive; Update, Clear are active
      setButtonDisabled(newBtn, true);
      setButtonDisabled(alterBtn, true);
      setButtonDisabled(removeBtn, true);
      setButtonDisabled(updateBtn, false);
      setButtonDisabled(clearBtn, false);
    } else {
      // No action - New, Alter, Remove are active; Update, Clear are inactive
      setButtonDisabled(newBtn, false);
      setButtonDisabled(alterBtn, hasRowSelected ? false : true);
      setButtonDisabled(removeBtn, hasRowSelected ? false : true);
      setButtonDisabled(updateBtn, true);
      setButtonDisabled(clearBtn, true);
    }
  }

  function setButtonDisabled(btn, disabled) {
    if (!btn) return;
    btn.disabled = disabled;
    if (disabled) {
      btn.classList.add('disabled');
    } else {
      btn.classList.remove('disabled');
    }
  }

  // ==================== GRID ACTION HANDLERS ====================
  function handleGridButton(e) {
    const action = e.currentTarget.dataset.laGridAction;
    
    switch (action) {
      case 'new':
        handleGridNew();
        break;
      case 'alter':
        handleGridAlter();
        break;
      case 'remove':
        handleGridRemove();
        break;
      case 'update':
        handleGridUpdate();
        break;
      case 'clear':
        handleGridClear();
        break;
    }
  }

  function handleGridNew() {
    state.gridAction = 'new';
    state.selectedSlabIndex = -1;
    
    // Clear detail fields
    const descField = qs('#DetailDescription');
    const fromField = qs('#FromValue');
    const toField = qs('#ToValue');
    
    if (descField) descField.value = '';
    if (fromField) fromField.value = '';
    if (toField) toField.value = '';
    
    // Clear table selection
    const tbody = qs('#slabsTableBody');
    if (tbody) {
      qsa('tr', tbody).forEach(tr => tr.classList.remove('table-primary'));
    }
    
    updateGridButtons();
    descField?.focus();
    setToast('Enter new slab details', 'info');
  }

  function handleGridAlter() {
    if (state.selectedSlabIndex < 0) {
      setToast('Please select a row to alter', 'warning');
      return;
    }
    
    state.gridAction = 'alter';
    updateGridButtons();
    
    qs('#DetailDescription')?.focus();
    setToast('Modify the details and click Update', 'info');
  }

  function handleGridRemove() {
    if (state.selectedSlabIndex < 0) {
      setToast('Please select a row to remove', 'warning');
      return;
    }
    
    const slab = state.slabs[state.selectedSlabIndex];
    const desc = slab?.Description || 'this slab';
    
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: 'Confirm Removal',
        text: `Remove "${desc}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, remove it'
      }).then((result) => {
        if (result.isConfirmed) {
          performRemoveSlab();
        }
      });
    } else {
      if (confirm(`Remove "${desc}"?`)) {
        performRemoveSlab();
      }
    }
  }

  function performRemoveSlab() {
    state.slabs.splice(state.selectedSlabIndex, 1);
    rerenderSlabsTable();
    handleGridClear();
    setToast('Slab removed', 'success');
  }

  function handleGridUpdate() {
    const desc = qs('#DetailDescription')?.value?.trim() || '';
    const from = qs('#FromValue')?.value?.trim() || '';
    const to = qs('#ToValue')?.value?.trim() || '';
    
    if (!desc) {
      setToast('Please enter a description', 'warning');
      return;
    }
    
    if (state.gridAction === 'alter' && state.selectedSlabIndex >= 0) {
      // Update existing slab - preserve isNew flag
      const existingSlab = state.slabs[state.selectedSlabIndex];
      state.slabs[state.selectedSlabIndex] = {
        Description: desc,
        FromValue: from,
        ToValue: to,
        isNew: existingSlab?.isNew ?? false // Preserve new flag
      };
      setToast('Slab updated', 'success');
    } else if (state.gridAction === 'new') {
      // Add new slab - mark as new
      state.slabs.push({
        Description: desc,
        FromValue: from,
        ToValue: to,
        isNew: true // New record
      });
      setToast('Slab added', 'success');
    }
    
    // Update NoOfSlabs field
    const noOfSlabsEl = qs('#NoOfSlabs');
    if (noOfSlabsEl) noOfSlabsEl.value = state.slabs.length;
    
    rerenderSlabsTable();
    handleGridClear();
  }

  function handleGridClear() {
    state.gridAction = null;
    state.selectedSlabIndex = -1;
    
    // Clear detail fields
    const descField = qs('#DetailDescription');
    const fromField = qs('#FromValue');
    const toField = qs('#ToValue');
    
    if (descField) descField.value = '';
    if (fromField) fromField.value = '';
    if (toField) toField.value = '';
    
    // Clear table selection
    const tbody = qs('#slabsTableBody');
    if (tbody) {
      qsa('tr', tbody).forEach(tr => tr.classList.remove('table-primary'));
    }
    
    updateGridButtons();
  }

  // Re-render slabs table from state
  function rerenderSlabsTable() {
    const tbody = qs('#slabsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!state.slabs.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="3" class="text-muted text-center">No records to display.</td>';
      tbody.appendChild(tr);
      return;
    }

    for (let i = 0; i < state.slabs.length; i++) {
      const slab = state.slabs[i];
      const tr = document.createElement('tr');
      tr.dataset.index = i;
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
        <td>${String(slab.Description || '')}</td>
        <td>${String(slab.FromValue || '')}</td>
        <td>${String(slab.ToValue || '')}</td>
      `;
      tr.addEventListener('click', () => selectSlabRow(i));
      tbody.appendChild(tr);
    }
  }

  // ==================== TOAST HELPERS (Kairo Design System) ====================
  function ensureToastContainer() {
    let el = document.querySelector('[data-kairo-toast-container]');
    if (el) return el;
    el = document.createElement('div');
    el.className = 'kairo-toast-container';
    el.setAttribute('data-kairo-toast-container', '');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(el);
    return el;
  }

  function showToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
    const container = ensureToastContainer();

    // Limit to one toast at a time - remove existing
    const existingToasts = container.querySelectorAll('.kairo-toast');
    existingToasts.forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `kairo-toast kairo-toast--${variant}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-atomic', 'true');

    const body = document.createElement('div');
    body.className = 'kairo-toast__body';
    body.textContent = String(message || '');

    toast.appendChild(body);
    container.appendChild(toast);

    const remove = () => {
      try {
        toast.classList.remove('is-show');
        setTimeout(() => toast.remove(), 160);
      } catch {
        // ignore
      }
    };

    setTimeout(() => toast.classList.add('is-show'), 0);
    if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
  }

  function showSuccessToast(message) {
    showToast(message, { title: 'Success', variant: 'success', timeoutMs: 3000 });
  }

  function showErrorToast(message) {
    showToast(message, { title: 'Error', variant: 'danger', timeoutMs: 4000 });
  }

  function showWarningToast(message) {
    showToast(message, { title: 'Warning', variant: 'warning', timeoutMs: 3000 });
  }

  function showInfoToast(message) {
    showToast(message, { title: 'Info', variant: 'info', timeoutMs: 3000 });
  }

  function setToast(message, variant = "success") {
    switch (variant) {
      case 'success':
        showSuccessToast(message);
        break;
      case 'danger':
      case 'error':
        showErrorToast(message);
        break;
      case 'warning':
        showWarningToast(message);
        break;
      case 'info':
      default:
        showInfoToast(message);
        break;
    }
  }

  // ==================== SEARCH MODAL STATE ====================
  let searchModal = null;
  const searchState = {
    results: [],
    selectedIndex: -1,
    currentPage: 0,
    pageSize: 50
  };

  // ==================== SEARCH MODAL FUNCTIONS ====================
  function openSearchModal() {
    const modalEl = qs('#loanAnalysisSearchModal');
    if (!modalEl) {
      console.error('[LoanAnalysis] Search modal element not found');
      return;
    }

    // Try current window Bootstrap first, then parent
    const Bootstrap = window.bootstrap || window.parent?.bootstrap;
    if (!Bootstrap) {
      console.error('[LoanAnalysis] Bootstrap not available');
      return;
    }

    if (!searchModal) {
      searchModal = new Bootstrap.Modal(modalEl);
    }

    // Clear previous search filters
    const searchIdField = qs('#searchLoanAnalysisId');
    const searchDescField = qs('#searchDescription');
    const searchTypeField = qs('#searchAnalysisTypeId');
    
    if (searchIdField) searchIdField.value = '';
    if (searchDescField) searchDescField.value = '';
    if (searchTypeField) searchTypeField.value = '';
    
    clearSearchResults();

    searchModal.show();

    // Auto-fetch all records by scanning common IDs (workaround since SP doesn't support wildcards)
    console.log('[LoanAnalysis] Modal opened, fetching all records...');
    setTimeout(async () => {
      try {
        await fetchAllRecords();
      } catch (err) {
        console.error('[LoanAnalysis] Auto-fetch failed:', err);
      }
    }, 200);
  }

  // Fetch all records by scanning a range of IDs (workaround for SP that doesn't support wildcards)
  async function fetchAllRecords() {
    const loader = qs('#loanAnalysisSearchLoader');
    const emptyMsg = qs('#loanAnalysisSearchEmpty');
    const tbody = qs('#loanAnalysisSearchResults');

    if (loader) loader.classList.remove('d-none');
    if (emptyMsg) emptyMsg.classList.add('d-none');
    if (tbody) tbody.innerHTML = '';

    try {
      await ensureServicesLoaded();
      const ctx = getContext();

      // Generate IDs to check: 01-99
      const idsToCheck = [];
      for (let i = 1; i <= 99; i++) {
        idsToCheck.push(i.toString().padStart(2, '0'));
      }

      console.log('[LoanAnalysis] Scanning IDs:', idsToCheck.length);

      // Make parallel API calls (in batches to avoid overwhelming the server)
      const batchSize = 10;
      const allResults = [];

      for (let i = 0; i < idsToCheck.length; i += batchSize) {
        const batch = idsToCheck.slice(i, i + batchSize);
        const promises = batch.map(id => 
          window.StaticDataService.getLoanAnalysis({
            BankID: ctx.bankId,
            OurBranchID: ctx.branchId,
            LoanAnalysisID: id,
            OperatorID: ctx.operatorId
          }).catch(() => null) // Ignore errors for non-existent IDs
        );

        const responses = await Promise.all(promises);
        
        for (const resp of responses) {
          if (!resp) continue;
          const payload = resp?.data ?? resp;
          const records = payload?.Details01 || [];
          const validRecords = records.filter(r => !isMetaOnlyObject(r) && r.LoanAnalysisID);
          allResults.push(...validRecords);
        }

        // Stop early if we've found enough records (optimization)
        if (allResults.length > 0 && i >= 20) {
          console.log('[LoanAnalysis] Found records, stopping scan early');
          break;
        }
      }

      console.log('[LoanAnalysis] Total records found:', allResults.length);

      // Remove duplicates by LoanAnalysisID
      const uniqueResults = [];
      const seenIds = new Set();
      for (const record of allResults) {
        if (!seenIds.has(record.LoanAnalysisID)) {
          seenIds.add(record.LoanAnalysisID);
          uniqueResults.push(record);
        }
      }

      // Store and render results
      searchState.results = uniqueResults;
      searchState.selectedIndex = -1;
      renderSearchResults(uniqueResults);

    } catch (err) {
      console.error('[LoanAnalysis] Fetch all records error:', err);
      if (emptyMsg) {
        emptyMsg.textContent = 'Error loading records';
        emptyMsg.classList.remove('d-none');
      }
    } finally {
      if (loader) loader.classList.add('d-none');
    }
  }

  function clearSearchResults() {
    const tbody = qs('#loanAnalysisSearchResults');
    const emptyMsg = qs('#loanAnalysisSearchEmpty');
    
    if (tbody) tbody.innerHTML = '';
    if (emptyMsg) emptyMsg.classList.add('d-none');
    
    searchState.results = [];
    searchState.selectedIndex = -1;
    updateNavButtons();
  }

  function updateNavButtons() {
    const prevBtn = qs('#btnSearchPrev');
    const nextBtn = qs('#btnSearchNext');
    
    if (prevBtn) prevBtn.disabled = searchState.selectedIndex <= 0;
    if (nextBtn) nextBtn.disabled = searchState.selectedIndex >= searchState.results.length - 1;
  }

  async function performSearch() {
    console.log('[LoanAnalysis] performSearch() called');
    
    const loader = qs('#loanAnalysisSearchLoader');
    const emptyMsg = qs('#loanAnalysisSearchEmpty');
    const tbody = qs('#loanAnalysisSearchResults');

    // Get search values
    const loanAnalysisId = qs('#searchLoanAnalysisId')?.value?.trim() || '';
    const description = qs('#searchDescription')?.value?.trim() || '';
    const analysisTypeId = qs('#searchAnalysisTypeId')?.value?.trim() || '';

    // If we have cached results and only filtering by description/type, filter locally
    if (searchState.results.length > 0 && !loanAnalysisId) {
      let filtered = [...searchState.results];

      if (description) {
        const descLower = description.toLowerCase();
        const descMode = qs('#searchDescriptionMode')?.value || 'Like';
        filtered = filtered.filter(r => {
          const val = (r.Description || '').toLowerCase();
          if (descMode === 'Equals') return val === descLower;
          if (descMode === 'StartsWith') return val.startsWith(descLower);
          return val.includes(descLower); // Like
        });
      }

      if (analysisTypeId) {
        // Dropdown uses exact match
        filtered = filtered.filter(r => r.AnalysisTypeID === analysisTypeId);
      }

      renderSearchResults(filtered);
      return;
    }

    // If searching by specific LoanAnalysisID, call API
    if (!loanAnalysisId) {
      // No ID and no cached results - fetch all
      await fetchAllRecords();
      return;
    }

    console.log('[LoanAnalysis] DOM elements - loader:', !!loader, 'emptyMsg:', !!emptyMsg, 'tbody:', !!tbody);

    if (loader) loader.classList.remove('d-none');
    if (emptyMsg) emptyMsg.classList.add('d-none');
    if (tbody) tbody.innerHTML = '';

    try {
      console.log('[LoanAnalysis] Ensuring services loaded...');
      await ensureServicesLoaded();
      console.log('[LoanAnalysis] Services loaded successfully');

      const ctx = getContext();
      console.log('[LoanAnalysis] Context:', ctx);

      // Build request
      const requestData = {
        BankID: ctx.bankId,
        OurBranchID: ctx.branchId,
        LoanAnalysisID: loanAnalysisId,
        OperatorID: ctx.operatorId
      };

      console.log('[LoanAnalysis] Search request:', requestData);

      const resp = await window.StaticDataService.getLoanAnalysis(requestData);
      console.log('[LoanAnalysis] Search response (FULL):', JSON.stringify(resp, null, 2));

      // Extract results - check all possible locations
      let results = [];
      const payload = resp?.data ?? resp;

      console.log('[LoanAnalysis] Payload keys:', Object.keys(payload || {}));

      // Try different response structures
      if (payload?.Details01 && Array.isArray(payload.Details01)) {
        console.log('[LoanAnalysis] Found Details01:', payload.Details01.length, 'records');
        results = payload.Details01.filter(r => !isMetaOnlyObject(r));
      } else if (payload?.data?.Details01 && Array.isArray(payload.data.Details01)) {
        console.log('[LoanAnalysis] Found data.Details01:', payload.data.Details01.length, 'records');
        results = payload.data.Details01.filter(r => !isMetaOnlyObject(r));
      } else if (payload?.Details && Array.isArray(payload.Details)) {
        console.log('[LoanAnalysis] Found Details:', payload.Details.length, 'records');
        results = payload.Details.filter(r => !isMetaOnlyObject(r));
      } else if (payload?.data?.Details && Array.isArray(payload.data.Details)) {
        console.log('[LoanAnalysis] Found data.Details:', payload.data.Details.length, 'records');
        results = payload.data.Details.filter(r => !isMetaOnlyObject(r));
      }

      console.log('[LoanAnalysis] Extracted results:', results.length, 'records');
      if (results.length > 0) {
        console.log('[LoanAnalysis] First result keys:', Object.keys(results[0]));
        console.log('[LoanAnalysis] First result:', results[0]);
      }

      // Client-side filtering by description and analysisTypeId if provided
      if (description) {
        const descLower = description.toLowerCase();
        const descMode = qs('#searchDescriptionMode')?.value || 'Like';
        results = results.filter(r => {
          const val = (r.Description || '').toLowerCase();
          if (descMode === 'Equal') return val === descLower;
          if (descMode === 'StartsWith') return val.startsWith(descLower);
          return val.includes(descLower); // Like
        });
      }

      if (analysisTypeId) {
        const typeLower = analysisTypeId.toLowerCase();
        const typeMode = qs('#searchAnalysisTypeIdMode')?.value || 'Like';
        results = results.filter(r => {
          const val = (r.AnalysisTypeID || r.AnalysisTypeId || '').toLowerCase();
          if (typeMode === 'Equal') return val === typeLower;
          if (typeMode === 'StartsWith') return val.startsWith(typeLower);
          return val.includes(typeLower); // Like
        });
      }

      searchState.results = results;
      searchState.selectedIndex = -1;

      renderSearchResults(results);

    } catch (err) {
      console.error('[LoanAnalysis] Search error:', err);
      setToast('Search failed: ' + (err?.message || 'Unknown error'), 'danger');
      if (emptyMsg) {
        emptyMsg.textContent = 'Search failed. Please try again.';
        emptyMsg.classList.remove('d-none');
      }
    } finally {
      if (loader) loader.classList.add('d-none');
    }
  }

  function renderSearchResults(results) {
    const tbody = qs('#loanAnalysisSearchResults');
    const emptyMsg = qs('#loanAnalysisSearchEmpty');

    if (!tbody) return;

    if (!results || results.length === 0) {
      tbody.innerHTML = '';
      if (emptyMsg) {
        emptyMsg.textContent = 'No results found.';
        emptyMsg.classList.remove('d-none');
      }
      return;
    }

    if (emptyMsg) emptyMsg.classList.add('d-none');

    tbody.innerHTML = results.map((row, idx) => {
      const id = row.LoanAnalysisID || row.LoanAnalysisId || '';
      const desc = row.Description || '';
      const typeId = row.AnalysisTypeID || row.AnalysisTypeId || '';
      const bgColor = idx % 2 === 0 ? '#ffffff' : '#e8f4fc';

      return `
        <tr data-index="${idx}" data-loan-analysis-id="${id}" data-description="${desc}" data-analysis-type-id="${typeId}" 
            style="cursor: pointer; background: ${bgColor};">
          <td>${idx + 1}</td>
          <td>${id}</td>
          <td>${desc}</td>
          <td>${typeId}</td>
        </tr>
      `;
    }).join('');

    updateNavButtons();
  }

  function handleSearchResultClick(e) {
    const row = e.target.closest('tr');
    if (!row) return;

    const index = parseInt(row.dataset.index, 10);
    if (isNaN(index)) return;

    // Highlight selected row
    const tbody = qs('#loanAnalysisSearchResults');
    if (tbody) {
      tbody.querySelectorAll('tr').forEach(r => r.classList.remove('table-primary'));
      row.classList.add('table-primary');
    }

    searchState.selectedIndex = index;
    updateNavButtons();
  }

  function handleSearchResultDblClick(e) {
    const row = e.target.closest('tr');
    if (!row) return;

    const index = parseInt(row.dataset.index, 10);
    if (isNaN(index)) return;

    searchState.selectedIndex = index;
    selectAndClose();
  }

  function selectAndClose() {
    if (searchState.selectedIndex < 0 || searchState.selectedIndex >= searchState.results.length) {
      setToast('Please select a record first.', 'warning');
      return;
    }

    const selected = searchState.results[searchState.selectedIndex];
    const loanAnalysisId = selected.LoanAnalysisID || selected.LoanAnalysisId || '';

    // Set the ID in the form
    const idField = qs('#LoanAnalysisId');
    if (idField) idField.value = loanAnalysisId;

    // Close modal
    if (searchModal) searchModal.hide();

    // Trigger search to load full details
    handleSearch();
  }

  function navigateResults(direction) {
    const newIndex = searchState.selectedIndex + direction;
    if (newIndex < 0 || newIndex >= searchState.results.length) return;

    searchState.selectedIndex = newIndex;

    // Update row highlighting
    const tbody = qs('#loanAnalysisSearchResults');
    if (tbody) {
      tbody.querySelectorAll('tr').forEach((r, idx) => {
        r.classList.toggle('table-primary', idx === newIndex);
      });

      // Scroll into view
      const selectedRow = tbody.querySelector(`tr[data-index="${newIndex}"]`);
      if (selectedRow) selectedRow.scrollIntoView({ block: 'nearest' });
    }

    updateNavButtons();
  }

  function bindSearchModal() {
    // Open modal on search button click
    const lookupBtn = qs('#btnLoanAnalysisLookup');
    if (lookupBtn) {
      lookupBtn.addEventListener('click', openSearchModal);
    }

    // Also bind to search action button
    const searchActionBtn = qs('[data-la-action="search"]');
    if (searchActionBtn) {
      // Remove existing listener and add new one
      searchActionBtn.removeEventListener('click', handleSearch);
      searchActionBtn.addEventListener('click', openSearchModal);
    }

    // Search button in modal
    const searchBtn = qs('#btnSearchLoanAnalysis');
    if (searchBtn) {
      searchBtn.addEventListener('click', performSearch);
    }

    // Enter key in search fields
    ['#searchLoanAnalysisId', '#searchDescription', '#searchAnalysisTypeId'].forEach(sel => {
      const field = qs(sel);
      if (field) {
        field.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            performSearch();
          }
        });
      }
    });

    // Results table click handlers
    const tbody = qs('#loanAnalysisSearchResults');
    if (tbody) {
      tbody.addEventListener('click', handleSearchResultClick);
      tbody.addEventListener('dblclick', handleSearchResultDblClick);
    }

    // OK button
    const okBtn = qs('#btnSearchOk');
    if (okBtn) {
      okBtn.addEventListener('click', selectAndClose);
    }

    // Navigation buttons
    const prevBtn = qs('#btnSearchPrev');
    const nextBtn = qs('#btnSearchNext');
    if (prevBtn) prevBtn.addEventListener('click', () => navigateResults(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => navigateResults(1));
  }

  function normKey(s) {
    return String(s ?? "")
      .trim()
      .toLowerCase()
      .replace(/[_\-\s]+/g, "");
  }

  function isMetaOnlyObject(obj) {
    if (!obj || typeof obj !== "object") return false;
    const keys = Object.keys(obj).map(normKey);
    const hasMetaKeys = keys.some((k) => k === "eventid" || k === "updatecount" || k === "newdata" || k === "operatorid");
    const hasBusinessKeys = keys.some((k) => k.includes("loananalysis") || k === "description" || k.includes("analysis"));
    return hasMetaKeys && !hasBusinessKeys;
  }

  function pickValue(obj, preferredKeys = [], keyFragments = []) {
    if (!obj || typeof obj !== "object") return undefined;

    for (const k of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
    }

    if (!keyFragments.length) return undefined;
    for (const [k, v] of Object.entries(obj)) {
      const nk = normKey(k);
      if (keyFragments.some((frag) => nk.includes(frag))) return v;
    }
    return undefined;
  }

  function extractRow(payload, { loanAnalysisId } = {}) {
    if (!payload) return null;
    if (Array.isArray(payload)) return payload[0] || null;

    if (typeof payload === "object" && payload !== null) {
      // The header record is in Details01 (second result set from p_GetLoanAnalysis)
      // Details = supervision data, Details01 = header, Details02 = slabs
      const details01 = payload.Details01 || payload.details01;
      if (Array.isArray(details01) && details01.length > 0) {
        // Find a header row that has LoanAnalysisID or AnalysisTypeID
        for (const row of details01) {
          if (!row || typeof row !== "object") continue;
          if (isMetaOnlyObject(row)) continue;
          
          const id = pickValue(row, ["LoanAnalysisID", "LoanAnalysisId"], ["loananalysisid"]);
          const type = pickValue(row, ["AnalysisTypeID", "AnalysisTypeId"], ["analysistypeid"]);
          
          // If it has LoanAnalysisID or AnalysisTypeID, it's the header record
          if (id != null || type != null) {
            if (loanAnalysisId && id != null && String(id).trim() === String(loanAnalysisId).trim()) {
              console.log('[LoanAnalysis] Found header in Details01:', row);
              return { row, score: 200 };
            }
            console.log('[LoanAnalysis] Found header in Details01:', row);
            return { row, score: 100 };
          }
        }
        
        // Fallback: return first non-meta row from Details01
        const fallback = details01.find((r) => r && typeof r === "object" && !isMetaOnlyObject(r));
        if (fallback) {
          console.log('[LoanAnalysis] Using fallback from Details01:', fallback);
          return { row: fallback, score: 50 };
        }
      }

      // Fallback to Details array (but this is usually supervision data)
      const details = payload.Details || payload.details;
      if (Array.isArray(details) && details.length > 0) {
        for (const row of details) {
          if (!row || typeof row !== "object") continue;
          if (isMetaOnlyObject(row)) continue;
          
          const id = pickValue(row, ["LoanAnalysisID", "LoanAnalysisId"], ["loananalysisid"]);
          const type = pickValue(row, ["AnalysisTypeID", "AnalysisTypeId"], ["analysistypeid"]);
          
          if (id != null || type != null) {
            if (loanAnalysisId && id != null && String(id).trim() === String(loanAnalysisId).trim()) {
              return { row, score: 200 };
            }
            return { row, score: 100 };
          }
        }
      }

      // Skip Details02 as it contains slab records, not header records
      return null;
    }

    return null;
  }

  function populateAnalysisTypeOptions(payload) {
    const select = qs("#AnalysisTypeId");
    if (!select || !payload || typeof payload !== "object") return;

    function rowLooksLikeType(r) {
      if (!r || typeof r !== "object") return false;
      const keys = Object.keys(r).map(normKey);
      const hasId = keys.some((k) => k === "analysistypeid" || k === "analysistype" || k.includes("analysistypeid"));
      const hasDesc = keys.some((k) => k === "description" || k.includes("description"));
      return hasId && hasDesc;
    }

    let rows = null;
    for (const v of Object.values(payload)) {
      if (!Array.isArray(v) || !v.length) continue;
      const business = v.filter(rowLooksLikeType);
      if (business.length) {
        rows = business;
        break;
      }
    }

    if (!rows) return;

    const existing = new Set(Array.from(select.options).map((o) => String(o.value)));
    for (const r of rows) {
      const id = pickValue(r, ["AnalysisTypeID", "AnalysisTypeId"], ["analysistypeid"]);
      const desc = pickValue(r, ["Description"], ["description"]);
      if (id == null) continue;
      const value = String(id).trim();
      if (!value || existing.has(value)) continue;
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = desc != null ? String(desc) : value;
      select.appendChild(opt);
      existing.add(value);
    }
  }

  function setSelectValue(selectEl, value, displayText = null) {
    if (!selectEl) return;
    const target = String(value ?? "").trim();
    if (!target) {
      selectEl.value = "";
      return;
    }

    const match = Array.from(selectEl.options).find((opt) => String(opt.value).trim() === target);
    if (match) {
      selectEl.value = match.value;
      return;
    }

    // Add the value as a new option if not found (with display text if provided)
    const opt = document.createElement("option");
    opt.value = target;
    opt.textContent = displayText || target;
    selectEl.appendChild(opt);
    selectEl.value = target;
  }

  function applyDataToForm(data) {
    if (!data || typeof data !== "object") return;

    const id = pickValue(data, ["LoanAnalysisID", "LoanAnalysisId", "LoanAnalysisID"], ["loananalysisid"]);
    const desc = pickValue(data, ["Description"], ["description"]);
    const analysisTypeId = pickValue(data, ["AnalysisTypeID", "AnalysisTypeId"], ["analysistypeid"]);
    const analysisDescription = pickValue(data, ["AnalysisDescription"], ["analysisdescription"]);
    const noOfSlabs = pickValue(data, ["NoOfSlabs", "NoOfSlab"], ["noofslabs", "slabs"]);
    const updateCount = pickValue(data, ["UpdateCount"], ["updatecount"]);

    const createdBy = pickValue(data, ["CreatedBy"], ["createdby"]);
    const modifiedBy = pickValue(data, ["ModifiedBy"], ["modifiedby"]);
    const supervisedBy = pickValue(data, ["SupervisedBy"], ["supervisedby"]);
    const createdOn = pickValue(data, ["CreatedOn", "CreatedDate"], ["createdon", "createddate"]);
    const modifiedOn = pickValue(data, ["ModifiedOn", "ModifiedDate"], ["modifiedon", "modifieddate"]);
    const supervisedOn = pickValue(data, ["SupervisedOn"], ["supervisedon"]);

    // Store updateCount in state for save/delete operations
    if (updateCount != null) {
      state.updateCount = parseInt(updateCount, 10) || 0;
    }

    console.info("[LoanAnalysis] bind values", {
      id,
      desc,
      analysisTypeId,
      analysisDescription,
      noOfSlabs,
      createdBy,
      modifiedBy,
      supervisedBy,
      createdOn,
      modifiedOn,
      supervisedOn,
    });

    if (id != null) {
      const el = qs("#LoanAnalysisId");
      if (el) el.value = String(id);
    }
    if (desc != null) {
      const el = qs("#Description");
      if (el) el.value = String(desc);
    }
    if (analysisTypeId != null) {
      // Pass the description for display if dropdown option doesn't exist
      const displayText = analysisDescription ? `${analysisTypeId} - ${analysisDescription}` : analysisTypeId;
      setSelectValue(qs("#AnalysisTypeId"), analysisTypeId, displayText);
    }
    if (noOfSlabs != null) {
      const el = qs("#NoOfSlabs");
      if (el) el.value = String(noOfSlabs);
    }

    if (createdBy != null) {
      const el = qs("#CreatedBy");
      if (el) el.textContent = String(createdBy);
    }
    if (modifiedBy != null) {
      const el = qs("#ModifiedBy");
      if (el) el.textContent = String(modifiedBy);
    }
    if (supervisedBy != null) {
      const el = qs("#SupervisedBy");
      if (el) el.textContent = String(supervisedBy);
    }
    if (createdOn != null) {
      const el = qs("#CreatedOn");
      if (el) el.textContent = String(createdOn);
    }
    if (modifiedOn != null) {
      const el = qs("#ModifiedOn");
      if (el) el.textContent = String(modifiedOn);
    }
    if (supervisedOn != null) {
      const el = qs("#SupervisedOn");
      if (el) el.textContent = String(supervisedOn);
    }
  }

  function extractSlabs(payload) {
    if (!payload || typeof payload !== "object") return [];

    // Prioritize Details02 which contains the slab/detail records
    if (Array.isArray(payload.Details02) && payload.Details02.length > 0) {
      const slabs = payload.Details02.filter(r => r && typeof r === "object" && !isMetaOnlyObject(r));
      console.log('[LoanAnalysis] Extracted slabs from Details02:', slabs);
      return slabs;
    }

    const arrays = [];
    for (const [k, v] of Object.entries(payload)) {
      if (!Array.isArray(v) || !v.length) continue;
      arrays.push({ key: k, value: v });
    }

    function rowLooksLikeSlab(r) {
      if (!r || typeof r !== "object") return false;
      if (isMetaOnlyObject(r)) return false;
      const keys = Object.keys(r).map(normKey);
      const hasFrom = keys.some((x) => x === "fromvalue" || x === "analysisfrom" || x.includes("from"));
      const hasTo = keys.some((x) => x === "tovalue" || x === "analysisto" || x.includes("to"));
      return hasFrom && hasTo;
    }

    for (const ds of arrays) {
      const businessRows = ds.value.filter(rowLooksLikeSlab);
      if (businessRows.length) return businessRows;
    }
    return [];
  }

  function renderSlabs(slabs) {
    const tbody = qs("#slabsTableBody");
    if (!tbody) {
      console.error('[LoanAnalysis] Slabs table body not found');
      return;
    }
    tbody.innerHTML = "";

    console.log('[LoanAnalysis] Rendering slabs:', slabs);

    if (!Array.isArray(slabs) || !slabs.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = '<td colspan="3" class="cm-grid-empty">No records to display.</td>';
      tbody.appendChild(tr);
      state.slabs = [];
      state.selectedSlabIndex = -1;
      return;
    }

    // Store slabs in state for save operations - map to expected field names
    // Mark as NOT new (isNew: false) since these are loaded from the database
    state.slabs = slabs.map(row => ({
      Description: pickValue(row, ["Description", "DetailDescription"], ["description"]) ?? "",
      FromValue: pickValue(row, ["FromValue", "AnalysisFrom"], ["fromvalue", "analysisfrom", "from"]) ?? "",
      ToValue: pickValue(row, ["ToValue", "AnalysisTo"], ["tovalue", "analysisto", "to"]) ?? "",
      isNew: false // Existing record from database
    }));

    state.selectedSlabIndex = -1;

    for (let i = 0; i < slabs.length; i++) {
      const row = slabs[i];
      const desc = pickValue(row, ["Description", "DetailDescription"], ["description"]);
      const from = pickValue(row, ["FromValue", "AnalysisFrom"], ["fromvalue", "analysisfrom", "from"]);
      const to = pickValue(row, ["ToValue", "AnalysisTo"], ["tovalue", "analysisto", "to"]);

      const tr = document.createElement("tr");
      tr.dataset.index = i;
      tr.style.cursor = "pointer";
      tr.innerHTML = `
        <td>${String(desc ?? "")}</td>
        <td>${String(from ?? "")}</td>
        <td>${String(to ?? "")}</td>
      `;
      
      // Add click handler to populate fields
      tr.addEventListener("click", () => selectSlabRow(i));
      
      tbody.appendChild(tr);
    }
  }

  // Select a slab row and populate the detail fields
  function selectSlabRow(index) {
    if (index < 0 || index >= state.slabs.length) return;
    
    state.selectedSlabIndex = index;
    state.gridAction = null; // Reset action when selecting a row
    const slab = state.slabs[index];
    
    // Populate detail fields
    const descEl = qs("#DetailDescription");
    const fromEl = qs("#FromValue");
    const toEl = qs("#ToValue");
    
    if (descEl) descEl.value = slab.Description || "";
    if (fromEl) fromEl.value = slab.FromValue || "";
    if (toEl) toEl.value = slab.ToValue || "";
    
    // Highlight selected row
    highlightSlabRow(index);
    
    // Update grid button states
    updateGridButtons();
  }

  // Highlight the selected row in the slabs table
  function highlightSlabRow(index) {
    const tbody = qs("#slabsTableBody");
    if (!tbody) return;
    
    // Remove highlight from all rows
    qsa("tr", tbody).forEach(tr => tr.classList.remove("table-primary"));
    
    // Add highlight to selected row
    const selectedRow = qs(`tr[data-index="${index}"]`, tbody);
    if (selectedRow) selectedRow.classList.add("table-primary");
  }

  function getOperatorId() {
    try {
      const session = window.AuthService?.getSession?.();
      return session?.operatorId || session?.operatorID || session?.name || "web_portal";
    } catch {
      return "web_portal";
    }
  }

  function getBankId() {
    try {
      const session = window.AuthService?.getSession?.();
      return (
        qs("#BankID")?.value?.trim() ||
        session?.bankId ||
        session?.bankID ||
        window.localStorage?.getItem?.("kairo_bankId") ||
        ""
      );
    } catch {
      return qs("#BankID")?.value?.trim() || "";
    }
  }

  function getOurBranchId() {
    try {
      const session = window.AuthService?.getSession?.();
      return (
        qs("#OurBranchID")?.value?.trim() ||
        session?.ourBranchId ||
        session?.ourBranchID ||
        session?.branchId ||
        session?.branchID ||
        window.localStorage?.getItem?.("kairo_ourBranchId") ||
        ""
      );
    } catch {
      return qs("#OurBranchID")?.value?.trim() || "";
    }
  }

  function persistContext() {
    const bankId = qs("#BankID")?.value?.trim() || "";
    const branchId = qs("#OurBranchID")?.value?.trim() || "";
    if (bankId) window.localStorage?.setItem?.("kairo_bankId", bankId);
    if (branchId) window.localStorage?.setItem?.("kairo_ourBranchId", branchId);
  }

  async function ensureServicesLoaded() {
    if (!window.ServiceLoader) throw new Error("ServiceLoader missing");
    await window.ServiceLoader.loadCore();
    await window.ServiceLoader.loadStaticDataService();
    if (!window.StaticDataService?.getLoanAnalysis) {
      throw new Error("StaticDataService.getLoanAnalysis is not available");
    }
  }

  function clearFormData() {
    const form = qs("#loan-analysis-form");
    if (!form) return;

    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) return;
      el.value = "";
    });
    
    // Clear Behind The Scene span elements
    const behindTheSceneFields = ['CreatedBy', 'CreatedOn', 'ModifiedBy', 'ModifiedOn', 'SupervisedBy', 'SupervisedOn'];
    behindTheSceneFields.forEach(fieldId => {
      const el = qs(`#${fieldId}`);
      if (el) el.textContent = '';
    });
    
    renderSlabs([]);
    state.hasLoaded = false;
    state.recordNotFound = false;
  }

  function clearFormDataExceptId() {
    const form = qs("#loan-analysis-form");
    if (!form) return;

    const loanAnalysisId = qs("#LoanAnalysisId")?.value || "";

    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) return;
      if (el.id === "LoanAnalysisId") return; // Keep the ID
      el.value = "";
    });
    
    // Clear Behind The Scene span elements
    const behindTheSceneFields = ['CreatedBy', 'CreatedOn', 'ModifiedBy', 'ModifiedOn', 'SupervisedBy', 'SupervisedOn'];
    behindTheSceneFields.forEach(fieldId => {
      const el = qs(`#${fieldId}`);
      if (el) el.textContent = '';
    });
    
    // Clear detail fields
    const descField = qs('#DetailDescription');
    const fromField = qs('#FromValue');
    const toField = qs('#ToValue');
    if (descField) descField.value = '';
    if (fromField) fromField.value = '';
    if (toField) toField.value = '';
    
    renderSlabs([]);
    state.hasLoaded = false;
    state.recordNotFound = false;
  }

  async function handleSearch() {
    if (state.isBusy) return;

    const loanAnalysisId = qs("#LoanAnalysisId")?.value?.trim() || "";
    if (!loanAnalysisId) {
      setToast("Enter Loan Analysis ID.", "warning");
      return;
    }

    setToast("Loading...", "info");

    persistContext();

    const bankId = getBankId();
    const ourBranchId = getOurBranchId();
    const operatorId = qs("#OperatorID")?.value?.trim() || getOperatorId();

    if (!bankId || !ourBranchId) {
      setToast(
        "Bank ID / Our Branch ID missing — attempting request anyway.",
        "warning"
      );
    }

    state.isBusy = true;
    try {
      await ensureServicesLoaded();

      const resp = await window.StaticDataService.getLoanAnalysis({
        BankID: bankId,
        OurBranchID: ourBranchId,
        LoanAnalysisID: loanAnalysisId,
        OperatorID: operatorId,
      });

      console.info("[LoanAnalysis] OldAPI response", resp);

      if (resp && typeof resp.success === "boolean" && !resp.success) {
        clearFormData();
        const msg = resp.message || "Request failed.";
        const code = resp.code ? ` (${resp.code})` : "";
        setToast(`${msg}${code}`, "danger");
        setMode(MODES.VIEW);
        return;
      }

      const payload = resp?.data ?? resp?.Details ?? resp;

      if (payload && typeof payload === "object") {
        try {
          console.info("[LoanAnalysis] payload keys", Object.keys(payload));
        } catch {
          // ignore
        }
      }

      try {
        console.info("[LoanAnalysis] sample rows", {
          Details0: Array.isArray(payload?.Details) ? payload.Details[0] : payload?.Details,
          Details01_0: Array.isArray(payload?.Details01) ? payload.Details01[0] : payload?.Details01,
          Details02_0: Array.isArray(payload?.Details02) ? payload.Details02[0] : payload?.Details02,
          Details02_all: payload?.Details02,
        });
      } catch {
        // ignore
      }

      populateAnalysisTypeOptions(payload);
      const picked = extractRow(payload, { loanAnalysisId });
      const row = picked?.row || null;
      console.info("[LoanAnalysis] picked header row", { score: picked?.score, row });
      console.info("[LoanAnalysis] Row keys:", row ? Object.keys(row) : 'null');
      console.info("[LoanAnalysis] Row full data:", JSON.stringify(row, null, 2));

      if (!row) {
        clearFormData();
        setToast("Record not found.", "warning");
        state.recordNotFound = true;
        setMode(MODES.VIEW);
        return;
      }

      applyDataToForm(row);
      const slabs = extractSlabs(payload);
      console.info("[LoanAnalysis] Extracted slabs for rendering:", slabs);
      renderSlabs(slabs);
      state.hasLoaded = true;
      state.recordNotFound = false;
      setMode(MODES.VIEW);
      setToast("Loaded.", "success");
    } catch (e) {
      console.error(e);
      setToast(e?.message || "Failed to load.", "danger");
    } finally {
      state.isBusy = false;
    }
  }

  function bindModeButtons() {
    qsa("[data-shell-mode]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const next = btn.getAttribute("data-shell-mode");
        if (!next || !MODES[next.toUpperCase()]) return;

        const nextMode = MODES[next.toUpperCase()];
        if (nextMode === MODES.VIEW) {
          // View button loads record when ID is provided manually
          const loanAnalysisId = qs("#LoanAnalysisId")?.value?.trim() || "";
          if (loanAnalysisId) {
            await handleSearch();
          } else {
            setToast("Please enter a Loan Analysis ID to view.", "warning");
          }
          return;
        }

        setMode(nextMode);
      });
    });
  }

  // ==================== BUILD DETAIL RECORDS XML ====================
  function buildDetailRecordsXml() {
    // Build XML for DetailRecords parameter
    // Format: <dt_LoanAgingDetails><Description>XXX</Description><SLNo>N</SLNo><AnalysisFrom>YYY</AnalysisFrom><AnalysisTo>ZZZ</AnalysisTo></dt_LoanAgingDetails>
    if (!state.slabs || state.slabs.length === 0) {
      return '';
    }

    const escapeXml = (str) => {
      return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };

    const records = state.slabs.map((slab, index) => {
      const slNo = index + 1;
      const desc = escapeXml(slab.Description || slab.DetailDescription || '');
      const from = escapeXml(slab.FromValue || slab.AnalysisFrom || '');
      const to = escapeXml(slab.ToValue || slab.AnalysisTo || '');
      return `<dt_LoanAgingDetails><Description>${desc}</Description><SLNo>${slNo}</SLNo><AnalysisFrom>${from}</AnalysisFrom><AnalysisTo>${to}</AnalysisTo></dt_LoanAgingDetails>`;
    }).join('');

    console.log('[LoanAnalysis] Built DetailRecords XML:', records);
    console.log('[LoanAnalysis] Current slabs state:', JSON.stringify(state.slabs));

    return records;
  }

  // ==================== SAVE HANDLER ====================
  async function handleSave() {
    if (state.mode === MODES.VIEW) return;

    const loanAnalysisId = qs("#LoanAnalysisId")?.value?.trim() || "";
    if (!loanAnalysisId) {
      setToast("Loan Analysis ID is required.", "warning");
      return;
    }

    const description = qs("#Description")?.value?.trim() || "";
    const analysisTypeId = qs("#AnalysisTypeId")?.value?.trim() || "";
    const noOfSlabs = qs("#NoOfSlabs")?.value?.trim() || "0";

    console.log('[LoanAnalysis] Form values being saved:', {
      loanAnalysisId,
      description,
      analysisTypeId,
      noOfSlabs,
      analysisTypeElement: qs("#AnalysisTypeId"),
      analysisTypeSelectedIndex: qs("#AnalysisTypeId")?.selectedIndex,
      noOfSlabsElement: qs("#NoOfSlabs")
    });

    state.isBusy = true;
    setToast("Saving...", "info");

    try {
      await ensureServicesLoaded();
      
      const ctx = getContext();
      const detailRecordsXml = buildDetailRecordsXml();

      console.log('[LoanAnalysis] Context:', ctx);

      // Build request payload based on API signature
      // Note: p_AddEditLoanAnalysis does NOT take OurBranchID
      // Based on working SP trace: CreatedOn/ModifiedBy/ModifiedOn should be null for new records
      // UpdateCount should be at least 1
      const isNewRecord = !state.hasLoaded || state.updateCount === 0;
      
      const payload = {
        BankID: ctx.bankId,
        LoanAnalysisID: loanAnalysisId,
        Description: description,
        AnalysisTypeID: analysisTypeId,
        NoOfSlabs: parseInt(noOfSlabs, 10) || 0,
        CreatedBy: ctx.operatorId,
        CreatedOn: null,
        ModifiedBy: isNewRecord ? null : ctx.operatorId,
        ModifiedOn: null,
        SupervisedBy: null,
        UpdateCount: state.updateCount || 1,
        DetailRecords: detailRecordsXml || ''
      };

      console.log('[LoanAnalysis] Save payload:', payload);
      console.log('[LoanAnalysis] DetailRecords being sent:', detailRecordsXml);
      console.log('[LoanAnalysis] Current slabs before save:', JSON.stringify(state.slabs, null, 2));

      const resp = await window.StaticDataService.addEditLoanAnalysis(payload);

      console.log('[LoanAnalysis] Save response:', resp);
      console.log('[LoanAnalysis] Save response (full):', JSON.stringify(resp, null, 2));

      const isSuccess = resp?.success === true || 
                        resp?.code === '00' || 
                        resp?.Code === '00' ||
                        (resp?.data && !resp?.error);

      if (isSuccess) {
        setToast("Saved successfully.", "success");
        
        // Clear all fields except the ID
        clearFormDataExceptId();
        
        state.hasLoaded = false;
        state.updateCount = 0;
        state.slabs = [];
        setMode(MODES.VIEW);
      } else {
        const errorMsg = resp?.message || resp?.Message || resp?.error || 'Failed to save';
        setToast(errorMsg, "danger");
      }
    } catch (e) {
      console.error('[LoanAnalysis] Save error:', e);
      setToast(e?.message || "Failed to save.", "danger");
    } finally {
      state.isBusy = false;
    }
  }

  // ==================== DELETE HANDLER ====================
  async function handleDelete() {
    const loanAnalysisId = qs("#LoanAnalysisId")?.value?.trim() || "";
    if (!loanAnalysisId) {
      setToast("Loan Analysis ID is required for deletion.", "warning");
      return;
    }

    if (!state.hasLoaded) {
      setToast("Please load a record first.", "warning");
      return;
    }

    // Confirm deletion
    const confirmDelete = typeof Swal !== 'undefined' 
      ? await Swal.fire({
          title: 'Confirm Deletion',
          text: `Delete Loan Analysis "${loanAnalysisId}"?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'Yes, delete it'
        }).then(result => result.isConfirmed)
      : confirm(`Delete Loan Analysis "${loanAnalysisId}"?`);

    if (!confirmDelete) return;

    state.isBusy = true;
    setToast("Deleting...", "info");

    try {
      await ensureServicesLoaded();
      
      const ctx = getContext();

      // Build request payload based on API signature
      const payload = {
        BankID: ctx.bankId,
        LoanAnalysisID: loanAnalysisId,
        UpdateCount: state.updateCount || 0
      };

      console.log('[LoanAnalysis] Delete payload:', payload);

      const resp = await window.StaticDataService.deleteLoanAnalysis(payload);

      console.log('[LoanAnalysis] Delete response:', resp);

      const isSuccess = resp?.success === true || 
                        resp?.code === '00' || 
                        resp?.Code === '00' ||
                        (resp?.data && !resp?.error);

      if (isSuccess) {
        setToast("Deleted successfully.", "success");
        clearFormData();
        state.hasLoaded = false;
        state.updateCount = 0;
        setMode(MODES.VIEW);
      } else {
        const errorMsg = resp?.message || resp?.Message || resp?.error || 'Failed to delete';
        setToast(errorMsg, "danger");
      }
    } catch (e) {
      console.error('[LoanAnalysis] Delete error:', e);
      setToast(e?.message || "Failed to delete.", "danger");
    } finally {
      state.isBusy = false;
    }
  }

  // ==================== CANCEL HANDLER ====================
  function handleCancel() {
    clearFormData();
    state.hasLoaded = false;
    state.updateCount = 0;
    state.slabs = [];
    setMode(MODES.VIEW);
    setToast("Cancelled.", "info");
  }

  // Populate Analysis Type dropdown from both LoanAnalysisTypeID and LoanAnalysisReportID
  async function populateAnalysisTypeDropdowns() {
    try {
      console.log('[LoanAnalysis] Populating Analysis Type dropdowns...');
      await ensureServicesLoaded();
      const ctx = getContext();

      console.log('[LoanAnalysis] Fetching system codes for LoanAnalysisTypeID and LoanAnalysisReportID...');

      // Fetch both system code lists - only CodeID is needed
      const [typeResp, reportResp] = await Promise.all([
        window.StaticDataService.getSystemCodes({
          CodeID: 'LoanAnalysisTypeID'
        }).catch(err => { console.error('[LoanAnalysis] Error fetching LoanAnalysisTypeID:', err); return null; }),
        window.StaticDataService.getSystemCodes({
          CodeID: 'LoanAnalysisReportID'
        }).catch(err => { console.error('[LoanAnalysis] Error fetching LoanAnalysisReportID:', err); return null; })
      ]);

      console.log('[LoanAnalysis] LoanAnalysisTypeID response:', typeResp);
      console.log('[LoanAnalysis] LoanAnalysisReportID response:', reportResp);

      // Extract records from both responses
      const extractRecords = (resp) => {
        if (!resp) return [];
        const payload = resp?.data ?? resp;
        console.log('[LoanAnalysis] Payload:', payload);
        const records = payload?.Details01 || payload?.Details || [];
        console.log('[LoanAnalysis] Records before filter:', records);
        return records.filter(r => r.IDDescription && r.IDDescription !== '');
      };

      const typeRecords = extractRecords(typeResp);
      const reportRecords = extractRecords(reportResp);

      console.log('[LoanAnalysis] Type records:', typeRecords);
      console.log('[LoanAnalysis] Report records:', reportRecords);

      // Combine both lists
      let allOptions = [
        ...typeRecords.map(r => ({ value: r.IDDescription, text: `${r.IDDescription} - ${r.Description || r.IDDescription}` })),
        ...reportRecords.map(r => ({ value: r.IDDescription, text: `${r.IDDescription} - ${r.Description || r.IDDescription}` }))
      ];

      // Fallback: If API returned no options, use hardcoded list
      if (allOptions.length === 0) {
        console.log('[LoanAnalysis] Using fallback hardcoded options');
        allOptions = [
          // LoanAnalysisTypeID
          { value: 'AA', text: 'AA - Aging Analysis' },
          { value: 'CA', text: 'CA - Client Age' },
          { value: 'IR', text: 'IR - Interest Rate' },
          { value: 'LA', text: 'LA - Loan Amount' },
          { value: 'LT', text: 'LT - Loan Term' },
          // LoanAnalysisReportID
          { value: 'GE', text: 'GE - Gender' },
          { value: 'LL', text: 'LL - Literacy Level' },
          { value: 'OC', text: 'OC - Occupation' },
          { value: 'PC', text: 'PC - Purpose Code' }
        ];
      }

      console.log('[LoanAnalysis] Analysis Type options:', allOptions);

      // Populate main form dropdown
      const mainSelect = qs('#AnalysisTypeId');
      if (mainSelect) {
        mainSelect.innerHTML = '<option value="">--Select--</option>';
        allOptions.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.text;
          mainSelect.appendChild(option);
        });
      }

      // Populate search modal dropdown
      const searchSelect = qs('#searchAnalysisTypeId');
      if (searchSelect) {
        searchSelect.innerHTML = '<option value="">--All--</option>';
        allOptions.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.text;
          searchSelect.appendChild(option);
        });
      }

    } catch (err) {
      console.error('[LoanAnalysis] Error loading Analysis Type options:', err);
    }
  }

  function bindActions() {
    const saveBtn = qs('[data-la-action="save"]');
    const cancelBtn = qs('[data-la-action="cancel"]');
    const deleteBtn = qs('[data-la-action="delete"]');
    const searchBtn = qs('[data-la-action="search"]');

    saveBtn?.addEventListener("click", handleSave);

    cancelBtn?.addEventListener("click", handleCancel);

    deleteBtn?.addEventListener("click", handleDelete);

    // Note: Search button now opens modal via bindSearchModal()
    // Keep Enter key for direct search
    qs("#LoanAnalysisId")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      }
    });
    
    // Bind grid action buttons (New, Alter, Remove, Update, Clear)
    qsa('[data-la-grid-action]').forEach(btn => {
      btn.addEventListener('click', handleGridButton);
    });
  }

  window.addEventListener("load", () => {
    bindModeButtons();
    bindActions();
    bindSearchModal(); // Initialize search modal
    setMode(MODES.VIEW);

    // Clear all form fields on load - no hardcoded/pre-filled values
    clearFormData();
    
    // Populate Analysis Type dropdowns from system codes
    populateAnalysisTypeDropdowns();
    
    console.log('[LoanAnalysis] Form initialized - all fields cleared');
  });
})();
