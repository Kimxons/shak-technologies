/**
 * Statement View - Modern Professional Statement Module
 * Version: 2.0.0 - January 2026
 */
(function () {
  'use strict';

  console.log('[StatementView] Initializing...');

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // DATE UTILITIES
  function formatDateDisplay(date) {
    if (!date || isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = MONTHS[date.getMonth()];
    const year = date.getFullYear();
    return day + '-' + month + '-' + year;
  }

  function formatDateApi(date) {
    if (!date || isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function parseDateDisplay(str) {
    if (!str) return null;
    const parts = str.split('-');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const monthIdx = MONTHS.findIndex(function(m) { return m.toLowerCase() === parts[1].toLowerCase(); });
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || monthIdx === -1 || isNaN(year)) return null;
    return new Date(year, monthIdx, day);
  }

  function getToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function getFirstOfMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  function getFirstOfPreviousMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }

  function formatCurrency(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Format currency with color coding for positive (green) and negative (red in brackets)
  function formatCurrencyColored(value, isHTML) {
    const num = parseFloat(value);
    if (isNaN(num)) return isHTML ? '<span style="color: #666;">0.00</span>' : '0.00';
    
    const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    if (isHTML) {
      if (num < 0) {
        return '<span style="color: #d32f2f; font-weight: 500;">(' + formatted.replace('-', '') + ')</span>';
      } else if (num > 0) {
        return '<span style="color: #388e3c; font-weight: 500;">' + formatted + '</span>';
      } else {
        return '<span style="color: #666;">0.00</span>';
      }
    } else {
      if (num < 0) {
        return '(' + formatted.replace('-', '') + ')';
      } else {
        return formatted;
      }
    }
  }

  // Format date value from API (ISO string or Date) to display format
  function formatDateValue(dateVal) {
    if (!dateVal) return '';
    if (typeof dateVal === 'string' && dateVal.match(/^\d{1,2}-[A-Za-z]{3}-\d{4}$/)) {
      return dateVal;
    }
    try {
      var d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        var day = String(d.getDate()).padStart(2, '0');
        return day + '-' + MONTHS[d.getMonth()] + '-' + d.getFullYear();
      }
    } catch(e) {
      console.warn('[StatementView] Could not parse date:', dateVal);
    }
    return String(dateVal);
  }

  // PARENT STATE ACCESS
  function getParentState() {
    var baseState = null;
    if (window.parent && window.parent !== window && window.parent.AccountMaintenanceState) {
      baseState = window.parent.AccountMaintenanceState;
    } else if (window.AccountMaintenanceState) {
      baseState = window.AccountMaintenanceState;
    }

    var merged = {
      OurBranchID: (baseState && baseState.OurBranchID) ? baseState.OurBranchID : '',
      AccountID: (baseState && baseState.AccountID) ? baseState.AccountID : '',
      OperatorID: (baseState && baseState.OperatorID) ? baseState.OperatorID : '',
      ClientID: (baseState && baseState.ClientID) ? baseState.ClientID : ''
    };

    // Optional overrides from querystring (used by Client 360). If no params exist, this is a no-op.
    try {
      var url = new URL(window.location.href);
      var branchId = url.searchParams.get('BranchID') || url.searchParams.get('OurBranchID');
      var accountId = url.searchParams.get('AccountID');
      var operatorId = url.searchParams.get('OperatorID');
      var clientId = url.searchParams.get('ClientID');

      if (branchId) merged.OurBranchID = branchId;
      if (accountId) merged.AccountID = accountId;
      if (operatorId) merged.OperatorID = operatorId;
      if (clientId) merged.ClientID = clientId;
    } catch (e) {
      // Ignore URL parsing errors
    }

    return merged;
  }

  // UI HELPERS
  function showLoader(message) {
    const overlay = document.getElementById('loadingOverlay');
    const textEl = overlay ? overlay.querySelector('span') : null;
    if (textEl) textEl.textContent = message || 'Loading...';
    if (overlay) overlay.hidden = false;
  }

  function hideLoader() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.hidden = true;
  }

  function setStatus(text) {
    const statusBar = document.querySelector('.de-status-bar');
    if (statusBar) statusBar.textContent = text;
  }

  function showError(message) {
    const statementFor = document.getElementById('statementFor');
    if (statementFor) {
      statementFor.style.borderColor = '#ef4444';
      statementFor.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';
      setTimeout(function() {
        statementFor.style.borderColor = '';
        statementFor.style.boxShadow = '';
      }, 3000);
    }
    setStatus(message);
    alert(message);
  }

  // PERIOD CHANGE HANDLER
  function handlePeriodChange() {
    const statementFor = document.getElementById('statementFor');
    const fromDate = document.getElementById('fromDate');
    const toDate = document.getElementById('toDate');
    const fromDatePicker = document.getElementById('fromDatePicker');
    const toDatePicker = document.getElementById('toDatePicker');
    
    if (!statementFor || !fromDate || !toDate) return;
    
    const period = statementFor.value;
    const today = getToday();

    statementFor.style.borderColor = '';
    statementFor.style.boxShadow = '';

    switch (period) {
      case '0':
        fromDate.value = formatDateDisplay(today);
        toDate.value = formatDateDisplay(today);
        fromDate.disabled = true;
        toDate.disabled = true;
        if (fromDatePicker) fromDatePicker.disabled = true;
        if (toDatePicker) toDatePicker.disabled = true;
        break;
      case '1':
        fromDate.value = formatDateDisplay(getFirstOfMonth());
        toDate.value = formatDateDisplay(today);
        fromDate.disabled = true;
        toDate.disabled = true;
        if (fromDatePicker) fromDatePicker.disabled = true;
        if (toDatePicker) toDatePicker.disabled = true;
        // Auto-trigger for Current Month
        fetchStatement();
        break;
      case '2':
        fromDate.value = formatDateDisplay(getFirstOfPreviousMonth());
        toDate.value = formatDateDisplay(today);
        fromDate.disabled = true;
        toDate.disabled = true;
        if (fromDatePicker) fromDatePicker.disabled = true;
        if (toDatePicker) toDatePicker.disabled = true;
        // Auto-trigger for Current and Previous Month
        fetchStatement();
        break;
      case '3':
        fromDate.disabled = false;
        toDate.disabled = false;
        if (fromDatePicker) fromDatePicker.disabled = false;
        if (toDatePicker) toDatePicker.disabled = false;
        // Clear the statement grid when Date Range is selected
        populateGrid([]);
        setStatus('Ready');
        break;
    }
  }

  // DATE PICKERS
  function wireDatePickers() {
    function pickDate(inputId, buttonEl) {
      var input = document.getElementById(inputId);
      if (!input || input.disabled) return;
      
      var picker = document.createElement('input');
      picker.type = 'date';
      picker.style.position = 'absolute';
      picker.style.opacity = '0';
      picker.style.pointerEvents = 'none';
      
      // Position near the button element
      if (buttonEl) {
        var rect = buttonEl.getBoundingClientRect();
        picker.style.left = rect.left + 'px';
        picker.style.top = (rect.bottom + window.scrollY) + 'px';
      }
      
      picker.onchange = function () {
        if (picker.value) {
          var date = new Date(picker.value + 'T00:00:00');
          input.value = formatDateDisplay(date);
        }
        picker.remove();
      };
      
      picker.onblur = function() {
        setTimeout(function() { picker.remove(); }, 200);
      };
      
      document.body.appendChild(picker);
      if (picker.showPicker) {
        picker.showPicker();
      } else {
        picker.click();
      }
    }
    
    var fromBtn = document.getElementById('fromDatePicker');
    var toBtn = document.getElementById('toDatePicker');
    if (fromBtn) {
      fromBtn.onclick = function(e) { pickDate('fromDate', e.currentTarget); };
    }
    if (toBtn) {
      toBtn.onclick = function(e) { pickDate('toDate', e.currentTarget); };
    }
  }

  // FETCH STATEMENT
  function fetchStatement() {
    console.log('[StatementView] fetchStatement called');
    
    var statementFor = document.getElementById('statementFor');
    if (!statementFor || statementFor.value === '0') {
      showError('Please select a Statement Period before viewing.');
      return;
    }

    var state = getParentState();
    console.log('[StatementView] Parent state:', state);

    var fromDateEl = document.getElementById('fromDate');
    var toDateEl = document.getElementById('toDate');
    var fromDateObj = parseDateDisplay(fromDateEl.value);
    var toDateObj = parseDateDisplay(toDateEl.value);

    if (!fromDateObj || !toDateObj) {
      showError('Invalid date format. Please use dd-mmm-yyyy.');
      return;
    }

    if (fromDateObj > toDateObj) {
      showError('From Date cannot be after To Date.');
      return;
    }

    var requestData = {
      OurBranchID: state.OurBranchID || '',
      AccountID: state.AccountID || '',
      FromDate: formatDateApi(fromDateObj),
      ToDate: formatDateApi(toDateObj),
      OperatorID: state.OperatorID || ''
    };

    console.log('[StatementView] Request Data:', requestData);
    showLoader('Fetching account transactions...');
    setStatus('Loading...');

    if (window.accountservice && typeof window.accountservice.getAccountTransactions === 'function') {
      console.log('[StatementView] Using accountservice.getAccountTransactions');
      window.accountservice.getAccountTransactions(requestData)
        .then(function(response) {
          console.log('[StatementView] API Response:', response);
          console.log('[StatementView] Response success:', response ? response.success : 'no response');
          
          if (response && response.success === false) {
            console.warn('[StatementView] API returned success=false:', response.message);
            setStatus(response.message || 'No data found');
            populateGrid([]);
            return;
          }
          
          var rows = [];
          
          if (response && Array.isArray(response.Details)) {
            rows = response.Details;
            console.log('[StatementView] Using response.Details, length:', rows.length);
          } else if (response && response.data && Array.isArray(response.data.Details)) {
            rows = response.data.Details;
            console.log('[StatementView] Using response.data.Details, length:', rows.length);
          } else if (response && Array.isArray(response.data)) {
            rows = response.data;
            console.log('[StatementView] Using response.data array, length:', rows.length);
          } else if (Array.isArray(response)) {
            rows = response;
            console.log('[StatementView] Response is array, length:', rows.length);
          }
          
          if (rows.length > 0) {
            console.log('[StatementView] First row keys:', Object.keys(rows[0]));
            console.log('[StatementView] First row:', rows[0]);
          }
          
          populateGrid(rows);
          setStatus('Loaded ' + rows.length + ' transaction(s)');
        })
        .catch(function(err) {
          console.error('[StatementView] API Error:', err);
          setStatus('Error loading statement');
          populateGrid([]);
        })
        .finally(function() {
          hideLoader();
        });
    } else {
      console.error('[StatementView] accountservice not available');
      setStatus('Service unavailable');
      hideLoader();
      alert('accountservice is not loaded. Please refresh the page.');
    }
  }

  // POPULATE GRID
  function populateGrid(rows) {
    var tbody = document.querySelector('#statementGrid tbody');
    var recordCount = document.getElementById('recordCount');
    
    if (!tbody) {
      console.error('[StatementView] tbody not found');
      return;
    }

    tbody.innerHTML = '';

    if (!rows || rows.length === 0) {
      tbody.innerHTML = '<tr class="sv-empty-row"><td colspan="9" style="text-align:center;padding:40px;color:#64748b;">No transactions found for the selected period.</td></tr>';
      if (recordCount) recordCount.textContent = '0 records';
      console.log('[StatementView] No rows to display');
      return;
    }

    console.log('[StatementView] Populating', rows.length, 'rows');

    rows.forEach(function(row, idx) {
      var tr = document.createElement('tr');
      
      var dateVal = row.TrxDate || row.Date || row.TransDate || row.TransactionDate || '';
      var valueDate = row.ValueDate || row.ValDate || '';
      var particulars = row.Particulars || row.Description || row.Narration || '';
      var debitRaw = row.Debit || row.DebitAmount || 0;
      var debit = parseFloat(String(debitRaw).replace(/,/g, '')) || 0;
      var creditRaw = row.Credit || row.CreditAmount || 0;
      var credit = parseFloat(String(creditRaw).replace(/,/g, '')) || 0;
      // Pick balance from procedure - check multiple field names returned by dbo.p_GetAccountTransactions
      var balanceRaw = row.RunningBalance || row.AccBalance || row.Balance || row.Closing || row.ClosingBalance || row.AccumulatedBalance || 0;
      var balance = parseFloat(String(balanceRaw).replace(/,/g, '')) || 0;
      
      dateVal = formatDateValue(dateVal);
      valueDate = formatDateValue(valueDate);

      if (idx === 0) {
        console.log('[StatementView] Row 0 mapped:', {date: dateVal, valueDate: valueDate, particulars: particulars, debit: debit, credit: credit, balance: balance});
      }

      // Check if this is Opening or Closing Balance row
      var isBalanceRow = (particulars && (
        particulars.toLowerCase().includes('opening balance') || 
        particulars.toLowerCase().includes('closing balance')
      ));

      // Store trxBatchID and RowID in hidden columns
      var batchID = row.trxBatchID || '';
      var rowID = row.RowID || row.TrxRowID || row.TransRowID || '';

      tr.innerHTML = 
        '<td><input type="checkbox" /></td>' +
        '<td style="display:none;">' + batchID + '</td>' +
        '<td>' + (dateVal || '-') + '</td>' +
        '<td>' + (valueDate || '-') + '</td>' +
        '<td>' + (particulars || '-') + '</td>' +
        '<td class="sv-debit" style="text-align:right;">' + formatCurrencyColored(debit, true) + '</td>' +
        '<td class="sv-credit" style="text-align:right;">' + formatCurrencyColored(credit, true) + '</td>' +
        '<td class="sv-balance" style="text-align:right;">' + formatCurrencyColored(balance, true) + '</td>' +
        '<td style="display:none;">' + rowID + '</td>';

      // Add double-click handler for non-balance rows
      if (!isBalanceRow) {
        tr.style.cursor = 'pointer';
        tr.addEventListener('dblclick', function(event) {
          handleRowDoubleClick(event);
        });
      } else {
        tr.style.opacity = '0.7';
      }

      tbody.appendChild(tr);
    });

    if (recordCount) recordCount.textContent = rows.length + ' records';
    console.log('[StatementView] Grid populated with', rows.length, 'rows');
  }

  // HANDLE ROW DOUBLE-CLICK - Show Batch Transaction Details
  function handleRowDoubleClick(event) {
    var tr = event.currentTarget;
    console.log('[StatementView] Row double-clicked');

    var state = getParentState();
    
    // Get batchID from hidden column (index 1)
    var batchID = tr.cells[1] ? tr.cells[1].textContent.trim() : '';
    
    // Get date from column (index 2 after adding hidden column)
    var trxDateDisplay = tr.cells[2] ? tr.cells[2].textContent.trim() : '';
    
    // Get rowID from hidden column (index 8 - last hidden column)
    var trxRowID = tr.cells[8] ? tr.cells[8].textContent.trim() : '';
    
    // Convert display date (DD-Mon-YYYY) to SQL format (YYYY-MM-DD)
    var trxDate = '';
    if (trxDateDisplay) {
      var dateObj = parseDateDisplay(trxDateDisplay);
      if (dateObj) {
        trxDate = formatDateApi(dateObj);
      }
    }

    if (!batchID) {
      console.warn('[StatementView] No BatchID found in row');
      showError('No batch information available for this transaction.');
      return;
    }

    var requestData = {
      OurBranchID: state.OurBranchID || '',
      BatchID: batchID,
      ModuleID: 1500,
      TrxDate: trxDate,
      TrxRowID: trxRowID
    };

    console.log('[StatementView] Fetching batch transaction list:', requestData);
    showBatchDetailsModal(requestData);
  }

  // SHOW BATCH DETAILS MODAL
  function showBatchDetailsModal(requestData) {
    showLoader('Loading batch transaction details...');

    if (!window.AccountService || typeof window.AccountService.getBatchTrxList !== 'function') {
      hideLoader();
      showError('BatchTrxList service is not available.');
      return;
    }

    window.AccountService.getBatchTrxList(requestData)
      .then(function(response) {
        hideLoader();
        console.log('[StatementView] Batch details response:', response);

        if (!response || response.success === false) {
          showError(response.message || 'Failed to load batch transaction details.');
          return;
        }

        var details = [];
        if (Array.isArray(response.Details)) {
          details = response.Details;
        } else if (response.data && Array.isArray(response.data.Details)) {
          details = response.data.Details;
        } else if (Array.isArray(response.data)) {
          details = response.data;
        } else if (Array.isArray(response)) {
          details = response;
        }

        displayBatchDetailsModal(details, requestData.BatchID);
      })
      .catch(function(err) {
        hideLoader();
        console.error('[StatementView] Error fetching batch details:', err);
        showError('Error loading batch transaction details: ' + (err.message || err));
      });
  }

  // DISPLAY BATCH DETAILS IN MODAL
  function displayBatchDetailsModal(details, batchID) {
    // Create modal HTML
    var modalHTML = `
      <div class="modal fade show" id="batchDetailsModal" tabindex="-1" style="display: block; background: rgba(0,0,0,0.5);">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width: 95vw; width: 95vw;">
          <div class="modal-content" style="height: 85vh; display: flex; flex-direction: column;">
            <div class="modal-header" style="background: linear-gradient(135deg, #4a7c95 0%, #3d6a80 100%); color: white; flex-shrink: 0;">
              <h5 class="modal-title"><i class="bi bi-list-ul me-2"></i>Batch Transaction Details - ${batchID}</h5>
              <button type="button" class="btn-close btn-close-white" onclick="document.getElementById('batchDetailsModal').remove()"></button>
            </div>
            <div class="modal-body" style="padding: 20px; overflow-y: auto; flex-grow: 1;">
              ${details.length === 0 ? '<p class="text-center text-muted">No transaction details found.</p>' : generateBatchDetailsTable(details)}
            </div>
            <div class="modal-footer" style="flex-shrink: 0; border-top: 1px solid #dee2e6;">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('batchDetailsModal').remove()">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if any
    var existingModal = document.getElementById('batchDetailsModal');
    if (existingModal) existingModal.remove();

    // Insert modal into DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    console.log('[StatementView] Batch details modal displayed with', details.length, 'records');
  }

  // GENERATE BATCH DETAILS TABLE
  function generateBatchDetailsTable(details) {
    if (!details || details.length === 0) {
      return '<p class="text-center text-muted">No details available.</p>';
    }

    // Get all unique keys from the first object
    var keys = Object.keys(details[0]);
    
    var html = `
      <div class="table-responsive">
        <table class="table table-sm table-hover table-bordered">
          <thead class="table-light" style="position: sticky; top: 0; background: #f8f9fa; z-index: 10;">
            <tr>`;
    
    // Generate headers
    keys.forEach(function(key) {
      var displayKey = key.replace(/([A-Z])/g, ' $1').trim(); // Add spaces before capitals
      html += `<th style="white-space: nowrap; padding: 10px;">${displayKey}</th>`;
    });
    
    html += `</tr></thead><tbody>`;
    
    // Generate rows
    details.forEach(function(row) {
      html += '<tr>';
      keys.forEach(function(key) {
        var value = row[key];
        var cellContent = '';
        var isNumeric = false;
        
        // Format value based on type
        if (value === null || value === undefined) {
          cellContent = '-';
        } else if (typeof value === 'number') {
          // Check if it looks like a currency value
          if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('debit') || key.toLowerCase().includes('credit') || 
              key.toLowerCase().includes('balance') || key.toLowerCase().includes('closing')) {
            cellContent = formatCurrencyColored(value, true);
            isNumeric = true;
          } else {
            cellContent = value;
          }
        } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
          // Format date strings
          cellContent = formatDateValue(value);
        } else {
          cellContent = value;
        }
        
        var textAlign = isNumeric ? 'text-align: right;' : '';
        html += `<td style="padding: 8px; white-space: nowrap; ${textAlign}">${cellContent}</td>`;
      });
      html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    
    return html;
  }

  // PRINT STATEMENT
  function printStatement() {
    var tbody = document.querySelector('#statementGrid tbody');
    var rows = tbody ? tbody.querySelectorAll('tr:not(.sv-empty-row)') : [];
    
    if (!rows || rows.length === 0) {
      alert('No statement data to print. Please load a statement first.');
      return;
    }

    var state = getParentState();
    var fromDateEl = document.getElementById('fromDate');
    var toDateEl = document.getElementById('toDate');
    var fromDate = fromDateEl ? fromDateEl.value : '';
    var toDate = toDateEl ? toDateEl.value : '';

    var rowsHtml = '';
    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i].querySelectorAll('td');
      rowsHtml += '<tr>' +
        '<td>' + (cells[1] ? cells[1].textContent : '') + '</td>' +
        '<td>' + (cells[2] ? cells[2].textContent : '') + '</td>' +
        '<td>' + (cells[3] ? cells[3].textContent : '') + '</td>' +
        '<td class="right debit">' + (cells[4] ? cells[4].textContent : '') + '</td>' +
        '<td class="right credit">' + (cells[5] ? cells[5].textContent : '') + '</td>' +
        '<td class="right">' + (cells[6] ? cells[6].textContent : '') + '</td>' +
        '</tr>';
    }

    var printHtml = '<!DOCTYPE html><html><head><title>Account Statement</title>' +
      '<style>' +
      'body { font-family: Segoe UI, sans-serif; font-size: 11px; padding: 20px; }' +
      '.header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #4a7c95; padding-bottom: 15px; }' +
      '.header h1 { font-size: 18px; color: #4a7c95; margin-bottom: 5px; }' +
      '.info { display: flex; justify-content: space-between; margin-bottom: 15px; background: #f8fafc; padding: 10px; }' +
      'table { width: 100%; border-collapse: collapse; }' +
      'th { background: #4a7c95; color: white; padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; }' +
      'th.right { text-align: right; }' +
      'td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }' +
      'td.right { text-align: right; }' +
      '.debit { color: #dc2626; font-weight: 600; }' +
      '.credit { color: #059669; font-weight: 600; }' +
      'tr:nth-child(even) { background: #f8fafc; }' +
      '.footer { margin-top: 20px; text-align: center; font-size: 10px; color: #64748b; }' +
      '@media print { th { background: #4a7c95 !important; -webkit-print-color-adjust: exact; } }' +
      '</style></head><body>' +
      '<div class="header"><h1>ACCOUNT STATEMENT</h1><div>' + new Date().toLocaleDateString() + '</div></div>' +
      '<div class="info">' +
      '<span><strong>Branch:</strong> ' + (state.OurBranchID || '-') + '</span>' +
      '<span><strong>Account:</strong> ' + (state.AccountID || '-') + '</span>' +
      '<span><strong>Period:</strong> ' + fromDate + ' to ' + toDate + '</span>' +
      '</div>' +
      '<table><thead><tr><th>Date</th><th>Value Date</th><th>Particulars</th><th class="right">Debit</th><th class="right">Credit</th><th class="right">Balance</th></tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody></table>' +
      '<div class="footer">Computer generated statement</div>' +
      '</body></html>';

    var printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.onload = function() { printWindow.focus(); printWindow.print(); };
    }
  }

  // RESET FORM
  function resetForm() {
    var statementFor = document.getElementById('statementFor');
    var fromDate = document.getElementById('fromDate');
    var toDate = document.getElementById('toDate');
    
    if (statementFor) {
      statementFor.value = '0';
      statementFor.style.borderColor = '';
      statementFor.style.boxShadow = '';
    }
    
    var today = getToday();
    if (fromDate) fromDate.value = formatDateDisplay(today);
    if (toDate) toDate.value = formatDateDisplay(today);
    
    handlePeriodChange();
    populateGrid([]);
    setStatus('Ready');
    console.log('[StatementView] Form reset');
  }

  // WIRE ACTIONS
  function wireActions() {
    var viewBtn = document.querySelector('[data-action="view"]');
    var printBtn = document.querySelector('[data-action="print"]');
    var reverseBtn = document.querySelector('[data-action="reverse"]');
    // Action panel in this module uses `.action-panel` (keep `.de-action-panel` for backwards compatibility)
    var closeBtn = document.querySelector('.action-panel [data-action="close"], .de-action-panel [data-action="close"]');
    var refreshBtn = document.querySelector('.action-panel [data-action="refresh"], .de-action-panel [data-action="refresh"]');
    var statementFor = document.getElementById('statementFor');

    // Title bar buttons
    var titleRefreshBtn = document.querySelector('.de-title-bar [data-action="refresh"]');
    var titleMinimizeBtn = document.querySelector('.de-title-bar [data-action="minimize"]');
    var titleMaximizeBtn = document.querySelector('.de-title-bar [data-action="maximize"]');
    var titleCloseBtn = document.querySelector('.de-title-bar [data-action="close"]');

    console.log('[StatementView] View button found:', !!viewBtn);
    console.log('[StatementView] Print button found:', !!printBtn);
    console.log('[StatementView] Title bar buttons found:', !!titleRefreshBtn, !!titleMinimizeBtn, !!titleMaximizeBtn, !!titleCloseBtn);

    if (viewBtn) {
      viewBtn.onclick = function(e) {
        e.preventDefault();
        console.log('[StatementView] View button clicked');
        fetchStatement();
      };
    }

    if (printBtn) {
      printBtn.onclick = function(e) {
        e.preventDefault();
        console.log('[StatementView] Print button clicked');
        printStatement();
      };
    }

    if (reverseBtn) {
      reverseBtn.onclick = function(e) {
        e.preventDefault();
        resetForm();
      };
    }

    if (closeBtn) {
      closeBtn.onclick = function(e) {
        e.preventDefault();

        // When embedded (Client 360 / Account Maintenance overlay), request parent to close iframe overlay
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ action: 'submoduleClosed' }, '*');
            window.parent.postMessage({ type: 'accountMaintenanceChildClose' }, '*');
            return;
          }
        } catch (err) {
          console.warn('[StatementView] Could not post close message:', err);
        }

        // Fallback for popup/tab scenario
        try { window.close(); } catch {}
      };
    }

    if (refreshBtn) {
      refreshBtn.onclick = function(e) {
        e.preventDefault();
        if (statementFor && statementFor.value !== '0') {
          fetchStatement();
        } else {
          showError('Please select a Statement Period before refreshing.');
        }
      };
    }

    // Wire title bar buttons
    if (titleRefreshBtn) {
      titleRefreshBtn.onclick = function(e) {
        e.preventDefault();
        console.log('[StatementView] Title refresh clicked');
        if (statementFor && statementFor.value !== '0') {
          fetchStatement();
        } else {
          showError('Please select a Statement Period before refreshing.');
        }
      };
    }

    if (titleMinimizeBtn) {
      titleMinimizeBtn.onclick = function(e) {
        e.preventDefault();
        console.log('[StatementView] Title minimize clicked');
        var deWindow = document.querySelector('.de-window');
        if (deWindow) {
          deWindow.classList.toggle('de-window--minimized');
        }
      };
    }

    if (titleMaximizeBtn) {
      titleMaximizeBtn.onclick = function(e) {
        e.preventDefault();
        console.log('[StatementView] Title maximize clicked');
        var deWindow = document.querySelector('.de-window');
        if (deWindow) {
          deWindow.classList.toggle('de-window--maximized');
          // Update icon based on state
          var icon = titleMaximizeBtn.querySelector('i');
          if (icon) {
            if (deWindow.classList.contains('de-window--maximized')) {
              icon.className = 'bi bi-front'; // Restore icon (overlapping squares)
            } else {
              icon.className = 'bi bi-copy'; // Maximize icon (two squares)
            }
          }
        }
      };
    }

    if (titleCloseBtn) {
      titleCloseBtn.onclick = function(e) {
        e.preventDefault();
        console.log('[StatementView] Title close clicked');
        // Notify parent to close this child form
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'accountMaintenanceChildClose' }, '*');
          }
        } catch (err) {
          console.warn('[StatementView] Could not post close message:', err);
        }
      };
    }

    if (statementFor) {
      statementFor.onchange = handlePeriodChange;
    }
  }

  // INITIALIZATION
  function init() {
    console.log('[StatementView] DOM ready, initializing...');
    
    var today = getToday();
    var fromDate = document.getElementById('fromDate');
    var toDate = document.getElementById('toDate');
    
    if (fromDate) fromDate.value = formatDateDisplay(today);
    if (toDate) toDate.value = formatDateDisplay(today);

    handlePeriodChange();
    wireDatePickers();
    wireActions();
    setStatus('Ready');
    
    console.log('[StatementView] Initialization complete');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

