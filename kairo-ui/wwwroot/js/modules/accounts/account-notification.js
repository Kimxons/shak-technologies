(function () {
  // DOM Elements - will be initialized in init()
  let btnEdit, btnSave, btnCancel, formInputs, frequencySelect;
  let dayOfMonthInput, executionDateInput, notificationsBody, selectAllCheckbox;

  // Store loaded notifications for save
  let loadedNotifications = [];

  // Context from parent or URL params
  let accountContext = {
    AccountID: null,
    ProductID: null,
    ModuleID: null
  };

  // ========== Initialize DOM Elements ==========
  function initDomElements() {
    btnEdit = document.querySelector('[data-action="edit"]');
    btnSave = document.querySelector('[data-action="save"]');
    btnCancel = document.querySelector('[data-action="cancel"]');
    formInputs = document.querySelectorAll('.form-content input, .form-content select');
    frequencySelect = document.getElementById('frequency');
    dayOfMonthInput = document.getElementById('dayOfMonth');
    executionDateInput = document.getElementById('executionDate');
    notificationsBody = document.getElementById('notificationsBody');
    selectAllCheckbox = document.getElementById('selectAll');
    
    console.log('[AccountNotification] DOM elements initialized:', {
      btnEdit: !!btnEdit,
      btnSave: !!btnSave,
      btnCancel: !!btnCancel,
      formInputs: formInputs.length
    });
  }

  // ========== Get Context ==========
  function getContextFromStorage() {
    // Read from sessionStorage (set by parent)
    accountContext.AccountID = sessionStorage.getItem('currentAccountID');
    accountContext.ProductID = sessionStorage.getItem('currentProductID');
    accountContext.BranchID = sessionStorage.getItem('currentBranchID');
    accountContext.ClientID = sessionStorage.getItem('currentClientID');
    
    console.log('[AccountNotification] Context from sessionStorage:', accountContext);
  }

  function getContextFromUrl() {
    const params = new URLSearchParams(window.location.search);
    // URL params override sessionStorage if provided
    accountContext.AccountID = params.get('AccountID') || params.get('accountId') || accountContext.AccountID;
    accountContext.ProductID = params.get('ProductID') || params.get('productId') || accountContext.ProductID;
    accountContext.ModuleID = params.get('ModuleID') || params.get('moduleId') || accountContext.ModuleID;
  }

  function listenForParentContext() {
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'accountContext') {
        accountContext.AccountID = event.data.AccountID || accountContext.AccountID;
        accountContext.ProductID = event.data.ProductID || accountContext.ProductID;
        accountContext.ModuleID = event.data.ModuleID || accountContext.ModuleID;
        loadNotifications();
      }
    });
  }

  // ========== Notifications Table ==========
  async function loadNotifications() {
    console.log('[AccountNotification] loadNotifications called');
    console.log('[AccountNotification] AccountID:', accountContext.AccountID);
    console.log('[AccountNotification] ProductID:', accountContext.ProductID);

    // Check if service is available
    if (!window.AccountNotificationService) {
      console.error('[AccountNotification] AccountNotificationService not loaded!');
      return;
    }

    try {
      showLoading(true);
      const requestData = {
        ProductID: accountContext.ProductID || 'null',
        ModuleID: 2091,
        AccountID: accountContext.AccountID || 'null'
      };
      console.log('[AccountNotification] Request data:', requestData);
      
      const response = await window.AccountNotificationService.getProductNotificationDetails(requestData);
      console.log('[AccountNotification] Full API response:', response);
      console.log('[AccountNotification] Response keys:', Object.keys(response));
      if (response.data) {
        console.log('[AccountNotification] response.data:', response.data);
        console.log('[AccountNotification] response.data keys:', Object.keys(response.data));
      }

      // Handle various response structures
      let notifications = [];
      if (response.success) {
        // Check Details01 first (primary data location)
        if (response.data && Array.isArray(response.data.Details01) && response.data.Details01.length > 0) {
          notifications = response.data.Details01;
          console.log('[AccountNotification] Found data.Details01');
        } else if (response.data && Array.isArray(response.data.Details02) && response.data.Details02.length > 0) {
          notifications = response.data.Details02;
          console.log('[AccountNotification] Found data.Details02');
        } else if (response.data && Array.isArray(response.data.Details) && response.data.Details.length > 0) {
          notifications = response.data.Details;
          console.log('[AccountNotification] Found data.Details');
        } else if (Array.isArray(response.data) && response.data.length > 0) {
          notifications = response.data;
          console.log('[AccountNotification] Found data as array');
        } else if (Array.isArray(response.Details01) && response.Details01.length > 0) {
          notifications = response.Details01;
          console.log('[AccountNotification] Found response.Details01');
        } else if (Array.isArray(response.Details) && response.Details.length > 0) {
          notifications = response.Details;
          console.log('[AccountNotification] Found response.Details');
        } else {
          console.log('[AccountNotification] No notifications found in response');
        }
      } else {
        console.log('[AccountNotification] response.success is false or missing');
      }
      
      console.log('[AccountNotification] Parsed notifications:', notifications);
      loadedNotifications = notifications; // Store for save
      renderNotificationsTable(notifications);
      populateBehindTheScene(notifications);
    } catch (error) {
      console.error('[AccountNotification] Error loading notifications:', error);
      renderNotificationsTable([]);
      populateBehindTheScene([]);
    } finally {
      showLoading(false);
    }
  }

  function populateBehindTheScene(notifications) {
    const modifierIdEl = document.getElementById('ModifierID');
    const modifierDtEl = document.getElementById('ModifierDT');
    const supervisedByEl = document.getElementById('SupervisedBy');
    const supervisedOnEl = document.getElementById('SupervisedOn');

    // Get audit info from first notification (they share audit data)
    if (notifications && notifications.length > 0) {
      const notification = notifications[0];
      
      if (modifierIdEl) modifierIdEl.textContent = notification.ModifiedBy || '-';
      if (modifierDtEl) modifierDtEl.textContent = formatDateTime(notification.ModifiedOn) || '-';
      if (supervisedByEl) supervisedByEl.textContent = notification.SupervisedBy || '-';
      if (supervisedOnEl) supervisedOnEl.textContent = formatDateTime(notification.SupervisedOn) || '-';
    } else {
      // Clear values
      if (modifierIdEl) modifierIdEl.textContent = '-';
      if (modifierDtEl) modifierDtEl.textContent = '-';
      if (supervisedByEl) supervisedByEl.textContent = '-';
      if (supervisedOnEl) supervisedOnEl.textContent = '-';
    }
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  }

  function renderNotificationsTable(notifications) {
    if (!notificationsBody) return;

    notificationsBody.innerHTML = '';

    if (!notifications || notifications.length === 0) {
      notificationsBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-muted">No notifications found</td>
        </tr>
      `;
      return;
    }

    notifications.forEach((notification, index) => {
      const isChecked = notification.IsSelected === 1 || notification.IsSelected === true || notification.IsSelected === '1';
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><input type="checkbox" class="notification-checkbox" data-index="${index}" aria-label="Select notification" ${isChecked ? 'checked' : ''} disabled /></td>
        <td>${notification.NotificationID || notification.notificationId || '-'}</td>
        <td>${notification.NotificationType || notification.notificationType || '-'}</td>
        <td>${notification.NotificationMessage || notification.notificationMessage || '-'}</td>
      `;
      notificationsBody.appendChild(row);
    });
  }

  function setCheckboxesEnabled(enabled) {
    if (selectAllCheckbox) selectAllCheckbox.disabled = !enabled;
    if (notificationsBody) {
      notificationsBody.querySelectorAll('.notification-checkbox').forEach(cb => cb.disabled = !enabled);
    }
  }

  function wireSelectAll() {
    if (!selectAllCheckbox) return;

    selectAllCheckbox.addEventListener('change', () => {
      const checkboxes = notificationsBody.querySelectorAll('.notification-checkbox');
      checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
    });
  }

  function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.hidden = !show;
    }
  }

  // ========== Dropdown Population ==========
  async function loadNotificationFrequencies() {
    if (!frequencySelect) return;

    try {
      const options = await window.LookupService.getSystemCodeOptions('NotificationFreqID');
      
      // Clear existing options except the first placeholder
      frequencySelect.innerHTML = '<option value="">--Select--</option>';
      
      // Populate with fetched options
      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        frequencySelect.appendChild(option);
      });
    } catch (error) {
      console.error('Failed to load notification frequencies:', error);
    }
  }

  // ========== Button State Management ==========
  function setViewMode() {
    console.log('[AccountNotification] setViewMode called, buttons:', { btnEdit, btnSave, btnCancel });
    if (btnEdit) btnEdit.disabled = false;
    if (btnSave) btnSave.disabled = true;
    if (btnCancel) btnCancel.disabled = true;
    formInputs.forEach(el => el.disabled = true);
    setCheckboxesEnabled(false);
  }

  function setEditMode() {
    if (btnEdit) btnEdit.disabled = true;
    if (btnSave) btnSave.disabled = false;
    if (btnCancel) btnCancel.disabled = false;
    formInputs.forEach(el => el.disabled = false);
    setCheckboxesEnabled(true);
  }

  function wireActionButtons() {
    if (btnEdit) {
      btnEdit.addEventListener('click', () => setEditMode());
    }
    if (btnSave) {
      btnSave.addEventListener('click', () => saveNotifications());
    }
    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        // Reset checkboxes and reload
        loadNotifications();
        setViewMode();
      });
    }
  }

  // ========== Save Notifications ==========
  async function saveNotifications() {
    if (!window.AccountNotificationService) {
      console.error('[AccountNotification] AccountNotificationService not loaded!');
      showMessage('Service not available', 'error');
      return;
    }

    try {
      showLoading(true);

      // Get form values
      const frequency = frequencySelect?.value || '';
      const duration = dayOfMonthInput?.value || '';
      const executionDate = executionDateInput?.value || '';

      // Format execution date to ISO format if provided
      let formattedExecutionDate = '';
      if (executionDate) {
        formattedExecutionDate = new Date(executionDate).toISOString().split('.')[0];
      }

      // Build notifications array with selected items
      const notificationsToSave = [];
      const checkboxes = notificationsBody?.querySelectorAll('.notification-checkbox') || [];
      
      checkboxes.forEach((cb, index) => {
        if (loadedNotifications[index]) {
          const notification = { ...loadedNotifications[index] };
          notification.IsSelected = cb.checked;
          notification.NotificationFrequency = frequency;
          notification.NotificationDuration = duration;
          notification.ExecutionDate = formattedExecutionDate;
          notification.ButtonMark = 'A'; // A = Add/Edit
          notificationsToSave.push(notification);
        }
      });

      console.log('[AccountNotification] Saving notifications:', notificationsToSave);

      const response = await window.AccountNotificationService.saveNotificationSettings({
        notifications: notificationsToSave,
        ProductID: accountContext.ProductID || 'null',
        AccountID: accountContext.AccountID || 'null'
      });

      if (response.success) {
        showMessage('Notifications saved successfully', 'success');
        await loadNotifications(); // Reload data
        setViewMode();
      } else {
        showMessage(response.message || 'Failed to save notifications', 'error');
      }
    } catch (error) {
      console.error('[AccountNotification] Save error:', error);
      showMessage('Error saving notifications', 'error');
    } finally {
      showLoading(false);
    }
  }

  function showMessage(message, type = 'info') {
    const messagePanel = document.querySelector('.am-message-panel');
    if (messagePanel) {
      const icon = messagePanel.querySelector('i');
      const span = messagePanel.querySelector('span');
      
      // Update icon based on type
      if (icon) {
        icon.className = type === 'success' ? 'bi bi-check-circle' : 
                         type === 'error' ? 'bi bi-exclamation-triangle' : 'bi bi-info-circle';
      }
      if (span) span.textContent = message;
      
      // Remove all type classes and add the current type
      messagePanel.classList.remove('hidden', 'info', 'success', 'warning', 'error');
      messagePanel.classList.add('show', type);
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        messagePanel.classList.remove('show');
      }, 5000);
    }
  }

  // ========== Window Controls ==========
  function notifyParentFormOpened() {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ 
          action: 'submoduleOpened',
          source: 'Account Notification'
        }, '*');
      }
    } catch (error) {
      console.error('Error notifying parent of form open:', error);
    }
  }

  function closeChildForm() {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ 
          action: 'submoduleClosed',
          source: 'Account Notification'
        }, '*');
      } else {
        window.close();
      }
    } catch (error) {
      console.error('Error closing form:', error);
    }
  }

  function handleWindowAction(action, btn) {
    const windowEl = document.querySelector('.window');
    
    switch (action) {
      case 'refresh':
        document.querySelectorAll('[class*="invalid"]').forEach(el => {
          el.classList.remove(...Array.from(el.classList).filter(c => c.includes('invalid')));
        });
        window.location.reload();
        break;

      case 'maximize':
        if (windowEl) {
          const isMaximized = windowEl.classList.toggle('maximized');
          const icon = btn.querySelector('i');
          if (icon) {
            icon.className = isMaximized ? 'bi bi-fullscreen-exit' : 'bi bi-square';
          }
          btn.title = isMaximized ? 'Restore' : 'Maximize';
          btn.setAttribute('aria-label', isMaximized ? 'Restore window' : 'Maximize window');
          
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ 
              action: 'toggleSidebarForMaximize',
              maximize: isMaximized
            }, '*');
          }
        }
        break;

      case 'close':
        closeChildForm();
        break;
    }
  }

  function initWindowControls() {
    document.querySelectorAll('.am-btn[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.getAttribute('data-action');
        handleWindowAction(action, btn);
      });
    });
  }

  // ========== Initialize ==========
  async function init() {
    initDomElements(); // Initialize DOM elements first
    getContextFromStorage();
    getContextFromUrl();
    listenForParentContext();
    await loadNotificationFrequencies();
    await loadNotifications();
    wireActionButtons();
    wireSelectAll();
    initWindowControls();
    setViewMode(); // Start in view mode (only Edit active)
    notifyParentFormOpened();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
