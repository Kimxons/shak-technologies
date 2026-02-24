(() => {
  if (window.__kairoInsurancePolicyPageLoaded) return;
  window.__kairoInsurancePolicyPageLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  const state = {
    mode: MODES.VIEW,
    hasLoadedPolicy: false,
    canAddFromCurrentPolicyNo: false,
  };

  let inlineAlertAutoHideTimer = null;

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
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

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function getOperatorId() {
    try {
      const session = window.AuthService?.getSession?.();
      return session?.operatorId || session?.operatorID || session?.name || "web_portal";
    } catch {
      return "web_portal";
    }
  }

  function formatMDY(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}/${date.getFullYear()}`;
  }

  function formatMDYHMS(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    return `${formatMDY(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  }

  function isoToMDY(isoDateString) {
    const iso = String(isoDateString || "").trim();
    if (!iso) return "";
    // Accept YYYY-MM-DD or any parseable string.
    const parts = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (parts) {
      return `${parts[2]}/${parts[3]}/${parts[1]}`;
    }
    const dt = new Date(iso);
    if (!Number.isNaN(dt.getTime())) return formatMDY(dt);
    return iso;
  }

  function clearPolicyFormForAdd() {
    const form = qs("#insurance-policy-form");
    if (!form) return;
    const keepPolicyNo = qs("#PolicyNo")?.value || "";
    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        // Keep PolicyNo (and the search button) enabled. Preserve entered PolicyNo for Add.
        if (el.id === "PolicyNo" || el.name === "PolicyNo") el.value = keepPolicyNo;
        return;
      }

      if (el.type === "checkbox") {
        el.checked = false;
        return;
      }

      if (el.tagName === "SELECT") {
        el.value = "";
        return;
      }

      el.value = "";
    });

    state.hasLoadedPolicy = false;
    // Still allow Add for the entered PolicyNo.
    state.canAddFromCurrentPolicyNo = !!keepPolicyNo;
  }

  function clearPolicyFormAll() {
    const form = qs("#insurance-policy-form");
    if (!form) return;

    qsa("input, select, textarea", form).forEach((el) => {
      if (el.type === "checkbox") {
        el.checked = false;
        return;
      }

      if (el.tagName === "SELECT") {
        el.value = "";
        return;
      }

      el.value = "";
    });

    state.hasLoadedPolicy = false;
    state.canAddFromCurrentPolicyNo = false;
  }

  function buildAddEditRequestData() {
    const now = new Date();
    const policyNo = qs("#PolicyNo")?.value?.trim() || "";
    const policyDateIso = qs("#PolicyDate")?.value || "";

    const requestData = {
      PolicyNo: policyNo,
      PolicyDate: isoToMDY(policyDateIso),
      InsuranceCode: qs("#InsuranceCode")?.value?.trim() || "",
      Description: qs("#InsuranceCodeDesc")?.value?.trim() || "",
      CompanyID: qs("#InsuranceCompanyId")?.value?.trim() || "",
      CompanyName: qs("#InsuranceCompanyName")?.value?.trim() || "",
      Address: qs("#Address")?.value?.trim() || "",
      CityID: qs("#City")?.value?.trim() || "",
      Phone: qs("#Phone")?.value?.trim() || "",
      CountryID: qs("#Country")?.value?.trim() || "",
      CountryName: qs("#CountryName")?.value?.trim() || "",
      AgentName: qs("#AgentName")?.value?.trim() || "",
      Status: qs("#IsActive")?.checked ? 1 : 0,
      CreatedBy: qs("#CreatedBy")?.value?.trim() || getOperatorId(),
      CreatedOn: qs("#CreatedOn")?.value?.trim() || formatMDYHMS(now),
      ModifiedBy: getOperatorId(),
      ModifiedOn: formatMDYHMS(now),
      NewRecord: state.mode === MODES.ADD ? 1 : 0,
    };

    // In update mode, preserve existing CreatedOn if backend returned it.
    if (state.mode === MODES.UPDATE) {
      requestData.CreatedBy = qs("#CreatedBy")?.value?.trim() || requestData.CreatedBy;
      requestData.CreatedOn = qs("#CreatedOn")?.value?.trim() || requestData.CreatedOn;
    }

    return requestData;
  }

  function toISODate(value) {
    if (!value) return "";
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
    }

    const raw = String(value).trim();
    if (!raw) return "";

    // Already ISO-ish
    const iso = raw.match(/^\d{4}-\d{2}-\d{2}/);
    if (iso) return iso[0];

    // 01/19/2026 or 19/01/2026
    const slashed = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashed) {
      const a = Number(slashed[1]);
      const b = Number(slashed[2]);
      const year = Number(slashed[3]);
      // If first part > 12 it's definitely DD/MM; otherwise assume MM/DD (matches your RequestTime sample).
      const month = a > 12 ? b : a;
      const day = a > 12 ? a : b;
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }

    // 19-Jan-2026 / 01-Jan-2026
    const named = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (named) {
      const day = Number(named[1]);
      const mon = named[2].toLowerCase();
      const year = Number(named[3]);
      const map = {
        jan: 1,
        feb: 2,
        mar: 3,
        apr: 4,
        may: 5,
        jun: 6,
        jul: 7,
        aug: 8,
        sep: 9,
        oct: 10,
        nov: 11,
        dec: 12,
      };
      const month = map[mon];
      if (month) return `${year}-${pad2(month)}-${pad2(day)}`;
    }

    // Last resort: let Date try
    const dt = new Date(raw);
    if (!Number.isNaN(dt.getTime())) {
      return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
    }

    return "";
  }

  function coerceBool(value) {
    if (typeof value === "boolean") return value;
    const s = String(value ?? "").trim().toLowerCase();
    return s === "1" || s === "true" || s === "y" || s === "yes" || s === "active";
  }

  function setSelectValue(selectEl, value) {
    if (!selectEl) return;
    const v = value == null ? "" : String(value);
    console.log(`Setting ${selectEl.id} to value:`, v);
    const options = Array.from(selectEl.options);
    console.log(`Current options for ${selectEl.id}:`, options.map(o => ({ value: o.value, text: o.text })));
    const has = options.some((o) => o.value === v);
    console.log(`Has option with value ${v}:`, has);
    if (!has && v) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      selectEl.appendChild(opt);
      console.log(`Added option for ${selectEl.id}:`, v);
    }
    selectEl.value = v;
    console.log(`Set ${selectEl.id}.value to:`, selectEl.value);
  }

  function applyPolicyDataToForm(data) {
    if (!data || typeof data !== "object") return;

    console.log('[InsurancePolicy] Applying data to form:', data);
    console.log('[InsurancePolicy] Available keys:', Object.keys(data));

    // Prefer keys that match element IDs.
    for (const [key, value] of Object.entries(data)) {
      let el = document.getElementById(key);
      if (!el) {
        // Handle API key -> HTML field ID mappings
        if (key === "CityID") el = document.getElementById("City");
        else if (key === "CountryID") el = document.getElementById("Country");
        else if (key === "Description") el = document.getElementById("InsuranceCodeDesc");
        else if (key === "CompanyID") el = document.getElementById("InsuranceCompanyId");
        else if (key === "CompanyName") el = document.getElementById("InsuranceCompanyName");
        else if (key === "InsuranceID") el = document.getElementById("InsuranceCompanyId");
        else if (key === "InsuranceName") el = document.getElementById("InsuranceCompanyName");
        // Date field mappings
        else if (key === "Date") el = document.getElementById("PolicyDate");
        else if (key === "EffectiveDate") el = document.getElementById("PolicyDate");
        else if (key === "StartDate") el = document.getElementById("PolicyDate");
        else if (key === "PolicyEffectiveDate") el = document.getElementById("PolicyDate");
      }
      if (!el) continue;

      console.log(`[InsurancePolicy] Setting ${el.id} (key: ${key}) to:`, value, '| el.type:', el.type);

      // Handle Flatpickr date inputs (app.js converts type="date" to hidden + altInput)
      if (el._flatpickr) {
        const isoVal = window.GlobalUtils?.parseDateInput ? window.GlobalUtils.parseDateInput(value) : toISODate(value);
        console.log(`[InsurancePolicy] Flatpickr field ${el.id} - setting date:`, isoVal);
        el._flatpickr.setDate(isoVal, true); // true = trigger change event
        continue;
      }

      if (el.type === "date") {
        const isoVal = window.GlobalUtils?.parseDateInput ? window.GlobalUtils.parseDateInput(value) : toISODate(value);
        console.log(`[InsurancePolicy] Date field - converting ${value} to ISO:`, isoVal);
        el.value = isoVal;
        console.log(`[InsurancePolicy] Date field ${el.id} value after set:`, el.value);
        continue;
      }

      if (el.type === "checkbox") {
        el.checked = coerceBool(value);
        continue;
      }

      if (el.tagName === "SELECT") {
        setSelectValue(el, value);
        continue;
      }

      el.value = value == null ? "" : String(value);
    }
    
      // Populate audit fields in 'behind the scene' section
      const auditFields = [
        { id: "CreatedBy", key: "CreatedBy" },
        { id: "CreatedOn", key: "CreatedOn" },
        { id: "ModifiedBy", key: "ModifiedBy" },
        { id: "ModifiedOn", key: "ModifiedOn" },
        { id: "SupervisedBy", key: "SupervisedBy" },
        { id: "SupervisedOn", key: "SupervisedOn" }
      ];
      auditFields.forEach(({ id, key }) => {
        const el = document.getElementById(id);
        if (el) {
          el.textContent = data[key] != null ? String(data[key]) : "";
        }
      });
  }

  function setActionButtonsEnabled(nextMode, { initial = false } = {}) {
    const viewBtn = qs('[data-shell-mode="View"]');
    const addBtn = qs('[data-shell-mode="Add"]');
    const updateBtn = qs('[data-shell-mode="Update"]');
    const saveBtn = qs('[data-insurance-policy-action="save"]');
    const cancelBtn = qs('[data-insurance-policy-action="cancel"]');
    const deleteBtn = qs('[data-insurance-policy-action="delete"]');

    const all = [viewBtn, addBtn, updateBtn, saveBtn, cancelBtn, deleteBtn].filter(Boolean);
    for (const b of all) setButtonDisabled(b, true);

    if (initial) {
      if (viewBtn) setButtonDisabled(viewBtn, false);
      return;
    }

    if (nextMode === MODES.VIEW) {
      if (viewBtn) setButtonDisabled(viewBtn, false);
      // Add button only enabled when searched record doesn't exist (canAddFromCurrentPolicyNo)
      if (addBtn) setButtonDisabled(addBtn, !state.canAddFromCurrentPolicyNo || state.hasLoadedPolicy);
      // Edit enabled after a record is loaded
      if (updateBtn) setButtonDisabled(updateBtn, !state.hasLoadedPolicy);
      // Cancel clears all fields - enabled after a record is loaded or not found
      if (cancelBtn) setButtonDisabled(cancelBtn, !state.hasLoadedPolicy && !state.canAddFromCurrentPolicyNo);
      // Delete enabled after a record is loaded in VIEW mode
      if (deleteBtn) setButtonDisabled(deleteBtn, !state.hasLoadedPolicy);
      return;
    }

    if (nextMode === MODES.ADD || nextMode === MODES.UPDATE) {
      if (saveBtn) setButtonDisabled(saveBtn, false);
      if (cancelBtn) setButtonDisabled(cancelBtn, false);
      // Delete disabled in ADD/UPDATE modes
      if (deleteBtn) setButtonDisabled(deleteBtn, true);
    }
  }

  function setMode(nextMode, { initial = false } = {}) {
    state.mode = nextMode;

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#insurance-policy-form");
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

    setActionButtonsEnabled(nextMode, { initial });

    if (!initial && nextMode === MODES.ADD) {
      clearPolicyFormForAdd();
    }
  }

  async function loadPolicyFromService({ intentLabel }) {
    const policyNo = qs("#PolicyNo")?.value?.trim();
    if (!policyNo) {
      setToast("Enter Policy No.", "warning");
      return;
    }

    const svc = window.StaticDataService;
    if (!svc?.getInsurancePolicy) {
      setToast("StaticDataService not loaded.", "danger");
      return;
    }

    try {
      setToast(`${intentLabel} policy...`, "info");
      const result = await svc.getInsurancePolicy(policyNo);
      if (!result?.success) {
        setToast(result?.message || "Policy lookup failed.", "danger");
        return;
      }

      const payload = result.data;
      const row = Array.isArray(payload) ? payload[0] : payload;
      if (!row) {
        state.hasLoadedPolicy = false;
        state.canAddFromCurrentPolicyNo = true;
        setMode(MODES.VIEW);
        setToast("No policy found. Click Add to create.", "warning");
        return;
      }

      applyPolicyDataToForm(row);
      setToast("Policy loaded.", "success");
      state.hasLoadedPolicy = true;
      state.canAddFromCurrentPolicyNo = false;
      setMode(MODES.VIEW);
    } catch (error) {
      console.error("Policy lookup failed", error);
      setToast("Policy lookup failed.", "danger");
    }
  }

  function bindModeButtons() {
    const viewBtn = qs('[data-shell-mode="View"]');
    const addBtn = qs('[data-shell-mode="Add"]');
    const updateBtn = qs('[data-shell-mode="Update"]');

    viewBtn?.addEventListener("click", async () => {
      // View mode should load data from the service
      await loadPolicyFromService({ intentLabel: "Loading" });
    });

    addBtn?.addEventListener("click", () => {
      setMode(MODES.ADD);
    });

    updateBtn?.addEventListener("click", () => {
      if (!state.hasLoadedPolicy) {
        setToast("Load a policy first.", "warning");
        return;
      }
      setMode(MODES.UPDATE);
    });
  }

  function bindActions() {
    const searchBtn = qs('[data-insurance-policy-action="search"]');
    const saveBtn = qs('[data-insurance-policy-action="save"]');
    const cancelBtn = qs('[data-insurance-policy-action="cancel"]');
    const deleteBtn = qs('[data-insurance-policy-action="delete"]');

    searchBtn?.addEventListener("click", async () => {
      await loadPolicyFromService({ intentLabel: "Searching" });
    });

    saveBtn?.addEventListener("click", () => {
      if (state.mode === MODES.VIEW) {
        setToast("Switch to Add/Edit before saving.", "warning");
        return;
      }

      const form = qs("#insurance-policy-form");
      if (form && !form.checkValidity()) {
        form.reportValidity?.();
        setToast("Please fill the required fields.", "warning");
        return;
      }

      const svc = window.StaticDataService;
      if (!svc?.addEditInsurancePolicy) {
        setToast("StaticDataService not loaded.", "danger");
        return;
      }

      (async () => {
        try {
          setToast("Saving policy...", "info");
          const requestData = buildAddEditRequestData();
          const result = await svc.addEditInsurancePolicy(requestData);
          if (!result?.success) {
            setToast(result?.message || "Save failed.", "danger");
            return;
          }

          setToast("Insurance Policy saved.", "success");

          // Clear all fields except PolicyNo after successful save
          clearPolicyFormForAdd();
          state.hasLoadedPolicy = false;
          state.canAddFromCurrentPolicyNo = false;
          setMode(MODES.VIEW, { initial: true });
        } catch (error) {
          console.error("Save failed", error);
          setToast("Save failed.", "danger");
        }
      })();
    });

    cancelBtn?.addEventListener("click", () => {
      clearPolicyFormAll();
      setToast("Cleared.", "info");
      // Return to initial View state (only View enabled).
      setMode(MODES.VIEW, { initial: true });
    });

    deleteBtn?.addEventListener("click", async () => {
      // Allow delete from VIEW mode (after loading a record) or UPDATE mode
      if (state.mode !== MODES.VIEW && state.mode !== MODES.UPDATE) {
        setToast("Load a policy first before deleting.", "warning");
        return;
      }

      const policyNo = qs("#PolicyNo")?.value?.trim();
      if (!policyNo) {
        setToast("Enter Policy No to delete.", "warning");
        return;
      }

      if (!state.hasLoadedPolicy) {
        setToast("Load the policy first.", "warning");
        return;
      }

      const ok = window.confirm(`Delete Insurance Policy '${policyNo}'?`);
      if (!ok) return;

      const svc = window.StaticDataService;
      if (!svc?.deleteInsurancePolicy) {
        setToast("StaticDataService not loaded.", "danger");
        return;
      }

      try {
        setToast("Deleting policy...", "info");
        const result = await svc.deleteInsurancePolicy(policyNo);
        if (!result?.success) {
          setToast(result?.message || "Delete failed.", "danger");
          return;
        }

        setToast("Insurance Policy deleted.", "success");
        clearPolicyFormAll();
        // Return to initial View state (only View enabled).
        setMode(MODES.VIEW, { initial: true });
      } catch (error) {
        console.error("Delete failed", error);
        setToast("Delete failed.", "danger");
      }
    });
  }

  async function loadServices() {
    const { ServiceLoader } = window;
    if (!ServiceLoader) {
      console.warn("ServiceLoader not found; running Insurance Policy page without service bootstrapping.");
      return;
    }

    await ServiceLoader.loadCore();
    await ServiceLoader.loadStaticDataService();
  }

  // Populate City and Country dropdowns using LookupService
  async function populateDropdowns() {
    // Wait for LookupService to be available
    let tries = 0;
    while ((!window.LookupService) && tries < 10) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }

    if (!window.LookupService) {
      console.warn("LookupService not available for populateDropdowns.");
      return;
    }

    const citySelect = qs('#City');
    const countrySelect = qs('#Country');

    // Populate City
    if (citySelect) {
      try {
        const options = await window.LookupService.getCities();
        citySelect.innerHTML = '<option value="" selected>--Select--</option>' +
          options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');
      } catch (e) {
        console.warn('Failed to load cities', e);
      }
    }

    // Populate Country
    if (countrySelect) {
      try {
        const options = await window.LookupService.getCountries();
        countrySelect.innerHTML = '<option value="" selected>--Select--</option>' +
          options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');
      } catch (e) {
        console.warn('Failed to load countries', e);
      }
    }
  }

  /**
   * Bind Insurance Code Search button
   */
  function bindInsuranceCodeSearch() {
    const searchBtn = qs('[data-insurance-policy-action="search-insurance-code"]');
    if (!searchBtn) {
      console.warn('[InsurancePolicy] Insurance Code search button not found');
      return;
    }

    searchBtn.addEventListener('click', async () => {
      // Only allow search in ADD or UPDATE mode
      if (state.mode !== MODES.ADD && state.mode !== MODES.UPDATE) {
        setToast('Please click Add or Edit first before searching.', 'warning');
        return;
      }

      if (!window.InsuranceCodeSearchService?.openSearchModal) {
        setToast('InsuranceCodeSearchService not available.', 'danger');
        return;
      }

      try {
        await window.InsuranceCodeSearchService.openSearchModal((code, description) => {
          console.log('[InsurancePolicy] Insurance Code selected:', code, description);
          const codeInput = qs('#InsuranceCode');
          const descInput = qs('#InsuranceCodeDesc');

          if (codeInput) codeInput.value = code || '';
          if (descInput) descInput.value = description || '';

          setToast(`Insurance Code "${code}" selected.`, 'success');
        });
      } catch (error) {
        console.error('[InsurancePolicy] Insurance Code search error:', error);
        setToast('Failed to open insurance code search.', 'danger');
      }
    });

    console.log('[InsurancePolicy] Insurance Code search binding complete');
  }

  /**
   * Bind Insurance Company Search button
   */
  function bindInsuranceCompanySearch() {
    const searchBtn = qs('[data-insurance-policy-action="search-insurance-company"]');
    if (!searchBtn) {
      console.warn('[InsurancePolicy] Insurance Company search button not found');
      return;
    }

    searchBtn.addEventListener('click', async () => {
      // Only allow search in ADD or UPDATE mode
      if (state.mode !== MODES.ADD && state.mode !== MODES.UPDATE) {
        setToast('Please click Add or Edit first before searching.', 'warning');
        return;
      }

      if (!window.InsuranceSearchService?.openSearchModal) {
        setToast('InsuranceSearchService not available.', 'danger');
        return;
      }

      try {
        await window.InsuranceSearchService.openSearchModal((companyId, companyName, companyData) => {
          console.log('[InsurancePolicy] Insurance Company selected:', companyId, companyName);
          const idInput = qs('#InsuranceCompanyId');
          const nameInput = qs('#InsuranceCompanyName');

          if (idInput) idInput.value = companyId || '';
          if (nameInput) nameInput.value = companyName || '';

          setToast(`Insurance Company "${companyName}" selected.`, 'success');
        });
      } catch (error) {
        console.error('[InsurancePolicy] Insurance Company search error:', error);
        setToast('Failed to open insurance company search.', 'danger');
      }
    });

    console.log('[InsurancePolicy] Insurance Company search binding complete');

    // Auto-lookup company name when user manually types Company ID and tabs out
    const companyIdInput = qs('#InsuranceCompanyId');
    companyIdInput?.addEventListener('blur', async () => {
      const companyId = companyIdInput.value?.trim();
      if (!companyId) return;

      // Only lookup in ADD/UPDATE mode
      if (state.mode !== MODES.ADD && state.mode !== MODES.UPDATE) return;

      try {
        if (window.InsuranceSearchService?.searchInsuranceCompanies) {
          const response = await window.InsuranceSearchService.searchInsuranceCompanies({ companyId });
          const companies = response?.data || [];

          // Find exact match
          const match = companies.find(c =>
            (c.InsuranceID || c.CompanyID || c.ID || '').toString().toLowerCase() === companyId.toLowerCase()
          );

          if (match) {
            const nameInput = qs('#InsuranceCompanyName');
            const companyName = match.Name || match.InsuranceName || match.CompanyName ||
              match.Description || match.InsuranceDesc || match.InsuranceDescription || '';
            if (nameInput) nameInput.value = companyName;
            console.log('[InsurancePolicy] Auto-populated company name:', companyName);
          }
        }
      } catch (error) {
        console.warn('[InsurancePolicy] Failed to auto-lookup company name:', error);
      }
    });
  }

  window.addEventListener("load", async () => {
    initSectionToggles();
    try {
      await loadServices();
      await populateDropdowns();
    } catch (error) {
      console.warn("Failed to load Insurance Policy services", error);
    }

    bindModeButtons();
    bindActions();
    bindInsuranceCodeSearch();
    bindInsuranceCompanySearch();
    // Per spec: on first load only View is active.
    setMode(MODES.VIEW, { initial: true });

    // If user changes PolicyNo, require a fresh lookup before enabling Add/Edit.
    const policyNoEl = qs("#PolicyNo");
    policyNoEl?.addEventListener("input", () => {
      state.hasLoadedPolicy = false;
      state.canAddFromCurrentPolicyNo = false;
      setMode(MODES.VIEW, { initial: true });
    });
  });
})();
