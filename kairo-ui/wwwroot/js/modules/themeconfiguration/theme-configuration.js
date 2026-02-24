(function () {
    'use strict';

    // ==================== DOM ELEMENT REFERENCES ====================
    const form = document.getElementById('theme-form') || document.getElementById('themeConfigForm');
    const colorInputs = document.querySelectorAll('.theme-color-input');
    const sectionButtons = document.querySelectorAll('.theme-config-nav-item, [data-section].btn-action, [data-section][role="tab"]');
    const sections = document.querySelectorAll('.theme-config-section[data-section]');
    const messagePanel = document.querySelector('.am-message-panel');
    const messagePanelText = document.getElementById('messagePanelText');
    const cancelBtn = document.querySelector('[data-action="cancel"]');
    const applyBtn = document.querySelector('[data-action="apply-theme-model"], [data-action="apply-theme"]');

    // ==================== UTILITY FUNCTIONS ====================

    /**
     * Convert any color format to 6-digit hex
     */
    function toHex(color) {
        if (!color) return '#000000';

        const c = String(color).trim().toLowerCase();

        // Already hex - ensure 6 digits
        if (c.startsWith('#')) {
            if (c.length === 4) {
                // Expand #abc to #aabbcc
                return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
            }
            if (c.length === 7) {
                return c;
            }
            return '#000000';
        }

        // RGB or RGBA format
        if (c.startsWith('rgb')) {
            const match = c.match(/\d+(?:\.\d+)?/g);
            if (match && match.length >= 3) {
                const [r, g, b] = match.slice(0, 3).map(x => {
                    const num = Math.round(parseFloat(x));
                    return Math.max(0, Math.min(255, num));
                });
                return '#' + [r, g, b].map(x => {
                    const h = x.toString(16);
                    return h.length === 1 ? '0' + h : h;
                }).join('');
            }
        }

        return '#000000';
    }

    /**
     * Get actual computed color from a specific CSS property
     * ONLY reads from real rendered DOM elements
     * Returns null if element not found or color is invalid
     */
    function readColorFromElement(selector, cssProperty) {
        try {
            const el = document.querySelector(selector);
            if (!el) {
                return null;
            }

            const computed = window.getComputedStyle(el);
            const colorValue = computed.getPropertyValue(cssProperty).trim();

            if (!colorValue) {
                return null;
            }

            const hex = toHex(colorValue);
            return hex;
        } catch (e) {
            return null;
        }
    }

    /**
     * Get the logged-in user ID (OperatorID) from sessionStorage
     * Tries multiple possible keys and validates the result
     * Checks current window, parent window (if in iframe), AuthService, and localStorage
     * @returns {number|string} User ID, or throws error if not found
     */
    function getLoggedInUserId() {
        // Helper to get from a storage object
        const getFromStorage = (storage, label) => {
            if (!storage) return null;
            return storage.getItem('UserId') ||
                storage.getItem('UserID') ||
                storage.getItem('OperatorID') ||
                storage.getItem('OperatorId') ||
                storage.getItem('operatorID') ||
                storage.getItem('operatorId') ||
                storage.getItem('userId');
        };

        // Try current window sessionStorage first
        let userId = getFromStorage(sessionStorage, 'current sessionStorage');

        // Try parent window sessionStorage if in iframe
        if ((!userId || userId === '0' || userId === 0) && window.parent && window.parent !== window) {
            try {
                userId = getFromStorage(window.parent.sessionStorage, 'parent sessionStorage');
                if (userId && userId !== '0' && userId !== 0) {
                    console.log('✅ [USER ID] Found in parent window sessionStorage');
                }
            } catch (e) {
                console.warn('⚠️ [USER ID] Could not access parent sessionStorage:', e.message);
            }
        }

        // Try AuthService.getSession() if available
        if ((!userId || userId === '0' || userId === 0)) {
            try {
                const AuthService = window.AuthService || window.global?.AuthService;
                if (AuthService && typeof AuthService.getSession === 'function') {
                    const session = AuthService.getSession();
                    if (session) {
                        userId = session.operatorID || session.OperatorID || session.operatorId ||
                            session.OperatorId || session.userId || session.UserId ||
                            session.userID || session.UserID;
                        if (userId && userId !== '0' && userId !== 0) {
                            console.log('✅ [USER ID] Found in AuthService.getSession()');
                        }
                    }
                }
            } catch (e) {
                console.warn('⚠️ [USER ID] Could not access AuthService:', e.message);
            }
        }

        // Try global variables (common patterns in some apps)
        if ((!userId || userId === '0' || userId === 0)) {
            userId = window.currentUserId || window.currentUserID || window.currentOperatorID ||
                window.currentOperatorId || window.operatorId || window.OperatorID ||
                (window.global && (window.global.currentUserId || window.global.currentUserID));
            if (userId && userId !== '0' && userId !== 0) {
                console.log('✅ [USER ID] Found in global variables');
            }
        }

        // Try localStorage as fallback
        if ((!userId || userId === '0' || userId === 0)) {
            userId = getFromStorage(localStorage, 'localStorage');
            if (userId && userId !== '0' && userId !== 0) {
                console.log('✅ [USER ID] Found in localStorage');
            }
        }

        // Log all available keys for debugging if user ID not found
        if (!userId || userId === '0' || userId === 0) {
            const allKeys = {
                currentSessionStorage: Object.keys(sessionStorage || {}),
                currentLocalStorage: Object.keys(localStorage || {}),
                parentSessionStorage: null,
                parentLocalStorage: null
            };

            if (window.parent && window.parent !== window) {
                try {
                    allKeys.parentSessionStorage = Object.keys(window.parent.sessionStorage || {});
                    allKeys.parentLocalStorage = Object.keys(window.parent.localStorage || {});
                } catch (e) {
                    allKeys.parentError = e.message;
                }
            }

            console.warn('⚠️ [USER ID] No valid user ID found. Available keys:', allKeys);
            console.warn('⚠️ [USER ID] Checked keys: UserId, UserID, OperatorID, OperatorId, operatorID, operatorId, userId');
            console.warn('⚠️ [USER ID] Defaulting to "CSADM" as fallback user ID');

            // Default to CSADM if user ID not found
            //userId = 'CSADM';
        }

        // Try to parse as number, but keep as string if it's not numeric (some systems use string IDs)
        const parsed = parseInt(userId, 10);
        const finalId = (!isNaN(parsed) && parsed > 0) ? parsed : userId;

        console.log('✅ [USER ID] Logged-in user ID:', finalId);
        return finalId;
    }

    /**
     * Get current theme scope from UI and session (User or Bank).
     * @returns {{ ScopeType: string, ScopeRefID: number|string }} ScopeType is USER or BANK; ScopeRefID is the corresponding ID (numeric for USER, may be string for BANK).
     */
    function getThemeScope() {
        // Helper to get bank ID from multiple sources
        const getBankId = () => {
            // Try current window sessionStorage
            let bankId = sessionStorage.getItem('BankId') ||
                sessionStorage.getItem('BankID') ||
                sessionStorage.getItem('bankId') ||
                sessionStorage.getItem('bankID');

            // Try parent window if in iframe
            if ((!bankId || bankId === '0' || bankId === 0) && window.parent && window.parent !== window) {
                try {
                    bankId = window.parent.sessionStorage.getItem('BankId') ||
                        window.parent.sessionStorage.getItem('BankID') ||
                        window.parent.sessionStorage.getItem('bankId') ||
                        window.parent.sessionStorage.getItem('bankID');
                } catch (e) {
                    // Silent fail
                }
            }

            // Try localStorage
            if (!bankId || bankId === '0' || bankId === 0) {
                bankId = localStorage.getItem('BankId') ||
                    localStorage.getItem('BankID') ||
                    localStorage.getItem('bankId') ||
                    localStorage.getItem('bankID');
            }

            // Try AuthService
            if ((!bankId || bankId === '0' || bankId === 0)) {
                try {
                    const AuthService = window.AuthService || window.global?.AuthService;
                    if (AuthService && typeof AuthService.getSession === 'function') {
                        const session = AuthService.getSession();
                        if (session) {
                            bankId = session.bankId || session.BankId || session.bankID || session.BankID;
                        }
                    }
                } catch (e) {
                    // Silent fail
                }
            }

            return bankId || '';
        };

        const userIdRaw = sessionStorage.getItem('UserId') || '';
        const userId = userIdRaw ? (parseInt(userIdRaw, 10) || userIdRaw) : 0;
        const bankId = getBankId();

        const radio = document.querySelector('input[name="themeScope"]:checked');
        const scope = (radio && radio.value) || 'USER';

        let refId;
        if (scope === 'USER') {
            refId = userId;
            if (!userId || userId === 0) {
                // Try to get from session again or use OperatorID (this will default to CSADM if not found)
                refId = getLoggedInUserId();
                if (refId == undefined || refId == "" || refId === 0) {
                    refId = 'DEFAULT';
                }
            }
        } else {
            // For BANK scope, use bankId or default to "DEFAULT" if not found
            refId = bankId || '';
            if (!refId || refId === '0' || refId == '' || refId === 0) {
                refId = 'DEFAULT';
            }
        }
        if (refId == undefined || refId == "" || refId === 0) {
            refId = 'DEFAULT';
        }
        return { ScopeType: scope, ScopeRefID: refId };
    }

    /**
     * Resolve theme scope from API response (database). Checks all common response shapes.
     * @param {Object} response - Full API response
     * @param {Object} themeData - response.Data (effective theme object)
     * @returns {string|null} 'USER' | 'BANK' or null
     */
    function resolveScopeFromApiResponse(response, themeData) {
        const valid = ['USER', 'BANK'];
        const raw = themeData?.ScopeType || themeData?.scopeType || themeData?.Scope || themeData?.scope ||
            response?.ScopeType || response?.scopeType || response?.Scope || response?.scope;
        if (!raw) return null;
        const upper = String(raw).trim().toUpperCase();
        // If BRANCH is returned from API, map it to USER (since Branch scope is removed)
        if (upper === 'BRANCH') return 'USER';
        return valid.includes(upper) ? upper : null;
    }

    /**
     * Update user ID display in scope selector
     */
    function updateUserIdDisplay() {
        const userIdElement = document.getElementById('themeScopeUserId');
        if (!userIdElement) return;

        const userId = sessionStorage.getItem('UserId') || '';
        if (userId) {
            userIdElement.textContent = `(${userId})`;
            userIdElement.style.display = 'inline';
        } else {
            userIdElement.textContent = '';
            userIdElement.style.display = 'none';
        }
    }

    /**
     * Restore the scope radio button to match the last used scope (from database API, localStorage, or default)
     * @param {string|null} apiScope - Scope from database API (highest priority)
     */
    function restoreThemeScope(apiScope = null) {
        try {
            console.log('🎯 [SCOPE RESTORE] Starting scope restoration...');
            console.log('🎯 [SCOPE RESTORE] API scope provided:', apiScope);

            // Update user ID display
            updateUserIdDisplay();

            // Priority order: 1) API scope (from database), 2) default BANK
            // Theme parameters come from database only, not localStorage
            console.log('🎯 [SCOPE RESTORE] Sources:', {
                apiScope
            });

            // Use API scope from database, fallback to default BANK
            const scopeToUse = apiScope || 'BANK';

            // Validate scope is one of the allowed values (USER or BANK only)
            const validScopes = ['USER', 'BANK'];
            // If scope is BRANCH (from old data), map to USER
            const normalizedScope = scopeToUse === 'BRANCH' ? 'USER' : scopeToUse;
            const finalScope = validScopes.includes(normalizedScope) ? normalizedScope : 'BANK';

            console.log('🎯 [SCOPE RESTORE] Final scope to apply:', finalScope, '(from:', scopeToUse === apiScope ? 'API' : 'default', ')');

            // Set the radio button
            const radio = document.querySelector(`input[name="themeScope"][value="${finalScope}"]`);
            if (radio) {
                radio.checked = true;
                console.log(`✅ [SCOPE RESTORE] Scope restored to: ${finalScope}`);
                // Update user ID display when USER is selected
                if (finalScope === 'USER') {
                    updateUserIdDisplay();
                }
            } else {
                console.warn(`⚠️ [SCOPE RESTORE] Could not find radio button for scope: ${finalScope}`);
                // Fallback: ensure BANK is checked
                const bankRadio = document.querySelector('input[name="themeScope"][value="BANK"]');
                if (bankRadio) bankRadio.checked = true;
            }
        } catch (error) {
            console.error('❌ [SCOPE RESTORE] Error restoring theme scope:', error);
            // Fallback: ensure BANK is checked
            const bankRadio = document.querySelector('input[name="themeScope"][value="BANK"]');
            if (bankRadio) bankRadio.checked = true;
            updateUserIdDisplay();
        }
    }

    /**
     * Get CSS variable value from :root
     * This is the PRIMARY source of truth for theme colors
     */
    function readCSSVariable(varName) {
        try {
            const value = getComputedStyle(document.documentElement)
                .getPropertyValue(varName)
                .trim();

            if (!value) {
                console.log(`CSS variable ${varName} not found in :root`);
                return null;
            }

            const hex = toHex(value);
            console.log(`✓ Read CSS variable ${varName}: ${value} → ${hex}`);
            return hex;
        } catch (e) {
            console.warn(`Error reading CSS variable ${varName}:`, e);
            return null;
        }
    }

    /**
     * Resolve color from multiple sources (in order of preference)
     * 1. CSS variables (PRIMARY - source of truth)
     * 2. DOM elements (SECONDARY - fallback)
     * Returns first valid color found, or null if none found
     */
    function resolveColor(cssVar, selectorList, cssProperty) {
        // PRIMARY: Try CSS variable first
        console.log(`  Trying CSS variable: ${cssVar}`);
        const cssVarColor = readCSSVariable(cssVar);
        if (cssVarColor && cssVarColor !== '#000000') {
            return cssVarColor;
        }

        // SECONDARY: Try DOM elements as fallback
        console.log(`  CSS variable not found, trying DOM elements...`);
        if (Array.isArray(selectorList)) {
            for (const selector of selectorList) {
                const color = readColorFromElement(selector, cssProperty);
                if (color && color !== '#000000') {
                    return color;
                }
            }
        }

        console.warn(`Could not resolve ${cssVar} from any source`);
        return null;
    }

    /**
     * Show message in panel
     */
    function showMessage(text, type = 'info') {
        if (messagePanel) {
            messagePanel.className = 'am-message-panel show ' + type;
            if (messagePanelText) messagePanelText.textContent = text;
            setTimeout(() => {
                messagePanel.classList.remove('show');
            }, 4000);
        } else {
            console.log('[Theme]', text);
        }
    }

    // ==================== SECTION NAVIGATION ====================

    function setupSectionNavigation() {
        // Map navigation items to section cards/panels
        const sectionMap = {
            'presets': 'section-presets',
            'label-typography': 'panel-label-typography',
            'custom-theme': 'panel-custom-theme',
            'branding-images': 'panel-branding-images'
        };

        // Query buttons fresh each time (in case DOM wasn't ready when module loaded)
        const navButtons = document.querySelectorAll('.theme-config-nav-item, [data-section].btn-action, [data-section][role="tab"]');

        if (navButtons.length === 0) {
            console.warn('⚠️ [NAV] No navigation buttons found');
            return;
        }

        console.log(`✅ [NAV] Found ${navButtons.length} navigation buttons`);

        navButtons.forEach((btn, index) => {
            // Ensure button is clickable
            if (btn.disabled) {
                console.warn(`⚠️ [NAV] Button ${index} is disabled:`, btn);
                return;
            }

            // Check if button already has listeners (prevent duplicates)
            if (btn.hasAttribute('data-nav-listener-attached')) {
                console.log(`ℹ️ [NAV] Button ${index} already has listener, skipping`);
                return;
            }
            btn.setAttribute('data-nav-listener-attached', 'true');

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                const sectionName = btn.dataset.section;
                if (!sectionName) {
                    console.warn('⚠️ [NAV] Button has no data-section attribute:', btn);
                    return;
                }

                console.log(`🖱️ [NAV] Clicked on section: ${sectionName}`);

                // Get target section (new section card or legacy section)
                let targetSection = document.getElementById(sectionMap[sectionName]);
                if (!targetSection) {
                    targetSection = document.querySelector(`.theme-config-section[data-section="${sectionName}"]`);
                }

                if (!targetSection) {
                    console.warn('⚠️ [NAV] Section not found:', sectionName);
                    return;
                }

                // Update active button / sidebar item with smooth transition
                navButtons.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');

                // Handle legacy sections (hide/show with smooth transition)
                if (targetSection.classList.contains('theme-config-section')) {
                    // Fade out all sections first
                    sections.forEach(s => {
                        if (s.classList.contains('active')) {
                            s.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out, visibility 0.3s ease-out';
                            s.style.opacity = '0';
                            s.style.transform = 'translateY(-10px)';
                            s.style.visibility = 'hidden';

                            // Remove active class and hide after transition
                            setTimeout(() => {
                                s.classList.remove('active');
                                s.style.display = 'none';
                                s.style.transition = '';
                            }, 300);
                        } else {
                            s.classList.remove('active');
                            s.style.display = 'none';
                            s.style.opacity = '0';
                            s.style.visibility = 'hidden';
                        }
                    });

                    // Show and fade in target section
                    targetSection.style.display = 'block';
                    requestAnimationFrame(() => {
                        targetSection.classList.add('active');
                        targetSection.style.transition = 'opacity 0.4s ease-in, transform 0.4s ease-in, visibility 0.4s ease-in';
                        targetSection.style.opacity = '1';
                        targetSection.style.transform = 'translateY(0)';
                        targetSection.style.visibility = 'visible';

                        // Clean up inline styles after transition
                        setTimeout(() => {
                            targetSection.style.transition = '';
                        }, 400);
                    });
                }

                // Use requestAnimationFrame to ensure DOM updates are complete before scrolling
                requestAnimationFrame(() => {
                    // Calculate scroll position with offset
                    const scrollContainer = document.querySelector('.theme-config-main');
                    const scrollOffset = 24; // Offset from top of scroll container

                    if (scrollContainer) {
                        const containerRect = scrollContainer.getBoundingClientRect();
                        const elementRect = targetSection.getBoundingClientRect();
                        const relativeTop = elementRect.top - containerRect.top;
                        const scrollPosition = scrollContainer.scrollTop + relativeTop - scrollOffset;

                        // Smooth scroll to section
                        scrollContainer.scrollTo({
                            top: Math.max(0, scrollPosition),
                            behavior: 'smooth'
                        });
                    } else {
                        // Fallback to window scroll
                        const elementRect = targetSection.getBoundingClientRect();
                        const scrollPosition = window.pageYOffset + elementRect.top - scrollOffset;

                        window.scrollTo({
                            top: Math.max(0, scrollPosition),
                            behavior: 'smooth'
                        });
                    }

                    // Add highlight effect to target section
                    targetSection.classList.add('navigated-to');
                    setTimeout(() => {
                        targetSection.classList.remove('navigated-to');
                    }, 1000);
                });
            });
        });

        // Fallback: Use event delegation on the nav container in case direct listeners don't work
        const navContainer = document.querySelector('.theme-config-nav');
        if (navContainer && !navContainer.hasAttribute('data-delegation-attached')) {
            navContainer.setAttribute('data-delegation-attached', 'true');
            navContainer.addEventListener('click', (e) => {
                const clickedBtn = e.target.closest('.theme-config-nav-item, [data-section]');
                if (clickedBtn && clickedBtn.dataset.section && !clickedBtn.hasAttribute('data-nav-listener-attached')) {
                    // Only handle if direct listener wasn't attached (fallback case)
                    e.preventDefault();
                    e.stopPropagation();

                    const sectionName = clickedBtn.dataset.section;
                    const sectionMap = {
                        'presets': 'section-presets',
                        'label-typography': 'panel-label-typography',
                        'custom-theme': 'panel-custom-theme',
                        'branding-images': 'panel-branding-images'
                    };

                    let targetSection = document.getElementById(sectionMap[sectionName]);
                    if (!targetSection) {
                        targetSection = document.querySelector(`.theme-config-section[data-section="${sectionName}"]`);
                    }

                    if (targetSection) {
                        navButtons.forEach(b => {
                            b.classList.remove('active');
                            b.setAttribute('aria-selected', 'false');
                        });
                        clickedBtn.classList.add('active');
                        clickedBtn.setAttribute('aria-selected', 'true');

                        // Show/hide sections
                        sections.forEach(s => {
                            s.classList.remove('active');
                            s.style.display = 'none';
                        });
                        targetSection.style.display = 'block';
                        targetSection.classList.add('active');

                        console.log('✅ [NAV] Fallback handler navigated to:', sectionName);
                    }
                }
            }, true); // Use capture phase
            console.log('✅ [NAV] Event delegation fallback attached to nav container');
        }
    }

    /**
     * Setup sidebar collapse/expand functionality
     */
    function setupSidebarToggle() {
        const sidebar = document.getElementById('themeConfigSidebar');
        const toggleBtn = document.getElementById('sidebarToggle');

        if (!sidebar || !toggleBtn) return;

        // Load saved state from localStorage
        const savedState = localStorage.getItem('themeConfigSidebarCollapsed');
        if (savedState === 'true') {
            sidebar.classList.add('collapsed');
        }

        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            sidebar.classList.toggle('collapsed');
            const isCollapsed = sidebar.classList.contains('collapsed');

            // Save state to localStorage
            localStorage.setItem('themeConfigSidebarCollapsed', isCollapsed ? 'true' : 'false');

            // Update toggle button title
            toggleBtn.setAttribute('title', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
            toggleBtn.setAttribute('aria-label', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
        });
    }

    // ==================== COLOR LOADING ====================

    /**
     * Load colors from CSS variables (PRIMARY) and DOM elements (SECONDARY)
     * Must be called AFTER DOMContentLoaded AND requestAnimationFrame
     * to ensure CSS is painted and elements are available
     */
    function loadColorsFromUI() {
        console.log('\n=== LOADING COLORS FROM CSS + DOM ===\n');

        // Color resolution: CSS var for each color + selector list as fallback
        const colorMappings = {
            headerColor: {
                cssVar: '--color-header',
                selectors: ['.am-header', '[data-page="theme-configuration"] .am-card-header', '.card-header'],
                property: 'background-color',
                description: 'Page header background'
            },
            primaryColor: {
                cssVar: '--color-primary',
                selectors: ['.btn-primary', '[data-action="apply-theme"]', '.list-group-item.active'],
                property: 'background-color',
                description: 'Primary button background'
            },
            borderColor: {
                cssVar: '--color-border',
                selectors: ['.form-control', '.card', 'input[type="text"]'],
                property: 'border-color',
                description: 'Input/card border color'
            },
            textColor: {
                cssVar: '--color-text',
                selectors: ['body', '.card-body', '.form-label'],
                property: 'color',
                description: 'Body text color'
            },
            mandatoryColor: {
                cssVar: '--color-label-mandatory',
                selectors: ['.text-danger', '.badge-danger', 'label[class*="required"]'],
                property: 'color',
                description: 'Mandatory field indicator color'
            },
            conditionalColor: {
                cssVar: '--color-label-conditional',
                selectors: ['.text-warning', '.badge-warning', 'label[class*="conditional"]'],
                property: 'color',
                description: 'Conditional field indicator color'
            },
            optionalColor: {
                cssVar: '--color-label-optional',
                selectors: ['.text-secondary', '.badge-secondary', 'label[class*="optional"]'],
                property: 'color',
                description: 'Optional field indicator color'
            }
        };

        let successCount = 0;
        let failureCount = 0;

        colorInputs.forEach(input => {
            const colorName = input.dataset.themeColor;
            const mapping = colorMappings[colorName];

            if (!mapping) {
                console.error(`❌ No mapping defined for: ${colorName}`);
                failureCount++;
                return;
            }

            console.log(`\n→ Resolving ${colorName} (${mapping.description}):`);

            // Try CSS variable first, then DOM elements
            const resolvedColor = resolveColor(
                mapping.cssVar,
                mapping.selectors,
                mapping.property
            );

            if (resolvedColor && resolvedColor !== '#000000') {
                // Success: set the color picker and display
                input.value = resolvedColor;
                const displayInput = document.getElementById('value' + colorName.charAt(0).toUpperCase() + colorName.slice(1));
                if (displayInput) {
                    displayInput.value = resolvedColor.toUpperCase();
                }
                console.log(`✓ SUCCESS: ${colorName} = ${resolvedColor}\n`);
                successCount++;
            } else {
                // Failed to resolve - show error but don't crash
                console.warn(`⚠ FAILED: Could not resolve color from CSS or DOM for ${colorName}\n`);
                input.value = '#cccccc'; // Gray fallback so it's not black
                const displayInput = document.getElementById('value' + colorName.charAt(0).toUpperCase() + colorName.slice(1));
                if (displayInput) {
                    displayInput.value = '#CCCCCC';
                }
                failureCount++;
            }
        });

        console.log(`\n=== COLOR LOADING COMPLETE ===`);
        console.log(`✓ Loaded: ${successCount} colors`);
        console.log(`⚠ Failed: ${failureCount} colors\n`);

        // Show message
        if (successCount > 0) {
            showMessage(`Loaded ${successCount} colors from theme`, 'success');
        } else if (failureCount > 0) {
            showMessage(`Warning: Only ${successCount} of ${successCount + failureCount} colors found`, 'warning');
        }
    }

    // ==================== COLOR INPUT HANDLERS ====================

    function setupColorInputs() {
        colorInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const colorName = e.target.dataset.themeColor;
                const cssVar = e.target.dataset.cssVar;
                const hexColor = toHex(e.target.value);

                if (cssVar) {
                    // Update CSS variable for live preview
                    document.documentElement.style.setProperty(cssVar, hexColor);

                    // Update display value
                    const valueInput = document.getElementById('value' + colorName.charAt(0).toUpperCase() + colorName.slice(1));
                    if (valueInput) {
                        valueInput.value = hexColor.toUpperCase();
                    }
                }
            });

            input.addEventListener('change', (e) => {
                const colorName = e.target.dataset.themeColor;
                const cssVar = e.target.dataset.cssVar;
                const hexColor = toHex(e.target.value);

                if (cssVar) {
                    document.documentElement.style.setProperty(cssVar, hexColor);

                    const valueInput = document.getElementById('value' + colorName.charAt(0).toUpperCase() + colorName.slice(1));
                    if (valueInput) {
                        valueInput.value = hexColor.toUpperCase();
                    }
                }
            });
        });
    }

    // ==================== PRESET THEMES ====================

    /**
     * Built-in preset themes
     */
    const PRESET_THEMES = {
        original: {
            name: 'Original',
            description: 'Default system theme',
            isSystemPreset: true,
            tags: ['light', 'corporate'],
            tokens: {
                '--color-header': '#4a7c95',
                '--color-primary': '#4a7c95',
                '--color-border': '#e3e9ed',
                '--color-text': '#1e293b',
                '--color-label-default': '#000000',
                '--color-label-mandatory': '#2563eb',
                '--color-label-conditional': '#000000',
                '--color-label-optional': '#94a3b8',
                '--label-font-family': "'Segoe UI', Tahoma, Arial, sans-serif",
                '--label-font-size': '12px',
                '--label-font-weight': '700'
            }
        },
        professional: {
            name: 'Professional Blue',
            description: 'Corporate blue theme',
            isSystemPreset: true,
            tags: ['light', 'corporate'],
            tokens: {
                '--color-header': '#2563eb',
                '--color-primary': '#3b82f6',
                '--color-border': '#e5e7eb',
                '--color-text': '#1f2937',
                '--color-label-default': '#3b82f6',
                '--color-label-mandatory': '#2563eb',
                '--color-label-conditional': '#f59e0b',
                '--color-label-optional': '#6b7280',
                '--label-font-family': "'Segoe UI', Tahoma, Arial, sans-serif",
                '--label-font-size': '12px',
                '--label-font-weight': '700'
            }
        },
        dark: {
            name: 'Dark Mode',
            description: 'True dark theme with layered surfaces',
            isSystemPreset: true,
            tags: ['dark'],
            tokens: {
                // Base Surfaces (layered dark architecture)
                '--color-bg-page': '#121212',
                '--color-bg-section': '#1B1B1B',
                '--color-bg-panel': '#1F1F1F',
                '--color-bg-elevated': '#252525',
                '--color-bg-input': '#2A2A2A',

                // Borders (opacity-based)
                '--color-border-subtle': 'rgba(255,255,255,0.06)',
                '--color-border-default': 'rgba(255,255,255,0.10)',
                '--color-border-strong': 'rgba(255,255,255,0.16)',

                // Text (opacity-based, never pure white)
                '--color-text-primary': 'rgba(255,255,255,0.87)',
                '--color-text-secondary': 'rgba(255,255,255,0.60)',
                '--color-text-muted': 'rgba(255,255,255,0.40)',

                // Legacy compatibility (mapped to new tokens)
                '--color-header': '#1F1F1F',
                '--color-primary': '#3b82f6',
                '--color-border': 'rgba(255,255,255,0.10)',
                '--color-text': 'rgba(255,255,255,0.87)',

                // Labels
                '--color-label-default': 'rgba(255,255,255,0.60)',
                '--color-label-mandatory': '#60a5fa',
                '--color-label-conditional': '#fbbf24',
                '--color-label-optional': 'rgba(255,255,255,0.40)',

                // Typography
                '--label-font-family': "'Segoe UI', Tahoma, Arial, sans-serif",
                '--label-font-size': '12px',
                '--label-font-weight': '700'
            }
        },
        green: {
            name: 'Green Accent',
            description: 'Environmental green theme',
            isSystemPreset: true,
            tags: ['light', 'corporate'],
            tokens: {
                '--color-header': '#059669',
                '--color-primary': '#10b981',
                '--color-border': '#d1fae5',
                '--color-text': '#064e3b',
                '--color-label-default': '#059669',
                '--color-label-mandatory': '#2563eb',
                '--color-label-conditional': '#d97706',
                '--color-label-optional': '#6b7280',
                '--label-font-family': "'Segoe UI', Tahoma, Arial, sans-serif",
                '--label-font-size': '12px',
                '--label-font-weight': '700'
            }
        },
        purple: {
            name: 'Purple Theme',
            description: 'Creative purple theme',
            isSystemPreset: true,
            tags: ['light', 'creative'],
            tokens: {
                '--color-header': '#7c3aed',
                '--color-primary': '#a855f7',
                '--color-border': '#e9d5ff',
                '--color-text': '#4c1d95',
                '--color-label-default': '#7c3aed',
                '--color-label-mandatory': '#2563eb',
                '--color-label-conditional': '#f59e0b',
                '--color-label-optional': '#6b7280',
                '--label-font-family': "'Segoe UI', Tahoma, Arial, sans-serif",
                '--label-font-size': '12px',
                '--label-font-weight': '700'
            }
        }
    };

    /**
     * Apply theme tokens to document
     * @param {Object} tokens - CSS variable key-value pairs
     */
    function applyTheme(tokens, options = {}) {
        const root = document.documentElement;
        const { smoothTransition = true } = options;

        if (!tokens || typeof tokens !== 'object') {
            console.error('Invalid tokens provided to applyTheme', tokens);
            return false;
        }

        try {
            console.log('🎨 Applying theme tokens:', tokens);

            // Detect if this is a dark theme based on tokens
            const isDarkTheme = tokens['--color-bg-page'] ||
                (tokens['--color-bg-section'] && tokens['--color-bg-section'].includes('#1B1B1B')) ||
                (tokens['--color-text-primary'] && tokens['--color-text-primary'].includes('rgba(255,255,255'));

            // Apply or remove dark-theme class
            if (isDarkTheme) {
                document.body.classList.add('dark-theme');
                // Also apply to parent window if in iframe
                try {
                    const parentWindow = window.parent || window.top;
                    if (parentWindow && parentWindow !== window && parentWindow.document) {
                        parentWindow.document.body.classList.add('dark-theme');
                    }
                } catch (e) { }
            } else {
                document.body.classList.remove('dark-theme');
                // Also remove from parent window if in iframe
                try {
                    const parentWindow = window.parent || window.top;
                    if (parentWindow && parentWindow !== window && parentWindow.document) {
                        parentWindow.document.body.classList.remove('dark-theme');
                    }
                } catch (e) { }
            }

            // Apply theme tokens (core function)
            const applyThemeTokens = () => {
                let appliedCount = 0;
                Object.entries(tokens).forEach(([key, value]) => {
                    if (key.startsWith('--')) {
                        try {
                            root.style.setProperty(key, value, 'important');
                            appliedCount++;
                            console.log(`✓ Set ${key} = ${value}`);
                        } catch (e) {
                            console.error(`✗ Failed to set ${key}:`, e.message);
                        }
                    }
                });

                // Also set title bar and search icon variables to match theme
                if (tokens['--color-header']) {
                    root.style.setProperty('--ktb-bg', tokens['--color-header'], 'important');
                    root.style.setProperty('--ktb-bg-dark', `color-mix(in srgb, ${tokens['--color-header']} 85%, black 15%)`, 'important');
                    root.style.setProperty('--am-primary', tokens['--color-header'], 'important');
                    root.style.setProperty('--am-primary-dark', `color-mix(in srgb, ${tokens['--color-header']} 85%, black 15%)`, 'important');
                    console.log(`✓ Set title bar and search icon colors from --color-header`);
                } else if (tokens['--color-primary']) {
                    root.style.setProperty('--ktb-bg', tokens['--color-primary'], 'important');
                    root.style.setProperty('--ktb-bg-dark', `color-mix(in srgb, ${tokens['--color-primary']} 85%, black 15%)`, 'important');
                    root.style.setProperty('--am-primary', tokens['--color-primary'], 'important');
                    root.style.setProperty('--am-primary-dark', `color-mix(in srgb, ${tokens['--color-primary']} 85%, black 15%)`, 'important');
                    console.log(`✓ Set title bar and search icon colors from --color-primary`);
                }

                return appliedCount;
            };

            // Apply theme with smooth transition
            if (smoothTransition) {
                // Add transition class for smooth theme change
                document.body.classList.add('theme-transitioning');

                // Apply theme changes with smooth fade
                requestAnimationFrame(() => {
                    // Fade out current theme
                    document.body.style.opacity = '0.85';
                    document.body.style.transition = 'opacity 0.25s ease-out';

                    // Apply theme changes mid-fade
                    setTimeout(() => {
                        const appliedCount = applyThemeTokens();

                        // Fade in new theme
                        requestAnimationFrame(() => {
                            document.body.style.transition = 'opacity 0.35s ease-in';
                            document.body.style.opacity = '1';

                            // Clean up after transition completes
                            setTimeout(() => {
                                document.body.classList.remove('theme-transitioning');
                                document.body.style.transition = '';
                                document.body.style.opacity = '';
                            }, 350);
                        });
                    }, 120);
                });
            } else {
                // Instant application (no transition)
                const appliedCount = applyThemeTokens();
            }

            let appliedCount = 0;
            Object.entries(tokens).forEach(([key, value]) => {
                if (key.startsWith('--')) {
                    appliedCount++;
                }
            });

            // Force a complete repaint
            // Trigger reflow/repaint
            void document.body.offsetHeight;

            // Force style recalculation on all elements using CSS variables
            const elementsToUpdate = document.querySelectorAll('[style*="var(--color"]');

            // Update elements that might have inline styles
            elementsToUpdate.forEach(el => {
                el.style.opacity = '0.99';
                setTimeout(() => { el.style.opacity = '1'; }, 5);
            });

            // Verify tokens were set (silent)

            // Also apply to parent window if we're in an iframe (with smooth transition)
            if (smoothTransition) {
                // Apply to parent after a short delay to sync with fade
                setTimeout(() => {
                    try {
                        const parentWindow = window.parent || window.top;
                        if (parentWindow && parentWindow !== window) {
                            // Add transition class to parent body
                            if (parentWindow.document && parentWindow.document.body) {
                                parentWindow.document.body.classList.add('theme-transitioning');
                                parentWindow.document.body.style.opacity = '0.85';
                                parentWindow.document.body.style.transition = 'opacity 0.25s ease-out';
                            }

                            // Try ThemeManager first
                            if (parentWindow.ThemeManager && typeof parentWindow.ThemeManager.applyThemeToDocument === 'function') {
                                parentWindow.ThemeManager.applyThemeToDocument(parentWindow.document, tokens, 'theme-config-apply');
                            } else if (parentWindow.document) {
                                // Fallback to direct style application
                                const parentRoot = parentWindow.document.documentElement;
                                Object.entries(tokens).forEach(([key, value]) => {
                                    if (key.startsWith('--')) {
                                        try {
                                            parentRoot.style.setProperty(key, value, 'important');
                                        } catch (e) {
                                            // Silent fail
                                        }
                                    }
                                });

                                // Also set title bar colors on parent
                                if (tokens['--color-header']) {
                                    parentRoot.style.setProperty('--ktb-bg', tokens['--color-header'], 'important');
                                    parentRoot.style.setProperty('--ktb-bg-dark', `color-mix(in srgb, ${tokens['--color-header']} 85%, black 15%)`, 'important');
                                    parentRoot.style.setProperty('--am-primary', tokens['--color-header'], 'important');
                                    parentRoot.style.setProperty('--am-primary-dark', `color-mix(in srgb, ${tokens['--color-header']} 85%, black 15%)`, 'important');
                                } else if (tokens['--color-primary']) {
                                    parentRoot.style.setProperty('--ktb-bg', tokens['--color-primary'], 'important');
                                    parentRoot.style.setProperty('--ktb-bg-dark', `color-mix(in srgb, ${tokens['--color-primary']} 85%, black 15%)`, 'important');
                                    parentRoot.style.setProperty('--am-primary', tokens['--color-primary'], 'important');
                                    parentRoot.style.setProperty('--am-primary-dark', `color-mix(in srgb, ${tokens['--color-primary']} 85%, black 15%)`, 'important');
                                }

                                console.log('✅ Theme also applied to parent window (direct)');
                            }

                            // Fade in parent theme
                            if (parentWindow.document && parentWindow.document.body) {
                                setTimeout(() => {
                                    parentWindow.document.body.style.transition = 'opacity 0.35s ease-in';
                                    parentWindow.document.body.style.opacity = '1';
                                    setTimeout(() => {
                                        parentWindow.document.body.classList.remove('theme-transitioning');
                                        parentWindow.document.body.style.transition = '';
                                        parentWindow.document.body.style.opacity = '';
                                    }, 350);
                                }, 120);
                            }
                        }
                    } catch (e) {
                        console.warn('Could not apply theme to parent window:', e.message);
                    }
                }, 120);
            } else {
                // Instant application to parent
                try {
                    const parentWindow = window.parent || window.top;
                    if (parentWindow && parentWindow !== window) {
                        if (parentWindow.ThemeManager && typeof parentWindow.ThemeManager.applyThemeToDocument === 'function') {
                            parentWindow.ThemeManager.applyThemeToDocument(parentWindow.document, tokens, 'theme-config-apply');
                        } else if (parentWindow.document) {
                            const parentRoot = parentWindow.document.documentElement;
                            Object.entries(tokens).forEach(([key, value]) => {
                                if (key.startsWith('--')) {
                                    try {
                                        parentRoot.style.setProperty(key, value, 'important');
                                    } catch (e) {
                                        console.warn(`Could not set ${key} on parent:`, e.message);
                                    }
                                }
                            });

                            if (tokens['--color-header']) {
                                parentRoot.style.setProperty('--ktb-bg', tokens['--color-header'], 'important');
                                parentRoot.style.setProperty('--ktb-bg-dark', `color-mix(in srgb, ${tokens['--color-header']} 85%, black 15%)`, 'important');
                                parentRoot.style.setProperty('--am-primary', tokens['--color-header'], 'important');
                                parentRoot.style.setProperty('--am-primary-dark', `color-mix(in srgb, ${tokens['--color-header']} 85%, black 15%)`, 'important');
                            } else if (tokens['--color-primary']) {
                                parentRoot.style.setProperty('--ktb-bg', tokens['--color-primary'], 'important');
                                parentRoot.style.setProperty('--ktb-bg-dark', `color-mix(in srgb, ${tokens['--color-primary']} 85%, black 15%)`, 'important');
                                parentRoot.style.setProperty('--am-primary', tokens['--color-primary'], 'important');
                                parentRoot.style.setProperty('--am-primary-dark', `color-mix(in srgb, ${tokens['--color-primary']} 85%, black 15%)`, 'important');
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Could not apply theme to parent window:', e.message);
                }
            }

            return appliedCount > 0;
        } catch (error) {
            console.error('❌ Error applying theme:', error);
            return false;
        }
    }

    let cachedActivePresetId = null;
    // Cache for current theme data loaded from database (not localStorage)
    let cachedThemeData = { settings: [], tokens: {}, preset: 'original', scope: 'BANK' };

    /**
     * Match settings from DB to a preset by comparing token values
     */
    function matchSettingsToPreset(settings) {
        if (!settings || !Array.isArray(settings)) return null;
        const tokensFromSettings = {};
        settings.forEach(s => {
            const key = s.SettingKey || s.settingKey;
            const value = s.SettingValue || s.settingValue;
            const cssVar = settingKeyToCssVar(key);
            if (cssVar && value) tokensFromSettings[cssVar] = value;
        });
        for (const [key, preset] of Object.entries(PRESET_THEMES)) {
            let match = true;
            for (const [cssVar, value] of Object.entries(preset.tokens)) {
                if (tokensFromSettings[cssVar] && tokensFromSettings[cssVar] !== value) {
                    match = false;
                    break;
                }
            }
            if (match && Object.keys(tokensFromSettings).length > 0) return key;
        }
        return null;
    }

    function settingKeyToCssVar(settingKey) {
        const mapping = {
            'Color.Header': '--color-header',
            'Color.Primary': '--color-primary',
            'Color.Border': '--color-border',
            'Color.Text': '--color-text',
            'Color.LabelDefault': '--color-label-default',
            'Color.LabelMandatory': '--color-label-mandatory',
            'Color.LabelConditional': '--color-label-conditional',
            'Color.LabelOptional': '--color-label-optional',
            'Label.FontFamily': '--label-font-family',
            'Label.FontSize': '--label-font-size',
            'Label.FontWeight': '--label-font-weight',
        };
        return mapping[settingKey] || null;
    }

    /**
     * Get currently active preset ID from database or cache
     */
    /**
     * Check if custom theme is active
     * Theme parameters come from database only, not localStorage
     */
    function isCustomThemeActive() {
        // Check cached preset ID or return false (theme comes from database)
        return cachedActivePresetId === 'custom';
    }

    function getActivePresetId() {
        // Return cached preset ID or default to 'original' (theme comes from database)
        return cachedActivePresetId || 'original';
    }

    /**
     * Load active theme from database and update cache
     * Persists settings and tokens to localStorage so theme-manager and label controls use them
     */
    /**
     * Load custom theme from settings if custom preset is detected
     */
    function loadCustomThemeFromSettings(settings) {
        if (!Array.isArray(settings)) return null;

        const customTokens = {};
        const colorKeys = ['--color-header', '--color-primary', '--color-border', '--color-text'];

        settings.forEach(setting => {
            const key = setting.SettingKey || setting.settingKey;
            const value = setting.SettingValue || setting.settingValue;
            const cssVar = settingKeyToCssVar(key);

            if (cssVar && colorKeys.includes(cssVar) && value) {
                customTokens[cssVar] = value;
            }
        });

        // Only return custom theme if we have at least one custom color
        if (Object.keys(customTokens).length > 0) {
            return customTokens;
        }

        return null;
    }

    async function loadActiveThemeFromDatabase(forceScope = null) {
        console.log('🎨 [THEME CONFIG] Loading active theme from database...');
        let resolvedScope = null;

        try {
            // AppCore is always available as it's loaded before this module
            if (!window.AppCore) {
                console.warn('⚠️ [THEME CONFIG] AppCore not available - cannot load theme');
                return null;
            }

            // Get the currently selected scope from UI, or use forceScope if provided
            const radio = document.querySelector('input[name="themeScope"]:checked');
            const selectedScope = forceScope || (radio && radio.value) || 'BANK';
            console.log('🎯 [THEME CONFIG] Using scope:', selectedScope, forceScope ? '(forced)' : '(from radio)');

            // Controller will resolve UserId, BankId, BranchId from session (auth_user, bank_id, branch_id)
            const requestData = {
                ScopeType: selectedScope,
                ScopeRefID: "DEFAULT"
            };
            console.log('📤 [THEME CONFIG] ============================================');
            console.log('📤 [THEME CONFIG] CALLING API: ThemeConfiguration/get-effective-theme');
            console.log('📤 [THEME CONFIG] Selected Scope:', selectedScope);
            console.log('📤 [THEME CONFIG] Request Data:', JSON.stringify(requestData, null, 2));
            console.log('📤 [THEME CONFIG] Note: Controller will resolve UserId, BankId, BranchId from session');
            console.log('📤 [THEME CONFIG] AppCore available:', !!window.AppCore);
            console.log('📤 [THEME CONFIG] ============================================');

            if (!window.AppCore) {
                console.error('❌ [THEME CONFIG] CRITICAL: AppCore is not available - cannot call API!');
                return null;
            }

            console.log('🔄 [THEME CONFIG] ⏳ Making API call NOW...');
            console.log('🔄 [THEME CONFIG] Calling AppCore.invokeControllerAsync with:', JSON.stringify(requestData));
            let response;
            try {
                console.log('🔄 [THEME CONFIG] About to await AppCore.invokeControllerAsync...');
                console.log(requestData);
                response = await window.AppCore.invokeControllerAsync('ThemeConfiguration/get-effective-theme', requestData);
                console.log('🔄 [THEME CONFIG] ✅ API call completed, response:', response);
            } catch (apiError) {
                console.error('❌ [THEME CONFIG] API call FAILED:', apiError);
                console.error('❌ [THEME CONFIG] Error details:', {
                    message: apiError?.message,
                    stack: apiError?.stack,
                    name: apiError?.name
                });
                throw apiError; // Re-throw so caller knows it failed
            }
            console.log('📥 [THEME CONFIG] API Response received:', response);
            console.log('📥 [THEME CONFIG] API Response type:', typeof response);
            console.log('📥 [THEME CONFIG] API Response keys:', response ? Object.keys(response) : 'null/undefined');

            if (!response) {
                console.warn('⚠️ [THEME CONFIG] No response from API');
                return null;
            }

            // Support response.Data, response.data, or response.Details (normalized API shapes)
            let rawData = response.Data || response.data || response.Details || response.details;
            if (!rawData) {
                console.warn('⚠️ [THEME CONFIG] No Data/Details in response:', response);
                return null;
            }
            // Unwrap nested result set (e.g. { Details: [ row ] } or { Table1: [ row ] })
            if (typeof rawData === 'object' && !Array.isArray(rawData)) {
                const arr = rawData.Details || rawData.details || Object.values(rawData).find(function (v) { return Array.isArray(v) && v.length > 0; });
                if (arr && arr.length) rawData = arr;
            }
            const themeData = Array.isArray(rawData) && rawData.length > 0 ? rawData[0] : rawData;
            console.log('✅ [THEME CONFIG] Theme row resolved:', themeData ? 'ThemeID ' + (themeData.ThemeID || themeData.themeID) : 'none');

            if (response && themeData) {

                // Resolve effective theme scope from database/API (check all possible response shapes)
                resolvedScope = resolveScopeFromApiResponse(response, themeData);
                console.log('🎯 [THEME CONFIG] Resolved scope from API:', resolvedScope);

                if (!resolvedScope) {
                    console.warn('⚠️ [THEME CONFIG] Could not resolve scope from API response');
                }
                let settings = [];
                if (themeData.SettingsJson) {
                    console.log('📋 [THEME CONFIG] SettingsJson found, parsing...');
                    settings = typeof themeData.SettingsJson === 'string'
                        ? JSON.parse(themeData.SettingsJson) : themeData.SettingsJson;
                    console.log('✅ [THEME CONFIG] Parsed', settings.length, 'settings from database');
                } else {
                    console.warn('⚠️ [THEME CONFIG] No SettingsJson in themeData');
                }

                const matchedPreset = matchSettingsToPreset(settings);
                if (matchedPreset) {
                    console.log('🎯 [THEME CONFIG] Matched preset:', matchedPreset);
                    cachedActivePresetId = matchedPreset;
                }

                // Build tokens from settings and persist to localStorage for theme-manager and label controls
                if (settings.length > 0) {
                    console.log('🔨 [THEME CONFIG] Building tokens from', settings.length, 'settings...');
                    const tokens = {};
                    settings.forEach(s => {
                        const key = s.SettingKey || s.settingKey;
                        const value = s.SettingValue || s.settingValue;
                        const cssVar = settingKeyToCssVar(key);
                        if (cssVar && value) tokens[cssVar] = value;
                    });
                    // Migrate old label colors (red/orange) to correct semantics (blue = mandatory, black = conditional)
                    const oldMandatory = toHex('#ef4444');
                    const oldConditional = toHex('#f59e0b');
                    const migratedSettings = settings.map(s => {
                        const key = s.SettingKey || s.settingKey;
                        const value = s.SettingValue || s.settingValue;
                        if (key === 'Color.LabelMandatory' && value && toHex(value) === oldMandatory) {
                            return Object.assign({}, s, { SettingValue: '#2563eb' });
                        }
                        if (key === 'Color.LabelConditional' && value && toHex(value) === oldConditional) {
                            return Object.assign({}, s, { SettingValue: '#1e293b' });
                        }
                        return s;
                    });
                    if (tokens['--color-label-mandatory'] && toHex(tokens['--color-label-mandatory']) === oldMandatory) {
                        tokens['--color-label-mandatory'] = '#2563eb';
                    }
                    if (tokens['--color-label-conditional'] && toHex(tokens['--color-label-conditional']) === oldConditional) {
                        tokens['--color-label-conditional'] = '#1e293b';
                    }
                    // Check if custom theme is active before matching preset
                    const customTokens = loadCustomThemeFromSettings(migratedSettings);
                    const isCustom = customTokens && Object.keys(customTokens).length >= 4;
                    const presetName = isCustom ? 'custom' : (matchedPreset || 'original');

                    // Cache theme data for use by other functions (loadLabelSettingsIntoControls, etc.)
                    cachedThemeData = {
                        settings: migratedSettings,
                        tokens: tokens,
                        preset: presetName,
                        scope: resolvedScope || 'BANK'
                    };

                    console.log('✅ [THEME CONFIG] Theme loaded from database:', {
                        settingsCount: migratedSettings.length,
                        tokensCount: Object.keys(tokens).length,
                        preset: presetName,
                        scope: resolvedScope || 'BANK'
                    });
                    applyFormRowHoverFromSettings(migratedSettings);
                    applyCompactFromSettings(migratedSettings);
                    // Apply glassmorphism - default to enabled if not in settings
                    const glassEnabled = getGlassmorphismFromSettings(migratedSettings);
                    applyGlassmorphismFromSettings(migratedSettings);
                    // Glassmorphism is always enabled
                    applyGlassmorphismToDocuments(true);
                    // Apply label tokens immediately when loading from database (applyLabelTokens is recursive)
                    // Always include font settings (use defaults if not in tokens)
                    const labelTokens = {
                        '--label-font-family': tokens['--label-font-family'] || "'Segoe UI', Tahoma, Arial, sans-serif",
                        '--label-font-size': tokens['--label-font-size'] || '12px',
                        '--label-font-weight': tokens['--label-font-weight'] || '700'
                    };
                    Object.keys(tokens).forEach(key => {
                        if (key.startsWith('--label-') || key.startsWith('--color-label-')) {
                            labelTokens[key] = tokens[key];
                        }
                    });
                    if (Object.keys(labelTokens).length > 0) {
                        applyLabelTokens(labelTokens);
                    }

                    // Apply theme tokens globally for the selected scope (USER or BANK)
                    if (window.ThemeManager && typeof window.ThemeManager.applyThemeGlobally === 'function') {
                        window.ThemeManager.applyThemeGlobally(tokens);
                    } else {
                        // Fallback: apply directly
                        applyTheme(tokens, { smoothTransition: false });
                    }
                }
            }

            // If no theme found in database, load default theme
            if (!response || !themeData || !themeData.SettingsJson) {
                console.log('ℹ️ [THEME CONFIG] No theme found in database, loading default theme');
                const defaultPreset = PRESET_THEMES['original'];
                if (defaultPreset) {
                    const defaultTokens = defaultPreset.tokens || {};
                    const defaultSettings = [];
                    Object.entries(defaultTokens).forEach(([cssVar, value]) => {
                        const settingKey = cssVarToSettingKey(cssVar);
                        if (settingKey) {
                            const valueType = cssVar.startsWith('--color-') ? 'COLOR' : 'STRING';
                            defaultSettings.push({
                                SettingKey: settingKey,
                                SettingValue: value,
                                ValueType: valueType
                            });
                        }
                    });

                    // Cache default theme data
                    cachedThemeData = {
                        settings: defaultSettings,
                        tokens: defaultTokens,
                        preset: 'original',
                        scope: resolvedScope || 'BANK'
                    };

                    // Apply default theme
                    if (window.ThemeManager && typeof window.ThemeManager.applyThemeGlobally === 'function') {
                        window.ThemeManager.applyThemeGlobally(defaultTokens);
                    } else {
                        applyTheme(defaultTokens, { smoothTransition: false });
                    }

                    cachedActivePresetId = 'original';
                }
            }

            // Return the resolved scope so it can be used to restore the radio button
            return resolvedScope;
        } catch (e) {
            return null;
        }
    }

    const FORM_ROW_HOVER_KEY = 'Behaviour.FormRowHover';
    const COMPACT_VIEW_KEY = 'Behaviour.CompactView';
    const GLASSMORPHISM_KEY = 'Enhancement.Glassmorphism';

    /** Apply micro-interactions-enabled to current document and parent/top (so main app gets it when theme config is in an iframe) */
    function applyFormRowHoverToDocuments(enabled) {
        // Toggle both classes for backward compatibility
        document.body.classList.toggle('form-row-hover-on', enabled);
        document.body.classList.toggle('micro-interactions-enabled', enabled);
        try {
            const parentWindow = window.parent || window.top;
            if (parentWindow && parentWindow !== window && parentWindow.document && parentWindow.document.body) {
                parentWindow.document.body.classList.toggle('form-row-hover-on', enabled);
                parentWindow.document.body.classList.toggle('micro-interactions-enabled', enabled);

                // Also apply to all iframes in parent
                const applyToAllIframes = (doc) => {
                    const allIframes = doc.querySelectorAll('iframe');
                    allIframes.forEach((iframe) => {
                        try {
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                            if (iframeDoc && iframeDoc !== doc && iframeDoc.body) {
                                iframeDoc.body.classList.toggle('micro-interactions-enabled', enabled);
                                applyToAllIframes(iframeDoc);
                            }
                        } catch (e) {
                            // Cross-origin iframes - expected
                        }
                    });
                };
                applyToAllIframes(parentWindow.document);
            }
        } catch (e) { /* same-origin only */ }
    }

    function getFormRowHoverFromSettings(settings) {
        if (!Array.isArray(settings)) return true;
        const s = settings.find(x => (x.SettingKey || x.settingKey) === FORM_ROW_HOVER_KEY);
        const v = s ? (s.SettingValue || s.settingValue) : null;
        return v === undefined || v === null || String(v).toLowerCase() === 'true';
    }

    function applyFormRowHoverFromSettings(settings) {
        const enabled = getFormRowHoverFromSettings(settings);
        applyFormRowHoverToDocuments(enabled);
        const formRowHoverCheck = document.getElementById('formRowHoverEffect');
        if (formRowHoverCheck) formRowHoverCheck.checked = enabled;
    }

    function getCompactFromSettings(settings) {
        // Compact view is always enabled by default (Layout section removed)
        return true;
    }

    function applyCompactFromSettings(settings) {
        // Compact view is always enabled
        const enabled = true;
        document.body.classList.toggle('theme-compact-view', enabled);
        try {
            const parentWindow = window.parent || window.top;
            if (parentWindow && parentWindow !== window && parentWindow.document && parentWindow.document.body) {
                parentWindow.document.body.classList.toggle('theme-compact-view', enabled);
            }
        } catch (e) { /* same-origin only */ }
        // Checkbox removed - compact view always enabled
    }

    function getGlassmorphismFromSettings(settings) {
        if (!Array.isArray(settings)) return true; // Default to enabled
        const s = settings.find(x => (x.SettingKey || x.settingKey) === GLASSMORPHISM_KEY);
        const v = s ? (s.SettingValue || s.settingValue) : null;
        // Default to true if not explicitly set to false
        if (v === undefined || v === null) return true;
        return String(v).toLowerCase() === 'true';
    }

    function applyGlassmorphismToDocuments(enabled) {
        // Apply to current document
        document.body.classList.toggle('glass-enabled', enabled);

        // Apply to parent window if in iframe
        try {
            const parentWindow = window.parent || window.top;
            if (parentWindow && parentWindow !== window && parentWindow.document && parentWindow.document.body) {
                parentWindow.document.body.classList.toggle('glass-enabled', enabled);

                // Also apply to all iframes in parent
                const applyToAllIframes = (doc) => {
                    const allIframes = doc.querySelectorAll('iframe');
                    allIframes.forEach((iframe) => {
                        try {
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                            if (iframeDoc && iframeDoc !== doc && iframeDoc.body) {
                                iframeDoc.body.classList.toggle('glass-enabled', enabled);
                                applyToAllIframes(iframeDoc);
                            }
                        } catch (e) {
                            // Cross-origin iframes - expected
                        }
                    });
                };
                applyToAllIframes(parentWindow.document);
            }
        } catch (e) { /* same-origin only */ }

        // Use ThemeManager if available for global application
        try {
            const parentWin = window.parent && window.parent !== window ? window.parent : window;
            if (parentWin && parentWin !== window && parentWin.ThemeManager && typeof parentWin.ThemeManager.applyGlassmorphism === 'function') {
                parentWin.ThemeManager.applyGlassmorphism(enabled);
            }
        } catch (e) {
            // ThemeManager not available or cross-origin
        }
    }

    function applyGlassmorphismFromSettings(settings) {
        // Glassmorphism is always enabled - ignore settings
        applyGlassmorphismToDocuments(true);
    }

    function mergeGlassmorphismIntoStoredTheme(enabled) {
        // Glassmorphism is always enabled - always save as true
        try {
            const stored = JSON.parse(localStorage.getItem('kairo_theme_preset') || '{}');
            const settings = Array.isArray(stored.settings) ? stored.settings.slice() : [];
            const existing = settings.findIndex(x => (x.SettingKey || x.settingKey) === GLASSMORPHISM_KEY);
            const entry = { SettingKey: GLASSMORPHISM_KEY, SettingValue: 'true', ValueType: 'BOOLEAN' };
            if (existing >= 0) settings[existing] = entry;
            else settings.push(entry);
            stored.settings = settings;
            localStorage.setItem('kairo_theme_preset', JSON.stringify(stored));
        } catch (e) { /* ignore */ }
    }

    function applyFormRowHoverFromStored() {
        try {
            const stored = JSON.parse(localStorage.getItem('kairo_theme_preset') || '{}');
            const settings = stored.settings || [];
            applyFormRowHoverFromSettings(settings);
            applyCompactFromSettings(settings);
        } catch (e) {
            applyFormRowHoverToDocuments(true);
            const formRowHoverCheck = document.getElementById('formRowHoverEffect');
            if (formRowHoverCheck) formRowHoverCheck.checked = true;
        }
    }

    function mergeFormRowHoverIntoStoredTheme(enabled) {
        try {
            const stored = JSON.parse(localStorage.getItem('kairo_theme_preset') || '{}');
            const settings = Array.isArray(stored.settings) ? stored.settings.slice() : [];
            const existing = settings.findIndex(x => (x.SettingKey || x.settingKey) === FORM_ROW_HOVER_KEY);
            const entry = { SettingKey: FORM_ROW_HOVER_KEY, SettingValue: enabled ? 'true' : 'false', ValueType: 'BOOLEAN' };
            if (existing >= 0) settings[existing] = entry;
            else settings.push(entry);
            stored.settings = settings;
            localStorage.setItem('kairo_theme_preset', JSON.stringify(stored));
        } catch (e) { /* ignore */ }
    }

    function mergeCompactIntoStoredTheme(enabled) {
        try {
            const stored = JSON.parse(localStorage.getItem('kairo_theme_preset') || '{}');
            const settings = Array.isArray(stored.settings) ? stored.settings.slice() : [];
            const existing = settings.findIndex(x => (x.SettingKey || x.settingKey) === COMPACT_VIEW_KEY);
            const entry = { SettingKey: COMPACT_VIEW_KEY, SettingValue: enabled ? 'true' : 'false', ValueType: 'BOOLEAN' };
            if (existing >= 0) settings[existing] = entry;
            else settings.push(entry);
            stored.settings = settings;
            localStorage.setItem('kairo_theme_preset', JSON.stringify(stored));
        } catch (e) { /* ignore */ }
    }

    /**
     * Deduplicate settings array by SettingKey, keeping the last occurrence of each key
     * @param {Array} settings - Array of setting objects
     * @returns {Array} Deduplicated settings array
     */
    function deduplicateSettings(settings) {
        if (!Array.isArray(settings)) return [];
        const keyToSetting = new Map();
        const keyOrder = [];

        // First pass: collect all settings, keeping last value for each key
        settings.forEach(setting => {
            const key = setting?.SettingKey || setting?.settingKey;
            if (key) {
                if (!keyToSetting.has(key)) {
                    keyOrder.push(key);
                }
                keyToSetting.set(key, setting);
            }
        });

        // Return in order of first occurrence, but with last value
        return keyOrder.map(key => keyToSetting.get(key));
    }

    /**
     * Save current behaviour toggles (Form row hover, Compact view) to database.
     * @returns {Promise<{ success: boolean, message?: string }>}
     */
    async function saveBehaviourSettingsToDatabase() {
        const stored = JSON.parse(localStorage.getItem('kairo_theme_preset') || '{}');
        let settings = Array.isArray(stored.settings) ? stored.settings.slice() : [];
        const formRowHoverCheck = document.getElementById('formRowHoverEffect');
        // Compact view is always enabled by default (Layout section removed)
        const formRowHoverEnabled = formRowHoverCheck ? formRowHoverCheck.checked : true;
        const compactEnabled = true; // Always enabled

        if (settings.length === 0) {
            const defaultPreset = PRESET_THEMES.original || Object.values(PRESET_THEMES)[0];
            if (defaultPreset && defaultPreset.tokens) {
                Object.entries(defaultPreset.tokens).forEach(([cssVar, value]) => {
                    const settingKey = cssVarToSettingKey(cssVar);
                    if (settingKey && settingKey !== cssVar) {
                        const valueType = cssVar.startsWith('--color-') ? 'COLOR' : 'STRING';
                        settings.push({ SettingKey: settingKey, SettingValue: value, ValueType: valueType });
                    }
                });
            }
        }

        function upsertSetting(key, value) {
            const entry = { SettingKey: key, SettingValue: value ? 'true' : 'false', ValueType: 'BOOLEAN' };
            const idx = settings.findIndex(x => (x.SettingKey || x.settingKey) === key);
            if (idx >= 0) settings[idx] = entry;
            else settings.push(entry);
        }
        upsertSetting(FORM_ROW_HOVER_KEY, formRowHoverEnabled);
        upsertSetting(COMPACT_VIEW_KEY, compactEnabled);

        // Glassmorphism is always enabled
        upsertSetting(GLASSMORPHISM_KEY, true);

        // Deduplicate settings array before sending to database to prevent MERGE errors
        settings = deduplicateSettings(settings);

        const presetId = stored.preset || 'original';
        const preset = PRESET_THEMES[presetId];
        const themeName = preset ? preset.name : 'Custom Theme';

        const scope = getThemeScope();
        const requestData = {
            ScopeType: scope.ScopeType,
            ThemeName: themeName ? themeName : preset.name,
            SettingsJson: settings, //JSON.stringify(settings),
            ScopeRefID: scope.ScopeRefID == undefined || scope.ScopeRefID == "" ? "DEFAULT" : scope.ScopeRefID
        };
        console.log(requestData);
        const result = await saveThemeSettingsToDatabase(requestData);
        return { success: result.success, message: result.message };
    }

    /**
     * Render preset theme cards
     * @param {string} filter - 'all' | 'light' | 'dark' | 'corporate' | 'creative'
     */
    function renderPresetThemes(filter) {
        const container = document.getElementById('presetsContainer');
        if (!container) return;

        const activeId = getActivePresetId();
        filter = filter || 'all';

        let entries = Object.entries(PRESET_THEMES);
        if (filter !== 'all') {
            entries = entries.filter(([, preset]) => preset.tags && preset.tags.includes(filter));
        }

        container.innerHTML = '';

        entries.forEach(([key, preset]) => {
            const isActive = key === activeId;
            const colorKeys = ['--color-header', '--color-primary', '--color-border', '--color-text'];
            const colors = colorKeys.map(k => preset.tokens[k] || '#ccc');
            const card = document.createElement('div');
            card.className = 'col-6 col-md-4 col-lg-3';

            card.innerHTML = `
        <div class="preset-theme-card ${isActive ? 'is-active' : ''}" data-preset-id="${key}">
          <div class="preset-theme-card-body">
            <h6 class="preset-theme-name">${preset.name}</h6>
            <p class="preset-theme-description">${preset.description}</p>
            <div class="preset-color-swatches">
              ${colors.map(c => `<div class="preset-color-swatch" style="background-color:${c || '#ccc'}"></div>`).join('')}
            </div>
            ${isActive ?
                    '<div class="preset-active-indicator"><i class="bi bi-check-circle-fill"></i> Active Theme</div>' :
                    '<button type="button" class="btn btn-primary preset-apply-btn" data-preset-id="' + key + '">Apply</button>'
                }
          </div>
        </div>
      `;

            const applyBtn = card.querySelector('.preset-apply-btn');
            if (applyBtn && !isActive) {
                applyBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Show "Applying..." state
                    const originalText = applyBtn.innerHTML;
                    applyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Applying...';
                    applyBtn.disabled = true;

                    try {
                        await applyPresetTheme(key);
                    } finally {
                        // Button will be removed/replaced by re-render, but keep disabled state during transition
                        setTimeout(() => {
                            if (applyBtn.parentElement) {
                                applyBtn.innerHTML = originalText;
                                applyBtn.disabled = false;
                            }
                        }, 200);
                    }
                });
            }

            container.appendChild(card);
        });
    }

    /**
     * Setup filter tabs and toolbar
     */
    function setupThemeFilters() {
        const tabs = document.querySelectorAll('.theme-filter-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderPresetThemes(tab.dataset.filter || 'all');
            });
        });

        // Compact view is always enabled - checkbox removed (Layout section hidden)
        // Always apply compact view class
        const compactEnabled = true;
        document.body.classList.add('theme-compact-view');
        try {
            const parentWindow = window.parent || window.top;
            if (parentWindow && parentWindow !== window && parentWindow.document && parentWindow.document.body) {
                parentWindow.document.body.classList.add('theme-compact-view');
            }
        } catch (e) { /* same-origin only */ }
        // Ensure compact view is saved as enabled
        mergeCompactIntoStoredTheme(compactEnabled);

        // Glassmorphism is always enabled - no toggle needed
        applyGlassmorphismToDocuments(true);

        const formRowHoverCheck = document.getElementById('formRowHoverEffect');
        if (formRowHoverCheck) {
            applyFormRowHoverFromStored();
            formRowHoverCheck.addEventListener('change', async () => {
                const enabled = formRowHoverCheck.checked;
                applyFormRowHoverToDocuments(enabled);
                mergeFormRowHoverIntoStoredTheme(enabled);
                const result = await saveBehaviourSettingsToDatabase();
                if (result.success) showMessage('Micro-interactions setting saved to database.', 'success');
                else showMessage(result.message || 'Failed to save.', 'error');
            });
        }
    }

    /**
     * Validate theme save request data
     * @param {Object} requestData - The data to validate
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    function validateThemeSaveRequest(requestData) {
        const errors = [];

        if (!requestData) {
            errors.push('Request data is null or undefined');
            return { valid: false, errors };
        }

        // Check required fields; only USER and BANK are allowed (no SYSTEM)
        if (!requestData.ScopeType) {
            errors.push('ScopeType is required (USER or BANK)');
        } else if (String(requestData.ScopeType).toUpperCase() === 'SYSTEM') {
            errors.push('ScopeType must be USER or BANK only; SYSTEM is not supported');
        }

        if (requestData.ScopeRefID === null || requestData.ScopeRefID === undefined) {
            errors.push('ScopeRefID is required');
        } else {
            // Validate ScopeRefID based on ScopeType
            if (requestData.ScopeType === 'USER') {
                // Accept both numeric and string user IDs (e.g., "CSADM" or 123)
                const scopeRefId = requestData.ScopeRefID;
                if (!scopeRefId || scopeRefId === '0' || scopeRefId === 0) {
                    errors.push('ScopeRefID must be a valid User ID (cannot be 0 or empty) for USER scope');
                } else {
                    // If it's numeric, ensure it's > 0
                    const numericId = parseInt(scopeRefId, 10);
                    if (!isNaN(numericId) && numericId === 0) {
                        errors.push('ScopeRefID must be a valid User ID (cannot be 0) for USER scope');
                    }
                }
            } else if (requestData.ScopeType === 'BANK') {
                if (!requestData.ScopeRefID || requestData.ScopeRefID === '0' || requestData.ScopeRefID === 0) {
                    errors.push('ScopeRefID must be a valid Bank ID (cannot be 0 or empty) for BANK scope');
                }
            }
        }

        if (!requestData.ThemeName) {
            errors.push('ThemeName is required');
        }

        if (!requestData.SettingsJson) {
            errors.push('SettingsJson is required');
        }

        //if (requestData.OperatorID === null || requestData.OperatorID === undefined || requestData.OperatorID === 0 || requestData.OperatorID === '0') {
        //    errors.push('OperatorID is required and must be a valid user ID (cannot be 0 or empty) - ensure user is logged in');
        //}

        // Validate SettingsJson format
        if (requestData.SettingsJson) {
            try {
                const settings = typeof requestData.SettingsJson === 'string'
                    ? JSON.parse(requestData.SettingsJson)
                    : requestData.SettingsJson;

                if (!Array.isArray(settings)) {
                    errors.push('SettingsJson must be a JSON array of setting objects');
                } else if (settings.length === 0) {
                    errors.push('SettingsJson cannot be empty');
                } else {
                    // Validate each setting object
                    settings.forEach((setting, idx) => {
                        if (!setting.SettingKey) {
                            errors.push(`Setting[${idx}]: SettingKey is required`);
                        }
                        if (!setting.SettingValue) {
                            errors.push(`Setting[${idx}]: SettingValue is required`);
                        }
                        if (!setting.ValueType) {
                            errors.push(`Setting[${idx}]: ValueType is required`);
                        }
                    });
                }
            } catch (parseError) {
                errors.push(`SettingsJson is not valid JSON: ${parseError.message}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Resolve ThemeService from current window or parent (when in iframe)
     */
    function getThemeService() {
        const win = window;
        const parentWin = win.parent && win.parent !== win ? win.parent : null;
        const topWin = win.top && win.top !== win ? win.top : null;
        const svc = win.ThemeService || win.themeService ||
            (parentWin && (parentWin.ThemeService || parentWin.themeService)) ||
            (topWin && (topWin.ThemeService || topWin.themeService));
        return svc || null;
    }

    /**
     * Save theme settings to database
     * Uses database as the single source of truth. No localStorage fallback.
     */
    async function saveThemeSettingsToDatabase(requestData) {
        console.log('🎨 [THEME SAVE] Saving to database...');

        const validation = validateThemeSaveRequest(requestData);
        if (!validation.valid) {
            console.error('❌ [VALIDATION ERROR] Request data validation failed:', validation.errors);
            console.error('❌ [VALIDATION ERROR] Request data:', {
                ScopeType: requestData.ScopeType,
                ScopeRefID: requestData.ScopeRefID,
                ThemeName: requestData.ThemeName,
                //OperatorID: requestData.OperatorID,
                SettingsJsonLength: requestData.SettingsJson ? (typeof requestData.SettingsJson === 'string' ? requestData.SettingsJson.length : JSON.stringify(requestData.SettingsJson).length) : 0
            });
            return {
                success: false,
                message: 'Request validation failed',
                errors: validation.errors,
                method: 'validation'
            };
        }

        // Normalize and validate SettingsJson before sending to database
        try {
            let settingsJson = requestData.SettingsJson;

            // If SettingsJson is already a string, parse it to validate and normalize
            if (settingsJson && typeof settingsJson === 'string') {
                try {
                    const settings = JSON.parse(settingsJson);
                    if (Array.isArray(settings)) {
                        // Deduplicate settings
                        const deduplicated = deduplicateSettings(settings);
                        if (deduplicated.length !== settings.length) {
                            console.log(`🔧 [DEDUPLICATION] Removed ${settings.length - deduplicated.length} duplicate setting(s)`);
                        }
                        // Re-stringify to ensure proper JSON formatting (handles quotes, escapes, etc.)
                        requestData.SettingsJson = JSON.stringify(deduplicated);
                    } else {
                        console.error('❌ SettingsJson is not an array after parsing');
                        return {
                            success: false,
                            message: 'SettingsJson must be a JSON array',
                            method: 'validation'
                        };
                    }
                } catch (parseError) {
                    console.error('❌ SettingsJson is not valid JSON:', parseError);
                    return {
                        success: false,
                        message: `SettingsJson is not valid JSON: ${parseError.message}`,
                        method: 'validation'
                    };
                }
            } else if (settingsJson && Array.isArray(settingsJson)) {
                // If SettingsJson is already an array, stringify it
                const deduplicated = deduplicateSettings(settingsJson);
                /*requestData.SettingsJson = JSON.stringify(deduplicated);*/
                requestData.SettingsJson = deduplicated;
            } else {
                console.error('❌ SettingsJson is missing or invalid type:', typeof settingsJson);
                return {
                    success: false,
                    message: 'SettingsJson must be a JSON string or array',
                    method: 'validation'
                };
            }

            //// Final validation: ensure SettingsJson is a valid JSON string
            //try {
            //    const testParse = JSON.parse(requestData.SettingsJson);
            //    if (!Array.isArray(testParse)) {
            //        return {
            //            success: false,
            //            message: 'SettingsJson must be a JSON array',
            //            method: 'validation'
            //        };
            //    }
            //} catch (finalCheckError) {
            //    console.error('❌ Final SettingsJson validation failed:', finalCheckError);
            //    return {
            //        success: false,
            //        message: `SettingsJson validation failed: ${finalCheckError.message}`,
            //        method: 'validation'
            //    };
            //}
        } catch (e) {
            console.error('❌ Error normalizing SettingsJson:', e);
            return {
                success: false,
                message: `Error preparing SettingsJson: ${e.message}`,
                method: 'validation'
            };
        }

        const appCore = window.AppCore;
        if (!appCore || typeof appCore.invokeControllerAsync !== 'function') {
            console.warn('⚠️ AppCore.invokeControllerAsync not available');
            return {
                success: false,
                message: 'AppCore not available. Ensure app-core.js is loaded.',
                method: 'none'
            };
        }

        try {
            // Log SettingsJson before sending (first 500 chars to avoid huge logs)
            const jsonPreview = requestData.SettingsJson ?
                (requestData.SettingsJson.length > 500 ? requestData.SettingsJson.substring(0, 500) + '...' : requestData.SettingsJson) :
                'MISSING';
            console.log('📤 [THEME SAVE] Sending theme settings to database:', {
                ScopeType: requestData.ScopeType,
                ScopeRefID: requestData.ScopeRefID,
                ThemeName: requestData.ThemeName,
                OperatorID: requestData.OperatorID,
                SettingsJsonLength: requestData.SettingsJson?.length || 0
            });
            console.log('📤 [THEME SAVE] SettingsJson (preview):', jsonPreview);

            console.log('📤 [THEME SAVE] Calling AppCore.invokeControllerAsync API with:', {
                ScopeType: requestData.ScopeType,
                ScopeRefID: requestData.ScopeRefID,
                ThemeName: requestData.ThemeName,
                OperatorID: requestData.OperatorID,
                SettingsJsonLength: requestData.SettingsJson?.length || 0,
                SettingsCount: requestData.SettingsJson ? (requestData.SettingsJson.length || 0) : 0
            });

            const response = await window.AppCore.invokeControllerAsync('ThemeConfiguration/save-theme', requestData);

            console.log('📥 [THEME SAVE] Raw API response:', response);
            console.log('📥 [THEME SAVE] Response type:', typeof response);
            console.log('📥 [THEME SAVE] Response keys:', response ? Object.keys(response) : 'null/undefined');
            console.log('📥 [THEME SAVE] Full response JSON:', JSON.stringify(response, null, 2));

            // Check multiple possible success indicators
            // CoreApi might return response.data or response.Data, or the response might be the data directly
            const responseData = response?.data || response?.Data || response;

            const ok = response && (
                response.success === true ||
                response.Success === true ||
                responseData?.success === true ||
                responseData?.Success === true ||
                String(response.code) === '00' ||
                String(response.ResponseCode) === '00' ||
                String(response.responseCode) === '00' ||
                String(responseData?.code) === '00' ||
                String(responseData?.ResponseCode) === '00' ||
                String(responseData?.responseCode) === '00' ||
                String(response.status) === '200' ||
                String(response.Status) === '200' ||
                (response.data && (response.data.success === true || response.data.Success === true)) ||
                (response.Data && (response.Data.success === true || response.Data.Success === true))
            );

            console.log('📥 [THEME SAVE] Response data extracted:', responseData);
            console.log('📥 [THEME SAVE] Success check result:', ok);

            const errorMsg = response?.message || response?.ErrorMessage || response?.Message ||
                response?.ResponseMessage || response?.error || response?.Error ||
                (response?.data && (response.data.message || response.data.Message || response.data.ErrorMessage)) ||
                (response?.Data && (response.Data.message || response.Data.Message || response.Data.ErrorMessage)) ||
                'Unknown error';

            console.log('📦 [THEME SAVE] Database response analysis:', {
                rawResponse: response,
                success: response?.success,
                Success: response?.Success,
                code: response?.code,
                //ResponseCode: response?.ResponseCode,
                ResponseCode: response?.responseCode,
                status: response?.status,
                Status: response?.Status,
                message: response?.message,
                Message: response?.Message,
                ErrorMessage: response?.ErrorMessage,
                data: response?.data,
                Data: response?.Data,
                ok,
                errorMsg
            });

            if (ok) {
                console.log('✅ [THEME SAVE] API returned success - Theme should be saved to database');
                console.log('⚠️ [THEME SAVE] If database is not updated, check backend logs and verify API implementation');

                // Theme parameters come from database only, not localStorage
                return { success: true, response, method: 'database' };
            }

            console.error('❌ [THEME SAVE] API did not return success. Error:', errorMsg);
            return {
                success: false,
                message: errorMsg,
                response,
                method: 'database'
            };
        } catch (error) {
            console.error('❌ [API ERROR] Database save failed:', error);
            return {
                success: false,
                message: error.message || 'Failed to save theme to database',
                method: 'database',
                error: error.message
            };
        }
    }

    /**
     * Apply a preset theme
     * Saves to database first; on success, updates localStorage for ThemeManager compatibility.
     */
    async function applyPresetTheme(presetId) {
        const preset = PRESET_THEMES[presetId];
        if (!preset) {
            showMessage('Preset theme not found', 'error');
            return;
        }

        let settings = [];
        Object.entries(preset.tokens).forEach(([cssVar, value]) => {
            const settingKey = cssVarToSettingKey(cssVar);
            // Determine ValueType: COLOR for color vars, STRING for others (fonts, etc.)
            const valueType = cssVar.startsWith('--color-') ? 'COLOR' : 'STRING';
            settings.push({
                SettingKey: settingKey,
                SettingValue: value,
                ValueType: valueType
            });
        });

        const formRowHoverCheck = document.getElementById('formRowHoverEffect');
        // Compact view is always enabled by default (Layout section removed)
        const formRowHoverEnabled = formRowHoverCheck ? formRowHoverCheck.checked : true;
        const compactEnabled = true; // Always enabled

        // Upsert behaviour settings (replace if exists, add if not)
        const formRowHoverIdx = settings.findIndex(x => (x.SettingKey || x.settingKey) === FORM_ROW_HOVER_KEY);
        if (formRowHoverIdx >= 0) {
            settings[formRowHoverIdx] = { SettingKey: FORM_ROW_HOVER_KEY, SettingValue: formRowHoverEnabled ? 'true' : 'false', ValueType: 'BOOLEAN' };
        } else {
            settings.push({ SettingKey: FORM_ROW_HOVER_KEY, SettingValue: formRowHoverEnabled ? 'true' : 'false', ValueType: 'BOOLEAN' });
        }

        const compactIdx = settings.findIndex(x => (x.SettingKey || x.settingKey) === COMPACT_VIEW_KEY);
        if (compactIdx >= 0) {
            settings[compactIdx] = { SettingKey: COMPACT_VIEW_KEY, SettingValue: compactEnabled ? 'true' : 'false', ValueType: 'BOOLEAN' };
        } else {
            settings.push({ SettingKey: COMPACT_VIEW_KEY, SettingValue: compactEnabled ? 'true' : 'false', ValueType: 'BOOLEAN' });
        }

        // Glassmorphism is always enabled
        const glassIdx = settings.findIndex(x => (x.SettingKey || x.settingKey) === GLASSMORPHISM_KEY);
        if (glassIdx >= 0) {
            settings[glassIdx] = { SettingKey: GLASSMORPHISM_KEY, SettingValue: 'true', ValueType: 'BOOLEAN' };
        } else {
            settings.push({ SettingKey: GLASSMORPHISM_KEY, SettingValue: 'true', ValueType: 'BOOLEAN' });
        }

        // Deduplicate settings array before sending to database to prevent MERGE errors
        //settings = deduplicateSettings(settings);

        const scope = getThemeScope();
        const requestData = {
            ScopeType: scope.ScopeType,
            ThemeName: preset.name,
            //SettingsJson: JSON.stringify(settings),
            SettingsJson: settings,
            ScopeRefID: scope.ScopeRefID == undefined || scope.ScopeRefID == "" ? "DEFAULT" : scope.ScopeRefID
        };

        console.log('💾 [APPLY PRESET] Saving theme to database with scope:', scope.ScopeType);
        const saveResult = await saveThemeSettingsToDatabase(requestData);

        if (!saveResult.success) {
            const errorDetails = saveResult.errors && saveResult.errors.length > 0
                ? `: ${saveResult.errors.join('; ')}`
                : '';
            console.error('❌ [APPLY PRESET] Save failed:', saveResult.message, errorDetails);
            showMessage(`Failed to save theme: ${saveResult.message}${errorDetails}`, 'error');
            return;
        }

        console.log('✅ [APPLY PRESET] Theme saved successfully to database');
        showMessage(`Theme "${preset.name}" saved successfully for ${scope.ScopeType} scope`, 'success');

        // Preserve current label tokens when applying preset (so label colors don't get lost)
        const currentLabelTokens = getLabelTokens();
        const mergedTokens = Object.assign({}, preset.tokens, currentLabelTokens);

        console.log('🎨 [APPLY PRESET] Applying theme:', presetId, mergedTokens);

        // Apply theme to current document and parent
        const themeApplied = applyTheme(mergedTokens, { smoothTransition: true });
        if (!themeApplied) {
            console.error('❌ [APPLY PRESET] Failed to apply theme visually');
            showMessage('Failed to apply theme visually', 'error');
            return;
        }

        console.log('✅ [APPLY PRESET] Theme applied successfully to current document');

        // Set theme timestamp for cache invalidation so other tabs/contexts can reload from database
        const themeTimestamp = new Date().toISOString();
        sessionStorage.setItem('kairo_theme_timestamp', themeTimestamp);
        console.log('🔄 [APPLY PRESET] Theme timestamp set:', themeTimestamp);

        // Theme parameters come from database only, not localStorage
        console.log('✅ [APPLY PRESET] Theme applied:', {
            preset: presetId,
            presetName: preset.name,
            scope: scope.ScopeType
        });

        // Apply to ALL windows and iframes immediately (including nested)
        const applyToAllFrames = (tokens) => {
            // Try to get parent window's ThemeManager
            const parentWindow = window.parent || window.top;

            if (parentWindow && parentWindow !== window && parentWindow.ThemeManager) {

                // Apply to parent document
                try {
                    parentWindow.ThemeManager.applyThemeToDocument(parentWindow.document, tokens, 'parent-main');
                } catch (e) {
                    // Silent fail
                }

                // Recursively find and apply to ALL iframes
                const applyToNestedIframes = (doc, level = 0) => {
                    const allIframes = doc.querySelectorAll('iframe');

                    allIframes.forEach((iframe, idx) => {
                        try {
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                            if (iframeDoc) {
                                const iframeSrc = iframe.src || iframe.id || `iframe-${idx}`;

                                // Apply theme
                                parentWindow.ThemeManager.applyThemeToDocument(iframeDoc, tokens, iframeSrc);

                                // Force immediate repaint
                                try {
                                    const root = iframeDoc.documentElement;
                                    root.style.display = 'none';
                                    void root.offsetHeight;
                                    root.style.display = '';
                                } catch (e) { }

                                // Recursively apply to nested iframes
                                applyToNestedIframes(iframeDoc, level + 1);
                            }
                        } catch (e) {
                        }
                    });
                };

                applyToNestedIframes(parentWindow.document, 0);

                // Re-apply after 100ms to catch any CSS that loaded
                setTimeout(() => {
                    applyToNestedIframes(parentWindow.document, 0);
                }, 100);

                // Final application after 500ms
                setTimeout(() => {
                    applyToNestedIframes(parentWindow.document, 0);
                }, 500);
            }
        };

        // Apply to all frames using ThemeManager if available
        console.log('🌍 [APPLY PRESET] Applying to all frames...');
        applyToAllFrames(mergedTokens);

        // Sync to localStorage so theme-manager bootstrap uses this theme on next page load (fixes green when default selected)
        try {
            const win = window.top || window;
            const storageKey = 'kairo_theme_preset';
            const existing = win.localStorage.getItem(storageKey);
            const data = existing ? JSON.parse(existing) : {};
            data.settings = settings;
            data.tokens = Object.assign(data.tokens || {}, mergedTokens);
            data.preset = presetId;
            data.timestamp = new Date().toISOString();
            win.localStorage.setItem(storageKey, JSON.stringify(data));
        } catch (e) {
            // ignore
        }

        // Also apply behaviour settings to parent
        try {
            const parentWindow = window.parent || window.top;
            if (parentWindow && parentWindow.document && parentWindow.document.body) {
                parentWindow.document.body.classList.toggle('form-row-hover-on', formRowHoverEnabled);
                parentWindow.document.body.classList.toggle('theme-compact-view', compactEnabled);

                // Glassmorphism is always enabled
                parentWindow.document.body.classList.add('glass-enabled');
            }
        } catch (e) {
            console.warn('Could not apply behaviour settings to parent:', e.message);
        }

        updateColorInputsFromTheme(mergedTokens);

        // Update cached active preset ID BEFORE re-rendering so button state updates correctly
        cachedActivePresetId = presetId;

        // Smooth transition: demote previous active card, elevate new one
        const previousActiveCard = document.querySelector('.preset-theme-card.is-active');
        if (previousActiveCard && previousActiveCard.dataset.presetId !== presetId) {
            previousActiveCard.classList.remove('is-active');
            previousActiveCard.style.transition = 'all 200ms ease';
        }

        const activeTab = document.querySelector('.theme-filter-tab.active');
        renderPresetThemes(activeTab ? activeTab.dataset.filter : 'all');

        // Ensure new active card is elevated
        setTimeout(() => {
            const newActiveCard = document.querySelector(`.preset-theme-card[data-preset-id="${presetId}"]`);
            if (newActiveCard) {
                newActiveCard.classList.add('is-active');
            }
        }, 50);

        showMessage(`Theme "${preset.name}" applied and saved to database`, 'success');
    }

    /**
     * Convert CSS variable name to setting key
     */
    function cssVarToSettingKey(cssVar) {
        const mapping = {
            '--color-header': 'Color.Header',
            '--color-primary': 'Color.Primary',
            '--color-border': 'Color.Border',
            '--color-text': 'Color.Text',
            '--color-label-default': 'Color.LabelDefault',
            '--color-label-mandatory': 'Color.LabelMandatory',
            '--color-label-conditional': 'Color.LabelConditional',
            '--color-label-optional': 'Color.LabelOptional',
            '--color-bg-page': 'Color.BgPage',
            '--color-bg-section': 'Color.BgSection',
            '--color-bg-panel': 'Color.BgPanel',
            '--color-bg-elevated': 'Color.BgElevated',
            '--color-bg-input': 'Color.BgInput',
            '--color-border-subtle': 'Color.BorderSubtle',
            '--color-border-default': 'Color.BorderDefault',
            '--color-border-strong': 'Color.BorderStrong',
            '--color-text-primary': 'Color.TextPrimary',
            '--color-text-secondary': 'Color.TextSecondary',
            '--color-text-muted': 'Color.TextMuted',
            '--label-font-family': 'Label.FontFamily',
            '--label-font-size': 'Label.FontSize',
            '--label-font-weight': 'Label.FontWeight',
        };

        return mapping[cssVar] || cssVar;
    }

    /**
     * Update color input values from theme tokens
     */
    function updateColorInputsFromTheme(tokens) {
        colorInputs.forEach(input => {
            const cssVar = input.dataset.cssVar;
            if (tokens[cssVar]) {
                input.value = tokens[cssVar];

                // Update display value
                const displayInput = document.getElementById('value' + input.dataset.themeColor.charAt(0).toUpperCase() + input.dataset.themeColor.slice(1));
                if (displayInput) {
                    displayInput.value = tokens[cssVar];
                }
            }
        });
    }

    // ==================== SAVE THEME ====================

    /**
     * Save theme settings to database
     */
    async function saveThemeSettings() {
        try {
            const settings = [];

            colorInputs.forEach(input => {
                const colorName = input.dataset.themeColor;
                const cssVar = input.dataset.cssVar;
                const hexColor = toHex(input.value);

                const settingKey = mapColorNameToSettingKey(colorName);
                settings.push({
                    SettingKey: settingKey,
                    SettingValue: hexColor,
                    ValueType: 'COLOR'
                });
            });

            if (!window.AppCore || typeof window.AppCore.invokeControllerAsync !== 'function') {
                showMessage('AppCore not available. Ensure app-core.js is loaded.', 'error');
                return;
            }

            const scope = getThemeScope();
            const response = await window.AppCore.invokeControllerAsync('ThemeConfiguration/save-theme', {
                ScopeType: scope.ScopeType,
                ThemeName: 'Custom Theme',
                SettingsJson: settings  //JSON.stringify(settings)
            });

            const ok = response && (response.success === true || response.Success === true);
            if (ok) {
                // Theme parameters come from database only, not localStorage
                showMessage('Theme settings saved successfully', 'success');
            } else {
                const errorMsg = response ? (response.message || response.Message || response.ErrorMessage || 'Failed to save theme settings') : 'Unknown error';
                showMessage(errorMsg, 'error');
            }
        } catch (error) {
            showMessage('Error saving theme: ' + error.message, 'error');
        }
    }

    /**
     * Map color name to database setting key
     */
    function mapColorNameToSettingKey(colorName) {
        const mapping = {
            'headerColor': 'Color.Header',
            'primaryColor': 'Color.Primary',
            'borderColor': 'Color.Border',
            'textColor': 'Color.Text',
            'mandatoryColor': 'Color.LabelMandatory',
            'conditionalColor': 'Color.LabelConditional',
            'optionalColor': 'Color.LabelOptional'
        };

        return mapping[colorName] || colorName;
    }

    /**
     * Setup section toggle (expand/collapse)
     */
    function setupSectionToggle() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', function () {
                const section = header.closest('.form-section');
                const content = section?.querySelector('[data-section-content]');
                const btn = header.querySelector('.section-toggle-btn');
                const icon = header.querySelector('.section-toggle-btn i');
                if (!content || !btn) return;
                const isHidden = content.hidden;
                content.hidden = !isHidden;
                btn.setAttribute('aria-expanded', isHidden);
                if (icon) icon.className = isHidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
            });
        });
    }

    /**
     * Apply label tokens to document root (for system-wide effect)
     * Also applies recursively to parent window and all iframes (including nested) if ThemeManager is available
     */
    function applyLabelTokens(tokens) {
        const root = document.documentElement;
        Object.entries(tokens).forEach(([key, value]) => {
            if (key.startsWith('--')) {
                root.style.setProperty(key, value, 'important');
            }
        });

        // Apply recursively via ThemeManager (same pattern as preset themes)
        const parentWin = window.parent && window.parent !== window ? window.parent : window;
        if (parentWin && parentWin !== window && parentWin.ThemeManager && typeof parentWin.ThemeManager.applyThemeToDocument === 'function') {
            try {
                parentWin.ThemeManager.applyThemeToDocument(parentWin.document, tokens, 'label-settings');
                const applyToNestedIframes = (doc, level = 0) => {
                    const allIframes = doc.querySelectorAll('iframe');
                    allIframes.forEach((iframe, idx) => {
                        try {
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                            if (iframeDoc) {
                                const iframeName = iframe.src || iframe.id || `iframe-${idx}`;
                                parentWin.ThemeManager.applyThemeToDocument(iframeDoc, tokens, iframeName);
                                applyToNestedIframes(iframeDoc, level + 1);
                            }
                        } catch (e) {
                            // Silently skip cross-origin iframes
                        }
                    });
                };
                applyToNestedIframes(parentWin.document, 0);
                setTimeout(() => {
                    applyToNestedIframes(parentWin.document, 0);
                }, 100);
                setTimeout(() => {
                    applyToNestedIframes(parentWin.document, 0);
                }, 500);
            } catch (e) {
                // Silently handle errors
            }
        }
    }

    /**
     * Get current label settings as tokens
     */
    function getLabelTokens() {
        const fontFamily = document.getElementById('labelFontFamily')?.value || "'Segoe UI', Tahoma, Arial, sans-serif";
        const fontSize = document.getElementById('labelFontSize')?.value || '12px';
        const fontWeight = document.getElementById('labelFontWeight')?.value || '700';
        const colorDefault = toHex(document.getElementById('labelColorDefault')?.value || '#000000');
        const colorMandatory = toHex(document.getElementById('labelColorMandatory')?.value || '#2563eb');
        const colorConditional = toHex(document.getElementById('labelColorConditional')?.value || '#000000');
        return {
            '--color-label-default': colorDefault,
            '--color-label-mandatory': colorMandatory,
            '--color-label-conditional': colorConditional,
            '--label-font-family': fontFamily,
            '--label-font-size': fontSize,
            '--label-font-weight': fontWeight
        };
    }

    /**
     * Setup label & typography controls
     */
    function setupLabelControls() {
        const controls = document.querySelectorAll('.theme-label-control, .theme-label-color');
        const applyBtn = document.getElementById('applyLabelSettings');

        function updatePreview() {
            const tokens = getLabelTokens();
            applyLabelTokens(tokens);
            const hexDefault = document.getElementById('labelColorDefaultHex');
            const hexMandatory = document.getElementById('labelColorMandatoryHex');
            const hexConditional = document.getElementById('labelColorConditionalHex');
            if (hexDefault) hexDefault.textContent = tokens['--color-label-default'];
            if (hexMandatory) hexMandatory.textContent = tokens['--color-label-mandatory'];
            if (hexConditional) hexConditional.textContent = tokens['--color-label-conditional'];
        }

        controls.forEach(el => {
            el.addEventListener('change', updatePreview);
            el.addEventListener('input', updatePreview);
        });

        if (applyBtn) {
            applyBtn.addEventListener('click', async () => {
                const tokens = getLabelTokens();
                // applyLabelTokens already applies recursively to all documents and iframes
                applyLabelTokens(tokens);

                const settings = Object.entries(tokens).map(([key, value]) => ({
                    SettingKey: cssVarToSettingKey(key),
                    SettingValue: value,
                    ValueType: key.startsWith('--color') ? 'COLOR' : 'STRING'
                }));

                let operatorId;
                try {
                    operatorId = getLoggedInUserId();
                } catch (e) {
                    console.error('❌ [SAVE LABELS] Could not get user ID:', e.message);
                    showMessage('Cannot save label settings: User ID not found. Please ensure you are logged in.', 'error');
                    return;
                }

                const scope = getThemeScope();
                const requestData = {
                    ScopeType: scope.ScopeType,
                    ThemeName: 'Label Settings',
                    SettingsJson: settings  //JSON.stringify(settings)
                };

                const saveResult = await saveThemeSettingsToDatabase(requestData);
                if (saveResult.success) {
                    // Theme parameters come from database only, not localStorage

                    // Re-apply with delayed calls to catch any late-loading iframes
                    const parentWin = window.parent && window.parent !== window ? window.parent : window;
                    if (parentWin && parentWin !== window && parentWin.ThemeManager) {
                        const applyToNestedIframes = (doc, level = 0) => {
                            const allIframes = doc.querySelectorAll('iframe');
                            allIframes.forEach((iframe, idx) => {
                                try {
                                    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                                    if (iframeDoc) {
                                        parentWin.ThemeManager.applyThemeToDocument(iframeDoc, tokens, iframe.src || `iframe-${idx}`);
                                        applyToNestedIframes(iframeDoc, level + 1);
                                    }
                                } catch (e) { }
                            });
                        };
                        setTimeout(() => applyToNestedIframes(parentWin.document, 0), 100);
                        setTimeout(() => applyToNestedIframes(parentWin.document, 0), 500);
                    }

                    showMessage('Label settings applied and saved', 'success');
                } else {
                    const errorDetails = saveResult.errors && saveResult.errors.length > 0
                        ? `: ${saveResult.errors.join('; ')}`
                        : '';
                    showMessage(`Failed to save label settings: ${saveResult.message}${errorDetails}`, 'error');
                }
            });
        }

        updatePreview();
    }

    /**
     * Load label settings from cached theme data (loaded from database) into controls.
     * Migrates old "error" colors (red/orange) to correct label semantics (blue = mandatory, black = conditional).
     */
    function loadLabelSettingsIntoControls() {
        // Use cached theme data from database (not localStorage)
        let tokens = cachedThemeData.tokens || {};

        // Also extract from settings array
        if (cachedThemeData.settings && Array.isArray(cachedThemeData.settings)) {
            cachedThemeData.settings.forEach(s => {
                const key = s.SettingKey || s.settingKey;
                const value = s.SettingValue || s.settingValue;
                const cssVar = settingKeyToCssVar(key);
                if (cssVar && value && (cssVar.startsWith('--label-') || cssVar.startsWith('--color-label-'))) {
                    tokens[cssVar] = value;
                }
            });
        }
        const root = document.documentElement;
        const defaults = {
            '--color-label-default': '#000000',
            '--color-label-mandatory': '#2563eb',
            '--color-label-conditional': '#000000',
            '--label-font-family': "'Segoe UI', Tahoma, Arial, sans-serif",
            '--label-font-size': '12px',
            '--label-font-weight': '700'
        };
        // Migrate old label colors (red/orange used as mandatory/conditional) to correct semantics
        const oldMandatoryHex = toHex('#ef4444');
        const oldConditionalHex = toHex('#f59e0b');
        const mandatoryRaw = tokens['--color-label-mandatory'] || getComputedStyle(root).getPropertyValue('--color-label-mandatory').trim() || '';
        const conditionalRaw = tokens['--color-label-conditional'] || getComputedStyle(root).getPropertyValue('--color-label-conditional').trim() || '';
        if (mandatoryRaw && toHex(mandatoryRaw) === oldMandatoryHex) {
            tokens['--color-label-mandatory'] = defaults['--color-label-mandatory'];
        }
        if (conditionalRaw && toHex(conditionalRaw) === oldConditionalHex) {
            tokens['--color-label-conditional'] = defaults['--color-label-conditional'];
        }
        const valDefault = toHex(tokens['--color-label-default'] || getComputedStyle(root).getPropertyValue('--color-label-default').trim() || defaults['--color-label-default']);
        const valMandatory = toHex(tokens['--color-label-mandatory'] || getComputedStyle(root).getPropertyValue('--color-label-mandatory').trim() || defaults['--color-label-mandatory']);
        const valConditional = toHex(tokens['--color-label-conditional'] || getComputedStyle(root).getPropertyValue('--color-label-conditional').trim() || defaults['--color-label-conditional']);
        const elDefault = document.getElementById('labelColorDefault');
        if (elDefault) elDefault.value = valDefault;
        const elMandatory = document.getElementById('labelColorMandatory');
        if (elMandatory) elMandatory.value = valMandatory;
        const elConditional = document.getElementById('labelColorConditional');
        if (elConditional) elConditional.value = valConditional;
        const hexDefault = document.getElementById('labelColorDefaultHex');
        if (hexDefault) hexDefault.textContent = valDefault.toUpperCase();
        const hexMandatory = document.getElementById('labelColorMandatoryHex');
        if (hexMandatory) hexMandatory.textContent = valMandatory.toUpperCase();
        const hexConditional = document.getElementById('labelColorConditionalHex');
        if (hexConditional) hexConditional.textContent = valConditional.toUpperCase();
        // Load font settings - ensure we get them from tokens (from database settings)
        const fontFamily = tokens['--label-font-family'] || defaults['--label-font-family'];
        const fontSize = tokens['--label-font-size'] || defaults['--label-font-size'];
        const fontWeight = tokens['--label-font-weight'] || defaults['--label-font-weight'];

        const ff = document.getElementById('labelFontFamily');
        if (ff) ff.value = fontFamily;
        const fs = document.getElementById('labelFontSize');
        if (fs) fs.value = fontSize;
        const fw = document.getElementById('labelFontWeight');
        if (fw) fw.value = fontWeight;

        // Apply loaded label tokens immediately (including font settings)
        // Always include font settings even if they're defaults
        const labelTokens = {
            '--label-font-family': fontFamily,
            '--label-font-size': fontSize,
            '--label-font-weight': fontWeight
        };
        Object.keys(tokens).forEach(key => {
            if (key.startsWith('--label-') || key.startsWith('--color-label-')) {
                labelTokens[key] = tokens[key];
            }
        });
        if (Object.keys(labelTokens).length > 0) {
            applyLabelTokens(labelTokens);
        }
    }

    // ==================== IMAGE CONTROLS ====================

    /**
     * Setup image upload controls for Client Logo, Background Image, and Login Image
     */
    /**
     * Setup custom theme color controls
     */
    function setupCustomThemeControls() {
        const colorInputs = document.querySelectorAll('.theme-custom-color');
        const applyBtn = document.getElementById('applyCustomTheme');

        function onCustomColorChange(input) {
            const hex = toHex(input.value);
            const cssVar = input.getAttribute('data-css-var');
            const hexDisplay = document.getElementById(input.id + 'Hex');

            if (hexDisplay) hexDisplay.textContent = hex;
            if (cssVar) {
                document.documentElement.style.setProperty(cssVar, hex);
            }
            updateCustomThemePreview();
        }

        // Update hex display, apply CSS variable for live preview, and update preview swatches
        colorInputs.forEach(input => {
            input.addEventListener('input', (e) => onCustomColorChange(e.target));
            input.addEventListener('change', (e) => onCustomColorChange(e.target));
        });

        // Apply custom theme button
        if (applyBtn) {
            applyBtn.addEventListener('click', async () => {
                await saveAndApplyCustomTheme();
            });
        }

        // Load custom theme colors from storage/database
        loadCustomThemeColors();
    }

    /**
     * Update custom theme preview
     */
    function updateCustomThemePreview() {
        const headerColor = toHex(document.getElementById('customColorHeader')?.value || '#4a7c95');
        const primaryColor = toHex(document.getElementById('customColorPrimary')?.value || '#4a7c95');
        const borderColor = toHex(document.getElementById('customColorBorder')?.value || '#e3e9ed');
        const textColor = toHex(document.getElementById('customColorText')?.value || '#1e293b');

        const previewHeader = document.getElementById('previewHeader');
        const previewPrimary = document.getElementById('previewPrimary');
        const previewBorder = document.getElementById('previewBorder');
        const previewText = document.getElementById('previewText');

        if (previewHeader) previewHeader.style.backgroundColor = headerColor;
        if (previewPrimary) previewPrimary.style.backgroundColor = primaryColor;
        if (previewBorder) previewBorder.style.backgroundColor = borderColor;
        if (previewText) previewText.style.backgroundColor = textColor;

        // Update preview box CSS variables
        const previewBox = document.querySelector('.theme-color-preview .p-2');
        if (previewBox) {
            previewBox.style.setProperty('--color-border', borderColor);
            previewBox.style.setProperty('--color-text', textColor);
            previewBox.style.setProperty('--color-primary', primaryColor);
        }
    }

    /**
     * Get custom theme tokens from UI
     */
    function getCustomThemeTokens() {
        return {
            '--color-header': toHex(document.getElementById('customColorHeader')?.value || '#4a7c95'),
            '--color-primary': toHex(document.getElementById('customColorPrimary')?.value || '#4a7c95'),
            '--color-border': toHex(document.getElementById('customColorBorder')?.value || '#e3e9ed'),
            '--color-text': toHex(document.getElementById('customColorText')?.value || '#1e293b')
        };
    }

    /**
     * Save and apply custom theme
     */
    async function saveAndApplyCustomTheme() {
        const tokens = getCustomThemeTokens();
        const stored = JSON.parse(localStorage.getItem('kairo_theme_preset') || '{}');

        // Get current label tokens to preserve them
        const currentLabelTokens = getLabelTokens();
        const mergedTokens = Object.assign({}, tokens, currentLabelTokens);

        // Apply theme visually
        if (!applyTheme(mergedTokens, { smoothTransition: true })) {
            showMessage('Failed to apply custom theme visually', 'error');
            return;
        }

        // Prepare settings array
        const settings = [];
        Object.entries(tokens).forEach(([cssVar, value]) => {
            const settingKey = cssVarToSettingKey(cssVar);
            if (settingKey && settingKey !== cssVar) {
                settings.push({
                    SettingKey: settingKey,
                    SettingValue: value,
                    ValueType: 'COLOR'
                });
            }
        });

        // Add label settings
        const labelSettings = Object.entries(currentLabelTokens).map(([key, value]) => ({
            SettingKey: cssVarToSettingKey(key),
            SettingValue: value,
            ValueType: key.startsWith('--color') ? 'COLOR' : 'STRING'
        }));
        settings.push(...labelSettings);

        // Add behaviour settings
        const formRowHoverCheck = document.getElementById('formRowHoverEffect');
        // Compact view is always enabled by default (Layout section removed)
        const formRowHoverEnabled = formRowHoverCheck ? formRowHoverCheck.checked : true;
        const compactEnabled = true; // Always enabled

        settings.push({
            SettingKey: FORM_ROW_HOVER_KEY,
            SettingValue: formRowHoverEnabled ? 'true' : 'false',
            ValueType: 'BOOLEAN'
        });
        settings.push({
            SettingKey: COMPACT_VIEW_KEY,
            SettingValue: compactEnabled ? 'true' : 'false',
            ValueType: 'BOOLEAN'
        });

        // Glassmorphism is always enabled
        settings.push({
            SettingKey: GLASSMORPHISM_KEY,
            SettingValue: 'true',
            ValueType: 'BOOLEAN'
        });

        // Deduplicate settings
        const deduplicatedSettings = deduplicateSettings(settings);

        // Save to database
        let operatorId;
        try {
            operatorId = getLoggedInUserId();
        } catch (e) {
            console.error('❌ [SAVE CUSTOM] Could not get user ID:', e.message);
            showMessage('Cannot save custom theme: User ID not found. Please ensure you are logged in.', 'error');
            return;
        }

        const scope = getThemeScope();
        const requestData = {
            ScopeType: scope.ScopeType,
            ThemeName: 'Custom Theme',
            SettingsJson: deduplicatedSettings  //JSON.stringify(deduplicatedSettings)
        };

        console.log('💾 [SAVE CUSTOM] Saving custom theme to database with scope:', scope.ScopeType);
        const saveResult = await saveThemeSettingsToDatabase(requestData);

        if (!saveResult.success) {
            const errorDetails = saveResult.errors && saveResult.errors.length > 0
                ? `: ${saveResult.errors.join('; ')}`
                : '';
            console.error('❌ [SAVE CUSTOM] Save failed:', saveResult.message, errorDetails);
            showMessage(`Failed to save custom theme: ${saveResult.message}${errorDetails}`, 'error');
            return;
        }

        console.log('✅ [SAVE CUSTOM] Custom theme saved successfully to database');
        showMessage(`Custom theme saved successfully for ${scope.ScopeType} scope`, 'success');

        // Set theme timestamp for cache invalidation so other tabs/contexts can reload from database
        const themeTimestamp = new Date().toISOString();
        sessionStorage.setItem('kairo_theme_timestamp', themeTimestamp);
        console.log('🔄 [SAVE CUSTOM] Theme timestamp set:', themeTimestamp);

        // Update localStorage with current scope
        try {
            // Theme parameters come from database only, not localStorage
            const currentScope = getThemeScope();
            console.log('✅ [SAVE CUSTOM] Custom theme saved to database with scope:', currentScope.ScopeType);
        } catch (e) {
            console.warn('Could not update theme cache:', e);
        }

        // Apply to all windows and iframes
        const applyToAllFrames = (tokens) => {
            const parentWindow = window.parent || window.top;
            if (parentWindow && parentWindow !== window && parentWindow.ThemeManager) {
                try {
                    parentWindow.ThemeManager.applyThemeToDocument(parentWindow.document, tokens, 'parent-main');
                } catch (e) {
                    console.log('Could not apply to parent document:', e.message);
                }

                const applyToNestedIframes = (doc, level = 0) => {
                    const allIframes = doc.querySelectorAll('iframe');
                    allIframes.forEach((iframe) => {
                        try {
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                            if (iframeDoc && iframeDoc !== doc) {
                                if (iframeDoc.defaultView && iframeDoc.defaultView.ThemeManager) {
                                    iframeDoc.defaultView.ThemeManager.applyThemeToDocument(iframeDoc, tokens, `iframe-${level}`);
                                }
                                applyToNestedIframes(iframeDoc, level + 1);
                            }
                        } catch (e) { }
                    });
                };
                applyToNestedIframes(parentWindow.document, 0);
            }
        };
        applyToAllFrames(mergedTokens);

        // Update active preset indicator
        cachedActivePresetId = 'custom';
        renderPresetThemes(document.querySelector('.theme-filter-tab.active')?.dataset.filter || 'all');

        showMessage('Custom theme applied and saved to database', 'success');
    }

    /**
     * Load custom theme colors from storage/database
     */
    function loadCustomThemeColors() {
        try {
            const stored = JSON.parse(localStorage.getItem('kairo_theme_preset') || '{}');

            // Check if custom theme is active
            if (stored.preset === 'custom' && stored.tokens) {
                const tokens = stored.tokens;

                // Load colors into inputs
                const headerInput = document.getElementById('customColorHeader');
                const primaryInput = document.getElementById('customColorPrimary');
                const borderInput = document.getElementById('customColorBorder');
                const textInput = document.getElementById('customColorText');

                if (headerInput && tokens['--color-header']) {
                    headerInput.value = toHex(tokens['--color-header']);
                    const hexDisplay = document.getElementById('customColorHeaderHex');
                    if (hexDisplay) hexDisplay.textContent = toHex(tokens['--color-header']);
                }
                if (primaryInput && tokens['--color-primary']) {
                    primaryInput.value = toHex(tokens['--color-primary']);
                    const hexDisplay = document.getElementById('customColorPrimaryHex');
                    if (hexDisplay) hexDisplay.textContent = toHex(tokens['--color-primary']);
                }
                if (borderInput && tokens['--color-border']) {
                    borderInput.value = toHex(tokens['--color-border']);
                    const hexDisplay = document.getElementById('customColorBorderHex');
                    if (hexDisplay) hexDisplay.textContent = toHex(tokens['--color-border']);
                }
                if (textInput && tokens['--color-text']) {
                    textInput.value = toHex(tokens['--color-text']);
                    const hexDisplay = document.getElementById('customColorTextHex');
                    if (hexDisplay) hexDisplay.textContent = toHex(tokens['--color-text']);
                }

                updateCustomThemePreview();
            } else {
                // Load from current CSS variables if custom theme not found
                const headerColor = readCSSVariable('--color-header') || '#4a7c95';
                const primaryColor = readCSSVariable('--color-primary') || '#4a7c95';
                const borderColor = readCSSVariable('--color-border') || '#e3e9ed';
                const textColor = readCSSVariable('--color-text') || '#1e293b';

                const headerInput = document.getElementById('customColorHeader');
                const primaryInput = document.getElementById('customColorPrimary');
                const borderInput = document.getElementById('customColorBorder');
                const textInput = document.getElementById('customColorText');

                if (headerInput) {
                    headerInput.value = headerColor;
                    const hexDisplay = document.getElementById('customColorHeaderHex');
                    if (hexDisplay) hexDisplay.textContent = headerColor;
                }
                if (primaryInput) {
                    primaryInput.value = primaryColor;
                    const hexDisplay = document.getElementById('customColorPrimaryHex');
                    if (hexDisplay) hexDisplay.textContent = primaryColor;
                }
                if (borderInput) {
                    borderInput.value = borderColor;
                    const hexDisplay = document.getElementById('customColorBorderHex');
                    if (hexDisplay) hexDisplay.textContent = borderColor;
                }
                if (textInput) {
                    textInput.value = textColor;
                    const hexDisplay = document.getElementById('customColorTextHex');
                    if (hexDisplay) hexDisplay.textContent = textColor;
                }

                updateCustomThemePreview();
            }
        } catch (e) {
            console.warn('Could not load custom theme colors:', e);
        }
    }

    function setupImageControls() {
        const clientLogoFile = document.getElementById('clientLogoFile');
        const backgroundImageFile = document.getElementById('backgroundImageFile');
        const loginImageFile = document.getElementById('loginImageFile');
        const clearClientLogo = document.getElementById('clearClientLogo');
        const clearBackgroundImage = document.getElementById('clearBackgroundImage');
        const clearLoginImage = document.getElementById('clearLoginImage');
        const applyImageBtn = document.getElementById('applyImageSettings');

        // Helper function to preview image
        function previewImage(fileInput, previewContainer, previewImg) {
            if (fileInput.files && fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    previewImg.src = e.target.result;
                    previewContainer.style.display = 'block';
                };
                reader.readAsDataURL(fileInput.files[0]);
            }
        }

        // Client Logo handlers
        if (clientLogoFile) {
            clientLogoFile.addEventListener('change', function () {
                previewImage(this, document.getElementById('clientLogoPreview'), document.getElementById('clientLogoPreviewImg'));
                if (clearClientLogo) clearClientLogo.style.display = 'block';
            });
        }

        if (clearClientLogo) {
            clearClientLogo.addEventListener('click', function () {
                if (clientLogoFile) clientLogoFile.value = '';
                const preview = document.getElementById('clientLogoPreview');
                const previewImg = document.getElementById('clientLogoPreviewImg');
                if (preview) preview.style.display = 'none';
                if (previewImg) previewImg.src = '';
                this.style.display = 'none';
            });
        }

        // Background Image handlers
        if (backgroundImageFile) {
            backgroundImageFile.addEventListener('change', async function () {
                previewImage(this, document.getElementById('backgroundImagePreview'), document.getElementById('backgroundImagePreviewImg'));
                if (clearBackgroundImage) clearBackgroundImage.style.display = 'block';

                // Apply background image instantly when selected
                if (this.files && this.files[0]) {
                    try {
                        const base64 = await fileToBase64(this.files[0]);
                        if (base64 && typeof base64 === 'string' && base64.length > 0) {
                            applyBackgroundImageInstantly(base64);
                        }
                    } catch (error) {
                        console.error('Error processing background image for instant preview:', error);
                    }
                }
            });
        }

        if (clearBackgroundImage) {
            clearBackgroundImage.addEventListener('click', function () {
                if (backgroundImageFile) backgroundImageFile.value = '';
                const preview = document.getElementById('backgroundImagePreview');
                const previewImg = document.getElementById('backgroundImagePreviewImg');
                if (preview) preview.style.display = 'none';
                if (previewImg) previewImg.src = '';
                this.style.display = 'none';

                // Remove background image instantly
                removeBackgroundImageInstantly();
            });
        }

        // Login Image handlers
        if (loginImageFile) {
            loginImageFile.addEventListener('change', function () {
                previewImage(this, document.getElementById('loginImagePreview'), document.getElementById('loginImagePreviewImg'));
                if (clearLoginImage) clearLoginImage.style.display = 'block';
            });
        }

        if (clearLoginImage) {
            clearLoginImage.addEventListener('click', function () {
                if (loginImageFile) loginImageFile.value = '';
                const preview = document.getElementById('loginImagePreview');
                const previewImg = document.getElementById('loginImagePreviewImg');
                if (preview) preview.style.display = 'none';
                if (previewImg) previewImg.src = '';
                this.style.display = 'none';
            });
        }

        // Apply & Save button handler
        if (applyImageBtn) {
            applyImageBtn.addEventListener('click', async function () {
                await saveImageSettingsToDatabase();
            });
        }
    }

    /**
     * Apply background image instantly to desktop background
     * @param {string} base64DataUrl - Base64 data URL of the image
     */
    function applyBackgroundImageInstantly(base64DataUrl) {
        if (!base64DataUrl || typeof base64DataUrl !== 'string') return;

        const imageUrl = `url(${base64DataUrl})`;

        // Apply to current document body
        document.body.style.backgroundImage = imageUrl;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundAttachment = 'fixed';

        // Apply to parent window if in iframe
        try {
            const parentWindow = window.parent || window.top;
            if (parentWindow && parentWindow !== window && parentWindow.document && parentWindow.document.body) {
                parentWindow.document.body.style.backgroundImage = imageUrl;
                parentWindow.document.body.style.backgroundSize = 'cover';
                parentWindow.document.body.style.backgroundPosition = 'center';
                parentWindow.document.body.style.backgroundRepeat = 'no-repeat';
                parentWindow.document.body.style.backgroundAttachment = 'fixed';

                // Also apply to all iframes in parent
                const applyToAllIframes = (doc) => {
                    const allIframes = doc.querySelectorAll('iframe');
                    allIframes.forEach((iframe) => {
                        try {
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                            if (iframeDoc && iframeDoc !== doc && iframeDoc.body) {
                                iframeDoc.body.style.backgroundImage = imageUrl;
                                iframeDoc.body.style.backgroundSize = 'cover';
                                iframeDoc.body.style.backgroundPosition = 'center';
                                iframeDoc.body.style.backgroundRepeat = 'no-repeat';
                                iframeDoc.body.style.backgroundAttachment = 'fixed';
                                applyToAllIframes(iframeDoc);
                            }
                        } catch (e) {
                            // Cross-origin iframes - expected
                        }
                    });
                };
                applyToAllIframes(parentWindow.document);
            }
        } catch (e) {
            // Same-origin only
        }

        // Background image is saved to database via saveThemeSettingsToDatabase
        // Theme parameters come from database only, not localStorage
    }

    /**
     * Remove background image instantly from desktop background
     */
    function removeBackgroundImageInstantly() {
        // Remove from current document body
        document.body.style.backgroundImage = '';
        document.body.style.backgroundSize = '';
        document.body.style.backgroundPosition = '';
        document.body.style.backgroundRepeat = '';
        document.body.style.backgroundAttachment = '';

        // Remove from parent window if in iframe
        try {
            const parentWindow = window.parent || window.top;
            if (parentWindow && parentWindow !== window && parentWindow.document && parentWindow.document.body) {
                parentWindow.document.body.style.backgroundImage = '';
                parentWindow.document.body.style.backgroundSize = '';
                parentWindow.document.body.style.backgroundPosition = '';
                parentWindow.document.body.style.backgroundRepeat = '';
                parentWindow.document.body.style.backgroundAttachment = '';

                // Also remove from all iframes in parent
                const removeFromAllIframes = (doc) => {
                    const allIframes = doc.querySelectorAll('iframe');
                    allIframes.forEach((iframe) => {
                        try {
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                            if (iframeDoc && iframeDoc !== doc && iframeDoc.body) {
                                iframeDoc.body.style.backgroundImage = '';
                                iframeDoc.body.style.backgroundSize = '';
                                iframeDoc.body.style.backgroundPosition = '';
                                iframeDoc.body.style.backgroundRepeat = '';
                                iframeDoc.body.style.backgroundAttachment = '';
                                removeFromAllIframes(iframeDoc);
                            }
                        } catch (e) {
                            // Cross-origin iframes - expected
                        }
                    });
                };
                removeFromAllIframes(parentWindow.document);
            }
        } catch (e) {
            // Same-origin only
        }

        // Remove from localStorage
        try {
            const stored = JSON.parse(localStorage.getItem('kairo_theme_preset') || '{}');
            if (stored.settings && Array.isArray(stored.settings)) {
                stored.settings = stored.settings.filter(s =>
                    (s.SettingKey || s.settingKey) !== 'Branding.BackgroundImage'
                );
                localStorage.setItem('kairo_theme_preset', JSON.stringify(stored));
            }
        } catch (e) {
            console.warn('Could not remove background image from localStorage:', e);
        }
    }

    /**
     * Convert file to base64 data URL
     */
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }

            if (!(file instanceof File) && !(file instanceof Blob)) {
                reject(new Error('Invalid file object'));
                return;
            }

            // Check file size (limit to 5MB to avoid database issues)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                reject(new Error(`File size exceeds ${maxSize / 1024 / 1024}MB limit`));
                return;
            }

            if (file.size === 0) {
                reject(new Error('File is empty'));
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                if (!result || typeof result !== 'string' || result.length === 0) {
                    reject(new Error('Failed to convert file to base64'));
                    return;
                }
                resolve(result);
            };
            reader.onerror = () => {
                reject(new Error('Error reading file: ' + (reader.error?.message || 'Unknown error')));
            };
            reader.onabort = () => {
                reject(new Error('File read was aborted'));
            };

            try {
                reader.readAsDataURL(file);
            } catch (error) {
                reject(new Error('Error starting file read: ' + error.message));
            }
        });
    }

    /**
     * Save image settings to database
     */
    async function saveImageSettingsToDatabase() {
        const clientLogoFile = document.getElementById('clientLogoFile');
        const backgroundImageFile = document.getElementById('backgroundImageFile');
        const loginImageFile = document.getElementById('loginImageFile');

        const settings = [];
        let operatorId;
        try {
            operatorId = getLoggedInUserId();
        } catch (e) {
            console.error('❌ [SAVE IMAGES] Could not get user ID:', e.message);
            showMessage('Cannot save image settings: User ID not found. Please ensure you are logged in.', 'error');
            return;
        }

        try {
            // Process Client Logo
            if (clientLogoFile && clientLogoFile.files && clientLogoFile.files[0]) {
                try {
                    const base64 = await fileToBase64(clientLogoFile.files[0]);
                    if (base64 && typeof base64 === 'string' && base64.length > 0) {
                        settings.push({
                            SettingKey: 'Branding.ClientLogo',
                            SettingValue: base64,
                            ValueType: 'IMAGE'
                        });
                    } else {
                        console.error('Client Logo: Invalid base64 result');
                        showMessage('Failed to process Client Logo image', 'error');
                        return;
                    }
                } catch (error) {
                    console.error('Error processing Client Logo:', error);
                    showMessage('Error processing Client Logo: ' + error.message, 'error');
                    return;
                }
            }

            // Process Background Image
            if (backgroundImageFile && backgroundImageFile.files && backgroundImageFile.files[0]) {
                try {
                    const base64 = await fileToBase64(backgroundImageFile.files[0]);
                    if (base64 && typeof base64 === 'string' && base64.length > 0) {
                        settings.push({
                            SettingKey: 'Branding.BackgroundImage',
                            SettingValue: base64,
                            ValueType: 'IMAGE'
                        });
                    } else {
                        console.error('Background Image: Invalid base64 result');
                        showMessage('Failed to process Background Image', 'error');
                        return;
                    }
                } catch (error) {
                    console.error('Error processing Background Image:', error);
                    showMessage('Error processing Background Image: ' + error.message, 'error');
                    return;
                }
            }

            // Process Login Image
            if (loginImageFile && loginImageFile.files && loginImageFile.files[0]) {
                try {
                    const base64 = await fileToBase64(loginImageFile.files[0]);
                    if (base64 && typeof base64 === 'string' && base64.length > 0) {
                        settings.push({
                            SettingKey: 'Branding.LoginImage',
                            SettingValue: base64,
                            ValueType: 'IMAGE'
                        });
                    } else {
                        console.error('Login Image: Invalid base64 result');
                        showMessage('Failed to process Login Image', 'error');
                        return;
                    }
                } catch (error) {
                    console.error('Error processing Login Image:', error);
                    showMessage('Error processing Login Image: ' + error.message, 'error');
                    return;
                }
            }

            if (settings.length === 0) {
                showMessage('No images selected to save', 'warning');
                return;
            }

            // Validate all settings have non-null, non-empty values
            const invalidSettings = settings.filter(s => {
                const value = s.SettingValue;
                return !value || value === null || value === undefined || value === '' || typeof value !== 'string';
            });

            if (invalidSettings.length > 0) {
                console.error('Invalid settings found:', invalidSettings);
                console.error('Settings array:', settings);
                showMessage('Some image settings are invalid and cannot be saved. Please try uploading the images again.', 'error');
                return;
            }

            // Double-check: ensure no null values in the final array
            const cleanedSettings = settings.map(s => {
                // Validate the setting object
                if (!s || typeof s !== 'object') {
                    console.error('Invalid setting object:', s);
                    return null;
                }

                const settingKey = s.SettingKey || s.settingKey;
                const settingValue = s.SettingValue || s.settingValue;

                if (!settingKey || typeof settingKey !== 'string' || settingKey.length === 0) {
                    console.error('Invalid SettingKey:', s);
                    return null;
                }

                if (!settingValue || settingValue === null || settingValue === undefined) {
                    console.error('Found null/undefined SettingValue in:', s);
                    return null;
                }

                const valueString = String(settingValue);
                if (valueString.length === 0) {
                    console.error('Found empty SettingValue in:', s);
                    return null;
                }

                return {
                    SettingKey: settingKey,
                    SettingValue: valueString,
                    ValueType: s.ValueType || s.valueType || 'IMAGE'
                };
            }).filter(s => {
                // Final filter: ensure all required fields are present and valid
                return s !== null &&
                    s.SettingKey &&
                    s.SettingValue &&
                    typeof s.SettingKey === 'string' &&
                    typeof s.SettingValue === 'string' &&
                    s.SettingKey.length > 0 &&
                    s.SettingValue.length > 0;
            });

            if (cleanedSettings.length === 0) {
                showMessage('No valid image settings to save', 'error');
                return;
            }

            if (cleanedSettings.length !== settings.length) {
                console.warn('Some settings were filtered out:', settings.length - cleanedSettings.length);
            }

            // Final validation: ensure JSON string doesn't contain null values
            const settingsJson = JSON.stringify(cleanedSettings);
            console.log('📤 [IMAGE SAVE] Prepared settings:', cleanedSettings.map(s => ({
                key: s.SettingKey,
                valueLength: s.SettingValue ? s.SettingValue.length : 0,
                valuePreview: s.SettingValue ? s.SettingValue.substring(0, 50) + '...' : 'null'
            })));

            if (settingsJson.includes('"SettingValue":null') || settingsJson.includes(':null')) {
                console.error('❌ JSON contains null values:', settingsJson);
                showMessage('Invalid image data detected. Please try uploading the images again.', 'error');
                return;
            }

            // Verify JSON can be parsed back correctly
            try {
                const parsed = JSON.parse(settingsJson);
                const hasNullValues = parsed.some(s => s.SettingValue === null || s.SettingValue === undefined || s.SettingValue === '');
                if (hasNullValues) {
                    console.error('❌ Parsed settings contain null/empty values:', parsed);
                    showMessage('Invalid image data detected. Please try uploading the images again.', 'error');
                    return;
                }
                console.log('✅ [IMAGE SAVE] Settings validated, sending to database...');
            } catch (parseError) {
                console.error('❌ Failed to parse settings JSON:', parseError);
                showMessage('Error preparing image data for save', 'error');
                return;
            }

            const scope = getThemeScope();
            const requestData = {
                ScopeType: scope.ScopeType,
                ThemeName: 'Branding Images',
                SettingsJson: settingsJson
            };

            console.log('📦 [IMAGE SAVE] Request data:', {
                ScopeType: requestData.ScopeType,
                ThemeName: requestData.ThemeName,
                SettingsCount: cleanedSettings.length,
                SettingsJsonLength: settingsJson.length
            });

            const saveResult = await saveThemeSettingsToDatabase(requestData);
            console.log(saveResult);
            if (saveResult.success) {
                // Theme parameters come from database only, not localStorage
                //showMessage('Image settings saved successfully', 'success');
                showMessage(saveResult.response.responseMessage, 'success');
            } else {
                const errorDetails = saveResult.errors && saveResult.errors.length > 0
                    ? `: ${saveResult.errors.join('; ')}`
                    : '';
                showMessage(`Failed to save image settings: ${saveResult.message}${errorDetails}`, 'error');
            }
        } catch (error) {
            console.error('Error saving image settings:', error);
            showMessage('Error saving image settings: ' + error.message, 'error');
        }
    }

    /**
     * Load image settings from database/localStorage and populate controls
     */
    function loadImageSettingsIntoControls() {
        try {
            const stored = localStorage.getItem('kairo_theme_preset');
            if (!stored) return;

            const themeData = JSON.parse(stored);
            if (!themeData.settings || !Array.isArray(themeData.settings)) return;

            themeData.settings.forEach(setting => {
                const key = setting.SettingKey || setting.settingKey;
                const value = setting.SettingValue || setting.settingValue;

                if (key === 'Branding.ClientLogo' && value) {
                    const preview = document.getElementById('clientLogoPreview');
                    const previewImg = document.getElementById('clientLogoPreviewImg');
                    const clearBtn = document.getElementById('clearClientLogo');
                    if (previewImg) previewImg.src = value;
                    if (preview) preview.style.display = 'block';
                    if (clearBtn) clearBtn.style.display = 'block';
                } else if (key === 'Branding.BackgroundImage' && value) {
                    const preview = document.getElementById('backgroundImagePreview');
                    const previewImg = document.getElementById('backgroundImagePreviewImg');
                    const clearBtn = document.getElementById('clearBackgroundImage');
                    if (previewImg) previewImg.src = value;
                    if (preview) preview.style.display = 'block';
                    if (clearBtn) clearBtn.style.display = 'block';

                    // Apply background image instantly when loaded from settings
                    applyBackgroundImageInstantly(value);
                } else if (key === 'Branding.LoginImage' && value) {
                    const preview = document.getElementById('loginImagePreview');
                    const previewImg = document.getElementById('loginImagePreviewImg');
                    const clearBtn = document.getElementById('clearLoginImage');
                    if (previewImg) previewImg.src = value;
                    if (preview) preview.style.display = 'block';
                    if (clearBtn) clearBtn.style.display = 'block';
                }
            });
        } catch (error) {
            console.warn('Could not load image settings:', error);
        }
    }

    // ==================== EVENT HANDLERS ====================

    function setupEventHandlers() {
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.history.back();
            });
        }

        if (applyBtn) {
            applyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                saveThemeSettings();
            });
        }

        // Update user ID display and reload theme when scope changes
        const scopeRadios = document.querySelectorAll('input[name="themeScope"]');
        console.log(`🔧 [SETUP] Found ${scopeRadios.length} scope radio button(s)`);

        if (scopeRadios.length === 0) {
            console.warn('⚠️ [SETUP] No scope radio buttons found! They may not be in DOM yet. Will retry...');
            // Retry after a short delay
            setTimeout(() => {
                const retryRadios = document.querySelectorAll('input[name="themeScope"]');
                console.log(`🔧 [SETUP RETRY] Found ${retryRadios.length} scope radio button(s) on retry`);
                if (retryRadios.length > 0) {
                    retryRadios.forEach(radio => attachScopeChangeHandler(radio));
                } else {
                    console.error('❌ [SETUP] Scope radios still not found after retry. Using event delegation fallback.');
                    // Fallback: use event delegation on document
                    document.addEventListener('change', (e) => {
                        if (e.target && e.target.name === 'themeScope' && e.target.type === 'radio') {
                            console.log('🔄 [SCOPE CHANGE] Caught via event delegation');
                            attachScopeChangeHandler(e.target)();
                        }
                    });
                }
            }, 500);
        } else {
            scopeRadios.forEach(radio => attachScopeChangeHandler(radio));
        }
    }

    // Extract scope change handler to a reusable function
    function attachScopeChangeHandler(radio) {
        // Check if listener already attached (avoid duplicates)
        if (radio.dataset.scopeHandlerAttached === 'true') {
            console.log(`ℹ️ [SETUP] Scope handler already attached to radio: ${radio.value}`);
            return;
        }
        radio.dataset.scopeHandlerAttached = 'true';

        radio.addEventListener('change', async () => {
            const newScope = radio.value;
            console.log(`🔄 [SCOPE CHANGE] ============================================`);
            console.log(`🔄 [SCOPE CHANGE] Scope changed to: ${newScope}`);
            console.log(`🔄 [SCOPE CHANGE] Radio element:`, radio);

            // Update user ID display
            if (newScope === 'USER') {
                updateUserIdDisplay();
            } else {
                const userIdElement = document.getElementById('themeScopeUserId');
                if (userIdElement) {
                    userIdElement.style.display = 'none';
                }
            }

            // Store scope preference in sessionStorage for current session only
            try {
                sessionStorage.setItem('kairo_theme_scope_preference', newScope);
            } catch (e) {
                console.warn('Could not store scope preference:', e);
            }

            // Reload theme from database for the new scope
            console.log(`🔄 [SCOPE CHANGE] ============================================`);
            console.log(`🔄 [SCOPE CHANGE] Scope changed to: ${newScope}`);
            console.log(`🔄 [SCOPE CHANGE] Stored scope preference: ${newScope}`);
            console.log(`🔄 [SCOPE CHANGE] About to call loadActiveThemeFromDatabase() with scope: ${newScope}...`);
            console.log(`🔄 [SCOPE CHANGE] ============================================`);
            try {
                // Pass the new scope explicitly to ensure we load the correct theme
                const apiScope = await loadActiveThemeFromDatabase(newScope);
                console.log(`🔄 [SCOPE CHANGE] loadActiveThemeFromDatabase() completed, returned scope:`, apiScope);

                // If no theme was loaded from database, apply default theme
                // loadActiveThemeFromDatabase returns null if no theme found
                if (!apiScope) {
                    // No theme found in database, apply default theme
                    console.log(`ℹ️ [SCOPE CHANGE] No theme found for ${newScope} scope in database, applying default theme`);
                    const defaultPreset = PRESET_THEMES['original'];
                    if (defaultPreset) {
                        const tokens = defaultPreset.tokens;

                        // Apply theme immediately
                        if (window.ThemeManager && typeof window.ThemeManager.applyThemeGlobally === 'function') {
                            window.ThemeManager.applyThemeGlobally(tokens);
                        } else {
                            applyTheme(tokens, { smoothTransition: true });
                        }

                        // Update controls with default theme
                        loadCustomThemeColors();
                        loadLabelSettingsIntoControls();
                        loadImageSettingsIntoControls();

                        // Update preset selection
                        document.querySelectorAll('[data-preset-id]').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        const originalBtn = document.querySelector('[data-preset-id="original"]');
                        if (originalBtn) originalBtn.classList.add('active');
                        // No user message: applying default when no theme is saved for this scope is expected
                    }
                } else {
                    // Theme was loaded, ensure it's applied and update controls
                    console.log(`✅ [SCOPE CHANGE] Theme loaded for ${newScope} scope, ensuring it's applied...`);
                    console.log(`✅ [SCOPE CHANGE] Theme tokens count:`, Object.keys(themeData.tokens || {}).length);

                    // Force re-apply theme immediately to ensure it's visible
                    const tokens = themeData.tokens || {};
                    if (Object.keys(tokens).length > 0) {
                        console.log(`🎨 [SCOPE CHANGE] Applying theme with ${Object.keys(tokens).length} tokens...`);
                        // Apply immediately
                        if (window.ThemeManager && typeof window.ThemeManager.applyThemeGlobally === 'function') {
                            window.ThemeManager.applyThemeGlobally(tokens);
                            console.log(`✅ [SCOPE CHANGE] Theme applied via ThemeManager.applyThemeGlobally`);
                        } else {
                            applyTheme(tokens, { smoothTransition: true });
                            console.log(`✅ [SCOPE CHANGE] Theme applied via applyTheme`);
                        }
                        // Also apply to parent window if in iframe
                        if (window.parent && window.parent !== window && window.parent.ThemeManager) {
                            try {
                                window.parent.ThemeManager.applyThemeGlobally(tokens);
                                console.log(`✅ [SCOPE CHANGE] Theme also applied to parent window`);
                            } catch (e) {
                                console.warn(`⚠️ [SCOPE CHANGE] Could not apply to parent:`, e);
                            }
                        }
                        // Re-apply after a short delay to catch any late-loading elements
                        setTimeout(() => {
                            if (window.ThemeManager && typeof window.ThemeManager.applyThemeGlobally === 'function') {
                                window.ThemeManager.applyThemeGlobally(tokens);
                            } else {
                                applyTheme(tokens, { smoothTransition: false });
                            }
                        }, 300);
                    } else {
                        console.warn(`⚠️ [SCOPE CHANGE] No tokens found in theme data!`);
                    }

                    // Reload all controls with the new theme data
                    loadLabelSettingsIntoControls();
                    loadCustomThemeColors();
                    loadImageSettingsIntoControls();

                    // Update preset selection if a preset was matched
                    if (cachedActivePresetId) {
                        const presetBtn = document.querySelector(`[data-preset-id="${cachedActivePresetId}"]`);
                        if (presetBtn) {
                            // Remove active class from all preset buttons
                            document.querySelectorAll('[data-preset-id]').forEach(btn => {
                                btn.classList.remove('active');
                            });
                            presetBtn.classList.add('active');
                        }
                    } else if (themeData.preset) {
                        // Try to match preset from stored data
                        const presetBtn = document.querySelector(`[data-preset-id="${themeData.preset}"]`);
                        if (presetBtn) {
                            document.querySelectorAll('[data-preset-id]').forEach(btn => {
                                btn.classList.remove('active');
                            });
                            presetBtn.classList.add('active');
                        }
                    }

                    console.log(`✅ [SCOPE CHANGE] Theme reloaded and applied for ${newScope} scope`);
                    showMessage(`Theme settings loaded for ${newScope} scope`, 'success');
                }
            } catch (error) {
                console.error(`❌ [SCOPE CHANGE] Error reloading theme for ${newScope} scope:`, error);
                // If error, show default/original theme
                console.log(`ℹ️ [SCOPE CHANGE] Error loading theme, showing default theme`);

                // Load default theme
                const defaultPreset = PRESET_THEMES['original'];
                if (defaultPreset) {
                    const tokens = defaultPreset.tokens;

                    // Apply theme immediately
                    if (window.ThemeManager && typeof window.ThemeManager.applyThemeGlobally === 'function') {
                        window.ThemeManager.applyThemeGlobally(tokens);
                    } else {
                        applyTheme(tokens, { smoothTransition: true });
                    }

                    // Clear custom theme indicators
                    loadCustomThemeColors();
                    loadLabelSettingsIntoControls();
                    loadImageSettingsIntoControls();

                    // Update preset selection
                    document.querySelectorAll('[data-preset-id]').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    const originalBtn = document.querySelector('[data-preset-id="original"]');
                    if (originalBtn) originalBtn.classList.add('active');

                    showMessage(`Error loading theme for ${newScope} scope, showing default theme`, 'warning');
                }
            }
        });

        console.log(`✅ [SETUP] Attached scope change handler to radio: ${radio.value}`);
    }

    // ==================== INITIALIZATION ====================

    async function init() {
        console.log('=== Theme Configuration Init ===');

        // Ensure DOM is ready before setting up navigation
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                if (document.readyState === 'complete') {
                    resolve();
                } else {
                    document.addEventListener('DOMContentLoaded', resolve);
                }
            });
        }

        setupSectionNavigation();
        setupSectionToggle();
        setupSidebarToggle();
        setupColorInputs();
        setupEventHandlers();
        setupThemeFilters();
        setupLabelControls();
        setupCustomThemeControls();
        setupImageControls();

        // Update user ID display immediately
        updateUserIdDisplay();

        const apiScope = await loadActiveThemeFromDatabase();
        restoreThemeScope(apiScope); // Restore scope radio button using scope from database (if available)
        loadLabelSettingsIntoControls();
        loadCustomThemeColors();
        loadImageSettingsIntoControls();
        renderPresetThemes('all');

        // Ensure glassmorphism is always enabled
        applyGlassmorphismToDocuments(true);

        // Hide legacy preset section, show new structure
        const legacyPresetsSection = document.getElementById('panel-presets');
        if (legacyPresetsSection) {
            legacyPresetsSection.style.display = 'none';
        }

        // Show preset themes section by default; hide others with smooth transitions
        sections.forEach(s => {
            if (s.dataset.section === 'presets') {
                s.style.display = 'block';
                requestAnimationFrame(() => {
                    s.classList.add('active');
                    s.style.opacity = '1';
                    s.style.visibility = 'visible';
                    s.style.transform = 'translateY(0)';
                });
            } else {
                s.style.display = 'none';
                s.classList.remove('active');
                s.style.opacity = '0';
                s.style.visibility = 'hidden';
                s.style.transform = 'translateY(10px)';
            }
        });

        // Activate sidebar "Preset Themes" item
        const presetsBtn = document.querySelector('.theme-config-nav-item[data-section="presets"], [data-section="presets"].btn-action');
        if (presetsBtn) {
            presetsBtn.classList.add('active');
            presetsBtn.setAttribute('aria-selected', 'true');
        }
        document.querySelectorAll('.theme-config-nav-item[data-section="label-typography"], [data-section="label-typography"].btn-action').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.theme-config-nav-item[data-section="branding-images"], [data-section="branding-images"].btn-action').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
        });

        console.log('UI handlers setup complete\n');

        // Load colors AFTER ensuring CSS is painted
        // requestAnimationFrame ensures browser has painted
        // then setTimeout gives final assurance
        requestAnimationFrame(() => {
            setTimeout(() => {
                loadColorsFromUI();
            }, 25);
        });
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

