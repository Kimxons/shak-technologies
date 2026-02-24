// Loan Penalty Calculation Rule (standardized UI)

let penaltyRuleSearchModal = null;

// ========== MODAL CLOSE FUNCTION ==========
function closeParentModal() {
  try {
    const parentDoc = window.parent?.document;
    if (!parentDoc) return false;

    const closeBtn = parentDoc.querySelector('#loanPenaltyCalculationRuleModal .window-control--close');
    if (closeBtn) {
      closeBtn.click();
      return true;
    }

    const modal = parentDoc.getElementById('loanPenaltyCalculationRuleModal');
    if (modal && window.parent?.bootstrap?.Modal) {
      const bsModal = window.parent.bootstrap.Modal.getInstance(modal) || new window.parent.bootstrap.Modal(modal);
      bsModal.hide();
      return true;
    }
  } catch (e) {
    console.error('Error closing modal:', e);
  }

  return false;
}

function getMessageBar() {
  return document.querySelector('.am-message-panel');
}

function showMessage(text, type, timeoutMs) {
  const t = type || 'info';
  const ms = typeof timeoutMs === 'number' ? timeoutMs : 3000;
  const bar = getMessageBar();
  if (!bar) return;

  bar.className = `am-message-panel show ${t}`;
  const span = bar.querySelector('span');
  if (span) span.textContent = text;

  window.clearTimeout(showMessage._t);
  showMessage._t = window.setTimeout(() => {
    bar.classList.remove('show');
  }, ms);
}

function closeThisWindowOrModal() {
  if (window.self !== window.top) {
    if (closeParentModal()) return;
    window.location.href = '../../dashboard.html';
    return;
  }

  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.close();
  }
}

// ========== SECTION TOGGLES ==========
function initSectionToggles() {
  const toggles = document.querySelectorAll('[data-section-toggle]');
  toggles.forEach((header) => {
    const section = header.closest('.form-section');
    const content = section ? section.querySelector('[data-section-content]') : null;
    const btn = section ? section.querySelector('.section-toggle-btn') : null;
    const icon = btn ? btn.querySelector('i') : null;
    if (!content || !btn) return;

    const setExpanded = (expanded) => {
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      content.hidden = !expanded;
      if (icon) {
        icon.classList.toggle('bi-chevron-up', expanded);
        icon.classList.toggle('bi-chevron-down', !expanded);
      }
    };

    if (!btn.hasAttribute('aria-expanded')) setExpanded(true);

    const toggle = () => {
      const expanded = btn.getAttribute('aria-expanded') !== 'false';
      setExpanded(!expanded);
    };

    header.addEventListener('click', toggle);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });
  });
}

// ========== ACTION ROUTING ==========
function initActionRouting() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');

    if (action === 'refresh') {
      window.location.reload();
      return;
    }

    if (action === 'maximize') {
      const win = document.querySelector('.window');
      if (win) win.classList.toggle('maximized');
      return;
    }

    if (action === 'minimize') {
      return;
    }

    if (action === 'close') {
      closeThisWindowOrModal();
      return;
    }

    if (action === 'searchPenaltyRule') return searchPenaltyRule();
    if (action === 'view') return viewPenaltyRule();
    if (action === 'add') return addPenaltyRule();
    if (action === 'edit') return editPenaltyRule();
    if (action === 'delete') return deletePenaltyRule();
    if (action === 'save') return savePenaltyRule();
    if (action === 'cancel') return cancelPenaltyRule();
    if (action === 'back') return goBack();
  });
}

function setEditing(on) {
  const btnView = document.querySelector('.action-panel [data-action="view"]');
  const btnAdd = document.querySelector('.action-panel [data-action="add"]');
  const btnEdit = document.querySelector('.action-panel [data-action="edit"]');
  const btnDelete = document.querySelector('.action-panel [data-action="delete"]');
  const btnSave = document.querySelector('.action-panel [data-action="save"]');
  const btnCancel = document.querySelector('.action-panel [data-action="cancel"]');

  if (btnView) btnView.disabled = false;
  if (btnAdd) btnAdd.disabled = false;
  if (btnEdit) btnEdit.disabled = on;
  if (btnDelete) btnDelete.disabled = on;
  if (btnSave) btnSave.disabled = !on;
  if (btnCancel) btnCancel.disabled = !on;
}

// ========== SEARCH ==========
function getEnv() {
  const env = window.Environment || window.parent?.Environment || {};
  const moduleID = env.moduleID || env.moduleId || 1000;
  const operatorID = env.operatorID || env.operatorId || env.OperatorID || env.OperatorId || '';
  const ourBranchID = env.branchID || env.branchId || env.ourBranchID || env.ourBranchId || env.OurBranchID || '';
  return { moduleID, operatorID, ourBranchID };
}

function getOperatorId() {
  const env = getEnv();
  return (
    window.getAuthSession?.()?.OperatorId
    || window.parent?.getAuthSession?.()?.OperatorId
    || env.operatorID
    || 'web_portal'
  );
}

function getOurBranchId() {
  const env = getEnv();
  return (
    window.getAuthSession?.()?.OurBranchID
    || window.parent?.getAuthSession?.()?.OurBranchID
    || env.ourBranchID
    || ''
  );
}

async function openPenaltyRuleSearchModal() {
  const hasLocal = typeof window.SearchModal === 'function' && !!window.SearchService;
  const hasParent = typeof window.parent?.SearchModal === 'function' && !!window.parent?.SearchService;
  const SearchModalClass = hasLocal ? window.SearchModal : (hasParent ? window.parent.SearchModal : null);

  if (!SearchModalClass) {
    showMessage('Search components are not available on this page', 'error');
    return;
  }

  // Prefer using the SearchModal instance from the same window context.
  // If we only have the parent SearchModal, it will render in the parent document.
  if (!penaltyRuleSearchModal) {
    const env = getEnv();
    penaltyRuleSearchModal = new SearchModalClass({
      prefix: 'loan-penalty-rule',
      moduleID: env.moduleID,
      getOperatorId,
      getOurBranchId,
      onError: (err) => {
        console.error('[LoanPenaltyRule] Search error:', err);
        showMessage('Failed to open search', 'error');
      }
    });
  }

  const onSelect = (row) => {
    const keys = Object.keys(row || {});
    const idKey = keys.find(k => k.toLowerCase() === 'penaltyruleid')
      || keys.find(k => k.toLowerCase() === 'ruleid')
      || keys.find(k => k.toLowerCase() === 'id');
    const nameKey = keys.find(k => k.toLowerCase() === 'rulename')
      || keys.find(k => k.toLowerCase() === 'name')
      || keys.find(k => k.toLowerCase() === 'description');

    if (idKey) document.getElementById('penaltyRuleId').value = String(row[idKey] ?? '').trim();
    if (nameKey && document.getElementById('ruleName')) document.getElementById('ruleName').value = String(row[nameKey] ?? '').trim();
  };

  // NOTE: TableID/columns depend on Core search configuration.
  // If your backend uses a different TableID, update it here.
  await penaltyRuleSearchModal.open({
    title: 'Search Penalty Rules',
    tableID: 'PenaltyRuleID',
    whereStmt: '',
    advFilterString: '',
    searchFields: [
      { label: 'Penalty Rule ID', name: 'PenaltyRuleID', column: 'PenaltyRuleID' },
      { label: 'Rule Name', name: 'RuleName', column: 'RuleName' }
    ],
    displayFields: [
      { key: 'PenaltyRuleID', label: 'Penalty Rule ID' },
      { key: 'RuleName', label: 'Rule Name' }
    ],
    onSelect
  });
}

function searchPenaltyRule() {
  console.log('Search Penalty Rule triggered');
  openPenaltyRuleSearchModal();
}

// ========== FORM ACTIONS ==========
function viewPenaltyRule() {
  const ruleId = (document.getElementById('penaltyRuleId')?.value || '').trim();
  if (!ruleId) {
    showMessage('Please enter or select a Penalty Rule ID', 'warning');
    return;
  }

  setFormMode('view');
  setEditing(false);
  console.log('Viewing Loan Penalty Rule:', ruleId);
  showMessage('Viewing Loan Penalty Rule: ' + ruleId, 'info');
}

function addPenaltyRule() {
  const form = document.getElementById('loanPenaltyCalcForm');
  if (form) form.reset();
  clearAuditValues();
  setFormMode('edit');
  setEditing(true);
  document.getElementById('penaltyRuleId')?.focus();
  console.log('Adding new Loan Penalty Rule');
  showMessage('Ready to add new Loan Penalty Rule', 'info');
}

function editPenaltyRule() {
  const ruleId = (document.getElementById('penaltyRuleId')?.value || '').trim();
  if (!ruleId) {
    showMessage('Please enter or select a Penalty Rule ID to edit', 'warning');
    return;
  }

  setFormMode('edit');
  setEditing(true);
  console.log('Editing Loan Penalty Rule:', ruleId);
  showMessage('Editing Loan Penalty Rule: ' + ruleId, 'info');
}

function deletePenaltyRule() {
  const ruleId = (document.getElementById('penaltyRuleId')?.value || '').trim();
  if (!ruleId) {
    showMessage('Please select a Loan Penalty Rule to delete', 'warning');
    return;
  }

  if (confirm('Are you sure you want to delete this Loan Penalty Rule?')) {
    console.log('Deleting Loan Penalty Rule:', ruleId);
    const form = document.getElementById('loanPenaltyCalcForm');
    if (form) form.reset();
    clearAuditValues();
    setFormMode('view');
    setEditing(false);
    showMessage('Loan Penalty Rule deleted successfully', 'success');
  }
}

function savePenaltyRule() {
  const ruleIdEl = document.getElementById('penaltyRuleId');
  const ruleId = (ruleIdEl?.value || '').trim();
  if (!ruleId) {
    showMessage('Penalty Rule ID is required', 'error');
    ruleIdEl?.focus();
    return;
  }

  const formData = {
    penaltyRuleId: ruleId,
    ruleName: document.getElementById('ruleName')?.value,
    penaltyType: document.getElementById('penaltyType')?.value,
    penaltyMethod: document.getElementById('penaltyMethod')?.value,
    penaltyBasis: document.getElementById('penaltyBasis')?.value,
    balanceType: document.getElementById('balanceType')?.value,
    triggerCondition: document.getElementById('triggerCondition')?.value,
    dayCountBasis: document.getElementById('dayCountBasis')?.value,
    daysThreshold: document.getElementById('daysThreshold')?.value,
    penaltyRateAmount: document.getElementById('penaltyRateAmount')?.value,
    effectiveDate: document.getElementById('effectiveDate')?.value,
    expiryDate: document.getElementById('expiryDate')?.value,
    waivePenalty: !!document.getElementById('waivePenalty')?.checked,
    cappedPenalty: !!document.getElementById('cappedPenalty')?.checked,
    compoundPenalty: !!document.getElementById('compoundPenalty')?.checked,
    autoApply: !!document.getElementById('autoApply')?.checked
  };

  console.log('Saving Loan Penalty Rule:', formData);
  showMessage('Loan Penalty Rule saved successfully', 'success');
  setFormMode('view');
  setEditing(false);
  updateAuditFields();
}

function cancelPenaltyRule() {
  if (!confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) return;

  const ruleId = (document.getElementById('penaltyRuleId')?.value || '').trim();
  if (ruleId) {
    viewPenaltyRule();
  } else {
    const form = document.getElementById('loanPenaltyCalcForm');
    if (form) form.reset();
    clearAuditValues();
    setFormMode('view');
    setEditing(false);
  }

  setEditing(false);
  showMessage('Changes cancelled', 'info');
}

function goBack() {
  if (confirm('Are you sure you want to go back? Any unsaved changes will be lost.')) {
    closeThisWindowOrModal();
  }
}

// ========== UTILITY FUNCTIONS ==========
function setFormMode(mode) {
  const form = document.getElementById('loanPenaltyCalcForm');
  if (!form) return;

  const controls = form.querySelectorAll('input, select, textarea');
  controls.forEach((el) => {
    if (el.hasAttribute('readonly')) {
      el.disabled = true;
      return;
    }

    if (mode === 'view') {
      // Keep Rule ID enabled for searching in view mode
      el.disabled = el.id !== 'penaltyRuleId';
    } else {
      el.disabled = false;
    }
  });
}

function setAuditValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = (value === null || value === undefined || value === '') ? '-' : String(value);
}

function clearAuditValues() {
  setAuditValue('createdBy', '-');
  setAuditValue('createdOn', '-');
  setAuditValue('createdTime', '-');
  setAuditValue('modifiedBy', '-');
  setAuditValue('modifiedOn', '-');
  setAuditValue('modifiedTime', '-');
}

function updateAuditFields() {
  const currentUser = 'SYSTEM';
  const currentDate = new Date().toLocaleDateString();
  const currentTime = new Date().toLocaleTimeString();

  const createdByEl = document.getElementById('createdBy');
  const createdByVal = createdByEl ? String(createdByEl.textContent || '').trim() : '';

  if (!createdByVal || createdByVal === '-') {
    setAuditValue('createdBy', currentUser);
    setAuditValue('createdOn', currentDate);
    setAuditValue('createdTime', currentTime);
  }

  setAuditValue('modifiedBy', currentUser);
  setAuditValue('modifiedOn', currentDate);
  setAuditValue('modifiedTime', currentTime);
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
  initActionRouting();
  initSectionToggles();

  clearAuditValues();
  setFormMode('view');
  setEditing(false);

  const form = document.getElementById('loanPenaltyCalcForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      savePenaltyRule();
    });
  }

  console.log('Loan Penalty Calculation Rule form initialized');
});

// Expose functions for any remaining legacy integrations
window.searchPenaltyRule = searchPenaltyRule;
window.viewPenaltyRule = viewPenaltyRule;
window.addPenaltyRule = addPenaltyRule;
window.editPenaltyRule = editPenaltyRule;
window.deletePenaltyRule = deletePenaltyRule;
window.savePenaltyRule = savePenaltyRule;
window.cancelPenaltyRule = cancelPenaltyRule;
window.goBack = goBack;
