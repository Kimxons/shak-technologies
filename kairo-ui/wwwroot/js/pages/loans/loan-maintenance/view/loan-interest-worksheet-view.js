
// Helper: Format date as DD-MM-YYYY
function formatDateDDMMYYYY(dateStr) {
  if (!dateStr) return "";
  let text = String(dateStr);
  let match = text.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  match = text.match(/^(\d{2})\/(\w{3})\/(\d{4})$/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return text;
}

(function (global) {
  if (global.__LoanInterestWorksheetViewLoaded) {
    console.warn("loan-interest-worksheet-view.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__LoanInterestWorksheetViewLoaded = true;


  const $ = (sel, root = document) => root.querySelector(sel);

  // Set default for StatementFor dropdown to 'CM' (Display 0) on load and set dates
  const statementForSelect = $("#StatementFor");
  const fromDateEl = $("#LIWFromDate");
  const toDateEl = $("#LIWToDate");
  if (statementForSelect) {
    statementForSelect.value = 'CM';
    // Set From and To Date for 'Current Month' on load in YYYY-MM-DD format
    if (fromDateEl && toDateEl) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      fromDateEl.value = `${yyyy}-${mm}-01`;
      toDateEl.value = `${yyyy}-${mm}-${dd}`;
      fromDateEl.setAttribute('readonly', 'readonly');
      toDateEl.setAttribute('readonly', 'readonly');
    }
    // Optionally, trigger change event if needed
    statementForSelect.dispatchEvent(new Event('change'));
  }

  function requestClose() {
    // Send message to parent window to close child form (matches Account Maintenance pattern)
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ action: 'close-child-form' }, '*');
    }
  }

  // Helpers to get parent field values
  function getParentFieldValue(id) {
    try {
      if (window.parent && window.parent.document) {
        const el = window.parent.document.getElementById(id);
        return el ? el.value?.trim?.() : '';
      }
    } catch {}
    return '';
  }

  function renderGrid(rows) {
    const tbody = document.querySelector(".lmstmt-table tbody");
    const statusEl = document.querySelector('.lmstmt-status');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!rows || !rows.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="lm-stmt-empty">No records to display.</td></tr>';
      if (statusEl) {
        statusEl.textContent = 'No records to display.';
        statusEl.style.display = '';
      }
      return;
    }
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.style.display = 'none';
    }
    function formatMoney(val) {
      if (val === null || val === undefined || val === '') return '';
      let num = Number(val);
      if (isNaN(num)) return '';
      let abs = Math.abs(num).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
      if (num < 0) {
        return `<span style=\"color:#b91c1c;font-weight:bold\">(${abs})</span>`;
      }
      return abs;
    }
    for (const row of rows) {
      const tr = document.createElement('tr');
      tr.style.fontWeight = 'bold';
      // Support both Cumulative and Cummulative property names
      const cumulative = row.Cumulative !== undefined ? row.Cumulative : row.Cummulative;
      tr.innerHTML = `
        <td>${formatDateDDMMYYYY(row.Date) ?? ''}</td>
        <td>${formatMoney(row.Balance)}</td>
        <td>${formatMoney(row.PrincipalBalance)}</td>
        <td>${formatMoney(row.Interest)}</td>
        <td>${formatMoney(row.LoanAmountDue)}</td>
        <td>${formatMoney(row.PenaltyAccrued)}</td>
        <td>${formatMoney(cumulative)}</td>
      `;
      tbody.appendChild(tr);
    }
  }

  // Helper to format date for date input (YYYY-MM-DD)
  function formatDateOnly(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Helper to convert date value to smalldatetime format with default times
  function dateToSmallDateTime(dateValue, isEndDate = false) {
    if (!dateValue) return '';
    const time = isEndDate ? '23:59:59' : '00:00:00';
    return `${dateValue} ${time}`;
  }

  // Validate date format
  function isValidDate(value) {
    if (!value) return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  // Calculate dates based on selected statement type
  function calculateDates(statementType) {
    const today = new Date();
    const fromDateEl = $("#LIWFromDate");
    const toDateEl = $("#LIWToDate");
    if (!fromDateEl || !toDateEl) return;
    let fromDate, toDate;
    if (statementType === 'CM') {
      fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
      toDate = today;
      fromDateEl.value = formatDateOnly(fromDate);
      toDateEl.value = formatDateOnly(toDate);
      fromDateEl.setAttribute('readonly', 'readonly');
      toDateEl.setAttribute('readonly', 'readonly');
    } else if (statementType === 'LM') {
      fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      toDate = today;
      fromDateEl.value = formatDateOnly(fromDate);
      toDateEl.value = formatDateOnly(toDate);
      fromDateEl.setAttribute('readonly', 'readonly');
      toDateEl.setAttribute('readonly', 'readonly');
    } else if (statementType === 'DR') {
      fromDateEl.value = '';
      toDateEl.value = '';
      fromDateEl.removeAttribute('readonly');
      toDateEl.removeAttribute('readonly');
    } else {
      fromDateEl.value = '';
      toDateEl.value = '';
      fromDateEl.setAttribute('readonly', 'readonly');
      toDateEl.setAttribute('readonly', 'readonly');
    }
  }

  async function loadWorksheet() {
    console.log('[LoanInterestWorksheet] loadWorksheet called');
    const statementType = $("#StatementFor")?.value?.trim?.();
    const fromDateValue = $("#LIWFromDate")?.value?.trim?.();
    const toDateValue = $("#LIWToDate")?.value?.trim?.();
    const OurBranchID = getParentFieldValue('BranchID');
    const AccountID = getParentFieldValue('AccountID');
    const LoanSeries = getParentFieldValue('LoanSeries');

    console.log('[LoanInterestWorksheet] Context:', { statementType, fromDateValue, toDateValue, OurBranchID, AccountID, LoanSeries });

    if (!statementType) {
      console.warn('[LoanInterestWorksheet] No statement type selected');
      alert('Please select a statement type.');
      renderGrid([]);
      return;
    }
    if (!OurBranchID || !AccountID) {
      console.warn('[LoanInterestWorksheet] Missing parent context');
      alert('Branch ID and Account ID are required from the parent form.');
      renderGrid([]);
      return;
    }
    if (!fromDateValue || !toDateValue) {
      alert('From Date and To Date are required.');
      renderGrid([]);
      return;
    }
    // Use input value directly (YYYY-MM-DD from <input type="date">)
    if (!isValidDate(fromDateValue)) {
      alert('Invalid From Date format. Please select a valid date.');
      renderGrid([]);
      return;
    }
    if (!isValidDate(toDateValue)) {
      alert('Invalid To Date format. Please select a valid date.');
      renderGrid([]);
      return;
    }
    const FromDate = dateToSmallDateTime(fromDateValue, false);
    const ToDate = dateToSmallDateTime(toDateValue, true);
    if (!window.LoanInterestWorksheetService) {
      alert('Error: Service not loaded. Please refresh the page.');
      renderGrid([]);
      return;
    }
    try {
      console.log('[LoanInterestWorksheet] Calling service with dates:', { FromDate, ToDate, OurBranchID, AccountID, LoanSeries });
      const resp = await window.LoanInterestWorksheetService.getWorksheet({
        FromDate,
        ToDate,
        OurBranchID,
        AccountID,
        LoanSeries
      });
      
      console.log('[LoanInterestWorksheet] Service response:', resp);
      
      let rows = [];
      // Handle different response formats
      if (Array.isArray(resp)) {
        rows = resp;
      } else if (resp && resp.success) {
        if (Array.isArray(resp.data)) {
          rows = resp.data;
        } else if (Array.isArray(resp.Details)) {
          rows = resp.Details;
        } else if (Array.isArray(resp.Details01)) {
          rows = resp.Details01;
        }
      }
      
      console.log('[LoanInterestWorksheet] Rows to render:', rows);
      renderGrid(rows);
      if (!rows.length) {
        // Optionally show a status message somewhere: 'No Details Found  [No:1011]'
      }
    } catch (error) {
      console.error('[LoanInterestWorksheet] Error:', error);
      alert(`Error: ${error.message || 'Failed to load worksheet. Please try again.'}`);
      renderGrid([]);
    }
  }

  function init() {
    const viewBtn = $("[data-action='view']");
    const printBtn = $("[data-action='print']");
    const reverseBtn = $("[data-action='reverse']");
    const cancelBtn = $("[data-action='cancel']");
    const backBtn = $("[data-action='back']");
    const statementForSelect = $("#StatementFor");
    statementForSelect?.addEventListener('change', (e) => {
      console.log('[LoanInterestWorksheet] Statement For changed to:', e.target.value);
      calculateDates(e.target.value);
      // Reload data with new dates
      setTimeout(loadWorksheet, 100);
    });
    viewBtn?.addEventListener("click", loadWorksheet);
    printBtn?.addEventListener("click", () => {
      try {
        global.print();
      } catch {
        alert("Print is not available in this context.");
      }
    });
    reverseBtn?.addEventListener("click", () => {
      alert("Reverse (prototype) not wired yet.");
    });
    cancelBtn?.addEventListener("click", () => requestClose());
    backBtn?.addEventListener("click", () => requestClose());
    
    // Auto-load worksheet data on initialization
    loadWorksheet();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
