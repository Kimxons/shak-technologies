// Exemption Settings (standardized UI)

let isEditMode = false;
let currentRecord = null;

function safeGet(id) {
  return document.getElementById(id);
}

function getMessageBar() {
  return document.querySelector('.am-message-panel') || document.getElementById('statusMessage');
}

function showStatusMessage(message, type = 'info', timeoutMs = 4000) {
  const bar = getMessageBar();
  if (!bar) return;

  bar.className = `am-message-panel show ${type}`;
  const span = bar.querySelector('span');
  if (span) span.textContent = message;

  window.clearTimeout(showStatusMessage._t);
  showStatusMessage._t = window.setTimeout(() => {
    bar.classList.remove('show');
  }, timeoutMs);
}

function closeThisWindowOrModal() {
  const modalId = document.body?.dataset?.closeModal;
  if (modalId && window.parent && window.parent !== window) {
    try {
      const parentDoc = window.parent.document;
      const el = parentDoc.getElementById(modalId);
      const inst = window.parent.bootstrap?.Modal?.getInstance(el) || (el ? new window.parent.bootstrap.Modal(el) : null);
      if (inst) {
        inst.hide();
        return;
      }
    } catch (e) {
      // fall through
    }
  }

  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.close();
  }
}

function initSectionToggles() {
  document.querySelectorAll('[data-section-toggle]').forEach((header) => {
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

function updateFieldStates() {
  const exempted = !!safeGet('exempted')?.checked;
  const freeTransaction = !!safeGet('freeTransaction')?.checked;

  const balanceType = safeGet('balanceType');
  const balancePeriod = safeGet('balancePeriod');
  const fixedAmount = safeGet('fixedAmount');
  if (balanceType) balanceType.disabled = !exempted;
  if (balancePeriod) balancePeriod.disabled = !exempted;
  if (fixedAmount) fixedAmount.disabled = !exempted;

  const transactionType = safeGet('transactionType');
  const transactionPeriod = safeGet('transactionPeriod');
  const transactionValue = safeGet('transactionValue');
  if (transactionType) transactionType.disabled = !freeTransaction;
  if (transactionPeriod) transactionPeriod.disabled = !freeTransaction;
  if (transactionValue) transactionValue.disabled = !freeTransaction;
}

function setFormEnabled(enabled) {
  const form = safeGet('exemptionForm');
  if (!form) return;
  form.querySelectorAll('input, select, textarea').forEach((el) => {
    if (el.id.startsWith('created') || el.id.startsWith('modified') || el.id.startsWith('supervised')) return;
    el.disabled = !enabled;
  });
  updateFieldStates();
}

function initializeForm() {
  // no-op defaults: keep HTML defaults
  updateFieldStates();
}

function clearForm() {
  const form = safeGet('exemptionForm');
  if (!form) return;
  form.reset();
  currentRecord = null;
  initializeForm();
}

function validateForm() {
  const effectiveDate = safeGet('effectiveDate')?.value;
  if (!effectiveDate) {
    showStatusMessage('Effective Date is required', 'error');
    safeGet('effectiveDate')?.focus();
    return false;
  }

  const exempted = !!safeGet('exempted')?.checked;
  const freeTransaction = !!safeGet('freeTransaction')?.checked;

  if (!exempted && !freeTransaction) {
    showStatusMessage('Select Exempted and/or Free Transaction', 'warning');
    return false;
  }

  return true;
}

function handleView() {
  setFormEnabled(false);
  isEditMode = false;
  showStatusMessage('Viewing (read-only)', 'info');
}

function handleAdd() {
  isEditMode = true;
  currentRecord = null;
  clearForm();
  setFormEnabled(true);
  safeGet('effectiveDate')?.focus();
  showStatusMessage('Add mode enabled', 'info');
}

function handleEdit() {
  isEditMode = true;
  setFormEnabled(true);
  showStatusMessage('Edit mode enabled', 'info');
}

function handleDelete() {
  if (!currentRecord) {
    showStatusMessage('Select a record to delete', 'warning');
    return;
  }
  if (confirm('Delete this exemption setting?')) {
    clearForm();
    setFormEnabled(false);
    showStatusMessage('Deleted', 'success');
  }
}

function handleSave() {
  if (!validateForm()) return;
  // Backend integration pending
  showStatusMessage('Saved (stub)', 'success');
  setFormEnabled(false);
  isEditMode = false;
}

function handleCancel() {
  if (!isEditMode) {
    clearForm();
    showStatusMessage('Cleared', 'info');
    return;
  }
  if (confirm('Discard changes?')) {
    isEditMode = false;
    clearForm();
    setFormEnabled(false);
    showStatusMessage('Cancelled', 'info');
  }
}

function initActionRouting() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');

    switch (action) {
      case 'refresh':
        window.location.reload();
        break;
      case 'close':
        closeThisWindowOrModal();
        break;
      case 'view':
        handleView();
        break;
      case 'add':
        handleAdd();
        break;
      case 'edit':
        handleEdit();
        break;
      case 'delete':
        handleDelete();
        break;
      case 'save':
        handleSave();
        break;
      case 'cancel':
        handleCancel();
        break;
      default:
        break;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initSectionToggles();
  initActionRouting();
  initializeForm();
  setFormEnabled(false);

  safeGet('exemptionForm')?.addEventListener('submit', (e) => e.preventDefault());
  safeGet('exempted')?.addEventListener('change', updateFieldStates);
  safeGet('freeTransaction')?.addEventListener('change', updateFieldStates);
});
