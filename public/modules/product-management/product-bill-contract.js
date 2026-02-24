// Product Bill Contract JavaScript
(function () {
    const CHILD_FORMS = {
        'product-gl-interface': 'product-gl-interface.html',
        'product-documents': 'product-documents.html',
        'user-defined-fields': 'user-defined-fields.html',
        'product-charges': 'product-charges.html',
        'swift-free-format-text': 'swift-free-format-text.html'
    };

    function getOverlayEls() {
        return {
            overlay: document.querySelector('[data-child-overlay]'),
            iframe: document.querySelector('[data-child-iframe]')
        };
    }

    function setOverlayOpen(isOpen) {
        const { overlay } = getOverlayEls();
        if (!overlay) return;
        overlay.classList.toggle('is-open', Boolean(isOpen));
        overlay.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    }

    function openChildForm(childKey) {
        const path = CHILD_FORMS[childKey];
        const { iframe } = getOverlayEls();
        if (!path || !iframe) return;
        iframe.src = path;
        setOverlayOpen(true);
    }

    function closeChildForm() {
        const { iframe } = getOverlayEls();
        if (iframe) iframe.src = '';
        setOverlayOpen(false);
    }

    // Expose closeChildForm globally for iframe communication
    window.closeChildForm = closeChildForm;
    window.closeModalWindow = closeChildForm;

    function setSectionOpen(sectionEl, isOpen) {
        if (!sectionEl) return;
        sectionEl.classList.toggle('is-open', Boolean(isOpen));

        const toggle = sectionEl.querySelector('.nav-arrow');
        const items = sectionEl.querySelector('.nav-items');

        if (toggle) toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (items) items.hidden = !isOpen;
    }

    function wireNavSections() {
        const sections = Array.from(document.querySelectorAll('[data-nav-section]'));
        if (!sections.length) return;

        sections.forEach(section => {
            const toggle = section.querySelector('.nav-arrow');
            if (!toggle) return;

            toggle.addEventListener('click', () => {
                const isOpen = section.classList.contains('is-open');
                setSectionOpen(section, !isOpen);
            });
        });

        // Open first section by default (DataEntry)
        if (sections[0]) {
            setSectionOpen(sections[0], true);
        }
    }

    function wireSidebar() {
        document.querySelectorAll('.cm-legacy-nav__item[data-child-form], .sidebar-item[data-child-form]').forEach(item => {
            item.addEventListener('click', () => {
                const formKey = item.getAttribute('data-child-form');
                if (formKey) {
                    openChildForm(formKey);
                }
            });
        });
    }

    function wireOverlayClose() {
        const { overlay } = getOverlayEls();
        if (!overlay) return;

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeChildForm();
        });

        window.addEventListener('message', function (event) {
            if (event.data === 'close' || event.data?.type === 'close') {
                closeChildForm();
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeChildForm();
        });
    }

    // Sidebar Toggle Functions
    function wireSidebarToggle() {
        const toggleBtn = document.getElementById('sidebarToggle');
        const sidebar = document.querySelector('.sidebar');
        const mainContainer = document.querySelector('.main-container');

        if (!toggleBtn || !sidebar) return;

        toggleBtn.addEventListener('click', function () {
            sidebar.classList.toggle('collapsed');
            if (mainContainer) {
                mainContainer.classList.toggle('sidebar-collapsed');
            }

            // Toggle chevron icon direction
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.classList.toggle('bi-chevron-left');
                icon.classList.toggle('bi-chevron-right');
            }
        });
    }

    // Product Search Functions
    function openProductSearchPanel() {
        const modalElement = document.getElementById('productLookupModal');
        if (!modalElement) {
            console.warn('[ProductBillContract] Product lookup modal not found');
            return;
        }

        const ModalCtor = window.bootstrap?.Modal;
        if (!ModalCtor) {
            console.error('[ProductBillContract] Bootstrap Modal not available');
            return;
        }

        const modalInstance = ModalCtor.getOrCreateInstance(modalElement);
        modalInstance.show();

        const idInput = document.getElementById('productSearchId');
        if (idInput) {
            setTimeout(() => idInput.focus(), 300);
        }
        resetProductSearchPanel();
    }

    function closeProductSearchPanel() {
        const modalElement = document.getElementById('productLookupModal');
        if (!modalElement) return;

        const ModalCtor = window.bootstrap?.Modal;
        if (ModalCtor) {
            const modalInstance = ModalCtor.getInstance(modalElement);
            if (modalInstance) modalInstance.hide();
        }
    }

    function resetProductSearchPanel() {
        const form = document.getElementById('productLookupForm');
        const results = document.getElementById('productSearchResults');
        const empty = document.getElementById('productSearchEmpty');
        const loading = document.getElementById('productSearchLoading');
        if (form) form.reset();
        if (results) results.innerHTML = '';
        if (empty) {
            empty.style.display = 'block';
            empty.textContent = 'Enter at least one filter above and click Search to query products.';
        }
        if (loading) loading.classList.add('d-none');
    }

    async function performProductSearch(event) {
        if (event) event.preventDefault();

        const productIdMode = document.getElementById('productSearchModeId')?.value || 'Like';
        const productId = document.getElementById('productSearchId')?.value?.trim() || '';
        const productNameMode = document.getElementById('productSearchModeName')?.value || 'Like';
        const productName = document.getElementById('productSearchName')?.value?.trim() || '';

        const results = document.getElementById('productSearchResults');
        const empty = document.getElementById('productSearchEmpty');
        const loading = document.getElementById('productSearchLoading');

        if (empty) empty.style.display = 'none';
        if (loading) loading.classList.remove('d-none');
        if (results) results.innerHTML = '';

        try {
            const SearchService = window.SearchService;
            if (!SearchService) {
                throw new Error('SearchService not loaded');
            }

            // Build WHERE clause similar to Product (SB,CA,CS,SH) form
            const clauses = [];
            const buildClause = (col, mode, val) => {
                if (!val) return null;
                const safe = val.replace(/'/g, "''");
                return mode === 'Exact' ? `${col} = '${safe}'` : `${col} like '%${safe}%'`;
            };
            
            const idClause = buildClause('ProductID', productIdMode, productId);
            const nameClause = buildClause('Description', productNameMode, productName);
            [idClause, nameClause].forEach(c => c && clauses.push(c));

            const whereStmt = clauses.join(' AND ') || '1=1';

            const payload = {
                TableID: 'ProductID',
                WhereStmt: whereStmt,
                AdvFilterString: '',
                PrevOrNext: ' ',
                RefID: '',
                OperatorID: sessionStorage.getItem('OperatorID') || 'web_portal',
                ModuleID: 1000,
                OurBranchID: sessionStorage.getItem('OurBranchID') || ''
            };

            const service = window.ClientService || window.SearchService;
            if (!service || (typeof service.searchClients !== 'function' && typeof service.search !== 'function')) {
                throw new Error('Search service not available');
            }
            
            const response = service.searchClients ? await service.searchClients(payload) : await service.search(payload);
            let rows = response?.Details?.SearchResults || response?.Details || response?.SearchResults || [];
            if (!Array.isArray(rows)) rows = rows ? [rows] : [];

            if (loading) loading.classList.add('d-none');

            if (!rows.length) {
                if (empty) {
                    empty.style.display = 'block';
                    empty.textContent = 'No products found matching your search criteria.';
                }
                return;
            }

            if (results) {
                results.innerHTML = rows.map((r, idx) => {
                    const pid = r.ProductID || r.productId || '';
                    const desc = r.Description || r.description || r.Name || '';
                    return `<tr data-result-index="${idx}" style="cursor: pointer;">
                        <td>${pid}</td>
                        <td>${desc}</td>
                        <td class="text-end">
                            <button type="button" class="btn btn-sm btn-primary" data-result-index="${idx}">
                                <i class="bi bi-check-circle me-1"></i>Select
                            </button>
                        </td>
                    </tr>`;
                }).join('');

                // Add click handlers for select buttons
                results.querySelectorAll('button[data-result-index]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const idx = Number(btn.getAttribute('data-result-index'));
                        const row = rows[idx];
                        const pid = row?.ProductID || row?.productId || '';
                        const desc = row?.Description || row?.description || row?.Name || '';
                        
                        const productField = document.getElementById('ProductID');
                        const productNameField = document.getElementById('ProductName');
                        
                        if (productField) productField.value = pid;
                        if (productNameField) productNameField.value = desc;
                        
                        closeProductSearchPanel();
                    });
                });

                // Add double-click handlers for rows
                results.querySelectorAll('tr[data-result-index]').forEach(tr => {
                    tr.addEventListener('dblclick', () => {
                        const idx = Number(tr.getAttribute('data-result-index'));
                        const row = rows[idx];
                        const pid = row?.ProductID || row?.productId || '';
                        const desc = row?.Description || row?.description || row?.Name || '';
                        
                        const productField = document.getElementById('ProductID');
                        const productNameField = document.getElementById('ProductName');
                        
                        if (productField) productField.value = pid;
                        if (productNameField) productNameField.value = desc;
                        
                        closeProductSearchPanel();
                    });
                });
            }
        } catch (error) {
            console.error('[ProductBillContract] Search error:', error);
            if (loading) loading.classList.add('d-none');
            if (empty) {
                empty.style.display = 'block';
                empty.textContent = 'Error performing search. Please try again.';
            }
        }
    }

    function wireProductSearchPanel() {
        const form = document.getElementById('productLookupForm');
        const submitBtn = document.getElementById('productSearchSubmit');
        const resetBtn = document.getElementById('productSearchReset');
        const refreshBtn = document.getElementById('productSearchRefresh');

        if (form) form.addEventListener('submit', performProductSearch);
        if (submitBtn) submitBtn.addEventListener('click', performProductSearch);
        if (resetBtn) resetBtn.addEventListener('click', (e) => { e.preventDefault(); resetProductSearchPanel(); });
        if (refreshBtn) refreshBtn.addEventListener('click', (e) => { e.preventDefault(); resetProductSearchPanel(); });

        document.addEventListener('keydown', (e) => {
            const modalElement = document.getElementById('productLookupModal');
            if (!modalElement) return;
            const isVisible = modalElement.classList.contains('show');
            if (e.key === 'Escape' && isVisible) closeProductSearchPanel();
        });
    }

    function wireLookupButtons() {
        const productSearchBtn = document.getElementById('productSearchBtn');
        if (productSearchBtn) {
            productSearchBtn.addEventListener('click', function() {
                console.log('[ProductBillContract] Product search button clicked');
                openProductSearchPanel();
            });
        }
    }

    function wireProductFieldF2() {
        const productField = document.getElementById('ProductID');
        if (productField) {
            productField.addEventListener('keydown', function(e) {
                if (e.key === 'F2') {
                    e.preventDefault();
                    console.log('[ProductBillContract] F2 pressed on Product field');
                    openProductSearchPanel();
                }
            });
            console.log('[ProductBillContract] F2 key handler attached to ProductID field');
        } else {
            console.warn('[ProductBillContract] ProductID field not found for F2 handler');
        }
    }

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', function () {
        console.log('[ProductBillContract] Product Bill Contract loaded');
        wireNavSections();
        wireSidebar();
        wireSidebarToggle();
        wireOverlayClose();
        wireProductSearchPanel();
        wireLookupButtons();
        wireProductFieldF2();
        console.log('[ProductBillContract] Initialization complete');
        // Action buttons handled by assets/js/pages/products/product-bill-contract.js
    });
})();
