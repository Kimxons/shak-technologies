(function (global) {
  'use strict';

  const CTX_KEY = 'LG_ACCOUNT_CONTEXT';

  const closeParentModalIfPossible = () => {
    try {
      const parent = global.parent;
      const parentBootstrap = parent?.bootstrap;
      const modalEl = parent?.document?.getElementById('lgGuarantorsModal');
      if (parentBootstrap?.Modal && modalEl) {
        parentBootstrap.Modal.getOrCreateInstance(modalEl).hide();
        return true;
      }
    } catch {
      // Ignore cross-frame errors.
    }
    return false;
  };

  const getEl = (id) => document.getElementById(id);

  const GRID_PAGE_SIZE = 5;
  let gridRows = [];
  let gridPage = 1;

  const setToast = (message, type = 'success') => {
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

  const setMode = (form, mode) => {
    const normalized = (mode || 'view').toLowerCase();
    form.dataset.mode = normalized;

    const isEditable = normalized === 'add' || normalized === 'edit';
    form.querySelectorAll('[data-editable="true"]').forEach((el) => {
      el.disabled = !isEditable;
    });

    const saveBtn = form.querySelector('[data-lg-guarantors-action="save"]');
    const cancelBtn = form.querySelector('[data-lg-guarantors-action="cancel"]');
    if (saveBtn) saveBtn.disabled = !isEditable;
    if (cancelBtn) cancelBtn.disabled = !isEditable;

    form.querySelectorAll('[data-lg-guarantors-mode]').forEach((btn) => {
      const btnMode = (btn.getAttribute('data-lg-guarantors-mode') || '').toLowerCase();
      btn.classList.toggle('is-active', btnMode === normalized);
      btn.setAttribute('aria-pressed', btnMode === normalized ? 'true' : 'false');
    });
  };

  const safeJsonParse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  const getContext = () => {
    const fromSession = safeJsonParse(sessionStorage.getItem(CTX_KEY) || '');
    if (fromSession?.OurBranchID && fromSession?.AccountID) return fromSession;
    return null;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return String(dateString);
    return d.toLocaleString();
  };

  const setFieldValue = (id, value) => {
    const el = getEl(id);
    if (!el) return;
    el.value = value ?? '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const clearGrid = () => {
    const tbody = getEl('guarantorsGridBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3">No records to display.</td></tr>';
  };

  const updatePager = () => {
    const prevBtn = getEl('guarantorsPrevBtn');
    const nextBtn = getEl('guarantorsNextBtn');
    const info = getEl('guarantorsPageInfo');

    const totalRows = Array.isArray(gridRows) ? gridRows.length : 0;
    const totalPages = totalRows ? Math.ceil(totalRows / GRID_PAGE_SIZE) : 0;
    const safePage = totalPages ? Math.min(Math.max(1, gridPage), totalPages) : 0;
    gridPage = safePage || 1;

    if (info) info.textContent = totalPages ? `Page ${safePage} of ${totalPages}` : 'Page 0 of 0';
    if (prevBtn) prevBtn.disabled = !totalPages || safePage <= 1;
    if (nextBtn) nextBtn.disabled = !totalPages || safePage >= totalPages;
  };

  const renderGridPage = () => {
    const tbody = getEl('guarantorsGridBody');
    if (!tbody) return;

    const totalRows = Array.isArray(gridRows) ? gridRows.length : 0;
    if (!totalRows) {
      clearGrid();
      updatePager();
      return;
    }

    const totalPages = Math.ceil(totalRows / GRID_PAGE_SIZE);
    gridPage = Math.min(Math.max(1, gridPage), totalPages);

    const start = (gridPage - 1) * GRID_PAGE_SIZE;
    const pageRows = gridRows.slice(start, start + GRID_PAGE_SIZE);

    tbody.innerHTML = '';
    for (const r of pageRows) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r?.GuarantorID ?? ''}</td>
        <td>${r?.GuarantorName ?? ''}</td>
        <td>${r?.GuaranteeAmount ?? ''}</td>
      `;
      tbody.appendChild(tr);
    }

    updatePager();
  };

  const bindDetails02Grid = (rows) => {
    gridRows = Array.isArray(rows) ? rows : [];
    gridPage = 1;
    renderGridPage();
  };

  const bindDetails01Controls = (row, details02FirstRow) => {
    if (!row) return;

    // Dropdown and primary fields
    setFieldValue('GuarantorTypeID', row?.GuarantorTypeID);

    // Behind the scene section (Details01)
    setFieldValue('SignedBy', row?.GuaranteeSignedBy);
    setFieldValue('MaxGuaranteeAmount', row?.MaxGuaranteeAmount);
    setFieldValue('MaxNoOfLoan', row?.MaxNoOfLoans);
    setFieldValue('LoansAlreadyGuaranteed', row?.NoOfLoansAlreadyGuaranted);
    setFieldValue('NetWorth', row?.NetWorth);
    setFieldValue('Liability', row?.Liability);

    // Top editable fields mainly come from Details02 (transaction rows)
    if (details02FirstRow) {
      setFieldValue('GuarantorID', details02FirstRow?.GuarantorID);
      setFieldValue('GuaranteeAmount', details02FirstRow?.GuaranteeAmount);
      setFieldValue('Remarks', details02FirstRow?.Remarks);
      setFieldValue('BehindGuaranteeAmount', details02FirstRow?.GuaranteeAmount);

      setFieldValue('CreatedBy', details02FirstRow?.CreatedBy);
      setFieldValue('ModifiedBy', details02FirstRow?.ModifiedBy);
      setFieldValue('SupervisedBy', details02FirstRow?.SupervisedBy);
      setFieldValue('CreatedOn', formatDateTime(details02FirstRow?.CreatedOn));
      setFieldValue('ModifiedOn', formatDateTime(details02FirstRow?.ModifiedOn));
      setFieldValue('SupervisedOn', formatDateTime(details02FirstRow?.SupervisedOn));
    }
  };

  const populateGuarantorTypeDropdown = async () => {
    const select = getEl('GuarantorTypeID');
    if (!select) return;

    const LookupService = global.LookupService;
    if (!LookupService?.getSystemCodeOptions) return;

    const existing = select.value;
    const options = await LookupService.getSystemCodeOptions('GuarantorTypeID');
    select.innerHTML = '<option value="">--Select--</option>';
    for (const opt of options || []) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      select.appendChild(o);
    }
    if (existing) select.value = existing;
  };

  const ensureDependenciesLoaded = async () => {
    const { ServiceLoader } = global;
    if (!ServiceLoader) throw new Error('ServiceLoader not found');

    // Load core + required services (relative path safe)
    const baseAssetsJs = (() => {
      try {
        return new URL('../../../assets/js/', document.baseURI).toString();
      } catch {
        return '/assets/js/';
      }
    })();

    await ServiceLoader.loadScript(new URL('services/shared/coreApi.js', baseAssetsJs).toString());
    await ServiceLoader.loadScript(new URL('services/shared/lookupService.js', baseAssetsJs).toString());
    await ServiceLoader.loadScript(new URL('services/letterOfGuarantee/letterOfGuaranteeService.js', baseAssetsJs).toString());

    // Wait for globals
    await ServiceLoader.waitForService('CoreApi', 8000);
    await ServiceLoader.waitForService('LookupService', 8000);
    await ServiceLoader.waitForService('LetterOfGuaranteeService', 8000);
  };

  const loadGuarantorsOnFormLoad = async () => {
    const ctx = getContext();
    if (!ctx?.OurBranchID || !ctx?.AccountID) {
      setToast('No BranchID/AccountID context found. Open from LG Account Application (View) first.', 'warning');
      return;
    }

    const svc = global.LetterOfGuaranteeService;
    if (!svc?.getAccountGuarantors) {
      setToast('LG service not available', 'danger');
      return;
    }

    const requestData = {
      ModuleID: Number(ctx.ModuleID ?? 1000),
      OurBranchID: String(ctx.OurBranchID),
      AccountID: String(ctx.AccountID),
      AccountSeries: Number(ctx.AccountSeries ?? 0),
      GuarantorID: String(ctx.GuarantorID ?? ''),
      OperatorID: String(ctx.OperatorID ?? 'CSADM'),
      Direction: Number(ctx.Direction ?? 0)
    };

    const result = await svc.getAccountGuarantors(requestData);
    if (!result?.success) {
      setToast(result?.message || 'Failed to load guarantors', 'danger');
      clearGrid();
      return;
    }

    const payload = result.data || {};
    const d01 = payload.Details01 || payload.Details1 || payload.details01 || payload.details1;
    const d02 = payload.Details02 || payload.details02;

    const details01Row = Array.isArray(d01) ? d01[0] : null;
    const details02Rows = Array.isArray(d02) ? d02 : [];

    bindDetails02Grid(details02Rows);
    bindDetails01Controls(details01Row, details02Rows[0]);

    setToast('Guarantors loaded.', 'success');
  };

  const init = async () => {
    const form = getEl('lg-guarantors-form');
    if (!form) return;
    setMode(form, 'view');

    try {
      await ensureDependenciesLoaded();
      await populateGuarantorTypeDropdown();
      await loadGuarantorsOnFormLoad();
    } catch (error) {
      console.error('[LGGuarantors] Init failed:', error);
      setToast('Failed to initialize guarantors screen', 'danger');
    }

    form.addEventListener('click', (event) => {
      const modeBtn = event.target.closest('[data-lg-guarantors-mode]');
      if (modeBtn) {
        hideToast();
        setMode(form, modeBtn.getAttribute('data-lg-guarantors-mode'));
        return;
      }

      const actionBtn = event.target.closest('[data-lg-guarantors-action]');
      if (!actionBtn) return;

      const action = (actionBtn.getAttribute('data-lg-guarantors-action') || '').toLowerCase();
      hideToast();

      if (action === 'back') {
        if (!closeParentModalIfPossible()) {
          global.close();
        }
        return;
      }

      if (action === 'cancel') {
        form.reset();
        setMode(form, 'view');
        // Re-load from API/context after cancel
        loadGuarantorsOnFormLoad();
        setToast('Changes discarded.', 'warning');
        return;
      }

      if (action === 'save') {
        setMode(form, 'view');
        setToast('Saved (UI only).', 'info');
      }
    });

    // Pager controls
    const prevBtn = getEl('guarantorsPrevBtn');
    const nextBtn = getEl('guarantorsNextBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        gridPage = Math.max(1, (gridPage || 1) - 1);
        renderGridPage();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        gridPage = (gridPage || 1) + 1;
        renderGridPage();
      });
    }

    // Initialize pager state even before data loads
    updatePager();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }
})(window);
