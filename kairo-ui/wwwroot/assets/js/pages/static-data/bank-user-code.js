/**
 * Bank User Code - Static Data Module
 * Allows searching, viewing, and editing Bank User Codes (System Sub Codes)
 * Uses p_v1_GetSystemCodes API pattern (same as LookupService which works)
 */
(function() {
  'use strict';

  // Prevent double initialization
  if (window.__kairoBankUserCodeLoaded) return;
  window.__kairoBankUserCodeLoaded = true;

  const APP_NAME = 'PROJECT_KAIRO';

  // ==================== DEPENDENCIES CHECK ====================
  const CoreApi = window.CoreApi;
  const Environment = window.Environment || {};

  if (!CoreApi) {
    console.error('[BankUserCode] CoreApi not found! Ensure coreApi.js is loaded.');
    return;
  }

  // API endpoint - same as LookupService
  const BASE_URL = (
    Environment.baseUrl ||
    Environment.baseUrlCommon ||
    Environment.baseUrlSystemCodes ||
    ''
  ).replace(/\/+$/, '');
  const API_ENDPOINT = BASE_URL ? `${BASE_URL}/api/OldAPI` : '/api/OldAPI';

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

  // Known code types from the legacy system (System Sub Codes)
  // These are the parent code type IDs that can contain sub-codes
  const KNOWN_CODE_TYPES = [
    { ID: 'BankChargeTypeID', Description: 'Bank Charge Type' },
    { ID: 'BankRegionID', Description: 'Bank Region' },
    { ID: 'BIN', Description: 'BIN (Bank Identification Number)' },
    { ID: 'ClearingCenterID', Description: 'Clearing Center' },
    { ID: 'GLTypeGroupID', Description: 'GL Type Group' },
    { ID: 'LOCALE', Description: 'Locale' },
    { ID: 'WFChargeID', Description: 'WF Charge' },
    { ID: 'LimitTypeID', Description: 'Limit Type' },
    { ID: 'DPDefinitionID', Description: 'DP Definition' },
    { ID: 'CollateralCategoryID', Description: 'Collateral Category' },
    { ID: 'CollateralTypeID', Description: 'Collateral Type' },
    { ID: 'CollateralValueTypeID', Description: 'Collateral Value Type' },
    { ID: 'PaymentTypeID', Description: 'Payment Type' },
    { ID: 'TransactionTypeID', Description: 'Transaction Type' },
    { ID: 'TrxCategoryID', Description: 'Transaction Category' },
    { ID: 'ClientTypeID', Description: 'Client Type' },
    { ID: 'TitleID', Description: 'Title' },
    { ID: 'GenderID', Description: 'Gender' },
    { ID: 'MaritalStatusID', Description: 'Marital Status' },
    { ID: 'IdentificationTypeID', Description: 'Identification Type' },
    { ID: 'RelationID', Description: 'Relation' },
    { ID: 'OccupationID', Description: 'Occupation' },
    { ID: 'SectorID', Description: 'Sector' },
    { ID: 'SubSectorID', Description: 'Sub Sector' },
    { ID: 'PurposeID', Description: 'Purpose' },
    { ID: 'BusinessLineID', Description: 'Business Line' },
    { ID: 'GuarantorTypeID', Description: 'Guarantor Type' },
    { ID: 'AccountTypeID', Description: 'Account Type' },
    { ID: 'GLAccountTypeID', Description: 'GL Account Type' },
    { ID: 'NatureOfChargeID', Description: 'Nature Of Charge' },
    { ID: 'CityID', Description: 'City' },
    { ID: 'CountryID', Description: 'Country' },
    { ID: 'BDTypeID', Description: 'Bill Discounting Type' },
    { ID: 'AllocationTypeID', Description: 'Allocation Type' },
    { ID: 'CashOrTrf', Description: 'Cash Or Transfer' },
    { ID: 'LoanPeriodID', Description: 'Loan Period' },
    { ID: 'LoanTypeID', Description: 'Loan Type' },
    { ID: 'BankTypeID', Description: 'Bank Type' },
    { ID: 'ResidentID', Description: 'Resident Status' },
    { ID: 'LiteracyLevelID', Description: 'Literacy Level' },
    { ID: 'BuildingTypeID', Description: 'Building Type' },
    { ID: 'SupervisionCategoryID', Description: 'Supervision Category' }
  ];

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
      bankId: session.BankID || session.bankID || window.__USER__?.BankID || '00',
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
    const newBtn = qs('[data-buc-action="new"]');
    const alterBtn = qs('[data-buc-action="alter"]');
    const removeBtn = qs('[data-buc-action="remove"]');
    const updateBtn = qs('[data-buc-action="update"]');
    const clearBtn = qs('[data-buc-action="clear"]');

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
    
    // Log all possible data locations for debugging
    console.log('[BankUserCode] FULL response object:', JSON.stringify(response, null, 2));
    
    // For p_GetBankUserCode, sub-codes are ALWAYS in Details01
    // Details contains audit/event data which should be ignored
    let results = [];
    
    // Check data.Details01 first (this is where sub-codes should be)
    if (response?.data?.Details01 && Array.isArray(response.data.Details01)) {
      results = response.data.Details01;
      console.log('[BankUserCode] Found sub-codes in data.Details01:', results.length);
    }
    // Check top-level Details01
    else if (response?.Details01 && Array.isArray(response.Details01)) {
      results = response.Details01;
      console.log('[BankUserCode] Found sub-codes in Details01:', results.length);
    }
    
    // Filter to only include records that have SubCodeID (the key field for sub-codes)
    results = results.filter(r => {
      const hasSubCodeId = !!(r.SubCodeID || r.subCodeID || r.SubCode);
      return hasSubCodeId;
    });
    
    console.log('[BankUserCode] Normalized sub-codes:', results.length, results);
    
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
              <h5 class="modal-title text-white" id="codeSearchModalLabel">System Sub Code</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <form id="codeSearchForm">
                <div class="row g-3 align-items-end">
                  <div class="col-md-6">
                    <div class="d-flex align-items-center gap-2">
                      <label class="form-label mb-0" style="min-width: 100px;">Account Type</label>
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
                      <th style="color: white;">SubCodeID</th>
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
    createCodeSearchModal();

    const el = qs('#codeSearchModal');
    if (!el) return;

    // Reset form
    qs('#codeSearchForm')?.reset();
    qs('#codeSearchResults').innerHTML = '';
    qs('#codeSearchEmpty').classList.remove('d-none');
    qs('#codeSearchEmpty').textContent = 'Loading all code types...';

    if (!codeSearchModal) {
      codeSearchModal = new bootstrap.Modal(el);
    }
    codeSearchModal.show();

    // Auto-search on open to load all codes
    setTimeout(() => {
      handleCodeSearch();
      qs('#codeSearchId')?.focus();
    }, 300);
  }

  async function handleCodeSearch(e) {
    if (e) e.preventDefault();

    // Get search values and modes
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
      let codes = [];

      // If no search term, show all known code types from our predefined list
      if (!searchId && !description) {
        console.log('[BankUserCode] No search term - showing all known code types');
        codes = [...KNOWN_CODE_TYPES];
      } else {
        // Filter the known code types based on search criteria
        codes = KNOWN_CODE_TYPES.filter(code => {
          let matches = true;

          if (searchId) {
            const codeId = code.ID.toLowerCase();
            const searchVal = searchId.toLowerCase();
            if (searchIdMode === 'Exact') {
              matches = matches && (codeId === searchVal);
            } else {
              matches = matches && codeId.includes(searchVal);
            }
          }

          if (description && matches) {
            const codeDesc = code.Description.toLowerCase();
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

      console.log('[BankUserCode] Filtered code types:', codes.length);

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
      console.error('[BankUserCode] Search failed:', err);
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

    // Results already have ID and Description from KNOWN_CODE_TYPES
    console.log('[BankUserCode] Rendering code types:', results.length);

    // Render rows with alternating colors like legacy
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

    // Get the code type ID (like 'BIN'), not the sub-code
    const codeId = row.dataset.codeId || '';
    const description = row.dataset.description || '';

    // Set the values in the form
    setValue('CodeID', codeId);
    setValue('CodeName', description);

    // Store selected code type
    state.selectedCodeId = codeId;

    // Close the modal
    if (codeSearchModal) {
      codeSearchModal.hide();
    }

    showInfoToast(`Selected: ${codeId} - ${description}`);

    // Load sub-codes for the selected code TYPE (e.g., 'BIN')
    loadCodeDetails(codeId);
  }

  // ==================== LOAD CODE DETAILS ====================
  async function loadCodeDetails(codeId, { quiet = false } = {}) {
    if (!codeId) {
      renderSubCodesTable([]);
      clearBehindTheScene();
      return;
    }

    try {
      console.log('[BankUserCode] Loading details for:', codeId);

      const ctx = getContext();

      // Use p_GetBankUserCode with the selected ID to get its sub-codes
      // exec p_GetBankUserCode @BankID=N'00',@OurBranchID=N'0101',@ID=N'BIN',@OperatorID='JAMES_MUHUTHIA'
      const requestData = {
        BankID: ctx.bankId,
        OurBranchID: ctx.branchId,
        ID: codeId,
        OperatorID: ctx.operatorId
      };
      const envelope = CoreApi.makeRequestEnvelope('dbo.p_GetBankUserCode', requestData);

      console.log('[BankUserCode] Detail request:', requestData);

      const resp = await CoreApi.post(API_ENDPOINT, envelope);
      const subCodes = normalizeResults(resp);

      console.log('[BankUserCode] Detail response:', subCodes);

      state.subCodes = subCodes;
      state.selectedCodeId = codeId;
      state.gridAction = null; // Reset grid action
      state.recordNotFound = subCodes.length === 0; // No sub-codes = record not found

      renderSubCodesTable(subCodes);
      
      // Update the count in the header
      const countEl = qs('#subCodeCount');
      if (countEl) countEl.textContent = subCodes.length;
      
      // Clear the SubCode/Description fields - user should click a row to populate
      setValue('SubCode', '');
      setValue('Description', '');
      
      // Populate Behind The Scene with first record's data if available
      if (subCodes.length > 0) {
        const firstRecord = subCodes[0];
        populateBehindTheScene(firstRecord);
      } else {
        clearBehindTheScene();
      }
      
      state.lastLoadedRecord = null;
      
      // Update button states
      updateActionButtons();
      updateGridButtons();

      // Only show toasts if not in quiet mode
      if (!quiet) {
        if (subCodes.length > 0) {
          showSuccessMessage(`Loaded ${subCodes.length} sub-code(s) for ${codeId}`);
        } else {
          showInfoToast(`No sub-codes found for ${codeId}. Click Add to create.`);
        }
      }

    } catch (err) {
      console.error('[BankUserCode] Failed to load details:', err);
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

    // Update count in header
    if (countEl) countEl.textContent = subCodes?.length || 0;

    if (!subCodes || subCodes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted py-4">No sub-codes found.</td></tr>';
      return;
    }

    // Log first record to see available fields
    console.log('[BankUserCode] First sub-code record fields:', Object.keys(subCodes[0] || {}));
    console.log('[BankUserCode] First sub-code record:', subCodes[0]);

    tbody.innerHTML = subCodes.map((sc, idx) => {
      const id = sc.SubCodeID || sc.subCodeID || sc.ID || sc.Code || sc.CodeID || '';
      const desc = sc.Description || sc.SubCodeName || sc.CodeDescription || sc.Name || '';
      // Try multiple field name variations for audit fields
      const createdBy = sc.CreatedBy || sc.createdBy || sc.OperatedBy || sc.operatedBy || '';
      const createdOn = sc.CreatedOn || sc.createdOn || sc.OperatedOn || sc.operatedOn || '';
      const supervisedBy = sc.SupervisedBy || sc.supervisedBy || sc.ApprovedBy || sc.approvedBy || '';
      const supervisedOn = sc.SupervisedOn || sc.supervisedOn || sc.ApprovedOn || sc.approvedOn || '';
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

    // Add click handler for row selection
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
    
    // Debug: log all dataset properties
    console.log('[BankUserCode] Row dataset:', row.dataset);
    
    const subCodeId = row.dataset.subcodeId || '';
    const description = row.dataset.description || '';
    const createdBy = row.dataset.createdBy || '';
    const createdOn = row.dataset.createdOn || '';
    const supervisedBy = row.dataset.supervisedBy || '';
    const supervisedOn = row.dataset.supervisedOn || '';

    console.log('[BankUserCode] Extracted values:', { subCodeId, description, createdBy, createdOn, supervisedBy, supervisedOn });

    // Highlight selected row - remove previous selection and add to current
    const tbody = row.closest('tbody');
    tbody.querySelectorAll('tr').forEach(r => {
      r.classList.remove('table-primary');
    });
    row.classList.add('table-primary');

    // Populate form fields
    setValue('SubCode', subCodeId);
    setValue('Description', description);
    
    // Populate Behind The Scene using the record data
    const recordData = {
      CreatedBy: createdBy,
      CreatedOn: createdOn,
      SupervisedBy: supervisedBy,
      SupervisedOn: supervisedOn
    };
    populateBehindTheScene(recordData);

    // Store selected sub-code for editing
    state.lastLoadedRecord = {
      SubCodeID: subCodeId,
      Description: description,
      CreatedBy: createdBy,
      CreatedOn: createdOn,
      SupervisedBy: supervisedBy,
      SupervisedOn: supervisedOn
    };

    // Update button states
    updateGridButtons();

    showInfoToast(`Selected sub-code: ${subCodeId}`);
  }

  // ==================== BEHIND THE SCENE ====================
  function populateBehindTheScene(record) {
    if (!record) {
      clearBehindTheScene();
      return;
    }
    
    console.log('[BankUserCode] populateBehindTheScene called with record:', record);
    console.log('[BankUserCode] Record keys:', Object.keys(record));
    
    // Extract audit fields from record with multiple field name variations
    const createdBy = record.CreatedBy || record.createdBy || record.OperatedBy || record.operatedBy || '';
    const createdOn = record.CreatedOn || record.createdOn || record.OperatedOn || record.operatedOn || '';
    const supervisedBy = record.SupervisedBy || record.supervisedBy || record.ApprovedBy || record.approvedBy || '';
    const supervisedOn = record.SupervisedOn || record.supervisedOn || record.ApprovedOn || record.approvedOn || '';
    
    console.log('[BankUserCode] Extracted Behind The Scene values:', { createdBy, createdOn, supervisedBy, supervisedOn });
    
    // For span elements, use textContent
    const createdByEl = qs('#CreatedBy');
    const createdOnEl = qs('#CreatedOn');
    const supervisedByEl = qs('#SupervisedBy');
    const supervisedOnEl = qs('#SupervisedOn');
    
    console.log('[BankUserCode] Behind The Scene elements found:', { 
      createdByEl: !!createdByEl, 
      createdOnEl: !!createdOnEl, 
      supervisedByEl: !!supervisedByEl, 
      supervisedOnEl: !!supervisedOnEl 
    });
    
    if (createdByEl) createdByEl.textContent = createdBy || '-';
    if (createdOnEl) createdOnEl.textContent = formatDateTime(createdOn) || '-';
    if (supervisedByEl) supervisedByEl.textContent = supervisedBy || '-';
    if (supervisedOnEl) supervisedOnEl.textContent = formatDateTime(supervisedOn) || '-';
    
    console.log('[BankUserCode] Behind The Scene populated - CreatedBy textContent:', createdByEl?.textContent);
  }
  
  function formatDateTime(dateStr) {
    if (!dateStr) return '';
    // If it's already formatted or null, return as-is or empty
    if (dateStr === 'null' || dateStr === null) return '';
    // Try to format ISO date to readable format
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  }
  
  function clearBehindTheScene() {
    // For span elements, use textContent
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
    qsa('[data-buc-action]').forEach(btn => {
      btn.addEventListener('click', handleActionButton);
    });
  }

  function handleActionButton(e) {
    const action = e.currentTarget.dataset.bucAction;

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
      // Inline grid action buttons
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
    // View should load the record from the ID field, not open search modal
    const codeId = getValue('CodeID').trim();
    if (!codeId) {
      showErrorToast('Please enter a Code ID first');
      return;
    }
    
    // Load the code details
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
    
    // Set grid action to 'new'
    state.gridAction = 'new';
    
    // Clear SubCode and Description for new entry
    setValue('SubCode', '');
    setValue('Description', '');
    clearBehindTheScene();
    state.lastLoadedRecord = null;
    
    // Deselect any table row
    const tbody = qs('#subCodesTable tbody');
    if (tbody) {
      tbody.querySelectorAll('tr').forEach(r => r.classList.remove('table-primary'));
    }
    
    // Update button states
    updateGridButtons();
    
    // Focus on SubCode field
    qs('#SubCode')?.focus();
    showInfoToast('Enter new sub-code details');
  }

  function handleAlterSubCode() {
    if (!state.lastLoadedRecord) {
      showErrorToast('Please select a sub-code to alter');
      return;
    }
    
    // Set grid action to 'alter'
    state.gridAction = 'alter';
    
    // Update button states
    updateGridButtons();
    
    // Enable editing of Description field
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
          // Remove from state.subCodes and re-render
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
    
    // Find and update or add the sub-code in state.subCodes
    const existingIndex = state.subCodes.findIndex(sc => 
      (sc.SubCodeID || sc.subCodeID || sc.ID) === subCodeId
    );
    
    if (existingIndex >= 0) {
      // Update existing
      state.subCodes[existingIndex].Description = description;
      state.subCodes[existingIndex].SubCodeID = subCodeId;
      showSuccessToast(`Sub-code "${subCodeId}" updated`);
    } else {
      // Add new
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
    
    // Reset grid action and re-render
    state.gridAction = null;
    state.lastLoadedRecord = null;
    renderSubCodesTable(state.subCodes);
    
    // Clear form fields
    setValue('SubCode', '');
    setValue('Description', '');
    clearBehindTheScene();
    
    // Update button states
    updateGridButtons();
  }

  function handleClearForm() {
    setValue('SubCode', '');
    setValue('Description', '');
    clearBehindTheScene();
    state.lastLoadedRecord = null;
    state.gridAction = null;
    
    // Deselect any selected row
    const tbody = qs('#subCodesTable tbody');
    if (tbody) {
      tbody.querySelectorAll('tr').forEach(r => {
        r.classList.remove('table-primary');
      });
    }
    
    // Update button states
    updateGridButtons();
  }

  // ==================== ACTION BUTTON HELPERS ====================
  function getActionButtons() {
    return {
      view: qs('[data-buc-action="view"]'),
      add: qs('[data-buc-action="add"]'),
      edit: qs('[data-buc-action="edit"]'),
      save: qs('[data-buc-action="save"]'),
      cancel: qs('[data-buc-action="cancel"]')
    };
  }

  function updateActionButtons() {
    const { view, add, edit, save, cancel } = getActionButtons();
    const isEditable = state.currentMode === MODES.ADD || state.currentMode === MODES.EDIT;
    const hasCodeSelected = !!state.selectedCodeId;
    const hasSubCodes = state.subCodes && state.subCodes.length > 0;

    // View mode with a loaded code: Cancel + Edit are active
    // Add/Edit mode: Save + Cancel are active
    // If code selected but no sub-codes found: Add + Cancel active, Edit inactive
    if (state.currentMode === MODES.VIEW) {
      setButtonDisabled(view, true);  // Already in view mode
      
      if (hasCodeSelected && !hasSubCodes) {
        // Code type selected but no sub-codes found - can Add new sub-codes
        setButtonDisabled(add, false);  // Enable Add
        setButtonDisabled(edit, true);  // Disable Edit (nothing to edit)
        setButtonDisabled(cancel, false);  // Enable Cancel to clear
      } else if (hasCodeSelected && hasSubCodes) {
        // Code type selected with existing sub-codes - can Edit
        setButtonDisabled(add, true);  // Disable Add
        setButtonDisabled(edit, false);  // Enable Edit
        setButtonDisabled(cancel, false);  // Enable Cancel
      } else {
        // No code selected
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
    state.gridAction = null; // Reset grid action when mode changes

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#bank-user-code-form");
    if (!form) return;

    const isFormEditable = nextMode === MODES.ADD || nextMode === MODES.EDIT;

    // Disable/enable form fields
    qsa("input, select, textarea", form).forEach((el) => {
      // Always enabled: ID and search button
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        return;
      }

      // Audit fields are always read-only
      if (["CreatedBy", "CreatedOn", "SupervisedBy", "SupervisedOn"].includes(el.id)) {
        el.disabled = true;
        return;
      }

      // CodeID and CodeName are readonly in all modes (set via search)
      if (["CodeID", "CodeName"].includes(el.id)) {
        el.disabled = false;
        el.readOnly = true;
        return;
      }

      el.disabled = !isFormEditable;
    });

    // Keep search button enabled
    qsa("button[data-always-enabled]", form).forEach((b) => (b.disabled = false));

    const { view, add, edit, save, cancel } = getActionButtons();

    // Default: disable everything, then selectively enable
    setButtonDisabled(view, true);
    setButtonDisabled(add, true);
    setButtonDisabled(edit, true);
    setButtonDisabled(save, true);
    setButtonDisabled(cancel, true);

    if (initial) {
      // Initial state: only View enabled
      setButtonDisabled(view, false);
      updateGridButtons();
      return;
    }

    // Update based on mode
    updateActionButtons();
    updateGridButtons();
  }

  // ==================== SAVE FUNCTIONALITY ====================
  function buildDetailRecordsXml() {
    // Build XML for DetailRecords parameter
    // Format expected by SP: <dt_BankUserCode><SubCodeID>XXX</SubCodeID><Description>YYY</Description></dt_BankUserCode>
    // Multiple records: each wrapped in <dt_BankUserCode> tags
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
      return `<dt_BankUserCode><SubCodeID>${subCodeId}</SubCodeID><Description>${description}</Description></dt_BankUserCode>`;
    }).join('');

    return records;
  }

  async function handleSave() {
    if (!state.selectedCodeId) {
      showErrorToast('Please select a Code Type first');
      return;
    }

    // Allow saving empty sub-codes list (for deletion scenarios)
    // No validation blocking empty subCodes array

    try {
      const ctx = getContext();
      const detailRecordsXml = buildDetailRecordsXml();

      const requestData = {
        BankID: ctx.bankId,
        ID: state.selectedCodeId,
        OperatedBy: ctx.operatorId,
        OperatedOn: null,
        SupervisedBy: null,
        DetailRecords: detailRecordsXml || ''
      };

      console.log('[BankUserCode] Save request:', requestData);
      console.log('[BankUserCode] DetailRecords XML:', detailRecordsXml);

      const envelope = CoreApi.makeRequestEnvelope('dbo.p_AddEditBankUserCodes', requestData);
      console.log('[BankUserCode] Full envelope:', JSON.stringify(envelope, null, 2));
      
      const resp = await CoreApi.post(API_ENDPOINT, envelope);

      console.log('[BankUserCode] Save response (FULL):', JSON.stringify(resp, null, 2));
      console.log('[BankUserCode] Response keys:', Object.keys(resp || {}));
      console.log('[BankUserCode] Response data:', resp?.data);
      console.log('[BankUserCode] Response Details:', resp?.data?.Details);

      // Check various success indicators
      const isSuccess = resp?.success === true || 
                        resp?.code === '00' || 
                        resp?.Code === '00' ||
                        resp?.Status === 'Success' ||
                        resp?.status === 'success' ||
                        (resp?.data && !resp?.error && !resp?.message?.toLowerCase().includes('error'));

      if (isSuccess) {
        const count = state.subCodes?.length || 0;
        const savedCodeId = state.selectedCodeId; // Retain the code ID
        
        if (count > 0) {
          showSuccessToast(`Saved ${count} sub-code(s) for ${savedCodeId}`);
        } else {
          showSuccessToast(`Removed all sub-codes for ${savedCodeId}`);
        }
        
        // Clear form fields but RETAIN CodeID
        // CodeID and CodeName are kept for View button functionality
        setValue('SubCode', '');
        setValue('Description', '');
        clearBehindTheScene();
        
        // Reset state but keep selectedCodeId
        state.lastLoadedRecord = null;
        state.gridAction = null;
        state.subCodes = [];
        state.recordNotFound = false;
        // state.selectedCodeId is retained for View button
        
        // Clear the table
        renderSubCodesTable([]);
        
        // Update count
        const countEl = qs('#subCodeCount');
        if (countEl) countEl.textContent = '0';
        
        // Return to view mode with View button enabled, Add button disabled
        setMode(MODES.VIEW);
        
        // After save: View enabled, Add disabled (user should click View to reload data first)
        const { view, add } = getActionButtons();
        setButtonDisabled(view, false);
        setButtonDisabled(add, true);
      } else {
        const errorMsg = resp?.message || resp?.Message || resp?.error || resp?.Error || 'Failed to save';
        console.error('[BankUserCode] Save failed with message:', errorMsg);
        showErrorToast(errorMsg);
      }

    } catch (err) {
      console.error('[BankUserCode] Save failed:', err);
      showErrorToast(err?.message || 'Failed to save sub-codes');
    }
  }

  function handleCancel() {
    // Clear all form fields including CodeID
    setValue('CodeID', '');
    setValue('CodeName', '');
    setValue('SubCode', '');
    setValue('Description', '');
    clearBehindTheScene();
    
    // Reset all state
    state.lastLoadedRecord = null;
    state.gridAction = null;
    state.subCodes = [];
    state.recordNotFound = false;
    state.selectedCodeId = null;
    
    // Clear the table
    renderSubCodesTable([]);
    
    // Update count
    const countEl = qs('#subCodeCount');
    if (countEl) countEl.textContent = '0';
    
    // Return to view mode
    setMode(MODES.VIEW);
    
    // Hide validation banner
    hideValidationSummary();
  }

  // ==================== SEARCH BUTTON WIRING ====================
  function wireSearchButton() {
    const lookupBtn = qs('.kairo-user-control__lookup');
    if (lookupBtn) {
      lookupBtn.addEventListener('click', openCodeSearchModal);
    }

    // Also wire Enter key on CodeID field
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

      // On blur, try to load details
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
    console.log('[BankUserCode] Initializing...');

    wireSearchButton();
    initializeActionButtons();
    setMode(MODES.VIEW, { initial: true });

    console.log('[BankUserCode] Initialization complete');
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();
