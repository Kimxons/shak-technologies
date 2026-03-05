(function () {
  let isAddMode = false;
  let isEditMode = false;
  let currentChequeRequest = null;
  let currentChequeBook = null;
  
  // ============================================================================
  // STATE - SearchModal instances for Branch and Account lookup
  // ============================================================================
  const state = {
    branchSearchModal: null,
    accountSearchModal: null,
    context: {
      OurBranchID: '',
      AccountID: '',
      AccountTypeID: '',
      OperatorID: 'CSADM'
    }
  };

  function postClose() {
    try {
      window.parent.postMessage({ type: 'accountMaintenanceChildClose' }, '*');
    } catch (_) {
      // ignore
    }
  }

  // ============================================================================
  // TOAST NOTIFICATION SYSTEM (matching modern-account-maintenance.js)
  // ============================================================================
  function ensureToastContainer() {
    let el = document.querySelector('[data-kairo-toast-container]');
    if (el) return el;
    el = document.createElement('div');
    el.className = 'kairo-toast-container';
    el.setAttribute('data-kairo-toast-container', '');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(el);
    return el;
  }

  function showToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
    const container = ensureToastContainer();

    const toast = document.createElement('div');
    toast.className = `kairo-toast kairo-toast--${variant}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-atomic', 'true');

    const body = document.createElement('div');
    body.className = 'kairo-toast__body';
    body.textContent = String(message || '');

    const remove = () => {
      try {
        toast.classList.remove('is-show');
        setTimeout(() => toast.remove(), 160);
      } catch {
        // ignore
      }
    };

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'kairo-toast__close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '<i class="bi bi-x"></i>';
    closeBtn.addEventListener('click', remove);

    toast.appendChild(body);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('is-show'), 0);
    if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
  }

  function showSuccessToast(message) {
    showToast(message, { variant: 'success', timeoutMs: 4000 });
  }

  function showErrorToast(message) {
    showToast(message, { variant: 'danger', timeoutMs: 6000 });
  }

  function showWarningToast(message) {
    showToast(message, { variant: 'warning', timeoutMs: 5000 });
  }

  function showInfoToast(message) {
    showToast(message, { variant: 'info', timeoutMs: 4000 });
  }

  // Legacy message function - redirect to toast
  function showMessage(message, type = 'info') {
    const variantMap = {
      success: 'success',
      error: 'danger',
      warning: 'warning',
      info: 'info'
    };
    showToast(message, { variant: variantMap[type] || 'info' });
  }

  function setMinimized(isMinimized) {
    var root = document.querySelector('[data-cb-window]');
    if (!root) return;
    root.classList.toggle('cb-window--minimized', Boolean(isMinimized));
  }

  function doRefresh() {
    try {
      window.location.reload();
    } catch (_) {
      // ignore
    }
  }

  function wireTitleBar() {
    var btnClose = document.querySelector('[data-cb-close]');
    var btnMin = document.querySelector('[data-cb-minimize]');
    var btnRefresh = document.querySelector('[data-cb-refresh]');

    if (btnClose) btnClose.addEventListener('click', postClose);

    if (btnMin) {
      btnMin.addEventListener('click', function () {
        var root = document.querySelector('[data-cb-window]');
        var minimized = root && root.classList.contains('cb-window--minimized');
        setMinimized(!minimized);
      });
    }

    if (btnRefresh) btnRefresh.addEventListener('click', doRefresh);
  }

  function wireTabs() {
    // Wire up the cheque books / requests tabs
    const tabButtons = document.querySelectorAll('.de-tab[data-tab]');
    const tabPanels = document.querySelectorAll('.de-tab-panel[data-panel]');
    
    tabButtons.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        const targetPanel = btn.getAttribute('data-tab');
        
        // Update active tab
        tabButtons.forEach(function (b) {
          b.classList.remove('is-active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
        
        // Show/hide panels
        tabPanels.forEach(function (panel) {
          const panelName = panel.getAttribute('data-panel');
          panel.hidden = (panelName !== targetPanel);
        });
      });
    });
  }

  function toggleFields(enabled) {
    // Cheque Request section fields - these are the editable fields
    const editableFieldIds = ['bookType', 'chequeStart'];
    // Fields that are auto-computed based on book type (readonly but need to reflect state)
    const autoComputedFieldIds = ['noOfLeaves', 'chequePrefix', 'chequeEnd'];
    // Always readonly fields
    const alwaysReadonlyIds = ['issueDate', 'branchId', 'branchName', 'accountId', 'accountName', 
                                'clientId', 'clientName', 'productId', 'productName',
                                'address1', 'address2', 'city', 'country', 
                                'phoneHome', 'phoneWork', 'faxNo', 'mobile'];

    // Enable/disable editable fields
    editableFieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = !enabled;
    });

    // Auto-computed fields: disable when not in edit mode, but keep their readonly state
    autoComputedFieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = !enabled;
    });

    // Ensure always-readonly fields stay disabled
    alwaysReadonlyIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = true;
    });
  }

  function onAdd() {
    isAddMode = true;
    isEditMode = false;
    
    // Clear cheque request fields but keep account identification
    clearChequeRequestFields();
    
    // Enable fields for editing
    toggleFields(true);
    
    // Set issue date from working date
    setIssueDateFromWorkingDate();
    
    // Update button states for add mode
    setButtonStatesForAddMode();
    
    updateStatusBar('Add Mode - Enter cheque book details');
    console.log('[ChequeBook] Entered Add Mode');
  }

  function onEdit() {
    isEditMode = true;
    isAddMode = false;
    
    // Enable fields for editing
    toggleFields(true);
    
    // Update button states for edit mode
    setButtonStatesForEditMode();
    
    updateStatusBar('Edit Mode - Modify cheque book details');
    console.log('[ChequeBook] Entered Edit Mode');
  }

  function clearChequeRequestFields() {
    // Clear only cheque request section fields, not account identification
    const fieldsToClear = ['bookType', 'noOfLeaves', 'chequePrefix', 'chequeStart', 'chequeEnd'];
    fieldsToClear.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  function formatDateTime(date) {
    // smalldatetime format: YYYY-MM-DD HH:MM:SS (or appropriate format for backend)
    // Based on previous requests, standard JS date string or specific format.
    // Let's use MM/DD/YYYY HH:MM:SS as used in Client Address
    const pad = (n) => n.toString().padStart(2, '0');
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const yyyy = date.getFullYear();
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${mm}/${dd}/${yyyy} ${hh}:${min}:${ss}`;
  }

  async function onSave() {
    const saveBtn = document.querySelector('[data-action="save"]');
    if (saveBtn) saveBtn.disabled = true;

    try {
      const branchId = document.getElementById('branchId').value;
      const accountId = document.getElementById('accountId').value;
      const bookType = document.getElementById('bookType').value;
      const chequeStart = document.getElementById('chequeStart').value;
      const chequeEnd = document.getElementById('chequeEnd').value;
      const prefix = document.getElementById('chequePrefix').value;
      const leaves = document.getElementById('noOfLeaves').value;
      const issueDate = document.getElementById('issueDate').value;

      // Validation: Ensure required fields are filled
      if (!leaves || leaves.trim() === '') {
        showErrorToast('No Of Leaves is required.');
        if (saveBtn) saveBtn.disabled = false;
        return;
      }
      if (!prefix || prefix.trim() === '') {
        showErrorToast('Cheque Prefix is required.');
        if (saveBtn) saveBtn.disabled = false;
        return;
      }
      if (!chequeStart || chequeStart.trim() === '') {
        showErrorToast('Cheque Start is required.');
        if (saveBtn) saveBtn.disabled = false;
        return;
      }
      if (!chequeEnd || chequeEnd.trim() === '') {
        showErrorToast('Cheque End is required.');
        if (saveBtn) saveBtn.disabled = false;
        return;
      }

      // Get operator ID from context (CSADM default)
      const operatorId = state.context.OperatorID || 'CSADM';
      const now = new Date();
      const timestamp = formatDateTime(now);

      // Determine if this is a new record or edit
      const isNewRecord = isAddMode;
      const existingRequest = currentChequeRequest || currentChequeBook;


      const payload = {
        OurBranchID: branchId,
        AccountTypeID:  'C',
        AccountID: accountId,
        ChequeRequestsID: isNewRecord ? '0' : (existingRequest?.ChequeRequestsID || existingRequest?.RequestReferenceNo || '0'),
        ChequeStart: parseInt(chequeStart || '0'),
        ChequeEnd: parseInt(chequeEnd || '0'),
        ChequePrefix: prefix,
        BookTypeID: bookType,
        NoOfLeaves: parseInt(leaves || '0'),
        DateIssued: issueDate || timestamp,
        CreatedBy: isNewRecord ? 'CSADM' : (existingRequest?.CreatedBy || 'CSADM'),
        CreatedOn: isNewRecord ? timestamp : (existingRequest?.CreatedOn || ''),
        ModifiedBy: 'CSADM',
        ModifiedOn: timestamp,
        SupervisedBy: existingRequest?.SupervisedBy || '',
        RequestDate: isNewRecord ? timestamp : (existingRequest?.RequestDate || ''),
        ChequeRequestStatusID: existingRequest?.ChequeRequestStatusID || 'APP',
        ApprovedBy: existingRequest?.ApprovedBy || '',
        ApprovedOn: existingRequest?.ApprovedOn || '',
        DispatchedBy: existingRequest?.DispatchedBy || '',
        DispatchedOn: existingRequest?.DispatchedOn || '',
        UpdateCount: isNewRecord ? 2 : ((existingRequest?.UpdateCount || 0) + 1),
        NewRecord: isNewRecord ? 1 : 0
      };

      console.log('[ChequeBook] Saving payload:', payload);

      if (window.ChequeBookService) {
        const response = await window.ChequeBookService.addEditChequeBookRequests(payload);
        if (response.success) {
          showSuccessToast(isNewRecord ? 'Cheque Book Request created successfully!' : 'Cheque Book Request updated successfully!');
          // Reset state and refresh
          isAddMode = false;
          isEditMode = false;
          toggleFields(false);
          // Refresh the view to show updated data
          await onView();
        } else {
          showErrorToast('Failed to save: ' + (response.message || 'Unknown error'));
          if (saveBtn) saveBtn.disabled = false;
        }
      } else {
        console.error('[ChequeBook] ChequeBookService not found');
        showErrorToast('Service unavailable');
        if (saveBtn) saveBtn.disabled = false;
      }

    } catch (e) {
      console.error('[ChequeBook] Save error:', e);
      showErrorToast('An error occurred while saving.');
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  // ============================================================================
  // APPROVE - Approve selected cheque book request
  // ============================================================================
  async function onApprove() {
    // Validate that a cheque request is selected
    if (!currentChequeRequest) {
      showWarningToast('Please select a cheque request to approve.');
      return;
    }

    // Check if already approved
    if (currentChequeRequest.ApprovedBy && currentChequeRequest.ApprovedBy.trim()) {
      showWarningToast('This request has already been approved.');
      return;
    }

    const approveBtn = document.querySelector('[data-action="approve"]');
    if (approveBtn) approveBtn.disabled = true;

    try {
      const branchId = document.getElementById('branchId').value;
      const accountId = document.getElementById('accountId').value;

      // Get operator ID and current timestamp
      const operatorId = state.context.OperatorID || 'CSADM';
      const now = new Date();
      const timestamp = formatDateTime(now);

      // Build payload with approval info - using same stored procedure as save
      // Key fields for approval: ChequeRequestStatusID='RDY', ApprovedBy, ApprovedOn
      // NOTE: SP uses ISNULL(@field,'') WHEN '' THEN NULL - empty string = NULL
      const payload = {
        OurBranchID: branchId,
        AccountTypeID: 'C',
        AccountID: accountId,
        ChequeRequestsID: currentChequeRequest.ChequeRequestsID || currentChequeRequest.RequestReferenceNo || '0',
        ChequeStart: parseInt(currentChequeRequest.ChequeStart || '0'),
        ChequeEnd: parseInt(currentChequeRequest.ChequeEnd || '0'),
        ChequePrefix: currentChequeRequest.ChequePrefix || '',
        BookTypeID: currentChequeRequest.BookTypeID || '',
        NoOfLeaves: parseInt(currentChequeRequest.NoOfLeaves || '0'),
        DateIssued: currentChequeRequest.DateIssued || '',
        CreatedBy: currentChequeRequest.CreatedBy || '',
        CreatedOn: currentChequeRequest.CreatedOn || '',
        ModifiedBy: 'CSADM',
        ModifiedOn: timestamp,
        SupervisedBy: '', // Supervisor is the approver
        RequestDate: currentChequeRequest.RequestDate || '',
        ChequeRequestStatusID: 'RDY', // Status changes to Ready on approval
        ApprovedBy: 'CSADM', // Approver
        ApprovedOn: timestamp,
        DispatchedBy: currentChequeRequest.DispatchedBy || '',
        DispatchedOn: currentChequeRequest.DispatchedOn || '',
        NewRecord: 0 // Not a new record
      };

      console.log('[ChequeBook] Approsve payload:', payload);

      if (window.ChequeBookService) {
        const response = await window.ChequeBookService.addEditChequeBookRequests(payload);
        if (response.success) {
          showSuccessToast('Cheque Book Request approved successfully!');
          // Reset selection and refresh view
          currentChequeRequest = null;
          await onView();
        } else {
          showErrorToast('Failed to approve: ' + (response.message || 'Unknown error'));
          if (approveBtn) approveBtn.disabled = false;
        }
      } else {
        console.error('[ChequeBook] ChequeBookService not found');
        showErrorToast('Service unavailable');
        if (approveBtn) approveBtn.disabled = false;
      }

    } catch (e) {
      console.error('[ChequeBook] Approve error:', e);
      showErrorToast('An error occurred while approving.');
      if (approveBtn) approveBtn.disabled = false;
    }
  }

  // ============================================================================
  // DISPATCH - Dispatch approved cheque book
  // ============================================================================
  async function onDispatch() {
    // Validate that a cheque request is selected
    if (!currentChequeRequest) {
      showWarningToast('Please select a cheque request to dispatch.');
      return;
    }

    // Check if approved
    if (!currentChequeRequest.ApprovedBy || !currentChequeRequest.ApprovedBy.trim()) {
      showWarningToast('This request must be approved before dispatch.');
      return;
    }

    // Check if already dispatched
    if (currentChequeRequest.DispatchedBy && currentChequeRequest.DispatchedBy.trim()) {
      showWarningToast('This request has already been dispatched.');
      return;
    }

    const dispatchBtn = document.querySelector('[data-action="dispatch"]');
    if (dispatchBtn) dispatchBtn.disabled = true;

    try {
      const branchId = document.getElementById('branchId').value;
      const accountId = document.getElementById('accountId').value;

      // Get operator ID and current timestamp
      const operatorId = state.context.OperatorID || 'CSADM';
      const now = new Date();
      const timestamp = formatDateTime(now);

      // Build payload with dispatch info
      // Key fields for dispatch: ChequeRequestStatusID='ISD', DispatchedBy, DispatchedOn
      // NOTE: SP uses ISNULL(@field,'') WHEN '' THEN NULL - empty string = NULL
      const payload = {
        OurBranchID: branchId,
        AccountTypeID: 'C',
        AccountID: accountId,
        ChequeRequestsID: currentChequeRequest.ChequeRequestsID || currentChequeRequest.RequestReferenceNo || '',
        ChequeStart: parseInt(currentChequeRequest.ChequeStart || '0'),
        ChequeEnd: parseInt(currentChequeRequest.ChequeEnd || '0'),
        ChequePrefix: currentChequeRequest.ChequePrefix || '',
        BookTypeID: currentChequeRequest.BookTypeID || '',
        NoOfLeaves: parseInt(currentChequeRequest.NoOfLeaves || '0'),
        DateIssued: currentChequeRequest.DateIssued || '',
        CreatedBy: currentChequeRequest.CreatedBy || '',
        CreatedOn: currentChequeRequest.CreatedOn || '',
        ModifiedBy: 'CSADM', // Empty = NULL per SP logic
        ModifiedOn: timestamp, // Empty = NULL per SP logic
        SupervisedBy: 'CSADM', // Empty = NULL per SP logic
        RequestDate: '', // Empty = NULL per SP logic
        ChequeRequestStatusID: 'ISD', // Status changes to Issued/Dispatched
        ApprovedBy: currentChequeRequest.ApprovedBy || '',
        ApprovedOn: currentChequeRequest.ApprovedOn || '',
        DispatchedBy: 'CSADM',
        DispatchedOn: timestamp,
        NewRecord: 0 // Not a new record
      };

      console.log('[ChequeBook] Dispatch payload:', payload);

      if (window.ChequeBookService) {
        const response = await window.ChequeBookService.addEditChequeBookRequests(payload);
        if (response.success) {
          showSuccessToast('Cheque Book dispatched successfully!');
          // Reset selection and refresh view
          currentChequeRequest = null;
          await onView();
        } else {
          showErrorToast('Failed to dispatch: ' + (response.message || 'Unknown error'));
          if (dispatchBtn) dispatchBtn.disabled = false;
        }
      } else {
        console.error('[ChequeBook] ChequeBookService not found');
        showErrorToast('Service unavailable');
        if (dispatchBtn) dispatchBtn.disabled = false;
      }

    } catch (e) {
      console.error('[ChequeBook] Dispatch error:', e);
      showErrorToast('An error occurred while dispatching.');
      if (dispatchBtn) dispatchBtn.disabled = false;
    }
  }

  function wireActions() {
    const btnAdd = document.querySelector('[data-action="add"]');
    const btnEdit = document.querySelector('[data-action="edit"]');
    const btnSave = document.querySelector('[data-action="save"]');
    const btnCancel = document.querySelector('[data-action="cancel"]');
    const btnView = document.querySelector('[data-action="view"]');
    const btnApprove = document.querySelector('[data-action="approve"]');
    const btnDispatch = document.querySelector('[data-action="dispatch"]');

    if (btnView) btnView.addEventListener('click', onView);
    if (btnAdd) btnAdd.addEventListener('click', onAdd);
    if (btnEdit) btnEdit.addEventListener('click', onEdit);
    if (btnSave) btnSave.addEventListener('click', onSave);
    if (btnApprove) btnApprove.addEventListener('click', onApprove);
    if (btnDispatch) btnDispatch.addEventListener('click', onDispatch);
    if (btnCancel) btnCancel.addEventListener('click', function () {
      toggleFields(false);
      clearChequeRequestFields();
      isAddMode = false;
      isEditMode = false;
      currentChequeRequest = null;
      // Reset buttons based on whether we have data
      setButtonStatesAfterCancel();
      updateStatusBar('Ready');
    });
  }

  // ============================================================================
  // VIEW - Fetch cheque books AND cheque book requests for the selected account
  // ============================================================================
  async function onView() {
    const branchId = document.getElementById('branchId')?.value?.trim();
    const accountId = document.getElementById('accountId')?.value?.trim();

    // Validate required fields
    if (!branchId) {
      showWarningToast('Please enter a Branch ID.');
      document.getElementById('branchId')?.focus();
      return;
    }

    if (!accountId) {
      showWarningToast('Please enter an Account ID.');
      document.getElementById('accountId')?.focus();
      return;
    }

    // Show loading state
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.hidden = false;
    updateStatusBar('Loading cheque book data...');

    try {
      // Check if ChequeBookService is available
      if (!window.ChequeBookService) {
        throw new Error('ChequeBookService not available');
      }

      // Update context
      state.context.OurBranchID = branchId;
      state.context.AccountID = accountId;

      // Prepare request data for Cheque Books (p_GetChequeBooks)
      const chequeBooksRequestData = {
        OurBranchID: branchId,
        AccountTypeID:  'C',
        AccountID: accountId,
        RequestReferenceNo: '0', // Empty to get all
        OperatorID: state.context.OperatorID || 'CSADM',
        Direction: 0 // Forward/all
      };

      // Prepare request data for Cheque Book Requests (p_GetChequeBookRequests)
      const chequeRequestsRequestData = {
        OurBranchID: branchId,
        AccountTypeID:  'C',
        AccountID: accountId,
        ChequeRequestsID: '', // Empty to get all
        OperatorID: state.context.OperatorID || 'CSADM',
        Direction: 0 // Forward/all
      };

      console.log('[ChequeBook] Fetching cheque books:', chequeBooksRequestData);
      console.log('[ChequeBook] Fetching cheque book requests:', chequeRequestsRequestData);

      // Call both APIs in parallel
      const [chequeBooksResponse, chequeRequestsResponse] = await Promise.all([
        window.ChequeBookService.getChequeBooks(chequeBooksRequestData),
        window.ChequeBookService.getChequeBookRequests(chequeRequestsRequestData)
      ]);

      console.log('[ChequeBook] Cheque Books Response:', chequeBooksResponse);
      console.log('[ChequeBook] Cheque Requests Response:', chequeRequestsResponse);

      let totalBooks = 0;
      let totalRequests = 0;

      // Process Cheque Books response
      // API returns cheque books in data.Details03, account info in Details01
      if (chequeBooksResponse.success) {
        const booksData = chequeBooksResponse.data || chequeBooksResponse.Details || chequeBooksResponse.result || {};
        
        // Cheque books are in Details03 per the API response structure
        const chequeBooks = booksData.Details03 || booksData.ChequeBooks || [];
        renderChequeBooks(Array.isArray(chequeBooks) ? chequeBooks : [chequeBooks]);
        totalBooks = Array.isArray(chequeBooks) ? chequeBooks.length : (chequeBooks ? 1 : 0);
        
        // Populate account details from Details01 (account info)
        if (booksData.Details01 && booksData.Details01.length > 0) {
          populateAccountDetailsFromDetails01(booksData.Details01[0]);
        }
        
        // Also check Details02 for additional info (cheque request details)
        if (booksData.Details02 && booksData.Details02.length > 0) {
          // Store cheque request details for reference
          console.log('[ChequeBook] Cheque request details (Details02):', booksData.Details02);
        }
      } else {
        console.warn('[ChequeBook] Failed to load cheque books:', chequeBooksResponse.message);
        renderChequeBooks([]);
      }

      // Process Cheque Book Requests response
      if (chequeRequestsResponse.success) {
        const requestsData = chequeRequestsResponse.data || chequeRequestsResponse.Details || chequeRequestsResponse.result || {};
        const chequeRequests = requestsData.ChequeRequests || requestsData.Details01 || requestsData.SearchResults || [];
        renderChequeRequests(Array.isArray(chequeRequests) ? chequeRequests : [chequeRequests]);
        totalRequests = Array.isArray(chequeRequests) ? chequeRequests.length : (chequeRequests ? 1 : 0);
      } else {
        console.warn('[ChequeBook] Failed to load cheque requests:', chequeRequestsResponse.message);
        renderChequeRequests([]);
      }

      // Update button states after successful view based on results
      const hasResults = totalBooks > 0 || totalRequests > 0;
      setButtonStatesAfterView(hasResults);
      
      showSuccessToast(`Loaded ${totalBooks} cheque book(s) and ${totalRequests} request(s)`);
      updateStatusBar(`Account ${accountId} - ${totalBooks} book(s), ${totalRequests} request(s)`);

    } catch (error) {
      console.error('[ChequeBook] View error:', error);
      showErrorToast('Error loading cheque book data: ' + (error.message || error));
      updateStatusBar('Error: ' + (error.message || 'Unknown error'));
    } finally {
      if (loadingOverlay) loadingOverlay.hidden = true;
    }
  }

  // ============================================================================
  // RENDER CHEQUE BOOKS TABLE
  // ============================================================================
  function renderChequeBooks(books) {
    const tbody = document.getElementById('chequeBookTableBody');
    if (!tbody) return;

    if (!books || books.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-4 text-muted">
            <i class="bi bi-journal-x fs-3 d-block mb-2"></i>
            <span>No cheque books found</span>
          </td>
        </tr>
      `;
      return;
    }

    // Fields from API: ChequeStart, ChequeEnd, ChequePrefix, NoOfLeaves, DateIssued, Paid, Stopped, Returned
    tbody.innerHTML = books.map((book, idx) => `
      <tr data-index="${idx}" style="cursor: pointer;">
        <td>${book.ChequeStart ?? '-'}</td>
        <td>${book.ChequeEnd ?? '-'}</td>
        <td>${book.ChequePrefix || '-'}</td>
        <td>${book.NoOfLeaves ?? '-'}</td>
        <td>${formatDate(book.DateIssued)}</td>
        <td>${book.Paid ?? 0}</td>
        <td>${book.Stopped ?? 0}</td>
        <td>${book.Returned ?? 0}</td>
      </tr>
    `).join('');

    // Wire row selection (click on row to select)
    tbody.querySelectorAll('tr[data-index]').forEach(row => {
      row.addEventListener('click', () => {
        const index = parseInt(row.dataset.index, 10);
        selectChequeBook(books[index], index);
      });
    });
  }

  // ============================================================================
  // RENDER CHEQUE REQUESTS TABLE
  // ============================================================================
  function renderChequeRequests(requests) {
    const tbody = document.getElementById('chequeRequestTableBody');
    if (!tbody) return;

    if (!requests || requests.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-muted">
            <i class="bi bi-file-earmark-x fs-3 d-block mb-2"></i>
            <span>No cheque requests found</span>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = requests.map((req, idx) => `
      <tr data-index="${idx}" style="cursor: pointer;">
        <td>${req.NoOfLeaves || req.Leaves || '-'}</td>
        <td>${req.ChequeStart || req.Start || '-'}</td>
        <td>${req.ChequeEnd || req.End || '-'}</td>
        <td>${formatDate(req.DateIssued || req.IssueDate)}</td>
        <td>${req.ApprovedBy || '-'}</td>
        <td>${formatDate(req.ApprovedOn)}</td>
        <td>${req.DispatchedBy || '-'}</td>
      </tr>
    `).join('');

    // Wire row selection (click on row to select)
    tbody.querySelectorAll('tr[data-index]').forEach(row => {
      row.addEventListener('click', () => {
        const index = parseInt(row.dataset.index, 10);
        selectChequeRequest(requests[index], index);
      });
    });
  }

  // ============================================================================
  // SELECT CHEQUE BOOK - Populate form with selected cheque book
  // ============================================================================
  function selectChequeBook(book, rowIndex) {
    console.log('[ChequeBook] Selected cheque book:', book);
    
    // Store current selected cheque book for edit operations
    currentChequeBook = book;
    currentChequeRequest = null; // Clear any selected request
    
    // Populate cheque request section with selected book data
    // Fields from API: ChequeStart, ChequeEnd, ChequePrefix, NoOfLeaves, DateIssued, Paid, Stopped, Returned
    const issueDate = document.getElementById('issueDate');
    const noOfLeaves = document.getElementById('noOfLeaves');
    const chequePrefix = document.getElementById('chequePrefix');
    const chequeStart = document.getElementById('chequeStart');
    const chequeEnd = document.getElementById('chequeEnd');
    const bookType = document.getElementById('bookType');
    
    if (issueDate) issueDate.value = formatDate(book.DateIssued) || '';
    if (noOfLeaves) noOfLeaves.value = book.NoOfLeaves ?? '';
    if (chequePrefix) chequePrefix.value = book.ChequePrefix || '';
    if (chequeStart) chequeStart.value = book.ChequeStart ?? '';
    if (chequeEnd) chequeEnd.value = book.ChequeEnd ?? '';
    
    // Try to set book type based on NoOfLeaves
    if (bookType && book.NoOfLeaves) {
      const leavesValue = String(book.NoOfLeaves);
      // Find option with matching value (SubCodeID = number of leaves)
      const matchingOption = Array.from(bookType.options).find(opt => opt.value === leavesValue);
      if (matchingOption) {
        bookType.value = leavesValue;
      }
    }
    
    // Update behind the scene section
    updateBehindTheScene(book);
    
    // Cheque books (Details03) don't have approval/dispatch info - disable those buttons
    const approveBtn = document.querySelector('[data-action="approve"]');
    const dispatchBtn = document.querySelector('[data-action="dispatch"]');
    if (approveBtn) approveBtn.disabled = true;
    if (dispatchBtn) dispatchBtn.disabled = true;
    
    // Highlight selected row in cheque books table
    highlightSelectedRow('chequeBookTableBody', rowIndex);
    
    // Update status bar
    updateStatusBar(`Cheque Book selected: ${book.ChequeStart} - ${book.ChequeEnd}`);
    
    console.log('[ChequeBook] Form populated from cheque book. Click Edit to modify.');
  }

  // ============================================================================
  // HIGHLIGHT SELECTED ROW IN TABLE
  // ============================================================================
  function highlightSelectedRow(tableBodyId, rowIndex) {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) return;
    
    // Remove highlight from all rows in both tables
    document.querySelectorAll('#chequeBookTableBody tr, #chequeRequestTableBody tr').forEach(row => {
      row.classList.remove('table-active', 'selected');
    });
    
    // Find and highlight the specific row by index
    const targetRow = tbody.querySelector(`tr[data-index="${rowIndex}"]`);
    if (targetRow) {
      targetRow.classList.add('table-active', 'selected');
    }
  }

  // ============================================================================
  // SELECT CHEQUE REQUEST - Populate form with selected request
  // ============================================================================
  function selectChequeRequest(request, rowIndex) {
    console.log('[ChequeBook] Selected cheque request:', request);
    
    // Store current selected request for edit/delete operations
    currentChequeRequest = request;
    currentChequeBook = null; // Clear any selected cheque book
    
    // Populate cheque request section
    const issueDate = document.getElementById('issueDate');
    const noOfLeaves = document.getElementById('noOfLeaves');
    const chequePrefix = document.getElementById('chequePrefix');
    const chequeStart = document.getElementById('chequeStart');
    const chequeEnd = document.getElementById('chequeEnd');
    
    if (issueDate) issueDate.value = formatDate(request.DateIssued || request.IssueDate) || '';
    if (noOfLeaves) noOfLeaves.value = request.NoOfLeaves || request.Leaves || '';
    if (chequePrefix) chequePrefix.value = request.ChequePrefix || request.Prefix || '';
    if (chequeStart) chequeStart.value = request.ChequeStart || request.Start || '';
    if (chequeEnd) chequeEnd.value = request.ChequeEnd || request.End || '';
    
    // Update behind the scene
    updateBehindTheScene(request);
    
    // Highlight selected row in cheque requests table
    highlightSelectedRow('chequeRequestTableBody', rowIndex);
    
    // Enable/disable Approve and Dispatch buttons based on request status
    const approveBtn = document.querySelector('[data-action="approve"]');
    const dispatchBtn = document.querySelector('[data-action="dispatch"]');
    
    // Approve button: enabled if NOT yet approved (ApprovedBy is empty/null)
    if (approveBtn) {
      const isApproved = !!(request.ApprovedBy && request.ApprovedBy.trim());
      approveBtn.disabled = isApproved;
      console.log('[ChequeBook] Approve button:', isApproved ? 'disabled (already approved)' : 'enabled');
    }
    
    // Dispatch button: enabled if status is 'RDY' (Ready) AND not yet dispatched
    if (dispatchBtn) {
      const isReady = request.ChequeRequestStatusID === 'RDY';
      const isDispatched = !!(request.DispatchedBy && request.DispatchedBy.trim());
      dispatchBtn.disabled = !isReady || isDispatched;
      console.log('[ChequeBook] Dispatch button:', (!isReady || isDispatched) ? 'disabled' : 'enabled', 
        { isReady, isDispatched, statusID: request.ChequeRequestStatusID });
    }
    
    // Update status bar
    updateStatusBar(`Cheque Request selected: ${request.ChequeStart || '-'} - ${request.ChequeEnd || '-'}`);
  }

  // ============================================================================
  // UPDATE BEHIND THE SCENE SECTION
  // ============================================================================
  function updateBehindTheScene(data) {
    const setValue = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value || '-';
    };
    
    setValue('currencyId', data.CurrencyID || data.Currency);
    setValue('approvedBy', data.ApprovedBy);
    setValue('approvedOn', formatDate(data.ApprovedOn));
    setValue('dispatchedBy', data.DispatchedBy);
    setValue('dispatchedOn', formatDate(data.DispatchedOn));
    setValue('MakerID', data.CreatedBy || data.MakerID);
    setValue('MakerDT', formatDate(data.CreatedOn || data.MakerDT));
    setValue('ModifierID', data.ModifiedBy || data.ModifierID);
    setValue('ModifierDT', formatDate(data.ModifiedOn || data.ModifierDT));
    setValue('CheckerID', data.SupervisedBy || data.CheckerID);
    setValue('CheckerDT', formatDate(data.SupervisedOn || data.CheckerDT));
  }

  // ============================================================================
  // POPULATE ACCOUNT DETAILS
  // ============================================================================
  function populateAccountDetails(details) {
    if (!details) return;
    
    const setValue = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value || '';
    };
    
    setValue('clientId', details.ClientID);
    setValue('clientName', details.ClientName);
    setValue('productId', details.ProductID);
    setValue('productName', details.ProductName);
    setValue('address1', details.Address1);
    setValue('address2', details.Address2);
    setValue('city', details.City);
    setValue('country', details.Country);
    setValue('phoneHome', details.PhoneHome || details.TelephoneHome);
    setValue('phoneWork', details.PhoneWork || details.TelephoneWork);
    setValue('faxNo', details.FaxNo || details.Fax);
    setValue('mobile', details.Mobile || details.CellPhone);
  }

  // ============================================================================
  // POPULATE ACCOUNT DETAILS FROM DETAILS01 (API Response format)
  // ============================================================================
  function populateAccountDetailsFromDetails01(details) {
    if (!details) return;
    
    console.log('[ChequeBook] Populating account details from Details01:', details);
    
    const setValue = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value || '';
    };
    
    // Map from API response fields (Details01)
    // AccountID, Name, Address1, Address2, City, Country, Phone1, Phone2, Fax, MobileNo, ClientID, ProductID, CurrencyID
    setValue('accountName', details.Name || details.AccountName);
    setValue('clientId', details.ClientID);
    setValue('clientName', details.Name); // Name is the client name in this context
    setValue('productId', details.ProductID);
    setValue('productName', details.ProductName || ''); // May not be in response
    setValue('address1', details.Address1);
    setValue('address2', details.Address2);
    setValue('city', details.City);
    setValue('country', details.Country);
    setValue('phoneHome', details.Phone1);
    setValue('phoneWork', details.Phone2);
    setValue('faxNo', details.Fax);
    setValue('mobile', details.MobileNo);
    
    // Update currency in behind the scene section
    const currencyEl = document.getElementById('currencyId');
    if (currencyEl) currencyEl.textContent = details.CurrencyID || '-';
  }

  // ============================================================================
  // FORMAT DATE HELPER
  // ============================================================================
  function formatDate(dateValue) {
    if (!dateValue) return '-';
    
    try {
      // Handle ISO dates or other formats
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return dateValue; // Return as-is if invalid
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateValue;
    }
  }

  // ============================================================================
  // SEARCH MODAL INITIALIZATION (using SearchModal class like account-signatories)
  // ============================================================================
  function initSearchModals() {
    // Initialize SearchModal if available
    if (typeof window.SearchModal === 'function') {
      // Branch Search Modal - uses LookupService.getBranches with client-side filtering
      state.branchSearchModal = new window.SearchModal({
        prefix: 'cb-branch',
        moduleID: '1000',
        getOperatorId: () => state.context.OperatorID || 'CSADM',
        getOurBranchId: () => state.context.OurBranchID || '',
        searchFn: branchSearchFn, // Custom search function using LookupService
        onError: (err) => {
          console.error('[ChequeBook] Branch search error:', err);
          showMessage('Branch search failed: ' + (err?.message || err), 'error');
        }
      });
      
      // Account Search Modal - uses SearchService
      state.accountSearchModal = new window.SearchModal({
        prefix: 'cb-account',
        moduleID: '1000',
        getOperatorId: () => state.context.OperatorID || 'CSADM',
        getOurBranchId: () => state.context.OurBranchID || '',
        onError: (err) => {
          console.error('[ChequeBook] Account search error:', err);
          showMessage('Account search failed: ' + (err?.message || err), 'error');
        }
      });
      
      console.log('[ChequeBook] SearchModals initialized');
    } else {
      console.warn('[ChequeBook] SearchModal class not available');
    }
  }

  // ============================================================================
  // BRANCH SEARCH FUNCTION (using LookupService like common/searchDialogs/branch-search)
  // ============================================================================
  async function branchSearchFn(payload, config) {
    // Use LookupService.getBranches instead of SearchService for branches
    if (!window.LookupService || typeof window.LookupService.getBranches !== 'function') {
      throw new Error('LookupService.getBranches not available');
    }

    const result = await window.LookupService.getBranches({ BankID: '00' });
    console.log('[ChequeBook] Branch search raw result:', result);

    if (!result.success) {
      throw new Error(result.message || 'Branch search failed');
    }

    // Extract branches from response - check multiple possible locations
    let branches = result.data || result.Details || result.result || [];
    
    // Ensure it's an array
    if (!Array.isArray(branches)) {
      branches = branches ? [branches] : [];
    }
    
    console.log('[ChequeBook] Extracted branches count:', branches.length);

    // Apply client-side filtering based on search criteria (not WhereStmt)
    // The SearchModal builds WhereStmt from the search fields, so we need to parse it
    if (payload.WhereStmt && payload.WhereStmt.trim()) {
      const filteredBranches = applyClientSideFilter(branches, payload.WhereStmt);
      console.log('[ChequeBook] Filtered branches count:', filteredBranches.length);
      branches = filteredBranches;
    }

    // Return in the format SearchModal expects
    return { Details: { SearchResults: branches } };
  }

  // ============================================================================
  // CLIENT-SIDE FILTER HELPER (parse WhereStmt and filter results)
  // ============================================================================
  function applyClientSideFilter(data, whereStmt) {
    if (!whereStmt || !data || data.length === 0) return data;

    console.log('[ChequeBook] Applying filter:', whereStmt);

    // Parse WHERE clause parts like "OurBranchID LIKE '%value%'" or "BranchName = 'value'"
    const conditions = whereStmt.split(/\s+AND\s+/i);
    
    const filtered = data.filter(row => {
      return conditions.every(condition => {
        // Match patterns like: ColumnName LIKE '%value%' or ColumnName = 'value'
        const likeMatch = condition.match(/(\w+)\s+LIKE\s+'%([^%]*)%'/i);
        const exactMatch = condition.match(/(\w+)\s*=\s*'([^']*)'/i);
        
        if (likeMatch) {
          const [, column, value] = likeMatch;
          const rowValue = String(row[column] || '').toLowerCase();
          const searchValue = value.toLowerCase();
          const matches = rowValue.includes(searchValue);
          console.log(`[ChequeBook] LIKE filter - ${column}: "${rowValue}" includes "${searchValue}" = ${matches}`);
          return matches;
        }
        
        if (exactMatch) {
          const [, column, value] = exactMatch;
          const rowValue = String(row[column] || '').toLowerCase();
          const searchValue = value.toLowerCase();
          const matches = rowValue === searchValue;
          console.log(`[ChequeBook] EXACT filter - ${column}: "${rowValue}" === "${searchValue}" = ${matches}`);
          return matches;
        }
        
        console.log('[ChequeBook] Could not parse condition:', condition);
        return true; // If can't parse, include the row
      });
    });

    console.log('[ChequeBook] Filter result: kept', filtered.length, 'of', data.length, 'rows');
    return filtered;
  }

  // ============================================================================
  // BRANCH SEARCH (using SearchModal with SearchService)
  // ============================================================================
  function openBranchSearch() {
    if (!state.branchSearchModal) {
      showMessage('Branch search not available.', 'warning');
      return;
    }

    state.branchSearchModal.open({
      title: 'Find Branch',
      tableID: 'BranchID',
      searchFields: [
        { name: 'branchId', label: 'Branch ID', column: 'OurBranchID' },
        { name: 'branchName', label: 'Branch Name', column: 'BranchName' }
      ],
      displayFields: [
        { key: 'OurBranchID', label: 'Branch ID' },
        { key: 'BranchName', label: 'Branch Name' }
      ],
      onSelect: (record) => {
        const bid = record.OurBranchID || record.BranchID || record.BranchId || record.branchId || '';
        const bname = record.BranchName || record.Description || record.Name || '';
        
        const branchIdEl = document.getElementById('branchId');
        const branchNameEl = document.getElementById('branchName');
        
        if (branchIdEl) branchIdEl.value = bid;
        if (branchNameEl) branchNameEl.value = bname;
        
        // Update context
        state.context.OurBranchID = bid;
        
        console.log('[ChequeBook] Branch selected:', record);
      }
    });
  }

  // ============================================================================
  // ACCOUNT SEARCH (using SearchModal with SearchService)
  // ============================================================================
  function openAccountSearch() {
    if (!state.accountSearchModal) {
      showMessage('Account search not available.', 'warning');
      return;
    }

    // Get branch ID for filtering
    const branchId = document.getElementById('branchId')?.value || state.context.OurBranchID || '';

    state.accountSearchModal.open({
      title: 'Find Account',
      tableID: 'AccountID',
      whereStmt: branchId ? `OurBranchID='${branchId}'` : '',
      searchFields: [
        { name: 'accountId', label: 'Account ID', column: 'AccountID' },
        { name: 'accountName', label: 'Account Name', column: 'Description' }
      ],
      displayFields: [
        { key: 'AccountID', label: 'Account ID' },
        { key: 'Description', label: 'Account Name' },
        { key: 'ClientName', label: 'Client Name' }
      ],
      onSelect: (record) => {
        const aid = record.AccountID || '';
        const aname = record.AccountName || record.Description || record.Name || '';
        const cid = record.ClientID || '';
        const cname = record.ClientName || record.Client || '';
        
        const accountIdEl = document.getElementById('accountId');
        const accountNameEl = document.getElementById('accountName');
        const clientIdEl = document.getElementById('clientId');
        const clientNameEl = document.getElementById('clientName');
        
        if (accountIdEl) accountIdEl.value = aid;
        if (accountNameEl) accountNameEl.value = aname;
        if (clientIdEl && cid) clientIdEl.value = cid;
        if (clientNameEl && cname) clientNameEl.value = cname;
        
        // Update context
        state.context.AccountID = aid;
        
        console.log('[ChequeBook] Account selected:', record);
      }
    });
  }

  // ============================================================================
  // WIRE LOOKUP BUTTONS
  // ============================================================================
  function wireLookupButtons() {
    // Branch lookup button
    const branchLookupBtn = document.querySelector('[data-lookup="branchId"]');
    if (branchLookupBtn) {
      branchLookupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openBranchSearch();
      });
    }
    
    // Account lookup button
    const accountLookupBtn = document.querySelector('[data-lookup="accountId"]');
    if (accountLookupBtn) {
      accountLookupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openAccountSearch();
      });
    }
  }

  // ============================================================================
  // INITIALIZE FROM PARENT STATE (AccountMaintenanceState)
  // ============================================================================
  function initializeFromParent() {
    try {
      // Try to get parent state from AccountMaintenanceState
      const parentState = window.parent?.AccountMaintenanceState;
      
      if (parentState && parentState.isAccountLoaded) {
        console.log('[ChequeBook] Initializing from parent state:', parentState);
        
        // Set Branch ID and Name from parent state
        const branchIdEl = document.getElementById('branchId');
        const branchNameEl = document.getElementById('branchName');
        if (branchIdEl && parentState.OurBranchID) {
          branchIdEl.value = parentState.OurBranchID;
          state.context.OurBranchID = parentState.OurBranchID;
        }
        if (branchNameEl && parentState.BranchName) {
          branchNameEl.value = parentState.BranchName;
        }
        
        // Set Account ID and Name from parent state
        const accountIdEl = document.getElementById('accountId');
        const accountNameEl = document.getElementById('accountName');
        if (accountIdEl && parentState.AccountID) {
          accountIdEl.value = parentState.AccountID;
          state.context.AccountID = parentState.AccountID;
        }
        if (accountNameEl && parentState.AccountName) {
          accountNameEl.value = parentState.AccountName;
        }
        
        // Set Account Type ID if available
        if (parentState.AccountTypeID) {
          state.context.AccountTypeID = parentState.AccountTypeID;
        }
        
        // Set Operator ID
        if (parentState.OperatorID) {
          state.context.OperatorID = parentState.OperatorID;
        }
        
        // Show info that account is loaded from parent
        showInfoToast(`Account ${parentState.AccountID} loaded from main screen`);
        
        return true;
      } else {
        console.log('[ChequeBook] No parent account loaded');
        return false;
      }
    } catch (err) {
      console.warn('[ChequeBook] Could not access parent state:', err);
      return false;
    }
  }

  // ============================================================================
  // BUTTON STATE MANAGEMENT
  // ============================================================================
  // Track if we have data loaded (for cancel button logic)
  let hasLoadedData = false;

  function setInitialButtonStates() {
    const viewBtn = document.querySelector('[data-action="view"]');
    const addBtn = document.querySelector('[data-action="add"]');
    const editBtn = document.querySelector('[data-action="edit"]');
    const saveBtn = document.querySelector('[data-action="save"]');
    const cancelBtn = document.querySelector('[data-action="cancel"]');
    const deleteBtn = document.querySelector('[data-action="delete"]');
    const approveBtn = document.querySelector('[data-action="approve"]');
    const dispatchBtn = document.querySelector('[data-action="dispatch"]');

    // Only View is enabled by default on page load
    if (viewBtn) viewBtn.disabled = false;
    
    // Add, Edit, Delete, Save, Cancel are disabled until View is clicked
    if (addBtn) addBtn.disabled = true;
    if (editBtn) editBtn.disabled = true;
    if (deleteBtn) deleteBtn.disabled = true;
    if (saveBtn) saveBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    
    // Approve and Dispatch are disabled until a request is selected
    if (approveBtn) approveBtn.disabled = true;
    if (dispatchBtn) dispatchBtn.disabled = true;

    // Disable all fields initially
    toggleFields(false);
  }

  function setButtonStatesAfterView(hasResults) {
    const viewBtn = document.querySelector('[data-action="view"]');
    const editBtn = document.querySelector('[data-action="edit"]');
    const addBtn = document.querySelector('[data-action="add"]');
    const saveBtn = document.querySelector('[data-action="save"]');
    const cancelBtn = document.querySelector('[data-action="cancel"]');
    const deleteBtn = document.querySelector('[data-action="delete"]');
    const approveBtn = document.querySelector('[data-action="approve"]');
    const dispatchBtn = document.querySelector('[data-action="dispatch"]');
    
    // View stays enabled
    if (viewBtn) viewBtn.disabled = false;
    
    // Save disabled after view (only active in Add/Edit mode)
    if (saveBtn) saveBtn.disabled = true;
    
    // Track loaded data state
    hasLoadedData = hasResults;
    
    // Add, Edit, Delete, and Cancel are ALWAYS active after View
    if (addBtn) addBtn.disabled = false;
    if (editBtn) editBtn.disabled = false;
    if (deleteBtn) deleteBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
    
    // Approve and Dispatch disabled until a cheque request is selected
    if (approveBtn) approveBtn.disabled = true;
    if (dispatchBtn) dispatchBtn.disabled = true;

    // Keep fields disabled in view mode
    toggleFields(false);
  }

  function setButtonStatesForAddMode() {
    const viewBtn = document.querySelector('[data-action="view"]');
    const addBtn = document.querySelector('[data-action="add"]');
    const editBtn = document.querySelector('[data-action="edit"]');
    const saveBtn = document.querySelector('[data-action="save"]');
    const cancelBtn = document.querySelector('[data-action="cancel"]');
    const deleteBtn = document.querySelector('[data-action="delete"]');

    if (viewBtn) viewBtn.disabled = true;
    if (addBtn) addBtn.disabled = true;
    if (editBtn) editBtn.disabled = true;
    if (deleteBtn) deleteBtn.disabled = true; // Delete disabled in add mode (nothing to delete)
    if (saveBtn) saveBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
  }

  function setButtonStatesForEditMode() {
    const viewBtn = document.querySelector('[data-action="view"]');
    const addBtn = document.querySelector('[data-action="add"]');
    const editBtn = document.querySelector('[data-action="edit"]');
    const saveBtn = document.querySelector('[data-action="save"]');
    const cancelBtn = document.querySelector('[data-action="cancel"]');
    const deleteBtn = document.querySelector('[data-action="delete"]');

    if (viewBtn) viewBtn.disabled = true;
    if (addBtn) addBtn.disabled = true;
    if (editBtn) editBtn.disabled = true;
    if (deleteBtn) deleteBtn.disabled = false; // Delete stays enabled in edit mode
    if (saveBtn) saveBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
  }

  function setButtonStatesAfterCancel() {
    // After cancel, return to view state based on whether we had data
    setButtonStatesAfterView(hasLoadedData);
  }

  function resetButtonStates() {
    setInitialButtonStates();
  }

  // ============================================================================
  // UPDATE STATUS BAR
  // ============================================================================
  function updateStatusBar(message) {
    const statusBar = document.querySelector('.de-status-bar');
    if (statusBar) {
      statusBar.textContent = message || 'Ready';
    }
  }

  // ============================================================================
  // SECTION TOGGLE FUNCTIONALITY
  // ============================================================================
  function wireSectionToggles() {
    document.querySelectorAll('[data-section-toggle]').forEach(header => {
      header.addEventListener('click', function() {
        const section = this.closest('.form-section');
        const content = section?.querySelector('[data-section-content]');
        const btn = this.querySelector('.section-toggle-btn');
        const icon = btn?.querySelector('i');
        
        if (!content || !btn) return;
        
        const isExpanded = btn.getAttribute('aria-expanded') === 'true';
        
        btn.setAttribute('aria-expanded', !isExpanded);
        content.hidden = isExpanded;
        
        if (icon) {
          icon.className = isExpanded ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
        }
      });
    });
  }

  // ============================================================================
  // LOAD BOOK TYPES DROPDOWN
  // ============================================================================
  // Cheque prefix mapping based on number of leaves
  const CHEQUE_PREFIX_MAP = {
    '25': 'TBT',
    '50': 'TBF',
    '100': 'TBH'
  };

  async function loadBookTypes() {
    const bookTypeSelect = document.getElementById('bookType');
    if (!bookTypeSelect) {
      console.warn('[ChequeBook] Book Type select not found');
      return;
    }

    try {
      if (!window.LookupService || typeof window.LookupService.getBookTypes !== 'function') {
        console.error('[ChequeBook] LookupService.getBookTypes not available');
        return;
      }

      const options = await window.LookupService.getBookTypes();
      console.log('[ChequeBook] Book Types loaded:', options);

      // Clear existing options
      bookTypeSelect.innerHTML = '';

      // Add default empty option
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = '-- Select Book Type --';
      bookTypeSelect.appendChild(defaultOption);

      // Populate options (value = SubCodeID which is number of leaves)
      if (options && options.length > 0) {
        options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value; // SubCodeID = number of leaves
          option.textContent = opt.label;
          // Check if this is "Other" type
          option.dataset.isOther = opt.label.toLowerCase().includes('other') ? 'true' : 'false';
          bookTypeSelect.appendChild(option);
        });
      }

      // Wire up book type change handler
      bookTypeSelect.addEventListener('change', onBookTypeChange);

    } catch (error) {
      console.error('[ChequeBook] Error loading book types:', error);
      showErrorToast('Failed to load book types');
    }
  }

  // ============================================================================
  // BOOK TYPE CHANGE HANDLER - Auto-compute leaves, prefix, and cheque end
  // ============================================================================
  function onBookTypeChange() {
    const bookTypeSelect = document.getElementById('bookType');
    const noOfLeavesInput = document.getElementById('noOfLeaves');
    const chequePrefixInput = document.getElementById('chequePrefix');
    const chequeStartInput = document.getElementById('chequeStart');
    const chequeEndInput = document.getElementById('chequeEnd');

    if (!bookTypeSelect) return;

    const selectedOption = bookTypeSelect.options[bookTypeSelect.selectedIndex];
    const selectedValue = bookTypeSelect.value; // SubCodeID = number of leaves
    const isOther = selectedOption?.dataset?.isOther === 'true';

    console.log('[ChequeBook] Book type changed:', { value: selectedValue, isOther });

    if (!selectedValue) {
      // Reset fields if no selection
      if (noOfLeavesInput) {
        noOfLeavesInput.value = '';
        noOfLeavesInput.readOnly = true;
      }
      if (chequePrefixInput) chequePrefixInput.value = '';
      if (chequeEndInput) {
        chequeEndInput.value = '';
        chequeEndInput.readOnly = true;
      }
      return;
    }

    if (isOther) {
      // "Other" selected - make No of Leaves and Cheque End editable
      if (noOfLeavesInput) {
        noOfLeavesInput.value = '';
        noOfLeavesInput.readOnly = false;
        noOfLeavesInput.addEventListener('input', computeChequeEnd);
      }
      if (chequePrefixInput) chequePrefixInput.value = '';
      if (chequeEndInput) {
        chequeEndInput.value = '';
        chequeEndInput.readOnly = false;
      }
    } else {
      // Standard book type - auto-fill based on SubCodeID (number of leaves)
      const numLeaves = parseInt(selectedValue, 10);
      
      if (noOfLeavesInput) {
        noOfLeavesInput.value = numLeaves || '';
        noOfLeavesInput.readOnly = true;
      }

      // Set cheque prefix based on number of leaves
      if (chequePrefixInput) {
        chequePrefixInput.value = CHEQUE_PREFIX_MAP[selectedValue] || '';
      }

      // Compute cheque end if cheque start is set
      if (chequeEndInput) {
        chequeEndInput.readOnly = true;
        computeChequeEnd();
      }
    }
  }

  // ============================================================================
  // COMPUTE CHEQUE END - ChequeStart + (NoOfLeaves - 1)
  // ============================================================================
  function computeChequeEnd() {
    const chequeStartInput = document.getElementById('chequeStart');
    const noOfLeavesInput = document.getElementById('noOfLeaves');
    const chequeEndInput = document.getElementById('chequeEnd');

    if (!chequeStartInput || !noOfLeavesInput || !chequeEndInput) {
      console.warn('[ChequeBook] computeChequeEnd: Missing input elements');
      return;
    }

    // If cheque end is editable (Other type), don't auto-compute
    // Check both readOnly property and attribute
    const isReadOnly = chequeEndInput.readOnly || chequeEndInput.hasAttribute('readonly');
    if (!isReadOnly) {
      console.log('[ChequeBook] Cheque End is editable, skipping auto-compute');
      return;
    }

    const chequeStart = parseInt(chequeStartInput.value, 10);
    const noOfLeaves = parseInt(noOfLeavesInput.value, 10);

    console.log('[ChequeBook] computeChequeEnd: start=', chequeStart, 'leaves=', noOfLeaves);

    if (!isNaN(chequeStart) && !isNaN(noOfLeaves) && noOfLeaves > 0) {
      const chequeEnd = chequeStart + noOfLeaves - 1;
      chequeEndInput.value = chequeEnd;
      console.log('[ChequeBook] Computed Cheque End:', chequeEnd);
    } else {
      chequeEndInput.value = '';
    }
  }

  // ============================================================================
  // WIRE CHEQUE START INPUT - Recompute cheque end on change
  // ============================================================================
  function wireChequeStartInput() {
    const chequeStartInput = document.getElementById('chequeStart');
    if (chequeStartInput) {
      chequeStartInput.addEventListener('input', computeChequeEnd);
      chequeStartInput.addEventListener('change', computeChequeEnd);
      console.log('[ChequeBook] Wired chequeStart input for auto-compute');
    }
  }
  // ============================================================================
  // SET ISSUE DATE FROM WORKING DATE
  // ============================================================================
  function setIssueDateFromWorkingDate() {
    const issueDateInput = document.getElementById('issueDate');
    if (!issueDateInput) return;

    // Get working date from Environment.js
    let workingDate = null;

    try {
      // Get from Environment configuration
      if (window.Environment && window.Environment.workingDate) {
        workingDate = window.Environment.workingDate;
        console.log('[ChequeBook] Using working date from Environment:', workingDate);
      }
    } catch (e) {
      console.warn('[ChequeBook] Could not access Environment for working date');
    }

    // Format and set the date
    if (workingDate) {
      issueDateInput.value = formatDisplayDate(workingDate);
    } else {
      // Fallback to current date if Environment.workingDate not set
      const now = new Date();
      issueDateInput.value = formatDisplayDate(now);
      console.warn('[ChequeBook] Environment.workingDate not found, using current date');
    }

    // Make issue date readonly
    issueDateInput.readOnly = true;
  }

  // ============================================================================
  // FORMAT DISPLAY DATE - DD/MMM/YYYY format
  // ============================================================================
  function formatDisplayDate(dateValue) {
    if (!dateValue) return '';
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '';

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dd = date.getDate().toString().padStart(2, '0');
      const mmm = months[date.getMonth()];
      const yyyy = date.getFullYear();
      
      return `${dd}/${mmm}/${yyyy}`;
    } catch (e) {
      return '';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    wireTitleBar();
    wireTabs();
    wireActions();
    initSearchModals();
    wireLookupButtons();
    wireSectionToggles();

    // Load dropdowns
    loadBookTypes();

    // Set issue date from working date (readonly)
    setIssueDateFromWorkingDate();

    // Wire cheque start input for auto-compute
    wireChequeStartInput();

    // Set initial button states
    setInitialButtonStates();
    
    // Initialize from parent state (fill Branch ID and Account ID)
    const hasParentData = initializeFromParent();
    
    // Update status bar
    updateStatusBar(hasParentData ? 'Account loaded - Click View to fetch cheque book data' : 'Ready');
    
    console.log('[ChequeBook] Module initialized');
  });
})();
