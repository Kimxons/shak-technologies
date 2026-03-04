(function () {
  // ============================================
  // CONSTANTS
  // ============================================
  const MODULE_TYPE_ID = "A"; // 'A' = Account (SystemSubID letter code)
  const MODULE_ID = 1420;     // Account Blocking module (SmallInt)

  // ============================================
  // UTILITIES
  // ============================================
  function getParentFieldValue(fieldId) {
    try {
      // Try to get from parent's parent (account-maintenance level)
      let parentForm = window.parent?.document;
      let field = parentForm?.getElementById(fieldId);
      if (field?.value) return field.value;
      
      // Try grandparent if available
      parentForm = window.parent?.parent?.document;
      field = parentForm?.getElementById(fieldId);
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

  function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.hidden = !show;
  }

  function showMessage(message, type = 'info') {
    const panel = document.querySelector('.am-message-panel');
    const span = panel?.querySelector('span');
    const icon = panel?.querySelector('i');
    
    if (panel && span) {
      span.textContent = message;
      panel.classList.remove('am-message-panel--success', 'am-message-panel--error', 'am-message-panel--info');
      
      if (type === 'success') {
        panel.classList.add('am-message-panel--success');
        if (icon) icon.className = 'bi bi-check-circle';
      } else if (type === 'error' || type === 'danger') {
        panel.classList.add('am-message-panel--error');
        if (icon) icon.className = 'bi bi-exclamation-circle';
      } else {
        panel.classList.add('am-message-panel--info');
        if (icon) icon.className = 'bi bi-info-circle';
      }
      
      panel.hidden = false;
    }
  }

  // ============================================
  // HEADER UPDATE
  // ============================================
  function updateHeader() {
    const branchId = getParentFieldValue('branchId') || getParentFieldValue('BranchID') || getOurBranchId();
    const accountId = getParentFieldValue('accountId') || getParentFieldValue('AccountID') || '';
    const clientName = getParentFieldValue('clientName') || getParentFieldValue('ClientName') || '';
    
    const headerTitle = document.getElementById('headerTitle');
    if (headerTitle && accountId) {
      headerTitle.textContent = `${branchId} : ${accountId} : ${clientName}`;
    }
  }

  // ============================================
  // DATA LOADING
  // ============================================
  function loadBlockingHistory() {
    const accountId = getParentFieldValue('accountId') || getParentFieldValue('AccountID');
    const branchId = getParentFieldValue('branchId') || getParentFieldValue('BranchID') || getOurBranchId();
    const BlockingUnblockingService = window.BlockingUnblockingService;

    if (!accountId || !BlockingUnblockingService) {
      console.log('[Blocking History] Missing account ID or service - skipping data load');
      showMessage('Unable to load history - missing account information', 'error');
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

    BlockingUnblockingService.getBlockingHistory(requestData)
      .then(response => {
        showLoading(false);
        console.log('[Blocking History] Response:', response);

        if (response && response.success) {
          // Response has Details array with blocking history
          const historyData = response.data?.Details || response.Details || [];
          populateHistoryTable(historyData);
          
          if (historyData.length > 0) {
            showMessage(`Loaded ${historyData.length} history record(s)`, 'success');
          } else {
            showMessage('No blocking/unblocking history found', 'info');
          }
        } else {
          showMessage(response?.message || 'Failed to load blocking history', 'error');
        }
      })
      .catch(error => {
        showLoading(false);
        showMessage(error.message || 'Error loading blocking history', 'error');
        console.error('[Blocking History] Error:', error);
      });
  }

  function populateHistoryTable(historyData) {
    const tableBody = document.getElementById('historyTableBody');
    const noDataEl = document.getElementById('historyNoData');
    const tableContainer = tableBody?.closest('.table-container');

    // Clear existing rows
    if (tableBody) {
      tableBody.innerHTML = '';
    }

    // Always show table, hide separate no-data element
    if (noDataEl) noDataEl.hidden = true;
    if (tableContainer) tableContainer.hidden = false;

    if (!historyData || historyData.length === 0) {
      // Show empty row with message
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `
        <td colspan="9" class="text-center text-muted py-4">
          <i class="bi bi-inbox fs-4 d-block mb-2"></i>
          There are no items to be displayed
        </td>
      `;
      tableBody.appendChild(emptyRow);
    } else {
      historyData.forEach((record, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="row-num">${index + 1}</td>
          <td>${formatDate(record.BlockedDate)}</td>
          <td>${record.BlockedReason || ''}</td>
          <td>${record.BlockedDescription || ''}</td>
          <td>${record.BlockedInstructionBy || ''}</td>
          <td>${formatDate(record.UnBlockedDate)}</td>
          <td>${record.UnBlockedReason || ''}</td>
          <td>${record.UnBlockedDescription || ''}</td>
          <td>${record.UnBlockedInstructionBy || ''}</td>
        `;
        tableBody.appendChild(row);
      });
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  function initializeForm() {
    console.log('[Blocking History] Initializing form');
    
    // Update header with account info
    updateHeader();
    
    // Load history data
    loadBlockingHistory();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeForm);
  } else {
    initializeForm();
  }
})();
