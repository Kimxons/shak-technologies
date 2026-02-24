(function (global) {
  'use strict';

  const CTX_KEYS = ['LG_ACCOUNT_CONTEXT', 'LG_ACCOUNT_APP_CONTEXT'];

  const getEl = (id) => document.getElementById(id);

  const setToast = (message, type = 'info') => {
    const toast = getEl('formToast');
    if (!toast) return;
    toast.classList.remove('d-none', 'alert-success', 'alert-danger', 'alert-warning', 'alert-info');
    toast.classList.add(`alert-${type}`);
    toast.textContent = message;
  };

  const hideToast = () => {
    const toast = getEl('formToast');
    if (!toast) return;
    toast.classList.add('d-none');
    toast.textContent = '';
  };

  const safeJsonParse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  const readParentValue = (id) => {
    try {
      const pd = global.parent?.document;
      const el = pd?.getElementById?.(id);
      return el && el.value != null ? String(el.value).trim() : '';
    } catch {
      return '';
    }
  };

  const getMasterBranchAndAccount = () => {
    // Prefer parent DOM (LG Account Application master screen)
    const branch = readParentValue('BranchID') || readParentValue('OurBranchID');
    const account = readParentValue('AccountID');
    if (branch && account) return { branch, account };

    // Fallback to session context published by the master screen
    for (const k of CTX_KEYS) {
      const ctx = safeJsonParse(sessionStorage.getItem(k) || '');
      const b = String(ctx?.OurBranchID || ctx?.BranchID || '').trim();
      const a = String(ctx?.AccountID || '').trim();
      if (b && a) return { branch: b, account: a };
    }

    return null;
  };

  const buildSearchId = (branchId, accountId) => `[${branchId}:${accountId}]`;

  const pad2 = (n) => String(n).padStart(2, '0');

  const formatDbDateTime = (d = new Date()) => {
    const yyyy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const hh = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  };

  const getOperatorId = () => {
    const fromParent = readParentValue('OperatorID') || readParentValue('CreatedBy') || readParentValue('UserID');
    if (fromParent) return fromParent;

    for (const k of CTX_KEYS) {
      const ctx = safeJsonParse(sessionStorage.getItem(k) || '');
      const op = String(ctx?.OperatorID || '').trim();
      if (op) return op;
    }

    return 'CSADM';
  };

  const setIfExists = (id, value) => {
    const el = getEl(id);
    if (!el) return;
    if ('value' in el) el.value = value == null ? '' : String(value);
    else el.textContent = value == null ? '' : String(value);
  };

  const getAssetsJsBaseUrl = () => {
    try {
      return new URL('../../../assets/js/', document.baseURI).toString();
    } catch {
      return '/assets/js/';
    }
  };

  const ensureDependenciesLoaded = async () => {
    const { ServiceLoader } = global;
    if (!ServiceLoader) throw new Error('ServiceLoader not found');

    const baseAssetsJs = getAssetsJsBaseUrl();
    await ServiceLoader.loadScript(new URL('services/shared/coreApi.js', baseAssetsJs).toString());
    await ServiceLoader.loadScript(new URL('services/letterOfGuarantee/letterOfGuaranteeService.js', baseAssetsJs).toString());

    await ServiceLoader.waitForService('CoreApi', 8000);
    await ServiceLoader.waitForService('LetterOfGuaranteeService', 8000);
  };

  let lastLoadedMeta = null;

  const loadNotesOnFormLoad = async (options = {}) => {
    const { preserveIfEmpty = false } = options;

    const master = getMasterBranchAndAccount();
    if (!master) {
      setToast('No BranchID/AccountID context found. View an LG Account Application first.', 'warning');
      return;
    }

    const svc = global.LetterOfGuaranteeService;
    if (!svc?.getNotes) {
      setToast('LG service not available', 'danger');
      return;
    }

    const requestData = {
      ourbranchID: master.branch,
      ModuleID: 1305,
      SearchID: buildSearchId(master.branch, master.account)
    };

    const result = await svc.getNotes(requestData);
    if (!result?.success) {
      setToast(result?.message || 'Failed to load notes', 'danger');
      return;
    }

    // CoreApi.normalizeResponse() returns `data = Details` (array) when the payload only has `Details`.
    // Some other endpoints return `data` as the full payload object.
    const payload = result.data;
    const row = Array.isArray(payload)
      ? payload[0]
      : (Array.isArray(payload?.Details) ? payload.Details[0] : null);

    console.log('[LGNotes] getNotes result', { requestData, result, row });
    if (!row) {
      if (!preserveIfEmpty) {
        setIfExists('Notes', '');
        setToast('No notes found.', 'info');
      }
      return;
    }

    setIfExists('Notes', row.Notes);
    lastLoadedMeta = {
      CreatedBy: row.CreatedBy,
      CreatedOn: row.CreatedOn,
      ModifiedBy: row.ModifiedBy,
      ModifiedOn: row.ModifiedOn,
      SupervisedBy: row.SupervisedBy,
      SupervisedOn: row.SupervisedOn,
      UpdateCount: row.UpdateCount
    };
    hideToast();

    console.log('[LGNotes] Loaded', { requestData, row });
  };

  const init = async () => {
    try {
      await ensureDependenciesLoaded();
      await loadNotesOnFormLoad();
    } catch (error) {
      console.error('[LGNotes] Init failed:', error);
      setToast('Failed to initialize notes screen', 'danger');
    }

    // UI actions (kept in this controller for consistency)
    document.addEventListener(
      'click',
      async (event) => {
        const closeBtn = event.target.closest('[data-lg-notes-action="close"]');
        if (closeBtn) {
          event.preventDefault();
          hideToast();
          try {
            const modalEl = global.parent?.document?.getElementById('lgNotesModal');
            const parentBootstrap = global.parent?.bootstrap;
            if (modalEl && parentBootstrap?.Modal) {
              parentBootstrap.Modal.getOrCreateInstance(modalEl).hide();
              return;
            }
          } catch {
            // ignore
          }
          global.close?.();
          return;
        }

        const saveBtn = event.target.closest('[data-lg-notes-action="save"]');
        if (saveBtn) {
          event.preventDefault();
          const master = getMasterBranchAndAccount();
          if (!master) {
            setToast('No BranchID/AccountID context found. View an LG Account Application first.', 'warning');
            return;
          }

          const svc = global.LetterOfGuaranteeService;
          if (!svc?.updateNotes) {
            setToast('LG service not available', 'danger');
            return;
          }

          const operatorId = getOperatorId();
          const now = formatDbDateTime(new Date());
          const notesValue = String(getEl('Notes')?.value ?? '').trim();

          const createdBy = String(lastLoadedMeta?.CreatedBy || operatorId || '').trim();
          const createdOn = String(lastLoadedMeta?.CreatedOn || now || '').trim();
          const updateCount = String(lastLoadedMeta?.UpdateCount ?? '0');

          const requestData = {
            OurBranchID: master.branch,
            ModuleID: 1305,
            Searchkey: buildSearchId(master.branch, master.account),
            Notes: notesValue,
            CreatedBy: createdBy,
            CreatedOn: createdOn,
            ModifiedBy: operatorId,
            ModifiedOn: now,
            SupervisedBy: String(lastLoadedMeta?.SupervisedBy || '').trim(),
            SupervisedOn: String(lastLoadedMeta?.SupervisedOn || '').trim(),
            UpdateCount: updateCount
          };

          setToast('Saving...', 'info');
          const result = await svc.updateNotes(requestData);
          console.log('[LGNotes] updateNotes result', { requestData, result });
          if (!result?.success) {
            setToast(result?.message || 'Failed to save notes', 'danger');
            return;
          }

          // Response is usually { Details: [] }. Treat success as save ok.
          setToast('Notes saved successfully.', 'success');

          // Refresh from backend, but don't wipe textarea if backend returns empty.
          await loadNotesOnFormLoad({ preserveIfEmpty: true });
        }
      },
      true
    );
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // If parent screen later updates context, reload.
  global.addEventListener('LG:AccountContextChanged', () => {
    loadNotesOnFormLoad();
  });
})(window);
