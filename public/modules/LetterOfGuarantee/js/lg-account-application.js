;(function (global) {
  'use strict';
  
  // Prevent duplicate loading
  if (global.__LGAccountApplicationModuleLoaded) return;
  global.__LGAccountApplicationModuleLoaded = true;

  console.log('[LGAccountApplication] Script loaded');

  let dependenciesReady = false;
  let LGService, LookupService, SearchService;
  let dependenciesPromise = null;
  let keepAliveInterval = null;
  let keepAliveStopTimeout = null;
  let listenersWired = false;
  let initRetryCount = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD DEPENDENCIES IMMEDIATELY ON SCRIPT LOAD (following client-maintenance pattern)
  // ═══════════════════════════════════════════════════════════════════════════
  (async () => {
    const { ServiceLoader } = global;
    if (!ServiceLoader) {
      console.error('[LGAccountApplication] ServiceLoader not available');
      return;
    }

    try {
      console.log('[LGAccountApplication] Loading dependencies...');
      console.log('[LGAccountApplication] ServiceLoader available:', !!ServiceLoader);
      console.log('[LGAccountApplication] ServiceLoader.loadCore:', typeof ServiceLoader.loadCore);
      
      console.log('[LGAccountApplication] Calling loadCore...');
      await ServiceLoader.loadCore();
      console.log('[LGAccountApplication] loadCore complete, Environment:', !!global.Environment);
      console.log('[LGAccountApplication] loadCore complete, CoreApi:', !!global.CoreApi);
      
      console.log('[LGAccountApplication] Calling loadLookupService...');
      await ServiceLoader.loadLookupService();
      console.log('[LGAccountApplication] loadLookupService complete, LookupService:', !!global.LookupService);
      
      console.log('[LGAccountApplication] Calling loadSearchService...');
      await ServiceLoader.loadSearchService();
      console.log('[LGAccountApplication] loadSearchService complete, SearchService:', !!global.SearchService);
      
      console.log('[LGAccountApplication] Calling loadLetterOfGuaranteeService...');
      await ServiceLoader.loadLetterOfGuaranteeService();
      console.log('[LGAccountApplication] loadLetterOfGuaranteeService complete, LetterOfGuaranteeService:', !!global.LetterOfGuaranteeService);

      // Get service references
      LGService = global.LetterOfGuaranteeService;
      LookupService = global.LookupService;
      SearchService = global.SearchService;

      dependenciesReady = true;
      console.log('[LGAccountApplication] Dependencies loaded successfully');

      // Initialize page when DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    } catch (error) {
      console.error('[LGAccountApplication] Failed to load dependencies:', error);
      console.error('[LGAccountApplication] Error stack:', error.stack);
    }
  })();

  const getSession = () => global.getAuthSession?.() || {};

  function getOperatorId() {
    const session = getSession();
    return session?.operatorId || session?.name || 'cs_adm';
  }

  function getBankId() {
    const fromField = String(getEl('BankID')?.value || '').trim();
    if (fromField) return fromField;
    const env = global.Environment || {};
    return String(env.bankId || env.BankID || '00');
  }

  function getBranchId() {
    const session = getSession();
    return session?.branchId || session?.BranchID || '';
  }

  function clearForm() {
    console.log('[LGAccountApplication] clearForm() called');
    const form = document.getElementById('lg-application-form');
    if (!form) {
      console.warn('[LGAccountApplication] Form not found');
      return;
    }

    // Clear all input fields (text, number, date)
    const inputs = form.querySelectorAll('input[type="text"], input[type="number"], input[type="date"], textarea');
    console.log('[LGAccountApplication] Clearing', inputs.length, 'input fields');
    inputs.forEach((input) => {
      // Skip BranchID for now, we'll set it separately
      if (input.id !== 'BranchID') {
        input.value = '';
      }
    });

    // Reset all select dropdowns to first option
    const selects = form.querySelectorAll('select');
    console.log('[LGAccountApplication] Resetting', selects.length, 'select dropdowns');
    selects.forEach((select) => {
      select.selectedIndex = 0;
    });

    // Reset BranchID to logged-in user's branch
    const branchId = getBranchId();
    console.log('[LGAccountApplication] Setting BranchID to:', branchId);
    const branchIdField = document.getElementById('BranchID');
    const branchNameField = document.getElementById('BranchName');
    
    if (branchIdField) {
      branchIdField.value = branchId || '';
    }
    if (branchNameField) {
      branchNameField.value = '';
    }

    console.log('[LGAccountApplication] clearForm() complete');
    
    // Reset UpdateCount cache
    viewedUpdateCount = null;
  }

  // Tracks whether the current form is showing a successfully-loaded record.
  let hasLoadedRecord = false;
  let viewedUpdateCount = null;

  // Prevent mutation-observer feedback loops and excessive DOM churn.
  let isApplyingModeButtonState = false;
  let scheduledModeButtonStateTimer = null;
  let modeButtonsObserver = null;

  const LOOKUP_MODAL_ID = 'lookupModal';
  const LOOKUP_MODAL_LABEL_ID = 'lookupModalLabel';
  const LOOKUP_SEARCH_INPUT_ID = 'lookupSearchInput';
  const LOOKUP_SEARCH_BTN_ID = 'lookupSearchBtn';
  const LOOKUP_CLEAR_BTN_ID = 'lookupClearBtn';
  const LOOKUP_RESULTS_HEADER_ID = 'lookupResultsHeader';
  const LOOKUP_RESULTS_BODY_ID = 'lookupResultsBody';
  const LOOKUP_RESULTS_META_ID = 'lookupResultsMeta';

  const LOOKUP_SIMPLE_CONTAINER_ID = 'lookupSimpleSearch';
  const LOOKUP_ADVANCED_CONTAINER_ID = 'lookupAdvancedSearch';
  const LOOKUP_ADVANCED_FORM_ID = 'lookupAdvancedForm';
  const LOOKUP_ADVANCED_SEARCH_BTN_ID = 'lookupAdvancedSearchBtn';
  const LOOKUP_ADVANCED_CLEAR_BTN_ID = 'lookupAdvancedClearBtn';

  let lookupModalInstance = null;
  let activeLookup = null;
  let lookupAutoLoadedThisShow = false;

  function getLookupContext() {
    // The lookup modal may live either in this document (standalone page)
    // or in the parent shell document (iframe embedding).
    const localModal = document.getElementById(LOOKUP_MODAL_ID);
    if (localModal) return { win: window, doc: document };

    try {
      const parentWin = window.parent;
      const parentDoc = parentWin?.document;
      const parentModal = parentDoc?.getElementById?.(LOOKUP_MODAL_ID);
      if (parentModal) return { win: parentWin, doc: parentDoc };
    } catch {
      // Cross-origin or blocked access.
    }

    return { win: window, doc: document };
  }

  function getLookupEl(id) {
    const ctx = getLookupContext();
    return ctx?.doc?.getElementById?.(id) || null;
  }

  function ensureLookupResultsScaffold() {
    const ctx = getLookupContext();
    const doc = ctx?.doc;
    if (!doc) return;

    const modalEl = doc.getElementById?.(LOOKUP_MODAL_ID);
    if (!modalEl) return;

    // If the host shell provides its own modal markup, it may not include our results table.
    // Create it lazily so rendering always has a target.
    if (doc.getElementById?.(LOOKUP_RESULTS_BODY_ID) && doc.getElementById?.(LOOKUP_RESULTS_HEADER_ID)) {
      if (!doc.getElementById?.(LOOKUP_RESULTS_META_ID)) {
        const modalBody = modalEl.querySelector?.('.modal-body');
        if (modalBody) {
          const meta = doc.createElement('div');
          meta.className = 'text-muted small';
          meta.id = LOOKUP_RESULTS_META_ID;
          modalBody.appendChild(meta);
        }
      }
      return;
    }

    const modalBody = modalEl.querySelector?.('.modal-body') || modalEl;
    if (!modalBody) return;

    const tableWrap = doc.createElement('div');
    tableWrap.className = 'table-responsive';

    const table = doc.createElement('table');
    table.className = 'table table-sm table-hover align-middle';
    table.id = 'lookupResultsTable';

    const thead = doc.createElement('thead');
    const headRow = doc.createElement('tr');
    headRow.id = LOOKUP_RESULTS_HEADER_ID;
    thead.appendChild(headRow);

    const tbody = doc.createElement('tbody');
    tbody.id = LOOKUP_RESULTS_BODY_ID;

    table.appendChild(thead);
    table.appendChild(tbody);
    tableWrap.appendChild(table);

    const meta = doc.createElement('div');
    meta.className = 'text-muted small';
    meta.id = LOOKUP_RESULTS_META_ID;

    modalBody.appendChild(tableWrap);
    modalBody.appendChild(meta);
  }
  function showToast(message, type = 'info') {
    const toast = document.getElementById('formToast');
    if (toast) {
      toast.className = `alert alert-${type} mt-3`;
      toast.textContent = message;
      toast.classList.remove('d-none');
      setTimeout(() => toast.classList.add('d-none'), 5000);
    } else {
      alert(message);
    }
  }
  function getEl(id) {
    return document.getElementById(id);
  }


  function setFieldValue(id, value) {
    const el = getEl(id);
    if (!el) return;
    el.value = value ?? '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Helper to get field value by ID
  function getFieldValue(id) {
    const el = getEl(id);
    return el ? el.value : '';
  }
  window.getFieldValue = getFieldValue;

  // Helper to get today's date in MM/DD/YYYY format
  function getTodayMMDDYYYY() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCT ID VALIDATION (auto-populate ProductName and Exchange Rate)
  // ═══════════════════════════════════════════════════════════════════════════
  
  async function handleProductIdInput() {
    const branchId = getFieldValue('BranchID');
    const productId = getFieldValue('ProductID');
    const bankId = getFieldValue('BankID') || '00';
    
    if (!productId) return;
    if (!LGService?.validateLGProductID) {
      console.warn('[LGAccountApplication] LGService.validateLGProductID not available');
      return;
    }

    console.log('[LGAccountApplication] Validating ProductID:', productId);

    try {
      const result = await LGService.validateLGProductID({ branchId, productId, bankId });
      
      if (!result.valid) {
        showToast('Invalid LG Product', 'danger');
        setFieldValue('ProductID', '');
        setFieldValue('ProductName', '');
        setFieldValue('ExchangeRate', '');
        return;
      }
      
      console.log('[LGAccountApplication] ProductID valid, setting ProductName:', result.description);
      setFieldValue('ProductName', result.description || '');
      
      // Fetch and set MeanRate for the product's currency
      const valueDate = getFieldValue('ValueDate') || getTodayMMDDYYYY();
      if (result.currencyId && LGService.getProductMeanRateREV) {
        console.log('[LGAccountApplication] Fetching exchange rate for currency:', result.currencyId);
        const meanRate = await LGService.getProductMeanRateREV(branchId, valueDate, result.currencyId);
        console.log('[LGAccountApplication] Exchange rate fetched:', meanRate);
        setFieldValue('ExchangeRate', meanRate ?? '');
      }
    } catch (err) {
      showToast('Product validation failed', 'warning');
      setFieldValue('ProductID', '');
      setFieldValue('ProductName', '');
      setFieldValue('ExchangeRate', '');
      console.error('[LGAccountApplication] ProductID validation error:', err);
    }
  }

  function wireProductIdValidation() {
    const productIdEl = document.getElementById('ProductID');
    if (!productIdEl) {
      console.warn('[LGAccountApplication] ProductID input not found');
      return;
    }
    
    console.log('[LGAccountApplication] Wiring ProductID validation events');
    productIdEl.addEventListener('blur', handleProductIdInput);
    productIdEl.addEventListener('change', handleProductIdInput);
  }

  function escapeSqlLikeTerm(term) {
    return String(term ?? '').trim().replaceAll("'", "''");
  }

  function ensureLookupModal() {
    const ctx = getLookupContext();
    const modalEl = ctx?.doc?.getElementById?.(LOOKUP_MODAL_ID);
    if (!modalEl) {
      console.warn('[LGAccountApplication] Lookup modal element not found in current or parent document');
      return null;
    }

    const bootstrapRef = ctx?.win?.bootstrap;
    if (!lookupModalInstance && bootstrapRef?.Modal) {
      lookupModalInstance = bootstrapRef.Modal.getOrCreateInstance(modalEl, { backdrop: 'static' });
    } else if (!lookupModalInstance && !bootstrapRef?.Modal) {
      console.warn('[LGAccountApplication] Bootstrap Modal not available on lookup window');
    }
    return lookupModalInstance;
  }

  function clearLookupResults() {
    ensureLookupResultsScaffold();
    const headerEl = getLookupEl(LOOKUP_RESULTS_HEADER_ID);
    const bodyEl = getLookupEl(LOOKUP_RESULTS_BODY_ID);
    const metaEl = getLookupEl(LOOKUP_RESULTS_META_ID);
    if (headerEl) headerEl.innerHTML = '';
    if (bodyEl) bodyEl.innerHTML = '';
    if (metaEl) metaEl.textContent = '';
  }

  function setLookupMeta(text) {
    ensureLookupResultsScaffold();
    const metaEl = getLookupEl(LOOKUP_RESULTS_META_ID);
    if (metaEl) metaEl.textContent = text || '';
  }

  function renderLookupResults(rows, columns) {
    ensureLookupResultsScaffold();
    const ctx = getLookupContext();
    const doc = ctx?.doc || document;

    const headerEl = getLookupEl(LOOKUP_RESULTS_HEADER_ID);
    const bodyEl = getLookupEl(LOOKUP_RESULTS_BODY_ID);
    if (!headerEl || !bodyEl) return;

    headerEl.innerHTML = '';
    bodyEl.innerHTML = '';

    const headerCells = ['Select', ...columns];
    for (const col of headerCells) {
      const th = doc.createElement('th');
      th.scope = 'col';
      th.textContent = col;
      headerEl.appendChild(th);
    }

    for (const row of rows) {
      const tr = doc.createElement('tr');

      const selectTd = doc.createElement('td');
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-sm btn-success';
      btn.textContent = 'Select';
      btn.addEventListener('click', () => {
        try {
          activeLookup?.onSelect?.(row);
        } finally {
          lookupModalInstance?.hide?.();
        }
      });
      selectTd.appendChild(btn);
      tr.appendChild(selectTd);

      for (const col of columns) {
        const td = doc.createElement('td');
        const val = row?.[col];
        td.textContent = val === null || val === undefined ? '' : String(val);
        tr.appendChild(td);
      }

      bodyEl.appendChild(tr);
    }
  }

  // Immediately enable critical fields before anything else
  function forceEnableFields() {
    const formMode = (document.getElementById('lg-application-form')?.dataset?.mode || 'view').toLowerCase();
    const shouldEnable = (id) => {
      if (id === 'BranchID') return true;
      if (id === 'ApplicationID') return formMode === 'view';
      return false;
    };

    const fieldsToEnable = ['BranchID', 'ApplicationID'];
    fieldsToEnable.forEach(id => {
      if (!shouldEnable(id)) return;
      const el = document.getElementById(id);
      if (el) {
        el.disabled = false;
        el.readOnly = false;
        el.removeAttribute('disabled');
        el.removeAttribute('readonly');
        el.removeAttribute('aria-disabled');
        if (el.style) {
          el.style.pointerEvents = '';
          el.style.userSelect = '';
        }
        // Also remove Bootstrap disabled classes if present
        el.classList.remove('disabled');

        // Some legacy controllers disable parent wrappers via classes / pointer-events.
        // Walk up a few levels (until the form) and clear common disabling signals.
        let node = el.parentElement;
        let guard = 0;
        while (node && guard < 6) {
          node.classList?.remove?.('disabled');
          node.removeAttribute?.('aria-disabled');
          if (node.style) {
            if (node.style.pointerEvents === 'none') node.style.pointerEvents = '';
            if (node.style.userSelect === 'none') node.style.userSelect = '';
            if (node.style.opacity) node.style.opacity = '';
          }
          if (node.id === 'lg-application-form') break;
          node = node.parentElement;
          guard += 1;
        }
      }
    });
  }

  function clearLegacyDisabledSignals(el) {
    if (!el) return;
    el.removeAttribute('aria-disabled');
    el.classList?.remove?.('disabled');
    if (el.style) {
      // Force enabled interaction (overrides any CSS that might set pointer-events:none)
      el.style.pointerEvents = 'auto';
      el.style.userSelect = '';
      el.style.opacity = '1';
    }
  }

  function clearDisabledSignalsUpTree(el, maxDepth = 6) {
    let node = el;
    let guard = 0;
    while (node && guard < maxDepth) {
      clearLegacyDisabledSignals(node);
      if (node.hasAttribute?.('disabled')) node.removeAttribute('disabled');
      // Some wrappers use inline styles to block interaction.
      if (node.style?.pointerEvents === 'none') node.style.pointerEvents = '';
      if (node.style?.userSelect === 'none') node.style.userSelect = '';
      node = node.parentElement;
      guard += 1;
    }
  }

  function applyModeButtonState() {
    if (isApplyingModeButtonState) return;
    isApplyingModeButtonState = true;

    const form = document.getElementById('lg-application-form');
    const mode = (form?.dataset?.mode || 'view').toLowerCase();

    const viewBtn = document.querySelector('[data-lg-mode="view"]');
    const addBtn = document.querySelector('[data-lg-mode="add"]');
    const editBtn = document.querySelector('[data-lg-mode="edit"]');
    const deleteBtn = document.querySelector('[data-lg-action="delete"]');
    console.log("view button disabled "+viewBtn.disabled);
    // Some legacy shells disable the whole action panel; clear that too.
    const actionPanel = viewBtn?.closest?.('.cm-legacy-actions') || addBtn?.closest?.('.cm-legacy-actions') || editBtn?.closest?.('.cm-legacy-actions');
    if (actionPanel) {
      clearDisabledSignalsUpTree(actionPanel, 4);
    }
    console.log("view button disabled "+document.querySelector('[data-lg-mode="view"]').disabled);
    try {
      // Always clear any legacy disabling signals first (some pages disable wrappers/pointer-events).
      [viewBtn, addBtn, editBtn, deleteBtn].forEach((btn) => {
        if (!btn) return;
        clearDisabledSignalsUpTree(btn, 4);
        // Some scripts set disabled attribute directly.
        if (btn.hasAttribute('disabled')) btn.removeAttribute('disabled');
        if (btn.disabled) btn.disabled = false;
        // Ensure the button is clickable even if CSS/inline styles were applied.
        if (btn.style) {
          if (btn.style.pointerEvents !== 'auto') btn.style.pointerEvents = 'auto';
          if (btn.style.opacity !== '1') btn.style.opacity = '1';
        }
      });

      // Now apply our intentional disabled states.
      // When in 'add' or 'edit' mode, disable View/Add/Edit/Delete buttons
      // When in 'view' mode, enable View/Add, and conditionally enable Edit/Delete based on whether a record is loaded
      const isEditingMode = mode === 'add' || mode === 'edit';
      
      if (isEditingMode) {
        // Disable all mode buttons when actively editing
        if (viewBtn) viewBtn.disabled = true;
        if (addBtn) addBtn.disabled = true;
        if (editBtn) editBtn.disabled = true;
        if (deleteBtn) deleteBtn.disabled = true;
      } else {
        // In view mode, keep View/Add enabled
        if (viewBtn) viewBtn.disabled = false;
        if (addBtn) addBtn.disabled = false;
        
        // Edit/Delete enabled ONLY if a record is loaded
        if (editBtn) editBtn.disabled = !hasLoadedRecord;
        if (deleteBtn) deleteBtn.disabled = !hasLoadedRecord;
      }

      // When intentionally disabled, let browser styling handle it.
      if (addBtn?.disabled && addBtn.style) addBtn.style.pointerEvents = '';
      if (editBtn?.disabled && editBtn.style) editBtn.style.pointerEvents = '';
      if (viewBtn?.disabled && viewBtn.style) viewBtn.style.pointerEvents = '';
      if (deleteBtn?.disabled && deleteBtn.style) deleteBtn.style.pointerEvents = '';
    } finally {
      isApplyingModeButtonState = false;
    }
    console.log("view button disabled "+document.querySelector('[data-lg-mode="view"]').disabled);
  }

  function scheduleApplyModeButtonState(delayMs = 0) {
    if (scheduledModeButtonStateTimer) return;
    scheduledModeButtonStateTimer = setTimeout(() => {
      scheduledModeButtonStateTimer = null;
      // Use rAF to batch with browser rendering.
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => applyModeButtonState());
      } else {
        applyModeButtonState();
      }
    }, Math.max(0, Number(delayMs) || 0));
  }

  function lockModeButtonsState() {
    if (modeButtonsObserver) return;

    const form = document.getElementById('lg-application-form');
    const viewBtn = document.querySelector('[data-lg-mode="view"]');
    const addBtn = document.querySelector('[data-lg-mode="add"]');
    const editBtn = document.querySelector('[data-lg-mode="edit"]');
    const deleteBtn = document.querySelector('[data-lg-action="delete"]');
    const actionPanel = viewBtn?.closest?.('.cm-legacy-actions') || addBtn?.closest?.('.cm-legacy-actions') || editBtn?.closest?.('.cm-legacy-actions');

    modeButtonsObserver = new MutationObserver(() => {
      // Avoid feedback loops: schedule a single re-apply after mutations settle.
      if (isApplyingModeButtonState) return;
      scheduleApplyModeButtonState(0);
    });

    [form, actionPanel, viewBtn, addBtn, editBtn, deleteBtn].forEach((el) => {
      if (!el) return;
      modeButtonsObserver.observe(el, {
        attributes: true,
        attributeFilter: ['disabled', 'class', 'style', 'aria-disabled', 'inert']
      });
    });

    // Auto-stop observing after stabilization to prevent long-running overhead.
    setTimeout(() => {
      try {
        modeButtonsObserver?.disconnect?.();
      } finally {
        modeButtonsObserver = null;
      }
    }, 30000);
  }

  function stopUiKeepAlive() {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
    if (keepAliveStopTimeout) {
      clearTimeout(keepAliveStopTimeout);
      keepAliveStopTimeout = null;
    }
  }

  function startUiKeepAlive(durationMs = 20000) {
    if (keepAliveInterval) return;
    // Keep this conservative: frequent DOM mutations can make the page feel hung.
    keepAliveInterval = setInterval(() => {
      forceEnableFields();
      scheduleApplyModeButtonState(0);
    }, 500);

    // Auto-stop after a short stabilization window.
    keepAliveStopTimeout = setTimeout(() => {
      stopUiKeepAlive();
    }, Math.max(0, Number(durationMs) || 0));
  }

  function lockCriticalFieldsEnabled() {
    const ids = ['BranchID', 'ApplicationID'];
    const observer = new MutationObserver((mutationList) => {
      for (const m of mutationList) {
        const t = m.target;
        if (!t || !ids.includes(t.id)) continue;
        if (m.type === 'attributes') {
          const mode = (document.getElementById('lg-application-form')?.dataset?.mode || 'view').toLowerCase();
          const shouldForceEnable = (t.id === 'BranchID') || (t.id === 'ApplicationID' && mode === 'view');

          // Any time another script toggles these flags, undo it immediately (when allowed).
          if (shouldForceEnable && (t.disabled || t.readOnly || t.hasAttribute('disabled') || t.hasAttribute('readonly'))) {
            forceEnableFields();
          }
        }
      }
    });

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      observer.observe(el, { attributes: true, attributeFilter: ['disabled', 'readonly', 'aria-disabled', 'class', 'style'] });
    });

    // Extra hooks: before the user interacts, re-enable.
    document.addEventListener('pointerdown', forceEnableFields, true);
    document.addEventListener('keydown', forceEnableFields, true);
    window.addEventListener('focus', forceEnableFields, true);
  }

  // Run immediately
  forceEnableFields();
  applyModeButtonState();
  
  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      forceEnableFields();
      applyModeButtonState();
      startUiKeepAlive();
      lockModeButtonsState();

      // Catch any late framework toggles.
      setTimeout(applyModeButtonState, 0);
      setTimeout(applyModeButtonState, 50);
      setTimeout(applyModeButtonState, 250);
    });
  } else {
    forceEnableFields();
    applyModeButtonState();
    startUiKeepAlive();
    lockModeButtonsState();
    setTimeout(applyModeButtonState, 0);
    setTimeout(applyModeButtonState, 50);
    setTimeout(applyModeButtonState, 250);
  }

  // Also run after full load (some shells modify UI after load).
  window.addEventListener('load', () => {
    applyModeButtonState();
  });

  // Helper for lazy dependency check (used by doLookupSearch)
  async function ensureDependenciesLoaded() {
    if (dependenciesReady) return;
    // Dependencies are loaded at script start; just wait a bit if still loading
    let retries = 0;
    while (!dependenciesReady && retries < 50) {
      await new Promise(r => setTimeout(r, 100));
      retries++;
    }
    if (!dependenciesReady) {
      throw new Error('Dependencies not loaded');
    }
  }

  function init() {
    if (!dependenciesReady) {
      initRetryCount += 1;
      if (initRetryCount <= 50) {
        setTimeout(init, 100);
        return;
      }

      console.error('[LGAccountApplication] Dependencies not ready after retries; aborting init.');
      try {
        showToast('Page services did not load. Please refresh and try again.', 'danger');
      } catch {
        // ignore
      }
      document.getElementById("viewBtn").disabled=false;
      return;
    }

    console.log('[LGAccountApplication] Initializing page...');

    // Force enable fields again
    forceEnableFields();
    lockCriticalFieldsEnabled();

    // Set form to view mode initially
    const form = document.getElementById('lg-application-form');
    if (form) {
      setMode(form, 'view');
    }

    setupEventListeners();
    wireLocalAmountAutoCalc();
    loadPurposeDropdown();
    wireLookupModalEvents();

    // Now wire ProductID validation (LGService is guaranteed loaded)
    wireProductIdValidation();

    // Optional: allow end-to-end testing via URL params
    // Example: ?ApplicationID=2024000008&OurBranchID=0104
    try {
      const params = new URLSearchParams(window.location.search || "");
      const applicationIDParam = params.get("ApplicationID") || params.get("applicationID");
      const branchIDParam = params.get("OurBranchID") || params.get("BranchID") || params.get("ourBranchID");

      const applicationEl = document.getElementById("ApplicationID");
      const branchEl = document.getElementById("BranchID");

      if (applicationEl && applicationIDParam && !applicationEl.value) {
        applicationEl.value = applicationIDParam;
      }
      if (branchEl && branchIDParam && !branchEl.value) {
        branchEl.value = branchIDParam;
      }

      // Re-force enable after any late mode toggles
      forceEnableFields();

      if (applicationIDParam && branchIDParam) {
        // Defer a tick so bindings are ready
        setTimeout(() => handleViewApplication(), 0);
      }
    } catch (e) {
      console.warn('[LGAccountApplication] URL param init skipped:', e);
    }

    // Keep fields/buttons enabled (interval is started on DOM ready)
    startUiKeepAlive();

    console.log('[LGAccountApplication] Page initialized');
  }

  function setupEventListeners() {
    if (listenersWired) return;
    listenersWired = true;

    const form = document.getElementById('lg-application-form');
    
    console.log('[LGAccountApplication] Setting up event listeners...');

    // Fallback: some shells/pages use legacy button ids.
    const legacyViewBtn = document.getElementById('viewBtn');
    if (legacyViewBtn) {
      legacyViewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleViewApplication();
      });
    }

    const legacyAddBtn = document.getElementById('addBtn');
    if (legacyAddBtn) {
      legacyAddBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('[LGAccountApplication] Add button clicked');
        
        const form = document.getElementById('lg-application-form');
        
        // Clear all form controls
        clearForm();
        
        // Reset state
        hasLoadedRecord = false;
        
        // Set mode to 'add' which will:
        // - Enable editable fields
        // - Disable View, Add, Edit, Delete buttons
        // - Enable Save, Cancel buttons
        setMode(form, 'add');
        
        // Apply button states explicitly
        applyModeButtonState();
        
        // Set focus to ClientID field
        setTimeout(() => {
          const clientIdField = document.getElementById('ClientID');
          if (clientIdField) {
            clientIdField.focus();
          }
        }, 100);
      });
    }
    
    // Intercept ALL clicks in capture phase (before any other handler)
    document.addEventListener('click', (e) => {
      const target = e.target instanceof Element ? e.target : e.target?.parentElement;
      if (!target) return;

      const lookupBtn = target.closest('[data-lookup]');
      if (lookupBtn) {
        console.log('[LGAccountApplication] Lookup button clicked:', lookupBtn.getAttribute('data-lookup'));
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const lookupType = lookupBtn.getAttribute('data-lookup');
        handleLookup(lookupType);
        return false;
      }
      
      const modeBtn = target.closest('[data-lg-mode]');
      if (modeBtn) {
        const mode = modeBtn.getAttribute('data-lg-mode');
        console.log('[LGAccountApplication] Mode button clicked:', mode);
        
        if (mode === 'view') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          handleViewApplication();
          return false;
        } else if (mode === 'add' || mode === 'edit') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          if (mode === 'add') {
            // Clear all form controls
            clearForm();
            hasLoadedRecord = false;
            setMode(form, mode);
            applyModeButtonState();
            
            // Set focus to ClientID field
            setTimeout(() => {
              const clientIdField = document.getElementById('ClientID');
              if (clientIdField) {
                clientIdField.focus();
              }
            }, 100);
          } else {
            setMode(form, mode);
          }
          return false;
        }
      }

      // Handle action buttons (save/cancel/delete)
      const actionBtn = target.closest('[data-lg-action]');
      if (actionBtn) {
        const action = actionBtn.getAttribute('data-lg-action');
        console.log('[LGAccountApplication] Action button clicked:', action);
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (action === 'save') {
          // Invoke application save
          handleSaveApplication();
          return false;
        }
        if (action === 'cancel') {
          // Clear all controls
          clearForm();
          
          // Set Application Date to system working date
          const workingDate = getSystemWorkingDate();
          const applicationDateFormatted = formatDate(workingDate);
          setFieldValue('ApplicationDate', applicationDateFormatted);
          
          // Return to view mode
          if (form) {
            setMode(form, 'view');
            
            // Activate View and Add buttons
            const viewBtn = form.querySelector('[data-lg-mode="view"]');
            const addBtn = form.querySelector('[data-lg-mode="add"]');
            if (viewBtn) viewBtn.disabled = false;
            if (addBtn) addBtn.disabled = false;
          }
          
          // Disable navigation and reinstate buttons on cancel
          const previousBtn = form.querySelector('[data-lg-nav="previous"]');
          const nextBtn = form.querySelector('[data-lg-nav="next"]');
          const reinstateBtn = form.querySelector('[data-lg-action="reinstate"]');
          if (previousBtn) previousBtn.disabled = true;
          if (nextBtn) nextBtn.disabled = true;
          if (reinstateBtn) reinstateBtn.disabled = true;
          
          applyModeButtonState();
          hasLoadedRecord = false;
          return false;
        }
        if (action === 'delete') {
          // Delete action can be implemented later
          console.log('[LGAccountApplication] Delete button clicked - not yet implemented');
          return false;
        }
        if (action === 'reinstate') {
          // Reinstate action can be implemented later
          console.log('[LGAccountApplication] Reinstate button clicked - not yet implemented');
          return false;
        }
      }
      
      // Handle navigation buttons
      const navBtn = target.closest('[data-lg-nav]');
      if (navBtn) {
        const navDirection = navBtn.getAttribute('data-lg-nav');
        console.log('[LGAccountApplication] Navigation button clicked:', navDirection);
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Determine direction: previous = -1, next = 1
        let direction = 0;
        if (navDirection === 'previous') {
          direction = -1;
        } else if (navDirection === 'next') {
          direction = 1;
        }
        
        // Call handleViewApplication with the determined direction
        handleViewApplication(direction);
        return false;
      }
    }, true); // Capture phase - runs BEFORE any other click handlers
    
    console.log('[LGAccountApplication] Event listeners set up');
  }

  // Wire click handling early so the View button responds even if services are still loading.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEventListeners);
  } else {
    setupEventListeners();
  }

  function setMode(form, mode) {
    if (!form) return;
    
    const normalized = (mode || 'view').toLowerCase();
    form.dataset.mode = normalized;

    // Requirement: Only clear ApplicationID when entering Add (not Edit).
    if (normalized === 'add') {
      setFieldValue('ApplicationID', '');
    }

    const isEditable = normalized === 'add' || normalized === 'edit';
    form.querySelectorAll('[data-editable="true"]').forEach((el) => {
      // BranchID must remain enabled in all modes.
      if (el.id === 'BranchID') {
        el.disabled = false;
        return;
      }

      // Requirement: In Add/Edit, ApplicationID input must be disabled (still usable in View).
      if (el.id === 'ApplicationID') {
        el.disabled = isEditable;
        return;
      }

      // LocalAmount is never editable; it's derived from LimitAmount * ExchangeRate
      if (el.id === 'LocalAmount') {
        el.disabled = true;
        el.readOnly = true;
        return;
      }

      el.disabled = !isEditable;
    });

    // Lookup/search buttons: Branch/Application are always usable for View.
    // Client/Product/Account are only usable in Add/Edit.
    const setLookupButtonsEnabled = (lookupKind, enabled) => {
      document.querySelectorAll(`[data-lookup="${lookupKind}"]`).forEach((btn) => {
        if (!btn) return;
        btn.disabled = !enabled;
        if (btn.disabled) btn.setAttribute('disabled', 'disabled');
        else btn.removeAttribute('disabled');
      });
    };
    setLookupButtonsEnabled('branch', true);
    // Requirement: In Add/Edit, Application lookup button must be disabled (used in View).
    setLookupButtonsEnabled('application', normalized === 'view');
    setLookupButtonsEnabled('client', isEditable);
    setLookupButtonsEnabled('product', isEditable);
    setLookupButtonsEnabled('account', isEditable);

    const saveBtn = form.querySelector('[data-lg-action="save"]');
    const cancelBtn = form.querySelector('[data-lg-action="cancel"]');
    if (saveBtn) saveBtn.disabled = !isEditable;
    // Cancel is enabled while editing (Add/Edit) OR after a successful View load.
    if (cancelBtn) cancelBtn.disabled = !(isEditable || (hasLoadedRecord && normalized === 'view'));

    form.querySelectorAll('[data-lg-mode]').forEach((btn) => {
      const btnMode = (btn.getAttribute('data-lg-mode') || '').toLowerCase();
      btn.classList.toggle('is-active', btnMode === normalized);
      btn.setAttribute('aria-pressed', btnMode === normalized ? 'true' : 'false');
    });

    updateViewAddButtonState(form);
  }

  function updateViewAddButtonState(form) {
    // Keep for backward compatibility; implementation centralized.
    applyModeButtonState();
  }

  async function loadPurposeDropdown() {
    try {
      const options = await LookupService.getSystemCodeOptions('PurposeID');
      const select = document.getElementById('PurposeID');
      
      if (select) {
        // Preserve any previously-bound value (e.g., after View loads a record).
        const existingValue = select.value;
        select.innerHTML = '<option value="">--Select--</option>';
        options.forEach(opt => {
          select.innerHTML += `<option value="${opt.value}">${opt.label}</option>`;
        });

        if (existingValue) {
          select.value = existingValue;
        }
      }
    } catch (error) {
      console.error('[LGAccountApplication] Failed to load purpose dropdown:', error);
    }
  }

  function handleLookup(lookupType) {
    openLookup(lookupType);
  }

  function wireLookupModalEvents() {
    const inputEl = getLookupEl(LOOKUP_SEARCH_INPUT_ID);
    const searchBtn = getLookupEl(LOOKUP_SEARCH_BTN_ID);
    const clearBtn = getLookupEl(LOOKUP_CLEAR_BTN_ID);
    ensureLookupResultsScaffold();

    const advancedForm = getLookupEl(LOOKUP_ADVANCED_FORM_ID);
    const advancedSearchBtn = getLookupEl(LOOKUP_ADVANCED_SEARCH_BTN_ID);
    const advancedClearBtn = getLookupEl(LOOKUP_ADVANCED_CLEAR_BTN_ID);

    inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        doLookupSearch();
      }
    });

    searchBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      doLookupSearch();
    });
    clearBtn?.addEventListener('click', () => {
      inputEl.value = '';
      inputEl.focus();
      clearLookupResults();
      setLookupMeta('');
    });

    // Advanced product lookup form (mirrors client maintenance search filters)
    advancedForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      e.stopPropagation();
      doLookupSearch();
    });

    // Some browsers treat nested forms oddly; bind explicit click too.
    advancedSearchBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      doLookupSearch();
    });

    // If user hits Enter inside advanced fields, run search without bubbling.
    advancedForm?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        doLookupSearch();
      }
    });
    advancedClearBtn?.addEventListener('click', () => {
      advancedForm?.querySelectorAll?.('[data-lookup-field]')?.forEach?.((field) => {
        field.value = '';
      });
      clearLookupResults();
      setLookupMeta('');
    });

    const modalEl = getLookupEl(LOOKUP_MODAL_ID);
    modalEl?.addEventListener('shown.bs.modal', () => {
      setTimeout(() => {
        const advancedContainer = getLookupEl(LOOKUP_ADVANCED_CONTAINER_ID);
        if (advancedContainer && !advancedContainer.classList.contains('d-none')) {
          const advancedForm = getLookupEl(LOOKUP_ADVANCED_FORM_ID);
          const scope = String(activeLookup?.lookupScope || '').trim();
          const firstField = advancedForm?.querySelector?.(
            `[data-lookup-scope="${scope}"]:not(.d-none) [data-lookup-field]`
          ) || advancedForm?.querySelector?.('[data-lookup-field]');
          firstField?.focus?.();

          // Auto-load lookup results when the popup opens.
          if (!lookupAutoLoadedThisShow && activeLookup?.autoLoadOnOpen) {
            lookupAutoLoadedThisShow = true;
            doLookupSearch();
          }
          return;
        }
        inputEl?.focus?.();

        // For simple-search lookups, only auto-load if there is a term.
        if (!lookupAutoLoadedThisShow && activeLookup?.autoLoadOnOpen) {
          const term = String(inputEl?.value || '').trim();
          if (term) {
            lookupAutoLoadedThisShow = true;
            doLookupSearch();
          }
        }
      }, 0);
    });

    // Reset per-open autoload guard.
    modalEl?.addEventListener('hidden.bs.modal', () => {
      lookupAutoLoadedThisShow = false;
    });
  }

  async function openLookup(kind) {
    // Ensure dependencies are loaded before creating lookup config
    if (!dependenciesReady) {
      try {
        await ensureDependenciesLoaded();
      } catch (e) {
        showToast('Services still loading, please try again', 'warning');
        return;
      }
    }

    const modal = ensureLookupModal();
    if (!modal) {
      showToast('Lookup modal not available on page', 'warning');
      return;
    }

    const modalLabelEl = getLookupEl(LOOKUP_MODAL_LABEL_ID);
    const inputEl = getLookupEl(LOOKUP_SEARCH_INPUT_ID);
    const simpleContainer = getLookupEl(LOOKUP_SIMPLE_CONTAINER_ID);
    const advancedContainer = getLookupEl(LOOKUP_ADVANCED_CONTAINER_ID);
    const advancedForm = getLookupEl(LOOKUP_ADVANCED_FORM_ID);

    // Create lookup config only after dependencies are loaded
    const kindToConfig = {
      branch: {
        title: 'Branch Lookup',
        tableId: 'BranchID',
        whereColumn: 'OurBranchID',
        prefillFromFieldId: 'BranchID',
        useAdvancedSearch: true,
        autoLoadOnOpen: true,
        lookupScope: 'branch',
        onSelect: (row) => {
          setFieldValue('BranchID', row?.OurBranchID);
          setFieldValue('BranchName', row?.BranchName);
        }
      },
      application: {
        title: 'LG Application Lookup',
        tableId: 'LGApplicationID',
        whereColumn: 'ApplicationID',
        prefillFromFieldId: 'ApplicationID',
        useAdvancedSearch: true,
        autoLoadOnOpen: true,
        lookupScope: 'application',
        onSelect: (row) => {
          setFieldValue('ApplicationID', row?.ApplicationID);
          if (row?.ClientID) setFieldValue('ClientID', row?.ClientID);
          if (row?.ClientName) setFieldValue('ClientName', row?.ClientName);
          if (row?.ProductID) setFieldValue('ProductID', row?.ProductID);
        }
      },
      client: {
        title: 'Client Lookup',
        tableId: 'ClientID',
        whereColumn: 'ClientID',
        prefillFromFieldId: 'ClientID',
        useAdvancedSearch: true,
        autoLoadOnOpen: true,
        lookupScope: 'client',
        onSelect: (row) => {
          setFieldValue('ClientID', row?.ClientID);
          if (row?.ClientName) setFieldValue('ClientName', row?.ClientName);
          if (row?.FullName) setFieldValue('ClientName', row?.FullName);
          if (row?.Name) setFieldValue('ClientName', row?.Name);
        }
      },
      product: {
        title: 'Product Lookup',
        tableId: 'ProductID',
        whereColumn: 'ProductID',
        prefillFromFieldId: 'ProductID',
        useAdvancedSearch: true,
        lookupScope: 'product',
        onSelect: async (row) => {
          setFieldValue('ProductID', row?.ProductID);
          setFieldValue(
            'ProductName',
            row?.ProductName || row?.ProductDescription || row?.Description || ''
          );

          // Auto-fetch and set ExchangeRate (MeanRate for REV) after ProductID selection
          const branchId = getFieldValue('BranchID');
          const valueDate = getFieldValue('ValueDate') || getTodayMMDDYYYY();
          const currencyId = row?.CurrencyID;
          if (branchId && valueDate && currencyId && LGService?.getProductMeanRateREV) {
            try {
              const meanRate = await LGService.getProductMeanRateREV(branchId, valueDate, currencyId);
              if (meanRate != null) setFieldValue('ExchangeRate', meanRate);
            } catch (err) {
              showToast('Failed to fetch exchange rate', 'warning');
              console.error('[LGAccountApplication] Error fetching MeanRate:', err);
            }
          }
        }
      },
      account: {
        title: 'Account Lookup',
        tableId: 'AccountID',
        whereColumn: 'AccountID',
        prefillFromFieldId: 'AccountID',
        useAdvancedSearch: true,
        autoLoadOnOpen: true,
        lookupScope: 'account',
        onSelect: (row) => {
          setFieldValue('AccountID', row?.AccountID);
          if (row?.AccountName) setFieldValue('AccountDescription', row?.AccountName);
          if (row?.Description) setFieldValue('AccountDescription', row?.Description);
        }
      }
    };

    const cfg = kindToConfig[kind];
    if (!cfg) {
      showToast('Lookup type not configured', 'warning');
      return;
    }

    activeLookup = cfg;
    lookupAutoLoadedThisShow = false;
    if (modalLabelEl) modalLabelEl.textContent = cfg.title;
    clearLookupResults();
    setLookupMeta('');

    // Toggle simple vs advanced search UI.
    const showAdvanced = Boolean(cfg.useAdvancedSearch);
    if (simpleContainer) simpleContainer.classList.toggle('d-none', showAdvanced);
    if (advancedContainer) advancedContainer.classList.toggle('d-none', !showAdvanced);

    if (inputEl) {
      inputEl.value = getEl(cfg.prefillFromFieldId)?.value || '';
    }

    // Scope which advanced fields are visible and prefill the primary field.
    if (showAdvanced && advancedForm) {
      const scope = String(cfg.lookupScope || kind || '').trim();

      // Hide all scope blocks, then show only the active one.
      advancedForm.querySelectorAll('[data-lookup-scope]')?.forEach?.((node) => {
        node.classList.toggle('d-none', node.getAttribute('data-lookup-scope') !== scope);
      });

      // Reset all advanced fields on open (prevents stale filters between lookup types)
      advancedForm.querySelectorAll('[data-lookup-field]')?.forEach?.((field) => {
        field.value = '';
      });

      const prefill = String(getEl(cfg.prefillFromFieldId)?.value || '').trim();

      // Pick the right primary field for prefill per lookup kind.
      const primaryFieldByScope = {
        branch: 'OurBranchID',
        application: 'ApplicationID',
        client: 'ClientID',
        product: 'ProductID',
        account: 'AccountID'
      };
      const primaryField = primaryFieldByScope[scope] || cfg.whereColumn;
      const primaryEl = primaryField
        ? advancedForm.querySelector?.(`[data-lookup-scope="${scope}"] [data-lookup-field="${primaryField}"]`)
        : null;

      if (primaryEl && prefill) primaryEl.value = prefill;
    }

    modal.show();
  }

  async function doLookupSearch() {
    if (!activeLookup) return;
    
    // Ensure dependencies are loaded before searching
    if (!dependenciesReady) {
      try {
        await ensureDependenciesLoaded();
      } catch (e) {
        showToast('Services still loading, please try again', 'warning');
        return;
      }
    }
    
    if (!SearchService) {
      showToast('Search service not available', 'warning');
      return;
    }

    const inputEl = getLookupEl(LOOKUP_SEARCH_INPUT_ID);
    const advancedForm = getLookupEl(LOOKUP_ADVANCED_FORM_ID);

    let whereStmt = '';

    // Build WhereStmt from advanced filters when present; otherwise fall back to simple term.
    if (activeLookup.useAdvancedSearch && advancedForm) {
      const fields = Array.from(advancedForm.querySelectorAll('[data-lookup-field]'));
      const clauses = fields
        .map((field) => {
          const column = field?.dataset?.lookupField;
          const raw = String(field?.value || '').trim();
          if (!column || !raw) return null;

          const mode = advancedForm.querySelector(`[data-lookup-mode='${column}']`)?.value || 'Like';
          const sanitized = escapeSqlLikeTerm(raw);
          if (mode === 'Exact') return `${column} = '${sanitized}'`;
          return `${column} like '%${sanitized}%'`;
        })
        .filter(Boolean);

      whereStmt = clauses.length ? clauses.join(' AND ') : '';
    } else {
      const term = escapeSqlLikeTerm(inputEl?.value);
      if (!term && !activeLookup.autoLoadOnOpen) {
        showToast('Enter a search term', 'warning');
        return;
      }
      if (term) {
        whereStmt = `${activeLookup.whereColumn} like '%${term}%'`;
      }
    }

    // Product lookup must always be restricted to LG products.
    if (activeLookup.tableId === 'ProductID') {
      const lgClause = "ProductTypeID = 'LG'";
      whereStmt = whereStmt ? `${lgClause} AND ${whereStmt}` : lgClause;
    }

    // Client lookup must always be restricted to Active clients.
    if (activeLookup.tableId === 'ClientID') {
      const activeClause = "ClientStatusID = 'A'";
      whereStmt = whereStmt ? `${activeClause} AND ${whereStmt}` : activeClause;
    }

    // Account lookup must always be restricted to LG product accounts (+ optional ProductID/ClientID from form).
    if (activeLookup.tableId === 'AccountID') {
      const lgClause = "ProductTypeID = 'LG'";
      whereStmt = whereStmt ? `${lgClause} AND ${whereStmt}` : lgClause;

      const selectedProductId = String(getEl('ProductID')?.value || '').trim();
      if (selectedProductId) {
        const escapedProductId = escapeSqlLikeTerm(selectedProductId);
        const productClause = `ProductID = '${escapedProductId}'`;
        whereStmt = whereStmt ? `${productClause} AND ${whereStmt}` : productClause;
      }

      const selectedClientId = String(getEl('ClientID')?.value || '').trim();
      if (selectedClientId) {
        const escapedClientId = escapeSqlLikeTerm(selectedClientId);
        const clientClause = `ClientID = '${escapedClientId}'`;
        whereStmt = whereStmt ? `${clientClause} AND ${whereStmt}` : clientClause;
      }
    }

    clearLookupResults();
    setLookupMeta('Searching...');

    const extractRows = (searchResult) => {
      const candidates = [searchResult?.data, searchResult?.Details, searchResult].filter(Boolean);
      for (const candidate of candidates) {
        if (Array.isArray(candidate)) return candidate;

        const nested =
          candidate?.Details?.SearchResults ||
          candidate?.Details ||
          candidate?.SearchResults ||
          candidate?.Details?.Details ||
          candidate;

        if (Array.isArray(nested)) return nested;
        if (Array.isArray(nested?.SearchResults)) return nested.SearchResults;
        if (Array.isArray(nested?.Details)) return nested.Details;
      }
      return [];
    };

    try {
      const ourBranchId = String(getEl('BranchID')?.value || '').trim();
      const payload = {
        TableID: activeLookup.tableId,
        AdvFilterString: activeLookup.advFilterString || '',
        WhereStmt: whereStmt,
        PrevOrNext: '1',
        RefID: '',
        OperatorID: getOperatorId(),
        ModuleID: 1000,
        OurBranchID: ourBranchId
      };

      const result = await SearchService.search(payload);
      const rows = extractRows(result);

      if (!rows.length && !result?.success) {
        setLookupMeta(result?.message || 'Search failed');
        showToast(result?.message || 'Search failed', 'danger');
        return;
      }

      if (!rows.length) {
        setLookupMeta('No results');
        showToast('No results found', 'info');
        return;
      }

      const first = rows[0] || {};
      const preferredCols = [
        'OurBranchID',
        'BranchName',
        'ApplicationID',
        'ClientID',
        'ClientName',
        'ProductID',
        'ProductName',
        'Description',
        'ProductTypeID',
        'AccountID',
        'AccountName',
        'CurrencyID'
      ];

      const cols = preferredCols.filter((c) => Object.prototype.hasOwnProperty.call(first, c));
      const fallbackCols = Object.keys(first).slice(0, 6);
      const columns = cols.length ? cols : fallbackCols;

      renderLookupResults(rows, columns);
      setLookupMeta(`${rows.length} result(s)`);
    } catch (error) {
      console.error('[LGAccountApplication] Lookup search failed:', error);
      setLookupMeta('Search failed');
      showToast('Search failed', 'danger');
    }
  }

  async function handleViewApplication(direction = 0) {
    console.log('[LGAccountApplication] View application requested with direction:', direction);
    const applicationID = document.getElementById('ApplicationID')?.value?.trim?.();
    const branchID = document.getElementById('BranchID')?.value?.trim?.();

    if (!applicationID || !branchID) {
      showToast('Please enter both Branch ID and Application ID', 'warning');
      return;
    }

    try {
      if (!dependenciesReady || !LGService) {
        showToast('Loading services, please wait...', 'info');
        await ensureDependenciesLoaded();
      }

      const requestData = {
        ApplicationID: applicationID,
        OurBranchID: branchID,
        OperatorID: getOperatorId(),
        Direction: direction,  // Use the direction parameter (0 for view, 1 for next, -1 for previous)
        BankID: getBankId()
      };

      const result = await LGService.getLGAccountApplication(requestData);

      if (result.success && result.data) {
        const bound = bindFormData(result.data);
        if (bound) {
          hasLoadedRecord = true;
          const form = document.getElementById('lg-application-form');
          if (form) setMode(form, 'view');
          else updateViewAddButtonState(form);

          // Enable navigation buttons when record is loaded
          const previousBtn = form?.querySelector('[data-lg-nav="previous"]');
          const nextBtn = form?.querySelector('[data-lg-nav="next"]');
          if (previousBtn) previousBtn.disabled = false;
          if (nextBtn) nextBtn.disabled = false;
          
          // Enable reinstate button only if ExitDate (or similar status field) is not null/undefined
          const reinstateBtn = form?.querySelector('[data-lg-action="reinstate"]');
          if (reinstateBtn) {
            // Check if the record has an exit-like status (you can adjust the field name as needed)
            const exitDate = document.getElementById('ExitDate')?.value;
            reinstateBtn.disabled = !exitDate;
          }

          // Share context for child LG forms opened from this application.
          // sessionStorage is shared across same-origin iframes within the tab.
          try {
            const ourBranchId = String(document.getElementById('BranchID')?.value || '').trim();
            const accountId = String(document.getElementById('AccountID')?.value || '').trim();
            if (ourBranchId && accountId) {
              sessionStorage.setItem('LG_ACCOUNT_CONTEXT', JSON.stringify({
                OurBranchID: ourBranchId,
                AccountID: accountId,
                AccountSeries: 0,
                ModuleID: 1000,
                OperatorID: getOperatorId(),
                Direction: 0
              }));
            }
          } catch {
            // ignore
          }

          // Some environments do not return ProductName in the View response.
          // If it's missing, hydrate it from the product lookup table using ProductID.
          await ensureProductNameHydrated();

          showToast('Application loaded successfully', 'success');
        } else {
          hasLoadedRecord = false;
          const form = document.getElementById('lg-application-form');
          if (form) setMode(form, 'view');
          updateViewAddButtonState(form);
          
          // If navigation returned no records, keep the current record displayed
          if (direction !== 0) {
            showToast('No more records available in this direction', 'info');
          } else {
            showToast('No record found for the provided Branch ID and Application ID', 'warning');
          }
        }
      } else {
        hasLoadedRecord = false;
        const form = document.getElementById('lg-application-form');
        if (form) setMode(form, 'view');
        updateViewAddButtonState(form);
        
        // If navigation returned no records, keep the current record displayed
        if (direction !== 0) {
          showToast('No more records available in this direction', 'info');
        } else {
          showToast(result.message || 'Failed to load application', 'danger');
        }
      }
    } catch (error) {
      console.error('[LGAccountApplication] Error loading application:', error);
      hasLoadedRecord = false;
      const form = document.getElementById('lg-application-form');
      if (form) setMode(form, 'view');
      updateViewAddButtonState(form);
      showToast('An error occurred while loading the application', 'danger');
    }
  }

  async function ensureProductNameHydrated() {
    try {
      const currentName = String(getEl('ProductName')?.value || '').trim();
      const productId = String(getEl('ProductID')?.value || '').trim();
      if (currentName || !productId) return;
      if (!SearchService) return;

      const ourBranchId = String(getEl('BranchID')?.value || '').trim();
      const escapedId = escapeSqlLikeTerm(productId);
      const whereStmt = `ProductID = '${escapedId}'`;

      const result = await SearchService.search({
        TableID: 'ProductID',
        WhereStmt: whereStmt,
        PrevOrNext: '1',
        RefID: '',
        OperatorID: getOperatorId(),
        ModuleID: 1000,
        OurBranchID: ourBranchId
      });

      const rows = (() => {
        const candidates = [result?.data, result?.Details, result].filter(Boolean);
        for (const candidate of candidates) {
          if (Array.isArray(candidate)) return candidate;
          const nested =
            candidate?.Details?.SearchResults ||
            candidate?.Details ||
            candidate?.SearchResults ||
            candidate?.Details?.Details ||
            candidate;
          if (Array.isArray(nested)) return nested;
          if (Array.isArray(nested?.SearchResults)) return nested.SearchResults;
          if (Array.isArray(nested?.Details)) return nested.Details;
        }
        return [];
      })();
      const exact = rows.find((r) => String(r?.ProductID || '').trim() === productId) || rows[0];
      const name = exact?.ProductName || exact?.ProductDescription || exact?.Description || '';
      if (String(name || '').trim()) {
        setFieldValue('ProductName', name);
      }
    } catch (error) {
      console.warn('[LGAccountApplication] Failed to hydrate ProductName:', error);
    }
  }

  function bindFormData(data) {
    // Get the main application data from Details01 array
    // Some backends return Details1 instead of Details01, or use different casing.
    const pickDetailsDataset = (payload) => {
      if (!payload || typeof payload !== 'object') return null;

      const direct = payload.Details01 || payload.Details1 || payload.details01 || payload.details1;
      if (Array.isArray(direct)) return direct;

      const key = Object.keys(payload).find((k) => /^details0?1$/i.test(k));
      const val = key ? payload[key] : null;
      return Array.isArray(val) ? val : null;
    };

    const dataset = pickDetailsDataset(data);
    const appData = dataset?.[0];
    
    if (!appData) {
      return false;
    }

    // Map from whatever the backend actually returns.
    // Many OldAPI payloads vary by column aliases (e.g., ReferenceNo vs ReferenceNumber).
    const firstNonEmpty = (...values) => {
      for (const v of values) {
        if (v === null || v === undefined) continue;
        if (typeof v === 'string') {
          const s = v.trim();
          if (s !== '') return s;
          continue;
        }
        return v;
      }
      return '';
    };

    const normalizeKey = (k) =>
      String(k || '')
        .trim()
        .toLowerCase()
        .replace(/[\s_\-]/g, '');

    const normalizedKeyIndex = (() => {
      const idx = Object.create(null);
      for (const realKey of Object.keys(appData || {})) {
        const nk = normalizeKey(realKey);
        if (nk && !idx[nk]) idx[nk] = realKey;
      }
      return idx;
    })();

    const pick = (obj, keys) => {
      if (!obj) return '';
      for (const k of keys) {
        if (!k) continue;

        // Exact match first
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          const chosen = firstNonEmpty(obj[k]);
          if (chosen !== '') return chosen;
          continue;
        }

        // Then normalized match (e.g., ProductName vs 'Product Name' / 'Product_Name')
        const realKey = normalizedKeyIndex[normalizeKey(k)];
        if (realKey && Object.prototype.hasOwnProperty.call(obj, realKey)) {
          const chosen = firstNonEmpty(obj[realKey]);
          if (chosen !== '') return chosen;
        }
      }
      return '';
    };

    const mapSpec = {
      BranchID: ['OurBranchID', 'BranchID'],
      BranchName: ['BranchName', 'OurBranchName'],
      ApplicationID: ['ApplicationID', 'LGApplicationID'],
      ApplicationDate: ['ApplicationDate', 'ApplnDate'],
      ClientID: ['ClientID', 'CustomerID'],
      ClientName: ['ClientName', 'CustomerName', 'FullName', 'Name'],
      AccountID: ['AccountID', 'LGAccountID'],
      AccountDescription: ['AccountName', 'AccountDescription', 'Description'],
      ProductID: ['ProductID'],
      ProductName: [
        'ProductName',
        'Product Name',
        'Product_Name',
        'ProdName',
        'ProductDesc',
        'ProductDescription',
        'Description'
      ],
      ReferenceNo: ['ReferenceNumber', 'ReferenceNo', 'Reference'],
      LimitAmount: ['LimitAmount', 'LimitAmt', 'Limit'],
      LocalAmount: ['LocalAmount', 'LocalAmt'],
      ExchangeRate: ['ExchangeRate', 'ExRate', 'Rate'],
      ExpiryDate: ['ExpiryDate', 'ExpirationDate', 'ExpiryOn'],
      Remarks: ['Remarks', 'Remark'],
      // Prefer a human-readable status name if present; otherwise fall back to ID/code.
      ApplicationStatus: ['LGApplnStatusName', 'LGApplnStatus', 'ApplicationStatus', 'LGApplnStatusID', 'Status', 'StatusName'],
      PurposeID: ['PurposeID', 'PurposeCode', 'Purpose'],
      RejectedBy: ['RejectedBy'],
      RejectedOn: ['RejectedOn'],
      RejectionReason: ['RejectedReason', 'RejectionReason'],
      CreatedBy: ['CreatedBy'],
      CreatedOn: ['CreatedOn', 'CreatedDate'],
      ModifiedBy: ['ModifiedBy'],
      ModifiedOn: ['ModifiedOn', 'ModifiedDate'],
      SupervisedBy: ['SupervisedBy', 'ApprovedBy', 'VerifiedBy'],
      SupervisedOn: ['SupervisedOn', 'ApprovedOn', 'VerifiedOn']
    };

    const dateOnlyFields = new Set(['ApplicationDate', 'ExpiryDate']);
    const dateTimeFields = new Set(['RejectedOn', 'CreatedOn', 'ModifiedOn', 'SupervisedOn']);

    Object.keys(mapSpec).forEach((fieldId) => {
      // As a last resort, try mapping by the form field ID directly.
      const raw = firstNonEmpty(
        pick(appData, mapSpec[fieldId]),
        appData?.[fieldId]
      );

      let value = raw;
      if (dateOnlyFields.has(fieldId)) value = formatDate(raw);
      if (dateTimeFields.has(fieldId)) value = formatDateTime(raw);

      setFieldValue(fieldId, value);
    });

    // Capture UpdateCount from viewed record for use in edits
    const updateCountVal = firstNonEmpty(
      pick(appData, ['UpdateCount', 'Update_Count']),
      appData?.UpdateCount,
      appData?.updatecount
    );
    if (updateCountVal !== undefined && updateCountVal !== null && String(updateCountVal).trim() !== '') {
      viewedUpdateCount = String(updateCountVal).trim();
    } else {
      viewedUpdateCount = null;
    }

    console.log('[LGAccountApplication] View response payload:', data);
    console.log('[LGAccountApplication] Bound row keys:', Object.keys(appData || {}));

    console.log('[LGAccountApplication] Form data bound successfully');
    return true;
  }

  function validateLgAccountApplicationForm(mode) {
    // mode: 'add' or 'edit'
    const requiredFields = [
      { id: 'BranchID', label: 'Branch ID' },
      { id: 'ClientID', label: 'Client ID' },
      { id: 'ProductID', label: 'Product ID' },
      { id: 'PurposeID', label: 'Purpose ID' },
      { id: 'AccountID', label: 'Account ID' },
      { id: 'LimitAmount', label: 'Limit Amount' },
      { id: 'ExchangeRate', label: 'Exchange Rate' },
      { id: 'LocalAmount', label: 'Local Amount' },
      { id: 'ExpiryDate', label: 'Expiry Date' },
      { id: 'ApplicationDate', label: 'Application Date' }
    ];
    if (mode === 'edit') {
      requiredFields.push({ id: 'ApplicationID', label: 'Application ID' });
    }

    // Required presence check
    for (const field of requiredFields) {
      const el = document.getElementById(field.id);
      const value = (el?.value ?? '').trim();
      if (!value) {
        showToast(`Please enter ${field.label}`, 'warning');
        try { el?.focus?.(); } catch {}
        return false;
      }
    }

    // Numeric fields must be valid numbers
    const numericFields = [
      { id: 'LimitAmount', label: 'Limit Amount', minInclusive: 0 },
      { id: 'ExchangeRate', label: 'Exchange Rate', minInclusive: 0 },
      { id: 'LocalAmount', label: 'Local Amount', minInclusive: 0 }
    ];
    for (const nf of numericFields) {
      const el = document.getElementById(nf.id);
      const raw = (el?.value ?? '').trim();
      const num = raw === '' ? NaN : Number(raw);
      if (!isFinite(num)) {
        showToast(`Enter a numeric value for ${nf.label}`, 'warning');
        try { el?.focus?.(); } catch {}
        return false;
      }
      // Check minimum constraint
      if (num < nf.minInclusive) {
        showToast(`${nf.label} cannot be less than ${nf.minInclusive}`, 'warning');
        try { el?.focus?.(); } catch {}
        return false;
      }
    }

    // Dates must parse as valid Date
    const dateFields = [
      { id: 'ExpiryDate', label: 'Expiry Date' },
      { id: 'ApplicationDate', label: 'Application Date' }
    ];
    for (const df of dateFields) {
      const el = document.getElementById(df.id);
      const raw = (el?.value ?? '').trim();
      const d = new Date(raw);
      if (String(d) === 'Invalid Date') {
        showToast(`Enter a valid ${df.label}`, 'warning');
        try { el?.focus?.(); } catch {}
        return false;
      }
    }

    // Application Date cannot be greater than system working date
    const appDateEl = document.getElementById('ApplicationDate');
    const appDateRaw = (appDateEl?.value ?? '').trim();
    const appDate = new Date(appDateRaw);
    const systemWorkingDate = getSystemWorkingDate();
    if (appDate > systemWorkingDate) {
      showToast('Application Date cannot be greater than today', 'warning');
      try { appDateEl?.focus?.(); } catch {}
      return false;
    }

    // ExpiryDate must be strictly greater than ApplicationDate
    const expiryEl = document.getElementById('ExpiryDate');
    const expiryRaw = (expiryEl?.value ?? '').trim();
    const expiryDate = new Date(expiryRaw);
    if (expiryDate <= appDate) {
      showToast('Expiry Date must be greater than Application Date', 'warning');
      try { expiryEl?.focus?.(); } catch {}
      return false;
    }

    return true;
  }

  function getSystemWorkingDate() {
    // Try to get from Environment; otherwise use today
    const env = global.Environment || {};
    const workingDateStr = env.workingDate || env.WorkingDate || env.systemDate || env.SystemDate;
    if (workingDateStr) {
      const d = new Date(workingDateStr);
      if (String(d) !== 'Invalid Date') return d;
    }
    return new Date();
  }

  function calculateLocalAmount() {
    const limitAmountEl = document.getElementById('LimitAmount');
    const exchangeRateEl = document.getElementById('ExchangeRate');
    const localAmountEl = document.getElementById('LocalAmount');

    if (!limitAmountEl || !exchangeRateEl || !localAmountEl) return;

    const limitAmount = Number(limitAmountEl.value || '0');
    const exchangeRate = Number(exchangeRateEl.value || '0');

    if (!isFinite(limitAmount) || !isFinite(exchangeRate)) {
      localAmountEl.value = '';
      return;
    }

    const localAmount = limitAmount * exchangeRate;
    localAmountEl.value = localAmount > 0 ? localAmount.toFixed(2) : '';
  }

  function wireLocalAmountAutoCalc() {
    const limitAmountEl = document.getElementById('LimitAmount');
    const exchangeRateEl = document.getElementById('ExchangeRate');

    if (limitAmountEl) {
      limitAmountEl.addEventListener('input', calculateLocalAmount);
      limitAmountEl.addEventListener('change', calculateLocalAmount);
    }

    if (exchangeRateEl) {
      exchangeRateEl.addEventListener('input', calculateLocalAmount);
      exchangeRateEl.addEventListener('change', calculateLocalAmount);
    }
  }

  // Build the OldAPI request payload for Add/Edit LG Account Application
  function buildSaveRequestDataFromForm(isAdd) {
    const getVal = (id) => String(document.getElementById(id)?.value || '').trim();
    const getValOrNull = (id) => {
      const val = getVal(id);
      return val === '' ? null : val;
    };

    const todayStr = formatDate(new Date());
    const currentOperator = getOperatorId();

    const data = {
      OurBranchID: getValOrNull('BranchID'),
      ApplicationID: (getValOrNull('ApplicationID')||''),

      ClientID: getValOrNull('ClientID'),
      ProductID: getValOrNull('ProductID'),
      AccountID: getValOrNull('AccountID'),
      PurposeID: getValOrNull('PurposeID'),
      LimitAmount: getValOrNull('LimitAmount'),
      LocalAmount: getValOrNull('LocalAmount'),
      ExchangeRate: getValOrNull('ExchangeRate'),
      ExpiryDate: getValOrNull('ExpiryDate'),
      ApplicationDate: getValOrNull('ApplicationDate'),
      ReferenceNumber: getValOrNull('ReferenceNo'),
      Remarks: getValOrNull('Remarks'),

      UpdateCount: isAdd ? 1 : (viewedUpdateCount || 1),
      CreatedBy: isAdd ? currentOperator : (getValOrNull('CreatedBy') || currentOperator),
      CreatedOn: isAdd ? todayStr : (getValOrNull('CreatedOn') || todayStr),
      ModifiedBy: isAdd ? '' : currentOperator,
      ModifiedOn: isAdd ? '' : todayStr,
      SupervisedBy: '',
      SupervisedOn: '',
      RejectedBy: '',
      RejectedOn: '',
      RejectedReason: ''
    };

    return data;
  }

  // Attempt to extract a new ApplicationID from save response
  function extractNewApplicationIdFromSave(result) {
    const data = result?.data;
    if (!data || typeof data !== 'object') return '';

    const tryPickId = (row) => {
      if (!row || typeof row !== 'object') return '';
      return (
        String(row.ApplicationID || row.LGApplicationID || row.ApplicationId || '')
      ).trim();
    };

    // Common shapes: Details01, Details1, Details, SearchResults
    const arrays = [];
    if (Array.isArray(data)) arrays.push(data);
    for (const k of Object.keys(data)) {
      const v = data[k];
      if (Array.isArray(v)) arrays.push(v);
      else if (v && typeof v === 'object') {
        if (Array.isArray(v.Details01)) arrays.push(v.Details01);
        if (Array.isArray(v.Details1)) arrays.push(v.Details1);
        if (Array.isArray(v.Details)) arrays.push(v.Details);
        if (Array.isArray(v.SearchResults)) arrays.push(v.SearchResults);
      }
    }

    for (const arr of arrays) {
      const id = tryPickId(arr?.[0]);
      if (id) return id;
    }

    return '';
  }

  async function handleSaveApplication() {
    console.log('[LGAccountApplication] handleSaveApplication invoked');
    const form = document.getElementById('lg-application-form');
    const mode = String(form?.dataset?.mode || 'view').toLowerCase();

    if (mode !== 'add' && mode !== 'edit') {
      showToast('Switch to Add or Edit before saving', 'warning');
      return;
    }

    // Validate required fields
    if (!validateLgAccountApplicationForm(mode)) {
      return;
    }

    try {
      if (!dependenciesReady || !LGService) {
        showToast('Loading services, please wait...', 'info');
        await ensureDependenciesLoaded();
      }

      const saveBtn = form?.querySelector?.('[data-lg-action="save"]');
      if (saveBtn) saveBtn.disabled = true;

      const isAdd = mode === 'add' || !String(document.getElementById('ApplicationID')?.value || '').trim();
      const requestData = buildSaveRequestDataFromForm(isAdd);

      const result = await LGService.addEditLGAccountApplication(requestData);

      if (!result?.success) {
        showToast(result?.message || 'Save failed', 'danger');
        if (saveBtn) saveBtn.disabled = false;
        return;
      }

      // On Add: set new ApplicationID from Details[0].ApplicationID
      if (isAdd) {
        const newId = extractNewApplicationIdFromSave(result);
        if (newId) setFieldValue('ApplicationID', newId);
      }

      showToast('Application Save Successfully', 'success');
      hasLoadedRecord = true;
      if (form) {
        setMode(form, 'view');
        // Disable Save, Add, Edit, View action buttons
        const saveBtn = form.querySelector('[data-lg-action="save"]');
        const addBtn = form.querySelector('[data-lg-mode="add"]');
        const editBtn = form.querySelector('[data-lg-mode="edit"]');
        const viewBtn = form.querySelector('[data-lg-mode="view"]');
        
        if (saveBtn) saveBtn.disabled = true;
        if (addBtn) addBtn.disabled = true;
        if (editBtn) editBtn.disabled = true;
        if (viewBtn) viewBtn.disabled = false; // Keep view button enabled
        
        // Disable all input controls
        form.querySelectorAll('input, select, textarea').forEach((el) => {
          el.disabled = true;
        });
      }
      await handleViewApplication();
    } catch (error) {
      console.error('[LGAccountApplication] Error saving application:', error);
      showToast('An error occurred while saving the application', 'danger');
      const form = document.getElementById('lg-application-form');
      const saveBtn = form?.querySelector?.('[data-lg-action="save"]');
      if (saveBtn) saveBtn.disabled = false;
    }
    // End of save handler
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }

  function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  }

})(window);

// Preserve parent-modal opener behavior (used elsewhere in the module)
;(function () {
  'use strict';

  const openParentModal = (modalId, fallbackUrl) => {
    if (!modalId) return false;

    try {
      const parentWin = window.parent;
      const parentBootstrap = parentWin?.bootstrap;
      const modalEl = parentWin?.document?.getElementById(modalId);
      if (parentBootstrap?.Modal && modalEl) {
        parentBootstrap.Modal.getOrCreateInstance(modalEl, {
          backdrop: false,
          focus: false,
          keyboard: true
        }).show();
        return true;
      }
    } catch {
      // Ignore cross-frame errors.
    }

    if (fallbackUrl) {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      return true;
    }

    return false;
  };

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      const modalOpener = target?.closest?.('[data-open-parent-modal]');
      if (!modalOpener) return;

      event.preventDefault();
      event.stopPropagation();

      const modalId = modalOpener.getAttribute('data-open-parent-modal');
      const fallbackUrl = modalId === 'lgDocumentsModal'
        ? 'lg-documents.html'
        : modalId === 'lgGuarantorsModal'
          ? 'lg-guarantors.html'
          : modalId === 'lgNotesModal'
            ? 'lg-notes.html'
            : undefined;
      openParentModal(modalId, fallbackUrl);
    },

    true
  );
})();
