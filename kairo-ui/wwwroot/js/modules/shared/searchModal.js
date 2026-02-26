/**
 * Shared Search Modal
 * Reusable search modal that integrates with app-core.js
 * Follows the MVC pattern with controller actions
 * 
 * Dependencies:
 * - app-core.js (AppCore global object)
 * 
 * Usage:
 * const searchModal = new SearchModal(window.AppCore);
 * await searchModal.open({ tableID: 'ClientID', onSelect: (row) => { ... } });
 */

(function (global) {
    'use strict';

    class SearchModal {
        constructor(appCore) {
            if (!appCore) {
                console.error('[SearchModal] AppCore is required');
                throw new Error('AppCore is required for SearchModal');
            }

            this.appCore = appCore;
            this.modalElement = null;
            this.overlayElement = null;
            this.bootstrapModal = null;
            this.isInitialized = false;
            this.currentConfig = null;
            this.selectedRow = null;
            this.currentResults = [];
        }

        /**
         * Initialize modal by loading HTML from controller
         * @param {string} tableID - Table identifier for search
         * @param {Object} options - Optional parameters (whereStmt, advFilterString, etc.)
         */
        async init(tableID, options = {}) {
            try {
                console.log('[SearchModal] Initializing modal for TableID:', tableID);

                // Build query parameters
                const queryParams = {
                    TableID: tableID,
                    WhereStmt: options.whereStmt || '',
                    AdvFilterString: options.advFilterString || '',
                    SearchKey: options.searchKey || '',
                    ModuleID: options.moduleID || '1000',
                    PrevOrNext: options.prevOrNext || 1,
                    PageSize: options.pageSize || 10
                };

                // Use AppCore.invokeControllerGetView to load the partial view (returns HTML)
                const html = await this.appCore.invokeControllerGetViewAsync('SearchModal/Index', queryParams);

                //console.log(html);
                if (!html || typeof html !== 'string') {
                    //if (!html) {
                    throw new Error('Failed to load search modal HTML');
                }

                console.log('[SearchModal] Modal HTML loaded successfully');

                // Remove existing modal if present
                const existingOverlay = document.getElementById('search-modal-overlay');
                if (existingOverlay) {
                    existingOverlay.remove();
                }

                // Insert modal HTML into DOM
                document.body.insertAdjacentHTML('beforeend', html);

                // Get references to modal elements
                this.overlayElement = document.getElementById('search-modal-overlay');
                this.modalElement = this.overlayElement?.querySelector('.modal-content');

                if (!this.overlayElement || !this.modalElement) {
                    throw new Error('Modal elements not found in DOM after insertion');
                }

                // Initialize Bootstrap modal
                this.bootstrapModal = new bootstrap.Modal(this.overlayElement, {
                    backdrop: 'static',
                    keyboard: true
                });

                // Wire up event listeners
                this.setupEventListeners();

                this.isInitialized = true;
                console.log('[SearchModal] Initialization complete');

                return true;
            } catch (error) {
                console.error('[SearchModal] Initialization error:', error);
                throw error;
            }
        }

        /**
         * Setup all event listeners for modal interactions
         */
        setupEventListeners() {
            const closeBtn = document.getElementById('search-modal-close-btn');
            const cancelBtn = document.getElementById('search-cancel-btn');
            const selectBtn = document.getElementById('search-select-btn');
            const executeBtn = document.getElementById('search-execute-btn');
            const clearBtn = document.getElementById('search-clear-btn');

            // Close handlers
            closeBtn?.addEventListener('click', () => this.close());
            cancelBtn?.addEventListener('click', () => this.close());

            // Select button
            selectBtn?.addEventListener('click', () => this.selectAndClose());

            // Search execution
            executeBtn?.addEventListener('click', () => this.executeSearch());

            // Clear button
            clearBtn?.addEventListener('click', () => this.clearCriteria());

            // Handle Bootstrap modal hidden event
            this.overlayElement?.addEventListener('hidden.bs.modal', () => {
                this.cleanupModal();
            });

            // Enter key in search fields triggers search
            const searchInputs = document.querySelectorAll('.search-field-input');
            searchInputs.forEach(input => {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.executeSearch();
                    }
                });
            });
        }

        /**
         * Open the search modal
         * @param {Object} config - Configuration object
         * @param {string} config.tableID - Table identifier (required)
         * @param {string} [config.whereStmt] - WHERE clause filter
         * @param {string} [config.advFilterString] - Advanced filter string
         * @param {string} [config.searchKey] - Initial search key
         * @param {string} [config.moduleID] - Module ID (default: '1000')
         * @param {Function} [config.onSelect] - Callback when row is selected
         * @returns {Promise<Object>} Resolves with selected record or null
         */
        async open(config) {
            try {
                if (!config || !config.tableID) {
                    throw new Error('tableID is required');
                }

                this.currentConfig = config;

                // Initialize modal
                await this.init(config.tableID, {
                    whereStmt: config.whereStmt,
                    advFilterString: config.advFilterString,
                    searchKey: config.searchKey,
                    moduleID: config.moduleID,
                    prevOrNext: config.prevOrNext,
                    pageSize: config.pageSize
                });

                // Show Bootstrap modal
                if (this.bootstrapModal) {
                    this.bootstrapModal.show();
                }

                console.log('[SearchModal] Modal opened for TableID:', config.tableID);

                // Auto-execute search if SearchKey is provided
                if (config.searchKey) {
                    setTimeout(() => this.executeSearch(), 300);
                }

                // Return promise for selection
                return new Promise((resolve) => {
                    this.resolveSelection = resolve;
                });
            } catch (error) {
                console.error('[SearchModal] Error opening modal:', error);
                this.showToast?.('Failed to open search modal: ' + error.message, 'error');
                throw error;
            }
        }

        /**
         * Execute search using AppCore.invokeControllerAsync
         */
        async executeSearch() {
            const loadingEl = document.getElementById('search-loading');
            const resultsEl = document.getElementById('search-results-container');
            const emptyEl = document.getElementById('search-empty-state');
            const errorEl = document.getElementById('search-error-state');
            const selectBtn = document.getElementById('search-select-btn');

            try {
                // Show loading state
                this.setResultsState('loading');
                if (selectBtn) selectBtn.disabled = true;

                // Build search criteria from input fields
                const searchCriteria = this.buildSearchCriteria();

                const tableID = document.getElementById('search-table-id')?.value;
                const whereStmt = document.getElementById('search-where-stmt')?.value || '';
                const advFilter = document.getElementById('search-adv-filter')?.value || '';
                const moduleID = document.getElementById('search-module-id')?.value || '1000';

                console.log('[SearchModal] Executing search with criteria:', {
                    tableID,
                    searchKey: searchCriteria,
                    whereStmt,
                    advFilter
                });

                // Use AppCore.invokeControllerAsync to call the Search endpoint
                const response = await this.appCore.invokeControllerAsync('SearchModal/Search', {
                    TableID: tableID,
                    WhereStmt: whereStmt,
                    AdvFilterString: advFilter,
                    SearchKey: searchCriteria,
                    ModuleID: moduleID,
                    PrevOrNext: this.currentConfig?.prevOrNext || 1,
                    PageSize: this.currentConfig?.pageSize || 10
                });

                console.log('[SearchModal] Search response:', response);

                // Extract results from response
                let results = [];
                if (response?.success && response?.data) {
                    // Handle various response formats
                    if (Array.isArray(response.data)) {
                        results = response.data;
                    } else if (response.data.Details || response.data.details) {
                        if (response.data.Details)
                            results = Array.isArray(response.data.Details.SearchResults) ? response.data.Details.SearchResults : [response.data.Details.SearchResults];
                        if (response.data.details)
                            results = Array.isArray(response.data.details.SearchResults) ? response.data.details.SearchResults : [response.data.details.SearchResults];
                    } else if (response.data.Records) {
                        results = Array.isArray(response.data.Records) ? response.data.Records : [];
                    }
                }

                if (results && results.length > 0) {
                    this.currentResults = results;
                    this.renderResults(results);
                    this.setResultsState('results');
                } else {
                    this.setResultsState('empty');
                }
            } catch (error) {
                console.error('[SearchModal] Search error:', error);
                this.setResultsState('error', error.message || 'Search failed');
            }
        }

        /**
         * Build search criteria from input fields
         * @returns {string} SQL-like search criteria string
         */
        buildSearchCriteria() {
            const inputs = document.querySelectorAll('.search-field-input');
            const criteria = [];

            inputs.forEach(input => {
                const value = input.value.trim();
                if (value) {
                    const field = input.dataset.field;
                    const operator = document.querySelector(`.search-field-operator[data-field="${field}"]`)?.value || 'like';

                    let condition = '';
                    switch (operator) {
                        case 'equals':
                            condition = `${field} = '${value}'`;
                            break;
                        case 'startswith':
                            condition = `${field} LIKE '${value}%'`;
                            break;
                        case 'endswith':
                            condition = `${field} LIKE '%${value}'`;
                            break;
                        case 'like':
                        default:
                            condition = `${field} LIKE '%${value}%'`;
                            break;
                    }
                    criteria.push(condition);
                }
            });

            return criteria.join(' AND ');
        }

        /**
         * Render search results in table
         * @param {Array} results - Array of result records
         */
        renderResults(results) {
            if (!results || results.length === 0) return;

            const headerEl = document.getElementById('search-results-header');
            const bodyEl = document.getElementById('search-results-body');
            const countEl = document.getElementById('results-count');

            // Clear previous results
            headerEl.innerHTML = '';
            bodyEl.innerHTML = '';

            // Get column names from first result
            const columns = Object.keys(results[0]);

            // Render header
            columns.forEach(col => {
                const th = document.createElement('th');
                th.textContent = col;
                headerEl.appendChild(th);
            });

            // Render rows
            results.forEach((row, index) => {
                const tr = document.createElement('tr');
                tr.dataset.index = index;

                columns.forEach(col => {
                    const td = document.createElement('td');
                    td.textContent = row[col] ?? '';
                    tr.appendChild(td);
                });

                // Row click handler
                tr.addEventListener('click', () => this.selectRow(index));

                // Double-click to select immediately
                tr.addEventListener('dblclick', () => {
                    this.selectRow(index);
                    this.selectAndClose();
                });

                bodyEl.appendChild(tr);
            });

            // Update count
            if (countEl) {
                countEl.textContent = `${results.length} record${results.length !== 1 ? 's' : ''}`;
            }

            console.log('[SearchModal] Rendered', results.length, 'results');
        }

        /**
         * Select a row by index
         * @param {number} index - Row index
         */
        selectRow(index) {
            // Remove previous selection
            document.querySelectorAll('#search-results-body tr').forEach(r => {
                r.classList.remove('selected');
            });

            // Mark current row as selected
            const row = document.querySelector(`#search-results-body tr[data-index="${index}"]`);
            if (row) {
                row.classList.add('selected');
            }

            // Store selected data
            this.selectedRow = this.currentResults[index];

            // Enable select button
            const selectBtn = document.getElementById('search-select-btn');
            if (selectBtn) selectBtn.disabled = false;

            console.log('[SearchModal] Row selected:', this.selectedRow);
        }

        /**
         * Set results display state
         * @param {string} state - 'loading', 'results', 'empty', or 'error'
         * @param {string} [errorMessage] - Error message (for error state)
         */
        setResultsState(state, errorMessage = '') {
            const loadingEl = document.getElementById('search-loading');
            const resultsEl = document.getElementById('search-results-container');
            const emptyEl = document.getElementById('search-empty-state');
            const errorEl = document.getElementById('search-error-state');

            // Hide all states
            loadingEl.style.display = 'none';
            resultsEl.style.display = 'none';
            emptyEl.style.display = 'none';
            errorEl.style.display = 'none';

            // Show appropriate state
            switch (state) {
                case 'loading':
                    loadingEl.style.display = 'flex';
                    break;
                case 'results':
                    resultsEl.style.display = 'block';
                    break;
                case 'empty':
                    emptyEl.style.display = 'flex';
                    break;
                case 'error':
                    errorEl.style.display = 'flex';
                    const errorMsgEl = document.getElementById('search-error-message');
                    if (errorMsgEl) errorMsgEl.textContent = errorMessage || 'An error occurred';
                    break;
            }
        }

        /**
         * Clear all search criteria fields
         */
        clearCriteria() {
            document.querySelectorAll('.search-field-input').forEach(input => {
                input.value = '';
            });

            document.querySelectorAll('.search-field-operator').forEach(select => {
                select.value = 'like';
            });

            // Clear results
            this.setResultsState('empty');
            this.selectedRow = null;
            this.currentResults = [];

            const selectBtn = document.getElementById('search-select-btn');
            if (selectBtn) selectBtn.disabled = true;

            console.log('[SearchModal] Criteria cleared');
        }

        /**
         * Select current row and close modal
         */
        selectAndClose() {
            if (this.selectedRow) {
                console.log('[SearchModal] Selecting row:', this.selectedRow);

                // Call onSelect callback if provided
                if (this.currentConfig?.onSelect) {
                    this.currentConfig.onSelect(this.selectedRow);
                }

                // Resolve promise
                if (this.resolveSelection) {
                    this.resolveSelection(this.selectedRow);
                }
            }

            this.close();
        }

        /**
         * Close the modal without selection
         */
        close() {
            if (this.bootstrapModal) {
                this.bootstrapModal.hide();
            }
        }

        /**
         * Cleanup modal after it's hidden
         */
        cleanupModal() {
            if (this.overlayElement) {
                this.overlayElement.remove();
            }

            this.modalElement = null;
            this.overlayElement = null;
            this.bootstrapModal = null;
            this.isInitialized = false;
            this.selectedRow = null;
            this.currentResults = [];

            if (this.resolveSelection) {
                this.resolveSelection(null);
                this.resolveSelection = null;
            }

            console.log('[SearchModal] Modal closed and cleaned up');
        }

        /**
         * Show toast notification (if available)
         */
        showToast(message, type = 'info') {
            if (this.appCore?.showToast) {
                this.appCore.showToast(message, type);
            } else {
                console.log(`[SearchModal] ${type.toUpperCase()}: ${message}`);
            }
        }
    }

    // Export to global scope
    global.SearchModal = SearchModal;

    console.log('✅ SearchModal loaded and ready');

})(window);
