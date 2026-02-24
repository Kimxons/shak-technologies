(() => {
  if (window.__kairoNgoMaintenanceLoaded) return;
  window.__kairoNgoMaintenanceLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  const state = {
    mode: MODES.VIEW,
    hasLoaded: false,
    canAddFromId: false,
    lastLoadedRow: null,
    updateCount: 0,
    isBusy: false,
    ngoSearchModalInstance: null,
  };

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  async function ensureServicesLoaded() {
    if (!window.ServiceLoader) throw new Error("ServiceLoader missing");
    await window.ServiceLoader.loadCore();
    if (!window.AuthService) await window.ServiceLoader.loadAuthService?.();
    if (!window.LookupService) await window.ServiceLoader.loadLookupService?.();
    await window.ServiceLoader.loadStaticDataService();
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

  // ==================== VALIDATION SUMMARY (Account Maintenance Style) ====================
  function showSuccessMessage(message) {
    const summary = qs('.validation-summary');
    if (!summary) return;

    // Update icon for success
    const iconEl = summary.querySelector('.validation-summary__icon');
    if (iconEl) {
      iconEl.className = 'bi bi-check-circle validation-summary__icon';
    }

    // Update message and show with success styling
    const textEl = summary.querySelector('.validation-summary__text');
    if (textEl) textEl.textContent = message;

    summary.classList.remove('validation-summary--error');
    summary.classList.add('is-visible', 'validation-summary--success');

    // Setup close button handler
    const closeBtn = summary.querySelector('.validation-summary__close');
    if (closeBtn && !closeBtn._ngoHandlerAttached) {
      closeBtn.addEventListener('click', () => hideValidationSummary());
      closeBtn._ngoHandlerAttached = true;
    }
  }

  function hideValidationSummary() {
    const summary = qs('.validation-summary');
    if (summary) {
      summary.classList.remove('is-visible', 'validation-summary--success', 'validation-summary--error');
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

  async function postSearchOldApi(requestData) {
    const env = window.Environment || {};
    const endpoint = (env.baseUrlSystemCodes || env.baseUrlCommon || "").replace(/\/+$/g, "") + "/api/OldAPI";
    const envelope = window.CoreApi.makeRequestEnvelope("dbo.p_GetSearchResult", requestData);
    return window.CoreApi.post(endpoint, envelope);
  }

  function getActionButtons() {
    return {
      view: qs('[data-shell-mode="View"]'),
      add: qs('[data-shell-mode="Add"]'),
      edit: qs('[data-shell-mode="Update"]'),
      search: qs('[data-nmo-action="search"]'),
      del: qs('[data-nmo-action="delete"]'),
      save: qs('[data-nmo-action="save"]'),
      cancel: qs('[data-nmo-action="cancel"]'),
    };
  }

  function getNgoLookupElements() {
    const modal = qs("#ngoLookupModal");
    if (!modal) return {};
    return {
      modal,
      form: qs("#ngoLookupForm", modal),
      id: qs("#ngoSearchId", modal),
      name: qs("#ngoSearchName", modal),
      modeId: qs("#ngoSearchModeId", modal),
      modeName: qs("#ngoSearchModeName", modal),
      reset: qs("#ngoSearchReset", modal),
      refresh: qs("#ngoSearchRefresh", modal),
      results: qs("#ngoSearchResults", modal),
      empty: qs("#ngoSearchEmpty", modal),
      loading: qs("#ngoSearchLoading", modal),
      submit: qs("#ngoSearchSubmit", modal),
    };
  }

  async function performNgoSearch(e) {
    if (e && e.preventDefault) e.preventDefault();
    const els = getNgoLookupElements();
    if (!els.results) return;

    if (els.loading) els.loading.classList.remove("d-none");
    if (els.empty) els.empty.classList.add("d-none");
    els.results.innerHTML = "";

    const idVal = (els.id?.value || "").trim();
    const nmVal = (els.name?.value || "").trim();
    const idMode = (els.modeId?.value || "Like").trim();
    const nmMode = (els.modeName?.value || "Like").trim();

    const clauses = [];
    const buildClause = (col, mode, val) => {
      if (!val) return null;
      const safe = String(val).replace(/'/g, "''");
      return mode === "Exact" ? `${col} = '${safe}'` : `${col} LIKE '%${safe}%'`;
    };

    const idClause = buildClause("NGOID", idMode, idVal);
    if (idClause) clauses.push(idClause);
    const nmClause = buildClause("NGOName", nmMode, nmVal);
    if (nmClause) clauses.push(nmClause);

    const whereStmt = clauses.length ? clauses.join(" AND ") : "1=1";

    try {
      await ensureServicesLoaded();
      const bankId = getBankId();
      const ourBranchId = getBranchId();

      const candidateTableIds = ["NGO", "t_NGO", "NGOs", "NGOMaster", "NGOID", "t_Ngo"];
      let rows = [];
      let successResp = null;

      for (const tableId of candidateTableIds) {
        try {
          const resp = await postSearchOldApi({
            TableID: tableId,
            WhereStmt: whereStmt,
            AdvFilterString: "",
            PrevOrNext: "1",
            RefID: "",
            OperatorID: getOperatorId(),
            ModuleID: 1000,
            OurBranchID: ourBranchId,
          });

          if (resp && resp.success) {
            const currentRows = extractOldApiRows(resp);
            if (currentRows.length) {
              rows = currentRows;
              successResp = resp;
              break;
            }
            // If empty but success, keep it as fallback
            if (!successResp) successResp = resp;
          }
        } catch (err) {
          console.warn(`[NGO Search] Probing TableID ${tableId} failed`, err);
        }
      }

      if (!rows.length) {
        // Fallback: try p_GetNGO direct if p_GetSearchResult failed
        const respDirect = await window.StaticDataService.getNGO({
          BankID: bankId,
          OurBranchID: ourBranchId,
          NGOID: idVal,
          NGOName: nmVal,
          Direction: 0,
        });
        rows = extractOldApiRows(respDirect);
      }

      if (!rows.length) {
        if (els.empty) els.empty.classList.remove("d-none");
        return;
      }

      rows.forEach((row) => {
        const id = getRowNgoId(row);
        const name = row.NGOName ?? row.NgoName ?? row.Name ?? "";
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        tr.setAttribute("data-ngo-id", id);
        tr.innerHTML = `
          <td><strong>${id}</strong></td>
          <td>${name}</td>
        `;
        tr.addEventListener("dblclick", () => {
          confirmNgoSelection(id);
        });
        els.results.appendChild(tr);
      });
    } catch (e) {
      console.error("[NGO Search] Failed", e);
      setToast("Search failed.", "danger");
    } finally {
      if (els.loading) els.loading.classList.add("d-none");
    }
  }

  function confirmNgoSelection(id) {
    if (!id) return;
    const modalEl = qs("#ngoLookupModal");
    if (modalEl && state.ngoSearchModalInstance) {
      state.ngoSearchModalInstance.hide();
    }
    const idEl = qs("#NgoId");
    if (idEl) {
      idEl.value = id;
      // Trigger load
      loadNgoById({ showNotFoundToast: true });
    }
  }

  function openNgoSearchPanel() {
    const { modal } = getNgoLookupElements();
    if (!modal) return;
    if (!state.ngoSearchModalInstance) {
      state.ngoSearchModalInstance = new bootstrap.Modal(modal);
    }

    state.ngoSearchModalInstance.show();
    window.setTimeout(() => {
      getNgoLookupElements().id?.focus();
      performNgoSearch();
    }, 150);
  }

  function wireNgoSearchPanel() {
    const { form, reset, refresh, results } = getNgoLookupElements();
    if (!form) return;

    form.addEventListener("submit", (e) => performNgoSearch(e));
    reset?.addEventListener("click", () => {
      if (results) results.innerHTML = "";
      const els = getNgoLookupElements();
      if (els.id) els.id.value = "";
      if (els.name) els.name.value = "";
      performNgoSearch();
    });
    refresh?.addEventListener("click", () => performNgoSearch());

    results?.addEventListener("click", (e) => {
      const tr = e.target?.closest("tr[data-ngo-id]");
      if (!tr) return;
      const id = tr.getAttribute("data-ngo-id");
      confirmNgoSelection(id);
    });
  }

  function updateActionButtons() {
    const { view, add, edit, del, save, cancel } = getActionButtons();
    const isEditable = state.mode === MODES.ADD || state.mode === MODES.UPDATE;

    // View: disabled once a record is loaded or in edit mode
    setButtonDisabled(view, isEditable || (state.mode === MODES.VIEW && state.hasLoaded));

    // Add: ONLY enabled when in VIEW mode AND record was not found (canAddFromId = true)
    setButtonDisabled(add, !(state.mode === MODES.VIEW && state.canAddFromId && !state.hasLoaded));

    // Edit: enabled when record is loaded in VIEW mode
    setButtonDisabled(edit, !state.hasLoaded || state.mode === MODES.UPDATE);

    // Save: only in Add/Edit modes
    setButtonDisabled(save, !isEditable);

    // Cancel: enabled in edit modes or when there's something to clear
    setButtonDisabled(cancel, !(isEditable || state.hasLoaded || state.canAddFromId));

    // Delete: only when record is loaded in VIEW mode
    setButtonDisabled(del, !state.hasLoaded);
  }

  function getRowNgoId(row) {
    if (!row || typeof row !== "object") return "";
    const id =
      row.NGOID ??
      row.NgoId ??
      row.NGOId ??
      row.NgoID ??
      row.Ngoid;
    return id == null ? "" : String(id).trim();
  }

  function isValidNgoRow(row) {
    if (!row || typeof row !== "object") return false;
    // Avoid treating meta/envelope objects as data rows.
    // A valid NGO row must contain at least an ID or a name.
    const id = getRowNgoId(row);
    const name = row.NGOName ?? row.NgoName ?? row.Name;
    return !!id || (name != null && String(name).trim().length > 0);
  }

  function normalizeNgoIdForCompare(id) {
    const s = String(id ?? "").trim();
    if (!s) return "";
    // Common OldAPI behavior: numeric IDs may come back without leading zeros.
    if (/^\d+$/.test(s)) {
      try {
        return BigInt(s).toString();
      } catch {
        // Fallback if BigInt not available (very old browsers).
        return String(parseInt(s, 10));
      }
    }
    return s.toUpperCase();
  }

  async function loadNgoById({ showNotFoundToast = true } = {}) {
    if (state.isBusy) return { found: false };

    const id = getNgoId();
    if (!id) {
      setToast("NGO ID is required.", "warning");
      return { found: false };
    }

    state.isBusy = true;
    updateActionButtons();

    try {
      await ensureServicesLoaded();
      const bankId = getBankId();
      const ourBranchId = getBranchId();
      const operatorId = getOperatorId();

      const resp = await window.StaticDataService.getNGO({
        BankID: bankId,
        OurBranchID: ourBranchId,
        NGOID: id,
        OperatorID: operatorId,
        Direction: 0,
      });

      const row = pickFirstRow(resp);
      if (row) {
        const returnedId = getRowNgoId(row);
        const requestedId = id;
        const ok =
          normalizeNgoIdForCompare(returnedId) ===
          normalizeNgoIdForCompare(requestedId);

        if (!ok) {
          // Treat as not found rather than loading a different record.
          clearForm({ keepId: true });
          state.hasLoaded = false;
          state.canAddFromId = true;
          state.lastLoadedRow = null;
          state.updateCount = 0;
          setMode(MODES.VIEW);
          if (showNotFoundToast) setToast("Record not found. You can Add.", "info");
          return { found: false };
        }

        state.hasLoaded = true;
        state.canAddFromId = false;
        state.lastLoadedRow = row;
        state.updateCount = Number(row.UpdateCount ?? row.updateCount ?? 0) || 0;
        clearForm({ keepId: false });
        fillForm(row);
        setMode(MODES.VIEW);

        // Show success message like Account Maintenance
        const loadedId = getRowNgoId(row);
        showSuccessMessage(`NGO details loaded successfully. NGO ID: ${loadedId}`);

        return { found: true, row };
      }

      // Not found
      clearForm({ keepId: true });
      state.hasLoaded = false;
      state.canAddFromId = true;
      state.lastLoadedRow = null;
      state.updateCount = 0;
      setMode(MODES.VIEW);
      if (showNotFoundToast) setToast("Record not found. You can Add.", "info");
      return { found: false };
    } catch (e) {
      console.error("[NGO] Load failed", e);
      setToast(e?.message || "Load failed.", "danger");
      return { found: false, error: e };
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  function getOperatorId() {
    try {
      const session = window.AuthService?.getSession?.() || {};
      return (
        session?.operatorID ||
        session?.operatorId ||
        window.Config?.OperatorID ||
        localStorage.getItem("OperatorID") ||
        session?.name ||
        "web_portal"
      );
    } catch {
      return "web_portal";
    }
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
    } catch {
      return "";
    }
  }

  function getBankId() {
    try {
      const env = window.Environment || {};
      const session = window.AuthService?.getSession?.() || {};
      return (
        session.BankID ||
        session.bankId ||
        session.bankID ||
        env.defaultBankId ||
        env.defaultBankID ||
        window.Config?.BankID ||
        localStorage.getItem("BankID") ||
        "00"
      ).toString().trim();
    } catch {
      return "00";
    }
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  // OldAPI-friendly: MM/DD/YYYY HH:mm:ss
  function formatMDYHMS(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  }

  function isoDateToMdy(value) {
    const s = String(value || "").trim();
    // Expect yyyy-mm-dd
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return s;
    const [, yyyy, mm, dd] = m;
    return `${mm}/${dd}/${yyyy}`;
  }

  function toIsoDate(value) {
    if (value == null) return "";

    // If it is already YYYY-MM-DD...
    const raw = String(value).trim();
    if (!raw) return "";

    // ISO with time
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

    // MM/DD/YYYY (optionally with time)
    const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (mdy) return `${mdy[3]}-${pad2(mdy[1])}-${pad2(mdy[2])}`;

    // YYYY/MM/DD
    const ymdSlashes = raw.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    if (ymdSlashes) return `${ymdSlashes[1]}-${pad2(ymdSlashes[2])}-${pad2(ymdSlashes[3])}`;

    return "";
  }

  function formatDateDisplay(isoDate) {
    if (!isoDate) return "";
    const parts = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!parts) return "";

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const year = parts[1];
    const month = parseInt(parts[2], 10);
    const day = parseInt(parts[3], 10);

    return `${pad2(day)} ${months[month - 1]} ${year}`;
  }

  function rebuildSelectOptions(selectEl, options, selectedValue = "") {
    if (!selectEl) return;
    const keep = selectEl.value;
    selectEl.innerHTML = "";

    const ph = document.createElement("option");
    ph.value = "";
    ph.textContent = "--Select--";
    selectEl.appendChild(ph);

    (options || []).forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt.value;
      o.textContent = opt.label;
      selectEl.appendChild(o);
    });

    const v = (selectedValue || keep || "").toString();
    selectEl.value = v;
    // If the value doesn't exist in options, don't keep phantom values.
    if (v && selectEl.value !== v) selectEl.value = "";
  }

  async function initLookups() {
    try {
      await ensureServicesLoaded();
      const lookup = window.LookupService;
      if (!lookup) return;

      const [cities, countries] = await Promise.all([
        lookup.getCities?.(),
        lookup.getCountries?.(),
      ]);

      rebuildSelectOptions(qs("#City"), cities || [], qs("#City")?.value || "");
      rebuildSelectOptions(qs("#Country"), countries || [], qs("#Country")?.value || "");
    } catch (e) {
      console.warn("[NGO] Failed to init lookups", e);
    }
  }

  function extractOldApiRows(resp) {
    const candidates = [
      resp?.data?.Details01,
      resp?.Details01,
      resp?.data?.Details,
      resp?.Details,
      resp?.data?.SearchResults,
      resp?.SearchResults,
    ];

    const toRows = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value.filter((x) => isValidNgoRow(x));
      if (typeof value === "object") return isValidNgoRow(value) ? [value] : [];
      return [];
    };

    for (const c of candidates) {
      const rows = toRows(c);
      if (rows.length) return rows;
    }

    return [];
  }

  function pickFirstRow(resp) {
    const rows = extractOldApiRows(resp);
    return rows.length ? rows[0] : null;
  }

  function getNgoId() {
    return (qs("#NgoId")?.value || "").trim();
  }

  function clearForm({ keepId = false } = {}) {
    const form = qs("#ngo-maintenance-form");
    if (!form) return;

    // Hide any existing success/error message
    hideValidationSummary();

    const keepNgoId = keepId ? getNgoId() : "";
    qsa("input, select, textarea", form).forEach((el) => {
      const id = el.getAttribute("id") || "";
      if (id === "NgoId") return;

      if (el.tagName === "INPUT" && el.type === "checkbox") {
        el.checked = false;
        return;
      }

      if (el.tagName === "SELECT") {
        el.value = "";
        return;
      }

      el.value = "";
    });

    // Clear audit span fields (Behind The Scene)
    qsa(".audit-value", form).forEach((el) => {
      el.textContent = "";
    });

    if (keepId) {
      const idEl = qs("#NgoId");
      if (idEl) idEl.value = keepNgoId;
    } else {
      const idEl = qs("#NgoId");
      if (idEl) idEl.value = "";
    }
  }

  function readFormRow() {
    const operatorId = getOperatorId();
    const current = state.lastLoadedRow || {};
    const createdBy = current.CreatedBy || current.CreatedBY || operatorId;

    return {
      BankID: getBankId(),
      NGOID: getNgoId(),
      NGOName: (qs("#NgoName")?.value || "").trim(),
      EstablishedDate: isoDateToMdy(qs("#EstablishedDate")?.getAttribute('data-iso-value') || ""),
      RegistrationNo: (qs("#RegistrationNo")?.value || "").trim(),
      RegistrationDetail: (qs("#RegistrationDetail")?.value || "").trim(),
      AffiliatedDate: isoDateToMdy(qs("#AffiliatedDate")?.getAttribute('data-iso-value') || ""),
      ContactPerson: (qs("#ContactPerson")?.value || "").trim(),
      ByLawDetails: (qs("#ByLawDetails")?.value || "").trim(),
      Address1: (qs("#Address1")?.value || "").trim(),
      Address2: (qs("#Address2")?.value || "").trim(),
      CityID: (qs("#City")?.value || "").trim(),
      CountryID: (qs("#Country")?.value || "").trim(),
      ZipCode: (qs("#ZipCode")?.value || "").trim(),
      Phone1: (qs("#PhoneHome")?.value || "").trim(),
      Phone2: (qs("#PhoneWork")?.value || "").trim(),
      Fax: (qs("#FaxNo")?.value || "").trim(),
      Mobile: (qs("#Mobile")?.value || "").trim(),
      Email: (qs("#EmailId")?.value || "").trim(),
      CreatedBy: createdBy,
      ModifiedBy: operatorId,
      SupervisedBy: current.SupervisedBy || current.SupervisedBY || "",
    };
  }

  function fillForm(row) {
    if (!row || typeof row !== "object") return;
    const id = getRowNgoId(row);
    if (id != null) {
      const el = qs("#NgoId");
      if (el) el.value = String(id).trim();
    }

    const name = row.NGOName ?? row.NgoName ?? row.Name;
    if (name != null) {
      const el = qs("#NgoName");
      if (el) el.value = String(name).trim();
    }

    const est = row.EstablishedDate ?? row.EstablishedOn;
    if (est != null) {
      const el = qs("#EstablishedDate");
      const isoDate = window.GlobalUtils?.parseDateInput ? window.GlobalUtils.parseDateInput(est) : toIsoDate(est);
      const displayDate = window.GlobalUtils?.formatDate ? window.GlobalUtils.formatDate(isoDate) : formatDateDisplay(isoDate);
      console.log("[NGO] Setting EstablishedDate - Raw:", est, "ISO:", isoDate, "Display:", displayDate, "Element found:", !!el);
      if (el) {
        // Handle Flatpickr date inputs
        if (el._flatpickr) {
          el._flatpickr.setDate(isoDate, true);
        } else {
          el.value = displayDate;
          el.setAttribute('data-iso-value', isoDate);
        }
      }
    }

    const regNo = row.RegistrationNo ?? row.RegistrationNO;
    if (regNo != null) {
      const el = qs("#RegistrationNo");
      if (el) el.value = String(regNo).trim();
    }

    const regDetail = row.RegistrationDetail ?? row.Remarks;
    if (regDetail != null) {
      const el = qs("#RegistrationDetail");
      if (el) el.value = String(regDetail).trim();
    }

    const aff = row.AffiliatedDate;
    if (aff != null) {
      const el = qs("#AffiliatedDate");
      const isoDate = window.GlobalUtils?.parseDateInput ? window.GlobalUtils.parseDateInput(aff) : toIsoDate(aff);
      const displayDate = window.GlobalUtils?.formatDate ? window.GlobalUtils.formatDate(aff) : formatDateDisplay(isoDate);
      console.log("[NGO] Setting AffiliatedDate - Raw:", aff, "ISO:", isoDate, "Display:", displayDate, "Element found:", !!el);
      if (el) {
        // Handle Flatpickr date inputs
        if (el._flatpickr) {
          el._flatpickr.setDate(isoDate, true);
        } else {
          el.value = displayDate;
          el.setAttribute('data-iso-value', isoDate);
        }
      }
    }

    const contact = row.ContactPerson;
    if (contact != null) {
      const el = qs("#ContactPerson");
      if (el) el.value = String(contact).trim();
    }

    const bylaws = row.ByLawDetails;
    if (bylaws != null) {
      const el = qs("#ByLawDetails");
      if (el) el.value = String(bylaws).trim();
    }

    const addr1 = row.Address1;
    if (addr1 != null) {
      const el = qs("#Address1");
      if (el) el.value = String(addr1).trim();
    }

    const addr2 = row.Address2;
    if (addr2 != null) {
      const el = qs("#Address2");
      if (el) el.value = String(addr2).trim();
    }

    const cityId = row.CityID ?? row.CityId ?? row.City;
    if (cityId != null) {
      const el = qs("#City");
      if (el) el.value = String(cityId).trim();
    }

    const countryId = row.CountryID ?? row.CountryId ?? row.Country;
    if (countryId != null) {
      const el = qs("#Country");
      if (el) el.value = String(countryId).trim();
    }

    const zip = row.ZipCode;
    if (zip != null) {
      const el = qs("#ZipCode");
      if (el) el.value = String(zip).trim();
    }

    const email = row.Email ?? row.EmailId ?? row.EmailID;
    if (email != null) {
      const el = qs("#EmailId");
      if (el) el.value = String(email).trim();
    }

    const phone1 = row.Phone1;
    if (phone1 != null) {
      const el = qs("#PhoneHome");
      if (el) el.value = String(phone1).trim();
    }

    const phone2 = row.Phone2;
    if (phone2 != null) {
      const el = qs("#PhoneWork");
      if (el) el.value = String(phone2).trim();
    }

    const mobile = row.Mobile;
    if (mobile != null) {
      const el = qs("#Mobile");
      if (el) el.value = String(mobile).trim();
    }

    const fax = row.Fax;
    if (fax != null) {
      const el = qs("#FaxNo");
      if (el) el.value = String(fax).trim();
    }

    const createdBy = row.CreatedBy;
    if (createdBy != null) {
      const el = qs("#CreatedBy");
      if (el) el.textContent = String(createdBy).trim();
    }

    const createdOn = row.CreatedOn ?? row.CreatedDate;
    if (createdOn != null) {
      const el = qs("#CreatedOn");
      if (el) el.textContent = String(createdOn).trim();
    }

    const modifiedBy = row.ModifiedBy;
    if (modifiedBy != null) {
      const el = qs("#ModifiedBy");
      if (el) el.textContent = String(modifiedBy).trim();
    }

    const modifiedOn = row.ModifiedOn ?? row.ModifiedDate;
    if (modifiedOn != null) {
      const el = qs("#ModifiedOn");
      if (el) el.textContent = String(modifiedOn).trim();
    }

    const supervisedBy = row.SupervisedBy;
    if (supervisedBy != null) {
      const el = qs("#SupervisedBy");
      if (el) el.textContent = String(supervisedBy).trim();
    }

    const supervisedOn = row.SupervisedOn;
    if (supervisedOn != null) {
      const el = qs("#SupervisedOn");
      if (el) el.textContent = String(supervisedOn).trim();
    }
  }

  function lockAuditFields(form) {
    const auditIds = [
      "CreatedBy",
      "CreatedOn",
      "ModifiedBy",
      "ModifiedOn",
      "SupervisedBy",
      "SupervisedOn",
    ];

    auditIds.forEach((id) => {
      const el = form.querySelector(`#${CSS.escape(id)}`);
      if (el) el.disabled = true;
    });
  }

  function setMode(nextMode) {
    state.mode = nextMode;

    if (nextMode === MODES.ADD) {
      state.updateCount = 0;
    }

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#ngo-maintenance-form");
    if (!form) return;

    const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        return;
      }

      // Date inputs with data-native-date: disable them in VIEW mode so they show values
      if (el.hasAttribute("data-native-date")) {
        el.disabled = !isEditable;
      } else {
        el.disabled = !isEditable;
      }
    });

    // Keep search buttons enabled in all modes.
    qsa("[data-always-enabled]", form).forEach((el) => {
      el.disabled = false;
    });

    // Audit fields are always read-only.
    lockAuditFields(form);

    updateActionButtons();
  }

  function bindModeButtons() {
    qsa("[data-shell-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const next = btn.getAttribute("data-shell-mode");
        if (!next || !MODES[next.toUpperCase()]) return;
        setMode(MODES[next.toUpperCase()]);
      });
    });
  }

  function bindFormIdWatcher() {
    const idEl = qs("#NgoId");
    if (!idEl) return;

    idEl.addEventListener("input", () => {
      if (state.mode !== MODES.VIEW) return;
      const hasId = !!getNgoId();

      // When ID is cleared, reset state
      if (!hasId) {
        state.canAddFromId = false;
        state.hasLoaded = false;
        state.lastLoadedRow = null;
        state.updateCount = 0;
      }
      // When ID is typed, do NOT enable Add - user must search first

      updateActionButtons();
    });
  }

  function bindActions() {
    const { save, cancel, del, search, add, edit, view } = getActionButtons();

    search?.addEventListener("click", () => {
      const id = getNgoId();
      if (id) {
        loadNgoById({ showNotFoundToast: true }).then((r) => {
          if (r?.found) setToast("Record loaded.", "success");
        });
      } else {
        openNgoSearchPanel();
      }
    });

    add?.addEventListener("click", () => {
      if (add.disabled) return;
      setMode(MODES.ADD);
    });

    edit?.addEventListener("click", () => {
      if (edit.disabled) return;
      setMode(MODES.UPDATE);
    });

    view?.addEventListener("click", () => {
      const id = getNgoId();
      if (!id) {
        openNgoSearchPanel();
        return;
      }
      loadNgoById({ showNotFoundToast: true }).then((r) => {
        if (r?.found) setToast("Record loaded.", "success");
      });
    });

    save?.addEventListener("click", () => {
      (async () => {
        if (save.disabled) return;
        if (state.mode === MODES.VIEW) return;
        if (state.isBusy) return;

        const id = getNgoId();
        const name = (qs("#NgoName")?.value || "").trim();
        if (!id) {
          setToast("NGO ID is required.", "warning");
          return;
        }
        if (!name) {
          setToast("NGO Name is required.", "warning");
          return;
        }

        state.isBusy = true;
        updateActionButtons();

        try {
          await ensureServicesLoaded();
          const payload = {
            ...readFormRow(),
            UpdateCount: state.mode === MODES.ADD ? 1 : (state.updateCount || 0)
          };

          console.log("[NGO] Saving payload:", payload);

          // If the backend says "too many arguments", it usually means it doesn't want audit fields.
          // We'll pass a pruned version if we haven't already.
          const resp = await window.StaticDataService.addEditNGO(payload);

          if (!resp.success) {
            console.error("[NGO] Save failed with response:", resp);
            let msg = resp.message || "Save failed.";

            // CONCURRENCY ERROR HANDLING
            if (resp.code === '091' || msg.includes("already done")) {
              if (state.mode === MODES.ADD) {
                // ID exists in database - offer to load and edit it
                if (window.Swal) {
                  const result = await window.Swal.fire({
                    icon: "warning",
                    title: "Record Already Exists",
                    html: `<p>NGO ID <strong>${getNgoId()}</strong> already exists in the database.</p><p>Would you like to load it and switch to Edit mode?</p>`,
                    showCancelButton: true,
                    confirmButtonText: "Yes, Load & Edit",
                    cancelButtonText: "No, Choose Different ID",
                  });

                  if (result.isConfirmed) {
                    const loaded = await loadNgoById({ showNotFoundToast: false });
                    if (loaded.found) {
                      setMode(MODES.UPDATE);
                      setToast("Record loaded. You can now edit it.", "info");
                    } else {
                      setToast("Could not load the existing record. Please try searching manually.", "warning");
                    }
                  } else {
                    setToast("Please enter a different NGO ID.", "info");
                  }
                  return;
                }
                msg = "This NGO ID already exists in the database. Please search for it first, then click Edit.";
              } else {
                // Update mode - version mismatch, reload to sync
                await loadNgoById({ showNotFoundToast: false });
                msg = "Version mismatch detected. We've synchronized your form with the latest server data. Please click Save again.";
              }
            }

            setToast(msg, "danger");
            return;
          }

          setToast("Saved.", "success");

          // Clear all fields after successful save
          clearForm({ keepId: false });
          state.hasLoaded = false;
          state.canAddFromId = false;
          state.lastLoadedRow = null;
          state.updateCount = 0;
          setMode(MODES.VIEW);
        } catch (e) {
          console.error("[NGO] Save failed", e);
          setToast(e?.message || "Save failed.", "danger");
        } finally {
          state.isBusy = false;
          updateActionButtons();
        }
      })();
    });

    cancel?.addEventListener("click", () => {
      if (cancel.disabled) return;

      if (state.mode === MODES.ADD || state.mode === MODES.UPDATE) {
        // Revert to last loaded state (or keep ID for add flow).
        if (state.lastLoadedRow) {
          clearForm({ keepId: false });
          fillForm(state.lastLoadedRow);
          state.hasLoaded = true;
          state.canAddFromId = false;
          state.updateCount = Number(state.lastLoadedRow.UpdateCount ?? state.lastLoadedRow.updateCount ?? 0) || 0;
        } else {
          clearForm({ keepId: true });
          state.hasLoaded = false;
          state.canAddFromId = !!getNgoId();
          state.updateCount = 0;
        }
        setMode(MODES.VIEW);
        return;
      }

      // View-mode cancel clears.
      clearForm({ keepId: false });
      state.hasLoaded = false;
      state.canAddFromId = false;
      state.lastLoadedRow = null;
      state.updateCount = 0;
      setMode(MODES.VIEW);
    });

    del?.addEventListener("click", () => {
      (async () => {
        if (del.disabled) return;
        if (state.isBusy) return;
        const id = getNgoId();
        if (!id) return;

        // Use SweetAlert2 for delete confirmation
        const result = await window.Swal.fire({
          title: 'Delete Record?',
          text: `Are you sure you want to delete NGO ${id}? This action cannot be undone.`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, Delete',
          confirmButtonColor: '#dc3545',
          cancelButtonText: 'Cancel',
          cancelButtonColor: '#6c757d'
        });

        if (!result.isConfirmed) return;

        state.isBusy = true;
        updateActionButtons();

        try {
          await ensureServicesLoaded();
          const bankId = getBankId();
          const resp = await window.StaticDataService.deleteNGO({
            BankID: bankId,
            NGOID: id,
            UpdateCount: Number(state.updateCount || state.lastLoadedRow?.UpdateCount || 0) || 0,
          });

          // Some procs return meta-only; treat success if no throw.
          void resp;

          clearForm({ keepId: false });
          state.hasLoaded = false;
          state.canAddFromId = false;
          state.lastLoadedRow = null;
          state.updateCount = 0;
          setMode(MODES.VIEW);
          setToast("NGO deleted successfully.", "success");
        } catch (e) {
          console.error("[NGO] Delete failed", e);
          setToast(e?.message || "Delete failed.", "danger");
        } finally {
          state.isBusy = false;
          updateActionButtons();
        }
      })();
    });

  }

  function bindNav() {
    const prevBtn = qs('[data-nmo-nav="prev"]');
    const nextBtn = qs('[data-nmo-nav="next"]');

    prevBtn?.addEventListener("click", () => {
      // Placeholder (no dataset paging in this demo)
    });

    nextBtn?.addEventListener("click", () => {
      // Placeholder (no dataset paging in this demo)
    });
  }

  window.addEventListener("load", () => {
    bindModeButtons();
    bindFormIdWatcher();
    bindActions();
    bindNav();
    wireNgoSearchPanel();
    initLookups();
    setMode(MODES.VIEW);
  });
})();
