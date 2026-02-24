// Group Insurance Type Form JavaScript

document.addEventListener('DOMContentLoaded', function () {
  // Main window buttons
  const buttons = Array.from(document.querySelectorAll('.window > .main-container .btn-action'));
  const [viewBtn, addBtn, editBtn, deleteBtn, saveBtn, cancelBtn] = buttons;

  /* Group Insurance Type - Client Maintenance shell behaviors */

  (function () {
    const byId = (id) => document.getElementById(id);
    const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    // Main actions
    const viewBtn = byId('viewBtn');
    const addBtn = byId('addBtn');
    const editBtn = byId('editBtn');
    const deleteBtn = byId('deleteBtn');
    const saveBtn = byId('saveBtn');
    const cancelBtn = byId('cancelBtn');

    const mainForm = byId('group-insurance-type-form');
    const mainFields = mainForm
      ? qsa('input, select, textarea', mainForm)
      : [];

    const auditFieldIds = new Set([
      'createdBy',
      'modifiedBy',
      'supervisedBy',
      'createdOn',
      'modifiedOn',
      'supervisedOn',
    ]);

    const setReadOnly = (readOnly) => {
      mainFields.forEach((el) => {
        if (!el.id) return;
        if (auditFieldIds.has(el.id)) {
          el.readOnly = true;
          el.disabled = false;
          return;
        }

        if (el.type === 'checkbox') {
          el.disabled = readOnly;
          return;
        }

        if (el.tagName === 'SELECT') {
          el.disabled = readOnly;
          return;
        }

        el.readOnly = readOnly;
      });
    };

    const setActiveModeButton = (active) => {
      [viewBtn, addBtn, editBtn].forEach((btn) => {
        if (!btn) return;
        btn.classList.toggle('is-active', btn === active);
      });
    };

    const setMode = (mode) => {
      // mode: view | add | edit
      if (mode === 'view') {
        setReadOnly(true);
        setActiveModeButton(viewBtn);
        return;
      }

      setReadOnly(false);
      setActiveModeButton(mode === 'add' ? addBtn : editBtn);
    };

    // Initial state: Insurance Details visible, read-only
    setMode('view');

    viewBtn?.addEventListener('click', () => setMode('view'));
    addBtn?.addEventListener('click', () => setMode('add'));
    editBtn?.addEventListener('click', () => setMode('edit'));

    deleteBtn?.addEventListener('click', () => {
      alert('Delete action (demo)');
    });

    saveBtn?.addEventListener('click', () => {
      alert('Save action (demo)');
      setMode('view');
    });

    cancelBtn?.addEventListener('click', () => {
      alert('Cancel action (demo)');
      setMode('view');
    });

    // Lookup buttons (demo)
    qsa('[data-lookup]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-lookup');
        alert(`Lookup (${key}) - demo`);
      });
    });

    // Sidebar / Claim Type behavior
    const dataEntryBtn = byId('dataEntryBtn');
    const openClaimTypeBtn = byId('openClaimTypeBtn');
    const claimTypeOverlay = byId('claimTypeOverlay');
    const closeClaimTypeBtn = byId('closeClaimTypeBtn');
    const ctBackBtn = byId('ctBackBtn');

    let claimTypeUnlocked = false;

    const unlockClaimType = () => {
      claimTypeUnlocked = true;
      if (openClaimTypeBtn) openClaimTypeBtn.hidden = false;
    };

    // Clicking DataEntry should only reveal Claim Type (do NOT open popup)
    dataEntryBtn?.addEventListener('click', () => {
      unlockClaimType();
    });

    const openClaimType = () => {
      if (!claimTypeUnlocked) return;
      if (!claimTypeOverlay) return;
      claimTypeOverlay.hidden = false;
    };

    const closeClaimType = () => {
      if (!claimTypeOverlay) return;
      claimTypeOverlay.hidden = true;
    };

    openClaimTypeBtn?.addEventListener('click', openClaimType);
    closeClaimTypeBtn?.addEventListener('click', closeClaimType);
    ctBackBtn?.addEventListener('click', closeClaimType);

    // Window control buttons (min/max) are present for UI parity only.
    qsa('[data-ct-window]').forEach((btn) => {
      btn.addEventListener('click', () => {
        // No-op by design (screenshot parity; avoid introducing new behaviors)
      });
    });

    // Close overlay when clicking backdrop
    claimTypeOverlay?.addEventListener('click', (e) => {
      if (e.target === claimTypeOverlay) closeClaimType();
    });

    // Claim Type actions
    const ctActionButtons = qsa('[data-ct-action]');
    const ctFieldIds = new Set(['insuranceClaimType', 'fixedAmount', 'remarks']);
    const ctAuditIds = new Set([
      'ctCreatedBy',
      'ctModifiedBy',
      'ctSupervisedBy',
      'ctCreatedOn',
      'ctModifiedOn',
      'ctSupervisedOn',
    ]);

    const setCtReadOnly = (readOnly) => {
      ctFieldIds.forEach((id) => {
        const el = byId(id);
        if (!el) return;
        if (el.tagName === 'SELECT') {
          el.disabled = readOnly;
        } else {
          el.readOnly = readOnly;
        }
      });

      ctAuditIds.forEach((id) => {
        const el = byId(id);
        if (!el) return;
        el.readOnly = true;
      });
    };

    const setCtMode = (mode) => {
      // mode: view | add | edit
      setCtReadOnly(mode === 'view');
    };

    setCtMode('view');

    ctActionButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-ct-action');
        if (!action) return;

        if (['view', 'add', 'edit'].includes(action)) {
          setCtMode(action);
          return;
        }

        if (action === 'delete') {
          alert('Delete Claim Type (demo)');
          return;
        }
        if (action === 'save') {
          alert('Save Claim Type (demo)');
          setCtMode('view');
          return;
        }
        if (action === 'cancel') {
          alert('Cancel Claim Type (demo)');
          setCtMode('view');
          return;
        }
      });
    });
  })();
  editBtn?.addEventListener('click', function () {
    if (!fields.insuranceTypeId.value.trim()) {
      alert('Please select a record to edit');
      return;
    }
    setReadOnlyMode(false);
    setUnderline(editBtn);
    fields.description.focus();
  });

  deleteBtn?.addEventListener('click', function () {
    if (!fields.insuranceTypeId.value.trim()) {
      alert('Please select a record to delete');
      return;
    }
    if (confirm('Are you sure you want to delete this insurance type?')) {
      clearForm();
      setReadOnlyMode(true);
      setUnderline(viewBtn);
    }
  });

  saveBtn?.addEventListener('click', function () {
    if (!fields.insuranceTypeId.value.trim()) {
      alert('Insurance Type ID is required');
      fields.insuranceTypeId.focus();
      return;
    }
    if (!fields.description.value.trim()) {
      alert('Description is required');
      fields.description.focus();
      return;
    }

    const now = getCurrentDateTime();
    const createdBy = auditFields.createdBy.value || 'ADMIN';
    const createdOn = auditFields.createdOn.value || now;

    currentRecord = {
      insuranceTypeId: fields.insuranceTypeId.value,
      description: fields.description.value,
      insuranceCategory: fields.insuranceCategory.value,
      insuranceCompanyId: fields.insuranceCompanyId.value,
      validFrom: fields.validFrom.value,
      validTo: fields.validTo.value,
      insuranceBenefit: fields.insuranceBenefit.value,
      insuredAmount: fields.insuredAmount.value,
      earlyRenewalDays: fields.earlyRenewalDays.value,
      insuredPeriod: fields.insuredPeriod.value,
      premiumFrequency: fields.premiumFrequency.value,
      premium: fields.premium.value,
      premiumInInstallments: fields.premiumInInstallments.checked,
      installmentFrequency: fields.installmentFrequency.value,
      noOfInstallments: fields.noOfInstallments.value,
      premiumId: fields.premiumId.value,
      insuranceClassId: fields.insuranceClassId.value,
      createdBy,
      createdOn,
      modifiedBy: 'ADMIN',
      modifiedOn: now,
      supervisedBy: auditFields.supervisedBy.value,
      supervisedOn: auditFields.supervisedOn.value
    };

    auditFields.createdBy.value = createdBy;
    auditFields.createdOn.value = createdOn;
    auditFields.modifiedBy.value = 'ADMIN';
    auditFields.modifiedOn.value = now;

    setReadOnlyMode(true);
    setUnderline(viewBtn);
    alert('Record saved successfully');
  });

  cancelBtn?.addEventListener('click', function () {
    if (!isEditMode) return;
    if (currentRecord) {
      loadRecord(currentRecord);
    } else {
      clearForm();
    }
    setReadOnlyMode(true);
    setUnderline(viewBtn);
  });

  // Lookup buttons (placeholder)
  document.querySelectorAll('.btn-lookup').forEach((btn) => {
    btn.addEventListener('click', function () {
      alert('Lookup dialog would open here');
    });
  });

  // Claim Type behavior
  function setCtReadOnlyMode(readOnly) {
    claimTypeControls.forEach((el) => {
      if (!el) return;
      const tag = el.tagName.toLowerCase();
      if (tag === 'select') {
        el.disabled = readOnly;
      } else {
        el.readOnly = readOnly;
      }
    });
    ctIsEditMode = !readOnly;
  }

  function clearCtForm() {
    if (claimTypeFields.insuranceClaimType) claimTypeFields.insuranceClaimType.selectedIndex = 0;
    if (claimTypeFields.fixedAmount) claimTypeFields.fixedAmount.value = '';
    if (claimTypeFields.remarks) claimTypeFields.remarks.value = '';

    Object.values(claimTypeAuditFields).forEach((input) => {
      if (input) input.value = '';
    });

    ctCurrentRecord = null;
  }

  function loadCtRecord(record) {
    if (!record) return;
    claimTypeFields.insuranceClaimType.value = record.insuranceClaimType || claimTypeFields.insuranceClaimType.value;
    claimTypeFields.fixedAmount.value = record.fixedAmount || '';
    claimTypeFields.remarks.value = record.remarks || '';

    claimTypeAuditFields.createdBy.value = record.createdBy || '';
    claimTypeAuditFields.createdOn.value = record.createdOn || '';
    claimTypeAuditFields.modifiedBy.value = record.modifiedBy || '';
    claimTypeAuditFields.modifiedOn.value = record.modifiedOn || '';
    claimTypeAuditFields.supervisedBy.value = record.supervisedBy || '';
    claimTypeAuditFields.supervisedOn.value = record.supervisedOn || '';
  }

  function openClaimTypeWindow() {
    if (!claimTypeOverlay) return;
    claimTypeOverlay.hidden = false;
    setCtReadOnlyMode(true);
    clearCtForm();

    ctActionButtons.forEach((b) => b.classList.remove('underline'));
    const viewButton = ctActionButtons.find((b) => b.dataset.ctAction === 'view');
    viewButton?.classList.add('underline');
  }

  function closeClaimTypeWindow() {
    if (!claimTypeOverlay) return;
    claimTypeOverlay.hidden = true;
  }

  function ctSetUnderline(action) {
    ctActionButtons.forEach((b) => b.classList.remove('underline'));
    const target = ctActionButtons.find((b) => b.dataset.ctAction === action);
    target?.classList.add('underline');
  }

  openClaimTypeBtn?.addEventListener('click', openClaimTypeWindow);
  closeClaimTypeBtn?.addEventListener('click', closeClaimTypeWindow);
  ctBackBtn?.addEventListener('click', closeClaimTypeWindow);
  claimTypeOverlay?.addEventListener('click', function (event) {
    if (event.target === claimTypeOverlay) closeClaimTypeWindow();
  });

  // Only show the Claim Type option after DataEntry interaction
  const revealClaimTypeOption = () => {
    if (openClaimTypeBtn) openClaimTypeBtn.hidden = false;
  };
  dataEntrySelect?.addEventListener('click', revealClaimTypeOption);
  dataEntrySelect?.addEventListener('change', revealClaimTypeOption);

  ctActionButtons.forEach((btn) => {
    btn.addEventListener('click', function () {
      const action = btn.dataset.ctAction;
      if (!action) return;

      if (action === 'view') {
        setCtReadOnlyMode(true);
        ctSetUnderline('view');
        if (ctCurrentRecord) loadCtRecord(ctCurrentRecord);
        return;
      }

      if (action === 'add') {
        clearCtForm();
        setCtReadOnlyMode(false);
        ctSetUnderline('add');
        claimTypeFields.insuranceClaimType?.focus();
        return;
      }

      if (action === 'edit') {
        if (!ctCurrentRecord) {
          alert('Please select a record to edit');
          return;
        }
        setCtReadOnlyMode(false);
        ctSetUnderline('edit');
        claimTypeFields.fixedAmount?.focus();
        return;
      }

      if (action === 'delete') {
        if (!ctCurrentRecord) {
          alert('Please select a record to delete');
          return;
        }
        if (confirm('Are you sure you want to delete this claim type?')) {
          clearCtForm();
          setCtReadOnlyMode(true);
          ctSetUnderline('view');
        }
        return;
      }

      if (action === 'save') {
        const now = getCurrentDateTime();
        const createdBy = claimTypeAuditFields.createdBy.value || 'ADMIN';
        const createdOn = claimTypeAuditFields.createdOn.value || now;

        ctCurrentRecord = {
          insuranceClaimType: claimTypeFields.insuranceClaimType.value,
          fixedAmount: claimTypeFields.fixedAmount.value,
          remarks: claimTypeFields.remarks.value,
          createdBy,
          createdOn,
          modifiedBy: 'ADMIN',
          modifiedOn: now,
          supervisedBy: claimTypeAuditFields.supervisedBy.value,
          supervisedOn: claimTypeAuditFields.supervisedOn.value
        };

        claimTypeAuditFields.createdBy.value = createdBy;
        claimTypeAuditFields.createdOn.value = createdOn;
        claimTypeAuditFields.modifiedBy.value = 'ADMIN';
        claimTypeAuditFields.modifiedOn.value = now;

        setCtReadOnlyMode(true);
        ctSetUnderline('view');
        alert('Record saved successfully');
        return;
      }

      if (action === 'cancel') {
        if (!ctIsEditMode) return;
        if (ctCurrentRecord) {
          loadCtRecord(ctCurrentRecord);
        } else {
          clearCtForm();
        }
        setCtReadOnlyMode(true);
        ctSetUnderline('view');
      }
    });
  });

  closeBtn?.addEventListener('click', function () {
    if (confirm('Are you sure you want to close this window?')) {
      window.close();
    }
  });

  // Initialize
  if (windowTitle) windowTitle.textContent = 'Group Insurance Type';
  if (statusRight) statusRight.textContent = 'Group Insurance Type';
  setReadOnlyMode(true);
  setUnderline(viewBtn);
  clearForm();

  setCtReadOnlyMode(true);
  clearCtForm();
  if (openClaimTypeBtn) openClaimTypeBtn.hidden = true;
  if (claimTypeOverlay) claimTypeOverlay.hidden = true;
});
