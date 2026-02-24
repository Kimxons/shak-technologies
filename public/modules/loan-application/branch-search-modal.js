/**
 * Branch Search Modal JavaScript
 * Handles branch search functionality for Loan Application
 * Uses LookupService.getBranches() to fetch all branches
 */

(function(global) {
    'use strict';

    // State management
    let branchSearchData = [];
    let selectedBranch = null;
    let currentPage = 1;
    let pageSize = 50;
    let totalPages = 1;
    let selectionCallback = null;
    let targetBranchIdField = null;
    let targetBranchNameField = null;
    let branchModalInitialized = false;

    // DOM Elements
    const elements = {
        modal: null,
        searchBranchIdFilter: null,
        searchBranchNameFilter: null,
        searchBranchIdOperator: null,
        searchBranchNameOperator: null,
        btnSearchBranches: null,
        btnClearBranchSearch: null,
        branchSearchResults: null,
        btnSelectBranch: null,
        btnPrevBranchPage: null,
        btnNextBranchPage: null,
        branchPageInfo: null
    };

    // Initialize modal
    function initBranchSearchModal() {
        // Load modal HTML first
        loadModalHTML().then(() => {
            setupDOMElements();
            attachEventListeners();
            branchModalInitialized = true;
            console.log('Branch Search Modal initialized');
        });
    }

    // Load modal HTML dynamically
    async function loadModalHTML() {
        try {
            const response = await fetch('branch-search-modal.html');
            const html = await response.text();
            const container = document.getElementById('branchSearchModalContainer');
            if (container) {
                container.innerHTML = html;
                console.log('[BranchSearchModal] Modal HTML loaded');
            } else {
                console.error('[BranchSearchModal] Container not found');
            }
        } catch (error) {
            console.error('[BranchSearchModal] Error loading modal HTML:', error);
        }
    }

    // Setup DOM Elements
    function setupDOMElements() {
        elements.modal = document.getElementById('branchSearchModal');
        elements.searchBranchIdFilter = document.getElementById('searchBranchIdFilter');
        elements.searchBranchNameFilter = document.getElementById('searchBranchNameFilter');
        elements.searchBranchIdOperator = document.getElementById('searchBranchIdOperator');
        elements.searchBranchNameOperator = document.getElementById('searchBranchNameOperator');
        elements.btnSearchBranches = document.getElementById('btnSearchBranches');
        elements.btnClearBranchSearch = document.getElementById('btnClearBranchSearch');
        elements.branchSearchResults = document.getElementById('branchSearchResults');
        elements.btnSelectBranch = document.getElementById('btnSelectBranch');
        elements.btnPrevBranchPage = document.getElementById('btnPrevBranchPage');
        elements.btnNextBranchPage = document.getElementById('btnNextBranchPage');
        elements.branchPageInfo = document.getElementById('branchPageInfo');
    }

    // Attach event listeners
    function attachEventListeners() {
        if (elements.btnSearchBranches) {
            elements.btnSearchBranches.addEventListener('click', handleBranchSearch);
        }

        if (elements.btnClearBranchSearch) {
            elements.btnClearBranchSearch.addEventListener('click', clearBranchSearch);
        }

        if (elements.btnSelectBranch) {
            elements.btnSelectBranch.addEventListener('click', selectBranch);
        }

        if (elements.btnPrevBranchPage) {
            elements.btnPrevBranchPage.addEventListener('click', () => changePage(-1));
        }

        if (elements.btnNextBranchPage) {
            elements.btnNextBranchPage.addEventListener('click', () => changePage(1));
        }

        // Enter key to search
        [elements.searchBranchIdFilter, elements.searchBranchNameFilter].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        handleBranchSearch();
                    }
                });
            }
        });
        
        // Auto-load branches when modal opens
        if (elements.modal) {
            elements.modal.addEventListener('shown.bs.modal', function() {
                elements.searchBranchIdFilter?.focus();
                // Always load all branches when modal opens
                loadAllBranches();
            });
        }
    }

    // Open modal with target fields
    async function openBranchSearchModal(branchIdField, branchNameField, callback) {
        // Ensure modal HTML is loaded
        if (!elements.modal) {
            await loadModalHTML();
            setupDOMElements();
            attachEventListeners();
        }

        // Store target fields
        targetBranchIdField = branchIdField;
        targetBranchNameField = branchNameField;
        selectionCallback = callback;

        // Show modal
        const modalInstance = new bootstrap.Modal(elements.modal);
        modalInstance.show();
    }

    // Load all branches
    async function loadAllBranches() {
        try {
            // Show loading state
            if (elements.branchSearchResults) {
                elements.branchSearchResults.innerHTML = `
                    <tr>
                        <td colspan="3" class="no-results">
                            <i class="bi bi-hourglass-split"></i> Loading branches...
                        </td>
                    </tr>
                `;
            }

            // Check if LookupService is available
            if (!window.LookupService) {
                console.warn('LookupService not available, using mock data');
                branchSearchData = getMockBranchData();
                displayBranchResults();
                return;
            }

            const requestData = { BankID: '00' };
            const result = await window.LookupService.getBranches(requestData);
            console.log('[BranchSearch] API Response:', result);

            if (result.success && result.data) {
                let branches = Array.isArray(result.data) ? result.data : (result.Details || []);
                
                branchSearchData = branches.map(branch => ({
                    branchId: branch.OurBranchID || branch.BranchID || '',
                    branchName: branch.BranchName || branch.Name || ''
                }));

                currentPage = 1;
                totalPages = Math.ceil(branchSearchData.length / pageSize) || 1;
                selectedBranch = null;
                if (elements.btnSelectBranch) elements.btnSelectBranch.disabled = true;

                displayBranchResults();
                console.log(`[BranchSearch] Loaded ${branchSearchData.length} branches`);
            } else {
                throw new Error('Failed to load branches');
            }
        } catch (error) {
            console.error('[BranchSearch] Error loading branches:', error);
            // Use mock data as fallback
            branchSearchData = getMockBranchData();
            displayBranchResults();
        }
    }

    // Handle branch search button click
    async function handleBranchSearch() {
        await performBranchSearch();
    }
    
    // Perform branch search with filters
    async function performBranchSearch() {
        try {
            // Show loading state
            if (elements.branchSearchResults) {
                elements.branchSearchResults.innerHTML = `
                    <tr>
                        <td colspan="3" class="no-results">
                            <i class="bi bi-hourglass-split"></i> Searching branches...
                        </td>
                    </tr>
                `;
            }

            // Get search criteria
            const branchIdFilter = elements.searchBranchIdFilter?.value.trim() || '';
            const branchIdOperator = elements.searchBranchIdOperator?.value || 'like';
            const branchNameFilter = elements.searchBranchNameFilter?.value.trim() || '';
            const branchNameOperator = elements.searchBranchNameOperator?.value || 'like';

            // Check if LookupService is available
            if (!window.LookupService) {
                console.warn('LookupService not available, using mock data');
                branchSearchData = filterBranches(getMockBranchData(), branchIdFilter, branchIdOperator, branchNameFilter, branchNameOperator);
                displayBranchResults();
                return;
            }

            const requestData = { BankID: '00' };
            const result = await window.LookupService.getBranches(requestData);

            if (result.success && result.data) {
                let branches = Array.isArray(result.data) ? result.data : (result.Details || []);
                
                // Map to consistent format
                let mappedBranches = branches.map(branch => ({
                    branchId: branch.OurBranchID || branch.BranchID || '',
                    branchName: branch.BranchName || branch.Name || ''
                }));

                // Apply filters
                branchSearchData = filterBranches(mappedBranches, branchIdFilter, branchIdOperator, branchNameFilter, branchNameOperator);

                currentPage = 1;
                totalPages = Math.ceil(branchSearchData.length / pageSize) || 1;
                selectedBranch = null;
                if (elements.btnSelectBranch) elements.btnSelectBranch.disabled = true;

                displayBranchResults();
            } else {
                throw new Error('Failed to search branches');
            }
        } catch (error) {
            console.error('[BranchSearch] Error searching branches:', error);
            if (elements.branchSearchResults) {
                elements.branchSearchResults.innerHTML = `
                    <tr>
                        <td colspan="3" class="no-results">
                            <i class="bi bi-exclamation-triangle"></i> Error searching branches. Please try again.
                        </td>
                    </tr>
                `;
            }
        }
    }

    // Filter branches based on criteria
    function filterBranches(branches, branchIdFilter, branchIdOperator, branchNameFilter, branchNameOperator) {
        return branches.filter(branch => {
            let matchId = true;
            let matchName = true;

            if (branchIdFilter) {
                const value = (branch.branchId || '').toLowerCase();
                const search = branchIdFilter.toLowerCase();
                
                switch (branchIdOperator) {
                    case 'equals':
                        matchId = value === search;
                        break;
                    case 'startswith':
                        matchId = value.startsWith(search);
                        break;
                    case 'like':
                    default:
                        matchId = value.includes(search);
                        break;
                }
            }

            if (branchNameFilter) {
                const value = (branch.branchName || '').toLowerCase();
                const search = branchNameFilter.toLowerCase();
                
                switch (branchNameOperator) {
                    case 'equals':
                        matchName = value === search;
                        break;
                    case 'startswith':
                        matchName = value.startsWith(search);
                        break;
                    case 'like':
                    default:
                        matchName = value.includes(search);
                        break;
                }
            }

            return matchId && matchName;
        });
    }

    // Display branch results in table
    function displayBranchResults() {
        if (!elements.branchSearchResults) return;

        if (branchSearchData.length === 0) {
            elements.branchSearchResults.innerHTML = `
                <tr>
                    <td colspan="3" class="no-results">
                        <i class="bi bi-search"></i> No branches found. Try adjusting your search criteria.
                    </td>
                </tr>
            `;
            updatePaginationButtons();
            return;
        }

        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        const pageData = branchSearchData.slice(start, end);

        elements.branchSearchResults.innerHTML = pageData.map((branch, index) => `
            <tr data-index="${start + index}" class="branch-row">
                <td>${start + index + 1}</td>
                <td>${branch.branchId}</td>
                <td>${branch.branchName}</td>
            </tr>
        `).join('');

        // Add click handlers to rows
        elements.branchSearchResults.querySelectorAll('tr').forEach(row => {
            row.addEventListener('click', () => {
                // Remove previous selection
                elements.branchSearchResults.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                // Add selection
                row.classList.add('selected');
                const index = parseInt(row.dataset.index);
                selectedBranch = branchSearchData[index];
                if (elements.btnSelectBranch) elements.btnSelectBranch.disabled = false;
            });

            // Double-click to select and close
            row.addEventListener('dblclick', () => {
                const index = parseInt(row.dataset.index);
                selectedBranch = branchSearchData[index];
                selectBranch();
            });
        });

        updatePaginationButtons();
    }

    // Update pagination buttons
    function updatePaginationButtons() {
        totalPages = Math.ceil(branchSearchData.length / pageSize) || 1;

        if (elements.branchPageInfo) {
            elements.branchPageInfo.textContent = `Page ${currentPage} of ${totalPages} (${branchSearchData.length} results)`;
        }

        if (elements.btnPrevBranchPage) {
            elements.btnPrevBranchPage.disabled = currentPage <= 1;
        }

        if (elements.btnNextBranchPage) {
            elements.btnNextBranchPage.disabled = currentPage >= totalPages;
        }
    }

    // Change page
    function changePage(direction) {
        const newPage = currentPage + direction;
        if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            displayBranchResults();
        }
    }

    // Clear search
    function clearBranchSearch() {
        if (elements.searchBranchIdFilter) elements.searchBranchIdFilter.value = '';
        if (elements.searchBranchNameFilter) elements.searchBranchNameFilter.value = '';
        if (elements.searchBranchIdOperator) elements.searchBranchIdOperator.value = 'like';
        if (elements.searchBranchNameOperator) elements.searchBranchNameOperator.value = 'like';
        
        branchSearchData = [];
        currentPage = 1;
        selectedBranch = null;
        
        // Reload all branches
        loadAllBranches();
    }

    // Select branch and populate fields
    function selectBranch() {
        if (!selectedBranch) {
            console.warn('No branch selected');
            return;
        }

        // Populate target fields if provided
        if (targetBranchIdField) {
            targetBranchIdField.value = selectedBranch.branchId;
        }
        if (targetBranchNameField) {
            targetBranchNameField.value = selectedBranch.branchName;
        }

        // Call callback if provided
        if (typeof selectionCallback === 'function') {
            selectionCallback(selectedBranch);
        }

        // Close modal
        const modalInstance = bootstrap.Modal.getInstance(elements.modal);
        if (modalInstance) {
            modalInstance.hide();
        }

        console.log('[BranchSearch] Selected branch:', selectedBranch);
    }

    // Mock data for testing
    function getMockBranchData() {
        return [
            { branchId: '0101', branchName: 'Head Office' },
            { branchId: '0102', branchName: 'Nairobi Branch' },
            { branchId: '0103', branchName: 'Mombasa Branch' },
            { branchId: '0104', branchName: 'Kisumu Branch' },
            { branchId: '0105', branchName: 'Nakuru Branch' },
            { branchId: '0106', branchName: 'Eldoret Branch' },
            { branchId: '0107', branchName: 'Thika Branch' },
            { branchId: '0108', branchName: 'Nyeri Branch' },
            { branchId: '0109', branchName: 'Machakos Branch' },
            { branchId: '0110', branchName: 'Meru Branch' }
        ];
    }

    // Initialize on DOM load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBranchSearchModal);
    } else {
        initBranchSearchModal();
    }

    // Expose functions globally
    global.BranchSearchModal = {
        init: initBranchSearchModal,
        open: openBranchSearchModal,
        loadAll: loadAllBranches,
        search: performBranchSearch,
        clear: clearBranchSearch
    };

    // Also expose for direct function calls
    global.openBranchSearchModal = openBranchSearchModal;
    global.initBranchSearchModal = initBranchSearchModal;

})(window);
