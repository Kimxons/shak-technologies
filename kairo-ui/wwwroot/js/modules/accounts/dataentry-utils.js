/**
 * DataEntry Forms - Shared Utilities
 * Money and date formatting utilities for Account Maintenance DataEntry forms
 */

(function(global) {
    'use strict';

    const DataEntryUtils = {
        /**
         * Format a value as money with commas and 2 decimal places
         * @param {*} value - The value to format
         * @returns {string} Formatted money string or '0.00' if invalid
         */
        formatMoney(value) {
            if (value === null || value === undefined || value === '') return '0.00';
            
            let num;
            if (typeof value === 'number') {
                num = value;
            } else if (typeof value === 'string') {
                const cleaned = value.replace(/,/g, '').trim();
                num = parseFloat(cleaned);
            } else {
                num = parseFloat(value);
            }
            
            if (isNaN(num)) {
                console.warn('[DataEntryUtils.formatMoney] Invalid number:', value);
                return '0.00';
            }
            
            return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },

        /**
         * Parse money input by removing commas
         * @param {*} value - The value to parse
         * @returns {string} Cleaned value
         */
        parseMoneyInput(value) {
            if (value === null || value === undefined || value === '') return '';
            return String(value).replace(/,/g, '').trim();
        },

        /**
         * Format a date value as "DD Mon YYYY"
         * @param {*} value - The date value to format
         * @returns {string} Formatted date string or empty string
         */
        formatDate(value) {
            if (!value) return '';
            
            let dateObj;
            if (value instanceof Date) {
                dateObj = value;
            } else if (typeof value === 'string') {
                const trimmed = value.trim();
                if (!trimmed) return '';
                
                if (trimmed.includes('-')) {
                    dateObj = new Date(trimmed);
                } else if (trimmed.includes('/')) {
                    const parts = trimmed.split('/');
                    if (parts.length === 3) {
                        const month = parseInt(parts[0], 10) - 1;
                        const day = parseInt(parts[1], 10);
                        const year = parseInt(parts[2], 10);
                        dateObj = new Date(year, month, day);
                    }
                }
            }
            
            if (!dateObj || isNaN(dateObj.getTime())) {
                console.warn('[DataEntryUtils.formatDate] Invalid date:', value);
                return value;
            }
            
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const day = dateObj.getDate();
            const month = monthNames[dateObj.getMonth()];
            const year = dateObj.getFullYear();
            
            return `${day} ${month} ${year}`;
        },

        /**
         * Wire money fields with blur/focus handlers
         * @param {string|string[]} selectors - CSS selectors for money fields
         */
        wireMoneyFields(selectors) {
            const defaultSelectors = [
                'input[id*="Balance"]',
                'input[id*="balance"]',
                'input[id*="Amount"]',
                'input[id*="amount"]',
                'input[id*="Credits"]',
                'input[id*="Debits"]',
                'input[id*="Interest"]',
                'input[id*="Power"]',
                'input[id*="Charge"]',
                'input[id*="Fee"]',
                'input.money-field',
                'input[data-format="money"]',
                'input[data-format="currency"]'
            ];

            const selectorList = Array.isArray(selectors) ? selectors : defaultSelectors;
            
            document.querySelectorAll(selectorList.join(',')).forEach(field => {
                field.addEventListener('blur', function() {
                    if (this.value) {
                        this.value = DataEntryUtils.formatMoney(this.value);
                    }
                });

                field.addEventListener('focus', function() {
                    if (this.value) {
                        this.value = DataEntryUtils.parseMoneyInput(this.value);
                    }
                });
            });
        },

        /**
         * Wire date fields with blur handler
         * @param {string|string[]} selectors - CSS selectors for date fields
         */
        wireDateFields(selectors) {
            const defaultSelectors = [
                'input[id*="Date"]',
                'input[id*="date"]',
                'input[id*="On"]',
                'input.date-field',
                'input[data-format="date"]'
            ];

            const selectorList = Array.isArray(selectors) ? selectors : defaultSelectors;
            
            document.querySelectorAll(selectorList.join(',')).forEach(field => {
                // Skip balance/rate/amount fields that might have "Date" in their ID
                if (field.id && (field.id.includes('Balance') || field.id.includes('Rate') || field.id.includes('Amount'))) {
                    return;
                }

                // Skip native date inputs (type="date") as they have their own format requirements
                if (field.type === 'date') {
                    return;
                }

                field.addEventListener('blur', function() {
                    if (this.value) {
                        this.value = DataEntryUtils.formatDate(this.value);
                    }
                });
            });
        },

        /**
         * Reformat all money and date fields on the page
         */
        reformatAllFields() {
            // Money fields
            const moneySelectors = [
                'input[id*="Balance"]',
                'input[id*="balance"]',
                'input[id*="Amount"]',
                'input[id*="amount"]',
                'input[id*="Credits"]',
                'input[id*="Debits"]',
                'input[id*="Interest"]',
                'input[id*="Power"]',
                'input[id*="Charge"]',
                'input[id*="Fee"]',
                'input.money-field',
                'input[data-format="money"]',
                'input[data-format="currency"]'
            ];

            document.querySelectorAll(moneySelectors.join(',')).forEach(field => {
                const formatted = DataEntryUtils.formatMoney(field.value);
                field.value = formatted;
            });

            // Date fields
            const dateSelectors = [
                'input[id*="Date"]',
                'input[id*="date"]',
                'input[id*="On"]',
                'input.date-field',
                'input[data-format="date"]'
            ];

            document.querySelectorAll(dateSelectors.join(',')).forEach(field => {
                // Skip balance/rate/amount fields
                if (field.id && (field.id.includes('Balance') || field.id.includes('Rate') || field.id.includes('Amount'))) {
                    return;
                }

                // Skip native date inputs (type="date") as they have their own format requirements
                if (field.type === 'date') {
                    return;
                }

                if (field.value) {
                    field.value = DataEntryUtils.formatDate(field.value);
                }
            });
        }
    };

    // Export to global scope
    global.DataEntryUtils = DataEntryUtils;

    /**
     * Search modal functionality
     */
    DataEntryUtils.Search = {
        /**
         * Create and show a search modal
         * @param {Object} config - Configuration object
         * @param {string} config.type - Type of search (client, account, product)
         * @param {string} config.targetInputId - ID of input to populate with result
         * @param {string} config.targetNameId - ID of name input to populate
         */
        showSearchModal(config) {
            const { type, targetInputId, targetNameId } = config;
            
            // Check if modal already exists
            let modalId = `${type}SearchModal`;
            let modal = document.getElementById(modalId);
            
            if (!modal) {
                modal = DataEntryUtils.Search.createSearchModal(config);
                document.body.appendChild(modal);
            }
            
            // Show modal
            const ModalCtor = window.bootstrap?.Modal;
            if (!ModalCtor) {
                console.error('[DataEntryUtils] Bootstrap Modal not available');
                return;
            }
            
            const modalInstance = ModalCtor.getOrCreateInstance(modal);
            modalInstance.show();
            
            // Focus search input
            setTimeout(() => {
                const searchInput = modal.querySelector(`#${type}SearchId`);
                if (searchInput) searchInput.focus();
            }, 300);
            
            // Reset search
            DataEntryUtils.Search.resetSearch(type);
        },

        /**
         * Create a search modal element
         * @param {Object} config - Configuration object
         * @returns {HTMLElement} Modal element
         */
        createSearchModal(config) {
            const { type, targetInputId, targetNameId } = config;
            const modalId = `${type}SearchModal`;
            
            const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
            
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.id = modalId;
            modal.setAttribute('tabindex', '-1');
            modal.setAttribute('aria-hidden', 'true');
            
            modal.innerHTML = `
                <div class="modal-dialog modal-lg modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white d-flex justify-content-between align-items-center">
                            <div>
                                <p class="mb-0 small">Search</p>
                                <h5 class="modal-title">Find ${typeLabel}</h5>
                            </div>
                            <div class="d-flex gap-2 align-items-center">
                                <button type="button" class="btn btn-sm btn-outline-light" id="${type}SearchRefresh" aria-label="Refresh">
                                    <i class="bi bi-arrow-clockwise"></i>
                                </button>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                        </div>
                        <div class="modal-body">
                            <form class="row g-3 align-items-end mb-3" id="${type}SearchForm">
                                <div class="col-md-4">
                                    <label class="form-label">${typeLabel} ID</label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="${type}SearchModeId">
                                            <option value="Like">Contains</option>
                                            <option value="Exact">Exact</option>
                                        </select>
                                        <input type="text" class="form-control" id="${type}SearchId" placeholder="Search ID" />
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Name</label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="${type}SearchModeName">
                                            <option value="Like">Contains</option>
                                            <option value="Exact">Exact</option>
                                        </select>
                                        <input type="text" class="form-control" id="${type}SearchName" placeholder="Search name" />
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button type="button" class="btn btn-outline-secondary btn-sm" id="${type}SearchReset">Reset</button>
                                    <button type="submit" class="btn btn-primary btn-sm" id="${type}SearchSubmit">
                                        <i class="bi bi-search"></i> Search
                                    </button>
                                </div>
                            </form>
                            <div class="position-relative">
                                <div class="table-responsive">
                                    <table class="table table-sm table-hover align-middle mb-0">
                                        <thead>
                                            <tr>
                                                <th scope="col">${typeLabel} ID</th>
                                                <th scope="col">Name</th>
                                                <th scope="col" class="text-end">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody id="${type}SearchResults"></tbody>
                                    </table>
                                </div>
                                <div id="${type}SearchEmpty" class="text-center py-5 text-muted">
                                    Enter search criteria and click Search.
                                </div>
                                <div id="${type}SearchLoading" class="d-none position-absolute top-50 start-50 translate-middle">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <small class="text-muted me-auto">Search results</small>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Wire search handlers
            DataEntryUtils.Search.wireSearchHandlers(modal, type, targetInputId, targetNameId);
            
            return modal;
        },

        /**
         * Wire search modal event handlers
         */
        wireSearchHandlers(modal, type, targetInputId, targetNameId) {
            const form = modal.querySelector(`#${type}SearchForm`);
            const submitBtn = modal.querySelector(`#${type}SearchSubmit`);
            const resetBtn = modal.querySelector(`#${type}SearchReset`);
            const refreshBtn = modal.querySelector(`#${type}SearchRefresh`);
            
            const performSearch = () => DataEntryUtils.Search.performSearch(type, targetInputId, targetNameId);
            const resetSearch = () => DataEntryUtils.Search.resetSearch(type);
            
            if (form) form.addEventListener('submit', (e) => { e.preventDefault(); performSearch(); });
            if (submitBtn) submitBtn.addEventListener('click', performSearch);
            if (resetBtn) resetBtn.addEventListener('click', resetSearch);
            if (refreshBtn) refreshBtn.addEventListener('click', resetSearch);
        },

        /**
         * Perform search
         */
        async performSearch(type, targetInputId, targetNameId) {
            const idValue = (document.getElementById(`${type}SearchId`)?.value || '').trim();
            const nameValue = (document.getElementById(`${type}SearchName`)?.value || '').trim();
            const idMode = document.getElementById(`${type}SearchModeId`)?.value || 'Like';
            const nameMode = document.getElementById(`${type}SearchModeName`)?.value || 'Like';
            const results = document.getElementById(`${type}SearchResults`);
            const empty = document.getElementById(`${type}SearchEmpty`);
            const loading = document.getElementById(`${type}SearchLoading`);

            if (results) results.innerHTML = '';
            if (empty) empty.style.display = 'none';
            if (loading) loading.classList.remove('d-none');

            const clauses = [];
            const buildClause = (col, mode, val) => {
                if (!val) return null;
                const safe = val.replace(/'/g, "''");
                return mode === 'Exact' ? `${col} = '${safe}'` : `${col} like '%${safe}%'`;
            };

            let idColumn, nameColumn, tableID;
            if (type === 'client') {
                idColumn = 'clientId';
                nameColumn = 'Name';
                tableID = 'clientId';
            } else if (type === 'account') {
                idColumn = 'AccountID';
                nameColumn = 'Description';
                tableID = 'AccountID';
            } else if (type === 'product') {
                idColumn = 'ProductID';
                nameColumn = 'Description';
                tableID = 'ProductID';
            }

            const idClause = buildClause(idColumn, idMode, idValue);
            const nameClause = buildClause(nameColumn, nameMode, nameValue);
            [idClause, nameClause].forEach(c => c && clauses.push(c));

            const whereStmt = clauses.join(' AND ') || (type === 'product' ? '1=1' : '');
            
            const payload = {
                TableID: tableID,
                WhereStmt: whereStmt,
                AdvFilterString: '',
                PrevOrNext: '1',
                RefID: '',
                OperatorID: 'web_portal',
                ModuleID: 1000,
                OurBranchID: ''
            };

            try {
                const service = window.ClientService || window.SearchService;
                if (!service || (typeof service.searchClients !== 'function' && typeof service.search !== 'function')) {
                    throw new Error('Search service not available');
                }
                
                const response = service.searchClients ? await service.searchClients(payload) : await service.search(payload);
                let rows = response?.Details?.SearchResults || response?.Details || response?.SearchResults || [];
                if (!Array.isArray(rows)) rows = rows ? [rows] : [];
                
                if (!rows.length) {
                    if (empty) {
                        empty.textContent = 'No results found.';
                        empty.style.display = 'block';
                    }
                    return;
                }
                
                if (results) {
                    results.innerHTML = rows.map((r, idx) => {
                        const id = r[idColumn.charAt(0).toUpperCase() + idColumn.slice(1)] || r[idColumn] || '';
                        const name = r[nameColumn] || r.Name || r.Description || '';
                        return `<tr data-result-index="${idx}">
                            <td>${id}</td>
                            <td>${name}</td>
                            <td class="text-end">
                                <button type="button" class="btn btn-sm btn-primary" data-result-index="${idx}">Select</button>
                            </td>
                        </tr>`;
                    }).join('');
                    
                    results.querySelectorAll('button[data-result-index]').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const idx = Number(btn.getAttribute('data-result-index'));
                            const row = rows[idx];
                            DataEntryUtils.Search.selectResult(row, type, targetInputId, targetNameId, idColumn, nameColumn);
                        });
                    });
                    
                    results.querySelectorAll('tr[data-result-index]').forEach(tr => {
                        tr.addEventListener('dblclick', () => {
                            const idx = Number(tr.getAttribute('data-result-index'));
                            const row = rows[idx];
                            DataEntryUtils.Search.selectResult(row, type, targetInputId, targetNameId, idColumn, nameColumn);
                        });
                    });
                }
            } catch (err) {
                console.error('[DataEntryUtils] Search failed:', err);
                if (empty) {
                    empty.textContent = err?.message || 'Search failed';
                    empty.style.display = 'block';
                }
            } finally {
                if (loading) loading.classList.add('d-none');
            }
        },

        /**
         * Select a search result
         */
        selectResult(row, type, targetInputId, targetNameId, idColumn, nameColumn) {
            const id = row[idColumn.charAt(0).toUpperCase() + idColumn.slice(1)] || row[idColumn] || '';
            const name = row[nameColumn] || row.Name || row.Description || '';
            
            const idInput = document.getElementById(targetInputId);
            const nameInput = document.getElementById(targetNameId);
            
            if (idInput) idInput.value = id;
            if (nameInput) nameInput.value = name;
            
            // Close modal
            const modal = document.getElementById(`${type}SearchModal`);
            if (modal && window.bootstrap?.Modal) {
                const modalInstance = window.bootstrap.Modal.getInstance(modal);
                if (modalInstance) modalInstance.hide();
            }
        },

        /**
         * Reset search form
         */
        resetSearch(type) {
            const form = document.getElementById(`${type}SearchForm`);
            const results = document.getElementById(`${type}SearchResults`);
            const empty = document.getElementById(`${type}SearchEmpty`);
            const loading = document.getElementById(`${type}SearchLoading`);
            
            if (form) form.reset();
            if (results) results.innerHTML = '';
            if (empty) {
                empty.style.display = 'block';
                empty.textContent = 'Enter search criteria and click Search.';
            }
            if (loading) loading.classList.add('d-none');
        },

        /**
         * Wire lookup buttons to show search modals
         */
        wireLookupButtons() {
            document.querySelectorAll('button[data-lookup-type][data-lookup-target]').forEach(btn => {
                btn.addEventListener('click', function() {
                    const type = this.getAttribute('data-lookup-type');
                    const targetInputId = this.getAttribute('data-lookup-target');
                    const targetNameId = this.getAttribute('data-lookup-target-name') || targetInputId.replace(/ID$/i, 'Name');
                    
                    if (type && targetInputId) {
                        DataEntryUtils.Search.showSearchModal({
                            type,
                            targetInputId,
                            targetNameId
                        });
                    }
                });
            });
        }
    };

    // Auto-initialize on DOM load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            DataEntryUtils.wireMoneyFields();
            DataEntryUtils.wireDateFields();
            DataEntryUtils.Search.wireLookupButtons();
        });
    } else {
        DataEntryUtils.wireMoneyFields();
        DataEntryUtils.wireDateFields();
        DataEntryUtils.Search.wireLookupButtons();
    }

})(window);
