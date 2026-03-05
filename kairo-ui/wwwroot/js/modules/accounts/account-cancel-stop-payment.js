(function () {
  const form = document.querySelector("[data-main-form]");
  if (!form) {
    console.error('[CancelStopPayment] Main form element not found');
    return;
  }

  console.log('[CancelStopPayment] Initializing...');

  const actionButtons = {
    view: document.querySelector('[data-action="view"]'),
    add: document.querySelector('[data-action="add"]'),
    edit: document.querySelector('[data-action="edit"]'),
    delete: document.querySelector('[data-action="delete"]'),
    save: document.querySelector('[data-action="save"]'),
    cancel: document.querySelector('[data-action="cancel"]')
  };

  // State variables
  const state = {
    editMode: "NONE", // NONE, ADD, EDIT, DELETE
    currentData: null,
    branchId: null,
    accountId: null,
    requestRef: null
  };

  // Selector for all form controls (not excluding disabled so we can enable them)
  const editableSelector = ".bs-input-text:not([readonly]), select.bs-select";
  const getEditableControls = () => Array.from(form.querySelectorAll(editableSelector));

  const snapshot = new Map();

  const snapshotValues = () => {
    snapshot.clear();
    getEditableControls().forEach((el) => {
      snapshot.set(el.name || el.id, el.value);
    });
  };

  const restoreValues = () => {
    getEditableControls().forEach((el) => {
      const key = el.name || el.id;
      if (!snapshot.has(key)) return;
      el.value = String(snapshot.get(key) ?? "");
    });
  };

  const setEditMode = (mode) => {
    state.editMode = mode;
    const isEditing = mode !== "NONE";
    
    // Define which fields should be editable in ADD/EDIT mode
    // Note: reasonText is now an independent input field
    const cancelStopPaymentFields = [
      'chequeNoStart', 'chequeNoEnd', 'chequeDate', 'chequeAmount',
      'reasonId', 'reasonText', 'cancellationDate', 'instructionGivenBy'
    ];
    
    getEditableControls().forEach((el) => {
      // Keep branch/account ID fields always enabled for input
      const alwaysEnabled = ['branchId', 'accountId', 'requestRef'];
      if (alwaysEnabled.includes(el.id)) {
        el.disabled = false;
      } else if (mode === "NONE") {
        el.disabled = true;
      } else if (mode === "ADD" || mode === "EDIT") {
        // Enable cancel stop payment fields for Add/Edit
        el.disabled = !cancelStopPaymentFields.includes(el.id);
      } else {
        el.disabled = true; // DELETE mode - keep fields disabled
      }
    });

    // Update button states based on edit mode
    const isNone = mode === "NONE";
    const isAdding = mode === "ADD";
    const isEditingOrDeleting = mode === "EDIT" || mode === "DELETE";

    actionButtons.view && (actionButtons.view.disabled = !isNone);
    actionButtons.add && (actionButtons.add.disabled = !isNone); // Add is always enabled when in NONE mode
    actionButtons.edit && (actionButtons.edit.disabled = !isNone || !state.currentData);
    actionButtons.delete && (actionButtons.delete.disabled = true); // Always disabled
    actionButtons.save && (actionButtons.save.disabled = isNone);
    actionButtons.cancel && (actionButtons.cancel.disabled = isNone);
  };

  // ============================================================================
  // VALIDATION FUNCTIONS
  // ============================================================================

  const clearAllFieldErrors = () => {
    form.querySelectorAll('.csp-field-invalid').forEach(el => {
      el.classList.remove('csp-field-invalid');
    });
    form.querySelectorAll('.csp-field-error').forEach(el => el.remove());
    const summary = form.querySelector('.csp-validation-summary');
    if (summary) summary.classList.remove('is-visible');
  };

  const showFieldError = (el, message) => {
    if (!el) return;
    el.classList.add('csp-field-invalid');
    
    const existingError = el.parentElement?.querySelector('.csp-field-error');
    if (existingError) existingError.remove();
    
    const errorSpan = document.createElement('span');
    errorSpan.className = 'csp-field-error';
    errorSpan.textContent = message;
    el.parentElement?.appendChild(errorSpan);
  };

  const clearFieldError = (el) => {
    if (!el) return;
    el.classList.remove('csp-field-invalid');
    const errorMsg = el.parentElement?.querySelector('.csp-field-error');
    if (errorMsg) errorMsg.remove();
    
    const remainingErrors = form.querySelectorAll('.csp-field-invalid');
    if (remainingErrors.length === 0) {
      const summary = form.querySelector('.csp-validation-summary');
      if (summary) summary.classList.remove('is-visible');
    }
  };

  const showValidationSummary = (message) => {
    let summary = form.querySelector('.csp-validation-summary');
    if (!summary) {
      summary = document.createElement('div');
      summary.className = 'csp-validation-summary';
      const firstSection = form.querySelector('.form-section');
      if (firstSection) {
        firstSection.parentElement.insertBefore(summary, firstSection);
      } else {
        form.insertBefore(summary, form.firstChild);
      }
    }
    summary.innerHTML = `<i class="bi bi-exclamation-circle"></i><span>${message}</span>`;
    summary.classList.add('is-visible');
  };

  const displayValidationErrors = (errors) => {
    clearAllFieldErrors();
    if (!errors || errors.length === 0) return;
    
    errors.forEach(({ el, message }) => {
      showFieldError(el, message);
    });
    
    const summaryMsg = errors.length === 1
      ? 'Please complete the required field highlighted below.'
      : `Please complete the ${errors.length} required fields highlighted below.`;
    showValidationSummary(summaryMsg);
    
    if (errors[0]?.el?.focus) errors[0].el.focus();
  };

  const clearForm = () => {
    getEditableControls().forEach((el) => (el.value = el.tagName === "SELECT" ? "" : ""));
    
    // Clear readonly fields
    const readonlyFields = ["branchName", "accountName"];
    readonlyFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    
    // Clear audit fields
    const auditFields = ["MakerID", "MakerDT", "CheckerID", "CheckerDT", "ModifierID", "ModifierDT"];
    auditFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "-";
    });
    
    // Clear grid
    const tbody = document.querySelector('#stopPaymentGrid tbody');
    if (tbody) {
      tbody.innerHTML = '<tr class="de-table__empty"><td colspan="8">No records to display.</td></tr>';
    }
    
    state.currentData = null;
    clearAllFieldErrors();
  };

  const showToast = (message, type = "info") => {
    console.log(`[CancelStopPayment] ${type.toUpperCase()}: ${message}`);
    
    let toastContainer = document.querySelector(".csp-toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.className = "csp-toast-container";
      document.body.appendChild(toastContainer);
    }
    
    toastContainer.querySelectorAll('.csp-toast').forEach(t => t.remove());
    
    const toast = document.createElement("div");
    toast.className = `csp-toast csp-toast--${type}`;
    
    const icons = {
      success: "bi-check-circle-fill",
      warning: "bi-exclamation-triangle-fill",
      error: "bi-x-circle-fill",
      info: "bi-info-circle-fill"
    };
    
    toast.innerHTML = `
      <i class="bi ${icons[type] || icons.info} csp-toast__icon"></i>
      <span class="csp-toast__message">${message}</span>
      <button class="csp-toast__close" aria-label="Close"><i class="bi bi-x"></i></button>
    `;
    
    toast.querySelector(".csp-toast__close").addEventListener("click", () => {
      toast.classList.remove('is-show');
      setTimeout(() => toast.remove(), 300);
    });
    
    toastContainer.appendChild(toast);
    
    requestAnimationFrame(() => {
      toast.classList.add('is-show');
    });
    
    const delay = type === "success" ? 3000 : type === "error" ? 6000 : 4000;
    setTimeout(() => {
      toast.classList.remove('is-show');
      setTimeout(() => toast.remove(), 300);
    }, delay);
  };

  // ============================================================================
  // PARENT WINDOW COMMUNICATION
  // ============================================================================

  const getParentFormValues = () => {
    try {
      if (!window.parent || window.parent === window) {
        console.log('[CancelStopPayment] No parent window found');
        return null;
      }

      // Try to get values from parent document
      const parentDoc = window.parent.document;
      if (!parentDoc) {
        console.log('[CancelStopPayment] Cannot access parent document');
        return null;
      }

      // Try to find branch and account fields in parent
      const branchIdEl = parentDoc.getElementById('branchId') || 
                         parentDoc.getElementById('BranchID') ||
                         parentDoc.querySelector('[name="branchId"]') ||
                         parentDoc.querySelector('[name="BranchID"]');
      
      const accountIdEl = parentDoc.getElementById('accountId') || 
                          parentDoc.getElementById('AccountID') ||
                          parentDoc.querySelector('[name="accountId"]') ||
                          parentDoc.querySelector('[name="AccountID"]');

      const branchNameEl = parentDoc.getElementById('branchName') || 
                           parentDoc.getElementById('BranchName') ||
                           parentDoc.querySelector('[name="branchName"]');

      const accountNameEl = parentDoc.getElementById('accountName') || 
                            parentDoc.getElementById('AccountName') ||
                            parentDoc.querySelector('[name="accountName"]');

      const values = {
        branchId: branchIdEl?.value || '',
        branchName: branchNameEl?.value || '',
        accountId: accountIdEl?.value || '',
        accountName: accountNameEl?.value || ''
      };

      console.log('[CancelStopPayment] Retrieved parent form values:', values);
      return values;

    } catch (error) {
      console.error('[CancelStopPayment] Error accessing parent form:', error);
      return null;
    }
  };

  const populateFromParent = () => {
    const parentValues = getParentFormValues();
    if (!parentValues) {
      console.log('[CancelStopPayment] No parent values to populate');
      return;
    }

    // Populate branch fields
    if (parentValues.branchId) {
      const branchIdEl = document.getElementById('branchId');
      if (branchIdEl) {
        branchIdEl.value = parentValues.branchId;
        console.log('[CancelStopPayment] Set branchId:', parentValues.branchId);
      }
    }

    if (parentValues.branchName) {
      const branchNameEl = document.getElementById('branchName');
      if (branchNameEl) {
        branchNameEl.value = parentValues.branchName;
        console.log('[CancelStopPayment] Set branchName:', parentValues.branchName);
      }
    }

    // Populate account fields
    if (parentValues.accountId) {
      const accountIdEl = document.getElementById('accountId');
      if (accountIdEl) {
        accountIdEl.value = parentValues.accountId;
        console.log('[CancelStopPayment] Set accountId:', parentValues.accountId);
      }
    }

    if (parentValues.accountName) {
      const accountNameEl = document.getElementById('accountName');
      if (accountNameEl) {
        accountNameEl.value = parentValues.accountName;
        console.log('[CancelStopPayment] Set accountName:', parentValues.accountName);
      }
    }

    // Store in state
    if (parentValues.branchId) state.branchId = parentValues.branchId;
    if (parentValues.accountId) state.accountId = parentValues.accountId;
  };

  const populateStopPaymentGrid = (data) => {
    const tbody = document.querySelector('#stopPaymentGrid tbody');
    if (!tbody) {
      console.warn('[CancelStopPayment] Stop payment grid tbody not found');
      return;
    }

    // Clear existing rows
    tbody.innerHTML = '';

    if (!data || !data.Details02 || !Array.isArray(data.Details02) || data.Details02.length === 0) {
      tbody.innerHTML = '<tr class="de-table__empty"><td colspan="8">No records to display.</td></tr>';
      return;
    }

    // Populate grid with records
    data.Details02.forEach(record => {
      const row = document.createElement('tr');
      
      // Helper function to get value from record
      const getValue = (keys, defaultValue = '') => {
        for (const key of keys) {
          if (record[key] !== undefined && record[key] !== null) {
            return String(record[key]);
          }
        }
        return defaultValue;
      };

      // Format date helper
      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString();
      };

      // Create table cells
      const prefix = getValue(['Prefix', 'ChequePrefix'], '');
      const start = getValue(['StartChequeID', 'ChequeNoStart'], '');
      const end = getValue(['EndChequeID', 'ChequeNoEnd'], '');
      const chequeDate = formatDate(getValue(['ChequeDate']));
      const reason = getValue(['CancelReason', 'ReasonText'], '');
      const cancelDate = formatDate(getValue(['CancelledDate', 'CancellationDate']));
      const amount = getValue(['ChequeAmount'], '');
      const instructionBy = getValue(['CancelledBy', 'InstructionGivenBy'], '');

      row.innerHTML = `
        <td>${prefix}</td>
        <td>${start}</td>
        <td>${end}</td>
        <td>${chequeDate}</td>
        <td>${reason}</td>
        <td>${cancelDate}</td>
        <td>${amount}</td>
        <td>${instructionBy}</td>
      `;

      // Add click handler to populate form with selected record
      row.addEventListener('click', () => {
        // Remove selection from other rows
        tbody.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
        row.classList.add('table-active');
        
        // Populate form with this record's data
        bindFormData({ Details02: [record] });
      });

      tbody.appendChild(row);
    });

    console.log(`[CancelStopPayment] Populated grid with ${data.Details02.length} records`);
  };

  const bindFormData = (data) => {
    if (!data || typeof data !== "object") return;
    
    // Handle nested API response structure
    // data.Details01 = Account/Client info
    // data.Details02 = Stop Payment details
    const accountInfo = data.Details01?.[0] || {};
    const stopPaymentInfo = data.Details02?.[0] || {};
    const operatorInfo = data.Details?.[0] || {};
    
    // Merge all data for state
    state.currentData = { ...operatorInfo, ...accountInfo, ...stopPaymentInfo };
    
    const getAccountValue = (keys) => {
      for (const key of keys) {
        if (accountInfo[key] !== undefined && accountInfo[key] !== null) return accountInfo[key];
      }
      return "";
    };

    const getStopPaymentValue = (keys) => {
      for (const key of keys) {
        if (stopPaymentInfo[key] !== undefined && stopPaymentInfo[key] !== null) return stopPaymentInfo[key];
      }
      return "";
    };

    // Bind account identification fields from Details02
    document.getElementById("branchId") && (document.getElementById("branchId").value = getStopPaymentValue(["OurBranchID", "BranchID"]));
    document.getElementById("accountId") && (document.getElementById("accountId").value = getStopPaymentValue(["AccountID"]));
    document.getElementById("accountName") && (document.getElementById("accountName").value = getAccountValue(["Name"]));
    document.getElementById("requestRef") && (document.getElementById("requestRef").value = getStopPaymentValue(["RequestReferenceNo", "RequestRef"]));
    
    // Bind cancel stop payment details from Details02
    document.getElementById("chequeNoStart") && (document.getElementById("chequeNoStart").value = getStopPaymentValue(["StartChequeID", "ChequeNoStart"]));
    document.getElementById("chequeNoEnd") && (document.getElementById("chequeNoEnd").value = getStopPaymentValue(["EndChequeID", "ChequeNoEnd"]));
    
    // Format cheque date if present
    const chequeDate = getStopPaymentValue(["ChequeDate"]);
    document.getElementById("chequeDate") && (document.getElementById("chequeDate").value = chequeDate ? chequeDate.split('T')[0] : "");
    
    document.getElementById("chequeAmount") && (document.getElementById("chequeAmount").value = getStopPaymentValue(["ChequeAmount"]));
    document.getElementById("reasonId") && (document.getElementById("reasonId").value = getStopPaymentValue(["CancelReasonID", "ReasonID"]));
    document.getElementById("reasonText") && (document.getElementById("reasonText").value = getStopPaymentValue(["CancelReason", "ReasonText"]));
    
    // Format cancellation date if present
    const cancelDate = getStopPaymentValue(["CancelledDate", "CancellationDate"]);
    document.getElementById("cancellationDate") && (document.getElementById("cancellationDate").value = cancelDate ? cancelDate.split('T')[0] : "");
    
    document.getElementById("instructionGivenBy") && (document.getElementById("instructionGivenBy").value = getStopPaymentValue(["CancelledBy", "InstructionGivenBy"]));
    
    // Bind account details from Details01
    document.getElementById("clientId") && (document.getElementById("clientId").value = getAccountValue(["ClientID"]));
    document.getElementById("clientName") && (document.getElementById("clientName").value = getAccountValue(["Name"]));
    document.getElementById("productId") && (document.getElementById("productId").value = getAccountValue(["ProductID"]));
    document.getElementById("productName") && (document.getElementById("productName").value = ""); // Not in response
    document.getElementById("address1") && (document.getElementById("address1").value = getAccountValue(["Address1"]));
    document.getElementById("address2") && (document.getElementById("address2").value = getAccountValue(["Address2"]));
    document.getElementById("city") && (document.getElementById("city").value = getAccountValue(["CityID"]));
    document.getElementById("country") && (document.getElementById("country").value = getAccountValue(["CountryID"]));
    document.getElementById("phoneHome") && (document.getElementById("phoneHome").value = getAccountValue(["Phone1"]));
    document.getElementById("phoneWork") && (document.getElementById("phoneWork").value = getAccountValue(["Phone2"]));
    document.getElementById("faxNo") && (document.getElementById("faxNo").value = getAccountValue(["Fax"]));
    document.getElementById("mobile") && (document.getElementById("mobile").value = getAccountValue(["Mobile"]));
    
    // Bind audit fields from Details02
    document.getElementById("MakerID") && (document.getElementById("MakerID").textContent = getStopPaymentValue(["CreatedBy"]) || "-");
    const createdOn = getStopPaymentValue(["CreatedOn"]);
    document.getElementById("MakerDT") && (document.getElementById("MakerDT").textContent = createdOn ? createdOn.replace('T', ' ') : "-");
    document.getElementById("CheckerID") && (document.getElementById("CheckerID").textContent = getStopPaymentValue(["SupervisedBy"]) || "-");
    const supervisedOn = getStopPaymentValue(["SupervisedOn"]);
    document.getElementById("CheckerDT") && (document.getElementById("CheckerDT").textContent = supervisedOn ? supervisedOn.replace('T', ' ') : "-");
    document.getElementById("ModifierID") && (document.getElementById("ModifierID").textContent = getStopPaymentValue(["ModifiedBy"]) || "-");
    const modifiedOn = getStopPaymentValue(["ModifiedOn"]);
    document.getElementById("ModifierDT") && (document.getElementById("ModifierDT").textContent = modifiedOn ? modifiedOn.replace('T', ' ') : "-");
  };

  // Helper to format date for API (MM/DD/YYYY HH:mm:ss or null)
  const formatDateForApi = (dateStr) => {
    if (!dateStr) return null;
    // If already has time, return as-is with proper format
    if (dateStr.includes('T')) {
      const dt = new Date(dateStr);
      if (isNaN(dt.getTime())) return null;
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      const yyyy = dt.getFullYear();
      const hh = String(dt.getHours()).padStart(2, '0');
      const mi = String(dt.getMinutes()).padStart(2, '0');
      const ss = String(dt.getSeconds()).padStart(2, '0');
      return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
    }
    // If date only (YYYY-MM-DD), add midnight time
    const dt = new Date(dateStr + 'T00:00:00');
    if (isNaN(dt.getTime())) return null;
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const yyyy = dt.getFullYear();
    return `${mm}/${dd}/${yyyy} 00:00:00`;
  };

  const getFormData = () => {
    const now = new Date();
    const currentDateTime = formatDateForApi(now.toISOString());
    
    return {
      OurBranchID: document.getElementById("branchId")?.value || "",
      AccountTypeID: "C", // Default to "C" for current accounts, adjust as needed
      AccountID: document.getElementById("accountId")?.value || "",
      RequestReferenceNo: document.getElementById("requestRef")?.value || "",
      // RequestReferenceNo: null,
      StartChequeID: document.getElementById("chequeNoStart")?.value || "",
      // StartChequeID: "TBT00001073",
      EndChequeID: document.getElementById("chequeNoEnd")?.value || "",
      // EndChequeID: "TBT00001073",
      ChequeDate: formatDateForApi(document.getElementById("chequeDate")?.value),
      ChequeAmount: parseFloat(document.getElementById("chequeAmount")?.value) || 0,
      CancelReasonID: document.getElementById("reasonId")?.value || "",
      CancelReason:'TBT:' + (document.getElementById("reasonText")?.value || "")  ,
      CancelledBy: document.getElementById("instructionGivenBy")?.value || "",
      CancelledDate: formatDateForApi(document.getElementById("cancellationDate")?.value),
      CreatedBy: state.currentData?.CreatedBy || "JOY_WANJA",
      CreatedOn: state.currentData?.CreatedOn ? formatDateForApi(state.currentData.CreatedOn) : currentDateTime,
      ModifiedBy: "JOY_WANJA",
      ModifiedOn: currentDateTime,
      SupervisedBy: state.currentData?.SupervisedBy || ""
    };
  };

  const isFormValid = () => {
    const errors = [];
    
    const branchIdEl = document.getElementById("branchId");
    if (!branchIdEl?.value?.trim()) {
      errors.push({ el: branchIdEl, message: "Branch ID is required" });
    }
    
    const accountIdEl = document.getElementById("accountId");
    if (!accountIdEl?.value?.trim()) {
      errors.push({ el: accountIdEl, message: "Account ID is required" });
    }
    
    const chequeStartEl = document.getElementById("chequeNoStart");
    if (!chequeStartEl?.value?.trim()) {
      errors.push({ el: chequeStartEl, message: "Cheque No Start is required" });
    }
    
    const chequeEndEl = document.getElementById("chequeNoEnd");
    if (!chequeEndEl?.value?.trim()) {
      errors.push({ el: chequeEndEl, message: "Cheque No End is required" });
    }
    
    const reasonIdEl = document.getElementById("reasonId");
    if (!reasonIdEl?.value?.trim()) {
      errors.push({ el: reasonIdEl, message: "Reason ID is required" });
    }
    
    if (errors.length > 0) {
      displayValidationErrors(errors);
      return false;
    }
    
    return true;
  };

  // Lazy getter for service
  const getAccountCancelStopPaymentService = () => window.AccountCancelStopPaymentService;

  const handleView = async () => {
    console.log('[CancelStopPayment] View clicked');
    
    const branchId = document.getElementById("branchId")?.value?.trim();
    const accountId = document.getElementById("accountId")?.value?.trim();
    const requestRef = document.getElementById("requestRef")?.value?.trim();
    
    if (!branchId || !accountId) {
      showToast("Please enter Branch ID and Account ID", "warning");
      return;
    }
    
    try {
      showToast("Loading stop payment details...", "info");
      
      const service = getAccountCancelStopPaymentService();
      if (!service) {
        showToast("Service not available", "error");
        return;
      }

      const result = await service.getCancelStopPayments({
        OurBranchID: branchId,
        AccountTypeID: "C", // Will be populated from parent if available
        AccountID: accountId,
        // RequestReferenceNo: requestRef || "",
        RequestReferenceNo: null,
        OperatorID: "JOY_WANJA", // This should ideally come from logged in user context
        Direction: 0
      });

      if (result.success && result.data) {
        // Populate the grid with all records
        populateStopPaymentGrid(result.data);
        
        // Bind the first record to the form fields (or specific record if available)
        bindFormData(result.data);
        
        setEditMode("NONE");
        // Enable cancel button after viewing data
        actionButtons.cancel && (actionButtons.cancel.disabled = false);
        showToast("Stop payment details loaded successfully", "success");
      } else {
        showToast(result.message || "No records found", "warning");
      }
      
    } catch (error) {
      console.error('[CancelStopPayment] Error loading data:', error);
      showToast("Failed to load stop payment details", "error");
    }
  };

  const handleSave = async () => {
    console.log('[CancelStopPayment] Save clicked');
    
    if (!isFormValid()) {
      return;
    }
    
    const formData = getFormData();
    
    try {
      showToast("Saving stop payment cancellation...", "info");
      
      const service = getAccountCancelStopPaymentService();
      if (!service) {
        showToast("Service not available", "error");
        return;
      }

      let result;
      if (state.editMode === "ADD" || state.editMode === "EDIT") {
        formData.NewRecord = state.editMode === "ADD" ? 1 : 0;
        result = await service.addEditCancelStopPayment(formData);
      } else if (state.editMode === "DELETE") {
        result = await service.deleteCancelStopPayment(formData);
      }

      if (result && result.success) {
        // Bind the returned data if available to avoid refetching
        if (result.data) {
          bindFormData(result.data);
        }
        
        const actionText = state.editMode === "DELETE" ? "deleted" : "saved";
        showToast(`Stop payment cancellation ${actionText} successfully`, "success");
        setEditMode("NONE");
        snapshotValues();
        
        // For DELETE, clear form; for ADD/EDIT, data is already bound
        if (state.editMode === "DELETE") {
          clearForm();
        }
      } else {
        showToast(result?.message || "Failed to save", "error");
      }
      
    } catch (error) {
      console.error('[CancelStopPayment] Error saving:', error);
      showToast("Failed to save stop payment cancellation", "error");
    }
  };

  // Initialize
  populateFromParent(); // Get branch and account from parent window
  snapshotValues();
  setEditMode("NONE");
  console.log('[CancelStopPayment] Initialized with state:', state);

  // ============================================================================
  // DROPDOWN POPULATION
  // ============================================================================

  // Store cancel payment reasons for lookup
  let cancelPaymentReasons = [];

  const populateReasonDropdown = async () => {
    const reasonSelect = document.getElementById('reasonId');
    if (!reasonSelect) {
      console.warn('[CancelStopPayment] reasonId dropdown not found');
      return;
    }

    try {
      if (!window.LookupService) {
        console.warn('[CancelStopPayment] LookupService not available');
        return;
      }

      const options = await window.LookupService.getCancelPaymentReasons();
      console.log('[CancelStopPayment] Cancel payment reasons:', options);

      // Store for later lookup
      cancelPaymentReasons = options || [];

      // Clear existing options except placeholder
      reasonSelect.innerHTML = '<option value="">--Select--</option>';

      // Populate dropdown
      if (Array.isArray(options)) {
        options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          reasonSelect.appendChild(option);
        });
        console.log(`[CancelStopPayment] Populated ${options.length} cancel payment reasons`);
      }
    } catch (error) {
      console.error('[CancelStopPayment] Error loading cancel payment reasons:', error);
    }
  };

  // Auto-fill reasonText when reasonId changes
  const wireReasonIdChange = () => {
    const reasonSelect = document.getElementById('reasonId');
    const reasonTextEl = document.getElementById('reasonText');
    
    if (reasonSelect && reasonTextEl) {
      reasonSelect.addEventListener('change', () => {
        const selectedValue = reasonSelect.value;
        if (!selectedValue) {
          // Optional: clear reasonText when no selection
          // reasonTextEl.value = '';
          return;
        }
        
        // ReasonText is now independent - no auto-fill
        console.log('[CancelStopPayment] Reason selected:', selectedValue);
      });
    }
  };

  // Populate dropdowns on load
  populateReasonDropdown();
  wireReasonIdChange();

  // ============================================================================
  // REQUEST REF SEARCH MODAL
  // ============================================================================

  let requestRefSearchModal = null;

  // Custom search function for StopPayCancelID with LanguageID
  const requestRefSearchFn = async (payload, config) => {
    if (!window.SearchService) {
      throw new Error('SearchService not available');
    }

    // Add LanguageID to the request payload
    const searchPayload = {
      ...payload,
      LanguageID: 'en'
    };

    console.log('[CancelStopPayment] Request Ref search payload:', searchPayload);
    
    const result = await window.SearchService.search(searchPayload);
    console.log('[CancelStopPayment] Request Ref search result:', result);
    
    return result;
  };

  const initRequestRefSearchModal = () => {
    if (typeof window.SearchModal !== 'function') {
      console.warn('[CancelStopPayment] SearchModal class not available');
      return;
    }

    requestRefSearchModal = new window.SearchModal({
      prefix: 'csp-reqref',
      moduleID: '1385',
      getOperatorId: () => 'JOY_WANJA', // Should come from logged-in user context
      getOurBranchId: () => document.getElementById('branchId')?.value || '',
      searchFn: requestRefSearchFn,
      onError: (err) => {
        console.error('[CancelStopPayment] Request Ref search error:', err);
        showToast('Request Ref search failed: ' + (err?.message || err), 'error');
      }
    });

    console.log('[CancelStopPayment] RequestRef SearchModal initialized');
  };

  const openRequestRefSearch = () => {
    const branchId = document.getElementById('branchId')?.value?.trim();
    const accountId = document.getElementById('accountId')?.value?.trim();

    if (!branchId || !accountId) {
      showToast('Please enter Branch ID and Account ID before searching', 'warning');
      return;
    }

    if (!requestRefSearchModal) {
      initRequestRefSearchModal();
    }

    if (!requestRefSearchModal) {
      showToast('Search modal not available', 'error');
      return;
    }

    // Build AdvFilterString for the search
    // Format: OurBranchID='2305' AND AccountID='2305510000013'
    const advFilterString = `OurBranchID='${branchId}' AND AccountID='${accountId}'`;

    requestRefSearchModal.open({
      title: 'Search Cancel Stop Payment',
      tableID: 'StopPayCancelID',
      advFilterString: advFilterString,
      whereStmt: '',
      searchKey: '',
      searchFields: [
        { name: 'requestRef', label: 'Request Ref No', column: 'RequestReferenceNo', value: '' },
        { name: 'chequeNo', label: 'Cheque No', column: 'StartChequeID', value: '' }
      ],
      displayFields: [
        { key: 'RequestReferenceNo', label: 'Request Ref No' },
        { key: 'StartChequeID', label: 'Cheque Start' },
        { key: 'EndChequeID', label: 'Cheque End' },
        { key: 'CancelReason', label: 'Reason' },
        { key: 'CancelledDate', label: 'Cancel Date' },
        { key: 'CancelledBy', label: 'Cancelled By' }
      ],
      onSelect: (record) => {
        console.log('[CancelStopPayment] Selected record:', record);
        
        // Populate requestRef field
        const requestRefEl = document.getElementById('requestRef');
        if (requestRefEl) {
          // Find the RequestReferenceNo from the selected record (case-insensitive)
          const keys = Object.keys(record);
          const refKey = keys.find(k => k.toLowerCase() === 'requestreferenceno');
          requestRefEl.value = refKey ? record[refKey] : '';
        }
        
        // Auto-trigger view to load full details
        showToast('Loading stop payment details...', 'info');
        handleView();
      }
    });
  };

  // Initialize search modal on load
  initRequestRefSearchModal();

  // Wire up requestRef lookup button
  const requestRefLookupBtn = document.querySelector('[data-lookup="requestRef"]');
  if (requestRefLookupBtn) {
    requestRefLookupBtn.addEventListener('click', openRequestRefSearch);
    console.log('[CancelStopPayment] RequestRef lookup button wired');
  }

  // ============================================================================
  // BRANCH ID SEARCH MODAL
  // ============================================================================

  let branchSearchModal = null;

  // Custom search function for Branch with LanguageID
  const branchSearchFn = async (payload, config) => {
    if (!window.SearchService) {
      throw new Error('SearchService not available');
    }

    // Add LanguageID to the request payload
    const searchPayload = {
      ...payload,
      LanguageID: 'en'
    };

    console.log('[CancelStopPayment] Branch search payload:', searchPayload);
    
    const result = await window.SearchService.search(searchPayload);
    console.log('[CancelStopPayment] Branch search result:', result);
    
    return result;
  };

  const initBranchSearchModal = () => {
    if (typeof window.SearchModal !== 'function') {
      console.warn('[CancelStopPayment] SearchModal class not available');
      return;
    }

    branchSearchModal = new window.SearchModal({
      prefix: 'csp-branch',
      moduleID: '1385', // Same module as request ref
      getOperatorId: () => 'JOY_WANJA',
      getOurBranchId: () => '', // Not needed for branch search
      searchFn: branchSearchFn,
      onError: (err) => {
        console.error('[CancelStopPayment] Branch search error:', err);
        showToast('Branch search failed: ' + (err?.message || err), 'error');
      }
    });

    console.log('[CancelStopPayment] Branch SearchModal initialized');
  };

  const openBranchSearch = () => {
    if (!branchSearchModal) {
      initBranchSearchModal();
    }

    if (!branchSearchModal) {
      showToast('Search modal not available', 'error');
      return;
    }

    branchSearchModal.open({
      title: 'Search Branch',
      tableID: 'BranchID', // Correct table ID for branch search
      advFilterString: '',
      whereStmt: '',
      searchKey: '',
      searchFields: [
        { name: 'branchId', label: 'Branch ID', column: 'OurBranchID', value: '' },
        { name: 'branchName', label: 'Branch Name', column: 'BranchName', value: '' }
      ],
      displayFields: [
        { key: 'OurBranchID', label: 'Branch ID' },
        { key: 'BranchName', label: 'Branch Name' },
        { key: 'BranchAddress', label: 'Address' }
      ],
      onSelect: (record) => {
        console.log('[CancelStopPayment] Selected branch:', record);
        
        // Populate branchId field
        const branchIdEl = document.getElementById('branchId');
        if (branchIdEl) {
          const keys = Object.keys(record);
          const branchIdKey = keys.find(k => k.toLowerCase() === 'ourbranchid');
          branchIdEl.value = branchIdKey ? record[branchIdKey] : '';
        }
        
        // Populate branchName field
        const branchNameEl = document.getElementById('branchName');
        if (branchNameEl) {
          const keys = Object.keys(record);
          const branchNameKey = keys.find(k => k.toLowerCase() === 'branchname');
          branchNameEl.value = branchNameKey ? record[branchNameKey] : '';
        }
        
        // Update state
        if (branchIdEl?.value) {
          state.branchId = branchIdEl.value;
        }
        
        showToast('Branch selected', 'info');
      }
    });
  };

  // Initialize branch search modal on load
  initBranchSearchModal();

  // Wire up branchId lookup button
  const branchLookupBtn = document.querySelector('[data-lookup="branchId"]');
  if (branchLookupBtn) {
    branchLookupBtn.addEventListener('click', openBranchSearch);
    console.log('[CancelStopPayment] Branch lookup button wired');
  }

  // ============================================================================
  // ACCOUNT ID SEARCH MODAL
  // ============================================================================

  let accountSearchModal = null;

  // Custom search function for Account with LanguageID
  const accountSearchFn = async (payload, config) => {
    if (!window.SearchService) {
      throw new Error('SearchService not available');
    }

    // Add LanguageID to the request payload
    const searchPayload = {
      ...payload,
      LanguageID: 'en'
    };

    console.log('[CancelStopPayment] Account search payload:', searchPayload);
    
    const result = await window.SearchService.search(searchPayload);
    console.log('[CancelStopPayment] Account search result:', result);
    
    return result;
  };

  const initAccountSearchModal = () => {
    if (typeof window.SearchModal !== 'function') {
      console.warn('[CancelStopPayment] SearchModal class not available');
      return;
    }

    accountSearchModal = new window.SearchModal({
      prefix: 'csp-account',
      moduleID: '1385', // Same module as request ref
      getOperatorId: () => 'JOY_WANJA',
      getOurBranchId: () => document.getElementById('branchId')?.value || '',
      searchFn: accountSearchFn,
      onError: (err) => {
        console.error('[CancelStopPayment] Account search error:', err);
        showToast('Account search failed: ' + (err?.message || err), 'error');
      }
    });

    console.log('[CancelStopPayment] Account SearchModal initialized');
  };

  const openAccountSearch = () => {
    const branchId = document.getElementById('branchId')?.value?.trim();

    if (!branchId) {
      showToast('Please enter Branch ID before searching accounts', 'warning');
      return;
    }

    if (!accountSearchModal) {
      initAccountSearchModal();
    }

    if (!accountSearchModal) {
      showToast('Search modal not available', 'error');
      return;
    }

    // Build AdvFilterString for the search
    // Format: OurBranchID='2305'
    const advFilterString = `OurBranchID='${branchId}'`;

    accountSearchModal.open({
      title: 'Search Account',
      tableID: 'AccountID', // Correct table ID for account search
      advFilterString: advFilterString,
      whereStmt: '',
      searchKey: '',
      searchFields: [
        { name: 'accountId', label: 'Account ID', column: 'AccountID', value: '' },
        { name: 'accountName', label: 'Account Name', column: 'Description', value: '' },
        { name: 'clientName', label: 'Client Name', column: 'ClientName', value: '' }
      ],
      displayFields: [
        { key: 'AccountID', label: 'Account ID' },
        { key: 'Description', label: 'Account Name' },
        { key: 'ClientName', label: 'Client Name' }
      ],
      onSelect: (record) => {
        console.log('[CancelStopPayment] Selected account:', record);
        
        // Populate accountId field
        const accountIdEl = document.getElementById('accountId');
        if (accountIdEl) {
          const keys = Object.keys(record);
          const accountIdKey = keys.find(k => k.toLowerCase() === 'accountid');
          accountIdEl.value = accountIdKey ? record[accountIdKey] : '';
        }
        
        // Populate accountName field
        const accountNameEl = document.getElementById('accountName');
        if (accountNameEl) {
          const keys = Object.keys(record);
          const accountNameKey = keys.find(k => k.toLowerCase() === 'description');
          const clientNameKey = keys.find(k => k.toLowerCase() === 'clientname');
          accountNameEl.value = accountNameKey ? record[accountNameKey] : (clientNameKey ? record[clientNameKey] : '');
        }
        
        // Update state
        if (accountIdEl?.value) {
          state.accountId = accountIdEl.value;
        }
        
        showToast('Account selected', 'info');
        
        // Automatically load stop payment records for the selected account
        const branchId = document.getElementById('branchId')?.value?.trim();
        const accountId = accountIdEl?.value?.trim();
        
        if (branchId && accountId) {
          console.log('[CancelStopPayment] Auto-loading stop payment records for selected account');
          handleView();
        }
      }
    });
  };

  // Initialize account search modal on load
  initAccountSearchModal();

  // Wire up accountId lookup button
  const accountLookupBtn = document.querySelector('[data-lookup="accountId"]');
  if (accountLookupBtn) {
    accountLookupBtn.addEventListener('click', openAccountSearch);
    console.log('[CancelStopPayment] Account lookup button wired');
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  // View button
  actionButtons.view?.addEventListener("click", () => void handleView());

  // Add button
  actionButtons.add?.addEventListener("click", () => {
    console.log('[CancelStopPayment] Add clicked');
    
    // Preserve branch and account IDs before clearing
    const branchId = document.getElementById('branchId')?.value || '';
    const branchName = document.getElementById('branchName')?.value || '';
    const accountId = document.getElementById('accountId')?.value || '';
    const accountName = document.getElementById('accountName')?.value || '';
    
    // Clear only the cancel stop payment fields, not account identification
    const fieldsToClean = [
      'requestRef', 'chequeNoStart', 'chequeNoEnd', 'chequeDate', 'chequeAmount',
      'reasonId', 'reasonText', 'cancellationDate', 'instructionGivenBy',
      'clientId', 'clientName', 'productId', 'productName',
      'address1', 'address2', 'city', 'country', 'phoneHome', 'phoneWork', 'faxNo', 'mobile'
    ];
    fieldsToClean.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = el.tagName === 'SELECT' ? '' : '';
    });
    
    // Clear audit fields
    const auditFields = ["MakerID", "MakerDT", "CheckerID", "CheckerDT", "ModifierID", "ModifierDT"];
    auditFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "-";
    });
    
    // Restore branch and account IDs
    if (branchId) document.getElementById('branchId').value = branchId;
    if (branchName) document.getElementById('branchName').value = branchName;
    if (accountId) document.getElementById('accountId').value = accountId;
    if (accountName) document.getElementById('accountName').value = accountName;
    
    state.currentData = null;
    clearAllFieldErrors();
    setEditMode("ADD");
    snapshotValues();
    showToast("Enter new stop payment cancellation details", "info");
  });

  // Edit button
  actionButtons.edit?.addEventListener("click", () => {
    console.log('[CancelStopPayment] Edit clicked');
    if (!state.currentData) {
      showToast("No record to edit. Please view a record first.", "warning");
      return;
    }
    setEditMode("EDIT");
    snapshotValues();
    showToast("You can now edit the stop payment details", "info");
  });

  // Delete button
  actionButtons.delete?.addEventListener("click", () => {
    console.log('[CancelStopPayment] Delete clicked');
    if (!state.currentData) {
      showToast("No record to delete. Please view a record first.", "warning");
      return;
    }
    
    if (confirm("Are you sure you want to delete this stop payment cancellation?")) {
      setEditMode("DELETE");
      showToast("Record marked for deletion. Click Save to confirm.", "warning");
    }
  });

  // Save button
  actionButtons.save?.addEventListener("click", () => void handleSave());

  // Cancel button
  actionButtons.cancel?.addEventListener("click", () => {
    console.log('[CancelStopPayment] Cancel clicked');
    restoreValues();
    setEditMode("NONE");
    clearAllFieldErrors();
    showToast("Changes cancelled", "info");
  });

  // Real-time validation clearing
  const validatedFieldIds = ['branchId', 'accountId', 'chequeNoStart', 'chequeNoEnd', 'reasonId'];
  validatedFieldIds.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener('input', () => {
        if (field.classList.contains('csp-field-invalid')) {
          clearFieldError(field);
        }
      });
    }
  });

  // ============================================================================
  // TITLE BAR AND WINDOW CONTROLS
  // ============================================================================

  function setMinimized(isMinimized) {
    var root = document.querySelector('[data-csp-window]');
    if (!root) return;
    root.classList.toggle('csp-window--minimized', Boolean(isMinimized));
  }

  function doRefresh() {
    try {
      clearAllFieldErrors();
      window.location.reload();
    } catch (_) {
      // ignore
    }
  }

  function wireTitleBar() {
    const btnMin = document.querySelector('[data-csp-minimize]');
    const btnRefresh = document.querySelector('[data-action="refresh"]');
    const btnMaximize = document.querySelector('[data-action="maximize"]');
    const btnClose = document.querySelector('[data-action="close"]');

    if (btnMin) {
      btnMin.addEventListener('click', function () {
        const root = document.querySelector('[data-csp-window]');
        const minimized = root && root.classList.contains('csp-window--minimized');
        setMinimized(!minimized);
      });
    }

    if (btnRefresh) {
      btnRefresh.addEventListener('click', doRefresh);
    }

    if (btnMaximize) {
      btnMaximize.addEventListener('click', function() {
        const windowEl = document.querySelector('.window');
        if (windowEl) {
          const isMaximized = windowEl.classList.toggle('maximized');
          const icon = btnMaximize.querySelector('i');
          if (icon) {
            icon.className = isMaximized ? 'bi bi-fullscreen-exit' : 'bi bi-square';
          }
          btnMaximize.title = isMaximized ? 'Restore' : 'Maximize';
        }
      });
    }

    if (btnClose) {
      btnClose.addEventListener('click', function() {
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ 
              action: 'submoduleClosed',
              source: 'Cancel Stop Payment'
            }, '*');
          } else {
            window.close();
          }
        } catch (error) {
          console.error('Error closing form:', error);
        }
      });
    }
  }

  wireTitleBar();

  // Notify parent that form is opened
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ 
        action: 'submoduleOpened',
        source: 'Cancel Stop Payment'
      }, '*');
    }
  } catch (error) {
    console.error('Error notifying parent:', error);
  }
})();
