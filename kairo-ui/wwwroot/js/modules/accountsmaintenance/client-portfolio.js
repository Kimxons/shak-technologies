/**
 * Client Portfolio Module - View Submodule
 * Displays client's account portfolio across branches
 * Migrated from: client-portfolio.js (original project)
 */
window.ClientPortfolioModule = (function () {
    'use strict';

    const state = {
        portfolioData: [],
        recordCount: 0
    };

    const API = {
        GET_PORTFOLIO: 'AccountsMaintenance/api/get-client-portfolio'
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
    const setTxt = (id, v) => { const e = el(id); if (e) e.textContent = (v == null) ? '-' : v; };

    function showLoading(show) {
        const overlay = el('portfolioLoadingOverlay');
        if (overlay) {
            overlay.hidden = !show;
        }
    }

    function showMessage(msg, type = 'info') {
        const panel = el('portfolioMessagePanel');
        if (panel) {
            const icon = panel.querySelector('i');
            const text = panel.querySelector('span');
            
            if (icon) {
                icon.className = type === 'error' ? 'bi bi-exclamation-circle' : 
                                 type === 'warning' ? 'bi bi-exclamation-triangle' : 
                                 'bi bi-info-circle';
            }
            if (text) text.textContent = msg;
            
            panel.classList.remove('alert-danger', 'alert-warning', 'alert-info', 'alert-success');
            panel.classList.add(`alert-${type === 'error' ? 'danger' : type}`);
            panel.hidden = false;
            
            setTimeout(() => { panel.hidden = true; }, 5000);
        }
        console.log(`[ClientPortfolio] ${type}: ${msg}`);
    }

    function formatCurrency(value) {
        const num = parseFloat(value) || 0;
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // ── Wire Event Handlers ────────────────────────────────────
    function wireEvents() {
        // Portfolio type dropdown change
        const portfolioType = el('ddl_portfolioType');
        if (portfolioType) {
            portfolioType.addEventListener('change', loadPortfolio);
        }

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
    }

    // ── Load Portfolio Data ────────────────────────────────────
    async function loadPortfolio() {
        console.log('[ClientPortfolio] Loading portfolio data...');
        showLoading(true);

        const ctx = getContext();
        const portfolioType = el('ddl_portfolioType')?.value || 'A';

        if (!ctx.ClientID) {
            showMessage('No client selected. Please select an account first.', 'warning');
            showLoading(false);
            return;
        }

        try {
            const payload = {
                OurBranchID: ctx.OurBranchID,
                SearchID: ctx.ClientID,
                SearchKey: ctx.ClientID,
                OperatorID: ctx.OperatorID,
                ModuleTypeID: portfolioType
            };

            console.log('[ClientPortfolio] Request payload:', payload);

            const result = await AppCore.invokeControllerAsync(API.GET_PORTFOLIO, payload);
            console.log('[ClientPortfolio] API Response:', result);

            // Check for explicit error responses
            if (result?.success === false || result?.Status === '091') {
                const errorMsg = result?.Message || result?.message || result?.ResponseMessage || 'Failed to load portfolio';
                showMessage(errorMsg, 'error');
                populateGrid([]);
                clearTotals();
                return;
            }

            // Extract data from various possible response structures
            const data = result?.Details || result?.Data || result?.data || result || [];
            const rows = Array.isArray(data) ? data : (data.portfolio || data.rows || []);
            
            state.portfolioData = rows;
            state.recordCount = rows.length;
            
            populateGrid(rows);
            calculateTotals(rows);
            
            setTxt('spn_portfolioRecordCount', `(${rows.length} records)`);

        } catch (error) {
            console.error('[ClientPortfolio] Error loading portfolio:', error);
            showMessage('Error loading portfolio: ' + error.message, 'error');
            populateGrid([]);
            clearTotals();
        } finally {
            showLoading(false);
        }
    }

    // ── Populate Grid ──────────────────────────────────────────
    function populateGrid(rows) {
        const tbody = document.querySelector('#tbl_portfolioGrid tbody');
        if (!tbody) {
            console.error('[ClientPortfolio] Grid tbody not found');
            return;
        }

        tbody.innerHTML = '';

        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No portfolio records found.</td></tr>';
            return;
        }

        rows.forEach((row, index) => {
            const tr = document.createElement('tr');
            const deposit = parseFloat(row.Deposit || row.DepositAmount || 0);
            const advance = parseFloat(row.Advance || row.AdvanceAmount || 0);
            const nonFund = parseFloat(row.NonFundAdvance || row.NonFund || 0);
            const intReceivable = parseFloat(row.InterestReceivable || row.IntReceivable || 0);
            const intPayable = parseFloat(row.InterestPayable || row.IntPayable || 0);

            tr.innerHTML = `
                <td>${row.BranchID || row.OurBranchID || '-'}</td>
                <td>${row.AccountID || row.AccountNo || '-'}</td>
                <td class="text-end text-success">${formatCurrency(deposit)}</td>
                <td class="text-end text-warning">${formatCurrency(advance)}</td>
                <td class="text-end">${formatCurrency(nonFund)}</td>
                <td class="text-end text-danger">${formatCurrency(intReceivable)}</td>
                <td class="text-end text-info">${formatCurrency(intPayable)}</td>
            `;
            
            tr.addEventListener('click', () => {
                tbody.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
                tr.classList.add('table-active');
            });
            
            tbody.appendChild(tr);
        });

        console.log('[ClientPortfolio] Grid populated with', rows.length, 'rows');
    }

    // ── Calculate Totals ───────────────────────────────────────
    function calculateTotals(rows) {
        let totalDeposits = 0, totalAdvances = 0, totalNonFund = 0;
        let totalIntReceivable = 0, totalIntPayable = 0;

        if (rows && rows.length > 0) {
            rows.forEach(row => {
                totalDeposits += parseFloat(row.Deposit || row.DepositAmount || 0);
                totalAdvances += parseFloat(row.Advance || row.AdvanceAmount || 0);
                totalNonFund += parseFloat(row.NonFundAdvance || row.NonFund || 0);
                totalIntReceivable += parseFloat(row.InterestReceivable || row.IntReceivable || 0);
                totalIntPayable += parseFloat(row.InterestPayable || row.IntPayable || 0);
            });
        }

        const netFundsUsed = totalAdvances + totalNonFund - totalDeposits;

        // Update consolidated values fields
        const fields = {
            'txt_totalDeposits': totalDeposits,
            'txt_totalAdvances': totalAdvances,
            'txt_totalNonFund': totalNonFund,
            'txt_totalInterestReceivable': totalIntReceivable,
            'txt_totalInterestPayable': totalIntPayable,
            'txt_netFundsUsed': netFundsUsed
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = el(fieldId);
            if (field) {
                const formatted = formatCurrency(value);
                if (field.tagName === 'INPUT') {
                    field.value = formatted;
                } else {
                    field.textContent = formatted;
                }
            }
        });
    }

    function clearTotals() {
        const fieldIds = ['txt_totalDeposits', 'txt_totalAdvances', 'txt_totalNonFund', 
                         'txt_totalInterestReceivable', 'txt_totalInterestPayable', 'txt_netFundsUsed'];
        fieldIds.forEach(id => {
            const field = el(id);
            if (field) {
                if (field.tagName === 'INPUT') field.value = '0.00';
                else field.textContent = '0.00';
            }
        });
    }

    // ── Action Handlers (called by parent) ─────────────────────
    function refresh() {
        loadPortfolio();
    }

    function print() {
        window.print();
    }

    function exportData() {
        if (state.portfolioData.length === 0) {
            showMessage('No data to export', 'warning');
            return;
        }
        // Export logic can be implemented here
        console.log('[ClientPortfolio] Export requested');
        showMessage('Export feature will be implemented', 'info');
    }

    // ── Initialize ─────────────────────────────────────────────
    function init() {
        console.log('[ClientPortfolio] Initializing module...');
        wireEvents();
        loadPortfolio();
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
        loadPortfolio
    };
})();
