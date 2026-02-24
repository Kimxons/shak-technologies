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

    console.log("[ProductMaintenanceLoan] Dependencies loaded successfully");

    let currentProduct = null;
    let isEditMode = false;

    /**
     * Initialize the page - load required services and populate dropdowns
     */
    async function initPage() {
      try {
        console.log('Initializing Product Maintenance - Loan');

        // Populate all dropdowns
        const dropdownPromises = [
          loadProductCategories(),
          loadCustomerRestrictions(),
          loadAccountingRules(),
          loadAccountClasses(),
          loadInterestTypes(),
          loadInterestCalcRules(),
          loadFrequencies(),
          loadInterestRateIDs(),
          loadTaxRules(),
          loadInterestPayoutModes(),
          loadEMIRoundingRules()
        ];

        const results = await Promise.allSettled(dropdownPromises);

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Dropdown ${index} failed:`, result.reason);
          }
        });

        console.log('Dropdowns loaded');

        // Wire button event listeners
        wireButtonListeners();
      } catch (error) {
        console.error('Error initializing page:', error);
      }
    }

    /**
     * Wire up button event listeners based on data attributes
     */
    function wireButtonListeners() {
      console.log('🔧 wireButtonListeners called');
      
      // Mode buttons (View, Add, Edit, Delete)
      document.querySelectorAll('[data-shell-mode]').forEach((btn) => {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          const mode = this.getAttribute('data-shell-mode');
          if (mode === 'View') handleView();
          else if (mode === 'Add') handleAdd();
          else if (mode === 'Update') handleEdit();
          else if (mode === 'Delete') handleDelete();
        });
      });

      // Submit buttons (Save, Cancel)
      document.querySelectorAll('[data-submit-action]').forEach((btn) => {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          const action = this.getAttribute('data-submit-action');
          if (action === 'save') handleSave();
          else if (action === 'cancel') handleCancel();
        });
      });

      // Product search button
      const productSearchBtn = document.getElementById('productSearchBtn');
      console.log('🔍 Looking for productSearchBtn:', productSearchBtn);
      
      if (productSearchBtn) {
        productSearchBtn.addEventListener('click', handleProductSearch);
        console.log('✓ Product search button event attached');
      } else {
        console.warn('⚠ Product search button not found - DOM might not be ready yet');
        // Retry after a short delay
        setTimeout(() => {
          const retryBtn = document.getElementById('productSearchBtn');
          if (retryBtn) {
            retryBtn.addEventListener('click', handleProductSearch);
            console.log('✓ Product search button event attached (retry)');
          } else {
            console.error('❌ Product search button still not found after retry');
          }
        }, 500);
      }

      // Add F2 key handler to Product field
      const productField = document.getElementById('Product');
      if (productField) {
        productField.addEventListener('keydown', function(e) {
          if (e.key === 'F2') {
            e.preventDefault();
            console.log('🔍 F2 pressed on Product field - opening search');
            handleProductSearch();
          }
        });
        console.log('✓ F2 key handler attached to Product field');
      } else {
        console.warn('⚠ Product field not found for F2 handler');
      }
    }

    /**
     * Handle product search
     */
    function handleProductSearch() {
      console.log('[Product Maintenance Loan] Product search button clicked');
      
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
          console.log('🔔 Message received in Product Loan:', event.data);
          
          if (event.data && event.data.type === 'PRODUCT_SELECTED') {
            console.log('✓ Product selected:', event.data);
            const { productId, productTypeId } = event.data;
            
            const productField = document.getElementById('Product');
            if (productField) {
              const newValue = productId ? String(productId).trim() : '';
              productField.value = newValue;
              console.log('✓ Product field updated to:', newValue);
            } else {
              console.error('❌ Product field not found');
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

    /**
     * Handle View button click
     */
    async function handleView() {
      try {
        const productId = document.getElementById('ProductName').value;
        if (!productId) {
          console.log('No product selected for viewing');
          return;
        }

        console.log('Viewing product:', productId);

        // Call service to fetch product details
        const result = await ProductLoanService.getProductLoan({
          BankID: "00",
          OurBranchID: "0101",
          ProductID: productId,
          OperatorID: "CSADM",
          Direction: 1
        });

        console.log('Product data received:', result);

        if (result.success || result.isSuccess) {
          if (result.data) {
            displayProductDetails(result.data);
            currentProduct = result.data;

            // Update button states
            document.querySelector('[data-shell-mode="Update"]').disabled = false;
            document.querySelector('[data-shell-mode="Delete"]').disabled = false;
          }
        } else {
          console.error('View failed:', result.message);
          alert(`Error: ${result.message}`);
        }
      } catch (error) {
        console.error('Error in handleView:', error);
        alert(`Error: ${error.message}`);
      }
    }

    /**
     * Handle Add button click
     */
    function handleAdd() {
      console.log('Add mode activated');
      clearForm();
      isEditMode = true;

      // Update button states
      document.querySelector('[data-shell-mode="View"]').disabled = true;
      document.querySelector('[data-shell-mode="Add"]').disabled = true;
      document.querySelector('[data-shell-mode="Update"]').disabled = true;
      document.querySelector('[data-shell-mode="Delete"]').disabled = true;

      document.querySelector('[data-submit-action="save"]').disabled = false;
      document.querySelector('[data-submit-action="cancel"]').disabled = false;

      // Focus on first field
      document.getElementById('ProductName').focus();
    }

    /**
     * Handle Edit button click
     */
    function handleEdit() {
      console.log('Edit mode activated');
      if (!currentProduct) {
        alert('Please view a product first');
        return;
      }
      isEditMode = true;

      // Update button states
      document.querySelector('[data-shell-mode="View"]').disabled = true;
      document.querySelector('[data-shell-mode="Add"]').disabled = true;
      document.querySelector('[data-shell-mode="Update"]').disabled = true;
      document.querySelector('[data-shell-mode="Delete"]').disabled = true;

      document.querySelector('[data-submit-action="save"]').disabled = false;
      document.querySelector('[data-submit-action="cancel"]').disabled = false;
    }

    /**
     * Handle Delete button click
     */
    async function handleDelete() {
      const productId = document.getElementById('ProductName').value;
      if (!productId) {
        console.log('No product selected for deletion');
        return;
      }

      if (!confirm('Are you sure you want to delete this product?')) {
        return;
      }

      try {
        console.log('Deleting product:', productId);

        const result = await ProductLoanService.deleteProductLoan({
          BankID: "00",
          OurBranchID: "0101",
          ProductID: productId,
          OperatorID: "CSADM"
        });

        if (result.success || result.isSuccess) {
          console.log('Product deleted successfully');
          clearForm();

          // Reset button states
          document.querySelector('[data-shell-mode="View"]').disabled = false;
          document.querySelector('[data-shell-mode="Add"]').disabled = false;
          document.querySelector('[data-shell-mode="Update"]').disabled = true;
          document.querySelector('[data-shell-mode="Delete"]').disabled = true;

          alert('Product deleted successfully');
        } else {
          console.error('Delete failed:', result.message);
          alert(`Error: ${result.message}`);
        }
      } catch (error) {
        console.error('Error in handleDelete:', error);
        alert(`Error: ${error.message}`);
      }
    }

    /**
     * Handle Save button click
     */
    async function handleSave() {
      try {
        const formData = getFormData();
        console.log('Saving product:', formData);

        const result = await ProductLoanService.saveProductLoan(formData);

        if (result.success || result.isSuccess) {
          console.log('Product saved successfully:', result.data);

          isEditMode = false;
          currentProduct = null;
          clearForm();

          // Reset button states
          document.querySelector('[data-shell-mode="View"]').disabled = false;
          document.querySelector('[data-shell-mode="Add"]').disabled = false;
          document.querySelector('[data-shell-mode="Update"]').disabled = true;
          document.querySelector('[data-shell-mode="Delete"]').disabled = true;

          document.querySelector('[data-submit-action="save"]').disabled = true;
          document.querySelector('[data-submit-action="cancel"]').disabled = true;

          alert('Product saved successfully');
        } else {
          console.error('Save failed:', result.message);
          alert(`Error: ${result.message}`);
        }
      } catch (error) {
        console.error('Error in handleSave:', error);
        alert(`Error: ${error.message}`);
      }
    }

    /**
     * Handle Cancel button click
     */
    function handleCancel() {
      console.log('Cancel button clicked');
      isEditMode = false;
      currentProduct = null;
      clearForm();

      // Reset button states
      document.querySelector('[data-shell-mode="View"]').disabled = false;
      document.querySelector('[data-shell-mode="Add"]').disabled = false;
      document.querySelector('[data-shell-mode="Update"]').disabled = true;
      document.querySelector('[data-shell-mode="Delete"]').disabled = true;

      document.querySelector('[data-submit-action="save"]').disabled = true;
      document.querySelector('[data-submit-action="cancel"]').disabled = true;
    }

    /**
     * Display product details in form fields
     */
    function displayProductDetails(data) {
      if (!data) {
        console.log('No data provided to displayProductDetails');
        return;
      }

      console.log('Displaying product details');

      // Helper function to get value with multiple key fallbacks for case variations
      const safeGet = (obj, ...keys) => {
        for (const key of keys) {
          if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key];
        }
        return '';
      };

      // Top identifiers
      document.getElementById('ProductName').value = safeGet(data, 'ProductName', 'productName', 'ProductCode');
      document.getElementById('ProductCode').value = safeGet(data, 'ProductCode', 'productCode');
      document.getElementById('ProductCategory').value = safeGet(data, 'ProductCategory', 'ProductCategoryID', 'productCategory');
      document.getElementById('Currency').value = safeGet(data, 'Currency', 'CurrencyID', 'currency');
      document.getElementById('ValidFrom').value = safeGet(data, 'ValidFrom', 'validFrom');
      document.getElementById('ValidTo').value = safeGet(data, 'ValidTo', 'validTo');
      document.getElementById('CustomerRestriction').value = safeGet(data, 'CustomerRestriction', 'ProductTypeID', 'customerRestriction');
      document.getElementById('AccountingRule').value = safeGet(data, 'AccountingRule', 'AccountingRuleID', 'accountingRule');
      document.getElementById('AccountClassID').value = safeGet(data, 'AccountClassID', 'ProductClassID', 'accountClassID');

      // Interest Rate Setting
      document.getElementById('InterestType').value = safeGet(data, 'InterestType', 'DbIntTypeID', 'interestType');
      document.getElementById('InterestCalcRule').value = safeGet(data, 'InterestCalcRule', 'DbIntCalcRuleID', 'interestCalcRule');
      document.getElementById('IntApplFrequency').value = safeGet(data, 'IntApplFrequency', 'DbIntApplFrequencyID', 'intApplFrequency');
      document.getElementById('isInterestTaxable').checked = safeGet(data, 'IsInterestTaxable', 'isInterestTaxable') === true || safeGet(data, 'IsInterestTaxable', 'isInterestTaxable') === 1;
      document.getElementById('accrueInterest').checked = safeGet(data, 'AccrueInterest', 'accrueInterest') === true || safeGet(data, 'AccrueInterest', 'accrueInterest') === 1;
      document.getElementById('InterestRateID').value = safeGet(data, 'InterestRateID', 'IntRateMenuID', 'interestRateID');
      document.getElementById('InterestRounding').value = safeGet(data, 'InterestRounding', 'DbRoundingID', 'interestRounding');
      document.getElementById('InterestStartMonth').value = safeGet(data, 'InterestStartMonth', 'interestStartMonth');
      document.getElementById('TaxRule').value = safeGet(data, 'TaxRule', 'DbIntTaxID', 'taxRule');
      document.getElementById('IntAccrualFrequency').value = safeGet(data, 'IntAccrualFrequency', 'ProvisionFrequencyID', 'intAccrualFrequency');

      // Loan Parameters
      document.getElementById('MinLoanAmount').value = safeGet(data, 'MinLoanAmount', 'minLoanAmount');
      document.getElementById('MaxLoanAmount').value = safeGet(data, 'MaxLoanAmount', 'maxLoanAmount');
      document.getElementById('MinTenure').value = safeGet(data, 'MinTenure', 'MinLoanTerm', 'minTenure');
      document.getElementById('MaxTenure').value = safeGet(data, 'MaxTenure', 'MaxTermExtendable', 'maxTenure');
      document.getElementById('InterestPayoutMode').value = safeGet(data, 'InterestPayoutMode', 'interestPayoutMode');
      document.getElementById('EMIRoundingRule').value = safeGet(data, 'EMIRoundingRule', 'InstallmentRoundingID', 'emiRoundingRule');

      // Penalty and Charges
      document.getElementById('PrePaymentPenalty').value = safeGet(data, 'PrePaymentPenalty', 'prePaymentPenalty');
      document.getElementById('ProcessingFee').value = safeGet(data, 'ProcessingFee', 'processingFee');
      document.getElementById('LatePenaltyRule').value = safeGet(data, 'LatePenaltyRule', 'PenaltyRuleID', 'latePenaltyRule');
      document.getElementById('DocumentationCharges').value = safeGet(data, 'DocumentationCharges', 'documentationCharges');
    }

    /**
     * Get form data as JSON object
     */
    function getFormData() {
      return {
        BankID: "00",
        OurBranchID: "0101",
        ProductID: document.getElementById('ProductName').value,
        ProductCode: document.getElementById('ProductCode').value,
        ProductCategory: document.getElementById('ProductCategory').value,
        Currency: document.getElementById('Currency').value,
        ValidFrom: document.getElementById('ValidFrom').value,
        ValidTo: document.getElementById('ValidTo').value,
        CustomerRestriction: document.getElementById('CustomerRestriction').value,
        AccountingRule: document.getElementById('AccountingRule').value,
        AccountClassID: document.getElementById('AccountClassID').value,
        InterestType: document.getElementById('InterestType').value,
        InterestCalcRule: document.getElementById('InterestCalcRule').value,
        IntApplFrequency: document.getElementById('IntApplFrequency').value,
        IsInterestTaxable: document.getElementById('isInterestTaxable').checked,
        AccrueInterest: document.getElementById('accrueInterest').checked,
        InterestRateID: document.getElementById('InterestRateID').value,
        InterestRounding: document.getElementById('InterestRounding').value,
        InterestStartMonth: document.getElementById('InterestStartMonth').value,
        TaxRule: document.getElementById('TaxRule').value,
        IntAccrualFrequency: document.getElementById('IntAccrualFrequency').value,
        MinLoanAmount: document.getElementById('MinLoanAmount').value,
        MaxLoanAmount: document.getElementById('MaxLoanAmount').value,
        MinTenure: document.getElementById('MinTenure').value,
        MaxTenure: document.getElementById('MaxTenure').value,
        InterestPayoutMode: document.getElementById('InterestPayoutMode').value,
        EMIRoundingRule: document.getElementById('EMIRoundingRule').value,
        PrePaymentPenalty: document.getElementById('PrePaymentPenalty').value,
        ProcessingFee: document.getElementById('ProcessingFee').value,
        LatePenaltyRule: document.getElementById('LatePenaltyRule').value,
        DocumentationCharges: document.getElementById('DocumentationCharges').value,
        OperatorID: "CSADM",
        Direction: 1
      };
    }

    /**
     * Clear all form fields
     */
    function clearForm() {
      const form = document.getElementById('product-maintenance-loan-form');
      if (form) {
        form.reset();
      }
      currentProduct = null;
    }

    // ========== Dropdown Loaders ==========

    async function loadProductCategories() {
      try {
        const options = await LookupService.getSystemCodeOptions('PRODUCT_CATEGORY');
        const select = document.getElementById('ProductCategory');
        if (select) {
          options.forEach((opt) => {
            const option = document.createElement('option');
            option.value = opt.Code;
            option.textContent = opt.Description;
            select.appendChild(option);
          });
        }
      } catch (error) {
        console.error('Error loading ProductCategories:', error);
      }
    }

    async function loadCustomerRestrictions() {
      try {
        const options = await LookupService.getSystemCodeOptions('CUSTOMER_RESTRICTION');
        const select = document.getElementById('CustomerRestriction');
        if (select) {
          options.forEach((opt) => {
            const option = document.createElement('option');
            option.value = opt.Code;
            option.textContent = opt.Description;
            select.appendChild(option);
          });
        }
      } catch (error) {
        console.error('Error loading CustomerRestrictions:', error);
      }
    }

    async function loadAccountingRules() {
      try {
        const options = await LookupService.getSystemCodeOptions('ACCOUNTING_RULE');
        const select = document.getElementById('AccountingRule');
        if (select) {
          options.forEach((opt) => {
            const option = document.createElement('option');
            option.value = opt.Code;
            option.textContent = opt.Description;
            select.appendChild(option);
          });
        }
      } catch (error) {
        console.error('Error loading AccountingRules:', error);
      }
    }

    async function loadAccountClasses() {
      try {
        const options = await LookupService.getSystemCodeOptions('ACCOUNT_CLASS');
        const select = document.getElementById('AccountClassID');
        if (select) {
          options.forEach((opt) => {
            const option = document.createElement('option');
            option.value = opt.Code;
            option.textContent = opt.Description;
            select.appendChild(option);
          });
        }
      } catch (error) {
        console.error('Error loading AccountClasses:', error);
      }
    }

    async function loadInterestTypes() {
      try {
        const options = await LookupService.getSystemCodeOptions('INTEREST_TYPE');
        const select = document.getElementById('InterestType');
        if (select) {
          options.forEach((opt) => {
            const option = document.createElement('option');
            option.value = opt.Code;
            option.textContent = opt.Description;
            select.appendChild(option);
          });
        }
      } catch (error) {
        console.error('Error loading InterestTypes:', error);
      }
    }

    async function loadInterestCalcRules() {
      try {
        const options = await LookupService.getSystemCodeOptions('INTEREST_CALC_RULE');
        const select = document.getElementById('InterestCalcRule');
        if (select) {
          options.forEach((opt) => {
            const option = document.createElement('option');
            option.value = opt.Code;
            option.textContent = opt.Description;
            select.appendChild(option);
          });
        }
      } catch (error) {
        console.error('Error loading InterestCalcRules:', error);
      }
    }

    async function loadFrequencies() {
      try {
        const options = await LookupService.getSystemCodeOptions('FREQUENCY');
        const selects = document.querySelectorAll('[id$="Frequency"]');
        if (selects.length > 0) {
          selects.forEach((select) => {
            options.forEach((opt) => {
              const option = document.createElement('option');
              option.value = opt.Code;
              option.textContent = opt.Description;
              select.appendChild(option);
            });
          });
        }
      } catch (error) {
        console.error('Error loading Frequencies:', error);
      }
    }

    async function loadInterestRateIDs() {
      try {
        const options = await LookupService.getSystemCodeOptions('INTEREST_RATE_ID');
        const select = document.getElementById('InterestRateID');
        if (select) {
          options.forEach((opt) => {
            const option = document.createElement('option');
            option.value = opt.Code;
            option.textContent = opt.Description;
            select.appendChild(option);
          });
        }
      } catch (error) {
        console.error('Error loading InterestRateIDs:', error);
      }
    }

    async function loadTaxRules() {
      try {
        const options = await LookupService.getSystemCodeOptions('TAX_RULE');
        const select = document.getElementById('TaxRule');
        if (select) {
          options.forEach((opt) => {
            const option = document.createElement('option');
            option.value = opt.Code;
            option.textContent = opt.Description;
            select.appendChild(option);
          });
        }
      } catch (error) {
        console.error('Error loading TaxRules:', error);
      }
    }

    async function loadInterestPayoutModes() {
      try {
        const options = await LookupService.getSystemCodeOptions('INTEREST_PAYOUT_MODE');
        const select = document.getElementById('InterestPayoutMode');
        if (select) {
          options.forEach((opt) => {
            const option = document.createElement('option');
            option.value = opt.Code;
            option.textContent = opt.Description;
            select.appendChild(option);
          });
        }
      } catch (error) {
        console.error('Error loading InterestPayoutModes:', error);
      }
    }

    async function loadEMIRoundingRules() {
      try {
        const options = await LookupService.getSystemCodeOptions('EMI_ROUNDING_RULE');
        const select = document.getElementById('EMIRoundingRule');
        if (select) {
          options.forEach((opt) => {
            const option = document.createElement('option');
            option.value = opt.Code;
            option.textContent = opt.Description;
            select.appendChild(option);
          });
        }
      } catch (error) {
        console.error('Error loading EMIRoundingRules:', error);
      }
    }

    // Initialize page when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPage);
    } else {
      initPage();
    }
  } catch (error) {
    console.error('[ProductMaintenanceLoan] Error loading dependencies:', error);
  }
})();
