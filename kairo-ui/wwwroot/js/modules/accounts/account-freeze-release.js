(function () {
  'use strict';

  console.log('Freeze/Release JavaScript loaded');

  // State management
  let currentState = 'view'; // 'view', 'edit'
  let originalData = {};
  let searchModal = null;

  // Initialize the module
  function init() {
    console.log('Initializing freeze/release module...');
    wireEventHandlers();
    initializeFormState();
    setupKeyboardNavigation();
    notifyParentOpened();

    // Populate with parent account data before setting focus
    populateFromParentData();

    // Set initial focus to View button
    setTimeout(() => {
      const viewBtn = document.querySelector('[data-action="view"]');
      console.log('Setting focus to view button:', viewBtn);
      if (viewBtn) viewBtn.focus();
    }, 100);

    // Initialize Search Modal
    if (window.SearchModal) {
      searchModal = new window.SearchModal({
        prefix: 'af',
        getOperatorId: getCurrentOperatorID,
        getOurBranchId: () => document.getElementById('branchId')?.value || '',
        searchFn: async (payload, config) => {
          // Special handling for AccountFreeze to use history API which is more reliable for listing
          if (config.tableID === 'AccountFreeze') {
            const branchId = document.getElementById('branchId')?.value;
            const accountId = document.getElementById('accountId')?.value;

            if (!branchId || !accountId) return { success: true, Details: [] };

            // Use same date range format as history tab for consistency
            const toDate = new Date();
            toDate.setFullYear(toDate.getFullYear() + 1); // 1 year forward
            const fromDate = new Date();
            fromDate.setFullYear(fromDate.getFullYear() - 10); // 10 years back

            const request = {
              OurBranchID: branchId,
              AccountID: accountId,
              FromDate: fromDate.toISOString(),
              ToDate: toDate.toISOString()
            };

            try {
              const response = await window.BlockingUnblockingService.getAccountFreezeHistory(request);

              // Normalize results - handles raw arrays or RecordSet objects
              let results = response.Details || response.data || [];
              if (results && results.RecordSet) {
                results = results.RecordSet;
              }
              if (!Array.isArray(results)) {
                results = results ? [results] : [];
              }

              // If history is empty, try to get at least the active one
              if (results.length === 0) {
                const activeReq = {
                  OurBranchID: branchId,
                  AccountID: accountId,
                  ReferenceID: '',
                  OperatorID: getCurrentOperatorID(),
                  Direction: 1 // Next starting from start (gets active)
                };
                try {
                  const activeResp = await window.BlockingUnblockingService.getAccountFreeze(activeReq);
                  let activeData = activeResp.Details || activeResp.data || [];
                  if (activeData && activeData.RecordSet) activeData = activeData.RecordSet;
                  if (activeData) {
                    const list = Array.isArray(activeData) ? activeData : [activeData];
                    if (list.length > 0) results = list;
                  }
                } catch (e) {
                  console.warn('Fallback lookup failed:', e);
                }
              }

              // Handle local filtering if a search term was entered in the modal
              const searchField = config.searchFields?.[0]?.column;
              if (searchField && payload.WhereStmt && payload.WhereStmt.includes(searchField)) {
                const match = payload.WhereStmt.match(/LIKE\s+'%([^%]*)%'/i);
                if (match && match[1]) {
                  const term = match[1].toLowerCase();
                  results = results.filter(r => String(r[searchField] || '').toLowerCase().includes(term));
                } else {
                  const exactMatch = payload.WhereStmt.match(/=\s+'([^']*)'/);
                  if (exactMatch && exactMatch[1]) {
                    const term = exactMatch[1].toLowerCase();
                    results = results.filter(r => String(r[searchField] || '').toLowerCase() === term);
                  }
                }
              }

              return { success: true, Details: results };
            } catch (err) {
              console.error('Reference lookup failed:', err);
              return { success: false, Details: [] };
            }
          }
          // Default to standard search for other lookups
          return window.SearchService.search(payload);
        }
      });
    }
  }

  // Wire all event handlers
  function wireEventHandlers() {
    wireWindowControls();
    wireActionButtons();
    wireLookupButtons();
    wireKairoControls();
    wireSectionToggles();
    wireFormValidation();
  }

  // Window control handlers
  function wireWindowControls() {
    const refreshBtn = document.querySelector('[data-action="refresh"]');
    const maximizeBtn = document.querySelector('[data-action="maximize"]');
    const closeBtn = document.querySelector('[data-action="close"]');

    if (refreshBtn) refreshBtn.addEventListener('click', handleRefresh);
    if (maximizeBtn) maximizeBtn.addEventListener('click', handleMaximize);
    if (closeBtn) closeBtn.addEventListener('click', handleClose);
  }

  // Action button handlers
  function wireActionButtons() {
    console.log('Wiring action buttons...');
    const historyBtn = document.querySelector('[data-action="history"]');
    const addBtn = document.querySelector('[data-action="add"]');
    const releaseBtn = document.querySelector('[data-action="release"]');
    const viewBtn = document.querySelector('[data-action="view"]');
    const saveBtn = document.querySelector('[data-action="save"]');
    const cancelBtn = document.querySelector('[data-action="cancel"]');

    console.log('View button found:', viewBtn);

    if (historyBtn) historyBtn.addEventListener('click', () => handleHistory());
    if (addBtn) addBtn.addEventListener('click', () => handleAdd());
    if (releaseBtn) releaseBtn.addEventListener('click', () => handleRelease());
    if (viewBtn) {
      viewBtn.addEventListener('click', () => {
        console.log('View button clicked!');
        handleViewClick();
      });
    }
    if (saveBtn) saveBtn.addEventListener('click', handleSave);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
  }

  // Handle Add button click
  function handleAdd() {
    console.log('Add button clicked');

    const accountId = document.getElementById('accountId')?.value;
    const branchId = document.getElementById('branchId')?.value;

    if (!accountId || !branchId) {
      showMessage('Please enter Branch ID and Account ID to add a freeze record', 'warning');
      // Focus first empty field
      if (!branchId) {
        document.getElementById('branchId').focus();
      } else if (!accountId) {
        document.getElementById('accountId').focus();
      }
      return;
    }

    console.log('Setting form state to add');
    setFormState('edit'); // Use edit state for data entry

    // Clear transaction-specific fields for new entry
    const fieldsToReset = ['fixedAmount', 'effectiveDate', 'reason', 'referenceId'];
    fieldsToReset.forEach(f => {
      const el = document.getElementById(f);
      if (el) {
        el.value = '';
        el.disabled = false;
        el.readOnly = false;
        el.removeAttribute('disabled');
        el.removeAttribute('readonly');
      }
    });

    clearAuditFields();
    clearAllErrors();

    // Set today's date as default
    const dateField = document.getElementById('effectiveDate');
    if (dateField) {
      const today = new Date();
      if (dateField.type === 'date') {
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateField.value = `${yyyy}-${mm}-${dd}`;
      } else if (window.GlobalUtils) {
        dateField.value = window.GlobalUtils.formatDate(today);
      }

      // Trigger change for validation/UI sync
      dateField.dispatchEvent(new Event('input', { bubbles: true }));
      dateField.dispatchEvent(new Event('change', { bubbles: true }));

      // Focus the field
      setTimeout(() => dateField.focus(), 150);
    }

    showMessage('Ready to add new freeze record for Account: ' + accountId, 'info');
  }

  // Handle View button click
  function handleViewClick() {
    console.log('handleViewClick called');
    const accountId = document.getElementById('accountId')?.value;
    const branchId = document.getElementById('branchId')?.value;
    const referenceId = document.getElementById('referenceId')?.value?.trim();
    const accountName = document.getElementById('accountName')?.value;

    console.log('Account values:', { branchId, accountId, referenceId, accountName });

    if (!accountId || !branchId) {
      console.log('Missing required fields');
      showMessage('Please enter Branch ID and Account ID to view freeze data', 'warning');
      // Focus first empty field
      if (!branchId) {
        document.getElementById('branchId').focus();
      } else if (!accountId) {
        document.getElementById('accountId').focus();
      }
      return;
    }

    if (!referenceId) {
      console.log('Missing Reference ID');
      showMessage('Please enter Reference ID to view freeze data', 'warning');
      document.getElementById('referenceId').focus();
      return;
    }

    console.log('Calling loadAccountFreezeData...');
    // Update header when manually entering account details
    updateHeader(branchId, accountId, accountName);

    // Call the API to load freeze data
    loadAccountFreezeData();

    setFormState('view');
  }

  // Lookup button handlers
  function wireLookupButtons() {
    // Handle both standard btn-lookup and Kairo control lookups
    document.querySelectorAll('.btn-lookup[data-lookup], .kairo-branch-control__lookup, .kairo-account-control__lookup').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const lookupType = btn.getAttribute('data-lookup') ||
          (btn.classList.contains('kairo-branch-control__lookup') ? 'branchId' :
            btn.classList.contains('kairo-account-control__lookup') ? 'accountId' : 'unknown');
        handleLookup(lookupType);
      });
    });
  }

  // Kairo control handlers
  function wireKairoControls() {
    // Handle Branch ID control
    const branchIdField = document.getElementById('branchId');
    const branchNameField = document.getElementById('branchName');

    if (branchIdField && branchNameField) {
      branchIdField.addEventListener('input', () => {
        // Clear branch name when ID is manually changed
        if (branchIdField.value.trim() === '') {
          branchNameField.value = '';
        }
      });

      branchIdField.addEventListener('blur', () => {
        // Auto-lookup branch name if ID is entered
        const branchId = branchIdField.value.trim();
        if (branchId && !branchNameField.value) {
          // Could implement auto-lookup here
          console.log('Branch ID entered:', branchId);
        }
      });
    }

    // Handle Account ID control  
    const accountIdField = document.getElementById('accountId');
    const accountNameField = document.getElementById('accountName');

    if (accountIdField && accountNameField) {
      accountIdField.addEventListener('input', () => {
        // Clear account name when ID is manually changed
        if (accountIdField.value.trim() === '') {
          accountNameField.value = '';
        }
      });

      accountIdField.addEventListener('blur', () => {
        // Auto-lookup account name if ID is entered
        const accountId = accountIdField.value.trim();
        if (accountId && !accountNameField.value) {
          // Could implement auto-lookup here
          console.log('Account ID entered:', accountId);
        }
      });
    }
  }

  // Section toggle handlers
  function wireSectionToggles() {
    document.querySelectorAll('[data-section-toggle]').forEach(header => {
      header.addEventListener('click', (e) => {
        // Don't toggle if clicking the toggle button itself
        if (e.target.closest('.section-toggle-btn')) return;
        toggleSection(header);
      });
    });

    document.querySelectorAll('.section-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const header = btn.closest('[data-section-toggle]');
        toggleSection(header);
      });
    });
  }

  // Form validation handlers
  function wireFormValidation() {
    // Add real-time validation as needed
    const requiredFields = document.querySelectorAll('[required]');
    requiredFields.forEach(field => {
      field.addEventListener('blur', validateField);
      field.addEventListener('input', clearFieldError);
    });

    // Add Reference ID validation for View button
    const referenceIdField = document.getElementById('referenceId');
    if (referenceIdField) {
      referenceIdField.addEventListener('input', updateViewButtonState);
      referenceIdField.addEventListener('blur', updateViewButtonState);
    }
  }

  // Section collapse/expand functionality
  function toggleSection(header) {
    if (!header) return;

    const section = header.closest('.form-section');
    const content = section.querySelector('[data-section-content]');
    const toggleBtn = header.querySelector('.section-toggle-btn i');

    if (!section || !content || !toggleBtn) return;

    const isCollapsed = section.classList.contains('collapsed');

    if (isCollapsed) {
      // Expand
      section.classList.remove('collapsed');
      content.style.maxHeight = content.scrollHeight + 'px';
      content.style.opacity = '1';
      toggleBtn.style.transform = 'rotate(0deg)';
    } else {
      // Collapse
      content.style.maxHeight = '0px';
      content.style.opacity = '0';
      toggleBtn.style.transform = 'rotate(180deg)';

      // Add collapsed class after animation starts
      setTimeout(() => {
        section.classList.add('collapsed');
      }, 50);
    }
  }

  // Expand Behind the Scene section to show populated data
  function expandBehindSceneSection() {
    try {
      const behindSceneSection = document.querySelector('[data-section="behind-scene"]');
      if (!behindSceneSection) {
        console.warn('Behind the Scene section not found');
        return;
      }

      const header = behindSceneSection.querySelector('[data-section-toggle]');
      const content = behindSceneSection.querySelector('[data-section-content]');
      const toggleBtn = header?.querySelector('.section-toggle-btn i');

      if (!header || !content || !toggleBtn) {
        console.warn('Behind the Scene section elements not found');
        return;
      }

      // Check if already expanded
      const isCollapsed = behindSceneSection.classList.contains('collapsed');

      if (isCollapsed) {
        // Expand the section
        behindSceneSection.classList.remove('collapsed');
        content.style.maxHeight = content.scrollHeight + 'px';
        content.style.opacity = '1';
        toggleBtn.style.transform = 'rotate(0deg)';
        console.log('Expanded Behind the Scene section to show populated fields');
      } else {
        console.log('Behind the Scene section is already expanded');
      }

    } catch (error) {
      console.error('Error expanding Behind the Scene section:', error);
    }
  }

  // Form state management
  function setFormState(state) {
    if (currentState === state) return;

    const prevState = currentState;
    currentState = state;

    updateFormFields(state);
    updateActionButtons(state);

    if (state === 'view') {
      // Only load data if we have account information
      const accountId = document.getElementById('accountId')?.value;
      const branchId = document.getElementById('branchId')?.value;

      if (accountId && branchId) {
        loadAccountFreezeData();
        showMessage('Loading freeze data for account: ' + accountId, 'info');
      } else {
        showMessage('Enter Account ID and Branch ID, then click View to load data', 'info');
      }
    } else if (state === 'edit' && prevState === 'view') {
      // Store original data
      originalData = captureFormData();
      showMessage('Form is now editable', 'info');

      // Focus first editable field
      const firstField = document.querySelector('input:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled]), select:not([disabled])');
      if (firstField) firstField.focus();
    } else if (state === 'initial') {
      // Initial state - form ready for first-time use
      showMessage('Form ready. Enter Account details and click View to load data, or click Add to create new freeze record.', 'info');
    }
  }

  // Update form field states
  function updateFormFields(state) {
    const editableSelectors = [
      '#branchId', '#accountId', '#referenceId',
      '#effectiveDate', '#fixedAmount', '#reason'
    ];

    editableSelectors.forEach(selector => {
      const field = document.querySelector(selector);
      if (field) {
        if (state === 'edit') {
          // Only freeze details should be editable in edit/add mode
          if (['#effectiveDate', '#fixedAmount', '#reason'].includes(selector)) {
            field.disabled = false;
            field.readOnly = false;
            field.removeAttribute('disabled');
            field.removeAttribute('readonly');
            console.log(`Setting ${selector} to editable in edit mode`);
          } else {
            // Lock IDs in edit mode to prevent changing context while adding
            field.disabled = true;
            field.readOnly = true;
            field.setAttribute('disabled', 'disabled');
            field.setAttribute('readonly', 'readonly');
            console.log(`Locking ${selector} in edit mode`);
          }
        } else if (state === 'view') {
          // POST-VIEW LOCK: User requested non-editable after view
          field.disabled = true;
          field.readOnly = true;
          field.setAttribute('disabled', 'disabled');
          field.setAttribute('readonly', 'readonly');
          console.log(`Locking ${selector} in view mode`);
        } else if (state === 'initial') {
          // INITIAL/RESET: IDs are editable to allow lookup
          if (selector === '#branchId' || selector === '#accountId' || selector === '#referenceId') {
            field.disabled = false;
            field.readOnly = false;
            field.removeAttribute('disabled');
            field.removeAttribute('readonly');
          } else {
            field.disabled = true;
            field.readOnly = true;
            field.setAttribute('disabled', 'disabled');
            field.setAttribute('readonly', 'readonly');
          }
        } else {
          field.disabled = true;
          field.setAttribute('disabled', 'disabled');
        }
      }
    });

    // Ensure readonly fields in "Behind the Scene" section stay readonly and enabled
    const readonlySelectors = [
      '#clearBalance', '#unclearBalance', '#availableBalance', '#totalBalance',
      '#drawingPower', '#minimumBalance', '#freezedAmount', '#productId',
      '#currencyId', '#releasedReason', '#releasedDate', '#loanBranchId', '#loanAccountId'
    ];

    readonlySelectors.forEach(selector => {
      const field = document.querySelector(selector);
      if (field) {
        field.removeAttribute('disabled'); // Ensure they're not disabled
        field.setAttribute('readonly', 'readonly'); // Keep them readonly
      }
    });

    // Lookup buttons
    document.querySelectorAll('.btn-lookup').forEach(btn => {
      const lookupType = btn.getAttribute('data-lookup');
      if (state === 'view') {
        // USER REQUESTED: once it populates the screen as on view, the search should be disabled
        btn.disabled = true;
        btn.setAttribute('disabled', 'disabled');
      } else if (state === 'initial') {
        // In initial state, allow lookups for IDs
        btn.disabled = !['branchId', 'accountId', 'referenceId'].includes(lookupType);
        if (!btn.disabled) btn.removeAttribute('disabled');
      } else if (state === 'edit') {
        // In edit/add mode, branch and account IDs should be locked
        if (['branchId', 'accountId', 'referenceId'].includes(lookupType)) {
          btn.disabled = true;
          btn.setAttribute('disabled', 'disabled');
        } else {
          // Allow other lookups if they exist
          btn.disabled = false;
          btn.removeAttribute('disabled');
        }
      } else {
        btn.disabled = true;
        btn.setAttribute('disabled', 'disabled');
      }
    });

    // Date picker trigger buttons
    document.querySelectorAll('[data-date-trigger]').forEach(btn => {
      btn.disabled = (state !== 'edit');
      // If it's a child of a disabled group, make sure it's explicitly handled
      if (state === 'edit') {
        btn.removeAttribute('disabled');
      } else {
        btn.setAttribute('disabled', 'disabled');
      }
    });
  }

  // Update action button states
  function updateActionButtons(state) {
    const historyBtn = document.querySelector('[data-action="history"]');
    const addBtn = document.querySelector('[data-action="add"]');
    const releaseBtn = document.querySelector('[data-action="release"]');
    const viewBtn = document.querySelector('[data-action="view"]');
    const editBtn = document.querySelector('[data-action="edit"]');
    const saveBtn = document.querySelector('[data-action="save"]');
    const cancelBtn = document.querySelector('[data-action="cancel"]');

    if (state === 'view') {
      if (historyBtn) historyBtn.disabled = false;
      if (addBtn) addBtn.disabled = false;

      // Release button strictly enabled only if an active freeze record is loaded
      if (releaseBtn) {
        const hasAmount = document.getElementById('fixedAmount')?.value?.trim();
        const releasedDate = document.getElementById('releasedDate')?.value?.trim();
        const hasActiveFreeze = hasAmount && (!releasedDate || releasedDate === '');
        releaseBtn.disabled = !hasActiveFreeze;
      }

      if (viewBtn) {
        viewBtn.classList.remove('btn-view'); // Remove visual highlight
        viewBtn.disabled = true; // User requested: view button non-editable/deactivated
      }

      if (editBtn) editBtn.disabled = true; // Lock editing while in strict view
      if (saveBtn) saveBtn.disabled = true;
      if (cancelBtn) {
        cancelBtn.disabled = false; // User requested: cancel button activated
        cancelBtn.classList.add('btn-cancel');
      }
    } else if (state === 'edit') {
      // In Edit/Add mode, strictly only Save and Cancel should be active
      if (historyBtn) historyBtn.disabled = true;
      if (addBtn) addBtn.disabled = true;
      if (releaseBtn) releaseBtn.disabled = true;

      if (viewBtn) {
        viewBtn.classList.remove('btn-view');
        viewBtn.disabled = true;
      }

      if (editBtn) editBtn.disabled = true;

      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.classList.add('btn-save');
      }

      if (cancelBtn) {
        cancelBtn.disabled = false;
        cancelBtn.classList.add('btn-cancel');
      }
    } else if (state === 'initial') {
      // PAGE LOAD / RESET STATE: only view, add, and history are active
      if (historyBtn) historyBtn.disabled = false;
      if (addBtn) addBtn.disabled = false;
      if (releaseBtn) releaseBtn.disabled = true;
      if (viewBtn) {
        viewBtn.classList.add('btn-view');
        viewBtn.disabled = false; // Enabled to allow search/load flow
      }

      // Explicitly disable action-only buttons
      if (saveBtn) saveBtn.disabled = true;
      if (cancelBtn) cancelBtn.disabled = true;
      if (editBtn) editBtn.disabled = true;

      console.log('Button state reset to: View, Add, History active');
    }
  }

  // Clear form fields for next operation while preserving only branch and account ID
  function clearAllFormFields() {
    console.log('Clearing form fields for next operation');

    // Clear transaction-specific and balance fields
    const fieldsToClear = [
      'referenceId', 'effectiveDate', 'fixedAmount', 'reason',
      'clearBalance', 'unclearBalance', 'drawingPower', 'freezedAmount',
      'currencyId', 'availableBalance', 'totalBalance', 'minimumBalance',
      'releasedReason', 'releasedDate', 'productId', 'loanBranchId', 'loanAccountId'
    ];

    fieldsToClear.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        if (field.tagName.toLowerCase() === 'span') {
          field.textContent = '';
        } else {
          field.value = '';
          // Also clear flatpickr if it exists on this field
          if (field._flatpickr) {
            field._flatpickr.clear();
          }
        }
      }
    });

    // Clear audit fields
    clearAuditFields();

    // Collapse Behind the Scene section if expanded
    collapseBehindSceneSection();

    // Keep only branch and account identification fields populated
    // (branchId, branchName, accountId, accountName remain)

    console.log('Form fields cleared successfully - only branch and account details preserved');
  }

  function collapseBehindSceneSection() {
    const collapseEl = document.getElementById('behindTheScene');
    if (collapseEl) {
      if (window.bootstrap && window.bootstrap.Collapse) {
        try {
          // Check if instance exists
          let bsCollapse = window.bootstrap.Collapse.getInstance(collapseEl);
          if (!bsCollapse) {
            bsCollapse = new window.bootstrap.Collapse(collapseEl, { toggle: false });
          }
          bsCollapse.hide();
        } catch (e) {
          collapseEl.classList.remove('show');
        }
      } else {
        collapseEl.classList.remove('show');
        const trigger = document.querySelector('[data-bs-target="#behindTheScene"]');
        if (trigger) trigger.classList.add('collapsed');
      }
    }
  }

  function clearAuditFields() {
    // 1. Clear all audit fields by class (Robust "catch-all" fix)
    // This ensures data is cleared even if IDs don't match exactly
    const auditValues = document.querySelectorAll('.audit-value');
    auditValues.forEach(el => {
      el.textContent = '-';
    });

    // Audit fields use specific IDs in the HTML, different from logical names
    const legacyAuditIds = [
      'MakerID', 'MakerDT',
      'ModifierID', 'ModifierDT',
      'CheckerID', 'CheckerDT'
    ];

    legacyAuditIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = '-'; // Reset to hyphen
        console.log(`Cleared audit field via ID: ${id}`);
      }
    });

    // Also clear generic fields by logical names/IDs just in case
    const genericAuditFields = [
      'createdBy', 'createdOn',
      'modifiedBy', 'modifiedOn',
      'supervisedBy', 'supervisedOn'
    ];

    genericAuditFields.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (el.tagName === 'INPUT') el.value = '';
        else el.textContent = '-';
      }

      // Also try data-field attribute
      const dataEls = document.querySelectorAll(`[data-field="${id}"]`);
      dataEls.forEach(de => {
        de.textContent = '-';
      });
    });
  }

  // Reset form to initial state
  function resetToInitialState() {
    console.log('Resetting to initial state');

    // Clear all form fields
    clearAllFormFields();

    // Reset form state to initial with only view, add, history active
    currentState = null; // Reset current state
    setFormState('initial');

    // Update header to default
    updateHeader('', '', '');

    console.log('Form reset to initial state');
  }

  // Collect form data for save operation
  function collectFormData() {
    try {
      const branchId = document.getElementById('branchId')?.value?.trim();
      const accountId = document.getElementById('accountId')?.value?.trim();
      const referenceId = document.getElementById('referenceId')?.value?.trim() || '0';
      const effectiveDate = document.getElementById('effectiveDate')?.value;
      const fixedAmount = document.getElementById('fixedAmount')?.value?.trim();
      const reason = document.getElementById('reason')?.value?.trim();

      if (!branchId || !accountId) {
        showMessage('Branch ID and Account ID are required', 'error');
        return null;
      }

      if (!effectiveDate || effectiveDate === '--Select--') {
        showMessage('Effective Date is required', 'error');
        return null;
      }

      if (!fixedAmount) {
        showMessage('Fixed Amount is required', 'error');
        return null;
      }

      // Parse and validate the amount
      const parsedAmount = parseFloat(fixedAmount.replace(/[,\s]/g, ''));
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        showMessage('Please enter a valid amount greater than 0', 'error');
        return null;
      }

      // Get current operator ID
      const operatorId = getCurrentOperatorID();

      // Format dates 
      const currentDateTime = new Date().toISOString();
      let formattedEffectiveDate = effectiveDate;

      // Use GlobalUtils to parse various date formats (including DD-MMM-YYYY)
      // Since we moved to input type="date", the value is likely YYYY-MM-DD
      if (effectiveDate && effectiveDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        formattedEffectiveDate = effectiveDate + 'T00:00:00';
      } else if (window.GlobalUtils) {
        const parsed = window.GlobalUtils.parseDateInput(effectiveDate);
        if (parsed) {
          formattedEffectiveDate = parsed + 'T00:00:00';
        }
      } else if (effectiveDate && !effectiveDate.includes('T')) {
        formattedEffectiveDate = effectiveDate + 'T00:00:00';
      }

      return {
        OurBranchID: branchId,
        AccountID: accountId,
        ReferenceID: parseInt(referenceId) || 1,
        FreezedDate: currentDateTime,
        EffectiveDate: formattedEffectiveDate,
        FreezeCateGoryID: "NF", // Default freeze category
        FreezedReason: reason || "Account freeze via system",
        FreezedValue: parsedAmount,
        CreatedBy: operatorId,
        CreatedOn: null, // Server will set
        ModifiedBy: null,
        ModifiedOn: null,
        SupervisedBy: null,
        LoanBranchID: null,
        LoanAccountID: null,
        ApplicationID: null,
        UpdateCount: 1
      };
    } catch (error) {
      console.error('Error collecting form data:', error);
      showMessage('Error collecting form data: ' + error.message, 'error');
      return null;
    }
  }

  // Handle save response
  function handleSaveResponse(response, originalData) {
    console.log('Processing save response:', response);

    try {
      // Enhanced Reference ID extraction from multiple possible response formats
      let newReferenceId = null;

      // Try different possible response structures
      if (response.Details && response.Details.length > 0) {
        newReferenceId = response.Details[0].ReferenceID || response.Details[0].referenceId;
      } else if (response.data && response.data.Details && response.data.Details.length > 0) {
        newReferenceId = response.data.Details[0].ReferenceID || response.data.Details[0].referenceId;
      } else if (response.ReferenceID) {
        newReferenceId = response.ReferenceID;
      } else if (response.referenceId) {
        newReferenceId = response.referenceId;
      } else if (response.data && response.data.ReferenceID) {
        newReferenceId = response.data.ReferenceID;
      }

      console.log('Extracted Reference ID:', newReferenceId);

      // Update the Reference ID field if we got a new one
      if (newReferenceId) {
        const refField = document.getElementById('referenceId');
        if (refField) {
          refField.value = newReferenceId;
          console.log('Updated Reference ID field to:', newReferenceId);
        }
      }

      setFormState('initial');

      // Enhanced success message with Reference ID
      if (newReferenceId) {
        showMessage(`Data saved successfully! Reference ID: ${newReferenceId}`, 'success');
      } else {
        showMessage('Data saved successfully!', 'success');
      }

      // Reset form to initial state after successful save
      setTimeout(() => {
        resetToInitialState();
        showMessage('Form cleared and ready for next operation', 'info');
      }, 2000); // Show success message for 2 seconds, then reset

    } catch (error) {
      console.error('Error processing save response:', error);
      showMessage('Save completed but error processing response: ' + error.message, 'error');
    }
  }

  // Initialize form state
  function initializeFormState() {
    setFormState('initial');

    // Ensure Reference ID field is always editable
    const refField = document.getElementById('referenceId');
    if (refField) {
      refField.readOnly = false;
      console.log('Reference ID field initialized as editable');
    }

    // Initialize View button state based on Reference ID
    updateViewButtonState();

    // Load initial data if needed
    loadFormData();
  }

  // Capture form data for restoration
  function captureFormData() {
    const data = {};
    const fields = document.querySelectorAll('input, textarea, select');
    fields.forEach(field => {
      if (field.id) {
        data[field.id] = field.value;
      }
    });
    return data;
  }

  // Restore form data
  function restoreFormData(data) {
    Object.keys(data).forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.value = data[fieldId];
      }
    });
  }

  // Window control actions
  function handleRefresh() {
    showLoadingOverlay(true);

    // Clear any validation errors
    clearAllErrors();

    setTimeout(() => {
      showLoadingOverlay(false);
      window.location.reload();
    }, 500);
  }

  function handleMaximize() {
    try {
      window.parent.postMessage({
        type: 'toggleSidebarForMaximize',
        source: 'Freeze/Release'
      }, '*');
    } catch (e) {
      console.warn('Could not communicate with parent window');
    }
  }

  function handleClose() {
    if (currentState === 'edit') {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }

    try {
      window.parent.postMessage({
        type: 'submoduleClosed',
        source: 'Freeze/Release'
      }, '*');
    } catch (e) {
      console.warn('Could not communicate with parent window');
    }

    // Fallback close
    setTimeout(() => {
      window.close();
    }, 100);
  }

  // Form action handlers
  function handleHistory() {
    console.log('History action triggered');
    const accountId = document.getElementById('accountId')?.value;
    const branchId = document.getElementById('branchId')?.value;

    if (!accountId || !branchId) {
      showMessage('Please select an account before viewing history', 'warning');
      return;
    }

    showMessage('Loading transaction history...', 'info');
    openHistoryModal(branchId, accountId);
  }

  function handleRelease() {
    const accountId = document.getElementById('accountId')?.value;
    const branchId = document.getElementById('branchId')?.value;
    const referenceId = document.getElementById('referenceId')?.value;

    if (!accountId || !branchId || !referenceId) {
      showMessage('Please ensure Account ID, Branch ID, and Reference ID are filled before releasing', 'warning');
      return;
    }

    // Check if there's freeze data to release
    const fixedAmount = document.getElementById('fixedAmount')?.value;
    if (!fixedAmount || parseFloat(fixedAmount) <= 0) {
      showMessage('No freeze amount found to release', 'warning');
      return;
    }

    // Show the release modal
    openReleaseModal();
  }

  function openReleaseModal() {
    const modal = document.getElementById('releaseModal');
    const textarea = document.getElementById('releaseReason');

    // Clear previous input and show modal
    textarea.value = '';
    modal.style.display = 'block';

    // Focus on textarea
    setTimeout(() => {
      textarea.focus();
    }, 100);
  }

  function closeReleaseModal() {
    const modal = document.getElementById('releaseModal');
    modal.style.display = 'none';
  }

  function saveRelease() {
    const releaseReason = document.getElementById('releaseReason')?.value?.trim();

    if (!releaseReason) {
      showMessage('Please enter a reason for releasing the freeze', 'warning');
      document.getElementById('releaseReason').focus();
      return;
    }

    // Get current form data
    const accountId = document.getElementById('accountId')?.value;
    const branchId = document.getElementById('branchId')?.value;
    const referenceId = document.getElementById('referenceId')?.value;

    if (!accountId || !branchId || !referenceId) {
      showMessage('Account ID, Branch ID, and Reference ID are required', 'warning');
      return;
    }

    // Build request matching dbo.p_AddAccountFreezeRelease
    const request = {
      OurBranchID: branchId,
      AccountID: accountId,
      ReferenceID: referenceId,
      ReleasedDate: GlobalUtils.getCurrentDateTime(),
      ReleasedReason: releaseReason,
      ErrorNo: 0
    };

    console.log('Releasing freeze with request:', request);
    showMessage('Processing release...', 'info');

    // Close the modal first
    closeReleaseModal();

    // Call the API
    BlockingUnblockingService.releaseAccountFreeze(request)
      .then(response => {
        console.log('Release response:', response);
        handleReleaseResponse(response);
      })
      .catch(error => {
        console.error('Error releasing freeze:', error);
        showMessage('Failed to release freeze. Please try again.', 'error');
      });
  }

  function handleReleaseResponse(response) {
    if (response && response.success) {
      // 1. Show message "data released successfully"
      showMessage('data released successfully', 'success');

      // 2. Clear the form to remain with only branchID and Account ID
      clearAllFormFields();

      // 3. Reset to initial state to activate buttons
      currentState = null; // Reset to force setFormState to run
      setFormState('initial');

    } else {
      const errorMessage = response?.message || 'Failed to release freeze';
      showMessage(errorMessage, 'error');
    }
  }

  // Global functions for modal
  window.openReleaseModal = openReleaseModal;
  window.closeReleaseModal = closeReleaseModal;
  window.saveRelease = saveRelease;

  function handleSave() {
    console.log('handleSave called');

    // Enhanced validation check with specific messaging for mandatory fields
    if (!validateForm()) {
      const fixedAmount = document.getElementById('fixedAmount')?.value?.trim();
      const reason = document.getElementById('reason')?.value?.trim();

      if (!fixedAmount && !reason) {
        showMessage('Both Fixed Amount and Reason are mandatory fields and must be filled to proceed with save', 'error');
      } else if (!fixedAmount) {
        showMessage('Fixed Amount is mandatory and must be filled to proceed with save', 'error');
      } else if (!reason) {
        showMessage('Reason is mandatory and must be filled to proceed with save', 'error');
      } else {
        showMessage('Please fix the validation errors before saving', 'error');
      }
      return;
    }

    const formData = collectFormData();
    if (!formData) {
      showMessage('Unable to collect form data', 'error');
      return;
    }

    console.log('Saving freeze data with request:', formData);
    showLoadingOverlay(true);
    showMessage('Saving freeze data...', 'info');

    const BlockingUnblockingService = window.BlockingUnblockingService;
    if (!BlockingUnblockingService || !BlockingUnblockingService.addEditAccountFreeze) {
      showLoadingOverlay(false);
      showMessage('BlockingUnblockingService not available', 'error');
      return;
    }

    BlockingUnblockingService.addEditAccountFreeze(formData)
      .then(response => {
        showLoadingOverlay(false);
        console.log('Save response:', response);

        // Check for success in multiple possible response formats
        const isSuccess = response && (
          response.success === true ||
          response.Success === true ||
          (response.data && response.data.success === true) ||
          (response.Details && response.Details.length > 0) ||
          (response.data && response.data.Details && response.data.Details.length > 0)
        );

        if (isSuccess) {
          handleSaveResponse(response, formData);
        } else {
          const errorMessage = response?.message || response?.Message || response?.data?.message || 'Failed to save freeze data';
          showMessage(errorMessage, 'error');
        }
      })
      .catch(error => {
        showLoadingOverlay(false);
        console.error('Error saving freeze data:', error);
        showMessage('Error saving freeze data: ' + (error.message || 'Unknown error'), 'error');
      });
  }

  function handleCancel() {
    if (currentState === 'edit') {
      openAbortModal();
    } else if (currentState === 'view') {
      resetToInitialState();
      showMessage('View cleared', 'info');
    } else {
      resetToInitialState();
    }
  }

  // Abort Modal Functions
  function openAbortModal() {
    const modal = document.getElementById('abortModal');
    if (modal) {
      modal.style.display = 'block';
      // Focus the 'No' button by default for safety, or 'Yes' if preferred flow
      const noBtn = modal.querySelector('.release-btn-cancel');
      if (noBtn) setTimeout(() => noBtn.focus(), 100);
    }
  }

  function closeAbortModal() {
    const modal = document.getElementById('abortModal');
    if (modal) modal.style.display = 'none';
  }

  function confirmAbort() {
    closeAbortModal();
    // User clicked Yes: Clear form (except branch/account) and reset to initial state
    clearAllFormFields(); // This function preserves Branch/Account IDs
    clearAllErrors();
    setFormState('initial'); // Activates View, Add, History
    showMessage('Changes discarded', 'info');
  }

  // Global functions for modal
  window.openReleaseModal = openReleaseModal;
  window.closeReleaseModal = closeReleaseModal;
  window.saveRelease = saveRelease;
  window.openAbortModal = openAbortModal;
  window.closeAbortModal = closeAbortModal;
  window.confirmAbort = confirmAbort;

  // Lookup handling
  function handleLookup(lookupType) {
    // Lookups for IDs allowed in initial and view state too
    if (currentState !== 'edit' && currentState !== 'initial' && currentState !== 'view') return;

    // In initial/view state, only allow branch/account/reference lookups
    if ((currentState === 'initial' || currentState === 'view') && !['branchId', 'accountId', 'referenceId'].includes(lookupType)) {
      return;
    }

    console.log('Lookup requested for:', lookupType);

    if (!searchModal) {
      console.error('SearchModal not initialized');
      return;
    }

    if (lookupType === 'branchId') {
      searchModal.open({
        title: 'Find Branch',
        tableID: 'BranchID',
        searchFields: [
          { label: 'Branch ID', name: 'branchID', column: 'BranchID' },
          { label: 'Branch Name', name: 'branchName', column: 'BranchName' }
        ],
        displayFields: [
          { label: 'Branch ID', key: 'BranchID' },
          { label: 'Branch Name', key: 'BranchName' }
        ],
        onSelect: (record) => {
          document.getElementById('branchId').value = record.BranchID || '';
          document.getElementById('branchName').value = record.BranchName || record.Name || '';
        }
      });
    } else if (lookupType === 'accountId') {
      const branchId = document.getElementById('branchId')?.value;
      searchModal.open({
        title: 'Find Account',
        tableID: 'AccountID',
        whereStmt: branchId ? `OurBranchID = '${branchId}'` : '',
        searchFields: [
          { label: 'Account ID', name: 'accountID', column: 'AccountID' },
          { label: 'Account Name', name: 'accountName', column: 'AccountName' }
        ],
        displayFields: [
          { label: 'Account ID', key: 'AccountID' },
          { label: 'Account Name', key: 'AccountName' },
          { label: 'Client Name', key: 'ClientName' }
        ],
        onSelect: (record) => {
          document.getElementById('accountId').value = record.AccountID || '';
          document.getElementById('accountName').value = record.AccountDescription || record.AccountName || record.Name || '';
          // Optionally auto-suggest reference ID if account has only one
        }
      });
    } else if (lookupType === 'referenceId') {
      const branchId = document.getElementById('branchId')?.value;
      const accountId = document.getElementById('accountId')?.value;

      if (!branchId || !accountId) {
        showMessage('Please select Branch and Account before searching for Reference ID', 'warning');
        return;
      }

      searchModal.open({
        title: 'Account Freeze',
        tableID: 'AccountFreeze',
        whereStmt: `OurBranchID = '${branchId}' AND AccountID = '${accountId}'`,
        uniqueBy: 'ReferenceID',
        searchFields: [
          { label: 'Request Reference ID', name: 'referenceID', column: 'ReferenceID' }
        ],
        displayFields: [
          { label: 'Reference ID', key: 'ReferenceID' },
          { label: 'Freeze Date', key: 'EffectiveDate' },
          { label: 'Released Date', key: 'ReleasedDate' }
        ],
        onSelect: (record) => {
          const refField = document.getElementById('referenceId');
          if (refField) {
            refField.value = record.ReferenceID || '';
            updateViewButtonState();
            // Automatically load the data for this reference
            loadAccountFreezeData();
          }
        }
      });
    }
  }

  // Form validation
  function validateForm() {
    let isValid = true;
    const errors = [];

    // Clear previous errors
    clearAllErrors();

    // Validate required fields
    const branchId = document.getElementById('branchId')?.value?.trim();
    if (!branchId) {
      setFieldError('branchId', 'Branch ID is required');
      errors.push('Branch ID is required');
      isValid = false;
    }

    const accountId = document.getElementById('accountId')?.value?.trim();
    if (!accountId) {
      setFieldError('accountId', 'Account ID is required');
      errors.push('Account ID is required');
      isValid = false;
    }

    const effectiveDate = document.getElementById('effectiveDate')?.value;
    if (!effectiveDate || effectiveDate === '--Select--' || effectiveDate === '') {
      setFieldError('effectiveDate', 'Effective Date is required');
      errors.push('Effective Date is required');
      isValid = false;
    }

    // MANDATORY: Fixed Amount validation
    const fixedAmount = document.getElementById('fixedAmount')?.value?.trim();
    if (!fixedAmount) {
      setFieldError('fixedAmount', 'Fixed Amount is mandatory and cannot be empty');
      errors.push('Fixed Amount is mandatory and cannot be empty');
      isValid = false;
    } else {
      // Validate amount format and value
      const cleanAmount = fixedAmount.replace(/[,\\s]/g, '');
      const parsedAmount = parseFloat(cleanAmount);
      if (isNaN(parsedAmount)) {
        setFieldError('fixedAmount', 'Fixed Amount must be a valid number');
        errors.push('Fixed Amount must be a valid number');
        isValid = false;
      } else if (parsedAmount <= 0) {
        setFieldError('fixedAmount', 'Fixed Amount must be greater than 0');
        errors.push('Fixed Amount must be greater than 0');
        isValid = false;
      }
    }

    // MANDATORY: Reason validation
    const reason = document.getElementById('reason')?.value?.trim();
    if (!reason) {
      setFieldError('reason', 'Freeze reason is mandatory and cannot be empty');
      errors.push('Freeze reason is mandatory and cannot be empty');
      isValid = false;
    } else if (reason.length < 3) {
      setFieldError('reason', 'Freeze reason must be at least 3 characters long');
      errors.push('Freeze reason must be at least 3 characters long');
      isValid = false;
    }

    if (errors.length > 0) {
      // Show the first error with emphasis on mandatory fields  
      const mandatoryErrors = errors.filter(error => error.includes('mandatory'));
      const errorToShow = mandatoryErrors.length > 0 ? mandatoryErrors[0] : errors[0];
      showMessage(errorToShow, 'error');

      // Focus first field with error
      const firstErrorField = document.querySelector('.kairo-invalid, .field-error, input:invalid');
      if (firstErrorField) {
        firstErrorField.focus();
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    console.log('Form validation result:', isValid, errors);
    return isValid;
  }

  function validateField(e) {
    const field = e.target;
    clearFieldError(field);

    // Add specific field validations here
    if (field.hasAttribute('required') && !field.value.trim()) {
      setFieldError(field.id, 'This field is required');
    }
  }

  // Error handling
  function setFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
      field.classList.add('kairo-invalid');
      field.setAttribute('data-error', message);
    }
  }

  function clearFieldError(fieldOrEvent) {
    const field = fieldOrEvent.target || fieldOrEvent;
    if (field) {
      field.classList.remove('kairo-invalid');
      field.removeAttribute('data-error');
    }
  }

  function clearAllErrors() {
    document.querySelectorAll('.kairo-invalid').forEach(field => {
      clearFieldError(field);
    });
  }

  // Reference ID validation helpers
  function isReferenceIdFilled() {
    const referenceIdField = document.getElementById('referenceId');
    return referenceIdField && referenceIdField.value.trim() !== '';
  }

  function updateViewButtonState() {
    const viewBtn = document.querySelector('[data-action="view"]');
    if (viewBtn) {
      // If we are in edit mode, View should be disabled regardless of content
      if (currentState === 'edit') {
        viewBtn.disabled = true;
        viewBtn.classList.remove('btn-view');
        return;
      }

      // In initial state, View button should be enabled as one of the primary actions
      if (currentState === 'initial') {
        viewBtn.disabled = false;
        viewBtn.classList.add('btn-view');
        viewBtn.title = 'Enter account details and Reference ID to view';
        return;
      }

      const isValid = isReferenceIdFilled();
      viewBtn.disabled = !isValid;

      // Update visual state
      if (isValid) {
        viewBtn.classList.add('btn-view');
        viewBtn.title = 'View freeze data';
      } else {
        viewBtn.classList.remove('btn-view');
        viewBtn.title = 'Enter Reference ID to view freeze data';
      }

      console.log('View button state updated:', { state: currentState, disabled: viewBtn.disabled });
    }
  }

  // Data loading
  function loadFormData() {
    const branchId = document.getElementById('branchId')?.value;
    const accountId = document.getElementById('accountId')?.value;

    if (branchId && accountId) {
      // If we have IDs from parent, try to load data
      loadAccountFreezeData();
    } else {
      // Otherwise stay in initial state
      setFormState('initial');
    }
  }

  // Get current operator ID dynamically
  function getCurrentOperatorID() {
    try {
      // Try to get from parent Environment first
      const parentEnv = window.parent?.Environment;
      if (parentEnv) {
        if (parentEnv.operatorId || parentEnv.currentOperatorId || parentEnv.userId) {
          return parentEnv.operatorId || parentEnv.currentOperatorId || parentEnv.userId;
        }
      }

      // Try to get from parent AccountMaintenanceState
      const parentState = window.parent?.AccountMaintenanceState;
      if (parentState && parentState.OperatorID) {
        return parentState.OperatorID;
      }

      // Try to get from sessionStorage
      const storedOperatorId = sessionStorage.getItem('currentOperatorId') ||
        sessionStorage.getItem('operatorId') ||
        sessionStorage.getItem('userId');
      if (storedOperatorId) {
        return storedOperatorId;
      }

      // Try to get from global Environment
      if (window.Environment) {
        if (window.Environment.operatorId || window.Environment.currentOperatorId || window.Environment.userId) {
          return window.Environment.operatorId || window.Environment.currentOperatorId || window.Environment.userId;
        }
      }

      // Fallback to a default
      console.warn('Could not determine current operator ID, using default');
      return 'SYSTEM';
    } catch (error) {
      console.warn('Error getting operator ID:', error);
      return 'SYSTEM';
    }
  }

  // Load account freeze data via API
  function loadAccountFreezeData() {
    const branchId = document.getElementById('branchId')?.value;
    const accountId = document.getElementById('accountId')?.value;
    const referenceId = document.getElementById('referenceId')?.value || '';

    if (!branchId || !accountId) {
      showMessage('Branch ID and Account ID are required to load freeze data', 'error');
      return;
    }

    showLoadingOverlay(true);

    // Enhanced feedback based on search type
    if (referenceId && referenceId.trim() !== '') {
      showMessage(`Loading freeze data for Reference ID: ${referenceId} in Account: ${accountId}`, 'info');
    } else {
      showMessage('Loading freeze data for account: ' + accountId, 'info');
    }

    const operatorId = getCurrentOperatorID();

    const requestData = {
      OurBranchID: branchId,
      AccountID: accountId,
      ReferenceID: referenceId || '',
      OperatorID: operatorId,
      Direction: 0
    };

    console.log('Loading freeze data with request:', requestData);
    console.log('Using OperatorID:', operatorId);

    // Call the BlockingUnblockingService API
    if (window.BlockingUnblockingService && window.BlockingUnblockingService.getAccountFreeze) {
      window.BlockingUnblockingService.getAccountFreeze(requestData)
        .then(response => {
          handleFreezeDataResponse(response);
        })
        .catch(error => {
          console.error('Error loading freeze data:', error);
          showMessage('Error loading freeze data: ' + (error.message || 'Unknown error'), 'error');
          populateDefaultData();
        })
        .finally(() => {
          showLoadingOverlay(false);
        });
    } else {
      console.warn('BlockingUnblockingService not available, loading default data');
      showMessage('BlockingUnblockingService not available', 'error');
      showLoadingOverlay(false);
      populateDefaultData();
    }
  }

  // Handle API response
  function handleFreezeDataResponse(response) {
    console.log('Freeze data response:', response);

    try {
      // Check both direct response and normalized response structures
      let accountDetails = null;
      let auditDetails = {};
      let freezeRecord = null;
      let hasAccountData = false;
      let hasFreezeRecords = false;

      // Handle direct response structure
      if (response && response.Details01 && Array.isArray(response.Details01) && response.Details01.length > 0) {
        accountDetails = response.Details01[0];
        auditDetails = response.Details && response.Details.length > 0 ? response.Details[0] : {};
        freezeRecord = response.Details02 && response.Details02.length > 0 ? response.Details02[0] : null;
        hasAccountData = true;
        hasFreezeRecords = freezeRecord !== null;
        console.log('Using direct response structure');
      }
      // Handle normalized response structure  
      else if (response && response.data && response.data.Details01 && Array.isArray(response.data.Details01) && response.data.Details01.length > 0) {
        accountDetails = response.data.Details01[0];
        auditDetails = response.data.Details && response.data.Details.length > 0 ? response.data.Details[0] : {};
        freezeRecord = response.data.Details02 && response.data.Details02.length > 0 ? response.data.Details02[0] : null;
        hasAccountData = true;
        hasFreezeRecords = freezeRecord !== null;
        console.log('Using normalized response structure');
      }

      if (hasAccountData) {
        console.log('Account details found:', accountDetails);
        console.log('Freeze records found:', hasFreezeRecords);

        // Always populate account name from AccountDescription
        if (accountDetails.AccountDescription) {
          console.log('Setting account name to:', accountDetails.AccountDescription);
          const accountNameField = document.getElementById('accountName');
          if (accountNameField) {
            accountNameField.value = accountDetails.AccountDescription;
          }
        }

        // Always populate account balance information from Details01
        populateAccountBalanceFields(accountDetails);

        if (hasFreezeRecords) {
          // Account has freeze records - populate all freeze data
          console.log('Populating freeze data for account with existing freeze records');
          populateFormWithFreezeData(response);
          populateAuditFieldsFromFreezeRecord(freezeRecord);
          // NEW: Specifically populate freeze-specific fields from Details02
          populateAdditionalFreezeFields(freezeRecord);

          // Enhanced success message based on actual data and search type
          const userEnteredReferenceId = document.getElementById('referenceId')?.value?.trim();
          const actualDisplayedReferenceId = freezeRecord?.ReferenceID || accountDetails?.ReferenceID;
          const accountName = accountDetails.AccountDescription || 'account';

          // Check if we have multiple freeze records
          const freezeRecords = response.data?.Details02 || response.Details02 || [];
          const hasMultipleRecords = freezeRecords.length > 1;

          if (userEnteredReferenceId && actualDisplayedReferenceId && userEnteredReferenceId === String(actualDisplayedReferenceId)) {
            // User searched for specific Reference ID and we found exact match
            showMessage(`Freeze data loaded successfully for Reference ID: ${actualDisplayedReferenceId} in Account: ${accountName}`, 'success');
          } else if (hasMultipleRecords) {
            // Multiple freeze records found - show appropriate message
            showMessage(`Freeze data loaded successfully for Account: ${accountName}. ${freezeRecords.length} freeze records found, showing first record (Reference ID: ${actualDisplayedReferenceId || 'N/A'}).`, 'success');
          } else if (actualDisplayedReferenceId) {
            // Single freeze record found
            showMessage(`Freeze data loaded successfully for Account: ${accountName} (Reference ID: ${actualDisplayedReferenceId})`, 'success');
          } else {
            // Fallback message
            showMessage(`Freeze data loaded successfully for Account: ${accountName}`, 'success');
          }

          // Set form to view state when freeze records exist
          setFormState('view');
        } else {
          // Account exists but has no freeze records - show account info only
          console.log('Account found but no freeze records exist');
          clearFreezeSpecificFields();
          clearAuditFields(); // Clear audit fields instead of populating with 'Not Available'

          // Enhanced info message based on search type with guidance to add
          const referenceId = document.getElementById('referenceId')?.value?.trim();
          if (referenceId) {
            showMessage(`No freeze record found for Reference ID: ${referenceId}. Account balance loaded. Click 'Add' to create a new freeze record.`, 'info');
          } else {
            showMessage('No freeze records found for this account. Account balance loaded. Click \'Add\' to create a new freeze record.', 'info');
          }

          // Set form to initial state to enable Add button
          setFormState('initial');
        }

        // Update header with loaded data
        const branchId = document.getElementById('branchId').value;
        const accountId = document.getElementById('accountId').value;
        const accountName = accountDetails.AccountDescription;
        updateHeader(branchId, accountId, accountName);

      } else {
        // No account data found at all
        console.log('No account data found in response');
        showMessage('No account found for the specified Account ID', 'warning');
        populateDefaultData();
      }
    } catch (error) {
      console.error('Error handling freeze data response:', error);
      showMessage('Error processing freeze data response', 'error');
      populateDefaultData();
    }
  }

  // Populate form with freeze data from response
  function populateFormWithFreezeData(response) {
    // Extract Details01 data
    const data = response.data && response.data.Details01 ? response.data.Details01[0] : {};
    console.log('Populating form with freeze data:', data);
    console.log('All available fields in Details01:', Object.keys(data));

    try {
      // Use comprehensive Reference ID checking function
      const foundReferenceID = checkReferenceIDFromDetails(response);
      if (!foundReferenceID) {
        console.log('No Reference ID found in any response data (Details, Details01, Details02)');
      }

      // Fixed Amount from FreezedAmount
      if (data.FreezedAmount !== undefined) {
        const fixedAmountField = document.getElementById('fixedAmount');
        if (fixedAmountField) {
          const formattedValue = formatCurrency(data.FreezedAmount);
          fixedAmountField.value = formattedValue;
          console.log('Set Fixed Amount to:', data.FreezedAmount, 'formatted as:', formattedValue);
        }
      }

      // Behind the scene fields from Details01
      const fieldMappings = [
        { dataField: 'ProductID', formField: 'productId', label: 'Product' },
        { dataField: 'CurrencyID', formField: 'currencyId', label: 'Currency' },
        { dataField: 'ClearBalance', formField: 'clearBalance', label: 'Clear Balance', isCurrency: true },
        { dataField: 'UnclearBalance', formField: 'unclearBalance', label: 'Unclear Balance', isCurrency: true },
        { dataField: 'AvailableBalance', formField: 'availableBalance', label: 'Available Balance', isCurrency: true },
        { dataField: 'TotalBalance', formField: 'totalBalance', label: 'Total Balance', isCurrency: true },
        { dataField: 'DrawingPower', formField: 'drawingPower', label: 'Drawing Power', isCurrency: true },
        { dataField: 'MinimumBalance', formField: 'minimumBalance', label: 'Minimum Balance', isCurrency: true },
        { dataField: 'FreezedAmount', formField: 'freezedAmount', label: 'Freezed Amount', isCurrency: true },
        // Added support for Released Date/Reason from Details01
        { dataField: 'ReleasedDate', formField: 'releasedDate', label: 'Released Date', isDate: true },
        { dataField: 'ReleaseDate', formField: 'releasedDate', label: 'Released Date', isDate: true },
        { dataField: 'ReleasedReason', formField: 'releasedReason', label: 'Released Reason' },
        { dataField: 'ReleaseReason', formField: 'releasedReason', label: 'Released Reason' }
      ];

      fieldMappings.forEach(mapping => {
        if (data[mapping.dataField] !== undefined && data[mapping.dataField] !== null) {
          const field = document.getElementById(mapping.formField);
          if (field) {
            const rawValue = data[mapping.dataField];
            let value = rawValue;

            if (mapping.isCurrency) {
              value = formatCurrency(rawValue);
            } else if (mapping.isDate) {
              value = window.GlobalUtils ? window.GlobalUtils.formatDate(rawValue) : rawValue;
            }

            field.value = value;
            console.log(`Set ${mapping.label} (${mapping.formField}) to:`, rawValue, (mapping.isCurrency || mapping.isDate) ? `formatted as: ${value}` : '');

            // Double check the field was actually set
            setTimeout(() => {
              const actualValue = document.getElementById(mapping.formField).value;
              console.log(`Verification - ${mapping.label} field actual value:`, actualValue);
            }, 100);
          } else {
            console.warn(`Field ${mapping.formField} not found for ${mapping.label}`);
          }
        }
      });

      console.log('Form populated successfully with freeze data');

      // Expand "Behind the Scene" section to show populated fields
      expandBehindSceneSection();

    } catch (error) {
      console.error('Error populating form with freeze data:', error);
    }
  }

  // Check for Reference ID in Details array
  function checkReferenceIDFromDetails(response) {
    console.log('Checking for Reference ID in full response:', response);

    try {
      // Note: We used to early return here, but that skipped populateAdditionalFreezeFields.
      // Now handled by explicit calls and checking if field needs value.
      const refField = document.getElementById('referenceId');
      const currentRefId = refField?.value;

      let referenceValue = null;
      let foundLocation = null;

      // 1. Check NewData field when EventID = 4 (from stored procedure logic)
      const auditDetails = response.Details && response.Details.length > 0 ? response.Details[0]
        : (response.data && response.data.Details && response.data.Details.length > 0 ? response.data.Details[0] : {});

      if (auditDetails.EventID === 4 && auditDetails.NewData && auditDetails.NewData !== '' && auditDetails.NewData !== '0') {
        referenceValue = auditDetails.NewData;
        foundLocation = 'Details.NewData (EventID=4)';
        console.log('Found Reference ID in NewData field (EventID=4):', referenceValue);
      }

      // 2. Check Details02 array for freeze records
      if (!referenceValue) {
        const freezeDetails = response.Details02 || (response.data && response.data.Details02);
        if (freezeDetails && freezeDetails.length > 0) {
          const freezeRecord = freezeDetails[0];
          if (freezeRecord.ReferenceID && freezeRecord.ReferenceID !== '' && freezeRecord.ReferenceID !== 0) {
            referenceValue = freezeRecord.ReferenceID;
            foundLocation = 'Details02.ReferenceID';
            console.log('Found Reference ID in Details02:', referenceValue);

            // Populate the Reference ID but keep field editable
            const refField = document.getElementById('referenceId');
            if (refField) {
              refField.value = referenceValue;
              refField.readOnly = false; // Ensure field remains editable
              console.log(`Set Reference ID from ${foundLocation} to:`, referenceValue, '(field remains editable)');
            }

            // Populate additional fields from freeze record
            populateAdditionalFreezeFields(freezeRecord);
            return true;
          }
        } else {
          console.log('Details02 array is empty - no freeze records returned');
        }
      }

      // 3. Check Details01 as fallback
      if (!referenceValue) {
        const accountDetails = response.Details01 || (response.data && response.data.Details01 && response.data.Details01[0]);
        if (accountDetails) {
          const possibleRefFields = ['ReferenceID', 'RefID', 'Reference', 'RefNumber', 'TransactionID', 'TxnID'];
          possibleRefFields.forEach(fieldName => {
            if (!referenceValue && accountDetails[fieldName] !== undefined && accountDetails[fieldName] !== null && accountDetails[fieldName] !== '' && accountDetails[fieldName] !== 0) {
              referenceValue = accountDetails[fieldName];
              foundLocation = `Details01.${fieldName}`;
              console.log(`Found Reference ID in Details01 field '${fieldName}':`, referenceValue);
            }
          });
        }
      }

      // Populate Reference ID if found
      if (referenceValue) {
        const refField = document.getElementById('referenceId');
        if (refField) {
          refField.value = referenceValue;
          refField.readOnly = false; // Ensure field remains editable
          console.log(`Set Reference ID from ${foundLocation} to:`, referenceValue, '(field remains editable)');
          return true;
        }
      } else {
        console.log('No Reference ID found in any response arrays (Details, Details01, Details02) - field remains for user input');
        console.log('This is normal behavior if no freeze records exist in t_AccountFreeze table');

        // Ensure Reference ID field is editable for new entries
        const refField = document.getElementById('referenceId');
        if (refField) {
          refField.readOnly = false;
          refField.placeholder = 'Enter Reference ID';
          console.log('Reference ID field set to editable for new freeze entry');
        }
        return false;
      }

    } catch (error) {
      console.error('Error checking Reference ID from response:', error);
      return false;
    }
  }

  // Populate audit fields from Details array
  function populateAuditFields(auditDetails) {
    console.log('Populating audit fields with:', auditDetails);

    try {
      // Created By from OperatorID
      const makerField = document.getElementById('MakerID');
      if (makerField) {
        if (auditDetails.OperatorID && auditDetails.OperatorID.trim() !== '') {
          makerField.textContent = auditDetails.OperatorID;
          console.log('Set Created By to:', auditDetails.OperatorID);
        } else {
          // Fallback to current operator or leave blank
          const currentOperatorID = getCurrentOperatorID();
          if (currentOperatorID && currentOperatorID !== 'web_portal') {
            makerField.textContent = currentOperatorID;
            console.log('Set Created By to current operator:', currentOperatorID);
          } else {
            makerField.textContent = '';
            console.log('Created By not available in API response, left blank');
          }
        }
      }

      // Created On from CreatedOn
      const makerDTField = document.getElementById('MakerDT');
      if (makerDTField) {
        if (auditDetails.CreatedOn && auditDetails.CreatedOn.trim() !== '') {
          const formattedDate = window.GlobalUtils ? window.GlobalUtils.formatDateTime(auditDetails.CreatedOn) : auditDetails.CreatedOn;
          makerDTField.textContent = formattedDate;
          console.log('Set Created On to:', auditDetails.CreatedOn, 'formatted as:', formattedDate);
        } else {
          makerDTField.textContent = '';
          console.log('Created On not available in API response, left blank');
        }
      }

      console.log('Audit fields populated successfully');
    } catch (error) {
      console.error('Error populating audit fields:', error);
    }
  }

  // Populate audit fields from freeze record data (Details02)
  function populateAuditFieldsFromFreezeRecord(freezeRecord) {
    console.log('Populating audit fields from freeze record:', freezeRecord);

    try {
      // Created By from CreatedBy field
      const makerField = document.getElementById('MakerID');
      if (makerField) {
        if (freezeRecord.CreatedBy && freezeRecord.CreatedBy.trim() !== '') {
          makerField.textContent = freezeRecord.CreatedBy;
          console.log('Set Created By to:', freezeRecord.CreatedBy);
        } else {
          makerField.textContent = 'Not Available';
          console.log('Created By not available in freeze record');
        }
      }

      // Created On from CreatedOn field
      const makerDTField = document.getElementById('MakerDT');
      if (makerDTField) {
        if (freezeRecord.CreatedOn && freezeRecord.CreatedOn.trim() !== '') {
          const formattedDate = window.GlobalUtils ? window.GlobalUtils.formatDateTime(freezeRecord.CreatedOn) : freezeRecord.CreatedOn;
          makerDTField.textContent = formattedDate;
          console.log('Set Created On to:', freezeRecord.CreatedOn, 'formatted as:', formattedDate);
        } else {
          makerDTField.textContent = 'Not Available';
          console.log('Created On not available in freeze record');
        }
      }

      console.log('Audit fields populated successfully from freeze record');
    } catch (error) {
      console.error('Error populating audit fields from freeze record:', error);
    }
  }

  // Populate additional fields from freeze record (Details02)
  function populateAdditionalFreezeFields(freezeRecord) {
    console.log('Populating additional freeze fields:', freezeRecord);

    try {
      // Use a small delay to ensure state transitions are complete
      setTimeout(() => {
        // Freeze Reason  
        const reasonField = document.getElementById('reason');
        if (reasonField && freezeRecord.FreezedReason) {
          reasonField.value = freezeRecord.FreezedReason;
          reasonField.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('Set Freeze Reason to:', freezeRecord.FreezedReason);
        }

        // Effective Date
        const dateField = document.getElementById('effectiveDate');
        if (dateField && freezeRecord.EffectiveDate) {
          let valueToSet = freezeRecord.EffectiveDate;

          if (dateField.type === 'date') {
            // ISO format YYYY-MM-DD required for date inputs
            valueToSet = freezeRecord.EffectiveDate.includes('T')
              ? freezeRecord.EffectiveDate.split('T')[0]
              : freezeRecord.EffectiveDate;
          } else if (window.GlobalUtils && typeof window.GlobalUtils.formatDate === 'function') {
            valueToSet = window.GlobalUtils.formatDate(freezeRecord.EffectiveDate);
          } else if (freezeRecord.EffectiveDate.includes('T')) {
            valueToSet = freezeRecord.EffectiveDate.split('T')[0];
          }

          dateField.value = valueToSet;
          dateField.dispatchEvent(new Event('input', { bubbles: true }));
          dateField.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('Populated Effective Date from record (formatted):', valueToSet);
        }

        // Fixed Amount
        const fixedAmountField = document.getElementById('fixedAmount');
        if (fixedAmountField && (freezeRecord.FreezedValue !== undefined && freezeRecord.FreezedValue !== null)) {
          const formattedAmount = formatCurrency(freezeRecord.FreezedValue);
          fixedAmountField.value = formattedAmount;
          fixedAmountField.dispatchEvent(new Event('input', { bubbles: true }));
          fixedAmountField.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('Set Fixed Amount to:', formattedAmount);
        }

        // Released Reason
        const releasedReasonField = document.getElementById('releasedReason');
        const releasedReasonVal = freezeRecord.ReleasedReason || freezeRecord.ReleaseReason;
        if (releasedReasonField && releasedReasonVal) {
          releasedReasonField.value = releasedReasonVal;
          releasedReasonField.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('Set Released Reason to:', releasedReasonVal);
        }

        // Released Date
        const releasedDateField = document.getElementById('releasedDate');
        const releasedDateVal = freezeRecord.ReleasedDate || freezeRecord.ReleaseDate;

        if (releasedDateField) {
          if (releasedDateVal) {
            let formattedDate = releasedDateVal;

            // specific handling for ISO timestamp with T
            if (typeof releasedDateVal === 'string' && releasedDateVal.includes('T')) {
              try {
                const d = new Date(releasedDateVal);
                if (!isNaN(d.getTime())) {
                  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  formattedDate = `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
                }
              } catch (e) {
                console.warn('Manual date parsing failed for ReleasedDate:', e);
              }
            } else if (window.GlobalUtils && typeof window.GlobalUtils.formatDate === 'function') {
              // Try GlobalUtils if not obviously ISO timestampor if we want standard formatting
              const guFormatted = window.GlobalUtils.formatDate(releasedDateVal);
              if (guFormatted) formattedDate = guFormatted;
            }

            releasedDateField.value = formattedDate;
            // Dispatch input event to ensure UI updates if bound
            releasedDateField.dispatchEvent(new Event('input', { bubbles: true }));
            console.log(`Set Released Date field (value: ${formattedDate}) from record:`, releasedDateVal);
          } else {
            // Explicitly clear if no release date in this record
            releasedDateField.value = '';
            console.log('Cleared Released Date field (no date in record)');
          }
        } else {
          console.error('Released Date field element not found in DOM');
        }

        console.log('Additional freeze fields populated and events dispatched');
      }, 150);
    } catch (error) {
      console.error('Error populating additional freeze fields:', error);
    }
  }

  // Populate form with API data (fallback function)
  function populateFormWithData(data) {
    // Main form fields
    if (data.BranchID) document.getElementById('branchId').value = data.BranchID;
    if (data.BranchName) document.getElementById('branchName').value = data.BranchName;
    if (data.AccountID) document.getElementById('accountId').value = data.AccountID;
    if (data.AccountName) document.getElementById('accountName').value = data.AccountName;
    if (data.ReferenceID) document.getElementById('referenceId').value = data.ReferenceID;
    if (data.EffectiveDate) {
      const formattedDate = window.GlobalUtils ? window.GlobalUtils.formatDate(data.EffectiveDate) : data.EffectiveDate;
      const effectiveDateEl = document.getElementById('effectiveDate');
      if (effectiveDateEl) {
        effectiveDateEl.value = formattedDate;
        if (effectiveDateEl._flatpickr) {
          effectiveDateEl._flatpickr.setDate(data.EffectiveDate);
        }
      }
    }
    const fixedAmount = data.FixedAmount || data.FreezedValue || data.FreezeAmount || data.FreezedAmount;
    if (fixedAmount) document.getElementById('fixedAmount').value = fixedAmount;

    const reason = data.Reason || data.FreezedReason || data.FreezeReason;
    if (reason) document.getElementById('reason').value = reason;

    // Behind the scene fields
    const releasedReason = data.ReleasedReason || data.ReleaseReason;
    if (releasedReason) document.getElementById('releasedReason').value = releasedReason;

    if (data.ReleasedDate || data.ReleaseDate) {
      const releasedDate = data.ReleasedDate || data.ReleaseDate;
      document.getElementById('releasedDate').value = window.GlobalUtils ? window.GlobalUtils.formatDate(releasedDate) : releasedDate;
    }
    if (data.ProductID) document.getElementById('productId').value = data.ProductID;
    if (data.CurrencyID) document.getElementById('currencyId').value = data.CurrencyID;
    if (data.ClearBalance) document.getElementById('clearBalance').value = formatCurrency(data.ClearBalance);
    if (data.UnclearBalance) document.getElementById('unclearBalance').value = formatCurrency(data.UnclearBalance);
    if (data.AvailableBalance) document.getElementById('availableBalance').value = formatCurrency(data.AvailableBalance);
    if (data.TotalBalance) document.getElementById('totalBalance').value = formatCurrency(data.TotalBalance);
    if (data.DrawingPower) document.getElementById('drawingPower').value = formatCurrency(data.DrawingPower);
    if (data.MinimumBalance) document.getElementById('minimumBalance').value = formatCurrency(data.MinimumBalance);
    if (data.FreezedAmount) document.getElementById('freezedAmount').value = formatCurrency(data.FreezedAmount);
    if (data.LoanBranchID) document.getElementById('loanBranchId').value = data.LoanBranchID;
    if (data.LoanAccountID) document.getElementById('loanAccountId').value = data.LoanAccountID;

    // Audit fields
    if (data.CreatedBy || data.MakerID) document.getElementById('MakerID').textContent = data.CreatedBy || data.MakerID;
    if (data.CreatedOn || data.MakerDT) document.getElementById('MakerDT').textContent = window.GlobalUtils ? window.GlobalUtils.formatDateTime(data.CreatedOn || data.MakerDT) : (data.CreatedOn || data.MakerDT);
    if (data.ModifiedBy || data.ModifierID) document.getElementById('ModifierID').textContent = data.ModifiedBy || data.ModifierID || '-';
    if (data.ModifiedOn || data.ModifierDT) document.getElementById('ModifierDT').textContent = window.GlobalUtils ? window.GlobalUtils.formatDateTime(data.ModifiedOn || data.ModifierDT) : (data.ModifiedOn || data.ModifierDT) || '-';
    if (data.SupervisedBy || data.CheckerID) document.getElementById('CheckerID').textContent = data.SupervisedBy || data.CheckerID || '-';
    if (data.SupervisedOn || data.CheckerDT) document.getElementById('CheckerDT').textContent = window.GlobalUtils ? window.GlobalUtils.formatDateTime(data.SupervisedOn || data.CheckerDT) : (data.SupervisedOn || data.CheckerDT) || '-';
  }

  // Populate with default/sample data when API isn't available
  // Populate just the account balance fields from Details01
  function populateAccountBalanceFields(accountDetails) {
    console.log('Populating account balance fields from:', accountDetails);

    try {
      // Map balance fields from accountDetails
      const fieldMappings = {
        clearBalance: 'ClearBalance',
        unclearBalance: 'UnclearBalance',
        drawingPower: 'DrawingPower',
        availableBalance: 'AvailableBalance',
        totalBalance: 'TotalBalance',
        minimumBalance: 'MinimumBalance',
        currencyId: 'CurrencyID'
      };

      // Populate balance fields from accountDetails
      for (const [fieldId, propertyName] of Object.entries(fieldMappings)) {
        const fieldElement = document.getElementById(fieldId);
        if (fieldElement && accountDetails[propertyName] !== undefined) {
          let value = accountDetails[propertyName];

          // Format currency fields
          if (['clearBalance', 'unclearBalance', 'drawingPower', 'availableBalance', 'totalBalance', 'minimumBalance'].includes(fieldId)) {
            value = formatCurrency(value);
          }

          fieldElement.value = value;
          console.log(`Populated ${fieldId} with value:`, value);
        }
      }
    } catch (error) {
      console.error('Error populating account balance fields:', error);
    }
  }



  function populateDefaultData() {
    // Sample audit data
    const auditData = {
      MakerID: 'ADMIN',
      MakerDT: new Date().toISOString().split('T')[0],
      ModifierID: '-',
      ModifierDT: '-',
      CheckerID: '-',
      CheckerDT: '-'
    };

    Object.keys(auditData).forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.textContent = auditData[fieldId];
      }
    });
  }

  // Utility functions
  function formatCurrency(value) {
    if (value === '' || value === null || value === undefined) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(dateStr) {
    if (!dateStr || dateStr === '' || dateStr === null || dateStr === undefined) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US');
    } catch (e) {
      return dateStr;
    }
  }

  // Utility functions
  function hasChanges() {
    const currentData = captureFormData();
    return JSON.stringify(currentData) !== JSON.stringify(originalData);
  }

  function showLoadingOverlay(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      if (show) {
        overlay.removeAttribute('hidden');
      } else {
        overlay.setAttribute('hidden', 'hidden');
      }
    }
  }

  function showMessage(message, type = 'info') {
    console.log('showMessage called:', message, type);

    // Convert type to match account maintenance patterns
    const toastType = type === 'danger' ? 'error' : type;

    // Show local toast in this form (prioritized for better visibility)
    const container = document.getElementById('toastContainer') || ensureLocalToastContainer();
    if (container) {
      // Clear any existing toasts so only one message shows at a time
      container.innerHTML = '';

      // Create toast element
      const toast = document.createElement('div');
      toast.className = `freeze-toast freeze-toast--${toastType}`;

      // Icon based on type
      const iconMap = {
        success: 'bi-check-circle-fill',
        error: 'bi-exclamation-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
      };
      const iconClass = iconMap[toastType] || iconMap.info;

      toast.innerHTML = `
        <i class="bi ${iconClass} freeze-toast__icon"></i>
        <span class="freeze-toast__message">${message}</span>
        <button type="button" class="freeze-toast__close" aria-label="Close">
          <i class="bi bi-x"></i>
        </button>
      `;

      // Close button handler
      const closeBtn = toast.querySelector('.freeze-toast__close');
      closeBtn.addEventListener('click', () => {
        toast.remove();
      });

      // Add to container
      container.appendChild(toast);

      // Auto-remove after timeout
      const timeoutMs = toastType === 'error' ? 8000 : 5000;
      setTimeout(() => {
        if (toast.parentNode) {
          toast.style.animation = 'toastSlideIn 0.3s ease-out reverse';
          setTimeout(() => toast.remove(), 300);
        }
      }, timeoutMs);

      console.log(`[Freeze/Release] Toast displayed (${toastType}): ${message}`);
      return;
    }

    // Try to use parent showSystemToast as secondary option
    if (window.parent && typeof window.parent.showSystemToast === 'function') {
      try {
        const variant = toastType === 'error' ? 'danger' : toastType;
        window.parent.showSystemToast(message, {
          title: 'Freeze/Release',
          variant: variant,
          timeoutMs: variant === 'danger' ? 8000 : 5000
        });
        return;
      } catch (e) {
        console.warn('Parent showSystemToast failed:', e);
      }
    }

    // Final fallback: console log
    console.log(`[Freeze/Release] Message (${type}): ${message}`);
  }

  // Ensure local toast container exists
  function ensureLocalToastContainer() {
    let container = document.getElementById('toastContainer');
    if (container) return container;

    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'freeze-toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(container);
    return container;
  }

  // Keyboard navigation
  function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Enter key on focused action button
      if (e.key === 'Enter' && e.target.classList.contains('btn-action')) {
        e.target.click();
        return;
      }

      // Escape key to cancel edit mode
      if (e.key === 'Escape' && currentState === 'edit') {
        handleCancel();
        return;
      }

      // Ctrl+S to save (in edit mode)  
      if (e.ctrlKey && e.key === 's' && currentState === 'edit') {
        e.preventDefault();
        handleSave();
        return;
      }

      // F5 to refresh
      if (e.key === 'F5') {
        e.preventDefault();
        handleRefresh();
        return;
      }
    });
  }

  // Parent communication
  function notifyParentOpened() {
    try {
      window.parent.postMessage({
        type: 'submoduleOpened',
        source: 'Freeze/Release'
      }, '*');
    } catch (e) {
      console.warn('Could not communicate with parent window');
    }
  }

  // Populate form fields from parent account maintenance data
  function populateFromParentData() {
    try {
      // First try to get data from parent's AccountMaintenanceState
      const parentState = window.parent?.AccountMaintenanceState;
      if (parentState && parentState.isAccountLoaded) {
        console.log('Loading freeze/release with parent account data:', parentState);

        // Populate branch information
        if (parentState.OurBranchID) {
          document.getElementById('branchId').value = parentState.OurBranchID;
        }
        if (parentState.BranchName) {
          document.getElementById('branchName').value = parentState.BranchName;
        }

        // Populate account information
        if (parentState.AccountID) {
          document.getElementById('accountId').value = parentState.AccountID;
        }
        if (parentState.AccountName) {
          document.getElementById('accountName').value = parentState.AccountName;
        }

        // Update header with account details
        updateHeader(parentState.OurBranchID, parentState.AccountID, parentState.AccountName);

        showMessage('Loaded account: ' + parentState.AccountName, 'success');
        return true;
      }

      // Fallback: Try to get from sessionStorage
      const storedAccountID = sessionStorage.getItem('currentAccountID');
      const storedBranchID = sessionStorage.getItem('currentBranchID');

      if (storedAccountID) {
        document.getElementById('accountId').value = storedAccountID;
        if (storedBranchID) {
          document.getElementById('branchId').value = storedBranchID;
        }

        // Update header with available data
        updateHeader(storedBranchID, storedAccountID, '');

        console.log('Loaded account from sessionStorage:', storedAccountID);
        showMessage('Loaded account: ' + storedAccountID, 'info');
        return true;
      }

      // Fallback: Try to get from parent Environment
      const parentEnv = window.parent?.Environment;
      if (parentEnv) {
        if (parentEnv.defaultOurBranchId || parentEnv.branchId) {
          document.getElementById('branchId').value = parentEnv.defaultOurBranchId || parentEnv.branchId;
        }
        if (parentEnv.defaultBranchName || parentEnv.branchName) {
          document.getElementById('branchName').value = parentEnv.defaultBranchName || parentEnv.branchName;
        }
      }

      return false;
    } catch (error) {
      console.warn('Error populating from parent data:', error);
      showMessage('Could not load account information', 'error');
      return false;
    }
  }

  // Update header with account details
  function updateHeader(branchId, accountId, accountName) {
    const headerTitle = document.getElementById('headerTitle');
    if (headerTitle && branchId && accountId) {
      headerTitle.textContent = `${branchId} : ${accountId} : ${accountName || 'FREEZE/RELEASE'}`;
    } else if (headerTitle) {
      headerTitle.textContent = 'Freeze/Release';
    }
  }

  // Transaction History Modal Functions
  function openHistoryModal(branchId, accountId) {
    const modal = document.getElementById('historyModal');
    const loadingDiv = document.getElementById('historyLoading');
    const emptyDiv = document.getElementById('historyEmpty');
    const tableContainer = document.querySelector('.history-table-container');

    if (!modal) {
      console.error('[Freeze/Release] historyModal element not found in DOM');
      showMessage('History modal not available', 'error');
      return;
    }

    // Show modal and loading state
    modal.style.display = 'block';
    if (loadingDiv) loadingDiv.style.display = 'block';
    if (emptyDiv) emptyDiv.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'none';

    // Fetch history data
    loadAccountHistory(branchId, accountId);
  }

  function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (modal) modal.style.display = 'none';
  }

  function loadAccountHistory(branchId, accountId) {
    // Set date range for history (last 6 months by default)
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 6);

    const request = {
      OurBranchID: branchId,
      AccountID: accountId,
      FromDate: fromDate.toISOString(),
      ToDate: toDate.toISOString()
    };

    console.log('Loading account freeze history with request:', request);

    BlockingUnblockingService.getAccountFreezeHistory(request)
      .then(response => {
        console.log('History response:', response);
        handleHistoryResponse(response);
      })
      .catch(error => {
        console.error('Error loading history:', error);
        showHistoryError('Failed to load transaction history');
      });
  }

  function handleHistoryResponse(response) {
    const loadingDiv = document.getElementById('historyLoading');
    const emptyDiv = document.getElementById('historyEmpty');
    const tableContainer = document.querySelector('.history-table-container');

    loadingDiv.style.display = 'none';

    if (!response || !response.success) {
      showHistoryError('Failed to load transaction history');
      return;
    }

    // Look for history data in Details array
    const historyRecords = response.Details || [];

    if (historyRecords.length === 0) {
      emptyDiv.style.display = 'block';
      tableContainer.style.display = 'none';
      return;
    }

    // Populate the history table
    populateHistoryTable(historyRecords);
    tableContainer.style.display = 'block';
    emptyDiv.style.display = 'none';
  }

  function populateHistoryTable(records) {
    const tableBody = document.getElementById('historyTableBody');
    tableBody.innerHTML = '';

    records.forEach((record, index) => {
      const row = document.createElement('tr');

      // Format dates using GlobalUtils for consistent DD-MMM-YYYY format
      const effectiveDate = GlobalUtils.formatDate(record.EffectiveDate || record.FreezedDate);
      const releasedDate = record.ReleasedDate ? GlobalUtils.formatDate(record.ReleasedDate) : '—';

      // Format currency values
      const freezedValue = formatCurrency(record.FreezedValue || record.FixedAmount || 0);
      const releasedValue = (record.ReleasedValue && record.ReleasedValue > 0) ? formatCurrency(record.ReleasedValue) : '—';

      // Handle empty values with proper indicators
      const clientId = record.ClientID || '—';
      const clientName = record.ClientName || record.AccountDescription || '—';
      const accountName = record.AccountName || record.AccountDescription || '—';
      const referenceId = record.ReferenceID || '—';
      const freezedReason = record.Reason || record.FreezedReason || '—';
      const releasedReason = record.ReleasedReason || '—';

      // Add visual indicator for released vs active freezes
      const isReleased = record.ReleasedDate || (record.ReleasedValue && record.ReleasedValue > 0);
      const rowClass = isReleased ? '' : 'active-freeze-row';

      if (rowClass) {
        row.className = rowClass;
      }

      row.innerHTML = `
        <td style="text-align: center;">${index + 1}</td>
        <td>${clientId}</td>
        <td>${clientName}</td>
        <td>${accountName}</td>
        <td>${referenceId}</td>
        <td>${effectiveDate || '—'}</td>
        <td>${freezedValue}</td>
        <td>${freezedReason}</td>
        <td>${releasedDate}</td>
        <td>${releasedValue}</td>
        <td>${releasedReason}</td>
      `;

      tableBody.appendChild(row);
    });

    console.log(`Populated history table with ${records.length} records`);
  }

  // History modal action functions
  function exportHistoryData() {
    console.log('Export history data functionality');
    showMessage('Export functionality coming soon', 'info');
  }

  function refreshHistoryData() {
    const accountId = document.getElementById('accountId')?.value;
    const branchId = document.getElementById('branchId')?.value;

    if (accountId && branchId) {
      showMessage('Refreshing history data...', 'info');
      loadAccountHistory(branchId, accountId);
    }
  }

  // Make functions globally available
  window.exportHistoryData = exportHistoryData;
  window.refreshHistoryData = refreshHistoryData;

  function showHistoryError(message) {
    const loadingDiv = document.getElementById('historyLoading');
    const emptyDiv = document.getElementById('historyEmpty');
    const tableContainer = document.querySelector('.history-table-container');

    loadingDiv.style.display = 'none';
    tableContainer.style.display = 'none';

    emptyDiv.style.display = 'block';
    emptyDiv.innerHTML = `<p style="color: #dc3545;">${message}</p>`;
  }

  // Global functions for modal (called from HTML onclick)
  window.closeHistoryModal = closeHistoryModal;
  window.closeReleaseModal = closeReleaseModal;
  window.confirmRelease = saveRelease;

  // Close modals when clicking outside
  window.addEventListener('click', function (event) {
    const historyModal = document.getElementById('historyModal');
    const releaseModal = document.getElementById('releaseModal');

    if (event.target === historyModal) {
      closeHistoryModal();
    }

    if (event.target === releaseModal) {
      closeReleaseModal();
    }
  });

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
