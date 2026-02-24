const penaltyData = [{branchId: '0101', centerId: 'C001', schemeId: 'S001', accounts: [{accountId: 'ACC001', accountName: 'John Doe', penaltyAmount: 500, penaltyWaived: 0, penaltySuspended: 0, receivable: 500, overdue: 200, accruedUpto: '2025-01-01', appliedUpto: '2025-01-15'}], reason: '', waiveOffStatus: '', createdBy: 'User1', createdOn: '2025-01-01', modifiedBy: 'User2', modifiedOn: '2025-01-02', supervisedBy: 'Supervisor', supervisedOn: '2025-01-03'}];
let currentData = null, editMode = false;
let branchLookupData = []; // Cache for branch search results
let branchLookupModalInstance = null;
let branchFilterWired = false;

let centerLookupData = []; // Cache for center search results
let centerLookupModalInstance = null;
let centerFilterWired = false;

let schemeLookupData = []; // Cache for scheme search results
let schemeLookupModalInstance = null;
let schemeFilterWired = false;

// Account Maintenance-style SearchModal instances
let cpiwBranchSearchModal = null;
let cpiwCenterSearchModal = null;
let cpiwSchemeSearchModal = null;

const getSession = () => window.getAuthSession?.() || {};

function getOperatorId() {
  const session = getSession();
  return session?.operatorId || session?.OperatorID || session?.name || session?.Name || 'web_portal';
}

function getLoggedBranchId() {
  const session = getSession();
  return session?.branchId || session?.BranchID || window.Environment?.OurBranchID || window.Environment?.branchId || '';
}

function getOurBranchIdForLookup() {
  const fromField = String(document.getElementById('BranchId')?.value || '').trim();
  return fromField || getLoggedBranchId();
}

async function ensureLookupServicesLoaded() {
  if (!window.CoreApi) {
    const loader = window.ServiceLoader;
    if (loader?.loadCore) {
      await loader.loadCore();
    }
  }

  if (!window.CoreApi) {
    throw new Error('CoreApi not available');
  }

  if (!window.LookupService) {
    const loader = window.ServiceLoader;
    if (loader?.loadLookupService) {
      await loader.loadLookupService();
    } else if (loader?.loadScript) {
      await loader.loadScript('/assets/js/services/shared/lookupService.js');
    }
  }
}

async function handleBranchSearch() {
  console.log('🔍 Opening branch search...');

  try {
    if (!window.SearchModal || !window.SearchService) {
      throw new Error('Search modal services not loaded');
    }

    if (!cpiwBranchSearchModal) {
      cpiwBranchSearchModal = new window.SearchModal({
        prefix: 'cpiw-branch',
        moduleID: '4560',
        getOperatorId,
        getOurBranchId: getOurBranchIdForLookup,
        onError: (err) => {
          console.error('[CPIW] Branch search error:', err);
          showStatus('Failed to open branch search', 'error');
        }
      });
    }

    await cpiwBranchSearchModal.open({
      title: 'Search Branches',
      tableID: 'BranchID',
      whereStmt: '',
      advFilterString: '',
      autoCloseOnRowClick: false,
      searchFields: [
        { label: 'Branch ID', name: 'OurBranchID', column: 'OurBranchID' },
        { label: 'Branch Name', name: 'BranchName', column: 'BranchName' }
      ],
      displayFields: [
        { key: 'OurBranchID', label: 'Branch ID' },
        { key: 'BranchName', label: 'Branch Name' },
        { key: 'CurrencyID', label: 'Currency ID' }
      ],
      onSelect: (record) => {
        const rowKeys = Object.keys(record || {});
        const pick = (k) => {
          const actual = rowKeys.find(rk => rk.toLowerCase() === String(k).toLowerCase());
          return actual ? record[actual] : '';
        };

        const branchId = String(pick('OurBranchID') || pick('BranchID') || '').trim();
        const branchName = String(pick('BranchName') || '').trim();
        if (!branchId) {
          showStatus('Invalid branch selection', 'warning');
          return;
        }
        selectBranch(branchId, branchName);
      }
    });
  } catch (error) {
    console.error('❌ Branch search init failed:', error);
    showStatus('Service not available. Please refresh the page.', 'error');
  }
}

async function handleCenterSearch() {
  console.log('🔍 Opening center search...');

  try {
    if (!window.SearchModal || !window.SearchService) {
      throw new Error('Search modal services not loaded');
    }

    if (!cpiwCenterSearchModal) {
      cpiwCenterSearchModal = new window.SearchModal({
        prefix: 'cpiw-center',
        moduleID: '4560',
        getOperatorId,
        getOurBranchId: getOurBranchIdForLookup,
        onError: (err) => {
          console.error('[CPIW] Center search error:', err);
          showStatus('Failed to open center search', 'error');
        }
      });
    }

    await cpiwCenterSearchModal.open({
      title: 'Search Centers',
      tableID: 'GroupID',
      whereStmt: '',
      advFilterString: '',
      autoCloseOnRowClick: false,
      searchFields: [
        { label: 'Center ID', name: 'GroupID', column: 'GroupID' },
        { label: 'Center Name', name: 'GroupName', column: 'GroupName' }
      ],
      displayFields: [
        { key: 'GroupID', label: 'Center ID' },
        { key: 'GroupName', label: 'Center Name' }
      ],
      onSelect: async (record) => {
        const rowKeys = Object.keys(record || {});
        const pick = (k) => {
          const actual = rowKeys.find(rk => rk.toLowerCase() === String(k).toLowerCase());
          return actual ? record[actual] : '';
        };

        const centerId = String(pick('GroupID') || '').trim();
        const centerName = String(pick('GroupName') || '').trim();
        if (!centerId) {
          showStatus('Invalid center selection', 'warning');
          return;
        }
        await selectCenter(centerId, centerName);
      }
    });
  } catch (error) {
    console.error('❌ Center search init failed:', error);
    showStatus('Service not available. Please refresh the page.', 'error');
  }
}

async function handleSchemeSearch() {
  console.log('🔍 Opening scheme search...');

  // Validate required fields
  const branchId = String(document.getElementById('BranchId')?.value || '').trim();
  const centerId = String(document.getElementById('CenterId')?.value || '').trim();

  if (!branchId) {
    showStatus('Please select Branch ID first', 'warning');
    return;
  }

  if (!centerId) {
    showStatus('Please select Center ID first', 'warning');
    return;
  }

  try {
    if (!window.SearchModal || !window.SearchService) {
      throw new Error('Search modal services not loaded');
    }

    const advFilterString = `GroupID = '${escapeSqlString(centerId)}' AND OurBranchID = '${escapeSqlString(branchId)}'`;

    if (!cpiwSchemeSearchModal) {
      cpiwSchemeSearchModal = new window.SearchModal({
        prefix: 'cpiw-scheme',
        moduleID: '4560',
        getOperatorId,
        // Scheme search must use the selected BranchId as OurBranchID
        getOurBranchId: () => String(document.getElementById('BranchId')?.value || '').trim(),
        onError: (err) => {
          console.error('[CPIW] Scheme search error:', err);
          showStatus('Failed to open scheme search', 'error');
        }
      });
    }

    await cpiwSchemeSearchModal.open({
      title: 'Search Loan Schemes',
      tableID: 'GroupLoanSchemeID',
      whereStmt: '',
      advFilterString,
      autoCloseOnRowClick: false,
      searchFields: [
        { label: 'Scheme ID', name: 'LoanSchemeID', column: 'LoanSchemeID' },
        { label: 'Description', name: 'Description', column: 'Description' }
      ],
      displayFields: [
        { key: 'LoanSchemeID', label: 'Scheme ID' },
        { key: 'Description', label: 'Description' }
      ],
      onSelect: (record) => {
        const rowKeys = Object.keys(record || {});
        const pick = (k) => {
          const actual = rowKeys.find(rk => rk.toLowerCase() === String(k).toLowerCase());
          return actual ? record[actual] : '';
        };

        const schemeId = String(pick('LoanSchemeID') || '').trim();
        const description = String(pick('Description') || '').trim();
        if (!schemeId) {
          showStatus('Invalid scheme selection', 'warning');
          return;
        }
        selectScheme(schemeId, description);
      }
    });
  } catch (error) {
    console.error('❌ Scheme search init failed:', error);
    showStatus('Service not available. Please refresh the page.', 'error');
  }
}

function wireBranchFilter() {
  if (branchFilterWired) return;
  const idInput = document.getElementById('branchFilterBranchId');
  const nameInput = document.getElementById('branchFilterBranchName');
  const idOp = document.getElementById('branchFilterBranchIdOp');
  const nameOp = document.getElementById('branchFilterBranchNameOp');
  const searchBtn = document.getElementById('branchFilterSearchBtn');
  const clearBtn = document.getElementById('branchFilterClearBtn');

  // Modal not loaded yet
  if (!idInput || !nameInput || !idOp || !nameOp || !searchBtn || !clearBtn) return;

  branchFilterWired = true;

  const doSearch = async () => {
    await loadBranchesForSearch({
      branchId: String(idInput.value || '').trim(),
      branchName: String(nameInput.value || '').trim(),
      branchIdOp: String(idOp.value || 'contains'),
      branchNameOp: String(nameOp.value || 'contains')
    });
  };

  const doClear = async () => {
    idInput.value = '';
    nameInput.value = '';
    idOp.value = 'contains';
    nameOp.value = 'contains';
    await loadBranchesForSearch();
  };

  searchBtn.addEventListener('click', doSearch);
  clearBtn.addEventListener('click', doClear);

  // Enter key triggers search
  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSearch();
    }
  };
  idInput.addEventListener('keydown', onKeyDown);
  nameInput.addEventListener('keydown', onKeyDown);
}

function wireCenterFilter() {
  if (centerFilterWired) return;

  const idInput = document.getElementById('centerFilterCenterId');
  const nameInput = document.getElementById('centerFilterCenterName');
  const idOp = document.getElementById('centerFilterCenterIdOp');
  const nameOp = document.getElementById('centerFilterCenterNameOp');
  const searchBtn = document.getElementById('centerFilterSearchBtn');
  const clearBtn = document.getElementById('centerFilterClearBtn');

  if (!idInput || !nameInput || !idOp || !nameOp || !searchBtn || !clearBtn) return;

  centerFilterWired = true;

  const doSearch = async () => {
    await loadCentersForSearch({
      centerId: String(idInput.value || '').trim(),
      centerName: String(nameInput.value || '').trim(),
      centerIdOp: String(idOp.value || 'contains'),
      centerNameOp: String(nameOp.value || 'contains')
    });
  };

  const doClear = async () => {
    idInput.value = '';
    nameInput.value = '';
    idOp.value = 'contains';
    nameOp.value = 'contains';
    await loadCentersForSearch();
  };

  searchBtn.addEventListener('click', doSearch);
  clearBtn.addEventListener('click', doClear);

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSearch();
    }
  };
  idInput.addEventListener('keydown', onKeyDown);
  nameInput.addEventListener('keydown', onKeyDown);
}

function wireSchemeFilter() {
  if (schemeFilterWired) return;

  const idInput = document.getElementById('schemeFilterSchemeId');
  const descInput = document.getElementById('schemeFilterDescription');
  const idOp = document.getElementById('schemeFilterSchemeIdOp');
  const descOp = document.getElementById('schemeFilterDescriptionOp');
  const searchBtn = document.getElementById('schemeFilterSearchBtn');
  const clearBtn = document.getElementById('schemeFilterClearBtn');

  if (!idInput || !descInput || !idOp || !descOp || !searchBtn || !clearBtn) return;

  schemeFilterWired = true;

  const doSearch = async () => {
    await loadSchemesForSearch({
      schemeId: String(idInput.value || '').trim(),
      description: String(descInput.value || '').trim(),
      schemeIdOp: String(idOp.value || 'contains'),
      descriptionOp: String(descOp.value || 'contains')
    });
  };

  const doClear = async () => {
    idInput.value = '';
    descInput.value = '';
    idOp.value = 'contains';
    descOp.value = 'contains';
    await loadSchemesForSearch();
  };

  searchBtn.addEventListener('click', doSearch);
  clearBtn.addEventListener('click', doClear);

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSearch();
    }
  };
  idInput.addEventListener('keydown', onKeyDown);
  descInput.addEventListener('keydown', onKeyDown);
}

function escapeSqlString(value) {
  return String(value ?? '').replace(/'/g, "''");
}

function buildWhereCondition(fieldName, op, rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) return '';

  const safe = escapeSqlString(value);
  const mode = String(op || 'contains').toLowerCase();

  if (mode === 'equals') return `${fieldName} = '${safe}'`;
  if (mode === 'starts') return `${fieldName} LIKE '${safe}%'`;
  return `${fieldName} LIKE '%${safe}%'`;
}

async function loadBranchesForSearch(criteria = {}) {
  console.group('🔄 Branch Search Request');

  const tbody = document.querySelector('#branchSearchResultsBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">Loading branches...</td></tr>';
  }

  const operatorId = getOperatorId();
  const ourBranchId = getOurBranchIdForLookup();

  const whereParts = [];
  const branchIdCond = buildWhereCondition('OurBranchID', criteria.branchIdOp, criteria.branchId);
  const branchNameCond = buildWhereCondition('BranchName', criteria.branchNameOp, criteria.branchName);
  if (branchIdCond) whereParts.push(branchIdCond);
  if (branchNameCond) whereParts.push(branchNameCond);
  const whereStmt = whereParts.join(' AND ');

  const requestData = {
    TableID: 'BranchID',
    AdvFilterString: '',
    WhereStmt: whereStmt,
    PrevOrNext: '0',
    RefID: '',
    OperatorID: operatorId,
    ModuleID: '4560',
    OurBranchID: ourBranchId,
    SearchKey: '',
    LanguageID: ''
  };

  // This envelope matches the format you provided (RequestID/FormId/RequestData/etc.)
  const envelope = window.CoreApi.makeRequestEnvelope('dbo.p_GetSearchResult', requestData, 'PROJECT_KAIRO');
  console.log('Request Envelope:', envelope);

  // IMPORTANT: Do NOT use window.location.origin (8087 dev server). Use the same baseUrlCommon used by LookupService.
  const baseUrl = (
    window.Environment?.baseUrlCommon ||
    window.Environment?.baseUrlSystemCodes ||
    'http://localhost:5059'
  ).replace(/\/+$/, '');
  const endpoint = `${baseUrl}/api/OldAPI`;

  const response = await window.CoreApi.post(endpoint, envelope);
  console.log('✅ Branch Search Response:', response);

  if (!response?.success) {
    console.groupEnd();
    branchLookupData = [];
    populateBranchTable([]);
    showBranchLookupModal();
    showStatus('Failed to load branches: ' + (response?.message || 'Unknown error'), 'error');
    return;
  }

  // CoreApi.normalizeResponse sets Details to the primary dataset. For responses with Details01/Details02, data may be the full payload.
  const branches = Array.isArray(response?.Details)
    ? response.Details
    : Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.data?.Details)
        ? response.data.Details
        : [];

  branchLookupData = branches;
  console.log('📊 Branches loaded:', branches.length);
  console.groupEnd();

  populateBranchTable(branches);
  showBranchLookupModal();
}

async function loadCentersForSearch(criteria = {}) {
  console.group('🔄 Center Search Request');

  const tbody = document.querySelector('#centerSearchResultsBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">Loading centers...</td></tr>';
  }

  const operatorId = getOperatorId();
  const ourBranchId = getOurBranchIdForLookup();

  const whereParts = [];
  const idCond = buildWhereCondition('GroupID', criteria.centerIdOp, criteria.centerId);
  const nameCond = buildWhereCondition('GroupName', criteria.centerNameOp, criteria.centerName);
  if (idCond) whereParts.push(idCond);
  if (nameCond) whereParts.push(nameCond);
  const whereStmt = whereParts.join(' AND ');

  const requestData = {
    TableID: 'GroupID',
    AdvFilterString: '',
    WhereStmt: whereStmt,
    PrevOrNext: '0',
    RefID: '',
    OperatorID: operatorId,
    ModuleID: '4560',
    OurBranchID: ourBranchId,
    SearchKey: '',
    LanguageID: ''
  };

  const envelope = window.CoreApi.makeRequestEnvelope('dbo.p_GetSearchResult', requestData, 'PROJECT_KAIRO');
  console.log('Request Envelope:', envelope);

  const baseUrl = (
    window.Environment?.baseUrlCommon ||
    window.Environment?.baseUrlSystemCodes ||
    'http://localhost:5059'
  ).replace(/\/+$/, '');
  const endpoint = `${baseUrl}/api/OldAPI`;

  const response = await window.CoreApi.post(endpoint, envelope);
  console.log('✅ Center Search Response:', response);

  if (!response?.success) {
    console.groupEnd();
    centerLookupData = [];
    populateCenterTable([]);
    showCenterLookupModal();
    showStatus('Failed to load centers: ' + (response?.message || 'Unknown error'), 'error');
    return;
  }

  const centers = Array.isArray(response?.Details)
    ? response.Details
    : Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.data?.Details)
        ? response.data.Details
        : [];

  centerLookupData = centers;
  console.log('📊 Centers loaded:', centers.length);
  console.groupEnd();

  populateCenterTable(centers);
  showCenterLookupModal();
}

async function loadSchemesForSearch(criteria = {}) {
  console.group('🔄 Scheme Search Request');

  const tbody = document.querySelector('#schemeSearchResultsBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">Loading schemes...</td></tr>';
  }

  const operatorId = getOperatorId();
  const branchId = String(document.getElementById('BranchId')?.value || '').trim();
  const centerId = String(document.getElementById('CenterId')?.value || '').trim();

  if (!branchId || !centerId) {
    console.groupEnd();
    schemeLookupData = [];
    populateSchemeTable([]);
    showSchemeLookupModal();
    showStatus('Branch ID and Center ID are required', 'warning');
    return;
  }

  const whereParts = [];
  const idCond = buildWhereCondition('LoanSchemeID', criteria.schemeIdOp, criteria.schemeId);
  const descCond = buildWhereCondition('Description', criteria.descriptionOp, criteria.description);
  if (idCond) whereParts.push(idCond);
  if (descCond) whereParts.push(descCond);
  const whereStmt = whereParts.join(' AND ');

  // Build AdvFilterString with GroupID and OurBranchID
  const advFilterString = `GroupID = '${escapeSqlString(centerId)}' AND OurBranchID = '${escapeSqlString(branchId)}'`;

  const requestData = {
    TableID: 'GroupLoanSchemeID',
    AdvFilterString: advFilterString,
    WhereStmt: whereStmt,
    PrevOrNext: '0',
    RefID: '',
    OperatorID: operatorId,
    ModuleID: '4560',
    OurBranchID: branchId,
    SearchKey: '',
    LanguageID: ''
  };

  const envelope = window.CoreApi.makeRequestEnvelope('dbo.p_GetSearchResult', requestData, 'PROJECT_KAIRO');
  console.log('Request Envelope:', envelope);

  const baseUrl = (
    window.Environment?.baseUrlCommon ||
    window.Environment?.baseUrlSystemCodes ||
    'http://localhost:5059'
  ).replace(/\/+$/, '');
  const endpoint = `${baseUrl}/api/OldAPI`;

  const response = await window.CoreApi.post(endpoint, envelope);
  console.log('✅ Scheme Search Response:', response);

  if (!response?.success) {
    console.groupEnd();
    schemeLookupData = [];
    populateSchemeTable([]);
    showSchemeLookupModal();
    showStatus('Failed to load schemes: ' + (response?.message || 'Unknown error'), 'error');
    return;
  }

  const schemes = Array.isArray(response?.Details)
    ? response.Details
    : Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.data?.Details)
        ? response.data.Details
        : [];

  schemeLookupData = schemes;
  console.log('📊 Schemes loaded:', schemes.length);
  console.groupEnd();

  populateSchemeTable(schemes);
  showSchemeLookupModal();
}

function populateBranchTable(branches) {
  const tbody = document.querySelector('#branchSearchResultsBody');
  
  if (!branches || branches.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No branches found</td></tr>';
    return;
  }
  
  tbody.innerHTML = branches.map(branch => `
    <tr>
      <td><strong>${branch.OurBranchID}</strong></td>
      <td>${branch.BranchName}</td>
      <td>${branch.CurrencyID || 'ETB'}</td>
      <td>
        <button type="button" class="btn btn-sm btn-primary" onclick="selectBranch('${branch.OurBranchID}', '${branch.BranchName}')">
          <i class="bi bi-check-circle"></i> Select
        </button>
      </td>
    </tr>
  `).join('');
}

function selectBranch(branchId, branchName) {
  console.log('✅ Selected Branch:', branchId, '-', branchName);
  
  // Populate the form fields
  document.getElementById('BranchId').value = branchId;
  document.getElementById('BranchName').value = branchName;
  
  // Close modal
  closeBranchLookupModal();
  
  showStatus(`Selected Branch: ${branchId} - ${branchName}`, 'success');
}

function showBranchLookupModal() {
  if (!branchLookupModalInstance) {
    const modalEl = document.getElementById('branchLookupModal');
    branchLookupModalInstance = new bootstrap.Modal(modalEl);
  }
  wireBranchFilter();
  branchLookupModalInstance.show();
}

function showCenterLookupModal() {
  if (!centerLookupModalInstance) {
    const modalEl = document.getElementById('centerLookupModal');
    centerLookupModalInstance = new bootstrap.Modal(modalEl);
  }
  wireCenterFilter();
  centerLookupModalInstance.show();
}

function closeCenterLookupModal() {
  if (centerLookupModalInstance) {
    centerLookupModalInstance.hide();
  }
}

function showSchemeLookupModal() {
  if (!schemeLookupModalInstance) {
    const modalEl = document.getElementById('schemeLookupModal');
    schemeLookupModalInstance = new bootstrap.Modal(modalEl);
  }
  wireSchemeFilter();
  schemeLookupModalInstance.show();
}

function closeSchemeLookupModal() {
  if (schemeLookupModalInstance) {
    schemeLookupModalInstance.hide();
  }
}

function closeBranchLookupModal() {
  if (branchLookupModalInstance) {
    branchLookupModalInstance.hide();
  }
}

function populateCenterTable(centers) {
  const tbody = document.querySelector('#centerSearchResultsBody');

  if (!tbody) return;

  if (!centers || centers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">No centers found</td></tr>';
    return;
  }

  tbody.innerHTML = centers.map(center => `
    <tr>
      <td><strong>${center.GroupID || ''}</strong></td>
      <td>${center.GroupName || ''}</td>
      <td>
        <button type="button" class="btn btn-sm btn-primary" onclick="selectCenter('${String(center.GroupID || '').replace(/'/g, "\\'")}', '${String(center.GroupName || '').replace(/'/g, "\\'")}')">
          <i class="bi bi-check-circle"></i> Select
        </button>
      </td>
    </tr>
  `).join('');
}

async function selectCenter(centerId, centerName) {
  console.log('✅ Selected Center:', centerId, '-', centerName);

  document.getElementById('CenterId').value = centerId;
  document.getElementById('CenterName').value = centerName;

  closeCenterLookupModal();
  showStatus(`Selected Center: ${centerId} - ${centerName}`, 'success');

  // Fetch default advance type to auto-populate scheme
  await fetchDefaultAdvanceType(centerId);
}

async function fetchDefaultAdvanceType(centerId) {
  console.group('🔄 Fetching Default Advance Type');

  try {
    await ensureLookupServicesLoaded();

    const branchId = String(document.getElementById('BranchId')?.value || '').trim();
    const operatorId = getOperatorId();

    if (!branchId || !centerId) {
      console.warn('⚠️ Missing BranchID or CenterID for default advance type fetch');
      console.groupEnd();
      return;
    }

    const requestData = {
      OurBranchID: branchId,
      GroupID: centerId,
      OperatorID: operatorId
    };

    const envelope = window.CoreApi.makeRequestEnvelope('dbo.p_GetDefaultAdvType', requestData, 'PROJECT_KAIRO');
    console.log('Request Envelope:', envelope);

    const baseUrl = (
      window.Environment?.baseUrlCommon ||
      window.Environment?.baseUrlSystemCodes ||
      'http://localhost:5059'
    ).replace(/\/+$/, '');
    const endpoint = `${baseUrl}/api/OldAPI`;

    const response = await window.CoreApi.post(endpoint, envelope);
    console.log('✅ Default Advance Type Response:', response);

    if (!response?.success) {
      console.warn('⚠️ Failed to load default advance type:', response?.message || 'Unknown error');
      console.groupEnd();
      return;
    }

    const details = Array.isArray(response?.Details)
      ? response.Details
      : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.Details)
          ? response.data.Details
          : [];

    if (details.length > 0) {
      const defaultData = details[0];
      const loanSchemeId = String(defaultData.LoanSchemeID || '').trim();
      const loanScheme = String(defaultData.LoanScheme || '').trim();

      if (loanSchemeId) {
        document.getElementById('SchemeId').value = loanSchemeId;
        document.getElementById('SchemeName').value = loanScheme;
        console.log('✅ Auto-populated Scheme:', loanSchemeId, '-', loanScheme);
        showStatus(`Scheme auto-populated: ${loanSchemeId}`, 'info');
      } else {
        console.warn('⚠️ No LoanSchemeID in response');
      }
    } else {
      console.warn('⚠️ No default advance type data found');
    }

    console.groupEnd();
  } catch (error) {
    console.error('❌ Error fetching default advance type:', error);
    console.groupEnd();
  }
}

function populateSchemeTable(schemes) {
  const tbody = document.querySelector('#schemeSearchResultsBody');

  if (!tbody) return;

  if (!schemes || schemes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">No schemes found</td></tr>';
    return;
  }

  tbody.innerHTML = schemes.map(scheme => `
    <tr>
      <td><strong>${scheme.LoanSchemeID || ''}</strong></td>
      <td>${scheme.Description || ''}</td>
      <td>
        <button type="button" class="btn btn-sm btn-primary" onclick="selectScheme('${String(scheme.LoanSchemeID || '').replace(/'/g, "\\'")}', '${String(scheme.Description || '').replace(/'/g, "\\'")}')">
          <i class="bi bi-check-circle"></i> Select
        </button>
      </td>
    </tr>
  `).join('');
}

function selectScheme(schemeId, description) {
  console.log('✅ Selected Scheme:', schemeId, '-', description);

  document.getElementById('SchemeId').value = schemeId;
  document.getElementById('SchemeName').value = description;

  closeSchemeLookupModal();
  showStatus(`Selected Scheme: ${schemeId} - ${description}`, 'success');
}

// Wire branch filter even if script loads after DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wireBranchFilter);
} else {
  wireBranchFilter();
}

// Wire center filter even if script loads after DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wireCenterFilter);
} else {
  wireCenterFilter();
}

// Wire scheme filter even if script loads after DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wireSchemeFilter);
} else {
  wireSchemeFilter();
}
// Store penalty data and summary
let penaltyAccountsData = [];
let penaltySummaryData = null;

// Center and Scheme lookups are implemented above
async function handleView() {
  console.log('🔍 View button clicked');

  const branchId = String(document.getElementById('BranchId')?.value || '').trim();
  const centerId = String(document.getElementById('CenterId')?.value || '').trim();
  const schemeId = String(document.getElementById('SchemeId')?.value || '').trim();

  if (!branchId) {
    showStatus('Please select Branch ID first', 'warning');
    return;
  }

  if (!centerId) {
    showStatus('Please select Center ID first', 'warning');
    return;
  }

  if (!schemeId) {
    showStatus('Please select Scheme ID first', 'warning');
    return;
  }

  await viewCenterPenaltyWaiveOff(branchId, centerId, schemeId);
}

async function viewCenterPenaltyWaiveOff(branchId, centerId, schemeId) {
  console.group('🔄 Fetching Center Penalty Waive Off Data');

  try {
    await ensureLookupServicesLoaded();

    const operatorId = getOperatorId();

    const requestData = {
      OurBranchID: branchId,
      GroupID: centerId,
      LoanSchemeID: schemeId,
      OperatorID: operatorId
    };

    const envelope = window.CoreApi.makeRequestEnvelope('dbo.p_GetGLoanPenIntWaiveOff', requestData, 'PROJECT_KAIRO');
    console.log('Request Envelope:', envelope);

    const baseUrl = (
      window.Environment?.baseUrlCommon ||
      window.Environment?.baseUrlSystemCodes ||
      'http://localhost:5059'
    ).replace(/\/+$/, '');
    const endpoint = `${baseUrl}/api/OldAPI`;

    const response = await window.CoreApi.post(endpoint, envelope);
    console.log('✅ Penalty Waive Off Response:', response);

    if (!response?.success) {
      console.groupEnd();
      showStatus('Failed to load penalty data: ' + (response?.message || 'Unknown error'), 'error');
      return;
    }

    const accounts = Array.isArray(response?.Details)
      ? response.Details
      : Array.isArray(response?.data?.Details)
        ? response.data.Details
        : [];

    const summary = Array.isArray(response?.Details01) && response.Details01.length > 0
      ? response.Details01[0]
      : Array.isArray(response?.data?.Details01) && response.data.Details01.length > 0
        ? response.data.Details01[0]
        : null;

    penaltyAccountsData = accounts;
    penaltySummaryData = summary;

    console.log('📊 Accounts loaded:', accounts.length);
    console.log('📋 Summary data:', summary);

    loadPenaltyAccounts(accounts);
    applyFormStateAfterView(summary);

    // Calculate and display total waived off
    updateTotalWaivedOff();

    showStatus(`Loaded ${accounts.length} penalty account(s)`, 'success');
    console.groupEnd();
  } catch (error) {
    console.error('❌ Error fetching penalty data:', error);
    console.groupEnd();
    showStatus('Error loading penalty data', 'error');
  }
}

function loadPenaltyAccounts(accounts) {
  const tbody = document.querySelector('#penaltyTable tbody');

  if (!accounts || accounts.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="10">No records to display</td></tr>';
    return;
  }

  tbody.innerHTML = accounts.map((account, index) => {
    const accountId = String(account.AccountID || '').trim();
    const accountName = String(account.AccountName || '').trim();
    const penaltyAmount = Number(account.PenaltyAmount || 0);
    const penaltyAmountFormatted = penaltyAmount.toFixed(2);
    const penaltyWaivedOff = Number(account.PenaltyWaivedOff || 0).toFixed(2);
    const penaltyInterestSuspended = account.PenaltyInterestSuspended !== null ? Number(account.PenaltyInterestSuspended).toFixed(2) : '';
    const penaltyReceivable = account.PenaltyReceivable !== null ? Number(account.PenaltyReceivable).toFixed(2) : '';
    const oDuePenaltyReceivable = account.ODuePenaltyReceivable !== null ? Number(account.ODuePenaltyReceivable).toFixed(2) : '';
    const penaltyAccruedUpto = account.PenaltyAccruedUpto || '';
    const penaltyAppliedUpto = account.PenaltyAppliedUpto || '';

    return `
      <tr data-row-index="${index}">
        <td>
          <input 
            type="checkbox" 
            class="form-check-input" 
            data-row-checkbox="${index}" 
            onchange="handleRowCheckboxChange(${index})" 
            disabled
          />
        </td>
        <td>${accountId}</td>
        <td>${accountName}</td>
        <td class="text-end">${penaltyAmountFormatted}</td>
        <td>
          <input 
            type="number" 
            class="form-control form-control-sm" 
            data-row-waiveoff="${index}" 
            data-max-amount="${penaltyAmount}" 
            value="${penaltyWaivedOff}" 
            disabled
            step="0.01"
            min="0"
            max="${penaltyAmount}"
            oninput="handleWaiveOffChange(${index})"
          />
        </td>
        <td class="text-end">${penaltyInterestSuspended}</td>
        <td class="text-end">${penaltyReceivable}</td>
        <td class="text-end">${oDuePenaltyReceivable}</td>
        <td>${penaltyAccruedUpto}</td>
        <td>${penaltyAppliedUpto}</td>
      </tr>
    `;
  }).join('');
}

function handleRowCheckboxChange(rowIndex) {
  const checkbox = document.querySelector(`[data-row-checkbox="${rowIndex}"]`);
  const waiveOffInput = document.querySelector(`[data-row-waiveoff="${rowIndex}"]`);

  if (checkbox && waiveOffInput) {
    waiveOffInput.disabled = !checkbox.checked;
    
    if (penaltyAccountsData[rowIndex]) {
      penaltyAccountsData[rowIndex].IsSelect = checkbox.checked;
      
      // If unchecking, set penalty waived off to 0 and recalculate total
      if (!checkbox.checked) {
        waiveOffInput.value = '0.00';
        penaltyAccountsData[rowIndex].PenaltyWaivedOff = 0;
        console.log(`Row ${rowIndex} unchecked - PenaltyWaivedOff reset to 0`);
        updateTotalWaivedOff();
      }
    }

    console.log(`Row ${rowIndex} checkbox ${checkbox.checked ? 'checked' : 'unchecked'}, waiveoff input ${checkbox.checked ? 'enabled' : 'disabled'}`);
  }
}

function handleWaiveOffChange(rowIndex) {
  const waiveOffInput = document.querySelector(`[data-row-waiveoff="${rowIndex}"]`);
  
  if (!waiveOffInput) return;

  const value = Number(waiveOffInput.value);
  const maxAmount = Number(waiveOffInput.getAttribute('data-max-amount') || 0);

  // Validate: no negative amounts
  if (value < 0) {
    showStatus('Penalty Waived Off cannot be negative', 'error');
    waiveOffInput.value = 0;
    updateTotalWaivedOff();
    return;
  }

  // Validate: not greater than penalty amount
  if (value > maxAmount) {
    showStatus(`Penalty Waived Off cannot exceed Penalty Amount (${maxAmount.toFixed(2)})`, 'error');
    waiveOffInput.value = maxAmount.toFixed(2);
    updateTotalWaivedOff();
    return;
  }

  // Update data model
  if (penaltyAccountsData[rowIndex]) {
    penaltyAccountsData[rowIndex].PenaltyWaivedOff = value;
  }

  // Recalculate total
  updateTotalWaivedOff();
}

function updateTotalWaivedOff() {
  let total = 0;

  // Sum all waive-off inputs in the grid
  const waiveOffInputs = document.querySelectorAll('[data-row-waiveoff]');
  waiveOffInputs.forEach(input => {
    const value = Number(input.value || 0);
    if (!isNaN(value) && value >= 0) {
      total += value;
    }
  });

  // Update the PenaltyWaivedOff control below the grid
  const totalWaivedOffControl = document.getElementById('PenaltyWaivedOff');
  if (totalWaivedOffControl) {
    totalWaivedOffControl.value = total.toFixed(2);
  }

  console.log('Total Penalty Waived Off:', total.toFixed(2));
}

function applyFormStateAfterView(summary) {
  console.log('📝 Applying form state after view');

  const updateCount = summary?.UpdateCount || 0;
  console.log('UpdateCount:', updateCount);

  // Disable BranchID, CenterID, SchemeID fields
  const branchIdInput = document.getElementById('BranchId');
  const centerIdInput = document.getElementById('CenterId');
  const schemeIdInput = document.getElementById('SchemeId');
  const branchSearchBtn = document.querySelector('[data-cpiw-lookup="branch"]');
  const centerSearchBtn = document.querySelector('[data-cpiw-lookup="center"]');
  const schemeSearchBtn = document.querySelector('[data-cpiw-lookup="scheme"]');

  if (branchIdInput) branchIdInput.disabled = true;
  if (centerIdInput) centerIdInput.disabled = true;
  if (schemeIdInput) schemeIdInput.disabled = true;
  if (branchSearchBtn) branchSearchBtn.disabled = true;
  if (centerSearchBtn) centerSearchBtn.disabled = true;
  if (schemeSearchBtn) schemeSearchBtn.disabled = true;

  // Disable Save button
  const saveBtn = document.querySelector('[data-cpiw-action="save"]');
  if (saveBtn) saveBtn.disabled = true;

  // Enable/Disable Add button based on UpdateCount
  const addBtn = document.querySelector('[data-cpiw-action="add"]');
  if (addBtn) {
    addBtn.disabled = updateCount !== 0;
    console.log('Add button:', updateCount === 0 ? 'enabled' : 'disabled');
  }

  // Enable/Disable Delete button based on UpdateCount
  const deleteBtn = document.querySelector('[data-cpiw-action="delete"]');
  if (deleteBtn) {
    deleteBtn.disabled = updateCount === 0;
    console.log('Delete button:', updateCount === 0 ? 'disabled' : 'enabled');
  }

  // Enable Cancel button
  const cancelBtn = document.querySelector('[data-cpiw-action="cancel"]');
  if (cancelBtn) cancelBtn.disabled = false;

  // Disable View button after successful load
  const viewBtn = document.querySelector('[data-cpiw-action="view"]');
  if (viewBtn) viewBtn.disabled = true;

  // Disable Edit button initially
  const editBtn = document.querySelector('[data-cpiw-action="edit"]');
  if (editBtn) editBtn.disabled = true;

  // Ensure PenaltyWaivedOff control below grid is always disabled
  const totalWaivedOffControl = document.getElementById('PenaltyWaivedOff');
  if (totalWaivedOffControl) totalWaivedOffControl.disabled = true;

  // All grid controls (checkboxes and inputs) remain disabled
  // They will be enabled when Add/Edit button is clicked
}
function handleAdd() { 
  editMode = true; 
  setEditMode(true); 
  enableGridControls(true);
  const addBtn = document.querySelector('[data-cpiw-action="add"]');
  if (addBtn) addBtn.disabled = true;
  showStatus('Add mode enabled', 'info'); 
}
function handleEdit() { 
  editMode = !editMode; 
  setEditMode(editMode); 
  enableGridControls(editMode);
}
function handleDelete() { showStatus('Penalty records deleted', 'danger'); clearForm(); }
function handleSave() { if (!document.getElementById('Reason').value) { showStatus('Enter reason', 'error'); return; } showStatus('Penalty waive off saved', 'success'); editMode = false; setEditMode(false); }
function handleCancel() { clearForm(); }
function clearForm() { 
  // Clear form fields
  const branchIdInput = document.getElementById('BranchId');
  const branchNameInput = document.getElementById('BranchName');
  const centerIdInput = document.getElementById('CenterId');
  const centerNameInput = document.getElementById('CenterName');
  const schemeIdInput = document.getElementById('SchemeId');
  const schemeNameInput = document.getElementById('SchemeName');
  const reasonInput = document.getElementById('Reason');
  const penaltyWaivedOffInput = document.getElementById('PenaltyWaivedOff');
  
  if (branchIdInput) branchIdInput.value = '';
  if (branchNameInput) branchNameInput.value = '';
  if (centerIdInput) centerIdInput.value = '';
  if (centerNameInput) centerNameInput.value = '';
  if (schemeIdInput) schemeIdInput.value = '';
  if (schemeNameInput) schemeNameInput.value = '';
  if (reasonInput) reasonInput.value = '';
  if (penaltyWaivedOffInput) {
    penaltyWaivedOffInput.value = '';
    penaltyWaivedOffInput.disabled = true; // Always disabled
  }
  
  // Re-enable lookup fields
  if (branchIdInput) branchIdInput.disabled = false;
  if (centerIdInput) centerIdInput.disabled = false;
  if (schemeIdInput) schemeIdInput.disabled = false;
  
  const branchSearchBtn = document.querySelector('[data-cpiw-lookup="branch"]');
  const centerSearchBtn = document.querySelector('[data-cpiw-lookup="center"]');
  const schemeSearchBtn = document.querySelector('[data-cpiw-lookup="scheme"]');
  if (branchSearchBtn) branchSearchBtn.disabled = false;
  if (centerSearchBtn) centerSearchBtn.disabled = false;
  if (schemeSearchBtn) schemeSearchBtn.disabled = false;
  
  // Reset data
  penaltyAccountsData = [];
  penaltySummaryData = null;
  
  // Clear grid
  loadPenaltyAccounts([]);
  
  // Reset button states to initial
  const viewBtn = document.querySelector('[data-cpiw-action="view"]');
  const cancelBtn = document.querySelector('[data-cpiw-action="cancel"]');
  const addBtn = document.querySelector('[data-cpiw-action="add"]');
  const editBtn = document.querySelector('[data-cpiw-action="edit"]');
  const deleteBtn = document.querySelector('[data-cpiw-action="delete"]');
  const saveBtn = document.querySelector('[data-cpiw-action="save"]');
  
  if (viewBtn) viewBtn.disabled = false;
  if (cancelBtn) cancelBtn.disabled = false;
  if (addBtn) addBtn.disabled = true;
  if (editBtn) editBtn.disabled = true;
  if (deleteBtn) deleteBtn.disabled = true;
  if (saveBtn) saveBtn.disabled = true;
  
  editMode = false;
  
  showStatus('Cancelled', 'info'); 
}
function setEditMode(enabled) { 
  const reasonInput = document.getElementById('Reason');
  const penaltyWaivedOffInput = document.getElementById('PenaltyWaivedOff');
  const saveBtn = document.querySelector('[data-cpiw-action="save"]');
  const deleteBtn = document.querySelector('[data-cpiw-action="delete"]');
  
  if (reasonInput) reasonInput.disabled = !enabled; 
  
  // PenaltyWaivedOff control should always be disabled (it's auto-calculated)
  if (penaltyWaivedOffInput) penaltyWaivedOffInput.disabled = true;
  
  if (saveBtn) saveBtn.disabled = !enabled; 
  
  // Delete button state is controlled by UpdateCount, not edit mode
  // Only enable delete if we're in edit mode AND have data
  if (deleteBtn && penaltySummaryData) {
    const updateCount = penaltySummaryData.UpdateCount || 0;
    deleteBtn.disabled = !enabled || updateCount === 0;
  }
}

function enableGridControls(enabled) {
  console.log('Grid controls:', enabled ? 'enabled' : 'disabled');
  
  // Enable/disable all checkboxes
  const checkboxes = document.querySelectorAll('[data-row-checkbox]');
  checkboxes.forEach(checkbox => {
    checkbox.disabled = !enabled;
  });
  
  // Waive-off inputs should ONLY activate when the row checkbox is checked.
  // So in Add/Edit mode, we keep them disabled by default and let
  // handleRowCheckboxChange() toggle them on selection.
  const waiveOffInputs = document.querySelectorAll('[data-row-waiveoff]');
  waiveOffInputs.forEach(input => {
    const rowIndex = input.getAttribute('data-row-waiveoff');
    const rowCheckbox = document.querySelector(`[data-row-checkbox="${rowIndex}"]`);
    const shouldEnable = Boolean(enabled && rowCheckbox && rowCheckbox.checked);
    input.disabled = !shouldEnable;
  });
  
  // If disabling, also uncheck all checkboxes
  if (!enabled) {
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    
    // Update data model
    penaltyAccountsData.forEach(account => {
      account.IsSelect = false;
    });
  }
}
function showStatus(msg, type = 'info') {
  const el = document.getElementById('statusMessage');
  if (!el) return;

  const textEl = el.querySelector('.status-text');
  if (textEl) textEl.textContent = msg || '';

  const map = {
    success: 'success',
    info: 'info',
    warning: 'warning',
    error: 'danger',
    danger: 'danger'
  };
  const bsType = map[String(type || 'info')] || 'info';

  el.classList.remove('d-none');
  el.classList.remove('alert-success', 'alert-info', 'alert-warning', 'alert-danger');
  el.classList.add(`alert-${bsType}`);

  clearTimeout(showStatus._t);
  showStatus._t = setTimeout(() => {
    el.classList.add('d-none');
  }, 4000);
}
document.addEventListener('DOMContentLoaded', () => { 
    console.log('🔄 DOMContentLoaded - Setting up event listeners...');
    
    const branchBtn = document.querySelector('[data-cpiw-lookup="branch"]');
    console.log('  - Branch button found:', !!branchBtn);
    if (branchBtn) branchBtn.addEventListener('click', handleBranchSearch);
    
    const centerBtn = document.querySelector('[data-cpiw-lookup="center"]');
    console.log('  - Center button found:', !!centerBtn);
    if (centerBtn) centerBtn.addEventListener('click', handleCenterSearch);
    
    const schemeBtn = document.querySelector('[data-cpiw-lookup="scheme"]');
    console.log('  - Scheme button found:', !!schemeBtn);
    if (schemeBtn) schemeBtn.addEventListener('click', handleSchemeSearch);
    
    const viewBtn = document.querySelector('[data-cpiw-action="view"]');
    if (viewBtn) viewBtn.addEventListener('click', handleView);
    
    const addBtn = document.querySelector('[data-cpiw-action="add"]');
    if (addBtn) addBtn.addEventListener('click', handleAdd);
    
    const editBtn = document.querySelector('[data-cpiw-action="edit"]');
    if (editBtn) editBtn.addEventListener('click', handleEdit);
    
    const deleteBtn = document.querySelector('[data-cpiw-action="delete"]');
    if (deleteBtn) deleteBtn.addEventListener('click', handleDelete);
    
    const saveBtn = document.querySelector('[data-cpiw-action="save"]');
    if (saveBtn) saveBtn.addEventListener('click', handleSave);
    
    const cancelBtn = document.querySelector('[data-cpiw-action="cancel"]');
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);

    // Section collapse behavior (matches standardized maintenance screens)
    document.querySelectorAll('[data-section-toggle]').forEach((header) => {
      header.addEventListener('click', (e) => {
        const toggleBtn = e.target?.closest?.('.section-toggle-btn');
        const clickedHeader = e.target?.closest?.('[data-section-toggle]');
        if (!clickedHeader) return;
        if (toggleBtn === null && e.target !== header && !header.contains(e.target)) return;

        const section = clickedHeader.closest('.form-section');
        if (!section) return;

        const isCollapsed = section.classList.toggle('collapsed');
        clickedHeader.setAttribute('aria-expanded', String(!isCollapsed));
        const btn = clickedHeader.querySelector('.section-toggle-btn');
        if (btn) btn.setAttribute('aria-expanded', String(!isCollapsed));
      });
    });

    // Status close button
    const statusEl = document.getElementById('statusMessage');
    statusEl?.querySelector?.('.btn-close')?.addEventListener?.('click', () => {
      statusEl.classList.add('d-none');
    });

    // Initial button state on form load
    // Requirement: Cancel + View must be enabled
    if (viewBtn) viewBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;

    // Keep edit-mode dependent actions disabled until Add/Edit
    const saveBtnInit = document.querySelector('[data-cpiw-action="save"]');
    const deleteBtnInit = document.querySelector('[data-cpiw-action="delete"]');
    if (saveBtnInit) saveBtnInit.disabled = true;
    if (deleteBtnInit) deleteBtnInit.disabled = true;
    setEditMode(false);
    
    // Ensure PenaltyWaivedOff control is disabled on page load
    const penaltyWaivedOffControl = document.getElementById('PenaltyWaivedOff');
    if (penaltyWaivedOffControl) penaltyWaivedOffControl.disabled = true;
    
    const style = document.createElement('style'); 
    style.textContent = `.input-group-icon { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; margin-left: -35px; color: var(--text-gray); cursor: pointer; }`; 
    document.head.appendChild(style);
    
    console.log('✅ Event listeners setup complete');
});