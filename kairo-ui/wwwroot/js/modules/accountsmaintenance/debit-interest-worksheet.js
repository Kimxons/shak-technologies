/**
 * Debit Interest Worksheet Module - View Submodule
 * Displays debit interest calculation worksheet for the selected account
 * Migrated from: debit-interest-worksheet.js (original project)
 */
window.DebitInterestWorksheetModule = (function () {
    'use strict';

    const state = {
        worksheetData: [],
        recordCount: 0,
        selectedPeriod: '0'
    };

    const API = {
        GET_WORKSHEET: 'AccountsMaintenance/api/get-debit-interest-worksheet'
    };

    /**
     * Get context from global state or storage
     */
    function getContext() {
        const ps = window.AccountMaintenanceState;
        return {
            AccountID: ps?.AccountID || sessionStorage.getItem('currentAccountID') || '',
            OurBranchID: ps?.OurBranchID || sessionStorage.getItem('currentBranchID') || '',
            ClientID: ps?.ClientID || sessionStorage.getItem('currentClientID') || '',
            OperatorID: ps?.OperatorID || sessionStorage.getItem('currentOperatorID') || localStorage.getItem('OperatorID') || 'web_portal'
        };
    }

    // ── UI Helpers ─────────────────────────────────────────────
    const el = (id) => document.getElementById(id);
    const val = (id) => el(id)?.value?.trim() || '';
    const setTxt = (id, v) => { const e = el(id); if (e) e.textContent = (v == null) ? '-' : v; };

    function showLoading(show) {
        const overlay = el('div_loadingOverlay');
        if (overlay) overlay.style.display = show ? 'flex' : 'none';
    }

    function showMessage(msg, type = 'info') {
        const panel = el('div_messagePanel');
        if (panel) {
            panel.className = `message-panel alert alert-${type === 'error' ? 'danger' : type}`;
            panel.textContent = msg;
            panel.style.display = 'block';
            setTimeout(() => panel.style.display = 'none', 5000);
        }
        console.log(`[DebitInterestWorksheet] ${type}: ${msg}`);
    }

    function formatCurrency(value) {
        const num = parseFloat(value) || 0;
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            const day = String(date.getDate()).padStart(2, '0');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[date.getMonth()];
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        } catch {
            return dateStr;
        }
    }

    function formatPercent(value) {
        const num = parseFloat(value) || 0;
        return num.toFixed(4) + '%';
    }

    // ── Wire Event Handlers ────────────────────────────────────
    function wireEvents() {
        // Section toggles
        document.querySelectorAll('.section-toggle-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const section = this.closest('.form-section');
                const content = section?.querySelector('.section-content, [data-section-content]');
                const icon = this.querySelector('i');
                const isExpanded = this.getAttribute('aria-expanded') === 'true';

                if (content) content.hidden = isExpanded;
                this.setAttribute('aria-expanded', !isExpanded);
                if (icon) {
                    icon.classList.toggle('bi-chevron-up');
                    icon.classList.toggle('bi-chevron-down');
                }
            });
        });

        // Period dropdown change
        const periodSelect = el('ddl_periodSelect');
        if (periodSelect) {
            periodSelect.addEventListener('change', function() {
                state.selectedPeriod = this.value;
                updateDateFieldsVisibility();
            });
        }

        // Date picker buttons
        const fromDatePicker = el('btn_fromDatePicker');
        if (fromDatePicker) {
            fromDatePicker.onclick = function(e) { e.preventDefault(); openDatePicker('txt_fromDate'); };
        }

        const toDatePicker = el('btn_toDatePicker');
        if (toDatePicker) {
            toDatePicker.onclick = function(e) { e.preventDefault(); openDatePicker('txt_toDate'); };
        }

        // Select all checkbox
        const selectAll = el('chk_selectAll');
        if (selectAll) {
            selectAll.addEventListener('change', function() {
                const checkboxes = document.querySelectorAll('#tbl_worksheetGrid tbody input[type="checkbox"]');
                checkboxes.forEach(cb => cb.checked = this.checked);
            });
        }
    }

    // ── Update Date Fields Visibility ──────────────────────────
    function updateDateFieldsVisibility() {
        const fromDate = el('txt_fromDate');
        const toDate = el('txt_toDate');
        const fromPicker = el('btn_fromDatePicker');
        const toPicker = el('btn_toDatePicker');

        const showDateRange = state.selectedPeriod === '3'; // Date Range option
        const now = new Date();

        if (fromDate) fromDate.disabled = !showDateRange;
        if (toDate) toDate.disabled = !showDateRange;
        if (fromPicker) fromPicker.disabled = !showDateRange;
        if (toPicker) toPicker.disabled = !showDateRange;

        // Auto-set dates based on period selection
        if (state.selectedPeriod === '1') {
            // Current Month
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            if (fromDate) fromDate.value = formatDate(firstOfMonth);
            if (toDate) toDate.value = formatDate(now);
        } else if (state.selectedPeriod === '2') {
            // Current and Previous Month
            const firstOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            if (fromDate) fromDate.value = formatDate(firstOfPrevMonth);
            if (toDate) toDate.value = formatDate(now);
        } else if (state.selectedPeriod === '0') {
            // Reset dates when "Select Period" is chosen
            if (fromDate) fromDate.value = '';
            if (toDate) toDate.value = '';
        }
    }

    // ── Date Picker ────────────────────────────────────────────
    function openDatePicker(inputId) {
        var input = document.getElementById(inputId);
        if (!input) return;

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
                    input.value = formatDate(d);
                }
            }
            if (document.body.contains(picker)) document.body.removeChild(picker);
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

    // ── Load Worksheet Data ────────────────────────────────────
    async function loadWorksheet() {
        console.log('[DebitInterestWorksheet] Loading worksheet...');
        showLoading(true);

        const ctx = getContext();

        if (!ctx.AccountID || !ctx.OurBranchID) {
            showMessage('No account selected. Please select an account first.', 'warning');
            showLoading(false);
            return;
        }

        try {
            const payload = {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                ClientID: ctx.ClientID,
                FromDate: val('txt_fromDate'),
                ToDate: val('txt_toDate')
            };

            console.log('[DebitInterestWorksheet] Request payload:', payload);

            const result = await AppCore.invokeControllerAsync(API.GET_WORKSHEET, payload);
            console.log('[DebitInterestWorksheet] API Response:', result);

            // Check for explicit error responses
            if (result?.success === false || result?.Status === '091') {
                const errorMsg = result?.Message || result?.message || result?.ResponseMessage || 'Failed to load worksheet';
                showMessage(errorMsg, 'error');
                populateGrid([]);
                return;
            }

            // Extract data from various possible response structures
            const data = result?.Details || result?.Data || result?.data || result || [];
            const rows = Array.isArray(data) ? data : (data.worksheet || data.rows || []);
            
            state.worksheetData = rows;
            state.recordCount = rows.length;
            
            populateGrid(rows);
            setTxt('spn_recordCount', `(${rows.length} records)`);

        } catch (error) {
            console.error('[DebitInterestWorksheet] Error loading worksheet:', error);
            showMessage('Error loading worksheet: ' + error.message, 'error');
            populateGrid([]);
        } finally {
            showLoading(false);
        }
    }

    // ── Populate Grid ──────────────────────────────────────────
    function populateGrid(rows) {
        const tbody = document.querySelector('#tbl_worksheetGrid tbody');
        if (!tbody) {
            console.error('[DebitInterestWorksheet] Grid tbody not found');
            return;
        }

        tbody.innerHTML = '';

        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No worksheet records found.</td></tr>';
            return;
        }

        rows.forEach((row, index) => {
            const tr = document.createElement('tr');
            const balance = parseFloat(row.Balance || 0);
            const rate = parseFloat(row.Rate || row.InterestRate || 0);
            const days = parseInt(row.Days || row.NumberOfDays || 0);
            const interest = parseFloat(row.Interest || row.InterestAmount || 0);
            const excessAmount = parseFloat(row.ExcessAmount || 0);
            const cumulative = parseFloat(row.Cumulative || row.CumulativeInterest || 0);

            tr.innerHTML = `
                <td class="de-table-check"><input type="checkbox" data-index="${index}" /></td>
                <td>${formatDate(row.Date || row.TransactionDate)}</td>
                <td class="text-end">${formatCurrency(balance)}</td>
                <td class="text-end">${formatPercent(rate)}</td>
                <td class="text-end">${days}</td>
                <td class="text-end">${formatCurrency(interest)}</td>
                <td class="text-end">${formatCurrency(excessAmount)}</td>
                <td class="text-end fw-bold">${formatCurrency(cumulative)}</td>
            `;
            
            tr.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
                    tr.classList.add('table-active');
                }
            });
            
            tbody.appendChild(tr);
        });

        console.log('[DebitInterestWorksheet] Grid populated with', rows.length, 'rows');
    }

    // ── Action Handlers (called by parent) ─────────────────────
    function view() {
        loadWorksheet();
    }

    function refresh() {
        loadWorksheet();
    }

    function print() {
        window.print();
    }

    function exportData() {
        if (state.worksheetData.length === 0) {
            showMessage('No data to export', 'warning');
            return;
        }
        console.log('[DebitInterestWorksheet] Export requested');
        showMessage('Export feature will be implemented', 'info');
    }

    // ── Initialize ─────────────────────────────────────────────
    function init() {
        console.log('[DebitInterestWorksheet] Initializing module...');
        wireEvents();
        updateDateFieldsVisibility();
        // Don't auto-load, wait for user to select period and click View
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        init,
        view,
        refresh,
        print,
        exportData,
        loadWorksheet
    };
})();
