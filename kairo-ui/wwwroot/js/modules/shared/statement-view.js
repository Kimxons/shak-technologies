/**
 * Statement View - Modern Account Statement Module
 * Version: 2.0.0 - February 2026
 * Uses app-core.js for API integration instead of accountservice
 */
(function () {
    'use strict';

    console.log('[StatementView] Initializing...');

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // PAGINATION STATE
    var paginationState = {
        allRows: [],
        currentPage: 1,
        pageSize: 25,
        totalPages: 0
    };


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
        const monthIdx = MONTHS.findIndex(function (m) { return m.toLowerCase() === parts[1].toLowerCase(); });
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

    // Statement Debit: red, in brackets
    function formatDebitDisplay(value, isHTML) {
        const num = parseFloat(value);
        if (isNaN(num) || num === 0) return isHTML ? '<span style="color: #666;">-</span>' : '-';
        const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (isHTML) {
            return '<span style="color: #dc2626; font-weight: 600;">(' + formatted + ')</span>';
        }
        return '(' + formatted + ')';
    }

    // Statement Credit: blue
    function formatCreditDisplay(value, isHTML) {
        const num = parseFloat(value);
        if (isNaN(num) || num === 0) return isHTML ? '<span style="color: #666;">-</span>' : '-';
        const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (isHTML) {
            return '<span style="color: #2563eb; font-weight: 600;">' + formatted + '</span>';
        }
        return formatted;
    }

    // Statement Closing/Balance: black
    function formatBalanceDisplay(value, isHTML) {
        const num = parseFloat(value);
        if (isNaN(num) || num === 0) return isHTML ? '<span style="color: #666;">-</span>' : '-';
        const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const display = num < 0 ? '(' + formatted.replace('-', '') + ')' : formatted;
        if (isHTML) {
            return '<span style="color: #000; font-weight: 600;">' + display + '</span>';
        }
        return display;
    }

    // Format date value from API
    function formatDateValue(dateVal) {
        if (!dateVal) return '';
        if (typeof dateVal === 'string' && dateVal.match(/^\d{1,2}-[A-Za-z]{3}-\d{4}$/)) {
            return dateVal;
        }
        try {
            var d = new Date(dateVal);
            if (!isNaN(d.getTime())) {
                return formatDateDisplay(d);
            }
        } catch (e) {
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
            ClientID: (baseState && baseState.ClientID) ? baseState.ClientID : '',
            ModuleID: ''
        };

        // Check for StatementViewState from controller
        if (window.StatementViewState) {
            if (window.StatementViewState.BranchID) merged.OurBranchID = window.StatementViewState.BranchID;
            if (window.StatementViewState.AccountID) merged.AccountID = window.StatementViewState.AccountID;
            if (window.StatementViewState.ModuleID) merged.ModuleID = window.StatementViewState.ModuleID;
        }

        // Optional overrides from querystring
        try {
            var url = new URL(window.location.href);
            var branchId = url.searchParams.get('BranchID') || url.searchParams.get('OurBranchID');
            var accountId = url.searchParams.get('AccountID');
            var operatorId = url.searchParams.get('OperatorID');
            var clientId = url.searchParams.get('ClientID');
            var moduleId = url.searchParams.get('ModuleID');

            if (branchId) merged.OurBranchID = branchId;
            if (accountId) merged.AccountID = accountId;
            if (operatorId) merged.OperatorID = operatorId;
            if (clientId) merged.ClientID = clientId;
            if (moduleId) merged.ModuleID = moduleId;
        } catch (e) {
            // Ignore URL parsing errors
        }

        return merged;
    }

    // UI HELPERS
    function setStatus(text) {
        const statusBar = document.querySelector('.de-status-bar');
        if (statusBar) statusBar.textContent = text;
    }

    function setResponseMessage(message, type) {
        var panel = document.getElementById('dv_statementResponseMessage');
        if (!panel) return;

        panel.classList.remove('d-none', 'alert-danger', 'alert-warning', 'alert-info', 'alert-success');

        if (!message) {
            panel.textContent = '';
            panel.classList.add('d-none');
            return;
        }

        panel.classList.add('alert-' + (type || 'info'));
        panel.textContent = String(message);
    }

    function getResponseMessage(response) {
        if (!response || typeof response !== 'object') return '';

        return response.ResponseMessage ||
            response.responseMessage ||
            response.Message ||
            response.message ||
            response.ErrorMessage ||
            response.errorMessage ||
            '';
    }

    function isResponseSuccess(response) {
        if (!response || typeof response !== 'object') return false;

        if (Object.prototype.hasOwnProperty.call(response, 'ResponseCode')) {
            return String(response.ResponseCode || '').trim() === '00';
        }

        if (response.ok === false) return false;
        if (response.Success === false) return false;
        if (response.success === false) return false;

        return true;
    }

    function extractTransactionRows(response) {
        if (!response) return [];

        if (response.Details && Array.isArray(response.Details.Transactions)) {
            return response.Details.Transactions;
        }

        if (response.details && Array.isArray(response.details.transactions)) {
            return response.details.transactions;
        }

        if (Array.isArray(response.Details)) {
            return response.Details;
        }

        if (Array.isArray(response.Transactions)) {
            return response.Transactions;
        }

        if (Array.isArray(response.Data)) {
            return response.Data;
        }

        if (Array.isArray(response.data)) {
            return response.data;
        }

        if (Array.isArray(response)) {
            return response;
        }

        return [];
    }

    function showError(message) {
        const ddlStatementFor = document.getElementById('ddl_statementFor');
        if (ddlStatementFor) {
            ddlStatementFor.style.borderColor = '#ef4444';
            ddlStatementFor.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';
            setTimeout(function () {
                ddlStatementFor.style.borderColor = '';
                ddlStatementFor.style.boxShadow = '';
            }, 3000);
        }
        setResponseMessage(message, 'danger');
        setStatus(message);
        alert(message);
    }

    // PERIOD CHANGE HANDLER
    function handlePeriodChange() {
        const ddlStatementFor = document.getElementById('ddl_statementFor');
        const txtFromDate = document.getElementById('txt_fromDate');
        const txtToDate = document.getElementById('txt_toDate');
        const btnFromDatePicker = document.getElementById('btn_fromDatePicker');
        const btnToDatePicker = document.getElementById('btn_toDatePicker');

        if (!ddlStatementFor || !txtFromDate || !txtToDate) return;

        const period = ddlStatementFor.value;
        const today = getToday();

        ddlStatementFor.style.borderColor = '';
        ddlStatementFor.style.boxShadow = '';

        switch (period) {
            case '0':
                txtFromDate.value = '';
                txtToDate.value = '';
                txtFromDate.disabled = true;
                txtToDate.disabled = true;
                if (btnFromDatePicker) btnFromDatePicker.disabled = true;
                if (btnToDatePicker) btnToDatePicker.disabled = true;
                break;
            case '1':
                txtFromDate.value = formatDateDisplay(getFirstOfMonth());
                txtToDate.value = formatDateDisplay(today);
                txtFromDate.disabled = true;
                txtToDate.disabled = true;
                if (btnFromDatePicker) btnFromDatePicker.disabled = true;
                if (btnToDatePicker) btnToDatePicker.disabled = true;
                break;
            case '2':
                txtFromDate.value = formatDateDisplay(getFirstOfPreviousMonth());
                txtToDate.value = formatDateDisplay(today);
                txtFromDate.disabled = true;
                txtToDate.disabled = true;
                if (btnFromDatePicker) btnFromDatePicker.disabled = true;
                if (btnToDatePicker) btnToDatePicker.disabled = true;
                break;
            case '3':
                txtFromDate.value = '';
                txtToDate.value = '';
                txtFromDate.disabled = false;
                txtToDate.disabled = false;
                if (btnFromDatePicker) btnFromDatePicker.disabled = false;
                if (btnToDatePicker) btnToDatePicker.disabled = false;
                break;
        }
    }

    // DATE PICKERS
    function wireDatePickers() {
        function pickDate(inputId) {
            var input = document.getElementById(inputId);
            if (!input || input.disabled) return;

            var picker = document.createElement('input');
            picker.type = 'date';
            picker.style.position = 'absolute';
            picker.style.opacity = '0';
            picker.style.pointerEvents = 'none';

            picker.onchange = function () {
                if (picker.value) {
                    var dateParts = picker.value.split('-');
                    if (dateParts.length === 3) {
                        var d = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                        input.value = formatDateDisplay(d);
                    }
                }
                document.body.removeChild(picker);
            };

            picker.onblur = function () {
                setTimeout(function () {
                    if (document.body.contains(picker)) document.body.removeChild(picker);
                }, 100);
            };

            document.body.appendChild(picker);
            if (picker.showPicker) picker.showPicker();
            else picker.click();
        }

        var btnFromDatePicker = document.getElementById('btn_fromDatePicker');
        var btnToDatePicker = document.getElementById('btn_toDatePicker');
        if (btnFromDatePicker) btnFromDatePicker.onclick = function (e) { e.preventDefault(); pickDate('txt_fromDate'); };
        if (btnToDatePicker) btnToDatePicker.onclick = function (e) { e.preventDefault(); pickDate('txt_toDate'); };
    }

    // FETCH STATEMENT
    function fetchStatement() {
        console.log('[StatementView] fetchStatement called');

        var ddlStatementFor = document.getElementById('ddl_statementFor');
        if (!ddlStatementFor || ddlStatementFor.value === '0') {
            showError('Please select a Statement Period before viewing.');
            return;
        }

        var state = getParentState();
        console.log('[StatementView] Parent state:', state);

        var txtFromDate = document.getElementById('txt_fromDate');
        var txtToDate = document.getElementById('txt_toDate');
        var fromDateObj = parseDateDisplay(txtFromDate.value);
        var toDateObj = parseDateDisplay(txtToDate.value);

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
        setResponseMessage('');
        setStatus('Loading...');

        // Use app-core.js to invoke controller
        if (window.AppCore && typeof window.AppCore.invokeControllerAsync === 'function') {
            console.log('[StatementView] Using AppCore.invokeControllerAsync');
            window.AppCore.invokeControllerAsync('Statement/get-transactions', requestData)
                .then(function (response) {
                    console.log('[StatementView] Transaction response:', response);

                    var responseMessage = getResponseMessage(response);
                    if (!isResponseSuccess(response)) {
                        var errorMessage = responseMessage || 'Failed to fetch transactions';
                        setResponseMessage(errorMessage, 'danger');
                        setStatus(errorMessage);
                        populateGrid([]);
                        return;
                    }

                    var rows = extractTransactionRows(response);

                    if (!rows || rows.length === 0) {
                        if (responseMessage && responseMessage.toLowerCase() !== 'success') {
                            setResponseMessage(responseMessage, 'warning');
                        } else {
                            setResponseMessage('No transactions found for the selected period.', 'info');
                        }
                    } else {
                        setResponseMessage('');
                    }

                    populateGrid(rows);
                    setStatus('Ready - ' + rows.length + ' transactions loaded');
                })
                .catch(function (err) {
                    console.error('[StatementView] Error:', err);
                    showError('Error loading transactions: ' + (err.message || err));
                    setStatus('Error');
                });
        } else {
            console.error('[StatementView] AppCore not available');
            showError('AppCore is not loaded. Please refresh the page.');
            setStatus('Error');
        }
    }

    // POPULATE GRID
    function populateGrid(rows) {
            // Store all rows for pagination
            paginationState.allRows = rows || [];
            paginationState.currentPage = 1;
            paginationState.totalPages = paginationState.pageSize === 'all' ? 1 : Math.ceil((rows || []).length / paginationState.pageSize);
        
        var tbody = document.querySelector('#tbl_statementGrid tbody');
        var spnRecordCount = document.getElementById('spn_recordCount');

        if (!tbody) {
            console.error('[StatementView] tbody not found');
            return;
        }

                    tbody.innerHTML = '';
        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr class="sv-empty-row"><td colspan="9" style="text-align:center;padding:40px;color:#64748b;">No transactions found for the selected period.</td></tr>';
            if (spnRecordCount) spnRecordCount.textContent = '(0 records)';
            console.log('[StatementView] No rows to display');
                        var paginationContainer = document.getElementById('dv_statementPagination');
                        if (paginationContainer) paginationContainer.style.display = 'none';
            return;
        }

        console.log('[StatementView] Populating', rows.length, 'rows');
        
        // Show pagination controls
        var paginationContainer = document.getElementById('dv_statementPagination');
        if (paginationContainer) paginationContainer.style.display = 'flex';
        
        if (spnRecordCount) spnRecordCount.textContent = '(' + rows.length + ' records)';
        
        // Render first page
        renderCurrentPage();
        updatePaginationControls();
        
        console.log('[StatementView] Grid populated with', rows.length, 'rows');
    }

    // PAGINATION HELPER FUNCTIONS
    function getCurrentPageRows() {
        if (!paginationState.allRows || paginationState.allRows.length === 0) return [];
        
        if (paginationState.pageSize === 'all') {
            return paginationState.allRows;
        }
        
        var startIdx = (paginationState.currentPage - 1) * paginationState.pageSize;
        var endIdx = startIdx + paginationState.pageSize;
        return paginationState.allRows.slice(startIdx, endIdx);
    }

    function renderCurrentPage() {
        var rows = getCurrentPageRows();
        var tbody = document.querySelector('#tbl_statementGrid tbody');
        
        if (!tbody) return;
        
        tbody.innerHTML = '';

        rows.forEach(function (row, idx) {
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

            var isBalanceRow = (particulars && (
                particulars.toLowerCase().includes('opening balance') ||
                particulars.toLowerCase().includes('closing balance')
            ));

            var batchID = row.trxBatchID || row.BatchID || '';
            var rowID = row.RowID || row.TrxRowID || row.TransRowID || '';

            tr.innerHTML =
                '<td><input type="checkbox" /></td>' +
                '<td style="display:none;">' + batchID + '</td>' +
                '<td>' + (dateVal || '-') + '</td>' +
                '<td>' + (valueDate || '-') + '</td>' +
                '<td>' + (particulars || '-') + '</td>' +
                '<td class="sv-debit" style="text-align:right;">' + formatDebitDisplay(debit, true) + '</td>' +
                '<td class="sv-credit" style="text-align:right;">' + formatCreditDisplay(credit, true) + '</td>' +
                '<td class="sv-balance" style="text-align:right;">' + formatBalanceDisplay(balance, true) + '</td>' +
                '<td style="display:none;">' + rowID + '</td>';

            if (!isBalanceRow) {
                tr.style.cursor = 'pointer';
                tr.addEventListener('dblclick', handleRowDoubleClick);
            }

            tbody.appendChild(tr);
        });
    }

    function updatePaginationControls() {
        var totalRecords = paginationState.allRows.length;
        var pageSize = paginationState.pageSize === 'all' ? totalRecords : paginationState.pageSize;
        var startRecord = totalRecords === 0 ? 0 : (paginationState.currentPage - 1) * pageSize + 1;
        var endRecord = paginationState.pageSize === 'all' ? totalRecords : Math.min(paginationState.currentPage * pageSize, totalRecords);

        var spnPaginationInfo = document.getElementById('spn_paginationInfo');
        if (spnPaginationInfo) {
            spnPaginationInfo.textContent = 'Showing ' + startRecord + ' - ' + endRecord + ' of ' + totalRecords;
        }

        var btnFirstPage = document.getElementById('btn_firstPage');
        var btnPrevPage = document.getElementById('btn_prevPage');
        var btnNextPage = document.getElementById('btn_nextPage');
        var btnLastPage = document.getElementById('btn_lastPage');

        if (btnFirstPage) btnFirstPage.disabled = paginationState.currentPage === 1;
        if (btnPrevPage) btnPrevPage.disabled = paginationState.currentPage === 1;
        if (btnNextPage) btnNextPage.disabled = paginationState.currentPage >= paginationState.totalPages;
        if (btnLastPage) btnLastPage.disabled = paginationState.currentPage >= paginationState.totalPages;

        renderPageNumbers();
    }

    function renderPageNumbers() {
        var container = document.getElementById('dv_pageNumbers');
        if (!container) return;

        container.innerHTML = '';

        if (paginationState.totalPages <= 1) return;

        var maxButtons = 7;
        var startPage = Math.max(1, paginationState.currentPage - Math.floor(maxButtons / 2));
        var endPage = Math.min(paginationState.totalPages, startPage + maxButtons - 1);

        if (endPage - startPage + 1 < maxButtons) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        if (startPage > 1) {
            addPageButton(container, 1);
            if (startPage > 2) {
                addEllipsis(container);
            }
        }

        for (var i = startPage; i <= endPage; i++) {
            addPageButton(container, i);
        }

        if (endPage < paginationState.totalPages) {
            if (endPage < paginationState.totalPages - 1) {
                addEllipsis(container);
            }
            addPageButton(container, paginationState.totalPages);
        }
    }

    function addPageButton(container, pageNum) {
        var btn = document.createElement('div');
        btn.className = 'sv-page-number' + (pageNum === paginationState.currentPage ? ' active' : '');
        btn.textContent = pageNum;
        btn.onclick = function () {
            goToPage(pageNum);
        };
        container.appendChild(btn);
    }

    function addEllipsis(container) {
        var ellipsis = document.createElement('div');
        ellipsis.className = 'sv-page-number ellipsis';
        ellipsis.textContent = '...';
        container.appendChild(ellipsis);
    }

    function goToPage(pageNum) {
        if (pageNum < 1 || pageNum > paginationState.totalPages) return;
        paginationState.currentPage = pageNum;
        renderCurrentPage();
        updatePaginationControls();
    }

    function changePageSize(newSize) {
        paginationState.pageSize = newSize === 'all' ? 'all' : parseInt(newSize, 10);
        paginationState.currentPage = 1;
        paginationState.totalPages = paginationState.pageSize === 'all' ? 1 : Math.ceil(paginationState.allRows.length / paginationState.pageSize);
        renderCurrentPage();
        updatePaginationControls();
    }

    // HANDLE ROW DOUBLE-CLICK
    function handleRowDoubleClick(event) {
        var tr = event.currentTarget;
        console.log('[StatementView] Row double-clicked');

        var state = getParentState();

        var batchID = tr.cells[1] ? tr.cells[1].textContent.trim() : '';
        var trxDateDisplay = tr.cells[2] ? tr.cells[2].textContent.trim() : '';
        var trxRowID = tr.cells[8] ? tr.cells[8].textContent.trim() : '';

        var trxDate = '';
        if (trxDateDisplay) {
            var dateObj = parseDateDisplay(trxDateDisplay);
            if (dateObj) trxDate = formatDateApi(dateObj);
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
        setStatus('Loading batch details...');

        if (!window.AppCore || typeof window.AppCore.invokeControllerAsync !== 'function') {
            showError('AppCore service is not available.');
            return;
        }

        window.AppCore.invokeControllerAsync('Statement/get-batch-details', requestData)
            .then(function (response) {
                console.log('[StatementView] Batch details response:', response);

                var responseMessage = getResponseMessage(response);
                if (!isResponseSuccess(response)) {
                    showError(responseMessage || 'Failed to fetch batch details');
                    return;
                }

                var details = [];
                if (response && response.Details && Array.isArray(response.Details.Transactions)) {
                    details = response.Details.Transactions;
                } else if (Array.isArray(response.Details)) {
                    details = response.Details;
                } else if (Array.isArray(response.Data)) {
                    details = response.Data;
                } else if (Array.isArray(response)) {
                    details = response;
                }

                displayBatchDetailsModal(details, requestData.BatchID);
                setStatus('Ready');
            })
            .catch(function (err) {
                console.error('[StatementView] Error fetching batch details:', err);
                showError('Error loading batch transaction details: ' + (err.message || err));
                setStatus('Error');
            });
    }

    // DISPLAY BATCH DETAILS IN MODAL
    function displayBatchDetailsModal(details, batchID) {
        var modalHTML = `
    <div class="modal fade show" id="mdl_batchDetails" tabindex="-1" style="display: block; background: rgba(0,0,0,0.5);">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width: 95vw; width: 95vw;">
   <div class="modal-content" style="height: 85vh; display: flex; flex-direction: column;">
         <div class="modal-header" style="background: linear-gradient(135deg, #4a7c95 0%, #3d6a80 100%); color: white; flex-shrink: 0;">
            <h5 class="modal-title"><i class="bi bi-list-ul me-2"></i>Batch Transaction Details - ${batchID}</h5>
      <button type="button" class="btn-close btn-close-white" onclick="document.getElementById('mdl_batchDetails').remove()"></button>
          </div>
           <div class="modal-body" style="padding: 20px; overflow-y: auto; flex-grow: 1;">
       ${details.length === 0 ? '<p class="text-center text-muted">No transaction details found.</p>' : generateBatchDetailsTable(details)}
        </div>
 <div class="modal-footer" style="flex-shrink: 0; border-top: 1px solid #dee2e6;">
 <button type="button" class="btn btn-secondary" onclick="document.getElementById('mdl_batchDetails').remove()">Close</button>
        </div>
         </div>
                </div>
  </div>
`;

        var existingModal = document.getElementById('mdl_batchDetails');
        if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
        console.log('[StatementView] Batch details modal displayed with', details.length, 'records');
    }

    // GENERATE BATCH DETAILS TABLE
    function generateBatchDetailsTable(details) {
 if (!details || details.length === 0) {
        return '<p class="text-center text-muted">No details available.</p>';
 }

        var keys = Object.keys(details[0]);

        var html = `
            <div class="table-responsive">
    <table class="table table-sm table-hover table-bordered" id="tbl_batchDetails">
       <thead class="table-light" style="position: sticky; top: 0; background: #f8f9fa; z-index: 10;">
   <tr>`;

        keys.forEach(function (key) {
            var displayKey = key.replace(/([A-Z])/g, ' $1').trim();
            html += `<th style="white-space: nowrap; padding: 10px;">${displayKey}</th>`;
        });

        html += `</tr></thead><tbody>`;

   details.forEach(function (row) {
      html += '<tr>';
 keys.forEach(function (key) {
          var val = row[key];
                if (val === null || val === undefined) val = '';
    html += '<td style="padding: 8px;">' + String(val).substring(0, 100) + '</td>';
            });
  html += '</tr>';
        });

        html += '</tbody></table></div>';

    return html;
    }

    // EXPORT TO EXCEL
    function exportToExcel() {
  var tbody = document.querySelector('#tbl_statementGrid tbody');
var rows = tbody ? tbody.querySelectorAll('tr:not(.sv-empty-row)') : [];

        if (!rows || rows.length === 0) {
    alert('No statement data to export. Please load a statement first.');
            return;
        }

  var state = getParentState();
    var txtFromDate = document.getElementById('txt_fromDate');
        var txtToDate = document.getElementById('txt_toDate');

        var headers = ['Date', 'Value Date', 'Particulars', 'Debit', 'Credit', 'Balance'];
        var csvRows = [headers.join(',')];

        for (var i = 0; i < rows.length; i++) {
          var cells = rows[i].querySelectorAll('td');
   var row = [
      (cells[2] ? '"' + (cells[2].textContent.trim() || '').replace(/"/g, '""') + '"' : ''),
      (cells[3] ? '"' + (cells[3].textContent.trim() || '').replace(/"/g, '""') + '"' : ''),
        (cells[4] ? '"' + (cells[4].textContent.trim() || '').replace(/"/g, '""') + '"' : ''),
                (cells[5] ? '"' + (cells[5].textContent.trim() || '').replace(/"/g, '""') + '"' : ''),
    (cells[6] ? '"' + (cells[6].textContent.trim() || '').replace(/"/g, '""') + '"' : ''),
                (cells[7] ? '"' + (cells[7].textContent.trim() || '').replace(/"/g, '""') + '"' : '')
      ];
          csvRows.push(row.join(','));
        }

        var csv = '\uFEFF' + csvRows.join('\r\n');
        var blob = new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'AccountStatement_' + (state.AccountID || 'Statement') + '_' + (txtFromDate.value || '').replace(/-/g, '') + '_to_' + (txtToDate.value || '').replace(/-/g, '') + '.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
   URL.revokeObjectURL(link.href);
  }

    // EXPORT TO PDF
    function exportToPdf() {
        var tbody = document.querySelector('#tbl_statementGrid tbody');
        var rows = tbody ? tbody.querySelectorAll('tr:not(.sv-empty-row)') : [];

        if (!rows || rows.length === 0) {
         alert('No statement data to export. Please load a statement first.');
            return;
        }

        var JsPDF = (typeof window !== 'undefined' && window.jspdf && window.jspdf.jsPDF) || (typeof jspdf !== 'undefined' && jspdf.jsPDF);
  if (!JsPDF) {
       alert('PDF library not loaded. Please refresh the page and try again.');
     return;
        }

     var state = getParentState();
     var txtFromDate = document.getElementById('txt_fromDate');
        var txtToDate = document.getElementById('txt_toDate');

        var headers = [['Date', 'Value Date', 'Particulars', 'Debit', 'Credit', 'Balance']];
        var tableData = [];

  for (var i = 0; i < rows.length; i++) {
var cells = rows[i].querySelectorAll('td');
         tableData.push([
   (cells[2] ? cells[2].textContent.trim() : ''),
     (cells[3] ? cells[3].textContent.trim() : ''),
              (cells[4] ? cells[4].textContent.trim() : ''),
     (cells[5] ? cells[5].textContent.trim() : ''),
           (cells[6] ? cells[6].textContent.trim() : ''),
            (cells[7] ? cells[7].textContent.trim() : '')
]);
    }

        var doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(18);
        doc.setTextColor(74, 124, 149);
        doc.text('ACCOUNT STATEMENT', 14, 15);
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('Branch: ' + (state.OurBranchID || '-') + '  |  Account: ' + (state.AccountID || '-') + '  |  Period: ' + (txtFromDate.value || '') + ' to ' + (txtToDate.value || ''), 14, 22);
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
     doc.autoTable({
       head: headers,
            body: tableData,
        startY: 28,
     theme: 'grid',
            headStyles: { fillColor: [74, 124, 149], textColor: 255, fontStyle: 'bold' },
            columnStyles: {
        0: { cellWidth: 30 },
           1: { cellWidth: 30 },
      2: { cellWidth: 'auto' },
         3: { cellWidth: 35, halign: 'right' },
         4: { cellWidth: 35, halign: 'right' },
        5: { cellWidth: 35, halign: 'right' }
 }
        });

    doc.setFontSize(8);
     doc.setTextColor(100, 116, 139);
        doc.text('Computer generated statement', 14, doc.internal.pageSize.height - 10);

        var pdfBlob = doc.output('blob');
        var url = URL.createObjectURL(pdfBlob);
    var filename = 'AccountStatement_' + (state.AccountID || 'Statement') + '_' + (txtFromDate.value || '').replace(/-/g, '') + '_to_' + (txtToDate.value || '').replace(/-/g, '') + '.pdf';
        var link = document.createElement('a');
        link.href = url;
        link.download = filename;
    document.body.appendChild(link);
        link.click();
     document.body.removeChild(link);
        window.open(url, '_blank');
     setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    // PRINT STATEMENT
    function printStatement() {
        var tbody = document.querySelector('#tbl_statementGrid tbody');
        var rows = tbody ? tbody.querySelectorAll('tr:not(.sv-empty-row)') : [];

        if (!rows || rows.length === 0) {
            alert('No statement data to print. Please load a statement first.');
            return;
        }

        var state = getParentState();
      var txtFromDate = document.getElementById('txt_fromDate');
  var txtToDate = document.getElementById('txt_toDate');

   var rowsHtml = '';
        for (var i = 0; i < rows.length; i++) {
            var cells = rows[i].querySelectorAll('td');
       rowsHtml += '<tr>' +
     '<td>' + (cells[2] ? cells[2].textContent.trim() : '') + '</td>' +
       '<td>' + (cells[3] ? cells[3].textContent.trim() : '') + '</td>' +
     '<td>' + (cells[4] ? cells[4].textContent.trim() : '') + '</td>' +
                '<td class="right debit">' + (cells[5] ? cells[5].textContent.trim() : '') + '</td>' +
    '<td class="right credit">' + (cells[6] ? cells[6].textContent.trim() : '') + '</td>' +
             '<td class="right balance">' + (cells[7] ? cells[7].textContent.trim() : '') + '</td></tr>';
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
  '.credit { color: #2563eb; font-weight: 600; }' +
            '.balance { color: #000; font-weight: 600; }' +
         'tr:nth-child(even) { background: #f8fafc; }' +
            '.footer { margin-top: 20px; text-align: center; font-size: 10px; color: #64748b; }' +
   '@media print { th { background: #4a7c95 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }' +
 '</style></head><body>' +
     '<div class="header"><h1>ACCOUNT STATEMENT</h1><div>' + (window.GlobalUtils?.formatDate ? window.GlobalUtils.formatDate(new Date()) : new Date().toLocaleDateString()) + '</div></div>' +
   '<div class="info">' +
          '<span><strong>Branch:</strong> ' + (state.OurBranchID || '-') + '</span>' +
            '<span><strong>Account:</strong> ' + (state.AccountID || '-') + '</span>' +
      '<span><strong>Period:</strong> ' + (txtFromDate.value || '') + ' to ' + (txtToDate.value || '') + '</span>' +
'</div>' +
            '<table><thead><tr><th>Date</th><th>Value Date</th><th>Particulars</th><th class="right">Debit</th><th class="right">Credit</th><th class="right">Balance</th></tr></thead>' +
            '<tbody>' + rowsHtml + '</tbody></table>' +
 '<div class="footer">Computer generated statement</div>' +
   '</body></html>';

        var printWindow = window.open('', '_blank', 'width=900,height=700');
        if (printWindow) {
            printWindow.document.write(printHtml);
            printWindow.document.close();
     printWindow.print();
   }
    }

  // RESET FORM
    function resetForm() {
   var ddlStatementFor = document.getElementById('ddl_statementFor');
    var txtFromDate = document.getElementById('txt_fromDate');
  var txtToDate = document.getElementById('txt_toDate');

        if (ddlStatementFor) ddlStatementFor.value = '0';

      if (txtFromDate) txtFromDate.value = '';
        if (txtToDate) txtToDate.value = '';

        handlePeriodChange();
     populateGrid([]);
        setStatus('Ready');
  console.log('[StatementView] Form reset');
    }

    // WIRE ACTIONS
    function wireActions() {
        var btnView = document.getElementById('btn_view');
        var btnPrint = document.getElementById('btn_print');
        var btnRefresh = document.getElementById('btn_refresh');
        var btnClose = document.getElementById('btn_close');
      var ddlStatementFor = document.getElementById('ddl_statementFor');
        var btnHeaderRefresh = document.getElementById('btn_headerRefresh');
        var btnHeaderMaximize = document.getElementById('btn_headerMaximize');
        var btnHeaderClose = document.getElementById('btn_headerClose');
    var ddlPageSize = document.getElementById('ddl_pageSize');
    var btnFirstPage = document.getElementById('btn_firstPage');
    var btnPrevPage = document.getElementById('btn_prevPage');
    var btnNextPage = document.getElementById('btn_nextPage');
    var btnLastPage = document.getElementById('btn_lastPage');

        console.log('[StatementView] Wiring actions...');

        if (btnView) {
       btnView.addEventListener('click', function (e) {
    e.preventDefault();
            fetchStatement();
   });
        }

        if (btnPrint) {
            btnPrint.addEventListener('click', function (e) {
        e.preventDefault();
 printStatement();
});
   }

        // Pagination event handlers
        if (ddlPageSize && !ddlPageSize.dataset.paginationBound) {
            ddlPageSize.addEventListener('change', function () {
                changePageSize(this.value);
            });
            ddlPageSize.dataset.paginationBound = 'true';
        }

        if (btnFirstPage && !btnFirstPage.dataset.paginationBound) {
            btnFirstPage.addEventListener('click', function () {
                goToPage(1);
            });
            btnFirstPage.dataset.paginationBound = 'true';
        }

        if (btnPrevPage && !btnPrevPage.dataset.paginationBound) {
            btnPrevPage.addEventListener('click', function () {
                goToPage(paginationState.currentPage - 1);
            });
            btnPrevPage.dataset.paginationBound = 'true';
        }

        if (btnNextPage && !btnNextPage.dataset.paginationBound) {
            btnNextPage.addEventListener('click', function () {
                goToPage(paginationState.currentPage + 1);
            });
            btnNextPage.dataset.paginationBound = 'true';
        }

        if (btnLastPage && !btnLastPage.dataset.paginationBound) {
            btnLastPage.addEventListener('click', function () {
                goToPage(paginationState.totalPages);
            });
            btnLastPage.dataset.paginationBound = 'true';
        }

        var btnExportExcel = document.getElementById('btn_exportExcel');
        var btnExportPdf = document.getElementById('btn_exportPdf');

        if (btnExportExcel) {
       btnExportExcel.addEventListener('click', function (e) {
          e.preventDefault();
 exportToExcel();
            });
        }

        if (btnExportPdf) {
        btnExportPdf.addEventListener('click', function (e) {
                e.preventDefault();
         exportToPdf();
         });
        }

    // Export popover toggle
 (function wireExportPopover() {
       var exportBtn = document.getElementById('btn_print');
            var popover = document.getElementById('dv_exportPopover');

          if (!exportBtn || !popover) return;

 exportBtn.addEventListener('click', function (e) {
     e.stopPropagation();
          var rect = exportBtn.getBoundingClientRect();
     popover.style.right = 'auto';
    popover.style.left = (rect.left - 150) + 'px';
    popover.style.top = (rect.top + rect.height + 8) + 'px';
       popover.classList.toggle('is-visible');
  });

            document.addEventListener('click', function (e) {
                if (!exportBtn.contains(e.target) && !popover.contains(e.target)) {
     popover.classList.remove('is-visible');
    }
     });
        })();

        if (btnClose) {
         btnClose.addEventListener('click', function (e) {
e.preventDefault();
     if (window.parent && window.parent !== window) {
            window.parent.postMessage({ action: 'submoduleClosed' }, '*');
      } else {
        window.location.href = '/';
    }
            });
        }

        if (btnRefresh) {
            btnRefresh.addEventListener('click', function (e) {
           e.preventDefault();
     resetForm();
      });
        }

        if (btnHeaderRefresh) {
      btnHeaderRefresh.addEventListener('click', function (e) {
 e.preventDefault();
                location.reload();
            });
        }

        if (btnHeaderMaximize) {
            btnHeaderMaximize.addEventListener('click', function (e) {
        e.preventDefault();
  var windowEl = document.querySelector('.window');
 if (windowEl) {
               windowEl.classList.toggle('maximized');
   if (window.parent && window.parent !== window) {
         window.parent.postMessage({ action: 'toggleSidebarForMaximize', isMaximized: windowEl.classList.contains('maximized') }, '*');
        }
  }
         });
   }

        if (btnHeaderClose) {
 btnHeaderClose.addEventListener('click', function (e) {
       e.preventDefault();
     if (window.parent && window.parent !== window) {
    window.parent.postMessage({ action: 'submoduleClosed' }, '*');
        } else {
   window.location.href = '/';
            }
     });
        }

     if (ddlStatementFor) {
      ddlStatementFor.addEventListener('change', handlePeriodChange);
        }
    }

    // INITIALIZATION
    function init() {
   console.log('[StatementView] DOM ready, initializing...');

        var today = getToday();
  var txtFromDate = document.getElementById('txt_fromDate');
     var txtToDate = document.getElementById('txt_toDate');

        if (txtFromDate) txtFromDate.value = formatDateDisplay(getFirstOfMonth());
        if (txtToDate) txtToDate.value = formatDateDisplay(today);

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
