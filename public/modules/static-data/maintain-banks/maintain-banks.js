// Immediate log to verify script loads
console.log('🚀 maintain-banks.js script loaded');
console.log('⏰ Script load time:', new Date().toISOString());

(async function () {
    'use strict';

    console.log('🎯 Starting async initialization...');

    try {
        console.log('🔍 Checking for ServiceLoader...');
        const { ServiceLoader } = window;

        if (!ServiceLoader) {
            console.error('❌ ServiceLoader not found! Ensure serviceLoader.js is loaded first.');
            console.error('❌ window.ServiceLoader:', window.ServiceLoader);
            alert('Critical Error: ServiceLoader not available. Please check console for details.');
            return;
        }

        console.log('✅ ServiceLoader found:', ServiceLoader);

        // Load dependencies
        console.log('📦 Loading CoreApi...');
        await ServiceLoader.loadCore();
        console.log('✅ CoreApi loaded');

        console.log('📦 Loading OtherStaticDataService...');
        await ServiceLoader.loadOtherStaticDataService();
        console.log('✅ OtherStaticDataService loaded');

        console.log('📦 Loading BankSearchService...');
        await ServiceLoader.loadBankSearchService();
        console.log('✅ BankSearchService loaded');

        console.log('📦 Loading LookupService...');
        await ServiceLoader.loadLookupService();
        console.log('✅ LookupService loaded');

        console.log('📦 Loading SearchService...');
        await ServiceLoader.loadSearchService();
        console.log('✅ SearchService loaded');

        console.log('📦 Loading CustomCodesLookupService...');
        await ServiceLoader.loadCustomCodesLookupService();
        console.log('✅ CustomCodesLookupService loaded');

        // Get services
        const OtherStaticDataService = window.OtherStaticDataService;
        const BankSearchService = window.BankSearchService;
        const LookupService = window.LookupService;
        const SearchService = window.SearchService;
        const CustomCodesLookupService = window.customCodesLookupService;

        // Verify services are loaded
        if (!OtherStaticDataService) {
            console.error('❌ OtherStaticDataService not loaded!');
            alert('Error: OtherStaticDataService not available');
            return;
        }
        if (!BankSearchService) {
            console.error('❌ BankSearchService not loaded!');
            alert('Error: BankSearchService not available');
            return;
        }
        if (!LookupService) {
            console.error('❌ LookupService not loaded!');
            alert('Error: LookupService not available');
            return;
        }
        if (!SearchService) {
            console.error('❌ SearchService not loaded!');
            alert('Error: SearchService not available');
            return;
        }
        if (!CustomCodesLookupService) {
            console.error('❌ CustomCodesLookupService not loaded!');
            alert('Error: CustomCodesLookupService not available');
            return;
        }

        console.log('✅ All services verified and ready');

        // Global state
        let currentMode = 'view'; // view, add, edit
        let currentBankData = null;
        let isFormDirty = false; // Track if form has been modified

        // Clearing Branches state
        let currentSection = 'bank-details'; // Track active section
        let currentBranchData = null;
        let isBranchFormDirty = false;
        
        // Clearing Bank Signatories state
        let currentSignatoryData = null;
        let isSignatoryFormDirty = false;

        // Debug mode - expose to window for testing
        window.MaintainBanksDebug = {
            getCurrentMode: () => currentMode,
            getCurrentData: () => currentBankData,
            testFetch: (bankId) => loadBankData(bankId),
            testSave: () => handleSave(),
            testDelete: () => handleDelete(),
            getFormData: () => getFormData(),
            setMode: (mode) => { currentMode = mode; setFormState(mode); },
            populateTestData: () => {
                document.getElementById('bankId').value = 'TEST001';
                document.getElementById('shortName').value = 'TST';
                document.getElementById('bankName').value = 'Test Bank Limited';
                document.getElementById('creditRating').value = 'AAA';
                document.getElementById('isLocalClearing').checked = true;
            }
        };

        console.log('🏦 Maintain Banks Module Loaded');
        console.log('📊 Debug tools available at: window.MaintainBanksDebug');
        console.log('💡 Try: MaintainBanksDebug.populateTestData()');

        // =========================================================================
        // TOAST NOTIFICATION SYSTEM - Account Maintenance Pattern
        // =========================================================================

        function ensureToastContainer() {
            let el = document.querySelector('[data-kairo-toast-container]');
            if (el) return el;
            el = document.createElement('div');
            el.className = 'kairo-toast-container';
            el.setAttribute('data-kairo-toast-container', '');
            el.setAttribute('aria-live', 'polite');
            el.setAttribute('aria-relevant', 'additions');
            document.body.appendChild(el);
            return el;
        }

        function showToast(message, { title = 'Notification', variant = 'info', timeoutMs = 5000 } = {}) {
            const container = ensureToastContainer();

            const toast = document.createElement('div');
            toast.className = `kairo-toast kairo-toast--${variant}`;
            toast.setAttribute('role', 'alert');
            toast.setAttribute('aria-atomic', 'true');

            const header = document.createElement('div');
            header.className = 'kairo-toast__title';

            const titleEl = document.createElement('div');
            titleEl.textContent = title;

            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'kairo-toast__close';
            closeBtn.setAttribute('aria-label', 'Close');
            closeBtn.textContent = '×';

            const body = document.createElement('div');
            body.className = 'kairo-toast__body';
            body.textContent = String(message || '');

            header.appendChild(titleEl);
            header.appendChild(closeBtn);
            toast.appendChild(header);
            toast.appendChild(body);
            container.appendChild(toast);

            const remove = () => {
                try {
                    toast.classList.remove('is-show');
                    setTimeout(() => toast.remove(), 160);
                } catch {
                    // ignore
                }
            };

            closeBtn.addEventListener('click', remove);
            setTimeout(() => toast.classList.add('is-show'), 0);
            if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
        }

        // Initialize - check if DOM is already loaded or wait for it
        function initialize() {
            console.log('🎬 Initializing form and event listeners...');
            attachEventListeners();
            initializeForm();
            loadDropdowns();
            console.log('✅ Maintain Banks initialized');
        }

        if (document.readyState === 'loading') {
            console.log('⏳ DOM not ready yet, waiting for DOMContentLoaded...');
            document.addEventListener('DOMContentLoaded', initialize);
        } else {
            console.log('✅ DOM already ready, initializing now...');
            initialize();
        }

        // Listen for messages from child forms (iframes)
        window.addEventListener('message', (event) => {
            // Security check - only accept messages from same origin
            if (event.origin !== window.location.origin) return;

            const { action, source } = event.data || {};

            if (action === 'submoduleClosed') {
                console.log('📨 Received submoduleClosed message from:', source);
                // Navigate back to main Bank Details section
                showBankDetailsSection();
            } else if (action === 'submoduleOpened') {
                console.log('📨 Received submoduleOpened message from:', source);
            } else if (action === 'toggleSidebarForMaximize') {
                console.log('📨 Received toggleSidebarForMaximize message');
                const sidebar = document.getElementById('main-sidebar');
                if (sidebar) {
                    if (event.data.maximize) {
                        sidebar.style.display = 'none';
                    } else {
                        sidebar.style.display = '';
                    }
                }
            }
        });

        // Load Dropdowns
        async function loadDropdowns() {
            try {
                // Load Institution Type dropdown
                const typeOptions = await LookupService.getInstitutionTypes();
                populateDropdown('type', typeOptions);

                // Load Branch dropdowns (City and Country)
                await loadBranchDropdowns();
            } catch (error) {
                console.error('Error loading dropdowns:', error);
                showStatus('Error loading dropdowns', 'error');
            }
        }

        // Load Branch-specific dropdowns (City, Country, Branch Type)
        async function loadBranchDropdowns() {
            try {
                console.log('📦 Loading branch dropdowns (City, Country, Branch Type)...');
                
                // Load Country dropdown
                const countryOptions = await LookupService.getCountries();
                populateDropdown('country', countryOptions);
                console.log('✅ Country dropdown loaded with', countryOptions.length, 'options');

                // Load City dropdown
                const cityOptions = await LookupService.getCities();
                populateDropdown('city', cityOptions);
                console.log('✅ City dropdown loaded with', cityOptions.length, 'options');

                // Load Branch Type dropdown using CustomCodesLookupService
                const branchTypeOptions = await CustomCodesLookupService.getCustomCodeOptions('BranchTypeID');
                populateDropdown('branchType', branchTypeOptions);
                console.log('✅ Branch Type dropdown loaded with', branchTypeOptions.length, 'options');
            } catch (error) {
                console.error('❌ Error loading branch dropdowns:', error);
                showStatus('Error loading branch dropdowns', 'error');
            }
        }

        // Populate Dropdown
        function populateDropdown(elementId, options) {
            const select = document.getElementById(elementId);
            if (!select) return;

            select.innerHTML = '<option value="">--Select--</option>';
            options.forEach(opt => {
                select.innerHTML += `<option value="${opt.value}">${opt.label}</option>`;
            });
        }

        // Attach Event Listeners
        function attachEventListeners() {
            console.log('🔗 Attaching event listeners...');

            // Submodule search functionality
            const submoduleSearch = document.getElementById('submoduleSearch');
            const submoduleSearchClear = document.getElementById('submoduleSearchClear');

            if (submoduleSearch) {
                submoduleSearch.addEventListener('input', handleSubmoduleSearch);
                submoduleSearch.addEventListener('keyup', function (e) {
                    if (e.key === 'Escape') {
                        clearSubmoduleSearch();
                    }
                });
            }

            if (submoduleSearchClear) {
                submoduleSearchClear.addEventListener('click', clearSubmoduleSearch);
            }

            // Sidebar toggle (collapse/expand)
            const sidebarToggle = document.getElementById('sidebarToggle');
            if (sidebarToggle) {
                sidebarToggle.addEventListener('click', handleSidebarToggle);
            }

            // Nav section toggle (expand/collapse Data Entry)
            document.querySelectorAll('.nav-arrow--card').forEach(arrow => {
                arrow.addEventListener('click', handleNavSectionToggle);
            });

            // Also allow clicking on nav-header to toggle
            document.querySelectorAll('.nav-header--card').forEach(header => {
                header.addEventListener('click', function (e) {
                    // Don't toggle if clicking the arrow button itself
                    if (!e.target.closest('.nav-arrow--card')) {
                        const arrow = header.querySelector('.nav-arrow--card');
                        if (arrow) arrow.click();
                    }
                });
            });

            // Sidebar items navigation (enhanced pattern)
            document.querySelectorAll('.sidebar-item--enhanced').forEach(item => {
                item.addEventListener('click', handleSidebarNavigation);
            });

            // Legacy navigation items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', handleNavigation);
            });

            // Title bar buttons (minimize, maximize, close)
            document.querySelectorAll('.title-btn[data-action="close"]').forEach(btn => {
                btn.addEventListener('click', handleTitleBarClose);
            });
            document.querySelectorAll('.title-btn[data-action="minimize"]').forEach(btn => {
                btn.addEventListener('click', handleTitleBarMinimize);
            });
            document.querySelectorAll('.title-btn[data-action="maximize"]').forEach(btn => {
                btn.addEventListener('click', handleTitleBarMaximize);
            });

            // Action buttons
            document.getElementById('btnShow')?.addEventListener('click', handleShow);
            document.getElementById('btnView')?.addEventListener('click', handleView);
            document.getElementById('btnAdd')?.addEventListener('click', handleAdd);
            document.getElementById('btnEdit')?.addEventListener('click', handleEdit);
            document.getElementById('btnDelete')?.addEventListener('click', handleDelete);
            document.getElementById('btnSave')?.addEventListener('click', handleSave);
            document.getElementById('btnCancel')?.addEventListener('click', handleCancel);
            document.getElementById('btnBack')?.addEventListener('click', handleBack);

            // Browse signature button
            document.getElementById('btnBrowseSignature')?.addEventListener('click', handleBrowseSignature);
            
            // Image upload modal handlers
            initializeImageUploadModal();

            // Search buttons
            const bankSearchBtn = document.querySelector('.kairo-control__lookup[data-target-input="bankId"]');
            const clientSearchBtn = document.querySelector('#clientId + .btn-search');
            const branchSearchBtn = document.querySelector('.kairo-branch-control__lookup[data-target-input="branchId"]');

            if (bankSearchBtn) {
                bankSearchBtn.addEventListener('click', handleBankSearch);
            }
            if (clientSearchBtn) {
                clientSearchBtn.addEventListener('click', handleClientSearch);
            }
            if (branchSearchBtn) {
                branchSearchBtn.addEventListener('click', handleBranchSearch);
                console.log('✅ Branch search button listener attached');
            }

            // Add Enter key support on BankID field to fetch data
            const bankIdInput = document.getElementById('bankId');
            if (bankIdInput) {
                bankIdInput.addEventListener('keypress', async function (e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const bankId = bankIdInput.value.trim();
                        if (bankId) {
                            console.log('⌨️ Enter pressed on BankID field, fetching data...');
                            await loadBankData(bankId);
                        }
                    }
                });
            }

            // Add Enter key support on BranchID field
            const branchIdInput = document.getElementById('branchId');
            if (branchIdInput) {
                branchIdInput.addEventListener('keypress', async function (e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const branchId = branchIdInput.value.trim();
                        const bankId = currentBankData?.BankID || document.getElementById('bankId')?.value.trim();
                        if (bankId && branchId) {
                            console.log('⌨️ Enter pressed on BranchID field, fetching data...');
                            await loadBranchData(bankId, branchId);
                        }
                    }
                });
            }

            // Status message close button
            const closeButton = document.querySelector('.status-close');
            if (closeButton) {
                closeButton.addEventListener('click', hideStatus);
            }

            // Track form changes to set dirty flag
            const formFields = ['bankId', 'shortName', 'bankName', 'type', 'clientId', 'creditRating',
                'isLocalClearing', 'isForeignClearing', 'isActive', 'remark'];
            formFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.addEventListener('input', () => {
                        if (currentMode === 'add' || currentMode === 'edit') {
                            isFormDirty = true;
                            console.log('📝 Form modified, dirty flag set');
                        }
                    });
                    field.addEventListener('change', () => {
                        if (currentMode === 'add' || currentMode === 'edit') {
                            isFormDirty = true;
                            console.log('📝 Form modified, dirty flag set');
                        }
                    });
                }
            });

            // Track branch form changes to set dirty flag
            const branchFormFields = ['branchId', 'branchName', 'address1', 'address2', 'city', 'country',
                'zipCode', 'emailId', 'phone1', 'phone2', 'mobile', 'faxNo',
                'branchType', 'clearingDays', 'swiftCode', 'isUpcountryBranch', 'branchRemarks'];
            branchFormFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.addEventListener('input', () => {
                        if (currentSection === 'clearing-branches' && (currentMode === 'add' || currentMode === 'edit')) {
                            isBranchFormDirty = true;
                            console.log('📝 Branch form modified, dirty flag set');
                        }
                    });
                    field.addEventListener('change', () => {
                        if (currentSection === 'clearing-branches' && (currentMode === 'add' || currentMode === 'edit')) {
                            isBranchFormDirty = true;
                            console.log('📝 Branch form modified, dirty flag set');
                        }
                    });
                }
            });

            // Attach collapsible section toggle handlers
            attachSectionToggleHandlers();

            console.log('✅ Event listeners attached');
        }

        // Attach Section Toggle Handlers for Collapsible Sections
        function attachSectionToggleHandlers() {
            const toggleButtons = document.querySelectorAll('.section-toggle-btn');
            
            toggleButtons.forEach(button => {
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const sectionHeader = this.closest('.section-header');
                    const formSection = this.closest('.form-section');
                    const sectionContent = formSection.querySelector('.section-content');
                    const icon = this.querySelector('i');
                    const isExpanded = this.getAttribute('aria-expanded') === 'true';
                    
                    if (isExpanded) {
                        // Collapse
                        sectionContent.style.display = 'none';
                        this.setAttribute('aria-expanded', 'false');
                        if (icon) {
                            icon.classList.remove('bi-chevron-down');
                            icon.classList.add('bi-chevron-right');
                        }
                        formSection.classList.add('collapsed');
                    } else {
                        // Expand
                        sectionContent.style.display = 'block';
                        this.setAttribute('aria-expanded', 'true');
                        if (icon) {
                            icon.classList.remove('bi-chevron-right');
                            icon.classList.add('bi-chevron-down');
                        }
                        formSection.classList.remove('collapsed');
                    }
                });
            });
            
            console.log('✅ Section toggle handlers attached to', toggleButtons.length, 'buttons');
        }

        // Handle Toggle (legacy)
        function handleToggle(event) {
            const toggle = event.currentTarget;
            const navSection = toggle.closest('.nav-section');
            const navItems = toggle.nextElementSibling;
            const chevron = toggle.querySelector('.nav-chevron');

            // Toggle expanded class on nav-section
            if (navSection.classList.contains('expanded')) {
                navSection.classList.remove('expanded');
                if (chevron) {
                    chevron.style.transform = 'rotate(0deg)';
                }
            } else {
                navSection.classList.add('expanded');
                if (chevron) {
                    chevron.style.transform = 'rotate(180deg)';
                }
            }
        }

        // Handle Sidebar Toggle (collapse/expand entire sidebar)
        function handleSidebarToggle() {
            const sidebar = document.getElementById('main-sidebar');
            const toggleBtn = document.getElementById('sidebarToggle');

            if (sidebar) {
                sidebar.classList.toggle('collapsed');
                const isCollapsed = sidebar.classList.contains('collapsed');

                // Update toggle button aria-expanded
                if (toggleBtn) {
                    toggleBtn.setAttribute('aria-expanded', !isCollapsed);
                }

                console.log(`📌 Sidebar ${isCollapsed ? 'collapsed' : 'expanded'}`);
            }
        }

        // Handle Submodule Search
        function handleSubmoduleSearch(event) {
            const searchTerm = event.target.value.toLowerCase().trim();
            const sidebarItems = document.querySelectorAll('.sidebar-item--enhanced');
            const navSections = document.querySelectorAll('.nav-section--card');
            const clearBtn = document.getElementById('submoduleSearchClear');

            // Show/hide clear button based on input
            if (clearBtn) {
                clearBtn.style.display = searchTerm ? 'flex' : 'none';
            }

            if (!searchTerm) {
                // Show all items when search is empty
                sidebarItems.forEach(item => {
                    item.style.display = '';
                });
                return;
            }

            // Expand all nav sections when searching
            navSections.forEach(section => {
                const navItems = section.querySelector('.nav-items--card');
                const arrow = section.querySelector('.nav-arrow--card');
                const icon = arrow?.querySelector('i');

                if (navItems && !section.classList.contains('is-open')) {
                    section.classList.add('is-open');
                    navItems.removeAttribute('hidden');
                    if (arrow) arrow.setAttribute('aria-expanded', 'true');
                    if (icon) icon.classList.replace('bi-chevron-down', 'bi-chevron-up');
                }
            });

            // Filter sidebar items
            let matchCount = 0;
            sidebarItems.forEach(item => {
                const title = item.querySelector('.sidebar-item__title')?.textContent?.toLowerCase() || '';
                const description = item.querySelector('.sidebar-item__description')?.textContent?.toLowerCase() || '';
                const tooltip = item.dataset.tooltip?.toLowerCase() || '';

                const matches = title.includes(searchTerm) ||
                    description.includes(searchTerm) ||
                    tooltip.includes(searchTerm);

                if (matches) {
                    item.style.display = '';
                    matchCount++;
                } else {
                    item.style.display = 'none';
                }
            });

            console.log(`🔍 Search: "${searchTerm}" - ${matchCount} matches found`);
        }

        // Clear Submodule Search
        function clearSubmoduleSearch() {
            const searchInput = document.getElementById('submoduleSearch');
            const clearBtn = document.getElementById('submoduleSearchClear');
            const sidebarItems = document.querySelectorAll('.sidebar-item--enhanced');

            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }

            if (clearBtn) {
                clearBtn.style.display = 'none';
            }

            // Show all items
            sidebarItems.forEach(item => {
                item.style.display = '';
            });

            console.log('🔍 Search cleared');
        }

        // Handle Nav Section Toggle (expand/collapse Data Entry section)
        function handleNavSectionToggle(event) {
            event.stopPropagation();
            const arrow = event.currentTarget;
            const navSection = arrow.closest('.nav-section--card');
            const navItems = navSection?.querySelector('.nav-items--card');
            const icon = arrow.querySelector('i');

            if (navSection && navItems) {
                const isOpen = navSection.classList.contains('is-open');

                if (isOpen) {
                    // Collapse
                    navSection.classList.remove('is-open');
                    navItems.setAttribute('hidden', '');
                    arrow.setAttribute('aria-expanded', 'false');
                    if (icon) icon.classList.replace('bi-chevron-up', 'bi-chevron-down');
                } else {
                    // Expand
                    navSection.classList.add('is-open');
                    navItems.removeAttribute('hidden');
                    arrow.setAttribute('aria-expanded', 'true');
                    if (icon) icon.classList.replace('bi-chevron-down', 'bi-chevron-up');
                }

                console.log(`📂 Nav section ${isOpen ? 'collapsed' : 'expanded'}`);
            }
        }

        // Handle Sidebar Navigation (for enhanced sidebar items)
        function handleSidebarNavigation(event) {
            const item = event.currentTarget;
            const section = item.dataset.section;

            // Update active state
            document.querySelectorAll('.sidebar-item--enhanced').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            console.log(`🔀 Navigating to section: ${section}`);

            // Handle section navigation
            if (section === 'bank-limit') {
                showBankLimitSection();
            } else if (section === 'clearing-bank') {
                showClearingBankSignatoriesSection();
            } else if (section === 'clearing-branches') {
                showClearingBranchesSection();
            }
        }

        // Handle Title Bar Close - Navigate back to main Bank Details or close window
        function handleTitleBarClose(event) {
            const currentSection = getCurrentActiveSection();

            if (currentSection !== 'bankDetails') {
                // If on a sub-section, go back to main Bank Details
                console.log('❌ Closing sub-section - returning to Bank Details');
                showBankDetailsSection();

                // Remove active state from sidebar items
                document.querySelectorAll('.sidebar-item--enhanced').forEach(i => i.classList.remove('active'));
            } else {
                // If on main screen, close the window (go back)
                console.log('❌ Closing Maintain Banks');
                window.history.back();
            }
        }

        // Handle Title Bar Minimize - Navigate back to main Bank Details
        function handleTitleBarMinimize(event) {
            const currentSection = getCurrentActiveSection();

            if (currentSection !== 'bankDetails') {
                console.log('➖ Minimizing - returning to main screen');
                showBankDetailsSection();

                // Remove active state from sidebar items
                document.querySelectorAll('.sidebar-item--enhanced').forEach(i => i.classList.remove('active'));
            } else {
                console.log('➖ Already on main screen');
            }
        }

        // Handle Title Bar Maximize - Toggle fullscreen for the form content
        function handleTitleBarMaximize(event) {
            const btn = event.currentTarget;
            const formContent = document.querySelector('.form-content');
            const icon = btn.querySelector('i');

            if (formContent) {
                formContent.classList.toggle('maximized');
                const isMaximized = formContent.classList.contains('maximized');

                // Toggle icon between square (maximize) and fullscreen-exit (restore)
                if (icon) {
                    if (isMaximized) {
                        icon.classList.replace('bi-square', 'bi-fullscreen-exit');
                        btn.title = 'Restore';
                    } else {
                        icon.classList.replace('bi-fullscreen-exit', 'bi-square');
                        btn.title = 'Maximize';
                    }
                }

                console.log(`🔲 Form content ${isMaximized ? 'maximized' : 'restored'}`);
            }
        }

        // Get current active section name
        function getCurrentActiveSection() {
            const bankDetailsSection = document.getElementById('bankDetailsSection');
            const bankLimitSection = document.getElementById('bankLimitSection');
            const clearingBankSection = document.getElementById('clearingBankSignatoriesSection');
            const clearingBranchesSection = document.getElementById('clearingBranchesSection');

            if (bankLimitSection?.style.display !== 'none' && bankLimitSection?.style.display) {
                return 'bankLimit';
            }
            if (clearingBankSection?.style.display !== 'none' && clearingBankSection?.style.display) {
                return 'clearingBank';
            }
            if (clearingBranchesSection?.style.display !== 'none' && clearingBranchesSection?.style.display) {
                return 'clearingBranches';
            }
            return 'bankDetails';
        }

        // Update title bar based on active section
        function updateTitleBar(sectionName, iconClass) {
            const titleIcon = document.getElementById('titleBarIcon');
            const titleText = document.getElementById('titleBarText');

            if (titleText) {
                titleText.textContent = sectionName;
            }
            if (titleIcon && iconClass) {
                titleIcon.className = `${iconClass} title-icon`;
            }
        }

        // Initialize Form
        function initializeForm() {
            // Set default state - form visible with DataEntry active
            const bankDetailsSection = document.getElementById('bankDetailsSection');
            if (bankDetailsSection) {
                bankDetailsSection.style.display = 'block';
            }
            
            // Hide SHOW button on initial load (only visible in Clearing Bank Signatories)
            const btnShow = document.getElementById('btnShow');
            if (btnShow) {
                btnShow.style.cssText = 'display: none !important;';
            }
            
            setFormState('view');
        }

        // Handle Navigation
        function handleNavigation(event) {
            const navItem = event.currentTarget;
            const section = navItem.dataset.section;

            // Update active state
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            navItem.classList.add('active');

            // Handle section navigation
            if (section === 'bank-details') {
                // Show Bank Details section (main form)
                showBankDetailsSection();
            } else if (section === 'bank-limit') {
                // Show Bank Limit Maintenance section
                showBankLimitSection();
            } else if (section === 'signatories') {
                // Open Bank Signatories modal
                openSignatoriesModal();
            } else if (section === 'clearing-bank') {
                // Show Clearing Bank Signatories section (inline form)
                showClearingBankSignatoriesSection();
            } else if (section === 'clearing-branches') {
                // Show Clearing Branches section (inline form)
                showClearingBranchesSection();
            }
        }

        // Show Bank Details Section (Main Form)
        function showBankDetailsSection() {
            const bankDetailsSection = document.getElementById('bankDetailsSection');
            const bankLimitSection = document.getElementById('bankLimitSection');
            const clearingBankSection = document.getElementById('clearingBankSignatoriesSection');
            const clearingBranchesSection = document.getElementById('clearingBranchesSection');

            if (bankDetailsSection) {
                bankDetailsSection.style.display = 'block';
            }
            if (bankLimitSection) {
                bankLimitSection.style.display = 'none';
            }
            if (clearingBankSection) {
                clearingBankSection.style.display = 'none';
            }
            if (clearingBranchesSection) {
                clearingBranchesSection.style.display = 'none';
            }

            // Update title bar
            updateTitleBar('Maintain Banks', 'bi bi-building');
            
            // Set current section
            currentSection = 'bank-details';

            console.log('📋 Bank Details section displayed');
            
            // ALWAYS hide SHOW button for bank-details section
            const btnShow = document.getElementById('btnShow');
            if (btnShow) {
                btnShow.style.cssText = 'display: none !important;';
                console.log('🚫 SHOW button hidden (Bank Details)');
            }
            
            // Show main action panel (in case it was hidden by data entry screen)
            const mainContainer = document.querySelector('.main-container');
            const actionPanel = mainContainer?.querySelector(':scope > .action-panel');
            if (actionPanel) {
                actionPanel.style.cssText = '';
                console.log('✅ Main action panel shown');
            }
            
            // Remove child-form-open class (restore normal layout)
            if (mainContainer) {
                mainContainer.classList.remove('child-form-open');
                console.log('✅ child-form-open class removed from main-container');
            }
        }

        // Show Bank Limit Maintenance Section
        function showBankLimitSection() {
            // Validate that bank data is loaded
            if (!currentBankData || !currentBankData.BankID) {
                showToast('Please load or create a bank record first before accessing Bank Limit Maintenance', 
                    { title: 'Validation', variant: 'warning' });
                console.warn('⚠️ Cannot show Bank Limit section - no bank data loaded');
                return;
            }
            
            const bankDetailsSection = document.getElementById('bankDetailsSection');
            const bankLimitSection = document.getElementById('bankLimitSection');
            const clearingBankSection = document.getElementById('clearingBankSignatoriesSection');
            const clearingBranchesSection = document.getElementById('clearingBranchesSection');

            if (bankDetailsSection) {
                bankDetailsSection.style.display = 'none';
            }
            if (bankLimitSection) {
                bankLimitSection.style.display = 'block';
            }
            if (clearingBankSection) {
                clearingBankSection.style.display = 'none';
            }
            if (clearingBranchesSection) {
                clearingBranchesSection.style.display = 'none';
            }

            // Update title bar
            updateTitleBar('Bank Limit Maintenance', 'bi bi-cash-stack');
            
            // Set current section
            currentSection = 'bank-limit';

            console.log('📋 Bank Limit section displayed');
            
            // Pass bank context to iframe and reload data
            const iframe = bankLimitSection?.querySelector('iframe');
            if (iframe) {
                const setBankContext = () => {
                    try {
                        const iframeWindow = iframe.contentWindow;
                        if (iframeWindow) {
                            // Set bank context in iframe window
                            iframeWindow.currentBankID = currentBankData?.BankID || '';
                            iframeWindow.currentBankName = currentBankData?.BankName || '';
                            iframeWindow.currentClientID = currentBankData?.ClientID || '';
                            iframeWindow.currentBranchID = ''; // Set appropriate branch if needed
                            iframeWindow.currentOperatorID = 'CSADM'; // Set from session
                            
                            console.log('✅ Bank context passed to iframe:', {
                                BankID: iframeWindow.currentBankID,
                                ClientID: iframeWindow.currentClientID
                            });
                            
                            // Trigger reload in iframe - ALWAYS reload when section is shown
                            // Use setTimeout to ensure iframe scripts are fully loaded
                            setTimeout(() => {
                                if (typeof iframeWindow.loadBankLimitData === 'function') {
                                    console.log('🔄 Triggering loadBankLimitData in iframe...');
                                    iframeWindow.loadBankLimitData(false); // Pass false to reload existing data
                                } else {
                                    console.warn('⚠️ loadBankLimitData not available in iframe - retrying...');
                                    // Retry after another delay
                                    setTimeout(() => {
                                        if (typeof iframeWindow.loadBankLimitData === 'function') {
                                            console.log('🔄 Retry: Triggering loadBankLimitData in iframe...');
                                            iframeWindow.loadBankLimitData(false);
                                        } else {
                                            console.error('❌ Failed to load bank limit data - function not available');
                                        }
                                    }, 500);
                                }
                            }, 100);
                        }
                    } catch (error) {
                        console.error('❌ Error setting bank context:', error);
                    }
                };
                
                // Always try to set context immediately first
                if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
                    // Iframe already loaded - set context immediately
                    console.log('✅ Iframe already loaded - setting context');
                    setBankContext();
                } else {
                    // Iframe still loading - wait for load event
                    console.log('⏳ Waiting for iframe to load...');
                    iframe.addEventListener('load', () => {
                        console.log('✅ Iframe loaded event fired');
                        setBankContext();
                    }, { once: true });
                }
            } else {
                console.error('❌ Bank Limit iframe not found');
            }
            
            // ALWAYS hide SHOW button for bank-limit section
            const btnShow = document.getElementById('btnShow');
            if (btnShow) {
                btnShow.style.cssText = 'display: none !important;';
                console.log('🚫 SHOW button hidden (Bank Limit)');
            }
            
            // Hide main action panel (data entry screen has its own action buttons)
            const mainContainer = document.querySelector('.main-container');
            const actionPanel = mainContainer?.querySelector(':scope > .action-panel');
            if (actionPanel) {
                actionPanel.style.cssText = 'display: none !important;';
                console.log('🚫 Main action panel hidden (Bank Limit has own buttons)');
            }
            
            // Add class to main-container to indicate child form is open (expands form-content)
            if (mainContainer) {
                mainContainer.classList.add('child-form-open');
                console.log('✅ child-form-open class added to main-container');
            }
        }

        // Show Clearing Bank Signatories Section
        function showClearingBankSignatoriesSection() {
            const bankDetailsSection = document.getElementById('bankDetailsSection');
            const bankLimitSection = document.getElementById('bankLimitSection');
            const clearingBankSection = document.getElementById('clearingBankSignatoriesSection');
            const clearingBranchesSection = document.getElementById('clearingBranchesSection');

            if (bankDetailsSection) {
                bankDetailsSection.style.display = 'none';
            }
            if (bankLimitSection) {
                bankLimitSection.style.display = 'none';
            }
            if (clearingBankSection) {
                clearingBankSection.style.display = 'block';
            }
            if (clearingBranchesSection) {
                clearingBranchesSection.style.display = 'none';
            }

            // Update title bar
            updateTitleBar('Clearing Bank Signatories', 'bi bi-pen-fill');

            console.log('📋 Clearing Bank Signatories section displayed');
            
            // Set current section
            currentSection = 'clearing-bank';
            
            // Hide SHOW button in Clearing Bank Signatories section (iframe has its own buttons)
            const btnShow = document.getElementById('btnShow');
            if (btnShow) {
                btnShow.style.cssText = 'display: none !important;';
                console.log('🚫 SHOW button hidden (Clearing Bank Signatories uses iframe)');
            }
            
            // Hide main action panel (data entry screen has its own action buttons)
            const mainContainer = document.querySelector('.main-container');
            const actionPanel = mainContainer?.querySelector(':scope > .action-panel');
            if (actionPanel) {
                actionPanel.style.cssText = 'display: none !important;';
                console.log('🚫 Main action panel hidden (Clearing Bank Signatories has own buttons)');
            }
            
            // Add child-form-open class (expands form-content)
            if (mainContainer) {
                mainContainer.classList.add('child-form-open');
                console.log('✅ child-form-open class added to main-container');
            }
        }

        // Show Clearing Branches Section
        function showClearingBranchesSection() {
            const bankDetailsSection = document.getElementById('bankDetailsSection');
            const bankLimitSection = document.getElementById('bankLimitSection');
            const clearingBankSection = document.getElementById('clearingBankSignatoriesSection');
            const clearingBranchesSection = document.getElementById('clearingBranchesSection');

            if (bankDetailsSection) {
                bankDetailsSection.style.display = 'none';
            }
            if (bankLimitSection) {
                bankLimitSection.style.display = 'none';
            }
            if (clearingBankSection) {
                clearingBankSection.style.display = 'none';
            }
            if (clearingBranchesSection) {
                clearingBranchesSection.style.display = 'block';
            }

            // Update title bar
            updateTitleBar('Clearing Branches', 'bi bi-building');

            console.log('📋 Clearing Branches section displayed');

            currentSection = 'clearing-branches';
            
            // Hide SHOW button for clearing-branches section (iframe has its own buttons)
            const btnShow = document.getElementById('btnShow');
            if (btnShow) {
                btnShow.style.cssText = 'display: none !important;';
                console.log('🚫 SHOW button hidden (Clearing Branches uses iframe)');
            }
            
            // Hide main action panel (data entry screen has its own action buttons)
            const mainContainer = document.querySelector('.main-container');
            const actionPanel = mainContainer?.querySelector(':scope > .action-panel');
            if (actionPanel) {
                actionPanel.style.cssText = 'display: none !important;';
                console.log('🚫 Main action panel hidden (Clearing Branches has own buttons)');
            }
            
            // Add child-form-open class (expands form-content)
            if (mainContainer) {
                mainContainer.classList.add('child-form-open');
                console.log('✅ child-form-open class added to main-container');
            }
        }

        // Open Signatories Modal
        function openSignatoriesModal() {
            console.log('Opening Bank Signatories modal...');

            // Open the modal in the parent window
            if (window.parent && window.parent.bootstrap) {
                const modalElement = window.parent.document.getElementById('bankSignatoriesModal');
                if (modalElement) {
                    const modal = new window.parent.bootstrap.Modal(modalElement);
                    modal.show();
                }
            }
        }

        // ============================
        // CLEARING BRANCHES HANDLERS
        // ============================

        // Load Branch Data
        async function loadBranchData(bankId, branchId) {
            try {
                // Ensure we use the current bank's ID if not provided
                const effectiveBankId = bankId || currentBankData?.BankID;

                if (!effectiveBankId) {
                    showStatus('Please select a bank first before loading branches', 'warning');
                    return;
                }

                console.log('🏢 Loading branch data for BankID:', effectiveBankId, 'BranchID:', branchId);
                showStatus('Loading branch data...', 'info');

                const requestData = {
                    BankID: effectiveBankId,
                    BranchID: branchId,
                    OurBranchID: "0603",
                    OperatorID: "CSADM",
                    Direction: 0
                };
                console.log('📤 Branch Request:', requestData);

                const result = await OtherStaticDataService.getBranches(requestData);
                console.log('📥 Branch Response:', result);

                let branchData = null;

                // Handle different response formats
                if (result.data && result.data.Details01) {
                    if (Array.isArray(result.data.Details01) && result.data.Details01.length > 0) {
                        branchData = result.data.Details01[0];
                    } else if (!Array.isArray(result.data.Details01) && typeof result.data.Details01 === 'object' && result.data.Details01.BranchID) {
                        branchData = result.data.Details01;
                    }
                }

                if (branchData && branchData.BranchID) {
                    currentBranchData = branchData;
                    console.log('✅ Branch data loaded:', currentBranchData);
                    populateBranchForm(currentBranchData);
                    setBranchFormState('viewed');
                    showStatus('Branch data loaded successfully', 'success');
                } else {
                    console.warn('⚠️ No valid branch data found');
                    showStatus('Branch not found. You can add a new branch with this ID.', 'info');
                    clearBranchForm();
                    document.getElementById('btnAdd').disabled = false;
                }
            } catch (error) {
                console.error('❌ Error loading branch data:', error);
                showStatus('Error loading branch data: ' + error.message, 'error');
            }
        }

        // Populate Branch Form
        function populateBranchForm(data) {
            console.log('📝 Populating branch form with data:', data);
            console.log('🔍 UpdateCount field value:', data.UpdateCount);
            console.log('🔍 All data keys:', Object.keys(data));
            document.getElementById('branchId').value = data.BranchID || '';
            document.getElementById('branchName').value = data.BranchName || '';
            document.getElementById('address1').value = data.Address1 || '';
            document.getElementById('address2').value = data.Address2 || '';
            document.getElementById('city').value = data.CityID || '';
            document.getElementById('country').value = data.CountryID || '';
            document.getElementById('zipCode').value = data.ZipCode || '';
            document.getElementById('emailId').value = data.EmailID || '';
            document.getElementById('phone1').value = data.Phone1 || '';
            document.getElementById('phone2').value = data.Phone2 || '';
            document.getElementById('mobile').value = data.Mobile || '';
            document.getElementById('faxNo').value = data.FaxNo || '';
            document.getElementById('branchType').value = data.BranchTypeID || '';
            document.getElementById('clearingDays').value = data.ClearingDays || '';
            document.getElementById('swiftCode').value = data.SwiftCode || '';
            document.getElementById('isUpcountryBranch').checked = data.IsUpcountryBranch === 1 || data.IsUpcountryBranch === true;
            document.getElementById('branchRemarks').value = data.Remarks || '';

            // Populate Behind The Scene
            const btsBranchInputs = document.querySelectorAll('.branch-bts');
            if (btsBranchInputs.length >= 6) {
                btsBranchInputs[0].value = data.CreatedBy || '';
                btsBranchInputs[1].value = data.CreatedOn ? formatDateTime(data.CreatedOn) : '';
                btsBranchInputs[2].value = data.ModifiedBy || '';
                btsBranchInputs[3].value = data.ModifiedOn ? formatDateTime(data.ModifiedOn) : '';
                btsBranchInputs[4].value = data.SupervisedBy || '';
                btsBranchInputs[5].value = data.SupervisedOn ? formatDateTime(data.SupervisedOn) : '';
            }
            console.log('✅ Branch form populated successfully');
        }

        // Clear Branch Form
        function clearBranchForm() {
            const form = document.getElementById('clearingBranchesForm');
            if (form) {
                form.reset();
                const btsBranchInputs = form.querySelectorAll('.branch-bts');
                btsBranchInputs.forEach(input => input.value = '');
            }
            console.log('✅ Branch form cleared');
        }

        // ============================
        // CLEARING BANK SIGNATORIES HANDLERS
        // ============================

        // Load Signatory Data
        async function loadSignatoryData(bankId, signatoryId) {
            try {
                const effectiveBankId = bankId || currentBankData?.BankID;

                if (!effectiveBankId) {
                    showToast('Please select a bank first', { title: 'Signatory', variant: 'warning', timeoutMs: 3000 });
                    return;
                }

                console.log('✍️ Loading signatory data for BankID:', effectiveBankId, 'SignatoryID:', signatoryId);
                showToast('Loading signatory data...', { title: 'Loading', variant: 'info', timeoutMs: 2000 });

                const requestData = {
                    BankID: effectiveBankId,
                    SignatoryID: signatoryId,
                    OurBranchID: "0603",
                    OperatorID: "CSADM",
                    Direction: 0
                };
                console.log('📤 Signatory Request:', requestData);

                const result = await OtherStaticDataService.getBankSignatories(requestData);
                console.log('📥 Signatory Response:', result);

                let signatoryData = null;

                // Handle different response formats
                if (result.data && result.data.Details01) {
                    if (Array.isArray(result.data.Details01) && result.data.Details01.length > 0) {
                        signatoryData = result.data.Details01[0];
                    } else if (!Array.isArray(result.data.Details01) && typeof result.data.Details01 === 'object' && result.data.Details01.SignatoryID) {
                        signatoryData = result.data.Details01;
                    }
                }

                if (signatoryData && signatoryData.SignatoryID) {
                    currentSignatoryData = signatoryData;
                    console.log('✅ Signatory data loaded:', currentSignatoryData);
                    populateSignatoryForm(currentSignatoryData);
                    
                    // Also populate the signatories list if response contains multiple records
                    let allSignatories = [];
                    if (Array.isArray(result.data.Details01)) {
                        allSignatories = result.data.Details01;
                    } else if (signatoryData) {
                        allSignatories = [signatoryData];
                    }
                    populateSignatoriesList(allSignatories);
                    
                    setSignatoryFormState('loaded');
                    showToast('Signatory data loaded successfully', { title: 'Success', variant: 'success', timeoutMs: 3000 });
                } else {
                    console.warn('⚠️ No valid signatory data found');
                    showToast('Signatory not found. You can add a new signatory with this ID.', { title: 'Not Found', variant: 'info', timeoutMs: 4000 });
                    currentSignatoryData = null;
                    clearSignatoriesList();
                    // Keep the Signatory ID, enable ADD button
                    setSignatoryFormState('afterView');
                }
            } catch (error) {
                console.error('❌ Error loading signatory data:', error);
                showToast('Error loading signatory data: ' + error.message, { title: 'Error', variant: 'error', timeoutMs: 4000 });
            }
        }

        // Populate Signatory Form
        function populateSignatoryForm(data) {
            console.log('📝 Populating signatory form with data:', data);
            
            document.getElementById('signatoryId').value = data.SignatoryID || '';
            document.getElementById('signatoryName').value = data.SignatoryName || data.Names || '';
            document.getElementById('signaturePath').value = data.ImagePath || data.SignaturePath || '';

            // Populate Behind The Scene
            const btsSignatoryInputs = document.querySelectorAll('.signatory-bts');
            if (btsSignatoryInputs.length >= 6) {
                btsSignatoryInputs[0].value = data.CreatedBy || '';
                btsSignatoryInputs[1].value = data.CreatedOn ? formatDateTime(data.CreatedOn) : '';
                btsSignatoryInputs[2].value = data.ModifiedBy || '';
                btsSignatoryInputs[3].value = data.ModifiedOn ? formatDateTime(data.ModifiedOn) : '';
                btsSignatoryInputs[4].value = data.SupervisedBy || '';
                btsSignatoryInputs[5].value = data.SupervisedOn ? formatDateTime(data.SupervisedOn) : '';
            }
            console.log('✅ Signatory form populated successfully');
        }

        // Populate Signatories List Table
        function populateSignatoriesList(signatories) {
            console.log('📋 Populating signatories list with', signatories?.length || 0, 'records');
            
            const tableBody = document.querySelector('#signatoriesTable tbody');
            if (!tableBody) {
                console.warn('⚠️ Signatories table not found');
                return;
            }
            
            // Clear existing rows
            tableBody.innerHTML = '';
            
            if (!signatories || signatories.length === 0) {
                const emptyRow = document.createElement('tr');
                emptyRow.innerHTML = '<td colspan="4" class="text-center text-muted" style="border: 1px solid #dee2e6; padding: 12px;">No signatories found</td>';
                tableBody.appendChild(emptyRow);
                return;
            }
            
            // Populate table with signatory data
            signatories.forEach((signatory, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="border: 1px solid #dee2e6; padding: 8px; text-align: center;">${index + 1}</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px;">${escapeHtml(signatory.SignatoryID || '')}</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px;">${escapeHtml(signatory.SignatoryName || signatory.Names || '')}</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px;">${escapeHtml(signatory.ImagePath || signatory.SignaturePath || '')}</td>
                `;
                
                // Make row clickable to load signatory details
                row.style.cursor = 'pointer';
                row.title = 'Click to view details';
                row.addEventListener('click', () => {
                    const signatoryIdInput = document.getElementById('signatoryId');
                    if (signatoryIdInput) {
                        signatoryIdInput.value = signatory.SignatoryID;
                        loadSignatoryData(currentBankData?.BankID, signatory.SignatoryID);
                    }
                });
                
                // Add hover effect
                row.addEventListener('mouseenter', () => {
                    row.style.backgroundColor = '#f0f0f0';
                });
                row.addEventListener('mouseleave', () => {
                    row.style.backgroundColor = '';
                });
                
                tableBody.appendChild(row);
            });
            
            console.log('✅ Signatories list populated with', signatories.length, 'records');
        }

        // Clear Signatories List Table
        function clearSignatoriesList() {
            const tableBody = document.querySelector('#signatoriesTable tbody');
            if (tableBody) {
                tableBody.innerHTML = '';
            }
        }

        // Clear Signatory Form
        function clearSignatoryForm() {
            const form = document.getElementById('clearingBankSignatoriesForm');
            if (form) {
                form.reset();
                const btsSignatoryInputs = form.querySelectorAll('.signatory-bts');
                btsSignatoryInputs.forEach(input => input.value = '');
                
                // Reset readonly attributes
                const signatoryNameInput = document.getElementById('signatoryName');
                const signaturePathInput = document.getElementById('signaturePath');
                if (signatoryNameInput) signatoryNameInput.setAttribute('readonly', 'readonly');
                if (signaturePathInput) signaturePathInput.setAttribute('readonly', 'readonly');
            }
            
            // Also clear the signatories list table
            clearSignatoriesList();
            
            console.log('✅ Signatory form cleared');
        }

        // Validate Signatory Form
        function validateSignatoryForm() {
            const signatoryIdInput = document.getElementById('signatoryId');
            const signatoryNameInput = document.getElementById('signatoryName');
            
            const errors = [];

            if (!signatoryIdInput?.value.trim()) {
                errors.push('Signatory ID is required');
                if (signatoryIdInput) signatoryIdInput.focus();
            }

            if (!signatoryNameInput?.value.trim()) {
                errors.push('Signatory Name is required');
                if (errors.length === 1 && signatoryNameInput) signatoryNameInput.focus();
            }

            if (errors.length > 0) {
                showToast(errors[0], { title: 'Validation Error', variant: 'error', timeoutMs: 4000 });
                return false;
            }

            return true;
        }

        // Get Signatory Form Data
        function getSignatoryFormData() {
            const signatoryIdInput = document.getElementById('signatoryId');
            const signatoryNameInput = document.getElementById('signatoryName');
            const signaturePathInput = document.getElementById('signaturePath');
            const bankId = currentBankData?.BankID;

            return {
                BankID: bankId,
                SignatoryID: signatoryIdInput?.value.trim() || '',
                SignatoryName: signatoryNameInput?.value.trim() || '',
                ImageID: 0, // Default, would come from file upload
                CreatedBy: currentMode === 'add' ? 'CSADM' : (currentSignatoryData?.CreatedBy || 'CSADM'),
                CreatedOn: currentMode === 'add' ? null : (currentSignatoryData?.CreatedOn || null),
                ModifiedBy: 'CSADM',
                ModifiedOn: null, // Will be set by backend
                SupervisedBy: '',
                NewRecord: currentMode === 'add' ? 1 : (currentSignatoryData?.UpdateCount || 0)
            };
        }

        // Set Branch Form State
        function setBranchFormState(state) {
            const form = document.getElementById('clearingBranchesForm');
            if (!form) return;

            const inputs = form.querySelectorAll('.form-control:not(.branch-bts)');
            const checkboxes = form.querySelectorAll('.form-checkbox');
            const branchIdInput = document.getElementById('branchId');

            const btnView = document.getElementById('btnView');
            const btnAdd = document.getElementById('btnAdd');
            const btnEdit = document.getElementById('btnEdit');
            const btnDelete = document.getElementById('btnDelete');
            const btnSave = document.getElementById('btnSave');
            const btnCancel = document.getElementById('btnCancel');
            const btnBack = document.getElementById('btnBack');

            if (state === 'view') {
                inputs.forEach(input => input.disabled = true);
                checkboxes.forEach(cb => cb.disabled = true);
                if (branchIdInput) branchIdInput.disabled = false;

                // Only View and Back buttons enabled in initial view mode
                if (btnView) btnView.disabled = false;
                if (btnAdd) btnAdd.disabled = true;
                if (btnEdit) btnEdit.disabled = true;
                if (btnDelete) btnDelete.disabled = true;
                if (btnSave) btnSave.disabled = true;
                if (btnCancel) btnCancel.disabled = true;
                if (btnBack) btnBack.disabled = false;
            } else if (state === 'viewed') {
                inputs.forEach(input => input.disabled = true);
                checkboxes.forEach(cb => cb.disabled = true);
                if (branchIdInput) branchIdInput.disabled = true;

                if (btnView) btnView.disabled = true;
                if (btnAdd) btnAdd.disabled = true;
                if (btnEdit) btnEdit.disabled = false;
                if (btnDelete) btnDelete.disabled = false;
                if (btnSave) btnSave.disabled = true;
                if (btnCancel) btnCancel.disabled = false;
                if (btnBack) btnBack.disabled = false;
            } else if (state === 'edit' || state === 'add') {
                inputs.forEach(input => input.disabled = false);
                checkboxes.forEach(cb => cb.disabled = false);
                if (state === 'edit' && branchIdInput) branchIdInput.disabled = true;

                if (btnView) btnView.disabled = true;
                if (btnAdd) btnAdd.disabled = true;
                if (btnEdit) btnEdit.disabled = true;
                if (btnDelete) btnDelete.disabled = true;
                if (btnSave) btnSave.disabled = false;
                if (btnCancel) btnCancel.disabled = false;
                if (btnBack) btnBack.disabled = false;
            }

            console.log('🎛️ Branch form state set to:', state);
        }

        // Set Signatory Form State
        function setSignatoryFormState(state) {
            const form = document.getElementById('clearingBankSignatoriesForm');
            if (!form) {
                console.warn('⚠️ Signatory form not found');
                return;
            }

            const inputs = form.querySelectorAll('.form-control:not(.signatory-bts)');
            const signatoryIdInput = document.getElementById('signatoryId');
            const signatoryNameInput = document.getElementById('signatoryName');
            const signaturePathInput = document.getElementById('signaturePath');

            const btnShow = document.getElementById('btnShow');
            const btnView = document.getElementById('btnView');
            const btnAdd = document.getElementById('btnAdd');
            const btnEdit = document.getElementById('btnEdit');
            const btnDelete = document.getElementById('btnDelete');
            const btnSave = document.getElementById('btnSave');
            const btnCancel = document.getElementById('btnCancel');
            const btnBack = document.getElementById('btnBack');
            const btnBrowseSignature = document.getElementById('btnBrowseSignature');

            // Hide SHOW button - only visible in clearing-bank section when loaded
            if (btnShow) {
                btnShow.style.display = currentSection === 'clearing-bank' ? 'inline-flex' : 'none';
            }

            // Disable all inputs first
            inputs.forEach(input => input.disabled = true);

            if (state === 'view') {
                // Initial state: Only VIEW and BACK buttons enabled
                // Enable Signatory ID for user input and ensure it's not readonly
                if (signatoryIdInput) {
                    signatoryIdInput.disabled = false;
                    signatoryIdInput.removeAttribute('readonly');
                }
                
                // Disable other input fields
                if (signatoryNameInput) signatoryNameInput.disabled = true;
                if (signaturePathInput) signaturePathInput.disabled = true;
                if (btnBrowseSignature) btnBrowseSignature.disabled = true;

                if (btnShow) btnShow.disabled = true;
                if (btnView) btnView.disabled = false;
                if (btnAdd) btnAdd.disabled = true;
                if (btnEdit) btnEdit.disabled = true;
                if (btnDelete) btnDelete.disabled = true;
                if (btnSave) btnSave.disabled = true;
                if (btnCancel) btnCancel.disabled = true;
                if (btnBack) btnBack.disabled = false;
            } else if (state === 'afterView') {
                // After viewing a non-existent signatory: ADD, CANCEL, BACK enabled
                // Keep Signatory ID enabled
                if (signatoryIdInput) signatoryIdInput.disabled = false;
                if (btnBrowseSignature) btnBrowseSignature.disabled = true;

                if (btnShow) btnShow.disabled = true;
                if (btnView) btnView.disabled = true;
                if (btnAdd) btnAdd.disabled = false;
                if (btnEdit) btnEdit.disabled = true;
                if (btnDelete) btnDelete.disabled = true;
                if (btnSave) btnSave.disabled = true;
                if (btnCancel) btnCancel.disabled = false;
                if (btnBack) btnBack.disabled = false;
            } else if (state === 'loaded') {
                // Signatory loaded: SHOW, EDIT, DELETE, CANCEL, BACK enabled
                // All fields readonly but not disabled so values are visible
                if (signatoryIdInput) {
                    signatoryIdInput.disabled = false;
                    signatoryIdInput.setAttribute('readonly', 'readonly');
                }
                if (signatoryNameInput) {
                    signatoryNameInput.disabled = false;
                    signatoryNameInput.setAttribute('readonly', 'readonly');
                }
                if (signaturePathInput) {
                    signaturePathInput.disabled = false;
                    signaturePathInput.setAttribute('readonly', 'readonly');
                }
                if (btnBrowseSignature) btnBrowseSignature.disabled = true;

                if (btnShow) btnShow.disabled = false;
                if (btnView) btnView.disabled = true;
                if (btnAdd) btnAdd.disabled = true;
                if (btnEdit) btnEdit.disabled = false;
                if (btnDelete) btnDelete.disabled = false;
                if (btnSave) btnSave.disabled = true;
                if (btnCancel) btnCancel.disabled = false;
                if (btnBack) btnBack.disabled = false;
            } else if (state === 'add') {
                // Add mode: all inputs enabled, SAVE, CANCEL enabled only
                inputs.forEach(input => input.disabled = false);
                // Lock Signatory ID during add (user already entered it)
                if (signatoryIdInput) signatoryIdInput.disabled = true;
                // Enable browse button for file upload
                if (btnBrowseSignature) btnBrowseSignature.disabled = false;

                if (btnShow) btnShow.disabled = true;
                if (btnView) btnView.disabled = true;
                if (btnAdd) btnAdd.disabled = true;
                if (btnEdit) btnEdit.disabled = true;
                if (btnDelete) btnDelete.disabled = true;
                if (btnSave) btnSave.disabled = false;
                if (btnCancel) btnCancel.disabled = false;
                if (btnBack) btnBack.disabled = true;
            } else if (state === 'edit') {
                // Edit mode: enable Signatory Name and Signature Path for editing, lock ID only
                inputs.forEach(input => input.disabled = false);
                
                // Lock Signatory ID (cannot be changed)
                if (signatoryIdInput) signatoryIdInput.disabled = true;
                
                // Enable Signatory Name for editing (remove readonly)
                if (signatoryNameInput) {
                    signatoryNameInput.disabled = false;
                    signatoryNameInput.removeAttribute('readonly');
                }
                
                // Enable Signature Path for editing (remove readonly)
                if (signaturePathInput) {
                    signaturePathInput.disabled = false;
                    signaturePathInput.removeAttribute('readonly');
                }
                
                // Enable browse button for file upload
                if (btnBrowseSignature) btnBrowseSignature.disabled = false;

                if (btnShow) btnShow.disabled = true;
                if (btnView) btnView.disabled = true;
                if (btnAdd) btnAdd.disabled = true;
                if (btnEdit) btnEdit.disabled = true;
                if (btnDelete) btnDelete.disabled = true;
                if (btnSave) btnSave.disabled = false;
                if (btnCancel) btnCancel.disabled = false;
                if (btnBack) btnBack.disabled = true;
            }

            console.log('🎛️ Signatory form state set to:', state);
        }

        // Handle Bank Search
        async function handleBankSearch() {
            const bankIdInput = document.getElementById('bankId');
            const searchTerm = bankIdInput.value.trim();

            console.log('🔍 Bank search triggered for:', searchTerm);

            try {
                showStatus('Searching for banks...', 'info');

                // Use p_GetSearchResult with MastClrBankID table
                const result = await SearchService.search({
                    WhereStmt: '',
                    TableID: 'MastClrBankID',
                    RefID: null,
                    PrevOrNext: 0,
                    // AdvFilterString: searchTerm ? `BankID LIKE '%${searchTerm}%' OR BankName LIKE '%${searchTerm}%'` : '',
                    AdvFilterString: '',
                    OperatorID: 'CSADM',
                    ModuleID: 2015,
                    OurBranchID: '0603',
                    SearchKey: null,
                    LanguageID: 'en'
                });

                console.log('🔍 Bank search result:', result);

                // Get banks data from response
                let banksData = [];
                if (result.success) {
                    if (result.data && Array.isArray(result.data)) {
                        banksData = result.data;
                    } else if (result.Details && Array.isArray(result.Details)) {
                        banksData = result.Details;
                    } else if (result.data && result.data.Details && Array.isArray(result.data.Details)) {
                        banksData = result.data.Details;
                    }
                }

                if (banksData.length > 0) {
                    console.log(`✅ Found ${banksData.length} banks`);
                    showBankSearchResultsModal(banksData);
                } else {
                    console.warn('⚠️ No banks found');
                    showStatus('No banks found', 'warning');
                }
            } catch (error) {
                console.error('❌ Search error:', error);
                showStatus('Error searching banks: ' + error.message, 'error');
            }
        }

        function showBankSearchResultsModal(results) {
            const modalId = `bank-search-modal-${Date.now()}`;

            const modalHTML = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width: 700px;">
                    <div class="modal-content">
                        <div class="modal-header" style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%); color: white;">
                            <h5 class="modal-title" style="color: white;">Clearing Bank</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" style="padding: 20px;">
                            <div class="results-header" style="padding: 10px; background: #f0f8ff; border-left: 3px solid #1e7cc4; margin-bottom: 15px;">
                                <strong>Search Results</strong>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-hover table-sm">
                                    <thead style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%); color: white;">
                                        <tr>
                                            <th style="width: 40px; color: white;">#</th>
                                            <th style="color: white;">BankID</th>
                                            <th style="color: white;">BankName</th>
                                            <th style="color: white;">ShortName</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${results.map((bank, idx) => `
                                            <tr class="bank-row" data-idx="${idx}" style="cursor: pointer;">
                                                <td>${idx + 1}</td>
                                                <td>${bank.BankID || ''}</td>
                                                <td>${bank.BankName || ''}</td>
                                                <td>${bank.ShortName || ''}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHTML;
            document.body.appendChild(modalContainer);

            const modalEl = document.getElementById(modalId);

            // Get Bootstrap Modal constructor - try parent window first (for iframes), then current window
            let ModalConstructor = null;
            if (window.parent && window.parent.bootstrap && window.parent.bootstrap.Modal) {
                ModalConstructor = window.parent.bootstrap.Modal;
            } else if (window.bootstrap && window.bootstrap.Modal) {
                ModalConstructor = window.bootstrap.Modal;
            }

            if (!ModalConstructor) {
                console.error('Bootstrap Modal not found in current or parent window');
                // Fallback: just show the modal using display style
                modalEl.classList.add('show');
                modalEl.style.display = 'block';
                const backdrop = document.createElement('div');
                backdrop.className = 'modal-backdrop fade show';
                document.body.appendChild(backdrop);

                // Close on backdrop click
                backdrop.addEventListener('click', () => {
                    modalEl.remove();
                    backdrop.remove();
                });

                var modal = {
                    hide: () => {
                        modalEl.remove();
                        backdrop.remove();
                    }
                };
            } else {
                var modal = new ModalConstructor(modalEl, { backdrop: 'static', keyboard: false });
                modal.show();
            }

            // Add click handlers to rows
            modalEl.querySelectorAll('.bank-row').forEach((row) => {
                row.addEventListener('click', async () => {
                    const idx = parseInt(row.dataset.idx);
                    const selectedBank = results[idx];

                    console.log('✅ Bank selected:', selectedBank);

                    // Close modal first
                    modal.hide();
                    setTimeout(() => modalEl.remove(), 500);

                    // Auto-fetch full bank details using getBanks
                    if (selectedBank.BankID) {
                        await loadBankData(selectedBank.BankID);
                    }
                });

                // Add hover effect
                row.addEventListener('mouseenter', () => {
                    row.style.backgroundColor = '#d0e8ff';
                });
                row.addEventListener('mouseleave', () => {
                    row.style.backgroundColor = '';
                });
            });
        }

        // Handle Branch Search
        async function handleBranchSearch() {
            const branchIdInput = document.getElementById('branchId');
            const searchTerm = branchIdInput?.value.trim() || '';

            // Get BankID from multiple sources: contextBankId (Clearing Branches), currentBankData, or main bankId field
            const contextBankId = document.getElementById('contextBankId')?.value.trim();
            const mainBankId = document.getElementById('bankId')?.value.trim();
            const bankId = contextBankId || currentBankData?.BankID || mainBankId;

            if (!bankId) {
                showStatus('Please load a bank from Bank Details section first', 'warning');
                showToast('No bank selected. Please load a bank first.', {
                    title: 'Branch Search',
                    variant: 'warning',
                    timeoutMs: 4000
                });
                return;
            }

            console.log('🔍 Branch search triggered for BankID:', bankId, 'SearchTerm:', searchTerm);
            console.log('📋 Using Bank:', currentBankData?.BankName || 'Unknown');

            try {
                showStatus('Searching for branches...', 'info');

                // Build AdvFilterString with BankID filter and optional search term
                let advFilterString = `BankID='${bankId}'`;
                // if (searchTerm) {
                //     advFilterString += ` AND (BranchID LIKE '%${searchTerm}%' OR BranchName LIKE '%${searchTerm}%')`;
                // }

                console.log('🔍 AdvFilterString:', advFilterString);

                const result = await SearchService.search({
                    WhereStmt: '',
                    TableID: 'ClearingBranchID',
                    RefID: null,
                    PrevOrNext: 0,
                    AdvFilterString: advFilterString,
                    OperatorID: 'CSADM',
                    ModuleID: 2020,
                    OurBranchID: '0603',
                    SearchKey: null,
                    LanguageID: 'en'
                });

                console.log('🔍 Branch search result:', result);

                let branchesData = [];
                if (result.success) {
                    if (result.data && Array.isArray(result.data)) {
                        branchesData = result.data;
                    } else if (result.Details && Array.isArray(result.Details)) {
                        branchesData = result.Details;
                    } else if (result.data && result.data.Details && Array.isArray(result.data.Details)) {
                        branchesData = result.data.Details;
                    }
                }

                if (branchesData.length > 0) {
                    console.log(`✅ Found ${branchesData.length} branches`);
                    showBranchSearchResultsModal(branchesData, bankId);
                } else {
                    console.warn('⚠️ No branches found');
                    showStatus('No branches found for this bank. You can add a new branch.', 'info');

                    // Clear the form and set view state first
                    clearBranchForm();
                    setBranchFormState('view');

                    // Then enable Add button to allow adding new branch (after setBranchFormState)
                    const btnAdd = document.getElementById('btnAdd');
                    if (btnAdd) {
                        btnAdd.disabled = false;
                        console.log('✅ Add button enabled - ready to add new branch');
                    }
                }
            } catch (error) {
                console.error('❌ Branch search error:', error);
                showStatus('Error searching branches: ' + error.message, 'error');
            }
        }

        function showBranchSearchResultsModal(results, bankId) {
            const modalId = `branch-search-modal-${Date.now()}`;

            const modalHTML = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width: 700px;">
                    <div class="modal-content">
                        <div class="modal-header" style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%); color: white;">
                            <h5 class="modal-title" style="color: white;">Clearing Branches</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" style="padding: 20px;">
                            <div class="results-header" style="padding: 10px; background: #f0f8ff; border-left: 3px solid #1e7cc4; margin-bottom: 15px;">
                                <strong>Search Results</strong>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-hover table-sm">
                                    <thead style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%); color: white;">
                                        <tr>
                                            <th style="width: 40px; color: white;">#</th>
                                            <th style="color: white;">BranchID</th>
                                            <th style="color: white;">BranchName</th>
                                            <th style="color: white;">City</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${results.map((branch, idx) => `
                                            <tr class="branch-row" data-idx="${idx}" style="cursor: pointer;">
                                                <td>${idx + 1}</td>
                                                <td>${branch.BranchID || ''}</td>
                                                <td>${branch.BranchName || ''}</td>
                                                <td>${branch.CityID || ''}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHTML;
            document.body.appendChild(modalContainer);

            const modalEl = document.getElementById(modalId);

            let ModalConstructor = null;
            if (window.parent && window.parent.bootstrap && window.parent.bootstrap.Modal) {
                ModalConstructor = window.parent.bootstrap.Modal;
            } else if (window.bootstrap && window.bootstrap.Modal) {
                ModalConstructor = window.bootstrap.Modal;
            }

            if (!ModalConstructor) {
                modalEl.classList.add('show');
                modalEl.style.display = 'block';
                const backdrop = document.createElement('div');
                backdrop.className = 'modal-backdrop fade show';
                document.body.appendChild(backdrop);

                backdrop.addEventListener('click', () => {
                    modalEl.remove();
                    backdrop.remove();
                });

                var modal = {
                    hide: () => {
                        modalEl.remove();
                        backdrop.remove();
                    }
                };
            } else {
                var modal = new ModalConstructor(modalEl, { backdrop: 'static', keyboard: false });
                modal.show();
            }

            modalEl.querySelectorAll('.branch-row').forEach((row) => {
                row.addEventListener('click', async () => {
                    const idx = parseInt(row.dataset.idx);
                    const selectedBranch = results[idx];

                    console.log('✅ Branch selected:', selectedBranch);

                    modal.hide();
                    setTimeout(() => modalEl.remove(), 500);

                    if (selectedBranch.BranchID) {
                        await loadBranchData(bankId, selectedBranch.BranchID);
                    }
                });

                row.addEventListener('mouseenter', () => {
                    row.style.backgroundColor = '#d0e8ff';
                });
                row.addEventListener('mouseleave', () => {
                    row.style.backgroundColor = '';
                });
            });
        }

        // Handle Client Search
        async function handleClientSearch() {
            const clientIdInput = document.getElementById('clientId');
            const searchTerm = clientIdInput.value.trim();

            try {
                const result = await SearchService.search({
                    TableID: "Clients",
                    WhereStmt: searchTerm ? `ClientID like '%${searchTerm}%' or ClientName like '%${searchTerm}%'` : "",
                    PrevOrNext: "1",
                    RefID: ""
                });

                if (result.success && result.data && result.data.length > 0) {
                    // For now, populate with first result
                    // TODO: Implement a search results modal/grid
                    clientIdInput.value = result.data[0].ClientID;
                } else {
                    showStatus('No clients found', 'info');
                }
            } catch (error) {
                console.error('Search error:', error);
                showStatus('Error searching clients', 'error');
            }
        }

        // Handle Browse Signature Button
        function handleBrowseSignature() {
            console.log('📁 Browse signature clicked');
            console.log('Current section:', currentSection);
            console.log('Current mode:', currentMode);
            
            // Only allow browsing in add or edit mode
            if (currentSection !== 'clearing-bank') {
                console.warn('Not in clearing-bank section, ignoring browse click');
                return;
            }
            
            if (currentMode !== 'add' && currentMode !== 'edit') {
                showToast('Please click Add or Edit first to upload a signature', {
                    title: 'Upload Signature',
                    variant: 'warning',
                    timeoutMs: 3000
                });
                return;
            }
            
            // Show the image upload modal
            const modalElement = document.getElementById('imageUploadModal');
            if (!modalElement) {
                console.error('❌ Image upload modal element not found!');
                alert('Error: Image upload modal not found. Please refresh the page.');
                return;
            }
            
            console.log('✅ Modal element found, attempting to show...');
            
            try {
                // Try multiple methods to show the modal
                let modalShown = false;
                
                // Method 1: Try Bootstrap 5 (window.bootstrap)
                if (typeof window.bootstrap !== 'undefined' && window.bootstrap.Modal) {
                    console.log('Using window.bootstrap.Modal...');
                    const modal = new window.bootstrap.Modal(modalElement);
                    modal.show();
                    modalShown = true;
                }
                // Method 2: Try Bootstrap 5 (global bootstrap)
                else if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                    console.log('Using bootstrap.Modal...');
                    const modal = new bootstrap.Modal(modalElement);
                    modal.show();
                    modalShown = true;
                }
                // Method 3: Try jQuery/Bootstrap 4 method
                else if (typeof $ !== 'undefined' && $.fn.modal) {
                    console.log('Using jQuery modal...');
                    $(modalElement).modal('show');
                    modalShown = true;
                }
                // Method 4: Manual show using classes and styles
                else {
                    console.warn('No Bootstrap library found, using manual method...');
                    
                    // Show modal as centered popup overlay
                    modalElement.classList.remove('fade');
                    modalElement.classList.add('show');
                    modalElement.style.display = 'block';
                    modalElement.setAttribute('aria-modal', 'true');
                    modalElement.removeAttribute('aria-hidden');
                    
                    // Ensure modal-dialog is centered
                    const modalDialog = modalElement.querySelector('.modal-dialog');
                    if (modalDialog) {
                        modalDialog.style.pointerEvents = 'none';
                    }
                    
                    // Ensure modal-content is clickable
                    const modalContent = modalElement.querySelector('.modal-content');
                    if (modalContent) {
                        modalContent.style.pointerEvents = 'auto';
                    }
                    
                    // Add backdrop
                    const backdrop = document.createElement('div');
                    backdrop.className = 'modal-backdrop show';
                    backdrop.id = 'imageUploadBackdrop';
                    backdrop.style.position = 'fixed';
                    backdrop.style.top = '0';
                    backdrop.style.left = '0';
                    backdrop.style.width = '100%';
                    backdrop.style.height = '100%';
                    backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                    backdrop.style.zIndex = '1050';
                    document.body.appendChild(backdrop);
                    document.body.classList.add('modal-open');
                    document.body.style.overflow = 'hidden';
                    document.body.style.paddingRight = '0px';
                    
                    console.log('✅ Modal displayed as centered popup overlay');
                    modalShown = true;
                }
                
                if (modalShown) {
                    console.log('✅ Modal shown successfully');
                } else {
                    console.error('❌ Could not show modal');
                    alert('Error: Could not show modal. Please refresh the page.');
                }
            } catch (error) {
                console.error('❌ Error showing modal:', error);
                alert('Error showing modal: ' + error.message);
            }
        }

        // Initialize Image Upload Modal
        function initializeImageUploadModal() {
            console.log('🔧 Initializing image upload modal...');
            
            const fileInput = document.getElementById('imageFileInput');
            const previewContainer = document.getElementById('imagePreviewContainer');
            const previewImage = document.getElementById('imagePreview');
            const uploadButton = document.getElementById('btnUploadImage');
            const modal = document.getElementById('imageUploadModal');

            console.log('Modal elements found:', {
                fileInput: !!fileInput,
                previewContainer: !!previewContainer,
                previewImage: !!previewImage,
                uploadButton: !!uploadButton,
                modal: !!modal
            });

            if (!fileInput || !uploadButton || !modal) {
                console.error('❌ Image upload modal elements not found!');
                return;
            }
            
            // Ensure buttons are enabled
            uploadButton.disabled = false;
            uploadButton.style.pointerEvents = 'auto';
            console.log('✅ Upload button enabled');
            
            // Get all close buttons (Cancel button and X button)
            const cancelBtn = modal.querySelector('button.btn-outline-secondary[data-bs-dismiss="modal"]');
            const closeBtn = modal.querySelector('.btn-close[data-bs-dismiss="modal"]');
            
            if (cancelBtn) {
                cancelBtn.disabled = false;
                cancelBtn.style.pointerEvents = 'auto';
                console.log('✅ Cancel button enabled');
            }
            
            if (closeBtn) {
                closeBtn.disabled = false;
                closeBtn.style.pointerEvents = 'auto';
                console.log('✅ Close (X) button enabled');
            }

            // Preview image when file is selected
            fileInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    // Show file name
                    console.log('📎 File selected:', file.name, file.type, file.size, 'bytes');
                    
                    // Show preview for images
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            if (previewImage && previewContainer) {
                                previewImage.src = e.target.result;
                                previewContainer.style.display = 'block';
                            }
                        };
                        reader.readAsDataURL(file);
                    } else {
                        if (previewContainer) {
                            previewContainer.style.display = 'none';
                        }
                    }
                }
            });

            // Handle OK button click
            uploadButton.addEventListener('click', function(e) {
                console.log('🖱️ OK button clicked');
                e.preventDefault();
                e.stopPropagation();
                
                const file = fileInput.files[0];
                if (!file) {
                    console.warn('⚠️ No file selected');
                    showToast('Please select a file first', {
                        title: 'Upload',
                        variant: 'warning',
                        timeoutMs: 3000
                    });
                    return;
                }

                // Set the file path in the signature path field
                // Note: This is a client-side path. Actual server upload would be needed for production.
                const signaturePathInput = document.getElementById('signaturePath');
                if (signaturePathInput) {
                    // Set local file path format
                    signaturePathInput.value = `C:\\Signatures\\${file.name}`;
                    
                    showToast(`File path set: ${file.name}`, {
                        title: 'File Path Updated',
                        variant: 'info',
                        timeoutMs: 3000
                    });
                    
                    console.log('📎 File path set (not uploaded to server):', signaturePathInput.value);
                }

                // Close modal using multiple methods
                try {
                    // Try Bootstrap 5 instance method
                    if (typeof window.bootstrap !== 'undefined' && window.bootstrap.Modal) {
                        const modalInstance = window.bootstrap.Modal.getInstance(modal);
                        if (modalInstance) {
                            modalInstance.hide();
                        }
                    }
                    // Try global bootstrap
                    else if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                        const modalInstance = bootstrap.Modal.getInstance(modal);
                        if (modalInstance) {
                            modalInstance.hide();
                        }
                    }
                    // Try jQuery
                    else if (typeof $ !== 'undefined' && $.fn.modal) {
                        $(modal).modal('hide');
                    }
                    // Manual close
                    else {
                        modal.classList.remove('show');
                        modal.classList.add('fade'); // Restore fade class
                        modal.style.display = 'none';
                        modal.style.position = '';
                        modal.style.top = '';
                        modal.style.left = '';
                        modal.style.width = '';
                        modal.style.height = '';
                        modal.style.zIndex = '';
                        modal.style.overflow = '';
                        modal.setAttribute('aria-hidden', 'true');
                        modal.removeAttribute('aria-modal');
                        
                        // Remove backdrop
                        const backdrop = document.getElementById('imageUploadBackdrop');
                        if (backdrop) {
                            backdrop.remove();
                        }
                        document.body.classList.remove('modal-open');
                        document.body.style.overflow = '';
                        
                        console.log('✅ Modal closed manually');
                    }
                } catch (err) {
                    console.warn('Error closing modal:', err);
                }

                // Reset file input and preview
                fileInput.value = '';
                if (previewContainer) previewContainer.style.display = 'none';
                if (previewImage) previewImage.src = '';
            });

            // Reset when modal is closed
            modal.addEventListener('hidden.bs.modal', function() {
                fileInput.value = '';
                if (previewContainer) previewContainer.style.display = 'none';
                if (previewImage) previewImage.src = '';
            });
            
            // Shared close function for all close triggers
            const closeModal = function(e) {
                if (e) {
                    console.log('🖱️ Close triggered:', e.target.className);
                    e.preventDefault();
                    e.stopPropagation();
                }
                
                console.log('🔒 Closing modal...');
                
                // Manual close
                modal.classList.remove('show');
                modal.classList.add('fade');
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
                modal.removeAttribute('aria-modal');
                
                // Remove backdrop
                const backdrop = document.getElementById('imageUploadBackdrop');
                if (backdrop) {
                    backdrop.remove();
                    console.log('🗑️ Backdrop removed');
                }
                
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
                
                // Reset form
                fileInput.value = '';
                if (previewContainer) previewContainer.style.display = 'none';
                if (previewImage) previewImage.src = '';
                
                console.log('✅ Modal closed successfully');
            };
            
            // Add click listener for Cancel button
            if (cancelBtn) {
                cancelBtn.addEventListener('click', closeModal);
                console.log('✅ Cancel button click handler attached');
            }
            
            // Add click listener for X close button
            if (closeBtn) {
                closeBtn.addEventListener('click', closeModal);
                console.log('✅ Close (X) button click handler attached');
            }
            
            // Add backdrop click listener to close modal when clicking outside
            modal.addEventListener('click', function(e) {
                // Only close if clicking on the modal backdrop itself, not the dialog
                if (e.target.id === 'imageUploadModal') {
                    console.log('🖱️ Backdrop clicked');
                    closeModal(e);
                }
            });
            
            // Prevent clicks inside modal-dialog from closing the modal
            const modalDialog = modal.querySelector('.modal-dialog');
            if (modalDialog) {
                modalDialog.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
            }

            console.log('✅ Image upload modal initialized');
        }

        // Load Bank Data
        async function loadBankData(bankId) {
            try {
                console.log('🔍 Loading bank data for ID:', bankId);
                showStatus('Loading bank data...', 'info');

                const requestData = {
                    BankID: bankId,
                    OurBranchID: "0603", // TODO: Get from session/config
                    OperatorID: "CSADM", // TODO: Get from session
                    Direction: 0 // 0 = exact match
                };
                console.log('📤 Request:', requestData);

                const result = await OtherStaticDataService.getBanks(requestData);
                console.log('📥 Full Response:', result);
                console.log('📥 Response.data:', result.data);
                console.log('📥 Response.data.Details01:', result.data?.Details01);

                // Handle different response formats
                let bankData = null;

                // Check if data is in result.data.Details01 (actual API response format)
                if (result.data && result.data.Details01) {
                    if (Array.isArray(result.data.Details01) && result.data.Details01.length > 0) {
                        bankData = result.data.Details01[0];
                        console.log('✅ Found data in result.data.Details01');
                    } else if (!Array.isArray(result.data.Details01) && typeof result.data.Details01 === 'object' && result.data.Details01.BankID) {
                        bankData = result.data.Details01;
                        console.log('✅ Found data in result.data.Details01 (object)');
                    } else {
                        // Details01 is empty or invalid, no data
                        bankData = null;
                        console.log('ℹ️ Details01 is empty, no bank data found');
                    }
                }

                // Check if data is in result.Details01 (fallback)
                if (!bankData && result.Details01) {
                    if (Array.isArray(result.Details01) && result.Details01.length > 0) {
                        bankData = result.Details01[0];
                        console.log('✅ Found data in result.Details01');
                    } else if (!Array.isArray(result.Details01) && typeof result.Details01 === 'object') {
                        bankData = result.Details01;
                    }
                }

                // Check if data is in result.data.data
                if (!bankData && result.data && result.data.data) {
                    if (Array.isArray(result.data.data) && result.data.data.length > 0) {
                        bankData = result.data.data[0];
                    } else if (!Array.isArray(result.data.data) && typeof result.data.data === 'object') {
                        bankData = result.data.data;
                    }
                }

                // Check if data is in result.data.Details
                if (!bankData && result.data && result.data.Details) {
                    if (Array.isArray(result.data.Details) && result.data.Details.length > 0) {
                        bankData = result.data.Details[0];
                    } else if (!Array.isArray(result.data.Details) && typeof result.data.Details === 'object') {
                        bankData = result.data.Details;
                    }
                }

                // Check if the result itself is the data (some APIs return data directly)
                if (!bankData && result.success && result.BankID) {
                    bankData = result;
                }

                if (bankData && bankData.BankID) {
                    currentBankData = bankData;
                    console.log('✅ Bank data loaded:', currentBankData);

                    // Populate form - wrap in try-catch to ensure state is always set
                    try {
                        populateForm(currentBankData);
                    } catch (populateError) {
                        console.error('⚠️ Error populating form (continuing anyway):', populateError);
                    }

                    // ALWAYS set the state - this is critical for button logic
                    currentMode = 'viewed'; // Special state: data has been viewed
                    setFormState('viewed');
                    showStatus('Bank data loaded successfully', 'success');
                    console.log('✅ State set to VIEWED - Edit/Delete/Cancel buttons should be active');
                } else {
                    console.warn('⚠️ No valid bank data found');
                    console.warn('⚠️ Result structure:', JSON.stringify(result, null, 2));

                    // Clear form but keep the BankID that was entered
                    const enteredBankId = bankId;
                    clearForm();
                    document.getElementById('bankId').value = enteredBankId;

                    // Keep in 'view' state with ADD button enabled
                    currentBankData = null;
                    currentMode = 'view';
                    setFormState('view');

                    // Enable ADD button to allow user to add new bank
                    const btnAdd = document.getElementById('btnAdd');
                    if (btnAdd) btnAdd.disabled = false;

                    console.log('✅ Add button enabled - user can click ADD to create new bank');
                    showStatus('Bank not found. Click ADD to create a new bank with this ID.', 'info');
                    showToast('Bank not found. Click the ADD button to create a new bank record.', {
                        title: 'Add New Bank',
                        variant: 'info',
                        timeoutMs: 5000
                    });
                }
            } catch (error) {
                console.error('❌ Error loading bank data:', error);
                console.error('❌ Error details:', error.message, error.stack);
                showStatus('Error loading bank data: ' + error.message, 'error');
            }
        }

        // Populate Form
        function populateForm(data) {
            console.log('📝 Populating form with data:', data);

            // Safely populate each field
            const bankIdEl = document.getElementById('bankId');
            const shortNameEl = document.getElementById('shortName');
            const bankNameEl = document.getElementById('bankName');
            const typeEl = document.getElementById('type');
            const clientIdEl = document.getElementById('clientId');
            const creditRatingEl = document.getElementById('creditRating');
            const isLocalClearingEl = document.getElementById('isLocalClearing');
            const isForeignClearingEl = document.getElementById('isForeignClearing');
            const clearingThroughEl = document.getElementById('clearingThrough');

            if (bankIdEl) bankIdEl.value = data.BankID || '';
            if (shortNameEl) shortNameEl.value = data.ShortName || '';
            if (bankNameEl) bankNameEl.value = data.BankName || '';
            if (typeEl) typeEl.value = data.InstitutionTypeID || data.BankTypeID || '';
            if (clientIdEl) clientIdEl.value = data.ClientID || '';
            if (creditRatingEl) creditRatingEl.value = data.CreditRating || '';
            if (isLocalClearingEl) isLocalClearingEl.checked = data.IsLocalClearingBank === 1 || data.IsLocalClearingBank === true || data.IsLocalClearing === 1 || data.IsLocalClearing === true;
            if (isForeignClearingEl) isForeignClearingEl.checked = data.IsForeignClearingBank === 1 || data.IsForeignClearingBank === true || data.IsForeignClearing === 1 || data.IsForeignClearing === true;
            if (clearingThroughEl) clearingThroughEl.value = data.ClearingThrough || '';

            // Populate Behind The Scene - with safety checks
            const btsInputs = document.querySelectorAll('.bts-input, .audit-value');
            if (btsInputs.length >= 6) {
                if (btsInputs[0]) btsInputs[0].value = data.CreatedBy || '';
                if (btsInputs[1]) btsInputs[1].value = data.CreatedOn ? formatDateTime(data.CreatedOn) : '';
                if (btsInputs[2]) btsInputs[2].value = data.ModifiedBy || '';
                if (btsInputs[3]) btsInputs[3].value = data.ModifiedOn ? formatDateTime(data.ModifiedOn) : '';
                if (btsInputs[4]) btsInputs[4].value = data.SupervisedBy || '';
                if (btsInputs[5]) btsInputs[5].value = data.SupervisedOn ? formatDateTime(data.SupervisedOn) : '';
            }
            console.log('✅ Form populated successfully');
        }

        // Format DateTime for display
        function formatDateTime(dateString) {
            if (!dateString) return '';
            try {
                const date = new Date(dateString);
                return date.toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
            } catch (error) {
                return dateString;
            }
        }

        // Escape HTML to prevent XSS
        function escapeHtml(text) {
            if (!text) return '';
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return String(text).replace(/[&<>"']/g, m => map[m]);
        }

        // Get Form Data
        function getFormData() {
            const clientId = document.getElementById('clientId').value.trim();
            const clearingThrough = document.getElementById('clearingThrough').value.trim();
            const creditRating = document.getElementById('creditRating').value.trim();
            const shortName = document.getElementById('shortName').value.trim();

            // Build payload - send ONLY parameters expected by p_AddEditBanks stored procedure
            return {
                BankID: document.getElementById('bankId').value.trim(),
                InstitutionTypeID: document.getElementById('type').value.trim() || '', // Ensure trimmed
                BankName: document.getElementById('bankName').value.trim(),
                ShortName: shortName || '', // Required parameter, send empty string if not provided
                ClientID: clientId || '', // Send empty string instead of null to avoid backend uniqueness constraint issues
                CreditRating: creditRating ? parseFloat(creditRating) : 0,
                IsLocalClearingBank: document.getElementById('isLocalClearing').checked ? 1 : 0,
                IsForeignClearingBank: document.getElementById('isForeignClearing').checked ? 1 : 0,
                ClearingThrough: clearingThrough || '',
                ClearingAccountID: '', // Not in form
                BankAccountID: '', // Not in form
                NewRecord: currentMode === 'add' ? 1 : 0, // 1 = new record, 0 = existing record (edit)
                CreatedBy: currentMode === 'add' ? "CSADM" : (currentBankData?.CreatedBy || "CSADM"), // Required
                ModifiedBy: "CSADM" // Required - user making the change
                // NOTE: OurBranchID and OperatorID are NOT parameters for p_AddEditBanks
            };
        }

        function getBranchFormData() {
            const bankId = document.getElementById('contextBankId')?.value?.trim() || currentBankData?.BankID || '';
            
            return {
                BankID: bankId,
                BranchID: document.getElementById('branchId').value.trim(),
                BranchTypeID: document.getElementById('branchType').value || '',
                BranchName: document.getElementById('branchName').value.trim(),
                Address1: document.getElementById('address1').value.trim() || '',
                Address2: document.getElementById('address2').value.trim() || '',
                CityID: document.getElementById('city').value || '',
                CountryID: document.getElementById('country').value || '',
                ZipCode: document.getElementById('zipCode').value.trim() || '',
                Phone1: document.getElementById('phone1').value.trim() || '',
                Phone2: document.getElementById('phone2').value.trim() || '',
                Mobile: document.getElementById('mobile').value.trim() || '',
                Fax: document.getElementById('faxNo').value.trim() || '',
                EMail: document.getElementById('emailId').value.trim() || '',
                ContactPerson1: '', // Not in form
                ContactPerson2: '', // Not in form
                ourBranchID: '0603', // Default our branch ID
                Remarks: document.getElementById('branchRemarks').value.trim() || '',
                IsUpcountry: document.getElementById('isUpcountryBranch').checked ? 1 : 0,
                ClearingCenter: document.getElementById('clearingDays').value.trim() || '',
                SWIFTCode: document.getElementById('swiftCode').value.trim() || '',
                CreatedBy: currentMode === 'add' ? "CSADM" : (currentBranchData?.CreatedBy || "CSADM"),
                ModifiedBy: "CSADM",
                NewRecord: currentMode === 'add' ? 1 : (currentBankData?.UpdateCount || 0), // 1 = INSERT new record, 0 = UPDATE existing record
            };
        }

        // Action Handlers
        async function handleShow() {
            if (currentSection === 'clearing-bank') {
                // Check if there's an image attached
                const signaturePathInput = document.getElementById('signaturePath');
                const imagePath = signaturePathInput?.value.trim();
                
                if (!imagePath) {
                    alert('There is no Signatory Image available');
                    return;
                }
                
                // Show all signatories for current bank
                const bankId = currentBankData?.BankID;
                
                if (!bankId) {
                    showToast('Please select a bank first', { title: 'Show', variant: 'warning', timeoutMs: 3000 });
                    return;
                }
                
                console.log('📋 Show signatories clicked for BankID:', bankId);
                showToast('Loading all signatories...', { title: 'Loading', variant: 'info', timeoutMs: 2000 });
                
                try {
                    const requestData = {
                        BankID: bankId,
                        SignatoryID: '', // Empty to get all signatories
                        OurBranchID: currentBankData?.BranchID || '0603',
                        OperatorID: 'CSADM',
                        Direction: 0
                    };
                    
                    const result = await OtherStaticDataService.getBankSignatories(requestData);
                    
                    if (result.data && result.data.Details01) {
                        const signatories = Array.isArray(result.data.Details01) 
                            ? result.data.Details01 
                            : [result.data.Details01];
                        
                        populateSignatoriesList(signatories);
                        showToast(`Found ${signatories.length} signatory record(s)`, { title: 'Success', variant: 'success', timeoutMs: 3000 });
                    } else {
                        clearSignatoriesList();
                        showToast('No signatories found for this bank', { title: 'Info', variant: 'info', timeoutMs: 3000 });
                    }
                } catch (error) {
                    console.error('❌ Error loading signatories:', error);
                    showToast(`Error loading signatories: ${error.message}`, { title: 'Error', variant: 'error', timeoutMs: 4000 });
                }
            } else if (currentSection === 'clearing-branches') {
                // Show all branches
                console.log('📋 Show branches clicked');
                showToast('Displaying all branches...', { title: 'Show', variant: 'info', timeoutMs: 2000 });
            } else {
                // Show all banks
                console.log('📋 Show banks clicked');
                showToast('Displaying all banks...', { title: 'Show', variant: 'info', timeoutMs: 2000 });
            }
        }

        async function handleView() {
            if (currentSection === 'clearing-bank') {
                // Clearing Bank Signatories View logic
                const signatoryIdInput = document.getElementById('signatoryId');
                const signatoryId = signatoryIdInput?.value.trim();
                const bankId = currentBankData?.BankID;

                console.log('👁️ View signatory button clicked. BankID:', bankId, 'SignatoryID:', signatoryId);

                if (!bankId) {
                    showToast('Please select a bank first', { title: 'View', variant: 'warning', timeoutMs: 3000 });
                    return;
                }

                if (!signatoryId) {
                    showToast('Please enter a Signatory ID', { title: 'View', variant: 'warning', timeoutMs: 3000 });
                    if (signatoryIdInput) signatoryIdInput.focus();
                    return;
                }

                await loadSignatoryData(bankId, signatoryId);
            } else if (currentSection === 'clearing-branches') {
                const branchIdInput = document.getElementById('branchId');
                const branchId = branchIdInput?.value.trim();
                const bankId = currentBankData?.BankID || document.getElementById('bankId')?.value.trim();

                console.log('👁️ View branch button clicked. BankID:', bankId, 'BranchID:', branchId);

                if (bankId && branchId) {
                    await loadBranchData(bankId, branchId);
                } else {
                    setBranchFormState('view');
                    showToast('View mode activated', { title: 'View', variant: 'info', timeoutMs: 2000 });
                }
            } else {
                const bankIdInput = document.getElementById('bankId');
                const bankId = bankIdInput.value.trim();
                console.log('👁️ View button clicked. BankID:', bankId);

                if (bankId) {
                    console.log('🔍 View button: Fetching bank ID:', bankId);
                    await loadBankData(bankId);
                } else {
                    console.log('👁️ View mode: No BankID entered, switching to view mode only');
                    currentMode = 'view';
                    showToast('View mode activated', { title: 'View', variant: 'info', timeoutMs: 2000 });
                    setFormState('view');
                }
            }
        }

        function handleAdd() {
            if (currentSection === 'clearing-bank') {
                // Clearing Bank Signatories Add logic
                const signatoryIdInput = document.getElementById('signatoryId');
                const signatoryId = signatoryIdInput?.value.trim();
                const bankId = currentBankData?.BankID;

                if (!bankId) {
                    showToast('Please select a bank first', { title: 'Add', variant: 'warning', timeoutMs: 3000 });
                    return;
                }

                if (!signatoryId) {
                    showToast('Please enter a Signatory ID first', { title: 'Add', variant: 'warning', timeoutMs: 3000 });
                    if (signatoryIdInput) signatoryIdInput.focus();
                    return;
                }

                currentMode = 'add';
                currentSignatoryData = null;
                isSignatoryFormDirty = false;
                showToast('Add new signatory record', { title: 'Data Entry', variant: 'info', timeoutMs: 3000 });
                setSignatoryFormState('add');
                
                // Focus on Signatory Name field
                const signatoryNameInput = document.getElementById('signatoryName');
                if (signatoryNameInput) {
                    signatoryNameInput.disabled = false;
                    signatoryNameInput.focus();
                }
            } else if (currentSection === 'clearing-branches') {
                currentMode = 'add';
                currentBranchData = null;
                isBranchFormDirty = false;
                showToast('Add new branch record', { title: 'Data Entry', variant: 'info', timeoutMs: 3000 });
                setBranchFormState('add');
                clearBranchForm();
                
                // Focus on Branch Name field after clearing form
                setTimeout(() => {
                    const branchNameInput = document.getElementById('branchName');
                    if (branchNameInput) {
                        branchNameInput.disabled = false;
                        branchNameInput.focus();
                    }
                }, 100);
            } else {
                // Store the current BankID if it exists (from "not found" scenario)
                const bankIdInput = document.getElementById('bankId');
                const existingBankId = bankIdInput?.value.trim() || '';

                currentMode = 'add';
                currentBankData = null;
                isFormDirty = false;
                showToast('All fields enabled. Fill in the bank details and click SAVE.', { title: 'Add New Bank', variant: 'success', timeoutMs: 4000 });
                setFormState('add');
                clearForm();

                // Restore the BankID if it was previously entered
                if (existingBankId) {
                    bankIdInput.value = existingBankId;
                    // Lock the BankID field since it's already set
                    bankIdInput.disabled = true;
                    console.log('✅ BankID preserved and locked:', existingBankId);

                    // Focus on BankName field for user to start entering data
                    const bankNameField = document.getElementById('bankName');
                    if (bankNameField) bankNameField.focus();
                }
            }
        }

        function handleEdit() {
            if (currentSection === 'clearing-bank') {
                // Clearing Bank Signatories Edit logic
                if (!currentSignatoryData) {
                    showToast('Please load a signatory to edit', { title: 'Edit', variant: 'warning', timeoutMs: 3000 });
                    return;
                }
                currentMode = 'edit';
                isSignatoryFormDirty = false;
                setSignatoryFormState('edit');
                showToast('Edit mode activated. Make your changes and click Save.', { title: 'Edit Mode', variant: 'success', timeoutMs: 4000 });
                console.log('✅ Signatory edit mode activated');
            } else if (currentSection === 'clearing-branches') {
                if (!currentBranchData) {
                    showToast('Please select a branch to edit', { title: 'Edit', variant: 'warning', timeoutMs: 3000 });
                    return;
                }
                currentMode = 'edit';
                isBranchFormDirty = false;
                setBranchFormState('edit');
                showToast('Edit mode activated. Make your changes and click Save.', { title: 'Edit Mode', variant: 'success', timeoutMs: 4000 });
                console.log('✅ Branch edit mode activated');
            } else {
                if (!currentBankData) {
                    showToast('Please select a bank to edit', { title: 'Edit', variant: 'warning', timeoutMs: 3000 });
                    return;
                }
                currentMode = 'edit';
                isFormDirty = false; // Reset dirty flag, will be set when user modifies fields
                setFormState('edit');
                showToast('Edit mode activated. All fields are now editable. Make your changes and click Save.', { title: 'Edit Mode', variant: 'success', timeoutMs: 4000 });
                console.log('✅ Bank edit mode activated');
            }
        }

        async function handleDelete() {
            if (currentSection === 'clearing-bank') {
                // Signatory delete logic
                if (!currentSignatoryData) {
                    console.warn('⚠️ No signatory selected for deletion');
                    showToast('Please select a signatory to delete', {
                        title: 'No Selection',
                        variant: 'warning',
                        timeoutMs: 3000
                    });
                    return;
                }

                if (!confirm('Are you sure you want to delete the entry?')) {
                    console.log('🚫 Signatory delete cancelled by user');
                    return;
                }

                try {
                    console.log('🗑️ Deleting signatory:', currentSignatoryData.SignatoryID);
                    showToast('Deleting signatory...', { title: 'Processing', variant: 'info', timeoutMs: 2000 });

                    const bankId = currentBankData?.BankID;
                    if (!bankId) {
                        showToast('Bank ID not found. Please reload the form.', {
                            title: 'Error',
                            variant: 'error',
                            timeoutMs: 4000
                        });
                        return;
                    }

                    const deleteData = {
                        BankID: bankId,
                        SignatoryID: currentSignatoryData.SignatoryID,
                        NewRecord: currentSignatoryData.UpdateCount || 0
                    };
                    console.log('📤 Signatory delete request:', deleteData);

                    const result = await OtherStaticDataService.deleteBankSignatory(deleteData);
                    console.log('📥 Signatory delete response:', result);

                    const isSuccess = result.success === true || result.code === '00' || result.message === 'Success';

                    if (isSuccess) {
                        console.log('✅ Signatory deleted successfully');
                        
                        showToast('Signatory record has been deleted successfully!', {
                            title: 'Delete Success',
                            variant: 'success',
                            timeoutMs: 4000
                        });
                        
                        // Clear form and reset to view mode
                        clearSignatoryForm();
                        currentSignatoryData = null;
                        currentMode = 'view';
                        setSignatoryFormState('view');
                    } else {
                        console.error('❌ Signatory delete failed:', result.message);
                        showToast('Failed to delete signatory: ' + (result.message || 'Unknown error'), {
                            title: 'Delete Failed',
                            variant: 'error',
                            timeoutMs: 4000
                        });
                    }
                } catch (error) {
                    console.error('❌ Signatory delete error:', error);
                    showToast('Error deleting signatory: ' + error.message, {
                        title: 'Error',
                        variant: 'error',
                        timeoutMs: 4000
                    });
                }
            } else if (currentSection === 'clearing-branches') {
                // Branch delete logic
                if (!currentBranchData) {
                    console.warn('⚠️ No branch selected for deletion');
                    showStatus('Please select a branch to delete', 'warning');
                    return;
                }

                if (!confirm(`Are you sure you want to delete branch "${currentBranchData.BranchName}" (ID: ${currentBranchData.BranchID})?`)) {
                    console.log('🚫 Branch delete cancelled by user');
                    return;
                }

                try {
                    console.log('🗑️ Deleting branch:', currentBranchData.BranchID);
                    showStatus('Deleting branch...', 'info');

                    const bankId = currentBranchData.BankID || currentBankData?.BankID || '';
                    const deleteData = {
                        OurBranchID: '0603',
                        BankID: bankId,
                        BranchID: currentBranchData.BranchID,
                        NewRecord: currentBranchData.UpdateCount || 0 // Send current UpdateCount for optimistic concurrency
                    };
                    console.log('📤 Branch delete request:', deleteData);

                    const result = await OtherStaticDataService.deleteBranch(deleteData);
                    console.log('📥 Branch delete response:', result);

                    const isSuccess = result.success === true || result.code === '00' || result.message === 'Success';

                    if (isSuccess) {
                        console.log('✅ Branch deleted successfully');
                        showStatus('✅ Branch record deleted successfully!', 'success');
                        
                        // Show success toast notification
                        showToast('Branch record has been deleted successfully!', {
                            title: 'Delete Success',
                            variant: 'success',
                            timeoutMs: 4000
                        });
                        
                        clearBranchForm();
                        currentBranchData = null;
                        setBranchFormState('view');
                    } else {
                        console.error('❌ Branch delete failed:', result.message);
                        showStatus('❌ ' + (result.message || 'Failed to delete branch'), 'error');
                        alert('Delete Failed\n\n' + (result.message || 'Failed to delete branch'));
                    }
                } catch (error) {
                    console.error('❌ Branch delete error:', error);
                    showStatus('❌ Error deleting branch: ' + error.message, 'error');
                }
            } else {
                // Bank delete logic
                if (!currentBankData) {
                    console.warn('⚠️ No bank selected for deletion');
                    showStatus('Please select a bank to delete', 'warning');
                    return;
                }

                if (!confirm(`Are you sure you want to delete bank "${currentBankData.BankName}" (ID: ${currentBankData.BankID})?`)) {
                    console.log('🚫 Delete cancelled by user');
                    return;
                }

                try {
                    console.log('🗑️ Deleting bank:', currentBankData.BankID);
                    console.log('📋 Bank UpdateCount:', currentBankData.UpdateCount);
                    showStatus('Deleting bank...', 'info');

                    const deleteData = {
                        BankID: currentBankData.BankID,
                        NewRecord: currentBankData.UpdateCount || 0 // Send current UpdateCount for optimistic concurrency
                    };
                    console.log('📤 Delete request:', deleteData);

                    const result = await OtherStaticDataService.deleteBank(deleteData);
                    console.log('📥 Delete response:', result);

                    // Log full response for debugging
                    if (result.data) {
                        console.log('📋 Response data details:', JSON.stringify(result.data, null, 2));
                        console.log('📋 Response data object:', result.data);
                    }

                    // Check for success
                    const isSuccess = result.success === true || result.code === '00' || result.message === 'Success';

                    if (isSuccess) {
                        console.log('✅ Bank deleted successfully');
                        showStatus('✅ Bank record deleted successfully!', 'success');
                        clearForm();
                        currentBankData = null;
                        setFormState('view');
                    } else {
                        console.error('❌ Delete failed:', result.message);
                        console.error('📋 Full error details:', {
                            code: result.code,
                            message: result.message,
                            data: result.data
                        });

                        // Show detailed error message
                        let errorMsg = result.message || 'Failed to delete bank';
                        if (result.code === '091') {
                            errorMsg += '\n\nThis bank record may be referenced in:\n- Transactions\n- Accounts\n- Other system records\n\nPlease check the database for dependent records.';
                        }

                        showStatus('❌ ' + errorMsg, 'error');
                        alert('Delete Failed\n\n' + errorMsg);
                    }
                } catch (error) {
                    console.error('❌ Delete error:', error);
                    showStatus('❌ Error deleting bank: ' + error.message, 'error');
                }
            }
        }

        async function handleSave() {
            if (currentSection === 'clearing-bank') {
                // Signatory save logic
                if (!validateSignatoryForm()) {
                    console.warn('⚠️ Signatory form validation failed');
                    return;
                }

                try {
                    console.log('💾 Saving signatory...');
                    showToast('Saving signatory...', { title: 'Saving', variant: 'info', timeoutMs: 2000 });

                    const formData = getSignatoryFormData();
                    console.log('📤 Signatory data to save:', JSON.stringify(formData, null, 2));

                    const result = await OtherStaticDataService.addEditBankSignatory(formData);
                    console.log('📥 Signatory save response:', JSON.stringify(result, null, 2));

                    const isSuccess = result.success === true || result.code === '00' || result.message === 'Success';

                    if (isSuccess) {
                        console.log('✅ Signatory saved successfully!');
                        isSignatoryFormDirty = false;

                        // Determine if this was an edit or add operation
                        const wasEditMode = currentMode === 'edit';
                        
                        // Show success messages only for edit mode
                        if (wasEditMode) {
                            alert('Data saved successfully!');
                            
                            showToast('Signatory record saved successfully! Form has been cleared.', {
                                title: 'Success',
                                variant: 'success',
                                timeoutMs: 4000
                            });
                        } else {
                            // For add mode, show a different message
                            showToast('Signatory record added successfully! Form has been cleared.', {
                                title: 'Record Added',
                                variant: 'info',
                                timeoutMs: 4000
                            });
                        }
                        
                        // Clear form completely
                        clearSignatoryForm();
                        currentSignatoryData = null;
                        currentMode = 'view';
                        
                        // Reset to initial view state: only VIEW and BACK enabled, Signatory ID active
                        setSignatoryFormState('view');
                        
                        console.log('✅ Signatory save complete. Form cleared. Only VIEW and BACK buttons active. Only Signatory ID field enabled.');
                    } else {
                        console.error('❌ Signatory save failed:', result.message);
                        showToast('Failed to save signatory: ' + (result.message || 'Unknown error'), {
                            title: 'Error',
                            variant: 'error',
                            timeoutMs: 4000
                        });
                        alert('Failed to save signatory: ' + (result.message || 'Unknown error'));
                    }
                } catch (error) {
                    console.error('❌ Signatory save error:', error);
                    showToast('Error saving signatory: ' + error.message, {
                        title: 'Error',
                        variant: 'error',
                        timeoutMs: 4000
                    });
                }
            } else if (currentSection === 'clearing-branches') {
                // Branch save logic
                if (!isBranchFormDirty && currentMode === 'edit') {
                    console.warn('⚠️ No changes detected in branch');
                    showStatus('⚠️ No changes to save', 'warning');
                    return;
                }

                if (!validateBranchForm()) {
                    console.warn('⚠️ Branch form validation failed');
                    return;
                }

                try {
                    console.log('💾 Saving branch...');
                    console.log('📋 Current Mode 1234:', currentMode);
                    showStatus('Saving branch...', 'info');

                    const formData = getBranchFormData();
                    console.log('📤 Branch data to save:', JSON.stringify(formData, null, 2));

                    const result = await OtherStaticDataService.addEditBranch(formData);
                    console.log('📥 Branch save response:', JSON.stringify(result, null, 2));

                    const isSuccess = result.success === true || result.code === '00' || result.message === 'Success';

                    if (isSuccess) {
                        console.log('✅ Branch saved successfully!');
                        isBranchFormDirty = false;

                        showStatus('✅ Branch record saved successfully!', 'success');
                        
                        // Show success toast notification
                        showToast('Branch record has been saved successfully!', {
                            title: 'Success',
                            variant: 'success',
                            timeoutMs: 4000
                        });
                        
                        console.log('✅ Branch save complete.');

                        // Clear form and reset to view mode
                        clearBranchForm();
                        currentBranchData = null;
                        currentMode = 'view';
                        setBranchFormState('view');
                    } else {
                        console.error('❌ Branch save failed:', result.message);
                        showStatus('❌ Failed to save branch: ' + (result.message || 'Unknown error'), 'error');
                        alert('Failed to save branch: ' + (result.message || 'Unknown error'));
                    }
                } catch (error) {
                    console.error('❌ Branch save error:', error);
                    showStatus('❌ Error saving branch: ' + error.message, 'error');
                }
            } else {
                // Bank save logic
                // Check if form has been modified
                if (!isFormDirty && currentMode === 'edit') {
                    console.warn('⚠️ No changes detected');
                    showStatus('⚠️ No changes to save', 'warning');
                    return;
                }

                if (!validateForm()) {
                    console.warn('⚠️ Form validation failed');
                    return;
                }

                try {
                    console.log('💾 Saving bank...');
                    console.log('📋 Current Mode:', currentMode);
                    showStatus('Saving bank...', 'info');

                    const formData = getFormData();
                    console.log('📤 Complete Form data to save:', JSON.stringify(formData, null, 2));

                    const result = await OtherStaticDataService.addEditBank(formData);
                    console.log('📥 Complete Save response:', JSON.stringify(result, null, 2));

                    // Check for success - handle multiple response formats
                    const isSuccess = result.success === true || result.code === '00' || result.message === 'Success';

                    console.log('✓ Is Success?', isSuccess);

                    if (isSuccess) {
                        console.log('✅ Bank saved successfully to database!');

                        // Reset dirty flag after successful save
                        isFormDirty = false;

                        // After save, reload the data to get updated timestamps and UpdateCount
                        const savedBankId = formData.BankID;
                        console.log('🔄 Reloading saved data for BankID:', savedBankId);

                        // Show success message
                        showStatus('✅ Bank record saved successfully!', 'success');

                        // Clear the form and reset state
                        clearForm();
                        currentBankData = null;
                        isFormDirty = false;

                        // After save, set to 'saved' state - only VIEW button active
                        currentMode = 'saved';
                        setFormState('saved');

                        // Show final success message
                        showToast('Bank record saved successfully! Form has been cleared.', {
                            title: 'Success',
                            variant: 'success',
                            timeoutMs: 3000
                        });
                        console.log('✅ Save complete. Form cleared. Only VIEW button is active.');
                    } else {
                        console.error('❌ Save failed:', result.message);
                        console.error('❌ Full error response:', result);

                        // Provide helpful message for common errors
                        let errorMessage = result.message || 'Failed to save bank';

                        if (errorMessage.includes('PRIMARY KEY constraint') && errorMessage.includes('PK_t_Bank')) {
                            const bankId = formData.BankID;

                            // Automatically load existing record and switch to edit mode
                            console.log('🔄 Bank ID already exists, loading existing record for editing...');
                            showStatus(`Bank ID "${bankId}" already exists. Loading existing record for editing...`, 'info');

                            // Clear the form first
                            clearForm();
                            currentBankData = null;
                            currentMode = 'view';
                            isFormDirty = false;

                            // Load the existing bank record
                            await loadBankData(bankId);

                            // Wait a moment for the data to load, then switch to edit mode
                            setTimeout(() => {
                                if (currentBankData && currentBankData.BankID === bankId) {
                                    currentMode = 'edit';
                                    isFormDirty = false; // Start clean, let user changes set the flag
                                    setFormState('edit');
                                    showStatus(`✅ Loaded existing Bank ID "${bankId}". Now in EDIT mode - modify the data and click SAVE.`, 'success');
                                    console.log('✅ Automatically switched to edit mode for existing bank');
                                }
                            }, 500);

                        } else if (errorMessage.includes('Bank Client not Unique')) {
                            const clientId = formData.ClientID;
                            errorMessage = `❌ The Client ID "${clientId}" is already associated with another bank.\n\n` +
                                `Solutions:\n` +
                                `• Clear the Client ID field and save without it\n` +
                                `• Use a different Client ID that isn't already assigned\n` +
                                `• Check which bank is using Client ID "${clientId}"`;

                            showStatus(errorMessage, 'error');
                            alert(errorMessage);
                        } else {
                            // Other errors - show generic error message
                            showStatus(errorMessage, 'error');
                            alert(errorMessage);
                        }
                    }
                } catch (error) {
                    console.error('❌ Save error:', error);
                    console.error('❌ Error stack:', error.stack);
                    showStatus('❌ Error saving bank: ' + error.message, 'error');
                }
            }
        }

        function handleCancel() {
            if (currentSection === 'clearing-bank') {
                clearSignatoryForm();
                currentSignatoryData = null;
                currentMode = 'view';
                isSignatoryFormDirty = false;
                showToast('Signatory form cleared', { title: 'Cancelled', variant: 'info', timeoutMs: 3000 });
                setSignatoryFormState('view');
            } else if (currentSection === 'clearing-branches') {
                clearBranchForm();
                currentBranchData = null;
                currentMode = 'view';
                isBranchFormDirty = false;
                showStatus('Branch form cleared', 'info');
                setBranchFormState('view');
            } else {
                clearForm();
                currentBankData = null;
                currentMode = 'view';
                isFormDirty = false;
                showStatus('Form cleared', 'info');
                setFormState('view');
            }
        }

        function handleBack() {
            if (currentSection === 'clearing-branches') {
                // Check if there are unsaved changes
                if (isBranchFormDirty) {
                    if (!confirm('You have unsaved changes in the branch form. Are you sure you want to go back?')) {
                        return;
                    }
                }

                // Navigate back to Bank Details section
                console.log('🔙 Back button clicked - returning to Bank Details from Clearing Branches');
                showBankDetailsSection();
                currentSection = 'bank-details';

                // Update active navigation item
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('active');
                    if (item.dataset.section === 'bank-details') {
                        item.classList.add('active');
                    }
                });

                showToast('Returned to Bank Details', { title: 'Navigation', variant: 'info', timeoutMs: 2000 });
            } else if (currentSection === 'clearing-bank') {
                // Check if there are unsaved changes in signatory form
                if (isSignatoryFormDirty) {
                    if (!confirm('You have unsaved changes in the signatory form. Are you sure you want to go back?')) {
                        return;
                    }
                }

                // Navigate back to Bank Details section
                console.log('🔙 Back button clicked - returning to Bank Details from Clearing Bank Signatories');
                showBankDetailsSection();
                currentSection = 'bank-details';

                // Update active navigation item
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('active');
                    if (item.dataset.section === 'bank-details') {
                        item.classList.add('active');
                    }
                });

                // Clear signatory form state
                clearSignatoryForm();
                currentSignatoryData = null;
                isSignatoryFormDirty = false;
                currentMode = 'view';

                showToast('Returned to Bank Details', { title: 'Navigation', variant: 'info', timeoutMs: 2000 });
            }
        }

        // Form State Management
        function setFormState(state) {
            currentMode = state;
            const form = document.getElementById('bankDetailsForm');
            const inputs = form.querySelectorAll('.form-control:not(.bts-input)');
            const checkboxes = form.querySelectorAll('.form-checkbox');
            const bankIdInput = document.getElementById('bankId');
            const bankNameInput = document.getElementById('bankName');

            // Get action buttons
            const btnView = document.getElementById('btnView');
            const btnAdd = document.getElementById('btnAdd');
            const btnEdit = document.getElementById('btnEdit');
            const btnDelete = document.getElementById('btnDelete');
            const btnSave = document.getElementById('btnSave');
            const btnCancel = document.getElementById('btnCancel');

            if (state === 'view') {
                // Initial view state - all fields disabled except BankID for search
                inputs.forEach(input => input.disabled = true);
                checkboxes.forEach(cb => cb.disabled = true);
                if (bankIdInput) bankIdInput.disabled = false;
                if (bankNameInput) bankNameInput.readOnly = true;

                // Button states: Only VIEW enabled, all others disabled
                if (btnView) btnView.disabled = false;
                if (btnAdd) btnAdd.disabled = true;
                if (btnEdit) btnEdit.disabled = true;
                if (btnDelete) btnDelete.disabled = true;
                if (btnSave) btnSave.disabled = true;
                if (btnCancel) btnCancel.disabled = true;
            } else if (state === 'viewed') {
                // After VIEW button loads data - EDIT, DELETE, CANCEL active (VIEW, ADD, SAVE disabled)
                inputs.forEach(input => input.disabled = true);
                checkboxes.forEach(cb => cb.disabled = true);
                if (bankIdInput) bankIdInput.disabled = true;
                if (bankNameInput) bankNameInput.readOnly = true;

                if (btnView) btnView.disabled = true;    // VIEW disabled
                if (btnAdd) btnAdd.disabled = true;      // ADD disabled
                if (btnEdit) btnEdit.disabled = false;   // EDIT enabled ✓
                if (btnDelete) btnDelete.disabled = false; // DELETE enabled ✓
                if (btnSave) btnSave.disabled = true;    // SAVE disabled
                if (btnCancel) btnCancel.disabled = false; // CANCEL enabled ✓
            } else if (state === 'saved') {
                // After successful SAVE - Only VIEW enabled, all others disabled
                inputs.forEach(input => input.disabled = true);
                checkboxes.forEach(cb => cb.disabled = true);
                if (bankIdInput) bankIdInput.disabled = false; // Allow searching for another bank
                if (bankNameInput) bankNameInput.readOnly = true;

                if (btnView) btnView.disabled = false;   // VIEW enabled ✓
                if (btnAdd) btnAdd.disabled = true;      // ADD disabled
                if (btnEdit) btnEdit.disabled = true;    // EDIT disabled
                if (btnDelete) btnDelete.disabled = true; // DELETE disabled
                if (btnSave) btnSave.disabled = true;    // SAVE disabled
                if (btnCancel) btnCancel.disabled = true; // CANCEL disabled
            } else if (state === 'edit') {
                // Edit mode - all fields enabled except BankID, only Save/Cancel buttons active
                inputs.forEach(input => input.disabled = false);
                checkboxes.forEach(cb => cb.disabled = false);
                if (bankIdInput) bankIdInput.disabled = true;
                if (bankNameInput) bankNameInput.readOnly = false; // Make Bank Name editable

                // Button states: Only Save and Cancel enabled (View/Add/Edit/Delete disabled)
                if (btnView) btnView.disabled = true;
                if (btnAdd) btnAdd.disabled = true;
                if (btnEdit) btnEdit.disabled = true;
                if (btnDelete) btnDelete.disabled = true;
                if (btnSave) btnSave.disabled = false;
                if (btnCancel) btnCancel.disabled = false;
            } else if (state === 'add') {
                // Add mode - all fields enabled
                inputs.forEach(input => input.disabled = false);
                checkboxes.forEach(cb => cb.disabled = false);
                if (bankNameInput) bankNameInput.readOnly = false; // Make Bank Name editable

                // Button states: Only Save and Cancel enabled
                if (btnView) btnView.disabled = true;
                if (btnAdd) btnAdd.disabled = true;
                if (btnEdit) btnEdit.disabled = true;
                if (btnDelete) btnDelete.disabled = true;
                if (btnSave) btnSave.disabled = false;
                if (btnCancel) btnCancel.disabled = false;
            }

            console.log('🎛️ Form state set to:', state);
        }

        function clearForm() {
            const form = document.getElementById('bankDetailsForm');
            form.reset();

            // Explicitly clear all input fields
            const inputs = form.querySelectorAll('.form-control:not(.bts-input)');
            inputs.forEach(input => {
                if (input.type === 'checkbox') {
                    input.checked = false;
                } else {
                    input.value = '';
                }
            });

            // Clear checkboxes explicitly
            const checkboxes = form.querySelectorAll('.form-checkbox');
            checkboxes.forEach(cb => cb.checked = false);

            // Clear Behind The Scene fields
            const btsInputs = form.querySelectorAll('.bts-input');
            btsInputs.forEach(input => input.value = '');

            console.log('✅ Form cleared completely');
        }

        function validateForm() {
            const bankId = document.getElementById('bankId').value.trim();
            const bankName = document.getElementById('bankName').value.trim();

            if (!bankId) {
                showStatus('Please enter Bank ID', 'error');
                document.getElementById('bankId').focus();
                return false;
            }

            if (!bankName) {
                showStatus('Please enter Bank Name', 'error');
                document.getElementById('bankName').focus();
                return false;
            }

            return true;
        }

        function validateBranchForm() {
            const branchId = document.getElementById('branchId').value.trim();
            const branchName = document.getElementById('branchName').value.trim();
            const city = document.getElementById('city').value.trim();
            const country = document.getElementById('country').value.trim();
            const phone1 = document.getElementById('phone1').value.trim();

            if (!branchId) {
                showStatus('Please enter Branch ID', 'error');
                document.getElementById('branchId').focus();
                return false;
            }

            if (!branchName) {
                showStatus('Please enter Branch Name', 'error');
                document.getElementById('branchName').focus();
                return false;
            }

            // REQUIRED FIELDS for editing: City, Country, Phone1
            if (!city) {
                showStatus('City is required before saving', 'error');
                showToast('Please select a City before saving', {
                    title: 'Validation Error',
                    variant: 'error',
                    timeoutMs: 4000
                });
                document.getElementById('city').focus();
                return false;
            }

            if (!country) {
                showStatus('Country is required before saving', 'error');
                showToast('Please select a Country before saving', {
                    title: 'Validation Error',
                    variant: 'error',
                    timeoutMs: 4000
                });
                document.getElementById('country').focus();
                return false;
            }

            if (!phone1) {
                showStatus('Phone 1 is required before saving', 'error');
                showToast('Please enter Phone 1 before saving', {
                    title: 'Validation Error',
                    variant: 'error',
                    timeoutMs: 4000
                });
                document.getElementById('phone1').focus();
                return false;
            }

            return true;
        }

        // Show Status Message
        function showStatus(message, type = 'info') {
            const statusMessage = document.getElementById('statusMessage');
            if (!statusMessage) return;

            const iconMap = {
                success: 'bi-check-circle-fill',
                error: 'bi-exclamation-circle-fill',
                warning: 'bi-exclamation-triangle-fill',
                info: 'bi-info-circle-fill'
            };

            statusMessage.className = `status ${type}`;
            statusMessage.querySelector('i').className = `bi ${iconMap[type]}`;
            statusMessage.querySelector('.status-text').textContent = message;
            statusMessage.classList.remove('hidden');

            // Auto-hide after 5 seconds
            setTimeout(hideStatus, 5000);
        }

        // Hide Status Message
        function hideStatus() {
            const statusMessage = document.getElementById('statusMessage');
            if (statusMessage) {
                statusMessage.classList.add('hidden');
            }
        }

    } catch (error) {
        console.error('❌ Fatal error in Maintain Banks module:', error);
        console.error('❌ Error stack:', error.stack);
        alert('Fatal Error: ' + error.message + '\n\nCheck console for details.');
    }
})();
