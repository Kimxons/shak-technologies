document.addEventListener('DOMContentLoaded', async () => {
  const env = window.Environment || {};
  const session = window.getAuthSession?.() || {};

  const getOperatorId = () =>
    String(env.operatorId || session.operatorId || session.name || 'CSADM').trim();
  const getBranchId = () => String(env.OurBranchID || session.branchId || '').trim();

  // Track current form state (browse, edit, or add)
  let currentFormState = 'browse';
  
  // Expose form state to window for access by child iframes
  Object.defineProperty(window, 'currentFormState', {
    get: () => currentFormState,
    set: (val) => { currentFormState = val; },
    configurable: true                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
  });
  
  // Track update count for edit mode (NewRecord in API payload)
  let currentUpdateCount = 0;
  
  // Track system working date
  const getWorkingDate = () => env.workingDate || new Date().toISOString().split('T')[0];

  const clientIdInput = document.getElementById('ClientId');
  const clientNameInput = document.getElementById('ClientName');
  const centerIdInput = document.getElementById('CenterId');
  const centerNameInput = document.getElementById('CenterName');
  const groupIdInput = document.getElementById('GroupId');
  const groupNameInput = document.getElementById('GroupName');
  const referenceNoInput = document.getElementById('ReferenceNo');
  const seriesInput = document.getElementById('Series');
  const joinOnInput = document.getElementById('JoinOn');

  // Utility: Right-align all numeric fields
  function alignNumericsRight() {
    const numericIds = [
      'MaxGroupLoans', 'MaxGroupLoanLimit', 'MaxOtherLoans', 'MaxOtherLoanLimit',
      // Add more numeric field IDs as needed
    ];
    numericIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.textAlign = 'right';
    });
  }
  alignNumericsRight();
  const maxGroupLoansInput = document.getElementById('MaxGroupLoans');
  const maxGroupLoanLimitInput = document.getElementById('MaxGroupLoanLimit');
  const maxOtherLoansInput = document.getElementById('MaxOtherLoans');
  const maxOtherLoanLimitInput = document.getElementById('MaxOtherLoanLimit');
  const centerLeaderInput = document.getElementById('CenterLeader');

  const behindFields = {
    clientType: document.getElementById('ClientType'),
    savingsAccountId: document.getElementById('SavingsAccountId'),
    clientStatus: document.getElementById('ClientStatus'),
    savingsAmount: document.getElementById('SavingsAmount'),
    registrationDate: document.getElementById('RegistrationDate'),
    closedDate: document.getElementById('ClosedDate'),
    exitDate: document.getElementById('ExitDate'),
    exitReason: document.getElementById('ExitReason'),
    createdBy: document.getElementById('CreatedBy'),
    modifiedBy: document.getElementById('ModifiedBy'),
    supervisedBy: document.getElementById('SupervisedBy'),
    createdOn: document.getElementById('CreatedOn'),
    modifiedOn: document.getElementById('ModifiedOn'),
    supervisedOn: document.getElementById('SupervisedOn')
  };

  function syncFlatpickrInteractivity(inputEl, shouldDisable) {
    if (!inputEl?._flatpickr) return;
    try {
      const fp = inputEl._flatpickr;
      if (fp?.altInput) {
        fp.altInput.disabled = !!shouldDisable;
        fp.altInput.readOnly = !!shouldDisable;
        if (!shouldDisable) {
          fp.altInput.removeAttribute('disabled');
          fp.altInput.removeAttribute('readonly');
          fp.altInput.removeAttribute('aria-disabled');
          fp.altInput.style.pointerEvents = 'auto';
          fp.altInput.style.opacity = '1';
        } else {
          fp.altInput.setAttribute('aria-disabled', 'true');
        }

        // Give the visible input a stable id for CSS targeting/debugging.
        if (!fp.altInput.id && inputEl.id) fp.altInput.id = `${inputEl.id}__alt`;
      }

      // Flatpickr won't open if it was initialized while disabled.
      if (typeof fp.set === 'function') {
        fp.set('clickOpens', !shouldDisable);
        fp.set('allowInput', !shouldDisable);
      }
    } catch {
      // ignore
    }
  }

  function setDisabled(el, disabled = true) {
    if (!el) return;
    const shouldDisable = !!disabled;
    try {
      el.disabled = shouldDisable;
      if (!shouldDisable) {
        // Some controls (date inputs/plugins) may set readonly instead of disabled.
        el.readOnly = false;
        el.removeAttribute('readonly');
        el.removeAttribute('disabled');
        el.removeAttribute('aria-disabled');
        el.style.pointerEvents = 'auto';
        el.style.opacity = '1';
      } else {
        el.setAttribute('aria-disabled', 'true');
      }
    } catch {
      // ignore
    }

    // If Flatpickr upgraded this date field, keep the *visible* altInput in sync.
    syncFlatpickrInteractivity(el, shouldDisable);
  }

  function forceEnableJoinOn() {
    const el = joinOnInput || document.getElementById('JoinOn');
    if (!el) return;
    try {
      el.disabled = false;
      el.readOnly = false;
      el.removeAttribute('disabled');
      el.removeAttribute('readonly');
      el.removeAttribute('aria-disabled');
      el.style.pointerEvents = 'auto';
      el.style.opacity = '1';
    } catch {
      // ignore
    }

    // If JoinOn is a Flatpickr-upgraded date field, enable the visible altInput too.
    syncFlatpickrInteractivity(el, false);
  }

  let joinOnGuardStarted = false;
  function startJoinOnGuard() {
    if (joinOnGuardStarted) return;
    const el = joinOnInput || document.getElementById('JoinOn');
    if (!el) return;
    joinOnGuardStarted = true;

    const shouldForceEnable = () => currentFormState === 'add' || currentFormState === 'edit';

    // If anything toggles disabled/readonly during add/edit, immediately revert.
    const observer = new MutationObserver((mutations) => {
      if (!shouldForceEnable()) return;
      for (const m of mutations) {
        if (m.type === 'attributes' && (m.attributeName === 'disabled' || m.attributeName === 'readonly' || m.attributeName === 'aria-disabled')) {
          forceEnableJoinOn();
          break;
        }
      }
    });

    observer.observe(el, { attributes: true, attributeFilter: ['disabled', 'readonly', 'aria-disabled'] });

    // Belt-and-suspenders: keep it enabled while in add/edit.
    setInterval(() => {
      if (!shouldForceEnable()) return;
      forceEnableJoinOn();
    }, 250);
  }

  function disableById(id) {
    setDisabled(document.getElementById(id), true);
  }

  function disableLookupButton(scope) {
    document
      .querySelectorAll(`[data-cmm-lookup="${scope}"]`)
      .forEach((btn) => setDisabled(btn, true));
  }

  function enableLookupButton(scope) {
    document
      .querySelectorAll(`[data-cmm-lookup="${scope}"]`)
      .forEach((btn) => setDisabled(btn, false));
  }

  function showToast(message, type = 'info') {
    const toast = document.getElementById('formToast');
    if (toast) {
      toast.className = `alert alert-${type} mt-3`;
      toast.textContent = message;
      toast.classList.remove('d-none');
      setTimeout(() => toast.classList.add('d-none'), 5000);
    } else {
      alert(message);
    }
  }

  // Expose showToast to window for access by HTML scripts
  window.showToast = showToast;

  function setFormState(mode) {
    // mode: 'browse' (initial state), 'edit' (after successful view), or 'add' (creating new record)
    currentFormState = mode;
    
    if (mode === 'edit') {
      // Disable browsing controls
      setDisabled(document.querySelector('[data-cmm-action="view"]'), true);
      setDisabled(document.querySelector('[data-cmm-action="add"]'), true);
      setDisabled(clientIdInput, true);
      setDisabled(joinOnInput, false); // Enable Join On in edit mode
      forceEnableJoinOn();
      requestAnimationFrame(forceEnableJoinOn);
      setTimeout(forceEnableJoinOn, 0);
      startJoinOnGuard();
      disableLookupButton('client');

      // Enable editing controls
      setDisabled(document.querySelector('[data-cmm-action="edit"]'), false);
      setDisabled(document.querySelector('[data-cmm-action="delete"]'), false);
      setDisabled(document.querySelector('[data-cmm-action="cancel"]'), false);

      // Disable save for edit (edit will modify existing, not save)
      setDisabled(document.querySelector('[data-cmm-action="save"]'), true);
    } else if (mode === 'add') {
      // Clear all controls first
      clearMemberDetails();

      // Disable data entry controls
      setDisabled(document.querySelector('[data-cmm-action="view"]'), true);
      setDisabled(document.querySelector('[data-cmm-action="add"]'), true);
      setDisabled(document.querySelector('[data-cmm-action="edit"]'), true);
      setDisabled(document.querySelector('[data-cmm-action="delete"]'), true);

      // Enable save and cancel
      setDisabled(document.querySelector('[data-cmm-action="save"]'), false);
      setDisabled(document.querySelector('[data-cmm-action="cancel"]'), false);

      // Enable input fields for adding new record
      setDisabled(clientIdInput, false);
      setDisabled(joinOnInput, false); // Enable Join On in add mode
      enableLookupButton('client');
      setDisabled(centerIdInput, false);
      enableLookupButton('center');
      setDisabled(groupIdInput, false);
      enableLookupButton('group');
      setDisabled(joinOnInput, false);
      forceEnableJoinOn();
      requestAnimationFrame(forceEnableJoinOn);
      setTimeout(forceEnableJoinOn, 0);
      startJoinOnGuard();
    } else {
      // Reset to browse mode
      setDisabled(document.querySelector('[data-cmm-action="view"]'), false);
      setDisabled(document.querySelector('[data-cmm-action="add"]'), false);
      setDisabled(clientIdInput, false);
      enableLookupButton('client');

      // Disable editing controls
      setDisabled(document.querySelector('[data-cmm-action="edit"]'), true);
      setDisabled(document.querySelector('[data-cmm-action="delete"]'), true);
      setDisabled(document.querySelector('[data-cmm-action="cancel"]'), false);

      // Disable save
      setDisabled(document.querySelector('[data-cmm-action="save"]'), true);

      // Disable input fields for add mode
      setDisabled(centerIdInput, true);
      disableLookupButton('center');
      setDisabled(groupIdInput, true);
      disableLookupButton('group');
      setDisabled(joinOnInput, true);
    }
  }

  const pad2 = (n) => String(n).padStart(2, '0');

  function formatDateOnly(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function formatDateTime(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  }

  function setValue(el, value) {
    if (!el) return;
    el.value = value === null || value === undefined ? '' : value;
  }

  function getFirstNonEmptyValue(obj = {}) {
    // Get the first non-empty value from object properties
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const val = obj[key];
        if (val !== null && val !== undefined && val !== '') {
          return val;
        }
      }
    }
    return '';
  }

  function bindMemberDetails(member = {}) {
    setValue(referenceNoInput, member.RefID);
    setValue(seriesInput, member.Series);
    setValue(clientIdInput, member.ClientID);
    setValue(clientNameInput, member.ClientName || getFirstNonEmptyValue(member));
    setValue(centerIdInput, member.GroupID);
    setValue(centerNameInput, member.GroupName);
    setValue(groupIdInput, member.SubGroupID);
    setValue(groupNameInput, member.GroupName || member.GroupLeaderDesc || '');
    if (joinOnInput) {
      const joinDate = formatDateOnly(member.JoinDate);
      joinOnInput.value = joinDate;
    }
    setValue(maxGroupLoansInput, member.MaxGroupLoans);
    setValue(maxGroupLoanLimitInput, member.MaxGroupLoanLimit);
    setValue(maxOtherLoansInput, member.MaxLoans);
    setValue(maxOtherLoanLimitInput, member.MaxLoanLimit);
    if (centerLeaderInput) {
      const isLeader = member.GroupLeaderID || member.GroupLeaderDesc;
      centerLeaderInput.value = isLeader ? 'Yes' : '';
    }

    setValue(behindFields.clientType, member.ClientType);
    setValue(behindFields.savingsAccountId, member.SavingsAccountID);
    setValue(behindFields.clientStatus, member.ClientStatus || member.ClientStatusID);
    setValue(behindFields.savingsAmount, member.SavingsAmount);
    setValue(behindFields.registrationDate, formatDateOnly(member.RegistrationDate));
    setValue(behindFields.closedDate, formatDateOnly(member.ClosedDate));
    setValue(behindFields.exitDate, formatDateOnly(member.ExitDate));
    setValue(behindFields.exitReason, member.ExitTypeDesc || member.ExitTypeID);
    setValue(behindFields.createdBy, member.CreatedBy);
    setValue(behindFields.modifiedBy, member.ModifiedBy);
    setValue(behindFields.supervisedBy, member.SupervisedBy);
    setValue(behindFields.createdOn, formatDateTime(member.CreatedOn || member.FormationDate));
    setValue(behindFields.modifiedOn, formatDateTime(member.ModifiedOn));
    setValue(behindFields.supervisedOn, formatDateTime(member.SupervisedOn));
  }

  function clearMemberDetails() {
    bindMemberDetails({});
  }

  function clearAllControls() {
    clearMemberDetails();
    setFormState('browse');
  }

  // Per requirement: disable these fields on form load
  ;(
    function disableFieldsOnLoad() {
      [
        'ReferenceNo',
        'Series',
        'CenterId',
        'GroupId',
        'JoinOn',
        'MaxGroupLoans',
        'MaxGroupLoanLimit',
        'MaxOtherLoans',
        'MaxOtherLoanLimit',
        'CenterLeader'
      ].forEach(disableById);

      disableLookupButton('center');
      disableLookupButton('group');
    }
  )();

  if (!clientIdInput) return;

  // ───────────────────────────────────────────────────────────────────────────
  // LG-style Lookup Modal (scaffold + search + results + select)
  // ───────────────────────────────────────────────────────────────────────────
  const LOOKUP_MODAL_ID = 'lookupModal';
  const LOOKUP_MODAL_LABEL_ID = 'lookupModalLabel';
  const LOOKUP_SEARCH_INPUT_ID = 'lookupSearchInput';
  const LOOKUP_SEARCH_BTN_ID = 'lookupSearchBtn';
  const LOOKUP_CLEAR_BTN_ID = 'lookupClearBtn';
  const LOOKUP_OK_BTN_ID = 'lookupOkBtn';
  const LOOKUP_RESULTS_HEADER_ID = 'lookupResultsHeader';
  const LOOKUP_RESULTS_BODY_ID = 'lookupResultsBody';
  const LOOKUP_RESULTS_META_ID = 'lookupResultsMeta';

  const LOOKUP_SIMPLE_CONTAINER_ID = 'lookupSimpleSearch';
  const LOOKUP_ADVANCED_CONTAINER_ID = 'lookupAdvancedSearch';
  const LOOKUP_ADVANCED_FORM_ID = 'lookupAdvancedForm';
  const LOOKUP_ADVANCED_SEARCH_BTN_ID = 'lookupAdvancedSearchBtn';
  const LOOKUP_ADVANCED_CLEAR_BTN_ID = 'lookupAdvancedClearBtn';

  let lookupModalInstance = null;
  let activeLookupType = null; // Track which lookup is active: 'client', 'center', 'group'

  let servicesReady = false;
  let servicesPromise = null;

  async function ensureServicesLoaded() {
    if (servicesReady) return;
    if (servicesPromise) return servicesPromise;

    servicesPromise = (async () => {
      const loader = window.ServiceLoader;
      if (!loader?.loadCore || !loader?.loadScript) {
        throw new Error('ServiceLoader not available (services/shared/serviceLoader.js not loaded)');
      }

      await loader.loadCore();

      // Load SearchService for lookup functionality
      if (!window.SearchService) {
        await loader.loadScript('/assets/js/services/shared/searchService.js');
      }

      // Load the microfinance service that backs the lookup.
      if (!window.GroupMemberMaintenanceService) {
        await loader.loadScript('/assets/js/services/microfinance/groupMemberMaintenanceService.js');
      }

      servicesReady = true;
    })();

    return servicesPromise;
  }

  function ensureLookupModal() {
    let modalEl = document.getElementById(LOOKUP_MODAL_ID);
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.className = 'modal fade';
      modalEl.id = LOOKUP_MODAL_ID;
      modalEl.tabIndex = -1;
      modalEl.setAttribute('aria-labelledby', LOOKUP_MODAL_LABEL_ID);
      modalEl.setAttribute('aria-hidden', 'true');

      modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-xl">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title" id="${LOOKUP_MODAL_LABEL_ID}">Lookup</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="row g-2 align-items-end" id="${LOOKUP_SIMPLE_CONTAINER_ID}">
                <div class="col-12 col-lg-8">
                  <label for="${LOOKUP_SEARCH_INPUT_ID}" class="form-label mb-1">Search</label>
                  <input type="text" class="form-control" id="${LOOKUP_SEARCH_INPUT_ID}" placeholder="Type to search..." />
                </div>
                <div class="col-12 col-lg-4 d-flex justify-content-center">
                  <button type="button" class="btn btn-primary" id="${LOOKUP_SEARCH_BTN_ID}">Search</button>
                </div>
              </div>

              <div class="mt-2" id="${LOOKUP_ADVANCED_CONTAINER_ID}">
                <form class="row g-2 align-items-end" id="${LOOKUP_ADVANCED_FORM_ID}" data-lookup-form>
                  <div class="row g-2 align-items-end" data-lookup-scope="client">
                    <div class="col-12 col-lg-3">
                      <label class="form-label mb-1">Client ID</label>
                      <input class="form-control" data-lookup-field="ClientID" placeholder="ClientID" />
                      <select class="form-select form-select-sm mt-1" data-lookup-mode="ClientID">
                        <option value="Like" selected>Like</option>
                        <option value="Exact">Exact</option>
                      </select>
                    </div>
                    <div class="col-12 col-lg-3">
                      <label class="form-label mb-1">Client Name</label>
                      <input class="form-control" data-lookup-field="ClientName" placeholder="ClientName" />
                      <select class="form-select form-select-sm mt-1" data-lookup-mode="ClientName">
                        <option value="Like" selected>Like</option>
                        <option value="Exact">Exact</option>
                      </select>
                    </div>
                    <div class="col-12 col-lg-3">
                      <label class="form-label mb-1">Group ID</label>
                      <input class="form-control" data-lookup-field="GroupID" placeholder="GroupID" />
                      <select class="form-select form-select-sm mt-1" data-lookup-mode="GroupID">
                        <option value="Like" selected>Like</option>
                        <option value="Exact">Exact</option>
                      </select>
                    </div>
                    <div class="col-12 col-lg-3">
                      <label class="form-label mb-1">Group Name</label>
                      <input class="form-control" data-lookup-field="GroupName" placeholder="GroupName" />
                      <select class="form-select form-select-sm mt-1" data-lookup-mode="GroupName">
                        <option value="Like" selected>Like</option>
                        <option value="Exact">Exact</option>
                      </select>
                    </div>
                  </div>

                  <div class="col-12 d-flex justify-content-center mt-2">
                    <button type="button" class="btn btn-primary" id="${LOOKUP_ADVANCED_SEARCH_BTN_ID}">Search</button>
                  </div>
                </form>
              </div>

              <hr class="my-3" />

              <div class="table-responsive">
                <table class="table table-sm table-hover table-striped align-middle cmm-lookup__table">
                  <thead><tr id="${LOOKUP_RESULTS_HEADER_ID}"></tr></thead>
                  <tbody id="${LOOKUP_RESULTS_BODY_ID}"></tbody>
                </table>
              </div>
              <div class="text-muted small" id="${LOOKUP_RESULTS_META_ID}"></div>
            </div>
            <div class="modal-footer bg-primary justify-content-center">
              <button type="button" class="btn" id="${LOOKUP_OK_BTN_ID}" data-bs-dismiss="modal">OK</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modalEl);
    }

    if (!lookupModalInstance && window.bootstrap?.Modal) {
      lookupModalInstance = window.bootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: 'static' });
    }

    return modalEl;
  }

  function setLookupMeta(text) {
    const metaEl = document.getElementById(LOOKUP_RESULTS_META_ID);
    if (metaEl) metaEl.textContent = text || '';
  }

  function clearLookupResults() {
    const headerEl = document.getElementById(LOOKUP_RESULTS_HEADER_ID);
    const bodyEl = document.getElementById(LOOKUP_RESULTS_BODY_ID);
    if (headerEl) headerEl.innerHTML = '';
    if (bodyEl) bodyEl.innerHTML = '';
    setLookupMeta('');
  }

  function renderLookupResults(rows, columns, onSelectRow) {
    const headerEl = document.getElementById(LOOKUP_RESULTS_HEADER_ID);
    const bodyEl = document.getElementById(LOOKUP_RESULTS_BODY_ID);
    if (!headerEl || !bodyEl) return;

    headerEl.innerHTML = '';
    bodyEl.innerHTML = '';

    const headerCells = ['#', ...columns];
    headerCells.forEach((col) => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = col;
      headerEl.appendChild(th);
    });

    rows.forEach((row) => {
      const tr = document.createElement('tr');

      // SearchModal-style selection: click the row (numbered first column)
      tr.tabIndex = 0;
      tr.style.cursor = 'pointer';
      const doSelect = () => {
        try {
          onSelectRow?.(row);
        } finally {
          lookupModalInstance?.hide?.();
        }
      };
      tr.addEventListener('click', (e) => {
        // Avoid double-trigger if inner interactive elements are added later
        if (e.defaultPrevented) return;
        doSelect();
      });
      tr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          doSelect();
        }
      });

      const numTd = document.createElement('td');
      numTd.textContent = String(bodyEl.children.length + 1);
      numTd.style.textAlign = 'center';
      tr.appendChild(numTd);

      columns.forEach((col) => {
        const td = document.createElement('td');
        const val = row?.[col];
        td.textContent = val === null || val === undefined ? '' : String(val);
        tr.appendChild(td);
      });

      bodyEl.appendChild(tr);
    });
  }

  function escapeSqlLikeTerm(term) {
    return String(term || '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "''")
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  }

  function extractSearchRows(searchResult) {
    const candidates = [searchResult?.data, searchResult?.Details, searchResult].filter(Boolean);
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;

      const nested =
        candidate?.Details?.SearchResults ||
        candidate?.Details ||
        candidate?.SearchResults ||
        candidate?.Details?.Details ||
        candidate;

      if (Array.isArray(nested)) return nested;
      if (Array.isArray(nested?.SearchResults)) return nested.SearchResults;
      if (Array.isArray(nested?.Details)) return nested.Details;
    }
    return [];
  }

  async function openClientLookup() {
    ensureLookupModal();
    activeLookupType = 'client';
    
    const titleEl = document.getElementById(LOOKUP_MODAL_LABEL_ID);
    if (titleEl) titleEl.textContent = 'Client Lookup';

    // Show advanced filters (LG-style) for this lookup.
    const simpleContainer = document.getElementById(LOOKUP_SIMPLE_CONTAINER_ID);
    const advancedContainer = document.getElementById(LOOKUP_ADVANCED_CONTAINER_ID);
    if (simpleContainer) simpleContainer.classList.add('d-none');
    if (advancedContainer) advancedContainer.classList.remove('d-none');

    clearLookupResults();

    const inputEl = document.getElementById(LOOKUP_SEARCH_INPUT_ID);
    if (inputEl) inputEl.value = String(clientIdInput.value || '').trim();

    // Show all filters for client lookup
    const advancedForm = document.getElementById(LOOKUP_ADVANCED_FORM_ID);
    if (advancedForm) {
      const clientIdField = advancedForm.querySelector('[data-lookup-field="ClientID"]')?.closest('.col-12');
      const clientNameField = advancedForm.querySelector('[data-lookup-field="ClientName"]')?.closest('.col-12');
      const groupIdField = advancedForm.querySelector('[data-lookup-field="GroupID"]')?.closest('.col-12');
      const groupNameField = advancedForm.querySelector('[data-lookup-field="GroupName"]')?.closest('.col-12');
      
      if (clientIdField) clientIdField.classList.remove('d-none');
      if (clientNameField) clientNameField.classList.remove('d-none');
      if (groupIdField) groupIdField.classList.remove('d-none');
      if (groupNameField) groupNameField.classList.remove('d-none');
    }

    // Prefill advanced ClientID filter.
    const clientIdFilter = advancedForm?.querySelector?.('[data-lookup-field="ClientID"]');
    if (clientIdFilter && !String(clientIdFilter.value || '').trim()) {
      clientIdFilter.value = String(clientIdInput.value || '').trim();
    }

    lookupModalInstance?.show?.();
    
    // Auto-search with pre-filled ClientID if available
    await doLookupSearch();
  }

  async function openCenterLookup() {
    ensureLookupModal();
    activeLookupType = 'center';
    
    const titleEl = document.getElementById(LOOKUP_MODAL_LABEL_ID);
    if (titleEl) titleEl.textContent = 'Center Lookup';

    // Show advanced filters for center lookup
    const simpleContainer = document.getElementById(LOOKUP_SIMPLE_CONTAINER_ID);
    const advancedContainer = document.getElementById(LOOKUP_ADVANCED_CONTAINER_ID);
    if (simpleContainer) simpleContainer.classList.add('d-none');
    if (advancedContainer) advancedContainer.classList.remove('d-none');

    clearLookupResults();

    const inputEl = document.getElementById(LOOKUP_SEARCH_INPUT_ID);
    if (inputEl) inputEl.value = String(centerIdInput.value || '').trim();

    // Show only GroupID and GroupName filters, hide ClientID and ClientName
    const advancedForm = document.getElementById(LOOKUP_ADVANCED_FORM_ID);
    if (advancedForm) {
      const clientIdField = advancedForm.querySelector('[data-lookup-field="ClientID"]')?.closest('.col-12');
      const clientNameField = advancedForm.querySelector('[data-lookup-field="ClientName"]')?.closest('.col-12');
      const groupIdField = advancedForm.querySelector('[data-lookup-field="GroupID"]')?.closest('.col-12');
      const groupNameField = advancedForm.querySelector('[data-lookup-field="GroupName"]')?.closest('.col-12');
      
      if (clientIdField) clientIdField.classList.add('d-none');
      if (clientNameField) clientNameField.classList.add('d-none');
      if (groupIdField) groupIdField.classList.remove('d-none');
      if (groupNameField) groupNameField.classList.remove('d-none');
      
      // Clear client fields when switching to center lookup
      const clientIdInput = advancedForm.querySelector('[data-lookup-field="ClientID"]');
      const clientNameInput = advancedForm.querySelector('[data-lookup-field="ClientName"]');
      if (clientIdInput) clientIdInput.value = '';
      if (clientNameInput) clientNameInput.value = '';
    }

    // Prefill advanced GroupID filter (Center uses GroupID)
    const groupIdFilter = advancedForm?.querySelector?.('[data-lookup-field="GroupID"]');
    if (groupIdFilter && !String(groupIdFilter.value || '').trim()) {
      groupIdFilter.value = String(centerIdInput.value || '').trim();
    }

    lookupModalInstance?.show?.();
    
    // Auto-search for centers
    await doLookupSearch();
  }

  async function openGroupLookup() {
    ensureLookupModal();
    activeLookupType = 'group';

    const titleEl = document.getElementById(LOOKUP_MODAL_LABEL_ID);
    if (titleEl) titleEl.textContent = 'Group Lookup';

    const simpleContainer = document.getElementById(LOOKUP_SIMPLE_CONTAINER_ID);
    const advancedContainer = document.getElementById(LOOKUP_ADVANCED_CONTAINER_ID);
    if (simpleContainer) simpleContainer.classList.add('d-none');
    if (advancedContainer) advancedContainer.classList.remove('d-none');

    clearLookupResults();

    const inputEl = document.getElementById(LOOKUP_SEARCH_INPUT_ID);
    if (inputEl) inputEl.value = String(groupIdInput.value || '').trim();

    const advancedForm = document.getElementById(LOOKUP_ADVANCED_FORM_ID);
    if (advancedForm) {
      const clientIdField = advancedForm.querySelector('[data-lookup-field="ClientID"]')?.closest('.col-12');
      const clientNameField = advancedForm.querySelector('[data-lookup-field="ClientName"]')?.closest('.col-12');
      const groupIdField = advancedForm.querySelector('[data-lookup-field="GroupID"]')?.closest('.col-12');
      const groupNameField = advancedForm.querySelector('[data-lookup-field="GroupName"]')?.closest('.col-12');

      if (clientIdField) clientIdField.classList.add('d-none');
      if (clientNameField) clientNameField.classList.add('d-none');
      if (groupIdField) groupIdField.classList.remove('d-none');
      if (groupNameField) groupNameField.classList.remove('d-none');

      const groupIdFilter = advancedForm.querySelector('[data-lookup-field="GroupID"]');
      if (groupIdFilter && !String(groupIdFilter.value || '').trim()) {
        groupIdFilter.value = String(centerIdInput.value || '').trim();
      }
    }

    lookupModalInstance?.show?.();
    await doLookupSearch();
  }

  async function doLookupSearch() {
    ensureLookupModal();
    
    await ensureServicesLoaded();
    
    const svc = window.GroupMemberMaintenanceService;
    const hasSearchService = !!window.SearchService;
    if (!svc) {
      setLookupMeta('GroupMemberMaintenanceService not available');
      showToast('GroupMemberMaintenanceService not available', 'danger');
      return;
    }

    const advancedForm = document.getElementById(LOOKUP_ADVANCED_FORM_ID);
    let whereStmt = '';

    // Build WhereStmt from advanced filters
    if (advancedForm) {
      const fields = Array.from(advancedForm.querySelectorAll('[data-lookup-field]'));
      const clauses = fields
        .map((field) => {
          const column = field?.dataset?.lookupField;
          const raw = String(field?.value || '').trim();
          if (!column || !raw) return null;

          const mode = advancedForm.querySelector(`[data-lookup-mode='${column}']`)?.value || 'Like';
          const sanitized = escapeSqlLikeTerm(raw);
          if (mode === 'Exact') return `${column} = '${sanitized}'`;
          return `${column} like '%${sanitized}%'`;
        })
        .filter(Boolean);

      whereStmt = clauses.length ? clauses.join(' AND ') : '';
    }

    console.log('[CenterMemberMaintenance] Search initiated with WhereStmt:', whereStmt);

    clearLookupResults();
    setLookupMeta('Searching...');

    try {
      const operatorId = getOperatorId();
      const branchId = getBranchId();
      
      let tableId, advFilterString, columns, onSelect, useService, serviceCenterId;

      switch (activeLookupType) {
        case 'center': {
          tableId = 'GroupID';
          columns = ['GroupID', 'GroupName'];
          // IMPORTANT: Center lookup must honor advanced filters (GroupID/GroupName).
          // Use AdvFilterString only for scoping (branch + active groups), and send the user filters via WhereStmt.
          useService = 'search';
          advFilterString = `OurBranchID='${branchId}' AND GroupStatusID='A'`;
          onSelect = async (selected) => {
            if (selected) {
              centerIdInput.value = selected.GroupID || '';
              if (centerNameInput) centerNameInput.value = selected.GroupName || '';
              
              // Fetch and populate Group Product Details
              try {
                const svc = window.GroupMemberMaintenanceService;
                if (svc?.getGroupProductDetails) {
                  const groupId = selected.GroupID;
                  const branchId = getBranchId();
                  
                  const result = await svc.getGroupProductDetails({ groupId, branchId });
                  
                  if (result?.success && result?.details) {
                    // Populate the fields with the product details
                    if (maxGroupLoansInput) maxGroupLoansInput.value = result.details.maxGroupLoans ?? '';
                    if (maxGroupLoanLimitInput) maxGroupLoanLimitInput.value = result.details.maxGroupLoanLimit ?? '';
                    if (maxOtherLoansInput) maxOtherLoansInput.value = result.details.maxOtherLoans ?? '';
                    if (maxOtherLoanLimitInput) maxOtherLoanLimitInput.value = result.details.maxOtherLoanLimit ?? '';
                  } else {
                    // No details found - show toast and clear fields
                    showToast('Group Product Details Not found', 'warning');
                    centerIdInput.value = '';
                    if (centerNameInput) centerNameInput.value = '';
                    if (maxGroupLoansInput) maxGroupLoansInput.value = '';
                    if (maxGroupLoanLimitInput) maxGroupLoanLimitInput.value = '';
                    if (maxOtherLoansInput) maxOtherLoansInput.value = '';
                    if (maxOtherLoanLimitInput) maxOtherLoanLimitInput.value = '';
                  }
                }
              } catch (err) {
                console.error('[CenterMemberMaintenance] Failed to fetch group product details:', err);
                showToast('Failed to fetch group product details: ' + (err?.message || 'Unknown error'), 'danger');
              }
            }
          };
          break;
        }
        case 'group': {
          tableId = 'SubGroupID';
          columns = ['SubGroupID', 'SubGroupName'];
          useService = 'subGroup';
          const groupIdField = advancedForm?.querySelector?.('[data-lookup-field="GroupID"]');
          const centerIdVal = String(groupIdField?.value || centerIdInput?.value || '').trim();
          serviceCenterId = centerIdVal;
          advFilterString = `OurBranchID='${branchId}'${centerIdVal ? ` AND GroupID= '${centerIdVal}'` : ''}`;
          // Per requirement, WhereStmt should be empty for group search
          whereStmt = '';
          onSelect = (selected) => {
            if (selected) {
              groupIdInput.value = selected.SubGroupID || selected.GroupID || '';
              if (groupNameInput) groupNameInput.value = selected.SubGroupName || selected.GroupName || '';
            }
          };
          break;
        }
        default: {
          // Use ClientWithoutGroupID in Add mode, GroupClientID otherwise
          tableId = currentFormState === 'add' ? 'ClientWithoutGroupID' : 'GroupClientID';
          advFilterString = '';
          columns = ['ClientID', 'ClientName', 'GroupID', 'GroupName'];
          useService = 'client';
          onSelect = (selected) => {
            if (selected) {
              clientIdInput.value = selected.ClientID || '';
              if (clientNameInput) clientNameInput.value = selected.ClientName || '';
              if (centerIdInput) centerIdInput.value = selected.GroupID || '';
              if (centerNameInput) centerNameInput.value = selected.GroupName || '';
              clientIdInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
          };
        }
      }
      
      const payload = {
        TableID: tableId,
        AdvFilterString: advFilterString,
        WhereStmt: whereStmt,
        PrevOrNext: '0',
        RefID: '',
        OperatorID: operatorId,
        ModuleID: '5080',
        OurBranchID: branchId,
        SearchKey: '',
        LanguageID: 'en'
      };

      console.log('[CenterMemberMaintenance] Search payload:', payload);

      let rows = [];
      let result = null;
      if (useService === 'subGroup') {
        rows = await svc.searchSubGroupID({ branchId, operatorId, centerId: serviceCenterId });
      } else if (hasSearchService) {
        result = await window.SearchService.search(payload);
        console.log('[CenterMemberMaintenance] Search result:', result);
        rows = extractSearchRows(result);
      } else {
        setLookupMeta('Search service not available');
        showToast('Search service not available', 'danger');
        return;
      }

      console.log('[CenterMemberMaintenance] Extracted rows:', rows.length);

      if (!rows.length && result?.success === false) {
        setLookupMeta(result?.message || 'Search failed');
        showToast(result?.message || 'Search failed', 'warning');
        return;
      }

      if (!rows.length) {
        setLookupMeta('No results');
        return;
      }

      const limited = rows.slice(0, 500);

      renderLookupResults(limited, columns, onSelect);

      setLookupMeta(`${limited.length} result(s)`);
    } catch (err) {
      console.error('[CenterMemberMaintenance] Client lookup search failed:', err);
      setLookupMeta('Search failed');
      showToast('Search failed: ' + (err?.message || 'Unknown error'), 'danger');
    }
  }

  function wireLookupModalEventsOnce() {
    const modalEl = ensureLookupModal();
    const inputEl = document.getElementById(LOOKUP_SEARCH_INPUT_ID);
    const searchBtn = document.getElementById(LOOKUP_SEARCH_BTN_ID);
    const clearBtn = document.getElementById(LOOKUP_CLEAR_BTN_ID);

    const advancedForm = document.getElementById(LOOKUP_ADVANCED_FORM_ID);
    const advancedSearchBtn = document.getElementById(LOOKUP_ADVANCED_SEARCH_BTN_ID);
    const advancedClearBtn = document.getElementById(LOOKUP_ADVANCED_CLEAR_BTN_ID);

    console.log('[CenterMemberMaintenance] Wiring modal events. Button exists?', !!advancedSearchBtn);

    if (modalEl.dataset.lookupWired === 'true') return;
    modalEl.dataset.lookupWired = 'true';

    inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        doLookupSearch();
      }
    });

    searchBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      doLookupSearch();
    });

    clearBtn?.addEventListener('click', () => {
      if (inputEl) {
        inputEl.value = '';
        inputEl.focus();
      }
      clearLookupResults();
      setLookupMeta('');
    });

    advancedForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      e.stopPropagation();
      doLookupSearch();
    });

    advancedForm?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        doLookupSearch();
      }
    });

    advancedSearchBtn?.addEventListener('click', (e) => {
      console.log('[CenterMemberMaintenance] Advanced search button clicked');
      e.preventDefault();
      e.stopPropagation();
      doLookupSearch();
    });

    advancedClearBtn?.addEventListener('click', () => {
      advancedForm?.querySelectorAll?.('[data-lookup-field]')?.forEach?.((field) => {
        field.value = '';
      });
      clearLookupResults();
      setLookupMeta('');
    });

    modalEl.addEventListener('shown.bs.modal', () => {
      setTimeout(() => {
        const firstAdvanced = advancedForm?.querySelector?.('[data-lookup-field]');
        if (firstAdvanced && !firstAdvanced.closest?.('.d-none')) {
          firstAdvanced.focus?.();
          return;
        }
        inputEl?.focus?.();
      }, 0);
    });
  }

  // Wire delegated click handler (LG-style: intercept click and open lookup)
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target instanceof Element ? e.target : e.target?.parentElement;
      if (!target) return;

      const lookupBtn = target.closest('[data-cmm-lookup]');
      if (!lookupBtn) return;

      const which = lookupBtn.getAttribute('data-cmm-lookup');
      
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      wireLookupModalEventsOnce();
      
      if (which === 'client') {
        openClientLookup();
      } else if (which === 'center') {
        openCenterLookup();
      } else if (which === 'group') {
        openGroupLookup();
      }
      
      return false;
    },
    true
  );

  // If user types a ClientId manually, resolve it (best-effort)
  clientIdInput.addEventListener('change', async () => {
    const val = String(clientIdInput.value || '').trim();
    if (!val) {
      if (clientNameInput) clientNameInput.value = '';
      if (centerIdInput) centerIdInput.value = '';
      if (centerNameInput) centerNameInput.value = '';
      return;
    }

    try {
      await ensureServicesLoaded();
      const svc = window.GroupMemberMaintenanceService;
      
      // In Add mode, validate client without group
      if (currentFormState === 'add') {
        if (!svc?.validateClientWithoutGroup) return;
        
        const branchId = getBranchId();
        const bankId = env.defaultBankId || '';
        
        const result = await svc.validateClientWithoutGroup({ clientId: val, branchId, bankId });
        
        if (result?.success && result?.details) {
          // Client is valid, bind the client name
          if (clientNameInput) clientNameInput.value = result.details.clientName || '';
          // Clear center and group fields in add mode
          if (centerIdInput) centerIdInput.value = '';
          if (centerNameInput) centerNameInput.value = '';
        } else {
          // Invalid client
          showToast('Invalid Non Group Client', 'warning');
          clientIdInput.value = '';
          if (clientNameInput) clientNameInput.value = '';
        }
      } else {
        // In Browse/Edit mode, validate client with group
        if (!svc?.validateClientGroup) return;
        
        const branchId = getBranchId();
        const bankId = env.defaultBankId || '';
        
        const result = await svc.validateClientGroup({ clientId: val, branchId, bankId });
        
        if (result?.success && result?.details) {
          // Client is valid, bind the client name
          // If clientName is missing/empty, get the first non-empty value from details
          const nameValue = result.details.clientName || getFirstNonEmptyValue(result.details);
          if (clientNameInput) clientNameInput.value = nameValue;
        } else {
          // Invalid client
          showToast('Invalid Group Client', 'warning');
          clientIdInput.value = '';
          if (clientNameInput) clientNameInput.value = '';
        }
      }
    } catch (err) {
      console.error('[CenterMemberMaintenance] ClientId resolve failed:', err);
    }
  });

  // If user types a CenterId manually, validate and resolve it
  centerIdInput.addEventListener('change', async () => {
    const val = String(centerIdInput.value || '').trim();
    if (!val) {
      if (centerNameInput) centerNameInput.value = '';
      if (maxGroupLoansInput) maxGroupLoansInput.value = '';
      if (maxGroupLoanLimitInput) maxGroupLoanLimitInput.value = '';
      if (maxOtherLoansInput) maxOtherLoansInput.value = '';
      if (maxOtherLoanLimitInput) maxOtherLoanLimitInput.value = '';
      return;
    }

    try {
      await ensureServicesLoaded();
      const svc = window.GroupMemberMaintenanceService;
      if (!svc?.validateCenterID) return;
      
      const branchId = getBranchId();
      const bankId = env.defaultBankId || '';
      
      const result = await svc.validateCenterID({ centerId: val, branchId, bankId });
      
      if (result?.success && result?.details) {
        // Center ID is valid, bind the center name
        if (centerNameInput) centerNameInput.value = result.details.groupName || '';
        
        // Now fetch and populate Group Product Details
        const productResult = await svc.getGroupProductDetails({ groupId: val, branchId });
        
        if (productResult?.success && productResult?.details) {
          // Populate the fields with the product details
          if (maxGroupLoansInput) maxGroupLoansInput.value = productResult.details.maxGroupLoans ?? '';
          if (maxGroupLoanLimitInput) maxGroupLoanLimitInput.value = productResult.details.maxGroupLoanLimit ?? '';
          if (maxOtherLoansInput) maxOtherLoansInput.value = productResult.details.maxOtherLoans ?? '';
          if (maxOtherLoanLimitInput) maxOtherLoanLimitInput.value = productResult.details.maxOtherLoanLimit ?? '';
        }
      } else {
        // Invalid Center ID - show toast and clear fields
        showToast('Invalid Center ID', 'warning');
        centerIdInput.value = '';
        if (centerNameInput) centerNameInput.value = '';
        if (maxGroupLoansInput) maxGroupLoansInput.value = '';
        if (maxGroupLoanLimitInput) maxGroupLoanLimitInput.value = '';
        if (maxOtherLoansInput) maxOtherLoansInput.value = '';
        if (maxOtherLoanLimitInput) maxOtherLoanLimitInput.value = '';
      }
    } catch (err) {
      console.error('[CenterMemberMaintenance] CenterId validation failed:', err);
      showToast('Failed to validate Center ID: ' + (err?.message || 'Unknown error'), 'danger');
    }
  });

  // If user types a GroupId manually, validate and resolve it
  groupIdInput.addEventListener('change', async () => {
    const val = String(groupIdInput.value || '').trim();
    if (!val) {
      if (groupNameInput) groupNameInput.value = '';
      return;
    }

    try {
      await ensureServicesLoaded();
      const svc = window.GroupMemberMaintenanceService;
      if (!svc?.validateSubGroupID) return;
      
      const branchId = getBranchId();
      const centerId = String(centerIdInput?.value || '').trim();
      const bankId = env.defaultBankId || '';
      
      const result = await svc.validateSubGroupID({ subGroupId: val, centerId, branchId, bankId });
      
      if (result?.success && result?.details) {
        // Group ID is valid, bind the SubGroupID to GroupName
        if (groupNameInput) groupNameInput.value = result.details.subGroupId || '';
      } else {
        // Invalid Group ID - show toast and clear fields
        showToast('Invalid Group ID', 'warning');
        groupIdInput.value = '';
        if (groupNameInput) groupNameInput.value = '';
      }
    } catch (err) {
      console.error('[CenterMemberMaintenance] GroupId validation failed:', err);
      showToast('Failed to validate Group ID: ' + (err?.message || 'Unknown error'), 'danger');
    }
  });

  async function viewMemberMaintence(direction = 0) {
    const clientId = String(clientIdInput?.value || '').trim();
    if (!clientId) {
      showToast('Client ID is required to view member details.', 'warning');
      return;
    }

    const branchId = getBranchId();
    const operatorId = getOperatorId();
    const refId = String(referenceNoInput?.value || '').trim();
    const series = String(seriesInput?.value || '').trim();
    const viewBtn = document.querySelector('[data-cmm-action="view"]');

    setDisabled(viewBtn, true);

    try {
      await ensureServicesLoaded();
      const svc = window.GroupMemberMaintenanceService;
      if (!svc?.getGroupMembers) {
        throw new Error('GroupMemberMaintenanceService.getGroupMembers not available');
      }

      const result = await svc.getGroupMembers({
        clientId,
        branchId,
        operatorId,
        refId,
        series,
        direction  // Pass direction parameter to service
      });

      const first = Array.isArray(result?.members) ? result.members[0] : null;

      if (!first) {
        // If navigation returned no records, keep the current record displayed
        if (direction !== 0) {
          showToast('No more records available in this direction', 'info');
          setDisabled(viewBtn, false);
          return;
        }
        clearMemberDetails();
        showToast('No Center Member Details Found', 'warning');
        setDisabled(viewBtn, false);
        return;
      }

      bindMemberDetails(first);
      // Track the update count for the loaded record
      currentUpdateCount = first.UpdateCount || 0;
      setDisabled(viewBtn, true);
      setFormState('edit');
      
      // Enable navigation buttons when record is loaded
      const previousBtn = document.querySelector('[data-cmm-nav="previous"]');
      const nextBtn = document.querySelector('[data-cmm-nav="next"]');
      if (previousBtn) previousBtn.disabled = false;
      if (nextBtn) nextBtn.disabled = false;
      
      // Enable reinstate button only if ExitDate is not null/undefined
      const reinstateBtn = document.querySelector('[data-cmm-action="reinstate"]');
      if (reinstateBtn) {
        const exitDate = first.ExitDate;
        reinstateBtn.disabled = !exitDate;
      }
    } catch (err) {
      console.error('[CenterMemberMaintenance] View failed:', err);
      showToast(err?.message || 'Failed to load member details.', 'danger');
      setDisabled(viewBtn, false);
    }
  }

  async function saveCenterMember() {
    // ─── Validation ─────────────────────────────────────────────────────────
    const clientId = String(clientIdInput?.value || '').trim();
    const clientName = String(clientNameInput?.value || '').trim();
    const centerId = String(centerIdInput?.value || '').trim();
    const centerName = String(centerNameInput?.value || '').trim();
    const joinOnDate = String(joinOnInput?.value || '').trim();

    // Validate required fields
    if (!clientId) {
      showToast('Client ID is required', 'warning');
      return;
    }
    if (!clientName) {
      showToast('Client Name is required', 'warning');
      return;
    }
    if (!centerId) {
      showToast('Center ID is required', 'warning');
      return;
    }
    if (!centerName) {
      showToast('Center Name is required', 'warning');
      return;
    }
    if (!joinOnDate) {
      showToast('Join On date is required', 'warning');
      return;
    }

    // Validate Join On date is not greater than working date
    const workingDate = getWorkingDate();
    if (joinOnDate > workingDate) {
      showToast('Join On date cannot be greater than working date', 'warning');
      return;
    }

    const saveBtn = document.querySelector('[data-cmm-action="save"]');
    setDisabled(saveBtn, true);

    try {
      await ensureServicesLoaded();
      const svc = window.GroupMemberMaintenanceService;
      if (!svc?.saveCenterMemberMaintenance) {
        throw new Error('GroupMemberMaintenanceService.saveCenterMemberMaintenance not available');
      }

      const branchId = getBranchId();
      const operatorId = getOperatorId();
      const groupId = String(groupIdInput?.value || '').trim();
      const supervisedBy = behindFields.supervisedBy?.value || '';

      // Determine if this is an add or edit
      const isAdd = currentFormState === 'add';

      // Build the RequestData
      const requestData = {
        ClientID: clientId,
        RefID: isAdd ? '0' : (String(referenceNoInput?.value || '0').trim()),
        OurBranchID: branchId,
        GroupID: centerId,
        SubGroupID: groupId,
        RegistrationDate: workingDate,
        JoinDate: joinOnDate,
        MaxGroupLoans: Number(maxGroupLoansInput?.value || 0),
        MaxGroupLoanLimit: Number(maxGroupLoanLimitInput?.value || 0),
        MaxLoans: Number(maxOtherLoansInput?.value || 0),
        MaxLoanLimit: Number(maxOtherLoanLimitInput?.value || 0),
        CreatedBy: isAdd ? operatorId : (behindFields.createdBy?.value || ''),
        CreatedOn: isAdd ? new Date().toISOString() : (behindFields.createdOn?.value || ''),
        ModifiedBy: isAdd ? '' : operatorId,
        ModifiedOn: isAdd ? '' : new Date().toISOString(),
        SupervisedBy: supervisedBy,
        IsCombinedCapture: false,
        NewRecord: isAdd ? 1 : currentUpdateCount,
        GroupLeaderID: String(centerLeaderInput?.value || '').trim()
      };

      const now = new Date();
      const timestamp = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const payload = {
        RequestID: 'dbo.p_AddEditGroupMembers',
        FormId: 'dbo.p_AddEditGroupMembers',
        RequestData: requestData,
        RequestTime: timestamp,
        AppName: 'PROJECT_KAIRO',
        Checksum: ''
      };

      console.log('[CenterMemberMaintenance] Save payload:', payload);

      const result = await svc.saveCenterMemberMaintenance(payload);

      console.log('[CenterMemberMaintenance] Save result:', result);

      // Check for success
      if (result?.Details !== undefined) {
        // Successful response (Details array may be empty)
        showToast('Center Member saved successfully', 'success');

        // Disable Save button and all input controls
        setDisabled(saveBtn, true);
        setDisabled(clientIdInput, true);
        disableLookupButton('client');
        setDisabled(centerIdInput, true);
        disableLookupButton('center');
        setDisabled(groupIdInput, true);
        disableLookupButton('group');
        setDisabled(joinOnInput, true);
        setDisabled(maxGroupLoansInput, true);
        setDisabled(maxGroupLoanLimitInput, true);
        setDisabled(maxOtherLoansInput, true);
        setDisabled(maxOtherLoanLimitInput, true);
        setDisabled(centerLeaderInput, true);

        // Reset form to browse state after successful save
        setTimeout(() => {
          clearMemberDetails();
          setFormState('browse');
        }, 1500);
      } else if (result?.Status) {
        // Error response with Status code
        showToast(`Save failed: ${result.Message || 'Unknown error'} (Status: ${result.Status})`, 'danger');
        setDisabled(saveBtn, false);
      } else {
        // Unexpected response format
        showToast('Save failed: Unexpected response format', 'danger');
        setDisabled(saveBtn, false);
      }
    } catch (err) {
      console.error('[CenterMemberMaintenance] Save failed:', err);
      showToast('Save failed: ' + (err?.message || 'Unknown error'), 'danger');
      setDisabled(saveBtn, false);
    }
  }

  document.querySelector('[data-cmm-action="view"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    viewMemberMaintence();
  });

  document.querySelector('[data-cmm-action="add"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    setFormState('add');
    // Ensure JoinOn remains enabled even if other handlers run.
    requestAnimationFrame(forceEnableJoinOn);
    setTimeout(forceEnableJoinOn, 0);
    startJoinOnGuard();
  });

  document.querySelector('[data-cmm-action="cancel"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    clearMemberDetails();
    setFormState('browse');
  });

  // Create confirmation modal
  function ensureConfirmationModal() {
    let modalEl = document.getElementById('cmm-confirm-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.className = 'modal fade';
      modalEl.id = 'cmm-confirm-modal';
      modalEl.tabIndex = -1;
      modalEl.setAttribute('aria-labelledby', 'cmm-confirm-title');
      modalEl.setAttribute('aria-hidden', 'true');

      modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="cmm-confirm-title">Confirm</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" id="cmm-confirm-message">
              Do you want to Abort/Discard the changes?<br>[No:1100]
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="cmm-confirm-no" data-bs-dismiss="modal">No</button>
              <button type="button" class="btn btn-primary" id="cmm-confirm-yes">Yes</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modalEl);
    }

    return modalEl;
  }

  /**
   * Show confirmation dialog and return promise
   * @param {string} message - Message to display
   * @param {string} title - Dialog title
   * @returns {Promise<boolean>} - Resolves to true if Yes clicked, false if No clicked
   */
  function showConfirmation(message = 'Are you sure?', title = 'Confirm') {
    return new Promise((resolve) => {
      const modalEl = ensureConfirmationModal();
      const titleEl = document.getElementById('cmm-confirm-title');
      const messageEl = document.getElementById('cmm-confirm-message');
      const yesBtn = document.getElementById('cmm-confirm-yes');
      const noBtn = document.getElementById('cmm-confirm-no');

      // Update title and message
      if (titleEl) titleEl.textContent = title;
      if (messageEl) messageEl.innerHTML = message;

      // Remove previous listeners
      const newYesBtn = yesBtn.cloneNode(true);
      const newNoBtn = noBtn.cloneNode(true);
      yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
      noBtn.parentNode.replaceChild(newNoBtn, noBtn);

      // Add new listeners
      newYesBtn.addEventListener('click', () => {
        confirmModalInstance?.hide?.();
        resolve(true);
      });

      newNoBtn.addEventListener('click', () => {
        confirmModalInstance?.hide?.();
        resolve(false);
      });

      // Handle modal close (X button or backdrop click)
      modalEl.addEventListener('hidden.bs.modal', () => {
        resolve(false);
      }, { once: true });

      const confirmModalInstance = window.bootstrap?.Modal?.getOrCreateInstance(modalEl, { backdrop: 'static', keyboard: false });
      confirmModalInstance?.show?.();
    });
  }

  async function deleteClientMember() {
    // Show custom confirmation dialog
    const userConfirmed = await showConfirmation(
      'Do you want to Abort/Discard the changes?<br>[No:1100]',
      'Confirm'
    );
    
    if (userConfirmed) {
      // User clicked Yes - abort the process
      return;
    }

    // User clicked No - proceed with deletion
    const clientId = String(clientIdInput?.value || '').trim();
    const referenceNo = String(referenceNoInput?.value || '').trim();
    const series = String(seriesInput?.value || '').trim();

    const deleteBtn = document.querySelector('[data-cmm-action="delete"]');
    setDisabled(deleteBtn, true);

    try {
      await ensureServicesLoaded();
      const svc = window.GroupMemberMaintenanceService;
      if (!svc?.deleteClientMemberMaintenance) {
        throw new Error('GroupMemberMaintenanceService.deleteClientMemberMaintenance not available');
      }

      const now = new Date();
      const timestamp = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const payload = {
        RequestID: 'dbo.p_DeleteGroupMembers',
        FormId: 'dbo.p_DeleteGroupMembers',
        RequestData: {
          ClientID: clientId,
          RefID: referenceNo,
          Series: series,
          NewRecord: currentUpdateCount
        },
        RequestTime: timestamp,
        AppName: 'PROJECT_KAIRO',
        Checksum: ''
      };

      console.log('[CenterMemberMaintenance] Delete payload:', payload);

      const result = await svc.deleteClientMemberMaintenance(payload);

      console.log('[CenterMemberMaintenance] Delete result:', result);

      // Check for success
      if (result?.Details !== undefined) {
        // Successful response (Details array may be empty)
        showToast('Record Deleted Successfully', 'success');
        
        // Trigger cancel to clear form and return to browse state
        setTimeout(() => {
          document.querySelector('[data-cmm-action="cancel"]')?.click();
        }, 500);
      } else if (result?.Status) {
        // Error response with Status code
        showToast(`Deletion failed: ${result.Message || 'Unknown error'}`, 'danger');
        setDisabled(deleteBtn, false);
      } else {
        // Unexpected response format
        showToast('Deletion failed: Unexpected response format', 'danger');
        setDisabled(deleteBtn, false);
      }
    } catch (err) {
      console.error('[CenterMemberMaintenance] Delete failed:', err);
      showToast('Deletion failed: ' + (err?.message || 'Unknown error'), 'danger');
      setDisabled(deleteBtn, false);
    }
  }

  document.querySelector('[data-cmm-action="edit"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Disable browse controls
    setDisabled(document.querySelector('[data-cmm-action="view"]'), true);
    setDisabled(document.querySelector('[data-cmm-action="add"]'), true);
    setDisabled(document.querySelector('[data-cmm-action="edit"]'), true);
    setDisabled(document.querySelector('[data-cmm-action="delete"]'), true);
    
    // Disable ClientID, CenterID, GroupID and their lookup buttons
    setDisabled(clientIdInput, true);
    disableLookupButton('client');
    setDisabled(centerIdInput, true);
    disableLookupButton('center');
    setDisabled(groupIdInput, true);
    disableLookupButton('group');
    
    // Enable JoinOn for editing
    setDisabled(joinOnInput, false);
    forceEnableJoinOn();
    requestAnimationFrame(forceEnableJoinOn);
    setTimeout(forceEnableJoinOn, 0);
    startJoinOnGuard();
    
    // Disable other input fields
    setDisabled(maxGroupLoansInput, true);
    setDisabled(maxGroupLoanLimitInput, true);
    setDisabled(maxOtherLoansInput, true);
    setDisabled(maxOtherLoanLimitInput, true);
    setDisabled(centerLeaderInput, true);
    
    // Enable Save and Cancel
    setDisabled(document.querySelector('[data-cmm-action="save"]'), false);
    setDisabled(document.querySelector('[data-cmm-action="cancel"]'), false);
    
    // Focus on JoinOn field
    joinOnInput?.focus();
  });

  document.querySelector('[data-cmm-action="save"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    saveCenterMember();
  });

  document.querySelector('[data-cmm-action="delete"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    deleteClientMember();
  });

  // Navigation button handlers
  document.querySelector('[data-cmm-nav="previous"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('[CenterMemberMaintenance] Previous navigation button clicked');
    viewMemberMaintence(-1);  // Direction = -1 for previous
  });

  document.querySelector('[data-cmm-nav="next"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('[CenterMemberMaintenance] Next navigation button clicked');
    viewMemberMaintence(1);   // Direction = 1 for next
  });

  window.viewMemberMaintence = viewMemberMaintence;
});
