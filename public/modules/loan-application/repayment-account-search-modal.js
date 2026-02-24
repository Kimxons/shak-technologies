/**
 * Repayment Account Search Modal JavaScript
 * Handles repayment account search functionality for Loan Application
 */

(function(global) {
    'use strict';

    // State management
    let repaymentAccountSearchData = [];
    let selectedAccount = null;
    let currentPage = 1;
    let pageSize = 50;
    let totalPages = 1;
    let selectionCallback = null;

    // DOM Elements
    const elements = {
        modal: null,
        repaymentAccountIdSearch: null,
        repaymentAccountNameSearch: null,
        repaymentAccountIdOperator: null,
        repaymentAccountNameOperator: null,
        repaymentAccountSearchBtn: null,
        repaymentAccountClearBtn: null,
        repaymentAccountResultsBody: null,
        repaymentAccountSelectBtn: null,
        repaymentAccountPrevPageBtn: null,
        repaymentAccountNextPageBtn: null,
        repaymentAccountPageInfo: null
    };

    // Initialize modal
    function initRepaymentAccountSearchModal() {
        // Load modal HTML first
        loadModalHTML().then(() => {
            setupDOMElements();
            attachEventListeners();
            console.log('Repayment Account Search Modal initialized');
        });
    }

    // Setup DOM Elements
    function setupDOMElements() {
        elements.modal = document.getElementById('repaymentAccountSearchModal');
        elements.repaymentAccountIdSearch = document.getElementById('repaymentAccountIdSearch');
        elements.repaymentAccountNameSearch = document.getElementById('repaymentAccountNameSearch');
        elements.repaymentAccountIdOperator = document.getElementById('repaymentAccountIdOperator');
        elements.repaymentAccountNameOperator = document.getElementById('repaymentAccountNameOperator');
        elements.repaymentAccountSearchBtn = document.getElementById('repaymentAccountSearchBtn');
        elements.repaymentAccountClearBtn = document.getElementById('repaymentAccountClearBtn');
        elements.repaymentAccountResultsBody = document.getElementById('repaymentAccountResultsBody');
        elements.repaymentAccountSelectBtn = document.getElementById('repaymentAccountSelectBtn');
        elements.repaymentAccountPrevPageBtn = document.getElementById('repaymentAccountPrevPageBtn');
        elements.repaymentAccountNextPageBtn = document.getElementById('repaymentAccountNextPageBtn');
        elements.repaymentAccountPageInfo = document.getElementById('repaymentAccountPageInfo');
    }

    // Attach event listeners
    function attachEventListeners() {
        if (elements.repaymentAccountSearchBtn) {
            elements.repaymentAccountSearchBtn.addEventListener('click', handleRepaymentAccountSearch);
        }

        if (elements.repaymentAccountClearBtn) {
            elements.repaymentAccountClearBtn.addEventListener('click', clearRepaymentAccountSearch);
        }

        if (elements.repaymentAccountSelectBtn) {
            elements.repaymentAccountSelectBtn.addEventListener('click', selectRepaymentAccount);
        }

        if (elements.repaymentAccountPrevPageBtn) {
            elements.repaymentAccountPrevPageBtn.addEventListener('click', () => changePage(-1));
        }

        if (elements.repaymentAccountNextPageBtn) {
            elements.repaymentAccountNextPageBtn.addEventListener('click', () => changePage(1));
        }

        // Enter key to search
        [elements.repaymentAccountIdSearch, elements.repaymentAccountNameSearch].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        handleRepaymentAccountSearch();
                    }
                });
            }
        });
    }

    // Load modal HTML dynamically
    async function loadModalHTML() {
        try {
            let response = await fetch('repayment-account-search-modal.html');
            if (!response.ok) {
                response = await fetch('modules/loan-application/repayment-account-search-modal.html');
            }
            const html = await response.text();
            const container = document.getElementById('repaymentAccountSearchModalContainer');
            if (container) {
                container.innerHTML = html;
            }
        } catch (error) {
            console.error('Error loading repayment account search modal HTML:', error);
        }
    }

    // Open modal
    async function openRepaymentAccountSearchModal(callback) {
        // Make sure modal is initialized
        if (!elements.modal) {
            console.log('Modal not initialized yet, initializing now...');
            await loadModalHTML();
            setupDOMElements();
            attachEventListeners();
        }

        // Reset state first, then set callback
        clearRepaymentAccountSearch();
        selectionCallback = callback;
        console.log('Repayment Account search callback stored:', typeof selectionCallback);

        // Show modal
        const modalInstance = new bootstrap.Modal(elements.modal);
        modalInstance.show();
        
        // Automatically load all accounts when modal opens
        await performRepaymentAccountSearch();
    }

    // Handle repayment account search button click
    async function handleRepaymentAccountSearch() {
        await performRepaymentAccountSearch();
    }
    
    // Perform repayment account search using API
    async function performRepaymentAccountSearch() {
        try {
            // Show loading state
            elements.repaymentAccountResultsBody.innerHTML = `
                <tr>
                    <td colspan="4" class="no-results">
                        <i class="bi bi-hourglass-split"></i>
                        Searching accounts...
                    </td>
                </tr>
            `;

            // Get search criteria
            const accountId = elements.repaymentAccountIdSearch ? elements.repaymentAccountIdSearch.value.trim() : '';
            const accountName = elements.repaymentAccountNameSearch ? elements.repaymentAccountNameSearch.value.trim() : '';
            const accountIdOperator = elements.repaymentAccountIdOperator ? elements.repaymentAccountIdOperator.value : 'like';
            const accountNameOperator = elements.repaymentAccountNameOperator ? elements.repaymentAccountNameOperator.value : 'like';

            // Call API
            const accounts = await window.RepaymentAccountSearchService.searchRepaymentAccounts({
                accountId,
                accountName,
                accountIdOperator,
                accountNameOperator
            });
            
            repaymentAccountSearchData = (accounts || []).map(account => ({
                AccountID: account.AccountID,
                AccountName: account.Name || account.AccountName,
                ProductID: account.ProductID,
                LegacyAccountID: account.LegacyAccountID
            }));

            currentPage = 1;
            totalPages = Math.ceil(repaymentAccountSearchData.length / pageSize);
            selectedAccount = null;
            elements.repaymentAccountSelectBtn.disabled = true;

            displayRepaymentAccountResults();
        } catch (error) {
            console.error('Error searching repayment accounts:', error);
            elements.repaymentAccountResultsBody.innerHTML = `
                <tr>
                    <td colspan="4" class="no-results">
                        <i class="bi bi-exclamation-triangle"></i>
                        Error searching accounts. Please try again.
                    </td>
                </tr>
            `;
        }
    }

    // Display repayment account results with pagination
    function displayRepaymentAccountResults() {
        if (repaymentAccountSearchData.length === 0) {
            elements.repaymentAccountResultsBody.innerHTML = `
                <tr>
                    <td colspan="4" class="no-results">
                        <i class="bi bi-search"></i>
                        No accounts found. Try different search criteria.
                    </td>
                </tr>
            `;
            updatePagination();
            return;
        }

        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, repaymentAccountSearchData.length);
        const pageData = repaymentAccountSearchData.slice(startIndex, endIndex);

        let html = '';
        pageData.forEach((account, index) => {
            const rowNumber = startIndex + index + 1;
            html += `
                <tr data-account-id="${account.AccountID}" data-account-name="${account.AccountName || ''}" data-product-id="${account.ProductID || ''}">
                    <td>${rowNumber}</td>
                    <td>${account.AccountID || ''}</td>
                    <td>${account.AccountName || ''}</td>
                    <td>${account.ProductID || ''}</td>
                </tr>
            `;
        });

        elements.repaymentAccountResultsBody.innerHTML = html;

        // Add click handlers to rows
        const rows = elements.repaymentAccountResultsBody.querySelectorAll('tr');
        rows.forEach(row => {
            row.addEventListener('click', () => {
                // Remove active class from all rows
                rows.forEach(r => r.classList.remove('table-active'));
                // Add active class to clicked row
                row.classList.add('table-active');
                // Store selected account
                selectedAccount = {
                    accountId: row.dataset.accountId,
                    accountName: row.dataset.accountName,
                    productId: row.dataset.productId || ''
                };
                // Enable select button
                elements.repaymentAccountSelectBtn.disabled = false;
            });

            // Double-click to select immediately
            row.addEventListener('dblclick', () => {
                selectedAccount = {
                    accountId: row.dataset.accountId,
                    accountName: row.dataset.accountName,
                    productId: row.dataset.productId || ''
                };
                selectRepaymentAccount();
            });
        });

        updatePagination();
    }

    // Update pagination controls
    function updatePagination() {
        const totalResults = repaymentAccountSearchData.length;
        totalPages = Math.ceil(totalResults / pageSize) || 1;

        elements.repaymentAccountPageInfo.textContent = `Page ${currentPage} of ${totalPages} (${totalResults} results)`;
        elements.repaymentAccountPrevPageBtn.disabled = currentPage <= 1;
        elements.repaymentAccountNextPageBtn.disabled = currentPage >= totalPages;
    }

    // Change page
    function changePage(direction) {
        const newPage = currentPage + direction;
        if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            displayRepaymentAccountResults();
        }
    }

    // Select repayment account and close modal
    function selectRepaymentAccount() {
        if (!selectedAccount) {
            console.warn('No repayment account selected');
            return;
        }

        console.log('Selected repayment account:', selectedAccount);
        console.log('Callback function:', typeof selectionCallback);

        // Call the callback with the selected account
        if (selectionCallback && typeof selectionCallback === 'function') {
            selectionCallback(selectedAccount);
        }

        // Close modal
        closeModal();
    }

    // Clear search
    function clearRepaymentAccountSearch() {
        if (elements.repaymentAccountIdSearch) elements.repaymentAccountIdSearch.value = '';
        if (elements.repaymentAccountNameSearch) elements.repaymentAccountNameSearch.value = '';
        if (elements.repaymentAccountIdOperator) elements.repaymentAccountIdOperator.value = 'like';
        if (elements.repaymentAccountNameOperator) elements.repaymentAccountNameOperator.value = 'like';
        
        repaymentAccountSearchData = [];
        selectedAccount = null;
        currentPage = 1;
        totalPages = 1;

        if (elements.repaymentAccountResultsBody) {
            elements.repaymentAccountResultsBody.innerHTML = `
                <tr>
                    <td colspan="4" class="no-results">
                        <i class="bi bi-search"></i>
                        No results. Click Search to find accounts.
                    </td>
                </tr>
            `;
        }

        if (elements.repaymentAccountSelectBtn) elements.repaymentAccountSelectBtn.disabled = true;
        if (elements.repaymentAccountPageInfo) elements.repaymentAccountPageInfo.textContent = 'Page 1 of 1 (0 results)';
        if (elements.repaymentAccountPrevPageBtn) elements.repaymentAccountPrevPageBtn.disabled = true;
        if (elements.repaymentAccountNextPageBtn) elements.repaymentAccountNextPageBtn.disabled = true;
    }

    // Close modal
    function closeModal() {
        if (elements.modal) {
            const modalInstance = bootstrap.Modal.getInstance(elements.modal);
            if (modalInstance) {
                modalInstance.hide();
            }
        }
    }

    // Expose to global scope
    global.RepaymentAccountSearchModal = {
        init: initRepaymentAccountSearchModal,
        open: openRepaymentAccountSearchModal,
        close: closeModal
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRepaymentAccountSearchModal);
    } else {
        initRepaymentAccountSearchModal();
    }

})(window);
