/**
 * Voucher Printing Format Module
 * Matches Legacy UI: Format dropdown, Format Type dropdown, large textarea
 * Uses: p_GetVoucherFormats, p_EditVoucherFormats
 */
(function () {
  'use strict';

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  const state = {
    currentMode: 'VIEW', // VIEW, EDIT
    currentRecord: null,
    formatList: [],
    isLoading: false,
    context: {
      bankId: '00',
      branchId: '0101',
      operatorId: 'web_portal'
    }
  };

  // ============================================================================
  // DOM ELEMENTS
  // ============================================================================
  const elements = {
    // Form Fields
    formatId: document.getElementById('formatId'),
    voucherFormatTypeId: document.getElementById('voucherFormatTypeId'),
    voucherFormat: document.getElementById('voucherFormat'),

    // Buttons
    formatBtn: document.getElementById('formatBtn'),
    viewBtn: document.getElementById('viewBtn'),
    editBtn: document.getElementById('editBtn'),
    saveBtn: document.getElementById('saveBtn'),
    cancelBtn: document.getElementById('cancelBtn'),

    // Message Panel
    messagePanel: document.getElementById('messagePanel'),
    messageText: document.getElementById('messageText')
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Auto-resize textarea to fit content
   */
  function autoResizeTextarea(textarea) {
    if (!textarea) return;
    
    // Use setTimeout to ensure DOM is updated
    setTimeout(() => {
      // Reset height first
      textarea.style.height = 'auto';
      
      // Calculate new height based on content
      const scrollHeight = textarea.scrollHeight;
      const minHeight = 450;
      
      // Set height to fit content, with minimum
      const newHeight = Math.max(scrollHeight + 20, minHeight);
      textarea.style.height = newHeight + 'px';
      
      console.log('[VoucherPrintingFormat] Textarea resized to:', newHeight);
    }, 10);
  }

  /**
   * Show message in message panel
   */
  function showMessage(message, type = 'info') {
    if (!elements.messagePanel || !elements.messageText) {
      console.log(`[VoucherPrintingFormat] ${type}: ${message}`);
      return;
    }

    const iconMap = {
      success: 'bi-check-circle-fill',
      error: 'bi-exclamation-triangle-fill',
      warning: 'bi-exclamation-circle-fill',
      info: 'bi-info-circle-fill'
    };

    elements.messagePanel.className = `message-panel show ${type}`;
    elements.messagePanel.querySelector('i').className = `bi ${iconMap[type] || iconMap.info}`;
    elements.messageText.textContent = message;

    setTimeout(() => {
      elements.messagePanel.classList.remove('show');
    }, 4000);
  }

  /**
   * Set loading state
   */
  function setLoading(loading) {
    state.isLoading = loading;
    document.body.style.cursor = loading ? 'wait' : 'default';
  }

  /**
   * Get context from parent window if in iframe
   */
  function initializeContext() {
    try {
      if (window.parent && window.parent !== window) {
        const parentState = window.parent.AccountMaintenanceState;
        if (parentState) {
          state.context.branchId = parentState.OurBranchID || state.context.branchId;
          state.context.operatorId = parentState.OperatorID || state.context.operatorId;
        }
      }
    } catch (e) {
      console.log('[VoucherPrintingFormat] Could not access parent context');
    }
  }

  // ============================================================================
  // DATA OPERATIONS
  // ============================================================================

  /**
   * Load Format dropdown from system codes (TrxType, TrxTypeID, LoanProcessID)
   */
  async function loadFormatDropdown() {
    if (!elements.formatId) return;

    try {
      console.log('[VoucherPrintingFormat] Loading Format dropdown from system codes...');
      
      const LookupService = window.LookupService;
      if (!LookupService || typeof LookupService.getSystemCodeOptions !== 'function') {
        console.error('[VoucherPrintingFormat] LookupService not available');
        return;
      }

      const codeIds = ['TrxType', 'TrxTypeID', 'LoanProcessID'];
      const allOptions = [];

      for (const codeId of codeIds) {
        try {
          const options = await LookupService.getSystemCodeOptions(codeId);
          console.log(`[VoucherPrintingFormat] ${codeId} options:`, options);
          
          if (Array.isArray(options)) {
            options.forEach(opt => {
              allOptions.push({
                value: opt.value || '',
                label: opt.label || opt.value || '',
                source: codeId
              });
            });
          }
        } catch (e) {
          console.warn(`[VoucherPrintingFormat] Could not load ${codeId}:`, e);
        }
      }

      // Populate dropdown
      elements.formatId.innerHTML = '<option value="">--Select--</option>';
      allOptions.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        elements.formatId.appendChild(option);
      });

      console.log(`[VoucherPrintingFormat] Format dropdown populated with ${allOptions.length} options`);
      state.formatList = allOptions;

    } catch (error) {
      console.error('[VoucherPrintingFormat] Error loading format dropdown:', error);
      showMessage('Error loading formats', 'error');
    }
  }

  /**
   * Load Voucher Format Type dropdown from system code (VoucherFormatTypeID)
   * Uses Description field for display
   */
  async function loadVoucherFormatTypeDropdown() {
    if (!elements.voucherFormatTypeId) return;

    try {
      console.log('[VoucherPrintingFormat] Loading Voucher Format Type dropdown...');
      
      const LookupService = window.LookupService;
      if (!LookupService || typeof LookupService.getSystemCodeOptions !== 'function') {
        console.error('[VoucherPrintingFormat] LookupService not available');
        return;
      }

      const options = await LookupService.getSystemCodeOptions('VoucherFormatTypeID');
      console.log('[VoucherPrintingFormat] VoucherFormatTypeID options:', options);

      elements.voucherFormatTypeId.innerHTML = '<option value="">--Select--</option>';

      if (Array.isArray(options)) {
        options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value || '';
          option.textContent = opt.label || opt.value || '';
          elements.voucherFormatTypeId.appendChild(option);
        });

        console.log(`[VoucherPrintingFormat] Voucher Format Type dropdown populated with ${options.length} options`);
      }

    } catch (error) {
      console.error('[VoucherPrintingFormat] Error loading voucher format type dropdown:', error);
    }
  }

  /**
   * Load voucher formats into dropdown (legacy SP method - kept for reference)
   */
  async function loadFormats() {
    const service = window.VoucherFormatService;
    if (!service) {
      console.error('[VoucherPrintingFormat] VoucherFormatService not available');
      return;
    }

    try {
      setLoading(true);

      const requestData = {
        BankID: state.context.bankId,
        OurBranchID: state.context.branchId,
        FormatID: '',
        OperatorID: state.context.operatorId
      };

      console.log('[VoucherPrintingFormat] Loading formats...');
      const response = await service.getVoucherFormats(requestData);
      console.log('[VoucherPrintingFormat] Formats response:', response);

      if (response && response.success) {
        const formats = response.data || response.Details || [];
        state.formatList = formats;
        populateFormatDropdown(formats);
        showMessage(`Loaded ${formats.length} format(s)`, 'success');
      } else {
        showMessage(response?.message || 'Failed to load formats', 'error');
      }
    } catch (error) {
      console.error('[VoucherPrintingFormat] Error loading formats:', error);
      showMessage('Error loading formats', 'error');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Populate format dropdown
   */
  function populateFormatDropdown(formats) {
    if (!elements.formatId) return;

    elements.formatId.innerHTML = '<option value="">--Select--</option>';
    
    formats.forEach(format => {
      const option = document.createElement('option');
      option.value = format.FormatID || '';
      option.textContent = format.FormatName || format.FormatID || '';
      option.dataset.format = JSON.stringify(format);
      elements.formatId.appendChild(option);
    });

    console.log(`[VoucherPrintingFormat] Format dropdown populated with ${formats.length} options`);
  }

  /**
   * Load format content when selected
   * Since Format dropdown now comes from system codes, just update state
   */
  function loadSelectedFormat() {
    const selectedOption = elements.formatId.selectedOptions[0];
    if (!selectedOption || !selectedOption.value) {
      elements.voucherFormat.value = '';
      state.currentRecord = null;
      return;
    }

    // Store selected format info
    state.currentRecord = {
      FormatID: selectedOption.value,
      FormatName: selectedOption.textContent
    };
    
    console.log('[VoucherPrintingFormat] Selected format:', state.currentRecord);
    showMessage(`Format selected: ${selectedOption.textContent}`, 'info');
  }

  /**
   * View/Load voucher format from database
   * Calls p_GetVoucherFormats with the selected FormatID
   */
  async function viewFormat() {
    if (!elements.formatId.value) {
      showMessage('Please select a Format first', 'warning');
      return;
    }

    const service = window.VoucherFormatService;
    if (!service) {
      showMessage('VoucherFormatService not available', 'error');
      return;
    }

    try {
      setLoading(true);

      const requestData = {
        BankID: state.context.bankId,
        OurBranchID: state.context.branchId,
        FormatID: elements.formatId.value,
        OperatorID: state.context.operatorId
      };

      console.log('[VoucherPrintingFormat] Viewing format:', requestData);
      const response = await service.getVoucherFormats(requestData);
      console.log('[VoucherPrintingFormat] FULL RESPONSE:', JSON.stringify(response, null, 2));

      if (response && response.success) {
        // The actual format data could be in different locations
        let format = null;
        
        // Try response.data.Details first (nested structure)
        if (response.data && response.data.Details && Array.isArray(response.data.Details) && response.data.Details.length > 0) {
          console.log('[VoucherPrintingFormat] response.data.Details[0]:', JSON.stringify(response.data.Details[0], null, 2));
          format = response.data.Details[0];
        }
        // Try response.Details (direct)
        else if (response.Details && Array.isArray(response.Details) && response.Details.length > 0) {
          console.log('[VoucherPrintingFormat] response.Details[0]:', JSON.stringify(response.Details[0], null, 2));
          // Check if it has VoucherFormat field
          if (response.Details[0].VoucherFormat !== undefined) {
            format = response.Details[0];
          }
        }
        
        console.log('[VoucherPrintingFormat] Selected format record:', format);
        
        if (format && format.VoucherFormat) {
          console.log('[VoucherPrintingFormat] Format keys:', Object.keys(format));
          state.currentRecord = format;
          
          // Populate the textarea with the format content
          elements.voucherFormat.value = format.VoucherFormat;
          
          // Auto-resize textarea to fit content
          autoResizeTextarea(elements.voucherFormat);
          
          console.log('[VoucherPrintingFormat] VoucherFormat content length:', format.VoucherFormat.length);
          
          // Set the voucher format type if available
          if (format.VoucherFormatTypeID && elements.voucherFormatTypeId) {
            elements.voucherFormatTypeId.value = format.VoucherFormatTypeID;
          }
          
          showMessage('Format loaded successfully', 'success');
        } else {
          elements.voucherFormat.value = '';
          autoResizeTextarea(elements.voucherFormat);
          showMessage('No format content found for this selection', 'info');
        }
      } else {
        showMessage(response?.message || 'Failed to load format', 'error');
      }
    } catch (error) {
      console.error('[VoucherPrintingFormat] Error viewing format:', error);
      showMessage('Error loading format', 'error');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Generate format template based on type
   * M = Multiple Rows, S = Single Row (from VoucherFormatTypeID system code)
   */
  function generateFormat() {
    const formatType = elements.voucherFormatTypeId.value;
    
    if (!formatType) {
      showMessage('Please select a Voucher Format Type first', 'warning');
      return;
    }

    const templates = {
      'S': `╔════════════════════════════════════════════════════════════════════════╗
║                          VOUCHER PRINTING FORMAT                       ║
║                              SINGLE ROW                                ║
╠════════════════════════════════════════════════════════════════════════╣
║ Date: [DATE]                                    Voucher No: [VOUCHER]  ║
║ Account: [ACCOUNT]                              Branch: [BRANCH]       ║
║ Description: [DESCRIPTION]                                             ║
║ Debit: [DEBIT]                                  Credit: [CREDIT]       ║
╚════════════════════════════════════════════════════════════════════════╝`,
      
      'M': `╔════════════════════════════════════════════════════════════════════════╗
║                          VOUCHER PRINTING FORMAT                       ║
║                              MULTI ROW                                 ║
╠════════════════════════════════════════════════════════════════════════╣
║ Voucher No: [VOUCHER]                           Date: [DATE]           ║
║ Branch: [BRANCH]                                                       ║
╠════════════════════════════════════════════════════════════════════════╣
║ Line  Account          Description              Debit        Credit    ║
╠════════════════════════════════════════════════════════════════════════╣
║ [1]   [ACCOUNT1]       [DESC1]                 [DEBIT1]     [CREDIT1]  ║
║ [2]   [ACCOUNT2]       [DESC2]                 [DEBIT2]     [CREDIT2]  ║
║ [3]   [ACCOUNT3]       [DESC3]                 [DEBIT3]     [CREDIT3]  ║
╠════════════════════════════════════════════════════════════════════════╣
║ TOTAL:                                          [TOTAL_DR]  [TOTAL_CR] ║
╚════════════════════════════════════════════════════════════════════════╝`
    };

    elements.voucherFormat.value = templates[formatType] || templates['S'];
    autoResizeTextarea(elements.voucherFormat);
    showMessage('Format template generated', 'success');
  }

  /**
   * Save voucher format
   */
  async function saveFormat() {
    const service = window.VoucherFormatService;
    if (!service) {
      showMessage('Service not available', 'error');
      return;
    }

    if (!elements.formatId.value) {
      showMessage('Please select a format to save', 'warning');
      return;
    }

    if (!elements.voucherFormatTypeId.value) {
      showMessage('Please select a Voucher Format Type', 'warning');
      return;
    }

    try {
      setLoading(true);

      const selectedOption = elements.formatId.selectedOptions[0];
      const formatName = selectedOption ? selectedOption.textContent : elements.formatId.value;

      const requestData = {
        BankID: state.context.bankId,
        FormatID: elements.formatId.value,
        FormatName: formatName,
        VoucherFormatTypeID: elements.voucherFormatTypeId.value,
        VoucherFormat: elements.voucherFormat.value || '',
        ModifiedBy: state.context.operatorId,
        ModifiedOn: new Date().toISOString(),
        SupervisedBy: '',
        UpdateCount: state.currentRecord?.UpdateCount || 0
      };

      console.log('[VoucherPrintingFormat] Saving format:', requestData);
      const response = await service.editVoucherFormat(requestData);
      console.log('[VoucherPrintingFormat] Save response:', response);

      if (response && response.success) {
        showMessage('Format saved successfully', 'success');
        setViewMode();
        await loadFormats();
      } else {
        showMessage(response?.message || 'Failed to save format', 'error');
      }
    } catch (error) {
      console.error('[VoucherPrintingFormat] Error saving format:', error);
      showMessage('Error saving format', 'error');
    } finally {
      setLoading(false);
    }
  }

  // ============================================================================
  // MODE MANAGEMENT
  // ============================================================================

  /**
   * Set view mode - but keep textarea editable for viewing/copying
   */
  function setViewMode() {
    state.currentMode = 'VIEW';
    // Keep textarea editable so user can view and adjust
    elements.voucherFormat.readOnly = false;
    elements.voucherFormat.style.backgroundColor = '#ffffff';
    elements.formatId.disabled = false;
    elements.voucherFormatTypeId.disabled = false;
    
    updateButtonStates();
  }

  /**
   * Set edit mode
   */
  function setEditMode() {
    if (!elements.formatId.value) {
      showMessage('Please select a format to edit', 'warning');
      return;
    }

    state.currentMode = 'EDIT';
    elements.voucherFormat.readOnly = false;
    elements.voucherFormat.style.backgroundColor = '#FFFEF0'; // Light yellow for edit mode
    elements.formatId.disabled = false;
    elements.voucherFormatTypeId.disabled = false;
    
    updateButtonStates();
    showMessage('Edit mode - Modify the format and click Save', 'info');
  }

  /**
   * Update button states based on current mode
   */
  function updateButtonStates() {
    // All buttons enabled - user can format, view, edit, save anytime
    if (elements.formatBtn) elements.formatBtn.disabled = false;
    if (elements.viewBtn) elements.viewBtn.disabled = false;
    if (elements.editBtn) elements.editBtn.disabled = false;
    if (elements.saveBtn) elements.saveBtn.disabled = false;
    if (elements.cancelBtn) elements.cancelBtn.disabled = false;
  }

  /**
   * Cancel operation
   */
  function cancelOperation() {
    if (state.currentMode === 'EDIT') {
      if (confirm('Discard changes?')) {
        setViewMode();
        // Reload the selected format
        if (elements.formatId.value) {
          loadSelectedFormat();
        }
      }
    } else {
      // Reset form
      elements.formatId.value = '';
      elements.voucherFormatTypeId.value = '';
      elements.voucherFormat.value = '';
      state.currentRecord = null;
      showMessage('Form reset', 'info');
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Wire up event listeners
   */
  function wireEventHandlers() {
    // Format dropdown change
    elements.formatId?.addEventListener('change', loadSelectedFormat);

    // Action buttons
    elements.formatBtn?.addEventListener('click', generateFormat);
    elements.viewBtn?.addEventListener('click', viewFormat);  // Load format from database
    elements.editBtn?.addEventListener('click', setEditMode);
    elements.saveBtn?.addEventListener('click', saveFormat);
    elements.cancelBtn?.addEventListener('click', cancelOperation);

    // Auto-resize textarea on input
    elements.voucherFormat?.addEventListener('input', () => {
      autoResizeTextarea(elements.voucherFormat);
    });

    // Section toggles
    document.querySelectorAll('[data-section-toggle]').forEach(header => {
      header.addEventListener('click', () => {
        const section = header.closest('.form-section');
        const content = section.querySelector('[data-section-content]');
        const btn = header.querySelector('.section-toggle-btn');
        const icon = btn?.querySelector('i');

        if (content) content.classList.toggle('collapsed');
        if (icon) {
          icon.classList.toggle('bi-chevron-up');
          icon.classList.toggle('bi-chevron-down');
        }
      });
    });
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize module
   */
  async function initialize() {
    console.log('[VoucherPrintingFormat] Initializing...');

    initializeContext();
    wireEventHandlers();
    
    // Load dropdowns from system codes
    setLoading(true);
    await Promise.all([
      loadFormatDropdown(),           // Loads TrxType, TrxTypeID, LoanProcessID
      loadVoucherFormatTypeDropdown() // Loads VoucherFormatTypeID (Description)
    ]);
    setLoading(false);
    
    setViewMode();

    console.log('[VoucherPrintingFormat] Initialized with context:', state.context);
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();

