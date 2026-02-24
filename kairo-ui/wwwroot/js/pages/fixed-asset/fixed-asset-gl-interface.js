(() => {
  if (window.__kairoFixedAssetGlInterfaceLoaded) return;
  window.__kairoFixedAssetGlInterfaceLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  const state = {
    mode: MODES.VIEW,
    updateCount: 0,
    mappings: [], // Store existing mappings to determine N vs A
    pendingDeleteTag: null, // Track tag marked for removal
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
    
    console.log(`[FixedAssetGlInterface] Toast (${variant}): ${message}`);
  }

  function setMode(nextMode) {
    state.mode = nextMode;

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#fa-gl-form");
    if (!form) return;

    const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        return;
      }
      el.disabled = !isEditable;
    });

    const viewBtn = qs('.btn-view');
    const addBtn = qs('.btn-add');
    const editBtn = qs('.btn-edit');
    const deleteActionBtn = qs('.btn-delete');
    const saveBtn = qs('.btn-save');
    const cancelBtn = qs('.btn-cancel');
    const backBtn = qs('.btn-back');

    if (viewBtn) viewBtn.disabled = false;
    if (addBtn) addBtn.disabled = (nextMode !== MODES.VIEW);
    if (editBtn) editBtn.disabled = false;
    if (deleteActionBtn) deleteActionBtn.disabled = false;
    if (saveBtn) saveBtn.disabled = !isEditable;
    if (cancelBtn) cancelBtn.disabled = false;
    if (backBtn) backBtn.disabled = false;
    // Disable other toolbar buttons if any
    qsa('.fa-legacy-toolbar-btn').forEach(btn => {
      if (btn !== editBtn && btn !== removeBtn) btn.disabled = true;
    });
  }

  function getSessionSafe() {
    try {
      return window.AuthService?.getSession?.() || null;
    } catch {
      return null;
    }
  }

  // --- Account ID Search Modal Logic ---
  // --- Account ID Search Modal Logic (Replicated from Fixed Asset Depreciation Rates) ---
  function ensureSearchModal() {
    let modal = document.getElementById('fa-gl-accountid-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal fade';
      modal.id = 'fa-gl-accountid-modal';
      modal.tabIndex = -1;
      modal.setAttribute('aria-hidden', 'true');
      modal.innerHTML = `
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header py-2">
              <h6 class="modal-title mb-0">GL Active Search</h6>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <form id="fa-gl-search-form" autocomplete="off">
                <div class="row g-2 align-items-end">
                  <div class="col-md-3">
                    <label class="form-label small mb-1">Account ID</label>
                    <input type="text" id="fa-gl-search-accountid" class="form-control form-control-sm" data-always-enabled placeholder="Like..." />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label small mb-1">Description</label>
                    <input type="text" id="fa-gl-search-desc" class="form-control form-control-sm" data-always-enabled placeholder="Like..." />
                  </div>
                  <div class="col-md-3">
                    <label class="form-label small mb-1">GL Type</label>
                    <input type="text" id="fa-gl-search-type" class="form-control form-control-sm" data-always-enabled placeholder="Like..." />
                  </div>
                  <div class="col-md-2">
                    <button type="submit" id="fa-gl-search-btn" class="btn btn-primary btn-sm w-100" data-always-enabled>Search</button>
                  </div>
                </div>
              </form>

              <div class="mt-3">
                <div class="small text-muted mb-2" id="fa-gl-search-status">&nbsp;</div>
                <div class="table-responsive" style="max-height: 320px; border: 1px solid #dee2e6; border-radius: 4px;">
                  <table class="table table-sm table-hover align-middle mb-0" style="font-size: 13px;">
                    <thead class="table-light" style="position: sticky; top: 0; z-index: 10;">
                      <tr>
                        <th style="width: 44px; padding-left: 12px;">#</th>
                        <th>Account ID</th>
                        <th>Description</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody id="fa-gl-search-results">
                      <tr><td colspan="4" class="text-muted text-center py-4">Click Search to load results.</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div class="modal-footer justify-content-between py-2">
              <div class="d-flex gap-2">
                 <button type="button" class="btn btn-sm btn-outline-warning" id="fa-gl-search-clear">Clear Filters</button>
              </div>
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-sm btn-primary px-4" id="fa-gl-search-ok" disabled>OK</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    return modal;
  }

  function setSelectedSearchIndex(modalEl, idx) {
    if (!modalEl) return;
    const tbody = modalEl.querySelector('#fa-gl-search-results');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr[data-idx]'));
    rows.forEach((tr) => tr.classList.remove('table-active', 'selected'));

    const target = rows.find((tr) => Number(tr.getAttribute('data-idx')) === Number(idx));
    if (target) {
      target.classList.add('table-active');
      target.scrollIntoView({ block: 'nearest' });
      modalEl.__selectedIdx = Number(idx);
      modalEl.__selectedRow = JSON.parse(target.getAttribute('data-row') || '{}');

      const okBtn = modalEl.querySelector('#fa-gl-search-ok');
      if (okBtn) okBtn.disabled = false;
    }
  }

  function confirmSelection(modalEl) {
    const rowData = modalEl?.__selectedRow;
    if (!rowData) return;

    const id = extractAccountId(rowData);
    const name = rowData.Description || rowData.AccountName || rowData.Accountname || rowData.Name || rowData.GLAccountName || '';

    if (!id) {
      setToast("Could not extract Account ID.", "warning");
      return;
    }

    // Populate main form
    const idInput = document.getElementById('AccountId') || document.getElementById('AccountID');
    if (idInput) {
      idInput.value = id;
      idInput.dispatchEvent(new Event('input', { bubbles: true }));
      idInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const nameInput = document.getElementById('AccountName');
    if (nameInput) {
      nameInput.value = name;
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (window.bootstrap?.Modal) {
      const instance = window.bootstrap.Modal.getInstance(modalEl);
      instance?.hide();
    } else {
      modalEl.style.display = 'none';
    }

    setToast(`Account ${id} selected.`, "success");

    // Enable ONLY Save and Cancel, disable everything else
    qsa('.cm-shell__action, [data-fa-gl-action], [data-shell-mode]').forEach(btn => {
      const action = btn.getAttribute('data-fa-gl-action');
      const mode = btn.getAttribute('data-shell-mode');

      if (action === 'save' || action === 'cancel') {
        btn.disabled = false;
      } else {
        btn.disabled = true;
      }
    });
  }

  function openAccountIdSearchModal() {
    const modal = ensureSearchModal();

    if (!modal.__kairoBound) {
      modal.__kairoBound = true;

      const form = modal.querySelector('#fa-gl-search-form');
      const resultsDiv = modal.querySelector('#fa-gl-search-results');
      const statusDiv = modal.querySelector('#fa-gl-search-status');
      const okBtn = modal.querySelector('#fa-gl-search-ok');
      const clearBtn = modal.querySelector('#fa-gl-search-clear');

      form.onsubmit = async (e) => {
        e.preventDefault();
        statusDiv.textContent = 'Searching...';
        resultsDiv.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';
        okBtn.disabled = true;

        const accountId = modal.querySelector('#fa-gl-search-accountid').value.trim();
        const desc = modal.querySelector('#fa-gl-search-desc').value.trim();
        const type = modal.querySelector('#fa-gl-search-type').value.trim();

        const session = getSessionSafe() || {};
        const env = window.Environment || {};
        const bankId = env.BankID || env.defaultBankId || '00';
        const branchId = env.OurBranchID || env.defaultOurBranchId || '0101';
        const operatorId = session.operatorId || 'CSADM';

        let advFilter = `BankID='${bankId}' AND GLCategoryID<>'Main' AND GLCategoryID='CONT'`;
        if (accountId) advFilter += ` AND AccountID LIKE '%${accountId}%'`;
        if (desc) advFilter += ` AND Description LIKE '%${desc}%'`;
        if (type) advFilter += ` AND GLAccountTypeID LIKE '%${type}%'`;

        try {
          if (!window.SearchService) throw new Error("SearchService not available.");
          const resp = await window.SearchService.search({
            TableID: "GLActiveID",
            AdvFilterString: advFilter,
            WhereStmt: '',
            OperatorID: operatorId,
            ModuleID: 8401,
            OurBranchID: branchId,
            LanguageID: 'en'
          });

          if (resp && resp.success) {
            const rows = resp.Details || (resp.data ? (resp.data.Details || (Array.isArray(resp.data) ? resp.data : [])) : []);
            modal.__rows = rows;

            if (!rows.length) {
              statusDiv.textContent = 'No records found.';
              resultsDiv.innerHTML = '<tr><td colspan="4" class="text-muted text-center py-4">No records found.</td></tr>';
            } else {
              statusDiv.textContent = `${rows.length} result(s). Click a row to select.`;
              resultsDiv.innerHTML = rows.map((row, idx) => {
                const rid = extractAccountId(row);
                const rdesc = row.Description || row.AccountName || '';
                const rtype = row.GLAccountTypeID || '';
                const json = JSON.stringify(row).replace(/"/g, '&quot;');
                return `
                  <tr style="cursor:pointer;" data-idx="${idx}" data-row="${json}">
                    <td style="padding-left:12px;">${idx + 1}</td>
                    <td>${rid}</td>
                    <td>${rdesc}</td>
                    <td>${rtype}</td>
                  </tr>`;
              }).join('');

              setSelectedSearchIndex(modal, 0);
            }
          } else {
            statusDiv.textContent = 'Error: ' + (resp?.message || 'Search failed.');
            resultsDiv.innerHTML = `<tr><td colspan="4" class="text-danger text-center py-4">${resp?.message || 'Search failed.'}</td></tr>`;
          }
        } catch (err) {
          statusDiv.textContent = 'Error: ' + err.message;
          resultsDiv.innerHTML = `<tr><td colspan="4" class="text-danger text-center py-4">${err.message}</td></tr>`;
        }
      };

      okBtn.onclick = () => confirmSelection(modal);

      clearBtn.onclick = () => {
        form.reset();
        statusDiv.textContent = 'Cleared.';
        resultsDiv.innerHTML = '<tr><td colspan="4" class="text-muted text-center py-4">Click Search to load results.</td></tr>';
        okBtn.disabled = true;
      };

      resultsDiv.onclick = (e) => {
        const tr = e.target.closest('tr[data-idx]');
        if (tr) setSelectedSearchIndex(modal, tr.getAttribute('data-idx'));
      };

      resultsDiv.ondblclick = (e) => {
        const tr = e.target.closest('tr[data-idx]');
        if (tr) {
          setSelectedSearchIndex(modal, tr.getAttribute('data-idx'));
          confirmSelection(modal);
        }
      };

      modal.addEventListener('shown.bs.modal', () => {
        modal.querySelector('#fa-gl-search-accountid').focus();
        if (!modal.__rows) form.requestSubmit();
      });
    }

    if (window.bootstrap?.Modal) {
      const instance = window.bootstrap.Modal.getOrCreateInstance(modal);
      instance.show();
    }
  }

  async function fetchGLInterface(silent = false) {
    if (!silent) setToast("Fetching GL Interface...", "info");

    const session = getSessionSafe();
    const env = window.Environment || {};

    const branchId = session?.branchId || session?.OurBranchID || env.OurBranchID || env.defaultOurBranchId || '0101';
    const bankId = session?.bankId || session?.BankID || env.BankID || env.defaultBankId || '00';
    const operatorId = session?.operatorId || session?.OperatorID || env.OperatorID || env.defaultOperatorId || 'CSADM';

    const storedRelevantId = sessionStorage.getItem("kairo_fa_gl_relevant_id") || "";

    const requestData = {
      OurBranchID: branchId,
      BankID: bankId,
      RelevantID: storedRelevantId,
      ModuleID: 8401,
      OperatorID: operatorId
    };

    try {
      if (!window.FixedAssetsService) {
        throw new Error("FixedAssetsService not loaded.");
      }

      console.log("[FA GL Interface] Fetching with:", requestData);
      const resp = await window.FixedAssetsService.getGLInterface(requestData);

      if (resp && resp.success) {
        const rawData = resp.data || resp;

        // As per sample response:
        // Details01 = All possible Account Tags
        // Details02 = Existing Mappings for the current RelevantID
        const tagList = rawData.Details01 || [];
        const mappingList = rawData.Details02 || rawData.Details || [];

        // Populate the dropdown and lookup using Details01 only when provided
        populateTags(tagList);

        // Render the grid using Details02 (Mappings)
        state.mappings = mappingList;
        state.updateCount = rawData.UpdateCount || (mappingList[0]?.UpdateCount) || (rawData.Details && rawData.Details[0]?.UpdateCount) || 0;

        renderGrid(mappingList);

        if (!mappingList.length) {
          if (!silent) setToast("No mappings found for this asset category.", "info");
        } else {
          if (!silent) setToast("GL Interface loaded successfully.", "success");
        }
      } else {
        setToast(resp?.message || "Failed to load GL Interface.", "danger");
      }
    } catch (err) {
      setToast("Error loading GL Interface.", "danger");
      console.error("[FA GL Interface] Fetch error:", err);
    }
  }

  async function populateTags(dynamicTags = null) {
    try {
      const tags = Array.isArray(dynamicTags) ? dynamicTags : [];

      const select = qs("#AccountTag");
      window.__faGlTagLookup = {};

      if (select) {
        select.innerHTML = '<option value="" selected>--Select--</option>';
        tags.forEach(t => {
          const val = t.SubCodeID || t.AccountTagID || "";
          const text = t.Description || t.CodeDescription || val;

          if (val) {
            const opt = document.createElement("option");
            opt.value = val;
            opt.textContent = text;
            select.appendChild(opt);
            window.__faGlTagLookup[val] = text;
          }
        });
      }
    } catch (err) {
      console.warn("[FA GL Interface] Could not populate Account Tags:", err);
    }
  }

  function extractAccountId(item) {
    if (!item || typeof item !== "object") return "";

    // Strictly check for known ID property names only.
    // We removed generic 'ID' and 'Account' to prevent accidentally picking up names or row indexes.
    const idKeys = [
      "AccountID", "AccountId", "Accountid", "Account_ID",
      "GLAccountID", "GLAccountId", "GLAccount_ID",
      "AccountNo", "Account_No", "GLAccountNo", "GLAcctNo", "GL_Account_No"
    ];

    for (const key of idKeys) {
      const val = item[key];
      if (val !== undefined && val !== null && val !== "" && val !== "null" && val !== "undefined") {
        return String(val).trim();
      }
    }

    return "";
  }

  function renderGrid(data) {
    const tbody = qs(".fa-gl-grid tbody");
    if (!tbody) return;

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-muted py-2 text-center">No records to display.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(item => {
      // 1) Extract Account ID strictly
      const id = extractAccountId(item);

      // 2) Extract Account Name with Description as a safe fallback
      const name = item.AccountName || item.Accountname || item.GLAccountName ||
        item.AccountDescription || item.Description || "";

      // 3) Extract Tag ID
      const rawTag = item.AccountTagID || item.SubCodeID || item.SubCodeId || item.SubCode || item.CodeID || "";

      // 4) Get friendly Tag Text
      const tagLookup = window.__faGlTagLookup || {};
      const tagText = tagLookup[rawTag] || item.Description || item.TagDescription || item.CodeDescription || rawTag || "Unknown Tag";

      return `
        <tr style="cursor: pointer;" data-sub-code-id="${rawTag}">
          <td>${tagText}</td>
          <td>${id}</td>
          <td>${name}</td>
        </tr>
      `;
    }).join("");
  }

  const isActionButton = (target) => {
    const btn = target?.closest('.cm-shell__action');
    if (!btn) return null;
    if (btn.classList.contains('btn-view')) return { btn, text: 'view' };
    if (btn.classList.contains('btn-add')) return { btn, text: 'add' };
    if (btn.classList.contains('btn-edit')) return { btn, text: 'edit' };
    if (btn.classList.contains('btn-delete')) return { btn, text: 'delete' };
    if (btn.classList.contains('btn-save')) return { btn, text: 'save' };
    if (btn.classList.contains('btn-cancel')) return { btn, text: 'cancel' };
    if (btn.classList.contains('btn-back')) return { btn, text: 'back' };
    const text = (btn.textContent || '').trim().toLowerCase();
    return { btn, text };
  };


  async function handleSave() {
    if (state.mode === MODES.VIEW) {
      setToast("Switch to Add or Edit mode before saving.", "warning");
      return;
    }

    const session = getSessionSafe();
    const env = window.Environment || {};
    const bankId = env.BankID || env.defaultBankId || "00";
    const operatorId = session?.OperatorID || "CSADM";

    const subCodeId = qs("#AccountTag")?.value;
    const accountId = qs("#AccountId")?.value;

    if (!subCodeId) {
      setToast("Account Tag is required.", "warning");
      return;
    }

    const storedRelevantId = sessionStorage.getItem("kairo_fa_gl_relevant_id") || bankId;

    let mark;
    let finalAccountId = accountId;

    // Logic for deferred removal
    if (state.pendingDeleteTag && state.pendingDeleteTag === subCodeId) {
      mark = 'R';
      finalAccountId = ""; // Removal typically sends empty account ID
    } else {
      if (!accountId) {
        setToast("Account ID is required.", "warning");
        return;
      }
      // Determine ButtonMark: 'A' if tag exists in grid, else 'N'
      const exists = state.mappings.some(m => (m.AccountTagID || m.SubCodeID) === subCodeId);
      mark = exists ? 'A' : 'N';
    }

    // Build XML for DetailRecords as per SP p_AddEditGLInterface
    const detailRecords = `<dt_Accounts><ButtonMark>${mark}</ButtonMark><AccountTagID>${subCodeId}</AccountTagID><AccountID>${finalAccountId}</AccountID></dt_Accounts>`;

    const requestData = {
      BankID: bankId,
      RelevantID: storedRelevantId,
      ModuleID: 8401,
      OperatedBy: operatorId,
      UpdateCount: state.updateCount || 0,
      OperatedOn: new Date().toISOString().slice(0, 19).replace('T', ' '),
      SupervisedBy: operatorId,
      DetailRecords: detailRecords
    };

    setToast(mark === 'R' ? "Removing mapping..." : "Saving GL Interface...", "info");
    console.log(`[FA GL Interface] Action (Mark: ${mark}) with:`, requestData);

    try {
      const resp = await window.FixedAssetsService.addEditGLInterface(requestData);
      console.log("[FA GL Interface] Save Response:", resp);

      if (resp && resp.success) {
        setToast(mark === 'R' ? "Mapping removed successfully." : "GL Interface saved successfully.", "success");
        state.pendingDeleteTag = null;
        setMode(MODES.VIEW);
        await fetchGLInterface(true); // silent fetch to keep success message
      } else {
        setToast(resp?.message || "Failed to save GL Interface.", "danger");
      }
    } catch (err) {
      console.error("[FA GL Save Error]", err);
      setToast("Error: " + err.message, "danger");
    }
  }

  async function handleDelete() {
    const session = getSessionSafe();
    const env = window.Environment || {};
    const bankId = env.BankID || env.defaultBankId || "00";
    const storedRelevantId = sessionStorage.getItem("kairo_fa_gl_relevant_id") || bankId;
    const updateCount = state.updateCount || 0;

    const requestData = {
      BankID: bankId,
      RelevantID: storedRelevantId,
      ModuleID: 8401,
      UpdateCount: updateCount
    };

    setToast("Deleting GL Interface...", "info");

    if (!window.FixedAssetsService?.deleteGLInterface) {
      setToast("Delete service not available.", "danger");
      return;
    }

    window.FixedAssetsService.deleteGLInterface(requestData)
      .then(resp => {
        if (resp && resp.success) {
          setToast("GL Interface deleted.", "success");
          state.pendingDeleteTag = null;
          setMode(MODES.VIEW);
          fetchGLInterface(true);
        } else {
          setToast(resp?.message || "Failed to delete GL Interface.", "danger");
        }
      })
      .catch(err => {
        console.error("[FA GL Hard Delete Error]", err);
        setToast("Error deleting GL Interface.", "danger");
      });
  }

  // Account Tag dropdown listener
  const tagSelect = qs("#AccountTag");

  // Toolbar buttons
  const alterBtn = qs('[data-fa-gl-grid="alter"]');
  const removeBtn = qs('[data-fa-gl-grid="remove"]');

  if (tagSelect) {
    tagSelect.addEventListener("change", () => {
      const val = tagSelect.value;
      // In this flow, we don't auto-enable buttons here; 
      // they enable only after a grid selection in Update mode.
    });
  }

  // Alter button logic (Prepare for final save)
  if (alterBtn) {
    alterBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const subCodeId = tagSelect?.value;
      const accountId = qs("#AccountId")?.value;

      if (!subCodeId || !accountId) {
        setToast("Please select a record and pick an Account ID first.", "warning");
        return;
      }

      // Just notify user that they can now save their changes
      setToast("Ready to update. Click Save to commit changes.", "info");

      // Ensure Save button is enabled
      const saveBtn = qs('[data-fa-gl-action="save"]');
      if (saveBtn) saveBtn.disabled = false;
    });
  }

  // Remove button logic (defer removal until Save)
  if (removeBtn) {
    removeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const subCodeId = tagSelect?.value;
      if (!subCodeId) {
        setToast("No item selected for removal.", "warning");
        return;
      }

      // Defer removal: mark then require Save to commit
      state.pendingDeleteTag = subCodeId;

      // Clear Account fields to show it's being removed
      const idInput = qs("#AccountId");
      const nameInput = qs("#AccountName");
      if (idInput) idInput.value = "";
      if (nameInput) nameInput.value = "[TO BE REMOVED]";

      setToast("Record marked for removal. Click Save to commit.", "warning");

      // Enable Save button, disable alter to avoid conflicts
      const saveBtn = qs('[data-fa-gl-action="save"]');
      if (saveBtn) saveBtn.disabled = false;
      if (alterBtn) alterBtn.disabled = true;
      qsa('.fa-legacy-toolbar-btn').forEach(btn => {
        if (btn !== removeBtn) btn.disabled = true;
      });
    });
  }

  // Grid row selection
  const grid = qs(".fa-gl-grid tbody");
  let selectedRow = null;
  if (grid) {
    grid.addEventListener("click", (e) => {
      const tr = e.target.closest("tr");
      if (!tr || tr.cells.length < 2 || tr.querySelector('.text-muted')) return;

      // "Clicking Edit allows you to select one item from the grid"
      if (state.mode !== MODES.UPDATE) {
        setToast("Please click Edit/Update to activate selection mode.", "info");
        return;
      }

      if (selectedRow) selectedRow.classList.remove("table-active");
      selectedRow = tr;
      selectedRow.classList.add("table-active");

      // Reset pending deletion if user selects a new row
      state.pendingDeleteTag = null;

      const subCodeId = tr.getAttribute('data-sub-code-id');
      const id = tr.cells[1].textContent.trim();
      const name = tr.cells[2]?.textContent.trim() || "";

      const idInput = qs("#AccountId");
      const nameInput = qs("#AccountName");

      if (tagSelect) {
        tagSelect.value = subCodeId;
        tagSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (idInput) {
        idInput.value = id;
        idInput.dispatchEvent(new Event('input', { bubbles: true }));
        idInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (nameInput) {
        nameInput.value = name;
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Enable toolbar buttons once selected
      if (alterBtn) alterBtn.disabled = false;
      if (removeBtn) removeBtn.disabled = false;

      qsa('.fa-legacy-toolbar-btn').forEach(btn => btn.disabled = false);
    });
  }


  window.addEventListener("load", () => {
    setMode(MODES.VIEW);
    populateTags();
    fetchGLInterface();

    // Centralized Click Handler
    document.addEventListener('click', async (e) => {
      const action = isActionButton(e.target);
      if (!action) {
        // Handle search button which might not have cm-shell__action class
        if (e.target.closest('.fa-gl-search')) {
          e.preventDefault();
          openAccountIdSearchModal();
        }
        return;
      }
      if (action.btn.disabled) return;
      e.preventDefault();

      if (action.text === 'view') {
        fetchGLInterface();
        setMode(MODES.VIEW);
        return;
      }
      if (action.text === 'add') {
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
        const form = qs("#fa-gl-form");
        if (form) form.reset();
        state.pendingDeleteTag = null;
        setToast("Screen cleared", "success");
        setMode(MODES.VIEW);
        return;
      }
      if (action.text === 'delete') {
        handleDelete();
        return;
      }
      if (action.text === 'back') {
        window.location.href = "fixed-asset-type.html";
        return;
      }
    });

    // Nav buttons
    qsa("[data-fa-type-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-fa-type-nav") || "";
        if (target === "gl-interface") {
          fetchGLInterface();
        } else if (target === "accounting-rule") {
          window.location.href = "fixed-asset-accounting-rule.html";
        }
      });
    });
  });
})();
