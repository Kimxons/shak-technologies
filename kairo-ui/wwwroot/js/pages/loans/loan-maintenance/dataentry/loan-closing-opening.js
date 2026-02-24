/**
 * Loan Closing/Opening - Data Entry Module
 * Manages loan closing/opening operations with full edit, save, and approval workflow
 */

(function () {
  const root = document.querySelector("[data-lco-root]");
  if (!root) return;

  // ==================== STATE & DATA ====================
  let mode = "view"; // view | edit
  let closingData = null; // Details01 array [0]
  let userDetails = null; // Details array [0]

  // ==================== DOM ELEMENTS ====================
  const elements = {
    // Hidden fields
    branchID: root.querySelector("#hdnBranchID"),
    accountID: root.querySelector("#hdnAccountID"),
    loanSeries: root.querySelector("#hdnLoanSeries"),
    operatorID: root.querySelector("#hdnOperatorID"),
    eventID: root.querySelector("#hdnEventID"),
    editMode: root.querySelector("#hdnEditMode"),
    updateCount: root.querySelector("#hdnUpdateCount"),
    isSupervised: root.querySelector("#hdnIsSupervised"),
    operation: root.querySelector("#hdnOperation"),
    groupLoanAccount: root.querySelector("#hdnGroupLoanAccount"),
    editOperator: root.querySelector("#hdnEditOperator"),
    loanStatusID: root.querySelector("#hdnLoanStatusID"),

    // Editable fields
    closingRemarks: root.querySelector("#ClosingRemarks"),

    // BTS (behind-the-scene) fields
    btsRemarks: root.querySelector("#BtsRemarks"),
    loanBalance: root.querySelector("#LoanBalance"),
    freezedAmount: root.querySelector("#FreezedAmount"),
    loanStatus: root.querySelector("#LoanStatus"),
    closedBy: root.querySelector("#ClosedBy"),
    closedOn: root.querySelector("#ClosedOn"),

    // Caption
    caption: root.querySelector("#lblCaption"),

    // Status and buttons
    statusEl: root.querySelector("[data-lco-status]"),
    btnEdit: root.querySelector('[data-action="edit"]'),
    btnSave: root.querySelector('[data-action="save"]'),
    btnCancel: root.querySelector('[data-action="cancel"]'),
    btnBack: root.querySelector('[data-action="back"]'),
  };

  // ==================== UTILITY FUNCTIONS ====================
  function getValue(field) {
    return field?.value || "";
  }

  function setValue(field, value) {
    if (field) field.value = value || "";
  }

  function setStatus(message, kind) {
    if (!message) {
      clearStatus();
      return;
    }

    // Display message as popup
    if (kind === "error") {
      alert("Error: " + message);
    } else if (kind === "success") {
      alert("Success: " + message);
    } else if (kind === "warning") {
      alert("Warning: " + message);
    } else {
      alert(message);
    }
  }

  function clearStatus() {
    // No-op for popup-based messaging
  }

  function setFieldsEnabled(enabled) {
    elements.closingRemarks.disabled = !enabled;
  }

  function setActionState() {
    const isView = mode === "view";

    // View mode: Edit and Back enabled, Save and Cancel disabled
    // Edit mode: Save and Cancel enabled, Edit and Back disabled
    elements.btnEdit.disabled = isView ? false : true;
    elements.btnSave.disabled = isView ? true : false;
    elements.btnCancel.disabled = isView ? true : false;
    elements.btnBack.disabled = isView ? false : true;

    setFieldsEnabled(!isView);
  }

  function setMode(nextMode) {
    mode = nextMode;
    elements.editMode.value = nextMode.toUpperCase();
    clearStatus();
    setActionState();
  }

  function closeSubwindow() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ action: 'close-child-form' }, '*');
    }
  }

  // ==================== DATA LOADING ====================
  function getContextFromParent() {
    const parentDoc = window.parent?.document;
    const read = (id) => parentDoc?.getElementById(id)?.value?.trim?.() || "";
    
    const context = {
      branchID: read("BranchID"),
      accountID: read("AccountID"),
      loanSeries: read("LoanSeries"),
      operatorID: window._OperatorID || "SYSTEM"
    };
    
    console.log('[Loan Closing/Opening] Reading from parent document:', context);
    console.log('[Loan Closing/Opening] Parent LoanSeries element:', parentDoc?.getElementById("LoanSeries"));
    console.log('[Loan Closing/Opening] Parent LoanSeries raw value:', parentDoc?.getElementById("LoanSeries")?.value);
    
    return context;
  }

  function loadData() {
    // Get parameters from parent document
    const context = getContextFromParent();
    const { branchID, accountID, loanSeries, operatorID } = context;

    // Store parameters in hidden fields
    setValue(elements.branchID, branchID);
    setValue(elements.accountID, accountID);
    setValue(elements.loanSeries, loanSeries);
    setValue(elements.operatorID, operatorID);

    if (!branchID || !accountID || !loanSeries) {
      setStatus("Missing required parameters", "error");
      disableAllActions();
      return;
    }

    console.log('[Loan Closing/Opening] Loading data:', {
      branchID,
      accountID,
      loanSeries: parseInt(loanSeries),
      operatorID
    });

    // Load details from service
    loanClosingOpeningService
      .getDetails(branchID, accountID, parseInt(loanSeries), operatorID)
      .then((response) => {
        if (!response.success) {
          setStatus(response.error || "Failed to load data", "error");
          disableAllActions();
          return;
        }

        userDetails = response.details?.[0] || null;
        closingData = response.closingDetails?.[0] || null;

        if (!closingData) {
          setStatus("No closing/opening data found", "error");
          disableAllActions();
          return;
        }

        // Store in hidden fields
        setValue(elements.eventID, userDetails?.EventID || 0);
        setValue(elements.updateCount, userDetails?.UpdateCount || 0);
        setValue(elements.operation, closingData?.Operation || "");
        setValue(elements.groupLoanAccount, closingData?.GroupLoanAccount || 0);
        setValue(elements.editOperator, userDetails?.OperatorID || "");
        setValue(elements.loanStatusID, closingData?.LoanStatusID || "");

        // Bind data to UI
        bindData();
        initializeWorkflow();
      })
      .catch((error) => {
        console.error("Error loading closing/opening data:", error);
        setStatus("Error loading data: " + error.message, "error");
        disableAllActions();
      });
  }

  // ==================== MESSAGE HANDLING ====================
  function bindData() {
    if (!closingData) return;

    // Editable field - only populate if UpdateCount > 0 (existing record)
    const updateCount = parseInt(getValue(elements.updateCount) || 0);
    if (updateCount > 0) {
      setValue(elements.closingRemarks, closingData.Remarks || "");
    } else {
      setValue(elements.closingRemarks, "");
    }

    // BTS (behind-the-scene) fields - always populate from closingData
    setValue(elements.btsRemarks, closingData.LoanRemarks);
    setValue(elements.loanBalance, closingData.LoanBalance);
    setValue(elements.freezedAmount, closingData.FreezedAmount);
    setValue(elements.loanStatus, closingData.LoanStatus);
    setValue(elements.closedBy, closingData.ClosedBy);
    
    // Format date if present
    if (closingData.ClosedDate) {
      const date = new Date(closingData.ClosedDate);
      if (!isNaN(date.getTime())) {
        setValue(elements.closedOn, date.toLocaleDateString());
      } else {
        setValue(elements.closedOn, "");
      }
    } else {
      setValue(elements.closedOn, "");
    }

    // Update caption based on operation
    if (closingData.Operation === "C") {
      elements.caption.textContent = "Loan Closing Details";
    } else if (closingData.Operation === "O") {
      elements.caption.textContent = "Loan Opening Details";
    }
  }

  function disableAllActions() {
    elements.btnEdit.disabled = true;
    elements.btnSave.disabled = true;
    elements.btnCancel.disabled = true;
    elements.closingRemarks.disabled = true;
  }

  // ==================== WORKFLOW INITIALIZATION ====================
  function initializeWorkflow() {
    const eventID = parseInt(getValue(elements.eventID));
    const operatorID = getValue(elements.operatorID);
    const editOperator = getValue(elements.editOperator) || userDetails?.OperatorID || "";
    const operation = getValue(elements.operation);
    const updateCount = parseInt(getValue(elements.updateCount) || 0);

    setMode("view");

    // Check if operation is empty (new record with no operation selected)
    if (operation === "") {
      setStatus("446501", "error"); // Message: Operation field is empty
      elements.btnEdit.disabled = true;
      elements.btnSave.disabled = true;
      elements.btnCancel.disabled = true;
      elements.btnBack.disabled = false;
      return;
    }

    switch (eventID) {
      case 0:
        // New record or approved record - allow edit
        elements.btnEdit.disabled = false;
        elements.btnSave.disabled = true;
        elements.btnCancel.disabled = true;
        elements.btnBack.disabled = false;
        
        // If no data yet, clear remarks
        if (updateCount === 0) {
          setValue(elements.closingRemarks, "");
        }
        break;

      case 3:
        // Pending approval - check if current user is the original operator
        if (operatorID === editOperator) {
          elements.btnEdit.disabled = false;
          elements.btnSave.disabled = true;
          elements.btnCancel.disabled = true;
          elements.btnBack.disabled = false;
          setStatus(
            "1010",
            "error"
          ); // Message: This record is pending approval
        } else {
          // Different operator - read-only
          setStatus(
            "1013",
            "error"
          ); // Message: Pending approval by another operator
          elements.btnEdit.disabled = true;
          elements.btnSave.disabled = true;
          elements.btnCancel.disabled = true;
          elements.btnBack.disabled = false;
        }
        break;

      default:
        // Other states - allow edit
        elements.btnEdit.disabled = false;
        elements.btnSave.disabled = true;
        elements.btnCancel.disabled = true;
        elements.btnBack.disabled = false;
        break;
    }
  }

  // ==================== VALIDATION ====================
  function validateInput() {
    clearStatus();

    const remarks = getValue(elements.closingRemarks).trim();

    // Mandatory validation
    if (!remarks) {
      setStatus("1405", "error"); // Message: Remarks are mandatory
      elements.closingRemarks.focus();
      return false;
    }

    // Length validation
    if (remarks.length > 255) {
      setStatus("Remarks cannot exceed 255 characters", "error");
      return false;
    }

    // Business logic validation for closing (Operation = "C")
    if (closingData?.Operation === "C") {
      const loanBalance = parseFloat(closingData?.LoanBalance || 0);
      const freezedAmount = parseFloat(closingData?.FreezedAmount || 0);

      if (loanBalance > 0) {
        setStatus(
          "446502",
          "error"
        ); // Message: Cannot close loan with outstanding balance
        return false;
      }

      if (freezedAmount > 0) {
        setStatus(
          "446503",
          "error"
        ); // Message: Cannot close loan with freezed amount
        return false;
      }
    }

    return true;
  }

  // ==================== ACTION HANDLERS ====================
  function handleEdit() {
    // Validate business rules before allowing edit
    if (!validateBusinessRules()) {
      return;
    }

    // For Group Loan Opening operations, show info message
    if (closingData?.Operation === "O" && getValue(elements.groupLoanAccount) === "1") {
      setStatus("446504", "warning"); // Message: Group Loan Account - Opening operation
    }

    setMode("edit");
    elements.closingRemarks.focus();
  }

  function validateBusinessRules() {
    // Business logic validation for closing (Operation = "C")
    if (closingData?.Operation === "C") {
      const loanBalance = parseFloat(closingData?.LoanBalance || 0);
      const freezedAmount = parseFloat(closingData?.FreezedAmount || 0);

      if (loanBalance > 0) {
        setStatus(
          "446502",
          "error"
        ); // Message: Cannot close loan with outstanding balance
        return false;
      }

      if (freezedAmount > 0) {
        setStatus(
          "446503",
          "error"
        ); // Message: Cannot close loan with freezed amount
        return false;
      }
    }

    return true;
  }

  function handleCancel() {
    if (mode === "edit") {
      // Confirmation dialog for canceling edit
      if (!confirm("1100")) { // Message: Cancel changes?
        return;
      }
      
      // Revert to previous remarks
      const updateCount = parseInt(getValue(elements.updateCount) || 0);
      if (updateCount > 0) {
        setValue(elements.closingRemarks, closingData?.Remarks || "");
      } else {
        setValue(elements.closingRemarks, "");
      }
      
      setMode("view");
      clearStatus();
    } else {
      // In view mode, Back button should close the window
      closeSubwindow();
    }
  }

  function handleSave() {
    if (!validateInput()) {
      return;
    }

    // Check user rights and supervision requirement
    const branchID = getValue(elements.branchID);
    const accountID = getValue(elements.accountID);
    const loanSeries = getValue(elements.loanSeries);
    const editMode = getValue(elements.editMode);
    const updateCount = parseInt(getValue(elements.updateCount) || 0);

    loanClosingOpeningService
      .getUserRights(branchID, accountID, parseInt(loanSeries), editMode, updateCount)
      .then((response) => {
        const isSupervised = response.isSupervised || false;
        setValue(elements.isSupervised, isSupervised ? "1" : "0");

        if (isSupervised) {
          // Show supervisor remarks dialog
          promptSupervisorRemarks((supervisorRemarks) => {
            if (supervisorRemarks === null) {
              return; // User cancelled
            }
            performSave(supervisorRemarks);
          });
        } else {
          performSave(null);
        }
      })
      .catch((error) => {
        console.error("Error checking user rights:", error);
        setStatus("Error checking user rights", "error");
      });
  }

  function performSave(supervisorRemarks) {
    const payload = {
      branchID: getValue(elements.branchID),
      accountID: getValue(elements.accountID),
      loanSeries: parseInt(getValue(elements.loanSeries)),
      remarks: getValue(elements.closingRemarks),
      operatorID: getValue(elements.operatorID),
      mode: getValue(elements.editMode),
      supervisorRemarks: supervisorRemarks,
      updateCount: parseInt(getValue(elements.updateCount) || 0),
    };

    elements.btnSave.disabled = true;

    loanClosingOpeningService
      .saveClosingOpening(payload)
      .then((response) => {
        if (!response.success) {
          setStatus(response.error || "Failed to save", "error");
          elements.btnSave.disabled = false;
          return;
        }

        // Success - determine message based on supervision
        const isSupervised = getValue(elements.isSupervised) === "1";
        const successMsg = isSupervised ? "1020" : "1021";
        
        setStatus(successMsg, "success");
        setMode("view");

        // Reload data to reflect changes
        loadData();
      })
      .catch((error) => {
        console.error("Error saving record:", error);
        setStatus(error.message || "1305", "error"); // Message: Service error
        elements.btnSave.disabled = false;
      });
  }

  function handleBack() {
    closeSubwindow();
  }

  // ==================== SUPERVISOR REMARKS DIALOG ====================
  function promptSupervisorRemarks(callback) {
    const remarks = prompt(
      "This action requires supervisor approval.\n\nEnter your supervisor remarks:",
      ""
    );

    if (remarks === null) {
      // User cancelled
      callback(null);
      return;
    }

    callback(remarks);
  }

  // ==================== EVENT LISTENERS ====================
  elements.btnEdit?.addEventListener("click", handleEdit);
  elements.btnSave?.addEventListener("click", handleSave);
  elements.btnCancel?.addEventListener("click", handleCancel);
  elements.btnBack?.addEventListener("click", handleBack);

  // Limit remarks to 255 characters
  elements.closingRemarks?.addEventListener("keypress", (e) => {
    const remarks = getValue(elements.closingRemarks);
    if (remarks.length >= 255) {
      // Allow only navigation and delete keys
      const allowedKeys = [8, 9, 35, 36, 37, 39, 46]; // backspace, tab, end, home, left, right, delete
      if (!allowedKeys.includes(e.keyCode)) {
        e.preventDefault();
      }
    }
  });

  // ==================== INITIALIZATION ====================
  // Auto-load data when iframe is ready
  window.addEventListener("DOMContentLoaded", () => {
    // Small delay to ensure parent document is accessible
    setTimeout(() => {
      loadData();
    }, 100);
  });

  // Handle page unload cleanup
  window.addEventListener("beforeunload", () => {
    if (mode === "edit") {
      // Optionally send cleanup signal to server
    }
  });
})();

