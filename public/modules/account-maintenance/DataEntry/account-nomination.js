(() => {
  'use strict';

  const windowEl = document.querySelector('.window');
  const form = document.querySelector('.form-card');
  if (!form) return;

  const messageHost = document.querySelector('.am-message-panel');

  const state = {
    mode: 'VIEW',
    context: {
      OurBranchID: '',
      AccountID: '',
      OperatorID: ''
    },
    searchModal: null
  };

  const postClose = () => {
    window.parent?.postMessage({ type: 'accountMaintenanceChildClose' }, '*');
  };

  // Title bar
  document.querySelectorAll('[data-action]').forEach((btn) => {
    const action = btn.getAttribute('data-action');
    if (action === 'refresh') {
      btn.addEventListener('click', () => window.location.reload());
    } else if (action === 'maximize') {
      btn.addEventListener('click', () => windowEl?.classList.toggle('maximized'));
    } else if (action === 'close') {
      btn.addEventListener('click', postClose);
    }
  });

  // Message helpers (shared with signatories style)
  const hideValidationSummary = () => {
    const summaries = document.querySelectorAll('.am-message-panel');
    summaries.forEach((s) => s.classList.remove('show'));
  };

  const showMessage = (msg, type = 'info') => {
    hideValidationSummary();
    if (!messageHost) return;
    
    messageHost.classList.remove('error', 'success', 'warning', 'info');
    messageHost.classList.add(type);
    
    const icon = messageHost.querySelector('i');
    if (icon) {
      icon.className = 'bi ' + (
        type === 'error' ? 'bi-exclamation-circle' :
        type === 'success' ? 'bi-check-circle' :
        'bi-info-circle'
      );
    }
    
    const span = messageHost.querySelector('span');
    if (span) span.textContent = msg;
    
    messageHost.classList.add('show');
    setTimeout(() => messageHost.classList.remove('show'), 4000);
  };

  // Context
  const pullContext = () => {
    const parent = window.parent;
    const parentState = parent?.AccountMaintenanceState;
    if (parentState) {
      state.context.OurBranchID = parentState.OurBranchID || '';
      state.context.AccountID = parentState.AccountID || '';
      state.context.OperatorID = parentState.OperatorID || '';
    }
    if (!state.context.OperatorID) {
      const session = parent?.AuthService?.getSession?.() || window.AuthService?.getSession?.();
      if (session) {
        state.context.OperatorID = session.operatorID || session.OperatorID || session.operatorId || '';
        state.context.OurBranchID = state.context.OurBranchID || session.branchID || session.BranchID || '';
      }
    }
    console.log('[Nomination] Context:', state.context);
  };

  // Inputs
  const getValue = (id) => (document.getElementById(id)?.value || '').trim();
  const getChecked = (id) => !!document.getElementById(id)?.checked;

  // Buttons
  const buttons = {
    view: document.querySelector('[data-action="view"]'),
    add: document.querySelector('[data-action="add"]'),
    edit: document.querySelector('[data-action="edit"]'),
    delete: document.querySelector('[data-action="delete"]'),
    save: document.querySelector('[data-action="save"]'),
    cancel: document.querySelector('[data-action="cancel"]'),
    close: document.querySelector('[data-action="close"]')
  };

  // Hide back button (not present) and disable edit/delete at load
  document.querySelector('[data-action="back"]')?.remove();

  const setMode = (mode) => {
    state.mode = mode;
    const isEditing = mode === 'ADD' || mode === 'EDIT';
    form.querySelectorAll('input, textarea, select').forEach((el) => {
      if (el.id === 'nomineeName') return; // stays readonly
      if (el.type === 'checkbox') {
        el.disabled = !isEditing;
      } else {
        el.disabled = !isEditing;
      }
    });

    // Action buttons: only View/Add active on load; Save/Cancel only in edit
    buttons.view && (buttons.view.disabled = isEditing);
    buttons.add && (buttons.add.disabled = isEditing);
    buttons.edit && (buttons.edit.disabled = true);
    buttons.delete && (buttons.delete.disabled = true);
    buttons.save && (buttons.save.disabled = !isEditing);
    buttons.cancel && (buttons.cancel.disabled = !isEditing);
  };

  const clearForm = () => {
    form.querySelectorAll('input[type="text"], input[type="number"]').forEach((el) => (el.value = ''));
    document.getElementById('isDependent')?.removeAttribute('checked');
    document.getElementById('isNominationRollover')?.removeAttribute('checked');
  };

  // Validation
  const validate = () => {
    const nomineeId = getValue('nomineeId');
    const percentage = getValue('nominationPercentage');
    if (!nomineeId) return { ok: false, message: 'Nominee ID is required.' };
    if (!percentage) return { ok: false, message: 'Nomination Percentage is required.' };
    const pctNum = Number(percentage);
    if (Number.isNaN(pctNum) || pctNum <= 0 || pctNum > 100) {
      return { ok: false, message: 'Nomination Percentage must be between 0 and 100.' };
    }
    return { ok: true };
  };

  // Search modal
  const initSearchModal = () => {
    if (!window.SearchModal || !window.SearchService) return;
    state.searchModal = new window.SearchModal(window.SearchService);
  };

  const openSearch = () => {
    if (!state.searchModal) return;
    // When on load (VIEW mode): use AccountNomineeID
    // When user clicks Add (ADD mode): use ClientSignatoryID for searching nominee
    const searchId = state.mode === 'ADD' ? 'ClientSignatoryID' : 'AccountNomineeID';
    console.log(`[Nomination] Opening search with searchId: ${searchId}, mode: ${state.mode}`);
    
    state.searchModal.open({
      searchId,
      onSelect: (record) => {
        // Handle both nominee and signatory records
        const nomineeId = record.AccountNomineeID || record.ClientID || record.SignatoryID || record.NomineeID || '';
        const nomineeName = record.ClientName || record.SignatoryName || record.Name || record.AccountNomineeName || '';
        console.log(`[Nomination] Search selected: nomineeId=${nomineeId}, nomineeName=${nomineeName}`);
        
        const idInput = document.getElementById('nomineeId');
        const nameInput = document.getElementById('nomineeName');
        if (idInput) idInput.value = nomineeId;
        if (nameInput) nameInput.value = nomineeName;
      }
    });
  };

  // Wire lookup button
  document.querySelectorAll('.btn-lookup').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openSearch();
    });
  });

  // Save handler
  const handleSave = async () => {
    const validation = validate();
    if (!validation.ok) {
      showMessage(validation.message, 'error');
      return;
    }

    const payload = {
      OurBranchID: state.context.OurBranchID,
      AccountID: state.context.AccountID,
      NomineeClientID: getValue('nomineeId'),
      IsDependent: getChecked('isDependent'),
      NominationPercentage: getValue('nominationPercentage'),
      IsNominationRollover: getChecked('isNominationRollover'),
      Remarks: getValue('remarks'),
      CreatedBy: state.context.OperatorID,
      CreatedOn: null,
      ModifiedBy: state.context.OperatorID,
      ModifiedOn: null,
      SupervisedBy: state.context.OperatorID,
      NewRecord: state.mode === 'ADD' ? 1 : 0
    };

    if (!payload.OurBranchID || !payload.AccountID) {
      showMessage('Branch and Account are required from parent form.', 'error');
      return;
    }

    try {
      const svc = window.accountservice || window.parent?.accountservice;
      if (!svc?.addEditAccountNominee) {
        throw new Error('accountservice.addEditAccountNominee not available');
      }

      const result = await svc.addEditAccountNominee(payload);
      if (result?.success === false) {
        showMessage(result.message || 'Failed to save nomination.', 'error');
        return;
      }
      showMessage('Nomination saved successfully.', 'success');
      setMode('VIEW');
    } catch (err) {
      console.error('[Nomination] Save error:', err);
      showMessage(err?.message || 'Failed to save nomination.', 'error');
    }
  };

  // Button wiring
  const wireButtons = () => {
    buttons.view?.addEventListener('click', () => {
      setMode('VIEW');
      hideValidationSummary();
    });

    buttons.add?.addEventListener('click', () => {
      clearForm();
      setMode('ADD');
      hideValidationSummary();
      document.getElementById('nomineeId')?.focus();
    });

    buttons.save?.addEventListener('click', handleSave);

    buttons.cancel?.addEventListener('click', () => {
      clearForm();
      setMode('VIEW');
      hideValidationSummary();
    });

    buttons.close?.addEventListener('click', postClose);
  };

  // Init
  const init = () => {
    pullContext();
    initSearchModal();
    setMode('VIEW'); // On load only View/Add active
    wireButtons();
  };

  init();
})();
