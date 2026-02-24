(async function() {
  const { ServiceLoader } = window;

  // Prevent duplicate loading
  if (window.__ProductMaintenanceLoanLoaded) return;
  window.__ProductMaintenanceLoanLoaded = true;

  try {
    // Load dependencies
    await ServiceLoader.loadCore();
    await ServiceLoader.loadProductLoanService();
    await ServiceLoader.loadLookupService();

    const ProductLoanService = window.ProductLoanService;
    const LookupService = window.LookupService;

    const FORM_ID = "product-maintenance-loan-form";
    const SHELL_MODE = {
      VIEW: "View",
      ADD: "Add",
      EDIT: "Edit",
      DELETE: "Delete",
      SAVE: "Save",
      CANCEL: "Cancel"
    };

    console.log("[ProductMaintenanceLoan] Dependencies loaded successfully");

    function initPage() {
      console.log("[ProductMaintenanceLoan] Page initialized");
      initShellActions();
      loadDropdownOptions();
      disableFormFields(); // Disable all fields on load
    }

    function disableFormFields() {
      console.log("[ProductMaintenanceLoan] Disabling form fields");
      
      // Disable all text inputs except Product field (needed for View)
      document.querySelectorAll('input[type="text"], input[type="date"], input[type="number"], textarea').forEach(el => {
        if (el.id !== 'Product') {
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

      // Disable all lookup buttons except product search
      document.querySelectorAll('.btn-lookup').forEach(btn => {
        if (btn.id !== 'productSearchBtn') {
          btn.disabled = true;
        }
      });
      
      // Disable all action buttons on initial load
      const allButtons = Array.from(document.querySelectorAll('button'));
      const saveBtn = allButtons.find(b => b.textContent.includes('Save'));
      const cancelBtn = allButtons.find(b => b.textContent.includes('Cancel'));
      const editBtn = allButtons.find(b => b.textContent.includes('Edit'));
      const deleteBtn = allButtons.find(b => b.textContent.includes('Delete'));
      const addBtn = allButtons.find(b => b.textContent.includes('Add'));
      
      if (saveBtn) saveBtn.disabled = true;
      if (cancelBtn) cancelBtn.disabled = true;
      if (editBtn) editBtn.disabled = true;
      if (deleteBtn) deleteBtn.disabled = true;
      if (addBtn) addBtn.disabled = true;
    }

    function enableFormFields() {
      console.log("[ProductMaintenanceLoan] Enabling form fields");
      
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

      // Enable all lookup buttons
      document.querySelectorAll('.btn-lookup').forEach(btn => {
        btn.disabled = false;
      });
      
      // Enable Cancel button (Save is enabled separately in Add/Edit handlers)
      const allButtons = Array.from(document.querySelectorAll('button'));
      const cancelBtn = allButtons.find(b => b.textContent.includes('Cancel'));
      
      if (cancelBtn) cancelBtn.disabled = false;
    }

    function initShellActions() {
      // Find all buttons in the form
      const allButtons = Array.from(document.querySelectorAll('button'));
      
      // View button - Load products
      const viewBtn = allButtons.find(b => b.textContent.includes('View') && !b.textContent.includes('Withdrawal'));
      if (viewBtn) {
        viewBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          await loadProducts();
        });
      }

      // Add button - Clear form
      const addBtn = allButtons.find(b => b.textContent.includes('Add'));
      if (addBtn) {
        addBtn.addEventListener("click", (e) => {
          e.preventDefault();
          clearForm();
          enableFormFields(); // Enable fields for data entry
          
          // Enable Save button when Add is clicked
          const saveBtn = allButtons.find(b => b.textContent.includes('Save'));
          if (saveBtn) saveBtn.disabled = false;
          
          console.log("[ProductMaintenanceLoan] Form cleared for new entry");
        });
      }

      // Edit button
      const editBtn = allButtons.find(b => b.textContent.includes('Edit'));
      if (editBtn) {
        editBtn.addEventListener("click", (e) => {
          e.preventDefault();
          enableFormFields(); // Enable fields for editing
          
          // Enable Save button when Edit is clicked
          const saveBtn = allButtons.find(b => b.textContent.includes('Save'));
          if (saveBtn) saveBtn.disabled = false;
          
          console.log("[ProductMaintenanceLoan] Edit mode activated");
        });
      }

      // Delete button
      const deleteBtn = allButtons.find(b => b.textContent.includes('Delete'));
      if (deleteBtn) {
        deleteBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          await deleteProduct();
        });
      }

      // Save button
      const saveBtn = allButtons.find(b => b.textContent.includes('Save'));
      if (saveBtn) {
        saveBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          await saveProduct();
        });
      }

      // Cancel button
      const cancelBtn = allButtons.find(b => b.textContent.includes('Cancel'));
      if (cancelBtn) {
        cancelBtn.addEventListener("click", (e) => {
          disableFormFields(); // Disable fields after cancel
          e.preventDefault();
          clearForm();
        });
      }

      // Note: Product search button and F2 handler are now managed by product-maintenance-loan.js
      console.log('[ProductMaintenanceLoan] Product search functionality wired via modal');
    }

    async function loadProducts() {
      const viewBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('View') && !b.textContent.includes('Withdrawal'));
      const originalText = viewBtn ? viewBtn.innerHTML : '';
      
      try {
        // Get ProductID from the Product field
        const productField = document.getElementById('Product');
        const productID = productField?.value?.trim();

        if (!productID) {
          alert('Please enter a Product ID');
          if (productField) productField.focus();
          return;
        }

        console.log("[ProductMaintenanceLoan] Loading product:", productID);

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
          Direction: 1
        };

        console.log("[ProductMaintenanceLoan] Request data:", requestData);
        console.log("[ProductMaintenanceLoan] Calling ProductLoanService.getProductLoan...");

        let result;
        try {
          result = await ProductLoanService.getProductLoan(requestData);
        } catch (fetchError) {
          console.error("[ProductMaintenanceLoan] Network error:", fetchError);
          throw new Error(`Network error: Unable to connect to the server. Please ensure the API server is running at ${window.Environment?.baseUrlProduct || 'the configured URL'}.`);
        }

        console.log("[ProductMaintenanceLoan] Full API Response:", result);
        console.log("[ProductMaintenanceLoan] Response type:", typeof result);
        console.log("[ProductMaintenanceLoan] Response keys:", result ? Object.keys(result) : 'null');

        if (result.success || result.isSuccess) {
          console.log("[ProductMaintenanceLoan] Product loaded successfully");
          console.log("[ProductMaintenanceLoan] Response data:", result.data);
          displayProducts(result.data);
          
          // Enable Add, Edit, Delete and Cancel buttons after successful view
          const allButtons = Array.from(document.querySelectorAll('button'));
          const addBtn = allButtons.find(b => b.textContent.includes('Add'));
          const editBtn = allButtons.find(b => b.textContent.includes('Edit'));
          const deleteBtn = allButtons.find(b => b.textContent.includes('Delete'));
          const cancelBtn = allButtons.find(b => b.textContent.includes('Cancel'));
          if (addBtn) addBtn.disabled = false;
          if (editBtn) editBtn.disabled = false;
          if (deleteBtn) deleteBtn.disabled = false;
          if (cancelBtn) cancelBtn.disabled = false;
        } else {
          const errorMsg = result.message || result.Message || "Failed to load product";
          console.error("[ProductMaintenanceLoan] Load failed:", errorMsg);
          console.error("[ProductMaintenanceLoan] Full error response:", result);
          alert(`Error: ${errorMsg}`);
        }
      } catch (error) {
        console.error("[ProductMaintenanceLoan] Exception in loadProducts:", error);
        console.error("[ProductMaintenanceLoan] Error stack:", error.stack);
        alert("Error loading product: " + error.message);
      } finally {
        // Restore button state
        if (viewBtn) {
          viewBtn.disabled = false;
          viewBtn.innerHTML = originalText;
        }
      }
    }

    function displayProducts(responseData) {
      try {
        console.log("[ProductMaintenanceLoan] displayProducts called with:", responseData);

        let productData = null;

        // Handle object with Details01 property (most common format)
        if (responseData && responseData.Details01) {
          console.log("[ProductMaintenanceLoan] Response has Details01 property");
          const detailsArray = responseData.Details01;
          if (Array.isArray(detailsArray) && detailsArray.length > 0) {
            productData = detailsArray[0];
            console.log("[ProductMaintenanceLoan] Extracted from Details01[0]");
          }
        }
        // Handle array format
        else if (Array.isArray(responseData)) {
          console.log("[ProductMaintenanceLoan] Response is array");
          productData = responseData[0] || null;
        }
        // Handle object with Details property
        else if (responseData && responseData.Details) {
          console.log("[ProductMaintenanceLoan] Response has Details property");
          const detailsArray = responseData.Details;
          if (Array.isArray(detailsArray) && detailsArray.length > 0) {
            productData = detailsArray[0];
          }
        }
        // Direct object
        else if (responseData && typeof responseData === "object") {
          console.log("[ProductMaintenanceLoan] Response is direct object");
          productData = responseData;
        }

        if (productData) {
          console.log("[ProductMaintenanceLoan] Product data to populate:", productData);
          populateProductForm(productData);
        } else {
          console.warn("[ProductMaintenanceLoan] No product data found");
          alert("No data found for this Product ID");
        }
      } catch (error) {
        console.error("[ProductMaintenanceLoan] Error in displayProducts:", error);
        alert("Error displaying product data: " + error.message);
      }
    }

    function populateProductForm(product) {
      console.log("[ProductMaintenanceLoan] Starting to populate form with product:", product);

      const fieldMappings = {
        Product: "ProductID",
        ProductName: "ProductCode",
        ProductCode: "ProductCode",
        Currency: "CurrencyID",
        ValidFrom: "ValidFrom",
        ValidTo: "ValidTo",
        WorkflowID: "WorkflowID",
        AccountingRule: "AccountingRuleID",
        ProductCategory: "ProductCategoryID",
        AccountClassID: "ProductClassID",
        CustomerRestriction: "ProductTypeID",
        InterestType: "DbIntTypeID",
        InterestAppFrequency: "DbIntApplFrequencyID",
        PeriodType: "PeriodTypeID",
        MonthlyDifferentialAccrual: "MonthlyDiffAccrual",
        ProvisionFrequency: "ProvisionFrequencyID",
        InterestMenuID: "IntRateMenuID",
        InterestRounding: "DbRoundingID",
        IntCalculationRule: "DbIntCalcRuleID",
        LossProvision: "IsLossProvision",
        LoanClass: "LoanClassID",
        TaxRule: "DbIntTaxID",
        PenaltyRule: "PenaltyRuleID",
        PenaltyGraceDays: "PenaltyGraceDays",
        InstallmentRounding: "InstallmentRoundingID",
        RoundLastInstallment: "IsRoundLastInstallment",
        MinLoanAmount: "MinLoanAmount",
        MinTerm: "MinLoanTerm",
        CollateralPercentOfLoanAmount: "CollateralValue",
        MaxLoanAmount: "MaxLoanAmount",
        MaxTerm: "MaxTermExtendable",
        HolidayHandling: "HolidayHandlingTypeID",
        CollateralProductID: "CollateralProductID"
      };

      let populatedCount = 0;
      let notFoundCount = 0;

      for (const [fieldId, apiField] of Object.entries(fieldMappings)) {
        const element = document.getElementById(fieldId);
        if (!element) {
          console.warn(`[ProductMaintenanceLoan] ✗ Element not found: ${fieldId}`);
          notFoundCount++;
          continue;
        }

        const value = product[apiField];
        
        if (element.type === "checkbox") {
          element.checked = value === true || value === 1 || value === "true";
          console.log(`[ProductMaintenanceLoan] ✓ Set ${fieldId} checked = ${element.checked}`);
        } else if (element.tagName === "SELECT") {
          element.value = value || "";
          console.log(`[ProductMaintenanceLoan] ✓ Set ${fieldId} = ${value}`);
        } else {
          element.value = value || "";
          console.log(`[ProductMaintenanceLoan] ✓ Set ${fieldId} = ${value}`);
        }

        populatedCount++;
      }

      console.log(`[ProductMaintenanceLoan] Form population complete: ${populatedCount} fields populated, ${notFoundCount} not found`);
    }

    async function loadDropdownOptions() {
      try {
        console.log("[ProductMaintenanceLoan] Loading dropdown options...");

        const systemCodeMappings = {
          ValidFrom: "ValidFromDate",
          ValidTo: "ValidToDate",
          AccountingRule: "AccountingRuleID",
          ProductCategory: "ProductCategoryID",
          AccountClassID: "ProductClassID",
          CustomerRestriction: "ProductTypeID",
          InterestType: "DbIntTypeID",
          InterestAppFrequency: "DbIntApplFrequencyID",
          PeriodType: "PeriodTypeID",
          ProvisionFrequency: "ProvisionFrequencyID",
          InterestMenuID: "IntRateMenuID",
          InterestRounding: "DbRoundingID",
          IntCalculationRule: "DbIntCalcRuleID",
          LoanClass: "LoanClassID",
          TaxRule: "DbIntTaxID",
          PenaltyRule: "PenaltyRuleID",
          InstallmentRounding: "InstallmentRoundingID",
          HolidayHandling: "HolidayHandlingTypeID"
        };

        for (const [fieldId, codeId] of Object.entries(systemCodeMappings)) {
          try {
            const options = await LookupService.getSystemCodeOptions(codeId);
            if (options && options.length > 0) {
              populateDropdown(fieldId, options);
              console.log(`[ProductMaintenanceLoan] ✓ Populated ${fieldId} with ${options.length} options`);
            }
          } catch (error) {
            console.warn(`[ProductMaintenanceLoan] Failed to load options for ${codeId}:`, error.message);
          }
        }
      } catch (error) {
        console.error("[ProductMaintenanceLoan] Error loading dropdown options:", error);
      }
    }

    function populateDropdown(fieldId, options) {
      const select = document.getElementById(fieldId);
      if (!select) {
        console.warn(`[ProductMaintenanceLoan] Dropdown not found: ${fieldId}`);
        return;
      }

      select.innerHTML = '<option value="">--Select--</option>';
      options.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt.value || opt.SystemSubID;
        option.textContent = opt.label || opt.SystemSubName;
        select.appendChild(option);
      });
    }

    async function deleteProduct() {
      const productID = document.getElementById("ProductID")?.value;
      if (!productID) {
        alert("Please select a product to delete");
        return;
      }

      if (!confirm("Are you sure you want to delete this product?")) return;

      try {
        const result = await ProductLoanService.deleteProductLoan({ ProductID: productID });
        if (result.success || result.isSuccess) {
          alert("Product deleted successfully!");
          await loadProducts();
        } else {
          alert(`Error: ${result.message}`);
        }
      } catch (error) {
        console.error("[ProductMaintenanceLoan] Error deleting product:", error);
        alert("Error deleting product: " + error.message);
      }
    }

    function getFormData() {
      return {
        ProductID: document.getElementById("ProductID")?.value,
        ProductName: document.getElementById("ProductName")?.value,
        ProductCode: document.getElementById("ProductCode")?.value,
        CurrencyID: document.getElementById("Currency")?.value,
        ValidFromDate: document.getElementById("ValidFrom")?.value,
        ValidToDate: document.getElementById("ValidTo")?.value,
        AccountingRuleID: document.getElementById("AccountingRule")?.value,
        ProductCategoryID: document.getElementById("ProductCategory")?.value,
        CustomerRestrictionID: document.getElementById("CustomerRestriction")?.value,
        InterestTypeID: document.getElementById("InterestType")?.value,
        InterestAppFrequencyID: document.getElementById("InterestAppFrequency")?.value,
        DepositPeriodTypeID: document.getElementById("PeriodType")?.value,
        InterestMenuID: document.getElementById("InterestMenuID")?.value,
        InterestRoundingID: document.getElementById("InterestRounding")?.value,
        CalculationMethodID: document.getElementById("IntCalculationRule")?.value,
        TaxRuleID: document.getElementById("TaxRule")?.value,
        PenaltyRuleID: document.getElementById("PenaltyRule")?.value,
        PenaltyGraceDays: document.getElementById("PenaltyGraceDays")?.value,
        MinDepositAmount: document.getElementById("MinLoanAmount")?.value,
        MinTerm: document.getElementById("MinTerm")?.value,
        MaxDepositAmount: document.getElementById("MaxLoanAmount")?.value,
        MaxTerm: document.getElementById("MaxTerm")?.value,
        HolidayHandlingID: document.getElementById("HolidayHandling")?.value,
        BankID: "00",
        OurBranchID: "0101",
        OperatorID: "CSADM"
      };
    }

    function clearForm() {
      console.log("[ProductMaintenanceLoan] Clearing form for new entry");
      
      // Clear all text inputs
      document.querySelectorAll('input[type="text"], input[type="date"], input[type="number"], textarea').forEach(el => {
        if (el.id !== 'BankID' && el.id !== 'OurBranchID') {
          el.value = '';
        }
      });
      
      // Reset all dropdowns to first option
      document.querySelectorAll('select').forEach(el => {
        el.selectedIndex = 0;
      });
      
      // Uncheck all checkboxes
      document.querySelectorAll('input[type="checkbox"]').forEach(el => {
        el.checked = false;
      });
      
      // Focus on Product field
      const productField = document.getElementById('Product');
      if (productField) {
        productField.focus();
      }
      
      console.log("[ProductMaintenanceLoan] Form cleared successfully");
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPage);
    } else {
      initPage();
    }
  } catch (error) {
    console.error("[ProductMaintenanceLoan] Initialization error:", error);
  }
})();
