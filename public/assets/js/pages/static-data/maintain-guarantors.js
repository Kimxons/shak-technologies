(() => {
  if (window.__kairoMaintainGuarantorsLoaded) return;
  window.__kairoMaintainGuarantorsLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  const state = {
    mode: MODES.VIEW,
    currentId: "", // Track the currently loaded ID
    hasLoaded: false,
    canAddFromId: false,
    lastLoadedRow: null,
    isBusy: false,
  };

  let updateCount = 0;  // Store UpdateCount for optimistic locking

  // --- Helpers ---

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
      view: qs('[data-shell-mode="View"]'),
      add: qs('[data-shell-mode="Add"]'),
      edit: qs('[data-shell-mode="Update"]'),
      search: qs('[data-mg-action="search"]'),
      del: qs('[data-mg-action="delete"]'),
      save: qs('[data-mg-action="save"]'),
      cancel: qs('[data-mg-action="cancel"]'),
      prev: qs('[data-mg-nav="prev"]'),
      next: qs('[data-mg-nav="next"]'),
    };
  }

  function updateActionButtons() {
    const { view, add, edit, del, save, cancel, prev, next } = getActionButtons();
    const isEditable = state.mode === MODES.ADD || state.mode === MODES.UPDATE;
    const isViewingData = state.mode === MODES.VIEW && state.hasLoaded;

    // View: enabled only in VIEW mode with no record loaded
    setButtonDisabled(view, state.mode !== MODES.VIEW || state.hasLoaded);

    // Add: enabled only in VIEW mode with no record loaded
    setButtonDisabled(add, state.mode !== MODES.VIEW || state.hasLoaded);

    // Edit: enabled only when record is loaded in VIEW mode
    setButtonDisabled(edit, !isViewingData);

    // Save: only in Add/Edit modes
    setButtonDisabled(save, !isEditable);

    // Cancel: enabled in edit modes or when viewing data
    setButtonDisabled(cancel, !(isEditable || isViewingData));

    // Delete: only when record is loaded in VIEW mode
    setButtonDisabled(del, !isViewingData);

    // Nav buttons: only active when data is loaded in VIEW mode
    setButtonDisabled(prev, !isViewingData);
    setButtonDisabled(next, !isViewingData);
  }

  function getContext() {
    const session = window.AuthService?.getSession() || {};
    return {
      BankID: session.bankID || window.Environment?.bankID || "00",
      OurBranchID: session.branchID || window.Environment?.branchID || "0101",
      OperatorID: session.operatorID || "ADMIN",
    };
  }

  // --- Form Logic ---

  function clearForm(form, keepId = false) {
    const idVal = keepId ? qs("#GuarantorID", form)?.value : "";

    qsa("input, select, textarea", form).forEach((el) => {
      if (
        el.type === "button" ||
        el.type === "submit" ||
        el.type === "reset"
      )
        return;
      el.value = "";
    });

    if (keepId && idVal) {
      const idEl = qs("#GuarantorID", form);
      if (idEl) idEl.value = idVal;
    }

    // Clear audit span elements (Behind The Scene)
    const auditFields = ['CreatedBy', 'CreatedOn', 'ModifiedBy', 'ModifiedOn', 'SupervisedBy', 'SupervisedOn'];
    auditFields.forEach(fieldId => {
      const el = qs(`#${fieldId}`, form);
      if (el && el.tagName === 'SPAN') {
        el.textContent = '-';
      }
    });

    // Reset Mode pill
    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${state.mode}`;
  }

  // Helper function to format currency values with comma thousand separators and 0.00 format
  function formatCurrencyValue(value) {
    if (!value && value !== 0) return "";
    const numValue = parseFloat(value.toString().replace(/,/g, ''));
    if (isNaN(numValue)) return "";
    return numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Helper function to populate audit fields (CreatedBy, CreatedOn, ModifiedBy, ModifiedOn, SupervisedBy, SupervisedOn)
  function populateAuditData(auditData, form) {
    if (!auditData || !form) return;

    const findKey = (obj, target) => Object.keys(obj).find(k => k.toLowerCase() === target.toLowerCase());

    const auditFields = {
      'CreatedBy': ['CreatedBy'],
      'CreatedOn': ['CreatedOn'],
      'ModifiedBy': ['ModifiedBy'],
      'ModifiedOn': ['ModifiedOn'],
      'SupervisedBy': ['SupervisedBy'],
      'SupervisedOn': ['SupervisedOn']
    };

    Object.entries(auditFields).forEach(([fieldId, keys]) => {
      const element = qs(`#${fieldId}`, form);
      if (!element) return;

      let value = "";
      for (const key of keys) {
        const matchedKey = findKey(auditData, key);
        if (matchedKey) {
          value = auditData[matchedKey] || "";
          console.log(`[PopulateAuditData] Found ${fieldId}:`, value);
          break;
        }
      }

      // Update span element with textContent
      if (element.tagName === 'SPAN') {
        element.textContent = value || "-";
      } else {
        element.value = value;
      }

      console.log(`[PopulateAuditData] Set ${fieldId} to:`, value);
    });

    console.log('[PopulateAuditData] Audit data population complete');
  }

  function mapDataToForm(data, form) {
    if (!data) return;

    const findKey = (obj, target) => Object.keys(obj).find(k => k.toLowerCase() === target.toLowerCase());
    
    // Amount fields get comma formatting with decimals (0.00)
    const amountFields = ['MaxGuaranteeAmount', 'Networth', 'Liability', 'LoanAmount'];
    // Count fields get comma formatting but no decimals (whole numbers)
    const countFields = ['MaxNoOfLoans', 'NoOfLoans'];

    // Field name aliases - maps form field IDs to possible API response field names
    const fieldAliases = {
      'Address': ['Address', 'Address1'],
      'City': ['City', 'CityID'],
      'Country': ['Country', 'CountryID'],
      'NoOfLoans': ['NoOfLoans', 'LoanCount'],
      'RelevantName': ['RelevantName', 'ReleventName', 'ClientName', 'GuarantorName']
    };

    console.log('[MapDataToForm] Populating form with data:', data);

    qsa("input, select, textarea", form).forEach(el => {
      if (!el.id) return;

      // Check for field aliases first
      let key = findKey(data, el.id) || findKey(data, el.name);
      
      // If no direct match, check aliases
      if (!key && fieldAliases[el.id]) {
        for (const alias of fieldAliases[el.id]) {
          key = findKey(data, alias);
          if (key) break;
        }
      }
      
      // Special handling for GuarantorRelevantID - only ID, name goes in RelevantName
      if (el.id === 'GuarantorRelevantID' && data) {
        const idKey = findKey(data, 'GuarantorRelevantID') || findKey(data, 'ClientID');
        const clientId = idKey ? (data[idKey] || "") : "";
        el.value = clientId;
        console.log('[MapDataToForm] Set GuarantorRelevantID to:', clientId);
        return;
      }

      // Special handling for RelevantName - populate from API if available
      if (el.id === 'RelevantName' && data) {
        let clientName = "";
        for (const alias of fieldAliases['RelevantName']) {
          const nameKey = findKey(data, alias);
          if (nameKey && data[nameKey]) {
            clientName = data[nameKey];
            break;
          }
        }
        el.value = clientName;
        console.log('[MapDataToForm] Set RelevantName to:', clientName);
        return;
      }

      // Special handling for Address - concatenate Address1 and Address2
      if (el.id === 'Address' && data) {
        const addr1Key = findKey(data, 'Address1');
        const addr2Key = findKey(data, 'Address2');
        const addr1 = addr1Key ? (data[addr1Key] || "") : "";
        const addr2 = addr2Key ? (data[addr2Key] || "") : "";
        const fullAddress = [addr1, addr2].filter(Boolean).join(', ');
        el.value = fullAddress;
        console.log('[MapDataToForm] Set Address to:', fullAddress);
        return;
      }
      
      if (key) {
        // Use ?? instead of || to preserve 0 values
        let value = data[key] ?? "";
        
        // Format amount fields with commas and decimals (e.g., 1,234,567.00)
        if (amountFields.includes(el.id)) {
          value = formatCurrencyValue(value);
        }
        // Format count fields with commas but no decimals (e.g., 1,234)
        else if (countFields.includes(el.id) && value !== "") {
          const numValue = parseInt(value.toString().replace(/,/g, ''), 10);
          if (!isNaN(numValue)) {
            value = numValue.toLocaleString('en-US');
          }
        }
        
        el.value = value;
        console.log('[MapDataToForm] Set', el.id, 'to:', value);
      }
    });

    console.log('[MapDataToForm] Form population complete');
  }

  function getFormData(form) {
    const data = {};
    // Fields that have comma formatting (need to be cleaned before sending to API)
    const formattedFields = ['MaxGuaranteeAmount', 'MaxNoOfLoans', 'Networth', 'Liability', 'NoOfLoans', 'LoanAmount'];
    
    qsa("input, select, textarea", form).forEach((el) => {
      if (!el.id) return;
      let key = el.id;
      if (key === "GuarantorTypeId") key = "GuarantorTypeID";
      
      let value = el.value;
      
      // Remove commas from formatted fields before sending to API
      if (formattedFields.includes(el.id) && value) {
        value = value.toString().replace(/,/g, '');
      }
      
      data[key] = value;
    });
    return data;
  }

  function setMode(nextMode) {
    state.mode = nextMode;

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#maintain-guarantors-form");
    if (!form) return;

    if (nextMode === MODES.ADD) {
      // In ADD mode, we assume ID is valid and fresh, or we keep it.
      // We usually clear everything BUT the ID if we came from a search-not-found state.
      // If simply clicking Add (which is disabled usually unless searched), we might keep ID.
      // Current logic in NGO checks `canAddFromId`.
      // If we are switching to ADD, we clear non-ID fields.
      const currentId = qs("#GuarantorID")?.value;
      clearForm(form, true);
    }

    const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

    qsa("input, select, textarea", form).forEach((el) => {
      // Handle GuarantorTypeId specially - should be disabled in VIEW mode even though it has data-always-enabled
      if (el.id === 'GuarantorTypeId') {
        el.disabled = nextMode === MODES.VIEW;
        return;
      }
      
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        return;
      }
      // Audit fields always disabled
      if (el.classList.contains('audit-input') || el.id === 'RelevantName') {
        el.disabled = true;
        return;
      }
      // GuarantorID is auto-generated in ADD mode, so disable it
      if (el.id === 'GuarantorID' && nextMode === MODES.ADD) {
        el.disabled = true;
        return;
      }
      // Relevant ID should only be editable in ADD and UPDATE modes
      // In VIEW mode, it should be disabled (viewing existing data)
      if (el.id === 'GuarantorRelevantID' && nextMode === MODES.VIEW) {
        el.disabled = true;
        return;
      }
      el.disabled = !isEditable;
    });

    // Disable the guarantor lookup button in ADD mode (ID is auto-generated)
    const btnGuarantorLookup = qs("#btnGuarantorLookup");
    if (btnGuarantorLookup) {
      setButtonDisabled(btnGuarantorLookup, nextMode === MODES.ADD);
    }

    // Disable the client lookup button in VIEW mode (can't change client reference when viewing)
    const btnClientLookup = qs("#btnClientLookup");
    if (btnClientLookup) {
      setButtonDisabled(btnClientLookup, nextMode === MODES.VIEW);
    }

    updateActionButtons();
  }

  // --- API Actions ---

  async function fetchGuarantor(id = "", direction = 0) {
    if (state.isBusy) return;
    state.isBusy = true;
    updateActionButtons(); // Disable things while busy

    try {
      if (!window.StaticDataService?.getGuarantors) {
        console.warn("StaticDataService not loaded");
        return;
      }

      const ctx = getContext();
      const payload = {
        BankID: ctx.BankID,
        OurBranchID: ctx.OurBranchID,
        GuarantorID: id,
        OperatorID: ctx.OperatorID,
        Direction: direction
      };

      const response = await window.StaticDataService.getGuarantors(payload);

      console.log('[FetchGuarantor] Response received:', response);

      let record = null;
      let clientData = null;
      let auditData = null;
      
      // Extract CLIENT/INSTITUTION data from Details01
      if (response?.data?.Details01?.length > 0) {
        clientData = response.data.Details01[0];
        console.log('[FetchGuarantor] Found client data in response.data.Details01:', clientData);
      } else if (response?.Details01?.length > 0) {
        clientData = response.Details01[0];
        console.log('[FetchGuarantor] Found client data in response.Details01:', clientData);
      }

      // Extract GUARANTOR data from Details02
      if (response?.data?.Details02?.length > 0 && response.data.Details02[0].GuarantorID) {
        record = response.data.Details02[0];
        console.log('[FetchGuarantor] Found guarantor in response.data.Details02');
      } else if (response?.Details02?.length > 0 && response.Details02[0].GuarantorID) {
        record = response.Details02[0];
        console.log('[FetchGuarantor] Found guarantor in response.Details02');
      }

      // MERGE client data into record (client details like Address, City, etc. come from Details01)
      if (record && clientData) {
        record = { ...record, ...clientData };
        console.log('[FetchGuarantor] Merged client data into record');
      }

      // For audit fields (if they exist in Details02), they're already in record
      if (record) {
        auditData = record;
        console.log('[FetchGuarantor] Audit data extracted from guarantor record');
      }

      if (record && record.GuarantorID) {
        // If this is a navigation request (direction != 0) and we got minimal data, fetch full details
        if (direction !== 0 && (!record.GuaranteeSignedBy && record.GuarantorName)) {
          console.log('[FetchGuarantor] Navigation result detected, fetching full details for ID:', record.GuarantorID);
          // Make a direct fetch without direction to get full details
          const fullPayload = {
            BankID: ctx.BankID,
            OurBranchID: ctx.OurBranchID,
            GuarantorID: record.GuarantorID,
            OperatorID: ctx.OperatorID,
            Direction: 0  // Direct fetch
          };
          const fullResponse = await window.StaticDataService.getGuarantors(fullPayload);
          console.log('[FetchGuarantor] Full details response:', fullResponse);
          
          // Extract full record from the full details response
          let fullRecord = null;
          let fullClientData = null;
          
          if (fullResponse?.data?.Details02?.length > 0 && fullResponse.data.Details02[0].GuarantorID) {
            fullRecord = fullResponse.data.Details02[0];
            console.log('[FetchGuarantor] Using full details from Details02');
          } else if (fullResponse?.Details02?.length > 0 && fullResponse.Details02[0].GuarantorID) {
            fullRecord = fullResponse.Details02[0];
            console.log('[FetchGuarantor] Using full details from response.Details02');
          }

          // Also merge client data from full response
          if (fullResponse?.data?.Details01?.length > 0) {
            fullClientData = fullResponse.data.Details01[0];
            console.log('[FetchGuarantor] Found client data in full response Details01');
          } else if (fullResponse?.Details01?.length > 0) {
            fullClientData = fullResponse.Details01[0];
            console.log('[FetchGuarantor] Found client data in full response.Details01');
          }

          if (fullRecord) {
            if (fullClientData) {
              fullRecord = { ...fullRecord, ...fullClientData };
              console.log('[FetchGuarantor] Merged client data from full response');
            }
            record = fullRecord;
            auditData = fullRecord;
          }
        }
        // Found
        const form = qs("#maintain-guarantors-form");
        clearForm(form, false); // Clear first to remove stale data
        mapDataToForm(record, form);
        
        // Populate audit fields if available
        if (auditData) {
          populateAuditData(auditData, form);
        }

        // Fetch guarantor name from search results
        const guarantorId = record.GuarantorID || record.GuarantorId;
        if (guarantorId) {
          try {
            const ctx = getContext();
            // Use p_GetSearchResult to get guarantor name
            const searchPayload = {
              WhereStmt: `GuarantorID = '${guarantorId}'`,
              TableID: "GuarantorID",
              RefID: null,
              PrevOrNext: 0,
              AdvFilterString: `GuarantorClientTypeID = 'I' AND BankID = '${ctx.BankID}'`,
              OperatorID: ctx.OperatorID,
              ModuleID: 2090,
              OurBranchID: ctx.OurBranchID,
              SearchKey: null,
              LanguageID: window.Environment?.languageID || 'en'
            };
            
            console.log('[FetchGuarantor] Searching for guarantor name with ID:', guarantorId, 'Payload:', searchPayload);
            
            const searchResponse = await window.CoreApi.post(
              (window.Environment?.baseUrlSystemCodes || "http://localhost:5059").replace(/\/+$/, "") + "/api/OldAPI",
              window.CoreApi.makeRequestEnvelope("p_GetSearchResult", searchPayload)
            );
            
            console.log('[FetchGuarantor] Search response for name:', searchResponse);
            
            let guarantorRecord = null;
            // Check response.data array
            if (searchResponse && searchResponse.data && Array.isArray(searchResponse.data)) {
              guarantorRecord = searchResponse.data.find(r => (r.GuarantorID || "").trim() === (guarantorId || "").trim());
            }
            // Check response.Details array as fallback
            if (!guarantorRecord && searchResponse && searchResponse.Details && Array.isArray(searchResponse.Details)) {
              guarantorRecord = searchResponse.Details.find(r => (r.GuarantorID || "").trim() === (guarantorId || "").trim());
            }
            
            console.log('[FetchGuarantor] Found guarantor record:', guarantorRecord);
            
            if (guarantorRecord && guarantorRecord.GuarantorName) {
              const relevantNameField = qs("#RelevantName", form);
              if (relevantNameField) {
                relevantNameField.value = guarantorRecord.GuarantorName;
                console.log('[FetchGuarantor] Set RelevantName to:', guarantorRecord.GuarantorName);
              }
            }
          } catch (err) {
            console.warn("Could not fetch guarantor name:", err);
          }
        }

        state.currentId = record.GuarantorID || record.GuarantorId || "";
        updateCount = record.UpdateCount || 0;  // Capture UpdateCount for optimistic locking
        state.hasLoaded = true;
        state.canAddFromId = false;
        state.lastLoadedRow = record;

        if (state.mode === MODES.ADD) {
          setMode(MODES.VIEW);
        } else {
          setMode(MODES.VIEW); // Ensure view mode
        }
        setToast("Record loaded.", "success");
      } else {
        // Not Found
        if (direction !== 0) {
          setToast("No more records found.", "info");
          // Keep current state if nav failed?
        } else {
          // Direct search failed
          if (id) {
            setToast("Record not found. You can Add.", "info");
            state.hasLoaded = false;
            state.canAddFromId = true;
            state.lastLoadedRow = null;
            // Clear form but keep ID
            const form = qs("#maintain-guarantors-form");
            clearForm(form, true);
            setMode(MODES.VIEW); // Remain in View, enable Add button via updateActionButtons
          } else {
            // Init load empty
            // Just clear
          }
        }
      }

    } catch (err) {
      console.error("fetchGuarantor error", err);
      setToast("Error fetching guarantor.", "danger");
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  async function saveGuarantor() {
    if (state.isBusy) return;

    try {
      const form = qs("#maintain-guarantors-form");
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      state.isBusy = true;
      updateActionButtons(); // Button lock

      const formData = getFormData(form);
      const ctx = getContext();
      
      // Validate Guarantor Type is selected
      if (!formData.GuarantorTypeID || formData.GuarantorTypeID.trim() === "") {
        setToast("Please select a Guarantor Type", "warning");
        state.isBusy = false;
        updateActionButtons();
        return;
      }

      // In ADD mode, GuarantorID is auto-generated from ClientID (GuarantorRelevantID)
      let guarantorId = formData.GuarantorID;
      if (state.mode === MODES.ADD) {
        // Use the ClientID as GuarantorID
        guarantorId = formData.GuarantorRelevantID;
        
        // Validate that a client was selected
        if (!guarantorId || guarantorId.trim() === "") {
          setToast("Please select a client first (Relevant ID is required)", "warning");
          state.isBusy = false;
          updateActionButtons();
          return;
        }
      } else {
        // In UPDATE mode, also validate Relevant ID
        if (!formData.GuarantorRelevantID || formData.GuarantorRelevantID.trim() === "") {
          setToast("Relevant ID is required", "warning");
          state.isBusy = false;
          updateActionButtons();
          return;
        }
      }

      const payload = {
        BankID: ctx.BankID,
        GuarantorID: guarantorId,
        GuarantorTypeID: formData.GuarantorTypeID,
        GuarantorRelevantID: formData.GuarantorRelevantID,
        GuaranteeSignedBy: formData.GuaranteeSignedBy,
        MaxGuaranteeAmount: formData.MaxGuaranteeAmount,
        MaxNoOfLoans: formData.MaxNoOfLoans,
        Networth: formData.Networth,
        Liability: formData.Liability,

        CreatedBy: ctx.OperatorID,
        ModifiedBy: ctx.OperatorID,
        SupervisedBy: ctx.OperatorID,

        NewRecord: state.mode === MODES.ADD ? 1 : updateCount  // 1 for new, UpdateCount for updates (optimistic locking)
      };

      console.log('[GuarantorSave] Mode:', state.mode, 'NewRecord:', state.mode === MODES.ADD ? 1 : 0);
      console.log('[GuarantorSave] Payload being sent:', payload);

      const response = await window.StaticDataService.addEditGuarantors(payload);

      if (response && (response.success || response.ResponseCode === "00" || response.status === 200)) {
        const modeText = state.mode === MODES.ADD ? "created" : "updated";
        setToast(`Guarantor ${modeText} successfully.`, "success");
        // Successful save -> Clear all fields and reset to VIEW mode
        clearForm(qs("#maintain-guarantors-form"));
        state.hasLoaded = false;
        state.canAddFromId = false;
        state.currentId = "";
        setMode(MODES.VIEW);
      } else {
        const msg = response.ResponseMessage || response.message || "Save failed.";
        // Simple duplicate check logic if needed like NGO?
        // For now just error
        setToast(msg, "danger");
      }

    } catch (err) {
      console.error("saveGuarantor error", err);
      setToast("Error saving guarantor.", "danger");
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  async function deleteGuarantor() {
    if (!state.currentId) return;
    if (state.isBusy) return;

    // Use SweetAlert2 for delete confirmation
    const result = await Swal.fire({
      title: 'Delete Record?',
      text: `Are you sure you want to delete guarantor ${state.currentId}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#dc3545',
      cancelButtonText: 'Cancel',
      cancelButtonColor: '#6c757d'
    });

    if (!result.isConfirmed) return;

    state.isBusy = true;
    updateActionButtons();

    try {
      const ctx = getContext();
      const payload = {
        BankID: ctx.BankID,
        GuarantorID: state.currentId,
        NewRecord: 0
      };

      const response = await window.StaticDataService.deleteGuarantors(payload);

      if (response && (response.success || response.ResponseCode === "00" || response.code === "00")) {
        setToast("Guarantor deleted successfully.", "success");
        clearForm(qs("#maintain-guarantors-form"));
        state.hasLoaded = false;
        state.canAddFromId = false;
        state.lastLoadedRow = null;
        state.currentId = "";
        setMode(MODES.VIEW);
      } else {
        const errorMsg = response.message || response.Message || response.ResponseMessage || "Delete failed.";
        setToast(errorMsg, "danger");
      }
    } catch (err) {
      console.error("deleteGuarantor error", err);
      const errorMsg = err.message || err.Message || "Error deleting guarantor.";
      setToast(errorMsg, "danger");
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  // --- Client Lookup Logic (Bootstrap Modal) ---

  let clientLookupModal = null;

  function openClientLookupModal() {
    const el = qs("#clientLookupModal");
    if (!el) return;

    // Clear previous search inputs
    qs("#clientLookupForm")?.reset();

    if (!clientLookupModal) {
      clientLookupModal = new bootstrap.Modal(el);
    }
    clientLookupModal.show();

    // Auto-search to show all records by default
    handleClientSearch();

    // Auto-focus logic
    setTimeout(() => {
      qs("#clientSearchId")?.focus();
    }, 500);
  }

  // Client Search Pagination State
  let clientSearchState = {
    allResults: [],
    currentPage: 0,
    pageSize: 5,
    get totalPages() { return Math.ceil(this.allResults.length / this.pageSize); }
  };

  // Guarantor Search Pagination State
  let guarantorSearchState = {
    allResults: [],
    currentPage: 0,
    pageSize: 5,
    get totalPages() { return Math.ceil(this.allResults.length / this.pageSize); }
  };

  async function handleClientSearch(e) {
    if (e) e.preventDefault();

    const idInput = qs("#clientSearchId");
    const nameInput = qs("#clientSearchName");
    const idMode = qs("#clientSearchModeId").value;
    const nameMode = qs("#clientSearchModeName").value;

    const criteria = {
      clientId: idInput.value.trim(),
      clientIdOperator: idMode, // 'like' or 'equals'
      clientName: nameInput.value.trim(),
      clientNameOperator: nameMode
    };

    // UI State: Loading
    const tbody = qs("#clientSearchResults");
    const emptyMsg = qs("#clientSearchEmpty");
    const loader = qs("#clientSearchLoading");

    tbody.innerHTML = "";
    emptyMsg.classList.add("d-none");
    loader.classList.remove("d-none");

    try {
      await ensureClientSearchService();
      if (!window.ClientSearchService) throw new Error("Service not loaded");

      const results = await window.ClientSearchService.searchClients(criteria);

      loader.classList.add("d-none");

      if (results && results.length > 0) {
        clientSearchState.allResults = results;
        clientSearchState.currentPage = 0;
        displayClientSearchPage();
        updateClientSearchPagination();
      } else {
        emptyMsg.classList.remove("d-none");
        emptyMsg.textContent = "No clients found matching the criteria.";
      }

    } catch (err) {
      console.error("Client search error", err);
      loader.classList.add("d-none");
      emptyMsg.classList.remove("d-none");
      emptyMsg.textContent = "Error occurred during search.";
      setToast("Search failed.", "danger");
    }
  }

  function displayClientSearchPage() {
    const start = clientSearchState.currentPage * clientSearchState.pageSize;
    const end = start + clientSearchState.pageSize;
    const pageResults = clientSearchState.allResults.slice(start, end);
    renderClientResults(pageResults);
  }

  function updateClientSearchPagination() {
    const btnPrev = qs("#clientSearchPrevious");
    const btnNext = qs("#clientSearchNext");
    
    if (btnPrev) btnPrev.disabled = clientSearchState.currentPage === 0;
    if (btnNext) btnNext.disabled = clientSearchState.currentPage >= clientSearchState.totalPages - 1;
    
    console.log(`[ClientSearch] Page ${clientSearchState.currentPage + 1}/${clientSearchState.totalPages}, Total: ${clientSearchState.allResults.length}`);
  }

  function displayGuarantorSearchPage() {
    const start = guarantorSearchState.currentPage * guarantorSearchState.pageSize;
    const end = start + guarantorSearchState.pageSize;
    const pageResults = guarantorSearchState.allResults.slice(start, end);
    renderGuarantorResults(pageResults);
  }

  function updateGuarantorSearchPagination() {
    const btnPrev = qs("#guarantorSearchPrevious");
    const btnNext = qs("#guarantorSearchNext");
    
    if (btnPrev) btnPrev.disabled = guarantorSearchState.currentPage === 0;
    if (btnNext) btnNext.disabled = guarantorSearchState.currentPage >= guarantorSearchState.totalPages - 1;
    
    console.log(`[GuarantorSearch] Page ${guarantorSearchState.currentPage + 1}/${guarantorSearchState.totalPages}, Total: ${guarantorSearchState.allResults.length}`);
  }

  // Track selected rows
  let selectedClientRow = null;
  let selectedGuarantorRow = null;

  function renderClientResults(rows) {
    const tbody = qs("#clientSearchResults");
    if (!tbody) return;

    const startIndex = clientSearchState.currentPage * clientSearchState.pageSize;

    tbody.innerHTML = rows.map((row, index) => {
      const id = row.ClientID || row.ClientId || row.ID || "";
      const name = row.Name || row.name || row.Description || "";

      if (!id) return "";

      const rowNum = startIndex + index + 1;
      const safeId = id.replace(/'/g, "\\'");
      const safeName = name.replace(/'/g, "\\'");

      return `
            <tr style="cursor: pointer;" ondblclick="window.selectLookupClient('${safeId}', '${safeName}')" onclick="window.highlightClientRow(this, '${safeId}', '${safeName}')">
                <td>${rowNum}</td>
                <td>${id}</td>
                <td>${name}</td>
            </tr>
          `;
    }).join("");
  }

  // Highlight selected client row
  window.highlightClientRow = (row, id, name) => {
    // Remove highlight from all rows
    const tbody = qs("#clientSearchResults");
    if (tbody) {
      tbody.querySelectorAll('tr').forEach(tr => tr.classList.remove('table-primary'));
    }
    // Add highlight to selected row
    row.classList.add('table-primary');
    selectedClientRow = { id, name };
  };

  // Global handler for double-click selection
  window.selectLookupClient = (id, name) => {
    const relevantIdInput = qs("#GuarantorRelevantID");
    const relevantNameInput = qs("#RelevantName");

    if (relevantIdInput) relevantIdInput.value = id;
    if (relevantNameInput) relevantNameInput.value = name;

    selectedClientRow = null;
    if (clientLookupModal) clientLookupModal.hide();
  };


  // --- Guarantor Lookup Logic ---

  let guarantorLookupModal = null;

  function openGuarantorLookupModal() {
    const el = qs("#guarantorLookupModal");
    if (!el) return;

    qs("#guarantorLookupForm")?.reset();

    if (!guarantorLookupModal) {
      guarantorLookupModal = new bootstrap.Modal(el);
    }
    guarantorLookupModal.show();

    // Auto-search to load all records when modal opens
    handleGuarantorSearch();

    // Ensure the search form is reset and ready
    const searchForm = qs("#guarantorLookupForm");
    if (searchForm) {
      searchForm.reset();
    }
      
    setTimeout(() => {
      qs("#guarantorSearchId")?.focus();
    }, 500);
  }

  async function handleGuarantorSearch(e) {
    if (e) e.preventDefault();

    const idInput = qs("#guarantorSearchId").value.trim(); // Keep original case
    const idMode = qs("#guarantorSearchModeId").value;

    // Loading state
    const tbody = qs("#guarantorSearchResults");
    const emptyMsg = qs("#guarantorSearchEmpty");
    const loader = qs("#guarantorSearchLoading");

    tbody.innerHTML = "";
    emptyMsg.classList.add("d-none");
    loader.classList.remove("d-none");

    try {
      const ctx = getContext();
      
      // Use p_GetSearchResult to fetch guarantor records
      // This is the same stored procedure used for all search operations
      let whereClause = "";
      if (idInput) {
        // Build WHERE clause based on search mode
        if (idMode === 'equals') {
          whereClause = `GuarantorID = '${idInput}'`;
        } else {
          whereClause = `GuarantorID LIKE '%${idInput}%'`;
        }
      }
      
      const payload = {
        WhereStmt: whereClause || "",
        TableID: "GuarantorID",
        RefID: null,
        PrevOrNext: 0,
        // Include GuarantorClientTypeID filter for individuals (matching your example)
        // Adjust if you need corporate guarantors too: "GuarantorClientTypeID IN ('I', 'C')"
        AdvFilterString: `GuarantorClientTypeID = 'I' AND BankID = '${ctx.BankID}'`,
        OperatorID: ctx.OperatorID,
        ModuleID: 2090,  // Static Data module
        OurBranchID: ctx.OurBranchID,
        SearchKey: null,
        LanguageID: window.Environment?.languageID || 'en'
      };
      
      // DEBUG: Log the payload being sent to the API
      console.log('[Guarantor Search] Sending p_GetSearchResult payload to API:', payload);

      const response = await window.CoreApi.post(
        (window.Environment?.baseUrlSystemCodes || "http://localhost:5059").replace(/\/+$/, "") + "/api/OldAPI",
        window.CoreApi.makeRequestEnvelope("p_GetSearchResult", payload)
      );
      
      loader.classList.add("d-none");
      
      console.log('[Guarantor Search] API Response received:', JSON.stringify(response, null, 2));
      
      let rows = [];
      
      // p_GetSearchResult returns data in response.data array
      if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Filter out the response metadata (usually the last item has EventID, UpdateCount, etc.)
        rows = response.data.filter(r => r.GuarantorID && r.GuarantorID.trim() !== "");
        console.log('[Guarantor Search] Found guarantor records in response.data (' + rows.length + ' records)');
      }
      // Fallback: check if response has Details
      else if (response && response.Details && Array.isArray(response.Details) && response.Details.length > 0) {
        rows = response.Details.filter(r => r.GuarantorID && r.GuarantorID.trim() !== "");
        if (rows.length > 0) {
          console.log('[Guarantor Search] Found guarantor records in response.Details (' + rows.length + ' records)');
        }
      }
      
      // Ensure rows is always an array
      if (!Array.isArray(rows)) {
        rows = [];
      }
      
      console.log('[Guarantor Search] Total guarantor records found: ' + rows.length);
      
      if (rows.length === 0) {
        emptyMsg.classList.remove("d-none");
        if (idInput) {
          emptyMsg.textContent = `No guarantor found with ID: ${idInput}. Verify the ID exists in the system.`;
        } else {
          emptyMsg.innerHTML = `
            <div style="padding: 20px; text-align: center;">
              <p><strong>No guarantor records found.</strong></p>
              <p style="font-size: 0.9em; color: #666; margin-top: 10px;">
                To add a new guarantor, use the <strong>Add</strong> button in the main form.
              </p>
              <p style="font-size: 0.85em; color: #999; margin-top: 5px;">
                If you expect to see guarantors here, check if records exist in the database 
                or contact your system administrator.
              </p>
            </div>
          `;
        }
        console.warn('[Guarantor Search] No guarantor data found. Check database for guarantor records.');
        return;
      }

      // Store results and show first page
      guarantorSearchState.allResults = rows;
      guarantorSearchState.currentPage = 0;
      displayGuarantorSearchPage();
      updateGuarantorSearchPagination();

    } catch (err) {
      console.error("Guarantor search error", err);
      loader.classList.add("d-none");
      emptyMsg.classList.remove("d-none");
      emptyMsg.textContent = "Error searching guarantors.";
    }
  }

  function renderGuarantorResults(rows) {
    const tbody = qs("#guarantorSearchResults");
    if (!tbody) return;
    
    const startIndex = guarantorSearchState.currentPage * guarantorSearchState.pageSize;
    
    // Ensure rows is valid and map over it
    tbody.innerHTML = Array.isArray(rows) ?
      rows.map((row, index) => {
        // Extract guarantor data from the API response
        const id = row.GuarantorID || '';
        const name = row.GuarantorName || row.ReleventName || row.RelevantName || '';
        const type = row.GuarantorType || row.GuarantorTypeID || '';
        
        // Skip rows without ID
        if (!id) return '';
        
        const rowNum = startIndex + index + 1;
        const safeId = id.replace(/'/g, "\\'");
        
        return `
            <tr style="cursor: pointer;" ondblclick="window.selectLookupGuarantor('${safeId}')" onclick="window.highlightGuarantorRow(this, '${safeId}')">
                <td>${rowNum}</td>
                <td>${id}</td>
                <td>${name}</td>
                <td>${type}</td>
            </tr>
          `;
      }).join("") : '';
  }

  // Highlight selected guarantor row
  window.highlightGuarantorRow = (row, id) => {
    // Remove highlight from all rows
    const tbody = qs("#guarantorSearchResults");
    if (tbody) {
      tbody.querySelectorAll('tr').forEach(tr => tr.classList.remove('table-primary'));
    }
    // Add highlight to selected row
    row.classList.add('table-primary');
    selectedGuarantorRow = { id };
  };

  window.selectLookupGuarantor = (id) => {
    selectedGuarantorRow = null;
    if (guarantorLookupModal) guarantorLookupModal.hide();
    fetchGuarantor(id, 0); // Load the record into the form
  };


  // --- Initialization ---

  async function ensureClientSearchService() {
    if (window.ClientSearchService) return;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '../../assets/js/services/workflow/clientSearchService.js';
      script.onload = resolve;
      script.onerror = () => {
        console.warn("Primary path for ClientSearchService failed, checking alternatives...");
        reject();
      };
      document.head.appendChild(script);
    }).catch(() => console.warn("Could not load ClientSearchService"));
  }

  async function ensureServicesLoaded() {
    if (!window.ServiceLoader) throw new Error("ServiceLoader missing");
    await window.ServiceLoader.loadCore();
    if (!window.LookupService && window.ServiceLoader.loadLookupService) {
      await window.ServiceLoader.loadLookupService();
    }
    await ensureClientSearchService();
    if (!window.StaticDataService) console.warn("StaticDataService script seemingly missing");
  }

  async function populateGuarantorTypes() {
    try {
      await ensureServicesLoaded();
      const select = qs("#GuarantorTypeId");
      if (!select) return;

      let rawList = [];
      
      // Try LookupService first as it handles all required parameters
      if (window.LookupService) {
        try {
          console.log('[GuarantorTypes] Fetching from LookupService');
          rawList = await window.LookupService.getSystemCodeOptions("GuarantorTypeID");
          console.log('[GuarantorTypes] LookupService response:', rawList);
        } catch (e) {
          console.warn("LookupService call failed:", e);
        }
      }

      // Fallback: Try direct API call if LookupService fails
      if (rawList.length === 0) {
        try {
          const branchId = (typeof session !== 'undefined' && session?.branchID) || window.Environment?.branchID || "0101";
          const operatorId = (typeof session !== 'undefined' && session?.operatorID) || "ADMIN";
          const url = (window.Environment?.baseUrlSystemCodes || "http://localhost:5059").replace(/\/+$/, "") + "/api/OldAPI";
          const apiEnvelope = window.CoreApi.makeRequestEnvelope("p_GetSystemCodes", { 
            ID: "GuarantorTypeID",
            OurBranchID: branchId,
            OperatorID: operatorId
          });

          const resp = await window.CoreApi.post(url, apiEnvelope);
          console.log('[GuarantorTypes] Direct API Response:', resp);
          if (resp.success && Array.isArray(resp.data)) rawList = resp.data;
          else if (resp.Details && Array.isArray(resp.Details)) rawList = resp.Details;
        } catch (e) {
          console.warn("Direct API call failed:", e);
        }
      }

      console.log('[GuarantorTypes] Raw list from API:', rawList);

      const uniqueMap = new Map();
      for (const item of rawList) {
        const label = (item.CodeDescription || item.Description || item.description || item.label || item.Label || "").trim();
        const value = (item.SubCodeID || item.Code || item.code || item.value || item.Value || "").trim();
        console.log('[GuarantorTypes] Processing item:', { raw: item, label, value });
        if (!label || !value) continue;
        const lowerLabel = label.toLowerCase();
        if (!uniqueMap.has(lowerLabel)) uniqueMap.set(lowerLabel, { label, value });
      }

      const uniqueTypes = Array.from(uniqueMap.values());
      uniqueTypes.sort((a, b) => a.label.localeCompare(b.label));

      console.log('[GuarantorTypes] Final dropdown options:', uniqueTypes);

      select.innerHTML = '<option value="">--Select--</option>';
      uniqueTypes.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.value;
        opt.textContent = t.label;
        select.appendChild(opt);
      });

    } catch (err) {
      console.error("Error loading guarantor types:", err);
    }
  }

  function bindEvents() {
    // Setup currency formatting for amount fields (format on blur, not while typing)
    // Note: MaxNoOfLoans is a count, not an amount, so it doesn't get decimal formatting
    const amountFields = ['MaxGuaranteeAmount', 'Networth', 'Liability', 'LoanAmount'];
    amountFields.forEach(fieldId => {
      const field = qs(`#${fieldId}`);
      if (field) {
        // On blur: format the value after user finishes typing
        field.addEventListener('blur', (e) => {
          if (e.target.value) {
            e.target.value = formatCurrencyValue(e.target.value);
          }
        });
      }
    });

    qsa("[data-shell-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const next = btn.getAttribute("data-shell-mode");
        if (!next || !MODES[next.toUpperCase()]) return;
        
        // Validate View mode - require Guarantor ID
        if (next === "View") {
          const idInput = qs("#GuarantorID");
          if (!idInput || !idInput.value || idInput.value.trim() === "") {
            setToast("Please enter a Guarantor ID", "warning");
            return;
          }
          // Fetch the guarantor record
          fetchGuarantor(idInput.value.trim(), 0);
          return;
        }
        
        // Add toast message for Edit mode
        if (next === "Edit") {
          setToast("Record in edit mode. Make your changes and save.", "info");
        }
        
        // Add toast message for Add mode
        if (next === "Add") {
          setToast("Adding a new guarantor record.", "info");
        }
        
        setMode(MODES[next.toUpperCase()]);
      });
    });

    qs('[data-mg-action="save"]')?.addEventListener("click", () => {
      if (!qs('[data-mg-action="save"]')?.disabled) saveGuarantor();
    });
    qs('[data-mg-action="delete"]')?.addEventListener("click", () => {
      if (!qs('[data-mg-action="delete"]')?.disabled) deleteGuarantor();
    });
    qs('[data-mg-action="cancel"]')?.addEventListener("click", () => {
      const btn = qs('[data-mg-action="cancel"]');
      if (btn?.disabled) return;
      
      // Always clear all fields when cancel is clicked
      const form = qs("#maintain-guarantors-form");
      clearForm(form);
      
      // Reset state
      state.hasLoaded = false;
      state.canAddFromId = false;
      state.currentId = "";
      state.lastLoadedRow = null;
      
      // Set to VIEW mode
      setMode(MODES.VIEW);
      setToast("Changes cancelled.", "info");
    });

    // Old direct search logic replaced/modified:
    // qs('[data-mg-action="search"]')?.addEventListener("click", ...);

    // New Guarantor Lookup Modal Trigger
    qs("#btnGuarantorLookup")?.addEventListener("click", () => {
      openGuarantorLookupModal();
    });

    qs("#guarantorSearchSubmit")?.addEventListener("click", handleGuarantorSearch);
    
    // Guarantor OK button - select highlighted row
    qs("#guarantorSearchOk")?.addEventListener("click", () => {
      if (selectedGuarantorRow) {
        window.selectLookupGuarantor(selectedGuarantorRow.id);
      } else {
        // If no row selected, close modal
        if (guarantorLookupModal) guarantorLookupModal.hide();
      }
    });

    // Guarantor Search Pagination
    qs("#guarantorSearchPrevious")?.addEventListener("click", () => {
      if (guarantorSearchState.currentPage > 0) {
        guarantorSearchState.currentPage--;
        displayGuarantorSearchPage();
        updateGuarantorSearchPagination();
        console.log(`[GuarantorSearch] Navigated to page ${guarantorSearchState.currentPage + 1}`);
      }
    });

    qs("#guarantorSearchNext")?.addEventListener("click", () => {
      if (guarantorSearchState.currentPage < guarantorSearchState.totalPages - 1) {
        guarantorSearchState.currentPage++;
        displayGuarantorSearchPage();
        updateGuarantorSearchPagination();
        console.log(`[GuarantorSearch] Navigated to page ${guarantorSearchState.currentPage + 1}`);
      }
    });

    // Client Lookup Modal Trigger
    qs("#btnClientLookup")?.addEventListener("click", () => {
      openClientLookupModal();
    });

    // Existing ID input enter key logic: maybe still try direct fetch?
    // User requested "search icon should have a search modal".
    // I will keep Enter key doing direct fetch for speed, or redirect to modal?
    // Standard is: Enter in field -> Direct Fetch. Icon click -> Search Modal.
    // I'll leave Enter key logic as is (direct fetch).

    // Existing ID input enter key logic
    const idInput = qs("#GuarantorID");

    idInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = idInput.value;
        if (val) fetchGuarantor(val, 0);
        else setToast("Please enter an ID", "warning");
      }
    });

    // Watch for ID clear to reset Add capability
    idInput?.addEventListener("input", () => {
      if (state.mode === MODES.VIEW) {
        if (!idInput.value) {
          // Cleared
          state.canAddFromId = false;
          state.hasLoaded = false;
          state.currentId = "";
          // Optional: Clear rest of form if ID cleared? 
          // Usually yes
          clearForm(qs("#maintain-guarantors-form"), false);
        }
        // If user modifies ID, we treat as "not loaded" until they search again
        state.hasLoaded = false;
        updateActionButtons();
      }
    });

    qs('[data-mg-nav="prev"]')?.addEventListener("click", () => {
      const btn = qs('[data-mg-nav="prev"]');
      const guarantorIdField = qs("#GuarantorID");
      if (!btn.disabled && guarantorIdField?.value) {
        console.log('[Navigation] Previous clicked, GuarantorID:', guarantorIdField.value);
        fetchGuarantor(guarantorIdField.value.trim(), 1);
      }
    });
    qs('[data-mg-nav="next"]')?.addEventListener("click", () => {
      const btn = qs('[data-mg-nav="next"]');
      const guarantorIdField = qs("#GuarantorID");
      if (!btn.disabled && guarantorIdField?.value) {
        console.log('[Navigation] Next clicked, GuarantorID:', guarantorIdField.value);
        fetchGuarantor(guarantorIdField.value.trim(), 2);
      }
    });

    qs("#btnClientLookup")?.addEventListener("click", () => {
      console.log("Client Lookup Button Clicked");
      openClientLookupModal(); // NEW function
    });

    // Bind Modal Internal Events
    qs("#clientSearchSubmit")?.addEventListener("click", handleClientSearch);

    // Client OK button - select highlighted row
    qs("#clientSearchOk")?.addEventListener("click", () => {
      if (selectedClientRow) {
        window.selectLookupClient(selectedClientRow.id, selectedClientRow.name);
      } else {
        // If no row selected, close modal
        if (clientLookupModal) clientLookupModal.hide();
      }
    });

    // Client Search Pagination
    qs("#clientSearchPrevious")?.addEventListener("click", () => {
      if (clientSearchState.currentPage > 0) {
        clientSearchState.currentPage--;
        displayClientSearchPage();
        updateClientSearchPagination();
        console.log(`[ClientSearch] Navigated to page ${clientSearchState.currentPage + 1}`);
      }
    });

    qs("#clientSearchNext")?.addEventListener("click", () => {
      if (clientSearchState.currentPage < clientSearchState.totalPages - 1) {
        clientSearchState.currentPage++;
        displayClientSearchPage();
        updateClientSearchPagination();
        console.log(`[ClientSearch] Navigated to page ${clientSearchState.currentPage + 1}`);
      }
    });
  }

  window.addEventListener("load", async () => {
    bindEvents();
    setMode(MODES.VIEW);
    await populateGuarantorTypes();

    // Auto-load if desired, or just start empty
    // await fetchGuarantor("", 1); // Maybe don't auto load for this pattern
    state.canAddFromId = false;
    updateActionButtons();
  });
})();
