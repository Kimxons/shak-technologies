function qs(sel, root = document) {
  return root.querySelector(sel);
}

function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

// --- Account ID Search Modal Logic ---
function openAccountIdSearchModal() {
  // Create modal HTML if not present
  let modal = document.getElementById('fa-type-accountid-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'fa-type-accountid-modal';
    modal.innerHTML = `
        <style>
          @media (max-width: 700px) {
            #fa-type-accountid-modal .modal-dialog {
              min-width: 95vw !important;
              padding: 0.5rem !important;
            }
            #fa-type-accountid-modal .modal-dialog form > div {
              flex-direction: column !important;
              gap: 0.5rem !important;
              align-items: stretch !important;
            }
          }
        </style>
        <div class="modal-backdrop" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.2);z-index:10000;"></div>
        <div class="modal-dialog" style="position:fixed;top:10vh;left:50%;transform:translateX(-50%);z-index:10001;background:#fff;padding:1.5rem;border-radius:8px;min-width:600px;max-width:98vw;box-shadow:0 2px 16px #0002;">
          <h5>GL Active</h5>
          <form id="fa-type-search-form" autocomplete="off" style="margin-bottom:1rem;">
            <div style="display:flex;flex-wrap:wrap;gap:1rem;align-items:center;">
              <label style="min-width:110px;">Account ID <select id="fa-type-search-accountid-op"><option value="Like">Like</option></select></label>
              <input type="text" id="fa-type-search-accountid" style="width:120px;max-width:100%;" />
              <label style="min-width:110px;">Description <select id="fa-type-search-desc-op"><option value="Like">Like</option></select></label>
              <input type="text" id="fa-type-search-desc" style="width:180px;max-width:100%;" />
              <label style="min-width:130px;">GL Account Type <select id="fa-type-search-type-op"><option value="Like">Like</option></select></label>
              <input type="text" id="fa-type-search-type" style="width:120px;max-width:100%;" />
              <button type="submit" id="fa-type-search-btn">Search</button>
            </div>
          </form>
          <div id="fa-type-search-results" style="max-height:250px;overflow:auto;border:1px solid #eee;"></div>
          <div style="text-align:right;margin-top:1rem;">
            <button id="fa-type-search-ok" disabled>OK</button>
            <button id="fa-type-search-cancel">Cancel</button>
          </div>
        </div>
      `;
    document.body.appendChild(modal);

  } else {
    modal.style.display = '';
  }

  // Ensure all modal input fields and the search button are enabled (in case global logic disables them)
  const modalInputs = modal.querySelectorAll('input, select, textarea, button');
  modalInputs.forEach(input => { input.disabled = false; });
  // Specifically ensure the search button is enabled
  const searchBtn = modal.querySelector('#fa-type-search-btn');
  if (searchBtn) searchBtn.disabled = false;

  // Cancel button closes modal
  modal.querySelector('#fa-type-search-cancel').onclick = () => { modal.style.display = 'none'; };

  // Search logic
  const form = modal.querySelector('#fa-type-search-form');
  const resultsDiv = modal.querySelector('#fa-type-search-results');
  let selectedRow = null;
  form.onsubmit = async (e) => {
    e.preventDefault();
    resultsDiv.innerHTML = 'Searching...';
    const accountId = modal.querySelector('#fa-type-search-accountid').value.trim();
    const desc = modal.querySelector('#fa-type-search-desc').value.trim();
    const type = modal.querySelector('#fa-type-search-type').value.trim();
    // Build AdvFilterString as per sample
    let advFilter = `BankID='00' AND GLCategoryID<>''Main'' AND GLCategoryID='CONT'`;
    if (accountId) advFilter += ` AND AccountID LIKE '%${accountId}%'`;
    if (desc) advFilter += ` AND Description LIKE '%${desc}%'`;
    if (type) advFilter += ` AND GLAccountTypeID LIKE '%${type}%'`;

    const request = {
      RequestID: "dbo.p_GetSearchResult",
      FormId: "dbo.p_GetSearchResult",
      RequestData: {
        TableID: "GLActiveID",
        AdvFilterString: advFilter,
        WhereStmt: '',
        PrevOrNext: 0,
        RefID: null,
        OperatorID: window.AuthService?.getSession?.().operatorId || 'TERESA_NYAATA',
        ModuleID: 8155,
        OurBranchID: window.Environment?.defaultOurBranchId || '0101',
        SearchKey: '',
        LanguageID: 'en'
      },
      RequestTime: new Date().toLocaleString("en-GB", { hour12: false }),
      AppName: "PROJECT_KAIRO",
      Checksum: ''
    };

    try {
      if (!window.SearchService) {
        resultsDiv.innerHTML = '<span style="color:red">SearchService not loaded</span>';
        return;
      }
      const resp = await window.SearchService.search(request.RequestData);
      if (resp && resp.success && resp.data && Array.isArray(resp.data.Details)) {
        const rows = resp.data.Details;
        if (rows.length === 0) {
          resultsDiv.innerHTML = '<div style="padding:1rem;color:#888;">No results found.</div>';
        } else {
          let html = `<table style="width:100%;border-collapse:collapse;">`;
          html += `<thead><tr style="background:#f5f5f5;"><th>AccountID</th><th>Description</th><th>GLAccountTypeID</th></tr></thead><tbody>`;
          rows.forEach((row, idx) => {
            html += `<tr data-row="${idx}" tabindex="0" style="cursor:pointer;">
                <td>${row.AccountID || ''}</td>
                <td>${row.Description || ''}</td>
                <td>${row.GLAccountTypeID || ''}</td>
              </tr>`;
          });
          html += `</tbody></table>`;
          resultsDiv.innerHTML = html;
          // Row selection
          resultsDiv.querySelectorAll('tr[data-row]').forEach(tr => {
            tr.onclick = () => {
              if (selectedRow) selectedRow.classList.remove('selected');
              selectedRow = tr;
              selectedRow.classList.add('selected');
              modal.querySelector('#fa-type-search-ok').disabled = false;
            };
          });
        }
      } else {
        resultsDiv.innerHTML = '<span style="color:red">No results or error in response</span>';
      }
    } catch (err) {
      resultsDiv.innerHTML = `<span style="color:red">Error: ${err.message}</span>`;
    }
  };

  // OK button populates Account ID and Account Name fields on the main form
  modal.querySelector('#fa-type-search-ok').onclick = () => {
    if (!selectedRow) return;
    const tds = selectedRow.querySelectorAll('td');

    const pickedAccountId = tds[0] ? tds[0].textContent.trim() : '';
    const pickedDescription = tds[1] ? tds[1].textContent.trim() : '';

    const accountIdInput = qs('#AccountId');
    if (accountIdInput) {
      accountIdInput.value = pickedAccountId;
      accountIdInput.dispatchEvent(new Event('input', { bubbles: true }));
      accountIdInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const accountNameInput = qs('#AccountName');
    if (accountNameInput) {
      accountNameInput.value = pickedDescription;
      accountNameInput.dispatchEvent(new Event('input', { bubbles: true }));
      accountNameInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    modal.style.display = 'none';
  };
}
// Bind Account ID search button if present
window.addEventListener("load", () => {
  const accountIdSearchBtn = qs('.fa-gl-search');
  if (accountIdSearchBtn) {
    accountIdSearchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openAccountIdSearchModal();
    });
  }
});
(() => {
  if (window.__kairoFixedAssetTypeLoaded) return;
  window.__kairoFixedAssetTypeLoaded = true;

  // --- Helper Functions ---
  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  // --- Fixed Asset Type Search Modal ---
  function ensureSearchService() {
    if (window.SearchService) return window.SearchService;
    if (window.ServiceLoader?.loadSearchService) {
      window.ServiceLoader.loadSearchService();
      return window.SearchService;
    }
    return null;
  }

  function ensureFATypeSearchModal() {
    const existing = qs('#faTypeSearchModal');
    if (existing) return existing;

    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'faTypeSearchModal';
    modal.tabIndex = -1;
    modal.setAttribute('aria-labelledby', 'faTypeSearchModalLabel');
    modal.setAttribute('aria-hidden', 'true');

    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered" style="max-width: 700px; margin: 1.75rem auto; display: flex; align-items: center; min-height: calc(100% - 3.5rem);">
        <div class="modal-content" style="border: none; border-radius: 0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.3); width: 100%;">
          <!-- Header - Dark Blue -->
          <div class="modal-header" style="background: #337ab7; border: none; padding: 12px 16px; border-radius: 0;">
            <h6 class="modal-title mb-0" id="faTypeSearchModalLabel" style="color: #fff; font-weight: 500; font-size: 15px;">Find Fixed Asset Type</h6>
            <button type="button" style="background: transparent; border: none; color: #fff; font-size: 20px; cursor: pointer; padding: 0; line-height: 1;" onclick="document.querySelector('.fatype-modal-backdrop')?.click()">&times;</button>
          </div>
          
          <!-- Body -->
          <div class="modal-body" style="background: #fff; padding: 20px 24px;">
            <!-- Filter Form -->
            <form data-lookup-form>
              <!-- Filter Row - Two columns -->
              <div style="display: flex; gap: 24px; margin-bottom: 16px;">
                <!-- Type ID Filter -->
                <div style="flex: 1;">
                  <label style="display: block; font-size: 13px; color: #333; margin-bottom: 6px;">Type ID</label>
                  <div style="display: flex; gap: 8px;">
                    <select class="form-select" data-lookup-mode="FixedAssetTypeID" style="width: 80px; height: 36px; padding: 4px 8px; font-size: 13px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff;">
                      <option value="Like" selected>Like</option>
                      <option value="Exact">Exact</option>
                    </select>
                    <input type="text" class="form-control" data-lookup-field="FixedAssetTypeID" placeholder="Enter Type ID" style="flex: 1; height: 36px; padding: 4px 10px; font-size: 13px; border: 1px solid #ccc; border-radius: 4px;" />
                  </div>
                </div>
                <!-- Description Filter -->
                <div style="flex: 1;">
                  <label style="display: block; font-size: 13px; color: #333; margin-bottom: 6px;">Description</label>
                  <div style="display: flex; gap: 8px;">
                    <select class="form-select" data-lookup-mode="Description" style="width: 80px; height: 36px; padding: 4px 8px; font-size: 13px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff;">
                      <option value="Like" selected>Like</option>
                      <option value="Exact">Exact</option>
                    </select>
                    <input type="text" class="form-control" data-lookup-field="Description" placeholder="Enter Description" style="flex: 1; height: 36px; padding: 4px 10px; font-size: 13px; border: 1px solid #ccc; border-radius: 4px;" />
                  </div>
                </div>
              </div>
              
              <!-- Search Button - Centered -->
              <div class="text-center mb-4">
                <button type="submit" class="btn" data-lookup-submit style="background-color: #5a6268; border: 1px solid #545b62; color: #fff; min-width: 100px; font-size: 14px; padding: 6px 20px; border-radius: 4px;">
                  Search
                </button>
              </div>
            </form>
            
            <!-- Results Table -->
            <div style="border: 1px solid #ddd; border-radius: 0; overflow: hidden;">
              <div class="table-responsive" style="max-height: 220px; overflow-y: auto;">
                <table class="table table-sm align-middle mb-0" style="font-size: 13px;">
                  <thead style="background: #337ab7; position: sticky; top: 0;">
                    <tr>
                      <th style="width: 40px; padding: 10px 12px; font-weight: 600; color: #fff; border: none;">#</th>
                      <th style="padding: 10px 12px; font-weight: 600; color: #fff; border: none;">Type ID</th>
                      <th style="padding: 10px 12px; font-weight: 600; color: #fff; border: none;">Description</th>
                    </tr>
                  </thead>
                  <tbody data-lookup-results></tbody>
                </table>
              </div>
              
              <!-- Empty State -->
              <div class="text-muted text-center py-3 d-none" data-lookup-empty style="font-size: 13px;">
                No records found.
              </div>
              
              <!-- Loading State -->
              <div class="d-none text-center py-3" data-lookup-loading>
                <span style="font-size: 13px;">Loading...</span>
              </div>
            </div>
            
            <!-- Results count -->
            <div class="mt-2" data-lookup-status style="font-size: 12px; color: #666;"></div>
          </div>
          
          <!-- Footer - Dark Blue with OK button -->
          <div class="modal-footer justify-content-center" style="background: #337ab7; border: none; padding: 12px 20px; border-radius: 0;">
            <button type="button" class="btn" data-lookup-ok style="background-color: #6c757d; border: 1px solid #6c757d; color: #fff; min-width: 80px; font-size: 14px; padding: 6px 20px; border-radius: 4px;">OK</button>
          </div>
        </div>
      </div>`;

    // Add custom styles for row selection and hover
    const style = document.createElement('style');
    style.textContent = `
      #faTypeSearchModal { z-index: 10500 !important; }
      #faTypeSearchModal + .modal-backdrop { z-index: 10499 !important; }
      #faTypeSearchModal [data-lookup-results] tr { cursor: pointer; transition: background-color 0.1s; }
      #faTypeSearchModal [data-lookup-results] tr:nth-child(odd) { background-color: #fff; }
      #faTypeSearchModal [data-lookup-results] tr:nth-child(even) { background-color: #f9f9f9; }
      #faTypeSearchModal [data-lookup-results] tr:hover { background-color: #e8f4fc !important; }
      #faTypeSearchModal [data-lookup-results] tr.table-active { background-color: #337ab7 !important; color: #fff; }
    `;
    modal.appendChild(style);

    document.body.appendChild(modal);
    return modal;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function pickTypeId(row) {
    if (!row) return '';
    return row.FixedAssetTypeID || row.fixedAssetTypeID || row.TypeID || row.typeID || row.ID || '';
  }

  function pickTypeDescription(row) {
    if (!row) return '';
    return row.Description || row.description || '';
  }

  function normalizeSearchRows(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.Details && Array.isArray(data.Details)) return data.Details;
    if (data.Details01 && Array.isArray(data.Details01)) return data.Details01;
    return [];
  }

  function collectSearchFilters(modalEl) {
    const filters = {};
    
    modalEl.querySelectorAll('[data-lookup-field]').forEach(input => {
      const fieldName = input.getAttribute('data-lookup-field');
      const value = input.value.trim();
      const modeSelect = modalEl.querySelector(`[data-lookup-mode="${fieldName}"]`);
      const mode = modeSelect ? modeSelect.value : 'Like';
      
      if (value) {
        filters[fieldName] = { value, mode };
      }
    });
    
    return filters;
  }

  function hasAtLeastOneFilter(filters) {
    return Object.keys(filters).length > 0;
  }

  function showSearchLoading(modalEl, show) {
    const loading = modalEl.querySelector('[data-lookup-loading]');
    const empty = modalEl.querySelector('[data-lookup-empty]');
    const results = modalEl.querySelector('[data-lookup-results]');
    const status = modalEl.querySelector('[data-lookup-status]');
    
    if (show) {
      loading?.classList.remove('d-none');
      empty?.classList.add('d-none');
      if (results) results.innerHTML = '';
      if (status) status.textContent = '';
    } else {
      loading?.classList.add('d-none');
    }
  }

  function showSearchEmpty(modalEl, message = 'No records found matching your search criteria.') {
    const empty = modalEl.querySelector('[data-lookup-empty]');
    const loading = modalEl.querySelector('[data-lookup-loading]');
    const results = modalEl.querySelector('[data-lookup-results]');
    const status = modalEl.querySelector('[data-lookup-status]');
    
    // Hide loading first
    loading?.classList.add('d-none');
    
    if (results) results.innerHTML = '';
    if (status) status.textContent = '';
    if (empty) {
      empty.textContent = message;
      empty.classList.remove('d-none');
    }
  }

  function renderSearchResults(modalEl, rows) {
    const tbody = modalEl.querySelector('[data-lookup-results]');
    const empty = modalEl.querySelector('[data-lookup-empty]');
    const loading = modalEl.querySelector('[data-lookup-loading]');
    const status = modalEl.querySelector('[data-lookup-status]');
    
    if (!tbody) return;
    
    // Hide loading and empty states
    loading?.classList.add('d-none');
    empty?.classList.add('d-none');

    tbody.innerHTML = rows.map((row, idx) => `
      <tr data-idx="${idx}" data-row='${JSON.stringify(row).replace(/'/g, "&#39;")}'>
        <td style="padding: 8px 12px; border: none;">${idx + 1}</td>
        <td style="padding: 8px 12px; border: none;">${escapeHtml(pickTypeId(row))}</td>
        <td style="padding: 8px 12px; border: none;">${escapeHtml(pickTypeDescription(row))}</td>
      </tr>
    `).join('');
    
    // Update status
    if (status) {
      status.textContent = `${rows.length} result(s) found.`;
    }
    
    // Store rows for selection
    modalEl.__searchRows = rows;
    modalEl.__selectedIdx = null;
  }

  async function performFATypeSearch(modalEl, loadAll = false) {
    const filters = collectSearchFilters(modalEl);
    
    const session = window.AuthService?.getSession?.() || {};
    const branchId = session.branchId || window.Environment?.defaultOurBranchId || '0101';
    const operatorId = session.operatorId || 'CSADM';

    const esc = (s) => String(s).replace(/'/g, "''");

    // Build WhereStmt for search filters
    const conditions = [];
    if (filters.FixedAssetTypeID) {
      const { value, mode } = filters.FixedAssetTypeID;
      if (mode === 'Exact') conditions.push(`FixedAssetTypeID='${esc(value)}'`);
      else conditions.push(`FixedAssetTypeID LIKE '%${esc(value)}%'`);
    }
    if (filters.Description) {
      const { value, mode } = filters.Description;
      if (mode === 'Exact') conditions.push(`Description='${esc(value)}'`);
      else conditions.push(`Description LIKE '%${esc(value)}%'`);
    }
    const whereStmt = conditions.join(' AND ');

    // Build request using dbo.p_GetSearchResult pattern
    const requestData = {
      TableID: 'FixedAssetTypeID',
      AdvFilterString: '',
      WhereStmt: whereStmt,
      PrevOrNext: 0,
      RefID: '',
      OperatorID: operatorId,
      ModuleID: 8400,
      OurBranchID: branchId,
      SearchKey: filters.FixedAssetTypeID?.value || '',
      LanguageID: 'en'
    };

    try {
      // Show loading state
      showSearchLoading(modalEl, true);

      if (!window.CoreApi) {
        console.error('[FAType] CoreApi not available');
        showSearchEmpty(modalEl, 'API service not available.');
        return;
      }

      const baseUrl = window.Environment?.baseUrlCommon || window.Environment?.baseUrlFixedAssets || 'http://localhost:3306';
      const envelope = window.CoreApi.makeRequestEnvelope('dbo.p_GetSearchResult', requestData);
      const resp = await window.CoreApi.post(`${baseUrl.replace(/\/+$/, '')}/api/OldAPI`, envelope);

      console.log('[FAType] Search response:', resp);

      if (!resp?.success) {
        showSearchEmpty(modalEl, resp?.message || 'Search failed.');
        return;
      }

      let rows = normalizeSearchRows(resp.data);
      
      // Client-side filter for exact match if specified
      if (filters.FixedAssetTypeID?.mode === 'Exact') {
        const key = filters.FixedAssetTypeID.value.toLowerCase();
        rows = rows.filter((r) => String(pickTypeId(r) || '').trim().toLowerCase() === key);
      }
      if (filters.Description?.mode === 'Exact') {
        const key = filters.Description.value.toLowerCase();
        rows = rows.filter((r) => String(pickTypeDescription(r) || '').trim().toLowerCase() === key);
      }

      if (rows.length === 0) {
        showSearchEmpty(modalEl, 'No records found.');
      } else {
        renderSearchResults(modalEl, rows);
      }

    } catch (err) {
      console.error('[FAType] Search error:', err);
      showSearchEmpty(modalEl, err?.message || 'Search error occurred.');
    } finally {
      showSearchLoading(modalEl, false);
    }
  }

  function selectSearchRow(modalEl, idx) {
    const rows = modalEl.__searchRows || [];
    const row = rows[idx];
    
    if (!row) {
      setToast('Please select a valid row.', 'warning');
      return;
    }
    
    const typeId = String(pickTypeId(row) || '').trim();
    if (!typeId) {
      setToast('Invalid record selected.', 'warning');
      return;
    }

    // Close modal - try Bootstrap first, then fallback
    if (window.bootstrap?.Modal) {
      const instance = window.bootstrap.Modal.getInstance(modalEl);
      if (instance) {
        instance.hide();
      } else {
        hideModalManually(modalEl);
      }
    } else {
      hideModalManually(modalEl);
    }

    // Set the Type ID in the form
    const typeIdInput = qs('#FixedAssetType');
    if (typeIdInput) typeIdInput.value = typeId;
    
    // Load the full record
    loadAndPopulateFATypes();
  }

  function openFATypeSearchModal() {
    const modalEl = ensureFATypeSearchModal();
    
    // Clear filter inputs but don't reset results yet (will load all)
    modalEl.querySelectorAll('[data-lookup-field]').forEach(input => {
      input.value = '';
    });
    modalEl.querySelectorAll('[data-lookup-mode]').forEach(select => {
      select.value = 'Like';
    });

    // Wire up event handlers once
    if (!modalEl.__kairoBound) {
      modalEl.__kairoBound = true;
      
      // Form submit handler
      const form = modalEl.querySelector('[data-lookup-form]');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          performFATypeSearch(modalEl);
        });
      }

      // OK button - confirms selection
      const okBtn = modalEl.querySelector('[data-lookup-ok]');
      if (okBtn) {
        okBtn.addEventListener('click', () => {
          const selectedIdx = modalEl.__selectedIdx;
          if (selectedIdx !== null && selectedIdx !== undefined) {
            selectSearchRow(modalEl, selectedIdx);
          } else {
            setToast('Please select a row first.', 'warning');
          }
        });
      }

      // Row click for highlighting and selection
      const tbody = modalEl.querySelector('[data-lookup-results]');
      if (tbody) {
        tbody.addEventListener('click', (e) => {
          const tr = e.target.closest('tr[data-idx]');
          if (tr) {
            // Remove active class from all rows
            tbody.querySelectorAll('tr').forEach(row => row.classList.remove('table-active'));
            tr.classList.add('table-active');
            // Store selected index
            modalEl.__selectedIdx = parseInt(tr.getAttribute('data-idx'), 10);
          }
        });
        
        // Double-click to select and confirm
        tbody.addEventListener('dblclick', (e) => {
          const tr = e.target.closest('tr[data-idx]');
          if (tr) {
            const idx = parseInt(tr.getAttribute('data-idx'), 10);
            selectSearchRow(modalEl, idx);
          }
        });
      }
      
      // Enter key to search in filter fields
      modalEl.querySelectorAll('[data-lookup-field]').forEach(input => {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            performFATypeSearch(modalEl);
          }
        });
      });
    }

    // Show modal - use manual approach for consistent behavior
    console.log('[FAType] Opening search modal');
    showModalManually(modalEl);
  }

  function hideModalManually(modalEl) {
    modalEl.style.cssText = '';
    modalEl.style.display = 'none';
    modalEl.classList.remove('show');
    modalEl.setAttribute('aria-hidden', 'true');
    
    // Remove backdrop
    const backdrop = document.querySelector('.fatype-modal-backdrop');
    if (backdrop) backdrop.remove();
    
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
  }

  function showModalManually(modalEl) {
    // Add backdrop
    let backdrop = document.querySelector('.fatype-modal-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'fatype-modal-backdrop';
      backdrop.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);z-index:10499;';
      backdrop.addEventListener('click', () => {
        hideModalManually(modalEl);
      });
      document.body.appendChild(backdrop);
    }
    
    // Style modal for proper centered popup display
    modalEl.style.cssText = `
      display: block !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      z-index: 10500 !important;
      overflow-x: hidden;
      overflow-y: auto;
      background: transparent;
    `;
    modalEl.classList.add('show');
    modalEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    
    // Auto-load all records
    performFATypeSearch(modalEl, true);
  }

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  const state = {
    mode: MODES.VIEW,
    currentUpdateCount: 0,
    currentRecord: null,
    originalSalvageRate: null,      // Track original salvage rate from loaded record
    salvageRateEdited: false,       // Track if salvage rate has been edited in this session
  };

  function getOperatorId() {
    try {
      const session = window.AuthService?.getSession?.();
      return session?.operatorId || session?.operatorID || session?.OperatorID || 'CSADM';
    } catch {
      return 'CSADM';
    }
  }

  function formatSmallDateTime(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function setToast(message, variant = "info") {
    // Always use kairo-toast which has proper CSS styling in styles.css
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
    
    console.log(`[FixedAssetType] Toast (${variant}): ${message}`);
  }

  // Real-time validation for Salvage Rate field
  function setupSalvageRateValidation() {
    const salvageRateInput = qs('#SalvageRate');
    const rateMenuSelect = qs('#RateMenu');
    if (!salvageRateInput) return;
    
    // Range validation (0-100)
    salvageRateInput.addEventListener('input', function() {
      const value = parseFloat(this.value);
      if (this.value !== '' && (isNaN(value) || value < 0 || value > 100)) {
        setToast("Salvage Rate should be in the Range 0 to 100", "warning");
        this.classList.add('is-invalid');
      } else {
        this.classList.remove('is-invalid');
      }
    });
    
    salvageRateInput.addEventListener('blur', function() {
      const value = parseFloat(this.value);
      if (this.value !== '' && (isNaN(value) || value < 0 || value > 100)) {
        setToast("Salvage Rate should be in the Range 0 to 100", "warning");
        this.classList.add('is-invalid');
      }
    });
    
    // Track changes to salvage rate in Edit mode - one-time edit restriction
    salvageRateInput.addEventListener('change', function() {
      // Only apply one-time edit restriction in UPDATE mode with a loaded record
      if (state.mode === MODES.UPDATE && state.currentRecord) {
        const currentValue = parseFloat(this.value) || 0;
        const originalValue = parseFloat(state.originalSalvageRate) || 0;
        
        // Use small epsilon for floating point comparison
        const isDifferent = Math.abs(currentValue - originalValue) > 0.0001;
        
        console.log('[FixedAssetType] Salvage Rate change:', { 
          currentValue, 
          originalValue, 
          isDifferent,
          alreadyEdited: state.salvageRateEdited 
        });
        
        if (isDifferent && !state.salvageRateEdited) {
          // First edit - mark as edited and disable the field immediately (no toast)
          state.salvageRateEdited = true;
          this.disabled = true;
          console.log('[FixedAssetType] Salvage Rate edited once - field now locked');
        }
      }
    });
    
    // Rate Menu change listener - re-enables Salvage Rate editing
    if (rateMenuSelect) {
      rateMenuSelect.addEventListener('change', function() {
        if (state.mode === MODES.UPDATE || state.mode === MODES.ADD) {
          // Reset the salvage rate edit lock when Rate Menu changes
          state.salvageRateEdited = false;
          if (salvageRateInput) {
            salvageRateInput.disabled = false;
          }
        }
      });
    }
  }

  function setMode(nextMode) {
    state.mode = nextMode;

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#fa-type-form") || qs("[data-main-form]") || qs(".form-card");
    if (!form) {
      console.warn('[FixedAssetType] Form container not found');
      return;
    }

    const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

    // Fields that ARE editable in UPDATE mode
    const editableInUpdateMode = [
      'Description',
      'RevaluationType',
      'DepreciationMethod',
      'DepreciationFrequency',
      'DepreciationRateType',
      'RateMenu',
      'SalvageRate'
    ];

    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        // FixedAssetType should be disabled in UPDATE mode even with data-always-enabled
        if (nextMode === MODES.UPDATE && el.id === 'FixedAssetType') {
          el.disabled = true;
        } else {
          el.disabled = false;
        }
      } else if (nextMode === MODES.UPDATE) {
        // In UPDATE mode, only allow editing specific fields
        if (editableInUpdateMode.includes(el.id)) {
          // Check if SalvageRate should stay disabled due to prior edit
          if (el.id === 'SalvageRate' && state.salvageRateEdited) {
            el.disabled = true;
          } else {
            el.disabled = false;
          }
        } else {
          el.disabled = true;
        }
      } else {
        el.disabled = !isEditable;
      }
    });

    // Action buttons
    const viewBtn = qs('.btn-view');
    const addBtn = qs('.btn-add');
    const editBtn = qs('.btn-edit');
    const deleteBtn = qs('.btn-delete');
    const saveBtn = qs('.btn-save');
    const cancelBtn = qs('.btn-cancel');

    const hasRecord = !!state.currentRecord;

    setButtonDisabled(viewBtn, isEditable);
    setButtonDisabled(addBtn, isEditable);
    setButtonDisabled(editBtn, isEditable || !hasRecord);
    setButtonDisabled(deleteBtn, isEditable || !hasRecord);
    setButtonDisabled(saveBtn, !isEditable);
    setButtonDisabled(cancelBtn, false);
  }

  function setButtonDisabled(btn, disabled) {
    if (btn) btn.disabled = Boolean(disabled);
  }

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

  function clearForm() {
    const form = qs("#fa-type-form") || qs("[data-main-form]") || qs(".form-card");
    if (form) {
      // Clear input fields (but NOT dropdowns per requirement)
      qsa("input[type='text'], input[type='number']", form).forEach(el => { el.value = ''; });
      qsa("input[type='checkbox']", form).forEach(cb => { cb.checked = false; });
      
      // Clear audit span fields
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
    }
    state.currentUpdateCount = 0;
    state.currentRecord = null;
    state.originalSalvageRate = null;
    state.salvageRateEdited = false;
    console.log('[FixedAssetType] Form cleared');
  }

  async function handleSave() {
    if (state.mode === MODES.VIEW) {
      setToast("Switch to Add/Edit before saving.", "warning");
      return;
    }

    const typeId = (qs("#FixedAssetType")?.value || '').trim();
    if (!typeId) {
      setToast("Fixed Asset Type ID is required.", "warning");
      return;
    }

    const description = (qs('#Description')?.value || '').trim();
    if (!description) {
      setToast("Description is required.", "warning");
      return;
    }

    // Validate Salvage Rate (must be 0-100)
    const salvageRateValue = parseFloat(qs('#SalvageRate')?.value) || 0;
    if (salvageRateValue < 0 || salvageRateValue > 100) {
      setToast("Salvage Rate must be between 0 and 100.", "warning");
      qs('#SalvageRate')?.focus();
      return;
    }

    setToast("Saving...", "info");

    const service = await loadFixedAssetsService();
    if (!service) {
      setToast("Service not available.", "danger");
      return;
    }

    const operatorId = getOperatorId();
    const nowSmall = formatSmallDateTime(new Date());
    const bankId = window.Environment?.defaultBankId || window.Environment?.bankId || '00';

    // For ADD: CreatedBy = current operator, CreatedOn = now
    // For EDIT: preserve original CreatedBy/CreatedOn, set ModifiedBy/ModifiedOn
    const isAddMode = state.mode === MODES.ADD;

    console.log('[FixedAssetType] Save state:', {
      mode: state.mode,
      isAddMode: isAddMode,
      currentUpdateCount: state.currentUpdateCount
    });

    // NewRecord: 1 for INSERT (new record), currentUpdateCount for UPDATE
    const newRecordValue = isAddMode ? 1 : (state.currentUpdateCount || 0);

    const requestData = {
      BankID: bankId,
      FixedAssetTypeID: typeId,
      Description: description,
      RevaluationTypeID: qs('#RevaluationType')?.value || '',
      AssetPrefix: qs('#AssetIdPrefix')?.value || '',
      DepreciationMethodID: qs('#DepreciationMethod')?.value || '',
      DepreciationFrequencyID: qs('#DepreciationFrequency')?.value || '',
      DepreciationRateTypeID: qs('#DepreciationRateType')?.value || '',
      DepreciationRateID: qs('#RateMenu')?.value || '',
      DepreciationRate: parseFloat(qs('#DepreciationRate')?.value) || 0,
      StartDate: null,
      EndDate: null,
      MaxExpectedAssetLife: parseInt(qs('#MaxExpectedLife')?.value) || 0,
      GenerateSchedule: qs('#GenerateSchedule')?.checked ? 1 : 0,
      SalvageRate: parseFloat(qs('#SalvageRate')?.value) || 0,
      CreatedBy: isAddMode ? operatorId : (state.currentRecord?.CreatedBy || operatorId),
      CreatedOn: isAddMode ? nowSmall : (state.currentRecord?.CreatedOn || nowSmall),
      ModifiedBy: isAddMode ? '' : operatorId,
      ModifiedOn: isAddMode ? null : nowSmall,
      SupervisedBy: '',
      NewRecord: newRecordValue
    };

    console.log('[FixedAssetType] Save requestData:', requestData);

    try {
      const resp = await service.addEditFATypes(requestData);
      console.log('[FixedAssetType] Save response:', resp);
      
      if (resp && resp.success) {
        setToast("Fixed Asset Type saved successfully.", "success");
        clearForm();
        setMode(MODES.VIEW);
        
        // Reload the saved record
        if (qs('#FixedAssetType')) qs('#FixedAssetType').value = typeId;
        loadAndPopulateFATypes();
      } else {
        if (resp?.Status === '091' && resp?.Message?.includes('Edit already done by another User')) {
          setToast("Edit failed: record was updated by another user. Please reload and try again.", "danger");
        } else {
          setToast(resp?.message || resp?.Message || "Failed to save.", "danger");
        }
      }
    } catch (err) {
      console.error("[FixedAssetType] Save error:", err);
      setToast("An error occurred while saving.", "danger");
    }
  }

  async function handleDelete() {
    const typeId = qs("#FixedAssetType")?.value;
    if (!typeId) {
      setToast("Please select a record to delete.", "warning");
      return;
    }

    const confirmed = confirm(`Are you sure you want to delete Fixed Asset Type: ${typeId}?`);
    if (!confirmed) return;

    setToast("Deleting...", "info");

    const service = await loadFixedAssetsService();
    if (!service) {
      setToast("Service not available.", "danger");
      return;
    }

    const requestData = {
      BankID: window.Environment?.defaultBankId || window.Environment?.bankId || "00",
      FixedAssetTypeID: typeId,
      // NewRecord is a concurrency token (UpdateCount) for deletes
      NewRecord: state.currentUpdateCount || 0
    };

    console.log('[FixedAssetType] Delete requestData:', requestData);

    try {
      const resp = await service.deleteFATypes(requestData);
      console.log('[FixedAssetType] Delete response:', resp);
      
      if (resp && resp.success) {
        setToast("Fixed Asset Type deleted successfully.", "success");
        clearForm();
        setMode(MODES.VIEW);
      } else {
        setToast(resp?.message || resp?.Message || "Failed to delete.", "danger");
      }
    } catch (err) {
      console.error("[FixedAssetType] Delete error:", err);
      setToast("An error occurred while deleting.", "danger");
    }
  }

  function bindLeftNav() {
    qsa("[data-fa-type-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-fa-type-nav") || "";
        const label = btn.textContent?.trim() || target;
        if (target === "gl-interface") {
          const typeId = (qs("#FixedAssetType")?.value || "").trim();
          if (typeId) {
            sessionStorage.setItem("kairo_fa_gl_relevant_id", typeId);
          } else {
            sessionStorage.removeItem("kairo_fa_gl_relevant_id");
          }
          window.location.href = "fixed-asset-gl-interface.html";
          return;
        }
        if (target === "accounting-rule") {
          window.location.href = "fixed-asset-accounting-rule.html";
          return;
        }
        if (target === "asset-rate-history") {
          window.location.href = "fixed-asset-asset-rate-history.html";
          return;
        }
        setToast(`${label} opened (stub).`, "info");
      });
    });
  }



  async function loadFixedAssetsService() {
    if (window.FixedAssetsService) return window.FixedAssetsService;
    if (window.ServiceLoader?.loadFixedAssetsService) {
      await window.ServiceLoader.loadFixedAssetsService();
      return window.FixedAssetsService;
    }
    return null;
  }

  async function loadAndPopulateFATypes() {
    const typeId = (qs("#FixedAssetType")?.value || "").trim();
    if (!typeId) {
      if (state.mode === MODES.VIEW) {
        setToast("Please enter a Fixed Asset Type ID to view.", "info");
      }
      return;
    }

    setToast(`Loading ${typeId}...`, "info");

    const service = await loadFixedAssetsService();
    if (!service) {
      setToast("Service not available.", "danger");
      return;
    }

    const requestData = {
      BankID: window.Environment?.defaultBankId || "00",
      OurBranchID: window.Environment?.defaultOurBranchId || "0101",
      FixedAssetTypeID: typeId,
      OperatorID: "CSADM"
    };

    try {
      const resp = await service.getFATypes(requestData);
      console.log("[FixedAssetType] API Response:", resp);

      if (resp && resp.success) {
        const raw = resp.data || resp;
        
        // Response structure:
        // Details: audit/event info (skip)
        // Details01: AutoAssetID, AssetIDLength
        // Details02: Main record data (FixedAssetTypeID, Description, UpdateCount, etc.)
        
        let mergedData = {};
        
        // Get data from Details01 (AutoAssetID, AssetIDLength)
        if (raw.Details01 && Array.isArray(raw.Details01) && raw.Details01.length > 0) {
          Object.assign(mergedData, raw.Details01[0]);
          console.log('[FixedAssetType] Details01 data:', raw.Details01[0]);
        }
        
        // Get data from Details02 (main record - this has UpdateCount)
        if (raw.Details02 && Array.isArray(raw.Details02) && raw.Details02.length > 0) {
          Object.assign(mergedData, raw.Details02[0]);
          console.log('[FixedAssetType] Details02 data:', raw.Details02[0]);
        }
        
        // Fallback: check other DetailsXX sections if Details01/02 not found
        if (Object.keys(mergedData).length === 0) {
          Object.keys(raw).forEach(key => {
            // Skip "Details" which contains only audit info
            if (key === 'Details') return;
            if (/^Details\d+$/i.test(key) && Array.isArray(raw[key]) && raw[key].length > 0) {
              Object.assign(mergedData, raw[key][0]);
            }
          });
        }

        console.log('[FixedAssetType] Merged record data:', mergedData);

        if (Object.keys(mergedData).length > 0 && mergedData.FixedAssetTypeID) {
          bindFATypesToForm(mergedData);
          setMode(MODES.VIEW);
          setToast("Fixed Asset Type loaded.", "success");
        } else {
          // Record not found
          state.currentRecord = null;
          state.currentUpdateCount = 0;
          setToast("No details found for this type.", "warning");
        }
      } else {
        setToast(resp?.message || "Failed to load type details.", "danger");
      }
    } catch (err) {
      console.error("[FixedAssetType] Load error:", err);
      setToast("Error loading type details.", "danger");
    }
  }

  async function populateDropdowns() {
    try {
      if (window.ServiceLoader) {
        if (!window.LookupService && window.ServiceLoader.loadLookupService) {
          await window.ServiceLoader.loadLookupService();
        }
        if (!window.customCodesLookupService && window.ServiceLoader.loadCustomCodesLookupService) {
          await window.ServiceLoader.loadCustomCodesLookupService();
        }
      }

      if (window.LookupService) {
        // Populate Revaluation Type
        const revalSelect = qs("#RevaluationType");
        if (revalSelect) {
          const revalOptions = await window.LookupService.getRevaluationTypes();
          if (revalOptions && revalOptions.length > 0) {
            revalSelect.innerHTML = '<option value="">--Select--</option>';
            revalOptions.forEach(opt => {
              const option = document.createElement("option");
              option.value = opt.value;
              option.textContent = opt.label;
              revalSelect.appendChild(option);
            });
          }
        }

        // Populate Depreciation Frequency
        const freqSelect = qs("#DepreciationFrequency");
        if (freqSelect) {
          const freqOptions = await window.LookupService.getDepreciationFrequencies();
          if (freqOptions && freqOptions.length > 0) {
            freqSelect.innerHTML = '<option value="">--Select--</option>';
            freqOptions.forEach(opt => {
              const option = document.createElement("option");
              option.value = opt.value;
              option.textContent = opt.label;
              freqSelect.appendChild(option);
            });
          }
        }

        // Populate Depreciation Method
        const methodSelect = qs("#DepreciationMethod");
        if (methodSelect) {
          const methodOptions = await window.LookupService.getDepreciationMethods();
          if (methodOptions && methodOptions.length > 0) {
            methodSelect.innerHTML = '<option value="">--Select--</option>';
            methodOptions.forEach(opt => {
              const option = document.createElement("option");
              option.value = opt.value;
              option.textContent = opt.label;
              methodSelect.appendChild(option);
            });
          }
        }

        // Populate Depreciation Rate Type
        const rateTypeSelect = qs("#DepreciationRateType");
        if (rateTypeSelect) {
          const rateTypeOptions = await window.LookupService.getDepreciationRateTypes();
          if (rateTypeOptions && rateTypeOptions.length > 0) {
            rateTypeSelect.innerHTML = '<option value="">--Select--</option>';
            rateTypeOptions.forEach(opt => {
              const option = document.createElement("option");
              option.value = opt.value;
              option.textContent = opt.label;
              rateTypeSelect.appendChild(option);
            });
          }
        }
      }

      // Populate Rate Menu using CustomCodesLookupService with CodeID: DepreciationRateID
      if (window.customCodesLookupService) {
        const rateMenuSelect = qs("#RateMenu");
        if (rateMenuSelect) {
          const rateOptions = await window.customCodesLookupService.getCustomCodeOptions("DepreciationRateID");
          rateMenuSelect.innerHTML = '<option value="">--Select--</option>';
          rateOptions.forEach(opt => {
            const option = document.createElement("option");
            option.value = opt.value;
            option.textContent = opt.label;
            rateMenuSelect.appendChild(option);
          });
        }
      }
    } catch (err) {
      console.error("[FixedAssetType] Error populating dropdowns:", err);
    }
  }

  function bindFATypesToForm(data) {
    if (!data) return;

    state.currentRecord = data;
    // Track UpdateCount (used as NewRecord for edits)
    state.currentUpdateCount = data.UpdateCount ?? data.updateCount ?? 0;
    // Track original Salvage Rate for edit validation
    state.originalSalvageRate = data.SalvageRate ?? null;
    state.salvageRateEdited = false; // Reset edit flag when loading record
    
    // Re-enable salvage rate field when loading a new record
    const salvageRateInput = qs('#SalvageRate');
    if (salvageRateInput) {
      salvageRateInput.disabled = false;
    }

    console.log('[FixedAssetType] Original Salvage Rate stored:', state.originalSalvageRate);

    const map = {
      FixedAssetTypeID: "FixedAssetType",
      Description: "Description",
      RevaluationTypeID: "RevaluationType",
      AssetPrefix: "AssetIdPrefix",
      AssetIdPrefix: "AssetIdPrefix",
      AutoAssetID: "AutoId",
      AutoId: "AutoId",
      AssetIDLength: "AssetIdLength",
      AssetIdLength: "AssetIdLength",
      DepreciationMethodID: "DepreciationMethod",
      DepreciationMethod: "DepreciationMethod",
      DepreciationFrequencyID: "DepreciationFrequency",
      DepreciationFrequency: "DepreciationFrequency",
      DepreciationRateTypeID: "DepreciationRateType",
      DepreciationRateType: "DepreciationRateType",
      DepreciationRateID: "RateMenu",
      RateMenu: "RateMenu",
      DepreciationRate: "DepreciationRate",
      MaxExpectedAssetLife: "MaxExpectedLife",
      MaxExpectedLife: "MaxExpectedLife",
      SalvageRate: "SalvageRate",
      GenerateSchedule: "GenerateSchedule",
      CreatedBy: "CreatedBy",
      CreatedOn: "CreatedOn",
      ModifiedBy: "ModifiedBy",
      ModifiedOn: "ModifiedOn",
      SupervisedBy: "SupervisedBy",
      SupervisedOn: "SupervisedOn",
      // UpdateCount removed from data binding map
    };

    console.log('[FixedAssetType] Binding data to form:', data);
    console.log('[FixedAssetType] UpdateCount stored:', state.currentUpdateCount);

    Object.keys(map).forEach(key => {
      const fieldId = map[key];
      const el = qs(`#${fieldId}`);
      if (!el) return;

      // Skip if API doesn't have this key
      if (!(key in data)) return;

      let val = data[key];

      // Format datetime values for display (audit fields)
      if ((fieldId.endsWith('On') || fieldId.includes('Date')) && val) {
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

      if (el.type === "checkbox") {
        el.checked = !!val;
      } else if (el.tagName === "SELECT") {
        // For selects, try to set the value. If it's invalid, try to find by text.
        if (val != null) {
          el.value = val;
          // If value didn't match an option, try to match by text (common if API returns label instead of ID)
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
        el.value = (val == null || val === 'null') ? '' : val;
      }
    });

    console.log('[FixedAssetType] Form bound with values:', {
      FixedAssetType: qs('#FixedAssetType')?.value,
      Description: qs('#Description')?.value,
      RevaluationType: qs('#RevaluationType')?.value,
      DepreciationMethod: qs('#DepreciationMethod')?.value,
      DepreciationFrequency: qs('#DepreciationFrequency')?.value,
      DepreciationRateType: qs('#DepreciationRateType')?.value,
      RateMenu: qs('#RateMenu')?.value,
      DepreciationRate: qs('#DepreciationRate')?.value,
      GenerateSchedule: qs('#GenerateSchedule')?.checked
    });
  }

  let dropdownsLoadedRegex = false;
  let dropdownsPromise = null;

  window.addEventListener("load", () => {
    bindLeftNav();
    setMode(MODES.VIEW);
    setupSalvageRateValidation(); // Real-time validation for Salvage Rate
    dropdownsPromise = populateDropdowns().then(() => {
      dropdownsLoadedRegex = true;
    });

    // Centralized Click Handler
    document.addEventListener('click', async (e) => {
      const action = isActionButton(e.target);
      if (!action) return;
      if (action.btn.disabled) return;
      e.preventDefault();

      if (action.text === 'view') {
        loadAndPopulateFATypes();
        setMode(MODES.VIEW);
        return;
      }
      if (action.text === 'add') {
        const preservedId = (qs("#FixedAssetType")?.value || "").trim();
        clearForm();
        if (preservedId) qs("#FixedAssetType").value = preservedId;
        setMode(MODES.ADD);
        setToast("Add mode active", "info");
        return;
      }
      if (action.text === 'edit' || action.text === 'update') {
        setMode(MODES.UPDATE);
        setToast("Edit mode active", "info");
        return;
      }
      if (action.text === 'save') {
        handleSave();
        return;
      }
      if (action.text === 'cancel') {
        if (state.mode === MODES.UPDATE && state.currentRecord) {
          bindFATypesToForm(state.currentRecord);
          setMode(MODES.VIEW);
          setToast("Edit cancelled. Record restored.", "info");
          return;
        }
        clearForm();
        setToast("Screen cleared", "success");
        setMode(MODES.VIEW);
        return;
      }
      if (action.text === 'delete') {
        handleDelete();
        return;
      }
    });

    // Wire up search button to open search modal
    const searchBtn = qs('button[aria-label="Search Fixed Asset Type"]');
    searchBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      openFATypeSearchModal();
    });
  });

  // Ensure loadAndPopulateFATypes waits for dropdowns
  const originalLoadAndPopulate = loadAndPopulateFATypes;
  loadAndPopulateFATypes = async function () {
    if (dropdownsPromise) await dropdownsPromise;
    return originalLoadAndPopulate.apply(this, arguments);
  };
})();
