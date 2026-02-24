(function (global) {
  if (global.__ProductFDRDSCLoaded) {
    console.warn("product-fd-rd-sc.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__ProductFDRDSCLoaded = true;

  let dependenciesReady = false;

  // Load dependencies
  (async () => {
    const { ServiceLoader } = global;
    if (!ServiceLoader) {
      console.error('[ProductFDRDSC] ServiceLoader not available');
      return;
    }
    
    try {
      await ServiceLoader.loadCore();
      await ServiceLoader.loadCommonServices();
      await ServiceLoader.loadProductService();
      
      dependenciesReady = true;
      console.log('[ProductFDRDSC] Dependencies loaded successfully');
      
      // Initialize once dependencies are ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          if (dependenciesReady) init();
        });
      } else if (dependenciesReady) {
        init();
      }
    } catch (error) {
      console.error('[ProductFDRDSC] Failed to load dependencies:', error);
    }
  })();

  // DOM Elements
  const form = document.getElementById("product-fd-rd-sc-form");
  
  function init() {
    console.log("[ProductFDRDSC] Page initialized");
    initShellActions();
    loadDropdownOptions();
    disableFormFields(); // Disable all fields on load
    // Don't load products on init - only when View is clicked
  }

  function disableFormFields() {
    console.log("[ProductFDRDSC] Disabling form fields");
    
    // Disable all text inputs except ProductID field (needed for View)
    document.querySelectorAll('input[type="text"], input[type="date"], input[type="number"], textarea').forEach(el => {
      if (el.id !== 'ProductID') {
        el.disabled = true;
      }
    });
    
    // Disable all dropdowns
    document.querySelectorAll('select').forEach(el => {
      el.disabled = true;
    });
    
    // Disable all checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(el => {
      el.disabled = true;
    });

    // Disable all buttons except View and product search
    const addBtn = document.querySelector('[data-shell-mode="Add"]');
    const editBtn = document.querySelector('[data-shell-mode="Edit"]');
    const deleteBtn = document.querySelector('[data-shell-mode="Delete"]');
    const saveBtn = document.querySelector('[data-submit-action="save"]');
    const cancelBtn = document.querySelector('[data-submit-action="cancel"]');
    
    if (addBtn) addBtn.disabled = true;
    if (editBtn) editBtn.disabled = true;
    if (deleteBtn) deleteBtn.disabled = true;
    if (saveBtn) saveBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
  }

  function enableFormFields() {
    console.log("[ProductFDRDSC] Enabling form fields");
    
    // Enable all text inputs
    document.querySelectorAll('input[type="text"], input[type="date"], input[type="number"], textarea').forEach(el => {
      el.disabled = false;
    });
    
    // Enable all dropdowns
    document.querySelectorAll('select').forEach(el => {
      el.disabled = false;
    });
    
    // Enable all checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(el => {
      el.disabled = false;
    });
    
    // Enable Cancel button (Save is enabled separately in Add/Edit handlers)
    const cancelBtn = document.querySelector('[data-submit-action="cancel"]');
    if (cancelBtn) cancelBtn.disabled = false;
  }

  function initShellActions() {
    const viewBtn = document.querySelector('[data-shell-mode="View"]');
    if (!viewBtn) {
      console.warn('[ProductFDRDSC] View button not found');
      return;
    }
    
    // Prevent duplicate binding
    if (viewBtn.dataset.pfBound === "1") return;
    viewBtn.dataset.pfBound = "1";

    viewBtn.addEventListener("click", (e) => {
      e.preventDefault();
      loadProducts();
    });

    const addBtn = document.querySelector('[data-shell-mode="Add"]');
    if (addBtn) {
      addBtn.addEventListener("click", (e) => {
        e.preventDefault();
        clearForm();
        enableFormFields(); // Enable fields for data entry
        
        // Enable Save button when Add is clicked
        const saveBtn = document.querySelector('[data-submit-action="save"]');
        if (saveBtn) saveBtn.disabled = false;
        
        // Disable View and Edit buttons during Add
        if (viewBtn) viewBtn.disabled = true;
        const editBtn = document.querySelector('[data-shell-mode="Edit"]');
        if (editBtn) editBtn.disabled = true;
      });
    }
    
    const editBtn = document.querySelector('[data-shell-mode="Edit"]');
    if (editBtn) {
      editBtn.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("[ProductFDRDSC] Edit mode activated");
        enableFormFields(); // Enable fields for editing
        
        // Enable Save button when Edit is clicked
        const saveBtn = document.querySelector('[data-submit-action="save"]');
        if (saveBtn) saveBtn.disabled = false;
      });
    }

    const deleteBtn = document.querySelector('[data-shell-mode="Delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener("click", (e) => {
        e.preventDefault();
        deleteProduct();
      });
    }

    const saveBtn = document.querySelector('[data-submit-action="save"]');
    if (saveBtn) {
      saveBtn.addEventListener("click", (e) => {
        e.preventDefault();
        saveProduct();
      });
    }

    const cancelBtn = document.querySelector('[data-submit-action="cancel"]');
    if (cancelBtn) {
      cancelBtn.addEventListener("click", (e) => {
        e.preventDefault();
        clearForm();
        disableFormFields(); // Disable fields after cancel
      });
    }

    // Product search button - find the button next to ProductID input
    const productInput = document.getElementById('ProductID');
    const productSearchBtn = productInput?.parentElement?.querySelector('button');
    if (productSearchBtn) {
      productSearchBtn.addEventListener('click', handleProductSearch);
      console.log('[ProductFDRDSC] Product search button attached');
    } else {
      console.warn('[ProductFDRDSC] Product search button not found');
    }

    // Add F2 key handler to ProductID field
    if (productInput) {
      productInput.addEventListener('keydown', function(e) {
        if (e.key === 'F2') {
          e.preventDefault();
          console.log('[ProductFDRDSC] F2 pressed on ProductID field');
          handleProductSearch();
        }
      });
      console.log('[ProductFDRDSC] F2 key handler attached to ProductID field');
    } else {
      console.warn('[ProductFDRDSC] ProductID field not found for F2 handler');
    }
  }

  function handleProductSearch() {
    console.log('[ProductFDRDSC] Opening product search modal');
    
    // Create modal overlay and iframe
    const overlay = document.createElement('div');
    overlay.className = 'product-search-modal-overlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px);
      z-index: 9999; display: flex; align-items: center; justify-content: center;
      padding: 20px;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      width: 900px; height: 600px; background: white;
      border-radius: 16px; overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      display: flex; flex-direction: column;
    `;

    const iframe = document.createElement('iframe');
    iframe.src = '../common/product-search.html?productType=FD';
    iframe.style.cssText = 'flex: 1; width: 100%; border: none;';

    const header = document.createElement('div');
    header.style.cssText = `
      padding: 10px 20px; border-bottom: 1px solid #eee; 
      display: flex; justify-content: space-between; align-items: center;
      background: #f8fafc;
    `;
    header.innerHTML = `
      <span style="font-weight:600">Product Search</span>
      <button class="close-btn" style="border:none;background:none;font-size:18px;cursor:pointer">&times;</button>
    `;

    header.querySelector('.close-btn').addEventListener('click', () => {
      overlay.remove();
      messageHandler.remove();
    });

    modal.appendChild(header);
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        messageHandler.remove();
      }
    });

    // Create a one-time message handler
    const messageHandler = {
      handler: function(event) {
        console.log('[ProductFDRDSC] Message received:', event.data);
        
        if (event.data && event.data.type === 'PRODUCT_SELECTED') {
          console.log('[ProductFDRDSC] Product selected:', event.data);
          const { productId, productTypeId } = event.data;
          
          const productField = document.getElementById('ProductID');
          if (productField) {
            const newValue = productId ? String(productId).trim() : '';
            productField.value = newValue;
            console.log('[ProductFDRDSC] ProductID field updated to:', newValue);
          } else {
            console.error('[ProductFDRDSC] ProductID field not found');
          }
          
          overlay.remove();
          messageHandler.remove();
        } else if (event.data && event.data.type === 'CLOSE_SEARCH') {
          overlay.remove();
          messageHandler.remove();
        }
      },
      remove: function() {
        window.removeEventListener('message', this.handler);
        console.log('[ProductFDRDSC] Message listener removed');
      }
    };
    
    // Add the listener
    window.addEventListener('message', messageHandler.handler);
    console.log('[ProductFDRDSC] Message listener added for product selection');
  }

  async function loadDropdownOptions() {
    try {
      console.log("[ProductFDRDSC] Loading dropdown options...");
      const CoreApi = global.CoreApi;
      const Environment = global.Environment;
      
      if (!CoreApi || !Environment) {
        console.error("[ProductFDRDSC] CoreApi or Environment not available");
        return;
      }

      const BASE_URL = Environment.baseUrlSystemCodes || "http://172.16.2.31:3306";
      
      // Helper function to fetch system codes directly
      async function fetchSystemCodes(codeId) {
        try {
          const requestData = { CodeID: codeId };
          const envelope = CoreApi.makeRequestEnvelope("p_v1_GetSystemCodes", requestData);
          const response = await CoreApi.post(BASE_URL + "/api/OldAPI", envelope);
          
          if (!response.success) {
            console.warn(`[ProductFDRDSC] Failed to fetch ${codeId}:`, response.message);
            return [];
          }

          // Convert response to standard format { value, label }
          const data = response.data || [];
          const normalized = Array.isArray(data) ? data : [data];
          return normalized.map(row => ({
            value: row.SubCodeID,
            label: row.CodeDescription,
            order: row.DisplayOrder ?? 0
          })).sort((a, b) => a.order - b.order);
        } catch (error) {
          console.error(`[ProductFDRDSC] Error fetching ${codeId}:`, error);
          return [];
        }
      }

      // Fetch all system codes in parallel
      console.log("[ProductFDRDSC] Fetching system codes...");
      const [
        productTypes,
        productCategories,
        depositTypes,
        depositPeriodTypes,
        interestTypes,
        calculationMethods,
        compoundingFrequencies,
        roundingMethods,
        renewalRateTypes,
        accrualFrequencies,
        interestAppFrequencies
      ] = await Promise.all([
        fetchSystemCodes("ProductTypeID"),
        fetchSystemCodes("ProductCategoryID"),
        fetchSystemCodes("DepositTypeID"),
        fetchSystemCodes("DepositPeriodTypeID"),
        fetchSystemCodes("InterestTypeID"),
        fetchSystemCodes("CalculationMethodID"),
        fetchSystemCodes("CompFrequencyID"),
        fetchSystemCodes("RoundingID"),
        fetchSystemCodes("RenewalRateTypeID"),
        fetchSystemCodes("AccrualFrequencyID"),
        fetchSystemCodes("InterestAppFrequencyID")
      ]);

      console.log("[ProductFDRDSC] System codes fetched successfully");

      // Populate dropdowns
      if (productTypes.length > 0) populateDropdown("ProductTypes", productTypes);
      if (productCategories.length > 0) populateDropdown("ProductCategory", productCategories);
      if (depositTypes.length > 0) populateDropdown("DepositType", depositTypes);
      if (depositPeriodTypes.length > 0) populateDropdown("PeriodType", depositPeriodTypes);
      if (interestTypes.length > 0) populateDropdown("InterestType", interestTypes);
      if (calculationMethods.length > 0) populateDropdown("CalculationMethod", calculationMethods);
      if (compoundingFrequencies.length > 0) populateDropdown("CompoundingFrequency", compoundingFrequencies);
      if (roundingMethods.length > 0) populateDropdown("InterestRounding", roundingMethods);
      if (renewalRateTypes.length > 0) populateDropdown("RenewalRateType", renewalRateTypes);
      if (accrualFrequencies.length > 0) populateDropdown("AccrualFrequency", accrualFrequencies);
      if (interestAppFrequencies.length > 0) populateDropdown("InterestAppFrequency", interestAppFrequencies);

      console.log("[ProductFDRDSC] ✓ All dropdowns populated");
    } catch (error) {
      console.error("[ProductFDRDSC] Error loading dropdown options:", error);
    }
  }

  function populateDropdown(fieldId, data) {
    try {
      const select = document.getElementById(fieldId);
      if (!select) {
        console.warn(`[ProductFDRDSC] Dropdown element not found: ${fieldId}`);
        return;
      }

      // Clear existing options except first
      select.innerHTML = '<option value="">--Select--</option>';

      if (!Array.isArray(data) || data.length === 0) {
        console.warn(`[ProductFDRDSC] No data for dropdown: ${fieldId}`);
        return;
      }

      // Add options from system codes
      // Data format: { value, label, order } or { SubCodeID, CodeDescription }
      data.forEach(item => {
        const option = document.createElement("option");
        option.value = item.value || item.SubCodeID;
        option.textContent = item.label || item.CodeDescription;
        select.appendChild(option);
      });

      console.log(`[ProductFDRDSC] ✓ Populated ${fieldId} with ${data.length} options`);
    } catch (error) {
      console.error(`[ProductFDRDSC] Error populating dropdown ${fieldId}:`, error);
    }
  }

  function setDropdownValue(fieldId, value) {
    try {
      const select = document.getElementById(fieldId);
      if (!select) {
        console.warn(`[ProductFDRDSC] Dropdown element not found: ${fieldId}`);
        return;
      }

      if (value !== undefined && value !== null && value !== "") {
        select.value = value;
        console.log(`[ProductFDRDSC] ✓ Set dropdown ${fieldId} = ${value}`);
      } else {
        select.value = "";
        console.log(`[ProductFDRDSC] ✓ Cleared dropdown ${fieldId} (no value)`);
      }
    } catch (error) {
      console.error(`[ProductFDRDSC] Error setting dropdown ${fieldId}:`, error);
    }
  }

  function getOperatorId() {
    try {
      const session = global.AuthService?.getSession?.();
      return session?.operatorId || session?.operatorID || session?.name || "web_portal";
    } catch {
      return "CSADM";
    }
  }

  function readField(id) {
    const el = document.getElementById(id);
    return el?.value?.trim?.() || "";
  }

  function buildGetProductFDRequestData() {
    return {
      BankID: readField("BankID") || "00",
      OurBranchID: readField("OurBranchID") || "0101",
      ProductID: document.getElementById("ProductID")?.value || "",
      OperatorID: "CSADM",
      Direction: 1
    };
  }

  async function loadProducts() {
    const viewBtn = document.querySelector('[data-shell-mode="View"]');
    const originalText = viewBtn ? viewBtn.innerHTML : '';
    
    try {
      // Get ProductID from the form
      const productField = document.getElementById('ProductID');
      const productID = productField?.value?.trim();

      if (!productID) {
        alert('Please enter a Product ID');
        if (productField) productField.focus();
        return;
      }

      const ProductService = global.ProductService;
      if (!ProductService) {
        console.error("[ProductFDRDSC] ProductService not available");
        alert("ProductService not available. Please refresh the page.");
        return;
      }

      console.log("[ProductFDRDSC] Loading product:", productID);

      // Show loading state
      if (viewBtn) {
        viewBtn.disabled = true;
        viewBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Loading...';
      }

      // Get session values or use defaults
      const bankID = sessionStorage.getItem("BankID") || localStorage.getItem("BankID") || "00";
      const branchID = sessionStorage.getItem("OurBranchID") || localStorage.getItem("OurBranchID") || "0101";
      const operatorID = sessionStorage.getItem("OperatorID") || localStorage.getItem("OperatorID") || "CSADM";

      const requestData = {
        BankID: bankID,
        OurBranchID: branchID,
        ProductID: productID,
        OperatorID: operatorID,
        Direction: 0
      };

      console.log("[ProductFDRDSC] Request data:", requestData);

      const result = await ProductService.getProduct(requestData);

      console.log("[ProductFDRDSC] Full API Response:", result);

      if (result.success || result.isSuccess) {
        // Extract data from Details01 property
        let productData = null;
        
        if (result.data?.Details01) {
          const details01 = result.data.Details01;
          console.log("[ProductFDRDSC] Details01 found:", details01);
          
          // If it's an array, get first element
          if (Array.isArray(details01) && details01.length > 0) {
            productData = details01[0];
            console.log("[ProductFDRDSC] ✓ Extracted from Details01[0]");
          } else if (typeof details01 === 'object') {
            // If it's directly an object
            productData = details01;
            console.log("[ProductFDRDSC] ✓ Extracted Details01 as object");
          }
        }

        if (productData) {
          console.log("[ProductFDRDSC] Product data to populate:", productData);
          populateProductForm(productData);
          
          // Enable Add, Edit, Delete and Cancel buttons after successful view
          const addBtn = document.querySelector('[data-shell-mode="Add"]');
          const editBtn = document.querySelector('[data-shell-mode="Edit"]');
          const deleteBtn = document.querySelector('[data-shell-mode="Delete"]');
          const cancelBtn = document.querySelector('[data-submit-action="cancel"]');
          if (addBtn) addBtn.disabled = false;
          if (editBtn) editBtn.disabled = false;
          if (deleteBtn) deleteBtn.disabled = false;
          if (cancelBtn) cancelBtn.disabled = false;
        } else {
          console.warn("[ProductFDRDSC] No product data found");
          alert("No data found for this Product ID");
        }
      } else {
        const errorMsg = result.message || "Failed to load product";
        alert(`Error: ${errorMsg}`);
        console.error("[ProductFDRDSC] Load failed:", errorMsg);
      }
    } catch (error) {
      console.error("[ProductFDRDSC] Exception in loadProducts:", error);
      console.error("[ProductFDRDSC] Error stack:", error.stack);
      alert("Error loading product: " + error.message);
    } finally {
      // Restore button state
      if (viewBtn) {
        viewBtn.disabled = false;
        viewBtn.innerHTML = originalText;
      }
    }
  }

  function displayProducts(products) {
    // This function is no longer needed since we're directly binding to form
    // But keeping it for future use if needed
    console.log("[ProductFDRDSC] displayProducts called (deprecated)");
  }

  function populateProductForm(product) {
    if (!product) {
      console.error("[ProductFDRDSC] Product data is null or undefined");
      return;
    }

    console.log("[ProductFDRDSC] Starting to populate form with product:", product);

    // Map form field IDs to API response field names
    const fieldMappings = {
      ProductID: product.ProductID,
      ProductName: product.ProductName,
      ProductTypeID: product.ProductTypeID,
      ProductDescription: product.ProductDescription,
      Currency: product.Currency,
      ProductCode: product.ProductCode,
      AccountingRule: product.AccountingRuleID,
      AccountClassID: product.AccountClassID,
      ProductTypes: product.ProductTypeID,
      ValidFrom: product.ValidFromDate,
      ProductCategory: product.ProductCategoryID,
      ValidTo: product.ValidToDate,
      CustomerRestriction: product.CustomerRestrictionID,
      DepositType: product.DepositTypeID,
      PeriodType: product.PeriodTypeID,
      InterestType: product.InterestTypeID,
      CalculationMethod: product.CalculationMethodID,
      CompoundingFrequency: product.CompFrequencyID,
      DayCountBasis: product.DayCountBasisID,
      InterestMenuID: product.InterestMenuID,
      TaxRule: product.TaxRuleID,
      InterestRounding: product.InterestRoundingID,
      MinPeriodForCompounding: product.MinPeriodForCompounding,
      AccrualFrequency: product.AccrualFrequencyID,
      MinDepositAmount: product.MinDepositAmount,
      MinTerm: product.MinTerm,
      RenewalRateType: product.RenewalRateTypeID,
      SavingsRateMenu: product.SavingsRateMenuID,
      MaxDepositAmount: product.MaxDepositAmount,
      MaxTerm: product.MaxTerm,
      MinWithdrawalFrequency: product.MinWithdrawalFrequency,
      MinPeriodForWithdrawal: product.MinPeriodForWithdrawal,
      MaxDaysAllowedForRenewal: product.MaxDaysAllowedForRenewal,
      ROIAfterMaturity: product.ROIAfterMaturity,
      MinDays: product.MinDays,
      AfterNoOfDays: product.ChangeProductAfterDays,
      ChangeProductID: product.ChangeProductID,
      MinDaysForInterest: product.MinDaysForInterest,
      PenaltyApplicable: product.PenaltyApplicable,
      PenaltyGraceDays: product.PenaltyGraceDays,
      PenaltyRule: product.PenaltyRuleID
    };

    // Populate checkbox fields - map form IDs to API field names
    const checkboxMappings = {
      IsInterestTaxable: product.IsInterestTaxable,
      AccrueInterest: product.AccrueInterest,
      AllowInterestWithdrawal: product.AllowWithdrawal,
      AccrueInterestAfterMaturity: product.AccrueInterestAfterMaturity
    };

    let populatedCount = 0;
    let notFoundCount = 0;

    // Populate text inputs and selects
    Object.keys(fieldMappings).forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        const value = fieldMappings[fieldId];
        if (value !== undefined && value !== null && value !== "") {
          element.value = value;
          console.log(`[ProductFDRDSC] ✓ Set ${fieldId} = ${value}`);
          populatedCount++;
        } else {
          element.value = "";
          console.log(`[ProductFDRDSC] ✓ Cleared ${fieldId} (no value)`);
        }
      } else {
        console.warn(`[ProductFDRDSC] ✗ Element not found: ${fieldId}`);
        notFoundCount++;
      }
    });

    // Set dropdown values from product data
    setDropdownValue("AccountingRule", product.AccountingRuleID);
    setDropdownValue("ProductTypes", product.ProductTypeID);
    setDropdownValue("ProductCategory", product.ProductCategoryID);
    setDropdownValue("DepositType", product.DepositTypeID);
    setDropdownValue("PeriodType", product.DepositPeriodTypeID);
    setDropdownValue("InterestType", product.InterestTypeID);
    setDropdownValue("CalculationMethod", product.CalculationMethodID);
    setDropdownValue("CompoundingFrequency", product.CompFrequencyID);
    setDropdownValue("TaxRule", product.TaxRuleID);
    setDropdownValue("InterestRounding", product.InterestRoundingID);
    setDropdownValue("RenewalRateType", product.RenewalRateTypeID);
    setDropdownValue("AccrualFrequency", product.AccrualFrequencyID);
    setDropdownValue("InterestAppFrequency", product.InterestAppFrequencyID);

    // Populate checkboxes
    Object.keys(checkboxMappings).forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element && element.type === 'checkbox') {
        element.checked = !!checkboxMappings[fieldId];
        console.log(`[ProductFDRDSC] ✓ Set ${fieldId} checked = ${checkboxMappings[fieldId]}`);
      }
    });

    console.log(`[ProductFDRDSC] Form population complete: ${populatedCount} fields populated, ${notFoundCount} not found`);
  }

  function clearForm() {
    console.log('[ProductFDRDSC] Clearing form fields');
    
    // Clear all text inputs and textareas (use document instead of form)
    const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input[type="date"], textarea');
    inputs.forEach(input => {
      // Don't clear BankID and OurBranchID as they have default values
      if (input.id !== 'BankID' && input.id !== 'OurBranchID') {
        input.value = '';
      }
    });
    
    // Clear all select dropdowns
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
      select.value = '';
    });
    
    // Uncheck all checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    
    console.log('[ProductFDRDSC] Form cleared');
  }

  async function saveProduct() {
    try {
      const ProductService = global.ProductService;
      if (!ProductService) {
        console.error("[ProductFDRDSC] ProductService not available");
        alert("Service not available. Please refresh the page.");
        return;
      }

      // Get session values
      const bankID = sessionStorage.getItem("BankID") || localStorage.getItem("BankID") || "00";
      const operatorID = sessionStorage.getItem("OperatorID") || localStorage.getItem("OperatorID") || "CSADM";

      // Build request data matching the provided JSON structure
      const requestData = {
        BankID: bankID,
        ProductID: readField("ProductID") || "",
        Description: readField("ProductID") || "", // Using ProductID as description for now
        ProductTypeID: readField("ProductTypes") || "",
        ProductCategoryID: readField("ProductCategory") || "",
        ProductClassID: readField("AccountClassID") || "",
        CurrencyID: readField("Currency") || "",
        ValidFrom: readField("ValidFrom") || null,
        ValidTo: readField("ValidTo") || null,
        ProductCode: readField("ProductCode") || "",
        AccountingRuleID: readField("AccountingRule") || "",
        CrIntTypeID: readField("InterestType") || "",
        IntRateMenuID: readField("InterestMenuID") || "",
        CrRoundingID: readField("InterestRounding") || "",
        IsCrIntTaxable: document.getElementById("IsInterestTaxable")?.checked ? 1 : 0,
        CrIntTaxID: readField("TaxRule") || "",
        IsCrIntAcrl: document.getElementById("AccrueInterest")?.checked ? 1 : 0,
        CrIntAcrlFrequencyID: readField("AccrualFrequency") || "",
        DepositTypeID: readField("DepositType") || "",
        DepositPeriodTypeID: readField("PeriodType") || "",
        DayCountBasisID: readField("DayCountBasis") || "",
        IntCalculationMethodID: readField("CalculationMethod") || "",
        CompFrequencyID: readField("CompoundingFrequency") || "",
        MinPeriodForComp: parseInt(readField("MinPeriodForCompounding")) || 0,
        MinDeposit: parseFloat(readField("MinDepositAmount")) || 0,
        MaxDeposit: parseFloat(readField("MaxDepositAmount")) || 0,
        MinTerm: parseInt(readField("MinTerm")) || 0,
        MaxTerm: parseInt(readField("MaxTerm")) || 0,
        AllowIntWithdrawal: document.getElementById("AllowInterestWithdrawal")?.checked ? 1 : 0,
        IntWithdrawalFrequencyID: readField("InterestPayoutMode") || "",
        MinPeriodForWithdrawal: parseInt(readField("MinWithdrawalFrequency")) || 0,
        PayIntAfterMaturity: document.getElementById("isPayInterestAfterMaturity")?.checked ? 1 : 0,
        ROIAfterMaturityID: readField("ROIAfterMaturity") || "",
        MinDaysIntPayableAfterMaturity: parseInt(readField("MinDaysAfterMaturity")) || 0,
        ChangeProductOnMaturity: document.getElementById("isChangeProductOnMaturity")?.checked ? 1 : 0,
        ChangeProductAfterDays: parseInt(readField("AfterNoOfDays")) || 0,
        NewProductID: readField("ChangeProductID") || "",
        PreClosureAllowed: document.getElementById("isPrematureClosureApplicable")?.checked ? 1 : 0,
        PCAfterNoOfDays: parseInt(readField("MinDaysForInterest")) || 0,
        PCROIApplicableID: readField("PenaltyApplicable") || "",
        IsAccrueInterestAfterMaturity: document.getElementById("AccrueInterestAfterMaturity")?.checked ? 1 : 0,
        RenewalRateTypeID: readField("RenewalRateType") || "",
        MaxRenewableDaysAfterMaturity: parseInt(readField("MaxDaysAllowedForRenewal")) || 0,
        CreatedBy: operatorID,
        CreatedOn: new Date().toISOString(),
        ModifiedBy: operatorID,
        ModifiedOn: new Date().toISOString(),
        SupervisedBy: operatorID,
        UpdateCount: 0,
        DetailRecord: "",
        SavingsInterestMenuID: readField("SavingsRateMenu") || ""
      };

      console.log("[ProductFDRDSC] Saving product with data:", requestData);

      // Call the unified add/edit method
      const result = await ProductService.addEditProductFD(requestData);

      console.log("[ProductFDRDSC] Save result:", result);

      if (result.success || result.isSuccess) {
        alert("Product saved successfully!");
        clearForm();
        disableFormFields();
        
        // Re-enable only View button
        const viewBtn = document.querySelector('[data-shell-mode="View"]');
        if (viewBtn) viewBtn.disabled = false;
        
        // Disable Save button
        const saveBtn = document.querySelector('[data-submit-action="save"]');
        if (saveBtn) saveBtn.disabled = true;
      } else {
        alert(`Error saving product: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("[ProductFDRDSC] Exception in saveProduct:", error);
      alert("Error saving product. Check console for details.");
    }
  }

  async function deleteProduct() {
    try {
      const ProductService = global.ProductService;
      if (!ProductService) {
        console.error("[ProductFDRDSC] ProductService not available");
        return;
      }

      const productID = readField("ProductID");
      if (!productID) {
        alert("Please select a product to delete");
        return;
      }

      if (confirm("Are you sure you want to delete this product?")) {
        const result = await ProductService.deleteProduct({ ProductID: productID });

        if (result.success) {
          alert("Product deleted successfully!");
          clearForm();
          loadProducts();
        } else {
          alert(`Error: ${result.message}`);
        }
      }
    } catch (error) {
      console.error("[ProductFDRDSC] Exception in deleteProduct:", error);
      alert("Error deleting product. Check console for details.");
    }
  }

  // Expose functions globally for onclick handlers
  global.editProductRow = function(productID) {
    const rows = document.querySelectorAll('#productContainer tbody tr');
    rows.forEach(row => {
      if (row.querySelector('td:first-child').textContent.trim() === productID) {
        const cells = row.querySelectorAll('td');
        const product = {
          ProductID: cells[0].textContent.trim(),
          ProductName: cells[1].textContent.trim(),
          ProductTypeID: cells[2].textContent.trim(),
          ProductDescription: cells[3].textContent.trim()
        };
        
        populateProductForm(product);
        
        // Scroll form into view
        const formElement = document.querySelector('.cm-top-identifiers') || form;
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  };

})(window);
