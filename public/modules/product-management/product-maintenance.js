// Product Maintenance JavaScript
(function () {
    console.warn('=== Product Maintenance (SB,CA,CS,SH) Script Starting ===');
    
    const CHILD_FORMS = {
        'product-gl-interface': 'product-gl-interface.html',
        'product-documents': 'product-documents.html',
        'dormant-account': 'dormant-account.html',
        'settings': 'product-parameters.html',
        'user-defined-fields': 'user-defined-fields.html',
        'product-charges': 'product-charges.html',
        'product-notification': 'product-notification.html'
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

    function getProductID() {
        const productInput = document.getElementById('ProductID');
        return productInput ? productInput.value.trim() : '';
    }

    function getBranchID() {
        return window.SESSION?.BranchID || '0101';
    }

    function getBankID() {
        return window.SESSION?.BankID || '00';
    }

    function getOperatorID() {
        return window.SESSION?.OperatorID || 'ADMIN';
    }

    function getModuleID() {
        return 2525;
    }

    function buildGLInterfaceRequestData() {
        const productID = getProductID();
        
        console.warn('[Product Maintenance] Product ID:', productID);
        
        if (!productID) {
            alert('Please enter or select a Product ID first');
            return null;
        }

        const now = new Date();
        const timestamp = now.toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(',', '');

        const requestData = {
            RequestID: 'dbo.p_GetGLInterface',
            FormId: 'dbo.p_GetGLInterface',
            RequestData: {
                OurBranchID: getBranchID(),
                BankID: getBankID(),
                RelevantID: productID,
                ModuleID: getModuleID(),
                OperatorID: getOperatorID()
            },
            RequestTime: timestamp,
            AppName: 'PROJECT_KAIRO',
            Checksum: ''
        };

        console.warn('[Product Maintenance] Built request data:', requestData);
        return requestData;
    }

    function openChildForm(childKey) {
        const path = CHILD_FORMS[childKey];
        const { iframe } = getOverlayEls();
        if (!path || !iframe) return;

        console.warn('[Product Maintenance] Opening child form:', childKey);

        // Only build request data for Product GL Interface
        if (childKey === 'product-gl-interface') {
            const requestData = buildGLInterfaceRequestData();
            if (!requestData) return;

            // Store request data for child form to access
            window.childFormRequestData = requestData;
            console.warn('[Product Maintenance] Stored request data in window.childFormRequestData');

            iframe.src = path;
            setOverlayOpen(true);

            // Send data to iframe once loaded
            iframe.onload = function() {
                console.warn('[Product Maintenance] Iframe loaded, sending data to child');
                try {
                    iframe.contentWindow.postMessage({
                        type: 'init',
                        data: requestData
                    }, '*');
                    console.warn('[Product Maintenance] postMessage sent successfully');
                } catch (error) {
                    console.error('[Product Maintenance] Error sending data to child form:', error);
                }
            };
        } else {
            // Other forms open normally without request data
            console.warn('[Product Maintenance] Opening form without request data');
            iframe.src = path;
            setOverlayOpen(true);
        }
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

    function showToast(message, type = 'danger') {
        const container = document.querySelector('.kairo-toast-container') || createToastContainer();
        const toast = document.createElement('div');
        toast.className = `kairo-toast kairo-toast--${type} is-show`;
        toast.innerHTML = `
            <div class="kairo-toast__title">
                <span>${type === 'danger' ? 'Error' : 'Success'}</span>
                <button class="kairo-toast__close" onclick="this.closest('.kairo-toast').remove()">&times;</button>
            </div>
            <div class="kairo-toast__body">${message}</div>
        `;
        container.appendChild(toast);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    function createToastContainer() {
        const container = document.createElement('div');
        container.className = 'kairo-toast-container';
        document.body.appendChild(container);
        return container;
    }

    function wireSidebar() {
        console.warn('[Product Maintenance] Wiring sidebar items');
        document.querySelectorAll('.cm-legacy-nav__item[data-child-form], .sidebar-item[data-child-form]').forEach(item => {
            item.addEventListener('click', () => {
                const formKey = item.getAttribute('data-child-form');
                console.warn('[Product Maintenance] Sidebar item clicked:', formKey);
                
                // Validate Product ID
                const productIDInput = document.getElementById('ProductID');
                if (!productIDInput || !productIDInput.value.trim()) {
                    showToast('Please enter Product ID', 'danger');
                    console.warn('[Product Maintenance] Product ID is empty');
                    return;
                }
                
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
        if (!modalElement) return;

        const ModalCtor = window.bootstrap?.Modal;
        if (!ModalCtor) {
            console.error('[ProductMaintenance] Bootstrap Modal not available');
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
        const idValue = (document.getElementById('productSearchId')?.value || '').trim();
        const nameValue = (document.getElementById('productSearchName')?.value || '').trim();
        const idMode = document.getElementById('productSearchModeId')?.value || 'Like';
        const nameMode = document.getElementById('productSearchModeName')?.value || 'Like';
        const results = document.getElementById('productSearchResults');
        const empty = document.getElementById('productSearchEmpty');
        const loading = document.getElementById('productSearchLoading');

        if (results) results.innerHTML = '';
        if (empty) empty.style.display = 'none';
        if (loading) loading.classList.remove('d-none');

        const clauses = [];
        const buildClause = (col, mode, val) => {
            if (!val) return null;
            const safe = val.replace(/'/g, "''");
            return mode === 'Exact' ? `${col} = '${safe}'` : `${col} like '%${safe}%'`;
        };
        const idClause = buildClause('ProductID', idMode, idValue);
        const nameClause = buildClause('Description', nameMode, nameValue);
        [idClause, nameClause].forEach(c => c && clauses.push(c));

        const whereStmt = clauses.join(' AND ');

        const payload = {
            TableID: 'ProductID',
            WhereStmt: whereStmt || '1=1',
            AdvFilterString: '',
            PrevOrNext: ' ',
            RefID: '',
            OperatorID: 'web_portal',
            ModuleID: 1000,
            OurBranchID: document.getElementById('BranchID')?.value || ''
        };

        try {
            const service = window.ClientService || window.SearchService;
            if (!service || typeof service.searchClients !== 'function' && typeof service.search !== 'function') {
                throw new Error('Search service not available');
            }
            const response = service.searchClients ? await service.searchClients(payload) : await service.search(payload);
            let rows = response?.Details?.SearchResults || response?.Details || response?.SearchResults || [];
            if (!Array.isArray(rows)) rows = rows ? [rows] : [];
            if (!rows.length) {
                if (empty) {
                    empty.textContent = 'No products matched the filters.';
                    empty.style.display = 'block';
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
                            <button type="button" class="btn btn-sm btn-primary" data-result-index="${idx}">Select</button>
                        </td>
                    </tr>`;
                }).join('');
                results.querySelectorAll('button[data-result-index]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const idx = Number(btn.getAttribute('data-result-index'));
                        const row = rows[idx];
                        const pid = row?.ProductID || row?.productId || '';
                        const desc = row?.Description || row?.description || row?.Name || '';
                        const input = document.getElementById('ProductID');
                        if (input) input.value = pid;
                        const nameInput = document.getElementById('ProductName');
                        if (nameInput) nameInput.value = desc;
                        closeProductSearchPanel();
                    });
                });
                results.querySelectorAll('tr[data-result-index]').forEach(tr => {
                    tr.addEventListener('dblclick', () => {
                        const idx = Number(tr.getAttribute('data-result-index'));
                        const row = rows[idx];
                        const pid = row?.ProductID || row?.productId || '';
                        const desc = row?.Description || row?.description || row?.Name || '';
                        const input = document.getElementById('ProductID');
                        if (input) input.value = pid;
                        const nameInput = document.getElementById('ProductName');
                        if (nameInput) nameInput.value = desc;
                        closeProductSearchPanel();
                    });
                });
            }
        } catch (err) {
            console.error('[ProductMaintenance] Product search failed:', err);
            if (empty) {
                empty.textContent = err?.message || 'Search failed';
                empty.style.display = 'block';
            }
        } finally {
            if (loading) loading.classList.add('d-none');
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

    function resolveLookupInput(btn) {
        const targetId = btn.getAttribute('data-target-input');
        if (targetId) {
            const explicit = document.getElementById(targetId);
            if (explicit) return explicit;
        }

        const productWrapper = btn.closest('[data-kairo-product-control]');
        if (productWrapper) {
            const productIdInput = productWrapper.querySelector('#ProductID');
            if (productIdInput) return productIdInput;
        }

        const prev = btn.previousElementSibling;
        if (prev && prev.tagName === 'INPUT') return prev;

        return null;
    }

    function wireLookupButtons() {
        document.querySelectorAll('.btn-lookup').forEach(btn => {
            btn.addEventListener('click', function () {
                const input = resolveLookupInput(this);
                if (input && input.id === 'ProductID') {
                    openProductSearchPanel();
                    return;
                }
            });
        });
    }

    // Initialize multi-select dropdown for Customer Restriction
    function initCustomerRestrictionDropdown() {
        const trigger = document.getElementById('customerRestrictionTrigger');
        const optionsContainer = document.getElementById('customerRestrictionOptions');
        const textDisplay = trigger?.querySelector('.multi-select-text');
        const hiddenInput = document.getElementById('CustomerRestriction');
        const checkboxes = document.querySelectorAll('.customer-restriction-checkbox');

        if (!trigger || !optionsContainer || !textDisplay || !hiddenInput) {
            console.warn('[Product Maintenance] Customer Restriction dropdown elements not found');
            return;
        }

        // Toggle dropdown on trigger click
        trigger.addEventListener('click', function(e) {
            e.stopPropagation();
            const isVisible = optionsContainer.style.display === 'block';
            optionsContainer.style.display = isVisible ? 'none' : 'block';
            trigger.classList.toggle('active', !isVisible);
        });

        // Update display text and hidden input when checkboxes change
        function updateSelection() {
            const selected = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);

            if (selected.length === 0) {
                textDisplay.textContent = '--Select--';
                hiddenInput.value = '';
            } else if (selected.length === 1) {
                textDisplay.textContent = selected[0];
                hiddenInput.value = selected.join(',');
            } else {
                textDisplay.textContent = `${selected.length} selected`;
                hiddenInput.value = selected.join(',');
            }

            console.log('[Product Maintenance] Customer Restriction updated:', selected);
        }

        // Attach change event to all checkboxes
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateSelection);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!trigger.contains(e.target) && !optionsContainer.contains(e.target)) {
                optionsContainer.style.display = 'none';
                trigger.classList.remove('active');
            }
        });

        // Prevent dropdown from closing when clicking inside options
        optionsContainer.addEventListener('click', function(e) {
            e.stopPropagation();
        });

        console.log('[Product Maintenance] Customer Restriction dropdown initialized');
    }

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', function () {
        console.warn('[Product Maintenance] Initializing...');
        wireNavSections();
        wireSidebar();
        wireSidebarToggle();
        wireOverlayClose();
        wireProductSearchPanel();
        wireLookupButtons();
        initCustomerRestrictionDropdown();
        
        // Wire nav section toggles (only toggle items, not sidebar)
        document.querySelectorAll('.nav-header').forEach(header => {
            header.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const section = this.closest('.nav-section');
                const items = section.querySelector('.nav-items');
                
                if (section && items) {
                    section.classList.toggle('is-open');
                    items.classList.toggle('collapsed');
                    console.log('[Product Maintenance] Toggled nav section');
                }
            });
        });
        
        // Wire submodules search
        const searchInput = document.querySelector('.submodules-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                const searchTerm = e.target.value.toLowerCase();
                console.log('[Product Maintenance] Search submodules:', searchTerm);
                // Search functionality can be implemented later
            });
        }
        
        // Wire submodules menu button to toggle sidebar
        const menuBtn = document.querySelector('.submodules-menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', function() {
                const sidebar = document.querySelector('.sidebar');
                const mainContainer = document.querySelector('.main-container');
                
                if (sidebar && mainContainer) {
                    sidebar.classList.toggle('sidebar-collapsed');
                    mainContainer.classList.toggle('sidebar-collapsed');
                    console.log('[Product Maintenance] Toggled sidebar collapse');
                }
            });
        }
        
        console.warn('[Product Maintenance] Initialization complete');
        // Action buttons handled by assets/js/pages/products/product-maintenance.js
    });

    console.warn('=== Product Maintenance (SB,CA,CS,SH) Script Loaded ===');
})();
