document.addEventListener('DOMContentLoaded', () => {
  const openParentModal = (modalId, fallbackUrl) => {
    if (!modalId) return false;

    try {
      const parent = window.parent;
      const parentBootstrap = parent?.bootstrap;
      const modalEl = parent?.document?.getElementById(modalId);
      if (parentBootstrap?.Modal && modalEl) {
        parentBootstrap.Modal.getOrCreateInstance(modalEl, {
          backdrop: false,
          focus: false,
          keyboard: true
        }).show();
        return true;
      }
    } catch {
      // Ignore cross-frame errors.
    }

    if (fallbackUrl) {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      return true;
    }

    return false;
  };

  const els = {
    saveBtn: document.getElementById('saveBtn'),
    cancelBtn: document.getElementById('cancelBtn'),
    editBtn: document.getElementById('editBtn'),
    deleteBtn: document.getElementById('deleteBtn'),
    chargesBtn: document.getElementById('chargesBtn'),
    approveBtn: document.getElementById('approveBtn'),
    swiftBtn: document.getElementById('swiftBtn'),
    showImageBtn: document.getElementById('showImageBtn'),
    discrepancyLookup: document.getElementById('discrepancyLookup'),
    documentLookup: document.getElementById('documentLookup'),
    browseBtn: document.getElementById('browseBtn'),
    documentFile: document.getElementById('documentFile')
  };

  const setEditable = (enabled) => {
    document.querySelectorAll('[data-editable="true"]').forEach((el) => {
      el.disabled = !enabled;
    });

    if (els.saveBtn) els.saveBtn.disabled = !enabled;
    if (els.cancelBtn) els.cancelBtn.disabled = !enabled;

    // Match screenshot: Edit/Delete typically disabled until a record is selected.
    if (els.editBtn) els.editBtn.disabled = true;
    if (els.deleteBtn) els.deleteBtn.disabled = true;

    if (els.showImageBtn) els.showImageBtn.disabled = true;
    if (els.approveBtn) els.approveBtn.disabled = true;
    if (els.swiftBtn) els.swiftBtn.disabled = true;
  };

  const resetFields = () => {
    const ids = [
      'discrepancyId',
      'documentId',
      'documentImage',
      'status',
      'statusDate',
      'reportingDate',
      'remarks',
      'swiftMessage'
    ];

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'SELECT') {
        el.value = '';
        return;
      }
      if (el.tagName === 'TEXTAREA') {
        el.value = '';
        return;
      }
      el.value = '';
    });

    // restore default swift message
    const swift = document.getElementById('swiftMessage');
    if (swift && swift.tagName === 'SELECT') swift.value = 'MT734';
  };

  document.addEventListener('click', (event) => {
    const modeBtn = event.target.closest('[data-mode]');
    if (!modeBtn) return;

    const mode = (modeBtn.getAttribute('data-mode') || 'view').toLowerCase();
    if (mode === 'view') {
      setEditable(false);
      return;
    }

    if (mode === 'add') {
      setEditable(true);
    }
  });

  els.saveBtn?.addEventListener('click', () => {
    setEditable(false);
  });

  els.cancelBtn?.addEventListener('click', () => {
    resetFields();
    setEditable(false);
  });

  els.discrepancyLookup?.addEventListener('click', () => {
    alert('Discrepancy lookup is a placeholder in this prototype.');
  });

  els.documentLookup?.addEventListener('click', () => {
    alert('Document lookup is a placeholder in this prototype.');
  });

  els.chargesBtn?.addEventListener('click', () => {
    openParentModal('lcDiscrepancyChargesModal', 'lc-discrepancy-charges.html');
  });

  els.browseBtn?.addEventListener('click', () => {
    els.documentFile?.click();
  });

  els.documentFile?.addEventListener('change', () => {
    const file = els.documentFile?.files?.[0];
    const input = document.getElementById('documentImage');
    if (input && file) {
      input.value = file.name;
    }
  });

  setEditable(false);
});
