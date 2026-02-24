(function () {
  console.log('[LegalRemarks] Initializing Loan Legal Remarks module...');

  const rowsHost = document.querySelector('[data-llrm-rows]');
  const emptyState = document.querySelector('[data-llrm-empty]');

  const btnAdd = document.querySelector('[data-action="add"]');
  const btnEdit = document.querySelector('[data-action="edit"]');
  const btnSave = document.querySelector('[data-action="save"]');
  const btnDelete = document.querySelector('[data-action="delete"]');
  const btnCancel = document.querySelector('[data-action="cancel"]');
  const btnBack = document.querySelector('[data-action="back"]');

  const formFields = Array.from(
    document.querySelectorAll(
      '#LegalReviewDate,#LegalRemarks,#CourtName,#CourtFileNumber'
    )
  );

  const state = {
    rows: [],
    selectedIndex: -1,
    mode: 'view', // view | editing | add
    nextRemarkNo: 1,
    parentData: null, // Store parent form data (AccountID, LoanSeries, etc.)
    isSupervised: false,
  };

  function isEmbedded() {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }

  function closeSubwindow() {
    if (!isEmbedded()) return;
    window.parent.postMessage({ action: 'close-child-form' }, '*');
  }

  /**
   * Get parent form data (from Loan Maintenance screen)
   */
  function getParentData() {
    try {
      if (!isEmbedded()) return null;

      const parentDoc = window.parent.document;
      const branchID = parentDoc.getElementById('BranchID')?.value || '';
      const accountID = parentDoc.getElementById('AccountID')?.value || '';
      const loanSeries = parentDoc.getElementById('LoanSeries')?.value || '';

      console.log('[LegalRemarks] Parent data:', { branchID, accountID, loanSeries });

      return {
        OurBranchID: branchID,
        AccountID: accountID,
        LoanSeries: loanSeries
      };
    } catch (error) {
      console.error('[LegalRemarks] Error getting parent data:', error);
      return null;
    }
  }

  /**
   * Get operator ID from session
   */
  function getOperatorId() {
    try {
      const session = window.parent?.AuthService?.getSession?.();
      return session?.operatorId || session?.operatorID || session?.name || 'web_portal';
    } catch {
      return 'web_portal';
    }
  }

  function getValue(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
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

  function formatDateForSave(dateString) {
    if (!dateString) return null;
    try {
      // Handle "today" and "yesterday" shortcuts
      if (dateString === 'today') {
        return new Date().toISOString().split('T')[0];
      }
      if (dateString === 'yesterday') {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
      }
      return dateString;
    } catch {
      return dateString;
    }
  }

  function getDateLabel() {
    const raw = getValue('LegalReviewDate');
    if (!raw) return '';
    if (raw === 'today') return new Date().toLocaleDateString('en-GB');
    if (raw === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toLocaleDateString('en-GB');
    }
    return formatDateForDisplay(raw);
  }

  function readForm() {
    return {
      remarkNo: null,
      remarkDate: formatDateForSave(getValue('LegalReviewDate')),
      remarks: getValue('LegalRemarks'),
      courtName: getValue('CourtName'),
      courtFileNumber: getValue('CourtFileNumber'),
    };
  }

  function applyRowToForm(row) {
    setValue('LegalReviewDate', row.remarkDate || '');
    setValue('LegalRemarks', row.remarks || '');
    setValue('CourtName', row.courtName || '');
    setValue('CourtFileNumber', row.courtFileNumber || '');

    // Update BTS fields
    setValue('CreatedBy', row.createdBy || '');
    setValue('CreatedOn', formatDateForDisplay(row.createdOn) || '');
    setValue('ModifiedBy', row.modifiedBy || '');
    setValue('ModifiedOn', formatDateForDisplay(row.modifiedOn) || '');
    setValue('SupervisedBy', row.supervisedBy || '');
    setValue('SupervisedOn', formatDateForDisplay(row.supervisedOn) || '');
  }

  function setFieldsEnabled(enabled) {
    formFields.forEach((el) => {
      if (!el) return;
      el.disabled = !enabled;
    });
  }

  function setMode(nextMode) {
    state.mode = nextMode;
    const hasSelection = state.selectedIndex >= 0;

    console.log('[LegalRemarks] Mode changed to:', nextMode, 'Selection:', hasSelection);

    // Button states based on mode
    if (btnAdd) btnAdd.disabled = nextMode === 'editing' || nextMode === 'add';
    if (btnEdit) btnEdit.disabled = !hasSelection || nextMode === 'editing' || nextMode === 'add';
    if (btnDelete) btnDelete.disabled = !hasSelection || nextMode === 'editing' || nextMode === 'add';
    if (btnSave) btnSave.disabled = nextMode !== 'editing' && nextMode !== 'add';
    if (btnCancel) btnCancel.disabled = nextMode !== 'editing' && nextMode !== 'add';
    if (btnBack) btnBack.disabled = nextMode === 'editing' || nextMode === 'add';

    // Field enable/disable
    setFieldsEnabled(nextMode === 'editing' || nextMode === 'add');
  }

  function clearForm() {
    setValue('LegalReviewDate', '');
    setValue('LegalRemarks', '');
    setValue('CourtName', '');
    setValue('CourtFileNumber', '');
    setValue('CreatedBy', '');
    setValue('CreatedOn', '');
    setValue('ModifiedBy', '');
    setValue('ModifiedOn', '');
    setValue('SupervisedBy', '');
    setValue('SupervisedOn', '');
  }

  function showMessage(message, type = 'info') {
    console.log(`[LegalRemarks] ${type.toUpperCase()}:`, message);
    // TODO: Implement proper message display (toast/alert)
    if (type === 'error' || type === 'success') {
      alert(message);
    }
  }

  function validateForm() {
    // Clear any previous error states
    formFields.forEach(el => el?.classList.remove('is-invalid'));

    // Required: Legal Review Date
    if (!getValue('LegalReviewDate')) {
      document.getElementById('LegalReviewDate')?.classList.add('is-invalid');
      showMessage('Legal Review Date is required', 'error');
      return false;
    }

    // Required: Legal Remarks
    if (!getValue('LegalRemarks')) {
      document.getElementById('LegalRemarks')?.classList.add('is-invalid');
      showMessage('Legal Remarks is required', 'error');
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

  function render() {
    if (!rowsHost) return;

    rowsHost.innerHTML = '';

    if (!state.rows.length) {
      if (emptyState) emptyState.style.display = '';
    } else {
      if (emptyState) emptyState.style.display = 'none';

      state.rows.forEach((row, index) => {
        const tr = document.createElement('tr');
        if (index === state.selectedIndex) tr.classList.add('is-selected');

        tr.innerHTML = `
          <td>${escapeHtml(row.remarkNo || index + 1)}</td>
          <td>${escapeHtml(formatDateForDisplay(row.remarkDate))}</td>
          <td>${escapeHtml(row.remarks)}</td>
          <td>${escapeHtml(row.courtName)}</td>
          <td>${escapeHtml(row.courtFileNumber)}</td>
        `;

        tr.addEventListener('click', () => {
          state.selectedIndex = index;
          applyRowToForm(row);
          setMode('view');
          render();
        });

        rowsHost.appendChild(tr);
      });
    }

    setMode(state.mode);
  }

  /**
   * Load legal remarks from database
   */
  async function loadData() {
    try {
      console.log('[LegalRemarks] Loading data...');

      // Get parent form data
      state.parentData = getParentData();
      if (!state.parentData || !state.parentData.AccountID) {
        showMessage('Cannot load data: Missing AccountID from parent form', 'error');
        return;
      }

      // Check if service is available
      if (!window.parent?.LegalRemarksService) {
        console.warn('[LegalRemarks] LegalRemarksService not available yet');
        showMessage('Legal Remarks Service not available', 'error');
        return;
      }

      const response = await window.parent.LegalRemarksService.getLegalRemarks(state.parentData);

      if (response && response.success) {
        const data = response.data || response.Details || [];
        console.log('[LegalRemarks] Data loaded:', data);

        // Parse remarks field (legacy format: "remarks~courtName~courtFileNumber")
        state.rows = data.map((item, index) => {
          const remarksParts = (item.Remarks || '').split('~');
          return {
            rowID: item.RowID,
            remarkNo: item.RowID, // Use RowID as the remark number
            remarkDate: item.RemarkDate,
            remarks: remarksParts[0] || '',
            courtName: remarksParts[1] || '',
            courtFileNumber: remarksParts[2] || '',
            createdBy: item.CreatedBy || '',
            createdOn: item.CreatedOn || '',
            modifiedBy: '',
            modifiedOn: '',
            supervisedBy: '',
            supervisedOn: ''
          };
        });

        // Update next remark number (not used currently, but keeping for potential future use)
        if (state.rows.length > 0) {
          state.nextRemarkNo = Math.max(...state.rows.map(r => r.remarkNo || 0)) + 1;
        }

        render();
      } else {
        showMessage(response?.message || 'Failed to load legal remarks', 'error');
      }
    } catch (error) {
      console.error('[LegalRemarks] Error loading data:', error);
      showMessage('Error loading data: ' + error.message, 'error');
    }
  }

  function onAdd() {
    console.log('[LegalRemarks] Add button clicked');
    clearForm();
    state.selectedIndex = -1;
    setMode('add');
    document.getElementById('LegalRemarks')?.focus();
    render();
  }

  function onEdit() {
    if (state.selectedIndex < 0) {
      showMessage('Please select a record to edit', 'error');
      return;
    }
    console.log('[LegalRemarks] Edit button clicked');
    setMode('editing');
    render();
  }

  async function onSave() {
    if (state.mode !== 'editing' && state.mode !== 'add') return;

    console.log('[LegalRemarks] Save button clicked');

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      const formData = readForm();

      // Check if service is available
      if (!window.parent?.LegalRemarksService) {
        showMessage('Legal Remarks Service not available', 'error');
        return;
      }

      // Prepare save data (combine remarks with court info using delimiter)
      const remarksData = {
        OurBranchID: state.parentData.OurBranchID,
        AccountID: state.parentData.AccountID,
        LoanSeries: state.parentData.LoanSeries,
        Remarks: `${formData.remarks}~${formData.courtName}~${formData.courtFileNumber}`,
        RemarkDate: formData.remarkDate,
        OperatorID: getOperatorId(),
        CreatedBy: getOperatorId(),
        RowID: state.mode === 'editing' && state.selectedIndex >= 0 
          ? state.rows[state.selectedIndex].rowID 
          : 0
      };

      console.log('[LegalRemarks] Saving:', remarksData);

      const response = await window.parent.LegalRemarksService.saveLegalRemark(remarksData);

      if (response && response.success) {
        showMessage('Data Saved Successfully', 'success');
        
        // Reload data
        await loadData();
        
        // Reset mode
        clearForm();
        state.selectedIndex = -1;
        setMode('view');
      } else {
        showMessage(response?.message || 'Failed to save record', 'error');
      }
    } catch (error) {
      console.error('[LegalRemarks] Error saving:', error);
      showMessage('Error saving record: ' + error.message, 'error');
    }
  }

  async function onDelete() {
    if (state.selectedIndex < 0) {
      showMessage('Please select a record to delete', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }

    console.log('[LegalRemarks] Delete button clicked');

    try {
      const row = state.rows[state.selectedIndex];

      // Check if service is available
      if (!window.parent?.LegalRemarksService) {
        showMessage('Legal Remarks Service not available', 'error');
        return;
      }

      const deleteData = {
        ...state.parentData,
        RowID: row.rowID,
        OperatorID: getOperatorId()
      };

      console.log('[LegalRemarks] Deleting:', deleteData);

      const response = await window.parent.LegalRemarksService.deleteLegalRemark(deleteData);

      if (response && response.success) {
        showMessage('Record deleted successfully', 'info');
        
        // Reload data
        await loadData();
        
        // Reset
        clearForm();
        state.selectedIndex = -1;
        setMode('view');
      } else {
        showMessage(response?.message || 'Failed to delete record', 'error');
      }
    } catch (error) {
      console.error('[LegalRemarks] Error deleting:', error);
      showMessage('Error deleting record: ' + error.message, 'error');
    }
  }

  function onCancel() {
    if (state.mode === 'add') {
      clearForm();
      state.selectedIndex = -1;
    } else if (state.mode === 'editing' && state.selectedIndex >= 0) {
      // Restore from selected row
      applyRowToForm(state.rows[state.selectedIndex]);
    }
    setMode('view');
    render();
  }

  function init() {
    console.log('[LegalRemarks] Initializing...');

    if (isEmbedded()) {
      document.body.classList.add('llrm-embedded');
    }

    // Bind button events
    if (btnAdd) btnAdd.addEventListener('click', onAdd);
    if (btnEdit) btnEdit.addEventListener('click', onEdit);
    if (btnSave) btnSave.addEventListener('click', onSave);
    if (btnDelete) btnDelete.addEventListener('click', onDelete);
    if (btnCancel) btnCancel.addEventListener('click', onCancel);
    if (btnBack) btnBack.addEventListener('click', closeSubwindow);

    // Initialize mode
    setMode('view');
    
    // Load data from database
    loadData();

    console.log('[LegalRemarks] Initialization complete');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
