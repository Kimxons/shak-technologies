(function () {
  // ============================================
  // STATE VARIABLES
  // ============================================
  let currentUpdateCount = 0; // Store UpdateCount from viewed record

  // ============================================
  // UTILITIES
  // ============================================
  function getParentFieldValue(fieldId) {
    try {
      return window.parent?.document?.getElementById(fieldId)?.value?.trim?.() || '';
    } catch (_) {
      return '';
    }
  }

  function getOperatorId() {
    return localStorage.getItem('OperatorID') || 'SYSTEM';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  }

  // Use validation summary (same as account-activation.js) - inline message at top of form
  function showValidationSummary(message, type = 'error') {
    // Find the first form section content or form card
    const targetSection = document.querySelector('.form-card .section-content') || 
                          document.querySelector('.form-card');
    if (!targetSection) return;
    
    // Look for existing summary or create one
    let summary = targetSection.querySelector('.validation-summary');
    if (!summary) {
      summary = document.createElement('div');
      summary.className = 'validation-summary';
      summary.setAttribute('role', 'alert');
      summary.setAttribute('aria-live', 'polite');
      
      // Create icon
      const icon = document.createElement('i');
      icon.className = 'bi bi-exclamation-circle validation-summary__icon';
      
      // Create text
      const text = document.createElement('span');
      text.className = 'validation-summary__text';
      
      // Create close button
      const closeBtn = document.createElement('button');
      closeBtn.className = 'validation-summary__close';
      closeBtn.setAttribute('type', 'button');
      closeBtn.setAttribute('aria-label', 'Close notification');
      closeBtn.innerHTML = '<i class="bi bi-x"></i>';
      closeBtn.addEventListener('click', () => hideValidationSummary());
      
      summary.appendChild(icon);
      summary.appendChild(text);
      summary.appendChild(closeBtn);
      
      // Insert at the top of the section
      const content = targetSection.querySelector('.section-content');
      if (content) {
        content.insertBefore(summary, content.firstChild);
      } else {
        targetSection.insertBefore(summary, targetSection.firstChild);
      }
    } else {
      // Ensure close button exists and is functional when reusing existing summary
      let closeBtn = summary.querySelector('.validation-summary__close');
      if (!closeBtn) {
        closeBtn = document.createElement('button');
        closeBtn.className = 'validation-summary__close';
        closeBtn.setAttribute('type', 'button');
        closeBtn.setAttribute('aria-label', 'Close notification');
        closeBtn.innerHTML = '<i class="bi bi-x"></i>';
        closeBtn.addEventListener('click', () => hideValidationSummary());
        summary.appendChild(closeBtn);
      } else {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.replaceWith(newCloseBtn);
        newCloseBtn.addEventListener('click', () => hideValidationSummary());
      }
    }
    
    // Apply type styling
    if (type === 'success') {
      summary.classList.add('validation-summary--success');
      summary.querySelector('.validation-summary__icon').className = 'bi bi-check-circle validation-summary__icon';
    } else if (type === 'error') {
      summary.classList.remove('validation-summary--success');
      summary.querySelector('.validation-summary__icon').className = 'bi bi-exclamation-circle validation-summary__icon';
    } else {
      summary.classList.remove('validation-summary--success');
      summary.querySelector('.validation-summary__icon').className = 'bi bi-info-circle validation-summary__icon';
    }
    
    // Update message and show
    const textEl = summary.querySelector('.validation-summary__text');
    if (textEl) textEl.textContent = message;
    summary.classList.add('is-visible');
  }
  
  function hideValidationSummary() {
    const summaries = document.querySelectorAll('.validation-summary');
    summaries.forEach(s => {
      s.classList.remove('is-visible');
      setTimeout(() => s.remove(), 250);
    });
  }

  function showMessage(message, type = 'info') {
    if (type === 'error') {
      showValidationSummary(message, 'error');
    } else if (type === 'success') {
      showValidationSummary(message, 'success');
    } else {
      showValidationSummary(message, 'info');
    }
  }

  function setStatus(message) {
    if (typeof DataEntryBase !== 'undefined' && DataEntryBase.setStatus) {
      DataEntryBase.setStatus(message);
    } else {
      // Fallback if DataEntryBase not loaded
      const statusBar = document.querySelector('.de-status-bar');
      if (statusBar) statusBar.textContent = message || 'Ready';
    }
  }

  function showLoading(show = true) {
    if (typeof DataEntryBase !== 'undefined') {
      if (show) {
        DataEntryBase.showLoader('Loading...');
      } else {
        DataEntryBase.hideLoader();
      }
    } else {
      // Fallback if DataEntryBase not loaded
      const overlay = document.getElementById('loadingOverlay');
      if (overlay) overlay.hidden = !show;
    }
  }

  // ============================================
  // FORM DATA GATHERING
  // ============================================
  function getFormData() {
    const reminderId = document.getElementById('reminderId')?.value?.trim();
    const fromDate = document.getElementById('fromDate')?.value?.trim();
    const toDate = document.getElementById('toDate')?.value?.trim();

    // Convert date strings (dd-MMM-yyyy) to database format (yyyy-MM-dd)
    const parseDisplayDate = (dateStr) => {
      if (!dateStr) return '';
      const months = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                       'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' };
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const day = parts[0], month = months[parts[1]], year = parts[2];
        if (month && day && year) return `${year}-${month}-${day}`;
      }
      return '';
    };

    const now = new Date();
    const currentDateTime = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                           String(now.getDate()).padStart(2, '0') + ' ' +
                           String(now.getHours()).padStart(2, '0') + ':' +
                           String(now.getMinutes()).padStart(2, '0') + ':' +
                           String(now.getSeconds()).padStart(2, '0');

    return {
      OurBranchID: document.getElementById('branchId')?.value?.trim() || '',
      AccountID: document.getElementById('accountId')?.value?.trim() || '',
      ReminderID: reminderId ? parseInt(reminderId) : 0,
      Reminder: document.getElementById('reminder')?.value?.trim() || '',
      ColorID: document.getElementById('reminderColor')?.value?.trim() || '',
      ReminderStartDate: parseDisplayDate(fromDate) || '',
      ReminderEndDate: parseDisplayDate(toDate) || '',
      CreatedBy: getOperatorId(),
      CreatedOn: currentDateTime,
      ModifiedBy: getOperatorId(),
      ModifiedOn: currentDateTime,
      SupervisedBy: getOperatorId(),
      NewRecord: reminderId ? currentUpdateCount : 1
    };
  }

  // ============================================
  // BUTTON CONTROL
  // ============================================
  function setButtonStates(enabledButtons = []) {
    const allButtons = document.querySelectorAll('[data-action]');
    console.log(`[Account Reminders] setButtonStates called with enabled buttons:`, enabledButtons);
    allButtons.forEach(btn => {
      const action = btn.getAttribute('data-action');
      // Skip window control buttons - never touch them
      if (['refresh', 'maximize', 'close'].includes(action)) {
        return;
      }
      if (enabledButtons.includes(action)) {
        btn.removeAttribute('disabled');
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        console.log(`[Account Reminders] Enabled button: ${action}`);
      } else {
        btn.setAttribute('disabled', '');
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        console.log(`[Account Reminders] Disabled button: ${action}`);
      }
    });
  }

  function onPageLoad() {
    // On page load, only VIEW button is enabled
    setButtonStates(['view']);
  }

  function onReminderViewed() {
    // After viewing a record successfully, disable View/Save/Cancel, enable Add/Edit/Delete
    setButtonStates(['add', 'edit', 'delete']);
  }

  function onNoReminderFound() {
    // When view returns no data, enable ADD button so user can create a new reminder
    setButtonStates(['add', 'view']);
  }

  function onReminderEditing() {
    // When editing/adding, enable Save and Cancel
    setButtonStates(['save', 'cancel']);
  }

  // ============================================
  // CLIENT DETAILS POPULATION
  // ============================================
  function populateClientDetails(accountData) {
    const clientFields = {
      clientId: accountData.ClientID || '',
      clientName: accountData.CustomerName || accountData.ClientName || '',
      address1: accountData.Address1 || '',
      address2: accountData.Address2 || '',
      city: accountData.City || '',
      country: accountData.Country || '',
      phoneHome: accountData.HomePhone || accountData.Phone || '',
      phoneWork: accountData.WorkPhone || '',
      faxNo: accountData.Fax || accountData.FaxNo || '',
      mobile: accountData.Mobile || '',
      emailId: accountData.Email || accountData.EmailID || ''
    };

    Object.entries(clientFields).forEach(([fieldId, value]) => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.textContent = value || '-';
      }
    });
  }

  function populateBranchAndAccountNames(accountData) {
    // Get the parent branch name if available, or try to extract from response
    const parentBranchName = getParentFieldValue('branchName') || getParentFieldValue('BranchName');
    const branchNameField = document.getElementById('branchName');
    
    if (branchNameField) {
      if (parentBranchName) {
        branchNameField.value = parentBranchName;
      } else if (accountData.BranchName) {
        branchNameField.value = accountData.BranchName;
      } else if (accountData.BranchDescription) {
        branchNameField.value = accountData.BranchDescription;
      }
    }

    // Populate account name from API response with fallback field names
    const accountNameField = document.getElementById('accountName');
    if (accountNameField) {
      const accountName = accountData.AccountName 
        || accountData.AccountDescription 
        || accountData.AccountTitle
        || accountData.CustomerName
        || '';
      accountNameField.value = accountName;
    }
  }

  // ============================================
  // API CALLS
  // ============================================
  function loadAccountDetails() {
    const branchId = document.getElementById('branchId')?.value?.trim();
    const accountId = document.getElementById('accountId')?.value?.trim();

    if (!branchId || !accountId) {
      showMessage('Please select a branch and account first', 'info');
      setStatus('Ready');
      return;
    }

    showLoading(true);
    setStatus('Loading account details...');

    const requestData = {
      OurBranchID: branchId,
      AccountID: accountId,
      OperatorID: getOperatorId()
    };

    accountservice.getAccount(requestData)
      .then(response => {
        showLoading(false);
        
        if (response.success && response.data) {
          const accountData = Array.isArray(response.data) ? response.data[0] : response.data;
          
          // Populate branch and account names
          populateBranchAndAccountNames(accountData);
          
          // Populate client details section
          populateClientDetails(accountData);
          
          setStatus('Account details loaded successfully');
          showMessage('Account details loaded', 'success');
        } else {
          setStatus('Failed to load account details');
          showMessage(response.error || 'Failed to load account details', 'error');
        }
      })
      .catch(error => {
        showLoading(false);
        setStatus('Error loading account details');
        showMessage(error.message || 'Error loading account details', 'error');
        console.error('Error loading account details:', error);
      });
  }

  function loadReminders() {
    const branchId = document.getElementById('branchId')?.value?.trim();
    const accountId = document.getElementById('accountId')?.value?.trim();

    if (!branchId || !accountId) {
      showMessage('Please select a branch and account first', 'info');
      setStatus('Ready');
      return;
    }

    showLoading(true);
    setStatus('Loading reminders...');

    const requestData = {
      OurBranchID: branchId,
      AccountID: accountId,
      ReminderID: 0,
      OperatorID: getOperatorId(),
      Direction: 0
    };

    accountservice.getAccountReminders(requestData)
      .then(response => {
        showLoading(false);
        
        if (response.success) {
          setStatus('Reminders loaded successfully');
          showMessage('Reminders loaded', 'success');
          // You can populate a list here if needed
        } else {
          setStatus('Failed to load reminders');
          showMessage(response.error || 'Failed to load reminders', 'error');
        }
      })
      .catch(error => {
        showLoading(false);
        setStatus('Error loading reminders');
        showMessage(error.message || 'Error loading reminders', 'error');
        console.error('Error loading reminders:', error);
      });
  }

  function saveReminder() {
    const data = getFormData();
    console.log('[Account Reminders] Saving reminder with data:', data);

    if (!data.OurBranchID || !data.AccountID) {
      showMessage('Branch and Account are required', 'error');
      return;
    }

    if (!data.Reminder) {
      showMessage('Reminder text is required', 'error');
      return;
    }

    showLoading(true);
    setStatus('Saving reminder...');

    accountservice.saveAccountReminder(data)
      .then(response => {
        showLoading(false);
        console.log('[Account Reminders] Save response:', response);
        
        if (response.success) {
          setStatus('Reminder saved successfully');
          showMessage('Reminder saved successfully', 'success');
          // After save, go back to page load state
          onPageLoad();
        } else {
          setStatus('Failed to save reminder');
          showMessage(response.error || 'Failed to save reminder', 'error');
        }
      })
      .catch(error => {
        showLoading(false);
        setStatus('Error saving reminder');
        showMessage(error.message || 'Error saving reminder', 'error');
        console.error('Error saving reminder:', error);
      });
  }

  function deleteReminder(reminderId) {
    console.log('[Account Reminders] deleteReminder called with reminderId:', reminderId);
    
    // Get all values from form - no hardcoding
    const branchId = document.getElementById('branchId')?.value?.trim();
    const accountId = document.getElementById('accountId')?.value?.trim();
    const reminderIdFromControl = document.getElementById('reminderId')?.value?.trim() || reminderId;
    
    console.log('[Account Reminders] deleteReminder - Form values:', { branchId, accountId, reminderIdFromControl });

    // Validation
    if (!branchId || !accountId) {
      console.error('[Account Reminders] Missing Branch or Account');
      showMessage('Please select Branch and Account first', 'error');
      return;
    }

    if (!reminderIdFromControl) {
      console.error('[Account Reminders] Missing Reminder ID');
      showMessage('Please enter or select a Reminder ID', 'error');
      return;
    }

    showLoading(true);
    setStatus('Deleting reminder...');

    // Verify accountservice is available
    if (typeof accountservice === 'undefined') {
      console.error('[Account Reminders] accountservice is not defined');
      showLoading(false);
      showMessage('accountservice is not loaded. Please refresh the page.', 'error');
      return;
    }
    
    if (typeof accountservice.deleteAccountReminders !== 'function') {
      console.error('[Account Reminders] deleteAccountReminders is not a function');
      console.log('[Account Reminders] accountservice:', accountservice);
      console.log('[Account Reminders] Available methods:', Object.keys(accountservice || {}));
      showLoading(false);
      showMessage('deleteAccountReminders method is not available. Please refresh the page.', 'error');
      return;
    }

    // Determine NewRecord (0 = delete existing record, 1 = new record - not applicable for delete)
    // For delete operations, NewRecord is typically 0
    const newRecord = 0;

    // Build request data from form values - no hardcoding
    const requestData = {
      OurBranchID: branchId,
      AccountID: accountId,
      ReminderID: reminderIdFromControl,
      NewRecord: newRecord
    };

    console.log('[Account Reminders] Calling accountservice.deleteAccountReminders with requestData:', JSON.stringify(requestData, null, 2));
    
    // Call the API
    accountservice.deleteAccountReminders(requestData)
      .then(response => {
        showLoading(false);
        console.log('[Account Reminders] Delete response:', response);
        
        if (response && response.success) {
          setStatus('Reminder deleted successfully');
          showMessage(response.message || 'Reminder deleted successfully', 'success');
          // Clear form and reset to initial state
          document.getElementById('reminderId').value = '';
          document.getElementById('reminder').value = '';
          document.getElementById('reminderColor').value = '';
          document.getElementById('reminderPriority').value = '';
          document.getElementById('fromDate').value = '';
          document.getElementById('toDate').value = '';
          currentUpdateCount = 0;
          // Return to page load state
          onPageLoad();
        } else {
          setStatus('Failed to delete reminder');
          showMessage(response?.message || response?.error || 'Failed to delete reminder', 'error');
        }
      })
      .catch(error => {
        showLoading(false);
        setStatus('Error deleting reminder');
        showMessage(error.message || 'Error deleting reminder', 'error');
        console.error('[Account Reminders] Error deleting reminder:', error);
      });
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================
  function wireActionButtons() {
    const actions = {
      'view': () => {
        console.log('[Account Reminders] View button clicked');
        
        // Get all values from form - no hardcoding
        const branchId = document.getElementById('branchId')?.value?.trim();
        const accountId = document.getElementById('accountId')?.value?.trim();
        const reminderId = document.getElementById('reminderId')?.value?.trim();
        
        console.log('[Account Reminders] Form values:', { branchId, accountId, reminderId });
        
        // Validation
        if (!branchId || !accountId) {
          console.warn('[Account Reminders] Missing Branch or Account');
          showMessage('Please select Branch and Account first', 'error');
          return;
        }
        
        if (!reminderId) {
          console.warn('[Account Reminders] Missing Reminder ID');
          console.log('[Account Reminders] About to call showMessage with error');
          showMessage('Please enter or select a Reminder ID', 'error', 0); // 0 = don't auto-hide errors
          console.log('[Account Reminders] showMessage call completed');
          return;
        }
        
        console.log('[Account Reminders] Calling loadReminderData with:', reminderId);
        // Load reminder data using the form values
        loadReminderData(reminderId);
      },
      'add': () => {
        document.getElementById('reminderId').value = '';
        document.getElementById('reminder').value = '';
        document.getElementById('reminderColor').value = '';
        document.getElementById('reminderPriority').value = '';
        document.getElementById('fromDate').value = '';
        document.getElementById('toDate').value = '';
        currentUpdateCount = 0; // Reset for new records
        onReminderEditing();
        showMessage('Ready to add new reminder', 'info');
      },
      'edit': () => {
        const reminderId = document.getElementById('reminderId')?.value?.trim();
        if (reminderId) {
          onReminderEditing();
          showMessage('Edit mode enabled', 'info');
        } else {
          showMessage('Please enter or select a Reminder ID', 'error');
        }
      },
      'save': saveReminder,
      'delete': () => {
        // Get all values from form - no hardcoding
        const branchId = document.getElementById('branchId')?.value?.trim();
        const accountId = document.getElementById('accountId')?.value?.trim();
        const reminderId = document.getElementById('reminderId')?.value?.trim();
        
        // Validation
        if (!branchId || !accountId) {
          showMessage('Please select Branch and Account first', 'error');
          return;
        }
        
        if (!reminderId) {
          showMessage('Please enter or select a Reminder ID to delete', 'error');
          return;
        }
        
        // Confirm deletion
        if (confirm('Are you sure you want to delete this reminder?')) {
          deleteReminder(reminderId);
        }
      },
      'cancel': () => {
        document.getElementById('reminder').value = '';
        document.getElementById('reminderColor').value = '';
        document.getElementById('reminderPriority').value = '';
        document.getElementById('fromDate').value = '';
        document.getElementById('toDate').value = '';
        onReminderViewed();
        showMessage('Changes cancelled', 'info');
      },
      'refresh': () => {
        location.reload();
      },
      'maximize': () => {
        try {
          window.parent.postMessage({ type: 'toggleSidebarForMaximize' }, '*');
        } catch (_) {
          // ignore
        }
      }
    };

    Object.keys(actions).forEach(action => {
      const buttons = document.querySelectorAll(`[data-action="${action}"]`);
      console.log(`[Account Reminders] Wiring ${action} button, found ${buttons.length} button(s)`);
      buttons.forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          console.log(`[Account Reminders] ${action} button clicked`);
          try {
            actions[action]();
          } catch (error) {
            console.error(`[Account Reminders] Error in ${action} handler:`, error);
            showMessage(`Error executing ${action}: ${error.message}`, 'error');
          }
        });
      });
    });
    
    console.log('[Account Reminders] All action buttons wired');
  }

  // ============================================
  // REMINDER DATA POPULATION
  // ============================================
  function populateReminderForm(reminderData) {
    console.log('[Account Reminders] populateReminderForm called with:', reminderData);
    
    if (!reminderData) {
      console.error('[Account Reminders] No reminder data provided');
      return;
    }

    // Populate reminder text - exact field name from DB: Reminder
    const reminderField = document.getElementById('reminder');
    if (reminderField) {
      console.log('[Account Reminders] Found reminder field, setting value:', reminderData.Reminder);
      reminderField.value = reminderData.Reminder || '';
      console.log('[Account Reminders] Reminder field value after set:', reminderField.value);
    } else {
      console.error('[Account Reminders] reminder field not found in DOM');
    }

    // Populate color - exact field name from DB: ColorID
    const colorField = document.getElementById('reminderColor');
    if (colorField) {
      console.log('[Account Reminders] Found color field, current options:', Array.from(colorField.options).map(o => `${o.value}:${o.text}`));
      console.log('[Account Reminders] Setting color value to:', reminderData.ColorID);
      colorField.value = reminderData.ColorID || '';
      console.log('[Account Reminders] Color field value after set:', colorField.value);
      console.log('[Account Reminders] Color field selected option:', colorField.selectedIndex >= 0 ? colorField.options[colorField.selectedIndex].text : 'NOT FOUND');
    } else {
      console.error('[Account Reminders] reminderColor field not found in DOM');
    }

    // Populate priority if available
    const priorityField = document.getElementById('reminderPriority');
    if (priorityField && reminderData.Priority) {
      console.log('[Account Reminders] Found priority field, setting value:', reminderData.Priority);
      priorityField.value = reminderData.Priority;
    }

    // Populate start date - exact field name from DB: ReminderStartDate
    const fromDateField = document.getElementById('fromDate');
    if (fromDateField && reminderData.ReminderStartDate) {
      const startDate = reminderData.ReminderStartDate;
      if (startDate) {
        const date = new Date(startDate);
        const day = String(date.getDate()).padStart(2, '0');
        const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
        const year = date.getFullYear();
        const formattedDate = `${day}-${month}-${year}`;
        fromDateField.value = formattedDate;
        console.log('[Account Reminders] Set fromDate:', formattedDate);
      }
    } else {
      if (!fromDateField) console.warn('[Account Reminders] fromDate field not found in DOM');
      if (!reminderData.ReminderStartDate) console.warn('[Account Reminders] ReminderStartDate not in data');
    }

    // Populate end date - exact field name from DB: ReminderEndDate
    const toDateField = document.getElementById('toDate');
    if (toDateField && reminderData.ReminderEndDate) {
      const endDate = reminderData.ReminderEndDate;
      if (endDate) {
        const date = new Date(endDate);
        const day = String(date.getDate()).padStart(2, '0');
        const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
        const year = date.getFullYear();
        const formattedDate = `${day}-${month}-${year}`;
        toDateField.value = formattedDate;
        console.log('[Account Reminders] Set toDate:', formattedDate);
      }
    } else {
      if (!toDateField) console.warn('[Account Reminders] toDate field not found in DOM');
      if (!reminderData.ReminderEndDate) console.warn('[Account Reminders] ReminderEndDate not in data');
    }

    // Populate audit fields (Behind the Scene) - exact DB field names
    const makerId = document.getElementById('MakerID');
    if (makerId) {
      makerId.textContent = reminderData.CreatedBy || '-';
      console.log('[Account Reminders] Set MakerID:', reminderData.CreatedBy);
    } else {
      console.warn('[Account Reminders] MakerID field not found in DOM');
    }

    const makerDt = document.getElementById('MakerDT');
    if (makerDt) {
      if (reminderData.CreatedOn) {
        const createdDate = new Date(reminderData.CreatedOn);
        const formatted = createdDate.toLocaleDateString() + ' ' + createdDate.toLocaleTimeString();
        makerDt.textContent = formatted;
        console.log('[Account Reminders] Set MakerDT:', formatted);
      } else {
        makerDt.textContent = '-';
      }
    } else {
      console.warn('[Account Reminders] MakerDT field not found in DOM');
    }

    // CheckerID/DT uses SupervisedBy/SupervisedOn from DB
    const checkerId = document.getElementById('CheckerID');
    if (checkerId) {
      checkerId.textContent = reminderData.SupervisedBy || '-';
      console.log('[Account Reminders] Set CheckerID (SupervisedBy):', reminderData.SupervisedBy);
    } else {
      console.warn('[Account Reminders] CheckerID field not found in DOM');
    }

    const checkerDt = document.getElementById('CheckerDT');
    if (checkerDt) {
      if (reminderData.SupervisedOn) {
        const supervisedDate = new Date(reminderData.SupervisedOn);
        const formatted = supervisedDate.toLocaleDateString() + ' ' + supervisedDate.toLocaleTimeString();
        checkerDt.textContent = formatted;
        console.log('[Account Reminders] Set CheckerDT (SupervisedOn):', formatted);
      } else {
        checkerDt.textContent = '-';
      }
    } else {
      console.warn('[Account Reminders] CheckerDT field not found in DOM');
    }

    // ModifierID and ModifierDT
    const modifierId = document.getElementById('ModifierID');
    if (modifierId) {
      modifierId.textContent = reminderData.ModifiedBy || '-';
      console.log('[Account Reminders] Set ModifierID:', reminderData.ModifiedBy);
    } else {
      console.warn('[Account Reminders] ModifierID field not found in DOM');
    }

    const modifierDt = document.getElementById('ModifierDT');
    if (modifierDt) {
      if (reminderData.ModifiedOn) {
        const modifiedDate = new Date(reminderData.ModifiedOn);
        const formatted = modifiedDate.toLocaleDateString() + ' ' + modifiedDate.toLocaleTimeString();
        modifierDt.textContent = formatted;
        console.log('[Account Reminders] Set ModifierDT:', formatted);
      } else {
        modifierDt.textContent = '-';
      }
    } else {
      console.warn('[Account Reminders] ModifierDT field not found in DOM');
    }

    // Store UpdateCount for concurrency control
    currentUpdateCount = reminderData.UpdateCount || 0;
    console.log('[Account Reminders] Stored UpdateCount:', currentUpdateCount);

    console.log('[Account Reminders] Form population complete');
  }

  function loadReminderData(reminderId) {
    console.log('[Account Reminders] loadReminderData called with reminderId:', reminderId);
    
    // Get all values from form - no hardcoding
    const branchId = document.getElementById('branchId')?.value?.trim();
    const accountId = document.getElementById('accountId')?.value?.trim();
    const reminderIdFromControl = document.getElementById('reminderId')?.value?.trim() || reminderId;
    
    console.log('[Account Reminders] loadReminderData - Form values:', { branchId, accountId, reminderIdFromControl });

    // Validation
    if (!branchId || !accountId) {
      console.error('[Account Reminders] Missing required data:', { branchId, accountId });
      showMessage('Please select Branch and Account first', 'error');
      return;
    }

    if (!reminderIdFromControl) {
      console.error('[Account Reminders] Missing Reminder ID');
      showMessage('Please enter or select a Reminder ID', 'error');
      return;
    }

    showLoading(true);
    setStatus('Loading reminder data...');

    // Build request data from form values - no hardcoding
    // Convert ReminderID to number (smallint)
    const reminderIdNum = parseInt(reminderIdFromControl, 10);
    if (isNaN(reminderIdNum)) {
      showLoading(false);
      showMessage('Invalid Reminder ID format', 'error');
      return;
    }

    // Get Direction from form if available, otherwise default to 0 (smallint)
    // Direction is typically used for navigation (0 = current, 1 = next, -1 = previous)
    const directionElement = document.getElementById('direction') || document.querySelector('[name="direction"]');
    const direction = directionElement ? (parseInt(directionElement.value, 10) || 0) : 0;

    const requestData = {
      OurBranchID: branchId,
      AccountID: accountId,
      ReminderID: reminderIdNum,
      OperatorID: getOperatorId(),
      Direction: direction
    };

    console.log('[Account Reminders] Request data prepared:', requestData);
    console.log('[Account Reminders] About to call accountservice.getAccountReminders...');
    
    // Verify accountservice is available
    if (typeof accountservice === 'undefined') {
      console.error('[Account Reminders] accountservice is not defined');
      showLoading(false);
      showMessage('accountservice is not loaded. Please refresh the page.', 'error');
      return;
    }
    
    if (typeof accountservice.getAccountReminders !== 'function') {
      console.error('[Account Reminders] getAccountReminders is not a function');
      console.log('[Account Reminders] accountservice:', accountservice);
      console.log('[Account Reminders] Available methods:', Object.keys(accountservice || {}));
      showLoading(false);
      showMessage('getAccountReminders method is not available. Please refresh the page.', 'error');
      return;
    }

    console.log('[Account Reminders] Calling accountservice.getAccountReminders with requestData:', JSON.stringify(requestData, null, 2));
    
    // Call the API
    accountservice.getAccountReminders(requestData)
      .then(response => {
        console.log('[Account Reminders] Full API Response received:', response);
        showLoading(false);

        if (response.success && response.data) {
          // The API returns multiple result sets as an object with properties:
          // Details: Event info (OperatorID, EventID, etc.)
          // Details01: Client details (account data)
          // Details02: Reminder data (the one we need)
          
          // Extract and populate client details from Details01
          const clientResultSet = response.data.Details01 || response.data.details01;
          console.log('[Account Reminders] Client result set (Details01):', clientResultSet);
          if (clientResultSet && Array.isArray(clientResultSet) && clientResultSet.length > 0) {
            const clientData = clientResultSet[0];
            console.log('[Account Reminders] Populating client details from Details01:', clientData);
            populateBranchAndAccountNames(clientData);
            populateClientDetails(clientData);
            console.log('[Account Reminders] Client details populated');
          } else {
            console.warn('[Account Reminders] No client data found in Details01');
          }
          
          const reminderResultSet = response.data.Details02 || response.data.details02;
          console.log('[Account Reminders] Reminder result set (Details02):', reminderResultSet);
          
          if (reminderResultSet && Array.isArray(reminderResultSet) && reminderResultSet.length > 0) {
            const reminderData = reminderResultSet[0];
            console.log('[Account Reminders] Populating form with reminder data:', reminderData);
            populateReminderForm(reminderData);
            onReminderViewed();
            setStatus('Reminder loaded successfully');
            showMessage('Reminder data loaded successfully', 'success');
          } else {
            console.warn('[Account Reminders] No reminder data found in Details02');
            setStatus('No reminder data found');
            showMessage('No reminder data found for the selected reminder', 'info');
            // Enable ADD button when no data is found
            onNoReminderFound();
          }
        } else {
          setStatus('Failed to load reminder data');
          showMessage(response.error || 'Failed to load reminder data', 'error');
          // Enable ADD button when view fails (might be a new reminder)
          onNoReminderFound();
        }
      })
      .catch(error => {
        showLoading(false);
        setStatus('Error loading reminder data');
        showMessage(error.message || 'Error loading reminder data', 'error');
        console.error('[Account Reminders] Error in API call:', error);
        console.error('[Account Reminders] Error stack:', error.stack);
      });
  }

  // ============================================
  // LOOKUP HANDLERS
  // ============================================
  function wireBranchLookup() {
    const lookupBtn = document.querySelector('.kairo-branch-control__lookup');
    if (!lookupBtn) return;

    lookupBtn.addEventListener('click', e => {
      e.preventDefault();
      showMessage('Branch lookup not yet implemented', 'info');
    });
  }

  function wireAccountLookup() {
    const lookupBtn = document.querySelector('.kairo-account-control__lookup');
    if (!lookupBtn) return;

    lookupBtn.addEventListener('click', e => {
      e.preventDefault();
      showMessage('Account lookup not yet implemented', 'info');
    });
  }

  function wireReminderLookup() {
    const lookupBtn = document.querySelector('[data-lookup="reminderId"]');
    if (!lookupBtn) {
      console.warn('[Account Reminders] Reminder lookup button not found');
      return;
    }

    console.log('[Account Reminders] Reminder lookup button found and wired');
    lookupBtn.addEventListener('click', e => {
      console.log('[Account Reminders] Reminder lookup button clicked');
      e.preventDefault();
      
      // Check if Reminder ID field has a value
      const reminderId = document.getElementById('reminderId')?.value?.trim();
      if (reminderId) {
        // If Reminder ID is entered, load the reminder data directly
        console.log('[Account Reminders] Reminder ID found, loading data for ID:', reminderId);
        loadReminderData(reminderId);
      } else {
        // If no Reminder ID, open search modal
        console.log('[Account Reminders] No Reminder ID entered, opening search modal');
        openReminderSearch();
      }
    });

    // Also allow Enter key in Reminder ID field to load data
    const reminderIdField = document.getElementById('reminderId');
    if (reminderIdField) {
      reminderIdField.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const reminderId = reminderIdField.value?.trim();
          if (reminderId) {
            console.log('[Account Reminders] Enter pressed in Reminder ID field, loading data for ID:', reminderId);
            loadReminderData(reminderId);
          }
        }
      });
    }
  }

  async function openReminderSearch() {
    console.log('[Account Reminders] openReminderSearch() called');
    const branchId = document.getElementById('branchId')?.value?.trim();
    const accountId = document.getElementById('accountId')?.value?.trim();

    console.log('[Account Reminders] Branch ID:', branchId, 'Account ID:', accountId);
    if (!branchId || !accountId) {
      console.warn('[Account Reminders] Cannot open search - missing branch or account');
      showMessage('Please select branch and account first', 'error');
      return;
    }

    // Initialize search modal if not already done
    if (!window.reminderSearchModal) {
      window.reminderSearchModal = new SearchModal({
        prefix: 'reminder-search',
        moduleID: 8200, // Account Maintenance module ID
        getOperatorId: getOperatorId,
        getOurBranchId: () => branchId,
        onError: (msg) => showMessage(msg, 'error')
      });
    }

    const modal = window.reminderSearchModal;

    // Configure search fields
    const searchConfig = {
      title: 'Search Account Reminders',
      tableID: 'AccountReminderID',
      whereStmt: `OurBranchID = '${branchId}' AND AccountID = '${accountId}'`,
      advFilterString: `OurBranchID = '${branchId}' AND AccountID = '${accountId}'`,
      searchFields: [
        {
          label: 'Reminder ID',
          name: 'reminderId',
          column: 'ReminderID',
          icon: 'search'
        },
        {
          label: 'Reminder Text',
          name: 'reminder',
          column: 'Reminder',
          icon: 'chat-left-text'
        }
      ],
      resultFields: [
        { name: 'ReminderID', label: 'ID', width: '80px' },
        { name: 'Reminder', label: 'Description', width: '250px' },
        { name: 'ColorID', label: 'Color', width: '80px' },
        { name: 'CreatedBy', label: 'Created By', width: '100px' },
        { name: 'CreatedOn', label: 'Created On', width: '120px' }
      ],
      onSelect: (selectedRow) => {
        console.log('[Account Reminders] onSelect called with:', selectedRow);
        if (selectedRow && selectedRow.ReminderID) {
          const reminderId = selectedRow.ReminderID;
          console.log('[Account Reminders] Setting Reminder ID:', reminderId);
          document.getElementById('reminderId').value = reminderId;
          modal.close();
          // Load the full reminder data after modal closes
          setTimeout(() => {
            console.log('[Account Reminders] Calling loadReminderData for:', reminderId);
            loadReminderData(reminderId);
          }, 200);
        } else {
          console.warn('[Account Reminders] Invalid selectedRow or missing ReminderID:', selectedRow);
        }
      }
    };

    // Open search modal
    await modal.open(searchConfig);
  }

  // ============================================
  // DROPDOWN INITIALIZATION
  // ============================================
  async function loadDropdownOptions() {
    try {
      // Load system colors for Reminder Color dropdown
      console.log('[Account Reminders] Loading system colors...');
      const colors = await LookupService.getSystemColors();
      console.log('[Account Reminders] System colors loaded:', colors);

      const colorSelect = document.getElementById('reminderColor');
      if (colorSelect && colors && colors.length > 0) {
        // Clear existing options except the first placeholder
        while (colorSelect.options.length > 1) {
          colorSelect.remove(1);
        }

        // Add color options from system colors
        colors.forEach(color => {
          const option = document.createElement('option');
          option.value = color.value;
          option.textContent = color.label;
          colorSelect.appendChild(option);
        });

        console.log('[Account Reminders] Color dropdown populated with', colors.length, 'options');
      } else {
        console.warn('[Account Reminders] Color select not found or no colors available');
      }
    } catch (error) {
      console.error('[Account Reminders] Error loading dropdown options:', error);
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  function initializeForm() {
    console.log('[Account Reminders] Initializing form...');
    
    // Wire up button handlers FIRST before setting states
    wireActionButtons();
    
    // On page load, only View button should be enabled
    onPageLoad();
    console.log('[Account Reminders] Button states set - View should be enabled');
    
    // Load dropdown options (system colors, etc.)
    loadDropdownOptions();

    // Populate branch and account from parent form if available
    const parentBranchId = getParentFieldValue('branchId') || getParentFieldValue('BranchID');
    const parentAccountId = getParentFieldValue('accountId') || getParentFieldValue('AccountID');

    if (parentBranchId) {
      document.getElementById('branchId').value = parentBranchId;
      console.log('[Account Reminders] Set branchId from parent:', parentBranchId);
    }

    if (parentAccountId) {
      document.getElementById('accountId').value = parentAccountId;
      console.log('[Account Reminders] Set accountId from parent:', parentAccountId);
    }
    
    wireBranchLookup();
    wireAccountLookup();
    wireReminderLookup();

    // Load account details and reminders if both branch and account are available
    if (parentBranchId && parentAccountId) {
      setTimeout(() => {
        loadAccountDetails();
        setTimeout(() => loadReminders(), 1000);
      }, 500);
    }

    setStatus('Ready');
    
    // Notify parent form that this module has opened
    try {
      window.parent.postMessage({ type: 'submoduleOpened', source: 'Reminders' }, '*');
    } catch (_) {
      // ignore
    }
  }

  // ============================================
  // DOCUMENT READY
  // ============================================
  document.addEventListener('DOMContentLoaded', initializeForm);
})();
