/**
 * Account Signatories - Enterprise UI Controller
 * Loads signatories grid on page load following Account Maintenance patterns
 * VERSION: 2.9 - Enable SAVE button after REMOVE operation
 */
(() => {
  'use strict';
  
  console.log('🔄 [AccountSignatories] Loading version 2.9 (SAVE button enabled after REMOVE)');
  console.log('✅ FIX: SAVE button now enabled after REMOVE - user can save deletion');
  console.log('✅ FIX: Removed Actions column from grid - use form buttons instead');
  console.log('✅ FIX: REMOVE button no longer auto-saves - user must click SAVE');
  console.log('✅ FIX: When no records exist, only ADD button is enabled');
  console.log('✅ FIX: New signatories include OpenedDate field required by stored procedure');

  // ============================================================================
  // DOM REFERENCES
  // ============================================================================
  const windowEl = document.querySelector('.window');
  const form = document.querySelector('[data-main-form]') || document.querySelector('.form-card');
  const tableBody = document.getElementById('signatoryTableBody');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const statusText = document.querySelector('.status-text, .asg-status-text') || document.querySelector('.de-status-bar');
  const messageBar = document.querySelector('.message-bar, .asg-message-bar') || document.querySelector('.de-message-bar');
  const messageText = document.querySelector('.message-text, .asg-message') || messageBar?.querySelector('span');

  // ============================================================================
  // STATE
  // ============================================================================
  const state = {
    mode: 'VIEW', // VIEW, ADD, EDIT
    signatories: [],
    selectedRow: null,
    pendingDeleteIndex: null, // Index of signatory pending delete confirmation
    pendingChanges: [], // Track new/modified/deleted items: { action: 'add'|'edit'|'delete', data: {...}, index: number }
    isLoading: false,
    context: {
      OurBranchID: '',   // Inherited from parent AccountMaintenanceState
      AccountID: '',     // Inherited from parent AccountMaintenanceState
      OperatorID: '',    // Inherited from parent AccountMaintenanceState
      ClientID: ''       // Inherited from parent AccountMaintenanceState
    },
    searchModal: null  // SearchModal instance for signatory lookup
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  const postClose = () => {
    window.parent?.postMessage({ type: 'accountMaintenanceChildClose' }, '*');
  };

  const showLoader = (show) => {
    state.isLoading = show;
    if (loadingOverlay) {
      loadingOverlay.hidden = !show;
    }
    updateStatus(show ? 'Loading...' : 'Ready');
  };

  const updateStatus = (text) => {
    if (statusText) {
      statusText.textContent = text;
    }
  };

  const showMessage = (msg, type = 'info') => {
    // Route all messages to the validation summary area at top of form
    if (type === 'error' || type === 'warning') {
      showErrorMessage(msg);
    } else if (type === 'success') {
      showSuccessMessage(msg);
    } else {
      // For info messages, use the info variant of validation summary
      showInfoMessage(msg);
    }
  };

  /**
   * Show toast notification
   * @param {string} message - The message to display
   * @param {string} type - 'success', 'error', 'warning', 'info'
   * @param {number} duration - Duration in ms (default 3000)
   */
  const showToast = (message, type = 'info', duration = 3000) => {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
      `;
      document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Set icon based on type
    const icons = {
      success: 'bi-check-circle-fill',
      error: 'bi-exclamation-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      info: 'bi-info-circle-fill'
    };
    
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8'
    };
    
    toast.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: white;
      border-left: 4px solid ${colors[type]};
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 300px;
      animation: slideInRight 0.3s ease-out;
      font-size: 14px;
      color: #333;
    `;
    
    toast.innerHTML = `
      <i class="bi ${icons[type]}" style="color: ${colors[type]}; font-size: 20px;"></i>
      <span style="flex: 1;">${message}</span>
      <button style="
        background: none;
        border: none;
        color: #999;
        cursor: pointer;
        padding: 0;
        font-size: 18px;
        line-height: 1;
      " onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Add animation styles if not already present
    if (!document.getElementById('toast-animations')) {
      const style = document.createElement('style');
      style.id = 'toast-animations';
      style.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    toastContainer.appendChild(toast);
    
    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
  };

  /**
   * Show validation/error message in summary area at top of form
   */
  const showErrorMessage = (message) => {
    const formSection = document.querySelector('.form-section .section-content');
    if (!formSection) return;
    
    let summary = formSection.querySelector('.validation-summary');
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
      closeBtn.setAttribute('aria-label', 'Close notification');
      closeBtn.innerHTML = '<i class="bi bi-x"></i>';
      closeBtn.addEventListener('click', () => hideValidationSummary());
      
      summary.appendChild(icon);
      summary.appendChild(text);
      summary.appendChild(closeBtn);
      
      formSection.insertBefore(summary, formSection.firstChild);
    }
    
    // Update for error styling
    summary.classList.remove('validation-summary--success');
    const iconEl = summary.querySelector('.validation-summary__icon');
    if (iconEl) iconEl.className = 'bi bi-exclamation-circle validation-summary__icon';
    
    const textEl = summary.querySelector('.validation-summary__text');
    if (textEl) textEl.textContent = message;
    summary.classList.add('is-visible');
  };

  /**
   * Show success message in summary area at top of form
   */
  const showSuccessMessage = (message) => {
    const formSection = document.querySelector('.form-section .section-content');
    if (!formSection) return;
    
    let summary = formSection.querySelector('.validation-summary');
    if (!summary) {
      summary = document.createElement('div');
      summary.className = 'validation-summary';
      summary.setAttribute('role', 'status');
      summary.setAttribute('aria-live', 'polite');
      
      const icon = document.createElement('i');
      icon.className = 'bi bi-check-circle validation-summary__icon';
      
      const text = document.createElement('span');
      text.className = 'validation-summary__text';
      
      const closeBtn = document.createElement('button');
      closeBtn.className = 'validation-summary__close';
      closeBtn.setAttribute('type', 'button');
      closeBtn.setAttribute('aria-label', 'Close notification');
      closeBtn.innerHTML = '<i class="bi bi-x"></i>';
      closeBtn.addEventListener('click', () => hideValidationSummary());
      
      summary.appendChild(icon);
      summary.appendChild(text);
      summary.appendChild(closeBtn);
      
      formSection.insertBefore(summary, formSection.firstChild);
    }
    
    // Update for success styling
    summary.classList.add('validation-summary--success');
    const iconEl = summary.querySelector('.validation-summary__icon');
    if (iconEl) iconEl.className = 'bi bi-check-circle validation-summary__icon';
    
    const textEl = summary.querySelector('.validation-summary__text');
    if (textEl) textEl.textContent = message;
    summary.classList.add('is-visible');
  };

  /**
   * Hide validation summary
   */
  const hideValidationSummary = () => {
    const summaries = document.querySelectorAll('.asg-validation-summary');
    summaries.forEach(s => {
      s.classList.remove('is-visible');
      s.classList.remove('asg-validation-summary--success');
      s.classList.remove('asg-validation-summary--info');
    });
  };

  /**
   * Show info message in summary area at top of form
   */
  const showInfoMessage = (message) => {
    const formBody = document.querySelector('.asg-card__body');
    if (!formBody) return;
    
    let summary = formBody.querySelector('.asg-validation-summary');
    if (!summary) {
      summary = document.createElement('div');
      summary.className = 'asg-validation-summary asg-validation-summary--info';
      summary.setAttribute('role', 'status');
      summary.setAttribute('aria-live', 'polite');
      
      const icon = document.createElement('i');
      icon.className = 'bi bi-info-circle asg-validation-summary__icon';
      
      const text = document.createElement('span');
      text.className = 'asg-validation-summary__text';
      
      const closeBtn = document.createElement('button');
      closeBtn.className = 'asg-validation-summary__close';
      closeBtn.setAttribute('type', 'button');
      closeBtn.setAttribute('aria-label', 'Close notification');
      closeBtn.innerHTML = '<i class="bi bi-x"></i>';
      closeBtn.addEventListener('click', () => hideValidationSummary());
      
      summary.appendChild(icon);
      summary.appendChild(text);
      summary.appendChild(closeBtn);
      
      formBody.insertBefore(summary, formBody.firstChild);
    }
    
    // Update for info styling
    summary.className = 'asg-validation-summary asg-validation-summary--info';
    const iconEl = summary.querySelector('.asg-validation-summary__icon');
    if (iconEl) iconEl.className = 'bi bi-info-circle asg-validation-summary__icon';
    
    const textEl = summary.querySelector('.asg-validation-summary__text');
    if (textEl) textEl.textContent = message;
    summary.classList.add('is-visible');
  };

  /**
   * Show delete confirmation in validation summary with Yes/No buttons
   */
  const showDeleteConfirmation = (message) => {
    const formSection = document.querySelector('.form-section .section-content');
    if (!formSection) return;
    
    // Remove existing summary
    let summary = formSection.querySelector('.validation-summary');
    if (summary) {
      summary.remove();
    }
    
    summary = document.createElement('div');
    summary.className = 'validation-summary validation-summary--warning';
    summary.setAttribute('role', 'alert');
    summary.setAttribute('aria-live', 'polite');
    
    const icon = document.createElement('i');
    icon.className = 'bi bi-exclamation-triangle validation-summary__icon';
    
    const text = document.createElement('span');
    text.className = 'validation-summary__text';
    text.textContent = message;
    
    const btnGroup = document.createElement('div');
    btnGroup.className = 'asg-validation-summary__buttons';
    
    const yesBtn = document.createElement('button');
    yesBtn.className = 'asg-btn asg-btn--danger asg-btn--sm';
    yesBtn.type = 'button';
    yesBtn.textContent = 'Yes, Delete';
    yesBtn.addEventListener('click', () => {
      summary.remove();
      if (state.pendingDeleteIndex !== null) {
        handleDelete(state.pendingDeleteIndex);
        state.pendingDeleteIndex = null;
      }
    });
    
    const noBtn = document.createElement('button');
    noBtn.className = 'asg-btn asg-btn--secondary asg-btn--sm';
    noBtn.type = 'button';
    noBtn.textContent = 'Cancel';
    noBtn.addEventListener('click', () => {
      summary.remove();
      state.pendingDeleteIndex = null;
    });
    
    btnGroup.appendChild(yesBtn);
    btnGroup.appendChild(noBtn);
    
    summary.appendChild(icon);
    summary.appendChild(text);
    summary.appendChild(btnGroup);
    
    formBody.insertBefore(summary, formBody.firstChild);
  };

  const clearForm = () => {
    if (!form) return;
    form.querySelectorAll('input[type="text"]').forEach((el) => (el.value = ''));
    form.querySelectorAll('input[type="hidden"]').forEach((el) => (el.value = '')); // Clear hidden fields too
    form.querySelectorAll('select').forEach((el) => (el.value = ''));
    const mandatory = document.getElementById('isMandatory');
    if (mandatory) mandatory.checked = false;
    state.selectedRow = null;
    
    // Remove row selection highlighting
    if (tableBody) {
      tableBody.querySelectorAll('tr.selected').forEach(r => r.classList.remove('selected'));
    }
  };

  /**
   * Set form fields to readonly or editable based on mode
   * @param {boolean} readonly - true to make fields readonly, false to make editable
   */
  const setFormFieldsReadonly = (readonly) => {
    if (!form) return;
    
    // Text inputs
    form.querySelectorAll('input[type="text"]').forEach((el) => {
      el.readOnly = readonly;
      if (readonly) {
        el.classList.add('readonly');
      } else {
        el.classList.remove('readonly');
      }
    });
    
    // Select dropdowns
    form.querySelectorAll('select').forEach((el) => {
      el.disabled = readonly;
      if (readonly) {
        el.classList.add('readonly');
      } else {
        el.classList.remove('readonly');
      }
    });
    
    // Checkbox
    const mandatory = document.getElementById('isMandatory');
    if (mandatory) {
      mandatory.disabled = readonly;
    }
    
    // Lookup buttons
    document.querySelectorAll('.btn-lookup').forEach((btn) => {
      btn.disabled = readonly;
      if (readonly) {
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      } else {
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      }
    });
  };

  // ============================================================================
  // CONTEXT FROM PARENT
  // ============================================================================
  const getContextFromParent = () => {
    try {
      // Try to get context from parent window (Account Maintenance)
      const parent = window.parent;
      if (parent && parent !== window) {
        // Check for AccountMaintenance state - this is the primary source
        if (parent.AccountMaintenanceState) {
          const parentState = parent.AccountMaintenanceState;
          console.log('[AccountSignatories] Parent AccountMaintenanceState:', parentState);
          
          // Inherit Branch and Operator from parent
          state.context.OurBranchID = parentState.OurBranchID || '';
          state.context.AccountID = parentState.AccountID || '';
          state.context.OperatorID = parentState.OperatorID || '';
          state.context.ClientID = parentState.ClientID || '';
          
          // Inherit Operating Mode and Instructions from parent
          state.context.OperatingModeID = parentState.OperatingModeID || '';
          state.context.OperatingModeDescription = parentState.OperatingModeDescription || '';
          state.context.OperatingInstructions = parentState.OperatingInstructions || '';
        } else {
          console.warn('[AccountSignatories] Parent AccountMaintenanceState not found');
        }
        
        // Fallback: try to read from parent's AuthService session
        if (!state.context.OurBranchID || !state.context.OperatorID) {
          try {
            const parentSession = parent.AuthService?.getSession?.();
            if (parentSession) {
              console.log('[AccountSignatories] Parent AuthService session:', parentSession);
              state.context.OurBranchID = state.context.OurBranchID || parentSession.branchID || parentSession.BranchID || parentSession.OurBranchID || '';
              state.context.OperatorID = state.context.OperatorID || parentSession.operatorID || parentSession.OperatorID || parentSession.operatorId || '';
            }
          } catch (authErr) {
            console.warn('[AccountSignatories] Could not read parent AuthService:', authErr);
          }
        }
      }
      
      // Local AuthService fallback (this iframe's window)
      if (!state.context.OurBranchID || !state.context.OperatorID) {
        try {
          const session = window.AuthService?.getSession?.();
          if (session) {
            console.log('[AccountSignatories] Local AuthService session:', session);
            state.context.OurBranchID = state.context.OurBranchID || session.branchID || session.BranchID || session.OurBranchID || '';
            state.context.OperatorID = state.context.OperatorID || session.operatorID || session.OperatorID || session.operatorId || '';
          }
        } catch (authErr) {
          console.warn('[AccountSignatories] Could not read local AuthService:', authErr);
        }
      }
      
      // Local session storage fallback (only if still missing)
      if (!state.context.OurBranchID || !state.context.OperatorID) {
        state.context.OurBranchID = state.context.OurBranchID || sessionStorage.getItem('OurBranchID') || sessionStorage.getItem('BranchID') || '';
        state.context.AccountID = state.context.AccountID || sessionStorage.getItem('AccountID') || '';
        state.context.OperatorID = state.context.OperatorID || sessionStorage.getItem('OperatorID') || '';
      }
      
      // Log warning if required values are still missing
      if (!state.context.OurBranchID) {
        console.warn('[AccountSignatories] MISSING: OurBranchID - will try to load dropdowns anyway');
      }
      if (!state.context.OperatorID) {
        console.warn('[AccountSignatories] MISSING: OperatorID - will try to load dropdowns anyway');
      }
      
      console.log('[AccountSignatories] Context loaded:', state.context);
      
      // Populate BTS fields from parent context
      populateBtsFromParent();
      
    } catch (err) {
      console.error('[AccountSignatories] Could not get parent context:', err);
    }
  };

  // ============================================================================
  // BTS (Behind The Scene) FUNCTIONS
  // ============================================================================
  const populateBtsFromParent = () => {
    const operatingModeEl = document.getElementById('operatingMode');
    const operatingInstructionEl = document.getElementById('operatingInstruction');
    
    if (operatingModeEl) {
      operatingModeEl.textContent = state.context.OperatingModeDescription || state.context.OperatingModeID || '-';
    }
    if (operatingInstructionEl) {
      operatingInstructionEl.textContent = state.context.OperatingInstructions || '-';
    }
  };

  const initBtsToggle = () => {
    const btsSection = document.querySelector('.form-section[data-section="behind-scene"]');
    const btsHeader = btsSection?.querySelector('.section-header');
    const btsToggle = btsHeader?.querySelector('.section-toggle-btn');
    
    if (!btsHeader || !btsSection) return;
    
    // Toggle collapse on header click
    btsHeader.addEventListener('click', (e) => {
      // Prevent toggle if clicking on specific interactive elements
      if (e.target.closest('button') && !e.target.closest('.section-toggle-btn')) return;
      
      const isCollapsed = btsSection.classList.contains('collapsed');
      btsSection.classList.toggle('collapsed', !isCollapsed);
      btsHeader.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
    });
  };

  // ============================================================================
  // SIGNATORY SEARCH (SearchService)
  // ============================================================================
  const initSearchModal = () => {
    // Initialize SearchModal if available
    if (typeof window.SearchModal === 'function') {
      state.searchModal = new window.SearchModal({
        prefix: 'asg',
        moduleID: '1000',
        getOperatorId: () => state.context.OperatorID || 'web_portal',
        getOurBranchId: () => state.context.OurBranchID || '',
        onError: (err) => {
          console.error('[AccountSignatories] Search error:', err);
          showMessage('Search failed: ' + (err?.message || err), 'error');
        }
      });
    } else {
      console.warn('[AccountSignatories] SearchModal not available');
    }
  };

  const openSignatorySearch = () => {
    if (!state.searchModal) {
      showMessage('Search functionality not available.', 'warning');
      return;
    }

    // Get ClientID from parent context for filtering
    let clientId = state.context.ClientID || '';
    
    // If not in context, try to read directly from parent form
    if (!clientId) {
      try {
        const parent = window.parent;
        if (parent && parent !== window) {
          // Try to read from parent's ClientID input field
          const parentClientIdEl = parent.document.getElementById('ClientID');
          if (parentClientIdEl) {
            clientId = parentClientIdEl.value?.trim() || '';
            // Update context for future use
            if (clientId) {
              state.context.ClientID = clientId;
              console.log('[AccountSignatories] ClientID read from parent form:', clientId);
            }
          }
        }
      } catch (err) {
        console.warn('[AccountSignatories] Could not read ClientID from parent form:', err);
      }
    }
    
    if (!clientId) {
      showMessage('Client ID is required to search signatories.', 'warning');
      return;
    }

    state.searchModal.open({
      tableID: 'ClientSignatoryID',
      whereStmt: `ClientID='${clientId}'`,
      searchFields: [
        { name: 'signatoryId', label: 'Signatory ID', column: 'SignatoryID' },
        { name: 'signatoryName', label: 'Signatory Name', column: 'SignatoryName' }
      ],
      onSelect: (record) => {
        console.log('[AccountSignatories] Signatory selected from search:', record);
        
        // Populate form fields from selected record
        // The ClientSignatoryID table returns: RelatedClientID, RelatedClientName
        const sigIdEl = document.getElementById('signatoryId');
        const sigNameEl = document.getElementById('signatoryName');
        
        // Get signatory ID
        const signatoryId = record.RelatedClientID || 
                            record.SignatoryID || 
                            record.ClientSignatoryID || 
                            record.ID || 
                            record.id || '';
        
        // Get signatory name
        const signatoryName = record.RelatedClientName || 
                              record.SignatoryName || 
                              record.Name || 
                              record.ClientName || '';
        
        // Populate both fields
        if (sigIdEl) {
          sigIdEl.value = signatoryId;
          console.log('[AccountSignatories] Set signatoryId field to:', signatoryId);
        }
        
        if (sigNameEl) {
          sigNameEl.value = signatoryName;
          console.log('[AccountSignatories] Set signatoryName hidden field to:', signatoryName);
        }
        
        if (signatoryName) {
          showToast(`Selected: ${signatoryName} (${signatoryId})`, 'success', 3000);
        }
      }
    });
  };

  // ============================================================================
  // GRID RENDERING
  // ============================================================================
  const renderGrid = (data) => {
    console.log('====== [renderGrid] START ======');
    console.log('[renderGrid] Received data:', data);
    console.log('[renderGrid] Data length:', data?.length || 0);
    
    if (!tableBody) {
      console.error('[renderGrid] ERROR: tableBody element not found!');
      return;
    }
    
    state.signatories = data || [];
    
    // Filter out deleted records for display only
    // (they stay in state.signatories for database save with ButtonMark='R')
    const visibleRecords = Array.isArray(data) ? data.filter(row => !row._isDeleted) : [];
    
    if (visibleRecords.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-muted">
            <i class="bi bi-inbox fs-3 d-block mb-2"></i>
            <span>No signatories found</span>
          </td>
        </tr>
      `;
      updateStatus(`Ready - No records`);
      return;
    }

    tableBody.innerHTML = visibleRecords.map((row, visibleIdx) => {
      // Find original index in state.signatories array
      const originalIdx = state.signatories.indexOf(row);
      
      // Log first row to see actual field names
      if (visibleIdx === 0) {
        console.log('[AccountSignatories] renderGrid - Row fields available:', Object.keys(row));
        console.log('[AccountSignatories] renderGrid - First row data:', JSON.stringify(row, null, 2));
      }
      
      // Get all keys from the row to dynamically map values
      const keys = Object.keys(row);
      
      // Helper function to find a value by partial key match (case-insensitive)
      // Returns the value even if it's 0 or empty string, only returns null if truly not found
      const findValue = (patterns) => {
        for (const pattern of patterns) {
          // First try exact match
          if (row.hasOwnProperty(pattern) && row[pattern] !== undefined && row[pattern] !== null) {
            return row[pattern];
          }
          // Then try case-insensitive match
          const lowerPattern = pattern.toLowerCase();
          for (const key of keys) {
            if (key.toLowerCase() === lowerPattern && row.hasOwnProperty(key) && row[key] !== undefined && row[key] !== null) {
              return row[key];
            }
          }
        }
        return null;
      };
      
      // Signatory ID - procedure returns SignatoryID
      const signatoryId = findValue([
        'SignatoryID', 'signatoryID', 'signatoryId', 'Signatoryid',
        'OperatorID', 'operatorID', 'operatorId',
        'ClientSignatoryID', 'clientSignatoryID',
        'ReferenceID', 'referenceID',
        'ID', 'Id', 'id'
      ]);
      
      // Signatory Name - procedure returns SignatoryName
      const signatoryName = findValue([
        'SignatoryName', 'signatoryName', 'Signatoryname',
        'OperatorName', 'operatorName',
        'ClientSignatoryName', 'clientSignatoryName',
        'Name', 'name'
      ]);
      
      // Signatory Type - procedure returns SignatoryType and SignatoryTypeID
      const sigType = findValue([
        'SignatoryType', 'signatoryType', 'Signatorytype',
        'SignatoryTypeID', 'signatoryTypeID',
        'TypeDescription', 'typeDescription',
        'Type', 'type'
      ]);
      
      // Limit - procedure returns Limit field
      const limit = findValue([
        'Limit', 'limit', 'LIMIT',
        'GroupID', 'groupID', 'groupId'
      ]);
      
      // Reference ID - procedure returns ReferenceID
      const seqNo = findValue([
        'ReferenceID', 'referenceID', 'referenceId', 'Referenceid',
        'SequenceNo', 'sequenceNo',
        'SeqNo', 'seqNo',
        'Sequence', 'sequence'
      ]);
      
      // Is Mandatory - check all possible field names and values
      const mandatoryVal = findValue([
        'IsMandatory', 'isMandatory', 'Ismandatory',
        'Mandatory', 'mandatory'
      ]);
      const isMandatory = mandatoryVal === true || mandatoryVal === 1 || mandatoryVal === '1' || 
                          mandatoryVal === 'Y' || mandatoryVal === 'Yes' || mandatoryVal === 'yes';
      
      // Display values - convert to string or show dash
      const displaySignatoryId = signatoryId !== null && signatoryId !== '' ? String(signatoryId) : '-';
      const displaySignatoryName = signatoryName !== null && signatoryName !== '' ? String(signatoryName) : '-';
      const displaySigType = sigType !== null && sigType !== '' ? String(sigType) : '-';
      const displayLimit = limit !== null && limit !== '' ? String(limit) : '-';
      const displaySeqNo = seqNo !== null && seqNo !== '' ? String(seqNo) : '-';
      
      // Check for new/modified status
      const isNewRow = row._isNew === true;
      const isModifiedRow = row._isModified === true;
      const rowClass = isNewRow ? 'table-info' : 
                       isModifiedRow ? 'table-warning' : 
                       '';
      const statusIndicator = isNewRow ? '<span class=\"badge bg-success\" title=\"New (unsaved)\">NEW</span>' :
                              isModifiedRow ? '<span class=\"badge bg-warning\" title=\"Modified (unsaved)\">MOD</span>' : '';
      
      return `
      <tr class="${rowClass}" data-index="${originalIdx}" tabindex="0">
        <td>${escapeHtml(displaySignatoryId)} ${statusIndicator}</td>
        <td>${escapeHtml(displaySignatoryName)}</td>
        <td>${escapeHtml(displaySigType)}</td>
        <td>${escapeHtml(displayLimit)}</td>
        <td>${escapeHtml(displaySeqNo)}</td>
        <td>
          ${isMandatory ? 
            '<i class="bi bi-check-circle-fill text-success" title="Yes"></i>' : 
            '<i class="bi bi-dash-circle text-muted" title="No"></i>'}
        </td>
      </tr>
    `}).join('');

    updateStatus(`Ready - ${visibleRecords.length} record${visibleRecords.length !== 1 ? 's' : ''}`);
    
    console.log('[renderGrid] Grid HTML updated. Checking for modified/new rows...');
    const modifiedCount = state.signatories.filter(s => s._isModified).length;
    const newCount = state.signatories.filter(s => s._isNew).length;
    const deletedCount = state.signatories.filter(s => s._isDeleted).length;
    console.log('[renderGrid] ✓ Modified rows:', modifiedCount, '| New rows:', newCount, '| Deleted rows:', deletedCount);
    
    if (modifiedCount > 0 || newCount > 0) {
      console.log('[renderGrid] ⚠️ UNSAVED CHANGES DETECTED!');
      state.signatories.forEach((sig, idx) => {
        if (sig._isModified || sig._isNew) {
          console.log(`  Row ${idx}: ${sig.SignatoryID} - ${sig._isNew ? 'NEW' : 'MODIFIED'}`);
        }
      });
    }
    
    // Bind row click events
    bindRowEvents();
    console.log('[renderGrid] Row events bound for', data.length, 'rows');
    
    // Update button states based on whether grid has data
    updateButtonStates();
    
    console.log('====== [renderGrid] END ======\n');
  };

  /**
   * Update button states based on current mode
   */
  const updateButtonStates = () => {
    // Get button elements from Signatory Details section
    const newBtn = document.querySelector('.form-section .btn[data-action="new"]');
    const alterBtn = document.querySelector('.form-section .btn[data-action="alter"]');
    const removeBtn = document.querySelector('.form-section .btn[data-action="remove"]');
    const updateBtn = document.querySelector('.form-section .btn[data-action="update"]');
    const clearBtn = document.querySelector('.form-section .btn[data-action="clear"]');
    const closeBtn = document.querySelector('.form-section .btn[data-action="close-form"]');

    // Get button elements from Action Panel
    const signatureBtn = document.querySelector('.action-panel .btn-action[data-action="signature"]');
    const photoBtn = document.querySelector('.action-panel .btn-action[data-action="photo"]');
    const bothBtn = document.querySelector('.action-panel .btn-action[data-action="both"]');
    const addBtn = document.querySelector('.action-panel .btn-action[data-action="add"]');
    const editBtn = document.querySelector('.action-panel .btn-action[data-action="edit"]');
    const saveBtn = document.querySelector('.action-panel .btn-action[data-action="save"]');
    const cancelBtn = document.querySelector('.action-panel .btn-action[data-action="cancel"]');

    // Helper to set button state with visual feedback
    const setEnabled = (btn, enabled) => {
      if (btn) {
        btn.disabled = !enabled;
        if (enabled) {
          btn.classList.remove('disabled');
          btn.style.opacity = '1';
        } else {
          btn.classList.add('disabled');
          btn.style.opacity = '0.5';
        }
      }
    };

    // Apply button states based on current mode
    switch (state.mode) {
      case 'VIEW':
        // Check if there are any existing records in the grid
        const hasRecords = state.signatories && state.signatories.length > 0;
        
        if (!hasRecords) {
          // NO RECORDS: Only ADD button should be enabled
          setEnabled(addBtn, true);
          
          // All other buttons DISABLED
          setEnabled(signatureBtn, false);
          setEnabled(photoBtn, false);
          setEnabled(bothBtn, false);
          setEnabled(editBtn, false);
          setEnabled(saveBtn, false);
          setEnabled(cancelBtn, false);
          setEnabled(newBtn, false);
          setEnabled(alterBtn, false);
          setEnabled(removeBtn, false);
          setEnabled(updateBtn, false);
          setEnabled(clearBtn, false);
          setEnabled(closeBtn, false);
          
          console.log('[updateButtonStates] VIEW mode - No records: Only ADD button enabled');
        } else {
          // HAS RECORDS: SIGNATURE, PHOTO, BOTH, EDIT enabled
          setEnabled(signatureBtn, true);
          setEnabled(photoBtn, true);
          setEnabled(bothBtn, true);
          setEnabled(editBtn, true);
          
          // All other buttons DISABLED
          setEnabled(addBtn, false);
          setEnabled(saveBtn, false);
          setEnabled(cancelBtn, false);
          setEnabled(newBtn, false);
          setEnabled(alterBtn, false);
          setEnabled(removeBtn, false);
          setEnabled(updateBtn, false);
          setEnabled(clearBtn, false);
          setEnabled(closeBtn, false);
          
          console.log('[updateButtonStates] VIEW mode - Has records: SIGNATURE, PHOTO, BOTH, EDIT enabled');
        }
        
        // Fields readonly in VIEW mode
        setFormFieldsReadonly(true);
        break;

      case 'EDIT':
        // Edit mode - NEW, ALTER, REMOVE, CLOSE, SIGNATURE, PHOTO, BOTH, SAVE, CANCEL enabled
        // BUT fields are READONLY - user must click ALTER to modify
        setEnabled(newBtn, true);
        setEnabled(alterBtn, true);
        setEnabled(removeBtn, true);
        setEnabled(closeBtn, true);
        setEnabled(signatureBtn, true);
        setEnabled(photoBtn, true);
        setEnabled(bothBtn, true);
        setEnabled(saveBtn, false); // Save disabled in EDIT (readonly) mode
        setEnabled(cancelBtn, true);
        
        setEnabled(updateBtn, false);
        setEnabled(clearBtn, false);
        setEnabled(addBtn, false);
        setEnabled(editBtn, false);
        
        // Fields READONLY in EDIT mode (just viewing)
        setFormFieldsReadonly(true);
        break;

      case 'ADD':
      case 'NEW':
        // New mode - UPDATE, CLEAR, SIGNATURE, PHOTO, BOTH, CANCEL enabled
        setEnabled(updateBtn, true);
        setEnabled(clearBtn, true);
        setEnabled(signatureBtn, true);
        setEnabled(photoBtn, true);
        setEnabled(bothBtn, true);
        setEnabled(cancelBtn, true);
        
        setEnabled(newBtn, false);
        setEnabled(alterBtn, false);
        setEnabled(removeBtn, false);
        setEnabled(closeBtn, false);
        setEnabled(addBtn, false);
        setEnabled(editBtn, false);
        setEnabled(saveBtn, false);
        
        // Fields editable in NEW mode
        setFormFieldsReadonly(false);
        break;

      case 'UPDATE':
        // Update mode - NEW, ALTER, REMOVE, CLOSE, SIGNATURE, PHOTO, BOTH, SAVE, CANCEL enabled
        setEnabled(newBtn, true);
        setEnabled(alterBtn, true);
        setEnabled(removeBtn, true);
        setEnabled(closeBtn, true);
        setEnabled(signatureBtn, true);
        setEnabled(photoBtn, true);
        setEnabled(bothBtn, true);
        setEnabled(saveBtn, true);
        setEnabled(cancelBtn, true);
        
        setEnabled(updateBtn, false);
        setEnabled(clearBtn, false);
        setEnabled(addBtn, false);
        setEnabled(editBtn, false);
        
        // Fields editable in UPDATE mode
        setFormFieldsReadonly(false);
        break;

      case 'ALTER':
        // Alter mode - All buttons except ADD, EDIT, SAVE enabled initially
        // Fields are now EDITABLE - user can modify
        setEnabled(newBtn, true);
        setEnabled(alterBtn, true);
        setEnabled(removeBtn, true);
        setEnabled(updateBtn, true);
        setEnabled(clearBtn, true);
        setEnabled(closeBtn, true);
        setEnabled(signatureBtn, true);
        setEnabled(photoBtn, true);
        setEnabled(bothBtn, true);
        setEnabled(cancelBtn, true);
        setEnabled(saveBtn, true); // Save enabled in ALTER mode
        
        setEnabled(addBtn, false);
        setEnabled(editBtn, false);
        
        // Fields EDITABLE in ALTER mode
        setFormFieldsReadonly(false);
        break;

      case 'SAVE':
        // After save - SIGNATURE, PHOTO, BOTH, EDIT enabled only
        setEnabled(signatureBtn, true);
        setEnabled(photoBtn, true);
        setEnabled(bothBtn, true);
        setEnabled(editBtn, true);
        
        setEnabled(newBtn, false);
        setEnabled(alterBtn, false);
        setEnabled(removeBtn, false);
        setEnabled(updateBtn, false);
        setEnabled(clearBtn, false);
        setEnabled(closeBtn, false);
        setEnabled(addBtn, false);
        setEnabled(saveBtn, false);
        setEnabled(cancelBtn, false);
        
        // Fields readonly after save
        setFormFieldsReadonly(true);
        break;

      case 'REMOVE':
        // After remove - NEW, ALTER, REMOVE, SIGNATURE, PHOTO, BOTH, SAVE, CANCEL enabled
        setEnabled(newBtn, true);
        setEnabled(alterBtn, true);
        setEnabled(removeBtn, true);
        setEnabled(signatureBtn, true);
        setEnabled(photoBtn, true);
        setEnabled(bothBtn, true);
        setEnabled(saveBtn, true);
        setEnabled(cancelBtn, true);
        
        setEnabled(updateBtn, false);
        setEnabled(clearBtn, false);
        setEnabled(closeBtn, false);
        setEnabled(addBtn, false);
        setEnabled(editBtn, false);
        
        // Fields readonly in REMOVE mode
        setFormFieldsReadonly(true);
        break;

      default:
        // Default fallback to VIEW state
        setEnabled(signatureBtn, true);
        setEnabled(photoBtn, true);
        setEnabled(bothBtn, true);
        setEnabled(editBtn, true);
        
        setEnabled(addBtn, false);
        setEnabled(saveBtn, false);
        setEnabled(cancelBtn, false);
        setEnabled(newBtn, false);
        setEnabled(alterBtn, false);
        setEnabled(removeBtn, false);
        setEnabled(updateBtn, false);
        setEnabled(clearBtn, false);
        setEnabled(closeBtn, false);
        
        // Fields readonly by default
        setFormFieldsReadonly(true);
    }
  };

  const escapeHtml = (text) => {
    if (text === null || text === undefined) return '';
    const str = String(text);
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const bindRowEvents = () => {
    // Row selection - clicking anywhere on the row
    tableBody.querySelectorAll('tr[data-index]').forEach((row) => {
      row.addEventListener('click', (e) => {
        // Don't select if clicking action buttons
        if (e.target.closest('.btn-sm')) return;
        
        const idx = parseInt(row.dataset.index, 10);
        
        console.log('[AccountSignatories] Row clicked - index:', idx);
        
        // Remove previous selection
        tableBody.querySelectorAll('tr.selected').forEach(r => r.classList.remove('selected'));
        
        // Select this row
        row.classList.add('selected');
        state.selectedRow = idx;
        
        // Populate form with row data and enter EDIT mode (readonly)
        const data = state.signatories[idx];
        if (data) {
          console.log('[AccountSignatories] Populating form from row click:', data);
          populateForm(data);
          state.mode = 'EDIT';
          
          // Update button states (enable Alter/Remove, fields readonly)
          updateButtonStates();
          
          // Show feedback
          showToast('Signatory selected. Click ALTER to modify or view details.', 'info', 2000);
        } else {
          console.warn('[AccountSignatories] No data found for row index:', idx);
        }
      });
      
      // Keyboard navigation
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          row.click();
        }
      });
    });

    // Log event binding summary
    const rowCount = tableBody.querySelectorAll('tr[data-index]').length;
    console.log(`[AccountSignatories] Event handlers attached - ${rowCount} rows (Actions column removed - use form buttons instead)`);
  };

  const populateForm = (data) => {
    if (!data) return;
    
    console.log('[AccountSignatories] Populating form with data:', data);
    
    const setValue = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value ?? '';
    };
    
    // Signatory ID
    setValue('signatoryId', data.SignatoryID || data.OperatorID || data.signatoryID || '');
    
    // Signatory Name - store in hidden field for later use
    setValue('signatoryName', data.SignatoryName || data.OperatorName || data.signatoryName || '');
    
    // Group ID
    setValue('groupId', data.GroupID || data.groupID || '');
    
    // Signatory Type - try SignatoryTypeID first (for select dropdown), then SignatoryType
    const sigTypeSelect = document.getElementById('signatoryType');
    if (sigTypeSelect) {
      const typeValue = data.SignatoryTypeID || data.signatoryTypeID || data.SignatoryType || data.TypeID || '';
      sigTypeSelect.value = typeValue;
      // If exact match not found, try matching by text content
      if (!sigTypeSelect.value && data.SignatoryType) {
        Array.from(sigTypeSelect.options).forEach(opt => {
          if (opt.text === data.SignatoryType || opt.textContent === data.SignatoryType) {
            sigTypeSelect.value = opt.value;
          }
        });
      }
    }
    
    // Sequence No / Reference ID
    setValue('sequenceNo', data.ReferenceID || data.Sequence || data.SeqNo || data.SequenceNo || '');
    
    // Limit
    setValue('limit', data.Limit ?? data.limit ?? '');
    
    // Is Mandatory
    const mandatory = document.getElementById('isMandatory');
    if (mandatory) {
      const mandatoryVal = data.IsMandatory || data.isMandatory || data.Mandatory;
      mandatory.checked = mandatoryVal === true || mandatoryVal === 1 || mandatoryVal === '1' || 
                          mandatoryVal === 'Y' || mandatoryVal === 'Yes';
    }
    
    // Handle mandates dropdown
    const mandatesSelect = document.getElementById('mandates');
    if (mandatesSelect) {
      // Get mandate value from data
      const mandateValue = data.Mandates || data.MandateID || data.mandateID || '';
      mandatesSelect.value = mandateValue;
    }
    
    // BTS fields - update IDs to match actual elements
    const setAuditValue = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value ?? '-';
    };
    
    setAuditValue('createdBy', data.CreatedBy);
    setAuditValue('createdOn', data.CreatedOn ? formatDate(data.CreatedOn) : '-');
    setAuditValue('modifiedBy', data.ModifiedBy);
    setAuditValue('modifiedOn', data.ModifiedOn ? formatDate(data.ModifiedOn) : '-');
    setAuditValue('supervisedBy', data.SupervisedBy);
    setAuditValue('supervisedOn', data.SupervisedOn ? formatDate(data.SupervisedOn) : '-');
  };

  const formatDate = (value) => {
    if (!value) return '-';
    if (window.DataEntryUtils?.formatDate) {
      return window.DataEntryUtils.formatDate(value);
    }
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return value;
    }
  };

  // ============================================================================
  // API CALLS
  // ============================================================================
  const loadSignatories = async () => {
    console.log('[AccountSignatories] Loading signatories...');
    
    // Check if OtherAccountService is available
    if (!window.OtherAccountService && !window.otherAccountService) {
      console.error('[AccountSignatories] OtherAccountService not available');
      showToast('OtherAccountService not available. Please refresh the page.', 'error', 5000);
      renderGrid([]);
      return;
    }

    const service = window.OtherAccountService || window.otherAccountService;
    
    // Use getAccountOperatedBy method (returns more complete signatory data)
    if (!service.getAccountOperatedBy) {
      console.error('[AccountSignatories] getAccountOperatedBy method not found');
      console.log('[AccountSignatories] Available methods:', Object.keys(service));
      showToast('Signatory service method not available. Please check the service configuration.', 'error', 5000);
      renderGrid([]);
      return;
    }

    // Validate required context - AccountID is needed to load signatories
    if (!state.context.AccountID) {
      console.warn('[AccountSignatories] No AccountID - showing empty grid');
      renderGrid([]);
      return;
    }

    showLoader(true);

    try {
      // Only send parameters the SP expects - OurBranchID, AccountID, OperatorID
      const requestData = {
        OurBranchID: state.context.OurBranchID || '',
        AccountID: state.context.AccountID,
        OperatorID: state.context.OperatorID || ''
      };

      console.log('[AccountSignatories] Request:', requestData);

      const result = await service.getAccountOperatedBy(requestData);
      
      console.log('[AccountSignatories] Response:', result);

      if (!result?.success) {
        showMessage(result?.message || 'Failed to load signatories.', 'warning');
        renderGrid([]);
        return;
      }

      // Extract data from response - handle various response structures
      // The procedure returns TWO result sets:
      // 1. Status row (OperatorID, EventID, NewData, CreatedOn, UpdateCount)
      // 2. Actual signatory data (OurBranchID, AccountID, SignatoryID, SignatoryName, etc.)
      let rows = [];
      
      // Log the full response structure for debugging
      console.log('[AccountSignatories] Full API response:', result);
      console.log('[AccountSignatories] result.data:', result.data);
      console.log('[AccountSignatories] result.Details:', result.Details);
      
      const responseData = result.data;
      
      // Helper function to check if an array contains signatory data (not status data)
      const isSignatoryData = (arr) => {
        if (!Array.isArray(arr) || arr.length === 0) return false;
        const firstItem = arr[0];
        if (!firstItem || typeof firstItem !== 'object') return false;
        // Check for signatory-specific fields
        return (firstItem.SignatoryID !== undefined || 
                firstItem.SignatoryName !== undefined ||
                firstItem.signatoryID !== undefined ||
                firstItem.signatoryName !== undefined);
      };
      
      // Helper function to check if an array is a status/audit row
      const isStatusData = (arr) => {
        if (!Array.isArray(arr) || arr.length === 0) return false;
        const firstItem = arr[0];
        if (!firstItem || typeof firstItem !== 'object') return false;
        // Status rows typically have these fields
        return (firstItem.ResponseCode !== undefined || 
                firstItem.responseCode !== undefined ||
                firstItem.UpdateCount !== undefined ||
                firstItem.EventID !== undefined ||
                (firstItem.OperatorID !== undefined && firstItem.SignatoryID === undefined));
      };
      
      if (responseData) {
        console.log('[AccountSignatories] responseData type:', typeof responseData);
        console.log('[AccountSignatories] responseData keys:', Object.keys(responseData));
        
        // Check Details02 first (second result set - likely the actual data)
        if (responseData.Details02 && isSignatoryData(responseData.Details02)) {
          rows = responseData.Details02;
          console.log('[AccountSignatories] Found signatory data in Details02:', rows.length, 'rows');
        }
        // Then check Details01
        else if (responseData.Details01 && isSignatoryData(responseData.Details01)) {
          rows = responseData.Details01;
          console.log('[AccountSignatories] Found signatory data in Details01:', rows.length, 'rows');
        }
        // Check Details
        else if (responseData.Details && isSignatoryData(responseData.Details)) {
          rows = responseData.Details;
          console.log('[AccountSignatories] Found signatory data in Details:', rows.length, 'rows');
        }
        // If responseData itself is an array with signatory data
        else if (isSignatoryData(responseData)) {
          rows = responseData;
          console.log('[AccountSignatories] responseData is signatory array:', rows.length, 'rows');
        }
        // Scan all DetailsXX properties for signatory data
        else {
          for (let i = 1; i <= 10; i++) {
            const key = `Details${String(i).padStart(2, '0')}`;
            if (responseData[key] && isSignatoryData(responseData[key])) {
              rows = responseData[key];
              console.log(`[AccountSignatories] Found signatory data in ${key}:`, rows.length, 'rows');
              break;
            }
          }
        }
        
        // If still empty, scan all properties for arrays with signatory data
        if (rows.length === 0) {
          for (const key of Object.keys(responseData)) {
            const val = responseData[key];
            if (isSignatoryData(val) && !isStatusData(val)) {
              rows = val;
              console.log(`[AccountSignatories] Found signatory data in ${key}:`, rows.length, 'rows');
              break;
            }
          }
        }
      }
      
      // Also try result.Details directly
      if (rows.length === 0 && result.Details) {
        if (isSignatoryData(result.Details)) {
          rows = result.Details;
          console.log('[AccountSignatories] Found signatory data in result.Details:', rows.length, 'rows');
        }
      }
      
      // Log what we found
      if (rows.length > 0) {
        console.log('[AccountSignatories] SUCCESS - First row keys:', Object.keys(rows[0]));
        console.log('[AccountSignatories] SUCCESS - First row data:', JSON.stringify(rows[0], null, 2));
      } else {
        console.log('[AccountSignatories] WARNING - No signatory data rows found');
        // Log all available arrays for debugging
        if (responseData) {
          for (const key of Object.keys(responseData)) {
            const val = responseData[key];
            if (Array.isArray(val) && val.length > 0) {
              console.log(`[AccountSignatories] Available array ${key}:`, Object.keys(val[0]));
            }
          }
        }
      }

      console.log('[AccountSignatories] Final parsed rows:', rows.length);
      
      renderGrid(rows);
      
      if (rows.length > 0) {
        showToast(`Loaded ${rows.length} signator${rows.length !== 1 ? 'ies' : 'y'}.`, 'success', 2000);
      }

    } catch (err) {
      console.error('[AccountSignatories] Load error:', err);
      showToast(err?.message || 'Failed to load signatories.', 'error');
      renderGrid([]);
    } finally {
      showLoader(false);
    }
  };

  const handleDelete = async (index) => {
    // Mark for deletion and remove from local grid
    if (index >= 0 && index < state.signatories.length) {
      const signatory = state.signatories[index];
      
      // If it's a new row (not saved yet), just remove from array
      if (signatory._isNew) {
        state.signatories.splice(index, 1);
        renderGrid(state.signatories);
        showToast('Signatory removed from grid.', 'success');
      } else {
        // Mark existing signatory for deletion
        signatory._isDeleted = true;
        renderGrid(state.signatories);
        showToast('Signatory marked for deletion. Click SAVE to persist changes.', 'warning', 3000);
      }
      
      // Clear form
      state.selectedRow = null;
      clearForm();
      
      // Check if there are any pending changes (new, modified, or deleted records)
      const hasPendingChanges = state.signatories.some(sig => 
        sig._isNew || sig._isModified || sig._isDeleted
      );
      
      // Set mode to UPDATE if there are pending changes (enables SAVE button)
      // Otherwise return to VIEW mode
      state.mode = hasPendingChanges ? 'UPDATE' : 'VIEW';
      updateButtonStates();
      
      // User must click SAVE button to persist deletion to database
    }
  };

  /**
   * Build XML payload for signatories
   * MUST match stored procedure format EXACTLY:
   * <dt_AccountOperatedBy>
   *   <ReferenceID>1</ReferenceID>
   *   <SignatoryTypeID>S</SignatoryTypeID>
   *   <SignatoryID>0000000102</SignatoryID>
   *   <SignatoryName>HABETAMU MEKURIYA ALAMEREW</SignatoryName>
   *   <ButtonMark>A</ButtonMark>
   *   <IsMendetory>false</IsMendetory>  <!-- Note: typo "Mendetory" in DB! -->
   * </dt_AccountOperatedBy>
   * @returns {string} XML string
   */
  const buildSignatoriesXML = () => {
    console.log('[buildSignatoriesXML] Building XML from', state.signatories.length, 'signatories');
    console.log('[buildSignatoriesXML] ⚠️ Using stored procedure format (IsMendetory, no GroupID/Limit/Mandates)');
    
    let xml = '';
    let includedCount = 0;
    
    state.signatories.forEach((sig, index) => {
      // Determine ButtonMark based on record state
      let buttonMark;
      if (sig._isDeleted) {
        buttonMark = 'R'; // Remove
      } else if (sig._isNew === true || (!sig.CreatedOn && !sig.UpdateCount)) {
        buttonMark = 'N'; // New
      } else {
        buttonMark = 'E'; // Edit
      }
      
      console.log(`[buildSignatoriesXML] Including signatory ${index}:`, {
        SignatoryID: sig.SignatoryID,
        SignatoryTypeID: sig.SignatoryTypeID,
        SignatoryName: sig.SignatoryName,
        ReferenceID: sig.ReferenceID || (index + 1),
        ButtonMark: buttonMark,
        IsDeleted: !!sig._isDeleted,
        HasCreatedOn: !!sig.CreatedOn,
        HasUpdateCount: !!sig.UpdateCount,
        IsMandatory: sig.IsMandatory,
        _isNew: sig._isNew,
        _isModified: sig._isModified
      });
      
      // Get ReferenceID - use assigned value or fallback to index+1
      const referenceID = sig.ReferenceID || sig.Sequence || sig.SeqNo || sig.SequenceNo || (index + 1).toString();
      
      // Build XML in EXACT order expected by stored procedure
      xml += '<dt_AccountOperatedBy>';
      xml += `<ReferenceID>${escapeXml(referenceID)}</ReferenceID>`;
      xml += `<SignatoryTypeID>${escapeXml(sig.SignatoryTypeID || '')}</SignatoryTypeID>`;
      xml += `<SignatoryID>${escapeXml(sig.SignatoryID || sig.OperatorID || '')}</SignatoryID>`;
      xml += `<SignatoryName>${escapeXml(sig.SignatoryName || sig.SignatoryID || '')}</SignatoryName>`;
      xml += `<ButtonMark>${buttonMark}</ButtonMark>`;
      
      // IMPORTANT: Only include IsMendetory for non-remove operations
      // Remove operations (ButtonMark='R') should NOT have IsMendetory field
      if (buttonMark !== 'R') {
        // CRITICAL: Stored procedure expects "IsMendetory" (typo in DB schema!)
        xml += `<IsMendetory>${sig.IsMandatory ? 'true' : 'false'}</IsMendetory>`;
      }
      
      xml += '</dt_AccountOperatedBy>';
      
      includedCount++;
    });
    
    console.log('[buildSignatoriesXML] ✅ XML built with', includedCount, 'signatories (out of', state.signatories.length, 'total)');
    console.log('[buildSignatoriesXML] Sample XML:', xml.substring(0, 300) + '...');
    
    return xml;
  };

  /**
   * Escape XML special characters
   */
  const escapeXml = (text) => {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  /**
   * Save all signatories to database
   */
  const saveAllSignatories = async () => {
    console.log('[AccountSignatories] Saving all signatories to database...');
    
    // Check if OtherAccountService is available
    if (!window.OtherAccountService && !window.otherAccountService) {
      showToast('OtherAccountService not available. Cannot save signatories.', 'error', 5000);
      return;
    }

    const service = window.OtherAccountService || window.otherAccountService;
    
    if (!service.addEditAccountOperatedBy) {
      showToast('Save method not available in OtherAccountService.', 'error', 5000);
      return;
    }

    // Validate context
    if (!state.context.AccountID || !state.context.OurBranchID) {
      showToast('Missing required context (AccountID or BranchID).', 'error', 5000);
      return;
    }

    // Build XML payload
    const detailRecords = buildSignatoriesXML();
    
    console.log('[AccountSignatories] XML payload:', detailRecords);
    console.log('[AccountSignatories] Signatories being saved:', JSON.stringify(state.signatories, null, 2));

    // Calculate maximum UpdateCount from existing signatories
    // This is required for concurrency control - stored procedure uses this to determine if record has changed
    const maxUpdateCount = state.signatories.reduce((max, sig) => {
      const count = parseInt(sig.UpdateCount, 10) || 0;
      return count > max ? count : max;
    }, 0);
    
    console.log('[AccountSignatories] Maximum UpdateCount from signatories:', maxUpdateCount);

    // Build request data
    const requestData = {
      OurBranchID: state.context.OurBranchID,
      AccountID: state.context.AccountID,
      OperatedBy: state.context.OperatorID || 'web_portal',
      OperatedOn: new Date().toISOString(),
      SupervisedBy: '',
      UpdateCount: maxUpdateCount,  // Use maximum UpdateCount for concurrency control
      DetailRecords: detailRecords
    };

    console.log('[AccountSignatories] Saving with request:', requestData);

    showLoader(true);

    try {
      const result = await service.addEditAccountOperatedBy(requestData);
      
      console.log('\n');
      console.log('==========================================================');
      console.log('========== DATABASE SAVE RESPONSE =======================');
      console.log('==========================================================');
      console.log('[AccountSignatories] Full API response:', JSON.stringify(result, null, 2));
      console.log('[AccountSignatories] 🔍 Success:', result?.success);
      console.log('[AccountSignatories] 🔍 Code:', result?.code);
      console.log('[AccountSignatories] 🔍 Message:', result?.message);
      console.log('==========================================================\n');

      if (result?.success) {
        console.log('[AccountSignatories] ✅ Save successful! Reloading data from database...');
        
        // Clear pending changes markers
        state.pendingChanges = [];
        
        // Reload signatories from database to get fresh data with all fields
        await loadSignatories();
        
        console.log('\n');
        console.log('==========================================================');
        console.log('========== DATA COMPARISON (SENT vs RECEIVED) ===========');
        console.log('==========================================================');
        console.log('[AccountSignatories] Total signatories after reload:', state.signatories.length);
        console.log('\n⚠️ CHECKING IF DATABASE SAVED OUR CHANGES:');
        
        // Compare what we sent vs what we got back
        state.signatories.forEach((sig, idx) => {
          console.log(`\n--- Signatory ${idx + 1}: ${sig.SignatoryID} ---`);
          console.log('SignatoryTypeID:', sig.SignatoryTypeID, '(', sig.SignatoryType, ')');
          console.log('Limit:', sig.Limit);
          console.log('Mandates:', sig.Mandates);
          console.log('UpdateCount:', sig.UpdateCount);
        });
        console.log('\n==========================================================\n');
        
        // Always return to VIEW mode after successful save (initial state)
        // This ensures form opens with only EDIT, signature, photo, both buttons enabled
        clearForm();
        state.mode = 'VIEW';
        state.selectedRow = null;
        updateButtonStates();
        
        showToast(`Changes saved and verified. ${state.signatories.length} signator${state.signatories.length !== 1 ? 'ies' : 'y'} in database.`, 'success', 3000);
      } else {
        showToast(result?.message || 'Failed to save signatories.', 'error');
      }
    } catch (err) {
      console.error('[AccountSignatories] Error saving signatories:', err);
      showToast('Error saving signatories: ' + (err.message || 'Unknown error'), 'error', 5000);
    } finally {
      showLoader(false);
    }
  };

  /**
   * Open image capture popup for signature/photo
   * @param {string} captureType - 'signature', 'photo', or 'both'
   */
  const openImageCapture = (captureType) => {
    // Check if a signatory is selected
    if (state.selectedRow === null || !state.signatories[state.selectedRow]) {
      showToast('Please select a signatory from the grid first.', 'warning');
      return;
    }

    const signatory = state.signatories[state.selectedRow];
    const signatoryId = signatory.SignatoryID || signatory.OperatorID || signatory.signatoryID || '';
    const signatoryName = signatory.SignatoryName || signatory.OperatorName || signatory.signatoryName || '';

    console.log('[AccountSignatories] Opening signature/photo viewer:', captureType, 'for signatory:', signatoryId, signatoryName);

    try {
      // Create backdrop
      const backdrop = document.createElement('div');
      backdrop.id = 'signaturePhotoBackdrop';
      backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 9999;
      `;
      
      // Create modal container
      const modal = document.createElement('div');
      modal.id = 'signaturePhotoModal';
      modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 85%;
        max-width: 1200px;
        height: 80%;
        max-height: 700px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      `;
      
      // Create iframe
      const iframe = document.createElement('iframe');
      iframe.id = 'signaturePhotoFrame';
      iframe.src = '../view/signature-photo.html';
      iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        border-radius: 8px;
      `;
      
      modal.appendChild(iframe);
      document.body.appendChild(backdrop);
      document.body.appendChild(modal);
      
      // Set up AccountMaintenanceState for the iframe to access
      if (!window.AccountMaintenanceState) {
        window.AccountMaintenanceState = {};
      }
      window.AccountMaintenanceState = {
        ...window.AccountMaintenanceState,
        OurBranchID: state.context.OurBranchID || '',
        AccountID: state.context.AccountID || '',
        OperatorID: state.context.OperatorID || '',
        ClientID: state.context.ClientID || ''
      };
      
      // Close handler
      const closeModal = () => {
        backdrop.remove();
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
        window.removeEventListener('message', handleCloseMessage);
      };
      
      // Close on backdrop click
      backdrop.addEventListener('click', closeModal);
      
      // Close on Escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          closeModal();
        }
      };
      document.addEventListener('keydown', handleEscape);
      
      // Listen for close message from iframe (from signature-photo.html close button)
      const handleCloseMessage = (event) => {
        if (event.data && (event.data.type === 'accountMaintenanceChildClose' || event.data.type === 'closeSignaturePhotoModal')) {
          console.log('[AccountSignatories] Received close message from iframe');
          closeModal();
        }
      };
      window.addEventListener('message', handleCloseMessage);
      
      showToast(`Opened signature/photo viewer for ${signatoryName}`, 'success', 2000);
      
    } catch (err) {
      console.error('[AccountSignatories] Error opening signature/photo viewer:', err);
      showToast('Failed to open signature/photo viewer: ' + (err?.message || err), 'error');
    }
  };

  /**
   * Fetch and display signatory image (signature/photo)
   * @param {string} signatoryId - The signatory ID
   * @param {string} imageType - 'S' for signature, 'P' for photo
   */
  const fetchSignatoryImage = async (signatoryId, imageType) => {
    if (!signatoryId) return null;

    try {
      if (!window.OtherAccountService?.getSignatoryImage) {
        console.warn('[AccountSignatories] OtherAccountService.getSignatoryImage not available');
        return null;
      }

      const requestData = {
        SignID: signatoryId,
        PhotoID: signatoryId,
        DocumentID: 0
      };

      const response = await window.OtherAccountService.getSignatoryImage(requestData);
      console.log('[AccountSignatories] Image response:', response);

      if (response?.success && response?.data) {
        // Extract image data based on type
        const details = response.data.Details || response.data.Details01 || [];
        if (Array.isArray(details)) {
          const imageRecord = details.find(r => {
            const type = (r.ImageTypeID || r.Type || '').toString().toUpperCase();
            return type === imageType || 
                   (imageType === 'S' && type === 'SIGNATURE') ||
                   (imageType === 'P' && type === 'PHOTO');
          });
          return imageRecord?.sImage || imageRecord?.Image || null;
        }
      }
      return null;
    } catch (err) {
      console.error('[AccountSignatories] Error fetching signatory image:', err);
      return null;
    }
  };

  // ============================================================================
  // DROPDOWN LOADING
  // ============================================================================
  const loadSignatoryTypes = async () => {
    console.log('[AccountSignatories] Loading signatory types via LookupService...');
    
    const select = document.getElementById('signatoryType');
    if (!select) {
      console.warn('[AccountSignatories] signatoryType select not found');
      return;
    }

    if (!window.LookupService?.getSignatoryTypes) {
      console.error('[AccountSignatories] LookupService.getSignatoryTypes not available');
      return;
    }

    try {
      // Use LookupService to get signatory types
      const options = await window.LookupService.getSignatoryTypes();
      
      console.log('[AccountSignatories] getSignatoryTypes Response:', options);

      // Populate dropdown - LookupService returns { value, label, order } format
      select.innerHTML = '<option value="">Select...</option>';
      
      if (Array.isArray(options) && options.length > 0) {
        options.forEach((opt) => {
          const option = document.createElement('option');
          option.value = opt.value || '';
          option.textContent = opt.label || '';
          if (option.value) {
            select.appendChild(option);
          }
        });
        console.log(`[AccountSignatories] Loaded ${options.length} signatory types`);
      } else {
        console.warn('[AccountSignatories] No signatory types returned from LookupService');
      }

    } catch (err) {
      console.error('[AccountSignatories] Error loading signatory types:', err);
      showToast('Failed to load signatory types.', 'error', 3000);
    }
  };

  const loadMandates = async () => {
    console.log('[AccountSignatories] Loading mandates via LookupService...');
    
    const select = document.getElementById('mandates');
    
    if (!select) {
      console.warn('[AccountSignatories] mandates select not found');
      return;
    }

    if (!window.LookupService?.getMandates) {
      console.error('[AccountSignatories] LookupService.getMandates not available');
      return;
    }

    try {
      // Use LookupService to get mandates
      const options = await window.LookupService.getMandates();
      
      console.log('[AccountSignatories] getMandates Response:', options);

      // Populate dropdown - LookupService returns { value, label, order } format
      select.innerHTML = '<option value="">Select...</option>';
      
      if (Array.isArray(options) && options.length > 0) {
        options.forEach((opt) => {
          const option = document.createElement('option');
          option.value = opt.value || '';
          option.textContent = opt.label || '';
          if (option.value) {
            select.appendChild(option);
          }
        });
        console.log(`[AccountSignatories] Loaded ${options.length} mandates`);
      } else {
        console.warn('[AccountSignatories] No mandates returned from LookupService');
      }

    } catch (err) {
      console.error('[AccountSignatories] Error loading mandates:', err);
      showToast('Failed to load mandates.', 'error', 3000);
    }
  };

  // Get selected mandate value
  const getSelectedMandates = () => {
    const mandatesSelect = document.getElementById('mandates');
    return mandatesSelect?.value || '';
  };

  const loadDropdowns = async () => {
    console.log('[AccountSignatories] Loading dropdowns...');
    
    // Load dropdowns in parallel
    await Promise.all([
      loadSignatoryTypes(),
      loadMandates()
    ]);

    console.log('[AccountSignatories] Dropdowns loaded');
  };

  // ============================================================================
  // EVENT BINDINGS
  // ============================================================================
  
  // Page refresh - reload the entire form to initial state
  const refreshPage = () => {
    // Clear all state
    state.mode = 'VIEW';
    state.signatories = [];
    state.selectedRow = null;
    
    // Clear form
    clearForm();
    
    // Re-get context from parent and reload everything
    getContextFromParent();
    
    // Reload dropdowns and grid
    showLoader(true);
    Promise.all([
      loadDropdowns(),
      loadSignatories()
    ]).finally(() => {
      showLoader(false);
    });
  };

  const bindEvents = () => {
    // Title bar buttons (refresh, maximize, close)
    document.querySelectorAll('.am-btn[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        
        switch(action) {
          case 'refresh':
            refreshPage();
            break;
          case 'maximize':
            const isMaximized = windowEl?.classList.toggle('maximized');
            // Toggle icon between square and restore
            const maxIcon = btn.querySelector('i');
            if (maxIcon) {
              maxIcon.className = isMaximized ? 'bi bi-fullscreen-exit' : 'bi bi-square';
            }
            btn.title = isMaximized ? 'Restore' : 'Maximize';
            btn.setAttribute('aria-label', isMaximized ? 'Restore window' : 'Maximize window');
            break;
          case 'close':
            postClose();
            break;
        }
      });
    });

    // Lookup buttons
    document.querySelectorAll('.btn-lookup').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-lookup') || '';
        
        // Handle Signatory ID lookup with SearchService
        if (targetId === 'signatoryId') {
          openSignatorySearch();
          return;
        }
        
        // Other lookups - focus field for now
        document.getElementById(targetId)?.focus();
      });
    });

    // Signatory Details section buttons (New, Alter, Remove, Update, Clear, Close)
    document.querySelectorAll('.form-section .btn[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        handleAction(action);
      });
    });

    // Action panel buttons
    document.querySelectorAll('.btn-action').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        handleAction(action);
      });
    });

    // Grid toolbar buttons (refresh list button)
    document.querySelectorAll('.btn-icon[data-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const action = btn.getAttribute('data-action');
        if (action === 'add') {
          clearForm();
          state.mode = 'ADD';
          state.selectedRow = null;
          updateButtonStates();
          showMessage('Adding new signatory. Fill the form and click Save.', 'info');
        }
        if (action === 'refresh') {
          // Refresh entire page to initial state
          refreshPage();
        }
      });
    });

    // Listen for messages from parent
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'accountContext') {
        state.context = { ...state.context, ...event.data.context };
        console.log('[AccountSignatories] Context updated from parent:', state.context);
        loadSignatories();
      }
    });
  };

  const handleAction = async (action) => {
    switch (action) {
      case 'new':
        // Clear form and enter NEW mode
        clearForm();
        state.mode = 'NEW';
        state.selectedRow = null;
        updateButtonStates();
        showToast('New signatory mode. Fill the form and click Update.', 'info');
        // Focus on first input
        document.getElementById('signatoryId')?.focus();
        break;

      case 'alter':
        // Enter ALTER mode for selected row
        if (state.selectedRow === null) {
          showToast('Please select a signatory from the list to edit.', 'warning');
          return;
        }
        state.mode = 'ALTER';
        updateButtonStates();
        showToast('Alter mode. Fields are now editable. Make changes and click Save.', 'info', 3000);
        break;

      case 'remove':
        // Delete selected row
        if (state.selectedRow === null) {
          showToast('Please select a signatory from the list to remove.', 'warning');
          return;
        }
        const signatory = state.signatories[state.selectedRow];
        const sigName = signatory.SignatoryName || signatory.SignatoryID || 'this signatory';
        if (confirm(`Are you sure you want to remove ${sigName}?`)) {
          await handleDelete(state.selectedRow);
          // handleDelete now returns to VIEW mode and auto-saves
        }
        break;

      case 'update':
        // Update button clicked - save form changes to grid
        console.log('\\n');
        console.log('======================================================');
        console.log('========== UPDATE BUTTON CLICKED ====================');
        console.log('======================================================');
        console.log('[UPDATE] Current mode:', state.mode);
        console.log('[UPDATE] Selected row index:', state.selectedRow);
        
        // Check if in valid mode for updating
        if (state.mode !== 'ALTER' && state.mode !== 'UPDATE' && state.mode !== 'NEW' && state.mode !== 'ADD') {
          console.warn('[UPDATE] \u274c INVALID MODE - Please click ALTER first');
          showToast('Please click ALTER first to modify the record.', 'warning');
          return;
        }
        
        // Log existing data BEFORE collecting form changes
        if (state.selectedRow !== null && state.signatories[state.selectedRow]) {
          console.log('[UPDATE] BEFORE - Existing grid data:');
          console.table([state.signatories[state.selectedRow]]);
        }
        
        // Collect form data and update grid
        const updateFormData = collectFormData();
        console.log('[UPDATE] Collected from form:');
        console.table([updateFormData]);
        
        // Show what changed
        if (state.selectedRow !== null && state.signatories[state.selectedRow]) {
          const existing = state.signatories[state.selectedRow];
          const changes = {};
          for (const key in updateFormData) {
            if (updateFormData[key] !== existing[key]) {
              changes[key] = { old: existing[key], new: updateFormData[key] };
            }
          }
          console.log('[UPDATE] CHANGES DETECTED:');
          console.table(changes);
        }
        
        // Validate
        const updateValidation = validateFormData(updateFormData);
        if (!updateValidation.isValid) {
          console.error('[UPDATE] \u274c VALIDATION FAILED:', updateValidation.message);
          showToast(updateValidation.message, 'error');
          return;
        }
        
        console.log('[UPDATE] \u2713 Validation passed');
        
        if (state.mode === 'ADD' || state.mode === 'NEW') {
          // Add new record to grid
          console.log('[UPDATE] Adding new signatory to grid...');
          addToGridLocally(updateFormData);
          console.log('[UPDATE] \u2713 New signatory added to grid');
          
          // Auto-save to database immediately
          console.log('[UPDATE] Auto-saving new signatory to database...');
          await saveAllSignatories();
          
        } else if (state.selectedRow !== null) {
          // Update existing record in grid
          console.log('[UPDATE] Updating existing signatory at index:', state.selectedRow);
          updateGridRowLocally(state.selectedRow, updateFormData);
          console.log('[UPDATE] \u2713 Grid row updated at index', state.selectedRow);
          console.log('[UPDATE] AFTER - Updated grid data:');
          console.table([state.signatories[state.selectedRow]]);
          
          // Auto-save to database immediately
          console.log('[UPDATE] Auto-saving updated signatory to database...');
          await saveAllSignatories();
          
        } else {
          console.warn('[UPDATE] \u274c No row selected');
          showToast('Please select a signatory from the list.', 'warning');
        }
        
        // Set mode to UPDATE and refresh button states
        state.mode = 'UPDATE';
        updateButtonStates();
        console.log('[UPDATE] \u2713 Mode set to UPDATE, buttons refreshed');
        
        console.log('======================================================\\n');
        break;

      case 'clear':
        // Clear form and return to VIEW mode
        clearForm();
        state.mode = 'VIEW';
        state.selectedRow = null;
        updateButtonStates();
        hideValidationSummary();
        showToast('Form cleared.', 'info');
        break;

      case 'close-form':
        // Close the form/window
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ 
            action: 'submoduleClosed',
            source: 'Account Signatories'
          }, '*');
        } else {
          window.close();
        }
        break;

      case 'cancel':
        // Cancel and return to VIEW mode
        clearForm();
        state.mode = 'VIEW';
        state.selectedRow = null;
        updateButtonStates();
        hideValidationSummary();
        showToast('Action cancelled.', 'info');
        break;

      case 'close':
        // Close the window
        state.mode = 'VIEW';
        updateButtonStates();
        postClose();
        break;

      case 'view':
        if (state.selectedRow !== null && state.signatories[state.selectedRow]) {
          populateForm(state.signatories[state.selectedRow]);
          state.mode = 'VIEW';
          updateButtonStates();
          showToast('Record loaded in view mode.', 'info', 2000);
        } else {
          showToast('Select a row to view.', 'warning');
        }
        break;

      case 'add':
        // Action panel Add button - enter ADD mode
        clearForm();
        state.mode = 'ADD';
        state.selectedRow = null;
        updateButtonStates();
        showToast('Add mode. Fill the form and click Save.', 'info');
        document.getElementById('signatoryId')?.focus();
        break;

      case 'edit':
        // Action panel Edit button - enter EDIT mode (readonly)
        if (state.selectedRow !== null) {
          // Ensure row is highlighted in grid
          if (tableBody) {
            tableBody.querySelectorAll('tr.selected').forEach(r => r.classList.remove('selected'));
            const row = tableBody.querySelector(`tr[data-index="${state.selectedRow}"]`);
            if (row) row.classList.add('selected');
          }
          
          populateForm(state.signatories[state.selectedRow]);
          state.mode = 'EDIT';
          updateButtonStates();
          showToast('Edit mode (readonly). Click ALTER to modify fields.', 'info', 3000);
        } else {
          showToast('Click a row in the grid to select a signatory first.', 'warning', 3000);
        }
        break;

      case 'save':
        // Save button - save all changes to database
        console.log('\\n');
        console.log('======================================================');
        console.log('========== SAVE BUTTON CLICKED ======================');
        console.log('======================================================');
        console.log('[SAVE] Persisting all changes to database...');
        await saveAllSignatories();
        console.log('======================================================\\n');
        break;

      case 'save-all':
        // Save all changes to database
        saveAllSignatories();
        break;

      case 'delete':
        if (state.selectedRow !== null) {
          const data = state.signatories[state.selectedRow];
          if (data) {
            // Show confirmation message in validation summary
            const sigName = data.SignatoryName || data.OperatorName || data.SignatoryID;
            state.pendingDeleteIndex = state.selectedRow;
            showToast(`Delete confirmation required for ${sigName}`, 'warning', 3000);
            showDeleteConfirmation(`Are you sure you want to delete signatory "${sigName}"?`);
          }
        } else {
          showToast('Select a row to delete.', 'warning');
          showMessage('Select a row to delete.', 'warning');
        }
        break;

      case 'signature':
      case 'photo':
      case 'both':
        openImageCapture(action);
        break;

      default:
        console.log('[AccountSignatories] Unhandled action:', action);
    }
  };

  const handleSave = async () => {
    console.log('[AccountSignatories] Save requested. Mode:', state.mode);
    console.log('[AccountSignatories] Selected row:', state.selectedRow);
    
    // Prevent save in invalid modes
    if (state.mode === 'REMOVE' || state.mode === 'VIEW' || state.mode === 'SAVE') {
      showToast('Cannot save in current mode. Use NEW to add or ALTER to modify.', 'warning', 3000);
      return;
    }
    
    // Log existing data BEFORE collecting form changes
    if (state.selectedRow !== null && state.signatories[state.selectedRow]) {
      console.log('[AccountSignatories] BEFORE EDIT - Existing signatory data:', JSON.stringify(state.signatories[state.selectedRow], null, 2));
    }
    
    // Collect form data
    const formData = collectFormData();
    console.log('[AccountSignatories] COLLECTED FROM FORM:', JSON.stringify(formData, null, 2));
    
    // Show what changed
    if (state.selectedRow !== null && state.signatories[state.selectedRow]) {
      const existing = state.signatories[state.selectedRow];
      const changes = {};
      for (const key in formData) {
        if (formData[key] !== existing[key]) {
          changes[key] = { old: existing[key], new: formData[key] };
        }
      }
      console.log('[AccountSignatories] CHANGES DETECTED:', JSON.stringify(changes, null, 2));
    }
    
    // Validate required fields
    const validation = validateFormData(formData);
    if (!validation.isValid) {
      console.warn('[AccountSignatories] Validation failed:', validation.message);
      showToast(validation.message, 'error');
      showMessage(validation.message, 'error');
      return;
    }
    
    if (state.mode === 'ADD' || state.mode === 'NEW') {
      // Add to grid locally (staging)
      console.log('[AccountSignatories] Adding new signatory to grid');
      addToGridLocally(formData);
      
      // Auto-save to database immediately after adding
      console.log('[handleSave] Auto-saving new signatory to database...');
      await saveAllSignatories();
      
    } else if ((state.mode === 'EDIT' || state.mode === 'UPDATE' || state.mode === 'ALTER') && state.selectedRow !== null) {
      // Update existing row in grid locally
      console.log('[AccountSignatories] Updating existing signatory in grid at index:', state.selectedRow);
      updateGridRowLocally(state.selectedRow, formData);
      
      // Auto-save to database immediately after updating
      console.log('[handleSave] Auto-saving updated signatory to database...');
      await saveAllSignatories();
      
    } else {
      console.warn('[AccountSignatories] Invalid state - mode:', state.mode, 'selectedRow:', state.selectedRow);
      showToast('Please use ALTER mode to modify existing records, or NEW mode to add records.', 'warning', 4000);
      showMessage('Please use ALTER mode to modify existing records.', 'warning');
    }
  };

  /**
   * Collect form data from input fields
   */
  const collectFormData = () => {
    const getValue = (id) => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };
    
    const getChecked = (id) => {
      const el = document.getElementById(id);
      return el ? el.checked : false;
    };
    
    const sigTypeSelect = document.getElementById('signatoryType');
    const sigTypeValue = sigTypeSelect ? sigTypeSelect.value : '';
    const sigTypeText = sigTypeSelect ? sigTypeSelect.options[sigTypeSelect.selectedIndex]?.text : '';
    
    console.log('[collectFormData] SignatoryType dropdown - value:', sigTypeValue, 'text:', sigTypeText);
    
    const mandatesSelect = document.getElementById('mandates');
    const mandatesValue = mandatesSelect ? mandatesSelect.value : '';
    
    // Get signatory name from hidden field (populated by search) or use ID as fallback
    const signatoryNameFromForm = getValue('signatoryName') || getValue('signatoryId');
    
    console.log('[collectFormData] SignatoryName from hidden field:', getValue('signatoryName'));
    console.log('[collectFormData] All form field values:', {
      signatoryId: getValue('signatoryId'),
      signatoryName: signatoryNameFromForm,
      groupId: getValue('groupId'),
      signatoryType: sigTypeValue,
      sequenceNo: getValue('sequenceNo'),
      limit: getValue('limit'),
      mandates: mandatesValue,
      isMandatory: getChecked('isMandatory')
    });
    
    // Determine if this is a new record or editing existing
    const isNewRecord = state.mode === 'ADD' || state.mode === 'NEW';
    
    // If editing existing record, get the name from the existing record
    const existingRecord = (!isNewRecord && state.selectedRow !== null && state.signatories[state.selectedRow]) 
      ? state.signatories[state.selectedRow] 
      : null;
    
    // If editing existing record, preserve the original data and merge changes
    let formData = {
      OurBranchID: state.context.OurBranchID || '',  // Add context fields for database
      AccountID: state.context.AccountID || '',      // Required for new signatories
      SignatoryID: getValue('signatoryId'),
      SignatoryName: existingRecord?.SignatoryName || signatoryNameFromForm, // Use existing name, or name from search, or ID as last resort
      GroupID: getValue('groupId'),
      SignatoryTypeID: sigTypeValue,  // Use the VALUE from dropdown (e.g., 'J', 'D', 'G')
      SignatoryType: sigTypeText,     // Use the TEXT for display (e.g., 'Joint Account Holder')
      ReferenceID: getValue('sequenceNo'),
      Limit: getValue('limit'),
      Mandates: mandatesValue,
      IsMandatory: getChecked('isMandatory'),
      _isNew: isNewRecord,
      _isModified: !isNewRecord
    };
    
    // CRITICAL: Add OpenedDate for new signatories (required by stored procedure)
    if (isNewRecord) {
      formData.OpenedDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      console.log('[collectFormData] ✅ Added OpenedDate for new signatory:', formData.OpenedDate);
    }
    
    console.log('[collectFormData] ✅ FormData with context fields:', formData);
    
    // If editing existing record, preserve fields not in the form
    if (existingRecord) {
      formData = {
        ...existingRecord, // Preserve all existing fields
        ...formData, // Override with form values
        _isNew: false,
        _isModified: true
      };
    }
    
    return formData;
  };

  /**
   * Validate form data
   */
  const validateFormData = (data) => {
    if (!data.SignatoryID) {
      return { isValid: false, message: 'Signatory ID is required.' };
    }
    if (!data.SignatoryTypeID) {
      return { isValid: false, message: 'Signatory Type is required.' };
    }
    
    // Check for duplicate SignatoryID in grid (for ADD/NEW mode only)
    if (state.mode === 'ADD' || state.mode === 'NEW') {
      const duplicate = state.signatories.find(s => 
        (s.SignatoryID || s.OperatorID) === data.SignatoryID
      );
      if (duplicate) {
        return { isValid: false, message: `Signatory "${data.SignatoryID}" already exists in the grid.` };
      }
    }
    
    return { isValid: true };
  };

  /**
   * Add new signatory to grid locally (staging before final save)
   */
  const addToGridLocally = (formData) => {
    // Calculate next ReferenceID - find max existing ReferenceID and add 1
    const maxReferenceID = state.signatories.reduce((max, sig) => {
      const refId = parseInt(sig.ReferenceID, 10) || 0;
      return refId > max ? refId : max;
    }, 0);
    const nextReferenceID = maxReferenceID + 1;
    
    // Assign ReferenceID to new signatory
    formData.ReferenceID = nextReferenceID;
    
    console.log('[addToGridLocally] Calculated ReferenceID:', nextReferenceID, 'for new signatory:', formData.SignatoryID);
    
    // Add to signatories array
    state.signatories.push(formData);
    
    // Track as pending change
    state.pendingChanges.push({
      action: 'add',
      data: formData,
      index: state.signatories.length - 1
    });
    
    // Re-render grid
    renderGrid(state.signatories);
    
    console.log('[AccountSignatories] Added to grid locally:', formData);
    console.log('[AccountSignatories] Pending changes:', state.pendingChanges);
  };

  /**
   * Update existing row in grid locally
   */
  const updateGridRowLocally = (index, formData) => {
    console.log('[updateGridRowLocally] STARTING UPDATE for index:', index);
    console.log('[updateGridRowLocally] BEFORE UPDATE - Grid row data:', JSON.stringify(state.signatories[index], null, 2));
    console.log('[updateGridRowLocally] Form data to merge:', JSON.stringify(formData, null, 2));
    
    // Preserve _isNew flag if it was already new
    const wasNew = state.signatories[index]?._isNew;
    const existingRecord = state.signatories[index] || {};
    
    // Update the row data - merge with existing to preserve all fields
    state.signatories[index] = {
      ...existingRecord, // Preserve all existing fields (PhotoID, SignID, Created/Modified fields, etc.)
      ...formData, // Override with new form values
      _isNew: wasNew,
      _isModified: !wasNew // Only mark as modified if it wasn't new
    };
    
    console.log('[updateGridRowLocally] AFTER UPDATE - Grid row data:', JSON.stringify(state.signatories[index], null, 2));
    console.log('[updateGridRowLocally] Row marked as _isModified:', state.signatories[index]._isModified);
    
    // Track as pending change (only if not already in pending as 'add')
    if (!wasNew) {
      const existingChangeIdx = state.pendingChanges.findIndex(c => c.index === index && c.action === 'edit');
      if (existingChangeIdx >= 0) {
        state.pendingChanges[existingChangeIdx].data = formData;
      } else {
        state.pendingChanges.push({
          action: 'edit',
          data: formData,
          index: index
        });
      }
    }
    
    console.log('[updateGridRowLocally] Pending changes:', state.pendingChanges.length);
    console.log('[updateGridRowLocally] Calling renderGrid to refresh display...');
    
    // Re-render grid to show changes
    renderGrid(state.signatories);
    
    console.log('[updateGridRowLocally] Grid re-rendered. Updated row should now show "MOD" badge.');
    
    // Re-select the updated row to keep it highlighted
    setTimeout(() => {
      if (tableBody) {
        const updatedRow = tableBody.querySelector(`tr[data-index="${index}"]`);
        if (updatedRow) {
          tableBody.querySelectorAll('tr.selected').forEach(r => r.classList.remove('selected'));
          updatedRow.classList.add('selected');
          console.log('[updateGridRowLocally] Re-selected updated row in grid');
        }
      }
    }, 50);
  };

  /**
   * Initialize default button behavior
   * - View button receives initial focus
   * - Enter key triggers View action (not Save)
   * - Tab order places View before Save
   */
  const initDefaultButton = () => {
    const viewBtn = document.querySelector('.btn-action[data-action="view"]');
    const saveBtn = document.querySelector('.btn-action[data-action="save"]');
    
    // Set tabindex to ensure View comes before Save in tab order
    if (viewBtn) {
      viewBtn.setAttribute('tabindex', '1');
    }
    if (saveBtn) {
      saveBtn.setAttribute('tabindex', '2');
    }
    
    // Focus on View button after a short delay to allow DOM to settle
    setTimeout(() => {
      if (viewBtn) {
        viewBtn.focus();
      }
    }, 100);
    
    // Handle Enter key to trigger View action (not Save)
    document.addEventListener('keydown', (e) => {
      // Only handle Enter key
      if (e.key !== 'Enter') return;
      
      // Don't intercept Enter in textareas (allow line breaks)
      if (e.target.tagName === 'TEXTAREA') return;
      
      // Don't intercept if user explicitly focuses a button
      if (e.target.classList.contains('asg-action-btn') || 
          e.target.classList.contains('asg-btn') ||
          e.target.classList.contains('asg-btn-lookup')) return;
      
      // Don't intercept if in a grid/table row (allow row selection)
      if (e.target.closest('tr[data-index]')) return;
      
      // Don't intercept if a modal is open
      if (document.querySelector('.modal.show')) return;
      
      // Trigger View button if it exists and is enabled
      if (viewBtn && !viewBtn.disabled) {
        e.preventDefault();
        viewBtn.click();
      }
    });
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  const init = async () => {
    console.log('[AccountSignatories] Initializing...');
    
    // IMPORTANT: Set initial mode to VIEW
    // When form opens, only EDIT, signature, photo, both buttons should be enabled
    state.mode = 'VIEW';
    state.selectedRow = null;
    
    // Bind event handlers first
    bindEvents();
    
    // Initialize BTS section toggle
    initBtsToggle();
    
    // Initialize search modal for signatory lookup
    initSearchModal();
    
    // Initialize default button behavior (View is default)
    initDefaultButton();
    
    // Set initial button states based on VIEW mode
    // This enables only: EDIT, signature, photo, both buttons
    // All others are disabled: NEW, ALTER, REMOVE, UPDATE, CLEAR, CLOSE, ADD, SAVE, CANCEL
    updateButtonStates();

    // Load dropdowns (these don't depend on context)
    showLoader(true);
    await loadDropdowns();
    
    // Try to get context from parent
    getContextFromParent();
    
    // If we have AccountID, load signatories immediately
    if (state.context.AccountID) {
      console.log('[AccountSignatories] AccountID available, loading signatories:', state.context.AccountID);
      await loadSignatories();
    } else {
      console.log('[AccountSignatories] No AccountID yet, waiting for context message...');
      renderGrid([]); // Show empty grid
      
      // Request context from parent
      requestContextFromParent();
    }
    
    showLoader(false);
    
    console.log('[AccountSignatories] Initialization complete.');
    console.log('[AccountSignatories] Context:', state.context);
  };

  /**
   * Request context from parent window
   */
  const requestContextFromParent = () => {
    try {
      const parent = window.parent;
      if (parent && parent !== window) {
        // Send a request to parent for context
        parent.postMessage({ type: 'accountSignatoriesReady', requestContext: true }, '*');
        console.log('[AccountSignatories] Sent context request to parent');
        
        // Also try to get context directly with a small delay (parent may still be initializing)
        setTimeout(() => {
          if (!state.context.AccountID) {
            getContextFromParent();
            if (state.context.AccountID) {
              console.log('[AccountSignatories] Got context on retry, loading signatories');
              loadSignatories();
            }
          }
        }, 500);
        
        // Another retry after 1.5 seconds
        setTimeout(() => {
          if (!state.context.AccountID) {
            getContextFromParent();
            if (state.context.AccountID) {
              console.log('[AccountSignatories] Got context on second retry, loading signatories');
              loadSignatories();
            }
          }
        }, 1500);
      }
    } catch (err) {
      console.warn('[AccountSignatories] Error requesting context:', err);
    }
  };

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
