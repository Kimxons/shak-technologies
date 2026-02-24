/**
 * Officer Search Modal JavaScript
 */

(function(global) {
    'use strict';

    // State management
    let officerSearchData = [];
    let selectedOfficer = null;
    let currentPage = 1;
    let pageSize = 50;
    let totalPages = 1;
    let selectionCallback = null;
    let currentBranchId = "0603"; // Default
    let currentMode = 'officer';

    const MODE_CONFIG = {
        officer: {
            titleHtml: '<i class="bi bi-person-badge"></i> Active Officer Search',
            idLabel: 'Officer ID',
            nameLabel: 'Officer Name',
            loadingMessage: 'Searching officers...',
            emptyMessage: 'No officers found.',
            initialMessage: 'Click search to find officers.',
            errorMessage: 'Error searching officers.'
        },
        'sales-officer': {
            titleHtml: '<i class="bi bi-person-badge"></i> Sales Officer Search',
            idLabel: 'Sales Officer ID',
            nameLabel: 'Sales Officer Name',
            loadingMessage: 'Searching sales officers...',
            emptyMessage: 'No sales officers found.',
            initialMessage: 'Click search to find sales officers.',
            errorMessage: 'Error searching sales officers.'
        }
    };

    // DOM Elements
    const elements = {
        modal: null,
        officerIdSearch: null,
        officerNameSearch: null,
        officerIdOperator: null,
        officerNameOperator: null,
        officerSearchBtn: null,
        officerClearBtn: null,
        officerResultsBody: null,
        officerSelectBtn: null,
        officerPrevPageBtn: null,
        officerNextPageBtn: null,
        officerPageInfo: null,
        modalTitle: null,
        officerIdLabel: null,
        officerNameLabel: null
    };

    // Initialize modal
    function initOfficerSearchModal() {
        loadModalHTML().then(() => {
            setupDOMElements();
            attachEventListeners();
            applyModeConfig();
            console.log('Officer Search Modal initialized');
        });
    }

    // Setup DOM Elements
    function setupDOMElements() {
        elements.modal = document.getElementById('officerSearchModal');
        elements.officerIdSearch = document.getElementById('officerIdSearch');
        elements.officerNameSearch = document.getElementById('officerNameSearch');
        elements.officerIdOperator = document.getElementById('officerIdOperator');
        elements.officerNameOperator = document.getElementById('officerNameOperator');
        elements.officerSearchBtn = document.getElementById('officerSearchBtn');
        elements.officerClearBtn = document.getElementById('officerClearBtn');
        elements.officerResultsBody = document.getElementById('officerResultsBody');
        elements.officerSelectBtn = document.getElementById('officerSelectBtn');
        elements.officerPrevPageBtn = document.getElementById('officerPrevPageBtn');
        elements.officerNextPageBtn = document.getElementById('officerNextPageBtn');
        elements.officerPageInfo = document.getElementById('officerPageInfo');
        elements.modalTitle = document.getElementById('officerSearchModalLabel');
        elements.officerIdLabel = elements.officerIdSearch ? elements.officerIdSearch.closest('.search-field')?.querySelector('.search-label') : null;
        elements.officerNameLabel = elements.officerNameSearch ? elements.officerNameSearch.closest('.search-field')?.querySelector('.search-label') : null;
    }

    // Attach event listeners
    function attachEventListeners() {
        if (elements.officerSearchBtn) elements.officerSearchBtn.addEventListener('click', handleOfficerSearch);
        if (elements.officerClearBtn) elements.officerClearBtn.addEventListener('click', clearOfficerSearch);
        if (elements.officerSelectBtn) elements.officerSelectBtn.addEventListener('click', selectOfficer);
        if (elements.officerPrevPageBtn) elements.officerPrevPageBtn.addEventListener('click', () => changePage(-1));
        if (elements.officerNextPageBtn) elements.officerNextPageBtn.addEventListener('click', () => changePage(1));

        [elements.officerIdSearch, elements.officerNameSearch].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') handleOfficerSearch();
                });
            }
        });
    }

    function getModeConfig() {
        return MODE_CONFIG[currentMode] || MODE_CONFIG.officer;
    }

    function applyModeConfig() {
        const config = getModeConfig();
        if (elements.modalTitle) elements.modalTitle.innerHTML = config.titleHtml;
        if (elements.officerIdLabel) elements.officerIdLabel.textContent = config.idLabel;
        if (elements.officerNameLabel) elements.officerNameLabel.textContent = config.nameLabel;
    }

    // Load modal HTML
    async function loadModalHTML() {
        try {
            let response = await fetch('officer-search-modal.html');
            if (!response.ok) {
                response = await fetch('modules/loan-application/officer-search-modal.html');
            }
            const html = await response.text();
            const container = document.getElementById('officerSearchModalContainer');
            if (container) {
                container.innerHTML = html;
            }
        } catch (error) {
            console.error('Error loading officer search modal HTML:', error);
        }
    }

    // Open modal
    async function openOfficerSearchModal(branchId, callback, options = {}) {
        if (!elements.modal) {
            await loadModalHTML();
            setupDOMElements();
            attachEventListeners();
        }

        currentMode = options.mode || 'officer';
        applyModeConfig();
        
        selectionCallback = callback;
        currentBranchId = branchId || "0603";
        
        clearOfficerSearch();
        
        const modal = new bootstrap.Modal(elements.modal);
        modal.show();

        // Perform initial search to show some data immediately (optional)
        handleOfficerSearch(); 
    }

    // Handle Search
    async function handleOfficerSearch() {
        try {
            const config = getModeConfig();
            if (elements.officerSelectBtn) elements.officerSelectBtn.disabled = true;
            if (elements.officerResultsBody) {
                elements.officerResultsBody.innerHTML = `
                    <tr>
                        <td colspan="3" class="text-center">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <div class="mt-2">${config.loadingMessage}</div>
                        </td>
                    </tr>
                `;
            }

            const officerId = elements.officerIdSearch ? elements.officerIdSearch.value.trim() : '';
            const officerName = elements.officerNameSearch ? elements.officerNameSearch.value.trim() : '';
            const officerIdOperator = elements.officerIdOperator ? elements.officerIdOperator.value : 'like';
            const officerNameOperator = elements.officerNameOperator ? elements.officerNameOperator.value : 'like';

            let officers = [];

            if (currentMode === 'sales-officer') {
                if (typeof window.SalesOfficerSearchService === 'undefined') {
                    throw new Error('Sales officer search service not loaded');
                }
                officers = await window.SalesOfficerSearchService.searchSalesOfficers({
                    officerId,
                    officerName,
                    officerIdOperator,
                    officerNameOperator,
                    branchId: currentBranchId
                });
                officerSearchData = (officers || []).map(o => ({
                    OfficerID: o.AccountID,
                    Name: o.Name,
                    ProductID: o.ProductID,
                    LegacyAccountID: o.LegacyAccountID
                }));
            } else {
                if (typeof window.OfficerSearchService === 'undefined') {
                    throw new Error('Officer search service not loaded');
                }
                officers = await window.OfficerSearchService.searchOfficers({
                    officerId,
                    officerName,
                    officerIdOperator,
                    officerNameOperator,
                    branchId: currentBranchId
                });
                officerSearchData = (officers || []).map(o => ({
                    OfficerID: o.OfficerID,
                    Name: o.Name,
                    ProductID: o.ProductID,
                    LegacyAccountID: o.LegacyAccountID
                }));
            }

            currentPage = 1;
            totalPages = Math.ceil(officerSearchData.length / pageSize);
            selectedOfficer = null;
            elements.officerSelectBtn.disabled = true;

            displayOfficerResults();
        } catch (error) {
            const config = getModeConfig();
            console.error('Error searching officers:', error);
            elements.officerResultsBody.innerHTML = `
                <tr>
                    <td colspan="3" class="no-results text-danger">
                        <i class="bi bi-exclamation-triangle"></i>
                        ${config.errorMessage}
                    </td>
                </tr>
            `;
        }
    }

    // Display Results
    function displayOfficerResults() {
        const config = getModeConfig();
        if (officerSearchData.length === 0) {
            elements.officerResultsBody.innerHTML = `
                <tr>
                    <td colspan="3" class="no-results">
                        <i class="bi bi-search"></i>
                        ${config.emptyMessage}
                    </td>
                </tr>
            `;
            updatePagination();
            return;
        }

        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, officerSearchData.length);
        const pageData = officerSearchData.slice(startIndex, endIndex);

        let html = '';
        pageData.forEach((officer, index) => {
            const rowNumber = startIndex + index + 1;
            html += `
                <tr data-officer-id="${officer.OfficerID}" data-officer-name="${officer.Name || ''}" data-product-id="${officer.ProductID || ''}">
                    <td>${rowNumber}</td>
                    <td>${officer.OfficerID || ''}</td>
                    <td>${officer.Name || ''}</td>
                </tr>
            `;
        });

        elements.officerResultsBody.innerHTML = html;

        // Row Click Handlers
        const rows = elements.officerResultsBody.querySelectorAll('tr');
        rows.forEach(row => {
            row.addEventListener('click', () => {
                rows.forEach(r => r.classList.remove('active-row'));
                row.classList.add('active-row');
                selectedOfficer = {
                    OfficerID: row.dataset.officerId,
                    Name: row.dataset.officerName,
                    ProductID: row.dataset.productId || ''
                };
                elements.officerSelectBtn.disabled = false;
            });

            row.addEventListener('dblclick', () => {
                selectedOfficer = {
                    OfficerID: row.dataset.officerId,
                    Name: row.dataset.officerName,
                    ProductID: row.dataset.productId || ''
                };
                selectOfficer();
            });
        });

        updatePagination();
    }

    // Update Pagination
    function updatePagination() {
        const totalResults = officerSearchData.length;
        totalPages = Math.ceil(totalResults / pageSize) || 1;

        elements.officerPageInfo.textContent = `Page ${currentPage} of ${totalPages} (${totalResults} results)`;
        elements.officerPrevPageBtn.disabled = currentPage <= 1;
        elements.officerNextPageBtn.disabled = currentPage >= totalPages;
    }

    // Change Page
    function changePage(direction) {
        const newPage = currentPage + direction;
        if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            displayOfficerResults();
        }
    }

    // Select Officer
    function selectOfficer() {
        if (selectedOfficer && selectionCallback) {
            selectionCallback(selectedOfficer);
            closeModal();
        }
    }

    // Close Modal
    function closeModal() {
        if (elements.modal) {
            const modalInstance = bootstrap.Modal.getInstance(elements.modal);
            if (modalInstance) modalInstance.hide();
        }
    }

    // Clear Search
    function clearOfficerSearch() {
        const config = getModeConfig();
        if (elements.officerIdSearch) elements.officerIdSearch.value = '';
        if (elements.officerNameSearch) elements.officerNameSearch.value = '';
        officerSearchData = [];
        selectedOfficer = null;
        currentPage = 1;
        totalPages = 1;
        
        if (elements.officerResultsBody) {
             elements.officerResultsBody.innerHTML = `
                <tr>
                    <td colspan="3" class="no-results">
                        <i class="bi bi-search"></i>
                        ${config.initialMessage}
                    </td>
                </tr>
            `;
        }
        updatePagination();
    }

    global.OfficerSearchModal = {
        init: initOfficerSearchModal,
        open: openOfficerSearchModal,
        close: closeModal
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOfficerSearchModal);
    } else {
        initOfficerSearchModal();
    }

})(window);
