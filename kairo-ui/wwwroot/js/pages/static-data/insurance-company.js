(() => {
  if (window.__kairoInsuranceCompanyPageLoaded) return;
  window.__kairoInsuranceCompanyPageLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  const state = {
    mode: MODES.VIEW,
    hasLoaded: false,
    recordNotFound: false,
    isBusy: false,
    lookupsLoaded: false,
    lookupsLoadingPromise: null,
    loadedUpdateCount: 0,
    loadedBankId: "",
    // Cache: cityOptions/countryOptions so we can reverse-lookup later
    cityOptions: [],
    countryOptions: [],
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

  // ==================== VALIDATION SUMMARY BANNER ====================
  function showSuccessMessage(message) {
    const banner = document.querySelector('.validation-summary');
    if (!banner) return;
    
    const textEl = banner.querySelector('.validation-summary__text');
    if (textEl) textEl.textContent = message;
    
    // Show the banner
    banner.style.display = 'flex';
    banner.style.alignItems = 'center';
    banner.classList.add('is-visible', 'validation-summary--success');
    
    // Setup close button
    const closeBtn = banner.querySelector('.validation-summary__close');
    if (closeBtn) {
      closeBtn.onclick = () => hideValidationSummary();
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => hideValidationSummary(), 5000);
  }
  
  function hideValidationSummary() {
    const banner = document.querySelector('.validation-summary');
    if (banner) {
      banner.style.display = 'none';
      banner.classList.remove('is-visible', 'validation-summary--success');
    }
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

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function getAuthWindow() {
    if (window.AuthService?.getSession) return window;
    if (window.parent && window.parent !== window && window.parent.AuthService?.getSession) return window.parent;
    return window;
  }

  function getEnvironmentWindow() {
    if (window.Environment) return window;
    if (window.parent && window.parent !== window && window.parent.Environment) return window.parent;
    return window;
  }

  function getLegacyContextIds() {
    const authWin = getAuthWindow();
    const envWin = getEnvironmentWindow();
    const env = envWin.Environment || {};
    const session = authWin.AuthService?.getSession?.() || {};

    // BankID naming varies a lot across modules/environments.
    const bankId = (
      session.bankId ||
      session.bankID ||
      session.BankID ||
      session.BankId ||
      env.BankID ||
      env.bankId ||
      env.defaultBankId ||
      "00"
    ).toString();
    // Many OldAPI procedures require OurBranchID to be non-empty.
    // Align the fallback behavior with other working static-data pages.
    const branchId = (
      session.branchId ||
      session.OurBranchID ||
      env.OurBranchID ||
      env.defaultOurBranchId ||
      "0101"
    ).toString();

    return { bankId, branchId };
  }

  function getServiceWindow() {
    // Prefer the current window if the service is already loaded there.
    if (window.StaticDataService) return window;
    if (window.parent && window.parent !== window && window.parent.StaticDataService) return window.parent;
    return null;
  }

  function getLoaderWindow() {
    if (window.ServiceLoader?.loadStaticDataService) return window;
    if (window.parent && window.parent !== window && window.parent.ServiceLoader?.loadStaticDataService) return window.parent;
    return null;
  }

  function getLookupServiceWindow() {
    if (window.LookupService) return window;
    if (window.parent && window.parent !== window && window.parent.LookupService) return window.parent;
    return null;
  }

  function getLookupLoaderWindow() {
    if (window.ServiceLoader?.loadLookupService) return window;
    if (window.parent && window.parent !== window && window.parent.ServiceLoader?.loadLookupService) return window.parent;
    return null;
  }

  async function ensureStaticDataService() {
    const existing = getServiceWindow();
    if (existing) return existing;

    const loaderWin = getLoaderWindow();
    if (!loaderWin) return null;

    await loaderWin.ServiceLoader.loadStaticDataService();
    return getServiceWindow() || loaderWin;
  }

  async function ensureLookupService() {
    const existing = getLookupServiceWindow();
    if (existing) return existing;

    const loaderWin = getLookupLoaderWindow();
    if (!loaderWin) return null;

    await loaderWin.ServiceLoader.loadLookupService();
    return getLookupServiceWindow() || loaderWin;
  }

  function populateSelectOptions(selectEl, options, { placeholder = "--Select--" } = {}) {
    if (!selectEl) return;

    const currentValue = selectEl.value;
    selectEl.innerHTML = "";

    const placeholderOpt = document.createElement("option");
    placeholderOpt.value = "";
    placeholderOpt.textContent = placeholder;
    selectEl.appendChild(placeholderOpt);

    const fragment = document.createDocumentFragment();
    (Array.isArray(options) ? options : []).forEach((opt) => {
      if (!opt) return;
      const value = opt.value == null ? "" : String(opt.value);
      const label = opt.label == null ? value : String(opt.label);
      if (!value) return;
      const optionEl = document.createElement("option");
      optionEl.value = value;
      optionEl.textContent = label;
      fragment.appendChild(optionEl);
    });
    selectEl.appendChild(fragment);

    setSelectValue(selectEl, currentValue);
  }

  async function ensureCityCountryLookupsLoaded() {
    if (state.lookupsLoaded) return;
    if (state.lookupsLoadingPromise) return state.lookupsLoadingPromise;

    state.lookupsLoadingPromise = (async () => {
      try {
        const lookupWin = await ensureLookupService();
        const svc = lookupWin?.LookupService;
        if (!svc?.getCities || !svc?.getCountries) return;

        // IMPORTANT:
        // Insurance Company legacy save expects CityID/CountryID codes (e.g. CITY001/03, KE/ET),
        // but the generic LookupService mapping can return numeric SubCodeID (e.g. 386).
        // Build options from raw system-code rows, preferring SubCode over SubCodeID.

        const getField = (obj, ...keys) => {
          if (!obj || typeof obj !== "object") return null;
          const entries = Object.keys(obj);
          for (const key of keys) {
            const lowerKey = key.toLowerCase();
            const actualKey = entries.find((k) => k.toLowerCase() === lowerKey);
            if (actualKey && obj[actualKey] != null) return obj[actualKey];
          }
          return null;
        };

        const extractRows = (resp) => {
          const raw = resp?.data?.Details || resp?.Details || resp?.data || [];
          const list = Array.isArray(raw) ? raw : (raw && typeof raw === "object" ? [raw] : []);
          return list.filter((x) => x && typeof x === "object");
        };

        const mapOptionsPreferSubCode = (rows) =>
          (Array.isArray(rows) ? rows : [])
            .map((row) => {
              const value =
                getField(row, "SubCode", "subcode") ||
                getField(row, "SubCodeID", "subcodeid", "Value", "ID", "CodeID") ||
                "";
              const label = getField(row, "CodeDescription", "codedescription", "Description", "Label", "Name") || value;
              const order = getField(row, "DisplayOrder", "displayorder", "Order", "SortOrder") ?? 0;
              return { value: String(value ?? ""), label: String(label ?? ""), order: Number(order ?? 0) || 0 };
            })
            .filter((x) => x.value)
            .sort((a, b) => a.order - b.order);

        let cities = null;
        let countries = null;

        if (typeof svc.getSystemCode === "function") {
          const [citiesResp, countriesResp] = await Promise.all([
            svc.getSystemCode({ CodeID: "CityID" }),
            svc.getSystemCode({ CodeID: "CountryID" }),
          ]);

          if (citiesResp?.success) cities = mapOptionsPreferSubCode(extractRows(citiesResp));
          if (countriesResp?.success) countries = mapOptionsPreferSubCode(extractRows(countriesResp));
        }

        if (!cities) cities = await svc.getCities();
        if (!countries) countries = await svc.getCountries();

        state.cityOptions = Array.isArray(cities) ? cities : [];
        state.countryOptions = Array.isArray(countries) ? countries : [];
        populateSelectOptions(qs("#City"), state.cityOptions, { placeholder: "--Select City--" });
        populateSelectOptions(qs("#Country"), state.countryOptions, { placeholder: "--Select Country--" });
        state.lookupsLoaded = true;
      } catch (error) {
        console.warn("[InsuranceCompany] Lookup load failed", error);
      }
    })();

    return state.lookupsLoadingPromise;
  }

  function extractOldApiRows(resp) {
    // OldAPI responses vary:
    // - resp.Details/resp.Details01 at top-level
    // - resp.data.Details/resp.data.Details01 inside data
    // Prefer Details01/Details02 (business rows), then Details.
    const candidates = [
      resp?.data?.Details01,
      resp?.Details01,
      resp?.data?.Details02,
      resp?.Details02,
      resp?.data?.Details,
      resp?.Details,
      resp?.data,
    ];

    const toRows = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value.filter((x) => x && typeof x === "object");
      if (typeof value === "object") return [value];
      return [];
    };

    for (const c of candidates) {
      const rows = toRows(c);
      if (rows.length) return rows;
    }

    return [];
  }

  function pickInsuranceCompanyRow(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return null;

    // Prefer rows that look like insurance-company payload.
    // Check for key insurance-related fields or any row with substantial data.
    const looksLikeInsurance = (r) => {
      if (!r || typeof r !== "object") return false;
      
      // Check for any of the expected insurance fields
      const hasInsuranceField = 
        r.InsuranceID != null || 
        r.insuranceID != null ||
        r.Company != null || 
        r.company != null ||
        r.Address1 != null || 
        r.address1 != null ||
        r.ContactPerson != null || 
        r.contactPerson != null ||
        r.Name != null ||
        r.name != null;
      
      if (hasInsuranceField) return true;
      
      // If no specific field found, accept if it's an object with at least 2 properties
      // (more likely to be real data than a wrapper object)
      return Object.keys(r).length >= 2;
    };

    return rows.find(looksLikeInsurance) || (rows.length > 0 ? rows[0] : null);
  }

  function getOperatorId() {
    try {
      const session = window.AuthService?.getSession?.();
      return session?.operatorId || session?.operatorID || session?.name || "web_portal";
    } catch {
      return "web_portal";
    }
  }

  function formatMDYHMS(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const month = pad2(date.getMonth() + 1);
    const day = pad2(date.getDate());
    const year = date.getFullYear();
    const hours = pad2(date.getHours());
    const minutes = pad2(date.getMinutes());
    const seconds = pad2(date.getSeconds());
    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
  }

  function clearCompanyForm({ keepId = true } = {}) {
    const form = qs("#insurance-company-form");
    if (!form) return;

    const keepInsuranceID = qs("#InsuranceID")?.value || "";

    qsa("input, select, textarea", form).forEach((el) => {
      if (el.tagName === "SELECT") {
        el.value = "";
        return;
      }
      el.value = "";
    });

    if (keepId && qs("#InsuranceID")) qs("#InsuranceID").value = keepInsuranceID;

    state.hasLoaded = false;
    state.recordNotFound = false;
    state.loadedUpdateCount = 0;
    state.loadedBankId = "";
  }

  function getFormSnapshot() {
    const read = (sel) => (qs(sel)?.value ?? "").toString().trim();
    return {
      InsuranceID: read("#InsuranceID"),
      Company: read("#Company"),
      Address1: read("#Address1"),
      Address2: read("#Address2"),
      City: read("#City"),
      Country: read("#Country"),
      ZipCode: read("#ZipCode"),
      EmailID: read("#EmailID"),
      Phone1: read("#Phone1"),
      Phone2: read("#Phone2"),
      Mobile: read("#Mobile"),
      FaxNo: read("#FaxNo"),
      ContactPerson: read("#ContactPerson"),
    };
  }

  function snapshotMatchesDesired(snapshot, desired) {
    if (!snapshot || !desired) return false;
    const norm = (v) => (v ?? "").toString().trim();
    const pairs = [
      ["Company", desired.Company],
      ["Address1", desired.Address1],
      ["Address2", desired.Address2],
      ["ZipCode", desired.ZipCode],
      ["EmailID", desired.EmailID],
      ["Phone1", desired.Phone1],
      ["Phone2", desired.Phone2],
      ["Mobile", desired.Mobile],
      ["FaxNo", desired.FaxNo],
      ["ContactPerson", desired.ContactPerson],
    ];

    // City/Country often differ by code-vs-id across environments; treat them as soft matches.
    const hardOk = pairs.every(([k, v]) => norm(snapshot[k]) === norm(v));
    return hardOk;
  }

  function toAlternateInsuranceXmlRowNode(xml) {
    if (!xml) return "";
    // Alternate attempt: strip default namespaces in case the proc expects non-namespaced nodes.
    if (xml.includes('xmlns="http://www.craftsilicon.com/banking/core"') || xml.includes('xmlns="BREntities.DS_Insurances"')) {
      return xml
        .replace(/\sxmlns=\"http:\/\/www\.craftsilicon\.com\/banking\/core\"/g, "")
        .replace(/\sxmlns=\"BREntities\.DS_Insurances\"/g, "");
    }

    // If already non-namespaced, return original.
    return xml;
  }

  function buildAddEditRequestData() {
    const now = new Date();
    const insuranceID = qs("#InsuranceID")?.value?.trim() || "";

    // IMPORTANT:
    // dbo.p_AddEditInsurances determines INSERT vs UPDATE by checking NewRecord:
    // - NewRecord = 1: Execute INSERT (add new record)
    // - NewRecord = 0: Execute UPDATE (modify existing record)
    // The UpdateCount field is sent separately for optimistic locking/concurrency checks.
    const isNewRecord =
      state.mode === MODES.ADD ||
      (state.recordNotFound === true && state.hasLoaded === false);

    const updateCount = Number(state.loadedUpdateCount || 0) || 0;

    const requestData = {
      InsuranceID: insuranceID,
      Company: qs("#Company")?.value?.trim() || "",
      Address1: qs("#Address1")?.value?.trim() || "",
      Address2: qs("#Address2")?.value?.trim() || "",
      City: qs("#City")?.value?.trim() || "",
      Country: qs("#Country")?.value?.trim() || "",
      ZipCode: qs("#ZipCode")?.value?.trim() || "",
      EmailID: qs("#EmailID")?.value?.trim() || "",
      Phone1: qs("#Phone1")?.value?.trim() || "",
      Phone2: qs("#Phone2")?.value?.trim() || "",
      Mobile: qs("#Mobile")?.value?.trim() || "",
      FaxNo: qs("#FaxNo")?.value?.trim() || "",
      ContactPerson: qs("#ContactPerson")?.value?.trim() || "",
      CreatedBy: qs("#CreatedBy")?.value?.trim() || getOperatorId(),
      CreatedOn: qs("#CreatedOn")?.value?.trim() || formatMDYHMS(now),
      ModifiedBy: getOperatorId(),
      ModifiedOn: formatMDYHMS(now),
      SupervisedBy: qs("#SupervisedBy")?.value?.trim() || "",
      SupervisedOn: qs("#SupervisedOn")?.value?.trim() || "",
      // NewRecord: 1 for INSERT, 0 for UPDATE (determines INSERT vs UPDATE logic in proc)
      NewRecord: isNewRecord ? 1 : 0,
      // UpdateCount: sent as-is for concurrency/optimistic locking checks in the proc
      UpdateCount: isNewRecord ? 0 : updateCount,
    };

    if (state.mode === MODES.UPDATE) {
      requestData.CreatedBy = qs("#CreatedBy")?.value?.trim() || requestData.CreatedBy;
      requestData.CreatedOn = qs("#CreatedOn")?.value?.trim() || requestData.CreatedOn;
    }

    return requestData;
  }

  function buildAddEditRequestDataWithCodes() {
    const data = buildAddEditRequestData();

    // Reverse-lookup City/Country codes from dropdown selections.
    // If the user selected from the dropdown, the dropdown value might differ from the original code.
    // We need to send back the same code format the backend expects.
    const cityVal = qs("#City")?.value?.trim() || "";
    const countryVal = qs("#Country")?.value?.trim() || "";

    // If we have cached options, find the matching code.
    if (state.cityOptions.length && cityVal) {
      const cityMatch = state.cityOptions.find((opt) => String(opt.value) === cityVal || String(opt.label) === cityVal);
      if (cityMatch) data.City = cityMatch.value;
    }

    if (state.countryOptions.length && countryVal) {
      const countryMatch = state.countryOptions.find((opt) => String(opt.value) === countryVal || String(opt.label) === countryVal);
      if (countryMatch) data.Country = countryMatch.value;
    }

    return data;
  }

  function xmlEscape(value) {
    if (value == null) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function normalizeLegacyDateTime(value) {
    if (!value) return "";
    // If it's already in our legacy format, keep it.
    const raw = String(value).trim();
    if (!raw) return "";
    if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(raw)) return raw;

    // Try parse ISO or other date strings.
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return formatMDYHMS(d);
    return raw;
  }

  function formatLegacyIsoDateTime(value) {
    if (!value) return "";
    const raw = String(value).trim();
    if (!raw) return "";

    // Keep ISO-ish timestamps as-is (legacy build uses ISO + timezone offset).
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(raw)) return raw;

    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;

    const yyyy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const hh = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());

    const offsetMinutes = -d.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const abs = Math.abs(offsetMinutes);
    const offH = pad2(Math.floor(abs / 60));
    const offM = pad2(abs % 60);
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}${sign}${offH}:${offM}`;
  }

  function buildInsuranceDtlsXml(requestData, { bankId } = {}) {
    // The legacy build uses a strongly-typed DataSet XML payload with namespaces.
    // The stored procedure likely parses this exact shape.
    const values = {
      Name: requestData.Company,
      Address1: requestData.Address1,
      Address2: requestData.Address2,
      Phone1: requestData.Phone1,
      Phone2: requestData.Phone2,
      EMail: requestData.EmailID,
      ContactPerson: requestData.ContactPerson,
      CreatedBy: requestData.CreatedBy,
      CreatedOn: formatLegacyIsoDateTime(requestData.CreatedOn),
      ModifiedBy: requestData.ModifiedBy,
      BankID: bankId || "",
      InsuranceID: requestData.InsuranceID,
      UpdateCount: requestData.UpdateCount,
      CityID: requestData.City,
      CountryID: requestData.Country,
      ZipCode: requestData.ZipCode,
      Fax: requestData.FaxNo,
      Mobile: requestData.Mobile,
      NewRecord: requestData.NewRecord,
    };

    const tags = Object.entries(values)
      .map(([k, v]) => `<${k}>${xmlEscape(v)}</${k}>`)
      .join("");

    return (
      `<dsInsurance xmlns="http://www.craftsilicon.com/banking/core">` +
      `<DS_Insurances xmlns="BREntities.DS_Insurances">` +
      `<dt_Insurances>` +
      `${tags}` +
      `</dt_Insurances>` +
      `</DS_Insurances>` +
      `</dsInsurance>`
    );
  }

  function setSelectValue(selectEl, value) {
    if (!selectEl) return;
    const v = value == null ? "" : String(value);
    const options = Array.from(selectEl.options);
    const has = options.some((o) => o.value === v);
    if (!has && v) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      selectEl.appendChild(opt);
    }
    selectEl.value = v;
  }

  function setSelectValueByLabel(selectEl, valueOrLabel) {
    if (!selectEl) return;
    const v = String(valueOrLabel ?? "").trim();
    if (!v) {
      selectEl.value = "";
      return;
    }

    // Try exact value match first.
    const options = Array.from(selectEl.options);
    const byValue = options.find((o) => String(o.value).trim() === v);
    if (byValue) {
      selectEl.value = byValue.value;
      return;
    }

    // Try label (case-insensitive, whitespace-normalized).
    const normalized = v.toLowerCase().replace(/\s+/g, " ");
    const byLabel = options.find((o) => {
      const label = String(o.textContent ?? "").trim().toLowerCase().replace(/\s+/g, " ");
      return label === normalized || label.includes(normalized) || normalized.includes(label);
    });
    if (byLabel) {
      selectEl.value = byLabel.value;
      return;
    }

    // Fallback: add as custom option.
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
    selectEl.value = v;
  }

  function applyCompanyDataToForm(data) {
    if (!data || typeof data !== "object") return;

    // Backend field names don't always match the UI element IDs.
    // Normalize the common variants here.
    const keyMap = {
      // Lookups
      CityID: "City",
      CountryID: "Country",

      // Common naming mismatches from OldAPI payloads
      Name: "Company",
      CompanyName: "Company",
      EMail: "EmailID",
      Email: "EmailID",
      Fax: "FaxNo",
      PostalCode: "ZipCode",
    };

    const findElementByIdInsensitive = (id) => {
      if (!id) return null;
      const direct = document.getElementById(id);
      if (direct) return direct;
      const lowered = String(id).toLowerCase();
      return (
        Array.from(document.querySelectorAll("[id]")).find((el) => el.id && el.id.toLowerCase() === lowered) || null
      );
    };

    for (const [key, value] of Object.entries(data)) {
      const mappedKey = keyMap[key] || key;
      let el = findElementByIdInsensitive(mappedKey);
      if (!el) continue;

      if (el.tagName === "SELECT") {
        // For selects, try label match first (more natural).
        setSelectValueByLabel(el, value);
        continue;
      }

      el.value = value == null ? "" : String(value);
    }
  }

  function getActionButtons() {
    return {
      view: qs('[data-shell-mode="View"]'),
      add: qs('[data-shell-mode="Add"]'),
      edit: qs('[data-shell-mode="Update"]'),
      del: qs('[data-insurance-company-action="delete"]'),
      save: qs('[data-insurance-company-action="save"]'),
      cancel: qs('[data-insurance-company-action="cancel"]'),
    };
  }

  function updateActionButtons() {
    const { view, add, edit, del, save, cancel } = getActionButtons();
    const isEditable = state.mode === MODES.ADD || state.mode === MODES.UPDATE;

    // Match Contact Person UX:
    // - View becomes disabled once a record is loaded.
    // - Add is enabled only when record doesn't exist.
    // - Save only in Add/Edit.
    // - Cancel available when editable or a record state exists.
    setButtonDisabled(view, state.isBusy || isEditable || (state.mode === MODES.VIEW && state.hasLoaded));
    setButtonDisabled(add, state.isBusy || !state.recordNotFound);
    setButtonDisabled(edit, state.isBusy || !state.hasLoaded || state.mode === MODES.UPDATE);
    setButtonDisabled(save, state.isBusy || !isEditable);
    setButtonDisabled(cancel, state.isBusy || !(isEditable || state.hasLoaded || state.recordNotFound));
    setButtonDisabled(del, state.isBusy || !state.hasLoaded);
  }

  function setMode(nextMode, { initial = false } = {}) {
    state.mode = nextMode;

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#insurance-company-form");
    if (!form) return;

    const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        return;
      }

      // Audit fields always read-only.
      if (["CreatedBy", "CreatedOn", "ModifiedBy", "ModifiedOn", "SupervisedBy", "SupervisedOn"].includes(el.id)) {
        el.disabled = true;
        return;
      }

      el.disabled = !isEditable;
    });

    qsa("button[data-always-enabled]", form).forEach((btn) => (btn.disabled = false));

    if (initial) {
      // Initial state: only View enabled.
      state.hasLoaded = false;
      state.recordNotFound = false;
      const { view, add, edit, del, save, cancel } = getActionButtons();
      setButtonDisabled(view, false);
      setButtonDisabled(add, true);
      setButtonDisabled(edit, true);
      setButtonDisabled(del, true);
      setButtonDisabled(save, true);
      setButtonDisabled(cancel, true);
      return;
    }

    if (isEditable) {
      // Best-effort: load City/Country options for edit modes.
      ensureCityCountryLookupsLoaded();
    }

    updateActionButtons();
  }

  async function handleSearchOrView({ quiet = false, intentLabel = "Loading" } = {}) {
    if (state.isBusy) return;
    const insuranceID = qs("#InsuranceID")?.value?.trim();
    if (!insuranceID) {
      if (!quiet) setToast("Enter Insurance ID.", "warning");
      return;
    }

    try {
      state.isBusy = true;
      updateActionButtons();
      if (!quiet) setToast(`${intentLabel}...`, "info");

      const svcWin = await ensureStaticDataService();
      if (!svcWin?.StaticDataService?.getInsurances) {
        if (!quiet) setToast("Service not available. Please refresh.", "danger");
        return;
      }

      const authWin = getAuthWindow();
      const { bankId, branchId } = getLegacyContextIds();

      const payload = {
        BankID: bankId,
        OurBranchID: branchId,
        InsuranceID: insuranceID,
        OperatorID: getOperatorId(),
        Direction: 0
      };

      const result = await svcWin.StaticDataService.getInsurances(payload);
      if (!result?.success) {
        clearCompanyForm({ keepId: true });
        state.hasLoaded = false;
        state.recordNotFound = true;
        state.loadedUpdateCount = 0;
        state.loadedBankId = "";
        setMode(MODES.VIEW);
        if (!quiet) setToast(result?.message || "Record doesn't exist. Click Add.", "warning");
        return;
      }

      const rows = extractOldApiRows(result);
      const row = pickInsuranceCompanyRow(rows);
      if (!row) {
        clearCompanyForm({ keepId: true });
        state.hasLoaded = false;
        state.recordNotFound = true;
        state.loadedUpdateCount = 0;
        state.loadedBankId = "";
        setMode(MODES.VIEW);
        if (!quiet) setToast("Record doesn't exist. Click Add.", "warning");
        return;
      }

      applyCompanyDataToForm(row);
      state.hasLoaded = true;
      state.recordNotFound = false;
      // UpdateCount comes back with many different key variants.
      state.loadedUpdateCount = Number(
        row.UpdateCount ??
        row.updateCount ??
        row.updatecount ??
        row.UpdateCnt ??
        row.updatecnt ??
        row.Update_Count ??
        row.update_count ??
        0
      ) || 0;
      state.loadedBankId = (row.BankID ?? row.bankid ?? "").toString();
      setMode(MODES.VIEW);
      if (!quiet) {
        const insuranceID = qs("#InsuranceID")?.value?.trim() || '';
        showSuccessMessage(`Insurance company loaded successfully: ${insuranceID}`);
      }
    } catch (error) {
      console.error("[InsuranceCompany] Company lookup failed", error);
      if (!quiet) setToast("Company lookup failed.", "danger");
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  // NEW FUNCTION: Refresh data before edit to get latest UpdateCount
  async function refreshUpdateCountBeforeEdit() {
    try {
      const svcWin = await ensureStaticDataService();
      if (!svcWin?.StaticDataService?.getInsurances) return false;
      
      const insuranceID = qs("#InsuranceID")?.value?.trim();
      if (!insuranceID) return false;
      
      const { bankId, branchId } = getLegacyContextIds();
      const payload = {
        BankID: bankId,
        OurBranchID: branchId,
        InsuranceID: insuranceID,
        OperatorID: getOperatorId(),
        Direction: 0
      };
      
      const freshResult = await svcWin.StaticDataService.getInsurances(payload);
      if (freshResult?.success) {
        const freshRows = extractOldApiRows(freshResult);
        const freshRow = pickInsuranceCompanyRow(freshRows);
        if (freshRow) {
          // Store the fresh UpdateCount
          state.loadedUpdateCount = Number(
            freshRow.UpdateCount ??
            freshRow.updateCount ??
            freshRow.updatecount ??
            freshRow.UpdateCnt ??
            freshRow.updatecnt ??
            freshRow.Update_Count ??
            freshRow.update_count ??
            0
          ) || 0;
          
          // Also update the form with any changed data
          applyCompanyDataToForm(freshRow);
          
          return true;
        }
      }
    } catch (e) {
      console.warn("[InsuranceCompany] Failed to refresh before edit:", e);
    }
    return false;
  }

  function bindModeButtons() {
    qsa("[data-shell-mode]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const next = btn.getAttribute("data-shell-mode");
        if (!next || !MODES[next.toUpperCase()]) return;
        const nextMode = MODES[next.toUpperCase()];

        if (nextMode === MODES.VIEW) {
          await handleSearchOrView({ intentLabel: "Loading" });
          return;
        }

        if (nextMode === MODES.ADD) {
          const id = qs("#InsuranceID")?.value?.trim() || "";
          if (!id) {
            setToast("Enter Insurance ID first.", "warning");
            return;
          }

          // Only allow Add if the ID does not already exist.
          try {
            const svcWin = await ensureStaticDataService();
            const { bankId, branchId } = getLegacyContextIds();
            const payload = {
              BankID: bankId,
              OurBranchID: branchId,
              InsuranceID: id,
              OperatorID: getOperatorId(),
              Direction: 0,
            };
            const check = await svcWin?.StaticDataService?.getInsurances?.(payload);
            const rows = check?.success ? extractOldApiRows(check) : [];
            const existing = pickInsuranceCompanyRow(rows);
            if (existing) {
              applyCompanyDataToForm(existing);
              state.hasLoaded = true;
              state.recordNotFound = false;
              state.loadedUpdateCount = Number(existing.UpdateCount ?? 0) || 0;
              state.loadedBankId = (existing.BankID ?? "").toString();
              setMode(MODES.VIEW);
              setToast("This ID already exists. Loaded in View.", "warning");
              return;
            }
          } catch (e) {
            console.warn("[InsuranceCompany] Add existence check failed", e);
          }

          clearCompanyForm({ keepId: true });
          state.recordNotFound = true;
          setMode(MODES.ADD);
          setToast("Add mode.", "info");
          return;
        }

        if (nextMode === MODES.UPDATE) {
          if (!state.hasLoaded) {
            setToast("Load a record first (View/Search) before editing.", "warning");
            return;
          }
          
          setToast("Refreshing data for editing...", "info");
          
          const refreshed = await refreshUpdateCountBeforeEdit();
          if (!refreshed) {
            setToast("Could not refresh record data. It may have been modified by another user.", "warning");
            return;
          }
          
          setMode(MODES.UPDATE);
          setToast("Edit mode. Make your changes and click Save.", "info");
        }
      });
    });
  }

  function bindActions() {
    const searchBtn = qs('[data-insurance-company-action="search"]');
    const saveBtn = qs('[data-insurance-company-action="save"]');
    const cancelBtn = qs('[data-insurance-company-action="cancel"]');
    const deleteBtn = qs('[data-insurance-company-action="delete"]');

    searchBtn?.addEventListener("click", async () => {
      await handleSearchOrView({ intentLabel: "Searching" });
    });

    saveBtn?.addEventListener("click", async () => {
      if (state.mode === MODES.VIEW) {
        setToast("Switch to Add/Edit before saving.", "warning");
        return;
      }

      const form = qs("#insurance-company-form");
      if (!form?.checkValidity?.()) {
        form?.reportValidity?.();
        setToast("Please fill all required fields.", "warning");
        return;
      }

      const requestDataWithCodes = buildAddEditRequestDataWithCodes();
      
      setToast("Saving (will verify)...", "info");

      const { bankId, branchId } = getLegacyContextIds();
      const effectiveBankId = state.loadedBankId || bankId;
      const desiredBeforeSave = { ...requestDataWithCodes };

      // IMPORTANT: The actual proc is p_AddEditInsurances (plural) and takes individual parameters.
      // It does NOT expect XML - send flat parameters matching the proc signature.
      const payload = {
        BankID: effectiveBankId,
        InsuranceID: requestDataWithCodes.InsuranceID,
        Name: requestDataWithCodes.Company,
        Address1: requestDataWithCodes.Address1,
        Address2: requestDataWithCodes.Address2,
        CityID: requestDataWithCodes.City,
        CountryID: requestDataWithCodes.Country,
        ZipCode: requestDataWithCodes.ZipCode,
        Phone1: requestDataWithCodes.Phone1,
        Phone2: requestDataWithCodes.Phone2,
        Mobile: requestDataWithCodes.Mobile,
        EMail: requestDataWithCodes.EmailID,
        Fax: requestDataWithCodes.FaxNo,
        ContactPerson: requestDataWithCodes.ContactPerson,
        CreatedBy: requestDataWithCodes.CreatedBy,
        CreatedOn: requestDataWithCodes.CreatedOn,
        ModifiedBy: requestDataWithCodes.ModifiedBy,
        ModifiedOn: requestDataWithCodes.ModifiedOn,
        SupervisedBy: requestDataWithCodes.SupervisedBy,
        NewRecord: requestDataWithCodes.NewRecord,
      };

      console.log("[InsuranceCompany] Save payload:", payload);

      try {
        state.isBusy = true;
        updateActionButtons();
        const svcWin = await ensureStaticDataService();
        if (!svcWin?.StaticDataService?.addEditInsurance) {
          setToast("Service not available. Please refresh.", "danger");
          return;
        }

        const result = await svcWin.StaticDataService.addEditInsurance(payload);
        console.log("[InsuranceCompany] Save response:", result);
        
        if (!result?.success) {
          const errorMsg = result?.message || result?.error || result?.Message || "Save failed.";
          console.error("[InsuranceCompany] Save failed; backend response:", result);
          console.error("[InsuranceCompany] Error message:", errorMsg);
          
          // Check for optimistic locking errors
          if (errorMsg.includes("already done") || 
              errorMsg.includes("another user") || 
              errorMsg.includes("concurrent") ||
              errorMsg.includes("optimistic") ||
              errorMsg.includes("Edit already done")) {
            
            // Offer to refresh and try again
            if (window.Swal) {
              const confirm = await Swal.fire({
                title: 'Record Updated Elsewhere',
                text: 'This record was modified by another user. Would you like to refresh and try again?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Refresh & Retry',
                cancelButtonText: 'Cancel'
              });
              
              if (confirm.isConfirmed) {
                await handleSearchOrView({ quiet: true });
                setToast("Record refreshed. Please review changes and try saving again.", "info");
              }
            } else {
              setToast("Record was modified elsewhere. Please refresh and try again.", "warning");
            }
          } else {
            setToast(errorMsg, "danger");
          }
          return;
        }

        setMode(MODES.VIEW);
        await handleSearchOrView({ quiet: true, intentLabel: "Refreshing" });

        const after = getFormSnapshot();
        const persisted = snapshotMatchesDesired(after, desiredBeforeSave);

        if (persisted) {
          setToast("Saved.", "success");
        } else {
          console.warn("[InsuranceCompany] Verification failed - data didn't persist");
          console.warn("[InsuranceCompany] Desired:", desiredBeforeSave);
          console.warn("[InsuranceCompany] Actual:", after);
          setToast("Not saved: backend returned Success but data stayed unchanged.", "danger");
        }
      } catch (error) {
        console.error("[InsuranceCompany] Save failed", error);
        setToast("Save failed.", "danger");
      } finally {
        state.isBusy = false;
        updateActionButtons();
      }
    });

    cancelBtn?.addEventListener("click", () => {
      // Match Insurance Code / Contact Person behavior.
      if (state.hasLoaded) {
        clearCompanyForm({ keepId: false });
      } else {
        clearCompanyForm({ keepId: true });
      }
      state.hasLoaded = false;
      state.recordNotFound = false;
      setMode(MODES.VIEW);
      hideValidationSummary();
      setToast("Changes cancelled.", "info");
    });

    deleteBtn?.addEventListener("click", async () => {
      if (!state.hasLoaded) {
        setToast("Load a record before deleting.", "warning");
        return;
      }

      const Swal = window.Swal || (window.parent && window.parent !== window ? window.parent.Swal : null);

      if (!Swal) {
        const confirmed = window.confirm("Are you sure you want to delete this insurance company?");
        if (!confirmed) return;
      } else {
        const result = await Swal.fire({
          title: "Delete Insurance Company?",
          text: "This action cannot be undone.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          cancelButtonColor: "#3085d6",
          confirmButtonText: "Yes, delete it!",
          cancelButtonText: "Cancel",
        });
        if (!result.isConfirmed) return;
      }

      const insuranceID = qs("#InsuranceID")?.value?.trim();
      
      setToast("Deleting insurance company...", "info");

      const { bankId } = getLegacyContextIds();

      // Refresh UpdateCount from database before delete
      await refreshUpdateCountBeforeEdit();

      // Based on the error message, the delete procedure expects:
      // 1. BankID
      // 2. InsuranceID  
      // 3. NewRecord (probably 0 for delete)
      // 4. UpdateCount (for optimistic locking)
      const payload = {
        BankID: bankId,
        InsuranceID: insuranceID,
        NewRecord: 0, // This is the critical missing parameter!
        UpdateCount: state.loadedUpdateCount || 0
      };

      console.log("[InsuranceCompany] Delete payload:", payload);

      try {
        state.isBusy = true;
        updateActionButtons();
        const svcWin = await ensureStaticDataService();
        if (!svcWin?.StaticDataService?.deleteInsurance) {
          setToast("Service not available. Please refresh.", "danger");
          return;
        }

        const result = await svcWin.StaticDataService.deleteInsurance(payload);
        
        if (result?.success) {
          setToast("Insurance company deleted successfully.", "success");
          clearCompanyForm({ keepId: false });
          state.hasLoaded = false;
          state.recordNotFound = false;
          state.loadedUpdateCount = 0;
          state.loadedBankId = "";
          setMode(MODES.VIEW, { initial: true });
        } else {
          const errorMsg = result?.message || "Delete failed.";
          console.error("[InsuranceCompany] Delete failed:", errorMsg);
          setToast(errorMsg, "danger");
        }
      } catch (error) {
        console.error("[InsuranceCompany] Delete failed", error);
        setToast("Delete failed.", "danger");
      } finally {
        state.isBusy = false;
        updateActionButtons();
      }
    });
  }

  async function init() {
    bindModeButtons();
    bindActions();
    setMode(MODES.VIEW, { initial: true });

    // Non-blocking preload: ensures City/Country selects have dropdown options.
    ensureCityCountryLookupsLoaded();

    // StaticDataService is still loaded on-demand by button handlers.
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();