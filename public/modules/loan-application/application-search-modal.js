/**
 * Application Search Modal
 * Handles searching for loan applications with multiple criteria
 */

(function() {
    'use strict';

    // Modal state
    let modalElement = null;
    let modalInstance = null;
    let currentPage = 1;
    let itemsPerPage = 10;
    let totalResults = 0;
    let allResults = [];
    let selectedApplication = null;
    let selectionCallback = null;
    let filterBranchId = null; // Branch ID filter for search

    // DOM elements
    let appIdSearch, appClientIdSearch, appNameSearch, appIdNumberSearch;
    let appIdOperator, appClientIdOperator, appNameOperator, appIdNumberOperator;
    let appSearchBtn, appClearBtn, appSelectBtn;
    let applicationResultsBody, appPageInfo, appPrevPageBtn, appNextPageBtn;

    /**
     * Load modal HTML asynchronously
     */
    function loadModalHTML() {
        return fetch('application-search-modal.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load application search modal');
                }
                return response.text();
            })
            .then(html => {
                const container = document.getElementById('applicationSearchModalContainer');
                if (container) {
                    container.innerHTML = html;
                    return true;
                } else {
                    console.error('Application search modal container not found');
                    return false;
                }
            })
            .catch(error => {
                console.error('Error loading application search modal:', error);
                return false;
            });
    }

    /**
     * Setup DOM element references
     */
    function setupDOMElements() {
        modalElement = document.getElementById('applicationSearchModal');
        if (!modalElement) {
            console.error('Application search modal element not found');
            return false;
        }

        // Search inputs
        appIdSearch = document.getElementById('appIdSearch');
        appClientIdSearch = document.getElementById('appClientIdSearch');
        appNameSearch = document.getElementById('appNameSearch');
        appIdNumberSearch = document.getElementById('appIdNumberSearch');

        // Operators
        appIdOperator = document.getElementById('appIdOperator');
        appClientIdOperator = document.getElementById('appClientIdOperator');
        appNameOperator = document.getElementById('appNameOperator');
        appIdNumberOperator = document.getElementById('appIdNumberOperator');

        // Buttons
        appSearchBtn = document.getElementById('appSearchBtn');
        appClearBtn = document.getElementById('appClearBtn');
        appSelectBtn = document.getElementById('appSelectBtn');
        appPrevPageBtn = document.getElementById('appPrevPageBtn');
        appNextPageBtn = document.getElementById('appNextPageBtn');

        // Results
        applicationResultsBody = document.getElementById('applicationResultsBody');
        appPageInfo = document.getElementById('appPageInfo');

        return true;
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        if (!modalElement) return;

        // Search button
        appSearchBtn.addEventListener('click', performSearch);

        // Clear button
        appClearBtn.addEventListener('click', clearSearch);

        // Select button
        appSelectBtn.addEventListener('click', selectApplication);

        // Pagination
        appPrevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderResults();
            }
        });

        appNextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(totalResults / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderResults();
            }
        });

        // Table row click
        applicationResultsBody.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (row && row.dataset.applicationId) {
                selectRow(row);
            }
        });

        // Table row double-click
        applicationResultsBody.addEventListener('dblclick', (e) => {
            const row = e.target.closest('tr');
            if (row && row.dataset.applicationId) {
                selectRow(row);
                selectApplication();
            }
        });

        // Enter key in search fields
        [appIdSearch, appClientIdSearch, appNameSearch, appIdNumberSearch].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });
        });

        // Modal reset on close
        modalElement.addEventListener('hidden.bs.modal', resetModal);
    }

    /**
     * Initialize the modal
     */
    function initApplicationSearchModal() {
        loadModalHTML().then(loaded => {
            if (loaded) {
                setupDOMElements();
                attachEventListeners();
            }
        });
    }

    /**
     * Open the modal
     * @param {Function} callback - Callback function when application is selected
     * @param {Object} options - Optional filter options (e.g., { branchId: '0101' })
     */
    async function open(callback, options = {}) {
        if (!modalElement) {
            console.error('Application search modal not initialized');
            return;
        }

        // Reset modal first, then set the callback (order matters!)
        resetModal();
        selectionCallback = callback;
        filterBranchId = options.branchId || null;
        console.log('Callback stored:', selectionCallback);
        console.log('Branch filter:', filterBranchId);
        
        if (!modalInstance) {
            modalInstance = new bootstrap.Modal(modalElement);
        }
        modalInstance.show();
        
        // Ensure service is loaded before using it
        if (!window.ApplicationSearchService) {
            console.log('Loading ApplicationSearchService...');
            try {
                await window.ServiceLoader.loadApplicationSearchService();
            } catch (error) {
                console.error('Failed to load ApplicationSearchService:', error);
                applicationResultsBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="no-results">
                            <i class="bi bi-exclamation-triangle"></i>
                            Failed to load search service. Please refresh the page.
                        </td>
                    </tr>
                `;
                return;
            }
        }
        
        // Automatically load all applications when modal opens
        // Pass branchId filter for server-side filtering
        performApplicationSearch({}, filterBranchId);
    }

    /**
     * Close the modal
     */
    function close() {
        if (modalInstance) {
            modalInstance.hide();
        }
    }

    /**
     * Reset modal state
     */
    function resetModal() {
        // Clear inputs
        appIdSearch.value = '';
        appClientIdSearch.value = '';
        appNameSearch.value = '';
        appIdNumberSearch.value = '';

        // Reset operators
        appIdOperator.value = 'like';
        appClientIdOperator.value = 'like';
        appNameOperator.value = 'like';
        appIdNumberOperator.value = 'like';

        // Clear results
        allResults = [];
        totalResults = 0;
        currentPage = 1;
        selectedApplication = null;
        // Note: Don't reset selectionCallback here - it's set after resetModal() in open()

        // Reset UI
        renderResults();
        appSelectBtn.disabled = true;
    }

    /**
     * Clear search fields
     */
    function clearSearch() {
        appIdSearch.value = '';
        appClientIdSearch.value = '';
        appNameSearch.value = '';
        appIdNumberSearch.value = '';
        appIdSearch.focus();
    }

    /**
     * Perform search
     */
    function performSearch() {
        const searchCriteria = {
            applicationId: {
                value: appIdSearch.value.trim(),
                operator: appIdOperator.value
            },
            clientId: {
                value: appClientIdSearch.value.trim(),
                operator: appClientIdOperator.value
            },
            name: {
                value: appNameSearch.value.trim(),
                operator: appNameOperator.value
            },
            idNumber: {
                value: appIdNumberSearch.value.trim(),
                operator: appIdNumberOperator.value
            }
        };

        // Call actual API (no validation - allow fetching all records)
        performApplicationSearch(searchCriteria);
    }

    /**
     * Perform application search using API
     * @param {Object} criteria - Search criteria
     * @param {string} branchId - Optional branch ID for server-side filtering
     */
    async function performApplicationSearch(criteria, branchId = null) {
        try {
            // Show loading state
            applicationResultsBody.innerHTML = `
                <tr>
                    <td colspan="5" class="no-results">
                        <i class="bi bi-hourglass-split"></i>
                        Searching applications...
                    </td>
                </tr>
            `;
            appSearchBtn.disabled = true;

            // Call API with branchId for server-side filtering
            const response = await ApplicationSearchService.searchApplications(criteria, branchId || filterBranchId);
            
            if (response.success && response.data) {
                // Extract applications from Details array
                const applications = response.data.Details || [];
                
                console.log('[ApplicationSearchModal] Raw API response:', applications);
                console.log('[ApplicationSearchModal] Sample record fields:', applications[0]);
                
                // Map API response to our format
                allResults = applications.map(app => ({
                    applicationId: app.ApplicationID,
                    clientId: app.ClientID,
                    productId: app.ProductID,
                    clientName: app.ClientName || app.Name || '',
                    applicationName: app.ClientName || app.Name || '',
                    idNumber: app.IDNumber,
                    branchId: app.BranchID || app.OurBranchID || '',
                    createdOn: app.CreatedOn || app.ApplicationDate || app.DateCreated || ''
                }));
                
                // Note: Filtering is now done server-side via OurBranchID in API request
                // No client-side filtering needed since API already filters by branch

                // Sort by ApplicationID in descending order (newest first)
                // This matches: SELECT * FROM t_WFLoanApplication WHERE OurBranchID = 'xxxx' ORDER BY ApplicationID DESC
                allResults.sort((a, b) => {
                    const idA = a.applicationId || '';
                    const idB = b.applicationId || '';
                    
                    // Try numeric comparison first
                    const numA = parseInt(idA.replace(/\D/g, ''), 10) || 0;
                    const numB = parseInt(idB.replace(/\D/g, ''), 10) || 0;
                    
                    if (numA !== numB) {
                        return numB - numA; // Descending order (highest ID first)
                    }
                    
                    // Fallback to string comparison for non-numeric IDs
                    return idB.localeCompare(idA);
                });
                
                console.log('[ApplicationSearchModal] Sorted by ApplicationID DESC:', allResults.slice(0, 5).map(r => ({
                    id: r.applicationId
                })));

                totalResults = allResults.length;
                currentPage = 1;
                selectedApplication = null;
                appSelectBtn.disabled = true;

                renderResults();
            } else {
                throw new Error(response.message || 'Failed to fetch applications');
            }
        } catch (error) {
            console.error('Error searching applications:', error);
            applicationResultsBody.innerHTML = `
                <tr>
                    <td colspan="5" class="no-results">
                        <i class="bi bi-exclamation-triangle"></i>
                        Error: ${error.message || 'Failed to search applications'}
                    </td>
                </tr>
            `;
            allResults = [];
            totalResults = 0;
            appPageInfo.textContent = 'Page 0 of 0';
            appPrevPageBtn.disabled = true;
            appNextPageBtn.disabled = true;
        } finally {
            appSearchBtn.disabled = false;
        }
    }

    /**
     * Match criteria helper
     */
    function matchesCriteria(value, searchValue, operator) {
        const val = value.toLowerCase();
        const search = searchValue.toLowerCase();

        switch (operator) {
            case 'equals':
                return val === search;
            case 'starts':
                return val.startsWith(search);
            case 'like':
            default:
                return val.includes(search);
        }
    }

    /**
     * Render search results
     */
    function renderResults() {
        if (totalResults === 0) {
            applicationResultsBody.innerHTML = `
                <tr>
                    <td colspan="5" class="no-results">
                        <i class="bi bi-inbox"></i>
                        No applications found matching your search criteria.
                    </td>
                </tr>
            `;
            appPageInfo.textContent = 'Page 0 of 0';
            appPrevPageBtn.disabled = true;
            appNextPageBtn.disabled = true;
            return;
        }

        const totalPages = Math.ceil(totalResults / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalResults);
        const pageResults = allResults.slice(startIndex, endIndex);

        applicationResultsBody.innerHTML = pageResults.map((app, index) => `
            <tr data-application-id="${app.applicationId}" data-client-id="${app.clientId}" data-product-id="${app.productId}" data-branch-id="${app.branchId}" data-client-name="${app.clientName || ''}" style="cursor: pointer;">
                <td>${startIndex + index + 1}</td>
                <td>${app.applicationId}</td>
                <td>${app.clientId}</td>
                <td>${app.clientName || '-'}</td>
                <td>${app.productId}</td>
            </tr>
        `).join('');

        appPageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        appPrevPageBtn.disabled = currentPage === 1;
        appNextPageBtn.disabled = currentPage === totalPages;
    }

    /**
     * Select a row
     */
    function selectRow(row) {
        // Remove previous selection
        const previouslySelected = applicationResultsBody.querySelector('tr.table-active');
        if (previouslySelected) {
            previouslySelected.classList.remove('table-active');
        }

        // Add selection to clicked row
        row.classList.add('table-active');

        // Store selected application - include branchId and clientName for viewing
        selectedApplication = {
            applicationId: row.dataset.applicationId,
            clientId: row.dataset.clientId,
            productId: row.dataset.productId,
            branchId: row.dataset.branchId || '',
            clientName: row.dataset.clientName || ''
        };

        console.log('Selected application:', selectedApplication);

        // Enable select button
        appSelectBtn.disabled = false;
    }

    /**
     * Select and close modal
     */
    function selectApplication() {
        console.log('selectApplication called');
        console.log('selectedApplication:', selectedApplication);
        console.log('selectionCallback:', selectionCallback);
        console.log('selectionCallback type:', typeof selectionCallback);
        
        if (selectedApplication && selectionCallback) {
            console.log('Invoking callback with:', selectedApplication);
            try {
                selectionCallback(selectedApplication);
                console.log('Callback executed successfully');
            } catch (error) {
                console.error('Error calling callback:', error);
            }
        } else {
            console.warn('Cannot execute callback:', {
                hasSelectedApplication: !!selectedApplication,
                hasCallback: !!selectionCallback
            });
        }
        close();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApplicationSearchModal);
    } else {
        initApplicationSearchModal();
    }

    // Export to global scope
    window.ApplicationSearchModal = {
        open: open,
        close: close
    };

})();
