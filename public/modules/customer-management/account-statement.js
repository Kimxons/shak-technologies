/**
 * Customer Query - Account Statement View
 * Version: 1.0.0 - February 2026
 */
(function () {
  'use strict';

  console.log('[CustomerQueryStatement] Initializing...');

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
      console.warn('[CustomerQueryStatement] Could not parse date:', dateVal);
    }
    return String(dateVal);
  }

  // PARENT STATE ACCESS - Get account info from customer query
  function getParentState() {
    console.log('[CustomerQueryStatement] Getting parent state...');
    
    // Try to get from URL parameters first
    var state = { OurBranchID: '', AccountID: '', OperatorID: '', ClientID: '' };
    
    try {
      var url = new URL(window.location.href);
      state.OurBranchID = url.searchParams.get('branchId') || url.searchParams.get('OurBranchID') || '';
      state.AccountID = url.searchParams.get('accountId') || url.searchParams.get('AccountID') || '';
      state.OperatorID = url.searchParams.get('operatorId') || url.searchParams.get('OperatorID') || '';
      state.ClientID = url.searchParams.get('clientId') || url.searchParams.get('ClientID') || '';
    } catch (e) {
      console.warn('[CustomerQueryStatement] URL parsing error:', e);
    }

    // Try to get from parent window's customer query state
    if (window.parent && window.parent !== window) {
      try {
        const parentDoc = window.parent.document;
        
        // Get selected account from customer query
        if (window.parent.selectedAccount) {
          const acc = window.parent.selectedAccount;
          state.OurBranchID = acc.OurBranchID || state.OurBranchID;
          state.AccountID = acc.AccountID || state.AccountID;
          state.ClientID = acc.ClientID || state.ClientID;
          state.OperatorID = acc.OperatorID || state.OperatorID;
          console.log('[CustomerQueryStatement] Got account from parent.selectedAccount:', acc);
        }
        
        // Fallback: try to read from customer query fields
        if (!state.AccountID) {
          const activeRow = parentDoc.querySelector('.customer-query-table tbody tr.table-active');
          if (activeRow && activeRow.dataset.row) {
            try {
              const rowData = JSON.parse(decodeURIComponent(activeRow.dataset.row));
              state.OurBranchID = rowData.OurBranchID || state.OurBranchID;
              state.AccountID = rowData.AccountID || state.AccountID;
              state.ClientID = rowData.ClientID || state.ClientID;
              console.log('[CustomerQueryStatement] Got account from table row:', rowData);
            } catch (e) {
              console.warn('[CustomerQueryStatement] Error parsing row data:', e);
            }
          }
        }
      } catch (e) {
        console.warn('[CustomerQueryStatement] Could not access parent:', e);
      }
    }

    // Get operator from AuthService
    if (!state.OperatorID && window.AuthService && window.AuthService.getOperatorID) {
      state.OperatorID = window.AuthService.getOperatorID();
    }
    
    console.log('[CustomerQueryStatement] Final state:', state);
    return state;
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

    console.log('[CustomerQueryStatement] Period changed to:', period);

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
        setTimeout(fetchStatement, 100);
        break;
      case '2':
        fromDate.value = formatDateDisplay(getFirstOfPreviousMonth());
        toDate.value = formatDateDisplay(today);
        fromDate.disabled = true;
        toDate.disabled = true;
        if (fromDatePicker) fromDatePicker.disabled = true;
        if (toDatePicker) toDatePicker.disabled = true;
        // Auto-trigger for Current and Previous Month
        setTimeout(fetchStatement, 100);
        break;
      case '3':
        fromDate.disabled = false;
        toDate.disabled = false;
        if (fromDatePicker) fromDatePicker.disabled = false;
        if (toDatePicker) toDatePicker.disabled = false;
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
    console.log('[CustomerQueryStatement] fetchStatement called');
    
    var statementFor = document.getElementById('statementFor');
    if (!statementFor || statementFor.value === '0') {
      showError('Please select a Statement Period before viewing.');
      return;
    }

    var state = getParentState();
    console.log('[CustomerQueryStatement] State:', state);

    if (!state.AccountID) {
      showError('No account selected. Please select an account from Customer Query first.');
      return;
    }

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

    console.log('[CustomerQueryStatement] Request Data:', requestData);

    if (window.accountservice && typeof window.accountservice.getAccountTransactions === 'function') {
      console.log('[CustomerQueryStatement] Using accountservice.getAccountTransactions');
      window.accountservice.getAccountTransactions(requestData)
        .then(function(response) {
          console.log('[CustomerQueryStatement] API Response:', response);
          
          if (response && response.success === false) {
            console.warn('[CustomerQueryStatement] API returned success=false:', response.message);
            populateGrid([]);
            return;
          }
          
          var rows = [];
          
          if (response && Array.isArray(response.Details)) {
            rows = response.Details;
          } else if (response && response.data && Array.isArray(response.data.Details)) {
            rows = response.data.Details;
          } else if (response && Array.isArray(response.data)) {
            rows = response.data;
          } else if (Array.isArray(response)) {
            rows = response;
          }
          
          console.log('[CustomerQueryStatement] Found', rows.length, 'transactions');
          populateGrid(rows);
        })
        .catch(function(err) {
          console.error('[CustomerQueryStatement] API Error:', err);
          populateGrid([]);
          alert('Error loading statement: ' + (err.message || 'Unknown error'));
        });
    } else {
      console.error('[CustomerQueryStatement] accountservice not available');
      alert('accountservice is not loaded. Please refresh the page.');
    }
  }

  // POPULATE GRID
  function populateGrid(rows) {
    var tbody = document.querySelector('#statementGrid tbody');
    var recordCount = document.getElementById('recordCount');
    
    if (!tbody) {
      console.error('[CustomerQueryStatement] tbody not found');
      return;
    }

    tbody.innerHTML = '';

    if (!rows || rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#64748b;">No transactions found for the selected period.</td></tr>';
      if (recordCount) recordCount.textContent = '(0 records)';
      console.log('[CustomerQueryStatement] No rows to display');
      return;
    }

    console.log('[CustomerQueryStatement] Populating', rows.length, 'rows');

    rows.forEach(function(row, idx) {
      var tr = document.createElement('tr');
      
      var dateVal = row.TrxDate || row.Date || row.TransDate || row.TransactionDate || '';
      var valueDate = row.ValueDate || row.ValDate || '';
      var particulars = row.Particulars || row.Description || row.Narration || '';
      var debitRaw = row.Debit || row.DebitAmount || 0;
      var debit = parseFloat(String(debitRaw).replace(/,/g, '')) || 0;
      var creditRaw = row.Credit || row.CreditAmount || 0;
      var credit = parseFloat(String(creditRaw).replace(/,/g, '')) || 0;
      var balanceRaw = row.RunningBalance || row.AccBalance || row.Balance || row.Closing || row.ClosingBalance || row.AccumulatedBalance || 0;
      var balance = parseFloat(String(balanceRaw).replace(/,/g, '')) || 0;
      
      dateVal = formatDateValue(dateVal);
      valueDate = formatDateValue(valueDate);

      var batchID = row.trxBatchID || '';
      var rowID = row.RowID || row.TrxRowID || row.TransRowID || '';

      tr.innerHTML = 
        '<td><input type="checkbox" /></td>' +
        '<td>' + (dateVal || '-') + '</td>' +
        '<td>' + (valueDate || '-') + '</td>' +
        '<td>' + (particulars || '-') + '</td>' +
        '<td style="text-align:right;">' + formatCurrencyColored(debit, true) + '</td>' +
        '<td style="text-align:right;">' + formatCurrencyColored(credit, true) + '</td>' +
        '<td style="text-align:right;">' + formatCurrencyColored(balance, true) + '</td>' +
        '<td style="display:none;">' + batchID + '</td>' +
        '<td style="display:none;">' + rowID + '</td>';

      tbody.appendChild(tr);
    });

    if (recordCount) recordCount.textContent = '(' + rows.length + ' records)';
    console.log('[CustomerQueryStatement] Grid populated with', rows.length, 'rows');
  }

  // ACTION HANDLERS
  function wireActionButtons() {
    console.log('[CustomerQueryStatement] Wiring action buttons...');
    
    // Select buttons from action panel only (not header buttons)
    var actionPanel = document.querySelector('.action-panel');
    if (!actionPanel) {
      console.warn('[CustomerQueryStatement] Action panel not found');
      return;
    }
    
    var viewBtn = actionPanel.querySelector('[data-action="view"]');
    var printBtn = actionPanel.querySelector('[data-action="print"]');
    var reverseBtn = actionPanel.querySelector('[data-action="reverse"]');
    var refreshBtn = actionPanel.querySelector('[data-action="refresh"]');
    var closeBtn = actionPanel.querySelector('[data-action="close"]');

    console.log('[CustomerQueryStatement] Buttons found:', {
      view: !!viewBtn,
      print: !!printBtn,
      reverse: !!reverseBtn,
      refresh: !!refreshBtn,
      close: !!closeBtn
    });

    if (viewBtn) {
      viewBtn.addEventListener('click', function(e) {
        console.log('[CustomerQueryStatement] View button clicked');
        fetchStatement();
      });
    }

    if (printBtn) {
      printBtn.addEventListener('click', function(e) {
        console.log('[CustomerQueryStatement] Print button clicked');
        window.print();
      });
    }

    if (reverseBtn) {
      reverseBtn.addEventListener('click', function(e) {
        console.log('[CustomerQueryStatement] Reverse button clicked');
        alert('Reverse transaction functionality not implemented yet.');
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', function(e) {
        console.log('[CustomerQueryStatement] Refresh button clicked (action panel)');
        location.reload();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', function(e) {
        console.log('[CustomerQueryStatement] Close button clicked (action panel)');
        window.parent.postMessage('close-account-statement', '*');
      });
    }
    
    console.log('[CustomerQueryStatement] Action buttons wired successfully');
  }

  // INITIALIZATION
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[CustomerQueryStatement] DOM ready, setting up...');
    
    // Initialize dates
    const fromDate = document.getElementById('fromDate');
    const toDate = document.getElementById('toDate');
    const today = getToday();
    
    if (fromDate) fromDate.value = formatDateDisplay(today);
    if (toDate) toDate.value = formatDateDisplay(today);

    // Wire Statement For dropdown
    const statementFor = document.getElementById('statementFor');
    if (statementFor) {
      statementFor.addEventListener('change', handlePeriodChange);
    }

    // Wire date pickers
    wireDatePickers();

    // Wire action buttons
    wireActionButtons();

    console.log('[CustomerQueryStatement] Initialization complete');
  });

})();
