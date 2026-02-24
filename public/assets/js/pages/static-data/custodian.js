(() => {
  if (window.__kairoCustodianPageLoaded) return;
  window.__kairoCustodianPageLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  const state = {
    mode: MODES.VIEW,
    hasLoaded: false,
    canAddFromId: false,
    isBusy: false,
    lastLoadedRow: null,
    currentUpdateCount: 0,
  };

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function formatSmallDateTime(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    // Format: MM/DD/YYYY HH:MM:SS
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  // =========================================================================
  // TOAST NOTIFICATION SYSTEM - Account Maintenance Pattern
  // =========================================================================
  
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

  function showToast(message, { title = 'Notification', variant = 'info', timeoutMs = 5000 } = {}) {
    const container = ensureToastContainer();

    const toast = document.createElement('div');
    toast.className = `kairo-toast kairo-toast--${variant}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-atomic', 'true');

    const header = document.createElement('div');
    header.className = 'kairo-toast__title';

    const titleEl = document.createElement('div');
    titleEl.textContent = title;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'kairo-toast__close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';

    const body = document.createElement('div');
    body.className = 'kairo-toast__body';
    body.textContent = String(message || '');

    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    toast.appendChild(header);
    toast.appendChild(body);
    container.appendChild(toast);

    const remove = () => {
      try {
        toast.classList.remove('is-show');
        setTimeout(() => { if (toast.parentElement) toast.parentElement.removeChild(toast); }, 300);
      } catch { /* ignore */ }
    };

    closeBtn.addEventListener('click', remove);
    setTimeout(() => toast.classList.add('is-show'), 0);
    if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
  }

  function setToast(message, variant = "success") {
    const titleMap = {
      success: 'Success',
      danger: 'Error',
      warning: 'Warning',
      info: 'Information'
    };
    showToast(message, { title: titleMap[variant] || 'Notice', variant: variant, timeoutMs: 4000 });
  }

  // =========================================================================
  // SECTION TOGGLE FUNCTIONALITY
  // =========================================================================
  
  function bindSectionToggles() {
    qsa('.form-section').forEach((section) => {
      const header = section.querySelector('.section-header');
      const toggleBtn = section.querySelector('.section-toggle-btn');
      
      if (header && toggleBtn) {
        header.addEventListener('click', (e) => {
          if (e.target.closest('.section-toggle-btn')) return;
          section.classList.toggle('collapsed');
          const isExpanded = !section.classList.contains('collapsed');
          toggleBtn.setAttribute('aria-expanded', isExpanded);
        });
        
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          section.classList.toggle('collapsed');
          const isExpanded = !section.classList.contains('collapsed');
          toggleBtn.setAttribute('aria-expanded', isExpanded);
        });
      }
    });
  }

  function setButtonDisabled(buttonEl, disabled) {
    if (!buttonEl) return;
    buttonEl.disabled = !!disabled;
    if (disabled) {
      buttonEl.setAttribute("disabled", "");
      buttonEl.setAttribute("aria-disabled", "true");
      buttonEl.classList.add("is-disabled");
    } else {
      buttonEl.removeAttribute("disabled");
      buttonEl.setAttribute("aria-disabled", "false");
      buttonEl.classList.remove("is-disabled");
    }
  }

  function getOperatorId() {
    try {
      const session = window.AuthService?.getSession?.();
      return session?.operatorId || session?.operatorID || session?.name || "CSADM";
    } catch {
      return "CSADM";
    }
  }

  function getActionButtons() {
    return {
      view: qs('[data-shell-mode="View"]'),
      add: qs('[data-shell-mode="Add"]'),
      edit: qs('[data-shell-mode="Update"]'),
      del: qs('[data-custodian-action="delete"]'),
      save: qs('[data-custodian-action="save"]'),
      cancel: qs('[data-custodian-action="cancel"]'),
      search: qs('[data-custodian-action="search"]'),
    };
  }

  // --- Staff ID Search Modal Logic ---
  function ensureStaffSearchModal() {
    const id = 'staffSearchModal';
    let modalEl = document.getElementById(id);
    if (modalEl) return modalEl;

    modalEl = document.createElement('div');
    modalEl.id = id;
    modalEl.className = 'modal fade';
    modalEl.tabIndex = -1;
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.innerHTML = `
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title mb-0">StaffID Search</h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="row g-2 align-items-center">
              <div class="col-12 col-lg-3 text-lg-end">
                <label class="form-label mb-0" for="staffSearchId">StaffID</label>
              </div>
              <div class="col-12 col-lg-3">
                <select class="form-select form-select-sm" id="staffSearchIdOp">
                  <option value="Like" selected>Like</option>
                  <option value="Exact">Exact</option>
                </select>
              </div>
              <div class="col-12 col-lg-6">
                <input type="text" class="form-control form-control-sm" id="staffSearchId" />
              </div>

              <div class="col-12 col-lg-3 text-lg-end">
                <label class="form-label mb-0" for="staffSearchName">Staff Name</label>
              </div>
              <div class="col-12 col-lg-3">
                <select class="form-select form-select-sm" id="staffSearchNameOp">
                  <option value="Like" selected>Like</option>
                  <option value="Exact">Exact</option>
                </select>
              </div>
              <div class="col-12 col-lg-6">
                <input type="text" class="form-control form-control-sm" id="staffSearchName" />
              </div>

              <div class="col-12 text-center mt-3">
                <button type="button" class="btn btn-sm btn-primary px-4" id="staffSearchGo">
                  Search
                </button>
              </div>
            </div>

            <div class="mt-4">
              <div class="small text-muted mb-2" id="staffSearchStatus">&nbsp;</div>
              <div class="table-responsive" style="max-height: 350px;">
                <table class="table table-sm table-hover align-middle mb-0">
                  <thead class="table-light">
                    <tr>
                      <th style="width: 50px;">#</th>
                      <th>StaffID</th>
                      <th>Staff Name</th>
                    </tr>
                  </thead>
                  <tbody id="staffSearchResults">
                    <tr><td colspan="3" class="text-muted">Click Search to load results.</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="modal-footer justify-content-between py-2">
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-sm btn-outline-secondary" id="staffSearchPrev" aria-label="Previous">
                <i class="bi bi-arrow-left"></i>
              </button>
              <button type="button" class="btn btn-sm btn-outline-secondary" id="staffSearchNext" aria-label="Next">
                <i class="bi bi-arrow-right"></i>
              </button>
            </div>
            <button type="button" class="btn btn-sm btn-primary px-4" id="staffSearchOk">OK</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(modalEl);

    // Bind events
    qs('#staffSearchGo', modalEl).addEventListener('click', runStaffSearch);
    qs('#staffSearchOk', modalEl).addEventListener('click', () => confirmSelectedStaff(modalEl));

    // Allow enter key to trigger search
    [qs('#staffSearchId', modalEl), qs('#staffSearchName', modalEl)].forEach(el => {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          runStaffSearch();
        }
      });
    });

    qs('#staffSearchResults', modalEl).addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-idx]');
      if (tr) setSelectedStaffIndex(modalEl, Number(tr.getAttribute('data-idx')));
    });

    qs('#staffSearchResults', modalEl).addEventListener('dblclick', (e) => {
      const tr = e.target.closest('tr[data-idx]');
      if (tr) {
        setSelectedStaffIndex(modalEl, Number(tr.getAttribute('data-idx')));
        confirmSelectedStaff(modalEl);
      }
    });

    return modalEl;
  }

  async function runStaffSearch() {
    const modalEl = document.getElementById('staffSearchModal');
    const status = qs('#staffSearchStatus', modalEl);
    const tbody = qs('#staffSearchResults', modalEl);

    status.textContent = 'Searching...';
    tbody.innerHTML = '<tr><td colspan="3" class="text-muted">Searching...</td></tr>';

    try {
      if (!window.SearchService && window.ServiceLoader?.loadSearchService) {
        await window.ServiceLoader.loadSearchService();
      }
      if (!window.SearchService) throw new Error("SearchService not available.");

      const env = window.Environment || {};
      const session = window.AuthService?.getSession?.() || {};

      const searchId = qs('#staffSearchId', modalEl).value.trim();
      const searchName = qs('#staffSearchName', modalEl).value.trim();
      const idOp = qs('#staffSearchIdOp', modalEl).value;
      const nameOp = qs('#staffSearchNameOp', modalEl).value;

      const conditions = [];
      const esc = (s) => String(s).replace(/'/g, "''");

      if (searchId) {
        if (idOp === 'Exact') conditions.push(`StaffID = '${esc(searchId)}'`);
        else conditions.push(`StaffID LIKE '%${esc(searchId)}%'`);
      }
      if (searchName) {
        if (nameOp === 'Exact') conditions.push(`Name = '${esc(searchName)}'`);
        else conditions.push(`Name LIKE '%${esc(searchName)}%'`);
      }

      const requestData = {
        TableID: "StaffID",
        AdvFilterString: "ClientTypeId = 'E'",
        WhereStmt: conditions.join(' AND '),
        PrevOrNext: 0,
        RefID: "",
        OperatorID: session.operatorId || env.OperatorID || "CSADM",
        ModuleID: 2098,
        OurBranchID: session.branchId || env.OurBranchID || env.defaultOurBranchId || "0101",
        SearchKey: searchId || "",
        LanguageID: "en"
      };

      const resp = await window.SearchService.searchClients(requestData);
      modalEl.__rows = [];

      if (resp && resp.success) {
        // Data can be in Details or Details01
        let rows = resp.data?.Details01 || resp.data?.Details || resp.Details || (Array.isArray(resp.data) ? resp.data : []);

        // Handle nested Details if present
        if (rows.length === 1 && rows[0].Details) {
          rows = rows[0].Details;
        }

        modalEl.__rows = Array.isArray(rows) ? rows : [];
        renderStaffSearchResults(modalEl.__rows);
      } else {
        status.textContent = resp?.message || 'Search failed.';
        tbody.innerHTML = `<tr><td colspan="3" class="text-danger">${resp?.message || 'Search failed.'}</td></tr>`;
      }
    } catch (err) {
      console.error(err);
      status.textContent = 'Error: ' + err.message;
      tbody.innerHTML = `<tr><td colspan="3" class="text-danger">Search error.</td></tr>`;
    }
  }

  function renderStaffSearchResults(rows) {
    const modalEl = document.getElementById('staffSearchModal');
    const tbody = qs('#staffSearchResults', modalEl);
    const status = qs('#staffSearchStatus', modalEl);

    if (!rows.length) {
      status.textContent = 'No results found.';
      tbody.innerHTML = '<tr><td colspan="3" class="text-muted">No results found.</td></tr>';
      return;
    }

    status.textContent = `${rows.length} record(s) found.`;
    tbody.innerHTML = rows.map((row, idx) => {
      const id = row.StaffID || row.StaffId || row.ID || "";
      const name = row.StaffName || row.Name || row.Name1 || "";
      return `
        <tr style="cursor:pointer;" data-idx="${idx}">
          <td>${idx + 1}</td>
          <td>${id}</td>
          <td>${name}</td>
        </tr>`;
    }).join('');

    setSelectedStaffIndex(modalEl, 0);
  }

  function setSelectedStaffIndex(modalEl, idx) {
    const rows = qsa('#staffSearchResults tr[data-idx]', modalEl);
    rows.forEach(r => r.classList.remove('table-active'));

    const target = rows.find(r => Number(r.getAttribute('data-idx')) === idx);
    if (target) {
      target.classList.add('table-active');
      modalEl.__selectedIdx = idx;
      modalEl.__selectedRow = modalEl.__rows[idx];
    }
  }

  function confirmSelectedStaff(modalEl) {
    const row = modalEl.__selectedRow;
    if (!row) return;

    const id = row.StaffID || row.StaffId || row.ID || "";
    const name = row.StaffName || row.Name || row.Name1 || "";

    const idInput = qs("#CustodianID");
    const nameInput = qs("#CustodianName");

    if (idInput) idInput.value = id;
    if (nameInput) nameInput.value = name;

    if (window.bootstrap?.Modal) {
      const instance = window.bootstrap.Modal.getInstance(modalEl);
      instance?.hide();
    }

    // After selecting an ID, we should attempt to load if in view mode
    if (state.mode === MODES.VIEW) {
      handleViewOrSearch();
    }
  }

  function updateActionButtons() {
    const { view, add, edit, del, save, cancel, search } = getActionButtons();
    setButtonDisabled(view, false);

    const isEditable = state.mode === MODES.ADD || state.mode === MODES.UPDATE;
    const canCancelInView = state.hasLoaded || state.canAddFromId;

    // In View mode: Add becomes available only when View/Search confirmed not found.
    setButtonDisabled(add, !(state.mode === MODES.VIEW && state.canAddFromId));
    setButtonDisabled(edit, !(state.mode === MODES.VIEW && state.hasLoaded));
    setButtonDisabled(del, !(state.mode === MODES.VIEW && state.hasLoaded));
    setButtonDisabled(save, !isEditable);
    setButtonDisabled(cancel, !(isEditable || (state.mode === MODES.VIEW && canCancelInView)));

    // Enable the main custodian search button
    setButtonDisabled(search, false);
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
    const hasBusinessKeys = keys.some((k) => k.includes("custodian") || k.includes("department") || k.includes("section") || k.includes("name"));
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

  function extractRow(payload) {
    if (!payload) return null;
    if (Array.isArray(payload)) return payload[0] || null;

    if (typeof payload === "object" && payload !== null) {
      const datasets = [];
      for (const [k, v] of Object.entries(payload)) {
        if (!Array.isArray(v) || !v.length) continue;
        datasets.push({ key: k, value: v });
      }

      function scoreRow(row) {
        if (!row || typeof row !== "object") return -9999;
        if (isMetaOnlyObject(row)) return -9999;
        const id = pickValue(row, ["CustodianID", "CustodianId"], ["custodianid"]);
        const dept = pickValue(row, ["Department"], ["department"]);
        const name = pickValue(row, ["CustodianName", "Name"], ["custodianname", "name"]);
        let score = 0;
        if (id != null) score += 100;
        if (dept != null) score += 20;
        if (name != null) score += 10;
        return score;
      }

      let best = null;
      let bestScore = -9999;
      for (const ds of datasets) {
        for (const row of ds.value) {
          const s = scoreRow(row);
          if (s > bestScore) {
            bestScore = s;
            best = row;
          }
        }
      }
      if (best) return best;

      const details = payload.Details || payload.details;
      if (Array.isArray(details)) {
        return details.find((r) => r && typeof r === "object" && !isMetaOnlyObject(r)) || null;
      }
      if (details && typeof details === "object" && !Array.isArray(details)) {
        return isMetaOnlyObject(details) ? null : details;
      }

      return isMetaOnlyObject(payload) ? null : payload;
    }

    return null;
  }

  function setSelectValue(selectEl, value) {
    if (!selectEl) return;
    const v = value == null ? "" : String(value);
    if (!v) {
      selectEl.value = "";
      return;
    }
    const normalized = v.trim().toLowerCase();
    const match = Array.from(selectEl.options).find((o) => {
      const ov = String(o.value ?? "").trim().toLowerCase();
      const ot = String(o.textContent ?? "").trim().toLowerCase();
      return ov === normalized || ot === normalized;
    });
    if (match) selectEl.value = match.value;
    else selectEl.value = v;
  }

  function applyDataToForm(row) {
    if (!row || typeof row !== "object") return;

    console.log('[applyDataToForm] Row data:', row);
    console.log('[applyDataToForm] Row keys:', Object.keys(row));

    const id = pickValue(row, ["CustodianID", "CustodianId"], ["custodianid"]);
    const name = pickValue(row, ["CustodianName", "Name"], ["custodianname", "name"]);
    const department = pickValue(row, ["Department"], ["department"]);
    const section = pickValue(row, ["Section"], ["section"]);

    const createdBy = pickValue(row, ["CreatedBy"], ["createdby"]);
    const createdOn = pickValue(row, ["CreatedOn", "CreatedDate"], ["createdon", "createddate"]);
    const modifiedBy = pickValue(row, ["ModifiedBy"], ["modifiedby"]);
    const modifiedOn = pickValue(row, ["ModifiedOn", "ModifiedDate"], ["modifiedon", "modifieddate"]);
    const supervisedBy = pickValue(row, ["SupervisedBy"], ["supervisedby"]);
    const supervisedOn = pickValue(row, ["SupervisedOn", "SupervisedDate"], ["supervisedon", "superviseddate"]);

    console.log('[applyDataToForm] Audit values:', { createdBy, createdOn, modifiedBy, modifiedOn, supervisedBy, supervisedOn });

    if (id != null) qs("#CustodianID") && (qs("#CustodianID").value = String(id));
    if (name != null) qs("#CustodianName") && (qs("#CustodianName").value = String(name));

    if (department != null) setSelectValue(qs("#Department"), department);
    if (section != null) setSelectValue(qs("#Section"), section);

    if (createdBy != null) qs("#CreatedBy") && (qs("#CreatedBy").textContent = String(createdBy));
    if (createdOn != null) qs("#CreatedOn") && (qs("#CreatedOn").textContent = String(createdOn));
    if (modifiedBy != null) qs("#ModifiedBy") && (qs("#ModifiedBy").textContent = String(modifiedBy));
    if (modifiedOn != null) qs("#ModifiedOn") && (qs("#ModifiedOn").textContent = String(modifiedOn));
    if (supervisedBy != null) qs("#SupervisedBy") && (qs("#SupervisedBy").textContent = String(supervisedBy));
    if (supervisedOn != null) qs("#SupervisedOn") && (qs("#SupervisedOn").textContent = String(supervisedOn));

    state.currentUpdateCount = row.UpdateCount ?? row.updateCount ?? 0;
    state.lastLoadedRow = { ...row };
  }

  function clearFormAll() {
    const form = qs("#custodian-form");
    if (!form) return;
    qsa("input, select, textarea", form).forEach((el) => {
      if (el.type === "checkbox") {
        el.checked = false;
        return;
      }
      el.value = "";
    });
    // Clear audit fields
    qsa(".audit-value").forEach((el) => {
      el.textContent = "";
    });
    state.hasLoaded = false;
    state.canAddFromId = false;
    state.lastLoadedRow = null;
  }

  function clearFormData(opts = {}) {
    const form = qs("#custodian-form");
    if (!form) return;
    const keepId = opts.keepId !== false;
    const clearAlwaysEnabled = opts.clearAlwaysEnabled === true;
    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled") && !clearAlwaysEnabled) {
        if (!keepId && (el.id === "CustodianID" || el.name === "CustodianID")) {
          el.value = "";
        }
        return;
      }

      if (el.tagName === "SELECT") {
        el.value = "";
        return;
      }

      el.value = "";
    });

    state.hasLoaded = false;
    state.canAddFromId = false;
    state.lastLoadedRow = null;
  }

  function clearFormForAdd() {
    const keepId = qs("#CustodianID")?.value?.trim() || "";
    clearFormData({ keepId: true });
    if (qs("#CustodianID")) qs("#CustodianID").value = keepId;
    state.canAddFromId = !!keepId;
  }

  async function ensureServicesLoaded() {
    if (!window.ServiceLoader) throw new Error("ServiceLoader missing");
    await window.ServiceLoader.loadCore();
    await window.ServiceLoader.loadLookupService();
    await window.ServiceLoader.loadStaticDataService();
    if (!window.StaticDataService?.getCustodian) {
      throw new Error("StaticDataService.getCustodian is not available");
    }
  }

  async function populateDropdowns() {
    try {
      await ensureServicesLoaded();
      if (!window.LookupService) return;

      const deptSelect = qs("#Department");
      if (deptSelect) {
        const departments = await window.LookupService.getDepartments();
        deptSelect.innerHTML = '<option value="" selected>--Select--</option>';
        departments.forEach((dept) => {
          const opt = document.createElement("option");
          opt.value = dept.value;
          opt.textContent = dept.label;
          deptSelect.appendChild(opt);
        });
      }

      const sectionSelect = qs("#Section");
      if (sectionSelect) {
        const sections = await window.LookupService.getSections();
        sectionSelect.innerHTML = '<option value="" selected>--Select--</option>';
        sections.forEach((sec) => {
          const opt = document.createElement("option");
          opt.value = sec.value;
          opt.textContent = sec.label;
          sectionSelect.appendChild(opt);
        });
      }
    } catch (e) {
      console.warn("[Custodian] Dropdown population failed:", e);
    }
  }

  async function handleViewOrSearch() {
    if (state.isBusy) return;
    const id = qs("#CustodianID")?.value?.trim() || "";
    if (!id) {
      setToast("Enter Custodian ID.", "warning");
      return;
    }

    state.isBusy = true;
    setToast("Loading...", "info");
    try {
      await ensureServicesLoaded();

      const resp = await window.StaticDataService.getCustodian(id, 0);
      console.log('[handleViewOrSearch] Full response:', resp);
      console.log('[handleViewOrSearch] Response keys:', Object.keys(resp || {}));
      console.log('[handleViewOrSearch] resp.data:', resp?.data);
      console.log('[handleViewOrSearch] resp.Details:', resp?.Details);
      
      if (resp && typeof resp.success === "boolean" && !resp.success) {
        clearFormData({ keepId: true });
        state.canAddFromId = true;
        setMode(MODES.VIEW);
        const msg = resp.message || "Request failed.";
        const code = resp.code ? ` (${resp.code})` : "";
        setToast(`${msg}${code}`, "danger");
        return;
      }

      const payload = resp?.data ?? resp?.Details ?? resp;
      console.log('[handleViewOrSearch] Payload sent to extractRow:', payload);
      const row = extractRow(payload);
      console.log('[handleViewOrSearch] Row extracted:', row);
      console.log('[handleViewOrSearch] Row keys:', row ? Object.keys(row) : 'null');
      
      if (!row) {
        clearFormData({ keepId: true });
        state.canAddFromId = true;
        setMode(MODES.VIEW);
        setToast("Record not found. Click Add.", "warning");
        return;
      }

      applyDataToForm(row);
      state.hasLoaded = true;
      state.canAddFromId = false;
      setMode(MODES.VIEW);
      setToast("Loaded.", "success");
    } catch (e) {
      console.error(e);
      setToast(e?.message || "Failed to load.", "danger");
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  function setMode(nextMode) {
    state.mode = nextMode;

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#custodian-form");
    if (!form) return;

    const fields = qsa("input, select, textarea", form);
    const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

    for (const el of fields) {
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        continue;
      }
      el.disabled = !isEditable;
    }

    const buttons = qsa("button", form);
    for (const b of buttons) {
      if (b.hasAttribute("data-always-enabled")) b.disabled = false;
    }

    updateActionButtons();
  }

  // --- Staff ID Search Modal Logic ---
  function ensureStaffSearchModal() {
    const id = 'staffSearchModal';
    let modalEl = document.getElementById(id);
    if (modalEl) return modalEl;

    modalEl = document.createElement('div');
    modalEl.id = id;
    modalEl.className = 'modal fade';
    modalEl.tabIndex = -1;
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.innerHTML = `
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title mb-0">StaffID Search</h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="row g-2 align-items-center">
              <div class="col-12 col-lg-3 text-lg-end">
                <label class="form-label mb-0" for="staffSearchId">StaffID</label>
              </div>
              <div class="col-12 col-lg-3">
                <select class="form-select form-select-sm" id="staffSearchIdOp">
                  <option value="Like" selected>Like</option>
                  <option value="Exact">Exact</option>
                </select>
              </div>
              <div class="col-12 col-lg-6">
                <input type="text" class="form-control form-control-sm" id="staffSearchId" />
              </div>

              <div class="col-12 col-lg-3 text-lg-end">
                <label class="form-label mb-0" for="staffSearchName">Staff Name</label>
              </div>
              <div class="col-12 col-lg-3">
                <select class="form-select form-select-sm" id="staffSearchNameOp">
                  <option value="Like" selected>Like</option>
                  <option value="Exact">Exact</option>
                </select>
              </div>
              <div class="col-12 col-lg-6">
                <input type="text" class="form-control form-control-sm" id="staffSearchName" />
              </div>

              <div class="col-12 text-center mt-3">
                <button type="button" class="btn btn-sm btn-primary px-4" id="staffSearchGo">
                  Search
                </button>
              </div>
            </div>

            <div class="mt-4">
              <div class="small text-muted mb-2" id="staffSearchStatus">&nbsp;</div>
              <div class="table-responsive" style="max-height: 350px;">
                <table class="table table-sm table-hover align-middle mb-0">
                  <thead class="table-light">
                    <tr>
                      <th style="width: 50px;">#</th>
                      <th>StaffID</th>
                      <th>Staff Name</th>
                    </tr>
                  </thead>
                  <tbody id="staffSearchResults">
                    <tr><td colspan="3" class="text-muted">Click Search to load results.</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="modal-footer justify-content-between py-2">
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-sm btn-outline-secondary" id="staffSearchPrev" aria-label="Previous">
                <i class="bi bi-arrow-left"></i>
              </button>
              <button type="button" class="btn btn-sm btn-outline-secondary" id="staffSearchNext" aria-label="Next">
                <i class="bi bi-arrow-right"></i>
              </button>
            </div>
            <button type="button" class="btn btn-sm btn-primary px-4" id="staffSearchOk">OK</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(modalEl);

    // Bind events
    qs('#staffSearchGo', modalEl).addEventListener('click', runStaffSearch);
    qs('#staffSearchOk', modalEl).addEventListener('click', () => confirmSelectedStaff(modalEl));

    // Allow enter key to trigger search
    [qs('#staffSearchId', modalEl), qs('#staffSearchName', modalEl)].forEach(el => {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          runStaffSearch();
        }
      });
    });

    qs('#staffSearchResults', modalEl).addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-idx]');
      if (tr) setSelectedStaffIndex(modalEl, Number(tr.getAttribute('data-idx')));
    });

    qs('#staffSearchResults', modalEl).addEventListener('dblclick', (e) => {
      const tr = e.target.closest('tr[data-idx]');
      if (tr) {
        setSelectedStaffIndex(modalEl, Number(tr.getAttribute('data-idx')));
        confirmSelectedStaff(modalEl);
      }
    });

    return modalEl;
  }

  async function runStaffSearch() {
    const modalEl = document.getElementById('staffSearchModal');
    const status = qs('#staffSearchStatus', modalEl);
    const tbody = qs('#staffSearchResults', modalEl);

    status.textContent = 'Searching...';
    tbody.innerHTML = '<tr><td colspan="3" class="text-muted">Searching...</td></tr>';

    try {
      if (!window.SearchService && window.ServiceLoader?.loadSearchService) {
        await window.ServiceLoader.loadSearchService();
      }
      if (!window.SearchService) throw new Error("SearchService not available.");

      const env = window.Environment || {};
      const session = window.AuthService?.getSession?.() || {};

      const searchId = qs('#staffSearchId', modalEl).value.trim();
      const searchName = qs('#staffSearchName', modalEl).value.trim();
      const idOp = qs('#staffSearchIdOp', modalEl).value;
      const nameOp = qs('#staffSearchNameOp', modalEl).value;

      const conditions = [];
      const esc = (s) => String(s).replace(/'/g, "''");

      if (searchId) {
        if (idOp === 'Exact') conditions.push(`ID = '${esc(searchId)}'`);
        else conditions.push(`ID LIKE '%${esc(searchId)}%'`);
      }
      if (searchName) {
        if (nameOp === 'Exact') conditions.push(`Name = '${esc(searchName)}'`);
        else conditions.push(`Name LIKE '%${esc(searchName)}%'`);
      }

      // Resolve parameters with Environment.js priority
      const branchId = session.branchId ||
        session.OurBranchID ||
        env.OurBranchID ||
        env.defaultOurBranchId ||
        "0101";

      const operatorId = session.operatorId ||
        session.OperatorID ||
        env.OperatorID ||
        "CSADM";

      const requestData = {
        TableID: "StaffID",
        AdvFilterString: "ClientTypeId = 'E'",
        WhereStmt: conditions.join(' AND '),
        PrevOrNext: 0,
        RefID: "",
        OperatorID: operatorId,
        ModuleID: 2098,
        OurBranchID: branchId,
        SearchKey: searchId || "",
        LanguageID: "en"
      };

      const resp = await window.SearchService.searchClients(requestData);
      modalEl.__rows = [];

      if (resp && resp.success) {
        // Data can be in Details or Details01
        let rows = resp.data?.Details01 || resp.data?.Details || resp.Details || (Array.isArray(resp.data) ? resp.data : []);

        // Handle nested Details if present
        if (rows.length === 1 && rows[0].Details) {
          rows = rows[0].Details;
        }

        modalEl.__rows = Array.isArray(rows) ? rows : [];
        renderStaffSearchResults(modalEl.__rows);
      } else {
        status.textContent = resp?.message || 'Search failed.';
        tbody.innerHTML = `<tr><td colspan="3" class="text-danger">${resp?.message || 'Search failed.'}</td></tr>`;
      }
    } catch (err) {
      console.error(err);
      status.textContent = 'Error: ' + err.message;
      tbody.innerHTML = `<tr><td colspan="3" class="text-danger">Search error.</td></tr>`;
    }
  }

  function renderStaffSearchResults(rows) {
    const modalEl = document.getElementById('staffSearchModal');
    const tbody = qs('#staffSearchResults', modalEl);
    const status = qs('#staffSearchStatus', modalEl);

    if (!rows.length) {
      status.textContent = 'No results found.';
      tbody.innerHTML = '<tr><td colspan="3" class="text-muted">No results found.</td></tr>';
      return;
    }

    status.textContent = `${rows.length} record(s) found.`;
    tbody.innerHTML = rows.map((row, idx) => {
      const id = row.StaffID || row.StaffId || row.ID || "";
      const name = row.StaffName || row.Name || row.Name1 || "";
      return `
        <tr style="cursor:pointer;" data-idx="${idx}">
          <td>${idx + 1}</td>
          <td>${id}</td>
          <td>${name}</td>
        </tr>`;
    }).join('');

    setSelectedStaffIndex(modalEl, 0);
  }

  function setSelectedStaffIndex(modalEl, idx) {
    const rows = qsa('#staffSearchResults tr[data-idx]', modalEl);
    rows.forEach(r => r.classList.remove('table-active'));

    const target = rows.find(r => Number(r.getAttribute('data-idx')) === idx);
    if (target) {
      target.classList.add('table-active');
      modalEl.__selectedIdx = idx;
      modalEl.__selectedRow = modalEl.__rows[idx];
    }
  }

  function confirmSelectedStaff(modalEl) {
    const row = modalEl.__selectedRow;
    if (!row) return;

    const id = row.StaffID || row.StaffId || row.ID || "";
    const name = row.StaffName || row.Name || row.Name1 || "";

    const idInput = qs("#CustodianID");
    const nameInput = qs("#CustodianName");

    if (idInput) idInput.value = id;
    if (nameInput) nameInput.value = name;

    if (window.bootstrap?.Modal) {
      const instance = window.bootstrap.Modal.getInstance(modalEl);
      instance?.hide();
    }

    // After selecting an ID, we should attempt to load if in view mode
    if (state.mode === MODES.VIEW) {
      handleViewOrSearch();
    }
  }

  function bindModeButtons() {
    qsa("[data-shell-mode]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const next = btn.getAttribute("data-shell-mode");
        if (!next || !MODES[next.toUpperCase()]) return;

        const nextMode = MODES[next.toUpperCase()];
        if (nextMode === MODES.VIEW) {
          const id = qs("#CustodianID")?.value?.trim() || "";
          if (id) {
            await handleViewOrSearch();
          } else {
            setMode(MODES.VIEW);
          }
          return;
        }

        if (nextMode === MODES.ADD) {
          const id = qs("#CustodianID")?.value?.trim() || "";
          if (!id) {
            setToast("Enter Custodian ID first.", "warning");
            return;
          }
          if (!state.canAddFromId) {
            setToast("Click View/Search first to confirm it doesn't exist.", "warning");
            return;
          }
          clearFormForAdd();
          setMode(MODES.ADD);
          return;
        }

        if (nextMode === MODES.UPDATE) {
          if (!state.hasLoaded) {
            setToast("Load a record first (View/Search) before editing.", "warning");
            return;
          }
          setMode(MODES.UPDATE);
          return;
        }

        setMode(nextMode);
      });
    });
  }

  function bindActions() {
    const { save, cancel, del, search, view } = getActionButtons();

    // view listener is already handled in bindModeButtons via [data-shell-mode="View"]
    // so we don't need a second listener here to avoid double-loading.



    qs("#CustodianID")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleViewOrSearch();
      }
    });

    save?.addEventListener("click", async () => {
      if (state.mode === MODES.VIEW) {
        setToast("Switch to Add/Edit before saving.", "warning");
        return;
      }
      await handleSave();
    });

    cancel?.addEventListener("click", () => {
      // Always clear all fields when Cancel is clicked
      clearFormData({ keepId: false, clearAlwaysEnabled: true });
      state.currentUpdateCount = 0;
      setMode(MODES.VIEW);
      setToast("Cleared.", "info");
    });

    del?.addEventListener("click", () => {
      (async () => {
        if (del.disabled) return;
        if (state.isBusy) return;
        
        if (!state.hasLoaded) {
          setToast("Load a record before deleting.", "warning");
          return;
        }

        const id = qs("#CustodianID")?.value?.trim() || "";
        if (!id) {
          setToast("Enter Custodian ID to delete.", "warning");
          return;
        }

        // Use SweetAlert2 for delete confirmation
        const result = await window.Swal.fire({
          title: 'Delete Record?',
          text: `Are you sure you want to delete Custodian ${id}? This action cannot be undone.`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, Delete',
          confirmButtonColor: '#dc3545',
          cancelButtonText: 'Cancel',
          cancelButtonColor: '#6c757d'
        });

        if (!result.isConfirmed) return;

        await handleDelete();
      })();
    });
  }

  async function handleSave() {
    if (state.isBusy) return;
    const id = qs("#CustodianID")?.value?.trim() || "";
    if (!id) {
      setToast("Custodian ID is required.", "warning");
      return;
    }

    const dept = qs("#Department")?.value || "";
    if (!dept) {
      setToast("Department is required.", "warning");
      return;
    }

    const operatorId = getOperatorId();
    const now = formatSmallDateTime();

    const requestData = {
      CustodianID: id,
      Name: qs("#CustodianName")?.value || "",
      Department: qs("#Department")?.value || "",
      Section: qs("#Section")?.value || "",
      CreatedBy: state.mode === MODES.ADD ? operatorId : (qs("#CreatedBy")?.textContent || operatorId),
      CreatedOn: state.mode === MODES.ADD ? now : (qs("#CreatedOn")?.textContent || now),
      ModifiedBy: operatorId,
      ModifiedOn: now,
      NewRecord: state.mode === MODES.ADD ? 1 : (state.currentUpdateCount || 0)
    };

    state.isBusy = true;
    setToast("Saving...", "info");
    try {
      await ensureServicesLoaded();
      const resp = await window.StaticDataService.addEditCustodian(requestData);

      if (resp && resp.success) {
        setToast("Saved.", "success");
        state.currentUpdateCount = 0;
        clearFormAll();
        setMode(MODES.VIEW, { initial: true });
      } else {
        setToast(resp?.message || "Save failed.", "danger");
      }
    } catch (e) {
      console.error(e);
      setToast(e?.message || "Save failed.", "danger");
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  async function handleDelete() {
    if (state.isBusy) return;

    const id = qs("#CustodianID")?.value?.trim() || "";
    if (!id) return;

    console.groupCollapsed("[Custodian] dbo.P_DeleteCustodian");
    console.info("CustodianID", id);

    state.isBusy = true;
    setToast("Deleting...", "info");
    try {
      await ensureServicesLoaded();
      const resp = await window.StaticDataService.deleteCustodian(id);

      if (resp && resp.success) {
        setToast("Custodian deleted successfully.", "success");
        clearFormAll();
        state.currentUpdateCount = 0;
        setMode(MODES.VIEW, { initial: true });
        console.groupEnd();
      } else {
        const errorMsg = resp?.message || resp?.Message || resp?.ResponseMessage || "Delete failed.";
        setToast(errorMsg, "danger");
        console.groupEnd();
      }
    } catch (e) {
      console.error(e);
      const errorMsg = e?.message || e?.Message || "Delete failed.";
      setToast(errorMsg, "danger");
      console.groupEnd();
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  window.addEventListener("load", () => {
    bindModeButtons();
    bindActions();
    bindSectionToggles();
    setMode(MODES.VIEW);
    updateActionButtons();
    populateDropdowns();

    // Best-effort preload.
    try {
      void ensureServicesLoaded();
    } catch {
      // ignore
    }
  });
})();
