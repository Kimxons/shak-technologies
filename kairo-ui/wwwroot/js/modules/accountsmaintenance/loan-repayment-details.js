/**
 * Loan Repayment Details Module - View Submodule
 * Displays loan repayment schedule for the selected account
 * Migrated from: loan-repayment-details.js (original project)
 */
window.LoanRepaymentDetailsModule = (function () {
    'use strict';

    const state = {
        repaymentData: [],
        recordCount: 0
    };

    const API = {
        GET_REPAYMENT_SCHEDULE: 'AccountsMaintenance/api/get-loan-repayment-schedule'
    };

    /**
     * Get context from global state or storage
     */
    function getContext() {
        const ps = window.AccountMaintenanceState;
        return {
            AccountID: ps?.AccountID || sessionStorage.getItem('currentAccountID') || '',
            OurBranchID: ps?.OurBranchID || sessionStorage.getItem('currentBranchID') || '',
            OperatorID: ps?.OperatorID || sessionStorage.getItem('currentOperatorID') || localStorage.getItem('OperatorID') || 'web_portal'
        };
    }

    // ── UI Helpers ─────────────────────────────────────────────
    const el = (id) => document.getElementById(id);
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
        console.log(`[LoanRepaymentDetails] ${type}: ${msg}`);
    }

    function formatCurrency(value) {
        const num = parseFloat(value) || 0;
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
            return dateStr;
        }
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

        // Select all checkbox
        const selectAll = el('chk_selectAll');
        if (selectAll) {
            selectAll.addEventListener('change', function() {
                const checkboxes = document.querySelectorAll('#tbl_repaymentGrid tbody input[type="checkbox"]');
                checkboxes.forEach(cb => cb.checked = this.checked);
            });
        }
    }

    // ── Load Repayment Schedule ────────────────────────────────
    async function loadRepaymentSchedule() {
        console.log('[LoanRepaymentDetails] Loading repayment schedule...');
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
                OperatorID: ctx.OperatorID
            };

            console.log('[LoanRepaymentDetails] Request payload:', payload);

            const result = await AppCore.invokeControllerAsync(API.GET_REPAYMENT_SCHEDULE, payload);
            console.log('[LoanRepaymentDetails] API Response:', result);

            const isSuccess = result?.ResponseCode === '00' || result?.ResponseCode === 0 || result?.success === true;
            
            if (!isSuccess) {
                const errorMsg = result?.ResponseMessage || result?.message || 'Failed to load repayment schedule';
                showMessage(errorMsg, 'error');
                populateGrid([]);
                return;
            }

            const data = result?.Details || result?.Data || result?.data || [];
            const rows = Array.isArray(data) ? data : (data.schedule || data.rows || []);
            
            state.repaymentData = rows;
            state.recordCount = rows.length;
            
            populateGrid(rows);
            setTxt('spn_recordCount', `(${rows.length} records)`);

        } catch (error) {
            console.error('[LoanRepaymentDetails] Error loading repayment schedule:', error);
            showMessage('Error loading repayment schedule: ' + error.message, 'error');
            populateGrid([]);
        } finally {
            showLoading(false);
        }
    }

    // ── Populate Grid ──────────────────────────────────────────
    function populateGrid(rows) {
        const tbody = document.querySelector('#tbl_repaymentGrid tbody');
        if (!tbody) {
            console.error('[LoanRepaymentDetails] Grid tbody not found');
            return;
        }

        tbody.innerHTML = '';

        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No repayment records found.</td></tr>';
            return;
        }

        rows.forEach((row, index) => {
            const tr = document.createElement('tr');
            const principal = parseFloat(row.Principal || row.PrincipalAmount || 0);
            const interest = parseFloat(row.Interest || row.InterestAmount || 0);
            const totalDue = parseFloat(row.TotalDue || row.Total || (principal + interest));
            const balance = parseFloat(row.Balance || row.OutstandingBalance || 0);

            tr.innerHTML = `
                <td class="de-table-check"><input type="checkbox" data-index="${index}" /></td>
                <td>${formatDate(row.DueDate)}</td>
                <td>${formatDate(row.ValueDate)}</td>
                <td>${row.Particulars || row.Description || '-'}</td>
                <td class="text-end">${formatCurrency(principal)}</td>
                <td class="text-end">${formatCurrency(interest)}</td>
                <td class="text-end fw-bold">${formatCurrency(totalDue)}</td>
                <td class="text-end">${formatCurrency(balance)}</td>
            `;
            
            tr.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
                    tr.classList.add('table-active');
                }
            });
            
            tbody.appendChild(tr);
        });

        console.log('[LoanRepaymentDetails] Grid populated with', rows.length, 'rows');
    }

    // ── Action Handlers (called by parent) ─────────────────────
    function refresh() {
        loadRepaymentSchedule();
    }

    function print() {
        window.print();
    }

    function exportData() {
        if (state.repaymentData.length === 0) {
            showMessage('No data to export', 'warning');
            return;
        }
        console.log('[LoanRepaymentDetails] Export requested');
        showMessage('Export feature will be implemented', 'info');
    }

    // ── Initialize ─────────────────────────────────────────────
    function init() {
        console.log('[LoanRepaymentDetails] Initializing module...');
        wireEvents();
        loadRepaymentSchedule();
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
        refresh,
        print,
        exportData,
        loadRepaymentSchedule
    };
})();
