/**
 * Group Search Modal
 * Modern search interface for finding groups
 * Follows the same pattern as Application and Client search modals
 */

(function() {
    let modalElement = null;
    let modalInstance = null;
    let currentPage = 1;
    const pageSize = 50;
    let allResults = [];
    let selectedGroup = null;
    let selectionCallback = null;

    /**
     * Initialize the modal - load HTML and set up event listeners
     */
    async function initialize() {
        if (modalElement) return;

        try {
            // Load modal HTML - try relative path first, then with modules prefix
            let response = await fetch('group-search-modal.html');
            if (!response.ok) {
                response = await fetch('modules/loan-application/group-search-modal.html');
            }
            if (!response.ok) {
                throw new Error(`Failed to load group search modal: ${response.status}`);
            }

            const html = await response.text();
            
            // Create container and inject HTML
            const container = document.createElement('div');
            container.innerHTML = html;
            document.body.appendChild(container.firstElementChild);

            modalElement = document.getElementById('groupSearchModal');
            if (!modalElement) {
                throw new Error('Group search modal element not found');
            }

            // Initialize Bootstrap modal
            modalInstance = new bootstrap.Modal(modalElement);

            // Set up event listeners
            setupEventListeners();

            console.log('Group search modal initialized successfully');
        } catch (error) {
            console.error('Error initializing group search modal:', error);
            throw error;
        }
    }

    /**
     * Set up all event listeners for the modal
     */
    function setupEventListeners() {
        // Search button
        const searchBtn = modalElement.querySelector('#groupSearchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', performSearch);
        }

        // Clear button
        const clearBtn = modalElement.querySelector('#groupClearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', clearSearch);
        }

        // OK button
        const okBtn = modalElement.querySelector('#groupSelectBtn');
        if (okBtn) {
            okBtn.addEventListener('click', confirmSelection);
        }

        // Pagination buttons
        const prevPageBtn = modalElement.querySelector('#groupPrevPageBtn');
        const nextPageBtn = modalElement.querySelector('#groupNextPageBtn');

        if (prevPageBtn) prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
        if (nextPageBtn) nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));

        // Enter key in search fields
        const searchFields = modalElement.querySelectorAll('.search-input');
        searchFields.forEach(field => {
            field.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });
        });

        // Modal shown event - auto-load data
        modalElement.addEventListener('shown.bs.modal', () => {
            performSearch();
        });

        // Modal hidden event - reset
        modalElement.addEventListener('hidden.bs.modal', () => {
            resetModal();
        });
    }

    /**
     * Perform search with current criteria
     */
    async function performSearch() {
        try {
            const groupId = modalElement.querySelector('#groupIdSearch')?.value?.trim() || '';
            const groupName = modalElement.querySelector('#groupNameSearch')?.value?.trim() || '';
            const groupIdOperator = modalElement.querySelector('#groupIdOperator')?.value || 'like';
            const groupNameOperator = modalElement.querySelector('#groupNameOperator')?.value || 'like';

            // Disable search button during search
            const searchBtn = modalElement.querySelector('#groupSearchBtn');
            if (searchBtn) {
                searchBtn.disabled = true;
                searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
            }

            // Call the search service
            const results = await GroupSearchService.searchGroups({
                groupId,
                groupName,
                groupIdOperator,
                groupNameOperator
            });

            allResults = results || [];
            currentPage = 1;
            displayResults();

        } catch (error) {
            console.error('Error searching groups:', error);
            showError('Failed to search groups. Please try again.');
            allResults = [];
            displayResults();
        } finally {
            // Re-enable search button
            const searchBtn = modalElement.querySelector('#searchGroupBtn');
            if (searchBtn) {
                searchBtn.disabled = false;
                searchBtn.innerHTML = '<i class="fas fa-search"></i> Search';
            }
        }
    }

    /**
     * Display search results with pagination
     */
    function displayResults() {
        const tbody = modalElement.querySelector('#groupResultsBody');
        if (!tbody) return;

        // Clear existing results
        tbody.innerHTML = '';

        if (allResults.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="no-results">
                        <i class="fas fa-inbox"></i>
                        <div>No records found [No:000302]</div>
                    </td>
                </tr>
            `;
            updatePagination();
            return;
        }

        // Calculate pagination
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, allResults.length);
        const pageResults = allResults.slice(startIndex, endIndex);

        // Display results
        pageResults.forEach((group, index) => {
            const row = document.createElement('tr');
            row.dataset.groupId = group.GroupID || group.groupId;
            row.dataset.groupName = group.GroupName || group.groupName;

            row.innerHTML = `
                <td>${startIndex + index + 1}</td>
                <td>${group.GroupID || group.groupId || ''}</td>
                <td>${group.GroupName || group.groupName || ''}</td>
            `;

            // Row click event
            row.addEventListener('click', () => {
                selectRow(row);
            });

            // Double-click event
            row.addEventListener('dblclick', () => {
                selectRow(row);
                confirmSelection();
            });

            tbody.appendChild(row);
        });

        updatePagination();
    }

    /**
     * Select a row in the results table
     */
    function selectRow(row) {
        // Remove previous selection
        const previouslySelected = modalElement.querySelector('.results-table tbody tr.table-active');
        if (previouslySelected) {
            previouslySelected.classList.remove('table-active');
        }

        // Add selection to new row
        row.classList.add('table-active');

        // Store selected group
        selectedGroup = {
            groupId: row.dataset.groupId,
            groupName: row.dataset.groupName
        };

        // Enable OK button
        const okBtn = modalElement.querySelector('#groupSelectBtn');
        if (okBtn) {
            okBtn.disabled = false;
        }
    }

    /**
     * Update pagination controls
     */
    function updatePagination() {
        const totalPages = Math.ceil(allResults.length / pageSize);
        const startRecord = allResults.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
        const endRecord = Math.min(currentPage * pageSize, allResults.length);

        // Update pagination info
        const paginationInfo = modalElement.querySelector('#groupPageInfo');
        if (paginationInfo) {
            paginationInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        }

        // Update button states
        const prevPageBtn = modalElement.querySelector('#groupPrevPageBtn');
        const nextPageBtn = modalElement.querySelector('#groupNextPageBtn');

        if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
        if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
    }

    /**
     * Navigate to a specific page
     */
    function goToPage(page) {
        const totalPages = Math.ceil(allResults.length / pageSize);
        if (page < 1 || page > totalPages) return;

        currentPage = page;
        displayResults();
    }

    /**
     * Clear search fields and results
     */
    function clearSearch() {
        if (!modalElement) return;
        
        const groupIdInput = modalElement.querySelector('#groupIdSearch');
        const groupNameInput = modalElement.querySelector('#groupNameSearch');
        const groupIdOperator = modalElement.querySelector('#groupIdOperator');
        const groupNameOperator = modalElement.querySelector('#groupNameOperator');
        
        if (groupIdInput) groupIdInput.value = '';
        if (groupNameInput) groupNameInput.value = '';
        if (groupIdOperator) groupIdOperator.value = 'like';
        if (groupNameOperator) groupNameOperator.value = 'like';

        allResults = [];
        selectedGroup = null;
        currentPage = 1;
        
        if (modalElement.querySelector('#groupResultsBody')) {
            displayResults();
        }

        // Disable OK button
        const okBtn = modalElement.querySelector('#groupSelectBtn');
        if (okBtn) {
            okBtn.disabled = true;
        }
    }

    /**
     * Confirm selection and execute callback
     */
    function confirmSelection() {
        if (!selectedGroup) {
            showError('Please select a group');
            return;
        }

        console.log('Selected group:', selectedGroup);

        if (selectionCallback && typeof selectionCallback === 'function') {
            console.log('Executing callback with group data');
            selectionCallback(selectedGroup);
        }

        close();
    }

    /**
     * Reset modal to initial state
     */
    function resetModal() {
        clearSearch();
        selectedGroup = null;
        selectionCallback = null;
    }

    /**
     * Show error message
     */
    function showError(message) {
        if (window.NotificationService) {
            window.NotificationService.error(message);
        } else {
            alert(message);
        }
    }

    /**
     * Open the modal with optional callback
     */
    async function open(callback) {
        try {
            await initialize();
            
            // CRITICAL: Reset modal BEFORE setting callback
            resetModal();
            
            if (callback && typeof callback === 'function') {
                selectionCallback = callback;
                console.log('Group search callback set');
            }

            modalInstance.show();
        } catch (error) {
            console.error('Error opening group search modal:', error);
            showError('Failed to open group search modal');
        }
    }

    /**
     * Close the modal
     */
    function close() {
        if (modalInstance) {
            modalInstance.hide();
        }
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initialize().catch(console.error);
        });
    } else {
        initialize().catch(console.error);
    }

    // Export to global scope
    window.GroupSearchModal = {
        open: open,
        close: close,
        initialize: initialize
    };

})();
