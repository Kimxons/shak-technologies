(() => {
  const windowEl = document.querySelector(".window");
  const form = document.querySelector("form");
  if (!form) return;

  /** Custom 3D Confirmation Dialog */
  const showConfirm = (message, title = "Confirm Action", iconClass = "bi-question-circle") => {
    return new Promise((resolve) => {
      let overlay = document.querySelector('.acd-confirm-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'acd-confirm-overlay';
        overlay.innerHTML = `
          <div class="acd-confirm-card">
            <div class="acd-confirm-icon"><i class="bi ${iconClass}"></i></div>
            <div class="acd-confirm-title">${title}</div>
            <div class="acd-confirm-msg">${message}</div>
            <div class="acd-confirm-actions">
              <button type="button" class="acd-confirm-btn acd-confirm-btn--cancel">Cancel</button>
              <button type="button" class="acd-confirm-btn acd-confirm-btn--confirm">Confirm</button>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);
      } else {
        overlay.querySelector('.acd-confirm-title').textContent = title;
        overlay.querySelector('.acd-confirm-msg').textContent = message;
        overlay.querySelector('.acd-confirm-icon i').className = `bi ${iconClass}`;
      }

      const confirmBtn = overlay.querySelector('.acd-confirm-btn--confirm');
      const cancelBtn = overlay.querySelector('.acd-confirm-btn--cancel');

      const handleResponse = (result) => {
        console.log(`[AccountDocuments] Confirm dialog response: ${result}`);
        overlay.classList.remove('is-visible');
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
        setTimeout(() => resolve(result), 300);
      };

      confirmBtn.onclick = () => handleResponse(true);
      cancelBtn.onclick = () => handleResponse(false);
      overlay.onclick = (e) => { if (e.target === overlay) handleResponse(false); };

      console.log(`[AccountDocuments] Showing confirm dialog: ${title}`);
      requestAnimationFrame(() => {
        overlay.classList.add('is-visible');
        // Force focus to confirm button for better UX
        setTimeout(() => confirmBtn.focus(), 100);
      });
    });
  };

  // Diagnostic: Global error handler
  window.addEventListener('error', (event) => {
    console.error('[AccountDocuments] Global Script Error:', event.error);
    showSystemToast(`Script Error: ${event.message}`, 'error');
  });

  const actionButtons = {
    view: document.querySelector('[data-shell-mode="View"]'),
    add: document.querySelector('[data-shell-mode="Add"]'),
    edit: document.querySelector('[data-shell-mode="Edit"]'),
    delete: document.querySelector('[data-submit-action="delete"]'),
    save: document.querySelector('[data-submit-action="save"]'),
    cancel: document.querySelector('[data-submit-action="cancel"]'),
    clear: document.querySelector('[data-submit-action="clear"]'),
    showImage: document.querySelector('[data-submit-action="showImage"]'),
    browse: document.querySelector('[data-submit-action="browse"]')
  };

  const navButtons = {
    prev: document.querySelector('[data-stepper-action="prev"]'),
    next: document.querySelector('[data-stepper-action="next"]')
  };

  // ==================== THEME INITIALIZATION ====================
  function loadTheme() {
    // Get KairoTheme API from parent window or current window
    const themeApi = (window.parent && window.parent !== window && window.parent.KairoTheme)
      ? window.parent.KairoTheme
      : window.KairoTheme;

    if (themeApi && typeof themeApi.getThemeModel === 'function') {
      try {
        const themeModel = themeApi.getThemeModel();
        console.log('[AccountDocuments] Theme model loaded:', themeModel);
      } catch (err) {
        console.warn('[AccountDocuments] Failed to load theme model:', err);
      }
    }
  }

  function setupThemeListener() {
    // Listen for theme changes and reload theme
    window.addEventListener('kairo-theme-model-changed', (event) => {
      console.log('[AccountDocuments] Theme changed, reloading...', event.detail);
      loadTheme();
    });

    window.addEventListener('kairo-typography-changed', (event) => {
      console.log('[AccountDocuments] Typography changed:', event.detail);
      loadTheme();
    });
  }

  // Initialize theme on module load
  loadTheme();
  setupThemeListener();

  // State variables
  const state = {
    editMode: "NONE", // NONE, ADD, EDIT, DELETE
    direction: 0, // -1 (prev), 0 (view), 1 (next)
    documentData: null,
    documentClassData: [],
    isSupervised: false,
    updateCount: 0,
    svUpdateCount: 0,
    operatorID: null,
    eventID: null,
    imageID: 0,
    modifyCount: 0
  };

  // ==================== CONTEXT INITIALIZATION ====================
  const getContext = () => {
    // Try to extract from title bar: "0104 : 1201111000006 : MULATU MALEDE ZELEKE"
    const titleText = document.querySelector('.tf-title-text')?.textContent || "";
    const parts = titleText.split(':').map(p => p.trim());

    // Validation: BranchID should be 4 numeric digits.
    // If parts[0] is just "Account Documents", use session storage instead.
    const branchCandidate = parts[0] || "";
    const isBranchValid = /^\d+$/.test(branchCandidate) && branchCandidate.length <= 5;

    return {
      OurBranchID: isBranchValid ? branchCandidate : (sessionStorage.getItem('OurBranchID') || '0104'),
      AccountID: (parts.length > 1 && parts[1].length > 5) ? parts[1] : (sessionStorage.getItem('AccountID') || '1201111000006'),
      OperatorID: sessionStorage.getItem('OperatorID') || 'CHARLES_TAABU',
      ModuleID: 1330
    };
  };

  const context = getContext();

  // ==================== COMPONENT INITIALIZATION ====================
  function initCustomControls() {
    // Document Class Multiselect Logic
    const ms = document.getElementById('documentClassMultiselect');
    const msDisplay = document.getElementById('documentClassDisplay');
    const msHidden = document.getElementById('documentClass');

    if (ms && msDisplay) {
      msDisplay.addEventListener('click', (e) => {
        if (state.editMode === "NONE") return;
        e.stopPropagation();
        ms.classList.toggle('active');
      });

      ms.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          const checkedValues = Array.from(ms.querySelectorAll('input[type="checkbox"]:checked'))
            .map(c => c.value);
          const checkedLabels = Array.from(ms.querySelectorAll('input[type="checkbox"]:checked'))
            .map(c => c.dataset.label || c.value);

          msDisplay.textContent = checkedLabels.length > 0 ? checkedLabels.join(', ') : '--Select--';
          if (msHidden) msHidden.value = checkedValues.join(',');
        });
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!ms.contains(e.target)) ms.classList.remove('active');
      });
    }

    // Received Date Picker Logic
    const dateBtn = document.querySelector('[data-date-toggle="receivedDate"]');
    const dateInput = document.getElementById('receivedDate');
    const datePicker = document.getElementById('receivedDate_picker');

    if (dateBtn && datePicker && dateInput) {
      const openPicker = () => {
        if (state.editMode === "NONE") return;
        try {
          if (typeof datePicker.showPicker === 'function') {
            datePicker.showPicker();
          } else {
            datePicker.focus();
            datePicker.click();
          }
        } catch (e) {
          datePicker.focus();
        }
      };

      dateBtn.addEventListener('click', openPicker);
      dateInput.addEventListener('click', openPicker);

      datePicker.addEventListener('change', () => {
        if (datePicker.value) {
          // Format YYYY-MM-DD to DD/MMM/YYYY if needed, or use base util
          const date = new Date(datePicker.value);
          if (window.DataEntryUtils && typeof window.DataEntryUtils.formatDate === 'function') {
            dateInput.value = window.DataEntryUtils.formatDate(date);
          } else {
            dateInput.value = datePicker.value;
          }
        }
      });
    }
  }

  initCustomControls();

  // Initialize Document Class multiselect as disabled on page load
  const initializeDocumentClassState = () => {
    const multiselect = document.getElementById('documentClassMultiselect');
    if (multiselect) {
      multiselect.classList.add('disabled');
      console.log('[AccountDocuments] Document Class multiselect initialized as disabled');
    }
  };

  initializeDocumentClassState();

  // Selector for fields that participate in ADD/EDIT modes
  // Excludes permanently readonly audit fields and hidden inputs
  const editableSelector = `
    #documentId,
    #documentType, 
    #documentClass, 
    #receivedBy, 
    #receivedDate, 
    #receivedDate_picker, 
    #receivedDate_btn,
    #location, 
    #remarks, 
    #documentImage,
    #browseBtn,
    .kairo-multiselect
  `.trim();
  const getEditableControls = () => Array.from(form.querySelectorAll(editableSelector.split(',').map(s => s.trim()).join(',')));

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

    // Standard controls
    getEditableControls().forEach((el) => {
      // Keep DocumentID field always active for navigation/search
      if (el.id === "documentId") {
        el.disabled = false;
        return;
      }

      el.disabled = !isEditing;

      // Handle custom multiselect component - use disabled class
      if (el.classList.contains('kairo-multiselect')) {
        if (isEditing) {
          el.classList.remove('disabled');
        } else {
          el.classList.add('disabled');
        }
        el.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.disabled = !isEditing);
      }
    });

    // Update button states based on edit mode
    const isNone = mode === "NONE";
    const isAdding = mode === "ADD";
    const isEditing_flag = mode === "EDIT" || mode === "DELETE";
    const isDeleting = mode === "DELETE";

    actionButtons.view && (actionButtons.view.disabled = !isNone);
    actionButtons.add && (actionButtons.add.disabled = !isNone);
    actionButtons.edit && (actionButtons.edit.disabled = !isNone || !state.documentData);
    actionButtons.delete && (actionButtons.delete.disabled = !isNone || !state.documentData);
    actionButtons.save && (actionButtons.save.disabled = isNone);
    actionButtons.cancel && (actionButtons.cancel.disabled = isNone);
    actionButtons.showImage && (actionButtons.showImage.disabled = isEditing_flag || !state.imageID);

    navButtons.prev && (navButtons.prev.disabled = !isNone);
    navButtons.next && (navButtons.next.disabled = !isNone);
  };

  // ============================================================================
  // INLINE VALIDATION FUNCTIONS (Enterprise-grade)
  // ============================================================================

  /** Clear all inline field errors and validation summary */
  const clearAllFieldErrors = () => {
    form.querySelectorAll('.acd-field-invalid').forEach(el => {
      el.classList.remove('acd-field-invalid');
    });
    form.querySelectorAll('.acd-field-error').forEach(el => el.remove());
    const summary = form.querySelector('.acd-validation-summary');
    if (summary) summary.classList.remove('is-visible');
  };

  /** Mark a single field as invalid with inline error message */
  const showFieldError = (el, message) => {
    if (!el) return;
    el.classList.add('acd-field-invalid');

    // Remove existing error message if any
    const existingError = el.parentElement?.querySelector('.acd-field-error');
    if (existingError) existingError.remove();

    // Create inline error message
    const errorSpan = document.createElement('span');
    errorSpan.className = 'acd-field-error';
    errorSpan.textContent = message;

    // Insert after the input element
    el.parentElement?.appendChild(errorSpan);
  };

  /** Clear error state from a single field */
  const clearFieldError = (el) => {
    if (!el) return;
    el.classList.remove('acd-field-invalid');
    const errorMsg = el.parentElement?.querySelector('.acd-field-error');
    if (errorMsg) errorMsg.remove();

    // Hide summary if no more errors
    const remainingErrors = form.querySelectorAll('.acd-field-invalid');
    if (remainingErrors.length === 0) {
      const summary = form.querySelector('.acd-validation-summary');
      if (summary) summary.classList.remove('is-visible');
    }
  };

  /** Show validation summary banner */
  const showValidationSummary = (message) => {
    let summary = form.querySelector('.acd-validation-summary');
    if (!summary) {
      summary = document.createElement('div');
      summary.className = 'acd-validation-summary';
      // Insert at top of form after section header
      const sectionHeader = form.querySelector('.acd-section-header');
      if (sectionHeader && sectionHeader.nextSibling) {
        sectionHeader.parentNode.insertBefore(summary, sectionHeader.nextSibling);
      } else {
        form.prepend(summary);
      }
    }
    summary.innerHTML = `<i class="bi bi-exclamation-circle"></i><span>${message}</span>`;
    summary.classList.add('is-visible');
  };

  /** Display validation errors with inline field messages */
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

    // Focus first invalid field
    if (errors[0]?.el?.focus) errors[0].el.focus();
  };

  /** Dynamically render Document Classes in the multiselect dropdown */
  const renderDocumentClasses = (classes) => {
    const container = document.querySelector('#documentClassMultiselect .kairo-multiselect__dropdown');
    if (!container) return;

    if (!classes || classes.length === 0) {
      container.innerHTML = '<div class="p-2 text-muted small">No classes available</div>';
      return;
    }

    container.innerHTML = classes.map(cls => {
      const id = cls.ID || cls.DocumentClassID || '';
      const desc = cls.Description || cls.DocumentClassDesc || cls.Name || id || 'Unknown';
      // Filter out 'undefined' string and empty values
      const displayLabel = (desc && String(desc) !== 'undefined') ? desc : `Class ${id}`;
      return `
        <div class="kairo-multiselect__item">
          <input type="checkbox" id="class_${id}" value="${id}" data-label="${displayLabel}">
          <label for="class_${id}">${displayLabel}</label>
        </div>
      `;
    }).join('');

    // Re-attach change listeners to new checkboxes
    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const ms = document.getElementById('documentClassMultiselect');
        const msDisplay = document.getElementById('documentClassDisplay');
        const msHidden = document.getElementById('documentClass');

        const checkedValues = Array.from(ms.querySelectorAll('input[type="checkbox"]:checked'))
          .map(c => c.value);
        const checkedLabels = Array.from(ms.querySelectorAll('input[type="checkbox"]:checked'))
          .map(c => c.dataset.label || c.value);

        if (msDisplay) msDisplay.textContent = checkedLabels.length > 0 ? checkedLabels.join(', ') : '--Select--';
        if (msHidden) msHidden.value = checkedValues.join(',');
      });
    });
  };

  const clearForm = () => {
    getEditableControls().forEach((el) => (el.value = el.tagName === "SELECT" ? "" : ""));
    // Clear audit fields - they are readonly text inputs
    const auditFields = ["documentDesc_lookup", "createdBy", "createdOn", "modifiedBy", "modifiedOn", "supervisedBy", "supervisedOn"];
    auditFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    state.documentData = null;
    state.documentClassData = [];
    state.imageID = 0;

    // Clear all validation errors on form clear/refresh
    clearAllFieldErrors();
  };

  /** Show system toast (for non-validation messages only) */
  const showSystemToast = (message, type = "info") => {
    console.log(`[AccountDocuments] ${type.toUpperCase()}: ${message}`);

    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector(".acd-toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.className = "acd-toast-container";
      document.body.appendChild(toastContainer);
    }

    // Remove existing toasts to avoid stacking
    toastContainer.querySelectorAll('.acd-toast').forEach(t => t.remove());

    // Create toast element
    const toast = document.createElement("div");
    toast.className = `acd-toast acd-toast--${type}`;

    // Icon based on type
    const icons = {
      success: "bi-check-circle-fill",
      warning: "bi-exclamation-triangle-fill",
      error: "bi-x-circle-fill",
      info: "bi-info-circle-fill"
    };

    toast.innerHTML = `
      <i class="bi ${icons[type] || icons.info} acd-toast__icon"></i>
      <span class="acd-toast__message">${message}</span>
      <button class="acd-toast__close" aria-label="Close"><i class="bi bi-x"></i></button>
    `;

    // Add close functionality
    toast.querySelector(".acd-toast__close").addEventListener("click", () => {
      toast.classList.add("acd-toast--hiding");
      setTimeout(() => toast.remove(), 300);
    });

    // Add to container
    toastContainer.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add("acd-toast--visible");
    });

    // Auto-remove after delay (shorter for success)
    const delay = type === "success" ? 3000 : type === "error" ? 6000 : 4000;
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add("acd-toast--hiding");
        setTimeout(() => toast.remove(), 300);
      }
    }, delay);
  };

  // Keep legacy showMessage for backward compatibility, route validation to inline
  const showMessage = (message, type = "info") => {
    // For validation warnings, use inline display instead of toast
    // This is a fallback - prefer using displayValidationErrors directly
    showSystemToast(message, type);
  };

  const bindFormData = (data) => {
    if (!data || typeof data !== "object") return;

    // Check if this is a valid document record or just metadata
    const docId = data.DocumentID || data.DocumentId || data.ID;
    if (!docId && state.editMode === "NONE") {
      console.warn("[AccountDocuments] Skipping bind for record without DocumentID:", data);
      return;
    }

    state.documentData = data;

    const getValue = (keys) => {
      for (const k of keys) {
        if (data[k] !== undefined && data[k] !== null) return String(data[k]);
      }
      return "";
    };

    document.getElementById("documentId") && (document.getElementById("documentId").value = getValue(["DocumentID", "DocumentId"]));
    document.getElementById("documentDesc") && (document.getElementById("documentDesc").value = getValue(["DocumentDescription", "DocumentName", "DocumentDesc"]) || "");
    document.getElementById("documentType") && (document.getElementById("documentType").value = getValue(["DocumentTypeID", "DocumentType"]));
    document.getElementById("documentClass") && (document.getElementById("documentClass").value = getValue(["DocumentClassID", "DocumentClass"]));
    document.getElementById("receivedBy") && (document.getElementById("receivedBy").value = getValue(["ReceivedBy"]));
    document.getElementById("receivedDate") && (document.getElementById("receivedDate").value = getValue(["ReceivedDate"]));
    document.getElementById("location") && (document.getElementById("location").value = getValue(["LocationID", "Location"]));
    document.getElementById("documentImage") && (document.getElementById("documentImage").value = getValue(["DocumentImage", "ImagePath"]));
    document.getElementById("remarks") && (document.getElementById("remarks").value = getValue(["Remarks"]));

    // Update multiselect display
    const msValue = getValue(["DocumentClassID", "DocumentClass"]);
    if (msValue) {
      const msCodes = msValue.split(',').map(s => s.trim());
      const ms = document.getElementById('documentClassMultiselect');
      const msDisplay = document.getElementById('documentClassDisplay');
      if (ms && msDisplay) {
        const labels = [];
        ms.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          if (msCodes.includes(cb.value)) {
            cb.checked = true;
            labels.push(cb.dataset.label || cb.value);
          } else {
            cb.checked = false;
          }
        });
        msDisplay.textContent = labels.length > 0 ? labels.join(', ') : '--Select--';
        const msHidden = document.getElementById('documentClass');
        if (msHidden) msHidden.value = msCodes.join(',');
      }
    }

    // Audit fields - use value since they're now textbox inputs (readonly)
    document.getElementById("createdBy") && (document.getElementById("createdBy").value = getValue(["CreatedBy", "MakerID"]) || "");
    document.getElementById("createdOn") && (document.getElementById("createdOn").value = getValue(["CreatedOn", "MakerDT"]) || "");
    document.getElementById("modifiedBy") && (document.getElementById("modifiedBy").value = getValue(["ModifiedBy", "ModifierID"]) || "");
    document.getElementById("modifiedOn") && (document.getElementById("modifiedOn").value = getValue(["ModifiedOn", "ModifierDT"]) || "");
    document.getElementById("supervisedBy") && (document.getElementById("supervisedBy").value = getValue(["SupervisedBy"]) || "");
    document.getElementById("supervisedOn") && (document.getElementById("supervisedOn").value = getValue(["SupervisedOn"]) || "");

    // Store metadata
    state.imageID = parseInt(getValue(["ImageID", "ImageId"])) || 0;
    state.updateCount = parseInt(getValue(["UpdateCount"])) || 0;
    state.eventID = parseInt(getValue(["EventID", "EventId"])) || 0;
    state.operatorID = getValue(["OperatorID", "OperatorId"]);
  };

  const getFormData = () => {
    const get = (id) => {
      const el = document.getElementById(id);
      return el ? el.value : "";
    };

    const currentContext = getContext();

    // Construct XML for DetailRecords (Document Class)
    const docClassCsv = get("documentClass");
    const docClassCodes = docClassCsv ? docClassCsv.split(',').filter(Boolean) : [];
    let detailRecordsXml = '<dt_DocumentClasses>';
    docClassCodes.forEach(code => {
      detailRecordsXml += `<DocumentClassID>${code}</DocumentClassID>`;
    });
    detailRecordsXml += '</dt_DocumentClasses>';

    return {
      OurBranchID: currentContext.OurBranchID,
      AccountID: currentContext.AccountID,
      DocumentID: get("documentId"),
      DocumentTypeID: get("documentType"),
      ReceivedBy: get("receivedBy"),
      ReceivedDate: document.getElementById("receivedDate_picker")?.value || get("receivedDate"),
      ExpiryDate: "", // Empty string instead of null for SP compatibility
      ImageID: state.imageID || 0,
      LocationID: get("location"),
      Remarks: get("remarks"),
      CreatedBy: get("createdBy") || currentContext.OperatorID,
      CreatedOn: get("createdOn") || "",
      ModifiedBy: currentContext.OperatorID,
      ModifiedOn: "", // Empty string for SP compatibility
      SupervisedBy: get("supervisedBy") || "",
      NewRecord: state.editMode === "ADD" ? 1 : (state.updateCount || 0),
      DetailRecords: detailRecordsXml
    };
  };

  const isFormValid = () => {
    const documentIdEl = document.getElementById("documentId");
    const documentTypeEl = document.getElementById("documentType");
    const documentId = documentIdEl?.value?.trim();
    const documentType = documentTypeEl?.value?.trim();

    const errors = [];

    if (!documentId) {
      errors.push({ el: documentIdEl, message: 'Document ID is required' });
    }

    if (!documentType) {
      errors.push({ el: documentTypeEl, message: 'Document Type is required' });
    }

    if (errors.length > 0) {
      displayValidationErrors(errors);
      return false;
    }

    clearAllFieldErrors();
    return true;
  };

  const showToast = (msg, type = "info") => {
    console.log(`[AccountDocuments] ${type.toUpperCase()}: ${msg}`);
    // TODO: Integrate with UI toast/notification if available.
  };

  const handleViewOrNavigate = async (direction = 0) => {
    const svc = window.accountservice || window.parent?.accountservice;

    if (!svc?.getAccountDocuments) {
      showSystemToast("accountservice not available.", "error");
      console.error("[AccountDocuments] accountservice.getAccountDocuments not found");
      return;
    }

    // Refresh context to ensure we have the latest branch/account IDs
    const currentContext = getContext();

    const documentIdEl = document.getElementById("documentId");
    const documentId = documentIdEl?.value?.trim() || "";
    if (!documentId) {
      displayValidationErrors([{ el: documentIdEl, message: 'Enter Document ID to view' }]);
      return;
    }

    // Clear validation errors before proceeding
    clearAllFieldErrors();

    state.direction = direction;

    try {
      console.log("[AccountDocuments] Calling getAccountDocuments with:", {
        DocumentID: documentId,
        Direction: direction,
        OurBranchID: currentContext.OurBranchID,
        AccountID: currentContext.AccountID,
        OperatorID: currentContext.OperatorID
      });

      const result = await svc.getAccountDocuments({
        DocumentID: documentId,
        Direction: direction,
        OurBranchID: currentContext.OurBranchID,
        AccountID: currentContext.AccountID,
        OperatorID: currentContext.OperatorID
      });

      console.log("[AccountDocuments] Response:", result);

      if (!result?.success) {
        // Record not found in account documents. Check master table using p_GetIDDescription
        try {
          const descResult = await svc.getIDDescription({
            OurBranchID: currentContext.OurBranchID,
            ControlTypeID: 'DocumentID',
            ID: documentId,
            BankID: '00',
            TypeID: '',
            AdvanceFilter: '',
            LanguageID: 'en'
          });

          console.log("[AccountDocuments] Master check result:", descResult);

          if (descResult?.success) {
            const details = descResult.data || descResult;
            const rows = details.Details || details.Details01 || details;
            let description = "";

            if (Array.isArray(rows) && rows.length > 0) {
              description = Object.values(rows[0])[0];
            } else if (typeof rows === 'object' && rows !== null && !Array.isArray(rows)) {
              description = Object.values(rows)[0];
            }

            if (description && typeof description === 'string' && description.length > 0) {
              const descEl = document.getElementById('documentDesc_lookup');
              if (descEl) descEl.value = description;

              showMessage("Document exists in master but not for this account. Click ADD to assign.", "info");
              return;
            }
          }
        } catch (e) {
          console.error("[AccountDocuments] Master check failed:", e);
        }

        showMessage(result?.message || "Record not found.", "warning");

        // If no record found and trying to view
        if (direction === 0) {
          clearForm();
          setEditMode("NONE");
        }
        return;
      }

      // Extract row data from various possible response structures
      let row = null;
      let details = result.data || result;

      /** 
       * Dataset Mapping for p_GetAccountDocuments:
       * Details (index 0)   -> Available Document Classes List
       * Details01 (index 1) -> Primary Account Document Row
       * Details02 (index 2) -> Selection/Audit/Metadata
       */

      // 1. DYNAMICALLY RENDER DOCUMENT CLASSES (from Set 1: Details)
      if (details.Details && Array.isArray(details.Details)) {
        renderDocumentClasses(details.Details);
      }

      // 2. EXTRACT PRIMARY ROW (Look in Details01 first, then Details)
      // Check Details01 (Primary Row in the SP)
      if (details.Details01 && Array.isArray(details.Details01) && details.Details01.length > 0) {
        const candidate = details.Details01[0];
        // If it looks like a document row (has DocumentID), use it
        if (candidate.DocumentID || candidate.DocumentId) {
          row = candidate;
        }
        // If it looks like metadata (Supervision row), set state
        else if (candidate.OperatorID !== undefined || candidate.EventID !== undefined) {
          state.operatorID = candidate.OperatorID;
          state.eventID = candidate.EventID;
          state.updateCount = candidate.UpdateCount || 0;
        }
      }

      // 3. EXTRACT SELECTION/METADATA (from Set 3: Details02)
      if (details.Details02 && Array.isArray(details.Details02) && details.Details02.length > 0) {
        const candidate = details.Details02[0];

        // If row wasn't found in Details01, check if Details02 has it (fallback)
        if (!row && (candidate.DocumentID || candidate.DocumentId)) {
          row = candidate;
        }

        // Handle Metadata if present in Details02 
        if (candidate.OperatorID !== undefined && candidate.EventID !== undefined) {
          state.operatorID = candidate.OperatorID;
          state.eventID = candidate.EventID;
          state.updateCount = candidate.UpdateCount || 0;
        }

        // Handle Selected Classes list if this is the selection set
        // Usually Details02 is the selection list in the current SP
        const selectedIds = details.Details02
          .filter(c => c.IsSelected === 1 || c.IsSelected === "1")
          .map(c => c.DocumentClassID)
          .filter(Boolean);

        if (selectedIds.length > 0 && row) {
          row.DocumentClassID = selectedIds.join(',');
        }
      }

      // 4. FINAL ROW VALIDATION & BINDING
      if (!row) {
        // Final fallback: Maybe Details (Set 1) contains the record (single supervision row case)
        if (details.Details && Array.isArray(details.Details) && details.Details.length > 1) {
          // In some cases if Details is metadata, we check it
        }

        // If still no row, it might be a new record (ADD mode candidate)
        console.warn("[AccountDocuments] No primary document row found in response.", details);
        if (direction !== 0) {
          showMessage("Record not found.", "warning");
          clearForm();
          setEditMode("NONE");
        }
        return;
      }

      console.log("[AccountDocuments] Binding integrated data to form:", row);
      bindFormData(row);
      snapshotValues();
      setEditMode("NONE");
      showMessage("Record loaded successfully.", "success");
    } catch (err) {
      console.error("[AccountDocuments] View/Navigate error:", err);
      showMessage(err?.message || "Failed to load document.", "error");
      clearForm();
      setEditMode("NONE");
    }
  };

  const handleSave = async () => {
    console.log("[AccountDocuments] handleSave triggered. Mode:", state.editMode);

    if (!isFormValid()) {
      console.warn("[AccountDocuments] Form validation failed.");
      return;
    }

    const svc = window.accountservice || window.parent?.accountservice || window.top?.accountservice;
    console.log("[AccountDocuments] Checking accountservice:", !!svc);

    if (!svc?.addEditAccountDocuments) {
      const msg = "accountservice.addEditAccountDocuments not found!";
      showMessage(msg, "error");
      console.error("[AccountDocuments]", msg);
      return;
    }

    try {
      const formData = getFormData();
      console.log("[AccountDocuments] Prepared Form Data:", formData);

      // Show 3D confirmation before saving
      console.log("[AccountDocuments] Requesting confirmation...");
      const confirmed = await showConfirm(
        `Are you sure you want to ${state.editMode === "ADD" ? "create" : "update"} this document record?`,
        "Save Document",
        "bi-save"
      );

      if (!confirmed) {
        showMessage("Save cancelled.", "info");
        return;
      }

      // Check if supervision is required
      if (state.isSupervised) {
        // Prompt for remarks if supervised
        const remarks = prompt("Please enter remarks for supervision:", "");
        if (remarks === null) {
          showMessage("Operation cancelled.", "info");
          return;
        }
        formData.Remarks = remarks;
      }

      actionButtons.save && (actionButtons.save.disabled = true);

      console.log("[AccountDocuments] Saving Data:", formData);

      const result = await svc.addEditAccountDocuments(formData);

      console.log("[AccountDocuments] Save response:", result);

      if (!result?.success) {
        showMessage(result?.message || "Failed to save document.", "error");
        actionButtons.save && (actionButtons.save.disabled = false);
        return;
      }

      // Success - show appropriate message
      const successMsg = state.editMode === "DELETE"
        ? "Document deleted successfully."
        : `Document ${state.editMode === "ADD" ? "added" : "updated"} successfully.`;

      showMessage(successMsg, "success");

      // Reset form
      const savedMode = state.editMode;
      setEditMode("NONE");
      snapshotValues();

      // Clear if deleted, otherwise reload data to ensure form reflects latest DB state
      if (savedMode === "DELETE") {
        clearForm();
      } else {
        // Autoload the saved data
        setTimeout(() => handleViewOrNavigate(0), 100);
      }

    } catch (err) {
      console.error("[AccountDocuments] Save error:", err);
      showMessage(err?.message || "Failed to save document.", "error");
      actionButtons.save && (actionButtons.save.disabled = false);
    }
  };

  snapshotValues();
  setEditMode("NONE");

  // Log initialization
  console.log("[AccountDocuments] Initialized with state:", state);
  console.log("[AccountDocuments] accountservice available:", !!window.accountservice);
  if (window.accountservice) {
    console.log("[AccountDocuments] Service methods:", {
      getAccountDocuments: !!window.accountservice.getAccountDocuments,
      addEditAccountDocuments: !!window.accountservice.addEditAccountDocuments
    });
  }

  // View button - load/view record
  actionButtons.view?.addEventListener("click", () => void handleViewOrNavigate(0));

  // Add button - create new record
  actionButtons.add?.addEventListener("click", async () => {
    const confirmed = await showConfirm(
      "Clear form and prepare to add a new document for this account?",
      "Add Document",
      "bi-plus-circle"
    );

    if (confirmed) {
      // Preserve current ID and description if they exist (user might have typed them before clicking add)
      const currentId = document.getElementById("documentId")?.value;
      const currentDesc = document.getElementById("documentDesc_lookup")?.value;

      snapshotValues();
      clearForm();

      // Restore preserved values
      if (currentId) document.getElementById("documentId").value = currentId;
      if (currentDesc) document.getElementById("documentDesc_lookup").value = currentDesc;

      setEditMode("ADD");
      document.getElementById("documentType")?.focus();
    }
  });

  // Edit button - edit existing record
  actionButtons.edit?.addEventListener("click", async () => {
    if (!state.documentData) {
      showMessage("Load a record before editing.", "warning");
      return;
    }

    const confirmed = await showConfirm(
      "Enable editing for this document record? You will be able to modify document details.",
      "Edit Document",
      "bi-pencil-square"
    );

    if (confirmed) {
      snapshotValues();
      setEditMode("EDIT");
      document.getElementById("documentType")?.focus();
    }
  });

  // Delete button - delete record
  actionButtons.delete?.addEventListener("click", async () => {
    if (!state.documentData) {
      showMessage("Load a record before deleting.", "warning");
      return;
    }

    const confirmed = await showConfirm(
      "Are you sure you want to delete this document? This action cannot be undone.",
      "Delete Document",
      "bi-trash"
    );

    if (confirmed) {
      snapshotValues();
      setEditMode("DELETE");
      handleSave();
    }
  });

  // Save button - save changes
  actionButtons.save?.addEventListener("click", () => {
    console.log("[AccountDocuments] SAVE button clicked manually");
    void handleSave();
  });

  // Cancel button - cancel editing
  actionButtons.cancel?.addEventListener("click", async () => {
    const confirmed = await showConfirm(
      "Discard unsaved changes and return to view mode?",
      "Discard Changes",
      "bi-arrow-left-circle"
    );
    if (confirmed) {
      restoreValues();
      setEditMode("NONE");
      state.editMode = "NONE";
    }
  });

  // Show Image buttons
  document.querySelectorAll('[data-submit-action="showImage"]').forEach(btn => {
    btn.addEventListener("click", () => {
      if (!state.imageID || state.imageID === 0) {
        showMessage("No image available for this document.", "warning");
        return;
      }
      showMessage("Show Image functionality - to be implemented with image viewer", "info");
    });
  });

  // Browse behavior - trigger hidden file input
  const browseBtn = document.getElementById('browseBtn');
  const fileInput = document.getElementById('documentImage_file');
  const imageDisplay = document.getElementById('documentImage');

  if (browseBtn && fileInput && imageDisplay) {
    browseBtn.addEventListener("click", () => {
      if (state.editMode === "NONE") return;
      fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        imageDisplay.value = file.name;
        // Optionally store the file in state for later upload
        state.selectedFile = file;
        showSystemToast(`File selected: ${file.name}`, "info");
      }
    });
  }

  // Navigation buttons
  navButtons.prev?.addEventListener("click", () => void handleViewOrNavigate(-1));
  navButtons.next?.addEventListener("click", () => void handleViewOrNavigate(1));

  // Clear button
  actionButtons.clear?.addEventListener("click", async () => {
    const confirmed = await showConfirm(
      "Are you sure you want to clear all input fields? This cannot be undone.",
      "Clear Form",
      "bi-eraser"
    );
    if (confirmed) {
      clearForm();
      setEditMode("NONE");
    }
  });

  // ==================== SEARCH INITIALIZATION ====================

  // Initialize Generic Search Modal
  const searchModal = new window.SearchModal({
    prefix: 'acd',
    moduleID: context.ModuleID,
    getOperatorId: () => context.OperatorID,
    getOurBranchId: () => context.OurBranchID
  });

  const handleLookup = (lookupType, targetId) => {
    const config = {
      tableID: lookupType,
      title: `Search ${lookupType}`,
      searchKey: `[OurBranchID:${context.OurBranchID}][AccountID:${context.AccountID}]`,
      advFilterString: "BankID='00'",
      displayFields: [
        { key: lookupType, label: lookupType },
        { key: 'Description', label: 'Description' }
      ],
      searchFields: [
        { name: lookupType, column: lookupType, label: lookupType, value: document.getElementById(targetId)?.value || '' }
      ],
      onSelect: (record) => {
        const val = record[lookupType] || record.DocumentID || record.DocID || record.UserID || '';
        const desc = record.Description || record.DocumentDescription || record.Name || '';

        const input = document.getElementById(targetId);
        if (input) {
          input.value = val;
          input.dispatchEvent(new Event('change'));
        }

        // Special handling for DocumentID - autofill entire form
        if (lookupType === 'DocumentID' && val) {
          const descInput = document.getElementById('documentDesc_lookup');
          if (descInput) descInput.value = desc;
          setTimeout(() => handleViewOrNavigate(0), 50);
        }
      }
    };

    // Specific field adjustments
    if (lookupType === 'ReceivedBy') {
      config.displayFields = [
        { key: 'UserID', label: 'User ID' },
        { key: 'UserName', label: 'User Name' }
      ];
      config.searchFields = [
        { name: 'UserID', column: 'UserID', label: 'User ID', value: '' }
      ];
    }

    searchModal.open(config);
  };

  // Wire up lookup buttons
  document.querySelectorAll(".kairo-branch-control__lookup, .kairo-control__lookup").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // Logic for calendar toggle is handled separately
      if (btn.hasAttribute('data-date-toggle')) return;
      if (btn.dataset.submitAction === 'browse') return;

      e.preventDefault();
      const lookupType = btn.dataset.lookupType || (btn.dataset.targetInput === 'documentId' ? 'DocumentID' : 'ReceivedBy');
      const targetId = btn.dataset.targetInput || (lookupType === 'DocumentID' ? 'documentId' : 'receivedBy');
      handleLookup(lookupType, targetId);
    });
  });

  // Real-time validation clearing - when user types in a validated field, clear its error
  const validatedFieldIds = ['documentId', 'documentType'];
  validatedFieldIds.forEach((fieldId) => {
    const el = document.getElementById(fieldId);
    if (!el) return;

    const handleClear = () => clearFieldError(el);
    el.addEventListener('input', handleClear);
    el.addEventListener('change', handleClear);

    if (fieldId === 'documentId') {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleViewOrNavigate(0);
        }
      });
    }
  });

  // Title bar buttons (refresh, maximize, close, minimize)
  document.querySelectorAll(".tf-title-btn[data-action]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const action = btn.getAttribute("data-action");
      const deWindow = document.querySelector('.window');

      console.log(`[AccountDocuments] Title bar action: ${action}`);

      switch (action) {
        case "refresh":
          clearAllFieldErrors();
          window.location.reload();
          break;
        case "minimize":
          // Notify parent or toggle local minimized state
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: "accountMaintenanceChildMinimize" }, "*");
          } else {
            deWindow?.classList.toggle("window--minimized");
            showSystemToast("Window minimized", "info");
          }
          break;
        case "maximize":
          const isMaximized = deWindow?.classList.toggle("window--maximized");
          const maxIcon = btn.querySelector('i');
          if (maxIcon) {
            maxIcon.className = isMaximized ? 'bi bi-fullscreen-exit' : 'bi bi-square';
          }
          btn.title = isMaximized ? 'Restore' : 'Maximize';
          btn.setAttribute('aria-label', isMaximized ? 'Restore window' : 'Maximize window');
          break;
        case "close":
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: "accountMaintenanceChildClose" }, "*");
          } else {
            // Standalone fallback
            if (window.history.length > 1) {
              window.history.back();
            } else {
              window.close();
            }
          }
          break;
      }
    });
  });
})();
