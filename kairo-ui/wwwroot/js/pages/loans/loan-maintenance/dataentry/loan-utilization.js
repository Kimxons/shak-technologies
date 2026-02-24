/**
 * Loan Utilization Module
 * Aligned with legacy frmLoanUtilization.js
 * Path: Loans > Loan Maintenance > Data Entry > Loan Utilization
 */

(function (global) {
  'use strict';

  console.log('[LoanUtilization] Initializing module...');

  const root = document.querySelector('[data-lutil-root]');
  if (!root) {
    console.error('[LoanUtilization] Root element not found');
    return;
  }

  const $ = (sel) => root.querySelector(sel);
  const $$ = (sel) => Array.from(root.querySelectorAll(sel));

  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  const state = {
    mode: 'view',              // 'view', 'edit', 'add', 'alter'
    rows: [],                  // Current utilization records
    localRows: [],             // Working copy for edits
    removedRows: [],           // Rows marked for removal (to send to DB with ButtonMark 'R')
    selectedIndex: -1,         // Selected row index
    nextSLNo: 1,               // Auto-increment SL No
    parentData: null,          // Data from parent screen
    accountInfo: null,         // Account information from Details01
    hasChanges: false,         // Track unsaved changes
    dataLoaded: false,         // Flag to indicate data has been loaded
    officerMap: {},            // Map of officer IDs to names
    addEnabled: true           // Flag to control Add button (enabled on first load or after Cancel)
  };

  // ============================================================
  // FORM FIELDS
  // ============================================================
  // ============================================================
  // FORM FIELDS (initialized lazily to ensure DOM is ready)
  // ============================================================
  let fields = null;
  
  function getFields() {
    if (!fields) {
      fields = {
        // Account Info (readonly from parent)
        branchID: $('#BranchID'),
        branchName: $('#BranchName'),
        clientID: $('#ClientID'),
        clientName: $('#ClientName'),
        accountID: $('#AccountID'),
        accountName: $('#AccountName'),
        loanSeries: $('#LoanSeries'),
        groupID: $('#GroupID'),
        disbursedAmount: $('#DisbursedAmount'),
        firstDisbursementDate: $('#FirstDisbursementDate'),
        
        // Entry Fields
        slNo: $('#SLNo'),
        utilizeDate: $('#UtilizeDate'),
        verifiedBy: $('#VerifiedBy'),
        officerName: $('#OfficerName'),
        utilizationType: $('#UtilizationType'),
        utilizationAmount: $('#UtilizationAmount'),
        description: $('#Description'),
        
        // Behind The Scene
        createdBy: $('#CreatedBy'),
        createdOn: $('#CreatedOn'),
        modifiedBy: $('#ModifiedBy'),
        modifiedOn: $('#ModifiedOn'),
        supervisedBy: $('#SupervisedBy'),
        supervisedOn: $('#SupervisedOn')
      };
      console.log('[LoanUtilization] Fields initialized:', {
        utilizeDate: !!fields.utilizeDate,
        verifiedBy: !!fields.verifiedBy,
        utilizationType: !!fields.utilizationType,
        utilizationAmount: !!fields.utilizationAmount,
        description: !!fields.description
      });
    }
    return fields;
  }

  const rowsBody = $('[data-lutil-rows]');
  const emptyState = $('[data-lutil-empty]');

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  function isEmbedded() {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }

  function requestClose() {
    if (!isEmbedded()) return;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ action: 'close-child-form' }, '*');
    }
  }

  function getParentData() {
    try {
      if (!isEmbedded()) {
        console.warn('[LoanUtilization] Not embedded, using fallback data');
        return null;
      }

      const parentDoc = global.parent.document;
      const branchID = parentDoc.getElementById('BranchID')?.value || '';
      const clientID = parentDoc.getElementById('ClientID')?.value || '';
      const accountID = parentDoc.getElementById('AccountID')?.value || '';
      const loanSeries = parentDoc.getElementById('LoanSeries')?.value || '';

      console.log('[LoanUtilization] Parent data:', { branchID, clientID, accountID, loanSeries });

      return {
        OurBranchID: branchID,
        ClientID: clientID,
        AccountID: accountID,
        LoanSeries: loanSeries
      };
    } catch (error) {
      console.error('[LoanUtilization] Error getting parent data:', error);
      return null;
    }
  }

  function getOperatorId() {
    try {
      const authService = global.parent?.AuthService || global.AuthService;
      const session = authService?.getSession?.();
      return session?.operatorId || session?.operatorID || session?.name || 'web_portal';
    } catch {
      return 'web_portal';
    }
  }

  function getValue(fieldName) {
    const flds = getFields();
    const el = flds[fieldName];
    return el ? String(el.value || '').trim() : '';
  }

  function setValue(fieldName, value) {
    const flds = getFields();
    const el = flds[fieldName];
    if (el) el.value = value || '';
  }

  function setFieldsEnabled(enabled) {
    const flds = getFields();
    // Note: slNo is always readonly (auto-generated)
    const editableFields = [
      'utilizeDate', 'verifiedBy', 'utilizationType', 'utilizationAmount', 'description'
    ];
    editableFields.forEach(name => {
      const el = flds[name];
      if (el) {
        // Check if this is a Flatpickr input (has _flatpickr instance or is hidden with flatpickr-input class)
        if (el._flatpickr || el.classList.contains('flatpickr-input')) {
          // Handle Flatpickr date picker
          const flatpickrInstance = el._flatpickr;
          if (flatpickrInstance) {
            // Get the visible input element created by Flatpickr
            const visibleInput = flatpickrInstance.altInput || flatpickrInstance.input;
            if (visibleInput) {
              if (enabled) {
                visibleInput.disabled = false;
                visibleInput.removeAttribute('disabled');
                // Re-enable Flatpickr click behavior
                flatpickrInstance.set('clickOpens', true);
              } else {
                visibleInput.disabled = true;
                flatpickrInstance.set('clickOpens', false);
              }
            }
          } else {
            // Flatpickr class but no instance yet - find sibling input
            const container = el.parentElement;
            const visibleInput = container?.querySelector('input[type="text"]:not([type="hidden"])');
            if (visibleInput) {
              if (enabled) {
                visibleInput.disabled = false;
                visibleInput.removeAttribute('disabled');
              } else {
                visibleInput.disabled = true;
              }
            }
          }
          console.log(`[LoanUtilization] Flatpickr field ${name} enabled=${enabled}`);
        } else {
          // Regular input/select element
          if (enabled) {
            el.disabled = false;
            el.removeAttribute('disabled');
            el.removeAttribute('readonly');
          } else {
            el.disabled = true;
          }
          console.log(`[LoanUtilization] Field ${name} enabled=${enabled}, disabled=${el.disabled}`);
        }
      } else {
        console.warn(`[LoanUtilization] Field ${name} not found in DOM`);
      }
    });
    
    // Also enable/disable the officer search button
    const officerSearchBtn = root.querySelector('[data-lookup="officer"]');
    if (officerSearchBtn) {
      if (enabled) {
        officerSearchBtn.disabled = false;
        officerSearchBtn.removeAttribute('disabled');
      } else {
        officerSearchBtn.disabled = true;
      }
    }
  }

  function clearForm() {
    const editableFields = [
      'slNo', 'utilizeDate', 'verifiedBy', 'utilizationType', 'utilizationAmount', 'description'
    ];
    editableFields.forEach(name => {
      setValue(name, '');
    });
  }

  function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB');
    } catch {
      return dateString;
    }
  }

  function showMessage(message, type = 'info') {
    console.log(`[LoanUtilization] ${type.toUpperCase()}:`, message);
    if (type === 'error' || type === 'success') {
      alert(message);
    }
  }

  function validateForm() {
    // Required: Date
    if (!getValue('utilizeDate')) {
      showMessage('Utilize Date is required', 'error');
      return false;
    }

    // Required: Utilization Type
    if (!getValue('utilizationType')) {
      showMessage('Utilization Type is required', 'error');
      return false;
    }

    // Required: Amount
    if (!getValue('utilizationAmount') || parseFloat(getValue('utilizationAmount')) <= 0) {
      showMessage('Utilization Amount must be greater than 0', 'error');
      return false;
    }

    return true;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatNumber(value) {
    if (value === null || value === undefined || value === '') return '';
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDateForInput(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      // Format as YYYY-MM-DD for input[type=date]
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  function render() {
    console.log('[LoanUtilization] Rendering grid with', state.rows.length, 'rows');
    if (!rowsBody) {
      console.error('[LoanUtilization] rowsBody not found!');
      return;
    }

    rowsBody.innerHTML = '';

    if (!state.rows.length) {
      if (emptyState) emptyState.style.display = '';
    } else {
      if (emptyState) emptyState.style.display = 'none';

      state.rows.forEach((row, index) => {
        const tr = document.createElement('tr');
        if (index === state.selectedIndex) tr.classList.add('table-active');
        tr.style.cursor = 'pointer';

        tr.innerHTML = `
          <td>${escapeHtml(row.SLNo || '')}</td>
          <td>${escapeHtml(formatDateForDisplay(row.UtilizeDate))}</td>
          <td>${escapeHtml(row.VerifiedBy || '')}</td>
          <td>${escapeHtml(row.OfficerName || '')}</td>
          <td>${escapeHtml(row.UtilizeType || '')}</td>
          <td class="text-end">${formatNumber(row.UtilizeAmount)}</td>
          <td>${escapeHtml(row.Description || '')}</td>
        `;

        tr.addEventListener('click', () => {
          // Allow selection in view mode or edit mode
          if (state.mode !== 'view' && state.mode !== 'edit') return;
          state.selectedIndex = index;
          applyRowToForm(row);
          render();
        });

        rowsBody.appendChild(tr);
      });
    }

    updateButtonStates();
  }

  function applyRowToForm(row) {
    setValue('slNo', row.SLNo || '');
    setValue('utilizeDate', formatDateForInput(row.UtilizeDate));
    setValue('verifiedBy', row.VerifiedBy || '');
    setValue('officerName', row.OfficerName || '');
    setValue('utilizationType', row.UtilizeTypeID || '');
    setValue('utilizationAmount', row.UtilizeAmount || '');
    setValue('description', row.Description || '');
    
    // Populate Behind The Scene fields
    setValue('createdBy', row.CreatedBy || '');
    setValue('createdOn', formatDateForDisplay(row.CreatedOn) || '');
    setValue('modifiedBy', row.ModifiedBy || '');
    setValue('modifiedOn', formatDateForDisplay(row.ModifiedOn) || '');
    setValue('supervisedBy', row.SupervisedBy || '');
    setValue('supervisedOn', formatDateForDisplay(row.SupervisedOn) || '');
  }

  function readForm() {
    const officerID = getValue('verifiedBy');
    return {
      OurBranchID: getValue('branchID'),
      LoanSeries: parseInt(getValue('loanSeries')) || 0,
      SLNo: getValue('slNo'),
      UtilizeDate: getValue('utilizeDate'),
      UtilizeTypeID: getValue('utilizationType'),
      UtilizeType: getUtilizationTypeText(getValue('utilizationType')),
      UtilizeAmount: parseFloat(getValue('utilizationAmount')) || 0,
      VerifiedBy: officerID,
      OfficerName: state.officerMap[officerID] || '',
      Description: getValue('description'),
      ButtonMark: state.mode === 'alter' ? 'A' : 'N' // A for Alter, N for New
    };
  }

  function getUtilizationTypeText(typeID) {
    const flds = getFields();
    const el = flds.utilizationType;
    if (!el) return '';
    const option = el.querySelector(`option[value="${typeID}"]`);
    return option ? option.textContent : '';
  }

  function setMode(next) {
    state.mode = next;
    console.log('[LoanUtilization] Mode changed to:', next);

    setFieldsEnabled(next !== 'view');
    updateButtonStates();
  }

  function updateButtonStates() {
    const hasSelection = state.selectedIndex >= 0;
    const inEditMode = state.mode === 'edit'; // Edit mode is when Edit button was clicked
    const hasRecords = state.rows.length > 0;
    const hasChanges = state.hasChanges;

    // Horizontal (form) buttons: New, Alter, Remove, Update, Clear
    const btnNew = root.querySelector('[data-action="new"]');
    const btnAlter = root.querySelector('[data-action="alter"]');
    const btnRemove = root.querySelector('[data-action="remove"]');
    const btnUpdate = root.querySelector('[data-action="update"]');
    const btnClear = root.querySelector('[data-action="clear"]');

    // Disable all horizontal buttons by default
    if (btnNew) btnNew.disabled = true;
    if (btnAlter) btnAlter.disabled = true;
    if (btnRemove) btnRemove.disabled = true;
    if (btnUpdate) btnUpdate.disabled = true;
    if (btnClear) btnClear.disabled = true;

    // Horizontal button logic based on mode
    if (state.mode === 'edit') {
      // Edit clicked and NO row selected - enable New
      if (!hasSelection) {
        if (btnNew) btnNew.disabled = false;
      } else {
        // Row is selected - enable Alter, Remove, Update, Clear
        if (btnAlter) btnAlter.disabled = false;
        if (btnRemove) btnRemove.disabled = false;
        if (btnUpdate) btnUpdate.disabled = false;
        if (btnClear) btnClear.disabled = false;
      }
    } else if (state.mode === 'add') {
      // In add mode (New clicked) - enable Update and Clear
      if (btnUpdate) btnUpdate.disabled = false;
      if (btnClear) btnClear.disabled = false;
    } else if (state.mode === 'alter') {
      // In alter mode - enable Update and Clear
      if (btnUpdate) btnUpdate.disabled = false;
      if (btnClear) btnClear.disabled = false;
    }

    // Right-side buttons (View, Add, Edit, Delete, Save, Cancel)
    const btnView = root.querySelector('[data-action="view"]');
    const btnAdd = root.querySelector('[data-action="add"]');
    const btnEdit = root.querySelector('[data-action="edit"]');
    const btnDelete = root.querySelector('[data-action="delete"]');
    const btnSave = root.querySelector('[data-action="save"]');
    const btnCancel = root.querySelector('[data-action="cancel"]');

    // View is always disabled
    if (btnView) btnView.disabled = true;
    
    // Add: Disabled if data exists in grid, otherwise check addEnabled
    if (btnAdd) btnAdd.disabled = hasRecords || !state.addEnabled;
    
    // Edit: Enabled if data exists in grid
    if (btnEdit) btnEdit.disabled = !hasRecords;
    
    // Delete: Disabled (not used in this workflow)
    if (btnDelete) btnDelete.disabled = true;
    
    // Save: Enabled when there are changes
    if (btnSave) btnSave.disabled = !hasChanges;
    
    // Cancel: Always enabled
    if (btnCancel) btnCancel.disabled = false;
  }

  /**
   * Load utilization types from code table using LookupService
   * Uses p_v1_GetSystemCodes with CodeID='UtilizeTypeID'
   */
  async function loadUtilizationTypes() {
    try {
      console.log('[LoanUtilization] Loading utilization types...');

      // Try to use LookupService from parent or global
      const LookupService = global.parent?.LookupService || global.LookupService;
      
      if (LookupService && LookupService.getSystemCodeOptions) {
        // Use LookupService (preferred approach)
        const options = await LookupService.getSystemCodeOptions('UtilizeTypeID');
        console.log('[LoanUtilization] Utilization types loaded via LookupService:', options);

        state.utilizationTypes = options;

        // Populate dropdown
        const flds = getFields();
        const typeSelect = flds.utilizationType;
        if (typeSelect) {
          // Clear existing options
          typeSelect.innerHTML = '';
          
          // Add placeholder
          const placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = '--Select--';
          typeSelect.appendChild(placeholder);

          // Add options from data
          options.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value || '';
            option.textContent = item.label || '';
            typeSelect.appendChild(option);
          });
          
          console.log('[LoanUtilization] Utilization Type dropdown populated with', options.length, 'options');
        }
      } else if (global.parent?.LoanUtilizationService) {
        // Fallback to service getCodeValues
        const response = await global.parent.LoanUtilizationService.getCodeValues({
          CodeID: 'UtilizeTypeID',
          OurBranchID: state.parentData?.OurBranchID || '',
          OperatorID: getOperatorId()
        });

        if (response && response.success) {
          const data = response.Details || response.data || [];
          console.log('[LoanUtilization] Utilization types loaded via service:', data);

          state.utilizationTypes = data;

          // Populate dropdown
          const flds2 = getFields();
          const typeSelect = flds2.utilizationType;
          if (typeSelect) {
            // Clear existing options
            typeSelect.innerHTML = '';
            
            // Add placeholder
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = '--Select--';
            typeSelect.appendChild(placeholder);

            // Add options from data
            data.forEach(item => {
              const option = document.createElement('option');
              option.value = item.SubCodeID || item.CodeID || item.Value || '';
              option.textContent = item.CodeDescription || item.Description || item.Text || '';
              typeSelect.appendChild(option);
            });
            
            console.log('[LoanUtilization] Utilization Type dropdown populated with', data.length, 'options');
          }
        } else {
          console.warn('[LoanUtilization] Failed to load utilization types');
        }
      } else {
        console.warn('[LoanUtilization] Neither LookupService nor LoanUtilizationService available');
      }
    } catch (error) {
      console.error('[LoanUtilization] Error loading utilization types:', error);
    }
  }

  /**
   * Load loan utilization data
   */
  async function loadData() {
    try {
      console.log('[LoanUtilization] Loading data...');

      state.parentData = getParentData();
      if (!state.parentData || !state.parentData.AccountID) {
        showMessage('Cannot load data: Missing AccountID from parent form', 'error');
        return;
      }

      // IMMEDIATELY populate readonly fields from parent data
      setValue('branchID', state.parentData.OurBranchID || '');
      setValue('clientID', state.parentData.ClientID || '');
      setValue('accountID', state.parentData.AccountID || '');
      setValue('loanSeries', state.parentData.LoanSeries || '');

      const service = global.parent?.LoanUtilizationService || global.LoanUtilizationService;
      if (!service) {
        console.warn('[LoanUtilization] LoanUtilizationService not available yet');
        showMessage('Loan Utilization Service not available', 'error');
        return;
      }

      const response = await service.getLoanUtilization({
        OurBranchID: state.parentData.OurBranchID,
        AccountID: state.parentData.AccountID,
        OperatorID: getOperatorId()
      });

      if (response && response.success) {
        console.log('[LoanUtilization] Data loaded:', response);
        console.log('[LoanUtilization] Details01:', response.Details01);
        console.log('[LoanUtilization] Details02:', response.Details02);

        // Extract account info from Details01 (includes names and additional fields)
        if (response.Details01 && response.Details01.length > 0) {
          state.accountInfo = response.Details01[0];
          console.log('[LoanUtilization] Account info:', state.accountInfo);
          
          // Populate all account information fields
          setValue('branchID', state.accountInfo.OurBranchID || '');
          setValue('branchName', state.accountInfo.BranchName || '');
          setValue('clientID', state.accountInfo.ClientID || '');
          setValue('clientName', state.accountInfo.ClientName || '');
          setValue('accountID', state.accountInfo.AccountID || '');
          setValue('accountName', state.accountInfo.AccountName || '');
          setValue('loanSeries', state.accountInfo.LoanSeries || '');
          setValue('groupID', state.accountInfo.GroupID || '');
          setValue('disbursedAmount', state.accountInfo.DisbursedAmount ? parseFloat(state.accountInfo.DisbursedAmount).toFixed(2) : '');
          setValue('firstDisbursementDate', formatDateForDisplay(state.accountInfo.FirstDisbursementDate) || '');
        } else {
          console.warn('[LoanUtilization] No Details01 data found in response');
        }

        // Load utilization records from Details02
        // Mark existing records with ButtonMark 'A' (alter) so they're properly handled during save
        state.rows = (response.Details02 || []).map(row => ({
          ...row,
          ButtonMark: row.ButtonMark || 'A' // Existing records should have 'A' for Alter
        }));
        console.log('[LoanUtilization] Rows loaded:', state.rows.length, 'records');
        state.localRows = JSON.parse(JSON.stringify(state.rows)); // Deep copy for editing
        state.removedRows = []; // Clear removed rows on data load
        
        if (state.localRows.length > 0) {
          state.nextSLNo = Math.max(...state.localRows.map(r => parseInt(r.SLNo) || 0)) + 1;
          // Don't auto-select first row - let user select
          state.selectedIndex = -1;
        } else {
          state.nextSLNo = 1;
          state.selectedIndex = -1;
        }

        state.hasChanges = false;
        state.dataLoaded = true;
        state.addEnabled = true; // Enable Add on first data load
        setMode('view');
        render();
        updateButtonStates();
      } else {
        showMessage(response?.message || 'Failed to load loan utilization', 'error');
      }
    } catch (error) {
      console.error('[LoanUtilization] Error loading data:', error);
      showMessage('Error loading data: ' + error.message, 'error');
    }
  }

  /**
   * Open officer search modal using SearchModal
   * Calls: exec p_GetSearchResult @WhereStmt=N'',@TableID=N'ActiveOfficerID',@RefID=NULL,@PrevOrNext=0,
   *        @AdvFilterString=N'ReportingBranchID=''1201''',@OperatorID=N'MARTIN_MARANGA',@ModuleID=4425,
   *        @OurBranchID=N'1201',@SearchKey=NULL,@LanguageID='en'
   */
  async function openOfficerSearch() {
    try {
      console.log('[LoanUtilization] Opening officer search...');

      const service = global.parent?.LoanUtilizationService || global.LoanUtilizationService;
      if (!service) {
        showMessage('Service not available', 'error');
        return;
      }

      // Check if SearchModal is available (from parent or local)
      const SearchModalClass = global.parent?.SearchModal || global.SearchModal;
      
      if (SearchModalClass) {
        // Use proper SearchModal if available
        if (!state.searchModal) {
          state.searchModal = new SearchModalClass({
            prefix: 'lutil-officer',
            moduleID: 4425,
            getOperatorId: getOperatorId,
            getOurBranchId: () => state.parentData?.OurBranchID || '',
            onError: (msg) => showMessage(msg, 'error')
          });
        }

        state.searchModal.open({
          title: 'Officer Search',
          tableID: 'ActiveOfficerID',
          advFilterString: `ReportingBranchID='${state.parentData?.OurBranchID || ''}'`,
          searchFields: [
            { name: 'OfficerID', label: 'Officer ID', type: 'text' },
            { name: 'Name', label: 'Officer Name', type: 'text' }
          ],
          columns: [
            { key: 'OfficerID', label: 'Officer ID' },
            { key: 'Name', label: 'Officer Name' },
            { key: 'ReportingBranchID', label: 'Branch' }
          ],
          onSelect: (officer) => {
            const selectedOfficerID = officer.OfficerID || officer.ID || '';
            const selectedOfficerName = officer.Name || officer.OfficerName || '';
            
            // Store mapping
            state.officerMap[selectedOfficerID] = selectedOfficerName;
            
            // Set field values
            setValue('verifiedBy', selectedOfficerID);
            setValue('officerName', selectedOfficerName);
            
            console.log('[LoanUtilization] Officer selected:', selectedOfficerID, selectedOfficerName);
          },
          searchFn: async (criteria) => {
            // Build WhereStmt from criteria
            let whereConditions = [];
            if (criteria.OfficerID) {
              whereConditions.push(`OfficerID LIKE '%${criteria.OfficerID}%'`);
            }
            if (criteria.Name) {
              whereConditions.push(`Name LIKE '%${criteria.Name}%'`);
            }
            
            const response = await service.searchOfficers({
              WhereStmt: whereConditions.join(' AND '),
              TableID: 'ActiveOfficerID',
              AdvFilterString: `ReportingBranchID='${state.parentData?.OurBranchID || ''}'`,
              OperatorID: getOperatorId(),
              OurBranchID: state.parentData?.OurBranchID || ''
            });
            
            return response?.Details || response?.data || [];
          }
        });
      } else {
        // Fallback to prompt-based search if SearchModal not available
        const officerID = prompt('Enter Officer ID:');
        if (!officerID) return;

        // Search for officer
        const response = await service.searchOfficers({
          WhereStmt: `OfficerID LIKE '%${officerID}%'`,
          TableID: 'ActiveOfficerID',
          AdvFilterString: `ReportingBranchID='${state.parentData?.OurBranchID || ''}'`,
          OperatorID: getOperatorId(),
          OurBranchID: state.parentData?.OurBranchID || ''
        });

        if (response && response.success && response.Details && response.Details.length > 0) {
          const officer = response.Details[0];
          const selectedOfficerID = officer.OfficerID || officer.ID || '';
          const selectedOfficerName = officer.Name || officer.OfficerName || '';

          // Store mapping
          state.officerMap[selectedOfficerID] = selectedOfficerName;

          // Set field values
          setValue('verifiedBy', selectedOfficerID);
          setValue('officerName', selectedOfficerName);

          console.log('[LoanUtilization] Officer selected:', selectedOfficerID, selectedOfficerName);
        } else {
          showMessage('Officer not found', 'error');
        }
      }
    } catch (error) {
      console.error('[LoanUtilization] Error searching officer:', error);
      showMessage('Error searching officer: ' + error.message, 'error');
    }
  }

  /**
   * Button click handlers
   */
  function onNewClick() {
    console.log('[LoanUtilization] New clicked');
    clearForm();
    state.selectedIndex = -1;
    setValue('slNo', String(state.nextSLNo));
    setMode('add');
    const flds = getFields();
    flds.utilizeDate?.focus();
    render();
  }

  function onAlterClick() {
    if (state.selectedIndex < 0) {
      showMessage('Please select a record to alter', 'error');
      return;
    }
    console.log('[LoanUtilization] Alter clicked');
    setMode('alter');
    render();
  }

  function onRemoveClick() {
    if (state.selectedIndex < 0) {
      showMessage('Please select a record to remove', 'error');
      return;
    }

    if (!confirm('Are you sure you want to remove this utilization record?')) {
      return;
    }

    console.log('[LoanUtilization] Remove clicked');
    
    // Get the row to be removed
    const removedRow = state.rows[state.selectedIndex];
    
    // Mark as removed for save operation (ButtonMark = 'R' for Remove)
    // Only add to removedRows if it's an existing record (not a newly added one)
    if (removedRow && removedRow.ButtonMark !== 'N') {
      removedRow.ButtonMark = 'R';
      state.removedRows.push(removedRow);
    }
    
    // Remove from visible grid
    state.rows.splice(state.selectedIndex, 1);
    state.selectedIndex = -1;
    state.hasChanges = true;
    clearForm();
    // Stay in edit mode
    setMode('edit');
    render();
  }

  async function onUpdateClick() {
    if (!validateForm()) {
      return;
    }

    console.log('[LoanUtilization] Update clicked');
    const formData = readForm();

    if (state.mode === 'add') {
      state.rows.push({
        ...formData,
        ButtonMark: 'N', // N for New record
        UpdateCount: 0
      });
      state.nextSLNo++;
    } else if (state.mode === 'alter') {
      state.rows[state.selectedIndex] = {
        ...state.rows[state.selectedIndex],
        ...formData,
        ButtonMark: 'A' // A for Alter
      };
    }

    state.hasChanges = true;
    clearForm();
    state.selectedIndex = -1;
    // Return to edit mode (not view) so user can continue adding/editing
    setMode('edit');
    render();
  }

  function onClearClick() {
    console.log('[LoanUtilization] Clear clicked');
    // Clear the mid section fields
    clearForm();
    // Reset selection - assume no row has been selected
    state.selectedIndex = -1;
    // Stay in edit mode but with no selection (enables New button)
    if (state.mode === 'alter') {
      setMode('edit');
    }
    render();
  }

  // ============================================================
  // RIGHT-SIDE BUTTON HANDLERS (View, Add, Edit, Delete, Save, Cancel)
  // ============================================================

  /**
   * View button - Load data from database
   */
  async function onViewClick() {
    console.log('[LoanUtilization] View clicked');
    await loadData();
  }

  /**
   * Add button - Enable form for adding new master record (same as New)
   */
  function onAddClick() {
    console.log('[LoanUtilization] Add clicked');
    onNewClick();
  }

  /**
   * Edit button - Enter edit mode to allow modifications
   * If no row selected, New will be enabled. If row selected, Alter/Remove/Update/Clear enabled.
   */
  function onEditClick() {
    console.log('[LoanUtilization] Edit clicked');
    setMode('edit');
    setFieldsEnabled(true); // Enable form fields
    render();
  }

  /**
   * Delete button - Delete loan utilization record from database
   * Calls: exec p_DeleteLoanUtilization @OurBranchID, @AccountID, @LoanSeries
   */
  async function onDeleteClick() {
    console.log('[LoanUtilization] Delete clicked');

    if (state.selectedIndex < 0) {
      showMessage('Please select a record to delete', 'error');
      return;
    }

    // Confirm deletion
    if (!confirm('Are you sure you want to delete this loan utilization record? This action cannot be undone.')) {
      return;
    }

    try {
      const service = global.parent?.LoanUtilizationService || global.LoanUtilizationService;
      if (!service) {
        showMessage('Service not available', 'error');
        return;
      }

      const response = await service.deleteLoanUtilization({
        OurBranchID: state.parentData.OurBranchID,
        AccountID: state.parentData.AccountID,
        LoanSeries: state.parentData.LoanSeries || state.accountInfo?.LoanSeries || '1'
      });

      if (response && response.success) {
        showMessage('Record deleted successfully', 'success');
        
        // Reload data to refresh the grid
        await loadData();
      } else {
        showMessage(response?.message || 'Failed to delete record', 'error');
      }
    } catch (error) {
      console.error('[LoanUtilization] Error deleting record:', error);
      showMessage('Error deleting record: ' + error.message, 'error');
    }
  }

  /**
   * Save button - Save all changes to database
   */
  async function onSaveClick() {
    console.log('[LoanUtilization] Save clicked');
    await saveAllRecords();
  }

  /**
   * Cancel button - Discard changes and reset form
   */
  function onCancelClick() {
    console.log('[LoanUtilization] Cancel clicked');
    
    if (state.hasChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        return;
      }
    }

    // Reset to original data
    state.rows = JSON.parse(JSON.stringify(state.localRows));
    state.removedRows = []; // Clear removed rows
    state.hasChanges = false;
    state.selectedIndex = -1;
    state.addEnabled = true; // Re-enable Add button on Cancel
    clearForm();
    setMode('view');
    render();
    updateButtonStates(); // Ensure button states are updated
    
    // Close the window if embedded
    if (isEmbedded()) {
      requestClose();
    }
  }

  async function saveAllRecords() {
    if (state.rows.length === 0 && state.removedRows.length === 0 && !state.hasChanges) {
      console.log('[LoanUtilization] No records to save');
      showMessage('No changes to save', 'info');
      return;
    }

    try {
      if (!global.parent?.LoanUtilizationService) {
        showMessage('Loan Utilization Service not available', 'error');
        return;
      }

      // Combine visible rows with removed rows (which have ButtonMark 'R')
      const allRecords = [...state.rows, ...state.removedRows];

      const response = await global.parent.LoanUtilizationService.saveLoanUtilization({
        OurBranchID: state.parentData.OurBranchID,
        AccountID: state.parentData.AccountID,
        LoanSeries: state.parentData.LoanSeries,
        OperatedBy: getOperatorId(),
        OperatedOn: '',
        SupervisedBy: '',
        UpdateCount: 1,
        records: allRecords
      });

      if (response && response.success) {
        showMessage('Data Saved Successfully', 'success');
        state.hasChanges = false;
        state.removedRows = []; // Clear removed rows after successful save
        state.addEnabled = true; // Re-enable Add button after successful save
        await loadData();
        setMode('view');
        updateButtonStates();
      } else {
        showMessage(response?.message || 'Failed to save records', 'error');
      }
    } catch (error) {
      console.error('[LoanUtilization] Error saving:', error);
      showMessage('Error saving records: ' + error.message, 'error');
    }
  }

  /**
   * Event binding
   */
  function init() {
    console.log('[LoanUtilization] Initializing...');

    // Bind form action buttons (New, Alter, Remove, Update, Clear)
    const btnNew = root.querySelector('[data-action="new"]');
    const btnAlter = root.querySelector('[data-action="alter"]');
    const btnRemove = root.querySelector('[data-action="remove"]');
    const btnUpdate = root.querySelector('[data-action="update"]');
    const btnClear = root.querySelector('[data-action="clear"]');

    if (btnNew) btnNew.addEventListener('click', onNewClick);
    if (btnAlter) btnAlter.addEventListener('click', onAlterClick);
    if (btnRemove) btnRemove.addEventListener('click', onRemoveClick);
    if (btnUpdate) btnUpdate.addEventListener('click', onUpdateClick);
    if (btnClear) btnClear.addEventListener('click', onClearClick);

    // Bind right-side buttons (View, Add, Edit, Delete, Save, Cancel)
    const btnView = root.querySelector('[data-action="view"]');
    const btnAdd = root.querySelector('[data-action="add"]');
    const btnEdit = root.querySelector('[data-action="edit"]');
    const btnDelete = root.querySelector('[data-action="delete"]');
    const btnSave = root.querySelector('[data-action="save"]');
    const btnCancel = root.querySelector('[data-action="cancel"]');

    if (btnView) btnView.addEventListener('click', onViewClick);
    if (btnAdd) btnAdd.addEventListener('click', onAddClick);
    if (btnEdit) btnEdit.addEventListener('click', onEditClick);
    if (btnDelete) btnDelete.addEventListener('click', onDeleteClick);
    if (btnSave) btnSave.addEventListener('click', onSaveClick);
    if (btnCancel) btnCancel.addEventListener('click', onCancelClick);

    // Bind VerifiedBy search button
    const verifiedByBtn = root.querySelector('[data-lookup="officer"]');
    if (verifiedByBtn) {
      verifiedByBtn.addEventListener('click', openOfficerSearch);
    }

    // Initialize
    setMode('view');
    updateButtonStates();
    
    // Auto-load data on page load
    loadUtilizationTypes();
    loadData();  // Automatically load data from parent screen

    console.log('[LoanUtilization] Initialization complete');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
