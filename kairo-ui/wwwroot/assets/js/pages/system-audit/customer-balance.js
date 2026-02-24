(async function () {
  const global = window;
  const { ServiceLoader } = global;

  if (!ServiceLoader) {
    console.error('[CustomerBalance] ServiceLoader missing. Did you include services/shared/serviceLoader.js?');
    return;
  }

  await ServiceLoader.loadCore();
  await ServiceLoader.loadCustomerBalanceService();
  await ServiceLoader.loadSystemBranchesService();

  const CustomerBalanceService = global.CustomerBalanceService;
  const SystemBranchesService = global.SystemBranchesService;

  const LOG_PREFIX = '[CustomerBalance]';

  // Global parameter (NOT the same as BranchID)
  const BANK_ID = '00';

  const gridState = {
    allRows: [],
    filteredRows: [],
    query: '',
    pageSize: 10,
    pageIndex: 0,
    pageRows: [],
    selectedIds: new Set()
  };

  const branchLookupState = {
    rows: null,
    loadingPromise: null
  };

  function getOperatorId() {
    try {
      const session = global.AuthService?.getSession?.();
      return session?.operatorId || session?.operatorID || session?.name || 'web_portal';
    } catch {
      return 'web_portal';
    }
  }

  function readValue(id) {
    const el = document.getElementById(id);
    return el?.value?.trim?.() || '';
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value == null ? '' : String(value);
  }

  function setBranchName(value) {
    // Support both IDs: user asked branchNameid, HTML currently uses branchNameID.
    const el = document.getElementById('branchNameID') || document.getElementById('branchNameid');
    if (!el) return;
    el.value = value == null ? '' : String(value);
  }

  function setDisabled(selectorOrEl, disabled) {
    const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
    if (el) el.disabled = !!disabled;
  }

  function syncAllProductsUI() {
    const allProductsCheckbox = document.getElementById('allProducts');
    const productIdInput = document.getElementById('productId');
    const productSearchButton = document.querySelector('[data-role="product-search"]');
    if (!allProductsCheckbox || !productIdInput) return;

    const isAll = !!allProductsCheckbox.checked;
    productIdInput.disabled = isAll;
    if (productSearchButton) productSearchButton.disabled = isAll;
    if (isAll) productIdInput.value = '';
  }

  function parseYear(value) {
    // Accept "2025" or "2024,2025"; send first year for now.
    const token = String(value || '').split(',')[0].trim();
    if (!token) return '';
    const num = Number(token);
    return Number.isFinite(num) ? num : token;
  }

  function setYearsError(message) {
    const el = document.getElementById('yearsError');
    if (el) el.textContent = message || '';
  }

  function validateYears({ report = false } = {}) {
    const input = document.getElementById('years');
    if (!input) return true;

    const raw = String(input.value || '').trim();
    setYearsError('');

    if (!raw) {
      input.setCustomValidity('');
      return true;
    }

    if (!/^\d{4}$/.test(raw)) {
      input.setCustomValidity('Enter a 4-digit year (YYYY).');
      setYearsError('Enter a 4-digit year (YYYY).');
      if (report) input.reportValidity();
      return false;
    }

    const year = Number(raw);
    if (!Number.isFinite(year) || year < 2000 || year > 2050) {
      input.setCustomValidity('Year must be between 2000 and 2050.');
      setYearsError('Year must be between 2000 and 2050.');
      if (report) input.reportValidity();
      return false;
    }

    input.setCustomValidity('');
    return true;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function formatLegacyDateTime(date = new Date()) {
    const mm = pad2(date.getMonth() + 1);
    const dd = pad2(date.getDate());
    const yyyy = String(date.getFullYear());
    const hh = pad2(date.getHours());
    const min = pad2(date.getMinutes());
    const ss = pad2(date.getSeconds());
    return `${mm}/${dd}/${yyyy} ${hh}:${min}:${ss}`;
  }

  function safe(value) {
    return value == null ? '' : String(value);
  }

  function tryParseNumber(value) {
    if (value == null) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;

    const raw = String(value).trim();
    if (!raw) return null;

    // Support negatives like (123.45)
    const isParenNegative = /^\(.*\)$/.test(raw);
    const withoutParens = isParenNegative ? raw.slice(1, -1) : raw;

    // Keep digits, dot, comma, minus
    let cleaned = withoutParens.replace(/[^0-9,.-]/g, '');
    if (!cleaned) return null;

    // If we have commas but no dot, treat comma as decimal separator.
    if (cleaned.includes(',') && !cleaned.includes('.')) {
      cleaned = cleaned.replace(/,/g, '.');
    } else {
      // Otherwise, treat commas as thousand separators.
      cleaned = cleaned.replace(/,/g, '');
    }

    const num = Number.parseFloat(cleaned);
    if (!Number.isFinite(num)) return null;
    return isParenNegative ? -Math.abs(num) : num;
  }

  function format2(value) {
    const num = tryParseNumber(value);
    if (num == null) return safe(value);
    try {
      return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    } catch {
      return num.toFixed(2);
    }
  }

  function pickByKey(row, candidates = []) {
    for (const key of candidates) {
      if (row && Object.prototype.hasOwnProperty.call(row, key) && row[key] != null && row[key] !== '') {
        return row[key];
      }
    }
    return '';
  }

  function pickByKeyRegex(row, regex) {
    if (!row) return '';
    for (const key of Object.keys(row)) {
      if (regex.test(key) && row[key] != null && row[key] !== '') return row[key];
    }
    return '';
  }

  function extractAccountId(row) {
    return safe(
      pickByKey(row, ['AccountID', 'AccountId', 'accountId', 'accountID', 'AcctID', 'AcctId', 'AccountNo', 'AccountNumber']) ||
        pickByKeyRegex(row, /(account).*id/i)
    ).trim();
  }

  function extractNewBalanceRaw(row) {
    return (
      pickByKey(row, ['NewBalance', 'CurrentBalance', 'Balance', 'NewBal', 'ClosingBalance', 'BalanceAfter']) ||
      pickByKeyRegex(row, /(new|current|closing).*bal/i)
    );
  }

  function extractPrevBalanceRaw(row) {
    return (
      pickByKey(row, ['PreviousBalance', 'PrevBalance', 'OldBalance', 'PrevBal', 'OpeningBalance', 'BalanceBefore']) ||
      pickByKeyRegex(row, /(prev|previous|old|opening).*bal/i)
    );
  }

  function extractAccountTypeId(row) {
    const value =
      pickByKey(row, ['SystemSubID', 'SystemSubId', 'AccountTypeID', 'AccountTypeId', 'AccountType', 'AcctTypeID', 'AcctTypeId']) ||
      pickByKeyRegex(row, /(system).*sub.*id/i);
    return safe(value).trim();
  }

  function escapeXml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function buildCorrectionEntriesXml(rows) {
    const list = Array.isArray(rows) ? rows : [];
    return list
      .map((row) => {
        const accountId = extractAccountId(row);
        if (!accountId) return '';

        const prevBalRaw = extractPrevBalanceRaw(row);
        const prevBalNum = tryParseNumber(prevBalRaw);
        const prevBalance = prevBalNum == null ? String(prevBalRaw ?? '').trim() : String(prevBalNum);
        if (!String(prevBalance).trim()) return '';

        const newBalRaw = extractNewBalanceRaw(row);
        const newBalNum = tryParseNumber(newBalRaw);
        const newBalance = newBalNum == null ? String(newBalRaw ?? '').trim() : String(newBalNum);
        if (!String(newBalance).trim()) return '';
        return (
          '<dt_CorrectionEntries>' +
          `<AccountID>${escapeXml(accountId)}</AccountID>` +
          `<PrevBalance>${escapeXml(prevBalance)}</PrevBalance>` +
          `<NewBalance>${escapeXml(newBalance)}</NewBalance>` +
          '</dt_CorrectionEntries>'
        );
      })
      .filter(Boolean)
      .join('');
  }

  function normalizeRows(result) {
    const data = result?.data;
    if (Array.isArray(data)) return data;

    function parseDetailRecordsXml(detailRecordsXml) {
      const xml = String(detailRecordsXml || '').trim();
      if (!xml) return [];

      const wrapped = /<\s*DetailRecords\b/i.test(xml) ? xml : `<DetailRecords>${xml}</DetailRecords>`;

      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(wrapped, 'text/xml');
        const parseError = doc.getElementsByTagName('parsererror')[0];
        if (parseError) {
          console.warn(`${LOG_PREFIX} DetailRecords XML parse error`, parseError?.textContent);
          return [];
        }

        const root = doc.getElementsByTagName('DetailRecords')[0] || doc.documentElement;
        if (!root) return [];

        const rows = [];
        const children = Array.from(root.children || []);
        for (const rowEl of children) {
          const row = {};
          for (const fieldEl of Array.from(rowEl.children || [])) {
            const key = fieldEl.tagName;
            const value = (fieldEl.textContent || '').trim();
            row[key] = value;
          }
          if (Object.keys(row).length) rows.push(row);
        }
        return rows;
      } catch (err) {
        console.warn(`${LOG_PREFIX} DetailRecords XML parse failed`, err);
        return [];
      }
    }

    // Some OldAPI responses return rows under DetailRecords.
    if (data && Array.isArray(data.DetailRecords)) {
      console.log(`${LOG_PREFIX} Using data.DetailRecords for grid rows`);
      return data.DetailRecords;
    }
    if (data && typeof data.DetailRecords === 'string') {
      const rows = parseDetailRecordsXml(data.DetailRecords);
      if (rows.length) {
        console.log(`${LOG_PREFIX} Using parsed data.DetailRecords XML for grid rows`);
        return rows;
      }
    }
    if (data && Array.isArray(data.DetailsRecords)) {
      console.log(`${LOG_PREFIX} Using data.DetailsRecords for grid rows`);
      return data.DetailsRecords;
    }
    if (data && typeof data.DetailsRecords === 'string') {
      const rows = parseDetailRecordsXml(data.DetailsRecords);
      if (rows.length) {
        console.log(`${LOG_PREFIX} Using parsed data.DetailsRecords XML for grid rows`);
        return rows;
      }
    }

    // CoreApi.normalizeResponse can return full payload for multi-details responses.
    // For Customer Balance, Details01 contains the grid rows; Details is metadata.
    if (data && Array.isArray(data.Details01)) {
      console.log(`${LOG_PREFIX} Using data.Details01 for grid rows`);
      return data.Details01;
    }
    if (data && Array.isArray(data.Details02)) {
      console.log(`${LOG_PREFIX} Using data.Details02 for grid rows`);
      return data.Details02;
    }
    if (data && Array.isArray(data.Details)) {
      console.log(`${LOG_PREFIX} Using data.Details for grid rows (fallback)`);
      return data.Details;
    }

    if (Array.isArray(result?.Details01)) {
      console.log(`${LOG_PREFIX} Using result.Details01 for grid rows`);
      return result.Details01;
    }
    if (Array.isArray(result?.DetailRecords)) {
      console.log(`${LOG_PREFIX} Using result.DetailRecords for grid rows`);
      return result.DetailRecords;
    }
    if (typeof result?.DetailRecords === 'string') {
      const rows = parseDetailRecordsXml(result.DetailRecords);
      if (rows.length) {
        console.log(`${LOG_PREFIX} Using parsed result.DetailRecords XML for grid rows`);
        return rows;
      }
    }
    if (Array.isArray(result?.Details)) {
      console.log(`${LOG_PREFIX} Using result.Details for grid rows (fallback)`);
      return result.Details;
    }
    return [];
  }

  function renderTable(rows) {
    const tbody = document.querySelector('.data-table tbody');
    if (!tbody) return;

    if (!rows || rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="no-records">No records to display.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map((row) => {
        const accountId = extractAccountId(row);

        const isSelected = accountId ? gridState.selectedIds.has(String(accountId)) : false;

        const name = safe(
          pickByKey(row, ['Name', 'CustomerName', 'Customer', 'AccountName', 'ClientName', 'Client']) ||
          pickByKeyRegex(row, /(name)$/i)
        );

        const prevBal = format2(
          pickByKey(row, ['PreviousBalance', 'PrevBalance', 'OldBalance', 'PrevBal', 'OpeningBalance', 'BalanceBefore']) ||
          pickByKeyRegex(row, /(prev|previous|old|opening).*bal/i)
        );

        const newBal = format2(
          extractNewBalanceRaw(row)
        );

        const diff = format2(
          pickByKey(row, ['Differences', 'Difference', 'Diff', 'Variance']) ||
          pickByKeyRegex(row, /(diff|variance)/i)
        );

        return `
          <tr>
            <td class="checkbox-col"><input type="checkbox" data-role="row-select" data-account-id="${escapeXml(accountId)}" ${isSelected ? 'checked' : ''}></td>
            <td>${accountId}</td>
            <td>${name}</td>
            <td class="num">${prevBal}</td>
            <td class="num">${newBal}</td>
            <td class="num">${diff}</td>
          </tr>`;
      })
      .join('');

    // Bind selection events after each render.
    bindGridSelection();
  }

  function bindGridSelection() {
    const table = document.querySelector('.data-table');
    if (!table) return;

    const headerSelectAll = table.querySelector('thead input[type="checkbox"]');
    const rowChecks = Array.from(table.querySelectorAll('tbody input[type="checkbox"][data-role="row-select"]'));

    // Update header checkbox state based on visible rows.
    if (headerSelectAll) {
      const totalVisible = rowChecks.length;
      const checkedVisible = rowChecks.filter((c) => c.checked).length;
      headerSelectAll.checked = totalVisible > 0 && checkedVisible === totalVisible;
      headerSelectAll.indeterminate = checkedVisible > 0 && checkedVisible < totalVisible;

      if (headerSelectAll.dataset.cbBound !== '1') {
        headerSelectAll.dataset.cbBound = '1';
        headerSelectAll.addEventListener('change', () => {
          const wantChecked = !!headerSelectAll.checked;
          for (const cb of rowChecks) {
            cb.checked = wantChecked;
            const id = cb.getAttribute('data-account-id') || '';
            if (!id) continue;
            if (wantChecked) gridState.selectedIds.add(id);
            else gridState.selectedIds.delete(id);
          }
          // Recompute indeterminate
          headerSelectAll.indeterminate = false;
        });
      }
    }

    for (const cb of rowChecks) {
      if (cb.dataset.cbBound === '1') continue;
      cb.dataset.cbBound = '1';
      cb.addEventListener('change', () => {
        const id = cb.getAttribute('data-account-id') || '';
        if (!id) return;
        if (cb.checked) gridState.selectedIds.add(id);
        else gridState.selectedIds.delete(id);

        // Update header state
        if (headerSelectAll) {
          const checkedVisible = rowChecks.filter((c) => c.checked).length;
          headerSelectAll.checked = rowChecks.length > 0 && checkedVisible === rowChecks.length;
          headerSelectAll.indeterminate = checkedVisible > 0 && checkedVisible < rowChecks.length;
        }
      });
    }
  }

  function getGridEls() {
    return {
      search: document.querySelector('[data-role="grid-search"]'),
      pageSize: document.querySelector('[data-role="page-size"]'),
      prev: document.querySelector('[data-role="page-prev"]'),
      next: document.querySelector('[data-role="page-next"]'),
      info: document.querySelector('[data-role="page-info"]')
    };
  }

  function rowToSearchText(row) {
    if (!row || typeof row !== 'object') return '';
    try {
      return Object.values(row)
        .map((v) => {
          if (v == null) return '';
          if (typeof v === 'string') return v;
          if (typeof v === 'number' || typeof v === 'boolean') return String(v);
          return '';
        })
        .join(' ')
        .toLowerCase();
    } catch {
      return '';
    }
  }

  function applyGridFilter() {
    const q = String(gridState.query || '').trim().toLowerCase();
    if (!q) {
      gridState.filteredRows = Array.isArray(gridState.allRows) ? gridState.allRows.slice() : [];
      return;
    }
    gridState.filteredRows = (gridState.allRows || []).filter((r) => rowToSearchText(r).includes(q));
  }

  function getTotalPages() {
    const size = Number(gridState.pageSize) || 10;
    const total = gridState.filteredRows?.length || 0;
    return Math.max(1, Math.ceil(total / size));
  }

  function renderGrid() {
    applyGridFilter();

    const total = gridState.filteredRows?.length || 0;
    const size = Number(gridState.pageSize) || 10;
    const pages = getTotalPages();
    const pageIndex = Math.min(Math.max(0, gridState.pageIndex), pages - 1);
    gridState.pageIndex = pageIndex;

    const start = pageIndex * size;
    const end = start + size;
    const pageRows = (gridState.filteredRows || []).slice(start, end);

    gridState.pageRows = pageRows;

    renderTable(pageRows);

    const els = getGridEls();
    if (els.info) els.info.textContent = `Page ${pageIndex + 1} of ${pages} (${total} rows)`;
    if (els.prev) els.prev.disabled = pageIndex <= 0;
    if (els.next) els.next.disabled = pageIndex >= pages - 1;
  }

  function setGridRows(rows) {
    gridState.allRows = Array.isArray(rows) ? rows : [];
    gridState.pageIndex = 0;
    renderGrid();
  }

  function resetGridUI() {
    gridState.allRows = [];
    gridState.filteredRows = [];
    gridState.query = '';
    gridState.pageIndex = 0;
    gridState.pageRows = [];
    gridState.selectedIds = new Set();

    const els = getGridEls();
    if (els.search) els.search.value = '';
    renderGrid();
  }

  function clearFormFields() {
    setValue('branchId', '');
    setBranchName('');
    setValue('productId', '');
    setValue('productName', '');
    setValue('years', '');

    const allProductsCheckbox = document.getElementById('allProducts');
    if (allProductsCheckbox) allProductsCheckbox.checked = true;
    syncAllProductsUI();
  }

  function renderLoading() {
    const tbody = document.querySelector('.data-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="no-records">Loading...</td></tr>';
  }

  function normalizeFirstRow(result) {
    const data = result?.data;
    const pick = (arr) => (Array.isArray(arr) && arr.length ? arr[0] : null);

    const parseDetailRecordsXml = (detailRecordsXml) => {
      const xml = String(detailRecordsXml || '').trim();
      if (!xml) return [];
      const wrapped = /<\s*DetailRecords\b/i.test(xml) ? xml : `<DetailRecords>${xml}</DetailRecords>`;
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(wrapped, 'text/xml');
        const parseError = doc.getElementsByTagName('parsererror')[0];
        if (parseError) return [];
        const root = doc.getElementsByTagName('DetailRecords')[0] || doc.documentElement;
        if (!root) return [];
        const rows = [];
        for (const rowEl of Array.from(root.children || [])) {
          const row = {};
          for (const fieldEl of Array.from(rowEl.children || [])) {
            row[fieldEl.tagName] = (fieldEl.textContent || '').trim();
          }
          if (Object.keys(row).length) rows.push(row);
        }
        return rows;
      } catch {
        return [];
      }
    };

    if (Array.isArray(data)) return pick(data);
    if (data && Array.isArray(data.DetailRecords)) return pick(data.DetailRecords);
    if (data && typeof data.DetailRecords === 'string') return pick(parseDetailRecordsXml(data.DetailRecords));
    if (data && Array.isArray(data.DetailsRecords)) return pick(data.DetailsRecords);
    if (data && typeof data.DetailsRecords === 'string') return pick(parseDetailRecordsXml(data.DetailsRecords));
    if (data && Array.isArray(data.Details01)) return pick(data.Details01);
    if (data && Array.isArray(data.Details)) return pick(data.Details);
    if (Array.isArray(result?.Details01)) return pick(result.Details01);
    if (Array.isArray(result?.DetailRecords)) return pick(result.DetailRecords);
    if (typeof result?.DetailRecords === 'string') return pick(parseDetailRecordsXml(result.DetailRecords));
    if (Array.isArray(result?.Details)) return pick(result.Details);
    return null;
  }

  function normalizeBranchRows(result) {
    const data = result?.data;
    if (Array.isArray(data)) return data;

    const parseDetailRecordsXml = (detailRecordsXml) => {
      const xml = String(detailRecordsXml || '').trim();
      if (!xml) return [];
      const wrapped = /<\s*DetailRecords\b/i.test(xml) ? xml : `<DetailRecords>${xml}</DetailRecords>`;
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(wrapped, 'text/xml');
        const parseError = doc.getElementsByTagName('parsererror')[0];
        if (parseError) return [];
        const root = doc.getElementsByTagName('DetailRecords')[0] || doc.documentElement;
        if (!root) return [];
        const rows = [];
        for (const rowEl of Array.from(root.children || [])) {
          const row = {};
          for (const fieldEl of Array.from(rowEl.children || [])) {
            row[fieldEl.tagName] = (fieldEl.textContent || '').trim();
          }
          if (Object.keys(row).length) rows.push(row);
        }
        return rows;
      } catch {
        return [];
      }
    };

    if (data && Array.isArray(data.DetailRecords)) return data.DetailRecords;
    if (data && typeof data.DetailRecords === 'string') return parseDetailRecordsXml(data.DetailRecords);
    if (data && Array.isArray(data.DetailsRecords)) return data.DetailsRecords;
    if (data && typeof data.DetailsRecords === 'string') return parseDetailRecordsXml(data.DetailsRecords);

    // Prefer Details01 if present
    if (data && Array.isArray(data.Details01)) return data.Details01;
    if (data && Array.isArray(data.Details)) return data.Details;
    if (Array.isArray(result?.Details01)) return result.Details01;
    if (Array.isArray(result?.DetailRecords)) return result.DetailRecords;
    if (typeof result?.DetailRecords === 'string') return parseDetailRecordsXml(result.DetailRecords);
    if (Array.isArray(result?.Details)) return result.Details;
    return [];
  }

  function findBranchRowById(rows, branchId) {
    const wanted = String(branchId || '').trim();
    if (!wanted) return null;
    const candidates = ['BranchID', 'BranchId', 'OurBranchID', 'OurBranchId', 'BranchCode', 'Code', 'ID', 'Id'];

    for (const row of rows || []) {
      for (const key of candidates) {
        if (row && row[key] != null && String(row[key]).trim() === wanted) return row;
      }
      // fallback: try any key matching branch.*id
      if (row) {
        for (const key of Object.keys(row)) {
          if (/(branch).*id/i.test(key) && row[key] != null && String(row[key]).trim() === wanted) return row;
        }
      }
    }
    return null;
  }

  function extractBranchName(row) {
    if (!row) return '';
    return (
      row.BranchName ??
      row.Branch ??
      row.BankName ??
      row.Name ??
      row.OurBranchName ??
      row.OurBranch ??
      ''
    );
  }

  async function fetchBranchName() {
    const branchId = readValue('branchId');
    if (!branchId) {
      setBranchName('');
      return;
    }
    if (!SystemBranchesService?.searchSystemBranches) {
      console.warn(`${LOG_PREFIX} SystemBranchesService not loaded; cannot lookup branch name.`);
      return;
    }

    // Load/cached branch list for the global BANK_ID, then map BranchID -> BranchName.
    if (!branchLookupState.rows) {
      if (!branchLookupState.loadingPromise) {
        console.groupCollapsed(`${LOG_PREFIX} Branch list -> dbo.pc_SearchSystemBranches`);
        console.log('BankID (global)', BANK_ID);
        branchLookupState.loadingPromise = SystemBranchesService
          .searchSystemBranches({ BankID: BANK_ID })
          .then((result) => {
            console.log('Raw result', result);
            if (!result?.success) {
              console.error(`${LOG_PREFIX} Branch list fetch failed`, result);
              return [];
            }
            const rows = normalizeBranchRows(result);
            console.log(`${LOG_PREFIX} Branch list rows`, rows?.length ?? 0);
            return rows;
          })
          .catch((err) => {
            console.error(`${LOG_PREFIX} Branch list fetch error`, err);
            return [];
          })
          .finally(() => {
            console.groupEnd();
          });
      }

      branchLookupState.rows = await branchLookupState.loadingPromise;
      branchLookupState.loadingPromise = null;
    }

    console.groupCollapsed(`${LOG_PREFIX} BranchID -> BranchName mapping`);
    console.log('BranchID (typed)', branchId);
    console.log('BankID (global)', BANK_ID);

    const row = findBranchRowById(branchLookupState.rows, branchId);
    const name = extractBranchName(row);
    console.log('Resolved BranchName', name || '(empty)', row);
    setBranchName(name);
    console.groupEnd();
  }

  async function fetchCustomerBalance() {
    if (!CustomerBalanceService?.getCustomerBalance) {
      console.error(`${LOG_PREFIX} CustomerBalanceService not loaded.`);
      return;
    }

    if (!validateYears({ report: true })) {
      console.warn(`${LOG_PREFIX} Year(s) validation failed; aborting Process.`);
      return;
    }

    const requestData = {
        OurBranchID: readValue('branchId'),
        ProductID: document.getElementById('allProducts')?.checked ? null: readValue('productId'),
        Year: parseYear(readValue('years')), 
        Mode:'V',
        Status: '1',
        OperatorID: getOperatorId()
    };

    renderLoading();

    console.groupCollapsed(`${LOG_PREFIX} Process -> dbo.ch_AccountBalance`);
    console.log('RequestData', requestData);

    const result = await CustomerBalanceService.getCustomerBalance(requestData);

    console.log('Raw result', result);
    if (!result?.success) {
      console.error(`${LOG_PREFIX} Request failed`, result);
      console.groupEnd();
      renderTable([]);
      return;
    }

    const rows = normalizeRows(result);
    console.log('Rows length', rows?.length ?? 0);
    if (Array.isArray(rows) && rows.length) {
      try {
        console.table(rows.slice(0, 20));
      } catch {
        // ignore
      }
    }
    console.groupEnd();
    setGridRows(rows);
  }

  async function rectifySelected() {
    if (!CustomerBalanceService?.updateAccountBalance) {
      console.error(`${LOG_PREFIX} CustomerBalanceService.updateAccountBalance not loaded.`);
      return;
    }

    const selected = Array.from(gridState.selectedIds || []);
    if (!selected.length) {
      console.warn(`${LOG_PREFIX} Rectify clicked but no rows selected.`);
      return;
    }

    // Map selected IDs to source rows from allRows.
    const selectedRows = (gridState.allRows || []).filter((row) => {
      const id = extractAccountId(row);
      return id && gridState.selectedIds.has(String(id));
    });

    // Per backend contract: AccountTypeID must be 'C' for this rectify request.
    const accountTypeId = 'C';

    const detailRecordsXml = buildCorrectionEntriesXml(selectedRows);
    if (!detailRecordsXml) {
      console.warn(`${LOG_PREFIX} No valid DetailRecords could be built from selected rows.`);
      return;
    }

    const operatorId = getOperatorId();
    const now = formatLegacyDateTime();

    const requestData = {
      OurBranchID: readValue('branchId'),
      AccountTypeID: accountTypeId,
      DetailRecords: detailRecordsXml,
      CreatedBy: operatorId,
      CreatedOn: now,
      SupervisedBy: operatorId
    };

    renderLoading();

    console.groupCollapsed(`${LOG_PREFIX} Rectify -> dbo.ch_UpdateAccountBalance`);
    console.log('Selected count', selected.length);
    console.log('DetailRecords (xml)', detailRecordsXml);
    console.log('RequestData', requestData);

    const result = await CustomerBalanceService.updateAccountBalance(requestData);
    console.log('Raw result', result);

    if (!result?.success) {
      console.error(`${LOG_PREFIX} Rectify failed`, result);
      console.groupEnd();
      // restore previous rows
      renderGrid();
      return;
    }

    console.groupEnd();

    // Clear selection and refresh the grid by re-running view mode.
    gridState.selectedIds = new Set();
    await fetchCustomerBalance();
  }

  function bind() {
    // Grid controls
    const gridEls = getGridEls();
    if (gridEls.pageSize && gridEls.pageSize.dataset.cbBound !== '1') {
      gridEls.pageSize.dataset.cbBound = '1';
      gridEls.pageSize.addEventListener('change', () => {
        const value = Number(gridEls.pageSize.value) || 10;
        gridState.pageSize = value;
        gridState.pageIndex = 0;
        renderGrid();
      });
    }

    if (gridEls.search && gridEls.search.dataset.cbBound !== '1') {
      gridEls.search.dataset.cbBound = '1';
      gridEls.search.addEventListener('input', () => {
        gridState.query = gridEls.search.value || '';
        gridState.pageIndex = 0;
        renderGrid();
      });
    }

    if (gridEls.prev && gridEls.prev.dataset.cbBound !== '1') {
      gridEls.prev.dataset.cbBound = '1';
      gridEls.prev.addEventListener('click', (e) => {
        e.preventDefault();
        gridState.pageIndex = Math.max(0, gridState.pageIndex - 1);
        renderGrid();
      });
    }

    if (gridEls.next && gridEls.next.dataset.cbBound !== '1') {
      gridEls.next.dataset.cbBound = '1';
      gridEls.next.addEventListener('click', (e) => {
        e.preventDefault();
        gridState.pageIndex = gridState.pageIndex + 1;
        renderGrid();
      });
    }

    const branchIdInput = document.getElementById('branchId');
    if (branchIdInput && branchIdInput.dataset.cbBound !== '1') {
      // Note: this dataset flag is shared with other bindings; keep as-is.
      branchIdInput.dataset.cbBound = '1';
      branchIdInput.addEventListener('blur', () => {
        console.log(`${LOG_PREFIX} BranchID blur -> lookup`);
        fetchBranchName();
      });
    }

    const allProductsCheckbox = document.getElementById('allProducts');
    if (allProductsCheckbox && allProductsCheckbox.dataset.cbBound !== '1') {
      allProductsCheckbox.dataset.cbBound = '1';
      allProductsCheckbox.addEventListener('change', syncAllProductsUI);
    }

    const yearsInput = document.getElementById('years');
    if (yearsInput && yearsInput.dataset.cbBound !== '1') {
      yearsInput.dataset.cbBound = '1';
      yearsInput.addEventListener('input', () => validateYears({ report: false }));
      yearsInput.addEventListener('blur', () => validateYears({ report: true }));
    }

    // Sidebar Process button
    const processBtn = document.querySelector('[data-role="process"]');
    if (processBtn && processBtn.dataset.cbBound !== '1') {
      processBtn.dataset.cbBound = '1';
      processBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log(`${LOG_PREFIX} Process clicked`);
        fetchCustomerBalance();
      });
    }

    // Cancel button clears fields + grid
    const cancelBtn = document.querySelector('[data-role="cancel"]');
    if (cancelBtn && cancelBtn.dataset.cbBound !== '1') {
      cancelBtn.dataset.cbBound = '1';
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log(`${LOG_PREFIX} Cancel clicked -> clear form + grid`);
        clearFormFields();
        resetGridUI();
      });
    }

    // Rectify button
    const rectifyBtn = document.querySelector('[data-role="rectify"]');
    if (rectifyBtn && rectifyBtn.dataset.cbBound !== '1') {
      rectifyBtn.dataset.cbBound = '1';
      rectifyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log(`${LOG_PREFIX} Rectify clicked`);
        rectifySelected();
      });
    }

    // keep product controls in sync on load
    syncAllProductsUI();

    // validate Year(s) on load (clear any stale message)
    validateYears({ report: false });

    // initialize grid meta
    renderGrid();
  }

  bind();
})();
