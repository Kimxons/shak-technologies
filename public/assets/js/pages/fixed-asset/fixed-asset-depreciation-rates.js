(() => {
  if (window.__kairoFixedAssetDepRatesLoaded) return;
  window.__kairoFixedAssetDepRatesLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  const state = {
    mode: MODES.VIEW,
    currentRecord: null,
    currentUpdateCount: 0, // Track UpdateCount from fetched record for add/edit/delete operations
    isSearching: false, // Like FundSourceMaintenance: View attempted but no record loaded
    isProcessing: false // Lock flag to prevent multiple simultaneous operations
  };

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function setToast(message, variant = "info") {
    // Always use kairo-toast which has proper CSS styling
    let container = qs('.kairo-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'kairo-toast-container';
      document.body.appendChild(container);
    }
    
    // Remove any existing toasts - only show one at a time
    container.querySelectorAll('.kairo-toast').forEach(existingToast => {
      existingToast.classList.remove('is-show');
      setTimeout(() => existingToast.remove(), 200);
    });
    
    const variantClass = variant === 'danger' || variant === 'warning' ? 'kairo-toast--danger' 
                       : variant === 'success' ? 'kairo-toast--success' 
                       : '';
    
    const titleText = variant === 'danger' ? 'Error' 
                    : variant === 'warning' ? 'Warning' 
                    : variant === 'success' ? 'Success' 
                    : 'Info';
    
    const toast = document.createElement('div');
    toast.className = `kairo-toast ${variantClass}`;
    toast.innerHTML = `
      <div class="kairo-toast__title">
        <span>${titleText}</span>
        <button class="kairo-toast__close" type="button">&times;</button>
      </div>
      <div class="kairo-toast__body">${message}</div>
    `;
    
    container.appendChild(toast);
    
    // Show animation - use setTimeout to ensure DOM is ready
    setTimeout(() => toast.classList.add('is-show'), 10);
    
    // Close button
    toast.querySelector('.kairo-toast__close')?.addEventListener('click', () => {
      toast.classList.remove('is-show');
      setTimeout(() => toast.remove(), 200);
    });
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      toast.classList.remove('is-show');
      setTimeout(() => toast.remove(), 200);
    }, 5000);
    
    console.log(`[FixedAssetDepRates] Toast (${variant}): ${message}`);
  }

  function getSessionSafe() {
    try {
      return window.AuthService?.getSession?.() || null;
    } catch {
      return null;
    }
  }

  function clearForm() {
    // Clear main form fields (but NOT dropdowns - DepreciationMethod and RateType)
    const rateIdEl = qs('#RateId');
    const descEl = qs('#Description');
    
    if (rateIdEl) rateIdEl.value = '';
    if (descEl) descEl.value = '';
    // NOTE: Do NOT clear DepreciationMethod and RateType dropdowns per requirement
    
    // Clear audit fields
    const auditFields = ['CreatedBy', 'CreatedOn', 'ModifiedBy', 'ModifiedOn', 'SupervisedBy', 'SupervisedOn'];
    auditFields.forEach(id => {
      const el = qs(`#${id}`);
      if (el) {
        if (el.tagName === 'SPAN' || el.hasAttribute('data-field')) {
          el.textContent = '';
        } else {
          el.value = '';
        }
      }
    });
    
    console.log('[FixedAssetDepRates] Form cleared');
  }

  async function ensureSearchService() {
    if (window.SearchService) return window.SearchService;
    if (window.ServiceLoader?.loadSearchService) {
      await window.ServiceLoader.loadSearchService();
      return window.SearchService;
    }
    return null;
  }

  function ensureRateSearchModal() {
    const existing = qs('#faDepRateSearchModal');
    if (existing) return existing;

    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'faDepRateSearchModal';
    modal.tabIndex = -1;
    modal.setAttribute('aria-hidden', 'true');

    modal.innerHTML = `
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content" style="border: none; border-radius: 0; overflow: hidden;">
          <!-- Header - Dark Blue -->
          <div class="modal-header" style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border: none; padding: 12px 16px;">
            <h6 class="modal-title mb-0" style="color: #fff; font-weight: 600; font-size: 15px;">Find Depreciation Rate</h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          
          <!-- Body -->
          <div class="modal-body" style="background: #f5f5f5; padding: 20px;">
            <!-- Filter Row -->
            <div class="row g-3 mb-3">
              <!-- Rate ID Filter -->
              <div class="col-md-6">
                <label class="form-label mb-1" style="font-size: 13px; color: #333;">Rate ID</label>
                <div class="d-flex gap-2">
                  <select class="form-select form-select-sm" id="faDepRateSearchIdOp" style="width: 90px; flex-shrink: 0;">
                    <option value="Like" selected>Like</option>
                    <option value="Exact">Exact</option>
                  </select>
                  <input type="text" class="form-control form-control-sm" id="faDepRateSearchId" placeholder="Enter Rate ID" />
                </div>
              </div>
              <!-- Description Filter -->
              <div class="col-md-6">
                <label class="form-label mb-1" style="font-size: 13px; color: #333;">Description</label>
                <div class="d-flex gap-2">
                  <select class="form-select form-select-sm" id="faDepRateSearchDescOp" style="width: 90px; flex-shrink: 0;">
                    <option value="Like" selected>Like</option>
                    <option value="Exact">Exact</option>
                  </select>
                  <input type="text" class="form-control form-control-sm" id="faDepRateSearchDesc" placeholder="Enter Description" />
                </div>
              </div>
            </div>
            
            <!-- Search Button -->
            <div class="text-center mb-3">
              <button type="button" class="btn btn-secondary px-4" id="faDepRateSearchGo" style="min-width: 100px;">
                Search
              </button>
            </div>
            
            <!-- Results Table -->
            <div class="table-responsive" style="max-height: 280px; border: 1px solid #ddd; background: #fff;">
              <table class="table table-sm table-hover align-middle mb-0" style="font-size: 13px;">
                <thead style="background: linear-gradient(135deg, #4a90c2 0%, #6ba3d6 100%); color: #fff; position: sticky; top: 0;">
                  <tr>
                    <th style="width: 44px; padding: 10px 8px; font-weight: 600;">#</th>
                    <th style="padding: 10px 8px; font-weight: 600;">DepreciationRateID</th>
                    <th style="padding: 10px 8px; font-weight: 600;">Description</th>
                  </tr>
                </thead>
                <tbody id="faDepRateSearchResults">
                  <tr><td colspan="3" class="text-muted text-center py-3">Enter search criteria and click Search.</td></tr>
                </tbody>
              </table>
            </div>
            <div class="small text-muted mt-1" id="faDepRateSearchStatus">&nbsp;</div>
          </div>
          
          <!-- Footer - Dark Blue -->
          <div class="modal-footer justify-content-center" style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border: none; padding: 12px 16px;">
            <button type="button" class="btn btn-light px-4" id="faDepRateSearchOk" style="min-width: 80px;">OK</button>
          </div>
        </div>
      </div>`;

    // Add custom styles for row selection
    const style = document.createElement('style');
    style.textContent = `
      #faDepRateSearchResults tr[data-idx] { cursor: pointer; }
      #faDepRateSearchResults tr[data-idx]:hover { background-color: #e3f2fd !important; }
      #faDepRateSearchResults tr.table-active { background-color: #bbdefb !important; }
    `;
    modal.appendChild(style);

    document.body.appendChild(modal);
    return modal;
  }

  function setSelectedSearchIndex(modalEl, idx) {
    if (!modalEl) return;
    const tbody = qs('#faDepRateSearchResults');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr[data-idx]'));
    rows.forEach((tr) => tr.classList.remove('table-active'));

    const target = rows.find((tr) => Number(tr.getAttribute('data-idx')) === Number(idx));
    if (target) {
      target.classList.add('table-active');
      target.scrollIntoView({ block: 'nearest' });
      modalEl.__selectedIdx = Number(idx);
      modalEl.__selectedRow = JSON.parse(target.getAttribute('data-row') || '{}');
    }
  }

  async function confirmSelectedRate(modalEl) {
    const row = modalEl?.__selectedRow;
    const rateId = String(pickRateId(row) || '').trim();
    if (!rateId) {
      setToast('Please select a row first.', 'warning');
      return;
    }

    // Close modal first
    if (window.bootstrap?.Modal) {
      const instance = window.bootstrap.Modal.getInstance(modalEl);
      instance?.hide();
    }

    // Set the Rate ID in the form
    const rateIdInput = qs('#RateId');
    if (rateIdInput) rateIdInput.value = rateId;
    
    // Fetch the full record from Details01 (similar to FundSourceMaintenance pattern)
    try {
      if (!window.FixedAssetsService) {
        if (window.ServiceLoader?.loadFixedAssetsService) {
          await window.ServiceLoader.loadFixedAssetsService();
        }
      }
      
      if (window.FixedAssetsService?.getFADepreciationRates) {
        const session = getSessionSafe();
        const requestData = {
          BankID: window.Environment?.defaultBankId || '00',
          OurBranchID: session?.branchId || window.Environment?.defaultOurBranchId || '0101',
          DepreciationRateID: rateId,
          OperatorID: session?.operatorId || 'CSADM',
          Direction: 0
        };
        
        console.log('[FixedAssetDepRates] Fetching full record for:', rateId);
        const resp = await window.FixedAssetsService.getFADepreciationRates(requestData);
        console.log('[FixedAssetDepRates] Fetched full record response:', resp);
        
        // Get the full record from Details01
        if (resp?.success) {
          const details01 = resp.data?.Details01 || resp.Details01 || [];
          if (details01.length > 0) {
            const fullRecord = details01[0];
            console.log('[FixedAssetDepRates] Full record from Details01:', fullRecord);
            
            // Bind all fields from the full record
            bindDepreciationRatesToForm(fullRecord);
            state.isSearching = false;
            
            console.log('[FixedAssetDepRates] UpdateCount from Details01:', state.currentUpdateCount);
            setMode(MODES.VIEW);
            updateActionState();
            return;
          }
        }
      }
    } catch (err) {
      console.warn('[FixedAssetDepRates] Could not fetch full record:', err);
    }

    // Fallback: If fetch failed, use the search row data
    console.log('[FixedAssetDepRates] Using search row data as fallback:', row);
    const desc = pickRateDescription(row);
    if (desc && qs('#Description')) qs('#Description').value = desc;
    if (row?.DepreciationMethodID && qs('#DepreciationMethod')) {
      qs('#DepreciationMethod').value = row.DepreciationMethodID;
    }
    if (row?.DepreciationRateTypeID && qs('#RateType')) {
      qs('#RateType').value = row.DepreciationRateTypeID;
    }
    
    state.currentRecord = row;
    state.currentUpdateCount = row?.UpdateCount ?? 0;
    state.isSearching = false;
    
    setMode(MODES.VIEW);
    updateActionState();
  }

  function pickRateId(row) {
    return (
      row?.DepreciationRateID ??
      row?.RateID ??
      row?.FADepreciationRateID ??
      row?.FADepreciationRateIDID ??
      row?.ID ??
      row?.Id ??
      ''
    );
  }

  function pickRateDescription(row) {
    return (row?.Description ?? row?.Name ?? row?.RateName ?? row?.DepreciationRateName ?? '');
  }

  function normalizeSearchRows(resultData) {
    if (!resultData) return [];
    if (Array.isArray(resultData)) return resultData;
    if (Array.isArray(resultData.Details01) && resultData.Details01.length) return resultData.Details01;

    // Most OldAPI search results come back as { Details: [...] }
    if (Array.isArray(resultData.Details) && resultData.Details.length) return resultData.Details;

    // Some wrappers nest the real rows inside the first Details row
    // e.g. { Details: [ { Details: [...] } ] }
    if (Array.isArray(resultData.Details) && resultData.Details[0]?.Details && Array.isArray(resultData.Details[0].Details)) {
      return resultData.Details[0].Details;
    }

    // Fallbacks
    if (Array.isArray(resultData.Details01)) return resultData.Details01;
    if (Array.isArray(resultData.Details)) return resultData.Details;
    return [];
  }

  function renderRateSearchRows(rows) {
    const tbody = qs('#faDepRateSearchResults');
    const status = qs('#faDepRateSearchStatus');
    if (!tbody) return;

    if (!rows.length) {
      if (status) status.textContent = 'No results found.';
      tbody.innerHTML = '<tr><td colspan="3" class="text-muted text-center py-3">No results found.</td></tr>';
      return;
    }

    if (status) status.textContent = `${rows.length} result(s) found. Click a row to select.`;

    tbody.innerHTML = rows
      .map((row, idx) => {
        const rateId = String(pickRateId(row) || '');
        const desc = String(pickRateDescription(row) || '');
        const json = JSON.stringify(row).replace(/"/g, '&quot;');
        return `
          <tr data-idx="${idx}" data-row="${json}" style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px;">${idx + 1}</td>
            <td style="padding: 8px;">${rateId}</td>
            <td style="padding: 8px;">${desc}</td>
          </tr>`;
      })
      .join('');
  }

  async function runRateIdSearch() {
    const session = getSessionSafe();
    const operatorId = session?.operatorId || 'CSADM';
    const branchId = session?.branchId || window.Environment?.defaultOurBranchId || '0101';
    const bankId = window.Environment?.defaultBankId || '00';

    const modalEl = qs('#faDepRateSearchModal');

    const searchId = (qs('#faDepRateSearchId')?.value || '').trim();
    const searchDesc = (qs('#faDepRateSearchDesc')?.value || '').trim();
    const idOp = (qs('#faDepRateSearchIdOp')?.value || 'Like').trim();
    const descOp = (qs('#faDepRateSearchDescOp')?.value || 'Like').trim();

    const esc = (s) => String(s).replace(/'/g, "''");

    // Build WhereStmt for search filters
    const conditions = [];
    if (searchId) {
      if (idOp === 'Exact') conditions.push(`DepreciationRateID='${esc(searchId)}'`);
      else conditions.push(`DepreciationRateID LIKE '%${esc(searchId)}%'`);
    }
    if (searchDesc) {
      if (descOp === 'Exact') conditions.push(`Description='${esc(searchDesc)}'`);
      else conditions.push(`Description LIKE '%${esc(searchDesc)}%'`);
    }
    const whereStmt = conditions.join(' AND ');

    // Build request using dbo.p_GetSearchResult pattern
    const requestData = {
      TableID: 'FADepreciationRateID',
      AdvFilterString: `BankID='${bankId}'`,
      WhereStmt: whereStmt,
      PrevOrNext: 0,
      RefID: '',
      OperatorID: operatorId,
      ModuleID: 8405,
      OurBranchID: branchId,
      SearchKey: searchId || '',
      LanguageID: 'en'
    };

    const status = qs('#faDepRateSearchStatus');
    const tbody = qs('#faDepRateSearchResults');
    if (status) status.textContent = 'Searching...';
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="text-muted text-center py-3">Searching...</td></tr>';

    try {
      // Use CoreApi directly with dbo.p_GetSearchResult
      if (!window.CoreApi) {
        setToast('CoreApi not available.', 'danger');
        return;
      }

      const baseUrl = window.Environment?.baseUrlCommon || window.Environment?.baseUrlFixedAssets || 'http://localhost:3306';
      const envelope = window.CoreApi.makeRequestEnvelope('dbo.p_GetSearchResult', requestData);
      const resp = await window.CoreApi.post(`${baseUrl.replace(/\/+$/, '')}/api/OldAPI`, envelope);

      console.log('[FADepRates] Search response:', resp);

      if (!resp?.success) {
        if (status) status.textContent = resp?.message || 'Search failed.';
        if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="text-danger text-center py-3">${resp?.message || 'Search failed.'}</td></tr>`;
        return;
      }

      let rows = normalizeSearchRows(resp.data);
      
      // Client-side filter for exact match if specified
      if (searchId && idOp === 'Exact') {
        const key = searchId.toLowerCase();
        rows = rows.filter((r) => String(pickRateId(r) || '').trim().toLowerCase() === key);
      }
      if (searchDesc && descOp === 'Exact') {
        const key = searchDesc.toLowerCase();
        rows = rows.filter((r) => String(pickRateDescription(r) || '').trim().toLowerCase() === key);
      }

      renderRateSearchRows(rows);

      // Store and preselect first row
      if (modalEl) {
        modalEl.__rows = rows;
        modalEl.__selectedRow = null;
        modalEl.__selectedIdx = -1;
        if (rows.length) setSelectedSearchIndex(modalEl, 0);
      }

      if (status) status.textContent = rows.length ? `${rows.length} result(s) found.` : '';
    } catch (err) {
      console.error('[FADepRates] Search error:', err);
      if (status) status.textContent = err?.message || 'Search error.';
      if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="text-danger text-center py-3">${err?.message || 'Search error.'}</td></tr>`;
    }
  }

  function goTo(target) {
    if (target === "data-entry") {
      // Stay on this page.
      return;
    }
    if (target === "rate-details") {
      const rateId = (qs("#RateId")?.value || "").trim();
      if (!rateId) {
        setToast("Please select or view a Depreciation Rate first.", "warning");
        return;
      }
      sessionStorage.setItem("kairo_fa_selected_rate_id", rateId);
      openChildOverlay("fixed-asset-depreciation-rate-details.html");
    }
  }

  // --- Child Overlay Management ---
  function openChildOverlay(url) {
    const overlay = qs('[data-child-overlay]');
    const iframe = qs('[data-child-iframe]');
    if (!overlay || !iframe) {
      console.warn('[FixedAssetDepRates] Child overlay elements not found');
      return;
    }
    
    iframe.src = url;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    
    // Listen for close message from child
    window.addEventListener('message', handleChildMessage);
  }

  function closeChildOverlay() {
    const overlay = qs('[data-child-overlay]');
    const iframe = qs('[data-child-iframe]');
    if (!overlay) return;
    
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    if (iframe) iframe.src = 'about:blank';
    
    window.removeEventListener('message', handleChildMessage);
  }

  function handleChildMessage(event) {
    if (event.data === 'closeChildOverlay' || event.data?.action === 'close') {
      closeChildOverlay();
    }
  }

  // Expose for use by child iframe
  window.closeChildOverlay = closeChildOverlay;

  // --- Button logic refactor to match standardized UI ---
  const isActionButton = (target) => {
    const btn = target?.closest('.btn-action');
    if (!btn) return null;
    // First check data-action attribute (standardized pattern)
    const action = btn.getAttribute('data-action');
    if (action) return { btn, text: action.toLowerCase() };
    // Fallback to class-based detection
    if (btn.classList.contains('btn-view')) return { btn, text: 'view' };
    if (btn.classList.contains('btn-add')) return { btn, text: 'add' };
    if (btn.classList.contains('btn-edit')) return { btn, text: 'edit' };
    if (btn.classList.contains('btn-delete')) return { btn, text: 'delete' };
    if (btn.classList.contains('btn-save')) return { btn, text: 'save' };
    if (btn.classList.contains('btn-cancel')) return { btn, text: 'cancel' };
    const text = (btn.textContent || '').trim().toLowerCase();
    return { btn, text };
  };

  function setButtonDisabled(btn, disabled) {
    if (!btn) return;
    btn.disabled = Boolean(disabled);
  }

  function setFormDisabled(disabled, { keepRateIdEnabled = true } = {}) {
    const form = qs('[data-main-form]') || qs('.form-card') || qs('.form-content');
    if (!form) return;
    qsa('input, select, textarea', form).forEach((el) => {
      if (keepRateIdEnabled && el.id === 'RateId') {
        el.disabled = false;
      } else if (el.hasAttribute('data-always-enabled')) {
        el.disabled = false;
      } else {
        el.disabled = Boolean(disabled);
      }
    });
    // Keep search buttons enabled
    qsa('button[data-always-enabled]', form).forEach((btn) => {
      btn.disabled = false;
    });
  }

  function clearDepRateForm({ keepRateId = true } = {}) {
    const form = qs('#fa-depreciation-form');
    const preservedRateId = keepRateId ? (qs('#RateId')?.value || '') : '';
    if (form) form.reset();
    if (keepRateId && qs('#RateId')) qs('#RateId').value = preservedRateId;
  }

  function updateActionState() {
    const hasRecord = !!state.currentRecord;

    const viewBtn = qs('[data-action="view"]');
    const addBtn = qs('[data-action="add"]');
    const editBtn = qs('[data-action="edit"]');
    const deleteBtn = qs('[data-action="delete"]');
    const saveBtn = qs('[data-action="save"]');
    const cancelBtn = qs('[data-action="cancel"]');
    const searchBtn = qs('#btnSearchRateId');

    // Helper to set button state
    // isEnabled: true = button active (opacity: 1), false = button disabled (opacity: 0.5)
    const setBtnState = (btn, isEnabled) => {
      if (!btn) return;
      btn.disabled = !isEnabled;
      btn.style.opacity = isEnabled ? '1' : '0.5';
    };

    // 4. Add Mode - only Save and Cancel active, search disabled
    if (state.mode === MODES.ADD) {
      setFormDisabled(false);
      // Ensure RateId is enabled in Add mode
      const rateIdInput = qs('#RateId');
      if (rateIdInput) rateIdInput.disabled = false;

      setBtnState(viewBtn, false);
      setBtnState(addBtn, false);
      setBtnState(editBtn, false);
      setBtnState(deleteBtn, false);
      setBtnState(saveBtn, true);
      setBtnState(cancelBtn, true);
      setBtnState(searchBtn, false); // Disable search in Add mode
      return;
    }

    // 5. Edit Mode - only Description editable, only Save and Cancel active, search disabled
    if (state.mode === MODES.UPDATE) {
      setFormDisabled(false);
      // Keep RateId disabled during Edit
      const rateIdInput = qs('#RateId');
      if (rateIdInput) rateIdInput.disabled = true;
      // Keep dropdowns disabled during Edit (only Description editable)
      const methodSelect = qs('#DepreciationMethod');
      const typeSelect = qs('#RateType');
      if (methodSelect) methodSelect.disabled = true;
      if (typeSelect) typeSelect.disabled = true;

      setBtnState(viewBtn, false);
      setBtnState(addBtn, false);
      setBtnState(editBtn, false);
      setBtnState(deleteBtn, false);
      setBtnState(saveBtn, true);
      setBtnState(cancelBtn, true);
      setBtnState(searchBtn, false); // Disable search in Edit mode
      return;
    }

    // View Mode States - form disabled, Cancel always active, Save disabled
    setFormDisabled(true, { keepRateIdEnabled: true });
    setBtnState(cancelBtn, true); // Cancel always active
    setBtnState(saveBtn, false);

    // Debug logging for button state
    console.log('[FixedAssetDepRates] updateActionState - View Mode:', {
      hasRecord,
      isSearching: state.isSearching,
      currentRecord: state.currentRecord
    });

    if (hasRecord) {
      // 3. Record Found State - View, Edit, Delete, Cancel active, Search disabled
      console.log('[FixedAssetDepRates] State: Record Found');
      setBtnState(viewBtn, true);
      setBtnState(addBtn, false);
      setBtnState(editBtn, true);
      setBtnState(deleteBtn, true);
      setBtnState(searchBtn, false); // Disable search when record is loaded
    } else if (state.isSearching) {
      // 2. Record Not Found State - View, Add, Cancel, Search active
      console.log('[FixedAssetDepRates] State: Record Not Found');
      setBtnState(viewBtn, true);
      setBtnState(addBtn, true);
      setBtnState(editBtn, false);
      setBtnState(deleteBtn, false);
      setBtnState(searchBtn, true); // Enable search when no record found
    } else {
      // 1. Default State (Page Load) - View, Cancel, Search active
      console.log('[FixedAssetDepRates] State: Default');
      setBtnState(viewBtn, true);
      setBtnState(addBtn, false);
      setBtnState(editBtn, false);
      setBtnState(deleteBtn, false);
      setBtnState(searchBtn, true); // Enable search on page load
    }
  }

  function setMode(nextMode) {
    state.mode = nextMode;
    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;
    updateActionState();
  }

  function bindNav() {
    qsa("[data-fa-nav-target]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-fa-nav-target");
        if (!target) return;
        goTo(target);
      });
    });

    qsa("[data-fa-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = btn.getAttribute("data-fa-nav") || "";
        if (dir === "prev") {
          loadAndPopulateDepreciationRates(-1); // Previous record
        } else if (dir === "next") {
          loadAndPopulateDepreciationRates(1); // Next record
        }
      });
    });
  }

  // Remove bindModeButtons, use event delegation below

  async function loadAndPopulateDepreciationRates(direction = 0) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[FixedAssets] loadAndPopulateDepreciationRates called with direction:', direction);
    }
    setToast('Loading Depreciation Rates...', 'info');

    // Load service if needed
    if (!window.FixedAssetsService) {
      if (typeof console !== 'undefined' && console.log) {
        console.log('[FixedAssets] FixedAssetsService not found on window. Attempting to load...');
      }
      if (window.ServiceLoader?.loadFixedAssetsService) {
        await window.ServiceLoader.loadFixedAssetsService();
        setToast('FixedAssetsService loaded.', 'info');
        if (typeof console !== 'undefined' && console.log) {
          console.log('[FixedAssets] FixedAssetsService loaded');
        }
      } else {
        setToast("FixedAssetsService not available.", "danger");
        if (typeof console !== 'undefined' && console.error) {
          console.error('[FixedAssets] ServiceLoader or loadFixedAssetsService missing');
        }
        return;
      }
    }

    setToast("Requesting depreciation rates from API...", "info");
    if (typeof console !== 'undefined' && console.log) {
      console.log('[FixedAssets] Requesting depreciation rates');
    }

    // Prepare request data with required parameters
    const DepreciationRateID = (qs('#RateId')?.value || '').trim();
    const searchingById = Boolean(DepreciationRateID);

    // Match FundSourceMaintenance: only enter the "record not found" state
    // when the user actually searched by key.
    state.isSearching = searchingById;

    // Clear stale state before viewing a new key
    if (searchingById) {
      state.currentRecord = null;
      state.currentUpdateCount = 0;
      clearDepRateForm({ keepRateId: true });
    }
    const requestData = {
      BankID: window.Environment?.defaultBankId || '00',
      OurBranchID: window.Environment?.defaultOurBranchId || '0101',
      DepreciationRateID: DepreciationRateID,
      OperatorID: 'CSADM',
      Direction: direction // Use the direction parameter: 0=current, 1=next, -1=previous
    };

    if (typeof console !== 'undefined' && console.log) {
      console.log('[FixedAssets] Request data:', requestData);
    }
    try {
      const resp = await window.FixedAssetsService.getFADepreciationRates(requestData);
      if (typeof console !== 'undefined' && console.log) {
        console.log('[FixedAssets] API response:', resp);
        console.log('[FixedAssets] Full response JSON:', JSON.stringify(resp, null, 2));
        console.log('[FixedAssets] Response structure:', {
          success: resp?.success,
          hasData: !!resp?.data,
          hasDetails: !!resp?.Details,
          hasDataDetails: !!resp?.data?.Details,
          hasDataDetails01: !!resp?.data?.Details01,
          dataKeys: resp?.data ? Object.keys(resp.data) : [],
          topLevelKeys: resp ? Object.keys(resp) : []
        });
      }

      if (resp && resp.success) {
        // Try multiple possible data locations - prioritize Details01 which has actual record data
        let d = null;
        let dataArray = null;

        // Check Details01 FIRST - this contains the actual record data
        if (resp.data && Array.isArray(resp.data.Details01) && resp.data.Details01.length > 0) {
          dataArray = resp.data.Details01;
          console.log('[FixedAssets] Found data in resp.data.Details01');
        } else if (Array.isArray(resp.Details01) && resp.Details01.length > 0) {
          dataArray = resp.Details01;
          console.log('[FixedAssets] Found data in resp.Details01');
        } else if (resp.data && Array.isArray(resp.data) && resp.data.length > 0) {
          dataArray = resp.data;
          console.log('[FixedAssets] Found data in resp.data (array)');
        } else if (resp.data && typeof resp.data === 'object' && !Array.isArray(resp.data)) {
          // Data might be a single object, not an array
          d = resp.data;
          console.log('[FixedAssets] Found data as single object in resp.data');
        }
        // NOTE: We skip resp.data.Details and resp.Details because they contain audit info, not record data

        if (dataArray && dataArray.length > 0) {
          d = dataArray[0];
        }

        // Validate that d contains actual record data (has a valid DepreciationRateID)
        const hasValidData = d && (
          (d.DepreciationRateID && String(d.DepreciationRateID).trim() !== '') ||
          (d.RateID && String(d.RateID).trim() !== '')
        );

        if (hasValidData) {
          console.log('[FixedAssets] Data to bind:', d);
          bindDepreciationRatesToForm(d);
          state.isSearching = false;
          // Only show success if we actually loaded data
          if (typeof console !== 'undefined' && console.log) {
            console.log('[FixedAssets] Depreciation rates loaded and form populated');
          }
        } else {
          // No data found - preserve Rate ID before clearing
          const preservedRateId = qs('#RateId')?.value || '';
          
          if (searchingById) {
            // Record Not Found State - enable Add button
            state.isSearching = true;
            setToast("Record doesn't exist", "warning");
          } else {
            state.isSearching = false;
            setToast("No records found.", "info");
          }
          
          state.currentRecord = null;
          state.currentUpdateCount = 0;
          
          // Clear form fields except dropdowns
          if (qs('#RateId')) qs('#RateId').value = '';
          if (qs('#Description')) qs('#Description').value = '';
          
          // Clear audit fields
          const auditFields = ['CreatedBy', 'CreatedOn', 'ModifiedBy', 'ModifiedOn', 'SupervisedBy', 'SupervisedOn'];
          auditFields.forEach(id => {
            const el = qs(`#${id}`);
            if (el) {
              if (el.tagName === 'SPAN' || el.hasAttribute('data-field')) {
                el.textContent = '';
              } else {
                el.value = '';
              }
            }
          });
          
          // Restore the Rate ID after clearing so user can add a new record with this ID
          if (qs('#RateId') && preservedRateId) {
            qs('#RateId').value = preservedRateId;
          }
          
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('[FixedAssets] No depreciation rates found in response data');
          }
        }
      } else {
        // API call failed
        const preservedRateId = qs('#RateId')?.value || '';
        
        if (searchingById) {
          state.isSearching = true;
          setToast("Record doesn't exist", "warning");
        } else {
          state.isSearching = false;
          setToast(resp?.message || "Failed to load depreciation rates.", "danger");
        }
        
        state.currentRecord = null;
        state.currentUpdateCount = 0;
        
        // Clear form but preserve Rate ID
        if (qs('#Description')) qs('#Description').value = '';
        const auditFields = ['CreatedBy', 'CreatedOn', 'ModifiedBy', 'ModifiedOn', 'SupervisedBy', 'SupervisedOn'];
        auditFields.forEach(id => {
          const el = qs(`#${id}`);
          if (el) {
            if (el.tagName === 'SPAN' || el.hasAttribute('data-field')) {
              el.textContent = '';
            } else {
              el.value = '';
            }
          }
        });
        
        if (typeof console !== 'undefined' && console.error) {
          console.error('[FixedAssets] API call failed or returned no data', resp);
        }
      }
    } catch (err) {
      setToast("Error loading depreciation rates.", "danger");
      state.currentRecord = null;
      state.currentUpdateCount = 0;
      state.isSearching = false;
      if (typeof console !== 'undefined' && console.error) {
        console.error("[FixedAssets] View error", err);
      }
    } finally {
      updateActionState();
    }
  }

  // Helper: bind depreciation rates response to form fields
  function bindDepreciationRatesToForm(data) {
    if (!data || typeof data !== 'object') return;

    state.currentRecord = data;
    // Store UpdateCount from fetched record for use in add/edit/delete operations
    state.currentUpdateCount = data.UpdateCount ?? 0;
    console.log('[FixedAssets] Bound record data:', data);
    console.log('[FixedAssets] UpdateCount from fetched record:', state.currentUpdateCount);

    // Map API keys to form field IDs (matching actual API response structure)
    const map = {
      DepreciationRateID: 'RateId',           // API: DepreciationRateID -> Form: RateId
      RateID: 'RateId',                        // Fallback alias
      Description: 'Description',              // API: Description -> Form: Description
      DepreciationMethodID: 'DepreciationMethod', // API: DepreciationMethodID -> Form: DepreciationMethod (select)
      DepreciationMethod: 'DepreciationMethod',   // Fallback alias
      DepreciationRateTypeID: 'RateType',      // API: DepreciationRateTypeID -> Form: RateType (select)
      RateType: 'RateType',                    // Fallback alias
      CreatedBy: 'CreatedBy',
      CreatedOn: 'CreatedOn',
      ModifiedBy: 'ModifiedBy',
      ModifiedOn: 'ModifiedOn',
      SupervisedBy: 'SupervisedBy',
      SupervisedOn: 'SupervisedOn',
    };

    Object.keys(map).forEach(function (apiKey) {
      const fieldId = map[apiKey];
      const el = qs(`#${fieldId}`);
      if (!el) return;

      // Skip if API doesn't have this key
      if (!(apiKey in data)) return;

      // Do not overwrite RateId if it's already populated and the new value is missing
      if (fieldId === 'RateId' && el.value && (data[apiKey] == null || data[apiKey] === '')) {
        return;
      }

      let val = data[apiKey];

      // Format datetime values for display
      if ((fieldId.endsWith('On') || fieldId.includes('Date')) && val) {
        // Convert ISO date to readable format
        try {
          const date = new Date(val);
          if (!isNaN(date.getTime())) {
            val = date.toLocaleString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            });
          }
        } catch (e) {
          // Keep original value if parsing fails
        }
      }

      if (el.type === 'checkbox') {
        el.checked = !!val;
      } else if (el.tagName === "SELECT") {
        if (val != null) {
          el.value = val;
          // Robust selection: if ID doesn't match, try to match by option text
          if (el.selectedIndex === -1 || el.value !== String(val)) {
            const options = Array.from(el.options);
            const match = options.find(opt => opt.text.trim().toLowerCase() === String(val).trim().toLowerCase());
            if (match) el.value = match.value;
          }
        }
      } else if (el.tagName === 'SPAN' || el.hasAttribute('data-field')) {
        // For audit fields displayed as spans
        el.textContent = val == null ? '' : val;
      } else {
        el.value = val == null ? '' : val;
      }
    });

    console.log('[FixedAssets] Form bound with data:', {
      RateId: qs('#RateId')?.value,
      Description: qs('#Description')?.value,
      DepreciationMethod: qs('#DepreciationMethod')?.value,
      RateType: qs('#RateType')?.value
    });
  }

  // Remove bindActions, use event delegation below

  // Populate dropdown options from system codes
  async function populateDropdowns() {
    try {
      // Load LookupService if needed
      if (!window.LookupService) {
        if (window.ServiceLoader?.loadLookupService) {
          await window.ServiceLoader.loadLookupService();
        } else {
          console.error('[FixedAssets] LookupService not available');
          return;
        }
      }

      // Populate Depreciation Method dropdown
      const depMethodSelect = qs('#DepreciationMethod');
      if (depMethodSelect) {
        const methods = await window.LookupService.getDepreciationMethods();
        // Clear existing options except the first one (--Select--)
        depMethodSelect.innerHTML = '<option value="">--Select--</option>';
        methods.forEach(method => {
          const option = document.createElement('option');
          option.value = method.value;
          option.textContent = method.label;
          depMethodSelect.appendChild(option);
        });
        console.log('[FixedAssets] Depreciation methods loaded:', methods);
      }

      // Populate Rate Type dropdown
      const rateTypeSelect = qs('#RateType');
      if (rateTypeSelect) {
        const rateTypes = await window.LookupService.getDepreciationRateTypes();
        // Clear existing options except the first one (--Select--)
        rateTypeSelect.innerHTML = '<option value="">--Select--</option>';
        rateTypes.forEach(type => {
          const option = document.createElement('option');
          option.value = type.value;
          option.textContent = type.label;
          rateTypeSelect.appendChild(option);
        });
        console.log('[FixedAssets] Rate types loaded:', rateTypes);
      }
    } catch (err) {
      console.error('[FixedAssets] Error populating dropdowns:', err);
    }
  }

  // --- Event delegation for action buttons (like FundSourceMaintenance) ---
  document.addEventListener('click', async (e) => {
    // Rate ID search button
    const rateSearchBtn = e.target.closest('button[aria-label="Search Rate ID"]');
    if (rateSearchBtn) {
      e.preventDefault();
      console.log('[FADepRates] Search button clicked');
      
      const modalEl = ensureRateSearchModal();
      console.log('[FADepRates] Modal element created/found:', modalEl?.id);
      
      // Clear filter inputs to load all records
      const idInput = qs('#faDepRateSearchId');
      if (idInput) idInput.value = '';
      const descInput = qs('#faDepRateSearchDesc');
      if (descInput) descInput.value = '';

      if (window.bootstrap?.Modal) {
        console.log('[FADepRates] Bootstrap Modal available, showing modal');
        const instance = window.bootstrap.Modal.getOrCreateInstance(modalEl);
        instance.show();
      } else {
        console.error('[FADepRates] Bootstrap Modal not available!');
        setToast('Bootstrap Modal not available.', 'danger');
        return;
      }

      // Bind modal events once
      if (!modalEl.__kairoBound) {
        modalEl.__kairoBound = true;
        modalEl.addEventListener('shown.bs.modal', () => {
          qs('#faDepRateSearchId')?.focus();
        });

        qs('#faDepRateSearchGo')?.addEventListener('click', runRateIdSearch);
        const enterToSearch = (evt) => {
          if (evt.key === 'Enter') {
            evt.preventDefault();
            runRateIdSearch();
          }
        };
        qs('#faDepRateSearchId')?.addEventListener('keydown', enterToSearch);
        qs('#faDepRateSearchDesc')?.addEventListener('keydown', enterToSearch);

        qs('#faDepRateSearchOk')?.addEventListener('click', async () => {
          await confirmSelectedRate(modalEl);
        });

        // Row click to select
        qs('#faDepRateSearchResults')?.addEventListener('click', (evt) => {
          const tr = evt.target.closest('tr[data-idx]');
          if (!tr) return;
          setSelectedSearchIndex(modalEl, Number(tr.getAttribute('data-idx')));
        });

        // Double-click to select and confirm
        qs('#faDepRateSearchResults')?.addEventListener('dblclick', async (evt) => {
          const tr = evt.target.closest('tr[data-idx]');
          if (!tr) return;
          setSelectedSearchIndex(modalEl, Number(tr.getAttribute('data-idx')));
          await confirmSelectedRate(modalEl);
        });
      }

      // Auto-load all rate IDs when modal opens (empty search = get all)
      await runRateIdSearch();
      return;
    }

    const action = isActionButton(e.target);
    if (!action) return;
    if (action.btn.disabled) return;
    e.preventDefault();

    if (action.text === 'add') {
      // Preserve the Rate ID that was entered
      const preservedRateId = qs('#RateId')?.value || '';
      
      state.mode = MODES.ADD;
      state.currentRecord = null;
      state.currentUpdateCount = 0; // Reset for new record
      state.isSearching = false;
      
      // Clear form fields except dropdowns (matching cancel behavior)
      if (qs('#RateId')) qs('#RateId').value = '';
      if (qs('#Description')) qs('#Description').value = '';
      
      // Clear audit fields
      const auditFields = ['CreatedBy', 'CreatedOn', 'ModifiedBy', 'ModifiedOn', 'SupervisedBy', 'SupervisedOn'];
      auditFields.forEach(id => {
        const el = qs(`#${id}`);
        if (el) {
          if (el.tagName === 'SPAN' || el.hasAttribute('data-field')) {
            el.textContent = '';
          } else {
            el.value = '';
          }
        }
      });
      
      // Restore the Rate ID after clearing
      if (qs('#RateId') && preservedRateId) {
        qs('#RateId').value = preservedRateId;
      }
      
      updateActionState();
      setToast('Add mode active', 'info');
      return;
    }
    if (action.text === 'edit' || action.text === 'update') {
      if (state.mode === MODES.UPDATE) {
        // Already in edit mode, ignore duplicate clicks
        return;
      }
      if (!state.currentRecord) {
        setToast('Load a record first (click View), then Edit.', 'warning');
        return;
      }
      setMode(MODES.UPDATE);
      setToast('Edit mode active', 'info');
      return;
    }
    if (action.text === 'cancel') {
      // If editing, revert to last loaded data
      if (state.mode === MODES.UPDATE && state.currentRecord) {
        bindDepreciationRatesToForm(state.currentRecord);
        setMode(MODES.VIEW);
        setToast('Edit cancelled. Record restored.', 'info');
        return;
      }
      // Otherwise, clear form fields except DepreciationMethod and RateType
      // Preserve dropdown values before clearing
      const preservedMethod = qs('#DepreciationMethod')?.value || '';
      const preservedRateType = qs('#RateType')?.value || '';
      
      // Clear individual fields instead of form.reset()
      if (qs('#RateId')) qs('#RateId').value = '';
      if (qs('#Description')) qs('#Description').value = '';
      
      // Clear audit fields
      const auditFields = ['CreatedBy', 'CreatedOn', 'ModifiedBy', 'ModifiedOn', 'SupervisedBy', 'SupervisedOn'];
      auditFields.forEach(id => {
        const el = qs(`#${id}`);
        if (el) {
          if (el.tagName === 'SPAN' || el.hasAttribute('data-field')) {
            el.textContent = '';
          } else {
            el.value = '';
          }
        }
      });
      
      // Restore preserved dropdown values
      if (qs('#DepreciationMethod')) qs('#DepreciationMethod').value = preservedMethod;
      if (qs('#RateType')) qs('#RateType').value = preservedRateType;
      
      state.currentRecord = null;
      state.currentUpdateCount = 0;
      state.isSearching = false;
      setMode(MODES.VIEW);
      setToast('Screen cleared', 'success');
      return;
    }
    if (action.text === 'save') {
      // Prevent duplicate save operations
      if (state.isProcessing) {
        console.log('[FixedAssetDepRates] Save already in progress, ignoring duplicate click');
        return;
      }
      if (state.mode === MODES.VIEW) {
        setToast('Switch to Add/Edit before saving.', 'warning');
        return;
      }
      
      // Validate mandatory fields
      const rateId = (qs('#RateId')?.value || '').trim();
      const description = (qs('#Description')?.value || '').trim();
      const depMethod = (qs('#DepreciationMethod')?.value || '').trim();
      const rateType = (qs('#RateType')?.value || '').trim();
      
      // All fields are mandatory in Add mode
      if (!rateId) {
        setToast('Rate ID is required.', 'warning');
        qs('#RateId')?.focus();
        return;
      }
      if (!description) {
        setToast('Description is required.', 'warning');
        qs('#Description')?.focus();
        return;
      }
      if (!depMethod) {
        setToast('Depreciation Method is required.', 'warning');
        qs('#DepreciationMethod')?.focus();
        return;
      }
      if (!rateType) {
        setToast('Rate Type is required.', 'warning');
        qs('#RateType')?.focus();
        return;
      }
      
      // Lock to prevent duplicate operations
      state.isProcessing = true;
      action.btn.disabled = true;
      
      // Format date as MM/DD/YYYY HH:mm:ss for API
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const operatedOn = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      
      const session = getSessionSafe();
      const operatorId = session?.operatorId || 'CSADM';
      
      console.log('[FixedAssetDepRates] Save state:', {
        mode: state.mode,
        isAddMode: state.mode === MODES.ADD,
        currentUpdateCount: state.currentUpdateCount,
        currentRecord: state.currentRecord
      });
      
      // UpdateCount: 1 for INSERT (new record), currentUpdateCount for UPDATE
      // This matches FundSourceMaintenance pattern: NewRecord: mode === 'add' ? 1 : currentUpdateCount
      // But this stored procedure uses UpdateCount instead of NewRecord
      const updateCountValue = state.mode === MODES.ADD ? 1 : (state.currentUpdateCount || 0);
      
      const requestData = {
        BankID: window.Environment?.defaultBankId || '00',
        DepreciationRateID: rateId,
        Description: description,
        DepreciationMethodID: depMethod,
        DepreciationRateTypeID: rateType,
        OperatedBy: operatorId,
        OperatedOn: operatedOn,
        SupervisedBy: '',
        UpdateCount: updateCountValue
      };
      
      console.log('[FixedAssetDepRates] Save requestData:', requestData);
      
      try {
        if (!window.FixedAssetsService) {
          if (window.ServiceLoader?.loadFixedAssetsService) {
            await window.ServiceLoader.loadFixedAssetsService();
          } else {
            setToast('FixedAssetsService not available.', 'danger');
            state.isProcessing = false;
            updateActionState();
            return;
          }
        }
        setToast('Saving...', 'info');
        const resp = await window.FixedAssetsService.addEditFADepRates(requestData);
        if (resp && resp.success) {
          setToast('Save successful', 'success');
          // Clear the form and reset to default state
          clearForm();
          state.currentRecord = null;
          state.currentUpdateCount = 0;
          state.isSearching = false;
          setMode(MODES.VIEW);
        } else {
          setToast(resp?.message || 'Failed to save depreciation rate.', 'danger');
        }
      } catch (err) {
        setToast('Error saving depreciation rate.', 'danger');
        if (typeof console !== 'undefined' && console.error) {
          console.error('[FixedAssetDepRates] Save error', err);
        }
      } finally {
        state.isProcessing = false;
        updateActionState();
      }
      return;
    }
    if (action.text === 'delete') {
      // Prevent duplicate delete operations
      if (state.isProcessing) {
        console.log('[FixedAssetDepRates] Delete already in progress, ignoring duplicate click');
        return;
      }
      const rateId = (qs('#RateId')?.value || '').trim();
      if (!rateId) {
        setToast('No record selected to delete.', 'warning');
        return;
      }
      if (!confirm('Are you sure you want to delete this Depreciation Rate?')) {
        return;
      }
      
      // Lock to prevent duplicate operations
      state.isProcessing = true;
      action.btn.disabled = true;
      
      const requestData = {
        BankID: window.Environment?.defaultBankId || '00',
        DepreciationRateID: rateId,
        UpdateCount: state.currentUpdateCount || 0 // Use currentUpdateCount for concurrency check
      };
      try {
        if (!window.FixedAssetsService) {
          if (window.ServiceLoader?.loadFixedAssetsService) {
            await window.ServiceLoader.loadFixedAssetsService();
          } else {
            setToast('FixedAssetsService not available.', 'danger');
            state.isProcessing = false;
            updateActionState();
            return;
          }
        }
        setToast('Deleting...', 'info');
        const resp = await window.FixedAssetsService.deleteFADepRates(requestData);
        console.log('[FixedAssetDepRates] Delete response:', resp);
        if (resp && resp.success) {
          setToast('Depreciation Rate deleted successfully.', 'success');
          
          // Clear form fields except dropdowns
          if (qs('#RateId')) qs('#RateId').value = '';
          if (qs('#Description')) qs('#Description').value = '';
          
          // Clear audit fields
          const auditFields = ['CreatedBy', 'CreatedOn', 'ModifiedBy', 'ModifiedOn', 'SupervisedBy', 'SupervisedOn'];
          auditFields.forEach(id => {
            const el = qs(`#${id}`);
            if (el) {
              if (el.tagName === 'SPAN' || el.hasAttribute('data-field')) {
                el.textContent = '';
              } else {
                el.value = '';
              }
            }
          });
          
          state.currentRecord = null;
          state.currentUpdateCount = 0;
          state.isSearching = false;
          setMode(MODES.VIEW);
        } else {
          setToast(resp?.message || 'Failed to delete depreciation rate.', 'danger');
        }
      } catch (err) {
        setToast('Error deleting depreciation rate.', 'danger');
        if (typeof console !== 'undefined' && console.error) {
          console.error('[FixedAssetDepRates] Delete error', err);
        }
      } finally {
        state.isProcessing = false;
        updateActionState();
      }
      return;
    }
    if (action.text === 'view') {
      // Prevent duplicate view operations
      if (state.isProcessing) {
        console.log('[FixedAssetDepRates] View already in progress, ignoring duplicate click');
        return;
      }
      state.isProcessing = true;
      action.btn.disabled = true;
      
      try {
        await loadAndPopulateDepreciationRates(0);
        setMode(MODES.VIEW);
      } finally {
        state.isProcessing = false;
        updateActionState();
      }
      return;
    }
  });

  window.addEventListener('load', () => {
    bindNav();
    setMode(MODES.VIEW);
    populateDropdowns();
  });
})();
