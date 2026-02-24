/**
 * Account Sweeping - Enterprise UI Controller
 * Loads sweeping configuration on page load following Account Maintenance patterns
 */
(() => {
  'use strict';

  // ============================================================================
  // DOM REFERENCES
  // ============================================================================
  const windowEl = document.querySelector('.window') || document.querySelector('.de-window');
  const form = document.querySelector('[data-main-form]') || document.querySelector('.form-card') || document.querySelector('.de-card__body');
  const tableBody = document.querySelector('#sweepingGrid tbody');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const statusBar = document.querySelector('.de-status-bar');
  const messageBar = document.querySelector('.de-message-bar');
  const recordCountEl = document.getElementById('recordCount');

  // ============================================================================
  // STATE
  // ============================================================================
  const state = {
    mode: 'INIT', // INIT, VIEW, ADD, EDIT
    sweepingRecords: [],
    selectedRow: null,
    selectedRecord: null,
    isLoading: false,
    context: {
      OurBranchID: '',
      AccountID: '',
      OperatorID: ''
    },
    searchModal: null
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
    if (statusBar) {
      statusBar.textContent = text;
    }
  };

  const showMessage = (msg, type = 'info') => {
    if (!messageBar) return;
    
    messageBar.classList.remove('error', 'success', 'warning');
    if (type === 'error') messageBar.classList.add('error');
    else if (type === 'success') messageBar.classList.add('success');
    else if (type === 'warning') messageBar.classList.add('warning');
    
    const textEl = messageBar.querySelector('span');
    if (textEl) textEl.textContent = msg;
    messageBar.classList.add('show');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      messageBar.classList.remove('show');
    }, 5000);
  };

  const updateRecordCount = (count) => {
    if (recordCountEl) {
      recordCountEl.textContent = `${count} record${count !== 1 ? 's' : ''}`;
    }
  };

  const toggleLookupButtons = (enabled) => {
    document.querySelectorAll('.de-btn-lookup').forEach((btn) => {
      btn.disabled = !enabled;
    });
  };

  const clearForm = () => {
    if (!form) return;
    form.querySelectorAll('input[type="text"]').forEach((el) => (el.value = ''));
    form.querySelectorAll('select').forEach((el) => (el.selectedIndex = 0));
    form.querySelectorAll('input[type="checkbox"]').forEach((el) => (el.checked = false));
    state.selectedRow = null;
    state.selectedRecord = null;
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
          console.log('[AccountSweeping] Parent AccountMaintenanceState:', parentState);
          
          state.context.OurBranchID = parentState.OurBranchID || '';
          state.context.AccountID = parentState.AccountID || '';
          state.context.OperatorID = parentState.OperatorID || '';
        } else {
          console.warn('[AccountSweeping] Parent AccountMaintenanceState not found');
        }
        
        // Fallback: try to read from parent's AuthService session
        if (!state.context.OurBranchID || !state.context.OperatorID) {
          try {
            const parentSession = parent.AuthService?.getSession?.();
            if (parentSession) {
              console.log('[AccountSweeping] Parent AuthService session:', parentSession);
              state.context.OurBranchID = state.context.OurBranchID || parentSession.branchID || parentSession.BranchID || parentSession.OurBranchID || '';
              state.context.OperatorID = state.context.OperatorID || parentSession.operatorID || parentSession.OperatorID || parentSession.operatorId || '';
            }
          } catch (authErr) {
            console.warn('[AccountSweeping] Could not read parent AuthService:', authErr);
          }
        }
      }
      
      // Local AuthService fallback
      if (!state.context.OurBranchID || !state.context.OperatorID) {
        try {
          const session = window.AuthService?.getSession?.();
          if (session) {
            console.log('[AccountSweeping] Local AuthService session:', session);
            state.context.OurBranchID = state.context.OurBranchID || session.branchID || session.BranchID || session.OurBranchID || '';
            state.context.OperatorID = state.context.OperatorID || session.operatorID || session.OperatorID || session.operatorId || '';
          }
        } catch (authErr) {
          console.warn('[AccountSweeping] Could not read local AuthService:', authErr);
        }
      }
      
      // Session storage fallback
      if (!state.context.OurBranchID || !state.context.OperatorID) {
        state.context.OurBranchID = state.context.OurBranchID || sessionStorage.getItem('OurBranchID') || sessionStorage.getItem('BranchID') || '';
        state.context.AccountID = state.context.AccountID || sessionStorage.getItem('AccountID') || '';
        state.context.OperatorID = state.context.OperatorID || sessionStorage.getItem('OperatorID') || '';
      }
      
      console.log('[AccountSweeping] Final context:', state.context);
      
    } catch (err) {
      console.error('[AccountSweeping] Error getting context from parent:', err);
    }
  };

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  const loadSweepingData = async () => {
    const { OurBranchID, AccountID, OperatorID } = state.context;
    
    if (!OurBranchID || !AccountID || !OperatorID) {
      console.warn('[AccountSweeping] Missing required context for loading data', state.context);
      showMessage('Missing Branch ID, Account ID, or Operator ID. Please select an account first.', 'warning');
      return;
    }
    
    showLoader(true);
    
    try {
      const accountservice = window.accountservice || window.parent?.accountservice;
      
      if (!accountservice?.getAccountSweeping) {
        throw new Error('accountservice.getAccountSweeping is not available');
      }
      
      // Build payload from context without hardcoding
      const payload = {
        OurBranchID,
        AccountID,
        OperatorID
      };
      
      console.log('[AccountSweeping] Loading with payload:', payload);
      
      const result = await accountservice.getAccountSweeping(payload);
      console.log('[AccountSweeping] API result:', result);
      
      if (result && (result.success || result.code === '00' || result.Success === true)) {
        showMessage('Sweeping data loaded successfully.', 'success');
      }
      
    } catch (error) {
      console.error('[AccountSweeping] Error loading data:', error);
      showMessage('Failed to load sweeping data: ' + error.message, 'error');
    } finally {
      showLoader(false);
    }
  };

  // ============================================================================
  // GRID RENDERING
  // ============================================================================
  const renderEmptyGrid = () => {
    if (!tableBody) return;
    tableBody.innerHTML = '<tr class="de-table__empty"><td colspan="5">No records to display.</td></tr>';
    updateRecordCount(0);
  };

  const renderGrid = (records) => {
    if (!tableBody) return;
    
    if (!records || records.length === 0) {
      renderEmptyGrid();
      return;
    }
    
    // Helper to find value case-insensitively
    const findValue = (record, ...keys) => {
      for (const key of keys) {
        const found = Object.keys(record).find(k => k.toLowerCase() === key.toLowerCase());
        if (found && record[found] !== undefined && record[found] !== null) {
          return record[found];
        }
      }
      return '—';
    };
    
    // Format currency values
    const formatAmount = (value) => {
      if (value === null || value === undefined || value === '—') return '—';
      const num = parseFloat(value);
      if (isNaN(num)) return value;
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    
    tableBody.innerHTML = records.map((record, idx) => {
      const sweepType = findValue(record, 'SweepType', 'SweepTypeID', 'Type', 'TransferType');
      const frequency = findValue(record, 'Frequency', 'FrequencyID', 'FrequencyType');
      const targetAccount = findValue(record, 'TargetAccountID', 'ToAccountID', 'DestinationAccount', 'TransferToAccount');
      const minBalance = formatAmount(findValue(record, 'MinimumBalance', 'MinBalance', 'ThresholdAmount', 'MinThreshold'));
      const status = findValue(record, 'Status', 'IsActive', 'Active');
      
      // Format status
      let statusDisplay = status;
      if (status === true || status === 'true' || status === '1' || status === 'Y') {
        statusDisplay = '<span class="status-active">Active</span>';
      } else if (status === false || status === 'false' || status === '0' || status === 'N') {
        statusDisplay = '<span class="status-inactive">Inactive</span>';
      }
      
      return `
        <tr data-index="${idx}" class="de-table__row">
          <td>${sweepType}</td>
          <td>${frequency}</td>
          <td>${targetAccount}</td>
          <td class="text-right">${minBalance}</td>
          <td>${statusDisplay}</td>
        </tr>
      `;
    }).join('');
    
    // Add row click handlers
    tableBody.querySelectorAll('tr[data-index]').forEach(row => {
      row.addEventListener('click', () => selectRow(row));
      row.addEventListener('dblclick', () => {
        selectRow(row);
        populateFormFromSelected();
      });
    });
  };

  const selectRow = (row) => {
    // Remove previous selection
    tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
    
    // Select new row
    row.classList.add('selected');
    state.selectedRow = row;
    
    const idx = parseInt(row.dataset.index, 10);
    state.selectedRecord = state.sweepingRecords[idx] || null;
    
    // Update button states based on selection
    updateButtonStates();
  };

  const populateFormFromSelected = () => {
    if (!state.selectedRecord || !form) return;
    
    const record = state.selectedRecord;
    
    // Helper to find value
    const findValue = (record, ...keys) => {
      for (const key of keys) {
        const found = Object.keys(record).find(k => k.toLowerCase() === key.toLowerCase());
        if (found && record[found] !== undefined && record[found] !== null) {
          return record[found];
        }
      }
      return '';
    };
    
    // Populate form fields
    const setField = (id, value) => {
      const el = document.getElementById(id);
      if (el) {
        if (el.type === 'checkbox') {
          el.checked = value === true || value === 'true' || value === '1' || value === 'Y';
        } else {
          el.value = value ?? '';
        }
      }
    };
    
    setField('sweepType', findValue(record, 'SweepType', 'SweepTypeID'));
    setField('frequency', findValue(record, 'Frequency', 'FrequencyID'));
    setField('targetAccountId', findValue(record, 'TargetAccountID', 'ToAccountID'));
    setField('targetAccountName', findValue(record, 'TargetAccountName', 'ToAccountName'));
    setField('minimumBalance', findValue(record, 'MinimumBalance', 'MinBalance'));
    setField('effectiveDate', findValue(record, 'EffectiveDate', 'StartDate'));
    setField('expiryDate', findValue(record, 'ExpiryDate', 'EndDate'));
    setField('isActive', findValue(record, 'IsActive', 'Status', 'Active'));
    
    // Populate BTS audit fields
    const setAuditField = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value || '—';
    };
    
    setAuditField('MakerID', findValue(record, 'MakerID', 'CreatedBy'));
    setAuditField('MakerDT', findValue(record, 'MakerDT', 'CreatedOn'));
    setAuditField('CheckerID', findValue(record, 'CheckerID', 'ApprovedBy'));
    setAuditField('CheckerDT', findValue(record, 'CheckerDT', 'ApprovedOn'));
    setAuditField('ModifierID', findValue(record, 'ModifierID', 'ModifiedBy'));
    setAuditField('ModifierDT', findValue(record, 'ModifierDT', 'ModifiedOn'));
  };

  // ============================================================================
  // EDIT MODE MANAGEMENT - Following BUTTON GUIDE.MD rules
  // ============================================================================
  const buttons = {
    view: document.querySelector('[data-action="view"]'),
    add: document.querySelector('[data-action="add"]'),
    edit: document.querySelector('[data-action="edit"]'),
    delete: document.querySelector('[data-action="delete"]'),
    save: document.querySelector('[data-action="save"]'),
    cancel: document.querySelector('[data-action="cancel"]'),
    close: document.querySelector('[data-action="close"]'),
    refresh: document.querySelector('[data-action="refresh"]')
  };

  const editableSelector = '.de-input:not([readonly]):not([disabled]), .de-select:not([disabled]), .de-checkbox';
  const getEditableControls = () => Array.from(form?.querySelectorAll(editableSelector) || []);

  const snapshot = new Map();
  const snapshotValues = () => {
    snapshot.clear();
    getEditableControls().forEach((el) => {
      const key = el.name || el.id;
      snapshot.set(key, el.type === 'checkbox' ? el.checked : el.value);
    });
  };

  const restoreValues = () => {
    getEditableControls().forEach((el) => {
      const key = el.name || el.id;
      if (!snapshot.has(key)) return;
      if (el.type === 'checkbox') {
        el.checked = snapshot.get(key);
      } else {
        el.value = String(snapshot.get(key) ?? '');
      }
    });
  };

  /**
   * Update button states based on current state
   * On load: Only Add button active
   * On Add: Enable Save, Cancel, and controls
   * On Edit: Enable Save, Cancel, and controls
   */
  const updateButtonStates = () => {
    const isEditing = state.mode === 'ADD' || state.mode === 'EDIT';
    const initMode = state.mode === 'INIT';

    // On load: Only Add should be active
    if (buttons.view) buttons.view.disabled = true; // Always disabled
    if (buttons.add) buttons.add.disabled = isEditing ? true : false;
    if (buttons.edit) buttons.edit.disabled = true; // Always disabled
    if (buttons.delete) buttons.delete.disabled = true; // Always disabled
    if (buttons.save) buttons.save.disabled = !isEditing;
    if (buttons.cancel) buttons.cancel.disabled = !isEditing;

    if (isEditing) {
      updateStatus(`${state.mode} mode`);
    } else {
      updateStatus('Ready');
    }
  };

  const setEditMode = (isEditing, modeType = null) => {
    state.mode = isEditing ? (modeType || 'ADD') : 'VIEW';
    getEditableControls().forEach((el) => (el.disabled = !isEditing));
    toggleLookupButtons(isEditing);
    updateButtonStates();
  };

  // ============================================================================
  // SAVE FUNCTIONALITY
  // ============================================================================
  const validateForm = () => {
    const accountTransferId = document.getElementById('accountTransferId')?.value?.trim();
    if (!accountTransferId) {
      return { ok: false, message: 'Account Transfer is required.' };
    }

    return { ok: true };
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    return now.toISOString();
  };

  const saveRecord = async () => {
    const validation = validateForm();
    if (!validation.ok) {
      showMessage(validation.message, 'error');
      return;
    }

    const { OurBranchID, AccountID, OperatorID } = state.context;

    if (!OurBranchID || !AccountID) {
      showMessage('Missing Branch ID or Account ID.', 'error');
      return;
    }

    const getValue = (id) => {
      const el = document.getElementById(id);
      if (!el) return '';
      return el.value?.trim();
    };

    const currentDateTime = getCurrentDateTime();
    const newRecord = state.mode === 'ADD' ? 1 : 0;

    const payload = {
      OurBranchID,
      AccountID,
      AccountLimit: getValue('maxThreshold') || '0',
      AccountThreshold: getValue('minThreshold') || '0',
      AmtDenomination: getValue('sweepingDenomination') || '0',
      TransferAccount: getValue('accountTransferId'),
      StartDate: getValue('startDate') || currentDateTime,
      EndDate: getValue('endDate') || currentDateTime,
      LastSwpDate: getValue('lastSweepingDate') || currentDateTime,
      CreatedBy: OperatorID,
      CreatedOn: currentDateTime,
      ModifiedBy: OperatorID,
      ModifiedOn: currentDateTime,
      SupervisedBy: OperatorID,
      NewRecord: newRecord
    };

    showLoader(true);

    try {
      const accountservice = window.accountservice || window.parent?.accountservice;

      if (!accountservice?.addEditAccountSweeping) {
        throw new Error('accountservice.addEditAccountSweeping is not available');
      }

      console.log('[AccountSweeping] Saving with payload:', payload);

      const result = await accountservice.addEditAccountSweeping(payload);
      console.log('[AccountSweeping] Save result:', result);

      if (result && (result.success || result.code === '00' || result.Success === true)) {
        showMessage('Sweeping configuration saved successfully.', 'success');
        snapshotValues();
        setEditMode(false);
        clearForm();
      } else {
        const errorMsg = result?.message || result?.Message || 'Save failed';
        throw new Error(errorMsg);
      }

    } catch (error) {
      console.error('[AccountSweeping] Error saving:', error);
      showMessage('Failed to save: ' + error.message, 'error');
    } finally {
      showLoader(false);
    }
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const initEventHandlers = () => {
    // Title bar buttons (refresh, maximize, close)
    document.querySelectorAll('.de-title-btn[data-action], .am-btn[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        switch (action) {
          case 'refresh':
            loadSweepingData();
            break;
          case 'maximize':
            const isMaximized = windowEl?.classList.toggle('de-window--maximized');
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

    // Lookup buttons - wire kairo-account-control lookup
    document.querySelectorAll('.kairo-account-control__lookup, [data-kairo-account-control] .btn-lookup').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (state.mode !== 'ADD' && state.mode !== 'EDIT') return;
        openSearchModal();
      });
    });

    // Action buttons
    buttons.view?.addEventListener('click', () => {
      loadSweepingData();
    });

    buttons.add?.addEventListener('click', () => {
      snapshotValues();
      clearForm();
      state.selectedRecord = null;
      setEditMode(true, 'ADD');
      document.getElementById('accountTransferId')?.focus();
    });

    buttons.cancel?.addEventListener('click', () => {
      restoreValues();
      state.mode = 'VIEW';
      getEditableControls().forEach((el) => (el.disabled = true));
      toggleLookupButtons(false);
      updateButtonStates();
    });

    buttons.save?.addEventListener('click', saveRecord);

    buttons.close?.addEventListener('click', postClose);

    // BTS toggle
    const btsHeader = document.getElementById('btsHeader');
    const btsBody = document.getElementById('btsBody');
    if (btsHeader && btsBody) {
      btsHeader.addEventListener('click', () => {
        btsBody.classList.toggle('collapsed');
        const icon = btsHeader.querySelector('.de-bts-toggle i');
        if (icon) {
          icon.classList.toggle('bi-chevron-up');
          icon.classList.toggle('bi-chevron-down');
        }
      });
    }
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  const initSearchModal = () => {
    if (!window.SearchModal || !window.SearchService) return;
    state.searchModal = new window.SearchModal(window.SearchService);
  };

  const openSearchModal = () => {
    if (!state.searchModal) return;
    state.searchModal.open({
      searchId: 'AccountActiveID',
      onSelect: (record) => {
        const acctId = record.AccountID || record.AccountNo || record.AccountNumber || record.ClientAccountID || '';
        const acctName = record.AccountName || record.AccountTitle || record.AccountDescription || '';
        const idEl = document.getElementById('accountTransferId');
        const nameEl = document.getElementById('accountTransferName');
        if (idEl) idEl.value = acctId;
        if (nameEl) nameEl.value = acctName;
      }
    });
  };

  const init = () => {
    console.log('[AccountSweeping] Initializing...');
    
    // Get context from parent
    getContextFromParent();
    
    // Initialize search modal
    initSearchModal();

    // Initialize event handlers
    initEventHandlers();
    
    // Set initial state
    state.mode = 'INIT';
    state.selectedRecord = null;
    snapshotValues();

    getEditableControls().forEach((el) => (el.disabled = true));
    toggleLookupButtons(false);

    updateButtonStates();

    // Load sweeping data on page load with parent context
    loadSweepingData();
    
    console.log('[AccountSweeping] Initialization complete');
  };

  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
