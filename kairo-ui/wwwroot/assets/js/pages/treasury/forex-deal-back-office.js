(function () {
  // Page-specific wiring for Forex Deal - Back Office
  const formEl = document.getElementById('fx-back-office-form');
  if (!formEl) return;

  const $ = (selector, root = formEl) => root.querySelector(selector);
  const $$ = (selector, root = formEl) => Array.from(root.querySelectorAll(selector));

  const actionPanel = document.querySelector('.action-panel');
  const actionButtons = actionPanel
    ? Array.from(actionPanel.querySelectorAll('.btn-action[data-fx-action]'))
    : [];

  const getActionButton = (action) => {
    const key = String(action || '').toLowerCase();
    return (
      actionButtons.find(
        (b) => (b.dataset.fxAction || '').trim().toLowerCase() === key
      ) || null
    );
  };

  const btnSupervise = getActionButton('supervise');
  const btnView = getActionButton('view');
  const btnAdd = getActionButton('add');
  const btnEdit = getActionButton('edit');
  const btnDelete = getActionButton('delete');
  const btnSave = getActionButton('save');
  const btnCancel = getActionButton('cancel');

  const dealsTable = $('section[data-section="unsupervised-deals"] table');
  const dealsTbody = dealsTable ? dealsTable.querySelector('tbody') : null;

  let selectedRow = null;
  let mode = 'browse'; // browse | add | edit
  let formSnapshot = null;

  const setDisabled = (el, disabled) => {
    if (!el) return;
    el.disabled = Boolean(disabled);
  };

  const getField = (id) => document.getElementById(id);
  const setFieldValue = (id, value) => {
    const el = getField(id);
    if (!el) return;
    el.value = value ?? '';
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

  const hasRealRows = () => {
    if (!dealsTbody) return false;
    const rows = Array.from(dealsTbody.querySelectorAll('tr'));
    if (rows.length === 0) return false;
    if (rows.length === 1) {
      const cells = rows[0].querySelectorAll('td');
      if (cells.length === 1 && Number(cells[0].getAttribute('colspan') || 0) > 1) return false;
    }
    return rows.some((r) => {
      const cells = r.querySelectorAll('td');
      return !(cells.length === 1 && Number(cells[0].getAttribute('colspan') || 0) > 1);
    });
  };

  const ensureEmptyMessageRow = () => {
    if (!dealsTbody) return;
    const rows = Array.from(dealsTbody.querySelectorAll('tr'));
    const realRows = rows.filter((r) => {
      const cells = r.querySelectorAll('td');
      return !(cells.length === 1 && Number(cells[0].getAttribute('colspan') || 0) > 1);
    });
    if (realRows.length > 0) return;
    dealsTbody.innerHTML = '<tr><td colspan="6" class="text-muted">No records to display.</td></tr>';
  };

  const clearSelection = () => {
    if (selectedRow) selectedRow.classList.remove('table-active');
    selectedRow = null;
  };

  const clearEditableFields = () => {
    const preserve = new Set([
      'BranchId',
      'BranchName',
      'CreditBranchId',
      'CreditBranchName',
      'DebitBranchId',
      'DebitBranchName'
    ]);

    for (const el of $$('input, select, textarea')) {
      const id = el.id || '';
      if (preserve.has(id)) continue;
      if (el.hasAttribute('readonly')) continue;

      if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = false;
        continue;
      }
      if (el.tagName === 'SELECT') {
        el.selectedIndex = 0;
        continue;
      }
      el.value = '';
    }

    // Clear system fields explicitly
    setFieldValue('Status', '');
    setFieldValue('CreatedBy', '');
    setFieldValue('CreatedOn', '');
    setFieldValue('ModifiedBy', '');
    setFieldValue('ModifiedOn', '');
    setFieldValue('SupervisedBy', '');
    setFieldValue('SupervisedOn', '');
  };

  const getRowData = (row) => {
    if (!row) return null;
    const cells = Array.from(row.querySelectorAll('td'));
    // expected: [checkbox, dealNo, creditBranchId, creditAccount, debitBranchId, debitAccount]
    if (cells.length < 6) return null;
    const text = (idx) => (cells[idx]?.textContent || '').trim();
    return {
      dealNo: text(1),
      creditBranchId: text(2),
      creditAccountId: text(3),
      debitBranchId: text(4),
      debitAccountId: text(5)
    };
  };

  const populateFormFromRow = (row) => {
    const d = getRowData(row);
    if (!d) return;
    setFieldValue('DealNo', d.dealNo);
    setFieldValue('CreditBranchId', d.creditBranchId);
    setFieldValue('CreditAccountId', d.creditAccountId);
    setFieldValue('DebitBranchId', d.debitBranchId);
    setFieldValue('DebitAccountId', d.debitAccountId);
  };

  const appendDealRow = (data) => {
    if (!dealsTbody) return null;

    // Remove placeholder empty message row
    const rows = Array.from(dealsTbody.querySelectorAll('tr'));
    if (rows.length === 1) {
      const cells = rows[0].querySelectorAll('td');
      if (cells.length === 1 && Number(cells[0].getAttribute('colspan') || 0) > 1) dealsTbody.innerHTML = '';
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="width:32px"><input class="form-check-input" type="checkbox" aria-label="Select deal" /></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    `;
    const cells = tr.querySelectorAll('td');
    cells[1].textContent = data.dealNo || '';
    cells[2].textContent = data.creditBranchId || '';
    cells[3].textContent = data.creditAccountId || '';
    cells[4].textContent = data.debitBranchId || '';
    cells[5].textContent = data.debitAccountId || '';

    dealsTbody.appendChild(tr);
    return tr;
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

  const setMode = (nextMode) => {
    mode = nextMode;
    formEl.dataset.mode = mode;
    updateButtons();
  };

  const updateButtons = () => {
    const editing = mode === 'add' || mode === 'edit';
    const selectionOk = Boolean(selectedRow);
    const anyRows = hasRealRows();

    setDisabled(btnSave, !editing);

    // Keep Cancel available so user can close/reset.
    setDisabled(btnCancel, false);

    setDisabled(btnAdd, editing);
    setDisabled(btnView, editing || !selectionOk || !anyRows);
    setDisabled(btnEdit, editing || !selectionOk || !anyRows);
    setDisabled(btnDelete, editing || !selectionOk || !anyRows);
    setDisabled(btnSupervise, editing || !selectionOk || !anyRows);
  };

  // --- Event wiring ---
  if (dealsTable && dealsTbody) {
    dealsTbody.addEventListener('click', (e) => {
      if (mode === 'add' || mode === 'edit') return;

      const target = e.target;
      if (target && (target.matches('input[type="checkbox"]') || target.closest('input[type="checkbox"]'))) {
        return;
      }

      const row = e.target?.closest?.('tr');
      if (!row) return;
      const cells = row.querySelectorAll('td');
      if (cells.length === 1 && Number(cells[0].getAttribute('colspan') || 0) > 1) return;

      if (selectedRow && selectedRow !== row) selectedRow.classList.remove('table-active');
      selectedRow = row;
      selectedRow.classList.add('table-active');
      updateButtons();
    });

    const selectAll = dealsTable.querySelector('thead input[type="checkbox"]');
    if (selectAll) {
      selectAll.addEventListener('change', () => {
        const checked = Boolean(selectAll.checked);
        for (const cb of dealsTbody.querySelectorAll('input[type="checkbox"]')) cb.checked = checked;
      });
    }
  }

  btnView?.addEventListener('click', () => {
    if (!selectedRow) {
      window.alert('Please select a deal from the Unsupervised Deals list.');
      return;
    }
    populateFormFromRow(selectedRow);
    setMode('browse');
  });

  btnAdd?.addEventListener('click', () => {
    formSnapshot = readForm();
    clearSelection();
    clearEditableFields();

    const user = getSessionUserLabel();
    if (user) setFieldValue('CreatedBy', user);
    setFieldValue('CreatedOn', nowLabel());
    setFieldValue('Status', 'New');
    setMode('add');
  });

  btnEdit?.addEventListener('click', () => {
    if (!selectedRow) {
      window.alert('Please select a deal to edit.');
      return;
    }
    formSnapshot = readForm();
    populateFormFromRow(selectedRow);

    const user = getSessionUserLabel();
    if (user) setFieldValue('ModifiedBy', user);
    setFieldValue('ModifiedOn', nowLabel());
    setFieldValue('Status', 'Editing');
    setMode('edit');
  });

  btnDelete?.addEventListener('click', () => {
    if (!selectedRow) {
      window.alert('Please select a deal to delete.');
      return;
    }
    const d = getRowData(selectedRow);
    const ok = window.confirm(`Delete deal ${d?.dealNo || ''}?`);
    if (!ok) return;

    selectedRow.remove();
    clearSelection();
    ensureEmptyMessageRow();
    setFieldValue('Status', 'Deleted');
    updateButtons();
  });

  btnSupervise?.addEventListener('click', () => {
    if (!selectedRow) {
      window.alert('Please select a deal to supervise.');
      return;
    }
    const user = getSessionUserLabel();
    if (user) setFieldValue('SupervisedBy', user);
    setFieldValue('SupervisedOn', nowLabel());
    setFieldValue('Status', 'Supervised');

    selectedRow.remove();
    clearSelection();
    ensureEmptyMessageRow();
    updateButtons();
  });

  btnSave?.addEventListener('click', () => {
    if (mode !== 'add' && mode !== 'edit') return;

    const dealNo = (getField('DealNo')?.value || '').trim() || `D${Date.now()}`;
    const data = {
      dealNo,
      creditBranchId: (getField('CreditBranchId')?.value || '').trim(),
      creditAccountId: (getField('CreditAccountId')?.value || '').trim(),
      debitBranchId: (getField('DebitBranchId')?.value || '').trim(),
      debitAccountId: (getField('DebitAccountId')?.value || '').trim()
    };

    if (mode === 'add') {
      const newRow = appendDealRow(data);
      if (newRow) {
        selectedRow = newRow;
        selectedRow.classList.add('table-active');
      }
      setFieldValue('Status', 'Saved');
    }

    if (mode === 'edit') {
      if (!selectedRow) {
        window.alert('No selected deal row to update.');
      } else {
        const cells = selectedRow.querySelectorAll('td');
        if (cells.length >= 6) {
          cells[1].textContent = data.dealNo;
          cells[2].textContent = data.creditBranchId;
          cells[3].textContent = data.creditAccountId;
          cells[4].textContent = data.debitBranchId;
          cells[5].textContent = data.debitAccountId;
        }
        setFieldValue('Status', 'Saved');
      }
    }

    setMode('browse');
  });

  btnCancel?.addEventListener('click', () => {
    if (mode === 'add' || mode === 'edit') {
      restoreForm(formSnapshot);
      setFieldValue('Status', 'Cancelled');
      setMode('browse');
      return;
    }

    // In browse mode: close the window/modal when embedded; otherwise clear selection and reset fields.
    if (closeContainingModal()) return;
    clearSelection();
    clearEditableFields();
    setFieldValue('Status', '');
    updateButtons();
  });

  updateButtons();
})();
