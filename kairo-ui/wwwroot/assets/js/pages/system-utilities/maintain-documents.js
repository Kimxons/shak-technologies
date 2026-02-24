(() => {
  if (window.__kairoMaintainDocumentsLoaded) return;
  window.__kairoMaintainDocumentsLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  const state = {
    mode: MODES.VIEW,
    hasLoaded: false,
  };

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
      return session?.branchId || session?.branchID || session?.ourBranchId || session?.ourBranchID || "";
    } catch {
      return "";
    }
  }

  function getBankId() {
    try {
      const session = window.AuthService?.getSession?.();
      return session?.bankId || session?.bankID || session?.BankId || session?.BankID || "";
    } catch {
      return "";
    }
  }

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function setToast(message, variant = "info") {
    const toast = qs("#mdToast");
    if (!toast) return;
    toast.classList.remove("d-none", "alert-success", "alert-danger", "alert-warning", "alert-info");
    toast.classList.add(`alert-${variant}`);
    toast.textContent = message;
    window.setTimeout(() => toast.classList.add("d-none"), 2200);
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
      del: qs('[data-md-action="delete"]'),
      save: qs('[data-md-action="save"]'),
      cancel: qs('[data-md-action="cancel"]'),
      prev: qs('[data-md-action="prev"]'),
      next: qs('[data-md-action="next"]'),
    };
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
    const hasBusinessKeys = keys.some((k) => k.includes("document") || k === "description" || k === "remarks" || k.includes("class"));
    return hasMetaKeys && !hasBusinessKeys;
  }

  function extractRow(payload) {
    if (!payload) return null;
    if (Array.isArray(payload)) return payload[0] || null;
    if (typeof payload === "object" && payload !== null) {
      const datasetArrays = [];
      for (const [k, v] of Object.entries(payload)) {
        if (!Array.isArray(v) || !v.length) continue;
        const nk = normKey(k);
        const weight = nk === "details" || nk === "detail" ? 10 : nk.startsWith("details") ? 1 : 5;
        datasetArrays.push({ key: k, value: v, weight });
      }
      datasetArrays.sort((a, b) => a.weight - b.weight);
      for (const ds of datasetArrays) {
        const firstBusiness = ds.value.find((r) => r && typeof r === "object" && !isMetaOnlyObject(r));
        if (firstBusiness) return firstBusiness;
      }

      const details = payload.Details || payload.details;
      if (Array.isArray(details)) {
        const firstBusiness = details.find((r) => r && typeof r === "object" && !isMetaOnlyObject(r));
        return firstBusiness || null;
      }
      if (details && typeof details === "object" && !Array.isArray(details)) {
        return isMetaOnlyObject(details) ? null : details;
      }
      return isMetaOnlyObject(payload) ? null : payload;
    }
    return null;
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

  function clearFormAll() {
    const form = qs("#md-form");
    if (!form) return;
    qsa("input, select, textarea", form).forEach((el) => {
      if (el.tagName === "SELECT") {
        el.value = "";
        return;
      }
      el.value = "";
    });
    state.hasLoaded = false;
  }

  function applyDataToForm(data) {
    if (!data || typeof data !== "object") return;

    const id = pickValue(data, ["DocumentID", "DocumentId", "DocumentId"], ["documentid"]);
    const description = pickValue(data, ["Description"], ["description"]);
    const remarks = pickValue(data, ["Remarks"], ["remarks"]);
    const docClass = pickValue(data, ["DocumentClass", "Class"], ["documentclass", "class"]);

    const createdBy = pickValue(data, ["CreatedBy"], ["createdby"]);
    const createdOn = pickValue(data, ["CreatedOn", "CreatedDate"], ["createdon", "createddate"]);
    const modifiedBy = pickValue(data, ["ModifiedBy"], ["modifiedby"]);
    const modifiedOn = pickValue(data, ["ModifiedOn", "ModifiedDate"], ["modifiedon", "modifieddate"]);
    const supervisedBy = pickValue(data, ["SupervisedBy"], ["supervisedby"]);
    const supervisedOn = pickValue(data, ["SupervisedOn"], ["supervisedon"]);

    if (id != null) qs("#DocumentId") && (qs("#DocumentId").value = String(id));
    if (description != null) qs("#Description") && (qs("#Description").value = String(description));
    if (remarks != null) qs("#Remarks") && (qs("#Remarks").value = String(remarks));
    if (docClass != null) qs("#DocumentClass") && (qs("#DocumentClass").value = String(docClass));

    if (createdBy != null) qs("#CreatedBy") && (qs("#CreatedBy").value = String(createdBy));
    if (createdOn != null) qs("#CreatedOn") && (qs("#CreatedOn").value = String(createdOn));
    if (modifiedBy != null) qs("#ModifiedBy") && (qs("#ModifiedBy").value = String(modifiedBy));
    if (modifiedOn != null) qs("#ModifiedOn") && (qs("#ModifiedOn").value = String(modifiedOn));
    if (supervisedBy != null) qs("#SupervisedBy") && (qs("#SupervisedBy").value = String(supervisedBy));
    if (supervisedOn != null) qs("#SupervisedOn") && (qs("#SupervisedOn").value = String(supervisedOn));
  }

  async function ensureServicesLoaded() {
    if (!window.ServiceLoader) throw new Error("ServiceLoader missing");
    await window.ServiceLoader.loadCore();
    await window.ServiceLoader.loadSystemUtilitiesService();
    if (!window.SystemUtilitiesService?.getDocuments) {
      throw new Error("SystemUtilitiesService.getDocuments is not available");
    }
  }

  function setMode(nextMode, { initial = false } = {}) {
    state.mode = nextMode;

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#md-form");
    if (!form) return;

    const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        return;
      }
      // BTS fields always read-only.
      if (["CreatedBy", "CreatedOn", "ModifiedBy", "ModifiedOn", "SupervisedBy", "SupervisedOn"].includes(el.id)) {
        el.disabled = true;
        return;
      }
      el.disabled = !isEditable;
    });

    qsa("button[data-always-enabled]", form).forEach((b) => (b.disabled = false));

    const { view, add, edit, del, save, cancel, prev, next } = getActionButtons();
    setButtonDisabled(view, false);

    if (initial) {
      setButtonDisabled(add, true);
      setButtonDisabled(edit, true);
      setButtonDisabled(del, true);
      setButtonDisabled(save, true);
      setButtonDisabled(cancel, true);
      setButtonDisabled(prev, true);
      setButtonDisabled(next, true);
      return;
    }

    // Only wire GET for now (until Add/Edit/Delete contracts are provided).
    setButtonDisabled(add, true);
    setButtonDisabled(edit, true);
    setButtonDisabled(save, true);
    setButtonDisabled(del, true);
    setButtonDisabled(cancel, !state.hasLoaded);

    // Navigation works once a record is loaded.
    setButtonDisabled(prev, !state.hasLoaded);
    setButtonDisabled(next, !state.hasLoaded);
  }

  function bindModeButtons() {
    qsa("[data-shell-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.getAttribute("data-shell-mode");
        if (!next || !MODES[next.toUpperCase()]) return;
        setMode(MODES[next.toUpperCase()]);
      });
    });
  }

  async function handleViewOrSearch(direction = 0, options = {}) {
    const quiet = !!options.quiet;
    const documentId = qs("#DocumentId")?.value?.trim() || "";
    if (!documentId) {
      if (!quiet) setToast("Enter Document ID.", "warning");
      return;
    }

    const requestData = {
      BankID: getBankId(),
      OurBranchID: getBranchId(),
      DocumentID: documentId,
      Direction: direction,
      OperatorID: getOperatorId(),
    };

    console.groupCollapsed("[MaintainDocuments] dbo.p_GetDocuments");
    console.info("RequestData", requestData);

    try {
      await ensureServicesLoaded();
      const result = await window.SystemUtilitiesService.getDocuments(requestData);
      console.info("Raw result", result);

      if (!result?.success) {
        state.hasLoaded = false;
        setMode(MODES.VIEW);
        if (!quiet) setToast(result?.message || "Record doesn't exist.", "warning");
        console.groupEnd();
        return;
      }

      const row = extractRow(result.data);
      if (!row || typeof row !== "object") {
        state.hasLoaded = false;
        setMode(MODES.VIEW);
        if (!quiet) setToast("Record doesn't exist.", "warning");
        console.groupEnd();
        return;
      }

      applyDataToForm(row);
      state.hasLoaded = true;
      setMode(MODES.VIEW);
      if (!quiet) setToast("Loaded.", "success");
      console.groupEnd();
    } catch (e) {
      console.error(e);
      state.hasLoaded = false;
      setMode(MODES.VIEW);
      if (!quiet) setToast(e?.message || "Failed to load documents.", "danger");
      console.groupEnd();
    }
  }

  function bindActions() {
    qs('[data-md-action="search-id"]')?.addEventListener("click", () => void handleViewOrSearch(0));
    qs('[data-shell-mode="View"]')?.addEventListener("click", () => void handleViewOrSearch(0));

    qs('[data-md-action="prev"]')?.addEventListener("click", () => void handleViewOrSearch(-1));
    qs('[data-md-action="next"]')?.addEventListener("click", () => void handleViewOrSearch(1));

    qs('[data-md-action="cancel"]')?.addEventListener("click", () => {
      clearFormAll();
      setMode(MODES.VIEW, { initial: true });
      setToast("Cleared.", "info");
    });

    // Save/Delete will be enabled once backend contracts are provided.
    qs('[data-md-action="save"]')?.addEventListener("click", () => setToast("Save not available yet.", "warning"));
    qs('[data-md-action="delete"]')?.addEventListener("click", () => setToast("Delete not available yet.", "warning"));
  }

  window.addEventListener("load", async () => {
    bindModeButtons();
    bindActions();
    state.hasLoaded = false;
    setMode(MODES.VIEW, { initial: true });

    // Best-effort preload.
    try {
      await ensureServicesLoaded();
    } catch (e) {
      console.warn(e);
    }
  });
})();
