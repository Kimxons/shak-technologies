/* global bootstrap */

(() => {
  const form = document.getElementById('po-form');
  if (!form) return;

  const toastEl = document.getElementById('poToast');

  const state = {
    mode: 'view', // view | add | edit
  };

  function showToast(message, type = 'info') {
    if (!toastEl) return;
    toastEl.classList.remove('d-none', 'alert-info', 'alert-success', 'alert-warning', 'alert-danger');
    toastEl.classList.add(`alert-${type}`);
    toastEl.textContent = message;

    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      toastEl.classList.add('d-none');
    }, 2500);
  }

  function setEditable(enabled) {
    const editable = form.querySelectorAll('[data-editable="true"]');
    editable.forEach((el) => {
      if (el.id === 'BranchID' || el.id === 'branchId' || el.id === 'OurBranchID') {
        el.disabled = false;
        el.readOnly = false;
        return;
      }

      if (el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        el.disabled = !enabled;
        el.readOnly = !enabled && el.tagName === 'INPUT' && el.type !== 'checkbox' && el.type !== 'radio';
      }
    });

    const docActions = form.querySelectorAll('[data-po-doc-action]');
    docActions.forEach((btn) => {
      btn.disabled = !enabled;
    });

    const participantActions = form.querySelectorAll('[data-po-participant-action]');
    participantActions.forEach((btn) => {
      btn.disabled = !enabled;
    });

    const lookups = form.querySelectorAll('[data-lookup]');
    lookups.forEach((btn) => {
      if (btn.getAttribute('data-lookup') === 'branch') {
        btn.disabled = false;
        return;
      }
      btn.disabled = !enabled;
    });

    const browse = form.querySelector('[data-po-browse-image]');
    if (browse) browse.disabled = !enabled;

    applyMarginEnabled();
  }

  function applyMarginEnabled() {
    const isMarginRequired = document.getElementById('IsMarginRequired');
    if (!isMarginRequired) return;

    const marginFields = [
      'MarginType',
      'MarginAccount',
      'MarginAmountPercentage',
      'AccountMarginAmount',
      'MarginCurrency',
    ]
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const canEdit = state.mode === 'add' || state.mode === 'edit';
    const enableMargin = Boolean(isMarginRequired.checked) && canEdit;
    marginFields.forEach((el) => {
      el.disabled = !enableMargin;
      if (el.tagName === 'INPUT') el.readOnly = !enableMargin && el.type !== 'checkbox' && el.type !== 'radio';
    });

    // also disable lookup buttons for margin account/currency when margin disabled
    const marginLookups = form.querySelectorAll('[data-lookup="marginAccount"], [data-lookup="marginCurrency"]');
    marginLookups.forEach((btn) => {
      btn.disabled = !enableMargin;
    });
  }

  function clearValidation() {
    const fields = form.querySelectorAll('.is-valid, .is-invalid');
    fields.forEach((el) => el.classList.remove('is-valid', 'is-invalid'));
  }

  function validateRequired() {
    const required = form.querySelectorAll('[required]');
    let ok = true;

    required.forEach((el) => {
      const value = (el.value || '').trim();
      const valid = value.length > 0;
      el.classList.toggle('is-invalid', !valid);
      el.classList.toggle('is-valid', valid);
      if (!valid) ok = false;
    });

    return ok;
  }

  function setButtons() {
    const q = (sel) => form.querySelector(sel);

    const btnView = q('[data-po-action="view"]');
    const btnAdd = q('[data-po-action="add"]');
    const btnEdit = q('[data-po-action="edit"]');
    const btnDelete = q('[data-po-action="delete"]');
    const btnSave = q('[data-po-action="save"]');
    const btnCancel = q('[data-po-action="cancel"]');
    const btnShowImage = q('[data-po-action="show-image"]');
    const btnCharges = q('[data-po-action="charges"]');
    const btnPrint = q('[data-po-action="print"]');

    const canEdit = state.mode === 'edit' || state.mode === 'add';

    if (btnView) btnView.disabled = false;
    if (btnAdd) btnAdd.disabled = canEdit;
    if (btnEdit) btnEdit.disabled = canEdit;
    if (btnDelete) btnDelete.disabled = canEdit;
    if (btnSave) btnSave.disabled = !canEdit;
    if (btnCancel) btnCancel.disabled = !canEdit;
    if (btnShowImage) btnShowImage.disabled = true;
    if (btnCharges) btnCharges.disabled = true;
    if (btnPrint) btnPrint.disabled = true;

    const approve = q('[data-po-workflow="approve"]');
    const reject = q('[data-po-workflow="reject"]');
    if (approve) approve.disabled = true;
    if (reject) reject.disabled = true;
  }

  function setMode(mode) {
    state.mode = mode;
    setEditable(mode === 'add' || mode === 'edit');
    setButtons();

    applyMarginEnabled();

    if (mode === 'view') showToast('View mode.', 'info');
    if (mode === 'add') showToast('Add mode: enter details then Save.', 'success');
    if (mode === 'edit') showToast('Edit mode: update details then Save.', 'warning');
  }

  function handleAction(action) {
    switch (action) {
      case 'view': {
        clearValidation();
        setMode('view');
        // simulate loaded record -> allow edit/delete
        const btnEdit = form.querySelector('[data-po-action="edit"]');
        const btnDelete = form.querySelector('[data-po-action="delete"]');
        if (btnEdit) btnEdit.disabled = false;
        if (btnDelete) btnDelete.disabled = false;
        break;
      }
      case 'add':
        clearValidation();
        setMode('add');
        break;
      case 'edit':
        clearValidation();
        setMode('edit');
        break;
      case 'delete':
        showToast('Delete not wired in prototype.', 'warning');
        break;
      case 'charges':
        showToast('Charges not wired in prototype.', 'warning');
        break;
      case 'print':
        showToast('Print not wired in prototype.', 'warning');
        break;
      case 'save': {
        const ok = validateRequired();
        if (!ok) {
          showToast('Please fill required fields.', 'danger');
          return;
        }
        showToast('Saved (prototype).', 'success');
        setMode('view');
        const btnEdit = form.querySelector('[data-po-action="edit"]');
        const btnDelete = form.querySelector('[data-po-action="delete"]');
        if (btnEdit) btnEdit.disabled = false;
        if (btnDelete) btnDelete.disabled = false;
        break;
      }
      case 'cancel':
        clearValidation();
        setMode('view');
        break;
      case 'show-image':
        showToast('No image configured.', 'info');
        break;
      default:
        break;
    }
  }

  function handleLookup(kind) {
    showToast(`Lookup: ${kind} (placeholder).`, 'info');

    if (kind === 'client') {
      const id = document.getElementById('ClientID');
      const name = document.getElementById('ClientName');
      if (id && !id.value) id.value = '0000001';
      if (name) name.value = name.value || 'Sample Client';
    }

    if (kind === 'purchaseOrderNumber') {
      const pon = document.getElementById('PurchaseOrderNumber');
      if (pon && !pon.value) pon.value = 'PO-000001';
    }

    if (kind === 'account') {
      const id = document.getElementById('AccountID');
      const name = document.getElementById('AccountName');
      if (id && !id.value) id.value = '0012345678901';
      if (name) name.value = name.value || 'Current Account';
    }

    if (kind === 'product') {
      const id = document.getElementById('ProductID');
      const name = document.getElementById('ProductName');
      if (id && !id.value) id.value = 'TF-PO';
      if (name) name.value = name.value || 'Purchase Order';
    }

    if (kind === 'currency') {
      const id = document.getElementById('CurrencyID');
      const name = document.getElementById('CurrencyName');
      if (id && !id.value) id.value = 'USD';
      if (name) name.value = name.value || 'US Dollar';
    }

    if (kind === 'branch') {
      const id = document.getElementById('BranchID');
      const name = document.getElementById('BranchName');
      // Branch selection should come from a real lookup; no hardcoded defaults.
      if (id && id.value) return;
      if (name && name.value) return;
      return;
    }

    if (kind === 'historyBranch') {
      const id = document.getElementById('HistoryBranchID');
      const name = document.getElementById('HistoryBranchName');
      // No hardcoded defaults.
      return;
    }

    if (kind === 'debitBranch') {
      const id = document.getElementById('DebitBranchID');
      const name = document.getElementById('DebitBranchName');
      // No hardcoded defaults.
      return;
    }

    if (kind === 'debitAccount') {
      const id = document.getElementById('DebitAccount');
      const name = document.getElementById('DebitAccountName');
      if (id && !id.value) id.value = '0012345678901';
      if (name) name.value = name.value || 'Debit Account';
    }

    if (kind === 'fromCountry') {
      const el = document.getElementById('FromCountry');
      if (el && !el.value) el.value = 'ET';
    }

    if (kind === 'toCountry') {
      const el = document.getElementById('ToCountry');
      if (el && !el.value) el.value = 'CN';
    }
  }

  form.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-po-action]');
    if (actionBtn) {
      e.preventDefault();
      handleAction(actionBtn.getAttribute('data-po-action'));
      return;
    }

    const wfBtn = e.target.closest('[data-po-workflow]');
    if (wfBtn) {
      e.preventDefault();
      showToast('Workflow not wired in prototype.', 'warning');
      return;
    }

    const lookupBtn = e.target.closest('[data-lookup]');
    if (lookupBtn && !lookupBtn.disabled) {
      e.preventDefault();
      handleLookup(lookupBtn.getAttribute('data-lookup'));
      return;
    }

    const browseImageBtn = e.target.closest('[data-po-browse-image]');
    if (browseImageBtn && !browseImageBtn.disabled) {
      e.preventDefault();
      const file = document.getElementById('DocImageFile');
      if (file) file.click();
      return;
    }

    const docAction = e.target.closest('[data-po-doc-action]');
    if (docAction) {
      e.preventDefault();
      showToast(`Doc action: ${docAction.getAttribute('data-po-doc-action')} (placeholder).`, 'info');
      return;
    }

    const partAction = e.target.closest('[data-po-participant-action]');
    if (partAction) {
      e.preventDefault();
      showToast(`Participant action: ${partAction.getAttribute('data-po-participant-action')} (placeholder).`, 'info');
      return;
    }

    const historyAction = e.target.closest('[data-po-history-action]');
    if (historyAction) {
      e.preventDefault();
      showToast('History View is not wired (prototype).', 'warning');
    }
  });

  // Left-side view nav (same pattern as LC/PO Amendment/Extension DataEntry)
  const viewHistoryBtn = document.querySelector("[data-po-view='amendment-extension-history']");
  const historyModalEl = document.getElementById('poAmendmentExtensionHistoryModal');
  const historyModal = historyModalEl ? bootstrap.Modal.getOrCreateInstance(historyModalEl) : null;

  function setViewCurrent(btn) {
    const all = document.querySelectorAll('.po-nav-item');
    all.forEach((el) => el.removeAttribute('aria-current'));
    if (btn) btn.setAttribute('aria-current', 'true');
  }

  if (viewHistoryBtn && historyModal) {
    viewHistoryBtn.addEventListener('click', (e) => {
      e.preventDefault();
      setViewCurrent(viewHistoryBtn);
      historyModal.show();
    });
  }

  const docImageFile = document.getElementById('DocImageFile');
  if (docImageFile) {
    docImageFile.addEventListener('change', () => {
      const docImage = document.getElementById('DocImage');
      const f = docImageFile.files && docImageFile.files[0];
      if (docImage) docImage.value = f ? f.name : '';
      showToast(f ? 'Document image selected.' : 'No image selected.', 'info');
    });
  }

  const isMarginRequired = document.getElementById('IsMarginRequired');
  if (isMarginRequired) {
    isMarginRequired.addEventListener('change', () => {
      applyMarginEnabled();
    });
  }

  function parseMoney(value) {
    const v = String(value ?? '').replace(/,/g, '').trim();
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function formatMoney(n) {
    if (!Number.isFinite(n)) return '';
    return n.toFixed(2);
  }

  function recalcLocalAmount() {
    const amountEl = document.getElementById('ContractAmount');
    const rateEl = document.getElementById('ExchangeRate');
    const localEl = document.getElementById('LocalAmount');
    if (!amountEl || !rateEl || !localEl) return;
    const amount = parseMoney(amountEl.value);
    const rate = parseMoney(rateEl.value);
    if (amount == null || rate == null) {
      localEl.value = '';
      return;
    }
    localEl.value = formatMoney(amount * rate);
  }

  ['ContractAmount', 'ExchangeRate'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', recalcLocalAmount);
    el.addEventListener('change', recalcLocalAmount);
  });

  function fillSelect(selectId, values) {
    const el = document.getElementById(selectId);
    if (!el) return;
    if (el.options.length > 1) return;
    values.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      el.appendChild(opt);
    });
  }

  fillSelect('ContractType', ['TYPE1', 'TYPE2']);
  fillSelect('POType', ['TYPE1', 'TYPE2']);
  fillSelect('IssueDate', ['01/Jan/2026']);
  fillSelect('EffectiveDate', ['01/Jan/2026']);
  fillSelect('ExpiryDate', ['01/Jan/2026']);
  fillSelect('LimitExpiryDate', ['01/Jan/2026']);

  fillSelect('MarginType', ['CASH', 'PERCENT']);
  fillSelect('ParticipantType', ['--Select--', 'Applicant', 'Beneficiary', 'Bank', 'Other'].filter((v) => v !== '--Select--'));
  fillSelect('ParticipantDate', ['01/Jan/2026']);

  fillSelect('BankCharges', ['OUR', 'BEN', 'SHA']);
  fillSelect('IncoTerms', ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DDP']);
  fillSelect('ConfirmationType', ['CONFIRMED', 'UNCONFIRMED']);
  fillSelect('POPaymentTerms', ['AT SIGHT', 'USANCE', 'DP', 'DA']);
  fillSelect('CreditAvailableWith', ['ISSUING BANK', 'ADVISING BANK']);

  fillSelect('DocLocation', ['BRANCH', 'CUSTOMER', 'VAULT', 'ARCHIVE']);

  fillSelect('ShipmentType', ['--Select--', 'AIR', 'SEA', 'ROAD'].filter((v) => v !== '--Select--'));
  fillSelect('FirstShipmentDate', ['01/Jan/2026']);
  fillSelect('LatestDateOfShipment', ['01/Jan/2026']);
  fillSelect('ProductTypes', ['--Select--', 'GENERAL'].filter((v) => v !== '--Select--'));
  fillSelect('GoodsType', ['--Select--', 'GENERAL'].filter((v) => v !== '--Select--'));
  fillSelect('ModeOfTransport', ['--Select--', 'AIR', 'SEA', 'ROAD'].filter((v) => v !== '--Select--'));
  fillSelect('DrawerRegion', ['--Select--', 'Addis Ababa', 'Oromia', 'Amhara'].filter((v) => v !== '--Select--'));
  fillSelect('DrawerSubCityZone', ['--Select--', 'Zone 1', 'Zone 2'].filter((v) => v !== '--Select--'));

  // Bootstrap tabs initialization
  const tabTriggers = [].slice.call(document.querySelectorAll('button[data-bs-toggle="tab"]'));
  tabTriggers.forEach((triggerEl) => {
    try {
      bootstrap.Tab.getOrCreateInstance(triggerEl);
    } catch {
      // ignore
    }
  });

  setMode('view');
})();
