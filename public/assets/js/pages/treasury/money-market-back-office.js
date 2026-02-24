(function () {
  // Page-specific wiring for Money Market - Back Office
  const formEl = document.getElementById('mm-back-office-form');
  if (!formEl) return;

  const $ = (selector, root = formEl) => root.querySelector(selector);
  const $$ = (selector, root = formEl) => Array.from(root.querySelectorAll(selector));

  const actionPanel = document.querySelector('.action-panel');
  const actionButtons = actionPanel
    ? Array.from(actionPanel.querySelectorAll('.btn-action[data-mm-action]'))
    : [];

  const getActionButton = (action) => {
    const key = String(action || '').toLowerCase();
    return (
      actionButtons.find(
        (b) => (b.dataset.mmAction || '').trim().toLowerCase() === key
      ) || null
    );
  };

  const btnSupervise = getActionButton('supervise');
  const btnView = getActionButton('view');
  const btnEdit = getActionButton('edit');
  const btnSave = getActionButton('save');
  const btnCancel = getActionButton('cancel');

  const btnPrev = actionPanel
    ? actionPanel.querySelector('button[data-mmbo-nav="prev"]')
    : null;
  const btnNext = actionPanel
    ? actionPanel.querySelector('button[data-mmbo-nav="next"]')
    : null;

  const getField = (id) => document.getElementById(id);
  const setFieldValue = (id, value) => {
    const el = getField(id);
    if (!el) return;
    el.value = value ?? '';
  };

  const setDisabled = (el, disabled) => {
    if (!el) return;
    el.disabled = Boolean(disabled);
  };

  const readForm = () => {
    const data = {};
    const fd = new FormData(formEl);
    for (const [k, v] of fd.entries()) data[k] = v;
    return data;
  };

  const restoreForm = (snapshot) => {
    if (!snapshot) return;
    for (const [name, value] of Object.entries(snapshot)) {
      const field = formEl.elements?.namedItem?.(name);
      if (!field) continue;
      if (field instanceof RadioNodeList) continue;
      try {
        field.value = value;
      } catch {
        // ignore
      }
    }
  };

  const nowLabel = () => new Date().toLocaleString();

  const getSessionUserLabel = () => {
    try {
      const session = window.AuthService?.getSession?.();
      return (
        session?.operatorID ||
        session?.operatorId ||
        session?.operatorName ||
        session?.username ||
        session?.userName ||
        ''
      );
    } catch {
      return '';
    }
  };

  const closeContainingModal = () => {
    try {
      const parentWin = window.parent;
      if (!parentWin || parentWin === window) return false;
      if (typeof parentWin.closeModalWindow !== 'function') return false;

      const parentDoc = parentWin.document;
      if (!parentDoc) return false;

      const iframes = Array.from(parentDoc.querySelectorAll('iframe'));
      const hostIframe = iframes.find((f) => f.contentWindow === window);
      if (!hostIframe) return false;

      const modalEl = hostIframe.closest('.legacy-modal');
      if (!modalEl) return false;

      parentWin.closeModalWindow(modalEl);
      return true;
    } catch {
      return false;
    }
  };

  let mode = 'view'; // view | edit
  let formSnapshot = null;

  const hasLoadedRecord = () => {
    const dealNo = (getField('DealNo')?.value || '').trim();
    return dealNo.length > 0;
  };

  const setMode = (nextMode) => {
    mode = nextMode;
    formEl.dataset.mode = mode;
    updateButtons();
  };

  const updateButtons = () => {
    const editing = mode === 'edit';
    const loaded = hasLoadedRecord();

    setDisabled(btnView, false);
    setDisabled(btnEdit, editing || !loaded);
    setDisabled(btnSupervise, editing || !loaded);

    setDisabled(btnSave, !editing);
    setDisabled(btnCancel, !editing);

    setDisabled(btnPrev, editing || !loaded);
    setDisabled(btnNext, editing || !loaded);
  };

  // --- Button wiring ---
  btnView?.addEventListener('click', () => {
    setMode('view');
  });

  btnEdit?.addEventListener('click', () => {
    if (!hasLoadedRecord()) {
      window.alert('Enter or load a DealNo to edit.');
      return;
    }
    formSnapshot = readForm();
    setFieldValue('Status', 'Editing');
    setMode('edit');
  });

  btnSave?.addEventListener('click', () => {
    if (mode !== 'edit') return;
    // No validations for now.
    setFieldValue('Status', 'Saved');
    setMode('view');
  });

  btnCancel?.addEventListener('click', () => {
    if (mode === 'edit') {
      restoreForm(formSnapshot);
      setFieldValue('Status', 'Cancelled');
      setMode('view');
      return;
    }

    // Currently disabled in view mode, but keep this for safety if enabled later.
    if (closeContainingModal()) return;
  });

  btnSupervise?.addEventListener('click', () => {
    if (!hasLoadedRecord()) {
      window.alert('Enter or load a DealNo to supervise.');
      return;
    }
    const user = getSessionUserLabel();
    if (user) setFieldValue('SupervisedBy', user);
    setFieldValue('SupervisedOn', nowLabel());
    setFieldValue('Status', 'Supervised');
    setMode('view');
  });

  const handleNav = (dir) => {
    if (mode === 'edit') return;
    if (!hasLoadedRecord()) {
      window.alert('Enter or load a DealNo first.');
      return;
    }
    // Placeholder: actual navigation requires backend/data source.
    console.log(`[MoneyMarket BackOffice] Navigate ${dir}`);
  };

  btnPrev?.addEventListener('click', () => handleNav('previous'));
  btnNext?.addEventListener('click', () => handleNav('next'));

  getField('DealNo')?.addEventListener('input', () => {
    if (mode !== 'edit') updateButtons();
  });

  updateButtons();
})();
