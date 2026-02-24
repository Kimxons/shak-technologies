/**
 * Loan Maintenance - Loan Statement View
 * Version: 2.0.0 - February 2026
 * Implements same Statement For logic as Account Maintenance
 */
(function (global) {
  'use strict';

  console.log('[LoanStatement] Initializing...');

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // ========== DATE UTILITIES ==========
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
      console.warn('[LoanStatement] Could not parse date:', dateVal);
    }
    return String(dateVal);
  }

  // ========== PARENT STATE ACCESS ==========
  function getParentState() {
    var baseState = null;
    if (window.parent && window.parent !== window && window.parent.LoanMaintenanceState) {
      baseState = window.parent.LoanMaintenanceState;
    } else if (window.LoanMaintenanceState) {
      baseState = window.LoanMaintenanceState;
    }

    var merged = {
      OurBranchID: (baseState && baseState.OurBranchID) ? baseState.OurBranchID : '',
      AccountID: (baseState && baseState.AccountID) ? baseState.AccountID : '',
      OperatorID: (baseState && baseState.OperatorID) ? baseState.OperatorID : '',
      ClientID: (baseState && baseState.ClientID) ? baseState.ClientID : ''
    };

    // Try querystring overrides
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

    console.log('[LoanStatement] Parent state:', merged);
    return merged;
  }

  function showError(message) {
    const statementFor = document.getElementById('StatementFor');
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

  // ========== PERIOD CHANGE HANDLER ==========
  function handlePeriodChange() {
    const statementFor = document.getElementById('StatementFor');
    const fromDate = document.getElementById('FromDate');
    const toDate = document.getElementById('ToDate');
    const fromDatePicker = document.getElementById('fromDatePicker');
    const toDatePicker = document.getElementById('toDatePicker');
    
    if (!statementFor || !fromDate || !toDate) return;
    
    const period = statementFor.value;
    const today = getToday();

    statementFor.style.borderColor = '';
    statementFor.style.boxShadow = '';

    console.log('[LoanStatement] Period changed to:', period);

    switch (period) {
      case '':
        // Select Period - disable date fields
        fromDate.disabled = false; // Temporarily enable to set value
        toDate.disabled = false;
        fromDate.value = formatDateDisplay(today);
        toDate.value = formatDateDisplay(today);
        fromDate.disabled = true;
        toDate.disabled = true;
        if (fromDatePicker) fromDatePicker.disabled = true;
        if (toDatePicker) toDatePicker.disabled = true;
        console.log('[LoanStatement] Empty period - dates set to:', fromDate.value, toDate.value);
        break;
      case 'CM':
        // Current Month - auto-calculate and disable fields
        fromDate.disabled = false; // Temporarily enable to set value
        toDate.disabled = false;
        var firstOfMonth = getFirstOfMonth();
        fromDate.value = formatDateDisplay(firstOfMonth);
        toDate.value = formatDateDisplay(today);
        console.log('[LoanStatement] CM - FromDate set to:', fromDate.value, '(first of month:', firstOfMonth, ')');
        console.log('[LoanStatement] CM - ToDate set to:', toDate.value, '(today:', today, ')');
        fromDate.disabled = true;
        toDate.disabled = true;
        if (fromDatePicker) fromDatePicker.disabled = true;
        if (toDatePicker) toDatePicker.disabled = true;
        // Auto-trigger
        setTimeout(loadStatement, 100);
        break;
      case 'LM':
        // Current and Previous Month - auto-calculate and disable fields
        fromDate.disabled = false; // Temporarily enable to set value
        toDate.disabled = false;
        var firstOfPrevMonth = getFirstOfPreviousMonth();
        fromDate.value = formatDateDisplay(firstOfPrevMonth);
        toDate.value = formatDateDisplay(today);
        console.log('[LoanStatement] LM - FromDate set to:', fromDate.value, '(first of prev month:', firstOfPrevMonth, ')');
        console.log('[LoanStatement] LM - ToDate set to:', toDate.value, '(today:', today, ')');
        fromDate.disabled = true;
        toDate.disabled = true;
        if (fromDatePicker) fromDatePicker.disabled = true;
        if (toDatePicker) toDatePicker.disabled = true;
        // Auto-trigger
        setTimeout(loadStatement, 100);
        break;
      case 'DR':
        // Date Range - enable date fields for manual selection
        fromDate.disabled = false;
        toDate.disabled = false;
        if (fromDatePicker) fromDatePicker.disabled = false;
        if (toDatePicker) toDatePicker.disabled = false;
        console.log('[LoanStatement] DR - date fields enabled');
        break;
    }
  }

  // ========== DATE PICKERS ==========
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
      fromBtn.onclick = function(e) { pickDate('FromDate', e.currentTarget); };
    }
    if (toBtn) {
      toBtn.onclick = function(e) { pickDate('ToDate', e.currentTarget); };
    }
  }

  // ========== FETCH STATEMENT ==========
  function loadStatement() {
    console.log('[LoanStatement] loadStatement called');
    
    var statementFor = document.getElementById('StatementFor');
    if (!statementFor || !statementFor.value) {
      showError('Please select a Statement Period before viewing.');
      return;
    }

    var state = getParentState();
    console.log('[LoanStatement] State:', state);

    if (!state.OurBranchID || !state.AccountID) {
      showError('Branch ID and Account ID are required from the parent form.');
      return;
    }

    var fromDateEl = document.getElementById('FromDate');
    var toDateEl = document.getElementById('ToDate');
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
      FromDate: formatDateApi(fromDateObj) + ' 00:00:00',
      ToDate: formatDateApi(toDateObj) + ' 23:59:59',
      OperatorID: state.OperatorID || ''
    };

    console.log('[LoanStatement] Request Data:', requestData);

    if (window.LoanStatementService && typeof window.LoanStatementService.getAccountTransactions === 'function') {
      console.log('[LoanStatement] Using LoanStatementService.getAccountTransactions');
      window.LoanStatementService.getAccountTransactions(requestData)
        .then(function(response) {
          console.log('[LoanStatement] API Response:', response);
          
          if (response && response.success === false) {
            console.warn('[LoanStatement] API returned success=false:', response.message);
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
          
          console.log('[LoanStatement] Found', rows.length, 'transactions');
          populateGrid(rows);
        })
        .catch(function(err) {
          console.error('[LoanStatement] API Error:', err);
          populateGrid([]);
          alert('Error loading statement: ' + (err.message || 'Unknown error'));
        });
    } else {
      console.error('[LoanStatement] LoanStatementService not available');
      alert('Service not loaded. Please refresh the page.');
    }
  }

  // ========== POPULATE GRID ==========
  function populateGrid(rows) {
    var tbody = document.querySelector('.lmstmt-table tbody');
    var statusEl = document.querySelector('.lmstmt-status');
    
    if (!tbody) {
      console.error('[LoanStatement] tbody not found');
      return;
    }

    tbody.innerHTML = '';

    if (!rows || rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#64748b;">No transactions found for the selected period.</td></tr>';
      if (statusEl) {
        statusEl.textContent = '(0 records)';
        statusEl.style.display = '';
      }
      return;
    }

    console.log('[LoanStatement] Populating', rows.length, 'rows');

    rows.forEach(function(row) {
      var tr = document.createElement('tr');
      
      var dateVal = row.TrxDate || row.Date || row.TransDate || '';
      var valueDate = row.ValueDate || row.ValDate || '';
      var particulars = row.Particulars || row.Description || '';
      var debitRaw = row.Debit || 0;
      var debit = parseFloat(String(debitRaw).replace(/,/g, '')) || 0;
      var creditRaw = row.Credit || 0;
      var credit = parseFloat(String(creditRaw).replace(/,/g, '')) || 0;
      var balanceRaw = row.Closing || row.RunningBalance || row.Balance || 0;
      var balance = parseFloat(String(balanceRaw).replace(/,/g, '')) || 0;
      var operatorId = row.OperatorID || '';
      var supervisorId = row.SupervisorID || '';
      var trxRowId = row.TrxRowID || '';
      
      dateVal = formatDateValue(dateVal);
      valueDate = formatDateValue(valueDate);

      tr.innerHTML = 
        '<td>' + (dateVal || '-') + '</td>' +
        '<td>' + (valueDate || '-') + '</td>' +
        '<td>' + (particulars || '-') + '</td>' +
        '<td style="text-align:right;">' + formatCurrencyColored(debit, true) + '</td>' +
        '<td style="text-align:right;">' + formatCurrencyColored(credit, true) + '</td>' +
        '<td style="text-align:right;">' + formatCurrencyColored(balance, true) + '</td>' +
        '<td>' + operatorId + '</td>' +
        '<td>' + supervisorId + '</td>' +
        '<td>' + trxRowId + '</td>';

      tbody.appendChild(tr);
    });

    if (statusEl) {
      statusEl.textContent = '(' + rows.length + ' records)';
      statusEl.style.display = '';
    }
    console.log('[LoanStatement] Grid populated');
  }

  // ========== ACTION HANDLERS ==========
  function wireActionButtons() {
    var viewBtn = document.querySelector('[data-action="view"]');
    var printBtn = document.querySelector('[data-action="print"]');
    var refreshBtn = document.querySelector('[data-action="refresh"]');
    var closeBtn = document.querySelector('[data-action="close"]');

    if (viewBtn) {
      viewBtn.addEventListener('click', loadStatement);
    }

    if (printBtn) {
      printBtn.addEventListener('click', function() {
        window.print();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', function() {
        location.reload();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        window.parent.postMessage({ action: 'submoduleClosed' }, '*');
      });
    }
  }

  // ========== INITIALIZATION ==========
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[LoanStatement] DOM ready, initializing...');
    
    const fromDate = document.getElementById('FromDate');
    const toDate = document.getElementById('ToDate');
    const statementFor = document.getElementById('StatementFor');
    
    // Initialize dates to today
    const today = getToday();
    if (fromDate) fromDate.value = formatDateDisplay(today);
    if (toDate) toDate.value = formatDateDisplay(today);

    // Wire Statement For dropdown
    if (statementFor) {
      statementFor.addEventListener('change', handlePeriodChange);
      // Set initial state
      statementFor.value = '';
      handlePeriodChange();
    }

    // Wire date pickers
    wireDatePickers();

    // Wire action buttons
    wireActionButtons();

    console.log('[LoanStatement] Initialization complete');
  });

  // Allow ESC to close
  global.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.parent.postMessage({ action: 'submoduleClosed' }, '*');
    }
  });

})(window);
