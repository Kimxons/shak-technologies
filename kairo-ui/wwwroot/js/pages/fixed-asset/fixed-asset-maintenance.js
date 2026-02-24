(() => {
  if (window.__kairoFixedAssetMaintenanceLoaded) return;
  window.__kairoFixedAssetMaintenanceLoaded = true;

  // ========== Mode Constants ==========
  const MODES = {
    VIEW: 'View',
    ADD: 'Add',
    UPDATE: 'Update'
  };

  // ========== State Management ==========
  const famState = {
    mode: MODES.VIEW,
    hasLoaded: false,
    canAddFromId: false,
    originalData: null
  };

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function getSessionSafe() {
    try {
      return window.AuthService?.getSession?.() || null;
    } catch {
      return null;
    }
  }

  function formatSmallDateTime(date = new Date()) {
    // Use GlobalUtils for consistent date formatting
    if (window.GlobalUtils?.formatDateTime) {
      return window.GlobalUtils.formatDateTime(date);
    }
    // Fallback if GlobalUtils not available
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function getActionButton(action) {
    const desired = String(action || '').trim().toLowerCase();
    // Try new data-fam-action attribute first
    const newBtn = qs(`[data-fam-action="${desired}"]`);
    if (newBtn) return newBtn;
    // Fallback to legacy selector
    return qsa('.cm-legacy-actions .cm-shell__action').find(
      (btn) => (btn.textContent || '').trim().toLowerCase() === desired
    );
  }

  function getFamActionButtons() {
    return {
      view: qs('[data-fam-action="view"]'),
      add: qs('[data-fam-action="add"]'),
      edit: qs('[data-fam-action="edit"]'),
      del: qs('[data-fam-action="delete"]'),
      save: qs('[data-fam-action="save"]'),
      cancel: qs('[data-fam-action="cancel"]')
    };
  }

  function setButtonDisabled(buttonEl, disabled) {
    if (!buttonEl) return;
    const isDisabled = !!disabled;
    buttonEl.disabled = isDisabled;
    if (isDisabled) {
      buttonEl.setAttribute('disabled', '');
      buttonEl.setAttribute('aria-disabled', 'true');
    } else {
      buttonEl.removeAttribute('disabled');
      buttonEl.setAttribute('aria-disabled', 'false');
    }
  }

  function setButtonActive(buttonEl, active) {
    if (!buttonEl) return;
    if (active) {
      buttonEl.classList.add('active');
    } else {
      buttonEl.classList.remove('active');
    }
  }

  function updateFamActionButtons() {
    const { view, add, edit, del, save, cancel } = getFamActionButtons();

    const isEditable = famState.mode === MODES.ADD || famState.mode === MODES.UPDATE;
    const canCancelInView = famState.hasLoaded || famState.canAddFromId;

    // View button: active in VIEW mode
    setButtonActive(view, famState.mode === MODES.VIEW);
    setButtonDisabled(view, false); // Always enabled

    // Add button: active in ADD mode
    setButtonActive(add, famState.mode === MODES.ADD);
    setButtonDisabled(add, famState.mode === MODES.UPDATE); // Disabled only in UPDATE mode

    // Edit button: enabled in VIEW mode when a record is loaded
    setButtonActive(edit, famState.mode === MODES.UPDATE);
    setButtonDisabled(edit, !(famState.mode === MODES.VIEW && famState.hasLoaded));

    // Delete button: enabled in VIEW mode when a record is loaded
    setButtonDisabled(del, !(famState.mode === MODES.VIEW && famState.hasLoaded));

    // Save button: enabled in ADD/UPDATE mode
    setButtonDisabled(save, !isEditable);

    // Cancel button: enabled in ADD/UPDATE mode
    setButtonDisabled(cancel, !isEditable);

    console.log(`[FixedAssetMaintenance] Mode: ${famState.mode}, hasLoaded: ${famState.hasLoaded}`);
  }

  function setFamMode(nextMode) {
    famState.mode = nextMode;

    const root = qs('.main-content') || document;

    // Define editable fields based on mode
    qsa('input, select, textarea', root).forEach((field) => {
      // Always-enabled fields stay editable regardless of mode
      if (field.hasAttribute('data-always-enabled')) {
        field.disabled = false;
        return;
      }

      // Skip readonly/audit fields
      if (field.hasAttribute('readonly')) {
        field.disabled = true;
        return;
      }

      // Behind the scene fields are always readonly
      const isBehindScene = field.closest('[data-section="behind-the-scene"]');
      if (isBehindScene) {
        field.disabled = true;
        return;
      }

      // In VIEW mode, disable all editable fields
      if (nextMode === MODES.VIEW) {
        field.disabled = true;
        return;
      }

      // In UPDATE mode, enable most fields
      if (nextMode === MODES.UPDATE) {
        // Asset ID should not be editable in UPDATE mode
        if (field.id === 'assetId' || field.id === 'branchId') {
          field.disabled = true;
        } else {
          field.disabled = false;
        }
        return;
      }

      // In ADD mode, all fields are editable
      if (nextMode === MODES.ADD) {
        field.disabled = false;
        return;
      }
    });

    updateFamActionButtons();
  }

  function clearFamForm() {
    const root = qs('.main-content') || document;
    const fields = qsa('input, select, textarea', root);
    
    fields.forEach((field) => {
      // Keep branch ID
      if (field.id === 'branchId' || field.id === 'branchName') return;
      
      if (field.type === 'checkbox') {
        field.checked = false;
        return;
      }
      
      if (field.tagName === 'SELECT') {
        field.selectedIndex = 0;
        return;
      }
      
      field.value = '';
    });

    famState.hasLoaded = false;
    famState.canAddFromId = false;
    famState.originalData = null;
  }

  function showToast(message, variant = 'success') {
    // Always use kairo-toast which has proper CSS styling
    let container = qs('.kairo-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'kairo-toast-container';
      document.body.appendChild(container);
    }
    
    // Remove any existing toasts - only show one at a time
    container.querySelectorAll('.kairo-toast').forEach(existingToast => {
      existingToast.classList.remove('is-show');
      setTimeout(() => existingToast.remove(), 200);
    });
    
    const variantClass = variant === 'danger' || variant === 'warning' ? 'kairo-toast--danger' 
                       : variant === 'success' ? 'kairo-toast--success' 
                       : '';
    
    const titleText = variant === 'danger' ? 'Error' 
                    : variant === 'warning' ? 'Warning' 
                    : variant === 'success' ? 'Success' 
                    : 'Info';
    
    const toast = document.createElement('div');
    toast.className = `kairo-toast ${variantClass}`;
    toast.innerHTML = `
      <div class="kairo-toast__title">
        <span>${titleText}</span>
        <button class="kairo-toast__close" type="button">&times;</button>
      </div>
      <div class="kairo-toast__body">${message}</div>
    `;
    
    container.appendChild(toast);
    
    // Show animation - use setTimeout to ensure DOM is ready
    setTimeout(() => toast.classList.add('is-show'), 10);
    
    // Close button
    toast.querySelector('.kairo-toast__close')?.addEventListener('click', () => {
      toast.classList.remove('is-show');
      setTimeout(() => toast.remove(), 200);
    });
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      toast.classList.remove('is-show');
      setTimeout(() => toast.remove(), 200);
    }, 5000);
    
    console.log(`[FixedAssetMaintenance] Toast (${variant}): ${message}`);
  }

  function setInputValue(id, value) {
    const el = qs('#' + id);
    if (!el) return;
    const v = value == null || value === 'null' ? '' : value;
    
    // Check if element is an input, select, or textarea
    const isFormField = el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA';
    
    // Check if this is a date field
    const isDateField = el.type === 'date' || id.toLowerCase().includes('date') || id.toLowerCase().includes('on');
    
    let formattedValue = String(v);
    
    if (isDateField && v) {
      // Use GlobalUtils for date formatting if available
      if (window.GlobalUtils?.formatDate) {
        formattedValue = window.GlobalUtils.formatDate(v);
      } else {
        // Fallback: extract date part from ISO format
        formattedValue = typeof v === 'string' && v.includes('T') ? v.split('T')[0] : String(v);
      }
    }
    
    if (isFormField) {
      el.value = formattedValue;
    } else {
      // For span, div, or other elements use textContent
      el.textContent = formattedValue;
    }
  }

  async function bindAssetResponseToForm({ assetRow, metricsRow }) {
    if (!assetRow && !metricsRow) return;

    if (assetRow) {
      setInputValue('branchId', assetRow.OurBranchID);
      setInputValue('branchName', assetRow.BranchName);
      setInputValue('assetId', assetRow.FixedAssetID);
      setInputValue('description', assetRow.Description);

      const assetTypeSelect = qs('#assetType');
      if (assetTypeSelect && assetRow.FixedAssetTypeID) {
        assetTypeSelect.value = assetRow.FixedAssetTypeID;
      }

      // Populate subtypes dropdown (uses SubCodeID as value)
      await populateAssetSubTypeDropdown();
      
      const assetSubTypeSelect = qs('#assetSubType');
      if (assetSubTypeSelect && assetRow.FixedAssetSubTypeID) {
        // Set the subtype value - dropdown uses SubCodeID which matches FixedAssetSubTypeID
        assetSubTypeSelect.value = assetRow.FixedAssetSubTypeID;
        console.log('[FixedAssetMaintenance] Set assetSubType to:', assetRow.FixedAssetSubTypeID);
      }

      // Populate acquisition by dropdown before setting value
      await populateAcquisitionByDropdown();
      
      const acquisitionBySelect = qs('#acquisitionBy');
      if (acquisitionBySelect && assetRow.AcquisitionByID) {
        acquisitionBySelect.value = assetRow.AcquisitionByID;
        console.log('[FixedAssetMaintenance] Set acquisitionBy to:', assetRow.AcquisitionByID);
      }

      setInputValue('acquisitionDate', assetRow.PurchaseDate || assetRow.BookDate);
      setInputValue('acquisitionNo', assetRow.AquisitionNo);
      setInputValue('fromBranchId', assetRow.FromBranchID);
      setInputValue('vendorId', assetRow.VendorID);
      setInputValue('assetLocationId', assetRow.AssetLocationID);
      setInputValue('location', assetRow.AssetLocation || assetRow.Location);
      setInputValue('label', assetRow.Label);
      setInputValue('brandName', assetRow.BrandName);
      setInputValue('noOfItems', assetRow.NoOfItems);
      setInputValue('model', assetRow.Model);
      setInputValue('assetValue', assetRow.AssetValue);
      setInputValue('expectedAssetLife', assetRow.ExpectedAssetLife);
      setInputValue('apprDeprStartDate', assetRow.DepreciationStartDate);
      setInputValue('salvageValue', assetRow.SalvageValue);
      setInputValue('remarks', assetRow.Remarks);

      setInputValue('createdBy', assetRow.CreatedBy);
      setInputValue('createdOn', assetRow.CreatedOn);
      setInputValue('modifiedBy', assetRow.ModifiedBy);
      setInputValue('modifiedOn', assetRow.ModifiedOn);
      setInputValue('supervisedBy', assetRow.SupervisedBy);
      setInputValue('supervisedOn', assetRow.SupervisedOn);

      // Store original data for potential reset
      famState.originalData = { assetRow, metricsRow };
    }

    if (metricsRow) {
      setInputValue('accDep', metricsRow.AccumulatedDepAmount);
      setInputValue('depRate', metricsRow.DepreciationRate);
      setInputValue('disposedValue', metricsRow.DisposedAmount);
      setInputValue('depAppliedUpto', metricsRow.DepreciationAppliedUpto);
      setInputValue('bookValue', metricsRow.BookValue);
      setInputValue('nextDepDate', metricsRow.NextDepreciationDate);
      setInputValue('status', metricsRow.Status || metricsRow.StatusID);
      setInputValue('itemsOnHand', metricsRow.NoOfItemsOnHand);
    }

    // Update state to reflect a loaded record
    famState.hasLoaded = true;
    famState.canAddFromId = false;
    updateFamActionButtons();
  }

  async function populateAssetTypeDropdown() {
    const select = qs('#assetType');
    if (!select) {
      console.warn('[FixedAssetMaintenance] #assetType select not found');
      return;
    }

    console.log('[FixedAssetMaintenance] Populating asset type dropdown...');

    if (!window.customCodesLookupService?.getCustomCodeOptions) {
      console.error('[FixedAssetMaintenance] customCodesLookupService not available');
      return;
    }

    const currentValue = select.value;
    select.innerHTML = '<option value="">--Select--</option>';

    try {
      // Use FixedAssetTypeID as the CodeID
      const options = await window.customCodesLookupService.getCustomCodeOptions('FixedAssetTypeID');
      console.log('[FixedAssetMaintenance] Asset type options received:', options);
      
      if (!options || options.length === 0) {
        console.warn('[FixedAssetMaintenance] No asset type options returned from API');
        return;
      }
      
      options.forEach((opt) => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        select.appendChild(option);
      });

      if (currentValue) {
        select.value = currentValue;
      }
      
      console.log('[FixedAssetMaintenance] Asset type dropdown populated with', options.length, 'options');

      // Add change listener for asset type (subtypes not filtered by type currently)
      if (!select._assetTypeChangeListenerAdded) {
        select.addEventListener('change', async () => {
          const selectedAssetType = select.value;
          console.log('[FixedAssetMaintenance] Asset type changed to:', selectedAssetType);
          // Subtypes are not filtered by asset type (SubCodeID is subtype ID, not parent type)
        });
        select._assetTypeChangeListenerAdded = true;
      }
    } catch (err) {
      console.error('[FixedAssetMaintenance] Failed to populate asset type dropdown:', err);
    }
  }

  async function populateAssetSubTypeDropdown() {
    const select = qs('#assetSubType');
    console.log('[FixedAssetMaintenance] populateAssetSubTypeDropdown called, select element:', select);
    
    if (!select) {
      console.error('[FixedAssetMaintenance] #assetSubType select element not found!');
      return;
    }

    if (!window.customCodesLookupService?.getCustomDropDownCodes) {
      console.error('[FixedAssetMaintenance] customCodesLookupService.getCustomDropDownCodes not available');
      return;
    }

    const currentValue = select.value;
    select.innerHTML = '<option value="">--Select--</option>';

    try {
      // Get raw response to access SubCodeID for filtering by asset type
      console.log('[FixedAssetMaintenance] Calling getCustomDropDownCodes with CodeID: FixedAssetSubTypeID');
      const response = await window.customCodesLookupService.getCustomDropDownCodes({ CodeID: 'FixedAssetSubTypeID' });
      console.log('[FixedAssetMaintenance] Asset sub-type raw response:', response);
      
      if (!response.success) {
        console.error('[FixedAssetMaintenance] Failed to fetch asset sub-types:', response.message);
        return;
      }

      // Normalize the details array - handle various response structures
      let details = [];
      const data = response.data;
      
      if (Array.isArray(data)) {
        details = data;
      } else if (data?.Details && Array.isArray(data.Details)) {
        details = data.Details;
      } else if (data && typeof data === 'object') {
        details = [data];
      }
      
      console.log('[FixedAssetMaintenance] Asset sub-type details (all):', details.length, 'items');
      
      // Deduplicate by SubCodeID + CodeDescription combination
      const seen = new Set();
      const uniqueDetails = details.filter(item => {
        const key = `${item.SubCodeID}|${item.CodeDescription}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      
      console.log('[FixedAssetMaintenance] Unique subtypes after dedup:', uniqueDetails.length, 'items');
      
      // Sort by DisplayOrder and populate dropdown
      // Use SubCodeID as value (matches FixedAssetSubTypeID in asset records)
      uniqueDetails
        .sort((a, b) => (a.DisplayOrder ?? 0) - (b.DisplayOrder ?? 0))
        .forEach((item) => {
          const option = document.createElement('option');
          option.value = item.SubCodeID; // Use SubCodeID to match FixedAssetSubTypeID
          option.textContent = item.CodeDescription; // Show only description
          select.appendChild(option);
        });

      if (currentValue) {
        select.value = currentValue;
      }
      
      console.log('[FixedAssetMaintenance] Asset sub-type dropdown populated with', uniqueDetails.length, 'options');
    } catch (err) {
      console.error('[FixedAssetMaintenance] Failed to populate asset sub-type dropdown:', err);
    }
  }

  async function populateAcquisitionByDropdown() {
    const select = qs('#acquisitionBy');
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">--Select--</option>';

    try {
      let options = [];
      
      // Use LookupService.getAcquisitionTypes() which calls p_v1_GetSystemCodes with CodeID: AcquisitionByID
      // Returns normalized { value, label, order } array where:
      // - value = SubCodeID (PUR, TRF, REV)
      // - label = CodeDescription (Purchase, Transfer, Revaluation)
      // - order = DisplayOrder
      if (window.LookupService?.getAcquisitionTypes) {
        console.log('[FixedAssetMaintenance] Using LookupService.getAcquisitionTypes for acquisition by dropdown');
        options = await window.LookupService.getAcquisitionTypes();
        console.log('[FixedAssetMaintenance] Acquisition by options from LookupService:', options);
        
        if (options && options.length > 0) {
          // Options are already sorted by order from LookupService
          options.forEach((item) => {
            const opt = document.createElement('option');
            opt.value = item.value; // PUR, TRF, REV
            opt.textContent = item.label; // Purchase, Transfer, Revaluation
            select.appendChild(opt);
          });
          
          if (currentValue) {
            select.value = currentValue;
          }
          
          console.log('[FixedAssetMaintenance] Acquisition by dropdown populated with', options.length, 'options');
          return;
        }
      }
      
      // Fallback to customCodesLookupService if LookupService not available
      if (window.customCodesLookupService?.getCustomDropDownCodes) {
        console.log('[FixedAssetMaintenance] Using customCodesLookupService for acquisition by dropdown');
        const response = await window.customCodesLookupService.getCustomDropDownCodes({ CodeID: 'AcquisitionByID' });
        console.log('[FixedAssetMaintenance] Acquisition by raw response:', response);
        
        // Normalize the details array - only use if we have valid SubCodeID fields
        let details = [];
        if (response.Details && Array.isArray(response.Details)) {
          details = response.Details.filter(item => item.SubCodeID && item.CodeDescription);
        } else if (Array.isArray(response.data)) {
          details = response.data.filter(item => item.SubCodeID && item.CodeDescription);
        } else if (response.data?.Details && Array.isArray(response.data.Details)) {
          details = response.data.Details.filter(item => item.SubCodeID && item.CodeDescription);
        }
        
        if (details.length > 0) {
          // Sort by DisplayOrder and populate dropdown
          details
            .sort((a, b) => (a.DisplayOrder ?? 0) - (b.DisplayOrder ?? 0))
            .forEach((item) => {
              const opt = document.createElement('option');
              opt.value = item.SubCodeID; // PUR, TRF, REV
              opt.textContent = item.CodeDescription; // Purchase, Transfer, Revaluation
              select.appendChild(opt);
            });
          
          if (currentValue) {
            select.value = currentValue;
          }
          
          console.log('[FixedAssetMaintenance] Acquisition by dropdown populated with', details.length, 'options');
          return;
        }
      }
      
      console.warn('[FixedAssetMaintenance] No acquisition by options found from any service');
    } catch (err) {
      console.error('[FixedAssetMaintenance] Failed to populate acquisition by dropdown:', err);
    }
  }

  async function handleAssetIdSearch(e) {
    e.preventDefault();

    if (!window.Swal) {
      alert('Search dialog not available. Please ensure SweetAlert2 is loaded.');
      return;
    }

    // Show search dialog
    const { value: formValues } = await window.Swal.fire({
      title: 'Fixed Asset',
      html: `
        <div style="text-align: left; padding: 10px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; font-weight: 500; width: 150px;">FixedAsset ID</td>
              <td style="padding: 8px;">
                <select id="swal-fixedasset-op" class="form-select" style="width: 100px; display: inline-block; margin-right: 10px;">
                  <option value="LIKE">Like</option>
                  <option value="=">=</option>
                  <option value=">">></option>
                  <option value="<"><</option>
                </select>
                <input id="swal-fixedasset" type="text" class="form-control" style="width: calc(100% - 110px); display: inline-block;" />
              </td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: 500;">Description</td>
              <td style="padding: 8px;">
                <select id="swal-description-op" class="form-select" style="width: 100px; display: inline-block; margin-right: 10px;">
                  <option value="LIKE">Like</option>
                  <option value="=">=</option>
                  <option value=">">></option>
                  <option value="<"><</option>
                </select>
                <input id="swal-description" type="text" class="form-control" style="width: calc(100% - 110px); display: inline-block;" />
              </td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: 500;">LegacyAccountID</td>
              <td style="padding: 8px;">
                <select id="swal-legacy-op" class="form-select" style="width: 100px; display: inline-block; margin-right: 10px;">
                  <option value="LIKE">Like</option>
                  <option value="=">=</option>
                  <option value=">">></option>
                  <option value="<"><</option>
                </select>
                <input id="swal-legacy" type="text" class="form-control" style="width: calc(100% - 110px); display: inline-block;" />
              </td>
            </tr>
          </table>
          <div style="text-align: center; margin: 20px 0;">
            <button id="swal-search-btn" class="btn btn-primary" style="padding: 8px 30px;">Search</button>
          </div>
          <div style="border: 1px solid #ccc; margin-top: 10px;">
            <div style="background: #f8f9fa; padding: 8px; border-bottom: 1px solid #ccc; font-weight: 500;">Search Results</div>
            <div id="swal-results-container" style="max-height: 300px; overflow-y: auto;">
              <table id="swal-results-table" style="width: 100%; border-collapse: collapse;">
                <thead style="background: #0d6efd; color: white; position: sticky; top: 0;">
                  <tr>
                    <th style="padding: 8px; text-align: left; border-right: 1px solid #084298;">#</th>
                    <th style="padding: 8px; text-align: left; border-right: 1px solid #084298;">FixedAssetID</th>
                    <th style="padding: 8px; text-align: left; border-right: 1px solid #084298;">Description</th>
                    <th style="padding: 8px; text-align: left;">LegacyAccountID</th>
                  </tr>
                </thead>
                <tbody id="swal-results-body">
                  <tr>
                    <td colspan="4" style="padding: 20px; text-align: center; color: #6c757d;">
                      Enter search criteria and click Search
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `,
      width: '800px',
      showCancelButton: true,
      showConfirmButton: true,
      confirmButtonText: 'OK',
      cancelButtonText: 'Cancel',
      focusConfirm: false,
      didOpen: () => {
        const searchBtn = document.getElementById('swal-search-btn');
        const resultsBody = document.getElementById('swal-results-body');
        let searchResults = [];

        // Function to perform search
        const performSearch = async (withFilters = false) => {
          const env = window.Environment || {};
          const session = getSessionSafe() || {};
          const branchIdInput = qs('#branchId');
          const assetTypeSelect = qs('#assetType');

          const branchId = (branchIdInput?.value || '').trim() || env.OurBranchID || env.defaultOurBranchId || '0101';
          const assetTypeId = (assetTypeSelect?.value || '').trim();
          const operatorId = session.operatorId || session.OperatorID || 'CSADM';

          // Build advanced filter string
          let filters = [`OurBranchID='${branchId}'`];
          
          if (assetTypeId && assetTypeId !== '--Select--') {
            filters.push(`FixedAssetTypeID='${assetTypeId}'`);
          }

          // Only apply user filters if withFilters is true
          if (withFilters) {
            const fixedAssetId = document.getElementById('swal-fixedasset').value.trim();
            const fixedAssetOp = document.getElementById('swal-fixedasset-op').value;
            const description = document.getElementById('swal-description').value.trim();
            const descriptionOp = document.getElementById('swal-description-op').value;
            const legacyAccount = document.getElementById('swal-legacy').value.trim();
            const legacyAccountOp = document.getElementById('swal-legacy-op').value;

            if (fixedAssetId) {
              if (fixedAssetOp === 'LIKE') {
                filters.push(`FixedAssetID LIKE '%${fixedAssetId}%'`);
              } else {
                filters.push(`FixedAssetID${fixedAssetOp}'${fixedAssetId}'`);
              }
            }

            if (description) {
              if (descriptionOp === 'LIKE') {
                filters.push(`Description LIKE '%${description}%'`);
              } else {
                filters.push(`Description${descriptionOp}'${description}'`);
              }
            }

            if (legacyAccount) {
              if (legacyAccountOp === 'LIKE') {
                filters.push(`LegacyAccountID LIKE '%${legacyAccount}%'`);
              } else {
                filters.push(`LegacyAccountID${legacyAccountOp}'${legacyAccount}'`);
              }
            }
          }

          const advFilterString = filters.join(' AND ');

          const requestData = {
            TableID: 'FixedAssetID',
            AdvFilterString: advFilterString,
            WhereStmt: '',
            PrevOrNext: false,
            RefID: '',
            OperatorID: operatorId,
            ModuleID: 8420,
            OurBranchID: branchId,
            SearchKey: '',
            LanguageID: 'ENG'
          };

          console.log('[FixedAssetMaintenance] Search request:', requestData);

          try {
            if (withFilters) {
              searchBtn.disabled = true;
              searchBtn.textContent = 'Searching...';
            } else {
              resultsBody.innerHTML = `
                <tr>
                  <td colspan="4" style="padding: 20px; text-align: center; color: #6c757d;">
                    <i class="spinner-border spinner-border-sm" role="status"></i> Loading assets...
                  </td>
                </tr>
              `;
            }

            const resp = await window.SearchService.searchClients(requestData);
            console.log('[FixedAssetMaintenance] Search response:', resp);

            if (withFilters) {
              searchBtn.disabled = false;
              searchBtn.textContent = 'Search';
            }

            if (resp && resp.success) {
              const data = resp.data || resp;
              searchResults = [];

              if (Array.isArray(data?.Details)) {
                searchResults = data.Details;
              } else if (Array.isArray(data?.Details01)) {
                searchResults = data.Details01;
              } else if (Array.isArray(data)) {
                searchResults = data;
              }

              // Display results
              if (searchResults.length === 0) {
                resultsBody.innerHTML = `
                  <tr>
                    <td colspan="4" style="padding: 20px; text-align: center; color: #6c757d;">
                      No assets found matching the criteria.
                    </td>
                  </tr>
                `;
              } else {
                resultsBody.innerHTML = searchResults.map((r, idx) => {
                  const assetId = r.FixedAssetID || r.AssetID || r.ID || '';
                  const desc = r.Description || r.AssetDescription || '';
                  const legacy = r.LegacyAccountID || r.LegacyAccount || '';
                  return `
                    <tr data-index="${idx}" style="cursor: pointer; background: ${idx % 2 === 0 ? '#f8f9fa' : 'white'};" 
                        onmouseover="this.style.background='#cfe2ff'" 
                        onmouseout="this.style.background='${idx % 2 === 0 ? '#f8f9fa' : 'white'}'">
                      <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${idx + 1}</td>
                      <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${assetId}</td>
                      <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${desc}</td>
                      <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${legacy}</td>
                    </tr>
                  `;
                }).join('');

                // Add click handlers to rows
                resultsBody.querySelectorAll('tr[data-index]').forEach(row => {
                  row.addEventListener('click', function() {
                    // Remove previous selection
                    resultsBody.querySelectorAll('tr').forEach(r => {
                      r.style.background = r.dataset.index % 2 === 0 ? '#f8f9fa' : 'white';
                      r.style.color = 'inherit';
                    });
                    // Highlight selected
                    this.style.background = '#0d6efd';
                    this.style.color = 'white';
                    this.dataset.selected = 'true';
                  });

                  // Double-click to select and close
                  row.addEventListener('dblclick', function() {
                    this.dataset.selected = 'true';
                    window.Swal.clickConfirm();
                  });
                });
              }
            } else {
              resultsBody.innerHTML = `
                <tr>
                  <td colspan="4" style="padding: 20px; text-align: center; color: #dc3545;">
                    Search failed. ${resp?.message || ''}
                  </td>
                </tr>
              `;
            }
          } catch (err) {
            console.error('[FixedAssetMaintenance] Search error:', err);
            if (withFilters) {
              searchBtn.disabled = false;
              searchBtn.textContent = 'Search';
            }
            resultsBody.innerHTML = `
              <tr>
                <td colspan="4" style="padding: 20px; text-align: center; color: #dc3545;">
                  Error performing search.
                </td>
              </tr>
            `;
          }
        };

        // Load all assets immediately when dialog opens
        performSearch(false);

        // Search button click handler - applies filters
        searchBtn.addEventListener('click', () => performSearch(true));
      },
      preConfirm: () => {
        const selectedRow = document.querySelector('tr[data-selected="true"]');
        if (selectedRow) {
          const index = parseInt(selectedRow.dataset.index);
          const resultsBody = document.getElementById('swal-results-body');
          const searchResults = [];
          resultsBody.querySelectorAll('tr[data-index]').forEach((row, idx) => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
              searchResults.push({
                FixedAssetID: cells[1].textContent.trim(),
                Description: cells[2].textContent.trim(),
                LegacyAccountID: cells[3].textContent.trim()
              });
            }
          });
          return searchResults[index];
        }
        return null;
      }
    });

    if (formValues) {
      const assetIdInput = qs('#assetId');
      const descriptionInput = qs('#description');
      
      if (assetIdInput) {
        assetIdInput.value = formValues.FixedAssetID;
      }
      
      if (descriptionInput) {
        descriptionInput.value = formValues.Description;
      }
      
      // Automatically trigger View to populate the entire form
      setTimeout(() => {
        handleViewClick(new Event('click'));
      }, 100);
    }
  }

  async function handleViewClick(e) {
    if (e && e.preventDefault) e.preventDefault();

    const assetIdInput = qs('#assetId');
    const branchIdInput = qs('#branchId');

    const fixedAssetId = (assetIdInput?.value || '').trim();
    if (!fixedAssetId) {
      showToast('Please enter an Asset ID before viewing.', 'warning');
      return;
    }

    const env = window.Environment || {};
    const session = getSessionSafe() || {};

    const bankId = env.defaultBankId || env.BankID || '00';
    const branchId = (branchIdInput?.value || '').trim() || env.OurBranchID || env.defaultOurBranchId || '0101';
    const operatorId = session.operatorId || session.OperatorID || 'CSADM';
    const workingDate = formatSmallDateTime(new Date());

    const requestData = {
      BankID: bankId,
      OurBranchID: branchId,
      FixedAssetID: fixedAssetId,
      OperatorID: operatorId,
      WorkingDate: workingDate,
    };

    if (!window.FixedAssetsService?.getFA) {
      console.error('[FixedAssetMaintenance] FixedAssetsService.getFA is not available');
      showToast('Fixed Asset service is not available.', 'danger');
      return;
    }

    console.log('[FixedAssetMaintenance] Requesting asset:', requestData);

    try {
      const resp = await window.FixedAssetsService.getFA(requestData);
      console.log('[FixedAssetMaintenance] Service response:', resp);

      if (resp && resp.success) {
        const data = resp.data || resp;

        // Details02: primary asset record
        let assetRow = null;
        if (Array.isArray(data?.Details02) && data.Details02.length > 0) {
          assetRow = data.Details02[0];
        } else if (Array.isArray(data?.Details) && data.Details.length > 0) {
          assetRow = data.Details[0];
        }

        // Details01: metrics/behind-the-scenes
        let metricsRow = null;
        if (Array.isArray(data?.Details01) && data.Details01.length > 0) {
          metricsRow = data.Details01[0];
        }

        if (!assetRow && !metricsRow) {
          showToast('No asset record found for the given Asset ID.', 'warning');
          // Enable Add button since record not found
          famState.canAddFromId = true;
          updateFamActionButtons();
          return;
        }

        console.log('[FixedAssetMaintenance] Asset row:', assetRow);
        console.log('[FixedAssetMaintenance] Metrics row:', metricsRow);
        await bindAssetResponseToForm({ assetRow, metricsRow });
        showToast('Asset record loaded successfully.', 'success');
      } else {
        const message = resp?.message || 'Failed to load asset record.';
        showToast(message, 'danger');
      }
    } catch (err) {
      console.error('[FixedAssetMaintenance] View error:', err);
      showToast('Error loading asset record.', 'danger');
    }
  }

  window.addEventListener('load', () => {
    console.log('[FixedAssetMaintenance] Initializing...');

    // Check required services
    if (!window.SearchService) {
      console.error('[FixedAssetMaintenance] SearchService not available!');
    }
    if (!window.Swal) {
      console.error('[FixedAssetMaintenance] Swal (SweetAlert2) not available!');
    }

    // Get all action buttons
    const { view, add, edit, del, save, cancel } = getFamActionButtons();

    // ========== View Button Handler ==========
    if (view) {
      view.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[FixedAssetMaintenance] View button clicked');
        
        // Always switch to VIEW mode first
        setFamMode(MODES.VIEW);
        
        // Check if an Asset ID is entered
        const assetIdInput = qs('#assetId');
        const fixedAssetId = (assetIdInput?.value || '').trim();
        
        if (fixedAssetId) {
          // Fetch and populate the form with the asset data
          handleViewClick(e);
        } else {
          showToast('Enter an Asset ID and click View to load the record', 'info');
        }
      });
      console.log('[FixedAssetMaintenance] View button bound');
    }

    // ========== Add Button Handler ==========
    if (add) {
      add.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[FixedAssetMaintenance] Add button clicked');
        
        // Clear form and switch to ADD mode
        clearFamForm();
        setFamMode(MODES.ADD);
        showToast('Add mode - Enter new asset details', 'info');
      });
      console.log('[FixedAssetMaintenance] Add button bound');
    }

    // ========== Edit Button Handler ==========
    if (edit) {
      edit.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[FixedAssetMaintenance] Edit button clicked');
        
        if (!famState.hasLoaded) {
          showToast('Please load an asset record first', 'warning');
          return;
        }
        
        // Switch to UPDATE mode
        setFamMode(MODES.UPDATE);
        showToast('Edit mode - Modify asset details', 'info');
      });
      console.log('[FixedAssetMaintenance] Edit button bound');
    }

    // ========== Delete Button Handler ==========
    if (del) {
      del.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('[FixedAssetMaintenance] Delete button clicked');
        
        if (!famState.hasLoaded) {
          showToast('Please load an asset record first', 'warning');
          return;
        }

        const assetId = qs('#assetId')?.value || '';
        
        // Confirm deletion
        if (window.Swal) {
          const result = await window.Swal.fire({
            title: 'Confirm Delete',
            text: `Are you sure you want to delete asset "${assetId}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
          });
          
          if (!result.isConfirmed) {
            return;
          }
        } else if (!confirm(`Are you sure you want to delete asset "${assetId}"?`)) {
          return;
        }
        
        // TODO: Implement actual delete API call
        showToast('Delete functionality - API call to be implemented', 'info');
      });
      console.log('[FixedAssetMaintenance] Delete button bound');
    }

    // ========== Save Button Handler ==========
    if (save) {
      save.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('[FixedAssetMaintenance] Save button clicked');
        
        if (famState.mode === MODES.VIEW) {
          showToast('Cannot save in View mode', 'warning');
          return;
        }

        // Validate required fields
        const assetId = qs('#assetId')?.value?.trim();
        const description = qs('#description')?.value?.trim();
        const assetType = qs('#assetType')?.value;
        
        if (!assetId) {
          showToast('Asset ID is required', 'warning');
          qs('#assetId')?.focus();
          return;
        }

        if (!description) {
          showToast('Description is required', 'warning');
          qs('#description')?.focus();
          return;
        }

        if (!assetType) {
          showToast('Asset Type is required', 'warning');
          qs('#assetType')?.focus();
          return;
        }

        // Confirm save
        if (window.Swal) {
          const result = await window.Swal.fire({
            title: famState.mode === MODES.ADD ? 'Create Asset' : 'Update Asset',
            text: `Are you sure you want to ${famState.mode === MODES.ADD ? 'create' : 'update'} this asset?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#5CB85C',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, save it!'
          });
          
          if (!result.isConfirmed) {
            return;
          }
        }
        
        // TODO: Implement actual save/update API call
        showToast(`${famState.mode === MODES.ADD ? 'Create' : 'Update'} functionality - API call to be implemented`, 'info');
      });
      console.log('[FixedAssetMaintenance] Save button bound');
    }

    // ========== Cancel Button Handler ==========
    if (cancel) {
      cancel.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('[FixedAssetMaintenance] Cancel button clicked');
        
        if (famState.mode === MODES.ADD) {
          // Clear form and return to VIEW mode
          clearFamForm();
          setFamMode(MODES.VIEW);
          showToast('Add cancelled', 'info');
        } else if (famState.mode === MODES.UPDATE) {
          // Restore original data and return to VIEW mode
          if (famState.originalData) {
            await bindAssetResponseToForm(famState.originalData);
          }
          setFamMode(MODES.VIEW);
          showToast('Edit cancelled - Changes discarded', 'info');
        }
      });
      console.log('[FixedAssetMaintenance] Cancel button bound');
    }

    // Bind search icon next to Asset ID field (new selectors)
    const assetSearchBtn = qs('[data-fam-action="search-asset"]');
    if (assetSearchBtn) {
      assetSearchBtn.addEventListener('click', (e) => {
        console.log('[FixedAssetMaintenance] Asset search button clicked');
        handleAssetIdSearch(e);
      });
      console.log('[FixedAssetMaintenance] Asset ID search button bound');
    } else {
      // Fallback to legacy selector
      const assetIdContainer = qs('#assetId')?.closest('.fam-field--lookup');
      const legacyAssetSearchBtn = assetIdContainer?.querySelector('.fam-lookup[aria-label="Lookup asset"]');
      if (legacyAssetSearchBtn) {
        legacyAssetSearchBtn.addEventListener('click', handleAssetIdSearch);
        console.log('[FixedAssetMaintenance] Asset ID search button bound (legacy)');
      } else {
        console.warn('[FixedAssetMaintenance] Asset ID search button not found');
      }
    }

    // Bind all other search buttons
    qsa('[data-fam-action^="search-"]').forEach(btn => {
      const action = btn.getAttribute('data-fam-action');
      if (action === 'search-asset') return; // Already bound above
      
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log(`[FixedAssetMaintenance] Search button clicked: ${action}`);
        // Placeholder for other search actions - can be extended later
        if (window.Swal) {
          window.Swal.fire({
            icon: 'info',
            title: 'Search',
            text: `${action.replace('search-', '').replace('-', ' ')} search functionality coming soon.`,
            timer: 2000,
            showConfirmButton: false
          });
        }
      });
      console.log(`[FixedAssetMaintenance] ${action} button bound`);
    });

    // ========== Populate Dropdowns with retry mechanism ==========
    async function initializeDropdowns() {
      // Wait for customCodesLookupService to be available
      let retries = 0;
      const maxRetries = 10;
      
      while (!window.customCodesLookupService && retries < maxRetries) {
        console.log('[FixedAssetMaintenance] Waiting for customCodesLookupService...', retries + 1);
        await new Promise(resolve => setTimeout(resolve, 200));
        retries++;
      }
      
      if (!window.customCodesLookupService) {
        console.error('[FixedAssetMaintenance] customCodesLookupService still not available after retries');
        return;
      }
      
      console.log('[FixedAssetMaintenance] customCodesLookupService is ready:', {
        hasGetCustomCodeOptions: !!window.customCodesLookupService.getCustomCodeOptions,
        hasGetCustomDropDownCodes: !!window.customCodesLookupService.getCustomDropDownCodes
      });
      
      try {
        await Promise.all([
          populateAssetTypeDropdown(),
          populateAssetSubTypeDropdown(),
          populateAcquisitionByDropdown()
        ]);
        console.log('[FixedAssetMaintenance] All dropdowns populated successfully');
      } catch (err) {
        console.error('[FixedAssetMaintenance] Error populating dropdowns:', err);
      }
    }
    
    initializeDropdowns();

    // ========== Window Control Buttons ==========
    const titleBar = qs('.title-bar');
    if (titleBar) {
      // Refresh button
      const refreshBtn = titleBar.querySelector('[data-window-action="refresh"]');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          window.location.reload();
        });
      }

      // Minimize button
      const minimizeBtn = titleBar.querySelector('[data-window-action="minimize"]');
      if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
          const windowEl = qs('.window');
          if (windowEl) {
            windowEl.classList.add('minimized');
          }
        });
      }

      // Maximize/Restore button
      const maximizeBtn = titleBar.querySelector('[data-window-action="restore"]');
      if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => {
          const windowEl = qs('.window');
          if (windowEl) {
            windowEl.classList.toggle('maximized');
            const icon = maximizeBtn.querySelector('i');
            if (windowEl.classList.contains('maximized')) {
              icon.classList.remove('bi-square');
              icon.classList.add('bi-arrows-angle-contract');
            } else {
              icon.classList.remove('bi-arrows-angle-contract');
              icon.classList.add('bi-square');
            }
          }
        });
      }

      // Close button
      const closeBtn = titleBar.querySelector('[data-window-action="close"]');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          // Try to close modal or navigate back
          if (window.parent && window.parent !== window) {
            try {
              window.parent.postMessage({ action: 'closeSubmodule', source: 'fixed-asset-maintenance' }, '*');
            } catch (e) {
              // Ignore cross-origin errors
            }
          }
          if (window.history.length > 1) {
            window.history.back();
          }
        });
      }

      console.log('[FixedAssetMaintenance] Window controls bound');
    }

    // ========== Sidebar Nav Items ==========
    qsa('.sidebar-left .nav-item[data-fam-nav]').forEach(navItem => {
      navItem.addEventListener('click', () => {
        const target = navItem.dataset.famNav;
        
        // Update active state
        qsa('.sidebar-left .nav-item').forEach(item => item.classList.remove('active'));
        navItem.classList.add('active');
        
        // Navigate based on target
        if (target === 'asset-cost-history') {
          window.location.href = '../data-entry/AssetCostHistory.html?t=' + Date.now();
        } else if (target === 'depreciation-schedule') {
          window.location.href = '../data-entry/DepreciationSchedule.html?t=' + Date.now();
        }
      });
    });
    console.log('[FixedAssetMaintenance] Sidebar navigation bound');

    // ========== Section Toggle Functionality ==========
    document.querySelectorAll('.form-section [data-section-toggle]').forEach(header => {
      header.addEventListener('click', function (e) {
        e.preventDefault();

        const section = this.closest('.form-section');
        if (!section) return;

        const content = section.querySelector('[data-section-content]');
        const icon = this.querySelector('.section-toggle-btn i');
        const toggleBtn = this.querySelector('.section-toggle-btn');

        if (content && icon) {
          const isHidden = content.hidden;
          content.hidden = !isHidden;

          // Toggle icon
          icon.classList.remove('bi-chevron-up', 'bi-chevron-down');
          icon.classList.add(isHidden ? 'bi-chevron-up' : 'bi-chevron-down');

          // Update aria-expanded
          if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
          }
        }
      });
    });

    // Initialize in VIEW mode with proper button states
    setFamMode(MODES.VIEW);
    console.log('[FixedAssetMaintenance] Initialization complete');
  });
})();
