(() => {
  if (window.__kairoTransactionDescriptionPageLoaded) return;
  window.__kairoTransactionDescriptionPageLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  const state = {
    mode: MODES.VIEW,
    isBusy: false,
    hasLoaded: false,
    canAddFromId: false,
    lastLoadedRow: null,
    lookupModal: null,
    lookupFirstRefId: "",
    lookupLastRefId: "",
    lookupCacheRows: null,
    lookupCacheFirstRefId: "",
    lookupCacheLastRefId: "",
  };

  const TRX_ID_KEYS = ["TrxDescriptionID", "ID", "code", "TrxID", "TransactionID", "IdentificationTypeCode", "TrxDescriptionCode", "TrxCode"];
  const TRX_DESC_KEYS = ["Description", "TrxDescription", "name", "IdDescription", "Id_Description", "TrxName", "TransactionName"];

  let updatecount;

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function getSearchBaseUrl() {
    const env = window.Environment || {};
    return (env.baseUrlSystemCodes || env.baseUrlCommon || "http://localhost:5059").replace(/\/+$/g, "");
  }

  async function postSearchOldApi(requestData) {
    await ensureServicesLoaded();
    if (!window.CoreApi) throw new Error("CoreApi missing");
    const envelope = window.CoreApi.makeRequestEnvelope("p_GetSearchResult", requestData);
    return window.CoreApi.post(`${getSearchBaseUrl()}/api/OldAPI`, envelope);
  }

  function pickCellValue(obj, preferredKeys = []) {
    if (!obj) return "";
    for (const k of preferredKeys) {
      if (obj[k] !== undefined && obj[k] !== null) return String(obj[k]).trim();
    }
    // Deep search (case-insensitive)
    const rowKeys = Object.keys(obj);
    for (const target of preferredKeys) {
      const match = rowKeys.find(rk => rk.toLowerCase() === target.toLowerCase());
      if (match && obj[match] !== undefined && obj[match] !== null) {
        return String(obj[match]).trim();
      }
    }

    // Final fallback: if we have business keys but none matched, just grab the first non-numeric value as desc and first numeric as ID?
    // Too risky. Just return empty and let the fallback in UI handle it.
    return "";
  }

  function extractRowsRobust(resp) {
    if (!resp) return [];

    // Log the response structure for troubleshooting if needed
    console.debug('[TD Lookup] Response structure:', resp);

    const r = resp.data || resp;
    let rows = [];

    if (Array.isArray(r)) {
      rows = r;
    } else if (r.Details01 && Array.isArray(r.Details01)) {
      rows = r.Details01;
    } else if (r.Details && Array.isArray(r.Details)) {
      rows = r.Details;
    } else if (r.SearchResults && Array.isArray(r.SearchResults)) {
      rows = r.SearchResults;
    } else if (r.Details?.SearchResults && Array.isArray(r.Details.SearchResults)) {
      rows = r.Details.SearchResults;
    } else if (typeof r === 'object') {
      // Try to find any array property
      for (const key in r) {
        if (Array.isArray(r[key]) && r[key].length > 0) {
          // If it looks like a list of objects, use it
          if (typeof r[key][0] === 'object') {
            rows = r[key];
            break;
          }
        }
      }
    }

    // Single item fallback
    if (rows.length === 0 && r && typeof r === 'object' && !Array.isArray(r)) {
      // Don't include the response object itself if it just has success/message
      if (Object.keys(r).some(k => !['success', 'message', 'code', 'data'].includes(k.toLowerCase()))) {
        rows = [r];
      }
    }

    // Filter out audit-only meta rows or rows containing database error strings
    return rows.filter(row => {
      if (!row || typeof row !== 'object') return false;

      // Skip rows that are clearly SQL error messages
      const values = Object.values(row).map(v => String(v).toLowerCase());
      const hasSqlError = values.some(v =>
        (v.includes("too many arguments") || v.includes("procedure or function")) &&
        v.includes("specified")
      );
      if (hasSqlError) return false;

      const keys = Object.keys(row).map(k => k.toLowerCase());
      // A business row should have more than just these audit keys
      const businessKeys = keys.filter(k => !['operatorid', 'eventid', 'newdata', 'createdon', 'updatecount', 'bankid', 'ourbranchid'].includes(k));
      return businessKeys.length > 0;
    });
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

  function getActionButtons() {
    return {
      view: qs('[data-shell-mode="View"]'),
      add: qs('[data-shell-mode="Add"]'),
      edit: qs('[data-shell-mode="Update"]'),
      delete: qs('[data-trx-action="delete"]'),
      save: qs('[data-trx-action="save"]'),
      cancel: qs('[data-trx-action="cancel"]'),
      prev: qs('[data-trx-nav="prev"]'),
      next: qs('[data-trx-nav="next"]'),
    };
  }

  function updateActionButtons() {
    const { view, add, edit, delete: delBtn, save, cancel } = getActionButtons();

    setButtonDisabled(view, false);
    const isEditable = state.mode === MODES.ADD || state.mode === MODES.UPDATE;
    const canCancelInView = state.hasLoaded || state.canAddFromId;

    setButtonDisabled(add, !(state.mode === MODES.VIEW && state.canAddFromId));
    setButtonDisabled(edit, !(state.mode === MODES.VIEW && state.hasLoaded));
    setButtonDisabled(delBtn, !(state.mode === MODES.VIEW && state.hasLoaded));
    setButtonDisabled(save, !isEditable);
    setButtonDisabled(cancel, !(isEditable || (state.mode === MODES.VIEW && canCancelInView)));

    // Vertical Navigation
    const { prev, next } = getActionButtons();
    const canNavigate = state.mode === MODES.VIEW && state.hasLoaded;
    setButtonDisabled(prev, !canNavigate);
    setButtonDisabled(next, !canNavigate);
  }

  async function ensureServicesLoaded() {
    if (!window.ServiceLoader) return;
    await window.ServiceLoader.loadStaticDataService();
    await window.ServiceLoader.loadLookupService();
  }

  function pickRefId(row) {
    if (!row || typeof row !== "object") return "";
    const direct = row.RefID ?? row.RefId ?? row.refId ?? row.refID;
    if (direct != null && String(direct).trim()) return String(direct).trim();
    const keys = Object.keys(row);
    const match = keys.find((k) => k.toLowerCase() === "refid" || k.toLowerCase() === "ref_id");
    if (match && row[match] != null && String(row[match]).trim()) return String(row[match]).trim();
    return "";
  }

  function updateLookupPagerButtons() {
    const prev = qs("#trxSearchPrev");
    const next = qs("#trxSearchNext");
    const info = qs("#trxSearchPageInfo");
    if (prev) prev.disabled = !state.lookupFirstRefId;
    if (next) next.disabled = !state.lookupLastRefId;
    if (info) {
      if (state.lookupFirstRefId || state.lookupLastRefId) {
        info.textContent = `Scroll for more`;
      } else {
        info.textContent = "";
      }
    }
  }

  function getOperatorId() {
    try {
      const session = window.AuthService?.getSession?.() || {};
      return session?.operatorID || session?.operatorId || "JOY_WANJA";
    } catch {
      return "JOY_WANJA";
    }
  }

  function getBranchId() {
    try {
      const session = window.AuthService?.getSession?.() || {};
      return session?.ourBranchID || session?.OurBranchID || "0101";
    } catch {
      return "0101";
    }
  }

  function getBankId() {
    if (window.Environment) {
      return window.Environment.defaultBankId || window.Environment.BankID || "00";
    }
    return "00";
  }

  async function populateTransactionTypeDropdown() {
    const select = qs("#TransactionTypeID");
    if (!select) return;
    const fallbackTypes = [
      { value: "0", label: "BO - Both" },
      { value: "1", label: "CR - Credit" },
      { value: "2", label: "DR - Debit" }
    ];
    try {
      await ensureServicesLoaded();
      const resp = await window.StaticDataService.getTransactionTypes();
      const types = resp?.Details || resp?.data || [];
      if (Array.isArray(types) && types.length > 0) {
        select.innerHTML = "";
        types.forEach(type => {
          const val = type.SubCodeID ?? type.TransactionTypeID ?? type.value ?? type.ID;
          const label = type.CodeDescription ?? type.TransactionTypeName ?? type.label ?? type.Name;
          const code = type.TransactionTypeCode ?? type.Code ?? "";
          if (val !== undefined && label) {
            const opt = document.createElement("option");
            opt.value = val;
            opt.textContent = code && !label.includes(code) ? `${code} - ${label}` : label;
            select.appendChild(opt);
          }
        });
      } else {
        select.innerHTML = fallbackTypes.map(t => `<option value="${t.value}">${t.label}</option>`).join("");
      }
    } catch (e) {
      select.innerHTML = fallbackTypes.map(t => `<option value="${t.value}">${t.label}</option>`).join("");
    }
  }

  async function populateCategoryDropdown() {
    const select = qs("#TrxCategoryID");
    if (!select) return;
    const fallbackCategories = [
      { value: "CHR", label: "CHR - Charge" },
      { value: "COM", label: "COM - Commission" },
      { value: "INC", label: "INC - Income" },
      { value: "SER", label: "SER - Service" }
    ];
    try {
      await ensureServicesLoaded();
      const resp = await window.StaticDataService.getTransactionCategories();
      const cats = resp?.Details || resp?.data || [];
      if (Array.isArray(cats) && cats.length > 0) {
        select.innerHTML = '<option value="">--Select--</option>';
        cats.forEach(cat => {
          const val = cat.SubCodeID ?? cat.TrxCategoryID ?? cat.value ?? cat.ID;
          const label = cat.CodeDescription ?? cat.TrxCategoryName ?? cat.label ?? cat.Name;
          const code = cat.TrxCategoryCode ?? cat.Code ?? "";
          if (val !== undefined && label) {
            const opt = document.createElement("option");
            opt.value = val;
            opt.textContent = code && !label.includes(code) ? `${code} - ${label}` : label;
            select.appendChild(opt);
          }
        });
      } else {
        select.innerHTML = '<option value="">--Select--</option>' + fallbackCategories.map(c => `<option value="${c.value}">${c.label}</option>`).join("");
      }
    } catch (e) {
      select.innerHTML = '<option value="">--Select--</option>' + fallbackCategories.map(c => `<option value="${c.value}">${c.label}</option>`).join("");
    }
  }

  function setMode(nextMode) {
    state.mode = nextMode;
    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#transaction-description-form");
    if (!form) return;

    const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;
    qsa("input, select, textarea", form).forEach(el => {
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        return;
      }
      if (el.hasAttribute("data-never-editable")) {
        el.disabled = true;
        return;
      }
      el.disabled = !isEditable;
    });

    updateActionButtons();
  }

  function clearFormData(options = { keepId: true }) {
    const form = qs("#transaction-description-form");
    if (!form) return;
    const keepVal = options.keepId ? qs("#TrxDescriptionID")?.value : "";
    form.reset();
    if (options.keepId && qs("#TrxDescriptionID")) qs("#TrxDescriptionID").value = keepVal;
    qsa(".audit-input, .audit-val-modern").forEach(i => i.value = "");
  }

  function setFormData(row) {
    if (!row) return;
    const form = qs("#transaction-description-form");
    if (!form) return;

    const mapping = {
      TrxDescriptionID: ["TrxDescriptionID", "ID", "code", "TrxID", "TransactionID", "IdentificationTypeCode", "TrxDescriptionCode", "TrxCode"],
      Description: ["Description", "TrxDescription", "name", "IdDescription", "Id_Description", "TrxName", "TransactionName"],
      TransactionTypeID: ["TransactionTypeID", "typeId", "TrxType", "TypeID", "TypeCode", "IdentificationType", "TransactionType", "Type"],
      TrxCategoryID: ["TrxCategoryID", "categoryId", "UserSubID", "Category", "CategoryID", "TrxCategory"],
      TrxCost: ["TrxCost", "cost", "amount", "TrxAmount", "Amount"],
      IsChargeable: ["IsChargeable", "chargeable", "Chargeable"],
      IsSystemTrx: ["IsSystemTrx", "systemTrx", "IsSystem", "SystemTrx"],
      IsBlocked: ["IsBlocked", "blocked", "Blocked", "IsActive"],
      CreatedBy: ["CreatedBy", "MakerID", "Created_By"],
      ModifiedBy: ["ModifiedBy", "ModifierID", "Modified_By"],
      SupervisedBy: ["SupervisedBy", "CheckerID", "Supervised_By"],
      CreatedOn: ["CreatedOn", "CreatedDate", "MakerTime"],
      ModifiedOn: ["ModifiedOn", "ModifiedDate", "ModifierTime"],
      SupervisedOn: ["SupervisedOn", "SupervisedDate", "CheckerTime"]
    };

    console.group('[TD] Data Binding');
    Object.entries(mapping).forEach(([fieldId, possibleKeys]) => {
      const el = qs(`#${fieldId}`, form);
      if (!el) return;

      let value = undefined;
      for (const k of possibleKeys) {
        if (row[k] !== undefined && row[k] !== null) { value = row[k]; break; }
      }

      if (value === undefined) {
        const rowKeys = Object.keys(row);
        for (const pk of possibleKeys) {
          const match = rowKeys.find(rk => rk.toLowerCase() === pk.toLowerCase());
          if (match && row[match] !== undefined && row[match] !== null) {
            value = row[match];
            break;
          }
        }
      }

      console.log(`${fieldId}:`, value === undefined ? 'MISSING' : value);
      if (value === undefined) return;

      // Check if element is a span (audit fields) or input/checkbox
      if (el.tagName === 'SPAN') {
        el.textContent = (value ?? "").toString().trim();
      } else if (el.type === "checkbox") {
        const s = String(value).toLowerCase();
        el.checked = value === 1 || value === true || s === "y" || s === "true" || s === "1" || s === "yes";
      } else {
        el.value = (value ?? "").toString().trim();
      }
    });
    console.groupEnd();

    state.hasLoaded = true;
    state.canAddFromId = false;
    updateActionButtons();
  }

  async function handleSearch(direction = 0) {
    if (state.isBusy) return;
    const trxIdInput = qs("#TrxDescriptionID");
    const trxId = direction === 0
      ? trxIdInput.value.trim()
      : pickCellValue(state.lastLoadedRow, TRX_ID_KEYS);

    if (!trxId && direction === 0) {
      setToast("Please enter a Transaction ID", "warning");
      return;
    }

    state.isBusy = true;
    setToast("Searching...", "info");

    try {
      await ensureServicesLoaded();
      const payload = {
        BankID: getBankId(),
        OurBranchID: getBranchId(),
        TrxDescriptionID: trxId,
        OperatorID: getOperatorId(),
        Direction: direction
      };

      console.log('[TD] Searching with payload:', payload);
      const resp = await window.StaticDataService.getTrxDescriptions(payload);
      console.log('[TD] Raw response received:', resp);

      // Collect from all possible keys (Details, data, Details01, Details02, etc.)
      function isRowObject(o) {
        if (!o || typeof o !== 'object') return false;
        const keys = Object.keys(o).map(k => k.toLowerCase());
        const candidateKeys = ['trxdescriptionid', 'description', 'transactiontypeid', 'transactiontype', 'transactiontypeid', 'transactiontypeid', 'bankid', 'operatorid', 'eventid'];
        return candidateKeys.some(k => keys.includes(k));
      }

      let candidates = [];
      if (resp && typeof resp === 'object') {
        const sources = [resp];
        if (resp.data && typeof resp.data === 'object') sources.push(resp.data);
        sources.forEach(src => {
          Object.keys(src).forEach(key => {
            const val = src[key];
            if (Array.isArray(val)) {
              val.forEach(item => { if (item && (isRowObject(item) || Object.keys(item).length > 0)) candidates.push(item); });
            } else if (val && typeof val === 'object') {
              if (isRowObject(val)) candidates.push(val);
            }
          });
        });
      }

      // Prefer specific business result set if present (Details01, Details02, etc.)
      let firstRow = null;
      if (resp && Array.isArray(resp.data?.Details01) && resp.data.Details01.length > 0) {
        firstRow = resp.data.Details01[0];
      } else if (resp && Array.isArray(resp.Details01) && resp.Details01.length > 0) {
        firstRow = resp.Details01[0];
      } else if (resp && Array.isArray(resp.data?.Details) && resp.data.Details.length > 0) {
        firstRow = resp.data.Details[0];
      } else if (Array.isArray(resp.Details) && resp.Details.length > 0) {
        firstRow = resp.Details[0];
      } else if (candidates.length > 0) {
        firstRow = candidates[0];
      }

      // If chosen row is audit/meta only, try to find a business row among candidates
      const isAuditRow = firstRow && Object.keys(firstRow).every(k => [
        'OperatorID', 'EventID', 'NewData', 'CreatedOn', 'UpdateCount'
      ].includes(k));
      if (isAuditRow) {
        const businessRow = candidates.find(row => row && (
          row.TrxDescriptionID || row.Description || row.TransactiontypeID || row.TransactionTypeID
        ));
        if (businessRow) firstRow = businessRow;
      }

      console.log('[TD] candidates:', candidates);
      console.log('[TD] chosen row:', firstRow);

      updatecount = firstRow.UpdateCount;

      if (firstRow && (firstRow.TrxDescriptionID || firstRow.Description || firstRow.TransactiontypeID || firstRow.TransactionTypeID)) {
        state.lastLoadedRow = firstRow;
        setFormData(firstRow);
        setToast("Record loaded.", "success");
      } else {
        setToast("Record does not exist.", "warning");
        if (direction === 0) {
          state.hasLoaded = false;
          state.canAddFromId = true;
          state.lastLoadedRow = null;
        }
      }
      setMode(MODES.VIEW);
    } catch (e) {
      console.error('[TD] Search failed:', e);
      setToast("Failed to fetch record.", "danger");
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  // --- Lookup Modal Logic ---

  function openLookupModal() {
    if (!state.lookupModal) {
      const el = qs("#trxLookupModal");
      if (el) state.lookupModal = new bootstrap.Modal(el);
    }
    if (state.lookupModal) {
      state.lookupModal.show();
      qs("#trxLookupForm")?.reset();
      qs("#trxSearchResults").innerHTML = "";
      qs("#trxSearchEmpty").style.display = "block";
      state.lookupFirstRefId = "";
      state.lookupLastRefId = "";
      state.lookupCacheRows = null;
      state.lookupCacheFirstRefId = "";
      state.lookupCacheLastRefId = "";
      updateLookupPagerButtons();
      setTimeout(() => {
        qs("#trxSearchId")?.focus();
        // Load a baseline list (unfiltered) so subsequent searches filter locally.
        void performLookupSearch({ direction: "first", forceRemote: true });
      }, 250);
    }
  }


  async function performLookupSearch(eOrOpts) {
    let direction = "first";
    let forceRemote = false;
    if (eOrOpts && typeof eOrOpts === "object") {
      if (typeof eOrOpts.preventDefault === "function") {
        eOrOpts.preventDefault();
      } else {
        direction = eOrOpts.direction || "first";
        forceRemote = !!eOrOpts.forceRemote;
      }
    }

    const idVal = qs("#trxSearchId")?.value?.trim() || "";
    const nameVal = qs("#trxSearchName")?.value?.trim() || "";
    const idMode = qs("#trxSearchModeId")?.value || "Like";
    const nameMode = qs("#trxSearchModeName")?.value || "Like";
    const hasFilters = !!(idVal || nameVal);

    const results = qs("#trxSearchResults");
    const empty = qs("#trxSearchEmpty");
    const loading = qs("#trxSearchLoading");

    if (results) results.innerHTML = "";
    if (empty) empty.style.display = "none";
    if (loading) loading.classList.remove("d-none");

    try {
      let rows = [];
      let finalResponse = null;

      const fetchBaselineFromTrxDescriptions = async () => {
        await ensureServicesLoaded();
        const maxRecords = Number(window.Environment?.trxLookupMaxRecords ?? 200);
        const maxCalls = Number(window.Environment?.trxLookupMaxCalls ?? 50);
        const seen = new Set();
        const out = [];

        let cursorId = "";
        for (let i = 0; i < maxCalls && out.length < maxRecords; i += 1) {
          const resp = await window.StaticDataService.getTrxDescriptions({
            BankID: getBankId(),
            OurBranchID: getBranchId(),
            TrxDescriptionID: cursorId,
            OperatorID: getOperatorId(),
            Direction: 1
          });

          const batch = extractRowsRobust(resp);
          if (!Array.isArray(batch) || batch.length === 0) break;

          let appended = 0;
          for (const r of batch) {
            const id = (r?.TrxDescriptionID ?? r?.ID ?? r?.TrxID ?? r?.TransactionID ?? "").toString().trim();
            if (!id) continue;
            if (seen.has(id)) continue;
            seen.add(id);
            out.push(r);
            appended += 1;
            cursorId = id;
            if (out.length >= maxRecords) break;
          }

          // If the procedure keeps returning the same record, stop.
          if (appended === 0) break;
        }

        return out;
      };

      // If we've already loaded a baseline list, filter locally for "first" page.
      // Keep remote paging for next/prev.
      if (direction === "first" && !forceRemote && Array.isArray(state.lookupCacheRows) && state.lookupCacheRows.length > 0) {
        rows = state.lookupCacheRows.slice();
        finalResponse = null;
      }

      // Different environments implement PrevOrNext slightly differently.
      // Probe 0 and 1 for the first page to maximize the chance of getting a full page of rows.
      const pagingCandidates = direction === "next" ? ["2", "3"] : (direction === "prev" ? ["-1", "0"] : ["0", "1"]);
      const refId = direction === "next" ? state.lookupLastRefId : (direction === "prev" ? state.lookupFirstRefId : "");

      // Step 1: Use the dedicated listing procedure - ONLY for first page / specific filter
      // Note: We reduce params here to avoid "too many arguments"
      // Step 1: Use the dedicated listing procedure - ONLY for first page / specific filter
      // Use the dedicated procedure only when the user provided filters.
      // Unfiltered list-all should use the generic search, since p_GetTrxDescriptions often returns a single row.
      if (direction === "first" && rows.length === 0 && hasFilters) {
        try {
          await ensureServicesLoaded();
          const listPayload = {
            BankID: getBankId(),
            OurBranchID: getBranchId(),
            TrxDescriptionID: idVal || "",
            OperatorID: getOperatorId(),
            Direction: (idVal || nameVal) ? 0 : 1
          };
          const listResp = await window.StaticDataService.getTrxDescriptions(listPayload);
          const listRows = extractRowsRobust(listResp);
          if (listRows.length > 0) {
            console.debug('[TD Lookup] Success using dedicated service');
            rows = listRows;
            finalResponse = listResp;
          }
        } catch (err) {
          console.warn("[TD Lookup] Primary list failed:", err);
        }
      }

      // Baseline list-all (no filters): walk p_GetTrxDescriptions to build a multi-row list.
      // This matches environments where p_GetSearchResult TableID mapping isn't configured for this dataset.
      if (direction === "first" && rows.length === 0 && !hasFilters) {
        try {
          rows = await fetchBaselineFromTrxDescriptions();
          finalResponse = null;
          if (rows.length > 0) {
            console.debug(`[TD Lookup] Baseline list loaded: ${rows.length} row(s)`);
          }
        } catch (err) {
          console.warn("[TD Lookup] Baseline list failed:", err);
        }
      }

      // Step 2: Generic search probing if dedicated failed or if we have only one row but user wanted "all"
      if (rows.length <= 1 && (rows.length === 0 || forceRemote || direction !== "first" || !Array.isArray(state.lookupCacheRows))) {
        const candidateTableIds = ["TransactionDescription", "TrxDescription", "TrxDescriptions", "UserCodes", "SystemCodes"];
        for (const tid of candidateTableIds) {
          const clauses = [];
          if (idVal) clauses.push(idMode === "Exact" ? `TrxDescriptionID = '${idVal}'` : `TrxDescriptionID like '%${idVal}%'`);
          if (nameVal) clauses.push(nameMode === "Exact" ? `Description = '${nameVal}'` : `Description like '%${nameVal}%'`);
          const whereStmt = clauses.length ? clauses.join(" AND ") : "1=1";

          for (const p of pagingCandidates) {
            try {
              const attempt = await postSearchOldApi({
                TableID: tid,
                WhereStmt: whereStmt,
                PrevOrNext: p,
                RefID: refId,
                AdvFilterString: "",
                OperatorID: getOperatorId(),
                ModuleID: 1000,
                OurBranchID: getBranchId(),
                SearchKey: null,
                LanguageID: "en"
              });

              if (attempt?.success) {
                const potentialRows = extractRowsRobust(attempt);
                if (potentialRows.length > 0) {
                  console.debug(`[TD Lookup] Success using generic search table: ${tid} with P:${p}`);
                  rows = potentialRows;
                  finalResponse = attempt;
                  break;
                }
              }
            } catch { continue; }
          }
          if (rows.length > 0) break;
        }
      }

      // Local filter for description matches if proc returned everything
      if (nameVal && rows.length > 0) {
        const lowerName = nameVal.toLowerCase();
        rows = rows.filter(r => {
          const d = (r.Description || r.TrxDescription || r.CodeDescription || r.TrxName || r.name || "").toString().toLowerCase();
          return nameMode === "Exact" ? d === lowerName : d.includes(lowerName);
        });
      }

      // Local filter for ID (works for cached/unfiltered lists too)
      if (idVal && rows.length > 0) {
        const target = idVal.toLowerCase();
        rows = rows.filter(r => {
          const id = (r.TrxDescriptionID || r.ID || r.TrxID || r.TransactionID || r.SubCodeID || r.Code || r.TrxDescriptionCode || "").toString().trim().toLowerCase();
          return idMode === "Exact" ? id === target : id.includes(target);
        });
      }

      // Cache the baseline list when there are no filters.
      if (direction === "first" && !hasFilters && Array.isArray(rows) && rows.length > 0) {
        state.lookupCacheRows = rows.slice();
      }

      if (!rows.length) {
        if (empty) {
          empty.textContent = "No transaction records found.";
          empty.style.display = "block";
        }
        setToast("Record does not exist.", "warning");
        // When filtered (local), disable paging.
        if (direction === "next") state.lookupLastRefId = "";
        if (direction === "prev") state.lookupFirstRefId = "";
        if (direction === "first" && hasFilters) {
          state.lookupFirstRefId = "";
          state.lookupLastRefId = "";
        }
        updateLookupPagerButtons();
        return;
      }

      // Update Paging State
      if (direction === "first" && hasFilters) {
        // Filtered view is local, so disable paging to avoid confusion.
        state.lookupFirstRefId = "";
        state.lookupLastRefId = "";
        updateLookupPagerButtons();
      } else {
        const firstRef = pickRefId(rows[0]);
        const lastRef = pickRefId(rows[rows.length - 1]);
        const details = finalResponse?.Details || finalResponse?.data?.Details || finalResponse?.data || {};

        const prevRefFromResponse = details.PrevRefID ?? details.PrevRefId ?? details.prevRefId;
        const nextRefFromResponse = details.NextRefID ?? details.NextRefId ?? details.nextRefId;

        state.lookupFirstRefId = (firstRef || prevRefFromResponse || "").toString().trim();
        state.lookupLastRefId = (lastRef || nextRefFromResponse || "").toString().trim();
        // Remember baseline paging ids for the cached list.
        if (direction === "first" && !hasFilters) {
          state.lookupCacheFirstRefId = state.lookupFirstRefId;
          state.lookupCacheLastRefId = state.lookupLastRefId;
        }
        updateLookupPagerButtons();
      }

      if (results) {
        const idKeys = ["TrxDescriptionID", "ID", "TrxID", "TransactionID", "IdentificationTypeCode", "SubCodeID", "Code", "TrxDescriptionCode"];
        const descKeys = ["Description", "TrxDescription", "TrxName", "TransactionName", "CodeDescription", "name", "DescriptionName"];
        const typeKeys = ["TransactionTypeID", "TransactionType", "TrxType", "Type", "TypeCode"];

        const displayRows = rows.map((r) => {
          let id = pickCellValue(r, idKeys);
          let desc = pickCellValue(r, descKeys);
          let type = pickCellValue(r, typeKeys);

          // Fallback: extract any meaningful strings if recognized keys are missing
          if (!id && !desc) {
            const stringVals = Object.entries(r)
              .filter(([k, v]) => typeof v === "string" && v.length > 0 && !["operatorid", "createdon", "newdata"].includes(k.toLowerCase()))
              .map(([, v]) => v);
            if (stringVals.length >= 2) {
              id = stringVals[0];
              desc = stringVals[1];
            } else if (stringVals.length === 1) {
              desc = stringVals[0];
              id = "N/A";
            }
          }

          if (type === "1") type = "Debit";
          else if (type === "2") type = "Credit";

          return { row: r, id: (id || "").toString().trim(), desc: (desc || "").toString().trim(), type: (type || "").toString().trim() };
        }).filter((x) => x && (x.id || x.desc));

        if (!displayRows.length) {
          results.innerHTML = "";
          if (empty) {
            empty.textContent = "No transaction records found.";
            empty.style.display = "block";
          }
          setToast("Record does not exist.", "warning");
          state.lookupFirstRefId = "";
          state.lookupLastRefId = "";
          updateLookupPagerButtons();
          return;
        }

        if (empty) empty.style.display = "none";

        results.innerHTML = displayRows.map((r, idx) => {
          return `<tr style="cursor: pointer;" data-trx-index="${idx}">
              <td>${idx + 1}</td>
              <td style="color: #0f172a !important; font-weight: 600;">${r.id || "---"}</td>
              <td style="color: #0f172a !important;">${r.desc || "---"}</td>
              <td style="color: #0f172a !important;">${r.type || "---"}</td>
            </tr>`;
        }).join("");

        // Double-click to select
        qsa("tr[data-trx-index]", results).forEach(tr => {
          tr.addEventListener("dblclick", (e) => {
            const rowIdx = Number(tr.dataset.trxIndex);
            const selected = displayRows[rowIdx];
            const row = selected?.row;
            const finalId = selected?.id || pickCellValue(row, idKeys) ||
              Object.values(row || {}).find(v => typeof v === 'string' && v.length > 0 && v.length < 25);
            if (qs("#TrxDescriptionID")) {
              qs("#TrxDescriptionID").value = finalId || "";
              state.lookupModal?.hide();
              void handleSearch(0);
            }
          });
        });
      }
    } catch (err) {
      console.error("[TD Lookup] Search failed:", err);
      if (empty) {
        empty.textContent = "Unable to load records. Click Refresh to try again.";
        empty.style.display = "block";
      }
    } finally {
      if (loading) loading.classList.add("d-none");
    }
  }

  async function handleSave() {
    if (state.isBusy) return;
    const trxInput = qs("#TrxDescriptionID");
    if (!trxInput) {
      setToast("Form element TrxDescriptionID not found.", "danger");
      return;
    }
    const trxId = (trxInput.value || "").toString().trim();
    if (!trxId) return setToast("ID is required", "warning");

    state.isBusy = true;
    setToast("Saving...", "info");

    try {
      await ensureServicesLoaded();
      const payload = {
        BankID: getBankId(),
        TrxDescriptionID: trxId,
        Description: (qs("#Description")?.value || "").toString(),
        IsSystemTrx: qs("#IsSystemTrx")?.checked ? 1 : 0,
        TrxCategoryID: (qs("#TrxCategoryID")?.value || "").toString(),
        IsBlocked: qs("#IsBlocked")?.checked ? 1 : 0,
        TransactionTypeID: (qs("#TransactionTypeID")?.value || "").toString(),
        IsChargeable: qs("#IsChargeable")?.checked ? 1 : 0,
        TrxCost: parseFloat((qs("#TrxCost")?.value) || 0),
        CreatedBy: getOperatorId(),
        CreatedOn: new Date().toISOString(),
        ModifiedBy: getOperatorId(),
        ModifiedOn: new Date().toISOString(),
        SupervisedBy: "",
        NewRecord: updatecount
      };

      const resp = await window.StaticDataService.addEditTrxDescription(payload);
      if (resp?.success) {
        setToast("Saved successfully.", "success");
        clearFormData({ keepId: false });
        state.hasLoaded = false;
        state.canAddFromId = false;
        state.lastLoadedRow = null;
        setMode(MODES.VIEW);
      } else {
        setToast(resp?.message || "Save failed.", "danger");
      }
    } catch (e) {
      console.error(e);
      setToast("Error during save operation.", "danger");
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  async function handleDelete() {
    if (state.isBusy || !state.lastLoadedRow) return;

    if (window.Swal) {
      const confirmed = await window.Swal.fire({
        title: "Delete Record?",
        text: "Are you sure you want to delete this Transaction Description?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        confirmButtonText: "Yes, delete it"
      }).then(r => r.isConfirmed);
      if (!confirmed) return;
    }

    state.isBusy = true;
    setToast("Deleting...", "info");
    try {
      await ensureServicesLoaded();
      // Send minimal required parameters to backend delete procedure.
      // Some deployments require `@BankID` while others reject extra keys,
      // so keep this limited to the two likely required params.
      const resp = await window.StaticDataService.deleteTrxDescription({
        BankID: getBankId(),
        TrxDescriptionID: qs("#TrxDescriptionID").value.trim(),
        NewRecord: updatecount
      });

      if (resp?.success) {
        setToast("Record deleted.", "success");
        clearFormData({ keepId: false });
        state.lastLoadedRow = null;
        state.hasLoaded = false;
        state.canAddFromId = false;
        setMode(MODES.VIEW);
      } else {
        setToast(resp?.message || "Delete failed.", "danger");
      }
    } catch (e) {
      setToast("Error deleting record.", "danger");
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  function handleCancel() {
    if (state.isBusy) return;
    clearFormData({ keepId: false });
    state.hasLoaded = false;
    state.canAddFromId = false;
    state.lastLoadedRow = null;
    setMode(MODES.VIEW);
    setToast("Form cleared.", "info");
  }

  function bindEvents() {
    qsa("[data-shell-mode]").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetMode = btn.dataset.shellMode;
        if (targetMode === "Add") {
          const currentId = qs("#TrxDescriptionID")?.value;
          clearFormData({ keepId: true });
          state.hasLoaded = false;
          setMode(MODES.ADD);
        } else if (targetMode === "View") {
          setMode(MODES.VIEW);
          void handleSearch(0);
        } else {
          setMode(MODES[targetMode.toUpperCase()]);
        }
      });
    });

    qs("#btnLookupTrx")?.addEventListener("click", () => openLookupModal());
    qs("#TrxDescriptionID")?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") { e.preventDefault(); void handleSearch(0); }
    });
    qs("#TrxDescriptionID")?.addEventListener("blur", () => {
      if (state.mode === MODES.VIEW && qs("#TrxDescriptionID")?.value.trim() && !state.hasLoaded) {
        void handleSearch(0);
      }
    });

    qs("#trxLookupForm")?.addEventListener("submit", (e) => void performLookupSearch(e));

    qs("#trxSearchRefresh")?.addEventListener("click", () => {
      qs("#trxLookupForm")?.reset();
      state.lookupCacheRows = null;
      state.lookupCacheFirstRefId = "";
      state.lookupCacheLastRefId = "";
      void performLookupSearch({ direction: "first", forceRemote: true });
    });

    qs("#trxSearchPrev")?.addEventListener("click", () => void performLookupSearch({ direction: "prev" }));
    qs("#trxSearchNext")?.addEventListener("click", () => void performLookupSearch({ direction: "next" }));

    qs('[data-trx-nav="prev"]')?.addEventListener("click", () => void handleSearch(-1));
    qs('[data-trx-nav="next"]')?.addEventListener("click", () => void handleSearch(1));

    qs('[data-trx-action="save"]')?.addEventListener("click", () => void handleSave());
    qs('[data-trx-action="delete"]')?.addEventListener("click", () => void handleDelete());
    qs('[data-trx-action="cancel"]')?.addEventListener("click", () => handleCancel());
  }

  window.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    setMode(MODES.VIEW);
    ensureServicesLoaded().then(() => {
      void populateTransactionTypeDropdown();
      void populateCategoryDropdown();
      updateActionButtons();
    });
  });
})();
