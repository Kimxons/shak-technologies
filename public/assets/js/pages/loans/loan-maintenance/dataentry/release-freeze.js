/**
 * Release Freeze Instruction Module
 * Aligned with legacy frmReleaseFreezeInstruction.js behavior
 * Path: Loans > Loan Maintenance > Data Entry > Release Freeze Instruction
 */
(function (global) {
  if (global.__ReleaseFreezeLoaded) {
    console.warn("[ReleaseFreezeInstruction] Already loaded; skipping duplicate execution.");
    return;
  }
  global.__ReleaseFreezeLoaded = true;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const ReleaseFreezeService = global.LoanReleaseFreezeService;

  if (!ReleaseFreezeService) {
    console.error("[ReleaseFreezeInstruction] LoanReleaseFreezeService not loaded");
    return;
  }

  // ============================================================
  // STATE MANAGEMENT (aligned with legacy dtAccFreeze/dtAccFreezeMain)
  // ============================================================
  const state = {
    mode: 'NONE',                // NONE, VIEW, EDIT
    freezeRecords: [],           // Current working data (like dtAccFreeze)
    originalRecords: [],         // Original data for cancel (like dtAccFreezeMain)
    selectedIndices: new Set(),  // Selected row indices
    selectedIndex: -1,           // Currently highlighted row
    isSupervised: false,
    editOperator: '',
    svUpdateCount: 0,
    eventID: 0,
    accountStatusID: '',
    context: null                // Parent context data
  };

  // ============================================================
  // DOM ELEMENT REFERENCES
  // ============================================================
  let root = null;
  let elements = {};

  function cacheElements() {
    root = $("[data-lrf-root]");
    if (!root) return false;

    elements = {
      // Buttons
      btnView: $("[data-action='view']", root),
      btnEdit: $("[data-action='edit']", root),
      btnSave: $("[data-action='save']", root),
      btnCancel: $("[data-action='cancel']", root),
      btnBack: $("[data-action='back']", root),

      // Grid elements
      selectAllCheckbox: $("#SelectAll", root),
      rowsBody: $("[data-lrf-rows]", root),
      emptyEl: $("[data-lrf-empty]", root),
      statusEl: $("[data-lrf-status]", root),

      // Form fields
      releaseReason: $("#ReleaseReason", root),
      reason: $("#Reason", root),
      referenceID: $("#ReferenceID", root),
      freezeValue: $("#FreezeValue", root),
      accountID: $("#AccountID", root),
      freezeDate: $("#FreezeDate", root),
      effectiveDate: $("#EffectiveDate", root),
      freezeCategory: $("#FreezeCategory", root),
      description: $("#Description", root),
      createdBy: $("#CreatedBy", root),
      modifiedBy: $("#ModifiedBy", root),
      supervisedBy: $("#SupervisedBy", root),
      createdOn: $("#CreatedOn", root),
      modifiedOn: $("#ModifiedOn", root),
      supervisedOn: $("#SupervisedOn", root)
    };

    return true;
  }

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================
  function showMessage(msg, color = "Red") {
    if (!elements.statusEl) return;
    elements.statusEl.textContent = msg || "";
    elements.statusEl.className = "lrf-status";
    
    if (msg) {
      if (color === "Red" || color === "red") {
        elements.statusEl.classList.add("text-danger");
      } else if (color === "Green" || color === "green" || color === "blue") {
        elements.statusEl.classList.add("text-success");
      } else if (color === "Orange" || color === "orange") {
        elements.statusEl.classList.add("text-warning");
      }
    }
    
    console.log(`[ReleaseFreezeInstruction] ${color}: ${msg}`);
  }

  function clearMessage() {
    if (elements.statusEl) {
      elements.statusEl.textContent = "";
      elements.statusEl.className = "lrf-status";
    }
  }

  function formatDate(val) {
    if (!val) return '';
    if (typeof val === 'string' && val.length >= 10) {
      return val.substring(0, 10);
    }
    try {
      const date = new Date(val);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-GB');
      }
    } catch (e) {
      // ignore
    }
    return val;
  }

  function formatNumber(num) {
    const value = parseFloat(num);
    if (isNaN(value)) return '0.00';
    return value.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }

  function getOperatorId() {
    if (global.AuthService && global.AuthService.getSession) {
      const session = global.AuthService.getSession();
      return session?.operatorID || session?.operatorId || "web_portal";
    }
    return "web_portal";
  }

  // ============================================================
  // PARENT CONTEXT (like legacy hidden fields)
  // ============================================================
  function getContextFromParent() {
    try {
      const parentDoc = global.parent?.document;
      if (!parentDoc) {
        console.warn("[ReleaseFreezeInstruction] Cannot access parent document");
        return null;
      }

      const read = (id) => parentDoc?.getElementById(id)?.value?.trim?.() || "";
      const branchId = read("BranchID");
      const accountId = read("AccountID");
      const loanSeries = read("LoanSeries") || "0";
      const accountStatusID = read("AccountStatusID") || "A";

      if (ReleaseFreezeService) {
        ReleaseFreezeService.setDynamicValue("BranchID", branchId);
      }

      console.log("[ReleaseFreezeInstruction] Context from parent:", { 
        branchId, accountId, loanSeries, accountStatusID 
      });

      return { branchId, accountId, loanSeries, accountStatusID };
    } catch (error) {
      console.error("[ReleaseFreezeInstruction] Error getting parent context:", error);
      return null;
    }
  }

  // ============================================================
  // BUTTON STATE MANAGEMENT (aligned with legacy fnEnableFields/fnDisableFields)
  // ============================================================
  function updateButtonStates() {
    const { btnView, btnEdit, btnSave, btnCancel, btnBack } = elements;

    switch (state.mode) {
      case 'NONE':
        // Initial state: View and Back enabled
        if (btnView) btnView.disabled = false;
        if (btnEdit) btnEdit.disabled = true;
        if (btnSave) btnSave.disabled = true;
        if (btnCancel) btnCancel.disabled = true;
        if (btnBack) btnBack.disabled = false;
        break;

      case 'VIEW':
        // After View with data: Edit, Cancel, Back enabled; View, Save disabled
        const hasData = state.freezeRecords.length > 0;
        if (btnView) btnView.disabled = true;
        if (btnEdit) btnEdit.disabled = !hasData;
        if (btnSave) btnSave.disabled = true;
        if (btnCancel) btnCancel.disabled = !hasData;
        if (btnBack) btnBack.disabled = false;
        break;

      case 'EDIT':
        // Edit mode: Save, Cancel enabled; View, Edit, Back disabled
        if (btnView) btnView.disabled = true;
        if (btnEdit) btnEdit.disabled = true;
        if (btnSave) btnSave.disabled = false;
        if (btnCancel) btnCancel.disabled = false;
        if (btnBack) btnBack.disabled = true;
        break;
    }

    // Enable/disable grid checkboxes based on mode
    enableGridCheckboxes(state.mode === 'EDIT');
    
    // Enable/disable release reason field
    if (elements.releaseReason) {
      elements.releaseReason.disabled = state.mode !== 'EDIT';
    }

    // Enable/disable Select All checkbox
    if (elements.selectAllCheckbox) {
      elements.selectAllCheckbox.disabled = state.mode !== 'EDIT';
    }
  }

  function enableGridCheckboxes(enabled) {
    $$("tbody tr input[type='checkbox']", root).forEach((cb) => {
      cb.disabled = !enabled;
    });
  }

  // ============================================================
  // DATA LOADING (aligned with legacy fnbtnViewClick)
  // ============================================================
  async function loadData() {
    state.context = getContextFromParent();
    if (!state.context || !state.context.accountId) {
      showMessage("Cannot retrieve account context", "Red");
      return false;
    }

    try {
      showMessage("Loading freeze records...", "blue");
      
      const result = await ReleaseFreezeService.fetchFreezes(state.context);
      
      if (result.success) {
        // Store both working copy and original
        state.freezeRecords = (result.data || []).map((record, idx) => ({
          ...record,
          IsSelected: false,
          _index: idx
        }));
        state.originalRecords = JSON.parse(JSON.stringify(state.freezeRecords));
        state.selectedIndices.clear();
        state.selectedIndex = -1;

        console.log("[ReleaseFreezeInstruction] Loaded", state.freezeRecords.length, "freeze records");

        if (state.freezeRecords.length > 0) {
          renderGrid();
          // Auto-select first row like legacy
          selectRow(0);
          clearMessage();
          return true;
        } else {
          renderGrid();
          showMessage("No freeze records found", "Red");
          return false;
        }
      } else {
        showMessage("Failed to load freeze records", "Red");
        return false;
      }
    } catch (error) {
      console.error("[ReleaseFreezeInstruction] Load error:", error);
      showMessage("Error loading data: " + error.message, "Red");
      return false;
    }
  }

  // ============================================================
  // GRID RENDERING (aligned with legacy fnBindGridData)
  // ============================================================
  function renderGrid() {
    if (!elements.rowsBody) return;

    elements.rowsBody.innerHTML = "";

    if (state.freezeRecords.length === 0) {
      if (elements.emptyEl) elements.emptyEl.removeAttribute("hidden");
      return;
    }

    if (elements.emptyEl) elements.emptyEl.setAttribute("hidden", "");

    state.freezeRecords.forEach((record, idx) => {
      const row = document.createElement("tr");
      const isSelected = state.selectedIndices.has(idx);
      const isHighlighted = idx === state.selectedIndex;

      if (isHighlighted) {
        row.classList.add("table-active");
      }

      // Checkbox cell
      const checkboxCell = document.createElement("td");
      checkboxCell.style.textAlign = "center";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "form-check-input";
      checkbox.checked = isSelected;
      checkbox.disabled = state.mode !== 'EDIT';
      checkbox.addEventListener("change", (e) => {
        e.stopPropagation();
        if (e.target.checked) {
          state.selectedIndices.add(idx);
          state.freezeRecords[idx].IsSelected = true;
        } else {
          state.selectedIndices.delete(idx);
          state.freezeRecords[idx].IsSelected = false;
        }
        updateSelectAllState();
      });
      checkboxCell.appendChild(checkbox);
      row.appendChild(checkboxCell);

      // Data cells
      row.appendChild(createCell(record.ReferenceID || ""));
      row.appendChild(createCell(record.OurBranchID || ""));
      row.appendChild(createCell(record.AccountID || ""));
      row.appendChild(createCell(record.Description || record.Name || ""));
      row.appendChild(createCell(record.FreezeCategory || ""));
      row.appendChild(createCell(formatNumber(record.FreezedValue || 0), "text-end"));

      // Row click handler - select row and update BTS fields
      row.addEventListener("click", (e) => {
        if (e.target.type === 'checkbox') return;
        selectRow(idx);
      });

      elements.rowsBody.appendChild(row);
    });

    updateSelectAllState();
  }

  function createCell(content, className = "") {
    const cell = document.createElement("td");
    cell.textContent = content;
    if (className) cell.className = className;
    return cell;
  }

  function selectRow(index) {
    if (index < 0 || index >= state.freezeRecords.length) return;

    state.selectedIndex = index;
    
    // Update row highlights
    $$("tbody tr", elements.rowsBody).forEach((tr, i) => {
      tr.classList.toggle("table-active", i === index);
    });

    // Update BTS fields
    updateBTSFields(index);
  }

  function updateSelectAllState() {
    if (!elements.selectAllCheckbox) return;
    
    const total = state.freezeRecords.length;
    const selected = state.selectedIndices.size;
    
    elements.selectAllCheckbox.checked = total > 0 && selected === total;
    elements.selectAllCheckbox.indeterminate = selected > 0 && selected < total;
  }

  // ============================================================
  // BTS FIELDS UPDATE (aligned with legacy fnselectRecord)
  // ============================================================
  function updateBTSFields(index) {
    if (index < 0 || index >= state.freezeRecords.length) {
      clearBTSFields();
      return;
    }

    const record = state.freezeRecords[index];
    
    if (elements.reason) elements.reason.value = record.FreezedReason || record.Reason || "";
    if (elements.referenceID) elements.referenceID.value = record.ReferenceID || "";
    if (elements.freezeValue) elements.freezeValue.value = formatNumber(record.FreezedValue || 0);
    if (elements.accountID) elements.accountID.value = record.AccountID || "";
    if (elements.freezeDate) elements.freezeDate.value = formatDate(record.FreezedDate || "");
    if (elements.effectiveDate) elements.effectiveDate.value = formatDate(record.EffectiveDate || "");
    if (elements.freezeCategory) elements.freezeCategory.value = record.FreezeCategory || "";
    if (elements.description) elements.description.value = record.Description || record.Name || "";
    if (elements.createdBy) elements.createdBy.value = record.CreatedBy || "";
    if (elements.modifiedBy) elements.modifiedBy.value = record.ModifiedBy || "";
    if (elements.supervisedBy) elements.supervisedBy.value = record.SupervisedBy || "";
    if (elements.createdOn) elements.createdOn.value = formatDate(record.CreatedOn || "");
    if (elements.modifiedOn) elements.modifiedOn.value = formatDate(record.ModifiedOn || "");
    if (elements.supervisedOn) elements.supervisedOn.value = formatDate(record.SupervisedOn || "");
  }

  function clearBTSFields() {
    const btsFields = ['reason', 'referenceID', 'freezeValue', 'accountID', 'freezeDate', 
      'effectiveDate', 'freezeCategory', 'description', 'createdBy', 'modifiedBy', 
      'supervisedBy', 'createdOn', 'modifiedOn', 'supervisedOn'];
    
    btsFields.forEach(field => {
      if (elements[field]) elements[field].value = "";
    });
  }

  // ============================================================
  // VALIDATION (aligned with legacy fnbtnSaveClick validation)
  // ============================================================
  function validateForm() {
    clearMessage();

    // Check Release Reason (mandatory)
    const releaseReason = elements.releaseReason?.value?.trim() || "";
    if (!releaseReason) {
      showMessage("Release Reason is required", "Red");
      if (elements.releaseReason) {
        elements.releaseReason.focus();
        elements.releaseReason.classList.add("is-invalid");
      }
      return false;
    }

    // Remove invalid class if valid
    if (elements.releaseReason) {
      elements.releaseReason.classList.remove("is-invalid");
    }

    // Check at least one record selected
    if (state.selectedIndices.size === 0) {
      showMessage("Please select at least one freeze record", "Red");
      return false;
    }

    return true;
  }

  // ============================================================
  // BUTTON HANDLERS
  // ============================================================
  
  /**
   * View Button Click (aligned with legacy fnbtnViewClick)
   */
  async function handleViewClick() {
    console.log("[ReleaseFreezeInstruction] View clicked");
    clearMessage();

    // Disable buttons during load
    if (elements.btnView) elements.btnView.disabled = true;

    const loaded = await loadData();

    if (loaded && state.freezeRecords.length > 0) {
      state.mode = 'VIEW';
      
      // If there's existing release reason in data, populate it
      if (state.freezeRecords[0]?.Reason) {
        if (elements.releaseReason) {
          elements.releaseReason.value = state.freezeRecords[0].Reason;
        }
      }
      
      updateButtonStates();
    } else if (state.freezeRecords.length === 0) {
      // No records found
      state.mode = 'NONE';
      updateButtonStates();
      if (elements.btnEdit) elements.btnEdit.disabled = true;
      if (elements.btnCancel) elements.btnCancel.disabled = true;
    } else {
      // Error occurred
      state.mode = 'NONE';
      updateButtonStates();
    }
  }

  /**
   * Edit Button Click (aligned with legacy fnUserRights EDIT)
   */
  async function handleEditClick() {
    console.log("[ReleaseFreezeInstruction] Edit clicked");
    clearMessage();

    // Check account status (like legacy fnUserRights)
    if (state.context?.accountStatusID && 
        state.context.accountStatusID !== 'A' && 
        state.context.accountStatusID !== 'N') {
      showMessage("Account status does not allow editing", "Red");
      return;
    }

    try {
      // Check user rights
      const rightsResult = await ReleaseFreezeService.checkUserRights({
        branchId: state.context?.branchId,
        accountId: state.context?.accountId,
        loanSeries: state.context?.loanSeries,
        updateCount: state.svUpdateCount
      });

      if (rightsResult.success) {
        state.isSupervised = rightsResult.isSupervised || false;
      }
    } catch (error) {
      console.warn("[ReleaseFreezeInstruction] Rights check error:", error);
    }

    // Enter edit mode
    state.mode = 'EDIT';
    updateButtonStates();
    
    // Focus on release reason field
    if (elements.releaseReason) {
      elements.releaseReason.focus();
    }

    showMessage("Select records to release and enter the release reason", "blue");
  }

  /**
   * Save Button Click (aligned with legacy fnbtnSaveClick)
   */
  async function handleSaveClick() {
    console.log("[ReleaseFreezeInstruction] Save clicked");

    if (!validateForm()) {
      return;
    }

    const releaseReason = elements.releaseReason?.value?.trim() || "";
    const selectedRecords = state.freezeRecords.filter((_, idx) => state.selectedIndices.has(idx));

    if (selectedRecords.length === 0) {
      showMessage("No records selected", "Red");
      return;
    }

    // Disable save during operation
    if (elements.btnSave) elements.btnSave.disabled = true;

    try {
      showMessage("Saving release instructions...", "blue");

      // Save each selected record (like legacy loop)
      for (const record of selectedRecords) {
        const payload = {
          OurBranchID: state.context?.branchId || record.OurBranchID,
          AccountID: state.context?.accountId || record.AccountID,
          LoanSeries: parseInt(state.context?.loanSeries) || 0,
          TableID: record.TableID || "",
          ReferenceID: record.ReferenceID || "",
          FreezeValue: record.FreezedValue || 0,
          Description: record.Description || record.Name || "",
          FreezedDate: record.FreezedDate || "",
          EffectiveDate: record.EffectiveDate || "",
          FreezeCategory: record.FreezeCategory || "",
          Reason: releaseReason,
          CreatedBy: record.CreatedBy || getOperatorId(),
          CreatedOn: record.CreatedOn || "",
          ModifiedBy: getOperatorId(),
          ModifiedOn: new Date().toISOString(),
          SupervisedBy: "",
          UpdateCount: record.UpdateCount || 0,
          NewRecord: 0
        };

        console.log("[ReleaseFreezeInstruction] Saving record:", payload);
        const result = await ReleaseFreezeService.saveFreezeRelease(payload);

        if (!result.success) {
          showMessage("Save failed: " + (result.error || "Unknown error"), "Red");
          if (elements.btnSave) elements.btnSave.disabled = false;
          return;
        }
      }

      // Success - show appropriate message based on supervision
      if (state.isSupervised) {
        showMessage("Data saved successfully. Pending supervision.", "blue");
      } else {
        showMessage("Data saved successfully", "Green");
      }

      // Reset form after successful save (like legacy)
      setTimeout(() => {
        resetAfterSave();
      }, 1500);

    } catch (error) {
      console.error("[ReleaseFreezeInstruction] Save error:", error);
      showMessage("Error saving: " + error.message, "Red");
      if (elements.btnSave) elements.btnSave.disabled = false;
    }
  }

  function resetAfterSave() {
    // Clear data
    state.freezeRecords = [];
    state.originalRecords = [];
    state.selectedIndices.clear();
    state.selectedIndex = -1;
    state.mode = 'NONE';

    // Clear grid
    if (elements.rowsBody) elements.rowsBody.innerHTML = "";
    if (elements.emptyEl) elements.emptyEl.removeAttribute("hidden");

    // Clear form fields
    if (elements.releaseReason) elements.releaseReason.value = "";
    clearBTSFields();

    // Update button states
    updateButtonStates();
    
    // Focus on View button
    if (elements.btnView) elements.btnView.focus();
  }

  /**
   * Cancel Button Click (aligned with legacy fnbtnCancelClick)
   */
  function handleCancelClick() {
    console.log("[ReleaseFreezeInstruction] Cancel clicked");

    if (state.mode === 'EDIT') {
      if (!confirm("Cancel changes? All unsaved changes will be lost.")) {
        return;
      }

      // Restore original data (like legacy dtAccFreezeMain copy)
      state.freezeRecords = JSON.parse(JSON.stringify(state.originalRecords));
      state.selectedIndices.clear();
      
      // Mark originally selected records
      state.freezeRecords.forEach((record, idx) => {
        if (state.originalRecords[idx]?.IsSelected) {
          state.selectedIndices.add(idx);
          record.IsSelected = true;
        }
      });

      // Re-render grid
      renderGrid();
      
      // Restore release reason
      if (elements.releaseReason && state.freezeRecords[0]?.Reason) {
        elements.releaseReason.value = state.freezeRecords[0].Reason;
      } else if (elements.releaseReason) {
        elements.releaseReason.value = "";
      }
      
      // Remove any validation styling
      if (elements.releaseReason) {
        elements.releaseReason.classList.remove("is-invalid");
      }

      // Go back to view mode
      state.mode = 'VIEW';
      updateButtonStates();
      clearMessage();

      if (elements.btnEdit) elements.btnEdit.focus();
    } else if (state.mode === 'VIEW' || state.mode === 'NONE') {
      // Full cancel - clear everything
      state.freezeRecords = [];
      state.originalRecords = [];
      state.selectedIndices.clear();
      state.selectedIndex = -1;
      state.mode = 'NONE';

      // Clear grid
      if (elements.rowsBody) elements.rowsBody.innerHTML = "";
      if (elements.emptyEl) elements.emptyEl.removeAttribute("hidden");

      // Clear fields
      if (elements.releaseReason) elements.releaseReason.value = "";
      clearBTSFields();

      updateButtonStates();
      clearMessage();

      if (elements.btnView) elements.btnView.focus();
    }
  }

  /**
   * Back Button Click
   */
  function handleBackClick() {
    console.log("[ReleaseFreezeInstruction] Back clicked");
    
    // If in edit mode, cancel first
    if (state.mode === 'EDIT') {
      handleCancelClick();
      return;
    }

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ action: 'close-child-form' }, '*');
    }
  }

  /**
   * Select All Checkbox Handler
   */
  function handleSelectAllChange(e) {
    if (state.mode !== 'EDIT') return;

    const checked = e.target.checked;
    
    state.freezeRecords.forEach((record, idx) => {
      record.IsSelected = checked;
      if (checked) {
        state.selectedIndices.add(idx);
      } else {
        state.selectedIndices.delete(idx);
      }
    });

    renderGrid();
  }

  // ============================================================
  // EVENT BINDING
  // ============================================================
  function bindEvents() {
    if (elements.btnView) {
      elements.btnView.addEventListener("click", handleViewClick);
    }
    if (elements.btnEdit) {
      elements.btnEdit.addEventListener("click", handleEditClick);
    }
    if (elements.btnSave) {
      elements.btnSave.addEventListener("click", handleSaveClick);
    }
    if (elements.btnCancel) {
      elements.btnCancel.addEventListener("click", handleCancelClick);
    }
    if (elements.btnBack) {
      elements.btnBack.addEventListener("click", handleBackClick);
    }
    if (elements.selectAllCheckbox) {
      elements.selectAllCheckbox.addEventListener("change", handleSelectAllChange);
    }

    // Release reason max length validation (like legacy fnChkRemarkLength)
    if (elements.releaseReason) {
      elements.releaseReason.addEventListener("input", (e) => {
        if (e.target.value.length > 255) {
          e.target.value = e.target.value.substring(0, 255);
        }
      });
    }
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================
  function init() {
    console.log("[ReleaseFreezeInstruction] Initializing...");

    if (!cacheElements()) {
      console.error("[ReleaseFreezeInstruction] Root element not found");
      return;
    }

    bindEvents();
    
    // Set initial state (like legacy fnPageLoad_CallBack)
    state.mode = 'NONE';
    updateButtonStates();

    // Focus on View button
    if (elements.btnView) {
      elements.btnView.focus();
    }

    console.log("[ReleaseFreezeInstruction] Initialization complete");
  }

  // Initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);

