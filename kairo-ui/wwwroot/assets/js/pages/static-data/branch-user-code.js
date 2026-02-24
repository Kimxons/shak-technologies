/**
 * Branch User Code - Static Data Module
 * Allows searching, viewing, and editing Branch User Codes (System Sub Codes)
 * Uses p_GetBranchUserCode / p_AddEditBranchUserCodes API pattern
 */
(function() {
  'use strict';

  console.log('[BranchUserCode] Script starting...');

  // Prevent double initialization
  if (window.__kairoBranchUserCodeLoaded) {
    console.log('[BranchUserCode] Already loaded, skipping');
    return;
  }
  window.__kairoBranchUserCodeLoaded = true;

  const APP_NAME = 'PROJECT_KAIRO';

  // ==================== DEPENDENCIES - Will be set after load ====================
  let CoreApi = null;
  let Environment = {};
  let API_ENDPOINT = '/api/OldAPI';

  // Function to get CoreApi - tries multiple sources
  function getCoreApi() {
    return window.CoreApi || window.parent?.CoreApi || null;
  }

  function getEnvironment() {
    return window.Environment || window.parent?.Environment || {};
  }

  function ensureDependencies() {
    CoreApi = getCoreApi();
    Environment = getEnvironment();
    
    const BASE_URL = (
      Environment.baseUrl ||
      Environment.baseUrlCommon ||
      Environment.baseUrlSystemCodes ||
      ''
    ).replace(/\/+$/, '');
    API_ENDPOINT = BASE_URL ? `${BASE_URL}/api/OldAPI` : '/api/OldAPI';
    
    console.log('[BranchUserCode] Dependencies check - CoreApi:', !!CoreApi, 'API_ENDPOINT:', API_ENDPOINT);
    return !!CoreApi;
  }

  // ==================== MODES ====================
  const MODES = {
    VIEW: 'view',
    ADD: 'add',
    EDIT: 'edit'
  };

  // ==================== STATE ====================
  const state = {
    currentMode: MODES.VIEW,
    gridAction: null,  // null, 'new', or 'alter'
    selectedCodeId: null,
    lastLoadedRecord: null,
    subCodes: [], // Array of sub-codes for the selected CodeID
    recordNotFound: false // True if code type searched but no sub-codes exist
  };

  // Code types will be loaded from database (t_SystemCodeDetail where ID = 'BranchUserCodeID')
  let loadedCodeTypes = [];

  // ==================== UTILITY FUNCTIONS ====================
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => root.querySelectorAll(sel);

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
      branchId: session.OurBranchID || session.ourBranchID || window.__USER__?.OurBranchID || '0101',
      operatorId: session.OperatorID || session.operatorID || window.__USER__?.OperatorID || 'SYSTEM'
    };
  }

  function formatSqlDateTime(d = new Date()) {
    const pad2 = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const hh = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if ('value' in el) {
      el.value = value ?? '';
    } else {
      el.textContent = value ?? '';
    }
  }

  function getValue(id) {
    const el = document.getElementById(id);
    return el?.value ?? '';
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

  // ==================== GRID BUTTON STATE ====================
  function updateGridButtons() {
    const isEditMode = state.currentMode === MODES.EDIT;
    const isAddMode = state.currentMode === MODES.ADD;
    const currentAction = state.gridAction;
    const hasCodeSelected = !!state.selectedCodeId;
    const hasRowSelected = !!state.lastLoadedRecord;

    // Get all grid buttons
    const newBtn = qs('[data-bruc-grid-action="new"]');
    const alterBtn = qs('[data-bruc-grid-action="alter"]');
    const removeBtn = qs('[data-bruc-grid-action="remove"]');
    const updateBtn = qs('[data-bruc-grid-action="update"]');
    const clearBtn = qs('[data-bruc-grid-action="clear"]');

    // Get SubCode and Description fields
    const subCodeField = qs('#SubCode');
    const descriptionField = qs('#Description');

    // SubCode/Description fields should be editable when:
    // 1. In ADD mode (adding new sub-codes to a new code type)
    // 2. In EDIT mode with New or Alter action active
    const fieldsEditable = (isAddMode && hasCodeSelected) || 
                           (isEditMode && hasCodeSelected && (currentAction === 'new' || currentAction === 'alter'));
    if (subCodeField) subCodeField.disabled = !fieldsEditable;
    if (descriptionField) descriptionField.disabled = !fieldsEditable;

    if (isAddMode) {
      // ADD mode - New/Alter/Remove disabled, Update/Clear active for adding new sub-codes
      setButtonDisabled(newBtn, true);
      setButtonDisabled(alterBtn, true);
      setButtonDisabled(removeBtn, true);
      setButtonDisabled(updateBtn, false);
      setButtonDisabled(clearBtn, false);
    } else if (!isEditMode || !hasCodeSelected) {
      // View mode or no code selected - disable all grid buttons
      setButtonDisabled(newBtn, true);
      setButtonDisabled(alterBtn, true);
      setButtonDisabled(removeBtn, true);
      setButtonDisabled(updateBtn, true);
      setButtonDisabled(clearBtn, true);
    } else if (currentAction === 'new' || currentAction === 'alter') {
      // Edit mode with New/Alter action - only Update and Clear are active
      setButtonDisabled(newBtn, true);
      setButtonDisabled(alterBtn, true);
      setButtonDisabled(removeBtn, true);
      setButtonDisabled(updateBtn, false);
      setButtonDisabled(clearBtn, false);
    } else {
      // Edit mode without action - New is always active, Alter/Remove need row selection
      setButtonDisabled(newBtn, false);
      setButtonDisabled(alterBtn, !hasRowSelected);
      setButtonDisabled(removeBtn, !hasRowSelected);
      setButtonDisabled(updateBtn, true);
      setButtonDisabled(clearBtn, true);
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

  // ==================== VALIDATION SUMMARY BANNER ====================
  function showSuccessMessage(message) {
    const banner = document.querySelector('.validation-summary');
    if (!banner) return;
    
    const textEl = banner.querySelector('.validation-summary__text');
    if (textEl) textEl.textContent = message;
    
    // Show the banner
    banner.style.display = 'flex';
    banner.style.alignItems = 'center';
    banner.classList.add('is-visible', 'validation-summary--success');
    
    // Setup close button
    const closeBtn = banner.querySelector('.validation-summary__close');
    if (closeBtn) {
      closeBtn.onclick = () => hideValidationSummary();
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => hideValidationSummary(), 5000);
  }
  
  function hideValidationSummary() {
    const banner = document.querySelector('.validation-summary');
    if (banner) {
      banner.style.display = 'none';
      banner.classList.remove('is-visible', 'validation-summary--success');
    }
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

  // ==================== NORMALIZE SEARCH RESULTS ====================
  function normalizeResults(response) {
    if (!response) return [];
    
    console.log('[BranchUserCode] FULL response object:', JSON.stringify(response, null, 2));
    
    // For p_GetBranchUserCode, sub-codes are in Details01
    let results = [];
    
    if (response?.data?.Details01 && Array.isArray(response.data.Details01)) {
      results = response.data.Details01;
      console.log('[BranchUserCode] Found sub-codes in data.Details01:', results.length);
    } else if (response?.Details01 && Array.isArray(response.Details01)) {
      results = response.Details01;
      console.log('[BranchUserCode] Found sub-codes in Details01:', results.length);
    }
    
    // Filter to only include records that have SubCodeID
    results = results.filter(r => {
      const hasSubCodeId = !!(r.SubCodeID || r.subCodeID || r.SubCode);
      return hasSubCodeId;
    });
    
    console.log('[BranchUserCode] Normalized sub-codes:', results.length, results);
    
    return results;
  }

  // ==================== CODE SEARCH MODAL ====================
  let codeSearchModal = null;
  let codeSearchState = {
    allResults: [],
    currentPage: 0,
    pageSize: 10
  };

  function createCodeSearchModal() {
    if (qs('#codeSearchModal')) return;

    const modalHtml = `
      <div class="modal fade" id="codeSearchModal" tabindex="-1" aria-labelledby="codeSearchModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header" style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%);">
              <h5 class="modal-title text-white" id="codeSearchModalLabel">Branch System Sub Code</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <form id="codeSearchForm">
                <div class="row g-3 align-items-end">
                  <div class="col-md-6">
                    <div class="d-flex align-items-center gap-2">
                      <label class="form-label mb-0" style="min-width: 100px;">Code Type</label>
                      <select id="codeSearchIdMode" class="form-select form-select-sm" style="width: 90px;">
                        <option value="Like">Like</option>
                        <option value="Exact">Exact</option>
                      </select>
                      <input type="text" id="codeSearchId" class="form-control form-control-sm">
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="d-flex align-items-center gap-2">
                      <label class="form-label mb-0" style="min-width: 100px;">Description</label>
                      <select id="codeSearchDescMode" class="form-select form-select-sm" style="width: 90px;">
                        <option value="Like">Like</option>
                        <option value="Exact">Exact</option>
                      </select>
                      <input type="text" id="codeSearchDesc" class="form-control form-control-sm">
                    </div>
                  </div>
                </div>
                <div class="text-center mt-3">
                  <button type="submit" id="codeSearchSubmit" class="btn btn-secondary px-4">Search</button>
                </div>
              </form>
            </div>
            <div class="modal-results px-3">
              <div class="mb-2" style="background: #e8f4fc; padding: 6px 12px; border-left: 3px solid #1e7cc4;">
                <strong>Search Results</strong>
              </div>
              <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
                <table class="table table-sm table-hover align-middle mb-0">
                  <thead style="background: #1e7cc4; color: white; position: sticky; top: 0;">
                    <tr>
                      <th style="width: 40px; color: white;">#</th>
                      <th style="color: white;">Code ID</th>
                      <th style="color: white;">Description</th>
                    </tr>
                  </thead>
                  <tbody id="codeSearchResults"></tbody>
                </table>
              </div>
              <div id="codeSearchEmpty" class="text-center py-4 text-muted">
                Enter search criteria and click Search.
              </div>
              <div id="codeSearchLoading" class="d-none text-center py-4">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    wireCodeSearchModalEvents();
  }

  function wireCodeSearchModalEvents() {
    const form = qs('#codeSearchForm');
    if (form) {
      form.addEventListener('submit', handleCodeSearch);
    }

    const tbody = qs('#codeSearchResults');
    if (tbody) {
      tbody.addEventListener('click', handleCodeResultClick);
    }
  }

  function openCodeSearchModal() {
    console.log('[BranchUserCode] openCodeSearchModal called');
    createCodeSearchModal();

    const el = qs('#codeSearchModal');
    console.log('[BranchUserCode] Modal element found:', !!el);
    if (!el) return;

    // Reset form
    qs('#codeSearchForm')?.reset();
    qs('#codeSearchResults').innerHTML = '';
    qs('#codeSearchEmpty').classList.remove('d-none');
    qs('#codeSearchEmpty').textContent = 'Loading all code types...';

    // Check for Bootstrap on current window or parent window (for iframe contexts)
    const Bootstrap = window.bootstrap || window.parent?.bootstrap;
    
    if (!Bootstrap) {
      console.error('[BranchUserCode] Bootstrap not found!');
      return;
    }

    if (!codeSearchModal) {
      console.log('[BranchUserCode] Creating new Bootstrap Modal');
      codeSearchModal = new Bootstrap.Modal(el);
    }
    console.log('[BranchUserCode] Showing modal');
    codeSearchModal.show();

    // Auto-search on open to load all codes
    setTimeout(() => {
      handleCodeSearch();
      qs('#codeSearchId')?.focus();
    }, 300);
  }

  // Fetch code types from database (t_SystemCodeDetail where ID = 'BranchUserCodeID')
  async function fetchCodeTypesFromDB() {
    try {
      // Ensure dependencies are available
      if (!ensureDependencies()) {
        console.error('[BranchUserCode] Cannot fetch - CoreApi not available');
        showErrorToast('API not available. Please refresh the page.');
        return [];
      }
      
      console.log('[BranchUserCode] Fetching code types from database...');
      console.log('[BranchUserCode] Using API endpoint:', API_ENDPOINT);
      
      const ctx = getContext();
      
      // Use p_v1_GetSystemCodes to get code types where CodeID = 'BranchUserCodeID'
      const requestData = {
        CodeID: 'BranchUserCodeID'
      };
      
      const envelope = CoreApi.makeRequestEnvelope('dbo.p_v1_GetSystemCodes', requestData);
      console.log('[BranchUserCode] Code types request:', requestData);
      console.log('[BranchUserCode] Full envelope:', envelope);
      
      const resp = await CoreApi.post(API_ENDPOINT, envelope);
      console.log('[BranchUserCode] Code types response:', resp);
      
      // Extract the code types from the response
      let codeTypes = [];
      
      if (resp?.data?.Details01 && Array.isArray(resp.data.Details01)) {
        codeTypes = resp.data.Details01;
      } else if (resp?.Details01 && Array.isArray(resp.Details01)) {
        codeTypes = resp.Details01;
      } else if (resp?.data?.Details && Array.isArray(resp.data.Details)) {
        codeTypes = resp.data.Details;
      } else if (resp?.Details && Array.isArray(resp.Details)) {
        codeTypes = resp.Details;
      }
      
      // Debug: log the raw code types to see field names
      if (codeTypes.length > 0) {
        console.log('[BranchUserCode] Raw code type fields:', Object.keys(codeTypes[0]));
        console.log('[BranchUserCode] First raw code type:', JSON.stringify(codeTypes[0], null, 2));
      }
      
      // Map to standard format { ID, Description }
      // From DB: SubCodeID/ID -> ID, IDDescription/SubCodeDescription/Description -> Description
      loadedCodeTypes = codeTypes.map(ct => ({
        ID: ct.SubCodeID || ct.subCodeID || ct.SubCode || ct.Code || ct.ID || '',
        Description: ct.IDDescription || ct.idDescription || ct.SubCodeDescription || ct.subCodeDescription || ct.Description || ct.SubCodeName || ct.Name || ''
      })).filter(ct => ct.ID); // Filter out empty IDs
      
      console.log('[BranchUserCode] Loaded code types:', loadedCodeTypes);
      
      return loadedCodeTypes;
    } catch (err) {
      console.error('[BranchUserCode] Failed to fetch code types:', err);
      return [];
    }
  }

  async function handleCodeSearch(e) {
    if (e) e.preventDefault();

    const searchId = (qs('#codeSearchId')?.value || '').trim();
    const searchIdMode = qs('#codeSearchIdMode')?.value || 'Like';
    const description = (qs('#codeSearchDesc')?.value || '').trim();
    const descriptionMode = qs('#codeSearchDescMode')?.value || 'Like';

    const tbody = qs('#codeSearchResults');
    const emptyMsg = qs('#codeSearchEmpty');
    const loader = qs('#codeSearchLoading');

    if (tbody) tbody.innerHTML = '';
    if (emptyMsg) emptyMsg.classList.add('d-none');
    if (loader) loader.classList.remove('d-none');

    try {
      // Fetch code types from database if not already loaded
      if (loadedCodeTypes.length === 0) {
        await fetchCodeTypesFromDB();
      }
      
      let codes = [];

      if (!searchId && !description) {
        console.log('[BranchUserCode] No search term - showing all code types');
        codes = [...loadedCodeTypes];
      } else {
        codes = loadedCodeTypes.filter(code => {
          let matches = true;

          if (searchId) {
            const codeId = (code.ID || '').toLowerCase();
            const searchVal = searchId.toLowerCase();
            if (searchIdMode === 'Exact') {
              matches = matches && (codeId === searchVal);
            } else {
              matches = matches && codeId.includes(searchVal);
            }
          }

          if (description && matches) {
            const codeDesc = (code.Description || '').toLowerCase();
            const searchVal = description.toLowerCase();
            if (descriptionMode === 'Exact') {
              matches = matches && (codeDesc === searchVal);
            } else {
              matches = matches && codeDesc.includes(searchVal);
            }
          }

          return matches;
        });
      }

      console.log('[BranchUserCode] Filtered code types:', codes.length);

      codeSearchState.allResults = codes;
      codeSearchState.currentPage = 0;

      renderCodeSearchResults();

      if (codes.length > 0) {
        showSuccessToast(`Found ${codes.length} code type(s)`);
      } else {
        if (emptyMsg) {
          emptyMsg.textContent = 'No code types found matching your criteria.';
          emptyMsg.classList.remove('d-none');
        }
      }

    } catch (err) {
      console.error('[BranchUserCode] Search failed:', err);
      if (emptyMsg) {
        emptyMsg.textContent = 'Failed to search code types. Please try again.';
        emptyMsg.classList.remove('d-none');
      }
      showErrorToast(err?.message || 'Failed to search code types');
    } finally {
      if (loader) loader.classList.add('d-none');
    }
  }

  function renderCodeSearchResults() {
    const tbody = qs('#codeSearchResults');
    const emptyMsg = qs('#codeSearchEmpty');

    if (!tbody) return;

    const results = codeSearchState.allResults;

    if (results.length === 0) {
      tbody.innerHTML = '';
      if (emptyMsg) {
        emptyMsg.textContent = 'No code types found.';
        emptyMsg.classList.remove('d-none');
      }
      return;
    }

    if (emptyMsg) emptyMsg.classList.add('d-none');

    console.log('[BranchUserCode] Rendering code types:', results.length);

    tbody.innerHTML = results.map((code, idx) => {
      const bgColor = idx % 2 === 0 ? '#ffffff' : '#e8f4fc';
      return `
        <tr data-code-id="${code.ID}" data-description="${code.Description}" style="cursor: pointer; background: ${bgColor};">
          <td>${idx + 1}</td>
          <td>${code.ID}</td>
          <td>${code.Description}</td>
        </tr>
      `;
    }).join('');
  }

  function handleCodeResultClick(e) {
    const row = e.target.closest('tr');
    if (!row) return;

    const codeId = row.dataset.codeId || '';
    const description = row.dataset.description || '';

    console.log('[BranchUserCode] Selected code - ID:', codeId, 'Description:', description);

    setValue('CodeID', codeId);
    setValue('CodeName', description);
    
    // Also try direct assignment as fallback
    const codeNameEl = document.getElementById('CodeName');
    if (codeNameEl) {
      codeNameEl.value = description;
      console.log('[BranchUserCode] CodeName element found, set value to:', description);
    } else {
      console.log('[BranchUserCode] CodeName element NOT found!');
    }

    state.selectedCodeId = codeId;

    if (codeSearchModal) {
      codeSearchModal.hide();
    }

    showInfoToast(`Selected: ${codeId} - ${description}`);

    loadCodeDetails(codeId);
  }

  // ==================== LOAD CODE DETAILS ====================
  async function loadCodeDetails(codeId, { quiet = false } = {}) {
    if (!codeId) {
      renderSubCodesTable([]);
      clearBehindTheScene();
      return;
    }

    // Ensure dependencies are available
    if (!ensureDependencies()) {
      console.error('[BranchUserCode] Cannot load details - CoreApi not available');
      showErrorToast('API not available. Please refresh the page.');
      return;
    }

    try {
      console.log('[BranchUserCode] Loading details for:', codeId);

      const ctx = getContext();

      // Use p_GetBranchUserCode - NO BankID parameter
      const requestData = {
        OurBranchID: ctx.branchId,
        ID: codeId,
        OperatorID: ctx.operatorId
      };
      const envelope = CoreApi.makeRequestEnvelope('dbo.p_GetBranchUserCode', requestData);

      console.log('[BranchUserCode] Detail request:', requestData);

      const resp = await CoreApi.post(API_ENDPOINT, envelope);
      const subCodes = normalizeResults(resp);

      console.log('[BranchUserCode] Detail response:', subCodes);

      state.subCodes = subCodes;
      state.selectedCodeId = codeId;
      state.gridAction = null;
      state.recordNotFound = subCodes.length === 0;

      renderSubCodesTable(subCodes);
      
      const countEl = qs('#subCodeCount');
      if (countEl) countEl.textContent = subCodes.length;
      
      // Also populate CodeName from IDDescription if available in the response
      if (subCodes.length > 0 && subCodes[0].IDDescription) {
        const codeName = subCodes[0].IDDescription;
        setValue('CodeName', codeName);
        console.log('[BranchUserCode] Set CodeName from detail response:', codeName);
      }
      
      setValue('SubCode', '');
      setValue('Description', '');
      
      if (subCodes.length > 0) {
        const firstRecord = subCodes[0];
        populateBehindTheScene(firstRecord);
      } else {
        clearBehindTheScene();
      }
      
      state.lastLoadedRecord = null;
      
      updateActionButtons();
      updateGridButtons();

      if (!quiet) {
        if (subCodes.length > 0) {
          showSuccessMessage(`Loaded ${subCodes.length} sub-code(s) for ${codeId}`);
        } else {
          showInfoToast(`No sub-codes found for ${codeId}. Click Add to create.`);
        }
      }

    } catch (err) {
      console.error('[BranchUserCode] Failed to load details:', err);
      if (!quiet) {
        showErrorToast('Failed to load code details');
      }
      renderSubCodesTable([]);
    }
  }

  function renderSubCodesTable(subCodes) {
    const tbody = qs('#subCodesTable tbody');
    const countEl = qs('#subCodeCount');
    
    if (!tbody) return;

    if (countEl) countEl.textContent = subCodes?.length || 0;

    if (!subCodes || subCodes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted py-4">No sub-codes found.</td></tr>';
      return;
    }

    console.log('[BranchUserCode] First sub-code record fields:', Object.keys(subCodes[0] || {}));
    console.log('[BranchUserCode] First sub-code record:', subCodes[0]);

    tbody.innerHTML = subCodes.map((sc, idx) => {
      const id = sc.SubCodeID || sc.subCodeID || sc.ID || sc.Code || sc.CodeID || '';
      const desc = sc.Description || sc.SubCodeName || sc.CodeDescription || sc.Name || '';
      // Check more field variations for audit fields
      const createdBy = sc.CreatedBy || sc.createdBy || sc.OperatedBy || sc.operatedBy || 
                        sc.OperatorID || sc.operatorId || sc.EnteredBy || sc.enteredBy || '';
      const createdOn = sc.CreatedOn || sc.createdOn || sc.OperatedOn || sc.operatedOn ||
                        sc.PostingDate || sc.postingDate || sc.EntryDate || sc.entryDate || '';
      const supervisedBy = sc.SupervisedBy || sc.supervisedBy || sc.ApprovedBy || sc.approvedBy ||
                           sc.SupervisorID || sc.supervisorId || sc.AuthorizedBy || sc.authorizedBy || '';
      const supervisedOn = sc.SupervisedOn || sc.supervisedOn || sc.ApprovedOn || sc.approvedOn ||
                           sc.SupervisionDate || sc.supervisionDate || sc.ApprovalDate || sc.approvalDate || '';
      return `
        <tr data-subcode-id="${id}" 
            data-description="${desc}"
            data-created-by="${createdBy}"
            data-created-on="${createdOn}"
            data-supervised-by="${supervisedBy}"
            data-supervised-on="${supervisedOn}">
          <td>${id}</td>
          <td>${desc}</td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('tr[data-subcode-id]').forEach(row => {
      row.addEventListener('click', handleSubCodeRowClick);
    });
  }

  function handleSubCodeRowClick(e) {
    // Only allow row selection in EDIT mode
    if (state.currentMode !== MODES.EDIT) {
      return;
    }

    const row = e.currentTarget;
    
    console.log('[BranchUserCode] Row dataset:', row.dataset);
    
    const subCodeId = row.dataset.subcodeId || '';
    const description = row.dataset.description || '';
    const createdBy = row.dataset.createdBy || '';
    const createdOn = row.dataset.createdOn || '';
    const supervisedBy = row.dataset.supervisedBy || '';
    const supervisedOn = row.dataset.supervisedOn || '';

    console.log('[BranchUserCode] Extracted values:', { subCodeId, description, createdBy, createdOn, supervisedBy, supervisedOn });

    const tbody = row.closest('tbody');
    tbody.querySelectorAll('tr').forEach(r => {
      r.classList.remove('table-primary');
    });
    row.classList.add('table-primary');

    setValue('SubCode', subCodeId);
    setValue('Description', description);
    
    const recordData = {
      CreatedBy: createdBy,
      CreatedOn: createdOn,
      SupervisedBy: supervisedBy,
      SupervisedOn: supervisedOn
    };
    populateBehindTheScene(recordData);

    state.lastLoadedRecord = {
      SubCodeID: subCodeId,
      Description: description,
      CreatedBy: createdBy,
      CreatedOn: createdOn,
      SupervisedBy: supervisedBy,
      SupervisedOn: supervisedOn
    };

    updateGridButtons();

    showInfoToast(`Selected sub-code: ${subCodeId}`);
  }

  // ==================== BEHIND THE SCENE ====================
  function populateBehindTheScene(record) {
    if (!record) {
      clearBehindTheScene();
      return;
    }
    
    console.log('[BranchUserCode] populateBehindTheScene called with record:', record);
    console.log('[BranchUserCode] Record keys:', Object.keys(record));
    
    // Extract audit fields with extensive field name variations
    const createdBy = record.CreatedBy || record.createdBy || record.OperatedBy || record.operatedBy || 
                      record.OperatorID || record.operatorId || record.EnteredBy || record.enteredBy ||
                      record.InputBy || record.inputBy || record.PostedBy || record.postedBy || '';
    const createdOn = record.CreatedOn || record.createdOn || record.OperatedOn || record.operatedOn ||
                      record.PostingDate || record.postingDate || record.EntryDate || record.entryDate ||
                      record.InputDate || record.inputDate || record.DateCreated || record.dateCreated || '';
    const supervisedBy = record.SupervisedBy || record.supervisedBy || record.ApprovedBy || record.approvedBy ||
                         record.SupervisorID || record.supervisorId || record.AuthorizedBy || record.authorizedBy ||
                         record.VerifiedBy || record.verifiedBy || '';
    const supervisedOn = record.SupervisedOn || record.supervisedOn || record.ApprovedOn || record.approvedOn ||
                         record.SupervisionDate || record.supervisionDate || record.AuthorizationDate || record.authorizationDate ||
                         record.ApprovalDate || record.approvalDate || record.VerifiedOn || record.verifiedOn || '';
    
    console.log('[BranchUserCode] Extracted Behind The Scene values:', { createdBy, createdOn, supervisedBy, supervisedOn });
    
    const createdByEl = qs('#CreatedBy');
    const createdOnEl = qs('#CreatedOn');
    const supervisedByEl = qs('#SupervisedBy');
    const supervisedOnEl = qs('#SupervisedOn');
    
    console.log('[BranchUserCode] Behind The Scene elements found:', { 
      createdByEl: !!createdByEl, 
      createdOnEl: !!createdOnEl, 
      supervisedByEl: !!supervisedByEl, 
      supervisedOnEl: !!supervisedOnEl 
    });
    
    if (createdByEl) createdByEl.textContent = createdBy || '-';
    if (createdOnEl) createdOnEl.textContent = formatDateTime(createdOn) || '-';
    if (supervisedByEl) supervisedByEl.textContent = supervisedBy || '-';
    if (supervisedOnEl) supervisedOnEl.textContent = formatDateTime(supervisedOn) || '-';
    
    console.log('[BranchUserCode] Behind The Scene populated - CreatedBy textContent:', createdByEl?.textContent);
  }
  
  function formatDateTime(dateStr) {
    if (!dateStr) return '';
    if (dateStr === 'null' || dateStr === null) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  }
  
  function clearBehindTheScene() {
    const createdByEl = qs('#CreatedBy');
    const createdOnEl = qs('#CreatedOn');
    const supervisedByEl = qs('#SupervisedBy');
    const supervisedOnEl = qs('#SupervisedOn');
    
    if (createdByEl) createdByEl.textContent = '';
    if (createdOnEl) createdOnEl.textContent = '';
    if (supervisedByEl) supervisedByEl.textContent = '';
    if (supervisedOnEl) supervisedOnEl.textContent = '';
  }

  // ==================== ACTION BUTTONS ====================
  function initializeActionButtons() {
    const actionBtns = qsa('[data-bruc-action]');
    console.log('[BranchUserCode] initializeActionButtons - found buttons:', actionBtns.length);
    actionBtns.forEach((btn, idx) => {
      const action = btn.dataset.brucAction;
      console.log('[BranchUserCode] Wiring action button:', idx, action);
      btn.addEventListener('click', handleActionButton);
    });
  }

  function handleActionButton(e) {
    const action = e.currentTarget.dataset.brucAction;
    console.log('[BranchUserCode] handleActionButton called with action:', action);

    switch (action) {
      case 'view':
        handleView();
        break;
      case 'add':
        handleAdd();
        break;
      case 'edit':
        handleEdit();
        break;
      case 'save':
        handleSave();
        break;
      case 'cancel':
        handleCancel();
        break;
      case 'search':
        console.log('[BranchUserCode] Search action triggered from handleActionButton');
        openCodeSearchModal();
        break;
    }
  }

  function initializeGridButtons() {
    qsa('[data-bruc-grid-action]').forEach(btn => {
      btn.addEventListener('click', handleGridButton);
    });
  }

  function handleGridButton(e) {
    const action = e.currentTarget.dataset.brucGridAction;

    switch (action) {
      case 'new':
        handleNewSubCode();
        break;
      case 'alter':
        handleAlterSubCode();
        break;
      case 'remove':
        handleRemoveSubCode();
        break;
      case 'update':
        handleUpdateSubCode();
        break;
      case 'clear':
        handleClearForm();
        break;
    }
  }

  function handleView() {
    const codeId = getValue('CodeID').trim();
    if (!codeId) {
      showErrorToast('Please enter a Code ID first');
      return;
    }
    
    loadCodeDetails(codeId);
    setMode(MODES.VIEW);
  }

  function handleAdd() {
    if (!state.selectedCodeId) {
      showErrorToast('Please select a Code Type first (use View/Search)');
      return;
    }
    setMode(MODES.ADD);
    showInfoToast('Add mode - You can now add new sub-codes');
  }

  function handleEdit() {
    if (!state.selectedCodeId) {
      showErrorToast('Please select a Code Type first');
      return;
    }
    setMode(MODES.EDIT);
    showInfoToast('Edit mode - Select a sub-code to modify');
  }

  // ==================== INLINE ACTION HANDLERS ====================
  function handleNewSubCode() {
    if (!state.selectedCodeId) {
      showErrorToast('Please select a Code Type first');
      return;
    }
    
    state.gridAction = 'new';
    
    setValue('SubCode', '');
    setValue('Description', '');
    clearBehindTheScene();
    state.lastLoadedRecord = null;
    
    const tbody = qs('#subCodesTable tbody');
    if (tbody) {
      tbody.querySelectorAll('tr').forEach(r => r.classList.remove('table-primary'));
    }
    
    updateGridButtons();
    
    qs('#SubCode')?.focus();
    showInfoToast('Enter new sub-code details');
  }

  function handleAlterSubCode() {
    if (!state.lastLoadedRecord) {
      showErrorToast('Please select a sub-code to alter');
      return;
    }
    
    state.gridAction = 'alter';
    
    updateGridButtons();
    
    qs('#Description')?.focus();
    showInfoToast('Modify the description and click Update');
  }

  function handleRemoveSubCode() {
    if (!state.lastLoadedRecord || !getValue('SubCode')) {
      showErrorToast('Please select a sub-code to remove');
      return;
    }
    
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: 'Confirm Removal',
        text: `Remove sub-code "${getValue('SubCode')}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, remove it'
      }).then((result) => {
        if (result.isConfirmed) {
          const subCodeId = getValue('SubCode');
          state.subCodes = state.subCodes.filter(sc => 
            (sc.SubCodeID || sc.subCodeID || sc.ID) !== subCodeId
          );
          renderSubCodesTable(state.subCodes);
          handleClearForm();
          showSuccessToast(`Sub-code "${subCodeId}" removed`);
        }
      });
    } else {
      if (confirm(`Remove sub-code "${getValue('SubCode')}"?`)) {
        const subCodeId = getValue('SubCode');
        state.subCodes = state.subCodes.filter(sc => 
          (sc.SubCodeID || sc.subCodeID || sc.ID) !== subCodeId
        );
        renderSubCodesTable(state.subCodes);
        handleClearForm();
        showSuccessToast(`Sub-code "${subCodeId}" removed`);
      }
    }
  }

  function handleUpdateSubCode() {
    const subCodeId = getValue('SubCode');
    const description = getValue('Description');
    
    if (!subCodeId) {
      showErrorToast('Please enter a Sub Code ID');
      return;
    }
    
    if (!state.selectedCodeId) {
      showErrorToast('Please select a Code Type first');
      return;
    }
    
    const existingIndex = state.subCodes.findIndex(sc => 
      (sc.SubCodeID || sc.subCodeID || sc.ID) === subCodeId
    );
    
    if (existingIndex >= 0) {
      state.subCodes[existingIndex].Description = description;
      state.subCodes[existingIndex].SubCodeID = subCodeId;
      showSuccessToast(`Sub-code "${subCodeId}" updated`);
    } else {
      state.subCodes.push({
        SubCodeID: subCodeId,
        Description: description,
        CreatedBy: '',
        CreatedOn: '',
        SupervisedBy: '',
        SupervisedOn: ''
      });
      showSuccessToast(`Sub-code "${subCodeId}" added`);
    }
    
    state.gridAction = null;
    state.lastLoadedRecord = null;
    renderSubCodesTable(state.subCodes);
    
    setValue('SubCode', '');
    setValue('Description', '');
    clearBehindTheScene();
    
    updateGridButtons();
  }

  function handleClearForm() {
    setValue('SubCode', '');
    setValue('Description', '');
    clearBehindTheScene();
    state.lastLoadedRecord = null;
    state.gridAction = null;
    
    const tbody = qs('#subCodesTable tbody');
    if (tbody) {
      tbody.querySelectorAll('tr').forEach(r => {
        r.classList.remove('table-primary');
      });
    }
    
    updateGridButtons();
  }

  // ==================== ACTION BUTTON HELPERS ====================
  function getActionButtons() {
    return {
      view: qs('[data-bruc-action="view"]'),
      add: qs('[data-bruc-action="add"]'),
      edit: qs('[data-bruc-action="edit"]'),
      save: qs('[data-bruc-action="save"]'),
      cancel: qs('[data-bruc-action="cancel"]')
    };
  }

  function updateActionButtons() {
    const { view, add, edit, save, cancel } = getActionButtons();
    const isEditable = state.currentMode === MODES.ADD || state.currentMode === MODES.EDIT;
    const hasCodeSelected = !!state.selectedCodeId;
    const hasSubCodes = state.subCodes && state.subCodes.length > 0;

    if (state.currentMode === MODES.VIEW) {
      setButtonDisabled(view, true);
      
      if (hasCodeSelected && !hasSubCodes) {
        setButtonDisabled(add, false);
        setButtonDisabled(edit, true);
        setButtonDisabled(cancel, false);
      } else if (hasCodeSelected && hasSubCodes) {
        setButtonDisabled(add, true);
        setButtonDisabled(edit, false);
        setButtonDisabled(cancel, false);
      } else {
        setButtonDisabled(add, true);
        setButtonDisabled(edit, true);
        setButtonDisabled(cancel, true);
      }
      setButtonDisabled(save, true);
    } else if (isEditable) {
      setButtonDisabled(view, false);
      setButtonDisabled(add, true);
      setButtonDisabled(edit, true);
      setButtonDisabled(save, false);
      setButtonDisabled(cancel, false);
    }
  }

  function setMode(nextMode, { initial = false } = {}) {
    state.currentMode = nextMode;
    state.gridAction = null;

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#branch-user-code-form");
    if (!form) return;

    const isFormEditable = nextMode === MODES.ADD || nextMode === MODES.EDIT;

    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        return;
      }

      if (["CreatedBy", "CreatedOn", "SupervisedBy", "SupervisedOn"].includes(el.id)) {
        el.disabled = true;
        return;
      }

      if (["CodeID", "CodeName"].includes(el.id)) {
        el.disabled = false;
        el.readOnly = true;
        return;
      }

      el.disabled = !isFormEditable;
    });

    qsa("button[data-always-enabled]", form).forEach((b) => (b.disabled = false));

    const { view, add, edit, save, cancel } = getActionButtons();

    setButtonDisabled(view, true);
    setButtonDisabled(add, true);
    setButtonDisabled(edit, true);
    setButtonDisabled(save, true);
    setButtonDisabled(cancel, true);

    if (initial) {
      setButtonDisabled(view, false);
      updateGridButtons();
      return;
    }

    updateActionButtons();
    updateGridButtons();
  }

  // ==================== SAVE FUNCTIONALITY ====================
  function buildDetailRecordsXml() {
    // Build XML for DetailRecords parameter
    // Format: <dt_BranchUserCode><SubCodeID>XXX</SubCodeID><Description>YYY</Description></dt_BranchUserCode>
    if (!state.subCodes || state.subCodes.length === 0) {
      return '';
    }

    const records = state.subCodes.map(sc => {
      const subCodeId = (sc.SubCodeID || sc.subCodeID || sc.ID || '').toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const description = (sc.Description || sc.SubCodeName || sc.CodeDescription || '').toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<dt_BranchUserCode><SubCodeID>${subCodeId}</SubCodeID><Description>${description}</Description></dt_BranchUserCode>`;
    }).join('');

    return records;
  }

  async function handleSave() {
    if (!state.selectedCodeId) {
      showErrorToast('Please select a Code Type first');
      return;
    }

    try {
      const ctx = getContext();
      const detailRecordsXml = buildDetailRecordsXml();

      // p_AddEditBranchUserCodes - NO BankID parameter
      const requestData = {
        OurBranchID: ctx.branchId,
        ID: state.selectedCodeId,
        OperatedBy: ctx.operatorId,
        OperatedOn: null,
        SupervisedBy: null,
        DetailRecords: detailRecordsXml || ''
      };

      console.log('[BranchUserCode] Save request:', requestData);
      console.log('[BranchUserCode] DetailRecords XML:', detailRecordsXml);

      const envelope = CoreApi.makeRequestEnvelope('dbo.p_AddEditBranchUserCodes', requestData);
      console.log('[BranchUserCode] Full envelope:', JSON.stringify(envelope, null, 2));
      
      const resp = await CoreApi.post(API_ENDPOINT, envelope);

      console.log('[BranchUserCode] Save response (FULL):', JSON.stringify(resp, null, 2));
      console.log('[BranchUserCode] Response keys:', Object.keys(resp || {}));
      console.log('[BranchUserCode] Response data:', resp?.data);
      console.log('[BranchUserCode] Response Details:', resp?.data?.Details);

      const isSuccess = resp?.success === true || 
                        resp?.code === '00' || 
                        resp?.Code === '00' ||
                        resp?.Status === 'Success' ||
                        resp?.status === 'success' ||
                        (resp?.data && !resp?.error && !resp?.message?.toLowerCase().includes('error'));

      if (isSuccess) {
        const count = state.subCodes?.length || 0;
        const savedCodeId = state.selectedCodeId;
        
        if (count > 0) {
          showSuccessToast(`Saved ${count} sub-code(s) for ${savedCodeId}`);
        } else {
          showSuccessToast(`Removed all sub-codes for ${savedCodeId}`);
        }
        
        setValue('SubCode', '');
        setValue('Description', '');
        clearBehindTheScene();
        
        state.lastLoadedRecord = null;
        state.gridAction = null;
        state.subCodes = [];
        state.recordNotFound = false;
        
        renderSubCodesTable([]);
        
        const countEl = qs('#subCodeCount');
        if (countEl) countEl.textContent = '0';
        
        setMode(MODES.VIEW);
        
        // After successful save: Cancel enabled (to clear), Add disabled, View enabled
        const { view, add, edit, save, cancel } = getActionButtons();
        setButtonDisabled(view, false);
        setButtonDisabled(add, true);
        setButtonDisabled(edit, true);
        setButtonDisabled(save, true);
        setButtonDisabled(cancel, false); // Cancel active to clear all fields
      } else {
        const errorMsg = resp?.message || resp?.Message || resp?.error || resp?.Error || 'Failed to save';
        console.error('[BranchUserCode] Save failed with message:', errorMsg);
        showErrorToast(errorMsg);
      }

    } catch (err) {
      console.error('[BranchUserCode] Save failed:', err);
      showErrorToast(err?.message || 'Failed to save sub-codes');
    }
  }

  function handleCancel() {
    // Clear ALL fields including CodeID and CodeName
    setValue('CodeID', '');
    setValue('CodeName', '');
    setValue('SubCode', '');
    setValue('Description', '');
    clearBehindTheScene();
    
    state.lastLoadedRecord = null;
    state.gridAction = null;
    state.subCodes = [];
    state.recordNotFound = false;
    state.selectedCodeId = null; // Reset selected code
    
    renderSubCodesTable([]);
    
    const countEl = qs('#subCodeCount');
    if (countEl) countEl.textContent = '0';
    
    setMode(MODES.VIEW);
    
    // Hide validation banner
    hideValidationSummary();
    
    // After cancel: All buttons disabled except View
    const { view, add, edit, save, cancel } = getActionButtons();
    setButtonDisabled(view, false);
    setButtonDisabled(add, true);
    setButtonDisabled(edit, true);
    setButtonDisabled(save, true);
    setButtonDisabled(cancel, true);
  }

  // ==================== SEARCH BUTTON WIRING ====================
  function wireSearchButton() {
    const lookupBtn = qs('.kairo-user-control__lookup');
    console.log('[BranchUserCode] wireSearchButton - lookupBtn found:', !!lookupBtn);
    if (lookupBtn) {
      lookupBtn.addEventListener('click', (e) => {
        console.log('[BranchUserCode] Search button clicked via wireSearchButton');
        openCodeSearchModal();
      });
    }

    const codeIdField = qs('#CodeID');
    if (codeIdField) {
      codeIdField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const codeId = codeIdField.value.trim();
          if (codeId) {
            setValue('CodeName', '');
            loadCodeDetails(codeId);
          }
        }
      });

      codeIdField.addEventListener('blur', () => {
        const codeId = codeIdField.value.trim();
        if (codeId && codeId !== state.selectedCodeId) {
          loadCodeDetails(codeId);
        }
      });
    }
  }

  // ==================== INITIALIZATION ====================
  function initialize() {
    console.log('[BranchUserCode] Initializing...');
    
    // Ensure dependencies are loaded
    const hasDeps = ensureDependencies();
    console.log('[BranchUserCode] Dependencies available:', hasDeps);
    console.log('[BranchUserCode] Bootstrap available (current):', typeof bootstrap !== 'undefined');
    console.log('[BranchUserCode] Bootstrap available (parent):', typeof window.parent?.bootstrap !== 'undefined');
    console.log('[BranchUserCode] Document body:', !!document.body);
    console.log('[BranchUserCode] Form element:', !!qs('#branch-user-code-form'));

    wireSearchButton();
    initializeActionButtons();
    initializeGridButtons();
    setMode(MODES.VIEW, { initial: true });

    console.log('[BranchUserCode] Initialization complete');
  }

  // Initialize on DOM ready - use a more robust check
  function initWhenReady() {
    if (document.readyState === 'loading') {
      console.log('[BranchUserCode] Document loading, waiting for DOMContentLoaded');
      document.addEventListener('DOMContentLoaded', initialize);
    } else {
      console.log('[BranchUserCode] Document ready, initializing now');
      // Small delay to ensure all elements are rendered and scripts loaded
      setTimeout(initialize, 100);
    }
  }
  
  initWhenReady();

})();
