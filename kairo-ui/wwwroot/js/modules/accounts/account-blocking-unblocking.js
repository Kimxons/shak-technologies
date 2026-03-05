(function () {
  // ============================================
  // CONSTANTS
  // ============================================
  const MODULE_TYPE_ID = "A"; // 'A' = Account (SystemSubID letter code)
  const MODULE_ID = 1420;     // Account Blocking module (SmallInt)

  // ============================================
  // STATE VARIABLES
  // ============================================
  let formMode = 'view'; // 'view', 'edit'
  let currentRecord = null;
  let isBlocked = false; // Track if account is currently blocked
  let currentUpdateCount = 0; // Track UpdateCount for edit/delete concurrency
  let blockingDetails = []; // Store all blocking/unblocking history records

  // ============================================
  // UTILITIES
  // ============================================
  function getParentFieldValue(fieldId) {
    try {
      const parentForm = window.parent.document;
      const field = parentForm.getElementById(fieldId);
      return field ? field.value : null;
    } catch (_) {
      return null;
    }
  }

  function getOperatorId() {
    return localStorage.getItem('OperatorID') || window.Environment?.UserID || 'KAIROADMIN';
  }

  function getOurBranchId() {
    return localStorage.getItem('OurBranchID') || window.Environment?.OurBranchID || '0603';
  }

  function formatDateTime(date) {
    if (!date) date = new Date();
    if (typeof date === 'string') date = new Date(date);
    const pad = n => n.toString().padStart(2, '0');
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function showMessage(message, type = 'info') {
    const toastType = type === 'danger' ? 'error' : type;
    
    // Show local toast in this form
    const container = document.getElementById('toastContainer');
    if (container) {
      // Create toast element
      const toast = document.createElement('div');
      toast.className = `blocking-toast blocking-toast--${toastType}`;
      
      // Icon based on type
      const iconMap = {
        success: 'bi-check-circle-fill',
        error: 'bi-exclamation-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
      };
      const iconClass = iconMap[toastType] || iconMap.info;
      
      toast.innerHTML = `
        <i class="bi ${iconClass} blocking-toast__icon"></i>
        <span class="blocking-toast__message">${message}</span>
        <button type="button" class="blocking-toast__close" aria-label="Close">
          <i class="bi bi-x"></i>
        </button>
      `;
      
      // Close button handler
      const closeBtn = toast.querySelector('.blocking-toast__close');
      closeBtn.addEventListener('click', () => {
        toast.remove();
      });
      
      // Add to container
      container.appendChild(toast);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (toast.parentNode) {
          toast.style.animation = 'toastSlideIn 0.3s ease-out reverse';
          setTimeout(() => toast.remove(), 300);
        }
      }, 5000);
      
      console.log(`[Blocking/Unblocking] Toast (${toastType}): ${message}`);
      return;
    }
    
    // Fallback: console log
    console.log(`[Blocking/Unblocking] Message (${type}): ${message}`);
  }

  function highlightField(fieldId, isError) {
    const field = document.getElementById(fieldId);
    if (field) {
      if (isError) {
        field.style.borderColor = '#dc3545';
        field.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
      } else {
        field.style.borderColor = '';
        field.style.boxShadow = '';
      }
    }
  }

  function showLoading(isLoading) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.hidden = !isLoading;
  }
  // ============================================
  // FORM MODE MANAGEMENT
  // ============================================
  function setFormMode(mode) {
    formMode = mode;
    const form = document.querySelector('form');
    const inputs = form?.querySelectorAll('input, select, textarea');
    
    if (mode === 'view') {
      inputs?.forEach(input => {
        input.disabled = true;
      });
      updateButtonStates({ edit: true, save: false, cancel: false });
      clearFieldHighlights();
    } else if (mode === 'edit') {
      inputs?.forEach(input => {
        input.disabled = false;
      });
      updateButtonStates({ edit: false, save: true, cancel: true });
      clearFieldHighlights();
      // Load appropriate reasons dropdown based on blocking state
      loadReasonsDropdown();
    }
  }

  // ============================================
  // DROPDOWN LOADING
  // ============================================
  async function loadReasonsDropdown() {
    const LookupService = window.LookupService;
    const reasonSelect = document.getElementById('reason');
    const reasonLabel = document.querySelector('label[for="reason"]');
    
    if (!LookupService || !reasonSelect) {
      console.warn('[Blocking/Unblocking] LookupService or reason select not available');
      return;
    }

    try {
      let options = [];
      
      console.log('[Blocking/Unblocking] isBlocked state:', isBlocked, '| currentRecord:', currentRecord ? 'exists' : 'null');
      
      if (isBlocked) {
        // Account IS blocked, so we need UnBlockedReasonID options to UNBLOCK it
        console.log('[Blocking/Unblocking] Account IS BLOCKED -> Loading UnBlockedReasonID options for unblocking');
        options = await LookupService.getUnBlockedReasons();
        if (reasonLabel) reasonLabel.textContent = 'Unblock Reason:';
      } else {
        // Account is NOT blocked, so we need BlockedReasonID options to BLOCK it
        console.log('[Blocking/Unblocking] Account NOT BLOCKED -> Loading BlockedReasonID options for blocking');
        options = await LookupService.getBlockedReasons();
        if (reasonLabel) reasonLabel.textContent = 'Block Reason:';
      }

      console.log('[Blocking/Unblocking] Dropdown options loaded:', options?.length || 0, 'items');

      // Clear existing options except the first placeholder
      reasonSelect.innerHTML = '<option value="">Select...</option>';

      // Populate dropdown with options
      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        reasonSelect.appendChild(option);
      });

    } catch (error) {
      console.error('[Blocking/Unblocking] Error loading reasons dropdown:', error);
    }
  }

  function updateButtonStates(states) {
    Object.keys(states).forEach(action => {
      const btn = document.querySelector(`.btn-action[data-action="${action}"]`);
      if (btn) {
        btn.disabled = !states[action];
        btn.style.opacity = states[action] ? '1' : '0.5';
        btn.style.pointerEvents = states[action] ? 'auto' : 'none';
      }
    });
  }

  function clearForm() {
    document.getElementById('reason').value = '';
    document.getElementById('description').value = '';
    document.getElementById('instructionGivenBy').value = '';
    clearAuditFields();
    clearFieldHighlights();
    currentUpdateCount = 0; // Reset update count
  }

  function clearFieldHighlights() {
    highlightField('reason', false);
    highlightField('description', false);
    highlightField('instructionGivenBy', false);
  }

  function clearAuditFields() {
    document.getElementById('previousStatus').value = '';
    document.getElementById('btsDate').value = '';
    document.getElementById('reasonId').value = '';
    document.getElementById('btsDescription').value = '';
    document.getElementById('btsInstructionGivenBy').value = '';
    // Audit grid (divs use textContent)
    document.getElementById('MakerID').textContent = '-';
    document.getElementById('MakerDT').textContent = '-';
    document.getElementById('CheckerID').textContent = '-';
    document.getElementById('CheckerDT').textContent = '-';
  }

  function updateAuditFieldsAfterUnblock(data) {
    // Show all audit fields EXCEPT reasonId after unblocking
    document.getElementById('previousStatus').value = 'Blocked'; // Status before unblocking
    document.getElementById('btsDate').value = formatDate(data.UnBlockedDate) || '';
    document.getElementById('reasonId').value = ''; // Hide reason ID after unblocking
    document.getElementById('btsDescription').value = data.UnBlockedDescription || '';
    document.getElementById('btsInstructionGivenBy').value = data.UnBlockedInstructionBy || '';
    // Audit grid (divs use textContent)
    document.getElementById('MakerID').textContent = data.CreatedBy || '-';
    document.getElementById('MakerDT').textContent = formatDate(data.CreatedOn) || '-';
    document.getElementById('CheckerID').textContent = data.SupervisedBy || '-';
    document.getElementById('CheckerDT').textContent = formatDate(data.SupervisedOn) || '-';
  }

  // ============================================
  // DATA LOADING
  // ============================================
  function loadBlockingDetails() {
    const accountId = getParentFieldValue('accountId') || getParentFieldValue('AccountID');
    const branchId = getParentFieldValue('branchId') || getParentFieldValue('BranchID') || getOurBranchId();
    const BlockingUnblockingService = window.BlockingUnblockingService;

    if (!accountId || !BlockingUnblockingService) {
      console.log('[Blocking/Unblocking] Missing account ID or service - skipping data load');
      return;
    }

    showLoading(true);

    const requestData = {
      OurBranchID: branchId,
      ModuleTypeID: MODULE_TYPE_ID,
      RelevantID: accountId,
      OperatorID: getOperatorId(),
      ModuleID: MODULE_ID
    };

    BlockingUnblockingService.getBlockingDetails(requestData)
      .then(response => {
        showLoading(false);
        console.log('[Blocking/Unblocking] Response:', response);
        console.log('[Blocking/Unblocking] Full response data:', JSON.stringify(response.data || response, null, 2));

        if (response && response.success) {
          // Get all blocking records from Details01
          const allBlockingRecords = response.data?.Details01 || response.Details01 || [];
          const details = response.data?.Details?.[0] || response.Details?.[0];
          
          // Store all records for history view
          blockingDetails = allBlockingRecords;
          
          console.log('[Blocking/Unblocking] All blocking records:', allBlockingRecords);
          
          // Find any record that is CURRENTLY blocked (has BlockedReasonID but NO UnBlockedDate)
          const activeBlockingRecord = allBlockingRecords.find(record => 
            record.BlockedReasonID && !record.UnBlockedDate
          );
          
          // Also get the most recent record for history display
          const mostRecentRecord = allBlockingRecords[0];
          
          console.log('[Blocking/Unblocking] Active blocking record:', activeBlockingRecord);
          console.log('[Blocking/Unblocking] Most recent record:', mostRecentRecord);
          
          if (activeBlockingRecord) {
            // Account IS currently blocked (found a blocking record without UnBlockedDate)
            currentRecord = activeBlockingRecord;
            isBlocked = true;
            console.log('[Blocking/Unblocking] Account IS BLOCKED - active blocking record found');
            populateForm(activeBlockingRecord);
            showMessage('Account is currently blocked', 'info');
            // Pre-load unblock reasons dropdown since account is blocked
            loadReasonsDropdown();
          } else {
            // Account is NOT blocked (either no blocking record OR all were unblocked)
            isBlocked = false;
            currentRecord = null;
            const wasEverBlocked = allBlockingRecords.length > 0;
            console.log('[Blocking/Unblocking] Account NOT BLOCKED -', wasEverBlocked ? 'all blocks were lifted' : 'no blocking record');
            showMessage(wasEverBlocked ? 'Account was previously blocked but is now unblocked' : 'No blocking record found for this account', 'info');
            // Pre-load block reasons dropdown since account is not blocked
            loadReasonsDropdown();
          }
        } else {
          showMessage(response?.message || 'Failed to load blocking details', 'error');
        }
      })
      .catch(error => {
        showLoading(false);
        showMessage(error.message || 'Error loading blocking details', 'error');
        console.error('[Blocking/Unblocking] Error:', error);
      });
  }

  function populateForm(data) {
    // Log full data to see available fields
    console.log('[Blocking/Unblocking] populateForm data:', JSON.stringify(data, null, 2));
    
    // Track UpdateCount for edit/delete concurrency (used as NewRecord on edits)
    currentUpdateCount = data.UpdateCount ?? data.updateCount ?? 0;
    console.log('[Blocking/Unblocking] Captured UpdateCount:', currentUpdateCount);
    console.log('[Blocking/Unblocking] ReferenceID:', data.ReferenceID || data.BlockedID || data.ID);
    
    document.getElementById('reason').value = data.BlockedReasonID || data.ReasonID || '';
    document.getElementById('description').value = data.BlockedDescription || data.Description || '';
    document.getElementById('instructionGivenBy').value = data.BlockedInstructionBy || data.InstructionGivenBy || '';

    // Audit fields (Behind the Scene)
    document.getElementById('previousStatus').value = data.PreviousStatus || (isBlocked ? 'Blocked' : 'Active');
    document.getElementById('btsDate').value = formatDate(data.BlockedDate || data.Date) || '';
    document.getElementById('reasonId').value = data.BlockedReasonID || data.ReasonID || '';
    document.getElementById('btsDescription').value = data.BlockedDescription || data.Description || '';
    document.getElementById('btsInstructionGivenBy').value = data.BlockedInstructionBy || data.InstructionGivenBy || '';
    // Audit grid (divs use textContent)
    document.getElementById('MakerID').textContent = data.CreatedBy || '-';
    document.getElementById('MakerDT').textContent = formatDate(data.CreatedOn) || '-';
    document.getElementById('CheckerID').textContent = data.SupervisedBy || '-';
    document.getElementById('CheckerDT').textContent = formatDate(data.SupervisedOn) || '-';
  }

  // ============================================
  // SAVE OPERATIONS
  // ============================================
  function saveBlocking() {
    const accountId = getParentFieldValue('accountId') || getParentFieldValue('AccountID');
    const branchId = getParentFieldValue('branchId') || getParentFieldValue('BranchID') || getOurBranchId();
    const BlockingUnblockingService = window.BlockingUnblockingService;

    if (!accountId || !BlockingUnblockingService) {
      showMessage('Missing account ID or service', 'error');
      return;
    }

    const reasonId = document.getElementById('reason').value?.trim();
    const description = document.getElementById('description').value?.trim();
    const instructionBy = document.getElementById('instructionGivenBy').value?.trim();

    // Validate required fields
    const errors = [];
    if (!reasonId) {
      errors.push('Reason');
      highlightField('reason', true);
    } else {
      highlightField('reason', false);
    }
    
    if (!description) {
      errors.push('Description');
      highlightField('description', true);
    } else {
      highlightField('description', false);
    }
    
    if (!instructionBy) {
      errors.push('Instruction Given By');
      highlightField('instructionGivenBy', true);
    } else {
      highlightField('instructionGivenBy', false);
    }
    
    if (errors.length > 0) {
      showMessage(`Please fill in: ${errors.join(', ')}`, 'error');
      return;
    }

    showLoading(true);
    const now = formatDateTime(new Date());

    // Determine if we're blocking or unblocking based on current state
    if (!isBlocked) {
      // BLOCKING: Account is not blocked, so we block it (dbo.p_AddBlockedDetails)
      const requestData = {
        OurBranchID: branchId,
        ModuleTypeID: MODULE_TYPE_ID,
        RelevantID: accountId,
        BlockedDate: now,
        BlockedReasonID: reasonId,
        BlockedDescription: description,
        BlockedInstructionBy: instructionBy,
        CreatedBy: getOperatorId(),
        CreatedOn: now,
        SupervisedBy: "" // Will be filled by checker
      };

      console.log('[Blocking/Unblocking] Blocking request:', requestData);

      BlockingUnblockingService.addBlockedDetails(requestData)
        .then(response => {
          showLoading(false);
          console.log('[Blocking/Unblocking] Block response:', response);

          if (response && response.success) {
            isBlocked = true;
            // Update currentRecord with the data that was just saved (keep form data visible)
            currentRecord = {
              BlockedReasonID: reasonId,
              BlockedDescription: description,
              BlockedInstructionBy: instructionBy,
              BlockedDate: now,
              CreatedBy: getOperatorId(),
              CreatedOn: now
            };
            currentUpdateCount = 1; // New record starts at 1
            showMessage('Data saved successfully', 'success');
            setFormMode('view');
            // Disable all action buttons - only Back should be active
            updateButtonStates({ edit: false, save: false, cancel: false });
          } else {
            showMessage(response?.message || 'Failed to block account', 'error');
          }
        })
        .catch(error => {
          showLoading(false);
          showMessage(error.message || 'Error blocking account', 'error');
          console.error('[Blocking/Unblocking] Error:', error);
        });
    } else {
      // UNBLOCKING: Account is blocked, so we unblock it (dbo.p_AddUnBlockedDetails)
      // Get ReferenceID from currentRecord (may be named differently in API response)
      const referenceId = currentRecord?.ReferenceID || currentRecord?.BlockedID || currentRecord?.ID || currentRecord?.DetailID || 0;
      
      const requestData = {
        OurBranchID: branchId,
        ModuleTypeID: MODULE_TYPE_ID,
        RelevantID: accountId,
        ReferenceID: referenceId,
        UnBlockedDate: now,
        UnBlockedReasonID: reasonId,
        UnBlockedDescription: description,
        UnBlockedInstructionBy: instructionBy,
        ModifiedBy: getOperatorId(),
        ModifiedOn: now,
        SupervisedBy: "", // Will be filled by checker
        SupervisedOn: "",
        NewRecord: currentUpdateCount || 0 // Use tracked UpdateCount for concurrency
      };

      console.log('[Blocking/Unblocking] Unblocking request:', requestData);
      console.log('[Blocking/Unblocking] currentRecord keys:', currentRecord ? Object.keys(currentRecord) : 'null');

      BlockingUnblockingService.addUnBlockedDetails(requestData)
        .then(response => {
          showLoading(false);
          console.log('[Blocking/Unblocking] Unblock response:', response);

          if (response && response.success) {
            isBlocked = false;
            // Update currentRecord with unblocking data (keep form data visible)
            currentRecord = {
              ...currentRecord,
              UnBlockedReasonID: reasonId,
              UnBlockedDescription: description,
              UnBlockedInstructionBy: instructionBy,
              UnBlockedDate: now,
              ModifiedBy: getOperatorId(),
              ModifiedOn: now
            };
            currentUpdateCount = (currentUpdateCount || 0) + 1;
            showMessage('Data saved successfully', 'success');
            setFormMode('view');
            // Update audit fields - show everything except reasonId
            updateAuditFieldsAfterUnblock(currentRecord);
            // Disable all action buttons - only Back should be active
            updateButtonStates({ edit: false, save: false, cancel: false });
          } else {
            showMessage(response?.message || 'Failed to unblock account', 'error');
          }
        })
        .catch(error => {
          showLoading(false);
          showMessage(error.message || 'Error unblocking account', 'error');
          console.error('[Blocking/Unblocking] Error:', error);
        });
    }
  }

  // ============================================
  // HISTORY
  // ============================================
  function showHistory() {
    console.log('[Blocking/Unblocking] showHistory called');
    const overlay = document.getElementById('historyOverlay');
    const iframe = document.getElementById('historyIframe');
    
    console.log('[Blocking/Unblocking] overlay:', overlay, 'iframe:', iframe);
    
    if (overlay && iframe) {
      // Load the history form in the iframe
      iframe.src = 'account-blocking-history.html';
      overlay.hidden = false;
      console.log('[Blocking/Unblocking] Opened history form, overlay hidden:', overlay.hidden);
    } else {
      console.error('[Blocking/Unblocking] Cannot open history - overlay or iframe not found');
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    // Use GlobalUtils for consistent date formatting
    if (window.GlobalUtils && typeof window.GlobalUtils.formatDate === 'function') {
      return window.GlobalUtils.formatDate(dateStr);
    }
    // Fallback if GlobalUtils not loaded
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = String(date.getDate()).padStart(2, '0');
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateStr;
    }
  }

  // ============================================
  // BUTTON HANDLERS
  // ============================================
  function wireActionButtons() {
    // History button - opens blocking/unblocking history form
    document.querySelector('.btn-action[data-action="history"]')?.addEventListener('click', () => {
      showHistory();
    });

    // Edit button - enables form for blocking or unblocking based on current state
    document.querySelector('.btn-action[data-action="edit"]')?.addEventListener('click', () => {
      setFormMode('edit');
      if (isBlocked) {
        showMessage('Enter unblocking details and click Save to unblock', 'info');
      } else {
        showMessage('Enter blocking details and click Save to block', 'info');
      }
    });

    // Save button - calls addBlockedDetails or addUnBlockedDetails based on state
    document.querySelector('.btn-action[data-action="save"]')?.addEventListener('click', () => {
      saveBlocking();
    });

    // Cancel button
    document.querySelector('.btn-action[data-action="cancel"]')?.addEventListener('click', () => {
      setFormMode('view');
      if (currentRecord) {
        populateForm(currentRecord);
      } else {
        clearForm();
      }
      showMessage('Changes cancelled', 'info');
    });
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  function initializeForm() {
    console.log('[Blocking/Unblocking] Initializing form');

    // Wire action buttons
    wireActionButtons();

    // Set initial form mode
    setFormMode('view');

    // Load blocking details after a short delay
    setTimeout(() => {
      loadBlockingDetails();
    }, 500);
  }

  // ============================================
  // DOCUMENT READY
  // ============================================
  document.addEventListener('DOMContentLoaded', initializeForm);
})();
