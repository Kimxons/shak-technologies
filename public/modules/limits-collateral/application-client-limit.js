/* Application Client Limit - Standardized UI implementation */

'use strict';

const ACL_STATE = {
  mode: 'view',
  limitsService: null,
  lookupService: null,
  branchCache: new Map(),
  messageTimer: null,
  mockLimits: [
    { limitId: 'LMT001', clientId: 'CLI001', clientName: 'ABC Trading Ltd', type: 'OVERDRAFT', amount: 500000 },
    { limitId: 'LMT002', clientId: 'CLI002', clientName: 'Nimble Manufacturing', type: 'LOAN', amount: 1200000 },
    { limitId: 'LMT003', clientId: 'CLI003', clientName: 'Kairo Exports', type: 'GUARANTEE', amount: 250000 }
  ],
  mockClients: [
    { clientId: 'CLI001', clientName: 'ABC Trading Ltd', type: 'Corporate', status: 'Active' },
    { clientId: 'CLI002', clientName: 'Nimble Manufacturing', type: 'Corporate', status: 'Active' },
    { clientId: 'CLI003', clientName: 'Kairo Exports', type: 'Corporate', status: 'Active' }
  ]
};

document.addEventListener('DOMContentLoaded', () => {
  wireStandardUiShell();
  wireCollapsibleSections();
  wireFormGuards();
  wireLookupButtons();
  wireBranchAutoPopulate();
  initializeFormDefaults();
  setMode('view');

  void loadServicesBestEffort();
});

function wireStandardUiShell() {
  wireHeaderWindowControls();
  wireSidebarToggle();
  wireSubmoduleSearch();
  wireNavSectionToggles();
  wireSidebarKeyboardActivation();
}

function wireHeaderWindowControls() {
  const header = document.querySelector('.am-header');
  if (!header) return;

  header.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    if (action === 'refresh') {
      window.location.reload();
      return;
    }
    if (action === 'close') {
      window.close();
      return;
    }

    showStatus('Action not supported in web view.', 'info');
  });
}

function wireSidebarToggle() {
  const sidebar = document.getElementById('main-sidebar');
  const toggleBtn = document.getElementById('sidebarToggle');
  if (!sidebar || !toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    const isCollapsed = sidebar.classList.toggle('collapsed');
    toggleBtn.setAttribute('aria-expanded', String(!isCollapsed));
  });
}

function wireSubmoduleSearch() {
  const input = document.getElementById('submoduleSearch');
  const clearBtn = document.getElementById('submoduleSearchClear');
  if (!input) return;

  const applyFilter = () => {
    const q = (input.value || '').trim().toLowerCase();
    document.querySelectorAll('.sidebar-item--enhanced').forEach((item) => {
      const text = (item.textContent || '').toLowerCase();
      item.classList.toggle('d-none', Boolean(q) && !text.includes(q));
    });
  };

  input.addEventListener('input', applyFilter);
  clearBtn?.addEventListener('click', () => {
    input.value = '';
    applyFilter();
    input.focus();
  });
}

function wireNavSectionToggles() {
  document.querySelectorAll('[data-nav-section]').forEach((section) => {
    const arrowBtn = section.querySelector('.nav-arrow');
    const items = section.querySelector('.nav-items');
    if (!arrowBtn || !items) return;

    arrowBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = section.classList.toggle('is-open');
      arrowBtn.setAttribute('aria-expanded', String(isOpen));
      items.classList.toggle('d-none', !isOpen);
    });
  });
}

function wireSidebarKeyboardActivation() {
  document.querySelectorAll('.sidebar-item[role="button"]').forEach((item) => {
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.click();
      }
    });
  });
}

function wireCollapsibleSections() {
  document.querySelectorAll('[data-section-toggle]').forEach((toggleRow) => {
    const section = toggleRow.closest('.form-section');
    const content = section?.querySelector('[data-section-content]');
    const btn = toggleRow.querySelector('.section-toggle-btn');
    const icon = btn?.querySelector('i');
    if (!section || !content || !btn || !icon) return;

    btn.addEventListener('click', () => {
      const isCollapsed = section.classList.toggle('collapsed');
      btn.setAttribute('aria-expanded', String(!isCollapsed));
      content.hidden = isCollapsed;
      icon.className = isCollapsed ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
    });
  });
}

function wireFormGuards() {
  const form = document.getElementById('clientLimitForm');
  if (!form) return;
  form.addEventListener('submit', (e) => e.preventDefault());
}

function wireLookupButtons() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-lookup]');
    if (!btn) return;
    handleLookup(btn.getAttribute('data-lookup'));
  });
}

function wireBranchAutoPopulate() {
  const branchId = document.getElementById('branchId');
  if (!branchId) return;

  branchId.addEventListener('blur', () => {
    void fetchBranchName();
  });
}

function initializeFormDefaults() {
  const { branchId, branchName } = getDefaultBranchContext();
  if (branchId) setValue('branchId', branchId);
  if (branchName) setValue('branchName', branchName);
}

async function loadServicesBestEffort() {
  try {
    await window.ServiceLoader?.loadLimitsCollateralService?.();
    ACL_STATE.limitsService = window.LimitsCollateralService || null;
  } catch {
    ACL_STATE.limitsService = null;
  }

  ACL_STATE.lookupService = window.LookupService || null;
}

function setMode(mode) {
  ACL_STATE.mode = mode;
  enableClientLimitFields(mode === 'add' || mode === 'edit');
  updateActionButtons(mode);
}

function updateActionButtons(mode) {
  const buttons = {
    view: document.querySelector('[data-form-action="view"]'),
    add: document.querySelector('[data-form-action="add"]'),
    edit: document.querySelector('[data-form-action="edit"]'),
    save: document.querySelector('[data-form-action="save"]'),
    cancel: document.querySelector('[data-form-action="cancel"]')
  };

  const isEntry = mode === 'add' || mode === 'edit';
  if (buttons.view) buttons.view.disabled = isEntry;
  if (buttons.add) buttons.add.disabled = isEntry;
  if (buttons.edit) buttons.edit.disabled = isEntry;
  if (buttons.save) buttons.save.disabled = !isEntry;
  if (buttons.cancel) buttons.cancel.disabled = !isEntry;
}

function enableClientLimitFields(enabled) {
  const ids = [
    'branchId',
    'effectiveDate',
    'referenceNo',
    'expiryDate',
    'limitId',
    'dpDefinition',
    'clientId',
    'appliedLimit',
    'currencyId',
    'remarks',
    'limitType'
  ];

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = !enabled;
  });

  const branchName = document.getElementById('branchName');
  if (branchName) branchName.readOnly = true;
}

function showStatus(message, kind = 'info') {
  const panel = document.querySelector('.am-message-panel');
  const span = panel?.querySelector('span');
  if (!panel || !span) return;

  span.textContent = message || '';
  panel.classList.remove('success', 'error', 'warning', 'info');
  panel.classList.add(kind);

  if (ACL_STATE.messageTimer) {
    clearTimeout(ACL_STATE.messageTimer);
    ACL_STATE.messageTimer = null;
  }

  ACL_STATE.messageTimer = setTimeout(() => {
    span.textContent = '';
  }, 3500);
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getValue(id) {
  return (document.getElementById(id)?.value ?? '').toString().trim();
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = value ?? '';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeRows(res) {
  if (!res) return [];
  let rows = res.data || res.Details || res.Details01 || res.Details1 || [];
  if (rows && rows.Details) rows = rows.Details;
  if (rows && rows.Details01) rows = rows.Details01;
  if (!Array.isArray(rows)) rows = [rows];
  return rows.filter(Boolean);
}

function getModal(id) {
  const el = document.getElementById(id);
  if (!el || !window.bootstrap?.Modal) return null;
  return window.bootstrap.Modal.getOrCreateInstance(el);
}

// ===== Actions (wired from HTML) =====
function handleView() {
  setMode('view');
  showStatus('View mode.', 'info');
}

function handleAdd() {
  clearForm();
  setMode('add');
  showStatus('Add mode. Enter details and Save.', 'info');
}

function handleEdit() {
  setMode('edit');
  showStatus('Edit mode. Update details and Save.', 'info');
}

async function handleSave() {
  const payload = collectPayload();
  const errors = validatePayload(payload);
  if (errors.length) {
    showStatus(errors[0], 'error');
    return;
  }

  try {
    if (ACL_STATE.limitsService?.addClientLimit) {
      const req = {
        OurBranchID: payload.branchId,
        LimitID: payload.limitId,
        RefNo: payload.referenceNo,
        ClientID: payload.clientId,
        EffectiveDate: payload.effectiveDate,
        ExpiryDate: payload.expiryDate,
        DpDefinition: payload.dpDefinition,
        AppliedLimit: payload.appliedLimit,
        CurrencyID: payload.currencyId,
        Remarks: payload.remarks,
        LimitType: payload.limitType,
        OperatorID: payload.operatorId || ''
      };

      const res = await ACL_STATE.limitsService.addClientLimit(req);
      if (res?.success === false) {
        showStatus(res?.message || 'Save failed.', 'error');
        return;
      }

      showStatus('Saved successfully.', 'success');
      setMode('view');
      return;
    }

    showStatus('Saved (mock). LimitsCollateralService not available.', 'warning');
    setMode('view');
  } catch {
    showStatus('Save failed. Check API connectivity.', 'error');
  }
}

function handleCancel() {
  setMode('view');
  showStatus('Cancelled.', 'info');
}

function navigatePrevious() {
  showStatus('Previous record navigation not wired.', 'info');
}

function navigateNext() {
  showStatus('Next record navigation not wired.', 'info');
}

// ===== Lookups =====
function handleLookup(type) {
  if (type === 'branch') {
    getModal('branchLookupModal')?.show();
    return;
  }
  if (type === 'limit') {
    getModal('limitLookupModal')?.show();
    return;
  }
  if (type === 'client') {
    getModal('clientLookupModal')?.show();
    return;
  }
  if (type === 'currency') {
    showStatus('Currency lookup not implemented.', 'info');
  }
}

async function fetchBranchName() {
  const branchId = getValue('branchId');
  if (!branchId) {
    setValue('branchName', '');
    return;
  }

  const cached = ACL_STATE.branchCache.get(branchId);
  if (cached) {
    setValue('branchName', cached);
    return;
  }

  if (!ACL_STATE.lookupService?.getBranches) return;

  try {
    const res = await ACL_STATE.lookupService.getBranches({ BankID: getBankId() });
    const rows = normalizeRows(res);
    const match = rows.find((b) => String(b.BranchID || b.OurBranchID || b.branchId || '').trim() === branchId);
    const branchName = (match?.BranchName || match?.Name || match?.branchName || '').toString();
    if (branchName) {
      ACL_STATE.branchCache.set(branchId, branchName);
      setValue('branchName', branchName);
    }
  } catch {
    // Best-effort only
  }
}

function clearBranchSearch() {
  setValue('searchBranchId', '');
  setValue('searchBranchName', '');
  renderBranchResults([]);
}

async function searchBranches() {
  const loading = document.getElementById('branchLoading');
  const empty = document.getElementById('branchEmpty');
  loading?.classList.remove('d-none');
  if (empty) empty.textContent = 'Searching...';

  const termId = getValue('searchBranchId').toLowerCase();
  const termName = getValue('searchBranchName').toLowerCase();

  try {
    if (!ACL_STATE.lookupService?.getBranches) {
      renderBranchResults([]);
      if (empty) empty.textContent = 'Branch lookup service not available.';
      return;
    }

    const res = await ACL_STATE.lookupService.getBranches({ BankID: getBankId() });
    const rows = normalizeRows(res);

    const filtered = rows.filter((b) => {
      const id = (b.BranchID || b.OurBranchID || b.branchId || '').toString().toLowerCase();
      const name = (b.BranchName || b.Name || b.branchName || '').toString().toLowerCase();
      return (!termId || id.includes(termId)) && (!termName || name.includes(termName));
    });

    renderBranchResults(filtered);
    if (empty) empty.textContent = filtered.length ? '' : 'No results.';
  } catch {
    renderBranchResults([]);
    if (empty) empty.textContent = 'Search failed.';
  } finally {
    loading?.classList.add('d-none');
  }
}

function renderBranchResults(branches) {
  const body = document.getElementById('branchResultsBody');
  if (!body) return;
  body.innerHTML = '';

  (branches || []).slice(0, 100).forEach((b) => {
    const branchId = (b.BranchID || b.OurBranchID || b.branchId || '').toString();
    const branchName = (b.BranchName || b.Name || b.branchName || '').toString();
    const regionId = (b.RegionID || b.RegionId || b.regionId || '').toString();

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(branchId)}</td>
      <td>${escapeHtml(branchName)}</td>
      <td>${escapeHtml(regionId)}</td>
      <td class="text-end"><button type="button" class="btn btn-sm btn-primary">Select</button></td>
    `;

    tr.querySelector('button')?.addEventListener('click', () => {
      setValue('branchId', branchId);
      setValue('branchName', branchName);
      ACL_STATE.branchCache.set(branchId, branchName);
      getModal('branchLookupModal')?.hide();
    });

    body.appendChild(tr);
  });
}

function searchLimit() {
  getModal('limitLookupModal')?.show();
}

function clearLimitSearch() {
  setValue('searchLimitId', '');
  setValue('searchLimitClientId', '');
  setValue('searchLimitName', '');
  renderLimitResults([]);
}

function searchLimits() {
  const loading = document.getElementById('limitLoading');
  const empty = document.getElementById('limitEmpty');
  loading?.classList.remove('d-none');

  const termLimitId = getValue('searchLimitId').toLowerCase();
  const termClientId = getValue('searchLimitClientId').toLowerCase();
  const termName = getValue('searchLimitName').toLowerCase();

  const results = ACL_STATE.mockLimits.filter((r) => {
    return (!termLimitId || r.limitId.toLowerCase().includes(termLimitId))
      && (!termClientId || r.clientId.toLowerCase().includes(termClientId))
      && (!termName || r.clientName.toLowerCase().includes(termName));
  });

  renderLimitResults(results);
  if (empty) empty.textContent = results.length ? '' : 'No results.';
  const count = document.getElementById('limitResultsCount');
  if (count) count.textContent = results.length ? `${results.length} result(s)` : '';

  loading?.classList.add('d-none');
}

function renderLimitResults(rows) {
  const body = document.getElementById('limitResultsBody');
  if (!body) return;
  body.innerHTML = '';

  (rows || []).forEach((r, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${escapeHtml(r.limitId)}</td>
      <td>${escapeHtml(r.clientId)}</td>
      <td>${escapeHtml(r.clientName)}</td>
      <td>${escapeHtml(r.type)}</td>
      <td class="text-end">${escapeHtml(String(r.amount))}</td>
      <td class="text-end"><button type="button" class="btn btn-sm btn-primary">Select</button></td>
    `;

    tr.querySelector('button')?.addEventListener('click', () => {
      setValue('limitId', r.limitId);
      getModal('limitLookupModal')?.hide();
    });

    body.appendChild(tr);
  });
}

function searchClient() {
  getModal('clientLookupModal')?.show();
}

function clearClientSearch() {
  setValue('searchClientId', '');
  setValue('searchClientName', '');
  renderClientResults([]);
}

function searchClients() {
  const loading = document.getElementById('clientLoading');
  const empty = document.getElementById('clientEmpty');
  loading?.classList.remove('d-none');

  const termId = getValue('searchClientId').toLowerCase();
  const termName = getValue('searchClientName').toLowerCase();

  const results = ACL_STATE.mockClients.filter((r) => {
    return (!termId || r.clientId.toLowerCase().includes(termId))
      && (!termName || r.clientName.toLowerCase().includes(termName));
  });

  renderClientResults(results);
  if (empty) empty.textContent = results.length ? '' : 'No results.';
  const count = document.getElementById('clientResultsCount');
  if (count) count.textContent = results.length ? `${results.length} result(s)` : '';

  loading?.classList.add('d-none');
}

function renderClientResults(rows) {
  const body = document.getElementById('clientResultsBody');
  if (!body) return;
  body.innerHTML = '';

  (rows || []).forEach((r, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${escapeHtml(r.clientId)}</td>
      <td>${escapeHtml(r.clientName)}</td>
      <td>${escapeHtml(r.type)}</td>
      <td>${escapeHtml(r.status)}</td>
      <td class="text-end"><button type="button" class="btn btn-sm btn-primary">Select</button></td>
    `;

    tr.querySelector('button')?.addEventListener('click', () => {
      setValue('clientId', r.clientId);
      getModal('clientLookupModal')?.hide();
    });

    body.appendChild(tr);
  });
}

function searchCurrency() {
  showStatus('Currency lookup not implemented.', 'info');
}

function openLimitClientDetailsModal() {
  const modal = getModal('limitClientDetailsModal');
  const frame = document.getElementById('limitClientDetailsFrame');
  if (!modal || !frame) {
    showStatus('Details modal not available.', 'error');
    return;
  }

  frame.src = '/modules/limits-collateral/client-limit-verification/client-limit-verification.html';
  modal.show();
}

function clearForm() {
  ['effectiveDate', 'referenceNo', 'expiryDate', 'limitId', 'dpDefinition', 'clientId', 'appliedLimit', 'currencyId', 'remarks', 'limitType']
    .forEach((id) => setValue(id, ''));
}

function collectPayload() {
  return {
    branchId: getValue('branchId'),
    referenceNo: getValue('referenceNo'),
    effectiveDate: getValue('effectiveDate'),
    expiryDate: getValue('expiryDate'),
    limitId: getValue('limitId'),
    dpDefinition: getValue('dpDefinition'),
    clientId: getValue('clientId'),
    appliedLimit: getValue('appliedLimit'),
    currencyId: getValue('currencyId'),
    remarks: getValue('remarks'),
    limitType: getValue('limitType'),
    operatorId: getOperatorId()
  };
}

function getBankId() {
  return (
    window.Environment?.BankID ||
    window.Environment?.bankID ||
    window.sessionStorage?.getItem('BankID') ||
    window.sessionStorage?.getItem('bankId') ||
    '00'
  );
}

function getOperatorId() {
  return (
    window.sessionStorage?.getItem('OperatorID') ||
    window.sessionStorage?.getItem('operatorId') ||
    window.sessionStorage?.getItem('username') ||
    ''
  );
}

function getDefaultBranchContext() {
  const envBranchId = window.Environment?.OurBranchID || window.Environment?.BranchID || window.Environment?.branchID || '';
  const envBranchName = window.Environment?.OurBranchName || window.Environment?.BranchName || '';

  const fromStorage = () => {
    const rawAuth = window.localStorage?.getItem('nimble_auth_session');
    const auth = rawAuth ? safeJsonParse(rawAuth) : null;
    if (auth) {
      return {
        branchId: auth.branchID || auth.branchId || auth.OurBranchID || '',
        branchName: auth.branchName || auth.OurBranchName || ''
      };
    }

    const rawSession = window.sessionStorage?.getItem('session');
    const session = rawSession ? safeJsonParse(rawSession) : null;
    if (session) {
      return {
        branchId: session.branchID || session.BranchID || '',
        branchName: session.branchName || session.BranchName || ''
      };
    }

    return { branchId: '', branchName: '' };
  };

  const stored = fromStorage();
  return {
    branchId: String(stored.branchId || envBranchId || '').trim(),
    branchName: String(stored.branchName || envBranchName || '').trim()
  };
}

function validatePayload(p) {
  const errors = [];
  if (!p.branchId) errors.push('Branch ID is required.');
  if (!p.limitId) errors.push('Limit ID is required.');
  if (!p.clientId) errors.push('Client ID is required.');
  if (!p.currencyId) errors.push('Currency ID is required.');
  if (!p.dpDefinition) errors.push('DP Definition is required.');
  if (!p.limitType) errors.push('Limit Type is required.');
  return errors;
}

// Expose handlers for inline onclick attributes in the HTML
window.handleView = handleView;
window.handleAdd = handleAdd;
window.handleEdit = handleEdit;
window.handleSave = handleSave;
window.handleCancel = handleCancel;
window.navigatePrevious = navigatePrevious;
window.navigateNext = navigateNext;
window.searchLimit = searchLimit;
window.searchLimits = searchLimits;
window.clearLimitSearch = clearLimitSearch;
window.searchClient = searchClient;
window.searchClients = searchClients;
window.clearClientSearch = clearClientSearch;
window.searchCurrency = searchCurrency;
window.openLimitClientDetailsModal = openLimitClientDetailsModal;
window.searchBranches = searchBranches;
window.clearBranchSearch = clearBranchSearch;
if (false) {
// Application Client Limit - Kairo Banking Application

// ========== STATE MANAGEMENT ==========
let isEditMode = false;
let currentRecord = null;
let pendingNewRecordFlag = null; // 1 = Add, 0 = Edit

// Snapshot used to restore data when Cancel is pressed in Add/Edit.
let restoreSnapshotOnCancel = null;

// Branch cache for efficient lookups
const branchMap = new Map();

// ========== SERVICES / API INTEGRATION ==========
let applicationClientLimitsServicePromise = null;
let searchServicePromise = null;
let collateralServicePromise = null;
let limitsCollateralServicePromise = null;
let lastClientDetailsLookup = { by: null, value: null };

function getActionButtons() {
  return {
    view: document.querySelector('.btn-action.btn-view'),
    add: document.querySelector('.btn-action.btn-add'),
    edit: document.querySelector('.btn-action.btn-edit'),
    save: document.querySelector('.btn-action.btn-save'),
    cancel: document.querySelector('.btn-action.btn-cancel')
  };
}

function setActionButtonsMode(mode) {
  const buttons = getActionButtons();
  if (!buttons.view || !buttons.add || !buttons.edit || !buttons.save || !buttons.cancel) return;

  const normalized = String(mode || '').trim().toLowerCase();

  // Modes:
  // - initial: before any successful View
  // - viewloaded: record loaded (Edit allowed)
  // - add/edit: data-entry modes (Save/Cancel allowed)
  if (normalized === 'add' || normalized === 'edit') {
    buttons.view.disabled = true;
    buttons.add.disabled = true;
    buttons.edit.disabled = true;
    buttons.save.disabled = false;
    buttons.cancel.disabled = false;
    return;
  }

  if (normalized === 'viewloaded') {
    buttons.view.disabled = false;
    buttons.add.disabled = false;
    buttons.edit.disabled = false;
    buttons.save.disabled = true;
    buttons.cancel.disabled = false;
    return;
  }

  // Default/initial
  buttons.view.disabled = false;
  buttons.add.disabled = false;
  buttons.edit.disabled = true;
  buttons.save.disabled = true;
  buttons.cancel.disabled = true;
}

function captureFormSnapshot() {
  return {
    branchId: (document.getElementById('branchId')?.value || '').trim(),
    branchName: (document.getElementById('branchName')?.value || '').trim(),
    referenceNo: (document.getElementById('referenceNo')?.value || '').trim(),
    limitId: (document.getElementById('limitId')?.value || '').trim(),
    clientId: (document.getElementById('clientId')?.value || '').trim(),
    clientName: (document.getElementById('clientName')?.value || '').trim(),
    currencyId: (document.getElementById('currencyId')?.value || '').trim(),
    currencyName: (document.getElementById('currencyName')?.value || '').trim(),
    limitType: (document.getElementById('limitType')?.value || '').trim(),
    effectiveDate: (document.getElementById('effectiveDate')?.value || '').trim(),
    expiryDate: (document.getElementById('expiryDate')?.value || '').trim(),
    dpDefinition: (document.getElementById('dpDefinition')?.value || '').trim(),
    appliedLimit: (document.getElementById('appliedLimit')?.value || '').trim(),
    remarks: (document.getElementById('remarks')?.value || '').trim(),
    behind: {
      status: (document.getElementById('status')?.value || '').trim(),
      withdrawnDate: (document.getElementById('withdrawnDate')?.value || '').trim(),
      withdrawnReason: (document.getElementById('withdrawnReason')?.value || '').trim(),
      createdBy: (document.getElementById('createdBy')?.value || '').trim(),
      createdOn: (document.getElementById('createdOn')?.value || '').trim()
    }
  };
}

function restoreFormSnapshot(snapshot) {
  if (!snapshot) return;

  const branchIdEl = document.getElementById('branchId');
  const branchNameEl = document.getElementById('branchName');
  if (branchIdEl) branchIdEl.value = snapshot.branchId || '';
  if (branchNameEl) branchNameEl.value = snapshot.branchName || '';

  loadRecord({
    branchId: snapshot.branchId,
    limitId: snapshot.limitId,
    clientId: snapshot.clientId,
    clientName: snapshot.clientName,
    currencyId: snapshot.currencyId,
    currencyName: snapshot.currencyName,
    limitType: snapshot.limitType,
    effectiveDate: snapshot.effectiveDate,
    expiryDate: snapshot.expiryDate,
    dpDefinition: snapshot.dpDefinition,
    appliedLimit: snapshot.appliedLimit,
    remarks: snapshot.remarks,
    referenceNo: snapshot.referenceNo
  });

  const referenceNoEl = document.getElementById('referenceNo');
  if (referenceNoEl) referenceNoEl.value = snapshot.referenceNo || '';

  if (snapshot.behind) {
    const statusEl = document.getElementById('status');
    const withdrawnDateEl = document.getElementById('withdrawnDate');
    const withdrawnReasonEl = document.getElementById('withdrawnReason');
    const createdByEl = document.getElementById('createdBy');
    const createdOnEl = document.getElementById('createdOn');
    if (statusEl) statusEl.value = snapshot.behind.status || '';
    if (withdrawnDateEl) withdrawnDateEl.value = snapshot.behind.withdrawnDate || '';
    if (withdrawnReasonEl) withdrawnReasonEl.value = snapshot.behind.withdrawnReason || '';
    if (createdByEl) createdByEl.value = snapshot.behind.createdBy || '';
    if (createdOnEl) createdOnEl.value = snapshot.behind.createdOn || '';
  }
}

function setLimitIdEnabled(enabled) {
  const limitIdEl = document.getElementById('limitId');
  if (limitIdEl) limitIdEl.disabled = !enabled;

  // Disable/enable the inline search button next to LimitID (if present)
  const container = limitIdEl?.closest('.input-with-search');
  const btn = container?.querySelector('button');
  if (btn) btn.disabled = !enabled;
}

function getDefaultBranchContext() {
  try {
    const raw = window.localStorage?.getItem('nimble_auth_session');
    const session = raw ? JSON.parse(raw) : {};
    const branchId = String(
      session.branchID ||
      session.branchId ||
      window.Environment?.OurBranchID ||
      window.Environment?.defaultOurBranchId ||
      '0101'
    ).trim();
    const branchName = String(
      session.branchName ||
      window.Environment?.OurBranchName ||
      window.Environment?.defaultOurBranchName ||
      ''
    ).trim();
    return { branchId, branchName };
  } catch {
    const branchId = String(window.Environment?.OurBranchID || window.Environment?.defaultOurBranchId || '0101').trim();
    const branchName = String(window.Environment?.OurBranchName || window.Environment?.defaultOurBranchName || '').trim();
    return { branchId, branchName };
  }
}

function getOperatorId() {
  return (
    window.sessionStorage?.getItem('OperatorID') ||
    window.sessionStorage?.getItem('operatorId') ||
    window.sessionStorage?.getItem('username') ||
    'web_portal'
  );
}

function parseRefNoOrDefault() {
  const raw = (document.getElementById('referenceNo')?.value || '').trim();
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function parseSmallIntOrDefault(value, fallback = 0) {
  const n = Number(String(value ?? '').trim());
  if (!Number.isFinite(n)) return fallback;
  const rounded = Math.trunc(n);
  if (rounded > 32767) return 32767;
  if (rounded < -32768) return -32768;
  return rounded;
}

function normalizeOldApiDate(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  // If backend already returns legacy mm/dd/yyyy, keep it.
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;

  // Try ISO date-time.
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${mm}/${dd}/${yyyy}`;
}

function getWorkingDate() {
  return (
    window.Environment?.workingDate ||
    window.Environment?.WorkingDate ||
    ''
  );
}

function getNowIsoNoMs() {
  return new Date().toISOString().split('.')[0];
}

function toAmount(value) {
  const n = Number(String(value ?? '').trim());
  return Number.isFinite(n) ? n : 0;
}

function buildAddEditRequestData(newRecordFlag) {
  const ourBranchId = (document.getElementById('branchId')?.value || window.Environment?.OurBranchID || window.Environment?.defaultOurBranchId || '').trim();
  const operatorId = getOperatorId();
  const refNo = parseRefNoOrDefault();

  // Native date inputs (yyyy-mm-dd) are used for these fields.
  const effectiveDate = getDateIsoValue('effectiveDate', null);
  const expiryDate = getDateIsoValue('expiryDate', null);
  const sanctionedDate = effectiveDate || getWorkingDate() || '';
  const sanctionedLimit = toAmount(document.getElementById('appliedLimit')?.value);
  const workingDate = getWorkingDate() || '';

  const createdBy = (document.getElementById('createdBy')?.value || operatorId || '').trim();
  const createdOn = (document.getElementById('createdOn')?.value || getNowIsoNoMs()).trim();

  return {
    OurBranchID: ourBranchId,
    LimitID: (document.getElementById('limitId')?.value || '').trim(),
    RefNo: refNo,
    ClientID: (document.getElementById('clientId')?.value || '').trim(),
    ChargeAccountID: '',
    CurrencyID: (document.getElementById('currencyId')?.value || '').trim(),
    EffectiveDate: effectiveDate,
    ExpiryDate: expiryDate,
    LimitTypeID: (document.getElementById('limitType')?.value || '').trim(),
    SanctionedDate: sanctionedDate,
    SanctionedLimit: sanctionedLimit,
    DPDefinitionID: (document.getElementById('dpDefinition')?.value || '').trim(),
    DrawingPower: sanctionedLimit,
    Remarks: (document.getElementById('remarks')?.value || '').trim(),
    WorkingDate: workingDate,
    IsChildLimit: false,
    ParentLimitID: '',
    LimitLevel: '',
    CreatedBy: createdBy,
    CreatedOn: createdOn,
    SupervisedBy: '',
    NewRecord: newRecordFlag
  };
}

async function ensureApplicationClientLimitsServiceLoaded() {
  if (window.ApplicationClientLimitsService) return window.ApplicationClientLimitsService;
  if (!window.ServiceLoader?.loadApplicationClientLimitsService) {
    throw new Error('ServiceLoader.loadApplicationClientLimitsService is not available');
  }

  if (!applicationClientLimitsServicePromise) {
    applicationClientLimitsServicePromise = (async () => {
      await window.ServiceLoader.loadApplicationClientLimitsService();
      return window.ApplicationClientLimitsService;
    })();
  }

  return applicationClientLimitsServicePromise;
}

async function ensureSearchServiceLoaded() {
  if (window.SearchService) return window.SearchService;
  if (!window.ServiceLoader?.loadSearchService) {
    throw new Error('ServiceLoader.loadSearchService is not available');
  }

  if (!searchServicePromise) {
    searchServicePromise = (async () => {
      await window.ServiceLoader.loadSearchService();
      return window.SearchService;
    })();
  }

  return searchServicePromise;
}

async function ensureCollateralServiceLoaded() {
  if (window.CollateralService) return window.CollateralService;
  if (!window.ServiceLoader?.loadCollateralService) {
    throw new Error('ServiceLoader.loadCollateralService is not available');
  }

  if (!collateralServicePromise) {
    collateralServicePromise = (async () => {
      await window.ServiceLoader.loadCollateralService();
      return window.CollateralService;
    })();
  }

  return collateralServicePromise;
}

async function ensureLimitsCollateralServiceLoaded() {
  if (window.LimitsCollateralService) return window.LimitsCollateralService;
  if (!window.ServiceLoader?.loadLimitsCollateralService) {
    throw new Error('ServiceLoader.loadLimitsCollateralService is not available');
  }

  if (!limitsCollateralServicePromise) {
    limitsCollateralServicePromise = (async () => {
      await window.ServiceLoader.loadLimitsCollateralService();
      return window.LimitsCollateralService;
    })();
  }

  return limitsCollateralServicePromise;
}

function sanitizeSqlLiteral(value) {
  return String(value ?? '').replace(/'/g, "''");
}

function extractRowsFromSearchResponse(resp) {
  if (!resp) return [];

  const unwrap = (value) => {
    if (!value) return [];

    if (Array.isArray(value)) {
      const first = value[0];
      // Common OldAPI wrapper row: [{ ResponseCode/ResponseMessage, Details: [rows] }]
      if (first && typeof first === 'object' && (first.ResponseCode !== undefined || first.ResponseMessage !== undefined)) {
        if (Array.isArray(first.Details)) return unwrap(first.Details);
        if (Array.isArray(first.Details01)) return unwrap(first.Details01);
      }
      return value;
    }

    if (typeof value === 'object') {
      if (Array.isArray(value.Details)) return unwrap(value.Details);
      if (Array.isArray(value.Details01)) return unwrap(value.Details01);
      if (Array.isArray(value.SearchResults)) return unwrap(value.SearchResults);
      if (Array.isArray(value.data)) return unwrap(value.data);
      if (value.data && typeof value.data === 'object') return unwrap(value.data);
    }

    return [];
  };

  return unwrap(resp);
}

function extractRowsFromClientDetailsResponse(resp) {
  // Common OldAPI shapes:
  // 1) { Details: [ { ResponseCode, ResponseMessage, Details: [rows...] } ] }
  // 2) { Details: [rows...] }
  // 3) { data: [ ... ] } or { data: { Details: [...] } }
  if (!resp) return [];

  const tryUnwrap = (value) => {
    if (!value) return [];

    // Direct rows
    if (Array.isArray(value) && value.length && typeof value[0] === 'object') {
      // If this looks like a status wrapper row, unwrap nested Details.
      const first = value[0];
      if (first && (first.ResponseCode !== undefined || first.ResponseMessage !== undefined)) {
        if (Array.isArray(first.Details)) return tryUnwrap(first.Details);
        if (Array.isArray(first.Details01)) return tryUnwrap(first.Details01);
      }
      return value;
    }

    // Wrapper object
    if (typeof value === 'object') {
      if (Array.isArray(value.Details)) return tryUnwrap(value.Details);
      if (Array.isArray(value.Details01)) return tryUnwrap(value.Details01);
      if (Array.isArray(value.data)) return tryUnwrap(value.data);
    }

    return [];
  };

  const fromDetails = tryUnwrap(resp.Details);
  if (fromDetails.length) return fromDetails;

  const fromData = tryUnwrap(resp.data);
  if (fromData.length) return fromData;

  return [];
}

async function searchWithTableCandidates(tableCandidates, buildRequestData) {
  const svc = await ensureSearchServiceLoaded();
  let lastError = null;

  for (const tableID of tableCandidates) {
    try {
      const requestData = buildRequestData(tableID);
      // eslint-disable-next-line no-await-in-loop
      const resp = await svc.searchClients(requestData);
      // Some invalid TableIDs can still return success but empty Details.
      // Treat success response as final; the caller can display empty state.
      if (resp && resp.success) return resp;
      lastError = new Error(resp?.message || 'Search failed');
    } catch (e) {
      lastError = e;
      // Try next candidate
    }
  }

  throw lastError || new Error('Search failed');
}

function pickFirstValue(obj, keys) {
  for (const key of keys) {
    const v = obj?.[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
}

function normalizeDateForTextInput(value) {
  const s = String(value ?? '').trim();
  if (!s) return '';
  // Common OldAPI/SQL ISO datetime: 2026-01-14T12:24:00 -> 2026-01-14
  if (s.includes('T') && /^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  return s;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatIsoDateToLegacyDisplay(value) {
  const iso = normalizeDateForTextInput(value);
  if (!iso) return '';

  // Already in legacy display format
  if (/^\d{1,2}\/[A-Za-z]{3}\/\d{4}$/.test(iso)) return iso;

  // ISO date: yyyy-mm-dd
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;

  const yyyy = m[1];
  const mm = Number(m[2]);
  const dd = m[3];
  const mon = MONTHS_SHORT[mm - 1] || m[2];
  return `${dd}/${mon}/${yyyy}`;
}

function parseLegacyDisplayToIso(value) {
  const s = String(value ?? '').trim();
  if (!s) return '';
  if (s.includes('T') && /^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/Mmm/YYYY (also tolerate spaces or dashes)
  const legacy = s.match(/^(\d{1,2})[\/\- ]([A-Za-z]{3})[\/\- ](\d{4})$/);
  if (legacy) {
    const dd = legacy[1].padStart(2, '0');
    const monStr = legacy[2].slice(0, 1).toUpperCase() + legacy[2].slice(1).toLowerCase();
    const yyyy = legacy[3];
    const idx = MONTHS_SHORT.indexOf(monStr);
    if (idx >= 0) {
      const mm = String(idx + 1).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  return s;
}

function getDateIsoValue(displayId, isoId) {
  const isoEl = isoId ? document.getElementById(isoId) : null;
  const iso = (isoEl?.value || '').trim();
  if (iso) return parseLegacyDisplayToIso(iso);
  return parseLegacyDisplayToIso(document.getElementById(displayId)?.value || '');
}

function wireLegacyDatePicker(displayId, isoId, buttonId) {
  const displayEl = document.getElementById(displayId);
  const isoEl = document.getElementById(isoId);
  const buttonEl = document.getElementById(buttonId);
  if (!displayEl || !isoEl || !buttonEl) return;

  const isFirefox = /firefox/i.test(navigator.userAgent || '');

  function syncFromIso() {
    displayEl.value = formatIsoDateToLegacyDisplay(isoEl.value || '');
  }

  function syncIsoFromDisplay() {
    const iso = parseLegacyDisplayToIso(displayEl.value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) isoEl.value = iso;
  }

  function ensureIsoInBody() {
    // Some layouts apply `transform` on containers; this changes the containing
    // block for `position: fixed` and makes viewport-based coordinates wrong.
    // Keeping the ISO input under <body> ensures the anchor coords match.
    if (isoEl.dataset.kairoIsoInBody === '1') return;
    try {
      document.body.appendChild(isoEl);
      isoEl.dataset.kairoIsoInBody = '1';
    } catch {
      // If append fails for any reason, fallback to current DOM location.
    }
  }

  buttonEl.addEventListener('click', () => {
    syncIsoFromDisplay();

    ensureIsoInBody();

    // Anchor the native picker to the calendar button (very close to the icon).
    // Compute the coordinates at the time of open (first click can be off if
    // the page is still settling).
    requestAnimationFrame(() => {
      const btnRect = buttonEl.getBoundingClientRect();
      const leftViewport = Math.round(Math.max(0, Math.min(btnRect.left, window.innerWidth - 1)));
      const topViewport = Math.round(Math.max(0, Math.min(btnRect.top, window.innerHeight - 1)));
      const leftPage = Math.round(window.scrollX + btnRect.left);
      const topPage = Math.round(window.scrollY + btnRect.bottom);

      // Firefox anchors the native popup more reliably using page coordinates
      // (absolute positioning), especially inside scrollable/stacked layouts.
      isoEl.style.position = isFirefox ? 'absolute' : 'fixed';
      isoEl.style.left = `${isFirefox ? leftPage : leftViewport}px`;
      isoEl.style.top = `${isFirefox ? topPage : topViewport}px`;
      isoEl.style.width = '1px';
      isoEl.style.height = '1px';
      // Keep it effectively invisible but non-zero for browsers that dislike
      // fully transparent controls for native UI anchoring.
      isoEl.style.opacity = isFirefox ? '0.001' : '0';
      isoEl.style.pointerEvents = 'auto';
      isoEl.style.border = '0';
      isoEl.style.padding = '0';
      isoEl.style.margin = '0';
      isoEl.style.zIndex = '2147483647';

      try {
        if (typeof isoEl.showPicker === 'function') {
          isoEl.showPicker();
        } else {
          isoEl.focus();
          isoEl.click();
        }
      } catch {
        try { isoEl.focus(); } catch {}
      }
    });
  });

  isoEl.addEventListener('change', () => {
    syncFromIso();
  });

  displayEl.addEventListener('blur', () => {
    syncIsoFromDisplay();
    syncFromIso();
  });
}

function pickDetailsSection(payload, sectionKey) {
  if (!payload) return [];

  const direct = payload?.[sectionKey];
  if (Array.isArray(direct)) return direct;

  const fromData = payload?.data?.[sectionKey];
  if (Array.isArray(fromData)) return fromData;

  // Some normalized responses place the raw object under Details/data
  // and keep the original wrapper separately.
  const fromDetails0 = payload?.Details?.[0]?.[sectionKey];
  if (Array.isArray(fromDetails0)) return fromDetails0;

  const fromDataDetails0 = payload?.data?.Details?.[0]?.[sectionKey];
  if (Array.isArray(fromDataDetails0)) return fromDataDetails0;

  return [];
}

function extractLimitClientRows(resp) {
  if (!resp) return { mainRow: null, summaryRow: null, raw: null };

  // CoreApi normalizes most OldAPI responses into { success, data, Details }
  // but we still defensively support raw shapes.
  const payload = (resp.data && typeof resp.data === 'object') ? resp.data : resp;

  const details02 = pickDetailsSection(payload, 'Details02');
  const details01 = pickDetailsSection(payload, 'Details01');
  const details00 = pickDetailsSection(payload, 'Details');

  const mainRow = (details02 && details02.length) ? details02[0] : (details00 && details00.length ? details00[0] : null);
  const summaryRow = (details01 && details01.length) ? details01[0] : null;

  return { mainRow, summaryRow, raw: payload };
}

function mapLimitClientRowToFormData(row) {
  return {
    branchId: pickFirstValue(row, ['OurBranchID', 'BranchID', 'branchId', 'ourBranchId']),
    limitId: String(pickFirstValue(row, ['LimitID', 'LimitId', 'limitId']) || ''),
    clientId: String(pickFirstValue(row, ['ClientID', 'ClientId', 'clientId']) || ''),
    clientName: String(pickFirstValue(row, ['ClientName', 'clientName', 'Name', 'Names', 'ClientFullName', 'ClientNames']) || ''),
    currencyId: String(pickFirstValue(row, ['CurrencyID', 'CurrencyId', 'currencyId', 'CurrID']) || ''),
    limitType: String(pickFirstValue(row, ['LimitType', 'limitType', 'LimitTypeID', 'LimitTypeId']) || ''),
    effectiveDate: normalizeDateForTextInput(pickFirstValue(row, ['EffectiveDate', 'effectiveDate', 'EffDate'])),
    expiryDate: normalizeDateForTextInput(pickFirstValue(row, ['ExpiryDate', 'expiryDate', 'ExpDate'])),
    dpDefinition: String(pickFirstValue(row, ['DPDefinitionID', 'DpDefinitionID', 'DPDefinition', 'DpDefinition', 'dpDefinition', 'DpDef']) || ''),
    appliedLimit: String(pickFirstValue(row, ['Sanctionedlimit', 'SanctionedLimit', 'AppliedLimit', 'appliedLimit', 'LimitAmount', 'Amount']) || ''),
    remarks: String(pickFirstValue(row, ['Remarks', 'remarks', 'Comment', 'Comments']) || ''),
    referenceNo: String(pickFirstValue(row, ['RefNo', 'RefNO', 'ReferenceNo', 'referenceNo']) || '')
  };
}

async function fetchClientNameOnly(clientIdRaw) {
  const clientNameEl = document.getElementById('clientName');
  if (!clientNameEl) return;

  const clientId = String(clientIdRaw || '').trim();
  if (!clientId) {
    clientNameEl.value = '';
    return;
  }

  try {
    const ourBranchId = (document.getElementById('branchId')?.value || window.Environment?.OurBranchID || window.Environment?.defaultOurBranchId || '').trim();
    const operatorId = getOperatorId();
    const safe = sanitizeSqlLiteral(clientId);

    const tableCandidates = ['t_Client', 'clientId', 'Clients'];
    const resp = await searchWithTableCandidates(tableCandidates, (tableID) => ({
      TableID: tableID,
      AdvFilterString: '',
      WhereStmt: `ClientID = '${safe}'`,
      PrevOrNext: '1',
      RefID: '',
      OperatorID: operatorId,
      ModuleID: 1000,
      OurBranchID: ourBranchId
    }));

    const rows = extractRowsFromSearchResponse(resp);
    const first = rows && rows.length ? rows[0] : null;
    const name = first ? String(first.Name || first.Names || first.ClientName || first.clientName || '') : '';
    clientNameEl.value = name;
  } catch (error) {
    console.error('Error fetching client name:', error);
    clientNameEl.value = '';
  }
}

function loadBehindTheSceneFields(mainRow, summaryRow) {
  const statusEl = document.getElementById('status');
  const withdrawnDateEl = document.getElementById('withdrawnDate');
  const withdrawnReasonEl = document.getElementById('withdrawnReason');
  const createdByEl = document.getElementById('createdBy');
  const createdOnEl = document.getElementById('createdOn');

  const statusValue =
    pickFirstValue(summaryRow, ['Status', 'LimitStatus', 'LimitStatusDesc']) ||
    pickFirstValue(mainRow, ['Status', 'LimitStatusID', 'LimitStatus']) || '';

  if (statusEl) statusEl.value = statusValue;

  const withdrawnDateValue = normalizeDateForTextInput(pickFirstValue(summaryRow, ['WithdrawnDate']) || pickFirstValue(mainRow, ['WithdrawnDate']));
  const withdrawnReasonValue = pickFirstValue(summaryRow, ['WithdrawnReason']) || pickFirstValue(mainRow, ['WithdrawnReason']) || '';

  if (withdrawnDateEl) withdrawnDateEl.value = withdrawnDateValue;
  if (withdrawnReasonEl) withdrawnReasonEl.value = withdrawnReasonValue;

  const createdByValue = pickFirstValue(mainRow, ['CreatedBy']) || '';
  const createdOnValue = normalizeDateForTextInput(pickFirstValue(mainRow, ['CreatedOn']) || '');

  if (createdByEl) createdByEl.value = createdByValue;
  if (createdOnEl) createdOnEl.value = createdOnValue;
}

async function fetchAndLoadClientDetails(by, source = 'manual') {
  // While adding/editing, do not auto-fetch and override the user's in-progress changes.
  // Exception: keep Client Name populated when Client ID changes.
  if (isEditMode && by === 'client') {
    const clientIdValue = (document.getElementById('clientId')?.value || '').trim();
    await fetchClientNameOnly(clientIdValue);
    return;
  }
  if (isEditMode) return;

  const limitIdValue = (document.getElementById('limitId')?.value || '').trim();
  const clientIdValue = (document.getElementById('clientId')?.value || '').trim();

  const value = by === 'limit' ? limitIdValue : clientIdValue;
  if (!value) return;

  // De-dupe only successful lookups. If an earlier call failed/returned empty, allow retry.
  if (lastClientDetailsLookup.by === by && lastClientDetailsLookup.value === value) return;

  const ourBranchId = (document.getElementById('branchId')?.value || window.Environment?.OurBranchID || window.Environment?.defaultOurBranchId || '').trim();
  const operatorId = getOperatorId();
  const refNo = parseRefNoOrDefault();

  const requestData = {
    OurBranchID: ourBranchId,
    LimitID: by === 'limit' ? value : null,
    RefNo: refNo,
    ClientID: by === 'client' ? value : null,
    OperatorID: operatorId,
    Direction: 0
  };

  try {
    showStatus('Loading client details...', 'info');
    const svc = await ensureApplicationClientLimitsServiceLoaded();
    const resp = await svc.getClientDetails(requestData);

    if (!resp?.success) {
      showStatus(resp?.message || 'Failed to load client details', 'error');
      return;
    }

    const { mainRow, summaryRow } = extractLimitClientRows(resp);

    if (!mainRow) {
      showStatus('No client details found', 'info');
      return;
    }

    const formData = mapLimitClientRowToFormData(mainRow);

    if (!formData.clientName) {
      formData.clientName = String(pickFirstValue(summaryRow, ['ClientName', 'clientName', 'Name', 'Names', 'ClientFullName', 'ClientNames']) || '');
    }

    // If the backend returns these values, prefer them; otherwise keep what the user keyed.
    if (!formData.limitId && limitIdValue) formData.limitId = limitIdValue;
    if (!formData.clientId && clientIdValue) formData.clientId = clientIdValue;
    if (!formData.referenceNo && document.getElementById('referenceNo')?.value) {
      formData.referenceNo = document.getElementById('referenceNo').value;
    }

    loadRecord(formData);
    // Populate Behind The Scene from Details01/Details02
    loadBehindTheSceneFields(mainRow, summaryRow);
    currentRecord = formData;
    isEditMode = false;
    enableClientLimitFields();

    // Successful View enables Edit.
    restoreSnapshotOnCancel = null;
    setLimitIdEnabled(true);
    setActionButtonsMode('viewLoaded');

    // Mark as successfully fetched so we don't refetch the same key over and over.
    lastClientDetailsLookup = { by, value };

    showStatus(`Client details loaded (${source})`, 'success');
  } catch (error) {
    console.error('Error loading client details:', error);
    showStatus('Error loading client details', 'error');
  }
}

function wireClientDetailsAutoLookup() {
  const limitIdInput = document.getElementById('limitId');
  const clientIdInput = document.getElementById('clientId');

  if (limitIdInput) {
    limitIdInput.addEventListener('blur', () => fetchAndLoadClientDetails('limit', 'limitId.blur'));
    limitIdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        fetchAndLoadClientDetails('limit', 'limitId.enter');
      } else if (e.key === 'Tab') {
        // Some pages rely on Tab navigation; blur will usually fire too.
        // De-dupe inside fetchAndLoadClientDetails prevents double calls.
        setTimeout(() => fetchAndLoadClientDetails('limit', 'limitId.tab'), 0);
      }
    });
  }

  if (clientIdInput) {
    clientIdInput.addEventListener('blur', () => fetchAndLoadClientDetails('client', 'clientId.blur'));
    clientIdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        fetchAndLoadClientDetails('client', 'clientId.enter');
      } else if (e.key === 'Tab') {
        setTimeout(() => fetchAndLoadClientDetails('client', 'clientId.tab'), 0);
      }
    });
  }
}

function buildSelectOptions(selectEl, items, placeholderLabel = '--Select--') {
  if (!selectEl) return;

  const currentValue = String(selectEl.value || '').trim();

  selectEl.innerHTML = '';

  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = placeholderLabel;
  selectEl.appendChild(placeholderOption);

  (items || []).forEach((item) => {
    const value = String(item?.value ?? '').trim();
    const label = String(item?.label ?? '').trim();
    if (!value) return;

    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label || value;
    selectEl.appendChild(opt);
  });

  // Preserve previously selected value where possible.
  if (currentValue) {
    setSelectValueOrFallback(selectEl, currentValue);
  }
}

function setSelectValueOrFallback(selectEl, rawValue) {
  if (!selectEl) return;
  const value = String(rawValue || '').trim();
  if (!value) return;

  selectEl.value = value;
  if (selectEl.value === value) return;

  const target = value.toLowerCase();
  const matchByLabel = Array.from(selectEl.options).find(
    (o) => String(o.textContent || '').trim().toLowerCase() === target
  );
  if (matchByLabel) {
    selectEl.value = matchByLabel.value;
    return;
  }

  // If the value isn't in the list (e.g., backend returns legacy label/code),
  // add a one-off option so the record can still display correctly.
  const tempOption = document.createElement('option');
  tempOption.value = value;
  tempOption.textContent = value;
  tempOption.dataset.temp = '1';
  selectEl.appendChild(tempOption);
  selectEl.value = value;
}

async function loadLimitTypeDropdown() {
  const selectEl = document.getElementById('limitType');
  if (!selectEl) return;

  if (!window.LookupService) {
    console.warn('[ApplicationClientLimit] LookupService is not available; Limit Type dropdown will remain unpopulated.');
    return;
  }

  try {
    const options = (typeof window.LookupService.getLimitTypes === 'function')
      ? await window.LookupService.getLimitTypes()
      : (typeof window.LookupService.getSystemCodeOptions === 'function')
        ? await window.LookupService.getSystemCodeOptions('LimitTypeID')
        : [];

    if (!Array.isArray(options) || !options.length) {
      // Keep placeholder only.
      buildSelectOptions(selectEl, [], '--Select--');
      return;
    }

    buildSelectOptions(selectEl, options, '--Select--');

    // If a record is already loaded, try to re-apply it after options load.
    if (currentRecord?.limitType) {
      setSelectValueOrFallback(selectEl, currentRecord.limitType);
    }
  } catch (e) {
    console.error('[ApplicationClientLimit] Failed to load Limit Types via LookupService (LimitTypeID):', e);
    // Keep placeholder only.
    buildSelectOptions(selectEl, [], '--Select--');
  }
}

async function loadDpDefinitionDropdown() {
  const selectEl = document.getElementById('dpDefinition');
  if (!selectEl) return;

  if (!window.LookupService) {
    console.warn('[ApplicationClientLimit] LookupService is not available; DP Definition dropdown will remain unpopulated.');
    // Keep placeholder only.
    buildSelectOptions(selectEl, [], '--Select--');
    return;
  }

  try {
    const options = (typeof window.LookupService.getSystemCodeOptions === 'function')
      ? await window.LookupService.getSystemCodeOptions('DPDefinitionID')
      : [];

    if (!Array.isArray(options) || !options.length) {
      // Keep placeholder only.
      buildSelectOptions(selectEl, [], '--Select--');
      return;
    }

    buildSelectOptions(selectEl, options, '--Select--');

    // If a record is already loaded, try to re-apply it after options load.
    if (currentRecord?.dpDefinition) {
      setSelectValueOrFallback(selectEl, currentRecord.dpDefinition);
    }
  } catch (e) {
    console.error('[ApplicationClientLimit] Failed to load DP Definition via LookupService (DPDefinitionID):', e);
    // Keep placeholder only.
    buildSelectOptions(selectEl, [], '--Select--');
  }
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
  // Start loading the service in the background; page can still work with mock data if this fails.
  ensureApplicationClientLimitsServiceLoaded().catch(() => void 0);
  ensureSearchServiceLoaded().catch(() => void 0);
  loadLimitTypeDropdown().catch(() => void 0);
  loadDpDefinitionDropdown().catch(() => void 0);
  // Always start with a clean form so the page is ready for new entry/update.
  clearForm();
  initializeForm();
  setupEventListeners();
  enableClientLimitFields();
  setActionButtonsMode('initial');
});

function initializeForm() {
  // Auto-populate branch from session/environment context
  const { branchId, branchName } = getDefaultBranchContext();
  const branchIdEl = document.getElementById('branchId');
  const branchNameEl = document.getElementById('branchName');

  if (branchIdEl) branchIdEl.value = branchId;
  if (branchNameEl) branchNameEl.value = branchName;

  // Only cache when we actually have a name.
  if (branchId && branchName) {
    branchMap.set(branchId, branchName);
  }
}

function setupEventListeners() {
  // Form submit prevention
  document.getElementById('clientLimitForm').addEventListener('submit', function(e) {
    e.preventDefault();
  });

  // Branch ID auto-populate
  const branchIdInput = document.getElementById('branchId');
  branchIdInput.addEventListener('blur', fetchBranchName);
  branchIdInput.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
      fetchBranchName();
    }
  });

  // Lookup button handler
  document.querySelectorAll('.btn-inline-search').forEach(button => {
    button.addEventListener('click', function() {
      const lookupType = this.getAttribute('data-lookup');
      handleLookup(lookupType);
    });
  });

  // Modal keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    const modal = document.getElementById('branchSearchModal');
    if (modal && modal.style.display !== 'none') {
      if (e.key === 'Escape') {
        closeBranchSearch();
      } else if (e.key === 'Enter' && (e.target.id === 'searchBranchId' || e.target.id === 'searchBranchName')) {
        searchBranches();
      }
    }
  });

  // Auto-fetch client details when LimitID/ClientID is keyed in
  wireClientDetailsAutoLookup();
}

// ========== SIDEBAR TOGGLE ==========
function toggleSubmenu(button) {
  const submenu = button.nextElementSibling;
  button.classList.toggle('collapsed');
  submenu.classList.toggle('collapsed');
}

// ========== SEARCH FUNCTIONS ==========
function searchLimit() {
  openLimitSearch();
}

function searchClient() {
  openClientSearch();
}

function searchCurrency() {
  openCurrencySearch();
}

// ========== NAVIGATION FUNCTIONS ==========
function navigatePrevious() {
  showStatus('Navigating to previous record...', 'info');
  // Implement navigation logic
}

function navigateNext() {
  showStatus('Navigating to next record...', 'info');
  // Implement navigation logic
}

// ========== ACTION FUNCTIONS ==========
function handleView() {
  showStatus('View mode activated', 'info');
  enableClientLimitFields();
  isEditMode = false;
  pendingNewRecordFlag = null;
  setActionButtonsMode(currentRecord ? 'viewLoaded' : 'initial');
  setLimitIdEnabled(true);

  const limitId = (document.getElementById('limitId')?.value || '').trim();
  if (!limitId) {
    // Nice behavior: if no LimitID keyed, open search modal.
    openLimitSearch();
    return;
  }

  // Always fetch/wire on View click, even if the same LimitID was loaded before.
  lastClientDetailsLookup = { by: null, value: null };
  fetchAndLoadClientDetails('limit', 'view.click');
}

function handleAdd() {
  showStatus('Add mode activated', 'success');

  // Preserve current/viewed data for Cancel.
  restoreSnapshotOnCancel = currentRecord ? captureFormSnapshot() : null;

  clearForm();
  enableFields();
  isEditMode = true;
  pendingNewRecordFlag = 1;

  // LimitID is DB-generated in Add mode.
  setLimitIdEnabled(false);
  setActionButtonsMode('add');
}

function handleEdit() {
  // Edit should be allowed only after a successful View.
  if (!currentRecord) {
    showStatus('Please View a record before Edit', 'error');
    return;
  }
  showStatus('Edit mode activated', 'success');

  // Preserve current/viewed data for Cancel.
  restoreSnapshotOnCancel = captureFormSnapshot();

  enableFields();
  isEditMode = true;
  pendingNewRecordFlag = 0;

  // Editing requires an existing LimitID.
  setLimitIdEnabled(true);
  setActionButtonsMode('edit');
}

function handleSave() {
  if (!validateForm()) {
    showStatus('Please fill all required fields', 'error');
    return;
  }
  
  showStatus('Saving client limit...', 'info');
  
  // Collect form data
  const formData = {
    branchId: document.getElementById('branchId').value,
    limitId: document.getElementById('limitId').value,
    clientId: document.getElementById('clientId').value,
    currencyId: document.getElementById('currencyId').value,
    limitType: document.getElementById('limitType').value,
    effectiveDate: document.getElementById('effectiveDate').value,
    expiryDate: document.getElementById('expiryDate').value,
    dpDefinition: document.getElementById('dpDefinition').value,
    appliedLimit: document.getElementById('appliedLimit').value,
    remarks: document.getElementById('remarks').value,
    referenceNo: document.getElementById('referenceNo').value
  };
  
  (async () => {
    try {
      const svc = await ensureApplicationClientLimitsServiceLoaded();

      const newRecordFlag =
        pendingNewRecordFlag !== null && pendingNewRecordFlag !== undefined
          ? pendingNewRecordFlag
          : (currentRecord ? 0 : 1);

      const requestData = buildAddEditRequestData(newRecordFlag);
      const resp = await svc.saveLimitClient(requestData);

      if (!resp?.success) {
        showStatus(resp?.message || 'Failed to save client limit', 'error');
        return;
      }

      // Update audit fields (best-effort; backend response shapes vary)
      const operatorId = getOperatorId();
      if (!document.getElementById('createdBy')?.value) {
        document.getElementById('createdBy').value = operatorId;
      }
      if (!document.getElementById('createdOn')?.value) {
        document.getElementById('createdOn').value = getNowIsoNoMs();
      }

      document.getElementById('status').value = 'Active';
      showStatus('Client limit saved successfully', 'success');

      // Exit Add/Edit mode.
      isEditMode = false;
      pendingNewRecordFlag = null;
      restoreSnapshotOnCancel = null;
      setLimitIdEnabled(true);

      // Keep the current data on screen and treat it as the viewed record.
      currentRecord = {
        branchId: (document.getElementById('branchId')?.value || '').trim(),
        limitId: (document.getElementById('limitId')?.value || '').trim(),
        clientId: (document.getElementById('clientId')?.value || '').trim(),
        currencyId: (document.getElementById('currencyId')?.value || '').trim(),
        currencyName: (document.getElementById('currencyName')?.value || '').trim(),
        limitType: (document.getElementById('limitType')?.value || '').trim(),
        effectiveDate: (document.getElementById('effectiveDate')?.value || '').trim(),
        expiryDate: (document.getElementById('expiryDate')?.value || '').trim(),
        dpDefinition: (document.getElementById('dpDefinition')?.value || '').trim(),
        appliedLimit: (document.getElementById('appliedLimit')?.value || '').trim(),
        remarks: (document.getElementById('remarks')?.value || '').trim(),
        referenceNo: (document.getElementById('referenceNo')?.value || '').trim()
      };

      enableClientLimitFields();
      setActionButtonsMode('viewLoaded');
    } catch (error) {
      console.error('[ApplicationClientLimit] Save failed:', error);
      showStatus('Error saving client limit', 'error');
    }
  })();
}

function handleCancel() {
  if (isEditMode) {
    const ok = confirm('Are you sure you want to cancel? All unsaved changes will be lost.');
    if (!ok) return;
  }

  // In View mode (not adding/editing), Cancel clears the screen and returns to initial state.
  if (!isEditMode) {
    clearForm();
    enableClientLimitFields();
    setLimitIdEnabled(true);
    restoreSnapshotOnCancel = null;
    setActionButtonsMode('initial');
    showStatus('Form cleared', 'info');
    return;
  }

  // In Add/Edit, restore previously viewed data if available.
  if (isEditMode && restoreSnapshotOnCancel) {
    restoreFormSnapshot(restoreSnapshotOnCancel);
    currentRecord = {
      branchId: (document.getElementById('branchId')?.value || '').trim(),
      limitId: (document.getElementById('limitId')?.value || '').trim(),
      clientId: (document.getElementById('clientId')?.value || '').trim(),
      currencyId: (document.getElementById('currencyId')?.value || '').trim(),
      currencyName: (document.getElementById('currencyName')?.value || '').trim(),
      limitType: (document.getElementById('limitType')?.value || '').trim(),
      effectiveDate: (document.getElementById('effectiveDate')?.value || '').trim(),
      expiryDate: (document.getElementById('expiryDate')?.value || '').trim(),
      dpDefinition: (document.getElementById('dpDefinition')?.value || '').trim(),
      appliedLimit: (document.getElementById('appliedLimit')?.value || '').trim(),
      remarks: (document.getElementById('remarks')?.value || '').trim(),
      referenceNo: (document.getElementById('referenceNo')?.value || '').trim()
    };
    showStatus('Changes cancelled. Previous data restored.', 'info');
  } else {
    // If there is no previous data to restore, just clear.
    clearForm();
    currentRecord = null;
    showStatus('Form cleared', 'info');
  }

  isEditMode = false;
  pendingNewRecordFlag = null;
  restoreSnapshotOnCancel = null;
  enableClientLimitFields();
  setLimitIdEnabled(true);
  setActionButtonsMode(currentRecord ? 'viewLoaded' : 'initial');
}

// ========== FORM MANAGEMENT ==========
function enableFields() {
  const form = document.getElementById('clientLimitForm');
  const inputs = form.querySelectorAll('input:not([readonly]), select, textarea');
  inputs.forEach(input => {
    if (input.id !== 'branchId') {
      input.disabled = false;
    }
  });
}

function enableClientLimitFields() {
  // Enable only Client Limit Details section fields, keep Behind The Scene disabled
  const clientLimitInputs = [
    'branchId', 'branchName', 'referenceNo', 'limitId', 'clientId', 'currencyId',
    'limitType', 'effectiveDate', 'expiryDate', 'dpDefinition', 'appliedLimit', 'remarks'
  ];
  
  clientLimitInputs.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field && fieldId !== 'branchName') { // branchName should remain readonly
      field.disabled = false;
    }
  });
  
  // Keep Behind The Scene fields disabled (read-only)
  const behindSceneInputs = [
    'status', 'withdrawnDate', 'withdrawnReason', 'createdBy', 'createdOn',
    'chkWithdrawnDate', 'chkSupervisedBy', 'chkModifiedOn', 'chkSupervisedOn'
  ];
  
  behindSceneInputs.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.disabled = true;
    }
  });
}

function disableFields() {
  // Disable all form fields except readonly ones
  const form = document.getElementById('clientLimitForm');
  const inputs = form.querySelectorAll('input:not([readonly]), select, textarea');
  inputs.forEach(input => {
    input.disabled = true;
  });
}

function clearForm() {
  const { branchId, branchName } = getDefaultBranchContext();

  const formEl = document.getElementById('clientLimitForm');
  if (formEl) formEl.reset();

  const branchIdEl = document.getElementById('branchId');
  const branchNameEl = document.getElementById('branchName');
  if (branchIdEl) branchIdEl.value = branchId;
  if (branchNameEl) branchNameEl.value = branchName;
  if (branchId && branchName) branchMap.set(branchId, branchName);
  
  // Clear audit fields
  document.getElementById('status').value = '';
  document.getElementById('withdrawnDate').value = '';
  document.getElementById('withdrawnReason').value = '';
  document.getElementById('createdBy').value = '';
  document.getElementById('createdOn').value = '';

  const modifiedOnCheckbox = document.getElementById('chkModifiedOn');
  const supervisedByCheckbox = document.getElementById('chkSupervisedBy');
  const supervisedOnCheckbox = document.getElementById('chkSupervisedOn');
  const withdrawnDateCheckbox = document.getElementById('chkWithdrawnDate');
  if (modifiedOnCheckbox) modifiedOnCheckbox.checked = false;
  if (supervisedByCheckbox) supervisedByCheckbox.checked = false;
  if (supervisedOnCheckbox) supervisedOnCheckbox.checked = false;
  if (withdrawnDateCheckbox) withdrawnDateCheckbox.checked = false;

  const effectiveDateEl = document.getElementById('effectiveDate');
  const expiryDateEl = document.getElementById('expiryDate');
  if (effectiveDateEl) effectiveDateEl.value = '';
  if (expiryDateEl) expiryDateEl.value = '';

  const clientNameEl = document.getElementById('clientName');
  if (clientNameEl) clientNameEl.value = '';
  
  currentRecord = null;
  isEditMode = false;
  pendingNewRecordFlag = null;
  lastClientDetailsLookup = { by: null, value: null };
}

function loadRecord(data) {
  if (data.branchId) {
    const branchIdEl = document.getElementById('branchId');
    if (branchIdEl) branchIdEl.value = data.branchId;
  }
  document.getElementById('limitId').value = data.limitId || '';
  document.getElementById('clientId').value = data.clientId || '';
  const clientNameEl = document.getElementById('clientName');
  if (clientNameEl) clientNameEl.value = String(data.clientName || '').trim();
  const currencyIdEl = document.getElementById('currencyId');
  if (currencyIdEl) currencyIdEl.value = String(data.currencyId || '').trim();
  const currencyNameEl = document.getElementById('currencyName');
  if (currencyNameEl) currencyNameEl.value = String(data.currencyName || '').trim();
  setSelectValueOrFallback(document.getElementById('limitType'), data.limitType || '');
  document.getElementById('effectiveDate').value = parseLegacyDisplayToIso(data.effectiveDate || '');
  document.getElementById('expiryDate').value = parseLegacyDisplayToIso(data.expiryDate || '');
  setSelectValueOrFallback(document.getElementById('dpDefinition'), data.dpDefinition || '');
  document.getElementById('appliedLimit').value = data.appliedLimit || '';
  document.getElementById('remarks').value = data.remarks || '';
  document.getElementById('referenceNo').value = data.referenceNo || '';
}

function validateForm() {
  const limitId = document.getElementById('limitId').value.trim();
  const clientId = document.getElementById('clientId').value.trim();
  const currencyId = document.getElementById('currencyId').value.trim();
  const limitType = document.getElementById('limitType').value.trim();
  const effectiveDate = document.getElementById('effectiveDate').value.trim();
  const dpDefinition = document.getElementById('dpDefinition').value.trim();

  // LimitID is NOT required for Add (DB-generated). It IS required for Edit.
  const isAdd = pendingNewRecordFlag === 1;
  const limitOk = isAdd ? true : !!limitId;

  return limitOk && clientId && currencyId && limitType && effectiveDate && dpDefinition;
}

// ========== CURRENCY SEARCH MODAL FUNCTIONS (CurrencyID / Description) ==========
let currencySearchResults = [];
let selectedCurrencyIndex = -1;
let selectedCurrencyRecord = null;

function openCurrencySearch() {
  const modal = document.getElementById('currencySearchModal');
  if (!modal) return;
  modal.style.display = 'flex';

  // Show all currencies immediately.
  clearCurrencySearch();
  searchCurrencies();
}

function closeCurrencySearch() {
  const modal = document.getElementById('currencySearchModal');
  if (!modal) return;
  modal.style.display = 'none';
}

function clearCurrencySearch() {
  const idInput = document.getElementById('searchCurrencyId');
  const nameInput = document.getElementById('searchCurrencyName');
  if (idInput) idInput.value = '';
  if (nameInput) nameInput.value = '';

  const body = document.getElementById('currencyResultsBody');
  if (body) {
    body.innerHTML = '<tr><td colspan="3" class="no-results">Enter criteria and click Search</td></tr>';
  }

  currencySearchResults = [];
  selectedCurrencyIndex = -1;
  selectedCurrencyRecord = null;
  const okBtn = document.getElementById('currencyOk');
  if (okBtn) okBtn.disabled = true;

  const loading = document.getElementById('currencyLoading');
  const empty = document.getElementById('currencyEmpty');
  const results = document.getElementById('currencyResults');
  if (loading) loading.style.display = 'none';
  if (empty) empty.style.display = 'none';
  if (results) results.style.display = 'none';
}

function normalizeCurrencyRow(row) {
  return {
    CurrencyID: String(pickFirstValue(row, ['CurrencyID', 'CurrencyId', 'currencyId', 'CurrID']) || '').trim(),
    CurrencyName: String(pickFirstValue(row, ['CurrencyName', 'Currency', 'Description', 'CurrencyDesc', 'CurrencyDescription', 'Desc']) || '').trim()
  };
}

function matchesText(operator, candidate, query) {
  const c = String(candidate || '').trim();
  const q = String(query || '').trim();
  if (!q) return true;

  const cc = c.toLowerCase();
  const qq = q.toLowerCase();

  switch (operator) {
    case 'equals':
      return cc === qq;
    case 'startsWith':
      return cc.startsWith(qq);
    case 'contains':
      return cc.includes(qq);
    case 'like':
    default:
      return cc.includes(qq);
  }
}

async function searchCurrencies() {
  const loading = document.getElementById('currencyLoading');
  const empty = document.getElementById('currencyEmpty');
  const results = document.getElementById('currencyResults');
  if (loading) loading.style.display = 'block';
  if (empty) empty.style.display = 'none';
  if (results) results.style.display = 'none';

  try {
    if (!window.tradeFinanceService?.searchCurrencies) {
      throw new Error('tradeFinanceService.searchCurrencies is not available');
    }

    const resp = await window.tradeFinanceService.searchCurrencies({});
    const rows = extractRowsFromSearchResponse(resp);
    const normalized = rows.map(normalizeCurrencyRow).filter(r => r.CurrencyID);

    const opId = document.getElementById('searchCurrencyIdOperator')?.value || 'like';
    const qId = document.getElementById('searchCurrencyId')?.value || '';
    const opName = document.getElementById('searchCurrencyNameOperator')?.value || 'like';
    const qName = document.getElementById('searchCurrencyName')?.value || '';

    currencySearchResults = normalized.filter(r => matchesText(opId, r.CurrencyID, qId) && matchesText(opName, r.CurrencyName, qName));

    displayCurrencyResults(currencySearchResults);
  } catch (e) {
    console.error('[ApplicationClientLimit] Currency search failed:', e);
    currencySearchResults = [];
    displayCurrencyResults([]);
    showStatus('Currency search failed', 'error');
  } finally {
    if (loading) loading.style.display = 'none';
  }
}

function displayCurrencyResults(currencies) {
  const empty = document.getElementById('currencyEmpty');
  const results = document.getElementById('currencyResults');
  const body = document.getElementById('currencyResultsBody');
  if (!body) return;

  if (!currencies || currencies.length === 0) {
    if (results) results.style.display = 'none';
    if (empty) empty.style.display = 'block';
    body.innerHTML = '<tr><td colspan="3" class="no-results">No results found</td></tr>';
    return;
  }

  if (empty) empty.style.display = 'none';
  if (results) results.style.display = 'block';

  body.innerHTML = currencies
    .map((c, idx) => {
      const id = escapeHtml(c.CurrencyID);
      const name = escapeHtml(c.CurrencyName);
      return `
        <tr onclick="selectCurrencyRow(${idx})" role="button" tabindex="0">
          <td>${idx + 1}</td>
          <td>${id}</td>
          <td>${name}</td>
        </tr>`;
    })
    .join('');
}

function selectCurrencyRow(index) {
  selectedCurrencyIndex = index;
  selectedCurrencyRecord = currencySearchResults[index] || null;

  const rows = document.querySelectorAll('#currencyResultsBody tr');
  rows.forEach(r => r.classList.remove('selected'));
  if (rows[index]) rows[index].classList.add('selected');

  const okBtn = document.getElementById('currencyOk');
  if (okBtn) okBtn.disabled = !selectedCurrencyRecord;
}

function navigateCurrencyPrevious() {
  if (!currencySearchResults.length) return;
  const nextIndex = selectedCurrencyIndex > 0 ? selectedCurrencyIndex - 1 : 0;
  selectCurrencyRow(nextIndex);
}

function navigateCurrencyNext() {
  if (!currencySearchResults.length) return;
  const nextIndex = selectedCurrencyIndex < currencySearchResults.length - 1 ? selectedCurrencyIndex + 1 : currencySearchResults.length - 1;
  selectCurrencyRow(nextIndex);
}

function selectCurrency() {
  if (!selectedCurrencyRecord) return;

  const currencyIdEl = document.getElementById('currencyId');
  const currencyNameEl = document.getElementById('currencyName');
  if (currencyIdEl) currencyIdEl.value = selectedCurrencyRecord.CurrencyID;
  if (currencyNameEl) currencyNameEl.value = selectedCurrencyRecord.CurrencyName;

  closeCurrencySearch();
}

function validateFormHasData() {
  const limitId = document.getElementById('limitId').value.trim();
  return limitId !== '';
}

// ========== STATUS MESSAGES ==========
function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('statusMessage');
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener('keydown', function(e) {
  // Ctrl+S to Save
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    handleSave();
  }
  
  // Escape to Cancel
  if (e.key === 'Escape') {
    handleCancel();
  }
  
  // Ctrl+N for New/Add
  if (e.ctrlKey && e.key === 'n') {
    e.preventDefault();
    handleAdd();
  }
  
  // Ctrl+E for Edit
  if (e.ctrlKey && e.key === 'e') {
    e.preventDefault();
    handleEdit();
  }
});

// ========== BRANCH SEARCH FUNCTIONS ==========
/**
 * Handle lookup button clicks
 */
function handleLookup(type) {
  if (type === 'branch') {
    openBranchSearch();
  }
}

/**
 * Fetch branch name when user tabs out of Branch ID field
 */
async function fetchBranchName() {
  const branchIdInput = document.getElementById('branchId');
  const branchNameInput = document.getElementById('branchName');
  const branchId = (branchIdInput?.value || '').trim();
  
  if (!branchId) {
    if (branchNameInput) branchNameInput.value = '';
    return;
  }
  
  // Check cache first
  const cached = branchMap.get(branchId);
  if (cached) {
    if (branchNameInput) branchNameInput.value = cached;
    return;
  }
  
  try {
    // Use tradeFinanceService.searchBranches({BankID}) and filter client-side.
    let branches = [];

    if (window.tradeFinanceService?.searchBranches) {
      const bankId = String(window.Environment?.BankID || window.Environment?.bankId || '00').trim() || '00';
      const response = await window.tradeFinanceService.searchBranches({ BankID: bankId });
      const rows = extractRowsFromSearchResponse(response);
      branches = rows;
    } else if (window.LookupService?.getBranches) {
      const response = await window.LookupService.getBranches();
      branches = response?.data || response || [];
    }

    const match = (branches || []).find((b) => {
      const id = String(b?.OurBranchID || b?.BranchID || b?.BRANCH_ID || b?.branchId || '').trim();
      return id === branchId;
    });

    const branchName = match ? String(match.BranchName || match.BRANCH_NAME || match.branchName || '').trim() : '';

    if (branchName) {
      if (branchNameInput) branchNameInput.value = branchName;
      branchMap.set(branchId, branchName);
    } else {
      if (branchNameInput) branchNameInput.value = '';
      showStatus('Branch not found', 'error');
    }
  } catch (error) {
    console.error('Error fetching branch:', error);
    if (branchNameInput) branchNameInput.value = '';
    showStatus('Error fetching branch details', 'error');
  }
}

/**
 * Open branch search modal
 */
function openBranchSearch() {
  console.log('[ApplicationClientLimit] Opening branch search modal...');
  const modal = document.getElementById('branchSearchModal');
  if (modal) {
    modal.style.display = 'flex';
    // Clear previous search
    document.getElementById('searchBranchId').value = '';
    document.getElementById('searchBranchName').value = '';
    console.log('[ApplicationClientLimit] Modal opened, calling searchBranches()...');
    // Auto-load all branches
    searchBranches();
  } else {
    console.error('[ApplicationClientLimit] Branch search modal not found!');
  }
}

/**
 * Close branch search modal
 */
function closeBranchSearch() {
  const modal = document.getElementById('branchSearchModal');
  modal.style.display = 'none';
  document.getElementById('searchBranchId').value = '';
  document.getElementById('searchBranchName').value = '';
  document.getElementById('branchResultsBody').innerHTML = '<tr><td colspan="3" class="no-results">Click Search to load branches</td></tr>';
}

/**
 * Search for branches based on filters
 */
async function searchBranches() {
  console.log('[ApplicationClientLimit] searchBranches() called');
  const branchId = document.getElementById('searchBranchId').value.trim();
  const branchName = document.getElementById('searchBranchName').value.trim();
  const resultsBody = document.getElementById('branchResultsBody');
  
  console.log('[ApplicationClientLimit] Search criteria:', { branchId, branchName });
  
  resultsBody.innerHTML = '<tr><td colspan="3" class="no-results">Searching...</td></tr>';
  
  try {
    // Ensure service is available
    console.log('[ApplicationClientLimit] Checking services...', {
      tradeFinanceService: typeof window.tradeFinanceService,
      searchBranches: typeof window.tradeFinanceService?.searchBranches,
      LookupService: typeof window.LookupService,
      getBranches: typeof window.LookupService?.getBranches
    });
    
    if (!window.tradeFinanceService?.searchBranches && !window.LookupService?.getBranches) {
      console.error('[ApplicationClientLimit] No branch service available!');
      resultsBody.innerHTML = '<tr><td colspan="3" class="no-results" style="color: #E74C3C;">Service not available</td></tr>';
      return;
    }

    let response;
    
    // Try tradeFinanceService first
    try {
      if (window.tradeFinanceService?.searchBranches) {
        console.log('[ApplicationClientLimit] Using tradeFinanceService.searchBranches({ BankID: "00" })');
        response = await window.tradeFinanceService.searchBranches({ BankID: "00" });
      } else if (window.LookupService?.getBranches) {
        console.log('[ApplicationClientLimit] Using LookupService.getBranches({ BankID: "00" })');
        response = await window.LookupService.getBranches({ BankID: "00" });
      }
    } catch (apiError) {
      console.error('[ApplicationClientLimit] API call failed:', apiError);
      resultsBody.innerHTML = '<tr><td colspan="3" class="no-results" style="color: #E74C3C;">Failed to load branches. Please check API connection.</td></tr>';
      showStatus('Failed to load branches from API', 'error');
      return;
    }
    
    console.log('[ApplicationClientLimit] Branch search raw response:', response);
    console.log('[ApplicationClientLimit] Response type:', typeof response);
    console.log('[ApplicationClientLimit] Response keys:', response ? Object.keys(response) : 'null');

    // Extract branches array (supports wrapped OldAPI response shapes)
    let branches = extractRowsFromSearchResponse(response);

    console.log('[ApplicationClientLimit] Extracted branches:', branches);
    console.log('[ApplicationClientLimit] Branches is array:', Array.isArray(branches));
    console.log('[ApplicationClientLimit] Branches count:', branches?.length || 0);
    
    // Ensure branches is always an array
    if (!Array.isArray(branches)) {
      console.error('[ApplicationClientLimit] Branches is not an array, setting to empty array');
      branches = [];
    }
    
    if (branches.length > 0) {
      console.log('[ApplicationClientLimit] First branch sample:', branches[0]);
      console.log('[ApplicationClientLimit] First branch keys:', Object.keys(branches[0]));
    }

    // Filter by search criteria
    if (branchId) {
      const lowerSearchId = branchId.toLowerCase();
      branches = branches.filter(b => 
        (String(b.OurBranchID || '')).toLowerCase().includes(lowerSearchId) ||
        (String(b.BranchID || '')).toLowerCase().includes(lowerSearchId) ||
        (String(b.BRANCH_ID || '')).toLowerCase().includes(lowerSearchId)
      );
    }

    if (branchName) {
      const lowerSearchName = branchName.toLowerCase();
      branches = branches.filter(b => 
        (String(b.BranchName || b.BRANCH_NAME || '')).toLowerCase().includes(lowerSearchName)
      );
    }
    
    if (branches.length === 0) {
      resultsBody.innerHTML = '<tr><td colspan="3" class="no-results">No branches found</td></tr>';
      return;
    }
    
    // Populate results table
    resultsBody.innerHTML = branches.map(branch => {
      const id = escapeHtml(branch.OurBranchID || branch.BranchID || branch.BRANCH_ID || '');
      const name = escapeHtml(branch.BranchName || branch.BRANCH_NAME || '');
      const regionId = escapeHtml(branch.RegionID || '');
      
      return `
        <tr onclick="selectBranch('${id}', '${name}')">
          <td>${id}</td>
          <td>${name}</td>
          <td>${regionId}</td>
        </tr>
      `;
    }).join('');
    
    // Cache results
    branches.forEach(branch => {
      const id = branch.OurBranchID || branch.BranchID || '';
      const name = branch.BranchName || '';
      if (id && name) {
        branchMap.set(id, name);
      }
    });
    
  } catch (error) {
    console.error('Error searching branches:', error);
    resultsBody.innerHTML = '<tr><td colspan="3" class="no-results">Error loading branches</td></tr>';
    showStatus('Error searching branches', 'error');
  }
}

/**
 * Select a branch from search results
 */
function selectBranch(branchId, branchName) {
  document.getElementById('branchId').value = branchId;
  document.getElementById('branchName').value = branchName;
  branchMap.set(branchId, branchName);
  closeBranchSearch();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========== MODAL FUNCTIONS ==========
// ========== LIMIT SEARCH FUNCTIONS ==========
let limitSearchResults = [];
let selectedLimitIndex = -1;
let selectedLimitRecord = null;

function openLimitSearch() {
  const modal = document.getElementById('limitSearchModal');
  if (modal) {
    modal.style.display = 'flex';
    // Auto-load with empty search
    searchLimits();
  }
}

function closeLimitSearch() {
  const modal = document.getElementById('limitSearchModal');
  modal.style.display = 'none';
  // Clear search fields
  document.getElementById('searchLimitId').value = '';
  document.getElementById('searchLimitClientId').value = '';
  document.getElementById('searchLimitName').value = '';
  if (document.getElementById('searchLimitIdOperator')) document.getElementById('searchLimitIdOperator').value = 'like';
  if (document.getElementById('searchLimitClientIdOperator')) document.getElementById('searchLimitClientIdOperator').value = 'like';
  if (document.getElementById('searchLimitNameOperator')) document.getElementById('searchLimitNameOperator').value = 'like';
  // Reset state
  limitSearchResults = [];
  selectedLimitIndex = -1;
  selectedLimitRecord = null;
  document.getElementById('limitOk').disabled = true;
  document.getElementById('limitLoading').style.display = 'none';
  document.getElementById('limitEmpty').style.display = 'none';
  document.getElementById('limitResults').style.display = 'none';
  document.getElementById('limitResultsCount').textContent = '';

  const tbody = document.getElementById('limitResultsBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="no-results">Enter criteria and click Search</td>
      </tr>
    `;
  }
}

function clearLimitSearch() {
  document.getElementById('searchLimitId').value = '';
  document.getElementById('searchLimitClientId').value = '';
  document.getElementById('searchLimitName').value = '';
  if (document.getElementById('searchLimitIdOperator')) document.getElementById('searchLimitIdOperator').value = 'like';
  if (document.getElementById('searchLimitClientIdOperator')) document.getElementById('searchLimitClientIdOperator').value = 'like';
  if (document.getElementById('searchLimitNameOperator')) document.getElementById('searchLimitNameOperator').value = 'like';
  limitSearchResults = [];
  selectedLimitIndex = -1;
  selectedLimitRecord = null;
  document.getElementById('limitOk').disabled = true;
  document.getElementById('limitResults').style.display = 'none';
  document.getElementById('limitEmpty').style.display = 'none';
  document.getElementById('limitResultsCount').textContent = '';

  const tbody = document.getElementById('limitResultsBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="no-results">Enter criteria and click Search</td>
      </tr>
    `;
  }
}

function normalizeSearchValue(value) {
  return String(value || '').trim().toLowerCase();
}

function matchesOperator(operator, candidate, query) {
  const q = normalizeSearchValue(query);
  if (!q) return true;

  const c = normalizeSearchValue(candidate);
  switch (operator) {
    case 'equals':
      return c === q;
    case 'startsWith':
      return c.startsWith(q);
    case 'contains':
    case 'like':
    default:
      return c.includes(q);
  }
}

async function searchLimits() {
  const limitId = document.getElementById('searchLimitId').value.trim();
  const clientId = document.getElementById('searchLimitClientId').value.trim();
  const name = document.getElementById('searchLimitName').value.trim();

  const limitIdOp = document.getElementById('searchLimitIdOperator')?.value || 'like';
  const clientIdOp = document.getElementById('searchLimitClientIdOperator')?.value || 'like';
  const nameOp = document.getElementById('searchLimitNameOperator')?.value || 'like';
  
  const loadingDiv = document.getElementById('limitLoading');
  const emptyDiv = document.getElementById('limitEmpty');
  const resultsDiv = document.getElementById('limitResults');
  const countEl = document.getElementById('limitResultsCount');
  
  loadingDiv.style.display = 'block';
  emptyDiv.style.display = 'none';
  resultsDiv.style.display = 'none';
  document.getElementById('limitOk').disabled = true;
  selectedLimitIndex = -1;
  selectedLimitRecord = null;
  
  try {
    const ourBranchId = (document.getElementById('branchId')?.value || window.Environment?.OurBranchID || window.Environment?.defaultOurBranchId || '0101').trim();
    const operatorId = getOperatorId();

    // Prefer SearchKey-based filtering (per backend sample) to avoid relying on column names.
    // Priority: LimitID -> ClientID -> Name.
    const searchKey = limitId || clientId || name || null;

    const tableCandidates = ['LimitClientID', 't_Limit', 'Limits'];

    const resp = await searchWithTableCandidates(tableCandidates, (tableID) => ({
      TableID: tableID,
      AdvFilterString: '',
      WhereStmt: '',
      PrevOrNext: 0,
      RefID: null,
      OperatorID: operatorId,
      // Per provided sample: ModuleID=5552 for LimitClientID.
      // Fall back to 1000 for other table IDs.
      ModuleID: tableID === 'LimitClientID' ? 5552 : 1000,
      OurBranchID: ourBranchId,
      SearchKey: searchKey,
      LanguageID: 'en'
    }));

    const rows = extractRowsFromSearchResponse(resp);

    loadingDiv.style.display = 'none';

    if (!rows.length) {
      emptyDiv.style.display = 'block';
      countEl.textContent = '';
      return;
    }

    const mapped = rows.map((row) => ({
      limitId: String(row.LimitID || row.LimitId || row.limitId || ''),
      clientId: String(row.ClientID || row.ClientId || row.clientId || ''),
      clientName: String(row.Name || row.ClientName || row.Names || row.clientName || ''),
      effectiveDate: String(
        row.EffectiveDate ||
        row.Effective_Date ||
        row.EffectiveDt ||
        row.EffectiveOn ||
        row.EffectiveFrom ||
        row.effectiveDate ||
        ''
      )
    })).filter((r) => r.limitId);

    // Operator-driven filtering (legacy parity): apply AND across all filled fields.
    const filtered = mapped.filter((r) =>
      matchesOperator(limitIdOp, r.limitId, limitId) &&
      matchesOperator(clientIdOp, r.clientId, clientId) &&
      matchesOperator(nameOp, r.clientName, name)
    );

    if (!filtered.length) {
      limitSearchResults = [];
      countEl.textContent = '';
      resultsDiv.style.display = 'none';
      emptyDiv.style.display = 'block';
      displayLimitResults([]);
      return;
    }

    limitSearchResults = filtered;
    countEl.textContent = `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`;
    displayLimitResults(filtered);
    resultsDiv.style.display = 'block';
  } catch (error) {
    console.error('Error searching limits:', error);
    loadingDiv.style.display = 'none';
    emptyDiv.style.display = 'block';
    countEl.textContent = '';
    showStatus('Error searching limits', 'error');
  }
}

function displayLimitResults(limits) {
  const tbody = document.getElementById('limitResultsBody');
  if (!tbody) return;

  if (!limits || !limits.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="no-results">No results found</td>
      </tr>
    `;
    document.getElementById('limitOk').disabled = true;
    selectedLimitIndex = -1;
    selectedLimitRecord = null;
    updateLimitNavigation();
    return;
  }

  tbody.innerHTML = limits.map((limit, index) => {
    const selectedClass = index === selectedLimitIndex ? 'selected' : '';
    return `
      <tr onclick="selectLimitRow(${index})" ondblclick="applyLimitFromRow(${index})" class="${selectedClass}" title="Double-click to select">
        <td style="text-align: center; font-weight: 600;">${index + 1}</td>
        <td>${escapeHtml(limit.limitId)}</td>
        <td>${escapeHtml(limit.clientId)}</td>
        <td>${escapeHtml(limit.clientName)}</td>
        <td>${escapeHtml(limit.effectiveDate)}</td>
      </tr>
    `;
  }).join('');

  updateLimitNavigation();
}

function selectLimitRow(index) {
  selectedLimitIndex = index;
  selectedLimitRecord = limitSearchResults[index];
  
  // Update UI to highlight selected row
  const rows = document.querySelectorAll('#limitResultsBody tr');
  rows.forEach((row, i) => {
    if (i === index) {
      row.classList.add('selected');
    } else {
      row.classList.remove('selected');
    }
  });
  
  // Enable OK button and update navigation
  document.getElementById('limitOk').disabled = false;
  updateLimitNavigation();
}

function updateLimitNavigation() {
  const prevBtn = document.getElementById('limitPrev');
  const nextBtn = document.getElementById('limitNext');
  
  prevBtn.disabled = selectedLimitIndex <= 0;
  nextBtn.disabled = selectedLimitIndex >= limitSearchResults.length - 1;
}

function navigateLimitPrevious() {
  if (selectedLimitIndex > 0) {
    selectLimitRow(selectedLimitIndex - 1);
  }
}

function navigateLimitNext() {
  if (selectedLimitIndex < limitSearchResults.length - 1) {
    selectLimitRow(selectedLimitIndex + 1);
  }
}

function applyLimitFromRow(index) {
  selectLimitRow(index);
  selectLimit();
}

function selectLimit() {
  if (selectedLimitRecord) {
    // Populate form fields
    document.getElementById('limitId').value = selectedLimitRecord.limitId;
    document.getElementById('clientId').value = selectedLimitRecord.clientId;
    
    closeLimitSearch();
    showStatus(`Selected limit: ${selectedLimitRecord.limitId}`, 'success');

    // Ensure selection always triggers a fetch even if the same key was previously loaded.
    lastClientDetailsLookup = { by: null, value: null };

    // Requirement: when LimitID is used, send ClientID as null.
    fetchAndLoadClientDetails('limit', 'limitSearch.select');
  }
}

// ========== CLIENT SEARCH FUNCTIONS ==========
let clientSearchResults = [];
let selectedClientIndex = -1;
let selectedClientRecord = null;

function openClientSearch() {
  const modal = document.getElementById('clientSearchModal');
  if (modal) {
    modal.style.display = 'flex';
    // Auto-load with empty search
    searchClients();
  }
}

function closeClientSearch() {
  const modal = document.getElementById('clientSearchModal');
  modal.style.display = 'none';
  // Clear search fields
  document.getElementById('searchClientId').value = '';
  document.getElementById('searchClientName').value = '';
  if (document.getElementById('searchClientIdOperator')) document.getElementById('searchClientIdOperator').value = 'like';
  if (document.getElementById('searchClientNameOperator')) document.getElementById('searchClientNameOperator').value = 'like';
  // Reset state
  clientSearchResults = [];
  selectedClientIndex = -1;
  selectedClientRecord = null;
  document.getElementById('clientOk').disabled = true;
  document.getElementById('clientLoading').style.display = 'none';
  document.getElementById('clientEmpty').style.display = 'none';
  document.getElementById('clientResults').style.display = 'none';
  document.getElementById('clientResultsCount').textContent = '';

  const tbody = document.getElementById('clientResultsBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="no-results">Enter criteria and click Search</td>
      </tr>
    `;
  }
}

function clearClientSearch() {
  document.getElementById('searchClientId').value = '';
  document.getElementById('searchClientName').value = '';
  if (document.getElementById('searchClientIdOperator')) document.getElementById('searchClientIdOperator').value = 'like';
  if (document.getElementById('searchClientNameOperator')) document.getElementById('searchClientNameOperator').value = 'like';
  clientSearchResults = [];
  selectedClientIndex = -1;
  selectedClientRecord = null;
  document.getElementById('clientOk').disabled = true;
  document.getElementById('clientResults').style.display = 'none';
  document.getElementById('clientEmpty').style.display = 'none';
  document.getElementById('clientResultsCount').textContent = '';

  const tbody = document.getElementById('clientResultsBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="no-results">Enter criteria and click Search</td>
      </tr>
    `;
  }
}

function buildWhereCondition(fieldName, operator, rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) return null;
  const safe = sanitizeSqlLiteral(value);

  switch (operator) {
    case 'equals':
      return `${fieldName} = '${safe}'`;
    case 'startsWith':
      return `${fieldName} like '${safe}%'`;
    case 'contains':
    case 'like':
    default:
      return `${fieldName} like '%${safe}%'`;
  }
}

async function searchClients() {
  const clientId = document.getElementById('searchClientId').value.trim();
  const clientName = document.getElementById('searchClientName').value.trim();

  const clientIdOp = document.getElementById('searchClientIdOperator')?.value || 'like';
  const clientNameOp = document.getElementById('searchClientNameOperator')?.value || 'like';
  
  const loadingDiv = document.getElementById('clientLoading');
  const emptyDiv = document.getElementById('clientEmpty');
  const resultsDiv = document.getElementById('clientResults');
  const countEl = document.getElementById('clientResultsCount');
  
  loadingDiv.style.display = 'block';
  emptyDiv.style.display = 'none';
  resultsDiv.style.display = 'none';
  document.getElementById('clientOk').disabled = true;
  selectedClientIndex = -1;
  selectedClientRecord = null;
  
  try {
    const ourBranchId = (document.getElementById('branchId')?.value || window.Environment?.OurBranchID || window.Environment?.defaultOurBranchId || '0101').trim();
    const operatorId = getOperatorId();

    const whereConditions = [];
    const cIdCond = buildWhereCondition('ClientID', clientIdOp, clientId);
    const nameCond = buildWhereCondition('Name', clientNameOp, clientName);
    if (cIdCond) whereConditions.push(cIdCond);
    if (nameCond) whereConditions.push(nameCond);

    const tableCandidates = ['t_Client', 'clientId', 'Clients'];

    const resp = await searchWithTableCandidates(tableCandidates, (tableID) => ({
      TableID: tableID,
      AdvFilterString: '',
      WhereStmt: whereConditions.join(' AND '),
      PrevOrNext: '1',
      RefID: '',
      OperatorID: operatorId,
      ModuleID: 1000,
      OurBranchID: ourBranchId
    }));

    const rows = extractRowsFromSearchResponse(resp);

    loadingDiv.style.display = 'none';

    if (!rows.length) {
      emptyDiv.style.display = 'block';
      countEl.textContent = '';
      return;
    }

    const mapped = rows.map((row) => ({
      clientId: String(row.ClientID || row.clientId || row.ClientId || ''),
      clientName: String(row.Name || row.Names || row.clientName || row.ClientName || ''),
    })).filter((r) => r.clientId);

    // Operator-driven filtering (legacy parity): apply AND across all filled fields.
    const filtered = mapped.filter((r) =>
      matchesOperator(clientIdOp, r.clientId, clientId) &&
      matchesOperator(clientNameOp, r.clientName, clientName)
    );

    if (!filtered.length) {
      clientSearchResults = [];
      countEl.textContent = '';
      resultsDiv.style.display = 'none';
      emptyDiv.style.display = 'block';
      displayClientResults([]);
      return;
    }

    clientSearchResults = filtered;
    countEl.textContent = `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`;
    displayClientResults(filtered);
    resultsDiv.style.display = 'block';
  } catch (error) {
    console.error('Error searching clients:', error);
    loadingDiv.style.display = 'none';
    emptyDiv.style.display = 'block';
    countEl.textContent = '';
    showStatus('Error searching clients', 'error');
  }
}

function displayClientResults(clients) {
  const tbody = document.getElementById('clientResultsBody');
  if (!tbody) return;

  if (!clients || !clients.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="no-results">No results found</td>
      </tr>
    `;
    document.getElementById('clientOk').disabled = true;
    selectedClientIndex = -1;
    selectedClientRecord = null;
    updateClientNavigation();
    return;
  }

  tbody.innerHTML = clients.map((client, index) => {
    const selectedClass = index === selectedClientIndex ? 'selected' : '';
    return `
      <tr onclick="selectClientRow(${index})" ondblclick="applyClientFromRow(${index})" class="${selectedClass}" title="Double-click to select">
        <td style="text-align: center; font-weight: 600;">${index + 1}</td>
        <td>${escapeHtml(client.clientId)}</td>
        <td>${escapeHtml(client.clientName)}</td>
      </tr>
    `;
  }).join('');

  updateClientNavigation();
}

function selectClientRow(index) {
  selectedClientIndex = index;
  selectedClientRecord = clientSearchResults[index];
  
  // Update UI to highlight selected row
  const rows = document.querySelectorAll('#clientResultsBody tr');
  rows.forEach((row, i) => {
    if (i === index) {
      row.classList.add('selected');
    } else {
      row.classList.remove('selected');
    }
  });
  
  // Enable OK button and update navigation
  document.getElementById('clientOk').disabled = false;
  updateClientNavigation();
}

function updateClientNavigation() {
  const prevBtn = document.getElementById('clientPrev');
  const nextBtn = document.getElementById('clientNext');
  
  prevBtn.disabled = selectedClientIndex <= 0;
  nextBtn.disabled = selectedClientIndex >= clientSearchResults.length - 1;
}

function navigateClientPrevious() {
  if (selectedClientIndex > 0) {
    selectClientRow(selectedClientIndex - 1);
  }
}

function navigateClientNext() {
  if (selectedClientIndex < clientSearchResults.length - 1) {
    selectClientRow(selectedClientIndex + 1);
  }
}

function applyClientFromRow(index) {
  selectClientRow(index);
  selectClient();
}

function selectClient() {
  if (selectedClientRecord) {
    // Populate form fields
    document.getElementById('clientId').value = selectedClientRecord.clientId;
    const clientNameEl = document.getElementById('clientName');
    if (clientNameEl) clientNameEl.value = String(selectedClientRecord.clientName || '').trim();
    
    closeClientSearch();
    showStatus(`Selected client: ${selectedClientRecord.clientName}`, 'success');

    // Ensure selection always triggers a fetch even if the same key was previously loaded.
    lastClientDetailsLookup = { by: null, value: null };

    // Requirement: when ClientID is used, send LimitID as null.
    fetchAndLoadClientDetails('client', 'clientSearch.select');
  }
}

/**
 * Open Limit Client Details Modal
 */
function openLimitClientDetailsModal() {
  openCollateralDetails();
}

// ========== COLLATERAL DETAILS MODAL FUNCTIONS ==========
let collateralItems = [];
let selectedCollateralIndex = -1;
let collateralMode = 'view'; // view | add | edit
let collateralRestoreSnapshot = null;
let collateralModalWired = false;
let collateralLookupWired = false;
let collateralLookupInFlight = false;
let lastCollateralLookupSignature = '';
let lastCollateralLookupAt = 0;

function getCollateralContext() {
  const ourBranchId = (document.getElementById('branchId')?.value || window.Environment?.OurBranchID || window.Environment?.defaultOurBranchId || '').trim();
  const limitId = (document.getElementById('limitId')?.value || '').trim();
  const operatorId = getOperatorId();
  return { ourBranchId, limitId, operatorId };
}

function getCollateralRequestArgs() {
  const collateralIdRaw = (document.getElementById('col_collateralId')?.value || '').trim();
  const refNoRaw = (document.getElementById('col_collateralReferenceNo')?.value || '').trim();

  // Requirement: default open should fetch the grid using main-form OurBranchID/LimitID/RefNo.
  // CollateralID is NOT mandatory; when empty (or explicitly "NULL"), send null.
  const collateralId = (() => {
    if (!collateralIdRaw) return null;
    const upper = collateralIdRaw.toUpperCase();
    if (upper === 'NULL' || upper === 'N') return null;
    return collateralIdRaw;
  })();

  const refNo = refNoRaw ? parseSmallIntOrDefault(refNoRaw, 0) : parseSmallIntOrDefault(parseRefNoOrDefault(), 0);

  return { collateralId, refNo };
}

function seedCollateralKeysFromMainForm() {
  // Requirement: LimitID, OurBranchID, RefNo and CollateralID on sub form are populated automatically from the main form.
  // - OurBranchID/LimitID are read directly from main form when building the request.
  // - RefNo comes from main form's Reference No.
  // - CollateralID: if main form ever provides it (future), we can wire it here.
  const mainRefNo = parseRefNoOrDefault();

  const refNoEl = document.getElementById('col_collateralReferenceNo');
  if (refNoEl && !String(refNoEl.value || '').trim()) {
    refNoEl.value = mainRefNo ? String(mainRefNo) : '';
  }

  // CollateralID has no main-form field in the current screen, so we keep the modal's value.
  // If you add a main-form CollateralID later, wire it here.
}

async function triggerCollateralLookup(source = 'manual') {
  // Requirement: allow user to enter Collateral ID then press Tab to load dbo.p_GetLimitCollaterals.
  // Do not override while in add/edit entry mode.
  if (collateralMode !== 'view') return;

  const { ourBranchId: contextOurBranchId, limitId: contextLimitId } = getCollateralContext();
  if (!contextLimitId) {
    showStatus('Enter/View a Limit ID first', 'warning');
    return;
  }

  seedCollateralKeysFromMainForm();

  const rawCollateralId = (document.getElementById('col_collateralId')?.value || '').trim();
  if (!rawCollateralId) return;

  // Guard against duplicate triggers (Tab causes both keydown+blur).
  const refNo = parseSmallIntOrDefault(document.getElementById('col_collateralReferenceNo')?.value, 0);
  const signature = `${String(contextOurBranchId).trim()}|${String(contextLimitId).trim()}|${String(rawCollateralId).trim().toUpperCase()}|${String(refNo).trim()}`;
  const now = Date.now();
  if (collateralLookupInFlight) return;
  if (signature && signature === lastCollateralLookupSignature && now - lastCollateralLookupAt < 600) return;

  collateralLookupInFlight = true;
  lastCollateralLookupSignature = signature;
  lastCollateralLookupAt = now;

  try {
    await refreshCollateralItemsFromService();
  } finally {
    collateralLookupInFlight = false;
  }
}

function wireCollateralIdAutoLookup() {
  if (collateralLookupWired) return;
  const collateralIdEl = document.getElementById('col_collateralId');
  if (!collateralIdEl) return;

  collateralIdEl.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      // Allow Tab to move focus first, then run lookup.
      setTimeout(() => void triggerCollateralLookup('collateralId.tab'), 0);
    }
  });

  collateralIdEl.addEventListener('blur', () => {
    void triggerCollateralLookup('collateralId.blur');
  });

  collateralLookupWired = true;
}

function getCollateralSidebarButtons() {
  const modal = document.getElementById('collateralDetailsModal');
  if (!modal) return {};

  const sidebar = modal.querySelector('.collateral-modal-sidebar');
  return {
    add: sidebar?.querySelector('.btn-action.btn-add') || null,
    edit: sidebar?.querySelector('.btn-action.btn-edit') || null,
    save: sidebar?.querySelector('.btn-action.btn-save') || null,
    cancel: sidebar?.querySelector('.btn-action.btn-cancel') || null,
    back: sidebar?.querySelector('.btn-action.btn-back') || null
  };
}

function setCollateralMode(mode) {
  collateralMode = String(mode || 'view').toLowerCase();

  const buttons = getCollateralSidebarButtons();
  const canEdit = collateralMode === 'add' || collateralMode === 'edit';

  // Buttons
  if (buttons.add) buttons.add.disabled = canEdit;
  if (buttons.save) buttons.save.disabled = !canEdit;
  if (buttons.cancel) buttons.cancel.disabled = !canEdit;

  // Edit allowed only when a row is selected and not in entry mode.
  if (buttons.edit) {
    buttons.edit.disabled = canEdit || selectedCollateralIndex < 0;
  }

  // Fields
  const isAdd = collateralMode === 'add';
  const isEdit = collateralMode === 'edit';
  setCollateralFormFieldsEditable(isAdd, isEdit);
}

function setCollateralFormFieldsEditable(isAdd, isEdit) {
  const setFieldState = (id, { disabled, readOnly }) => {
    const el = document.getElementById(id);
    if (!el) return;

    if (disabled === true) el.setAttribute('disabled', 'true');
    else if (disabled === false) el.removeAttribute('disabled');

    if (readOnly === true) el.setAttribute('readonly', 'true');
    else if (readOnly === false) el.removeAttribute('readonly');
  };

  const canEdit = isAdd || isEdit;

  // Editable in Add/Edit
  setFieldState('col_collateralReferenceNo', { disabled: false, readOnly: !canEdit });
  setFieldState('col_apportionedRatio', { disabled: false, readOnly: !canEdit });
  setFieldState('col_margin', { disabled: false, readOnly: !canEdit });
  setFieldState('col_apportionedValue', { disabled: false, readOnly: !canEdit });
  setFieldState('col_assignedDate', { disabled: false, readOnly: !canEdit });

  // CollateralId should be active on form load/view so user can key it in and Tab to load.
  // Keep it locked only while editing an existing record.
  setFieldState('col_collateralId', { disabled: false, readOnly: isEdit });

  // Always readonly/computed
  setFieldState('col_apportionedCollateralValue', { disabled: false, readOnly: true });
  setFieldState('col_netCollateralValue', { disabled: false, readOnly: true });

  // Owner + BTS are always readonly
  const alwaysReadOnly = [
    'col_collateralOwner', 'col_collateralOwnerName', 'col_limitCollateralValue', 'col_usedCollateralValue',
    'col_collateralType', 'col_collateralValue', 'col_collateralStatus', 'col_collateralWithdrawnReason',
    'col_collateralWithdrawnDate', 'col_collateralCreatedBy', 'col_collateralModifiedBy',
    'col_collateralSupervisedBy', 'col_collateralCreatedOn', 'col_collateralModifiedOn', 'col_collateralSupervisedOn'
  ];
  alwaysReadOnly.forEach((id) => setFieldState(id, { disabled: false, readOnly: true }));
}

function openCollateralDetails() {
  const modal = document.getElementById('collateralDetailsModal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling

    // Wire collateral-id auto lookup once per page.
    wireCollateralIdAutoLookup();

    void loadCollateralData();

    // Wire overlay click only once
    if (!collateralModalWired) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          closeCollateralDetails();
        }
      });
      collateralModalWired = true;
    }
    
    // Add escape key listener
    document.addEventListener('keydown', handleCollateralEscapeKey);
  }
}

function closeCollateralDetails() {
  const modal = document.getElementById('collateralDetailsModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore background scrolling
    clearCollateralForm();
    
    // Remove event listener
    document.removeEventListener('keydown', handleCollateralEscapeKey);
  }
}

function handleCollateralEscapeKey(e) {
  if (e.key === 'Escape') {
    closeCollateralDetails();
  }
}

async function loadCollateralData() {
  clearCollateralFormFields();
  collateralItems = [];
  selectedCollateralIndex = -1;
  collateralRestoreSnapshot = null;
  refreshCollateralTable();
  setCollateralMode('view');

  // Populate subform keys from main form before the initial load.
  seedCollateralKeysFromMainForm();

  const { limitId } = getCollateralContext();
  if (!limitId) {
    showStatus('Enter/View a Limit ID first to load collaterals', 'info');
    return;
  }

  await refreshCollateralItemsFromService();
}

function captureCollateralFormSnapshot() {
  const ids = [
    'col_collateralId', 'col_collateralReferenceNo', 'col_apportionedRatio', 'col_margin', 'col_apportionedValue',
    'col_apportionedCollateralValue', 'col_netCollateralValue', 'col_assignedDate',
    'col_collateralOwner', 'col_collateralOwnerName', 'col_limitCollateralValue', 'col_usedCollateralValue',
    'col_collateralType', 'col_collateralValue', 'col_collateralStatus', 'col_collateralWithdrawnReason',
    'col_collateralWithdrawnDate', 'col_collateralCreatedBy', 'col_collateralModifiedBy',
    'col_collateralSupervisedBy', 'col_collateralCreatedOn', 'col_collateralModifiedOn', 'col_collateralSupervisedOn'
  ];

  const snap = {};
  ids.forEach((id) => {
    snap[id] = document.getElementById(id)?.value ?? '';
  });
  return snap;
}

function restoreCollateralFormSnapshot(snapshot) {
  if (!snapshot) return;
  Object.keys(snapshot).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = snapshot[id] ?? '';
  });
}

async function refreshCollateralItemsFromService() {
  try {
    const { ourBranchId, limitId, operatorId } = getCollateralContext();
    if (!ourBranchId || !limitId) return;

    const { collateralId, refNo } = getCollateralRequestArgs();

    showStatus('Loading collaterals...', 'info');
    const svc = await ensureLimitsCollateralServiceLoaded();

    const requestData = {
      OurBranchID: ourBranchId,
      LimitID: limitId,
      // Requirement: on default load, CollateralID can be null (non-mandatory)
      CollateralID: collateralId ?? null,
      // Requirement: default open uses main-form RefNo (seeded into the modal)
      RefNo: parseSmallIntOrDefault(refNo, 0),
      OperatorID: operatorId,
      // Default on load: 0 (as per requirement)
      Direction: 0
    };

    const resp = await svc.getLimitCollaterals(requestData);
    if (!resp?.success) {
      showStatus(resp?.message || 'Failed to load limit collaterals', 'error');
      return;
    }

    const details01Row = Array.isArray(resp?.data?.Details01) ? resp.data.Details01[0] : null;
    const details02 = resp?.data?.Details02;
    const rows = Array.isArray(details02) ? details02 : [];

    collateralItems = rows.map((r) => {
      const apportionedValue = Number(r.ApportionedValue ?? 0) || 0;
      const netCollateralValue = Number(r.NetCollateralValue ?? 0) || 0;
      const ratio = Number(r.ApportionedRatio ?? 0) || 0;
      const margin = Number(r.Margin ?? 0);

      return {
        // Key fields
        limitId: String(r.LimitID ?? '').trim(),
        ourBranchId: String(r.OurBranchID ?? '').trim(),
        collateralId: String(r.CollateralID ?? '').trim(),
        referenceNo: String(r.RefNo ?? '').trim(),

        // Collateral Details
        assignedDate: normalizeOldApiDate(r.AssignedDate),
        apportionedRatio: ratio,
        margin: Number.isFinite(margin) ? margin : 0,
        apportionedValue: apportionedValue,
        apportionedCollateralValue: netCollateralValue,
        netCollateralValue: netCollateralValue,
        collateralName: String(r.CollateralName ?? '').trim(),
        status: String(r.LimitCollateralStatus ?? r.LimitCollateralStatusID ?? '').trim(),
        withdrawnReason: r.WithdrawnReason ?? '',
        withdrawnDate: normalizeOldApiDate(r.WithdrawnDate),

        // Owner Details (Details01)
        owner: String(details01Row?.OwnerClientID ?? '').trim(),
        ownerName: String(details01Row?.OwnerName ?? '').trim(),
        collateralType: String(details01Row?.CollateralTypeName ?? '').trim(),
        collateralValue: String(details01Row?.CollateralValue ?? '').trim(),
        usedCollateralValue: String(details01Row?.UsedCollateralValue ?? '').trim(),
        typeMargin: String(details01Row?.TypeMargin ?? '').trim(),

        // Behind the scene (Details02)
        createdBy: String(r.CreatedBy ?? '').trim(),
        createdOn: String(r.CreatedOn ?? '').trim(),
        modifiedBy: String(r.ModifiedBy ?? '').trim(),
        modifiedOn: String(r.ModifiedOn ?? '').trim(),
        supervisedBy: String(r.SupervisedBy ?? '').trim(),
        supervisedOn: String(r.SupervisedOn ?? '').trim(),
        updateCount: String(r.UpdateCount ?? '').trim()
      };
    }).filter((x) => x.collateralId);

    selectedCollateralIndex = collateralItems.length ? 0 : -1;
    refreshCollateralTable();

    if (selectedCollateralIndex >= 0) {
      selectCollateralRow(selectedCollateralIndex);
      populateCollateralForm(collateralItems[selectedCollateralIndex]);
    }

    setCollateralMode('view');
    showStatus('Collaterals loaded', 'success');
  } catch (e) {
    console.error('Error loading limit collaterals:', e);
    showStatus('Error loading limit collaterals', 'error');
  }
}

function clearCollateralForm() {
  const form = document.getElementById('col_collateralDetailsForm');
  if (form) {
    form.reset();
  }
  collateralItems = [];
  selectedCollateralIndex = -1;
  refreshCollateralTable();
}

async function searchCollateral() {
  const collateralIdEl = document.getElementById('col_collateralId');
  const collateralId = String(collateralIdEl?.value || '').trim();
  if (!collateralId) {
    showStatus('Please enter a Collateral ID to search', 'warning');
    return;
  }

  try {
    showStatus('Searching collateral...', 'info');
    const svc = await ensureCollateralServiceLoaded();
    const ourBranchId = (document.getElementById('branchId')?.value || window.Environment?.OurBranchID || window.Environment?.defaultOurBranchId || '').trim();
    const operatorId = getOperatorId();

    const resp = await svc.getCollaterals({
      OurBranchID: ourBranchId,
      CollateralID: collateralId,
      OperatorID: operatorId,
      Direction: 0
    });

    if (!resp?.success) {
      showStatus(resp?.message || 'Collateral search failed', 'error');
      return;
    }

    const rows = extractRowsFromSearchResponse(resp?.data || resp);
    const row = rows && rows.length ? rows[0] : null;
    if (!row) {
      showStatus('No collateral found', 'info');
      return;
    }

    const ownerClientId = String(row.OwnerClientID || row.OwnerID || row.ClientID || row.ownerClientID || '').trim();
    const collateralTypeId = String(row.CollateralTypeID || row.CollateralType || row.collateralTypeID || '').trim();
    const collateralValue = String(row.CollateralValue || row.Value || row.collateralValue || '').trim();
    const status = String(row.Status || row.CollateralStatus || row.collateralStatus || '').trim();
    const withdrawnReason = String(row.WithdrawnReason || row.WithdrawReason || row.collateralWithdrawnReason || '').trim();
    const withdrawnDate = String(row.WithdrawnDate || row.WithdrawDate || row.collateralWithdrawnDate || '').trim();
    const createdBy = String(row.CreatedBy || row.createdBy || '').trim();
    const createdOn = String(row.CreatedOn || row.createdOn || '').trim();
    const modifiedBy = String(row.ModifiedBy || row.modifiedBy || '').trim();
    const modifiedOn = String(row.ModifiedOn || row.modifiedOn || '').trim();
    const supervisedBy = String(row.SupervisedBy || row.supervisedBy || '').trim();
    const supervisedOn = String(row.SupervisedOn || row.supervisedOn || '').trim();

    const ownerEl = document.getElementById('col_collateralOwner');
    const collateralTypeEl = document.getElementById('col_collateralType');
    const collateralValueEl = document.getElementById('col_collateralValue');
    const collateralStatusEl = document.getElementById('col_collateralStatus');
    const collateralWithdrawnReasonEl = document.getElementById('col_collateralWithdrawnReason');
    const collateralWithdrawnDateEl = document.getElementById('col_collateralWithdrawnDate');
    const createdByEl = document.getElementById('col_collateralCreatedBy');
    const createdOnEl = document.getElementById('col_collateralCreatedOn');
    const modifiedByEl = document.getElementById('col_collateralModifiedBy');
    const modifiedOnEl = document.getElementById('col_collateralModifiedOn');
    const supervisedByEl = document.getElementById('col_collateralSupervisedBy');
    const supervisedOnEl = document.getElementById('col_collateralSupervisedOn');
    if (ownerEl) ownerEl.value = ownerClientId;
    if (collateralTypeEl) collateralTypeEl.value = collateralTypeId;
    if (collateralValueEl) collateralValueEl.value = collateralValue;
    if (collateralStatusEl) collateralStatusEl.value = status;
    if (collateralWithdrawnReasonEl) collateralWithdrawnReasonEl.value = withdrawnReason;
    if (collateralWithdrawnDateEl) collateralWithdrawnDateEl.value = withdrawnDate;
    if (createdByEl) createdByEl.value = createdBy;
    if (createdOnEl) createdOnEl.value = createdOn;
    if (modifiedByEl) modifiedByEl.value = modifiedBy;
    if (modifiedOnEl) modifiedOnEl.value = modifiedOn;
    if (supervisedByEl) supervisedByEl.value = supervisedBy;
    if (supervisedOnEl) supervisedOnEl.value = supervisedOn;

    showStatus('Collateral loaded', 'success');
  } catch (error) {
    console.error('Error searching collateral:', error);
    showStatus('Error searching collateral', 'error');
  }
}

function addCollateralItem() {
  const collateralId = document.getElementById('col_collateralId').value.trim();
  const referenceNo = document.getElementById('col_collateralReferenceNo').value.trim();
  const apportionedRatio = document.getElementById('col_apportionedRatio').value.trim();
  const margin = document.getElementById('col_margin').value.trim();
  const apportionedValue = document.getElementById('col_apportionedValue').value.trim();
  
  if (!collateralId || !apportionedRatio || !margin) {
    showStatus('Please fill required fields: Collateral ID, Apportioned Ratio, Margin', 'error');
    return;
  }
  
  // Calculate net collateral value
  const netValue = (parseFloat(apportionedValue) || 0) * (1 - (parseFloat(margin) || 0) / 100);
  
  const newItem = {
    collateralId,
    referenceNo,
    apportionedRatio: parseFloat(apportionedRatio),
    apportionedValue: parseFloat(apportionedValue) || 0,
    margin: parseFloat(margin),
    netCollateralValue: netValue.toFixed(2)
  };
  
  collateralItems.push(newItem);
  refreshCollateralTable();
  clearCollateralFormFields();
  showStatus('Collateral item added successfully', 'success');
}

function alterCollateralItem() {
  if (selectedCollateralIndex >= 0 && collateralItems[selectedCollateralIndex]) {
    const item = collateralItems[selectedCollateralIndex];
    
    // Populate form with selected item data
    document.getElementById('col_collateralId').value = item.collateralId;
    document.getElementById('col_collateralReferenceNo').value = item.referenceNo;
    document.getElementById('col_apportionedRatio').value = item.apportionedRatio;
    document.getElementById('col_margin').value = item.margin;
    document.getElementById('col_apportionedValue').value = item.apportionedValue;
    
    showStatus('Item loaded for editing', 'info');
  } else {
    showStatus('Please select an item to alter', 'error');
  }
}

function updateCollateralItem() {
  if (selectedCollateralIndex >= 0 && collateralItems[selectedCollateralIndex]) {
    const collateralId = document.getElementById('col_collateralId').value.trim();
    const referenceNo = document.getElementById('col_collateralReferenceNo').value.trim();
    const apportionedRatio = document.getElementById('col_apportionedRatio').value.trim();
    const margin = document.getElementById('col_margin').value.trim();
    const apportionedValue = document.getElementById('col_apportionedValue').value.trim();
    
    if (!collateralId || !apportionedRatio || !margin) {
      showStatus('Please fill required fields: Collateral ID, Apportioned Ratio, Margin', 'error');
      return;
    }
    
    // Calculate net collateral value
    const netValue = (parseFloat(apportionedValue) || 0) * (1 - (parseFloat(margin) || 0) / 100);
    
    // Update the item
    collateralItems[selectedCollateralIndex] = {
      collateralId,
      referenceNo,
      apportionedRatio: parseFloat(apportionedRatio),
      apportionedValue: parseFloat(apportionedValue) || 0,
      margin: parseFloat(margin),
      netCollateralValue: netValue.toFixed(2)
    };
    
    refreshCollateralTable();
    clearCollateralFormFields();
    selectedCollateralIndex = -1;
    showStatus('Collateral item updated successfully', 'success');
  } else {
    showStatus('Please select an item to update', 'error');
  }
}

function clearCollateralTable() {
  if (confirm('Are you sure you want to clear all collateral items?')) {
    collateralItems = [];
    refreshCollateralTable();
    clearCollateralFormFields();
    selectedCollateralIndex = -1;
    showStatus('All collateral items cleared', 'success');
  }
}

function withdrawCollateralItem() {
  if (selectedCollateralIndex >= 0 && collateralItems[selectedCollateralIndex]) {
    if (confirm('Are you sure you want to withdraw this collateral item?')) {
      // Mark as withdrawn (you might want to keep a record instead of removing)
      collateralItems[selectedCollateralIndex].status = 'withdrawn';
      refreshCollateralTable();
      selectedCollateralIndex = -1;
      showStatus('Collateral item withdrawn', 'success');
    }
  } else {
    showStatus('Please select an item to withdraw', 'error');
  }
}

function selectCollateralRow(index) {
  selectedCollateralIndex = index;
  
  // Update UI to highlight selected row
  const rows = document.querySelectorAll('#col_collateralTableBody tr');
  rows.forEach((row, i) => {
    if (i === index) {
      row.classList.add('selected');
    } else {
      row.classList.remove('selected');
    }
  });

  if (collateralMode === 'view' && collateralItems[index]) {
    populateCollateralForm(collateralItems[index]);
    collateralRestoreSnapshot = null;

    // Keep request args in sync with selection
    const collateralIdEl = document.getElementById('col_collateralId');
    const refNoEl = document.getElementById('col_collateralReferenceNo');
    if (collateralIdEl) collateralIdEl.value = collateralItems[index].collateralId || '';
    if (refNoEl) refNoEl.value = collateralItems[index].referenceNo || '';
  }

  // Keep Edit button state in sync
  setCollateralMode(collateralMode);
}

function clearCollateralSelection() {
  selectedCollateralIndex = -1;
  collateralRestoreSnapshot = null;
  clearCollateralFormFields();
  refreshCollateralTable();
  setCollateralMode('view');
  showStatus('Selection cleared', 'info');
}

function refreshCollateralTable() {
  const tbody = document.getElementById('col_collateralTableBody');
  if (!tbody) return;
  
  if (collateralItems.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No records to display.</td></tr>';
    return;
  }
  
  let tableHtml = '';
  collateralItems.forEach((item, index) => {
    const statusClass = item.status === 'withdrawn' ? 'withdrawn' : '';
    tableHtml += `
      <tr onclick="selectCollateralRow(${index})" class="${index === selectedCollateralIndex ? 'selected' : ''} ${statusClass}">
        <td>${escapeHtml(item.collateralId)}</td>
        <td>${escapeHtml(item.referenceNo)}</td>
        <td class="text-right">${item.apportionedRatio}%</td>
        <td class="text-right">${formatCurrency(item.apportionedValue)}</td>
        <td class="text-right">${item.margin}%</td>
        <td class="text-right">${formatCurrency(item.netCollateralValue)}</td>
      </tr>
    `;
  });
  
  tbody.innerHTML = tableHtml;
}

/**
 * Format currency values with proper formatting
 */
function formatCurrency(value) {
  const numValue = parseFloat(value) || 0;
  return numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function clearCollateralFormFields() {
  // Clear all collateral form fields
  const fieldsToClear = [
    'col_collateralId', 'col_collateralReferenceNo', 'col_apportionedRatio', 
    'col_margin', 'col_apportionedValue', 'col_apportionedCollateralValue',
    'col_netCollateralValue', 'col_assignedDate',
    // Owner Details
    'col_collateralOwner', 'col_collateralOwnerName', 'col_limitCollateralValue',
    'col_usedCollateralValue', 'col_collateralType', 'col_collateralValue',
    'col_collateralStatus', 'col_collateralWithdrawnReason', 'col_collateralWithdrawnDate',
    // Behind The Scene
    'col_collateralCreatedBy', 'col_collateralModifiedBy', 'col_collateralSupervisedBy',
    'col_collateralCreatedOn', 'col_collateralModifiedOn', 'col_collateralSupervisedOn'
  ];
  
  fieldsToClear.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.value = '';
    }
  });
}

function saveCollateralDetails() {
  void (async () => {
    const { ourBranchId, limitId, operatorId } = getCollateralContext();
    if (!ourBranchId) {
      showStatus('Branch ID is required', 'error');
      return;
    }
    if (!limitId) {
      showStatus('Limit ID is required', 'error');
      return;
    }

    const collateralId = (document.getElementById('col_collateralId')?.value || '').trim();
    if (!collateralId) {
      showStatus('Collateral ID is required', 'error');
      return;
    }

    if (collateralMode !== 'add' && collateralMode !== 'edit') {
      showStatus('Click Add or Edit before saving', 'warning');
      return;
    }

    try {
      const svc = await ensureLimitsCollateralServiceLoaded();

      const data = {
        OurBranchID: ourBranchId,
        LimitID: limitId,
        CollateralID: collateralId,
        RefNo: parseSmallIntOrDefault(document.getElementById('col_collateralReferenceNo')?.value, 0),
        CollateralType: (document.getElementById('col_collateralType')?.value || '').trim(),
        CollateralValue: (document.getElementById('col_collateralValue')?.value || '').trim(),
        ApportionedValue: (document.getElementById('col_apportionedValue')?.value || '').trim(),
        ApportionmentRate: (document.getElementById('col_apportionedRatio')?.value || '').trim(),
        Remarks: '',
        OperatorID: operatorId
      };

      showStatus('Saving collateral...', 'info');
      const resp = collateralMode === 'add'
        ? await svc.createLimitCollateral(data)
        : await svc.updateLimitCollateral(data);

      if (!resp?.success) {
        showStatus(resp?.message || 'Failed to save collateral', 'error');
        return;
      }

      showStatus('Collateral saved', 'success');
      await refreshCollateralItemsFromService();
      collateralRestoreSnapshot = null;
      setCollateralMode('view');
    } catch (e) {
      console.error('Error saving collateral:', e);
      showStatus('Error saving collateral', 'error');
    }
  })();
}

/**
 * Add a new collateral record - enables form fields for entry
 */
function addCollateralRecord() {
  const { limitId } = getCollateralContext();
  if (!limitId) {
    showStatus('Enter/View a Limit ID first', 'warning');
    return;
  }

  collateralRestoreSnapshot = captureCollateralFormSnapshot();
  selectedCollateralIndex = -1;
  clearCollateralFormFields();
  setCollateralMode('add');
  showStatus('Enter new collateral details', 'info');
}

/**
 * Edit selected collateral record
 */
function editCollateralRecord() {
  if (selectedCollateralIndex < 0 || !collateralItems[selectedCollateralIndex]) {
    showStatus('Please select a collateral item to edit', 'warning');
    return;
  }

  collateralRestoreSnapshot = captureCollateralFormSnapshot();
  populateCollateralForm(collateralItems[selectedCollateralIndex]);
  setCollateralMode('edit');
  showStatus('Editing collateral record', 'info');
}

/**
 * Cancel any unsaved changes
 */
function cancelCollateralChanges() {
  if (collateralRestoreSnapshot) {
    restoreCollateralFormSnapshot(collateralRestoreSnapshot);
  } else if (selectedCollateralIndex >= 0 && collateralItems[selectedCollateralIndex]) {
    populateCollateralForm(collateralItems[selectedCollateralIndex]);
  } else {
    clearCollateralFormFields();
  }

  collateralRestoreSnapshot = null;
  setCollateralMode('view');
  showStatus('Changes cancelled', 'info');
}

async function removeCollateralItem() {
  if (selectedCollateralIndex < 0 || !collateralItems[selectedCollateralIndex]) {
    showStatus('Please select an item to remove', 'warning');
    return;
  }

  const item = collateralItems[selectedCollateralIndex];
  if (!confirm(`Are you sure you want to remove collateral ${item.collateralId}?`)) return;

  try {
    const { ourBranchId, limitId, operatorId } = getCollateralContext();
    if (!ourBranchId || !limitId) {
      showStatus('Branch ID and Limit ID are required', 'error');
      return;
    }

    showStatus('Removing collateral...', 'info');
    const svc = await ensureLimitsCollateralServiceLoaded();
    const resp = await svc.deleteLimitCollateral({
      OurBranchID: ourBranchId,
      LimitID: limitId,
      CollateralID: item.collateralId,
      OperatorID: operatorId
    });

    if (!resp?.success) {
      showStatus(resp?.message || 'Failed to remove collateral', 'error');
      return;
    }

    showStatus('Collateral removed', 'success');
    await refreshCollateralItemsFromService();
  } catch (e) {
    console.error('Error removing collateral:', e);
    showStatus('Error removing collateral', 'error');
  }
}

/**
 * Populate collateral form with item data
 */
function populateCollateralForm(item) {
  if (!item) return;
  
  const fieldMap = {
    'col_collateralId': item.collateralId,
    'col_collateralReferenceNo': item.referenceNo,
    'col_apportionedRatio': item.apportionedRatio,
    'col_margin': item.margin,
    'col_apportionedValue': item.apportionedValue,
    'col_apportionedCollateralValue': item.apportionedCollateralValue ?? item.netCollateralValue,
    'col_netCollateralValue': item.netCollateralValue,
    'col_assignedDate': item.assignedDate,
    'col_collateralOwner': item.owner,
    'col_collateralOwnerName': item.ownerName,
    'col_limitCollateralValue': item.apportionedValue,
    'col_usedCollateralValue': item.usedCollateralValue,
    'col_collateralType': item.collateralType,
    'col_collateralValue': item.collateralValue,
    'col_collateralStatus': item.status,
    'col_collateralWithdrawnReason': item.withdrawnReason,
    'col_collateralWithdrawnDate': item.withdrawnDate,
    'col_collateralCreatedBy': item.createdBy,
    'col_collateralModifiedBy': item.modifiedBy,
    'col_collateralSupervisedBy': item.supervisedBy,
    'col_collateralCreatedOn': item.createdOn,
    'col_collateralModifiedOn': item.modifiedOn,
    'col_collateralSupervisedOn': item.supervisedOn
  };
  
  Object.keys(fieldMap).forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field && fieldMap[fieldId] !== undefined) {
      field.value = fieldMap[fieldId];
    }
  });
}

/**
 * Calculate net collateral value based on apportioned value and margin
 */
function calculateNetCollateralValue() {
  const apportionedValue = parseFloat(document.getElementById('col_apportionedValue')?.value) || 0;
  const margin = parseFloat(document.getElementById('col_margin')?.value) || 0;
  
  const netValue = apportionedValue - (apportionedValue * margin / 100);
  
  const netField = document.getElementById('col_netCollateralValue');
  if (netField) {
    netField.value = netValue.toFixed(2);
  }
  
  // Also update apportioned collateral value
  const apportionedCollateralField = document.getElementById('col_apportionedCollateralValue');
  if (apportionedCollateralField) {
    apportionedCollateralField.value = netValue.toFixed(2);
  }
  
  return netValue;
}

// Add event listeners for automatic calculations
document.addEventListener('DOMContentLoaded', function() {
  const apportionedValueField = document.getElementById('col_apportionedValue');
  const marginField = document.getElementById('col_margin');
  
  if (apportionedValueField) {
    apportionedValueField.addEventListener('input', calculateNetCollateralValue);
  }
  
  if (marginField) {
    marginField.addEventListener('input', calculateNetCollateralValue);
  }
});

}
