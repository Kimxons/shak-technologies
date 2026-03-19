(function () {
    'use strict';

    const MODES = { VIEW: 'View', ADD: 'Add', EDIT: 'Edit' };
    const SECTION_LABELS = {
        banks: 'Bank Details',
        limits: 'Bank Limit Maintenance',
        signatories: 'Clearing Bank Signatories',
        branches: 'Clearing Branches'
    };
    const LOOKUP_CONFIG = {
        bank: {
            tableID: 'MastClrBankID',
            moduleID: '2015'
        },
        signatory: {
            tableID: 'BankSignatoryID',
            moduleID: '2016'
        },
        client: {
            tableID: 'ClientID',
            moduleID: '0'
        },
        currency: {
            tableID: 'MastCurrencyID'
        },
        branch: {
            tableID: 'ClearingBranchID',
            moduleID: '2020'
        }
    };

    const state = {
        mode: MODES.VIEW,
        activeSection: 'banks',
        bankLoaded: false,
        currentBankRow: null,
        currentBranchRow: null,
        currentSignatoryRow: null,
        currentLimitRow: null,
        branchRows: [],
        signatoryRows: [],
        limitRows: [],
        bankUpdateCount: 0,
        branchUpdateCount: 0,
        signatoryUpdateCount: 0,
        limitUpdateCount: 0,
        canAdd: false
    };

    const service = window.OtherStaticDataService;
    let searchModal = null;
    let signatorySearchModal = null;
    let branchSearchModal = null;

    function qs(selector, root) {
        return (root || document).querySelector(selector);
    }

    function qsa(selector, root) {
        return Array.from((root || document).querySelectorAll(selector));
    }

    function normalizeNotificationType(type) {
        return type === 'danger' ? 'error' : (type || 'info');
    }

    function showToast(message, type) {
        if (window.AppCore && typeof window.AppCore.showNotification === 'function') {
            window.AppCore.showNotification(message, normalizeNotificationType(type));
            return;
        }

        if (window.NotificationService && typeof window.NotificationService.showToast === 'function') {
            window.NotificationService.showToast(message, normalizeNotificationType(type), type === 'danger' ? 5000 : 3000);
            return;
        }
        console[type === 'danger' ? 'error' : 'log'](message);
    }

    async function showAlertDialog(title, message) {
        if (window.AppCore && typeof window.AppCore.showAlert === 'function') {
            await window.AppCore.showAlert(title, message);
            return;
        }

        showToast(message, title === 'Error' ? 'danger' : 'warning');
    }

    async function showConfirmationDialog(title, message) {
        if (window.AppCore && typeof window.AppCore.showConfirmation === 'function') {
            return window.AppCore.showConfirmation(title, message);
        }

        return window.confirm(message);
    }

    function getEnv() {
        const e = window.Environment || {};
        let session = null;
        try {
            const raw = localStorage.getItem('nimble_auth_session');
            if (raw) {
                session = JSON.parse(raw);
            }
        } catch (_) {
            session = null;
        }

        session = session || {};

        const ourBranchId = String(
            e.OurBranchID || e.branchID || e.branchId ||
            sessionStorage.getItem('BranchID') || sessionStorage.getItem('OurBranchID') || sessionStorage.getItem('currentBranchId') ||
            session.branchID || session.BranchID || session.OurBranchID ||
            localStorage.getItem('BranchID') || '0101'
        ).trim();

        const operatorId = String(
            e.operatorID || e.operatorId || e.UserID ||
            sessionStorage.getItem('OperatorID') || sessionStorage.getItem('operatorId') ||
            session.operatorID || session.OperatorID ||
            localStorage.getItem('OperatorID') || 'CSADM'
        ).trim();

        return { ourBranchId: ourBranchId, operatorId: operatorId };
    }

    function getSectionRoot(sectionKey) {
        return qs('[data-section="' + sectionKey + '"]');
    }

    function getConfiguredInitialSection() {
        const moduleRoot = qs('#bankMasterModule');
        const configured = moduleRoot ? String(moduleRoot.getAttribute('data-initial-section') || '').trim().toLowerCase() : '';
        return Object.prototype.hasOwnProperty.call(SECTION_LABELS, configured) ? configured : 'banks';
    }

    async function invokeControllerRequest(endpoint, requestData) {
        if (window.AppCore && typeof window.AppCore.invokeControllerAsync === 'function') {
            return window.AppCore.invokeControllerAsync(endpoint, requestData || {});
        }

        const response = await fetch(endpoint.charAt(0) === '/' ? endpoint : ('/' + endpoint), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(requestData || {})
        });

        if (!response.ok) {
            throw new Error('Request failed.');
        }

        return response.json();
    }

    function initSearchModal() {
        if (!searchModal && typeof window.SearchModal === 'function' && window.AppCore) {
            searchModal = new window.SearchModal(window.AppCore);
        }
    }

    function ensureSearchModalStyles() {
        const existing = document.querySelector('link[href="/css/search-modal.css"]') ||
            document.querySelector('link[href$="/css/search-modal.css"]');
        if (existing) {
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/css/search-modal.css';
        link.setAttribute('data-bank-master-search-modal', '1');
        document.head.appendChild(link);
    }

    function removeSearchModalArtifacts() {
        const existingModal = document.getElementById('search-modal');
        if (existingModal) {
            existingModal.remove();
        }

        [
            'search-table-id',
            'search-where-stmt',
            'search-adv-filter',
            'search-module-id',
            'search-key-for-nav',
            'search-ref-id',
            'search-prev-or-next'
        ].forEach(function (fieldId) {
            const field = document.getElementById(fieldId);
            if (field) {
                field.remove();
            }
        });
    }

    function buildSignatorySearchModalHtml(options) {
        const settings = options || {};
        const pageSize = Number(settings.pageSize || 20);

        return '<div id="search-modal" class="search-modal-themed" ' +
            'style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; z-index:9999; justify-content:center; align-items:center;">' +
            '<div class="search-modal-themed__panel">' +
            '<div class="search-modal-themed__header">' +
            '<h5 id="search-modal-title" class="search-modal-themed__title">Search Bank Signatory</h5>' +
            '<button type="button" id="search-modal-close" class="search-modal-themed__close" aria-label="Close">&times;</button>' +
            '</div>' +
            '<div class="search-modal-themed__criteria-wrap">' +
            '<form id="search-modal-form" class="search-modal-themed__criteria">' +
            '<div class="search-modal-themed__field">' +
            '<label class="search-modal-themed__label">Signatory ID</label>' +
            '<div class="search-modal-themed__input-row">' +
            '<select class="search-modal-themed__select" data-field="SignatoryID" aria-label="Signatory ID Filter Type">' +
            '<option value="like" selected>Like</option>' +
            '<option value="equals">Equals</option>' +
            '<option value="startswith">Starts</option>' +
            '<option value="endswith">Ends</option>' +
            '</select>' +
            '<input type="text" class="search-modal-themed__input" data-field="SignatoryID" placeholder="Signatory ID" autocomplete="off" />' +
            '</div>' +
            '</div>' +
            '<div class="search-modal-themed__field">' +
            '<label class="search-modal-themed__label">Signatory Name</label>' +
            '<div class="search-modal-themed__input-row">' +
            '<select class="search-modal-themed__select" data-field="SignatoryName" aria-label="Signatory Name Filter Type">' +
            '<option value="like" selected>Like</option>' +
            '<option value="equals">Equals</option>' +
            '<option value="startswith">Starts</option>' +
            '<option value="endswith">Ends</option>' +
            '</select>' +
            '<input type="text" class="search-modal-themed__input" data-field="SignatoryName" placeholder="Signatory Name" autocomplete="off" />' +
            '</div>' +
            '</div>' +
            '</form>' +
            '<div class="search-modal-themed__actions">' +
            '<button type="button" id="search-modal-search-btn" class="search-modal-themed__btn search-modal-themed__btn--secondary">Search</button>' +
            '</div>' +
            '</div>' +
            '<div class="search-modal-themed__body">' +
            '<div id="search-modal-loading" class="search-modal-themed__loading" style="display:none;">Loading...</div>' +
            '<div id="search-modal-results" class="search-modal-themed__results" style="display:none;"></div>' +
            '<div id="search-modal-empty" class="search-modal-themed__empty" style="display:none;">No records found</div>' +
            '</div>' +
            '<div class="search-modal-themed__footer">' +
            '<div class="search-modal-themed__footer-left">' +
            '<button type="button" id="search-modal-nav-prev" class="search-modal-themed__btn search-modal-themed__btn--secondary" title="Previous record">' +
            '<i class="bi bi-chevron-left"></i> Previous</button>' +
            '</div>' +
            '<div class="search-modal-themed__footer-center">' +
            '<h5 class="search-modal-themed__footer-label">Page Size:</h5>' +
            '<select id="search-page-size" class="search-modal-themed__select" aria-label="Page Size" style="flex:0 0 auto; padding:4px 8px;">' +
            '<option value="10"' + (pageSize === 10 ? ' selected' : '') + '>10</option>' +
            '<option value="20"' + (pageSize === 20 ? ' selected' : '') + '>20</option>' +
            '<option value="50"' + (pageSize === 50 ? ' selected' : '') + '>50</option>' +
            '<option value="100"' + (pageSize === 100 ? ' selected' : '') + '>100</option>' +
            '<option value="1000"' + (pageSize === 1000 ? ' selected' : '') + '>1000</option>' +
            '</select>' +
            '<button type="button" id="search-modal-ok" class="search-modal-themed__btn search-modal-themed__btn--secondary">OK</button>' +
            '</div>' +
            '<div class="search-modal-themed__footer-right">' +
            '<button type="button" id="search-modal-nav-next" class="search-modal-themed__btn search-modal-themed__btn--secondary" title="Next record">Next <i class="bi bi-chevron-right"></i></button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<input type="hidden" id="search-table-id" value="BankSignatoryID" />' +
            '<input type="hidden" id="search-where-stmt" value="' + escapeHtml(settings.whereStmt || '') + '" />' +
            '<input type="hidden" id="search-adv-filter" value="' + escapeHtml(settings.advFilterString || '') + '" />' +
            '<input type="hidden" id="search-module-id" value="' + escapeHtml(settings.moduleID || '2016') + '" />' +
            '<input type="hidden" id="search-key-for-nav" value="SignatoryID" />' +
            '<input type="hidden" id="search-ref-id" value="" />' +
            '<input type="hidden" id="search-prev-or-next" value="0" />';
    }

    function getSignatoryFilterValue(row, fieldName) {
        if (String(fieldName || '').toLowerCase() === 'signatoryname') {
            return String(row.SignatoryName || '');
        }

        return String(row.SignatoryID || '');
    }

    function matchesSignatorySearchFilter(value, filter) {
        const source = String(value || '').toLowerCase();
        const query = String((filter && filter.value) || '').trim().toLowerCase();
        const mode = String((filter && filter.mode) || 'like').toLowerCase();

        if (!query) {
            return true;
        }

        if (mode === 'equals') {
            return source === query;
        }

        if (mode === 'startswith') {
            return source.indexOf(query) === 0;
        }

        if (mode === 'endswith') {
            return source.endsWith(query);
        }

        return source.indexOf(query) >= 0;
    }

    function filterSignatorySearchRows(rows, filters) {
        const entries = Object.entries(filters || {}).filter(function (entry) {
            return entry[1] && String(entry[1].value || '').trim();
        });

        if (!entries.length) {
            return rows.slice();
        }

        return rows.filter(function (row) {
            return entries.every(function (entry) {
                return matchesSignatorySearchFilter(getSignatoryFilterValue(row, entry[0]), entry[1]);
            });
        });
    }

    function paginateSignatorySearchRows(rows, referenceId, direction, pageSize) {
        const sortedRows = rows.slice().sort(function (left, right) {
            return String(left.SignatoryID || '').localeCompare(String(right.SignatoryID || ''));
        });

        if (!referenceId) {
            return sortedRows.slice(0, pageSize);
        }

        if (direction < 0) {
            const previousRows = sortedRows.filter(function (row) {
                return String(row.SignatoryID || '').localeCompare(String(referenceId || '')) < 0;
            });
            return previousRows.slice(Math.max(previousRows.length - pageSize, 0));
        }

        return sortedRows.filter(function (row) {
            return String(row.SignatoryID || '').localeCompare(String(referenceId || '')) > 0;
        }).slice(0, pageSize);
    }

    function createSignatorySearchModal() {
        const modal = new window.SearchModal(window.AppCore);

        modal.loadModal = async function (tableID, options) {
            ensureSearchModalStyles();
            removeSearchModalArtifacts();

            document.body.insertAdjacentHTML('beforeend', buildSignatorySearchModalHtml({
                tableID: tableID,
                whereStmt: options && options.whereStmt,
                advFilterString: options && options.advFilterString,
                moduleID: options && options.moduleID,
                pageSize: options && options.pageSize
            }));

            this.modalElement = document.getElementById('search-modal');
            this.keyForNavigation = 'SignatoryID';
            this.attachEventListeners();
            this.isInitialized = true;
            return true;
        };

        modal.executeSearch = async function () {
            try {
                this.showState('loading');

                const bankId = getCurrentBankId();
                if (!bankId) {
                    this.showState('empty');
                    showToast('Enter or select a Bank ID first.', 'warning');
                    return;
                }

                const env = getEnv();
                const filters = this.buildFilters();
                const pageSizeDropdown = document.getElementById('search-page-size');
                this.pageSize = pageSizeDropdown ? parseInt(pageSizeDropdown.value, 10) : 20;

                const response = await requestBankSignatories({
                    BankID: bankId,
                    SignatoryID: '',
                    OurBranchID: env.ourBranchId,
                    OperatorID: env.operatorId,
                    Direction: 0,
                    GetAll: 1
                });

                if (!responseSucceeded(response)) {
                    this.currentResults = [];
                    this.showState('empty');
                    showToast(extractResponseMessage(response) || 'Unable to load signatories.', 'danger');
                    return;
                }

                const allRows = extractRows(getResponseDetailsPayload(response)).map(function (row) {
                    return normalizeLookupSignatoryRow(row);
                }).filter(function (row) {
                    return row.SignatoryID || row.SignatoryName;
                });

                const filteredRows = filterSignatorySearchRows(allRows, filters);
                const pagedRows = paginateSignatorySearchRows(filteredRows, this.refID, this.prevOrNext, this.pageSize);

                this.currentResults = pagedRows;
                this.selectedRow = null;
                this.currentPage = 0;
                this.refID = pagedRows.length ? String(pagedRows[pagedRows.length - 1].SignatoryID || '') : '';

                if (!pagedRows.length) {
                    this.showState('empty');
                    return;
                }

                this.renderResults(pagedRows);
                this.showState('results');
            } catch (error) {
                console.error('[BankMaster] Signatory search modal error:', error);
                this.currentResults = [];
                this.showState('empty');
                showToast((error && error.message) ? error.message : 'Unable to search signatories.', 'danger');
            }
        };

        return modal;
    }

    function initSignatorySearchModal() {
        if (!signatorySearchModal && typeof window.SearchModal === 'function' && window.AppCore) {
            signatorySearchModal = createSignatorySearchModal();
        }
    }

    function buildBranchSearchModalHtml(options) {
        const settings = options || {};
        const pageSize = Number(settings.pageSize || 20);

        return '<div id="search-modal" class="search-modal-themed" ' +
            'style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; z-index:9999; justify-content:center; align-items:center;">' +
            '<div class="search-modal-themed__panel">' +
            '<div class="search-modal-themed__header">' +
            '<h5 id="search-modal-title" class="search-modal-themed__title">Search Clearing Branch</h5>' +
            '<button type="button" id="search-modal-close" class="search-modal-themed__close" aria-label="Close">&times;</button>' +
            '</div>' +
            '<div class="search-modal-themed__criteria-wrap">' +
            '<form id="search-modal-form" class="search-modal-themed__criteria">' +
            '<div class="search-modal-themed__field">' +
            '<label class="search-modal-themed__label">Branch ID</label>' +
            '<div class="search-modal-themed__input-row">' +
            '<select class="search-modal-themed__select" data-field="BranchID" aria-label="Branch ID Filter Type">' +
            '<option value="like" selected>Like</option>' +
            '<option value="equals">Equals</option>' +
            '<option value="startswith">Starts</option>' +
            '<option value="endswith">Ends</option>' +
            '</select>' +
            '<input type="text" class="search-modal-themed__input" data-field="BranchID" placeholder="Branch ID" autocomplete="off" />' +
            '</div>' +
            '</div>' +
            '<div class="search-modal-themed__field">' +
            '<label class="search-modal-themed__label">Branch Name</label>' +
            '<div class="search-modal-themed__input-row">' +
            '<select class="search-modal-themed__select" data-field="BranchName" aria-label="Branch Name Filter Type">' +
            '<option value="like" selected>Like</option>' +
            '<option value="equals">Equals</option>' +
            '<option value="startswith">Starts</option>' +
            '<option value="endswith">Ends</option>' +
            '</select>' +
            '<input type="text" class="search-modal-themed__input" data-field="BranchName" placeholder="Branch Name" autocomplete="off" />' +
            '</div>' +
            '</div>' +
            '</form>' +
            '<div class="search-modal-themed__actions">' +
            '<button type="button" id="search-modal-search-btn" class="search-modal-themed__btn search-modal-themed__btn--secondary">Search</button>' +
            '</div>' +
            '</div>' +
            '<div class="search-modal-themed__body">' +
            '<div id="search-modal-loading" class="search-modal-themed__loading" style="display:none;">Loading...</div>' +
            '<div id="search-modal-results" class="search-modal-themed__results" style="display:none;"></div>' +
            '<div id="search-modal-empty" class="search-modal-themed__empty" style="display:none;">No records found</div>' +
            '</div>' +
            '<div class="search-modal-themed__footer">' +
            '<div class="search-modal-themed__footer-left">' +
            '<button type="button" id="search-modal-nav-prev" class="search-modal-themed__btn search-modal-themed__btn--secondary" title="Previous record">' +
            '<i class="bi bi-chevron-left"></i> Previous</button>' +
            '</div>' +
            '<div class="search-modal-themed__footer-center">' +
            '<h5 class="search-modal-themed__footer-label">Page Size:</h5>' +
            '<select id="search-page-size" class="search-modal-themed__select" aria-label="Page Size" style="flex:0 0 auto; padding:4px 8px;">' +
            '<option value="10"' + (pageSize === 10 ? ' selected' : '') + '>10</option>' +
            '<option value="20"' + (pageSize === 20 ? ' selected' : '') + '>20</option>' +
            '<option value="50"' + (pageSize === 50 ? ' selected' : '') + '>50</option>' +
            '<option value="100"' + (pageSize === 100 ? ' selected' : '') + '>100</option>' +
            '<option value="1000"' + (pageSize === 1000 ? ' selected' : '') + '>1000</option>' +
            '</select>' +
            '<button type="button" id="search-modal-ok" class="search-modal-themed__btn search-modal-themed__btn--secondary">OK</button>' +
            '</div>' +
            '<div class="search-modal-themed__footer-right">' +
            '<button type="button" id="search-modal-nav-next" class="search-modal-themed__btn search-modal-themed__btn--secondary" title="Next record">Next <i class="bi bi-chevron-right"></i></button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<input type="hidden" id="search-table-id" value="ClearingBranchID" />' +
            '<input type="hidden" id="search-where-stmt" value="' + escapeHtml(settings.whereStmt || '') + '" />' +
            '<input type="hidden" id="search-adv-filter" value="' + escapeHtml(settings.advFilterString || '') + '" />' +
            '<input type="hidden" id="search-module-id" value="' + escapeHtml(settings.moduleID || '2020') + '" />' +
            '<input type="hidden" id="search-key-for-nav" value="BranchID" />' +
            '<input type="hidden" id="search-ref-id" value="" />' +
            '<input type="hidden" id="search-prev-or-next" value="0" />';
    }

    function getBranchFilterValue(row, fieldName) {
        if (String(fieldName || '').toLowerCase() === 'branchname') {
            return String(getBranchRowName(row) || '');
        }

        return String(getBranchRowId(row) || '');
    }

    function matchesBranchSearchFilter(value, filter) {
        const source = String(value || '').toLowerCase();
        const query = String((filter && filter.value) || '').trim().toLowerCase();
        const mode = String((filter && filter.mode) || 'like').toLowerCase();

        if (!query) {
            return true;
        }

        if (mode === 'equals') {
            return source === query;
        }

        if (mode === 'startswith') {
            return source.indexOf(query) === 0;
        }

        if (mode === 'endswith') {
            return source.endsWith(query);
        }

        return source.indexOf(query) >= 0;
    }

    function filterBranchSearchRows(rows, filters) {
        const entries = Object.entries(filters || {}).filter(function (entry) {
            return entry[1] && String(entry[1].value || '').trim();
        });

        if (!entries.length) {
            return rows.slice();
        }

        return rows.filter(function (row) {
            return entries.every(function (entry) {
                return matchesBranchSearchFilter(getBranchFilterValue(row, entry[0]), entry[1]);
            });
        });
    }

    function paginateBranchSearchRows(rows, referenceId, direction, pageSize) {
        const sortedRows = rows.slice().sort(function (left, right) {
            return String(getBranchRowId(left) || '').localeCompare(String(getBranchRowId(right) || ''));
        });

        if (!referenceId) {
            return sortedRows.slice(0, pageSize);
        }

        if (direction < 0) {
            const previousRows = sortedRows.filter(function (row) {
                return String(getBranchRowId(row) || '').localeCompare(String(referenceId || '')) < 0;
            });
            return previousRows.slice(Math.max(previousRows.length - pageSize, 0));
        }

        return sortedRows.filter(function (row) {
            return String(getBranchRowId(row) || '').localeCompare(String(referenceId || '')) > 0;
        }).slice(0, pageSize);
    }

    function createBranchSearchModal() {
        const modal = new window.SearchModal(window.AppCore);

        modal.loadModal = async function (tableID, options) {
            ensureSearchModalStyles();
            removeSearchModalArtifacts();

            document.body.insertAdjacentHTML('beforeend', buildBranchSearchModalHtml({
                tableID: tableID,
                whereStmt: options && options.whereStmt,
                advFilterString: options && options.advFilterString,
                moduleID: options && options.moduleID,
                pageSize: options && options.pageSize
            }));

            this.modalElement = document.getElementById('search-modal');
            this.keyForNavigation = 'BranchID';
            this.attachEventListeners();
            this.isInitialized = true;
            return true;
        };

        modal.executeSearch = async function () {
            try {
                this.showState('loading');

                const bankId = getCurrentBankId();
                if (!bankId) {
                    this.currentResults = [];
                    this.showState('empty');
                    showToast('Enter or select a Bank ID first.', 'warning');
                    return;
                }

                const filters = this.buildFilters();
                const pageSizeDropdown = document.getElementById('search-page-size');
                this.pageSize = pageSizeDropdown ? parseInt(pageSizeDropdown.value, 10) : 20;

                const response = await requestBranchSearch(bankId);

                if (!responseSucceeded(response)) {
                    this.currentResults = [];
                    this.showState('empty');
                    showToast(extractResponseMessage(response) || 'Unable to load branches.', 'danger');
                    return;
                }

                const allRows = extractRows(getResponseDetailsPayload(response)).filter(function (row) {
                    return getBranchRowId(row) || getBranchRowName(row);
                });

                const filteredRows = filterBranchSearchRows(allRows, filters);
                const pagedRows = paginateBranchSearchRows(filteredRows, this.refID, this.prevOrNext, this.pageSize);

                this.currentResults = pagedRows;
                this.selectedRow = null;
                this.currentPage = 0;
                this.refID = pagedRows.length ? String(getBranchRowId(pagedRows[pagedRows.length - 1]) || '') : '';

                if (!pagedRows.length) {
                    this.showState('empty');
                    return;
                }

                this.renderResults(pagedRows);
                this.showState('results');
            } catch (error) {
                console.error('[BankMaster] Branch search modal error:', error);
                this.currentResults = [];
                this.showState('empty');
                showToast((error && error.message) ? error.message : 'Unable to search branches.', 'danger');
            }
        };

        return modal;
    }

    function initBranchSearchModal() {
        if (!branchSearchModal && typeof window.SearchModal === 'function' && window.AppCore) {
            branchSearchModal = createBranchSearchModal();
        }
    }

    function openLookup(key, onSelect) {
        initSearchModal();
        if (!searchModal) {
            showToast('Search modal is unavailable.', 'warning');
            return;
        }

        const config = LOOKUP_CONFIG[key];
        const env = getEnv();

        searchModal.open({
            tableID: config.tableID,
            moduleID: config.moduleID,
            ourbranchId: env.ourBranchId,
            onSelect: onSelect
        });
    }

    async function ensureBankLoadedForBranchLookup() {
        if (state.bankLoaded) {
            return true;
        }

        const bankId = getCurrentBankId();
        if (!bankId) {
            showToast('Enter or select a Bank ID first.', 'warning');
            return false;
        }

        await loadBank(bankId, true, false);
        return state.bankLoaded;
    }

    function normalizeLookupBranchRow(record) {
        return {
            BranchID: String(getBranchRowId(record) || '').trim(),
            BranchName: String(getBranchRowName(record) || '').trim(),
            BranchTypeID: String(pickFirstValue(record, ['BranchTypeID']) || '').trim(),
            BranchTypeName: String(getBranchTypeName(record) || '').trim(),
            CityID: String(pickFirstValue(record, ['CityID']) || '').trim(),
            CityName: String(getBranchCityName(record) || '').trim(),
            CountryID: String(pickFirstValue(record, ['CountryID']) || '').trim(),
            CountryName: String(getBranchCountryName(record) || '').trim(),
            SWIFTCode: String(pickFirstValue(record, ['SWIFTCode']) || '').trim(),
            Address1: String(pickFirstValue(record, ['Address1']) || '').trim(),
            Address2: String(pickFirstValue(record, ['Address2']) || '').trim(),
            ZipCode: String(pickFirstValue(record, ['ZipCode']) || '').trim(),
            Phone1: String(pickFirstValue(record, ['Phone1']) || '').trim(),
            Phone2: String(pickFirstValue(record, ['Phone2']) || '').trim(),
            Mobile: String(pickFirstValue(record, ['Mobile']) || '').trim(),
            EMail: String(pickFirstValue(record, ['Email', 'EMail', 'EMailID', 'EmailID']) || '').trim(),
            Fax: String(pickFirstValue(record, ['Fax']) || '').trim(),
            Remarks: String(pickFirstValue(record, ['Remarks']) || '').trim(),
            IsUpcountry: pickFirstValue(record, ['IsUpCountry', 'IsUpcountry']),
            ClearingCenter: String(pickFirstValue(record, ['ClearingCenter', 'ClearingDays']) || '').trim(),
            UpdateCount: Number(pickFirstValue(record, ['UpdateCount']) || 0)
        };
    }

    function normalizeBranchRow(record) {
        if (!record) {
            return null;
        }

        return {
            BranchID: String(getBranchRowId(record) || '').trim(),
            BranchName: String(getBranchRowName(record) || '').trim(),
            BranchTypeID: String(pickFirstValue(record, ['BranchTypeID']) || '').trim(),
            BranchTypeName: String(getBranchTypeName(record) || '').trim(),
            CityID: String(pickFirstValue(record, ['CityID']) || '').trim(),
            CityName: String(getBranchCityName(record) || '').trim(),
            CountryID: String(pickFirstValue(record, ['CountryID']) || '').trim(),
            CountryName: String(getBranchCountryName(record) || '').trim(),
            SWIFTCode: String(pickFirstValue(record, ['SWIFTCode']) || '').trim(),
            Address1: String(pickFirstValue(record, ['Address1']) || '').trim(),
            Address2: String(pickFirstValue(record, ['Address2']) || '').trim(),
            ZipCode: String(pickFirstValue(record, ['ZipCode']) || '').trim(),
            Phone1: String(pickFirstValue(record, ['Phone1']) || '').trim(),
            Phone2: String(pickFirstValue(record, ['Phone2']) || '').trim(),
            Mobile: String(pickFirstValue(record, ['Mobile']) || '').trim(),
            EMail: String(pickFirstValue(record, ['Email', 'EMail', 'EMailID', 'EmailID']) || '').trim(),
            Fax: String(pickFirstValue(record, ['Fax']) || '').trim(),
            Remarks: String(pickFirstValue(record, ['Remarks']) || '').trim(),
            IsUpcountry: pickFirstValue(record, ['IsUpCountry', 'IsUpcountry']),
            ClearingCenter: String(pickFirstValue(record, ['ClearingCenter', 'ClearingDays']) || '').trim(),
            UpdateCount: Number(pickFirstValue(record, ['UpdateCount']) || 0),
            CreatedBy: pickFirstValue(record, ['CreatedBy']),
            CreatedOn: pickFirstValue(record, ['CreatedOn']),
            ModifiedBy: pickFirstValue(record, ['ModifiedBy']),
            ModifiedOn: pickFirstValue(record, ['ModifiedOn']),
            SupervisedBy: pickFirstValue(record, ['SupervisedBy']),
            SupervisedOn: pickFirstValue(record, ['SupervisedOn'])
        };
    }

    function setCurrentBranchRow(row) {
        state.branchRows = row ? [row] : [];
        syncBranchTypeOptions(state.branchRows);
        renderBranches();
    }

    async function getBranchDetails(branchId, direction) {
        const id = String(branchId || '').trim();
        if (!id) {
            return null;
        }

        const env = getEnv();
        const payload = await requestBranchDetails({
            BankID: getCurrentBankId(),
            BranchID: id,
            OurBranchID: env.ourBranchId,
            OperatorID: env.operatorId,
            Direction: typeof direction === 'number' ? direction : 0
        });

        if (!payload || payload.success === false) {
            return null;
        }

        return payload.data ? normalizeBranchRow(payload.data) : null;
    }

    async function loadBranchById(branchId, options) {
        const settings = options || {};
        const id = String(branchId || '').trim();

        if (!state.bankLoaded) {
            if (!settings.silent) {
                showToast('Load a bank first.', 'warning');
            }
            return null;
        }

        if (!id) {
            clearBranchForm(false);
            setCurrentBranchRow(null);
            if (!settings.silent) {
                showToast('Enter or select a branch first.', 'warning');
            }
            return null;
        }

        const row = await getBranchDetails(id, settings.direction);
        if (!row) {
            setCurrentBranchRow(null);
            if (!settings.silent) {
                showToast('Branch record not found for the active bank.', 'warning');
            }
            return null;
        }

        applyBranchRow(row);
        setCurrentBranchRow(row);

        if (!settings.silent) {
            showToast('Branch loaded.', 'success');
        }

        return row;
    }

    async function applyLookupBranchSelection(record) {
        const normalized = normalizeLookupBranchRow(record);
        if (!normalized.BranchID) {
            showToast('The selected branch is missing Branch ID.', 'warning');
            return;
        }

        let row = null;
        try {
            row = await loadBranchById(normalized.BranchID, { silent: true });
        } catch (_) {
            row = null;
        }

        if (!row) {
            row = normalized;
            applyBranchRow(row);
            setCurrentBranchRow(row);
        }
        setMode(MODES.VIEW);
    }

    async function openBranchLookup() {
        initBranchSearchModal();
        if (!branchSearchModal) {
            showToast('Search modal is unavailable.', 'warning');
            return;
        }

        if (!await ensureBankLoadedForBranchLookup()) {
            return;
        }

        const bankId = getCurrentBankId();
        const env = getEnv();
        const config = LOOKUP_CONFIG.branch;
        branchSearchModal.open({
            tableID: config.tableID,
            advFilterString: `BankID='${bankId.replace(/'/g, "''")}'`,
            moduleID: config.moduleID,
            ourbranchId: env.ourBranchId,
            onSelect: function (record) {
                void applyLookupBranchSelection(record);
            }
        });
    }

    async function ensureBankLoadedForSignatoryLookup() {
        if (state.bankLoaded) {
            return true;
        }

        const bankId = getCurrentBankId();
        if (!bankId) {
            showToast('Enter or select a Bank ID first.', 'warning');
            return false;
        }

        await loadBank(bankId, true, false);
        return state.bankLoaded;
    }

    async function openSignatoryLookup() {
        initSignatorySearchModal();
        if (!signatorySearchModal) {
            showToast('Search modal is unavailable.', 'warning');
            return;
        }

        if (!await ensureBankLoadedForSignatoryLookup()) {
            return;
        }

        const bankId = getCurrentBankId();
        if (!bankId) {
            showToast('Enter or select a Bank ID first.', 'warning');
            return;
        }

        const env = getEnv();
        const config = LOOKUP_CONFIG.signatory;

        signatorySearchModal.open({
            tableID: config.tableID,
            advFilterString: `BankID='${bankId.replace(/'/g, "''")}'`,
            moduleID: config.moduleID,
            ourbranchId: env.ourBranchId,
            onSelect: function (record) {
                applyLookupSignatorySelection(record);
            }
        });
    }

    function wireLookupButtons() {
        const handlers = {
            bank: function () {
                openLookup('bank', function (record) {
                    const selected = extractLookupSelection('bank', record);
                    setValue('#bm_bankId', selected.id);
                    setValue('#bm_bankNameSummary', selected.name);
                    void loadBank(selected.id, false);
                });
            },
            client: function () {
                if (state.mode === MODES.ADD || state.mode === MODES.EDIT) {
                    openLookup('client', function (record) {
                        const selected = extractLookupSelection('client', record);
                        setValue('#bm_clientId', selected.id);
                        setValue('#bm_clientName', selected.name);
                        setValue('#bm_limitClientId', selected.id);
                        setValue('#bm_limitClientName', selected.name);
                    });
                } else {
                    showToast('Client lookup is only allowed when adding or editing a bank.', 'warning');
                }
            },
            signatory: async function () {
                await openSignatoryLookup();
            },
            clearingThrough: function () {
                openLookup('bank', function (record) {
                    const selected = extractLookupSelection('bank', record);
                    setValue('#bm_clearingThrough', selected.id);
                    setValue('#bm_clearingThroughName', selected.name);
                });
            },
            branch: async function () {
                await openBranchLookup();
            },
            currency: function () {
                openLookup('currency', function (record) {
                    const selected = extractLookupSelection('currency', record);
                    setValue('#bm_limitCurrencyId', selected.id);
                    setValue('#bm_limitCurrencyName', selected.name);
                });
            }
        };

        qsa('.btn-lookup[data-lookup]').forEach(function (button) {
            const lookupKey = button.getAttribute('data-lookup');
            const handler = handlers[lookupKey];
            if (!handler) {
                return;
            }

            button.addEventListener('click', function () {
                handler();
            });
        });
    }

    function initSectionToggles() {
        qsa('[data-section-toggle]').forEach(function (header) {
            if (header.dataset.bound === '1') {
                return;
            }

            header.dataset.bound = '1';
            const section = header.closest('.form-section');
            const content = qs('[data-section-content]', section);
            const button = qs('.section-toggle-btn', header);
            const icon = qs('i.bi', button);

            const toggle = function () {
                const collapsed = content.hasAttribute('hidden');
                if (collapsed) {
                    content.removeAttribute('hidden');
                } else {
                    content.setAttribute('hidden', '');
                }

                const nextCollapsed = !collapsed;
                if (button) {
                    button.setAttribute('aria-expanded', String(!nextCollapsed));
                }
                if (icon) {
                    icon.classList.toggle('bi-chevron-up', !nextCollapsed);
                    icon.classList.toggle('bi-chevron-down', nextCollapsed);
                }
            };

            header.addEventListener('click', toggle);
            if (button) {
                button.addEventListener('click', function (event) {
                    event.stopPropagation();
                    toggle();
                });
            }
        });
    }

    function setSection(sectionKey) {
        state.activeSection = sectionKey;
        const actionContext = qs('#bm_actionContext');
        const sectionSummary = qs('#bm_sectionSummary');

        qsa('.sidebar-item[data-submodule], .sidebar-item--enhanced[data-submodule]').forEach(function (button) {
            button.classList.toggle('active', button.getAttribute('data-submodule') === sectionKey);
        });

        Object.keys(SECTION_LABELS).forEach(function (key) {
            const section = getSectionRoot(key);
            if (!section) {
                return;
            }
            if (key === sectionKey) {
                section.removeAttribute('hidden');
            } else {
                section.setAttribute('hidden', '');
            }
        });

        if (actionContext) {
            actionContext.textContent = SECTION_LABELS[sectionKey] || 'Maintain Banks';
        }

        if (sectionSummary) {
            sectionSummary.textContent = state.bankLoaded
                ? 'Working with ' + (SECTION_LABELS[sectionKey] || 'Maintain Banks') + ' for bank ' + getCurrentBankId() + '.'
                : 'Load a bank to work with branch, signatory, and limit records.';
        }

        renderActionPanel();
        updateActionState();
        updateFieldAccess();
    }

    function renderActionPanel() {
        const container = qs('#bm_actionButtons');
        if (!container) {
            return;
        }

        if (state.activeSection === 'signatories') {
            container.innerHTML = [
                '<button class="btn-action" type="button" id="submoduleBtnSignature"><i class="bi bi-pen me-1"></i>Signature</button>',
                '<button class="btn-action" type="button" id="submoduleBtnPhoto"><i class="bi bi-image me-1"></i>Photo</button>',
                '<button class="btn-action" type="button" id="submoduleBtnBoth"><i class="bi bi-collection me-1"></i>Both</button>',
                '<button class="btn-action" type="button" id="submoduleBtnAdd"><i class="bi bi-plus-circle me-1"></i>Add</button>',
                '<button class="btn-action" type="button" id="submoduleBtnEdit"><i class="bi bi-pencil-square me-1"></i>Edit</button>',
                '<button class="btn-action" type="button" id="submoduleBtnDelete"><i class="bi bi-trash me-1"></i>Delete</button>',
                '<button class="btn-action btn-save" type="button" id="submoduleBtnSave"><i class="bi bi-save me-1"></i>Save</button>',
                '<button class="btn-action btn-cancel" type="button" id="submoduleBtnCancel"><i class="bi bi-x-circle me-1"></i>Cancel</button>',
                '<button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose"><i class="bi bi-box-arrow-right me-1"></i>Close</button>'
            ].join('');
        } else {
            container.innerHTML = [
                '<button class="btn-action btn-view" type="button" id="submoduleBtnView"><i class="bi bi-eye me-1"></i>View</button>',
                '<button class="btn-action btn-add" type="button" id="submoduleBtnAdd"><i class="bi bi-plus-circle me-1"></i>Add</button>',
                '<button class="btn-action btn-edit" type="button" id="submoduleBtnEdit"><i class="bi bi-pencil-square me-1"></i>Edit</button>',
                '<button class="btn-action btn-delete" type="button" id="submoduleBtnDelete"><i class="bi bi-trash me-1"></i>Delete</button>',
                '<button class="btn-action btn-save" type="button" id="submoduleBtnSave"><i class="bi bi-save me-1"></i>Save</button>',
                '<button class="btn-action btn-cancel" type="button" id="submoduleBtnCancel"><i class="bi bi-x-circle me-1"></i>Cancel</button>',
                '<button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose"><i class="bi bi-box-arrow-right me-1"></i>Close</button>'
            ].join('');
        }

        bindActionButtons();
    }

    function setButtonDisabled(button, disabled) {
        if (!button) {
            return;
        }
        button.disabled = !!disabled;
        button.classList.toggle('is-disabled', !!disabled);
    }

    function setMode(mode) {
        state.mode = mode;
        updateFieldAccess();
        updateActionState();
    }

    function updateFieldAccess() {
        Object.keys(SECTION_LABELS).forEach(function (sectionKey) {
            const root = getSectionRoot(sectionKey);
            if (!root) {
                return;
            }

            const editable = state.mode !== MODES.VIEW && state.activeSection === sectionKey && (sectionKey === 'banks' || state.bankLoaded);
            qsa('input, select, textarea, button.btn-lookup', root).forEach(function (element) {
                if (element.hasAttribute('data-always-enabled')) {
                    element.disabled = false;
                    return;
                }
                element.disabled = !editable;
            });
        });

        const signatoryImageActionsDisabled = !state.bankLoaded || state.activeSection !== 'signatories' || !state.currentSignatoryRow;
        setButtonDisabled(qs('#submoduleBtnPhoto'), signatoryImageActionsDisabled);
        setButtonDisabled(qs('#submoduleBtnSignature'), signatoryImageActionsDisabled);
        setButtonDisabled(qs('#submoduleBtnBoth'), signatoryImageActionsDisabled);
    }

    function hasSectionRecord(sectionKey) {
        if (sectionKey === 'banks') {
            return state.bankLoaded;
        }
        if (sectionKey === 'branches') {
            return !!state.currentBranchRow;
        }
        if (sectionKey === 'signatories') {
            return !!state.currentSignatoryRow;
        }
        if (sectionKey === 'limits') {
            return !!state.currentLimitRow;
        }
        return false;
    }

    function updateActionState() {
        const editing = state.mode !== MODES.VIEW;
        const activeHasRecord = hasSectionRecord(state.activeSection);
        const allowChildActions = state.activeSection === 'banks' ? true : state.bankLoaded;

        setButtonDisabled(qs('#submoduleBtnView'), editing);
        setButtonDisabled(qs('#submoduleBtnAdd'), editing || !allowChildActions);
        setButtonDisabled(qs('#submoduleBtnEdit'), editing || !activeHasRecord);
        setButtonDisabled(qs('#submoduleBtnDelete'), editing || !activeHasRecord);
        setButtonDisabled(qs('#submoduleBtnSave'), !editing);
        setButtonDisabled(qs('#submoduleBtnCancel'), !editing && !activeHasRecord && !state.canAdd);
        setButtonDisabled(qs('#submoduleBtnClose'), false);
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function extractRows(source) {
        const rows = [];
        const seen = new Set();

        function tryParseJson(value) {
            if (typeof value !== 'string') {
                return null;
            }

            const trimmed = value.trim();
            if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) {
                return null;
            }

            try {
                return JSON.parse(trimmed);
            } catch (_) {
                return null;
            }
        }

        function isPlainObject(value) {
            return !!value && typeof value === 'object' && !Array.isArray(value);
        }

        function looksLikeStatusRow(value) {
            return isPlainObject(value) &&
                value.ResponseCode !== undefined &&
                value.ResponseMessage !== undefined &&
                Object.keys(value).length <= 4;
        }

        function walk(value) {
            if (!value) {
                return;
            }

            const parsed = tryParseJson(value);
            if (parsed) {
                walk(parsed);
                return;
            }

            if (typeof value === 'object') {
                if (seen.has(value)) {
                    return;
                }
                seen.add(value);
            }

            if (Array.isArray(value)) {
                value.forEach(walk);
                return;
            }

            if (!isPlainObject(value)) {
                return;
            }

            if (!looksLikeStatusRow(value)) {
                rows.push(value);
            }

            Object.keys(value).forEach(function (key) {
                walk(value[key]);
            });
        }

        walk(source);
        return rows;
    }

    function extractResponseMessage(response) {
        if (!response || typeof response !== 'object') {
            return '';
        }

        const keys = ['ResponseMessage', 'responseMessage', 'Message', 'message', 'StatusMessage', 'statusMessage', 'ErrorMessage', 'errorMessage'];
        for (let index = 0; index < keys.length; index += 1) {
            const value = response[keys[index]];
            if (typeof value === 'string' && value.trim()) {
                return value.trim();
            }
        }

        const rows = extractRows(response);
        for (let i = 0; i < rows.length; i += 1) {
            const message = extractResponseMessage(rows[i]);
            if (message) {
                return message;
            }
        }

        return '';
    }

    function getResponseDetailsPayload(response) {
        if (!response || typeof response !== 'object') {
            return response;
        }

        if (response.data !== undefined && response.data !== null) {
            return response.data;
        }

        if (response.Details !== undefined && response.Details !== null) {
            return response.Details;
        }

        return response;
    }

    function responseSucceeded(response) {
        if (!response || typeof response !== 'object') {
            return true;
        }

        if (response.success === false || response.Success === false) {
            return false;
        }

        const code = response.ResponseCode || response.responseCode || response.Status || response.status;
        if (typeof code === 'string' && code.trim()) {
            return ['00', '0', '200', 'success', 'Details_Retrieved', 'Charge_Rate_Added'].indexOf(code.trim()) >= 0;
        }

        return true;
    }

    function toBool(value) {
        return value === true || value === 1 || value === '1' || value === 'true' || value === 'True' || value === 'Y';
    }

    function pickFirstValue(source, keys) {
        for (let index = 0; index < keys.length; index += 1) {
            const value = source ? source[keys[index]] : null;
            if (value !== undefined && value !== null && String(value).trim()) {
                return value;
            }
        }
        return '';
    }

    function normalizeIdentity(value) {
        return String(value || '').trim().toLowerCase();
    }

    function getBankRowId(row) {
        return pickFirstValue(row, ['BankID', 'bankID', 'BankId', 'bankId', 'BANKID', 'InstitutionID', 'institutionId']);
    }

    function getBankRowName(row) {
        return pickFirstValue(row, ['BankName', 'bankName', 'bankname', 'BANKNAME', 'ShortName', 'shortName', 'InstitutionName', 'institutionName', 'institutionname']);
    }

    function getLookupBankId(row) {
        return pickFirstValue(row, ['BankID', 'bankID', 'BankId', 'bankId', 'ClrBankID', 'ClearingBankID', 'ID']);
    }

    function getLookupBankName(row) {
        return pickFirstValue(row, ['BankName', 'bankName', 'ClearingBankName', 'Description', 'InstitutionName', 'Name']);
    }

    function getLookupClientId(row) {
        return pickFirstValue(row, ['ClientID', 'clientID', 'ClientId', 'clientId', 'CustomerID', 'customerId', 'ID']);
    }

    function getLookupClientName(row) {
        return pickFirstValue(row, ['ClientName', 'clientName', 'CLIENTNAME', 'Name', 'name', 'CustomerName', 'customerName', 'Description']);
    }

    function getLookupCurrencyId(row) {
        return pickFirstValue(row, ['CurrencyID', 'currencyID', 'CurrencyId', 'currencyId', 'CodeID', 'ID']);
    }

    function getLookupCurrencyName(row) {
        return pickFirstValue(row, ['CurrencyName', 'currencyName', 'Description', 'CodeDescription', 'Name']);
    }

    function getLookupSignatoryId(row) {
        return pickFirstValue(row, [
            'SignatoryID', 'signatoryID', 'signatoryId',
            'ClientSignatoryID', 'clientSignatoryID',
            'RelatedClientID', 'relatedClientID',
            'ClientID', 'clientID',
            'ID', 'id'
        ]);
    }

    function getLookupSignatoryName(row) {
        return pickFirstValue(row, [
            'SignatoryName', 'signatoryName',
            'RelatedClientName', 'relatedClientName',
            'ClientName', 'clientName',
            'Name', 'name'
        ]);
    }

    function getBranchRowId(row) {
        return pickFirstValue(row, ['ClearingBranchID', 'BranchID', 'branchID', 'BranchId', 'branchId', 'OurBranchID', 'ourBranchID', 'OurbranchID']);
    }

    function getBranchRowName(row) {
        return pickFirstValue(row, ['ClearingBranchName', 'BranchName', 'branchName', 'Name']);
    }

    const LOOKUP_SELECTION_EXTRACTORS = {
        bank: { getId: getLookupBankId, getName: getLookupBankName },
        signatory: { getId: getLookupSignatoryId, getName: getLookupSignatoryName },
        client: { getId: getLookupClientId, getName: getLookupClientName },
        currency: { getId: getLookupCurrencyId, getName: getLookupCurrencyName },
        branch: { getId: getBranchRowId, getName: getBranchRowName }
    };

    function extractLookupSelection(lookupKey, record) {
        const extractor = LOOKUP_SELECTION_EXTRACTORS[lookupKey];
        if (!extractor) {
            return { id: '', name: '' };
        }

        return {
            id: String(extractor.getId(record) || '').trim(),
            name: String(extractor.getName(record) || '').trim()
        };
    }

    function getLimitTypeName(row) {
        return pickFirstValue(row, ['LimitTypeName', 'LimitTypeDescription', 'LimitType', 'LimitTypeID', 'Description']);
    }

    function getLimitCurrencyName(row) {
        return pickFirstValue(row, ['CurrencyName', 'CurrencyDescription', 'Description', 'CurrencyID']);
    }

    function getLimitAmountValue(row) {
        return pickFirstValue(row, ['LimitAmount', 'Amount', 'Limit']);
    }

    function findBranchRow(branchId) {
        return state.branchRows.find(function (candidate) {
            return String(getBranchRowId(candidate) || '') === String(branchId || '');
        }) || null;
    }

    function findSignatoryRow(signatoryId) {
        return state.signatoryRows.find(function (candidate) {
            return String(candidate.SignatoryID || '') === String(signatoryId || '');
        }) || null;
    }

    function findLimitRow(record) {
        if (!record) {
            return null;
        }

        return state.limitRows.find(function (candidate) {
            return String(candidate.ClientID || '') === String(record.ClientID || '') &&
                String(candidate.LimitType || candidate.LimitTypeID || '') === String(record.LimitType || '') &&
                String(candidate.CurrencyID || '') === String(record.CurrencyID || '');
        }) || null;
    }

    function getRemainingRowByIndex(rows, deletedIndex) {
        if (!rows || !rows.length) {
            return null;
        }

        const targetIndex = deletedIndex >= 0 ? Math.min(deletedIndex, rows.length - 1) : 0;
        return rows[targetIndex] || null;
    }

    async function getBankDetails(bankId, direction) {
        const env = getEnv();
        const payload = await invokeControllerRequest('StaticData/BankMaster/api/get-bank-details', {
            BankID: bankId,
            OurBranchID: env.ourBranchId,
            OperatorID: env.operatorId,
            Direction: direction
        });

        if (!payload || payload.success === false) {
            throw new Error((payload && payload.errorMessage) || 'Bank details request failed.');
        }

        return payload.data || null;
    }

    async function queryBankRow(bankId, direction) {
        return getBankDetails(bankId, direction);
    }

    function getSelectOptionText(id, value) {
        const element = qs(id);
        if (!element || element.tagName !== 'SELECT') {
            return '';
        }

        const targetValue = String(value == null ? '' : value).trim();
        const match = Array.from(element.options || []).find(function (option) {
            return String(option.value || '').trim() === targetValue;
        });

        return match ? String(match.text || '').trim() : '';
    }

    function ensureSelectOption(id, value, label) {
        const element = qs(id);
        if (!element || element.tagName !== 'SELECT') {
            return;
        }

        const optionValue = String(value == null ? '' : value).trim();
        if (!optionValue) {
            return;
        }

        const exists = Array.from(element.options || []).some(function (option) {
            return String(option.value || '').trim() === optionValue;
        });

        if (exists) {
            return;
        }

        const option = document.createElement('option');
        option.value = optionValue;
        option.text = String(label || optionValue).trim();
        element.appendChild(option);
    }

    function getBranchTypeName(row) {
        return String(pickFirstValue(row, ['BranchTypeName', 'BranchTypeDescription', 'TypeName']) || '').trim();
    }

    function getBranchCityName(row) {
        return String(pickFirstValue(row, ['CityName']) || '').trim();
    }

    function getBranchCountryName(row) {
        return String(pickFirstValue(row, ['CountryName']) || '').trim();
    }

    function getBranchTypeDisplay(row) {
        const branchTypeId = String(pickFirstValue(row, ['BranchTypeID']) || '').trim();
        return getBranchTypeName(row) || getSelectOptionText('#bm_branchTypeId', branchTypeId) || branchTypeId;
    }

    function getBranchCityDisplay(row) {
        const cityId = String(pickFirstValue(row, ['CityID']) || '').trim();
        return getBranchCityName(row) || getSelectOptionText('#bm_branchCityId', cityId) || cityId;
    }

    function getBranchCountryDisplay(row) {
        const countryId = String(pickFirstValue(row, ['CountryID']) || '').trim();
        return getBranchCountryName(row) || getSelectOptionText('#bm_branchCountryId', countryId) || countryId;
    }

    function syncBranchTypeOptions(rows) {
        const options = (rows || []).reduce(function (accumulator, row) {
            const branchTypeId = String(pickFirstValue(row, ['BranchTypeID']) || '').trim();
            if (!branchTypeId || accumulator.some(function (candidate) { return candidate.value === branchTypeId; })) {
                return accumulator;
            }

            accumulator.push({
                value: branchTypeId,
                label: getBranchTypeName(row) || branchTypeId
            });
            return accumulator;
        }, []);

        const select = qs('#bm_branchTypeId');
        if (select && select.tagName === 'SELECT') {
            options.forEach(function (option) {
                ensureSelectOption('#bm_branchTypeId', option.value, option.label);
            });
            return;
        }

        const datalist = qs('#bm_branchTypeOptions');
        if (!datalist) {
            return;
        }

        datalist.innerHTML = options.map(function (option) {
            return '<option value="' + escapeHtml(option.value) + '" label="' + escapeHtml(option.label) + '"></option>';
        }).join('');
    }

    async function requestBankSignatories(requestData) {
        return invokeControllerRequest('StaticData/BankMaster/api/get-bank-signatories', requestData || {});
    }

    async function requestBranchSearch(bankId) {
        return invokeControllerRequest('StaticData/BankMaster/api/search-branches', {
            BankID: bankId
        });
    }

    async function requestBranchDetails(requestData) {
        return invokeControllerRequest('StaticData/BankMaster/api/get-branch-details', requestData || {});
    }

    function textValue(id) {
        const element = qs(id);
        return element ? String(element.value || '').trim() : '';
    }

    function setValue(id, value) {
        const element = qs(id);
        if (element) {
            if (element.tagName === 'SELECT') {
                element.value = value == null ? '' : value;
            } else {
                element.value = value == null ? '' : value;
            }
        }
    }

    function setChecked(id, value) {
        const element = qs(id);
        if (element) {
            element.checked = toBool(value);
        }
    }

    function setAudit(row) {
        const values = {
            createdBy: row && (row.CreatedBy || row.createdBy) ? (row.CreatedBy || row.createdBy) : '-',
            createdOn: row && (row.CreatedOn || row.createdOn) ? (row.CreatedOn || row.createdOn) : '-',
            modifiedBy: row && (row.ModifiedBy || row.modifiedBy) ? (row.ModifiedBy || row.modifiedBy) : '-',
            modifiedOn: row && (row.ModifiedOn || row.modifiedOn) ? (row.ModifiedOn || row.modifiedOn) : '-',
            supervisedBy: row && (row.SupervisedBy || row.supervisedBy) ? (row.SupervisedBy || row.supervisedBy) : '-',
            supervisedOn: row && (row.SupervisedOn || row.supervisedOn) ? (row.SupervisedOn || row.supervisedOn) : '-'
        };

        const legacyTargets = {
            createdBy: '#bm_createdBy',
            createdOn: '#bm_createdOn',
            modifiedBy: '#bm_modifiedBy',
            modifiedOn: '#bm_modifiedOn',
            supervisedBy: '#bm_supervisedBy',
            supervisedOn: '#bm_supervisedOn'
        };

        Object.keys(values).forEach(function (key) {
            const legacy = qs(legacyTargets[key]);
            if (legacy) {
                legacy.textContent = values[key];
            }

            qsa('[data-audit-field="' + key + '"]').forEach(function (element) {
                element.textContent = values[key];
            });
        });
    }

    function getCurrentBankId() {
        return textValue('#bm_bankId');
    }

    function updateBankSummary() {
        const bankId = getCurrentBankId();
        const bankName = textValue('#bm_bankName') || textValue('#bm_bankNameSummary');
        const activeBankSummary = qs('#bm_activeBankSummary');
        if (activeBankSummary) {
            activeBankSummary.textContent = bankId ? (bankId + (bankName ? ' - ' + bankName : '')) : 'No bank selected';
        }
    }

    function syncSidebarRecordState() {
        if (!window.SidebarManager || typeof window.SidebarManager.setMainRecordLoaded !== 'function') {
            return;
        }

        window.SidebarManager.setMainRecordLoaded(state.bankLoaded, state.bankLoaded ? getCurrentBankId() : null);
    }

    function clearImagePreview() {
        qs('#bm_photoPreview').removeAttribute('src');
        qs('#bm_signaturePreview').removeAttribute('src');
    }

    function applyBankRow(row, bankId) {
        state.currentBankRow = row;
        state.bankLoaded = true;
        state.bankUpdateCount = Number(pickFirstValue(row, ['UpdateCount', 'updateCount']) || 0);
        setValue('#bm_bankId', getBankRowId(row) || bankId || '');
        setValue('#bm_bankNameSummary', getBankRowName(row) || '');
        setValue('#bm_bankName', pickFirstValue(row, ['BankName', 'bankName', 'BANKNAME']) || getBankRowName(row) || '');
        setValue('#bm_shortName', pickFirstValue(row, ['ShortName', 'shortName', 'SHORTNAME']));
        setValue('#bm_institutionTypeId', pickFirstValue(row, ['InstitutionTypeID', 'institutionTypeID', 'InstitutionTypeId', 'institutionTypeId']));
        setValue('#bm_creditRating', pickFirstValue(row, ['CreditRating', 'creditRating']));
        setValue('#bm_clientId', pickFirstValue(row, ['ClientID', 'clientID', 'ClientId', 'clientId']));
        setValue('#bm_clientName', pickFirstValue(row, ['ClientName', 'clientName', 'CLIENTNAME', 'Name']));
        setValue('#bm_clearingThrough', pickFirstValue(row, ['ClearingThrough', 'clearingThrough']));
        setValue('#bm_clearingThroughName', pickFirstValue(row, ['ClearingThroughName', 'clearingThroughName', 'ClearingBankName']));
        setValue('#bm_limitClientId', pickFirstValue(row, ['ClientID', 'clientID', 'ClientId', 'clientId']));
        setValue('#bm_limitClientName', pickFirstValue(row, ['ClientName', 'clientName', 'CLIENTNAME', 'Name']));
        setChecked('#bm_isLocalClearing', pickFirstValue(row, ['IsLocalClearingBank', 'isLocalClearingBank']));
        setChecked('#bm_isForeignClearing', pickFirstValue(row, ['IsForeignClearingBank', 'isForeignClearingBank']));
        setAudit(row);
        updateBankSummary();
        syncSidebarRecordState();
    }

    function clearBankForm(keepId) {
        const currentId = textValue('#bm_bankId');
        setValue('#bm_bankId', keepId ? currentId : '');
        setValue('#bm_bankNameSummary', '');
        setValue('#bm_bankName', '');
        setValue('#bm_shortName', '');
        setValue('#bm_institutionTypeId', '');
        setValue('#bm_creditRating', '');
        setValue('#bm_clientId', '');
        setValue('#bm_clientName', '');
        setValue('#bm_clearingThrough', '');
        setValue('#bm_clearingThroughName', '');
        setChecked('#bm_isLocalClearing', false);
        setChecked('#bm_isForeignClearing', false);
        setAudit(null);
        state.currentBankRow = null;
        state.bankLoaded = false;
        state.bankUpdateCount = 0;
        clearChildCollections();
        updateBankSummary();
        syncSidebarRecordState();
    }

    function clearChildCollections() {
        state.currentBranchRow = null;
        state.currentSignatoryRow = null;
        state.currentLimitRow = null;
        state.branchRows = [];
        state.signatoryRows = [];
        state.limitRows = [];
        clearBranchForm(false);
        clearSignatoryForm(false);
        clearLimitForm(false);
        renderBranches();
        renderSignatories();
        renderLimits();
    }

    async function loadBank(bankId, silent, useDialogAlerts) {
        const id = String(bankId || getCurrentBankId()).trim();
        if (!id) {
            if (useDialogAlerts) {
                await showAlertDialog('Warning', 'Enter or select a Bank ID.');
            } else {
                showToast('Enter or select a Bank ID.', 'warning');
            }
            return;
        }

        try {
            const row = await queryBankRow(id, 0);

            if (!row) {
                clearBankForm(true);
                state.canAdd = true;
                setMode(MODES.VIEW);
                if (useDialogAlerts) {
                    await showAlertDialog('Record Not Found', 'Record does not exist. Click Add to create it.');
                } else {
                    showToast('Bank record not found.', 'warning');
                }
                return;
            }

            applyBankRow(row, id);
            state.canAdd = false;
            setMode(MODES.VIEW);
            await loadChildSections();
            if (!silent) {
                showToast('Bank loaded.', 'success');
            }
        } catch (error) {
            if (useDialogAlerts) {
                await showAlertDialog('Error', 'Bank lookup failed.');
            } else {
                showToast('Bank lookup failed.', 'danger');
            }
        }
    }

    async function loadChildSections() {
        if (!state.bankLoaded) {
            clearChildCollections();
            return;
        }

        clearBranchForm(false);
        setCurrentBranchRow(null);

        await Promise.all([
            loadSignatories(true),
            loadLimits(true)
        ]);
    }

    function applyBranchRow(row) {
        state.currentBranchRow = row;
        state.branchUpdateCount = Number(row.UpdateCount || 0);
        setValue('#bm_branchId', getBranchRowId(row));
        setValue('#bm_branchNameSummary', getBranchRowName(row));
        ensureSelectOption('#bm_branchTypeId', row.BranchTypeID, getBranchTypeName(row));
        setValue('#bm_branchTypeId', row.BranchTypeID || '');
        setValue('#bm_branchName', getBranchRowName(row));
        setValue('#bm_branchAddress1', row.Address1 || '');
        setValue('#bm_branchAddress2', row.Address2 || '');
        ensureSelectOption('#bm_branchCityId', row.CityID, getBranchCityDisplay(row));
        setValue('#bm_branchCityId', row.CityID || '');
        ensureSelectOption('#bm_branchCountryId', row.CountryID, getBranchCountryDisplay(row));
        setValue('#bm_branchCountryId', row.CountryID || '');
        setValue('#bm_branchZipCode', row.ZipCode || '');
        setValue('#bm_branchPhone1', row.Phone1 || '');
        setValue('#bm_branchPhone2', row.Phone2 || '');
        setValue('#bm_branchMobile', row.Mobile || '');
        setValue('#bm_branchEmail', row.Email || row.EMail || row.EMailID || '');
        setValue('#bm_branchFax', row.Fax || '');
        setValue('#bm_branchSwiftCode', row.SWIFTCode || '');
        setValue('#bm_branchRemarks', row.Remarks || '');
        setChecked('#bm_isUpcountry', pickFirstValue(row, ['IsUpCountry', 'IsUpcountry']));
        setValue('#bm_clearingCenter', pickFirstValue(row, ['ClearingCenter', 'ClearingDays']));
        setAudit(row);
    }

    function clearBranchForm(keepId) {
        const currentId = textValue('#bm_branchId');
        setValue('#bm_branchId', keepId ? currentId : '');
        setValue('#bm_branchNameSummary', '');
        setValue('#bm_branchTypeId', '');
        setValue('#bm_branchName', '');
        setValue('#bm_branchAddress1', '');
        setValue('#bm_branchAddress2', '');
        setValue('#bm_branchCityId', '');
        setValue('#bm_branchCountryId', '');
        setValue('#bm_branchZipCode', '');
        setValue('#bm_branchPhone1', '');
        setValue('#bm_branchPhone2', '');
        setValue('#bm_branchMobile', '');
        setValue('#bm_branchEmail', '');
        setValue('#bm_branchFax', '');
        setValue('#bm_branchSwiftCode', '');
        setValue('#bm_branchRemarks', '');
        setChecked('#bm_isUpcountry', false);
        setValue('#bm_clearingCenter', '');
        state.currentBranchRow = null;
        state.branchUpdateCount = 0;
    }

    function renderBranches() {
        const tbody = qs('#bm_branchRows');
        const rows = state.branchRows;
        qs('#bm_branchCount').textContent = rows.length + ' rows';

        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-muted">No branches loaded.</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(function (row) {
            const branchId = getBranchRowId(row);
            const selected = state.currentBranchRow && String(getBranchRowId(state.currentBranchRow) || '') === String(branchId);
            return '<tr data-branch-id="' + escapeHtml(branchId) + '" class="' + (selected ? 'is-selected' : '') + '">' +
                '<td>' + escapeHtml(branchId) + '</td>' +
                '<td>' + escapeHtml(getBranchRowName(row)) + '</td>' +
                '<td>' + escapeHtml(getBranchTypeDisplay(row)) + '</td>' +
                '<td>' + escapeHtml(getBranchCityDisplay(row)) + '</td>' +
                '<td>' + escapeHtml(getBranchCountryDisplay(row)) + '</td>' +
                '<td>' + escapeHtml(row.SWIFTCode || '') + '</td>' +
                '</tr>';
        }).join('');

        qsa('tr[data-branch-id]', tbody).forEach(function (tr) {
            tr.addEventListener('click', function () {
                const row = rows.find(function (candidate) {
                    return String(getBranchRowId(candidate) || '') === tr.getAttribute('data-branch-id');
                });
                if (!row) {
                    return;
                }
                applyBranchRow(row);
                renderBranches();
                setMode(MODES.VIEW);
            });
        });
    }

    async function loadBranches(silent) {
        if (!state.bankLoaded) {
            setCurrentBranchRow(null);
            return false;
        }

        try {
            const row = await loadBranchById(textValue('#bm_branchId'), { silent: true });
            if (!row && !silent && textValue('#bm_branchId')) {
                showToast('Branch record not found for the active bank.', 'warning');
            }
            return !!row;
        } catch (error) {
            showToast('Unable to load branches.', 'danger');
            return false;
        }
    }

    function applySignatoryRow(row) {
        state.currentSignatoryRow = row;
        state.signatoryUpdateCount = Number(row.UpdateCount || 0);
        setValue('#bm_signatoryId', row.SignatoryID || '');
        setValue('#bm_signatoryName', row.SignatoryName || '');
        setValue('#bm_imageId', row.ImageID || '');
        setAudit(row);
        clearImagePreview();
        updateActionState();
        void refreshSignatoryPreviews(true);
    }

    function normalizeLookupSignatoryRow(record) {
        return {
            SignatoryID: String(getLookupSignatoryId(record) || '').trim(),
            SignatoryName: String(getLookupSignatoryName(record) || '').trim(),
            ImageID: String(pickFirstValue(record, ['ImageID', 'imageID', 'ImageId', 'imageId']) || '').trim()
        };
    }

    function applyLookupSignatorySelection(record) {
        const normalized = normalizeLookupSignatoryRow(record);
        if (!normalized.SignatoryID) {
            showToast('The selected signatory is missing Signatory ID.', 'warning');
            return;
        }

        let row = findSignatoryRow(normalized.SignatoryID);
        if (!row) {
            row = normalized;
            state.signatoryRows = state.signatoryRows.concat([row]).sort(function (left, right) {
                return String(left.SignatoryID || '').localeCompare(String(right.SignatoryID || ''));
            });
        } else {
            row.SignatoryName = row.SignatoryName || normalized.SignatoryName;
            row.ImageID = row.ImageID || normalized.ImageID;
        }

        applySignatoryRow(row);
        renderSignatories();
        setMode(MODES.VIEW);
    }

    function clearSignatoryForm(keepId) {
        const currentId = textValue('#bm_signatoryId');
        setValue('#bm_signatoryId', keepId ? currentId : '');
        setValue('#bm_signatoryName', '');
        setValue('#bm_imageId', '');
        state.currentSignatoryRow = null;
        state.signatoryUpdateCount = 0;
        clearImagePreview();
        updateActionState();
    }

    function renderSignatories() {
        const tbody = qs('#bm_signatoryRows');
        const count = qs('#bm_signatoryCount');
        const rows = state.signatoryRows;

        if (!tbody || !count) {
            return;
        }

        count.textContent = rows.length + ' rows';

        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-muted">No signatories loaded.</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(function (row) {
            const signatoryId = row.SignatoryID || '';
            const selected = state.currentSignatoryRow && String(state.currentSignatoryRow.SignatoryID || '') === String(signatoryId);
            return '<tr data-signatory-id="' + escapeHtml(signatoryId) + '" class="' + (selected ? 'is-selected' : '') + '">' +
                '<td>' + escapeHtml(signatoryId) + '</td>' +
                '<td>' + escapeHtml(row.SignatoryName || '') + '</td>' +
                '<td>' + escapeHtml(row.ImageID || '') + '</td>' +
                '</tr>';
        }).join('');

        qsa('tr[data-signatory-id]', tbody).forEach(function (tr) {
            tr.addEventListener('click', function () {
                const row = rows.find(function (candidate) {
                    return String(candidate.SignatoryID || '') === tr.getAttribute('data-signatory-id');
                });
                if (!row) {
                    return;
                }
                applySignatoryRow(row);
                renderSignatories();
                setMode(MODES.VIEW);
            });
        });
    }

    async function loadSignatories(silent) {
        if (!state.bankLoaded) {
            state.signatoryRows = [];
            renderSignatories();
            return false;
        }

        const env = getEnv();
        try {
            const response = await requestBankSignatories({
                BankID: getCurrentBankId(),
                SignatoryID: '',
                OurBranchID: env.ourBranchId,
                OperatorID: env.operatorId,
                Direction: 0,
                GetAll: 1
            });

            if (!responseSucceeded(response)) {
                state.signatoryRows = [];
                renderSignatories();
                showToast(extractResponseMessage(response) || 'Unable to load signatories.', 'danger');
                return false;
            }

            state.signatoryRows = extractRows(getResponseDetailsPayload(response)).filter(function (row) {
                return row.SignatoryID || row.SignatoryName;
            });
            renderSignatories();

            if (!silent) {
                showToast('Signatories refreshed.', 'success');
            }
            return true;
        } catch (error) {
            state.signatoryRows = [];
            renderSignatories();
            showToast((error && error.message) ? error.message : 'Unable to load signatories.', 'danger');
            return false;
        }
    }

    async function getSignatoryDetails(signatoryId, direction) {
        const env = getEnv();
        const response = await requestBankSignatories({
            BankID: getCurrentBankId(),
            SignatoryID: signatoryId || '',
            OurBranchID: env.ourBranchId,
            OperatorID: env.operatorId,
            Direction: typeof direction === 'number' ? direction : 0,
            GetAll: 0
        });

        if (!responseSucceeded(response)) {
            return null;
        }

        const rows = extractRows(getResponseDetailsPayload(response)).filter(function (row) {
            return row.SignatoryID || row.SignatoryName;
        });

        return rows.length ? rows[0] : null;
    }

    function applyLimitRow(row) {
        state.currentLimitRow = row;
        state.limitUpdateCount = Number(row.UpdateCount || 0);
        setValue('#bm_limitClientId', row.ClientID || '');
        setValue('#bm_limitClientName', row.ClientName || '');
        setValue('#bm_clientBranchId', row.ClientBranchID || row.BranchID || '');
        setValue('#bm_limitType', row.LimitType || row.LimitTypeID || '');
        setValue('#bm_limitCurrencyId', row.CurrencyID || '');
        setValue('#bm_limitCurrencyName', getLimitCurrencyName(row));
        setValue('#bm_limitAmount', getLimitAmountValue(row));
        setValue('#bm_limitExpiryDate', normalizeDate(row.ExpiryDate));
        setValue('#bm_limitRemarks', pickFirstValue(row, ['Remarks', 'Remark']));
        setAudit(row);
    }

    function clearLimitForm(keepClient) {
        const currentClientId = textValue('#bm_limitClientId');
        setValue('#bm_limitClientId', keepClient ? currentClientId : '');
        setValue('#bm_limitClientName', '');
        setValue('#bm_clientBranchId', '');
        setValue('#bm_limitType', '');
        setValue('#bm_limitCurrencyId', '');
        setValue('#bm_limitCurrencyName', '');
        setValue('#bm_limitAmount', '');
        setValue('#bm_limitExpiryDate', '');
        setValue('#bm_limitRemarks', '');
        state.currentLimitRow = null;
        state.limitUpdateCount = 0;
    }

    function renderLimits() {
        const tbody = qs('#bm_limitRows');
        const rows = state.limitRows;
        qs('#bm_limitCount').textContent = rows.length + ' rows';

        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-muted">No limit rows loaded.</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(function (row, index) {
            const limitKey = String(row.ClientID || '') + '|' + String(row.LimitType || row.LimitTypeID || '') + '|' + index;
            const selected = state.currentLimitRow === row;
            return '<tr data-limit-key="' + escapeHtml(limitKey) + '" class="' + (selected ? 'is-selected' : '') + '">' +
                '<td>' + escapeHtml(getLimitTypeName(row)) + '</td>' +
                '<td>' + escapeHtml(getLimitCurrencyName(row)) + '</td>' +
                '<td>' + escapeHtml(getLimitAmountValue(row)) + '</td>' +
                '<td>' + escapeHtml(normalizeDate(row.ExpiryDate)) + '</td>' +
                '</tr>';
        }).join('');

        qsa('tr[data-limit-key]', tbody).forEach(function (tr, index) {
            tr.addEventListener('click', function () {
                const row = rows[index];
                if (!row) {
                    return;
                }
                applyLimitRow(row);
                renderLimits();
                setMode(MODES.VIEW);
            });
        });
    }

    async function loadLimits(silent) {
        if (!state.bankLoaded) {
            state.limitRows = [];
            renderLimits();
            return;
        }

        const env = getEnv();
        try {
            const clientBranchId = textValue('#bm_clientBranchId') || env.ourBranchId;
            const clientId = textValue('#bm_limitClientId') || textValue('#bm_clientId');
            const response = await service.getBankLimit({
                BankID: getCurrentBankId(),
                ClientBranchID: clientBranchId,
                ClientID: clientId,
                LimitType: '',
                OperatorID: env.operatorId,
                CurrencyID: ''
            });

            state.limitRows = extractRows(response).filter(function (row) {
                return getLimitTypeName(row) || row.CurrencyID || getLimitAmountValue(row);
            });
            renderLimits();

            if (!silent) {
                showToast('Bank limits refreshed.', 'success');
            }
        } catch (error) {
            showToast('Unable to load bank limits.', 'danger');
        }
    }

    function normalizeDate(value) {
        if (!value) {
            return '';
        }

        const text = String(value);
        if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
            return text;
        }

        const date = new Date(text);
        if (Number.isNaN(date.getTime())) {
            return '';
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }

    function nowString() {
        return new Date().toLocaleString('en-US');
    }

    async function saveBank() {
        const env = getEnv();
        const bankId = getCurrentBankId();
        if (!bankId) {
            showToast('Bank ID is required.', 'warning');
            return;
        }

        const payload = {
            BankID: bankId,
            InstitutionTypeID: textValue('#bm_institutionTypeId'),
            BankName: textValue('#bm_bankName'),
            ShortName: textValue('#bm_shortName'),
            ClientID: textValue('#bm_clientId'),
            CreditRating: textValue('#bm_creditRating'),
            IsLocalClearingBank: qs('#bm_isLocalClearing').checked ? 1 : 0,
            IsForeignClearingBank: qs('#bm_isForeignClearing').checked ? 1 : 0,
            ClearingThrough: textValue('#bm_clearingThrough'),
            OurBranchID: env.ourBranchId,
            OperatorID: env.operatorId,
            CreatedBy: state.mode === MODES.ADD ? env.operatorId : '',
            CreatedOn: state.mode === MODES.ADD ? nowString() : '',
            ModifiedBy: env.operatorId,
            ModifiedOn: nowString(),
            UpdateCount: state.bankUpdateCount,
            NewRecord: state.mode === MODES.ADD ? 1 : 0
        };

        try {
            const response = await service.addEditBank(payload);
            if (!responseSucceeded(response)) {
                await showAlertDialog('Error', extractResponseMessage(response) || 'Save failed.');
                return;
            }

            try {
                await loadBank(bankId, true);
            } catch (_) {
                await showAlertDialog('Warning', 'Bank saved, but the screen could not refresh automatically. Use View to reload the record.');
            }

            setMode(MODES.VIEW);
            showToast('Bank saved.', 'success');
        } catch (error) {
            await showAlertDialog('Error', (error && error.message) ? error.message : 'Bank save failed.');
        }
    }

    async function deleteBank() {
        const bankId = getCurrentBankId();
        if (!bankId || !state.bankLoaded) {
            showToast('Load a bank first.', 'warning');
            return;
        }

        if (!await showConfirmationDialog('Delete Bank', 'Are you sure you want to delete bank ' + bankId + '?')) {
            return;
        }

        try {
            const response = await service.deleteBank({ BankID: bankId, UpdateCount: state.bankUpdateCount });
            if (!responseSucceeded(response)) {
                showToast(extractResponseMessage(response) || 'Delete failed.', 'danger');
                return;
            }
            clearBankForm(false);
            setMode(MODES.VIEW);
            showToast('Bank deleted.', 'success');
        } catch (error) {
            showToast('Bank delete failed.', 'danger');
        }
    }

    async function saveBranch() {
        if (!state.bankLoaded) {
            showToast('Load a bank first.', 'warning');
            return;
        }

        const env = getEnv();
        const branchId = textValue('#bm_branchId');
        if (!branchId) {
            showToast('Branch ID is required.', 'warning');
            return;
        }

        const payload = {
            BankID: getCurrentBankId(),
            BranchID: branchId,
            BranchTypeID: textValue('#bm_branchTypeId'),
            BranchName: textValue('#bm_branchName'),
            Address1: textValue('#bm_branchAddress1'),
            Address2: textValue('#bm_branchAddress2'),
            CityID: textValue('#bm_branchCityId'),
            CountryID: textValue('#bm_branchCountryId'),
            ZipCode: textValue('#bm_branchZipCode'),
            Phone1: textValue('#bm_branchPhone1'),
            Phone2: textValue('#bm_branchPhone2'),
            Mobile: textValue('#bm_branchMobile'),
            Fax: textValue('#bm_branchFax'),
            EMail: textValue('#bm_branchEmail'),
            ContactPerson1: '',
            ContactPerson2: '',
            ourBranchID: env.ourBranchId,
            Remarks: textValue('#bm_branchRemarks'),
            IsUpcountry: qs('#bm_isUpcountry').checked ? 1 : 0,
            ClearingCenter: textValue('#bm_clearingCenter'),
            SWIFTCode: textValue('#bm_branchSwiftCode'),
            CreatedBy: state.mode === MODES.ADD ? env.operatorId : '',
            CreatedOn: state.mode === MODES.ADD ? nowString() : '',
            ModifiedBy: env.operatorId,
            ModifiedOn: nowString(),
            SupervisedBy: '',
            SupervisedOn: '',
            UpdateCount: state.branchUpdateCount,
            NewRecord: state.mode === MODES.ADD ? 1 : 0
        };

        try {
            const response = await service.addEditBranch(payload);
            if (!responseSucceeded(response)) {
                showToast(extractResponseMessage(response) || 'Save failed.', 'danger');
                return;
            }

            const row = await loadBranchById(branchId, { silent: true });
            if (row) {
                applyBranchRow(row);
                setCurrentBranchRow(row);
            }
            setMode(MODES.VIEW);
            showToast('Branch saved.', 'success');
        } catch (error) {
            showToast('Branch save failed.', 'danger');
        }
    }

    async function deleteBranch() {
        const branchId = textValue('#bm_branchId');
        if (!state.bankLoaded || !branchId) {
            showToast('Load a branch first.', 'warning');
            return;
        }

        const deletedIndex = state.branchRows.findIndex(function (candidate) {
            return String(getBranchRowId(candidate) || '') === String(branchId);
        });

        if (!await showConfirmationDialog('Delete Branch', 'Are you sure you want to delete branch ' + branchId + '?')) {
            return;
        }

        try {
            const env = getEnv();
            const response = await service.deleteBranch({
                OurBranchID: env.ourBranchId,
                BankID: getCurrentBankId(),
                BranchID: branchId,
                UpdateCount: state.branchUpdateCount,
                NewRecord: 0
            });
            if (!responseSucceeded(response)) {
                showToast(extractResponseMessage(response) || 'Delete failed.', 'danger');
                return;
            }

            state.branchRows = state.branchRows.filter(function (candidate) {
                return String(getBranchRowId(candidate) || '') !== String(branchId);
            });
            syncBranchTypeOptions(state.branchRows);
            const nextRow = state.branchRows.length
                ? state.branchRows[Math.min(Math.max(deletedIndex, 0), state.branchRows.length - 1)]
                : null;
            if (nextRow) {
                applyBranchRow(nextRow);
                renderBranches();
            } else {
                clearBranchForm(false);
                renderBranches();
            }
            setMode(MODES.VIEW);
            showToast('Branch deleted.', 'success');
        } catch (error) {
            showToast('Branch delete failed.', 'danger');
        }
    }

    async function saveSignatory() {
        if (!state.bankLoaded) {
            showToast('Load a bank first.', 'warning');
            return;
        }

        const env = getEnv();
        const signatoryId = textValue('#bm_signatoryId');
        if (!signatoryId) {
            showToast('Signatory ID is required.', 'warning');
            return;
        }

        const payload = {
            BankID: getCurrentBankId(),
            SignatoryID: signatoryId,
            SignatoryName: textValue('#bm_signatoryName'),
            ImageID: textValue('#bm_imageId'),
            CreatedBy: state.mode === MODES.ADD ? env.operatorId : '',
            CreatedOn: state.mode === MODES.ADD ? nowString() : '',
            ModifiedBy: env.operatorId,
            ModifiedOn: nowString(),
            SupervisedBy: '',
            SupervisedOn: '',
            UpdateCount: state.signatoryUpdateCount,
            NewRecord: state.mode === MODES.ADD ? 1 : 0
        };

        try {
            const response = await service.addEditBankSignatory(payload);
            if (!responseSucceeded(response)) {
                showToast(extractResponseMessage(response) || 'Save failed.', 'danger');
                return;
            }
            await loadSignatories(true);
            const row = findSignatoryRow(signatoryId);
            if (row) {
                applySignatoryRow(row);
                renderSignatories();
            }
            setMode(MODES.VIEW);
            showToast('Signatory saved.', 'success');
        } catch (error) {
            showToast('Signatory save failed.', 'danger');
        }
    }

    async function deleteSignatory() {
        const signatoryId = textValue('#bm_signatoryId');
        if (!state.bankLoaded || !signatoryId) {
            showToast('Load a signatory first.', 'warning');
            return;
        }

        const deletedIndex = state.signatoryRows.findIndex(function (candidate) {
            return String(candidate.SignatoryID || '') === String(signatoryId);
        });

        if (!await showConfirmationDialog('Delete Signatory', 'Are you sure you want to delete signatory ' + signatoryId + '?')) {
            return;
        }

        try {
            const response = await service.deleteBankSignatory({
                BankID: getCurrentBankId(),
                SignatoryID: signatoryId,
                UpdateCount: state.signatoryUpdateCount
            });
            if (!responseSucceeded(response)) {
                showToast(extractResponseMessage(response) || 'Delete failed.', 'danger');
                return;
            }
            await loadSignatories(true);
            const nextRow = getRemainingRowByIndex(state.signatoryRows, deletedIndex);
            if (nextRow) {
                applySignatoryRow(nextRow);
                renderSignatories();
            } else {
                clearSignatoryForm(false);
                renderSignatories();
            }
            setMode(MODES.VIEW);
            showToast('Signatory deleted.', 'success');
        } catch (error) {
            showToast('Signatory delete failed.', 'danger');
        }
    }

    function xmlEscape(value) {
        return escapeHtml(value).replace(/&quot;/g, '"');
    }

    function buildLimitDetailXml(record) {
        return '<dt_BankLimit>' +
            '<BankID>' + xmlEscape(record.BankID) + '</BankID>' +
            '<ClientID>' + xmlEscape(record.ClientID) + '</ClientID>' +
            '<ClientBranchID>' + xmlEscape(record.ClientBranchID) + '</ClientBranchID>' +
            '<LimitType>' + xmlEscape(record.LimitType) + '</LimitType>' +
            '<CurrencyID>' + xmlEscape(record.CurrencyID) + '</CurrencyID>' +
            '<LimitAmount>' + xmlEscape(record.LimitAmount) + '</LimitAmount>' +
            '<Amount>' + xmlEscape(record.LimitAmount) + '</Amount>' +
            '<ExpiryDate>' + xmlEscape(record.ExpiryDate) + '</ExpiryDate>' +
            '<Remarks>' + xmlEscape(record.Remarks) + '</Remarks>' +
            '</dt_BankLimit>';
    }

    async function saveLimit() {
        if (!state.bankLoaded) {
            showToast('Load a bank first.', 'warning');
            return;
        }

        const env = getEnv();
        const record = {
            BankID: getCurrentBankId(),
            ClientID: textValue('#bm_limitClientId') || textValue('#bm_clientId'),
            ClientBranchID: textValue('#bm_clientBranchId') || env.ourBranchId,
            LimitType: textValue('#bm_limitType'),
            CurrencyID: textValue('#bm_limitCurrencyId'),
            LimitAmount: textValue('#bm_limitAmount'),
            ExpiryDate: textValue('#bm_limitExpiryDate') || '1900-01-01',
            Remarks: textValue('#bm_limitRemarks')
        };

        if (!record.ClientID || !record.LimitType || !record.CurrencyID) {
            showToast('Client, limit type, and currency are required.', 'warning');
            return;
        }

        const payload = {
            BankID: record.BankID,
            ClientID: record.ClientID,
            ClientBranchID: record.ClientBranchID,
            LimitType: record.LimitType,
            CurrencyID: record.CurrencyID,
            CreatedBy: state.mode === MODES.ADD ? env.operatorId : '',
            CreatedOn: state.mode === MODES.ADD ? nowString() : '',
            ModifiedBy: env.operatorId,
            ModifiedOn: nowString(),
            SupervisedBy: '',
            SupervisedOn: '',
            UpdateCount: state.limitUpdateCount,
            DetailRecords: buildLimitDetailXml(record)
        };

        try {
            const response = await service.addEditBankLimit(payload);
            if (!responseSucceeded(response)) {
                showToast(extractResponseMessage(response) || 'Save failed.', 'danger');
                return;
            }
            await loadLimits(true);
            const row = findLimitRow(record);
            if (row) {
                applyLimitRow(row);
                renderLimits();
            }
            setMode(MODES.VIEW);
            showToast('Bank limit saved.', 'success');
        } catch (error) {
            showToast('Bank limit save failed.', 'danger');
        }
    }

    async function deleteLimit() {
        if (!state.bankLoaded || !state.currentLimitRow) {
            showToast('Load a limit row first.', 'warning');
            return;
        }

        const deletedIndex = state.limitRows.indexOf(state.currentLimitRow);

        if (!await showConfirmationDialog('Delete Bank Limit', 'Are you sure you want to delete the selected bank limit?')) {
            return;
        }

        try {
            const response = await service.deleteBankLimit({
                BankID: getCurrentBankId(),
                ClientBranchID: textValue('#bm_clientBranchId'),
                ClientID: textValue('#bm_limitClientId'),
                LimitType: textValue('#bm_limitType'),
                UpdateCount: state.limitUpdateCount
            });
            if (!responseSucceeded(response)) {
                showToast(extractResponseMessage(response) || 'Delete failed.', 'danger');
                return;
            }
            await loadLimits(true);
            const nextRow = getRemainingRowByIndex(state.limitRows, deletedIndex);
            if (nextRow) {
                applyLimitRow(nextRow);
                renderLimits();
            } else {
                clearLimitForm(false);
                renderLimits();
            }
            setMode(MODES.VIEW);
            showToast('Bank limit deleted.', 'success');
        } catch (error) {
            showToast('Bank limit delete failed.', 'danger');
        }
    }

    async function refreshSignatoryPreviews(silent) {
        const signatoryId = textValue('#bm_signatoryId');
        if (!signatoryId) {
            clearImagePreview();
            return;
        }

        await loadImage('photo', { silent: silent !== false });
        await loadImage('signature', { silent: silent !== false });
    }

    async function loadImage(kind, options) {
        const settings = options || {};
        const signatoryId = textValue('#bm_signatoryId');
        if (!signatoryId) {
            if (!settings.silent) {
                showToast('Select a signatory first.', 'warning');
            }
            return;
        }

        const env = getEnv();
        try {
            const payload = await invokeControllerRequest('StaticData/BankMaster/api/get-' + (kind === 'photo' ? 'photo' : 'signature') + '-image', {
                OurBranchID: env.ourBranchId,
                SignatoryID: signatoryId,
                OperatorID: env.operatorId
            });
            if (!payload || !payload.success || !payload.imageData) {
                const target = kind === 'photo' ? qs('#bm_photoPreview') : qs('#bm_signaturePreview');
                if (target) {
                    target.removeAttribute('src');
                }
                if (!settings.silent) {
                    showToast('No ' + kind + ' image found.', 'warning');
                }
                return;
            }

            const target = kind === 'photo' ? qs('#bm_photoPreview') : qs('#bm_signaturePreview');
            if (!target) {
                return;
            }
            target.src = payload.imageData.indexOf('data:image') === 0 ? payload.imageData : ('data:image/png;base64,' + payload.imageData);
        } catch (error) {
            if (!settings.silent) {
                showToast('Unable to load ' + kind + ' image.', 'danger');
            }
        }
    }

    function beginAdd() {
        state.canAdd = true;
        if (state.activeSection === 'banks') {
            clearBankForm(false);
        } else if (state.activeSection === 'branches') {
            clearBranchForm(false);
        } else if (state.activeSection === 'signatories') {
            clearSignatoryForm(false);
        } else if (state.activeSection === 'limits') {
            clearLimitForm(false);
        }
        setMode(MODES.ADD);
    }

    function beginEdit() {
        if (!hasSectionRecord(state.activeSection)) {
            showToast('Load a record first.', 'warning');
            return;
        }
        state.canAdd = false;
        setMode(MODES.EDIT);
    }

    async function viewCurrentSection() {
        if (state.activeSection === 'banks') {
            const currentId = getCurrentBankId();
            const currentRowId = state.currentBankRow ? getBankRowId(state.currentBankRow) : '';
            const effectiveId = currentId || currentRowId;

            if (state.bankLoaded && state.currentBankRow && normalizeIdentity(currentRowId) === normalizeIdentity(effectiveId)) {
                applyBankRow(state.currentBankRow, effectiveId);
                await loadChildSections();
                return;
            }

            await loadBank(effectiveId, false, true);
            return;
        }

        if (!state.bankLoaded) {
            showToast('Load a bank first.', 'warning');
            return;
        }

        if (state.activeSection === 'branches') {
            const branchId = textValue('#bm_branchId');
            let row = findBranchRow(branchId);
            if (row) {
                applyBranchRow(row);
                renderBranches();
                return;
            }

            try {
                row = await loadBranchById(branchId, { silent: true });
            } catch (_) {
                row = null;
            }

            if (row) {
                setMode(MODES.VIEW);
                return;
            }

            showToast(branchId ? 'Branch record not found for the active bank.' : 'Enter or select a branch first.', 'warning');
            return;
        }

        if (state.activeSection === 'signatories') {
            const signatoryId = textValue('#bm_signatoryId');
            const row = state.signatoryRows.find(function (candidate) { return String(candidate.SignatoryID || '') === signatoryId; });
            if (row) {
                applySignatoryRow(row);
                renderSignatories();
            }
            return;
        }

        if (state.activeSection === 'limits') {
            renderLimits();
        }
    }

    async function saveCurrentSection() {
        if (state.activeSection === 'banks') {
            await saveBank();
        } else if (state.activeSection === 'branches') {
            await saveBranch();
        } else if (state.activeSection === 'signatories') {
            await saveSignatory();
        } else if (state.activeSection === 'limits') {
            await saveLimit();
        }
    }

    async function deleteCurrentSection() {
        if (state.activeSection === 'banks') {
            await deleteBank();
        } else if (state.activeSection === 'branches') {
            await deleteBranch();
        } else if (state.activeSection === 'signatories') {
            await deleteSignatory();
        } else if (state.activeSection === 'limits') {
            await deleteLimit();
        }
    }

    function cancelCurrentSection() {
        if (state.activeSection === 'banks') {
            if (state.currentBankRow) {
                applyBankRow(state.currentBankRow, getCurrentBankId());
            } else {
                clearBankForm(false);
            }
        } else if (state.activeSection === 'branches') {
            if (state.currentBranchRow) {
                applyBranchRow(state.currentBranchRow);
            } else {
                clearBranchForm(false);
            }
            renderBranches();
        } else if (state.activeSection === 'signatories') {
            if (state.currentSignatoryRow) {
                applySignatoryRow(state.currentSignatoryRow);
            } else {
                clearSignatoryForm(false);
            }
            renderSignatories();
        } else if (state.activeSection === 'limits') {
            if (state.currentLimitRow) {
                applyLimitRow(state.currentLimitRow);
            } else {
                clearLimitForm(false);
            }
            renderLimits();
        }

        state.canAdd = false;
        setMode(MODES.VIEW);
    }

    function closeCurrentSection() {
        if (state.activeSection !== 'banks') {
            setSection('banks');
            setMode(MODES.VIEW);
            return;
        }

        if (window.history.length > 1) {
            window.history.back();
            return;
        }

        showToast('No previous page is available.', 'info');
    }

    async function populateLimitTypes() {
        const select = qs('#bm_limitType');
        if (!select || !window.LookupService || typeof window.LookupService.getLimitTypes !== 'function') {
            return;
        }

        try {
            const options = await window.LookupService.getLimitTypes();
            const currentValue = select.value;
            const rendered = ['<option value="">Select limit type</option>'];
            (options || []).forEach(function (option) {
                rendered.push('<option value="' + escapeHtml(option.value) + '">' + escapeHtml(option.label || option.value) + '</option>');
            });
            select.innerHTML = rendered.join('');
            select.value = currentValue;
        } catch (_) {
            select.innerHTML = '<option value="">Select limit type</option>';
        }
    }

    function bindActionButtons() {
        const viewButton = qs('#submoduleBtnView');
        const addButton = qs('#submoduleBtnAdd');
        const editButton = qs('#submoduleBtnEdit');
        const deleteButton = qs('#submoduleBtnDelete');
        const saveButton = qs('#submoduleBtnSave');
        const cancelButton = qs('#submoduleBtnCancel');
        const closeButton = qs('#submoduleBtnClose');
        const photoButton = qs('#submoduleBtnPhoto');
        const signatureButton = qs('#submoduleBtnSignature');
        const bothButton = qs('#submoduleBtnBoth');

        if (viewButton) {
            viewButton.addEventListener('click', function () { void viewCurrentSection(); });
        }
        if (addButton) {
            addButton.addEventListener('click', beginAdd);
        }
        if (editButton) {
            editButton.addEventListener('click', beginEdit);
        }
        if (deleteButton) {
            deleteButton.addEventListener('click', function () { void deleteCurrentSection(); });
        }
        if (saveButton) {
            saveButton.addEventListener('click', function () { void saveCurrentSection(); });
        }
        if (cancelButton) {
            cancelButton.addEventListener('click', cancelCurrentSection);
        }
        if (closeButton) {
            closeButton.addEventListener('click', closeCurrentSection);
        }
        if (photoButton) {
            photoButton.addEventListener('click', function () { void loadImage('photo'); });
        }
        if (signatureButton) {
            signatureButton.addEventListener('click', function () { void loadImage('signature'); });
        }
        if (bothButton) {
            bothButton.addEventListener('click', async function () {
                await loadImage('photo');
                await loadImage('signature');
            });
        }
    }

    function bindEvents() {
        qsa('.sidebar-item[data-submodule], .sidebar-item--enhanced[data-submodule]').forEach(function (button) {
            button.addEventListener('click', function () {
                setSection(button.getAttribute('data-submodule'));
            });
            button.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSection(button.getAttribute('data-submodule'));
                }
            });
        });

        wireLookupButtons();

        qs('#bm_bankId').addEventListener('blur', function () {
            if (state.mode === MODES.VIEW && textValue('#bm_bankId')) {
                void loadBank(textValue('#bm_bankId'), true);
            }
        });

    }

    function init() {
        if (!qs('#bankMasterModule') || !service) {
            return;
        }

        document.body.classList.add('bank-master');
        if (window.SidebarManager && typeof window.SidebarManager.init === 'function' && qs('#main-sidebar')) {
            window.SidebarManager.init({ moduleName: 'bank', isMainRecordLoaded: false, primaryRecordId: null });
        }
        initSectionToggles();
        bindEvents();
        void populateLimitTypes();
        updateBankSummary();
        syncSidebarRecordState();
        setSection(getConfiguredInitialSection());
        setMode(MODES.VIEW);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();