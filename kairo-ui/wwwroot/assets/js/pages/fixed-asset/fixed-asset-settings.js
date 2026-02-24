(() => {
  if (window.__kairoFixedAssetSettingsLoaded) return;
  window.__kairoFixedAssetSettingsLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  const state = {
    mode: MODES.VIEW,
  };

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }
  function setToast(message, variant = "info") {
    const toast = qs("#fsToast");
    if (!toast) {
      console.log(`[FixedAssetSettings] Toast (${variant}): ${message}`);
      return;
    }
    toast.textContent = message;
    toast.className = `fa-alert show ${variant}`;
    window.setTimeout(() => toast.classList.remove("show"), 5000);
  }

  function setMode(nextMode) {
    state.mode = nextMode;

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#fa-settings-form");
    if (!form) return;

    const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        return;
      }
      el.disabled = !isEditable;
    });

    // Action buttons
    const viewBtn = qs('.btn-view');
    const addBtn = qs('.btn-add');
    const editBtn = qs('.btn-edit');
    const deleteBtn = qs('.btn-delete');
    const saveBtn = qs('.btn-save');
    const cancelBtn = qs('.btn-cancel');

    setButtonDisabled(viewBtn, false);
    setButtonDisabled(addBtn, nextMode === MODES.VIEW);
    setButtonDisabled(editBtn, nextMode === MODES.VIEW);
    setButtonDisabled(deleteBtn, nextMode === MODES.VIEW);
    setButtonDisabled(saveBtn, !isEditable);
    setButtonDisabled(cancelBtn, false);
  }

  function setButtonDisabled(btn, disabled) {
    if (btn) btn.disabled = Boolean(disabled);
  }

  const isActionButton = (target) => {
    const btn = target?.closest('.cm-shell__action');
    if (!btn) return null;
    if (btn.classList.contains('btn-view')) return { btn, text: 'view' };
    if (btn.classList.contains('btn-add')) return { btn, text: 'add' };
    if (btn.classList.contains('btn-edit')) return { btn, text: 'edit' };
    if (btn.classList.contains('btn-delete')) return { btn, text: 'delete' };
    if (btn.classList.contains('btn-save')) return { btn, text: 'save' };
    if (btn.classList.contains('btn-cancel')) return { btn, text: 'cancel' };
    const text = (btn.textContent || '').trim().toLowerCase();
    return { btn, text };
  };

  function clearForm() {
    const form = qs("#fa-settings-form");
    if (form) {
      form.reset();
      qsa("select", form).forEach(s => { s.selectedIndex = -1; });
      qsa("input[type='checkbox']", form).forEach(cb => { cb.checked = false; });
    }
  }

  async function loadAndPopulateSettings() {
    setToast('Loading Fixed Asset Settings...', 'info');

    // Load service if needed
    if (!window.FixedAssetsService) {
      if (window.ServiceLoader?.loadFixedAssetsService) {
        await window.ServiceLoader.loadFixedAssetsService();
      } else {
        setToast("FixedAssetsService not available.", "danger");
        return;
      }
    }

    const BankID = window.Environment?.defaultBankId || '00';
    const OurBranchID = window.Environment?.defaultOurBranchId || '0101';
    const OperatorID = getOperatorId();

    try {
      const resp = await window.FixedAssetsService.getFASettings({ BankID, OurBranchID, OperatorID });
      if (resp && resp.success && resp.data) {
        let d = null;
        const data = resp.data;
        if (Array.isArray(data.Details01) && data.Details01.length > 0) {
          d = data.Details01[0];
        } else if (Array.isArray(data.Details) && data.Details.length > 0) {
          d = data.Details[0];
        } else if (Array.isArray(resp.Details) && resp.Details.length > 0) {
          d = resp.Details[0];
        } else if (typeof data === 'object' && !Array.isArray(data)) {
          d = data;
        }

        if (d) {
          bindFixedAssetSettingsToForm(d);
          setToast("Settings loaded.", "success");
        } else {
          setToast("No settings found.", "warning");
        }
      } else {
        setToast(resp?.message || "Failed to load settings.", "danger");
      }
    } catch (err) {
      console.error("[FixedAssets] View error", err);
      setToast("Error loading settings.", "danger");
    } finally {
      setMode(MODES.VIEW);
    }
  }

  function getOperatorId() {
    try {
      const session = window.AuthService?.getSession?.();
      return session?.operatorId || session?.operatorID || 'CSADM';
    } catch {
      return 'CSADM';
    }
  }

  function formatDateTime(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  } async function handleSave() {
    if (state.mode === MODES.VIEW) {
      setToast("Switch to Add/Edit before saving.", "warning");
      return;
    }

    setToast("Saving...", "info");

    if (!window.FixedAssetsService) {
      await window.ServiceLoader?.loadFixedAssetsService?.();
    }

    const operatorId = getOperatorId();
    const now = formatDateTime();
    const bankId = window.Environment?.defaultBankId || '00';

    const requestData = {
      BankID: bankId,
      AutoAssetID: qs('#AutoAssetId')?.checked ? 1 : 0,
      AssetIDLength: qs('#AssetIdLength')?.value || 0,
      YearStartMonth: qs('#FinancialYearStart')?.value || '',
      DepreciationPeriodID: qs('#DepreciationPeriod')?.value || '',
      EligibilityPeriod: qs('#EligibilityPeriod')?.value || 0,
      CutOffDay: qs('#CutoffDate')?.value || '',
      CreatedBy: state.mode === MODES.ADD ? operatorId : (qs('#CreatedBy')?.value || operatorId),
      CreatedOn: state.mode === MODES.ADD ? now : (qs('#CreatedOn')?.value || now),
      ModifiedBy: operatorId,
      ModifiedOn: now,
      SupervisedBy: qs('#SupervisedBy')?.value || operatorId,
      NewRecord: state.mode === MODES.ADD ? 1 : 0, // Concurrency skip for settings usually
    };

    try {
      const resp = await window.FixedAssetsService.addEditFASettings(requestData);
      if (resp && resp.success) {
        setToast("Fixed Asset Settings saved successfully.", "success");
        setMode(MODES.VIEW);
        loadAndPopulateSettings();
      } else {
        setToast(resp?.message || "Failed to save settings.", "danger");
      }
    } catch (err) {
      console.error("Save error:", err);
      setToast("An error occurred while saving.", "danger");
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to reset/delete these settings?")) return;

    setToast("Deleting...", "info");

    const bankId = window.Environment?.defaultBankId || '00';
    const requestData = { BankID: bankId };

    try {
      const resp = await window.FixedAssetsService.deleteFASettings(requestData);
      if (resp && resp.success) {
        setToast("Settings deleted successfully.", "success");
        clearForm();
        setMode(MODES.VIEW);
      } else {
        setToast(resp?.message || "Failed to delete settings.", "danger");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setToast("An error occurred while deleting.", "danger");
    }
  }

  // Helper: bind fixed asset settings response to form fields
  function bindFixedAssetSettingsToForm(data) {
    if (!data || typeof data !== 'object') return;

    const map = {
      AutoAssetID: 'AutoAssetId',
      AssetIDLength: 'AssetIdLength',
      YearStartMonth: 'FinancialYearStart',
      DepreciationPeriodID: 'DepreciationPeriod',
      EligibilityPeriod: 'EligibilityPeriod',
      CutOffDay: 'CutoffDate',
      CreatedBy: 'CreatedBy',
      CreatedOn: 'CreatedOn',
      ModifiedBy: 'ModifiedBy',
      ModifiedOn: 'ModifiedOn',
      SupervisedBy: 'SupervisedBy',
      SupervisedOn: 'SupervisedOn',
    };

    Object.keys(map).forEach(function (apiKey) {
      const fieldId = map[apiKey];
      const el = qs(`#${fieldId}`);
      if (!el) return;

      let val = data[apiKey];

      if (el.type === 'checkbox') {
        el.checked = Boolean(val === true || val === 1 || val === "1" || val === "Y");
      } else if (el.tagName === "SELECT") {
        if (val != null) {
          el.value = val;
          if (el.selectedIndex === -1 || el.value !== String(val)) {
            const options = Array.from(el.options);
            const match = options.find(opt => opt.text.trim().toLowerCase() === String(val).trim().toLowerCase());
            if (match) el.value = match.value;
          }
        }
      } else {
        if (typeof val === 'string' && val.includes('T')) {
          val = val.split('T')[0];
        }
        el.value = val == null ? '' : val;
      }
    });
  }

  window.addEventListener("load", () => {
    setMode(MODES.VIEW);
    loadAndPopulateSettings();

    // Centralized Click Handler
    document.addEventListener('click', async (e) => {
      const action = isActionButton(e.target);
      if (!action) return;
      if (action.btn.disabled) return;
      e.preventDefault();

      if (action.text === 'view') {
        loadAndPopulateSettings();
        setMode(MODES.VIEW);
        return;
      }
      if (action.text === 'add') {
        clearForm();
        setMode(MODES.ADD);
        setToast("Add mode active", "info");
        return;
      }
      if (action.text === 'edit') {
        setMode(MODES.UPDATE);
        setToast("Edit mode active", "info");
        return;
      }
      if (action.text === 'save') {
        handleSave();
        return;
      }
      if (action.text === 'cancel') {
        clearForm();
        setToast("Screen cleared", "success");
        setMode(MODES.VIEW);
        return;
      }
      if (action.text === 'delete') {
        handleDelete();
        return;
      }
    });
  });
})();
