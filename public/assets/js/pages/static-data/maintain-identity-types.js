(() => {
  if (window.__kairoMaintainIdentityTypesLoaded) return;
  window.__kairoMaintainIdentityTypesLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  const state = {
    mode: MODES.VIEW,
    hasLoaded: false,
    isBusy: false,
    canAddFromId: false,
    lastLoadedRow: null,
    identityTypeId: "",
    updateCount: 0,
    lastSearchTableId: "",
    identityTypeSearchFirstRefId: "",
    identityTypeSearchLastRefId: "",
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
      save: qs('[data-mit-action="save"]'),
      cancel: qs('[data-mit-action="cancel"]'),
      search: qs('[data-mit-action="search"]'),
    };
  }

  function updateActionButtons() {
    const { view, add, edit, save, cancel } = getActionButtons();

    // View is always available.
    setButtonDisabled(view, false);

    const isEditable = state.mode === MODES.ADD || state.mode === MODES.UPDATE;
    const canCancelInView = state.hasLoaded || state.canAddFromId;

    // Add only becomes available after we confirm "record not found" via View/Search.
    setButtonDisabled(add, !(state.mode === MODES.VIEW && state.canAddFromId));

    // Edit becomes available only after a successful View/Search.
    setButtonDisabled(edit, !(state.mode === MODES.VIEW && state.hasLoaded));

    // Save only in Add/Edit.
    setButtonDisabled(save, !isEditable);

    // Cancel in Add/Edit, and also in View when we have something to clear.
    setButtonDisabled(cancel, !(isEditable || (state.mode === MODES.VIEW && canCancelInView)));
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
    const hasBusinessKeys = keys.some((k) => k.includes("identity") || k.includes("identification") || k.includes("format") || k.includes("length"));
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

  function coerceBool(v) {
    if (v === true) return true;
    if (v === false) return false;
    const s = String(v ?? "").trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes" || s === "y";
  }

  function applyLengthTypeUI() {
    const form = qs("#maintain-identity-types-form");
    if (!form) return;

    const isEditable = state.mode === MODES.ADD || state.mode === MODES.UPDATE;
    if (!isEditable) return;

    const fixed = qs("#FixedLength")?.checked;
    const lengthEl = qs("#Length");
    const minEl = qs("#MinLength");
    const maxEl = qs("#MaxLength");

    if (fixed) {
      if (lengthEl) lengthEl.disabled = false;
      if (minEl) minEl.disabled = true;
      if (maxEl) maxEl.disabled = true;
    } else {
      if (lengthEl) lengthEl.disabled = true;
      if (minEl) minEl.disabled = false;
      if (maxEl) maxEl.disabled = false;
    }
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatMDYHMS(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  }

  function getAlphaNumericValue() {
    // Contract: AlphaNumeric int. Default mapping:
    // Alphanumeric -> 1, Numeric-only -> 0, Alpha-only -> 0.
    // If backend expects different codes, we can adjust once confirmed.
    if (qs("#IsNumeric")?.checked) return 0;
    if (qs("#IsAlphaOnly")?.checked) return 0;
    return 1;
  }

  function buildSavePayload() {
    const identityType = qs("#IdentificationType")?.value?.trim() || "";
    const description = qs("#IdentificationTypeDescription")?.value?.trim() || "";
    const isPrimary = !!qs("#IsPrimaryIdentificationType")?.checked;

    const isFixedLength = !!qs("#FixedLength")?.checked;
    const length = qs("#Length")?.value?.trim() || "";
    const minLength = qs("#MinLength")?.value?.trim() || "";
    const maxLength = qs("#MaxLength")?.value?.trim() || "";

    // Contract has Length + MaxLength.
    // Fixed length: Length=Length, MaxLength=Length.
    // Variable length: Length=MinLength, MaxLength=MaxLength.
    const lengthInt = isFixedLength ? Number(length || 0) : Number(minLength || 0);
    const maxLengthInt = isFixedLength ? Number(length || 0) : Number(maxLength || 0);

    const specialChars = !!qs("#SpecialChars")?.checked;
    const format = qs("#Format")?.value?.trim() || "";

    const operatorId = getOperatorId();
    const now = formatMDYHMS(new Date());

    const isNew = state.mode === MODES.ADD;
    const identityTypeId = state.identityTypeId || identityType;

    return {
      IdentityTypeID: identityTypeId,
      IdentityType: identityType,
      Description: description,
      IsFixedLength: isFixedLength,
      Length: lengthInt,
      MaxLength: maxLengthInt,
      AlphaNumeric: getAlphaNumericValue(),
      IsPrimary: isPrimary,
      SpecialChars: specialChars,
      Format: format,
      CreatedBy: isNew ? operatorId : (state.lastLoadedRow?.CreatedBy || operatorId),
      CreatedOn: isNew ? now : (state.lastLoadedRow?.CreatedOn || state.lastLoadedRow?.CreatedDate || now),
      // Many modules store Modified* even for new records; keep it consistent and predictable.
      ModifiedBy: operatorId,
      ModifiedOn: now,
      SupervisedBy: "",
      UpdateCount: isNew ? 0 : (state.updateCount || 0),
      NewRecord: isNew ? 1 : 0,
    };
  }

  async function handleSave() {
    if (state.isBusy) return;
    if (state.mode === MODES.VIEW) return;

    const identityType = qs("#IdentificationType")?.value?.trim() || "";
    const description = qs("#IdentificationTypeDescription")?.value?.trim() || "";
    if (!identityType) {
      setToast("Identification Type is required.", "warning");
      return;
    }
    if (!description) {
      setToast("Identification Type Description is required.", "warning");
      return;
    }

    state.isBusy = true;
    setToast("Saving...", "info");
    try {
      await ensureServicesLoaded();
      const payload = buildSavePayload();

      const resp = await window.StaticDataService.addEditIdentityTypes(payload);
      if (resp && typeof resp.success === "boolean" && !resp.success) {
        const msg = resp.message || "Save failed.";
        const code = resp.code ? ` (${resp.code})` : "";
        setToast(`${msg}${code}`, "danger");
        return;
      }

      // Show audit info briefly after save (visual confirmation), then clear.
      if (qs("#CreatedBy")) qs("#CreatedBy").value = String(payload.CreatedBy ?? "");
      if (qs("#CreatedOn")) qs("#CreatedOn").value = String(payload.CreatedOn ?? "");
      if (qs("#ModifiedBy")) qs("#ModifiedBy").value = String(payload.ModifiedBy ?? "");
      if (qs("#ModifiedOn")) qs("#ModifiedOn").value = String(payload.ModifiedOn ?? "");

      setToast("Saved.", "success");

      // Clear right after so user can continue with the next record.
      window.setTimeout(() => {
        clearFormData({ keepId: false });
        setMode(MODES.VIEW);
        updateActionButtons();
      }, 400);
    } catch (e) {
      console.error(e);
      setToast(e?.message || "Save failed.", "danger");
    } finally {
      state.isBusy = false;
    }
  }

  function clearFormForAdd() {
    const keepId = qs("#IdentificationType")?.value?.trim() || "";
    clearFormData();
    if (qs("#IdentificationType")) qs("#IdentificationType").value = keepId;

    // Defaults for Add: allow Min/Max editing immediately.
    setRadioById("VariableLength");
    setRadioById("IsAlphanumeric");

    state.canAddFromId = !!keepId;
    updateActionButtons();
  }

  function handleCancel() {
    if (state.isBusy) return;

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

    // View mode: treat Cancel like "Clear" so user can start fresh.
    clearFormData({ keepId: false });
    setMode(MODES.VIEW);
    setToast("Cleared.", "info");
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
        const id = pickValue(row, ["IdentityType", "IdentificationType"], ["identitytype", "identificationtype"]);
        const desc = pickValue(row, ["IdentityTypeDescription", "IdentificationTypeDescription", "Description"], ["description"]);
        const format = pickValue(row, ["Format"], ["format"]);
        let score = 0;
        if (id != null) score += 100;
        if (desc != null) score += 25;
        if (format != null) score += 10;
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

  function setRadioById(idToCheck) {
    const el = qs(`#${idToCheck}`);
    if (el) el.checked = true;
  }

  function applyDataToForm(row) {
    if (!row || typeof row !== "object") return;

    const identityTypeId = pickValue(row, ["IdentityTypeID", "IdentityTypeId"], ["identitytypeid"]);
    const identityType = pickValue(row, ["IdentityType", "IdentificationType"], ["identitytype", "identificationtype"]);
    const description = pickValue(
      row,
      ["IdentityTypeDescription", "IdentificationTypeDescription", "Description"],
      ["description"]
    );
    const isPrimary = pickValue(row, ["IsPrimaryIdentificationType", "IsPrimary"], ["isprimary"]);

    const isFixedLength = pickValue(row, ["IsFixedLength"], ["isfixedlength", "fixedlength"]);
    const lengthType = pickValue(row, ["LengthType"], ["lengthtype", "fixedlength", "variablelength"]);
    const length = pickValue(row, ["Length"], ["length"]);
    const minLength = pickValue(row, ["MinLength"], ["minlength"]);
    const maxLength = pickValue(row, ["MaxLength"], ["maxlength"]);

    const charType = pickValue(row, ["CharType"], ["chartype", "alphanumeric", "numericonly", "alphaonly"]);
    const isAlphaNumeric = pickValue(row, ["IsAlphanumeric"], ["isalphanumeric"]);
    const isNumeric = pickValue(row, ["IsNumeric"], ["isnumeric"]);
    const isAlphaOnly = pickValue(row, ["IsAlphaOnly"], ["isalphaonly"]);
    const specialChars = pickValue(row, ["SpecialChars"], ["specialchars"]);
    const format = pickValue(row, ["Format"], ["format"]);

    const createdBy = pickValue(row, ["CreatedBy"], ["createdby"]);
    const createdOn = pickValue(row, ["CreatedOn", "CreatedDate"], ["createdon", "createddate"]);
    const modifiedBy = pickValue(row, ["ModifiedBy"], ["modifiedby"]);
    const modifiedOn = pickValue(row, ["ModifiedOn", "ModifiedDate"], ["modifiedon", "modifieddate"]);
    const supervisedBy = pickValue(row, ["SupervisedBy"], ["supervisedby"]);
    const supervisedOn = pickValue(row, ["SupervisedOn"], ["supervisedon"]);

    const updateCount = pickValue(row, ["UpdateCount"], ["updatecount"]);

    state.identityTypeId = identityTypeId != null ? String(identityTypeId) : (identityType != null ? String(identityType) : "");
    state.updateCount = updateCount != null ? Number(updateCount) : (state.updateCount || 0);

    if (identityType != null) qs("#IdentificationType") && (qs("#IdentificationType").value = String(identityType));
    if (description != null) qs("#IdentificationTypeDescription") && (qs("#IdentificationTypeDescription").value = String(description));
    if (isPrimary != null) qs("#IsPrimaryIdentificationType") && (qs("#IsPrimaryIdentificationType").checked = coerceBool(isPrimary));

    if (length != null) qs("#Length") && (qs("#Length").value = String(length));
    if (minLength != null) qs("#MinLength") && (qs("#MinLength").value = String(minLength));
    if (maxLength != null) qs("#MaxLength") && (qs("#MaxLength").value = String(maxLength));
    if (format != null) qs("#Format") && (qs("#Format").value = String(format));

    const fixedFlag = isFixedLength != null ? coerceBool(isFixedLength) : null;
    if (fixedFlag === true) setRadioById("FixedLength");
    if (fixedFlag === false) setRadioById("VariableLength");

    const lengthTypeStr = String(lengthType ?? "").toLowerCase();
    if (lengthTypeStr.includes("var")) setRadioById("VariableLength");
    if (lengthTypeStr.includes("fix")) setRadioById("FixedLength");

    const charTypeStr = String(charType ?? "").toLowerCase();
    if (charTypeStr.includes("alpha") && charTypeStr.includes("num")) setRadioById("IsAlphanumeric");
    else if (charTypeStr.includes("num")) setRadioById("IsNumeric");
    else if (charTypeStr.includes("alpha")) setRadioById("IsAlphaOnly");

    // If backend uses boolean flags instead of a CharType string.
    if (isAlphaNumeric != null && coerceBool(isAlphaNumeric)) setRadioById("IsAlphanumeric");
    if (isNumeric != null && coerceBool(isNumeric)) setRadioById("IsNumeric");
    if (isAlphaOnly != null && coerceBool(isAlphaOnly)) setRadioById("IsAlphaOnly");

    if (specialChars != null) qs("#SpecialChars") && (qs("#SpecialChars").checked = coerceBool(specialChars));

    if (createdBy != null) qs("#CreatedBy") && (qs("#CreatedBy").value = String(createdBy));
    if (createdOn != null) qs("#CreatedOn") && (qs("#CreatedOn").value = String(createdOn));
    if (modifiedBy != null) qs("#ModifiedBy") && (qs("#ModifiedBy").value = String(modifiedBy));
    if (modifiedOn != null) qs("#ModifiedOn") && (qs("#ModifiedOn").value = String(modifiedOn));
    if (supervisedBy != null) qs("#SupervisedBy") && (qs("#SupervisedBy").value = String(supervisedBy));
    if (supervisedOn != null) qs("#SupervisedOn") && (qs("#SupervisedOn").value = String(supervisedOn));

    state.lastLoadedRow = { ...row };
    applyLengthTypeUI();
  }

  function getOperatorId() {
    try {
      const session = window.AuthService?.getSession?.();
      return session?.operatorId || session?.operatorID || session?.name || "web_portal";
    } catch {
      return "web_portal";
    }
  }

  function getBranchId() {
    try {
      const session = window.AuthService?.getSession?.();
      return session?.branchId || session?.branchID || session?.OurBranchID || "";
    } catch {
      return "";
    }
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

  function openIdentityTypeSearchPanel() {
    const modalElement = qs("#identityTypeLookupModal");
    if (!modalElement) {
      setToast("Search dialog not found.", "danger");
      return;
    }

    const ModalCtor = window.bootstrap?.Modal;
    if (!ModalCtor) {
      setToast("Bootstrap Modal not available.", "danger");
      return;
    }

    const modalInstance = ModalCtor.getOrCreateInstance(modalElement);
    modalInstance.show();

    resetIdentityTypeSearchPanel();
    const idInput = qs("#identityTypeSearchId");
    if (idInput) setTimeout(() => idInput.focus(), 250);

    // Default behavior: list all records on open.
    void performIdentityTypeSearch();
  }

  function closeIdentityTypeSearchPanel() {
    const modalElement = qs("#identityTypeLookupModal");
    if (!modalElement) return;
    const ModalCtor = window.bootstrap?.Modal;
    if (!ModalCtor) return;
    const modalInstance = ModalCtor.getInstance(modalElement);
    if (modalInstance) modalInstance.hide();
  }

  function resetIdentityTypeSearchPanel() {
    const form = qs("#identityTypeLookupForm");
    const results = qs("#identityTypeSearchResults");
    const empty = qs("#identityTypeSearchEmpty");
    const loading = qs("#identityTypeSearchLoading");
    if (form) form.reset();
    if (results) results.innerHTML = "";
    if (empty) {
      empty.style.display = "block";
      empty.textContent = "No identity types found.";
    }
    if (loading) loading.classList.add("d-none");

    state.identityTypeSearchFirstRefId = "";
    state.identityTypeSearchLastRefId = "";
    updateIdentityTypeSearchPagerButtons();
  }

  function updateIdentityTypeSearchPagerButtons() {
    const prevBtn = qs("#identityTypeSearchPrev");
    const nextBtn = qs("#identityTypeSearchNext");
    if (prevBtn) prevBtn.disabled = !state.identityTypeSearchFirstRefId;
    if (nextBtn) nextBtn.disabled = !state.identityTypeSearchLastRefId;
  }

  function pickRefId(row) {
    if (!row || typeof row !== "object") return "";
    const direct = row.RefID ?? row.RefId ?? row.refId ?? row.refID;
    if (direct != null && String(direct).trim()) return String(direct).trim();

    // Case-insensitive scan
    const keys = Object.keys(row);
    const match = keys.find((k) => k.toLowerCase() === "refid" || k.toLowerCase() === "ref_id");
    if (match && row[match] != null && String(row[match]).trim()) return String(row[match]).trim();
    return "";
  }

  async function performIdentityTypeSearch(eventOrOptions) {
    let direction = "first";
    if (eventOrOptions && typeof eventOrOptions === "object") {
      if (typeof eventOrOptions.preventDefault === "function") {
        eventOrOptions.preventDefault();
      } else {
        direction = eventOrOptions.direction || "first";
      }
    }

    const idValue = (qs("#identityTypeSearchId")?.value || "").trim();
    const descValue = (qs("#identityTypeSearchDesc")?.value || "").trim();
    const fmtValue = (qs("#identityTypeSearchFormat")?.value || "").trim();

    const idMode = qs("#identityTypeSearchModeId")?.value || "Like";
    const descMode = qs("#identityTypeSearchModeDesc")?.value || "Like";
    const fmtMode = qs("#identityTypeSearchModeFormat")?.value || "Like";

    const results = qs("#identityTypeSearchResults");
    const empty = qs("#identityTypeSearchEmpty");
    const loading = qs("#identityTypeSearchLoading");

    if (results) results.innerHTML = "";
    if (empty) empty.style.display = "none";
    if (loading) loading.classList.remove("d-none");

    const clauses = [];
    const buildClause = (col, mode, val) => {
      if (!val) return null;
      const safe = val.replace(/'/g, "''");
      return mode === "Exact" ? `${col} = '${safe}'` : `${col} like '%${safe}%'`;
    };

    // Column names vary slightly across environments; keep common variants.
    const idClause = buildClause("IdentityType", idMode, idValue) || buildClause("IdentificationType", idMode, idValue);
    const descClause = buildClause("Description", descMode, descValue) || buildClause("IdentityTypeDescription", descMode, descValue) || buildClause("IdentificationTypeDescription", descMode, descValue);
    const fmtClause = buildClause("Format", fmtMode, fmtValue);
    [idClause, descClause, fmtClause].forEach((c) => c && clauses.push(c));

    // If no filters, list all records (requested behavior).
    const whereStmt = clauses.length ? clauses.join(" AND ") : "1=1";

    const candidateTableIds = [
      state.lastSearchTableId,
      "IdentityType",
      "IdentityTypeID",
      "IdentificationType",
      "IdentificationTypeID",
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

    const pagingCandidates =
      direction === "next"
        ? ["2", "3"]
        : direction === "prev"
          ? ["0", "-1"]
          : ["1"];

    if (direction === "next" && !state.identityTypeSearchLastRefId) {
      setToast("Next page is not available.", "warning");
      return;
    }
    if (direction === "prev" && !state.identityTypeSearchFirstRefId) {
      setToast("Previous page is not available.", "warning");
      return;
    }

    if (direction === "next") {
      basePayload.RefID = state.identityTypeSearchLastRefId;
    }
    if (direction === "prev") {
      basePayload.RefID = state.identityTypeSearchFirstRefId;
    }

    try {
      let response = null;
      let usedTableId = null;
      let usedPrevOrNext = null;

      for (const tableId of candidateTableIds) {
        for (const prevOrNext of pagingCandidates) {
          try {
            const payload = { ...basePayload, TableID: tableId, PrevOrNext: prevOrNext };
            response = await postSearchOldApi(payload);
            usedTableId = tableId;
            usedPrevOrNext = prevOrNext;

            // If backend returns a structured error, treat it as a failed attempt.
            if (response && typeof response.success === "boolean" && !response.success) {
              const msg = String(response.message || "").toLowerCase();
              // Common failure: wrong table id.
              if (msg.includes("table") || msg.includes("invalid") || msg.includes("not found")) {
                continue;
              }
            }

            break;
          } catch {
            continue;
          }
        }
        if (response) break;
      }

      let rows = response?.Details?.SearchResults || response?.Details || response?.SearchResults || response?.data || [];
      if (!Array.isArray(rows)) rows = rows ? [rows] : [];

      if (!rows.length) {
        if (empty) {
          empty.textContent = clauses.length ? "No identity types matched the filters." : "No identity types found.";
          empty.style.display = "block";
        }

        // If a paging click returned no rows, disable that direction so it doesn't loop forever.
        if (direction === "next") state.identityTypeSearchLastRefId = "";
        if (direction === "prev") state.identityTypeSearchFirstRefId = "";
        updateIdentityTypeSearchPagerButtons();
        return;
      }

      if (usedTableId) state.lastSearchTableId = usedTableId;

      // Update paging reference IDs from results.
      const firstRef = pickRefId(rows[0]);
      const lastRef = pickRefId(rows[rows.length - 1]);
      const details = response?.Details || {};
      const prevRefFromResponse = details.PrevRefID ?? details.PrevRefId ?? details.prevRefId ?? response?.PrevRefID ?? response?.PrevRefId;
      const nextRefFromResponse = details.NextRefID ?? details.NextRefId ?? details.nextRefId ?? response?.NextRefID ?? response?.NextRefId;
      const refFromResponse = details.RefID ?? details.RefId ?? details.refId ?? response?.RefID ?? response?.RefId;

      state.identityTypeSearchFirstRefId = (firstRef || prevRefFromResponse || "").toString().trim();
      state.identityTypeSearchLastRefId = (lastRef || nextRefFromResponse || refFromResponse || "").toString().trim();
      updateIdentityTypeSearchPagerButtons();

      if (results) {
        results.innerHTML = rows
          .map((r, idx) => {
            const id = r.IdentityType || r.IdentificationType || r.IdentityTypeID || r.IdentificationTypeID || "";
            const desc = r.Description || r.IdentityTypeDescription || r.IdentificationTypeDescription || "";
            const fmt = r.Format || r.format || "";
            return `<tr data-result-index="${idx}" style="cursor: pointer;">
              <td>${id}</td>
              <td>${desc}</td>
              <td>${fmt}</td>
              <td class="text-end"><button type="button" class="btn btn-sm btn-primary" data-result-index="${idx}">Select</button></td>
            </tr>`;
          })
          .join("");

        results.querySelectorAll("button[data-result-index]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const idx = Number(btn.getAttribute("data-result-index"));
            const row = rows[idx];
            const selectedId = row?.IdentityType || row?.IdentificationType || row?.IdentityTypeID || row?.IdentificationTypeID || "";
            if (qs("#IdentificationType")) qs("#IdentificationType").value = String(selectedId);
            closeIdentityTypeSearchPanel();
            await handleViewOrSearch();
          });
        });

        results.querySelectorAll("tr[data-result-index]").forEach((tr) => {
          tr.addEventListener("dblclick", async () => {
            const idx = Number(tr.getAttribute("data-result-index"));
            const row = rows[idx];
            const selectedId = row?.IdentityType || row?.IdentificationType || row?.IdentityTypeID || row?.IdentificationTypeID || "";
            if (qs("#IdentificationType")) qs("#IdentificationType").value = String(selectedId);
            closeIdentityTypeSearchPanel();
            await handleViewOrSearch();
          });
        });
      }
    } catch (err) {
      console.error("[MaintainIdentityTypes] Search failed:", err);
      if (empty) {
        empty.textContent = err?.message || "Search failed.";
        empty.style.display = "block";
      }
    } finally {
      if (loading) loading.classList.add("d-none");
    }
  }

  function wireIdentityTypeSearchPanel() {
    const form = qs("#identityTypeLookupForm");
    const submitBtn = qs("#identityTypeSearchSubmit");
    const resetBtn = qs("#identityTypeSearchReset");
    const refreshBtn = qs("#identityTypeSearchRefresh");
    const prevBtn = qs("#identityTypeSearchPrev");
    const nextBtn = qs("#identityTypeSearchNext");

    form?.addEventListener("submit", performIdentityTypeSearch);
    submitBtn?.addEventListener("click", performIdentityTypeSearch);
    resetBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      resetIdentityTypeSearchPanel();
      void performIdentityTypeSearch();
    });
    refreshBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      resetIdentityTypeSearchPanel();
      void performIdentityTypeSearch();
    });

    prevBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      void performIdentityTypeSearch({ direction: "prev" });
    });
    nextBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      void performIdentityTypeSearch({ direction: "next" });
    });

    document.addEventListener("keydown", (e) => {
      const modalElement = qs("#identityTypeLookupModal");
      if (!modalElement) return;
      const isVisible = modalElement.classList.contains("show");
      if (e.key === "Escape" && isVisible) closeIdentityTypeSearchPanel();
    });
  }

  async function ensureServicesLoaded() {
    if (!window.ServiceLoader) throw new Error("ServiceLoader missing");
    await window.ServiceLoader.loadCore();
    await window.ServiceLoader.loadStaticDataService();
    if (!window.StaticDataService?.getIdentityType) {
      throw new Error("StaticDataService.getIdentityType is not available");
    }
    if (!window.StaticDataService?.addEditIdentityTypes) {
      throw new Error("StaticDataService.addEditIdentityTypes is not available");
    }
  }

  function clearFormData(opts = {}) {
    const form = qs("#maintain-identity-types-form");
    if (!form) return;
    const keepId = opts.keepId !== false;
    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        if (!keepId && (el.id === "IdentificationType" || el.name === "IdentificationType")) {
          el.value = "";
        }
        return;
      }
      if (el.type === "checkbox" || el.type === "radio") {
        el.checked = false;
        return;
      }
      el.value = "";
    });
    state.hasLoaded = false;
    state.canAddFromId = false;
    state.lastLoadedRow = null;
    state.identityTypeId = "";
    state.updateCount = 0;
  }

  async function handleViewOrSearch() {
    if (state.isBusy) return;
    const id = qs("#IdentificationType")?.value?.trim() || "";
    if (!id) {
      setToast("Enter Identification Type.", "warning");
      return;
    }

    state.isBusy = true;
    setToast("Loading...", "info");
    try {
      await ensureServicesLoaded();

      const resp = await window.StaticDataService.getIdentityType({
        IdentityType: id,
        OperatorID: getOperatorId(),
      });

      if (resp && typeof resp.success === "boolean" && !resp.success) {
        clearFormData({ keepId: true });
        state.canAddFromId = true;
        const msg = resp.message || "Request failed.";
        const code = resp.code ? ` (${resp.code})` : "";
        setToast(`${msg}${code}`, "danger");
        setMode(MODES.VIEW);
        return;
      }

      const payload = resp?.data ?? resp?.Details ?? resp;
      const row = extractRow(payload);

      if (!row) {
        clearFormData({ keepId: true });
        state.canAddFromId = true;
        setToast("Record not found.", "warning");
        setMode(MODES.VIEW);
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
    }
  }

  function setMode(nextMode) {
    state.mode = nextMode;

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#maintain-identity-types-form");
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

    const saveBtn = qs('[data-mit-action="save"]');
    if (saveBtn) saveBtn.disabled = !isEditable;

    applyLengthTypeUI();

    updateActionButtons();
  }

  function bindModeButtons() {
    qsa("[data-shell-mode]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const next = btn.getAttribute("data-shell-mode");
        if (!next || !MODES[next.toUpperCase()]) return;

        const nextMode = MODES[next.toUpperCase()];
        if (nextMode === MODES.VIEW) {
          const id = qs("#IdentificationType")?.value?.trim() || "";
          if (id) {
            await handleViewOrSearch();
            return;
          }
          setMode(MODES.VIEW);
          return;
        }

        if (nextMode === MODES.ADD) {
          const id = qs("#IdentificationType")?.value?.trim() || "";
          if (!id) {
            setToast("Enter Identification Type first.", "warning");
            return;
          }

          // Only allow Add if the ID does not already exist.
          try {
            await ensureServicesLoaded();
            const check = await window.StaticDataService.getIdentityType({
              IdentityType: id,
              OperatorID: getOperatorId(),
            });

            if (check?.success) {
              const payload = check?.data ?? check?.Details ?? check;
              const row = extractRow(payload);
              if (row) {
                applyDataToForm(row);
                state.hasLoaded = true;
                state.canAddFromId = false;
                setMode(MODES.VIEW);
                setToast("This ID already exists. Loaded in View.", "warning");
                return;
              }
            }
          } catch (e) {
            console.warn(e);
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
    const saveBtn = qs('[data-mit-action="save"]');
    const cancelBtn = qs('[data-mit-action="cancel"]');
    const searchBtn = qs('[data-mit-action="search"]');

    saveBtn?.addEventListener("click", () => void handleSave());

    cancelBtn?.addEventListener("click", () => void handleCancel());

    // Search icon opens the search modal (View button / Enter still loads a record by ID)
    searchBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      openIdentityTypeSearchPanel();
    });

    qs("#IdentificationType")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleViewOrSearch();
      }
    });

    qsa('input[name="LengthType"]').forEach((r) => {
      r.addEventListener("change", () => applyLengthTypeUI());
    });
  }

  window.addEventListener("load", () => {
    bindModeButtons();
    bindActions();
    wireIdentityTypeSearchPanel();
    setMode(MODES.VIEW);
    updateActionButtons();
  });
})();
