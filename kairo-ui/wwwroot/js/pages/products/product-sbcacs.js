// Wait for DOM to be ready before initializing
function initializeWhenReady() {
  console.log('🚀 initializeWhenReady called - DOM readyState:', document.readyState);
  const { ServiceLoader } = window;
  
  console.log('🚀 Product (SB/CA/CS/SH) page initializing...');
  
      const btnView = document.getElementById('viewID');

  (async function() {
    try {
      // Load dependencies
      console.log('📚 Loading core services...');
      await ServiceLoader.loadCore();
      console.log('✓ Core loaded');
      
      console.log('📚 Loading ProductSBCACSService...');
      await ServiceLoader.loadProductSBCACSService();
      console.log('✓ ProductSBCACSService loaded');
      
      console.log('📚 Loading LookupService...');
      await ServiceLoader.loadLookupService();
      console.log('✓ LookupService loaded');
      
      const ProductSBCACSService = window.ProductSBCACSService;
      const LookupService = window.LookupService;
    
    if (!ProductSBCACSService) {
      throw new Error('ProductSBCACSService is not available');
    }
    
    console.log('✓ All services loaded successfully');
    
    const DEFAULT_PRODUCT_TYPE_ID = 'BD';
    let currentProduct = null;
    let isEditMode = false;
    
    // Initialize page
    function initPage() {
      console.log('🎯 Initializing page...');
      
      // Set default values from session storage with hardcoded defaults
      const defaultBankID = sessionStorage.getItem("BankID") || "00";
      const defaultBranchID = sessionStorage.getItem("OurBranchID") || "0101";
      const defaultOperatorID = sessionStorage.getItem("OperatorID") || "CSADM";
      const defaultProductTypeID = DEFAULT_PRODUCT_TYPE_ID;
      
      document.getElementById("bankID").value = defaultBankID;
      document.getElementById("branchID").value = defaultBranchID;
      document.getElementById("operatorID").value = defaultOperatorID;

      // Populate ProductTypeID dropdown then apply default
      loadProductTypes(defaultProductTypeID);
      
      console.log('✓ Default values set:');
      console.log(`  BankID: ${defaultBankID}`);
      console.log(`  OurBranchID: ${defaultBranchID}`);
      console.log(`  OperatorID: ${defaultOperatorID}`);
      console.log(`  ProductTypeID: ${defaultProductTypeID}`);
      
      // Attach button handlers
      attachButtonHandlers();
      
      console.log('✓ Page initialization complete');
    }

    async function loadProductTypes(defaultValue) {
      const select = document.getElementById('productTypeID');
      console.log('🔍 loadProductTypes called with defaultValue:', defaultValue);
      console.log('  select element found?', !!select);
      console.log('  LookupService:', typeof LookupService);
      console.log('  LookupService.getSystemCodeOptions:', typeof LookupService?.getSystemCodeOptions);
      
      if (!select) {
        console.warn('⚠ productTypeID select not found');
        return;
      }

      try {
        if (!LookupService) {
          console.warn('⚠ LookupService not available yet');
          if (defaultValue) select.value = defaultValue;
          return;
        }

        if (typeof LookupService.getSystemCodeOptions !== 'function') {
          console.warn('⚠ LookupService.getSystemCodeOptions not a function');
          console.warn('  LookupService keys:', Object.keys(LookupService));
          if (defaultValue) select.value = defaultValue;
          return;
        }

        console.log('📥 Loading ProductTypeID options from LookupService...');
        const options = await LookupService.getSystemCodeOptions('ProductTypeID');
        console.log('✓ ProductTypeID options received:', options);

        if (!Array.isArray(options)) {
          console.warn('⚠ Options is not an array:', typeof options, options);
          if (defaultValue) select.value = defaultValue;
          return;
        }

        // Keep only the select header
        select.innerHTML = '<option value="">--Select--</option>';

        // Add options from lookup
        for (const opt of options) {
          const value = opt.value ?? opt.Value ?? opt.code ?? opt.Code;
          const label = opt.label ?? opt.Label ?? opt.description ?? opt.Description ?? value;
          
          if (!value) {
            console.warn('  Skipping option with no value:', opt);
            continue;
          }

          const optionEl = document.createElement('option');
          optionEl.value = String(value);
          optionEl.textContent = String(label);
          select.appendChild(optionEl);
          console.log('  Added option:', String(value), '=', String(label));
        }

        // Ensure the default exists as an option
        if (defaultValue) {
          const hasDefault = Array.from(select.options).some(o => o.value === String(defaultValue));
          if (!hasDefault) {
            console.log('  Default', defaultValue, 'not in options, adding it');
            const optionEl = document.createElement('option');
            optionEl.value = String(defaultValue);
            optionEl.textContent = defaultValue === 'BD' ? 'Bill Discounting (BD)' : String(defaultValue);
            select.appendChild(optionEl);
          }
          select.value = String(defaultValue);
          console.log('  Set dropdown value to:', select.value);
        }

        console.log('✓ ProductTypeID dropdown populated with', select.options.length - 1, 'options');
      } catch (error) {
        console.error('❌ Error loading ProductTypeID options:', error);
        console.error('  Stack:', error.stack);
        if (defaultValue) select.value = defaultValue;
      }
    }
    
    function attachButtonHandlers() {
      const buttons = document.querySelectorAll(".cm-shell__action");
      let viewBtn, addBtn, editBtn, deleteBtn, saveBtn, cancelBtn;
      
      console.log('🔎 Found', buttons.length, 'buttons with cm-shell__action class');
      buttons.forEach((btn, idx) => {
        const text = btn.textContent.trim();
        console.log(`  Button ${idx}: "${text}"`);
        if (text === "View") viewBtn = btn;
        if (text === "Add") addBtn = btn;
        if (text === "Edit") editBtn = btn;
        if (text === "Delete") deleteBtn = btn;
        if (text === "Save") saveBtn = btn;
        if (text === "Cancel") cancelBtn = btn;
      });
      
      //const btnView = document.getElementById('viewID');
      if (btnView) {
        console.log('✓ View button found and attached');
        viewBtn.addEventListener("click", handleView);
      } else {
        console.warn('⚠ View button not found');
        console.warn('Available buttons:', Array.from(buttons).map(b => b.textContent.trim()));
      }
      
      if (addBtn) {
        console.log('✓ Add button found and attached');
        addBtn.addEventListener("click", handleAdd);
      }
      
      if (editBtn) {
        console.log('✓ Edit button found and attached');
        editBtn.addEventListener("click", handleEdit);
      }
      
      if (deleteBtn) {
        console.log('✓ Delete button found and attached');
        deleteBtn.addEventListener("click", handleDelete);
      }
      
      if (saveBtn) {
        console.log('✓ Save button found and attached');
        saveBtn.addEventListener("click", handleSave);
      }
      
      if (cancelBtn) {
        console.log('✓ Cancel button found and attached');
        cancelBtn.addEventListener("click", handleCancel);
      }
    }
    
    /**
     * Handle View button click - retrieve product details
     */
    async function handleView() {
      console.log('🔍 View button clicked');
      
      const productID = document.getElementById("productID").value;
      const productTypeID = document.getElementById("productTypeID").value;
      
      if (!productID) {
        alert("Please enter Product ID");
        return;
      }
      
      if (!productTypeID) {
        alert("Please select Product Type");
        return;
      }
      
      const requestData = {
        BankID: document.getElementById("bankID").value,
        OurBranchID: document.getElementById("branchID").value,
        ProductID: productID,
        ProductTypeID: productTypeID,
        OperatorID: document.getElementById("operatorID").value,
        Direction: 1
      };
      
      console.log('📤 Sending request with ProductID:', productID);
      console.log('Request data:', requestData);
      
      try {
        const result = await ProductSBCACSService.getProductSB(requestData);
        console.log('📥 Response received:', result);
        
        if (result.success) {
          currentProduct = result.data;
          displayProductDetails(result.data);
          isEditMode = false;
          console.log('✓ Product details loaded');
        } else {
          alert(`Error: ${result.message}`);
        }
      } catch (error) {
        console.error("❌ Error loading product:", error);
        alert("Error loading product details");
      }
    }
    
    /**
     * Handle Cancel button click
     */
    function handleCancel() {
      console.log('❌ Cancel button clicked');
      clearForm();
      isEditMode = false;
      currentProduct = null;
      document.getElementById("productID").disabled = false;
    }
    
    /**
     * Handle Add button click
     */
    function handleAdd() {
      console.log('➕ Add button clicked');
      clearForm();
      isEditMode = false;
      document.getElementById("productID").disabled = false;
    }
    
    /**
     * Handle Edit button click
     */
    function handleEdit() {
      console.log('✏️ Edit button clicked');
      if (!currentProduct) {
        alert("Please process a product first");
        return;
      }
      isEditMode = true;
      document.getElementById("productID").disabled = true;
    }
    
    /**
     * Handle Delete button click
     */
    async function handleDelete() {
      console.log('🗑️ Delete button clicked');
      if (!currentProduct) {
        alert("Please process a product first");
        return;
      }
      
      if (!confirm("Are you sure you want to delete this product?")) {
        return;
      }
      
      const requestData = {
        BankID: document.getElementById("bankID").value,
        OurBranchID: document.getElementById("branchID").value,
        ProductID: document.getElementById("productID").value,
        ProductTypeID: document.getElementById("productTypeID").value,
        OperatorID: document.getElementById("operatorID").value
      };
      
      try {
        const result = await ProductSBCACSService.deleteProductSB(requestData);
        if (result.success) {
          alert("Product deleted successfully!");
          clearForm();
          currentProduct = null;
        } else {
          alert(`Error: ${result.message}`);
        }
      } catch (error) {
        console.error("❌ Error deleting product:", error);
        alert("Error deleting product");
      }
    }
    
    /**
     * Handle Save button click
     */
    async function handleSave() {
      console.log('💾 Save button clicked');
      
      const formData = getFormData();
      
      if (!formData.ProductID) {
        alert("Product ID is required");
        return;
      }
      
      try {
        let result;
        if (isEditMode) {
          console.log("Updating product...");
          result = await ProductSBCACSService.updateProductSB(formData);
        } else {
          console.log("Creating new product...");
          result = await ProductSBCACSService.createProductSB(formData);
        }
        
        if (result.success) {
          alert(isEditMode ? "Product updated successfully!" : "Product created successfully!");
          clearForm();
          currentProduct = null;
          isEditMode = false;
        } else {
          alert(`Error: ${result.message}`);
        }
      } catch (error) {
        console.error("❌ Error saving product:", error);
        alert("Error saving product");
      }
    }
    
    /**
     * Display product details in the form
     */
    function displayProductDetails(data) {
      console.log('📋 Displaying product details:', data);
      
      // Extract data from Details01 if it's an array
      const productData = Array.isArray(data.Details01) ? data.Details01[0] : data;
      
      console.log('🔍 Product data to display:', productData);
      
      // Populate form fields
      document.getElementById("productID").value = productData.ProductID || "";
      document.getElementById("productTypeID").value = productData.ProductTypeID || "";
      document.getElementById("productCode").value = productData.ProductCode || "";
      document.getElementById("productName").value = productData.ProductName || "";
      document.getElementById("description").value = productData.Description || "";
      document.getElementById("minimumBalance").value = productData.MinimumBalance || "";
      document.getElementById("maximumBalance").value = productData.MaximumBalance || "";
      
      // Set audit fields
      document.getElementById("createdBy").value = productData.CreatedBy || "";
      document.getElementById("createdOn").value = formatDate(productData.CreatedOn) || "";
      document.getElementById("modifiedBy").value = productData.ModifiedBy || "";
      document.getElementById("modifiedOn").value = formatDate(productData.ModifiedOn) || "";
      
      console.log('✓ Form populated with data');
    }
    
    /**
     * Get form data
     */
    function getFormData() {
      return {
        BankID: document.getElementById("bankID").value,
        OurBranchID: document.getElementById("branchID").value,
        ProductID: document.getElementById("productID").value,
        ProductTypeID: document.getElementById("productTypeID").value,
        ProductCode: document.getElementById("productCode").value,
        ProductName: document.getElementById("productName").value,
        Description: document.getElementById("description").value,
        MinimumBalance: document.getElementById("minimumBalance").value,
        MaximumBalance: document.getElementById("maximumBalance").value,
        OperatorID: document.getElementById("operatorID").value
      };
    }
    
    /**
     * Clear form fields
     */
    function clearForm() {
      document.getElementById("productID").value = "";
      document.getElementById("productCode").value = "";
      document.getElementById("productName").value = "";
      document.getElementById("description").value = "";
      document.getElementById("minimumBalance").value = "";
      document.getElementById("maximumBalance").value = "";
      document.getElementById("createdBy").value = "";
      document.getElementById("createdOn").value = "";
      document.getElementById("modifiedBy").value = "";
      document.getElementById("modifiedOn").value = "";
    }
    
    /**
     * Format date for display
     */
    function formatDate(dateString) {
      if (!dateString) return "";
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? dateString : date.toLocaleDateString();
    }
    
      // Initialize page
      initPage();
      
    } catch (error) {
      console.error('❌ Fatal error during initialization:', error);
      alert('Error loading Product (SB/CA/CS/SH) page. Check browser console for details.');
      throw error;
    }
  })();
}

// Wait for DOM to be fully loaded before initializing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWhenReady);
} else {
  initializeWhenReady();
}
