(function (global) {
  if (global.__ProductLgLcLoaded) {
    console.warn("product-lg-lc.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__ProductLgLcLoaded = true;

  const MODES = {
    VIEW: "view",
    ADD: "add",
    EDIT: "edit",
    NOT_FOUND: "notFound"
  };

  // Child form paths - following Account Maintenance pattern
  const CHILD_FORMS = {
    'gl-interface': '../data-entry/product-gl-interface.html',
    'documents': '../data-entry/product-documents.html',
    'udf': '../data-entry/product-udf.html',
    'charges': '../data-entry/product-charges.html'
  };

  // Forms that require a loaded product before navigation
  const PRODUCT_REQUIRED_FORMS = ['gl-interface', 'documents', 'udf', 'charges'];

  // Helper to get overlay elements
  function getOverlayEls() {
    return {
      overlay: document.querySelector('[data-child-inline]'),
      iframe: document.querySelector('[data-child-iframe]'),
      mainForm: document.querySelector('[data-main-form]'),
      mainContainer: document.querySelector('.main-container')
    };
  }

  // Toggle child overlay visibility with animations
  function setOverlayOpen(isOpen) {
    const { overlay, mainForm, mainContainer } = getOverlayEls();
    if (!overlay || !mainContainer) return;

    if (isOpen) {
      mainContainer.classList.add('child-opening');
      overlay.hidden = false;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          mainContainer.classList.add('child-open');
          overlay.classList.add('is-visible');
          overlay.classList.remove('is-closing');

          setTimeout(() => {
            mainContainer.classList.remove('child-opening');
          }, 350);
        });
      });
    } else {
      mainContainer.classList.remove('child-opening');
      overlay.classList.add('is-closing');
      overlay.classList.remove('is-visible');

      setTimeout(() => {
        mainContainer.classList.remove('child-open');
        overlay.hidden = true;
        overlay.classList.remove('is-closing');
      }, 350);
    }
  }

  // Open a child form in the inline overlay
  function openChildForm(childKey) {
    const path = CHILD_FORMS[childKey];
    const { iframe } = getOverlayEls();
    if (!path || !iframe) return;

    // Check if this form requires a loaded product
    if (PRODUCT_REQUIRED_FORMS.includes(childKey)) {
      const productId = document.getElementById('Product')?.value?.trim();
      if (!productId) {
        uiAlert('Please load a product before accessing this feature.', {
          title: 'Product Required',
          variant: 'warning'
        });
        return;
      }
    }

    // Show loading state and load the iframe
    iframe.onload = function () {
      // Theme vars can be applied here if needed
    };
    const cacheBust = `v=${Date.now()}`;
    const separator = path.includes('?') ? '&' : '?';
    iframe.src = `${path}${separator}${cacheBust}`;
    setOverlayOpen(true);
  }

  // Close child form
  function closeChildForm() {
    const { iframe } = getOverlayEls();
    if (iframe) iframe.src = 'about:blank';
    setOverlayOpen(false);
  }

  // Expose closeChildForm globally for child forms to call
  global.closeChildForm = closeChildForm;

  const setFeedback = (message, variant = "info") => {
    const node = document.getElementById("plglcFeedback");
    if (!node) return;
    if (!message) {
      node.className = "alert d-none mb-2";
      node.textContent = "";
      return;
    }
    node.className = `alert alert-${variant} mb-2`;
    node.textContent = message;
  };

  const toUiText = (value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (value instanceof Error) return value.message || String(value);
    if (typeof value === "object") {
      const preferred =
        value.message ||
        value.Message ||
        value.error ||
        value.Error ||
        value.details ||
        value.Details;
      if (typeof preferred === "string") return preferred;
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const normalizeUiOptions = (titleOrOptions, defaults) => {
    if (typeof titleOrOptions === "string") return { ...defaults, title: titleOrOptions };
    if (titleOrOptions && typeof titleOrOptions === "object") return { ...defaults, ...titleOrOptions };
    return { ...defaults };
  };

  const showMessageModal = ({ title, message, confirmMode, okText, cancelText, variant }) => {
    const plglcMsgModalEl = document.getElementById("plglcMessageModal");
    const plglcMsgTitleEl = document.getElementById("plglcMessageModalLabel");
    const plglcMsgBodyEl = document.getElementById("plglcMessageModalBody");
    const plglcMsgOkBtn = plglcMsgModalEl?.querySelector("[data-plglc-message-ok]");
    const plglcMsgCancelBtn = plglcMsgModalEl?.querySelector("[data-plglc-message-cancel]");

    const safeTitle = toUiText(title) || (confirmMode ? "Confirm" : "Message");
    const safeMessage = toUiText(message);
    const safeOkText = toUiText(okText) || (confirmMode ? "Yes" : "OK");
    const safeCancelText = toUiText(cancelText) || "Cancel";

    // Fallback if Bootstrap/modal markup isn't available.
    if (!plglcMsgModalEl || !window.bootstrap?.Modal) {
      if (confirmMode) return Promise.resolve(window.confirm(safeMessage));
      window.alert(safeMessage);
      return Promise.resolve(true);
    }

    if (plglcMsgTitleEl) plglcMsgTitleEl.textContent = safeTitle;
    if (plglcMsgBodyEl) plglcMsgBodyEl.textContent = safeMessage;
    if (plglcMsgCancelBtn) {
      plglcMsgCancelBtn.hidden = !confirmMode;
      plglcMsgCancelBtn.textContent = safeCancelText;
    }
    if (plglcMsgOkBtn) plglcMsgOkBtn.textContent = safeOkText;

    const modal = window.bootstrap.Modal.getOrCreateInstance(plglcMsgModalEl, { backdrop: "static", keyboard: true });

    return new Promise((resolve) => {
      let resolved = false;

      const cleanup = () => {
        plglcMsgOkBtn?.removeEventListener("click", onOk);
        plglcMsgCancelBtn?.removeEventListener("click", onCancel);
        plglcMsgModalEl.removeEventListener("hidden.bs.modal", onHidden);
      };

      const finish = (value) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(value);
      };

      const onOk = () => {
        modal.hide();
        finish(true);
      };
      const onCancel = () => {
        modal.hide();
        finish(false);
      };
      const onHidden = () => {
        // If user closes via X/ESC, treat as cancel for confirm, ok for alert.
        finish(confirmMode ? false : true);
      };

      plglcMsgOkBtn?.addEventListener("click", onOk);
      plglcMsgCancelBtn?.addEventListener("click", onCancel);
      plglcMsgModalEl.addEventListener("hidden.bs.modal", onHidden);
      modal.show();
    });
  };

  const uiAlert = (message, titleOrOptions) => {
    const opts = normalizeUiOptions(titleOrOptions, { title: "Message", okText: "OK", variant: "info" });
    return showMessageModal({
      title: opts.title,
      message,
      confirmMode: false,
      okText: opts.okText,
      variant: opts.variant
    });
  };

  const uiConfirm = (message, titleOrOptions) => {
    const opts = normalizeUiOptions(titleOrOptions, {
      title: "Confirm",
      okText: "Yes",
      cancelText: "No",
      variant: "warning"
    });
    return showMessageModal({
      title: opts.title,
      message,
      confirmMode: true,
      okText: opts.okText,
      cancelText: opts.cancelText,
      variant: opts.variant
    });
  };

  // Expose styled dialogs for child iframes (data-entry pages) to avoid native alerts.
  global.ProductLgLcUi = { uiAlert, uiConfirm };
  global.uiAlert = uiAlert;
  global.uiConfirm = uiConfirm;

  const setModeLabel = (mode) => {
    const label = document.querySelector("[data-plglc-mode-label]");
    if (!label) return;
    label.textContent = mode === MODES.ADD ? "Add" : mode === MODES.EDIT ? "Edit" : "View";
  };

  const setHeader = ({ title, subtitle }) => {
    const titleEl = document.querySelector("[data-plglc-title]");
    const subtitleEl = document.querySelector("[data-plglc-subtitle]");
    if (titleEl && typeof title === "string") titleEl.textContent = title;
    if (subtitleEl && typeof subtitle === "string") subtitleEl.textContent = subtitle;
  };

  const openDataEntryPage = ({ title, src }) => {
    const modalEl = document.getElementById("productDataEntryModal");
    const titleEl = document.getElementById("productDataEntryModalTitle");
    const iframeEl = document.getElementById("productDataEntryIframe");
    const bootstrapLib = window.bootstrap;

    if (!modalEl || !iframeEl || !bootstrapLib?.Modal) {
      setFeedback("Data Entry popup is unavailable on this page.", "warning");
      return null;
    }

    const instance = bootstrapLib.Modal.getOrCreateInstance(modalEl);
    if (titleEl) titleEl.textContent = title;
    iframeEl.title = title;
    iframeEl.src = src;
    instance.show();
    return instance;
  };

  const toggleFormEnabled = (form, enabled, { respectAlwaysEnabled = true } = {}) => {
    if (!form) return;
    const fields = Array.from(form.querySelectorAll("input, select, textarea"));
    fields.forEach((field) => {
      if (field.readOnly) return;
      if (respectAlwaysEnabled && field.closest("[data-always-enabled]")) return;
      field.disabled = !enabled;
    });
  };

  const getSessionValue = (session, ...keys) => {
    if (!session) return "";
    for (const key of keys) {
      const value = session[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return String(value).trim();
      }
    }
    return "";
  };

  const normalizeKey = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  };

  const coerceBoolean = (value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    const text = String(value ?? "").trim().toLowerCase();
    return text === "y" || text === "yes" || text === "true" || text === "1";
  };

  const buildRecordIndex = (record) => {
    const index = new Map();
    if (!record || typeof record !== "object") return index;
    Object.keys(record).forEach((key) => {
      index.set(normalizeKey(key), key);
    });
    return index;
  };

  const getFieldValue = (fieldId) => {
    const field = document.getElementById(fieldId);
    if (!field) return "";
    if (field.type === "checkbox") return field.checked;
    return (field.value || "").trim();
  };

  const getCheckboxBit = (fieldId) => {
    const field = document.getElementById(fieldId);
    return field && field.type === "checkbox" && field.checked ? "1" : "0";
  };

  const parseNumberLike = (value) => {
    if (value == null || value === "") return null;
    const parsed = Number(value);
    return isNaN(parsed) ? null : parsed;
  };

  const pickFirstSearchRow = (payload) => {
    const data = payload?.data || payload || {};
    if (Array.isArray(data.SearchResults) && data.SearchResults.length) return data.SearchResults[0];
    if (Array.isArray(data.Details) && data.Details.length) return data.Details[0];
    if (Array.isArray(data) && data.length) return data[0];
    return null;
  };

  const renderCheckboxList = (container, options) => {
    if (!container || !Array.isArray(options)) return;
    
    container.innerHTML = options
      .map(opt => {
        const value = opt.value || "";
        const label = opt.label || value;
        const id = `cr-${value.replace(/[^a-zA-Z0-9]/g, "")}`;
        
        return `
          <div class="form-check">
            <input class="form-check-input" type="checkbox" value="${value}" id="${id}" data-label="${label}">
            <label class="form-check-label" for="${id}">
              ${label}
            </label>
          </div>`;
      })
      .join("");
    
    // Setup dropdown behavior
    const input = document.getElementById("CustomerRestrictionInput");
    const wrapper = document.getElementById("CustomerRestrictionWrapper");
    
    if (input && wrapper) {
      // Toggle dropdown on input click
      input.addEventListener("click", (e) => {
        e.stopPropagation();
        container.classList.toggle("d-none");
      });
      
      // Update display when checkboxes change
      container.addEventListener("change", (e) => {
        if (e.target.type === "checkbox") {
          updateCustomerRestrictionDisplay();
        }
      });
      
      // Close dropdown when clicking outside
      document.addEventListener("click", (e) => {
        if (!wrapper.contains(e.target)) {
          container.classList.add("d-none");
        }
      });
    }
  };
  
  const updateCustomerRestrictionDisplay = () => {
    const container = document.getElementById("CustomerRestriction");
    const input = document.getElementById("CustomerRestrictionInput");
    if (!container || !input) return;
    
    const checked = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => cb.getAttribute("data-label") || cb.value);
    
    input.value = checked.length > 0 ? checked.join(", ") : "";
    input.placeholder = checked.length > 0 ? "" : "Select customer restrictions...";
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  };

  const displayToIsoDate = (displayDate) => {
    if (!displayDate) return "";
    const text = String(displayDate).trim();
    if (!text) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
    const match = text.match(/^(\d{1,2})\/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\/(\d{4})/);
    if (!match) return text;
    const [, day, monthName, year] = match;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIdx = months.indexOf(monthName);
    if (monthIdx === -1) return text;
    const mm = String(monthIdx + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  };

  const isApiSuccess = (response) => {
    if (!response) return false;
    if (response.success === true) return true;
    if (response.success === false) return false;
    const code = String(response.code || response.Status || "");
    return code === "000" || code === "0";
  };

  const buildCustomerRestrictionXml = () => {
    // Match SP expectation exactly:
    // @p28 = convert(xml, N'<dt_ProductRestrictions><CustomerRestrictionID>M</CustomerRestrictionID></dt_ProductRestrictions>')
    // Get checked checkboxes
    const crEl = document.getElementById("CustomerRestriction");
    if (!crEl) {
      return "<dt_ProductRestrictions><CustomerRestrictionID>M</CustomerRestrictionID></dt_ProductRestrictions>";
    }
    
    const checkedBoxes = Array.from(crEl.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => cb.value)
      .filter(v => v); // Remove empty values
    
    if (checkedBoxes.length === 0) {
      return "<dt_ProductRestrictions><CustomerRestrictionID>M</CustomerRestrictionID></dt_ProductRestrictions>";
    }
    
    // Build XML with multiple CustomerRestrictionID elements
    const xmlRows = checkedBoxes
      .map(id => `<dt_ProductRestrictions><CustomerRestrictionID>${id}</CustomerRestrictionID></dt_ProductRestrictions>`)
      .join("");
    
    return xmlRows;
  };

  const clearFormFields = (form, { preserveKeys = false } = {}) => {
    if (!form) return;
    const fields = Array.from(form.querySelectorAll("input, select, textarea"));
    fields.forEach((field) => {
      if (preserveKeys && field.closest("[data-always-enabled]")) return;
      if (field.type === "checkbox") {
        field.checked = false;
        return;
      }
      if (field.tagName === "SELECT") {
        field.value = "";
        return;
      }
      field.value = "";
    });
  };

  const bindRecordToForm = (form, record, keyMap = {}) => {
    if (!form || !record || typeof record !== "object") return;

    const recordIndex = buildRecordIndex(record);
    const fields = Array.from(form.querySelectorAll("input, select, textarea"));

    fields.forEach((field) => {
      const rawKey = field.id || field.name;
      if (!rawKey) return;
      const mappedRecordKey = keyMap[rawKey] || keyMap[field.id] || keyMap[field.name] || null;
      const recordKey = mappedRecordKey
        ? recordIndex.get(normalizeKey(mappedRecordKey))
        : recordIndex.get(normalizeKey(rawKey));
      if (!recordKey) return;

      const value = record[recordKey];

      if (field.type === "checkbox") {
        field.checked = coerceBoolean(value);
        return;
      }

      if (field.tagName === "SELECT") {
        const nextValue = value == null ? "" : String(value);
        const optionExists = Array.from(field.options).some((opt) => opt.value === nextValue);
        if (!optionExists && nextValue !== "") {
          const opt = document.createElement("option");
          opt.value = nextValue;
          opt.textContent = nextValue;
          field.appendChild(opt);
        }
        field.value = nextValue;
        return;
      }

      field.value = value == null ? "" : String(value);
    });
  };

  const ensureBlankOption = (selectEl) => {
    if (!selectEl || selectEl.tagName !== "SELECT") return;
    const hasBlank = Array.from(selectEl.options).some((o) => o.value === "");
    if (hasBlank) return;
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "--Select--";
    selectEl.insertBefore(blank, selectEl.firstChild);
  };

  const upsertSelectOptions = (selectEl, values, { includeBlank = true } = {}) => {
    if (!selectEl || selectEl.tagName !== "SELECT") return;
    const existing = new Set(Array.from(selectEl.options).map((o) => o.value));

    if (includeBlank) {
      ensureBlankOption(selectEl);
      existing.add("");
    }

    (values || []).forEach((value) => {
      const v = value == null ? "" : String(value);
      if (v === "" || existing.has(v)) return;
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      selectEl.appendChild(opt);
      existing.add(v);
    });
  };

  const setSelectOptions = (selectEl, options, { keepExisting = false, includeBlank = true } = {}) => {
    if (!selectEl || selectEl.tagName !== "SELECT") return;

    if (!keepExisting) {
      const blank = Array.from(selectEl.options).find((o) => o.value === "");
      selectEl.innerHTML = "";
      if (blank) {
        selectEl.appendChild(blank);
      }
    }

    if (includeBlank) ensureBlankOption(selectEl);

    const existing = new Set(Array.from(selectEl.options).map((o) => o.value));
    (options || []).forEach((optLike) => {
      const value = optLike?.value == null ? "" : String(optLike.value);
      if (value === "" || existing.has(value)) return;
      const label = optLike?.label != null && String(optLike.label).trim() !== "" ? String(optLike.label) : value;
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      selectEl.appendChild(opt);
      existing.add(value);
    });
  };

  const parseSystemCodeOptions = (rows) => {
    const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
    return list
      .map((row) => ({
        value: row?.SubCodeID,
        label: row?.CodeDescription,
        order: row?.DisplayOrder ?? 0
      }))
      .filter((o) => o.value != null && String(o.value).trim() !== "")
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  };

  const formatDateISO = (value) => {
    if (!value) return "";
    const text = String(value);
    const match = text.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : text;
  };

  const formatDateDisplay = (value) => {
    const iso = formatDateISO(value);
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    const [yyyy, mm, dd] = iso.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIdx = Math.max(0, Math.min(11, Number(mm) - 1));
    return `${dd}/${months[monthIdx]}/${yyyy}`;
  };

  const ensureSelectValue = (selectEl, value, { label } = {}) => {
    if (!selectEl || selectEl.tagName !== "SELECT") return;
    const v = value == null ? "" : String(value);
    if (v === "") return;
    const exists = Array.from(selectEl.options).some((o) => o.value === v);
    if (exists) return;
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = label != null && String(label).trim() !== "" ? String(label) : v;
    selectEl.appendChild(opt);
  };

  const extractId = (raw) => {
    const text = String(raw || "").trim();
    if (!text) return "";
    // Supports inputs like: "ELCG" or "ELCG - Export LC GBP"
    const first = text.split(/\s+-\s+|\s+\|\s+|\s+/)[0];
    return String(first || "").trim();
  };

  const populateFromStructuredResponse = (form, response) => {
    const payload = response?.data && typeof response.data === "object" ? response.data : response;

    // Treat empty Details01 array as "no record" (not found), like Security Maintenance.
    let mainRecord = null;
    const details01 = payload?.Details01;

    if (Array.isArray(details01)) {
      mainRecord = details01.length > 0 ? details01[0] : null;
    } else if (details01 && typeof details01 === "object") {
      mainRecord = details01;
    }

    if (!mainRecord) {
      return { ok: false, message: "No product record found in Details01." };
    }

    // Drop-down list: Customer Restriction (Details02)
    const customerRestrictionValues = Array.isArray(payload?.Details02)
      ? payload.Details02.map((row) => row?.CustomerRestrictionID).filter(Boolean)
      : [];
    upsertSelectOptions(document.getElementById("CustomerRestriction"), customerRestrictionValues);

    // Ensure selects can accept values returned by API even if not preloaded
    upsertSelectOptions(document.getElementById("ProductTypes"), [mainRecord.ProductTypeID]);
    upsertSelectOptions(document.getElementById("ProductCategory"), [mainRecord.ProductCategoryID]);
    upsertSelectOptions(document.getElementById("AccountClassId"), [mainRecord.ProductClassID]);
    upsertSelectOptions(document.getElementById("ContractType"), [mainRecord.ContractType]);
    upsertSelectOptions(document.getElementById("AccountingRule"), [mainRecord.AccountingRuleID]);
    upsertSelectOptions(document.getElementById("AccrualFrequency"), [mainRecord.AccrualFrequency]);
    upsertSelectOptions(document.getElementById("IncoTerms"), [mainRecord.INCOTerms]);
    upsertSelectOptions(document.getElementById("IccApplicableRules"), [mainRecord.ICCApplicableRules]);
    const validFromIso = formatDateISO(mainRecord.ValidFrom);
    const validToIso = formatDateISO(mainRecord.ValidTo);
    
    // Set date inputs (no longer selects)
    const validFromEl = document.getElementById("ValidFrom");
    if (validFromEl) validFromEl.value = validFromIso || "";
    const validToEl = document.getElementById("ValidTo");
    if (validToEl) validToEl.value = validToIso || "";

    // Map API keys to existing form field ids
    const keyMap = {
      Product: "ProductID",
      ProductTypes: "ProductTypeID",
      ProductCategory: "ProductCategoryID",
      AccountClassId: "ProductClassID",
      Currency: "CurrencyID",
      ValidFrom: "ValidFrom",
      ValidTo: "ValidTo",
      AccountingRule: "AccountingRuleID",
      ContractType: "ContractType",
      IncoTerms: "INCOTerms",
      IccApplicableRules: "ICCApplicableRules",
      AccrualFrequency: "AccrualFrequency",

      // Checkboxes use different ids than API fields
      IsExpiryAdviseRequired: "ExpiryAdvice",
      IsCloseAdviceRequired: "CloseAdvice",
      IsConfirmationRequired: "Confirmation"
    };

    // Bind most fields
    bindRecordToForm(form, mainRecord, keyMap);

    // Populate extra display fields to match legacy UI
    const productDescEl = document.getElementById("ProductDescription");
    if (productDescEl) productDescEl.value = mainRecord.Description == null ? "" : String(mainRecord.Description);
    const currencyEl = document.getElementById("Currency");
    if (currencyEl) currencyEl.value = mainRecord.CurrencyID == null ? "" : String(mainRecord.CurrencyID);
    const currencyNameEl = document.getElementById("CurrencyName");
    if (currencyNameEl) currencyNameEl.value = mainRecord.CurrencyName == null ? "" : String(mainRecord.CurrencyName);

    // Format audit date fields similar to screenshot
    ["CreatedOn", "ModifiedOn", "SupervisedOn"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const v = mainRecord[id];
      if (v != null && String(v).trim() !== "") {
        el.value = formatDateDisplay(v);
      }
    });

    // Customer Restriction: check checkboxes based on Details02 array
    if (customerRestrictionValues.length > 0) {
      const crEl = document.getElementById("CustomerRestriction");
      if (crEl) {
        // Uncheck all first
        Array.from(crEl.querySelectorAll('input[type="checkbox"]')).forEach(cb => cb.checked = false);
        // Check matching values
        customerRestrictionValues.forEach(val => {
          const checkbox = crEl.querySelector(`input[type="checkbox"][value="${val}"]`);
          if (checkbox) checkbox.checked = true;
        });
        // Update display
        updateCustomerRestrictionDisplay();
      }
    }

    return { ok: true, record: mainRecord };
  };

  const setActionState = ({ canAdd, canEdit, canDelete, canSave, canCancel }) => {
    const addBtn = document.querySelector("[data-plglc-action='add']");
    const editBtn = document.querySelector("[data-plglc-action='edit']");
    const deleteBtn = document.querySelector("[data-plglc-action='delete']");
    const saveBtn = document.querySelector("[data-plglc-action='save']");
    const cancelBtn = document.querySelector("[data-plglc-action='cancel']");

    console.log("[ProductLgLc] setActionState called:", { canAdd, canEdit, canDelete, canSave, canCancel });
    console.log("[ProductLgLc] Add button before:", addBtn, "disabled:", addBtn?.disabled);

    if (addBtn) addBtn.disabled = !canAdd;
    if (editBtn) editBtn.disabled = !canEdit;
    if (deleteBtn) deleteBtn.disabled = !canDelete;
    if (saveBtn) saveBtn.disabled = !canSave;
    if (cancelBtn) cancelBtn.disabled = !canCancel;

    console.log("[ProductLgLc] Add button after:", addBtn, "disabled:", addBtn?.disabled);
  };

  // =========================================================================
  // SIDEBAR NAV SECTIONS (accordion behavior)
  // =========================================================================
  const setSectionOpen = (section, open) => {
    if (!section) return;
    const items = section.querySelector('.nav-items, .nav-items--card');
    const arrow = section.querySelector('.nav-arrow, .nav-arrow--card');
    const arrowIcon = arrow?.querySelector('i');

    if (open) {
      section.classList.add('is-open');
      if (items) items.hidden = false;
      if (arrow) arrow.setAttribute('aria-expanded', 'true');
      if (arrowIcon) {
        arrowIcon.classList.remove('bi-chevron-down');
        arrowIcon.classList.add('bi-chevron-up');
      }
    } else {
      section.classList.remove('is-open');
      if (items) items.hidden = true;
      if (arrow) arrow.setAttribute('aria-expanded', 'false');
      if (arrowIcon) {
        arrowIcon.classList.remove('bi-chevron-up');
        arrowIcon.classList.add('bi-chevron-down');
      }
    }
  };

  const wireNavSections = () => {
    const sections = Array.from(document.querySelectorAll('[data-nav-section]'));
    if (!sections.length) return;

    sections.forEach(section => {
      const header = section.querySelector('.nav-header, .nav-header--card');
      if (!header) return;

      header.addEventListener('click', function (e) {
        // Don't toggle if clicking on the badge number
        if (e.target.closest('.nav-badge')) return;

        const sidebar = document.getElementById('main-sidebar');
        const mainContainer = document.querySelector('.main-container');
        const toggle = document.getElementById('sidebarToggle');
        const isCollapsed = sidebar && sidebar.classList.contains('collapsed');

        // If sidebar is collapsed, expand it first and open this section
        if (isCollapsed) {
          sidebar.classList.remove('collapsed');
          if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
          if (toggle) toggle.setAttribute('aria-expanded', 'true');

          // Close all sections first, then open the clicked one
          sections.forEach(s => setSectionOpen(s, false));
          setSectionOpen(section, true);
          section.classList.add('expanded');
          return;
        }

        const willOpen = !section.classList.contains('is-open');

        // behave like a dropdown: opening one closes the other
        sections.forEach(s => setSectionOpen(s, false));
        setSectionOpen(section, willOpen);

        // Add expanded class for CSS styling
        if (willOpen) {
          section.classList.add('expanded');
        } else {
          section.classList.remove('expanded');
        }
      });
    });

    // ensure initial state is consistent with markup
    sections.forEach(section => {
      const initiallyOpen = section.classList.contains('is-open');
      setSectionOpen(section, initiallyOpen);
    });
  };

  // =========================================================================
  // SIDEBAR TOGGLE (expand/collapse sidebar)
  // =========================================================================
  const wireSidebarToggle = () => {
    const sidebar = document.getElementById('main-sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const mainContainer = document.querySelector('.main-container');
    if (!sidebar || !toggle) return;

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      const isCollapsed = sidebar.classList.contains('collapsed');

      if (isCollapsed) {
        // Expanding
        sidebar.classList.remove('collapsed');
        if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
        toggle.setAttribute('aria-expanded', 'true');
        // Restore nav-items visibility based on section state
        document.querySelectorAll('.nav-section--card').forEach(section => {
          const items = section.querySelector('.nav-items--card');
          if (items) {
            const isSectionOpen = section.classList.contains('is-open');
            items.hidden = !isSectionOpen;
          }
        });
      } else {
        // Collapsing
        sidebar.classList.add('collapsed');
        if (mainContainer) mainContainer.classList.add('sidebar-collapsed');
        toggle.setAttribute('aria-expanded', 'false');
        // Show all nav-items when collapsed (for icon display)
        document.querySelectorAll('.nav-items--card').forEach(items => {
          items.hidden = false;
        });
      }
    });
  };

  // =========================================================================
  // COLLAPSIBLE FORM SECTIONS
  // =========================================================================
  const wireCollapsibleSections = () => {
    document.querySelectorAll('.form-section[data-section]').forEach(section => {
      const header = section.querySelector('[data-section-toggle]');
      const content = section.querySelector('[data-section-content]');
      const toggleBtn = section.querySelector('.section-toggle-btn');

      if (!header || !content) return;

      header.addEventListener('click', function (e) {
        // Don't toggle if clicking on a button (except the toggle button itself)
        if (e.target.closest('button') && !e.target.closest('.section-toggle-btn')) return;

        const isCollapsed = section.classList.contains('collapsed');

        if (isCollapsed) {
          // Expand
          section.classList.remove('collapsed');
          if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
        } else {
          // Collapse
          section.classList.add('collapsed');
          if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
        }
      });
    });
  };

  // =========================================================================
  // SUBMODULE SEARCH
  // =========================================================================
  const wireSubmoduleSearch = () => {
    const searchInput = document.getElementById('submoduleSearch');
    const clearBtn = document.getElementById('submoduleSearchClear');
    if (!searchInput) return;

    const allItems = Array.from(document.querySelectorAll('.sidebar-item, .sidebar-item--enhanced'));
    const allSections = Array.from(document.querySelectorAll('[data-nav-section]'));

    const performSearch = () => {
      const query = searchInput.value.trim().toLowerCase();
      if (clearBtn) clearBtn.hidden = !query;

      if (!query) {
        // Reset: show all items, collapse all sections
        allItems.forEach(item => item.style.display = '');
        allSections.forEach(section => setSectionOpen(section, false));
        return;
      }

      // Filter items
      allItems.forEach(item => {
        const text = (item.textContent || '').toLowerCase();
        item.style.display = text.includes(query) ? '' : 'none';
      });

      // Expand sections that have visible items
      allSections.forEach(section => {
        const visibleItems = section.querySelectorAll('.sidebar-item:not([style*="display: none"]), .sidebar-item--enhanced:not([style*="display: none"])');
        setSectionOpen(section, visibleItems.length > 0);
      });
    };

    searchInput.addEventListener('input', performSearch);
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        performSearch();
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        performSearch();
        searchInput.focus();
      });
    }
  };

  const init = () => {
    const form = document.getElementById("product-lg-lc-form");
    if (!form) return;

    let hasLoadedRecord = false;
    let currentRecord = null;

    // Wire sidebar navigation sections (accordion behavior)
    wireNavSections();

    // Wire sidebar toggle button (expand/collapse sidebar)
    wireSidebarToggle();

    // Wire collapsible form sections
    wireCollapsibleSections();

    // Wire submodule search functionality
    wireSubmoduleSearch();

    // Match Deposit Maintenance: clear iframe when modal closes.
    const productDataEntryModalEl = document.getElementById("productDataEntryModal");
    const productDataEntryIframeEl = document.getElementById("productDataEntryIframe");
    productDataEntryModalEl?.addEventListener("hidden.bs.modal", () => {
      if (productDataEntryIframeEl) productDataEntryIframeEl.src = "about:blank";
    });

    let activeDataEntryKey = "gl-interface";

    const setActiveNav = (key, { remember = true } = {}) => {
      const items = Array.from(document.querySelectorAll(".sidebar-item[data-child-form], .sidebar-item--enhanced[data-child-form]"));
      if (!items.length) return;
      items.forEach((item) => item.classList.toggle("active", item.getAttribute('data-child-form') === key));
      if (remember) activeDataEntryKey = key;
    };

    const applyMode = (mode) => {
      form.dataset.plglcMode = mode;
      setModeLabel(mode === MODES.NOT_FOUND ? MODES.VIEW : mode);
      setFeedback(null);

      const isEditing = mode === MODES.ADD || mode === MODES.EDIT;
      const isViewing = mode === MODES.VIEW;
      const viewBtn = document.querySelector("[data-plglc-action='view']");
      if (viewBtn) viewBtn.disabled = isEditing;
      
      const productField = document.getElementById("Product");
      const productTypeField = document.getElementById("ProductTypes");
      const productDescField = document.getElementById("ProductDescription");

      if (mode === MODES.NOT_FOUND) {
        // Record Not Found State: Only ProductID and ProductType enabled
        toggleFormEnabled(form, false, { respectAlwaysEnabled: false });
        
        // Enable ProductID and ProductType for viewing/searching
        if (productField) {
          productField.disabled = false;
          productField.readOnly = false;
        }
        if (productTypeField) productTypeField.disabled = false;
        
        setActionState({
          canAdd: true,
          canEdit: false,
          canDelete: false,
          canSave: false,
          canCancel: true
        });
        return;
      }

      if (mode === MODES.VIEW) {
        // View Mode: Only ProductID and ProductType enabled for searching
        toggleFormEnabled(form, false, { respectAlwaysEnabled: false });
        
        // Enable only ProductID and ProductType in VIEW mode
        if (productField) {
          productField.disabled = false;
          productField.readOnly = false;
        }
        if (productTypeField) productTypeField.disabled = false;
        
        setActionState({
          canAdd: false,
          canEdit: hasLoadedRecord,
          canDelete: hasLoadedRecord,
          canSave: false,
          canCancel: hasLoadedRecord
        });
        return;
      }
      
      // Add / Edit Mode: Disable ProductID and ProductType, enable other fields
      if (productField) {
        productField.disabled = true;
        productField.readOnly = true;
      }
      if (productTypeField) productTypeField.disabled = true;
      if (productDescField) productDescField.readOnly = false;

      // Add / Edit Mode State: Save ✅, Cancel ✅; others disabled.
      toggleFormEnabled(form, true, { respectAlwaysEnabled: false });
      setActionState({
        canAdd: false,
        canEdit: false,
        canDelete: false,
        canSave: true,
        canCancel: true
      });
    };

    const viewBtn = document.querySelector("[data-plglc-action='view']");
    const addBtn = document.querySelector("[data-plglc-action='add']");
    const editBtn = document.querySelector("[data-plglc-action='edit']");
    const deleteBtn = document.querySelector("[data-plglc-action='delete']");
    const saveBtn = document.querySelector("[data-plglc-action='save']");
    const cancelBtn = document.querySelector("[data-plglc-action='cancel']");
    const prevBtn = document.querySelector("[data-plglc-action='prev']");
    const nextBtn = document.querySelector("[data-plglc-action='next']");

    console.log("[ProductLgLc] Buttons found:", { viewBtn, addBtn, editBtn, deleteBtn, saveBtn, cancelBtn });

    const fetchProduct = async () => {
      if (!global.ServiceLoader?.loadProductLgLcService) {
        setFeedback("Service loader is not available on this page.", "warning");
        return;
      }

      const productId = extractId(document.getElementById("Product")?.value);
      if (!productId) {
        setFeedback("Enter a Product ID first.", "warning");
        return;
      }

      setFeedback("Loading product...", "info");

      await global.ServiceLoader.loadProductLgLcService();

      if (!global.ProductLgLcService?.getProduct) {
        setFeedback("ProductLgLcService failed to load.", "danger");
        return;
      }

      const session = global.AuthService?.getSession?.() || null;

      const requestData = {
        BankID:"00",
        OurBranchID: "1201",
        ProductID: productId,
        OperatorID: 'JOY_WANJA',
        Direction: "0"
      };
      console.log("ProductLgLcService.getProduct request", requestData);

      const response = await global.ProductLgLcService.getProduct(requestData);
      global.__plglcLastGetProductResponse = response;

      console.log("ProductLgLcService.getProduct response", response.data);
      if (!response?.success) {
        hasLoadedRecord = false;
        currentRecord = null;
        const message = response?.message || "Product not found.";
        await uiAlert(message + "\n\nClick 'Add' button to create a new record.", { title: "Product Not Found", variant: "info" });
        setFeedback("Record not found. Click Add to create a new record.", "info");
        applyMode(MODES.NOT_FOUND);
        return;
      }

      const result = populateFromStructuredResponse(form, response);
      if (!result.ok) {
        hasLoadedRecord = false;
        currentRecord = null;
        await uiAlert((result.message || "Product not found.") + "\n\nClick 'Add' button to create a new record.", { title: "Product Not Found", variant: "info" });
        setFeedback("Record not found. Click Add to create a new record.", "info");
        applyMode(MODES.NOT_FOUND);
        return;
      }
      
      // Only set hasLoadedRecord to true if data was successfully loaded
      hasLoadedRecord = true;
      currentRecord = result.record;
      setFeedback("Product loaded.", "success");
      applyMode(MODES.VIEW);

      if (global.CoreBankingConfig?.enableLogging) {
        console.info("[ProductLgLc] GetProduct response", response);
      }
    };

    const populateDropdowns = async () => {
      if (!global.ServiceLoader?.loadLookupService) {
        return;
      }

      await global.ServiceLoader.loadLookupService();
      if (!global.LookupService?.getSystemCode) {
        return;
      }

      const loadCodes = async (codeCandidates = []) => {
        for (const codeId of codeCandidates) {
          try {
            const resp = await global.LookupService.getSystemCode({ CodeID: codeId });
            if (!resp?.success) continue;

            // lookupService.getSystemCode() normalizes data into resp.data
            const options = parseSystemCodeOptions(resp.data);
            if (options.length) return options;
          } catch (error) {
            // ignore and try next
          }
        }
        return [];
      };

      // Only fill selects that are currently “empty” (placeholder-only), to avoid overwriting hardcoded lists.
      const isPlaceholderOnly = (selectEl) => {
        if (!selectEl || selectEl.tagName !== "SELECT") return false;
        const nonBlank = Array.from(selectEl.options).filter((o) => o.value !== "");
        return nonBlank.length === 0;
      };

      // Always refresh ProductTypes from system codes so labels match legacy UI
      const productTypesEl = document.getElementById("ProductTypes");
      if (productTypesEl) {
        const opts = await loadCodes(["ProductTypeID", "ProductTypes", "ProductType"]);
        if (opts.length) {
          // Filter to only show LG (Letters of Guarantee) and LC (Letters of Credit)
          const filteredOpts = opts.filter(opt => 
            opt.value === "LG" || opt.value === "LC"
          );
          setSelectOptions(productTypesEl, filteredOpts, { keepExisting: false });
        }
      }

      const accountingRuleEl = document.getElementById("AccountingRule");
      if (isPlaceholderOnly(accountingRuleEl)) {
        // Use customCodesLookupService for AccountingRule
        if (global.customCodesLookupService) {
          const opts = await global.customCodesLookupService.getCustomCodeOptions("LCLGAccountRuleID");
          setSelectOptions(accountingRuleEl, opts);
        } else {
          const opts = await loadCodes(["AccountingRuleID", "AccountingRule"]);
          setSelectOptions(accountingRuleEl, opts);
        }
      }

      const productCategoryEl = document.getElementById("ProductCategory");
      if (isPlaceholderOnly(productCategoryEl)) {
        const opts = await loadCodes(["ProductCategoryID", "ProductCategory"]);
        setSelectOptions(productCategoryEl, opts);
      }

      const accountClassEl = document.getElementById("AccountClassId");
      if (isPlaceholderOnly(accountClassEl)) {
        // Use customCodesLookupService for AccountClassId
        if (global.customCodesLookupService) {
          const opts = await global.customCodesLookupService.getCustomCodeOptions("LCLGClassID");
          setSelectOptions(accountClassEl, opts);
        } else {
          const opts = await loadCodes(["ProductClassID", "AccountClassID", "AccountClassId"]);
          setSelectOptions(accountClassEl, opts);
        }
      }

      const customerRestrictionEl = document.getElementById("CustomerRestriction");
      if (customerRestrictionEl && customerRestrictionEl.children.length === 0) {
        // Use LookupService.getClientTypes() for CustomerRestriction
        if (global.LookupService?.getClientTypes) {
          const opts = await global.LookupService.getClientTypes();
          renderCheckboxList(customerRestrictionEl, opts);
        } else {
          const opts = await loadCodes(["CustomerRestrictionID", "CustomerRestriction"]);
          renderCheckboxList(customerRestrictionEl, opts);
        }
      }

      const contractTypeEl = document.getElementById("ContractType");
      if (isPlaceholderOnly(contractTypeEl)) {
        const opts = await loadCodes(["ContractTypeID", "ContractType"]);
        setSelectOptions(contractTypeEl, opts);
      }

      const incoTermsEl = document.getElementById("IncoTerms");
      if (isPlaceholderOnly(incoTermsEl)) {
        const opts = await loadCodes(["INCOTermsID", "INCOTerms", "IncoTerms"]);
        setSelectOptions(incoTermsEl, opts);
      }

      const accrualFreqEl = document.getElementById("AccrualFrequency");
      if (isPlaceholderOnly(accrualFreqEl)) {
        const opts = await loadCodes(["AccrualFrequencyID", "AccrualFrequency"]);
        setSelectOptions(accrualFreqEl, opts);
      }

      const iccRulesEl = document.getElementById("IccApplicableRules");
      // Keep the hardcoded “UCP Latest Version” option if present.
      if (iccRulesEl) {
        const opts = await loadCodes(["ICCApplicableRulesID", "ICCApplicableRules"]);
        setSelectOptions(iccRulesEl, opts, { keepExisting: true });
      }
    };

    const openProductSearch = async () => {
      if (!global.ProductSearchService) {
        console.error('[ProductLgLc] ProductSearchService not loaded');
        await uiAlert('Product search service not available. Please ensure productSearchService.js is loaded.', { 
          title: 'Error', 
          variant: 'danger' 
        });
        return;
      }

      const productField = document.getElementById("Product");
      const descField = document.getElementById("ProductDescription");

      await global.ProductSearchService.openSearchModal((productId, productDescription) => {
        if (productField) {
          productField.value = productId;
        }
        if (descField) {
          descField.value = productDescription;
        }
        setFeedback(`Selected: ${productId}`, "success");
        // Trigger view to load the product details
        fetchProduct();
      });
    };

    const openCurrencySearch = async () => {
      if (!global.CurrencySearchService) {
        console.error('[ProductLgLc] CurrencySearchService not loaded');
        await uiAlert('Currency search service not available. Please ensure currencySearchService.js is loaded.', { 
          title: 'Error', 
          variant: 'danger' 
        });
        return;
      }

      await global.CurrencySearchService.openSearchModal((currencyId, currencyName) => {
        const currencyField = document.getElementById("Currency");
        const currencyNameField = document.getElementById("CurrencyName");
        
        if (currencyField) {
          currencyField.value = currencyId || "";
        }
        if (currencyNameField) {
          currencyNameField.value = currencyName || "";
        }
        
        setFeedback(`Selected: ${currencyId}`, "success");
      });
    };

    viewBtn?.addEventListener("click", () => {
      fetchProduct();
    });
    addBtn?.addEventListener("click", () => {
      const previousMode = form.dataset.plglcMode;
      const productIdBeforeAdd = getFieldValue("Product");
      const productTypeBeforeAdd = getFieldValue("ProductTypes");
      
      currentRecord = null;
      hasLoadedRecord = false;
      clearFormFields(form, { preserveKeys: true });
      
      // Restore Product ID and ProductType when switching to ADD mode
      if (productIdBeforeAdd) {
        const productField = document.getElementById("Product");
        if (productField) productField.value = productIdBeforeAdd;
      }
      if (productTypeBeforeAdd) {
        const productTypeField = document.getElementById("ProductTypes");
        if (productTypeField) productTypeField.value = productTypeBeforeAdd;
      }
      
      setFeedback("Add mode: enter details then Save.", "info");
      applyMode(MODES.ADD);
    });
    editBtn?.addEventListener("click", async () => {
      if (!currentRecord) {
        await uiAlert("No record loaded to edit.", { title: "Edit" });
        return;
      }
      setFeedback("Edit mode: update details then Save.", "info");
      applyMode(MODES.EDIT);
    });

    deleteBtn?.addEventListener("click", async () => {
      if (!currentRecord) {
        await uiAlert("No record loaded to delete.", { title: "Delete" });
        return;
      }

      const productId = extractId(getFieldValue("Product"));
      if (!productId) {
        setFeedback("Product ID is required to delete.", "warning");
        return;
      }

      const confirmed = await uiConfirm(`Are you sure you want to delete product ${productId}?`, {
        title: "Delete Product",
        variant: "danger"
      });
      if (!confirmed) {
        return;
      }

      if (!global.ServiceLoader?.loadProductLgLcService) {
        setFeedback("Service loader is not available on this page.", "warning");
        return;
      }

      setFeedback("Deleting...", "info");

      await global.ServiceLoader.loadProductLgLcService();
      if (!global.ProductLgLcService?.deleteProduct) {
        setFeedback("ProductLgLcService.deleteProduct is not available.", "danger");
        return;
      }

      const session = global.AuthService?.getSession?.() || null;
      const bankId = session?.bankID || session?.BankID || global.Environment?.BankID || global.Environment?.bankID || "00";

      const requestData = {
        BankID: bankId,
        ProductID: productId,
        UpdateCount: currentRecord?.UpdateCount || 0
      };

      console.log("Product LG/LC Delete Request Data:", JSON.stringify(requestData, null, 2));
      global.__plglcLastDeleteRequestData = requestData;

      try {
        const response = await global.ProductLgLcService.deleteProduct(requestData);
        global.__plglcLastDeleteResponse = response;

        if (!isApiSuccess(response)) {
          const msg = response?.Details?.Message || response?.data?.Message || response?.message || "Delete failed.";
          await uiAlert(`Failed to delete product: ${msg}`, { title: "Delete Failed", variant: "danger" });
          setFeedback(msg, "danger");
          return;
        }

        await uiAlert(`Product ${productId} deleted successfully!`, { title: "Deleted", variant: "success" });
        
        // Clear form and reset to initial state (auto-refresh)
        currentRecord = null;
        hasLoadedRecord = false;
        clearFormFields(form, { preserveKeys: true });
        setFeedback(null);
        applyMode(MODES.VIEW);
      } catch (err) {
        console.error("[ProductLgLc] Delete failed:", err);
        await uiAlert(`Error deleting product: ${toUiText(err)}`, { title: "Delete Error", variant: "danger" });
        setFeedback("Delete failed. Check console for details.", "danger");
      }
    });

    saveBtn?.addEventListener("click", async () => {
      const productId = extractId(getFieldValue("Product"));
      if (!productId) {
        setFeedback("Product ID is required.", "warning");
        return;
      }

      if (!global.ServiceLoader?.loadProductLgLcService) {
        setFeedback("Service loader is not available on this page.", "warning");
        return;
      }

      setFeedback("Saving...", "info");

      await global.ServiceLoader.loadProductLgLcService();
      if (!global.ProductLgLcService?.addEditProduct) {
        setFeedback("ProductLgLcService.addEditProduct is not available.", "danger");
        return;
      }

      const session = global.AuthService?.getSession?.() || null;
      const operatorId = session?.operatorID || session?.OperatorID || session?.operatorId || "";
      const bankId = session?.bankID || session?.BankID || global.Environment?.BankID || global.Environment?.bankID || "00";

      const currentDateTime = getCurrentDateTime();
      const mode = form.dataset.plglcMode || MODES.VIEW;

      // Helper to handle null date fields
      const getDateOrNull = (fieldId) => {
        const val = displayToIsoDate(getFieldValue(fieldId));
        return val || null;
      };

      const requestData = {
        BankID: '00',
        ProductID: productId,
        Description: getFieldValue("ProductDescription") || "",
        // Description: 'TEST',
        ProductTypeID: extractId(getFieldValue("ProductTypes")) || null,
        ProductCategoryID: extractId(getFieldValue("ProductCategory")) || null,
        ProductClassID: extractId(getFieldValue("AccountClassId")) || null,
        // ProductClassID: 'LG',
        CurrencyID: extractId(getFieldValue("Currency")) || null,
        ValidFrom: getDateOrNull("ValidFrom"),
        // ValidFrom: '2026-01-29 00:00:00',
        ValidTo: getDateOrNull("ValidTo"),
        // ValidTo: '2027-01-29 00:00:00',
        ProductCode: getFieldValue("ProductCode") || null,
        AccountingRuleID: extractId(getFieldValue("AccountingRule")) || null,
        // AccountingRuleID: 'LG',

        // Debit Interest fields
        DbIntTypeID: extractId(getFieldValue("DbIntType")) || "",
        DbIntRateID: extractId(getFieldValue("DbIntRate")) || "",
        DbIntCalcRuleID: extractId(getFieldValue("DbIntCalcRule")) || "",
        DbRoundingID: extractId(getFieldValue("DbRounding")) || "",
        DbIntApplFrequencyID: extractId(getFieldValue("DbIntApplFrequency")) || "",
        DbIntStartMonth: parseNumberLike(getFieldValue("DbIntStartMonth")) || "",
        IsDbIntTaxable: getCheckboxBit("IsDbIntTaxable"),
        DbIntTaxID: extractId(getFieldValue("DbIntTax")) || "",
        IsDbIntAcrl: getCheckboxBit("IsDbIntAcrl"),
        DbIntAcrlFrequencyID: extractId(getFieldValue("DbIntAcrlFrequency")) || "",

        // Audit fields
        // CreatedBy: mode === MODES.ADD ? operatorId : (getFieldValue("CreatedBy") || operatorId),
        CreatedBy: 'JOY_WANJA',
        CreatedOn: mode === MODES.ADD ? currentDateTime : (getDateOrNull("CreatedOn") || currentDateTime),
        ModifiedBy: 'JOY_WANJA',
        ModifiedOn: mode === MODES.EDIT ? currentDateTime : null,
        SupervisedBy: getFieldValue("SupervisedBy") || "",
        UpdateCount: mode === MODES.EDIT ? (currentRecord?.UpdateCount || 0) : 1,

        // Customer Restriction as XML
        CustomerRestriction: buildCustomerRestrictionXml(),

        // Additional JSON data (matches SP @jsons template)
        jsons:
          '{"ContractType":null,"INCOTerms":null,"CashCollateralPercentage":"","PositiveTolerance":"","NegativeTolerance":"","AccrueInterest":false,"AccrualFrequency":null,"ExpiryAdvice":false,"Confirmation":false,"CloseAdvice":false,"AllowPrepay":false,"DaysBeforeExpiry":"","DaysBeforeClosure":"","ClaimDays":"","ICCApplicableRules":"UCP","RuleDescription":""}'
      };

      console.log("Product LG/LC Save Request Data:", JSON.stringify(requestData, null, 2));
      global.__plglcLastSaveRequestData = requestData;

      try {
        const response = await global.ProductLgLcService.addEditProduct(requestData);
        global.__plglcLastSaveResponse = response;

        if (!isApiSuccess(response)) {
          const msg = response?.Details?.Message || response?.data?.Message || response?.message || "Save failed.";
          await uiAlert(`Failed to ${mode === MODES.ADD ? "create" : "update"} product: ${msg}`, {
            title: "Save Failed",
            variant: "danger"
          });
          setFeedback(msg, "danger");
          return;
        }

        await uiAlert(`Product ${mode === MODES.ADD ? "created" : "updated"} successfully!`, {
          title: "Saved",
          variant: "success"
        });
        
        // Clear form and reset to initial state (auto-refresh)
        currentRecord = null;
        hasLoadedRecord = false;
        clearFormFields(form, { preserveKeys: true });
        setFeedback(null);
        applyMode(MODES.VIEW);
      } catch (err) {
        console.error("[ProductLgLc] Save failed:", err);
        await uiAlert(`Error saving product: ${toUiText(err)}`, { title: "Save Error", variant: "danger" });
        setFeedback("Save failed. Check console for details.", "danger");
      }
    });

    cancelBtn?.addEventListener("click", () => {
      // Clear form and reset to initial state (auto-refresh)
      currentRecord = null;
      hasLoadedRecord = false;
      clearFormFields(form, { preserveKeys: true });
      setFeedback(null);
      applyMode(MODES.VIEW);
    });

    const navigateRelative = async (delta) => {
      const currentId = extractId(getFieldValue("Product"));
      if (!currentId) {
        setFeedback("Load a product first, then use navigation.", "warning");
        return;
      }

      if (!global.ServiceLoader?.loadProductLgLcService) {
        setFeedback("Service loader is not available on this page.", "warning");
        return;
      }

      setFeedback(delta < 0 ? "Loading previous product..." : "Loading next product...", "info");

      await global.ServiceLoader.loadProductLgLcService();
      if (!global.ProductLgLcService?.getSearchResult) {
        setFeedback("Search service is unavailable.", "danger");
        return;
      }

      const session = global.AuthService?.getSession?.() || null;
      const bankId = session?.bankID || session?.BankID || global.Environment?.BankID || global.Environment?.bankID || "00";
      const branchId = session?.branchID || session?.BranchID || global.Environment?.BranchID || global.Environment?.branchID || "1201";
      const operatorId = session?.operatorID || session?.OperatorID || session?.operatorId || "";

      const requestData = {
        TableID: "ProductID",
        AdvFilterString: `BankID='${bankId}' AND ProductTypeID IN ('LG','LC','AP','CD')`,
        WhereStmt: "1=1",
        PrevOrNext: delta > 0 ? "1" : "0", // Next = "1", Prev = "0" per legacy search contract
        RefID: currentId,
        OperatorID: operatorId,
        ModuleID: 2512,
        OurBranchID: branchId,
        SearchKey: currentId,
        LanguageID: "en"
      };

      try {
        const response = await global.ProductLgLcService.getSearchResult(requestData);
        if (!response?.success) {
          setFeedback(response?.message || "No more records.", "warning");
          return;
        }

        const row = pickFirstSearchRow(response);
        const nextId = extractId(row?.ProductID || row?.productID || row?.ProductId || row?.productId);
        if (!nextId || nextId.toLowerCase() === currentId.toLowerCase()) {
          setFeedback("No more records found.", "info");
          return;
        }

        const productField = document.getElementById("Product");
        if (productField) productField.value = nextId;
        await fetchProduct();
      } catch (err) {
        console.error("[ProductLgLc] Navigation failed", err);
        setFeedback("Navigation failed. Check console for details.", "danger");
      }
    };

    prevBtn?.addEventListener("click", () => navigateRelative(-1));

    nextBtn?.addEventListener("click", () => navigateRelative(1));

    document.querySelectorAll("[data-plglc-search]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const searchType = btn.dataset.plglcSearch;
        
        if (searchType === "product") {
          await openProductSearch();
        } else if (searchType === "currency") {
          await openCurrencySearch();
        } else {
          setFeedback("Search is not wired yet (UI only).", "warning");
        }
      });
    });

    // Wire sidebar items with data-child-form (Account Maintenance pattern)
    document.querySelectorAll('.sidebar-item[data-child-form], .sidebar-item--enhanced[data-child-form]').forEach(item => {
      item.addEventListener('click', function (e) {
        e.stopPropagation();

        const sidebar = document.getElementById('main-sidebar');
        const mainContainer = document.querySelector('.main-container');
        const toggle = document.getElementById('sidebarToggle');
        const isCollapsed = sidebar && sidebar.classList.contains('collapsed');

        // If sidebar is collapsed, expand it first
        if (isCollapsed) {
          sidebar.classList.remove('collapsed');
          if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
          if (toggle) toggle.setAttribute('aria-expanded', 'true');
        }

        // Set active state
        document.querySelectorAll('.sidebar-item[data-child-form], .sidebar-item--enhanced[data-child-form]').forEach(i => i.classList.remove('active'));
        this.classList.add('active');

        const childKey = this.getAttribute('data-child-form');
        if (childKey) {
          setActiveNav(childKey);
          openChildForm(childKey);
        }
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
    });

    // Default state: initial view-only (only Product ID, Product Type, and View enabled).
    applyMode(MODES.VIEW);
    setActiveNav("gl-interface");
    setHeader({ title: "Product (LG,LC)", subtitle: "Maintain LG/LC product parameters." });

    // Best-effort: load dropdown options for selection fields.
    populateDropdowns().catch(() => {
      // Non-blocking; form can still load and View can still populate current values.
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
