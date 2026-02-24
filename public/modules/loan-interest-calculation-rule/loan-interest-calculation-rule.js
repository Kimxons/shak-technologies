// Loan Interest Calculation Rule (standardized UI)

// ========== MODAL CLOSE FUNCTION ==========
function closeParentModal() {
  try {
    const parentDoc = window.parent?.document;
    if (!parentDoc) return false;

    const closeBtn = parentDoc.querySelector('#loanInterestCalculationRuleModal .window-control--close');
    if (closeBtn) {
      closeBtn.click();
      return true;
    }

    const modal = parentDoc.getElementById('loanInterestCalculationRuleModal');
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

    if (action === 'searchLoanRule') {
      searchLoanRule();
      return;
    }

    if (action === 'view') return viewLoanRule();
    if (action === 'add') return addLoanRule();
    if (action === 'edit') return editLoanRule();
    if (action === 'delete') return deleteLoanRule();
    if (action === 'save') return saveLoanRule();
    if (action === 'cancel') return cancelLoanRule();
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
function searchLoanRule() {
  console.log('Search Loan Rule triggered');
  showMessage('Search not yet implemented', 'info');
}

// ========== FORM ACTIONS ==========
function viewLoanRule() {
  const ruleId = (document.getElementById('loanRuleId')?.value || '').trim();

  if (!ruleId) {
    showMessage('Please enter or select a Rule ID', 'warning');
    return;
  }

  setFormMode('view');
  setEditing(false);

  console.log('Viewing Loan Interest Rule:', ruleId);
  showMessage('Viewing Loan Interest Rule: ' + ruleId, 'info');
}

function addLoanRule() {
  const form = document.getElementById('loanInterestCalcForm');
  if (form) form.reset();
  clearAuditValues();
  setFormMode('edit');
  setEditing(true);

  const ruleId = document.getElementById('loanRuleId');
  if (ruleId) ruleId.focus();

  console.log('Adding new Loan Interest Rule');
  showMessage('Ready to add new Loan Interest Rule', 'info');
}

function editLoanRule() {
  const ruleId = (document.getElementById('loanRuleId')?.value || '').trim();
  if (!ruleId) {
    showMessage('Please enter or select a Rule ID to edit', 'warning');
    return;
  }

  setFormMode('edit');
  setEditing(true);
  console.log('Editing Loan Interest Rule:', ruleId);
  showMessage('Editing Loan Interest Rule: ' + ruleId, 'info');
}

function deleteLoanRule() {
  const ruleId = (document.getElementById('loanRuleId')?.value || '').trim();
  if (!ruleId) {
    showMessage('Please select a Loan Interest Rule to delete', 'warning');
    return;
  }

  if (confirm('Are you sure you want to delete this Loan Interest Rule?')) {
    console.log('Deleting Loan Interest Rule:', ruleId);
    const form = document.getElementById('loanInterestCalcForm');
    if (form) form.reset();
    clearAuditValues();
    setFormMode('view');
    setEditing(false);
    showMessage('Loan Interest Rule deleted successfully', 'success');
  }
}

function saveLoanRule() {
  const ruleIdEl = document.getElementById('loanRuleId');
  const ruleId = (ruleIdEl?.value || '').trim();
  if (!ruleId) {
    showMessage('Rule ID is required', 'error');
    if (ruleIdEl) ruleIdEl.focus();
    return;
  }

  const formData = {
    loanRuleId: ruleId,
    ruleName: document.getElementById('ruleName')?.value,
    loanType: document.getElementById('loanType')?.value,
    repaymentMethod: document.getElementById('repaymentMethod')?.value,
    calculationBasis: document.getElementById('calculationBasis')?.value,
    balanceType: document.getElementById('balanceType')?.value,
    repaymentFrequency: document.getElementById('repaymentFrequency')?.value,
    dayCountBasis: document.getElementById('dayCountBasis')?.value,
    gracePeriod: document.getElementById('gracePeriod')?.value,
    penaltyRate: document.getElementById('penaltyRate')?.value,
    effectiveDate: document.getElementById('effectiveDate')?.value,
    expiryDate: document.getElementById('expiryDate')?.value,
    amortizeR78: !!document.getElementById('amortizeR78')?.checked,
    allowPrepayment: !!document.getElementById('allowPrepayment')?.checked,
    applyPenalty: !!document.getElementById('applyPenalty')?.checked,
    compoundInterest: !!document.getElementById('compoundInterest')?.checked
  };

  console.log('Saving Loan Interest Rule:', formData);
  showMessage('Loan Interest Rule saved successfully', 'success');
  setFormMode('view');
  setEditing(false);
  updateAuditFields();
}

function cancelLoanRule() {
  if (!confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) return;

  const ruleId = (document.getElementById('loanRuleId')?.value || '').trim();
  if (ruleId) {
    viewLoanRule();
  } else {
    const form = document.getElementById('loanInterestCalcForm');
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
  const form = document.getElementById('loanInterestCalcForm');
  if (!form) return;

  const controls = form.querySelectorAll('input, select, textarea');
  controls.forEach((el) => {
    if (el.hasAttribute('readonly')) {
      el.disabled = true;
      return;
    }

    if (mode === 'view') {
      // Keep Rule ID enabled for searching in view mode
      el.disabled = el.id !== 'loanRuleId';
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

  const form = document.getElementById('loanInterestCalcForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveLoanRule();
    });
  }

  console.log('Loan Interest Calculation Rule form initialized');
});

// Expose functions for any remaining legacy integrations
window.searchLoanRule = searchLoanRule;
window.viewLoanRule = viewLoanRule;
window.addLoanRule = addLoanRule;
window.editLoanRule = editLoanRule;
window.deleteLoanRule = deleteLoanRule;
window.saveLoanRule = saveLoanRule;
window.cancelLoanRule = cancelLoanRule;
window.goBack = goBack;
