/* Bank Account Maintenance Module */

(async function () {
  'use strict';

  // Surface init failures (common when the page is opened via file:// instead of http://)
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[BankAccountMaintenance] Unhandled promise rejection:', e?.reason || e);
  });
  window.addEventListener('error', (e) => {
    console.error('[BankAccountMaintenance] Unhandled error:', e?.error || e);
  });

  // Load dependencies
  const { ServiceLoader } = window;
  try {
    if (!ServiceLoader) throw new Error('ServiceLoader is not available on window');
    await ServiceLoader.loadCore();
    await ServiceLoader.loadOtherModulesService();
    await ServiceLoader.loadLookupService();
    await ServiceLoader.loadSearchService();
  } catch (err) {
    // Keep going so the UI can still open modals / show helpful messaging.
    console.error('[BankAccountMaintenance] Failed to load services:', err);
  }

  // Get services
  const OtherModulesService = window.OtherModulesService;
  const LookupService = window.LookupService;
  const SearchService = window.SearchService;

  function getOtherModulesBaseUrl() {
    const env = window.Environment || {};
    return String(env.baseUrlOtherModules || env.baseUrlCommon || 'http://localhost:5000').replace(/\/+$/, '');
  }

  async function postOtherModulesOldApi(formId, requestData) {
    const CoreApi = window.CoreApi;
    if (!CoreApi) {
      throw new Error('CoreApi is not available (services not loaded).');
    }
    const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
    return CoreApi.post(`${getOtherModulesBaseUrl()}/api/OldAPI`, envelope);
  }

  // Date formatting functions
  function getValueByAliases(obj, aliases) {
    if (!obj || typeof obj !== 'object') return '';

    // Direct lookup first
    for (const alias of aliases) {
      if (!alias) continue;
      const v = obj[alias];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }

    // Fuzzy lookup (case-insensitive, ignores separators, trims keys)
    const normalize = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedAliases = new Set(aliases.filter(Boolean).map(normalize));
    for (const rawKey of Object.keys(obj)) {
      const trimmedKey = String(rawKey).trim();
      if (!trimmedKey) continue;
      if (!normalizedAliases.has(normalize(trimmedKey))) continue;
      const v = obj[rawKey];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }

    return '';
  }

  function normalizeApiDateInput(value) {
    if (value === undefined || value === null) return '';
    const s = String(value).trim();
    if (!s) return '';

    // Common .NET JSON date format: /Date(1704067200000)/
    const dotNetMatch = s.match(/^\/Date\((\d+)\)\/?\/?$/);
    if (dotNetMatch) {
      const ms = Number(dotNetMatch[1]);
      if (!Number.isNaN(ms)) return new Date(ms).toISOString();
    }

    return s;
  }

  function formatDate(dateString) {
    if (!dateString) return '';

    const normalized = normalizeApiDateInput(dateString);
    if (!normalized) return '';

    // Already in display format (DD/Mon/YYYY)
    if (/^\d{1,2}\/[A-Za-z]{3}\/\d{4}$/.test(normalized)) {
      return normalized;
    }

    // ISO date (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      return formatDisplayDateFromIso(normalized);
    }

    // ISO datetime (YYYY-MM-DDTHH:mm:ss...) - parse by prefix to avoid browser quirks
    if (/^\d{4}-\d{2}-\d{2}T/.test(normalized)) {
      return formatDisplayDateFromIso(normalized.slice(0, 10));
    }

    // DMY numeric (DD/MM/YYYY or DD-MM-YYYY)
    {
      const m = normalized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (m) {
        const day = Number(m[1]);
        const month = Number(m[2]);
        const year = Number(m[3]);
        if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year) && month >= 1 && month <= 12) {
          const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'short' });
          return `${day}/${monthName}/${year}`;
        }
      }
    }

    // YMD numeric (YYYY/MM/DD or YYYY-MM-DD) - second pattern is already handled above
    {
      const m = normalized.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
      if (m) {
        const year = Number(m[1]);
        const month = Number(m[2]);
        const day = Number(m[3]);
        if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year) && month >= 1 && month <= 12) {
          const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'short' });
          return `${day}/${monthName}/${year}`;
        }
      }
    }

    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return '';
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function parseDate(displayDate) {
    if (!displayDate) return '';
    const s = String(displayDate).trim();
    if (!s) return '';

    // Accept ISO date directly (e.g., from native date inputs)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return s;
    }

    // YMD numeric (YYYY/MM/DD or YYYY-MM-DD)
    {
      const m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
      if (m) {
        const year = Number(m[1]);
        const month = Number(m[2]);
        const day = Number(m[3]);
        if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year) && month >= 1 && month <= 12) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }

    // DMY numeric (DD/MM/YYYY or DD-MM-YYYY)
    {
      const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (m) {
        const day = Number(m[1]);
        const month = Number(m[2]);
        const year = Number(m[3]);
        if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year) && month >= 1 && month <= 12) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }

    // Display format (DD/Mon/YYYY)
    if (/^\d{1,2}\/[A-Za-z]{3}\/\d{4}$/.test(s)) {
      const parts = s.split('/');
      const day = parseInt(parts[0], 10);
      const month = new Date(Date.parse(parts[1] + " 1, 2000")).getMonth();
      const year = parseInt(parts[2], 10);

      // IMPORTANT: Do not use Date/toISOString here.
      // This is a plain date (no time) and converting to ISO in UTC can shift the day
      // depending on the user's timezone (e.g., UTC+3 would become the previous day).
      if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return '';
      if (month < 0 || month > 11) return '';
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    return '';
  }

  function formatDisplayDateFromIso(isoDate) {
    if (!isoDate) return '';
    // Avoid timezone shifting when formatting plain YYYY-MM-DD
    const d = /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? new Date(`${isoDate}T00:00:00`) : new Date(isoDate);
    if (Number.isNaN(d.getTime())) return '';
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function formatSmallDateTime(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const mm = pad2(date.getMonth() + 1);
    const dd = pad2(date.getDate());
    const yyyy = date.getFullYear();
    const HH = pad2(date.getHours());
    const MM = pad2(date.getMinutes());
    const SS = pad2(date.getSeconds());
    return `${mm}/${dd}/${yyyy} ${HH}:${MM}:${SS}`;
  }

  function smallDateTimeFromIsoDate(isoDate, fallbackTime = '00:00:00') {
    if (!isoDate) return '';
    const s = String(isoDate).trim();
    if (!s) return '';

    // YYYY-MM-DD -> force local midnight to avoid TZ shifts
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const d = new Date(`${s}T${fallbackTime}`);
      return formatSmallDateTime(d);
    }

    // Already looks like MM/DD/YYYY HH:mm:ss
    if (/^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}:\d{2}$/.test(s)) return s;

    const d = new Date(s);
    return formatSmallDateTime(d);
  }

  // Wait for DOM to be fully ready
  setTimeout(() => {
    console.log('Initializing DOM elements and event listeners');

    const moduleRoot = document.querySelector('[data-module="bank-account-maintenance"]') || document;
    const getEl = (id) => moduleRoot.querySelector?.(`#${id}`) || document.getElementById(id);

    // Flatpickr instances for the two date fields (keyed by text input id)
    const bamDatePickers = Object.create(null);

    // Flag used by the global fallback handlers at the bottom of the file.
    window.__bankAccountMaintenanceInit = true;

    // Date pickers (Flatpickr, reliable in Chrome): icon opens picker, textbox stays view-only
    function initFlatpickrDate(textInputId, buttonId) {
      const textEl = getEl(textInputId);
      const btnEl = getEl(buttonId);
      if (!textEl || !btnEl) return;

      const fpFactory = window.flatpickr;
      if (typeof fpFactory !== 'function') {
        console.warn('[BankAccountMaintenance] flatpickr not loaded; date picking disabled.');
        return;
      }

      textEl.readOnly = true;

      const instance = fpFactory(textEl, {
        clickOpens: false,
        allowInput: false,
        disableMobile: true,
        // Append calendar inside this module so popup sizing can be scoped by CSS.
        appendTo: moduleRoot,
        // Display format: DD/Mon/YYYY
        dateFormat: 'd/M/Y',
        onChange: function (selectedDates) {
          const d = selectedDates && selectedDates[0];
          textEl.dataset.iso = d ? instance.formatDate(d, 'Y-m-d') : '';
          // Clear validation error when date changes
          textEl.classList.remove('is-invalid');
        },
        onReady: function (selectedDates) {
          const d = selectedDates && selectedDates[0];
          textEl.dataset.iso = d ? instance.formatDate(d, 'Y-m-d') : '';
        }
      });

      bamDatePickers[textInputId] = instance;

      btnEl.addEventListener('click', () => {
        try {
          instance.open();
        } catch (err) {
          console.warn('[BankAccountMaintenance] Failed to open date picker', err);
        }
      });
    }

    initFlatpickrDate('startDate', 'startDatePickBtn');
    initFlatpickrDate('bankOpeningBalanceDate', 'bankOpeningBalanceDatePickBtn');

    console.log('[BankAccountMaintenance] Date picker wiring:', {
      flatpickrLoaded: typeof window.flatpickr === 'function',
      startDate: !!getEl('startDate'),
      startDatePickBtn: !!getEl('startDatePickBtn'),
      bankOpeningBalanceDate: !!getEl('bankOpeningBalanceDate'),
      bankOpeningBalanceDatePickBtn: !!getEl('bankOpeningBalanceDatePickBtn')
    });

    // Section toggle (collapsible sections)
    function initSectionToggles() {
      const headers = moduleRoot.querySelectorAll('[data-section-toggle]');

      function setCollapsed(section, collapsed) {
        if (!section) return;
        const content = section.querySelector('[data-section-content]');
        if (!content) return;

        if (collapsed) content.setAttribute('hidden', '');
        else content.removeAttribute('hidden');

        const header = section.querySelector('[data-section-toggle]');
        const toggleBtn = header ? header.querySelector('.section-toggle-btn') : null;
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(!collapsed));

        const icon = toggleBtn ? toggleBtn.querySelector('i.bi') : null;
        if (icon) {
          icon.classList.toggle('bi-chevron-up', !collapsed);
          icon.classList.toggle('bi-chevron-down', collapsed);
        }
      }

      headers.forEach((header) => {
        if (header.dataset.kairoSectionToggleBound === '1') return;
        header.dataset.kairoSectionToggleBound = '1';

        const section = header.closest('.form-section');
        if (!section) return;

        const content = section.querySelector('[data-section-content]');
        setCollapsed(section, !!content?.hasAttribute('hidden'));

        const toggle = (e) => {
          e?.preventDefault?.();
          const isCollapsed = !!section.querySelector('[data-section-content]')?.hasAttribute('hidden');
          setCollapsed(section, !isCollapsed);
        };

        header.addEventListener('click', toggle);

        const toggleBtn = header.querySelector('.section-toggle-btn');
        if (toggleBtn) {
          toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggle(e);
          });
        }
      });
    }

    initSectionToggles();

  const buttons = {
    synchronize: getEl('synchronizeBtn'),
    view: getEl('viewBtn'),
    add: getEl('addBtn'),
    edit: getEl('editBtn'),
    delete: getEl('deleteBtn'),
    save: getEl('saveBtn'),
    cancel: getEl('cancelBtn'),
    refresh: getEl('refreshBtn')
  };
  
  // Debug: Check if buttons are found
  console.log('Button elements found:', {
    add: !!buttons.add,
    cancel: !!buttons.cancel,
    view: !!buttons.view,
    edit: !!buttons.edit,
    save: !!buttons.save,
    delete: !!buttons.delete,
    synchronize: !!buttons.synchronize
  });
  
  // Track form mode
  let formMode = 'view'; // 'view', 'add', 'edit'

  // Track whether the form is currently bound to a loaded record
  let hasLoadedRecord = false;

  // If the last View returned no data, Add should preserve keys once.
  let lastViewReturnedNoData = false;

  function setMode(nextMode, nextHasLoadedRecord = hasLoadedRecord) {
    formMode = nextMode;
    hasLoadedRecord = !!nextHasLoadedRecord;

    const isEditing = formMode === 'add' || formMode === 'edit';

    if (buttons.view) buttons.view.disabled = isEditing;
    if (buttons.add) buttons.add.disabled = isEditing;
    if (buttons.synchronize) buttons.synchronize.disabled = isEditing || !hasLoadedRecord;
    if (buttons.edit) buttons.edit.disabled = isEditing || !hasLoadedRecord;
    if (buttons.delete) buttons.delete.disabled = isEditing || !hasLoadedRecord;
    if (buttons.save) buttons.save.disabled = !isEditing;
    if (buttons.cancel) buttons.cancel.disabled = !isEditing;
  }

  // Initial UI state
  setMode('view', false);

  // ============================================================================
  // DIRECT TYPING: AUTO-FILL DESCRIPTIONS (NO MODAL REQUIRED)
  // ============================================================================

  const bamDirectLookupState = {
    glSeq: 0,
    branchSeq: 0,
    lastResolvedGlId: '',
    lastResolvedBranchId: ''
  };

  async function bamSearchServiceOrCoreApi(payload) {
    const service = SearchService;
    if (service && typeof service.search === 'function') {
      return service.search(payload);
    }

    const CoreApi = window.CoreApi;
    const Environment = window.Environment || {};
    if (!CoreApi || typeof CoreApi.makeRequestEnvelope !== 'function' || typeof CoreApi.post !== 'function') {
      throw new Error('Search service not available');
    }

    const baseUrl = (Environment.baseUrlCommon || Environment.baseUrl || 'http://localhost:8080').replace(/\/+$/, '');
    const endpoint = `${baseUrl}/api/OldAPI`;
    const envelope = CoreApi.makeRequestEnvelope('dbo.p_GetSearchResult', payload);
    envelope.RequestTime = formatSmallDateTime(new Date());
    return CoreApi.post(endpoint, envelope);
  }

  function bamNormalizeRowsFromSearchResponse(response) {
    let rows =
      response?.Details?.SearchResults ||
      response?.data?.Details?.SearchResults ||
      response?.data?.SearchResults ||
      response?.SearchResults ||
      response?.Details ||
      response?.data?.Details ||
      response?.data ||
      [];

    if (rows && !Array.isArray(rows) && Array.isArray(rows.SearchResults)) {
      rows = rows.SearchResults;
    }

    if (!Array.isArray(rows)) rows = rows ? [rows] : [];
    return rows;
  }

  async function bamLookupGlAccountById(accountId) {
    const operatorId = sessionStorage.getItem('operatorId') || 'web_portal';
    const envBranch = window.Environment?.OurBranchID || window.Environment?.branchId || '';
    const branchId = (getEl('baseBranch')?.value || '').trim() || sessionStorage.getItem('branchId') || envBranch || '';
    if (!branchId) return null;

    const currencyId = sessionStorage.getItem('currencyId') || window.Environment?.CurrencyID || window.Environment?.currencyId || 'ETB';
    const safeAccountId = String(accountId).trim().replace(/'/g, "''");

    const advFilter = `CurrencyID = '${currencyId}' AND OurBranchID ='${branchId}' AND AccountID = '${safeAccountId}'`;

    const payload = {
      TableID: 'GLBranchActiveID',
      AdvFilterString: advFilter,
      WhereStmt: '',
      PrevOrNext: 0,
      RefID: '',
      OperatorID: operatorId,
      ModuleID: 8060,
      OurBranchID: branchId,
      SearchKey: '',
      LanguageID: 'en'
    };

    const response = await bamSearchServiceOrCoreApi(payload);
    const rows = bamNormalizeRowsFromSearchResponse(response);
    if (!rows.length) return null;
    return rows[0];
  }

  async function bamLookupBranchById(branchIdRaw) {
    const operatorId = sessionStorage.getItem('operatorId') || 'web_portal';
    const env = window.Environment || {};
    const branchScope = sessionStorage.getItem('branchId') || env.defaultOurBranchId || env.OurBranchID || '';

    const idValue = String(branchIdRaw).trim();
    if (!idValue) return null;

    const safeId = idValue.replace(/'/g, "''");
    const normalizedNumeric = /^0+\d+$/.test(idValue) ? String(parseInt(idValue, 10)) : null;
    const idOr = [`OurBranchID = '${safeId}'`];
    if (normalizedNumeric && normalizedNumeric !== idValue) {
      idOr.push(`OurBranchID = '${normalizedNumeric.replace(/'/g, "''")}'`);
    }

    const payloadBase = {
      TableID: 'BranchID',
      WhereStmt: idOr.length === 1 ? idOr[0] : `(${idOr.join(' OR ')})`,
      AdvFilterString: '',
      PrevOrNext: '1',
      RefID: '',
      OperatorID: operatorId,
      ModuleID: 1000,
      OurBranchID: ''
    };

    // Prefer broad lookup first; some deployments require OurBranchID metadata.
    const tryPayloads = [payloadBase];
    if (branchScope) tryPayloads.push({ ...payloadBase, OurBranchID: branchScope });

    for (const payload of tryPayloads) {
      const response = await bamSearchServiceOrCoreApi(payload);
      const rows = bamNormalizeRowsFromSearchResponse(response);
      if (rows.length) return rows[0];
    }

    return null;
  }

  async function bamResolveGlAccountFromInput({ showWarning } = { showWarning: false }) {
    const input = getEl('glAccountId');
    const descEl = getEl('glAccountDescription');
    const branchInput = getEl('baseBranch');
    if (!input || !descEl) return;

    const accountId = String(input.value || '').trim();
    const branchId = String(branchInput?.value || '').trim();

    if (!accountId) {
      descEl.value = '';
      bamDirectLookupState.lastResolvedGlId = '';
      return;
    }

    // Avoid resolving GL before branch is known (prevents misleading descriptions).
    if (!branchId) {
      descEl.value = '';
      return;
    }

    if (bamDirectLookupState.lastResolvedGlId === accountId && String(descEl.value || '').trim()) {
      return;
    }

    const seq = ++bamDirectLookupState.glSeq;
    try {
      const row = await bamLookupGlAccountById(accountId);
      if (seq !== bamDirectLookupState.glSeq) return;

      if (!row) {
        descEl.value = '';
        if (showWarning) showMessage('No matching GL Account found for the typed ID (in the current branch/currency).', 'warning');
        return;
      }

      const resolvedId = (row.AccountID || row.GlAccountId || row.GLAccountID || '').toString().trim() || accountId;
      const resolvedDesc = (row.Description || row.AccountName || row.Name || '').toString();
      input.value = resolvedId;
      descEl.value = resolvedDesc;
      bamDirectLookupState.lastResolvedGlId = resolvedId;
    } catch (err) {
      console.warn('[BankAccountMaintenance] GL auto-lookup failed:', err);
      if (showWarning) showMessage(`GL auto-lookup failed: ${err.message || err}`, 'warning');
    }
  }

  async function bamResolveBranchFromInput({ showWarning } = { showWarning: false }) {
    const input = getEl('baseBranch');
    const descEl = getEl('baseBranchDescription');
    if (!input || !descEl) return;

    const branchId = String(input.value || '').trim();
    if (!branchId) {
      descEl.value = '';
      bamDirectLookupState.lastResolvedBranchId = '';
      return;
    }

    if (bamDirectLookupState.lastResolvedBranchId === branchId && String(descEl.value || '').trim()) {
      return;
    }

    const seq = ++bamDirectLookupState.branchSeq;
    try {
      const row = await bamLookupBranchById(branchId);
      if (seq !== bamDirectLookupState.branchSeq) return;

      if (!row) {
        descEl.value = '';
        if (showWarning) showMessage('No matching Branch found for the typed ID.', 'warning');
        return;
      }

      const resolvedId = (row.OurBranchID || row.OurBranchId || row.BranchID || row.BranchId || row.BranchCode || row.Branch || '').toString().trim() || branchId;
      const resolvedDesc = (row.BranchName || row.Name || '').toString();
      input.value = resolvedId;
      descEl.value = resolvedDesc;
      bamDirectLookupState.lastResolvedBranchId = resolvedId;

      // If GL is already typed, now that branch is valid, try resolving GL silently.
      const glId = String(getEl('glAccountId')?.value || '').trim();
      const glDesc = String(getEl('glAccountDescription')?.value || '').trim();
      if (glId && !glDesc) {
        bamResolveGlAccountFromInput({ showWarning: false });
      }
    } catch (err) {
      console.warn('[BankAccountMaintenance] Branch auto-lookup failed:', err);
      if (showWarning) showMessage(`Branch auto-lookup failed: ${err.message || err}`, 'warning');
    }
  }

  // Wire direct-typing handlers
  getEl('glAccountId')?.addEventListener('blur', () => bamResolveGlAccountFromInput({ showWarning: false }));
  getEl('glAccountId')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      bamResolveGlAccountFromInput({ showWarning: true });
    }
  });
  getEl('glAccountId')?.addEventListener('input', () => {
    bamDirectLookupState.lastResolvedGlId = '';
    const descEl = getEl('glAccountDescription');
    if (descEl) descEl.value = '';
    // Clear validation error on input
    getEl('glAccountId')?.classList.remove('is-invalid');
  });

  getEl('baseBranch')?.addEventListener('blur', () => bamResolveBranchFromInput({ showWarning: false }));
  getEl('baseBranch')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      bamResolveBranchFromInput({ showWarning: true });
    }
  });
  getEl('baseBranch')?.addEventListener('input', () => {
    bamDirectLookupState.lastResolvedBranchId = '';
    const descEl = getEl('baseBranchDescription');
    if (descEl) descEl.value = '';
    // Clear validation error on input
    getEl('baseBranch')?.classList.remove('is-invalid');
  });

  // Clear validation error when typing in Bank Account No
  getEl('bankAccountNo')?.addEventListener('input', () => {
    getEl('bankAccountNo')?.classList.remove('is-invalid');
  });

  // Clear validation error when typing in Bank Opening Balance
  getEl('bankOpeningBalance')?.addEventListener('input', () => {
    getEl('bankOpeningBalance')?.classList.remove('is-invalid');
  });

  // Clear validation error when toggling Reconciliation Key checkboxes
  getEl('checkIdAmount')?.addEventListener('change', () => {
    getEl('reconciliationKeysContainer')?.classList.remove('is-invalid');
  });
  getEl('referenceNoAmount')?.addEventListener('change', () => {
    getEl('reconciliationKeysContainer')?.classList.remove('is-invalid');
  });

  /**
   * Get form data for API requests
   */
  function getFormData() {
    return {
      BankID: '00',
      OurBranchID: getEl('baseBranch')?.value || '',
      AccountID: getEl('glAccountId')?.value || '',
      OperatorID: 'CSADM' // Default operator
    };
  }

  /**
   * Check if response data is empty
   */
  function hasMeaningfulBankAccountRow(row) {
    if (!row || typeof row !== 'object') return false;

    const bankAccount = row.BankAccountID || row.BankAccountNo || row.BankAccountNumber;
    const accountId = row.AccountID || row.GLAccountID || row.GlAccountId;
    const branchId = row.OurBranchID || row.BranchID || row.BranchId;
    const name = row.BankAccountName;
    const openingBal = row.BankOpeningBalance;
    const startDate = getValueByAliases(row, ['StartDate', 'StartDt', 'Start_Date', 'startDate', 'STARTDATE', 'START_DT']);
    const openingDate = getValueByAliases(row, ['BankOpeningBalanceDate', 'BankOpeningBalDate', 'OpeningBalanceDate', 'bankOpeningBalanceDate', 'BANKOPENINGBALANCEDATE']);

    return !!(
      (bankAccount && String(bankAccount).trim()) ||
      (accountId && String(accountId).trim()) ||
      (branchId && String(branchId).trim()) ||
      (name && String(name).trim()) ||
      (openingBal !== undefined && openingBal !== null && String(openingBal).trim() !== '') ||
      (startDate && String(startDate).trim()) ||
      (openingDate && String(openingDate).trim())
    );
  }

  function extractBankAccountRecord(payload, depth = 0) {
    if (payload === null || payload === undefined) return null;
    if (depth > 6) return null;

    // If we got a JSON string, try to parse.
    if (typeof payload === 'string') {
      const trimmed = payload.trim();
      if (!trimmed) return null;
      try {
        const parsed = JSON.parse(trimmed);
        return extractBankAccountRecord(parsed, depth + 1);
      } catch {
        return null;
      }
    }

    // Arrays: scan for a row or nested container.
    if (Array.isArray(payload)) {
      for (const item of payload) {
        if (hasMeaningfulBankAccountRow(item)) return item;
        const nested = extractBankAccountRecord(item, depth + 1);
        if (nested) return nested;
      }
      return null;
    }

    // Primitives: nothing to extract.
    if (typeof payload !== 'object') return null;

    // Common containers
    if (payload.Details01 !== undefined) {
      const nested = extractBankAccountRecord(payload.Details01, depth + 1);
      if (nested) return nested;
    }
    if (payload.Details !== undefined) {
      const nested = extractBankAccountRecord(payload.Details, depth + 1);
      if (nested) return nested;
    }
    if (payload.data !== undefined) {
      const nested = extractBankAccountRecord(payload.data, depth + 1);
      if (nested) return nested;
    }
    if (payload.Data !== undefined) {
      const nested = extractBankAccountRecord(payload.Data, depth + 1);
      if (nested) return nested;
    }

    // If this object itself looks like a row, return it.
    if (hasMeaningfulBankAccountRow(payload)) return payload;

    // Otherwise, search object properties (shallow recursion).
    for (const key of Object.keys(payload)) {
      const nested = extractBankAccountRecord(payload[key], depth + 1);
      if (nested) return nested;
    }

    return null;
  }

  function resolveUpdateCount(row) {
    if (!row || typeof row !== 'object') return 0;
    const fromAliases = getValueByAliases(row, [
      'UpdateCount',
      'UPDATECOUNT',
      'Update_Count',
      'UPDATE_COUNT',
      'UpdCount',
      'UpdCnt',
      'UpdateCnt',
      'SVUpdateCount',
      'svUpdateCount',
      'sv_update_count',
      'NewRecord',
      'NEWRECORD',
      'newRecord',
      'CurrentUpdateCount',
      'currentUpdateCount'
    ]);

    const candidates = [
      row.UpdateCount,
      row.updateCount,
      row.UPDATECOUNT,
      row.Update_Count,
      row.UPDATE_COUNT,
      row.SVUpdateCount,
      row.svUpdateCount,
      row.UpdateCnt,
      row.UpdCnt,
      row.NewRecord,
      row.newRecord,
      row.NEWRECORD,
      fromAliases
    ].filter((v) => v !== undefined && v !== null && String(v).trim() !== '');

    if (candidates.length === 0) return 0;
    const n = parseInt(String(candidates[0]).trim(), 10);
    return Number.isFinite(n) ? n : 0;
  }

  async function fetchExistingBankAccountRow({ bankId, ourBranchId, accountId, operatorId }) {
    const requestData = {
      BankID: bankId,
      OurBranchID: ourBranchId,
      AccountID: accountId,
      OperatorID: operatorId
    };

    const svc = window.OtherModulesService;
    const result = (svc && typeof svc.getBankAccount === 'function')
      ? await svc.getBankAccount(requestData)
      : await postOtherModulesOldApi('dbo.p_GetRecBankAccount', requestData);

    console.log('[BankAccountMaintenance] Preflight getBankAccount result:', result);

    if (!result?.success) return null;
    const payload = result.data ?? result.Details ?? null;
    const extracted = payload ? extractBankAccountRecord(payload) : null;
    if (extracted) {
      console.log('[BankAccountMaintenance] Preflight extracted row keys:', Object.keys(extracted));
      console.log('[BankAccountMaintenance] Preflight extracted row:', extracted);
      console.log('[BankAccountMaintenance] Preflight resolved UpdateCount:', resolveUpdateCount(extracted));
      return extracted;
    }

    return null;
  }

  async function callAddEditRecBankAccount(primaryPayload, fallbackPayload) {
    const svc = window.OtherModulesService;
    const invoke = async (data) => {
      // createBankAccount / updateBankAccount are equivalent wrappers around the same SP.
      if (svc && typeof svc.updateBankAccount === 'function') return svc.updateBankAccount(data);
      if (svc && typeof svc.createBankAccount === 'function') return svc.createBankAccount(data);
      return postOtherModulesOldApi('dbo.p_AddEditRecBankAccount', data);
    };

    const result = await invoke(primaryPayload);
    const msg = String(result?.message || '').toLowerCase();
    if (!result?.success && fallbackPayload && msg.includes('too many arguments')) {
      console.warn('[BankAccountMaintenance] Retrying save with fallback payload (proc signature mismatch).');
      return invoke(fallbackPayload);
    }

    return result;
  }

  function isConcurrency091(result) {
    const code = String(result?.code || result?.data?.Status || '').trim();
    const msg = String(result?.message || result?.data?.Message || '').toLowerCase();
    return code === '091' && msg.includes('edit already done');
  }

  function isEmptyResponse(data) {
    if (!data) return true;

    // Robust: if we can extract a meaningful row anywhere, it's not empty.
    // (Responses vary across deployments: arrays, Details, Details01, nested Data, etc.)
    const row = extractBankAccountRecord(data);
    return !row;
  }

  /**
   * Populate form with fetched data
   */
  function populateForm(data) {
    if (!data) return false;
    
    // Check for empty response
    if (isEmptyResponse(data)) {
      return false;
    }
    
    const recordData = extractBankAccountRecord(data);
    if (!recordData) return false;
    
    console.log('=== Populate Form Debug ===');
    console.log('Record Data:', recordData);
    console.log('UpdateCount (raw):', recordData.UpdateCount);
    
    // Map API fields to form fields (tolerate field name differences across deployments)
    const accountId = recordData.AccountID || recordData.GLAccountID || recordData.GlAccountId;
    const ourBranchId = recordData.OurBranchID || recordData.BranchID || recordData.BranchId;
    const bankAccountNo = recordData.BankAccountID || recordData.BankAccountNo || recordData.BankAccountNumber;

    const accountDesc = recordData.GLAccountDescription || recordData.GlAccountDescription || recordData.AccountDescription || recordData.AccountName;
    const branchDesc = recordData.BranchName || recordData.OurBranchName || recordData.BranchDescription;

    // Persist UpdateCount for edit/delete (optimistic concurrency).
    // IMPORTANT: Some legacy records have blank BankAccountID; UpdateCount must still be stored.
    const resolvedUpdateCount = resolveUpdateCount(recordData);
    const bankAccountNoField = getEl('bankAccountNo');
    if (bankAccountNoField) {
      bankAccountNoField.dataset.updateCount = String(resolvedUpdateCount);
      console.log('Stored UpdateCount in dataset:', bankAccountNoField.dataset.updateCount);

      // Preserve created audit values for updates when the backend returns them.
      const createdBy = recordData.CreatedBy || recordData.CreatedBY || recordData.CREATEDBY;
      const createdOn = recordData.CreatedOn || recordData.CreatedON || recordData.CREATEDON;
      if (createdBy) bankAccountNoField.dataset.createdBy = String(createdBy);
      if (createdOn) bankAccountNoField.dataset.createdOn = String(createdOn);
    }

    if (accountId && getEl('glAccountId')) getEl('glAccountId').value = accountId;
    if (ourBranchId && getEl('baseBranch')) getEl('baseBranch').value = ourBranchId;
    if (accountDesc && getEl('glAccountDescription')) getEl('glAccountDescription').value = accountDesc;
    if (branchDesc && getEl('baseBranchDescription')) getEl('baseBranchDescription').value = branchDesc;

    if (bankAccountNo && getEl('bankAccountNo')) {
      getEl('bankAccountNo').value = bankAccountNo;
    }
    if (recordData.BankAccountName && getEl('bankAccountName')) getEl('bankAccountName').value = recordData.BankAccountName;
    if (recordData.BankOpeningBalance && getEl('bankOpeningBalance')) getEl('bankOpeningBalance').value = recordData.BankOpeningBalance;
    console.log('GLSyncDate:', recordData.GLSyncDate);
    console.log('ReconciledDate:', recordData.ReconciledDate);
    if (recordData.GLSyncDate && getEl('glSyncDate')) getEl('glSyncDate').value = formatDate(recordData.GLSyncDate);
    if (recordData.ReconciledDate && getEl('reconciliationDate')) getEl('reconciliationDate').value = formatDate(recordData.ReconciledDate);
    
    // Handle date fields (tolerate varying field names)
    const startDateRaw = getValueByAliases(recordData, [
      'StartDate',
      'StartDt',
      'Start_Date',
      'Start_Date ',
      'startDate',
      'STARTDATE',
      'START_DT'
    ]);
    const openingBalanceDateRaw = getValueByAliases(recordData, [
      'BankOpeningBalanceDate',
      'BankOpeningBalDate',
      'BankOpenBalDate',
      'OpeningBalanceDate',
      'bankOpeningBalanceDate',
      'BANKOPENINGBALANCEDATE',
      'OPENINGBALANCEDATE'
    ]);

    if (startDateRaw) {
      const display = formatDate(startDateRaw);
      const textEl = getEl('startDate');
      if (textEl && display) {
        textEl.value = display;
        textEl.defaultValue = display;
        const iso = parseDate(display) || '';
        if (iso) textEl.dataset.iso = iso;
        // If Flatpickr is active, keep its internal state in sync too.
        if (typeof bamDatePickers?.startDate?.setDate === 'function' && iso) {
          bamDatePickers.startDate.setDate(iso, true, 'Y-m-d');
        }
      }
    }

    if (openingBalanceDateRaw) {
      const display = formatDate(openingBalanceDateRaw);
      const textEl = getEl('bankOpeningBalanceDate');
      if (textEl && display) {
        textEl.value = display;
        textEl.defaultValue = display;
        const iso = parseDate(display) || '';
        if (iso) textEl.dataset.iso = iso;
        if (typeof bamDatePickers?.bankOpeningBalanceDate?.setDate === 'function' && iso) {
          bamDatePickers.bankOpeningBalanceDate.setDate(iso, true, 'Y-m-d');
        }
      }
    }
    
    // Checkboxes
    if (getEl('checkIdAmount')) getEl('checkIdAmount').checked = !!(recordData.ChequeIDAndAmountKey ?? recordData.ChequeIdAndAmountKey);
    if (getEl('referenceNoAmount')) getEl('referenceNoAmount').checked = !!(recordData.RefIDAndAmountKey ?? recordData.RefIdAndAmountKey);

    console.log('=== Populate Form Values (post-bind) ===');
    console.log({
      glAccountId: getEl('glAccountId')?.value,
      baseBranch: getEl('baseBranch')?.value,
      bankAccountNo: getEl('bankAccountNo')?.value,
      bankAccountName: getEl('bankAccountName')?.value,
      startDate: getEl('startDate')?.value,
      bankOpeningBalanceDate: getEl('bankOpeningBalanceDate')?.value,
      bankOpeningBalance: getEl('bankOpeningBalance')?.value,
      glSyncDate: getEl('glSyncDate')?.value,
      reconciliationDate: getEl('reconciliationDate')?.value
    });
    
    return true;
  }

  /**
   * Clear form fields
   */
  function clearForm(options = {}) {
    const preserveKeys = !!options.preserveKeys;
    const preserveIds = preserveKeys
      ? new Set(['glAccountId', 'glAccountDescription', 'baseBranch', 'baseBranchDescription'])
      : null;

    console.log('Clearing form fields');
    // Clear all input fields manually since there's no form element
    const inputs = moduleRoot.querySelectorAll('input');
    inputs.forEach(input => {
      if (preserveIds && preserveIds.has(input.id)) {
        return;
      }
      if (input.type === 'checkbox') {
        input.checked = false;
      } else {
        input.value = '';
      }

      // Clear any stored ISO date value used for saving.
      if (input.dataset && 'iso' in input.dataset) {
        input.dataset.iso = '';
      }
    });
    
    // Clear any stored data
    const bankAccountNoField = getEl('bankAccountNo');
    if (bankAccountNoField) {
      bankAccountNoField.dataset.updateCount = '';
      bankAccountNoField.dataset.createdBy = '';
      bankAccountNoField.dataset.createdOn = '';
    }

    // Clearing the form means we no longer have a loaded record
    hasLoadedRecord = false;
    console.log('Form cleared successfully');
  }

  // Inline alert auto-hide timer
  let bamInlineAlertAutoHideTimer = null;

  /**
   * Show status message as inline alert + toast notification (Bootstrap 5)
   */
  function showMessage(message, type = 'info') {
    const safeType = (type || 'info').toString().toLowerCase();
    const text = message === undefined || message === null ? '' : String(message);
    console.log(`[${safeType.toUpperCase()}] ${text}`);

    // Handle inline alert first
    const inlineAlert = moduleRoot.querySelector('[data-bam-alert]');
    const inlineText = moduleRoot.querySelector('[data-bam-alert-text]');
    const inlineClose = moduleRoot.querySelector('[data-bam-alert-close]');

    const alertClass =
      safeType === 'success'
        ? 'alert-success'
        : safeType === 'warning'
          ? 'alert-warning'
          : safeType === 'info'
            ? 'alert-info'
            : 'alert-danger';

    if (inlineAlert && inlineText) {
      if (!text) {
        // Hide alert if no message
        if (bamInlineAlertAutoHideTimer) {
          clearTimeout(bamInlineAlertAutoHideTimer);
          bamInlineAlertAutoHideTimer = null;
        }
        inlineAlert.classList.add('d-none');
        inlineAlert.setAttribute('hidden', '');
      } else {
        // Show alert with message
        inlineAlert.classList.remove('alert-success', 'alert-danger', 'alert-warning', 'alert-info');
        inlineAlert.classList.add(alertClass);
        inlineText.textContent = text;
        inlineAlert.classList.remove('d-none');
        inlineAlert.removeAttribute('hidden');

        // Auto-hide after 6 seconds
        if (bamInlineAlertAutoHideTimer) {
          clearTimeout(bamInlineAlertAutoHideTimer);
          bamInlineAlertAutoHideTimer = null;
        }
        bamInlineAlertAutoHideTimer = setTimeout(() => {
          inlineAlert.classList.add('d-none');
          inlineAlert.setAttribute('hidden', '');
          bamInlineAlertAutoHideTimer = null;
        }, 6000);

        // Wire up close button (once)
        if (inlineClose && inlineClose.dataset.bound !== '1') {
          inlineClose.dataset.bound = '1';
          inlineClose.addEventListener('click', () => {
            if (bamInlineAlertAutoHideTimer) {
              clearTimeout(bamInlineAlertAutoHideTimer);
              bamInlineAlertAutoHideTimer = null;
            }
            inlineAlert.classList.add('d-none');
            inlineAlert.setAttribute('hidden', '');
          });
        }

        // Inline alert shown successfully, no need for toast
        return;
      }
    }

    // Fallback: show toast notification only if inline alert is not available
    const bs = window.bootstrap;
    const canToast = !!(bs && typeof bs.Toast === 'function');

    // Preferred path: Bootstrap Toast
    if (canToast) {
      const ensureContainer = () => {
        let container = document.getElementById('bamToastContainer');
        if (container) return container;
        container = document.createElement('div');
        container.id = 'bamToastContainer';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '11000';
        document.body.appendChild(container);
        return container;
      };

      const container = ensureContainer();

      const bgClassByType = {
        success: 'text-bg-success',
        warning: 'text-bg-warning',
        error: 'text-bg-danger',
        info: 'text-bg-primary'
      };
      const bgClass = bgClassByType[safeType] || bgClassByType.info;

      const toastEl = document.createElement('div');
      toastEl.className = `toast align-items-center ${bgClass} border-0`;
      toastEl.setAttribute('role', 'alert');
      toastEl.setAttribute('aria-live', 'assertive');
      toastEl.setAttribute('aria-atomic', 'true');

      const bodyEl = document.createElement('div');
      bodyEl.className = 'd-flex';

      const msgEl = document.createElement('div');
      msgEl.className = 'toast-body';
      msgEl.textContent = text;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-close btn-close-white me-2 m-auto';
      btn.setAttribute('data-bs-dismiss', 'toast');
      btn.setAttribute('aria-label', 'Close');

      bodyEl.appendChild(msgEl);
      bodyEl.appendChild(btn);
      toastEl.appendChild(bodyEl);
      container.appendChild(toastEl);

      const toast = new bs.Toast(toastEl, { delay: 3200, autohide: true });
      toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
      toast.show();
      return;
    }

    // Fallback: original snackbar (for cases where bootstrap.js didn't load)
    const notification = document.createElement('div');
    notification.className = `bam-snackbar bam-snackbar-${safeType}`;
    notification.textContent = text;

    const styles = `
        position: fixed;
        left: 50%;
        bottom: 32px;
        transform: translateX(-50%);
        min-width: 220px;
        max-width: 400px;
        padding: 14px 28px;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 500;
        box-shadow: 0 4px 16px rgba(0,0,0,0.18);
        z-index: 10001;
        animation: snackbarIn 0.25s cubic-bezier(.4,0,.2,1);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.98;
    `;

    const typeStyles = {
        'success': 'background-color: #10b981; color: #fff;',
        'warning': 'background-color: #f59e0b; color: #fff;',
        'error': 'background-color: #ef4444; color: #fff;',
        'info': 'background-color: #3b82f6; color: #fff;'
    };

    notification.style.cssText = styles + (typeStyles[safeType] || typeStyles['info']);
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'snackbarOut 0.3s cubic-bezier(.4,0,.2,1)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Initialize event listeners
  if (buttons.view) {
    buttons.view.addEventListener('click', async function() {
      console.log('View clicked');
      
      const requestData = getFormData();
      console.log(requestData)
      
      // Validate required fields
      if (!requestData.AccountID || !requestData.OurBranchID) {
        showMessage('Please fill in GL Account ID and Base Branch', 'warning');
        return;
      }

      try {
        // Show loading state
        buttons.view.disabled = true;
        buttons.view.textContent = 'Loading...';

        // Call the service (fallback to direct OldAPI call if service script didn't load)
        const svc = window.OtherModulesService;
        const result = (svc && typeof svc.getBankAccount === 'function')
          ? await svc.getBankAccount(requestData)
          : await postOtherModulesOldApi('dbo.p_GetRecBankAccount', requestData);
        console.log(result)
        if (result.success) {
          // Check if response has data
          const payload = result.data ?? result.Details ?? null;
          const hasData = populateForm(payload);
          
          if (hasData) {
            lastViewReturnedNoData = false;
            console.log('Post-view UpdateCount dataset:', getEl('bankAccountNo')?.dataset?.updateCount);
            setMode('view', true);
            showMessage('Bank account loaded successfully', 'success');
          } else {
            lastViewReturnedNoData = true;
            showMessage('No data found for the specified GL Account ID and Base Branch', 'warning');
            clearForm({ preserveKeys: true });
            setMode('view', false);
          }
        } else {
          lastViewReturnedNoData = false;
          showMessage(result.message || 'Failed to retrieve bank account data', 'error');
        }
      } catch (error) {
        console.error('Error fetching bank account:', error);
        lastViewReturnedNoData = false;
        showMessage(error?.message || 'An error occurred while fetching data', 'error');
      } finally {
        // Reset button state
        buttons.view.disabled = false;
        buttons.view.textContent = 'View';
      }
    });
  }

  if (buttons.synchronize) {
    buttons.synchronize.addEventListener('click', async function() {
      console.log('Synchronize clicked');
      
      const requestData = getFormData();
      
      if (!hasLoadedRecord) {
        showMessage('Please view a bank account first', 'warning');
        return;
      }

      try {
        buttons.synchronize.disabled = true;
        buttons.synchronize.textContent = 'Syncing...';

        const svc = window.OtherModulesService;
        const result = (svc && typeof svc.synchronizeBankAccount === 'function')
          ? await svc.synchronizeBankAccount(requestData)
          : await postOtherModulesOldApi('dbo.p_SyncBankAccount', requestData);
        if (result.success) {
          showMessage('Bank account synchronized successfully', 'success');
          // Refresh data
          buttons.view.click();
        } else {
          showMessage(result.message || 'Synchronization failed', 'error');
        }
      } catch (error) {
        console.error('Error synchronizing:', error);
        showMessage('An error occurred during synchronization', 'error');
      } finally {
        buttons.synchronize.disabled = false;
        buttons.synchronize.textContent = 'Synchronize';
      }
    });
  }

  if (buttons.add) {
    buttons.add.addEventListener('click', function() {
      console.log('Add button clicked - starting add operation');
      setMode('add', false);
      clearForm({ preserveKeys: lastViewReturnedNoData });
      lastViewReturnedNoData = false;
      console.log('Form cleared, mode set to add');
      showMessage('Ready to create new bank account', 'info');
      console.log('Add operation completed');
    });
    console.log('Add button event listener attached successfully');
  } else {
    console.error('Add button not found in DOM');
  }

  if (buttons.edit) {
    buttons.edit.addEventListener('click', function() {
      console.log('Edit clicked');
      if (!hasLoadedRecord) {
        showMessage('Please view a bank account first before editing', 'warning');
        return;
      }
      setMode('edit', true);
      showMessage('Edit mode enabled', 'info');
    });
  }

  if (buttons.delete) {
    buttons.delete.addEventListener('click', async function() {
      console.log('Delete clicked');
      
      // Validate required fields
      const glAccountId = document.getElementById('glAccountId')?.value;
      const baseBranch = document.getElementById('baseBranch')?.value;
      const bankAccountNoField = document.getElementById('bankAccountNo');
      const bankAccountNo = bankAccountNoField?.value;
      
      if (!glAccountId || !baseBranch || !bankAccountNo) {
        showMessage('Please view a bank account first before deleting', 'warning');
        return;
      }

      if (!confirm('Are you sure you want to delete this bank account? This action cannot be undone.')) {
        return;
      }

      try {
        buttons.delete.disabled = true;
        buttons.delete.textContent = 'Deleting...';

        // Get UpdateCount for optimistic concurrency
        const updateCount = parseInt(bankAccountNoField?.dataset?.updateCount || '0', 10);
        
        const requestData = {
          BankID: '00',
          OurBranchID: baseBranch,
          AccountID: glAccountId,
          UpdateCount: updateCount
        };

        console.log('Delete Request Data:', requestData);

        const svc = window.OtherModulesService;
        const result = (svc && typeof svc.deleteBankAccount === 'function')
          ? await svc.deleteBankAccount(requestData)
          : await postOtherModulesOldApi('dbo.p_DeleteRecBankAccount', requestData);

        if (result.success) {
          showMessage('Bank account deleted successfully', 'success');
          clearForm();
          setMode('view', false);
        } else {
          showMessage(result.message || 'Delete failed', 'error');
        }
      } catch (error) {
        console.error('Error deleting:', error);
        showMessage('An error occurred while deleting', 'error');
      } finally {
        buttons.delete.disabled = false;
        buttons.delete.textContent = 'Delete';
      }
    });
  }

  if (buttons.save) {
    buttons.save.addEventListener('click', async function(e) {
      e.preventDefault();
      console.log('Save clicked');

      const getDateIso = (textId) => {
        const textEl = getEl(textId);
        const picker = bamDatePickers?.[textId];
        const d = picker?.selectedDates?.[0];
        if (d && typeof picker.formatDate === 'function') {
          return picker.formatDate(d, 'Y-m-d');
        }
        const fromDataset = String(textEl?.dataset?.iso || '').trim();
        if (fromDataset && /^\d{4}-\d{2}-\d{2}$/.test(fromDataset)) return fromDataset;
        return parseDate(textEl?.value) || '';
      };

      const getDateSmallDateTime = (textId) => {
        const iso = getDateIso(textId);
        return smallDateTimeFromIsoDate(iso, '00:00:00');
      };
      
      const operatorId = 'CSADM';
      const bankId = '00';

      // ========================================================================
      // FORM VALIDATION
      // ========================================================================

      /**
       * Clear all validation error states from form fields
       */
      function clearValidationErrors() {
        const invalidFields = moduleRoot.querySelectorAll('.is-invalid');
        invalidFields.forEach((field) => field.classList.remove('is-invalid'));
      }

      /**
       * Mark a field as invalid and optionally focus it
       * @param {string} fieldId - The field element ID
       * @param {boolean} shouldFocus - Whether to focus the field
       * @returns {HTMLElement|null} - The field element
       */
      function markFieldInvalid(fieldId, shouldFocus = false) {
        const field = getEl(fieldId);
        if (field) {
          field.classList.add('is-invalid');
          if (shouldFocus) {
            field.focus();
          }
        }
        return field;
      }

      // Clear previous validation errors before validating
      clearValidationErrors();

      // Collect field values
      const glAccountIdField = getEl('glAccountId');
      const glAccountDescField = getEl('glAccountDescription');
      const baseBranchField = getEl('baseBranch');
      const baseBranchDescField = getEl('baseBranchDescription');
      const bankAccountNoField = getEl('bankAccountNo');

      const glAccountId = (glAccountIdField?.value || '').trim();
      const glAccountDesc = (glAccountDescField?.value || '').trim();
      const baseBranch = (baseBranchField?.value || '').trim();
      const baseBranchDesc = (baseBranchDescField?.value || '').trim();
      const bankAccountNo = (bankAccountNoField?.value || '').trim();

      // Validate mandatory fields
      const validationErrors = [];

      if (!glAccountId) {
        validationErrors.push({ field: 'glAccountId', message: 'GL Account ID is required' });
      } else if (!glAccountDesc) {
        // GL Account ID provided but lookup failed (no description)
        validationErrors.push({ 
          field: 'glAccountId', 
          message: 'GL Account ID is invalid or not found. Please use the lookup to select a valid account.' 
        });
      }

      if (!baseBranch) {
        validationErrors.push({ field: 'baseBranch', message: 'Base Branch is required' });
      } else if (!baseBranchDesc) {
        // Base Branch provided but lookup failed (no description)
        validationErrors.push({ 
          field: 'baseBranch', 
          message: 'Base Branch is invalid or not found. Please use the lookup to select a valid branch.' 
        });
      }

      if (!bankAccountNo) {
        validationErrors.push({ field: 'bankAccountNo', message: 'Bank Account No is required' });
      } else {
        // Validate Bank Account No format and length
        const bankAcctNoMinLen = 5;
        const bankAcctNoMaxLen = 50;
        // Allow alphanumeric characters, dashes, and spaces (common in bank account numbers)
        const bankAcctNoPattern = /^[A-Za-z0-9\-\s]+$/;

        if (bankAccountNo.length < bankAcctNoMinLen) {
          validationErrors.push({ 
            field: 'bankAccountNo', 
            message: `Bank Account No must be at least ${bankAcctNoMinLen} characters` 
          });
        } else if (bankAccountNo.length > bankAcctNoMaxLen) {
          validationErrors.push({ 
            field: 'bankAccountNo', 
            message: `Bank Account No must not exceed ${bankAcctNoMaxLen} characters` 
          });
        } else if (!bankAcctNoPattern.test(bankAccountNo)) {
          validationErrors.push({ 
            field: 'bankAccountNo', 
            message: 'Bank Account No must contain only letters, numbers, dashes, or spaces' 
          });
        }
      }

      // Validate Bank Opening Balance (optional but must be numeric if provided)
      const bankOpeningBalanceField = getEl('bankOpeningBalance');
      const bankOpeningBalanceRaw = (bankOpeningBalanceField?.value || '').trim();
      
      if (bankOpeningBalanceRaw) {
        // Remove commas and spaces for numeric parsing (e.g., "1,234,567.89" -> "1234567.89")
        const cleanedBalance = bankOpeningBalanceRaw.replace(/[,\s]/g, '');
        // Allow negative numbers and decimals (e.g., -1234.56, 1234.56, .56)
        const numericPattern = /^-?\d*\.?\d+$/;
        
        if (!numericPattern.test(cleanedBalance)) {
          validationErrors.push({ 
            field: 'bankOpeningBalance', 
            message: 'Bank Opening Balance must be a valid number' 
          });
        } else {
          const balanceValue = parseFloat(cleanedBalance);
          if (!Number.isFinite(balanceValue)) {
            validationErrors.push({ 
              field: 'bankOpeningBalance', 
              message: 'Bank Opening Balance must be a valid number' 
            });
          }
        }
      }

      // Validate Date Logic: Bank Opening Balance Date should not be before Start Date
      const startDateIso = getDateIso('startDate');
      const openingBalDateIso = getDateIso('bankOpeningBalanceDate');
      
      if (startDateIso && openingBalDateIso) {
        // Parse dates for comparison (YYYY-MM-DD format)
        const startDateObj = new Date(startDateIso + 'T00:00:00');
        const openingBalDateObj = new Date(openingBalDateIso + 'T00:00:00');
        
        if (!Number.isNaN(startDateObj.getTime()) && !Number.isNaN(openingBalDateObj.getTime())) {
          if (openingBalDateObj < startDateObj) {
            validationErrors.push({ 
              field: 'bankOpeningBalanceDate', 
              message: 'Bank Opening Balance Date cannot be before Start Date' 
            });
          }
        }
      }

      // Validate Reconciliation Keys: At least one must be selected
      const chequeIdAmountEl = getEl('checkIdAmount');
      const refNoAmountEl = getEl('referenceNoAmount');
      const chequeIdAmountChecked = chequeIdAmountEl?.checked === true;
      const refNoAmountChecked = refNoAmountEl?.checked === true;
      
      console.log('[BankAccountMaintenance] Reconciliation Keys validation:', {
        chequeIdAmountEl: !!chequeIdAmountEl,
        refNoAmountEl: !!refNoAmountEl,
        chequeIdAmountChecked,
        refNoAmountChecked
      });
      
      if (!chequeIdAmountChecked && !refNoAmountChecked) {
        validationErrors.push({ 
          field: 'reconciliationKeysContainer', // Highlight the container
          message: 'Reconciliation Key is required' 
        });
      }

      // Debug: Log all validation errors before checking
      console.log('[BankAccountMaintenance] Validation errors collected:', validationErrors);

      // If validation errors exist, highlight fields and show message
      if (validationErrors.length > 0) {
        console.log('[BankAccountMaintenance] Validation FAILED - stopping save');
        // Mark all invalid fields
        validationErrors.forEach((err, index) => {
          markFieldInvalid(err.field, index === 0); // Focus only the first invalid field
        });

        // Build user-friendly message
        // Separate "required" errors from "format" errors for cleaner messaging
        const requiredErrors = validationErrors.filter((err) => err.message.includes('is required'));
        const formatErrors = validationErrors.filter((err) => !err.message.includes('is required'));

        let errorMessage = '';
        if (requiredErrors.length > 0) {
          const fieldNames = requiredErrors.map((err) => err.message.replace(' is required', '')).join(', ');
          const plural = requiredErrors.length > 1;
          errorMessage = `Please fill in the required field${plural ? 's' : ''}: ${fieldNames}`;
        }
        if (formatErrors.length > 0) {
          // Show the first format error (most relevant)
          const formatMsg = formatErrors[0].message;
          errorMessage = errorMessage ? `${errorMessage}. ${formatMsg}` : formatMsg;
        }

        showMessage(errorMessage, 'warning');
        return;
      }
      
      // Determine if this is edit or add.
      // IMPORTANT: Legacy records can have blank BankAccountID; edit must still be treated as an update.
      let isUpdate = formMode === 'edit';

      // Get UpdateCount (required for optimistic concurrency on update/delete)
      // NOTE: In this legacy proc, UpdateCount commonly acts like a "NewRecord" flag on inserts.
      // Empirically, sending 0 on add triggers immediate concurrency (091). Use 1 for adds.
      let updateCount = isUpdate ? parseInt((bankAccountNoField?.dataset?.updateCount || '0').trim(), 10) : 1;

      // Preflight: if a record already exists for (OurBranchID, AccountID), we MUST treat save as update
      // and use the latest UpdateCount to satisfy optimistic concurrency.
      console.log('[BankAccountMaintenance] Preflight: checking if record already exists for GL+Branch...', {
        glAccountId,
        baseBranch,
        formMode
      });
      try {
        const existingRow = await fetchExistingBankAccountRow({
          bankId,
          ourBranchId: baseBranch,
          accountId: glAccountId,
          operatorId
        });

        if (existingRow) {
          const existingUpdateCount = resolveUpdateCount(existingRow);
          console.warn('[BankAccountMaintenance] Preflight: record exists for GL+Branch.', {
            existingUpdateCount,
            glAccountId,
            baseBranch
          });

          // If user is in add mode but record exists, switch to update (legacy upsert behavior)
          if (formMode === 'add') {
            console.warn('[BankAccountMaintenance] Add mode switching to update due to existing record.');
            isUpdate = true;
          }

          if (Number.isFinite(existingUpdateCount)) {
            updateCount = existingUpdateCount;
            if (bankAccountNoField) bankAccountNoField.dataset.updateCount = String(existingUpdateCount);
          }
        } else {
          console.log('[BankAccountMaintenance] Preflight: no existing record found for GL+Branch.');
        }
      } catch (preflightErr) {
        console.warn('[BankAccountMaintenance] Preflight fetch for UpdateCount failed; continuing with current mode.', preflightErr);
      }
      
      console.log('=== Save Operation Debug ===');
      console.log('Form Mode:', formMode);
      console.log('Bank Account No:', bankAccountNo);
      console.log('Is Update:', isUpdate);
      console.log('UpdateCount from dataset:', bankAccountNoField?.dataset?.updateCount);
      console.log('UpdateCount to send:', updateCount);

      if (isUpdate && (!Number.isFinite(updateCount) || updateCount <= 0)) {
        console.warn('[BankAccountMaintenance] Updating with missing/zero UpdateCount. This often triggers: "This record was modified by another user". Try View/Refresh to fetch latest UpdateCount.', {
          updateCount,
          datasetUpdateCount: bankAccountNoField?.dataset?.updateCount,
          glAccountId,
          baseBranch
        });
      }
      
      // Build request data. IMPORTANT: OldAPI maps keys to SQL proc params.
      // Extra keys will break with: "has too many arguments specified".
      const nowSmall = formatSmallDateTime(new Date());
      const createdByFromUi = String(bankAccountNoField?.dataset?.createdBy || '').trim();
      const createdOnFromUi = String(bankAccountNoField?.dataset?.createdOn || '').trim();

      const baseProcPayload = {
        BankID: bankId,
        OurBranchID: baseBranch,
        AccountID: glAccountId,
        BankAccountID: bankAccountNo || '',
        BankAccountName: getEl('bankAccountName')?.value || '',
        ChequeIDAndAmountKey: getEl('checkIdAmount')?.checked ? 1 : 0,
        RefIDAndAmountKey: getEl('referenceNoAmount')?.checked ? 1 : 0,
        StartDate: getDateSmallDateTime('startDate'),
        BankOpeningBalance: getEl('bankOpeningBalance')?.value || '0',
        BankOpeningBalanceDate: getDateSmallDateTime('bankOpeningBalanceDate'),
        CreatedBy: isUpdate ? (createdByFromUi || operatorId) : operatorId,
        CreatedOn: isUpdate ? (createdOnFromUi || nowSmall) : nowSmall,
        ModifiedBy: operatorId,
        ModifiedOn: nowSmall,
        SupervisedBy: operatorId
      };

      // Primary attempt: match the proc signature you provided (includes CreatedOn/ModifiedOn and UpdateCount).
      const requestData = { ...baseProcPayload, UpdateCount: updateCount };

      // Fallback attempt: some environments have a slimmer signature (no CreatedOn/ModifiedOn).
      const fallbackRequestData = {
        BankID: bankId,
        OurBranchID: baseBranch,
        AccountID: glAccountId,
        BankAccountID: bankAccountNo || '',
        BankAccountName: getEl('bankAccountName')?.value || '',
        ChequeIDAndAmountKey: getEl('checkIdAmount')?.checked ? 1 : 0,
        RefIDAndAmountKey: getEl('referenceNoAmount')?.checked ? 1 : 0,
        StartDate: getDateSmallDateTime('startDate'),
        BankOpeningBalance: getEl('bankOpeningBalance')?.value || '0',
        BankOpeningBalanceDate: getDateSmallDateTime('bankOpeningBalanceDate'),
        CreatedBy: isUpdate ? (createdByFromUi || operatorId) : operatorId,
        ModifiedBy: operatorId,
        SupervisedBy: operatorId,
        UpdateCount: updateCount
      };

      console.log('Full Request Data:', JSON.stringify(requestData, null, 2));

      try {
        buttons.save.disabled = true;
        buttons.save.textContent = 'Saving...';

        console.log('Request Data:', requestData);
        console.log('Form Mode:', formMode);
        console.log('Is Update:', isUpdate);

        let result = await callAddEditRecBankAccount(requestData, fallbackRequestData);

        // If we hit concurrency immediately, auto-refresh UpdateCount and retry once.
        if (isConcurrency091(result)) {
          try {
            console.warn('[BankAccountMaintenance] Concurrency 091 on save; refetching latest UpdateCount and retrying once...', {
              glAccountId,
              baseBranch
            });
            const latestRow = await fetchExistingBankAccountRow({
              bankId,
              ourBranchId: baseBranch,
              accountId: glAccountId,
              operatorId
            });
            const latestUpdateCount = resolveUpdateCount(latestRow);
            console.warn('[BankAccountMaintenance] Latest UpdateCount from server:', latestUpdateCount);

            if (latestRow) {
              if (bankAccountNoField) bankAccountNoField.dataset.updateCount = String(latestUpdateCount);
              // Prefer UpdateCount retry; fallback to NewRecord for environments using that contract.
              const retryPrimary = { ...baseProcPayload, UpdateCount: latestUpdateCount };
              const retryFallback = { ...baseProcPayload, NewRecord: latestUpdateCount };
              result = await callAddEditRecBankAccount(retryPrimary, retryFallback);
            } else {
              console.warn('[BankAccountMaintenance] Retry skipped: no row returned by p_GetRecBankAccount.');
            }
          } catch (retryErr) {
            console.warn('[BankAccountMaintenance] Concurrency retry failed:', retryErr);
          }
        }

        console.log('Save result:', result);

        if (result.success) {
          showMessage(`Bank account ${isUpdate ? 'updated' : 'created'} successfully`, 'success');

          // Best practice: post-save re-fetch to display what was persisted and capture latest UpdateCount.
          let refreshed = false;
          try {
            const latestRow = await fetchExistingBankAccountRow({
              bankId,
              ourBranchId: baseBranch,
              accountId: glAccountId,
              operatorId
            });
            if (latestRow) {
              refreshed = !!populateForm(latestRow);
            }

            // Fallback: if helper couldn't extract a row, try the same View request shape.
            if (!refreshed) {
              const viewRequestData = getFormData();
              const svc = window.OtherModulesService;
              const viewResult = (svc && typeof svc.getBankAccount === 'function')
                ? await svc.getBankAccount(viewRequestData)
                : await postOtherModulesOldApi('dbo.p_GetRecBankAccount', viewRequestData);
              if (viewResult?.success) {
                const payload = viewResult.data ?? viewResult.Details ?? null;
                refreshed = !!populateForm(payload);
              }
            }
          } catch (refreshErr) {
            console.warn('[BankAccountMaintenance] Post-save refresh failed; leaving form as-is.', refreshErr);
          }

          const stillHasRecord = refreshed || !!getEl('bankAccountNo')?.value || hasLoadedRecord;
          setMode('view', stillHasRecord);
        } else {
          // Handle specific error messages
          let errorMessage = result.message || 'Save failed';
          let errorType = 'error';
          
          // Check for concurrency conflict
          if (errorMessage.toLowerCase().includes('already done by another user') || 
              errorMessage.toLowerCase().includes('concurrency') ||
              errorMessage.toLowerCase().includes('updatecount')) {
            errorMessage = 'This record was modified by another user. Please refresh and try again.';
            errorType = 'warning';
          }
          
          showMessage(errorMessage, errorType);
        }
      } catch (error) {
        console.error('Error saving:', error);
        showMessage('An error occurred while saving', 'error');
      } finally {
        buttons.save.disabled = false;
        buttons.save.textContent = 'Save';
      }
    });
  }

  if (buttons.cancel) {
    buttons.cancel.addEventListener('click', function() {
      console.log('Cancel clicked');
      
      if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
        clearForm();
        setMode('view', false);
        showMessage('Changes cancelled', 'info');
      }
    });
  }

  if (buttons.refresh) {
    buttons.refresh.addEventListener('click', function () {
      const hasUnsavedContext = formMode === 'add' || formMode === 'edit';
      if (hasUnsavedContext) {
        const ok = confirm('Refresh will discard any unsaved changes. Continue?');
        if (!ok) return;
      }

      window.location.reload();
    });
  }

  // Initialize page
  console.log('Bank Account Maintenance module initialized');
  console.log('OtherModulesService loaded:', !!OtherModulesService);

  // ============================================================================
  // GL ACCOUNT SEARCH PANEL
  // ============================================================================

  function openGLAccountSearchPanel() {
    const modalElement = document.getElementById('glAccountLookupModal');
    if (modalElement && bootstrap && bootstrap.Modal) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
      resetGLAccountSearchPanel();
      // Automatically load all GL accounts when modal opens
      setTimeout(() => performGLAccountSearch(null, true), 100);
    } else {
      console.error('Bootstrap Modal not available or modal element not found');
    }
  }

  function closeGLAccountSearchPanel() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('glAccountLookupModal'));
    if (modal) modal.hide();
  }

  function resetGLAccountSearchPanel() {
    document.getElementById('glAccountSearchId').value = '';
    document.getElementById('glAccountSearchDesc').value = '';
    document.getElementById('glAccountSearchModeId').value = 'Like';
    document.getElementById('glAccountSearchModeDesc').value = 'Like';
    document.getElementById('glAccountSearchResults').innerHTML = '';
    document.getElementById('glAccountSearchEmpty').style.display = 'block';
    document.getElementById('glAccountSearchEmpty').textContent = 'Enter at least one filter above and click Search to query GL accounts.';
    document.getElementById('glAccountSearchLoading').classList.add('d-none');
  }

  async function performGLAccountSearch(event, forceLoadAll = false) {
    if (event) event.preventDefault();
    const idValue = (document.getElementById('glAccountSearchId')?.value || '').trim();
    const descValue = (document.getElementById('glAccountSearchDesc')?.value || '').trim();
    const idMode = document.getElementById('glAccountSearchModeId')?.value || 'Like';
    const descMode = document.getElementById('glAccountSearchModeDesc')?.value || 'Like';
    const results = document.getElementById('glAccountSearchResults');
    const empty = document.getElementById('glAccountSearchEmpty');
    const loading = document.getElementById('glAccountSearchLoading');

    if (results) results.innerHTML = '';
    if (empty) empty.style.display = 'none';
    if (loading) loading.classList.remove('d-none');

    const buildClause = (col, mode, val) => {
      if (!val) return null;
      const safe = val.replace(/'/g, "''");
      return mode === 'Exact' ? `${col} = '${safe}'` : `${col} like '%${safe}%'`;
    };

    // Legacy lookup uses TableID=GLBranchActiveID with AdvFilterString.
    // Filters are applied on AccountID/Description, while branch/currency scope is always included.
    const advClauses = [];
    if (idValue) {
      const idClause = buildClause('AccountID', idMode, idValue);
      if (idClause) advClauses.push(idClause);
    }
    if (descValue) {
      const descClause = buildClause('Description', descMode, descValue);
      if (descClause) advClauses.push(descClause);
    }

    const advFilterUser = advClauses.join(' AND ');

    // Modal-open default behavior calls with forceLoadAll=true and no filters.
    // In that scenario, load all rows for the branch/currency scope.
    const isDefaultLoadAll = forceLoadAll && !advFilterUser;

    // If no filters and not forcing load all, show empty message
    if (!advFilterUser && !forceLoadAll) {
      if (loading) loading.classList.add('d-none');
      if (empty) {
        empty.textContent = 'Enter at least one filter above and click Search to query GL accounts.';
        empty.style.display = 'block';
      }
      return;
    }

    // Execute search against dbo.p_GetSearchResult using TableID=GLBranchActiveID (legacy).
    // This returns the same columns as the screenshot: AccountID, Description, GLAccountTypeID, CurrencyID.
    const runSearch = async (advFilterUserPart) => {
      const operatorId = sessionStorage.getItem('operatorId') || 'web_portal';
      const envBranch = window.Environment?.OurBranchID || window.Environment?.branchId || '';
      const branchId = sessionStorage.getItem('branchId') || document.getElementById('baseBranch')?.value || envBranch || '002';
      const currencyId = sessionStorage.getItem('currencyId') || window.Environment?.CurrencyID || window.Environment?.currencyId || 'ETB';

      // Always scope by branch/currency; then apply user filters.
      // IMPORTANT: Do NOT restrict to GLAccountTypeID='A' here; we sort A-first client-side.
      let advFilter = `CurrencyID = '${currencyId}' AND OurBranchID ='${branchId}'`;
      if (advFilterUserPart) advFilter += ` AND ${advFilterUserPart}`;

      const payload = {
        TableID: 'GLBranchActiveID',
        AdvFilterString: advFilter,
        WhereStmt: '',
        PrevOrNext: 0,
        RefID: '',
        OperatorID: operatorId,
        ModuleID: 8060,
        OurBranchID: branchId,
        SearchKey: '',
        LanguageID: 'en'
      };

      // Preferred path: shared SearchService (loaded by ServiceLoader)
      const service = SearchService;
      let response;
      if (service && typeof service.search === 'function') {
        response = await service.search(payload);
      } else {
        // Fallback: call OldAPI directly via CoreApi (in case SearchService didn't load)
        const CoreApi = window.CoreApi;
        const Environment = window.Environment || {};
        if (!CoreApi || typeof CoreApi.makeRequestEnvelope !== 'function' || typeof CoreApi.post !== 'function') {
          throw new Error('Search service not available');
        }

        const baseUrl = (Environment.baseUrlCommon || Environment.baseUrl || 'http://localhost:8080').replace(/\/+$/, '');
        const endpoint = `${baseUrl}/api/OldAPI`;
        const envelope = CoreApi.makeRequestEnvelope('dbo.p_GetSearchResult', payload);

        // Match the shared SearchService request time format: MM/DD/YYYY HH:mm:ss
        const d = new Date();
        const pad2 = (n) => String(n).padStart(2, '0');
        envelope.RequestTime = `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

        response = await CoreApi.post(endpoint, envelope);
      }

      let rows = response?.Details?.SearchResults || response?.Details || response?.SearchResults || [];
      if (!Array.isArray(rows)) rows = rows ? [rows] : [];
      return rows;
    };

    try {
      const rows = await runSearch(isDefaultLoadAll ? '' : advFilterUser);

      if (!rows.length) {
        if (empty) {
          empty.textContent = 'No GL accounts matched the filters.';
          empty.style.display = 'block';
        }
        return;
      }

      const getGlAccountTypeId = (row) => {
        const raw = (
          row?.GlAccountTypeId ??
          row?.GLAccountTypeID ??
          row?.GLAccountTypeId ??
          row?.AccountTypeID ??
          row?.accountTypeId ??
          row?.AccountType ??
          row?.Type ??
          ''
        );
        return raw.toString().trim().toUpperCase();
      };

      const getAccountIdForSort = (row) => (row?.AccountID || row?.GlAccountId || row?.GLAccountID || '').toString();
      const compareAccountIds = (aId, bId) => {
        const aNum = parseInt(aId, 10);
        const bNum = parseInt(bId, 10);
        if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
        return aId.localeCompare(bId, undefined, { numeric: true, sensitivity: 'base' });
      };

      // Order like the legacy lookup: show all accounts, but group Type=A first.
      const typeARows = [];
      const otherRows = [];
      for (const row of rows) {
        (getGlAccountTypeId(row) === 'A' ? typeARows : otherRows).push(row);
      }

      typeARows.sort((a, b) => compareAccountIds(getAccountIdForSort(a), getAccountIdForSort(b)));
      otherRows.sort((a, b) => compareAccountIds(getAccountIdForSort(a), getAccountIdForSort(b)));

      const orderedRows = typeARows.concat(otherRows);
      if (results) {
        results.innerHTML = orderedRows.map((r, idx) => {
          const accountId = r.AccountID || r.GlAccountId || r.GLAccountID || '';
          const accountName = r.Description || r.AccountName || r.Name || '';
          const glAccountTypeId = r.GLAccountTypeID || r.GlAccountTypeId || r.AccountTypeID || r.AccountType || r.Type || '';
          const currencyId = (r.CurrencyID || r.CurrencyId || r.Currency || r.currencyId || r.currencyID || r.currency || r.CURRENCYID || r.CURRENCY || r.CurrencyCode || r.currencyCode || r.CURRENCY_CODE || r.currency_code || '').trim() || 'ETB';
          return `<tr data-result-index="${idx}" style="cursor: pointer;">
            <td>${accountId}</td>
            <td>${accountName}</td>
            <td>${glAccountTypeId}</td>
            <td>${currencyId}</td>
            <td class="text-end">
              <button type="button" class="btn btn-sm btn-primary" data-result-index="${idx}">Select</button>
            </td>
          </tr>`;
        }).join('');
        results.querySelectorAll('button[data-result-index]').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-result-index'));
            const selectedRow = orderedRows[idx];
            if (selectedRow) {
              selectGLAccount(selectedRow);
            }
          });
        });
        results.querySelectorAll('tr[data-result-index]').forEach(tr => {
          tr.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
              const idx = parseInt(tr.getAttribute('data-result-index'));
              const selectedRow = orderedRows[idx];
              if (selectedRow) {
                selectGLAccount(selectedRow);
              }
            }
          });
        });
      }
    } catch (error) {
      console.error('GL Account search error:', error);
      if (empty) {
        empty.textContent = `Search failed: ${error.message}`;
        empty.style.display = 'block';
      }
    } finally {
      if (loading) loading.classList.add('d-none');
    }
  }

  function selectGLAccount(glAccount) {
    const accountId = glAccount.AccountID || glAccount.GlAccountId || glAccount.GLAccountID || '';
    const accountName = glAccount.Description || glAccount.AccountName || glAccount.Name || '';
    document.getElementById('glAccountId').value = accountId;
    document.getElementById('glAccountDescription').value = accountName;

    closeGLAccountSearchPanel();
    showMessage(`GL Account ID - ${accountId} Description - ${accountName}`, 'success');
  }

  /**
   * Lookup modal handler
   */
  function handleLookup() {
    openGLAccountSearchPanel();
  }

  // ============================================================================
  // BRANCH SEARCH PANEL
  // ============================================================================

  function openBranchSearchPanel() {
    const modalElement = document.getElementById('branchLookupModal');
    if (modalElement && bootstrap && bootstrap.Modal) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
      resetBranchSearchPanel();
      // Automatically load all branches when modal opens
      setTimeout(() => performBranchSearch(null, true), 100);
    } else {
      console.error('Bootstrap Modal not available or modal element not found');
    }
  }

  function closeBranchSearchPanel() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('branchLookupModal'));
    if (modal) modal.hide();
  }

  function resetBranchSearchPanel() {
    document.getElementById('branchSearchId').value = '';
    document.getElementById('branchSearchName').value = '';
    document.getElementById('branchSearchModeId').value = 'Like';
    document.getElementById('branchSearchModeName').value = 'Like';
    document.getElementById('branchSearchResults').innerHTML = '';
    document.getElementById('branchSearchEmpty').style.display = 'block';
    document.getElementById('branchSearchEmpty').textContent = 'Enter at least one filter above and click Search to query branches.';
    document.getElementById('branchSearchLoading').classList.add('d-none');
  }

  async function performBranchSearch(event, forceLoadAll = false) {
    if (event) event.preventDefault();
    const idValue = (document.getElementById('branchSearchId')?.value || '').trim();
    const nameValue = (document.getElementById('branchSearchName')?.value || '').trim();
    const idMode = document.getElementById('branchSearchModeId')?.value || 'Like';
    const nameMode = document.getElementById('branchSearchModeName')?.value || 'Like';
    const results = document.getElementById('branchSearchResults');
    const empty = document.getElementById('branchSearchEmpty');
    const loading = document.getElementById('branchSearchLoading');

    if (results) results.innerHTML = '';
    if (empty) empty.style.display = 'none';
    if (loading) loading.classList.remove('d-none');

    const clauses = [];
    const buildClause = (col, mode, val) => {
      if (!val) return null;
      const safe = val.replace(/'/g, "''");
      return mode === 'Exact' ? `${col} = '${safe}'` : `${col} like '%${safe}%'`;
    };

    // NOTE: The p_GetSearchResult dataset for branches in this deployment exposes
    // OurBranchID + BranchName (see SearchService response). Referencing unknown
    // columns in WhereStmt causes the server-side dynamic SQL to fail.
    // Also, some DBs store ids without leading zeros (101 vs 0101).
    if (idValue) {
      const normalizedNumeric = /^0+\d+$/.test(idValue) ? String(parseInt(idValue, 10)) : null;
      const idOr = [];

      const c = buildClause('OurBranchID', idMode, idValue);
      if (c) idOr.push(c);
      if (normalizedNumeric && normalizedNumeric !== idValue) {
        const c2 = buildClause('OurBranchID', idMode, normalizedNumeric);
        if (c2) idOr.push(c2);
      }

      if (idOr.length === 1) clauses.push(idOr[0]);
      if (idOr.length > 1) clauses.push(`(${idOr.join(' OR ')})`);
    }

    if (nameValue) {
      const c1 = buildClause('BranchName', nameMode, nameValue);
      if (c1) clauses.push(c1);
    }

    const whereStmt = clauses.join(' AND ');

    // If no filters and not forcing load all, show empty message
    if (!whereStmt && !forceLoadAll) {
      if (empty) {
        empty.textContent = 'Enter at least one filter above and click Search to query branches.';
        empty.style.display = 'block';
      }
      if (loading) loading.classList.add('d-none');
      return;
    }

    // For loading all branches, use a condition that matches everything
    const finalWhereStmt = forceLoadAll && !whereStmt ? '1=1' : whereStmt;

    const operatorId = sessionStorage.getItem('operatorId') || 'web_portal';
    const env = window.Environment || {};
    // Use the user's current branch context for request metadata, not as a filter.
    // Avoid defaulting to a hard-coded branch (e.g., '002') which can hide valid branches like 0101.
    const branchScope = sessionStorage.getItem('branchId') || env.defaultOurBranchId || env.OurBranchID || '';

    const makePayload = (ourBranchId) => ({
      TableID: 'BranchID',
      WhereStmt: finalWhereStmt,
      AdvFilterString: '',
      PrevOrNext: '0',
      RefID: '',
      OperatorID: operatorId,
      ModuleID: 1000,
      OurBranchID: ourBranchId
    });

    // For list/search, avoid accidentally filtering out branches (e.g., hiding 0101).
    // Try without OurBranchID first (broadest), then retry with the user's branch context if required.
    const primaryPayload = makePayload('');
    const fallbackPayload = makePayload(branchScope);

    try {
      const runSearch = async (p) => {
        // Preferred path: shared SearchService (loaded by ServiceLoader)
        const service = SearchService;
        let response;
        if (service && typeof service.search === 'function') {
          response = await service.search(p);
        } else {
        // Fallback: call OldAPI directly via CoreApi (in case SearchService didn't load)
        const CoreApi = window.CoreApi;
        const Environment = window.Environment || {};
        if (!CoreApi || typeof CoreApi.makeRequestEnvelope !== 'function' || typeof CoreApi.post !== 'function') {
          throw new Error('Search service not available');
        }

        const baseUrl = (Environment.baseUrlCommon || Environment.baseUrl || 'http://localhost:8080').replace(/\/+$/, '');
        const endpoint = `${baseUrl}/api/OldAPI`;
        const envelope = CoreApi.makeRequestEnvelope('dbo.p_GetSearchResult', p);

        const d = new Date();
        const pad2 = (n) => String(n).padStart(2, '0');
        envelope.RequestTime = `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

        response = await CoreApi.post(endpoint, envelope);
        }

        let rows =
          response?.Details?.SearchResults ||
          response?.data?.Details?.SearchResults ||
          response?.data?.SearchResults ||
          response?.SearchResults ||
          response?.Details ||
          response?.data?.Details ||
          response?.data ||
          [];

        // Some implementations wrap results as { SearchResults: [...] }
        if (rows && !Array.isArray(rows) && Array.isArray(rows.SearchResults)) {
          rows = rows.SearchResults;
        }

        if (!Array.isArray(rows)) rows = rows ? [rows] : [];
        return rows;
      };

      // First try broad search (OurBranchID=''), then fall back to branch-scoped.
      let rows = await runSearch(primaryPayload);
      if ((!rows || rows.length === 0) && branchScope) {
        rows = await runSearch(fallbackPayload);
      }

      if (!Array.isArray(rows)) rows = rows ? [rows] : [];
      if (!rows.length) {
        if (empty) {
          empty.textContent = 'No branches matched the filters.';
          empty.style.display = 'block';
        }
        return;
      }
      
      // Sort rows by branch id ascending (0101, 0102, 0103... 6708, 6709...)
      console.log('[BankAccountMaintenance] Before sort:', rows.map(r => r.OurBranchID));
      
      rows.sort((a, b) => {
        const aId = String(a.OurBranchID || a.OurBranchId || a.BranchID || a.BranchId || a.BranchCode || a.Branch || '0').trim();
        const bId = String(b.OurBranchID || b.OurBranchId || b.BranchID || b.BranchId || b.BranchCode || b.Branch || '0').trim();
        
        // Convert to numbers for proper numeric sorting
        const aNum = parseInt(aId, 10) || 0;
        const bNum = parseInt(bId, 10) || 0;
        
        return aNum - bNum;
      });
      
      console.log('[BankAccountMaintenance] After sort:', rows.map(r => r.OurBranchID));
      
      if (results) {
        results.innerHTML = rows.map((r, idx) => {
          const branchId = r.OurBranchID || r.OurBranchId || r.BranchID || r.BranchId || r.BranchCode || r.Branch || '';
          const branchName = r.BranchName || r.Name || '';
          return `<tr data-result-index="${idx}" style="cursor: pointer;">
            <td>${branchId}</td>
            <td>${branchName}</td>
            <td class="text-end">
              <button type="button" class="btn btn-sm btn-primary" data-result-index="${idx}">Select</button>
            </td>
          </tr>`;
        }).join('');
        // Add click handlers for rows and buttons
        results.querySelectorAll('tr[data-result-index]').forEach(row => {
          row.addEventListener('click', () => {
            const idx = parseInt(row.dataset.resultIndex);
            selectBranch(rows[idx]);
          });
        });
        results.querySelectorAll('button[data-result-index]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.resultIndex);
            selectBranch(rows[idx]);
          });
        });
      }
    } catch (error) {
      console.error('Branch search error:', error);
      if (empty) {
        empty.textContent = `Search failed: ${error.message}`;
        empty.style.display = 'block';
      }
    } finally {
      if (loading) loading.classList.add('d-none');
    }
  }

  function selectBranch(branch) {
    const branchId = branch.OurBranchID || branch.OurBranchId || branch.BranchID || branch.BranchId || branch.BranchCode || branch.Branch || '';
    const branchName = branch.BranchName || branch.Name || '';
    document.getElementById('baseBranch').value = branchId;
    document.getElementById('baseBranchDescription').value = branchName;

    closeBranchSearchPanel();
    showMessage(`Branch ID - ${branchId} Description - ${branchName}`, 'success');
  }

  /**
   * Branch lookup modal handler
   */
  function handleBranchLookup() {
    openBranchSearchPanel();
  }

  // Make functions globally available
  window.handleBranchLookup = handleBranchLookup;
  window.openBranchSearchPanel = openBranchSearchPanel;
  window.closeBranchSearchPanel = closeBranchSearchPanel;
  window.resetBranchSearchPanel = resetBranchSearchPanel;
  window.performBranchSearch = performBranchSearch;
  window.selectBranch = selectBranch;

  // Wire up Branch search modal
  document.getElementById('branchLookupForm')?.addEventListener('submit', performBranchSearch);
  document.getElementById('branchSearchReset')?.addEventListener('click', resetBranchSearchPanel);
  document.getElementById('branchSearchRefresh')?.addEventListener('click', () => {
    resetBranchSearchPanel();
    performBranchSearch(null, true);
  });
  document.getElementById('branchSearchCancel')?.addEventListener('click', closeBranchSearchPanel);

  // Make functions globally available
  window.handleLookup = handleLookup;
  window.openGLAccountSearchPanel = openGLAccountSearchPanel;
  window.closeGLAccountSearchPanel = closeGLAccountSearchPanel;
  window.resetGLAccountSearchPanel = resetGLAccountSearchPanel;
  window.performGLAccountSearch = performGLAccountSearch;
  window.selectGLAccount = selectGLAccount;

  // Wire up GL Account search modal
  document.getElementById('glAccountLookupForm')?.addEventListener('submit', performGLAccountSearch);
  document.getElementById('glAccountSearchReset')?.addEventListener('click', resetGLAccountSearchPanel);
  document.getElementById('glAccountSearchRefresh')?.addEventListener('click', () => {
    resetGLAccountSearchPanel();
    performGLAccountSearch();
  });
  document.getElementById('glAccountSearchCancel')?.addEventListener('click', closeGLAccountSearchPanel);

  // NOTE: Removed legacy Base Branch inline-search handler (baseBranchSearchBtn).
  // Branch selection is handled via the Branch Lookup Modal.

  }, 100); // End of setTimeout for DOM initialization

})();

// Handle lookup buttons (outside setTimeout to ensure Bootstrap is loaded)
function bamClosest(evtTarget, selector) {
  if (!evtTarget) return null;
  if (evtTarget instanceof Element) return evtTarget.closest(selector);
  // Clicks can rarely originate from non-Element nodes; try parentElement.
  const parent = evtTarget.parentElement;
  return parent ? parent.closest(selector) : null;
}

function bamOpenModal(modalId) {
  try {
    const el = document.getElementById(modalId);
    if (!el) return false;
    if (!window.bootstrap || !window.bootstrap.Modal) {
      console.error('[BankAccountMaintenance] Bootstrap Modal not available');
      return false;
    }
    const modal = new window.bootstrap.Modal(el);
    modal.show();
    return true;
  } catch (err) {
    console.error('[BankAccountMaintenance] Failed to open modal:', err);
    return false;
  }
}

document.addEventListener('click', function (e) {
  const lookupBtn = bamClosest(e.target, '.btn-lookup');
  if (lookupBtn) {
    const label = lookupBtn.getAttribute('aria-label') || '';
    if (label === 'Lookup GL Account') {
      if (typeof window.handleLookup === 'function') {
        window.handleLookup();
      } else {
        // Fallback: open modal even if module init/services failed
        bamOpenModal('glAccountLookupModal');
      }
      return;
    }
    if (label === 'Lookup Base Branch') {
      if (typeof window.handleBranchLookup === 'function') {
        window.handleBranchLookup();
      } else {
        bamOpenModal('branchLookupModal');
      }
      return;
    }
  }

  // If init didn't run, action buttons will not be wired.
  const actionBtn = bamClosest(e.target, '#viewBtn, #addBtn, #editBtn, #deleteBtn, #saveBtn, #cancelBtn, #synchronizeBtn');
  if (actionBtn && !window.__bankAccountMaintenanceInit) {
    console.warn('[BankAccountMaintenance] Module initialization did not complete; action handlers may not be wired. Open via http(s) server, not file://');
  }
});
