/**
 * Center Member Maintenance Module
 * Handles CRUD operations for center member records with client/center/group lookups.
 * Converted from legacy HTML/JS to KAIRO MVC pattern.
 */
(function () {
  'use strict';

  // =========================================================================
  // AppCore & Environment Helpers
  // =========================================================================
  function getAppCore() {
    const win = window;
    return win.AppCore || (win.parent && win.parent !== win && win.parent.AppCore) || (win.top && win.top !== win && win.top.AppCore) || null;
  }

  function getEnv() {
    const e = window.Environment || {};
    const session = window.getAuthSession?.() || {};
    const defaultWorkingDate = window.GlobalUtils?.getCurrentDate
      ? window.GlobalUtils.getCurrentDate()
      : new Date().toISOString().split('T')[0];
    return {
      operatorId: String(e.operatorId || e.operatorID || session.operatorId || session.name || 'CSADM').trim(),
      ourBranchId: String(e.OurBranchID || e.branchId || session.branchId || sessionStorage.getItem('BranchID') || '').trim(),
      bankId: String(e.defaultBankId || e.defaultBankID || e.bankID || sessionStorage.getItem('BankID') || '00').trim(),
      workingDate: e.workingDate || defaultWorkingDate
    };
  }

  // =========================================================================
  // Service Invoker — ALL API calls use POST via AppCore.invokeControllerAsync
  // =========================================================================
  async function invokeController(action, requestData) {
    const appCore = getAppCore();
    if (!appCore || typeof appCore.invokeControllerAsync !== 'function') {
      throw new Error('AppCore is not available (AppCore.invokeControllerAsync not found)');
    }
    const endpoint = 'MicroFinance/CenterMemberMaintenance/' + action;
    return appCore.invokeControllerAsync(endpoint, requestData || {});
  }

  async function callOldApi(formId, requestData) {
    return invokeController('old-api', { FormId: formId, RequestData: requestData });
  }

  // =========================================================================
  // Constants
  // =========================================================================
  const MODULE_ID = '5080';
  const DEFAULT_SEARCH_MODULE_ID = String(window.Environment?.defaultSearchModuleId || MODULE_ID);

  // =========================================================================
  // State
  // =========================================================================
  let currentFormState = 'browse';
  let currentUpdateCount = 0;

  Object.defineProperty(window, 'currentFormState', {
    get: () => currentFormState,
    set: (val) => { currentFormState = val; },
    configurable: true
  });

  // =========================================================================
  // DOM References
  // =========================================================================
  const clientIdInput = document.getElementById('ClientId');
  const clientNameInput = document.getElementById('ClientName');
  const centerIdInput = document.getElementById('CenterId');
  const centerNameInput = document.getElementById('CenterName');
  const groupIdInput = document.getElementById('GroupId');
  const groupNameInput = document.getElementById('GroupName');
  const referenceNoInput = document.getElementById('ReferenceNo');
  const seriesInput = document.getElementById('Series');
  const joinOnInput = document.getElementById('JoinOn');
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

  if (!clientIdInput) return;

  // =========================================================================
  // Toast Notifications
  // =========================================================================
  function ensureToastContainer() {
    let el = document.querySelector('[data-kairo-toast-container]');
    if (!el) el = document.getElementById('toastContainer');
    if (el) return el;

    el = document.createElement('div');
    el.className = 'kairo-toast-container';
    el.setAttribute('data-kairo-toast-container', '');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(el);
    return el;
  }

  function showToast(message, variant) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = 'kairo-toast kairo-toast--' + (variant || 'info');
    toast.setAttribute('role', 'alert');
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
      setTimeout(() => toast.remove(), 500);
    }, 5000);
  }

  window.showToast = showToast;

  // =========================================================================
  // SearchModal Integration (per SEARCHMODAL_INTEGRATION_GUIDE)
  // =========================================================================
  let searchModal = null;

  function getSearchModal() {
    if (searchModal) return searchModal;
    const appCore = getAppCore();
    if (appCore && typeof appCore.SearchModal === 'function') {
      searchModal = new appCore.SearchModal(appCore);
    } else if (typeof window.SearchModal === 'function') {
      searchModal = new window.SearchModal(getAppCore());
    }
    return searchModal;
  }

  // LOOKUP_CONFIG pattern per MODULE_MIGRATION_CHEATSHEET
  const LOOKUP_CONFIG = {
    client: {
      getTableID: () => currentFormState === 'add' ? 'ClientWithoutGroupID' : 'GroupClientID',
      moduleID: MODULE_ID,
      getAdvFilterString: () => '',
      pageSize: 500,
      onSelect: function (selected) {
        if (!selected) return;
        clientIdInput.value = selected.ClientID || '';
        if (clientNameInput) clientNameInput.value = selected.ClientName || '';
        if (centerIdInput) centerIdInput.value = selected.GroupID || '';
        if (centerNameInput) centerNameInput.value = selected.GroupName || '';
        clientIdInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },
    center: {
      tableID: 'GroupID',
      moduleID: MODULE_ID,
      getAdvFilterString: function () {
        var env = getEnv();
        return "OurBranchID='" + env.ourBranchId + "' AND GroupStatusID='A'";
      },
      pageSize: 500,
      onSelect: async function (selected) {
        if (!selected) return;
        centerIdInput.value = selected.GroupID || '';
        if (centerNameInput) centerNameInput.value = selected.GroupName || '';
        await fetchGroupProductDetails(selected.GroupID);
      }
    },
    group: {
      tableID: 'SubGroupID',
      moduleID: MODULE_ID,
      getAdvFilterString: function () {
        var env = getEnv();
        var centerId = String(centerIdInput?.value || '').trim();
        return "OurBranchID='" + env.ourBranchId + "'" + (centerId ? " AND GroupID='" + centerId + "'" : '');
      },
      pageSize: 500,
      onSelect: function (selected) {
        if (!selected) return;
        groupIdInput.value = selected.SubGroupID || selected.GroupID || '';
        if (groupNameInput) groupNameInput.value = selected.SubGroupName || selected.GroupName || '';
      }
    }
  };

  function openLookup(type) {
    var modal = getSearchModal();
    if (!modal) {
      showToast('SearchModal is not available', 'danger');
      return;
    }

    var config = LOOKUP_CONFIG[type];
    if (!config) return;

    var env = getEnv();
    var tableID = typeof config.getTableID === 'function' ? config.getTableID() : config.tableID;
    var advFilterString = typeof config.getAdvFilterString === 'function' ? config.getAdvFilterString() : (config.advFilterString || '');

    modal.open({
      tableID: tableID,
      moduleID: config.moduleID || MODULE_ID,
      whereStmt: '',
      advFilterString: advFilterString,
      searchKey: '',
      pageSize: config.pageSize || 500,
      ourbranchId: env.ourBranchId,
      onSelect: config.onSelect
    });
  }

  // =========================================================================
  // Fetch Group Product Details (on center selection)
  // =========================================================================
  async function fetchGroupProductDetails(groupId) {
    if (!groupId) return;
    try {
      var env = getEnv();
      var result = await callOldApi('dbo.p_GetGroupProductDetails', {
        GroupID: groupId,
        OurBranchID: env.ourBranchId
      });

      var details = result?.Details?.[0] || result?.details || null;
      if (details) {
        if (maxGroupLoansInput) maxGroupLoansInput.value = details.MaxGroupLoans ?? details.maxGroupLoans ?? '';
        if (maxGroupLoanLimitInput) maxGroupLoanLimitInput.value = details.MaxGroupLoanLimit ?? details.maxGroupLoanLimit ?? '';
        if (maxOtherLoansInput) maxOtherLoansInput.value = details.MaxLoans ?? details.maxOtherLoans ?? '';
        if (maxOtherLoanLimitInput) maxOtherLoanLimitInput.value = details.MaxLoanLimit ?? details.maxOtherLoanLimit ?? '';
      } else {
        showToast('Group Product Details Not found', 'warning');
        centerIdInput.value = '';
        if (centerNameInput) centerNameInput.value = '';
        if (maxGroupLoansInput) maxGroupLoansInput.value = '';
        if (maxGroupLoanLimitInput) maxGroupLoanLimitInput.value = '';
        if (maxOtherLoansInput) maxOtherLoansInput.value = '';
        if (maxOtherLoanLimitInput) maxOtherLoanLimitInput.value = '';
      }
    } catch (err) {
      console.error('[CenterMemberMaintenance] Failed to fetch group product details:', err);
      showToast('Failed to fetch group product details: ' + (err?.message || 'Unknown error'), 'danger');
    }
  }

  // =========================================================================
  // Flatpickr Sync Helpers
  // =========================================================================
  function syncFlatpickrInteractivity(inputEl, shouldDisable) {
    if (!inputEl?._flatpickr) return;
    try {
      var fp = inputEl._flatpickr;
      if (fp?.altInput) {
        fp.altInput.disabled = !!shouldDisable;
        fp.altInput.readOnly = !!shouldDisable;
        if (!shouldDisable) {
          fp.altInput.removeAttribute('disabled');
          fp.altInput.removeAttribute('readonly');
          fp.altInput.removeAttribute('aria-disabled');
        } else {
          fp.altInput.setAttribute('aria-disabled', 'true');
        }
        if (!fp.altInput.id && inputEl.id) fp.altInput.id = inputEl.id + '__alt';
      }
      if (typeof fp.set === 'function') {
        fp.set('clickOpens', !shouldDisable);
        fp.set('allowInput', !shouldDisable);
      }
    } catch { /* ignore */ }
  }

  function forceEnableJoinOn() {
    if (!joinOnInput) return;
    joinOnInput.disabled = false;
    joinOnInput.readOnly = false;
    joinOnInput.removeAttribute('disabled');
    joinOnInput.removeAttribute('readonly');
    joinOnInput.removeAttribute('aria-disabled');
    syncFlatpickrInteractivity(joinOnInput, false);
  }

  let joinOnGuardObserver = null;
  function startJoinOnGuard() {
    if (joinOnGuardObserver || !joinOnInput) return;
    joinOnGuardObserver = new MutationObserver(function () {
      if (joinOnInput.disabled || joinOnInput.hasAttribute('disabled')) {
        forceEnableJoinOn();
      }
    });
    joinOnGuardObserver.observe(joinOnInput, { attributes: true, attributeFilter: ['disabled', 'readonly', 'aria-disabled'] });
  }

  function stopJoinOnGuard() {
    if (joinOnGuardObserver) {
      joinOnGuardObserver.disconnect();
      joinOnGuardObserver = null;
    }
  }

  // =========================================================================
  // Disable / Enable Helpers
  // =========================================================================
  function setDisabled(el, disabled) {
    if (!el) return;
    el.disabled = !!disabled;
    if (disabled) {
      el.setAttribute('disabled', 'disabled');
    } else {
      el.removeAttribute('disabled');
    }
    syncFlatpickrInteractivity(el, disabled);
  }

  function disableById(id) {
    var el = document.getElementById(id);
    if (el) setDisabled(el, true);
  }

  function disableLookupButton(type) {
    var btn = document.querySelector('[data-cmm-lookup="' + type + '"]');
    if (btn) setDisabled(btn, true);
  }

  function enableLookupButton(type) {
    var btn = document.querySelector('[data-cmm-lookup="' + type + '"]');
    if (btn) setDisabled(btn, false);
  }

  // =========================================================================
  // Form Data Helpers
  // =========================================================================
  var pad2 = function (n) { return String(n).padStart(2, '0'); };

  function formatDateOnly(value) {
    if (!value) return '';
    var d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function formatDateTime(value) {
    if (!value) return '';
    var d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' +
      pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
  }

  function setValue(el, value) {
    if (!el) return;
    el.value = value === null || value === undefined ? '' : value;
  }

  function getFirstNonEmptyValue(obj) {
    if (!obj) return '';
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        var val = obj[key];
        if (val !== null && val !== undefined && val !== '') return val;
      }
    }
    return '';
  }

  function bindMemberDetails(member) {
    member = member || {};
    setValue(referenceNoInput, member.RefID);
    setValue(seriesInput, member.Series);
    setValue(clientIdInput, member.ClientID);
    setValue(clientNameInput, member.ClientName || getFirstNonEmptyValue(member));
    setValue(centerIdInput, member.GroupID);
    setValue(centerNameInput, member.GroupName);
    setValue(groupIdInput, member.SubGroupID);
    setValue(groupNameInput, member.GroupName || member.GroupLeaderDesc || '');
    if (joinOnInput) {
      joinOnInput.value = formatDateOnly(member.JoinDate);
    }
    setValue(maxGroupLoansInput, member.MaxGroupLoans);
    setValue(maxGroupLoanLimitInput, member.MaxGroupLoanLimit);
    setValue(maxOtherLoansInput, member.MaxLoans);
    setValue(maxOtherLoanLimitInput, member.MaxLoanLimit);
    if (centerLeaderInput) {
      var isLeader = member.GroupLeaderID || member.GroupLeaderDesc;
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

  // =========================================================================
  // Form State Management
  // =========================================================================
  function setFormState(mode) {
    currentFormState = mode;
    stopJoinOnGuard();

    if (mode === 'edit') {
      setDisabled(document.querySelector('[data-cmm-action="view"]'), true);
      setDisabled(document.querySelector('[data-cmm-action="add"]'), true);
      setDisabled(clientIdInput, true);
      setDisabled(joinOnInput, false);
      forceEnableJoinOn();
      requestAnimationFrame(forceEnableJoinOn);
      setTimeout(forceEnableJoinOn, 0);
      startJoinOnGuard();
      disableLookupButton('client');

      setDisabled(document.querySelector('[data-cmm-action="edit"]'), false);
      setDisabled(document.querySelector('[data-cmm-action="delete"]'), false);
      setDisabled(document.querySelector('[data-cmm-action="cancel"]'), false);
      setDisabled(document.querySelector('[data-cmm-action="save"]'), true);
    } else if (mode === 'add') {
      clearMemberDetails();

      setDisabled(document.querySelector('[data-cmm-action="view"]'), true);
      setDisabled(document.querySelector('[data-cmm-action="add"]'), true);
      setDisabled(document.querySelector('[data-cmm-action="edit"]'), true);
      setDisabled(document.querySelector('[data-cmm-action="delete"]'), true);
      setDisabled(document.querySelector('[data-cmm-action="save"]'), false);
      setDisabled(document.querySelector('[data-cmm-action="cancel"]'), false);

      setDisabled(clientIdInput, false);
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
      // browse
      setDisabled(document.querySelector('[data-cmm-action="view"]'), false);
      setDisabled(document.querySelector('[data-cmm-action="add"]'), false);
      setDisabled(clientIdInput, false);
      enableLookupButton('client');

      setDisabled(document.querySelector('[data-cmm-action="edit"]'), true);
      setDisabled(document.querySelector('[data-cmm-action="delete"]'), true);
      setDisabled(document.querySelector('[data-cmm-action="cancel"]'), false);
      setDisabled(document.querySelector('[data-cmm-action="save"]'), true);

      setDisabled(centerIdInput, true);
      disableLookupButton('center');
      setDisabled(groupIdInput, true);
      disableLookupButton('group');
      setDisabled(joinOnInput, true);
    }
  }

  // Disable fields on load
  (function disableFieldsOnLoad() {
    ['ReferenceNo', 'Series', 'CenterId', 'GroupId', 'JoinOn',
      'MaxGroupLoans', 'MaxGroupLoanLimit', 'MaxOtherLoans', 'MaxOtherLoanLimit', 'CenterLeader'
    ].forEach(disableById);
    disableLookupButton('center');
    disableLookupButton('group');
  })();

  // =========================================================================
  // Client ID Change Handler
  // =========================================================================
  clientIdInput.addEventListener('change', async function () {
    var val = String(clientIdInput.value || '').trim();
    if (!val) {
      if (clientNameInput) clientNameInput.value = '';
      if (centerIdInput) centerIdInput.value = '';
      if (centerNameInput) centerNameInput.value = '';
      return;
    }

    try {
      var env = getEnv();
      if (currentFormState === 'add') {
        var result = await callOldApi('dbo.p_GetIDDescription', {
          OurBranchID: env.ourBranchId,
          ControlTypeID: 'ClientWithoutGroupID',
          ID: val,
          BankID: env.bankId,
          TypeID: '',
          AdvanceFilter: '',
          LanguageID: 'en'
        });
        var details = result?.Details?.[0] || null;
        if (details) {
          if (clientNameInput) clientNameInput.value = details.ClientName || '';
          if (centerIdInput) centerIdInput.value = '';
          if (centerNameInput) centerNameInput.value = '';
        } else {
          showToast('Invalid Non Group Client', 'warning');
          clientIdInput.value = '';
          if (clientNameInput) clientNameInput.value = '';
        }
      } else {
        var result = await callOldApi('dbo.p_GetIDDescription', {
          OurBranchID: env.ourBranchId,
          ControlTypeID: 'GroupClientID',
          ID: val,
          BankID: env.bankId,
          TypeID: '',
          AdvanceFilter: '',
          LanguageID: 'en'
        });
        var details = result?.Details?.[0] || null;
        if (details) {
          var nameValue = details.ClientName || getFirstNonEmptyValue(details);
          if (clientNameInput) clientNameInput.value = nameValue;
        } else {
          showToast('Invalid Group Client', 'warning');
          clientIdInput.value = '';
          if (clientNameInput) clientNameInput.value = '';
        }
      }
    } catch (err) {
      console.error('[CenterMemberMaintenance] ClientId resolve failed:', err);
    }
  });

  // =========================================================================
  // Center ID Change Handler
  // =========================================================================
  centerIdInput.addEventListener('change', async function () {
    var val = String(centerIdInput.value || '').trim();
    if (!val) {
      if (centerNameInput) centerNameInput.value = '';
      if (maxGroupLoansInput) maxGroupLoansInput.value = '';
      if (maxGroupLoanLimitInput) maxGroupLoanLimitInput.value = '';
      if (maxOtherLoansInput) maxOtherLoansInput.value = '';
      if (maxOtherLoanLimitInput) maxOtherLoanLimitInput.value = '';
      return;
    }

    try {
      var env = getEnv();
      var result = await callOldApi('dbo.p_GetIDDescription', {
        OurBranchID: env.ourBranchId,
        ControlTypeID: 'GroupID',
        ID: val,
        BankID: env.bankId,
        TypeID: '',
        AdvanceFilter: "GroupID='" + val + "' AND OurBranchID='" + env.ourBranchId + "'",
        LanguageID: 'en'
      });
      var details = result?.Details?.[0] || null;
      if (details) {
        if (centerNameInput) centerNameInput.value = details.GroupName || '';
        await fetchGroupProductDetails(val);
      } else {
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

  // =========================================================================
  // Group ID Change Handler
  // =========================================================================
  groupIdInput.addEventListener('change', async function () {
    var val = String(groupIdInput.value || '').trim();
    if (!val) {
      if (groupNameInput) groupNameInput.value = '';
      return;
    }

    try {
      var env = getEnv();
      var centerId = String(centerIdInput?.value || '').trim();
      var result = await callOldApi('dbo.p_GetIDDescription', {
        OurBranchID: env.ourBranchId,
        ControlTypeID: 'SubGroupID',
        ID: val,
        BankID: env.bankId,
        TypeID: '',
        AdvanceFilter: "GroupID='" + centerId + "' AND OurBranchID='" + env.ourBranchId + "'",
        LanguageID: 'en'
      });
      var details = result?.Details?.[0] || null;
      if (details) {
        if (groupNameInput) groupNameInput.value = details.SubGroupID || details.SubGroupName || '';
      } else {
        showToast('Invalid Group ID', 'warning');
        groupIdInput.value = '';
        if (groupNameInput) groupNameInput.value = '';
      }
    } catch (err) {
      console.error('[CenterMemberMaintenance] GroupId validation failed:', err);
      showToast('Failed to validate Group ID: ' + (err?.message || 'Unknown error'), 'danger');
    }
  });

  // =========================================================================
  // CRUD Operations
  // =========================================================================
  async function viewMemberMaintenance(direction) {
    direction = direction || 0;
    var clientId = String(clientIdInput?.value || '').trim();
    if (!clientId) {
      showToast('Client ID is required to view member details.', 'warning');
      return;
    }

    var env = getEnv();
    var refId = String(referenceNoInput?.value || '').trim();
    var series = String(seriesInput?.value || '').trim();
    var viewBtn = document.querySelector('[data-cmm-action="view"]');

    setDisabled(viewBtn, true);

    try {
      var result = await callOldApi('dbo.p_GetGroupMembers', {
        ClientID: clientId,
        OurBranchID: env.ourBranchId,
        OperatorID: env.operatorId,
        RefID: refId,
        Series: series,
        Direction: direction
      });

      var members = result?.Details || [];
      var first = Array.isArray(members) ? members[0] : null;

      if (!first) {
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
      currentUpdateCount = first.UpdateCount || 0;
      setDisabled(viewBtn, true);
      setFormState('edit');

      var previousBtn = document.querySelector('[data-cmm-nav="previous"]');
      var nextBtn = document.querySelector('[data-cmm-nav="next"]');
      if (previousBtn) previousBtn.disabled = false;
      if (nextBtn) nextBtn.disabled = false;

      var reinstateBtn = document.querySelector('[data-cmm-action="reinstate"]');
      if (reinstateBtn) reinstateBtn.disabled = !first.ExitDate;
    } catch (err) {
      console.error('[CenterMemberMaintenance] View failed:', err);
      showToast(err?.message || 'Failed to load member details.', 'danger');
      setDisabled(viewBtn, false);
    }
  }

  async function saveCenterMember() {
    var clientId = String(clientIdInput?.value || '').trim();
    var clientName = String(clientNameInput?.value || '').trim();
    var centerId = String(centerIdInput?.value || '').trim();
    var centerName = String(centerNameInput?.value || '').trim();
    var joinOnDate = String(joinOnInput?.value || '').trim();
    var env = getEnv();

    if (!clientId) { showToast('Client ID is required', 'warning'); return; }
    if (!clientName) { showToast('Client Name is required', 'warning'); return; }
    if (!centerId) { showToast('Center ID is required', 'warning'); return; }
    if (!centerName) { showToast('Center Name is required', 'warning'); return; }
    if (!joinOnDate) { showToast('Join On date is required', 'warning'); return; }
    if (joinOnDate > env.workingDate) { showToast('Join On date cannot be greater than working date', 'warning'); return; }

    var saveBtn = document.querySelector('[data-cmm-action="save"]');
    setDisabled(saveBtn, true);

    try {
      var isAdd = currentFormState === 'add';
      var groupId = String(groupIdInput?.value || '').trim();
      var supervisedBy = behindFields.supervisedBy?.value || '';

      var requestData = {
        ClientID: clientId,
        RefID: isAdd ? '0' : (String(referenceNoInput?.value || '0').trim()),
        OurBranchID: env.ourBranchId,
        GroupID: centerId,
        SubGroupID: groupId,
        RegistrationDate: env.workingDate,
        JoinDate: joinOnDate,
        MaxGroupLoans: Number(maxGroupLoansInput?.value || 0),
        MaxGroupLoanLimit: Number(maxGroupLoanLimitInput?.value || 0),
        MaxLoans: Number(maxOtherLoansInput?.value || 0),
        MaxLoanLimit: Number(maxOtherLoanLimitInput?.value || 0),
        CreatedBy: isAdd ? env.operatorId : (behindFields.createdBy?.value || ''),
        CreatedOn: isAdd ? new Date().toISOString() : (behindFields.createdOn?.value || ''),
        ModifiedBy: isAdd ? '' : env.operatorId,
        ModifiedOn: isAdd ? '' : new Date().toISOString(),
        SupervisedBy: supervisedBy,
        IsCombinedCapture: false,
        NewRecord: isAdd ? 1 : currentUpdateCount,
        GroupLeaderID: String(centerLeaderInput?.value || '').trim()
      };

      var result = await callOldApi('dbo.p_AddEditGroupMembers', requestData);

      if (result?.Details !== undefined) {
        showToast('Center Member saved successfully', 'success');

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

        setTimeout(function () {
          clearMemberDetails();
          setFormState('browse');
        }, 1500);
      } else if (result?.Status) {
        showToast('Save failed: ' + (result.Message || 'Unknown error') + ' (Status: ' + result.Status + ')', 'danger');
        setDisabled(saveBtn, false);
      } else {
        showToast('Save failed: Unexpected response format', 'danger');
        setDisabled(saveBtn, false);
      }
    } catch (err) {
      console.error('[CenterMemberMaintenance] Save failed:', err);
      showToast('Save failed: ' + (err?.message || 'Unknown error'), 'danger');
      setDisabled(saveBtn, false);
    }
  }

  async function deleteClientMember() {
    if (!confirm('Do you want to Abort/Discard the changes?\n[No:1100]')) {
      return;
    }

    var clientId = String(clientIdInput?.value || '').trim();
    var refNo = String(referenceNoInput?.value || '').trim();
    var series = String(seriesInput?.value || '').trim();
    var deleteBtn = document.querySelector('[data-cmm-action="delete"]');

    setDisabled(deleteBtn, true);

    try {
      var result = await callOldApi('dbo.p_DeleteGroupMembers', {
        ClientID: clientId,
        RefID: refNo,
        Series: series,
        NewRecord: currentUpdateCount
      });

      if (result?.Details !== undefined) {
        showToast('Record Deleted Successfully', 'success');
        setTimeout(function () {
          document.querySelector('[data-cmm-action="cancel"]')?.click();
        }, 500);
      } else if (result?.Status) {
        showToast('Deletion failed: ' + (result.Message || 'Unknown error'), 'danger');
        setDisabled(deleteBtn, false);
      } else {
        showToast('Deletion failed: Unexpected response format', 'danger');
        setDisabled(deleteBtn, false);
      }
    } catch (err) {
      console.error('[CenterMemberMaintenance] Delete failed:', err);
      showToast('Deletion failed: ' + (err?.message || 'Unknown error'), 'danger');
      setDisabled(deleteBtn, false);
    }
  }

  // =========================================================================
  // Event Wiring — Action Buttons
  // =========================================================================
  document.querySelector('[data-cmm-action="view"]')?.addEventListener('click', function (e) {
    e.preventDefault();
    viewMemberMaintenance();
  });

  document.querySelector('[data-cmm-action="add"]')?.addEventListener('click', function (e) {
    e.preventDefault();
    setFormState('add');
    requestAnimationFrame(forceEnableJoinOn);
    setTimeout(forceEnableJoinOn, 0);
    startJoinOnGuard();
  });

  document.querySelector('[data-cmm-action="cancel"]')?.addEventListener('click', function (e) {
    e.preventDefault();
    clearMemberDetails();
    setFormState('browse');
  });

  document.querySelector('[data-cmm-action="edit"]')?.addEventListener('click', function (e) {
    e.preventDefault();

    setDisabled(document.querySelector('[data-cmm-action="view"]'), true);
    setDisabled(document.querySelector('[data-cmm-action="add"]'), true);
    setDisabled(document.querySelector('[data-cmm-action="edit"]'), true);
    setDisabled(document.querySelector('[data-cmm-action="delete"]'), true);

    setDisabled(clientIdInput, true);
    disableLookupButton('client');
    setDisabled(centerIdInput, true);
    disableLookupButton('center');
    setDisabled(groupIdInput, true);
    disableLookupButton('group');

    setDisabled(joinOnInput, false);
    forceEnableJoinOn();
    requestAnimationFrame(forceEnableJoinOn);
    setTimeout(forceEnableJoinOn, 0);
    startJoinOnGuard();

    setDisabled(maxGroupLoansInput, true);
    setDisabled(maxGroupLoanLimitInput, true);
    setDisabled(maxOtherLoansInput, true);
    setDisabled(maxOtherLoanLimitInput, true);
    setDisabled(centerLeaderInput, true);

    setDisabled(document.querySelector('[data-cmm-action="save"]'), false);
    setDisabled(document.querySelector('[data-cmm-action="cancel"]'), false);

    joinOnInput?.focus();
  });

  document.querySelector('[data-cmm-action="save"]')?.addEventListener('click', function (e) {
    e.preventDefault();
    saveCenterMember();
  });

  document.querySelector('[data-cmm-action="delete"]')?.addEventListener('click', function (e) {
    e.preventDefault();
    deleteClientMember();
  });

  // Navigation
  document.querySelector('[data-cmm-nav="previous"]')?.addEventListener('click', function (e) {
    e.preventDefault();
    viewMemberMaintenance(-1);
  });

  document.querySelector('[data-cmm-nav="next"]')?.addEventListener('click', function (e) {
    e.preventDefault();
    viewMemberMaintenance(1);
  });

  // =========================================================================
  // Lookup Button Click Delegation
  // =========================================================================
  document.addEventListener('click', function (e) {
    var target = e.target instanceof Element ? e.target : e.target?.parentElement;
    if (!target) return;
    var lookupBtn = target.closest('[data-cmm-lookup]');
    if (!lookupBtn) return;

    e.preventDefault();
    e.stopPropagation();

    var which = lookupBtn.getAttribute('data-cmm-lookup');
    openLookup(which);
  }, true);

  // =========================================================================
  // Sidebar Logic
  // =========================================================================
  function setSectionOpen(sectionEl, isOpen) {
    if (!sectionEl) return;
    sectionEl.classList.toggle('is-open', Boolean(isOpen));
    sectionEl.classList.toggle('expanded', Boolean(isOpen));

    var toggle = sectionEl.querySelector('.menu-arrow');
    var items = sectionEl.querySelector('.menu-items');

    if (toggle) {
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      var icon = toggle.querySelector('i');
      if (icon) icon.className = isOpen ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
    }

    if (items) {
      items.hidden = !isOpen;
      items.style.display = '';
    }
  }

  function wireNavSections() {
    var sections = Array.from(document.querySelectorAll('[data-nav-section]'));
    if (!sections.length) return;

    sections.forEach(function (section) {
      var header = section.querySelector('.nav-header--card');
      if (!header) return;

      header.addEventListener('click', function (e) {
        if (e.target?.closest?.('.nav-badge')) return;

        var sidebar = document.getElementById('main-sidebar');
        var mainContainer = document.querySelector('.main-container');
        var toggleBtn = document.getElementById('sidebarToggle');
        var isCollapsed = sidebar && sidebar.classList.contains('collapsed');

        if (isCollapsed) {
          sidebar.classList.remove('collapsed');
          if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
          if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
          sections.forEach(function (s) { setSectionOpen(s, false); });
          setSectionOpen(section, true);
          return;
        }

        var willOpen = !section.classList.contains('is-open');
        sections.forEach(function (s) { setSectionOpen(s, false); });
        setSectionOpen(section, willOpen);
      });
    });

    sections.forEach(function (section) {
      var toggle = section.querySelector('.menu-arrow');
      var initialOpen = toggle?.getAttribute('aria-expanded') === 'true';
      setSectionOpen(section, Boolean(initialOpen));
    });
  }

  function wireSidebarToggle() {
    var sidebar = document.getElementById('main-sidebar');
    var toggle = document.getElementById('sidebarToggle');
    var mainContainer = document.querySelector('.main-container');
    var sections = Array.from(document.querySelectorAll('[data-nav-section]'));
    if (!sidebar || !toggle) return;

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();

      var isCollapsed = sidebar.classList.contains('collapsed');
      if (isCollapsed) {
        sidebar.classList.remove('collapsed');
        if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
        toggle.setAttribute('aria-expanded', 'true');
        sections.forEach(function (section) {
          var isOpen = section.classList.contains('is-open');
          setSectionOpen(section, isOpen);
        });
      } else {
        sidebar.classList.add('collapsed');
        if (mainContainer) mainContainer.classList.add('sidebar-collapsed');
        toggle.setAttribute('aria-expanded', 'false');
        document.querySelectorAll('.menu-items').forEach(function (items) {
          items.hidden = false;
          items.style.display = '';
        });
      }
    });
  }

  function wireSubmoduleSearch() {
    var searchInput = document.getElementById('submoduleSearch');
    var clearButton = document.getElementById('submoduleSearchClear');
    if (!searchInput) return;

    var toggleClearVisibility = function () {
      if (!clearButton) return;
      var hasValue = Boolean(String(searchInput.value || '').trim());
      clearButton.classList.toggle('is-visible', hasValue);
      clearButton.setAttribute('aria-hidden', hasValue ? 'false' : 'true');
    };

    var applySubmoduleFilter = function () {
      var searchTerm = String(searchInput.value || '').toLowerCase().trim();
      var allItems = document.querySelectorAll('.sidebar-item--enhanced[data-cmm-open]');
      var sections = Array.from(document.querySelectorAll('[data-nav-section]'));

      allItems.forEach(function (item) {
        var title = item.querySelector('.sidebar-item__title')?.textContent?.toLowerCase?.() || '';
        var description = item.querySelector('.sidebar-item__description')?.textContent?.toLowerCase?.() || '';
        var matches = !searchTerm || title.includes(searchTerm) || description.includes(searchTerm);
        item.style.display = matches ? '' : 'none';
      });

      sections.forEach(function (section) {
        var items = section.querySelectorAll('.sidebar-item--enhanced[data-cmm-open]');
        var visibleItems = Array.from(items).filter(function (item) { return item.style.display !== 'none'; });
        var navItems = section.querySelector('.menu-items');
        if (!navItems) return;

        if (searchTerm) {
          if (visibleItems.length > 0) {
            setSectionOpen(section, true);
            navItems.style.display = '';
          } else {
            setSectionOpen(section, false);
            navItems.style.display = 'none';
          }
        } else {
          navItems.style.display = '';
          setSectionOpen(section, false);
        }
      });

      toggleClearVisibility();
    };

    searchInput.addEventListener('input', applySubmoduleFilter);
    if (clearButton) {
      clearButton.addEventListener('click', function () {
        if (!searchInput.value) return;
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.focus();
      });
      toggleClearVisibility();
    }
  }

  // =========================================================================
  // Section Toggle (form sections)
  // =========================================================================
  document.querySelectorAll('[data-section-toggle]').forEach(function (header) {
    header.addEventListener('click', function (e) {
      var isButton = e.target?.closest?.('.section-toggle-btn');
      if (isButton && e.currentTarget !== header) return;
      var section = header.closest('.form-section');
      var content = section?.querySelector('[data-section-content]');
      var toggleBtn = header.querySelector('.section-toggle-btn');
      if (!content || !toggleBtn) return;
      var isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        content.style.display = 'none';
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.querySelector('i').className = 'bi bi-chevron-down';
      } else {
        content.style.display = 'block';
        toggleBtn.setAttribute('aria-expanded', 'true');
        toggleBtn.querySelector('i').className = 'bi bi-chevron-up';
      }
    });
  });

  // =========================================================================
  // Docked DataEntry (Submodule Iframe)
  // =========================================================================
  var closeDockedDataEntry = null;
  var activeDockedFrameWindow = null;

  window.addEventListener('message', function (evt) {
    try {
      if (!evt || !evt.data || evt.data.type !== 'kairo-dataentry-close') return;
      if (activeDockedFrameWindow && evt.source !== activeDockedFrameWindow) return;
      closeDockedDataEntry?.();
    } catch { /* ignore */ }
  });

  document.querySelector('.sidebar-content')?.addEventListener('click', function (e) {
    var item = e.target?.closest?.('[data-cmm-open]');
    if (!item) return;
    e.preventDefault();

    if (currentFormState !== 'edit') {
      showToast('Please load a record in View Mode before accessing this module.', 'warning');
      return;
    }

    var referenceNo = String(referenceNoInput?.value || '').trim();
    var series = String(seriesInput?.value || '').trim();
    var clientId = String(clientIdInput?.value || '').trim();
    var clientName = String(clientNameInput?.value || '').trim();

    if (!referenceNo || !series || !clientId || !clientName) {
      showToast('Please ensure all required fields (Reference No, Series, Client ID, and Client Name) are filled in the master screen before accessing this module.', 'warning');
      return;
    }

    var url = item.getAttribute('data-cmm-open');
    var modalEl = document.getElementById('centerMemberMaintenanceDataEntryModal');
    var frame = document.getElementById('centerMemberMaintenanceDataEntryFrame');
    if (!modalEl || !frame || !url) return;

    if (typeof closeDockedDataEntry === 'function') {
      closeDockedDataEntry();
    }

    dockDataEntryModal(modalEl);

    var titleText = String(item.querySelector('.sidebar-item__title')?.textContent || '').trim() || 'Submodule';
    var titleEl = modalEl.querySelector('[data-cmm-de-title]');
    if (titleEl) titleEl.textContent = titleText;

    frame.src = url;
    modalEl.hidden = false;
    document.body.classList.add('cmm-inline-open');
    activeDockedFrameWindow = frame.contentWindow;

    document.querySelectorAll('.sidebar-item--enhanced[data-cmm-open].active').forEach(function (el) { el.classList.remove('active'); });
    item.classList.add('active');

    var onResize = function () { dockDataEntryModal(modalEl); };
    var onKeyDown = function (evt) {
      if (evt.key === 'Escape') {
        evt.preventDefault();
        closeDockedDataEntry?.();
      }
    };

    var closeBtn = modalEl.querySelector('[data-cmm-de-close]');
    var onCloseClick = function (evt) {
      evt.preventDefault();
      closeDockedDataEntry?.();
    };

    window.addEventListener('resize', onResize);
    document.addEventListener('keydown', onKeyDown);
    closeBtn?.addEventListener('click', onCloseClick);

    closeDockedDataEntry = function () {
      try {
        window.removeEventListener('resize', onResize);
        document.removeEventListener('keydown', onKeyDown);
        closeBtn?.removeEventListener('click', onCloseClick);
      } catch { /* ignore */ }

      document.querySelectorAll('.sidebar-item--enhanced[data-cmm-open].active').forEach(function (el) { el.classList.remove('active'); });

      frame.src = 'about:blank';
      modalEl.hidden = true;
      document.body.classList.remove('cmm-inline-open');
      closeDockedDataEntry = null;
      activeDockedFrameWindow = null;
    };
  });

  function dockDataEntryModal(modalEl) {
    try {
      var sidebar = document.getElementById('main-sidebar') || document.querySelector('.sidebar');
      var actionPanel = document.querySelector('.action-panel');
      var windowEl = document.querySelector('.window') || document.body;
      if (!sidebar || !actionPanel || !windowEl) return;

      var sidebarRect = sidebar.getBoundingClientRect();
      var actionRect = actionPanel.getBoundingClientRect();
      var windowRect = windowEl.getBoundingClientRect();

      var left = Math.round(sidebarRect.right);
      var top = Math.round(windowRect.top);
      var height = Math.round(windowRect.height);
      var width = Math.max(320, Math.round(actionRect.right - sidebarRect.right));

      modalEl.style.setProperty('--de-left', left + 'px');
      modalEl.style.setProperty('--de-top', top + 'px');
      modalEl.style.setProperty('--de-width', width + 'px');
      modalEl.style.setProperty('--de-height', height + 'px');
    } catch (err) {
      console.warn('[CenterMemberMaintenance] Failed to dock DataEntry modal:', err);
    }
  }

  // =========================================================================
  // Init
  // =========================================================================
  wireNavSections();
  wireSidebarToggle();
  wireSubmoduleSearch();

  window.viewMemberMaintenance = viewMemberMaintenance;
})();
