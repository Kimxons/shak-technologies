document.addEventListener('DOMContentLoaded', async () => {
  const env = window.Environment || {};
  const service = window.GroupMemberMaintenanceService;

  // Store the scheme that is already assigned/loaded on page load so we can exclude it from SchemeID search.
  let assignedLoanSchemeId = '';

  if (!service) {
    console.error('GroupMemberMaintenanceService is not loaded');
    return;
  }

  // Get reference to form
  const form = document.querySelector('form[class*="row"]');
  if (!form) {
    console.error('Form not found');
    return;
  }
  
    // Utility function to format date as DD/MMM/YYYY
    function formatDateToDDMMMYYYY(dateStr) {
        if (!dateStr) return '';
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let dateObj = new Date(dateStr);
        if (isNaN(dateObj)) return dateStr; // fallback if invalid
        let day = String(dateObj.getDate()).padStart(2, '0');
        let month = months[dateObj.getMonth()];
        let year = dateObj.getFullYear();
        return `${day}/${month}/${year}`;
    }

  // Set status select option values
  const statusSelect = document.getElementById('Status');
  if (statusSelect) {
    const options = statusSelect.querySelectorAll('option');
    options.forEach(option => {
      if (option.textContent.trim() === 'Active') {
        option.value = 'A';
      } else if (option.textContent.trim() === 'Inactive') {
        option.value = 'E';
      }
    });
  }

  // Add CSS to make form inputs bold
  const style = document.createElement('style');
  style.textContent = `
    #SchemeId, #SchemeName, #LoanLevelNo, #SavingsAmount, #PrimaryCollateral, 
    #SecondaryCollateral, #AdditionalCollateral, #CollateralRatio, #Status,
    #LoanAccountID, #LoanProductID, #SavingsAccountId, #SavingsProductID, 
    #CycleNo, #CreatedBy, #ModifiedBy, #SupervisedBy, #CreatedOn, #ModifiedOn, #SupervisedOn {
      font-weight: bold !important;
    }
    
    #SchemeId:disabled, #SchemeName:disabled, #LoanLevelNo:disabled, #SavingsAmount:disabled, #PrimaryCollateral:disabled, 
    #SecondaryCollateral:disabled, #AdditionalCollateral:disabled, #CollateralRatio:disabled, #Status:disabled,
    #LoanAccountID:disabled, #LoanProductID:disabled, #SavingsAccountId:disabled, #SavingsProductID:disabled, 
    #CycleNo:disabled, #CreatedBy:disabled, #ModifiedBy:disabled, #SupervisedBy:disabled, #CreatedOn:disabled, #ModifiedOn:disabled, #SupervisedOn:disabled,
    #SchemeId:readonly, #SchemeName:readonly, #LoanLevelNo:readonly, #SavingsAmount:readonly, #PrimaryCollateral:readonly, 
    #SecondaryCollateral:readonly, #AdditionalCollateral:readonly, #CollateralRatio:readonly, #Status:readonly,
    #LoanAccountID:readonly, #LoanProductID:readonly, #SavingsAccountId:readonly, #SavingsProductID:readonly, 
    #CycleNo:readonly, #CreatedBy:readonly, #ModifiedBy:readonly, #SupervisedBy:readonly, #CreatedOn:readonly, #ModifiedOn:readonly, #SupervisedOn:readonly {
      font-weight: bold !important;
    }
  `;
  document.head.appendChild(style);

  // Function to populate form with scheme data
  function populateSchemeForm(scheme) {
    if (!scheme) return;

    // Persist assigned scheme id for later searches (Add mode)
    assignedLoanSchemeId = String(scheme.LoanSchemeID || scheme.LoanSchemeId || '').trim();

    // Main fields mapping
    const fieldMappings = {
      'SchemeId': scheme.LoanSchemeID,
      'SchemeName': scheme.SchemeName,
      'LoanLevelNo': scheme.LoanLevelNo,
      'SavingsAmount': scheme.SavingsAmount,
      'PrimaryCollateral': scheme.PrimaryCollateral,
      'SecondaryCollateral': scheme.SecondaryCollateral,
      'AdditionalCollateral': scheme.AdditionalCollateral,
      'CollateralRatio': scheme.CollateralRatio,
      'Status': scheme.MemberSchemeStatusID,
      // Behind The Scene fields
      'LoanAccountId': scheme.LoanAccountID,
      'LoanProductId': scheme.LoanProductID,
      'SavingAccountId': scheme.SavingsAccountID,
      'SavingProductId': scheme.SavingsProductID,
      'CycleNo': scheme.LoanCycleNo,
      'CreatedBy': scheme.CreatedBy,
      'ModifiedBy': scheme.ModifiedBy,
      'SupervisedBy': scheme.SupervisedBy,
      'CreatedOn': formatDateToDDMMMYYYY(scheme.CreatedOn),
      'ModifiedOn': formatDateToDDMMMYYYY(scheme.ModifiedOn),
      'SupervisedOn': formatDateToDDMMMYYYY(scheme.SupervisedOn)
    };

    // Populate form fields and disable them
    Object.keys(fieldMappings).forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.value = fieldMappings[fieldId] ?? '';
        field.disabled = true; // Disable all scheme fields
      }
    });

    // Enable Delete button when data is loaded
    const deleteButton = document.querySelector('button[data-cms-de-action="delete"]');
    if (deleteButton) deleteButton.disabled = false;

    console.log('Form populated with scheme data:', scheme);
  }

  // Function to format date
  function formatDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (error) {
      return dateString;
    }
  }

  // Function to load scheme data from parent form
  async function loadSchemeData() {
    try {
      // Get values from parent window (Center Member Maintenance form)
      const clientId = window.parent?.document?.getElementById('ClientId')?.value;
      const refId = window.parent?.document?.getElementById('ReferenceNo')?.value;
      const branchId = env.OurBranchID || window.parent?.Environment?.OurBranchID || '';
      const operatorId = env.operatorId || window.parent?.Environment?.operatorId || 'CSADM';

      if (!clientId || !refId) {
        console.warn('ClientId or RefId not available from parent form');
        return;
      }

      console.log('Loading scheme data for:', { clientId, refId, branchId, operatorId });

      // Call service to fetch scheme data
      const result = await service.getGroupMemberScheme({
        clientId,
        refId,
        branchId,
        operatorId
      });

      console.log('Scheme data response:', result);

      if (result.success && result.schemes && result.schemes.length > 0) {
        // Populate form with the first scheme
        console.log('Available scheme properties:', Object.keys(result.schemes[0]));
        console.log('Full scheme object:', result.schemes[0]);
        populateSchemeForm(result.schemes[0]);
        // Delete button is now enabled by populateSchemeForm
      } else {
        console.warn('No scheme data returned or request failed');
        // Disable Delete button if no data
        const deleteButton = document.querySelector('button[data-cms-de-action="delete"]');
        if (deleteButton) deleteButton.disabled = true;
      }
    } catch (error) {
      console.error('Error loading scheme data:', error);
    }
  }

  // Load data when form is ready
  await loadSchemeData();

  // Disable SchemeID search button on page load
  const schemeLookupButton = document.querySelector('button[data-cms-lookup="scheme"]');
  if (schemeLookupButton) {
    schemeLookupButton.disabled = true;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SchemeID Lookup/Search (Add mode) – same modal style as Center Member Maintenance
  // ───────────────────────────────────────────────────────────────────────────
  const CMS_LOOKUP_MODAL_ID = 'cmsLookupModal';
  const CMS_LOOKUP_MODAL_LABEL_ID = 'cmsLookupModalLabel';
  const CMS_LOOKUP_SEARCH_INPUT_ID = 'cmsLookupSearchInput';
  const CMS_LOOKUP_SEARCH_BTN_ID = 'cmsLookupSearchBtn';
  const CMS_LOOKUP_CLEAR_BTN_ID = 'cmsLookupClearBtn';
  const CMS_LOOKUP_OK_BTN_ID = 'cmsLookupOkBtn';
  const CMS_LOOKUP_ADVANCED_FORM_ID = 'cmsLookupAdvancedForm';
  const CMS_LOOKUP_ADVANCED_SEARCH_BTN_ID = 'cmsLookupAdvancedSearchBtn';
  const CMS_LOOKUP_ADVANCED_CLEAR_BTN_ID = 'cmsLookupAdvancedClearBtn';
  const CMS_LOOKUP_SIMPLE_CONTAINER_ID = 'cmsLookupSimpleSearch';
  const CMS_LOOKUP_ADVANCED_CONTAINER_ID = 'cmsLookupAdvancedSearch';
  const CMS_LOOKUP_RESULTS_HEADER_ID = 'cmsLookupResultsHeader';
  const CMS_LOOKUP_RESULTS_BODY_ID = 'cmsLookupResultsBody';
  const CMS_LOOKUP_RESULTS_META_ID = 'cmsLookupResultsMeta';

  let cmsLookupModalInstance = null;
  let cmsSchemeRowsCache = [];

  function ensureCmsLookupModal() {
    let modalEl = document.getElementById(CMS_LOOKUP_MODAL_ID);
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.className = 'modal fade';
      modalEl.id = CMS_LOOKUP_MODAL_ID;
      modalEl.tabIndex = -1;
      modalEl.setAttribute('aria-labelledby', CMS_LOOKUP_MODAL_LABEL_ID);
      modalEl.setAttribute('aria-hidden', 'true');

      modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-xl">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title" id="${CMS_LOOKUP_MODAL_LABEL_ID}">Scheme Lookup</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <form class="row g-2 align-items-end" id="${CMS_LOOKUP_ADVANCED_FORM_ID}" data-lookup-form>
                <div class="col-12 col-lg-5">
                  <label class="form-label mb-1">Scheme ID</label>
                  <input type="text" class="form-control" data-lookup-field="LoanSchemeID" placeholder="Scheme ID" />
                  <select class="form-select form-select-sm mt-1" data-lookup-mode="LoanSchemeID">
                    <option value="Like" selected>Like</option>
                    <option value="Exact">Exact</option>
                  </select>
                </div>
                <div class="col-12 col-lg-5">
                  <label class="form-label mb-1">Description</label>
                  <input type="text" class="form-control" data-lookup-field="Description" placeholder="Description" />
                  <select class="form-select form-select-sm mt-1" data-lookup-mode="Description">
                    <option value="Like" selected>Like</option>
                    <option value="Exact">Exact</option>
                  </select>
                </div>
                <div class="col-12 col-lg-2 d-flex justify-content-center">
                  <button type="button" class="btn btn-primary" id="${CMS_LOOKUP_ADVANCED_SEARCH_BTN_ID}">Search</button>
                </div>
              </form>

              <hr class="my-3" />

              <div class="table-responsive">
                <table class="table table-sm table-hover table-striped align-middle cms-lookup__table">
                  <thead><tr id="${CMS_LOOKUP_RESULTS_HEADER_ID}"></tr></thead>
                  <tbody id="${CMS_LOOKUP_RESULTS_BODY_ID}"></tbody>
                </table>
              </div>
              <div class="text-muted small" id="${CMS_LOOKUP_RESULTS_META_ID}"></div>
            </div>
            <div class="modal-footer bg-primary justify-content-center">
              <button type="button" class="btn" id="${CMS_LOOKUP_OK_BTN_ID}" data-bs-dismiss="modal">OK</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modalEl);
    }

    if (!cmsLookupModalInstance) {
      if (!window.bootstrap?.Modal) {
        console.error('[CMS Lookup] Bootstrap Modal not available. Ensure bootstrap.bundle.js is loaded.');
        return modalEl;
      }
      try {
        cmsLookupModalInstance = window.bootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: 'static' });
        console.log('[CMS Lookup] Modal instance created successfully');
      } catch (err) {
        console.error('[CMS Lookup] Failed to create modal instance:', err);
      }
    }

    return modalEl;
  }

  function setCmsLookupMeta(text) {
    const metaEl = document.getElementById(CMS_LOOKUP_RESULTS_META_ID);
    if (metaEl) metaEl.textContent = text || '';
  }

  function clearCmsLookupResults() {
    const headerEl = document.getElementById(CMS_LOOKUP_RESULTS_HEADER_ID);
    const bodyEl = document.getElementById(CMS_LOOKUP_RESULTS_BODY_ID);
    if (headerEl) headerEl.innerHTML = '';
    if (bodyEl) bodyEl.innerHTML = '';
    setCmsLookupMeta('');
  }

  function renderCmsLookupResults(rows, columns, onSelectRow) {
    const headerEl = document.getElementById(CMS_LOOKUP_RESULTS_HEADER_ID);
    const bodyEl = document.getElementById(CMS_LOOKUP_RESULTS_BODY_ID);
    if (!headerEl || !bodyEl) return;

    headerEl.innerHTML = '';
    bodyEl.innerHTML = '';

    const headerCells = ['#', ...columns];
    headerCells.forEach((col) => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = col;
      headerEl.appendChild(th);
    });

    rows.forEach((row) => {
      const tr = document.createElement('tr');

      // SearchModal-style selection: click the row (numbered first column)
      tr.tabIndex = 0;
      tr.style.cursor = 'pointer';
      const doSelect = () => {
        try {
          onSelectRow?.(row);
        } finally {
          cmsLookupModalInstance?.hide?.();
        }
      };
      tr.addEventListener('click', (e) => {
        if (e.defaultPrevented) return;
        doSelect();
      });
      tr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          doSelect();
        }
      });

      const numTd = document.createElement('td');
      numTd.textContent = String(bodyEl.children.length + 1);
      numTd.style.textAlign = 'center';
      tr.appendChild(numTd);

      columns.forEach((col) => {
        const td = document.createElement('td');
        const val = row?.[col];
        td.textContent = val === null || val === undefined ? '' : String(val);
        tr.appendChild(td);
      });

      bodyEl.appendChild(tr);
    });
  }

function escapeSqlLikeTerm(term) {
    return String(term || '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "''")
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  }

  function normalize(str) {
    return String(str || '').trim().toLowerCase();
  }

  function getSchemeIdFromRow(row) {
    return String(
      row?.LoanSchemeID ??
        row?.LoanSchemeId ??
        row?.SchemeID ??
        row?.SchemeId ??
        ''
    ).trim();
  }

  function getSchemeNameFromRow(row) {
    return String(
      row?.Description ??
        row?.SchemeName ??
        row?.LoanSchemeName ??
        row?.Name ??
        ''
    ).trim();
  }

  function getLookupColumnsForRows(rows) {
    const first = rows?.[0];
    if (!first || typeof first !== 'object') return [];

    const preferred = [
      'LoanSchemeID',
      'LoanSchemeId',
      'SchemeID',
      'SchemeId',
      'Description',
      'SchemeName',
      'LoanLevelNo',
      'LoanCycleNo',
      'MemberSchemeStatusID',
      'Status'
    ];

    const keys = Object.keys(first);

    const preferredPresent = preferred.filter((k) => keys.includes(k));
    const remaining = keys
      .filter((k) => !preferred.includes(k))
      .filter((k) => k !== '__proto__' && k !== 'constructor');

    // Keep the table readable.
    return [...preferredPresent, ...remaining].slice(0, 10);
  }

  async function fetchSchemeRowsFromServer() {
    const parentDoc = window.parent?.document;
    const centerId = String(parentDoc?.getElementById('CenterId')?.value || '').trim();
    const branchId = String(env.OurBranchID || window.parent?.Environment?.OurBranchID || '').trim();
    const operatorId = String(env.operatorId || window.parent?.Environment?.operatorId || 'CSADM').trim();

    const rows = await service.searchSchemeID({
      branchId,
      operatorId,
      centerId,
      excludeLoanSchemeId: assignedLoanSchemeId
    });

    return Array.isArray(rows) ? rows : [];
  }

  async function doSchemeLookupSearch() {
    ensureCmsLookupModal();

    clearCmsLookupResults();
    setCmsLookupMeta('Searching...');

    try {
      // Always refresh from server
      cmsSchemeRowsCache = await fetchSchemeRowsFromServer();

      if (!cmsSchemeRowsCache.length) {
        setCmsLookupMeta('No results');
        window.showToast?.('No schemes found for selection.', 'warning');
        return;
      }

      // Apply advanced filters
      const advancedForm = document.getElementById(CMS_LOOKUP_ADVANCED_FORM_ID);
      let filteredRows = cmsSchemeRowsCache;

      if (advancedForm) {
        const fields = Array.from(advancedForm.querySelectorAll('[data-lookup-field]'));
        const clauses = fields
          .map((field) => {
            const column = field?.dataset?.lookupField;
            const raw = String(field?.value || '').trim();
            if (!column || !raw) return null;

            const mode = advancedForm.querySelector(`[data-lookup-mode='${column}']`)?.value || 'Like';

            return { column, raw: raw.toLowerCase(), mode };
          })
          .filter(Boolean);

        if (clauses.length > 0) {
          filteredRows = cmsSchemeRowsCache.filter((row) => {
            return clauses.every((clause) => {
              const val = normalize(row?.[clause.column] || '');
              if (clause.mode === 'Exact') {
                return val === clause.raw;
              }
              return val.includes(clause.raw);
            });
          });
        }
      }

      if (!filteredRows.length) {
        setCmsLookupMeta('No results');
        return;
      }

      const limited = filteredRows.slice(0, 500);
      const columns = getLookupColumnsForRows(limited);

      renderCmsLookupResults(limited, columns, async (selected) => {
        try {
          const schemeId = getSchemeIdFromRow(selected);
          const schemeName = getSchemeNameFromRow(selected);

          const schemeIdInput = document.getElementById('SchemeId');
          const schemeNameInput = document.getElementById('SchemeName');

          // Fetch detailed scheme information
          const parentDoc = window.parent?.document;
          const clientId = String(parentDoc?.getElementById('ClientId')?.value || '').trim();
          const centerId = String(parentDoc?.getElementById('CenterId')?.value || '').trim();
          const branchId = String(env.OurBranchID || window.parent?.Environment?.OurBranchID || '').trim();
          const operatorId = String(env.operatorId || window.parent?.Environment?.operatorId || 'CSADM').trim();

          const result = await service.viewSchemeDetails({
            branchId,
            clientId,
            refId: '1',
            loanSchemeId: schemeId,
            operatorId,
            direction: '0'
          });

          if (!result?.schemeDetails || result.schemeDetails.length === 0) {
            window.showToast?.('Invalid Scheme ID', 'warning');
            if (schemeIdInput) {
              schemeIdInput.disabled = false;
              schemeIdInput.value = '';
            }
            if (schemeNameInput) schemeNameInput.value = '';
            return;
          }

          // Bind the scheme details to the form
          const details = result.schemeDetails[0];
          if (schemeIdInput) {
            schemeIdInput.disabled = false;
            schemeIdInput.value = schemeId;
          }
          if (schemeNameInput) schemeNameInput.value = schemeName;

          // Populate other scheme details from Details01
          if (details) {
            const fieldMappings = {
              'SchemeTypeID': details.SchemeTypeID,
              'LoanLevelNo': details.LoanLevelNo,
              'SavingsAmount': details.SavingsAmount,
              'LoanCycleNo': details.LoanCycleNo,
              'PrimaryCollateral': details.PrimaryCollateral,
              'SecondaryCollateral': details.SecondaryCollateral,
              'AdditionalCollateral': details.AdditionalCollateral,
              'CollateralRatio': details.CollateralRatio,
              'SchemeChosenDate': details.SchemeChosenDate,
              'LoanAccountID': details.LoanAccountID,
              'LoanProductID': details.LoanProductID,
              'SavingsAccountID': details.SavingsAccountID,
              'SavingsProductID': details.SavingsProductID,
              'MemberSchemeStatusID': details.MemberSchemeStatusID
            };

            Object.entries(fieldMappings).forEach(([fieldId, value]) => {
              const field = document.getElementById(fieldId);
              if (field && value !== null && value !== undefined) {
                field.value = String(value).trim();
              }
            });
          }
        } catch (err) {
          console.error('Failed to load scheme details:', err);
          window.showToast?.('Failed to load scheme details: ' + (err?.message || 'Unknown error'), 'danger');
        }
      });

      setCmsLookupMeta(`${limited.length} result(s)`);
    } catch (err) {
      console.error('Scheme lookup failed:', err);
      setCmsLookupMeta('Search failed');
      window.showToast?.('Scheme lookup failed: ' + (err?.message || 'Unknown error'), 'danger');
    }
  }

  function wireCmsLookupModalEventsOnce() {
    const modalEl = ensureCmsLookupModal();
    if (modalEl.dataset.lookupWired === 'true') return;
    modalEl.dataset.lookupWired = 'true';

    const advancedForm = document.getElementById(CMS_LOOKUP_ADVANCED_FORM_ID);
    const advancedSearchBtn = document.getElementById(CMS_LOOKUP_ADVANCED_SEARCH_BTN_ID);
    const advancedClearBtn = document.getElementById(CMS_LOOKUP_ADVANCED_CLEAR_BTN_ID);

    // Advanced form events
    if (advancedForm) {
      advancedForm.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        doSchemeLookupSearch();
      });

      const advancedFields = advancedForm.querySelectorAll('input[type="text"]');
      advancedFields.forEach((field) => {
        field.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            doSchemeLookupSearch();
          }
        });
      });
    }

    advancedSearchBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      doSchemeLookupSearch();
    });

    advancedClearBtn?.addEventListener('click', () => {
      if (advancedForm) {
        advancedForm.querySelectorAll('input[type="text"], select').forEach((f) => {
          if (f.tagName === 'SELECT') {
            f.value = 'Like';
          } else {
            f.value = '';
          }
        });
      }
      clearCmsLookupResults();
      setCmsLookupMeta('');
      advancedForm?.querySelector('input[type="text"]')?.focus?.();
    });

    modalEl.addEventListener('shown.bs.modal', () => {
      setTimeout(() => advancedForm?.querySelector('input[type="text"]')?.focus?.(), 0);
    });
  }

  function openSchemeLookup() {
    try {
      wireCmsLookupModalEventsOnce();
      ensureCmsLookupModal();

      // Pre-fill SchemeID field with current value if any
      const seed = String(document.getElementById('SchemeId')?.value || '').trim();
      const schemeIdField = document.querySelector(`[data-lookup-field="LoanSchemeID"]`);
      if (schemeIdField && seed) schemeIdField.value = seed;

      if (!cmsLookupModalInstance) {
        console.error('[CMS Lookup] Modal instance is null. Bootstrap may not be loaded.');
        window.showToast?.('Lookup modal initialization failed', 'danger');
        return;
      }

      cmsLookupModalInstance.show();
      console.log('[CMS Lookup] Modal shown');
      doSchemeLookupSearch();
    } catch (err) {
      console.error('[CMS Lookup] Error opening lookup:', err);
      window.showToast?.('Failed to open scheme lookup: ' + (err?.message || 'Unknown error'), 'danger');
    }
  }

  if (schemeLookupButton) {
    schemeLookupButton.addEventListener(
      'click',
      (e) => {
        // Embedded script ships a stub alert handler for [data-cms-lookup]; bypass it.
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        openSchemeLookup();
      },
      true
    );
  }

  // Handle Back button click
  const backButton = document.querySelector('button[class*="Back"]') || 
                     Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.trim() === 'Back');
  if (backButton) {
    backButton.addEventListener('click', () => {
      // Close the iframe/window
      if (window.self !== window.top) {
        // If in an iframe, try to close the parent's iframe
        window.parent.postMessage({ action: 'closeIframe' }, '*');
      } else {
        // If it's a popup window opened with window.open()
        window.close();
      }
    });
  }

  // Handle Add button click
  const addButton = document.querySelector('button[class*="Add"]') || 
                    Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.trim() === 'Add');
  if (addButton && service) {
    addButton.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      try {
        const clientId = window.parent?.document?.getElementById('ClientId')?.value;
        const refId = window.parent?.document?.getElementById('ReferenceNo')?.value;
        const branchId = env.OurBranchID || window.parent?.Environment?.OurBranchID || '';
        const operatorId = env.operatorId || window.parent?.Environment?.operatorId || 'CSADM';

        if (!clientId || !refId) {
          console.warn('ClientId or RefId not available');
          return;
        }

        console.log('Validating current scheme for:', { clientId, refId, branchId, operatorId });

        // Use the service method to validate
        const response = await service.getGroupMemberScheme({
          clientId,
          refId,
          branchId,
          operatorId
        });
        
        console.log('Validation response:', response);
        console.log('Schemes:', response?.schemes);

        if (response?.schemes && response.schemes.length > 0) {
          const updateCount = response.schemes[0].UpdateCount || 0;
          console.log('UpdateCount:', updateCount);

          if (updateCount === 1) {
            // Edit current record - disable Add, enable Edit and Save
            console.log('UpdateCount is 1 - Edit mode');
            if (addButton) addButton.disabled = true;
            const editButton = document.querySelector('button[data-cms-de-action="edit"]');
            if (editButton) editButton.disabled = false;
            const saveButton = document.querySelector('button[data-cms-de-action="save"]');
            if (saveButton) saveButton.disabled = false;
            // Enable JoinDate field for editing
            const joinDateInput = document.getElementById('JoinDate');
            if (joinDateInput) {
              joinDateInput.disabled = false;
              joinDateInput.removeAttribute('readonly');
            }
          } else if (updateCount > 1) {
            // Clear all controls, disable Delete/Add/View/Edit, enable Cancel and Save
            console.log('UpdateCount > 1 - Clear controls');
            clearAllFormFields();
            if (addButton) addButton.disabled = true;
            const viewButton = document.querySelector('button[data-cms-de-action="view"]');
            if (viewButton) viewButton.disabled = true;
            const editButton = document.querySelector('button[data-cms-de-action="edit"]');
            if (editButton) editButton.disabled = true;
            const deleteButton = document.querySelector('button[data-cms-de-action="delete"]');
            if (deleteButton) deleteButton.disabled = true;
            const saveButton = document.querySelector('button[data-cms-de-action="save"]');
            if (saveButton) saveButton.disabled = false;
            const cancelButton = document.querySelector('button[data-cms-de-action="cancel"]');
            if (cancelButton) cancelButton.disabled = false;
            // Enable JoinDate field for new entry
            const joinDateInput = document.getElementById('JoinDate');
            if (joinDateInput) {
              joinDateInput.disabled = false;
              joinDateInput.removeAttribute('readonly');
            }

            // Also enable SchemeID lookup/search and Loan Level No for new entry
            const schemeIdInput = document.getElementById('SchemeId');
            if (schemeIdInput) {
              schemeIdInput.disabled = false;
              schemeIdInput.removeAttribute('readonly');
            }

            const loanLevelNoInput = document.getElementById('LoanLevelNo');
            if (loanLevelNoInput) {
              loanLevelNoInput.disabled = false;
              loanLevelNoInput.removeAttribute('readonly');
            }

            const schemeLookupButton = document.querySelector('button[data-cms-lookup="scheme"]');
            if (schemeLookupButton) schemeLookupButton.disabled = false;

            // Enable Status dropdown and set value to 'A' when updateCount > 1
            const statusSelect = document.getElementById('Status');
            if (statusSelect) {
              statusSelect.disabled = false;
              statusSelect.removeAttribute('readonly');
              statusSelect.value = 'A';
            }
          }
        }
      } catch (error) {
        console.error('Error validating scheme:', error);
      }
    }, true);  // Use capture phase to intercept before other handlers
  }

  // Handle navigation buttons (Previous/Next Record)
  const previousNavButton = document.querySelector('button[data-cms-nav="previous"]');
  const nextNavButton = document.querySelector('button[data-cms-nav="next"]');
  
  // Store current record index and records list
  let currentRecordIndex = 0;
  let recordsList = [];

  // Function to load records for navigation
  async function loadRecordsForNavigation() {
    try {
      const clientId = window.parent?.document?.getElementById('ClientId')?.value;
      const refId = window.parent?.document?.getElementById('ReferenceNo')?.value;
      const branchId = env.OurBranchID || window.parent?.Environment?.OurBranchID || '';
      const operatorId = env.operatorId || window.parent?.Environment?.operatorId || 'CSADM';

      if (!clientId || !refId || !service) {
        return;
      }

      const response = await service.getGroupMemberScheme({
        clientId,
        refId,
        branchId,
        operatorId
      });

      if (response?.schemes && response.schemes.length > 0) {
        recordsList = response.schemes;
        currentRecordIndex = 0;
        updateNavigationButtons();
      }
    } catch (error) {
      console.error('Error loading records for navigation:', error);
    }
  }

  // Function to update navigation buttons state
  function updateNavigationButtons() {
    // Enable buttons if there are any records, disable only if no records
    const hasRecords = recordsList.length > 0;
    
    if (previousNavButton) {
      // Enable if there are records, disable if no records
      previousNavButton.disabled = !hasRecords;
    }
    if (nextNavButton) {
      // Enable if there are records, disable if no records
      nextNavButton.disabled = !hasRecords;
    }
  }

  // Function to navigate to a specific record
  function navigateToRecord(scheme) {
    if (!scheme) return;
    populateSchemeForm(scheme);
    // Disable edit buttons since we're viewing a record
    const addButton = document.querySelector('button[class*="Add"]') || 
                      Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.trim() === 'Add');
    if (addButton) addButton.disabled = true;
    const viewButton = document.querySelector('button[data-cms-de-action="view"]');
    if (viewButton) viewButton.disabled = false;
    const editButton = document.querySelector('button[data-cms-de-action="edit"]');
    if (editButton) editButton.disabled = false;
    const deleteButton = document.querySelector('button[data-cms-de-action="delete"]');
    if (deleteButton) deleteButton.disabled = false;
  }

  // Previous button handler
  if (previousNavButton) {
    previousNavButton.addEventListener('click', async () => {
      try {
        const clientId = window.parent?.document?.getElementById('ClientId')?.value;
        const refId = window.parent?.document?.getElementById('ReferenceNo')?.value;
        const branchId = env.OurBranchID || window.parent?.Environment?.OurBranchID || '';
        const operatorId = env.operatorId || window.parent?.Environment?.operatorId || 'CSADM';
        const currentSchemeId = document.getElementById('SchemeId')?.value;

        if (!clientId || !refId || !currentSchemeId) {
          console.warn('Missing required data for navigation');
          return;
        }

        const response = await service.viewSchemeDetails({
          branchId,
          clientId,
          refId,
          loanSchemeId: currentSchemeId,
          operatorId,
          direction: "-1"
        });

        if (response?.schemeDetails && response.schemeDetails.length > 0) {
          const scheme = response.schemeDetails[0];
          populateSchemeForm(scheme);
          console.log('Navigated to previous scheme:', scheme.LoanSchemeID);
        } else {
          // Show toast message when no more records in that direction
          if (window.parent?.showToast) {
            window.parent.showToast('No More Records in that Direction', 'info');
          } else {
            alert('No More Records in that Direction');
          }
        }
      } catch (error) {
        console.error('Error navigating to previous record:', error);
        if (window.parent?.showToast) {
          window.parent.showToast('Error navigating to previous record', 'error');
        }
      }
    });
  }

  // Next button handler
  if (nextNavButton) {
    nextNavButton.addEventListener('click', async () => {
      try {
        const clientId = window.parent?.document?.getElementById('ClientId')?.value;
        const refId = window.parent?.document?.getElementById('ReferenceNo')?.value;
        const branchId = env.OurBranchID || window.parent?.Environment?.OurBranchID || '';
        const operatorId = env.operatorId || window.parent?.Environment?.operatorId || 'CSADM';
        const currentSchemeId = document.getElementById('SchemeId')?.value;

        if (!clientId || !refId || !currentSchemeId) {
          console.warn('Missing required data for navigation');
          return;
        }

        const response = await service.viewSchemeDetails({
          branchId,
          clientId,
          refId,
          loanSchemeId: currentSchemeId,
          operatorId,
          direction: "1"
        });

        if (response?.schemeDetails && response.schemeDetails.length > 0) {
          const scheme = response.schemeDetails[0];
          populateSchemeForm(scheme);
          console.log('Navigated to next scheme:', scheme.LoanSchemeID);
        } else {
          // Show toast message when no more records in that direction
          if (window.parent?.showToast) {
            window.parent.showToast('No More Records in that Direction', 'info');
          } else {
            alert('No More Records in that Direction');
          }
        }
      } catch (error) {
        console.error('Error navigating to next record:', error);
        if (window.parent?.showToast) {
          window.parent.showToast('Error navigating to next record', 'error');
        }
      }
    });
  }

  // Load records when form is ready
  loadRecordsForNavigation();
  function clearAllFormFields() {
    // Clear all inputs, selects, and textareas in the entire page/modal
    const allInputs = document.querySelectorAll('input, select, textarea');
    allInputs.forEach(input => {
      if (input.type === 'checkbox' || input.type === 'radio') {
        input.checked = false;
      } else {
        input.value = '';
      }
    });
  }

  // Helper function to format request time
  function formatRequestTime(date = new Date()) {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
  }

  // Delete button handler
  const deleteButton = document.querySelector('button[data-cms-de-action="delete"]');
  if (deleteButton) {
    deleteButton.addEventListener('click', async (e) => {
      // Prevent the embedded script handler from running
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      try {
        const clientId = window.parent?.document?.getElementById('ClientId')?.value;
        const refId = window.parent?.document?.getElementById('ReferenceNo')?.value;
        const branchId = env.OurBranchID || window.parent?.Environment?.OurBranchID || '';
        const loanSchemeId = document.getElementById('SchemeId')?.value;

        if (!clientId || !refId || !loanSchemeId) {
          console.warn('Missing required data for deletion');
          if (window.parent?.showToast) {
            window.parent.showToast('Missing required data for deletion', 'error');
          }
          return;
        }

        // Call service to delete scheme
        const response = await service.removeGroupMemberScheme({
          branchId,
          clientId,
          refId,
          loanSchemeId
        });

        if (response?.status === "091") {
          // Failed deletion
          if (window.parent?.showToast) {
            window.parent.showToast(response.message, 'error');
          } else {
            alert(response.message);
          }
          return;
        }

        if (response?.success && response?.details !== null) {
          // Successful deletion - clear controls and update button states
          console.log('Scheme deleted successfully');
          clearAllFormFields();

          // Enable SchemeID textbox, Add, View, Back buttons
          const schemeIdInput = document.getElementById('SchemeId');
          if (schemeIdInput) {
            schemeIdInput.disabled = false;
            schemeIdInput.removeAttribute('readonly');
          }

          const addButton = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.trim() === 'Add');
          if (addButton) addButton.disabled = false;

          const viewButton = document.querySelector('button[data-cms-de-action="view"]');
          if (viewButton) viewButton.disabled = false;

          const backButton = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.trim() === 'Back');
          if (backButton) backButton.disabled = false;

          // Disable Edit, Cancel, Delete, Save buttons
          const editButton = document.querySelector('button[data-cms-de-action="edit"]');
          if (editButton) editButton.disabled = true;

          const cancelButton = document.querySelector('button[data-cms-de-action="cancel"]');
          if (cancelButton) cancelButton.disabled = true;

          if (deleteButton) deleteButton.disabled = true;

          const saveButton = document.querySelector('button[data-cms-de-action="save"]');
          if (saveButton) saveButton.disabled = true;

          // Disable all input controls except SchemeID
          const allInputs = document.querySelectorAll('input, select, textarea');
          allInputs.forEach(input => {
            const inputId = input.id;
            if (inputId !== 'SchemeId') {
              input.disabled = true;
              input.setAttribute('readonly', '');
            }
          });

          // Disable scheme lookup button
          const schemeLookupButton = document.querySelector('button[data-cms-lookup="scheme"]');
          if (schemeLookupButton) schemeLookupButton.disabled = true;

          // Disable navigation buttons
          const previousNavButton = document.getElementById('previousNavButton');
          const nextNavButton = document.getElementById('nextNavButton');
          if (previousNavButton) previousNavButton.disabled = true;
          if (nextNavButton) nextNavButton.disabled = true;

          if (window.parent?.showToast) {
            window.parent.showToast('Scheme deleted successfully', 'success');
          }
        } else {
          // Unknown error
          if (window.parent?.showToast) {
            window.parent.showToast('Error deleting scheme', 'error');
          }
        }
      } catch (error) {
        console.error('Error deleting scheme:', error);
        if (window.parent?.showToast) {
          window.parent.showToast('Error deleting scheme: ' + error.message, 'error');
        }
      }
    }, true);  // Use capture phase to intercept before other handlers
  }

  // Cancel button handler
  const cancelButton = document.querySelector('button[data-cms-de-action="cancel"]');
  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      try {
        // Clear all form controls
        clearAllFormFields();

        // Disable all input controls except SchemeID
        const allInputs = document.querySelectorAll('input, select, textarea');
        allInputs.forEach(input => {
          const inputId = input.id;
          if (inputId !== 'SchemeId') {
            input.disabled = true;
            input.setAttribute('readonly', '');
          }
        });

        // Enable SchemeID textbox
        const schemeIdInput = document.getElementById('SchemeId');
        if (schemeIdInput) {
          schemeIdInput.disabled = false;
          schemeIdInput.removeAttribute('readonly');
          schemeIdInput.focus();
        }

        // Enable Add, View, Back buttons
        const addButton = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.trim() === 'Add');
        if (addButton) addButton.disabled = false;

        const viewButton = document.querySelector('button[data-cms-de-action="view"]');
        if (viewButton) viewButton.disabled = false;

        const backButton = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.trim() === 'Back');
        if (backButton) backButton.disabled = false;

        // Disable Edit, Delete, Save, Cancel buttons
        const editButton = document.querySelector('button[data-cms-de-action="edit"]');
        if (editButton) editButton.disabled = true;

        const deleteButton = document.querySelector('button[data-cms-de-action="delete"]');
        if (deleteButton) deleteButton.disabled = true;

        const saveButton = document.querySelector('button[data-cms-de-action="save"]');
        if (saveButton) saveButton.disabled = true;

        if (cancelButton) cancelButton.disabled = true;

        // Disable scheme lookup button
        const schemeLookupButton = document.querySelector('button[data-cms-lookup="scheme"]');
        if (schemeLookupButton) schemeLookupButton.disabled = true;

        // Disable navigation buttons
        const previousNavButton = document.getElementById('previousNavButton');
        const nextNavButton = document.getElementById('nextNavButton');
        if (previousNavButton) previousNavButton.disabled = true;
        if (nextNavButton) nextNavButton.disabled = true;

        console.log('Cancel operation completed - form cleared and controls reset');
      } catch (error) {
        console.error('Error during cancel operation:', error);
        if (window.parent?.showToast) {
          window.parent.showToast('Error during cancel operation', 'error');
        }
      }
    });
  }

  // Edit button handler
  const editButton = document.querySelector('button[data-cms-de-action="edit"]');
  if (editButton) {
    editButton.addEventListener('click', (e) => {
      // Prevent the embedded script handler from running
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      try {
        // Validate SchemeID and SchemeName are not blank
        const schemeId = document.getElementById('SchemeId')?.value;
        const schemeName = document.getElementById('SchemeName')?.value;

        if (!schemeId || !schemeName) {
          if (window.parent?.showToast) {
            window.parent.showToast('Invalid Scheme ID', 'error');
          } else {
            alert('Invalid Scheme ID');
          }
          return;
        }

        // Disable all input controls except Status and Loan Level No
        const allInputs = document.querySelectorAll('input, select, textarea');
        allInputs.forEach(input => {
          const inputId = input.id;
          if (inputId !== 'Status' && inputId !== 'LoanLevelNo') {
            input.disabled = true;
            input.setAttribute('readonly', '');
          } else {
            input.disabled = false;
            input.removeAttribute('readonly');
          }
        });

        // Disable Add, Edit, Delete, View buttons
        const addButton = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.trim() === 'Add');
        if (addButton) addButton.disabled = true;

        if (editButton) editButton.disabled = true;

        const deleteButton = document.querySelector('button[data-cms-de-action="delete"]');
        if (deleteButton) deleteButton.disabled = true;

        const viewButton = document.querySelector('button[data-cms-de-action="view"]');
        if (viewButton) viewButton.disabled = true;

        // Enable Cancel and Save buttons
        const cancelButton = document.querySelector('button[data-cms-de-action="cancel"]');
        if (cancelButton) cancelButton.disabled = false;

        const saveButton = document.querySelector('button[data-cms-de-action="save"]');
        if (saveButton) saveButton.disabled = false;

        // Disable scheme lookup button
        const schemeLookupButton = document.querySelector('button[data-cms-lookup="scheme"]');
        if (schemeLookupButton) schemeLookupButton.disabled = true;

        // Disable navigation buttons
        const previousNavButton = document.getElementById('previousNavButton');
        const nextNavButton = document.getElementById('nextNavButton');
        if (previousNavButton) previousNavButton.disabled = true;
        if (nextNavButton) nextNavButton.disabled = true;

        console.log('Edit mode enabled - Status and LoanLevelNo are editable');
      } catch (error) {
        console.error('Error during edit operation:', error);
        if (window.parent?.showToast) {
          window.parent.showToast('Error entering edit mode', 'error');
        }
      }
    }, true);  // Use capture phase to intercept before other handlers
  }

  // Save button handler
  const saveButton = document.querySelector('button[data-cms-de-action="save"]');
  if (saveButton) {
    saveButton.addEventListener('click', async (e) => {
      // Prevent the embedded script handler from running
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      try {
        // Validate required fields
        const schemeId = document.getElementById('SchemeId')?.value;
        const schemeName = document.getElementById('SchemeName')?.value;
        const status = document.getElementById('Status')?.value;
        const loanLevelNo = document.getElementById('LoanLevelNo')?.value;

        if (!schemeId || !schemeName || !status || !loanLevelNo) {
          if (window.parent?.showToast) {
            window.parent.showToast('SchemeID, SchemeName, Status, and Loan Level No are required', 'error');
          } else {
            alert('SchemeID, SchemeName, Status, and Loan Level No are required');
          }
          return;
        }

        // Get parent form values
        const clientId = window.parent?.document?.getElementById('ClientId')?.value;
        const refId = window.parent?.document?.getElementById('ReferenceNo')?.value;
        const branchId = env.OurBranchID || window.parent?.Environment?.OurBranchID || '';
        const operatorId = env.operatorId || window.parent?.Environment?.operatorId || 'CSADM';

        if (!clientId || !refId) {
          if (window.parent?.showToast) {
            window.parent.showToast('Missing client information', 'error');
          }
          return;
        }

        // Determine if this is Add or Edit
        const createdBy = document.getElementById('CreatedBy')?.value;
        const createdOn = document.getElementById('CreatedOn')?.value;
        const modifiedBy = document.getElementById('ModifiedBy')?.value;
        const modifiedOn = document.getElementById('ModifiedOn')?.value;
        const supervisedBy = document.getElementById('SupervisedBy')?.value;
        
        // If CreatedBy is empty, it's a new record
        const isNewRecord = !createdBy;
        let updateCount = 1;

        // Get current UpdateCount from the form if it exists
        const currentUpdateCountField = document.getElementById('UpdateCount');
        if (currentUpdateCountField && !isNewRecord) {
          updateCount = parseInt(currentUpdateCountField.value) || 1;
        }

        console.log('Saving scheme:', {
          isNewRecord,
          updateCount,
          schemeId,
          loanLevelNo,
          status,
          createdBy,
          modifiedBy
        });

        // Call service to save scheme
        const response = await service.saveGroupMemberScheme({
          branchId,
          clientId,
          refId,
          loanSchemeId: schemeId,
          loanLevelNo,
          status,
          createdBy: isNewRecord ? operatorId : createdBy,
          createdOn: isNewRecord ? formatRequestTime(new Date()) : createdOn,
          modifiedBy: isNewRecord ? '' : operatorId,
          modifiedOn: isNewRecord ? '' : formatRequestTime(new Date()),
          supervisedBy,
          updateCount
        });

        if (response?.status === "019") {
          // Failed save
          if (window.parent?.showToast) {
            window.parent.showToast(response.message || 'Error On SchemeID', 'error');
          } else {
            alert(response.message || 'Error On SchemeID');
          }
          return;
        }

        if (response?.success && response?.details !== null) {
          // Successful save
          console.log('Scheme saved successfully');

          // Update assignedLoanSchemeId with current SchemeID
          assignedLoanSchemeId = schemeId;

          // Disable Save button and all input controls
          if (saveButton) saveButton.disabled = true;

          const allInputs = document.querySelectorAll('input, select, textarea');
          allInputs.forEach(input => {
            input.disabled = true;
            input.setAttribute('readonly', '');
          });

          // Enable Add, Edit, Delete, Cancel buttons
          const addButton = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.trim() === 'Add');
          if (addButton) addButton.disabled = false;

          const editButton = document.querySelector('button[data-cms-de-action="edit"]');
          if (editButton) editButton.disabled = false;

          const deleteButton = document.querySelector('button[data-cms-de-action="delete"]');
          if (deleteButton) deleteButton.disabled = false;

          const cancelButton = document.querySelector('button[data-cms-de-action="cancel"]');
          if (cancelButton) cancelButton.disabled = false;

          if (window.parent?.showToast) {
            window.parent.showToast('Scheme saved successfully', 'success');
          }
        } else {
          // Unknown error
          if (window.parent?.showToast) {
            window.parent.showToast('Error saving scheme', 'error');
          }
        }
      } catch (error) {
        console.error('Error saving scheme:', error);
        if (window.parent?.showToast) {
          window.parent.showToast('Error saving scheme: ' + error.message, 'error');
        }
      }
    }, true);  // Use capture phase to intercept before other handlers
  }
});
