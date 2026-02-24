console.log('exit-types-new.js script loaded');

(async function() {
  console.log('IIFE started');
  
  // Wait for ServiceLoader to be available
  while (!window.ServiceLoader) {
    console.log('Waiting for ServiceLoader...');
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  const { ServiceLoader } = window;
  console.log('ServiceLoader:', ServiceLoader);
  
  await ServiceLoader.loadCore();
  console.log('Core loaded');

    await ServiceLoader.loadSearchService();
    console.log('SearchService loaded');

    // Optional services for dropdown lookups (some environments expose lists via SystemCodes/CustomCodes).
    try {
        await ServiceLoader.loadLookupService();
        console.log('LookupService loaded');
    } catch (e) {
        console.warn('LookupService failed to load:', e);
    }

    try {
        await ServiceLoader.loadCustomCodesLookupService();
        console.log('CustomCodesLookupService loaded');
    } catch (e) {
        console.warn('CustomCodesLookupService failed to load:', e);
    }
  
  await ServiceLoader.loadExitTypeService();
  console.log('ExitTypeService loaded');
  
  const ExitTypeService = window.ExitTypeService;
  console.log('ExitTypeService:', ExitTypeService);

  let currentData = null;
  let editMode = false;

    function syncChargeOffTypeEnabled() {
        const chargeOffEl = document.getElementById('chargeOffLoan');
        const selectEl = document.getElementById('exitChargeOffType');
        const metaEl = document.getElementById('exitChargeOffTypeLookupMeta');
        if (!chargeOffEl || !selectEl) return;

        const shouldEnable = !!editMode && !!chargeOffEl.checked;
        selectEl.disabled = !shouldEnable;
        if (metaEl) {
            // Keep the meta line readable in View mode, but hint why it can't be edited.
            if (!editMode) metaEl.title = 'Enable Edit to change this value.';
            else if (!chargeOffEl.checked) metaEl.title = 'Check Charge-Off to select a Charge-Off Type.';
            else metaEl.title = '';
        }
    }

function openExitTypeSearchPanel() {
    const modalElement = document.getElementById('exitTypeLookupModal');
    if (modalElement && window.bootstrap && window.bootstrap.Modal) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        resetExitTypeSearchPanel();
        // Auto-load all rows on open for a "show everything" experience.
        setTimeout(() => performExitTypeSearch(null, true), 100);
    } else {
        console.error('Bootstrap Modal not available or modal element not found');
        showStatus('Search panel not available', 'error');
    }
}

function closeExitTypeSearchPanel() {
    const modalElement = document.getElementById('exitTypeLookupModal');
    const modal = modalElement && window.bootstrap ? bootstrap.Modal.getInstance(modalElement) : null;
    if (modal) modal.hide();
}

function resetExitTypeSearchPanel() {
    const idEl = document.getElementById('exitTypeSearchId');
    const descEl = document.getElementById('exitTypeSearchDesc');
    const modeIdEl = document.getElementById('exitTypeSearchModeId');
    const modeDescEl = document.getElementById('exitTypeSearchModeDesc');
    const resultsEl = document.getElementById('exitTypeSearchResults');
    const emptyEl = document.getElementById('exitTypeSearchEmpty');
    const loadingEl = document.getElementById('exitTypeSearchLoading');

    if (idEl) idEl.value = '';
    if (descEl) descEl.value = '';
    if (modeIdEl) modeIdEl.value = 'Like';
    if (modeDescEl) modeDescEl.value = 'Like';
    if (resultsEl) resultsEl.innerHTML = '';
    if (emptyEl) {
        emptyEl.style.display = 'block';
        emptyEl.textContent = 'Enter a filter and click Search to query exit types.';
    }
    if (loadingEl) loadingEl.classList.add('d-none');
}

async function performExitTypeSearch(event, forceLoadAll = false) {
    if (event) event.preventDefault();

    const idValue = (document.getElementById('exitTypeSearchId')?.value || '').trim();
    const descValue = (document.getElementById('exitTypeSearchDesc')?.value || '').trim();
    const idMode = document.getElementById('exitTypeSearchModeId')?.value || 'Like';
    const descMode = document.getElementById('exitTypeSearchModeDesc')?.value || 'Like';
    const results = document.getElementById('exitTypeSearchResults');
    const empty = document.getElementById('exitTypeSearchEmpty');
    const loading = document.getElementById('exitTypeSearchLoading');

    if (results) results.innerHTML = '';
    if (empty) empty.style.display = 'none';
    if (loading) loading.classList.remove('d-none');

    const clauses = [];
    const buildClause = (col, mode, val) => {
        if (!val) return null;
        const safe = val.replace(/'/g, "''");
        return mode === 'Exact' ? `${col} = '${safe}'` : `${col} like '%${safe}%'`;
    };
    const idClause = buildClause('ExitTypeID', idMode, idValue);
    const descClause = buildClause('Description', descMode, descValue);
    [idClause, descClause].forEach(c => c && clauses.push(c));

    const whereStmt = clauses.join(' AND ');
    if (!whereStmt && !forceLoadAll) {
        if (loading) loading.classList.add('d-none');
        if (empty) {
            empty.textContent = 'Enter at least one filter above and click Search to query exit types.';
            empty.style.display = 'block';
        }
        return;
    }

    const finalWhereStmt = forceLoadAll && !whereStmt ? '1=1' : whereStmt;

    const payload = {
        TableID: 'ExitTypeID',
        WhereStmt: finalWhereStmt,
        AdvFilterString: '',
        PrevOrNext: '1',
        RefID: '',
        OperatorID: 'web_portal',
        ModuleID: 1000,
        OurBranchID: '0101'
    };

    try {
        const service = window.SearchService;
        if (!service || typeof service.search !== 'function') {
            throw new Error('Search service not available');
        }

        const response = await service.search(payload);
        console.log('[ExitTypes Lookup] Raw search response:', response);

        // OldAPI response shapes vary. Normalize to an array of row objects.
        const pickRows = (resp) => {
            const root = resp?.data ?? resp?.Details ?? resp;

            // Direct object with SearchResults
            if (root && typeof root === 'object' && !Array.isArray(root) && Array.isArray(root.SearchResults)) {
                return root.SearchResults;
            }

            // If the payload is an object with a Details array of rows, return that.
            // (This is the shape you're seeing: response.data = { Details: [ {ExitTypeID,...}, ... ] })
            if (root && typeof root === 'object' && !Array.isArray(root) && Array.isArray(root.Details)) {
                // Some procedures put status rows here; for search results, Details is usually the rows.
                const first = root.Details[0];
                const looksLikeRow = first && typeof first === 'object' && (
                    first.ExitTypeID !== undefined ||
                    first.Description !== undefined ||
                    first.ID !== undefined ||
                    first.Name !== undefined
                );
                if (looksLikeRow) return root.Details;

                // Sometimes: { Details: [ { SearchResults: [...] } ] }
                if (root.Details.length && Array.isArray(root.Details[0]?.SearchResults)) {
                    return root.Details[0].SearchResults;
                }
            }

            // Array wrapper: [ { SearchResults: [...] } ]
            if (Array.isArray(root) && root.length === 1 && root[0] && Array.isArray(root[0].SearchResults)) {
                return root[0].SearchResults;
            }

            // Fall back: if root itself is an array, assume it's the rows.
            if (Array.isArray(root)) return root;

            // Last resort: single object row.
            if (root && typeof root === 'object') return [root];
            return [];
        };

        let rows = pickRows(response);
        if (!Array.isArray(rows)) rows = rows ? [rows] : [];

        console.log('[ExitTypes Lookup] Extracted rows:', rows.length, rows.slice(0, 3));

        if (!rows.length) {
            if (empty) {
                empty.textContent = 'No exit types matched the filters.';
                empty.style.display = 'block';
            }
            return;
        }

        rows.sort((a, b) => {
            const aId = (a.ExitTypeID || a.ID || a.Id || '').toString();
            const bId = (b.ExitTypeID || b.ID || b.Id || '').toString();
            return aId.localeCompare(bId, undefined, { numeric: true, sensitivity: 'base' });
        });

        if (results) {
            results.innerHTML = rows.map((r, idx) => {
                const id = r.ExitTypeID || r.ID || r.Id || '';
                const desc = r.Description || r.Name || r.ExitTypeName || '';
                return `<tr data-result-index="${idx}" style="cursor: pointer;">
                    <td>${id}</td>
                    <td>${desc}</td>
                    <td class="text-end">
                        <button type="button" class="btn btn-sm btn-primary" data-result-index="${idx}">Select</button>
                    </td>
                </tr>`;
            }).join('');

            const pick = (idx) => {
                const selectedRow = rows[idx];
                if (selectedRow) selectExitTypeFromLookup(selectedRow);
            };

            results.querySelectorAll('button[data-result-index]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    pick(parseInt(btn.getAttribute('data-result-index'), 10));
                });
            });
            results.querySelectorAll('tr[data-result-index]').forEach(tr => {
                tr.addEventListener('click', (e) => {
                    if (e.target.tagName !== 'BUTTON') {
                        pick(parseInt(tr.getAttribute('data-result-index'), 10));
                    }
                });
            });
        }
    } catch (error) {
        console.error('Exit type search error:', error);
        if (empty) {
            empty.textContent = `Search failed: ${error.message}`;
            empty.style.display = 'block';
        }
    } finally {
        if (loading) loading.classList.add('d-none');
    }
}

function selectExitTypeFromLookup(row) {
    const id = (row.ExitTypeID || row.ID || row.Id || '').toString();
    const desc = row.Description || row.Name || row.ExitTypeName || '';

    document.getElementById('exitTypeId').value = id;
    if (desc) document.getElementById('exitTypeName').value = desc;

    closeExitTypeSearchPanel();
    showStatus(`Selected Exit Type '${id}'`, 'success');
    // Load full record through the normal View flow
    handleView();
}

function loadForm(data, responseData) {
    const firstNonEmpty = (obj, keys, fallback = '') => {
        if (!obj) return fallback;
        for (const key of keys) {
            const val = obj[key];
            if (val !== undefined && val !== null && String(val).trim() !== '') return val;
        }
        return fallback;
    };

    const findFromResponse = (keys, fallback = '') => {
        // 1) check the main record first
        const direct = firstNonEmpty(data, keys, '');
        if (direct !== '') return direct;

        // 2) check any other result sets in the View response
        if (responseData && typeof responseData === 'object') {
            for (const val of Object.values(responseData)) {
                if (!Array.isArray(val)) continue;
                for (const row of val) {
                    const hit = firstNonEmpty(row, keys, '');
                    if (hit !== '') return hit;
                }
            }
        }

        return fallback;
    };

    const formatMaybeDate = (value) => {
        if (value === undefined || value === null || value === '') return '';
        // If it already looks like a string date, keep it as-is
        if (typeof value === 'string') return value;
        try {
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return String(value);
            return d.toLocaleString();
        } catch {
            return String(value);
        }
    };

    const ensureSelectOption = (selectEl, value, text) => {
        if (!selectEl || value === undefined || value === null || String(value) === '') return;
        const valueStr = String(value);
        const existing = Array.from(selectEl.options).find((o) => o.value === valueStr);
        if (existing) return;
        const opt = document.createElement('option');
        opt.value = valueStr;
        opt.textContent = text && String(text).trim() !== '' ? String(text) : valueStr;
        selectEl.appendChild(opt);
    };

    const labelForCycle = (cycle) => {
        const v = String(cycle || '').trim().toUpperCase();
        // Prefer central config labels when available
        const cfg = (window.ExitTypesConfig && Array.isArray(window.ExitTypesConfig.levelOptions))
            ? window.ExitTypesConfig.levelOptions
            : [];
        const found = cfg.find((o) => String(o.value || '').trim().toUpperCase() === v);
        if (found && found.label) return String(found.label);
        // Fallbacks
        if (v === 'SAME') return 'Same Level';
        if (v === 'NEXT') return 'From Next Level';
        if (v === 'FIRST') return 'From First Level';
        if (v === 'CLIENT') return 'Client';
        if (v === 'GROUP') return 'Group';
        if (v === 'CENTER') return 'Center';
        return String(cycle || '');
    };

    // Map API fields to form fields
    document.getElementById('exitTypeId').value = data.ExitTypeID || '';
    document.getElementById('exitTypeName').value = data.Description || '';
    document.getElementById('allowReinstate').checked = data.AllowRein || false;
    
    // Allow Reinstatement nested checkboxes
    document.getElementById('reopenAccounts').checked = data.ReopenAccounts || false;
    document.getElementById('reopenAccounts').disabled = !data.AllowRein;
    document.getElementById('moveOtherGroup').checked = data.AllowToMoveOtherGroup || false;
    document.getElementById('moveOtherGroup').disabled = !data.AllowRein;
    document.getElementById('chargeOffNotRecovered').checked = data.AllowWithOSWriteoff || false;
    document.getElementById('chargeOffNotRecovered').disabled = !data.AllowRein;
    document.getElementById('forfeitNotRecovered').checked = data.AllowWithOSForfeit || false;
    document.getElementById('forfeitNotRecovered').disabled = !data.AllowRein;
    

    // Exit Restrictions
    document.getElementById('notAllowedAfter').value = data.MaxReinDays || '';
    document.getElementById('withinDays').value = data.ReinDays || '';
    const withinLevelVal = data.ReinCycleID || '';
    ensureSelectOption(document.getElementById('withinLevel'), withinLevelVal, labelForCycle(withinLevelVal));
    document.getElementById('withinLevel').value = withinLevelVal;

    // Always set After (Days) to the value of Within (Days) (ReinDays) from the database
    document.getElementById('afterDays').value = data.ReinDays || '';

    const afterLevelVal = data.GraceReinCycleID || '';
    ensureSelectOption(document.getElementById('afterLevel'), afterLevelVal, labelForCycle(afterLevelVal));
    document.getElementById('afterLevel').value = afterLevelVal;

    // Keep the dropdown list in sync with the environment (some deployments expose these via lookups).
    // Intentionally not awaited to avoid blocking the UI.
    if (typeof loadReinCycleLevelOptions === 'function') {
        loadReinCycleLevelOptions(withinLevelVal, afterLevelVal);
    }
    
    // On Exit Behavior
    document.getElementById('forgoInterest').checked = data.ForgoInterestDue || false;
    document.getElementById('forgoCharges').checked = data.ForgoChargesDue || false;
    document.getElementById('forgoFutureInterest').checked = data.ForgoFutureInterest || false;
    document.getElementById('paySavingInterest').checked = data.PaySavingsInterest || false;
    document.getElementById('forfeitSavings').checked = data.ForfeitSavings || false;
    document.getElementById('closeClient').checked = data.CloseClient || false;
    
    // On Loan Outstanding
    document.getElementById('forfeitCollateral').checked = data.ForfeitCollaterals || false;
    document.getElementById('writeOffSavings').checked = data.AllowWriteOff || false;
    document.getElementById('chargeOffLoan').checked = data.IsChargeOff || false;

    // Exit Charge-Off Type
    const exitChargeOffSelect = document.getElementById('exitChargeOffType');
    const chargeOffTypeId = firstNonEmpty(data, ['ExitChargeoffTypeID', 'ExitChargeOffTypeID', 'ChargeOffTypeID', 'ChargeoffTypeID'], '');
    const chargeOffTypeDesc = firstNonEmpty(data, ['ExitChargeoffTypeDesc', 'ExitChargeoffTypeName', 'ExitChargeOffTypeDesc', 'ExitChargeOffTypeName', 'ChargeOffTypeDesc', 'ChargeOffTypeName'], '');
    ensureSelectOption(exitChargeOffSelect, chargeOffTypeId, chargeOffTypeDesc);
    if (exitChargeOffSelect) exitChargeOffSelect.value = String(chargeOffTypeId || '');

    // Respect the rule: only editable when Charge-Off is checked AND we're in edit mode.
    syncChargeOffTypeEnabled();

    // Behind The Scene (counts + audit)
    // Search across all response arrays because some procs return these in a separate result set.
    // In your API response these come from Details01:
    // - TotalExitCurr / TotalExitPrev = Total Exits
    // - TotalExitCurrDeath / TotalExitPrevDeath = Exit For This Type (Death)
    document.getElementById('currentYearExitForType').value = findFromResponse(
        [
            'CurrentYearExitForType', 'CurrYearExitForType', 'CYExitForType', 'ExitForThisTypeCY', 'CurrentYearExitThisType', 'CYExitThisType',
            'TotalExitCurrDeath'
        ],
        ''
    );
    document.getElementById('currentYearTotalExits').value = findFromResponse(
        [
            'CurrentYearTotalExits', 'CurrYearTotalExits', 'CYTotalExits', 'TotalExitsCY', 'CurrentYearTotalExit', 'CYTotalExit',
            'TotalExitCurr'
        ],
        ''
    );
    document.getElementById('previousYearExitForType').value = findFromResponse(
        [
            'PreviousYearExitForType', 'PrevYearExitForType', 'PYExitForType', 'ExitForThisTypePY', 'PreviousYearExitThisType', 'PYExitThisType',
            'TotalExitPrevDeath'
        ],
        ''
    );
    document.getElementById('previousYearTotalExits').value = findFromResponse(
        [
            'PreviousYearTotalExits', 'PrevYearTotalExits', 'PYTotalExits', 'TotalExitsPY', 'PreviousYearTotalExit', 'PYTotalExit',
            'TotalExitPrev'
        ],
        ''
    );

    document.getElementById('createdBy').value = findFromResponse(['CreatedBy', 'Maker', 'InputBy', 'CreatedUser'], '');
    document.getElementById('createdOn').value = formatMaybeDate(findFromResponse(['CreatedOn', 'CreatedDate', 'InputDate', 'CreatedAt'], ''));
    document.getElementById('modifiedBy').value = findFromResponse(['ModifiedBy', 'LastModifiedBy', 'EditedBy', 'UpdatedBy'], '');
    document.getElementById('modifiedOn').value = formatMaybeDate(findFromResponse(['ModifiedOn', 'LastModifiedOn', 'EditedOn', 'UpdatedOn', 'UpdatedAt'], ''));
    document.getElementById('supervisedBy').value = findFromResponse(['SupervisedBy', 'AuthorizedBy', 'ApprovedBy', 'VerifiedBy'], '');
    document.getElementById('supervisedOn').value = formatMaybeDate(findFromResponse(['SupervisedOn', 'AuthorizedOn', 'ApprovedOn', 'VerifiedOn'], ''));
    
    // Show/hide nested reinstatement options
    if (data.AllowRein) {
        document.getElementById('reinstateNested').style.display = 'grid';
    } else {
        document.getElementById('reinstateNested').style.display = 'none';
    }
}

function handleReinstateChange() {
    const enabled = document.getElementById('allowReinstate').checked;
    document.getElementById('reopenAccounts').disabled = !enabled;
    document.getElementById('moveOtherGroup').disabled = !enabled;
    document.getElementById('chargeOffNotRecovered').disabled = !enabled;
    document.getElementById('forfeitNotRecovered').disabled = !enabled;
    
    if (enabled) {
        document.getElementById('reinstateNested').style.display = 'grid';
    } else {
        document.getElementById('reinstateNested').style.display = 'none';
    }
}

async function handleView() {
    console.log('View button clicked');
    const exitTypeId = document.getElementById('exitTypeId').value.trim();
    if (!exitTypeId) {
        showStatus('Enter Exit Type ID to view', 'error');
        return;
    }

    try {
        // Try Direction: 1 instead of 0 (1 might be for retrieval)
        const response = await window.ExitTypeService.getExitTypes({
            OurBranchID: '0101',
            BankID: '00',
            ExitTypeID: exitTypeId,
            OperatorID: 'CSADM',
            Direction: 0 // Changed from 0 to 1
        });

        console.log('API Response:', response);
        console.log('Full response data:', JSON.stringify(response.data, null, 2));

        if (response && response.success) {
            const data = response.data;
            
            // Log all arrays to see what we get
            console.log('Details:', data.Details);
            console.log('Details01:', data.Details01);
            console.log('Details02:', data.Details02);
            
            // Check if Details02 has the actual data
            let exitTypeData = null;
            
            if (data.Details02 && data.Details02.length > 0) {
                exitTypeData = data.Details02[0];
                console.log('Found data in Details02:', exitTypeData);
            } else if (data.Details && data.Details.length > 0 && data.Details[0].NewData) {
                // Maybe NewData contains the JSON string
                try {
                    exitTypeData = JSON.parse(data.Details[0].NewData);
                    console.log('Parsed data from NewData:', exitTypeData);
                } catch (e) {
                    console.log('NewData is not valid JSON or is empty');
                }
            } else if (data.Details && data.Details.length > 0) {
                // Use Details as-is and see if it has the fields
                exitTypeData = data.Details[0];
                console.log('Using Details[0] as data:', exitTypeData);
            }
            
            if (exitTypeData && (exitTypeData.ExitTypeID || exitTypeData.OperatorID)) {
                console.log('Loading form with data:', exitTypeData);
                loadForm(exitTypeData, data);
                currentData = JSON.parse(JSON.stringify(exitTypeData));

                // Ensure Exit Charge-Off Type options load (and log the chosen TableID) right after View.
                // This is intentionally not awaited to avoid blocking UI updates.
                if (typeof loadExitChargeOffTypeOptions === 'function') {
                    loadExitChargeOffTypeOptions(exitTypeData.ExitChargeoffTypeID || exitTypeData.ExitChargeOffTypeID || '');
                }

                // Load correct Within/After Level options for this environment.
                if (typeof loadReinCycleLevelOptions === 'function') {
                    loadReinCycleLevelOptions(exitTypeData.ReinCycleID || '', exitTypeData.GraceReinCycleID || '');
                }

                showStatus(`Exit Type '${exitTypeId}' loaded`, 'success');
                setEditMode(false);
                syncChargeOffTypeEnabled();
                document.querySelector('.action-button.edit').disabled = false;
                document.querySelector('.action-button.delete').disabled = false;
            } else {
                showStatus(`Exit Type ID '${exitTypeId}' not found or has no data. Check if the ID exists in the database.`, 'error');
                console.warn('Response structure does not contain expected exit type fields. The API returned metadata only.');
            }
        } else {
            showStatus(response.message || 'Error loading exit type', 'error');
        }
    } catch (error) {
        console.error('Error loading exit type:', error);
        showStatus('Error loading exit type: ' + error.message, 'error');
    }
}

function handleAdd() {
    clearForm();
    document.getElementById('exitTypeId').disabled = false;
    document.getElementById('exitTypeName').disabled = false;
    editMode = true;
    setEditMode(true);
    syncChargeOffTypeEnabled();
    if (typeof loadReinCycleLevelOptions === 'function') {
        loadReinCycleLevelOptions();
    }
    document.getElementById('exitTypeId').focus();
    showStatus('Enter new exit type details', 'info');
}

function handleEdit() {
    if (!currentData) {
        showStatus('Select Exit Type first', 'error');
        return;
    }
    editMode = !editMode;
    setEditMode(editMode);
    // Keep Exit Type ID disabled during edit (primary key cannot be changed)
    document.getElementById('exitTypeId').disabled = true;
    if (editMode) {
        showStatus('Edit mode enabled', 'info');
    }

    syncChargeOffTypeEnabled();
    if (typeof loadReinCycleLevelOptions === 'function') {
        loadReinCycleLevelOptions(currentData?.ReinCycleID || '', currentData?.GraceReinCycleID || '');
    }
}

async function handleDelete() {
    const exitTypeId = document.getElementById('exitTypeId').value.trim();
    if (!currentData || !exitTypeId) {
        showStatus('View an Exit Type first', 'error');
        return;
    }

    const ok = window.confirm(`Delete Exit Type '${exitTypeId}'? This cannot be undone.`);
    if (!ok) return;

    try {
        showStatus('Deleting exit type...', 'loading');

        const requestData = {
            BankID: '00',
            ExitTypeID: exitTypeId,
            // OldAPI commonly uses NewRecord as an optimistic-lock token for delete.
            NewRecord: currentData?.UpdateCount ?? 0
        };

        console.log('Deleting exit type with data:', requestData);
        const response = await window.ExitTypeService.deleteExitType(requestData);
        console.log('Delete response:', response);

        if (response && response.success) {
            showStatus(`Exit Type '${exitTypeId}' deleted successfully`, 'success');
            clearForm();
        } else {
            showStatus(response?.message || 'Error deleting exit type', 'error');
        }
    } catch (error) {
        console.error('Error deleting exit type:', error);
        showStatus('Error deleting exit type: ' + error.message, 'error');
    }
}

async function handleSave() {
    const exitTypeId = document.getElementById('exitTypeId').value.trim();
    const exitTypeName = document.getElementById('exitTypeName').value.trim();
    
    if (!exitTypeId) {
        showStatus('Exit Type ID required', 'error');
        return;
    }

    if (!exitTypeName) {
        showStatus('Exit Type Name required', 'error');
        return;
    }

    // Validation: Within (Days) should not be more than Not Allowed After (Days)
    const notAllowedAfterValue = parseInt(document.getElementById('notAllowedAfter').value) || 0;
    const withinDaysValue = parseInt(document.getElementById('withinDays').value) || 0;
    if (withinDaysValue > notAllowedAfterValue) {
        showStatus("'Within (Days)' cannot be greater than 'Not Allowed After (Days)'", 'error');
        document.getElementById('withinDays').focus();
        return;
    }
    
    try {
        const isNewRecord = !currentData;
        const operatorId = (window.Environment && window.Environment.operatorId) ? window.Environment.operatorId : 'CSADM';

        const toNull = (value) => {
            if (value === undefined || value === '') return null;
            return value;
        };
        
        // Helper function to format date as MM/DD/YYYY HH:MM:SS
        const formatSqlDateTime = (date) => {
            const d = new Date(date);
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
        };
        
        const now = formatSqlDateTime(new Date());
        
        const withinLevelValue = document.getElementById('withinLevel').value || '';
        const afterLevelValue = document.getElementById('afterLevel').value || '';

        const isChargeOff = document.getElementById('chargeOffLoan').checked;
        const exitChargeoffTypeRaw = document.getElementById('exitChargeOffType')?.value ?? '';
        // Always include ExitChargeoffTypeID; send 0 when not selected to avoid wrappers dropping nulls
        const exitChargeoffTypeId = (exitChargeoffTypeRaw === '' || exitChargeoffTypeRaw === undefined)
            ? 0
            : (Number.isNaN(parseInt(exitChargeoffTypeRaw, 10)) ? exitChargeoffTypeRaw : parseInt(exitChargeoffTypeRaw, 10));

        // Build request with ONLY the exact fields likely in the stored procedure signature
        const requestData = {
            BankID: '00',
            ExitTypeID: exitTypeId,
            Description: exitTypeName,
            AllowRein: document.getElementById('allowReinstate').checked,
            ReopenAccounts: document.getElementById('reopenAccounts').checked,
            AllowToMoveOtherGroup: document.getElementById('moveOtherGroup').checked,
            AllowWithOSWriteoff: document.getElementById('chargeOffNotRecovered').checked,
            AllowWithOSForfeit: document.getElementById('forfeitNotRecovered').checked,
            MaxReinDays: parseInt(document.getElementById('notAllowedAfter').value) || 0,
            ReinCycleID: withinLevelValue || (isNewRecord ? '' : (currentData?.ReinCycleID || '')),
            ReinDays: parseInt(document.getElementById('withinDays').value) || 0,
            GraceReinCycleID: afterLevelValue || (isNewRecord ? '' : (currentData?.GraceReinCycleID || '')),
            ForgoInterestDue: document.getElementById('forgoInterest').checked,
            ForgoChargesDue: document.getElementById('forgoCharges').checked,
            ForgoFutureInterest: document.getElementById('forgoFutureInterest').checked,
            PaySavingsInterest: document.getElementById('paySavingInterest').checked,
            ForfeitSavings: document.getElementById('forfeitSavings').checked,
            CloseClient: document.getElementById('closeClient').checked,
            ForfeitCollaterals: document.getElementById('forfeitCollateral').checked,
            IsChargeOff: document.getElementById('chargeOffLoan').checked,
            AllowWriteOff: document.getElementById('writeOffSavings').checked,
            // Always include ExitChargeoffTypeID (proc expects this parameter)
            ExitChargeoffTypeID: exitChargeoffTypeId,
            // Required audit param per earlier feedback
            CreatedBy: isNewRecord ? operatorId : (currentData?.CreatedBy || operatorId),
            // Include ModifiedBy to satisfy proc requirement
            ModifiedBy: operatorId,
            // OldAPI convention: NewRecord = 1 for insert, else use UpdateCount for edit
            NewRecord: isNewRecord ? 1 : (currentData?.UpdateCount ?? 0)
        };

        // Helper to build filtered payload for a given After(Days) parameter name
        const buildFilteredData = (afterParamName) => {
            const afterDaysValue = parseInt(document.getElementById('afterDays').value) || 0;
            const payload = { ...requestData };
            if (afterParamName) {
                payload[afterParamName] = afterDaysValue;
                payload.__AfterDaysParam = afterParamName;
            }
            // Filter payload keys to avoid "too many arguments" by including
            // only fields present in currentData plus a minimal essential set.
            const essentialKeys = new Set([
                'BankID', 'ExitTypeID', 'Description', 'AllowRein',
                'MaxReinDays', 'ReinCycleID', 'ReinDays', 'GraceReinCycleID',
                'CreatedBy', 'ModifiedBy', 'NewRecord',
                // Include required workflow flags commonly expected by the proc
                'ReopenAccounts', 'AllowToMoveOtherGroup', 'AllowWithOSWriteoff', 'AllowWithOSForfeit',
                'ForgoInterestDue', 'ForgoChargesDue', 'ForgoFutureInterest', 'PaySavingsInterest',
                'ForfeitSavings', 'CloseClient', 'ForfeitCollaterals', 'IsChargeOff', 'AllowWriteOff'
            ]);
            if (afterParamName) essentialKeys.add(afterParamName);
            // Always include ExitChargeoffTypeID to satisfy proc requirement
            essentialKeys.add('ExitChargeoffTypeID');
            const currentKeys = currentData && typeof currentData === 'object' ? Object.keys(currentData) : [];
            currentKeys.forEach(k => essentialKeys.add(k));
            const filtered = Object.fromEntries(Object.entries(payload).filter(([k]) => essentialKeys.has(k)));
            console.log('Saving exit type with data (pre-filter):', payload);
            console.log('Saving exit type with data (filtered):', filtered);
            console.log('currentData:', currentData);
            return filtered;
        };

        // Build ordered list of candidate After(Days) parameter names (strict set)

        // Map After (Days) field to ReinDays parameter (only valid param)
        // Map Within (Days) and After (Days) to correct params
        // Map Not Allowed After (Days) to MaxReinDays
        // Map Within (Days) to ReinDays
        // Do NOT send After (Days) (no matching param)
        const notAllowedAfterValue = parseInt(document.getElementById('notAllowedAfter').value) || 0;
        const withinDaysValue = parseInt(document.getElementById('withinDays').value) || 0;
        const afterDaysValue = parseInt(document.getElementById('afterDays').value) || 0;
        requestData.MaxReinDays = notAllowedAfterValue;
        requestData.ReinDays = withinDaysValue;
        requestData.AfterDays = afterDaysValue; // Always send After (Days) as AfterDays
        console.log('[Save] Not Allowed After (Days) mapped to MaxReinDays:', notAllowedAfterValue);
        console.log('[Save] Within (Days) mapped to ReinDays:', withinDaysValue);
        console.log('[Save] After (Days) sent as AfterDays:', afterDaysValue);

        let response = null;
        // Build filtered payload and save (no retry needed)
        const filteredData = buildFilteredData();
        response = await window.ExitTypeService.addEditExitType(filteredData);
        console.log('Save response:', response);

        if (response && response.success) {
            const action = isNewRecord ? 'created' : 'updated';
            showStatus(`Exit Type '${exitTypeId}' ${action} successfully`, 'success');
            // Re-fetch to get latest data from server
            const viewResponse = await window.ExitTypeService.getExitTypes({
                OurBranchID: '0101',
                BankID: '00',
                ExitTypeID: exitTypeId,
                OperatorID: 'CSADM',
                Direction: 0
            });
            if (viewResponse && viewResponse.success && viewResponse.data.Details02 && viewResponse.data.Details02.length > 0) {
                currentData = viewResponse.data.Details02[0];
                // Refresh form fields with server data so After (Days) reflects persisted value
                loadForm(currentData, viewResponse.data);
            }
            editMode = false;
            setEditMode(false);
            document.querySelector('.action-button.edit').disabled = false;
            document.querySelector('.action-button.delete').disabled = false;
        } else {
            showStatus((response && response.message) || lastErrorMessage || 'Error saving exit type', 'error');
        }
    } catch (error) {
        console.error('Error saving exit type:', error);
        showStatus('Error saving exit type: ' + error.message, 'error');
    }
}

function handleCancel() {
    showStatus('Cancelled', 'info');
    clearForm();
}

function clearForm() {
    document.getElementById('exitTypeId').value = '';
    document.getElementById('exitTypeName').value = '';
    document.getElementById('allowReinstate').checked = false;
    document.getElementById('reopenAccounts').checked = false;
    document.getElementById('moveOtherGroup').checked = false;
    document.getElementById('chargeOffNotRecovered').checked = false;
    document.getElementById('forfeitNotRecovered').checked = false;
    document.getElementById('notAllowedAfter').value = '';
    document.getElementById('withinDays').value = '';
    document.getElementById('withinLevel').value = '';
    document.getElementById('afterDays').value = '';
    document.getElementById('afterLevel').value = '';
    document.getElementById('forgoInterest').checked = false;
    document.getElementById('forgoCharges').checked = false;
    document.getElementById('forgoFutureInterest').checked = false;
    document.getElementById('paySavingInterest').checked = false;
    document.getElementById('forfeitSavings').checked = false;
    document.getElementById('closeClient').checked = false;
    document.getElementById('forfeitCollateral').checked = false;
    document.getElementById('writeOffSavings').checked = false;
    document.getElementById('chargeOffLoan').checked = false;
    const exitChargeOffSelect = document.getElementById('exitChargeOffType');
    if (exitChargeOffSelect) exitChargeOffSelect.value = '';

    document.getElementById('currentYearExitForType').value = '';
    document.getElementById('currentYearTotalExits').value = '';
    document.getElementById('previousYearExitForType').value = '';
    document.getElementById('previousYearTotalExits').value = '';
    document.getElementById('createdBy').value = '';
    document.getElementById('createdOn').value = '';
    document.getElementById('modifiedBy').value = '';
    document.getElementById('modifiedOn').value = '';
    document.getElementById('supervisedBy').value = '';
    document.getElementById('supervisedOn').value = '';
    document.getElementById('reinstateNested').style.display = 'none';
    
    currentData = null;
    editMode = false;
    setEditMode(false);
    syncChargeOffTypeEnabled();
    document.querySelector('.action-button.edit').disabled = true;
    document.querySelector('.action-button.delete').disabled = true;
}

function setEditMode(enabled) {
    // Text inputs
    document.getElementById('exitTypeName').disabled = !enabled;
    document.getElementById('notAllowedAfter').disabled = !enabled;
    document.getElementById('withinDays').disabled = !enabled;
    document.getElementById('withinLevel').disabled = !enabled;
    document.getElementById('afterDays').disabled = !enabled;
    document.getElementById('afterLevel').disabled = !enabled;

    // Dropdowns
    const exitChargeOffSelect = document.getElementById('exitChargeOffType');
    if (exitChargeOffSelect) exitChargeOffSelect.disabled = !enabled;
    
    // Checkboxes
    const allowReinstate = document.getElementById('allowReinstate').checked;
    
    document.getElementById('allowReinstate').disabled = !enabled;
    document.getElementById('reopenAccounts').disabled = !enabled || !allowReinstate;
    document.getElementById('moveOtherGroup').disabled = !enabled || !allowReinstate;
    document.getElementById('chargeOffNotRecovered').disabled = !enabled || !allowReinstate;
    document.getElementById('forfeitNotRecovered').disabled = !enabled || !allowReinstate;
    document.getElementById('forgoInterest').disabled = !enabled;
    document.getElementById('forgoCharges').disabled = !enabled;
    document.getElementById('forgoFutureInterest').disabled = !enabled;
    document.getElementById('paySavingInterest').disabled = !enabled;
    document.getElementById('forfeitSavings').disabled = !enabled;
    document.getElementById('closeClient').disabled = !enabled;
    document.getElementById('forfeitCollateral').disabled = !enabled;
    document.getElementById('writeOffSavings').disabled = !enabled;
    document.getElementById('chargeOffLoan').disabled = !enabled;

    // Keep Exit Charge-Off Type select in sync with Charge-Off checkbox + edit mode.
    syncChargeOffTypeEnabled();
    
    // Buttons
    document.querySelector('.action-button.save').disabled = !enabled;
    document.querySelector('.action-button.delete').disabled = !enabled;
}

// ---------------------------------------------------------------------------
// Toast helpers (aligned with Center Maintenance system)
// ---------------------------------------------------------------------------

function ensureToastContainer() {
    // Prefer a shared Kairo toast container if it already exists
    let el = document.querySelector('[data-kairo-toast-container]');
    if (!el) {
        el = document.getElementById('toastContainer');
    }
    if (el) return el;

    // Otherwise create one (same pattern as center-maintenance-new.js)
    el = document.createElement('div');
    el.className = 'kairo-toast-container';
    el.setAttribute('data-kairo-toast-container', '');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(el);
    return el;
}

function showToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
    const container = ensureToastContainer();

    const toast = document.createElement('div');
    toast.className = `kairo-toast kairo-toast--${variant}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-atomic', 'true');

    const body = document.createElement('div');
    body.className = 'kairo-toast__body';
    body.textContent = String(message || '');

    toast.appendChild(body);
    container.appendChild(toast);

    const remove = () => {
        toast.classList.remove('is-show');
        setTimeout(() => toast.remove(), 300);
    };

    setTimeout(() => toast.classList.add('is-show'), 0);
    if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
}

function showSystemToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
    // Limit to one toast at a time for system-level messages
    const container = ensureToastContainer();
    const existingToasts = container.querySelectorAll('.kairo-toast');
    existingToasts.forEach(t => t.remove());

    showToast(message, { title, variant, timeoutMs });
}

// Backwards-compatible helper - replaces old showStatus function
function showStatus(msg, type = 'info') {
    console.log('[ExitTypes] showStatus:', type, msg);

    let variant = 'info';
    if (type === 'success') variant = 'success';
    else if (type === 'error') variant = 'danger';
    else if (type === 'warning') variant = 'warning';
    else if (type === 'loading') variant = 'info';

    showSystemToast(msg, { title: 'Notice', variant });
}

// Initialize page
console.log('Initializing event listeners...');

const viewBtn = document.querySelector('.action-button.view');
const addBtn = document.querySelector('.action-button.add');
const editBtn = document.querySelector('.action-button.edit');
const deleteBtn = document.querySelector('.action-button.delete');
const saveBtn = document.querySelector('.action-button.save');
const cancelBtn = document.querySelector('.action-button.cancel');
const reinstateCheckbox = document.getElementById('allowReinstate');
const chargeOffCheckbox = document.getElementById('chargeOffLoan');
const searchBtn = document.querySelector('.search-btn');

// Auto-sync After (Days) to match Within (Days) when Within (Days) changes
const withinDaysInput = document.getElementById('withinDays');
const afterDaysInput = document.getElementById('afterDays');
if (withinDaysInput && afterDaysInput) {
    withinDaysInput.addEventListener('input', function() {
        afterDaysInput.value = withinDaysInput.value;
    });
}

console.log('Buttons found:', { viewBtn, addBtn, editBtn, deleteBtn, saveBtn, cancelBtn, reinstateCheckbox, searchBtn });

editBtn.disabled = true;
deleteBtn.disabled = true;
saveBtn.disabled = true;

// Add event listeners for action buttons
viewBtn.addEventListener('click', handleView);
addBtn.addEventListener('click', handleAdd);
editBtn.addEventListener('click', handleEdit);
deleteBtn.addEventListener('click', handleDelete);
saveBtn.addEventListener('click', handleSave);
cancelBtn.addEventListener('click', handleCancel);

// Exit Type ID lookup (magnifier)
searchBtn?.addEventListener('click', openExitTypeSearchPanel);

// Wire lookup modal controls
document.getElementById('exitTypeLookupForm')?.addEventListener('submit', performExitTypeSearch);
document.getElementById('exitTypeSearchReset')?.addEventListener('click', resetExitTypeSearchPanel);
document.getElementById('exitTypeSearchRefresh')?.addEventListener('click', () => {
    resetExitTypeSearchPanel();
    performExitTypeSearch(null, true);
});
document.getElementById('exitTypeSearchCancel')?.addEventListener('click', closeExitTypeSearchPanel);

// Add event listener for allow reinstatement checkbox
reinstateCheckbox.addEventListener('change', handleReinstateChange);

// Enable/disable Exit Charge-Off Type based on Charge-Off selection
chargeOffCheckbox?.addEventListener('change', () => {
    syncChargeOffTypeEnabled();
});

console.log('Event listeners attached successfully');

// Populate Exit Charge-Off Type dropdown options (uses the same p_GetSearchResult service)
async function loadReinCycleLevelOptions(preferWithin = '', preferAfter = '') {
    const withinEl = document.getElementById('withinLevel');
    const afterEl = document.getElementById('afterLevel');
    if (!withinEl || !afterEl) return;

    window.__ExitReinCycleLookup = {
        startedAt: new Date().toISOString(),
        preferWithin: preferWithin || '',
        preferAfter: preferAfter || ''
    };

    const keepWithin = withinEl.value;
    const keepAfter = afterEl.value;

    const preferIds = [preferWithin, preferAfter].filter((v) => String(v || '').trim() !== '').map((v) => String(v).trim());

    const service = window.SearchService;
    const tableIdCandidates = [
        // Most likely: the exact field names.
        'ReinCycleID',
        'GraceReinCycleID',

        // Common variants.
        'ReinCycle',
        'GraceReinCycle',
        'ReinCycleLevel',
        'ReinCycleLevelID',
        'GraceReinCycleLevel',
        'GraceReinCycleLevelID',
        'ReinLevel',
        'ReinLevelID',
        'WithinLevel',
        'AfterLevel'
    ];

    const isStatusRow = (r) => {
        if (!r || typeof r !== 'object') return false;
        const keys = Object.keys(r);
        if (keys.length && keys.every((k) => ['OperatorID', 'EventID', 'NewData', 'CreatedOn', 'UpdateCount', 'NewRecord'].includes(k))) {
            return true;
        }
        if ('OperatorID' in r && 'EventID' in r && keys.length <= 6 && !keys.some((k) => /desc|name|description/i.test(k))) {
            return true;
        }
        return false;
    };

    const extractId = (r) => {
        if (!r || typeof r !== 'object') return '';
        const id = r.ReinCycleID ?? r.GraceReinCycleID ?? r.ReinCycleLevelID ?? r.GraceReinCycleLevelID ?? r.ID ?? r.Id ?? r.Code;
        if (id !== undefined && id !== null && String(id).trim() !== '') return String(id).trim();
        const idKey = Object.keys(r).find((k) => /id$/i.test(k) && r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '');
        if (idKey) return String(r[idKey]).trim();
        const codeKey = Object.keys(r).find((k) => /code$/i.test(k) && r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '');
        if (codeKey) return String(r[codeKey]).trim();
        return '';
    };

    const extractDesc = (r) => {
        if (!r || typeof r !== 'object') return '';
        const desc = r.Description ?? r.Name ?? r.Desc ?? r.Title;
        if (desc !== undefined && desc !== null && String(desc).trim() !== '') return String(desc).trim();
        const key = Object.keys(r).find((k) => /(desc|description|name|title)$/i.test(k) && r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '');
        if (key) return String(r[key]).trim();
        return '';
    };

    const scoreRows = (arr) => {
        if (!Array.isArray(arr) || !arr.length) return 0;
        let score = 0;
        for (const r of arr.slice(0, 25)) {
            if (!r || typeof r !== 'object' || isStatusRow(r)) continue;
            const id = extractId(r);
            const desc = extractDesc(r);
            if (id) score += 2;
            if (desc) score += 1;
        }
        return score;
    };

    const pickRows = (resp) => {
        const root = resp?.data ?? resp;
        if (root && typeof root === 'object' && !Array.isArray(root) && Array.isArray(root.SearchResults)) return root.SearchResults;
        if (root && typeof root === 'object' && !Array.isArray(root)) {
            const arrays = Object.entries(root)
                .filter(([, v]) => Array.isArray(v) && v.length)
                .map(([k, v]) => ({ key: k, rows: v, score: scoreRows(v) }))
                .sort((a, b) => b.score - a.score);
            if (arrays.length && arrays[0].score > 0) return arrays[0].rows;
            if (Array.isArray(root.Details) && Array.isArray(root.Details[0]?.SearchResults)) return root.Details[0].SearchResults;
            if (Array.isArray(root.Details)) return root.Details;
        }
        if (Array.isArray(root)) return root;
        if (root && typeof root === 'object') return [root];
        return [];
    };

    const applyOptions = (rows) => {
        const seen = new Set();
        const options = (rows || [])
            .map((r) => {
                const id = extractId(r);
                const desc = extractDesc(r);
                return { id, desc };
            })
            .filter((o) => o.id && String(o.id).trim() !== '')
            .filter((o) => {
                const key = String(o.id).trim();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

        // Replace only if we actually found a lookup list; otherwise keep existing hardcoded options.
        if (!options.length) return;

        withinEl.innerHTML = '<option value="">~Select~</option>';
        afterEl.innerHTML = '<option value="">~Select~</option>';

        for (const o of options) {
            const label = (o.desc && String(o.desc).trim() !== '') ? String(o.desc).trim() : String(o.id).trim();
            const opt1 = document.createElement('option');
            opt1.value = String(o.id).trim();
            opt1.textContent = label;
            withinEl.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = String(o.id).trim();
            opt2.textContent = label;
            afterEl.appendChild(opt2);
        }
    };

    const applyConfigOptions = () => {
        const envOpts = (window.Environment && Array.isArray(window.Environment.exitLevelOptions))
            ? window.Environment.exitLevelOptions
            : null;
        const cfgOpts = (window.ExitTypesConfig && Array.isArray(window.ExitTypesConfig.levelOptions))
            ? window.ExitTypesConfig.levelOptions
            : [];
        const options = Array.isArray(envOpts) && envOpts.length ? envOpts : cfgOpts;

        if (!Array.isArray(options) || !options.length) return;

        withinEl.innerHTML = '<option value="">~Select~</option>';
        afterEl.innerHTML = '<option value="">~Select~</option>';

        for (const o of options) {
            const value = String(o.value || '').trim();
            if (!value) continue;
            const label = String(o.label || labelForCycle(value));
            const opt1 = document.createElement('option');
            opt1.value = value;
            opt1.textContent = label;
            withinEl.appendChild(opt1);
            const opt2 = document.createElement('option');
            opt2.value = value;
            opt2.textContent = label;
            afterEl.appendChild(opt2);
        }
    };

    try {
        let rows = [];
        let chosen = '';
        let source = '';

        // 1) Try p_GetSearchResult
        if (service && typeof service.search === 'function') {
            source = 'p_GetSearchResult';
            for (const tableId of tableIdCandidates) {
                const payload = {
                    TableID: tableId,
                    WhereStmt: '1=1',
                    AdvFilterString: '',
                    PrevOrNext: '1',
                    RefID: '',
                    OperatorID: 'web_portal',
                    ModuleID: 1000,
                    OurBranchID: '0101'
                };

                let resp;
                try {
                    resp = await service.search(payload);
                } catch {
                    continue;
                }

                const candidateRows = pickRows(resp);
                const filtered = (candidateRows || []).filter((r) => {
                    if (!r || typeof r !== 'object' || isStatusRow(r)) return false;
                    return extractId(r) !== '';
                });

                const containsPreferred = preferIds.length
                    ? filtered.some((r) => preferIds.includes(String(extractId(r)).trim()))
                    : false;

                if (containsPreferred) {
                    rows = filtered;
                    chosen = tableId;
                    break;
                }
                if (!rows.length && filtered.length) {
                    rows = filtered;
                    chosen = tableId;
                }
            }
        }

        // 2) Fallback: SystemCodes
        if (!rows.length && window.LookupService && typeof window.LookupService.getSystemCodeOptions === 'function') {
            source = 'SystemCodes';
            for (const codeId of tableIdCandidates) {
                try {
                    const opts = await window.LookupService.getSystemCodeOptions(codeId);
                    if (!Array.isArray(opts) || !opts.length) continue;
                    const mapped = opts.map((o) => ({ ID: o.value, Description: o.label })).filter((o) => o.ID && String(o.ID).trim() !== '');
                    const containsPreferred = preferIds.length
                        ? mapped.some((o) => preferIds.includes(String(o.ID).trim()))
                        : false;
                    if (containsPreferred) {
                        rows = mapped;
                        chosen = codeId;
                        break;
                    }
                    if (!rows.length) {
                        rows = mapped;
                        chosen = codeId;
                    }
                } catch {
                    // ignore
                }
            }
        }

        // 3) Fallback: CustomCodes
        if (!rows.length && window.customCodesLookupService && typeof window.customCodesLookupService.getCustomCodeOptions === 'function') {
            source = 'CustomCodes';
            for (const codeId of tableIdCandidates) {
                try {
                    const opts = await window.customCodesLookupService.getCustomCodeOptions(codeId);
                    if (!Array.isArray(opts) || !opts.length) continue;
                    const mapped = opts.map((o) => ({ ID: o.value, Description: o.label })).filter((o) => o.ID && String(o.ID).trim() !== '');
                    const containsPreferred = preferIds.length
                        ? mapped.some((o) => preferIds.includes(String(o.ID).trim()))
                        : false;
                    if (containsPreferred) {
                        rows = mapped;
                        chosen = codeId;
                        break;
                    }
                    if (!rows.length) {
                        rows = mapped;
                        chosen = codeId;
                    }
                } catch {
                    // ignore
                }
            }
        }

        window.__ExitReinCycleLookup = {
            ...(window.__ExitReinCycleLookup || {}),
            finishedAt: new Date().toISOString(),
            chosen: chosen || '',
            source: source || '',
            rowCount: Array.isArray(rows) ? rows.length : 0
        };

        if (Array.isArray(rows) && rows.length) {
            // Backend-provided options override config
            applyOptions(rows);
        } else {
            // Use central config/environment-defined options
            applyConfigOptions();
        }

        // Preserve current selections (even if the list didn't load or doesn't include them).
        if (keepWithin && !Array.from(withinEl.options).some((o) => o.value === keepWithin)) {
            ensureSelectOption(withinEl, keepWithin, labelForCycle(keepWithin));
        }
        if (keepAfter && !Array.from(afterEl.options).some((o) => o.value === keepAfter)) {
            ensureSelectOption(afterEl, keepAfter, labelForCycle(keepAfter));
        }
    } catch (e) {
        console.warn('[ReinCycleLevel] Failed to load options:', e);
    } finally {
        withinEl.value = keepWithin || '';
        afterEl.value = keepAfter || '';
    }
}

async function loadExitChargeOffTypeOptions(preferId = '') {
    const selectEl = document.getElementById('exitChargeOffType');
    if (!selectEl) return;

    // Expose the most recent lookup decision for quick inspection in DevTools.
    // (e.g., window.__ExitChargeOffTypeLookup)
    window.__ExitChargeOffTypeLookup = {
        startedAt: new Date().toISOString(),
        preferId: preferId || ''
    };

    console.log('[ExitChargeOffType] Loading options. preferred:', preferId || '(none)');

    const keep = selectEl.value;

    // Reset to the default option
    selectEl.innerHTML = '<option value="">~Select~</option>';

    const service = window.SearchService;
    if (!service || typeof service.search !== 'function') {
        // Restore any previous value if present
        selectEl.value = keep || '';
        return;
    }

    // TableID is environment-specific. Try a few common variants and pick the first that returns
    // rows that look like an ID/Description list.
    const tableIdCandidates = [
        // Most likely candidates based on naming patterns in this codebase.
        'ExitChargeoffTypeID',
        'ExitChargeOffTypeID',
        'ChargeoffTypeID',
        'ChargeOffTypeID',

        // Common non-ID table names some environments use.
        'ExitChargeoffType',
        'ExitChargeOffType',
        'ChargeoffType',
        'ChargeOffType'
    ];

    try {
        let rows = [];
        let chosenTableId = '';
        let source = 'p_GetSearchResult';

        const isStatusRow = (r) => {
            if (!r || typeof r !== 'object') return false;
            const keys = Object.keys(r);
            // Typical status/meta row from OldAPI wrappers.
            if (keys.length && keys.every((k) => ['OperatorID', 'EventID', 'NewData', 'CreatedOn', 'UpdateCount', 'NewRecord'].includes(k))) {
                return true;
            }
            // Another common shape.
            if ('OperatorID' in r && 'EventID' in r && keys.length <= 6 && !keys.some((k) => /desc|name|description/i.test(k))) {
                return true;
            }
            return false;
        };

        const extractId = (r) => {
            if (!r || typeof r !== 'object') return '';
            // Prefer explicit ID-ish fields.
            const id = r.ExitChargeoffTypeID ?? r.ExitChargeOffTypeID ?? r.ChargeoffTypeID ?? r.ChargeOffTypeID ?? r.ID ?? r.Id;
            if (id !== undefined && id !== null && String(id).trim() !== '') return String(id).trim();
            // Fallback: find first property that ends with 'ID'
            const idKey = Object.keys(r).find((k) => /id$/i.test(k) && r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '');
            if (idKey) return String(r[idKey]).trim();
            // Last resort: if a "Code" exists.
            const codeKey = Object.keys(r).find((k) => /code$/i.test(k) && r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '');
            if (codeKey) return String(r[codeKey]).trim();
            return '';
        };

        const extractDesc = (r) => {
            if (!r || typeof r !== 'object') return '';
            const desc = r.Description ?? r.Name ?? r.ExitChargeoffTypeDesc ?? r.ExitChargeOffTypeDesc ?? r.ChargeOffTypeDesc ?? r.ChargeoffTypeDesc;
            if (desc !== undefined && desc !== null && String(desc).trim() !== '') return String(desc).trim();
            // Fallback: find first property that looks like a description/name.
            const key = Object.keys(r).find((k) => /(desc|description|name|title)$/i.test(k) && r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '');
            if (key) return String(r[key]).trim();
            return '';
        };

        const scoreRows = (arr) => {
            if (!Array.isArray(arr) || !arr.length) return 0;
            let score = 0;
            const sample = arr.slice(0, 25);
            for (const r of sample) {
                if (!r || typeof r !== 'object' || isStatusRow(r)) continue;
                const id = extractId(r);
                const desc = extractDesc(r);
                if (id) score += 2;
                if (desc) score += 1;
                // Bonus if the row has an explicit ExitChargeoffTypeID.
                if (r.ExitChargeoffTypeID || r.ExitChargeOffTypeID) score += 3;
            }
            return score;
        };

        const pickRows = (resp) => {
            const root = resp?.data ?? resp;

            // Standard shape.
            if (root && typeof root === 'object' && !Array.isArray(root) && Array.isArray(root.SearchResults)) {
                return root.SearchResults;
            }

            // Scan all arrays: Details, Details01, Details02, etc.
            if (root && typeof root === 'object' && !Array.isArray(root)) {
                const arrays = Object.entries(root)
                    .filter(([, v]) => Array.isArray(v) && v.length)
                    .map(([k, v]) => ({ key: k, rows: v, score: scoreRows(v) }))
                    .sort((a, b) => b.score - a.score);

                if (arrays.length && arrays[0].score > 0) {
                    return arrays[0].rows;
                }

                // Sometimes: Details: [ { SearchResults: [...] } ]
                if (Array.isArray(root.Details) && Array.isArray(root.Details[0]?.SearchResults)) {
                    return root.Details[0].SearchResults;
                }

                // Fallback: if Details exists, return it.
                if (Array.isArray(root.Details)) return root.Details;
            }

            if (Array.isArray(root)) return root;
            if (root && typeof root === 'object') return [root];
            return [];
        };

        for (const tableId of tableIdCandidates) {
            const payload = {
                TableID: tableId,
                WhereStmt: '1=1',
                AdvFilterString: '',
                PrevOrNext: '1',
                RefID: '',
                OperatorID: 'web_portal',
                ModuleID: 1000,
                OurBranchID: '0101'
            };

            let resp;
            try {
                resp = await service.search(payload);
            } catch (err) {
                console.warn('[ExitChargeOffType] TableID failed:', tableId, err);
                continue;
            }

            const candidateRows = pickRows(resp);

            // Keep rows that look like a lookup list (ID present). Description is optional.
            const filtered = (candidateRows || []).filter((r) => {
                if (!r || typeof r !== 'object' || isStatusRow(r)) return false;
                const idVal = extractId(r);
                return idVal !== '';
            });

            // Use console.log (not debug) so it shows even when "Verbose" logs are hidden.
            console.log('[ExitChargeOffType] TableID tried:', tableId, 'rows:', (candidateRows || []).length, 'filtered:', filtered.length, 'sample:', (candidateRows || []).slice(0, 2));

            // Strong signal: the list contains the currently selected ID.
            const containsPreferred = preferId
                ? filtered.some((r) => String(extractId(r)).trim() === String(preferId).trim())
                : false;

            if (containsPreferred) {
                rows = filtered;
                chosenTableId = tableId;
                break;
            }

            // Fallback: first list that looks valid.
            if (!rows.length && filtered.length > 0) {
                rows = filtered;
                chosenTableId = tableId;
            }
        }

        // Fallback 1: System codes (p_v1_GetSystemCodes via LookupService)
        if (!rows.length && window.LookupService && typeof window.LookupService.getSystemCodeOptions === 'function') {
            source = 'SystemCodes';
            const tryCodeIds = tableIdCandidates;
            for (const codeId of tryCodeIds) {
                try {
                    const opts = await window.LookupService.getSystemCodeOptions(codeId);
                    if (Array.isArray(opts) && opts.length) {
                        const mapped = opts
                            .map((o) => ({ ID: o.value, Description: o.label }))
                            .filter((o) => o.ID && String(o.ID).trim() !== '');

                        const containsPreferred = preferId
                            ? mapped.some((o) => String(o.ID).trim() === String(preferId).trim())
                            : false;

                        if (containsPreferred) {
                            rows = mapped;
                            chosenTableId = codeId;
                            break;
                        }

                        if (!rows.length) {
                            rows = mapped;
                            chosenTableId = codeId;
                        }
                    }
                } catch (e) {
                    // ignore and continue
                }
            }
        }

        // Fallback 2: Custom dropdown codes (dbo.p_v1_GetCustomDropDownCodes)
        if (!rows.length && window.customCodesLookupService && typeof window.customCodesLookupService.getCustomCodeOptions === 'function') {
            source = 'CustomCodes';
            const tryCodeIds = tableIdCandidates;
            for (const codeId of tryCodeIds) {
                try {
                    const opts = await window.customCodesLookupService.getCustomCodeOptions(codeId);
                    if (Array.isArray(opts) && opts.length) {
                        const mapped = opts
                            .map((o) => ({ ID: o.value, Description: o.label }))
                            .filter((o) => o.ID && String(o.ID).trim() !== '');

                        const containsPreferred = preferId
                            ? mapped.some((o) => String(o.ID).trim() === String(preferId).trim())
                            : false;

                        if (containsPreferred) {
                            rows = mapped;
                            chosenTableId = codeId;
                            break;
                        }

                        if (!rows.length) {
                            rows = mapped;
                            chosenTableId = codeId;
                        }
                    }
                } catch (e) {
                    // ignore and continue
                }
            }
        }

        if (chosenTableId) {
            console.log('[ExitChargeOffType] Using TableID:', chosenTableId, 'source:', source, 'preferred:', preferId || '(none)');
        } else {
            console.warn('[ExitChargeOffType] No matching TableID found for Exit Charge-Off Type. Candidates tried:', tableIdCandidates);
        }

        window.__ExitChargeOffTypeLookup = {
            ...(window.__ExitChargeOffTypeLookup || {}),
            finishedAt: new Date().toISOString(),
            chosenTableId: chosenTableId || '',
            rowCount: rows.length
        };

        rows.forEach((r) => {
            const id = extractId(r) || (r.ID !== undefined && r.ID !== null ? String(r.ID).trim() : '');
            const desc = extractDesc(r) || (r.Description !== undefined && r.Description !== null ? String(r.Description).trim() : '');
            if (!id) return;
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = desc || id;
            selectEl.appendChild(opt);
        });

        // If the current value isn't in the loaded list, keep it visible rather than clearing selection.
        if (keep && !Array.from(selectEl.options).some((o) => o.value === keep)) {
            const opt = document.createElement('option');
            opt.value = keep;
            opt.textContent = keep;
            selectEl.appendChild(opt);
        }
    } catch (e) {
        console.warn('Failed to load Exit Charge-Off Type options:', e);
    } finally {
        selectEl.value = keep || '';
    }
}

loadExitChargeOffTypeOptions();
loadReinCycleLevelOptions();
})();
