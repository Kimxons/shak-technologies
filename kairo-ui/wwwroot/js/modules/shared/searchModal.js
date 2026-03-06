/**
 * Search Modal - Theme-aware, App-Core integrated
 * Reusable search modal that works with MVC SearchModal controller
 * 
 * Dependencies:
 * - app-core.js (AppCore global object)
 * - SearchModal view from Views/Shared/_SearchModal.cshtml
 * 
 * Usage:
 * const searchModal = new SearchModal(window.AppCore);
 * searchModal.open({ 
 *   tableID: 'ClientID', 
 *   onSelect: (row) => { console.log('Selected:', row); }
 * });
 */

(function (global) {
    'use strict';

    class SearchModal {
        constructor(appCore) {
            // Support both direct injection and global fallback
            this.appCore = appCore || global.AppCore || window.AppCore;

            if (!this.appCore) {
                console.error('[SearchModal] AppCore is required but not found in arguments or globally');
            }

            this.modalElement = null;
            this.isInitialized = false;
            this.currentConfig = null;
            this.selectedRow = null;
            this.currentResults = [];
            this.currentPage = 0;
            this.refID = ''; // Last value of KeyForNavigation for cursor-based pagination
            this.prevOrNext = 0; // 0 = default/first, 1 = next, -1 = previous
            this.pageSize = 20; // Default page size
            this.keyForNavigation = ''; // Field name for navigation key
        }

        /**
         * Load search modal HTML from controller and initialize
         */
        async loadModal(tableID, options = {}) {
            try {
                console.log('[SearchModal] Loading modal for TableID:', tableID);

                const queryParams = {
                    TableID: tableID,
                    WhereStmt: options.whereStmt || '',
                    AdvFilterString: options.advFilterString || '',
                    SearchKey: options.searchKey || '',
                    ModuleID: options.moduleID || '100',
                    PrevOrNext: 0,
                    PageSize: options.pageSize || 20,
                    OurBranchID: options.ourbranchId || null
                };

                // Use AppCore to load the partial view
                const html = await this.appCore.invokeControllerGetViewAsync('SearchModal/Index', queryParams);

                if (!html || typeof html !== 'string') {
                    throw new Error('Failed to load search modal HTML');
                }

                console.log('[SearchModal] Modal HTML loaded successfully');

                // CRITICAL: Remove existing modal AND hidden fields before inserting new ones
                const existingModal = document.getElementById('search-modal');
                if (existingModal) {
                    existingModal.remove();
                }

                // Remove all hidden fields to prevent duplicates
                const hiddenFieldIds = [
                    'search-table-id',
                    'search-where-stmt',
                    'search-adv-filter',
                    'search-module-id',
                    'search-key-for-nav',
                    'search-ref-id',
                    'search-prev-or-next'
                ];

                hiddenFieldIds.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (field) {
                        field.remove();
                        console.log('[SearchModal] Removed old hidden field before loading:', fieldId);
                    }
                });

                // Insert modal HTML into DOM
                document.body.insertAdjacentHTML('beforeend', html);

                // Get modal element
                this.modalElement = document.getElementById('search-modal');

                if (!this.modalElement) {
                    throw new Error('Modal element not found after insertion');
                }

                // Store keyForNavigation field name
                const keyForNavField = document.getElementById('search-key-for-nav')?.value;
                if (keyForNavField) {
                    this.keyForNavigation = keyForNavField;
                    console.log('[SearchModal] KeyForNavigation field:', this.keyForNavigation);
                }

                // Attach event listeners
                this.attachEventListeners();

                this.isInitialized = true;
                console.log('[SearchModal] Modal loaded and initialized');

                return true;
            } catch (error) {
                console.error('[SearchModal] Load error:', error);
                throw error;
            }
        }

        /**
         * Attach all event listeners to modal elements
         */
        attachEventListeners() {
            const closeBtn = document.getElementById('search-modal-close');
            const searchBtn = document.getElementById('search-modal-search-btn');
            const okBtn = document.getElementById('search-modal-ok');
            const prevBtn = document.getElementById('search-modal-nav-prev');
            const nextBtn = document.getElementById('search-modal-nav-next');

            // Close handler
            closeBtn?.addEventListener('click', () => this.close());

            // Search handler (reset pagination for new search)
            searchBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                this.refID = ''; // Reset pagination for new search
                this.prevOrNext = 0;
                this.executeSearch();
            });

            // OK/Select handler
            okBtn?.addEventListener('click', () => {
                if (this.selectedRow) {
                    this.selectAndClose();
                }
            });

            // Navigation handlers
            prevBtn?.addEventListener('click', () => this.previousPage());
            nextBtn?.addEventListener('click', () => this.nextPage());

            // Close on modal click (overlay)
            this.modalElement?.addEventListener('click', (e) => {
                if (e.target === this.modalElement) {
                    this.close();
                }
            });

            // Enter key in search fields
            const searchInputs = document.querySelectorAll('[data-field]');
            searchInputs.forEach(input => {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.refID = ''; // Reset pagination for new search
                        this.prevOrNext = 0;
                        this.executeSearch();
                    }
                });
            });

            // Row selection
            this.attachRowClickHandlers();
        }

        /**
         * Open the search modal
         */
        async open(config) {
            try {
                if (!config || !config.tableID) {
                    throw new Error('tableID is required');
                }

                if (!this.appCore) {
                     this.appCore = window.AppCore;
                }

                // Check if reload is needed (different TableID or not initialized)
                const shouldReload = !this.isInitialized || 
                                   (this.currentConfig && this.currentConfig.tableID !== config.tableID);

                this.currentConfig = config;

                // Load modal if needed
                if (shouldReload) {
                    // Start fresh if reloading for a new table
                    if (this.isInitialized) {
                         // Reset state but keep the instance structure
                         this.currentResults = [];
                         this.selectedRow = null; 
                         this.currentPage = 0;
                         // Note: loadModal will replace the DOM element
                    }

                    await this.loadModal(config.tableID, {
                        whereStmt: config.whereStmt,
                        advFilterString: config.advFilterString,
                        searchKey: config.searchKey,
                        moduleID: config.moduleID,
                        prevOrNext: config.prevOrNext,
                        pageSize: config.pageSize,
                        ourbranchId: config.ourbranchId
                    });
                } else {
                    // CRITICAL: Update hidden fields even if we skip reload
                    const whereInput = document.getElementById('search-where-stmt');
                    if (whereInput) {
                        whereInput.value = config.whereStmt || '';
                        console.log('[SearchModal] Updated existing WhereStmt in DOM:', whereInput.value);
                    }

                    const advInput = document.getElementById('search-adv-filter');
                    if (advInput) advInput.value = config.advFilterString || '';
                }

                // Show modal
                if (this.modalElement) {
                    this.modalElement.style.display = 'flex';
                    console.log('[SearchModal] Modal opened');
                }

                // Auto-search if searchKey OR whereStmt provided (ensures filtered lookups show results immediately)
                if (config.searchKey || config.whereStmt) {
                    console.log('[SearchModal] Auto-triggering search...');
                    setTimeout(() => this.executeSearch(), 300);
                }

            } catch (error) {
                console.error('[SearchModal] Open error:', error);
                this.appCore.showToastMessage?.('Failed to open search modal', 'error');
                throw error;
            }
        }

        /**
         * Execute search using app-core controller
         */
        async executeSearch() {
            const loadingEl = document.getElementById('search-modal-loading');
            const resultsEl = document.getElementById('search-modal-results');
            const emptyEl = document.getElementById('search-modal-empty');

            try {
                // Show loading state
                this.showState('loading');

                // Build filter criteria from form
                const filters = this.buildFilters();

                const tableID = document.getElementById('search-table-id')?.value;
                const whereStmt = document.getElementById('search-where-stmt')?.value || '';
                const advFilter = document.getElementById('search-adv-filter')?.value || '';
                const moduleID = document.getElementById('search-module-id')?.value || '1000';

                console.log('[SearchModal] ✅ READING HIDDEN FIELDS - TableID:', tableID, '| WhereStmt:', whereStmt);

                // Get page size from dropdown
                const pageSizeDropdown = document.getElementById('search-page-size');
                this.pageSize = pageSizeDropdown ? parseInt(pageSizeDropdown.value) : 20;
                document.getElementById('search-ref-id').value = this.refID;
                document.getElementById('search-prev-or-next').value = this.prevOrNext;

                console.log('[SearchModal] Executing search:', { tableID, filters, whereStmt, PageSize: this.pageSize, RefID: this.refID, PrevOrNext: this.prevOrNext });

                // Use AppCore to invoke controller with key-set pagination parameters
                const response = await this.appCore.invokeControllerAsync('SearchModal/Search', {
                    TableID: tableID,
                    WhereStmt: whereStmt,
                    AdvFilterString: advFilter,
                    SearchKey: filters,
                    ModuleID: moduleID,
                    PageSize: this.pageSize,
                    RefID: this.refID,
                    PrevOrNext: this.prevOrNext,
                    OurBranchID: this.currentConfig.ourbranchId || null
                });

                console.log('[SearchModal] Search response:', response);

                // Extract results
                let results = [];
                if (response?.success && response?.data) {
                    if (Array.isArray(response.data)) {
                        results = response.data;
                    } else if (response.data.Details) {
                        results = Array.isArray(response.data.Details) ? response.data.Details : [response.data.Details];
                    } else if (response.data.details) {
                        results = Array.isArray(response.data.details.SearchResults) ? response.data.details.SearchResults : [response.data.details.SearchResults];
                    } else if (response.data.Records) {
                        results = Array.isArray(response.data.Records) ? response.data.Records : [];
                    }
                }

                if (results && results.length > 0) {
                    this.currentResults = results;
                    this.currentPage = 0;
                    
                    // Extract the last value of KeyForNavigation from results for next pagination
                    const keyField = document.getElementById('search-key-for-nav')?.value;
                    if (keyField && results.length > 0) {
                        const lastRow = results[results.length - 1];
                        this.refID = lastRow[keyField] || '';
                        console.log('[SearchModal] Updated RefID:', this.refID);
                    }
                    
                    this.renderResults(results);
                    this.showState('results');
                } else {
                    this.showState('empty');
                }

            } catch (error) {
                console.error('[SearchModal] Search error:', error);
                this.showState('empty');
                this.appCore.showToastMessage?.('Search failed: ' + error.message, 'error');
            }
        }

        /**
         * Build filter criteria from form inputs
         */
        buildFilters() {
            const form = document.getElementById('search-modal-form');
            const filters = {};

            const selects = form?.querySelectorAll('[data-field]');
            selects?.forEach(input => {
                const fieldName = input.getAttribute('data-field');
                const value = input.value?.trim();

                if (value && input.tagName !== 'SELECT') {
                    const selectEl = form.querySelector(`select[data-field="${fieldName}"]`);
                    const mode = selectEl?.value || 'like';

                    filters[fieldName] = {
                        value: value,
                        mode: mode
                    };
                }
            });

            /*return JSON.stringify(filters);*/
            return filters;
        }

        /**
         * Render search results in table format
         */
        renderResults(results) {
            if (!results || results.length === 0) return;

            const resultsEl = document.getElementById('search-modal-results');
            resultsEl.innerHTML = '';

            const columns = Object.keys(results[0]);

            // Create table
            const table = document.createElement('table');
            table.className = 'search-modal-themed__table';

            // Header
            const headerRow = document.createElement('tr');
            columns.forEach(col => {
                const th = document.createElement('th');
                th.className = 'search-modal-themed__th';
                th.textContent = col;
                headerRow.appendChild(th);
            });
            table.appendChild(headerRow);

            // Body
            const tbody = document.createElement('tbody');
            results.forEach((row, index) => {
                const tr = document.createElement('tr');
                tr.className = index % 2 === 0 ? 'search-modal-themed__tr' : 'search-modal-themed__tr search-modal-themed__tr--odd';
                tr.dataset.index = index;
                tr.dataset.rowData = JSON.stringify(row);

                columns.forEach(col => {
                    const td = document.createElement('td');
                    td.className = 'search-modal-themed__td';
                    td.textContent = row[col] ?? '';
                    tr.appendChild(td);
                });

                // Double-click to select
                tr.addEventListener('dblclick', () => {
                    this.selectRow(index);
                    this.selectAndClose();
                });

                // Click to select
                tr.addEventListener('click', () => this.selectRow(index));

                tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            resultsEl.appendChild(table);

            // Attach row click handlers
            this.attachRowClickHandlers();
        }

        /**
         * Attach click handlers for result rows
         */
        attachRowClickHandlers() {
            const rows = document.querySelectorAll('[data-row-data]');
            rows.forEach(row => {
                row.addEventListener('click', () => {
                    const index = parseInt(row.dataset.index);
                    this.selectRow(index);
                });
            });
        }

        /**
         * Select a row by index
         */
        selectRow(index) {
            // Remove previous selection
            document.querySelectorAll('[data-row-data]').forEach(row => {
                row.classList.remove('search-modal-themed__tr--selected');
            });

            // Select current row
            const row = document.querySelector(`[data-row-data][data-index="${index}"]`);
            if (row) {
                row.classList.add('search-modal-themed__tr--selected');
                const rowData = row.getAttribute('data-row-data');
                this.selectedRow = JSON.parse(rowData);
                console.log('[SearchModal] Row selected:', this.selectedRow);
            }
        }

        /**
         * Show/hide state
         */
        showState(state) {
            const loadingEl = document.getElementById('search-modal-loading');
            const resultsEl = document.getElementById('search-modal-results');
            const emptyEl = document.getElementById('search-modal-empty');

            // Hide all
            if (loadingEl) loadingEl.style.display = 'none';
            if (resultsEl) resultsEl.style.display = 'none';
            if (emptyEl) emptyEl.style.display = 'none';

            // Show appropriate state
            switch (state) {
                case 'loading':
                    if (loadingEl) loadingEl.style.display = 'block';
                    break;
                case 'results':
                    if (resultsEl) resultsEl.style.display = 'block';
                    break;
                case 'empty':
                    if (emptyEl) emptyEl.style.display = 'block';
                    break;
            }
        }

        /**
         * Previous page (key-set based pagation)
         */
        async previousPage() {
            this.prevOrNext = -1;
            await this.executeSearch();
        }

        /**
         * Next page (key-set based pagination)
         */
        async nextPage() {
            this.prevOrNext = 1;
            await this.executeSearch();
        }

        /**
         * Select row and close modal
         */
        selectAndClose() {
            if (this.selectedRow) {
                console.log('[SearchModal] Selecting row:', this.selectedRow);

                // Call onSelect callback if provided
                if (this.currentConfig?.onSelect) {
                    this.currentConfig.onSelect(this.selectedRow);
                }
            }

            this.close();
        }

        /**
         * Close the modal
         */
        close() {
            if (this.modalElement) {
                this.modalElement.style.display = 'none';
                console.log('[SearchModal] Modal closed');
            }
        }

        /**
         * Destroy modal (remove from DOM)
         */
        destroy() {
            if (this.modalElement) {
                this.modalElement.remove();
            }

            this.modalElement = null;
            this.isInitialized = false;
            this.selectedRow = null;
            this.currentResults = [];

            console.log('[SearchModal] Modal destroyed');
        }
    }

    // Export to global scope
    global.SearchModal = SearchModal;

    console.log('✅ SearchModal loaded and ready');

})(window);
