(() => {
  if (window.__kairoThirdPartyServiceProvidersLoaded) return;
  window.__kairoThirdPartyServiceProvidersLoaded = true;

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
  };

  let inlineAlertAutoHideTimer = null;

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

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatMDYHMS(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  }

  function normKey(s) {
    return String(s ?? "")
      .trim()
      .toLowerCase()
      .replace(/[_\-\s]+/g, "");
  }

  function coerceBool(v) {
    if (v === true) return true;
    if (v === false) return false;
    const s = String(v ?? "").trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes" || s === "y";
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

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function initSectionToggles() {
    const headers = qsa("[data-section-toggle]");

    function setCollapsed(section, collapsed) {
      if (!section) return;
      const content = qs("[data-section-content]", section);
      if (!content) return;

      if (collapsed) content.setAttribute("hidden", "");
      else content.removeAttribute("hidden");

      const header = qs("[data-section-toggle]", section);
      const toggleBtn = header ? qs(".section-toggle-btn", header) : null;
      if (toggleBtn) toggleBtn.setAttribute("aria-expanded", String(!collapsed));

      const icon = toggleBtn ? qs("i.bi", toggleBtn) : null;
      if (icon) {
        icon.classList.toggle("bi-chevron-up", !collapsed);
        icon.classList.toggle("bi-chevron-down", collapsed);
      }
    }

    headers.forEach((header) => {
      if (header.dataset.kairoSectionToggleBound === "1") return;
      header.dataset.kairoSectionToggleBound = "1";

      const section = header.closest(".form-section");
      if (!section) return;

      // Normalize initial chevron state based on content visibility.
      const content = qs("[data-section-content]", section);
      setCollapsed(section, !!content?.hasAttribute("hidden"));

      const toggle = (e) => {
        e?.preventDefault?.();
        const isCollapsed = !!qs("[data-section-content]", section)?.hasAttribute("hidden");
        setCollapsed(section, !isCollapsed);
      };

      header.addEventListener("click", toggle);

      const toggleBtn = qs(".section-toggle-btn", header);
      if (toggleBtn) {
        toggleBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          toggle(e);
        });
      }
    });
  }

  function getActionButtons() {
    return {
      view: qs('[data-shell-mode="View"]'),
      add: qs('[data-shell-mode="Add"]'),
      edit: qs('[data-shell-mode="Update"]'),
      del: qs('[data-tpsp-action="delete"]'),
      save: qs('[data-tpsp-action="save"]'),
      cancel: qs('[data-tpsp-action="cancel"]'),
      search: qs('[data-tpsp-action="search"]'),
    };
  }

  function clearFormAll() {
    const form = qs("#third-party-service-providers-form");
    if (!form) return;
    qsa("input, select, textarea", form).forEach((el) => {
      if (el.type === "checkbox") {
        el.checked = false;
        return;
      }
      el.value = "";
    });
    state.hasLoaded = false;
    state.canAddFromId = false;
    state.lastLoadedRow = null;
    state.updateCount = 0;
  }

  function clearFormForAdd() {
    const form = qs("#third-party-service-providers-form");
    if (!form) return;
    const keepId = qs("#ServiceProvider")?.value || "";
    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        if (el.id === "ServiceProvider" || el.name === "ServiceProvider") el.value = keepId;
        return;
      }
      if (el.type === "checkbox") {
        el.checked = false;
        return;
      }
      el.value = "";
    });
    state.hasLoaded = false;
    state.canAddFromId = !!keepId;
    state.updateCount = 0;
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

  function isMetaOnlyObject(obj) {
    if (!obj || typeof obj !== "object") return false;
    const keys = Object.keys(obj).map(normKey);
    const hasMetaKeys = keys.some((k) => k === "eventid" || k === "updatecount" || k === "newdata" || k === "operatorid");
    const hasBusinessKeys = keys.some((k) => k.includes("provider") || k.includes("service") || k.includes("account") || k.includes("currency"));
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
      datasetArrays.sort((a, b) => b.weight - a.weight);
      for (const ds of datasetArrays) {
        const firstBusiness = ds.value.find((r) => r && typeof r === "object" && !isMetaOnlyObject(r));
        if (firstBusiness) return firstBusiness;
      }
      return null;
    }
    return null;
  }

  function applyDataToForm(row) {
    if (!row || typeof row !== "object") return;

    const id = pickValue(row, ["ServiceProvider", "ID", "SystemSubID"], ["serviceprovider", "systemsubid", "provider", "id"]);
    const description = pickValue(row, ["Description"], ["description"]);
    const accountId = pickValue(row, ["AccountId", "AccountID", "GLAccountID"], ["accountid", "glaccountid"]);
    const accountName = pickValue(row, ["AccountName"], ["accountname"]);
    const webService = pickValue(row, ["WebService", "WebServiceURL"], ["webservice"]);
    const isLiveValidation = pickValue(row, ["IsLiveValidation"], ["islivevalidation"]);
    const validationMethod = pickValue(row, ["ValidationMethod"], ["validationmethod"]);
    const postingMethod = pickValue(row, ["PostingMethod"], ["postingmethod"]);
    const isExport = pickValue(row, ["IsExport"], ["isexport"]);
    const exportFormat = pickValue(row, ["ExportFormat"], ["exportformat"]);
    const currencyId = pickValue(row, ["CurrencyId", "CurrencyID"], ["currencyid"]);
    const currencyName = pickValue(row, ["CurrencyName"], ["currencyname"]);
    const updateCount = pickValue(row, ["UpdateCount"], ["updatecount"]);

    const createdBy = pickValue(row, ["CreatedBy"], ["createdby"]);
    const createdOn = pickValue(row, ["CreatedOn"], ["createdon"]);
    const supervisedBy = pickValue(row, ["SupervisedBy"], ["supervisedby"]);
    const supervisedOn = pickValue(row, ["SupervisedOn"], ["supervisedon"]);

    if (id != null) qs("#ServiceProvider") && (qs("#ServiceProvider").value = String(id));
    if (description != null) qs("#Description") && (qs("#Description").value = String(description));
    if (accountId != null) qs("#AccountId") && (qs("#AccountId").value = String(accountId));
    if (accountName != null) qs("#AccountName") && (qs("#AccountName").value = String(accountName));
    if (webService != null) qs("#WebService") && (qs("#WebService").value = String(webService));
    if (isLiveValidation != null) qs("#IsLiveValidation") && (qs("#IsLiveValidation").checked = coerceBool(isLiveValidation));
    if (validationMethod != null) qs("#ValidationMethod") && (qs("#ValidationMethod").value = String(validationMethod));
    if (postingMethod != null) qs("#PostingMethod") && (qs("#PostingMethod").value = String(postingMethod));
    if (isExport != null) qs("#IsExport") && (qs("#IsExport").checked = coerceBool(isExport));
    if (exportFormat != null) qs("#ExportFormat") && (qs("#ExportFormat").value = String(exportFormat));
    if (currencyId != null) qs("#CurrencyId") && (qs("#CurrencyId").value = String(currencyId));
    if (currencyName != null) qs("#CurrencyName") && (qs("#CurrencyName").value = String(currencyName));

    if (createdBy != null) qs("#CreatedBy") && (qs("#CreatedBy").value = String(createdBy));
    if (createdOn != null) qs("#CreatedOn") && (qs("#CreatedOn").value = String(createdOn));
    if (supervisedBy != null) qs("#SupervisedBy") && (qs("#SupervisedBy").value = String(supervisedBy));
    if (supervisedOn != null) qs("#SupervisedOn") && (qs("#SupervisedOn").value = String(supervisedOn));

    // Store UpdateCount for optimistic concurrency
    state.updateCount = updateCount != null ? Number(updateCount) : 0;

    state.lastLoadedRow = { ...row };
  }

  async function ensureServicesLoaded() {
    if (!window.ServiceLoader) throw new Error("ServiceLoader missing");
    await window.ServiceLoader.loadCore();
    await window.ServiceLoader.loadStaticDataService();
    if (!window.StaticDataService?.getThirdPartyProvider) throw new Error("StaticDataService.getThirdPartyProvider is not available");
    if (!window.StaticDataService?.addEditThirdPartyProvider) throw new Error("StaticDataService.addEditThirdPartyProvider is not available");
    if (!window.StaticDataService?.deleteThirdPartyProvider) throw new Error("StaticDataService.deleteThirdPartyProvider is not available");
  }

  function setMode(nextMode, { initial = false } = {}) {
    state.mode = nextMode;

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#third-party-service-providers-form");
    if (!form) return;

    const fields = qsa("input, select, textarea", form);
    const isFormEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

    for (const el of fields) {
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        continue;
      }
      el.disabled = !isFormEditable;
    }

    qsa("button[data-always-enabled]", form).forEach((b) => (b.disabled = false));

    const { view, add, edit, del, save, cancel } = getActionButtons();
    setButtonDisabled(view, true);
    setButtonDisabled(add, true);
    setButtonDisabled(edit, true);
    setButtonDisabled(del, true);
    setButtonDisabled(save, true);
    setButtonDisabled(cancel, true);

    // Account ID search button - only available in ADD mode
    const accountSearchBtn = qs('[data-tpsp-action="search-account"]');
    setButtonDisabled(accountSearchBtn, nextMode !== MODES.ADD);

    // Currency ID search button - only available in ADD mode
    const currencySearchBtn = qs('[data-tpsp-action="search-currency"]');
    setButtonDisabled(currencySearchBtn, nextMode !== MODES.ADD);

    if (initial) {
      setButtonDisabled(view, false);
      return;
    }

    if (nextMode === MODES.VIEW) {
      const canCancelInView = state.hasLoaded || state.canAddFromId;
      setButtonDisabled(cancel, !canCancelInView);
      setButtonDisabled(add, !state.canAddFromId);
      setButtonDisabled(edit, !state.hasLoaded);
      setButtonDisabled(del, !state.hasLoaded);
      return;
    }

    if (nextMode === MODES.ADD || nextMode === MODES.UPDATE) {
      setButtonDisabled(save, false);
      setButtonDisabled(cancel, false);
      setButtonDisabled(del, !(state.hasLoaded && nextMode === MODES.UPDATE));
    }
  }

  async function handleSearchOrView(options = {}) {
    const quiet = !!options.quiet;
    const id = qs("#ServiceProvider")?.value?.trim() || "";
    if (!id) {
      if (!quiet) setToast("Enter Service Provider ID.", "warning");
      return;
    }

    try {
      await ensureServicesLoaded();
      const result = await window.StaticDataService.getThirdPartyProvider({
        ID: id,
        OurBranchID: getBranchId(),
        OperatorID: getOperatorId()
      });

      if (!result?.success) {
        state.hasLoaded = false;
        state.canAddFromId = true;
        clearFormForAdd();
        setMode(MODES.VIEW);
        if (!quiet) setToast("Record doesn't exist.", "warning");
        return;
      }

      const row = extractRow(result.data);
      if (!row) {
        state.hasLoaded = false;
        state.canAddFromId = true;
        clearFormForAdd();
        setMode(MODES.VIEW);
        if (!quiet) setToast("Record doesn't exist.", "warning");
        return;
      }

      applyDataToForm(row);
      state.hasLoaded = true;
      state.canAddFromId = false;
      setMode(MODES.VIEW);
      if (!quiet) setToast("Loaded.", "success");
    } catch (e) {
      console.error(e);
      if (!quiet) setToast(e?.message || "Failed to load.", "danger");
    }
  }

  async function handleSave() {
    if (state.mode === MODES.VIEW) return;

    const form = qs("#third-party-service-providers-form");
    if (form && typeof form.reportValidity === "function") {
      if (!form.reportValidity()) {
        setToast("Please fill the required fields.", "warning");
        return;
      }
    }

    const id = qs("#ServiceProvider")?.value?.trim() || "";
    if (!id) {
      setToast("Enter Service Provider ID.", "warning");
      return;
    }

    const now = new Date();
    const operatorId = getOperatorId();
    const isAdd = state.mode === MODES.ADD;

    // Build request matching the stored procedure signature exactly
    const requestData = {
      ID: id,
      Description: qs("#Description")?.value?.trim() || "",
      GLAccountID: qs("#AccountId")?.value?.trim() || "",
      WebService: qs("#WebService")?.value?.trim() || "",
      IsLiveValidation: qs("#IsLiveValidation")?.checked ? 1 : 0,
      ValidationMethod: qs("#ValidationMethod")?.value?.trim() || "",
      PostingMethod: qs("#PostingMethod")?.value?.trim() || "",
      IsExport: qs("#IsExport")?.checked ? 1 : 0,
      ExportFormat: qs("#ExportFormat")?.value?.trim() || "",
      CurrencyID: qs("#CurrencyId")?.value?.trim() || "",
      CreatedBy: isAdd ? operatorId : "",
      CreatedOn: isAdd ? formatMDYHMS(now) : "",
      ModifiedBy: operatorId,
      ModifiedOn: "",
      SupervisedBy: "",
      SupervisedOn: "",
      NewRecord: isAdd ? 1 : 2,
    };

    try {
      setToast("Saving...", "info");
      await ensureServicesLoaded();
      const result = await window.StaticDataService.addEditThirdPartyProvider(requestData);

      if (!result?.success) {
        setToast(result?.message || "Save failed.", "danger");
        return;
      }

      setToast("Saved.", "success");
      clearFormAll();
      setMode(MODES.VIEW, { initial: true });
    } catch (e) {
      console.error(e);
      setToast(e?.message || "Save failed.", "danger");
    }
  }

  async function handleDelete() {
    if (!state.hasLoaded) {
      setToast("Load a record before deleting.", "warning");
      return;
    }

    const id = qs("#ServiceProvider")?.value?.trim() || "";
    if (!id) return;

    const confirmed = await (window.Swal ?
      window.Swal.fire({
        title: 'Are you sure?',
        text: `Delete Service Provider '${id}'?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'No, keep it'
      }).then(res => res.isConfirmed) :
      window.confirm(`Delete Service Provider '${id}'?`));

    if (!confirmed) return;

    try {
      setToast("Deleting...", "info");
      await ensureServicesLoaded();
      const result = await window.StaticDataService.deleteThirdPartyProvider({
        ID: id,
        NewRecord: 0
      });

      if (!result?.success) {
        setToast(result?.message || "Delete failed.", "danger");
        return;
      }

      setToast("Deleted.", "success");
      clearFormAll();
      setMode(MODES.VIEW, { initial: true });
    } catch (e) {
      console.error(e);
      setToast(e?.message || "Delete failed.", "danger");
    }
  }

  function bindCurrencyIdSearch() {
    // Find the Currency ID search button by data attribute
    const currencyIdSearchBtn = qs('[data-tpsp-action="search-currency"]');
    
    if (currencyIdSearchBtn) {
      currencyIdSearchBtn.addEventListener('click', async () => {
        if (!window.CurrencySearchService) {
          setToast('Currency Search Service not available.', 'danger');
          return;
        }
        
        try {
          await window.CurrencySearchService.openSearchModal(
            (currencyId, currencyName) => {
              const curIdInput = qs('#CurrencyId');
              const curNameInput = qs('#CurrencyName');
              if (curIdInput) curIdInput.value = currencyId || '';
              if (curNameInput) curNameInput.value = currencyName || '';
            }
          );
        } catch (err) {
          console.error('[TPSP] Currency Search error:', err);
          setToast(err?.message || 'Failed to open Currency search.', 'danger');
        }
      });
    }
  }

  function bindAccountIdSearch() {
    // Find the Account ID search button by data attribute
    const accountIdSearchBtn = qs('[data-tpsp-action="search-account"]');
    
    if (accountIdSearchBtn) {
      accountIdSearchBtn.addEventListener('click', async () => {
        if (!window.GLAccountSearchService) {
          setToast('GL Account Search Service not available.', 'danger');
          return;
        }
        
        try {
          await window.GLAccountSearchService.openSearchModal(
            (accountId, accountName) => {
              const accIdInput = qs('#AccountId');
              const accNameInput = qs('#AccountName');
              if (accIdInput) accIdInput.value = accountId || '';
              if (accNameInput) accNameInput.value = accountName || '';
            },
            { accountTag: 'default' }
          );
        } catch (err) {
          console.error('[TPSP] GL Account Search error:', err);
          setToast(err?.message || 'Failed to open GL Account search.', 'danger');
        }
      });
    }
  }

  function bindActions() {
    const { search, view, cancel, save, del } = getActionButtons();

    search?.addEventListener("click", () => void handleSearchOrView());
    view?.addEventListener("click", () => void handleSearchOrView());
    
    // Bind Account ID GL search
    bindAccountIdSearch();
    
    // Bind Currency ID search
    bindCurrencyIdSearch();

    cancel?.addEventListener("click", () => {
      clearFormAll();
      setMode(MODES.VIEW, { initial: true });
      setToast("Cleared.", "info");
    });

    save?.addEventListener("click", () => void handleSave());
    del?.addEventListener("click", () => void handleDelete());

    qsa("[data-shell-mode]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const next = btn.getAttribute("data-shell-mode");
        if (!next || next === "View") return;

        const nextMode = MODES[next.toUpperCase()];
        if (nextMode === MODES.ADD) {
          if (!qs("#ServiceProvider")?.value?.trim()) {
            setToast("Enter Service Provider ID first.", "warning");
            return;
          }
          if (!state.canAddFromId) {
            setToast("Establish the record doesn't exist (Search) before adding.", "warning");
            return;
          }
          clearFormForAdd();
          setMode(MODES.ADD);
          setToast("Add mode.", "info");
        } else if (nextMode === MODES.UPDATE) {
          if (!state.hasLoaded) {
            setToast("Search/Load a record first.", "warning");
            return;
          }
          setMode(MODES.UPDATE);
          setToast("Edit mode.", "info");
        }
      });
    });
  }

  window.addEventListener("load", async () => {
    initSectionToggles();
    bindActions();
    setMode(MODES.VIEW, { initial: true });
    try { await ensureServicesLoaded(); } catch (e) { console.warn(e); }
  });
})();
