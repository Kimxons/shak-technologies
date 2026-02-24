(() => {
  if (window.__kairoFixedAssetRateDetailsLoaded) return;
  window.__kairoFixedAssetRateDetailsLoaded = true;

  console.log("[RateDetails] script loaded");

  // Helper selectors
  const qs = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => ctx.querySelectorAll(sel);

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  const state = {
    mode: MODES.VIEW,
    gridMode: "VIEW", // ADD, EDIT
    rateId: "",
    details: [],
    selectedRow: null,
    selectedRowIndex: -1,
    hasLoadedRecord: false
  };

  const GRID_MODES = {
    VIEW: "VIEW",
    ADD: "ADD",
    EDIT: "EDIT"
  };

  // Toast helper using kairo-toast pattern
  function setToast(message, variant = 'info') {
    // Always use kairo-toast which has proper CSS styling
    let container = qs('.kairo-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'kairo-toast-container';
      document.body.appendChild(container);
    }
    
    // Remove any existing toasts - only show one at a time
    container.querySelectorAll('.kairo-toast').forEach(existingToast => {
      existingToast.classList.remove('is-show');
      setTimeout(() => existingToast.remove(), 200);
    });
    
    const variantClass = variant === 'danger' || variant === 'warning' ? 'kairo-toast--danger' 
                       : variant === 'success' ? 'kairo-toast--success' 
                       : '';
    
    const titleText = variant === 'danger' ? 'Error' 
                    : variant === 'warning' ? 'Warning' 
                    : variant === 'success' ? 'Success' 
                    : 'Info';
    
    const toast = document.createElement('div');
    toast.className = `kairo-toast ${variantClass}`;
    toast.innerHTML = `
      <div class="kairo-toast__title">
        <span>${titleText}</span>
        <button class="kairo-toast__close" type="button">&times;</button>
      </div>
      <div class="kairo-toast__body">${message}</div>
    `;
    
    container.appendChild(toast);
    
    // Show animation - use setTimeout to ensure DOM is ready
    setTimeout(() => toast.classList.add('is-show'), 10);
    
    // Close button
    toast.querySelector('.kairo-toast__close')?.addEventListener('click', () => {
      toast.classList.remove('is-show');
      setTimeout(() => toast.remove(), 200);
    });
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      toast.classList.remove('is-show');
      setTimeout(() => toast.remove(), 200);
    }, 5000);
    
    console.log(`[RateDetails] Toast (${variant}): ${message}`);
  }

  // Update record count badge
  function updateRecordCount() {
    const badge = qs('#recordCount');
    if (badge) {
      badge.textContent = `${state.details.length} records`;
    }
  }

  function setMode(nextMode) {
    state.mode = nextMode;
    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#fa-rate-details-form");
    if (!form) return;

    // Main header fields
    const effectiveDateInput = qs("#EffectiveDate");
    const isMainEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

    if (effectiveDateInput) {
      if (effectiveDateInput.hasAttribute("data-always-enabled")) {
        effectiveDateInput.disabled = false;
      } else {
        effectiveDateInput.disabled = !isMainEditable;
      }
    }

    // Grid entry fields
    updateGridInputsState();

    // Main Action buttons
    const viewBtn = qs('.btn-view');
    const addBtn = qs('.btn-add');
    const editBtn = qs('.btn-edit');
    const deleteBtn = qs('.btn-delete');
    const saveBtn = qs('.btn-save');
    const cancelBtn = qs('.btn-cancel');

    const hasData = state.details.length > 0;

    setButtonDisabled(viewBtn, false);
    setButtonDisabled(addBtn, nextMode === MODES.VIEW);
    setButtonDisabled(editBtn, nextMode === MODES.VIEW && hasData);
    setButtonDisabled(deleteBtn, nextMode === MODES.VIEW && hasData);
    setButtonDisabled(saveBtn, !isMainEditable);
    setButtonDisabled(cancelBtn, false);

    updateGridButtons();
  }

  function updateGridInputsState() {
    const isGridEditable = state.gridMode === GRID_MODES.ADD || state.gridMode === GRID_MODES.EDIT;
    const isMainEditable = state.mode === MODES.ADD || state.mode === MODES.UPDATE;

    const canEditGrid = isMainEditable && isGridEditable;

    qs("#FromYear") && (qs("#FromYear").disabled = !canEditGrid);
    qs("#ToYear") && (qs("#ToYear").disabled = !canEditGrid);
    qs("#Rate") && (qs("#Rate").disabled = !canEditGrid);
  }

  function setButtonDisabled(btn, disabled) {
    if (btn) btn.disabled = Boolean(disabled);
  }

  function updateGridButtons() {
    const isMainEditable = state.mode === MODES.ADD || state.mode === MODES.UPDATE;
    const gridMode = state.gridMode;

    const newBtn = qs('[data-grid-action="new"]');
    const alterBtn = qs('[data-grid-action="alter"]');
    const removeBtn = qs('[data-grid-action="remove"]');
    const updateBtn = qs('[data-grid-action="update"]');
    const clearBtn = qs('[data-grid-action="clear"]');

    if (!isMainEditable) {
      [newBtn, alterBtn, removeBtn, updateBtn, clearBtn].forEach(btn => setButtonDisabled(btn, true));
      return;
    }

    const hasSelection = state.selectedRowIndex >= 0;

    setButtonDisabled(newBtn, gridMode !== GRID_MODES.VIEW);
    setButtonDisabled(alterBtn, gridMode !== GRID_MODES.VIEW || !hasSelection);
    setButtonDisabled(removeBtn, gridMode !== GRID_MODES.VIEW || !hasSelection);
    setButtonDisabled(updateBtn, gridMode === GRID_MODES.VIEW);
    setButtonDisabled(clearBtn, gridMode === GRID_MODES.VIEW);
  }

  const isActionButton = (target) => {
    const btn = target?.closest('.btn-action');
    if (!btn) return null;
    // First check data-action attribute (standardized pattern)
    const action = btn.getAttribute('data-action');
    if (action) return { btn, text: action.toLowerCase() };
    // Fallback to class-based detection
    if (btn.classList.contains('btn-view')) return { btn, text: 'view' };
    if (btn.classList.contains('btn-add')) return { btn, text: 'add' };
    if (btn.classList.contains('btn-edit')) return { btn, text: 'edit' };
    if (btn.classList.contains('btn-delete')) return { btn, text: 'delete' };
    if (btn.classList.contains('btn-save')) return { btn, text: 'save' };
    if (btn.classList.contains('btn-cancel')) return { btn, text: 'cancel' };
    if (btn.classList.contains('btn-back')) return { btn, text: 'back' };
    const text = (btn.textContent || '').trim().toLowerCase();
    return { btn, text };
  };

  function clearGridInputs() {
    qs("#FromYear") && (qs("#FromYear").value = "");
    qs("#ToYear") && (qs("#ToYear").value = "");
    qs("#Rate") && (qs("#Rate").value = "");
  }

  function bindActions() {
    // Grid actions
    const newBtn = qs('[data-grid-action="new"]');
    const alterBtn = qs('[data-grid-action="alter"]');
    const removeBtn = qs('[data-grid-action="remove"]');
    const updateBtn = qs('[data-grid-action="update"]');
    const clearBtn = qs('[data-grid-action="clear"]');

    newBtn?.addEventListener("click", () => {
      state.gridMode = GRID_MODES.ADD;
      clearGridInputs();
      updateGridInputsState();
      updateGridButtons();
      setToast("Entering grid ADD mode", "info");
    });

    alterBtn?.addEventListener("click", () => {
      if (state.selectedRowIndex < 0) return;
      state.gridMode = GRID_MODES.EDIT;
      populateInputsFromRow(state.details[state.selectedRowIndex]);
      updateGridInputsState();
      updateGridButtons();
      setToast("Entering grid EDIT mode", "info");
    });

    removeBtn?.addEventListener("click", () => {
      if (state.selectedRowIndex < 0) return;
      if (!confirm("Remove this detail record from the grid?")) return;

      state.details.splice(state.selectedRowIndex, 1);
      state.selectedRowIndex = -1;
      populateRateDetailsGrid(state.details);
      updateGridButtons();
      setToast("Record removed from grid", "success");
    });

    updateBtn?.addEventListener("click", () => {
      const fromYear = qs("#FromYear")?.value;
      const toYear = qs("#ToYear")?.value;
      const rate = qs("#Rate")?.value;

      if (!fromYear || !toYear || rate === "") {
        setToast("Please fill all grid fields.", "warning");
        return;
      }

      const newRow = {
        FromYear: fromYear,
        ToYear: toYear,
        DepreciationRate: rate
      };

      if (state.gridMode === GRID_MODES.ADD) {
        state.details.push(newRow);
      } else if (state.gridMode === GRID_MODES.EDIT) {
        state.details[state.selectedRowIndex] = newRow;
      }

      state.gridMode = GRID_MODES.VIEW;
      state.selectedRowIndex = -1;
      populateRateDetailsGrid(state.details);
      clearGridInputs();
      updateGridInputsState();
      updateGridButtons();
      setToast("Grid updated", "success");
    });

    clearBtn?.addEventListener("click", () => {
      state.gridMode = GRID_MODES.VIEW;
      clearGridInputs();
      updateGridInputsState();
      updateGridButtons();
      setToast("Grid entry cancelled", "info");
    });
  }

  // === Main action handlers (module scope) ===
  async function handleSave() {
    if (state.mode === MODES.VIEW) return;

    const effectiveDate = qs("#EffectiveDate")?.value;
    if (!effectiveDate) {
      setToast("Effective Date is required.", "warning");
      return;
    }

    if (state.details.length === 0) {
      setToast("At least one detail row is required.", "warning");
      return;
    }

    setToast("Saving details...", "info");

    const service = await loadFixedAssetsService();
    const operatorId = getOperatorId();
    const now = new Date().toISOString();

    const requestData = {
      BankID: window.Environment?.defaultBankId || '00',
      DepreciationRateID: state.rateId,
      EffectiveDate: effectiveDate,
      Details: state.details.map((d, idx) => ({
        ...d,
        SlabSlNo: idx + 1
      })),
      CreatedBy: operatorId,
      CreatedOn: now,
      SupervisedBy: operatorId,
      NewRecord: state.mode === MODES.ADD ? 1 : 0
    };

    try {
      const resp = await service.addEditFADepRateDetails(requestData);
      if (resp && resp.success) {
        setToast("Depreciation Rate Details saved successfully.", "success");
        setMode(MODES.VIEW);
        loadAndPopulateRateDetails();
      } else {
        setToast(resp?.message || "Failed to save details.", "danger");
      }
    } catch (err) {
      console.error("Save error:", err);
      setToast("Error saving details.", "danger");
    }
  }

  function handleCancel() {
    state.details = [];
    state.selectedRowIndex = -1;
    state.gridMode = GRID_MODES.VIEW;

    qs("#EffectiveDate") && (qs("#EffectiveDate").value = "");
    clearGridInputs();

    populateRateDetailsGrid([]);
    setToast("Screen cleared", "success");
    setMode(MODES.VIEW);
  }


  async function handleDelete() {
    const effectiveDate = qs("#EffectiveDate")?.value;
    if (!effectiveDate) {
      setToast("Please select a record by Effective Date to delete.", "warning");
      return;
    }

    if (!confirm(`Delete all details for Effective Date: ${effectiveDate}?`)) return;

    const service = await loadFixedAssetsService();
    const requestData = {
      BankID: window.Environment?.defaultBankId || '00',
      DepreciationRateID: state.rateId,
      EffectiveDate: effectiveDate
    };

    try {
      const resp = await service.deleteFADepRateDetails(requestData);
      if (resp && resp.success) {
        setToast("Record deleted successfully.", "success");
        handleCancel();
      } else {
        setToast(resp?.message || "Failed to delete record.", "danger");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setToast("Error deleting record.", "danger");
    }
  }

  function goTo(target) {
    if (target === "data-entry") {
      // Go back to parent via postMessage (for iframe) or history (for direct navigation)
      if (window.parent && window.parent !== window) {
        window.parent.postMessage('closeChildOverlay', '*');
      } else {
        window.history.back();
      }
    }
  }

  function bindLeftNav() {
    // No sidebar in this submodule
  }

  function populateInputsFromRow(row) {
    qs("#FromYear") && (qs("#FromYear").value = row.FromYear || "");
    qs("#ToYear") && (qs("#ToYear").value = row.ToYear || "");
    qs("#Rate") && (qs("#Rate").value = row.DepreciationRate || "");
  }

  async function loadFixedAssetsService() {
    if (window.FixedAssetsService) return window.FixedAssetsService;
    if (window.ServiceLoader?.loadFixedAssetsService) {
      await window.ServiceLoader.loadFixedAssetsService();
      return window.FixedAssetsService;
    }
    return null;
  }

  function getOperatorId() {
    try {
      const session = window.AuthService?.getSession?.();
      return session?.operatorId || session?.operatorID || 'CSADM';
    } catch {
      return 'CSADM';
    }
  }

  async function loadAndPopulateRateDetails() {
    const rateId = sessionStorage.getItem("kairo_fa_selected_rate_id");
    state.rateId = rateId || "";
    if (!rateId) {
      setToast("No rate ID selected in session.", "warning");
      return;
    }

    const effectiveDate = qs("#EffectiveDate")?.value || "";
    setToast(`Loading details for ${rateId}...`, 'info');

    const service = await loadFixedAssetsService();
    if (!service) {
      setToast("Service not available.", "danger");
      return;
    }

    const requestData = {
      BankID: window.Environment?.defaultBankId || '00',
      OurBranchID: window.Environment?.defaultOurBranchId || '0101',
      DepreciationRateID: rateId,
      EffectiveDate: effectiveDate || undefined,
      OperatorID: getOperatorId()
    };

    try {
      const resp = await service.getFADepRateDetails(requestData);
      if (resp && resp.success) {
        const details = resp.data && Array.isArray(resp.data.Details01) ? resp.data.Details01 : [];
        state.details = details;

        if (details.length > 0) {
          populateRateDetailsGrid(details);
          bindRateDetailsToForm(details[0]);
          state.hasLoadedRecord = true;
          setToast("Details loaded.", "success");
        } else {
          state.hasLoadedRecord = false;
          setToast("Record doesn't exist", "warning");
          populateRateDetailsGrid([]);
        }
      } else {
        state.hasLoadedRecord = false;
        setToast(resp?.message || "Failed to load details.", "danger");
      }
    } catch (err) {
      console.error("[FixedAssets] Details error", err);
      state.hasLoadedRecord = false;
      setToast("Error loading details.", "danger");
    } finally {
      setMode(MODES.VIEW);
    }
  }

  function bindRateDetailsToForm(data) {
    if (!data) return;
    const map = {
      EffectiveDate: 'EffectiveDate',
      CreatedBy: 'CreatedBy',
      CreatedOn: 'CreatedOn',
      SupervisedBy: 'SupervisedBy',
      SupervisedOn: 'SupervisedOn'
    };

    Object.keys(map).forEach(apiKey => {
      const el = qs(`#${map[apiKey]}`);
      if (!el) return;
      let val = data[apiKey];
      if (typeof val === 'string' && val.includes('T')) val = val.split('T')[0];
      el.value = val == null ? '' : val;
    });
  }

  function populateRateDetailsGrid(records) {
    const tbody = qs("#ratesGridBody");
    if (!tbody) return;

    if (!records || records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-muted py-2 text-center">No records to display.</td></tr>';
      updateRecordCount();
      return;
    }

    tbody.innerHTML = records.map((rec, idx) => `
      <tr data-idx="${idx}" class="${state.selectedRowIndex === idx ? 'table-active' : ''}" style="cursor:pointer">
        <td>${rec.FromYear == null ? '' : rec.FromYear}</td>
        <td>${rec.ToYear == null ? '' : rec.ToYear}</td>
        <td>${rec.DepreciationRate == null ? '' : rec.DepreciationRate}</td>
      </tr>
    `).join('');

    qsa("tr[data-idx]", tbody).forEach(tr => {
      tr.addEventListener("click", () => {
        state.selectedRowIndex = parseInt(tr.getAttribute("data-idx"));
        populateRateDetailsGrid(state.details);
        updateGridButtons();
      });
    });

    updateRecordCount();
  }

  window.addEventListener("load", () => {
    console.log('[RateDetails] Initializing...');
    
    bindLeftNav();
    bindActions();
    setMode(MODES.VIEW);
    
    // Auto-load rate details data from parent page's Rate ID (like product-gl-interface)
    if (window.parent && window.parent !== window) {
      loadAndPopulateRateDetails();
    } else {
      // Direct navigation - still try to load if rate ID in session
      loadAndPopulateRateDetails();
    }

    // Centralized Click Handler
    document.addEventListener('click', async (e) => {
      const action = isActionButton(e.target);
      if (!action) {
        if (e.target.closest('button[aria-label="Search Effective Date"]')) {
          e.preventDefault();
          loadAndPopulateRateDetails();
        }
        return;
      }
      if (action.btn.disabled) return;
      e.preventDefault();

      if (action.text === 'view') {
        loadAndPopulateRateDetails();
        return;
      }
      if (action.text === 'add') {
        state.details = [];
        state.hasLoadedRecord = false;
        populateRateDetailsGrid([]);
        clearGridInputs();
        setMode(MODES.ADD);
        setToast("Add mode active", "info");
        return;
      }
      if (action.text === 'edit' || action.text === 'update') {
        if (!state.hasLoadedRecord) {
          setToast("Please view a record first.", "warning");
          return;
        }
        setMode(MODES.UPDATE);
        setToast("Edit mode active", "info");
        return;
      }
      if (action.text === 'save') {
        handleSave();
        return;
      }
      if (action.text === 'cancel') {
        handleCancel();
        return;
      }
      if (action.text === 'delete') {
        if (!state.hasLoadedRecord) {
          setToast("Please view a record first.", "warning");
          return;
        }
        handleDelete();
        return;
      }
      if (action.text === 'back') {
        goTo("data-entry");
        return;
      }
    });

    console.log('[RateDetails] Ready');
  });
})();
