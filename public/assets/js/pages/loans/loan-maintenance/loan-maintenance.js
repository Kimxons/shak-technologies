(function (global) {
    console.log('%c============================================', 'background: #222; color: #bada55; font-size: 14px;');
    console.log('%c LOAN MAINTENANCE JS LOADING', 'background: #222; color: #bada55; font-size: 14px;');
    console.log('%c============================================', 'background: #222; color: #bada55; font-size: 14px;');
    
    if (global.__LoanMaintenanceLoaded) {
      console.warn("loan-maintenance.js already loaded; skipping duplicate execution.");
      return;
    }
    global.__LoanMaintenanceLoaded = true;

    let currentEventType = "None";
    let currentMode = "entry";
    let Direction = 0;
    let DirectionType = "A"; // 'A' = Account, 'S' = Series, 'R' = RefNo
    let lastGetLoanKey = "";
    let EventID = "NONE";
    
    // Store LoanStatusID mappings for icon display
    let loanStatusIdMap = {};

    // ============================================================================
    // CHILD FORM MANAGEMENT (Similar to Account Maintenance pattern)
    // ============================================================================
    const CHILD_FORMS = {
        'loan-collaterals': 'dataentry/loan-collaterals.html',
        'writeoff-recovery': 'dataentry/writeoff-recovery.html',
        'insurance': 'dataentry/insurance.html',
        'guarantor': 'dataentry/guarantor.html',
        'user-defined-fields': 'dataentry/user-defined-fields.html',
        'release-freeze': 'dataentry/release-freeze.html',
        'loan-closing-opening': 'dataentry/loan-closing-opening.html',
        'loan-legal-remarks': 'dataentry/loan-legal-remarks.html',
        'loan-utilization': 'dataentry/loan-utilization.html',
        'loan-repayment-reversal': 'dataentry/loan-repayment-reversal.html',
        'legal-expense': 'dataentry/legal-expense.html',
        'repayment-accounts': 'dataentry/repayment-accounts.html',
        'instruction': 'dataentry/instruction.html',
        'loan-disbursement-reversal': 'dataentry/loan-disbursement-reversal.html',
        'installment-schedule': 'view/installment-schedule.html',
        'loan-statement': 'view/loan-statement.html',
        'loan-history': 'view/loan-history.html',
        'loan-collaterals': 'view/loan-collaterals.html',
        'guarantors': 'view/guarantors.html',
        'loan-interest-worksheet': 'view/loan-interest-worksheet.html',
        'penalty-interest-waive-off-history': 'view/penalty-interest-waive-off-history.html'
    };

    let activeSubmodule = null;

    function getOverlayEls() {
        return {
            overlay: document.querySelector('[data-child-inline]'),
            iframe: document.querySelector('[data-child-iframe]'),
            mainForm: document.querySelector('[data-main-form]'),
            mainContainer: document.querySelector('.main-container')
        };
    }

    function openChildForm(childKey) {
        // Check if another submodule is already active
        if (activeSubmodule) {
            showSystemToast('Please close \'' + activeSubmodule + '\' first');
            return;
        }

        const path = CHILD_FORMS[childKey];
        const { iframe } = getOverlayEls();
        if (!path || !iframe) return;

        // Show loading state
        showPageLoader(true, 'Loading form...');
        iframe.onload = function () {
            showPageLoader(false);
        };
        const cacheBust = `v=${Date.now()}`;
        const separator = path.includes('?') ? '&' : '?';
        iframe.src = `${path}${separator}${cacheBust}`;
        setOverlayOpen(true);
        activeSubmodule = childKey;
    }

    function closeChildForm() {
        const { iframe } = getOverlayEls();
        if (iframe) iframe.src = 'about:blank';
        showPageLoader(false);
        setOverlayOpen(false);
        activeSubmodule = null;
    }

    function setOverlayOpen(isOpen) {
        const { overlay, mainForm, mainContainer } = getOverlayEls();
        if (!overlay || !mainContainer) return;
        
        if (isOpen) {
            // Animate: Hide main form, show child form
            mainContainer.classList.add('child-opening');
            overlay.hidden = false;
            
            // Small delay to ensure CSS transitions work
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    mainContainer.classList.add('child-open');
                    overlay.classList.add('is-visible');
                    overlay.classList.remove('is-closing');
                    
                    // Clean up opening state after animation
                    setTimeout(() => {
                        mainContainer.classList.remove('child-opening');
                        if (mainForm) mainForm.hidden = true;
                    }, 350);
                });
            });
        } else {
            // Animate: Hide child form, show main form
            mainContainer.classList.add('child-closing');
            mainContainer.classList.remove('child-expanded'); // Reset expanded state
            overlay.classList.add('is-closing');
            overlay.classList.remove('is-visible');
            
            // Reset maximize button icon if it exists
            const maximizeBtn = document.getElementById('maximizeChildBtn');
            if (maximizeBtn) {
                maximizeBtn.querySelector('i').className = 'bi bi-square';
                maximizeBtn.setAttribute('title', 'Maximize');
            }
            
            // Show main form immediately for the animation
            if (mainForm) mainForm.hidden = false;
            
            // Wait for animation to complete
            setTimeout(() => {
                overlay.hidden = true;
                mainContainer.classList.remove('child-open', 'child-closing');
            }, 350);
        }
    }

    function showPageLoader(show, message = 'Loading...') {
        const overlay = document.getElementById('pageLoadingOverlay');
        const textEl = document.getElementById('pageLoadingText');
        if (!overlay) return;
        
        if (textEl) textEl.textContent = message;
        overlay.hidden = !show;
    }

    function showSystemToast(message, options = {}) {
        // Simple fallback if toast system not available
        if (window.LoanMaintenanceView && window.LoanMaintenanceView.showErrorMessage) {
            window.LoanMaintenanceView.showErrorMessage(message);
        } else {
            console.warn('[LoanMaintenance] Toast:', message);
        }
    }
  
    // DOM Elements
    const form = document.getElementById("loan-form");
    const navButtons = Array.from(document.querySelectorAll("[data-action-nav]"));
    
    // Selects
    const selects = [
        'LoanPurpose',
        'HealthCode',
        'RepaymentMethod', 
        'LineOfBusiness',
        'LegalStatus'
    ];

    /**
     * Update global state for child forms (submodules)
     * Child forms need access to BranchID, AccountID, OperatorID, ClientID from parent
     */
    function updateLoanMaintenanceState() {
      if (!form) return;
      
      const branchID = (document.getElementById('BranchID')?.value || '').trim();
      const accountID = (document.getElementById('AccountID')?.value || '').trim();
      const operatorID = (typeof window.getOperatorId === 'function') ? window.getOperatorId() : '';
      const clientID = (document.getElementById('ClientID')?.value || '').trim();
      
      window.LoanMaintenanceState = {
        OurBranchID: branchID,
        AccountID: accountID,
        OperatorID: operatorID,
        ClientID: clientID,
        LoanSeries: (document.getElementById('LoanSeries')?.value || '').trim(),
        LoanID: (document.getElementById('LoanID')?.value || '').trim()
      };
      
      console.log('[LoanMaintenance] State updated:', window.LoanMaintenanceState);
    }

    function resetLoanMaintenanceForm() {
      if (!form) return;
      const defaultBranch = getLoggedInBranchId && getLoggedInBranchId();
      const fields = form.querySelectorAll('input, select, textarea');
      fields.forEach((el) => {
        if (el.id === "BranchID") {
          el.disabled = false;
          el.value = defaultBranch || "";
          return;
        }
        if (el.type === "checkbox") {
          el.checked = false;
          el.disabled = false;
          return;
        }
        if (el.tagName === "SELECT") {
          el.disabled = false;
          el.value = "";
          return;
        }
        el.disabled = false;
        el.value = "";
      });

      // Auto-populate BranchName using the BranchID if possible, without opening a modal
      if (defaultBranch) {
        // If LookupService.getBranchNameById is available and synchronous, use it
        if (window.LookupService?.getBranchNameById) {
          document.getElementById('BranchName').value = window.LookupService.getBranchNameById(defaultBranch) || '';
        } else if (window.LookupService?.getBranchName) {
          // If an async method is available, use it
          window.LookupService.getBranchName(defaultBranch).then(function(name) {
            document.getElementById('BranchName').value = name || '';
          }).catch(function() {
            document.getElementById('BranchName').value = '';
          });
        } else {
          // Otherwise, just clear the BranchName field
          document.getElementById('BranchName').value = '';
        }
      }

      // Disable navigation buttons when form is reset
      disableNavigationButtons();
      
      // Update state for child forms
      updateLoanMaintenanceState();
    }

    // Wait for LookupService to be available before running a callback
    function waitForLookupService(callback, maxWaitMs = 5000, intervalMs = 50) {
      const start = Date.now();
      (function poll() {
        if (window.LookupService && (window.LookupService.getBranchNameById || window.LookupService.getBranchName)) {
          callback();
        } else if (Date.now() - start < maxWaitMs) {
          setTimeout(poll, intervalMs);
        } else {
          // Timeout: still run callback, but LookupService may not be available
          callback();
        }
      })();
    }

    /**
     * Initialize section collapse/expand functionality with aria-expanded support
     */
    function initializeSectionToggles() {
      document.querySelectorAll('.form-section').forEach((section) => {
        const header = section.querySelector('[data-section-toggle]');
        const toggleBtn = section.querySelector('.section-toggle-btn');
        
        if (!header || !toggleBtn) return;

        // Initialize aria-expanded state from HTML
        const isExpanded = toggleBtn.getAttribute('aria-expanded') !== 'false';
        
        // Restore collapse state from localStorage if previously set
        const sectionId = section.getAttribute('data-section');
        if (sectionId) {
          const savedState = localStorage.getItem(`lm-section-${sectionId}`);
          if (savedState !== null) {
            const shouldCollapse = savedState === 'collapsed';
            if (shouldCollapse && !section.classList.contains('collapsed')) {
              section.classList.add('collapsed');
              toggleBtn.setAttribute('aria-expanded', 'false');
            } else if (!shouldCollapse && section.classList.contains('collapsed')) {
              section.classList.remove('collapsed');
              toggleBtn.setAttribute('aria-expanded', 'true');
            }
          }
        }

        // Add click handler for toggle button
        header.addEventListener('click', (e) => {
          // Don't toggle if clicking a button (like search buttons)
          if (e.target.closest('button') && !e.target.closest('.section-toggle-btn')) return;

          const isCurrentlyExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
          const newState = !isCurrentlyExpanded;
          
          toggleBtn.setAttribute('aria-expanded', newState ? 'true' : 'false');
          section.classList.toggle('collapsed', !newState);

          // Save state to localStorage
          if (sectionId) {
            localStorage.setItem(`lm-section-${sectionId}`, newState ? 'expanded' : 'collapsed');
          }
        });
      });
    }

    /**
     * Wire sidebar items with data-child-form attribute to open child modules
     */
    function wireSidebar() {
        document.querySelectorAll('.sidebar-item[data-child-form], .sidebar-item--enhanced[data-child-form]').forEach(item => {
            item.addEventListener('click', function (e) {
                e.stopPropagation();

                // Set active state
                document.querySelectorAll('.sidebar-item[data-child-form], .sidebar-item--enhanced[data-child-form]').forEach(i => i.classList.remove('active'));
                this.classList.add('active');

                const childKey = this.getAttribute('data-child-form');
                if (childKey) openChildForm(childKey);
            });
        });

        // Wire close button for child form
        const childOverlay = document.querySelector('[data-child-inline]');
        if (childOverlay) {
            // Close when clicking maximize button (for now just closes)
            const maximizeBtn = document.getElementById('maximizeChildBtn');
            if (maximizeBtn) {
                maximizeBtn.addEventListener('click', closeChildForm);
            }

            // Close on Escape key
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && activeSubmodule) {
                    closeChildForm();
                }
            });
        }

        // Handle message from child iframe to close the form
        window.addEventListener('message', function (event) {
            if (event.data && (event.data.action === 'close-child-form' || event.data.action === 'submoduleClosed')) {
                closeChildForm();
            }
        });
    }

    function init() {
        console.log("=".repeat(50));
        console.log("[LoanMaintenance] INITIALIZATION STARTED");
        console.log("=".repeat(50));
        
        console.log('[LoanMaintenance] Checking global services...');
        console.log('  - LoanMaintenanceService:', typeof global.LoanMaintenanceService);
        console.log('  - SearchService:', typeof global.SearchService);
        console.log('  - LookupService:', typeof global.LookupService);
        console.log('  - CoreApi:', typeof global.CoreApi);
        
        // Check if buttons exist
        const viewBtn = document.querySelector('[data-action-mode="view"]');
        const editBtn = document.querySelector('[data-action-mode="edit"]');
        const saveBtn = document.querySelector('[data-action-submit="save"]');
        const cancelBtn = document.querySelector('[data-action-submit="cancel"]');
        
        console.log('[LoanMaintenance] Button elements found:');
        console.log('  - View button:', viewBtn ? 'YES' : 'NOT FOUND');
        console.log('  - Edit button:', editBtn ? 'YES' : 'NOT FOUND');
        console.log('  - Save button:', saveBtn ? 'YES' : 'NOT FOUND');
        console.log('  - Cancel button:', cancelBtn ? 'YES' : 'NOT FOUND');
        

      // Always reset form on first load, but wait for LookupService to be available
      waitForLookupService(resetLoanMaintenanceForm);

        populatePlaceholders();
        initNavigation();
        initNavSectionToggles();
        initLoanLookup();
        initShellActions();
        initializeDropdowns();
        initializeLookupButtons();
        initializeTabKeyLookup();
        initializeSectionToggles();
        wireSidebar();
        bindEventTypeButtons();
        syncEventType("None");
        
        // Initialize button states - Entry mode: only View is enabled
        console.log('[LoanMaintenance] Setting initial button state (Entry mode)...');
        setEntryMode();
        
        console.log("=".repeat(50));
        console.log("[LoanMaintenance] INITIALIZATION COMPLETED");
        console.log("=".repeat(50));
    }

    /**
     * Initialize all dropdowns with system code data
     */
    async function initializeDropdowns() {
      try {
        const LoanMaintenanceService = global.LoanMaintenanceService;
        if (!LoanMaintenanceService) {
          console.warn('[LoanMaintenance] LoanMaintenanceService not available yet');
          return;
        }

        console.log('[LoanMaintenance] Initializing dropdowns...');
        await LoanMaintenanceService.initializeAllDropdowns();
        console.log('[LoanMaintenance] Dropdowns initialized successfully');
        
        // Fetch LoanStatusID system codes for icon display logic
        fetchLoanStatusCodes();
      } catch (error) {
        console.error('[LoanMaintenance] Failed to initialize dropdowns:', error);
      }
    }

    /**
     * Fetch LoanStatusID codes from database
     */
    async function fetchLoanStatusCodes() {
      try {
        if (!window.LookupService) {
          console.warn('[LoanMaintenance] LookupService not available');
          return;
        }

        console.log('[LoanMaintenance] Fetching LoanStatusID codes...');
        
        // Fetch system codes for LoanStatusID using LookupService
        const codeOptions = await window.LookupService.getSystemCodeOptions('LoanStatusID');
        
        if (codeOptions && Array.isArray(codeOptions) && codeOptions.length > 0) {
          // Map code to description: { 'A': 'Active Loan', 'F': 'Fully Paid', etc. }
          // LookupService returns array of { value, label, order }
          codeOptions.forEach((item) => {
            loanStatusIdMap[item.value] = {
              code: item.value,
              description: item.label,
              isActive: true // Assume active if returned by service
            };
          });
          
          console.log('[LoanMaintenance] LoanStatusID codes loaded:', loanStatusIdMap);
        } else {
          console.warn('[LoanMaintenance] No LoanStatusID codes returned from LookupService');
        }
      } catch (error) {
        console.error('[LoanMaintenance] Error fetching LoanStatusID codes:', error);
      }
    }

    /**
     * Attach search event listeners for lookup buttons
     */
    function initializeLookupButtons() {
      const getValue = (id) => document.getElementById(id)?.value?.trim?.() || "";
      const moduleID = '4300';
      const getOperatorId = () => (typeof window.getOperatorId === 'function' ? window.getOperatorId() : 'web_portal');
      const getOurBranchId = () => getValue('BranchID');

      // Wait for SearchModal to be available
      function waitForSearchModal(callback, maxWaitMs = 5000, intervalMs = 100) {
        const start = Date.now();
        (function poll() {
          if (window.SearchModal) {
            callback();
          } else if (Date.now() - start < maxWaitMs) {
            setTimeout(poll, intervalMs);
          } else {
            console.warn('[LoanMaintenance] SearchModal not available after timeout');
          }
        })();
      }

      waitForSearchModal(() => {
        // Create modal instances once and reuse them
        const branchModal = new window.SearchModal({
          prefix: 'lm-branch-search',
          moduleID,
          getOperatorId,
          getOurBranchId
        });

        // BranchID search
        const branchSearchBtn = document.querySelector('button[aria-label="Lookup branch"]');
        if (branchSearchBtn) {
          branchSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const branchIDValue = getValue('BranchID');
            branchModal.open({
              tableID: 'BranchID',
              searchFields: [
                { name: 'BranchID', label: 'Branch ID', column: 'OurBranchID', value: branchIDValue },
                { name: 'BranchName', label: 'Branch Name', column: 'BranchName' }
              ],
              autoSearch: !!branchIDValue,
              onSelect: (record) => {
                document.getElementById('BranchID').value = record.OurBranchID || '';
                document.getElementById('BranchName').value = record.BranchName || '';
                // Update state for child forms
                updateLoanMaintenanceState();
              }
            });
          });
        }


        // Create client modal instance
        const clientModal = new window.SearchModal({
          prefix: 'lm-client-search',
          moduleID,
          getOperatorId,
          getOurBranchId
        });

        // ClientID search
        const clientSearchBtn = document.querySelector('button[aria-label="Search client"]');
        if (clientSearchBtn) {
          clientSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const branchID = getValue('BranchID');
            if (!branchID) {
              alert('Please enter Branch ID first');
              return;
            }
            const clientIDValue = getValue('ClientID');
            clientModal.open({
              tableID: 'ClientAccountID',
              whereStmt: `ProductTypeID='LN' AND OurBranchID = '${branchID}'`,
              searchFields: [
                { name: 'ClientID', label: 'Client ID', column: 'ClientID', value: clientIDValue },
                { name: 'ClientName', label: 'Client Name', column: 'ClientName' }
              ],
              autoSearch: !!clientIDValue,
              onSelect: (record) => {
                document.getElementById('ClientID').value = record.ClientID || '';
                const clientName = record.ClientName || record.Name || '';
                const clientNameEl = document.getElementById('ClientName');
                if (clientNameEl) clientNameEl.value = clientName;
              }
            });
          });
        }

        // Create account modal instance
        const accountModal = new window.SearchModal({
          prefix: 'lm-account-search',
          moduleID,
          getOperatorId,
          getOurBranchId
        });

        // AccountID search
        const accountSearchBtn = document.querySelector('button[aria-label="Search account"]');
        if (accountSearchBtn) {
          accountSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const branchID = getValue('BranchID');
            const clientID = getValue('ClientID');
            if (!branchID) {
              alert('Please enter Branch ID first');
              return;
            }
            let whereStmt = `OurBranchID = '${branchID}'`;
            if (clientID) {
              whereStmt += ` AND ClientID = '${clientID}'`;
            }
            const accountIDValue = getValue('AccountID');
            accountModal.open({
              tableID: 'LoanID',
              whereStmt,
              searchFields: [
                { name: 'AccountID', label: 'Account ID', column: 'AccountID', value: accountIDValue },
                { name: 'LoanID', label: 'Loan ID', column: 'LoanID' },
                { name: 'LoanSeries', label: 'Loan Series', column: 'LoanSeries' }
              ],
              autoSearch: !!accountIDValue,
              onSelect: (record) => {
                // Use the record that was clicked by the user
                document.getElementById('AccountID').value = record.AccountID || '';
                document.getElementById('LoanSeries').value = record.LoanSeries || '';
                const accountName = record.AccountName || record.Name || '';
                const accountNameEl = document.getElementById('AccountName');
                if (accountNameEl) accountNameEl.value = accountName;
                // Update state for child forms
                updateLoanMaintenanceState();
              }
            });
          });
        }

        // Create loan series modal instance
        const loanSeriesModal = new window.SearchModal({
          prefix: 'lm-loanseries-search',
          moduleID,
          getOperatorId,
          getOurBranchId
        });

        // LoanSeries search
        const loanSeriesSearchBtn = document.querySelector('button[aria-label="Search loan series"]');
        if (loanSeriesSearchBtn) {
          loanSeriesSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const branchID = getValue('BranchID');
            const accountID = getValue('AccountID');
            if (!branchID || !accountID) {
              alert('Please enter Branch ID and Account ID first');
              return;
            }
            const loanSeriesValue = getValue('LoanSeries');
            loanSeriesModal.open({
              tableID: 'LoanSeriesID',
              whereStmt: `OurBranchID = '${branchID}' AND AccountID = '${accountID}'`,
              searchFields: [
                { name: 'LoanSeries', label: 'Loan Series', column: 'LoanSeries', value: loanSeriesValue },
                { name: 'LoanRefNo', label: 'Loan Ref No', column: 'LoanRefNo' }
              ],
              autoSearch: !!loanSeriesValue,
              onSelect: (record) => {
                document.getElementById('LoanSeries').value = record.LoanSeries || '';
                document.getElementById('LoanRefNo').value = record.LoanRefNo || '';
              }
            });
          });
        }

        // Create repayment modal instance
        const repaymentModal = new window.SearchModal({
          prefix: 'lm-repayment-search',
          moduleID,
          getOperatorId,
          getOurBranchId
        });

        // MainRepaymentAccountID search
        const repaymentSearchBtn = document.querySelector('button[aria-label="Search repayment account"]');
        if (repaymentSearchBtn) {
          repaymentSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const clientID = getValue('ClientID');
            if (!clientID) {
              alert('Please enter Client ID first');
              return;
            }
            const repaymentIDValue = getValue('RepaymentAccountID');
            repaymentModal.open({
              tableID: 'RepaymentAccountID',
              whereStmt: `ClientID = '${clientID}'`,
              searchFields: [
                { name: 'AccountID', label: 'Repayment Account ID', column: 'AccountID', value: repaymentIDValue },
                { name: 'Name', label: 'Account Name', column: 'Name' }
              ],
              autoSearch: !!repaymentIDValue,
              onSelect: (record) => {
                document.getElementById('RepaymentAccountID').value = record.AccountID || '';
                const accountName = record.Name || '';
                const accountNameEl = document.getElementById('RepaymentAccountName');
                if (accountNameEl) accountNameEl.value = accountName;
              }
            });
          });
        }

        // FundID search
        const fundSearchBtn = document.querySelector('button[aria-label="Search fund"]');
        if (fundSearchBtn) {
          fundSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const fundIDValue = getValue('FundID');
            const fundModal = new window.SearchModal({
              moduleID,
              getOperatorId,
              getOurBranchId
            });
            fundModal.open({
              tableID: 'FundID',
              searchFields: [
                { name: 'FundID', label: 'Fund ID', column: 'FundID', value: fundIDValue },
                { name: 'FundName', label: 'Fund Name', column: 'FundName' }
              ],
              autoSearch: !!fundIDValue,
              onSelect: (record) => {
                document.getElementById('FundID').value = record.FundID || '';
              }
            });
          });
        }

        // LegalOfficer search
        const legalOfficerSearchBtn = document.querySelector('button[aria-label="Search legal officer"]');
        if (legalOfficerSearchBtn) {
          legalOfficerSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const branchID = getValue('BranchID');
            if (!branchID) {
              alert('Please enter Branch ID first');
              return;
            }
            const legalOfficerValue = getValue('LegalOfficer');
            const legalOfficerModal = new window.SearchModal({
              moduleID,
              getOperatorId,
              getOurBranchId
            });
            legalOfficerModal.open({
              tableID: 'LegalOfficer',
              whereStmt: `OurBranchID = '${branchID}'`,
              searchFields: [
                { name: 'LegalOfficer', label: 'Legal Officer', column: 'LegalOfficer', value: legalOfficerValue },
                { name: 'OfficerName', label: 'Officer Name', column: 'OfficerName' }
              ],
              autoSearch: !!legalOfficerValue,
              onSelect: (record) => {
                document.getElementById('LegalOfficer').value = record.LegalOfficer || '';
              }
            });
          });
        }
      });
    }

    /**
     * Initialize auto-lookup on search fields - Mirrors legacy GetDescription logic
     * When cursor leaves a field (blur) with a value, make direct DB call to fetch related data
     */
    function initializeTabKeyLookup() {
      const getValue = (id) => {
        const el = document.getElementById(id);
        return el ? (el.value || '').trim() : '';
      };

      const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
      };

      const getOperatorId = () => {
        try {
          const session = global.AuthService?.getSession?.();
          return session?.operatorId || session?.operatorID || session?.name || "web_portal";
        } catch {
          return "web_portal";
        }
      };

      /**
       * Perform lookup - mirrors legacy GetDescription() logic
       * Queries database and populates related field
       */
      const performLookup = async (fieldId, relatedFieldId, tableID, whereColumn, advFilterString = '') => {
        const value = getValue(fieldId);
        
        // Don't proceed if field is empty
        if (!value) {
          setValue(relatedFieldId, '');
          return null;
        }

        try {
          if (!window.SearchService) {
            console.warn('[LoanMaintenance] SearchService not available');
            return null;
          }

          // Build WHERE statement with LIKE operator (partial match)
          const whereStmt = `${whereColumn} LIKE '%${value.replace(/'/g, "''")}'`;
          const operatorId = getOperatorId();
          const branchId = getValue('BranchID');

          console.log('[LoanMaintenance] GetDescription lookup:', {
            TableID: tableID,
            WhereStmt: whereStmt,
            AdvFilterString: advFilterString,
            OperatorID: operatorId,
            ModuleID: '4300'
          });

          // Call SearchService with proper parameters
          const response = await window.SearchService.searchClients({
            TableID: tableID,
            WhereStmt: whereStmt,
            AdvFilterString: advFilterString,
            PrevOrNext: '1',
            RefID: '',
            OperatorID: operatorId,
            ModuleID: '4300',
            OurBranchID: branchId || value,
            SearchKey: ''
          });

          if (!response) {
            console.warn('[LoanMaintenance] No response from SearchService');
            return null;
          }

          // Handle response data - response structure has Details array
          const responseData = response.Details || response.Data || [];
          if (responseData && responseData.length > 0) {
            const record = responseData[0];
            let displayValue = '';

            // Map field names to response fields based on tableID
            switch (tableID) {
              case 'BranchID':
                displayValue = record.BranchName || record.Name || '';
                break;
              case 'ClientAccountID':
                displayValue = record.ClientName || record.Name || '';
                break;
              case 'LoanID':
                displayValue = record.AccountName || record.Name || '';
                break;
              case 'FundID':
                displayValue = record.FundName || record.Name || '';
                break;
              case 'LegalOfficer':
                displayValue = record.OfficerName || record.Name || '';
                break;
              default:
                displayValue = record.Name || '';
            }

            console.log('[LoanMaintenance] GetDescription result found:', { fieldId, displayValue, record });
            setValue(relatedFieldId, displayValue);
            return record; // Return the record so caller can access additional fields
          } else {
            // No match found - clear related field
            console.warn(`[LoanMaintenance] No match found for ${fieldId}: ${value}`);
            setValue(relatedFieldId, '');
            return null;
          }
        } catch (error) {
          console.error(`[LoanMaintenance] GetDescription lookup failed for ${fieldId}:`, error);
          // Fail silently - user can manually search if needed
          return null;
        }
      };

      // Branch ID - lookup branch details
      const branchIdEl = document.getElementById('BranchID');
      if (branchIdEl) {
        branchIdEl.addEventListener('blur', () => {
          performLookup('BranchID', 'BranchName', 'BranchID', 'OurBranchID');
        });
      }

      // Client ID - lookup client details (from ClientAccountID table with ProductTypeID filter)
      const clientIdEl = document.getElementById('ClientID');
      if (clientIdEl) {
        clientIdEl.addEventListener('blur', () => {
          const advFilter = `ProductTypeID='LN'`;
          performLookup('ClientID', 'ClientName', 'ClientAccountID', 'ClientID', advFilter);
        });
      }

      // Account ID - lookup loan account details (also populates LoanSeries)
      const accountIdEl = document.getElementById('AccountID');
      if (accountIdEl) {
        accountIdEl.addEventListener('blur', async () => {
          const value = getValue('AccountID');
          if (!value) {
            setInputValue('AccountName', '');
            setInputValue('LoanSeries', '');
            return;
          }
          try {
            if (!window.SearchService) {
              console.warn('[LoanMaintenance] SearchService not available');
              return;
            }
            const branchId = getValue('BranchID');
            // Build WHERE statement only (DB already orders by LoanSeries DESC)
            let whereStmt = `AccountID = '${value.replace(/'/g, "''")}'`;
            if (branchId) {
              whereStmt += ` AND OurBranchID = '${branchId.replace(/'/g, "''")}'`;
            }
            const response = await window.SearchService.searchClients({
              TableID: 'LoanID',
              WhereStmt: whereStmt,
              AdvFilterString: '',
              PrevOrNext: '1',
              RefID: '',
              OperatorID: getOperatorId(),
              ModuleID: '4300',
              OurBranchID: branchId || value,
              SearchKey: ''
            });
            const responseData = response?.Details || response?.Data || [];
            if (responseData.length > 0) {
              const record = responseData[0]; // Always pick first row (most recent LoanSeries)
              console.log('[LoanMaintenance] AccountID blur: Picked first record from', responseData.length, 'results. LoanSeries:', record.LoanSeries);
              setInputValue('AccountName', record.AccountName || record.Name || '');
              setInputValue('LoanSeries', record.LoanSeries || '');
            } else {
              console.warn('[LoanMaintenance] AccountID blur: No records found for AccountID:', value);
              setInputValue('AccountName', '');
              setInputValue('LoanSeries', '');
            }
          } catch (error) {
            console.error('[LoanMaintenance] AccountID blur lookup failed:', error);
            setInputValue('AccountName', '');
            setInputValue('LoanSeries', '');
          }
        });
      }

      // Loan Series - lookup loan series details
      const loanSeriesEl = document.getElementById('LoanSeries');
      if (loanSeriesEl) {
        loanSeriesEl.addEventListener('blur', () => {
          const branchId = getValue('BranchID');
          const accountId = getValue('AccountID');
          const advFilter = branchId ? `OurBranchID='${branchId}' AND AccountID='${accountId}'` : '';
          performLookup('LoanSeries', 'LoanSeries', 'LoanSeriesID', 'LoanSeries', advFilter);
        });
      }

      // Repayment Account ID - lookup repayment account details
      const repaymentIdEl = document.getElementById('RepaymentAccountID');
      if (repaymentIdEl) {
        repaymentIdEl.addEventListener('blur', () => {
          const advFilter = `ProductTypeID in ('SB','CA')`;
          performLookup('RepaymentAccountID', 'RepaymentAccountID', 'RepaymentAccountID', 'RepaymentAccountID', advFilter);
        });
      }

      // Fund ID - lookup fund details
      const fundIdEl = document.getElementById('FundID');
      if (fundIdEl) {
        fundIdEl.addEventListener('blur', () => {
          performLookup('FundID', 'FundID', 'FundID', 'FundID');
        });
      }

      // Legal Officer - lookup officer details
      const legalOfficerEl = document.getElementById('LegalOfficer');
      if (legalOfficerEl) {
        legalOfficerEl.addEventListener('blur', () => {
          const branchId = getValue('BranchID');
          const bankId = document.getElementById('_BankID')?.value || '';
          const advFilter = branchId ? `BankID='${bankId}' AND ReportingBranchID='${branchId}' AND OfficerTypeID='CO'` : '';
          performLookup('LegalOfficer', 'LegalOfficerName', 'LegalOfficer', 'LegalOfficer', advFilter);
        });
      }
    }

    // =========================================================================
    // INLINE VALIDATION SYSTEM
    // =========================================================================
    function clearAllFieldErrors() {
        document.querySelectorAll('.field-invalid').forEach(el => el.classList.remove('field-invalid'));
        document.querySelectorAll('.field-error-message').forEach(el => el.remove());
        const summary = document.querySelector('.validation-summary');
        if (summary) summary.classList.remove('is-visible');
    }

    function highlightInvalidField(el) {
        if (!el) return;
        el.classList.add('field-invalid');
    }

    function showValidationSummary(message) {
        const targetSection = document.querySelector('form') || document.querySelector('[data-main-form]');
        if (!targetSection) return;
        let summary = targetSection.querySelector('.validation-summary');
        if (!summary) {
            summary = document.createElement('div');
            summary.className = 'validation-summary';
            summary.setAttribute('role', 'alert');
            summary.setAttribute('aria-live', 'polite');
            const icon = document.createElement('i');
            icon.className = 'bi bi-exclamation-circle validation-summary__icon';
            const text = document.createElement('span');
            text.className = 'validation-summary__text';
            const closeBtn = document.createElement('button');
            closeBtn.className = 'validation-summary__close';
            closeBtn.setAttribute('type', 'button');
            closeBtn.innerHTML = '<i class="bi bi-x"></i>';
            closeBtn.addEventListener('click', hideValidationSummary);
            summary.appendChild(icon);
            summary.appendChild(text);
            summary.appendChild(closeBtn);
            targetSection.insertBefore(summary, targetSection.firstChild);
        }
        summary.classList.remove('validation-summary--success');
        const textEl = summary.querySelector('.validation-summary__text');
        if (textEl) textEl.textContent = message;
        summary.classList.add('is-visible');
    }

    function hideValidationSummary() {
        document.querySelectorAll('.validation-summary').forEach(s => s.classList.remove('is-visible'));
    }

    function displayValidationErrors(validation) {
        clearAllFieldErrors();
        if (validation.ok || !validation.invalidEls || validation.invalidEls.length === 0) return;
        validation.invalidEls.forEach(el => highlightInvalidField(el));
        const fieldNames = validation.invalidEls.map(el => {
            const id = el.id || el.name;
            if (id) {
                const label = document.querySelector(`label[for="${id}"]`);
                if (label) return label.textContent.replace(/[*:]/g, '').trim();
                return id.replace(/([A-Z])/g, ' $1').replace(/ID$/i, ' ID').trim();
            }
            return 'Unknown Field';
        }).filter(Boolean);
        let summaryMessage;
        if (fieldNames.length === 1) {
            summaryMessage = `Please complete the required field: ${fieldNames[0]}`;
        } else if (fieldNames.length <= 3) {
            summaryMessage = `Please complete the required fields: ${fieldNames.join(', ')}`;
        } else {
            const displayNames = fieldNames.slice(0, 3).join(', ');
            summaryMessage = `Please complete the required fields: ${displayNames} and ${fieldNames.length - 3} more`;
        }
        showValidationSummary(summaryMessage);
        if (validation.focusEl && typeof validation.focusEl.focus === 'function') {
            validation.focusEl.focus();
        }
    }

    function initShellActions() {
      const viewBtn = document.querySelector('[data-action-mode="view"]');
      if (viewBtn && viewBtn.dataset.lmBound !== "1") {
        viewBtn.dataset.lmBound = "1";
        viewBtn.addEventListener("click", (e) => {
          e.preventDefault();
          console.log('[LoanMaintenance] View button clicked - clearing request cache');
          lastGetLoanKey = ""; // Reset the request tracking so it doesn't skip
          syncEventType("View");
          tryGetLoan();
        });
      }

      const editBtn = document.querySelector('[data-action-mode="edit"]');
      if (editBtn && editBtn.dataset.lmBound !== "1") {
        editBtn.dataset.lmBound = "1";
        editBtn.addEventListener("click", (e) => {
          e.preventDefault();
          if (currentMode !== "view") {
            console.warn('[LoanMaintenance] Edit allowed only after View');
            return;
          }
          syncEventType("Edit");
          setEditMode();
        });
      }

      const saveBtn = document.querySelector('[data-action-submit="save"]');
      if (saveBtn && saveBtn.dataset.lmBound !== "1") {
        saveBtn.dataset.lmBound = "1";
        saveBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          await handleSave();
        });
      }

      const cancelBtn = document.querySelector('[data-action-submit="cancel"]');
      if (cancelBtn && cancelBtn.dataset.lmBound !== "1") {
        cancelBtn.dataset.lmBound = "1";
        cancelBtn.addEventListener("click", (e) => {
          e.preventDefault();
          handleCancel();
        });
      }
    }

    function getOperatorId() {
      try {
        const session = global.AuthService?.getSession?.();
        return session?.operatorId || session?.operatorID || session?.name || "web_portal";
      } catch {
        return "web_portal";
      }
    }

    function readField(id) {
      const el = document.getElementById(id);
      return el?.value?.trim?.() || "";
    }

    // Enable/disable navigation buttons
    function enableNavigationButtons() {
      const loanNavButtons = Array.from(document.querySelectorAll("[data-action-nav]"));
      loanNavButtons.forEach(btn => {
        btn.disabled = false;
      });
      console.log('[Navigation] Buttons enabled (' + loanNavButtons.length + ' buttons)');
    }

    function disableNavigationButtons() {
      const loanNavButtons = Array.from(document.querySelectorAll("[data-action-nav]"));
      loanNavButtons.forEach(btn => {
        btn.disabled = true;
      });
      console.log('[Navigation] Buttons disabled (' + loanNavButtons.length + ' buttons)');
    }

    // Navigation state
    let navDirection = 0; // 1 for Next, -1 for Previous
    let navType = "A"; // 'A' = AccountID, 'S' = LoanSeries, 'R' = Ref No

    function initNavSectionToggles() {
      // Handle sidebar toggle
      const sidebarToggle = document.getElementById('sidebarToggle');
      if (sidebarToggle && sidebarToggle.dataset.lmBound !== "1") {
        sidebarToggle.dataset.lmBound = "1";
        sidebarToggle.addEventListener('click', handleSidebarToggle);
      }

      // Handle nav section toggle (expand/collapse Data Entry, View, etc.)
      document.querySelectorAll('.nav-arrow--card').forEach(arrow => {
        arrow.addEventListener('click', handleNavSectionToggle);
      });

      // Also allow clicking on nav-header to toggle
      document.querySelectorAll('.nav-header--card').forEach(header => {
        header.addEventListener('click', function(e) {
          // Don't toggle if clicking the arrow button itself
          if (!e.target.closest('.nav-arrow--card')) {
            const arrow = header.querySelector('.nav-arrow--card');
            if (arrow) arrow.click();
          }
        });
      });
    }

    function handleSidebarToggle() {
      const sidebar = document.getElementById('main-sidebar');
      const toggleBtn = document.getElementById('sidebarToggle');
      
      if (sidebar) {
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');
        
        // Update toggle button aria-expanded
        if (toggleBtn) {
          toggleBtn.setAttribute('aria-expanded', !isCollapsed);
        }
      }
    }

    function handleNavSectionToggle(event) {
      event.stopPropagation();
      const arrow = event.currentTarget;
      const navSection = arrow.closest('.nav-section--card');
      const navItems = navSection?.querySelector('.nav-items--card');
      const icon = arrow.querySelector('i');
      
      if (navSection && navItems) {
        const isOpen = navSection.classList.contains('is-open') || navSection.classList.contains('expanded');
        
        if (isOpen) {
          // Collapse
          navSection.classList.remove('is-open', 'expanded');
          navItems.setAttribute('hidden', '');
          arrow.setAttribute('aria-expanded', 'false');
          if (icon) {
            icon.classList.remove('bi-chevron-up');
            icon.classList.add('bi-chevron-down');
          }
        } else {
          // Expand
          navSection.classList.add('is-open', 'expanded');
          navItems.removeAttribute('hidden');
          arrow.setAttribute('aria-expanded', 'true');
          if (icon) {
            icon.classList.remove('bi-chevron-down');
            icon.classList.add('bi-chevron-up');
          }
        }
      }
    }

    // Set navigation type externally (e.g., from UI buttons or selection)
    function setNavigationType(type) {
      if (["A", "S", "R"].includes(type)) {
        navType = type;
      }
    }

    // Set navigation direction externally (1 for Next, -1 for Previous)
    function setNavigationDirection(dir) {
      if (dir === 1 || dir === -1) {
        navDirection = dir;
      }
    }

    function buildGetLoanRequestData(customDirection, customType) {
      const payload = {
        OurBranchID: readField("BranchID"),
        ClientID: readField("ClientID"),
        AccountID: readField("AccountID"),
        LoanSeries: readField("LoanSeries"),
        OperatorID: getOperatorId(),
        Direction: typeof customDirection === 'number' ? customDirection : navDirection,
        DirectionType: customType || navType
      };
      const loanRefNo = readField("LoanRefNo");
      if (loanRefNo) {
        payload.LoanRefNo = loanRefNo;
      }
      return payload;
    }

    function toNull(value) {
      if (value === undefined || value === null) return null;
      const trimmed = String(value).trim();
      return trimmed === "" ? null : trimmed;
    }

    function toNumberOrNull(value) {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    }

    function toNull(value) {
      if (value === undefined || value === null) return '';
      const trimmed = String(value).trim();
      return trimmed === "" ? '' : trimmed;
    }

    function toNumberOrNull(value) {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    }

    function buildEditLoanRequestData() {
      // Build payload with ALL fields from p_EditLoans stored procedure
      // Match legacy fncallback() structure - field values passed as-is from form
      const payload = {
        // Required parameters - match legacy drLoan assignments
        OurBranchID: toNull(readField("BranchID")),
        AccountID: toNull(readField("AccountID")),
        LoanSeries: readField("LoanSeries") ? parseInt(readField("LoanSeries")) || 0 : 0,  // Legacy: fnGetValue("txtLoanSeries")
        LoanRefNo: readField("LoanRefNo") ? parseInt(readField("LoanRefNo")) : null,       // Legacy: fnGetValue("txtLoanRefNo")
        
        // Loan Information - ALL fields must be present
        PurposeCodeID: toNull(document.getElementById("LoanPurpose")?.value),
        FundID: toNull(readField("FundID")),
        CreditOfficerID: toNull(readField("CreditOfficer")),
        HealthCodeID: document.getElementById("HealthCode")?.value === "0" || !document.getElementById("HealthCode")?.value 
          ? null 
          : toNull(document.getElementById("HealthCode")?.value),  // Legacy: if selectedIndex == 0 then null
        RepaymentMethodID: toNull(document.getElementById("RepaymentMethod")?.value),
        RepaymentAccountID: toNull(readField("RepaymentAccountID")),
        SuspendInterest: document.getElementById("StopInterestAccrual")?.checked ? 1 : 0,  // Legacy: checkbox value
        
        // Audit trail - ALL fields must be present
        ModifiedBy: getOperatorId(),
        ModifiedOn: '',
        SupervisedBy: '',
        
        // Additional info - ALL fields must be present
        NewRecord: 2,
        BusinessLineID: toNull(document.getElementById("LineOfBusiness")?.value),
        LegalOfficer: toNull(readField("LegalOfficer")),
        LegalStatusID: toNull(document.getElementById("LegalStatus")?.value)
      };
      
      console.log('[LoanMaintenance] Edit payload (matching legacy structure):', JSON.stringify(payload, null, 2));
      return payload;
    }

    function fnIsValid() {
      // Legacy validation function - checks all required fields are populated
      const errors = [];
      
      // Identity fields - required for View/Edit
      const branchID = toNull(document.getElementById("BranchID")?.value);
      const accountID = toNull(document.getElementById("AccountID")?.value);
      const loanSeries = toNull(document.getElementById("LoanSeries")?.value);
      
      if (!branchID) errors.push("BranchID is required.");
      if (!accountID) errors.push("AccountID is required.");
      if (loanSeries == null || loanSeries === '') errors.push("LoanSeries is required.");
      
      // Loan details - required for edit
      if (currentMode === "edit") {
        const purpose = toNull(document.getElementById("LoanPurpose")?.value);
        const healthCode = toNull(document.getElementById("HealthCode")?.value);
        const repaymentMethod = toNull(document.getElementById("RepaymentMethod")?.value);
        const lineOfBusiness = toNull(document.getElementById("LineOfBusiness")?.value);
        
        if (!purpose) errors.push("LoanPurpose is required.");
        if (!healthCode) errors.push("HealthCode is required.");
        if (!repaymentMethod) errors.push("RepaymentMethod is required.");
        if (!lineOfBusiness) errors.push("LineOfBusiness is required.");
      }
      
      if (errors.length > 0) {
        console.warn('[LoanMaintenance] Validation failed:', errors);
        alert(errors.join("\n"));
        return false;
      }
      
      return true;
    }

    function validateEditPayload(payload) {
      // Post-payload validation - additional checks after buildEditLoanRequestData()
      const missing = [];
      if (!payload.OurBranchID) missing.push("BranchID");
      if (!payload.AccountID) missing.push("AccountID");
      if (payload.LoanSeries == null) missing.push("LoanSeries");
      if (!payload.PurposeCodeID) missing.push("LoanPurpose");
      if (!payload.RepaymentMethodID) missing.push("RepaymentMethod");
      if (!payload.HealthCodeID) missing.push("HealthCode");
      if (!payload.BusinessLineID) missing.push("LineOfBusiness");

      if (missing.length > 0) {
        console.warn('[LoanMaintenance] Payload validation failed, missing:', missing);
        return false;
      }
      return true;
    }

    async function handleSave() {
      if (currentMode !== "edit") {
        alert('Switch to Edit mode before saving.');
        return;
      }

      console.log('[LoanMaintenance] ===== SAVE INITIATED =====');
      const payload = buildEditLoanRequestData();
      console.log('[LoanMaintenance] Edit payload built:', JSON.stringify(payload, null, 2));
      
      if (!validateEditPayload(payload)) {
        console.log('[LoanMaintenance] Validation failed, aborting save');
        return;
      }

      try {
        console.log('[LoanMaintenance] Saving loan with payload:', payload);
        const result = await LoansService.editLoan(payload);
        console.log('[LoanMaintenance] Save result:', result);

        if (!result?.success) {
          console.error('[LoanMaintenance] Save failed with result:', result);
          alert('Save failed:\n' + (result?.message || 'Unknown error'));
          return;
        }

        console.log('[LoanMaintenance] ===== SAVE SUCCESSFUL =====');
        alert('Loan updated successfully');
        // After a successful save, clear the form but keep BranchID,
        // and return to Entry mode per latest requirement
        clearFormKeepBranch();
        lastGetLoanKey = "";
        setEntryMode();
        syncEventType("None");
      } catch (error) {
        console.error('[LoanMaintenance] Save error:', error);
        alert('Error while saving: ' + (error.message || 'Unknown error'));
      }
    }

    function handleCancel() {
      console.log('[LoanMaintenance] ===== CANCEL BUTTON CLICKED (fnbtnCancelClick) =====');
      // Per legacy: Direction and DirectionType reset
      Direction = 0;
      DirectionType = 'A';
      
      // Clear form and return to Entry mode
      clearFormKeepBranch();
      lastGetLoanKey = "";
      setEntryMode();
      syncEventType("None");
      
      console.log('[LoanMaintenance] Form cleared, Entry mode set, View button enabled');
    }

    function setInputValue(id, value) {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = value == null ? "" : String(value);
    }

    function formatMoney(value) {
      if (value === null || value === undefined || value === '') return '0.00';
      
      let num;
      if (typeof value === 'number') {
        num = value;
      } else if (typeof value === 'string') {
        const cleaned = value.replace(/,/g, '').trim();
        num = parseFloat(cleaned);
      } else {
        num = parseFloat(value);
      }
      
      if (isNaN(num)) {
        return '0.00';
      }
      
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function setTextValue(id, value, dataType = 'text') {
      const el = document.getElementById(id);
      if (!el) return;
      
      // Format currency fields with thousand separators and 2 decimals
      const currencyFields = ['currency', 'money', 'amount', 'balance'];
      const isCurrency = currencyFields.some(type => dataType?.toLowerCase().includes(type));
      
      let displayValue;
      if (isCurrency && value != null) {
        displayValue = formatMoney(value);
      } else {
        displayValue = value == null ? "" : String(value);
      }
      
      el.textContent = displayValue;
      // Set data-type attribute for styling (currency, date, number, status, etc.)
      if (dataType) {
        el.setAttribute('data-type', dataType);
      }
      // Apply negative class for negative numeric values (shows red color)
      const numValue = parseFloat(String(value).replace(/[^\d.-]/g, ''));
      if (!isNaN(numValue) && numValue < 0) {
        el.classList.add('negative');
      } else {
        el.classList.remove('negative');
      }
    }


    function formatDateDDMMYYYY(dateStr) {
      if (!dateStr) return "";
      let text = String(dateStr);
      // Remove time if present
      if (text.includes("T")) text = text.split("T")[0];
      // Accept YYYY-MM-DD or YYYY/MM/DD
      const match = text.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})$/);
      if (match) {
        return `${match[3]}-${match[2]}-${match[1]}`;
      }
      // Already DD-MM-YYYY or invalid, return as is
      return text;
    }

    function toDateOnly(value) {
      if (!value) return "";
      const text = String(value);
      if (text.includes("T")) return text.split("T")[0];
      return text;
    }

    function setDateValue(id, value) {
      // Use DD-MM-YYYY for specific date fields
      const ddmmyyyyFields = [
        "LoanStatementFromDate", "LoanStatementToDate",
        "DisbursedDate", "LastRescheduleDate", "SanctionDate", "InstallmentStartDate", "MaturityDate"
      ];
      if (ddmmyyyyFields.includes(id)) {
        setInputValue(id, formatDateDDMMYYYY(value));
      } else {
        setInputValue(id, toDateOnly(value));
      }
    }

    function setCheckboxValue(id, value) {
      const el = document.getElementById(id);
      if (!el || el.type !== "checkbox") return;
      el.checked = value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
    }

    /**
     * Find the description/label for a code value in a dropdown
     * @param {string} id - Select element ID
     * @param {string} value - Code value to find
     * @returns {string} Description/label or the value itself if not found
     */
    function getDropdownLabel(id, value) {
      const el = document.getElementById(id);
      if (!el || el.tagName !== "SELECT") return value;
      
      const option = Array.from(el.options).find((opt) => opt.value === String(value));
      if (option && option.textContent !== "--Select--") {
        return option.textContent;
      }
      return value;
    }

    function ensureSelectValue(id, value, label) {
      const el = document.getElementById(id);
      if (!el || el.tagName !== "SELECT") return;
      const strValue = value == null ? "" : String(value);
      if (!strValue) return;

      // Only set if an option already exists; otherwise leave blank (no fallback)
      const existing = Array.from(el.options).find((opt) => opt.value === strValue);
      if (!existing) {
        console.warn(`[LoanMaintenance] No matching option for ${id} value="${strValue}"; leaving blank`);
        return;
      }

      el.value = strValue;
      console.log(`[LoanMaintenance] Set ${id} value="${strValue}" label="${existing.textContent}"`);
    }

    function populateSelectFromList(selectId, items, valueKey, labelKey) {
      const el = document.getElementById(selectId);
      if (!el || el.tagName !== "SELECT") return;
      if (!Array.isArray(items) || items.length === 0) return;

      const existingValues = new Set(Array.from(el.options).map((o) => o.value));
      const seen = new Set();
      items.forEach((item) => {
        const value = item?.[valueKey];
        if (value == null) return;
        const strValue = String(value);
        if (!strValue || existingValues.has(strValue) || seen.has(strValue)) return;
        seen.add(strValue);

        const opt = document.createElement("option");
        opt.value = strValue;
        opt.textContent = item?.[labelKey] == null ? strValue : String(item[labelKey]);
        el.appendChild(opt);
      });
    }

    function getLoggedInBranchId() {
      try {
        const session = global.AuthService?.getSession?.();
        return session?.branchId || session?.BranchID || session?.branchID || readField("BranchID") || "";
      } catch {
        return readField("BranchID") || "";
      }
    }

    function setActionButtonsState({ view = false, edit = false, save = false, cancel = false }) {
      // Get button elements - match HTML data attributes
      const viewBtn = document.querySelector('[data-action-mode="view"]');
      const editBtn = document.querySelector('[data-action-mode="edit"]');
      const saveBtn = document.querySelector('[data-action-submit="save"]');
      const cancelBtn = document.querySelector('[data-action-submit="cancel"]');

      console.log('[LoanMaintenance] setActionButtonsState called');
      console.log('[LoanMaintenance]   Requested state: { view:', view, ', edit:', edit, ', save:', save, ', cancel:', cancel, '}');
      console.log('[LoanMaintenance]   Buttons found: view=' + !!viewBtn + ', edit=' + !!editBtn + ', save=' + !!saveBtn + ', cancel=' + !!cancelBtn);
      
      // Apply button states - convert boolean to disabled value (true means disabled)
      if (viewBtn) {
        const oldState = viewBtn.disabled;
        viewBtn.disabled = !view; // If view=true, disabled=false (button is enabled)
        console.log('[LoanMaintenance]   View: ' + oldState + ' → ' + viewBtn.disabled + ' (requested: ' + view + ')');
      } else {
        console.error('[LoanMaintenance]   View button NOT FOUND!');
      }
      
      if (editBtn) {
        const oldState = editBtn.disabled;
        editBtn.disabled = !edit;
        console.log('[LoanMaintenance]   Edit: ' + oldState + ' → ' + editBtn.disabled + ' (requested: ' + edit + ')');
      } else {
        console.error('[LoanMaintenance]   Edit button NOT FOUND!');
      }
      
      if (saveBtn) {
        const oldState = saveBtn.disabled;
        saveBtn.disabled = !save;
        console.log('[LoanMaintenance]   Save: ' + oldState + ' → ' + saveBtn.disabled + ' (requested: ' + save + ')');
      } else {
        console.error('[LoanMaintenance]   Save button NOT FOUND!');
      }
      
      if (cancelBtn) {
        const oldState = cancelBtn.disabled;
        cancelBtn.disabled = !cancel;
        console.log('[LoanMaintenance]   Cancel: ' + oldState + ' → ' + cancelBtn.disabled + ' (requested: ' + cancel + ')');
      } else {
        console.error('[LoanMaintenance]   Cancel button NOT FOUND!');
      }
      
      // Immediate verification (not delayed)
      console.log('[LoanMaintenance] IMMEDIATE BUTTON STATE AFTER SETTING:');
      const v = document.querySelector('[data-shell-mode="View"]');
      const e = document.querySelector('[data-shell-mode="Update"]');
      const s = document.querySelector('[data-submit-action="save"]');
      const c = document.querySelector('[data-submit-action="cancel"]');
      console.log('[LoanMaintenance]   View.disabled:', v?.disabled);
      console.log('[LoanMaintenance]   Edit.disabled:', e?.disabled);
      console.log('[LoanMaintenance]   Save.disabled:', s?.disabled);
      console.log('[LoanMaintenance]   Cancel.disabled:', c?.disabled);
    }
    
    // Add a global debug function you can call from console
    global.LoanMaintenanceDebug = {
      checkButtonStates: function() {
        console.log('='.repeat(60));
        console.log('[DEBUG] BUTTON STATE CHECK');
        const viewBtn = document.querySelector('[data-shell-mode="View"]');
        const editBtn = document.querySelector('[data-shell-mode="Update"]');
        const saveBtn = document.querySelector('[data-submit-action="save"]');
        const cancelBtn = document.querySelector('[data-submit-action="cancel"]');
        
        console.log('View button found:', !!viewBtn);
        if (viewBtn) {
          console.log('  - disabled property:', viewBtn.disabled);
          console.log('  - has disabled attr:', viewBtn.hasAttribute('disabled'));
          console.log('  - classList:', Array.from(viewBtn.classList).join(' '));
          console.log('  - style.opacity:', viewBtn.style.opacity);
        }
        
        console.log('Edit button found:', !!editBtn);
        if (editBtn) {
          console.log('  - disabled property:', editBtn.disabled);
          console.log('  - has disabled attr:', editBtn.hasAttribute('disabled'));
          console.log('  - classList:', Array.from(editBtn.classList).join(' '));
          console.log('  - style.opacity:', editBtn.style.opacity);
        }
        
        console.log('Save button found:', !!saveBtn);
        if (saveBtn) {
          console.log('  - disabled property:', saveBtn.disabled);
          console.log('  - has disabled attr:', saveBtn.hasAttribute('disabled'));
          console.log('  - classList:', Array.from(saveBtn.classList).join(' '));
        }
        
        console.log('Cancel button found:', !!cancelBtn);
        if (cancelBtn) {
          console.log('  - disabled property:', cancelBtn.disabled);
          console.log('  - has disabled attr:', cancelBtn.hasAttribute('disabled'));
          console.log('  - classList:', Array.from(cancelBtn.classList).join(' '));
        }
        
        console.log('Current mode:', currentMode);
        console.log('='.repeat(60));
      },
      
      forceViewMode: function() {
        console.log('[DEBUG] FORCING VIEW MODE...');
        setViewMode();
        setTimeout(() => {
          this.checkButtonStates();
        }, 100);
      },
      
      forceEntryMode: function() {
        console.log('[DEBUG] FORCING ENTRY MODE...');
        setEntryMode();
        setTimeout(() => {
          this.checkButtonStates();
        }, 100);
      },
      
      testButtonDisable: function() {
        console.log('[DEBUG] TESTING: Disabling Edit button manually...');
        const editBtn = document.querySelector('[data-shell-mode="Update"]');
        if (editBtn) {
          editBtn.disabled = true;
          console.log('Edit button disabled property set to:', editBtn.disabled);
          console.log('Edit button should appear GRAYED OUT and not clickable');
          console.log('Edit button classList:', Array.from(editBtn.classList).join(' '));
          setTimeout(() => {
            console.log('Edit button NOW has these styles:');
            console.log('  - style.opacity:', editBtn.style.opacity);
            console.log('  - getComputedStyle opacity:', window.getComputedStyle(editBtn).opacity);
            console.log('  - getComputedStyle cursor:', window.getComputedStyle(editBtn).cursor);
          }, 100);
        } else {
          console.error('Edit button not found!');
        }
      },
      
      testButtonEnable: function() {
        console.log('[DEBUG] TESTING: Enabling Edit button manually...');
        const editBtn = document.querySelector('[data-shell-mode="Update"]');
        if (editBtn) {
          editBtn.disabled = false;
          console.log('Edit button disabled property set to:', editBtn.disabled);
          console.log('Edit button should appear NORMAL and clickable');
        } else {
          console.error('Edit button not found!');
        }
      }
    };

    function setAllFieldsDisabled(disabled) {
      // Key identifier fields that must ALWAYS remain enabled for searching (like Account Maintenance)
      const alwaysEnabledIds = new Set([
        'BranchID', 'ClientID', 'AccountID', 'LoanSeries'
      ]);

      const fields = form?.querySelectorAll('input, select, textarea') || [];
      fields.forEach((el) => {
        // Keep key identifiers enabled in all modes (for navigation and searching)
        if (alwaysEnabledIds.has(el.id)) {
          el.disabled = false;
          return;
        }
        el.disabled = disabled;
      });

      // Search buttons should remain enabled in all modes for navigation
      const searchButtons = form?.querySelectorAll('button.btn-lookup') || [];
      searchButtons.forEach((btn) => {
        btn.disabled = false;
      });
    }

    function setFieldsEnabledOnly(enabledIds = []) {
      const allow = new Set(enabledIds);
      setAllFieldsDisabled(true);

      const fields = form?.querySelectorAll('input, select, textarea') || [];
      fields.forEach((el) => {
        if (allow.has(el.id)) {
          el.disabled = false;
        }
      });

      // Enable search buttons for fields that are enabled (for Edit mode)
      const searchButtons = form?.querySelectorAll('button.btn-outline-primary') || [];
      searchButtons.forEach((btn) => {
        // Try to associate the button with the nearest input/select in its group
        let associatedId = btn.previousElementSibling?.id;
        if (!associatedId) {
          const lastInput = btn.parentElement?.querySelector('input, select');
          associatedId = lastInput?.id;
        }
        if (associatedId && allow.has(associatedId)) {
          btn.disabled = false;
        } else {
          // Keep search buttons enabled even if field is disabled (for navigation)
          btn.disabled = false;
        }
      });
    }

    function setEntryMode() {
      console.log('[LoanMaintenance] ===== ENTERING ENTRY MODE =====');
      currentMode = "entry";
      if (form) form.dataset.mode = 'entry';
      setAllFieldsDisabled(false);
      
      // Clear readonly attribute from all fields (in case they were set by View mode)
      const inputs = form?.querySelectorAll('input, select, textarea') || [];
      inputs.forEach((el) => {
        if (el.tagName !== 'SELECT') {
          el.readOnly = false;
        }
      });
      
      // Enable all search buttons in Entry mode
      const searchButtons = form?.querySelectorAll('button.btn-lookup') || [];
      searchButtons.forEach((btn) => {
        btn.disabled = false;
      });
      console.log('[LoanMaintenance] Search buttons enabled, count:', searchButtons.length);
      
      // In Entry mode: View is enabled, Cancel is also enabled to clear form, Edit/Save are disabled
      setActionButtonsState({ view: true, edit: false, save: false, cancel: true });
      console.log('[LoanMaintenance] Entry mode set: View=enabled, Cancel=enabled, Edit/Save=disabled');
    }

    function setViewMode() {
      console.log('%c▶▶▶ ENTERING VIEW MODE ◀◀◀', 'background: #4CAF50; color: white; font-size: 14px; font-weight: bold;');
      console.log('Current mode before:', currentMode);
      currentMode = "view";
      if (form) form.dataset.mode = 'view';
      console.log('Current mode after:', currentMode);
      
      // Apply readonly to all input/select/textarea (allows copying, better semantics)
      const inputs = form?.querySelectorAll('input, select, textarea') || [];
      inputs.forEach((el) => {
        // Always-enabled identifier fields - still readonly but kept enabled for Tab/focus
        const alwaysEnabledIds = new Set(['BranchID', 'ClientID', 'AccountID', 'LoanSeries']);
        if (alwaysEnabledIds.has(el.id)) {
          el.disabled = false;
          el.readOnly = el.tagName !== 'SELECT'; // selects don't support readonly
        } else {
          el.disabled = false;
          el.readOnly = el.tagName !== 'SELECT';
        }
      });
      
      // Keep lookup buttons ENABLED in View mode for navigation (Account Maintenance pattern)
      const searchButtons = form?.querySelectorAll('button.btn-lookup') || [];
      searchButtons.forEach((btn) => {
        btn.disabled = false;
      });
      
      // Set button states: View=OFF, Edit=ON, Save=OFF, Cancel=ON (allows user to exit and search again)
      console.log('Setting button states...');
      setActionButtonsState({ view: false, edit: true, save: false, cancel: true });
      console.log('Search buttons enabled for navigation, count:', searchButtons.length);
      console.log('%c▶▶▶ VIEW MODE COMPLETE ◀◀◀', 'background: #4CAF50; color: white; font-size: 14px; font-weight: bold;');
    }

    function setEditMode() {
      console.log('[LoanMaintenance] ===== ENTERING EDIT MODE =====');
      currentMode = "edit";
      if (form) form.dataset.mode = 'edit';
      
      // In Edit mode, ONLY enable:
      // - Key identifiers (BranchID, ClientID, AccountID) - always for searching
      // - Loan Information section fields
      // - Main Repayment Account ID (RepaymentAccountID)
      // ALL other fields must remain DISABLED
      const editableIds = [
        // Key identifiers (always searchable)
        "BranchID",
        "ClientID",
        "AccountID",
        "LoanSeries",
        
        // Loan Information section (these are the ONLY editable fields in Edit mode)
        "LoanPurpose",
        "HealthCode",
        "RepaymentMethod",
        "LineOfBusiness",
        "LegalStatus",
        "FundID",
        "CreditOfficer",
        "StopInterestAccrual",
        "LegalOfficer",
        "LegalOfficerName",
        
        // Main Repayment Account ID
        "RepaymentAccountID"
      ];
      
      setFieldsEnabledOnly(editableIds);
      
      // Keep lookup buttons enabled for all fields (for navigation)
      const searchButtons = form?.querySelectorAll('button.btn-lookup') || [];
      searchButtons.forEach((btn) => {
        btn.disabled = false;
      });
      
      setActionButtonsState({ view: false, edit: false, save: true, cancel: true });
      console.log('[LoanMaintenance] Edit mode set: Save and Cancel buttons enabled, only Loan Information section editable');
    }

    function clearAllBehindTheSceneFields() {
      // Clear all Behind The Scene span values (display fields that show calculations)
      const behindTheSceneIds = [
        'LoanBalance', 'LoanAmount', 'DisbursedAmount', 'FirstDisbursementDate',
        'UnearnedInterest', 'OutstandingPrincipal', 'InterestReceivable', 'OutstandingInterest',
        'ODueInterestReceivable', 'PenaltyReceivable', 'LossProvisionAmount', 'InterestSuspended',
        'LoanStatus', 'ArrearAmount', 'ArrearDays', 'LastRescheduleDate', 'NoOfReschedule',
        'ProductID', 'CurrencyID', 'SanctionAmount'
      ];
      
      behindTheSceneIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.textContent = '';
          el.removeAttribute('data-type');
          el.classList.remove('negative');
        }
      });
      
      // Clear audit trail fields
      const auditIds = ['CreatedBy', 'CreatedOn', 'ModifiedBy', 'ModifiedOn', 'SupervisedBy', 'SupervisedOn'];
      auditIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.textContent = '';
        }
      });
    }

    function clearFormKeepBranch() {
      // Legacy fnEnableDisable() implementation - comprehensive field clearing
      console.log('[LoanMaintenance] ===== CLEARING FORM (fnEnableDisable) =====');
      
      const defaultBranch = getLoggedInBranchId();
      
      // Step 1: Clear Behind The Scene fields (spans)
      clearAllBehindTheSceneFields();
      
      // Step 2: Clear all text boxes (per legacy fnClearTextBox)
      const textFieldsToClear = [
        "LoanRefNo", "LoanSeries", "FileNumber", "RepaymentAccountID", "RepaymentAccountName",
        "CreditOfficer", "FundID",
        "CreatedBy", "ModifiedBy", "SupervisedBy", "CreatedOn", "ModifiedOn", "SupervisedOn",
        "OfficerID", "LoanType", "LoanBalance", "LoanAmount", "DisbursedAmount", "DisbursedDate",
        "UnearnedInterest", "OutstandingPrincipal", "OutstandingInterest", "InterestReceivable", "PenaltyReceivable",
        "ODueInterestReceivable", "InterestSuspended", "LossProvisionAmount", "LastRescheduleDate", "NoOfReschedule",
        "ProductID", "InterestTypeID", "CurrencyID", "MarkingRate",
        "SanctionAmount", "InterestRate", "PenaltyInterest", "SanctionDate", "InstallmentStartDate", "BookedAmount",
        "ValueDate", "Term", "MaturityDate", "RepaymentTerm", "InstallmentAmount",
        "RepaymentFrequency", "LastInstallmentAmount", "CalculationMethod",
        "GraceDays", "NetCollateralValue", "GracePeriod", "ArrearDays", "ArrearAmount"
      ];
      
      textFieldsToClear.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      
      // Clear checkbox
      const stopInterestEl = document.getElementById("StopInterestAccrual");
      if (stopInterestEl && stopInterestEl.type === "checkbox") {
        stopInterestEl.checked = false;
      }
      
      console.log('[LoanMaintenance] Text fields cleared');
      
      // Step 3: Reset dropdowns to "--Select--" (per legacy fnSelectCombo)
      const selectsToClear = [
        "LoanPurpose", "LineOfBusiness", "LegalStatus", 
        "HealthCode", "RepaymentMethod"
      ];
      
      selectsToClear.forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.tagName === "SELECT") {
          el.value = "";
        }
      });
      
      console.log('[LoanMaintenance] Dropdowns reset');
      
      // Step 4: Clear specific controls (per legacy fnClearToNormal)
      // BRtxtOurBranchID
      const branchIdEl = document.getElementById("BranchID");
      if (branchIdEl) {
        branchIdEl.disabled = false;
        branchIdEl.value = defaultBranch || "";
      }
      
      const branchNameEl = document.getElementById("BranchName");
      if (branchNameEl) {
        branchNameEl.value = "";
      }
      
      // BRtxtClientID
      const clientIdEl = document.getElementById("ClientID");
      if (clientIdEl) {
        clientIdEl.disabled = false;
        clientIdEl.value = "";
      }
      
      const clientNameEl = document.getElementById("ClientName");
      if (clientNameEl) {
        clientNameEl.value = "";
      }
      
      // BRtxtAccountID
      const accountIdEl = document.getElementById("AccountID");
      if (accountIdEl) {
        accountIdEl.disabled = false;
        accountIdEl.value = "";
      }
      
      const accountNameEl = document.getElementById("AccountName");
      if (accountNameEl) {
        accountNameEl.value = "";
      }
      
      // Clear RepaymentAccountName
      const repaymentAccountNameEl = document.getElementById("RepaymentAccountName");
      if (repaymentAccountNameEl) {
        repaymentAccountNameEl.value = "";
      }
      
      // BRtxtFundID (keep enabled after clearing to allow entry)
      const fundIdEl = document.getElementById("FundID");
      if (fundIdEl) {
        fundIdEl.disabled = false;
        fundIdEl.value = "";
      }
      
      // Step 4: Clear special fields
      const lblSpreadSign = document.getElementById("lblSpreadSign");
      if (lblSpreadSign) {
        lblSpreadSign.textContent = "()";
      }
      
      // BRtxtLegalOfficer (should be disabled after clearing)
      const legalOfficerEl = document.getElementById("LegalOfficer");
      if (legalOfficerEl) {
        legalOfficerEl.value = "";
        legalOfficerEl.disabled = true;
      }
      
      const legalOfficerNameEl = document.getElementById("LegalOfficerName");
      if (legalOfficerNameEl) {
        legalOfficerNameEl.value = "";
        legalOfficerNameEl.disabled = true;
      }
      
      // Step 5: Clear LoanStatus field
      const loanStatusEl = document.getElementById("LoanStatus");
      if (loanStatusEl) {
        loanStatusEl.value = "";
      }
      
      console.log('[LoanMaintenance] Specific controls cleared');
      
      // Step 6: Hide closed indicator
      const imgClosed = document.getElementById("imgClosed");
      if (imgClosed) {
        imgClosed.style.visibility = "hidden";
      }
      
      // Step 7: Reset navigation state
      navDirection = 0;
      navType = "A";
      EventID = "NONE";
      
      // Step 8: Set focus to ClientID (per legacy behavior)
      if (clientIdEl) {
        clientIdEl.focus();
      }
      
      console.log('[LoanMaintenance] ===== FORM CLEAR COMPLETE (Entry Mode Ready) =====');
    }

    // Listen for module close event to reset form
    document.addEventListener('lm-module-close', function() {
      resetLoanMaintenanceForm();
    });

    // Optionally, if the module is hidden via a specific element, observe and reset
    const workspace = document.querySelector('.cm-workspace');
    if (workspace) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'hidden' && workspace.hidden) {
            resetLoanMaintenanceForm();
          }
        });
      });
      observer.observe(workspace, { attributes: true });
    }

    function syncEventType(nextType) {
      currentEventType = nextType || "None";
      if (global.LoanMaintenanceService?.setEventType) {
        global.LoanMaintenanceService.setEventType(currentEventType);
      }
    }

    function bindEventTypeButtons() {
      const actionButtons = [
        ...document.querySelectorAll('[data-shell-mode]'),
        ...document.querySelectorAll('.lm-bottom-actions .cm-shell__action')
      ];

      actionButtons.forEach((btn) => {
        if (btn.dataset.lmEvtBound === "1") return;
        btn.dataset.lmEvtBound = "1";
        btn.addEventListener('click', () => {
          const mode = btn.dataset.shellMode || btn.title || btn.textContent?.trim();
          if (!mode) return;
          if (mode.toLowerCase() === 'view') {
            syncEventType('View');
          } else if (mode.toLowerCase() === 'add') {
            syncEventType('Add');
          } else if (mode.toLowerCase() === 'edit' || mode.toLowerCase() === 'update') {
            syncEventType('Edit');
          }
        });
      });
    }

    function bindLoanToForm(payload) {
      console.log('%c========== BINDING LOAN DATA TO FORM ==========', 'background: green; color: white; font-size: 14px; font-weight: bold;');
      console.log('[LoanMaintenance] bindLoanToForm payload:', payload);
      console.log('[LoanMaintenance] payload keys:', payload ? Object.keys(payload) : 'null');
      
      if (!payload || typeof payload !== "object") {
        console.warn('[LoanMaintenance] No payload to bind', payload);
        return;
      }

      // Handle different response formats
      let status = null;
      let header = null;
      let healthCodes = [];
      let legalStatusCodes = [];
      
      // Format 1: Legacy format with Details01/Details02/Details03/Details04
      if (payload.Details01 || payload.Details02) {
        console.log('[LoanMaintenance] Using Details array format');
        status = Array.isArray(payload.Details01) ? payload.Details01[0] : null;
        header = Array.isArray(payload.Details02) ? payload.Details02[0] : null;
        healthCodes = Array.isArray(payload.Details03) ? payload.Details03 : [];
        legalStatusCodes = Array.isArray(payload.Details04) ? payload.Details04 : [];
      }
      // Format 2: Direct object (API returns single loan record)
      else {
        console.log('[LoanMaintenance] Using direct object format (single record)');
        header = payload;
        status = payload;
      }

      console.log('[LoanMaintenance] Extracted header:', header);
      console.log('[LoanMaintenance] Extracted status:', status);
      console.log('[LoanMaintenance] Health codes count:', healthCodes.length);
      console.log('[LoanMaintenance] Legal status codes count:', legalStatusCodes.length);

      // Populate health code dropdown from response if available
      if (healthCodes.length > 0) {
        console.log('[LoanMaintenance] Populating health codes from response');
        populateSelectFromList("HealthCode", healthCodes, "SubCodeID", "Description");
      }

      // Populate legal status dropdown from response if available
      if (legalStatusCodes.length > 0) {
        console.log('[LoanMaintenance] Populating legal status codes from response');
        populateSelectFromList("LegalStatus", legalStatusCodes, "SubCodeID", "Description");
      }

      // Top identifiers
      if (header) {
        console.log('[LoanMaintenance] Setting header fields...');
        setInputValue("BranchID", header.OurBranchID || header.BranchID);
        setInputValue("BranchName", header.BranchName);
        setInputValue("ClientID", header.ClientID);
        // Populate Client Name from payload (with robust fallbacks)
        setInputValue("ClientName", header.ClientName || header.ClientFullName || header.Name || "");
        setInputValue("AccountID", header.AccountID);
        // Populate Account Name from payload (with robust fallbacks)
        setInputValue("AccountName", header.AccountName || header.AccountTitle || header.Name || "");
        setInputValue("LoanSeries", header.LoanSeries);
        setInputValue("LoanRefNo", header.LoanRefNo);
        setInputValue("FileNumber", header.FileNumber);
        setInputValue("RepaymentAccountID", header.RepaymentAccountID);
        setInputValue("RepaymentAccountName", header.RepaymentAccountName || "");

        // Loan Information section
        ensureSelectValue("LoanPurpose", header.PurposeCodeID);
        ensureSelectValue("RepaymentMethod", header.RepaymentMethodID);
        ensureSelectValue("LineOfBusiness", header.BusinessLineID);
        ensureSelectValue("HealthCode", header.HealthCodeID);
        ensureSelectValue("LegalStatus", header.LegalStatusID);

        setInputValue("FundID", header.FundID);
        setInputValue("LoanType", header.LoanType);
        // CreditOfficer field can come as CreditOfficerID or CreditOfficer
        setInputValue("CreditOfficer", header.CreditOfficer || header.CreditOfficerID || "");
        setCheckboxValue("StopInterestAccrual", header.StopInterestAccrual);
        setInputValue("LegalOfficer", header.LegalOfficerID || header.LegalOfficer);
        setInputValue("LegalOfficerName", header.LegalOfficerName || header.LegalCreditOfficer || "");

        // Audit trail (Behind The Scene) - these are span elements, use setTextValue
        setTextValue("CreatedBy", header.CreatedBy, 'text');
        setTextValue("ModifiedBy", header.ModifiedBy, 'text');
        setTextValue("SupervisedBy", header.SupervisedBy, 'text');
        setTextValue("CreatedOn", formatDateDDMMYYYY(header.CreatedOn), 'date');
        setTextValue("ModifiedOn", formatDateDDMMYYYY(header.ModifiedOn), 'date');
        setTextValue("SupervisedOn", formatDateDDMMYYYY(header.SupervisedOn), 'date');

        console.log('[LoanMaintenance] Header fields mapped successfully');
      }

      // Current Status + Loan Details from Details01
      if (status) {
        console.log('[LoanMaintenance] Binding status fields, LoanBalance value:', status.LoanBalance);
        // Current Status - Behind The Scene (these are span elements, use setTextValue)
        setTextValue("LoanBalance", status.LoanBalance, 'currency');
        setTextValue("LoanAmount", status.LoanAmount, 'currency');
        setTextValue("DisbursedAmount", status.DisbursedAmount, 'currency');
        setTextValue("FirstDisbursementDate", formatDateDDMMYYYY(status.FirstDisbursementDate), 'date');
        setTextValue("UnearnedInterest", status.UnearnedInterest, 'currency');
        setTextValue("OutstandingPrincipal", status.OutstandingPrincipal, 'currency');
        setTextValue("InterestReceivable", status.InterestReceivable, 'currency');
        setTextValue("OutstandingInterest", status.OutstandingInterest, 'currency');
        setTextValue("ODueInterestReceivable", status.ODueInterestReceivable, 'currency');
        setTextValue("PenaltyReceivable", status.PenaltyReceivable, 'currency');
        setTextValue("LossProvisionAmount", status.LossProvisionAmount, 'currency');
        setTextValue("InterestSuspended", status.InterestSuspended, 'currency');
        setTextValue("LoanStatus", status.LoanStatus, 'status');
        setTextValue("ArrearAmount", status.ArrearAmount, 'currency');
        setTextValue("ArrearDays", status.ArrearDays, 'number');
        setTextValue("LastRescheduleDate", formatDateDDMMYYYY(status.LastRescheduleDate), 'date');
        setTextValue("NoOfReschedule", status.NoOfReschedule, 'number');

        // Loan Details tab - Behind The Scene (span elements)
        setTextValue("ProductID", status.ProductID, 'text');
        setTextValue("CurrencyID", status.CurrencyID, 'text');
        setTextValue("SanctionAmount", status.SanctionedAmount, 'currency');
        setDateValue("SanctionDate", status.SanctionedDate);
        setInputValue("BookedAmount", status.BookedAmount);
        setInputValue("Term", status.Term);
        setInputValue("RepaymentTerm", status.RepaymentTerm);
        setInputValue("RepaymentFrequency", status.RepaymentFrequency);
        setInputValue("InterestRateType", status.InterestType);
        setInputValue("InterestRate", status.InterestRate);
        setDateValue("InstallmentStartDate", status.InstallmentStartDate);
        setDateValue("MaturityDate", status.MaturityDate);
        
        console.log('[LoanMaintenance] Status fields set');

        // Fallback: if header did not include names, try to bind from status
        const clientNameField = document.getElementById("ClientName");
        if (clientNameField && !clientNameField.value) {
          setInputValue("ClientName", status.ClientName || status.Name || "");
        }
        const accountNameField = document.getElementById("AccountName");
        if (accountNameField && !accountNameField.value) {
          setInputValue("AccountName", status.AccountName || status.AccountTitle || status.Name || "");
        }

        // Fallback: Legal officer and status from Details01 if not in Details02
        const legalOfficerField = document.getElementById("LegalOfficer");
        if (legalOfficerField && !legalOfficerField.value && status.LegalOfficerID) {
          setInputValue("LegalOfficer", status.LegalOfficerID);
          setInputValue("LegalOfficerName", status.LegalOfficerName || "");
        }
        const legalStatusField = document.getElementById("LegalStatus");
        if (legalStatusField && !legalStatusField.value && status.LegalStatusID) {
          ensureSelectValue("LegalStatus", status.LegalStatusID);
        }

        // Show/hide closed loan icon based on status
        const imgClosed = document.getElementById("imgClosed");
        if (imgClosed && status) {
          const loanStatusID = status.LoanStatusID || status.LoanStatus || '';
          
          console.log('[LoanMaintenance] Icon check - LoanStatusID:', loanStatusID);
          console.log('[LoanMaintenance] LoanStatusID Map:', loanStatusIdMap);
          
          // Closed statuses (from the provided data):
          // B (Bad Debt), C (Charge Off), F (Fully Paid), N (NPA), P (Paid Off), W (Write Off), X (Cancelled)
          // Active/ongoing: A (Active Loan), R (Rescheduled), S (Sanctioned Loan), T (Refinanced)
          const closedStatusCodes = ["B", "C", "F", "N", "P", "W", "X"];
          const isClosed = closedStatusCodes.includes(loanStatusID);
          
          // Get status description from map if available
          const statusInfo = loanStatusIdMap[loanStatusID] || {};
          const statusDescription = statusInfo.description || loanStatusID;
          
          if (isClosed) {
            // Use a simple closed icon (circle with slash)
            imgClosed.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23dc2626' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cline x1='6' y1='6' x2='18' y2='18'/%3E%3C/svg%3E";
            imgClosed.style.display = 'block';
            imgClosed.title = 'Loan Status: ' + statusDescription;
            console.log('[LoanMaintenance] Icon displayed for status:', loanStatusID, '-', statusDescription);
          } else {
            imgClosed.style.display = 'none';
            console.log('[LoanMaintenance] Icon hidden - Active loan status:', loanStatusID);
          }
        }
      }
      
      console.log('%c========== LOAN DATA BINDING COMPLETE ==========', 'background: green; color: white; font-size: 14px; font-weight: bold;');
      
      // Enable navigation buttons now that a loan is loaded
      enableNavigationButtons();
      
      // Update state for child forms (submodules like Loan Statement)
      updateLoanMaintenanceState();
    }

    // Accepts optional direction and type for navigation
    async function tryGetLoan(direction, directionType) {
      console.log('%c========================================', 'background: #ff0000; color: white; font-size: 14px; font-weight: bold;');
      console.log('%c[LoanMaintenance] tryGetLoan CALLED', 'background: #ff0000; color: white; font-size: 14px; font-weight: bold;');
      console.log('%c========================================', 'background: #ff0000; color: white; font-size: 14px; font-weight: bold;');
      
      const LoansService = global.LoansService;
      console.log('[LoanMaintenance] LoansService available:', !!LoansService);
      console.log('[LoanMaintenance] LoansService.getLoan available:', typeof LoansService?.getLoan);
      
      if (!LoansService?.getLoan) {
        console.warn('[LoanMaintenance] LoansService not available yet');
        console.log('[LoanMaintenance] Retrying in 500ms...');
        setTimeout(tryGetLoan, 500);
        return;
      }

      const payload = buildGetLoanRequestData(direction, directionType);
      console.log('[LoanMaintenance] Request payload:', payload);
      
      if (!payload.OurBranchID || !payload.AccountID || !payload.LoanSeries) {
        console.warn('[LoanMaintenance] Missing required identifiers for GetLoan', payload);
        alert("Cannot navigate: Please ensure Branch ID, Account ID, and Loan Series are provided.");
        return;
      }

      const requestKey = `${payload.OurBranchID}|${payload.AccountID}|${payload.LoanSeries}|${payload.LoanRefNo}|${payload.Direction}|${payload.DirectionType}`;
      if (requestKey === lastGetLoanKey) {
        console.log('[LoanMaintenance] Same request as last call, skipping');
        return;
      }
      lastGetLoanKey = requestKey;

      console.log('[LoanMaintenance] Calling LoansService.getLoan with payload:', payload);
      
      try {
        const result = await LoansService.getLoan(payload);
        
        console.log('[LoanMaintenance] GetLoan result received:', result);
        console.log('[LoanMaintenance] result.success:', result?.success);
        console.log('[LoanMaintenance] result.code:', result?.code);
        console.log('[LoanMaintenance] result.message:', result?.message);
        console.log('[LoanMaintenance] result.data:', result?.data);
        
        if (!result?.success) {
          let userMsg = '';
          if (result?.code === 'NO_DATA') {
            // More specific message for navigation
            if (direction && directionType) {
              const typeNames = { 'A': 'Account', 'S': 'Series', 'R': 'Reference Number' };
              const dirName = direction === 1 ? 'next' : 'previous';
              const typeName = typeNames[directionType] || 'loan';
              userMsg = `There are no other records found. You are at the ${dirName === 'next' ? 'end' : 'beginning'} of the ${typeName} list.`;
            } else {
              userMsg = 'No loan details found for the provided criteria.';
            }
          } else if (result?.message) {
            userMsg = 'Failed to load loan details: ' + result.message;
          } else {
            userMsg = 'Failed to load loan details due to an unknown error.';
          }
          console.error('[LoanMaintenance] GetLoan failed:', {
            code: result?.code,
            message: result?.message,
            data: result?.data
          });
          alert(userMsg);
          
          // Only reset form if not a NO_DATA error (which means we've reached boundary)
          // For NO_DATA, keep the current loan displayed on the screen
          if (result?.code !== 'NO_DATA') {
            resetLoanMaintenanceForm();
            // Set branch name if possible
            const defaultBranch = getLoggedInBranchId && getLoggedInBranchId();
            if (defaultBranch) {
              document.getElementById('BranchID').value = defaultBranch;
              // Try to set BranchName if available in select or cache
              if (window.LookupService?.getBranchNameById) {
                document.getElementById('BranchName').value = window.LookupService.getBranchNameById(defaultBranch) || '';
              } else {
                document.getElementById('BranchName').value = '';
              }
            }
            setEntryMode();
          }
          return;
        }

        console.log('[LoanMaintenance] GetLoan success, binding data to form');
        bindLoanToForm(result.data);
        console.log('[LoanMaintenance] Data bound, now calling setViewMode()');
      
        // Verify buttons exist before calling setViewMode
        const viewBtn = document.querySelector('[data-shell-mode="View"]');
        const editBtn = document.querySelector('[data-shell-mode="Update"]');
        const saveBtn = document.querySelector('[data-submit-action="save"]');
        const cancelBtn = document.querySelector('[data-submit-action="cancel"]');
      
        console.log('[LoanMaintenance] Button check before setViewMode:');
        console.log('  - View button exists:', !!viewBtn);
        console.log('  - Edit button exists:', !!editBtn);
        console.log('  - Save button exists:', !!saveBtn);
        console.log('  - Cancel button exists:', !!cancelBtn);
      
        setViewMode();
        console.log('[LoanMaintenance] setViewMode() completed - buttons should now show: Edit=enabled, Cancel=disabled, View=disabled, Save=disabled');
        
        // IMMEDIATE verification
        console.log('%c=== BUTTON STATE VERIFICATION AFTER setViewMode ===', 'background: #FFC107; color: black; font-size: 12px; font-weight: bold;');
        setTimeout(() => {
          const v = document.querySelector('[data-shell-mode="View"]');
          const e = document.querySelector('[data-shell-mode="Update"]');
          const s = document.querySelector('[data-submit-action="save"]');
          const c = document.querySelector('[data-submit-action="cancel"]');
          
          console.log('%cButton State After setViewMode:', 'color: #FFC107; font-weight: bold;');
          console.log('  View (should be DISABLED):', {
            disabled: v?.disabled,
            classList: v?.className,
            dataAttr: v?.getAttribute('data-shell-mode')
          });
          console.log('  Edit (should be ENABLED):', {
            disabled: e?.disabled,
            classList: e?.className,
            dataAttr: e?.getAttribute('data-shell-mode')
          });
          console.log('  Save (should be DISABLED):', {
            disabled: s?.disabled,
            classList: s?.className,
            dataAttr: s?.getAttribute('data-submit-action')
          });
          console.log('  Cancel (should be DISABLED):', {
            disabled: c?.disabled,
            classList: c?.className,
            dataAttr: c?.getAttribute('data-submit-action')
          });
        }, 0);
      } catch (error) {
        console.error('[LoanMaintenance] Exception in tryGetLoan:', error);
        alert('Error: ' + error.message);
      }
    }

    function initLoanLookup() {
      const loanRefNoEl = document.getElementById("LoanRefNo");
      if (!loanRefNoEl) return;

      loanRefNoEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          tryGetLoan();
        }
      });

      loanRefNoEl.addEventListener("blur", () => {
        if (loanRefNoEl.value?.trim()) {
          tryGetLoan();
        }
      });
    }

  function initNavigation() {
    const navButtons = Array.from(document.querySelectorAll("[data-lm-nav]"));
    const loanNavButtons = Array.from(document.querySelectorAll("[data-action-nav]"));

    console.log('[InitNavigation] Found subwindow nav buttons:', navButtons.length);
    console.log('[InitNavigation] Found loan nav buttons:', loanNavButtons.length);

    // Initialize loan navigation buttons first
    loanNavButtons.forEach((btn) => {
      btn.disabled = true; // Disable until a loan is loaded
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const target = btn.getAttribute("data-action-nav");
        console.log('%c[LoanNav] Button clicked: ' + target, 'background: #ff6600; color: white; font-weight: bold;');
        
        if (!target) {
          console.log('[LoanNav] No target attribute found');
          return;
        }

        const branchID = readField("BranchID");
        const accountID = readField("AccountID");
        const loanSeries = readField("LoanSeries");
        
        console.log('[LoanNav] Current form state:', { branchID, accountID, loanSeries });
        
        if (!branchID || !accountID || !loanSeries) {
          alert("Please load a loan first. Use the search to find a loan.");
          return;
        }
        
        // Disable button while processing
        btn.disabled = true;
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-hourglass-split"></i>';

        try {
          // Navigation logic for Previous/Next buttons
          if (target === "prev-account") {
            console.log('[LoanNav] Executing: prev-account');
            setNavigationType("A");
            setNavigationDirection(-1);
            await tryGetLoan(-1, "A");
          } else if (target === "next-account") {
            console.log('[LoanNav] Executing: next-account');
            setNavigationType("A");
            setNavigationDirection(1);
            await tryGetLoan(1, "A");
          } else if (target === "prev-series") {
            console.log('[LoanNav] Executing: prev-series');
            setNavigationType("S");
            setNavigationDirection(-1);
            await tryGetLoan(-1, "S");
          } else if (target === "next-series") {
            console.log('[LoanNav] Executing: next-series');
            setNavigationType("S");
            setNavigationDirection(1);
            await tryGetLoan(1, "S");
          } else if (target === "prev-ref") {
            console.log('[LoanNav] Executing: prev-ref');
            setNavigationType("R");
            setNavigationDirection(-1);
            await tryGetLoan(-1, "R");
          } else if (target === "next-ref") {
            console.log('[LoanNav] Executing: next-ref');
            setNavigationType("R");
            setNavigationDirection(1);
            await tryGetLoan(1, "R");
          }
        } catch (error) {
          console.error('[LoanNav] ERROR:', error);
          alert('Navigation error: ' + (error?.message || 'Unknown error'));
        } finally {
          // Re-enable button
          btn.disabled = false;
          btn.innerHTML = originalContent;
          console.log('[LoanNav] Complete');
        }
      });
    });

    // Existing subwindow navigation setup
    const subwindow = document.getElementById("lmSubwindow");
    const subwindowFrame = document.getElementById("lmSubwindowFrame");
    const subwindowTitle = document.getElementById("lmSubwindowTitle");
    const closeBtn = document.getElementById("lmSubwindowClose");
    const cancelBtn = document.getElementById("lmSubwindowCancel");
    const backBtn = document.getElementById("lmSubwindowBack");

    const viewRoutes = new Map([
      ["installment-schedule", "view/installment-schedule.html"],
      ["loan-statement", "view/loan-statement.html"],
      ["penalty-interest-waive-off-history", "view/penalty-interest-waive-off-history.html"],
      ["loan-history", "view/loan-history.html"],
      ["loan-collaterals", "view/loan-collaterals.html"],
      ["guarantors", "view/guarantors.html"],
      ["loan-interest-worksheet", "view/loan-interest-worksheet.html"],
    ]);

    const dataEntryRoutes = new Map([
      ["guarantor", "dataentry/guarantor.html"],
      ["instruction", "dataentry/instruction.html"],
      ["insurance", "dataentry/insurance.html"],
      ["legal-expense", "dataentry/legal-expense.html"],
      ["loan-closing-opening", "dataentry/loan-closing-opening.html"],
      ["loan-collaterals", "dataentry/loan-collaterals.html"],
      ["loan-legal-remarks", "dataentry/loan-legal-remarks.html"],
      ["loan-repayment-reversal", "dataentry/loan-repayment-reversal.html"],
      ["loan-utilization", "dataentry/loan-utilization.html"],
      ["repayment-accounts", "dataentry/repayment-accounts.html"],
      ["release-freeze", "dataentry/release-freeze.html"],
      ["user-defined-fields", "dataentry/user-defined-fields.html"],
      ["writeoff-recovery", "dataentry/writeoff-recovery.html"],
      ["loan-utilization-modal", "dataentry/loan-utilization-modal.html"],
      ["repayment-accounts-modal", "dataentry/repayment-accounts-modal.html"],
    ]);

    let currentMainKey = "view";

    function clearNavActive() {
      navButtons.forEach((b) => {
        b.classList.remove("is-active");
        b.removeAttribute("aria-current");
      });
    }

    function setNavActive(button) {
      clearNavActive();
      if (!button) return;
      button.classList.add("is-active");
      button.setAttribute("aria-current", "page");
    }

    function findButtonByKey(key) {
      return navButtons.find((b) => b.getAttribute("data-lm-nav") === key) || null;
    }

    function closeSubwindow() {
      if (!subwindow) return;
      subwindow.setAttribute("hidden", "");
      if (subwindowFrame) subwindowFrame.src = "about:blank";
      document.body.classList.remove("lm-subwindow-open");
      subwindow.style.removeProperty("top");
      setNavActive(findButtonByKey(currentMainKey));
    }

    function openViewBase(sourceButton) {
      currentMainKey = "view";
      closeSubwindow();
      setNavActive(sourceButton);
    }

    function openSubwindow(key, sourceButton) {
      if (!subwindow || !subwindowFrame) return;
      const url = dataEntryRoutes.get(key) || viewRoutes.get(key);
      if (!url) return;

      // Integrate the subwindow into the main module by hiding the outer action rail.
      document.body.classList.add("lm-subwindow-open");

      // Some legacy screens include their own action rail (View/Reverse/Back etc).
      // For those, hide the generic subwindow action rail to avoid duplication.
      subwindow.classList.toggle(
        "lm-subwindow--no-actions",
        key === "loan-repayment-reversal" ||
          key === "installment-schedule" ||
          key === "loan-history" ||
          key === "guarantors" ||
          key === "writeoff-recovery" ||
          key === "release-freeze" ||
          key === "instruction" ||
          key === "repayment-accounts" ||
          key === "guarantor" ||
          key === "loan-collaterals" ||
          key === "loan-closing-opening" ||
          key === "loan-utilization" ||
          key === "loan-statement" ||

          key === "loan-interest-worksheet" ||
          key === "insurance" ||
          key === "legal-expense" ||
          key === "loan-legal-remarks" ||
          key === "user-defined-fields"
      );

      const label =
        (sourceButton && (sourceButton.textContent || "").trim()) ||
        (key || "Data Entry").replace(/-/g, " ");
      if (subwindowTitle) subwindowTitle.textContent = label;

      subwindowFrame.setAttribute("src", url);
      subwindow.removeAttribute("hidden");
      setNavActive(sourceButton);

      // With the identifiers area hidden while open, keep the subwindow pinned near the top.
      subwindow.style.top = "8px";

      // Ensure the subwindow starts scrolled to top each open.
      const content = subwindow.querySelector(".lm-subwindow__content");
      if (content) content.scrollTop = 0;
    }

    // Subwindow navigation setup for data entry and view buttons
    const subwindowNavButtons = navButtons; // navButtons are the [data-lm-nav] buttons
    
    subwindowNavButtons.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const target = btn.getAttribute("data-lm-nav");
        if (!target) return;

        // Existing navigation for subwindows/views
        if (target === "view") {
          openViewBase(btn);
          return;
        }
        if (viewRoutes.has(target)) {
          openSubwindow(target, btn);
          return;
        }
        if (dataEntryRoutes.has(target)) {
          openSubwindow(target, btn);
          return;
        }
      });
    });

    if (closeBtn) closeBtn.addEventListener("click", closeSubwindow);
    if (cancelBtn) cancelBtn.addEventListener("click", closeSubwindow);
    if (backBtn) backBtn.addEventListener("click", closeSubwindow);

    // Allow embedded pages to request closing the subwindow.
    global.addEventListener("message", (event) => {
      const data = event?.data;
      if (data && data.type === "lm-subwindow-close") {
        closeSubwindow();
      }
    });

    // Default state: keep overlay closed and select View.
    openViewBase(findButtonByKey("view"));
  }

    function populatePlaceholders() {
        // Just for demo purposes based on screenshot
        // In real app, these would come from an API or config
    }

    // =========================================================================
    // COLUMN HEADER FORMATTING - Convert camelCase to Title Case
    // =========================================================================
    function formatColumnHeader(columnName) {
      if (!columnName) return '';
      // Convert camelCase to Title Case: "UnclearBalance" → "Unclear Balance"
      return columnName
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
    }

    // =========================================================================
    // INFO DETAIL MODAL - Professional data display with print capability
    // =========================================================================
    /**
     * Display detailed information in a professional modal with print support
     * @param {Array|Object} data - Data to display (array of records or single object)
     * @param {string} title - Modal title
     * @param {string} modalId - Unique modal ID for this detail view
     * @param {Object} options - Additional options (headerClass, printable, etc)
     */
    function showInfoDetailModal(data, title, modalId, options = {}) {
      const {
        headerClass = 'bg-primary',
        printable = true,
        recordCount = null
      } = options;

      // Ensure data is an array
      const records = Array.isArray(data) ? data : [data];
      
      if (!records || records.length === 0) {
        showToast('No data to display', { title: 'Info', variant: 'info' });
        return;
      }

      // Get or create modal
      let modal = document.getElementById(`info-detail-${modalId}`);
      if (!modal) {
        const modalHTML = `
          <div class="modal fade" id="info-detail-${modalId}" tabindex="-1" aria-labelledby="infoDetailTitle-${modalId}" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-scrollable">
              <div class="modal-content">
                <div class="modal-header ${headerClass} text-white d-flex justify-content-between align-items-center">
                  <h5 class="modal-title" id="infoDetailTitle-${modalId}">${title}</h5>
                  <div class="d-flex gap-2">
                    ${printable ? `<button type="button" class="btn btn-sm btn-light" id="print-${modalId}" title="Print"><i class="bi bi-printer"></i></button>` : ''}
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                </div>
                <div class="modal-body">
                  <div class="table-responsive">
                    <table class="table table-sm table-hover align-middle" id="info-detail-table-${modalId}">
                      <thead class="table-light">
                        <!-- Headers will be generated -->
                      </thead>
                      <tbody id="info-detail-body-${modalId}">
                        <!-- Data rows will be generated -->
                      </tbody>
                    </table>
                  </div>
                </div>
                <div class="modal-footer">
                  <small class="text-muted">${records.length} record${records.length !== 1 ? 's' : ''} displayed</small>
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById(`info-detail-${modalId}`);
      }

      // Get first record to determine columns
      const firstRecord = records[0];
      const columns = Object.keys(firstRecord).filter(key => {
        const val = firstRecord[key];
        return val !== null && val !== undefined && val !== '';
      });

      // Build table header
      const thead = modal.querySelector('thead');
      thead.innerHTML = `
        <tr>
          ${columns.map(col => `<th>${formatColumnHeader(col)}</th>`).join('')}
        </tr>
      `;

      // Build table body
      const tbody = modal.querySelector(`#info-detail-body-${modalId}`);
      tbody.innerHTML = records.map(record => `
        <tr>
          ${columns.map(col => {
            const value = record[col];
            const isNumeric = typeof value === 'number' || (typeof value === 'string' && /^\d+\.?\d*$/.test(value));
            return `<td class="${isNumeric ? 'text-end' : ''}">${value !== null && value !== undefined ? value : '-'}</td>`;
          }).join('')}
        </tr>
      `).join('');

      // Wire print button
      if (printable) {
        const printBtn = modal.querySelector(`#print-${modalId}`);
        if (printBtn) {
          printBtn.onclick = () => printInfoDetailModal(modal, title, records.length);
        }
      }

      // Show modal
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
    }

    /**
     * Print detailed information modal with professional formatting
     * @param {HTMLElement} modal - The modal element to print
     * @param {string} title - Report title
     * @param {number} recordCount - Number of records
     */
    function printInfoDetailModal(modal, title, recordCount) {
      const table = modal.querySelector('table');
      if (!table) return;

      const printWindow = window.open('', '_blank');
      const tableClone = table.cloneNode(true);

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; margin: 20px; }
            .print-header { border-bottom: 2px solid #333; margin-bottom: 20px; padding-bottom: 10px; }
            .print-title { font-size: 18px; font-weight: bold; color: #333; margin: 0; }
            .print-info { font-size: 12px; color: #666; margin: 5px 0 0 0; }
            .print-date { text-align: right; font-size: 11px; color: #999; margin-top: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            thead { background: #f5f5f5; border-bottom: 1px solid #ddd; }
            th { padding: 10px; text-align: left; font-weight: 600; font-size: 12px; }
            td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
            td.text-end { text-align: right; }
            tbody tr:nth-child(even) { background: #fafafa; }
            .print-footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 10px; color: #999; }
            @media print { body { margin: 0; } .print-header { page-break-after: avoid; } }
          </style>
        </head>
        <body>
          <div class="print-header">
            <p class="print-title">${title}</p>
            <p class="print-info">${recordCount} record${recordCount !== 1 ? 's' : ''} | Generated: ${new Date().toLocaleString()}</p>
          </div>
          ${tableClone.outerHTML}
          <div class="print-footer">
            <p>This document was automatically generated from Loan Maintenance. For official records, please verify with the system administrator.</p>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      
      // Wait for content to render, then print
      setTimeout(() => {
        printWindow.print();
        // Close after printing (optional, depends on browser behavior)
        // printWindow.close();
      }, 250);
    }

    // =========================================================================
    // REFORMAT ALL FIELDS - Apply formatting after data load
    // =========================================================================
    /**
     * Reformat all currency and date fields after data loading
     * Ensures consistent formatting across the entire form
     */
    function reformatAllFields() {
      // Reformat all input fields with money or date types
      const inputs = form.querySelectorAll('input[data-type], span[data-type]');
      inputs.forEach(field => {
        const dataType = field.getAttribute('data-type');
        const value = field.value || field.textContent;

        if (!value) return;

        // Reformat money fields
        if (dataType && dataType.toLowerCase().includes('money')) {
          const formatted = formatMoney(value);
          if (field.tagName === 'INPUT') {
            field.value = formatted;
          } else {
            field.textContent = formatted;
          }
        }
        // Reformat date fields (DD/MM/YYYY)
        else if (dataType && dataType.toLowerCase().includes('date')) {
          const formatted = formatDateDDMMYYYY(value);
          if (field.tagName === 'INPUT') {
            field.value = formatted;
          } else {
            field.textContent = formatted;
          }
        }
      });
    }

    // Initialize when DOM is ready (services already loaded via HTML)
    if (document.readyState === 'loading') {
      console.log('[LoanMaintenance] Waiting for DOMContentLoaded...');
      document.addEventListener('DOMContentLoaded', () => {
        console.log('[LoanMaintenance] DOMContentLoaded fired, initializing...');
        init();
      });
    } else {
      console.log('[LoanMaintenance] DOM already ready, initializing immediately...');
      init();
    }
  })(window);
