function initializeBillContractPage() {
  const { ServiceLoader } = window;
  
  console.log('🚀 initializeBillContractPage called - DOM readyState:', document.readyState);
  console.log('🚀 Product Bill Contract page initializing...');
  
  (async function() {
    try {
      // Load dependencies
      console.log('📚 Loading core services...');
      await ServiceLoader.loadCore();
      console.log('✓ Core loaded');
      
      console.log('📚 Loading ProductBillContractService...');
      await ServiceLoader.loadProductBillContractService();
      console.log('✓ ProductBillContractService loaded');
      
      console.log('📚 Loading LookupService...');
      await ServiceLoader.loadLookupService();
      console.log('✓ LookupService loaded');
      
      console.log('📚 Loading SearchService...');
      await ServiceLoader.loadSearchService();
      console.log('✓ SearchService loaded');
      
      const ProductBillContractService = window.ProductBillContractService;
      const LookupService = window.LookupService;
      const SearchService = window.SearchService;
      const CoreApi = window.CoreApi;
      
      console.log('✓ All services loaded successfully');
      console.log('ProductBillContractService:', ProductBillContractService);
      
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
            window.comboData = comboData; // Make it available globally
            console.log('✓ Product Combo Data loaded');
            
            // Log all available datasets
            Object.keys(comboData).forEach(key => {
              if (key.startsWith('Details') || key === 'Details') {
                const dataset = comboData[key];
                if (Array.isArray(dataset) && dataset.length > 0) {
                  console.log(`📊 ${key}: ${dataset.length} rows - First row keys:`, Object.keys(dataset[0]));
                } else {
                  console.log(`📊 ${key}: ${Array.isArray(dataset) ? dataset.length : 0} rows`);
                }
              }
            });
            
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
        
        // First load the combo data
        await loadProductComboData();
        
        attachEventListeners();
        loadProductTypes();
        loadAccountingRules();
        loadAccountClassIDs();
        loadCustomerRestrictions();
        console.log('✓ Page initialization complete');
      }
      
      /**
       * Show toast notification
       */
      function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: ${type === 'success' ? '#10b981' : '#ef4444'};
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          z-index: 10000;
          font-size: 14px;
          font-weight: 500;
          animation: slideInRight 0.3s ease-out;
          max-width: 400px;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
          toast.style.animation = 'slideOutRight 0.3s ease-in';
          setTimeout(() => toast.remove(), 300);
        }, 3000);
      }
      
      /**
       * Attach event listeners to buttons and controls
       */
      function attachEventListeners() {
        console.log('🔧 Attaching event listeners...');
        
        // Find all action buttons
        const actionButtons = document.querySelectorAll('.btn-action');
        let viewBtn, addBtn, editBtn, deleteBtn, saveBtn, cancelBtn;
        
        console.log('🔎 Found', actionButtons.length, 'buttons with btn-action class');
        actionButtons.forEach((btn, idx) => {
          const text = btn.textContent.trim();
          console.log(`  Button ${idx}: "${text}"`);
          if (text === 'View') viewBtn = btn;
          if (text === 'Add') addBtn = btn;
          if (text === 'Edit') editBtn = btn;
          if (text === 'Delete') deleteBtn = btn;
          if (text === 'Save') saveBtn = btn;
          if (text === 'Cancel') cancelBtn = btn;
        });
        
        if (viewBtn) {
          console.log('✓ View button found and attached');
          viewBtn.addEventListener("click", handleViewBillProduct);
        } else {
          console.warn('⚠ View button not found');
        }
        
        if (addBtn) {
          console.log('✓ Add button found and attached');
          addBtn.addEventListener("click", handleAddBillContract);
        }
        
        if (editBtn) {
          console.log('✓ Edit button found');
          // Edit handler when needed
        }
        
        if (saveBtn) {
          console.log('✓ Save button found and attached');
          saveBtn.addEventListener("click", handleSaveBillContract);
        } else {
          console.warn('⚠ Save button not found');
        }
        
        if (deleteBtn) {
          console.log('✓ Delete button found and attached');
          deleteBtn.addEventListener("click", handleDeleteBillContract);
        } else {
          console.warn('⚠ Delete button not found');
        }
        
        // Note: Product search button and F2 handler are now managed by product-bill-contract.js
        console.log('[ProductBillContract] Product search functionality wired via modal');
      }
      
      /**
       * Load product types into the dropdown
       */
      async function loadProductTypes() {
        try {
          console.log('📥 Loading ProductTypes...');
          
          const options = await LookupService.getSystemCodeOptions("ProductTypeID");
          
          console.log('Product type options:', options);
          
          const select = document.getElementById("ProductTypes");
          if (select && options && options.length > 0) {
            select.innerHTML = '<option value="">--Select--</option>';
            options.forEach(opt => {
              select.innerHTML += `<option value="${opt.value}">${opt.label}</option>`;
            });
            console.log('✓ Product types loaded');
          } else {
            console.warn('No product types found or select element missing');
          }
        } catch (error) {
          console.error("Error loading product types:", error);
        }
      }
      
      /**
       * Load Accounting Rules into the dropdown
       */
      async function loadAccountingRules() {
        const select = document.getElementById('AccountingRule');
        if (!select) return;

        try {
          console.log('📥 Loading Accounting Rules...');
          
          if (comboData && comboData.Details) {
            const accountingRules = comboData.Details;
            console.log('Accounting Rules data:', accountingRules);
            if (Array.isArray(accountingRules)) {
              select.innerHTML = '<option value="">--Select--</option>';
              for (const row of accountingRules) {
                const value = row.AccountingRuleID ?? row.SubCodeID ?? row.Code ?? row.Value;
                const label = row.CodeDescription ?? row.AccountingRuleName ?? row.Description ?? row.Label ?? value;
                if (!value) continue;

                const optionEl = document.createElement('option');
                optionEl.value = String(value);
                optionEl.textContent = String(label);
                select.appendChild(optionEl);
              }
              console.log(`✓ Loaded ${accountingRules.length} Accounting Rule options`);
            }
          } else {
            console.warn('⚠ comboData.Details not available');
          }
        } catch (error) {
          console.warn('⚠ Could not load Accounting Rules:', error.message);
        }
      }

      /**
       * Load Account Class IDs into the dropdown
       */
      async function loadAccountClassIDs() {
        const select = document.getElementById('AccountClassID');
        if (!select) return;

        try {
          console.log('📥 Loading Account Class IDs...');
          
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
              console.log(`✓ Loaded ${accountClassData.length} Account Class options`);
            }
          } else {
            console.warn('⚠ comboData.Details01 not available');
          }
        } catch (error) {
          console.warn('⚠ Could not load Account Class IDs:', error.message);
        }
      }

      /**
       * Load Customer Restrictions into the dropdown
       */
      async function loadCustomerRestrictions() {
        const select = document.getElementById('CustomerRestriction');
        if (!select) return;

        try {
          console.log('📥 Loading Customer Restrictions...');
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
            console.log(`✓ Customer Restriction dropdown populated with ${options.length} options`);
          }
        } catch (error) {
          console.warn('⚠ Could not load Customer Restrictions:', error.message);
        }
      }
      
      /**
       * Handle View button click - retrieve bill product details
       */
      async function handleViewBillProduct() {
        console.log('🔍 View button clicked');
        
        const productIDInput = document.getElementById("ProductID");
        if (!productIDInput) {
          console.error('❌ ProductID input not found');
          alert("Form not fully loaded. Please refresh the page.");
          return;
        }
        
        const productID = productIDInput.value?.trim();
        
        if (!productID) {
          alert("Please enter a Product ID");
          return;
        }
        
        try {
          console.log('📤 Fetching Bill Product with ProductID:', productID);
          console.log('🔍 ProductID type:', typeof productID, 'length:', productID.length, 'value:', `"${productID}"`);
          
          const CoreApi = window.CoreApi;
          const Environment = window.Environment || {};
          
          if (!CoreApi) {
            console.error('❌ CoreApi not available');
            alert("CoreApi not loaded. Please refresh the page.");
            return;
          }
          
          // Build request using correct format
          const now = new Date();
          const timestamp = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
          
          const requestData = {
            RequestID: 'dbo.p_GetBillProduct',
            FormId: 'dbo.p_GetBillProduct',
            RequestData: {
              BankID: getBankID(),
              OurBranchID: getBranchID(),
              ProductID: productID,
              OperatorID: getOperatorID(),
              Direction: 1
            },
            RequestTime: timestamp,
            AppName: 'PROJECT_KAIRO',
            Checksum: ''
          };
          
          console.log('📋 Request payload:', requestData);
          console.log('🔍 ProductID in RequestData:', requestData.RequestData.ProductID);
          
          const BASE_URL = (Environment.baseUrlCommon || "http://172.16.2.31:3306").replace(/\/+$/, "");
          const apiUrl = `${BASE_URL}/api/OldAPI`;
          
          console.log('📡 API URL:', apiUrl);
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const result = await response.json();
          console.log('📥 API Response:', result);
          console.log('🔍 Returned ProductID:', result.Details01?.[0]?.ProductID);
          console.log('🔍 Requested ProductID was:', productID);
          
          if (result && result.Details01) {
            console.log('✓ Bill Product data retrieved successfully');
            displayBillContractDetails(result);
          } else {
            alert("No data found for this Product ID");
            console.warn('⚠ No data in response:', result);
          }
        } catch (error) {
          console.error("❌ Error retrieving bill product:", error);
          console.error("Error stack:", error.stack);
          alert("An error occurred while retrieving bill product details: " + error.message);
        }
      }
      
      /**
       * Handle Add button click - clear form for new entry
       */
      function handleAddBillContract() {
        console.log('➕ Add Bill Contract clicked - clearing form');
        clearForm();
        // Focus on ProductID field for user to start entering data
        const productField = document.getElementById('ProductID');
        if (productField) {
          productField.focus();
        }
      }
      
      /**
       * Handle Save button click - create or update bill contract
       */
      async function handleSaveBillContract() {
        console.log('💾 Save Bill Contract clicked');
        
        try {
          // Validate required fields
          const productID = document.getElementById("ProductID")?.value?.trim();
          const productTypeID = document.getElementById("ProductTypes")?.value?.trim();
          
          if (!productID) {
            alert("Please enter Product ID");
            return;
          }
          
          if (!productTypeID) {
            alert("Please select Product Type");
            return;
          }
          
          const CoreApi = window.CoreApi;
          const Environment = window.Environment || {};
          
          if (!CoreApi) {
            console.error('❌ CoreApi not available');
            alert("CoreApi not loaded. Please refresh the page.");
            return;
          }
          
          // Build request timestamp
          const now = new Date();
          const timestamp = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
          
          // Helper function to get field value
          const getFieldValue = (id) => {
            const el = document.getElementById(id);
            return el ? el.value?.trim() : '';
          };
          
          // Helper function to get checkbox value
          const getCheckboxValue = (id) => {
            const el = document.getElementById(id);
            return el ? (el.checked ? 1 : 0) : 0;
          };
          
          // Build request data matching the JSON structure
          const requestData = {
            RequestID: 'dbo.p_AddEditBillDiscountingProduct',
            FormId: 'dbo.p_AddEditBillDiscountingProduct',
            RequestData: {
              BankID: getBankID(),
              ProductID: productID,
              Description: getFieldValue('ProductCode') || productID,
              ProductTypeID: productTypeID,
              ProductCategoryID: getFieldValue('ProductCategory'),
              ProductClassID: getFieldValue('AccountClassID'),
              CurrencyID: getFieldValue('Currency'),
              ValidFrom: getFieldValue('ValidFrom'),
              ValidTo: getFieldValue('ValidTo'),
              ProductCode: getFieldValue('ProductCode'),
              AccountingRuleID: getFieldValue('AccountingRule'),
              DbIntTypeID: getFieldValue('InterestType'),
              DbIntRateID: getFieldValue('InterestRateID'),
              DbIntCalcRuleID: getFieldValue('InterestCalculationRule'),
              DbRoundingID: getFieldValue('InterestRounding'),
              DbIntApplFrequencyID: getFieldValue('IntApplFrequency'),
              DbIntStartMonth: getFieldValue('InterestStartMonth'),
              IsDbIntTaxable: getCheckboxValue('IsInterestTaxable'),
              DbIntTaxID: getFieldValue('TaxRule'),
              IsDbIntAcrl: getCheckboxValue('AccrueInterest'),
              DbIntAcrlFrequencyID: getFieldValue('IntAccrualFrequency'),
              CreatedBy: getOperatorID(),
              CreatedOn: timestamp,
              ModifiedBy: getOperatorID(),
              ModifiedOn: timestamp,
              SupervisedBy: getOperatorID(),
              UpdateCount: 0,
              CustomerRestriction: getFieldValue('CustomerRestriction') || ''
            },
            RequestTime: timestamp,
            AppName: 'PROJECT_KAIRO',
            Checksum: ''
          };
          
          console.log('📋 Save Bill Contract Request:', requestData);
          
          const BASE_URL = (Environment.baseUrlCommon || "http://172.16.2.31:3306").replace(/\/+$/, "");
          const apiUrl = `${BASE_URL}/api/OldAPI`;
          
          console.log('📡 Calling API:', apiUrl);
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const result = await response.json();
          console.log('📥 Save Response:', result);
          
          if (result && result.Details01) {
            showToast('Data saved successfully', 'success');
            console.log('✅ Bill Contract saved successfully');
            // Refresh the view with saved data
            handleViewBillProduct();
          } else if (result && result.error) {
            alert(`Error: ${result.error}`);
          } else {
            showToast('Data saved successfully', 'success');
          }
        } catch (error) {
          console.error('❌ Error saving bill contract:', error);
          alert("An error occurred while saving bill contract: " + error.message);
        }
      }
      
      /**
       * Handle Delete button click
       */
      async function handleDeleteBillContract() {
        if (!confirm("Are you sure you want to delete this bill contract?")) {
          return;
        }
        
        try {
          const productID = document.getElementById("ProductID").value;
          
          if (!productID) {
            alert("Please select a bill contract to delete");
            return;
          }
          
          const result = await ProductBillContractService.deleteBillContract({
            ProductID: productID
          });
          
          if (result.success) {
            alert("Bill Contract deleted successfully!");
            clearForm();
          } else {
            alert(`Error: ${result.message || "Failed to delete bill contract"}`);
          }
        } catch (error) {
          console.error("Error deleting bill contract:", error);
          alert("An error occurred while deleting bill contract");
        }
      }
      
      /**
       * Handle product search - DEPRECATED
       * Now using Bootstrap modal in product-bill-contract.js
       */
      /* DISABLED - Bootstrap modal approach is now used instead
      async function handleProductSearch() {
        console.log('[Bill Contract] Product search button clicked');
        
        // Create modal overlay and iframe like Product (SB,CA,CS,SH)
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
            console.log('🔔 Message received in Bill Contract:', event.data);
            
            if (event.data && event.data.type === 'PRODUCT_SELECTED') {
              console.log('✓ Product selected:', event.data);
              const { productId, productTypeId } = event.data;
              
              const productField = document.getElementById('ProductID');
              if (productField) {
                const newValue = productId ? String(productId).trim() : '';
                productField.value = newValue;
                console.log('✓ ProductID field updated to:', newValue);
              } else {
                console.error('❌ ProductID field not found');
              }

              // Try to set product type if provided
              if (productTypeId) {
                const trimmedType = String(productTypeId).trim();
                const typeSelect = document.getElementById('ProductTypes');
                if (typeSelect) {
                  typeSelect.value = trimmedType;
                  console.log('✓ ProductTypes dropdown updated to:', trimmedType);
                }
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
            console.log('🗑️ Message listener removed');
          }
        };
        
        // Add the listener
        window.addEventListener('message', messageHandler.handler);
        console.log('👂 Message listener added for product selection');
      }
      */
      
      /**
       * Display bill contract details in the form
       */
      function displayBillContractDetails(data) {
        console.log('📊 displayBillContractDetails called with:', data);
        
        if (!data) {
          console.warn('⚠ No data provided');
          return;
        }
        
        let billData = data;
        if (data.Details01 && Array.isArray(data.Details01) && data.Details01.length > 0) {
          billData = data.Details01[0];
          console.log('✓ Extracted data from Details01[0]');
        } else if (Array.isArray(data) && data.length > 0) {
          billData = data[0];
          console.log('✓ Extracted first element from array');
        }
        
        console.log('📋 Processing bill data:', billData);
        
        // Helper function to set field value
        function setFieldValue(fieldId, value) {
          const field = document.getElementById(fieldId);
          if (field && value !== null && value !== undefined) {
            field.value = value;
            console.log(`✓ ${fieldId} = ${value}`);
          }
        }
        
        // Helper function to format date
        function formatDateValue(dateString) {
          if (!dateString) return '';
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return dateString;
          const day = String(date.getDate()).padStart(2, '0');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const month = months[date.getMonth()];
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        }
        
        // Map text input fields
        setFieldValue('ProductID', billData.ProductID);
        setFieldValue('Currency', billData.CurrencyID);
        setFieldValue('ValidFrom', formatDateValue(billData.ValidFrom));
        setFieldValue('ValidTo', formatDateValue(billData.ValidTo));
        setFieldValue('ProductCode', billData.ProductCode);
        setFieldValue('InterestStartMonth', billData.DbIntStartMonth);
        
        // Map dropdown/select fields
        setFieldValue('ProductTypes', billData.ProductTypeID);
        setFieldValue('AccountingRule', billData.AccountingRuleID);
        setFieldValue('ProductCategory', billData.ProductCategoryID);
        setFieldValue('AccountClassID', billData.ProductClassID);
        setFieldValue('CustomerRestriction', billData.CustomerRestriction);
        setFieldValue('ContractTypeID', billData.ContractTypeID);
        setFieldValue('InterestType', billData.IntTypeID);
        setFieldValue('InterestRateID', billData.IntRateMenuID);
        setFieldValue('InterestCalculationRule', billData.IntCalcRuleID);
        setFieldValue('InterestRounding', billData.RoundingID);
        setFieldValue('IntApplFrequency', billData.IntApplnFrequencyID);
        setFieldValue('TaxRule', billData.IntTaxID);
        setFieldValue('IntAccrualFrequency', billData.IntAcrlFrequencyID);
        setFieldValue('DocumentType', billData.DocumentType);
        setFieldValue('TenorType', billData.TenorType);
        setFieldValue('IncoTerms', billData.IncoTerms);
        
        // Map checkbox fields
        function setCheckboxValue(checkboxId, value) {
          const checkbox = document.getElementById(checkboxId);
          if (checkbox) {
            checkbox.checked = Boolean(value);
            console.log(`✓ ${checkboxId} = ${value}`);
          }
        }
        
        setCheckboxValue('IsInterestTaxable', billData.IsIntTaxable);
        setCheckboxValue('AccrueInterest', billData.IsIntAcrl);
        setCheckboxValue('AllowAdvance', billData.AllowAdvance);
        setCheckboxValue('AllowDiscount', billData.AllowDiscount);
        setCheckboxValue('DiscountToCollect', billData.DiscountToCollect);
        setCheckboxValue('AllowForfeiting', billData.AllowForfeiting);
        setCheckboxValue('DiscountToForfeit', billData.DiscountToForfeit);
        setCheckboxValue('CollectToTransfer', billData.CollectToTransfer);
        setCheckboxValue('AutoLiquidate', billData.AutoLiquidate);
        setCheckboxValue('AllowBrokerage', billData.AllowBrokerage);
        setCheckboxValue('AllowRollover', billData.AllowRollover);
        
        console.log('✓ All fields populated successfully');
      }
      
      /**
       * Display product search results
       */
      function displayProductSearchResults(data) {
        console.log("Product Search Results:", data);
      }
      
      /**
       * Get form data from all fields
       */
      function getFormData() {
        return {
          BankID: getBankID(),
          OurBranchID: getBranchID(),
          ProductID: document.getElementById("ProductID").value,
          ProductTypes: document.getElementById("ProductTypes").value,
          Currency: document.querySelector('[placeholder="Search currency"]')?.value || "",
          ProductCode: document.querySelector('[placeholder="Product Code"]')?.value || "",
          OperatorID: getOperatorID()
        };
      }
      
      /**
       * Clear form fields
       */
      function clearForm() {
        console.log('🧹 Clearing form fields');
        
        // Clear all text inputs
        const textInputs = ['ProductID', 'Currency', 'ValidFrom', 'ValidTo', 'ProductCode', 
                           'InterestStartMonth'];
        textInputs.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
        
        // Reset all dropdowns to first option
        const dropdowns = ['ProductTypes', 'AccountingRule', 'ProductCategory', 'AccountClassID', 
                          'CustomerRestriction', 'ContractTypeID', 'InterestType', 'InterestRateID',
                          'InterestCalculationRule', 'InterestRounding', 'IntApplFrequency', 
                          'TaxRule', 'IntAccrualFrequency', 'DocumentType', 'TenorType', 'IncoTerms'];
        dropdowns.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.selectedIndex = 0;
        });
        
        // Uncheck all checkboxes
        const checkboxes = ['IsInterestTaxable', 'AccrueInterest', 'AllowAdvance', 'AllowDiscount',
                           'DiscountToCollect', 'AllowForfeiting', 'DiscountToForfeit', 
                           'CollectToTransfer', 'AutoLiquidate', 'AllowBrokerage', 'AllowRollover'];
        checkboxes.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.checked = false;
        });
        
        console.log('✓ Form cleared');
      }
      
      /**
       * Helper function to get Bank ID (from session/config)
       */
      function getBankID() {
        return sessionStorage.getItem("BankID") || localStorage.getItem("BankID") || "00";
      }
      
      /**
       * Helper function to get Branch ID (from session/config)
       */
      function getBranchID() {
        return sessionStorage.getItem("OurBranchID") || localStorage.getItem("OurBranchID") || "0101";
      }
      
      /**
       * Helper function to get Operator ID (from session/config)
       */
      function getOperatorID() {
        return sessionStorage.getItem("OperatorID") || localStorage.getItem("OperatorID") || "CSADM";
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
      alert('Error loading Product Bill Contract page. Check browser console for details.');
      throw error;
    }
  })();
}

// Wait for DOM to be fully loaded before initializing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeBillContractPage);
} else {
  initializeBillContractPage();
}
