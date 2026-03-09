(() => {
  const form = document.querySelector(".form-card");
  if (!form) return;

  /* ──────────────────────────────────────────────
     Helper – get element value safely
  ────────────────────────────────────────────── */
  const val = (id) => (document.getElementById(id)?.value || '').trim();
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };

  /* ──────────────────────────────────────────────
     Environment & API helpers
  ────────────────────────────────────────────── */
  const Env = window.Environment || {};
  const CoreApi = window.CoreApi;
  const BASE_URL = (Env.baseUrlCommon || 'http://localhost:3306').replace(/\/+$/, '');
  const API_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  function pad2(n) { return String(n).padStart(2, '0'); }

  function formatRequestTime(date = new Date()) {
    return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  }

  /** Convert HTML date input (YYYY-MM-DD) to smalldatetime (MM/DD/YYYY) */
  function toApiDate(htmlDate) {
    if (!htmlDate) return '';
    const parts = htmlDate.split('-');
    if (parts.length !== 3) return htmlDate;
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  }

  /* ──────────────────────────────────────────────
     Mode tracking: VIEW | ADD | EDIT
  ────────────────────────────────────────────── */
  let currentMode = 'VIEW';

  /* ──────────────────────────────────────────────
     Toast helper
  ────────────────────────────────────────────── */
  function showToast(message, variant = 'success') {
    const container = document.querySelector('.toast-container') || document.body;
    const toast = document.createElement('div');
    toast.className = `alert alert-${variant} alert-dismissible fade show position-fixed`;
    toast.style.cssText = 'top:20px;right:20px;z-index:99999;min-width:300px;box-shadow:0 4px 12px rgba(0,0,0,.2);';
    toast.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 5000);
  }

  /* ──────────────────────────────────────────────
     Action Buttons
  ────────────────────────────────────────────── */
  const actionButtons = {
    view: document.querySelector('[data-action="view"]'),
    add: document.querySelector('[data-action="add"]'),
    edit: document.querySelector('[data-action="edit"]'),
    delete: document.querySelector('[data-action="delete"]'),
    save: document.querySelector('[data-action="save"]'),
    cancel: document.querySelector('[data-action="cancel"]'),
    stop: document.querySelector('[data-action="stop"]'),
    print: document.querySelector('[data-action="print"]')
  };

  const editableSelector = "input:not([readonly]):not([disabled]), select:not([disabled])";
  const getEditableControls = () => Array.from(form.querySelectorAll(editableSelector));

  const initialSnapshot = new Map();

  const snapshotValues = () => {
    initialSnapshot.clear();
    getEditableControls().forEach((el) => {
      initialSnapshot.set(el.name || el.id, el.value);
    });
  };

  const restoreValues = () => {
    getEditableControls().forEach((el) => {
      const key = el.name || el.id;
      if (!initialSnapshot.has(key)) return;
      el.value = String(initialSnapshot.get(key) ?? "");
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

    actionButtons.stop && (actionButtons.stop.disabled = isEditing);
    actionButtons.print && (actionButtons.print.disabled = isEditing);
  };

  const clearEditableValues = () => {
    getEditableControls().forEach((el) => {
      el.value = "";
    });
    // Also clear readonly fields
    ['branchName', 'accountName', 'standingInstructionStatus', 'originatorRef',
     'policyNumber1', 'policyNumber2', 'returnCode', 'remarks'].forEach(id => setVal(id, ''));
  };

  snapshotValues();
  setEditMode(false);

  actionButtons.view?.addEventListener("click", () => {
    currentMode = 'VIEW';
    restoreValues();
    setEditMode(false);
  });

  actionButtons.add?.addEventListener("click", () => {
    currentMode = 'ADD';
    snapshotValues();
    clearEditableValues();
    setVal('returnCode', '00');
    setEditMode(true);
    document.getElementById("branchId")?.focus();
  });

  actionButtons.edit?.addEventListener("click", () => {
    if (!val('directDebitInstructionId')) {
      showToast('Please load a Direct Debit Instruction first before editing.', 'warning');
      return;
    }
    currentMode = 'EDIT';
    snapshotValues();
    setEditMode(true);
    document.getElementById("referenceNo")?.focus();
  });

  actionButtons.cancel?.addEventListener("click", () => {
    currentMode = 'VIEW';
    restoreValues();
    setEditMode(false);
  });

  /* ──────────────────────────────────────────────
     Validation
  ────────────────────────────────────────────── */
  function validateForm() {
    const errors = [];
    if (!val('branchId'))         errors.push('Branch ID is required.');
    if (!val('accountId'))        errors.push('Account ID is required.');
    if (!val('transactionCurrencyId')) errors.push('Transaction Currency is required.');
    if (!val('directDebitType'))  errors.push('Direct Debit Type is required.');
    if (!val('effectiveDate'))    errors.push('Effective Date is required.');
    if (!val('transferFrequency')) errors.push('Transfer Frequency is required.');
    // Highlight first invalid field
    if (errors.length > 0) {
      showToast(errors.join('<br>'), 'danger');
      return false;
    }
    return true;
  }

  /* ──────────────────────────────────────────────
     Build Save Payload
  ────────────────────────────────────────────── */
  function buildSavePayload() {
    const operatorId = Env.OperatorID || Env.UserID || 'CSADM';
    return {
      OurBranchID:          val('branchId'),
      SIID:                 val('directDebitInstructionId'),
      ReferenceNo:          val('referenceNo') || '0',
      SITypeID:             val('directDebitType'),
      EffectiveDate:        toApiDate(val('effectiveDate')),
      DebitAccountID:       val('accountId'),
      TrfCurrencyID:        val('transactionCurrencyId'),
      AmountTypeID:         '',
      Amount:               val('fixedAmount') || '0',
      TrfFrequencyID:       val('transferFrequency'),
      NoOfExecutions:       val('noOfExecution') || '1',
      FirstExecutionDate:   toApiDate(val('firstExecutionDate')),
      LastExecutionDate:    toApiDate(val('lastExecutionDate')),
      ChargeTypeID:         val('chargeRecovery'),
      CreditAccountBranchID: val('contraBranchId'),
      CreditAccountBankID: val('bankId'),
      CreditAccountID:     val('contraAccountId'),
      SIStatusID:          val('standingInstructionStatus'),
      OrigCode:            val('originatorCode'),
      OrigRef:             val('originatorRef'),
      Policy1:             val('policyNumber1'),
      Policy2:             val('policyNumber2'),
      CreatedBy:           operatorId,
      VoucherNo:           '0',
      Reference:           val('remarks'),
      ReturnCode:          val('returnCode') || '00',
      CreatedOn:           formatRequestTime(),
      SupervisedBy:        '',
      BBankID:             Env.defaultBankId || '00',
      BBranchID:           val('branchId'),
      ValueDate:           toApiDate(val('valueDate'))
    };
  }

  /* ──────────────────────────────────────────────
     Save (Add / Edit)
  ────────────────────────────────────────────── */
  async function saveRecord() {
    if (!validateForm()) return;

    const payload = buildSavePayload();
    const formId = 'dbo.p_AddEditDirectDebitTransfer';

    const envelope = {
      RequestID: formId,
      FormId: formId,
      RequestData: payload,
      RequestTime: formatRequestTime(),
      AppName: Env.appName || 'PROJECT_KAIRO',
      Checksum: ''
    };

    // Disable save while request is in flight
    if (actionButtons.save) actionButtons.save.disabled = true;

    try {
      console.log('[DDM] Saving...', currentMode, envelope);
      const resp = await CoreApi.post(API_ENDPOINT, envelope);
      console.log('[DDM] Save response:', resp);

      if (resp && resp.success) {
        const action = currentMode === 'ADD' ? 'added' : 'updated';
        showToast(`Direct Debit Instruction ${action} successfully.`, 'success');
        // If we got back an ID on add, populate it
        if (currentMode === 'ADD') {
          const newId = resp.data?.SIID || resp.data?.DirectDebitInstructionID || resp.Details?.SIID || '';
          if (newId) setVal('directDebitInstructionId', newId);
        }
        currentMode = 'VIEW';
        snapshotValues();
        setEditMode(false);
      } else {
        const msg = resp?.message || resp?.ResponseMessage || 'Save failed. Please try again.';
        showToast(msg, 'danger');
      }
    } catch (err) {
      console.error('[DDM] Save error:', err);
      showToast('Network error while saving. Please check your connection.', 'danger');
    } finally {
      if (actionButtons.save && currentMode !== 'VIEW') {
        actionButtons.save.disabled = false;
      }
    }
  }

  actionButtons.save?.addEventListener("click", () => {
    saveRecord();
  });

  actionButtons.delete?.addEventListener("click", () => {
    snapshotValues();
    clearEditableValues();
    currentMode = 'VIEW';
    setEditMode(false);
  });

  actionButtons.stop?.addEventListener("click", () => {
    const status = document.getElementById("standingInstructionStatus");
    if (status) status.value = "Stopped";
  });

  actionButtons.print?.addEventListener("click", () => {
    window.print();
  });

  /* ──────────────────────────────────────────────
     Section Toggles
  ────────────────────────────────────────────── */
  document.querySelectorAll("[data-section-toggle]").forEach((header) => {
    header.addEventListener("click", () => {
      const btn = header.querySelector(".section-toggle-btn");
      const content = header.nextElementSibling;
      if (content && content.classList.contains("section-content")) {
        const isHidden = content.hasAttribute("hidden");
        if (isHidden) {
          content.removeAttribute("hidden");
          btn.innerHTML = '<i class="bi bi-chevron-up"></i>';
        } else {
          content.setAttribute("hidden", "");
          btn.innerHTML = '<i class="bi bi-chevron-down"></i>';
        }
      }
    });
  });

  /* ──────────────────────────────────────────────
     Search Modal – initialise once shared
  ────────────────────────────────────────────── */
  const searchModal = new window.SearchModal({
    prefix: 'ddm',
    moduleID: '1000',
    getOperatorId: () => Env.OperatorID || Env.UserID || 'CSADM',
    getOurBranchId: () => val('branchId') || Env.OurBranchID || '',
    onError: (err) => console.error('[DDM] Search error:', err)
  });

  /* ──────────────────────────────────────────────
     1. Branch Search
  ────────────────────────────────────────────── */
  document.getElementById('searchBranchBtn')?.addEventListener('click', () => {
    searchModal.open({
      title: 'Find Branch',
      tableID: 'BranchID',
      whereStmt: '',
      searchFields: [
        { name: 'branchId',   label: 'Branch ID',   column: 'OurBranchID' },
        { name: 'branchName', label: 'Branch Name',  column: 'BranchName'  }
      ],
      displayFields: [
        { key: 'OurBranchID', label: 'Branch ID'   },
        { key: 'BranchName',  label: 'Branch Name' }
      ],
      onSelect: (record) => {
        const bid   = record.OurBranchID || record.BranchID || '';
        const bname = record.BranchName  || record.Description || '';
        setVal('branchId', bid);
        setVal('branchName', bname);
      }
    });
  });

  /* ──────────────────────────────────────────────
     2. Account Search
  ────────────────────────────────────────────── */
  document.getElementById('searchAccountBtn')?.addEventListener('click', () => {
    const branch = val('branchId');
    const baseWhere = branch ? "OurBranchID = '" + branch + "'" : '';

    searchModal.open({
      title: 'Find Account',
      tableID: 'AccountID',
      whereStmt: baseWhere,
      searchFields: [
        { name: 'accountId',        label: 'Account ID',         column: 'AccountID'        },
        { name: 'accountName',      label: 'Account Name',       column: 'Name'             },
        { name: 'productId',        label: 'Product ID',         column: 'ProductID'        },
        { name: 'legacyAccountId',  label: 'Legacy Account ID',  column: 'LegacyAccountID'  },
        { name: 'accountShortCode', label: 'Account Short Code', column: 'AccountShortCode' }
      ],
      displayFields: [
        { key: 'AccountID',   label: 'Account ID'    },
        { key: 'Name',        label: 'Name'          },
        { key: 'ProductID',   label: 'Product'       }
      ],
      onSelect: (record) => {
        const aid  = record.AccountID   || record.accountId || '';
        const desc = record.Name || record.Description || record.AccountName || '';
        setVal('accountId', aid);
        setVal('accountName', desc);
      }
    });
  });

  /* ──────────────────────────────────────────────
     3. Direct Debit Instruction Search
  ────────────────────────────────────────────── */
  document.getElementById('searchDDInstructionBtn')?.addEventListener('click', () => {
    const branch  = val('branchId');
    const account = val('accountId');
    let advFilter = '';
    if (branch)  advFilter += "OurBranchID='" + branch + "'";
    if (account) advFilter += (advFilter ? ' AND ' : '') + "AccountID='" + account + "'";

    searchModal.open({
      title: 'DDInstruction',
      tableID: 'DDInstruction',
      whereStmt: '',
      advFilterString: advFilter,
      searchFields: [
        { name: 'instructionId',  label: 'Instruction ID',  column: 'DDID'        },
        { name: 'accountId',      label: 'Account ID',      column: 'AccoutID'    },
        { name: 'accountName',    label: 'Account Name',    column: 'AccountName' },
        { name: 'originatorCode', label: 'Originator Code', column: 'OrigCode'    },
        { name: 'originatorRef',  label: 'Originator Ref',  column: 'OrigRef'     }
      ],
      displayFields: [
        { key: 'DDID',        label: 'DDID'        },
        { key: 'OrigCode',    label: 'OrigCode'    },
        { key: 'OrigRef',     label: 'OrigRef'     },
        { key: 'Policy1',     label: 'Policy1'     },
        { key: 'Policy2',     label: 'Policy2'     },
        { key: 'AccoutID',    label: 'AccountID'   },
        { key: 'AccountName', label: 'AccountName' }
      ],
      onSelect: (record) => {
        setVal('directDebitInstructionId', record.DDID || record.DirectDebitInstructionID || '');
        setVal('accountId',               record.AccoutID || record.AccountID || val('accountId'));
        setVal('accountName',             record.AccountName || val('accountName'));
        setVal('originatorCode',          record.OrigCode || record.OriginatorCode || '');
        setVal('originatorRef',           record.OrigRef || record.OriginatorRef || '');
        setVal('policyNumber1',           record.Policy1 || record.PolicyNumber1 || '');
        setVal('policyNumber2',           record.Policy2 || record.PolicyNumber2 || '');
        setVal('referenceNo',             record.ReferenceNo || '');
        setVal('transactionCurrencyId',   record.CurrencyID || record.TransactionCurrencyID || val('transactionCurrencyId'));
        setVal('fixedAmount',             record.FixedAmount || record.Amount || '');
        setVal('effectiveDate',           record.EffectiveDate || '');
        setVal('transferFrequency',       record.TransferFrequency || '');
        setVal('noOfExecution',           record.NoOfExecution || '');
        setVal('firstExecutionDate',      record.FirstExecutionDate || '');
        setVal('lastExecutionDate',       record.LastExecutionDate || '');
        setVal('standingInstructionStatus', record.StatusDescription || record.Status || '');
        setVal('chargeRecovery',          record.ChargeRecovery || '');
        setVal('bankId',                  record.ContraBankID || record.BankID || '');
        setVal('contraBranchId',          record.ContraBranchID || '');
        setVal('contraAccountId',         record.ContraAccountID || '');
        setVal('returnCode',              record.ReturnCode || '00');
        setVal('remarks',                 record.Remarks || '');
      }
    });
  });

  /* ──────────────────────────────────────────────
     4. Currency Search
  ────────────────────────────────────────────── */
  document.getElementById('searchCurrencyBtn')?.addEventListener('click', () => {
    searchModal.open({
      title: 'Find Currency',
      tableID: 'MastCurrencyID',
      whereStmt: '',
      searchFields: [
        { name: 'currencyId',   label: 'Currency ID',  column: 'CurrencyID'  },
        { name: 'currencyDesc', label: 'Description',  column: 'Description' }
      ],
      displayFields: [
        { key: 'CurrencyID',  label: 'Currency ID'  },
        { key: 'Description', label: 'Description'  }
      ],
      onSelect: (record) => {
        const cid = record.CurrencyID || '';
        setVal('transactionCurrencyId', cid);
      }
    });
  });

  /* ──────────────────────────────────────────────
     5. Contra Bank Search
  ────────────────────────────────────────────── */
  document.getElementById('searchContraBankBtn')?.addEventListener('click', () => {
    searchModal.open({
      title: 'Find Bank',
      tableID: 'MastClrBankID',
      whereStmt: '',
      searchFields: [
        { name: 'bankId',   label: 'Bank ID',   column: 'BankID'   },
        { name: 'bankName', label: 'Bank Name',  column: 'BankName' }
      ],
      displayFields: [
        { key: 'BankID',    label: 'Bank ID'    },
        { key: 'BankName',  label: 'Bank Name'  },
        { key: 'ShortName', label: 'Short Name' }
      ],
      onSelect: (record) => {
        const bid = record.BankID || record.ClrBankID || '';
        setVal('bankId', bid);
      }
    });
  });

  /* ──────────────────────────────────────────────
     6. Contra Branch Search
  ────────────────────────────────────────────── */
  document.getElementById('searchContraBranchBtn')?.addEventListener('click', () => {
    const bankId = val('bankId');
    const baseWhere = bankId ? "BankID = '" + bankId + "'" : '';

    searchModal.open({
      title: 'Find Contra Branch',
      tableID: 'BranchID',
      whereStmt: baseWhere,
      searchFields: [
        { name: 'branchId',   label: 'Branch ID',   column: 'OurBranchID' },
        { name: 'branchName', label: 'Branch Name',  column: 'BranchName'  }
      ],
      displayFields: [
        { key: 'OurBranchID', label: 'Branch ID'   },
        { key: 'BranchName',  label: 'Branch Name' }
      ],
      onSelect: (record) => {
        const bid = record.OurBranchID || record.BranchID || '';
        setVal('contraBranchId', bid);
      }
    });
  });
})();
