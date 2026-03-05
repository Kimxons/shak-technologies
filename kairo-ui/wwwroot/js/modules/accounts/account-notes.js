(function () {
  var state = {
    notes: '',
    editing: false
  };

  function getCtx() {
    var ps = (window.parent && window.parent.AccountMaintenanceState) || {};
    // Fallbacks from AuthService/session if parent state is missing
    if ((!ps.AccountID || !ps.OurBranchID || !ps.OperatorID)) {
      try {
        var session = window.parent?.AuthService?.getSession?.() || window.AuthService?.getSession?.();
        if (session) {
          ps = Object.assign({}, ps, {
            AccountID: ps.AccountID || session.AccountID || session.accountId || session.accountID,
            OurBranchID: ps.OurBranchID || session.OurBranchID || session.BranchID || session.branchID,
            OperatorID: ps.OperatorID || session.OperatorID || session.operatorID || session.operatorId
          });
        }
      } catch (e) {
        console.warn('[AccountNotes] AuthService session read failed', e);
      }

      if (!ps.AccountID || !ps.OurBranchID) {
        ps = Object.assign({}, ps, {
          AccountID: ps.AccountID || sessionStorage.getItem('AccountID') || sessionStorage.getItem('accountid') || '',
          OurBranchID: ps.OurBranchID || sessionStorage.getItem('OurBranchID') || sessionStorage.getItem('BranchID') || '',
          OperatorID: ps.OperatorID || sessionStorage.getItem('OperatorID') || ''
        });
      }
    }

    return {
      AccountID: ps.AccountID || ps.accountid || ps.AccountId || '',
      OurBranchID: ps.OurBranchID || ps.BranchID || ps.branchID || ps.BranchId || '',
      OperatorID: ps.OperatorID || ps.operatorID || ps.operatorId || 'web_portal'
    };
  }

  function showMessage(text, type) {
    var t = type || 'info';
    if (window.DataEntryBase && DataEntryBase.showMessage) {
      DataEntryBase.showMessage(text, t, 3000);
      return;
    }
    var bar = document.querySelector('.am-message-panel');
    if (!bar) return;
    if (bar.classList) {
      bar.className = 'am-message-panel show ' + t;
    }
    var span = bar.querySelector('span');
    if (span) span.textContent = text;
    setTimeout(function () { bar.classList.remove('show'); }, 3000);
  }

  function setStatus(text) {
    if (window.DataEntryBase && DataEntryBase.setStatus) {
      DataEntryBase.setStatus(text);
    }
    var status = document.querySelector('.status-bar');
    if (status) status.textContent = text;
  }

  function showLoader(show) {
    if (window.DataEntryBase) {
      return show ? DataEntryBase.showLoader('Loading notes...') : DataEntryBase.hideLoader();
    }
    var overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.hidden = !show;
  }

  function setEditing(on) {
    state.editing = on;
    var notes = document.getElementById('notes');
    if (notes) {
      notes.disabled = !on;
      if (on) notes.focus();
    }

    var btnView = document.querySelector('[data-action="view"]');
    var btnEdit = document.querySelector('[data-action="edit"]');
    var btnSave = document.querySelector('[data-action="save"]');
    var btnCancel = document.querySelector('[data-action="cancel"]');

    if (btnView) btnView.disabled = false;
    if (btnEdit) btnEdit.disabled = on; // disable edit while editing
    if (btnSave) btnSave.disabled = !on;
    if (btnCancel) btnCancel.disabled = !on;
  }

  function getNow() {
    return new Date().toISOString().split('.')[0];
  }

  function getService() {
    return window.accountservice || window.AccountService || window.parent?.accountservice;
  }

  function fillAudit(resp) {
    var fields = [
      'MakerID', 'MakerDT', 'CheckerID', 'CheckerDT', 'ModifierID', 'ModifierDT'
    ];
    fields.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var val = resp && (resp[id] || resp[id.toLowerCase()]) || '-';
      if ('value' in el) {
        el.value = val || '-';
      } else {
        el.textContent = val || '-';
      }
    });
  }

  function extractNotes(resp) {
    if (!resp) return '';
    if (resp.Notes) return resp.Notes;
    if (resp.note) return resp.note;
    if (resp.Data && resp.Data.Notes) return resp.Data.Notes;
    if (Array.isArray(resp.Data) && resp.Data.length) {
      var first = resp.Data[0];
      if (first.Notes) return first.Notes;
      if (first.note) return first.note;
    }
    if (Array.isArray(resp) && resp.length) {
      var f = resp[0];
      if (f.Notes) return f.Notes;
      if (f.note) return f.note;
    }
    return '';
  }

  function unwrapResponse(resp) {
    if (!resp) return resp;
    if (resp.Response) resp = resp.Response;
    if (resp.response) resp = resp.response;
    if (resp.Data) resp = resp.Data;
    if (resp.data) resp = resp.data;
    return resp;
  }

  function firstRecord(resp) {
    if (!resp) return null;
    if (Array.isArray(resp) && resp.length) return resp[0];
    if (Array.isArray(resp.Data) && resp.Data.length) return resp.Data[0];
    if (Array.isArray(resp.data) && resp.data.length) return resp.data[0];
    return resp;
  }

  async function loadNotes() {
    var ctx = getCtx();
    console.info('[AccountNotes] loadNotes ctx', ctx);
    if (!ctx.AccountID || !ctx.OurBranchID) {
      showMessage('Load an account first.', 'warning');
      console.warn('[AccountNotes] Missing AccountID/OurBranchID, skipping load');
      return;
    }

    showLoader(true);
    setStatus('Loading notes...');
    try {
      var svc = getService();
      if (!svc || typeof svc.getAccountNotes !== 'function') {
        throw new Error('Account notes service not available');
      }

      var resp = await svc.getAccountNotes({
        ourbranchID: ctx.OurBranchID,
        ModuleID: 'ACCOUNT',
        SearchID: ctx.AccountID
      });

      console.info('[AccountNotes] getAccountNotes response', resp);

      var unwrapped = unwrapResponse(resp);
      var record = firstRecord(unwrapped);

      var notesVal = extractNotes(unwrapped);
      state.notes = notesVal || '';
      var notes = document.getElementById('notes');
      if (notes) notes.value = state.notes;
      fillAudit(record || {});
      setEditing(false);
      showMessage('Notes loaded.', 'success');
    } catch (err) {
      console.error('[AccountNotes] load failed', err);
      showMessage('Unable to load notes.', 'error');
    } finally {
      showLoader(false);
      setStatus('Ready');
    }
  }

  async function saveNotes() {
    var ctx = getCtx();
    if (!ctx.AccountID || !ctx.OurBranchID) {
      showMessage('Load an account first.', 'warning');
      return;
    }

    var notesEl = document.getElementById('notes');
    var notesVal = (notesEl && notesEl.value) || '';

    showLoader(true);
    setStatus('Saving notes...');
    try {
      var svc = getService();
      if (!svc || typeof svc.updateAccountNotes !== 'function') {
        throw new Error('Account notes service not available');
      }

      await svc.updateAccountNotes({
        OurBranchID: ctx.OurBranchID,
        ModuleID: 'ACCOUNT',
        Searchkey: ctx.AccountID,
        Notes: notesVal,
        CreatedBy: ctx.OperatorID,
        CreatedOn: getNow(),
        ModifiedBy: ctx.OperatorID,
        ModifiedOn: getNow(),
        SupervisedBy: ctx.OperatorID,
        SupervisedOn: getNow(),
        UpdateCount: 0
      });

      state.notes = notesVal;
      setEditing(false);
      showMessage('Notes saved.', 'success');
    } catch (err) {
      console.error('[AccountNotes] save failed', err);
      showMessage('Save failed.', 'error');
    } finally {
      showLoader(false);
      setStatus('Ready');
    }
  }

  function wireActions() {
    var btnView = document.querySelector('[data-action="view"]');
    var btnEdit = document.querySelector('[data-action="edit"]');
    var btnSave = document.querySelector('[data-action="save"]');
    var btnCancel = document.querySelector('[data-action="cancel"]');
    var btnClear = document.querySelector('[data-action="clear"]');
    var btnClose = document.querySelector('[data-action="close"]');

    if (btnView) btnView.addEventListener('click', loadNotes);
    if (btnEdit) btnEdit.addEventListener('click', function () { setEditing(true); });
    if (btnSave) btnSave.addEventListener('click', saveNotes);
    if (btnCancel) btnCancel.addEventListener('click', function () {
      var notes = document.getElementById('notes');
      if (notes) notes.value = state.notes;
      setEditing(false);
    });
    if (btnClear) btnClear.addEventListener('click', function () {
      var notes = document.getElementById('notes');
      setEditing(true);
      if (notes) {
        notes.value = '';
        notes.focus();
      }
    });
    if (btnClose) btnClose.addEventListener('click', function () {
      if (window.DataEntryBase && DataEntryBase.closeChildForm) {
        DataEntryBase.closeChildForm();
      } else {
        window.parent?.postMessage({ type: 'accountMaintenanceChildClose' }, '*');
      }
    });
  }

  function wireTitleBar() {
    document.querySelectorAll('.de-title-btn[data-action], .am-btn[data-action]').forEach(function (btn) {
      var action = btn.getAttribute('data-action');
      if (action === 'refresh') btn.addEventListener('click', loadNotes);
      if (action === 'close') btn.addEventListener('click', function () {
        if (window.DataEntryBase && DataEntryBase.closeChildForm) {
          DataEntryBase.closeChildForm();
        } else {
          window.parent?.postMessage({ type: 'accountMaintenanceChildClose' }, '*');
        }
      });
    });
  }

  document.addEventListener('am:action:view', function () { loadNotes(); });
  document.addEventListener('am:action:add', function () { setEditing(true); var notes = document.getElementById('notes'); if (notes) { notes.value = ''; notes.focus(); } });
  document.addEventListener('am:action:edit', function () { setEditing(true); });
  document.addEventListener('am:action:save', function () { saveNotes(); });
  document.addEventListener('am:action:cancel', function () {
    var notes = document.getElementById('notes');
    if (notes) notes.value = state.notes;
    setEditing(false);
  });
  document.addEventListener('am:action:close', function () {
    if (window.DataEntryBase && DataEntryBase.closeChildForm) {
      DataEntryBase.closeChildForm();
    } else {
      window.parent?.postMessage({ type: 'accountMaintenanceChildClose' }, '*');
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    setEditing(false);
    wireTitleBar();
    wireActions();
    loadNotes();
  });
})();
