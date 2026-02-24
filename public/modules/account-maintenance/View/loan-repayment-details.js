/**
 * Loan Repayment Details - Modern Professional Module
 * Version: 2.0.0 - January 2026
 * Replicates Statement View format with dbo.p_SILoanDetailView API
 */
(function () {
  'use strict';

  console.log('[LoanRepaymentDetails] Initializing...');

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // DATE UTILITIES
  function formatDateDisplay(date) {
    if (!date || isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = MONTHS[date.getMonth()];
    const year = date.getFullYear();
    return day + '-' + month + '-' + year;
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
      console.warn('[LoanRepaymentDetails] Could not parse date:', dateVal);
    }
    return String(dateVal);
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


  function showToast(message, type) {
    removeToast();
    var container = document.createElement('div');
    container.className = 'de-toast-container de-toast-' + (type || 'info');
    container.innerHTML = '<span>' + message + '</span><button type="button" class="de-toast-close">&times;</button>';
    document.body.appendChild(container);
    container.querySelector('.de-toast-close').addEventListener('click', function() {
      container.remove();
    });
    setTimeout(function() {
      if (container.parentNode) container.remove();
    }, 5000);
  }

  function removeToast() {
    var existing = document.querySelector('.de-toast-container');
    if (existing) existing.remove();
  }

  // FETCH LOAN REPAYMENT DETAILS
  function fetchLoanRepaymentDetails() {
    console.log('[LoanRepaymentDetails] fetchLoanRepaymentDetails called');
    
    var state = getParentState();
    console.log('[LoanRepaymentDetails] Parent state:', state);

    if (!state.OurBranchID || !state.AccountID) {
      console.warn('[LoanRepaymentDetails] Missing OurBranchID or AccountID');
      setStatus('Missing account information');
      return;
    }

    var requestData = {
      OurBranchID: state.OurBranchID || '',
      AccountID: state.AccountID || '',
      OperatorID: state.OperatorID || ''
    };

    console.log('[LoanRepaymentDetails] Request Data:', requestData);
    showLoader('Fetching loan repayment details...');
    setStatus('Loading...');

    if (window.AccountService && typeof window.AccountService.getLoanRepaymentDetails === 'function') {
      console.log('[LoanRepaymentDetails] Using AccountService.getLoanRepaymentDetails');
      window.AccountService.getLoanRepaymentDetails(requestData)
        .then(function(response) {
          console.log('[LoanRepaymentDetails] API Response:', response);
          
          if (response && response.success === false) {
            console.warn('[LoanRepaymentDetails] API returned success=false:', response.message);
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
          
          console.log('[LoanRepaymentDetails] Rows to display:', rows.length);
          if (rows.length > 0) {
            console.log('[LoanRepaymentDetails] First row keys:', Object.keys(rows[0]));
          }
          
          populateGrid(rows);
          setStatus('Loaded ' + rows.length + ' repayment record(s)');
        })
        .catch(function(err) {
          console.error('[LoanRepaymentDetails] API Error:', err);
          setStatus('Error loading loan repayment details');
          populateGrid([]);
        })
        .finally(function() {
          hideLoader();
        });
    } else {
      console.error('[LoanRepaymentDetails] AccountService not available');
      setStatus('Service unavailable');
      hideLoader();
      showToast('AccountService is not loaded. Please refresh the page.', 'error');
    }
  }

  // POPULATE GRID
  function populateGrid(rows) {
    var tbody = document.querySelector('#repaymentGrid tbody');
    var recordCount = document.getElementById('recordCount');
    
    if (!tbody) {
      console.error('[LoanRepaymentDetails] tbody not found');
      return;
    }

    tbody.innerHTML = '';

    if (!rows || rows.length === 0) {
      tbody.innerHTML = '<tr class="de-table__empty"><td colspan="8" style="text-align:center;padding:40px;color:#64748b;">No loan repayment records found.</td></tr>';
      if (recordCount) recordCount.textContent = '0 records';
      return;
    }

    rows.forEach(function(row, idx) {
      var tr = document.createElement('tr');
      
      var dueDate = row.DueDate || row.Date || row.InstallmentDate || row.TrxDate || '';
      var valueDate = row.ValueDate || row.ValDate || '';
      var particulars = row.Particulars || row.Description || row.Narration || '';
      var principalRaw = row.Principal || row.PrincipalAmount || row.PrincipalDue || 0;
      var principal = parseFloat(String(principalRaw).replace(/,/g, '')) || 0;
      var interestRaw = row.Interest || row.InterestAmount || row.InterestDue || 0;
      var interest = parseFloat(String(interestRaw).replace(/,/g, '')) || 0;
      var totalDueRaw = row.TotalDue || row.InstallmentAmount || row.Amount || (principal + interest);
      var totalDue = parseFloat(String(totalDueRaw).replace(/,/g, '')) || 0;
      var balanceRaw = row.Balance || row.OutstandingBalance || row.ClosingBalance || 0;
      var balance = parseFloat(String(balanceRaw).replace(/,/g, '')) || 0;
      
      dueDate = formatDateValue(dueDate);
      valueDate = formatDateValue(valueDate);

      if (idx === 0) {
        console.log('[LoanRepaymentDetails] Row 0 mapped:', {dueDate, valueDate, particulars, principal, interest, totalDue, balance});
      }

      tr.innerHTML = 
        '<td><input type="checkbox" /></td>' +
        '<td>' + (dueDate || '-') + '</td>' +
        '<td>' + (valueDate || '-') + '</td>' +
        '<td>' + (particulars || '-') + '</td>' +
        '<td class="lrd-principal" style="text-align:right;">' + (principal > 0 ? formatCurrency(principal) : '-') + '</td>' +
        '<td class="lrd-interest" style="text-align:right;">' + (interest > 0 ? formatCurrency(interest) : '-') + '</td>' +
        '<td class="lrd-total" style="text-align:right;">' + (totalDue > 0 ? formatCurrency(totalDue) : '-') + '</td>' +
        '<td class="lrd-balance" style="text-align:right;">' + formatCurrency(balance) + '</td>';
      tbody.appendChild(tr);
    });

    if (recordCount) recordCount.textContent = rows.length + ' records';
    console.log('[LoanRepaymentDetails] Grid populated with', rows.length, 'rows');
  }

  // PRINT
  function printRepayment() {
    var tbody = document.querySelector('#repaymentGrid tbody');
    var rows = tbody ? tbody.querySelectorAll('tr:not(.de-table__empty)') : [];
    
    if (!rows || rows.length === 0) {
      showToast('No repayment data to print. Please load data first.', 'warning');
      return;
    }

    var state = getParentState();

    var rowsHtml = '';
    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i].querySelectorAll('td');
      rowsHtml += '<tr>' +
        '<td>' + (cells[1] ? cells[1].textContent : '') + '</td>' +
        '<td>' + (cells[2] ? cells[2].textContent : '') + '</td>' +
        '<td>' + (cells[3] ? cells[3].textContent : '') + '</td>' +
        '<td class="right principal">' + (cells[4] ? cells[4].textContent : '') + '</td>' +
        '<td class="right interest">' + (cells[5] ? cells[5].textContent : '') + '</td>' +
        '<td class="right total">' + (cells[6] ? cells[6].textContent : '') + '</td>' +
        '<td class="right">' + (cells[7] ? cells[7].textContent : '') + '</td>' +
        '</tr>';
    }

    var printHtml = '<!DOCTYPE html><html><head><title>Loan Repayment Details</title>' +
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
      '.principal { color: #059669; font-weight: 600; }' +
      '.interest { color: #d97706; font-weight: 600; }' +
      '.total { color: #7c3aed; font-weight: 600; }' +
      'tr:nth-child(even) { background: #f8fafc; }' +
      '.footer { margin-top: 20px; text-align: center; font-size: 10px; color: #64748b; }' +
      '@media print { th { background: #4a7c95 !important; -webkit-print-color-adjust: exact; } }' +
      '</style></head><body>' +
      '<div class="header"><h1>LOAN REPAYMENT DETAILS</h1><div>' + new Date().toLocaleDateString() + '</div></div>' +
      '<div class="info">' +
      '<span><strong>Branch:</strong> ' + (state.OurBranchID || '-') + '</span>' +
      '<span><strong>Account:</strong> ' + (state.AccountID || '-') + '</span>' +
      '</div>' +
      '<table><thead><tr><th>Due Date</th><th>Value Date</th><th>Particulars</th><th class="right">Principal</th><th class="right">Interest</th><th class="right">Total Due</th><th class="right">Balance</th></tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody></table>' +
      '<div class="footer">Computer generated loan repayment schedule</div>' +
      '</body></html>';

    var printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.onload = function() { printWindow.focus(); printWindow.print(); };
    }
  }

  // EXPORT
  function exportRepayment() {
    var tbody = document.querySelector('#repaymentGrid tbody');
    var rows = tbody ? tbody.querySelectorAll('tr:not(.de-table__empty)') : [];
    
    if (!rows || rows.length === 0) {
      showToast('No repayment data to export. Please load data first.', 'warning');
      return;
    }

    var csv = 'Due Date,Value Date,Particulars,Principal,Interest,Total Due,Balance\n';
    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i].querySelectorAll('td');
      csv += '"' + (cells[1] ? cells[1].textContent : '') + '",';
      csv += '"' + (cells[2] ? cells[2].textContent : '') + '",';
      csv += '"' + (cells[3] ? cells[3].textContent.replace(/"/g, '""') : '') + '",';
      csv += '"' + (cells[4] ? cells[4].textContent : '') + '",';
      csv += '"' + (cells[5] ? cells[5].textContent : '') + '",';
      csv += '"' + (cells[6] ? cells[6].textContent : '') + '",';
      csv += '"' + (cells[7] ? cells[7].textContent : '') + '"\n';
    }

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'loan_repayment_' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
  }

  // CLOSE
  function closeView() {
    try {
      window.parent.postMessage({ type: 'accountMaintenanceChildClose' }, '*');
    } catch (_) {}
  }

  // WIRE KAIRO TITLE BAR
  function wireTitleBar() {
    var titleBarContainer = document.querySelector('[data-kairo-titlebar]');
    var titleBarElement = document.querySelector('.ktb-title-bar');
    var targetElement = titleBarElement || titleBarContainer;
    if (!targetElement) return;

    targetElement.addEventListener('kairo:titlebar:refresh', function() {
      fetchLoanRepaymentDetails();
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
        var checkboxes = document.querySelectorAll('#repaymentGrid tbody input[type="checkbox"]');
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
          case 'print':
            printRepayment();
            break;
          case 'export':
            exportRepayment();
            break;
          case 'refresh':
            fetchLoanRepaymentDetails();
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
    console.log('[LoanRepaymentDetails] DOM ready');
    wireTitleBar();
    wireSelectAll();
    wireActionButtons();
    
    // Auto-load on open
    setTimeout(function() {
      fetchLoanRepaymentDetails();
    }, 100);
  });
})();
