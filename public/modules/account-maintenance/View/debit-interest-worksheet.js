/**
 * Debit Interest Worksheet - Modern Professional Module
 * Version: 2.0.0 - January 2026
 * Replicates Statement View format with dbo.p_GetDebitInterestWorksheet API
 */
(function () {
  'use strict';

  console.log('[DebitInterestWorksheet] Initializing...');

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
      console.warn('[DebitInterestWorksheet] Could not parse date:', dateVal);
    }
    return String(dateVal);
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

  // PARENT STATE ACCESS
  function getParentState() {
    if (window.parent && window.parent !== window && window.parent.AccountMaintenanceState) {
      return window.parent.AccountMaintenanceState;
    }
    if (window.AccountMaintenanceState) {
      return window.AccountMaintenanceState;
    }
    return { OurBranchID: '', AccountID: '', OperatorID: '', ClientID: '' };
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
    const periodSelect = document.getElementById('periodSelect');
    if (periodSelect) {
      periodSelect.style.borderColor = '#ef4444';
      periodSelect.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';
      setTimeout(function() {
        periodSelect.style.borderColor = '';
        periodSelect.style.boxShadow = '';
      }, 3000);
    }
    setStatus(message);
    alert(message);
  }

  // PERIOD CHANGE HANDLER
  function handlePeriodChange() {
    const periodSelect = document.getElementById('periodSelect');
    const fromDate = document.getElementById('fromDate');
    const toDate = document.getElementById('toDate');
    const fromDatePicker = document.getElementById('fromDatePicker');
    const toDatePicker = document.getElementById('toDatePicker');
    
    if (!periodSelect || !fromDate || !toDate) return;
    
    const period = periodSelect.value;
    const today = getToday();

    periodSelect.style.borderColor = '';
    periodSelect.style.boxShadow = '';

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
        // Auto-trigger fetch for Current Month
        fetchDebitInterestWorksheet();
        break;
      case '2':
        fromDate.value = formatDateDisplay(getFirstOfPreviousMonth());
        toDate.value = formatDateDisplay(today);
        fromDate.disabled = true;
        toDate.disabled = true;
        if (fromDatePicker) fromDatePicker.disabled = true;
        if (toDatePicker) toDatePicker.disabled = true;
        // Auto-trigger fetch for Current and Previous Month
        fetchDebitInterestWorksheet();
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

  // FETCH DEBIT INTEREST WORKSHEET
  function fetchDebitInterestWorksheet() {
    console.log('[DebitInterestWorksheet] fetchDebitInterestWorksheet called');
    
    var periodSelect = document.getElementById('periodSelect');
    if (!periodSelect || periodSelect.value === '0') {
      showError('Please select a Period before viewing.');
      return;
    }

    var state = getParentState();
    console.log('[DebitInterestWorksheet] Parent state:', state);

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
      ToDate: formatDateApi(toDateObj)
    };

    console.log('[DebitInterestWorksheet] Request Data:', requestData);
    showLoader('Fetching debit interest worksheet...');
    setStatus('Loading...');

    if (window.AccountService && typeof window.AccountService.getDebitInterestWorksheet === 'function') {
      console.log('[DebitInterestWorksheet] Using AccountService.getDebitInterestWorksheet');
      window.AccountService.getDebitInterestWorksheet(requestData)
        .then(function(response) {
          console.log('[DebitInterestWorksheet] API Response:', response);
          
          if (response && response.success === false) {
            console.warn('[DebitInterestWorksheet] API returned success=false:', response.message);
            setStatus(response.message || 'No data found');
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
          
          console.log('[DebitInterestWorksheet] Rows to display:', rows.length);
          if (rows.length > 0) {
            console.log('[DebitInterestWorksheet] First row keys:', Object.keys(rows[0]));
          }
          
          populateGrid(rows);
          setStatus('Loaded ' + rows.length + ' worksheet record(s)');
        })
        .catch(function(err) {
          console.error('[DebitInterestWorksheet] API Error:', err);
          setStatus('Error loading debit interest worksheet');
          populateGrid([]);
        })
        .finally(function() {
          hideLoader();
        });
    } else {
      console.error('[DebitInterestWorksheet] AccountService not available');
      setStatus('Service unavailable');
      hideLoader();
      alert('AccountService is not loaded. Please refresh the page.');
    }
  }

  // POPULATE GRID
  function populateGrid(rows) {
    var tbody = document.querySelector('#worksheetGrid tbody');
    var recordCount = document.getElementById('recordCount');
    
    if (!tbody) {
      console.error('[DebitInterestWorksheet] tbody not found');
      return;
    }

    tbody.innerHTML = '';

    if (!rows || rows.length === 0) {
      tbody.innerHTML = '<tr class="de-table__empty"><td colspan="8" style="text-align:center;padding:40px;color:#64748b;">No debit interest records found for the selected period.</td></tr>';
      if (recordCount) recordCount.textContent = '0 records';
      return;
    }

    rows.forEach(function(row, idx) {
      var tr = document.createElement('tr');
      
      var dateVal = row.Date || row.TrxDate || row.TransDate || '';
      var balanceRaw = row.Balance || row.OutstandingBalance || row.DebitBalance || 0;
      var balance = parseFloat(String(balanceRaw).replace(/,/g, '')) || 0;
      var rateRaw = row.Rate || row.InterestRate || row.RatePercent || 0;
      var rate = parseFloat(String(rateRaw).replace(/,/g, '')) || 0;
      var daysRaw = row.Days || row.NumDays || row.DaysCount || 0;
      var days = parseInt(String(daysRaw).replace(/,/g, '')) || 0;
      var interestRaw = row.Interest || row.InterestAmount || row.DebitInterest || 0;
      var interest = parseFloat(String(interestRaw).replace(/,/g, '')) || 0;
      var excessRaw = row.ExcessAmount || row.Excess || 0;
      var excess = parseFloat(String(excessRaw).replace(/,/g, '')) || 0;
      var cumulativeRaw = row.Cumulative || row.CumulativeInterest || row.TotalInterest || 0;
      var cumulative = parseFloat(String(cumulativeRaw).replace(/,/g, '')) || 0;
      
      dateVal = formatDateValue(dateVal);

      if (idx === 0) {
        console.log('[DebitInterestWorksheet] Row 0 mapped:', {dateVal, balance, rate, days, interest, excess, cumulative});
      }

      tr.innerHTML = 
        '<td><input type="checkbox" /></td>' +
        '<td>' + (dateVal || '-') + '</td>' +
        '<td class="diw-balance" style="text-align:right;">' + formatCurrency(balance) + '</td>' +
        '<td class="diw-rate" style="text-align:right;">' + rate.toFixed(2) + '</td>' +
        '<td class="diw-days" style="text-align:right;">' + days + '</td>' +
        '<td class="diw-interest" style="text-align:right;">' + formatCurrency(interest) + '</td>' +
        '<td class="diw-excess" style="text-align:right;">' + (excess > 0 ? formatCurrency(excess) : '-') + '</td>' +
        '<td class="diw-cumulative" style="text-align:right;">' + formatCurrency(cumulative) + '</td>';
      tbody.appendChild(tr);
    });

    if (recordCount) recordCount.textContent = rows.length + ' records';
    console.log('[DebitInterestWorksheet] Grid populated with', rows.length, 'rows');
  }

  // PRINT
  function printWorksheet() {
    var tbody = document.querySelector('#worksheetGrid tbody');
    var rows = tbody ? tbody.querySelectorAll('tr:not(.de-table__empty)') : [];
    
    if (!rows || rows.length === 0) {
      alert('No worksheet data to print. Please load data first.');
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
        '<td class="right">' + (cells[2] ? cells[2].textContent : '') + '</td>' +
        '<td class="right">' + (cells[3] ? cells[3].textContent : '') + '</td>' +
        '<td class="right">' + (cells[4] ? cells[4].textContent : '') + '</td>' +
        '<td class="right interest">' + (cells[5] ? cells[5].textContent : '') + '</td>' +
        '<td class="right">' + (cells[6] ? cells[6].textContent : '') + '</td>' +
        '<td class="right cumulative">' + (cells[7] ? cells[7].textContent : '') + '</td>' +
        '</tr>';
    }

    var printHtml = '<!DOCTYPE html><html><head><title>Debit Interest Worksheet</title>' +
      '<style>' +
      'body { font-family: Segoe UI, sans-serif; font-size: 11px; padding: 20px; }' +
      '.header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #4a7c95; padding-bottom: 15px; }' +
      '.header h1 { font-size: 18px; color: #4a7c95; margin-bottom: 5px; }' +
      '.info { display: flex; justify-content: space-between; margin-bottom: 15px; background: #f8fafc; padding: 10px; }' +
      'table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }' +
      'th { background: #4a7c95; color: white; padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; }' +
      'th.right { text-align: right; }' +
      'td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }' +
      'td.right { text-align: right; }' +
      '.interest { color: #d97706; font-weight: 600; }' +
      '.cumulative { color: #7c3aed; font-weight: 600; }' +
      'tr:nth-child(even) { background: #f8fafc; }' +
      '.footer { margin-top: 20px; text-align: center; font-size: 10px; color: #64748b; }' +
      '@media print { th { background: #4a7c95 !important; -webkit-print-color-adjust: exact; } }' +
      '</style></head><body>' +
      '<div class="header"><h1>DEBIT INTEREST WORKSHEET</h1><div>' + new Date().toLocaleDateString() + '</div></div>' +
      '<div class="info">' +
      '<span><strong>Branch:</strong> ' + (state.OurBranchID || '-') + '</span>' +
      '<span><strong>Account:</strong> ' + (state.AccountID || '-') + '</span>' +
      '<span><strong>Period:</strong> ' + fromDate + ' to ' + toDate + '</span>' +
      '</div>' +
      '<table><thead><tr><th>Date</th><th class="right">Balance</th><th class="right">Rate %</th><th class="right">Days</th><th class="right">Interest</th><th class="right">Excess</th><th class="right">Cumulative</th></tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody></table>' +
      '<div class="footer">Computer generated debit interest worksheet</div>' +
      '</body></html>';

    var printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.onload = function() { printWindow.focus(); printWindow.print(); };
    }
  }

  // EXPORT
  function exportWorksheet() {
    var tbody = document.querySelector('#worksheetGrid tbody');
    var rows = tbody ? tbody.querySelectorAll('tr:not(.de-table__empty)') : [];
    
    if (!rows || rows.length === 0) {
      alert('No worksheet data to export. Please load data first.');
      return;
    }

    var csv = 'Date,Balance,Rate %,Days,Interest,Excess Amount,Cumulative\n';
    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i].querySelectorAll('td');
      csv += '"' + (cells[1] ? cells[1].textContent : '') + '",';
      csv += '"' + (cells[2] ? cells[2].textContent : '') + '",';
      csv += '"' + (cells[3] ? cells[3].textContent : '') + '",';
      csv += '"' + (cells[4] ? cells[4].textContent : '') + '",';
      csv += '"' + (cells[5] ? cells[5].textContent : '') + '",';
      csv += '"' + (cells[6] ? cells[6].textContent : '') + '",';
      csv += '"' + (cells[7] ? cells[7].textContent : '') + '"\n';
    }

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'debit_interest_worksheet_' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
  }

  // CLOSE
  function closeView() {
    try {
      window.parent.postMessage({ type: 'accountMaintenanceChildClose' }, '*');
    } catch (_) {}
  }

  // TITLE BAR
  function wireTitleBar() {
    var titleBarContainer = document.querySelector('[data-kairo-titlebar]');
    var titleBarElement = document.querySelector('.ktb-title-bar');
    var targetElement = titleBarElement || titleBarContainer;
    if (!targetElement) return;

    targetElement.addEventListener('kairo:titlebar:refresh', function() {
      fetchDebitInterestWorksheet();
    });
    targetElement.addEventListener('kairo:titlebar:maximize', function(e) {
      var isMaximized = e.detail && e.detail.maximized;
      if (typeof window.toggleMaximize === 'function') {
        window.toggleMaximize(isMaximized);
      }
    });
    targetElement.addEventListener('kairo:titlebar:close', function() {
      closeView();
    });
  }

  // SELECT ALL CHECKBOX
  function wireSelectAll() {
    var selectAll = document.getElementById('selectAll');
    if (selectAll) {
      selectAll.addEventListener('change', function() {
        var checkboxes = document.querySelectorAll('#worksheetGrid tbody input[type="checkbox"]');
        checkboxes.forEach(function(cb) { cb.checked = selectAll.checked; });
      });
    }
  }

  // ACTION BUTTONS
  function wireActionButtons() {
    document.querySelectorAll('[data-action]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var action = btn.getAttribute('data-action');
        switch (action) {
          case 'view':
            fetchDebitInterestWorksheet();
            break;
          case 'print':
            printWorksheet();
            break;
          case 'export':
            exportWorksheet();
            break;
          case 'refresh':
            fetchDebitInterestWorksheet();
            break;
          case 'close':
            closeView();
            break;
        }
      });
    });
  }

  // INIT
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[DebitInterestWorksheet] DOM ready');
    
    // Wire period change
    var periodSelect = document.getElementById('periodSelect');
    if (periodSelect) {
      periodSelect.addEventListener('change', handlePeriodChange);
    }
    
    // Initialize dates
    var fromDate = document.getElementById('fromDate');
    var toDate = document.getElementById('toDate');
    var today = getToday();
    if (fromDate) fromDate.value = formatDateDisplay(today);
    if (toDate) toDate.value = formatDateDisplay(today);
    
    wireDatePickers();
    wireTitleBar();
    wireSelectAll();
    wireActionButtons();
  });
})();
