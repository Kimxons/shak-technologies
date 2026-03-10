/**
 * Credit Interest Worksheet Module - View Submodule
 * Displays credit interest calculation worksheet for the selected account
 * Migrated from: credit-interest-worksheet.js (original project)
 */
window.CreditInterestWorksheetModule = (function () {
    'use strict';

    const state = {
        worksheetData: [],
        recordCount: 0,
        selectedPeriod: '0'
    };

    const API = {
        GET_WORKSHEET: 'AccountsMaintenance/api/get-credit-interest-worksheet'
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
        console.log(`[CreditInterestWorksheet] ${type}: ${msg}`);
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

    function formatDateForApi(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${year}-${month}-${day}`;
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
            fromDatePicker.addEventListener('click', () => openDatePicker('txt_fromDate'));
        }

        const toDatePicker = el('btn_toDatePicker');
        if (toDatePicker) {
            toDatePicker.addEventListener('click', () => openDatePicker('txt_toDate'));
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

        // Auto-set dates based on period
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
        }
    }

    // ── Date Picker ────────────────────────────────────────────
    function openDatePicker(inputId) {
        const input = el(inputId);
        if (input) {
            const dateInput = document.createElement('input');
            dateInput.type = 'date';
            dateInput.style.position = 'absolute';
            dateInput.style.opacity = '0';
            document.body.appendChild(dateInput);
            
            dateInput.addEventListener('change', function() {
                if (this.value) {
                    const date = new Date(this.value);
                    input.value = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                }
                document.body.removeChild(dateInput);
            });
            
            dateInput.click();
        }
    }

    // ── Parse Date from Display Format ─────────────────────────
    function parseDateFromDisplay(displayDate) {
        if (!displayDate) return null;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const parts = displayDate.split('-');
        if (parts.length !== 3) return null;
        const day = parseInt(parts[0], 10);
        const monthIdx = months.findIndex(m => m.toLowerCase() === parts[1].toLowerCase());
        const year = parseInt(parts[2], 10);
        if (isNaN(day) || monthIdx === -1 || isNaN(year)) return null;
        return new Date(year, monthIdx, day);
    }

    // ── Load Worksheet Data ────────────────────────────────────
    async function loadWorksheet() {
        console.log('[CreditInterestWorksheet] Loading worksheet...');

        if (state.selectedPeriod === '0') {
            showMessage('Please select a period before viewing.', 'warning');
            return;
        }

        showLoading(true);

        const ctx = getContext();
        const fromDateDisplay = val('txt_fromDate');
        const toDateDisplay = val('txt_toDate');

        const fromDateObj = parseDateFromDisplay(fromDateDisplay);
        const toDateObj = parseDateFromDisplay(toDateDisplay);

        if (!ctx.AccountID || !ctx.OurBranchID) {
            showMessage('No account selected. Please select an account first.', 'warning');
            showLoading(false);
            return;
        }

        if (!fromDateObj || !toDateObj) {
            showMessage('Invalid date format. Please use dd-mmm-yyyy.', 'warning');
            showLoading(false);
            return;
        }

        try {
            const payload = {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                ClientID: ctx.ClientID,
                FromDate: formatDateForApi(fromDateObj),
                ToDate: formatDateForApi(toDateObj)
            };

            console.log('[CreditInterestWorksheet] Request payload:', payload);

            const result = await AppCore.invokeControllerAsync(API.GET_WORKSHEET, payload);
            console.log('[CreditInterestWorksheet] API Response:', result);

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
            console.error('[CreditInterestWorksheet] Error loading worksheet:', error);
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
            console.error('[CreditInterestWorksheet] Grid tbody not found');
            return;
        }

        tbody.innerHTML = '';

        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No worksheet records found.</td></tr>';
            return;
        }

        rows.forEach((row, index) => {
            const tr = document.createElement('tr');
            const balance = parseFloat(row.Balance || 0);
            const interest = parseFloat(row.Interest || row.InterestAmount || 0);
            const excessAmount = parseFloat(row.ExcessAmount || 0);
            const cumulative = parseFloat(row.Cumulative || row.CumulativeInterest || 0);

            tr.innerHTML = `
                <td>${formatDate(row.Date || row.TransactionDate)}</td>
                <td class="text-end">${formatCurrency(balance)}</td>
                <td class="text-end">${formatCurrency(interest)}</td>
                <td class="text-end">${formatCurrency(excessAmount)}</td>
                <td class="text-end fw-bold">${formatCurrency(cumulative)}</td>
            `;
            
            tr.addEventListener('click', () => {
                tbody.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
                tr.classList.add('table-active');
            });
            
            tbody.appendChild(tr);
        });

        console.log('[CreditInterestWorksheet] Grid populated with', rows.length, 'rows');
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
        console.log('[CreditInterestWorksheet] Export requested');
        showMessage('Export feature will be implemented', 'info');
    }

    // ── Initialize ─────────────────────────────────────────────
    function init() {
        console.log('[CreditInterestWorksheet] Initializing module...');
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
