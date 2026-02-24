// Branch Settings - JavaScript for form interaction
(function () {
    'use strict';

    const APP_NAME = 'PROJECT_KAIRO';
    const FORM_IDS = {
        GET: 'dbo.p_GetSystemBranchSettings',
        EDIT: 'dbo.p_EditSystemBranchSettings'
    };

    let lastLoadedRecord = null;

    // ============================================================================
    // SUCCESS MESSAGE FUNCTIONS
    // ============================================================================
    function showSuccessMessage(message) {
        const banner = document.querySelector('.validation-summary');
        if (!banner) return;
        
        const textEl = banner.querySelector('.validation-summary__text');
        if (textEl) textEl.textContent = message;
        
        // Show the banner
        banner.style.display = 'flex';
        banner.style.alignItems = 'center';
        banner.classList.add('is-visible', 'validation-summary--success');
        
        // Setup close button
        const closeBtn = banner.querySelector('.validation-summary__close');
        if (closeBtn) {
            closeBtn.onclick = () => hideValidationSummary();
        }
        
        // Auto-hide after 5 seconds
        setTimeout(() => hideValidationSummary(), 5000);
    }
    
    function hideValidationSummary() {
        const banner = document.querySelector('.validation-summary');
        if (banner) {
            banner.style.display = 'none';
            banner.classList.remove('is-visible', 'validation-summary--success');
        }
    }

    // Initialize on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', function () {
        initializeNavigation();
        initializeForm();
        initializeDataEntryToggle(); // Added this line
        setupEventListeners();
        setupIframeMessaging();
        loadBranchSettings();
        setupCollapsibles();
    });

    /**
     * Initialize Data Entry navigation toggle
     */
    function initializeDataEntryToggle() {
        const navToggle = document.querySelector('.nav-toggle[data-current-section="dataentry"]');
        const navArrow = navToggle?.querySelector('.nav-arrow');
        const navSection = document.querySelector('[data-nav-section][data-section-name="Data Entry"]');
        
        if (!navToggle || !navSection) return;
        
        // Get the buttons container
        const buttonsContainer = navSection.querySelector('.nav-items') || navSection.querySelector('[style="display: flex;"]');
        
        if (!buttonsContainer) return;
        
        // Initialize state
        let isExpanded = true;
        
        // Function to update toggle state
        const updateToggleState = () => {
            if (isExpanded) {
                // Show the buttons
                buttonsContainer.style.display = 'flex';
                navToggle.setAttribute('aria-expanded', 'true');
                if (navArrow) {
                    navArrow.setAttribute('aria-expanded', 'true');
                    const icon = navArrow.querySelector('i');
                    if (icon) {
                        icon.classList.remove('bi-chevron-right');
                        icon.classList.add('bi-chevron-down');
                    }
                }
            } else {
                // Hide the buttons
                buttonsContainer.style.display = 'none';
                navToggle.setAttribute('aria-expanded', 'false');
                if (navArrow) {
                    navArrow.setAttribute('aria-expanded', 'false');
                    const icon = navArrow.querySelector('i');
                    if (icon) {
                        icon.classList.remove('bi-chevron-down');
                        icon.classList.add('bi-chevron-right');
                    }
                }
            }
        };
        
        // Set initial state
        updateToggleState();
        
        // Handle toggle click
        navToggle.addEventListener('click', function(e) {
            // Don't toggle if clicking a nav-item inside
            if (e.target.closest('.nav-item')) return;
            
            // Don't toggle if clicking the arrow button (it has its own handler)
            if (e.target.closest('.nav-arrow')) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            isExpanded = !isExpanded;
            updateToggleState();
        });
        
        // Handle arrow button click specifically
        if (navArrow) {
            navArrow.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                isExpanded = !isExpanded;
                updateToggleState();
            });
            
            // Handle keyboard navigation for arrow button
            navArrow.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    isExpanded = !isExpanded;
                    updateToggleState();
                }
            });
        }
        
        // Handle keyboard navigation for entire toggle
        navToggle.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                
                isExpanded = !isExpanded;
                updateToggleState();
            }
        });
    }

    function setupCollapsibles() {
        // Handle collapsible sections with data-section-toggle
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', function (e) {
                e.preventDefault();
                const btn = header.querySelector('.section-toggle-btn');
                const section = header.closest('[data-section]');
                const content = section ? section.querySelector('[data-section-content]') : null;

                if (btn && content) {
                    const isExpanded = btn.getAttribute('aria-expanded') === 'true';
                    btn.setAttribute('aria-expanded', !isExpanded);
                    content.hidden = isExpanded;
                    btn.querySelector('i').classList.toggle('bi-chevron-up');
                    btn.querySelector('i').classList.toggle('bi-chevron-down');
                }
            });
        });

        // Handle legacy collapsible headers if any
        const headers = Array.from(document.querySelectorAll('.collapsible-header[data-collapse-target]'));
        if (!headers.length) return;

        headers.forEach((header) => {
            const targetSelector = header.getAttribute('data-collapse-target');
            const content = targetSelector ? document.querySelector(targetSelector) : null;
            if (!content) return;

            const applyExpandedState = (expanded) => {
                header.setAttribute('aria-expanded', expanded ? 'true' : 'false');
                content.classList.toggle('collapsed', !expanded);
            };

            const toggle = () => {
                const expanded = header.getAttribute('aria-expanded') !== 'false';
                applyExpandedState(!expanded);
            };

            header.addEventListener('click', (e) => {
                const interactive = e.target?.closest?.('a,button,input,select,textarea,label');
                if (interactive) return;
                toggle();
            });

            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle();
                }
            });

            const expanded = header.getAttribute('aria-expanded') !== 'false';
            applyExpandedState(expanded);
        });
    }

    function setupIframeMessaging() {
        window.addEventListener('message', (event) => {
            const data = event?.data;
            if (!data || typeof data !== 'object') return;

            // Branch Parameters iframe uses this to request navigation back to main screen.
            if (data.action === 'navigate' && data.section === 'branch-settings') {
                switchSection('branch-settings');

                // Update sidebar active state to reflect Branch Settings.
                const navItems = document.querySelectorAll('.nav-item');
                navItems.forEach(nav => nav.classList.remove('active'));

                const branchSettingsBtn = document.querySelector('[data-section="branch-settings"]');
                if (branchSettingsBtn) {
                    branchSettingsBtn.classList.add('active');
                }

                const branchSettingsToggle = document.querySelector('.nav-toggle');
                if (branchSettingsToggle) {
                    branchSettingsToggle.classList.remove('collapsed');
                }
            }
        });
    }

    function resolveOldApiEndpoint() {
        try {
            if (window.Environment?.useLocalOldApiProxy === true) return '/api/OldAPI';
            const base = (window.Environment?.baseUrlCommon || window.Environment?.baseUrlSystemCodes || '').toString().replace(/\/+$/, '');
            return base ? `${base}/api/OldAPI` : '/api/OldAPI';
        } catch {
            return '/api/OldAPI';
        }
    }

    function formatLegacyRequestTime(d = new Date()) {
        const pad2 = (n) => String(n).padStart(2, '0');
        const mm = pad2(d.getMonth() + 1);
        const dd = pad2(d.getDate());
        const yyyy = d.getFullYear();
        const hh = pad2(d.getHours());
        const mi = pad2(d.getMinutes());
        const ss = pad2(d.getSeconds());
        return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
    }

    function getSession() {
        try {
            const raw = localStorage.getItem('nimble_auth_session');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function getContext() {
        const session = getSession() || {};
        const operatorId =
            session.operatorID ||
            session.OperatorID ||
            session.operatorId ||
            session.operator ||
            'CSADM';

        const branchId =
            session.branchID ||
            session.BranchID ||
            session.ourBranchID ||
            session.OurBranchID ||
            window.Environment?.OurBranchID ||
            window.Environment?.defaultOurBranchId ||
            '0101';

        return { operatorId: String(operatorId || '').trim(), branchId: String(branchId || '').trim() };
    }

    function makeLegacyEnvelope(formId, requestData) {
        if (!window.CoreApi?.makeRequestEnvelope) {
            throw new Error('CoreApi is not available in this module iframe.');
        }
        const envelope = window.CoreApi.makeRequestEnvelope(formId, requestData, APP_NAME);
        envelope.RequestID = formId;
        envelope.FormID = formId;
        envelope.FormId = formId;
        envelope.RequestTime = formatLegacyRequestTime();
        envelope.Checksum = envelope.Checksum ?? '';
        return envelope;
    }

    function firstTruthy(...values) {
        for (const v of values) {
            if (v !== undefined && v !== null && String(v).trim() !== '') return v;
        }
        return '';
    }

    function findFirstRowWithLikelyKeys(payload) {
        const targetKeys = new Set([
            'BankID',
            'BranchID',
            'OurBranchID',
            'ShortName',
            'BranchPrefix',
            'Phone1',
            'EMailID',
            'EmailID',
            'EmailId',
            'CashLimit'
        ]);

        const seen = new Set();
        const queue = [payload];
        let iterations = 0;

        while (queue.length > 0 && iterations < 5000) {
            iterations++;
            const current = queue.shift();
            if (!current) continue;

            if (typeof current === 'object') {
                if (seen.has(current)) continue;
                seen.add(current);
            }

            if (Array.isArray(current)) {
                for (const item of current) queue.push(item);
                continue;
            }

            if (typeof current !== 'object') continue;

            const keys = Object.keys(current);
            const hits = keys.filter(k => targetKeys.has(k));
            if (hits.length >= 2) return current;

            // common wrappers
            if (current.data !== undefined) queue.push(current.data);
            if (current.Data !== undefined) queue.push(current.Data);
            if (current.Details !== undefined) queue.push(current.Details);
            if (current.details !== undefined) queue.push(current.details);

            // sometimes Details01/02 contain recordsets
            for (const k of keys) {
                if (/^Details\d+$/i.test(k)) queue.push(current[k]);
            }

            for (const k of keys) {
                if (k === 'data' || k === 'Data' || k === 'Details' || /^Details\d+$/i.test(k)) continue;
                const v = current[k];
                if (v && typeof v === 'object') queue.push(v);
            }
        }

        return null;
    }

    function setValue(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        if ('value' in el) {
            el.value = value ?? '';
        } else {
            el.textContent = value ?? '';
        }
    }

    /**
     * Format a number as amount with commas and 2 decimal places (e.g., 1,234.00)
     */
    function formatAmount(value) {
        const num = parseFloat(value);
        if (isNaN(num)) return '0.00';
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function setChecked(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        el.checked = value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
    }

    function parseTimeZoneDiff(value) {
        const raw = String(value ?? '').trim();
        if (!raw) return 0; // Default to 0 if empty - API requires this parameter

        // numeric string (e.g. 3, -3.5)
        const asNum = Number(raw);
        if (!Number.isNaN(asNum) && Number.isFinite(asNum)) return asNum;

        // hh:mm or +/-hh:mm
        const match = raw.match(/^([+-])?(\d{1,2})\s*:\s*(\d{2})$/);
        if (!match) return 0; // Default to 0 if invalid format

        const sign = match[1] === '-' ? -1 : 1;
        const hh = Number(match[2]);
        const mm = Number(match[3]);
        if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
        return sign * (hh + (mm / 60));
    }

    function formatTimeZoneDiff(value) {
        if (value === undefined || value === null || value === '') return '';
        const n = Number(value);
        if (Number.isNaN(n) || !Number.isFinite(n)) return String(value);

        const sign = n < 0 ? '-' : '+';
        const abs = Math.abs(n);
        const hh = Math.floor(abs);
        const mm = Math.round((abs - hh) * 60);
        const pad2 = (x) => String(x).padStart(2, '0');
        return `${sign}${pad2(hh)}:${pad2(mm)}`;
    }

    function toNumberOrNull(v) {
        const s = String(v ?? '').trim();
        if (!s) return null;
        const n = Number(s.replace(/,/g, ''));
        return Number.isFinite(n) ? n : null;
    }

    /**
     * Convert formatted amount to integer for API (removes commas and decimals)
     * Ensures value fits in Int32 range (-2147483648 to 2147483647)
     */
    function toIntOrNull(v) {
        const s = String(v ?? '').trim();
        if (!s) return null;
        const n = Math.round(Number(s.replace(/,/g, '')));
        if (!Number.isFinite(n)) return null;
        // Clamp to Int32 range
        const INT32_MAX = 2147483647;
        const INT32_MIN = -2147483648;
        if (n > INT32_MAX) return INT32_MAX;
        if (n < INT32_MIN) return INT32_MIN;
        return n;
    }

    /**
     * Initialize navigation toggle and section switching
     */
    function initializeNavigation() {
        const navToggle = document.querySelector('.nav-toggle');
        const navItems = document.querySelectorAll('.nav-item');
        const navItemsContainer = document.querySelector('.nav-items') || document.getElementById('nav-dataentry');
        const searchInput = document.getElementById('submoduleSearch');
        const sidebarIconBtn = document.getElementById('sidebarToggle') || document.querySelector('.sidebar-toggle') || document.querySelector('.sidebar-icon-btn');
        const sidebar = document.querySelector('.branch-sidebar') || document.querySelector('.sidebar');
        const navArrow = navToggle?.querySelector?.('.nav-arrow');

        // Handle hamburger menu toggle (collapse/expand sidebar)
        if (sidebarIconBtn && sidebar) {
            sidebarIconBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                sidebar.classList.toggle('collapsed');
                try {
                    const expanded = !sidebar.classList.contains('collapsed');
                    sidebarIconBtn.setAttribute('aria-expanded', String(expanded));
                } catch {
                    // ignore
                }
            });
        }

        const updateToggleState = (forceCollapsed) => {
            if (!navToggle || !navItemsContainer) return;

            const isCollapsed = forceCollapsed !== undefined
                ? Boolean(forceCollapsed)
                : navToggle.classList.contains('hidden');

            if (isCollapsed) {
                navToggle.classList.add('hidden', 'collapsed');
                // Ensure we win even if CSS declares display with !important
                navItemsContainer.style.setProperty('display', 'none', 'important');
                navItemsContainer.setAttribute('hidden', '');
                if (navArrow) {
                    navArrow.setAttribute('aria-expanded', 'false');
                    const icon = navArrow.querySelector('i');
                    if (icon) {
                        icon.classList.remove('bi-chevron-down');
                        icon.classList.add('bi-chevron-right');
                    }
                }
            } else {
                navToggle.classList.remove('hidden', 'collapsed');
                navItemsContainer.style.setProperty('display', 'flex', 'important');
                navItemsContainer.removeAttribute('hidden');
                if (navArrow) {
                    navArrow.setAttribute('aria-expanded', 'true');
                    const icon = navArrow.querySelector('i');
                    if (icon) {
                        icon.classList.remove('bi-chevron-right');
                        icon.classList.add('bi-chevron-down');
                    }
                }
            }
        };

        // Handle navigation toggle click (expand/collapse)
        if (navToggle) {
            const toggleNavItems = (e) => {
                // Don't toggle if clicking a nav-item inside
                if (e?.target?.closest?.('.nav-item')) return;

                // If the arrow button was clicked, avoid default button behavior
                if (e?.target?.closest?.('.nav-arrow')) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                const currentlyCollapsed = navToggle.classList.contains('collapsed');
                updateToggleState(!currentlyCollapsed);
            };

            navToggle.addEventListener('click', toggleNavItems);
            navToggle.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleNavItems(e);
                }
            });
        }

        // Ensure initial state: if it has display block/flex in style or not none, it's expanded.
        if (navItemsContainer && navToggle) {
            // Force expanded on page load since HTML has display:flex
            updateToggleState(false);
        }

        // Handle navigation item clicks
        navItems.forEach(item => {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                // Remove active class from all nav items
                navItems.forEach(nav => nav.classList.remove('active'));

                // Add active class to clicked item
                this.classList.add('active');

                // Get the section to show
                const section = this.getAttribute('data-section');
                if (section) {
                    switchSection(section);
                }
            });
        });

        // Filter sidebar items by search
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                const query = (searchInput.value || '').trim().toLowerCase();

                const sidebarEl = document.querySelector('.branch-sidebar');
                if (!sidebarEl) return;

                const sections = sidebarEl.querySelectorAll('.nav-section');
                sections.forEach(section => {
                    const toggle = section.querySelector('.nav-toggle');
                    const items = Array.from(section.querySelectorAll('.nav-item'));

                    // Main nav section (no toggle)
                    if (!toggle) {
                        const hasMatch = items.some(btn => (btn.textContent || '').toLowerCase().includes(query));
                        section.style.display = hasMatch || query.length === 0 ? '' : 'none';
                        return;
                    }

                    const toggleMatch = (toggle.textContent || '').toLowerCase().includes(query);
                    const itemMatch = items.some(btn => (btn.textContent || '').toLowerCase().includes(query));

                    // If searching: show section only if it matches
                    if (query.length > 0) {
                        section.style.display = (toggleMatch || itemMatch) ? '' : 'none';

                        // If an item matches, ensure dropdown is visible
                        if (itemMatch) {
                            updateToggleState(false);
                        }
                    } else {
                        section.style.display = '';
                    }
                });
            });
        }

        console.log('Navigation initialized');
    }

    /**
     * Switch between content sections
     */
    function switchSection(sectionName) {
        // Hide all sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => {
            section.classList.remove('active');
            section.classList.add('d-none');
        });

        // Show the selected section
        let targetSection;
        if (sectionName === 'branch-settings') {
            targetSection = document.getElementById('branchSettingsSection');
        } else if (sectionName === 'branch-parameters') {
            targetSection = document.getElementById('branchParametersSection');
        }

        if (targetSection) {
            targetSection.classList.add('active');
            targetSection.classList.remove('d-none');
        }

        // Handle action button panels
        const branchSettingsActions = document.querySelector('[data-bs-actions-view="branch-settings"]');
        const branchParametersActions = document.querySelector('[data-bs-actions-view="branch-parameters"]');

        if (branchSettingsActions && branchParametersActions) {
            if (sectionName === 'branch-settings') {
                branchSettingsActions.classList.remove('d-none');
                branchParametersActions.classList.add('d-none');
            } else if (sectionName === 'branch-parameters') {
                branchSettingsActions.classList.add('d-none');
                branchParametersActions.classList.remove('d-none');
            }
        }

        console.log('Switched to section:', sectionName);
    }

    /**
     * Initialize form controls
     */
    function initializeForm() {
        // Set initial form state to view mode
        setFormState('view');

        // Initialize dropdowns
        initializeDropdowns();

        // Initialize search buttons
        initializeSearchButtons();

        // The HTML currently uses a single Time Zone Diff input.

        console.log('Branch Settings form initialized');
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Action buttons
        const editBtn = document.getElementById('btnEdit');
        const saveBtn = document.getElementById('btnSave');
        const cancelBtn = document.getElementById('btnCancel');

        if (editBtn) {
            editBtn.addEventListener('click', handleEdit);
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', handleSave);
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', handleCancel);
        }

        // Branch Parameters Back button
        const backBtn = document.getElementById('btnBpBack');
        if (backBtn) {
            backBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                // If in edit mode, check with the user (similar to handleCancel)
                // Note: isEditMode is in branch-parameters.js scope, but we can check the button state
                const saveBtn = document.getElementById('btnBpSave');
                if (saveBtn && !saveBtn.disabled) {
                    if (!confirm('You have unsaved changes in Parameters. Are you sure you want to go back?')) {
                        return;
                    }
                }

                switchSection('branch-settings');

                // Update sidebar active state 
                const navItems = document.querySelectorAll('.nav-item');
                navItems.forEach(nav => nav.classList.remove('active'));
                const branchSettingsBtn = document.querySelector('[data-section="branch-settings"]');
                if (branchSettingsBtn) {
                    branchSettingsBtn.classList.add('active');
                }
            });
        }

        // Search buttons
        document.querySelectorAll('.search-btn').forEach(btn => {
            btn.addEventListener('click', handleSearch);
        });

        // Dropdown buttons
        document.querySelectorAll('.dropdown-btn').forEach(btn => {
            btn.addEventListener('click', handleDropdown);
        });

        // Checkbox handlers
        const headOfficeCheckbox = document.getElementById('isHeadOffice');
        const clearingCentreCheckbox = document.getElementById('isClearingCentre');

        if (headOfficeCheckbox) {
            headOfficeCheckbox.addEventListener('change', handleHeadOfficeChange);
        }

        if (clearingCentreCheckbox) {
            clearingCentreCheckbox.addEventListener('change', handleClearingCentreChange);
        }
    }

    /**
     * Initialize dropdown functionality
     */
    function initializeDropdowns() {
        const cityDropdown = document.querySelector('[data-dropdown="city"]');
        const lastAuditedDropdown = document.querySelector('[data-dropdown="lastAudited"]');

        // City dropdown options
        if (cityDropdown) {
            const cities = ['Addis Ababa', 'Dire Dawa', 'Mekelle', 'Gondar', 'Bahir Dar', 'Hawassa', 'Jimma', 'Adama'];
            populateDropdown(cityDropdown, cities);
        }

        // Last Audited dropdown options
        if (lastAuditedDropdown) {
            const auditOptions = ['2024', '2023', '2022', '2021', '2020', '2019'];
            populateDropdown(lastAuditedDropdown, auditOptions);
        }
    }

    /**
     * Populate dropdown with options
     */
    function populateDropdown(dropdown, options) {
        dropdown.innerHTML = '<option value="">Select...</option>';
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            dropdown.appendChild(optionElement);
        });
    }

    /**
     * Initialize search button functionality
     */
    function initializeSearchButtons() {
        // Search buttons for different fields
        const searchButtons = {
            'intApportionSearch': 'searchIntApportionAccount',
            'taxApportionSearch': 'searchTaxApportionAccount',
            'reportingBranchSearch': 'searchReportingBranch'
        };

        Object.entries(searchButtons).forEach(([btnId, action]) => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.dataset.action = action;
            }
        });
    }

    /**
     * Load branch settings data
     */
    async function loadBranchSettings() {
        console.log('Loading branch settings...');

        const ctx = getContext();
        const requestData = {
            OurBranchID: ctx.branchId,
            OperatorID: ctx.operatorId
        };

        try {
            const envelope = makeLegacyEnvelope(FORM_IDS.GET, requestData);
            const resp = await window.CoreApi.post(resolveOldApiEndpoint(), envelope);

            if (!resp?.success) {
                alert(resp?.message || 'Failed to load branch settings');
                return;
            }

            const row = findFirstRowWithLikelyKeys(resp?.data ?? resp?.Details ?? resp);
            if (!row) {
                console.warn('Branch settings loaded but no row could be extracted', resp);
                return;
            }

            lastLoadedRecord = row;
            bindBranchSettings(row);
            
            // Show success message
            const branchId = row.BranchID || row.OurBranchID || row.branchId || '';
            showSuccessMessage(`Branch settings loaded successfully for Branch: ${branchId}`);
        } catch (e) {
            console.error('Failed to load branch settings:', e);
            alert(e?.message || 'Failed to load branch settings');
        }
    }

    function bindBranchSettings(row) {
        setValue('bankId', firstTruthy(row.BankID, row.bankId));
        setValue('branchId', firstTruthy(row.BranchID, row.OurBranchID, row.branchId));
        setValue('shortName', firstTruthy(row.ShortName, row.shortName));
        setValue('currencyId', firstTruthy(row.CurrencyID, row.CurrencyId, row.currencyId));
        setValue('branchPrefix', firstTruthy(row.BranchPrefix, row.branchPrefix));

        // UI has one Address field; bind Address1/Address
        setValue('address', firstTruthy(row.Address1, row.Address, row.AddressLine1));

        // UI has City free-text input.
        setValue('city', firstTruthy(row.CityID, row.City, row.CityName));

        setValue('zipCode', firstTruthy(row.ZipCode, row.ZipCode1, row.PostalCode));
        setValue('emailId', firstTruthy(row.EMailID, row.EmailID, row.EmailId, row.emailId));
        setValue('phone1', firstTruthy(row.Phone1, row.phone1));
        setValue('phone2', firstTruthy(row.Phone2, row.phone2));
        setValue('mobile', firstTruthy(row.Mobile, row.mobile));
        setValue('faxNo', firstTruthy(row.Fax, row.FaxNo, row.fax));

        setValue('clearingDays', firstTruthy(row.ClearingDays, row.clearingDays));
        setValue('apportionIntTax', firstTruthy(row.ApportioningPercent, row.ApportioningPerc, row.apportionIntTax));
        setValue('intApportionAC', firstTruthy(row.InterestApportionAccountID, row.IntApportionAC, row.intApportionAC));
        setValue('taxApportionAC', firstTruthy(row.TaxApportionAccountID, row.TaxApportionAC, row.taxApportionAC));
        setValue('reportingBranchID', firstTruthy(row.ReportingBranchID, row.reportingBranchID));

        setChecked('isHeadOffice', firstTruthy(row.IsHeadOffice, row.isHeadOffice));
        setChecked('isClearingCentre', firstTruthy(row.IsClearingCenter, row.IsClearingCentre, row.isClearingCentre));

        setValue('branchCashLimit', formatAmount(firstTruthy(row.CashLimit, row.BranchCashLimit, row.branchCashLimit)));
        setValue('lastAuditedOn', firstTruthy(row.AuditedDate, row.LastAuditedOn, row.lastAuditedOn));
        setValue('largestAllowableTrxAmount', formatAmount(firstTruthy(row.AllowableLargestAmount, row.LargestAllowableTrxAmount, row.largestAllowableTrxAmount)));

        setValue('timeZoneDiff', formatTimeZoneDiff(firstTruthy(row.TimeZoneDiff, row.timeZoneDiff)));

        // Behind The Scene fields
        setValue('btsModifiedBy', firstTruthy(row.ModifiedBy, row.modifiedBy));
        setValue('btsModifiedOn', firstTruthy(row.ModifiedOn, row.modifiedOn));
        setValue('btsSupervisedBy', firstTruthy(row.SupervisedBy, row.supervisedBy));
        setValue('btsSupervisedOn', firstTruthy(row.SupervisedOn, row.supervisedOn));
    }

    /**
     * Handle Edit button click
     */
    function handleEdit() {
        console.log('Edit button clicked');
        setFormState('edit');
    }

    /**
     * Handle Save button click
     */
    function handleSave() {
        console.log('Save button clicked');

        if (validateForm()) {
            const formData = collectFormData();
            saveBranchSettings(formData);
        }
    }

    /**
     * Handle Cancel button click
     */
    function handleCancel() {
        console.log('Cancel button clicked');

        if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            setFormState('view');
            if (lastLoadedRecord) {
                bindBranchSettings(lastLoadedRecord);
            } else {
                loadBranchSettings();
            }
        }
    }

    /**
     * Handle Search button click
     */
    function handleSearch(event) {
        const button = event.currentTarget;
        const action = button.dataset.action;

        console.log('Search button clicked:', action);

        // In a real application, this would open a search dialog
        // For now, just log the action
        switch (action) {
            case 'searchIntApportionAccount':
                console.log('Searching for Interest Apportion Account...');
                break;
            case 'searchTaxApportionAccount':
                console.log('Searching for Tax Apportion Account...');
                break;
            case 'searchReportingBranch':
                console.log('Searching for Reporting Branch...');
                break;
        }
    }

    /**
     * Handle Dropdown button click
     */
    function handleDropdown(event) {
        const button = event.currentTarget;
        const dropdown = button.previousElementSibling;

        if (dropdown && dropdown.tagName === 'SELECT') {
            dropdown.focus();
            dropdown.click();
        }
    }

    /**
     * Handle Head Office checkbox change
     */
    function handleHeadOfficeChange(event) {
        const isChecked = event.target.checked;
        console.log('Head Office checkbox changed:', isChecked);

        // Additional logic can be added here
        // e.g., enable/disable certain fields based on this selection
    }

    /**
     * Handle Clearing Centre checkbox change
     */
    function handleClearingCentreChange(event) {
        const isChecked = event.target.checked;
        console.log('Clearing Centre checkbox changed:', isChecked);

        // Additional logic can be added here
    }

    /**
     * Set form state (view/edit)
     */
    function setFormState(state) {
        const isEditMode = state === 'edit';

        // Enable/disable all input fields
        document.querySelectorAll('input:not([type="checkbox"]), select, .bs-input-text, .bs-select').forEach(input => {
            input.disabled = !isEditMode;
            if (isEditMode) {
                input.removeAttribute('readonly');
            } else {
                if (input.id !== 'bankId' && input.id !== 'branchId') { // keep IDs readable but not editable if needed
                    // input.setAttribute('readonly', true);
                }
            }
        });

        // Enable/disable checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.disabled = !isEditMode;
        });

        // Enable/disable search buttons
        document.querySelectorAll('.search-btn, .dropdown-btn').forEach(btn => {
            btn.disabled = !isEditMode;
        });

        // Toggle action buttons
        const editBtn = document.getElementById('btnEdit');
        const saveBtn = document.getElementById('btnSave');
        const cancelBtn = document.getElementById('btnCancel');

        // Keep all buttons visible; just enable/disable based on mode.
        if (editBtn) {
            editBtn.style.display = 'flex';
            editBtn.disabled = isEditMode;
        }
        if (saveBtn) {
            saveBtn.style.display = 'flex';
            saveBtn.disabled = !isEditMode;
        }
        if (cancelBtn) {
            cancelBtn.style.display = 'flex';
            cancelBtn.disabled = !isEditMode;
        }
    }

    /**
     * Validate form inputs
     */
    function validateForm() {
        const requiredFields = [
            { id: 'bankId', name: 'Bank ID' },
            { id: 'branchId', name: 'Branch ID' },
            { id: 'shortName', name: 'Short Name' },
            { id: 'currencyId', name: 'Currency ID' }
        ];

        for (const field of requiredFields) {
            const input = document.getElementById(field.id);
            if (input && !input.value.trim()) {
                alert(`${field.name} is required.`);
                input.focus();
                return false;
            }
        }

        return true;
    }

    /**
     * Collect form data
     */
    function collectFormData() {
        return {
            // Branch Details
            bankId: document.getElementById('bankId')?.value || '',
            branchId: document.getElementById('branchId')?.value || '',
            shortName: document.getElementById('shortName')?.value || '',
            currencyId: document.getElementById('currencyId')?.value || '',
            branchPrefix: document.getElementById('branchPrefix')?.value || '',
            address: document.getElementById('address')?.value || '',
            city: document.getElementById('city')?.value || '',
            zipCode: document.getElementById('zipCode')?.value || '',
            emailId: document.getElementById('emailId')?.value || '',
            phone1: document.getElementById('phone1')?.value || '',
            mobile: document.getElementById('mobile')?.value || '',
            phone2: document.getElementById('phone2')?.value || '',
            timeZoneDiff: document.getElementById('timeZoneDiff')?.value || '',
            faxNo: document.getElementById('faxNo')?.value || '',
            clearingDays: document.getElementById('clearingDays')?.value || '',
            apportionIntTax: document.getElementById('apportionIntTax')?.value || '',
            intApportionAC: document.getElementById('intApportionAC')?.value || '',
            taxApportionAC: document.getElementById('taxApportionAC')?.value || '',
            reportingBranchID: document.getElementById('reportingBranchID')?.value || '',
            isHeadOffice: document.getElementById('isHeadOffice')?.checked || false,
            isClearingCentre: document.getElementById('isClearingCentre')?.checked || false,

            // Branch Financial Details
            branchCashLimit: document.getElementById('branchCashLimit')?.value || '',
            lastAuditedOn: document.getElementById('lastAuditedOn')?.value || '',
            largestAllowableTrxAmount: document.getElementById('largestAllowableTrxAmount')?.value || '',
            holidayProcessingType1: document.getElementById('holidayProcessing1')?.value || '',
            holidayProcessingType2: document.getElementById('holidayProcessing2')?.value || ''
        };
    }

    /**
     * Save branch settings
     */
    function saveBranchSettings(formData) {
        console.log('Saving branch settings:', formData);

        const ctx = getContext();
        const row = lastLoadedRecord || {};
        console.log('Last loaded record (row):', row);

        const requestData = {
            OurBranchID: ctx.branchId,
            BankID: String(formData.bankId || '').trim(),
            BranchName: String(firstTruthy(row.BranchName, row.Branch, row.BranchTitle, formData.shortName) || '').trim(),
            ShortName: String(formData.shortName || '').trim(),
            ReportingBranchID: String(formData.reportingBranchID || '').trim(),
            BranchPrefix: String(formData.branchPrefix || '').trim(),
            Address1: String(formData.address || '').trim(),
            Address2: String(firstTruthy(row.Address2, '') || '').trim(),
            CityID: String(formData.city || '').trim(),
            CountryID: String(firstTruthy(row.CountryID, '') || '').trim(),
            ZipCode: String(formData.zipCode || '').trim(),
            Phone1: String(formData.phone1 || '').trim(),
            Phone2: String(formData.phone2 || '').trim(),
            Mobile: String(formData.mobile || '').trim(),
            Fax: String(formData.faxNo || '').trim(),
            EMailID: String(formData.emailId || '').trim(),
            CashLimit: toIntOrNull(formData.branchCashLimit) ?? 0,
            AllowableLargestAmount: toIntOrNull(formData.largestAllowableTrxAmount) ?? 0,
            IsHeadOffice: formData.isHeadOffice ? 1 : 0,
            IsClearingCenter: formData.isClearingCentre ? 1 : 0,
            ClearingDays: toNumberOrNull(formData.clearingDays) ?? 0,
            TimeZoneDiff: parseTimeZoneDiff(formData.timeZoneDiff),
            AuditedDate: String(formData.lastAuditedOn || '').trim(),
            HolidayHandlingTypeID: String(firstTruthy(row.HolidayHandlingTypeID, '') || '').trim(),
            ApportioningPercent: toNumberOrNull(formData.apportionIntTax),
            ApportionInterest: toNumberOrNull(firstTruthy(row.ApportionInterest, 0)) ?? 0,
            TaxApportionAccountID: String(formData.taxApportionAC || '').trim() || null,
            InterestApportionAccountID: String(formData.intApportionAC || '').trim() || null,
            ModifiedBy: ctx.operatorId,
            ModifiedOn: null,
            SupervisedBy: String(firstTruthy(row.SupervisedBy, '') || '').trim() || null,
            NewRecord: toNumberOrNull(firstTruthy(row.UpdateCount, row.updateCount)) ?? 0
        };

        console.log('Request data being sent:', requestData);

        (async () => {
            try {
                const envelope = makeLegacyEnvelope(FORM_IDS.EDIT, requestData);
                const resp = await window.CoreApi.post(resolveOldApiEndpoint(), envelope);

                if (!resp?.success) {
                    alert(resp?.message || 'Failed to save branch settings');
                    return;
                }

                alert('Branch settings saved successfully!');
                setFormState('view');
                await loadBranchSettings();
            } catch (e) {
                console.error('Save failed:', e);
                alert(e?.message || 'Failed to save branch settings');
            }
        })();
    }

})();