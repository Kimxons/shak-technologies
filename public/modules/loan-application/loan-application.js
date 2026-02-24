// Loan Application - Main JavaScript
(async function() {
  // Wait for ServiceLoader to be available
  if (!window.ServiceLoader) {
    console.error('[LoanApplication] ServiceLoader not found! Make sure serviceLoader.js is loaded before loan-application.js');
    return;
  }
  
  const { ServiceLoader } = window;
  
  // Load dependencies
  await ServiceLoader.loadCore();
  await ServiceLoader.loadLoanApplicationService();
  await ServiceLoader.loadSearchService();  // For search functionality
  await ServiceLoader.loadApplicationSearchService(); // For application search modal
  await ServiceLoader.loadClientSearchService(); // For client search modal
  await ServiceLoader.loadLookupService(); // For dropdown lookups
  
  // Get service
  const LoanApplicationService = window.LoanApplicationService;
  const SearchService = window.SearchService;
  const LookupService = window.LookupService;

  /**
   * Load Line of Business dropdown from database
   */
  async function loadLineOfBusinessDropdown() {
    try {
      console.log('[LoanApplication] Loading Line of Business from database...');
      console.log('[LoanApplication] LookupService available:', !!LookupService);
      
      // Call LookupService.getBusinessLines() which uses p_v1_GetSystemCodes with CodeID='BusinessLineID'
      const options = await LookupService.getBusinessLines();
      console.log('[LoanApplication] Received options:', options);
      console.log('[LoanApplication] Options length:', options?.length);
      
      const select = document.getElementById('lineOfBusiness');
      
      if (!select) {
        console.error('[LoanApplication] Line of Business dropdown not found');
        return;
      }
      
      if (!options || options.length === 0) {
        console.warn('[LoanApplication] No business lines returned from database');
        return;
      }
      
      // Clear existing options except the first one (--Select--)
      while (select.options.length > 1) {
        select.remove(1);
      }
      
      // Populate with database options
      options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;  // SubCodeID from t_SystemCodeDetail
        optionElement.textContent = option.label;  // CodeDescription from t_SystemCodeDetail
        select.appendChild(optionElement);
        console.log('[LoanApplication] Added option:', option.value, '-', option.label);
      });
      
      console.log(`[LoanApplication] ✓ Loaded ${options.length} business lines from database`);
    } catch (error) {
      console.error('[LoanApplication] Error loading Line of Business:', error);
    }
  }

  /**
   * Load Loan Purpose dropdown from database
   */
  async function loadLoanPurposeDropdown() {
    try {
      console.log('[LoanApplication] Loading Loan Purpose from database...');
      
      const options = await LookupService.getLoanPurposes();
      const select = document.getElementById('loanPurpose');
      
      if (!select) {
        console.error('[LoanApplication] Loan Purpose dropdown not found');
        return;
      }
      
      if (!options || options.length === 0) {
        console.warn('[LoanApplication] No loan purposes returned from database');
        return;
      }
      
      // Clear existing options except the first one (--Select--)
      while (select.options.length > 1) {
        select.remove(1);
      }
      
      // Populate with database options
      options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        select.appendChild(optionElement);
      });
      
      console.log(`[LoanApplication] ✓ Loaded ${options.length} loan purposes from database`);
    } catch (error) {
      console.error('[LoanApplication] Error loading Loan Purpose:', error);
    }
  }

  /**
   * Load Business Status dropdown from database
   */
  async function loadBusinessStatusDropdown() {
    try {
      console.log('[LoanApplication] Loading Business Status from database...');
      
      const options = await LookupService.getBusinessStatuses();
      const select = document.getElementById('businessStatus');
      
      if (!select) {
        console.error('[LoanApplication] Business Status dropdown not found');
        return;
      }
      
      if (!options || options.length === 0) {
        console.warn('[LoanApplication] No business statuses returned from database');
        return;
      }
      
      // Clear existing options except the first one (--Select--)
      while (select.options.length > 1) {
        select.remove(1);
      }
      
      // Populate with database options
      options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        select.appendChild(optionElement);
      });
      
      console.log(`[LoanApplication] ✓ Loaded ${options.length} business statuses from database`);
    } catch (error) {
      console.error('[LoanApplication] Error loading Business Status:', error);
    }
  }

  /**
   * Load Collateral Type dropdown from database
   */
  async function loadCollateralTypeDropdown() {
    try {
      console.log('[LoanApplication] Loading Collateral Type from database...');
      
      const options = await LookupService.getCollateralTypes();
      const select = document.getElementById('collateralType');
      
      if (!select) {
        console.error('[LoanApplication] Collateral Type dropdown not found');
        return;
      }
      
      if (!options || options.length === 0) {
        console.warn('[LoanApplication] No collateral types returned from database');
        return;
      }
      
      // Clear existing options except the first one (--Select--)
      while (select.options.length > 1) {
        select.remove(1);
      }
      
      // Populate with database options
      options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        select.appendChild(optionElement);
      });
      
      console.log(`[LoanApplication] ✓ Loaded ${options.length} collateral types from database`);
    } catch (error) {
      console.error('[LoanApplication] Error loading Collateral Type:', error);
    }
  }

  /**
   * Load StartUp Capital Type dropdown from database
   */
  async function loadStartupTypeDropdown() {
    try {
      console.log('[LoanApplication] Loading StartUp Capital Type from database...');
      
      const options = await LookupService.getStartupTypes();
      const select = document.getElementById('startupCapital');
      
      if (!select) {
        console.error('[LoanApplication] StartUp Capital dropdown not found');
        return;
      }
      
      if (!options || options.length === 0) {
        console.warn('[LoanApplication] No startup types returned from database');
        return;
      }
      
      // Clear existing options except the first one (--Select--)
      while (select.options.length > 1) {
        select.remove(1);
      }
      
      // Populate with database options
      options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        select.appendChild(optionElement);
      });
      
      console.log(`[LoanApplication] ✓ Loaded ${options.length} startup types from database`);
    } catch (error) {
      console.error('[LoanApplication] Error loading StartUp Capital Type:', error);
    }
  }

  /**
   * Load Loan Limit Type dropdown from database
   */
  async function loadLimitTypeDropdown() {
    try {
      console.log('[LoanApplication] Loading Loan Limit Type from database...');
      
      const options = await LookupService.getLimitTypes();
      const select = document.getElementById('loanLimitType');
      
      if (!select) {
        console.error('[LoanApplication] Loan Limit Type dropdown not found');
        return;
      }
      
      if (!options || options.length === 0) {
        console.warn('[LoanApplication] No limit types returned from database');
        return;
      }
      
      // Clear existing options except the first one (--Select--)
      while (select.options.length > 1) {
        select.remove(1);
      }
      
      // Populate with database options
      options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        select.appendChild(optionElement);
      });
      
      console.log(`[LoanApplication] ✓ Loaded ${options.length} limit types from database`);
    } catch (error) {
      console.error('[LoanApplication] Error loading Loan Limit Type:', error);
    }
  }

  // Load dropdowns in PARALLEL for faster page load
  console.log('[LoanApplication] Services loaded, now loading dropdowns in parallel...');
  const dropdownStartTime = performance.now();
  
  await Promise.all([
    loadLineOfBusinessDropdown(),
    loadLoanPurposeDropdown(),
    loadBusinessStatusDropdown(),
    loadCollateralTypeDropdown(),
    loadStartupTypeDropdown(),
    loadLimitTypeDropdown()
  ]);
  
  const dropdownEndTime = performance.now();
  console.log(`[LoanApplication] ✓ All dropdowns loaded in ${(dropdownEndTime - dropdownStartTime).toFixed(0)}ms`);

  /**
   * Show a styled confirmation modal (replaces browser confirm())
   * @param {Object} options - Configuration options
   * @param {string} options.title - Modal title
   * @param {string} options.heading - Heading in body
   * @param {string} options.message - Message text
   * @param {string} options.confirmText - Button text
   * @param {string} options.type - 'primary', 'success', 'warning', 'danger', 'info'
   * @param {string} options.icon - Bootstrap icon class (e.g., 'bi-check-circle')
   * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled
   */
  function showConfirmModal(options = {}) {
      return new Promise((resolve) => {
          const modalEl = document.getElementById('confirmActionModal');
          if (!modalEl) {
              // Fallback to native confirm if modal doesn't exist
              resolve(confirm(options.message || 'Are you sure?'));
              return;
          }

          const defaults = {
              title: 'Confirm Action',
              heading: 'Confirm',
              message: 'Are you sure you want to proceed?',
              confirmText: 'Confirm',
              type: 'primary',
              icon: 'bi-question-circle-fill'
          };

          const config = { ...defaults, ...options };

          // Color mapping
          const colors = {
              primary: { bg: 'rgba(74, 144, 226, 0.1)', text: 'text-primary', btn: 'btn-primary' },
              success: { bg: 'rgba(39, 174, 96, 0.1)', text: 'text-success', btn: 'btn-success' },
              warning: { bg: 'rgba(243, 156, 18, 0.1)', text: 'text-warning', btn: 'btn-warning' },
              danger: { bg: 'rgba(231, 76, 60, 0.1)', text: 'text-danger', btn: 'btn-danger' },
              info: { bg: 'rgba(52, 152, 219, 0.1)', text: 'text-info', btn: 'btn-info' }
          };

          const colorConfig = colors[config.type] || colors.primary;

          // Update modal content
          const titleEl = document.getElementById('confirmActionTitle');
          const headingEl = document.getElementById('confirmActionHeading');
          const messageEl = document.getElementById('confirmActionMessage');
          const iconWrapper = document.getElementById('confirmActionIconWrapper');
          const bodyIcon = document.getElementById('confirmActionBodyIcon');
          const confirmBtn = document.getElementById('confirmActionBtn');
          const btnTextEl = document.getElementById('confirmActionBtnText');
          const btnIconEl = document.getElementById('confirmActionBtnIcon');

          if (titleEl) titleEl.textContent = config.title;
          if (headingEl) headingEl.textContent = config.heading;
          if (messageEl) messageEl.textContent = config.message;
          if (iconWrapper) iconWrapper.style.background = colorConfig.bg;
          if (bodyIcon) {
              bodyIcon.className = `bi ${config.icon} fs-4 ${colorConfig.text}`;
          }
          if (confirmBtn) {
              confirmBtn.className = `btn px-4 ${colorConfig.btn}`;
          }
          if (btnTextEl) btnTextEl.textContent = config.confirmText;
          if (btnIconEl) btnIconEl.className = `bi ${config.icon} me-1`;

          // Show modal
          const modal = new bootstrap.Modal(modalEl);
          modal.show();

          // Handle confirm button
          const newBtn = confirmBtn.cloneNode(true);
          confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
          
          // Restore content after clone
          const newBtnText = newBtn.querySelector('#confirmActionBtnText') || newBtn;
          if (newBtnText.id === 'confirmActionBtnText') {
              newBtnText.textContent = config.confirmText;
          }

          newBtn.addEventListener('click', function() {
              modal.hide();
              resolve(true);
          });

          // Handle cancel/close
          modalEl.addEventListener('hidden.bs.modal', function onHidden() {
              modalEl.removeEventListener('hidden.bs.modal', onHidden);
              // Only resolve false if not already resolved
              resolve(false);
          }, { once: true });
      });
  }

  /**
   * Format currency for display
   */
  function formatCurrency(value) {
      if (!value) return '-';
      const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : value;
      if (isNaN(num)) return '-';
      return new Intl.NumberFormat('en-US', { 
          style: 'decimal', 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2 
      }).format(num);
  }

  /**
   * Show specialized Submit Loan Application modal with Application ID display
   * @param {Object} options - Configuration options
   * @param {string} options.applicationId - Current Application ID (empty for new)
   * @param {boolean} options.isEdit - Whether editing existing application
   * @param {Object} options.loanDetails - Loan details to display in summary
   * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled
   */
  function showSubmitLoanModal(options = {}) {
      return new Promise((resolve) => {
          const modalEl = document.getElementById('submitLoanModal');
          if (!modalEl) {
              // Fallback to confirm if modal doesn't exist
              resolve(confirm(options.isEdit 
                  ? 'Are you sure you want to save changes?' 
                  : 'Are you sure you want to apply for this loan?'));
              return;
          }

          const isEdit = options.isEdit || false;
          const appId = options.applicationId || '';
          const loanDetails = options.loanDetails || {};

          // Update Application ID display
          const appIdDisplay = document.getElementById('submitAppIdDisplay');
          const appLabel = document.getElementById('submitAppLabel');
          if (appIdDisplay) {
              appIdDisplay.textContent = appId || 'New Application';
          }
          if (appLabel) {
              appLabel.textContent = isEdit ? 'Application ID' : 'Creating New';
          }

          // Populate loan details summary
          const submitBranchName = document.getElementById('submitBranchName');
          const submitClientName = document.getElementById('submitClientName');
          const submitProductName = document.getElementById('submitProductName');
          const submitLoanAmount = document.getElementById('submitLoanAmount');
          const submitTerm = document.getElementById('submitTerm');
          const submitInterestRate = document.getElementById('submitInterestRate');
          
          if (submitBranchName) submitBranchName.textContent = loanDetails.branchName || '-';
          if (submitClientName) submitClientName.textContent = loanDetails.clientName || '-';
          if (submitProductName) submitProductName.textContent = loanDetails.productName || '-';
          if (submitLoanAmount) submitLoanAmount.textContent = loanDetails.loanAmount ? formatCurrency(loanDetails.loanAmount) : '-';
          if (submitTerm) submitTerm.textContent = loanDetails.term ? `${loanDetails.term} Months` : '-';
          if (submitInterestRate) submitInterestRate.textContent = loanDetails.interestRate ? `${loanDetails.interestRate}%` : '-';

          // Update heading and message
          const heading = document.getElementById('submitHeading');
          const message = document.getElementById('submitMessage');
          if (heading) {
              heading.textContent = isEdit ? 'Save Changes' : 'Submit Application';
          }
          if (message) {
              message.textContent = isEdit 
                  ? 'Are you sure you want to save changes to this loan application?' 
                  : 'Are you sure you want to apply for this new loan?';
          }

          // Update button text and style
          const submitBtn = document.getElementById('confirmSubmitBtn');
          const btnText = document.getElementById('submitBtnText');
          if (btnText) {
              btnText.textContent = isEdit ? 'Save Changes' : 'Apply for Loan';
          }
          if (submitBtn) {
              // Update button style for edit vs new
              if (isEdit) {
                  submitBtn.classList.add('update');
                  submitBtn.querySelector('i').className = 'bi bi-save-fill';
              } else {
                  submitBtn.classList.remove('update');
                  submitBtn.querySelector('i').className = 'bi bi-send-fill';
              }
          }

          // Show modal
          const modal = new bootstrap.Modal(modalEl);
          modal.show();

          // Handle confirm button
          const newBtn = submitBtn.cloneNode(true);
          submitBtn.parentNode.replaceChild(newBtn, submitBtn);
          
          // Restore button content after clone
          const newBtnText = newBtn.querySelector('#submitBtnText');
          if (newBtnText) {
              newBtnText.textContent = isEdit ? 'Save Changes' : 'Apply for Loan';
          }

          newBtn.addEventListener('click', function() {
              modal.hide();
              resolve(true);
          });

          // Handle cancel/close
          modalEl.addEventListener('hidden.bs.modal', function onHidden() {
              modalEl.removeEventListener('hidden.bs.modal', onHidden);
              resolve(false);
          }, { once: true });
      });
  }

  /**
   * Show success modal with new Application ID
   * @param {Object} options - Configuration options
   * @param {string} options.applicationId - The new Application ID
   * @param {Object} options.loanDetails - Loan details to display
   * @returns {Promise<void>} Resolves when modal is closed
   */
  function showSuccessLoanModal(options = {}) {
      console.log('[SuccessModal] showSuccessLoanModal called with:', options);
      
      return new Promise((resolve) => {
          const modalEl = document.getElementById('successLoanModal');
          console.log('[SuccessModal] Modal element found:', !!modalEl);
          
          if (!modalEl) {
              console.error('[SuccessModal] ERROR: Modal element #successLoanModal not found in DOM!');
              // Fallback to alert
              const appId = options.applicationId || 'N/A';
              alert(`✅ Loan Application Submitted Successfully!\n\nThe Applied New Loan ID is: ${appId}\n\nPlease note this Application ID for your records.`);
              clearFormKeepBranch();
              resolve();
              return;
          }

          const appId = options.applicationId || 'N/A';
          const loanDetails = options.loanDetails || {};
          
          console.log('[SuccessModal] Application ID to display:', appId);

          // Display the new Application ID prominently
          const newAppIdDisplay = document.getElementById('newApplicationIdDisplay');
          if (newAppIdDisplay) {
              newAppIdDisplay.textContent = appId;
              console.log('[SuccessModal] Set newApplicationIdDisplay to:', appId);
          } else {
              console.warn('[SuccessModal] newApplicationIdDisplay element not found');
          }

          // Populate success details summary
          const successBranchName = document.getElementById('successBranchName');
          const successClientName = document.getElementById('successClientName');
          const successProductName = document.getElementById('successProductName');
          const successLoanAmount = document.getElementById('successLoanAmount');
          
          if (successBranchName) successBranchName.textContent = loanDetails.branchName || '-';
          if (successClientName) successClientName.textContent = loanDetails.clientName || '-';
          if (successProductName) successProductName.textContent = loanDetails.productName || '-';
          if (successLoanAmount) successLoanAmount.textContent = loanDetails.loanAmount ? formatCurrency(loanDetails.loanAmount) : '-';

          // Show modal using Bootstrap
          try {
              console.log('[SuccessModal] Creating Bootstrap Modal instance...');
              const modal = new bootstrap.Modal(modalEl, {
                  backdrop: 'static',
                  keyboard: false
              });
              console.log('[SuccessModal] Showing modal...');
              modal.show();
              console.log('[SuccessModal] Modal.show() called successfully');
          } catch (err) {
              console.error('[SuccessModal] Error showing Bootstrap modal:', err);
              // Fallback to alert
              alert(`✅ Loan Application Submitted Successfully!\n\nThe Applied New Loan ID is: ${appId}\n\nPlease note this Application ID for your records.`);
              clearFormKeepBranch();
              resolve();
              return;
          }

          // Handle OK button - clear form and close
          const okBtn = document.getElementById('successOkBtn');
          if (okBtn) {
              const newOkBtn = okBtn.cloneNode(true);
              okBtn.parentNode.replaceChild(newOkBtn, okBtn);
              
              newOkBtn.addEventListener('click', function() {
                  console.log('[SuccessModal] OK button clicked, clearing form...');
                  // Get modal instance and hide
                  const modalInstance = bootstrap.Modal.getInstance(modalEl);
                  if (modalInstance) {
                      modalInstance.hide();
                  }
                  // Clear form but keep branch ID
                  clearFormKeepBranch();
                  resolve();
              });
          }

          // Handle modal close via X button
          const closeBtn = modalEl.querySelector('.kairo-close-btn');
          if (closeBtn) {
              closeBtn.addEventListener('click', function() {
                  console.log('[SuccessModal] Close button clicked');
                  clearFormKeepBranch();
              });
          }

          // Handle modal hidden event
          modalEl.addEventListener('hidden.bs.modal', function onHidden() {
              console.log('[SuccessModal] Modal hidden');
              modalEl.removeEventListener('hidden.bs.modal', onHidden);
              resolve();
          }, { once: true });
      });
  }

  // DOM Elements
  const sectionDropdown = document.getElementById('sectionDropdown');

// DOM Elements - Buttons
const moreInfoBtn = document.getElementById('moreInfoBtn');
const viewBtn = document.getElementById('viewBtn');
const addBtn = document.getElementById('addBtn');
const editBtn = document.getElementById('editBtn');
const deleteBtn = document.getElementById('deleteBtn');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const alterBtn = document.getElementById('alterBtn');
const updateBtn = document.getElementById('updateBtn');

// Search Buttons
const searchBranchBtn = document.getElementById('searchBranchBtn');
const searchCenterBtn = document.getElementById('searchCenterBtn');
const searchGroupBtn = document.getElementById('searchGroupBtn');
const searchApplicationBtn = document.getElementById('searchApplicationBtn');
const searchClientBranchBtn = document.getElementById('searchClientBranchBtn');
const searchClientBtn = document.getElementById('searchClientBtn');
const searchProductBtn = document.getElementById('searchProductBtn');
const searchRepaymentAccountBtn = document.getElementById('searchRepaymentAccountBtn');
const searchDonorBtn = document.getElementById('searchDonorBtn');
const searchOfficerBtn = document.getElementById('searchOfficerBtn');
const searchSalesOfficerBtn = document.getElementById('searchSalesOfficerBtn');

// Form Elements - Account Identification
const branchId = document.getElementById('branchId');
const branchName = document.getElementById('branchName');
const centerId = document.getElementById('centerId');
const centerName = document.getElementById('centerName');
const groupId = document.getElementById('groupId');
const applicationId = document.getElementById('applicationId');
const applicationName = document.getElementById('applicationName');
const applicationDate = document.getElementById('applicationDate');

// Client Details
const clientBranchId = document.getElementById('clientBranchId');
const clientBranchName = document.getElementById('clientBranchName');
const clientId = document.getElementById('clientId');
const clientName = document.getElementById('clientName');
const productId = document.getElementById('productId');
const productName = document.getElementById('productName');
const repaymentAccountId = document.getElementById('repaymentAccountId');
const repaymentAccountName = document.getElementById('repaymentAccountName');
const donorId = document.getElementById('donorId');
const donorName = document.getElementById('donorName');
const lineOfBusiness = document.getElementById('lineOfBusiness');
const loanPurpose = document.getElementById('loanPurpose');
const officerId = document.getElementById('officerId');
const officerName = document.getElementById('officerName');

// Financial Details
const loanAmount = document.getElementById('loanAmount');
const currencyId = document.getElementById('currencyId');
const term = document.getElementById('term');
const termPeriod = document.getElementById('termPeriod');
const interestRate = document.getElementById('interestRate');
const commissionRate = document.getElementById('commissionRate');
const taxRate = document.getElementById('taxRate');
const effectiveRate = document.getElementById('effectiveRate');
const disbursementDate = document.getElementById('disbursementDate');
const monthlyProfit = document.getElementById('monthlyProfit');
const monthlyTurnOver = document.getElementById('monthlyTurnOver');
const totalAssets = document.getElementById('totalAssets');
const businessLocation = document.getElementById('businessLocation');
const businessStatus = document.getElementById('businessStatus');
const startupCapital = document.getElementById('startupCapital');
const collateralType = document.getElementById('collateralType');
const spread = document.getElementById('spread');
const loanLimitType = document.getElementById('loanLimitType');
const fileNumber = document.getElementById('fileNumber');
const applicationStatus = document.getElementById('applicationStatus');
const salesOfficerId = document.getElementById('salesOfficerId');
const salesOfficerName = document.getElementById('salesOfficerName');

// Product Info Button
const productInfoBtn = document.getElementById('productInfoBtn');

// State
let isEditMode = false;
let currentApplication = null;
let currentProductRateSlabs = []; // Store product rate slabs
let activeSection = 'dataentry';

// Event Listeners
if (moreInfoBtn) moreInfoBtn.addEventListener('click', showMoreInfo);

// Action buttons (check existence before adding listeners)
if (viewBtn) viewBtn.addEventListener('click', viewApplication);
if (addBtn) addBtn.addEventListener('click', enableAdd);
if (editBtn) editBtn.addEventListener('click', enableEdit);
if (deleteBtn) deleteBtn.addEventListener('click', deleteApplication);
if (saveBtn) saveBtn.addEventListener('click', saveApplication);
if (cancelBtn) cancelBtn.addEventListener('click', cancelOperation);

// Clear Form button
const clearFormBtn = document.getElementById('clearFormBtn');
if (clearFormBtn) {
    clearFormBtn.addEventListener('click', clearFormKeepBranch);
}

// Optional buttons (may not exist in all versions)
if (alterBtn) alterBtn.addEventListener('click', alterApplication);
if (updateBtn) updateBtn.addEventListener('click', updateApplication);

if (searchBranchBtn) searchBranchBtn.addEventListener('click', searchBranch);
if (searchCenterBtn) searchCenterBtn.addEventListener('click', searchCenter);
if (searchGroupBtn) searchGroupBtn.addEventListener('click', searchGroup);
if (searchApplicationBtn) searchApplicationBtn.addEventListener('click', searchApplication);
if (searchClientBranchBtn) searchClientBranchBtn.addEventListener('click', searchClientBranch);
if (searchClientBtn) searchClientBtn.addEventListener('click', searchClient);
if (searchProductBtn) searchProductBtn.addEventListener('click', searchProduct);
if (searchRepaymentAccountBtn) searchRepaymentAccountBtn.addEventListener('click', searchRepaymentAccount);
if (searchDonorBtn) searchDonorBtn.addEventListener('click', searchDonor);
if (searchOfficerBtn) searchOfficerBtn.addEventListener('click', searchOfficer);
if (searchSalesOfficerBtn) searchSalesOfficerBtn.addEventListener('click', searchSalesOfficer);
if (productInfoBtn) productInfoBtn.addEventListener('click', showProductRateDetails);

// Auto-lookup when branch ID is entered - directly populate description without opening modal
if (branchId) {
    branchId.addEventListener('blur', function() {
        if (this.value.trim() !== '') {
            autoPopulateBranchName(this.value.trim(), branchName, clientBranchId, clientBranchName);
        }
    });

    branchId.addEventListener('keydown', function(e) {
        if ((e.key === 'Enter' || e.key === 'Tab') && this.value.trim() !== '') {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
            autoPopulateBranchName(this.value.trim(), branchName, clientBranchId, clientBranchName);
        }
    });
}

// Auto-lookup when client branch ID is entered
if (clientBranchId) {
    clientBranchId.addEventListener('blur', function() {
        if (this.value.trim() !== '') {
            autoPopulateBranchName(this.value.trim(), clientBranchName);
        }
    });

    clientBranchId.addEventListener('keydown', function(e) {
        if ((e.key === 'Enter' || e.key === 'Tab') && this.value.trim() !== '') {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
            autoPopulateBranchName(this.value.trim(), clientBranchName);
        }
    });
}

// Auto-lookup when Group ID is entered/populated
if (groupId) {
    groupId.addEventListener('blur', function() {
        if (this.value.trim() !== '' && (!groupName.value || groupName.value.trim() === '')) {
            autoPopulateGroupName(this.value.trim());
        }
    });

    groupId.addEventListener('keydown', function(e) {
        if ((e.key === 'Enter' || e.key === 'Tab') && this.value.trim() !== '') {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
            autoPopulateGroupName(this.value.trim());
        }
    });
    
    // Observer for when groupId is programmatically set
    groupId.addEventListener('change', function() {
        if (this.value.trim() !== '' && (!groupName.value || groupName.value.trim() === '' || groupName.value === 'Group Name')) {
            autoPopulateGroupName(this.value.trim());
        }
    });
}

// Auto-lookup when Application ID is entered/populated
if (applicationId) {
    applicationId.addEventListener('blur', function() {
        if (this.value.trim() !== '' && (!applicationName.value || applicationName.value.trim() === '')) {
            autoPopulateApplicationName(this.value.trim());
        }
    });

    applicationId.addEventListener('keydown', function(e) {
        if ((e.key === 'Enter' || e.key === 'Tab') && this.value.trim() !== '') {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
            autoPopulateApplicationName(this.value.trim());
        }
    });
    
    // Observer for when applicationId is programmatically set
    applicationId.addEventListener('change', function() {
        if (this.value.trim() !== '' && (!applicationName.value || applicationName.value.trim() === '' || applicationName.value === 'Application Name')) {
            autoPopulateApplicationName(this.value.trim());
        }
    });
}

// Loan Amount - toggle has-value class for showing/hiding spinner and info button
if (loanAmount) {
    const updateLoanAmountState = () => {
        if (loanAmount.value && loanAmount.value.trim() !== '') {
            loanAmount.classList.add('has-value');
        } else {
            loanAmount.classList.remove('has-value');
        }
    };
    
    loanAmount.addEventListener('input', updateLoanAmountState);
    loanAmount.addEventListener('change', updateLoanAmountState);
    loanAmount.addEventListener('blur', updateLoanAmountState);
    
    // Initial state
    updateLoanAmountState();
}

// Collapse sidebar on form load
function collapseSidebarOnLoad() {
    console.log('collapseSidebarOnLoad called');
    const sidebar = document.getElementById('main-sidebar');
    if (sidebar) {
        // Only add if not already present (though classList.add handles that)
        if (!sidebar.classList.contains('collapsed')) {
             sidebar.classList.add('collapsed');
        }
        // Removed the aggressive loop as it might interfere with immediate user interaction
        // The CSS and HTML structure change handles the initial state better now.
    }
}

// Collapse all nav-section--card on form entry
function collapseAllSubmodules() {
    document.querySelectorAll('.nav-section--card').forEach(section => {
        const navItems = section.querySelector('.nav-items--card');
        const arrow = section.querySelector('.nav-arrow--card');
        
        section.classList.remove('expanded');
        if (navItems) {
            navItems.classList.remove('is-visible');
            navItems.hidden = true;
        }
        if (arrow) {
            arrow.setAttribute('aria-expanded', 'false');
        }
    });
}

function initSidebarNavigation() {
    console.log('initSidebarNavigation: Initializing...');
    
    // Add click handlers to all sidebar items (new enhanced style)
    const sidebarItems = document.querySelectorAll('.sidebar-item--enhanced[data-section]');
    console.log('initSidebarNavigation: Found', sidebarItems.length, 'sidebar items with data-section');
    
    sidebarItems.forEach((item, index) => {
        const sectionName = item.getAttribute('data-section');
        console.log('initSidebarNavigation: Attaching listener to item', index, '- section:', sectionName);
        
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Sidebar item clicked! Section:', sectionName);
            
            const section = this.getAttribute('data-section');
            
            // Update active state
            document.querySelectorAll('.sidebar-item--enhanced').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            // Load section
            activeSection = section;
            console.log('Calling loadSection with:', section);
            loadSection(section);
        });
    });
    
    // Add click handlers to nav headers for expanding/collapsing
    const navHeaders = document.querySelectorAll('.nav-header--card');
    console.log('initSidebarNavigation: Found', navHeaders.length, 'nav headers');
    
    navHeaders.forEach((header, index) => {
        console.log('initSidebarNavigation: Attaching listener to header', index);
        
        header.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Nav header clicked!');
            
            const sidebar = document.getElementById('main-sidebar');
            
            // If sidebar is collapsed, expand it first!
            if (sidebar && sidebar.classList.contains('collapsed')) {
                console.log('Sidebar was collapsed, expanding...');
                sidebar.classList.remove('collapsed');
            }

            const section = this.closest('.nav-section--card');
            const navItems = section ? section.querySelector('.nav-items--card') : null;
            const arrow = this.querySelector('.nav-arrow--card');
            
            console.log('Section found:', !!section, 'NavItems found:', !!navItems);
            
            if (!section) return;
            
            if (section.classList.contains('expanded')) {
                section.classList.remove('expanded');
                if (navItems) {
                    navItems.classList.remove('is-visible');
                    navItems.hidden = true;
                }
                if (arrow) arrow.setAttribute('aria-expanded', 'false');
            } else {
                // Collapse other sections for accordion effect (optional but cleaner)
                document.querySelectorAll('.nav-section--card.expanded').forEach(s => {
                    if (s !== section) {
                        s.classList.remove('expanded');
                        const items = s.querySelector('.nav-items--card');
                        const arr = s.querySelector('.nav-arrow--card');
                        if (items) {
                            items.classList.remove('is-visible');
                            items.hidden = true;
                        }
                        if (arr) arr.setAttribute('aria-expanded', 'false');
                    }
                });

                section.classList.add('expanded');
                if (navItems) {
                    navItems.classList.add('is-visible');
                    navItems.hidden = false;
                }
                if (arrow) arrow.setAttribute('aria-expanded', 'true');
            }
        });
    });
    
    console.log('initSidebarNavigation: Complete');
}


function initSectionToggles() {
    // Form section collapsible toggles
    document.querySelectorAll('[data-section-toggle]').forEach(header => {
        header.addEventListener('click', function() {
            const section = this.closest('.form-section');
            const toggleBtn = this.querySelector('.section-toggle-btn i');
            
            if (section.classList.contains('collapsed')) {
                section.classList.remove('collapsed');
            } else {
                section.classList.add('collapsed');
            }
        });
    });
}

function initSidebarToggle() {
    console.log('initSidebarToggle: Initializing...');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('main-sidebar');
    
    if (!sidebarToggle) {
        console.error('initSidebarToggle: #sidebarToggle not found!');
        return;
    }
    if (!sidebar) {
        console.error('initSidebarToggle: #main-sidebar not found!');
        return;
    }

    console.log('initSidebarToggle: Elements found. Attaching listener.');
    
    // Remove old listener if possible (not possible with anonymous functions but strict mode helps)
    // We'll use a named function for the handler to be cleaner if we wanted, but closure is fine.
    
    sidebarToggle.onclick = function(e) {
        // Stop propagation and default behavior to ensure clean event handling
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Sidebar toggle clicked. Current classes:', sidebar.classList.toString());
        
        if (sidebar.classList.contains('collapsed')) {
            console.log('Removing collapsed class...');
            sidebar.classList.remove('collapsed');
        } else {
            console.log('Adding collapsed class...');
            sidebar.classList.add('collapsed');
        }
        
        // Update aria-expanded for accessibility
        const isExpanded = !sidebar.classList.contains('collapsed');
        this.setAttribute('aria-expanded', isExpanded);
    };
    
    // Submodule search functionality
    const searchInput = document.getElementById('submoduleSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            document.querySelectorAll('.sidebar-item--enhanced').forEach(item => {
                const title = item.querySelector('.sidebar-item__title');
                if (title) {
                    const text = title.textContent.toLowerCase();
                    item.style.display = text.includes(query) ? '' : 'none';
                }
            });
        });
    }
}

// Toggle nav section (for collapsible sidebar)
window.toggleNavSection = function(header) {
    const section = header.closest('.nav-section');
    const navItems = section.querySelector('.nav-items');
    const arrow = header.querySelector('.nav-arrow');
    
    if (navItems.hidden) {
        navItems.hidden = false;
        arrow.setAttribute('aria-expanded', 'true');
    } else {
        navItems.hidden = true;
        arrow.setAttribute('aria-expanded', 'false');
    }
};

// Legacy dropdown support (keep for compatibility)
if (sectionDropdown) {
    sectionDropdown.addEventListener('change', (e) => {
        activeSection = e.target.value;
        loadSection(activeSection);
    });
}

// Listen for messages from iframe modals
window.addEventListener('message', function(event) {
    // Handle new submodule message format
    if (event.data.type === 'submoduleClosed') {
        // Close any open submodule modal
        const openModals = document.querySelectorAll('.submodule-modal.show');
        openModals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        });
        if (sectionDropdown) sectionDropdown.value = 'dataentry';
        // Re-activate Main Form in sidebar
        document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
        const mainFormItem = document.querySelector('.sidebar-item[data-section="dataentry"]');
        if (mainFormItem) mainFormItem.classList.add('active');
        return;
    }
    
    if (event.data.type === 'toggleSidebarForMaximize') {
        // Toggle sidebar collapsed state for maximize
        const sidebar = document.getElementById('main-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
        }
        return;
    }
    
    if (event.data.type === 'submoduleOpened') {
        // Submodule has opened - can be used for logging or state tracking
        console.log('Submodule opened:', event.data.source);
        return;
    }
    
    // Legacy message format support
    if (event.data.action === 'closeGuarantorModal') {
        const guarantorModalElement = document.getElementById('guarantorModal');
        const guarantorModal = bootstrap.Modal.getInstance(guarantorModalElement);
        if (guarantorModal) {
            guarantorModal.hide();
        }
        sectionDropdown.value = 'dataentry';
    } else if (event.data.action === 'closeChargeRatesModal') {
        const chargeRatesModalElement = document.getElementById('chargeRatesModal');
        const chargeRatesModal = bootstrap.Modal.getInstance(chargeRatesModalElement);
        if (chargeRatesModal) {
            chargeRatesModal.hide();
        }
        sectionDropdown.value = 'dataentry';
    } else if (event.data.action === 'closeLoanUtilizationModal') {
        const loanUtilModalElement = document.getElementById('loanUtilizationModal');
        const loanUtilModal = bootstrap.Modal.getInstance(loanUtilModalElement);
        if (loanUtilModal) {
            loanUtilModal.hide();
        }
        sectionDropdown.value = 'dataentry';
    } else if (event.data.action === 'closeCollateralModal') {
        const collateralModalElement = document.getElementById('collateralModal');
        const collateralModal = bootstrap.Modal.getInstance(collateralModalElement);
        if (collateralModal) {
            collateralModal.hide();
        }
        sectionDropdown.value = 'dataentry';
    } else if (event.data.action === 'closeDocumentModal') {
        const documentModalElement = document.getElementById('documentModal');
        const documentModal = bootstrap.Modal.getInstance(documentModalElement);
        if (documentModal) {
            documentModal.hide();
        }
        sectionDropdown.value = 'dataentry';
    } else if (event.data.action === 'closeUserDefinedFieldsModal') {
        const userFieldsModalElement = document.getElementById('userDefinedFieldsModal');
        const userFieldsModal = bootstrap.Modal.getInstance(userFieldsModalElement);
        if (userFieldsModal) {
            userFieldsModal.hide();
        }
        sectionDropdown.value = 'dataentry';
    } else if (event.data.action === 'closeManualScheduleModal') {
        const manualScheduleModalElement = document.getElementById('manualScheduleModal');
        const manualScheduleModal = bootstrap.Modal.getInstance(manualScheduleModalElement);
        if (manualScheduleModal) {
            manualScheduleModal.hide();
        }
        sectionDropdown.value = 'dataentry';
    } else if (event.data.action === 'closeRepaymentAccountsModal') {
        const repaymentAccountsModalElement = document.getElementById('repaymentAccountsModal');
        const repaymentAccountsModal = bootstrap.Modal.getInstance(repaymentAccountsModalElement);
        if (repaymentAccountsModal) {
            repaymentAccountsModal.hide();
        }
        sectionDropdown.value = 'dataentry';
    }
});

// Load section based on selection
function loadSection(section) {
    console.log('loadSection called with:', section);
    switch(section) {
        case 'guarantor':
            console.log('Opening Guarantor modal...');
            openGuarantorModal();
            break;
        case 'charge-rates':
            console.log('Opening Charge Rates modal...');
            openChargeRatesModal();
            break;
        case 'loan-utilization':
            console.log('Opening Loan Utilization modal...');
            openLoanUtilizationModal();
            break;
        case 'collateral':
            console.log('Opening Collateral modal...');
            openCollateralModal();
            break;
        case 'document':
            console.log('Opening Document modal...');
            openDocumentModal();
            break;
        case 'user-defined':
        case 'user-defined-loan':
            console.log('Opening User Defined Fields modal...');
            openUserDefinedFieldsModal();
            break;
        case 'manual-schedule':
            console.log('Opening Manual Schedule modal...');
            openManualScheduleModal();
            break;
        case 'repayment-accounts':
            console.log('Opening Repayment Accounts modal...');
            openRepaymentAccountsModal();
            break;
        case 'dataentry':
            console.log('Staying on main form (dataentry)');
            break;
        default:
            console.log('Unknown section:', section, '- staying on main form');
            // For dataentry and other sections, stay on main form
            break;
    }
}

// Open Guarantor Modal
function openGuarantorModal() {
    console.log('openGuarantorModal: Starting...');
    const guarantorModalElement = document.getElementById('guarantorModal');
    
    if (!guarantorModalElement) {
        console.error('openGuarantorModal: Modal element #guarantorModal not found!');
        showMessage('Guarantor modal not found. Please refresh the page.', 'error');
        return;
    }
    
    console.log('openGuarantorModal: Modal element found, creating Bootstrap modal...');
    const guarantorModal = new bootstrap.Modal(guarantorModalElement);
    console.log('openGuarantorModal: Showing modal...');
    guarantorModal.show();
    
    // Reset dropdown when modal is hidden
    guarantorModalElement.addEventListener('hidden.bs.modal', function () {
        if (sectionDropdown) sectionDropdown.value = 'dataentry';
    });
    console.log('openGuarantorModal: Complete');
}

// Open Charge Rates Modal
function openChargeRatesModal() {
    console.log('openChargeRatesModal: Starting...');
    const chargeRatesModalElement = document.getElementById('chargeRatesModal');
    
    if (!chargeRatesModalElement) {
        console.error('openChargeRatesModal: Modal element #chargeRatesModal not found!');
        showMessage('Charge Rates modal not found. Please refresh the page.', 'error');
        return;
    }
    
    const chargeRatesModal = new bootstrap.Modal(chargeRatesModalElement);
    chargeRatesModal.show();
    
    // Reset dropdown when modal is hidden
    chargeRatesModalElement.addEventListener('hidden.bs.modal', function () {
        if (sectionDropdown) sectionDropdown.value = 'dataentry';
    });
}

// Open Loan Utilization Modal
function openLoanUtilizationModal() {
    const loanUtilModalElement = document.getElementById('loanUtilizationModal');
    const loanUtilModal = new bootstrap.Modal(loanUtilModalElement);
    loanUtilModal.show();
    
    // Reset dropdown when modal is hidden
    loanUtilModalElement.addEventListener('hidden.bs.modal', function () {
        sectionDropdown.value = 'dataentry';
    });
}

// Function to get loan application data for child modals
// Expose to window so iframes can access it
window.getLoanApplicationData = function() {
    return {
        branchId: branchId ? branchId.value : '',
        branchName: branchName ? branchName.value : '',
        clientId: clientId ? clientId.value : '',
        clientName: clientName ? clientName.value : '',
        applicationId: applicationId ? applicationId.value : '',
        groupId: groupId ? groupId.value : '',
        groupName: groupName ? groupName.value : '',
        loanAmount: loanAmount ? loanAmount.value : '',
        productId: productId ? productId.value : '',
        productName: productName ? productName.value : '',
        accountId: repaymentAccountId ? repaymentAccountId.value : '',
        loanSeries: '' // Account series - can be populated if available in form
    };
};

// Open Collateral Modal
function openCollateralModal() {
    const collateralModalElement = document.getElementById('collateralModal');
    const collateralModal = new bootstrap.Modal(collateralModalElement);
    collateralModal.show();
    
    // Reset dropdown when modal is hidden
    collateralModalElement.addEventListener('hidden.bs.modal', function () {
        sectionDropdown.value = 'dataentry';
    });
}

// Open Document Modal
function openDocumentModal() {
    const documentModalElement = document.getElementById('documentModal');
    const documentModal = new bootstrap.Modal(documentModalElement);
    documentModal.show();
    
    // Reset dropdown when modal is hidden
    documentModalElement.addEventListener('hidden.bs.modal', function () {
        sectionDropdown.value = 'dataentry';
    });
}

// Open User Defined Fields Modal
function openUserDefinedFieldsModal() {
    const userFieldsModalElement = document.getElementById('userDefinedFieldsModal');
    const userFieldsModal = new bootstrap.Modal(userFieldsModalElement);
    userFieldsModal.show();
    
    // Reset dropdown when modal is hidden
    userFieldsModalElement.addEventListener('hidden.bs.modal', function () {
        sectionDropdown.value = 'dataentry';
    });
}

// Open Manual Schedule Modal
function openManualScheduleModal() {
    const manualScheduleModalElement = document.getElementById('manualScheduleModal');
    const manualScheduleModal = new bootstrap.Modal(manualScheduleModalElement);
    
    // Listen for modal shown event to send data to iframe
    manualScheduleModalElement.addEventListener('shown.bs.modal', function () {
        const iframe = document.getElementById('manualScheduleIframe');
        if (iframe && iframe.contentWindow) {
            // Get current loan application data
            const loanData = window.getLoanApplicationData();
            console.log('Sending data to Manual Schedule iframe:', loanData);
            
            // Send data to iframe
            iframe.contentWindow.postMessage({
                action: 'populateFromParent',
                data: loanData
            }, '*');
        }
    }, { once: true });
    
    manualScheduleModal.show();
    
    // Reset dropdown when modal is hidden
    manualScheduleModalElement.addEventListener('hidden.bs.modal', function () {
        sectionDropdown.value = 'dataentry';
    });
}

// Open Repayment Accounts Modal
function openRepaymentAccountsModal() {
    const repaymentAccountsModalElement = document.getElementById('repaymentAccountsModal');
    const repaymentAccountsModal = new bootstrap.Modal(repaymentAccountsModalElement);
    
    // Listen for modal shown event to send data to iframe
    repaymentAccountsModalElement.addEventListener('shown.bs.modal', function () {
        const iframe = document.getElementById('repaymentAccountsIframe');
        if (iframe && iframe.contentWindow) {
            // Get current loan application data
            const loanData = window.getLoanApplicationData();
            console.log('Sending data to Repayment Accounts iframe:', loanData);
            
            // Send data to iframe
            iframe.contentWindow.postMessage({
                action: 'populateFromParent',
                data: loanData
            }, '*');
        }
    }, { once: true });
    
    repaymentAccountsModal.show();
    
    // Reset dropdown when modal is hidden
    repaymentAccountsModalElement.addEventListener('hidden.bs.modal', function () {
        sectionDropdown.value = 'dataentry';
    });
}

// Calculate Effective Rate when rates change
interestRate.addEventListener('input', calculateEffectiveRate);
commissionRate.addEventListener('input', calculateEffectiveRate);
taxRate.addEventListener('input', calculateEffectiveRate);

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    console.log('[LoanApplication] DOMContentLoaded - Starting initialization...');
    
    disableEdit();
    
    // Initialize sidebar navigation
    console.log('[LoanApplication] Calling initSidebarNavigation...');
    initSidebarNavigation();
    console.log('[LoanApplication] Calling initSectionToggles...');
    initSectionToggles();
    console.log('[LoanApplication] Calling initSidebarToggle...');
    initSidebarToggle();
    
    // Collapse sidebar on form load
    console.log('[LoanApplication] Calling collapseSidebarOnLoad...');
    collapseSidebarOnLoad();
    console.log('[LoanApplication] Calling collapseAllSubmodules...');
    collapseAllSubmodules(); // Auto-collapse all submodules on form entry
    
    console.log('[LoanApplication] Sidebar initialization complete');
    
    // Load dropdowns from database
    await loadLineOfBusinessDropdown();
});

// Functions
function showMoreInfo() {
    if (!currentApplication) {
        showMessage('No application selected. Please view or add an application first.', 'warning');
        return;
    }
    showMessage('More Info feature - connect to backend', 'info');
}

function viewApplication() {
    // Check if Branch ID is provided
    if (!branchId.value || branchId.value.trim() === '') {
        showMessage('Please enter Branch ID first', 'warning');
        branchId.focus();
        return;
    }

    async function fetchApplicationData() {
        try {
            const requestData = {
                OurBranchID: branchId.value.trim(),
                OperatorID: sessionStorage.getItem('operatorId') || "web_portal"
            };

            // Only add ApplicationID if it's provided
            if (applicationId.value && applicationId.value.trim() !== '') {
                requestData.ApplicationID = applicationId.value.trim();
            } else {
                requestData.ApplicationID = "";
            }

            console.log('[viewApplication] Fetching with:', requestData);
            
            const result = await LoanApplicationService.getWFLoanApplications(requestData);
            
            console.log('[viewApplication] API Response:', result);

            if (result.success) {
                // Backend returns Details02 array with application data
                const applications = result.data.Details02 || result.data.Details || result.data;
                
                console.log('[viewApplication] Applications found:', applications);
                
                if (applications && applications.length > 0) {
                    // Load the first application or show list to select
                    loadApplicationData(applications[0]);
                    currentApplication = applications[0];
                    showMessage('Application loaded successfully', 'success');
                } else {
                    showMessage('No applications found', 'info');
                }
            } else {
                // Handle specific error codes
                if (result.code === '091') {
                    showMessage('Application ID not found. Please check and try again.', 'warning');
                } else {
                    showMessage(result.message || 'Failed to load applications', 'error');
                }
            }
        } catch (error) {
            console.error('Error loading application:', error);
            showMessage('Error loading application: ' + error.message, 'error');
        }
    }
    
    fetchApplicationData();
}

function enableAdd() {
    isEditMode = true;
    clearForm();
    enableFormFields();
    
    // Disable Application ID since it's auto-generated
    applicationId.setAttribute('readonly', true);
    applicationId.disabled = true;
    applicationId.value = ''; // Clear any existing value
    applicationId.placeholder = 'Auto-generated';
    
    if (viewBtn) viewBtn.disabled = true;
    if (addBtn) addBtn.disabled = true;
    if (editBtn) editBtn.disabled = true;
    if (deleteBtn) deleteBtn.disabled = true;
    if (saveBtn) saveBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
    
    showMessage('Add new loan application', 'info');
}

function enableEdit() {
    if (!currentApplication) {
        showMessage('No application selected. Please view an application first.', 'warning');
        return;
    }
    
    isEditMode = true;
    enableFormFields();
    
    if (viewBtn) viewBtn.disabled = true;
    if (addBtn) addBtn.disabled = true;
    if (editBtn) editBtn.disabled = true;
    if (deleteBtn) deleteBtn.disabled = true;
    if (saveBtn) saveBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
    
    showMessage('Edit mode enabled', 'info');
}

function deleteApplication() {
    if (!currentApplication) {
        showMessage('No application selected. Please view an application first.', 'warning');
        return;
    }
    
    // Open the Custom Rejection Modal
    const rejectModalEl = document.getElementById('rejectLoanModal');
    if (rejectModalEl) {
        const appIdToDelete = applicationId.value.trim();
        
        // Reset inputs
        const reasonInput = document.getElementById('rejectionReasonInput');
        const confirmInput = document.getElementById('confirmDeleteInput');
        const confirmBtn = document.getElementById('confirmRejectBtn');
        const appIdDisplay = document.getElementById('deleteAppIdDisplay');
        const confirmText = document.getElementById('confirmDeleteText');
        
        if (reasonInput) reasonInput.value = '';
        if (confirmInput) confirmInput.value = '';
        if (confirmBtn) confirmBtn.disabled = true;
        if (appIdDisplay) appIdDisplay.textContent = appIdToDelete;
        if (confirmText) confirmText.textContent = appIdToDelete;
        
        // Remove validation classes
        reasonInput?.classList.remove('is-invalid');
        confirmInput?.classList.remove('is-invalid');
        
        // Show modal
        const rejectModal = new bootstrap.Modal(rejectModalEl);
        rejectModal.show();
        
        // Validation function
        const validateInputs = () => {
            const reason = reasonInput?.value.trim() || '';
            const confirmValue = confirmInput?.value.trim() || '';
            const isValid = reason.length > 0 && confirmValue === appIdToDelete;
            if (confirmBtn) confirmBtn.disabled = !isValid;
        };
        
        // Add input listeners for real-time validation
        reasonInput?.addEventListener('input', validateInputs);
        confirmInput?.addEventListener('input', validateInputs);
        
        // Handle confirm button click
        // Remove old listeners to prevent multiple clicks
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
        newBtn.disabled = true;
        
        // Re-add validation to new button context
        const newValidate = () => {
            const reason = reasonInput?.value.trim() || '';
            const confirmValue = confirmInput?.value.trim() || '';
            const isValid = reason.length > 0 && confirmValue === appIdToDelete;
            newBtn.disabled = !isValid;
        };
        reasonInput?.addEventListener('input', newValidate);
        confirmInput?.addEventListener('input', newValidate);
        
        newBtn.addEventListener('click', function() {
            const rejectionReason = reasonInput?.value.trim() || '';
            const confirmValue = confirmInput?.value.trim() || '';
            
            let hasError = false;
            
            // Validate reason
            if (!rejectionReason) {
                reasonInput?.classList.add('is-invalid');
                hasError = true;
            } else {
                reasonInput?.classList.remove('is-invalid');
            }
            
            // Validate confirmation text
            if (confirmValue !== appIdToDelete) {
                confirmInput?.classList.add('is-invalid');
                hasError = true;
            } else {
                confirmInput?.classList.remove('is-invalid');
            }
            
            if (hasError) {
                return;
            }
            
            // Disable button to prevent double-click
            newBtn.disabled = true;
            newBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Deleting...';
            
            // Close modal
            rejectModal.hide();
            
            // Proceed with deletion logic
            performDeletion(rejectionReason);
        });
        
        // Clean up listeners when modal is hidden
        rejectModalEl.addEventListener('hidden.bs.modal', function onHidden() {
            reasonInput?.removeEventListener('input', newValidate);
            confirmInput?.removeEventListener('input', newValidate);
            rejectModalEl.removeEventListener('hidden.bs.modal', onHidden);
        }, { once: true });
        
    } else {
        // Fallback if modal is missing (should not happen)
        showMessage('Delete modal not found. Please refresh the page.', 'error');
    }
}

async function performDeletion(rejectionReason) {
    // Store ApplicationID before clearing
    const deletedAppId = applicationId.value;
    
    try {
        // Determine IsIndividual based on GroupID existence
        const isGroup = groupId && groupId.value;
        
        // Get operator from session or default
        const operatorId = sessionStorage.getItem('operatorID') || 'web_portal';
        
        // Helper for date - Use ISO format (YYYY-MM-DD HH:MM:SS) which is safer for SQL Server conversions
        const now = new Date();
        const rejectedOn = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + ' ' +
            String(now.getHours()).padStart(2, '0') + ':' +
            String(now.getMinutes()).padStart(2, '0') + ':' +
            String(now.getSeconds()).padStart(2, '0');

        console.log('Performing deletion with payload:', {
            OurBranchID: branchId.value,
            ApplicationID: deletedAppId,
            RejectedBy: operatorId,
            RejectedOn: rejectedOn,
            RejectedReason: rejectionReason,
            IsIndividual: isGroup ? 0 : 1,
            TypeOfApplication: 'N',
            IsReverseFee: 0
        });

        const result = await LoanApplicationService.deleteLoanApplication({
            OurBranchID: branchId.value,
            ApplicationID: deletedAppId,
            RejectedBy: operatorId,
            RejectedOn: rejectedOn,
            RejectedReason: rejectionReason,
            IsIndividual: isGroup ? 0 : 1,
            TypeOfApplication: 'N', // N = New, R = Renewal, T = Top-up
            IsReverseFee: 0
        });

        console.log('Deletion result:', result);

        // Check for success - handle different response patterns
        // The SP may return success even with timeout, and the data shows REJ status
        const isSuccess = result.success || 
                          result.code === '000' || 
                          result.code === '00' ||
                          result.Status === '000' ||
                          result.Status === '00';
        
        // Check if message indicates "another user" error - this is a false positive for deletions
        const isAnotherUserError = result.message && (
            result.message.toLowerCase().includes('another user') ||
            result.message.toLowerCase().includes('edit has been done')
        );
        
        if (isSuccess || isAnotherUserError) {
            // If we got "another user" message but the record shows REJ status, it's actually deleted
            clearForm();
            currentApplication = null;
            showMessage(`Application ${deletedAppId} has been successfully deleted.`, 'success');
        } else {
            // Show detailed error message
            const errorMsg = result.message || result.Message || 'Failed to delete application';
            showMessage(`Delete failed: ${errorMsg}`, 'error');
        }
    } catch (error) {
        console.error('Error deleting application:', error);
        
        // Check for timeout - deletion may have succeeded anyway
        const isTimeout = error.message && (
            error.message.toLowerCase().includes('timeout') ||
            error.message.toLowerCase().includes('timed out')
        );
        
        if (isTimeout) {
            clearForm();
            currentApplication = null;
            showMessage(`Application ${deletedAppId} deletion submitted. Please verify in the application list.`, 'success');
        } else {
            showMessage('Error deleting application: ' + error.message, 'error');
        }
    }
}

async function saveApplication() {
    if (!validateForm()) {
        return;
    }

    // Collect loan details for modal display
    const loanDetails = {
        branchName: branchName.value || branchId.value,
        clientName: clientName.value || clientId.value,
        productName: productName.value || productId.value,
        loanAmount: loanAmount.value,
        term: term.value,
        interestRate: interestRate.value
    };

    // Use the specialized Submit Loan modal with Application ID display and loan details
    const confirmed = await showSubmitLoanModal({
        applicationId: currentApplication ? applicationId.value : '',
        isEdit: !!currentApplication,
        loanDetails: loanDetails
    });
    
    if (!confirmed) {
        return;
    }

    // Helper to get raw number (strip currency symbols/commas)
    const getRawNumber = (val) => {
        if (!val) return 0;
        return typeof val === 'string' ? parseFloat(val.replace(/[^\d.-]/g, '')) : val;
    };

    // Helper to format date for SQL (YYYY-MM-DD HH:MM:SS)
    const getSqlDate = (dateVal) => {
        const d = dateVal ? new Date(dateVal) : new Date();
        if (isNaN(d.getTime())) {
            const now = new Date();
            return now.toISOString().slice(0, 19).replace('T', ' ');
        }
        return d.toISOString().slice(0, 19).replace('T', ' ');
    };

    // Determine Loan Type based on Group ID
    const loanTypeID = groupId.value ? 'GRP' : 'IND'; 
    
    // Construct the payload for dbo.p_AddEditWFLoanApplications
    const applicationData = {
        // IDs
        OurBranchID: branchId.value.trim(), 
        ApplicationID: currentApplication ? applicationId.value.trim() : "",
        ApplicationDate: getSqlDate(applicationDate.value),
        WFAdvTypeID: "LN", // Standard Loan Type
        IsExistingClient: "1", 
        ClientID: clientId.value.trim(),
        ProductID: productId.value.trim(),
        RepaymentAccountID: repaymentAccountId.value.trim(),
        PurposeCodeID: loanPurpose.value,
        CreditOfficerID: officerId.value,
        SalesOfficerID: salesOfficerId ? salesOfficerId.value : "", // Fixed: Add SalesOfficerID

        // Financials
        LoanAmount: String(getRawNumber(loanAmount.value)),
        LoanTerm: String(parseInt(term.value) || 0),
        LoanPeriodID: "MM", // Assumed 'Months'
        DisbursementDate: getSqlDate(disbursementDate.value),
        BusinessLineID: lineOfBusiness.value,
        AccountClassID: "LAA",
        FileNumber: fileNumber.value,
        InterestRate: String(getRawNumber(interestRate.value)),
        BusinessDetails: JSON.stringify({
            MonthlyProfit: getRawNumber(monthlyProfit.value),
            MonthlyTurnOver: getRawNumber(monthlyTurnOver.value),
            TotalAssets: getRawNumber(totalAssets.value),
            BusinessLocation: businessLocation.value,
            BusinessStatus: businessStatus.value,
            StartUpCapitalCollatelar: startupCapital.value,
            CollateralType: collateralType.value,
            LoanLimitType: loanLimitType.value
        }),
        CommissionRate: String(getRawNumber(commissionRate.value)),
        TaxRate: String(getRawNumber(taxRate.value)),
        EffectiveRate: String(getRawNumber(effectiveRate.value)),
        Penalty: "0",
        
        // Audit
        CreatedBy: "web_portal", 
        CreatedOn: getSqlDate(),
        ModifiedBy: "web_portal", 
        ModifiedOn: getSqlDate(),
        
        // Logic
        LoanTypeID: loanTypeID,
        UpdateCount: "1", 
        ProductEffective: String(getRawNumber(effectiveRate.value)),
        DonorID: donorId.value,
        GroupID: centerId.value || "",
        SubGroupID: groupId.value || "", 
        LoanSchemeID: "", 
        IsOutPutRequired: "1" 
    };
    
    async function saveApp() {
        try {
            console.log('[SaveApplication] Saving Application:', applicationData);
            console.log('[SaveApplication] Is new application:', !currentApplication);
            
            // Track if this is a new application BEFORE the API call
            const isNewApplication = !currentApplication;
            
            // Use the unified create/update method which calls p_AddEditWFLoanApplications
            const result = isNewApplication 
                ? await LoanApplicationService.createLoanApplication(applicationData)
                : await LoanApplicationService.updateLoanApplication(applicationData);

            console.log('[SaveApplication] API Result:', result);
            console.log('[SaveApplication] Result data:', result.data);
            console.log('[SaveApplication] Result Details:', result.Details);

            if (result.success) {
                disableEdit();
                
                // Extract Returned ApplicationID - check multiple possible locations
                console.log('[SaveApplication] Extracting ApplicationID from response...');
                console.log('[SaveApplication] result.data:', result.data);
                console.log('[SaveApplication] result.Details:', result.Details);
                console.log('[SaveApplication] result.data.Details02:', result.data?.Details02);
                
                let newAppId = null;
                
                // Try different response structures
                // Check result.Details first (direct on result object)
                if (result.Details && result.Details.length > 0) {
                    let rawAppId = result.Details[0].ApplicationID || result.Details[0].Value;
                    // Handle format like "0603165028:20APPR:1:_:0:Appraisal:_" - extract just the ID
                    if (rawAppId && rawAppId.includes(':')) {
                        newAppId = rawAppId.split(':')[0];
                        console.log('[SaveApplication] Extracted AppId from Details (parsed):', newAppId);
                    } else {
                        newAppId = rawAppId;
                        console.log('[SaveApplication] Found AppId in Details:', newAppId);
                    }
                }
                // Check if result.data is an array
                else if (Array.isArray(result.data) && result.data.length > 0) {
                    let rawAppId = result.data[0].ApplicationID || result.data[0].Value;
                    if (rawAppId && rawAppId.includes(':')) {
                        newAppId = rawAppId.split(':')[0];
                        console.log('[SaveApplication] Extracted AppId from data array (parsed):', newAppId);
                    } else {
                        newAppId = rawAppId;
                        console.log('[SaveApplication] Found AppId in data array:', newAppId);
                    }
                }
                // Check result.data.Details02
                else if (result.data?.Details02 && result.data.Details02.length > 0) {
                    let rawAppId = result.data.Details02[0].ApplicationID || result.data.Details02[0].Value;
                    if (rawAppId && rawAppId.includes(':')) {
                        newAppId = rawAppId.split(':')[0];
                    } else {
                        newAppId = rawAppId;
                    }
                    console.log('[SaveApplication] Found AppId in Details02:', newAppId);
                }
                // Check result.data.Details
                else if (result.data?.Details && result.data.Details.length > 0) {
                    let rawAppId = result.data.Details[0].ApplicationID || result.data.Details[0].Value;
                    if (rawAppId && rawAppId.includes(':')) {
                        newAppId = rawAppId.split(':')[0];
                    } else {
                        newAppId = rawAppId;
                    }
                    console.log('[SaveApplication] Found AppId in data.Details:', newAppId);
                }
                // Check result.data.ApplicationID directly
                else if (result.data?.ApplicationID) {
                    let rawAppId = result.data.ApplicationID;
                    if (rawAppId && rawAppId.includes(':')) {
                        newAppId = rawAppId.split(':')[0];
                    } else {
                        newAppId = rawAppId;
                    }
                    console.log('[SaveApplication] Found AppId in data.ApplicationID:', newAppId);
                }
                // Check result.ApplicationID directly
                else if (result.ApplicationID) {
                    let rawAppId = result.ApplicationID;
                    if (rawAppId && rawAppId.includes(':')) {
                        newAppId = rawAppId.split(':')[0];
                    } else {
                        newAppId = rawAppId;
                    }
                    console.log('[SaveApplication] Found AppId in result.ApplicationID:', newAppId);
                }
                
                console.log('[SaveApplication] Final extracted ApplicationID:', newAppId);

                if (isNewApplication) {
                    // NEW APPLICATION - need to get the ApplicationID
                    if (newAppId) {
                        applicationId.value = newAppId;
                        applicationData.ApplicationID = newAppId;
                        currentApplication = applicationData;
                        
                        // Show success modal with the new Application ID
                        await showSuccessLoanModal({
                            applicationId: newAppId,
                            loanDetails: loanDetails
                        });
                    } else {
                        // API didn't return ApplicationID - try to fetch the latest
                        console.log('[SaveApplication] No ApplicationID in response, fetching latest...');
                        showMessage('Processing... Retrieving new Application ID...', 'info');
                        
                        try {
                            // Wait for database to commit
                            await new Promise(resolve => setTimeout(resolve, 1500));
                            
                            // Fetch the latest applications for this branch
                            const latestResult = await LoanApplicationService.getLatestApplicationID(branchId.value.trim());
                            console.log('[SaveApplication] Latest applications result:', latestResult);
                            
                            if (latestResult.success && latestResult.Details && latestResult.Details.length > 0) {
                                // Sort by ApplicationID descending (newest first)
                                const apps = latestResult.Details.sort((a, b) => {
                                    return (b.ApplicationID || '').localeCompare(a.ApplicationID || '');
                                });
                                
                                const latestAppId = apps[0]?.ApplicationID;
                                console.log('[SaveApplication] Retrieved latest ApplicationID:', latestAppId);
                                
                                if (latestAppId) {
                                    applicationId.value = latestAppId;
                                    applicationData.ApplicationID = latestAppId;
                                    currentApplication = applicationData;
                                    
                                    // Show success modal with the retrieved Application ID
                                    await showSuccessLoanModal({
                                        applicationId: latestAppId,
                                        loanDetails: loanDetails
                                    });
                                } else {
                                    showMessage('Loan application submitted successfully. Please check application list for your new ID.', 'success');
                                    clearFormKeepBranch();
                                }
                            } else {
                                showMessage('Loan application submitted successfully. Please check application list for your new ID.', 'success');
                                clearFormKeepBranch();
                            }
                        } catch (fetchError) {
                            console.error('[SaveApplication] Error fetching latest ApplicationID:', fetchError);
                            showMessage('Loan application submitted successfully. Please check application list for your new ID.', 'success');
                            clearFormKeepBranch();
                        }
                    }
                } else {
                    // UPDATE - show message and clear form
                    currentApplication = applicationData;
                    showMessage('Application saved successfully', 'success');
                    clearFormKeepBranch();
                }
                
            } else {
                // Check if the error is a timeout - the data may have been saved anyway
                const isTimeout = result.message && (
                    result.message.toLowerCase().includes('timeout') ||
                    result.message.toLowerCase().includes('timed out') ||
                    result.code === '091'
                );
                
                if (isTimeout && !currentApplication) {
                    // Timeout on new application - try to fetch the latest application ID
                    console.log('Timeout occurred, attempting to fetch latest application ID...');
                    showMessage('Processing... Verifying loan application...', 'info');
                    
                    try {
                        // Wait a moment for the database to commit
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        // Fetch the latest applications for this branch
                        const latestResult = await LoanApplicationService.getLatestApplicationID(branchId.value.trim());
                        
                        if (latestResult.success && latestResult.Details && latestResult.Details.length > 0) {
                            // Sort by ApplicationID descending (newest first)
                            const apps = latestResult.Details.sort((a, b) => {
                                return (b.ApplicationID || '').localeCompare(a.ApplicationID || '');
                            });
                            
                            const latestApp = apps[0];
                            const latestAppId = latestApp.ApplicationID;
                            
                            if (latestAppId) {
                                applicationId.value = latestAppId;
                                applicationData.ApplicationID = latestAppId;
                                currentApplication = applicationData;
                                disableEdit();
                                
                                // Show success modal with the retrieved Application ID
                                await showSuccessLoanModal({
                                    applicationId: latestAppId,
                                    loanDetails: loanDetails
                                });
                                console.log('Retrieved latest Application ID:', latestAppId);
                                return;
                            }
                        }
                        
                        // If we couldn't fetch the ID, still show a success message
                        disableEdit();
                        currentApplication = applicationData;
                        showMessage('Loan application submitted. Please check the application list for your new application ID.', 'success');
                        clearFormKeepBranch();
                        
                    } catch (fetchError) {
                        console.error('Error fetching latest application ID:', fetchError);
                        // Still show success since the timeout indicates data was likely saved
                        disableEdit();
                        currentApplication = applicationData;
                        showMessage('Loan application submitted. Please check the application list for your new application ID.', 'success');
                        clearFormKeepBranch();
                    }
                } else {
                    showMessage(result.message || 'Failed to save application', 'error');
                }
            }
        } catch (error) {
            console.error('Error saving application:', error);
            
            // Check if the error is a timeout
            const isTimeout = error.message && (
                error.message.toLowerCase().includes('timeout') ||
                error.message.toLowerCase().includes('timed out')
            );
            
            if (isTimeout && !currentApplication) {
                // Timeout on new application - try to fetch the latest application ID
                console.log('Timeout exception occurred, attempting to fetch latest application ID...');
                showMessage('Processing... Verifying loan application...', 'info');
                
                try {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    const latestResult = await LoanApplicationService.getLatestApplicationID(branchId.value.trim());
                    
                    if (latestResult.success && latestResult.Details && latestResult.Details.length > 0) {
                        const apps = latestResult.Details.sort((a, b) => {
                            return (b.ApplicationID || '').localeCompare(a.ApplicationID || '');
                        });
                        
                        const latestApp = apps[0];
                        const latestAppId = latestApp.ApplicationID;
                        
                        if (latestAppId) {
                            applicationId.value = latestAppId;
                            applicationData.ApplicationID = latestAppId;
                            currentApplication = applicationData;
                            disableEdit();
                            
                            showMessage(`Loan applied successfully! Application ID: ${latestAppId}`, 'success');
                            console.log('Retrieved latest Application ID:', latestAppId);
                            return;
                        }
                    }
                    
                    disableEdit();
                    currentApplication = applicationData;
                    showMessage('Loan application submitted. Please check the application list for your new application ID.', 'success');
                    
                } catch (fetchError) {
                    console.error('Error fetching latest application ID:', fetchError);
                    disableEdit();
                    currentApplication = applicationData;
                    showMessage('Loan application submitted. Please check the application list for your new application ID.', 'success');
                }
            } else {
                showMessage('Error saving application: ' + error.message, 'error');
            }
        }
    }
    
    saveApp();
}

async function cancelOperation() {
    // If in edit mode, ask for confirmation before discarding changes
    if (isEditMode) {
        const confirmed = await showConfirmModal({
            title: 'Discard Changes',
            heading: 'Unsaved Changes',
            message: 'You have unsaved changes. Are you sure you want to discard them?',
            confirmText: 'Discard Changes',
            type: 'warning',
            icon: 'bi-exclamation-triangle-fill'
        });
        
        if (confirmed) {
            disableEdit();
            clearForm();
            currentApplication = null;
            showMessage('Changes discarded', 'info');
        }
    } else {
        // Not in edit mode - just clear the form and reset
        clearForm();
        currentApplication = null;
        
        // Reset button states
        if (viewBtn) viewBtn.disabled = false;
        if (addBtn) addBtn.disabled = false;
        if (editBtn) editBtn.disabled = true;
        if (deleteBtn) deleteBtn.disabled = true;
        if (saveBtn) saveBtn.disabled = true;
        if (cancelBtn) cancelBtn.disabled = false;
        
        showMessage('Form cleared', 'info');
    }
}

async function alterApplication() {
    if (!currentApplication) {
        showMessage('No application selected. Please view an application first.', 'warning');
        return;
    }
    
    const confirmed = await showConfirmModal({
        title: 'Alter Application',
        heading: 'Alter Loan Application',
        message: 'Are you sure you want to alter this loan application? This will modify the application status.',
        confirmText: 'Alter Application',
        type: 'info',
        icon: 'bi-pencil-square'
    });
    
    if (confirmed) {
        try {
            const result = await LoanApplicationService.alterLoanApplication({
                ApplicationID: applicationId.value,
                OurBranchID: branchId.value,
                OperatorID: sessionStorage.getItem('operatorID') || "web_portal"
            });

            if (result.success || result.code === '000') {
                showMessage('Application altered successfully', 'success');
                // Reload application data
                viewApplication();
            } else {
                showMessage(result.message || 'Failed to alter application', 'error');
            }
        } catch (error) {
            console.error('Error altering application:', error);
            showMessage('Error altering application: ' + error.message, 'error');
        }
    }
}

async function updateApplication() {
    if (!currentApplication) {
        showMessage('No application selected. Please view an application first.', 'warning');
        return;
    }
    
    const confirmed = await showConfirmModal({
        title: 'Update Application',
        heading: 'Update Loan Application',
        message: 'Are you sure you want to update this loan application with the current changes?',
        confirmText: 'Update Application',
        type: 'primary',
        icon: 'bi-arrow-repeat'
    });
    
    if (confirmed) {
        // This uses the same logic as save for update
        saveApplication();
    }
}

function enableFormFields() {
    // Enable all input fields except readonly ones
    const inputs = document.querySelectorAll('.form-input, .form-input-segment-id, .form-input-segment-name');
    inputs.forEach(input => {
        if (input.id !== 'effectiveRate' && input.id !== 'applicationStatus' && 
            !input.id.includes('Name') && input.id !== 'branchId' && input.id !== 'clientBranchId') {
            input.removeAttribute('readonly');
            input.disabled = false;
        }
    });
}

function disableEdit() {
    isEditMode = false;
    
    // Disable all input fields
    const inputs = document.querySelectorAll('.form-input, .form-input-segment-id, .form-input-segment-name');
    inputs.forEach(input => {
        input.setAttribute('readonly', true);
    });
    
    // Reset Application ID field state (in case it was in Add mode)
    applicationId.disabled = false;
    applicationId.placeholder = 'ID';
    
    if (viewBtn) viewBtn.disabled = false;
    if (addBtn) addBtn.disabled = false;
    if (editBtn) editBtn.disabled = false;
    if (deleteBtn) deleteBtn.disabled = false;
    if (saveBtn) saveBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
}

function validateForm() {
    // Mandatory Field Validation
    if (!branchId.value.trim()) {
        showMessage('Please select a Branch (OurBranchID is mandatory)', 'error');
        branchId.focus();
        return false;
    }

    if (!clientId.value.trim()) {
        showMessage('Please select a Client', 'error');
        clientId.focus();
        return false;
    }
    
    if (!productId.value.trim()) {
        showMessage('Please select a Product', 'error');
        productId.focus();
        return false;
    }
    
    if (!loanAmount.value || parseFloat(loanAmount.value) <= 0) {
        showMessage('Please enter a valid Loan Amount', 'error');
        loanAmount.focus();
        return false;
    }
    
    if (!term.value || parseInt(term.value) <= 0) {
        showMessage('Please enter a valid Term', 'error');
        term.focus();
        return false;
    }

    if (!interestRate.value || parseFloat(interestRate.value) < 0) {
        showMessage('Please enter a valid Interest Rate', 'error');
        interestRate.focus();
        return false;
    }

    // Check optional dates if provided
    if (applicationDate.value && isNaN(Date.parse(applicationDate.value))) {
         showMessage('Invalid Application Date', 'error');
         return false;
    }
    
    return true;
}

function calculateEffectiveRate() {
    const interest = parseFloat(interestRate.value) || 0;
    const commission = parseFloat(commissionRate.value) || 0;
    const tax = parseFloat(taxRate.value) || 0;
    
    const effective = interest + commission + tax;
    effectiveRate.value = effective.toFixed(2);
}

// NOTE: loadSection function is defined earlier in this file (around line 1017)
// This duplicate has been removed to avoid redefinition errors

function closeAllModals() {
    // Close Guarantor Modal
    const guarantorModalElement = document.getElementById('guarantorModal');
    const guarantorModal = bootstrap.Modal.getInstance(guarantorModalElement);
    if (guarantorModal) {
        guarantorModal.hide();
    }
    
    // Close Charge Rates Modal
    const chargeRatesModalElement = document.getElementById('chargeRatesModal');
    const chargeRatesModal = bootstrap.Modal.getInstance(chargeRatesModalElement);
    if (chargeRatesModal) {
        chargeRatesModal.hide();
    }
    
    // Close Loan Utilization Modal
    const loanUtilModalElement = document.getElementById('loanUtilizationModal');
    const loanUtilModal = bootstrap.Modal.getInstance(loanUtilModalElement);
    if (loanUtilModal) {
        loanUtilModal.hide();
    }
    
    // Close Collateral Modal
    const collateralModalElement = document.getElementById('collateralModal');
    const collateralModal = bootstrap.Modal.getInstance(collateralModalElement);
    if (collateralModal) {
        collateralModal.hide();
    }
    
    // Close Document Modal
    const documentModalElement = document.getElementById('documentModal');
    const documentModal = bootstrap.Modal.getInstance(documentModalElement);
    if (documentModal) {
        documentModal.hide();
    }
    
    // Close User Defined Fields Modal
    const userFieldsModalElement = document.getElementById('userDefinedFieldsModal');
    const userFieldsModal = bootstrap.Modal.getInstance(userFieldsModalElement);
    if (userFieldsModal) {
        userFieldsModal.hide();
    }
    
    // Close Manual Schedule Modal
    const manualScheduleModalElement = document.getElementById('manualScheduleModal');
    const manualScheduleModal = bootstrap.Modal.getInstance(manualScheduleModalElement);
    if (manualScheduleModal) {
        manualScheduleModal.hide();
    }
}

function clearForm() {
    // Reset Application ID field state first
    applicationId.disabled = false;
    applicationId.placeholder = 'ID';
    
    centerId.value = '';
    centerName.value = '';
    groupId.value = '';
    applicationId.value = '';
    applicationName.value = '';
    applicationDate.value = new Date().toISOString().split('T')[0];
    clientId.value = '';
    clientName.value = '';
    productId.value = '';
    productName.value = '';
    repaymentAccountId.value = '';
    repaymentAccountName.value = '';
    donorId.value = '';
    donorName.value = '';
    lineOfBusiness.value = '';
    loanPurpose.value = '';
    officerId.value = '';
    officerName.value = '';
    loanAmount.value = '';
    currencyId.value = '';
    term.value = '';
    interestRate.value = '';
    commissionRate.value = '';
    taxRate.value = '';
    effectiveRate.value = '';
    disbursementDate.value = '';
    monthlyProfit.value = '';
    monthlyTurnOver.value = '';
    totalAssets.value = '';
    businessLocation.value = '';
    businessStatus.value = '';
    startupCapital.value = '';
    collateralType.value = '';
    spread.value = '';
    loanLimitType.value = '';
    fileNumber.value = '';
    applicationStatus.value = '';
    salesOfficerId.value = '';
    salesOfficerName.value = '';
    
    currentApplication = null;
}

/**
 * Clear form but keep Branch ID and Client Branch ID
 * Used by the Clear Form button
 */
function clearFormKeepBranch() {
    // Store current branch values
    const currentBranchId = branchId.value;
    const currentBranchName = branchName.value;
    const currentClientBranchId = clientBranchId.value;
    const currentClientBranchName = clientBranchName.value;
    
    // Reset Application ID field state first
    applicationId.disabled = false;
    applicationId.placeholder = 'ID';
    
    // Clear all fields except branch
    centerId.value = '';
    centerName.value = '';
    groupId.value = '';
    applicationId.value = '';
    applicationName.value = '';
    applicationDate.value = new Date().toISOString().split('T')[0];
    clientId.value = '';
    clientName.value = '';
    productId.value = '';
    productName.value = '';
    repaymentAccountId.value = '';
    repaymentAccountName.value = '';
    donorId.value = '';
    donorName.value = '';
    lineOfBusiness.value = '';
    loanPurpose.value = '';
    officerId.value = '';
    officerName.value = '';
    loanAmount.value = '';
    currencyId.value = '';
    term.value = '';
    interestRate.value = '';
    commissionRate.value = '';
    taxRate.value = '';
    effectiveRate.value = '';
    disbursementDate.value = '';
    monthlyProfit.value = '';
    monthlyTurnOver.value = '';
    totalAssets.value = '';
    businessLocation.value = '';
    businessStatus.value = '';
    startupCapital.value = '';
    collateralType.value = '';
    spread.value = '';
    loanLimitType.value = '';
    fileNumber.value = '';
    applicationStatus.value = '';
    salesOfficerId.value = '';
    salesOfficerName.value = '';
    
    // Restore branch values
    branchId.value = currentBranchId;
    branchName.value = currentBranchName;
    clientBranchId.value = currentClientBranchId;
    clientBranchName.value = currentClientBranchName;
    
    currentApplication = null;
    
    showMessage('Form cleared. Branch ID retained.', 'info');
}

function loadApplicationData(data) {
    console.log('[loadApplicationData] Raw data from API:', data);
    
    // Helper function to safely set value
    const setValue = (element, value) => {
        if (element) {
            element.value = value || '';
        }
    };
    
    // Populate form with application data from backend response
    setValue(branchId, data.OurBranchID || data.BranchID);
    setValue(branchName, ''); // Will be populated by branch lookup
    
    setValue(centerId, data.CenterID || ''); 
    setValue(centerName, data.CenterName || data.GroupName); // GroupName maps to center name in some cases
    
    setValue(groupId, data.GroupID);
    setValue(groupName, data.GroupName);
    
    setValue(applicationId, data.ApplicationID);
    setValue(applicationName, data.ProductName); // ProductName can be used as description

    
    // Format date for input field (YYYY-MM-DD)
    if (applicationDate) {
        if (data.ApplicationDate) {
            const appDate = new Date(data.ApplicationDate);
            applicationDate.value = appDate.toISOString().split('T')[0];
        } else {
            applicationDate.value = '';
        }
    }
    
    // Client and Product Details
    setValue(clientBranchId, data.ClientBranchID || data.OurBranchID);
    setValue(clientBranchName, data.ClientBranchName || ''); // Will be populated by branch lookup
    
    setValue(clientId, data.ClientID);
    setValue(clientName, data.ClientName || ''); // Will be populated by client lookup
    
    setValue(productId, data.ProductID);
    setValue(productName, data.ProductName);
    
    setValue(repaymentAccountId, data.RepaymentAccountID || data.MainRepaymentAccountID);
    setValue(repaymentAccountName, data.RepaymentAccountName);
    
    setValue(donorId, data.DonorID);
    setValue(donorName, data.DonorName);
    
    // Loan Details
    setValue(lineOfBusiness, data.BusinessLineID || data.LineOfBusinessID);
    setValue(loanPurpose, data.PurposeCodeID || data.LoanPurposeID);
    
    setValue(officerId, data.CreditOfficerID || data.OfficerID);
    setValue(officerName, data.CreditOfficerName || data.OfficerName);
    
    setValue(loanAmount, data.LoanAmount || data.Amount);
    setValue(currencyId, data.CurrencyID || 'ETB');
    
    setValue(term, data.LoanTerm || data.Term);
    setValue(termPeriod, data.LoanPeriodID || 'M'); // Default to months
    
    // Use helper for numeric fields that can be 0 (should display 0, not empty)
    const getNumericValue = (val) => (val !== null && val !== undefined && val !== '') ? val : '';
    
    setValue(interestRate, getNumericValue(data.InterestRate) || getNumericValue(data.EffectiveRate));
    setValue(commissionRate, getNumericValue(data.CommissionRate));
    setValue(taxRate, getNumericValue(data.TaxRate));
    setValue(effectiveRate, getNumericValue(data.EffectiveRate));
    setValue(spread, getNumericValue(data.Spread));
    setValue(fileNumber, data.FileNumber);
    setValue(applicationStatus, data.WFAppStatus || data.ApplicationStatus || data.Status);
    setValue(salesOfficerId, data.SalesOfficerID);

    
    // Format disbursement date
    if (disbursementDate) {
        if (data.DisbursementDate) {
            const disbDate = new Date(data.DisbursementDate);
            disbursementDate.value = disbDate.toISOString().split('T')[0];
        } else {
            disbursementDate.value = '';
        }
    }
    
    // Business Details - can be either JSON string or object
    if (data.BusinessDetails) {
        try {
            // Handle case where it's already an object (not stringified)
            const businessDetails = typeof data.BusinessDetails === 'object' 
                ? data.BusinessDetails 
                : JSON.parse(data.BusinessDetails);
            
            // Use helper for numeric fields that can be 0
            const getNum = (val) => (val !== null && val !== undefined && val !== '') ? val : '';
            
            setValue(monthlyProfit, getNum(businessDetails.MonthlyProfit));
            setValue(monthlyTurnOver, getNum(businessDetails.MonthlyTurnOver));
            setValue(totalAssets, getNum(businessDetails.TotalAssets));
            setValue(businessLocation, businessDetails.BusinessLocation);
            setValue(businessStatus, businessDetails.BusinessStatus);
            setValue(startupCapital, businessDetails.StartUpCapitalCollatelar || businessDetails.StartupCapital);
            setValue(collateralType, businessDetails.CollateralType);
            setValue(loanLimitType, businessDetails.LoanLimitType);
        } catch (error) {
            console.error('Error parsing BusinessDetails:', error);
        }
    } else {
        // Try to get business fields directly from data if BusinessDetails is not available
        // Use helper for numeric fields that can be 0
        const getNum = (val) => (val !== null && val !== undefined && val !== '') ? val : '';
        
        setValue(monthlyProfit, getNum(data.MonthlyProfit));
        setValue(monthlyTurnOver, getNum(data.MonthlyTurnOver));
        setValue(totalAssets, getNum(data.TotalAssets));
        setValue(businessLocation, data.BusinessLocation);
        setValue(businessStatus, data.BusinessStatus);
        setValue(startupCapital, data.StartupCapital);
        setValue(collateralType, data.CollateralType);
        setValue(loanLimitType, data.LoanLimitType);
    }
    
    // Format disbursement date
    if (disbursementDate) {
        if (data.DisbursementDate) {
            const disbDate = new Date(data.DisbursementDate);
            disbursementDate.value = disbDate.toISOString().split('T')[0];
        } else {
            disbursementDate.value = '';
        }
    }
    
    // Other fields
    setValue(spread, data.Spread || '0.00'); // Default value
    setValue(fileNumber, data.FileNumber);
    setValue(applicationStatus, data.WFAppStatus || data.ApplicationStatus || data.Status);
    
    setValue(salesOfficerId, data.SalesOfficerID);
    setValue(salesOfficerName, data.SalesOfficerName);
    
    // Workflow Information
    if (data.WFAdvTypeID) {
        // Store workflow info for reference
        console.log('Workflow Type:', data.WFAdvType);
        console.log('Workflow Stage:', data.WFAdvStageID);
    }
    
    // Direct name fields from response if available (override setValue defaults)
    if (data.BranchName) branchName.value = data.BranchName;
    if (data.ClientName) clientName.value = data.ClientName;
    if (data.ProductName) productName.value = data.ProductName;
    if (data.OfficerName || data.CreditOfficerName) officerName.value = data.OfficerName || data.CreditOfficerName;
    if (data.CenterName) centerName.value = data.CenterName;
    if (data.ClientBranchName) clientBranchName.value = data.ClientBranchName;
    if (data.RepaymentAccountName) repaymentAccountName.value = data.RepaymentAccountName;
    if (data.DonorName) donorName.value = data.DonorName;
    if (data.SalesOfficerName) salesOfficerName.value = data.SalesOfficerName;
    
    console.log('[loadApplicationData] Fields populated, now fetching descriptions for missing fields...');

    // Async Fetch Descriptions for any missing name fields
    (async () => {
        try {
            const fetchPromises = [];
            
            // Branch Name - use LookupService from database
            if (branchId.value && !branchName.value) {
                fetchPromises.push(
                    (async () => {
                        try {
                            if (window.LookupService) {
                                const result = await window.LookupService.getBranches({ BankID: '00' });
                                if (result.success && result.data) {
                                    const branches = Array.isArray(result.data) ? result.data : (result.Details || []);
                                    const branch = branches.find(b => b.OurBranchID === branchId.value);
                                    if (branch) {
                                        branchName.value = branch.BranchName || '';
                                        console.log('[loadApplicationData] Branch name from database:', branch.BranchName);
                                    }
                                }
                            } else if (window.CoreApi) {
                                const bEnv = window.CoreApi.makeRequestEnvelope("p_GetSearchResult", {
                                    TableID: "WFAdvBranch",
                                    AdvFilterString: "",
                                    WhereStmt: `OurBranchID='${branchId.value}'`,
                                    PrevOrNext: "0",
                                    OperatorID: "web_portal",
                                    ModuleID: 7035,
                                    OurBranchID: branchId.value
                                });
                                const endpoint = (window.Environment && window.Environment.baseUrl) ? 
                                    window.Environment.baseUrl + '/api/OldAPI' : '/api/OldAPI';
                                const bRes = await window.CoreApi.post(endpoint, bEnv);
                                if (bRes && bRes.Details && bRes.Details.length > 0) {
                                    branchName.value = bRes.Details[0].BranchName || bRes.Details[0].Description || bRes.Details[0].Name || '';
                                }
                            }
                        } catch(err) { console.warn('[loadApplicationData] Branch fetch failed', err); }
                    })()
                );
            }
            
            // Client Branch Name
            if (clientBranchId.value && !clientBranchName.value) {
                fetchPromises.push(
                    (async () => {
                        try {
                            if (window.LookupService) {
                                const result = await window.LookupService.getBranches({ BankID: '00' });
                                if (result.success && result.data) {
                                    const branches = Array.isArray(result.data) ? result.data : (result.Details || []);
                                    const branch = branches.find(b => b.OurBranchID === clientBranchId.value);
                                    if (branch) {
                                        clientBranchName.value = branch.BranchName || '';
                                    }
                                }
                            }
                        } catch(err) { console.warn('[loadApplicationData] Client Branch fetch failed', err); }
                    })()
                );
            }

            // Client Name
            if (clientId.value && !clientName.value && window.ClientSearchService) {
                fetchPromises.push(
                    (async () => {
                        try {
                            const clients = await window.ClientSearchService.searchClients({ 
                                clientId: clientId.value, 
                                clientIdOperator: 'equals' 
                            });
                            if (clients && clients.length > 0) {
                                console.log('[loadApplicationData] Client Found:', clients[0]);
                                clientName.value = clients[0].Name || clients[0].ClientName || '';
                                if (!clientBranchName.value && clients[0].BranchName) {
                                    clientBranchName.value = clients[0].BranchName;
                                }
                            }
                        } catch(err) { console.warn('[loadApplicationData] Client fetch failed', err); }
                    })()
                );
            }

            // Product Name
            if (productId.value && !productName.value && window.ProductSearchService) {
                fetchPromises.push(
                    (async () => {
                        try {
                            const products = await window.ProductSearchService.searchProducts({ 
                                exactProductId: productId.value,
                                branchId: branchId.value || '0603' 
                            });
                            if (products && products.length > 0) {
                                productName.value = products[0].ProductName || products[0].Description || products[0].Name || '';
                                console.log('[loadApplicationData] Product Name set to:', productName.value);
                            }
                        } catch(err) { console.warn('[loadApplicationData] Product fetch failed', err); }
                    })()
                );
            }

            // Repayment Account Name
            if (repaymentAccountId.value && !repaymentAccountName.value && window.RepaymentAccountSearchService) {
                fetchPromises.push(
                    (async () => {
                        try {
                            const accounts = await window.RepaymentAccountSearchService.searchRepaymentAccounts({ 
                                accountId: repaymentAccountId.value, 
                                accountIdOperator: 'equals' 
                            });
                            if (accounts && accounts.length > 0) {
                                repaymentAccountName.value = accounts[0].Name || accounts[0].AccountName || '';
                            }
                        } catch(err) { console.warn('[loadApplicationData] Account fetch failed', err); }
                    })()
                );
            }

            // Officer Name
            if (officerId.value && !officerName.value && window.OfficerSearchService) {
                fetchPromises.push(
                    (async () => {
                        try {
                            const officers = await window.OfficerSearchService.searchOfficers({ 
                                officerId: officerId.value, 
                                officerIdOperator: 'equals' 
                            });
                            if (officers && officers.length > 0) {
                                officerName.value = officers[0].Name || officers[0].OfficerName || '';
                                console.log('[loadApplicationData] Officer Name set to:', officerName.value);
                            }
                        } catch(err) { console.warn('[loadApplicationData] Officer fetch failed', err); }
                    })()
                );
            }
            
            // Center Name
            if (centerId.value && !centerName.value && window.CenterSearchService) {
                fetchPromises.push(
                    (async () => {
                        try {
                            const centers = await window.CenterSearchService.searchCenters({ 
                                exactCenterId: centerId.value 
                            });
                            if (centers && centers.length > 0) {
                                centerName.value = centers[0].CenterName || centers[0].GroupName || '';
                            }
                        } catch(err) { console.warn('[loadApplicationData] Center fetch failed', err); }
                    })()
                );
            }

            // Wait for all description fetches to complete
            await Promise.allSettled(fetchPromises);
            console.log('[loadApplicationData] All description fetches completed');

        } catch (error) {
            console.warn('[loadApplicationData] Error fetching descriptions:', error);
        }
    })();
    
    // Set readonly fields based on application status
    if (data.AllowEdit === false || data.DataEditable === false) {
        setFormReadOnly(true);
        showMessage('This application is not editable at the current stage', 'info');
    }
}

// Helper function to set form fields read-only
function setFormReadOnly(readonly) {
    const formElements = document.querySelectorAll('#loanApplicationForm input, #loanApplicationForm select, #loanApplicationForm textarea');
    formElements.forEach(element => {
        element.readOnly = readonly;
        if (element.tagName === 'SELECT') {
            element.disabled = readonly;
        }
    });
}

// Auto-populate branch name when user enters branch ID and presses Enter/Tab
async function autoPopulateBranchName(branchIdValue, branchNameField, syncBranchIdField = null, syncBranchNameField = null) {
    if (!branchIdValue || branchIdValue.trim() === '') return;
    
    try {
        // Check if LookupService is available
        if (!window.LookupService) {
            console.warn('LookupService not available');
            return;
        }
        
        const requestData = { BankID: '00' };
        const result = await window.LookupService.getBranches(requestData);
        console.log('AutoPopulate Branch - GetBranches Result:', result);
        
        if (result.success && result.data) {
            // Extract branches array
            let branches = Array.isArray(result.data) ? result.data : (result.Details || []);
            
            // Find exact match
            const exactMatch = branches.find(b => b.OurBranchID === branchIdValue);
            
            if (exactMatch) {
                // Exact match found - populate name
                branchNameField.value = exactMatch.BranchName || '';
                
                // Sync Client Branch ID and Name if provided and empty
                if (syncBranchIdField && syncBranchNameField) {
                    if (!syncBranchIdField.value || syncBranchIdField.value.trim() === '') {
                        syncBranchIdField.value = exactMatch.OurBranchID || '';
                        syncBranchNameField.value = exactMatch.BranchName || '';
                    }
                }
                
                console.log('Branch auto-populated:', exactMatch.BranchName);
            } else {
                // No exact match - clear the name field
                branchNameField.value = '';
                console.warn('No branch found with ID:', branchIdValue);
            }
        } else {
            branchNameField.value = '';
            console.warn('Branch lookup returned no data');
        }
    } catch (error) {
        console.error('Error auto-populating branch details:', error);
        branchNameField.value = '';
    }
}

// Auto-populate group name when user enters group ID
async function autoPopulateGroupName(groupIdValue) {
    if (!groupIdValue || groupIdValue.trim() === '') return;
    
    try {
        // Use GroupSearchService if available
        if (window.GroupSearchService) {
            const groups = await window.GroupSearchService.searchGroups({ exactGroupId: groupIdValue });
            console.log('AutoPopulate Group - Search Result:', groups);
            
            if (groups && groups.length > 0) {
                const exactMatch = groups.find(g => g.GroupID === groupIdValue || g.GroupId === groupIdValue);
                if (exactMatch) {
                    groupName.value = exactMatch.GroupName || exactMatch.Name || '';
                    console.log('Group auto-populated:', groupName.value);
                } else {
                    // Use first result if no exact match
                    groupName.value = groups[0].GroupName || groups[0].Name || '';
                }
            } else {
                groupName.value = '';
                console.warn('No group found with ID:', groupIdValue);
            }
        } else {
            console.warn('GroupSearchService not available');
        }
    } catch (error) {
        console.error('Error auto-populating group name:', error);
        groupName.value = '';
    }
}

// Auto-populate application name/details when user enters application ID
async function autoPopulateApplicationName(appIdValue) {
    if (!appIdValue || appIdValue.trim() === '') return;
    
    try {
        // Use ApplicationSearchService if available
        if (window.ApplicationSearchService) {
            const response = await window.ApplicationSearchService.searchApplications({
                applicationId: { value: appIdValue, operator: 'equals' }
            });
            console.log('AutoPopulate Application - Search Result:', response);
            
            if (response.success && response.data && response.data.Details) {
                const applications = response.data.Details;
                if (applications.length > 0) {
                    const exactMatch = applications.find(a => a.ApplicationID === appIdValue);
                    const app = exactMatch || applications[0];
                    
                    // Set application name (could be ClientName or a combination)
                    applicationName.value = app.ClientName || app.ApplicationName || app.Name || '';
                    
                    // Also populate related fields if they're empty
                    if (app.ClientID && (!clientId.value || clientId.value.trim() === '')) {
                        const wasReadonly = clientId.hasAttribute('readonly');
                        if (wasReadonly) clientId.removeAttribute('readonly');
                        clientId.value = app.ClientID;
                        if (wasReadonly) clientId.setAttribute('readonly', 'readonly');
                        
                        // Trigger client name lookup
                        if (app.ClientName && (!clientName.value || clientName.value.trim() === '')) {
                            const wasNameReadonly = clientName.hasAttribute('readonly');
                            if (wasNameReadonly) clientName.removeAttribute('readonly');
                            clientName.value = app.ClientName;
                            if (wasNameReadonly) clientName.setAttribute('readonly', 'readonly');
                        }
                    }
                    
                    if (app.ProductID && (!productId.value || productId.value.trim() === '')) {
                        const wasReadonly = productId.hasAttribute('readonly');
                        if (wasReadonly) productId.removeAttribute('readonly');
                        productId.value = app.ProductID;
                        if (wasReadonly) productId.setAttribute('readonly', 'readonly');
                    }
                    
                    console.log('Application auto-populated:', applicationName.value);
                } else {
                    applicationName.value = '';
                    console.warn('No application found with ID:', appIdValue);
                }
            } else {
                applicationName.value = '';
                console.warn('Application lookup returned no data');
            }
        } else {
            console.warn('ApplicationSearchService not available');
        }
    } catch (error) {
        console.error('Error auto-populating application name:', error);
        applicationName.value = '';
    }
}

// Search Handlers - Branch lookup from database
async function searchBranch() {
    // Open branch search modal
    if (window.BranchSearchModal) {
        console.log('Opening BranchSearchModal for Branch ID');
        window.BranchSearchModal.open(branchId, branchName, (selectedBranch) => {
            console.log('Branch selected:', selectedBranch);
            
            // Also sync to Client Branch ID if empty
            if (!clientBranchId.value || clientBranchId.value.trim() === '') {
                clientBranchId.value = selectedBranch.branchId || '';
                clientBranchName.value = selectedBranch.branchName || '';
            }
            
            showMessage('Branch selected: ' + (selectedBranch.branchName || selectedBranch.branchId), 'success');
        });
    } else {
        // Fallback to direct lookup if modal not available
        console.warn('BranchSearchModal not available, using direct lookup');
        if (!branchId.value || branchId.value.trim() === '') {
            showMessage('Please enter a Branch ID', 'warning');
            return;
        }
        const enteredBranchId = branchId.value.trim();
        await fetchBranchDetails(enteredBranchId, branchName, clientBranchId, clientBranchName, true);
    }
}

async function fetchBranchDetails(branchIdValue, branchNameField, syncBranchIdField = null, syncBranchNameField = null, syncClientBranch = false) {
    try {
        // Check if LookupService is available
        if (!window.LookupService) {
            console.warn('LookupService not available');
            showMessage('Branch lookup service not available', 'error');
            return;
        }
        
        const requestData = {
            BankID: '00'
        };
        
        const result = await window.LookupService.getBranches(requestData);
        console.log('GetBranches Result:', result);
        
        if (result.success && result.data) {
            // Extract branches array
            let branches = Array.isArray(result.data) ? result.data : (result.Details || []);
            
            // Find exact match
            const exactMatch = branches.find(b => b.OurBranchID === branchIdValue);
            
            if (exactMatch) {
                // Exact match found - populate
                branchNameField.value = exactMatch.BranchName || '';
                
                // Sync Client Branch ID and Name if requested
                if (syncClientBranch && syncBranchIdField && syncBranchNameField) {
                    syncBranchIdField.value = exactMatch.OurBranchID || '';
                    syncBranchNameField.value = exactMatch.BranchName || '';
                }
                
                console.log('Branch found:', exactMatch.BranchName);
            } else {
                // Try partial match
                const lowerBranchId = branchIdValue.toLowerCase();
                const partialMatches = branches.filter(b => 
                    (b.OurBranchID || '').toLowerCase().includes(lowerBranchId)
                );
                
                if (partialMatches.length === 1) {
                    const branch = partialMatches[0];
                    branchNameField.value = branch.BranchName || '';
                    
                    if (syncClientBranch && syncBranchIdField && syncBranchNameField) {
                        syncBranchIdField.value = branch.OurBranchID || '';
                        syncBranchNameField.value = branch.BranchName || '';
                    }
                    
                    console.log('Branch found:', branch.BranchName);
                } else if (partialMatches.length > 1) {
                    branchNameField.value = '';
                    if (syncBranchIdField) syncBranchIdField.value = '';
                    if (syncBranchNameField) syncBranchNameField.value = '';
                    showMessage('Multiple branches match, please be more specific', 'warning');
                } else {
                    branchNameField.value = '';
                    if (syncBranchIdField) syncBranchIdField.value = '';
                    if (syncBranchNameField) syncBranchNameField.value = '';
                    console.warn('No branch found with ID:', branchIdValue);
                }
            }
        } else {
            branchNameField.value = '';
            if (syncBranchIdField) syncBranchIdField.value = '';
            if (syncBranchNameField) syncBranchNameField.value = '';
            console.warn('Branch not found');
        }
    } catch (error) {
        console.error('Error fetching branch details:', error);
        branchNameField.value = '';
        showMessage('Error fetching branch details', 'error');
    }
}

function searchCenter() {
    console.log('searchCenter called');
    // Open center search modal
    if (window.CenterSearchModal) {
        console.log('Opening CenterSearchModal');
        CenterSearchModal.open((selectedCenter) => {
            console.log('=== CALLBACK EXECUTED ===');
            console.log('Selected center data:', selectedCenter);
            
            // Get elements directly to ensure they exist
            const centerIdField = document.getElementById('centerId');
            const centerNameField = document.getElementById('centerName');
            
            console.log('centerIdField:', centerIdField);
            console.log('centerNameField:', centerNameField);
            
            if (!centerIdField || !centerNameField) {
                console.error('One or more fields not found!');
                showMessage('Error: Form fields not found', 'error');
                return;
            }
            
            // Handle readonly attribute
            const centerIdReadonly = centerIdField.hasAttribute('readonly');
            const centerNameReadonly = centerNameField.hasAttribute('readonly');
            
            if (centerIdReadonly) centerIdField.removeAttribute('readonly');
            if (centerNameReadonly) centerNameField.removeAttribute('readonly');
            
            // Set values
            centerIdField.value = selectedCenter.centerId || '';
            centerNameField.value = selectedCenter.centerName || '';
            
            // Restore readonly if needed
            if (centerIdReadonly) centerIdField.setAttribute('readonly', 'readonly');
            if (centerNameReadonly) centerNameField.setAttribute('readonly', 'readonly');
            
            // Dispatch events
            centerIdField.dispatchEvent(new Event('input', { bubbles: true }));
            centerIdField.dispatchEvent(new Event('change', { bubbles: true }));
            centerNameField.dispatchEvent(new Event('input', { bubbles: true }));
            centerNameField.dispatchEvent(new Event('change', { bubbles: true }));
            
            console.log('Center fields populated successfully');
            showMessage('Center selected successfully', 'success');
        });
    } else {
        console.error('CenterSearchModal not found');
        showMessage('Center search modal not available', 'error');
    }
}

function searchGroup() {
    console.log('searchGroup called');
    // Open group search modal
    if (window.GroupSearchModal) {
        console.log('Opening GroupSearchModal');
        GroupSearchModal.open((selectedGroup) => {
            console.log('=== CALLBACK EXECUTED ===');
            console.log('Selected group data:', selectedGroup);
            
            // Get elements directly to ensure they exist
            const groupIdField = document.getElementById('groupId');
            const groupNameField = document.getElementById('groupName');
            
            console.log('groupIdField:', groupIdField);
            console.log('groupNameField:', groupNameField);
            
            if (!groupIdField) {
                console.error('Group ID field not found!');
                showMessage('Error: Form fields not found', 'error');
                return;
            }
            
            // Handle readonly attributes
            const groupIdReadonly = groupIdField.hasAttribute('readonly');
            const groupNameReadonly = groupNameField ? groupNameField.hasAttribute('readonly') : false;
            
            if (groupIdReadonly) groupIdField.removeAttribute('readonly');
            if (groupNameField && groupNameReadonly) groupNameField.removeAttribute('readonly');
            
            // Set values - both ID and Name
            groupIdField.value = selectedGroup.groupId || selectedGroup.GroupID || '';
            if (groupNameField) {
                groupNameField.value = selectedGroup.groupName || selectedGroup.GroupName || selectedGroup.Name || '';
                console.log('Group Name set to:', groupNameField.value);
            }
            
            // Restore readonly if needed
            if (groupIdReadonly) groupIdField.setAttribute('readonly', 'readonly');
            if (groupNameField && groupNameReadonly) groupNameField.setAttribute('readonly', 'readonly');
            
            // Dispatch events
            groupIdField.dispatchEvent(new Event('input', { bubbles: true }));
            groupIdField.dispatchEvent(new Event('change', { bubbles: true }));
            
            console.log('Group fields populated successfully');
            showMessage('Group selected successfully', 'success');
        });
    } else {
        console.error('GroupSearchModal not found');
        showMessage('Group search modal not available', 'error');
    }
}

function searchApplication() {
    console.log('searchApplication called');
    // Open application search modal
    if (window.ApplicationSearchModal) {
        console.log('Opening ApplicationSearchModal');
        
        // Get current branch ID for filtering
        const currentBranchId = branchId ? branchId.value.trim() : '';
        console.log('Filtering applications by branchId:', currentBranchId);
        
        // Pass branchId as filter option
        ApplicationSearchModal.open((selectedApp) => {
            console.log('=== CALLBACK EXECUTED ===');
            console.log('Selected application data:', selectedApp);
            
            // Get elements directly to ensure they exist
            const appIdField = document.getElementById('applicationId');
            const appNameField = document.getElementById('applicationName');
            const clientIdField = document.getElementById('clientId');
            const clientNameField = document.getElementById('clientName');
            const productIdField = document.getElementById('productId');
            const branchIdField = document.getElementById('branchId');
            
            console.log('appIdField:', appIdField);
            console.log('appNameField:', appNameField);
            console.log('clientIdField:', clientIdField);
            console.log('productIdField:', productIdField);
            console.log('branchIdField:', branchIdField);
            
            if (!appIdField || !clientIdField || !productIdField) {
                console.error('One or more fields not found!');
                showMessage('Error: Form fields not found', 'error');
                return;
            }
            
            try {
                // Temporarily remove readonly to allow setting values
                const wasClientReadonly = clientIdField.hasAttribute('readonly');
                const wasProductReadonly = productIdField.hasAttribute('readonly');
                const wasAppNameReadonly = appNameField ? appNameField.hasAttribute('readonly') : false;
                const wasClientNameReadonly = clientNameField ? clientNameField.hasAttribute('readonly') : false;
                
                if (wasClientReadonly) {
                    clientIdField.removeAttribute('readonly');
                    console.log('Removed readonly from clientId');
                }
                if (wasProductReadonly) {
                    productIdField.removeAttribute('readonly');
                    console.log('Removed readonly from productId');
                }
                if (appNameField && wasAppNameReadonly) {
                    appNameField.removeAttribute('readonly');
                }
                if (clientNameField && wasClientNameReadonly) {
                    clientNameField.removeAttribute('readonly');
                }
                
                // Set values - including Branch ID if available
                appIdField.value = selectedApp.applicationId || '';
                clientIdField.value = selectedApp.clientId || '';
                productIdField.value = selectedApp.productId || '';
                
                // Set Application Name (from clientName in response)
                if (appNameField) {
                    appNameField.value = selectedApp.clientName || selectedApp.applicationName || '';
                    console.log('  Application Name set to:', appNameField.value);
                }
                
                // Set Client Name if available
                if (clientNameField && selectedApp.clientName) {
                    clientNameField.value = selectedApp.clientName || '';
                    console.log('  Client Name set to:', clientNameField.value);
                }
                
                // Also set the Branch ID if returned from search
                if (selectedApp.branchId && branchIdField) {
                    branchIdField.value = selectedApp.branchId;
                    console.log('  Branch ID set to:', selectedApp.branchId);
                    // Trigger branch name auto-populate
                    autoPopulateBranchName(selectedApp.branchId, branchName, clientBranchId, clientBranchName);
                }
                
                console.log('Values set:');
                console.log('  Application ID:', appIdField.value);
                console.log('  Application Name:', appNameField ? appNameField.value : 'N/A');
                console.log('  Client ID:', clientIdField.value);
                console.log('  Product ID:', productIdField.value);
                
                // Restore readonly
                if (wasClientReadonly) {
                    clientIdField.setAttribute('readonly', 'readonly');
                }
                if (wasProductReadonly) {
                    productIdField.setAttribute('readonly', 'readonly');
                }
                if (appNameField && wasAppNameReadonly) {
                    appNameField.setAttribute('readonly', 'readonly');
                }
                if (clientNameField && wasClientNameReadonly) {
                    clientNameField.setAttribute('readonly', 'readonly');
                }
                
                // Trigger change events
                appIdField.dispatchEvent(new Event('change', { bubbles: true }));
                clientIdField.dispatchEvent(new Event('change', { bubbles: true }));
                productIdField.dispatchEvent(new Event('change', { bubbles: true }));
                
                showMessage('Application fields populated successfully', 'success');
            } catch (error) {
                console.error('Error populating fields:', error);
                showMessage('Error populating fields: ' + error.message, 'error');
            }
        }, { branchId: currentBranchId });
    } else {
        console.error('ApplicationSearchModal not found on window');
        showMessage('Application search modal not loaded', 'error');
    }
}

async function searchClientBranch() {
    // Open branch search modal for Client Branch
    if (window.BranchSearchModal) {
        console.log('Opening BranchSearchModal for Client Branch ID');
        window.BranchSearchModal.open(clientBranchId, clientBranchName, (selectedBranch) => {
            console.log('Client Branch selected:', selectedBranch);
            showMessage('Client Branch selected: ' + (selectedBranch.branchName || selectedBranch.branchId), 'success');
        });
    } else {
        // Fallback to direct lookup if modal not available
        console.warn('BranchSearchModal not available, using direct lookup');
        if (!clientBranchId.value || clientBranchId.value.trim() === '') {
            showMessage('Please enter a Client Branch ID', 'warning');
            return;
        }
        const enteredBranchId = clientBranchId.value.trim();
        await fetchBranchDetails(enteredBranchId, clientBranchName, null, null, false);
    }
}

function searchClient() {
    console.log('searchClient called');
    // Open client search modal
    if (window.ClientSearchModal) {
        console.log('Opening ClientSearchModal');
        window.ClientSearchModal.open((selectedClient) => {
            console.log('=== CLIENT CALLBACK EXECUTED ===');
            console.log('Selected client data:', selectedClient);
            
            // Get elements directly to ensure they exist
            const clientIdField = document.getElementById('clientId');
            const clientNameField = document.getElementById('clientName');
            
            console.log('clientIdField:', clientIdField);
            console.log('clientNameField:', clientNameField);
            
            if (!clientIdField || !clientNameField) {
                console.error('Client fields not found!');
                showMessage('Error: Client fields not found', 'error');
                return;
            }
            
            try {
                // Temporarily remove readonly to allow setting values
                const wasClientIdReadonly = clientIdField.hasAttribute('readonly');
                const wasClientNameReadonly = clientNameField.hasAttribute('readonly');
                
                if (wasClientIdReadonly) clientIdField.removeAttribute('readonly');
                if (wasClientNameReadonly) clientNameField.removeAttribute('readonly');
                
                // Set values
                clientIdField.value = selectedClient.ClientID || '';
                clientNameField.value = selectedClient.Name || '';
                
                console.log('Values set:');
                console.log('  Client ID:', clientIdField.value);
                console.log('  Client Name:', clientNameField.value);
                
                // Restore readonly
                if (wasClientIdReadonly) clientIdField.setAttribute('readonly', 'readonly');
                if (wasClientNameReadonly) clientNameField.setAttribute('readonly', 'readonly');
                
                // Trigger change events
                clientIdField.dispatchEvent(new Event('change', { bubbles: true }));
                clientNameField.dispatchEvent(new Event('change', { bubbles: true }));
                
                showMessage(`Client ${selectedClient.ClientID} selected`, 'success');
            } catch (error) {
                console.error('Error populating client fields:', error);
                showMessage('Error populating fields: ' + error.message, 'error');
            }
        });
    } else {
        console.error('ClientSearchModal not found on window');
        showMessage('Client search modal not loaded', 'error');
    }
}

function searchProduct() {
    console.log('searchProduct called');
    // Open product search modal
    if (window.ProductSearchModal) {
        console.log('Opening ProductSearchModal');
        ProductSearchModal.open(async (selectedProduct) => {
            console.log('=== CALLBACK EXECUTED ===');
            console.log('Selected product data:', selectedProduct);
            
            // Get elements directly to ensure they exist
            const productIdField = document.getElementById('productId');
            const productNameField = document.getElementById('productName');
            
            console.log('productIdField:', productIdField);
            console.log('productNameField:', productNameField);
            
            if (!productIdField || !productNameField) {
                console.error('One or more fields not found!');
                showMessage('Error: Form fields not found', 'error');
                return;
            }
            
            // Handle readonly attribute
            const productIdReadonly = productIdField.hasAttribute('readonly');
            const productNameReadonly = productNameField.hasAttribute('readonly');
            
            if (productIdReadonly) productIdField.removeAttribute('readonly');
            if (productNameReadonly) productNameField.removeAttribute('readonly');
            
            // Set values
            productIdField.value = selectedProduct.productId || '';
            productNameField.value = selectedProduct.productName || '';
            
            // Restore readonly if needed
            if (productIdReadonly) productIdField.setAttribute('readonly', 'readonly');
            if (productNameReadonly) productNameField.setAttribute('readonly', 'readonly');
            
            // Dispatch events
            productIdField.dispatchEvent(new Event('input', { bubbles: true }));
            productIdField.dispatchEvent(new Event('change', { bubbles: true }));
            productNameField.dispatchEvent(new Event('input', { bubbles: true }));
            productNameField.dispatchEvent(new Event('change', { bubbles: true }));
            
            console.log('Product fields populated successfully');
            
            // Now fetch and auto-populate product details
            if (selectedProduct.productId && window.ProductSearchService && window.ProductSearchService.getProductDetails) {
                try {
                    showMessage('Loading product details...', 'info');
                    
                    const branchIdValue = document.getElementById('branchId')?.value || '';
                    const productDetails = await ProductSearchService.getProductDetails({
                        branchId: branchIdValue,
                        productId: selectedProduct.productId
                    });
                    
                    console.log('Product details received:', productDetails);
                    
                    if (productDetails && productDetails.productInfo) {
                        populateProductFields(productDetails.productInfo, productDetails.rateSlabs);
                        showMessage('Product selected and details loaded', 'success');
                    } else {
                        showMessage('Product selected successfully', 'success');
                    }
                } catch (error) {
                    console.error('Error fetching product details:', error);
                    showMessage('Product selected but details could not be loaded', 'warning');
                }
            } else {
                showMessage('Product selected successfully', 'success');
            }
        });
    } else {
        console.error('ProductSearchModal not found');
        showMessage('Product search modal not available', 'error');
    }
}

/**
 * Populate form fields with product details from p_GetWFProductDetails
 * @param {Object} productInfo - Main product information
 * @param {Array} rateSlabs - Rate slab information
 */
function populateProductFields(productInfo, rateSlabs) {
    console.log('Populating product fields with:', productInfo);
    console.log('Rate slabs:', rateSlabs);
    
    // Helper function to set field value and make it readonly
    const setFieldValue = (fieldId, value, makeReadonly = true) => {
        const field = document.getElementById(fieldId);
        if (field && value !== undefined && value !== null) {
            // Remove readonly temporarily to set value
            field.removeAttribute('readonly');
            field.disabled = false;
            
            field.value = value;
            
            // Make field readonly after setting value (product-controlled fields)
            if (makeReadonly) {
                field.setAttribute('readonly', 'readonly');
                field.style.backgroundColor = '#f1f5f9'; // Visual indicator it's locked
                field.style.cursor = 'not-allowed';
            }
            
            field.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };
    
    // Populate Currency ID (readonly)
    if (productInfo.CurrencyID) {
        setFieldValue('currencyId', productInfo.CurrencyID, true);
    }
    
    // Populate rates from rate slabs - ALL SHOULD BE READONLY
    if (rateSlabs && rateSlabs.length > 0) {
        const firstSlab = rateSlabs[0];
        
        // **Interest Rate** - populated with EffectiveRate (READONLY)
        if (firstSlab.EffectiveRate !== undefined && firstSlab.EffectiveRate !== null) {
            setFieldValue('interestRate', firstSlab.EffectiveRate, true);
            console.log('✅ Interest Rate populated with Effective Rate:', firstSlab.EffectiveRate);
        }
        
        // **ProductEffectiveRate** goes to effectiveRate field (READONLY)
        if (firstSlab.ProductEffectiveRate !== undefined && firstSlab.ProductEffectiveRate !== null) {
            setFieldValue('effectiveRate', firstSlab.ProductEffectiveRate, true);
            console.log('✅ Effective Rate field populated:', firstSlab.ProductEffectiveRate);
        }
        
        // **Commission Rate** - Auto-populate and lock (READONLY)
        if (firstSlab.CommissionRate !== undefined && firstSlab.CommissionRate !== null) {
            setFieldValue('commissionRate', firstSlab.CommissionRate, true);
            console.log('✅ Commission Rate populated:', firstSlab.CommissionRate);
        }
        
        // **Tax Rate** - Auto-populate and lock (READONLY)
        if (firstSlab.TaxRate !== undefined && firstSlab.TaxRate !== null) {
            setFieldValue('taxRate', firstSlab.TaxRate, true);
            console.log('✅ Tax Rate populated:', firstSlab.TaxRate);
        }
        
        // **Marking Rate (Spread)** - Auto-populate and lock (READONLY)
        if (firstSlab.MarkingRate !== undefined && firstSlab.MarkingRate !== null) {
            setFieldValue('spread', firstSlab.MarkingRate, true);
            console.log('✅ Spread populated:', firstSlab.MarkingRate);
        }
        
        // Term constraints from slabs (can be used for validation later)
        if (firstSlab.TermFrom !== undefined && firstSlab.TermTo !== undefined) {
            console.log(`ℹ️ Term range: ${firstSlab.TermFrom} to ${firstSlab.TermTo}`);
        }
        
        // Amount constraints from slabs (can be used for validation later)
        if (firstSlab.AmountSlabFrom !== undefined && firstSlab.AmountSlabTo !== undefined) {
            console.log(`ℹ️ Amount range: ${firstSlab.AmountSlabFrom} to ${firstSlab.AmountSlabTo}`);
        }
        
        // Store rate slabs globally for product info modal
        currentProductRateSlabs = rateSlabs;
        
        // Enable product info button when product is selected
        if (productInfoBtn) {
            productInfoBtn.disabled = false;
            productInfoBtn.style.opacity = '1';
        }
    } else {
        console.warn('⚠️ No rate slabs found in product details. Check if Details01 is populated.');
        currentProductRateSlabs = [];
        
        // Still enable product info button - it will fetch _v2 data
        if (productInfoBtn) {
            productInfoBtn.disabled = false;
            productInfoBtn.style.opacity = '1';
        }
    }
    
    // Additional product info fields
    if (productInfo.LoanPeriod) {
        console.log('Loan Period:', productInfo.LoanPeriod);
    }
    
    if (productInfo.MinLoanAmount !== undefined) {
        console.log('Min Loan Amount:', productInfo.MinLoanAmount);
    }
    
    if (productInfo.MaxLoanAmount !== undefined) {
        console.log('Max Loan Amount:', productInfo.MaxLoanAmount);
    }
    
    if (productInfo.MinLoanTerm !== undefined) {
        console.log('Min Loan Term:', productInfo.MinLoanTerm);
    }
    
    if (productInfo.MaxLoanTerm !== undefined) {
        console.log('Max Loan Term:', productInfo.MaxLoanTerm);
    }
    
    console.log('Product fields populated successfully');
}

/**
 * Show Product Rate Details Modal
 */
async function showProductRateDetails() {
    // Check if product is selected
    if (!productId.value) {
        showMessage('Please select a product first', 'warning');
        return;
    }

    try {
        showMessage('Loading product rate details...', 'info');

        // Call p_GetWFProductDetails_v2 to get rate variance details
        const branchIdValue = document.getElementById('branchId')?.value || '';
        const rateVarianceData = await ProductSearchService.getProductRateVariance({
            branchId: branchIdValue,
            productId: productId.value
        });

        console.log('📊 Rate Variance Data:', rateVarianceData);

        if (!rateVarianceData || !rateVarianceData.rateVariance || rateVarianceData.rateVariance.length === 0) {
            showMessage('No rate details available for this product', 'warning');
            return;
        }

        // Populate product ID and name
        document.getElementById('rateDetailProductId').value = productId.value || '';
        document.getElementById('rateDetailProductName').value = productName.value || '';

        // Populate rate details table
        const tbody = document.getElementById('rateDetailsTableBody');
        tbody.innerHTML = ''; // Clear existing rows

        rateVarianceData.rateVariance.forEach((slab, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatNumber(slab.AmountSlabFrom)}</td>
                <td>${formatNumber(slab.AmountSlabTo)}</td>
                <td>${slab.TermFrom}</td>
                <td>${slab.TermTo}</td>
                <td>${formatNumber(slab.MinVariance)}</td>
                <td>${formatNumber(slab.MaxVariance)}</td>
                <td>${formatNumber(slab.EffectiveRateFrom)}%</td>
                <td>${formatNumber(slab.EffectiveRate)}%</td>
                <td>${formatNumber(slab.EffectiveRateTo)}%</td>
                <td>${formatNumber(slab.Penalty)}</td>
            `;
            tbody.appendChild(row);
        });

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('productRateDetailsModal'));
        modal.show();
        
        showMessage('Rate details loaded successfully', 'success');
    } catch (error) {
        console.error('Error loading rate details:', error);
        showMessage('Error loading rate details: ' + error.message, 'error');
    }
}

/**
 * Helper function to format numbers with commas
 */
function formatNumber(num) {
    if (num === undefined || num === null || num === '') return '';
    return Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function searchRepaymentAccount() {
    if (typeof window.RepaymentAccountSearchModal === 'undefined') {
        console.error('Repayment Account Search modal not available');
        showMessage('Repayment Account search modal is not loaded', 'error');
        return;
    }

    window.RepaymentAccountSearchModal.open((selectedAccount) => {
        if (selectedAccount) {
            // Check if fields are readonly and temporarily enable them
            const accountIdField = repaymentAccountId;
            const accountNameField = repaymentAccountName;
            
            const wasAccountIdReadonly = accountIdField.hasAttribute('readonly');
            const wasAccountNameReadonly = accountNameField.hasAttribute('readonly');
            
            if (wasAccountIdReadonly) accountIdField.removeAttribute('readonly');
            if (wasAccountNameReadonly) accountNameField.removeAttribute('readonly');
            
            // Set the values
            accountIdField.value = selectedAccount.accountId || '';
            accountNameField.value = selectedAccount.accountName || '';
            
            // Restore readonly state
            if (wasAccountIdReadonly) accountIdField.setAttribute('readonly', 'readonly');
            if (wasAccountNameReadonly) accountNameField.setAttribute('readonly', 'readonly');
            
            console.log('Repayment Account selected:', selectedAccount);
        }
    });
}

function searchDonor() {
    showMessage('Donor search feature - connect to backend', 'info');
}

function searchOfficer() {
    if (typeof window.OfficerSearchModal === 'undefined') {
        console.error('Officer Search modal not available');
        showMessage('Officer search modal is not loaded', 'error');
        return;
    }

    // Pass the branchId to the search modal if available
    const currentBranchId = branchId.value.trim() || "0603";

    window.OfficerSearchModal.open(currentBranchId, (selectedOfficer) => {
        if (selectedOfficer) {
            // Check if fields are readonly and temporarily enable them
            const officerIdField = officerId;
            const officerNameField = officerName;
            
            const wasIdReadonly = officerIdField.hasAttribute('readonly');
            const wasNameReadonly = officerNameField.hasAttribute('readonly');
            
            if (wasIdReadonly) officerIdField.removeAttribute('readonly');
            if (wasNameReadonly) officerNameField.removeAttribute('readonly');
            
            // Set the values
            officerIdField.value = selectedOfficer.OfficerID || '';
            officerNameField.value = selectedOfficer.Name || '';
            
            // Restore readonly state
            if (wasIdReadonly) officerIdField.setAttribute('readonly', 'readonly');
            if (wasNameReadonly) officerNameField.setAttribute('readonly', 'readonly');
            
            console.log('Officer selected:', selectedOfficer);
            showMessage('Officer selected successfully', 'success');
        }
    });
}

function searchSalesOfficer() {
    if (typeof window.OfficerSearchModal === 'undefined') {
        console.error('Officer Search modal not available');
        showMessage('Sales Officer search modal is not loaded', 'error');
        return;
    }

    const currentBranchId = branchId.value.trim() || '0603';

    window.OfficerSearchModal.open(currentBranchId, (selectedOfficer) => {
        if (!selectedOfficer) {
            return;
        }

        const salesOfficerIdField = salesOfficerId;
        const salesOfficerNameField = salesOfficerName;

        const wasIdReadonly = salesOfficerIdField.hasAttribute('readonly');
        const wasNameReadonly = salesOfficerNameField.hasAttribute('readonly');

        if (wasIdReadonly) salesOfficerIdField.removeAttribute('readonly');
        if (wasNameReadonly) salesOfficerNameField.removeAttribute('readonly');

        salesOfficerIdField.value = selectedOfficer.OfficerID || '';
        salesOfficerNameField.value = selectedOfficer.Name || '';

        if (wasIdReadonly) salesOfficerIdField.setAttribute('readonly', 'readonly');
        if (wasNameReadonly) salesOfficerNameField.setAttribute('readonly', 'readonly');

        console.log('Sales Officer selected:', selectedOfficer);
        showMessage('Sales Officer selected successfully', 'success');
    }, { mode: 'sales-officer' });
}

function showMessage(message, type) {
    if (window.NotificationService) {
        window.NotificationService.showToast(message, type);
    } else {
        // Fallback if service not loaded
        const icon = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        alert(`${icon[type] || ''} ${message}`);
    }
}

// Loan Utilization Modal Functions (Duplicate removed - using function above)

function closeLoanUtilizationModal() {
    const modalElement = document.getElementById('loanUtilizationModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
        modal.hide();
    }
    sectionDropdown.value = 'dataentry';
}

function openChargeRatesModal() {
    // Close any open modals first
    closeAllModals();
    
    console.log('Opening Charge Rates Modal');
    const modalElement = document.getElementById('chargeRatesModal');
    
    if (!modalElement) {
        console.error('Charge Rates Modal element not found!');
        showMessage('Error: Charge Rates modal not found. Please refresh the page.', 'error');
        sectionDropdown.value = 'dataentry';
        return;
    }
    
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    console.log('Charge Rates Modal opened');
    
    // Reset dropdown when modal closes
    modalElement.addEventListener('hidden.bs.modal', () => {
        console.log('Charge Rates Modal closed');
        sectionDropdown.value = 'dataentry';
    }, { once: true });
}

function closeChargeRatesModal() {
    console.log('Closing Charge Rates Modal');
    const modalElement = document.getElementById('chargeRatesModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
        modal.hide();
    }
    sectionDropdown.value = 'dataentry';
}

// Expose getLoanApplicationData to window (already defined above, remove duplicate)
})();