(() => {
  const form = document.querySelector(".form-card");
  if (!form) return;

  /* ──────────────────────────────────────────────
     Helpers
  ────────────────────────────────────────────── */
  const val = (id) => (document.getElementById(id)?.value || '').trim();
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };

  /* ──────────────────────────────────────────────
     Action Buttons
  ────────────────────────────────────────────── */
  const actionButtons = {
    view: document.querySelector('[data-action="view"]'),
    add: document.querySelector('[data-action="add"]'),
    edit: document.querySelector('[data-action="edit"]'),
    delete: document.querySelector('[data-action="delete"]'),
    save: document.querySelector('[data-action="save"]'),
    cancel: document.querySelector('[data-action="cancel"]')
  };

  const editableSelector = [
    'input:not([readonly]):not([type="hidden"])',
    'select:not([readonly])',
    'textarea:not([readonly])'
  ].join(', ');

  const getEditableControls = () => Array.from(form.querySelectorAll(editableSelector));
  const initialSnapshot = new Map();

  const snapshotValues = () => {
    initialSnapshot.clear();
    getEditableControls().forEach((el) => {
      const key = el.name || el.id;
      if (!key) return;
      initialSnapshot.set(key, el.type === 'checkbox' ? el.checked : el.value);
    });
  };

  const restoreValues = () => {
    getEditableControls().forEach((el) => {
      const key = el.name || el.id;
      if (!key || !initialSnapshot.has(key)) return;
      const value = initialSnapshot.get(key);
      if (el.type === 'checkbox') {
        el.checked = Boolean(value);
      } else {
        el.value = String(value ?? '');
      }
    });
  };

  const setEditMode = (isEditing) => {
    getEditableControls().forEach((el) => {
      el.disabled = !isEditing;
    });

    actionButtons.view && (actionButtons.view.disabled = isEditing);
    actionButtons.add && (actionButtons.add.disabled = isEditing);
    actionButtons.edit && (actionButtons.edit.disabled = isEditing);
    actionButtons.delete && (actionButtons.delete.disabled = isEditing);
    actionButtons.save && (actionButtons.save.disabled = !isEditing);
    actionButtons.cancel && (actionButtons.cancel.disabled = !isEditing);
  };

  const clearEditableValues = () => {
    getEditableControls().forEach((el) => {
      if (el.type === 'checkbox') {
        el.checked = false;
      } else {
        el.value = '';
      }
    });
  };

  snapshotValues();
  setEditMode(false);

  /* ──────────────────────────────────────────────
     Action Button Handlers
  ────────────────────────────────────────────── */
  actionButtons.view?.addEventListener('click', () => {
    restoreValues();
    setEditMode(false);
  });

  actionButtons.add?.addEventListener('click', () => {
    snapshotValues();
    clearEditableValues();
    setEditMode(true);
    document.getElementById('instructionTypeId')?.focus();
  });

  actionButtons.edit?.addEventListener('click', () => {
    snapshotValues();
    setEditMode(true);
    document.getElementById('description')?.focus();
  });

  actionButtons.cancel?.addEventListener('click', () => {
    restoreValues();
    setEditMode(false);
  });

  actionButtons.save?.addEventListener('click', () => {
    snapshotValues();
    setEditMode(false);
  });

  actionButtons.delete?.addEventListener('click', () => {
    snapshotValues();
    clearEditableValues();
    setEditMode(false);
  });

  /* ──────────────────────────────────────────────
     Section Toggles
  ────────────────────────────────────────────── */
  document.querySelectorAll('[data-section-toggle]').forEach((header) => {
    header.addEventListener('click', () => {
      const btn = header.querySelector('.section-toggle-btn');
      const content = header.nextElementSibling;
      if (content && content.classList.contains('section-content')) {
        const isHidden = content.hasAttribute('hidden');
        if (isHidden) {
          content.removeAttribute('hidden');
          if (btn) btn.innerHTML = '<i class="bi bi-chevron-up"></i>';
        } else {
          content.setAttribute('hidden', '');
          if (btn) btn.innerHTML = '<i class="bi bi-chevron-down"></i>';
        }
      }
    });
  });

  /* ──────────────────────────────────────────────
     Search Modal
  ────────────────────────────────────────────── */
  const Env = window.Environment || {};
  const CoreApi = window.CoreApi;
  const searchModal = window.SearchModal
    ? new window.SearchModal({
        prefix: 'sit',
        moduleID: '1000',
        getOperatorId: () => Env.OperatorID || Env.UserID || 'CSADM',
        getOurBranchId: () => Env.OurBranchID || '',
        onError: (err) => console.error('[SIT] Search error:', err)
      })
    : null;

  /* ──────────────────────────────────────────────
     p_GetSITypes – fetch full record after search selection
  ────────────────────────────────────────────── */
  const fetchSITypeDetails = async (siTypeID) => {
    const baseUrl = (Env.baseUrlCommon || '').replace(/\/+$/, '');
    const endpoint = `${baseUrl}/api/OldAPI`;
    const envelope = CoreApi.makeRequestEnvelope('dbo.p_GetSITypes', {
      BankID:      Env.defaultBankId || '00',
      OurBranchID: Env.OurBranchID   || '',
      SITypeID:    siTypeID,
      OperatorID:  Env.OperatorID || Env.UserID || 'CSADM',
      Direction:   0
    }, Env.appName || 'PROJECT_KAIRO');
    return CoreApi.post(endpoint, envelope);
  };

  const populateSITypeForm = (r) => {
    setVal('instructionTypeId',          r.SITypeID          || '');
    setVal('description',                r.Description       || '');
    setVal('siTransferType',             r.SITransferType    || r.TransferType || '');
    setVal('noOfRetries',                r.NoOfRetries       || '');
    setVal('retryAfterDays',             r.RetryAfterDays    || '');
    setVal('failedChargeType',           r.FailedChargeType  || '');
    const freezeEl = document.getElementById('freezeAmountOnFailure');
    if (freezeEl) freezeEl.checked = r.FreezeAmountOnFailure === '1' || r.FreezeAmountOnFailure === 'true' || r.FreezeAmountOnFailure === true;
    setVal('successfulTrxId',   r.SuccessfulTrxID   || r.SuccessfulTransactionID   || '');
    setVal('successfulTrxName', r.SuccessfulTrxName  || r.SuccessfulTransactionName || '');
    setVal('successfulNarration', r.SuccessfulNarration || '');
    setVal('failureTrxId',      r.FailureTrxID      || r.FailureTransactionID      || '');
    setVal('failureTrxName',    r.FailureTrxName     || r.FailureTransactionName    || '');
    setVal('failureNarration',  r.FailureNarration   || '');
    setVal('createdBy',    r.CreatedBy    || '');
    setVal('createdOn',    r.CreatedOn    || '');
    setVal('modifiedBy',   r.ModifiedBy   || '');
    setVal('modifiedOn',   r.ModifiedOn   || '');
    setVal('supervisedBy', r.SupervisedBy || '');
    setVal('supervisedOn', r.SupervisedOn || '');
    snapshotValues();
  };

  /* ──────────────────────────────────────────────
     1. SI Type Search (Instruction Type ID)
     TableID: SITypeID
     Filters: SITypeID (Like/Exact), Description (Like/Exact)
  ────────────────────────────────────────────── */
  document.getElementById('searchSITypeBtn')?.addEventListener('click', () => {
    if (!searchModal) return;
    searchModal.open({
      title: 'SI Type',
      tableID: 'SITypeID',
      whereStmt: '',
      autoSearch: true,
      searchFields: [
        { name: 'siTypeId',    label: 'SIType ID',    column: 'SITypeID'    },
        { name: 'description', label: 'Description',  column: 'Description' }
      ],
      displayFields: [
        { key: 'SITypeID',    label: 'SITypeID'    },
        { key: 'Description', label: 'Description' }
      ],
      onSelect: (record) => {
        // Populate ID + Description immediately from search result
        setVal('instructionTypeId', record.SITypeID    || '');
        setVal('description',      record.Description  || '');
        snapshotValues();

        // Then fetch full record from p_GetSITypes to fill remaining fields
        const siTypeID = record.SITypeID || '';
        if (!siTypeID || !CoreApi) return;
        fetchSITypeDetails(siTypeID)
          .then((result) => {
            const details = result?.data || result?.Details;
            const row = Array.isArray(details) ? details[0] : details;
            if (row) {
              populateSITypeForm(row);
            }
          })
          .catch((err) => {
            console.error('[SIT] p_GetSITypes error:', err);
          });
      }
    });
  });

  /* ──────────────────────────────────────────────
     2. Successful Transaction Search
     TableID: TrxDescriptionID
     Filters: TrxDescriptionID (Like/Exact), Description (Like/Exact)
  ────────────────────────────────────────────── */
  document.getElementById('searchSuccessfulTrxBtn')?.addEventListener('click', () => {
    if (!searchModal) return;
    searchModal.open({
      title: 'Trx Description',
      tableID: 'TrxDescriptionID',
      whereStmt: '',
      autoSearch: true,
      searchFields: [
        { name: 'trxDescriptionId', label: 'TrxDescriptionID', column: 'TrxDescriptionID' },
        { name: 'description',      label: 'Description',      column: 'Description'      }
      ],
      displayFields: [
        { key: 'TrxDescriptionID',  label: 'TrxDescriptionID'  },
        { key: 'Description',       label: 'Description'       },
        { key: 'TransactionTypeID', label: 'TransactionTypeID' }
      ],
      onSelect: (record) => {
        setVal('successfulTrxId',   record.TrxDescriptionID || '');
        setVal('successfulTrxName', record.Description      || '');
      }
    });
  });

  /* ──────────────────────────────────────────────
     3. Failure Transaction Search
     TableID: TrxDescriptionID
     Filters: TrxDescriptionID (Like/Exact), Description (Like/Exact)
  ────────────────────────────────────────────── */
  document.getElementById('searchFailureTrxBtn')?.addEventListener('click', () => {
    if (!searchModal) return;
    searchModal.open({
      title: 'Trx Description',
      tableID: 'TrxDescriptionID',
      whereStmt: '',
      autoSearch: true,
      searchFields: [
        { name: 'trxDescriptionId', label: 'TrxDescriptionID', column: 'TrxDescriptionID' },
        { name: 'description',      label: 'Description',      column: 'Description'      }
      ],
      displayFields: [
        { key: 'TrxDescriptionID',  label: 'TrxDescriptionID'  },
        { key: 'Description',       label: 'Description'       },
        { key: 'TransactionTypeID', label: 'TransactionTypeID' }
      ],
      onSelect: (record) => {
        setVal('failureTrxId',   record.TrxDescriptionID || '');
        setVal('failureTrxName', record.Description      || '');
      }
    });
  });
})();
