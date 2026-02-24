// Product Maintenance - Loan JavaScript
(function () {
    const CHILD_FORMS = {
        'product-gl-interface': 'product-gl-interface.html',
        'installment-allocations': 'installment-allocations.html',
        'product-parameters': 'product-parameters.html',
        'user-defined-fields': 'user-defined-fields.html',
        'product-loan-cycle': 'product-loan-cycle.html',
        'product-charges': 'product-charges.html',
        'product-notification': 'product-notification.html',
        'loan-appraisal-limit': 'loan-appraisal-limit.html'
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
        const sidebar = document.querySelector('.sidebar');
        const navSections = document.querySelectorAll('.nav-section');
        const menuBtn = document.querySelector('.submodules-menu-btn');
        const searchInput = document.querySelector('.submodules-search-input');

        // Sidebar menu button - toggle collapse/expand
        if (menuBtn) {
            menuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                sidebar.classList.toggle('sidebar-collapsed');
                document.querySelector('.main-container').classList.toggle('sidebar-collapsed');
            });
        }

        // Nav section toggle - expand/collapse
        navSections.forEach(section => {
            const header = section.querySelector('.nav-header');
            if (header) {
                header.addEventListener('click', (e) => {
                    e.preventDefault();
                    const items = section.querySelector('.nav-items');
                    if (items) {
                        items.classList.toggle('collapsed');
                        section.classList.toggle('is-open');
                    }
                });
            }
        });

        // Sidebar items - validate Product ID before opening child forms
        const sidebarItems = document.querySelectorAll('.sidebar-item, .cm-legacy-nav__item[data-child-form]');
        sidebarItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Get Product ID from form
                const productIdInput = document.querySelector('#Product');
                const productId = productIdInput ? productIdInput.value.trim() : '';
                
                if (!productId) {
                    showToast('Please enter a Product ID first', 'danger');
                    return;
                }
                
                // Open child form
                const formKey = item.getAttribute('data-child-form');
                if (formKey) {
                    openChildForm(formKey);
                }
            });
        });

        // Search functionality
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                sidebarItems.forEach(item => {
                    const text = item.textContent.toLowerCase();
                    item.style.display = text.includes(searchTerm) ? '' : 'none';
                });
            });
        }
    }

    // Show toast notification
    function showToast(message, type = 'info') {
        let toastContainer = document.querySelector('.kairo-toast-container');
        
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'kairo-toast-container';
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(toastContainer);
        }
        
        const toast = document.createElement('div');
        toast.className = `kairo-toast kairo-toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            background: ${type === 'danger' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
            color: white;
            padding: 16px 20px;
            border-radius: 4px;
            margin-bottom: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            animation: slideInUp 0.3s ease;
            max-width: 400px;
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOutDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
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

    function wireTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content-area');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');

                // Remove active class from all buttons and content
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // Add active class to clicked button and corresponding content
                button.classList.add('active');
                const targetContent = document.getElementById(targetTab);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }

    // Product Search Functions
    function openProductSearchPanel() {
        const modalElement = document.getElementById('productLookupModal');
        if (!modalElement) {
            console.warn('[ProductMaintenanceLoan] Product lookup modal not found');
            return;
        }

        const ModalCtor = window.bootstrap?.Modal;
        if (!ModalCtor) {
            console.error('[ProductMaintenanceLoan] Bootstrap Modal not available');
            return;
        }

        const modalInstance = ModalCtor.getOrCreateInstance(modalElement);
        modalInstance.show();

        resetProductSearchPanel();
        
        // Automatically perform search to show all products
        setTimeout(() => {
            performProductSearch();
            const idInput = document.getElementById('productSearchId');
            if (idInput) idInput.focus();
        }, 100);
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

    let selectedProductRow = null;

    function resetProductSearchPanel() {
        const form = document.getElementById('productLookupForm');
        const results = document.getElementById('productSearchResults');
        const loading = document.getElementById('productSearchLoading');
        const selectBtn = document.getElementById('productSelectBtn');
        
        if (form) form.reset();
        if (results) {
            results.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4">No results. Click "Search" to find products.</td></tr>`;
        }
        if (loading) loading.classList.add('d-none');
        if (selectBtn) selectBtn.disabled = true;
        selectedProductRow = null;
    }

    async function performProductSearch(event) {
        if (event) event.preventDefault();

        const productIdMode = document.getElementById('productSearchModeId')?.value || 'Like';
        const productId = document.getElementById('productSearchId')?.value?.trim() || '';
        const productNameMode = document.getElementById('productSearchModeName')?.value || 'Like';
        const productName = document.getElementById('productSearchName')?.value?.trim() || '';

        const results = document.getElementById('productSearchResults');
        const loading = document.getElementById('productSearchLoading');
        const selectBtn = document.getElementById('productSelectBtn');

        if (loading) loading.classList.remove('d-none');
        if (results) results.innerHTML = '';
        if (selectBtn) selectBtn.disabled = true;
        selectedProductRow = null;

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
                PrevOrNext: '1',
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
                if (results) {
                    results.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">No products found matching your search criteria.</td></tr>';
                }
                return;
            }

            if (results) {
                results.innerHTML = rows.map((r, idx) => {
                    const pid = r.ProductID || r.productId || '';
                    const desc = r.Description || r.description || r.Name || '';
                    return `<tr data-result-index="${idx}" data-product-id="${pid}" data-product-name="${desc}" style="cursor: pointer;">
                        <td class="text-center">${idx + 1}</td>
                        <td>${pid}</td>
                        <td>${desc}</td>
                    </tr>`;
                }).join('');

                // Add click handlers for rows
                results.querySelectorAll('tr[data-result-index]').forEach(tr => {
                    tr.addEventListener('click', () => {
                        // Remove previous selection
                        results.querySelectorAll('tr').forEach(row => row.classList.remove('table-active'));
                        
                        // Add selection to clicked row
                        tr.classList.add('table-active');
                        selectedProductRow = {
                            productId: tr.getAttribute('data-product-id'),
                            productName: tr.getAttribute('data-product-name')
                        };
                        
                        // Enable OK button
                        if (selectBtn) selectBtn.disabled = false;
                    });

                    // Double-click to select and close
                    tr.addEventListener('dblclick', () => {
                        const pid = tr.getAttribute('data-product-id');
                        const desc = tr.getAttribute('data-product-name');
                        
                        const productField = document.getElementById('Product');
                        const productNameField = document.getElementById('ProductName');
                        
                        if (productField) productField.value = pid;
                        if (productNameField) productNameField.value = desc;
                        
                        closeProductSearchPanel();
                    });
                });
            }
        } catch (error) {
            console.error('[ProductMaintenanceLoan] Search error:', error);
            if (loading) loading.classList.add('d-none');
            if (results) {
                results.innerHTML = '<tr><td colspan="3" class="text-center text-danger py-4">Error performing search. Please try again.</td></tr>';
            }
        }
    }

    function wireProductSearchPanel() {
        const form = document.getElementById('productLookupForm');
        const submitBtn = document.getElementById('productSearchSubmit');
        const selectBtn = document.getElementById('productSelectBtn');

        if (form) form.addEventListener('submit', performProductSearch);
        if (submitBtn) submitBtn.addEventListener('click', performProductSearch);
        
        if (selectBtn) {
            selectBtn.addEventListener('click', () => {
                if (selectedProductRow) {
                    const productField = document.getElementById('Product');
                    const productNameField = document.getElementById('ProductName');
                    
                    if (productField) productField.value = selectedProductRow.productId;
                    if (productNameField) productNameField.value = selectedProductRow.productName;
                    
                    closeProductSearchPanel();
                }
            });
        }

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
                console.log('[ProductMaintenanceLoan] Product search button clicked');
                openProductSearchPanel();
            });
        }
    }

    function wireProductFieldF2() {
        const productField = document.getElementById('Product');
        if (productField) {
            productField.addEventListener('keydown', function(e) {
                if (e.key === 'F2') {
                    e.preventDefault();
                    console.log('[ProductMaintenanceLoan] F2 pressed on Product field');
                    openProductSearchPanel();
                }
            });
            console.log('[ProductMaintenanceLoan] F2 key handler attached to Product field');
        } else {
            console.warn('[ProductMaintenanceLoan] Product field not found for F2 handler');
        }
    }

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', function () {
        console.log('[ProductMaintenanceLoan] Product Maintenance - Loan loaded');
        wireNavSections();
        wireSidebar();
        wireOverlayClose();
        wireTabs();
        wireProductSearchPanel();
        wireLookupButtons();
        wireProductFieldF2();
        console.log('[ProductMaintenanceLoan] Initialization complete');
        // Action buttons handled by assets/js/pages/modules/product-management/product-maintenance-loan.js
    });
})();
