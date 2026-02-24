(() => {
  if (window.__kairoProductMaintenanceTreasuryLoaded) return;
  window.__kairoProductMaintenanceTreasuryLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  // Child form paths for inline overlay
  const CHILD_FORMS = {
    'product-gl-interface': 'product-gl-interface.html',
    'product-documents': 'product-documents.html',
    'user-defined-fields': 'user-defined-fields.html',
    'product-charges': 'product-charges.html'
  };

  // Forms that require a loaded product before navigation
  const PRODUCT_REQUIRED_FORMS = [
    'product-gl-interface', 'product-documents', 'user-defined-fields', 'product-charges'
  ];

  const state = {
    mode: MODES.VIEW,
    updateCount: 0,
    loadedProductId: "",
    isNewProduct: false // Track if this is a new product (not found in DB)
  };

  const RECENT_KEY = "kairo.product.treasury.recent";
  const RECENT_LIMIT = 6;

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  // =========================================================================
  // INLINE CHILD FORM OVERLAY SYSTEM
  // =========================================================================
  function getOverlayEls() {
    return {
      overlay: qs('[data-child-inline]'),
      iframe: qs('[data-child-iframe]'),
      mainForm: qs('[data-main-form]'),
      mainContainer: qs('.main-container')
    };
  }

  function setOverlayOpen(isOpen) {
    const { overlay, iframe, mainForm, mainContainer } = getOverlayEls();
    if (!overlay || !mainForm) return;

    if (isOpen) {
      // Opening sequence
      mainContainer?.classList.add('child-opening');
      overlay.hidden = false;

      requestAnimationFrame(() => {
        mainForm.classList.add('is-behind');
        overlay.classList.add('is-visible');
        mainContainer?.classList.add('child-open');
        mainContainer?.classList.remove('child-opening');
      });
    } else {
      // Closing sequence
      overlay.classList.remove('is-visible');
      overlay.classList.add('is-closing');
      mainContainer?.classList.remove('child-open');

      setTimeout(() => {
        overlay.hidden = true;
        overlay.classList.remove('is-closing');
        mainForm.classList.remove('is-behind');
        if (iframe) iframe.src = 'about:blank';
      }, 300);
    }
  }

  function openChildForm(childKey) {
    const path = CHILD_FORMS[childKey];
    if (!path) {
      setToast(`Unknown child form: ${childKey}`, 'warning');
      return;
    }

    // Check if product is loaded for forms that require it
    if (PRODUCT_REQUIRED_FORMS.includes(childKey)) {
      const productId = (qs('#Product')?.value || '').trim();
      if (!productId) {
        // Let users proceed but make it clear a product should be selected first
        setToast('Product not selected. Opening form anyway.', 'warning');
      }
    }

    const { iframe } = getOverlayEls();
    if (!iframe) return;

    // Load the child form with cache-busting
    iframe.src = `${path}?t=${Date.now()}`;
    setOverlayOpen(true);
  }

  function closeChildForm() {
    setOverlayOpen(false);
  }

  // Expose closeChildForm globally for child iframes
  window.closeChildForm = closeChildForm;

  function setToast(message, variant = "info") {
    const toast = qs("#pmtToast");
    if (!toast) return;
    toast.classList.remove("d-none", "alert-success", "alert-danger", "alert-warning", "alert-info");
    toast.classList.add(`alert-${variant}`);
    toast.textContent = message;
    window.setTimeout(() => toast.classList.add("d-none"), 2200);
  }

  // =========================================================================
  // MODAL NOTIFICATION SYSTEM (product-lg-lc style)
  // =========================================================================

  const toUiText = (value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (value instanceof Error) return value.message || String(value);
    if (typeof value === "object") {
      const preferred = value.message || value.Message || value.error || value.Error || value.details || value.Details;
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
    const pmtMsgModalEl = document.getElementById("pmtMessageModal");
    const pmtMsgTitleEl = document.getElementById("pmtMessageModalLabel");
    const pmtMsgBodyEl = document.getElementById("pmtMessageModalBody");
    const pmtMsgOkBtn = pmtMsgModalEl?.querySelector("[data-pmt-message-ok]");
    const pmtMsgCancelBtn = pmtMsgModalEl?.querySelector("[data-pmt-message-cancel]");

    const safeTitle = toUiText(title) || (confirmMode ? "Confirm" : "Message");
    const safeMessage = toUiText(message);
    const safeOkText = toUiText(okText) || (confirmMode ? "Yes" : "OK");
    const safeCancelText = toUiText(cancelText) || "Cancel";

    // Fallback if Bootstrap/modal markup isn't available
    if (!pmtMsgModalEl || !window.bootstrap?.Modal) {
      if (confirmMode) return Promise.resolve(window.confirm(safeMessage));
      window.alert(safeMessage);
      return Promise.resolve(true);
    }

    if (pmtMsgTitleEl) pmtMsgTitleEl.textContent = safeTitle;
    if (pmtMsgBodyEl) pmtMsgBodyEl.textContent = safeMessage;
    if (pmtMsgCancelBtn) {
      pmtMsgCancelBtn.hidden = !confirmMode;
      pmtMsgCancelBtn.textContent = safeCancelText;
    }
    if (pmtMsgOkBtn) pmtMsgOkBtn.textContent = safeOkText;

    const modal = window.bootstrap.Modal.getOrCreateInstance(pmtMsgModalEl, { backdrop: "static", keyboard: true });

    return new Promise((resolve) => {
      let resolved = false;

      const cleanup = () => {
        pmtMsgOkBtn?.removeEventListener("click", onOk);
        pmtMsgCancelBtn?.removeEventListener("click", onCancel);
        pmtMsgModalEl.removeEventListener("hidden.bs.modal", onHidden);
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
        // If user closes via X/ESC, treat as cancel for confirm, ok for alert
        finish(confirmMode ? false : true);
      };

      pmtMsgOkBtn?.addEventListener("click", onOk);
      pmtMsgCancelBtn?.addEventListener("click", onCancel);
      pmtMsgModalEl.addEventListener("hidden.bs.modal", onHidden);
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

  // Expose styled dialogs globally
  window.ProductMaintenanceTreasuryUi = { uiAlert, uiConfirm };

  // =========================================================================
  // CUSTOMER RESTRICTION CHECKBOX LIST (Multi-select dropdown)
  // =========================================================================
  /**
   * Render checkbox list for Customer Restriction multi-select dropdown
   * @param {HTMLElement} container - The container element to populate
   * @param {Array} options - Array of {value, label} objects
   */
  function renderCustomerRestrictionCheckboxList(container, options) {
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
    const input = qs("#CustomerRestrictionInput");
    const wrapper = qs("#CustomerRestrictionWrapper");
    
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
    
    console.log("[ProductMaintenanceTreasury] ✅ Customer Restriction checkbox list rendered with", options.length, "items");
  }

  /**
   * Update the Customer Restriction input display with selected values
   */
  function updateCustomerRestrictionDisplay() {
    const container = qs("#CustomerRestriction");
    const input = qs("#CustomerRestrictionInput");
    if (!container || !input) return;
    
    const checked = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => cb.getAttribute("data-label") || cb.value);
    
    input.value = checked.length > 0 ? checked.join(", ") : "";
    input.placeholder = checked.length > 0 ? "" : "Select customer restrictions...";
  }

  /**
   * Set customer restriction checkboxes based on values array
   * @param {Array} values - Array of CustomerRestrictionID values to check
   */
  function setCustomerRestrictionCheckboxes(values) {
    const crEl = qs("#CustomerRestriction");
    if (!crEl) return;
    
    // Uncheck all first
    Array.from(crEl.querySelectorAll('input[type="checkbox"]')).forEach(cb => cb.checked = false);
    
    // Check matching values
    if (Array.isArray(values) && values.length > 0) {
      values.forEach(val => {
        const checkbox = crEl.querySelector(`input[type="checkbox"][value="${val}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }
    
    // Update display
    updateCustomerRestrictionDisplay();
  }

  /**
   * Load Customer Restriction options from LookupService.getClientTypes()
   */
  async function loadCustomerRestrictionOptions() {
    const container = qs("#CustomerRestriction");
    if (!container) {
      console.warn("[ProductMaintenanceTreasury] Customer Restriction container not found");
      return;
    }
    
    // Skip if already populated
    if (container.children.length > 0) {
      console.log("[ProductMaintenanceTreasury] Customer Restriction already populated");
      return;
    }
    
    const LookupService = window.LookupService;
    if (LookupService?.getClientTypes) {
      try {
        console.log("[ProductMaintenanceTreasury] Loading Customer Restriction from LookupService.getClientTypes()...");
        const opts = await LookupService.getClientTypes();
        if (opts && opts.length > 0) {
          renderCustomerRestrictionCheckboxList(container, opts);
          return;
        }
      } catch (error) {
        console.error("[ProductMaintenanceTreasury] Error loading Customer Restriction from LookupService:", error);
      }
    }
    
    // Fallback: try system codes
    if (LookupService?.getSystemCodeOptions) {
      try {
        const opts = await LookupService.getSystemCodeOptions("CustomerRestrictionID");
        if (opts && opts.length > 0) {
          renderCustomerRestrictionCheckboxList(container, opts);
          return;
        }
      } catch (error) {
        console.warn("[ProductMaintenanceTreasury] Fallback Customer Restriction load failed:", error);
      }
    }
    
    console.warn("[ProductMaintenanceTreasury] Could not load Customer Restriction options");
  }

  // =========================================================================
  // LOAD PRODUCT TREASURY COMBO DATA ON PAGE LOAD
  // =========================================================================
  function formatRequestTime(d = new Date()) {
    const pad2 = (n) => String(n).padStart(2, "0");
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const yyyy = d.getFullYear();
    const hh = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());
    return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
  }

  async function loadProductTreasuryCombo() {
    const CoreApi = window.CoreApi;
    const Environment = window.Environment || {};

    if (!CoreApi) {
      console.error("[ProductMaintenanceTreasury] CoreApi not available");
      return;
    }

    const baseUrl = (Environment.baseUrlCommon || "http://localhost:5059").replace(/\/+$/, "");
    const endpoint = `${baseUrl}/api/OldAPI`;

    const formId = "dbo.p_GetProductTreasuryCombo";
    const requestData = {
      BankID: Environment.bankId || "BankID",
      LanguageID: Environment.languageId || "varchar"
      
    };

    const envelope = {
      RequestID: formId,
      FormId: formId,
      RequestData: requestData,
      RequestTime: formatRequestTime(),
      AppName: "PROJECT_KAIRO",
      Checksum: ""
    };

    try {
      console.log("[ProductMaintenanceTreasury] Loading product treasury combo data...", envelope);
      const response = await CoreApi.post(endpoint, envelope);
      console.log("[ProductMaintenanceTreasury] Product treasury combo response:", response);

      if (response?.success && response?.data) {
        populateDropdowns(response.data);
        setToast("Product combo data loaded successfully", "success");
        console.log("[ProductMaintenanceTreasury] ✅ Product combo data loaded");
      } else {
        console.warn("[ProductMaintenanceTreasury] No data returned from product treasury combo API");
      }
    } catch (error) {
      console.error("[ProductMaintenanceTreasury] Error loading product treasury combo:", error);
    }
  }

  // =========================================================================
  // LOAD PRODUCT TREASURY DATA (View button functionality)
  // =========================================================================
  async function loadProductTreasury() {
    const ProductLgLcService = window.ProductLgLcService;
    const Environment = window.Environment || {};

    if (!ProductLgLcService) {
      console.error("[ProductMaintenanceTreasury] ProductLgLcService not available");
      setToast("Service not available. Please refresh the page.", "danger");
      return;
    }

    const productId = (qs("#Product")?.value || "").trim();
    if (!productId) {
      setToast("Please enter a Product ID to view.", "warning");
      return;
    }

    // Get the product subtype from dropdown to filter by specific treasury type
    const productSubTypeId = (qs("#TreasuryProductType")?.value || "").trim();

    const requestData = {
      BankID: Environment.bankId || "00",
      OurBranchID: Environment.branchId || "",
      ProductID: productId,
      ProductSubTypeID: productSubTypeId, // Filter by treasury product type to avoid conflicts
      OperatorID: Environment.operatorId || "JOY_WANJA",
      Direction: 0 // 0 = current record
    };

    try {
      console.log("[ProductMaintenanceTreasury] Loading product treasury data...", requestData);
      setToast("Loading product data...", "info");

      const response = await ProductLgLcService.getProductTreasury(requestData);
      console.log("[ProductMaintenanceTreasury] Product treasury response:", response);
      console.log("[ProductMaintenanceTreasury] Response data Details01:", response?.data?.Details01);

      if (response?.success && response?.data) {
        // Check if product data exists in Details01 array (actual product data)
        const details01 = response.data.Details01;
        const hasData = Array.isArray(details01) && details01.length > 0;
        
        // Additional check: if Details01 array exists but first item has no ProductID, it's not found
        const productData = hasData ? details01[0] : null;
        const hasValidProduct = productData && productData.ProductID;
        
        console.log("[ProductMaintenanceTreasury] hasData:", hasData, "hasValidProduct:", hasValidProduct, "productData:", productData);
        
        if (hasData && hasValidProduct) {
          populateFormWithProductData(response.data);
          pushRecentProduct();
          state.isNewProduct = false;
          setMode(MODES.VIEW); // Refresh button states after loading product
          
          // Enable Edit button after successfully loading a product
          const editBtn = qs('[data-shell-mode="Update"]');
          if (editBtn) editBtn.disabled = false;
          
          setToast(`Product ${productId} loaded successfully`, "success");
          console.log("[ProductMaintenanceTreasury] ✅ Product data loaded");
        } else {
          // Product not found - enable Add mode
          state.isNewProduct = true;
          state.loadedProductId = productId;
          
          // Enable Add and Save buttons when product doesn't exist
          const addBtn = qs('[data-shell-mode="Add"]');
          const saveBtn = qs('[data-pmt-action="save"]');
          if (addBtn) addBtn.disabled = false;
          if (saveBtn) saveBtn.disabled = false;
          
          const message = `Product ${productId} not found.\n\nClick 'Add' button to create a new record.`;
          await uiAlert(message, { title: "Product Not Found", variant: "info" });
          console.log("[ProductMaintenanceTreasury] Product not found (hasData:", hasData, "hasValidProduct:", hasValidProduct, ")");
        }
      } else {
        // API error or no response
        const errorMsg = response?.message || "Product not found.";
        
        // Check if this is a specific error (like product exists in another type)
        // vs a true "not found" scenario
        const isProductExistsError = errorMsg.toLowerCase().includes("exists") || 
                                     errorMsg.toLowerCase().includes("another");
        
        if (isProductExistsError) {
          // Product exists but there's an issue - show error without Add prompt
          await uiAlert(errorMsg, { title: "Error", variant: "warning" });
          console.warn("[ProductMaintenanceTreasury] Product exists error:", errorMsg);
        } else {
          // True not found scenario - enable Add mode
          state.isNewProduct = true;
          state.loadedProductId = productId;
          
          // Enable Add and Save buttons when product doesn't exist
          const addBtn = qs('[data-shell-mode="Add"]');
          const saveBtn = qs('[data-pmt-action="save"]');
          if (addBtn) addBtn.disabled = false;
          if (saveBtn) saveBtn.disabled = false;
          
          const message = `${errorMsg}\n\nClick 'Add' button to create a new record.`;
          await uiAlert(message, { title: "Product Not Found", variant: "info" });
          console.warn("[ProductMaintenanceTreasury] No data returned:", errorMsg);
        }
      }
    } catch (error) {
      console.error("[ProductMaintenanceTreasury] Error loading product treasury:", error);
      await uiAlert(`Error loading product: ${toUiText(error)}`, { title: "Load Error", variant: "danger" });
    }
  }

  /**
   * Populate form fields with product data from API response.
   * @param {object} data - API response data containing product details
   * Response structure:
   * - Details: event/audit info
   * - Details01: actual product data
   * - Details02: customer restriction
   */
  function populateFormWithProductData(data) {
    console.log("[ProductMaintenanceTreasury] Populating form with product data:", data);

    // Product data is in Details01 array
    const product = Array.isArray(data.Details01) && data.Details01.length > 0 
      ? data.Details01[0] 
      : {};

    // Customer Restriction is in Details02 array - extract all CustomerRestrictionID values
    const customerRestrictionValues = Array.isArray(data.Details02)
      ? data.Details02.map((row) => row?.CustomerRestrictionID).filter(Boolean)
      : [];

    console.log("[ProductMaintenanceTreasury] Product from Details01:", product);
    console.log("[ProductMaintenanceTreasury] Customer Restriction values from Details02:", customerRestrictionValues);

    // Product Search Section
    setFieldValue("#Product", product.ProductID || "");
    setFieldValue("#Currency", product.CurrencyID || "");

    // Product Details Section
    setFieldValue("#ProductCategory", product.ProductCategoryID || "");
    setFieldValue("#TreasuryProductType", product.ProductSubTypeID || "");
    setFieldValue("#AccountClassId", product.ProductClassID || "");
    
    // Customer Restriction: check checkboxes based on Details02 array
    setCustomerRestrictionCheckboxes(customerRestrictionValues);
    setFieldValue("#ValidFrom", formatDateForDisplay(product.ValidFrom || ""));
    setFieldValue("#ValidTo", formatDateForDisplay(product.ValidTo || ""));
    setFieldValue("#Description", product.Description || "");
    setFieldValue("#ProductCode", product.ProductCode || "");
    setFieldValue("#AccountingRule", product.AccountingRuleID || "");

    // Credit Interest Procedure Section
    setCheckboxValue("#CreditInterestApplicable", product.CrIntTypeID != null);
    setFieldValue("#CreditDayCountBasis", product.CrDayCountBasisID || "");
    setFieldValue("#CreditInterestRounding", product.CrRoundingID || "");
    setCheckboxValue("#CreditInterestTaxable", product.IsCrIntTaxable);
    setFieldValue("#CreditTaxRule", product.CrIntTaxID || "");
    setCheckboxValue("#CreditAccrueInterest", product.IsCrIntAcrl);
    setFieldValue("#CreditAccrualFrequency", product.CrIntAcrlFrequencyID || "");
    setFieldValue("#CreditIntApplFrequency", product.CrIntApplFrequencyID || "");

    // Debit Interest Procedure Section
    setCheckboxValue("#DebitInterestApplicable", product.DbIntTypeID != null);
    setFieldValue("#DebitDayCountBasis", product.DbDayCountBasisID || "");
    setFieldValue("#DebitInterestRounding", product.DbRoundingID || "");
    setCheckboxValue("#DebitInterestTaxable", product.IsDbIntTaxable);
    setFieldValue("#DebitTaxRule", product.DbIntTaxID || "");
    setCheckboxValue("#DebitAccrueInterest", product.IsDbIntAcrl);
    setFieldValue("#DebitAccrualFrequency", product.DbIntAcrlFrequencyID || "");
    setFieldValue("#DebitIntApplFrequency", product.DbIntApplFrequencyID || "");

    // Store update count for concurrency
    state.updateCount = product.UpdateCount || 0;
    state.loadedProductId = product.ProductID || "";

    console.log("[ProductMaintenanceTreasury] ✅ Form populated successfully");
  }

  /**
   * Set field value helper - works for both input and select elements
   */
  function setFieldValue(selector, value) {
    const el = qs(selector);
    if (!el) return;
    
    if (el.tagName === "SELECT") {
      // For select, try to match value or text
      const options = el.options;
      let matched = false;
      for (let i = 0; i < options.length; i++) {
        if (options[i].value === String(value) || options[i].text === String(value)) {
          el.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched && value) {
        el.value = value;
      }
    } else {
      el.value = value || "";
    }
  }

  /**
   * Set checkbox value helper
   */
  function setCheckboxValue(selector, value) {
    const el = qs(selector);
    if (!el) return;
    el.checked = value === true || value === 1 || value === "1" || value === "Y" || value === "Yes";
  }

  /**
   * Format date for display (from various formats to DD/MMM/YYYY)
   */
  function formatDateForDisplay(dateStr) {
    if (!dateStr) return "";
    
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const day = String(d.getDate()).padStart(2, "0");
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  }

  /**
   * Clear all form fields
   */
  function clearForm() {
    const form = qs("#pmt-form");
    if (!form) return;

    qsa("input[type='text'], input[type='number']", form).forEach(el => {
      if (!el.hasAttribute("data-always-enabled")) {
        el.value = "";
      }
    });

    qsa("select", form).forEach(el => {
      el.selectedIndex = 0;
    });

    qsa("input[type='checkbox']", form).forEach(el => {
      el.checked = false;
    });

    // Clear Customer Restriction checkboxes and display
    const crEl = qs("#CustomerRestriction");
    if (crEl) {
      Array.from(crEl.querySelectorAll('input[type="checkbox"]')).forEach(cb => cb.checked = false);
    }
    const crInput = qs("#CustomerRestrictionInput");
    if (crInput) {
      crInput.value = "";
      crInput.placeholder = "Select customer restrictions...";
    }

    state.updateCount = 0;
    state.loadedProductId = "";
    state.isNewProduct = false;
  }

  function populateDropdowns(data) {
    console.log("[ProductMaintenanceTreasury] Populating dropdowns with data:", data);

    // API Response Format:
    // Details - Accounting Class (SubCodeID, ProductTypeID, Description)
    // Details01 - Accounting Rule (ID, ProductTypeID, Description)
    // Details02 - Treasury Product Type (SubCodeID, Description)
    // Details03 - Tax Rule (SubCodeID, Description)

    // Populate Account Class ID dropdown from customCodesLookupService using TreasuryAccountClassID
    const accountClassSelect = qs("#AccountClassId");
    if (accountClassSelect) {
      // Call async but don't block other dropdowns
      loadAccountClassFromCustomCodes(accountClassSelect).catch(err => {
        console.error("[ProductMaintenanceTreasury] Account Class ID load error:", err);
      });
    }

    // Populate Treasury Product Type dropdown from Details02
    const treasuryProductTypeSelect = qs("#TreasuryProductType");
    if (treasuryProductTypeSelect && data.Details02) {
      populateSelect(treasuryProductTypeSelect, data.Details02, ["SubCodeID", "ID"], ["Description", "Name"]);
      console.log("[ProductMaintenanceTreasury] ✅ Treasury Product Type dropdown populated with", data.Details02.length, "items");
    }

    // Populate Accounting Rule dropdown from customCodesLookupService using TreasuryAccountRuleID
    const accountingRuleSelect = qs("#AccountingRule");
    if (accountingRuleSelect) {
      // Call async but don't block other dropdowns
      loadAccountingRuleFromCustomCodes(accountingRuleSelect).catch(err => {
        console.error("[ProductMaintenanceTreasury] Accounting Rule load error:", err);
      });
    }

    // Populate Credit Tax Rule dropdown from Details03
    const creditTaxRuleSelect = qs("#CreditTaxRule");
    if (creditTaxRuleSelect && data.Details03) {
      populateSelect(creditTaxRuleSelect, data.Details03, ["SubCodeID", "ID"], ["Description", "Name"]);
      console.log("[ProductMaintenanceTreasury] ✅ Credit Tax Rule dropdown populated with", data.Details03.length, "items");
    }

    // Populate Debit Tax Rule dropdown from Details03
    const debitTaxRuleSelect = qs("#DebitTaxRule");
    if (debitTaxRuleSelect && data.Details03) {
      populateSelect(debitTaxRuleSelect, data.Details03, ["SubCodeID", "ID"], ["Description", "Name"]);
      console.log("[ProductMaintenanceTreasury] ✅ Debit Tax Rule dropdown populated with", data.Details03.length, "items");
    }

    // Populate Product Category dropdown - try from combo data first, fallback to LookupService
    const productCategorySelect = qs("#ProductCategory");
    if (productCategorySelect) {
      if (data.ProductCategory && Array.isArray(data.ProductCategory) && data.ProductCategory.length > 0) {
        populateSelect(productCategorySelect, data.ProductCategory, ["CategoryID", "ID", "SubCodeID"], ["CategoryName", "Description", "Name"]);
        console.log("[ProductMaintenanceTreasury] ✅ Product Category dropdown populated from combo data");
      } else {
        // Fallback: Load from LookupService like product-lg-lc.js
        loadProductCategoryFromLookup(productCategorySelect);
      }
    }

    // Customer Restriction - load as checkbox list (loaded via loadCustomerRestrictionOptions)
    // No longer populate as a select dropdown
  }

  /**
   * Load Product Category dropdown from LookupService (same pattern as product-lg-lc.js)
   */
  async function loadProductCategoryFromLookup(selectElement) {
    if (!selectElement) return;

    const LookupService = window.LookupService;
    if (!LookupService) {
      console.warn("[ProductMaintenanceTreasury] LookupService not available for ProductCategory");
      return;
    }

    // Try multiple code IDs in order of preference
    const codeCandidates = ["ProductCategoryID", "ProductCategory"];
    
    for (const codeId of codeCandidates) {
      try {
        // Use getSystemCodeOptions which returns cached {value, label} array
        const options = await LookupService.getSystemCodeOptions(codeId);
        if (options && options.length > 0) {
          // Map to {value, text} format expected by setSelectOptions
          const mappedOpts = options.map(opt => ({
            value: opt.value || "",
            text: opt.label || opt.value || ""
          }));
          setSelectOptions(selectElement, mappedOpts);
          console.log("[ProductMaintenanceTreasury] ✅ Product Category dropdown populated from LookupService with", mappedOpts.length, "items");
          return;
        }
      } catch (error) {
        console.warn(`[ProductMaintenanceTreasury] Failed to load ${codeId}:`, error);
      }
    }

    console.warn("[ProductMaintenanceTreasury] Could not load Product Category options");
  }

  /**
   * Load Accounting Rule dropdown from customCodesLookupService using TreasuryAccountRuleID
   * Uses stored procedure: dbo.p_v1_GetCustomDropDownCodes
   */
  async function loadAccountingRuleFromCustomCodes(selectElement) {
    if (!selectElement) {
      console.warn("[ProductMaintenanceTreasury] Accounting Rule select element not found");
      return;
    }

    console.log("[ProductMaintenanceTreasury] Loading Accounting Rule from customCodesLookupService...");

    const CustomCodesLookupService = window.customCodesLookupService || window.CustomCodesLookupService;
    console.log("[ProductMaintenanceTreasury] customCodesLookupService available:", !!CustomCodesLookupService);
    
    if (!CustomCodesLookupService) {
      console.warn("[ProductMaintenanceTreasury] customCodesLookupService not available for Accounting Rule");
      return;
    }

    try {
      // Use getCustomCodeOptions with TreasuryAccountRuleID
      console.log("[ProductMaintenanceTreasury] Calling getCustomCodeOptions('TreasuryAccountRuleID')...");
      const options = await CustomCodesLookupService.getCustomCodeOptions("TreasuryAccountRuleID");
      console.log("[ProductMaintenanceTreasury] Accounting Rule API response:", options);
      
      if (options && options.length > 0) {
        // Map to {value, text} format expected by setSelectOptions
        const mappedOpts = options.map(opt => ({
          value: opt.value || "",
          text: opt.label || opt.value || ""
        }));
        console.log("[ProductMaintenanceTreasury] Mapped Accounting Rule options:", mappedOpts);
        setSelectOptions(selectElement, mappedOpts);
        console.log("[ProductMaintenanceTreasury] ✅ Accounting Rule dropdown populated from customCodesLookupService with", mappedOpts.length, "items");
        return;
      } else {
        console.warn("[ProductMaintenanceTreasury] No options returned from customCodesLookupService for TreasuryAccountRuleID");
      }
    } catch (error) {
      console.error("[ProductMaintenanceTreasury] Failed to load Accounting Rule from customCodesLookupService:", error);
    }

    console.warn("[ProductMaintenanceTreasury] Could not load Accounting Rule options");
  }

  /**
   * Load Account Class ID dropdown from customCodesLookupService using TreasuryAccountClassID
   * Uses stored procedure: dbo.p_v1_GetCustomDropDownCodes
   */
  async function loadAccountClassFromCustomCodes(selectElement) {
    if (!selectElement) {
      console.warn("[ProductMaintenanceTreasury] Account Class ID select element not found");
      return;
    }

    console.log("[ProductMaintenanceTreasury] Loading Account Class ID from customCodesLookupService...");

    const CustomCodesLookupService = window.customCodesLookupService || window.CustomCodesLookupService;
    console.log("[ProductMaintenanceTreasury] customCodesLookupService available:", !!CustomCodesLookupService);
    
    if (!CustomCodesLookupService) {
      console.warn("[ProductMaintenanceTreasury] customCodesLookupService not available for Account Class ID");
      return;
    }

    try {
      // Use getCustomCodeOptions with TreasuryAccountClassID
      console.log("[ProductMaintenanceTreasury] Calling getCustomCodeOptions('TreasuryAccountClassID')...");
      const options = await CustomCodesLookupService.getCustomCodeOptions("TreasuryAccountClassID");
      console.log("[ProductMaintenanceTreasury] Account Class ID API response:", options);
      
      if (options && options.length > 0) {
        // Map to {value, text} format expected by setSelectOptions
        const mappedOpts = options.map(opt => ({
          value: opt.value || "",
          text: opt.label || opt.value || ""
        }));
        console.log("[ProductMaintenanceTreasury] Mapped Account Class ID options:", mappedOpts);
        setSelectOptions(selectElement, mappedOpts);
        console.log("[ProductMaintenanceTreasury] ✅ Account Class ID dropdown populated from customCodesLookupService with", mappedOpts.length, "items");
        return;
      } else {
        console.warn("[ProductMaintenanceTreasury] No options returned from customCodesLookupService for TreasuryAccountClassID");
      }
    } catch (error) {
      console.error("[ProductMaintenanceTreasury] Failed to load Account Class ID from customCodesLookupService:", error);
    }

    console.warn("[ProductMaintenanceTreasury] Could not load Account Class ID options");
  }

  /**
   * Parse system code response into options array (same pattern as product-lg-lc.js)
   */
  function parseSystemCodeOptions(data) {
    if (!data) return [];

    // Handle array directly
    if (Array.isArray(data)) {
      return data.map(item => ({
        value: item.SubCodeID || item.ID || item.Value || "",
        text: item.Description || item.Name || item.Text || item.SubCodeID || ""
      })).filter(opt => opt.value !== "");
    }

    // Handle Details array in response
    if (data.Details && Array.isArray(data.Details)) {
      return data.Details.map(item => ({
        value: item.SubCodeID || item.ID || item.Value || "",
        text: item.Description || item.Name || item.Text || item.SubCodeID || ""
      })).filter(opt => opt.value !== "");
    }

    return [];
  }

  /**
   * Set options on a select element (same pattern as product-lg-lc.js)
   */
  function setSelectOptions(selectElement, options, config = {}) {
    if (!selectElement || !Array.isArray(options)) return;

    const keepExisting = config.keepExisting === true;

    if (!keepExisting) {
      // Keep only the first placeholder option
      const firstOption = selectElement.querySelector("option");
      selectElement.innerHTML = "";
      if (firstOption && (firstOption.value === "" || firstOption.textContent.includes("Select"))) {
        selectElement.appendChild(firstOption);
      }
    }

    // Add new options
    options.forEach(opt => {
      // Check if option already exists
      const exists = Array.from(selectElement.options).some(o => o.value === opt.value);
      if (exists) return;

      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.text || opt.value;
      selectElement.appendChild(option);
    });
  }

  function populateSelect(selectElement, items, valueKeys, textKeys) {
    if (!selectElement || !Array.isArray(items)) {
      console.warn("[ProductMaintenanceTreasury] populateSelect: Invalid element or items", selectElement?.id, items);
      return;
    }

    console.log("[ProductMaintenanceTreasury] populateSelect for", selectElement.id, "with", items.length, "items");
    if (items.length > 0) {
      console.log("[ProductMaintenanceTreasury] First item keys:", Object.keys(items[0]), "Values:", items[0]);
    }

    // Keep the first default option
    const defaultOption = selectElement.querySelector("option");
    selectElement.innerHTML = "";
    if (defaultOption) {
      selectElement.appendChild(defaultOption);
    }

    // Helper to get value from item with case-insensitive key matching
    const getItemValue = (item, keys) => {
      for (const key of keys) {
        // Try exact match first
        if (item[key] !== undefined && item[key] !== null && item[key] !== "") {
          return item[key];
        }
        // Try case-insensitive match
        const lowerKey = key.toLowerCase();
        for (const itemKey of Object.keys(item)) {
          if (itemKey.toLowerCase() === lowerKey && item[itemKey] !== undefined && item[itemKey] !== null && item[itemKey] !== "") {
            return item[itemKey];
          }
        }
      }
      return "";
    };

    items.forEach((item) => {
      const option = document.createElement("option");
      
      // Find value using flexible key matching
      const value = getItemValue(item, valueKeys);
      
      // Find text using flexible key matching
      const text = getItemValue(item, textKeys);
      
      if (value || text) {
        option.value = value || text;
        option.textContent = text || value;
        selectElement.appendChild(option);
      }
    });

    console.log("[ProductMaintenanceTreasury] populateSelect complete for", selectElement.id, "- total options:", selectElement.options.length);
  }

  function loadRecent() {
    try {
      const raw = window.sessionStorage.getItem(RECENT_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveRecent(items) {
    try {
      window.sessionStorage.setItem(RECENT_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }

  function renderRecent() {
    const host = qs("[data-pmt-recent-list]");
    if (!host) return;
    const items = loadRecent();
    host.innerHTML = "";
    items.forEach((text) => {
      const div = document.createElement("div");
      div.className = "pmt-recent__item";
      div.textContent = text;
      host.appendChild(div);
    });
  }

  function pushRecentProduct() {
    const productName = (qs("#Product")?.value || "").trim();
    const productCode = (qs("#ProductCode")?.value || "").trim();

    const label = productCode && productName ? `${productCode} · ${productName}` : (productCode || productName);
    if (!label) return;

    const items = loadRecent().filter((x) => x && x !== label);
    items.unshift(label);
    saveRecent(items.slice(0, RECENT_LIMIT));
    renderRecent();
  }

  function setMode(nextMode) {
    state.mode = nextMode;

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#pmt-form");
    if (!form) return;

    const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

    qsa("input, select, textarea, button", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        return;
      }

      // Keep search/filter fields enabled in View mode (Product ID, Currency)
      const searchFilterIds = ["#Product", "#Currency"];
      const isSearchFilter = searchFilterIds.some(id => el.matches(id));
      if (isSearchFilter) {
        el.disabled = false;
        return;
      }

      // Treasury Product Type: only enabled in View mode (for filtering records)
      if (el.matches("#TreasuryProductType")) {
        el.disabled = isEditable; // disabled in Add/Edit, enabled in View
        return;
      }

      // Keep left nav + action buttons enabled
      if (el.closest(".cm-legacy-nav") || el.closest(".cm-legacy-actions") || el.closest(".pmt-nav-actions")) {
        el.disabled = false;
        return;
      }

      if (el.tagName === "BUTTON") {
        // Buttons inside field groups should follow editability
        el.disabled = !isEditable;
        return;
      }

      el.disabled = !isEditable;
    });

    const saveBtn = qs('[data-pmt-action="save"]');
    const cancelBtn = qs('[data-pmt-action="cancel"]');
    const deleteBtn = qs('[data-pmt-action="delete"]');
    const viewBtn = qs('[data-shell-mode="View"]');
    const addBtn = qs('[data-shell-mode="Add"]');
    const editBtn = qs('[data-shell-mode="Update"]');
    
    if (saveBtn) saveBtn.disabled = !isEditable;
    if (cancelBtn) cancelBtn.disabled = false; // Cancel always enabled to clear the page
    
    // Delete button: enabled in View or Update mode when a product is loaded
    if (deleteBtn) {
      deleteBtn.disabled = !state.loadedProductId;
    }
    
    // When in Edit/Update mode, disable mode buttons (View, Add, Edit) and Delete - only Save and Cancel should be active
    if (nextMode === MODES.UPDATE) {
      if (viewBtn) viewBtn.disabled = true;
      if (addBtn) addBtn.disabled = true;
      if (editBtn) editBtn.disabled = true;
      if (deleteBtn) deleteBtn.disabled = true;
    }
  }

  function bindModeButtons() {
    qsa("[data-shell-mode]").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        const next = (btn.getAttribute("data-shell-mode") || "").trim();
        const mode = MODES[next.toUpperCase()];
        if (!mode) return;
        setMode(mode);

        // When View button is clicked, load the product treasury data
        if (mode === MODES.VIEW) {
          loadProductTreasury();
        }

        // When Add button is clicked, clear the form for new entry (but keep Product ID and Treasury Product Type)
        if (mode === MODES.ADD) {
          const productId = (qs("#Product")?.value || "").trim();
          const treasuryProductType = (qs("#TreasuryProductType")?.value || "").trim();
          clearForm();
          // Restore Product ID if user had entered one
          if (productId) {
            setFieldValue("#Product", productId);
          }
          // Restore Treasury Product Type that was selected during View
          if (treasuryProductType) {
            setFieldValue("#TreasuryProductType", treasuryProductType);
          }
          state.isNewProduct = true;
          setToast("Ready to add new product. Fill in the details and click Save.", "info");
        }

        // When Edit button is clicked, ensure we have a loaded product
        if (mode === MODES.UPDATE) {
          if (!state.loadedProductId && !state.isNewProduct) {
            setToast("Please load a product first using View.", "warning");
            setMode(MODES.VIEW);
            return;
          }
        }
      });
    });
  }

  function wireSidebar() {
    // Wire sidebar items with data-child-form attribute
    qsa('[data-child-form]').forEach(item => {
      item.style.cursor = 'pointer';
      item.addEventListener('click', () => {
        const childKey = item.getAttribute('data-child-form');
        if (!childKey) return;

        // Update active state
        qsa('[data-child-form]').forEach(el => el.classList.remove('active'));
        item.classList.add('active');

        openChildForm(childKey);
      });
    });
  }

  function wireOverlayClose() {
    // Close on Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const { overlay } = getOverlayEls();
        if (overlay && !overlay.hidden) {
          closeChildForm();
        }
      }
    });

    // Listen for close message from child iframe
    window.addEventListener('message', e => {
      if (e.data === 'closeChildForm' || e.data?.type === 'closeChildForm') {
        closeChildForm();
      }
    });
  }

  // =========================================================================
  // PRODUCT SEARCH (Treasury products)
  // =========================================================================
  async function openProductSearch() {
    const ProductSearchService = window.ProductSearchService;
    
    if (!ProductSearchService) {
      console.error('[ProductMaintenanceTreasury] ProductSearchService not loaded');
      await uiAlert('Product search service not available. Please ensure productSearchService.js is loaded.', { 
        title: 'Error', 
        variant: 'danger' 
      });
      return;
    }

    const Environment = window.Environment || {};
    const bankId = Environment.bankId || "00";

    // Treasury-specific overrides for product search
    // ProductTypeID IN ('ML','MB','BI','BO','CP','RE','RR','ZC') - Treasury product types
    const treasuryOverrides = {
      advFilterString: `BankID='${bankId}' AND ProductTypeID IN ('ML','MB','BI','BO','CP','RE','RR','ZC')`,
      moduleId: 2506
    };

    await ProductSearchService.openSearchModal((productId, productDescription) => {
      const productField = qs("#Product");
      const descriptionField = qs("#Description");
      
      if (productField) {
        productField.value = productId || "";
      }
      if (descriptionField) {
        descriptionField.value = productDescription || "";
      }
      
      setToast(`Selected: ${productId}`, "success");
      console.log("[ProductMaintenanceTreasury] Product selected:", productId, productDescription);
      
      // Optionally trigger view to load the product details
      pushRecentProduct();
    }, treasuryOverrides);
  }

  // =========================================================================
  // CURRENCY SEARCH (same pattern as product-lg-lc.js)
  // =========================================================================
  async function openCurrencySearch() {
    const CurrencySearchService = window.CurrencySearchService;
    
    if (!CurrencySearchService) {
      console.error('[ProductMaintenanceTreasury] CurrencySearchService not loaded');
      await uiAlert('Currency search service not available. Please ensure currencySearchService.js is loaded.', { 
        title: 'Error', 
        variant: 'danger' 
      });
      return;
    }

    await CurrencySearchService.openSearchModal((currencyId, currencyName) => {
      const currencyField = qs("#Currency");
      
      if (currencyField) {
        currencyField.value = currencyId || "";
      }
      
      setToast(`Selected: ${currencyId}`, "success");
      console.log("[ProductMaintenanceTreasury] Currency selected:", currencyId, currencyName);
    });
  }

  function bindActions() {
    const saveBtn = qs('[data-pmt-action="save"]');
    const cancelBtn = qs('[data-pmt-action="cancel"]');
    const deleteBtn = qs('[data-pmt-action="delete"]');
    const viewBtn = qs('[data-pmt-action="view"]');

    viewBtn?.addEventListener("click", () => {
      setMode(MODES.VIEW);
    });

    saveBtn?.addEventListener("click", async () => {
      if (state.mode === MODES.VIEW) {
        await uiAlert('Please switch to Add or Edit mode before saving.', { title: "Cannot Save", variant: "warning" });
        return;
      }
      
      const productId = (qs("#Product")?.value || "").trim();
      const actionType = state.isNewProduct || state.mode === MODES.ADD ? 'create' : 'update';
      
      const confirmed = await uiConfirm(`Are you sure you want to ${actionType} product ${productId}?`, {
        title: actionType === 'create' ? 'Confirm Create' : 'Confirm Update',
        okText: 'Yes',
        cancelText: 'No'
      });
      
      if (confirmed) {
        setToast('Saving product...', 'info');
        await saveProductTreasury();
      }
    });

    cancelBtn?.addEventListener("click", async () => {
      const confirmed = await uiConfirm('Are you sure you want to cancel? All unsaved changes will be lost.', {
        title: 'Confirm Cancel',
        okText: 'Yes',
        cancelText: 'No'
      });
      
      if (confirmed) {
        setToast("Page cleared.", "info");
        clearForm();
        // Also clear the Product ID field
        const productField = qs("#Product");
        if (productField) productField.value = "";
        state.isNewProduct = false;
        state.loadedProductId = "";
        state.updateCount = 0;
        setMode(MODES.VIEW);
        
        // Re-enable View button and disable Add/Edit buttons after cancel
        const viewBtn = qs('[data-shell-mode="View"]');
        const addBtn = qs('[data-shell-mode="Add"]');
        const editBtn = qs('[data-shell-mode="Update"]');
        if (viewBtn) viewBtn.disabled = false;
        if (addBtn) addBtn.disabled = true;
        if (editBtn) editBtn.disabled = true;
      }
    });

    deleteBtn?.addEventListener("click", async () => {
      const productId = (qs("#Product")?.value || "").trim();
      if (!productId) {
        await uiAlert('Please load a product first before attempting to delete.', { title: "No Product", variant: "warning" });
        return;
      }

      if (!state.loadedProductId) {
        await uiAlert('No record loaded to delete.', { title: "Delete", variant: "warning" });
        return;
      }
      
      const confirmed = await uiConfirm(`Are you sure you want to delete product ${productId}?\n\nWarning: This action cannot be undone!`, {
        title: 'Confirm Delete',
        okText: 'Yes, Delete',
        cancelText: 'Cancel'
      });
      
      if (confirmed) {
        await deleteProductTreasury();
      }
    });

    qsa('[data-pmt-action="search-product"], [data-pmt-action="search-currency"]').forEach((btn) => {
      btn.addEventListener("click", async () => {
        const action = btn.getAttribute("data-pmt-action");
        if (action === "search-product") {
          await openProductSearch();
        }
        if (action === "search-currency") {
          await openCurrencySearch();
        }
      });
    });

    const productField = qs("#Product");
    const productCodeField = qs("#ProductCode");
    [productField, productCodeField].filter(Boolean).forEach((el) => {
      el.addEventListener("blur", pushRecentProduct);
      el.addEventListener("change", pushRecentProduct);
    });

    qsa('[data-pmt-nav-action]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-pmt-nav-action");
        setToast(action === "back" ? "Back (stub)." : "Forward (stub).", "info");
      });
    });
  }

  // =========================================================================
  // SAVE PRODUCT TREASURY (Add/Edit functionality)
  // =========================================================================
  async function saveProductTreasury() {
    const ProductLgLcService = window.ProductLgLcService;
    const Environment = window.Environment || {};

    if (!ProductLgLcService) {
      console.error("[ProductMaintenanceTreasury] ProductLgLcService not available");
      await uiAlert('Product service not available. Please refresh the page.', { title: "Service Error", variant: "danger" });
      return;
    }

    const productId = (qs("#Product")?.value || "").trim();
    if (!productId) {
      await uiAlert('Please enter a Product ID before saving.', { title: "Product ID Required", variant: "warning" });
      return;
    }

    const description = (qs("#Description")?.value || "").trim();
    if (!description) {
      console.log("[ProductMaintenanceTreasury] Description validation failed - showing popup");
      setToast('Description is required.', 'warning');
      await uiAlert('Description is a mandatory field. Please enter a description before saving.', { title: "Description Required", variant: "warning" });
      qs("#Description")?.focus();
      return;
    }

    // Collect form data
    const requestData = collectFormData();
    
    // Add metadata
    const now = formatRequestTime();
    requestData.BankID = Environment.bankId || "00";
    requestData.ProductID = productId;
    
    if (state.mode === MODES.ADD || state.isNewProduct) {
      // New product
      requestData.CreatedBy = Environment.operatorId || "JOY_WANJA";
      requestData.CreatedOn = now;
      requestData.ModifiedBy = "";
      requestData.ModifiedOn = "";
      requestData.UpdateCount = 1;
    } else {
      // Updating existing product
      requestData.CreatedBy = "";
      requestData.CreatedOn = "";
      requestData.ModifiedBy = Environment.operatorId || "JOY_WANJA";
      requestData.ModifiedOn = now;
      requestData.UpdateCount = state.updateCount || 1;
    }
    
    requestData.SupervisedBy = "";
    requestData.SupervisedOn = "";

    try {
      console.log("[ProductMaintenanceTreasury] Saving product treasury...", requestData);
      setToast("Saving product...", "info");

      const response = await ProductLgLcService.addEditProductTreasury(requestData);
      console.log("[ProductMaintenanceTreasury] Save response:", response);

      if (response?.success) {
        state.isNewProduct = false;
        state.loadedProductId = productId;
        
        // Update the update count from response if available
        if (response.data?.UpdateCount !== undefined) {
          state.updateCount = response.data.UpdateCount;
        } else {
          state.updateCount = (state.updateCount || 0) + 1;
        }
        
        pushRecentProduct();
        setMode(MODES.VIEW);
        console.log("[ProductMaintenanceTreasury] ✅ Product saved successfully");
        
        await uiAlert(`Product ${productId} ${state.mode === MODES.ADD ? 'created' : 'updated'} successfully!`, {
          title: "Success",
          variant: "success"
        });
      } else {
        const errorMsg = response?.message || "Failed to save product.";
        console.error("[ProductMaintenanceTreasury] Save failed:", errorMsg);
        
        await uiAlert(`Failed to ${state.mode === MODES.ADD ? 'create' : 'update'} product: ${errorMsg}`, {
          title: "Save Failed",
          variant: "danger"
        });
      }
    } catch (error) {
      console.error("[ProductMaintenanceTreasury] Error saving product:", error);
      
      await uiAlert(`Error saving product: ${toUiText(error)}`, {
        title: "Save Error",
        variant: "danger"
      });
    }
  }

  // =========================================================================
  // DELETE PRODUCT TREASURY
  // =========================================================================
  async function deleteProductTreasury() {
    const ProductLgLcService = window.ProductLgLcService;
    const Environment = window.Environment || {};

    if (!ProductLgLcService) {
      console.error("[ProductMaintenanceTreasury] ProductLgLcService not available");
      await uiAlert('Product service not available. Please refresh the page.', { title: "Service Error", variant: "danger" });
      return;
    }

    const productId = (qs("#Product")?.value || "").trim();
    if (!productId) {
      await uiAlert('Product ID is required.', { title: "Product ID Required", variant: "warning" });
      return;
    }

    const requestData = {
      BankID: Environment.bankId || "00",
      ProductID: productId,
      UpdateCount: state.updateCount || 0
    };

    try {
      console.log("[ProductMaintenanceTreasury] Deleting product treasury...", requestData);
      setToast("Deleting product...", "info");

      const response = await ProductLgLcService.deleteProductTreasury(requestData);
      console.log("[ProductMaintenanceTreasury] Delete response:", response);

      if (response?.success) {
        console.log("[ProductMaintenanceTreasury] ✅ Product deleted successfully");
        
        await uiAlert(`Product ${productId} deleted successfully!`, {
          title: "Deleted",
          variant: "success"
        });

        // Clear form and reset state
        clearForm();
        state.isNewProduct = false;
        state.loadedProductId = "";
        state.updateCount = 0;
        setMode(MODES.VIEW);
      } else {
        const errorMsg = response?.message || "Failed to delete product.";
        console.error("[ProductMaintenanceTreasury] Delete failed:", errorMsg);
        
        await uiAlert(`Failed to delete product: ${errorMsg}`, {
          title: "Delete Failed",
          variant: "danger"
        });
      }
    } catch (error) {
      console.error("[ProductMaintenanceTreasury] Error deleting product:", error);
      
      await uiAlert(`Error deleting product: ${toUiText(error)}`, {
        title: "Delete Error",
        variant: "danger"
      });
    }
  }

  /**
   * Collect form data for save operation
   * @returns {object} Request data object
   */
  function collectFormData() {
    const getVal = (sel) => (qs(sel)?.value || "").trim();
    const getChecked = (sel) => qs(sel)?.checked ? 1 : 0;

    // ProductTypeID is same as ProductSubTypeID (Treasury Product Type)
    const productSubTypeId = getVal("#TreasuryProductType");

    return {
      // Product Details
      ProductID: (qs("#Product")?.value || "").trim(),
      Description: getVal("#Description"),
      ProductTypeID: productSubTypeId, // Same as ProductSubTypeID
      ProductSubTypeID: productSubTypeId,
      ProductCategoryID: getVal("#ProductCategory"),
      ProductClassID: getVal("#AccountClassId"),
      CurrencyID: getVal("#Currency"),
      ValidFrom: formatDateForApi(getVal("#ValidFrom")),
      ValidTo: formatDateForApi(getVal("#ValidTo")),
      ProductCode: getVal("#ProductCode"),
      AccountingRuleID: getVal("#AccountingRule"),
      
      // Credit Interest Procedure
      CrDayCountBasisID: getVal("#CreditDayCountBasis"),
      CrRoundingID: getVal("#CreditInterestRounding"),
      IsCrIntTaxable: getChecked("#CreditInterestTaxable"),
      CrIntTaxID: getVal("#CreditTaxRule"),
      IsCrIntAcrl: getChecked("#CreditAccrueInterest"),
      CrIntAcrlFrequencyID: getVal("#CreditAccrualFrequency"),
      CrIntApplnFrequencyID: getVal("#CreditIntApplFrequency"),
      
      // Debit Interest Procedure
      DbDayCountBasisID: getVal("#DebitDayCountBasis"),
      DbRoundingID: getVal("#DebitInterestRounding"),
      IsDbIntTaxable: getChecked("#DebitInterestTaxable"),
      DbIntTaxID: getVal("#DebitTaxRule"),
      IsDbIntAcrl: getChecked("#DebitAccrueInterest"),
      DbIntAcrlFrequencyID: getVal("#DebitAccrualFrequency"),
      DbIntApplnFrequencyID: getVal("#DebitIntApplFrequency"),
      
      // Customer Restriction (XML format if needed)
      CustomerRestriction: buildCustomerRestrictionXml()
    };
  }

  /**
   * Format date for API (from DD/MMM/YYYY to MM/DD/YYYY HH:MM:SS)
   */
  function formatDateForApi(dateStr) {
    if (!dateStr) return "";
    
    try {
      // Parse DD/MMM/YYYY format
      const parts = dateStr.split("/");
      if (parts.length !== 3) return dateStr;
      
      const months = {
        "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04",
        "May": "05", "Jun": "06", "Jul": "07", "Aug": "08",
        "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12"
      };
      
      const day = parts[0].padStart(2, "0");
      const month = months[parts[1]] || parts[1];
      const year = parts[2];
      
      return `${month}/${day}/${year} 00:00:00`;
    } catch {
      return dateStr;
    }
  }

  /**
   * Build Customer Restriction XML from checked checkboxes
   * Match SP expectation:
   * @p28 = convert(xml, N'<dt_ProductRestrictions><CustomerRestrictionID>M</CustomerRestrictionID></dt_ProductRestrictions>')
   */
  function buildCustomerRestrictionXml() {
    const crEl = qs("#CustomerRestriction");
    if (!crEl) {
      return "<dt_ProductRestrictions><CustomerRestrictionID>M</CustomerRestrictionID></dt_ProductRestrictions>";
    }
    
    // Get checked checkboxes
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
  }

  // =========================================================================
  // SIDEBAR NAV SECTIONS (accordion behavior)
  // =========================================================================
  function setSectionOpen(section, open) {
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
  }

  function wireNavSections() {
    const sections = qsa('[data-nav-section]');
    if (!sections.length) return;

    sections.forEach(section => {
      const header = section.querySelector('.nav-header, .nav-header--card');
      if (!header) return;

      header.addEventListener('click', function (e) {
        // Don't toggle if clicking on the badge number
        if (e.target.closest('.nav-badge')) return;

        const sidebar = qs('#main-sidebar');
        const mainContainer = qs('.main-container');
        const toggle = qs('#sidebarToggle');
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
  }

  // =========================================================================
  // SIDEBAR TOGGLE (expand/collapse sidebar)
  // =========================================================================
  function wireSidebarToggle() {
    const sidebar = qs('#main-sidebar');
    const toggle = qs('#sidebarToggle');
    const mainContainer = qs('.main-container');
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
        qsa('.nav-section--card').forEach(section => {
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
        qsa('.nav-items--card').forEach(items => {
          items.hidden = false;
        });
      }
    });
  }

  // =========================================================================
  // COLLAPSIBLE FORM SECTIONS
  // =========================================================================
  function wireCollapsibleSections() {
    qsa('.form-section[data-section]').forEach(section => {
      const header = section.querySelector('[data-section-toggle]');
      const content = section.querySelector('[data-section-content]');
      const toggleBtn = section.querySelector('.section-toggle-btn');

      if (!header || !content) return;

      header.addEventListener('click', function (e) {
        // Don't toggle if clicking on a button (except the toggle button itself)
        if (e.target.closest('button') && !e.target.closest('.section-toggle-btn')) return;
        // Don't toggle if clicking on a checkbox or its label
        if (e.target.closest('input[type="checkbox"]') || e.target.closest('label[for]')) return;

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
  }

  // =========================================================================
  // SUBMODULE SEARCH
  // =========================================================================
  function wireSubmoduleSearch() {
    const searchInput = qs('#submoduleSearch');
    const clearBtn = qs('#submoduleSearchClear');
    if (!searchInput) return;

    const allItems = qsa('.sidebar-item, .sidebar-item--enhanced');
    const allSections = qsa('[data-nav-section]');

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
  }

  // =========================================================================
  // DATE PICKER INITIALIZATION (Flatpickr)
  // =========================================================================
  function initDatePickers() {
    if (typeof flatpickr === 'undefined') {
      console.warn("[ProductMaintenanceTreasury] Flatpickr not loaded - date pickers will not be available");
      return;
    }

    const dateConfig = {
      dateFormat: "d/M/Y", // DD/MMM/YYYY format (e.g., 01/Jan/2026)
      allowInput: true,
      altInput: false,
      clickOpens: true,
      disableMobile: true, // Use flatpickr on mobile too for consistent UX
      monthSelectorType: "dropdown",
      yearSelectorType: "dropdown",
      // Custom month names for the format
      locale: {
        months: {
          shorthand: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
          longhand: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        }
      }
    };

    // Initialize Valid From datepicker
    const validFromInput = qs("#ValidFrom");
    if (validFromInput) {
      const validFromPicker = flatpickr(validFromInput, {
        ...dateConfig,
        onChange: function(selectedDates, dateStr, instance) {
          console.log("[ProductMaintenanceTreasury] Valid From changed:", dateStr);
        }
      });
      // Store reference for later access
      validFromInput._flatpickr = validFromPicker;
    }

    // Initialize Valid To datepicker
    const validToInput = qs("#ValidTo");
    if (validToInput) {
      const validToPicker = flatpickr(validToInput, {
        ...dateConfig,
        onChange: function(selectedDates, dateStr, instance) {
          console.log("[ProductMaintenanceTreasury] Valid To changed:", dateStr);
        }
      });
      // Store reference for later access
      validToInput._flatpickr = validToPicker;
    }

    // Wire up calendar icon buttons
    qsa('[data-toggle-datepicker]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-toggle-datepicker');
        const targetInput = qs(`#${targetId}`);
        if (targetInput && targetInput._flatpickr) {
          targetInput._flatpickr.toggle();
        }
      });
    });

    console.log("[ProductMaintenanceTreasury] ✅ Date pickers initialized");
  }

  window.addEventListener("load", () => {
    wireNavSections();
    wireSidebarToggle();
    wireCollapsibleSections();
    wireSubmoduleSearch();
    bindModeButtons();
    wireSidebar();
    wireOverlayClose();
    bindActions();
    renderRecent();
    setMode(MODES.VIEW);

    // Disable Add and Edit buttons on page load - only View should be active
    const addBtn = qs('[data-shell-mode="Add"]');
    const editBtn = qs('[data-shell-mode="Update"]');
    if (addBtn) addBtn.disabled = true;
    if (editBtn) editBtn.disabled = true;

    // Initialize date pickers for Valid From and Valid To fields
    initDatePickers();

    // Load product treasury combo data on page load to activate View functionality
    loadProductTreasuryCombo();

    // Also load dropdowns from LookupService as fallback
    loadDropdownsFromLookupService();

    // Expose services and state to child forms (for iframe access)
    window.ServiceLoader = window.ServiceLoader || {};
    window.ServiceLoader.loadProductLgLcService = () => window.ProductLgLcService;
    
    window.ProductMaintenanceTreasuryState = {
      getState: () => ({ ...state }),
      getProductId: () => state.loadedProductId,
      getMode: () => state.mode,
      isProductLoaded: () => !!state.loadedProductId
    };
  });

  /**
   * Load dropdown options from LookupService (same pattern as product-lg-lc.js)
   * This acts as a fallback if the combo API doesn't return the data
   */
  async function loadDropdownsFromLookupService() {
    const LookupService = window.LookupService;
    if (!LookupService) {
      console.warn("[ProductMaintenanceTreasury] LookupService not available - ensure lookupService.js is loaded");
      return;
    }

    console.log("[ProductMaintenanceTreasury] Loading dropdowns from LookupService...");

    // Helper to check if select only has placeholder
    const isPlaceholderOnly = (selectEl) => {
      if (!selectEl || selectEl.tagName !== "SELECT") return false;
      const nonBlank = Array.from(selectEl.options).filter((o) => o.value !== "");
      return nonBlank.length === 0;
    };

    // Helper to load system codes using getSystemCodeOptions (returns {value, label} array)
    const loadCodes = async (codeCandidates = []) => {
      for (const codeId of codeCandidates) {
        try {
          // Use getSystemCodeOptions which returns cached {value, label, order} array
          const options = await LookupService.getSystemCodeOptions(codeId);
          if (options && options.length > 0) {
            // Map to {value, text} format expected by setSelectOptions
            return options.map(opt => ({
              value: opt.value || "",
              text: opt.label || opt.value || ""
            }));
          }
        } catch (error) {
          console.warn(`[ProductMaintenanceTreasury] Failed to load ${codeId}:`, error);
        }
      }
      return [];
    };

    // Load Product Category if empty
    const productCategoryEl = qs("#ProductCategory");
    if (isPlaceholderOnly(productCategoryEl)) {
      const opts = await loadCodes(["ProductCategoryID", "ProductCategory"]);
      if (opts.length > 0) {
        setSelectOptions(productCategoryEl, opts);
        console.log("[ProductMaintenanceTreasury] ✅ Product Category loaded from LookupService with", opts.length, "items");
      }
    }

    // Load Account Class ID if empty - use customCodesLookupService with TreasuryAccountClassID
    const accountClassEl = qs("#AccountClassId");
    if (isPlaceholderOnly(accountClassEl)) {
      await loadAccountClassFromCustomCodes(accountClassEl);
    }

    // Load Accounting Rule if empty - use customCodesLookupService with TreasuryAccountRuleID
    const accountingRuleEl = qs("#AccountingRule");
    if (isPlaceholderOnly(accountingRuleEl)) {
      await loadAccountingRuleFromCustomCodes(accountingRuleEl);
    }

    // Load Customer Restriction checkboxes using LookupService.getClientTypes()
    await loadCustomerRestrictionOptions();

    // Load Day Count Basis for Credit Interest
    const creditDayCountEl = qs("#CreditDayCountBasis");
    if (isPlaceholderOnly(creditDayCountEl)) {
      const opts = await loadCodes(["DayCountBasisID", "DayCountBasis"]);
      if (opts.length > 0) {
        setSelectOptions(creditDayCountEl, opts);
        console.log("[ProductMaintenanceTreasury] ✅ Credit Day Count Basis loaded from LookupService");
      }
    }

    // Load Day Count Basis for Debit Interest
    const debitDayCountEl = qs("#DebitDayCountBasis");
    if (isPlaceholderOnly(debitDayCountEl)) {
      const opts = await loadCodes(["DayCountBasisID", "DayCountBasis"]);
      if (opts.length > 0) {
        setSelectOptions(debitDayCountEl, opts);
        console.log("[ProductMaintenanceTreasury] ✅ Debit Day Count Basis loaded from LookupService");
      }
    }

    // Load Interest Rounding for Credit
    const creditRoundingEl = qs("#CreditInterestRounding");
    if (isPlaceholderOnly(creditRoundingEl)) {
      const opts = await loadCodes(["RoundingID", "IntRoundingID", "InterestRounding"]);
      if (opts.length > 0) {
        setSelectOptions(creditRoundingEl, opts);
        console.log("[ProductMaintenanceTreasury] ✅ Credit Interest Rounding loaded from LookupService");
      }
    }

    // Load Interest Rounding for Debit
    const debitRoundingEl = qs("#DebitInterestRounding");
    if (isPlaceholderOnly(debitRoundingEl)) {
      const opts = await loadCodes(["RoundingID", "IntRoundingID", "InterestRounding"]);
      if (opts.length > 0) {
        setSelectOptions(debitRoundingEl, opts);
        console.log("[ProductMaintenanceTreasury] ✅ Debit Interest Rounding loaded from LookupService");
      }
    }

    // Load Accrual Frequency for Credit
    const creditAccrualFreqEl = qs("#CreditAccrualFrequency");
    if (isPlaceholderOnly(creditAccrualFreqEl)) {
      const opts = await loadCodes(["AccrualFrequencyID", "AccrualFrequency", "FrequencyID"]);
      if (opts.length > 0) {
        setSelectOptions(creditAccrualFreqEl, opts);
        console.log("[ProductMaintenanceTreasury] ✅ Credit Accrual Frequency loaded from LookupService");
      }
    }

    // Load Accrual Frequency for Debit
    const debitAccrualFreqEl = qs("#DebitAccrualFrequency");
    if (isPlaceholderOnly(debitAccrualFreqEl)) {
      const opts = await loadCodes(["AccrualFrequencyID", "AccrualFrequency", "FrequencyID"]);
      if (opts.length > 0) {
        setSelectOptions(debitAccrualFreqEl, opts);
        console.log("[ProductMaintenanceTreasury] ✅ Debit Accrual Frequency loaded from LookupService");
      }
    }

    // Load Application Frequency for Credit
    const creditApplFreqEl = qs("#CreditIntApplFrequency");
    if (isPlaceholderOnly(creditApplFreqEl)) {
      const opts = await loadCodes(["ApplicationFrequencyID", "IntApplFrequencyID", "FrequencyID"]);
      if (opts.length > 0) {
        setSelectOptions(creditApplFreqEl, opts);
        console.log("[ProductMaintenanceTreasury] ✅ Credit Application Frequency loaded from LookupService");
      }
    }

    // Load Application Frequency for Debit
    const debitApplFreqEl = qs("#DebitIntApplFrequency");
    if (isPlaceholderOnly(debitApplFreqEl)) {
      const opts = await loadCodes(["ApplicationFrequencyID", "IntApplFrequencyID", "FrequencyID"]);
      if (opts.length > 0) {
        setSelectOptions(debitApplFreqEl, opts);
        console.log("[ProductMaintenanceTreasury] ✅ Debit Application Frequency loaded from LookupService");
      }
    }
  }
})();
