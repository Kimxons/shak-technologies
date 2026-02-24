// User Maintenance Module with Service Integration
(async function() {
    console.log('🔄 User Maintenance: Initializing...');
    
    let UserService, LookupService, ClientService;
    
    // Load required services with error handling
    try {
        const { ServiceLoader } = window;
        if (!ServiceLoader) {
            console.error('❌ ServiceLoader is not available. Check script loading order.');
            if (window.ToastMessages) {
                ToastMessages.error('Failed to load required services. Please refresh the page.');
            }
            // Don't return - continue with basic UI functionality
        } else {
            await ServiceLoader.loadCore();
            await ServiceLoader.loadUserService();
            await ServiceLoader.loadLookupService();
            await ServiceLoader.loadClientService();
            
            UserService = window.UserService;
            LookupService = window.LookupService;
            ClientService = window.ClientService;
            
            console.log('✅ Services loaded successfully');
        }
    } catch (error) {
        console.error('❌ Error loading services:', error);
        if (window.ToastMessages) {
            ToastMessages.error('Error loading services: ' + error.message);
        }
        // Continue anyway - UI should still work
    }
    
    // ═══════════════════════════════════════════════════════════════
    // CHILD FORM OVERLAY SYSTEM (matching account maintenance)
    // ═══════════════════════════════════════════════════════════════
    const CHILD_FORMS = {
        'copy-user': 'dataEntry/copy-user.html',
        'terminal-restrictions': 'dataEntry/terminal-restrictions.html',
        'time-restrictions': 'dataEntry/time-restrictions.html',
        'user-blocking-unblocking': 'dataEntry/user-blocking-unblocking.html',
        'user-role': 'dataEntry/user-role.html'
    };

    const THEME_VAR_KEYS = [
        // Core theme vars used by user-maintenance.css and DataEntry overlay
        '--copilot-bg-gradient',
        '--copilot-primary',
        '--copilot-primary-hover',
        '--copilot-text-main',
        '--copilot-text-muted',
        '--copilot-card-bg',
        '--kairo-border-color',
        '--kairo-font-family',
        '--kairo-font-size',
        // New form background overrides
        '--kairo-form-canvas-bg',
        '--kairo-form-surface-bg',
        '--kairo-form-actions-bg'
    ];

    function getOverlayEls() {
        return {
            overlay: document.querySelector('[data-child-overlay]'),
            iframe: document.querySelector('[data-child-iframe]')
        };
    }

    function copyThemeVarsToDocument(targetDoc) {
        if (!targetDoc || !targetDoc.documentElement) return;
        const computed = getComputedStyle(document.documentElement);
        THEME_VAR_KEYS.forEach((key) => {
            const value = computed.getPropertyValue(key);
            const trimmed = value === undefined || value === null ? '' : String(value).trim();
            if (trimmed) targetDoc.documentElement.style.setProperty(key, trimmed);
        });
    }

    function applyThemeVarsToChildIframe() {
        const { iframe } = getOverlayEls();
        if (!iframe) return;
        try {
            const doc = iframe.contentDocument;
            if (!doc) return;
            copyThemeVarsToDocument(doc);
        } catch {
            // ignore
        }
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
        iframe.onload = function () {
            applyThemeVarsToChildIframe();
        };
        iframe.src = path;
        setOverlayOpen(true);
    }

    function closeChildForm() {
        const { iframe } = getOverlayEls();
        if (iframe) {
            iframe.src = 'about:blank';
        }
        setOverlayOpen(false);
    }

    // ═══════════════════════════════════════════════════════════════
    // EXPOSE STATE GLOBALLY FOR CHILD WINDOWS (iframes)
    // ═══════════════════════════════════════════════════════════════
    window.currentUser = null;  // ⚠️ CRITICAL: Expose to child windows
    
    // Module state
    let currentUser = null;
    let isEditMode = false;
    let isViewing = false;
    let selectedUserIndex = -1;
    let userNotFound = false; // Track if search returned no user
    let isUserClosed = false; // Track if user is closed/expired
    let statusTimeout = null; // Track status message timeout

    // Initialize the module
    async function initializeUserMaintenance() {
        console.log('🔄 Initializing User Maintenance...');
        try {
            if (LookupService) {
                await populateDropdowns();
            }
            setupEventListeners();
            setupModalEventListeners();
            initializeFormState();
            setupMessageListeners();
            console.log('✅ User Maintenance initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing User Maintenance:', error);
        }
    }

    /**
     * Populate dropdowns from lookup service
     */
    async function populateDropdowns() {
        try {
            // Populate Title dropdown
            const titles = await LookupService.getTitles();
            const titleSelect = document.getElementById('title');
            titleSelect.innerHTML = '<option value="">--Select--</option>';
            titles.forEach(option => {
                titleSelect.innerHTML += `<option value="${option.value}">${option.label}</option>`;
            });

            // Populate Gender dropdown
            const genders = await LookupService.getGenders();
            const genderSelect = document.getElementById('gender');
            genderSelect.innerHTML = '<option value="">--Select--</option>';
            genders.forEach(option => {
                genderSelect.innerHTML += `<option value="${option.value}">${option.label}</option>`;
            });

            // Populate Country dropdown
            const countries = await LookupService.getCountries();
            const countrySelect = document.getElementById('country');
            countrySelect.innerHTML = '<option value="">--Select--</option>';
            countries.forEach(option => {
                countrySelect.innerHTML += `<option value="${option.value}">${option.label}</option>`;
            });

            // Populate City dropdown
            const cities = await LookupService.getCities();
            const citySelect = document.getElementById('city');
            citySelect.innerHTML = '<option value="">--Select--</option>';
            cities.forEach(option => {
                citySelect.innerHTML += `<option value="${option.value}">${option.label}</option>`;
            });

            // Populate Language dropdown
            const languages = await LookupService.getLanguages();
            const languageSelect = document.getElementById('languageId');
            languageSelect.innerHTML = '<option value="">--Select--</option>';
            languages.forEach(option => {
                languageSelect.innerHTML += `<option value="${option.value}">${option.label}</option>`;
            });
        } catch (error) {
            ToastMessages.warning('Failed to load dropdown options');
        }
    }

    /**
     * Set initial form state - only View button active
     */
    function initializeFormState() {
        isViewing = false;
        setEditMode(false);
        updateButtonStates();
    }

    /**
     * Setup message listeners for iframe communication
     */
    function setupMessageListeners() {
        window.addEventListener('message', (event) => {
            if (event.data?.type === 'CLIENT_SELECTED') {
                const clientId = event.data.clientId;
                const clientData = event.data.data;
                if (clientId) {
                    document.getElementById('userId').value = clientId;
                    // Close the modal
                    hideClientSearchModal();
                    // Fetch client details
                    fetchClientDetails(clientId);
                }
            }
            if (event.data?.type === 'USER_SELECTED') {
                const loginId = event.data.loginId;
                const userData = event.data.data;
                if (loginId) {
                    document.getElementById('loginId').value = loginId;
                    // Close the modal
                    hideUserSearchModal();
                    // Fetch user details
                    handleLoginSearch();
                }
            }
            // Also listen for kairo-dataentry-close to close the modal and overlay
            if (event.data?.type === 'kairo-dataentry-close') {
                hideClientSearchModal();
                hideUserSearchModal();
                closeChildForm();
            }
        });
    }

    function setupEventListeners() {
        const loginIdInput = document.getElementById('loginId');
        
        // Prevent form submission on Enter key
        document.getElementById('user-maintenance-form').addEventListener('submit', (e) => {
            e.preventDefault();
        });
        
        // Capitalize login ID and allow only alphanumeric characters
        loginIdInput.addEventListener('input', (e) => {
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            // Remove non-alphanumeric characters and convert to uppercase
            const cleaned = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
            e.target.value = cleaned;
            // Adjust cursor position after cleaning
            const newPos = start - (e.target.value.length - cleaned.length);
            e.target.setSelectionRange(newPos, newPos);
        });
        
        loginIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLoginSearch();
        });
        
        // Add blur event for Client ID field
        const userIdInput = document.getElementById('userId');
        userIdInput.addEventListener('blur', () => {
            const clientId = userIdInput.value.trim();
            if (clientId) {
                fetchClientDetails(clientId);
            }
        });
        
        // Add click event for search button next to Client ID
        const clientIdSearchButton = document.querySelector('.search-btn[data-target-input="userId"]');
        clientIdSearchButton?.addEventListener('click', (event) => {
            event.preventDefault();
            showClientSearchModal();
        });
        
        // Add click event for search button next to Login ID
        const loginIdSearchButton = document.querySelector('.search-btn[data-target-input="loginId"]');
        loginIdSearchButton?.addEventListener('click', (event) => {
            event.preventDefault();
            showUserSearchModal();
        });
        
        // Action buttons (matching account maintenance structure)
        document.querySelectorAll('.btn-action[data-mcs-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.mcsAction;
                switch(action) {
                    case 'view': handleView(); break;
                    case 'add': handleAdd(); break;
                    case 'edit': handleEdit(); break;
                    case 'delete': handleDelete(); break;
                    case 'save': handleSave(); break;
                    case 'cancel': handleCancel(); break;
                }
            });
        });

        // Navigation section toggle (expand/collapse data entry)
        document.querySelectorAll('.menu-arrow').forEach(arrow => {
            arrow.addEventListener('click', (e) => {
                const menuSection = e.currentTarget.closest('.menu-section');
                const menuItems = menuSection.querySelector('.menu-items');
                const isExpanded = e.currentTarget.getAttribute('aria-expanded') === 'true';
                
                if (isExpanded) {
                    menuItems.setAttribute('hidden', '');
                    e.currentTarget.setAttribute('aria-expanded', 'false');
                    e.currentTarget.querySelector('i').className = 'bi bi-chevron-down';
                } else {
                    menuItems.removeAttribute('hidden');
                    e.currentTarget.setAttribute('aria-expanded', 'true');
                    e.currentTarget.querySelector('i').className = 'bi bi-chevron-up';
                }
            });
        });

        // Card section toggle (expand/collapse form sections)
        document.querySelectorAll('.card-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const card = e.currentTarget.closest('.card');
                const cardBody = card.querySelector('.card-body');
                const isExpanded = e.currentTarget.getAttribute('aria-expanded') === 'true';
                
                if (isExpanded) {
                    cardBody.setAttribute('hidden', '');
                    e.currentTarget.setAttribute('aria-expanded', 'false');
                    e.currentTarget.querySelector('i').className = 'bi bi-chevron-down';
                } else {
                    cardBody.removeAttribute('hidden');
                    e.currentTarget.setAttribute('aria-expanded', 'true');
                    e.currentTarget.querySelector('i').className = 'bi bi-chevron-up';
                }
            });
        });

        // Child form overlay buttons (data entry forms)
        document.querySelectorAll('[data-child-form]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const childKey = e.currentTarget.dataset.childForm;
                if (childKey && CHILD_FORMS[childKey]) {
                    openChildForm(childKey);
                }
            });
        });

        // Close overlay when clicking outside or on close buttons
        const overlay = document.querySelector('[data-child-overlay]');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeChildForm();
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.altKey) {
                switch(e.key.toUpperCase()) {
                    case 'V': handleView(); break;
                    case 'A': handleAdd(); break;
                    case 'E': handleEdit(); break;
                    case 'D': handleDelete(); break;
                    case 'S': handleSave(); break;
                    case 'C': handleCancel(); break;
                }
            }
            // Close overlay with Escape key
            if (e.key === 'Escape') {
                const { overlay } = getOverlayEls();
                if (overlay && overlay.classList.contains('is-open')) {
                    closeChildForm();
                }
            }
        });
    }

    /**
     * Show the client search modal
     */
    function showClientSearchModal() {
        const modal = document.getElementById('userMaintenanceClientSearchModal');
        const frame = document.getElementById('userMaintenanceClientSearchFrame');
        if (modal) {
            modal.style.display = 'flex';
        }
        if (frame) {
            frame.src = '../../../modules/common/searchDialogs/client-search/client-search.html';
        }
    }

    /**
     * Hide the client search modal
     */
    function hideClientSearchModal() {
        const modal = document.getElementById('userMaintenanceClientSearchModal');
        const frame = document.getElementById('userMaintenanceClientSearchFrame');
        if (modal) {
            modal.style.display = 'none';
        }
        if (frame) {
            frame.src = 'about:blank';
        }
    }

    /**
     * Show the user search modal
     */
    function showUserSearchModal() {
        const modal = document.getElementById('userMaintenanceUserSearchModal');
        const frame = document.getElementById('userMaintenanceUserSearchFrame');
        if (modal) {
            modal.style.display = 'flex';
        }
        if (frame) {
            frame.src = '../../../modules/common/searchDialogs/user-search/user-search.html';
        }
    }

    /**
     * Hide the user search modal
     */
    function hideUserSearchModal() {
        const modal = document.getElementById('userMaintenanceUserSearchModal');
        const frame = document.getElementById('userMaintenanceUserSearchFrame');
        if (modal) {
            modal.style.display = 'none';
        }
        if (frame) {
            frame.src = 'about:blank';
        }
    }

    /**
     * Fetch client details using ClientService.getClient
     * @param {string} clientId - The client ID to fetch
     */
    async function fetchClientDetails(clientId) {
        try {
            const operatorId = window.Environment?.operatorId || 'CSADM';
            const branchId = window.Environment?.branchId || '0101';
            
            const requestData = {
                ClientID: clientId,
                OurBranchID: '0101',
                OperatorID: 'CSADM',
                Direction: 0
            };
            
            const response = await ClientService.getClient(requestData);
            
            if (response.success && response.data) {
                // Check if client data exists
                const hasClientData = response.data.Details01?.length > 0 || response.data.Details02?.length > 0;
                
                if (hasClientData) {
                    // Extract client data from Details01 and Details02
                    const clientData = response.data.Details01?.[0];
                    const personalData = response.data.Details02?.[0];
                    
                    if (clientData) {
                        // Populate fields from Details01
                        document.getElementById('fullName').value = clientData.Name || '';
                        document.getElementById('address').value = clientData.Address1 || '';
                        document.getElementById('city').value = clientData.CityID || '';
                        document.getElementById('country').value = clientData.CountryID || '';
                        document.getElementById('phone').value = clientData.Phone1 || '';
                        document.getElementById('mobile').value = clientData.Mobile || '';
                        document.getElementById('email').value = clientData.Email || '';
                    }
                    
                    if (personalData) {
                        // Populate fields from Details02
                        document.getElementById('title').value = personalData.TitleID || '';
                        document.getElementById('gender').value = personalData.GenderID || '';
                        
                        // Format date for date input
                        if (personalData.DateOfBirth) {
                            const date = new Date(personalData.DateOfBirth);
                            const formattedDate = date.toISOString().split('T')[0];
                            document.getElementById('dateOfBirth').value = formattedDate;
                        }
                    }
                    
                    showStatus(`Client details loaded for ${clientId}`, 'success');
                } else {
                    showStatus(`Client ${clientId} not found`, 'error');
                }
            } else {
                showStatus(`Client ${clientId} not found`, 'error');
            }
        } catch (error) {
            showStatus(`Error fetching client ${clientId}: ${error.message}`, 'error');
        }
    }

    /**
     * Fetch user from API using loginId (OperatorID)
     */
    async function handleLoginSearch() {
        const loginId = document.getElementById('loginId').value.trim();
        
        if (!loginId) {
            ToastMessages.error('Please enter a Login ID to search');
            return;
        }

        try {
            ToastMessages.info('Fetching user data...');
            // Call UserService with appropriate parameters
            const result = await UserService.getUsers({
                LoginOperatorID: loginId,
                OurBranchID: "0603", // TODO: Get from session/context
                RequireOperatorID: loginId,
                Direction: 0 // 0 for exact match, could be 1 for next, -1 for previous
            });

            if (result.success && result.data) {

                // Check if Details01 and Details02 are empty (no user found)
                const hasUserData = result.data.Details01?.length > 0 || result.data.Details02?.length > 0;
                
                if (!hasUserData) {
                    // Empty response - no user found
                    ToastMessages.error(`User '${loginId}' not found, Click 'Add' to create a new user`);
                    clearFormFields(true); // Preserve login ID for Add action
                    currentUser = null;
                    window.currentUser = null;  // ⚠️ SYNC
                    userNotFound = true;
                    updateButtonStates();
                    return;
                }

                currentUser = result.data;
                // Flatten user data for child forms
                const operatorData = result.data.Details02?.[0] || {};
                const personalData = result.data.Details01?.[0] || {};
                window.currentUser = {
                    ...result.data,
                    OperatorID: operatorData.OperatorID,
                    BranchID: operatorData.OurBranchID,
                    OurBranchID: operatorData.OurBranchID,
                    BankID: operatorData.BankID || "00"
                };  // ⚠️ SYNC
                userNotFound = false;
                populateForm(result.data);
                setEditMode(false);
                isViewing = true;
                
                // Check if user is closed and show appropriate message
                if (operatorData.ClosedDate || personalData.ClosedDate) {
                    ToastMessages.warning(`User '${loginId}' has already been closed`);
                } else {
                    ToastMessages.info(`Viewing user data`);
                }
            } else {
                ToastMessages.error(result.message || `User '${loginId}' not found`);
                clearFormFields(true); // Preserve login ID for Add action
                currentUser = null;
                window.currentUser = null;  // ⚠️ SYNC
                userNotFound = true; // Set flag to activate Add button
                // No user found, activate Add button
                updateButtonStates();
            }
        } catch (error) {
            ToastMessages.error('Failed to fetch user data. Please try again.');
            clearFormFields();
            currentUser = null;
            window.currentUser = null;  // ⚠️ SYNC
        }
    }

    function handleUserIdSearch() {
        const userId = document.getElementById('userId').value.trim();
        
        if (!userId) {
            ToastMessages.error('Please enter a User ID to search');
            return;
        }
        
        // For now, use loginId field to search
        document.getElementById('loginId').value = userId;
        handleLoginSearch();
    }

    /**
     * Map API response to form fields
     * Response structure: { Details, Details01 (personal), Details02 (operator) }
     */
    function populateForm(userData) {
        // Extract data from nested arrays
        const personalData = userData.Details01?.[0] || {};
        const operatorData = userData.Details02?.[0] || {};
        
        // Helper function to format date for input[type="date"]
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            try {
                const date = new Date(dateStr);
                return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
            } catch {
                return '';
            }
        };
        
        // Helper function to format datetime for display
        const formatDateTime = (dateStr) => {
            if (!dateStr) return '';
            try {
                const date = new Date(dateStr);
                return date.toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch {
                return dateStr;
            }
        };
        
        // Login Details
        document.getElementById('loginId').value = operatorData.OperatorID || '';
        
        // Personal Details
        document.getElementById('userId').value = operatorData.ClientID || '';
        document.getElementById('title').value = personalData.TitleID || '';
        document.getElementById('employeeId').value = operatorData.EmployeeID || '';
        document.getElementById('fullName').value = personalData.Name || '';
        document.getElementById('address').value = personalData.Address1 || '';
        document.getElementById('city').value = personalData.CityID || '';
        document.getElementById('country').value = personalData.CountryID || '';
        document.getElementById('phone').value = personalData.Phone1 || '';
        document.getElementById('mobile').value = personalData.Mobile || '';
        document.getElementById('email').value = personalData.Email || '';
        document.getElementById('gender').value = personalData.GenderID || '';
        document.getElementById('dateOfBirth').value = formatDate(personalData.DateOfBirth);
        document.getElementById('languageId').value = operatorData.LanguageID || '';
        
        // Advanced Settings
        document.getElementById('cannotChangePassword').checked = operatorData.CanNotChangePassword || false;
        document.getElementById('mustChangeNextLogin').checked = operatorData.ChangePasswordAtNextLogon || false;
        document.getElementById('allowPopupAlerts').checked = operatorData.ShowTips || false;
        
        // Account Status based on lock/disabled status
        let status = '';
        if (personalData.IsLocked) {
            status = 'locked';
        } else if (personalData.IsLoginDisabled) {
            status = 'inactive';
        } else if (operatorData.ClosedDate || personalData.ClosedDate) {
            status = 'expired';
        } else {
            status = 'active';
        }
        document.getElementById('accountStatus').value = status;
        
        // Check if user is closed and apply closed state styling
        isUserClosed = !!(operatorData.ClosedDate || personalData.ClosedDate);
        applyClosedUserStyling(isUserClosed);
        
        document.getElementById('lockReason').value = personalData.BlockedReason || '';
        document.getElementById('remarks').value = operatorData.Remarks || '';
        
        // Behind The Scene
        document.getElementById('createdBy').value = operatorData.CreatedBy || '';
        document.getElementById('createdOn').value = formatDateTime(operatorData.CreatedOn);
        document.getElementById('modifiedBy').value = operatorData.ModifiedBy || '-';
        document.getElementById('modifiedOn').value = formatDateTime(operatorData.ModifiedOn);
        document.getElementById('supervisedBy').value = operatorData.SupervisedBy || '-';
        document.getElementById('supervisedOn').value = formatDateTime(operatorData.SupervisedOn);
    }

    /**
     * Apply visual styling for closed/expired users
     * @param {boolean} isClosed - Whether the user is closed
     */
    function applyClosedUserStyling(isClosed) {
        const form = document.getElementById('userMaintenanceForm');
        const content = document.querySelector('.content');
        
        if (isClosed) {
            // Add closed user class to form and content
            form?.classList.add('user-closed');
            content?.classList.add('user-closed-state');
            
            // Add closed badge/banner if not exists
            let closedBanner = document.getElementById('closedUserBanner');
            if (!closedBanner) {
                closedBanner = document.createElement('div');
                closedBanner.id = 'closedUserBanner';
                closedBanner.className = 'closed-user-banner';
                closedBanner.innerHTML = `
                    <i class="bi bi-x-circle-fill"></i>
                    <span>This user account has been closed</span>
                `;
                content?.insertBefore(closedBanner, content.firstChild);
            }
            closedBanner.style.display = 'flex';
            
            // Make ALL form fields readonly/disabled for closed accounts
            const allInputs = form.querySelectorAll('input, select, textarea');
            allInputs.forEach(el => {
                if (el.type === 'checkbox' || el.type === 'radio') {
                    el.disabled = true;
                } else {
                    el.readOnly = true;
                }
                // Apply disabled styling
                el.style.backgroundColor = '#f5f5f5';
                el.style.cursor = 'not-allowed';
                if (el.type === 'checkbox') {
                    el.style.opacity = '0.5';
                }
            });
        } else {
            // Remove closed user styling
            form?.classList.remove('user-closed');
            content?.classList.remove('user-closed-state');
            
            // Hide closed banner
            const closedBanner = document.getElementById('closedUserBanner');
            if (closedBanner) {
                closedBanner.style.display = 'none';
            }
            
            // Re-enable fields based on current edit mode
            setEditMode(isEditMode);
        }
        
        // Update button states
        updateButtonStates();
    }

    function clearFormFields(preserveLoginId = false) {
        const loginIdValue = preserveLoginId ? document.getElementById('loginId').value : '';
        
        document.getElementById('loginId').value = loginIdValue;
        document.getElementById('password').value = '';
        document.getElementById('confirmPassword').value = '';
        document.getElementById('employeeId').value = '';
        document.getElementById('languageId').value = '';
        document.getElementById('userId').value = '';
        document.getElementById('employeeId').value = '';
        document.getElementById('fullName').value = '';
        document.getElementById('title').value = '';
        document.getElementById('address').value = '';
        document.getElementById('city').value = '';
        document.getElementById('country').value = '';
        document.getElementById('phone').value = '';
        document.getElementById('mobile').value = '';
        document.getElementById('email').value = '';
        document.getElementById('gender').value = '';
        document.getElementById('dateOfBirth').value = '';
        document.getElementById('cannotChangePassword').checked = false;
        document.getElementById('mustChangeNextLogin').checked = false;
        document.getElementById('allowPopupAlerts').checked = false;
        document.getElementById('accountStatus').value = '';
        document.getElementById('lockReason').value = '';
        document.getElementById('remarks').value = '';
        document.getElementById('createdBy').value = '';
        document.getElementById('createdOn').value = '';
        document.getElementById('modifiedBy').value = '';
        document.getElementById('modifiedOn').value = '';
        document.getElementById('supervisedBy').value = '';
        document.getElementById('supervisedOn').value = '';
        currentUser = null;
        window.currentUser = null;  // ⚠️ SYNC
        selectedUserIndex = -1;
        
        // Reset closed user state and styling
        isUserClosed = false;
        isViewing = false;
        applyClosedUserStyling(false);
    }

    async function handleView() {
        if (!currentUser) {
            const loginId = document.getElementById('loginId').value.trim();
            if (!loginId) {
                ToastMessages.error('Please enter a Login ID to view');
                return;
            }
            // Try to fetch the user
            await handleLoginSearch();
            return;
        }
        
        setEditMode(false);
        isViewing = true;
        populateForm(currentUser);
        ToastMessages.info(`Viewing user data`);
    }

    function handleAdd() {
        const loginIdValue = document.getElementById('loginId').value.trim();
        clearFormFields(!!loginIdValue); // Preserve login ID if it exists
        setEditMode(true);
        
        // Focus on login ID if empty, otherwise focus on full name
        if (loginIdValue) {
            document.getElementById('fullName').focus();
        } else {
            document.getElementById('loginId').focus();
        }
        ToastMessages.info('Ready to add new user');
    }

    function handleEdit() {
        if (!currentUser) {
            ToastMessages.error('Please select a user first');
            return;
        }
        
        if (isEditMode) {
            ToastMessages.warning('Already in edit mode');
            return;
        }
        
        setEditMode(true);
        isViewing = false;
        document.getElementById('fullName').focus();
        ToastMessages.warning(`Editing user data`);
    }

    async function handleSave() {
        const loginId = document.getElementById('loginId').value.trim();
        const employeeId = document.getElementById('employeeId').value.trim();
        const userId = document.getElementById('userId').value.trim();
        const password = document.getElementById('password').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();
        const languageId = document.getElementById('languageId').value;
        const remarks = document.getElementById('remarks').value.trim();
        const email = document.getElementById('email').value.trim();
        
        // Validation - Mandatory fields only (Login ID, Employee ID, Password, Language, Remarks)
        if (!loginId) {
            ToastMessages.error('Login ID is required');
            document.getElementById('loginId').focus();
            return;
        }
        if (!employeeId) {
            ToastMessages.error('Employee ID is required');
            document.getElementById('employeeId').focus();
            return;
        }
        if (!password && !currentUser) {
            ToastMessages.error('Password is required for new users');
            document.getElementById('password').focus();
            return;
        }
        if (password && password !== confirmPassword) {
            ToastMessages.error('Password and Confirm Password do not match');
            document.getElementById('confirmPassword').focus();
            return;
        }
        if (!languageId) {
            ToastMessages.error('Language is required');
            document.getElementById('languageId').focus();
            return;
        }
        if (!remarks) {
            ToastMessages.error('Remarks is required');
            document.getElementById('remarks').focus();
            return;
        }
        if (email && !isValidEmail(email)) {
            ToastMessages.error('Invalid email format');
            document.getElementById('email').focus();
            return;
        }
        
        try {
            ToastMessages.info('Saving user data...');
            
            // Prepare request data - only essential login and client fields
            const requestData = {
                OperatorID: loginId,
                EmployeeID: employeeId,
                Password: password || null,
                ClientID: userId || null,
                LanguageID: languageId,
                CanNotChangePassword: document.getElementById('cannotChangePassword').checked ? 1 : 0,
                IsSuperUser: 0, // Default to non-super user
                ChangePasswordAtNextLogon: document.getElementById('mustChangeNextLogin').checked ? 1 : 0,
                IsLocked: document.getElementById('accountStatus').value === 'locked' ? 1 : 0,
                IsBiometric: 0, // Default to non-biometric
                Remarks: document.getElementById('remarks').value.trim() || null,
                ShowTips: document.getElementById('allowPopupAlerts').checked ? 1 : 0,
                CreatedBy: currentUser ? (currentUser.Details02?.[0]?.CreatedBy || 'CSADM') : 'CSADM',
                CreatedOn: currentUser ? (currentUser.Details02?.[0]?.CreatedOn || new Date().toISOString()) : new Date().toISOString(),
                ModifiedBy: 'CSADM  ', // Current operator
                ModifiedOn: new Date().toISOString(),
                SupervisedBy: null,
                NewRecord: currentUser ? (currentUser.Details02?.[0]?.UpdateCount || 0) : 1, // 2 for add, UpdateCount for edit
            };
            
            const result = await UserService.addEditUser(requestData);
            
            if (result.success) {
                ToastMessages.success(`User ${currentUser ? 'updated' : 'created'} successfully`);
                // Reset form to initial state
                clearFormFields(false);
                setEditMode(false);
                currentUser = null;
                window.currentUser = null;
                userNotFound = false;
                isUserClosed = false;
            } else {
                // Show error with details if present
                const errorMsg = result.message || 'Failed to save user';
                const details = result.Details || result.data;
                if (details && (details.Status || details.Message)) {
                    ToastMessages.error(`${errorMsg}\n[${details.Status || ''}] ${details.Message || ''}`);
                } else {
                    ToastMessages.error(errorMsg);
                }
            }
        } catch (error) {
            ToastMessages.error('Failed to save user data. Please try again.');
        }
    }

    function handleCancel() {
        clearFormFields(false); // Clear all fields
        setEditMode(false);
        currentUser = null;
        window.currentUser = null;
        userNotFound = false;
        isUserClosed = false;
        ToastMessages.info('Form reset to initial state');
    }

    function handleDelete() {
        if (!currentUser) {
            ToastMessages.error('Please select a user first');
            return;
        }
        // Show confirmation dialog first
        showCloseUserConfirmModal();
    }

    // Show the close user confirmation modal
    function showCloseUserConfirmModal() {
        const modal = document.getElementById('closeUserConfirmModal');
        if (!modal) return;
        modal.style.display = 'flex';
    }

    // Hide the close user confirmation modal
    function hideCloseUserConfirmModal() {
        const modal = document.getElementById('closeUserConfirmModal');
        if (!modal) return;
        modal.style.display = 'none';
    }

    // Show the close user modal
    function showCloseUserModal() {
        const modal = document.getElementById('closeUserModal');
        if (!modal) return;
        document.getElementById('closeReasonDropdown').value = '';
        document.getElementById('closeReasonText').value = '';
        modal.style.display = 'flex';
    }

    // Hide the close user modal
    function hideCloseUserModal() {
        const modal = document.getElementById('closeUserModal');
        if (!modal) return;
        modal.style.display = 'none';
    }

    // Setup modal event listeners
    function setupModalEventListeners() {
        // Close Reason Modal
        const closeBtn = document.getElementById('closeUserModalCloseBtn');
        const cancelBtn = document.getElementById('closeUserModalCancelBtn');
        const okBtn = document.getElementById('closeUserModalOkBtn');
        if (closeBtn) closeBtn.addEventListener('click', () => {            hideCloseUserModal();
        });
        if (cancelBtn) cancelBtn.addEventListener('click', () => {
            hideCloseUserModal();
        });
        if (okBtn) okBtn.addEventListener('click', () => {
            handleCloseUserOk();
        });

        // Close User Confirmation Modal
        const confirmCloseBtn = document.getElementById('closeUserConfirmModalCloseBtn');
        const confirmCancelBtn = document.getElementById('closeUserConfirmModalCancelBtn');
        const confirmYesBtn = document.getElementById('closeUserConfirmModalYesBtn');
        if (confirmCloseBtn) confirmCloseBtn.addEventListener('click', () => {
            hideCloseUserConfirmModal();
        });
        if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', () => {
             hideCloseUserConfirmModal();
        });
        if (confirmYesBtn) confirmYesBtn.addEventListener('click', () => {
            hideCloseUserConfirmModal();
            showCloseUserModal();
        });

        // Client Search Modal
        const clientSearchCloseBtn = document.getElementById('userMaintenanceClientSearchModalCloseBtn');
        if (clientSearchCloseBtn) clientSearchCloseBtn.addEventListener('click', () => {
            hideClientSearchModal();
        });

        // User Search Modal
        const userSearchCloseBtn = document.getElementById('userMaintenanceUserSearchModalCloseBtn');
        if (userSearchCloseBtn) userSearchCloseBtn.addEventListener('click', () => {
            hideUserSearchModal();
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        setupModalEventListeners();
    });

    // Handle OK in close user modal
    async function handleCloseUserOk() {
        const closeReasonId = document.getElementById('closeReasonDropdown').value;
        const closeReasonText = document.getElementById('closeReasonText').value.trim();
        if (!closeReasonId) {
            ToastMessages.error('Please select a close reason');
            return;
        }
        if (!closeReasonText) {
            ToastMessages.error('Please enter a reason');
            return;
        }
        const operatorId = document.getElementById('loginId').value.trim();
        const currentOperator = window.Environment?.operatorId || 'CSADM';
        
        // Map dropdown value to ClosedReasonID code (single character)
        let closeReasonCode = '';
        if (closeReasonId === 'superannuation') closeReasonCode = 'S';
        else if (closeReasonId === 'resigned') closeReasonCode = 'R';
        else if (closeReasonId === 'terminated') closeReasonCode = 'T';
        
        // Format date as 'YYYY-MM-DD 00:00:00'
        const today = new Date();
        const closedDate = today.toISOString().split('T')[0] + ' 00:00:00';
    
        // Prepare request body matching p_CloseUser procedure
        const requestData = {
            OperatorID: operatorId,           // User being closed
            ClosedBy: currentOperator,        // Operator performing the close
            ClosedDate: closedDate,           // Date with time as 00:00:00
            ClosedReasonID: closeReasonCode,  // Single character code (S, R, T)
            ClosedReason: closeReasonText,    // Free text reason
            SupervisedBy: null,               // NULL as per proc
            NewRecord: currentUser?.Details02?.[0]?.UpdateCount || 0  // Use UpdateCount for optimistic locking
        };
        try {
            ToastMessages.info('Closing user...');
            const result = await UserService.closeUser(requestData);
            if (result.success) {
                hideCloseUserModal();
                // Clear form and reset state after close
                clearFormFields();
                setEditMode(false);
                userNotFound = false;
                updateButtonStates();
                ToastMessages.success('User closed successfully');
            } else {
                const errorMsg = result.message || 'Failed to close user';
                const details = result.Details || result.data;
                if (details && (details.Status || details.Message)) {
                    ToastMessages.error(`${errorMsg}\n[${details.Status || ''}] ${details.Message || ''}`);
                } else {
                    ToastMessages.error(errorMsg);
                }
            }
        } catch (error) {
            ToastMessages.error('Failed to close user. Please try again.');
        }
    }



    function setEditMode(enabled) {
        isEditMode = enabled;
        
        // If user is closed, keep all fields readonly regardless of edit mode
        if (isUserClosed) {
            const allInputs = document.querySelectorAll('#userMaintenanceForm input, #userMaintenanceForm select, #userMaintenanceForm textarea');
            allInputs.forEach(el => {
                if (el.type === 'checkbox' || el.type === 'radio') {
                    el.disabled = true;
                } else {
                    el.readOnly = true;
                }
                el.style.backgroundColor = '#f5f5f5';
                el.style.cursor = 'not-allowed';
                if (el.type === 'checkbox') {
                    el.style.opacity = '0.5';
                }
            });
            updateButtonStates();
            return;
        }
        
        // Personal details fields should not be editable in add/edit modes
        let editableFields;
        if (enabled && currentUser) {
            // Edit mode: allow password, employeeId, languageId, password options, remarks
            editableFields = [
                'password', 'confirmPassword', 'employeeId', 'languageId',
                'cannotChangePassword', 'mustChangeNextLogin', 'allowPopupAlerts',
                'accountStatus', 'lockReason', 'remarks'
            ];
        } else {
            // Add mode: allow login and advanced settings, but not personal details
            editableFields = [
                'password', 'confirmPassword', 'employeeId', 'languageId',
                'cannotChangePassword', 'mustChangeNextLogin', 'allowPopupAlerts',
                'accountStatus', 'lockReason', 'remarks'
            ];
        }

        // Set editable fields
        const allFields = [
            'userId', 'password', 'confirmPassword', 'employeeId', 'languageId',
            'fullName', 'title', 'address', 'city', 'country', 'phone', 'mobile',
            'email', 'gender', 'dateOfBirth', 'cannotChangePassword',
            'mustChangeNextLogin', 'allowPopupAlerts', 'accountStatus',
            'lockReason', 'remarks'
        ];
        allFields.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (editableFields.includes(id)) {
                    element.disabled = false;
                    if (element.type !== 'checkbox') {
                        element.style.backgroundColor = '#fff';
                        element.style.cursor = 'auto';
                    } else {
                        element.style.opacity = '1';
                        element.style.cursor = 'pointer';
                    }
                } else {
                    element.disabled = true;
                    if (element.type !== 'checkbox') {
                        element.style.backgroundColor = '#f5f5f5';
                        element.style.cursor = 'not-allowed';
                    } else {
                        element.style.opacity = '0.5';
                        element.style.cursor = 'not-allowed';
                    }
                }
            }
        });

        // Login ID should always be enabled for search/view purposes
        const loginIdElement = document.getElementById('loginId');
        if (loginIdElement) {
            loginIdElement.disabled = false;
            loginIdElement.style.backgroundColor = '#fff';
            loginIdElement.style.cursor = 'auto';
        }

        // Ensure Behind The Scene fields always remain readonly
        const readonlyFields = ['createdBy', 'createdOn', 'modifiedBy', 'modifiedOn', 'supervisedBy', 'supervisedOn'];
        readonlyFields.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.disabled = false;
                element.readOnly = true;
                element.style.backgroundColor = '#f5f5f5';
                element.style.cursor = 'not-allowed';
            }
        });

        // Client search should only be available during adding (not editing)
        const clientIdSearchButton = document.querySelector('.search-btn[data-target-input="userId"]');
        if (clientIdSearchButton) {
            clientIdSearchButton.disabled = !(enabled && !currentUser);
            clientIdSearchButton.style.opacity = (enabled && !currentUser) ? '1' : '0.5';
        }

        updateButtonStates();
    }

    function updateButtonStates() {
        const buttons = document.querySelectorAll('.btn-action');
        buttons.forEach(btn => {
            const action = btn.dataset.mcsAction;
            if (isUserClosed) {
                // User is closed: only Cancel is active
                btn.style.opacity = (action === 'cancel') ? '1' : '0.5';
                btn.disabled = !(action === 'cancel');
            } else if (isEditMode) {
                // In edit mode: only Save and Cancel are active
                btn.style.opacity = (action === 'save' || action === 'cancel') ? '1' : '0.5';
                btn.disabled = !(action === 'save' || action === 'cancel');
            } else if (currentUser) {
                // User is loaded (viewing): Edit, Delete, and Cancel are active
                btn.style.opacity = (action === 'edit' || action === 'delete' || action === 'cancel') ? '1' : '0.5';
                btn.disabled = !(action === 'edit' || action === 'delete' || action === 'cancel');
            } else if (userNotFound) {
                // User not found after search: View, Add are active, Cancel is inactive
                btn.style.opacity = (action === 'view' || action === 'add') ? '1' : '0.5';
                btn.disabled = !(action === 'view' || action === 'add');
            } else {
                // Initial state: only View is active
                btn.style.opacity = (action === 'view') ? '1' : '0.5';
                btn.disabled = !(action === 'view');
            }
        });
    }

    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Initialize when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeUserMaintenance);
    } else {
        initializeUserMaintenance();
    }

    // Expose refreshForm to parent window for dashboard refresh button
    window.refreshForm = function() {
        clearFormFields(false);
        setEditMode(false);
        currentUser = null;
        window.currentUser = null;
        userNotFound = false;
        isUserClosed = false;
        updateButtonStates();
        ToastMessages.info('Form refreshed to initial state');
    };

})();