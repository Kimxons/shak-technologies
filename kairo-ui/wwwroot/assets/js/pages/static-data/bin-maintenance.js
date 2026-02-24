(() => {
  if (window.__kairoBinMaintenanceLoaded) return;
  window.__kairoBinMaintenanceLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  const state = {
    mode: MODES.VIEW,
    isBusy: false,
    hasLoaded: false,
  };

  let inlineAlertAutoHideTimer = null;

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function initSectionToggles() {
    const headers = qsa('[data-section-toggle]');

    function setCollapsed(section, collapsed) {
      if (!section) return;
      const content = qs('[data-section-content]', section);
      if (!content) return;

      if (collapsed) content.setAttribute('hidden', '');
      else content.removeAttribute('hidden');

      const header = qs('[data-section-toggle]', section);
      const toggleBtn = header ? qs('.section-toggle-btn', header) : null;
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(!collapsed));

      const icon = toggleBtn ? qs('i.bi', toggleBtn) : null;
      if (icon) {
        icon.classList.toggle('bi-chevron-up', !collapsed);
        icon.classList.toggle('bi-chevron-down', collapsed);
      }
    }

    headers.forEach((header) => {
      if (header.dataset.kairoSectionToggleBound === '1') return;
      header.dataset.kairoSectionToggleBound = '1';

      const section = header.closest('.form-section');
      if (!section) return;

      const content = qs('[data-section-content]', section);
      setCollapsed(section, !!content?.hasAttribute('hidden'));

      const toggle = (e) => {
        e?.preventDefault?.();
        const isCollapsed = !!qs('[data-section-content]', section)?.hasAttribute('hidden');
        setCollapsed(section, !isCollapsed);
      };

      header.addEventListener('click', toggle);

      const toggleBtn = qs('.section-toggle-btn', header);
      if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggle(e);
        });
      }
    });
  }

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

  function showToast(message, { title = 'Message', variant = 'info', timeoutMs = 4500 } = {}) {
    const container = ensureToastContainer();

    const toast = document.createElement('div');
    toast.className = `kairo-toast${variant ? ` kairo-toast--${variant}` : ''}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-atomic', 'true');

    const header = document.createElement('div');
    header.className = 'kairo-toast__title';

    const titleEl = document.createElement('div');
    titleEl.textContent = title;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'kairo-toast__close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';

    const body = document.createElement('div');
    body.className = 'kairo-toast__body';
    body.textContent = String(message || '');

    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    toast.appendChild(header);
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

    closeBtn.addEventListener('click', remove);
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

    const inline = qs('[data-bin-maintenance-alert]');
    const inlineText = qs('[data-bin-maintenance-alert-text]', inline || undefined);
    const inlineClose = qs('[data-bin-maintenance-alert-close]', inline || undefined);

    const msg = String(message ?? '').trim();
    const normalized = String(variant || '').toLowerCase();

    const toastVariant =
      normalized === 'success'
        ? 'success'
        : normalized === 'warning'
          ? 'warning'
          : normalized === 'danger'
            ? 'danger'
            : 'info';

    const alertClass =
      toastVariant === 'success'
        ? 'alert-success'
        : toastVariant === 'warning'
          ? 'alert-warning'
          : toastVariant === 'info'
            ? 'alert-info'
            : 'alert-danger';

    if (inline && inlineText) {
      if (!msg) {
        if (inlineAlertAutoHideTimer) {
          clearTimeout(inlineAlertAutoHideTimer);
          inlineAlertAutoHideTimer = null;
        }
        inline.classList.add('d-none');
        inline.setAttribute('hidden', '');
        return;
      }

      inline.classList.remove('alert-success', 'alert-danger', 'alert-warning', 'alert-info');
      inline.classList.add(alertClass);
      inlineText.textContent = msg;
      inline.classList.remove('d-none');
      inline.removeAttribute('hidden');

      if (inlineAlertAutoHideTimer) {
        clearTimeout(inlineAlertAutoHideTimer);
        inlineAlertAutoHideTimer = null;
      }
      inlineAlertAutoHideTimer = setTimeout(() => {
        inline.classList.add('d-none');
        inline.setAttribute('hidden', '');
        inlineAlertAutoHideTimer = null;
      }, 6000);

      if (inlineClose && inlineClose.dataset.bound !== '1') {
        inlineClose.dataset.bound = '1';
        inlineClose.addEventListener('click', () => {
          if (inlineAlertAutoHideTimer) {
            clearTimeout(inlineAlertAutoHideTimer);
            inlineAlertAutoHideTimer = null;
          }
          inline.classList.add('d-none');
          inline.setAttribute('hidden', '');
        });
      }
      return;
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
      save: qs('[data-bm-action="save"]'),
      cancel: qs('[data-bm-action="cancel"]'),
    };
  }

  function updateActionButtons() {
    const { view, add, edit, save, cancel } = getActionButtons();
    const isEditable = state.mode === MODES.ADD || state.mode === MODES.UPDATE;
    const isViewMode = state.mode === MODES.VIEW;
    const recordFound = state.hasLoaded;
    const hasBinInput = !!(qs("#Bin")?.value || "").trim();

    // On load (no input): View ✓ only
    // VIEW (record found): View ✓, Edit ✓, Cancel ✓
    // VIEW (not found, has input): View ✓, Add ✓, Cancel ✓
    // ADD mode: Save ✓, Cancel ✓
    // UPDATE (Edit) mode: Save ✓, Cancel ✓

    // View: enabled only in VIEW mode
    setButtonDisabled(view, !isViewMode);

    // Add: enabled only in VIEW mode when NO record found AND has input
    setButtonDisabled(add, !(isViewMode && !recordFound && hasBinInput));

    // Edit: enabled only in VIEW mode when record IS found
    setButtonDisabled(edit, !(isViewMode && recordFound));

    // Save: enabled only in ADD or UPDATE mode
    setButtonDisabled(save, !isEditable);

    // Cancel: enabled when record found, in edit mode, or has input
    setButtonDisabled(cancel, !(recordFound || isEditable || hasBinInput));
  }

  function setMode(nextMode) {
    state.mode = nextMode;

    const form = qs("#bin-maintenance-form");
    if (!form) return;

    const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false; // Always enabled fields (search inputs usually)
        return;
      }
      if (el.hasAttribute("readonly") && el.hasAttribute("disabled")) {
        // Keep fields that are permanently disabled (audit fields)
        return;
      }
      // For read-only fields that are not permanently disabled (like names populated by search),
      // we generally keep them readonly but maybe not disabled? 
      // In officer maint, names are readonly.

      if (el.readOnly && !el.classList.contains("bs-input-text")) {
        // If native readonly and not our text input style, maybe skip?
        // Actually officer maint disables everything in View mode except always-enabled.
      }

      el.disabled = !isEditable;
    });

    // Handle specific audit fields that are always disabled
    qsa("[data-bm-audit]", form).forEach(el => {
      el.disabled = true;
    });

    // Ensure search buttons are enabled if editable, or if always enabled
    qsa(".btn-lookup", form).forEach((btn) => {
      if (btn.hasAttribute("data-always-enabled")) {
        btn.disabled = false;
      } else {
        btn.disabled = !isEditable;
      }
    });

    updateActionButtons();
  }

  function bindModeButtons() {
    qsa("[data-shell-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.getAttribute("data-shell-mode");
        if (!next || !MODES[next.toUpperCase()]) return;
        setMode(MODES[next.toUpperCase()]);
      });
    });
  }

  function bindActions() {
    const saveBtn = qs('[data-bm-action="save"]');
    const cancelBtn = qs('[data-bm-action="cancel"]');

    saveBtn?.addEventListener("click", async () => {
      if (state.mode === MODES.VIEW || state.isBusy) return;
      await saveBinRecord();
    });

    cancelBtn?.addEventListener("click", () => {
      if (state.mode !== MODES.VIEW) {
        // If cancelling edit/add, go back to view
        setMode(MODES.VIEW);
      } else {
        // If cancelling view (clear), clear form
        const form = qs("#bin-maintenance-form");
        if (form) form.reset();
        state.hasLoaded = false;
        state.mode = MODES.VIEW;
        updateActionButtons();
        setToast("Form cleared.", "info");
      }
    });
  }

  /**
   * Fetch bin record from API
   */
  async function fetchBinRecord(binId) {
    if (!binId || state.isBusy) return;

    state.isBusy = true;
    try {
      if (!window.StaticDataService?.getBreftBins) {
        throw new Error("StaticDataService.getBreftBins is not available");
      }

      const resp = await window.StaticDataService.getBreftBins({ BinID: binId });
      console.log("[BinMaint] Fetch response:", resp);

      // Extract record from response
      const record = resp?.data?.Details01?.[0] || resp?.data?.Details?.[0] || resp?.Details?.[0] || null;

      if (record) {
        populateForm(record);
        state.hasLoaded = true;
        setToast("Record loaded successfully.", "success");
      } else {
        state.hasLoaded = false;
        setToast("No record found for the specified Bin ID.", "warning");
      }
    } catch (err) {
      console.error("[BinMaint] Fetch error:", err);
      state.hasLoaded = false;
      setToast(err.message || "Failed to fetch record.", "danger");
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  /**
   * Populate form fields from record
   */
  function populateForm(record) {
    const fieldMap = {
      Bin: ["Bin", "BinID"],
      PayableGlId: ["PayableGLID", "PayableGlId", "PayableGlID"],
      PayableGlName: ["PayableGLName", "PayableGlName"],
      ReceivableGlId: ["ReceivableGLID", "ReceivableGlId", "ReceivableGlID"],
      ReceivableGlName: ["ReceivableGLName", "ReceivableGlName"],
      CreatedBy: ["CreatedBy", "OperatorID"],
      CreatedOn: ["CreatedOn", "DateCreated"],
    };

    Object.entries(fieldMap).forEach(([fieldId, possibleKeys]) => {
      const el = qs(`#${fieldId}`);
      if (!el) return;

      let value = null;
      for (const key of possibleKeys) {
        if (record[key] !== undefined && record[key] !== null) {
          value = record[key];
          break;
        }
      }

      if (value !== null) {
        el.value = String(value);
      }
    });
  }

  /**
   * Save bin record via API
   */
  async function saveBinRecord() {
    state.isBusy = true;
    try {
      if (!window.StaticDataService?.addEditBreftBins) {
        throw new Error("StaticDataService.addEditBreftBins is not available");
      }

      const session = window.AuthService?.getSession?.() || {};
      const branchId = session.branchID || session.BranchID || window.Environment?.BranchID || "1201";
      const operatorId = session.operatorID || session.OperatorID || window.Environment?.OperatorID || "SYSTEM";

      const payload = {
        OurBranchID: branchId,
        Bin: qs("#Bin")?.value || "",
        PayableGLID: qs("#PayableGlId")?.value || "",
        ReceivableGLID: qs("#ReceivableGlId")?.value || "",
        OperatorID: operatorId,
      };

      console.log("[BinMaint] Save payload:", payload);
      const resp = await window.StaticDataService.addEditBreftBins(payload);
      console.log("[BinMaint] Save response:", resp);

      // Check for error in response
      if (resp?.ReturnCode < 0 || resp?.data?.ReturnCode < 0) {
        throw new Error(resp?.ReturnMessage || resp?.data?.ReturnMessage || "Save failed");
      }

      setToast("Record saved successfully.", "success");
      state.hasLoaded = true;
      setMode(MODES.VIEW);
    } catch (err) {
      console.error("[BinMaint] Save error:", err);
      setToast(err.message || "Failed to save record.", "danger");
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  /**
   * Bind Payable GL Account search button
   */
  function bindPayableGlSearch() {
    const searchBtn = qs('[data-bm-action="search-payable-gl"]');
    if (!searchBtn) return;

    searchBtn.addEventListener('click', async () => {
      if (!window.GLAccountSearchService) {
        console.error('[BinMaint] GLAccountSearchService not available');
        setToast('GL Account Search Service is not available', 'danger');
        return;
      }

      await window.GLAccountSearchService.openSearchModal((accountId, accountName) => {
        const idField = qs('#PayableGlId');
        const nameField = qs('#PayableGlName');

        if (idField) idField.value = accountId || '';
        if (nameField) nameField.value = accountName || '';
      }, { accountTag: 'default' });
    });
  }

  /**
   * Bind Receivable GL Account search button
   */
  function bindReceivableGlSearch() {
    const searchBtn = qs('[data-bm-action="search-receivable-gl"]');
    if (!searchBtn) return;

    searchBtn.addEventListener('click', async () => {
      if (!window.GLAccountSearchService) {
        console.error('[BinMaint] GLAccountSearchService not available');
        setToast('GL Account Search Service is not available', 'danger');
        return;
      }

      await window.GLAccountSearchService.openSearchModal((accountId, accountName) => {
        const idField = qs('#ReceivableGlId');
        const nameField = qs('#ReceivableGlName');

        if (idField) idField.value = accountId || '';
        if (nameField) nameField.value = accountName || '';
      }, { accountTag: 'default' });
    });
  }

  window.addEventListener("load", () => {
    initSectionToggles();
    bindModeButtons();
    bindActions();
    bindPayableGlSearch();
    bindReceivableGlSearch();
    bindBinSearch();
    setMode(MODES.VIEW);

    const refreshBtn = qs('.title-btn.refresh');
    refreshBtn?.addEventListener('click', () => {
      window.location.reload();
    });
  });

  /**
   * Bind Bin search/fetch button
   */
  function bindBinSearch() {
    const binSearchBtn = qs('[data-bm-lookup="bin"]') || qs("#Bin")?.closest('.d-flex')?.querySelector('.btn-lookup');
    if (binSearchBtn) {
      binSearchBtn.addEventListener("click", async () => {
        const binId = qs("#Bin")?.value?.trim();
        if (binId) {
          await fetchBinRecord(binId);
        } else {
          setToast("Please enter a Bin ID to search.", "warning");
        }
      });
    }

    // Also allow Enter key on Bin field to trigger search
    const binInput = qs("#Bin");
    if (binInput) {
      binInput.addEventListener("keydown", async (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const binId = binInput.value?.trim();
          if (binId) {
            await fetchBinRecord(binId);
          }
        }
      });
    }
  }
})();

