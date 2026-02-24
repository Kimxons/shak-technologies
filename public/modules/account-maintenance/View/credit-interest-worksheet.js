/**
 * Credit Interest Worksheet - Modern Professional Module
 * Version: 2.0.0 - January 2026
 * Uses dbo.p_GetCreditInterestWorksheet API
 */
(function () {
  'use strict';

  console.log('[CreditInterestWorksheet] Initializing...');

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
      console.warn('[CreditInterestWorksheet] Could not parse date:', dateVal);
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

  // TOAST NOTIFICATION
  function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'de-toast-container';
      document.body.appendChild(container);
    }

    var toast = document.createElement('div');
    toast.className = 'de-toast de-toast--' + type;
    
    var iconMap = {
      success: 'bi-check-circle-fill',
      error: 'bi-x-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      info: 'bi-info-circle-fill'
    };
    
    toast.innerHTML = '<i class="bi ' + (iconMap[type] || iconMap.info) + ' de-toast__icon"></i>' +
      '<span class="de-toast__message">' + message + '</span>' +
      '<button class="de-toast__close" type="button"><i class="bi bi-x-lg"></i></button>';
    
    container.appendChild(toast);
    
    var timeout = setTimeout(function() { removeToast(toast); }, 5000);
    
    var closeBtn = toast.querySelector('.de-toast__close');
    if (closeBtn) {
      closeBtn.onclick = function() {
        clearTimeout(timeout);
        removeToast(toast);
      };
    }
    
    setTimeout(function() { toast.classList.add('de-toast--visible'); }, 10);
  }

  function removeToast(toast) {
    toast.classList.remove('de-toast--visible');
    setTimeout(function() { 
      if (toast.parentNode) toast.parentNode.removeChild(toast); 
    }, 300);
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
    setStatus(message);
    showToast(message, 'error');
  }

  // FETCH CREDIT INTEREST WORKSHEET
  function fetchCreditInterestWorksheet() {
    console.log('[CreditInterestWorksheet] fetchCreditInterestWorksheet called');
    
    var fromDateEl = document.getElementById('fromDate');
    var toDateEl = document.getElementById('toDate');
    
    if (!fromDateEl || !fromDateEl.value || !toDateEl || !toDateEl.value) {
      showError('Please select a date range before viewing.');
      return;
    }

    var state = getParentState();
    console.log('[CreditInterestWorksheet] Parent state:', state);

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
      ClientID: state.ClientID || ''
    };

    console.log('[CreditInterestWorksheet] Request Data:', requestData);
    showLoader('Fetching credit interest worksheet...');
    setStatus('Loading...');

    if (window.AccountService && typeof window.AccountService.getCreditInterestWorksheet === 'function') {
      console.log('[CreditInterestWorksheet] Using AccountService.getCreditInterestWorksheet');
      window.AccountService.getCreditInterestWorksheet(requestData)
        .then(function(response) {
          console.log('[CreditInterestWorksheet] API Response:', response);
          
          if (response && response.success === false) {
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
          
          console.log('[CreditInterestWorksheet] Rows to display:', rows.length);
          populateGrid(rows);
          setStatus('Loaded ' + rows.length + ' worksheet record(s)');
        })
        .catch(function(err) {
          console.error('[CreditInterestWorksheet] API Error:', err);
          setStatus('Error loading credit interest worksheet');
          populateGrid([]);
        })
        .finally(function() {
          hideLoader();
        });
    } else {
      console.error('[CreditInterestWorksheet] AccountService not available');
      setStatus('Service unavailable');
      hideLoader();
      showToast('AccountService is not loaded. Please refresh the page.', 'error');
    }
  }

  // POPULATE GRID
  function populateGrid(rows) {
    var tbody = document.querySelector('#worksheetGrid tbody');
    var recordCount = document.getElementById('recordCount');
    
    if (!tbody) {
      console.error('[CreditInterestWorksheet] tbody not found');
      return;
    }

    tbody.innerHTML = '';

    if (!rows || rows.length === 0) {
      tbody.innerHTML = '<tr class="de-table__empty"><td colspan="5" style="text-align:center;padding:40px;color:#64748b;">No credit interest records found for the selected period.</td></tr>';
      if (recordCount) recordCount.textContent = '0 records';
      return;
    }

    rows.forEach(function(row) {
      var tr = document.createElement('tr');
      
      var dateVal = row.Date || row.TrxDate || row.TransDate || '';
      var balance = parseFloat(row.Balance || row.CreditBalance || 0);
      var interest = parseFloat(row.Interest || row.InterestAmount || row.CreditInterest || 0);
      var excess = parseFloat(row.ExcessAmount || row.Excess || 0);
      var cumulative = parseFloat(row.Cumulative || row.CumulativeInterest || row.TotalInterest || 0);
      
      dateVal = formatDateValue(dateVal);

      tr.innerHTML = 
        '<td>' + (dateVal || '-') + '</td>' +
        '<td style="text-align:right;">' + formatCurrency(balance) + '</td>' +
        '<td style="text-align:right;">' + formatCurrency(interest) + '</td>' +
        '<td style="text-align:right;">' + (excess > 0 ? formatCurrency(excess) : '-') + '</td>' +
        '<td style="text-align:right;">' + formatCurrency(cumulative) + '</td>';
      tbody.appendChild(tr);
    });

    if (recordCount) recordCount.textContent = rows.length + ' records';
    console.log('[CreditInterestWorksheet] Grid populated with', rows.length, 'rows');
  }

  // PRINT
  function printWorksheet() {
    var tbody = document.querySelector('#worksheetGrid tbody');
    var rows = tbody ? tbody.querySelectorAll('tr:not(.de-table__empty)') : [];
    
    if (!rows || rows.length === 0) {
      showToast('No worksheet data to print. Please load data first.', 'warning');
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
        '<td>' + (cells[0] ? cells[0].textContent : '') + '</td>' +
        '<td class="right">' + (cells[1] ? cells[1].textContent : '') + '</td>' +
        '<td class="right interest">' + (cells[2] ? cells[2].textContent : '') + '</td>' +
        '<td class="right">' + (cells[3] ? cells[3].textContent : '') + '</td>' +
        '<td class="right cumulative">' + (cells[4] ? cells[4].textContent : '') + '</td>' +
        '</tr>';
    }

    var printHtml = '<!DOCTYPE html><html><head><title>Credit Interest Worksheet</title>' +
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
      '.interest { color: #059669; font-weight: 600; }' +
      '.cumulative { color: #0284c7; font-weight: 600; }' +
      'tr:nth-child(even) { background: #f8fafc; }' +
      '.footer { margin-top: 20px; text-align: center; font-size: 10px; color: #64748b; }' +
      '@media print { th { background: #4a7c95 !important; -webkit-print-color-adjust: exact; } }' +
      '</style></head><body>' +
      '<div class="header"><h1>CREDIT INTEREST WORKSHEET</h1><div>' + new Date().toLocaleDateString() + '</div></div>' +
      '<div class="info">' +
      '<span><strong>Branch:</strong> ' + (state.OurBranchID || '-') + '</span>' +
      '<span><strong>Account:</strong> ' + (state.AccountID || '-') + '</span>' +
      '<span><strong>Period:</strong> ' + fromDate + ' to ' + toDate + '</span>' +
      '</div>' +
      '<table><thead><tr><th>Date</th><th class="right">Balance</th><th class="right">Interest</th><th class="right">Excess Amount</th><th class="right">Cumulative</th></tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody></table>' +
      '<div class="footer">Computer generated credit interest worksheet</div>' +
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
      showToast('No worksheet data to export. Please load data first.', 'warning');
      return;
    }

    var csv = 'Date,Balance,Interest,Excess Amount,Cumulative\n';
    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i].querySelectorAll('td');
      csv += '"' + (cells[0] ? cells[0].textContent : '') + '",';
      csv += '"' + (cells[1] ? cells[1].textContent : '') + '",';
      csv += '"' + (cells[2] ? cells[2].textContent : '') + '",';
      csv += '"' + (cells[3] ? cells[3].textContent : '') + '",';
      csv += '"' + (cells[4] ? cells[4].textContent : '') + '"\n';
    }

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'credit_interest_worksheet_' + new Date().toISOString().slice(0, 10) + '.csv';
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
      fetchCreditInterestWorksheet();
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

  // ACTION BUTTONS
  function wireActionButtons() {
    document.querySelectorAll('[data-action]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var action = btn.getAttribute('data-action');
        switch (action) {
          case 'view':
            fetchCreditInterestWorksheet();
            break;
          case 'print':
            printWorksheet();
            break;
          case 'export':
            exportWorksheet();
            break;
          case 'refresh':
            fetchCreditInterestWorksheet();
            break;
          case 'close':
            closeView();
            break;
        }
      });
    });
  }

  // Populate date select dropdowns
  function populateDateSelect(select) {
    var today = getToday();
    var firstOfMonth = getFirstOfMonth();
    
    select.innerHTML = '';
    
    var opt1 = document.createElement('option');
    opt1.value = formatDateDisplay(today);
    opt1.textContent = formatDateDisplay(today);
    select.appendChild(opt1);
    
    var opt2 = document.createElement('option');
    opt2.value = formatDateDisplay(firstOfMonth);
    opt2.textContent = formatDateDisplay(firstOfMonth);
    select.appendChild(opt2);
  }

  // INIT
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[CreditInterestWorksheet] DOM ready');
    
    // Initialize dates - handle both select and input elements
    var fromDate = document.getElementById('fromDate');
    var toDate = document.getElementById('toDate');
    var today = getToday();
    
    if (fromDate && fromDate.tagName === 'SELECT') {
      populateDateSelect(fromDate);
      fromDate.value = formatDateDisplay(getFirstOfMonth());
    } else if (fromDate) {
      fromDate.value = formatDateDisplay(getFirstOfMonth());
    }
    
    if (toDate && toDate.tagName === 'SELECT') {
      populateDateSelect(toDate);
      toDate.value = formatDateDisplay(today);
    } else     if (toDate) {
      toDate.value = formatDateDisplay(today);
    }
    
    wireTitleBar();
    wireActionButtons();
  });
})();
