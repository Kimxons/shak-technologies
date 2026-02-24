(() => {
  if (window.__kairoClientTypeWorkflowLoaded) return;
  window.__kairoClientTypeWorkflowLoaded = true;

  // ==================== CONSTANTS ====================
  const MODES = {
    VIEW: "View",
    EDIT: "Edit",
  };

  // ==================== STATE ====================
  const state = {
    mode: MODES.VIEW,
    hasLoaded: false,
    isBusy: false,
    originalClientTypes: [], // Store original selection for cancel
    allClientTypes: [], // All available client types
  };

  // ==================== DOM HELPERS ====================
  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  // ==================== TOAST HELPERS (Kairo Design System) ====================
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

    // Limit to one toast at a time - remove existing
    const existingToasts = container.querySelectorAll('.kairo-toast');
    existingToasts.forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `kairo-toast kairo-toast--${variant}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-atomic', 'true');

    const body = document.createElement('div');
    body.className = 'kairo-toast__body';
    body.textContent = String(message || '');

    toast.appendChild(body);
    container.appendChild(toast);

    const remove = () => {
      try {
        toast.classList.remove('is-show');
        setTimeout(() => toast.remove(), 160);
      } catch {
        // ignore
      }
    };

    setTimeout(() => toast.classList.add('is-show'), 0);
    if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
  }

  function showSuccessToast(message) {
    showToast(message, { title: 'Success', variant: 'success', timeoutMs: 3000 });
  }

  function showErrorToast(message) {
    showToast(message, { title: 'Error', variant: 'danger', timeoutMs: 4000 });
  }

  function showWarningToast(message) {
    showToast(message, { title: 'Warning', variant: 'warning', timeoutMs: 3000 });
  }

  function showInfoToast(message) {
    showToast(message, { title: 'Info', variant: 'info', timeoutMs: 3000 });
  }

  function setToast(message, variant = "success") {
    switch (variant) {
      case 'success':
        showSuccessToast(message);
        break;
      case 'danger':
      case 'error':
        showErrorToast(message);
        break;
      case 'warning':
        showWarningToast(message);
        break;
      case 'info':
      default:
        showInfoToast(message);
        break;
    }
  }

  // ==================== BUTTON HELPERS ====================
  function setButtonDisabled(buttonEl, disabled) {
    if (!buttonEl) return;
    buttonEl.disabled = !!disabled;
    if (disabled) {
      buttonEl.setAttribute("disabled", "");
      buttonEl.setAttribute("aria-disabled", "true");
      buttonEl.classList.add("is-disabled");
    } else {
      buttonEl.removeAttribute("disabled");
      buttonEl.setAttribute("aria-disabled", "false");
      buttonEl.classList.remove("is-disabled");
    }
  }

  function getActionButtons() {
    return {
      view: qs('[data-ctw-action="view"]'),
      edit: qs('[data-ctw-action="edit"]'),
      save: qs('[data-ctw-action="save"]'),
      cancel: qs('[data-ctw-action="cancel"]'),
    };
  }

  function updateActionButtons() {
    const { view, edit, save, cancel } = getActionButtons();
    const isEditable = state.mode === MODES.EDIT;

    // View: disabled once loaded or in edit mode
    setButtonDisabled(view, isEditable || state.hasLoaded);

    // Edit: enabled only when record is loaded and in VIEW mode
    setButtonDisabled(edit, !state.hasLoaded || isEditable);

    // Save: only enabled in EDIT mode
    setButtonDisabled(save, !isEditable);

    // Cancel: enabled in edit mode or when there's something to clear
    setButtonDisabled(cancel, !isEditable && !state.hasLoaded);
  }

  // ==================== AUTH HELPERS ====================
  function getOperatorId() {
    try {
      const session = window.AuthService?.getSession?.();
      return session?.operatorId || session?.operatorID || session?.name || "CSADM";
    } catch {
      return "CSADM";
    }
  }

  function getOurBranchId() {
    try {
      const session = window.AuthService?.getSession?.();
      return session?.ourBranchID || session?.ourBranchId || session?.branchId || "001";
    } catch {
      return "001";
    }
  }

  function getBankId() {
    try {
      const session = window.AuthService?.getSession?.();
      return session?.bankID || session?.bankId || session?.BankID || "01";
    } catch {
      return "01";
    }
  }

  // ==================== SERVICE LOADER ====================
  async function ensureServicesLoaded() {
    if (!window.ServiceLoader) {
      console.error("ServiceLoader not found");
      return false;
    }
    await window.ServiceLoader.loadCore();
    if (!window.AuthService) await window.ServiceLoader.loadAuthService?.();
    if (!window.LookupService) await window.ServiceLoader.loadLookupService?.();
    await window.ServiceLoader.loadOtherStaticDataService?.();
    return true;
  }

  // ==================== DATA HELPERS ====================
  /**
   * Check API response for errors
   * CoreApi returns: { success, code, message, data }
   * SP returns: { ResponseCode, ResponseMessage, Details }
   * ResponseCode '000' = success, others are errors
   */
  function checkResponseError(response) {
    if (!response) return { hasError: true, message: "Empty response" };

    // Check CoreApi-level error (success: false)
    if (response.success === false) {
      return {
        hasError: true,
        code: response.code,
        message: response.message || "Request failed"
      };
    }

    const data = response.Data || response.data || response;

    // Check for ResponseCode (SP returns '000' for success)
    const responseCode = data?.ResponseCode || data?.responseCode;
    const responseMessage = data?.ResponseMessage || data?.responseMessage || data?.Message || data?.message;

    if (responseCode && responseCode !== '000') {
      return {
        hasError: true,
        code: responseCode,
        message: responseMessage || `Error code: ${responseCode}`
      };
    }

    // Check for ErrorMessage field
    const errorMsg = data?.ErrorMessage || data?.errorMessage;
    if (errorMsg) {
      return { hasError: true, message: errorMsg };
    }

    return { hasError: false };
  }

  function extractWorkflows(response) {
    if (!response) return [];

    // Check various response structures
    const data = response.Data || response.data || response;

    // Look for Details array or other array structures
    if (Array.isArray(data)) return data;
    if (data.Details && Array.isArray(data.Details)) return data.Details;
    if (data.Details01 && Array.isArray(data.Details01)) return data.Details01;
    if (data.Workflows && Array.isArray(data.Workflows)) return data.Workflows;

    return [];
  }

  function extractClientTypes(response) {
    if (!response) return [];

    const data = response.Data || response.data || response;

    // Check for Details01 array (common pattern from SP)
    if (data.Details01 && Array.isArray(data.Details01)) {
      return data.Details01;
    }

    // SP returns Details as JSON string containing ClientTypeWorkFlowData
    let details = data?.Details || data?.details;

    // Parse Details if it's a string
    if (typeof details === 'string') {
      try {
        details = JSON.parse(details);
      } catch (e) {
        console.warn('Failed to parse Details:', e);
      }
    }

    // Look for ClientTypeWorkFlowData (from SP)
    if (details?.ClientTypeWorkFlowData) {
      const ctData = details.ClientTypeWorkFlowData;
      if (typeof ctData === 'string') {
        try {
          return JSON.parse(ctData);
        } catch (e) {
          console.warn('Failed to parse ClientTypeWorkFlowData:', e);
        }
      }
      if (Array.isArray(ctData)) return ctData;
    }

    // Check for direct array in Details
    if (Array.isArray(details)) {
      return details;
    }

    // Fallback to other structures
    if (data.Details02 && Array.isArray(data.Details02)) return data.Details02;
    if (data.ClientTypes && Array.isArray(data.ClientTypes)) return data.ClientTypes;

    return [];
  }

  function extractSupervisionData(response) {
    if (!response) return null;

    const data = response.Data || response.data || response;
    let details = data?.Details || data?.details;

    // Parse Details if it's a string
    if (typeof details === 'string') {
      try {
        details = JSON.parse(details);
      } catch (e) {
        return null;
      }
    }

    // Look for SupervisionData
    if (details?.SupervisionData) {
      const svData = details.SupervisionData;
      if (typeof svData === 'string') {
        try {
          return JSON.parse(svData);
        } catch (e) {
          return null;
        }
      }
      return svData;
    }

    return null;
  }

  function normalizeWorkflowRow(row = {}) {
    return {
      workflowId: row.WorkflowID || row.WorkflowId || row.workflowId || row.workflowID || "",
      workflowName: row.WorkflowName || row.WorkflowDescription || row.Description || row.workflowName || "",
      raw: row,
    };
  }

  function normalizeClientTypeRow(row = {}) {
    const isSelected = row.IsSelected === true || row.IsSelected === 1 || row.IsSelected === "1" ||
      row.isSelected === true || row.isSelected === 1 || row.isSelected === "1" ||
      row.Selected === true || row.Selected === 1 || row.Selected === "1";
    return {
      // SP returns 'ClientType' not 'ClientTypeID'
      clientTypeId: row.ClientType || row.ClientTypeID || row.ClientTypeId || row.clientTypeId || row.clientTypeID || "",
      clientTypeName: row.ClientTypeName || row.Description || row.clientTypeName || "",
      isSelected: isSelected,
      raw: row,
    };
  }

  // ==================== GRID POPULATION ====================
  function populateWorkflowDropdown(options) {
    const select = qs("#WorkflowId");
    if (!select) return;

    // Clear existing options except first
    select.innerHTML = '<option value="">--Select--</option>';

    // Options from LookupService are { value, label, order }
    options
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach(opt => {
        if (opt.value) {
          const option = document.createElement("option");
          option.value = opt.value;
          option.textContent = opt.label || opt.value;
          select.appendChild(option);
        }
      });
  }

  function populateClientTypesGrid(clientTypes) {
    const tbody = qs('[data-section="client-type-workflow"] tbody');
    if (!tbody) return;

    tbody.innerHTML = "";
    state.allClientTypes = [];

    clientTypes.forEach((ct, index) => {
      const normalized = normalizeClientTypeRow(ct);
      state.allClientTypes.push(normalized);

      const tr = document.createElement("tr");
      tr.dataset.clientTypeId = normalized.clientTypeId;
      tr.innerHTML = `
        <td style="text-align: center;">
          <input type="checkbox" class="form-check-input client-type-checkbox" 
                 data-client-type-id="${normalized.clientTypeId}"
                 ${normalized.isSelected ? 'checked' : ''}
                 ${state.mode !== MODES.EDIT ? 'disabled' : ''} />
        </td>
        <td>${normalized.clientTypeId}</td>
        <td>${normalized.clientTypeName}</td>
      `;
      tbody.appendChild(tr);
    });

    // Store original selection for cancel
    state.originalClientTypes = clientTypes.map(ct => ({
      ...normalizeClientTypeRow(ct)
    }));

    // Update select all checkbox
    updateSelectAllCheckbox();
  }

  function updateSelectAllCheckbox() {
    const selectAll = qs('.grid-select-all');
    const checkboxes = qsa('.client-type-checkbox');

    if (!selectAll || checkboxes.length === 0) return;

    const allChecked = checkboxes.every(cb => cb.checked);
    const someChecked = checkboxes.some(cb => cb.checked);

    selectAll.checked = allChecked;
    selectAll.indeterminate = someChecked && !allChecked;
  }

  function setGridCheckboxesEnabled(enabled) {
    const checkboxes = qsa('.client-type-checkbox');
    const selectAll = qs('.grid-select-all');

    checkboxes.forEach(cb => {
      cb.disabled = !enabled;
    });

    if (selectAll) {
      selectAll.disabled = !enabled;
    }
  }

  function getSelectedClientTypes() {
    const checkboxes = qsa('.client-type-checkbox:checked');
    return checkboxes.map(cb => cb.dataset.clientTypeId).filter(Boolean);
  }

  // ==================== BEHIND THE SCENE ====================
  function populateBehindTheScene(data) {
    const createdBy = qs("#CreatedBy");
    const createdOn = qs("#CreatedOn");
    const supervisedBy = qs("#SupervisedBy");
    const supervisedOn = qs("#SupervisedOn");

    if (createdBy) createdBy.textContent = data?.CreatedBy || data?.createdBy || "";
    if (createdOn) createdOn.textContent = data?.CreatedOn || data?.createdOn || "";
    if (supervisedBy) supervisedBy.textContent = data?.SupervisedBy || data?.supervisedBy || "";
    if (supervisedOn) supervisedOn.textContent = data?.SupervisedOn || data?.supervisedOn || "";
  }

  function clearBehindTheScene() {
    const createdBy = qs("#CreatedBy");
    const createdOn = qs("#CreatedOn");
    const supervisedBy = qs("#SupervisedBy");
    const supervisedOn = qs("#SupervisedOn");

    if (createdBy) createdBy.textContent = "";
    if (createdOn) createdOn.textContent = "";
    if (supervisedBy) supervisedBy.textContent = "";
    if (supervisedOn) supervisedOn.textContent = "";
  }

  // ==================== MODE MANAGEMENT ====================
  function setMode(newMode) {
    state.mode = newMode;

    // Enable/disable checkboxes based on mode
    setGridCheckboxesEnabled(newMode === MODES.EDIT);

    updateActionButtons();
  }

  // ==================== HANDLERS ====================
  async function handleView() {
    if (state.isBusy) return;

    const workflowId = qs("#WorkflowId")?.value?.trim();
    if (!workflowId) {
      showWarningToast("Please select a Workflow ID");
      return;
    }

    state.isBusy = true;
    updateActionButtons();

    try {
      await ensureServicesLoaded();

      const requestData = {
        BankID: getBankId(),
        WorkFlowID: workflowId, // Note: SP uses WorkFlowID (capital F)
        ID: "WFIClientTypeID", // System code ID for client types
        OurBranchID: getOurBranchId(),
        OperatorID: getOperatorId(),
      };

      console.log("📋 Fetching workflow:", requestData);
      const response = await window.OtherStaticDataService.getClientTypeWorkflow(requestData);
      console.log("📋 Workflow response:", response);

      // Check for API errors
      const errorCheck = checkResponseError(response);
      if (errorCheck.hasError) {
        showErrorToast(errorCheck.message);
        state.hasLoaded = false;
        setMode(MODES.VIEW);
        return;
      }

      // Extract client types from response
      const clientTypes = extractClientTypes(response);

      if (clientTypes.length === 0) {
        showInfoToast("No client types found for this workflow");
        clearBehindTheScene();
        populateClientTypesGrid([]);
        state.hasLoaded = false;
      } else {
        populateClientTypesGrid(clientTypes);

        // Extract behind the scene data from supervision data or first client type
        const supervisionData = extractSupervisionData(response);
        if (supervisionData) {
          populateBehindTheScene(supervisionData);
        } else if (clientTypes.length > 0) {
          populateBehindTheScene(clientTypes[0]);
        }

        state.hasLoaded = true;
        showSuccessToast(`Loaded ${clientTypes.length} client type(s)`);
      }

      setMode(MODES.VIEW);
    } catch (err) {
      console.error("❌ View error:", err);
      showErrorToast(err?.message || "Failed to load workflow");
      state.hasLoaded = false;
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  function handleEdit() {
    if (!state.hasLoaded) {
      showWarningToast("Please load a workflow first");
      return;
    }

    // Store current selection before editing
    state.originalClientTypes = state.allClientTypes.map(ct => ({
      ...ct,
      isSelected: qsa(`.client-type-checkbox[data-client-type-id="${ct.clientTypeId}"]:checked`).length > 0
    }));

    setMode(MODES.EDIT);
    showInfoToast("Edit mode - modify selections and click Save");
  }

  // ==================== XML BUILDER ====================
  /**
   * Build XML DetailRecords for p_EditClientTypeWorkFlow
   * Format: <dt_ClientTypeWorkflow><OurBranchID>...</OurBranchID><ClientType>...</ClientType><ClientTypeName>...</ClientTypeName><ButtonMark>N</ButtonMark></dt_ClientTypeWorkflow>
   */
  function buildDetailRecordsXml(selectedClientTypeIds) {
    const ourBranchId = getOurBranchId();
    let xml = '';

    selectedClientTypeIds.forEach(clientTypeId => {
      // Find the client type name from our cached data
      const clientType = state.allClientTypes.find(ct => ct.clientTypeId === clientTypeId);
      const clientTypeName = clientType?.clientTypeName || clientTypeId;

      xml += `<dt_ClientTypeWorkflow>`;
      xml += `<OurBranchID>${ourBranchId}</OurBranchID>`;
      xml += `<ClientType>${clientTypeId}</ClientType>`;
      xml += `<ClientTypeName>${clientTypeName}</ClientTypeName>`;
      xml += `<ButtonMark>N</ButtonMark>`;
      xml += `</dt_ClientTypeWorkflow>`;
    });

    return xml;
  }

  async function handleSave() {
    if (state.isBusy) return;

    const workflowId = qs("#WorkflowId")?.value?.trim();
    if (!workflowId) {
      showWarningToast("Please select a Workflow ID");
      return;
    }

    const selectedClientTypes = getSelectedClientTypes();

    if (selectedClientTypes.length === 0) {
      showWarningToast("Please select at least one client type");
      return;
    }

    state.isBusy = true;
    updateActionButtons();

    try {
      await ensureServicesLoaded();

      // Build the XML DetailRecords
      const detailRecordsXml = buildDetailRecordsXml(selectedClientTypes);

      const payload = {
        BankID: getBankId(),
        WorkflowID: workflowId, // Note: lowercase 'f' for edit SP
        OperatedBy: getOperatorId(),
        OperatedOn: null,
        SupervisedBy: null,
        UpdateCount: 1,
        DetailRecords: detailRecordsXml,
      };

      console.log("💾 Saving workflow:", payload);

      const response = await window.OtherStaticDataService.editClientTypeWorkflow(payload);

      console.log("💾 Save response:", response);

      // Check for API errors
      const errorCheck = checkResponseError(response);
      if (errorCheck.hasError) {
        throw new Error(errorCheck.message);
      }

      showSuccessToast("Workflow saved successfully");

      // Refresh data
      await handleView();
    } catch (err) {
      console.error("❌ Save error:", err);
      showErrorToast(err?.message || "Failed to save workflow");
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  function handleCancel() {
    // Clear everything
    const workflowSelect = qs("#WorkflowId");
    if (workflowSelect) workflowSelect.value = "";

    const tbody = qs('[data-section="client-type-workflow"] tbody');
    if (tbody) tbody.innerHTML = "";

    clearBehindTheScene();
    state.hasLoaded = false;
    state.allClientTypes = [];
    state.originalClientTypes = [];
    setMode(MODES.VIEW);
    showInfoToast("Form cleared");
  }

  // ==================== EVENT BINDING ====================
  function bindEvents() {
    // Action buttons
    const { view, edit, save, cancel } = getActionButtons();

    view?.addEventListener("click", handleView);
    edit?.addEventListener("click", handleEdit);
    save?.addEventListener("click", handleSave);
    cancel?.addEventListener("click", handleCancel);

    // Workflow dropdown change
    const workflowSelect = qs("#WorkflowId");
    workflowSelect?.addEventListener("change", () => {
      // Clear grid when changing workflow
      const tbody = qs('[data-section="client-type-workflow"] tbody');
      if (tbody) tbody.innerHTML = "";
      clearBehindTheScene();
      state.hasLoaded = false;
      state.allClientTypes = [];
      updateActionButtons();
    });

    // Select all checkbox
    const selectAll = qs('.grid-select-all');
    selectAll?.addEventListener("change", (e) => {
      if (state.mode !== MODES.EDIT) {
        e.preventDefault();
        return;
      }
      const checkboxes = qsa('.client-type-checkbox');
      checkboxes.forEach(cb => {
        cb.checked = e.target.checked;
      });
    });

    // Individual checkbox changes
    document.addEventListener("change", (e) => {
      if (e.target.classList.contains('client-type-checkbox')) {
        updateSelectAllCheckbox();
      }
    });

    // Section toggle functionality
    qsa('[data-section-toggle]').forEach(header => {
      header.addEventListener('click', function (e) {
        e.preventDefault();
        const btn = header.querySelector('.section-toggle-btn');
        const section = header.closest('[data-section]');
        const content = section ? section.querySelector('[data-section-content]') : null;

        if (btn && content) {
          const isExpanded = btn.getAttribute('aria-expanded') === 'true';
          btn.setAttribute('aria-expanded', !isExpanded);
          content.hidden = isExpanded;
          btn.querySelector('i').classList.toggle('bi-chevron-up');
          btn.querySelector('i').classList.toggle('bi-chevron-down');
        }
      });
    });
  }

  // ==================== INITIALIZATION ====================
  async function loadInitialData() {
    try {
      await ensureServicesLoaded();

      // Load workflow types from LookupService using system code WFIClientTypeID
      const options = await window.LookupService.getSystemCodeOptions("WFIClientTypeID");

      console.log("📋 Workflow options from LookupService:", options);

      if (options && options.length > 0) {
        populateWorkflowDropdown(options);
        showInfoToast(`Loaded ${options.length} workflow type(s)`);
      } else {
        showWarningToast("No workflow types found");
      }
    } catch (err) {
      console.error("❌ Failed to load initial data:", err);
      showErrorToast("Failed to load workflow types");
    }
  }

  async function init() {
    console.log("🚀 Client Type Workflow page initializing...");

    bindEvents();
    updateActionButtons();

    // Load initial data
    await loadInitialData();

    console.log("✅ Client Type Workflow page initialized");
  }

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
