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
    var e = window.Environment || {};

    // Auth session from AuthService (localStorage['nimble_auth_session'])
    var session = null;
    try {
      var raw = localStorage.getItem('nimble_auth_session');
      if (raw) session = JSON.parse(raw);
    } catch (_) { /* ignore */ }
    session = session || {};

    var bankId = String(
      e.defaultBankId || e.defaultBankID || e.bankID || e.bankId ||
      sessionStorage.getItem('BankID') || sessionStorage.getItem('bankId') ||
      session.bankID || session.BankID ||
      localStorage.getItem('BankID') || '00'
    ).trim();

    var ourBranchId = String(
      e.OurBranchID || e.branchID || e.branchId ||
      sessionStorage.getItem('BranchID') || sessionStorage.getItem('OurBranchID') || sessionStorage.getItem('currentBranchId') ||
      session.branchID || session.BranchID || session.OurBranchID ||
      localStorage.getItem('BranchID') || '0603'
    ).trim();

    var operatorId = String(
      e.operatorID || e.operatorId || e.UserID ||
      sessionStorage.getItem('OperatorID') || sessionStorage.getItem('operatorId') ||
      session.operatorID || session.OperatorID ||
      localStorage.getItem('OperatorID') || 'CSADM'
    ).trim();

    var workingDate = String(e.workingDate || e.WorkingDate || e.systemDate || e.SystemDate || '2025-08-29').trim();

    return { bankId: bankId, ourBranchId: ourBranchId, operatorId: operatorId, workingDate: workingDate };
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

  // =========================================================================
  // Constants
  // =========================================================================
  const MODULE_ID = '5080';
  const DEFAULT_SEARCH_MODULE_ID = String(window.Environment?.defaultSearchModuleId || window.Environment?.microfinanceModuleId || '5060');

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

  function showToast(message, options) {
    var opts = typeof options === 'string' ? { variant: options } : (options || {});
    var variant = opts.variant || 'info';
    var timeoutMs = opts.timeoutMs || 5000;

    var container = ensureToastContainer();
    container.querySelectorAll('.kairo-toast').forEach(function (t) { t.remove(); });

    var toast = document.createElement('div');
    toast.className = 'kairo-toast kairo-toast--' + variant;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-atomic', 'true');

    var body = document.createElement('div');
    body.className = 'kairo-toast__body';
    body.textContent = String(message || '');

    toast.appendChild(body);
    container.appendChild(toast);

    var remove = function () {
      try {
        toast.classList.remove('is-show');
        setTimeout(function () { toast.remove(); }, 160);
      } catch { /* ignore */ }
    };

    setTimeout(function () { toast.classList.add('is-show'); }, 0);
    if (timeoutMs > 0) setTimeout(remove, timeoutMs);
  }

  function showSuccess(msg) { showToast(msg, { variant: 'success' }); }
  function showError(msg) { showToast(msg, { variant: 'danger' }); }
  function showWarning(msg) { showToast(msg, { variant: 'warning' }); }
  function showInfo(msg) { showToast(msg, { variant: 'info' }); }

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

  // LOOKUP_CONFIG — matches legacy searchGroupClientID / searchGroupID / searchSubGroupID
  // Center & Group use same pattern as change-center-group.js (moduleID 5060)
  const LOOKUP_CONFIG = {
    client: {
      getTableID: function () { return currentFormState === 'add' ? 'ClientWithoutGroupID' : 'GroupClientID'; },
      moduleID: DEFAULT_SEARCH_MODULE_ID,
      getAdvFilterString: function () { return ''; },
      onSelect: function (selected) {
        if (!selected) return;
        clientIdInput.value = selected.ClientID || '';
        if (clientNameInput) clientNameInput.value = selected.ClientName || selected.Name || '';
        if (currentFormState !== 'add') {
          // View/browse: populate center & group from the client's membership
          if (centerIdInput) centerIdInput.value = selected.GroupID || '';
          if (centerNameInput) centerNameInput.value = selected.GroupName || '';
          if (groupIdInput) groupIdInput.value = selected.SubGroupID || '';
          if (groupNameInput) groupNameInput.value = selected.SubGroupName || '';
        }
      }
    },
    center: {
      tableID: 'GroupID',
      moduleID: DEFAULT_SEARCH_MODULE_ID,
      getAdvFilterString: function () {
        var env = getEnv();
        var safeBranchId = String(env.ourBranchId || '').replace(/'/g, "''");
        return safeBranchId ? "OurBranchID='" + safeBranchId + "' AND GroupStatusID='A'" : "GroupStatusID='A'";
      },
      onSelect: async function (selected) {
        if (!selected) return;
        centerIdInput.value = selected.GroupID || '';
        if (centerNameInput) centerNameInput.value = selected.GroupName || '';
        // Clear group — groups depend on the selected center
        if (groupIdInput) groupIdInput.value = '';
        if (groupNameInput) groupNameInput.value = '';
        await fetchGroupProductDetails(selected.GroupID);
      }
    },
    group: {
      tableID: 'SubGroupID',
      moduleID: DEFAULT_SEARCH_MODULE_ID,
      getAdvFilterString: function () {
        var env = getEnv();
        var centerId = String(centerIdInput?.value || '').trim();
        var safeBranchId = String(env.ourBranchId || '').replace(/'/g, "''");
        var safeCenterId = String(centerId).replace(/'/g, "''");
        var parts = [];
        if (safeBranchId) parts.push("OurBranchID='" + safeBranchId + "'");
        if (safeCenterId) parts.push("GroupID='" + safeCenterId + "'");
        return parts.join(' AND ');
      },
      onSelect: function (selected) {
        if (!selected) return;
        groupIdInput.value = selected.SubGroupID || selected.GroupID || '';
        if (groupNameInput) groupNameInput.value = selected.SubGroupName || selected.GroupName || '';
      }
    }
  };

  // =========================================================================
  // Background Search — uses SearchModal/Search (same endpoint as lookup button)
  // =========================================================================
  async function backgroundSearch(tableID, advFilterString, whereStmt, moduleID) {
    var appCore = getAppCore();
    if (!appCore || typeof appCore.invokeControllerAsync !== 'function') {
      throw new Error('AppCore is not available');
    }

    var env = getEnv();
    var response = await appCore.invokeControllerAsync('SearchModal/Search', {
      TableID: tableID,
      WhereStmt: whereStmt || '',
      AdvFilterString: advFilterString || '',
      SearchKey: '',
      ModuleID: String(moduleID || DEFAULT_SEARCH_MODULE_ID),
      PageSize: 20,
      RefID: '',
      PrevOrNext: 1,
      OurBranchID: env.ourBranchId
    });

    var results = [];
    if (response?.success && response?.data) {
      var d = response.data;
      if (Array.isArray(d)) {
        results = d;
      } else if (d.Details) {
        results = Array.isArray(d.Details) ? d.Details : [d.Details];
      } else if (d.details?.SearchResults) {
        results = Array.isArray(d.details.SearchResults) ? d.details.SearchResults : [];
      } else if (d.Records) {
        results = Array.isArray(d.Records) ? d.Records : [];
      }
    }
    return results;
  }

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
      moduleID: config.moduleID || DEFAULT_SEARCH_MODULE_ID,
      whereStmt: '',
      advFilterString: advFilterString,
      searchKey: '',
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
      var result = await invokeController('get-group-product-details', {
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
        showWarning('Group Product Details not found for this center');
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
    var v = (value === null || value === undefined) ? '' : value;
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
      el.value = v;
    } else {
      el.textContent = v || '-';
    }
  }

  function getValue(el) {
    if (!el) return '';
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
      return el.value || '';
    }
    var text = el.textContent || '';
    return text === '-' ? '' : text;
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
    setValue(groupNameInput, member.SubGroupName || member.GroupLeaderDesc || '');
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
      setDisabled(referenceNoInput, true);
      setDisabled(seriesInput, true);
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

      setDisabled(referenceNoInput, true);
      setDisabled(seriesInput, true);
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
      setDisabled(referenceNoInput, false);
      setDisabled(seriesInput, false);
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

  // Disable fields on load (ReferenceNo and Series remain enabled for browse/view filtering)
  (function disableFieldsOnLoad() {
    ['CenterId', 'GroupId', 'JoinOn',
      'MaxGroupLoans', 'MaxGroupLoanLimit', 'MaxOtherLoans', 'MaxOtherLoanLimit', 'CenterLeader'
    ].forEach(disableById);
    disableLookupButton('center');
    disableLookupButton('group');
  })();

  // =========================================================================
  // Client ID Change Handler (uses backgroundSearch via SearchModal/Search)
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
      var config = LOOKUP_CONFIG.client;
      var tableID = typeof config.getTableID === 'function' ? config.getTableID() : config.tableID;
      var advFilter = typeof config.getAdvFilterString === 'function' ? config.getAdvFilterString() : '';
      var safeVal = String(val).replace(/'/g, "''");
      var whereStmt = "ClientID='" + safeVal + "'";

      var results = await backgroundSearch(tableID, advFilter, whereStmt, config.moduleID);

      if (results.length > 0) {
        var selected = results[0];
        if (clientNameInput) clientNameInput.value = selected.ClientName || selected.Name || '';
        if (currentFormState !== 'add') {
          // In browse mode, populate center & group from the search result
          if (centerIdInput) centerIdInput.value = selected.GroupID || '';
          if (centerNameInput) centerNameInput.value = selected.GroupName || '';
          if (groupIdInput) groupIdInput.value = selected.SubGroupID || '';
          if (groupNameInput) groupNameInput.value = selected.SubGroupName || '';
        }
        // In add mode, client/center/group are independent — don't touch center or group fields
      } else {
        if (clientNameInput) clientNameInput.value = '';
        showWarning('Client not found');
      }
    } catch (err) {
      console.error('[CenterMemberMaintenance] ClientId resolve failed:', err);
      showError('Error resolving Client ID');
    }
  });

  // =========================================================================
  // Center ID Change Handler (uses backgroundSearch via SearchModal/Search)
  // =========================================================================
  centerIdInput.addEventListener('change', async function () {
    var val = String(centerIdInput.value || '').trim();
    // Always clear group when center changes (groups depend on the center)
    if (groupIdInput) groupIdInput.value = '';
    if (groupNameInput) groupNameInput.value = '';
    if (!val) {
      if (centerNameInput) centerNameInput.value = '';
      if (maxGroupLoansInput) maxGroupLoansInput.value = '';
      if (maxGroupLoanLimitInput) maxGroupLoanLimitInput.value = '';
      if (maxOtherLoansInput) maxOtherLoansInput.value = '';
      if (maxOtherLoanLimitInput) maxOtherLoanLimitInput.value = '';
      return;
    }

    try {
      var config = LOOKUP_CONFIG.center;
      var advFilter = typeof config.getAdvFilterString === 'function' ? config.getAdvFilterString() : '';
      var safeVal = String(val).replace(/'/g, "''");
      var whereStmt = "GroupID='" + safeVal + "'";

      var results = await backgroundSearch(config.tableID, advFilter, whereStmt, config.moduleID);

      if (results.length > 0) {
        var selected = results[0];
        if (centerNameInput) centerNameInput.value = selected.GroupName || '';
        await fetchGroupProductDetails(val);
      } else {
        if (centerNameInput) centerNameInput.value = '';
        showWarning('Center not found');
      }
    } catch (err) {
      console.error('[CenterMemberMaintenance] CenterId validation failed:', err);
      showError('Error validating Center ID');
    }
  });

  // =========================================================================
  // Group ID Change Handler (uses backgroundSearch via SearchModal/Search)
  // =========================================================================
  groupIdInput.addEventListener('change', async function () {
    var val = String(groupIdInput.value || '').trim();
    if (!val) {
      if (groupNameInput) groupNameInput.value = '';
      return;
    }

    try {
      var config = LOOKUP_CONFIG.group;
      var advFilter = typeof config.getAdvFilterString === 'function' ? config.getAdvFilterString() : '';
      var safeVal = String(val).replace(/'/g, "''");
      var whereStmt = "SubGroupID='" + safeVal + "'";

      var results = await backgroundSearch(config.tableID, advFilter, whereStmt, config.moduleID);

      if (results.length > 0) {
        var selected = results[0];
        if (groupNameInput) groupNameInput.value = selected.SubGroupName || selected.GroupName || '';
      } else {
        if (groupNameInput) groupNameInput.value = '';
        showWarning('Group not found');
      }
    } catch (err) {
      console.error('[CenterMemberMaintenance] GroupId validation failed:', err);
      showError('Error validating Group ID');
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
      var result = await invokeController('get-group-members', {
        ClientID: clientId,
        OurBranchID: env.ourBranchId,
        OperatorID: env.operatorId,
        RefID: refId,
        Series: series,
        Direction: direction
      });

      // Actual member data is in Details01; Details is metadata/placeholder
      var root = result?.data ?? result;
      var members = [];
      var details01 = root?.Details01 ?? root?.details01;
      var details = root?.Details ?? root?.details;
      if (Array.isArray(details01) && details01.length > 0) {
        members = details01;
      } else if (Array.isArray(details) && details.length > 0) {
        members = details;
      }
      var first = members[0] || null;

      // Detect empty placeholder response (no actual member data)
      if (!first || (!first.ClientID && !first.GroupID && !first.RefID)) {
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
      var supervisedBy = getValue(behindFields.supervisedBy);

      var requestData = {
        ClientID: clientId,
        RefID: isAdd ? '0' : (String(referenceNoInput?.value || '0').trim()),
        OurBranchID: env.ourBranchId,
        GroupID: centerId,
        SubGroupID: groupId,
        RegistrationDate: isAdd ? env.workingDate : (env.workingDate || joinOnDate),
        JoinDate: joinOnDate,
        MaxGroupLoans: Number(maxGroupLoansInput?.value || 0),
        MaxGroupLoanLimit: Number(maxGroupLoanLimitInput?.value || 0),
        MaxLoans: Number(maxOtherLoansInput?.value || 0),
        MaxLoanLimit: Number(maxOtherLoanLimitInput?.value || 0),
        CreatedBy: isAdd ? env.operatorId : getValue(behindFields.createdBy),
        CreatedOn: isAdd ? new Date().toISOString() : getValue(behindFields.createdOn),
        ModifiedBy: isAdd ? '' : env.operatorId,
        ModifiedOn: isAdd ? '' : new Date().toISOString(),
        SupervisedBy: supervisedBy,
        IsCombinedCapture: false,
        NewRecord: isAdd ? 1 : currentUpdateCount,
        GroupLeaderID: String(centerLeaderInput?.value || '').trim()
      };

      var result = await invokeController('save-group-member', requestData);

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
    var appCore = getAppCore();
    var confirmed = false;
    if (appCore && typeof appCore.showConfirmation === 'function') {
      confirmed = await appCore.showConfirmation('Confirm Delete', 'Do you want to Abort/Discard the changes? [No:1100]');
    } else {
      confirmed = confirm('Do you want to Abort/Discard the changes?\n[No:1100]');
    }
    if (!confirmed) return;

    var clientId = String(clientIdInput?.value || '').trim();
    var refNo = String(referenceNoInput?.value || '').trim();
    var series = String(seriesInput?.value || '').trim();
    var deleteBtn = document.querySelector('[data-cmm-action="delete"]');

    setDisabled(deleteBtn, true);

    try {
      var result = await invokeController('delete-group-member', {
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
  function wireActionButtons() {
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
  }

  // Wire main action buttons on initial load
  wireActionButtons();

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
      var allItems = document.querySelectorAll('.sidebar-item--enhanced[data-submodule]');
      var sections = Array.from(document.querySelectorAll('[data-nav-section]'));

      allItems.forEach(function (item) {
        var title = item.querySelector('.sidebar-item__title')?.textContent?.toLowerCase?.() || '';
        var description = item.querySelector('.sidebar-item__description')?.textContent?.toLowerCase?.() || '';
        var matches = !searchTerm || title.includes(searchTerm) || description.includes(searchTerm);
        item.style.display = matches ? '' : 'none';
      });

      sections.forEach(function (section) {
        var items = section.querySelectorAll('.sidebar-item--enhanced[data-submodule]');
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
  // Submodule Loading (fetch + innerHTML pattern, like Account Maintenance)
  // =========================================================================

  function executeScripts(scripts) {
    return scripts.reduce(function (promise, scriptStub) {
      return promise.then(function () {
        return new Promise(function (resolve) {
          var newScript = document.createElement('script');
          Array.from(scriptStub.attributes).forEach(function (attr) {
            newScript.setAttribute(attr.name, attr.value);
          });
          if (scriptStub.textContent) {
            newScript.textContent = scriptStub.textContent;
          }
          if (newScript.src) {
            newScript.onload = function () { resolve(); };
            newScript.onerror = function () { resolve(); };
            document.body.appendChild(newScript);
          } else {
            document.body.appendChild(newScript);
            setTimeout(resolve, 10);
          }
        });
      });
    }, Promise.resolve());
  }

  function loadSubmoduleView(submoduleName) {
    if (currentFormState !== 'edit') {
      showToast('Please load a record in View Mode before accessing this module.', 'warning');
      return;
    }

    var referenceNo = String(referenceNoInput?.value || '').trim();
    var series = String(seriesInput?.value || '').trim();
    var clientId = String(clientIdInput?.value || '').trim();
    var clientName = String(clientNameInput?.value || '').trim();

    if (!referenceNo || !series || !clientId || !clientName) {
      showToast('Please ensure all required fields (Reference No, Series, Client ID, and Client Name) are filled before accessing this module.', 'warning');
      return;
    }

    fetch('/MicroFinance/CenterMemberMaintenance/' + submoduleName + '?_t=' + Date.now(), {
      method: 'GET',
      headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' }
    })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP error! status: ' + response.status);
        return response.text();
      })
      .then(function (html) {
        var container = document.getElementById('submodule-container');
        if (!container) return;

        // Hide the main form
        var mainForm = container.querySelector('[data-main-form]');
        if (mainForm) mainForm.style.display = 'none';

        // Remove any existing submodule
        var existingSubmodule = container.querySelector('[data-submodule-content]');
        if (existingSubmodule) existingSubmodule.remove();

        // Create wrapper, inject HTML
        var wrapper = document.createElement('div');
        wrapper.setAttribute('data-submodule-content', submoduleName);
        wrapper.innerHTML = html;

        // Extract scripts to execute them after insertion
        var scripts = Array.from(wrapper.querySelectorAll('script'));
        scripts.forEach(function (s) { s.remove(); });
        container.appendChild(wrapper);

        var formContent = document.querySelector('.form-content');
        if (formContent) formContent.scrollTop = 0;

        // Execute scripts then init the submodule
        executeScripts(scripts).then(function () {
          updateActionPanelForSubmodule(submoduleName);

          if (submoduleName === 'CenterMemberScheme' && window.CenterMemberSchemeModule && window.CenterMemberSchemeModule.init) {
            window.CenterMemberSchemeModule.init();
          }
        });

        showToast(submoduleName + ' loaded successfully', 'success');
      })
      .catch(function (error) {
        console.error('[CenterMemberMaintenance] Error loading ' + submoduleName + ':', error);
        showToast('Failed to load ' + submoduleName + ': ' + error.message, 'danger');
      });
  }

  function updateActionPanelForSubmodule(submoduleName) {
    var parentActionPanel = document.querySelector('.main-container > .action-panel');
    if (!parentActionPanel) return;

    // Hide nav groups
    parentActionPanel.querySelectorAll('.nav-group').forEach(function (g) { g.style.display = 'none'; });

    // Hide reinstate button
    var reinstateBtn = parentActionPanel.querySelector('[data-cmm-action="reinstate"]');
    if (reinstateBtn) reinstateBtn.style.display = 'none';

    var actionButtonsContainer = parentActionPanel.querySelector('.action-buttons');
    if (!actionButtonsContainer) return;

    // Store original buttons if not already stored
    if (!parentActionPanel.dataset.originalButtons) {
      parentActionPanel.dataset.originalButtons = actionButtonsContainer.innerHTML;
    }

    var newButtonsHtml = '';

    if (submoduleName === 'CenterMemberScheme') {
      // Remove any previously injected nav groups
      parentActionPanel.querySelectorAll('.submodule-nav-group').forEach(function (e) { e.remove(); });

      var navGroupHtml = '<div class="nav-group submodule-nav-group">' +
        '<button class="btn-nav green" type="button" id="submoduleBtnPrev" aria-label="Previous"><i class="bi bi-chevron-left"></i></button>' +
        '<span>Record</span>' +
        '<button class="btn-nav green" type="button" id="submoduleBtnNext" aria-label="Next"><i class="bi bi-chevron-right"></i></button>' +
        '</div>';

      actionButtonsContainer.insertAdjacentHTML('beforebegin', navGroupHtml);

      newButtonsHtml = '<button class="btn-action btn-view" type="button" id="submoduleBtnView"><i class="bi bi-eye me-1"></i>View</button>' +
        '<button class="btn-action btn-add" type="button" id="submoduleBtnAdd"><i class="bi bi-plus-circle me-1"></i>Add</button>' +
        '<button class="btn-action btn-edit" type="button" id="submoduleBtnEdit"><i class="bi bi-pencil-square me-1"></i>Edit</button>' +
        '<button class="btn-action btn-delete" type="button" id="submoduleBtnDelete"><i class="bi bi-trash me-1"></i>Delete</button>' +
        '<button class="btn-action btn-save" type="button" id="submoduleBtnSave"><i class="bi bi-check-lg me-1"></i>Save</button>' +
        '<button class="btn-action btn-cancel" type="button" id="submoduleBtnCancel"><i class="bi bi-x-circle me-1"></i>Cancel</button>' +
        '<button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose"><i class="bi bi-box-arrow-right me-1"></i>Close</button>';
    }

    if (newButtonsHtml) {
      actionButtonsContainer.innerHTML = newButtonsHtml;
    }
  }

  function restoreMainActionPanel() {
    var parentActionPanel = document.querySelector('.main-container > .action-panel');
    if (!parentActionPanel) return;

    // Show nav groups
    parentActionPanel.querySelectorAll('.nav-group:not(.submodule-nav-group)').forEach(function (g) { g.style.display = 'flex'; });

    // Show reinstate button
    var reinstateBtn = parentActionPanel.querySelector('[data-cmm-action="reinstate"]');
    if (reinstateBtn) reinstateBtn.style.display = '';

    // Remove injected submodule nav groups
    parentActionPanel.querySelectorAll('.submodule-nav-group').forEach(function (e) { e.remove(); });

    var actionButtonsContainer = parentActionPanel.querySelector('.action-buttons');
    if (actionButtonsContainer && parentActionPanel.dataset.originalButtons) {
      actionButtonsContainer.innerHTML = parentActionPanel.dataset.originalButtons;
      delete parentActionPanel.dataset.originalButtons;
    }

    // Re-wire the main action buttons
    wireActionButtons();
  }

  function closeSubmodule() {
    var container = document.getElementById('submodule-container');
    if (!container) return;

    // Remove the submodule content
    var submoduleContent = container.querySelector('[data-submodule-content]');
    if (submoduleContent) submoduleContent.remove();

    // Show the main form again
    var mainForm = container.querySelector('[data-main-form]');
    if (mainForm) mainForm.style.display = '';

    // Restore the main action panel
    restoreMainActionPanel();

    // Remove active state from sidebar
    document.querySelectorAll('.sidebar-item--enhanced[data-submodule].active').forEach(function (el) {
      el.classList.remove('active');
    });
  }

  // Expose closeSubmodule for submodule scripts to call
  window.closeSubmodule = closeSubmodule;

  // Sidebar click handler — loads submodule inline
  document.querySelector('.sidebar-content')?.addEventListener('click', function (e) {
    var item = e.target?.closest?.('[data-submodule]');
    if (!item) return;
    e.preventDefault();

    var submoduleName = item.getAttribute('data-submodule');
    if (!submoduleName) return;

    // Set active state
    document.querySelectorAll('.sidebar-item--enhanced[data-submodule].active').forEach(function (el) { el.classList.remove('active'); });
    item.classList.add('active');

    loadSubmoduleView(submoduleName);
  });

  // =========================================================================
  // Init
  // =========================================================================
  wireNavSections();
  wireSidebarToggle();
  wireSubmoduleSearch();

  window.viewMemberMaintenance = viewMemberMaintenance;
})();
