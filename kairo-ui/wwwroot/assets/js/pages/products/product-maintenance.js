function initializeProductMaintenancePage() {
  const { ServiceLoader } = window;

  console.log('🚀 initializeProductMaintenancePage called - DOM readyState:', document.readyState);
  console.log('🚀 Product Maintenance page initializing...');

  (async function () {
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

      console.log('📚 Loading SearchService...');
      await ServiceLoader.loadSearchService();
      console.log('✓ SearchService loaded');

      const ProductSBCACSService = window.ProductSBCACSService;
      const LookupService = window.LookupService;
      const CoreApi = window.CoreApi;

      console.log('✓ All services loaded successfully');

      const DEFAULT_PRODUCT_TYPE_ID = 'SB';
      let currentProduct = null;
      let isEditMode = false;
      let comboData = null; // Store the combo data globally

      // Function to load product combo data
      async function loadProductComboData() {
        console.log('📥 Loading Product Combo Data from p_GetProductLoanCombo...');
        
        try {
          const BASE_URL = (Environment.baseUrlProducts || Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");
          const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetProductLoanCombo", {
            BankID: "00"
          });
          
          const response = await CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
          
          if (response.success && response.data) {
            comboData = response.data;
            console.log('✓ Product Combo Data loaded');
            
            // Log all available datasets
            Object.keys(comboData).forEach(key => {
              if (key.startsWith('Details') || key === 'Details') {
                const dataset = comboData[key];
                if (Array.isArray(dataset) && dataset.length > 0) {
                  console.log(`📊 ${key}: ${dataset.length} rows - First row keys:`, Object.keys(dataset[0]));
                  console.log(`   Sample data:`, dataset[0]);
                } else {
                  console.log(`📊 ${key}: ${Array.isArray(dataset) ? dataset.length : 0} rows`);
                }
              }
            });
            
            console.log('Full combo data structure:', comboData);
            return comboData;
          } else {
            console.warn('⚠ Product Combo Data returned no data');
            return null;
          }
        } catch (error) {
          console.error('❌ Error loading Product Combo Data:', error);
          return null;
        }
      }

      // Initialize page
      async function initPage() {
        console.log('🎯 Initializing page...');

        try {
          // Set default values from session storage
          const defaultBankID = sessionStorage.getItem("BankID") || "00";
          const defaultBranchID = sessionStorage.getItem("OurBranchID") || "0101";
          const defaultOperatorID = sessionStorage.getItem("OperatorID") || "CSADM";

          // Load all dropdowns - use allSettled so one failure doesn't break the page
          console.log('📥 Loading all dropdowns...');

          // First load the combo data
          await loadProductComboData();

          // Wrap each loader in try-catch to ensure isolation
          async function safeLoadProductTypes() {
            try {
              await loadProductTypes();
              return { status: 'fulfilled', value: 'ProductTypes' };
            } catch (e) {
              console.error('LoadProductTypes failed:', e);
              return { status: 'rejected', reason: e };
            }
          }

          async function safeLoadProductCategories() {
            try {
              await loadProductCategories();
              return { status: 'fulfilled', value: 'ProductCategories' };
            } catch (e) {
              console.warn('LoadProductCategories failed:', e);
              return { status: 'rejected', reason: e };
            }
          }

          async function safeLoadAccountingRules() {
            try {
              await loadAccountingRules();
              return { status: 'fulfilled', value: 'AccountingRules' };
            } catch (e) {
              console.warn('LoadAccountingRules failed:', e);
              return { status: 'rejected', reason: e };
            }
          }

          async function safeLoadAccountClassIDs() {
            try {
              await loadAccountClassIDs();
              return { status: 'fulfilled', value: 'AccountClassIDs' };
            } catch (e) {
              console.warn('LoadAccountClassIDs failed:', e);
              return { status: 'rejected', reason: e };
            }
          }

          async function safeLoadInterestTypes() {
            try {
              await loadInterestTypes();
              return { status: 'fulfilled', value: 'InterestTypes' };
            } catch (e) {
              console.warn('LoadInterestTypes failed:', e);
              return { status: 'rejected', reason: e };
            }
          }

          async function safeLoadInterestCalcRules() {
            try {
              await loadInterestCalcRules();
              return { status: 'fulfilled', value: 'InterestCalcRules' };
            } catch (e) {
              console.warn('LoadInterestCalcRules failed:', e);
              return { status: 'rejected', reason: e };
            }
          }

          async function safeLoadCustomerRestrictions() {
            try {
              await loadCustomerRestrictions();
              return { status: 'fulfilled', value: 'CustomerRestrictions' };
            } catch (e) {
              console.warn('LoadCustomerRestrictions failed:', e);
              return { status: 'rejected', reason: e };
            }
          }

          async function safeLoadAccrualFrequency() {
            try {
              await loadAccrualFrequency();
              return { status: 'fulfilled', value: 'AccrualFrequency' };
            } catch (e) {
              console.warn('LoadAccrualFrequency failed:', e);
              return { status: 'rejected', reason: e };
            }
          }

          // Execute all loaders
          const results = await Promise.all([
            safeLoadProductTypes(),
            safeLoadProductCategories(),
            safeLoadAccountingRules(),
            safeLoadAccountClassIDs(),
            safeLoadInterestTypes(),
            safeLoadInterestCalcRules(),
            safeLoadCustomerRestrictions(),
            safeLoadAccrualFrequency()
          ]);

          // Log results
          let failureCount = 0;
          results.forEach((result) => {
            if (result.status === 'fulfilled') {
              console.log(`  ✓ ${result.value} loaded successfully`);
            } else {
              console.warn(`  ⚠ ${result.value ?? 'Unknown'} failed to load`);
              failureCount++;
            }
          });

          // Fail only if ProductTypes failed to load (critical)
          const productTypesResult = results[0];
          if (productTypesResult.status === 'rejected') {
            throw new Error('Critical: ProductTypes dropdown failed to load. Check console for details.');
          }

          console.log(`✓ Dropdown initialization complete (${8 - failureCount}/8 loaded)`);

          attachButtonHandlers();
          setupSectionToggles();
          
          // Initialize form state on page load
          clearForm();

          console.log('✓ Page initialization complete');
        } catch (error) {
          console.error('❌ Error in initPage:', error);
          console.error('  Message:', error.message);
          console.error('  Stack:', error.stack);
          throw error;
        }
      }

      async function loadProductTypes() {
        const select = document.getElementById('ProductTypes');
        if (!select) {
          console.warn('⚠ ProductTypes select not found');
          return;
        }

        console.log('  📥 Loading ProductTypes from LookupService...');

        if (!LookupService) {
          console.error('  ❌ LookupService not available');
          throw new Error('LookupService not loaded');
        }

        if (typeof LookupService.getSystemCodeOptions !== 'function') {
          console.error('  ❌ LookupService.getSystemCodeOptions is not a function');
          console.error('  Available methods:', Object.keys(LookupService));
          throw new Error('getSystemCodeOptions method not found');
        }

        console.log('  ✓ LookupService ready, calling getSystemCodeOptions("ProductTypeID")');

        const options = await LookupService.getSystemCodeOptions('ProductTypeID');
        console.log('  📦 Options received from LookupService:', options, '(type:', typeof options, 'isArray:', Array.isArray(options), ')');

        if (!Array.isArray(options)) {
          console.error('  ❌ Expected array but got:', typeof options);
          throw new Error('getSystemCodeOptions did not return an array');
        }

        if (options.length === 0) {
          console.warn('  ⚠ No ProductType options returned from LookupService');
        }

        select.innerHTML = '<option value="">--Select--</option>';
        let added = 0;

        for (const opt of options) {
          const value = opt.value ?? opt.Value ?? opt.code ?? opt.Code;
          const label = opt.label ?? opt.Label ?? opt.description ?? opt.Description ?? value;

          if (!value) {
            console.warn('  ⚠ Skipping option with no value:', opt);
            continue;
          }

          const optionEl = document.createElement('option');
          optionEl.value = String(value);
          optionEl.textContent = String(label);
          select.appendChild(optionEl);
          added++;
          console.log(`    ✓ Added ProductType: "${String(value)}" = "${String(label)}"`);
        }

        console.log(`  ✓ ProductTypes dropdown populated with ${added} options`);
      }

      async function loadProductCategories() {
        const select = document.getElementById('ProductCategory');
        if (!select) return;

        try {
          const options = await LookupService.getSystemCodeOptions('ProductCategoryID');
          if (Array.isArray(options)) {
            select.innerHTML = '<option value="">--Select--</option>';
            for (const opt of options) {
              const value = opt.value ?? opt.Value ?? opt.code ?? opt.Code;
              const label = opt.label ?? opt.Label ?? opt.description ?? opt.Description ?? value;
              if (!value) continue;

              const optionEl = document.createElement('option');
              optionEl.value = String(value);
              optionEl.textContent = String(label);
              select.appendChild(optionEl);
            }
          }
        } catch (error) {
          console.warn('⚠ Could not load ProductCategories:', error.message);
        }
      }

      async function loadAccountingRules() {
        const select = document.getElementById('AccountingRule');
        if (!select) {
          console.error('⚠ AccountingRule select element not found');
          console.log('All select elements with "Account" in id:', 
            Array.from(document.querySelectorAll('select[id*="Account"]')).map(el => el.id));
          return;
        }

        try {
          console.log('Loading Accounting Rules from comboData.Details...');
          // Use first dataset from comboData.Details
          if (comboData && comboData.Details) {
            const accountingRuleData = comboData.Details;
            console.log('Accounting Rule data:', accountingRuleData);
            if (Array.isArray(accountingRuleData)) {
              select.innerHTML = '<option value="">--Select--</option>';
              for (const row of accountingRuleData) {
                const value = row.AccountingRuleID ?? row.SubCodeID ?? row.Code ?? row.Value ?? row.ProductID;
                const label = row.CodeDescription ?? row.AccountingRuleName ?? row.Description ?? row.Label ?? value;
                if (!value) continue;

                const optionEl = document.createElement('option');
                optionEl.value = String(value);
                optionEl.textContent = String(label);
                select.appendChild(optionEl);
              }
              console.log(`✓ Loaded ${accountingRuleData.length} Accounting Rule options from combo data`);
            }
          } else {
            console.warn('⚠ comboData.Details not available');
          }
        } catch (error) {
          console.warn('⚠ Could not load AccountingRules:', error.message);
        }
      }

      async function loadAccountClassIDs() {
        const select = document.getElementById('AccountClassID');
        if (!select) {
          console.warn('⚠ AccountClassID select element not found');
          return;
        }

        try {
          console.log('Loading Account Class from comboData.Details01...');
          // Use second dataset from comboData.Details01
          if (comboData && comboData.Details01) {
            const accountClassData = comboData.Details01;
            console.log('Account Class data:', accountClassData);
            if (Array.isArray(accountClassData)) {
              select.innerHTML = '<option value="">--Select--</option>';
              for (const row of accountClassData) {
                const value = row.ProductClassID ?? row.AccountClassID ?? row.SubCodeID ?? row.Code ?? row.Value ?? row.ProductID;
                const label = row.CodeDescription ?? row.AccountClassName ?? row.Description ?? row.Label ?? value;
                if (!value) continue;

                const optionEl = document.createElement('option');
                optionEl.value = String(value);
                optionEl.textContent = String(label);
                select.appendChild(optionEl);
              }
              console.log(`✓ Loaded ${accountClassData.length} Account Class options from combo data`);
            }
          } else {
            console.warn('⚠ comboData.Details01 not available');
          }
        } catch (error) {
          console.warn('⚠ Could not load AccountClassIDs:', error.message);
        }
      }

      async function loadInterestTypes() {
        const selects = document.querySelectorAll('[id$="InterestType"]');
        if (selects.length === 0) return;

        for (const select of selects) {
          try {
            const options = await LookupService.getSystemCodeOptions('InterestTypeID');
            if (Array.isArray(options)) {
              select.innerHTML = '<option>--Select--</option>';
              for (const opt of options) {
                const value = opt.value ?? opt.Value ?? opt.code ?? opt.Code;
                const label = opt.label ?? opt.Label ?? opt.description ?? opt.Description ?? value;
                if (!value) continue;

                const optionEl = document.createElement('option');
                optionEl.value = String(value);
                optionEl.textContent = String(label);
                select.appendChild(optionEl);
              }
            }
          } catch (error) {
            console.warn('⚠ Could not load InterestTypes:', error.message);
          }
        }
      }

      async function loadInterestCalcRules() {
        const selects = document.querySelectorAll('[id$="InterestCalcRule"]');
        if (selects.length === 0) return;

        for (const select of selects) {
          try {
            const options = await LookupService.getSystemCodeOptions('InterestCalculationRuleID');
            if (Array.isArray(options)) {
              select.innerHTML = '<option>--Select--</option>';
              for (const opt of options) {
                const value = opt.value ?? opt.Value ?? opt.code ?? opt.Code;
                const label = opt.label ?? opt.Label ?? opt.description ?? opt.Description ?? value;
                if (!value) continue;

                const optionEl = document.createElement('option');
                optionEl.value = String(value);
                optionEl.textContent = String(label);
                select.appendChild(optionEl);
              }
            }
          } catch (error) {
            console.warn('⚠ Could not load InterestCalcRules:', error.message);
          }
        }
      }

      async function loadCustomerRestrictions() {
        const select = document.getElementById('CustomerRestriction');
        if (!select) return;

        try {
          const options = await LookupService.getSystemCodeOptions('ClientTypeID');
          if (Array.isArray(options)) {
            select.innerHTML = '<option value="">--Select--</option>';
            for (const opt of options) {
              const value = opt.value ?? opt.Value ?? opt.code ?? opt.Code;
              const label = opt.label ?? opt.Label ?? opt.description ?? opt.Description ?? value;
              if (!value) continue;

              const optionEl = document.createElement('option');
              optionEl.value = String(value);
              optionEl.textContent = String(label);
              select.appendChild(optionEl);
            }
            console.log(`  ✓ CustomerRestriction dropdown populated with ${options.length} options from ClientTypeID`);
          }
        } catch (error) {
          console.warn('⚠ Could not load CustomerRestrictions:', error.message);
        }
      }

      async function loadAccrualFrequency() {
        // Load for both Credit and Debit Int. Accrual Frequency and Int. Appl. Frequency dropdowns
        const selects = [
          document.getElementById('CreditIntAccrualFreq'),
          document.getElementById('DebitIntAccrualFreq'),
          document.getElementById('CreditIntApplFreq'),
          document.getElementById('DebitIntApplFreq')
        ].filter(el => el !== null);

        if (selects.length === 0) return;

        try {
          const options = await LookupService.getSystemCodeOptions('AccrualFrequencyID');
          if (Array.isArray(options)) {
            selects.forEach(select => {
              select.innerHTML = '<option value="">--Select--</option>';
              for (const opt of options) {
                const value = opt.value ?? opt.Value ?? opt.code ?? opt.Code;
                const label = opt.label ?? opt.Label ?? opt.description ?? opt.Description ?? value;
                if (!value) continue;

                const optionEl = document.createElement('option');
                optionEl.value = String(value);
                optionEl.textContent = String(label);
                select.appendChild(optionEl);
              }
            });
          }
        } catch (error) {
          console.warn('⚠ Could not load AccrualFrequency:', error.message);
        }
      }

      function attachButtonHandlers() {
        const buttons = document.querySelectorAll("[data-shell-mode], [data-submit-action]");
        let viewBtn, addBtn, editBtn, deleteBtn, saveBtn, cancelBtn;

        console.log('🔎 Found', buttons.length, 'action buttons');
        buttons.forEach((btn, idx) => {
          const mode = btn.getAttribute('data-shell-mode');
          const action = btn.getAttribute('data-submit-action');
          const text = mode || action;
          console.log(`  Button ${idx}: "${text}"`);

          if (mode === 'View') viewBtn = btn;
          if (mode === 'Add') addBtn = btn;
          if (mode === 'Update') editBtn = btn;
          if (mode === 'Delete') deleteBtn = btn;
          if (action === 'save') saveBtn = btn;
          if (action === 'cancel') cancelBtn = btn;
        });

        if (viewBtn) {
          console.log('✓ View button found and attached');
          viewBtn.addEventListener("click", handleView);
          // View button is enabled on load
        }

        if (addBtn) {
          console.log('✓ Add button found and attached');
          addBtn.addEventListener("click", handleAdd);
          // Disable Add button on page load
          addBtn.disabled = true;
        }

        if (editBtn) {
          console.log('✓ Edit button found and attached');
          editBtn.addEventListener("click", handleEdit);
          // Disable Edit button on page load
          editBtn.disabled = true;
        }

        if (deleteBtn) {
          console.log('✓ Delete button found and attached');
          deleteBtn.addEventListener("click", handleDelete);
          // Disable Delete button on page load
          deleteBtn.disabled = true;
        }

        if (saveBtn) {
          console.log('✓ Save button found and attached');
          saveBtn.addEventListener("click", handleSave);
          // Disable Save button on page load
          saveBtn.disabled = true;
        }

        if (cancelBtn) {
          console.log('✓ Cancel button found and attached');
          cancelBtn.addEventListener("click", handleCancel);
          // Cancel button is enabled on load
        }

        // Product Search Button Handler
        const productSearchBtn = document.querySelector('[aria-label="Lookup Product"]');
        if (productSearchBtn) {
          productSearchBtn.addEventListener('click', openProductSearchModal);
        }

        // Currency Search Button Handler
        const currencySearchBtn = document.querySelector('[aria-label="Lookup Currency"]');
        if (currencySearchBtn) {
          currencySearchBtn.addEventListener('click', openCurrencySearchModal);
        }
      }

      function setupSectionToggles() {
        const creditCheckbox = document.getElementById('enableCreditInterest');
        const debitCheckbox = document.getElementById('enableDebitInterest');
        const swappingCheckbox = document.getElementById('enableSwapping');

        // Initialize all sections as disabled
        toggleFields(creditFieldIds, false);
        toggleFields(debitFieldIds, false);
        toggleFields(swappingFieldIds, false);

        if (creditCheckbox) {
          creditCheckbox.addEventListener('change', function() {
            toggleFields(creditFieldIds, this.checked);
          });
        }

        if (debitCheckbox) {
          debitCheckbox.addEventListener('change', function() {
            toggleFields(debitFieldIds, this.checked);
          });
        }

        if (swappingCheckbox) {
          swappingCheckbox.addEventListener('change', function() {
            toggleFields(swappingFieldIds, this.checked);
          });
        }

        console.log('✓ Section toggles initialized');
      }

      // Global field arrays for toggle functionality
      const creditFieldIds = [
        'CreditInterestType', 'CreditInterestRateID', 'CreditInterestCalcRule',
        'CreditInterestRounding', 'CreditIntApplFreq', 'CreditInterestStartMonth',
        'CreditIntAccrualFreq', 'CreditTaxRule', 'isInterestTaxableCredit', 'accrueInterestCredit'
      ];

      const debitFieldIds = [
        'DebitInterestType', 'DebitInterestRateID', 'DebitInterestCalcRule',
        'DebitInterestRounding', 'DebitIntApplFreq', 'DebitInterestStartMonth',
        'DebitIntAccrualFreq', 'DebitTaxRule', 'PenaltyRule', 'PenaltyGraceDays',
        'isInterestTaxableDebit', 'chargePenalty'
      ];

      const swappingFieldIds = [
        'SwapProductID', 'CeilingAmount', 'Multiplier', 'MinPeriod',
        'SwapOrder', 'TODRateID', 'MaxNoOfTOD', 'MaxTODLimit',
        'autoSwapping', 'allowTOD'
      ];

      function toggleFields(fieldIds, enable) {
        fieldIds.forEach(id => {
          const field = document.getElementById(id);
          if (field) {
            field.disabled = !enable;
          }
        });
      }

      function showToast(message, type = 'success') {
        // Remove any existing toast
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
          existingToast.remove();
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerHTML = `<i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
        
        // Add to body
        document.body.appendChild(toast);
        
        // Show toast with animation
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Hide and remove after 4 seconds
        setTimeout(() => {
          toast.classList.remove('show');
          setTimeout(() => toast.remove(), 300);
        }, 4000);
      }

      async function handleView() {
        console.log('🔍 View button clicked');
        const productIDRaw = document.getElementById('ProductID').value;
        const productID = productIDRaw ? productIDRaw.trim() : '';

        if (!productID) {
          alert("Please enter Product ID");
          return;
        }

        try {
          const result = await ProductSBCACSService.getProductSB({
            BankID: "00",
            OurBranchID: "0101",
            ProductID: productID,
            ProductTypeID: document.getElementById('ProductTypes').value || 'SB',
            OperatorID: "CSADM",
            Direction: 1
          });

          console.log('📦 API Response:', result);
          console.log('  Success:', result.success);
          console.log('  Data:', result.data);
          console.log('  Message:', result.message);

          // Check if product data exists - Details01 is the primary indicator
          const hasData = result.data && 
            result.data.Details01 && 
            Array.isArray(result.data.Details01) && 
            result.data.Details01.length > 0;

          console.log('  Has Data (Details01 check):', hasData);
          console.log('  Details01 length:', result.data?.Details01?.length);

          if (result.success && hasData) {
            currentProduct = result.data;
            displayProductDetails(result.data);
            enableFormFields(false);
            isEditMode = false;
            
            // Enable Edit button after successful view
            const editBtn = document.querySelector('[data-shell-mode="Update"]');
            if (editBtn) editBtn.disabled = false;
            
            console.log('✓ Product loaded successfully');
          } else {
            // Product does not exist or no details found
            console.warn('⚠ Product does not exist or has no details');
            showToast('No details found for that product', 'error');
            clearForm();
            currentProduct = null;
            document.getElementById('ProductID').value = productID; // Keep the typed ID
            document.getElementById('ProductID').disabled = false; // Keep ProductID field editable
            
            // Enable Add button so user can add the product
            enableFormFields(true);
            document.getElementById('ProductID').disabled = false;
            const addBtn = document.querySelector('[data-shell-mode="Add"]');
            if (addBtn) addBtn.disabled = false;
            const saveBtn = document.querySelector('[data-submit-action="save"]');
            if (saveBtn) saveBtn.disabled = false;
          }
        } catch (error) {
          console.error("Error loading product:", error);
          console.error("  Error message:", error.message);
          console.error("  Error stack:", error.stack);
          showToast("Error loading product details: " + error.message, 'error');
        }
      }

      function handleAdd() {
        console.log('➕ Add button clicked');
        clearForm();
        isEditMode = false;
        currentProduct = null;
        enableFormFields(true);
        document.getElementById('ProductID').disabled = false;
        document.getElementById('ProductID').readOnly = false;
        document.getElementById('ProductName').focus();
        
        // Enable Save button during Add mode
        const saveBtn = document.querySelector('[data-submit-action="save"]');
        if (saveBtn) saveBtn.disabled = false;
      }

      function handleEdit() {
        console.log('✏️ Edit button clicked');
        if (!currentProduct) {
          alert("Please view a product first");
          return;
        }
        isEditMode = true;
        enableFormFields(true);
        document.getElementById('ProductID').disabled = true;
        document.getElementById('ProductID').readOnly = true;
        
        // Enable Save button during Edit mode
        const saveBtn = document.querySelector('[data-submit-action="save"]');
        if (saveBtn) saveBtn.disabled = false;
      }

      async function handleDelete() {
        console.log('🗑️ Delete button clicked');
        if (!currentProduct) {
          alert("Please view a product first");
          return;
        }

        const productID = document.getElementById('ProductID').value;
        if (!confirm(`Are you sure you want to delete product ${productID}?`)) {
          console.log('  ℹ Delete cancelled by user');
          return;
        }

        try {
          console.log('  Deleting product:', productID);
          const result = await ProductSBCACSService.deleteProductSB({
            ProductID: productID
          });

          console.log('  📦 Delete response:', result);

          if (result.success) {
            alert("Product deleted successfully!");
            clearForm();
            currentProduct = null;
            console.log('  ✓ Product deleted');
          } else {
            alert(`Error: ${result.message}`);
          }
        } catch (error) {
          console.error("Error deleting product:", error);
          console.error("  Error message:", error.message);
          alert("Error deleting product: " + error.message);
        }
      }

      async function handleSave() {
        console.log('💾 Save button clicked');

        const productID = document.getElementById('ProductID').value;
        if (!productID) {
          alert("Product ID is required");
          return;
        }

        // Validate Valid From and Valid To
        const validFrom = document.getElementById('ValidFrom')?.value;
        const validTo = document.getElementById('ValidTo')?.value;

        if (!validFrom) {
          showToast('Please enter Valid From', 'error');
          return;
        }

        if (!validTo) {
          showToast('Please enter Valid To', 'error');
          return;
        }

        const formData = getFormData();
        console.log('  Saving in', isEditMode ? 'UPDATE' : 'CREATE', 'mode');
        console.log('  Form data:', formData);

        try {
          const result = isEditMode
            ? await ProductSBCACSService.updateProductSB(formData)
            : await ProductSBCACSService.createProductSB(formData);

          console.log('  📦 Save response:', result);

          if (result.success) {
            const message = isEditMode ? "Data saved successfully" : "Product created successfully!";
            
            // Show toast notification
            showToast(message, 'success');
            
            console.log('  ✓', message);
            
            // Reload product data to reflect saved changes
            if (productID) {
              try {
                const viewResult = await ProductSBCACSService.getProductSB({
                  BankID: "00",
                  OurBranchID: "0101",
                  ProductID: productID,
                  ProductTypeID: formData.ProductTypeID || 'SB',
                  OperatorID: "CSADM",
                  Direction: 1
                });
                if (viewResult.success && viewResult.data) {
                  currentProduct = viewResult.data;
                  displayProductDetails(viewResult.data);
                }
              } catch (err) {
                console.warn('Could not reload product after save:', err);
              }
            }
            
            isEditMode = false;
            enableFormFields(false);
          } else {
            alert(`Error: ${result.message}`);
            console.warn('  ⚠ Save failed:', result.message);
          }
        } catch (error) {
          console.error("Error saving product:", error);
          console.error("  Error message:", error.message);
          alert("Error saving product: " + error.message);
        }
      }

      function showNotification(message, type = 'success') {
        // Remove any existing notifications
        const existingNotif = document.querySelector('.toast-notification');
        if (existingNotif) {
          existingNotif.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `toast-notification toast-${type}`;
        notification.innerHTML = `
          <i class="bi bi-check-circle-fill me-2"></i>
          <span>${message}</span>
        `;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
          notification.classList.remove('show');
          setTimeout(() => notification.remove(), 300);
        }, 3000);
      }

      function handleCancel() {
        console.log('❌ Cancel button clicked');
        clearForm();
        isEditMode = false;
        currentProduct = null;
        enableFormFields(false);
        document.getElementById('ProductID').disabled = false;
        document.getElementById('ProductID').readOnly = false;
        
        // Disable buttons except View and Cancel
        const buttons = document.querySelectorAll("[data-shell-mode], [data-submit-action]");
        buttons.forEach(btn => {
          const mode = btn.getAttribute('data-shell-mode');
          const action = btn.getAttribute('data-submit-action');
          
          if (mode === 'Add' || mode === 'Update' || mode === 'Delete' || action === 'save') {
            btn.disabled = true;
          } else if (mode === 'View' || action === 'cancel') {
            btn.disabled = false;
          }
        });
      }

      function displayProductDetails(data) {
        if (!data) {
          console.error('❌ displayProductDetails called with null/undefined data');
          return;
        }

        console.log('📋 Displaying product details, data structure:', Array.isArray(data) ? 'Array' : Object.keys(data));

        const productData = Array.isArray(data) && data.length > 0
          ? data[0]
          : Array.isArray(data.Details01) && data.Details01.length > 0
          ? data.Details01[0]
          : Array.isArray(data.Details) && data.Details.length > 0
          ? data.Details[0]
          : data;

        console.log('📋 Using data structure:', Object.keys(productData));

        const productIDEl = document.getElementById('ProductID');
        const productTypesEl = document.getElementById('ProductTypes');
        const productCategoryEl = document.getElementById('ProductCategory');
        const currencyEl = document.getElementById('Currency');
        const productCodeEl = document.getElementById('ProductCode');

        if (productIDEl) productIDEl.value = productData.ProductID || productData.productID || "";
        if (productTypesEl) productTypesEl.value = productData.ProductTypeID || productData.productTypeID || "";
        if (productCategoryEl) productCategoryEl.value = productData.ProductCategoryID || productData.productCategoryID || "";
        if (currencyEl) currencyEl.value = productData.CurrencyID || productData.currencyID || "";
        if (productCodeEl) productCodeEl.value = productData.ProductCode || productData.productCode || "";

        // Dates
        const validFromEl = document.getElementById('ValidFrom');
        const validToEl = document.getElementById('ValidTo');

        // Convert dates to YYYY-MM-DD format for date inputs
        function formatDateForInput(dateStr) {
          if (!dateStr) return '';
          try {
            // Handle ISO format: 2025-03-02T00:00:00
            if (dateStr.includes('T')) {
              return dateStr.split('T')[0];
            }
            // Handle SQL format: 2025-03-02 00:00:00
            if (dateStr.includes(' ')) {
              return dateStr.split(' ')[0];
            }
            // If already in YYYY-MM-DD format
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              return dateStr;
            }
            return '';
          } catch (e) {
            console.error('Error formatting date:', dateStr, e);
            return '';
          }
        }

        if (validFromEl) {
          const validFromDate = productData.ValidFrom || productData.validFrom;
          console.log('🔍 ValidFrom raw value:', validFromDate);
          const formattedValidFrom = formatDateForInput(validFromDate);
          console.log('🔍 ValidFrom formatted:', formattedValidFrom);
          validFromEl.value = formattedValidFrom;
          console.log('🔍 ValidFrom input value after set:', validFromEl.value);
        }
        if (validToEl) {
          const validToDate = productData.ValidTo || productData.validTo;
          console.log('🔍 ValidTo raw value:', validToDate);
          const formattedValidTo = formatDateForInput(validToDate);
          console.log('🔍 ValidTo formatted:', formattedValidTo);
          validToEl.value = formattedValidTo;
          console.log('🔍 ValidTo input value after set:', validToEl.value);
        }

        // General Settings
        const custRestrictionEl = document.getElementById('CustomerRestriction');
        const acctRuleEl = document.getElementById('AccountingRule');
        const acctClassEl = document.getElementById('AccountClassID');
        const isCardAllowedEl = document.getElementById('isCardAllowed');

        if (custRestrictionEl) {
          const custRestrValue = productData.CustomerRestriction || productData.customerRestriction || productData.ClientTypeID || "";
          custRestrictionEl.value = custRestrValue;
          console.log('🔍 CustomerRestriction set to:', custRestrValue, 'Found in dropdown:', custRestrictionEl.value === custRestrValue);
        }
        if (acctRuleEl) {
          const acctRuleValue = productData.AccountingRuleID || "";
          console.log('🔍 AccountingRule - Attempting to set value:', acctRuleValue);
          console.log('🔍 AccountingRule - Available options:', Array.from(acctRuleEl.options).map(o => ({value: o.value, text: o.textContent})));
          
          if (acctRuleValue) {
            // Find the description from comboData
            let description = acctRuleValue; // Default to value if description not found
            if (comboData && comboData.Details) {
              const matchingRow = comboData.Details.find(row => 
                row.AccountingRuleID === acctRuleValue || 
                row.SubCodeID === acctRuleValue || 
                row.Code === acctRuleValue
              );
              if (matchingRow) {
                description = matchingRow.CodeDescription || matchingRow.AccountingRuleName || matchingRow.Description || matchingRow.Label || acctRuleValue;
                console.log('✓ Found description for', acctRuleValue, ':', description);
              }
            }
            
            // Check if option exists
            let existingOption = Array.from(acctRuleEl.options).find(opt => opt.value === acctRuleValue);
            
            if (existingOption) {
              // Option exists - force update its text to show description
              console.log('✓ Updating existing option text from', existingOption.textContent, 'to', description);
              existingOption.textContent = description;
            } else {
              // Option doesn't exist - create it with description
              console.warn('⚠️ AccountingRule option not found in dropdown, creating it:', acctRuleValue);
              const newOption = document.createElement('option');
              newOption.value = acctRuleValue;
              newOption.textContent = description;
              acctRuleEl.appendChild(newOption);
            }
            
            acctRuleEl.value = acctRuleValue;
            console.log('🔍 AccountingRule - Value after set:', acctRuleEl.value, 'Display text:', acctRuleEl.selectedOptions[0]?.textContent);
          }
        }
        if (acctClassEl) {
          const acctClassValue = productData.AccountClassID || productData.accountClassID || productData.ProductClassID || productData.AccountClass || "";
          acctClassEl.value = acctClassValue;
          console.log('🔍 AccountClassID set to:', acctClassValue, 'Found in dropdown:', acctClassEl.value === acctClassValue);
        }
        if (isCardAllowedEl) isCardAllowedEl.checked = Boolean(productData.IsCardAllowed || productData.isCardAllowed);

        // Credit Interest Procedure
        const credIntTypeEl = document.getElementById('CreditInterestType');
        const credIntRateIdEl = document.getElementById('CreditInterestRateID');
        const credIntCalcRuleEl = document.getElementById('CreditInterestCalcRule');
        const credIntRoundingEl = document.getElementById('CreditInterestRounding');
        const credIntApplFreqEl = document.getElementById('CreditIntApplFreq');
        const credIntStartMonthEl = document.getElementById('CreditInterestStartMonth');
        const credIntAccrualFreqEl = document.getElementById('CreditIntAccrualFreq');
        const credTaxRuleEl = document.getElementById('CreditTaxRule');
        const isIntTaxableCreditEl = document.getElementById('isInterestTaxableCredit');
        const accrueIntCreditEl = document.getElementById('accrueInterestCredit');

        if (credIntTypeEl) credIntTypeEl.value = productData.CreditInterestType || productData.creditInterestType || "";
        if (credIntRateIdEl) credIntRateIdEl.value = productData.CreditInterestRateID || productData.creditInterestRateID || "";
        if (credIntCalcRuleEl) credIntCalcRuleEl.value = productData.CreditInterestCalcRule || productData.creditInterestCalcRule || "";
        if (credIntRoundingEl) credIntRoundingEl.value = productData.CreditInterestRounding || productData.creditInterestRounding || "Nearest 0.01";
        if (credIntApplFreqEl) credIntApplFreqEl.value = productData.CreditIntApplFreq || productData.creditIntApplFreq || "";
        if (credIntStartMonthEl) credIntStartMonthEl.value = productData.CreditInterestStartMonth || productData.creditInterestStartMonth || "";
        if (credIntAccrualFreqEl) credIntAccrualFreqEl.value = productData.CreditIntAccrualFreq || productData.creditIntAccrualFreq || "";
        if (credTaxRuleEl) credTaxRuleEl.value = productData.CreditTaxRule || productData.creditTaxRule || "";
        if (isIntTaxableCreditEl) isIntTaxableCreditEl.checked = Boolean(productData.IsInterestTaxableCredit || productData.isInterestTaxableCredit);
        if (accrueIntCreditEl) accrueIntCreditEl.checked = Boolean(productData.AccrueInterestCredit || productData.accrueInterestCredit);

        // Debit Interest Procedure
        const debIntTypeEl = document.getElementById('DebitInterestType');
        const debIntRateIdEl = document.getElementById('DebitInterestRateID');
        const debIntCalcRuleEl = document.getElementById('DebitInterestCalcRule');
        const debIntRoundingEl = document.getElementById('DebitInterestRounding');
        const debIntApplFreqEl = document.getElementById('DebitIntApplFreq');
        const debIntStartMonthEl = document.getElementById('DebitInterestStartMonth');
        const debIntAccrualFreqEl = document.getElementById('DebitIntAccrualFreq');
        const debTaxRuleEl = document.getElementById('DebitTaxRule');
        const penaltyRuleEl = document.getElementById('PenaltyRule');
        const penaltyGraceDaysEl = document.getElementById('PenaltyGraceDays');
        const isIntTaxableDebitEl = document.getElementById('isInterestTaxableDebit');
        const chargePenaltyEl = document.getElementById('chargePenalty');

        if (debIntTypeEl) debIntTypeEl.value = productData.DebitInterestType || productData.debitInterestType || "";
        if (debIntRateIdEl) debIntRateIdEl.value = productData.DebitInterestRateID || productData.debitInterestRateID || "";
        if (debIntCalcRuleEl) debIntCalcRuleEl.value = productData.DebitInterestCalcRule || productData.debitInterestCalcRule || "";
        if (debIntRoundingEl) debIntRoundingEl.value = productData.DebitInterestRounding || productData.debitInterestRounding || "Nearest 0.01";
        if (debIntApplFreqEl) debIntApplFreqEl.value = productData.DebitIntApplFreq || productData.debitIntApplFreq || "";
        if (debIntStartMonthEl) debIntStartMonthEl.value = productData.DebitInterestStartMonth || productData.debitInterestStartMonth || "";
        if (debIntAccrualFreqEl) debIntAccrualFreqEl.value = productData.DebitIntAccrualFreq || productData.debitIntAccrualFreq || "";
        if (debTaxRuleEl) debTaxRuleEl.value = productData.DebitTaxRule || productData.debitTaxRule || "";
        if (penaltyRuleEl) penaltyRuleEl.value = productData.PenaltyRule || productData.penaltyRule || "";
        if (penaltyGraceDaysEl) penaltyGraceDaysEl.value = productData.PenaltyGraceDays || productData.penaltyGraceDays || "";
        if (isIntTaxableDebitEl) isIntTaxableDebitEl.checked = Boolean(productData.IsInterestTaxable || productData.isInterestTaxable); // Note: field name might vary, checking fuzzy
        if (chargePenaltyEl) chargePenaltyEl.checked = Boolean(productData.ChargePenalty || productData.chargePenalty);

        // Allow Swapping
        const swapProductIdEl = document.getElementById('SwapProductID');
        const ceilingAmountEl = document.getElementById('CeilingAmount');
        const multiplierEl = document.getElementById('Multiplier');
        const minPeriodEl = document.getElementById('MinPeriod');
        const swapOrderEl = document.getElementById('SwapOrder');
        const todRateIdEl = document.getElementById('TODRateID');
        const maxNoOfTodEl = document.getElementById('MaxNoOfTOD');
        const maxTodLimitEl = document.getElementById('MaxTODLimit');
        const autoSwappingEl = document.getElementById('autoSwapping');
        const allowTodEl = document.getElementById('allowTOD');

        if (swapProductIdEl) swapProductIdEl.value = productData.SwapProductID || productData.swapProductID || "";
        if (ceilingAmountEl) ceilingAmountEl.value = productData.CeilingAmount || productData.ceilingAmount || "";
        if (multiplierEl) multiplierEl.value = productData.Multiplier || productData.multiplier || "";
        if (minPeriodEl) minPeriodEl.value = productData.MinPeriod || productData.minPeriod || "";
        if (swapOrderEl) swapOrderEl.value = productData.SwapOrder || productData.swapOrder || "First In First Out";
        if (todRateIdEl) todRateIdEl.value = productData.TODRateID || productData.todRateID || "";
        if (maxNoOfTodEl) maxNoOfTodEl.value = productData.MaxNoOfTOD || productData.maxNoOfTOD || "";
        if (maxTodLimitEl) maxTodLimitEl.value = productData.MaxTODLimit || productData.maxTODLimit || "";
        if (autoSwappingEl) autoSwappingEl.checked = Boolean(productData.AutoSwapping || productData.autoSwapping);
        if (allowTodEl) allowTodEl.checked = Boolean(productData.AllowTOD || productData.allowTOD);

        console.log('✓ Product details displayed successfully');
      }

      function getFormData() {
        const defaultBankID = sessionStorage.getItem("BankID") || "00";
        const defaultBranchID = sessionStorage.getItem("OurBranchID") || "0101";
        const defaultOperatorID = sessionStorage.getItem("OperatorID") || "CSADM";

        // Function to convert date from DD/MMM/YYYY to YYYY-MM-DD HH:MM:SS
        function convertDateToSQL(dateStr) {
          if (!dateStr) return null;
          
          try {
            let day, month, year;
            
            // Check if it's YYYY-MM-DD format (HTML date input)
            if (dateStr.includes('-')) {
              const parts = dateStr.split('-');
              if (parts.length === 3) {
                year = parts[0];
                month = parts[1].padStart(2, '0');
                day = parts[2].padStart(2, '0');
              } else {
                return null;
              }
            }
            // Check if it's DD/MMM/YYYY format
            else if (dateStr.includes('/')) {
              const parts = dateStr.split('/');
              if (parts.length !== 3) return null;
              
              day = parts[0].padStart(2, '0');
              const monthMap = {
                'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
              };
              month = monthMap[parts[1]];
              year = parts[2];
              
              if (!month) return null;
            } else {
              return null;
            }
            
            return `${year}-${month}-${day} 00:00:00`;
          } catch (e) {
            console.error('Error converting date:', dateStr, e);
            return null;
          }
        }

        // Helper function to convert '--select--' to null
        const getNullIfEmpty = (value) => {
          if (!value || value === '--select--' || value.trim() === '') {
            return null;
          }
          return value;
        };

        return {
          // System fields
          BankID: defaultBankID,
          OurBranchID: defaultBranchID,
          OperatorID: defaultOperatorID,
          
          // Product identification
          ProductID: getNullIfEmpty(document.getElementById('ProductID')?.value) || '',
          Description: getNullIfEmpty(document.getElementById('ProductName')?.value) || '',
          ProductTypeID: getNullIfEmpty(document.getElementById('ProductTypes')?.value),
          ProductCategoryID: getNullIfEmpty(document.getElementById('ProductCategory')?.value),
          ProductClassID: getNullIfEmpty(document.getElementById('AccountClassID')?.value),
          CurrencyID: getNullIfEmpty(document.getElementById('Currency')?.value),
          ValidFrom: convertDateToSQL(document.getElementById('ValidFrom')?.value) || '0001-01-01 00:00:00',
          ValidTo: convertDateToSQL(document.getElementById('ValidTo')?.value) || '9999-12-31 00:00:00',
          
          // General Settings
          ProductCode: getNullIfEmpty(document.getElementById('ProductCode')?.value),
          AccountingRule: getNullIfEmpty(document.getElementById('AccountingRule')?.value),
          IsCardAllowed: document.getElementById('isCardAllowed')?.checked ? 1 : 0,
          
          // TOD Settings
          AllowTOD: document.getElementById('allowTOD')?.checked ? 1 : 0,
          MaxTODNo: getNullIfEmpty(document.getElementById('MaxNoOfTOD')?.value),
          MaxTODLimit: getNullIfEmpty(document.getElementById('MaxTODLimit')?.value),
          TODRateID: getNullIfEmpty(document.getElementById('TODRateID')?.value),
          
          // Credit Interest Procedure
          CrIntTypeID: getNullIfEmpty(document.getElementById('CreditInterestType')?.value),
          CrIntRateID: getNullIfEmpty(document.getElementById('CreditInterestRateID')?.value),
          CrIntCalcRuleID: getNullIfEmpty(document.getElementById('CreditInterestCalcRule')?.value),
          CrRoundingID: getNullIfEmpty(document.getElementById('CreditInterestRounding')?.value),
          CrIntApplFrequencyID: getNullIfEmpty(document.getElementById('CreditIntApplFreq')?.value),
          CrIntStartMonth: getNullIfEmpty(document.getElementById('CreditInterestStartMonth')?.value),
          IsCrIntTaxable: document.getElementById('isInterestTaxableCredit')?.checked ? 1 : 0,
          CrIntTaxID: getNullIfEmpty(document.getElementById('CreditTaxRule')?.value),
          IsCrIntAcrl: document.getElementById('accrueInterestCredit')?.checked ? 1 : 0,
          CrIntAcrlFrequencyID: getNullIfEmpty(document.getElementById('CreditIntAccrualFreq')?.value),
          
          // Debit Interest Procedure
          DbIntTypeID: getNullIfEmpty(document.getElementById('DebitInterestType')?.value),
          DbIntRateID: getNullIfEmpty(document.getElementById('DebitInterestRateID')?.value),
          DbIntCalcRuleID: getNullIfEmpty(document.getElementById('DebitInterestCalcRule')?.value),
          DbRoundingID: getNullIfEmpty(document.getElementById('DebitInterestRounding')?.value),
          DbIntApplFrequencyID: getNullIfEmpty(document.getElementById('DebitIntApplFreq')?.value),
          DbIntStartMonth: getNullIfEmpty(document.getElementById('DebitInterestStartMonth')?.value),
          IsDbIntTaxable: document.getElementById('isInterestTaxableDebit')?.checked ? 1 : 0,
          DbIntTaxID: getNullIfEmpty(document.getElementById('DebitTaxRule')?.value),
          IsDbIntAcrl: 0, // Not in form - default to 0
          DbIntAcrlFrequencyID: getNullIfEmpty(document.getElementById('DebitIntAccrualFreq')?.value),
          
          // Penalty
          IsChargePenalty: document.getElementById('chargePenalty')?.checked ? 1 : 0,
          PenaltyRuleID: getNullIfEmpty(document.getElementById('PenaltyRule')?.value),
          PenaltyGraceDays: getNullIfEmpty(document.getElementById('PenaltyGraceDays')?.value),
          
          // Allow Swapping
          IsAllowSwapping: null, // Not in form
          SwapProductID: getNullIfEmpty(document.getElementById('SwapProductID')?.value),
          SwapCeilingAmount: parseFloat(document.getElementById('CeilingAmount')?.value || 0),
          Multiplier: parseFloat(document.getElementById('Multiplier')?.value || 0),
          MinPeriod: parseInt(document.getElementById('MinPeriod')?.value || 0),
          SwapDepCloseOrderID: getNullIfEmpty(document.getElementById('SwapOrder')?.value),
          IsAutoSwap: document.getElementById('autoSwapping')?.checked ? 1 : 0,
          
          // Audit fields
          CreatedBy: defaultOperatorID,
          CreatedOn: null,
          ModifiedBy: null,
          ModifiedOn: null,
          SupervisedBy: null,
          UpdateCount: 1,
          DetailRecord: null,
          ReportingTo: null
        };
      }

      function enableFormFields(enable) {
        const formFields = document.querySelectorAll('.form-content input, .form-content select');
        formFields.forEach(field => {
          if (field.type === 'checkbox') {
            field.disabled = !enable;
          } else if (field.type === 'date') {
            // For date inputs, only use readOnly to preserve value display
            field.readOnly = !enable;
          } else {
            field.readOnly = !enable;
            field.disabled = !enable;
          }
        });
      }

      function clearForm() {
        // Clear all input fields
        document.querySelectorAll('.form-content input[type="text"]').forEach(field => {
          if (field.id === 'ValidFrom') {
            field.value = '01/Jan/0001';
          } else if (field.id === 'ValidTo') {
            field.value = '31/Dec/9999';
          } else {
            // Don't clear ProductID field
            if (field.id !== 'ProductID') {
              field.value = '';
            }
          }
        });
        
        // Clear all select fields (except ProductTypes if needed)
        document.querySelectorAll('.form-content select').forEach(field => {
          field.selectedIndex = 0;
        });
        
        // Clear all checkboxes
        document.querySelectorAll('.form-content input[type="checkbox"]').forEach(field => {
          field.checked = false;
        });
        
        enableFormFields(false);
        // Keep ProductID field editable
        document.getElementById('ProductID').disabled = false;
        document.getElementById('ProductID').readOnly = false;
        
        // Disable interest and swapping fields when form is cleared
        toggleFields(creditFieldIds, false);
        toggleFields(debitFieldIds, false);
        toggleFields(swappingFieldIds, false);
      }

      function openProductSearchModal() {
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
        iframe.src = '../common/product-search.html';
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

        header.querySelector('.close-btn').addEventListener('click', () => overlay.remove());

        modal.appendChild(header);
        modal.appendChild(iframe);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) overlay.remove();
        });

        // Listen for product selection from iframe
        window.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'PRODUCT_SELECTED') {
            const { productId, productTypeId } = event.data;
            document.getElementById('ProductID').value = productId ? String(productId).trim() : '';

            // Try to set product type if provided
            if (productTypeId) {
              const trimmedType = String(productTypeId).trim();
              const typeSelect = document.getElementById('ProductTypes');
              if (typeSelect) {
                typeSelect.value = trimmedType;
                // If simple assignment didn't work (e.g. casing diff), try finding matching option
                if (!typeSelect.value) {
                  for (let i = 0; i < typeSelect.options.length; i++) {
                    if (typeSelect.options[i].value.toLowerCase() === trimmedType.toLowerCase()) {
                      typeSelect.selectedIndex = i;
                      break;
                    }
                  }
                }
              }
            }
            overlay.remove();
          } else if (event.data && event.data.type === 'CLOSE_SEARCH') {
            overlay.remove();
          }
        });
      }

      function openCurrencySearchModal() {
        const overlay = document.createElement('div');
        overlay.className = 'currency-search-modal-overlay';
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
        iframe.src = '../common/currency-search.html';
        iframe.style.cssText = 'flex: 1; width: 100%; border: none;';

        const header = document.createElement('div');
        header.style.cssText = `
          padding: 10px 20px; border-bottom: 1px solid #eee; 
          display: flex; justify-content: space-between; align-items: center;
          background: #f8fafc;
        `;
        header.innerHTML = `
          <span style="font-weight:600">Currency Search</span>
          <button class="close-btn" style="border:none;background:none;font-size:18px;cursor:pointer">&times;</button>
        `;

        header.querySelector('.close-btn').addEventListener('click', () => overlay.remove());

        modal.appendChild(header);
        modal.appendChild(iframe);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) overlay.remove();
        });

        // Listen for currency selection from iframe
        window.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'CURRENCY_SELECTED') {
            const { currencyCode } = event.data;
            document.getElementById('Currency').value = currencyCode ? String(currencyCode).trim() : '';
            overlay.remove();
          } else if (event.data && event.data.type === 'CLOSE_SEARCH') {
            overlay.remove();
          }
        });
      }

      // Initialize page
      await initPage();

    } catch (error) {
      console.error('❌ Fatal error during initialization:', error);
      alert('Error loading Product Maintenance page. Check browser console for details.');
      throw error;
    }
  })();
}

// Wait for DOM to be fully loaded before initializing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeProductMaintenancePage);
} else {
  initializeProductMaintenancePage();
}
