/**
 * Product Search Modal
 * Modern search interface for finding products
 * Follows the same pattern as Center and Group search modals
 */

(function() {
    let modalElement = null;
    let modalInstance = null;
    let currentPage = 1;
    const pageSize = 50;
    let allResults = [];
    let selectedProduct = null;
    let selectionCallback = null;

    /**
     * Initialize the modal - load HTML and set up event listeners
     */
    async function initialize() {
        if (modalElement) return;

        try {
            // Load modal HTML - try relative path first, then with modules prefix
            let response = await fetch('product-search-modal.html');
            if (!response.ok) {
                response = await fetch('modules/loan-application/product-search-modal.html');
            }
            if (!response.ok) {
                throw new Error(`Failed to load product search modal: ${response.status}`);
            }

            const html = await response.text();
            
            // Create container and inject HTML
            const container = document.createElement('div');
            container.innerHTML = html;
            document.body.appendChild(container.firstElementChild);

            modalElement = document.getElementById('productSearchModal');
            if (!modalElement) {
                throw new Error('Product search modal element not found');
            }

            // Initialize Bootstrap modal
            modalInstance = new bootstrap.Modal(modalElement);

            // Set up event listeners
            setupEventListeners();

            console.log('Product search modal initialized successfully');
        } catch (error) {
            console.error('Error initializing product search modal:', error);
            throw error;
        }
    }

    /**
     * Set up all event listeners for the modal
     */
    function setupEventListeners() {
        // Search button
        const searchBtn = modalElement.querySelector('#productSearchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', performSearch);
        }

        // Clear button
        const clearBtn = modalElement.querySelector('#productClearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', clearSearch);
        }

        // OK button
        const okBtn = modalElement.querySelector('#productSelectBtn');
        if (okBtn) {
            okBtn.addEventListener('click', confirmSelection);
        }

        // Pagination buttons
        const prevPageBtn = modalElement.querySelector('#productPrevPageBtn');
        const nextPageBtn = modalElement.querySelector('#productNextPageBtn');

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
            const productId = modalElement.querySelector('#productIdSearch')?.value?.trim() || '';
            const description = modalElement.querySelector('#productDescSearch')?.value?.trim() || '';
            const productIdOperator = modalElement.querySelector('#productIdOperator')?.value || 'like';
            const descOperator = modalElement.querySelector('#productDescOperator')?.value || 'like';

            // Disable search button during search
            const searchBtn = modalElement.querySelector('#productSearchBtn');
            if (searchBtn) {
                searchBtn.disabled = true;
                searchBtn.innerHTML = '<i class="bi bi-spinner"></i> Searching...';
            }

            // Call the search service
            const results = await ProductSearchService.searchProducts({
                productId,
                description,
                productIdOperator,
                descOperator
            });

            allResults = results || [];
            currentPage = 1;
            displayResults();

        } catch (error) {
            console.error('Error searching products:', error);
            showError('Failed to search products. Please try again.');
            allResults = [];
            displayResults();
        } finally {
            // Re-enable search button
            const searchBtn = modalElement.querySelector('#productSearchBtn');
            if (searchBtn) {
                searchBtn.disabled = false;
                searchBtn.innerHTML = '<i class="bi bi-search"></i> Search';
            }
        }
    }

    /**
     * Display search results with pagination
     */
    function displayResults() {
        const tbody = modalElement.querySelector('#productResultsBody');
        if (!tbody) return;

        // Clear existing results
        tbody.innerHTML = '';

        if (allResults.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="no-results">
                        <i class="bi bi-inbox"></i>
                        <div>No products found</div>
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
        pageResults.forEach((product, index) => {
            const row = document.createElement('tr');
            row.dataset.productId = product.ProductID || product.productId;
            row.dataset.productName = product.Description || product.description || product.ProductName || product.productName;

            row.innerHTML = `
                <td>${startIndex + index + 1}</td>
                <td>${product.ProductID || product.productId || ''}</td>
                <td>${product.Description || product.description || product.ProductName || product.productName || ''}</td>
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

        // Store selected product
        selectedProduct = {
            productId: row.dataset.productId,
            productName: row.dataset.productName
        };

        // Enable OK button
        const okBtn = modalElement.querySelector('#productSelectBtn');
        if (okBtn) {
            okBtn.disabled = false;
        }
    }

    /**
     * Update pagination controls
     */
    function updatePagination() {
        const totalPages = Math.ceil(allResults.length / pageSize);
        
        // Update pagination info
        const paginationInfo = modalElement.querySelector('#productPageInfo');
        if (paginationInfo) {
            paginationInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        }

        // Update button states
        const prevPageBtn = modalElement.querySelector('#productPrevPageBtn');
        const nextPageBtn = modalElement.querySelector('#productNextPageBtn');

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
        
        const productIdInput = modalElement.querySelector('#productIdSearch');
        const descInput = modalElement.querySelector('#productDescSearch');
        const productIdOperator = modalElement.querySelector('#productIdOperator');
        const descOperator = modalElement.querySelector('#productDescOperator');
        
        if (productIdInput) productIdInput.value = '';
        if (descInput) descInput.value = '';
        if (productIdOperator) productIdOperator.value = 'like';
        if (descOperator) descOperator.value = 'like';

        allResults = [];
        selectedProduct = null;
        currentPage = 1;
        
        if (modalElement.querySelector('#productResultsBody')) {
            displayResults();
        }

        // Disable OK button
        const okBtn = modalElement.querySelector('#productSelectBtn');
        if (okBtn) {
            okBtn.disabled = true;
        }
    }

    /**
     * Confirm selection and execute callback
     */
    function confirmSelection() {
        if (!selectedProduct) {
            showError('Please select a product');
            return;
        }

        console.log('Selected product:', selectedProduct);

        if (selectionCallback && typeof selectionCallback === 'function') {
            console.log('Executing callback with product data');
            selectionCallback(selectedProduct);
        }

        close();
    }

    /**
     * Reset modal to initial state
     */
    function resetModal() {
        clearSearch();
        selectedProduct = null;
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
                console.log('Product search callback set');
            }

            modalInstance.show();
        } catch (error) {
            console.error('Error opening product search modal:', error);
            showError('Failed to open product search modal');
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
    window.ProductSearchModal = {
        open: open,
        close: close,
        initialize: initialize
    };

})();
