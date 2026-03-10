(() => {
  'use strict';

  const formCard = document.querySelector('[data-main-form]');

  /* ======================================================================
     ACTION & NAV BUTTONS
     ====================================================================== */
  const actionButtons = {
    view:   document.querySelector('[data-action="view"]'),
    add:    document.querySelector('[data-action="add"]'),
    edit:   document.querySelector('[data-action="edit"]'),
    delete: document.querySelector('[data-action="delete"]'),
    save:   document.querySelector('[data-action="save"]'),
    cancel: document.querySelector('[data-action="cancel"]'),
    stop:   document.querySelector('[data-action="stop"]')
  };

  const navButtons = {
    prev: document.querySelector('[data-nav="prev"]'),
    next: document.querySelector('[data-nav="next"]')
  };

  /* ======================================================================
     EDITABLE CONTROLS
     ====================================================================== */
  const editableSelector = 'input:not([readonly]):not([type="checkbox"]), select, textarea';
  const getEditableControls = () =>
    formCard ? Array.from(formCard.querySelectorAll(editableSelector)) : [];

  const initialSnapshot = new Map();

  function snapshotValues() {
    initialSnapshot.clear();
    getEditableControls().forEach(el => {
      initialSnapshot.set(el.name || el.id, el.value);
    });
    const cb = document.getElementById('chk_accountPayee');
    if (cb) initialSnapshot.set('accountPayee', cb.checked);
  }

  function restoreValues() {
    getEditableControls().forEach(el => {
      const key = el.name || el.id;
      if (initialSnapshot.has(key)) el.value = String(initialSnapshot.get(key) ?? '');
    });
    const cb = document.getElementById('chk_accountPayee');
    if (cb && initialSnapshot.has('accountPayee')) cb.checked = initialSnapshot.get('accountPayee');
  }

  function clearForm() {
    getEditableControls().forEach(el => { el.value = ''; });
    const cb = document.getElementById('chk_accountPayee');
    if (cb) cb.checked = false;
  }

  /* ======================================================================
     EDIT MODE
     ====================================================================== */
  function setEditMode(editing) {
    getEditableControls().forEach(el => { el.disabled = !editing; });
    const cb = document.getElementById('chk_accountPayee');
    if (cb) cb.disabled = !editing;

    actionButtons.view   && (actionButtons.view.disabled   = editing);
    actionButtons.add    && (actionButtons.add.disabled    = editing);
    actionButtons.edit   && (actionButtons.edit.disabled   = editing);
    actionButtons.delete && (actionButtons.delete.disabled = editing);
    actionButtons.save   && (actionButtons.save.disabled   = !editing);
    actionButtons.cancel && (actionButtons.cancel.disabled = !editing);
    actionButtons.stop   && (actionButtons.stop.disabled   = editing);

    navButtons.prev && (navButtons.prev.disabled = editing);
    navButtons.next && (navButtons.next.disabled = editing);
  }

  /* ======================================================================
     MESSAGE HELPERS
     ====================================================================== */
  function showMessage(text, type) {
    const panel = document.querySelector('.am-message-panel');
    if (!panel) return;
    const icon = panel.querySelector('i');
    const span = panel.querySelector('span');
    const icons = { success: 'bi-check-circle-fill', error: 'bi-exclamation-circle-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' };
    if (icon) icon.className = 'bi ' + (icons[type] || icons.info);
    if (span) span.textContent = text;
    panel.className = 'am-message-panel show ' + (type || 'info');
    setTimeout(() => { panel.classList.remove('show'); }, 5000);
  }

  /* ======================================================================
     INIT
     ====================================================================== */
  snapshotValues();
  setEditMode(false);

  /* ======================================================================
     ACTION HANDLERS
     ====================================================================== */
  actionButtons.view?.addEventListener('click', () => {
    restoreValues();
    setEditMode(false);
    showMessage('View mode', 'info');
  });

  actionButtons.add?.addEventListener('click', () => {
    snapshotValues();
    clearForm();
    setEditMode(true);
    document.getElementById('txt_standingInstructionId')?.focus();
    showMessage('Add mode – fill in the details', 'info');
  });

  actionButtons.edit?.addEventListener('click', () => {
    snapshotValues();
    setEditMode(true);
    document.getElementById('txt_referenceNo')?.focus();
    showMessage('Edit mode', 'info');
  });

  actionButtons.cancel?.addEventListener('click', () => {
    restoreValues();
    setEditMode(false);
    showMessage('Changes cancelled', 'warning');
  });

  actionButtons.save?.addEventListener('click', () => {
    snapshotValues();
    setEditMode(false);
    showMessage('Record saved', 'success');
  });

  actionButtons.delete?.addEventListener('click', () => {
    snapshotValues();
    clearForm();
    setEditMode(false);
    showMessage('Record deleted', 'success');
  });

  actionButtons.stop?.addEventListener('click', () => {
    const status = document.getElementById('spn_standingInstructionStatus');
    if (status) status.textContent = 'Stopped';
    showMessage('Standing instruction stopped', 'warning');
  });

  /* ======================================================================
     SECTION TOGGLE
     ====================================================================== */
  document.querySelectorAll('[data-section-toggle]').forEach(header => {
    header.addEventListener('click', () => {
      const content = header.nextElementSibling;
      const icon = header.querySelector('.section-toggle-btn i');
      if (!content) return;
      const isHidden = content.style.display === 'none';
      content.style.display = isHidden ? '' : 'none';
      if (icon) {
        icon.className = isHidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
      }
      const btn = header.querySelector('.section-toggle-btn');
      if (btn) btn.setAttribute('aria-expanded', String(isHidden));
    });
  });

  /* ======================================================================
     WINDOW CONTROLS
     ====================================================================== */
  document.querySelectorAll('.am-btn[data-action]').forEach(btn => {
    const action = btn.getAttribute('data-action');
    if (!['refresh', 'maximize', 'close'].includes(action)) return;
    btn.addEventListener('click', e => {
      e.preventDefault();
      if (action === 'refresh') window.location.reload();
      if (action === 'maximize') {
        const win = document.querySelector('.window');
        if (win) win.classList.toggle('maximized');
      }
      if (action === 'close') {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ action: 'submoduleClosed', source: 'Standing Instruction Demand Draft' }, '*');
        } else {
          window.close();
        }
      }
    });
  });

  /* ======================================================================
     BRANCH SEARCH  (matches loan-application branch-search-modal pattern)
     ====================================================================== */
  (function () {
    let branchSearchData = [];
    let selectedBranch = null;
    let currentPage = 1;
    const pageSize = 50;
    let totalPages = 1;

    const modalEl     = () => document.getElementById('mdl_branchSearchModal');
    const resultsEl   = () => document.getElementById('tbl_branchSearchResults');
    const pageInfoEl  = () => document.getElementById('spn_branchPageInfo');
    const btnPrev     = () => document.getElementById('btn_prevBranchPage');
    const btnNext     = () => document.getElementById('btn_nextBranchPage');
    const btnOk       = () => document.getElementById('btn_selectBranch');

    function filterBranches(all, idVal, idOp, nameVal, nameOp) {
      return all.filter(b => {
        const matchField = (field, val, op) => {
          if (!val) return true;
          const v = field.toLowerCase(), s = val.toLowerCase();
          if (op === 'equals') return v === s;
          if (op === 'startswith') return v.startsWith(s);
          return v.includes(s);
        };
        return matchField(b.branchId, idVal, idOp) && matchField(b.branchName, nameVal, nameOp);
      });
    }

    function displayResults() {
      const el = resultsEl();
      if (!el) return;
      if (!branchSearchData.length) {
        el.innerHTML = '<tr><td colspan="3" class="no-results"><i class="bi bi-search"></i> No branches found.</td></tr>';
        updatePagination();
        return;
      }
      const start = (currentPage - 1) * pageSize;
      const page  = branchSearchData.slice(start, start + pageSize);
      el.innerHTML = page.map((b, i) =>
        `<tr data-index="${start + i}" class="branch-row"><td>${start + i + 1}</td><td>${b.branchId}</td><td>${b.branchName}</td></tr>`
      ).join('');
      el.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', () => {
          el.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
          row.classList.add('selected');
          selectedBranch = branchSearchData[parseInt(row.dataset.index)];
          const ok = btnOk(); if (ok) ok.disabled = false;
        });
        row.addEventListener('dblclick', () => {
          selectedBranch = branchSearchData[parseInt(row.dataset.index)];
          confirmBranchSelection();
        });
      });
      updatePagination();
    }

    function updatePagination() {
      totalPages = Math.ceil(branchSearchData.length / pageSize) || 1;
      const info = pageInfoEl(); if (info) info.textContent = `Page ${currentPage} of ${totalPages} (${branchSearchData.length} results)`;
      const p = btnPrev(); if (p) p.disabled = currentPage <= 1;
      const n = btnNext(); if (n) n.disabled = currentPage >= totalPages;
    }

    async function loadAllBranches() {
      const el = resultsEl();
      if (el) el.innerHTML = '<tr><td colspan="3" class="no-results"><i class="bi bi-hourglass-split"></i> Loading branches...</td></tr>';
      try {
        if (!window.LookupService) throw new Error('LookupService not available');
        const result = await window.LookupService.getBranches({ BankID: '00' });
        if (result.success && result.data) {
          const raw = Array.isArray(result.data) ? result.data : (result.Details || []);
          branchSearchData = raw.map(b => ({ branchId: b.OurBranchID || b.BranchID || '', branchName: b.BranchName || b.Name || '' }));
        } else throw new Error('Failed to load branches');
      } catch (err) {
        console.error('[BranchSearch]', err);
        if (el) el.innerHTML = `<tr><td colspan="3" class="no-results"><i class="bi bi-exclamation-triangle"></i> Error loading branches.</td></tr>`;
        return;
      }
      currentPage = 1; selectedBranch = null;
      const ok = btnOk(); if (ok) ok.disabled = true;
      displayResults();
    }

    async function performSearch() {
      const idVal   = document.getElementById('txt_searchBranchIdFilter')?.value.trim() || '';
      const idOp    = document.getElementById('ddl_searchBranchIdOperator')?.value || 'like';
      const nameVal = document.getElementById('txt_searchBranchNameFilter')?.value.trim() || '';
      const nameOp  = document.getElementById('ddl_searchBranchNameOperator')?.value || 'like';
      const el = resultsEl();
      if (el) el.innerHTML = '<tr><td colspan="3" class="no-results"><i class="bi bi-hourglass-split"></i> Searching...</td></tr>';
      try {
        if (!window.LookupService) throw new Error('LookupService not available');
        const result = await window.LookupService.getBranches({ BankID: '00' });
        if (result.success && result.data) {
          const raw = Array.isArray(result.data) ? result.data : (result.Details || []);
          const mapped = raw.map(b => ({ branchId: b.OurBranchID || b.BranchID || '', branchName: b.BranchName || b.Name || '' }));
          branchSearchData = filterBranches(mapped, idVal, idOp, nameVal, nameOp);
        } else throw new Error('Search failed');
      } catch (err) {
        console.error('[BranchSearch]', err);
        if (el) el.innerHTML = `<tr><td colspan="3" class="no-results"><i class="bi bi-exclamation-triangle"></i> Error searching branches.</td></tr>`;
        return;
      }
      currentPage = 1; selectedBranch = null;
      const ok = btnOk(); if (ok) ok.disabled = true;
      displayResults();
    }

    function clearSearch() {
      ['txt_searchBranchIdFilter','txt_searchBranchNameFilter'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      ['ddl_searchBranchIdOperator','ddl_searchBranchNameOperator'].forEach(id => { const el = document.getElementById(id); if (el) el.value = 'like'; });
      loadAllBranches();
    }

    function confirmBranchSelection() {
      if (!selectedBranch) return;
      const idEl   = document.getElementById('txt_branchId');
      const nameEl = document.getElementById('txt_branchName');
      if (idEl)   idEl.value   = selectedBranch.branchId;
      if (nameEl) nameEl.value = selectedBranch.branchName;
      const inst = bootstrap.Modal.getInstance(modalEl());
      if (inst) inst.hide();
      showMessage(`Branch: ${selectedBranch.branchId} – ${selectedBranch.branchName}`, 'success');
    }

    // Wire up buttons
    document.getElementById('btn_searchBranch')?.addEventListener('click', () => {
      const m = new bootstrap.Modal(modalEl()); m.show();
    });
    modalEl()?.addEventListener('shown.bs.modal', () => {
      document.getElementById('txt_searchBranchIdFilter')?.focus();
      loadAllBranches();
    });
    document.getElementById('btn_searchBranches')?.addEventListener('click', performSearch);
    document.getElementById('btn_clearBranchSearch')?.addEventListener('click', clearSearch);
    document.getElementById('btn_selectBranch')?.addEventListener('click', confirmBranchSelection);
    document.getElementById('btn_prevBranchPage')?.addEventListener('click', () => { currentPage--; displayResults(); });
    document.getElementById('btn_nextBranchPage')?.addEventListener('click', () => { currentPage++; displayResults(); });
    ['txt_searchBranchIdFilter','txt_searchBranchNameFilter'].forEach(id => {
      document.getElementById(id)?.addEventListener('keypress', e => { if (e.key === 'Enter') performSearch(); });
    });
  }());
})();
