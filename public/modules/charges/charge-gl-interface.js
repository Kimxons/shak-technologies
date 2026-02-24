// Charge GL Interface (standardized UI)

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
      case 'searchGlAccount':
      case 'searchTransaction':
        showStatusMessage('Search requires backend integration', 'info');
        break;
      default:
        break;
    }
  });
}

function updateReversalFields() {
  const checked = !!safeGet('changeCashGlWhenReversed')?.checked;
  const reversalGl = safeGet('reversalGlAccount');
  const reversalNarration = safeGet('reversalNarration');
  if (reversalGl) reversalGl.disabled = !checked;
  if (reversalNarration) reversalNarration.disabled = !checked;
}

function setFormEnabled(enabled) {
  const form = safeGet('glInterfaceForm');
  if (!form) return;
  form.querySelectorAll('input, select, textarea').forEach((el) => {
    if (el.id.startsWith('created') || el.id.startsWith('modified') || el.id.startsWith('supervised')) return;
    el.disabled = !enabled;
  });
  updateReversalFields();
}

function initializeForm() {
  const today = new Date().toISOString().split('T')[0];
  const effectiveDate = safeGet('effectiveDate');
  if (effectiveDate && !effectiveDate.value) effectiveDate.value = today;

  const accountType = safeGet('accountType');
  if (accountType && !accountType.value) accountType.value = 'customer';
  updateReversalFields();
}

function clearForm() {
  const form = safeGet('glInterfaceForm');
  if (!form) return;
  form.reset();
  currentRecord = null;
  initializeForm();
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
  if (confirm('Delete this GL interface record?')) {
    clearForm();
    setFormEnabled(false);
    showStatusMessage('Deleted', 'success');
  }
}

function handleSave() {
  if (!isEditMode) {
    showStatusMessage('Nothing to save', 'info');
    return;
  }
  // Backend integration pending
  showStatusMessage('Saved (stub)', 'success');
  setFormEnabled(false);
  isEditMode = false;
}

function handleCancel() {
  if (isEditMode && confirm('Discard changes?')) {
    isEditMode = false;
    clearForm();
    setFormEnabled(false);
    showStatusMessage('Cancelled', 'info');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initSectionToggles();
  initActionRouting();
  initializeForm();
  setFormEnabled(false);

  safeGet('glInterfaceForm')?.addEventListener('submit', (e) => e.preventDefault());
  safeGet('changeCashGlWhenReversed')?.addEventListener('change', updateReversalFields);
});
