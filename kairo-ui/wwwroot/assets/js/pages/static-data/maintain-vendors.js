(() => {
  if (window.__kairoMaintainVendorsLoaded) return;
  window.__kairoMaintainVendorsLoaded = true;

  const DEBUG = !!window.__kairoDebugMaintainVendors;

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
    updateCount: 0,

    // Vendor lookup modal state (p_GetSearchResult)
    lastSearchTableId: "",
    vendorSearchFirstRefId: "",
    vendorSearchLastRefId: "",
    vendorSearchSelectedId: "",
  };

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
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

  function setToast(message, variant = "info") {
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

  function getOldApiBaseUrl() {
    const env = window.Environment || {};
    // Match Maintain Identity Types: search is typically hosted on System Codes gateway.
    return (env.baseUrlSystemCodes || env.baseUrlCommon || "http://localhost:5059").replace(/\/+$/g, "");
  }

  async function postSearchOldApi(requestData) {
    await window.ServiceLoader.loadCore();
    const endpoint = `${getOldApiBaseUrl()}/api/OldAPI`;
    const envelope = window.CoreApi.makeRequestEnvelope("p_GetSearchResult", requestData);
    return window.CoreApi.post(endpoint, envelope);
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

  function extractVendorSearchRows(response) {
    // Match the proven pattern used by Maintain Identity Types / Insurance Code.
    const r = response?.data ?? response;
    let rows = r?.Details?.SearchResults || r?.Details || r?.SearchResults || r?.data || [];
    if (!Array.isArray(rows)) rows = rows ? [rows] : [];
    return rows;
  }

  function getVendorLookupElements() {
    return {
      modal: qs("#vendorLookupModal"),
      form: qs("#vendorLookupForm"),
      refresh: qs("#vendorSearchRefresh"),
      reset: qs("#vendorSearchReset"),
      modeId: qs("#vendorSearchModeId"),
      modeName: qs("#vendorSearchModeName"),
      id: qs("#vendorSearchId"),
      name: qs("#vendorSearchName"),
      results: qs("#vendorSearchResults"),
      empty: qs("#vendorSearchEmpty"),
      loading: qs("#vendorSearchLoading"),
      prev: qs("#vendorSearchPrev"),
      ok: qs("#vendorSearchOk"),
      next: qs("#vendorSearchNext"),
      pageInfo: qs("#vendorSearchPageInfo"),
    };
  }

  let vendorLookupModalInstance = null;

  function setVendorSearchPagingButtons() {
    const { prev, next, ok } = getVendorLookupElements();
    if (prev) prev.disabled = !state.vendorSearchFirstRefId;
    if (next) next.disabled = !state.vendorSearchLastRefId;
    if (ok) ok.disabled = !String(state.vendorSearchSelectedId || "").trim();
  }

  function setVendorSearchSelected(id) {
    state.vendorSearchSelectedId = String(id || "").trim();

    const { results } = getVendorLookupElements();
    if (results) {
      results.querySelectorAll("tr[data-vendor-id]").forEach((tr) => {
        const isSelected = String(tr.getAttribute("data-vendor-id") || "").trim() === state.vendorSearchSelectedId;
        tr.classList.toggle("table-active", isSelected);
      });
    }

    setVendorSearchPagingButtons();
  }

  function confirmVendorSelection() {
    const selectedId = String(state.vendorSearchSelectedId || "").trim();
    if (!selectedId) return;
    const vendorEl = qs("#VendorId");
    if (vendorEl) vendorEl.value = selectedId;
    vendorLookupModalInstance?.hide?.();
    void handleViewOrSearch();
  }

  function renderVendorSearchRows(rows) {
    const { results, empty } = getVendorLookupElements();
    if (results) results.innerHTML = "";

    // Clear any previous selection on new render.
    state.vendorSearchSelectedId = "";

    if (!rows || !rows.length) {
      if (empty) empty.style.display = "block";
      setVendorSearchPagingButtons();
      return;
    }

    if (empty) empty.style.display = "none";

    const frag = document.createDocumentFragment();
    for (const r of rows) {
      const vendorId = pickValue(r, ["VendorID", "VendorId", "Vendor"], ["vendorid", "vendor"]);
      const vendorName = pickValue(r, ["VendorName", "Name"], ["vendorname", "name"]);
      const idText = vendorId == null ? "" : String(vendorId);

      const tr = document.createElement("tr");
      tr.setAttribute("data-vendor-id", idText);
      tr.style.cursor = "pointer";
      tr.innerHTML = `
        <td>${idText}</td>
        <td>${vendorName == null ? "" : String(vendorName)}</td>
      `;
      frag.appendChild(tr);
    }

    results?.appendChild(frag);
    setVendorSearchPagingButtons();
  }

  async function performVendorSearch(eventOrOptions) {
    let direction = "first";
    if (eventOrOptions && typeof eventOrOptions === "object") {
      if (typeof eventOrOptions.preventDefault === "function") {
        eventOrOptions.preventDefault();
      } else {
        direction = eventOrOptions.direction || "first";
      }
    }

    const { id, name, modeId, modeName, results, empty, loading, pageInfo } = getVendorLookupElements();
    const idValue = (id?.value || "").trim();
    const nameValue = (name?.value || "").trim();
    const idMode = (modeId?.value || "Like").trim();
    const nameMode = (modeName?.value || "Like").trim();

    if (results) results.innerHTML = "";
    if (empty) empty.style.display = "none";
    if (pageInfo) pageInfo.textContent = "";
    if (loading) loading.classList.remove("d-none");

    const clauses = [];
    const buildClause = (col, mode, val) => {
      if (!val) return null;
      const safe = String(val).replace(/'/g, "''");
      return mode === "Exact" ? `${col} = '${safe}'` : `${col} like '%${safe}%'`;
    };

    // Column names can vary by environment. Build OR clauses to improve match rates.
    const orClause = (cols, mode, val) => {
      const parts = cols.map((c) => buildClause(c, mode, val)).filter(Boolean);
      return parts.length ? `(${parts.join(" OR ")})` : null;
    };

    // Keep column candidates tight to avoid backend "Invalid column name ..." errors.
    // (Your environment confirms VendorNo/VendorCode/Code are not valid for this TableID.)
    const idClause = orClause(["VendorID", "VendorId"], idMode, idValue);
    const nameClause = orClause(["VendorName", "Name"], nameMode, nameValue);
    if (idClause) clauses.push(idClause);
    if (nameClause) clauses.push(nameClause);

    const whereStmt = clauses.length ? clauses.join(" AND ") : "1=1";

    const candidateTableIds = [
      state.lastSearchTableId,
      "Vendors",
      "Vendor",
      "VendorID",
      "VendorId",
      "VENDOR",
      "VENDORS",
      "VendorMaster",
    ].filter(Boolean);

    const basePayload = {
      WhereStmt: whereStmt,
      AdvFilterString: "",
      PrevOrNext: "1",
      RefID: "",
      OperatorID: getOperatorId(),
      ModuleID: 1000,
      OurBranchID: getBranchId(),
    };

    const pagingCandidates = direction === "next" ? ["2", "3"] : direction === "prev" ? ["0", "-1"] : ["1"];
    if (direction === "next" && !state.vendorSearchLastRefId) {
      setToast("Next page is not available.", "warning");
      if (loading) loading.classList.add("d-none");
      return;
    }
    if (direction === "prev" && !state.vendorSearchFirstRefId) {
      setToast("Previous page is not available.", "warning");
      if (loading) loading.classList.add("d-none");
      return;
    }
    if (direction === "next") basePayload.RefID = state.vendorSearchLastRefId;
    if (direction === "prev") basePayload.RefID = state.vendorSearchFirstRefId;

    try {
      let response = null;
      let usedTableId = null;
      let usedPrevOrNext = null;
      let rows = [];

      // If backend returns success with empty rows (very common when TableID mapping is wrong),
      // keep probing other TableIDs until we find a non-empty one.
      let bestEmptyResponse = null;
      let bestEmptyTableId = null;
      let bestEmptyPrevOrNext = null;

      for (const tableId of candidateTableIds) {
        for (const prevOrNext of pagingCandidates) {
          try {
            const payload = { ...basePayload, TableID: tableId, PrevOrNext: prevOrNext };
            const attempt = await postSearchOldApi(payload);

            if (attempt && typeof attempt.success === "boolean" && !attempt.success) {
              const msg = String(attempt.message || "").toLowerCase();
              if (msg.includes("table") || msg.includes("invalid") || msg.includes("not found")) continue;
            }

            const attemptRows = extractVendorSearchRows(attempt);

            // Accept immediately if we got data.
            if (attemptRows.length) {
              response = attempt;
              usedTableId = tableId;
              usedPrevOrNext = prevOrNext;
              rows = attemptRows;
              break;
            }

            // Keep a fallback: success-but-empty still tells us what TableID responded.
            if (!bestEmptyResponse) {
              bestEmptyResponse = attempt;
              bestEmptyTableId = tableId;
              bestEmptyPrevOrNext = prevOrNext;
            }
          } catch {
            continue;
          }
        }
        if (response) break;
      }

      if (!response && bestEmptyResponse) {
        response = bestEmptyResponse;
        usedTableId = bestEmptyTableId;
        usedPrevOrNext = bestEmptyPrevOrNext;
        rows = [];
      }

      if (!response) throw new Error("Search is not configured for Vendors (TableID mismatch).");
      if (usedTableId) state.lastSearchTableId = usedTableId;

      if (!rows.length) {
        if (empty) {
          empty.textContent = clauses.length ? "No vendors matched the filters." : "No vendors found.";
          empty.style.display = "block";
        }

        // If a paging click returned no rows, disable that direction so it doesn't loop forever.
        if (direction === "next") state.vendorSearchLastRefId = "";
        if (direction === "prev") state.vendorSearchFirstRefId = "";
        setVendorSearchPagingButtons();

        if (pageInfo) pageInfo.textContent = usedTableId ? `TableID: ${usedTableId}${usedPrevOrNext ? ` · Page: ${usedPrevOrNext}` : ""}` : "";
        return;
      }

      // Update paging reference IDs from results and/or response metadata.
      const firstRef = pickRefId(rows[0]);
      const lastRef = pickRefId(rows[rows.length - 1]);

      // Some Vendor search datasets don't include RefID at all; in that case, paging usually works
      // by passing the primary key as RefID.
      const firstVendorKey = pickValue(rows[0], ["VendorID", "VendorId"], ["vendorid"]);
      const lastVendorKey = pickValue(rows[rows.length - 1], ["VendorID", "VendorId"], ["vendorid"]);

      // Beware: in some responses, Details is the *row array* not a metadata object.
      const detailsCandidate = (response?.data ?? response)?.Details;
      const details = detailsCandidate && !Array.isArray(detailsCandidate) ? detailsCandidate : {};
      const prevRefFromResponse =
        details.PrevRefID ?? details.PrevRefId ?? details.prevRefId ?? response?.PrevRefID ?? response?.PrevRefId;
      const nextRefFromResponse =
        details.NextRefID ?? details.NextRefId ?? details.nextRefId ?? response?.NextRefID ?? response?.NextRefId;
      const refFromResponse = details.RefID ?? details.RefId ?? details.refId ?? response?.RefID ?? response?.RefId;

      state.vendorSearchFirstRefId = (firstRef || firstVendorKey || prevRefFromResponse || "").toString().trim();
      state.vendorSearchLastRefId = (lastRef || lastVendorKey || nextRefFromResponse || refFromResponse || "").toString().trim();

      renderVendorSearchRows(rows);
      setVendorSearchPagingButtons();

      if (pageInfo) {
        pageInfo.textContent = `${rows.length} record(s)${usedTableId ? ` · TableID: ${usedTableId}` : ""}${usedPrevOrNext ? ` · Page: ${usedPrevOrNext}` : ""}`;
      }
    } catch (e) {
      console.error(e);
      renderVendorSearchRows([]);
      setVendorSearchPagingButtons();
      setToast(e?.message || "Search failed.", "danger");
    } finally {
      if (loading) loading.classList.add("d-none");
    }
  }

  function openVendorSearchPanel() {
    const { modal } = getVendorLookupElements();
    if (!modal) return;
    vendorLookupModalInstance = vendorLookupModalInstance || new bootstrap.Modal(modal);

    // Reset paging and perform list-all on open.
    state.vendorSearchFirstRefId = "";
    state.vendorSearchLastRefId = "";
    state.vendorSearchSelectedId = "";
    setVendorSearchPagingButtons();

    vendorLookupModalInstance.show();
    window.setTimeout(() => {
      getVendorLookupElements().id?.focus();
      void performVendorSearch({ direction: "first" });
    }, 100);
  }

  function wireVendorSearchPanel() {
    const { form, reset, refresh, prev, next, ok, results } = getVendorLookupElements();
    if (!form) return;

    form.addEventListener("submit", (e) => void performVendorSearch(e));
    reset?.addEventListener("click", (e) => {
      e.preventDefault();
      const els = getVendorLookupElements();
      if (els.id) els.id.value = "";
      if (els.name) els.name.value = "";
      if (els.modeId) els.modeId.value = "Like";
      if (els.modeName) els.modeName.value = "Like";
      state.vendorSearchFirstRefId = "";
      state.vendorSearchLastRefId = "";
      state.vendorSearchSelectedId = "";
      void performVendorSearch({ direction: "first" });
    });

    refresh?.addEventListener("click", (e) => {
      e.preventDefault();
      state.vendorSearchFirstRefId = "";
      state.vendorSearchLastRefId = "";
      state.vendorSearchSelectedId = "";
      void performVendorSearch({ direction: "first" });
    });

    prev?.addEventListener("click", (e) => {
      e.preventDefault();
      void performVendorSearch({ direction: "prev" });
    });

    next?.addEventListener("click", (e) => {
      e.preventDefault();
      void performVendorSearch({ direction: "next" });
    });

    results?.addEventListener("click", (e) => {
      const tr = e.target?.closest?.("tr[data-vendor-id]");
      if (!tr) return;
      const id = tr.getAttribute("data-vendor-id") || "";
      setVendorSearchSelected(id);
      confirmVendorSelection();
    });

    // Single click now confirms selection, so dblclick is redundant but harmless. 
    // We'll keep the ok listener logic if it exists, though the button is missing in HTML.
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
      const lsSession = (() => {
        try {
          const raw = window.localStorage?.getItem?.("nimble_auth_session");
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })();

      return (
        session?.operatorId ||
        session?.operatorID ||
        lsSession?.operatorId ||
        lsSession?.operatorID ||
        session?.name ||
        window.Environment?.defaultOperatorId ||
        window.Environment?.defaultOperatorID ||
        "web_portal"
      );
    } catch {
      return "web_portal";
    }
  }

  function getBranchId() {
    try {
      const session = window.AuthService?.getSession?.();
      return (
        session?.ourBranchId ||
        session?.ourBranchID ||
        session?.branchId ||
        session?.branchID ||
        window.Environment?.defaultOurBranchId ||
        window.Environment?.defaultOurBranchID ||
        window.localStorage?.getItem?.("kairo_ourBranchId") ||
        ""
      );
    } catch {
      return "";
    }
  }

  function getBankId() {
    try {
      const session = window.AuthService?.getSession?.();
      return (
        session?.bankId ||
        session?.bankID ||
        session?.BankId ||
        session?.BankID ||
        window.Environment?.defaultBankId ||
        window.Environment?.defaultBankID ||
        window.localStorage?.getItem?.("kairo_bankId") ||
        ""
      );
    } catch {
      return "";
    }
  }

  function persistContextFromSession() {
    try {
      const session = window.AuthService?.getSession?.();
      const bankId =
        session?.bankId || session?.bankID || session?.BankId || session?.BankID || "";
      const ourBranchId =
        session?.ourBranchId ||
        session?.ourBranchID ||
        session?.branchId ||
        session?.branchID ||
        "";

      if (bankId) window.localStorage?.setItem?.("kairo_bankId", String(bankId));
      if (ourBranchId)
        window.localStorage?.setItem?.("kairo_ourBranchId", String(ourBranchId));
    } catch {
      // ignore
    }
  }

  function persistContextFromEnvironment() {
    try {
      const bankId =
        window.Environment?.defaultBankId || window.Environment?.defaultBankID || "";
      const ourBranchId =
        window.Environment?.defaultOurBranchId ||
        window.Environment?.defaultOurBranchID ||
        "";

      if (bankId && !window.localStorage?.getItem?.("kairo_bankId")) {
        window.localStorage?.setItem?.("kairo_bankId", String(bankId));
      }
      if (ourBranchId && !window.localStorage?.getItem?.("kairo_ourBranchId")) {
        window.localStorage?.setItem?.("kairo_ourBranchId", String(ourBranchId));
      }
    } catch {
      // ignore
    }
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
    const hasBusinessKeys = keys.some(
      (k) =>
        k.includes("vendor") ||
        k.includes("name") ||
        k.includes("address") ||
        k.includes("phone") ||
        k.includes("mobile") ||
        k.includes("email") ||
        k.includes("fax") ||
        k.includes("country") ||
        k.includes("city") ||
        k.includes("zip") ||
        k.includes("contact")
    );
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
      // Some endpoints wrap datasets under `data` even when we already passed resp.data.
      if (payload.data && (Array.isArray(payload.data) || typeof payload.data === "object")) {
        const nested = extractRow(payload.data);
        if (nested) return nested;
      }

      const datasets = [];
      for (const [k, v] of Object.entries(payload)) {
        if (!Array.isArray(v) || !v.length) continue;
        datasets.push({ key: k, value: v });
      }

      function scoreRow(row) {
        if (!row || typeof row !== "object") return -9999;
        if (isMetaOnlyObject(row)) return -9999;
        const id = pickValue(row, ["VendorID", "VendorId"], ["vendorid"]);
        const name = pickValue(row, ["Name", "VendorName"], ["name", "vendorname"]);
        const address = pickValue(row, ["Address1", "Address"], ["address"]);
        const city = pickValue(row, ["CityID", "CityId", "City"], ["cityid", "city"]);
        const country = pickValue(row, ["CountryID", "CountryId", "Country"], ["countryid", "country"]);
        let score = 0;
        if (id != null) score += 100;
        if (name != null) score += 20;
        if (address != null) score += 10;
        if (city != null) score += 5;
        if (country != null) score += 5;
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
    if (match) {
      selectEl.value = match.value;
      return;
    }

    // If options are not yet loaded (or value is not present), inject a one-off option so it displays.
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
    selectEl.value = v;
  }

  function setSelectOptions(selectEl, options, placeholder = "--Select--") {
    if (!selectEl) return;
    const current = selectEl.value;

    selectEl.innerHTML = "";
    const ph = document.createElement("option");
    ph.value = "";
    ph.textContent = placeholder;
    selectEl.appendChild(ph);

    (options || []).forEach((o) => {
      const opt = document.createElement("option");
      opt.value = String(o?.value ?? "");
      opt.textContent = String(o?.label ?? o?.value ?? "");
      selectEl.appendChild(opt);
    });

    if (current) setSelectValue(selectEl, current);
  }

  async function populateLookups() {
    if (!window.ServiceLoader) return;
    await window.ServiceLoader.loadLookupService();

    if (!window.LookupService) return;
    const [cities, countries] = await Promise.all([
      window.LookupService.getCities?.().catch(() => []),
      window.LookupService.getCountries?.().catch(() => []),
    ]);

    if (Array.isArray(cities) && cities.length) setSelectOptions(qs("#City"), cities);
    if (Array.isArray(countries) && countries.length) setSelectOptions(qs("#Country"), countries);
  }

  function applyDataToForm(row) {
    if (!row || typeof row !== "object") return;

    const updateCount = pickValue(row, ["UpdateCount"], ["updatecount"]);
    state.updateCount = updateCount != null && updateCount !== "" ? Number(updateCount) : 0;

    const vendorId = pickValue(row, ["VendorID", "VendorId"], ["vendorid"]);
    const name = pickValue(row, ["Name", "VendorName"], ["name", "vendorname"]);
    const address1 = pickValue(row, ["Address1"], ["address1"]);
    const address2 = pickValue(row, ["Address2"], ["address2"]);
    const city = pickValue(row, ["CityID", "CityId", "City"], ["cityid", "city"]);
    const country = pickValue(row, ["CountryID", "CountryId", "Country"], ["countryid", "country"]);
    const zipCode = pickValue(row, ["ZipCode", "Zip"], ["zipcode", "zip"]);
    const emailId = pickValue(row, ["EmailId", "Email", "EmailID"], ["email"]);
    const phoneHome = pickValue(row, ["PhoneHome"], ["phonehome"]);
    const phoneWork = pickValue(row, ["PhoneWork"], ["phonework"]);
    const mobile = pickValue(row, ["Mobile", "MobileNo"], ["mobile"]);
    const faxNo = pickValue(row, ["FaxNo", "Fax"], ["fax"]);

    const contactPerson = pickValue(row, ["ContactPerson", "ContactPersonID"], ["contactperson"]);
    const contactPersonName = pickValue(row, ["ContactPersonName"], ["contactpersonname"]);
    const products = pickValue(row, ["ProductsDealingWith"], ["productsdealingwith"]);

    const createdBy = pickValue(row, ["CreatedBy"], ["createdby"]);
    const createdOn = pickValue(row, ["CreatedOn", "CreatedDate"], ["createdon", "createddate"]);
    const modifiedBy = pickValue(row, ["ModifiedBy"], ["modifiedby"]);
    const modifiedOn = pickValue(row, ["ModifiedOn", "ModifiedDate"], ["modifiedon", "modifieddate"]);
    const supervisedBy = pickValue(row, ["SupervisedBy"], ["supervisedby"]);
    const supervisedOn = pickValue(row, ["SupervisedOn", "SupervisedDate"], ["supervisedon", "superviseddate"]);

    if (vendorId != null) qs("#VendorId") && (qs("#VendorId").value = String(vendorId));
    if (name != null) qs("#VendorName") && (qs("#VendorName").value = String(name));
    if (address1 != null) qs("#Address1") && (qs("#Address1").value = String(address1));
    if (address2 != null) qs("#Address2") && (qs("#Address2").value = String(address2));
    if (zipCode != null) qs("#ZipCode") && (qs("#ZipCode").value = String(zipCode));
    if (emailId != null) qs("#EmailId") && (qs("#EmailId").value = String(emailId));
    if (phoneHome != null) qs("#PhoneHome") && (qs("#PhoneHome").value = String(phoneHome));
    if (phoneWork != null) qs("#PhoneWork") && (qs("#PhoneWork").value = String(phoneWork));
    if (mobile != null) qs("#Mobile") && (qs("#Mobile").value = String(mobile));
    if (faxNo != null) qs("#FaxNo") && (qs("#FaxNo").value = String(faxNo));

    if (city != null) setSelectValue(qs("#City"), city);
    if (country != null) setSelectValue(qs("#Country"), country);

    if (contactPerson != null) qs("#ContactPerson") && (qs("#ContactPerson").value = String(contactPerson));
    if (contactPersonName != null) qs("#ContactPersonName") && (qs("#ContactPersonName").value = String(contactPersonName));
    if (products != null) qs("#ProductsDealingWith") && (qs("#ProductsDealingWith").value = String(products));

    // Behind the scene fields are spans, so use textContent
    if (createdBy != null) {
      const el = qs("#CreatedBy");
      if (el) el.textContent = String(createdBy);
    }
    if (createdOn != null) {
      const el = qs("#CreatedOn");
      if (el) el.textContent = String(createdOn);
    }
    if (modifiedBy != null) {
      const el = qs("#ModifiedBy");
      if (el) el.textContent = String(modifiedBy);
    }
    if (modifiedOn != null) {
      const el = qs("#ModifiedOn");
      if (el) el.textContent = String(modifiedOn);
    }
    if (supervisedBy != null) {
      const el = qs("#SupervisedBy");
      if (el) el.textContent = String(supervisedBy);
    }
    if (supervisedOn != null) {
      const el = qs("#SupervisedOn");
      if (el) el.textContent = String(supervisedOn);
    }

    state.lastLoadedRow = { ...row };
  }

  function clearFormData(opts = {}) {
    const form = qs("#maintain-vendors-form");
    if (!form) return;
    const keepId = opts.keepId !== false;
    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        if (!keepId && (el.id === "VendorId" || el.name === "VendorId")) {
          el.value = "";
        }
        return;
      }
      if (el.type === "checkbox" || el.type === "radio") {
        el.checked = false;
        return;
      }
      if (el.tagName === "SELECT") {
        el.value = "";
        return;
      }
      el.value = "";
    });

    // Clear audit spans
    ["#CreatedBy", "#CreatedOn", "#ModifiedBy", "#ModifiedOn", "#SupervisedBy", "#SupervisedOn"].forEach(sel => {
      const el = qs(sel);
      if (el) el.textContent = "";
    });
    state.hasLoaded = false;
    state.canAddFromId = false;
    state.lastLoadedRow = null;
    state.updateCount = 0;
  }

  function clearFormForAdd() {
    const keepId = qs("#VendorId")?.value?.trim() || "";
    clearFormData({ keepId: true });
    if (qs("#VendorId")) qs("#VendorId").value = keepId;
    state.canAddFromId = !!keepId;
  }

  async function ensureServicesLoaded() {
    if (!window.ServiceLoader) throw new Error("ServiceLoader missing");
    await window.ServiceLoader.loadCore();
    await window.ServiceLoader.loadStaticDataService();
    // Best-effort: load lookups for City/Country selects.
    try {
      await populateLookups();
    } catch {
      // ignore
    }
    if (!window.StaticDataService?.getVendors) throw new Error("StaticDataService.getVendors is not available");
    if (!window.StaticDataService?.addEditVendors) throw new Error("StaticDataService.addEditVendors is not available");
    if (!window.StaticDataService?.getContactPerson) {
      throw new Error("StaticDataService.getContactPerson is not available");
    }
  }

  function buildSavePayload() {
    const vendorId = qs("#VendorId")?.value?.trim() || "";
    if (!vendorId) throw new Error("Vendor ID is required");

    const vendorName = qs("#VendorName")?.value?.trim() || "";
    if (!vendorName) throw new Error("Vendor Name is required");

    const bankId = getBankId();
    const operatorId = (getOperatorId() || "").trim();
    if (!operatorId || operatorId === "web_portal") {
      throw new Error("Operator ID is required for save (CreatedBy).");
    }

    // IMPORTANT: Keep RequestData minimal and use backend parameter names.
    // (Some OldAPI procs reject unknown keys with "too many arguments specified".)
    const lastRow = state.lastLoadedRow || {};
    const existingCreatedBy = pickValue(lastRow, ["CreatedBy"], ["createdby"]) ?? "";
    const existingCreatedOn = pickValue(lastRow, ["CreatedOn", "CreatedDate"], ["createdon", "createddate"]) ?? "";
    const existingModifiedOn = pickValue(lastRow, ["ModifiedOn", "ModifiedDate"], ["modifiedon", "modifieddate"]) ?? "";
    const existingSupervisedBy = pickValue(lastRow, ["SupervisedBy"], ["supervisedby"]) ?? "";

    const payload = {
      BankID: bankId || "",
      VendorID: vendorId,
      VendorName: vendorName,
      Address1: qs("#Address1")?.value?.trim() || "",
      Address2: qs("#Address2")?.value?.trim() || "",
      CityID: qs("#City")?.value?.trim() || "",
      CountryID: qs("#Country")?.value?.trim() || "",
      ZipCode: qs("#ZipCode")?.value?.trim() || "",
      Phone1: qs("#PhoneHome")?.value?.trim() || "",
      Phone2: qs("#PhoneWork")?.value?.trim() || "",
      Mobile: qs("#Mobile")?.value?.trim() || "",
      Email: qs("#EmailId")?.value?.trim() || "",
      Fax: qs("#FaxNo")?.value?.trim() || "",
      ContactPersonID: qs("#ContactPerson")?.value?.trim() || "",
      ContactPersonName: qs("#ContactPersonName")?.value?.trim() || "",
      ProductDetails: qs("#ProductsDealingWith")?.value?.trim() || "",

      CreatedBy: state.mode === MODES.ADD ? operatorId : (existingCreatedBy || operatorId),
      CreatedOn: state.mode === MODES.ADD ? "" : existingCreatedOn,
      ModifiedBy: operatorId,
      ModifiedOn: state.mode === MODES.ADD ? "" : existingModifiedOn,
      SupervisedBy: state.mode === MODES.ADD ? "" : existingSupervisedBy,
      NewRecord: state.mode === MODES.ADD ? 1 : 2,
    };

    // NOTE: Do NOT send UpdateCount/UpdateCnt.
    // Your environment reports: "@UpdateCount is not a parameter for procedure p_AddEditVendors".

    if (state.mode === MODES.UPDATE && !payload.CreatedBy) {
      // If the record wasn't loaded properly, updating is unsafe.
      throw new Error("Load the record (View/Search) before editing.");
    }

    if (!payload.BankID) {
      console.warn("[MaintainVendors] Missing BankID for save", payload);
    }

    return payload;
  }

  function minimizeVendorSavePayload(payload, level = 1) {
    const p = { ...(payload || {}) };

    const keepLevel1 = new Set([
      "BankID",
      "VendorID",
      "VendorName",
      "Address1",
      "Address2",
      "CityID",
      "CountryID",
      "ZipCode",
      "Phone1",
      "Phone2",
      "Mobile",
      "Email",
      "Fax",
      "ContactPersonID",
      "ContactPersonName",
      "ProductDetails",
      "CreatedBy",
      "CreatedOn",
      "ModifiedBy",
      "ModifiedOn",
      "SupervisedBy",
      "NewRecord",
    ]);

    const keepLevel2 = new Set([
      "BankID",
      "VendorID",
      "VendorName",
      "Address1",
      "Address2",
      "CityID",
      "CountryID",
      "ZipCode",
      "Phone1",
      "Phone2",
      "Mobile",
      "Email",
      "Fax",
      "ContactPersonID",
      "ContactPersonName",
      "ProductDetails",
      "CreatedBy",
      "ModifiedBy",
      "SupervisedBy",
      "NewRecord",
    ]);

    const keepLevel3 = new Set([
      "VendorID",
      "VendorName",
      "Address1",
      "Address2",
      "CityID",
      "CountryID",
      "ZipCode",
      "Phone1",
      "Phone2",
      "Mobile",
      "Email",
      "Fax",
      "ContactPersonID",
      "ContactPersonName",
      "ProductDetails",
      "CreatedBy",
      "ModifiedBy",
      "SupervisedBy",
      "NewRecord",
    ]);

    const keep = level >= 3 ? keepLevel3 : level >= 2 ? keepLevel2 : keepLevel1;
    Object.keys(p).forEach((k) => {
      if (!keep.has(k)) delete p[k];
    });
    return p;
  }

  async function populateContactPersonName() {
    const id = qs("#ContactPerson")?.value?.trim() || "";
    const nameEl = qs("#ContactPersonName");
    if (!id) {
      if (nameEl && state.mode !== MODES.VIEW) nameEl.value = "";
      return;
    }

    try {
      await ensureServicesLoaded();
      const resp = await window.StaticDataService.getContactPerson(id, 0);
      if (resp && typeof resp.success === "boolean" && !resp.success) {
        if (nameEl) nameEl.value = "";
        return;
      }

      const payload = resp?.data ?? resp?.Details ?? resp;
      const row = extractRow(payload);
      const nm =
        pickValue(row, ["ContactPersonName", "Name", "FullName"], ["contactpersonname", "name"]) ??
        "";
      if (nameEl) nameEl.value = nm ? String(nm) : "";
    } catch (e) {
      console.warn("[MaintainVendors] Contact person lookup failed", e);
    }
  }

  function getActionButtons() {
    return {
      view: qs('[data-shell-mode="View"]'),
      add: qs('[data-shell-mode="Add"]'),
      edit: qs('[data-shell-mode="Update"]'),
      del: qs('[data-mv-action="delete"]'),
      save: qs('[data-mv-action="save"]'),
      cancel: qs('[data-mv-action="cancel"]'),
      search: qs('[data-mv-action="search"]'),
    };
  }

  function collectEditableFormValues() {
    return {
      VendorName: qs("#VendorName")?.value?.trim() || "",
      Address1: qs("#Address1")?.value?.trim() || "",
      Address2: qs("#Address2")?.value?.trim() || "",
      CityID: qs("#City")?.value?.trim() || "",
      CountryID: qs("#Country")?.value?.trim() || "",
      ZipCode: qs("#ZipCode")?.value?.trim() || "",
      Phone1: qs("#PhoneHome")?.value?.trim() || "",
      Phone2: qs("#PhoneWork")?.value?.trim() || "",
      Mobile: qs("#Mobile")?.value?.trim() || "",
      Email: qs("#EmailId")?.value?.trim() || "",
      Fax: qs("#FaxNo")?.value?.trim() || "",
      ContactPersonID: qs("#ContactPerson")?.value?.trim() || "",
      ContactPersonName: qs("#ContactPersonName")?.value?.trim() || "",
      ProductDetails: qs("#ProductsDealingWith")?.value?.trim() || "",
      SupervisedBy: qs("#SupervisedBy")?.value?.trim() || "",
    };
  }

  function applyEditableFormValues(values) {
    const v = values || {};
    if (qs("#VendorName")) qs("#VendorName").value = String(v.VendorName ?? "");
    if (qs("#Address1")) qs("#Address1").value = String(v.Address1 ?? "");
    if (qs("#Address2")) qs("#Address2").value = String(v.Address2 ?? "");
    if (qs("#City")) qs("#City").value = String(v.CityID ?? "");
    if (qs("#Country")) qs("#Country").value = String(v.CountryID ?? "");
    if (qs("#ZipCode")) qs("#ZipCode").value = String(v.ZipCode ?? "");
    if (qs("#PhoneHome")) qs("#PhoneHome").value = String(v.Phone1 ?? "");
    if (qs("#PhoneWork")) qs("#PhoneWork").value = String(v.Phone2 ?? "");
    if (qs("#Mobile")) qs("#Mobile").value = String(v.Mobile ?? "");
    if (qs("#EmailId")) qs("#EmailId").value = String(v.Email ?? "");
    if (qs("#FaxNo")) qs("#FaxNo").value = String(v.Fax ?? "");
    if (qs("#ContactPerson")) qs("#ContactPerson").value = String(v.ContactPersonID ?? "");
    if (qs("#ContactPersonName")) qs("#ContactPersonName").value = String(v.ContactPersonName ?? "");
    if (qs("#ProductsDealingWith")) qs("#ProductsDealingWith").value = String(v.ProductDetails ?? "");
    if (qs("#SupervisedBy")) qs("#SupervisedBy").value = String(v.SupervisedBy ?? "");
  }

  function updateActionButtons() {
    const { view, add, edit, del, save, cancel } = getActionButtons();
    setButtonDisabled(view, false);

    const isEditable = state.mode === MODES.ADD || state.mode === MODES.UPDATE;
    const canCancelInView = state.hasLoaded || state.canAddFromId;

    setButtonDisabled(add, !(state.mode === MODES.VIEW && state.canAddFromId));
    setButtonDisabled(edit, !(state.mode === MODES.VIEW && state.hasLoaded));
    setButtonDisabled(del, !(state.mode === MODES.VIEW && state.hasLoaded));
    setButtonDisabled(save, !isEditable);
    setButtonDisabled(cancel, !(isEditable || (state.mode === MODES.VIEW && canCancelInView)));
  }

  async function handleViewOrSearch() {
    if (state.isBusy) return;
    const id = qs("#VendorId")?.value?.trim() || "";
    if (!id) {
      setToast("Enter Vendor ID.", "warning");
      return;
    }

    state.isBusy = true;
    setToast("Loading...", "info");
    try {
      persistContextFromEnvironment();
      persistContextFromSession();
      await ensureServicesLoaded();

      const bankId = getBankId();
      const ourBranchId = getBranchId();
      const operatorId = getOperatorId();

      if (!bankId || !ourBranchId) {
        console.warn("[MaintainVendors] Missing context", {
          BankID: bankId,
          OurBranchID: ourBranchId,
          OperatorID: operatorId,
        });
        setToast(
          "Bank ID / Our Branch ID missing — configure Environment defaults or login to load session context.",
          "warning"
        );
      }

      const resp = await window.StaticDataService.getVendors({
        BankID: bankId,
        OurBranchID: ourBranchId,
        VendorID: id,
        OperatorID: operatorId,
        Direction: 0,
      });

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
      const row = extractRow(payload);
      if (DEBUG) {
        console.debug("[MaintainVendors] resp=", resp);
        console.debug("[MaintainVendors] payload keys=", payload && typeof payload === "object" ? Object.keys(payload) : typeof payload);
        console.debug("[MaintainVendors] selected row=", row);
      }
      if (!row) {
        console.warn("[MaintainVendors] Record not found (row extraction returned null)", {
          request: {
            BankID: bankId,
            OurBranchID: ourBranchId,
            VendorID: id,
            OperatorID: operatorId,
            Direction: 0,
          },
          response: resp,
          payload,
        });
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

    const form = qs("#maintain-vendors-form");
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

    const saveBtn = qs('[data-mv-action="save"]');
    if (saveBtn) saveBtn.disabled = !isEditable;

    updateActionButtons();
  }

  function bindModeButtons() {
    qsa("[data-shell-mode]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const next = btn.getAttribute("data-shell-mode");
        if (!next || !MODES[next.toUpperCase()]) return;

        const nextMode = MODES[next.toUpperCase()];
        if (nextMode === MODES.VIEW) {
          const id = qs("#VendorId")?.value?.trim() || "";
          if (id) {
            await handleViewOrSearch();
            return;
          }
          setMode(MODES.VIEW);
          return;
        }

        if (nextMode === MODES.ADD) {
          const id = qs("#VendorId")?.value?.trim() || "";
          if (!id) {
            setToast("Enter Vendor ID first.", "warning");
            return;
          }
          if (!state.canAddFromId) {
            setToast("Click View/Search first to confirm it doesn't exist.", "warning");
            return;
          }
          clearFormForAdd();
          setMode(MODES.ADD);
          setToast("Add mode.", "info");
          return;
        }

        if (nextMode === MODES.UPDATE) {
          if (!state.hasLoaded) {
            setToast("Load a record first (View/Search) before editing.", "warning");
            return;
          }
          setMode(MODES.UPDATE);
          setToast("Edit mode.", "info");
          return;
        }

        setMode(nextMode);
      });
    });
  }

  function bindActions() {
    const { save, cancel, del, search, view } = getActionButtons();

    // Search icon opens lookup modal (list-all + filter via p_GetSearchResult)
    search?.addEventListener("click", () => openVendorSearchPanel());
    view?.addEventListener("click", () => void handleViewOrSearch());

    qs("#VendorId")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleViewOrSearch();
      }
    });

    const contactBtn = qs('button[aria-label="Search contact person"]');
    contactBtn?.addEventListener("click", () => void populateContactPersonName());

    qs("#ContactPerson")?.addEventListener("blur", () => void populateContactPersonName());
    qs("#ContactPerson")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        populateContactPersonName();
      }
    });

    save?.addEventListener("click", async () => {
      if (state.isBusy) return;
      if (state.mode === MODES.VIEW) return;

      state.isBusy = true;
      setToast("Saving...", "info");
      try {
        await ensureServicesLoaded();

        // If ContactPersonID is supplied but name is blank, try to hydrate it before save.
        const cpId = qs("#ContactPerson")?.value?.trim() || "";
        const cpNameEl = qs("#ContactPersonName");
        if (cpId && cpNameEl && !(cpNameEl.value || "").trim()) {
          await populateContactPersonName();
        }

        const payload = buildSavePayload();

        let resp = await window.StaticDataService.addEditVendors(payload);
        // Some environments reject any unexpected args.
        if (resp && typeof resp.success === "boolean" && !resp.success) {
          const msgLower = String(resp.message || "").toLowerCase();
          if (msgLower.includes("too many arguments")) {
            // Retry 1: keep a known-safe set of proc-like fields.
            const minimal1 = minimizeVendorSavePayload(payload, 1);
            resp = await window.StaticDataService.addEditVendors(minimal1);

            // Retry 2: ultra-minimal (in case the proc only accepts core fields).
            if (resp && typeof resp.success === "boolean" && !resp.success) {
              const msgLower2 = String(resp.message || "").toLowerCase();
              if (msgLower2.includes("too many arguments")) {
                const minimal2 = minimizeVendorSavePayload(payload, 2);
                resp = await window.StaticDataService.addEditVendors(minimal2);

                // Retry 3: minimal required set only.
                if (resp && typeof resp.success === "boolean" && !resp.success) {
                  const msgLower3 = String(resp.message || "").toLowerCase();
                  if (msgLower3.includes("too many arguments")) {
                    const minimal3 = minimizeVendorSavePayload(payload, 3);
                    resp = await window.StaticDataService.addEditVendors(minimal3);
                  }
                }
              }
            }
          }
        }
        if (DEBUG) {
          console.debug("[MaintainVendors] save payload=", payload);
          console.debug("[MaintainVendors] save resp=", resp);
        }
        if (resp && typeof resp.success === "boolean" && !resp.success) {
          const msg = resp.message || "Save failed.";
          const code = resp.code ? ` (${resp.code})` : "";
          setToast(`${msg}${code}`, "danger");

          // Common concurrency message from legacy procs.
          const m = String(msg || "").toLowerCase();
          if (m.includes("another user") || m.includes("already done") || m.includes("already updated") || m.includes("concurrent")) {
            // Identity-Types-like optimistic locking UX: reload and optionally retry with user's changes.
            const pending = collectEditableFormValues();

            let shouldRetry = false;
            if (window.Swal) {
              const r = await window.Swal.fire({
                icon: "warning",
                title: "Record was changed",
                text: "Another user updated this Vendor. Reload latest and retry saving your changes?",
                showCancelButton: true,
                confirmButtonText: "Reload & Retry",
                cancelButtonText: "Cancel",
              });
              shouldRetry = !!r.isConfirmed;
            } else {
              shouldRetry = window.confirm("Another user updated this Vendor. Reload latest and retry saving your changes?");
            }

            try {
              setMode(MODES.VIEW);
              await handleViewOrSearch();
              if (!shouldRetry) {
                setToast("Reloaded latest — review changes and try Edit again.", "warning");
                return;
              }

              setMode(MODES.UPDATE);
              applyEditableFormValues(pending);
              // If ContactPersonID is supplied but name is blank, try to hydrate it.
              const cpId2 = qs("#ContactPerson")?.value?.trim() || "";
              const cpNameEl2 = qs("#ContactPersonName");
              if (cpId2 && cpNameEl2 && !(cpNameEl2.value || "").trim()) {
                await populateContactPersonName();
              }

              const payload2 = buildSavePayload();
              let retryResp = await window.StaticDataService.addEditVendors(payload2);
              if (retryResp && typeof retryResp.success === "boolean" && !retryResp.success) {
                const retryLower = String(retryResp.message || "").toLowerCase();
                if (retryLower.includes("too many arguments")) {
                  const minimal1b = minimizeVendorSavePayload(payload2, 1);
                  retryResp = await window.StaticDataService.addEditVendors(minimal1b);
                  if (retryResp && typeof retryResp.success === "boolean" && !retryResp.success) {
                    const retryLower2 = String(retryResp.message || "").toLowerCase();
                    if (retryLower2.includes("too many arguments")) {
                      const minimal2b = minimizeVendorSavePayload(payload2, 2);
                      retryResp = await window.StaticDataService.addEditVendors(minimal2b);

                      if (retryResp && typeof retryResp.success === "boolean" && !retryResp.success) {
                        const retryLower3 = String(retryResp.message || "").toLowerCase();
                        if (retryLower3.includes("too many arguments")) {
                          const minimal3b = minimizeVendorSavePayload(payload2, 3);
                          retryResp = await window.StaticDataService.addEditVendors(minimal3b);
                        }
                      }
                    }
                  }
                }
              }

              if (retryResp && typeof retryResp.success === "boolean" && !retryResp.success) {
                const msg2 = retryResp.message || "Save failed.";
                const code2 = retryResp.code ? ` (${retryResp.code})` : "";
                setToast(`${msg2}${code2}`, "danger");
                return;
              }

              state.hasLoaded = true;
              state.canAddFromId = false;
              setMode(MODES.VIEW);
              setToast("Saved.", "success");
              await handleViewOrSearch();
              return;
            } catch {
              // ignore
            }
          }
          return;
        }

        // On success, switch to view and reload record.
        state.hasLoaded = true;
        state.canAddFromId = false;
        setMode(MODES.VIEW);
        setToast("Saved.", "success");
        await handleViewOrSearch();
      } catch (e) {
        console.error(e);
        setToast(e?.message || "Save failed.", "danger");
      } finally {
        state.isBusy = false;
        updateActionButtons();
      }
    });

    cancel?.addEventListener("click", () => {
      if (state.mode === MODES.ADD) {
        clearFormForAdd();
        setMode(MODES.VIEW);
        setToast("Cancelled.", "info");
        return;
      }

      if (state.mode === MODES.UPDATE) {
        if (state.lastLoadedRow) {
          applyDataToForm(state.lastLoadedRow);
          state.hasLoaded = true;
        }
        setMode(MODES.VIEW);
        setToast("Cancelled.", "info");
        return;
      }

      clearFormData({ keepId: false });
      setMode(MODES.VIEW);
      setToast("Cleared.", "info");
    });

    del?.addEventListener("click", () => {
      setToast("Delete not wired yet for this screen.", "warning");
    });
  }

  function bindNav() {
    const prevBtn = qs('[data-mv-nav="prev"]');
    const nextBtn = qs('[data-mv-nav="next"]');

    prevBtn?.addEventListener("click", () => {
      // Placeholder (no dataset paging in this demo)
    });

    nextBtn?.addEventListener("click", () => {
      // Placeholder (no dataset paging in this demo)
    });
  }

  window.addEventListener("load", () => {
    bindModeButtons();
    bindActions();
    bindNav();
    wireVendorSearchPanel();
    setMode(MODES.VIEW);
    updateActionButtons();

    // Seed default Bank/Branch context early (if configured).
    try {
      persistContextFromEnvironment();
      persistContextFromSession();
    } catch {
      // ignore
    }

    // Preload lookup dropdown options early.
    try {
      void populateLookups();
    } catch {
      // ignore
    }

    // Best-effort preload.
    try {
      void ensureServicesLoaded();
    } catch {
      // ignore
    }
  });
})();
