(function () {
  const LookupService = window.LookupService;
  const CoreApi = window.CoreApi;

  function postClose() {
    try {
      window.parent.postMessage({ type: 'accountMaintenanceChildClose' }, '*');
    } catch (_) {
      // ignore
    }
  }

  function setMinimized(isMinimized) {
    var root = document.querySelector('[data-ir-window]');
    if (!root) return;
    root.classList.toggle('ir-window--minimized', Boolean(isMinimized));
  }

  function doRefresh() {
    try {
      window.location.reload();
    } catch (_) {
      // ignore
    }
  }

  function showConfirmDialog(title, message) {
    if (window.AppCore && typeof window.AppCore.showDialog === 'function') {
      return window.AppCore.showDialog({
        title: title || 'Confirm action',
        message: message || '',
        type: 'warning',
        buttons: [
          { text: 'Cancel', value: false, className: 'btn btn-secondary' },
          { text: 'OK', value: true, className: 'btn btn-primary' }
        ]
      }).then(function (result) {
        return result === true;
      });
    }

    if (window.AppCore && typeof window.AppCore.showConfirmation === 'function') {
      return window.AppCore.showConfirmation(title || 'Confirm action', message || '').then(function (result) {
        return !!result;
      });
    }

    return Promise.resolve(window.confirm(message || title || 'Are you sure?'));
  }

  function showAlertDialog(title, message) {
    if (window.AppCore && typeof window.AppCore.showAlert === 'function') {
      return window.AppCore.showAlert(title || 'Alert', message || '');
    }

    if (window.AppCore && typeof window.AppCore.showDialog === 'function') {
      return window.AppCore.showDialog({
        title: title || 'Alert',
        message: message || '',
        type: 'warning',
        buttons: [
          { text: 'OK', value: true, className: 'btn btn-primary' }
        ]
      });
    }

    window.alert(message || title || 'Alert');
    return Promise.resolve(true);
  }

  /**
   * Load Rate Types dropdown using LookupService
   */
  async function loadRateTypes() {
    const rateTypeSelect = document.getElementById('rateType');
    if (!rateTypeSelect || !LookupService) return;

    try {
      const options = await LookupService.getBaseRateTypes();

      // Clear existing options except the first one (placeholder)
      rateTypeSelect.innerHTML = '<option value="">--Select--</option>';

      // Populate with fetched options
      options.forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option.value;
        optionEl.textContent = option.label;
        rateTypeSelect.appendChild(optionEl);
      });

      console.log('[Interest Rates] Loaded', options.length, 'rate types');
    } catch (error) {
      console.error('[Interest Rates] Failed to load rate types:', error);
    }
  }



  /**
   * Load Mark Up/Down dropdowns in the slab table
   */
  function loadMarkUpDownOptions() {
    // Select only the markUpDown dropdowns, not penaltyRate
    const markUpDownSelects = [
      document.getElementById('markUpDown'),
      document.getElementById('markUpDown2'),
      document.getElementById('markUpDown3'),
      document.getElementById('markUpDown4'),
      document.getElementById('markUpDown5')
    ].filter(el => el !== null);

    // Standard Mark Up/Down options
    const options = [
      { value: '', label: '--Select--' },
      { value: 'UP', label: 'Mark Up' },
      { value: 'DOWN', label: 'Mark Down' },
      { value: 'FIXED', label: 'Fixed Rate' }
    ];

    markUpDownSelects.forEach(select => {
      select.innerHTML = '';
      options.forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option.value;
        optionEl.textContent = option.label;
        select.appendChild(optionEl);
      });
    });

    console.log('[Interest Rates] Loaded Mark Up/Down options for', markUpDownSelects.length, 'dropdowns');
  }

  /**
   * Initialize all dropdowns
   */
  async function initializeDropdowns() {
    await loadRateTypes();
    loadMarkUpDownOptions();
  }

  /**
   * Initialize tabs functionality
   */
  function initializeTabs() {
    const tabs = document.querySelectorAll('.rate-tab');

    tabs.forEach(tab => {
      tab.addEventListener('click', function () {
        // Remove active class from all tabs
        tabs.forEach(t => {
          t.classList.remove('active');
          t.style.background = '#f5f5f5';
          t.style.color = '#666';
        });

        // Add active class to clicked tab
        this.classList.add('active');
        this.style.background = 'white';
        this.style.color = '#2c5f7d';

        // Update content (for now just a placeholder)
        const tabName = this.getAttribute('data-tab');
        console.log('[Interest Rates] Switched to tab:', tabName);
      });
    });
  }

  /**
   * Open date picker for a given input ID
   */
  function openDatePickerById(id) {
    const input = document.getElementById(id);
    if (!input) return;
    if (input.disabled) return;
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
        return;
      }
    } catch {
      // ignore
    }
    input.focus();
    input.click();
  }

  /**
   * Wire up date picker buttons
   */
  function wireDatePickerButtons() {
    document.querySelectorAll('[data-open-date]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-open-date');
        if (!id) return;
        openDatePickerById(id);
      });
    });
  }

  /**
   * Format date for request (MM/DD/YYYY HH:MM:SS)
   */
  function formatRequestTime(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  /**
   * Convert date from YYYY-MM-DD to MM/DD/YYYY for SQL Server
   */
  function formatDateForSQL(dateString) {
    if (!dateString) return '';

    // If already in MM/DD/YYYY format, return as is
    if (dateString.includes('/')) return dateString;

    // Convert from YYYY-MM-DD to MM/DD/YYYY
    const [year, month, day] = dateString.split('-');
    return `${month}/${day}/${year}`;
  }

  /**
   * Get Account Interest Rate
   */
  async function getAccountInterestRate(direction = 0) {
    if (!CoreApi) {
      console.error('[Interest Rates] CoreApi not available');
      return;
    }

    try {
      // Get form values
      const effectiveDate = document.getElementById('effectiveDate')?.value || '';
      const rateType = document.getElementById('rateType')?.value || '';

      // Validate required fields
      if (!rateType) {
        showMessage('Please select a Rate Type before viewing interest rates', 'warning');
        document.getElementById('rateType')?.focus();
        return;
      }

      if (!effectiveDate) {
        showMessage('Please select an Effective Date before viewing interest rates', 'warning');
        document.getElementById('effectiveDate')?.focus();
        return;
      }

      // Get context data from session storage - try multiple key variations
      let branchID = window.sessionStorage.getItem('OurBranchID') ||
        window.sessionStorage.getItem('currentBranchID') ||
        window.sessionStorage.getItem('BranchID') ||
        window.sessionStorage.getItem('branchID') || '';

      let accountID = window.sessionStorage.getItem('CurrentAccountID') ||
        window.sessionStorage.getItem('currentAccountID') ||
        window.sessionStorage.getItem('AccountID') ||
        window.sessionStorage.getItem('accountID') || '';

      let operatorID = window.sessionStorage.getItem('OperatorID') ||
        window.sessionStorage.getItem('operatorID') ||
        window.sessionStorage.getItem('UserID') ||
        window.sessionStorage.getItem('userId') ||
        'SYS'; // Default to SYS if not found

      // If not in sessionStorage, try to get from parent window or opener
      if (!branchID || !accountID) {
        // Try to get from parent/opener Account Maintenance form
        const parentWindow = window.opener || window.parent;
        if (parentWindow && parentWindow !== window) {
          try {
            // Try reading from parent's form fields
            branchID = branchID || parentWindow.document.getElementById('branchID')?.value ||
              parentWindow.document.getElementById('OurBranchID')?.value || '';
            accountID = accountID || parentWindow.document.getElementById('accountID')?.value ||
              parentWindow.document.getElementById('AccountID')?.value || '';
            operatorID = operatorID || parentWindow.sessionStorage?.getItem('OperatorID') || '';
          } catch (e) {
            console.warn('[Interest Rates] Cannot access parent window:', e);
          }
        }
      }

      // Validate required parameters
      if (!branchID || !accountID) {
        console.error('[Interest Rates] Missing required parameters:', { branchID, accountID });
        showMessage('Branch ID and Account ID are required. Please select an account first.', 'error');
        return;
      }

      // Convert date from YYYY-MM-DD to MM/DD/YYYY format for SQL Server
      let formattedDate = effectiveDate;
      if (effectiveDate && effectiveDate.includes('-')) {
        const [year, month, day] = effectiveDate.split('-');
        formattedDate = `${month}/${day}/${year}`;
      }

      console.log('[Interest Rates] Parameters:');
      console.log('  branchID:', branchID);
      console.log('  accountID:', accountID);
      console.log('  rateType:', rateType);
      console.log('  effectiveDate (raw):', effectiveDate);
      console.log('  effectiveDate (formatted):', formattedDate);
      console.log('  operatorID:', operatorID);
      console.log('  direction:', direction);

      // Prepare request envelope
      const requestEnvelope = {
        RequestID: "dbo.p_GetAccountInterestRate",
        FormId: "dbo.p_GetAccountInterestRate",
        RequestData: {
          OurBranchID: branchID,
          AccountID: accountID,
          TrxTypeID: rateType,
          EffectiveDate: formattedDate,
          OperatorID: operatorID,
          Direction: direction // 0 for current/view, -1 for previous, 1 for next
        },
        RequestTime: formatRequestTime(new Date()),
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      };

      console.log('[Interest Rates] Fetching interest rates...', requestEnvelope);

      // Show loading indicator
      const loadingOverlay = document.getElementById('loadingOverlay');
      if (loadingOverlay) loadingOverlay.hidden = false;

      // Make API call
      const baseUrl = (window.Environment?.baseUrlCommon || 'http://localhost:5000').replace(/\/+$/, '');
      const response = await CoreApi.post(`${baseUrl}/api/OldAPI`, requestEnvelope);

      // Hide loading indicator
      if (loadingOverlay) loadingOverlay.hidden = true;

      if (response && response.success !== false) {
        console.log('[Interest Rates] Data fetched successfully', response);
        console.log('[Interest Rates] response.data:', response.data);
        console.log('[Interest Rates] response.Details:', response.Details);

        // Stored procedure returns multiple named result sets:
        // Details01 - Empty or metadata
        // Details02 - Grid metadata (doesn't have slab data)
        // Details03 - Current record with BOTH form fields AND slab data
        let rawData = response.data || response;
        console.log('[Interest Rates] Raw data:', rawData);

        // Extract named result sets
        let formData = null;
        let gridData = [];

        // Details03 contains the current record with form fields AND slab data
        if (rawData.Details03 && Array.isArray(rawData.Details03) && rawData.Details03.length > 0) {
          formData = rawData.Details03[0];
          // Use Details03 for grid as well since it has the actual slab data
          gridData = rawData.Details03;
          console.log('[Interest Rates] Form data from Details03:', formData);
          console.log('[Interest Rates] Grid data from Details03:', gridData);
        } else if (rawData.Details01 && Array.isArray(rawData.Details01) && rawData.Details01.length > 0) {
          // Fallback to Details01 if Details03 not present
          formData = rawData.Details01[0];
          gridData = rawData.Details01;
          console.log('[Interest Rates] Form data from Details01:', formData);
          console.log('[Interest Rates] Grid data from Details01:', gridData);
        }

        console.log('[Interest Rates] Final form data:', formData);
        console.log('[Interest Rates] Final grid data:', gridData);

        // Check if we have any data to display
        if (!formData && (!gridData || gridData.length === 0)) {
          console.log('[Interest Rates] No data returned from stored procedure');
          console.log('[Interest Rates] This may indicate:');
          console.log('  1. No interest rate records exist for this account');
          console.log('  2. No records match the selected Rate Type (' + rateType + ')');
          console.log('  3. No records exist for or before the selected date (' + effectiveDate + ')');
          clearForm();
          clearGrid();
          showMessage('No interest rate data found. Account may not have interest rates configured for this date/type.', 'info');
          return;
        }

        // Populate form with record (Details03 contains both form fields and audit fields)
        if (formData && typeof formData === 'object') {
          populateForm(formData);
          showMessage('Interest rate data loaded successfully', 'success');
        } else {
          clearForm();
        }

        // Populate grid with all records
        if (Array.isArray(gridData) && gridData.length > 0) {
          populateGrid(gridData);
          // Disable Add button when records are found
          const btnAdd = document.querySelector('[data-action="add"]');
          if (btnAdd) btnAdd.disabled = true;
        } else {
          clearGrid();
          // Enable Add button when no records are found
          const btnAdd = document.querySelector('[data-action="add"]');
          if (btnAdd) btnAdd.disabled = false;
        }
      } else {
        console.error('[Interest Rates] Failed to fetch data:', response?.message);
        showMessage(response?.message || 'Failed to fetch interest rate data', 'error');
        clearForm();
        clearGrid();
        // Enable Add button on error
        const btnAdd = document.querySelector('[data-action="add"]');
        if (btnAdd) btnAdd.disabled = false;
      }
    } catch (error) {
      // Hide loading indicator
      const loadingOverlay = document.getElementById('loadingOverlay');
      if (loadingOverlay) loadingOverlay.hidden = true;

      console.error('[Interest Rates] Error fetching interest rates:', error);
      showMessage('Error loading interest rate data', 'error');

      // Enable Add button on error
      const btnAdd = document.querySelector('[data-action="add"]');
      if (btnAdd) btnAdd.disabled = false;
    }
  }

  /**
   * Enable form for Add/Edit mode
   */
  let formMode = 'view'; // 'view', 'add', 'edit'
  let pendingRateUpdates = {}; // Track which slabs need rate updates after amount changes

  function enableFormForEdit(mode = 'edit') {
    formMode = mode;
    pendingRateUpdates = {}; // Clear pending updates when entering edit mode

    // Enable all input fields
    const inputs = document.querySelectorAll('#interestRateForm input:not([readonly]), #interestRateForm select');
    inputs.forEach(input => {
      if (input.id !== 'baseRate') { // Keep base rate readonly
        input.removeAttribute('disabled');
      }
    });

    // Enable slab fields
    for (let i = 1; i <= 5; i++) {
      const suffix = i === 1 ? '' : i;
      ['amountFrom', 'amountTo', 'markUpDown', 'markValue', 'effectiveRate'].forEach(field => {
        const el = document.getElementById(`${field}${suffix}`);
        if (el) el.removeAttribute('disabled');
      });
    }

    console.log(`[Interest Rates] Form enabled for ${mode} mode`);
  }

  function disableFormInputs() {
    formMode = 'view';

    // Disable all input fields
    const inputs = document.querySelectorAll('#interestRateForm input, #interestRateForm select');
    inputs.forEach(input => {
      input.setAttribute('disabled', 'disabled');
    });

    // Disable slab fields
    for (let i = 1; i <= 5; i++) {
      const suffix = i === 1 ? '' : i;
      ['amountFrom', 'amountTo', 'markUpDown', 'markValue', 'effectiveRate'].forEach(field => {
        const el = document.getElementById(`${field}${suffix}`);
        if (el) el.setAttribute('disabled', 'disabled');
      });
    }

    console.log('[Interest Rates] Form disabled (view mode)');
  }

  /**
   * Add/Edit Account Interest Rate
   */
  async function saveAccountInterestRate() {
    if (!CoreApi) {
      console.error('[Interest Rates] CoreApi not available');
      return;
    }

    try {
      // Get form values
      const rateType = document.getElementById('rateType')?.value || '';
      const effectiveDate = document.getElementById('effectiveDate')?.value || '';
      const expiryDate = document.getElementById('expiryDate')?.value || '';
      const refId = document.getElementById('refId')?.value || '';

      // Validate required fields
      if (!rateType) {
        showMessage('Please select a Rate Type', 'warning');
        document.getElementById('rateType')?.focus();
        return;
      }

      if (!effectiveDate) {
        showMessage('Please select an Effective Date', 'warning');
        document.getElementById('effectiveDate')?.focus();
        return;
      }

      if (!expiryDate) {
        showMessage('Please select an Expiry Date', 'warning');
        document.getElementById('expiryDate')?.focus();
        return;
      }

      // Validate that Expiry Date is greater than Effective Date
      const effDate = new Date(effectiveDate);
      const expDate = new Date(expiryDate);

      if (expDate <= effDate) {
        showMessage('Expiry Date should be more than Effective Date', 'error');
        document.getElementById('expiryDate')?.focus();
        return;
      }

      // Validate that at least one "To" field has a value
      let hasToValue = false;
      for (let i = 1; i <= 5; i++) {
        const suffix = i === 1 ? '' : i;
        const toValue = document.getElementById(`amountTo${suffix}`)?.value || '';
        if (toValue && toValue.trim() !== '' && parseFloat(toValue) > 0) {
          hasToValue = true;
          break;
        }
      }

      if (!hasToValue) {
        showMessage('Please enter at least one "To" amount value', 'warning');
        document.getElementById('amountTo')?.focus();
        return;
      }

      // Validate that at least one "Effective Rate" field has a value
      let hasEffectiveRate = false;
      for (let i = 1; i <= 5; i++) {
        const suffix = i === 1 ? '' : i;
        const rateValue = document.getElementById(`effectiveRate${suffix}`)?.value || '';
        if (rateValue && rateValue.trim() !== '' && parseFloat(rateValue.replace(/,/g, '')) > 0) {
          hasEffectiveRate = true;
          break;
        }
      }

      if (!hasEffectiveRate) {
        showMessage('Please enter at least one Effective Rate value', 'warning');
        document.getElementById('effectiveRate')?.focus();
        return;
      }

      // Check if there are pending rate updates (amount changed but rate not updated)
      const pendingSlabs = Object.keys(pendingRateUpdates).filter(slab => pendingRateUpdates[slab]);
      if (pendingSlabs.length > 0) {
        const slabNumbers = pendingSlabs.map(s => s.replace('slab', '')).join(', ');
        showMessage(`Please update the Effective Rate for amount slab(s): ${slabNumbers}`, 'error');
        const firstSlab = pendingSlabs[0].replace('slab', '');
        const suffix = firstSlab === '1' ? '' : firstSlab;
        document.getElementById(`effectiveRate${suffix}`)?.focus();
        return;
      }

      // Get context data from session storage
      let branchID = window.sessionStorage.getItem('currentBranchID') ||
        window.sessionStorage.getItem('OurBranchID') || '';

      let accountID = window.sessionStorage.getItem('currentAccountID') ||
        window.sessionStorage.getItem('CurrentAccountID') || '';

      let operatorID = window.sessionStorage.getItem('OperatorID') || 'SYS';

      // Convert dates from YYYY-MM-DD to DATETIME format
      const effectiveDateFormatted = effectiveDate ? formatDateForSQL(effectiveDate) : null;
      const expiryDateFormatted = expiryDate ? formatDateForSQL(expiryDate) : null;

      // Build request data
      const requestData = {
        OurBranchID: branchID,
        AccountID: accountID,
        TrxTypeID: rateType,
        EffectiveDate: effectiveDateFormatted,
        RefNo: formMode === 'add' ? 0 : (parseInt(refId) || 0),
        ExpiryDate: expiryDateFormatted
      };

      // Add 5 slabs data
      for (let i = 1; i <= 5; i++) {
        const suffix = i === 1 ? '' : i;
        const minVariance = document.getElementById(`amountFrom${suffix}`)?.value || '';
        const ceilingAmount = document.getElementById(`amountTo${suffix}`)?.value || '';
        const markUpDown = document.getElementById(`markUpDown${suffix}`)?.value || '';
        const markValue = document.getElementById(`markValue${suffix}`)?.value || '';
        const effectiveRateValue = document.getElementById(`effectiveRate${suffix}`)?.value || '';

        // Map SpreadSign: UP → '+', DOWN → '-', FIXED → 'F'
        let spreadSign = '';
        if (markUpDown === 'UP') spreadSign = '+';
        else if (markUpDown === 'DOWN') spreadSign = '-';
        else if (markUpDown === 'FIXED') spreadSign = 'F';

        // Convert to numbers - remove commas before parsing
        requestData[`MinVariance${i}`] = minVariance ? parseFloat(minVariance.toString().replace(/,/g, '')) : 0;
        requestData[`CeilingAmount${i}`] = ceilingAmount ? parseFloat(ceilingAmount.toString().replace(/,/g, '')) : 0;
        requestData[`MarkingRate${i}`] = markValue ? parseFloat(markValue.toString().replace(/,/g, '')) : 0;
        requestData[`SpreadSign${i}`] = spreadSign;
        requestData[`EffectiveRate${i}`] = effectiveRateValue ? parseFloat(effectiveRateValue.toString().replace(/,/g, '')) : 0;
        requestData[`MaxVariance${i}`] = 0;
      }

      // Add penalty rate
      const penaltyRateSign = document.getElementById('penaltyRate')?.value || '';
      requestData.PenaltySpreadSign = penaltyRateSign || '+';
      requestData.PenaltyMarkingRate = 0;
      requestData.PenaltyRate = 0;

      // Add audit fields - let SP handle timestamps
      requestData.CreatedBy = operatorID;
      requestData.CreatedOn = null;
      requestData.ModifiedBy = operatorID;
      requestData.ModifiedOn = null;
      requestData.SupervisedBy = null;
      requestData.UpdateCount = formMode === 'add' ? 1 : (parseInt(refId) > 0 ? 2 : 1);

      console.log('[Interest Rates] Save mode check:', {
        formMode: formMode,
        refId: refId,
        refIdParsed: parseInt(refId),
        UpdateCount: requestData.UpdateCount,
        RefNo: requestData.RefNo
      });

      console.log('[Interest Rates] Save request data:', requestData);

      // Build request envelope
      const requestEnvelope = {
        RequestID: 'dbo.p_AddEditAccountInterestRate',
        FormId: 'dbo.p_AddEditAccountInterestRate',
        RequestData: requestData,
        RequestTime: formatRequestTime(),
        AppName: 'PROJECT_KAIRO',
        Checksum: ''
      };

      console.log('[Interest Rates] Sending save request:', requestEnvelope);
      console.log('[Interest Rates] Request data details:', {
        RefNo: requestData.RefNo,
        UpdateCount: requestData.UpdateCount,
        EffectiveDate: requestData.EffectiveDate,
        CeilingAmount1: requestData.CeilingAmount1,
        MinVariance1: requestData.MinVariance1,
        EffectiveRate1: requestData.EffectiveRate1
      });

      // Show loading indicator
      const loadingOverlay = document.getElementById('loadingOverlay');
      if (loadingOverlay) loadingOverlay.hidden = false;
      const BASE_URL = (Environment.baseUrlCommon || Environment.baseUrlSystemCodes || "http://localhost:5059").replace(/\/+$/, "");
      const response = await CoreApi.post(`${BASE_URL}/api/OldAPI`, requestEnvelope);

      // Hide loading indicator
      if (loadingOverlay) loadingOverlay.hidden = true;

      console.log('[Interest Rates] Save response:', response);
      console.log('[Interest Rates] Response details:', {
        success: response?.success,
        message: response?.message,
        data: response?.data
      });

      if (response?.success) {
        showMessage(formMode === 'add' ? 'Interest rate added successfully' : 'Interest rate updated successfully', 'success');

        // Clear form and disable inputs
        clearForm();
        clearGrid();
        disableFormInputs();

        // Disable Add button after successful save (record now exists)
        const btnAdd = document.querySelector('[data-action="add"]');
        if (btnAdd) btnAdd.disabled = true;
      } else {
        console.error('[Interest Rates] Failed to save:', response?.message);
        showMessage(response?.message || 'Failed to save interest rate data', 'error');
        // Always show the error popup if deletion fails
        if (response?.message && response.message.includes('already used')) {
          await showAlertDialog('Delete blocked', 'Deletion not possible, data is already used');
        }
      }
    } catch (error) {
      // Hide loading indicator
      const loadingOverlay = document.getElementById('loadingOverlay');
      if (loadingOverlay) loadingOverlay.hidden = true;

      console.error('[Interest Rates] Error saving interest rate:', error);
      showMessage('Error saving interest rate data', 'error');
    }
  }

  /**
   * Delete Account Interest Rate
   */
  async function deleteAccountInterestRate() {
    if (!CoreApi) {
      console.error('[Interest Rates] CoreApi not available');
      return;
    }

    try {
      // Get form values
      const rateType = document.getElementById('rateType')?.value || '';
      const effectiveDate = document.getElementById('effectiveDate')?.value || '';
      const refId = document.getElementById('refId')?.value || '';

      // Validate required fields
      if (!rateType) {
        showMessage('Please select a record to delete', 'warning');
        return;
      }

      if (!effectiveDate) {
        showMessage('Please select a record to delete', 'warning');
        return;
      }

      if (!refId) {
        showMessage('Please select a record to delete', 'warning');
        return;
      }

      // Show confirmation dialog
      const confirmed = await showConfirmDialog('Delete interest rate', 'Are you sure you want to delete this interest rate record?');
      if (!confirmed) {
        return;
      }

      // Get context data from session storage
      let branchID = window.sessionStorage.getItem('currentBranchID') ||
        window.sessionStorage.getItem('OurBranchID') || '';

      let accountID = window.sessionStorage.getItem('currentAccountID') ||
        window.sessionStorage.getItem('CurrentAccountID') || '';

      // Convert date from YYYY-MM-DD to MM/DD/YYYY format
      const effectiveDateFormatted = effectiveDate ? formatDateForSQL(effectiveDate) : null;

      // Build request data
      const requestData = {
        OurBranchID: branchID,
        AccountID: accountID,
        TrxTypeID: rateType,
        EffectiveDate: effectiveDateFormatted,
        RefNo: parseInt(refId) || 0,
        UpdateCount: 3 // 3 for delete
      };

      console.log('[Interest Rates] Delete request data:', requestData);

      // Build request envelope
      const requestEnvelope = {
        RequestID: 'dbo.p_DeleteAccountInterestRate',
        FormId: 'dbo.p_DeleteAccountInterestRate',
        RequestData: requestData,
        RequestTime: formatRequestTime(),
        AppName: 'PROJECT_KAIRO',
        Checksum: ''
      };

      console.log('[Interest Rates] Sending delete request:', requestEnvelope);

      // Show loading indicator
      const loadingOverlay = document.getElementById('loadingOverlay');
      if (loadingOverlay) loadingOverlay.hidden = false;

      const BASE_URL = (Environment.baseUrlCommon || Environment.baseUrlSystemCodes || "http://localhost:5059").replace(/\/+$/, "");
      const response = await CoreApi.post(`${BASE_URL}/api/OldAPI`, requestEnvelope);

      // Hide loading indicator
      if (loadingOverlay) loadingOverlay.hidden = true;

      console.log('[Interest Rates] Delete response:', response);

      if (response?.success) {
        showMessage('Interest rate deleted successfully', 'success');

        // Clear form and disable inputs
        clearForm();
        clearGrid();
        disableFormInputs();

        // Enable Add button after deletion
        const btnAdd = document.querySelector('[data-action="add"]');
        if (btnAdd) btnAdd.disabled = false;
      } else {
        console.error('[Interest Rates] Failed to delete:', response?.message);
        // Always show the error popup if deletion fails
        await showAlertDialog('Delete blocked', 'Deletion not possible, data is already used');
        showMessage(response?.message || 'Failed to delete interest rate data', 'error');
      }
    } catch (error) {
      // Hide loading indicator
      const loadingOverlay = document.getElementById('loadingOverlay');
      if (loadingOverlay) loadingOverlay.hidden = true;

      console.error('[Interest Rates] Error deleting interest rate:', error);
      await showAlertDialog('Delete failed', 'Error deleting interest rate: ' + (error?.message || error));
      showMessage('Error deleting interest rate data', 'error');
    }
  }

  /**
   * Populate grid with fetched records
   */
  function populateGrid(records) {
    console.log('[Interest Rates] populateGrid called with:', records);

    const tbody = document.querySelector('#rateListContent tbody');
    console.log('[Interest Rates] Grid tbody element:', tbody);

    if (!tbody) return;

    // Clear existing rows
    tbody.innerHTML = '';

    if (!records || records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" style="padding: 32px; text-align: center; color: #666;">No records to display.</td></tr>';
      return;
    }

    records.forEach((record, index) => {
      const tr = document.createElement('tr');

      // Add reference number
      const refNo = record.RefNo || record.RefID || '';

      let rowHtml = `<td style="padding: 8px; width: 120px; border-right: 1px solid #e0e0e0;">${refNo}</td>`;

      // Add 5 amount slabs with rates (Amount column shows the range)
      for (let i = 1; i <= 5; i++) {
        let minVariance = record[`MinVariance${i}`];
        let ceilingAmount = record[`CeilingAmount${i}`];
        let effectiveRate = record[`EffectiveRate${i}`];

        // Convert to numbers and ensure positive values
        if (minVariance !== undefined && minVariance !== null && minVariance !== '') {
          const parsed = parseFloat(minVariance);
          minVariance = !isNaN(parsed) ? Math.abs(parsed) : '';
        } else {
          minVariance = '';
        }

        if (ceilingAmount !== undefined && ceilingAmount !== null && ceilingAmount !== '') {
          const parsed = parseFloat(ceilingAmount);
          ceilingAmount = !isNaN(parsed) ? Math.abs(parsed) : '';
        } else {
          ceilingAmount = '';
        }

        if (effectiveRate !== undefined && effectiveRate !== null && effectiveRate !== '') {
          const parsed = parseFloat(effectiveRate);
          effectiveRate = !isNaN(parsed) ? Math.abs(parsed) : '';
        } else {
          effectiveRate = '';
        }

        // Format amount range for Amount column - show absolute values
        let amountRange = '';
        if (minVariance !== '' && ceilingAmount !== '') {
          amountRange = `${minVariance} - ${ceilingAmount}`;
        } else if (minVariance !== '') {
          amountRange = minVariance;
        } else if (ceilingAmount !== '') {
          amountRange = ceilingAmount;
        }

        rowHtml += `
          <td style="padding: 8px; width: 150px; border-right: 1px solid #e0e0e0;">${amountRange}</td>
          <td style="padding: 8px; width: 100px; text-align: right; border-right: 1px solid #e0e0e0;">${effectiveRate}</td>
        `;
      }

      tr.innerHTML = rowHtml;

      // Make row clickable for editing
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => {
        console.log('[Interest Rates] Grid row clicked:', record);
        populateForm(record);
        formMode = 'edit';
        enableFormForEdit('edit');
      });

      // Add hover effect
      tr.addEventListener('mouseenter', () => {
        tr.style.backgroundColor = '#f0f0f0';
      });
      tr.addEventListener('mouseleave', () => {
        tr.style.backgroundColor = '';
      });

      tbody.appendChild(tr);
    });

    console.log('[Interest Rates] Populated grid with', records.length, 'records');
  }

  /**
   * Clear grid data
   */
  function clearGrid() {
    const tbody = document.querySelector('#rateListContent tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="11" style="padding: 32px; text-align: center; color: #666; border: 1px solid #d0d0d0;">No records to display.</td></tr>';
  }

  /**
   * Clear form data
   */
  function clearForm() {
    pendingRateUpdates = {}; // Clear pending rate update flags

    document.getElementById('rateType').value = '';
    document.getElementById('baseRate').value = '0.0000';
    document.getElementById('effectiveDate').value = '';
    document.getElementById('expiryDate').value = '';
    document.getElementById('refId').value = '';

    // Clear slab fields - only first row's Amount From defaults to 0.00
    for (let i = 1; i <= 5; i++) {
      const prefix = i === 1 ? '' : i.toString();
      const amountFrom = document.getElementById(`amount${prefix}From`);
      const amountTo = document.getElementById(`amount${prefix}To`);
      const markUpDown = document.getElementById(`markUpDown${prefix}`);
      const markValue = document.getElementById(`markValue${prefix}`);
      const effectiveRate = document.getElementById(`effectiveRate${prefix}`);

      // Only first row (i === 1) gets 0.00 for From field
      if (amountFrom) amountFrom.value = (i === 1) ? '0.00' : '';
      if (amountTo) amountTo.value = '';
      if (markUpDown) markUpDown.value = '';
      if (markValue) markValue.value = '';
      if (effectiveRate) effectiveRate.value = '';
    }

    // Clear penalty rate
    const penaltyRate = document.getElementById('penaltyRate');
    if (penaltyRate) penaltyRate.value = '';

    // Clear behind the scene
    document.getElementById('createdBy').value = '';
    document.getElementById('createdOn').value = '';
    document.getElementById('modifiedBy').value = '';
    document.getElementById('modifiedOn').value = '';
    document.getElementById('supervisedBy').value = '';
    document.getElementById('supervisedOn').value = '';
  }

  /**
   * Populate form with fetched data
   */
  function populateForm(data) {
    if (!data) return;

    console.log('[Interest Rates] Populating form with:', data);

    // Clear pending rate updates when loading new data
    pendingRateUpdates = {};

    // Populate main fields
    if (data.TrxTypeID) document.getElementById('rateType').value = data.TrxTypeID;
    // BaseRate comes from a different result set, not in the main record

    // Convert dates to ISO format for date inputs (YYYY-MM-DD)
    if (data.EffectiveDate) {
      const isoDate = window.GlobalUtils?.parseDateInput(data.EffectiveDate) || data.EffectiveDate;
      document.getElementById('effectiveDate').value = isoDate;
    }
    if (data.RefNo) document.getElementById('refId').value = data.RefNo;
    if (data.ExpiryDate) {
      const isoDate = window.GlobalUtils?.parseDateInput(data.ExpiryDate) || data.ExpiryDate;
      document.getElementById('expiryDate').value = isoDate;
    }

    // Populate amount slabs from column-based data (5 slabs)
    for (let i = 1; i <= 5; i++) {
      const prefix = i === 1 ? '' : i.toString();

      const fromField = document.getElementById(`amount${prefix}From`);
      const toField = document.getElementById(`amount${prefix}To`);
      const markUpDownField = document.getElementById(`markUpDown${prefix}`);
      const markValueField = document.getElementById(`markValue${prefix}`);
      const effectiveRateField = document.getElementById(`effectiveRate${prefix}`);

      // MinVariance and CeilingAmount are the amount range - convert to positive if negative
      if (fromField && data[`MinVariance${i}`] !== undefined) {
        let minValue = data[`MinVariance${i}`];
        if (typeof minValue === 'number' && minValue < 0) minValue = Math.abs(minValue);
        fromField.value = minValue;
      }
      if (toField && data[`CeilingAmount${i}`] !== undefined) {
        let maxValue = data[`CeilingAmount${i}`];
        if (typeof maxValue === 'number' && maxValue < 0) maxValue = Math.abs(maxValue);
        toField.value = maxValue;
      }

      // SpreadSign is the mark up/down indicator (+/-)
      if (markUpDownField && data[`SpreadSign${i}`]) {
        const spreadSign = data[`SpreadSign${i}`];
        // Map to dropdown values: + for Mark Up, - for Mark Down
        if (spreadSign === '+') markUpDownField.value = 'UP';
        else if (spreadSign === '-') markUpDownField.value = 'DOWN';
        else markUpDownField.value = 'FIXED';
      }

      // MarkingRate is the percentage
      if (markValueField && data[`MarkingRate${i}`] !== undefined) markValueField.value = data[`MarkingRate${i}`];

      // EffectiveRate is the calculated rate
      if (effectiveRateField && data[`EffectiveRate${i}`] !== undefined) effectiveRateField.value = data[`EffectiveRate${i}`];
    }

    // Populate penalty rate - map SpreadSign to +/-
    if (data.PenaltyRate !== undefined) {
      const penaltyRateField = document.getElementById('penaltyRate');
      if (penaltyRateField) {
        // PenaltyRate might have a sign, extract it
        const penaltyValue = String(data.PenaltyRate);
        if (penaltyValue.startsWith('+') || penaltyValue.startsWith('-')) {
          penaltyRateField.value = penaltyValue.charAt(0);
        } else {
          penaltyRateField.value = '';
        }
      }
    }

    // Populate Behind The Scene fields from same record (Details03 contains both form and audit fields)
    if (data.CreatedBy) document.getElementById('createdBy').value = data.CreatedBy;
    if (data.CreatedOn) {
      const formattedDateTime = window.GlobalUtils?.formatDateTime(data.CreatedOn) || data.CreatedOn;
      document.getElementById('createdOn').value = formattedDateTime;
    }
    if (data.ModifiedBy) document.getElementById('modifiedBy').value = data.ModifiedBy;
    if (data.ModifiedOn) {
      const formattedDateTime = window.GlobalUtils?.formatDateTime(data.ModifiedOn) || data.ModifiedOn;
      document.getElementById('modifiedOn').value = formattedDateTime;
    }
    if (data.SupervisedBy) document.getElementById('supervisedBy').value = data.SupervisedBy;
    if (data.SupervisedOn) {
      const formattedDateTime = window.GlobalUtils?.formatDateTime(data.SupervisedOn) || data.SupervisedOn;
      document.getElementById('supervisedOn').value = formattedDateTime;
    }
  }

  /**
   * Show message in the message bar
   */
  function showMessage(text, type = 'info') {
    const messageBar = document.querySelector('.de-message-bar');
    if (!messageBar) return;

    const messageText = messageBar.querySelector('span');
    if (messageText) messageText.textContent = text;

    messageBar.classList.remove('de-message-bar--success', 'de-message-bar--error', 'de-message-bar--warning');

    if (type === 'success') {
      messageBar.classList.add('de-message-bar--success');
    } else if (type === 'error') {
      messageBar.classList.add('de-message-bar--error');
    } else if (type === 'warning') {
      messageBar.classList.add('de-message-bar--warning');
    }

    messageBar.style.display = 'flex';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      messageBar.style.display = 'none';
    }, 5000);
  }

  function wireTitleBar() {
    var btnClose = document.querySelector('[data-ir-close]');
    var btnMin = document.querySelector('[data-ir-minimize]');
    var btnRefresh = document.querySelector('[data-ir-refresh]');

    if (btnClose) btnClose.addEventListener('click', postClose);

    if (btnMin) {
      btnMin.addEventListener('click', function () {
        var root = document.querySelector('[data-ir-window]');
        var minimized = root && root.classList.contains('ir-window--minimized');
        setMinimized(!minimized);
      });
    }

    if (btnRefresh) btnRefresh.addEventListener('click', doRefresh);
  }

  function wireButtons() {
    var btnBack = document.querySelector('[data-ir-back]');
    if (btnBack) btnBack.addEventListener('click', postClose);

    // Wire View button
    var btnView = document.querySelector('[data-action="view"]');
    if (btnView) {
      btnView.addEventListener('click', function (e) {
        e.preventDefault();
        getAccountInterestRate();
      });
    }

    // Wire navigation buttons (Previous/Next in the slab section)
    const btnPrev = document.querySelector('.btn-nav-prev');
    const btnNext = document.querySelector('.btn-nav-next');

    if (btnPrev) {
      btnPrev.addEventListener('click', function (e) {
        e.preventDefault();
        getAccountInterestRate(-1); // Direction: -1 for previous
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', function (e) {
        e.preventDefault();
        getAccountInterestRate(1); // Direction: 1 for next
      });
    }

    // Wire Add button
    var btnAdd = document.querySelector('[data-action="add"]');
    if (btnAdd) {
      btnAdd.addEventListener('click', function (e) {
        e.preventDefault();
        clearForm();
        clearGrid();
        enableFormForEdit('add');
        // Set default Rate Type to ADV (Advance)
        const rateTypeSelect = document.getElementById('rateType');
        if (rateTypeSelect) rateTypeSelect.value = 'ADV';
        // Set first row Amount From to 0.00
        const firstAmountFrom = document.getElementById('amountFrom');
        if (firstAmountFrom) firstAmountFrom.value = '0.00';
        document.getElementById('effectiveDate')?.focus();
        showMessage('Add mode: Enter new interest rate details', 'info');
      });
    }

    // Wire Edit button
    var btnEdit = document.querySelector('[data-action="edit"]');
    if (btnEdit) {
      btnEdit.addEventListener('click', function (e) {
        e.preventDefault();
        const refId = document.getElementById('refId')?.value;
        if (!refId) {
          showMessage('Please view a record before editing', 'warning');
          return;
        }
        enableFormForEdit('edit');
        document.getElementById('effectiveDate')?.focus();
        showMessage('Edit mode: Modify interest rate details', 'info');
      });
    }

    // Wire Save button
    var btnSave = document.querySelector('[data-action="save"]');
    if (btnSave) {
      btnSave.addEventListener('click', function (e) {
        e.preventDefault();
        if (formMode === 'view') {
          showMessage('Please click Add or Edit before saving', 'warning');
          return;
        }
        saveAccountInterestRate();
      });
    }

    // Wire Cancel button
    var btnCancel = document.querySelector('[data-action="cancel"]');
    if (btnCancel) {
      btnCancel.addEventListener('click', function (e) {
        e.preventDefault();
        clearForm();
        clearGrid();
        disableFormInputs();
        showMessage('Changes cancelled', 'info');
      });
    }

    // Wire Delete button
    var btnDelete = document.querySelector('[data-action="delete"]');
    if (btnDelete) {
      btnDelete.addEventListener('click', function (e) {
        e.preventDefault();
        deleteAccountInterestRate();
      });
    }

    // Wire Close button
    var btnClose = document.querySelector('[data-action="close"]');
    if (btnClose) {
      btnClose.addEventListener('click', function (e) {
        e.preventDefault();
        postClose();
      });
    }

    var noopSelectors = [
      '[data-ir-prev]',
      '[data-ir-next]',
      '[data-ir-effective-lookup]'
    ];

    noopSelectors.forEach(function (sel) {
      var el = document.querySelector(sel);
      if (!el) return;
      el.addEventListener('click', function (e) {
        e.preventDefault();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    wireTitleBar();
    wireButtons();
    initializeDropdowns();
    initializeTabs();
    wireDatePickerButtons();

    // Set default Rate Type to ADV (Advance) on page load
    setTimeout(function () {
      const rateTypeSelect = document.getElementById('rateType');
      if (rateTypeSelect && !rateTypeSelect.value) {
        rateTypeSelect.value = 'ADV';
      }
    }, 100);

    // Enable Add button when effective date is filled
    const effectiveDateInput = document.getElementById('effectiveDate');
    const btnAdd = document.querySelector('[data-action="add"]');

    if (effectiveDateInput && btnAdd) {
      effectiveDateInput.addEventListener('change', function () {
        if (this.value) {
          btnAdd.disabled = false;
        }
      });
    }

    // Prompt to update effective rate when amount changes
    for (let i = 1; i <= 5; i++) {
      const suffix = i === 1 ? '' : i;
      const amountToField = document.getElementById(`amountTo${suffix}`);
      const effectiveRateField = document.getElementById(`effectiveRate${suffix}`);

      if (amountToField && effectiveRateField) {
        // Store original value when field gets focus
        let originalValue = '';

        amountToField.addEventListener('focus', function () {
          originalValue = this.value || '';
        });

        amountToField.addEventListener('change', function () {
          const newValue = this.value || '';

          if (newValue && newValue.trim() !== '') {
            // Parse values for comparison (remove commas)
            const newAmount = parseFloat(newValue.replace(/,/g, ''));
            const oldAmount = parseFloat(originalValue.replace(/,/g, ''));

            // Check if value has changed
            if (originalValue && !isNaN(oldAmount) && !isNaN(newAmount) && newAmount !== oldAmount) {
              pendingRateUpdates[`slab${i}`] = true; // Mark this slab as needing rate update
              showMessage('Amount has changed. Please verify and update the Effective Rate if needed', 'warning');
              effectiveRateField.focus();
            }
            // Check if effective rate is empty or zero (for new entries)
            else if (!originalValue || originalValue.trim() === '') {
              const rateValue = effectiveRateField.value || '';
              const rate = parseFloat(rateValue.replace(/,/g, ''));

              if (!rateValue || rateValue.trim() === '' || rate === 0 || isNaN(rate)) {
                showMessage('Please enter the Effective Rate for this amount range', 'warning');
                effectiveRateField.focus();
              }
            }
          }
        });

        // Clear pending flag when effective rate is updated
        effectiveRateField.addEventListener('change', function () {
          if (this.value && this.value.trim() !== '') {
            pendingRateUpdates[`slab${i}`] = false; // Clear the pending flag
          }
        });
      }
    }
  });
})();
