(() => {
  if (window.__kairoDeviceMaintenanceLoaded) return;
  window.__kairoDeviceMaintenanceLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  const state = {
    mode: MODES.VIEW,
    selectedIndex: -1,
    rows: [],
    lastSearchTableId: "Branches",
    isBusy: false,
    updateCount: 0,
    gridAction: null // 'new' | 'alter' | null
  };

  const branchLookupState = {
    baselineRows: null,
    baselineLoadedAt: 0,
    isLoadingBaseline: false,
    lastError: "",
  };

  const glLookupState = {
    baselineRows: null,
    baselineLoadedAt: 0,
    isLoadingBaseline: false,
    lastError: "",
    lastTableId: "",
  };

  let branchLookupModalInstance = null;
  let inlineAlertAutoHideTimer = null;

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function initSectionToggles() {
    const headers = qsa('[data-section-toggle]');

    function setCollapsed(section, collapsed) {
      if (!section) return;
      const content = qs('[data-section-content]', section);
      if (!content) return;

      if (collapsed) content.setAttribute('hidden', '');
      else content.removeAttribute('hidden');

      const header = qs('[data-section-toggle]', section);
      const toggleBtn = header ? qs('.section-toggle-btn', header) : null;
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(!collapsed));

      const icon = toggleBtn ? qs('i.bi', toggleBtn) : null;
      if (icon) {
        icon.classList.toggle('bi-chevron-up', !collapsed);
        icon.classList.toggle('bi-chevron-down', collapsed);
      }
    }

    headers.forEach((header) => {
      if (header.dataset.kairoSectionToggleBound === '1') return;
      header.dataset.kairoSectionToggleBound = '1';

      const section = header.closest('.form-section');
      if (!section) return;

      const content = qs('[data-section-content]', section);
      setCollapsed(section, !!content?.hasAttribute('hidden'));

      const toggle = (e) => {
        e?.preventDefault?.();
        const isCollapsed = !!qs('[data-section-content]', section)?.hasAttribute('hidden');
        setCollapsed(section, !isCollapsed);
      };

      header.addEventListener('click', toggle);

      const toggleBtn = qs('.section-toggle-btn', header);
      if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggle(e);
        });
      }
    });
  }

  function setLookupFieldLabels(idLabel, nameLabel) {
    const modal = qs("#branchLookupModal");
    const idEl = modal?.querySelector('label[for="branchSearchId"]');
    const nameEl = modal?.querySelector('label[for="branchSearchName"]');
    if (idEl) idEl.textContent = idLabel;
    if (nameEl) nameEl.textContent = nameLabel;
  }

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

  function showToast(message, { title = 'Message', variant = 'info', timeoutMs = 4500 } = {}) {
    const container = ensureToastContainer();

    const toast = document.createElement('div');
    toast.className = `kairo-toast${variant ? ` kairo-toast--${variant}` : ''}`;
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
        setTimeout(() => toast.remove(), 160);
      } catch {
        // ignore
      }
    };

    closeBtn.addEventListener('click', remove);
    setTimeout(() => toast.classList.add('is-show'), 0);
    if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
  }

  function setToast(message, variant = "success") {
    const inline = qs('[data-device-maintenance-alert]');
    const inlineText = qs('[data-device-maintenance-alert-text]', inline || undefined);
    const inlineClose = qs('[data-device-maintenance-alert-close]', inline || undefined);

    const msg = String(message ?? '').trim();
    const normalized = String(variant || '').toLowerCase();

    const toastVariant =
      normalized === 'success'
        ? 'success'
        : normalized === 'warning'
          ? 'warning'
          : normalized === 'danger'
            ? 'danger'
            : 'info';

    const alertClass =
      toastVariant === 'success'
        ? 'alert-success'
        : toastVariant === 'warning'
          ? 'alert-warning'
          : toastVariant === 'info'
            ? 'alert-info'
            : 'alert-danger';

    // Prefer on-page banner at the top of the form (matches Account Maintenance-style on-page feedback)
    if (inline && inlineText) {
      if (!msg) {
        if (inlineAlertAutoHideTimer) {
          clearTimeout(inlineAlertAutoHideTimer);
          inlineAlertAutoHideTimer = null;
        }
        inline.classList.add('d-none');
        inline.setAttribute('hidden', '');
        return;
      }

      inline.classList.remove('alert-success', 'alert-danger', 'alert-warning', 'alert-info');
      inline.classList.add(alertClass);
      inlineText.textContent = msg;
      inline.classList.remove('d-none');
      inline.removeAttribute('hidden');

      if (inlineAlertAutoHideTimer) {
        clearTimeout(inlineAlertAutoHideTimer);
        inlineAlertAutoHideTimer = null;
      }
      inlineAlertAutoHideTimer = setTimeout(() => {
        try {
          inline.classList.add('d-none');
          inline.setAttribute('hidden', '');
        } finally {
          inlineAlertAutoHideTimer = null;
        }
      }, 6000);

      if (inlineClose && inlineClose.dataset.bound !== '1') {
        inlineClose.dataset.bound = '1';
        inlineClose.addEventListener('click', () => {
          if (inlineAlertAutoHideTimer) {
            clearTimeout(inlineAlertAutoHideTimer);
            inlineAlertAutoHideTimer = null;
          }
          inline.classList.add('d-none');
          inline.setAttribute('hidden', '');
        });
      }
      return;
    }

    // Fallback: floating top toasts
    if (!msg) return;
    showToast(msg, {
      title:
        toastVariant === 'danger'
          ? 'Error'
          : toastVariant === 'warning'
            ? 'Warning'
            : toastVariant === 'success'
              ? 'Success'
              : 'Info',
      variant: toastVariant,
      timeoutMs: toastVariant === 'danger' ? 6000 : 4500,
    });
  }

  async function ensureServicesLoaded() {
    if (!window.ServiceLoader) throw new Error("ServiceLoader missing");
    await window.ServiceLoader.loadCore();
    // AuthService provides OperatorID/BranchID for downstream calls.
    await window.ServiceLoader.loadAuthService?.();
    // GL lookup uses GeneralLedgerService.getSearchResult (GLBranchActiveID) in other modules.
    // SearchService is still used as a fallback for older TableIDs.
    await window.ServiceLoader.loadSearchService?.();
    await window.ServiceLoader.loadGeneralLedgerService?.();
    await window.ServiceLoader.loadStaticDataService();
  }

  function getOperatorId() {
    try {
      const session = window.AuthService?.getSession?.() || {};
      return (
        session.operatorId ||
        session.operatorID ||
        window.Config?.OperatorID ||
        localStorage.getItem("OperatorID") ||
        session.name ||
        "web_portal"
      );
    } catch { return "web_portal"; }
  }

  function getBranchId() {
    try {
      const session = window.AuthService?.getSession?.() || {};
      return (
        session.branchId ||
        session.branchID ||
        session.OurBranchID ||
        window.Config?.BranchID ||
        localStorage.getItem("BranchID") ||
        ""
      );
    } catch { return ""; }
  }

  function formatMDYHMS(date) {
    const pad2 = (n) => String(n).padStart(2, "0");
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  }

  function setMode(nextMode) {
    state.mode = nextMode;

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#device-maintenance-form");
    if (!form) return;

    const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        return;
      }
      el.disabled = !isEditable;
    });

    qsa("button[data-always-enabled]", form).forEach((btn) => {
      btn.disabled = false;
    });

    // List management buttons only enabled in non-view modes
    qsa("[data-dm-grid-action]", form).forEach((btn) => {
      btn.disabled = !isEditable;
    });

    const { edit, save, cancel, back } = getActionButtons();
    
    // Edit button - only in view mode with a selected item
    setButtonDisabled(edit, nextMode !== MODES.VIEW || state.selectedIndex < 0);
    // Save button - only in add/update mode
    setButtonDisabled(save, !isEditable);
    // Cancel and Back - always enabled
    setButtonDisabled(cancel, false);
    setButtonDisabled(back, false);
    
    // Update grid buttons state
    updateGridButtons();
  }

  function getActionButtons() {
    return {
      edit: qs('[data-shell-mode="Update"]'),
      save: qs('[data-dm-action="save"]'),
      cancel: qs('[data-dm-action="cancel"]'),
      back: qs('[data-dm-action="back"]'),
    };
  }

  function setButtonDisabled(buttonEl, disabled) {
    if (!buttonEl) return;
    buttonEl.disabled = !!disabled;
    if (disabled) {
      buttonEl.classList.add("is-disabled");
    } else {
      buttonEl.classList.remove("is-disabled");
    }
  }

  // ==================== GRID BUTTON STATE ====================
  function updateGridButtons() {
    const isEditMode = state.mode === MODES.UPDATE;
    const currentAction = state.gridAction;
    const hasRowSelected = state.selectedIndex >= 0;
    const hasData = state.rows.length > 0;

    // Get all grid buttons
    const newBtn = qs('[data-dm-grid-action="new"]');
    const alterBtn = qs('[data-dm-grid-action="alter"]');
    const removeBtn = qs('[data-dm-grid-action="remove"]');
    const updateBtn = qs('[data-dm-grid-action="update"]');
    const clearBtn = qs('[data-dm-grid-action="clear"]');

    if (!isEditMode || !hasData) {
      // View mode or no data - disable all grid buttons
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

  function getFormData() {
    return {
      BranchId: qs("#BranchId")?.value?.trim() || "",
      BranchName: qs("#BranchName")?.value?.trim() || "",
      DeviceId: qs("#DeviceId")?.value?.trim() || "",
      DeviceDescription: qs("#DeviceDescription")?.value?.trim() || "",
      SettlementGl: qs("#SettlementGl")?.value?.trim() || "",
      SettlementGlName: qs("#SettlementGlName")?.value?.trim() || "",
      ReceivableGl: qs("#ReceivableGl")?.value?.trim() || "",
      ReceivableGlName: qs("#ReceivableGlName")?.value?.trim() || "",
      BankId: qs("#BankId")?.value?.trim() || "",
      IsActive: Boolean(qs("#IsActive")?.checked),
      IsLocal: Boolean(qs("#IsLocal")?.checked),
    };
  }

  function setFormData(row) {
    if (!row) return;
    const setValue = (id, value) => {
      const el = qs(`#${id}`);
      if (!el) return;
      el.value = value ?? "";
    };

    setValue("BranchId", row.BranchId);
    setValue("BranchName", row.BranchName);
    setValue("DeviceId", row.DeviceId);
    setValue("DeviceDescription", row.DeviceDescription);
    setValue("SettlementGl", row.SettlementGl);
    setValue("SettlementGlName", row.SettlementGlName);
    setValue("ReceivableGl", row.ReceivableGl);
    setValue("ReceivableGlName", row.ReceivableGlName);
    setValue("BankId", row.BankId);

    const isActive = qs("#IsActive");
    if (isActive) isActive.checked = Boolean(row.IsActive);
    const isLocal = qs("#IsLocal");
    if (isLocal) isLocal.checked = Boolean(row.IsLocal);

    // Audit fields
    setValue("CreatedBy", row.CreatedBy);
    setValue("CreatedOn", row.CreatedOn);
    setValue("ModifiedBy", row.ModifiedBy);
    setValue("ModifiedOn", row.ModifiedOn);
    setValue("SupervisedBy", row.SupervisedBy);
    setValue("SupervisedOn", row.SupervisedOn);
    state.updateCount = row.UpdateCount || 0;
  }

  function renderGrid() {
    const body = qs("[data-dm-grid-body]");
    if (!body) return;

    body.innerHTML = "";

    if (!state.rows.length) {
      const tr = document.createElement("tr");
      tr.className = "dm-empty";
      tr.innerHTML = `<td colspan="6" class="text-center py-3 text-muted">No records to display.</td>`;
      body.appendChild(tr);
      return;
    }

    state.rows.forEach((row, idx) => {
      const tr = document.createElement("tr");
      tr.style.cursor = "pointer";
      if (idx === state.selectedIndex) tr.classList.add("table-primary");

      const bId = row.BranchId || row.OurBranchID || "";
      const dId = row.DeviceId || row.DeviceID || "";

      tr.innerHTML = `
        <td class="ps-2">${escapeHtml(dId)}</td>
        <td>${escapeHtml(bId)}</td>
        <td>${escapeHtml(row.SettlementGl || row.SettlementGL || "")}</td>
        <td>${escapeHtml(row.ReceivableGl || row.ReceivableGL || "")}</td>
        <td>${row.IsActive ? "Yes" : "No"}</td>
        <td>${escapeHtml(row.DeviceDescription || row.Description || "")}</td>
      `;

      tr.addEventListener("click", () => selectRow(idx));
      body.appendChild(tr);
    });
  }

  function selectRow(index) {
    state.selectedIndex = index;
    state.gridAction = null; // Reset grid action when selecting a row
    const row = state.rows[index];
    if (row) setFormData(row);
    renderGrid();
    setMode(state.mode);
    updateGridButtons();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getSearchBaseUrl() {
    const env = window.Environment || {};
    return (env.baseUrlSystemCodes || env.baseUrlCommon || "http://localhost:5059").replace(/\/+$/g, "");
  }

  async function postSearchOldApi(requestData) {
    if (!window.CoreApi) throw new Error("CoreApi missing");
    const envelope = window.CoreApi.makeRequestEnvelope("p_GetSearchResult", requestData);
    return window.CoreApi.post(`${getSearchBaseUrl()}/api/OldAPI`, envelope);
  }

  function formatLegacyRequestTime(d = new Date()) {
    const pad2 = (n) => String(n).padStart(2, "0");
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const yyyy = d.getFullYear();
    const hh = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());
    return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
  }

  async function postOldApiForm(formId, requestData) {
    if (!window.CoreApi) throw new Error("CoreApi missing");
    const envelope = window.CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");
    envelope.RequestID = formId;
    envelope.FormID = formId;
    envelope.FormId = formId;
    envelope.RequestTime = formatLegacyRequestTime();
    return window.CoreApi.post(`${getSearchBaseUrl()}/api/OldAPI`, envelope);
  }

  async function searchOldApi(requestData) {
    // Prefer SearchService because it sets the legacy RequestTime format and uses dbo.p_GetSearchResult.
    if (window.SearchService?.searchClients) {
      return window.SearchService.searchClients(requestData);
    }
    // Fallback for contexts where SearchService wasn't loaded.
    return postSearchOldApi(requestData);
  }

  // --- Branch Lookup ---

  function getBranchLookupLimits() {
    const env = window.Environment || {};
    const maxRecordsRaw = env.branchLookupMaxRecords ?? env.trxLookupMaxRecords ?? 500;
    const maxCallsRaw = env.branchLookupMaxCalls ?? env.trxLookupMaxCalls ?? 50;
    const maxRecords = Math.max(50, Number(maxRecordsRaw) || 500);
    const maxCalls = Math.max(5, Number(maxCallsRaw) || 50);
    return { maxRecords, maxCalls };
  }

  function normalizeBranchRow(r) {
    const id = r?.OurBranchID ?? r?.BranchID ?? r?.BranchId ?? r?.ID ?? "";
    const name = r?.BranchName ?? r?.Name ?? r?.OurBranchName ?? r?.Description ?? "";
    return { id: String(id ?? "").trim(), name: String(name ?? "").trim(), raw: r };
  }

  function extractOldApiRows(resp) {
    // OldAPI responses vary:
    // - resp.Details/resp.Details01 at top-level
    // - resp.data.Details/resp.data.Details01 inside data
    // Prefer Details01 (business rows), then Details.
    const candidates = [
      resp?.data?.Details01,
      resp?.Details01,
      resp?.data?.Details,
      resp?.Details,
      resp?.data?.SearchResults,
      resp?.SearchResults,
      resp?.data,
    ];

    const toRows = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value.filter((x) => x && typeof x === "object");
      if (typeof value === "object") return [value];
      return [];
    };

    // Prefer the first NON-EMPTY rowset.
    for (const c of candidates) {
      const rows = toRows(c);
      if (rows.length) return rows;
    }

    // If everything is empty, return empty array.
    return [];
  }

  function isBranchDisplayable(n) {
    return Boolean((n?.id && n.id !== "---") || (n?.name && n.name !== "---"));
  }

  function normalizeGlRow(r) {
    const id =
      r?.AccountID ??
      r?.GLAccountID ??
      r?.GLAccountId ??
      r?.GLID ??
      r?.GLId ??
      r?.GLCode ??
      r?.GeneralLedgerID ??
      r?.GeneralLedgerId ??
      r?.LedgerID ??
      r?.LedgerId ??
      r?.AccountNo ??
      r?.AccountNumber ??
      r?.RefID ??
      r?.SearchKey ??
      r?.CodeID ??
      r?.ID ??
      "";

    const name =
      r?.AccountName ??
      r?.GLAccountName ??
      r?.GLName ??
      r?.GeneralLedgerName ??
      r?.LedgerName ??
      r?.RefName ??
      r?.SearchValue ??
      r?.CodeDescription ??
      r?.Description ??
      r?.Name ??
      "";

    return { id: String(id ?? "").trim(), name: String(name ?? "").trim(), raw: r };
  }

  function isGlDisplayable(n) {
    // Avoid rendering OldAPI status/audit rows.
    const raw = n?.raw;
    if (raw && (raw.ResponseCode !== undefined || raw.ResponseMessage !== undefined)) return false;
    return Boolean((n?.id && n.id !== "---") || (n?.name && n.name !== "---"));
  }

  function looksLikeGeneralLedgerRows(rows) {
    const sample = (Array.isArray(rows) ? rows : []).slice(0, 25);
    if (!sample.length) return false;

    // Strong GL signals
    const glKeySignals = [
      "GLAccountID",
      "GLAccountId",
      "GLID",
      "GLId",
      "GLCode",
      "GeneralLedgerID",
      "GeneralLedgerId",
      "LedgerID",
      "LedgerId",
      "t_GeneralLedger"
    ];

    // Strong non-GL (customer account) signals
    const customerKeySignals = [
      "CustomerID",
      "CustomerId",
      "ClientID",
      "ClientId",
      "AccountNumber",
      "AccountNo",
      "AccountClass",
      "ProductID",
      "ProductId"
    ];

    let glSignals = 0;
    let customerSignals = 0;

    for (const r of sample) {
      if (!r || typeof r !== "object") continue;
      const keys = Object.keys(r);
      if (keys.some((k) => glKeySignals.includes(k))) glSignals++;
      if (keys.some((k) => customerKeySignals.includes(k))) customerSignals++;
    }

    // Prefer GL if any strong GL signal present.
    if (glSignals > 0) return true;
    // If it looks like customer accounts and not GL, reject.
    if (customerSignals > 0) return false;

    // Fallback: unknown shape, allow (prevents over-blocking).
    return true;
  }

  function filterGlBaseline(baselineRows, { idValue, nameValue, idMode, nameMode }) {
    const idNeedle = String(idValue || "").toLowerCase();
    const nameNeedle = String(nameValue || "").toLowerCase();
    return (Array.isArray(baselineRows) ? baselineRows : []).filter((r) => {
      const n = normalizeGlRow(r);
      if (!isGlDisplayable(n)) return false;

      const idHay = n.id.toLowerCase();
      const nameHay = n.name.toLowerCase();
      const matchId = !idNeedle || (idMode === "Exact" ? idHay === idNeedle : idHay.includes(idNeedle));
      const matchName = !nameNeedle || (nameMode === "Exact" ? nameHay === nameNeedle : nameHay.includes(nameNeedle));
      return matchId && matchName;
    });
  }

  function renderGlRows(rows, lookupType) {
    const results = qs("#branchSearchResults");
    const empty = qs("#branchSearchEmpty");
    const loading = qs("#branchSearchLoading");

    if (results) results.innerHTML = "";
    if (loading) loading.classList.add("d-none");

    const safeRows = (Array.isArray(rows) ? rows : []).filter((r) => isGlDisplayable(normalizeGlRow(r)));
    if (!safeRows.length) {
      if (empty) {
        empty.textContent = "No accounts found.";
        empty.style.display = "block";
      }
      return;
    }

    if (empty) empty.style.display = "none";
    if (!results) return;

    results.innerHTML = safeRows
      .map((r, idx) => {
        const n = normalizeGlRow(r);
        return `<tr>
            <td>${escapeHtml(n.id)}</td>
            <td>${escapeHtml(n.name)}</td>
            <td class="text-end">
              <button type="button" class="btn btn-sm btn-primary" data-gl-index="${idx}">Select</button>
            </td>
          </tr>`;
      })
      .join("");

    qsa("button[data-gl-index]", results).forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = safeRows[Number(btn.dataset.glIndex)];
        const n = normalizeGlRow(row);
        const isSettlement = lookupType === "settlementGl";

        if (isSettlement) {
          if (qs("#SettlementGl")) qs("#SettlementGl").value = n.id;
          if (qs("#SettlementGlName")) qs("#SettlementGlName").value = n.name;
        } else {
          if (qs("#ReceivableGl")) qs("#ReceivableGl").value = n.id;
          if (qs("#ReceivableGlName")) qs("#ReceivableGlName").value = n.name;
        }
        const modal = bootstrap.Modal.getOrCreateInstance(qs("#branchLookupModal"));
        modal?.hide();
      });
    });
  }

  function filterBranchBaseline(baselineRows, { idValue, nameValue, idMode, nameMode }) {
    const idNeedle = String(idValue || "").toLowerCase();
    const nameNeedle = String(nameValue || "").toLowerCase();
    return baselineRows.filter((r) => {
      const n = normalizeBranchRow(r);
      if (!isBranchDisplayable(n)) return false;

      const idHay = n.id.toLowerCase();
      const nameHay = n.name.toLowerCase();

      const matchId = !idNeedle || (idMode === "Exact" ? idHay === idNeedle : idHay.includes(idNeedle));
      const matchName = !nameNeedle || (nameMode === "Exact" ? nameHay === nameNeedle : nameHay.includes(nameNeedle));
      return matchId && matchName;
    });
  }

  function renderBranchRows(rows) {
    const results = qs("#branchSearchResults");
    const empty = qs("#branchSearchEmpty");
    const loading = qs("#branchSearchLoading");

    if (results) results.innerHTML = "";
    if (loading) loading.classList.add("d-none");

    const safeRows = (Array.isArray(rows) ? rows : []).filter((r) => isBranchDisplayable(normalizeBranchRow(r)));
    if (!safeRows.length) {
      if (empty) {
        empty.textContent = "No branches found.";
        empty.style.display = "block";
      }
      return;
    }

    if (empty) empty.style.display = "none";
    if (!results) return;

    results.innerHTML = safeRows
      .map((r, idx) => {
        const n = normalizeBranchRow(r);
        return `<tr>
              <td>${escapeHtml(n.id)}</td>
              <td>${escapeHtml(n.name)}</td>
              <td class="text-end">
                <button type="button" class="btn btn-sm btn-primary" data-branch-index="${idx}">Select</button>
              </td>
            </tr>`;
      })
      .join("");

    qsa("button[data-branch-index]", results).forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = safeRows[Number(btn.dataset.branchIndex)];
        handleBranchSelect(row);
      });
    });
  }

  async function ensureBranchBaselineLoaded({ force = false } = {}) {
    if (!force && Array.isArray(branchLookupState.baselineRows) && branchLookupState.baselineRows.length) {
      return branchLookupState.baselineRows;
    }
    if (branchLookupState.isLoadingBaseline) {
      return branchLookupState.baselineRows || [];
    }

    branchLookupState.isLoadingBaseline = true;
    branchLookupState.lastError = "";

    try {
      await ensureServicesLoaded();

      const { maxRecords, maxCalls } = getBranchLookupLimits();
      const env = window.Environment || {};
      const bankIdRaw = (env.defaultBankId || env.defaultBankID || qs("#BankId")?.value || "").toString().trim();
      const bankId = bankIdRaw || "00";
      const operatorId = getOperatorId();
      // For list-all, don't constrain to the session branch.
      const ourBranchId = "";

      const results = [];
      const seen = new Set();
      let cursor = "";

      // 1) Best option (used by working modules): dbo.pc_SearchSystemBranches (BankID-only).
      try {
        const sysResp = await postOldApiForm("dbo.pc_SearchSystemBranches", { BankID: bankId });
        if (sysResp?.success) {
          const sysRows = extractOldApiRows(sysResp);
          if (sysRows.length > 1) {
            branchLookupState.baselineRows = sysRows;
            branchLookupState.baselineLoadedAt = Date.now();
            return sysRows;
          }
        } else {
          branchLookupState.lastError = sysResp?.message || branchLookupState.lastError;
        }
      } catch (err) {
        branchLookupState.lastError = err?.message || branchLookupState.lastError;
      }

      if (window.BranchesService?.getBranches) {
        // Legacy modules use Direction: 0 to fetch all branches.
        // Try that first; if it returns a full list, we're done.
        try {
          const fullResp = await window.BranchesService.getBranches({
            OurBranchID: ourBranchId,
            BranchID: "",
            OperatorID: operatorId,
            Direction: 0,
            BankID: bankId
          });

          if (fullResp?.success) {
            const fullRows = extractOldApiRows(fullResp);
            if (fullRows.length > 1) {
              branchLookupState.baselineRows = fullRows;
              branchLookupState.baselineLoadedAt = Date.now();
              return fullRows;
            }
          } else {
            branchLookupState.lastError = fullResp?.message || branchLookupState.lastError;
          }
        } catch (err) {
          branchLookupState.lastError = err?.message || branchLookupState.lastError;
        }

        for (let callIndex = 0; callIndex < maxCalls && results.length < maxRecords; callIndex++) {
          const request = {
            OurBranchID: ourBranchId,
            OperatorID: operatorId,
            Direction: 1,
          };
          request.BankID = bankId;
          // NOTE: p_GetBranches requires @BranchID even for list-all.
          request.BranchID = cursor || "";

          const resp = await window.BranchesService.getBranches(request);
          if (!resp?.success) {
            branchLookupState.lastError = resp?.message || "Failed to load branches.";
            break;
          }

          const page = extractOldApiRows(resp);
          if (!page.length) break;

          let addedThisCall = 0;
          for (const r of page) {
            const n = normalizeBranchRow(r);
            if (!isBranchDisplayable(n)) continue;
            const key = `${n.id}::${n.name}`;
            if (seen.has(key)) continue;
            seen.add(key);
            results.push(r);
            addedThisCall++;
            if (results.length >= maxRecords) break;
          }

          if (!addedThisCall) break;

          const lastWithId = page
            .map(normalizeBranchRow)
            .filter((n) => n?.id)
            .at(-1);
          const nextCursor = lastWithId?.id || "";
          if (!nextCursor || nextCursor === cursor) break;
          cursor = nextCursor;
        }
      }

      branchLookupState.baselineRows = results;
      branchLookupState.baselineLoadedAt = Date.now();
      return results;
    } catch (err) {
      branchLookupState.lastError = err?.message || String(err || "Failed to load branches.");
      return [];
    } finally {
      branchLookupState.isLoadingBaseline = false;
    }
  }

  async function ensureGlBaselineLoaded({ force = false } = {}) {
    if (!force && Array.isArray(glLookupState.baselineRows) && glLookupState.baselineRows.length) {
      return glLookupState.baselineRows;
    }
    if (glLookupState.isLoadingBaseline) {
      return glLookupState.baselineRows || [];
    }

    glLookupState.isLoadingBaseline = true;
    glLookupState.lastError = "";
    glLookupState.lastTableId = "";

    try {
      await ensureServicesLoaded();

      const env = window.Environment || {};
      const currency = (env.defaultCurrencyID || env.defaultCurrencyId || env.currencyID || env.currencyId || "ETB").toString().trim() || "ETB";
      const ourBranchId = getBranchId();

      // Allow overriding the primary GL lookup config in case the backend differs per environment.
      // Example:
      //   Environment.glLookup = { tableId: 'GLBranchActiveID', moduleId: 8060, currencyId: 'ETB', glAccountTypes: ['A','L'] };
      const glCfg = env.glLookup && typeof env.glLookup === "object" ? env.glLookup : null;
      const glAccountTypes = Array.isArray(glCfg?.glAccountTypes) && glCfg.glAccountTypes.length ? glCfg.glAccountTypes : ["A", "L"];
      const glModuleIds = Array.isArray(glCfg?.moduleIds) && glCfg.moduleIds.length ? glCfg.moduleIds : [8060, 8100, 8056, 1000];

      const currencySafe = (glCfg?.currencyId || currency).toString().replace(/'/g, "''");
      const branchSafe = String(ourBranchId || "").replace(/'/g, "''");
      const glTypesSql = glAccountTypes.map(t => `'${String(t).replace(/'/g, "''")}'`).join(",");

      // IMPORTANT: If we don't have a branch in session/localStorage, do NOT constrain by OurBranchID.
      // This matches your expectation of listing from t_GeneralLedger (not customer accounts).
      const defaultAdvFilter = ourBranchId
        ? `CurrencyID = '${currencySafe}' AND OurBranchID ='${branchSafe}' AND GLAccountTypeID IN (${glTypesSql}) AND GLCategoryID<>'Main'`
        : `CurrencyID = '${currencySafe}' AND GLAccountTypeID IN (${glTypesSql}) AND GLCategoryID<>'Main'`;

      const baseAdvFilter = (glCfg?.advFilterString || defaultAdvFilter);

      // 1) Preferred: GeneralLedgerService.getSearchResult + GLBranchActiveID (used by gl-parameters & interbranch-gl-parameters).
      if (window.GeneralLedgerService?.getSearchResult) {
        for (const mid of glModuleIds) {
          try {
            const attempt = await window.GeneralLedgerService.getSearchResult({
              TableID: glCfg?.tableId || "GLBranchActiveID",
              AdvFilterString: baseAdvFilter,
              WhereStmt: "",
              PrevOrNext: 0,
              RefID: "",
              OperatorID: getOperatorId(),
              ModuleID: Number(mid) || 0,
              OurBranchID: ourBranchId,
              SearchKey: "",
              LanguageID: "en"
            });

            if (attempt?.success) {
              const rows = extractOldApiRows(attempt);
              const safe = rows.filter((r) => isGlDisplayable(normalizeGlRow(r)));
              if (safe.length && looksLikeGeneralLedgerRows(safe)) {
                glLookupState.baselineRows = safe;
                glLookupState.baselineLoadedAt = Date.now();
                glLookupState.lastTableId = `GLBranchActiveID@${mid}`;
                return safe;
              }

              if (safe.length && !looksLikeGeneralLedgerRows(safe)) {
                glLookupState.lastError = "Search returned customer accounts; trying other GL sources...";
              }
            } else {
              glLookupState.lastError = attempt?.message || glLookupState.lastError;
            }
          } catch (err) {
            glLookupState.lastError = err?.message || glLookupState.lastError;
          }
        }
      }

      const configured = env.glSearchTableIds || env.glLookupTableIds || null;
      const tableIds = Array.isArray(configured) && configured.length
        ? configured
        : ["GLCrTrxAllowID", "t_GeneralLedger", "GLMaster", "ChartOfAccounts", "GeneralLedger", "AccountID"];

      for (const tid of tableIds) {
        try {
          const attempt = await searchOldApi({
            TableID: tid,
            // Keep this broad; some backends ignore WhereStmt and rely on AdvFilterString.
            WhereStmt: "",
            AdvFilterString: tid === "GLCrTrxAllowID" ? baseAdvFilter : "",
            PrevOrNext: 0,
            RefID: "",
            OperatorID: getOperatorId(),
            ModuleID: 1000,
            OurBranchID: ourBranchId,
            SearchKey: "",
            LanguageID: "ENG"
          });

          if (attempt?.success) {
            const rows = extractOldApiRows(attempt);
            const safe = rows.filter((r) => isGlDisplayable(normalizeGlRow(r)));
            if (safe.length && looksLikeGeneralLedgerRows(safe)) {
              glLookupState.baselineRows = safe;
              glLookupState.baselineLoadedAt = Date.now();
              glLookupState.lastTableId = tid;
              return safe;
            }

            // If we got rows but they look like customer accounts, keep probing other TableIDs.
            if (safe.length && !looksLikeGeneralLedgerRows(safe)) {
              glLookupState.lastError = "Search returned customer accounts; trying other GL sources...";
              continue;
            }
          } else {
            glLookupState.lastError = attempt?.message || glLookupState.lastError;
          }
        } catch (err) {
          glLookupState.lastError = err?.message || glLookupState.lastError;
        }
      }

      glLookupState.baselineRows = [];
      glLookupState.baselineLoadedAt = Date.now();
      return [];
    } finally {
      glLookupState.isLoadingBaseline = false;
    }
  }

  function openBranchSearchPanel() {
    setLookupFieldLabels("Branch ID", "Branch Name");
    const modalElement = qs("#branchLookupModal");
    if (!modalElement) return;
    branchLookupModalInstance = branchLookupModalInstance || new bootstrap.Modal(modalElement);
    branchLookupModalInstance.show();

    qs("#branchLookupForm")?.reset();
    if (qs("#branchSearchResults")) qs("#branchSearchResults").innerHTML = "";
    if (qs("#branchSearchEmpty")) {
      qs("#branchSearchEmpty").textContent = "Loading branches...";
      qs("#branchSearchEmpty").style.display = "block";
    }

    setTimeout(() => {
      qs("#branchSearchId")?.focus();
      void performBranchSearch();
    }, 250);
  }

  async function performBranchSearch(e) {
    if (e) e.preventDefault();

    const idValue = qs("#branchSearchId")?.value?.trim() || "";
    const nameValue = qs("#branchSearchName")?.value?.trim() || "";
    const idMode = qs("#branchSearchModeId")?.value || "Like";
    const nameMode = qs("#branchSearchModeName")?.value || "Like";

    const results = qs("#branchSearchResults");
    const empty = qs("#branchSearchEmpty");
    const loading = qs("#branchSearchLoading");

    if (results) results.innerHTML = "";
    if (empty) empty.style.display = "none";
    if (loading) loading.classList.remove("d-none");

    // Preferred path: load baseline list once, then filter locally.
    try {
      const baseline = await ensureBranchBaselineLoaded();
      if (Array.isArray(baseline) && baseline.length) {
        const filtered = filterBranchBaseline(baseline, { idValue, nameValue, idMode, nameMode });
        renderBranchRows(filtered);
        return;
      }

      // If baseline couldn't load, surface a useful hint.
      if (empty && branchLookupState.lastError) {
        empty.textContent = branchLookupState.lastError;
        empty.style.display = "block";
      }
    } catch (err) {
      console.warn("[DM] Baseline branch load failed; falling back to remote search", err);
    }

    // Next best: direct lookup via dbo.p_GetBranches (this is the most reliable for BranchID).
    try {
      await ensureServicesLoaded();
      const env = window.Environment || {};
      const bankIdRaw = (env.defaultBankId || env.defaultBankID || qs("#BankId")?.value || "").toString().trim();
      const bankId = bankIdRaw || "00";

      if (window.BranchesService?.getBranches && idValue) {
        const direct = await window.BranchesService.getBranches({
          OurBranchID: idValue,
          BranchID: idValue,
          OperatorID: getOperatorId(),
          Direction: 1,
          BankID: bankId
        });

        if (direct?.success) {
          const rows = extractOldApiRows(direct);
          const filtered = nameValue
            ? filterBranchBaseline(rows, { idValue: "", nameValue, idMode, nameMode })
            : rows;
          renderBranchRows(filtered);
          return;
        }

        if (empty) {
          empty.textContent = direct?.message || "No branches matched the Branch ID.";
          empty.style.display = "block";
        }
      }
    } catch (err) {
      console.warn("[DM] Direct p_GetBranches lookup failed", err);
      if (empty) {
        empty.textContent = err?.message || "Branch lookup failed.";
        empty.style.display = "block";
      }
    }

    const clauses = [];
    const sqlSafe = (v) => String(v || "").replace(/'/g, "''");
    if (idValue) {
      const safe = sqlSafe(idValue);
      clauses.push(idMode === "Exact" ? `OurBranchID = '${safe}'` : `OurBranchID like '%${safe}%'`);
    }
    if (nameValue) {
      const safe = sqlSafe(nameValue);
      clauses.push(nameMode === "Exact" ? `BranchName = '${safe}'` : `BranchName like '%${safe}%'`);
    }

    const whereStmt = clauses.length ? clauses.join(" AND ") : "1=1";

    try {
      await ensureServicesLoaded();
      let response = null;
      let usedTableId = "";

      // Layer 1: Probe ModuleIDs and TableIDs
      const configs = [
        { mid: 1000, tid: "BranchID" },
        { mid: 4300, tid: "BranchID" }, // Proven for BranchID in Loan module
        { mid: 1000, tid: "Branches" },
        { mid: 1000, tid: "Branch" }
      ];

      for (const cfg of configs) {
        try {
          const attempt = await searchOldApi({
            WhereStmt: whereStmt,
            TableID: cfg.tid,
            AdvFilterString: "",
            PrevOrNext: "1",
            RefID: "",
            OperatorID: getOperatorId(),
            ModuleID: cfg.mid,
            OurBranchID: getBranchId(),
            SearchKey: idValue || nameValue || "",
            LanguageID: "ENG"
          });

          if (attempt?.success) {
            const potential = attempt.data || (attempt.Details && !Array.isArray(attempt.Details) ? attempt.Details.SearchResults || attempt.Details : attempt.Details);
            if (potential && (Array.isArray(potential) ? potential.length > 0 : (typeof potential === 'object' && Object.keys(potential).length > 0))) {
              response = attempt;
              usedTableId = cfg.tid;
              break;
            }
          }
        } catch { continue; }
      }

      // Layer 2: Final Fallback to p_GetBranches
      if (!response && window.BranchesService?.getBranches) {
        console.log("[DM] Search returned nothing, falling back to p_GetBranches...");
        const env = window.Environment || {};
        const bankIdRaw = (env.defaultBankId || env.defaultBankID || qs("#BankId")?.value || "").toString().trim();
        const bankId = bankIdRaw || "00";

        const fallback = await window.BranchesService.getBranches({
          OurBranchID: idValue || "",
          ...(idValue ? { BranchID: idValue } : {}),
          OperatorID: getOperatorId(),
          Direction: 1,
          BankID: bankId
        });
        if (fallback?.success) {
          response = fallback;
          usedTableId = "p_GetBranches";
        }
      }

      let rows = extractOldApiRows(response);

      // Local filter if using fallback (p_GetBranches usually returns all)
      if (usedTableId === "p_GetBranches" && (idValue || nameValue)) {
        rows = rows.filter(r => {
          const bId = String(r.OurBranchID || r.BranchID || "").toLowerCase();
          const bName = String(r.BranchName || r.Name || "").toLowerCase();
          const matchId = !idValue || (idMode === "Exact" ? bId === idValue.toLowerCase() : bId.includes(idValue.toLowerCase()));
          const matchName = !nameValue || (nameMode === "Exact" ? bName === nameValue.toLowerCase() : bName.includes(nameValue.toLowerCase()));
          return matchId && matchName;
        });
      }

      renderBranchRows(rows);
    } catch (err) {
      console.error(err);
      if (empty) empty.style.display = "block";
    } finally {
      if (loading) loading.classList.add("d-none");
    }
  }

  async function performGlSearch(lookupType) {
    setLookupFieldLabels("Account ID", "Account Name");
    const isSettlement = lookupType === "settlementGl";
    const modalTitle = isSettlement ? "Find Settlement GL" : "Find Receivable GL";
    const results = qs("#branchSearchResults");
    const loading = qs("#branchSearchLoading");
    const empty = qs("#branchSearchEmpty");
    const modal = bootstrap.Modal.getOrCreateInstance(qs("#branchLookupModal"));

    qs("#branchLookupModalLabel").textContent = modalTitle;
    // Ensure table header matches GL context (needed for Refresh -> GL)
    const theadTr = qs("thead tr", qs("#branchLookupModal"));
    if (theadTr) {
      theadTr.innerHTML = `
          <th scope="col">AccountID</th>
          <th scope="col">AccountName</th>
          <th scope="col" class="text-end">Action</th>
       `;
    }
    if (results) results.innerHTML = "";
    if (empty) empty.style.display = "none";
    if (loading) loading.classList.remove("d-none");

    modal.show();

    try {
      const idValue = qs("#branchSearchId")?.value?.trim() || "";
      const nameValue = qs("#branchSearchName")?.value?.trim() || "";
      const idMode = qs("#branchSearchModeId")?.value || "Like";
      const nameMode = qs("#branchSearchModeName")?.value || "Like";

      // Load baseline list once (SearchService preferred), then filter locally like Branch lookup.
      const baseline = await ensureGlBaselineLoaded();
      if (Array.isArray(baseline) && baseline.length) {
        const filtered = filterGlBaseline(baseline, { idValue, nameValue, idMode, nameMode });
        renderGlRows(filtered, lookupType);
        return;
      }

      if (empty && glLookupState.lastError) {
        empty.textContent = glLookupState.lastError;
        empty.style.display = "block";
      } else if (empty) {
        empty.textContent = "No accounts found.";
        empty.style.display = "block";
      }
    } catch (err) {
      console.error(err);
      if (empty) {
        empty.textContent = err?.message || "Failed to load accounts.";
        empty.style.display = "block";
      }
    } finally {
      if (loading) loading.classList.add("d-none");
    }
  }

  function handleBranchSelect(row) {
    const bId = row.OurBranchID || row.BranchID || row.BranchId || row.ID || "";
    const bName = row.BranchName || row.Name || row.OurBranchName || row.Description || "";

    if (qs("#BranchId")) qs("#BranchId").value = bId;
    if (qs("#BranchName")) qs("#BranchName").value = bName;

    branchLookupModalInstance?.hide();
    setToast(`Selected branch: ${bName}`, "success");

    void handleViewOrSearch();
  }

  async function handleViewOrSearch() {
    const branchId = qs("#BranchId")?.value?.trim() || "";
    if (!branchId) {
      setToast("Please select/enter a Branch ID first.", "warning");
      return;
    }

    // Remember current selection to restore after reload
    const previousDeviceId = state.selectedIndex >= 0 ? state.rows[state.selectedIndex]?.DeviceId : null;
    console.log("[DeviceMaintenance] Reloading data, previous selection:", previousDeviceId);

    setToast("Loading devices...", "info");
    try {
      await ensureServicesLoaded();
      // p_GetDevice requires DeviceID, but often passing just BranchID works for lists
      const result = await window.StaticDataService.getDevice({
        BranchID: branchId,
        DeviceID: "",
        GLAccountID: ""
      });

      console.log("[DeviceMaintenance] API response:", result);

      if (!result?.success) {
        setToast(result?.message || "Record doesn't exist.", "warning");
        state.rows = [];
        state.selectedIndex = -1;
        renderGrid();
        return;
      }

      const rows = extractOldApiRows(result);
      console.log("[DeviceMaintenance] Extracted rows:", rows);
      console.log("[DeviceMaintenance] Raw first row:", JSON.stringify(rows[0]));

      state.rows = rows.map(r => ({
        DeviceId: r.DeviceID || r.DeviceId || "",
        BranchId: r.OurBranchID || r.BranchID || branchId,
        SettlementGl: r.SettlementGL || r.SettlementGl || "",
        ReceivableGl: r.ReceivableGL || r.ReceivableGl || "",
        IsActive: r.IsActive === 1 || r.IsActive === true,
        DeviceDescription: r.Description || r.DeviceDescription || "",
        BranchName: qs("#BranchName")?.value || "",
        CreatedBy: r.CreatedBy || "",
        CreatedOn: r.CreatedOn || "",
        ModifiedBy: r.ModifiedBy || "",
        ModifiedOn: r.ModifiedOn || "",
        SupervisedBy: r.SupervisedBy || "",
        SupervisedOn: r.SupervisedOn || "",
        UpdateCount: r.UpdateCount || 0
      }));

      console.log("[DeviceMaintenance] Mapped state.rows:", state.rows);

      // Try to restore previous selection, or default to first row
      if (previousDeviceId) {
        state.selectedIndex = state.rows.findIndex(r => r.DeviceId === previousDeviceId);
        if (state.selectedIndex < 0) state.selectedIndex = state.rows.length ? 0 : -1;
      } else {
        state.selectedIndex = state.rows.length ? 0 : -1;
      }
      
      console.log("[DeviceMaintenance] Selected index:", state.selectedIndex);
      
      clearFormAll();
      renderGrid();
      if (state.selectedIndex >= 0) {
        const rowData = state.rows[state.selectedIndex];
        console.log("[DeviceMaintenance] Setting form data to:", rowData);
        console.log("[DeviceMaintenance] DeviceId:", rowData.DeviceId, "Description:", rowData.DeviceDescription);
        setFormData(rowData);
        renderGrid();
      }
      setToast(`Loaded ${state.rows.length} devices.`, "success");
      setMode(MODES.VIEW);

    } catch (e) {
      console.error(e);
      setToast("Failed to load records.", "danger");
    }
  }

  function buildGridXml() {
    let xml = "<DetailRecords>";
    state.rows.forEach(r => {
      xml += `<Device DeviceID="${escapeHtml(r.DeviceId)}" SettlementGL="${escapeHtml(r.SettlementGl)}" ReceivableGL="${escapeHtml(r.ReceivableGl)}" Description="${escapeHtml(r.DeviceDescription)}" IsActive="${r.IsActive ? 1 : 0}" />`;
    });
    xml += "</DetailRecords>";
    return xml;
  }

  async function handleSave() {
    console.log("[DeviceMaintenance] handleSave called, mode:", state.mode);
    if (state.mode === MODES.VIEW) {
      console.log("[DeviceMaintenance] Save aborted - in VIEW mode");
      return;
    }

    const branchId = qs("#BranchId")?.value?.trim() || "";
    if (!branchId) {
      setToast("Branch ID is required.", "warning");
      return;
    }

    const currentForm = getFormData();
    console.log("[DeviceMaintenance] Form data:", currentForm);
    if (!currentForm.DeviceId) {
      setToast("Device ID is required.", "warning");
      return;
    }

    const now = new Date();
    const operatorId = getOperatorId();

    const requestData = {
      DeviceID: currentForm.DeviceId,
      BranchID: branchId,
      GLAccountID: currentForm.SettlementGl, // Map GL to GLAccountID as per payload
      Description: currentForm.DeviceDescription,
      IsActive: currentForm.IsActive ? 1 : 0,
      CreatedBy: operatorId,
      CreatedOn: formatMDYHMS(now),
      ModifiedBy: operatorId,
      ModifiedOn: formatMDYHMS(now),
      SupervisedBy: "",
      SupervisedOn: formatMDYHMS(now),
      UpdateCount: state.updateCount || 0,
      DetailRecords: buildGridXml()
    };

    console.log("[DeviceMaintenance] Request payload:", requestData);

    try {
      setToast("Saving...", "info");
      await ensureServicesLoaded();
      const result = await window.StaticDataService.addEditDevice(requestData);
      console.log("[DeviceMaintenance] Save result:", result);

      if (!result?.success) {
        setToast(result?.message || "Save failed.", "danger");
        return;
      }

      setToast("Save successful.", "success");
      // Small delay to allow database to commit before reload
      await new Promise(resolve => setTimeout(resolve, 300));
      await handleViewOrSearch();
    } catch (err) {
      console.error(err);
      setToast("Save failed.", "danger");
    }
  }

  async function handleDelete() {
    const branchId = qs("#BranchId")?.value?.trim() || "";
    const deviceId = qs("#DeviceId")?.value?.trim() || "";
    if (!branchId || !deviceId) {
      setToast("Select a device to delete.", "warning");
      return;
    }

    const confirmed = await window.Swal.fire({
      title: "Are you sure?",
      text: `Delete Device '${deviceId}' from branch '${branchId}'?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!"
    }).then(r => r.isConfirmed);

    if (!confirmed) return;

    try {
      setToast("Deleting...", "info");
      await ensureServicesLoaded();
      const result = await window.StaticDataService.deleteDevice({
        BranchID: branchId,
        DeviceID: deviceId
      });

      if (!result?.success) {
        setToast(result?.message || "Delete failed.", "danger");
        return;
      }

      setToast("Deleted.", "success");
      await handleViewOrSearch();
    } catch (e) {
      console.error(e);
      setToast("Delete failed.", "danger");
    }
  }

  function bindActions() {
    const buttons = getActionButtons();

    buttons.edit?.addEventListener("click", () => {
      if (state.selectedIndex < 0) {
        setToast("Please select a device from the list first.", "warning");
        return;
      }
      setMode(MODES.UPDATE);
      setToast("Edit mode.", "info");
    });

    buttons.save?.addEventListener("click", () => void handleSave());

    buttons.cancel?.addEventListener("click", () => {
      state.gridAction = null; // Reset grid action on cancel
      if (state.mode !== MODES.VIEW) {
        if (state.selectedIndex >= 0) setFormData(state.rows[state.selectedIndex]);
        else clearFormAll();
        setMode(MODES.VIEW);
        setToast("Cancelled.", "info");
      } else {
        clearFormAll();
        state.rows = [];
        state.selectedIndex = -1;
        renderGrid();
        setToast("Cleared.", "info");
      }
      updateGridButtons();
    });

    buttons.back?.addEventListener("click", () => {
      if (tryCloseHostModal()) return;
      window.history.back();
    });

    // Grid Toolbar
    qsa("[data-dm-grid-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.dmGridAction;
        const currentData = getFormData();

        if (action === "new") {
          // Set grid action to 'new' and prepare for new entry
          state.gridAction = 'new';
          // Clear form fields for new entry (keep branch info)
          const branchId = qs("#BranchId")?.value || "";
          const branchName = qs("#BranchName")?.value || "";
          clearFormAll();
          if (qs("#BranchId")) qs("#BranchId").value = branchId;
          if (qs("#BranchName")) qs("#BranchName").value = branchName;
          updateGridButtons();
          setToast("Enter new device details, then click Update.", "info");
        } else if (action === "alter") {
          if (state.selectedIndex < 0) return setToast("Select item to alter.", "warning");
          // Set grid action to 'alter', form already populated from row click
          state.gridAction = 'alter';
          updateGridButtons();
          setToast("Modify device details, then click Update.", "info");
        } else if (action === "remove") {
          if (state.selectedIndex < 0) return setToast("Select item to remove.", "warning");
          state.rows.splice(state.selectedIndex, 1);
          state.selectedIndex = state.rows.length > 0 ? 0 : -1;
          renderGrid();
          if (state.selectedIndex >= 0) setFormData(state.rows[state.selectedIndex]);
          updateGridButtons();
          setToast("Removed from local list.", "info");
        } else if (action === "clear") {
          // Clear grid action and reset form fields
          state.gridAction = null;
          const branchId = qs("#BranchId")?.value || "";
          const branchName = qs("#BranchName")?.value || "";
          clearFormAll();
          if (qs("#BranchId")) qs("#BranchId").value = branchId;
          if (qs("#BranchName")) qs("#BranchName").value = branchName;
          if (state.selectedIndex >= 0) setFormData(state.rows[state.selectedIndex]);
          updateGridButtons();
          setToast("Cleared entry fields.", "info");
        } else if (action === "update") {
          // Commit the new/altered device to the grid
          if (!currentData.DeviceId) return setToast("Device Id is required.", "warning");
          
          if (state.gridAction === 'new') {
            state.rows.unshift(currentData);
            state.selectedIndex = 0;
            setToast("Added to local list.", "success");
          } else if (state.gridAction === 'alter') {
            state.rows[state.selectedIndex] = currentData;
            setToast("Updated in local list.", "success");
          }
          
          state.gridAction = null;
          renderGrid();
          updateGridButtons();
        }
      });
    });

    // Lookup
    qsa("[data-dm-lookup]").forEach(btn => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.dmLookup;
        const modalEl = qs("#branchLookupModal");
        if (type === "branch") {
          if (modalEl) {
            modalEl.dataset.lookupMode = "branch";
            delete modalEl.dataset.lookupType;
          }
          setLookupFieldLabels("Branch ID", "Branch Name");
          // Reset header for branch
          qs("#branchLookupModalLabel").textContent = "Find a Branch";
          qs("thead tr", qs("#branchLookupModal")).innerHTML = `
              <th scope="col">OurBranchID</th>
              <th scope="col">BranchName</th>
              <th scope="col" class="text-end">Action</th>
           `;
          openBranchSearchPanel();
        } else if (type === "settlementGl" || type === "receivableGl") {
          if (modalEl) {
            modalEl.dataset.lookupMode = "gl";
            modalEl.dataset.lookupType = type;
          }
          setLookupFieldLabels("Account ID", "Account Name");
          // Reset header for GL
          qs("thead tr", qs("#branchLookupModal")).innerHTML = `
              <th scope="col">AccountID</th>
              <th scope="col">AccountName</th>
              <th scope="col" class="text-end">Action</th>
           `;
          performGlSearch(type);
        }
      });
    });

    qs("#branchSearchRefresh")?.addEventListener("click", async () => {
      const modalEl = qs("#branchLookupModal");
      const mode = modalEl?.dataset?.lookupMode || "branch";
      const lookupType = modalEl?.dataset?.lookupType || "settlementGl";

      const results = qs("#branchSearchResults");
      const empty = qs("#branchSearchEmpty");
      const loading = qs("#branchSearchLoading");
      if (results) results.innerHTML = "";
      if (empty) {
        empty.textContent = mode === "gl" ? "Refreshing accounts..." : "Refreshing branches...";
        empty.style.display = "block";
      }
      if (loading) loading.classList.remove("d-none");

      if (mode !== "gl") {
        // Clear cached baseline and reload from API, then apply current filters.
        branchLookupState.baselineRows = null;
        branchLookupState.baselineLoadedAt = 0;
        branchLookupState.lastError = "";
        try { await ensureBranchBaselineLoaded({ force: true }); } catch {}
        void performBranchSearch();
      } else {
        // For GL mode, clear cached baseline and reload via SearchService.
        glLookupState.baselineRows = null;
        glLookupState.baselineLoadedAt = 0;
        glLookupState.lastError = "";
        try { await ensureGlBaselineLoaded({ force: true }); } catch {}
        void performGlSearch(lookupType);
      }
    });

    qs("#branchLookupForm")?.addEventListener("submit", (e) => {
      if (e) e.preventDefault();
      const modalEl = qs("#branchLookupModal");
      const mode = modalEl?.dataset?.lookupMode || "branch";
      if (mode === "gl") {
        const lookupType = modalEl?.dataset?.lookupType || "settlementGl";
        return void performGlSearch(lookupType);
      }
      return void performBranchSearch();
    });

    // Quick search on enter
    qs("#BranchId")?.addEventListener("keypress", e => {
      if (e.key === "Enter") { e.preventDefault(); handleViewOrSearch(); }
    });
  }

  function clearFormAll() {
    const form = qs("#device-maintenance-form");
    if (!form) return;
    qsa("input:not([data-always-enabled]), select, textarea", form).forEach((el) => {
      if (el.id === "BranchName") return;
      if (el.type === "checkbox") el.checked = false;
      else el.value = "";
    });
    // Clear Behind the scene
    qsa(".audit-input").forEach(i => i.value = "");
  }

  function tryCloseHostModal() {
    try {
      const frame = window.frameElement;
      const hostDoc = window.parent?.document;
      const hostBootstrap = window.parent?.bootstrap;
      if (!frame || !hostDoc || !hostBootstrap?.Modal) return false;
      const modalEl = frame.closest?.(".modal") || hostDoc.querySelector(".modal.show");
      if (!modalEl) return false;
      const instance = hostBootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: false, focus: false });
      instance.hide();
      return true;
    } catch { return false; }
  }

  window.addEventListener("load", async () => {
    initSectionToggles();
    bindActions();
    renderGrid();
    setMode(MODES.VIEW);
    try { await ensureServicesLoaded(); } catch (e) { console.warn(e); }
    
    // Auto-load data on startup using current branch
    const branchId = getBranchId();
    if (branchId) {
      const branchField = qs("#BranchId");
      if (branchField) branchField.value = branchId;
      // Trigger auto-load
      await handleViewOrSearch();
    }
  });
})();
