/**
 * Client Portfolio View - Modern Professional Portfolio Module
 * Version: 2.0.0 - January 2026
 */
(function () {
  'use strict';

  console.log('[ClientPortfolio] Initializing...');

  // ============================================================================
  // PARENT STATE ACCESS
  // ============================================================================
  function getParentState() {
    if (window.parent && window.parent !== window && window.parent.AccountMaintenanceState) {
      return window.parent.AccountMaintenanceState;
    }
    if (window.AccountMaintenanceState) {
      return window.AccountMaintenanceState;
    }
    return { OurBranchID: '', AccountID: '', OperatorID: '', ClientID: '' };
  }

  
  // ============================================================================
  // UI HELPERS
  // ============================================================================
  function showLoader(message) {
    var overlay = document.getElementById('loadingOverlay');
    var textEl = overlay ? overlay.querySelector('span') : null;
    if (textEl) textEl.textContent = message || 'Loading...';
    if (overlay) overlay.hidden = false;
  }

  function hideLoader() {
    var overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.hidden = true;
  }

  function setStatus(text) {
    var statusBar = document.querySelector('.de-status-bar');
    if (statusBar) statusBar.textContent = text;
  }

  function formatCurrency(value) {
    var num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ============================================================================
  // LOAD PORTFOLIO TYPES FROM LOOKUP SERVICE
  // ============================================================================
  function loadPortfolioTypes() {
    var select = document.getElementById('portfolioType');
    if (!select) {
      console.error('[ClientPortfolio] Portfolio type select not found');
      return Promise.resolve();
    }

    // Check if LookupService is available
    if (window.LookupService && typeof window.LookupService.getClientPortfolioTypes === 'function') {
      console.log('[ClientPortfolio] Loading portfolio types from LookupService');
      return window.LookupService.getClientPortfolioTypes()
        .then(function(options) {
          console.log('[ClientPortfolio] Portfolio types loaded:', options);
          select.innerHTML = '<option value="">--Select--</option>';
          if (Array.isArray(options)) {
            options.forEach(function(opt) {
              var option = document.createElement('option');
              option.value = opt.value || opt.Value || opt.code || opt.Code || '';
              option.textContent = opt.label || opt.Label || opt.description || opt.Description || opt.text || opt.Text || '';
              select.appendChild(option);
            });
          }
          // Set default to first option after --Select--
          if (select.options.length > 1) {
            select.selectedIndex = 1;
          }
        })
        .catch(function(err) {
          console.error('[ClientPortfolio] Error loading portfolio types:', err);
          // Add default options as fallback
          select.innerHTML = '<option value="">--Select--</option>' +
            '<option value="A">All Accounts</option>' +
            '<option value="D">Deposits Only</option>' +
            '<option value="L">Loans Only</option>';
        });
    } else {
      console.warn('[ClientPortfolio] LookupService not available, using defaults');
      select.innerHTML = '<option value="">--Select--</option>' +
        '<option value="A">All Accounts</option>' +
        '<option value="D">Deposits Only</option>' +
        '<option value="L">Loans Only</option>';
      return Promise.resolve();
    }
  }

  // ============================================================================
  // FETCH CLIENT PORTFOLIO
  // ============================================================================
  function fetchPortfolio() {
    console.log('[ClientPortfolio] fetchPortfolio called');
    
    var state = getParentState();
    console.log('[ClientPortfolio] Parent state:', state);

    var portfolioType = document.getElementById('portfolioType');
    var base = portfolioType ? portfolioType.value : 'A';

    var requestData = {
      OurBranchID: state.OurBranchID || '',
      ClientID: state.ClientID || '',
      OperatorID: state.OperatorID || '',
      Base: base || 'A'
    };

    console.log('[ClientPortfolio] Request Data:', requestData);
    showLoader('Fetching client portfolio...');
    setStatus('Loading...');

    // Use accountservice for API call
    if (window.accountservice && typeof window.accountservice.getClientPortfolio === 'function') {
      console.log('[ClientPortfolio] Using accountservice.getClientPortfolio');
      window.accountservice.getClientPortfolio(requestData)
        .then(function(response) {
          console.log('[ClientPortfolio] API Response:', response);
          var data = (response && response.data) || (response && response.Details) || response || [];
          var rows = Array.isArray(data) ? data : (data.portfolio || data.rows || []);
          populateGrid(rows);
          calculateTotals(rows);
          setStatus('Loaded ' + rows.length + ' portfolio record(s)');
        })
        .catch(function(err) {
          console.error('[ClientPortfolio] API Error:', err);
          setStatus('Error loading portfolio');
          populateGrid([]);
          clearTotals();
        })
        .finally(function() {
          hideLoader();
        });
    } else {
      console.error('[ClientPortfolio] accountservice not available');
      setStatus('Service unavailable');
      hideLoader();
      alert('accountservice is not loaded. Please refresh the page.');
    }
  }

  // ============================================================================
  // POPULATE GRID
  // ============================================================================
  function populateGrid(rows) {
    var tbody = document.querySelector('#portfolioGrid tbody');
    var recordCount = document.getElementById('recordCount');
    
    if (!tbody) {
      console.error('[ClientPortfolio] tbody not found');
      return;
    }

    tbody.innerHTML = '';

    if (!rows || rows.length === 0) {
      tbody.innerHTML = '<tr class="de-table__empty"><td colspan="7" style="text-align:center;padding:40px;color:#64748b;">No portfolio records found.</td></tr>';
      if (recordCount) recordCount.textContent = '0 records';
      return;
    }

    rows.forEach(function(row) {
      var tr = document.createElement('tr');
      var deposit = parseFloat(row.Deposit || row.DepositAmount || 0);
      var advance = parseFloat(row.Advance || row.AdvanceAmount || 0);
      var nonFund = parseFloat(row.NonFundAdvance || row.NonFund || 0);
      var intReceivable = parseFloat(row.InterestReceivable || row.IntReceivable || 0);
      var intPayable = parseFloat(row.InterestPayable || row.IntPayable || 0);

      tr.innerHTML = 
        '<td>' + (row.BranchID || row.OurBranchID || '-') + '</td>' +
        '<td>' + (row.AccountID || row.AccountNo || '-') + '</td>' +
        '<td class="de-text-success" style="text-align:right;">' + formatCurrency(deposit) + '</td>' +
        '<td class="de-text-warning" style="text-align:right;">' + formatCurrency(advance) + '</td>' +
        '<td style="text-align:right;">' + formatCurrency(nonFund) + '</td>' +
        '<td class="de-text-danger" style="text-align:right;">' + formatCurrency(intReceivable) + '</td>' +
        '<td class="de-text-info" style="text-align:right;">' + formatCurrency(intPayable) + '</td>';
      
      // Add click handler to highlight row
      tr.addEventListener('click', function() {
        var allRows = tbody.querySelectorAll('tr');
        allRows.forEach(function(r) { r.classList.remove('de-table__row--selected'); });
        tr.classList.add('de-table__row--selected');
        
        // Update accountId field
        var accountIdField = document.getElementById('accountId');
        if (accountIdField) {
          accountIdField.value = row.AccountID || row.AccountNo || '';
        }
      });
      
      tbody.appendChild(tr);
    });

    if (recordCount) recordCount.textContent = rows.length + ' records';
    console.log('[ClientPortfolio] Grid populated with', rows.length, 'rows');
  }

  // ============================================================================
  // CALCULATE TOTALS
  // ============================================================================
  function calculateTotals(rows) {
    var totalDeposits = 0;
    var totalAdvances = 0;
    var totalNonFund = 0;
    var totalIntReceivable = 0;
    var totalIntPayable = 0;

    if (rows && rows.length > 0) {
      rows.forEach(function(row) {
        totalDeposits += parseFloat(row.Deposit || row.DepositAmount || 0);
        totalAdvances += parseFloat(row.Advance || row.AdvanceAmount || 0);
        totalNonFund += parseFloat(row.NonFundAdvance || row.NonFund || 0);
        totalIntReceivable += parseFloat(row.InterestReceivable || row.IntReceivable || 0);
        totalIntPayable += parseFloat(row.InterestPayable || row.IntPayable || 0);
      });
    }

    var netFundsUsed = totalAdvances + totalNonFund - totalDeposits;

    // Update fields (support both input.value and span.textContent)
    var fields = {
      totalDeposits: totalDeposits,
      totalAdvances: totalAdvances,
      totalNonFund: totalNonFund,
      totalInterestReceivable: totalIntReceivable,
      totalInterestPayable: totalIntPayable,
      netFundsUsed: netFundsUsed
    };

    Object.keys(fields).forEach(function(fieldId) {
      var field = document.getElementById(fieldId);
      if (field) {
        var formattedValue = formatCurrency(fields[fieldId]);
        // Support both input fields and span elements
        if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
          field.value = formattedValue;
        } else {
          field.textContent = formattedValue;
        }
      }
    });

    console.log('[ClientPortfolio] Totals calculated');
  }

  // ============================================================================
  // CLEAR TOTALS
  // ============================================================================
  function clearTotals() {
    var fieldIds = ['totalDeposits', 'totalAdvances', 'totalNonFund', 
                    'totalInterestReceivable', 'totalInterestPayable', 
                    'netFundsUsed', 'accountId'];
    
    fieldIds.forEach(function(fieldId) {
      var field = document.getElementById(fieldId);
      if (field) {
        // Support both input fields and span elements
        if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
          field.value = '0.00';
        } else {
          field.textContent = '0.00';
        }
      }
    });
  }

  // ============================================================================
  // PRINT PORTFOLIO
  // ============================================================================
  function printPortfolio() {
    var tbody = document.querySelector('#portfolioGrid tbody');
    var rows = tbody ? tbody.querySelectorAll('tr:not(.de-table__empty)') : [];
    
    if (!rows || rows.length === 0) {
      alert('No portfolio data to print. Please load data first.');
      return;
    }

    var state = getParentState();
    
    // Get totals
    var totalDeposits = document.getElementById('totalDeposits');
    var totalAdvances = document.getElementById('totalAdvances');
    var totalNonFund = document.getElementById('totalNonFund');
    var totalIntReceivable = document.getElementById('totalInterestReceivable');
    var totalIntPayable = document.getElementById('totalInterestPayable');
    var netFundsUsed = document.getElementById('netFundsUsed');

    var rowsHtml = '';
    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i].querySelectorAll('td');
      rowsHtml += '<tr>' +
        '<td>' + (cells[0] ? cells[0].textContent : '') + '</td>' +
        '<td>' + (cells[1] ? cells[1].textContent : '') + '</td>' +
        '<td class="right deposit">' + (cells[2] ? cells[2].textContent : '') + '</td>' +
        '<td class="right advance">' + (cells[3] ? cells[3].textContent : '') + '</td>' +
        '<td class="right">' + (cells[4] ? cells[4].textContent : '') + '</td>' +
        '<td class="right receivable">' + (cells[5] ? cells[5].textContent : '') + '</td>' +
        '<td class="right payable">' + (cells[6] ? cells[6].textContent : '') + '</td>' +
        '</tr>';
    }

    // Helper to get value from input or span
    function getFieldValue(el) {
      if (!el) return '0.00';
      return (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ? el.value : el.textContent;
    }

    var printHtml = '<!DOCTYPE html><html><head><title>Client Portfolio</title>' +
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
      '.deposit { color: #059669; font-weight: 600; }' +
      '.advance { color: #d97706; font-weight: 600; }' +
      '.receivable { color: #dc2626; font-weight: 600; }' +
      '.payable { color: #0284c7; font-weight: 600; }' +
      'tr:nth-child(even) { background: #f8fafc; }' +
      '.summary { background: #f8fafc; padding: 15px; border-radius: 8px; }' +
      '.summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }' +
      '.summary-item { padding: 8px; background: white; border-radius: 4px; border: 1px solid #e2e8f0; }' +
      '.summary-label { font-size: 9px; color: #64748b; text-transform: uppercase; }' +
      '.summary-value { font-size: 14px; font-weight: 600; color: #1e293b; }' +
      '.footer { margin-top: 20px; text-align: center; font-size: 10px; color: #64748b; }' +
      '@media print { th { background: #4a7c95 !important; -webkit-print-color-adjust: exact; } .summary { background: #f8fafc !important; } }' +
      '</style></head><body>' +
      '<div class="header"><h1>CLIENT PORTFOLIO</h1><div>' + new Date().toLocaleDateString() + '</div></div>' +
      '<div class="info">' +
      '<span><strong>Branch:</strong> ' + (state.OurBranchID || '-') + '</span>' +
      '<span><strong>Client ID:</strong> ' + (state.ClientID || '-') + '</span>' +
      '</div>' +
      '<table><thead><tr><th>Branch ID</th><th>Account ID</th><th class="right">Deposit</th><th class="right">Advance</th><th class="right">Non-Fund</th><th class="right">Int. Receivable</th><th class="right">Int. Payable</th></tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody></table>' +
      '<div class="summary"><h3 style="margin:0 0 10px;color:#4a7c95;">Consolidated Summary</h3><div class="summary-grid">' +
      '<div class="summary-item"><div class="summary-label">Total Deposits</div><div class="summary-value deposit">' + getFieldValue(totalDeposits) + '</div></div>' +
      '<div class="summary-item"><div class="summary-label">Total Advances</div><div class="summary-value advance">' + getFieldValue(totalAdvances) + '</div></div>' +
      '<div class="summary-item"><div class="summary-label">Total Non-Fund</div><div class="summary-value">' + getFieldValue(totalNonFund) + '</div></div>' +
      '<div class="summary-item"><div class="summary-label">Int. Receivable</div><div class="summary-value receivable">' + getFieldValue(totalIntReceivable) + '</div></div>' +
      '<div class="summary-item"><div class="summary-label">Int. Payable</div><div class="summary-value payable">' + getFieldValue(totalIntPayable) + '</div></div>' +
      '<div class="summary-item"><div class="summary-label">Net Funds Used</div><div class="summary-value">' + getFieldValue(netFundsUsed) + '</div></div>' +
      '</div></div>' +
      '<div class="footer">Computer generated portfolio statement</div>' +
      '</body></html>';

    var printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.onload = function() { printWindow.focus(); printWindow.print(); };
    }
  }

  // ============================================================================
  // EXPORT PORTFOLIO
  // ============================================================================
  function exportPortfolio() {
    var tbody = document.querySelector('#portfolioGrid tbody');
    var rows = tbody ? tbody.querySelectorAll('tr:not(.de-table__empty)') : [];
    
    if (!rows || rows.length === 0) {
      alert('No portfolio data to export.');
      return;
    }

    var csv = 'Branch ID,Account ID,Deposit,Advance,Non-Fund Advance,Interest Receivable,Interest Payable\n';
    
    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i].querySelectorAll('td');
      var rowData = [];
      for (var j = 0; j < cells.length; j++) {
        var text = cells[j].textContent.replace(/,/g, '');
        rowData.push('"' + text + '"');
      }
      csv += rowData.join(',') + '\n';
    }

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    var url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'client_portfolio_' + new Date().toISOString().slice(0, 10) + '.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ============================================================================
  // WIRE KAIRO TITLE BAR
  // ============================================================================
  function wireTitleBar() {
    var titleBarContainer = document.querySelector('[data-kairo-titlebar]');
    var titleBarElement = document.querySelector('.ktb-title-bar');
    var targetElement = titleBarElement || titleBarContainer;
    if (!targetElement) return;

    targetElement.addEventListener('kairo:titlebar:refresh', function() {
      fetchPortfolio();
    });
    targetElement.addEventListener('kairo:titlebar:maximize', function(e) {
      var isMaximized = e.detail && e.detail.maximized;
      if (typeof window.toggleMaximize === 'function') {
        window.toggleMaximize(isMaximized);
      }
    });
    targetElement.addEventListener('kairo:titlebar:close', function() {
      postClose();
    });
  }

  // ============================================================================
  // WIRE ACTIONS
  // ============================================================================
  function wireActions() {
    var printBtn = document.querySelector('[data-action="print"]');
    var exportBtn = document.querySelector('[data-action="export"]');
    var refreshBtn = document.querySelector('[data-action="refresh"]');
    var closeBtn = document.querySelector('.action-panel [data-action="close"]');
    var portfolioType = document.getElementById('portfolioType');

    wireTitleBar();

    console.log('[ClientPortfolio] Print button found:', !!printBtn);
    console.log('[ClientPortfolio] Export button found:', !!exportBtn);
    console.log('[ClientPortfolio] Portfolio type found:', !!portfolioType);

    if (printBtn) {
      printBtn.onclick = function(e) {
        e.preventDefault();
        console.log('[ClientPortfolio] Print button clicked');
        printPortfolio();
      };
    }

    if (exportBtn) {
      exportBtn.onclick = function(e) {
        e.preventDefault();
        console.log('[ClientPortfolio] Export button clicked');
        exportPortfolio();
      };
    }

    if (refreshBtn) {
      refreshBtn.onclick = function(e) {
        e.preventDefault();
        console.log('[ClientPortfolio] Refresh button clicked');
        fetchPortfolio();
      };
    }

    if (closeBtn) {
      closeBtn.onclick = function(e) {
        e.preventDefault();
        postClose();
      };
    }

    // Reload portfolio when type changes
    if (portfolioType) {
      portfolioType.onchange = function() {
        console.log('[ClientPortfolio] Portfolio type changed to:', portfolioType.value);
        fetchPortfolio();
      };
    }
  }

  // ============================================================================
  // CLOSE HANDLER
  // ============================================================================
  function postClose() {
    try {
      window.parent.postMessage({ type: 'accountMaintenanceChildClose' }, '*');
    } catch (_) {
      // ignore
    }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  function init() {
    console.log('[ClientPortfolio] DOM ready, initializing...');
    
    // Load portfolio types first, then fetch data
    loadPortfolioTypes()
      .then(function() {
        wireActions();
        setStatus('Ready');
        // Auto-load portfolio on page load
        fetchPortfolio();
      })
      .catch(function(err) {
        console.error('[ClientPortfolio] Initialization error:', err);
        wireActions();
        setStatus('Ready');
      });
    
    console.log('[ClientPortfolio] Initialization complete');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

