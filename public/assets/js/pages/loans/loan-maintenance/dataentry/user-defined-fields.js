(function () {
  const root = document.querySelector('[data-ludf-root]');
  if (!root) return;

  const statusEl = root.querySelector('[data-ludf-status]');
  const editBtn = root.querySelector('[data-action="edit"]');
  const saveBtn = root.querySelector('[data-action="save"]');
  const cancelBtn = root.querySelector('[data-action="cancel"]');
  const backBtn = root.querySelector('[data-action="back"]');

  let mode = 'view'; // view | edit

  function setStatus(message, kind) {
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.classList.toggle('is-error', kind === 'error');
  }

  function requestClose() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ action: 'close-child-form' }, '*');
    }
  }

  function setMode(next) {
    mode = next;

    if (mode === 'view') {
      if (editBtn) editBtn.disabled = false;
      if (saveBtn) saveBtn.disabled = true;
      if (cancelBtn) cancelBtn.disabled = false;
      setStatus('User Fields Not Defined [No:216006]', 'error');
      return;
    }

    if (mode === 'edit') {
      // This screen is a placeholder unless user fields are configured.
      if (editBtn) editBtn.disabled = true;
      if (saveBtn) saveBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      setStatus('User Fields Not Defined [No:216006]', 'error');
    }
  }

  editBtn?.addEventListener('click', () => setMode('edit'));

  saveBtn?.addEventListener('click', () => {
    alert('User Defined Fields are not configured for this account.');
    setMode('view');
  });

  cancelBtn?.addEventListener('click', () => {
    if (mode === 'edit') {
      setMode('view');
      return;
    }
    requestClose();
  });

  backBtn?.addEventListener('click', requestClose);

  setMode('view');
})();
