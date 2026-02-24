(function (global) {
  console.log("[BillAccountApplication] Script starting...");

  if (global.__billAccountApplicationLoaded) {
    console.log("[BillAccountApplication] Already loaded, skipping");
    return;
  }
  global.__billAccountApplicationLoaded = true;

  // ============================================
  // DOM ELEMENTS & STATE
  // ============================================

  const form = document.getElementById("bill-account-form");
  const toastEl = document.getElementById("billAccountToast");

  console.log("[BillAccountApplication] Form found:", !!form);
  console.log("[BillAccountApplication] Toast found:", !!toastEl);

  const supportedPages = ["bill-account-application"];
  const activePage = document.body?.dataset?.page;
  console.log("[BillAccountApplication] Active page:", activePage);

  if (!supportedPages.includes(activePage)) {
    console.log("[BillAccountApplication] Page not supported, exiting");
    return;
  }

  console.log("[BillAccountApplication] Page is supported, continuing...");

  let dependenciesReady = false;

  // Load dependencies using ServiceLoader
  const loadDependencies = async () => {
    const { ServiceLoader } = global;
    if (!ServiceLoader) {
      console.error("[BillAccountApplication] ServiceLoader not found!");
      return false;
    }

    try {
      console.log("[BillAccountApplication] Loading dependencies...");

      console.log("[BillAccountApplication] About to load Core...");
      await ServiceLoader.loadCore();
      console.log("[BillAccountApplication] Core loaded");

      console.log("[BillAccountApplication] About to load AuthService...");
      await ServiceLoader.loadAuthService();
      console.log("[BillAccountApplication] AuthService loaded");

      console.log("[BillAccountApplication] About to load BillAccountService...");
      await ServiceLoader.loadBillAccountService();
      console.log("[BillAccountApplication] BillAccountService loaded");

      console.log("[BillAccountApplication] About to load LookupService...");
      await ServiceLoader.loadLookupService();
      console.log("[BillAccountApplication] LookupService loaded");

      console.log("[BillAccountApplication] About to load ClientService...");
      await ServiceLoader.loadClientService?.();
      console.log("[BillAccountApplication] ClientService loaded");

      dependenciesReady = true;
      console.log("[BillAccountApplication] All dependencies loaded successfully");
      return true;
    } catch (error) {
      console.error("[BillAccountApplication] Failed to load dependencies:", error);
      console.error("[BillAccountApplication] Error stack:", error.stack);
      return false;
    }
  };

  // Initialize when DOM is ready
  const startInit = async () => {
    console.log("[BillAccountApplication] Starting initialization...");
    const loaded = await loadDependencies();
    if (loaded) {
      init();
    } else {
      console.error("[BillAccountApplication] Could not initialize - dependencies failed to load");
    }
  };

  // Start initialization - wait for DOM if needed
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startInit);
  } else {
    startInit();
  }

  // ============================================
  // CONSTANTS & STATE
  // ============================================

  const MODES = {
    VIEW: "view",
    ADD: "add",
    UPDATE: "update"
  };

  let activeMode = MODES.VIEW;
  let lastLoadedUpdateCount = 0;
  let lastLoadedStatusId = null;
  let lastLoadedClient = null;
  let lastLoadedApplicationId = null;

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  // Toast notification using Account Maintenance's kairo-toast styling
  function showSystemToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
    const container = ensureToastContainer();
    // Remove existing toasts
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
      } catch { }
    };

    setTimeout(() => toast.classList.add('is-show'), 0);
    if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
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

  // Legacy wrapper for compatibility
  function setToast(message, variant = "success") {
    showSystemToast(message, { variant, timeoutMs: 5000 });
  }

  function removeToast(toast) {
    if (toast && toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }

  function hideToast() {
    const container = document.querySelector('[data-kairo-toast-container]');
    if (container) {
      const toasts = container.querySelectorAll('.kairo-toast');
      toasts.forEach(t => t.remove());
    }
  }

  function normalizeMode(value) {
    const raw = (value || "").trim().toLowerCase();
    if (raw === "add") return MODES.ADD;
    if (raw === "update" || raw === "edit") return MODES.UPDATE;
    return MODES.VIEW;
  }

  function setFieldsDisabled(shouldDisable) {
    if (!form) return;
    const fields = Array.from(form.querySelectorAll("input, select, textarea"));
    fields.forEach((field) => {
      if (field.hasAttribute("readonly")) {
        return;
      }
      field.disabled = Boolean(shouldDisable);
    });
  }

  function setLookupButtonsDisabled(selector, disabled) {
    document.querySelectorAll(selector).forEach((button) => {
      if (!(button instanceof Element)) return;
      if ("disabled" in button) {
        button.disabled = Boolean(disabled);
      } else {
        button.setAttribute("aria-disabled", String(Boolean(disabled)));
      }
    });
  }

  function applyVisibilityRules() {
    if (!form) return;
    form.querySelectorAll("[data-visible-when]").forEach((node) => {
      const when = (node.dataset.visibleWhen || "").trim().toLowerCase();
      node.hidden = when && when !== activeMode;
    });

    const deleteBtn = form.querySelector("[data-submit-action='delete']");
    if (deleteBtn) {
      deleteBtn.disabled = activeMode === MODES.ADD;
    }
  }

  function setApplicationDateToToday() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;
    setFieldValue('ApplicationDate', dateStr);
    const displayDate = formatDateDisplay(dateStr);
    console.log('[BillAccountApplication] ApplicationDate set to today:', displayDate);
  }

  function setCreatedOnToToday() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;
    setFieldValue('CreatedOn', dateStr);
    const displayDate = formatDateDisplay(dateStr);
    console.log('[BillAccountApplication] CreatedOn set to today:', displayDate);
  }

  function setMode(mode) {
    activeMode = normalizeMode(mode);
    hideToast();

    setFieldsDisabled(false); // Always enable fields
    applyVisibilityRules();

    // Enable all search and interactive buttons
    document.querySelectorAll("[data-open-parent-modal], [data-client-search], [data-account-search], [data-branch-search], [data-product-search], [data-application-search], .cm-dataentry-toggle").forEach((button) => {
      button.removeAttribute?.("disabled");
      if ("disabled" in button) {
        button.disabled = false;
      }
    });

    document.querySelectorAll("[data-shell-mode]").forEach((btn) => {
      const btnMode = normalizeMode(btn.dataset.shellMode);
      btn.classList.toggle("is-active", btnMode === activeMode);
    });

    // Business rule: ApplicationID can be entered manually or searched
    // In ADD mode: allow typing for new ApplicationID generation
    // In VIEW mode: allow searching for existing ApplicationID
    const applicationIdInput = form?.querySelector('[name="ApplicationID"]');
    if (applicationIdInput) {
      // Always allow typing in ApplicationID field
      applicationIdInput.readOnly = false;
    }

    // ApplicationID search: Enable in VIEW mode, allow in ADD mode for searching existing records
    // User can switch to VIEW mode to search, or stay in ADD mode to create new
    setLookupButtonsDisabled("[data-application-search]", false);

    // UX: In ADD mode, focus on ClientID for data entry. In VIEW mode, focus on ApplicationID.
    if (activeMode === MODES.ADD) {
      // Set ApplicationDate to today's date in ADD mode
      setApplicationDateToToday();
      // Show CreatedOn in ADD mode for display parity
      setCreatedOnToToday();

      // Clear cached concurrency values so they don't interfere with new inserts
      lastLoadedUpdateCount = 0;
      lastLoadedStatusId = "";

      setTimeout(() => {
        form?.querySelector('[name="ClientID"]')?.focus();
      }, 50);
    } else {
      // In VIEW mode, focus on ApplicationID for searching/loading existing records
      setTimeout(() => {
        form?.querySelector('[name="ApplicationID"]')?.focus();
      }, 50);
    }
  }

  function scrollToSection(sectionId) {
    const target = document.getElementById(sectionId);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function getFormPayload() {
    if (!form) return {};
    return Object.fromEntries(new FormData(form).entries());
  }

  function populateForm(data) {
    if (!form || !data) {
      console.warn("[BillAccountApplication] populateForm: form or data is null/undefined");
      return;
    }

    console.log("[BillAccountApplication] populateForm: Starting form population");
    console.log("[BillAccountApplication] Form element:", form);

    let populatedCount = 0;
    let fieldsMissed = [];

    Object.keys(data).forEach(key => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) {
        const oldValue = input.value;
        const newValue = data[key] || '';

        // Check if this is a date field by checking if Flatpickr is attached or field name contains 'date'
        const isDateField = input._flatpickr || /date/i.test(key);

        if (input._flatpickr) {
          // If Flatpickr is attached, set the date through Flatpickr
          // This ensures proper formatting
          try {
            input._flatpickr.setDate(newValue, true); // true = trigger change event
          } catch (e) {
            console.warn(`[BillAccountApplication] Error setting date via Flatpickr for ${key}:`, e);
            input.value = newValue;
          }
        } else {
          // For non-Flatpickr fields, set directly
          input.value = newValue;
        }

        // Dispatch change event to ensure any listeners are triggered
        input.dispatchEvent(new Event('change', { bubbles: true }));

        populatedCount++;
        console.log(`[BillAccountApplication] ✓ Field "${key}": "${oldValue}" → "${newValue}"`);
      } else {
        fieldsMissed.push(key);
      }
    });

    console.log(`[BillAccountApplication] populateForm complete: ${populatedCount} fields populated`);
    if (fieldsMissed.length > 0) {
      console.warn(`[BillAccountApplication] Fields in response but no matching form inputs: ${fieldsMissed.join(", ")}`);
    }
    document.getElementById("accountnameid").value = data.AccountName || "";
  }

  function getOperatorId() {
    try {
      // Priority 1: AuthService (if loaded)
      const session = global.AuthService?.getSession?.();

      // Priority 2: Direct localStorage check (if AuthService missing/failed)
      // The key found in auth.service.js is 'nimble_auth_session'
      const rawSession = session || JSON.parse(localStorage.getItem('nimble_auth_session') || '{}');

      // Inspect structure based on AuthService.login: payload has operatorID, but response 'entity' is stored.
      // Usually entity matches the model. Let's try common casings.
      const opId = rawSession?.operatorId ||
        rawSession?.operatorID ||
        rawSession?.OperatorId ||
        rawSession?.OperatorID ||
        rawSession?.UserID ||
        rawSession?.userId ||
        localStorage.getItem("OperatorID"); // Legacy fallback

      if (!opId) {
        console.warn("[BillAccountApplication] Warning: No OperatorID found in session ('nimble_auth_session') or legacy storage.");
        console.log("[BillAccountApplication] Raw Session Data:", rawSession);
      } else {
        console.log("[BillAccountApplication] Found OperatorID:", opId);
      }
      return opId;
    } catch (err) {
      console.error("[BillAccountApplication] Error resolving OperatorID:", err);
      return null;
    }
  }

  function formatSmallDateTime(value) {
    const raw = (value || "").trim();
    if (!raw) return null;
    // Common input[type=date] value
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return `${raw}T00:00:00`;
    }
    return raw;
  }

  function formatDateDisplay(value) {
    // Format date as "DD/MM/YYYY" (e.g., "24/01/2026")
    const raw = (value || "").trim();
    if (!raw) return "";

    let dateObj = null;

    // Handle YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      dateObj = new Date(raw + "T00:00:00Z");
    }
    // Handle other date formats
    else {
      dateObj = new Date(raw);
    }

    if (isNaN(dateObj.getTime())) return raw;

    const day = String(dateObj.getUTCDate()).padStart(2, "0");
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
    const year = dateObj.getUTCFullYear();

    return `${day}/${month}/${year}`;
  }

  function parseNumber(value) {
    const raw = (value ?? "").toString().trim();
    if (!raw) return null;
    const num = Number(raw.replace(/,/g, ""));
    return Number.isFinite(num) ? num : null;
  }

  function getBranchId() {
    try {
      // Priority 1: Form field value (especially important in ADD mode where user enters BranchID)
      const formBranchId = form?.querySelector('[name="BranchID"]')?.value?.trim();
      if (formBranchId) return formBranchId;

      // Priority 2: Session branchId
      const session = global.AuthService?.getSession?.();
      return session?.branchId || session?.branchID || "0101";
    } catch {
      return form?.querySelector('[name="BranchID"]')?.value || "0101";
    }
  }

  function getNowLegacySmallDateTime() {
    const d = new Date();
    const pad2 = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const hh = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());
    // A lot of the legacy API tolerates this format for smalldatetime-like fields.
    return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
  }

  function buildSaveRequestData() {
    const payload = getFormPayload();
    const operatorId = getOperatorId();
    const branchId = (payload.BranchID || payload.OurBranchID || getBranchId() || "0101").toString().trim();

    const applicationId = (payload.ApplicationID || "").toString().trim();

    const now = getNowLegacySmallDateTime();

    // In ADD mode, force UpdateCount to 0; in UPDATE mode, use payload or lastLoaded
    const updateCount = activeMode === MODES.ADD
      ? 0
      : (Number.isFinite(Number(payload.UpdateCount))
        ? Number(payload.UpdateCount)
        : (Number.isFinite(Number(lastLoadedUpdateCount)) ? Number(lastLoadedUpdateCount) : 0));

    // In ADD mode, force status to empty (let DB set default); in UPDATE/VIEW, use payload or lastLoaded
    const statusId = activeMode === MODES.ADD
      ? ""
      : (payload.BDApplnStatusID || payload.BDAplnStatusID || lastLoadedStatusId || payload.ApplicationStatus || "");

    // ApplicationDate: use provided value, or default to today in ADD mode, else null in UPDATE/VIEW
    let applicationDate = formatSmallDateTime(payload.ApplicationDate);
    if (!applicationDate && activeMode === MODES.ADD) {
      // Default to today's date in ADD mode
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      applicationDate = `${yyyy}-${mm}-${dd}T00:00:00`;
    }

    return {
      ApplicationID: activeMode === MODES.ADD ? null : (applicationId ? parseInt(applicationId) : null),
      OurBranchID: branchId || "",
      ClientID: (payload.ClientID || "").toString().trim() || "",
      ProductID: (payload.ProductID || "").toString().trim() || "",
      ApplicationDate: applicationDate,
      AccountID: (payload.AccountID || "").toString().trim() || "",

      // Optional fields - numeric fields keep null, string fields use empty string
      ReferenceNumber: (payload.ReferenceNumber || "").toString().trim() || "",
      Amount: parseNumber(payload.Amount) ?? 0,
      ExpiryDate: formatSmallDateTime(payload.ExpiryDate) || "",
      InterestRate: parseNumber(payload.InterestRate) ?? 0,
      CreditAccountID: (payload.CreditAccountID || "").toString().trim() || "",
      OverdueAccountID: (payload.OverdueAccountID || "").toString().trim() || "",
      ExchangeRate: parseNumber(payload.ExchangeRate) ?? 0,
      LocalAmount: parseNumber(payload.LocalAmount) ?? 0,
      Remarks: (payload.Remarks || "").toString().trim() || "",
      BDApplnStatusID: statusId || "",
      RejectedReason: (payload.RejectedReason || "").toString().trim() || "",

      // Audit fields: In ADD mode, send CreatedBy as OperatorID. In UPDATE mode, only update Modified fields.
      CreatedBy: (payload.CreatedBy || operatorId || "").toString().trim() || operatorId || "",
      CreatedOn: activeMode === MODES.ADD ? now : (payload.CreatedOn ? formatSmallDateTime(payload.CreatedOn) : ""),
      ModifiedBy: activeMode !== MODES.ADD ? ((operatorId || payload.ModifiedBy || "").toString().trim() || "") : "",
      ModifiedOn: activeMode !== MODES.ADD ? now : "",
      SupervisedBy: (payload.SupervisedBy || "").toString().trim() || "",
      SupervisedOn: payload.SupervisedOn ? formatSmallDateTime(payload.SupervisedOn) : "",

      UpdateCount: activeMode === MODES.ADD ? 1 : (updateCount + 1),
      SerialID: activeMode === MODES.ADD ? null : (applicationId ? parseInt(applicationId) : null)
    };
  }

  function extractClientPayload(response) {
    if (!response) return null;

    // CoreApi-normalized
    if (response.success) {
      if (response.data && typeof response.data === 'object') {
        if (Array.isArray(response.data)) return response.data[0] || null;
        return response.data;
      }
      if (response.Details && typeof response.Details === 'object') {
        if (Array.isArray(response.Details)) return response.Details[0] || null;
        return response.Details;
      }
    }

    // Non-normalized legacy
    return response.ResponseData || response.Details || response.data || null;
  }

  async function fetchClientById(clientId) {
    // Skip ClientService.getClient (requires OperatorID not supplied); use searchClients + fetchIdDescription instead

    // Fallback 1: Try BillAccountService search with robust extraction
    const BillAccountService = global.BillAccountService;
    if (BillAccountService?.searchClients) {
      try {
        const spinner = document.getElementById('client-name-spinner');
        spinner?.classList.remove('d-none');
        const resp = await BillAccountService.searchClients(clientId);
        console.log('[BillAccountApplication] fetchClientById: raw response', resp);

        // Try to extract array candidates
        const list = (resp?.data?.Details01 && Array.isArray(resp.data.Details01) ? resp.data.Details01
          : (Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp?.Details) ? resp.Details : [])));

        if (Array.isArray(list) && list.length) return list[0];
      } catch (err) {
        console.error('[BillAccountApplication] fetchClientById fallback failed', err);
      } finally {
        const spinner = document.getElementById('client-name-spinner');
        spinner?.classList.add('d-none');
      }
    }

    return null;
  }

  // Generic p_GetIDDescription call with customizable parameters
  // @param id: The ID to look up
  // @param controlTypeID: Type to search (e.g., 'CLIENT', 'ProductID', 'ACCOUNT')
  // @param advanceFilter: Optional SQL filter (e.g., "BankID='00' AND ProductTypeID='BD'")
  async function fetchIdDescription(id, controlTypeID = 'CLIENT', advanceFilter = '') {
    try {
      const env = global.Environment || {};
      const candidates = [env.baseUrlCommon, env.baseUrlSystemCodes, env.baseUrlClient].filter(Boolean);

      // Build p_GetIDDescription request per spec: OurBranchID, ControlTypeID, ID, BankID, TypeID, AdvanceFilter, LanguageID
      const requestData = {
        OurBranchID: getBranchId(),
        ControlTypeID: controlTypeID,
        ID: id,
        BankID: '00',
        TypeID: '',
        AdvanceFilter: advanceFilter,
        LanguageID: 'en'
      };

      const envelope = global.CoreApi.makeRequestEnvelope('dbo.p_GetIDDescription', requestData);
      console.log(`[BillAccountApplication] fetchIdDescription: envelope for p_GetIDDescription (${controlTypeID})`, envelope);

      for (const base of candidates) {
        const url = `${base.replace(/\/$/, '')}/api/OldAPI`;
        try {
          console.log(`[BillAccountApplication] fetchIdDescription: POSTing to ${url} for ${controlTypeID}:${id}`, requestData);
          const resp = await global.CoreApi.post(url, envelope);
          console.log(`[BillAccountApplication] fetchIdDescription response from ${url}:`, resp);

          if (resp?.success) {
            // Extract description from response (try multiple paths, including when data is direct array)
            let desc = null;

            // If data is a direct array, check first element
            if (Array.isArray(resp.data)) {
              const firstItem = resp.data[0];
              desc = firstItem?.Description || firstItem?.Name || firstItem?.ProductName || firstItem?.ClientName || null;
            }
            // Otherwise try nested paths
            else if (resp.data) {
              desc = (resp.data?.Details && resp.data.Details[0] && (resp.data.Details[0].Description || resp.data.Details[0].Name || resp.data.Details[0].ProductName || resp.data.Details[0].ClientName))
                || (resp.data?.Details01 && Array.isArray(resp.data.Details01) && resp.data.Details01[0] && (resp.data.Details01[0].Description || resp.data.Details01[0].Name || resp.data.Details01[0].ProductName || resp.data.Details01[0].ClientName))
                || resp.data?.Description
                || resp.data?.Name
                || resp.data?.ProductName
                || resp.data?.ClientName
                || null;
            }

            if (desc) {
              console.log(`[BillAccountApplication] fetchIdDescription: resolved ${controlTypeID} description:`, desc);
              return {
                ClientName: desc,
                Description: desc,
                ProductName: desc,
                AccountName: desc
              };
            } else {
              console.warn(`[BillAccountApplication] fetchIdDescription: no description found in response for ${controlTypeID}`, resp);
            }
          } else {
            console.warn(`[BillAccountApplication] fetchIdDescription: response.success=false for ${controlTypeID}`, resp?.message);
          }
        } catch (err) {
          console.warn(`[BillAccountApplication] fetchIdDescription attempt failed for ${controlTypeID} at ${url}`, err);
        }
      }
    } catch (err) {
      console.error('[BillAccountApplication] fetchIdDescription unexpected error', err);
    }
    console.warn(`[BillAccountApplication] fetchIdDescription: all endpoints exhausted, no result for ${controlTypeID}`);
    return null;
  }

  async function resolveBranchName(branchId) {
    const id = (branchId || "").toString().trim();
    if (!id) return null;

    const BillAccountService = global.BillAccountService;
    if (!BillAccountService?.searchBranches) return null;

    try {
      console.log('[BillAccountApplication] resolveBranchName: searching for', id);
      const resp = await BillAccountService.searchBranches(id);
      console.log('[BillAccountApplication] resolveBranchName: raw response', resp);

      // Try to extract any array of results from several possible properties
      const listCandidates = [];

      // Prefer data.* arrays
      if (resp?.data && typeof resp.data === 'object') {
        if (Array.isArray(resp.data.Details01)) listCandidates.push(resp.data.Details01);
        if (Array.isArray(resp.data.Details)) listCandidates.push(resp.data.Details);
        if (Array.isArray(resp.data.TableResults)) listCandidates.push(resp.data.TableResults);
        if (Array.isArray(resp.data.Result)) listCandidates.push(resp.data.Result);
        if (Array.isArray(resp.data.Results)) listCandidates.push(resp.data.Results);

        // Any other array-valued property on data
        for (const k of Object.keys(resp.data)) {
          if (Array.isArray(resp.data[k]) && !listCandidates.includes(resp.data[k])) {
            listCandidates.push(resp.data[k]);
          }
        }
      }

      // Also consider top-level properties if present
      if (Array.isArray(resp?.Details)) listCandidates.push(resp.Details);
      if (Array.isArray(resp?.Details01)) listCandidates.push(resp.Details01);

      // Pick the first non-empty array
      let list = [];
      let chosenSource = null;
      for (const arr of listCandidates) {
        if (Array.isArray(arr) && arr.length) {
          list = arr;
          chosenSource = 'data.* or top-level';
          break;
        }
      }

      // If still empty, maybe Details is an object (single row); wrap it
      if ((!list || list.length === 0) && resp?.data?.Details && typeof resp.data.Details === 'object' && !Array.isArray(resp.data.Details)) {
        list = [resp.data.Details];
        chosenSource = 'data.Details(single)';
      }
      if ((!list || list.length === 0) && resp?.Details && typeof resp.Details === 'object' && !Array.isArray(resp.Details)) {
        list = [resp.Details];
        chosenSource = 'top-level Details(single)';
      }

      console.log('[BillAccountApplication] resolveBranchName: chosenSource=', chosenSource, 'list.length=', list.length);

      // Try to find exact ID match (handle multiple casings and OurBranchID)
      const match = list.find(r => {
        const candidate = String(r?.BranchID ?? r?.branchId ?? r?.BranchId ?? r?.BRANCHID ?? r?.OurBranchID ?? r?.ourBranchId ?? '').trim();
        return candidate && candidate === id;
      }) || list[0];

      if (!match) {
        console.warn('[BillAccountApplication] resolveBranchName: no direct match found in response list');
        return null;
      }

      // Candidate name fields in order of preference
      const nameCandidates = [
        match?.BranchName,
        match?.OurBranchName,
        match?.Branch_Name,
        match?.Name,
        match?.BranchDesc,
        match?.BranchDescription,
        match?.Description,
        match?.CodeDescription,
        match?.CodeDesc,
        match?.CodeDesciption,
        match?.OurBranchDesc
      ];

      for (const n of nameCandidates) {
        if (n && String(n).toString().trim() !== '') return String(n).trim();
      }

      return null;
    } catch {
      return null;
    }
  }

  async function resolveProductName(productId) {
    const id = (productId || "").toString().trim();
    if (!id) return null;

    try {
      const spinner = document.getElementById('product-name-spinner');
      spinner?.classList.remove('d-none');

      // First try: p_GetIDDescription with ProductID ControlTypeID and filter
      const advanceFilter = "BankID='00' AND ProductTypeID='BD'";
      const payload = await fetchIdDescription(id, 'ProductID', advanceFilter);

      if (payload?.ProductName) {
        console.log('[BillAccountApplication] resolveProductName: resolved via p_GetIDDescription', payload.ProductName);
        return payload.ProductName;
      }

      // Fallback: BillAccountService search if p_GetIDDescription returns nothing
      const BillAccountService = global.BillAccountService;
      if (BillAccountService?.searchApplications) {
        const resp = await global.BillAccountService.searchApplications(id);
        console.log('[BillAccountApplication] resolveProductName fallback response', resp);

        const rows = resp?.data?.Details01 || resp?.data?.Details || (Array.isArray(resp?.data) ? resp.data : []);
        const list = Array.isArray(rows) ? rows : [];
        const match = list.find(r => String(r?.ProductID ?? r?.productId ?? r?.ProductId ?? '').trim() === id) || list[0];
        return match?.ProductName || match?.ProductDesc || match?.ProductDescription || match?.Description || null;
      }

      return null;
    } catch (err) {
      console.error('[BillAccountApplication] resolveProductName error', err);
      return null;
    } finally {
      const spinner = document.getElementById('product-name-spinner');
      spinner?.classList.add('d-none');
    }
  }

  async function resolveAccountName(accountId) {
    const id = (accountId || "").toString().trim();
    if (!id) return null;

    const BillAccountService = global.BillAccountService;
    if (!BillAccountService?.searchBillAccounts) return null;

    // Get ClientID for filtering
    const form = document.getElementById('bill-account-form');
    const clientId = form?.querySelector('[name=ClientID]')?.value?.trim();

    if (!clientId) {
      console.warn('[BillAccountApplication] resolveAccountName: No ClientID available for filtering');
      return null;
    }

    try {
      const spinner = document.getElementById('account-name-spinner');
      spinner?.classList.remove('d-none');
      const resp = await BillAccountService.searchBillAccounts(id, clientId);
      console.log('[BillAccountApplication] resolveAccountName raw response', resp);

      const rows = resp?.data?.Details01 || resp?.data?.Details || (Array.isArray(resp?.data) ? resp.data : []);
      const list = Array.isArray(rows) ? rows : [];
      const match = list.find(r => String(r?.AccountID ?? r?.accountId ?? r?.AccountId ?? '').trim() === id) || list[0];
      return match?.AccountName || match?.AccountTitle || match?.AccountDescription || match?.Description || null;
    } catch (err) {
      console.error('[BillAccountApplication] resolveAccountName error', err);
      return null;
    } finally {
      const spinner = document.getElementById('account-name-spinner');
      spinner?.classList.add('d-none');
    }
  }

  async function resolveApplicationName(applicationId) {
    const id = (applicationId || "").toString().trim();
    if (!id) return null;

    const BillAccountService = global.BillAccountService;
    if (!BillAccountService?.searchApplications) return null;

    try {
      const resp = await BillAccountService.searchApplications(id);
      const rows = resp?.data?.Details01;
      const list = Array.isArray(rows) ? rows : (Array.isArray(resp?.data) ? resp.data : []);
      const match = list.find(r => String(r?.ApplicationID ?? r?.applicationId ?? r?.ApplicationId ?? '').trim() === id) || list[0];
      // Note: Application search often returns the ClientName as the main description
      return match?.ClientName || match?.AccountName || match?.ApplicationID || null;
    } catch {
      return null;
    }
  }

  function setFieldValue(fieldName, value) {
    const el = form?.querySelector(`[name="${fieldName}"]`);
    if (!el) return;

    const val = value ?? "";

    if (el._flatpickr) {
      if (val) {
        el._flatpickr.setDate(val, true);
      } else {
        el._flatpickr.clear();
      }
    } else {
      el.value = val;
      // Dispatch change event to trigger listeners (like BranchName/ProductName lookup)
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function extractGeneratedApplicationId(response) {
    const tryGet = (obj, path) => {
      try {
        return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
      } catch {
        return undefined;
      }
    };

    const candidates = [
      (r) => tryGet(r, 'data.ApplicationID'),
      (r) => tryGet(r, 'data.0.ApplicationID'),
      (r) => tryGet(r, 'data.Details.0.ApplicationID'),
      (r) => tryGet(r, 'data.Details01.0.ApplicationID'),
      (r) => tryGet(r, 'data.Details01.0.SerialID'),
      (r) => tryGet(r, 'data.Details.0.SerialID'),
      (r) => tryGet(r, 'data.Details.0.Details01.0.ApplicationID'),
      (r) => tryGet(r, 'data.Details.0.Details01.0.SerialID'),
      (r) => tryGet(r, 'data.Details.0.Details.0.ApplicationID'),
      (r) => tryGet(r, 'data.Details.0.Details.0.SerialID'),
      (r) => tryGet(r, 'Details.0.ApplicationID'),
      (r) => tryGet(r, 'Details01.0.ApplicationID'),
      (r) => r?.ApplicationID,
      (r) => r?.SerialID
    ];

    for (const fn of candidates) {
      const value = fn(response);
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim();
      }
    }
    return null;
  }

  // ============================================
  // MODAL & SEARCH FUNCTIONS
  // ============================================

  function renderSearchFeedback(message, variant = "info") {
    setToast(message, variant);
  }

  function showSearchResults(label, results, idField, nameField, searchTerm, searchFnName, meta = {}, filterParams = {}) {
    console.log(`[BillAccountApplication] showSearchResults called: label="${label}", results.length=${results?.length}, idField="${idField}", nameField="${nameField}", searchTerm="${searchTerm}", filterParams:`, filterParams);
    console.log(`[BillAccountApplication] results array:`, results);

    if (!results || results.length === 0) {
      console.warn(`[BillAccountApplication] No results to display for ${label}`);
      renderSearchFeedback(`No ${label} results found.`, "warning");
      return;
    }

    const modalId = `search-results-${Date.now()}`;

    const displayedCount = Math.min(results.length, 50);
    const totalCount = Number.isFinite(Number(meta.totalCount)) ? Number(meta.totalCount) : null;
    const hasTotalCount = Boolean(totalCount && totalCount > 0);
    const countLabel = hasTotalCount
      ? `Showing ${displayedCount} of ${totalCount}`
      : `Showing ${displayedCount} result${displayedCount === 1 ? '' : 's'}`;

    // Get column headers from first result
    const firstResult = results[0];
    const columnKeys = Object.keys(firstResult || {});

    console.log(`[BillAccountApplication] First result keys:`, columnKeys);

    // Filter out internal/metadata fields
    const displayKeys = columnKeys.filter(k =>
      !['UpdateCount', 'EventID', 'NewData', 'CreatedOn', 'ModifiedOn', 'SupervisedOn'].includes(k)
    );

    const tableHeaders = displayKeys.slice(0, 5).map(key => `<th style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%) !important; color: white !important;">${key}</th>`).join('');

    const modalHTML = `
      <div class="modal fade" id="${modalId}" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="--bs-modal-width: 50vw;">
          <div class="modal-content">
            <div class="modal-header d-flex align-items-center justify-content-between" style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%); color: white;">
              <div class="d-flex align-items-center gap-3">
                <div>
                  <h5 class="modal-title mb-0" style="color: white;">${label} Search Results</h5>
                  <div class="text-muted small" style="color: #e0e0e0;">${countLabel}</div>
                </div>
                <div class="input-group input-group-sm" style="width: 300px;">
                  <input type="text" class="form-control" id="inline-search-${modalId}" 
                         placeholder="Refine search..." value="${searchTerm || ''}">
                  <button class="btn btn-primary" type="button" id="inline-search-btn-${modalId}">
                    <i class="bi bi-search"></i> Find
                  </button>
                </div>
              </div>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" style="color: white; filter: brightness(0) invert(1);"></button>
            </div>
            <div class="modal-body">
              <div class="table-responsive">
                <table class="table table-hover table-sm">
                  <thead style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%) !important; color: white !important;">
                    <tr>
                      ${tableHeaders}
                      <th style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%) !important; color: white !important;">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${results.slice(0, 50).map((item, idx) => {
      const rawKey = (idField && item && item[idField] != null) ? String(item[idField]) : '';
      const searchKey = rawKey || String(item?.ClientID || item?.ClientId || item?.BranchID || item?.BranchId || item?.AccountID || item?.AccountId || item?.ProductID || item?.ProductId || '');
      return `
                      <tr data-result-index="${idx}" data-search-key="${String(searchKey).replace(/\"/g, '&quot;')}">
                        ${displayKeys.slice(0, 5).map(key => `<td>${item[key] || ''}</td>`).join('')}
                        <td>
                          <button type="button" class="btn btn-sm btn-primary select-result">
                            Select
                          </button>
                        </td>
                      </tr>
                    `;
    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
            <div class="modal-footer justify-content-between">
              <div class="text-muted small">${countLabel}</div>
              <button type="button" class="btn btn-outline-secondary" id="btn-prev-${modalId}">
                <i class="bi bi-chevron-left"></i> Previous
              </button>
              <button type="button" class="btn btn-outline-primary" id="btn-next-${modalId}">
                Next <i class="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);

    const modalEl = document.getElementById(modalId);
    const modal = new (window.bootstrap?.Modal || window.Modal)(modalEl, { backdrop: 'static', keyboard: false });

    const tbodyRows = () => Array.from(modalEl.querySelectorAll('tbody tr'));

    const clearRowHighlight = () => {
      tbodyRows().forEach((row) => {
        row.classList.remove('table-primary');
        row.style.outline = '';
      });
    };

    const highlightRow = (row) => {
      if (!row) return;
      clearRowHighlight();
      row.classList.add('table-primary');
      row.style.outline = '2px solid rgba(13,110,253,.35)';
    };

    const getRowForTerm = (term) => {
      const needle = (term || '').trim().toLowerCase();
      if (!needle) return null;

      const rows = tbodyRows();
      // Prefer idField match (data-search-key), fall back to any cell text.
      return rows.find((row) => {
        const key = (row.dataset.searchKey || '').toLowerCase();
        if (key && (key.startsWith(needle) || key.includes(needle))) return true;
        return row.textContent?.toLowerCase().includes(needle);
      }) || null;
    };

    const selectResultAt = async (resultIndex) => {
      const idx = Number(resultIndex);
      const result = Number.isFinite(idx) ? results[idx] : null;
      if (!result) {
        renderSearchFeedback(`Could not select ${label} - no matching data found`, "warning");
        return;
      }

      console.log("[BillAccountApplication] Search result selected:", { result, idField, label });
      modal.hide();

      // For ApplicationID: fetch complete application details
      const appId = result.ApplicationID || result.ApplicationId || result.applicationId || result.applicationID;

      if (idField === 'ApplicationID' && appId) {
        console.log(`[BillAccountApplication] ApplicationID selected (${appId}), fetching full application data...`);

        // Switch to VIEW mode if needed to allow loading
        if (activeMode === MODES.ADD) {
          console.log("[BillAccountApplication] Switching from ADD to VIEW mode for ApplicationID load");
          setMode(MODES.VIEW);
        }

        // Set ApplicationID value
        const idInput = form?.querySelector(`[name="ApplicationID"]`);
        if (idInput) {
          idInput.value = appId;
          lastLoadedApplicationId = null; // Reset to allow reload
        }

        // Also set ClientID if available from search result
        const clientId = result.ClientID || result.ClientId || '';
        if (clientId) {
          const clientIdInput = form?.querySelector(`[name="ClientID"]`);
          if (clientIdInput) {
            clientIdInput.value = clientId;
            console.log(`[BillAccountApplication] Set ClientID from search result: ${clientId}`);
          }
        }

        // Set BranchID if available from search result (critical for cross-branch retrieval)
        const branchId = result.OurBranchID || result.BranchID || result.ourBranchId || result.branchId || '';
        if (branchId) {
          const branchIdInput = form?.querySelector(`[name="BranchID"]`);
          if (branchIdInput) {
            branchIdInput.value = branchId;
            console.log(`[BillAccountApplication] Set BranchID from search result: ${branchId}`);
            // Also update BranchName
            setTimeout(() => updateBranchNameFromBranchId(), 100);
          }
        } else {
          console.warn(`[BillAccountApplication] No BranchID in search result for ApplicationID ${appId}`);
          console.warn("[BillAccountApplication] Search result keys:", Object.keys(result));
          console.log("[BillAccountApplication] Keeping existing BranchID in form (if any) or will use logged-in branch");
          // Don't modify BranchID - keep whatever is already in the form
          // If form is empty, the retrieval will use logged-in user's branch as fallback
        }

        setTimeout(() => {
          console.log("[BillAccountApplication] Calling onViewData() after ApplicationID selection");
          onViewData();
        }, 300);
      }
      // For other lookups: populate available fields from search result
      else {
        let idValue = '';
        let nameValue = '';

        // Handle field mapping - API may return different field names
        if (idField === 'BranchID') {
          idValue = result.BranchID || result.OurBranchID || result.branchId || result.ourBranchId || '';
          nameValue = result.BranchName || result.OurBranchName || '';
        } else if (idField === 'ClientID') {
          idValue = result.ClientID || result.clientId || result.ClientId || '';
          nameValue = result.ClientName || result.Name || '';
        } else if (idField === 'ProductID') {
          idValue = result.ProductID || result.productId || result.ProductId || '';
          nameValue = result.ProductName || result.ProductDesc || result.ProductDescription || result.Name || result.Description || '';
        } else if (idField === 'AccountID') {
          idValue = result.AccountID || result.accountId || result.AccountId || '';
          nameValue = result.AccountName || result.AccountTitle || result.AccountDesc || result.AccountDescription || result.Name || result.Description || '';
        } else {
          idValue = result[idField] || '';
          nameValue = result.Name || result.Description || '';
        }

        if (idField && idValue) {
          const idInput = form?.querySelector(`[name="${idField}"]`);
          if (idInput) idInput.value = idValue;
        }

        if (nameField) {
          const nameInput = form?.querySelector(`[name="${nameField}"]`);
          if (nameInput) {
            if (nameValue) {
              nameInput.value = nameValue;
            } else if (idField === 'BranchID' && idValue) {
              // Branch search results don't always include the branch name; resolve it immediately.
              const resolvedName = await resolveBranchName(idValue);
              nameInput.value = resolvedName || '';
            }
          }
        }
        renderSearchFeedback(`${label} selected: ${idValue}`, "success");
      }

      setTimeout(() => {
        modalEl.remove();
      }, 500);
    };

    // Wire selection buttons
    modalEl.querySelectorAll('.select-result').forEach((btn, idx) => {
      btn.addEventListener('click', async () => {
        await selectResultAt(idx);
      });
    });

    // Highlight on click + select on double click (matches legacy expectation)
    tbodyRows().forEach((row) => {
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        highlightRow(row);
      });
      row.addEventListener('dblclick', async () => {
        const idx = row.dataset.resultIndex;
        await selectResultAt(idx);
      });
    });

    // Wire pagination buttons
    const prevBtn = modalEl.querySelector(`#btn-prev-${modalId}`);
    const nextBtn = modalEl.querySelector(`#btn-next-${modalId}`);

    prevBtn?.addEventListener('click', () => {
      console.log("[BillAccountApplication] Previous clicked, filterParams:", filterParams);
      modal.hide();
      setTimeout(() => modalEl.remove(), 500);
      // 2 usually indicates "Previous" or "back" in these DB procs
      performLookupSearch({ term: searchTerm, label, searchFnName, idField, nameField, prevOrNext: 2, filterParams });
    });

    nextBtn?.addEventListener('click', () => {
      console.log("[BillAccountApplication] Next clicked, filterParams:", filterParams);
      modal.hide();
      setTimeout(() => modalEl.remove(), 500);
      // 1 usually indicates "Next" or "forward"
      performLookupSearch({ term: searchTerm, label, searchFnName, idField, nameField, prevOrNext: 1, filterParams });
    });

    modal.show();
    renderSearchFeedback(`Found ${results.length} ${label} result(s).`, "success");

    // Wire inline search
    const inlineInput = modalEl.querySelector(`#inline-search-${modalId}`);
    const inlineBtn = modalEl.querySelector(`#inline-search-btn-${modalId}`);

    const triggerFindInList = () => {
      const term = inlineInput.value.trim();
      if (!term) return;
      const row = getRowForTerm(term);
      if (row) {
        highlightRow(row);
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // Fallback: if the row isn't in the current page, run a refined search.
      modal.hide();
      setTimeout(() => modalEl.remove(), 500);
      performLookupSearch({ term, label, searchFnName, idField, nameField, filterParams });
    };

    inlineBtn?.addEventListener('click', triggerFindInList);
    inlineInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') triggerFindInList();
    });

    // Autofocus the inline search input
    setTimeout(() => {
      inlineInput?.focus();
      // Move cursor to end of text
      const val = inlineInput.value;
      inlineInput.value = '';
      inlineInput.value = val;
    }, 500);
  }

  async function performLookupSearch({ term, label, searchFnName, idField, nameField, prevOrNext = 0, filterParams = {} }) {
    // Allow empty term to retrieve all records
    const cleaned = (term || "").trim();
    const toSearchPattern = (value) => {
      const raw = (value || "").trim();
      if (!raw) return "%";
      // If caller already provided SQL wildcards, respect them.
      if (/[\%_]/.test(raw)) return raw;
      // Default to prefix match for IDs (works for both partial and full IDs).
      return `${raw}%`;
    };

    const searchTerm = toSearchPattern(cleaned);

    console.log(`[BillAccountApplication] performLookupSearch START - Label: ${label}, SearchTerm: "${searchTerm}", prevOrNext: ${prevOrNext}, filterParams:`, filterParams);

    const BillAccountService = global.BillAccountService;
    const LookupService = global.LookupService;

    const serviceFunc = searchFnName && BillAccountService && typeof BillAccountService[searchFnName] === "function"
      ? BillAccountService[searchFnName].bind(BillAccountService)
      : searchFnName && LookupService && typeof LookupService[searchFnName] === "function"
        ? LookupService[searchFnName].bind(LookupService)
        : null;

    if (!serviceFunc) {
      console.error(`[BillAccountApplication] Service function not found: ${searchFnName}`);
      renderSearchFeedback(`${label} service is not available.`, "danger");
      return;
    }

    const displayMessage = cleaned ? `Searching ${label} (Page request: ${prevOrNext})...` : `Retrieving all ${label} (Page request: ${prevOrNext})...`;
    renderSearchFeedback(displayMessage, "info");
    try {
      // Special handling for searchBillAccounts which requires clientId parameter
      let response;
      if (searchFnName === 'searchBillAccounts' && filterParams.clientId) {
        console.log(`[BillAccountApplication] Calling ${searchFnName}("${searchTerm}", "${filterParams.clientId}", ${prevOrNext})`);
        response = await serviceFunc(searchTerm, filterParams.clientId, prevOrNext);
      } else {
        console.log(`[BillAccountApplication] Calling ${searchFnName}("${searchTerm}", ${prevOrNext})`);
        response = await serviceFunc(searchTerm, prevOrNext);
      }
      console.log(`[BillAccountApplication] ${label} search response received:`, response);

      // Handle different response structures
      let results = [];
      let totalCount = null;

      const extractTotalCount = (data) => {
        if (!data || typeof data !== 'object') return null;
        const candidates = [
          data.TotalCount,
          data.totalCount,
          data.TotalRecords,
          data.totalRecords,
          data.RecordCount,
          data.recordCount,
          data.TotalRows,
          data.totalRows,
          data.TotalNo,
          data.totalNo
        ];
        for (const c of candidates) {
          const n = Number(c);
          if (Number.isFinite(n) && n > 0) return n;
        }
        return null;
      };

      if (response?.success) {
        if (Array.isArray(response.data)) {
          results = response.data;
        }
        else if (typeof response.data === 'object' && response.data !== null) {
          totalCount = extractTotalCount(response.data);
          results = response.data.Details01 || response.data.Details || response.data.TableResults || response.data.Result || response.data.Results || [];
          if (results.length === 0) {
            for (const key of Object.keys(response.data)) {
              if (Array.isArray(response.data[key]) && response.data[key].length > 0) {
                results = response.data[key];
                break;
              }
            }
          }
        }
      } else {
        console.error(`[BillAccountApplication] ✗ Response success: false`);
      }

      console.log(`[BillAccountApplication] ${label} final results count:`, results.length);

      // Pass the actual term entered to showSearchResults for the inline input value.
      showSearchResults(label, results, idField, nameField, term, searchFnName, { totalCount }, filterParams);

    } catch (error) {
      console.error(`[BillAccountApplication] ${label} search failed:`, error);
      renderSearchFeedback(error?.message || "Search failed", "danger");
    }
  }

  function showSearchInputModal(label, onSearch) {
    const modalId = `search-input-${Date.now()}`;
    const modalHTML = `
      <div class="modal fade" id="${modalId}" tabindex="-1" role="dialog">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Search ${label}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label for="search-input-${modalId}" class="form-label">Enter ${label} to search:</label>
                <small class="text-muted d-block mb-2">Leave empty to retrieve all ${label}</small>
                <input type="text" class="form-control" id="search-input-${modalId}" placeholder="Search term (optional)..." autofocus>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="search-btn-${modalId}">Search</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);

    const modalEl = document.getElementById(modalId);
    const inputEl = document.getElementById(`search-input-${modalId}`);
    const searchBtn = document.getElementById(`search-btn-${modalId}`);
    const modal = new (window.bootstrap?.Modal || window.Modal)(modalEl, { backdrop: 'static', keyboard: false });

    const performSearch = async () => {
      const searchTerm = inputEl.value.trim();
      modal.hide();
      await onSearch(searchTerm); // Pass even if empty
      setTimeout(() => modalEl.remove(), 500);
    };

    searchBtn?.addEventListener('click', performSearch);
    inputEl?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch();
    });

    modal.show();
  }

  function attachSearchHandler(selector, getTerm, searchFnName, label, idField, nameField) {
    console.log(`[BillAccountApplication] Attaching search handler for ${label} (selector: ${selector})`);
    const button = document.querySelector(selector);

    if (!button) {
      console.error(`[BillAccountApplication] Search button not found for selector: ${selector}`);
      return;
    }

    console.log(`[BillAccountApplication] ✓ Search button found for ${label}`);

    button.addEventListener("click", async (event) => {
      console.log(`[BillAccountApplication] ${label} search button clicked!`);
      event.preventDefault();
      event.stopPropagation();
      hideToast();

      if (!searchFnName) {
        console.warn(`[BillAccountApplication] No searchFnName for ${label}`);
        setToast(`${label} search is not wired yet.`, "info");
        return;
      }

      // First try to get value from form field (for refinement searches)
      let initialTerm = getTerm?.();
      console.log(`[BillAccountApplication] ${label} search - initial term: "${initialTerm}"`);

      // If no initial term, show search input modal
      // Directly perform search. If initialTerm is empty, it will retrieve all records.
      await performLookupSearch({ term: initialTerm || "", label, searchFnName, idField, nameField });
    });
  }

  function attachSearchHandlerWithFilter(selector, getTerm, searchFnName, label, idField, nameField, getFilterValue) {
    console.log(`[BillAccountApplication] Attaching filtered search handler for ${label} (selector: ${selector})`);
    const button = document.querySelector(selector);

    if (!button) {
      console.error(`[BillAccountApplication] Search button not found for selector: ${selector}`);
      return;
    }

    console.log(`[BillAccountApplication] ✓ Search button found for ${label}`);

    button.addEventListener("click", async (event) => {
      console.log(`[BillAccountApplication] ${label} filtered search button clicked!`);
      event.preventDefault();
      event.stopPropagation();
      hideToast();

      if (!searchFnName) {
        console.warn(`[BillAccountApplication] No searchFnName for ${label}`);
        setToast(`${label} search is not wired yet.`, "info");
        return;
      }

      // Get the filter value (e.g., ClientID)
      const filterValue = getFilterValue?.();
      console.log(`[BillAccountApplication] ${label} search - filter value: "${filterValue}"`);

      if (!filterValue || filterValue.trim() === "") {
        setToast(`Please select a Client first before searching for ${label}.`, "warning");
        return;
      }

      // Get the search term from form field (for refinement searches)
      let initialTerm = getTerm?.();
      console.log(`[BillAccountApplication] ${label} search - initial term: "${initialTerm}"`);

      // Perform search with filter
      await performLookupSearch({
        term: initialTerm || "",
        label,
        searchFnName,
        idField,
        nameField,
        filterParams: { clientId: filterValue }
      });
    });
  }

  // ============================================
  // VIEW DATA HANDLER (onProcess-style)
  // ============================================

  async function onViewData(e) {
    console.log("[BillAccountApplication] ========== onViewData START ==========");

    if (e) {
      e.preventDefault();
    }

    if (!dependenciesReady) {
      console.warn("[BillAccountApplication] Dependencies not ready!");
      setToast("System is still loading dependencies. Please wait.", "warning");
      return;
    }

    const BillAccountService = global.BillAccountService;
    console.log("[BillAccountApplication] BillAccountService available:", !!BillAccountService);

    if (!BillAccountService) {
      console.error("[BillAccountApplication] BillAccountService not available");
      setToast("Service not available", "danger");
      return;
    }

    const formData = getFormPayload();
    console.log("[BillAccountApplication] Form data collected:", formData);
    console.log("[BillAccountApplication] ApplicationID:", formData.ApplicationID);
    console.log("[BillAccountApplication] AccountID:", formData.AccountID);

    // Validate input
    if (!formData.ApplicationID && !formData.AccountID) {
      console.warn("[BillAccountApplication] No ApplicationID or AccountID provided");
      setToast("Please enter either an Application ID or Account ID to retrieve data.", "warning");
      return;
    }

    setToast("Retrieving data...", "info");

    // Use BranchID from form if available (may have been set from search result or manual entry)
    // If form BranchID is empty, fall back to logged-in user's branch
    const formBranchId = formData.BranchID?.trim() || '';
    const defaultBranchId = document.getElementById("BranchID")?.value || "0101";
    const ourBranchId = formBranchId || defaultBranchId;

    const payload = {
      ApplicationID: formData.ApplicationID || "",
      AccountID: formData.AccountID || "",
      OperatorID: getOperatorId(),
      Direction: 0,
      OurBranchID: ourBranchId,
      BankID: "00"
    };

    console.log(`[BillAccountApplication] Using OurBranchID: "${ourBranchId}" (from form: "${formBranchId}", default: "${defaultBranchId}")`);

    console.log("[BillAccountApplication] Final payload to send:", JSON.stringify(payload, null, 2));

    try {
      console.log("[BillAccountApplication] Making API call...");
      const response = await BillAccountService.getAccountApplication(payload);

      console.log("[BillAccountApplication] API response status:", response?.success);
      console.log("[BillAccountApplication] API response:", JSON.stringify(response, null, 2));
      console.log("[BillAccountApplication] Response code:", response?.code);
      console.log("[BillAccountApplication] Response message:", response?.message);
      console.log("[BillAccountApplication] Response data type:", typeof response?.data);
      console.log("[BillAccountApplication] Response data:", response?.data);

      if (response?.success) {
        console.log("[BillAccountApplication] ✓ Response successful");

        let responseData = null;

        // Log the raw response for debugging
        console.log("[BillAccountApplication] === RAW RESPONSE ===");
        console.log(JSON.stringify(response, null, 2));
        console.log("[BillAccountApplication] === END RAW RESPONSE ===");

        // The stored procedure returns result sets wrapped in an object:
        // response.data.Details: Metadata (OperatorID, EventID, etc)
        // response.data.Details01: Actual Application Data (ApplicationID, ClientID, etc)

        console.log("[BillAccountApplication] DEBUG: response.data type:", typeof response.data);
        console.log("[BillAccountApplication] DEBUG: response.data keys:", Object.keys(response.data || {}));

        // The actual data is in Details01 array
        if (response.data?.Details01 && Array.isArray(response.data.Details01)) {
          console.log("[BillAccountApplication] Found Details01 array, length:", response.data.Details01.length);

          if (response.data.Details01.length === 0) {
            console.warn("[BillAccountApplication] Details01 is empty - no data found with branch:", ourBranchId);

            // Retry with empty branch filter (cross-branch search)
            if (ourBranchId && ourBranchId !== "" && formData.ApplicationID) {
              console.log("[BillAccountApplication] Retrying with cross-branch search (no branch filter)...");

              const retryPayload = {
                ApplicationID: formData.ApplicationID,
                AccountID: formData.AccountID || "",
                OperatorID: operatorId,
                Direction: 0,
                OurBranchID: "", // Empty to search across all branches
                BankID: "00"
              };

              console.log("[BillAccountApplication] Retry payload:", retryPayload);

              try {
                const retryResponse = await BillAccountService.getAccountApplication(retryPayload);
                console.log("[BillAccountApplication] Retry response:", retryResponse);

                if (retryResponse?.success && retryResponse.data?.Details01?.length > 0) {
                  console.log("[BillAccountApplication] ✓ Found data with cross-branch search!");
                  responseData = retryResponse.data.Details01[0];

                  // Update the BranchID in form with the actual branch from the data
                  if (responseData.OurBranchID) {
                    console.log("[BillAccountApplication] Setting BranchID to:", responseData.OurBranchID);
                    setFieldValue('BranchID', responseData.OurBranchID);
                    // Also resolve branch name
                    if (responseData.OurBranchID) {
                      setTimeout(() => updateBranchNameFromBranchId(), 100);
                    }
                  }
                } else {
                  console.warn("[BillAccountApplication] Cross-branch search also returned no data");
                  setToast(`No data found for Application ID: ${formData.ApplicationID}. Please verify the ID.`, "warning");
                  return;
                }
              } catch (retryError) {
                console.error("[BillAccountApplication] Cross-branch search failed:", retryError);
                setToast(`No data found for Application ID: ${formData.ApplicationID}. Please verify the ID and branch.`, "warning");
                return;
              }
            } else {
              setToast(`No data found for Application ID: ${formData.ApplicationID || 'N/A'}. Please verify the ID.`, "warning");
              return;
            }
          } else {
            responseData = response.data.Details01[0];
            console.log("[BillAccountApplication] Extracted first item from Details01");
            console.log("[BillAccountApplication] Response data:", JSON.stringify(responseData, null, 2));
          }
        } else if (Array.isArray(response.data)) {
          // Fallback: if data is directly an array
          console.log("[BillAccountApplication] Data is array, length:", response.data.length);
          responseData = response.data.find(item => item.ApplicationID) || response.data[0];
          console.log("[BillAccountApplication] Response data:", JSON.stringify(responseData, null, 2));
        } else if (typeof response.data === 'object' && response.data !== null) {
          // Fallback: if data is a direct object with ApplicationID
          console.log("[BillAccountApplication] Data is object with keys:", Object.keys(response.data));
          if (response.data.ApplicationID) {
            responseData = response.data;
          }
        }

        // Normalize possible ID fields (some backends return SerialID or alternate casing)
        const resolvedAppId = responseData?.ApplicationID || responseData?.SerialID || responseData?.ApplicationId || responseData?.applicationId || null;
        if (resolvedAppId) {
          responseData.ApplicationID = String(resolvedAppId).trim();
        }

        console.log("[BillAccountApplication] Found ApplicationID:", !!responseData?.ApplicationID);
        console.log("[BillAccountApplication] Final responseData to populate:", JSON.stringify(responseData, null, 2));

        if (responseData && responseData.ApplicationID) {
          console.log("[BillAccountApplication] ✓ Data found, populating form...");

          // Helper: Convert datetime string to date-only format (YYYY-MM-DD)
          const extractDatePart = (dateStr) => {
            if (!dateStr) return '';
            const trimmed = String(dateStr).trim();
            if (!trimmed || trimmed === '0' || trimmed === 'null' || trimmed === 'undefined') return '';
            // Handle formats: 
            // "2025-08-29T00:00:00" -> "2025-08-29"
            // "2025-08-29 00:00:00" -> "2025-08-29"
            return trimmed.split('T')[0].split(' ')[0];
          };

          // Map all response fields to form fields
          // Response fields -> Form field names
          const mappedData = {
            ApplicationID: responseData.ApplicationID,
            OurBranchID: responseData.OurBranchID,
            BranchID: responseData.OurBranchID,
            BranchName: responseData.BranchName || responseData.OurBranchName,
            ClientID: responseData.ClientID,
            ClientName: responseData.ClientName,
            ProductID: responseData.ProductID,
            ProductName: responseData.ProductName,
            // If backend doesn't provide ApplicationDate, mirror CreatedOn (user request)
            ApplicationDate: extractDatePart(responseData.ApplicationDate || responseData.CreatedOn),
            AccountID: responseData.AccountID,
            AccountName: responseData.AccountName,
            ReferenceNumber: responseData.ReferenceNumber,
            Amount: responseData.Amount,
            ExpiryDate: extractDatePart(responseData.ExpiryDate),
            InterestRate: responseData.InterestRate,
            CreditAccountID: responseData.CreditAccountID,
            CreditAccountName: responseData.CreditAccountName,
            OverdueAccountID: responseData.OverdueAccountID,
            OverdueAccountName: responseData.OverdueAccountName,
            ExchangeRate: responseData.ExchangeRate,
            LocalAmount: responseData.LocalAmount,
            CurrencyID: responseData.CurrencyID,
            Remarks: responseData.Remarks,
            ApplicationStatus: responseData.BDAplnStatusID || responseData.BDApplnStatusID || responseData.ApplicationStatus,
            RejectedReason: responseData.RejectedReason,
            CreatedBy: responseData.CreatedBy,
            CreatedOn: extractDatePart(responseData.CreatedOn),
            ModifiedBy: responseData.ModifiedBy,
            ModifiedOn: extractDatePart(responseData.ModifiedOn),
            SupervisedBy: responseData.SupervisedBy,
            SupervisedOn: (responseData.SupervisedBy && String(responseData.SupervisedBy).trim()) ? extractDatePart(responseData.SupervisedOn) : '',
            UpdateCount: responseData.UpdateCount
          };

          lastLoadedUpdateCount = Number(responseData.UpdateCount) || 0;
          lastLoadedStatusId = responseData.BDAplnStatusID || responseData.BDApplnStatusID || null;
          lastLoadedApplicationId = String(responseData.ApplicationID).trim();

          console.log("[BillAccountApplication] Mapped data:", JSON.stringify(mappedData, null, 2));
          // Clear audit fields before populating
          clearAuditFields();
          // Call mapResponseToUI with the extracted responseData
          mapResponseToUI(responseData);

          setToast("Data retrieved successfully.", "success");
          console.log("[BillAccountApplication] ✓ Form populated");
        } else {
          console.warn("[BillAccountApplication] ⚠ No ApplicationID found in response data");
          setToast("No data found for the provided criteria.", "info");
        }
      } else {
        const errorMsg = response?.message || "Failed to retrieve data.";
        console.error("[BillAccountApplication] ✗ API returned success: false");
        console.error("[BillAccountApplication] Error message:", errorMsg);
        setToast(errorMsg, "danger");
      }
    } catch (error) {
      console.error("[BillAccountApplication] ✗ Exception caught:", error);
      console.error("[BillAccountApplication] Error message:", error?.message);
      console.error("[BillAccountApplication] Error stack:", error?.stack);
      setToast(error?.message || "An error occurred while fetching data.", "danger");
    }

    console.log("[BillAccountApplication] ========== onViewData END ==========");
  }

  // ============================================
  // OTHER HANDLERS
  // ============================================

  function mapResponseToUI(record) {
    if (!record) return;

    /* =============================
       Application Details
       ============================= */

    // Branch
    setFieldValue('BranchName', record.BranchName || record.OurBranchName || '');
    setFieldValue('BranchID', record.OurBranchID || '');

    // Application
    setFieldValue('ApplicationID', record.ApplicationID || '');

    // ApplicationDate - Format as ISO "YYYY-MM-DD" for Flatpickr compatibility, with fallback to CreatedOn
    const appDateRaw = record.ApplicationDate && !record.ApplicationDate.startsWith('1900')
      ? record.ApplicationDate
      : record.CreatedOn;

    let appDateISO = "";
    if (appDateRaw && !appDateRaw.startsWith('1900')) {
      const d = new Date(appDateRaw);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        appDateISO = `${y}-${m}-${day}`;
      }
    }
    setFieldValue('ApplicationDate', appDateISO);
    console.log('[mapResponseToUI] ApplicationDate set via ISO:', appDateISO);

    setFieldValue('ApplicationStatus', record.BDApplnStatusID || '');

    // Client
    setFieldValue('ClientID', record.ClientID || '');
    setFieldValue('ClientName', record.ClientName || '');

    // Account
    setFieldValue('AccountName', record.AccountName || '');
    setFieldValue('AccountID', record.AccountID || '');

    // Product
    setFieldValue('ProductName', record.ProductName || '');
    setFieldValue('ProductID', record.ProductID || '');

    // Remarks
    setFieldValue('Remarks', record.Remarks || '');

    /* =============================
       Audit Section
       ============================= */

    setFieldValue('CreatedBy', record.CreatedBy || '');
    setFieldValue('CreatedOn', formatDateTime(record.CreatedOn));

    setFieldValue('ModifiedBy', record.ModifiedBy || '');
    setFieldValue('ModifiedOn', formatDateTime(record.ModifiedOn));

    setFieldValue('SupervisedBy', record.SupervisedBy || '');
    // Always clear SupervisedOn - don't populate it from fetched data
    setFieldValue('SupervisedOn', '');
    console.log('[mapResponseToUI] SupervisedOn cleared');
  }

  function formatDate(dateStr) {
    if (!dateStr || dateStr.startsWith("1900")) return "";

    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function formatDateTime(dateStr) {
    if (!dateStr || dateStr.startsWith("1900")) return "";

    const d = new Date(dateStr);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }


  function clearAuditFields() {
    const auditFields = [
      "CreatedBy", "CreatedOn",
      "ModifiedBy", "ModifiedOn",
      "SupervisedBy", "SupervisedOn"
    ];

    auditFields.forEach(name => {
      const el = document.querySelector(`[name="${name}"]`);
      if (el) el.value = "";
    });
  }


  function openParentModal(modalId, fallbackUrl) {
    if (!modalId) return false;

    try {
      const parent = window.parent;
      const parentBootstrap = parent?.bootstrap;
      const modalEl = parent?.document?.getElementById(modalId);
      if (parentBootstrap?.Modal && modalEl) {
        if (modalId === "billSanctionDetailsModal") {
          const sourceModal = parent?.document?.getElementById("billAccountApplicationModal");
          const sourceDialog = sourceModal?.querySelector?.(".modal-dialog");
          const targetDialog = modalEl?.querySelector?.(".modal-dialog");

          const sourceWidth = sourceDialog?.getBoundingClientRect?.().width;
          const viewportWidth = parent?.window?.innerWidth;

          if (targetDialog && sourceWidth && viewportWidth) {
            const desiredWidth = Math.round(sourceWidth * 0.9);
            const clampedWidth = Math.min(desiredWidth, Math.round(viewportWidth * 0.98));
            targetDialog.style.maxWidth = `${clampedWidth}px`;
            targetDialog.style.width = `${clampedWidth}px`;
          }
        }

        parentBootstrap.Modal.getOrCreateInstance(modalEl, {
          backdrop: false,
          focus: false,
          keyboard: true
        }).show();
        return true;
      }
    } catch {
      // Ignore cross-frame errors
    }

    if (fallbackUrl) {
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
      return true;
    }
    return false;
  }

  function openSanctionDetails(modalId) {
    const fallbackUrl = "../form/bill-sanction-details.html";
    const opened = openParentModal(modalId, fallbackUrl);
    if (!opened) {
      setToast("Unable to open Account Sanction Details.", "warning");
    }
  }

  function clearForm() {
    // Backwards-compatible: allow callers to preserve branch fields when needed.
    // Usage: clearForm({ preserveBranch: true })
    const args = arguments[0] || {};
    const preserveBranch = Boolean(args.preserveBranch);

    let preservedBranchId = null;
    let preservedBranchName = null;
    if (preserveBranch) {
      preservedBranchId = form?.querySelector('[name="BranchID"]')?.value || '';
      preservedBranchName = form?.querySelector('[name="BranchName"]')?.value || '';
    }

    form?.reset();

    if (preserveBranch) {
      setFieldValue('BranchID', preservedBranchId);
      setFieldValue('BranchName', preservedBranchName);
    } else {
      // Reset the cached values so they can be looked up again
      lastResolvedBranchId = null;
      lastResolvedProductId = null;
    }

    hideToast();
    lastLoadedApplicationId = null;
    lastLoadedUpdateCount = 0;
    lastLoadedStatusId = null;
  }

  // Helper function to show a custom confirmation dialog
  function showConfirmDialog(message, subtitle = '') {
    return new Promise((resolve) => {
      let resolved = false;
      const modalId = `confirm-dialog-${Date.now()}`;
      const modalHTML = `
        <div class="modal fade" id="${modalId}" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
          <div class="modal-dialog modal-dialog-centered" style="max-width: 280px;">
            <div class="modal-content" style="border: none; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3), 0 5px 15px rgba(0,0,0,0.2); overflow: hidden;">
              <div class="modal-header bg-primary text-white py-1 px-2" style="background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%); border: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h6 class="modal-title mb-0" style="font-size: 0.85rem;">
                  <i class="bi bi-question-circle-fill me-1" style="font-size: 0.9rem;"></i>Confirm
                </h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" style="font-size: 0.7rem; padding: 0.25rem;"></button>
              </div>
              <div class="modal-body text-center py-2 px-2" style="background: linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%);">
                <div class="mb-1" style="display: inline-block; padding: 8px; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-radius: 50%; box-shadow: 0 4px 8px rgba(13,110,253,0.2), inset 0 -2px 4px rgba(0,0,0,0.1);">
                  <i class="bi bi-question-circle text-primary" style="font-size: 1.2rem; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.2));"></i>
                </div>
                <p class="mb-1" style="font-size: 0.8rem; font-weight: 500; text-shadow: 0 1px 2px rgba(0,0,0,0.05);">${message}</p>
                ${subtitle ? `<p class="text-muted mb-0" style="font-size: 0.7rem; text-shadow: 0 1px 1px rgba(0,0,0,0.05);">${subtitle}</p>` : ''}
              </div>
              <div class="modal-footer justify-content-center border-0 pt-0 pb-2 px-2" style="background: linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%); gap: 6px;">
                <button type="button" class="btn btn-primary px-2 py-1" id="confirm-ok-${modalId}" style="font-size: 0.75rem; border-radius: 6px; box-shadow: 0 3px 6px rgba(13,110,253,0.3), 0 1px 3px rgba(0,0,0,0.2); background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%); border: none; transform: translateY(0); transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(13,110,253,0.4), 0 2px 4px rgba(0,0,0,0.3)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 3px 6px rgba(13,110,253,0.3), 0 1px 3px rgba(0,0,0,0.2)';">
                  <i class="bi bi-check-circle me-1"></i>OK
                </button>
                <button type="button" class="btn btn-secondary px-2 py-1" data-bs-dismiss="modal" style="font-size: 0.75rem; border-radius: 6px; box-shadow: 0 3px 6px rgba(108,117,125,0.3), 0 1px 3px rgba(0,0,0,0.2); background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%); border: none; transform: translateY(0); transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(108,117,125,0.4), 0 2px 4px rgba(0,0,0,0.3)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 3px 6px rgba(108,117,125,0.3), 0 1px 3px rgba(0,0,0,0.2)';">
                  <i class="bi bi-x-circle me-1"></i>Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = modalHTML;
      document.body.appendChild(modalContainer);

      const modalEl = document.getElementById(modalId);
      const modal = new (window.bootstrap?.Modal || window.Modal)(modalEl);

      const okBtn = document.getElementById(`confirm-ok-${modalId}`);

      okBtn.addEventListener('click', () => {
        if (!resolved) {
          resolved = true;
          resolve(true);
        }
        modal.hide();
      });

      modalEl.addEventListener('hidden.bs.modal', () => {
        setTimeout(() => modalContainer.remove(), 100);
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      });

      modal.show();
    });
  }

  function handleSave() {
    void (async () => {
      if (!dependenciesReady) {
        setToast("System is still loading dependencies. Please wait.", "warning");
        return;
      }

      const BillAccountService = global.BillAccountService;
      if (!BillAccountService?.addEditAccountApplication) {
        setToast("Save service is not available.", "danger");
        return;
      }

      const operatorId = getOperatorId();
      if (!operatorId) {
        setToast("OperatorID not found. Please login again.", "warning");
        return;
      }

      const requestData = buildSaveRequestData();
      const applicationId = requestData.ApplicationID || "New";

      // Show custom confirmation dialog
      const confirmed = await showConfirmDialog(
        'Are you sure you want to save this record?',
        `[Application ID: ${applicationId}]`
      );

      if (!confirmed) {
        console.log("[BillAccountApplication] Save cancelled by user");
        return;
      }

      console.info("[BillAccountApplication] Save clicked - RequestData:", requestData);

      setToast("Saving...", "info");

      try {
        const response = await BillAccountService.addEditAccountApplication(requestData);
        console.log("[BillAccountApplication] Save response:", response);

        if (response?.success) {
          // Extract generated ApplicationID
          const newAppId = extractGeneratedApplicationId(response);

          // Extract generated AccountID if present
          const newAccountId = (response.data?.AccountID || response.data?.Details01?.[0]?.AccountID || response.Details?.[0]?.AccountID || null);

          console.log("[BillAccountApplication] Extracted IDs - ApplicationID:", newAppId, "AccountID:", newAccountId);
          console.log("[BillAccountApplication] Full response data:", JSON.stringify(response, null, 2));

          // Populate ApplicationID if generated
          if (newAppId) {
            const appInput = form?.querySelector('[name="ApplicationID"]');
            if (appInput) {
              appInput.readOnly = false;
              appInput.value = newAppId;
              lastLoadedApplicationId = newAppId;
            }
          }

          // Populate AccountID if generated
          if (newAccountId) {
            const acctInput = form?.querySelector('[name="AccountID"]');
            if (acctInput) {
              acctInput.value = newAccountId;
            }
          }

          // Show success with generated IDs
          const successMsg = newAppId ? `Saved successfully. ApplicationID: ${newAppId}` : (newAccountId ? `Saved successfully. AccountID: ${newAccountId}` : "Saved successfully.");
          setToast(successMsg, "success");
          console.log("[BillAccountApplication] Save successful:", { ApplicationID: newAppId, AccountID: newAccountId });

          // Switch mode from ADD to UPDATE and reload complete form data
          if (activeMode === MODES.ADD && newAppId) {
            setMode(MODES.UPDATE);

            // Reload the complete form data after a brief delay to ensure backend has committed
            setTimeout(async () => {
              try {
                console.log("[BillAccountApplication] Reloading form data for ApplicationID:", newAppId);
                await onViewData();
              } catch (err) {
                console.error("[BillAccountApplication] Failed to reload after save:", err);
              }
            }, 300);
          }
        } else {
          console.error("[BillAccountApplication] Save failed - response:", response);

          // Provide user-friendly error messages for known error codes
          let errorMessage = response?.message || "Save failed.";

          if (response?.code === "091" || /Cannot create multiple Applications/i.test(errorMessage)) {
            const accountId = requestData?.AccountID || "this account";
            errorMessage = `This Account (${accountId}) already has an application. Please either:\n• Use a different Account ID, or\n• Click VIEW to search and update the existing application`;
          }

          setToast(errorMessage, "danger");
        }
      } catch (err) {
        console.error("[BillAccountApplication] Save exception:", err);
        setToast(err?.message || "Save failed due to an unexpected error.", "danger");
      }
    })();
  }

  function handleDelete() {
    void (async () => {
      if (activeMode === MODES.ADD) {
        setToast("Cannot delete - no record loaded.", "warning");
        return;
      }

      if (!dependenciesReady) {
        setToast("System is still loading dependencies. Please wait.", "warning");
        return;
      }

      const BillAccountService = global.BillAccountService;
      if (!BillAccountService?.deleteAccountApplication) {
        setToast("Delete service is not available.", "danger");
        return;
      }

      const formData = getFormPayload();
      const applicationId = (formData.ApplicationID || "").toString().trim();
      const branchId = (formData.BranchID || formData.OurBranchID || "").toString().trim();
      const accountId = (formData.AccountID || "").toString().trim();

      if (!applicationId) {
        setToast("Please enter an ApplicationID to delete.", "warning");
        return;
      }

      // Show custom confirmation dialog
      const confirmed = await showConfirmDialog(
        'Are you sure you want to delete the entry ?',
        `[No:${applicationId}]`
      );

      if (!confirmed) {
        console.log("[BillAccountApplication] Delete cancelled by user");
        return;
      }

      const requestData = {
        ApplicationID: applicationId,
        OurBranchID: branchId,
        AccountID: accountId
      };

      console.log("[BillAccountApplication] Delete request:", requestData);
      setToast("Deleting...", "info");

      try {
        const response = await BillAccountService.deleteAccountApplication(requestData);
        console.log("[BillAccountApplication] Delete response:", response);

        if (response?.success) {
          console.log("[BillAccountApplication] Delete successful");

          // Show success message
          setToast("Data deleted successfully", "success");

          // Delay clearing the form so user can see the success message
          setTimeout(() => {
            clearForm();
            setMode(MODES.VIEW);
            setTimeout(() => {
              form?.querySelector('[name="ApplicationID"]')?.focus();
            }, 50);
          }, 1500);
        } else {
          console.error("[BillAccountApplication] Delete failed - response:", response);
          setToast(response?.message || "Delete failed.", "danger");
        }
      } catch (err) {
        console.error("[BillAccountApplication] Delete exception:", err);
        setToast(err?.message || "Delete failed due to an unexpected error.", "danger");
      }
    })();
  }

  function handleCancel() {
    clearForm();
    setMode(MODES.VIEW);
    setTimeout(() => {
      form?.querySelector('[name="ApplicationID"]')?.focus();
    }, 50);
    setToast("Cancelled.", "info");
  }

  const sections = () => Array.from(document.querySelectorAll("[data-section]"));

  function getActiveSectionIndex() {
    const nodes = sections();
    if (!nodes.length) return -1;
    const top = (document.scrollingElement || document.documentElement).scrollTop;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    nodes.forEach((node, index) => {
      const distance = Math.abs(node.getBoundingClientRect().top);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    return bestIndex;
  }

  async function goPrevNext(direction) {
    // direction: -1 for Previous, +1 for Next
    console.log(`[BillAccountApplication] goPrevNext called: direction=${direction}`);

    if (!dependenciesReady) {
      setToast("System is still loading. Please wait.", "warning");
      return;
    }

    const formData = getFormPayload();
    const currentAppId = formData.ApplicationID || '';

    if (!currentAppId) {
      setToast("Please load an Application ID first before navigating.", "warning");
      return;
    }

    // Use Direction parameter: 0=current, 1=next, 2=previous
    const apiDirection = direction === 1 ? 1 : 2;

    setToast(`Loading ${direction === 1 ? 'next' : 'previous'} record...`, "info");

    try {
      const BillAccountService = global.BillAccountService;
      if (!BillAccountService?.getAccountApplication) {
        setToast("Service not available", "danger");
        return;
      }

      const formBranchId = formData.BranchID?.trim() || '';
      const defaultBranchId = document.getElementById("BranchID")?.value || "0101";
      const ourBranchId = formBranchId || defaultBranchId;

      const payload = {
        ApplicationID: currentAppId,
        AccountID: formData.AccountID || "",
        OperatorID: getOperatorId(),
        Direction: apiDirection,
        OurBranchID: ourBranchId,
        BankID: "00"
      };

      console.log(`[BillAccountApplication] Navigation payload:`, payload);

      const response = await BillAccountService.getAccountApplication(payload);
      console.log(`[BillAccountApplication] Navigation response:`, response);

      if (response?.success) {
        // Try to extract data from different response structures
        let responseData = null;

        if (response.data?.Details01 && Array.isArray(response.data.Details01) && response.data.Details01.length > 0) {
          responseData = response.data.Details01[0];
          console.log(`[BillAccountApplication] Found data in Details01`);
        } else if (response.data?.Details && Array.isArray(response.data.Details) && response.data.Details.length > 0) {
          responseData = response.data.Details[0];
          console.log(`[BillAccountApplication] Found data in Details`);
        } else if (Array.isArray(response.data) && response.data.length > 0) {
          responseData = response.data[0];
          console.log(`[BillAccountApplication] Found data directly in array`);
        } else if (response.Details && Array.isArray(response.Details) && response.Details.length > 0) {
          responseData = response.Details[0];
          console.log(`[BillAccountApplication] Found data in response.Details`);
        }

        if (!responseData || !responseData.ApplicationID) {
          console.warn(`[BillAccountApplication] No ${direction === 1 ? 'next' : 'previous'} record found in response`);
          setToast(`No ${direction === 1 ? 'next' : 'previous'} record found.`, "warning");
          return;
        }

        console.log(`[BillAccountApplication] ${direction === 1 ? 'Next' : 'Previous'} record loaded:`, responseData.ApplicationID);
        console.log(`[BillAccountApplication] Response data:`, responseData);

        // Populate form with new data
        populateForm(responseData);
        setMode(MODES.UPDATE);
        setToast(`Loaded ${direction === 1 ? 'next' : 'previous'} record: ${responseData.ApplicationID}`, "success");

        // Update tracking
        lastLoadedApplicationId = String(responseData.ApplicationID).trim();
        lastLoadedUpdateCount = Number(responseData.UpdateCount) || 0;
        lastLoadedStatusId = responseData.BDApplnStatusID || null;

      } else {
        console.error(`[BillAccountApplication] Navigation failed:`, response);
        setToast(`No ${direction === 1 ? 'next' : 'previous'} record found.`, "warning");
      }

    } catch (error) {
      console.error(`[BillAccountApplication] Error navigating ${direction === 1 ? 'next' : 'previous'}:`, error);
      setToast(`Error loading ${direction === 1 ? 'next' : 'previous'} record.`, "danger");
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  let lastResolvedBranchId = null;
  let branchResolveNonce = 0;

  async function updateBranchNameFromBranchId() {
    const branchIdInput = form?.querySelector('[name="BranchID"]');
    const raw = (branchIdInput?.value || '').toString().trim();
    console.log('[BillAccountApplication] updateBranchNameFromBranchId start', { raw, activeMode, lastResolvedBranchId });

    if (!raw) {
      lastResolvedBranchId = null;
      setFieldValue('BranchName', '');
      return;
    }

    // Avoid duplicate calls for same value
    if (raw === lastResolvedBranchId) return;

    // Make sure we ignore stale async responses
    const nonce = ++branchResolveNonce;
    setFieldValue('BranchName', '');

    // Show spinner if present
    const spinner = document.getElementById('branch-name-spinner');
    try {
      spinner?.classList.remove('d-none');
      const name = await resolveBranchName(raw);
      console.log('[BillAccountApplication] updateBranchNameFromBranchId: resolved name', name);
      if (nonce !== branchResolveNonce) return;
      setFieldValue('BranchName', name || '');
      if (name) {
        lastResolvedBranchId = raw;
      }
    } catch (err) {
      console.error('[BillAccountApplication] Branch name resolution failed:', err);
      setFieldValue('BranchName', '');
    } finally {
      // Hide spinner
      spinner?.classList.add('d-none');
    }
  }

  let lastResolvedProductId = null;
  let productResolveNonce = 0;
  async function updateProductNameFromProductId() {
    // Allow in all modes - user should be able to lookup product names
    const input = form?.querySelector('[name="ProductID"]');
    const raw = (input?.value || '').toString().trim();
    if (!raw) {
      lastResolvedProductId = null;
      setFieldValue('ProductName', '');
      return;
    }
    if (raw === lastResolvedProductId) return;
    const nonce = ++productResolveNonce;
    setFieldValue('ProductName', '');
    const name = await resolveProductName(raw);
    if (nonce !== productResolveNonce) return;
    setFieldValue('ProductName', name || '');
    if (name) lastResolvedProductId = raw;
  }

  let lastResolvedAccountId = null;
  let accountResolveNonce = 0;
  async function updateAccountNameFromAccountId() {
    // Allow in all modes - user should be able to lookup account names
    const input = form?.querySelector('[name="AccountID"]');
    const nameInput = form?.querySelector('[name="AccountName"]');
    const raw = (input?.value || '').toString().trim();
    const currentName = (nameInput?.value || '').toString().trim();

    if (!raw) {
      lastResolvedAccountId = null;
      setFieldValue('AccountName', '');
      return;
    }
    if (raw === lastResolvedAccountId) return;

    // Don't clear and refetch if AccountName is already populated (e.g., from form load)
    if (currentName) {
      console.log('[BillAccountApplication] AccountName already populated, skipping resolution');
      lastResolvedAccountId = raw;
      return;
    }

    const nonce = ++accountResolveNonce;
    setFieldValue('AccountName', '');
    const name = await resolveAccountName(raw);
    if (nonce !== accountResolveNonce) return;
    setFieldValue('AccountName', name || '');
    if (name) lastResolvedAccountId = raw;
  }

  function init() {
    console.log("[BillAccountApplication] Initializing...");

    // Title bar button handlers - with debugging
    const titleBtns = document.querySelectorAll(".tf-title-btn");
    console.log("[BillAccountApplication] Found title buttons:", titleBtns.length);

    titleBtns.forEach((btn, index) => {
      const action = btn.dataset.action;
      console.log(`[BillAccountApplication] Attaching handler for button ${index}: action=${action}`);

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`[BillAccountApplication] Button clicked: action=${action}`);

        if (action === "refresh") {
          console.log("[BillAccountApplication] Refresh clicked");
          const iframe = window.parent?.document?.querySelector(".legacy-modal__iframe");
          if (iframe) {
            console.log("[BillAccountApplication] Reloading iframe");
            iframe.src = iframe.src;
          } else {
            console.warn("[BillAccountApplication] Could not find iframe to refresh");
          }
        } else if (action === "minimize") {
          console.log("[BillAccountApplication] Minimize clicked");
          try {
            window.parent?.postMessage({ type: "window-action", action: "minimize" }, "*");
          } catch (err) {
            console.warn("[BillAccountApplication] Could not minimize:", err);
          }
        } else if (action === "maximize") {
          console.log("[BillAccountApplication] Maximize clicked");
          try {
            window.parent?.postMessage({ type: "window-action", action: "maximize" }, "*");
          } catch (err) {
            console.warn("[BillAccountApplication] Could not maximize:", err);
          }
        } else if (action === "close") {
          console.log("[BillAccountApplication] Close clicked");
          try {
            if (window.parent && window.parent.document) {
              const modal = window.parent.document.querySelector("#billAccountApplicationModal");
              if (modal) {
                console.log("[BillAccountApplication] Found modal, attempting to close");
                if (window.parent.bootstrap && window.parent.bootstrap.Modal) {
                  const bootstrapModal = window.parent.bootstrap.Modal.getInstance(modal);
                  if (bootstrapModal) {
                    bootstrapModal.hide();
                    console.log("[BillAccountApplication] Closed via Bootstrap");
                    return;
                  }
                }
                modal.style.display = 'none';
                modal.classList.remove('show');
                modal.classList.remove('fade');
                modal.setAttribute('aria-hidden', 'true');
                const backdrop = window.parent.document.querySelector('.modal-backdrop');
                if (backdrop) backdrop.remove();
                console.log("[BillAccountApplication] Closed via manual method");
                return;
              }
            }
            if (window.parent && window.parent.document) {
              const dismissBtn = window.parent.document.querySelector("#billAccountApplicationModal .btn-close");
              if (dismissBtn) {
                dismissBtn.click();
                console.log("[BillAccountApplication] Closed via btn-close");
                return;
              }
            }
            console.warn("[BillAccountApplication] Could not find modal to close");
          } catch (err) {
            console.warn("[BillAccountApplication] Error closing modal:", err);
          }
        }
      });
    });

    // Attach search handlers
    attachSearchHandler("[data-branch-search]", () => form?.querySelector("[name=BranchID]")?.value, "searchBranches", "Branch", "BranchID", "BranchName");
    attachSearchHandler("[data-client-search]", () => form?.querySelector("[name=ClientID]")?.value, "searchClients", "Client", "ClientID", "ClientName");
    attachSearchHandler("[data-product-search]", () => form?.querySelector("[name=ProductID]")?.value, "searchProducts", "Product", "ProductID", "ProductName");
    attachSearchHandlerWithFilter("[data-account-search]", () => form?.querySelector("[name=AccountID]")?.value, "searchBillAccounts", "Account", "AccountID", "AccountName", () => form?.querySelector("[name=ClientID]")?.value);
    attachSearchHandler("[data-application-search]", () => form?.querySelector("[name=ApplicationID]")?.value, "searchApplications", "Application", "ApplicationID", "ClientName");

    // Calendar toggle for native date inputs
    document.querySelectorAll('[data-date-toggle]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const fieldName = btn.getAttribute('data-date-toggle');
        const input = (btn.previousElementSibling && btn.previousElementSibling.tagName === 'INPUT')
          ? btn.previousElementSibling
          : form?.querySelector(`[name="${fieldName}"]`);
        if (input) {
          try {
            if (typeof input.showPicker === 'function') {
              input.showPicker();
            } else {
              input.focus();
              input.click();
            }
          } catch {
            input.focus();
          }
        }
      });
    });

    // Manual ApplicationID entry should auto-load the application when the user tabs out.
    const applicationIdInput = form?.querySelector('[name="ApplicationID"]');
    console.log("[BillAccountApplication] ApplicationID input element found:", !!applicationIdInput);

    if (applicationIdInput) {
      const triggerLoad = () => {
        const appId = (applicationIdInput.value || '').toString().trim();

        console.log("[BillAccountApplication] ApplicationID triggerLoad called:", {
          appId,
          activeMode,
          lastLoadedApplicationId
        });

        // Don't trigger if no ApplicationID entered
        if (!appId) {
          console.log("[BillAccountApplication] No ApplicationID entered, skipping load");
          return;
        }

        // Don't reload if it's the same ApplicationID we just loaded (unless it was cleared)
        if (appId === lastLoadedApplicationId && lastLoadedApplicationId !== null) {
          console.log("[BillAccountApplication] Same ApplicationID already loaded, skipping");
          return;
        }

        // Switch to VIEW/UPDATE mode if currently in ADD mode (user is now loading existing data)
        if (activeMode === MODES.ADD) {
          console.log("[BillAccountApplication] Switching from ADD to VIEW mode");
          setMode(MODES.VIEW);
        }

        // Reset tracking variable to allow fresh load
        console.log("[BillAccountApplication] Resetting lastLoadedApplicationId before load");
        lastLoadedApplicationId = null;

        console.log("[BillAccountApplication] Triggering data load for ApplicationID:", appId);
        console.log("[BillAccountApplication] Current BranchID in form:", form?.querySelector('[name="BranchID"]')?.value || 'N/A');
        void onViewData();
      };

      applicationIdInput.addEventListener('change', () => {
        console.log("[BillAccountApplication] ApplicationID change event fired");
        triggerLoad();
      });

      applicationIdInput.addEventListener('blur', () => {
        console.log("[BillAccountApplication] ApplicationID blur event fired");
        triggerLoad();
      });

      applicationIdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          console.log("[BillAccountApplication] ApplicationID Enter key pressed");
          e.preventDefault();
          triggerLoad();
        }
        if (e.key === 'Tab') {
          console.log("[BillAccountApplication] ApplicationID Tab key pressed");
        }
      });

      console.log("[BillAccountApplication] ApplicationID event listeners attached");
    } else {
      console.error("[BillAccountApplication] ApplicationID input element not found!");
    }

    // Manual BranchID entry should populate BranchName (same behavior as magnifier selection)
    // Using event delegation to survive form clears/refreshes
    const branchIdInput = form?.querySelector('[name="BranchID"]');
    if (branchIdInput) {
      // Attach listeners to form instead of individual input
      form.addEventListener('change', (e) => {
        if (e.target.name === 'BranchID') {
          console.log('[BillAccountApplication] BranchID change detected via delegation');
          updateBranchNameFromBranchId();
        }
      }, true);

      form.addEventListener('blur', (e) => {
        if (e.target.name === 'BranchID') {
          console.log('[BillAccountApplication] BranchID blur detected via delegation');
          updateBranchNameFromBranchId();
        }
      }, true);

      form.addEventListener('keydown', (e) => {
        if (e.target.name === 'BranchID' && e.key === 'Enter') {
          console.log('[BillAccountApplication] BranchID Enter detected via delegation');
          e.preventDefault();
          updateBranchNameFromBranchId();
        }
      }, true);
    }

    const productIdInput = form?.querySelector('[name="ProductID"]');
    if (productIdInput) {
      productIdInput.addEventListener('change', () => updateProductNameFromProductId());
      productIdInput.addEventListener('blur', () => updateProductNameFromProductId());
      productIdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          updateProductNameFromProductId();
        }
      });
    }

    const accountIdInput = form?.querySelector('[name="AccountID"]');
    if (accountIdInput) {
      accountIdInput.addEventListener('change', () => updateAccountNameFromAccountId());
      accountIdInput.addEventListener('blur', () => updateAccountNameFromAccountId());
      accountIdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          updateAccountNameFromAccountId();
        }
      });
    }

    // Auto-resize Remarks textarea - expand when typing
    const remarksTextarea = form?.querySelector('[name="Remarks"]');
    if (remarksTextarea) {
      remarksTextarea.addEventListener('input', function () {
        // Only expand when there's actual content
        if (this.value.length > 0) {
          this.style.height = '22px'; // Reset to minimum
          this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        } else {
          this.style.height = '22px'; // Reset to minimum when empty
        }
      });
    }

    // Attach View button and mode handlers
    document.querySelectorAll("[data-shell-mode]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const newMode = button.dataset.shellMode;
        console.log("[BillAccountApplication] Mode changed to:", newMode);
        setMode(newMode);

        const normalized = normalizeMode(newMode);
        if (normalized === MODES.VIEW) {
          console.log("[BillAccountApplication] Triggering onViewData");
          onViewData();
        } else if (normalized === MODES.ADD) {
          // Preserve BranchID/BranchName when switching to Add mode per UX requirement
          clearForm({ preserveBranch: true });
        }
      });
    });

    // Auto-fetch client data when ClientID is entered (ADD/UPDATE modes)
    // Using event delegation to survive form clears/refreshes
    const clientIdInput = form?.querySelector('[name="ClientID"]');
    if (clientIdInput) {
      const triggerFetch = async () => {
        const currentClientIdInput = form?.querySelector('[name="ClientID"]');
        const clientId = (currentClientIdInput?.value || "").toString().trim();
        console.log('[BillAccountApplication] triggerFetch client start', { activeMode, clientId });

        // Allow client lookup in all modes
        if (!clientId) return;

        // Clear ClientName while fetching (do not clear BranchID/BranchName per UX requirement)
        setFieldValue('ClientName', '');

        setToast(`Loading Client ${clientId}...`, "info");
        try {
          const payload = await fetchClientById(clientId);
          if (!payload) {
            lastLoadedClient = null;
            // Keep ClientID in field - don't clear it
            // Show info message that allows user to proceed
            //npm run devsetToast(`Client ${clientId} details not found. You can still proceed with this ClientID.`, "info");

            // Move cursor to next field to allow user to continue
            setTimeout(() => {
              try {
                const productInput = form?.querySelector('[name="ProductID"]');
                if (productInput) productInput.focus();
              } catch (err) {
                console.warn('[BillAccountApplication] Failed to focus ProductID', err);
              }
            }, 50);
            return;
          }
          lastLoadedClient = payload;

          // Populate dedicated read-only fields
          const branchId = payload.OurBranchID || payload.BranchID || payload.branchId || payload.branchID || form?.querySelector('[name="BranchID"]')?.value || "";
          if (branchId) {
            setFieldValue('BranchID', String(branchId).trim());
          }

          let branchName = payload.BranchName || payload.OurBranchName || payload.branchName || null;
          if (!branchName && branchId) {
            branchName = await resolveBranchName(branchId);
          }
          if (branchName) {
            setFieldValue('BranchName', String(branchName).trim());
          }

          const clientName = payload.ClientName
            || payload.Name
            || payload.CompanyName
            || [payload.FirstName, payload.MiddleName, payload.LastName].filter(Boolean).join(' ')
            || null;
          if (clientName) {
            setFieldValue('ClientName', String(clientName).trim());
            // After client name is resolved, move cursor to ProductID per UX requirement.
            setTimeout(() => {
              try {
                const productInput = form?.querySelector('[name="ProductID"]');
                if (productInput) productInput.focus();
              } catch (err) {
                console.warn('[BillAccountApplication] Failed to focus ProductID', err);
              }
            }, 50);
          }

          // Dedicated read-only fields are populated (per UI requirement).
          setToast(clientName ? `Client loaded: ${clientName}` : `Client ${clientId} loaded.`, "success");
        } catch (error) {
          console.error("[BillAccountApplication] Client fetch failed:", error);
          lastLoadedClient = null;
          // Keep ClientID in field even on error
          setToast(error?.message || "Unable to load client details. You can still proceed with this ClientID.", "warning");

          // Allow user to continue to next field
          setTimeout(() => {
            try {
              const productInput = form?.querySelector('[name="ProductID"]');
              if (productInput) productInput.focus();
            } catch (err) {
              console.warn('[BillAccountApplication] Failed to focus ProductID', err);
            }
          }, 50);
        }
      };

      // Attach listeners to form using event delegation for better reliability
      form.addEventListener('keydown', (e) => {
        if (e.target.name === 'ClientID' && e.key === 'Enter') {
          console.log('[BillAccountApplication] ClientID Enter detected via delegation');
          e.preventDefault();
          void triggerFetch();
        }
      }, true);

      form.addEventListener('blur', (e) => {
        if (e.target.name === 'ClientID') {
          console.log('[BillAccountApplication] ClientID blur detected via delegation');
          void triggerFetch();
        }
      }, true);

      form.addEventListener('change', (e) => {
        if (e.target.name === 'ClientID') {
          console.log('[BillAccountApplication] ClientID change detected via delegation');
          void triggerFetch();
        }
      }, true);
    }

    // Attach other action buttons
    document.querySelector("[data-submit-action='save']")?.addEventListener("click", (event) => {
      event.preventDefault();
      handleSave();
    });

    document.querySelector("[data-submit-action='delete']")?.addEventListener("click", (event) => {
      event.preventDefault();
      handleDelete();
    });

    document.querySelector("[data-submit-action='clear']")?.addEventListener("click", (event) => {
      event.preventDefault();
      clearForm({ preserveBranch: true });
      // After clearing, switch to VIEW mode and focus on ApplicationID so user can search/load
      setMode(MODES.VIEW);
      setTimeout(() => {
        form?.querySelector('[name="ApplicationID"]')?.focus();
      }, 50);
      setToast("Cleared.", "info");
    });

    document.querySelector("[data-submit-action='cancel']")?.addEventListener("click", (event) => {
      event.preventDefault();
      handleCancel();
    });

    // Attach navigation handlers
    document.querySelectorAll("[data-dataentry-link]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const sectionId = button.dataset.dataentryLink;
        if (sectionId) {
          scrollToSection(sectionId);
        }
      });
    });

    document.querySelectorAll("[data-stepper-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const dir = (button.dataset.stepperAction || "").toLowerCase() === "next" ? 1 : -1;
        goPrevNext(dir);
      });
    });

    // Attach modal handlers (inline first, then parent as fallback)
    document.addEventListener(
      "click",
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const inlineOpener = target.closest?.('[data-open-inline-modal]');
        if (inlineOpener) {
          const modalId = inlineOpener.dataset.openInlineModal;
          if (modalId) {
            event.preventDefault();
            event.stopPropagation();
            try {
              const el = document.getElementById(modalId);
              if (el) {
                const modal = window.bootstrap?.Modal?.getOrCreateInstance(el);
                modal?.show?.();
                return;
              }
            } catch (err) {
              console.warn('[BillAccountApplication] Failed to open inline modal', err);
            }
          }
        }

        const parentOpener = target.closest?.('[data-open-parent-modal]');
        if (parentOpener) {
          if (("disabled" in parentOpener && parentOpener.disabled) || parentOpener.getAttribute?.("aria-disabled") === "true") {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          openSanctionDetails(parentOpener.dataset.openParentModal);
        }
      },
      true
    );

    // Initialize mode - default to VIEW mode to allow searching for existing records
    // User can switch to ADD mode when they want to create new applications
    setMode(MODES.VIEW);

    // Auto-load logged-in user's branch on initialization (with small delay to ensure form is ready)
    setTimeout(() => {
      void autoLoadLoggedInBranch();
    }, 100);

    console.log("[BillAccountApplication] Initialization complete - Starting in VIEW mode");
  }

  /**
   * Auto-load the logged-in user's branch into the BranchID field
   * Only loads if the field is empty (allows manual override)
   */
  async function autoLoadLoggedInBranch() {
    try {
      const branchIdInput = form?.querySelector('[name="BranchID"]');
      const branchNameInput = form?.querySelector('[name="BranchName"]');

      if (!branchIdInput) {
        console.warn("[BillAccountApplication] BranchID input not found");
        return;
      }

      // Only auto-load if the field is empty
      const currentValue = (branchIdInput.value || '').trim();
      if (currentValue) {
        console.log("[BillAccountApplication] BranchID already has value:", currentValue);
        return;
      }

      // Get logged-in user's branch from session
      const session = global.AuthService?.getSession?.();
      const loggedInBranch = session?.branchId || session?.branchID || session?.OurBranchID || "";

      if (!loggedInBranch) {
        console.warn("[BillAccountApplication] No logged-in branch found in session");
        return;
      }

      console.log("[BillAccountApplication] Auto-loading logged-in branch:", loggedInBranch);

      // Set the BranchID
      branchIdInput.value = loggedInBranch;

      // Resolve and set the BranchName
      if (branchNameInput) {
        const branchName = await resolveBranchName(loggedInBranch);
        if (branchName) {
          branchNameInput.value = branchName;
          console.log("[BillAccountApplication] Successfully resolved branch name:", branchName);
        } else {
          console.warn("[BillAccountApplication] Could not resolve branch name for:", loggedInBranch);
        }
      }

      console.log("[BillAccountApplication] Successfully auto-loaded branch:", loggedInBranch);
    } catch (error) {
      console.error("[BillAccountApplication] Error auto-loading branch:", error);
    }
  }

})(window);
