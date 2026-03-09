/**
 * Center Member Scheme (DataEntry submodule)
 * Converted from legacy HTML/JS to KAIRO MVC pattern.
 * Loaded inline inside parent #submodule-container via fetch+innerHTML.
 * Uses AppCore.invokeControllerAsync → CenterMemberSchemeController endpoints.
 */
(function () {
  'use strict';

  // =========================================================================
  // AppCore & Environment Helpers
  // =========================================================================
  function getAppCore() {
    return window.AppCore || null;
  }

  function getEnv() {
    var e = window.Environment || {};
    var session = null;
    try { session = JSON.parse(localStorage.getItem('nimble_auth_session')); } catch (_) { /* ignore */ }
    session = session || {};

    return {
      bankId: String(e.defaultBankId || e.bankID || session.bankID || '00').trim(),
      ourBranchId: String(e.OurBranchID || e.branchID || session.branchID || '0603').trim(),
      operatorId: String(e.operatorID || e.operatorId || e.UserID || session.operatorID || 'CSADM').trim(),
      workingDate: String(e.workingDate || e.WorkingDate || '2025-08-29').trim()
    };
  }

  // =========================================================================
  // Service Invoker — ALL API calls via AppCore.invokeControllerAsync
  // =========================================================================
  async function invokeController(action, requestData) {
    var appCore = getAppCore();
    if (!appCore || typeof appCore.invokeControllerAsync !== 'function') {
      throw new Error('AppCore.invokeControllerAsync is not available');
    }
    var endpoint = 'MicroFinance/DataEntry/CenterMemberScheme/' + action;
    return appCore.invokeControllerAsync(endpoint, requestData || {});
  }

  // =========================================================================
  // Constants
  // =========================================================================
  var MODULE_ID = '5080';
  var DEFAULT_SEARCH_MODULE_ID = String(window.Environment?.defaultSearchModuleId || '5060');

  // =========================================================================
  // State
  // =========================================================================
  var assignedLoanSchemeId = '';
  var currentUpdateCount = 0;
  var currentFormMode = 'browse'; // browse | add | edit

  // =========================================================================
  // Context — reads from same document (parent form fields)
  // =========================================================================
  function getParentContext() {
    return {
      clientId: String(document.getElementById('ClientId')?.value || '').trim(),
      refId: String(document.getElementById('ReferenceNo')?.value || '').trim(),
      centerId: String(document.getElementById('CenterId')?.value || '').trim()
    };
  }

  // =========================================================================
  // DOM References (resolved in init)
  // =========================================================================
  var schemeIdInput, schemeNameInput, primaryCollateralInput, collateralRatioInput;
  var savingsAmountInput, secondaryCollateralInput, additionalCollateralInput;
  var joinDateInput, loanLevelNoInput, statusSelect;
  var auditFields = {};
  var schemeLookupBtn;

  // =========================================================================
  // Toast — uses parent module's showToast (same window)
  // =========================================================================
  function showToast(msg, variant) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, variant || 'info');
    } else {
      console.log('[CMS Toast]', variant, msg);
    }
  }

  // =========================================================================
  // Utility
  // =========================================================================
  function formatDateToDDMMMYYYY(dateStr) {
    if (!dateStr) return '';
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var dateObj = new Date(dateStr);
    if (isNaN(dateObj)) return dateStr;
    return String(dateObj.getDate()).padStart(2, '0') + '/' + months[dateObj.getMonth()] + '/' + dateObj.getFullYear();
  }

  var pad2 = function (n) { return String(n).padStart(2, '0'); };

  function formatRequestTime(date) {
    date = date || new Date();
    return pad2(date.getMonth() + 1) + '/' + pad2(date.getDate()) + '/' + date.getFullYear() + ' ' +
      pad2(date.getHours()) + ':' + pad2(date.getMinutes()) + ':' + pad2(date.getSeconds());
  }

  function setSpanValue(el, value) {
    if (!el) return;
    el.textContent = (value !== null && value !== undefined && value !== '') ? String(value) : '-';
  }

  function getSpanValue(el) {
    if (!el) return '';
    var text = el.textContent || '';
    return text === '-' ? '' : text.trim();
  }

  // =========================================================================
  // Form Population & Clear
  // =========================================================================
  function populateSchemeForm(scheme) {
    if (!scheme) return;

    assignedLoanSchemeId = String(scheme.LoanSchemeID || '').trim();
    currentUpdateCount = scheme.UpdateCount || 0;

    // Main editable fields
    if (schemeIdInput) schemeIdInput.value = scheme.LoanSchemeID || '';
    if (schemeNameInput) schemeNameInput.value = scheme.SchemeName || '';
    if (loanLevelNoInput) loanLevelNoInput.value = scheme.LoanLevelNo || '';
    if (savingsAmountInput) savingsAmountInput.value = scheme.SavingsAmount || '';
    if (primaryCollateralInput) primaryCollateralInput.value = scheme.PrimaryCollateral || '';
    if (secondaryCollateralInput) secondaryCollateralInput.value = scheme.SecondaryCollateral || '';
    if (additionalCollateralInput) additionalCollateralInput.value = scheme.AdditionalCollateral || '';
    if (collateralRatioInput) collateralRatioInput.value = scheme.CollateralRatio || '';
    if (statusSelect) statusSelect.value = scheme.MemberSchemeStatusID || '';
    if (joinDateInput) joinDateInput.value = formatDateToDDMMMYYYY(scheme.JoinDate || scheme.SchemeChosenDate || '');

    // Behind the scene (audit spans)
    setSpanValue(auditFields.loanAccountId, scheme.LoanAccountID);
    setSpanValue(auditFields.loanProductId, scheme.LoanProductID);
    setSpanValue(auditFields.savingAccountId, scheme.SavingsAccountID);
    setSpanValue(auditFields.savingProductId, scheme.SavingsProductID);
    setSpanValue(auditFields.cycleNo, scheme.LoanCycleNo);
    setSpanValue(auditFields.createdBy, scheme.CreatedBy);
    setSpanValue(auditFields.createdOn, formatDateToDDMMMYYYY(scheme.CreatedOn));
    setSpanValue(auditFields.modifiedBy, scheme.ModifiedBy);
    setSpanValue(auditFields.modifiedOn, formatDateToDDMMMYYYY(scheme.ModifiedOn));
    setSpanValue(auditFields.supervisedBy, scheme.SupervisedBy);
    setSpanValue(auditFields.supervisedOn, formatDateToDDMMMYYYY(scheme.SupervisedOn));
  }

  function clearAllFields() {
    [schemeIdInput, schemeNameInput, primaryCollateralInput, collateralRatioInput,
      savingsAmountInput, secondaryCollateralInput, additionalCollateralInput,
      joinDateInput, loanLevelNoInput].forEach(function (el) {
      if (el) el.value = '';
    });
    if (statusSelect) statusSelect.value = '';

    Object.keys(auditFields).forEach(function (key) {
      setSpanValue(auditFields[key], '-');
    });

    assignedLoanSchemeId = '';
    currentUpdateCount = 0;
  }

  // =========================================================================
  // Disable / Enable Helpers
  // =========================================================================
  function setAllFieldsDisabled(disabled) {
    [schemeIdInput, schemeNameInput, primaryCollateralInput, collateralRatioInput,
      savingsAmountInput, secondaryCollateralInput, additionalCollateralInput,
      joinDateInput, loanLevelNoInput, statusSelect].forEach(function (el) {
      if (!el) return;
      el.disabled = !!disabled;
      if (disabled) el.setAttribute('readonly', '');
      else el.removeAttribute('readonly');
    });
    if (schemeLookupBtn) schemeLookupBtn.disabled = !!disabled;
  }

  // Button state management uses the parent action panel buttons (submoduleBtnXxx IDs)
  function setButtonStates(states) {
    var btnAdd = document.getElementById('submoduleBtnAdd');
    var btnEdit = document.getElementById('submoduleBtnEdit');
    var btnDelete = document.getElementById('submoduleBtnDelete');
    var btnSave = document.getElementById('submoduleBtnSave');
    var btnCancel = document.getElementById('submoduleBtnCancel');
    var btnView = document.getElementById('submoduleBtnView');
    var btnPrev = document.getElementById('submoduleBtnPrev');
    var btnNext = document.getElementById('submoduleBtnNext');

    if (btnAdd) btnAdd.disabled = !states.add;
    if (btnEdit) btnEdit.disabled = !states.edit;
    if (btnDelete) btnDelete.disabled = !states.del;
    if (btnSave) btnSave.disabled = !states.save;
    if (btnCancel) btnCancel.disabled = !states.cancel;
    if (btnView) btnView.disabled = !states.view;
    if (btnPrev) btnPrev.disabled = !states.nav;
    if (btnNext) btnNext.disabled = !states.nav;
  }

  // Browse mode — data loaded, all disabled
  function setBrowseMode() {
    currentFormMode = 'browse';
    setAllFieldsDisabled(true);
    setButtonStates({ add: true, edit: true, del: true, save: false, cancel: false, view: false, nav: true });
  }

  // Empty mode — no data loaded
  function setEmptyMode() {
    currentFormMode = 'browse';
    setAllFieldsDisabled(true);
    setButtonStates({ add: true, edit: false, del: false, save: false, cancel: false, view: false, nav: false });
  }

  // Add mode — clear fields, enable editable ones
  function setAddMode() {
    currentFormMode = 'add';
    clearAllFields();
    setAllFieldsDisabled(true);

    // Enable editable fields for add
    if (schemeIdInput) { schemeIdInput.disabled = false; schemeIdInput.removeAttribute('readonly'); }
    if (loanLevelNoInput) { loanLevelNoInput.disabled = false; loanLevelNoInput.removeAttribute('readonly'); }
    if (statusSelect) { statusSelect.disabled = false; statusSelect.removeAttribute('readonly'); statusSelect.value = 'A'; }
    if (joinDateInput) { joinDateInput.disabled = false; joinDateInput.removeAttribute('readonly'); }
    if (schemeLookupBtn) schemeLookupBtn.disabled = false;

    setButtonStates({ add: false, edit: false, del: false, save: true, cancel: true, view: false, nav: false });
  }

  // Edit mode — only Status and LoanLevelNo editable
  function setEditMode() {
    currentFormMode = 'edit';
    setAllFieldsDisabled(true);

    if (statusSelect) { statusSelect.disabled = false; statusSelect.removeAttribute('readonly'); }
    if (loanLevelNoInput) { loanLevelNoInput.disabled = false; loanLevelNoInput.removeAttribute('readonly'); }

    setButtonStates({ add: false, edit: false, del: false, save: true, cancel: true, view: false, nav: false });
  }

  // =========================================================================
  // SearchModal Integration — Scheme Lookup (uses shared SearchModal)
  // =========================================================================
  var searchModal = null;

  function getSearchModal() {
    if (searchModal) return searchModal;
    var appCore = getAppCore();
    if (appCore && typeof appCore.SearchModal === 'function') {
      searchModal = new appCore.SearchModal('searchModalContainer');
    }
    return searchModal;
  }

  function openSchemeLookup() {
    var modal = getSearchModal();
    if (!modal) {
      showToast('Search modal is not available.', 'warning');
      return;
    }

    var env = getEnv();
    var ctx = getParentContext();

    var advParts = [];
    if (env.ourBranchId) advParts.push("OurBranchID='" + env.ourBranchId.replace(/'/g, "''") + "'");
    if (ctx.centerId) advParts.push("GroupID='" + ctx.centerId.replace(/'/g, "''") + "'");
    if (assignedLoanSchemeId) advParts.push("LoanSchemeID <> '" + assignedLoanSchemeId.replace(/'/g, "''") + "'");

    modal.open({
      tableID: 'GroupLoanSchemeID',
      moduleID: DEFAULT_SEARCH_MODULE_ID,
      whereStmt: '',
      advFilterString: advParts.join(' And '),
      searchKey: '',
      ourbranchId: env.ourBranchId,
      onSelect: async function (selected) {
        if (!selected) return;

        var schemeId = String(selected.LoanSchemeID || selected.SchemeID || '').trim();
        var schemeName = String(selected.Description || selected.SchemeName || '').trim();

        if (schemeIdInput) { schemeIdInput.value = schemeId; }
        if (schemeNameInput) { schemeNameInput.value = schemeName; }

        // Fetch detailed scheme info
        try {
          var ctx2 = getParentContext();
          var result = await invokeController('get-group-member-scheme', {
            OurBranchID: env.ourBranchId,
            ClientID: ctx2.clientId,
            RefID: ctx2.refId || '1',
            LoanSchemeID: schemeId,
            Direction: '0',
            OperatorID: env.operatorId
          });

          var root = result?.data ?? result;
          var details01 = root?.Details01 ?? root?.details01;
          if (Array.isArray(details01) && details01.length > 0) {
            var d = details01[0];
            if (loanLevelNoInput) loanLevelNoInput.value = d.LoanLevelNo || '';
            if (savingsAmountInput) savingsAmountInput.value = d.SavingsAmount || '';
            if (primaryCollateralInput) primaryCollateralInput.value = d.PrimaryCollateral || '';
            if (secondaryCollateralInput) secondaryCollateralInput.value = d.SecondaryCollateral || '';
            if (additionalCollateralInput) additionalCollateralInput.value = d.AdditionalCollateral || '';
            if (collateralRatioInput) collateralRatioInput.value = d.CollateralRatio || '';
            setSpanValue(auditFields.loanAccountId, d.LoanAccountID);
            setSpanValue(auditFields.loanProductId, d.LoanProductID);
            setSpanValue(auditFields.savingAccountId, d.SavingsAccountID);
            setSpanValue(auditFields.savingProductId, d.SavingsProductID);
          }
        } catch (err) {
          console.error('[CMS] Failed to fetch scheme details after lookup:', err);
        }
      }
    });
  }

  // =========================================================================
  // CRUD Operations
  // =========================================================================

  /** Load current scheme data from parent context */
  async function loadSchemeData() {
    var ctx = getParentContext();
    var env = getEnv();

    if (!ctx.clientId || !ctx.refId) {
      console.warn('[CMS] ClientId or RefId not available');
      setEmptyMode();
      return;
    }

    try {
      var result = await invokeController('get-group-member-scheme', {
        ClientID: ctx.clientId,
        RefID: ctx.refId,
        OurBranchID: env.ourBranchId,
        Direction: '0',
        OperatorID: env.operatorId
      });

      var root = result?.data ?? result;
      var schemes = root?.Details01 ?? root?.details01 ?? [];

      if (Array.isArray(schemes) && schemes.length > 0) {
        populateSchemeForm(schemes[0]);
        setBrowseMode();
      } else {
        setEmptyMode();
      }
    } catch (err) {
      console.error('[CMS] Error loading scheme data:', err);
      setEmptyMode();
    }
  }

  /** Navigate to previous/next scheme */
  async function navigateScheme(direction) {
    var ctx = getParentContext();
    var env = getEnv();
    var currentSchemeId = String(schemeIdInput?.value || '').trim();

    if (!ctx.clientId || !ctx.refId || !currentSchemeId) {
      showToast('Missing required data for navigation', 'warning');
      return;
    }

    try {
      var result = await invokeController('get-group-member-scheme', {
        OurBranchID: env.ourBranchId,
        ClientID: ctx.clientId,
        RefID: ctx.refId,
        LoanSchemeID: currentSchemeId,
        Direction: String(direction),
        OperatorID: env.operatorId
      });

      var root = result?.data ?? result;
      var details01 = root?.Details01 ?? root?.details01 ?? [];

      if (Array.isArray(details01) && details01.length > 0) {
        populateSchemeForm(details01[0]);
        setBrowseMode();
      } else {
        showToast('No More Records in that Direction', 'info');
      }
    } catch (err) {
      console.error('[CMS] Navigation error:', err);
      showToast('Error navigating records', 'danger');
    }
  }

  /** Save scheme (Add or Edit) */
  async function saveScheme() {
    var schemeId = String(schemeIdInput?.value || '').trim();
    var schemeName = String(schemeNameInput?.value || '').trim();
    var status = String(statusSelect?.value || '').trim();
    var loanLevelNo = String(loanLevelNoInput?.value || '').trim();

    if (!schemeId || !schemeName || !status || !loanLevelNo) {
      showToast('SchemeID, SchemeName, Status, and Loan Level No are required', 'danger');
      return;
    }

    var ctx = getParentContext();
    var env = getEnv();

    if (!ctx.clientId || !ctx.refId) {
      showToast('Missing client information', 'danger');
      return;
    }

    var isNewRecord = !getSpanValue(auditFields.createdBy);

    try {
      var result = await invokeController('save-group-member-scheme', {
        ClientID: ctx.clientId,
        RefID: ctx.refId,
        LoanSchemeID: schemeId,
        LoanLevelNo: loanLevelNo,
        OurBranchID: env.ourBranchId,
        MemberSchemeStatusID: status,
        CreatedBy: isNewRecord ? env.operatorId : getSpanValue(auditFields.createdBy),
        CreatedOn: isNewRecord ? formatRequestTime() : getSpanValue(auditFields.createdOn),
        ModifiedBy: isNewRecord ? '' : env.operatorId,
        ModifiedOn: isNewRecord ? '' : formatRequestTime(),
        SupervisedBy: getSpanValue(auditFields.supervisedBy),
        UpdateCount: currentUpdateCount || 1
      });

      var root = result?.data ?? result;

      if (root?.Status === '019' || root?.Status === '091') {
        showToast(root.Message || 'Error saving scheme', 'danger');
        return;
      }

      // Check for success
      var details = root?.Details ?? root?.details;
      if (details !== null && details !== undefined) {
        assignedLoanSchemeId = schemeId;
        showToast('Scheme saved successfully', 'success');
        await loadSchemeData();
      } else {
        showToast('Error saving scheme', 'danger');
      }
    } catch (err) {
      console.error('[CMS] Save error:', err);
      showToast('Error saving scheme: ' + (err?.message || 'Unknown error'), 'danger');
    }
  }

  /** Delete scheme */
  async function deleteScheme() {
    var schemeId = String(schemeIdInput?.value || '').trim();
    var ctx = getParentContext();
    var env = getEnv();

    if (!ctx.clientId || !ctx.refId || !schemeId) {
      showToast('Missing required data for deletion', 'danger');
      return;
    }

    // Confirmation
    var appCore = getAppCore();
    var confirmed = false;
    if (appCore && typeof appCore.showConfirmation === 'function') {
      confirmed = await appCore.showConfirmation('Confirm Delete', 'Are you sure you want to delete this scheme?');
    } else {
      confirmed = confirm('Are you sure you want to delete this scheme?');
    }
    if (!confirmed) return;

    try {
      var result = await invokeController('delete-group-member-scheme', {
        OurBranchID: env.ourBranchId,
        ClientID: ctx.clientId,
        RefID: ctx.refId,
        LoanSchemeID: schemeId
      });

      var root = result?.data ?? result;

      if (root?.Status === '091') {
        showToast(root.Message || 'Error deleting scheme', 'danger');
        return;
      }

      var details = root?.Details ?? root?.details;
      if (details !== null && details !== undefined) {
        showToast('Scheme deleted successfully', 'success');
        clearAllFields();
        setEmptyMode();
      } else {
        showToast('Error deleting scheme', 'danger');
      }
    } catch (err) {
      console.error('[CMS] Delete error:', err);
      showToast('Error deleting scheme: ' + (err?.message || 'Unknown error'), 'danger');
    }
  }

  // =========================================================================
  // Add button — validates current scheme before entering add mode
  // =========================================================================
  async function handleAdd() {
    var ctx = getParentContext();
    var env = getEnv();

    if (!ctx.clientId || !ctx.refId) {
      showToast('ClientId or RefId not available', 'warning');
      return;
    }

    try {
      var result = await invokeController('get-group-member-scheme', {
        ClientID: ctx.clientId,
        RefID: ctx.refId,
        OurBranchID: env.ourBranchId,
        Direction: '0',
        OperatorID: env.operatorId
      });

      var root = result?.data ?? result;
      var schemes = root?.Details01 ?? root?.details01 ?? [];

      if (schemes.length > 0) {
        var updateCount = schemes[0].UpdateCount || 0;

        if (updateCount === 1) {
          populateSchemeForm(schemes[0]);
          setEditMode();
          if (joinDateInput) { joinDateInput.disabled = false; joinDateInput.removeAttribute('readonly'); }
        } else if (updateCount > 1) {
          setAddMode();
        }
      } else {
        setAddMode();
      }
    } catch (err) {
      console.error('[CMS] Error in Add handler:', err);
      setAddMode();
    }
  }

  // =========================================================================
  // Wire action panel buttons (parent's submoduleBtnXxx)
  // =========================================================================
  function wireActionButtons() {
    var btnAdd = document.getElementById('submoduleBtnAdd');
    var btnEdit = document.getElementById('submoduleBtnEdit');
    var btnDelete = document.getElementById('submoduleBtnDelete');
    var btnSave = document.getElementById('submoduleBtnSave');
    var btnCancel = document.getElementById('submoduleBtnCancel');
    var btnView = document.getElementById('submoduleBtnView');
    var btnClose = document.getElementById('submoduleBtnClose');
    var btnPrev = document.getElementById('submoduleBtnPrev');
    var btnNext = document.getElementById('submoduleBtnNext');

    if (btnAdd) btnAdd.addEventListener('click', function (e) { e.preventDefault(); handleAdd(); });
    if (btnEdit) btnEdit.addEventListener('click', function (e) {
      e.preventDefault();
      var sid = String(schemeIdInput?.value || '').trim();
      var sname = String(schemeNameInput?.value || '').trim();
      if (!sid || !sname) {
        showToast('Invalid Scheme ID', 'danger');
        return;
      }
      setEditMode();
    });
    if (btnDelete) btnDelete.addEventListener('click', function (e) { e.preventDefault(); deleteScheme(); });
    if (btnSave) btnSave.addEventListener('click', function (e) { e.preventDefault(); saveScheme(); });
    if (btnCancel) btnCancel.addEventListener('click', function (e) { e.preventDefault(); loadSchemeData(); });
    if (btnClose) btnClose.addEventListener('click', function (e) {
      e.preventDefault();
      if (typeof window.closeSubmodule === 'function') window.closeSubmodule();
    });
    if (btnPrev) btnPrev.addEventListener('click', function (e) { e.preventDefault(); navigateScheme(-1); });
    if (btnNext) btnNext.addEventListener('click', function (e) { e.preventDefault(); navigateScheme(1); });
  }

  // =========================================================================
  // Wire section toggles inside the submodule content
  // =========================================================================
  function wireSectionToggles() {
    var container = document.querySelector('[data-submodule-content="CenterMemberScheme"]');
    if (!container) return;

    container.querySelectorAll('[data-section-toggle]').forEach(function (header) {
      header.addEventListener('click', function () {
        var section = header.closest('.form-section');
        if (!section) return;
        var content = section.querySelector('[data-section-content]');
        var toggleBtn = header.querySelector('.section-toggle-btn');
        var icon = toggleBtn?.querySelector('i');
        if (!content) return;

        var isOpen = content.style.display !== 'none';
        content.style.display = isOpen ? 'none' : '';
        if (icon) icon.className = isOpen ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(!isOpen));
      });
    });
  }

  // =========================================================================
  // Wire scheme lookup button
  // =========================================================================
  function wireSchemeLookup() {
    if (schemeLookupBtn) {
      schemeLookupBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openSchemeLookup();
      });
    }
  }

  // =========================================================================
  // Init — called by parent after HTML is injected
  // =========================================================================
  function init() {
    // Resolve DOM references (the partial view is now in the document)
    schemeIdInput = document.getElementById('SchemeId');
    schemeNameInput = document.getElementById('SchemeName');
    primaryCollateralInput = document.getElementById('PrimaryCollateral');
    collateralRatioInput = document.getElementById('CollateralRatio');
    savingsAmountInput = document.getElementById('SavingsAmount');
    secondaryCollateralInput = document.getElementById('SecondaryCollateral');
    additionalCollateralInput = document.getElementById('AdditionalCollateral');
    joinDateInput = document.getElementById('JoinDate');
    loanLevelNoInput = document.getElementById('LoanLevelNo');
    statusSelect = document.getElementById('Status');

    // Behind the scene (audit spans — prefixed with Scheme to avoid ID conflicts)
    auditFields = {
      loanAccountId: document.getElementById('LoanAccountId'),
      loanProductId: document.getElementById('LoanProductId'),
      savingAccountId: document.getElementById('SavingAccountId'),
      savingProductId: document.getElementById('SavingProductId'),
      cycleNo: document.getElementById('CycleNo'),
      createdBy: document.getElementById('SchemeCreatedBy'),
      createdOn: document.getElementById('SchemeCreatedOn'),
      modifiedBy: document.getElementById('SchemeModifiedBy'),
      modifiedOn: document.getElementById('SchemeModifiedOn'),
      supervisedBy: document.getElementById('SchemeSupervisedBy'),
      supervisedOn: document.getElementById('SchemeSupervisedOn')
    };

    schemeLookupBtn = document.querySelector('[data-cms-lookup="scheme"]');

    // Wire up events
    wireActionButtons();
    wireSectionToggles();
    wireSchemeLookup();

    // Load data
    loadSchemeData();
  }

  // Expose module
  window.CenterMemberSchemeModule = { init: init };
})();
