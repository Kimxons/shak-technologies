(function () {
  // Page-specific wiring for Money Market - Front Office
  // Keep page scripts minimal and self-contained.

  const formEl = document.getElementById('mm-front-office-form');
  if (!formEl) return;

  const $ = (selector, root = formEl) => root.querySelector(selector);
  const $$ = (selector, root = formEl) => Array.from(root.querySelectorAll(selector));

  const modeLabelEl = document.querySelector('[data-mm-mode-label]');

  const actionButtons = $$('aside.cm-legacy-actions button.cm-shell__action');
  const getActionButton = (label) =>
    actionButtons.find((b) => (b.textContent || '').trim().toLowerCase() === label.toLowerCase()) || null;

  const btnView = getActionButton('View');
  const btnAdd = getActionButton('Add');
  const btnEdit = getActionButton('Edit');
  const btnDelete = getActionButton('Delete');
  const btnSave = getActionButton('Save');
  const btnCancel = getActionButton('Cancel');

  const getField = (id) => document.getElementById(id);
  const setFieldValue = (id, value) => {
    const el = getField(id);
    if (!el) return;
    el.value = value ?? '';
  };

  const setDisabled = (el, disabled) => {
    if (!el) return;
    el.disabled = Boolean(disabled);
  };

  const readForm = () => {
    const data = {};
    const fd = new FormData(formEl);
    for (const [k, v] of fd.entries()) data[k] = v;
    return data;
  };

  const restoreForm = (snapshot) => {
    if (!snapshot) return;
    for (const [name, value] of Object.entries(snapshot)) {
      const field = formEl.elements?.namedItem?.(name);
      if (!field) continue;
      if (field instanceof RadioNodeList) continue;
      try {
        field.value = value;
      } catch {
        // ignore
      }
    }
  };

  const nowLabel = () => new Date().toLocaleString();

  const getSessionUserLabel = () => {
    try {
      const session = window.AuthService?.getSession?.();
      return (
        session?.operatorID ||
        session?.operatorId ||
        session?.operatorName ||
        session?.username ||
        session?.userName ||
        ''
      );
    } catch {
      return '';
    }
  };

  const closeContainingModal = () => {
    try {
      const parentWin = window.parent;
      if (!parentWin || parentWin === window) return false;
      if (typeof parentWin.closeModalWindow !== 'function') return false;

      const parentDoc = parentWin.document;
      if (!parentDoc) return false;

      const iframes = Array.from(parentDoc.querySelectorAll('iframe'));
      const hostIframe = iframes.find((f) => f.contentWindow === window);
      if (!hostIframe) return false;

      const modalEl = hostIframe.closest('.legacy-modal');
      if (!modalEl) return false;

      parentWin.closeModalWindow(modalEl);
      return true;
    } catch {
      return false;
    }
  };

  const clearEditableFields = () => {
    // Preserve readonly companion display fields.
    const preserve = new Set(['ClientBranchName']);

    for (const el of $$('input, select, textarea')) {
      const id = el.id || '';
      if (preserve.has(id)) continue;
      if (el.hasAttribute('readonly')) continue;

      if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = false;
        continue;
      }

      if (el.tagName === 'SELECT') {
        el.selectedIndex = 0;
        continue;
      }

      el.value = '';
    }

    // Clear system fields explicitly
    setFieldValue('CreatedBy', '');
    setFieldValue('CreatedOn', '');
    setFieldValue('ModifiedBy', '');
    setFieldValue('ModifiedOn', '');
    setFieldValue('SupervisedBy', '');
    setFieldValue('SupervisedOn', '');
  };

  // =========================================================================
  // HELPER FUNCTIONS FOR VIEW BINDING (from guide)
  // =========================================================================

  // Normalize keys for case-insensitive matching
  const normalizeKey = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  };

  // Build index for fast lookup
  const buildRecordIndex = (record) => {
    const index = new Map();
    if (!record || typeof record !== "object") return index;
    Object.keys(record).forEach((key) => index.set(normalizeKey(key), key));
    return index;
  };

  // Convert various formats to boolean
  const coerceBoolean = (value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    const text = String(value ?? "").trim().toLowerCase();
    return text === "y" || text === "yes" || text === "true" || text === "1";
  };

  // Extract ISO date from various formats
  const formatDateISO = (value) => {
    if (!value) return "";
    const text = String(value);
    const match = text.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : text;
  };

  // Format date for display (dd/MMM/yyyy)
  const formatDateDisplay = (value) => {
    const iso = formatDateISO(value);
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    const [yyyy, mm, dd] = iso.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIdx = Math.max(0, Math.min(11, Number(mm) - 1));
    return `${dd}/${months[monthIdx]}/${yyyy}`;
  };

  // Add option to select if it doesn't exist
  const addSelectOptionIfMissing = (selectEl, value) => {
    if (!selectEl || selectEl.tagName !== "SELECT") return;
    const v = value == null ? "" : String(value);
    if (v === "") return;
    const exists = Array.from(selectEl.options).some((o) => o.value === v);
    if (exists) return;
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = /^\d{4}-\d{2}-\d{2}/.test(v) ? formatDateDisplay(v) : v;
    selectEl.appendChild(opt);
  };

  // Get array of key candidates from keyMap
  const getMappedKeyCandidates = (keyMapValue) => {
    if (!keyMapValue) return [];
    if (Array.isArray(keyMapValue)) return keyMapValue;
    return [keyMapValue];
  };

  // Extract main record from response
  const extractMergedRecord = (response) => {
    // Try Details01 first (common pattern)
    if (Array.isArray(response?.data?.Details01) && response.data.Details01.length) {
      return response.data.Details01[0];
    }

    // Try data array
    if (Array.isArray(response?.data) && response.data.length) return response.data[0];
    
    // Try Details array
    if (Array.isArray(response?.Details) && response.Details.length) return response.Details[0];

    // Fallback: merge multiple Details datasets
    const payload = response?.data && typeof response.data === "object" ? response.data : response;
    const merged = {};
    const detailKeys = Object.keys(payload || {}).filter((k) => /^Details\d*$/i.test(k));
    detailKeys.sort((a, b) => {
      const an = a.toLowerCase() === "details" ? 0 : Number(a.replace(/\D/g, "") || "0");
      const bn = b.toLowerCase() === "details" ? 0 : Number(b.replace(/\D/g, "") || "0");
      return an - bn;
    });

    const isNonEmpty = (v) => {
      if (v == null) return false;
      if (typeof v === "string") return v.trim() !== "";
      return true;
    };

    const mergeRecord = (record) => {
      if (!record || typeof record !== "object") return;
      for (const [k, v] of Object.entries(record)) {
        if (!k) continue;
        if (!isNonEmpty(merged[k]) && isNonEmpty(v)) merged[k] = v;
        if (merged[k] === undefined) merged[k] = v;
      }
    };

    for (const key of detailKeys) {
      const value = payload[key];
      if (Array.isArray(value)) value.forEach((row) => mergeRecord(row));
      else mergeRecord(value);
    }

    if (!Object.keys(merged).length && payload && typeof payload === "object") {
      Object.assign(merged, payload);
    }

    return Object.keys(merged).length ? merged : null;
  };

  // Bind record data to form fields
  const bindRecordToForm = (formEl, record, keyMap = {}) => {
    if (!formEl || !record || typeof record !== "object") return;

    const recordIndex = buildRecordIndex(record);
    const fields = Array.from(formEl.querySelectorAll("input, select, textarea"));

    fields.forEach((field) => {
      const rawKey = field.id || field.name;
      if (!rawKey) return;

      const mapped = keyMap[rawKey] || keyMap[field.id] || keyMap[field.name] || null;
      let recordKey = null;

      // Try mapped candidates first
      for (const candidate of getMappedKeyCandidates(mapped)) {
        const k = recordIndex.get(normalizeKey(candidate));
        if (k) {
          recordKey = k;
          break;
        }
      }

      // Fallback to direct match
      if (!recordKey) recordKey = recordIndex.get(normalizeKey(rawKey)) || null;
      if (!recordKey) return;

      const value = record[recordKey];
      
      // Handle checkbox
      if (field.type === "checkbox") {
        field.checked = coerceBoolean(value);
        return;
      }
      
      // Handle select
      if (field.tagName === "SELECT") {
        const nextValue = value == null ? "" : String(value);
        addSelectOptionIfMissing(field, nextValue);
        field.value = nextValue;
        return;
      }

      // Handle text/number/date inputs
      const stringValue = value == null ? "" : String(value);
      const shouldFormatDate =
        /^\d{4}-\d{2}-\d{2}/.test(stringValue) && 
        /(date|from|to|upto|tender|maturity|value|issue|created|modified|supervised)/i.test(rawKey);
      field.value = shouldFormatDate ? formatDateDisplay(stringValue) : stringValue;
    });
  };

  // Populate lookup dropdowns on page load
  const populateLookupDropdowns = async () => {
    if (!window.ServiceLoader?.loadLookupService) {
      console.warn("[MoneyMarket] ServiceLoader.loadLookupService not available.");
      return;
    }

    await window.ServiceLoader.loadLookupService();
    if (!window.LookupService) {
      console.warn("[MoneyMarket] LookupService not available.");
      return;
    }

    const lookupFields = formEl.querySelectorAll("[data-lookup]");
    const lookupPromises = [];

    lookupFields.forEach((field) => {
      const lookupKey = field.getAttribute("data-lookup");
      if (!lookupKey) return;

      // Convert lookupKey to method name (e.g., "moneyMarketTypes" -> "getMoneyMarketTypes")
      const methodName = `get${lookupKey.charAt(0).toUpperCase()}${lookupKey.slice(1)}`;
      const lookupMethod = window.LookupService[methodName];

      if (typeof lookupMethod !== "function") {
        console.warn(`[MoneyMarket] LookupService.${methodName} not found for ${lookupKey}`);
        return;
      }

      const promise = lookupMethod.call(window.LookupService).then((options) => {
        if (!Array.isArray(options)) return;
        options.forEach((opt) => {
          const option = document.createElement("option");
          option.value = opt.value;
          option.textContent = opt.label;
          field.appendChild(option);
        });
      }).catch((err) => {
        console.error(`[MoneyMarket] Failed to load ${lookupKey}:`, err);
      });

      lookupPromises.push(promise);
    });

    await Promise.all(lookupPromises);
    console.info("[MoneyMarket] Lookup dropdowns populated.");
  };

  // Call on page load
  populateLookupDropdowns();

  // =========================================================================
  // MODE MANAGEMENT
  // =========================================================================

  let mode = 'view'; // view | add | edit
  let formSnapshot = null;

  const setMode = (nextMode) => {
    mode = nextMode;
    formEl.dataset.mode = mode;
    if (modeLabelEl) modeLabelEl.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
    updateButtons();
  };

  const hasLoadedRecord = () => {
    const dealNo = (getField('DealNo')?.value || '').trim();
    return dealNo.length > 0;
  };

  const updateButtons = () => {
    const editing = mode === 'add' || mode === 'edit';
    const loaded = hasLoadedRecord();

    // In "view" mode, we allow edit/delete only if a dealNo exists.
    setDisabled(btnView, false);
    setDisabled(btnAdd, editing);
    setDisabled(btnEdit, editing || !loaded);
    setDisabled(btnDelete, editing || !loaded);

    setDisabled(btnSave, !editing);
    setDisabled(btnCancel, !editing);
  };

  const ensureDealNo = () => {
    const el = getField('DealNo');
    if (!el) return '';
    const current = (el.value || '').trim();
    if (current) return current;
    const generated = `MM${Date.now()}`;
    el.value = generated;
    return generated;
  };

  // --- Button wiring ---
  btnView?.addEventListener('click', async () => {
    // Load service
    if (!window.ServiceLoader?.loadTreasuryService) {
      console.error("[MoneyMarket] ServiceLoader.loadTreasuryService is not available.");
      alert("Service loader not available. Please refresh the page.");
      return;
    }

    await window.ServiceLoader.loadTreasuryService();
    if (!window.TreasuryService?.getMoneyMarketDealCustom) {
      console.error("[MoneyMarket] TreasuryService.getMoneyMarketDealCustom is not available.");
      alert("Treasury service not available. Please refresh the page.");
      return;
    }

    // Get session data
    const getSession = () => window.AuthService?.getSession?.() || null;
    const session = getSession();
    const operatorId = session?.operatorID || session?.OperatorID || session?.operatorId || "";
    const bankId = session?.bankID || session?.BankID || window.Environment?.BankID || window.Environment?.bankID || "00";
    const clientBranchId =
      session?.ourBranchID ||
      session?.OurBranchID ||
      session?.branchID ||
      session?.BranchID ||
      window.Environment?.OurBranchID ||
      window.Environment?.ourBranchID ||
      "";

    // Get search criteria from form
    const dealNumber = String(getField('DealNo')?.value || "").trim();
    const clientId = String(getField('ClientId')?.value || "").trim();

    if (!dealNumber && !clientId) {
      alert("Enter Deal Number or Client ID to search.");
      return;
    }

    // Build request data matching the provided structure
    const requestData = {
      BankID:'00',
      ClientBranchID: '0325',
      ClientID: clientId,
      DealNumber: dealNumber,
      Status: "", // SystemSubID - empty for now
      OperatorID: 'JOY_WANJA',
      Direction: 0 // smallint - 1 for view/search
    };

    // Store for debugging
    window.__mmLastGetMoneyMarketDealCustomRequestData = requestData;
    console.log("[MoneyMarket] Request:", requestData);

    try {
      // Call service
      const response = await window.TreasuryService.getMoneyMarketDealCustom(requestData);
      window.__mmLastGetMoneyMarketDealCustomResponse = response;
      console.log("[MoneyMarket] Response:", response);

      if (!response?.success) {
        console.error("[MoneyMarket] Request failed:", response);
        alert(`Failed to retrieve deal: ${response?.message || "Unknown error"}`);
        return;
      }

      // Extract and bind
      const record = extractMergedRecord(response);
      window.__mmLastMoneyMarketDealRecord = record;
      
      if (!record) {
        console.warn("[MoneyMarket] No record returned.");
        alert("No deal found matching the search criteria.");
        return;
      }

      // Create keyMap for field mapping
      const keyMap = {
        DealNo: ["DealNumber", "DealNo", "DealID"],
        IssueDate: ["IssueDate", "Issue_Date"],
        Type: ["Type", "DealType", "MoneyMarketType"],
        ClientBranchId: ["ClientBranchID", "ClientBranchId", "BranchID"],
        ClientBranchName: ["ClientBranchName", "BranchName"],
        CurrencyId: ["CurrencyID", "CurrencyId", "Currency"],
        ClientId: ["ClientID", "ClientId"],
        ValueDate: ["ValueDate", "Value_Date"],
        TenorDays: ["TenorDays", "Tenor", "TenorInDays"],
        MaturityDate: ["MaturityDate", "Maturity_Date"],
        ExchangeRate: ["ExchangeRate", "Exchange_Rate", "Rate"],
        Amount: ["Amount", "DealAmount"],
        Purpose: ["Purpose", "DealPurpose"],
        LocalAmount: ["LocalAmount", "Local_Amount"],
        InterestRate: ["InterestRate", "Interest_Rate", "Rate"],
        TheirDealer: ["TheirDealer", "Their_Dealer", "DealerName"],
        Remarks: ["Remarks", "Comments", "Notes"],
        BorrowingLimit: ["BorrowingLimit", "Borrowing_Limit"],
        BorrowingUsed: ["BorrowingUsed", "Borrowing_Used"],
        LendingLimit: ["LendingLimit", "Lending_Limit"],
        LendingUsed: ["LendingUsed", "Lending_Used"],
        CreatedBy: ["CreatedBy", "Created_By", "Creator"],
        CreatedOn: ["CreatedOn", "Created_On", "CreatedDate"],
        ModifiedBy: ["ModifiedBy", "Modified_By", "Modifier"],
        ModifiedOn: ["ModifiedOn", "Modified_On", "ModifiedDate"],
        SupervisedBy: ["SupervisedBy", "Supervised_By", "Supervisor"],
        SupervisedOn: ["SupervisedOn", "Supervised_On", "SupervisedDate"]
      };

      bindRecordToForm(formEl, record, keyMap);
      console.info("[MoneyMarket] Record loaded successfully.");
      
      // Switch to view mode after loading
      setMode('view');
    } catch (error) {
      console.error("[MoneyMarket] Error during view operation:", error);
      alert(`Error retrieving deal: ${error.message || "Unknown error"}`);
    }
  });

  btnAdd?.addEventListener('click', () => {
    formSnapshot = readForm();
    clearEditableFields();

    const user = getSessionUserLabel();
    if (user) setFieldValue('CreatedBy', user);
    setFieldValue('CreatedOn', nowLabel());

    setMode('add');
  });

  btnEdit?.addEventListener('click', () => {
    if (!hasLoadedRecord()) {
      window.alert('Enter or load a DealNo to edit.');
      return;
    }

    formSnapshot = readForm();
    const user = getSessionUserLabel();
    if (user) setFieldValue('ModifiedBy', user);
    setFieldValue('ModifiedOn', nowLabel());
    setMode('edit');
  });

  btnDelete?.addEventListener('click', () => {
    if (!hasLoadedRecord()) {
      window.alert('Enter or load a DealNo to delete.');
      return;
    }

    const dealNo = (getField('DealNo')?.value || '').trim();
    const ok = window.confirm(`Delete deal ${dealNo}?`);
    if (!ok) return;

    clearEditableFields();
    setMode('view');
  });

  btnSave?.addEventListener('click', () => {
    if (mode !== 'add' && mode !== 'edit') return;

    // No validations for now.
    ensureDealNo();

    if (mode === 'add') {
      // CreatedBy/On set at Add-time.
      // Optionally set Modified too for newly created records.
    }

    if (mode === 'edit') {
      const user = getSessionUserLabel();
      if (user) setFieldValue('ModifiedBy', user);
      setFieldValue('ModifiedOn', nowLabel());
    }

    setMode('view');
  });

  btnCancel?.addEventListener('click', () => {
    if (mode === 'add' || mode === 'edit') {
      restoreForm(formSnapshot);
      setMode('view');
      return;
    }

    // Currently disabled in view mode, but keep this for safety if enabled later.
    if (closeContainingModal()) return;
  });

  // When DealNo changes (manual load), refresh button enable/disable.
  getField('DealNo')?.addEventListener('input', () => {
    if (mode !== 'add' && mode !== 'edit') updateButtons();
  });

  // Init state
  setMode('view');
})();
