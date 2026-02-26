// Account Maintenance JavaScript
(function () {
    
    const CHILD_FORMS = {
        'documents': 'dataentry/account-documents.html',
        'signatories': 'dataentry/account-signatories.html',
        'account-sweeping': 'dataentry/account-sweeping.html',
        'nomination': 'dataentry/account-nomination.html',
        'closing': 'dataentry/account-closing.html',
        'charge-rates': 'dataentry/account-charge-rates.html',
        'blocking-unblocking': 'dataentry/account-blocking-unblocking.html',
        'user-defined-fields': 'dataentry/user-defined-fields.html',
        'account-classification': 'dataentry/account-classification.html',
        'account-notification': 'dataentry/account-notification.html',
        'special-conditions': 'dataentry/account-special-conditions.html',
        'interest-rates': 'dataentry/account-interest-rates.html',
        'account-notes': 'dataentry/account-notes.html',
        'freeze-release': 'dataentry/account-freeze-release.html',
        'card-maintenance': 'dataentry/card-maintenance.html',
        'cheque-book': 'dataentry/account-cheque-book.html',
        'stop-payment-void': 'dataentry/account-stop-payment-void.html',
        'cancel-stop-payment': 'dataentry/account-cancel-stop-payment.html',
        'activate-dormant': 'dataentry/account-activate-dormant.html',
        'reminders': 'dataentry/account-reminders.html',
        'account-activation': 'dataentry/account-activation.html',
        'account-transfer': 'dataentry/account-transfer.html',
        'statement-view': 'view/statement-view.html',
        'signature-photo': 'view/signature-photo.html',
        'client-portfolio': 'view/client-portfolio.html',
        'loan-repayment-details': 'view/loan-repayment-details.html',
        'debit-interest-worksheet': 'view/debit-interest-worksheet.html',
        'credit-interest-worksheet': 'view/credit-interest-worksheet.html'
    };

    function getOverlayEls() {
        return {
            overlay: document.querySelector('[data-child-inline]'),
            iframe: document.querySelector('[data-child-iframe]'),
            mainForm: document.querySelector('[data-main-form]'),
            mainContainer: document.querySelector('.main-container')
        };
    }

    const THEME_VAR_KEYS = [
        // Core theme vars used by modern-account-maintenance.css and DataEntry overlay
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
        '--kairo-form-actions-bg',
        
        // Theme color variables for headers
        '--color-header',
        '--color-primary',
        '--ktb-bg',
        '--ktb-bg-dark',
        '--am-primary',
        '--am-primary-dark'
    ];

    let currentMode = 'VIEW';

    // Global state to track loaded account - exposed to child forms
    window.AccountMaintenanceState = {
        isAccountLoaded: false,
        AccountID: '',
        AccountName: '',
        AccountTypeID: '',
        ProductID: '',
        OurBranchID: '',
        BranchName: '',
        ClientID: '',
        OperatorID: '',
        OperatingModeID: '',
        OperatingModeDescription: '',
        OperatingInstructions: ''
    };

    function resetAccountMaintenanceState() {
        window.AccountMaintenanceState = {
            isAccountLoaded: false,
            AccountID: '',
            AccountName: '',
            AccountTypeID: '',
            ProductID: '',
            OurBranchID: '',
            BranchName: '',
            ClientID: '',
            OperatorID: '',
            OperatingModeID: '',
            OperatingModeDescription: '',
            OperatingInstructions: ''
        };
        currentMode = 'VIEW';
    }

    // ============================================================================
    // PAGE LOADER UTILITY
    // ============================================================================
    function showPageLoader(show, message = 'Loading account...') {
        const overlay = document.getElementById('pageLoadingOverlay');
        const textEl = document.getElementById('pageLoadingText');
        if (!overlay) return;
        
        if (textEl) textEl.textContent = message;
        overlay.hidden = !show;
    }

    function copyThemeVarsToDocument(targetDoc) {
        if (!targetDoc || !targetDoc.documentElement) return;
        const computed = getComputedStyle(document.documentElement);
        const root = targetDoc.documentElement;
        
        // Copy CSS variables
        THEME_VAR_KEYS.forEach((key) => {
            const value = computed.getPropertyValue(key);
            const trimmed = value === undefined || value === null ? '' : String(value).trim();
            if (trimmed) root.style.setProperty(key, trimmed, 'important');
        });
        
        // Get theme header color for direct CSS injection
        const headerColor = computed.getPropertyValue('--color-header').trim() || 
                          computed.getPropertyValue('--color-primary').trim() || 
                          '#4a7c95';
        
        // Inject direct CSS rules for .am-header with highest specificity
        let styleEl = targetDoc.getElementById('kairo-account-maintenance-theme');
        if (!styleEl) {
            styleEl = targetDoc.createElement('style');
            styleEl.id = 'kairo-account-maintenance-theme';
            targetDoc.head.appendChild(styleEl);
        }
        
        const darkerColor = `color-mix(in srgb, ${headerColor} 85%, black 15%)`;
        styleEl.textContent = `
            .am-header { 
                background: linear-gradient(180deg, ${headerColor} 0%, ${darkerColor} 100%) !important; 
            }
            .window .am-header, .de-window .am-header, body .am-header, iframe .am-header { 
                background: linear-gradient(180deg, ${headerColor} 0%, ${darkerColor} 100%) !important; 
            }
        `;
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
        const { overlay, mainForm, mainContainer } = getOverlayEls();
        if (!overlay || !mainContainer) return;
        
        if (isOpen) {
            // Animate: Hide main form, show child form
            mainContainer.classList.add('child-opening');
            overlay.hidden = false;
            
            // Small delay to ensure CSS transitions work
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    mainContainer.classList.add('child-open');
                    overlay.classList.add('is-visible');
                    overlay.classList.remove('is-closing');
                    
                    // Clean up opening state after animation
                    setTimeout(() => {
                        mainContainer.classList.remove('child-opening');
                        if (mainForm) mainForm.hidden = true;
                    }, 350);
                });
            });
        } else {
            // Animate: Hide child form, show main form
            mainContainer.classList.add('child-closing');
            mainContainer.classList.remove('child-expanded'); // Reset expanded state
            overlay.classList.add('is-closing');
            overlay.classList.remove('is-visible');
            
            // Reset expand button icon
            const expandBtn = document.getElementById('expandChildBtn');
            if (expandBtn) {
                expandBtn.querySelector('i').className = 'bi bi-arrows-fullscreen';
                expandBtn.setAttribute('title', 'Expand');
            }
            
            // Show main form immediately for the animation
            if (mainForm) mainForm.hidden = false;
            
            // Wait for animation to complete
            setTimeout(() => {
                overlay.hidden = true;
                mainContainer.classList.remove('child-open', 'child-closing');
            }, 350);
        }
    }

    function toggleChildExpand() {
        const mainContainer = document.querySelector('.main-container');
        const expandBtn = document.getElementById('expandChildBtn');
        if (!mainContainer) return;
        
        const isExpanded = mainContainer.classList.contains('child-expanded');
        
        if (isExpanded) {
            // Collapse - show sidebar
            mainContainer.classList.remove('child-expanded');
            if (expandBtn) {
                expandBtn.querySelector('i').className = 'bi bi-arrows-fullscreen';
                expandBtn.setAttribute('title', 'Expand');
            }
        } else {
            // Expand - hide sidebar
            mainContainer.classList.add('child-expanded');
            if (expandBtn) {
                expandBtn.querySelector('i').className = 'bi bi-arrows-angle-contract';
                expandBtn.setAttribute('title', 'Collapse');
            }
        }
    }

    // Forms that require a loaded account before navigation
    const ACCOUNT_REQUIRED_FORMS = [
        'documents', 'signatories', 'account-sweeping', 'nomination', 'closing',
        'charge-rates', 'blocking-unblocking', 'user-defined-fields', 'account-classification',
        'account-notification', 'special-conditions', 'interest-rates', 'account-notes',
        'freeze-release', 'card-maintenance', 'cheque-book', 'stop-payment-void',
        'cancel-stop-payment', 'activate-dormant', 'reminders', 'account-activation',
        'account-transfer', 'statement-view', 'signature-photo', 'client-portfolio',
        'loan-repayment-details', 'debit-interest-worksheet', 'credit-interest-worksheet'
    ];

    // Track active submodule
    let activeSubmodule = null;
    let submoduleBlockingEnabled = true;

    // Apply blur to sidebar only
    function applyParentBlur() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.style.filter = 'blur(3px)';
            sidebar.style.pointerEvents = 'none';
        }
    }

    // Remove blur from sidebar
    function removeParentBlur() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.style.filter = 'none';
            sidebar.style.pointerEvents = 'auto';
        }
    }

    // Reset blur state to original loading state
    function resetBlurState() {
        activeSubmodule = null;
        removeParentBlur();
    }

    // Listen for messages from child forms (submodules)
    window.addEventListener('message', function(event) {
        if (!event.data) return;
        
        if (event.data.action === 'submoduleOpened') {
            // A submodule has opened - keep sidebar visible
            activeSubmodule = event.data.source;
            console.log('Submodule opened:', activeSubmodule);
        } else if (event.data.action === 'blockSubmoduleOpen') {
            // A submodule is blocking another from opening
            console.log('Cannot open ' + event.data.blockedModule + ': ' + event.data.reason);
            showSystemToast('Please close \'' + event.data.source + '\' first');
        } else if (event.data.action === 'submoduleClosed') {
            // A submodule has closed - close the iframe
            if (activeSubmodule === event.data.source) {
                activeSubmodule = null;
                closeChildForm();
                console.log('Submodule closed:', event.data.source);
            }
        } else if (event.data.action === 'toggleSidebarForMaximize') {
            // Handle sidebar collapse/expand for maximize button
            const sidebar = document.querySelector('.sidebar');
            const mainContainer = document.querySelector('.main-container');
            const sidebarToggle = document.getElementById('sidebarToggle');
            
            if (event.data.maximize) {
                // Collapse sidebar when maximizing
                if (sidebar) sidebar.classList.add('collapsed');
                if (mainContainer) mainContainer.classList.add('sidebar-collapsed');
                if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', 'false');
            } else {
                // Expand sidebar when restoring
                if (sidebar) sidebar.classList.remove('collapsed');
                if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
                if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', 'true');
            }
        }
    });

    function openChildForm(childKey) {
        // Check if another submodule is already active
        if (activeSubmodule) {
            showSystemToast('Please close \'' + activeSubmodule + '\' first');
            return;
        }
        
        const path = CHILD_FORMS[childKey];
        const { iframe } = getOverlayEls();
        if (!path || !iframe) return;
        
        // Check if this form requires a loaded account
        if (ACCOUNT_REQUIRED_FORMS.includes(childKey)) {
            if (!window.AccountMaintenanceState?.isAccountLoaded) {
                showSystemToast('Please load an account before accessing this feature.', { 
                    title: 'Account Required', 
                    variant: 'warning',
                    timeoutMs: 4000
                });
                return;
            }
        }

        // Clear any existing sessionStorage first to prevent stale data
        try {
            sessionStorage.removeItem('currentAccountID');
            sessionStorage.removeItem('currentBranchID');
        } catch (e) {
            console.warn('[openChildForm] Failed to clear sessionStorage:', e);
        }
        
        // Store current AccountID in sessionStorage for child forms to access (only if account is loaded)
        if (window.AccountMaintenanceState.AccountID && window.AccountMaintenanceState.isAccountLoaded) {
            sessionStorage.setItem('currentAccountID', window.AccountMaintenanceState.AccountID);
            sessionStorage.setItem('currentBranchID', window.AccountMaintenanceState.OurBranchID || '');
            sessionStorage.setItem('currentProductID', window.AccountMaintenanceState.ProductID || '');
            sessionStorage.setItem('currentClientID', window.AccountMaintenanceState.ClientID || '');
        }

        // Force a fresh load every time (no cached content, errors, or previous data)
        showPageLoader(true, 'Loading form...');
        iframe.onload = function () {
            applyThemeVarsToChildIframe();
            showPageLoader(false);
        };
        const cacheBust = `v=${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const separator = path.includes('?') ? '&' : '?';
        iframe.src = `${path}${separator}${cacheBust}`;
        setOverlayOpen(true);
    }

    function closeChildForm() {
        const { overlay, iframe } = getOverlayEls();
        activeSubmodule = null;
        
        // Kill the iframe completely so next load has no previous user data, errors, or viewed content
        if (iframe && overlay) {
            iframe.src = 'about:blank';
            const newIframe = document.createElement('iframe');
            newIframe.className = 'child-iframe-inline';
            newIframe.setAttribute('data-child-iframe', '');
            newIframe.setAttribute('title', 'DataEntry Submodule');
            iframe.replaceWith(newIframe);
        }
        
        showPageLoader(false);
        setOverlayOpen(false);
        
        try {
            sessionStorage.removeItem('currentAccountID');
            sessionStorage.removeItem('currentBranchID');
        } catch (e) {
            console.warn('[closeChildForm] Failed to clear sessionStorage:', e);
        }
    }

    function setSectionOpen(sectionEl, isOpen) {
        if (!sectionEl) return;
        sectionEl.classList.toggle('is-open', Boolean(isOpen));
        sectionEl.classList.toggle('expanded', Boolean(isOpen));

        const toggle = sectionEl.querySelector('.nav-arrow, .nav-arrow--card');
        const items = sectionEl.querySelector('.nav-items, .nav-items--card');

        if (toggle) toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (items) {
            // Remove hidden attribute to allow CSS transitions
            items.removeAttribute('hidden');
            
            // Only hide items if sidebar is not collapsed
            const sidebar = document.getElementById('main-sidebar');
            if (sidebar && sidebar.classList.contains('collapsed')) {
                // When collapsed, items are hidden via CSS
                return;
            }
            
            // Toggle visibility class for CSS transitions
            if (isOpen) {
                items.classList.add('is-visible');
                items.style.pointerEvents = 'auto';
            } else {
                items.classList.remove('is-visible');
                items.style.pointerEvents = 'none';
            }
        }
    }

    function wireNavSections() {
        const sections = Array.from(document.querySelectorAll('[data-nav-section]'));
        if (!sections.length) return;

        sections.forEach(section => {
            const header = section.querySelector('.nav-header, .nav-header--card');
            if (!header) return;

            // Allow clicking anywhere on the header to toggle
            header.addEventListener('click', function (e) {
                // Don't toggle if clicking on the badge number
                if (e.target.closest('.nav-badge')) return;
                
                const sidebar = document.getElementById('main-sidebar');
                const mainContainer = document.querySelector('.main-container');
                const toggle = document.getElementById('sidebarToggle');
                const isCollapsed = sidebar && sidebar.classList.contains('collapsed');
                
                // If sidebar is collapsed, expand it first and open this section
                if (isCollapsed) {
                    sidebar.classList.remove('collapsed');
                    if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
                    if (toggle) toggle.setAttribute('aria-expanded', 'true');
                    
                    // Close all sections first, then open the clicked one
                    sections.forEach(s => setSectionOpen(s, false));
                    setSectionOpen(section, true);
                    section.classList.add('expanded');
                    return;
                }
                
                const willOpen = !section.classList.contains('is-open');

                // behave like a dropdown: opening one closes the other
                sections.forEach(s => setSectionOpen(s, false));
                setSectionOpen(section, willOpen);
                
                // Add expanded class for CSS styling
                if (willOpen) {
                    section.classList.add('expanded');
                } else {
                    section.classList.remove('expanded');
                }
            });
        });

        // ensure initial state is consistent with markup
        sections.forEach(section => {
            const initiallyOpen = section.classList.contains('is-open');
            setSectionOpen(section, initiallyOpen);
        });
    }

    function wireSidebarToggle() {
        const sidebar = document.getElementById('main-sidebar');
        const toggle = document.getElementById('sidebarToggle');
        const mainContainer = document.querySelector('.main-container');
        if (!sidebar || !toggle) return;

        toggle.addEventListener('click', function (e) {
            e.stopPropagation();
            e.preventDefault();
            const isCollapsed = sidebar.classList.contains('collapsed');
            
            if (isCollapsed) {
                // Expanding
                sidebar.classList.remove('collapsed');
                if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
                toggle.setAttribute('aria-expanded', 'true');
                // Icon stays as hamburger (bi-list) for both states
                // Restore nav-items visibility based on section state
                document.querySelectorAll('.nav-section--card').forEach(section => {
                    const items = section.querySelector('.nav-items--card');
                    if (items) {
                        const isSectionOpen = section.classList.contains('is-open');
                        items.hidden = !isSectionOpen;
                    }
                });
            } else {
                // Collapsing
                sidebar.classList.add('collapsed');
                if (mainContainer) mainContainer.classList.add('sidebar-collapsed');
                toggle.setAttribute('aria-expanded', 'false');
                // Icon stays as hamburger (bi-list) for both states
                // Show all nav-items when collapsed (for icon display)
                document.querySelectorAll('.nav-items--card').forEach(items => {
                    items.hidden = false;
                });
            }
        });
    }

    function wireSidebar() {
        // Wire sidebar items with data-child-form
        document.querySelectorAll('.sidebar-item[data-child-form], .sidebar-item--enhanced[data-child-form]').forEach(item => {
            item.addEventListener('click', function (e) {
                e.stopPropagation();
                
                const sidebar = document.getElementById('main-sidebar');
                const mainContainer = document.querySelector('.main-container');
                const toggle = document.getElementById('sidebarToggle');
                const isCollapsed = sidebar && sidebar.classList.contains('collapsed');
                
                // If sidebar is collapsed, expand it first
                if (isCollapsed) {
                    sidebar.classList.remove('collapsed');
                    if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
                    if (toggle) toggle.setAttribute('aria-expanded', 'true');
                    
                    // Find and open the parent section
                    const parentSection = this.closest('.nav-section--card');
                    if (parentSection) {
                        document.querySelectorAll('.nav-section--card').forEach(s => setSectionOpen(s, false));
                        setSectionOpen(parentSection, true);
                        parentSection.classList.add('expanded');
                    }
                }
                
                // Set active state
                document.querySelectorAll('.sidebar-item[data-child-form], .sidebar-item--enhanced[data-child-form]').forEach(i => i.classList.remove('active'));
                this.classList.add('active');

                const childKey = this.getAttribute('data-child-form');
                
                // Show confirmation for blocking-unblocking
                if (childKey === 'blocking-unblocking') {
                    showBlockingConfirmation();
                } else if (childKey) {
                    openChildForm(childKey);
                }
            });
        });
    }

    /**
     * Show blocking/unblocking confirmation modal
     * Move modal to end of body so it stacks above header/sidebar (fixes distorted popup).
     */
    function showBlockingConfirmation() {
        const modal = document.getElementById('blockingConfirmModal');
        const accountInfo = document.getElementById('blockingConfirmAccountInfo');
        const accountId = document.getElementById('AccountID')?.value || '';
        
        if (accountInfo) {
            accountInfo.textContent = `[No:${accountId}]`;
        }
        
        if (modal) {
            if (modal.parentNode !== document.body) {
                document.body.appendChild(modal);
            }
            modal.hidden = false;
        }
    }

    /**
     * Hide blocking/unblocking confirmation modal
     */
    function hideBlockingConfirmation() {
        const modal = document.getElementById('blockingConfirmModal');
        if (modal) {
            modal.hidden = true;
        }
    }

    /**
     * Wire blocking confirmation modal buttons
     */
    function wireBlockingConfirmation() {
        const yesBtn = document.getElementById('blockingConfirmYes');
        const noBtn = document.getElementById('blockingConfirmNo');
        const closeBtn = document.getElementById('blockingConfirmClose');
        const backdrop = document.querySelector('#blockingConfirmModal .confirm-modal__backdrop');
        
        if (yesBtn) {
            yesBtn.addEventListener('click', function() {
                hideBlockingConfirmation();
                openChildForm('blocking-unblocking');
            });
        }
        
        if (noBtn) {
            noBtn.addEventListener('click', function() {
                hideBlockingConfirmation();
                // Remove active state from blocking-unblocking sidebar item
                document.querySelectorAll('.sidebar-item[data-child-form="blocking-unblocking"], .sidebar-item--enhanced[data-child-form="blocking-unblocking"]').forEach(i => i.classList.remove('active'));
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                hideBlockingConfirmation();
                document.querySelectorAll('.sidebar-item[data-child-form="blocking-unblocking"], .sidebar-item--enhanced[data-child-form="blocking-unblocking"]').forEach(i => i.classList.remove('active'));
            });
        }
        
        if (backdrop) {
            backdrop.addEventListener('click', function() {
                hideBlockingConfirmation();
                document.querySelectorAll('.sidebar-item[data-child-form="blocking-unblocking"], .sidebar-item--enhanced[data-child-form="blocking-unblocking"]').forEach(i => i.classList.remove('active'));
            });
        }
    }

    function wireRecentActivities() {
        // Wire recent activities items (those with sidebar-item--static, excluding API-populated recent list)
        document.querySelectorAll('.sidebar-item--static').forEach(item => {
            if (item.closest('[data-recent-activities-container]') || item.dataset.activityBranch) return;
            item.addEventListener('click', async function (e) {
                e.stopPropagation();
                
                const titleEl = this.querySelector('.sidebar-item__title');
                if (!titleEl) return;
                
                const titleText = titleEl.textContent?.trim() || '';
                // Parse the title format: "BranchID AccountID" (e.g., "0101 0325130000016")
                const parts = titleText.split(' ').filter(p => p.trim());
                if (parts.length < 2) {
                    console.warn('[wireRecentActivities] Invalid title format:', titleText);
                    return;
                }
                
                const branchId = parts[0].trim();
                const accountId = parts[1].trim();
                
                // Populate the Branch and Account fields
                const { branchIdInput } = findBranchInputs();
                const accountIdInput = document.getElementById('AccountID');
                
                if (branchIdInput) {
                    branchIdInput.value = branchId;
                    // Trigger change event to update any dependent controls
                    branchIdInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
                
                if (accountIdInput) {
                    accountIdInput.value = accountId;
                    // Trigger change event to update any dependent controls
                    accountIdInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
                
                // Clear previous validation errors
                clearAllFieldErrors();
                
                // Trigger the View action (load account details)
                currentMode = 'VIEW';
                try {
                    await tryGetAccount(0);
                    
                    // Update active state in sidebar
                    document.querySelectorAll('.sidebar-item--static').forEach(i => i.classList.remove('active'));
                    this.classList.add('active');
                    
                    // Underline the View button
                    document.querySelectorAll('.btn-action').forEach(b => {
                        b.classList.remove('underline');
                        if (b.textContent.trim() === 'View') {
                            b.classList.add('underline');
                        }
                    });
                } catch (error) {
                    console.error('[wireRecentActivities] View failed', error);
                    showErrorMessage('Unable to load account details.');
                }
            });
            
            // Add cursor pointer to indicate clickable
            item.style.cursor = 'pointer';
        });
    }

    function wireSubmoduleSearch() {
        const searchInput = document.getElementById('submoduleSearch');
        const clearButton = document.getElementById('submoduleSearchClear');
        if (!searchInput) return;

        const toggleClearVisibility = () => {
            if (!clearButton) return;
            const hasValue = Boolean(searchInput.value.trim());
            clearButton.classList.toggle('is-visible', hasValue);
            clearButton.setAttribute('aria-hidden', hasValue ? 'false' : 'true');
        };

        const applySubmoduleFilter = () => {
            const searchTerm = searchInput.value.toLowerCase().trim();
            const allItems = document.querySelectorAll('.sidebar-item--enhanced[data-child-form]');
            const sections = document.querySelectorAll('.nav-section--card');

            allItems.forEach(item => {
                const title = item.querySelector('.sidebar-item__title')?.textContent.toLowerCase() || '';
                const description = item.querySelector('.sidebar-item__description')?.textContent.toLowerCase() || '';
                const matches = !searchTerm || title.includes(searchTerm) || description.includes(searchTerm);
                
                item.style.display = matches ? '' : 'none';
            });

            // Handle section visibility and auto-expansion based on search results
            sections.forEach(section => {
                const items = section.querySelectorAll('.sidebar-item--enhanced[data-child-form]');
                const visibleItems = Array.from(items).filter(item => item.style.display !== 'none');
                const navItems = section.querySelector('.nav-items--card');
                
                if (searchTerm) {
                    // When searching, auto-expand sections with matching items
                    if (visibleItems.length > 0) {
                        // Expand this section to show matches
                        setSectionOpen(section, true);
                        section.classList.add('expanded');
                        if (navItems) navItems.style.display = '';
                    } else {
                        // Hide sections with no matches
                        setSectionOpen(section, false);
                        section.classList.remove('expanded');
                        if (navItems) navItems.style.display = 'none';
                    }
                } else {
                    // No search term - restore original collapsed state
                    if (navItems) navItems.style.display = '';
                    // Collapse all sections when search is cleared
                    setSectionOpen(section, false);
                    section.classList.remove('expanded');
                }
            });

            toggleClearVisibility();
        };

        searchInput.addEventListener('input', applySubmoduleFilter);

        if (clearButton) {
            clearButton.addEventListener('click', () => {
                if (!searchInput.value) return;
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                searchInput.focus();
            });
            toggleClearVisibility();
        }
    }

    function updateBadgeCounts() {
        // Update Core Management badge (DataEntry items)
        const dataEntrySection = document.querySelector('#nav-dataentry')?.closest('.nav-section--card');
        if (dataEntrySection) {
            const dataEntryItems = dataEntrySection.querySelectorAll('.sidebar-item--enhanced[data-child-form]');
            const dataEntryBadge = dataEntrySection.querySelector('.nav-badge');
            if (dataEntryBadge && dataEntryItems.length > 0) {
                dataEntryBadge.textContent = dataEntryItems.length;
            }
        }

        // Update View badge
        const viewSection = document.querySelector('#nav-view')?.closest('.nav-section--card');
        if (viewSection) {
            const viewItems = viewSection.querySelectorAll('.sidebar-item--enhanced[data-child-form]');
            const viewBadge = viewSection.querySelector('.nav-badge');
            if (viewBadge && viewItems.length > 0) {
                viewBadge.textContent = viewItems.length;
            }
        }
    }

    function wireOverlayClose() {
        const { overlay } = getOverlayEls();
        if (!overlay) return;

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeChildForm();
        });

        window.addEventListener('message', function (event) {
            const data = event && event.data;
            if (!data || typeof data !== 'object') return;
            if (data.type === 'accountMaintenanceChildClose') closeChildForm();
            if (data.type === 'accountMaintenanceOpenChild' && data.childKey) openChildForm(data.childKey);
            if (data.type === 'accountMaintenanceReset') resetToDefaultState();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeChildForm();
        });
    }

    function resolveLookupInput(btn) {
        if (!btn) return null;

        const targetId = btn.getAttribute('data-target-input');
        if (targetId) {
            const explicit = document.getElementById(targetId);
            if (explicit) return explicit;
        }

        const clientWrapper = btn.closest('[data-kairo-client-control]');
        if (clientWrapper) {
            const clientIdInput = clientWrapper.querySelector('#ClientID');
            if (clientIdInput) return clientIdInput;
        }

        const productWrapper = btn.closest('[data-kairo-product-control]');
        if (productWrapper) {
            const productIdInput = productWrapper.querySelector('#ProductID');
            if (productIdInput) return productIdInput;
        }

        const branchWrapper = btn.closest('[data-kairo-branch-control]');
        if (branchWrapper) {
            const branchIdInput = branchWrapper.querySelector('#BranchID');
            if (branchIdInput) return branchIdInput;
        }

        const accountWrapper = btn.closest('[data-kairo-account-control]');
        if (accountWrapper) {
            const accountIdInput = accountWrapper.querySelector('#AccountID');
            if (accountIdInput) return accountIdInput;
        }

        const prev = btn.previousElementSibling;
        if (prev && prev.tagName === 'INPUT') return prev;

        return null;
    }

    const sanitizeValue = (val = '') => String(val || '').replace(/'/g, "''").trim();
    const getInputValue = (id) => (document.getElementById(id)?.value || '').trim();

    let searchModalInstance = null;

    function ensureSearchModal() {
        if (searchModalInstance) return searchModalInstance;

        if (typeof window.SearchModal !== 'function' || !window.SearchService) {
            console.warn('[AccountMaintenance] SearchModal/SearchService not available');
            return null;
        }

        searchModalInstance = new window.SearchModal({
            prefix: 'amm',
            moduleID: '1000',
            getOperatorId: () => window.AccountMaintenanceState?.OperatorID || 'web_portal',
            getOurBranchId: () => getInputValue('BranchID') || window.AccountMaintenanceState?.OurBranchID || '',
            onError: (err) => {
                console.error('[AccountMaintenance] Search error:', err);
                if (typeof showSystemToast === 'function') {
                    showSystemToast(err?.message || 'Search failed. Please try again.', { title: 'Search', variant: 'danger' });
                }
            }
        });

        return searchModalInstance;
    }

    function wireLookupButtons() {
        document.querySelectorAll('.btn-lookup').forEach(btn => {
            btn.addEventListener('click', function () {
                const targetId = this.getAttribute('data-target-input') || resolveLookupInput(this)?.id || '';
                const normalized = (targetId || '').toLowerCase();

                switch (normalized) {
                    case 'clientid':
                        openClientSearchPanel();
                        return;
                    case 'accountid':
                        openAccountSearchPanel();
                        return;
                    case 'liquidationaccountid':
                        openAccountSearchPanel({ targetId: 'LiquidationAccountID', targetNameId: 'LiquidationAccountName' });
                        return;
                    case 'productid':
                        openProductSearchPanel();
                        return;
                    case 'branchid':
                        openBranchSearchPanel();
                        return;
                    case 'passbookserialid':
                        openPassbookSearch();
                        return;
                    case 'salesofficerid':
                        openSalesOfficerSearch();
                        return;
                    default:
                        if (typeof showSystemToast === 'function') {
                            showSystemToast('Search is not available for this field.', { title: 'Search', variant: 'warning' });
                        } else {
                            console.warn('[AccountMaintenance] No search handler for target:', targetId);
                        }
                }
            });
        });
    }

    function wireClientControl() {
        const clientIdInput = document.getElementById('ClientID');
        const clientNameInput = document.getElementById('ClientName');
        if (!clientIdInput || !clientNameInput) return;

        clientIdInput.addEventListener('input', () => {
            if (!clientIdInput.value.trim()) clientNameInput.value = '';
        });
        
        // Auto-fill client name when user tabs away (for paste scenarios)
        clientIdInput.addEventListener('blur', async () => {
            const clientIdVal = clientIdInput.value.trim();
            if (!clientIdVal) {
                clientNameInput.value = '';
                return;
            }
            
            // Skip if client name already populated
            if (clientNameInput.value.trim()) return;
            
            try {
                const service = window.ClientService || window.SearchService;
                if (!service) return;
                
                const payload = {
                    TableID: 'ClientID',
                    WhereStmt: `ClientID = '${clientIdVal.replace(/'/g, "''")}'`,
                    AdvFilterString: '',
                    PrevOrNext: '1',
                    RefID: '',
                    OperatorID: 'web_portal',
                    ModuleID: 1000,
                    OurBranchID: document.getElementById('BranchID')?.value || ''
                };
                
                const response = service.searchClients ? await service.searchClients(payload) : await service.search(payload);
                let rows = response?.Details?.SearchResults || response?.Details || response?.SearchResults || [];
                if (!Array.isArray(rows)) rows = rows ? [rows] : [];
                
                if (rows.length > 0) {
                    const client = rows[0];
                    const clientName = client.ClientName || client.FullName || client.Name || client.Description || '';
                    clientNameInput.value = clientName;
                }
            } catch (err) {
                console.error('[AccountMaintenance] Failed to auto-fill client name:', err);
            }
        });
    }

    function wireProductControl() {
        const productIdInput = document.getElementById('ProductID');
        const productNameInput = document.getElementById('ProductName');
        if (!productIdInput || !productNameInput) return;

        productIdInput.addEventListener('input', () => {
            if (!productIdInput.value.trim()) productNameInput.value = '';
        });
        
        // Auto-fill product name when user tabs away (for paste scenarios)
        productIdInput.addEventListener('blur', async () => {
            const productIdVal = productIdInput.value.trim();
            if (!productIdVal) {
                productNameInput.value = '';
                return;
            }
            
            // Skip if product name already populated (unless in ADD mode where we also fetch opening details)
            const hasName = productNameInput.value.trim();
            
            // Fetch product name if not already populated
            if (!hasName) {
                try {
                    const service = window.ProductService || window.SearchService;
                    if (service) {
                        const payload = {
                            TableID: 'ProductID',
                            WhereStmt: `ProductID = '${productIdVal.replace(/'/g, "''")}'`,
                            AdvFilterString: '',
                            PrevOrNext: '1',
                            RefID: '',
                            OperatorID: 'web_portal',
                            ModuleID: 1000,
                            OurBranchID: document.getElementById('BranchID')?.value || ''
                        };
                        
                        const response = service.searchProducts ? await service.searchProducts(payload) : await service.search(payload);
                        let rows = response?.Details?.SearchResults || response?.Details || response?.SearchResults || [];
                        if (!Array.isArray(rows)) rows = rows ? [rows] : [];
                        
                        if (rows.length > 0) {
                            const product = rows[0];
                            const productName = product.ProductName || product.Description || product.Name || '';
                            productNameInput.value = productName;
                        }
                    }
                } catch (err) {
                    console.error('[AccountMaintenance] Failed to auto-fill product name:', err);
                }
            }

            // Fetch opening details on blur when in ADD mode and both ClientID and ProductID have values
            const clientIdVal = document.getElementById('ClientID')?.value?.trim() || '';
            // console.log('[wireProductControl] Blur event - Mode:', currentMode, 'ClientID:', clientIdVal, 'ProductID:', productIdVal);
            if (currentMode !== 'ADD') {
                // console.log('[wireProductControl] Not in ADD mode, skipping fetch');
                return;
            }
            if (!clientIdVal || !productIdVal) {
                // console.log('[wireProductControl] Missing ClientID or ProductID, skipping fetch');
                return;
            }
            // console.log('[wireProductControl] Calling fetchAccountOpeningDetails...');
            try {
                await fetchAccountOpeningDetails();
            } catch (error) {
                console.error('[AccountMaintenance] Opening details fetch failed', error);
            }
        });
    }

    function wireBranchControl() {
        const branchIdInput = document.getElementById('BranchID');
        const branchNameInput = document.getElementById('BranchName');
        if (!branchIdInput || !branchNameInput) return;

        branchIdInput.addEventListener('input', () => {
            if (!branchIdInput.value.trim()) branchNameInput.value = '';
        });

        // performBranchLookup - same pattern as loan maintenance (client maintenance)
        const performBranchLookup = async () => {
            const branchIdVal = branchIdInput.value.trim();
            if (!branchIdVal) {
                branchNameInput.value = '';
                return;
            }

            try {
                if (!window.SearchService || typeof window.SearchService.searchClients !== 'function') {
                    console.warn('[AccountMaintenance] SearchService.searchClients not available');
                    return;
                }

                const whereStmt = `OurBranchID = '${branchIdVal.replace(/'/g, "''")}'`;
                const response = await window.SearchService.searchClients({
                    TableID: 'BranchID',
                    WhereStmt: whereStmt,
                    AdvFilterString: '',
                    PrevOrNext: '1',
                    RefID: '',
                    OperatorID: (window.AuthService?.getSession?.()?.operatorId || window.AuthService?.getSession?.()?.operatorID || 'web_portal'),
                    ModuleID: '1000',
                    OurBranchID: branchIdVal,
                    SearchKey: ''
                });

                const responseData = response?.Details || response?.Data || [];
                if (responseData && responseData.length > 0) {
                    const record = responseData[0];
                    const displayValue = record.BranchName || record.Name || '';
                    branchNameInput.value = displayValue;
                } else {
                    branchNameInput.value = '';
                }
            } catch (err) {
                console.error('[AccountMaintenance] BranchID blur lookup failed:', err);
                branchNameInput.value = '';
            }
        };

        // Auto-fill branch name when user tabs away from branch ID field (blur)
        branchIdInput.addEventListener('blur', performBranchLookup);

        // Also trigger on Enter key (same as loan maintenance pattern)
        branchIdInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performBranchLookup();
            }
        });
    }

    // ============================================================================
    // REMINDER MODAL FUNCTIONS
    // ============================================================================
    function checkAndDisplayReminder(data) {
        try {
            console.log('[REMINDER DEBUG] Checking for reminders in loaded data');
            
            if (!data) {
                console.log('[REMINDER DEBUG] No data provided');
                return;
            }

            // Collect all reminders from Details02 array (each item is a potential reminder)
            let reminders = [];
            
            // Check Details02 array (each record can have a reminder)
            if (Array.isArray(data.Details02) && data.Details02.length > 0) {
                data.Details02.forEach(record => {
                    if (record && typeof record === 'object') {
                        const reminderMsg = record.Reminder || record.reminder || record.REMINDER || '';
                        const priority = record.Priority || record.priority || '';
                        
                        if (reminderMsg && reminderMsg.trim() && reminderMsg !== '—' && reminderMsg !== '-') {
                            reminders.push({
                                message: reminderMsg.trim(),
                                priority: priority ? priority.toLowerCase() : 'low'
                            });
                        }
                    }
                });
                console.log('[REMINDER DEBUG] Found reminders from Details02:', reminders);
            }
            
            // Fallback to main Details array
            if (reminders.length === 0 && Array.isArray(data.Details) && data.Details.length > 0) {
                data.Details.forEach(record => {
                    if (record && typeof record === 'object') {
                        const reminderMsg = record.Reminder || record.reminder || record.REMINDER || '';
                        const colorID = record.ColorID || record.Color || record.colorid || record.color || '';
                        
                        if (reminderMsg && reminderMsg.trim() && reminderMsg !== '—' && reminderMsg !== '-') {
                            reminders.push({
                                message: reminderMsg.trim(),
                                colorID: colorID,
                                priority: getPriorityFromColor(colorID)
                            });
                        }
                    }
                });
                console.log('[REMINDER DEBUG] Found reminders from Details:', reminders);
            }

            if (reminders.length > 0) {
                displayReminderModal(reminders);
            } else {
                console.log('[REMINDER DEBUG] No active reminders found');
            }
        } catch (error) {
            console.error('[REMINDER DEBUG] Error checking reminder:', error);
        }
    }

    function displayReminderModal(reminders) {
        try {
            console.log('[REMINDER DEBUG] ✓✓✓ Displaying reminder modal with', reminders.length, 'reminders');
            const modal = document.getElementById('reminderModal');
            if (!modal) {
                console.error('[REMINDER DEBUG] Reminder modal element not found');
                return;
            }

            // Populate table body
            const tableBody = document.getElementById('reminderTableBody');
            if (!tableBody) {
                console.error('[REMINDER DEBUG] Table body element not found');
                return;
            }

            // Clear existing rows
            tableBody.innerHTML = '';

            // Add rows for each reminder
            reminders.forEach(reminder => {
                const row = document.createElement('div');
                row.className = 'reminder-modal__table-row';
                
                const messageCell = document.createElement('div');
                messageCell.className = 'reminder-modal__table-cell reminder-modal__table-cell--message';
                messageCell.textContent = reminder.message;
                
                const priorityCell = document.createElement('div');
                priorityCell.className = 'reminder-modal__table-cell reminder-modal__table-cell--priority';
                
                const priorityBadge = document.createElement('span');
                priorityBadge.className = `reminder-modal__priority-badge reminder-modal__priority-badge--${reminder.priority}`;
                priorityBadge.textContent = reminder.priority;
                
                priorityCell.appendChild(priorityBadge);
                
                row.appendChild(messageCell);
                row.appendChild(priorityCell);
                tableBody.appendChild(row);
            });

            // Update count
            const countEl = document.getElementById('reminderCount');
            if (countEl) {
                countEl.textContent = `${reminders.length} reminder${reminders.length !== 1 ? 's' : ''}`;
            }

            // Show modal
            modal.hidden = false;
            console.log('[REMINDER DEBUG] Modal displayed successfully with', reminders.length, 'reminders');
        } catch (error) {
            console.error('[REMINDER DEBUG] Error displaying reminder modal:', error);
        }
    }

    let isAutoViewLoading = false;
    let suppressBlurAutoView = false;

    async function autoViewAccountFromId() {
        if (isAutoViewLoading) return;

        const accountIdInput = document.getElementById('AccountID');
        const accountNameInput = document.getElementById('AccountName');
        if (!accountIdInput || !accountNameInput) return;

        const accountIdVal = accountIdInput.value.trim();
        if (!accountIdVal) return;

        // Skip if in ADD mode
        if (currentMode === 'ADD') return;

        currentMode = 'VIEW';
        clearAllFieldErrors();

        const result = validateViewAction();
        if (!result.ok) {
            displayValidationErrors(result);
            return;
        }

        isAutoViewLoading = true;
        showPageLoader(true, 'Loading account...');

        try {
            await tryGetAccount(0);
        } catch (error) {
            console.error('[AccountMaintenance] Auto-view failed on AccountID input:', error);
        } finally {
            isAutoViewLoading = false;
            suppressBlurAutoView = false;
            showPageLoader(false);
        }
    }

    /**
     * Sanitize AccountID input to prevent searching paragraphs and invalid characters
     * Removes newlines, tabs, and limits length to prevent abuse
     */
    function sanitizeAccountID(value) {
        if (!value) return '';
        // Remove newlines, carriage returns, tabs, and other whitespace characters
        let sanitized = String(value)
            .replace(/[\r\n\t]/g, '') // Remove newlines, carriage returns, tabs
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim();
        
        // Limit length to prevent extremely long inputs (reasonable account ID length)
        const MAX_ACCOUNT_ID_LENGTH = 50;
        if (sanitized.length > MAX_ACCOUNT_ID_LENGTH) {
            sanitized = sanitized.substring(0, MAX_ACCOUNT_ID_LENGTH);
        }
        
        return sanitized;
    }

    function wireAccountControl() {
        const accountIdInput = document.getElementById('AccountID');
        const accountNameInput = document.getElementById('AccountName');
        if (!accountIdInput || !accountNameInput) return;

        // Sanitize input on every change to prevent paragraphs/newlines
        accountIdInput.addEventListener('input', (e) => {
            const originalValue = e.target.value;
            const sanitized = sanitizeAccountID(originalValue);
            
            // Only update if value changed (to avoid cursor jumping)
            if (originalValue !== sanitized) {
                const cursorPosition = e.target.selectionStart;
                e.target.value = sanitized;
                // Try to maintain cursor position (adjust for removed characters)
                const newPosition = Math.min(cursorPosition, sanitized.length);
                e.target.setSelectionRange(newPosition, newPosition);
            }
            
            // Clear account name if AccountID is cleared
            if (!sanitized.trim()) {
                accountNameInput.value = '';
            }
        });

        // Sanitize on paste event
        accountIdInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            const sanitized = sanitizeAccountID(pastedText);
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const currentValue = e.target.value;
            e.target.value = currentValue.substring(0, start) + sanitized + currentValue.substring(end);
            // Set cursor position after pasted content
            const newPosition = start + sanitized.length;
            e.target.setSelectionRange(newPosition, newPosition);
            // Trigger input event to clear account name if needed
            e.target.dispatchEvent(new Event('input', { bubbles: true }));
        });
        
        // Trigger View when user tabs away with AccountID filled
        accountIdInput.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;
            // Sanitize before checking value
            const sanitized = sanitizeAccountID(accountIdInput.value);
            if (sanitized !== accountIdInput.value) {
                accountIdInput.value = sanitized;
            }
            if (!sanitized.trim()) return;
            suppressBlurAutoView = true; // prevent double-trigger from blur
            autoViewAccountFromId();
        });

        // Trigger View when user pastes AccountID and tabs away (blur)
        accountIdInput.addEventListener('blur', () => {
            if (suppressBlurAutoView) return;
            // Sanitize before auto-viewing
            const sanitized = sanitizeAccountID(accountIdInput.value);
            if (sanitized !== accountIdInput.value) {
                accountIdInput.value = sanitized;
            }
            autoViewAccountFromId();
        });
    }

    function formatMoney(value) {
        if (value === null || value === undefined || value === '') return '0.00';

        // Handle numeric values directly
        let num;
        if (typeof value === 'number') {
            num = value;
        } else if (typeof value === 'string') {
            // Remove commas and parse
            const cleaned = value.replace(/,/g, '').trim();
            num = parseFloat(cleaned);
        } else {
            num = parseFloat(value);
        }

        if (isNaN(num)) {
            console.warn('[formatMoney] Invalid number:', value);
            return '0.00';
        }

        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function parseMoneyInput(value) {
        if (value === null || value === undefined || value === '') return '';
        return String(value).replace(/,/g, '').trim();
    }

    function wireMoneyFields() {
        const moneySelectors = [
            'input[id*="Balance"]',
            'input[id*="balance"]',
            'input[id*="Amount"]',
            'input[id*="amount"]',
            'input[id*="Credits"]',
            'input[id*="Debits"]',
            'input[id*="Interest"]',
            'input[id*="Power"]',
            'input[id*="Rate"]',
            'input[id*="Charges"]',
            'input.money-field',
            'input[data-format="money"]',
            'input[data-format="currency"]'
        ];

        const moneyFields = document.querySelectorAll(moneySelectors.join(','));

        moneyFields.forEach(field => {
            if (field.readOnly || field.disabled) return;

            field.addEventListener('blur', function () {
                const raw = parseMoneyInput(this.value);
                if (raw !== '') {
                    this.value = formatMoney(raw);
                }
            });

            field.addEventListener('focus', function () {
                const raw = parseMoneyInput(this.value);
                if (raw !== '') {
                    this.value = raw;
                }
            });

            // Format existing value if any
            if (field.value !== null && field.value !== undefined && field.value !== '') {
                const raw = parseMoneyInput(field.value);
                if (raw !== '') {
                    field.value = formatMoney(raw);
                }
            }
        });
    }

    /**
     * Format date using global utility function
     * @deprecated Use GlobalUtils.formatDate() instead
     */
    function formatDate(value) {
        return window.GlobalUtils && window.GlobalUtils.formatDate 
            ? window.GlobalUtils.formatDate(value) 
            : value;
    }

    function parseDateInput(value) {
        if (!value || value === '') return '';
        // Return the original value for editing
        return value;
    }

    function wireDateFields() {
        const dateSelectors = [
            'input[id*="Date"]',
            'input[id*="date"]',
            'input[id*="On"]', // CreatedOn, ModifiedOn, SupervisedOn
            'input.date-field',
            'input[data-format="date"]'
        ];

        const dateFields = document.querySelectorAll(dateSelectors.join(','));

        dateFields.forEach(field => {
            // Skip if it's actually a balance field or other non-date field
            if (field.id && (field.id.includes('Balance') || field.id.includes('Rate') || field.id.includes('Amount'))) {
                return;
            }

            field.addEventListener('blur', function () {
                if (this.value && this.value !== '') {
                    this.value = formatDate(this.value);
                }
            });

            field.addEventListener('focus', function () {
                // Keep formatted on focus for readonly fields, otherwise allow editing
                if (!this.readOnly && !this.disabled) {
                    const current = this.value;
                    this.dataset.formattedValue = current;
                }
            });
        });
    }

    function reformatAllFields() {
        // Reformat all money fields
        const moneySelectors = [
            'input[id*="Balance"]',
            'input[id*="balance"]',
            'input[id*="Amount"]',
            'input[id*="amount"]',
            'input[id*="Credits"]',
            'input[id*="Debits"]',
            'input[id*="Interest"]',
            'input[id*="Power"]',
            'input.money-field',
            'input[data-format="money"]',
            'input[data-format="currency"]'
        ];

        document.querySelectorAll(moneySelectors.join(',')).forEach(field => {
            // console.log(`[reformatAllFields] Formatting ${field.id}:`, field.value);
            const formatted = formatMoney(field.value);
            // console.log(`[reformatAllFields] Formatted ${field.id}:`, formatted);
            field.value = formatted;
        });

        // Reformat all date fields
        const dateSelectors = [
            'input[id*="Date"]',
            'input[id*="date"]',
            'input[id*="On"]',
            'input.date-field',
            'input[data-format="date"]'
        ];

        document.querySelectorAll(dateSelectors.join(',')).forEach(field => {
            // Skip if it's actually a balance field or other non-date field
            if (field.id && (field.id.includes('Balance') || field.id.includes('Rate') || field.id.includes('Amount'))) {
                return;
            }

            if (field.value && field.value !== '') {
                field.value = formatDate(field.value);
            }
        });
    }

    // ============================================================================
    // BRANCH SEARCH PANEL
    // ============================================================================

    function openBranchSearchPanel() {
        const modal = ensureSearchModal();
        if (!modal) return;

        const branchIdVal = getInputValue('BranchID');
        const baseWhere = branchIdVal ? `OurBranchID='${sanitizeValue(branchIdVal)}'` : '';

        modal.open({
            title: 'Find Branch',
            tableID: 'BranchID',
            whereStmt: baseWhere,
            searchFields: [
                { name: 'branchId', label: 'Branch ID', column: 'OurBranchID' },
                { name: 'branchName', label: 'Branch Name', column: 'BranchName' }
            ],
            displayFields: [
                { key: 'OurBranchID', label: 'Branch ID' },
                { key: 'BranchName', label: 'Branch Name' }
            ],
            onSelect: (record) => {
                const bid = record.OurBranchID || record.BranchID || record.BranchId || record.branchId || '';
                const bname = record.BranchName || record.Description || record.Name || '';
                const input = document.getElementById('BranchID');
                const nameInput = document.getElementById('BranchName');
                if (input) input.value = bid;
                if (nameInput) nameInput.value = bname;
            }
        });
    }

    function closeBranchSearchPanel() {
        const modalElement = document.getElementById('branchLookupModal');
        if (!modalElement) return;
        
        const ModalCtor = window.bootstrap?.Modal;
        if (ModalCtor) {
            const modalInstance = ModalCtor.getInstance(modalElement);
            if (modalInstance) modalInstance.hide();
        }
    }

    function resetBranchSearchPanel() {
        const form = document.getElementById('branchLookupForm');
        const results = document.getElementById('branchSearchResults');
        const empty = document.getElementById('branchSearchEmpty');
        const loading = document.getElementById('branchSearchLoading');
        if (form) form.reset();
        if (results) results.innerHTML = '';
        if (empty) {
            empty.style.display = 'block';
            empty.textContent = 'Enter at least one filter above and click Search to query branches.';
        }
        if (loading) loading.classList.add('d-none');
    }

    async function performBranchSearch(event) {
        if (event) event.preventDefault();
        const idValue = (document.getElementById('branchSearchId')?.value || '').trim();
        const nameValue = (document.getElementById('branchSearchName')?.value || '').trim();
        const idMode = document.getElementById('branchSearchModeId')?.value || 'Like';
        const nameMode = document.getElementById('branchSearchModeName')?.value || 'Like';
        const results = document.getElementById('branchSearchResults');
        const empty = document.getElementById('branchSearchEmpty');
        const loading = document.getElementById('branchSearchLoading');

        if (results) results.innerHTML = '';
        if (empty) empty.style.display = 'none';
        if (loading) loading.classList.remove('d-none');

        const clauses = [];
        const buildClause = (col, mode, val) => {
            if (!val) return null;
            const safe = val.replace(/'/g, "''");
            return mode === 'Exact' ? `${col} = '${safe}'` : `${col} like '%${safe}%'`;
        };
        const idClause = buildClause('OurBranchID', idMode, idValue);
        const nameClause = buildClause('BranchName', nameMode, nameValue);
        [idClause, nameClause].forEach(c => c && clauses.push(c));

        const whereStmt = clauses.join(' AND ');
        if (!whereStmt) {
            if (loading) loading.style.display = 'none';
            if (empty) {
                empty.textContent = 'Enter at least one filter above and click Search.';
                empty.style.display = 'block';
            }
            return;
        }

        const payload = {
            TableID: 'BranchID',
            WhereStmt: whereStmt,
            AdvFilterString: '',
            PrevOrNext: '1',
            RefID: '',
            OperatorID: 'web_portal',
            ModuleID: 1000,
            OurBranchID: document.getElementById('BranchID')?.value || ''
        };

        try {
            const service = window.ClientService || window.SearchService;
            if (!service || typeof service.searchClients !== 'function' && typeof service.search !== 'function') {
                throw new Error('Branch search service not available');
            }
            const response = service.searchClients ? await service.searchClients(payload) : await service.search(payload);
            let rows = response?.Details?.SearchResults || response?.Details || response?.SearchResults || [];
            if (!Array.isArray(rows)) rows = rows ? [rows] : [];
            if (!rows.length) {
                if (empty) {
                    empty.textContent = 'No branches matched the filters.';
                    empty.style.display = 'block';
                }
                return;
            }
            if (results) {
                results.innerHTML = rows.map((r, idx) => {
                    const bid = r.OurBranchID || r.BranchID || r.BranchId || r.branchId || '';
                    const name = r.BranchName || r.Description || r.Name || '';
                    return `<tr class="am-search-result-row" data-result-index="${idx}">
                        <td>${bid}</td>
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
                        const bid = row?.OurBranchID || row?.BranchID || row?.BranchId || row?.branchId || '';
                        const bname = row?.BranchName || row?.Description || row?.Name || '';
                        const input = document.getElementById('BranchID');
                        if (input) input.value = bid;
                        const nameInput = document.getElementById('BranchName');
                        if (nameInput) nameInput.value = bname;
                        closeBranchSearchPanel();
                    });
                });
                results.querySelectorAll('tr[data-result-index]').forEach(tr => {
                    tr.addEventListener('dblclick', () => {
                        const idx = Number(tr.getAttribute('data-result-index'));
                        const row = rows[idx];
                        const bid = row?.OurBranchID || row?.BranchID || row?.BranchId || row?.branchId || '';
                        const bname = row?.BranchName || row?.Description || row?.Name || '';
                        const input = document.getElementById('BranchID');
                        if (input) input.value = bid;
                        const nameInput = document.getElementById('BranchName');
                        if (nameInput) nameInput.value = bname;
                        closeBranchSearchPanel();
                    });
                });
            }
        } catch (err) {
            console.error('[AccountMaintenance] Branch search failed:', err);
            if (empty) {
                empty.textContent = err?.message || 'Search failed';
                empty.style.display = 'block';
            }
        } finally {
            if (loading) loading.classList.add('d-none');
        }
    }

    function wireBranchSearchPanel() {
        const form = document.getElementById('branchLookupForm');
        const submitBtn = document.getElementById('branchSearchSubmit');
        const resetBtn = document.getElementById('branchSearchReset');
        const refreshBtn = document.getElementById('branchSearchRefresh');
        
        if (form) form.addEventListener('submit', performBranchSearch);
        if (submitBtn) submitBtn.addEventListener('click', performBranchSearch);
        if (resetBtn) resetBtn.addEventListener('click', (e) => { e.preventDefault(); resetBranchSearchPanel(); });
        if (refreshBtn) refreshBtn.addEventListener('click', (e) => { e.preventDefault(); resetBranchSearchPanel(); });
        
        document.addEventListener('keydown', (e) => {
            const modalElement = document.getElementById('branchLookupModal');
            if (!modalElement) return;
            const ModalCtor = window.bootstrap?.Modal;
            if (!ModalCtor) return;
            const instance = ModalCtor.getInstance(modalElement);
            if (!instance) return;
            if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
                const activeEl = document.activeElement;
                if (activeEl && (activeEl.id === 'branchSearchId' || activeEl.id === 'branchSearchName')) {
                    e.preventDefault();
                    performBranchSearch(e);
                }
            }
        });
    }

    // ============================================================================
    // CLIENT SEARCH PANEL
    // ============================================================================

    function openClientSearchPanel() {
        const modal = ensureSearchModal();
        if (!modal) return;

        const branchIdVal = getInputValue('BranchID');
        const baseWhere = branchIdVal ? `OurBranchID='${sanitizeValue(branchIdVal)}'` : '';

        modal.open({
            title: 'Find Client',
            tableID: 'clientId',
            whereStmt: baseWhere,
            searchFields: [
                { name: 'clientId', label: 'Client ID', column: 'ClientID' },
                { name: 'clientName', label: 'Name', column: 'Name' }
            ],
            displayFields: [
                { key: 'ClientID', label: 'Client ID' },
                { key: 'Name', label: 'Name' }
            ],
            onSelect: (record) => {
                const cid = record.ClientID || record.clientId || record.ID || '';
                const cname = record.ClientName || record.Name || record.Description || '';
                const idInput = document.getElementById('ClientID');
                const nameInput = document.getElementById('ClientName');
                if (idInput) idInput.value = cid;
                if (nameInput) nameInput.value = cname;
            }
        });
    }

    function closeClientSearchPanel() {
        const modalElement = document.getElementById('clientLookupModal');
        if (!modalElement) return;

        const ModalCtor = window.bootstrap?.Modal;
        if (ModalCtor) {
            const modalInstance = ModalCtor.getInstance(modalElement);
            if (modalInstance) modalInstance.hide();
        }
    }

    function resetClientSearchPanel() {
        const form = document.getElementById('clientLookupForm');
        const results = document.getElementById('clientSearchResults');
        const empty = document.getElementById('clientSearchEmpty');
        const loading = document.getElementById('clientSearchLoading');
        if (form) form.reset();
        if (results) results.innerHTML = '';
        if (empty) {
            empty.style.display = 'block';
            empty.textContent = 'Enter at least one filter above and click Search to query Core Banking clients.';
        }
        if (loading) loading.classList.add('d-none');
    }

    async function performClientSearch(event) {
        if (event) event.preventDefault();
        const idValue = (document.getElementById('clientSearchId')?.value || '').trim();
        const nameValue = (document.getElementById('clientSearchName')?.value || '').trim();
        const idMode = document.getElementById('clientSearchModeId')?.value || 'Like';
        const nameMode = document.getElementById('clientSearchModeName')?.value || 'Like';
        const results = document.getElementById('clientSearchResults');
        const empty = document.getElementById('clientSearchEmpty');
        const loading = document.getElementById('clientSearchLoading');

        if (results) results.innerHTML = '';
        if (empty) empty.style.display = 'none';
        if (loading) loading.classList.remove('d-none');

        const clauses = [];
        const buildClause = (col, mode, val) => {
            if (!val) return null;
            const safe = val.replace(/'/g, "''");
            return mode === 'Exact' ? `${col} = '${safe}'` : `${col} like '%${safe}%'`;
        };
        const idClause = buildClause('clientId', idMode, idValue);
        const nameClause = buildClause('Name', nameMode, nameValue);
        [idClause, nameClause].forEach(c => c && clauses.push(c));

        const whereStmt = clauses.join(' AND ');
        if (!whereStmt) {
            if (loading) loading.style.display = 'none';
            if (empty) {
                empty.textContent = 'Enter at least one filter above and click Search.';
                empty.style.display = 'block';
            }
            return;
        }

        const payload = {
            TableID: 'clientId',
            WhereStmt: whereStmt,
            AdvFilterString: '',
            PrevOrNext: '1',
            RefID: '',
            OperatorID: 'web_portal',
            ModuleID: 1000,
            OurBranchID: document.getElementById('BranchID')?.value || ''
        };

        try {
            const service = window.ClientService || window.SearchService;
            if (!service || typeof service.searchClients !== 'function' && typeof service.search !== 'function') {
                throw new Error('Client search service not available');
            }
            const response = service.searchClients ? await service.searchClients(payload) : await service.search(payload);
            let rows = response?.Details?.SearchResults || response?.Details || response?.SearchResults || [];
            if (!Array.isArray(rows)) rows = rows ? [rows] : [];
            if (!rows.length) {
                if (empty) {
                    empty.textContent = 'No clients matched the filters.';
                    empty.style.display = 'block';
                }
                return;
            }
            if (results) {
                results.innerHTML = rows.map((r, idx) => {
                    const cid = r.ClientID || r.clientId || '';
                    const name = r.Name || r.fullName || r.Description || '';
                    return `<tr class="am-search-result-row" data-result-index="${idx}">
                        <td>${cid}</td>
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
                        const cid = row?.ClientID || row?.clientId || '';
                        const cname = row?.Name || row?.fullName || row?.Description || '';
                        const input = document.getElementById('ClientID');
                        if (input) input.value = cid;
                        const nameInput = document.getElementById('ClientName');
                        if (nameInput) nameInput.value = cname;
                        closeClientSearchPanel();
                    });
                });
                results.querySelectorAll('tr[data-result-index]').forEach(tr => {
                    tr.addEventListener('dblclick', () => {
                        const idx = Number(tr.getAttribute('data-result-index'));
                        const row = rows[idx];
                        const cid = row?.ClientID || row?.clientId || '';
                        const cname = row?.Name || row?.fullName || row?.Description || '';
                        const input = document.getElementById('ClientID');
                        if (input) input.value = cid;
                        const nameInput = document.getElementById('ClientName');
                        if (nameInput) nameInput.value = cname;
                        closeClientSearchPanel();
                    });
                });
            }
        } catch (err) {
            console.error('[AccountMaintenance] Client search failed:', err);
            if (empty) {
                empty.textContent = err?.message || 'Search failed';
                empty.style.display = 'block';
            }
        } finally {
            if (loading) loading.classList.add('d-none');
        }
    }

    function wireClientSearchPanel() {
        const form = document.getElementById('clientLookupForm');
        const submitBtn = document.getElementById('clientSearchSubmit');
        const resetBtn = document.getElementById('clientSearchReset');
        const refreshBtn = document.getElementById('clientSearchRefresh');

        if (form) form.addEventListener('submit', performClientSearch);
        if (submitBtn) submitBtn.addEventListener('click', performClientSearch);
        if (resetBtn) resetBtn.addEventListener('click', (e) => { e.preventDefault(); resetClientSearchPanel(); });
        if (refreshBtn) refreshBtn.addEventListener('click', (e) => { e.preventDefault(); resetClientSearchPanel(); });

        document.addEventListener('keydown', (e) => {
            const modalElement = document.getElementById('clientLookupModal');
            if (!modalElement) return;
            const isVisible = modalElement.classList.contains('show');
            if (e.key === 'Escape' && isVisible) closeClientSearchPanel();
        });
    }

    // Account Search Functions
    function openAccountSearchPanel({ targetId = 'AccountID', targetNameId = 'AccountName' } = {}) {
        const modal = ensureSearchModal();
        if (!modal) return;

        const branchIdVal = getInputValue('BranchID');
        const clientIdVal = getInputValue('ClientID');
        const filters = [];
        if (branchIdVal) filters.push(`OurBranchID='${sanitizeValue(branchIdVal)}'`);
        if (clientIdVal) filters.push(`ClientID='${sanitizeValue(clientIdVal)}'`);
        const baseWhere = filters.join(' AND ');

        modal.open({
            title: 'Find Account',
            tableID: 'AccountID',
            whereStmt: baseWhere,
            searchFields: [
                { name: 'accountId', label: 'Account ID', column: 'AccountID' },
                { name: 'accountName', label: 'Account Name', column: 'Description' },
                { name: 'clientName', label: 'Client Name', column: 'ClientName' }
            ],
            displayFields: [
                { key: 'AccountID', label: 'Account ID' },
                { key: 'Description', label: 'Account Name' },
                { key: 'ClientName', label: 'Client Name' }
            ],
            onSelect: (record) => {
                const aid = record.AccountID || record.accountId || record.ID || '';
                const desc = record.Description || record.accountName || record.AccountName || record.Name || '';
                const cname = record.ClientName || record.clientName || record.Client || '';
                const idInput = document.getElementById(targetId);
                const nameInput = document.getElementById(targetNameId);
                if (idInput) idInput.value = aid;
                if (nameInput) nameInput.value = desc || cname;

                // Populate client fields if empty when selecting main account
                if (targetId === 'AccountID') {
                    const clientIdInput = document.getElementById('ClientID');
                    const clientNameInput = document.getElementById('ClientName');
                    if (clientIdInput && !clientIdInput.value && (record.ClientID || record.clientId)) {
                        clientIdInput.value = record.ClientID || record.clientId || '';
                    }
                    if (clientNameInput && !clientNameInput.value) {
                        clientNameInput.value = cname || clientIdInput?.value || '';
                    }
                    tryGetAccount(0);
                }
            }
        });
    }

    function closeAccountSearchPanel() {
        const modalElement = document.getElementById('accountLookupModal');
        if (!modalElement) return;

        const ModalCtor = window.bootstrap?.Modal;
        if (ModalCtor) {
            const modalInstance = ModalCtor.getInstance(modalElement);
            if (modalInstance) modalInstance.hide();
        }
    }

    function resetAccountSearchPanel() {
        const form = document.getElementById('accountLookupForm');
        const results = document.getElementById('accountSearchResults');
        const empty = document.getElementById('accountSearchEmpty');
        const loading = document.getElementById('accountSearchLoading');
        if (form) form.reset();
        if (results) results.innerHTML = '';
        if (empty) {
            empty.style.display = 'block';
            empty.textContent = 'Enter at least one filter above and click Search to query accounts.';
        }
        if (loading) loading.classList.add('d-none');
    }

    async function performAccountSearch(event) {
        if (event) event.preventDefault();
        const idValue = (document.getElementById('accountSearchId')?.value || '').trim();
        const nameValue = (document.getElementById('accountSearchName')?.value || '').trim();
        const idMode = document.getElementById('accountSearchModeId')?.value || 'Like';
        const nameMode = document.getElementById('accountSearchModeName')?.value || 'Like';
        const results = document.getElementById('accountSearchResults');
        const empty = document.getElementById('accountSearchEmpty');
        const loading = document.getElementById('accountSearchLoading');

        if (results) results.innerHTML = '';
        if (empty) empty.style.display = 'none';
        if (loading) loading.classList.remove('d-none');

        const clauses = [];
        const buildClause = (col, mode, val) => {
            if (!val) return null;
            const safe = val.replace(/'/g, "''");
            return mode === 'Exact' ? `${col} = '${safe}'` : `${col} like '%${safe}%'`;
        };
        const idClause = buildClause('AccountID', idMode, idValue);
        const nameClause = buildClause('Description', nameMode, nameValue);
        [idClause, nameClause].forEach(c => c && clauses.push(c));

        const whereStmt = clauses.join(' AND ');
        if (!whereStmt) {
            if (loading) loading.style.display = 'none';
            if (empty) {
                empty.textContent = 'Enter at least one filter above and click Search.';
                empty.style.display = 'block';
            }
            return;
        }

        const payload = {
            TableID: 'AccountID',
            WhereStmt: whereStmt,
            AdvFilterString: '',
            PrevOrNext: '1',
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
                    empty.textContent = 'No accounts matched the filters.';
                    empty.style.display = 'block';
                }
                return;
            }
            if (results) {
                results.innerHTML = rows.map((r, idx) => {
                    const aid = r.AccountID || r.accountId || '';
                    const desc = r.Description || r.description || '';
                    const clientName = r.ClientName || r.Name || '';
                    return `<tr class="am-search-result-row" data-result-index="${idx}">
                        <td>${aid}</td>
                        <td>${desc}</td>
                        <td>${clientName}</td>
                        <td class="text-end">
                            <button type="button" class="btn btn-sm btn-primary" data-result-index="${idx}">Select</button>
                        </td>
                    </tr>`;
                }).join('');
                results.querySelectorAll('button[data-result-index]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const idx = Number(btn.getAttribute('data-result-index'));
                        const row = rows[idx];
                        const aid = row?.AccountID || row?.accountId || '';
                        const desc = row?.Description || row?.description || '';
                        const input = document.getElementById('AccountID');
                        if (input) input.value = aid;
                        const nameInput = document.getElementById('AccountName');
                        if (nameInput) nameInput.value = desc;
                        closeAccountSearchPanel();

                        // Trigger tryGetAccount after selection
                        tryGetAccount(0);
                    });
                });
                results.querySelectorAll('tr[data-result-index]').forEach(tr => {
                    tr.addEventListener('dblclick', () => {
                        const idx = Number(tr.getAttribute('data-result-index'));
                        const row = rows[idx];
                        const aid = row?.AccountID || row?.accountId || '';
                        const desc = row?.Description || row?.description || '';
                        const input = document.getElementById('AccountID');
                        if (input) input.value = aid;
                        const nameInput = document.getElementById('AccountName');
                        if (nameInput) nameInput.value = desc;
                        closeAccountSearchPanel();

                        // Trigger tryGetAccount after selection
                        tryGetAccount(0);
                    });
                });
            }
        } catch (err) {
            console.error('[AccountMaintenance] Account search failed:', err);
            if (empty) {
                empty.textContent = err?.message || 'Search failed';
                empty.style.display = 'block';
            }
        } finally {
            if (loading) loading.classList.add('d-none');
        }
    }

    function wireAccountSearchPanel() {
        const form = document.getElementById('accountLookupForm');
        const submitBtn = document.getElementById('accountSearchSubmit');
        const resetBtn = document.getElementById('accountSearchReset');
        const refreshBtn = document.getElementById('accountSearchRefresh');

        if (form) form.addEventListener('submit', performAccountSearch);
        if (submitBtn) submitBtn.addEventListener('click', performAccountSearch);
        if (resetBtn) resetBtn.addEventListener('click', (e) => { e.preventDefault(); resetAccountSearchPanel(); });
        if (refreshBtn) refreshBtn.addEventListener('click', (e) => { e.preventDefault(); resetAccountSearchPanel(); });

        document.addEventListener('keydown', (e) => {
            const modalElement = document.getElementById('accountLookupModal');
            if (!modalElement) return;
            const isVisible = modalElement.classList.contains('show');
            if (e.key === 'Escape' && isVisible) closeAccountSearchPanel();
        });
    }

    // Product Search Functions
    function openProductSearchPanel() {
        const modal = ensureSearchModal();
        if (!modal) return;

        const branchIdVal = getInputValue('BranchID');
        const baseWhere = ""; //branchIdVal ? `OurBranchID='${sanitizeValue(branchIdVal)}'` : '';

        modal.open({
            title: 'Find Product',
            tableID: 'ProductID',
            whereStmt: baseWhere || '1=1',
            searchFields: [
                { name: 'productId', label: 'Product ID', column: 'ProductID' },
                { name: 'productName', label: 'Product Name', column: 'Description' }
            ],
            displayFields: [
                { key: 'ProductID', label: 'Product ID' },
                { key: 'Description', label: 'Product Name' }
            ],
            onSelect: (record) => {
                const pid = record.ProductID || record.productId || record.ID || '';
                const desc = record.Description || record.ProductName || record.Name || '';
                const idInput = document.getElementById('ProductID');
                const nameInput = document.getElementById('ProductName');
                if (idInput) idInput.value = pid;
                if (nameInput) nameInput.value = desc;

                if (currentMode === 'ADD') {
                    setTimeout(() => {
                        fetchAccountOpeningDetails();
                    }, 50);
                }
            }
        });
    }

    function openPassbookSearch() {
        const modal = ensureSearchModal();
        if (!modal) return;

        const branchIdVal = getInputValue('BranchID');
        const baseWhere = branchIdVal ? `OurBranchID='${sanitizeValue(branchIdVal)}'` : '';

        modal.open({
            title: 'Find Passbook',
            tableID: 'PassbookSerialID',
            whereStmt: baseWhere,
            searchFields: [
                { name: 'passbookId', label: 'Passbook Serial ID', column: 'PBSerialID' },
                { name: 'passbookName', label: 'Passbook Name', column: 'PassbookName' }
            ],
            displayFields: [
                { key: 'PBSerialID', label: 'Passbook Serial ID' },
                { key: 'PassbookName', label: 'Passbook Name' }
            ],
            onSelect: (record) => {
                const pid = record.PBSerialID || record.PassbookSerialID || record.PassBookSerialID || record.ID || '';
                const pname = record.PassbookName || record.PassBookName || record.Description || '';
                const idInput = document.getElementById('PassbookSerialID');
                const nameInput = document.getElementById('PassbookSerialName');
                if (idInput) idInput.value = pid;
                if (nameInput) nameInput.value = pname || pid;
            }
        });
    }

    function openSalesOfficerSearch() {
        const modal = ensureSearchModal();
        if (!modal) return;

        const branchIdVal = getInputValue('BranchID');
        const baseWhere = branchIdVal ? `BranchID='${sanitizeValue(branchIdVal)}'` : '';

        modal.open({
            title: 'Find Sales Officer',
            tableID: 'OperatorID',
            whereStmt: baseWhere,
            searchFields: [
                { name: 'officerId', label: 'Officer ID', column: 'OperatorID' },
                { name: 'officerName', label: 'Officer Name', column: 'Name' }
            ],
            displayFields: [
                { key: 'OperatorID', label: 'Officer ID' },
                { key: 'Name', label: 'Officer Name' }
            ],
            onSelect: (record) => {
                const oid = record.OperatorID || record.OfficerID || record.UserID || record.ID || '';
                const oname = record.Name || record.FullName || record.Description || '';
                const idInput = document.getElementById('SalesOfficerID');
                const nameInput = document.getElementById('SalesOfficerName');
                if (idInput) idInput.value = oid;
                if (nameInput) nameInput.value = oname || oid;
            }
        });
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
            PrevOrNext: '1',
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
                    return `<tr class="am-search-result-row" data-result-index="${idx}">
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
                        // Trigger opening details fetch after product selection
                        // console.log('[Product Search Button] Product selected, Mode:', currentMode, 'ProductID:', pid);
                        setTimeout(() => {
                            if (currentMode === 'ADD') {
                                // console.log('[Product Search Button] Calling fetchAccountOpeningDetails...');
                                fetchAccountOpeningDetails();
                            } else {
                                // console.log('[Product Search Button] Not in ADD mode, skipping fetch');
                            }
                        }, 100);
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
                        // Trigger opening details fetch after product selection
                        // console.log('[Product Search DblClick] Product selected, Mode:', currentMode, 'ProductID:', pid);
                        setTimeout(() => {
                            if (currentMode === 'ADD') {
                                // console.log('[Product Search DblClick] Calling fetchAccountOpeningDetails...');
                                fetchAccountOpeningDetails();
                            } else {
                                // console.log('[Product Search DblClick] Not in ADD mode, skipping fetch');
                            }
                        }, 100);
                    });
                });
            }
        } catch (err) {
            console.error('[AccountMaintenance] Product search failed:', err);
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

    function wirePlusButtons() {
        // console.log('[AccountMaintenance] wirePlusButtons() called');
        
        // Legacy plus buttons (if any remain)
        document.querySelectorAll('.btn-plus').forEach(btn => {
            btn.addEventListener('click', function () {
                const input = this.previousElementSibling;
                alert('Details for: ' + (input ? input.value || 'Field' : 'Field'));
            });
        });
        
        // Wire info buttons using event delegation on document body
        wireInfoButtons();
    }
    
    function wireInfoButtons() {
        const infoHandlers = {
            'UnclearBalance': handleUnclearBalanceInfo,
            'UnSupervisedCredits': handleUnsupervisedCreditsInfo,
            'UnSupervisedDebits': handleUnsupervisedDebitsInfo,
            'DrawingPower': handleGenericInfo,
            'FreezedAmount': handleFreezedAmountInfo,
            'CreditRate': handleGenericInfo,
            'DebitRate': handleGenericInfo,
            'Status': handleGenericInfo,
            'PendingCharges': handlePendingChargesInfo,
            'SystemLien': handleSystemLienInfo
        };
        
        const infoButtons = document.querySelectorAll('.behind-scene-item .bts-info-btn');
        console.log('[wireInfoButtons] Found ' + infoButtons.length + ' info buttons');
        
        infoButtons.forEach((btn, index) => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const item = this.closest('.behind-scene-item');
                if (!item) return;
                
                const valueEl = item.querySelector('.behind-scene-value');
                const fieldId = valueEl?.id;
                const label = item.querySelector('label')?.textContent || 'Field';
                
                console.log('[infoButton] Clicked: fieldId=' + fieldId + ', label=' + label);
                
                if (fieldId && infoHandlers[fieldId]) {
                    console.log('[infoButton] Using handler for ' + fieldId);
                    await infoHandlers[fieldId](fieldId, label, valueEl);
                } else {
                    console.log('[infoButton] Using generic handler for ' + fieldId);
                    handleGenericInfo(fieldId, label, valueEl);
                }
            });
        });
    }
    
    async function handleUnclearBalanceInfo(fieldId, label, valueEl) {
        const { branchIdInput } = findBranchInputs();
        const accountIdInput = document.getElementById('AccountID');
        
        const branchId = branchIdInput ? String(branchIdInput.value || '').trim() : '';
        const accountId = accountIdInput ? String(accountIdInput.value || '').trim() : '';
        
        if (!branchId || !accountId) {
            showSystemToast('Branch ID and Account ID are required to view unclear balance details.', { 
                title: 'Missing Information', 
                variant: 'warning' 
            });
            return;
        }
        
        try {
            const accountservice = await ensureaccountserviceLoaded();
            if (!accountservice?.getUnClearBalance) {
                showSystemToast('Service not available.', { title: 'System Error', variant: 'danger' });
                return;
            }
            
            const payload = {
                OurBranchID: branchId,
                AccountID: accountId
            };
            
            // console.log('[AccountMaintenance] Fetching unclear balance details:', payload);
            
            const result = await accountservice.getUnClearBalance(payload);
            
            if (result && result.ResponseData) {
                showInfoDetailModal(result.ResponseData, label, 'unclearBalance', {
                    icon: 'bi-clock-history',
                    accentColor: '#f59e0b'
                });
            } else if (result && result.Details) {
                showInfoDetailModal(result.Details, label, 'unclearBalance', {
                    icon: 'bi-clock-history',
                    accentColor: '#f59e0b'
                });
            } else {
                showSystemToast('No unclear balance details found.', { title: 'Information', variant: 'info' });
            }
            
        } catch (error) {
            console.error('[AccountMaintenance] Error fetching unclear balance:', error);
            showSystemToast('Failed to load unclear balance details.', { title: 'Error', variant: 'danger' });
        }
    }

    async function handleUnsupervisedCreditsInfo(fieldId, label, valueEl) {
        const { branchIdInput } = findBranchInputs();
        const accountIdInput = document.getElementById('AccountID');
        
        const branchId = branchIdInput ? String(branchIdInput.value || '').trim() : '';
        const accountId = accountIdInput ? String(accountIdInput.value || '').trim() : '';
        
        // Get the displayed summary value - remove commas to parse as number
        const rawValue = valueEl ? valueEl.textContent?.trim() : '0.00';
        const summaryValue = parseFloat(rawValue.replace(/,/g, '')) || 0;
        
        if (!branchId || !accountId) {
            showSystemToast('Branch ID and Account ID are required.', { 
                title: 'Missing Information', 
                variant: 'warning' 
            });
            return;
        }
        
        try {
            const accountservice = await ensureaccountserviceLoaded();
            if (!accountservice?.getUnsupervised) {
                showSystemToast('Service not available.', { title: 'System Error', variant: 'danger' });
                return;
            }
            
            const payload = {
                OurBranchID: branchId,
                AccountTypeID: 'C',
                AccountID: accountId,
                TrxTypeID: 'CR' // Credits
            };
            
            const result = await accountservice.getUnsupervised(payload);
            
            // Extract data from various possible response structures
            let data = null;
            if (result) {
                if (result.ResponseData && (Array.isArray(result.ResponseData) ? result.ResponseData.length > 0 : true)) {
                    data = result.ResponseData;
                } else if (result.Details && (Array.isArray(result.Details) ? result.Details.length > 0 : true)) {
                    data = result.Details;
                } else if (result.Data && (Array.isArray(result.Data) ? result.Data.length > 0 : true)) {
                    data = result.Data;
                } else if (result.Records && (Array.isArray(result.Records) ? result.Records.length > 0 : true)) {
                    data = result.Records;
                } else if (Array.isArray(result) && result.length > 0) {
                    data = result;
                }
            }
            
            if (data) {
                showInfoDetailModal(data, 'Un Supervised Credits', 'unsupervisedCredits', {
                    icon: 'bi-arrow-down-circle',
                    accentColor: '#10b981'
                });
            } else {
                // Show summary value when no detail records available
                const summaryData = [{
                    'Description': 'Un Supervised Credits Total',
                    'Amount': summaryValue,
                    'Status': 'Pending Supervision',
                    'Note': 'Detail breakdown not available'
                }];
                showInfoDetailModal(summaryData, 'Un Supervised Credits', 'unsupervisedCredits', {
                    icon: 'bi-arrow-down-circle',
                    accentColor: '#10b981'
                });
            }
            
        } catch (error) {
            console.error('[AccountMaintenance] Error fetching unsupervised credits:', error);
            showSystemToast('Failed to load unsupervised credits.', { title: 'Error', variant: 'danger' });
        }
    }

    async function handleUnsupervisedDebitsInfo(fieldId, label, valueEl) {
        const { branchIdInput } = findBranchInputs();
        const accountIdInput = document.getElementById('AccountID');
        
        const branchId = branchIdInput ? String(branchIdInput.value || '').trim() : '';
        const accountId = accountIdInput ? String(accountIdInput.value || '').trim() : '';
        
        // Get the displayed summary value - remove commas to parse as number
        const rawValue = valueEl ? valueEl.textContent?.trim() : '0.00';
        const summaryValue = parseFloat(rawValue.replace(/,/g, '')) || 0;
        
        if (!branchId || !accountId) {
            showSystemToast('Branch ID and Account ID are required.', { 
                title: 'Missing Information', 
                variant: 'warning' 
            });
            return;
        }
        
        try {
            const accountservice = await ensureaccountserviceLoaded();
            if (!accountservice?.getUnsupervised) {
                showSystemToast('Service not available.', { title: 'System Error', variant: 'danger' });
                return;
            }
            
            const payload = {
                OurBranchID: branchId,
                AccountTypeID: 'C',
                AccountID: accountId,
                TrxTypeID: 'DR' // Debits
            };
            
            const result = await accountservice.getUnsupervised(payload);
            
            // Extract data from various possible response structures
            let data = null;
            if (result) {
                if (result.ResponseData && (Array.isArray(result.ResponseData) ? result.ResponseData.length > 0 : true)) {
                    data = result.ResponseData;
                } else if (result.Details && (Array.isArray(result.Details) ? result.Details.length > 0 : true)) {
                    data = result.Details;
                } else if (result.Data && (Array.isArray(result.Data) ? result.Data.length > 0 : true)) {
                    data = result.Data;
                } else if (result.Records && (Array.isArray(result.Records) ? result.Records.length > 0 : true)) {
                    data = result.Records;
                } else if (Array.isArray(result) && result.length > 0) {
                    data = result;
                }
            }
            
            if (data) {
                showInfoDetailModal(data, 'Un Supervised Debits', 'unsupervisedDebits', {
                    icon: 'bi-arrow-up-circle',
                    accentColor: '#ef4444'
                });
            } else {
                // Show summary value when no detail records available
                const summaryData = [{
                    'Description': 'Un Supervised Debits Total',
                    'Amount': summaryValue,
                    'Status': 'Pending Supervision',
                    'Note': 'Detail breakdown not available'
                }];
                showInfoDetailModal(summaryData, 'Un Supervised Debits', 'unsupervisedDebits', {
                    icon: 'bi-arrow-up-circle',
                    accentColor: '#ef4444'
                });
            }
            
        } catch (error) {
            console.error('[AccountMaintenance] Error fetching unsupervised debits:', error);
            showSystemToast('Failed to load unsupervised debits.', { title: 'Error', variant: 'danger' });
        }
    }

    async function handleFreezedAmountInfo(fieldId, label, valueEl) {
        const { branchIdInput } = findBranchInputs();
        const accountIdInput = document.getElementById('AccountID');
        
        const branchId = branchIdInput ? String(branchIdInput.value || '').trim() : '';
        const accountId = accountIdInput ? String(accountIdInput.value || '').trim() : '';
        
        if (!branchId || !accountId) {
            showSystemToast('Branch ID and Account ID are required.', { 
                title: 'Missing Information', 
                variant: 'warning' 
            });
            return;
        }
        
        try {
            const accountservice = await ensureaccountserviceLoaded();
            if (!accountservice?.getAccountFreezeTrx) {
                showSystemToast('Service not available.', { title: 'System Error', variant: 'danger' });
                return;
            }
            
            const payload = {
                OurBranchID: branchId,
                AccountID: accountId,
                OperatorID: ''
            };
            
            const result = await accountservice.getAccountFreezeTrx(payload);
            
            if (result && result.ResponseData) {
                showInfoDetailModal(result.ResponseData, 'Freezed Amount', 'freezedAmount', {
                    icon: 'bi-lock',
                    accentColor: '#8b5cf6'
                });
            } else if (result && result.Details) {
                showInfoDetailModal(result.Details, 'Freezed Amount', 'freezedAmount', {
                    icon: 'bi-lock',
                    accentColor: '#8b5cf6'
                });
            } else {
                showSystemToast('No freeze transactions found.', { title: 'Information', variant: 'info' });
            }
            
        } catch (error) {
            console.error('[AccountMaintenance] Error fetching freeze transactions:', error);
            showSystemToast('Failed to load freeze transactions.', { title: 'Error', variant: 'danger' });
        }
    }

    async function handlePendingChargesInfo(fieldId, label, valueEl) {
        const { branchIdInput } = findBranchInputs();
        const accountIdInput = document.getElementById('AccountID');
        
        const branchId = branchIdInput ? String(branchIdInput.value || '').trim() : '';
        const accountId = accountIdInput ? String(accountIdInput.value || '').trim() : '';
        
        if (!branchId || !accountId) {
            showSystemToast('Branch ID and Account ID are required.', { 
                title: 'Missing Information', 
                variant: 'warning' 
            });
            return;
        }
        
        try {
            const accountservice = await ensureaccountserviceLoaded();
            if (!accountservice?.getPendingCharges) {
                showSystemToast('Service not available.', { title: 'System Error', variant: 'danger' });
                return;
            }
            
            const payload = {
                OurBranchID: branchId,
                AccountID: accountId
            };
            
            const result = await accountservice.getPendingCharges(payload);
            
            if (result && result.ResponseData) {
                showInfoDetailModal(result.ResponseData, 'Pending Charges', 'pendingCharges', {
                    icon: 'bi-receipt',
                    accentColor: '#f97316'
                });
            } else if (result && result.Details) {
                showInfoDetailModal(result.Details, 'Pending Charges', 'pendingCharges', {
                    icon: 'bi-receipt',
                    accentColor: '#f97316'
                });
            } else {
                showSystemToast('No pending charges found.', { title: 'Information', variant: 'info' });
            }
            
        } catch (error) {
            console.error('[AccountMaintenance] Error fetching pending charges:', error);
            showSystemToast('Failed to load pending charges.', { title: 'Error', variant: 'danger' });
        }
    }

    async function handleSystemLienInfo(fieldId, label, valueEl) {
        const { branchIdInput } = findBranchInputs();
        const accountIdInput = document.getElementById('AccountID');
        
        const branchId = branchIdInput ? String(branchIdInput.value || '').trim() : '';
        const accountId = accountIdInput ? String(accountIdInput.value || '').trim() : '';
        
        if (!branchId || !accountId) {
            showSystemToast('Branch ID and Account ID are required.', { 
                title: 'Missing Information', 
                variant: 'warning' 
            });
            return;
        }
        
        try {
            const accountservice = await ensureaccountserviceLoaded();
            if (!accountservice?.getODAccountDetail) {
                showSystemToast('Service not available.', { title: 'System Error', variant: 'danger' });
                return;
            }
            
            const payload = {
                OurBranchID: branchId,
                AccountID: accountId
            };
            
            const result = await accountservice.getODAccountDetail(payload);
            
            if (result && result.ResponseData) {
                showInfoDetailModal(result.ResponseData, 'System Lien / OD Details', 'systemLien', {
                    icon: 'bi-shield-lock',
                    accentColor: '#0ea5e9'
                });
            } else if (result && result.Details) {
                showInfoDetailModal(result.Details, 'System Lien / OD Details', 'systemLien', {
                    icon: 'bi-shield-lock',
                    accentColor: '#0ea5e9'
                });
            } else {
                showSystemToast('No lien/OD details found.', { title: 'Information', variant: 'info' });
            }
            
        } catch (error) {
            console.error('[AccountMaintenance] Error fetching system lien:', error);
            showSystemToast('Failed to load system lien details.', { title: 'Error', variant: 'danger' });
        }
    }
    
    /**
     * Professional Info Detail Modal - Enterprise Banking Standard
     * Displays detailed information in a clean, interactive modal
     */
    function showInfoDetailModal(data, title, modalId, options = {}) {
        const { icon = 'bi-info-circle', accentColor = '#4a7c95' } = options;
        
        // Remove existing modal
        const existingModal = document.getElementById(`infoModal_${modalId}`);
        if (existingModal) existingModal.remove();
        
        // Parse data
        const records = Array.isArray(data) ? data : (data ? [data] : []);
        
        // Identify date columns and numeric columns
        let dateColumns = [];
        let numericColumns = [];
        
        if (records.length > 0) {
            const columns = Object.keys(records[0]);
            columns.forEach(col => {
                const colLower = col.toLowerCase();
                // Check if it's a date column (by name)
                if (colLower.includes('date') || colLower.includes('time') || colLower === 'createdon' || colLower === 'modifiedon') {
                    dateColumns.push(col);
                }
                // Check if it's a numeric column (only amount/balance, NOT date columns)
                else if ((colLower.includes('amount') || colLower.includes('balance')) && !dateColumns.includes(col)) {
                    numericColumns.push(col);
                }
            });
        }
        
        // Calculate totals for numeric columns only
        let totals = {};
        if (records.length > 0) {
            numericColumns.forEach(col => {
                totals[col] = records.reduce((sum, r) => {
                    const val = parseFloat(r[col]) || 0;
                    return sum + val;
                }, 0);
            });
        }
        
        // Helper function to format date
        const formatDateValue = (value) => {
            if (!value) return '-';
            try {
                const date = new Date(value);
                if (isNaN(date.getTime())) return value;
                
                const day = String(date.getDate()).padStart(2, '0');
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const month = months[date.getMonth()];
                const year = date.getFullYear();
                
                // Check if time component exists and is not midnight
                const hours = date.getHours();
                const minutes = date.getMinutes();
                const seconds = date.getSeconds();
                
                let formatted = `${day}-${month}-${year}`;
                if (hours !== 0 || minutes !== 0 || seconds !== 0) {
                    const timeStr = date.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                    });
                    formatted += ` ${timeStr}`;
                }
                return formatted;
            } catch (e) {
                return value;
            }
        };
        
        // Build content
        let tableContent = '';
        if (records.length > 0) {
            const columns = Object.keys(records[0]);
            const headerRow = columns.map(col => {
                const isNumeric = numericColumns.includes(col);
                return `<th class="${isNumeric ? 'text-right' : ''}">${formatColumnHeader(col)}</th>`;
            }).join('');
            
            const dataRows = records.map((record, idx) => {
                const cells = columns.map(col => {
                    let value = record[col];
                    const isNumeric = numericColumns.includes(col);
                    const isDate = dateColumns.includes(col);
                    let cellClass = isNumeric ? 'text-right numeric' : '';
                    
                    // Format date columns first (before numeric check)
                    if (isDate) {
                        value = formatDateValue(value);
                        cellClass = 'date-cell';
                    }
                    // Format numeric values (only for actual numeric columns)
                    else if (isNumeric && (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value))))) {
                        const numVal = parseFloat(value);
                        if (!isNaN(numVal)) {
                            const isNegative = numVal < 0;
                            value = Math.abs(numVal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            if (isNegative) {
                                value = `(${value})`;
                                cellClass += ' negative';
                            }
                        }
                    }
                    // Auto-detect date strings that weren't caught by column name
                    else if (typeof value === 'string' && (value.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(value))) {
                        value = formatDateValue(value);
                        cellClass = 'date-cell';
                    }
                    
                    return `<td class="${cellClass}">${value ?? '-'}</td>`;
                }).join('');
                return `<tr data-row="${idx}">${cells}</tr>`;
            }).join('');
            
            // Build totals row if we have numeric columns
            let totalsRow = '';
            if (numericColumns.length > 0) {
                const totalCells = columns.map(col => {
                    if (numericColumns.includes(col)) {
                        const total = totals[col];
                        const isNegative = total < 0;
                        let formatted = Math.abs(total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        if (isNegative) formatted = `(${formatted})`;
                        return `<td class="text-right numeric total ${isNegative ? 'negative' : ''}">${formatted}</td>`;
                    }
                    return '<td></td>';
                }).join('');
                totalsRow = `<tr class="totals-row"><td class="total-label" colspan="1"><strong>Total</strong></td>${totalCells.substring(totalCells.indexOf('</td>') + 5)}</tr>`;
            }
            
            tableContent = `
                <div class="info-detail-table-wrapper">
                    <table class="info-detail-table">
                        <thead><tr>${headerRow}</tr></thead>
                        <tbody>${dataRows}</tbody>
                        ${totalsRow ? `<tfoot>${totalsRow}</tfoot>` : ''}
                    </table>
                </div>
            `;
        } else {
            tableContent = `
                <div class="info-detail-empty">
                    <i class="bi bi-inbox"></i>
                    <p>No records found</p>
                </div>
            `;
        }
        
        // Create modal HTML
        const modalHtml = `
            <div class="info-detail-overlay" id="infoModal_${modalId}" style="--accent-color: ${accentColor}">
                <div class="info-detail-modal" data-title="${title}">
                    <div class="info-detail-header">
                        <div class="info-detail-title">
                            <i class="bi ${icon}"></i>
                            <h3>${title}</h3>
                        </div>
                        <button class="info-detail-close" aria-label="Close">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                    <div class="info-detail-body">
                        ${tableContent}
                    </div>
                    <div class="info-detail-footer">
                        <div class="info-detail-meta">
                            <span class="info-detail-count">
                                <i class="bi bi-list-ul"></i> ${records.length} record${records.length !== 1 ? 's' : ''}
                            </span>
                            <span class="info-detail-timestamp">
                                <i class="bi bi-clock"></i> ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div class="info-detail-actions">
                            <button class="info-detail-btn info-detail-btn-secondary" data-action="print">
                                <i class="bi bi-printer"></i> Print
                            </button>
                            <button class="info-detail-btn info-detail-btn-secondary" data-action="refresh">
                                <i class="bi bi-arrow-clockwise"></i> Refresh
                            </button>
                            <button class="info-detail-btn info-detail-btn-primary" data-action="close">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Wire events
        const modal = document.getElementById(`infoModal_${modalId}`);
        const closeModal = () => {
            modal.classList.add('closing');
            setTimeout(() => modal.remove(), 150);
        };
        
        modal.querySelector('.info-detail-close').addEventListener('click', closeModal);
        modal.querySelector('[data-action="close"]').addEventListener('click', closeModal);
        modal.querySelector('[data-action="refresh"]')?.addEventListener('click', () => {
            // TODO: Re-fetch data
            showSystemToast('Refreshing...', { title: 'Info', variant: 'info' });
        });
        
        // Print functionality
        modal.querySelector('[data-action="print"]')?.addEventListener('click', () => {
            printInfoDetailModal(modal, title, records.length);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        // Row click highlight
        modal.querySelectorAll('.info-detail-table tbody tr').forEach(row => {
            row.addEventListener('click', () => {
                modal.querySelectorAll('.info-detail-table tbody tr').forEach(r => r.classList.remove('selected'));
                row.classList.add('selected');
            });
        });
        
        // ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
    
    /**
     * Professional Print Function for Info Detail Modal
     */
    function printInfoDetailModal(modal, title, recordCount) {
        const tableWrapper = modal.querySelector('.info-detail-table-wrapper');
        if (!tableWrapper) {
            showSystemToast('Nothing to print.', { title: 'Print', variant: 'warning' });
            return;
        }
        
        const accountIdEl = document.getElementById('AccountID');
        const accountNameEl = document.getElementById('AccountName');
        const { branchIdInput } = findBranchInputs();
        const branchNameEl = document.getElementById('BranchName');
        
        const accountId = accountIdEl?.value || '';
        const accountName = accountNameEl?.value || '';
        const branchId = branchIdInput?.value || '';
        const branchName = branchNameEl?.value || '';
        
        const printDate = new Date().toLocaleString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        
        // Create print window
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title} - Print</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        font-size: 11px;
                        color: #1e293b;
                        padding: 20px 30px;
                        background: #fff;
                    }
                    
                    .print-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        border-bottom: 2px solid #1e293b;
                        padding-bottom: 15px;
                        margin-bottom: 20px;
                    }
                    
                    .print-logo {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }
                    
                    .print-logo-icon {
                        width: 40px;
                        height: 40px;
                        background: linear-gradient(135deg, #4a7c95 0%, #3d6a7f 100%);
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 20px;
                        font-weight: bold;
                    }
                    
                    .print-company {
                        font-size: 18px;
                        font-weight: 700;
                        color: #1e293b;
                    }
                    
                    .print-subtitle {
                        font-size: 10px;
                        color: #64748b;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    
                    .print-meta {
                        text-align: right;
                        font-size: 10px;
                        color: #64748b;
                    }
                    
                    .print-meta-item {
                        margin-bottom: 3px;
                    }
                    
                    .print-title-section {
                        background: #f8fafc;
                        padding: 12px 16px;
                        border-radius: 6px;
                        margin-bottom: 15px;
                        border-left: 4px solid #4a7c95;
                    }
                    
                    .print-title {
                        font-size: 14px;
                        font-weight: 600;
                        color: #1e293b;
                        margin-bottom: 8px;
                    }
                    
                    .print-account-info {
                        display: flex;
                        gap: 30px;
                        font-size: 10px;
                    }
                    
                    .print-account-info span {
                        color: #64748b;
                    }
                    
                    .print-account-info strong {
                        color: #1e293b;
                        margin-left: 4px;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 10px;
                    }
                    
                    th {
                        background: #f1f5f9;
                        padding: 10px 12px;
                        text-align: left;
                        font-weight: 600;
                        color: #475569;
                        border-bottom: 2px solid #cbd5e1;
                        white-space: nowrap;
                    }
                    
                    th.text-right {
                        text-align: right;
                    }
                    
                    td {
                        padding: 9px 12px;
                        border-bottom: 1px solid #e2e8f0;
                        color: #334155;
                    }
                    
                    td.text-right {
                        text-align: right;
                    }
                    
                    td.numeric {
                        font-family: 'Consolas', 'Courier New', monospace;
                        font-weight: 500;
                    }
                    
                    td.negative {
                        color: #dc2626;
                    }
                    
                    td.date-cell {
                        white-space: nowrap;
                    }
                    
                    tbody tr:nth-child(even) {
                        background: #fafbfc;
                    }
                    
                    tfoot tr {
                        background: #f1f5f9;
                    }
                    
                    tfoot td {
                        padding: 11px 12px;
                        border-top: 2px solid #cbd5e1;
                        border-bottom: none;
                        font-weight: 600;
                    }
                    
                    .print-footer {
                        margin-top: 25px;
                        padding-top: 15px;
                        border-top: 1px solid #e2e8f0;
                        display: flex;
                        justify-content: space-between;
                        font-size: 9px;
                        color: #94a3b8;
                    }
                    
                    .print-footer-left {
                        display: flex;
                        gap: 20px;
                    }
                    
                    @media print {
                        body {
                            padding: 10px 15px;
                        }
                        
                        .print-header {
                            padding-bottom: 10px;
                            margin-bottom: 15px;
                        }
                        
                        table {
                            page-break-inside: auto;
                        }
                        
                        tr {
                            page-break-inside: avoid;
                            page-break-after: auto;
                        }
                        
                        thead {
                            display: table-header-group;
                        }
                        
                        tfoot {
                            display: table-footer-group;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <div class="print-logo">
                        <div class="print-logo-icon">K</div>
                        <div>
                            <div class="print-company">KAIRO Banking</div>
                            <div class="print-subtitle">Core Banking System</div>
                        </div>
                    </div>
                    <div class="print-meta">
                        <div class="print-meta-item">Printed: ${printDate}</div>
                        <div class="print-meta-item">Records: ${recordCount}</div>
                    </div>
                </div>
                
                <div class="print-title-section">
                    <div class="print-title">${title}</div>
                    <div class="print-account-info">
                        ${branchId ? `<div><span>Branch:</span><strong>${branchId}${branchName ? ' - ' + branchName : ''}</strong></div>` : ''}
                        ${accountId ? `<div><span>Account:</span><strong>${accountId}${accountName ? ' - ' + accountName : ''}</strong></div>` : ''}
                    </div>
                </div>
                
                ${tableWrapper.innerHTML}
                
                <div class="print-footer">
                    <div class="print-footer-left">
                        <span>Generated by KAIRO Banking System</span>
                        <span>Page 1</span>
                    </div>
                    <span>Confidential - Internal Use Only</span>
                </div>
            </body>
            </html>
        `;
        
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Wait for content to load then print
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
            // Close after print dialog (optional - some prefer to keep it open)
            // printWindow.close();
        };
    }
    
    // Legacy modal function - redirect to new one
    function showUnclearBalanceModal(data, title) {
        showInfoDetailModal(data, title, 'unclearBalance', {
            icon: 'bi-clock-history',
            accentColor: '#f59e0b'
        });
    }
    
    function formatColumnHeader(columnName) {
        // Convert camelCase or PascalCase to readable format
        return columnName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
    
    function handleGenericInfo(fieldId, label, valueEl) {
        const value = valueEl?.textContent || '-';
        showSystemToast(`${label}: ${value}`, { title: 'Field Information', variant: 'info' });
    }

    function wireNavButtons() {
        document.querySelectorAll('.btn-nav').forEach(btn => {
            btn.addEventListener('click', async function () {
                const group = this.parentElement.querySelector('span')?.textContent || '';
                const text = this.textContent || '';
                const isPrevious = this.dataset?.direction === 'previous' || text.includes('<') || text.toLowerCase().includes('prev');
                const direction = isPrevious ? -1 : 1;
                const directionLabel = isPrevious ? 'Previous' : 'Next';

                console.log(`${directionLabel} ${group} navigation (Direction: ${direction})`);

                // Only navigate for Account group
                if (group.trim() === 'Account') {
                    try {
                        await tryGetAccount(direction);
                    } catch (error) {
                        console.error(`[AccountMaintenance] ${directionLabel} navigation failed`, error);
                        showErrorMessage(`Unable to load ${directionLabel.toLowerCase()} account.`);
                    }
                }
            });
        });
    }

    function findHeaderTextInput(inputId) {
        // Use ID directly instead of label text.
        return document.getElementById(inputId) || null;
    }

    function validateViewAction() {
        const clientIdInput = document.getElementById('ClientID');
        const accountIdInput = document.getElementById('AccountID');

        const clientId = clientIdInput ? String(clientIdInput.value || '').trim() : '';
        const accountId = accountIdInput ? String(accountIdInput.value || '').trim() : '';

        // In ADD mode, AccountID is not required (it's generated by the database)
        if (currentMode === 'ADD') {
            return { ok: true, messages: [], fieldMessages: [], focusEl: null, invalidEls: [] };
        }

        // Rules:
        // - If View clicked and both are empty: show both messages.
        // - If AccountID has a value and ClientID empty: valid.
        // - If ClientID has a value and AccountID empty: show Account message.
        if (!clientId && !accountId) {
            return {
                ok: false,
                messages: ['Client is required', 'Account ID is required'],
                fieldMessages: ['Client is required', 'Account ID is required'],
                focusEl: clientIdInput || accountIdInput || null,
                invalidEls: [clientIdInput, accountIdInput].filter(Boolean)
            };
        }

        if (clientId && !accountId) {
            return {
                ok: false,
                messages: ['Account ID is required'],
                fieldMessages: ['Account ID is required'],
                focusEl: accountIdInput || null,
                invalidEls: [accountIdInput].filter(Boolean)
            };
        }

        return { ok: true, messages: [], fieldMessages: [], focusEl: null, invalidEls: [] };
    }

    function validateSaveAction() {
        // AccountID is generated by DB; do not require it on save
        const requiredIds = ['BranchID', 'ClientID', 'ProductID', 'CityID', 'CountryID'];
        const invalidEls = [];
        const messages = [];
        const fieldMessages = [];
        
        // Field name mappings for user-friendly messages
        const fieldLabels = {
            'BranchID': 'Branch',
            'ClientID': 'Client',
            'ProductID': 'Product',
            'CityID': 'City',
            'CountryID': 'Country'
        };

        requiredIds.forEach(id => {
            const el = document.getElementById(id);
            const val = el ? String(el.value || '').trim() : '';
            // Check if value is empty or is the placeholder text
            if (!val || val === '--Select--') {
                const fieldLabel = fieldLabels[id] || id.replace(/ID$/, '');
                messages.push(`${fieldLabel} is required`);
                fieldMessages.push(`${fieldLabel} is required`);
                if (el) invalidEls.push(el);
            }
        });

        if (messages.length) {
            return { ok: false, messages, fieldMessages, focusEl: invalidEls[0] || null, invalidEls };
        }

        return { ok: true, messages: [], fieldMessages: [], focusEl: null, invalidEls: [] };
    }

    function buildSavePayload() {
        const getVal = (id) => {
            const el = document.getElementById(id);
            if (!el) return '';
            if (el.type === 'checkbox') return el.checked ? 1 : 0;
            const value = typeof el.value === 'string' ? el.value.trim() : el.value;
            // Filter out placeholder text from selects
            if (value === '--Select--') return '';
            return value;
        };

        // Get current datetime for audit fields
        const now = new Date();
        const currentDateTime = now.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(/(\d+)\/(\d+)\/(\d+),\s*(\d+):(\d+):(\d+)/, '$3/$1/$2 $4:$5:$6');

        return {
            OurBranchID: getVal('BranchID'),
            AccountID: getVal('AccountID'),
            ProductID: getVal('ProductID'),
            LiquidationAccountID: getVal('LiquidationAccountID') || getVal('AccountID'),
            ClientID: getVal('ClientID'),
            Name: getVal('AccountName') || getVal('ClientName'),
            ShortName: getVal('ShortName'),
            Address1: getVal('Address1'),
            Address2: getVal('Address2'),
            CityID: getVal('CityID'),
            CountryID: getVal('CountryID'),
            Phone1: getVal('PhoneHome') || getVal('Phone1'),
            Phone2: getVal('PhoneWork') || getVal('Phone2'),
            Mobile: getVal('Mobile'),
            Fax: getVal('FaxNo') || getVal('Fax'),
            EmailID: getVal('EmailID'),
            ContactPerson: getVal('ContactPerson'),
            ID1: getVal('ID1'),
            ID2: getVal('ID2'),
            OperatingModeID: getVal('OperatingModeID'),
            OperatingInstructions: getVal('OperatingInstructions'),
            AccountClassID: getVal('AccountClassID'),
            AccountOfficerID: getVal('AccountOfficerID'),
            Comments: getVal('Comments') || getVal('Remarks'),
            OpenedDate: getVal('OpenedDate'),
            OpenedBy: getVal('CreatedBy') || getVal('OpenedBy') || getVal('OperatorID'),
            ApprovedBy: getVal('ApprovedBy'),
            CreatedBy: getVal('CreatedBy') || getVal('OperatorID'),
            CreatedOn: currentDateTime,
            ModifiedBy: getVal('ModifiedBy') || getVal('OperatorID'),
            ModifiedOn: currentDateTime,
            SupervisedBy: getVal('SupervisedBy'),
            NewRecord: 1,
            BiometricsEnabled: getVal('BiometricsEnabled') || 0,
            SalesOfficerID: getVal('SalesOfficer') || getVal('SalesOfficerID'),
            LegacyAccountID: getVal('LegacyAccountID'),
            LegacyProductID: getVal('LegacyProductID'),
            Export: getVal('Export') || 0,
            OutputAccountID: getVal('AccountID'),
            DoNotOutputAccountID: getVal('DoNotOutputAccountID') || 0,
            AccountFacilities: getVal('AccountFacilities'),
            PBSerialID: getVal('PassbookSerialID') || getVal('PBSerialID')
        };
    }

    async function saveAccount() {
        // Clear previous validation errors
        clearAllFieldErrors();
        
        const validation = validateSaveAction();
        if (!validation.ok) {
            // Use inline validation display instead of toast
            displayValidationErrors(validation);
            return;
        }

        const payload = buildSavePayload();
        const accountservice = window.accountservice;
        if (!accountservice || typeof accountservice.saveAccount !== 'function') {
            showErrorMessage('accountservice not available for saving.');
            return;
        }

        const saveBtn = Array.from(document.querySelectorAll('.btn-action')).find(b => b.textContent.trim() === 'Save');
        if (saveBtn) saveBtn.disabled = true;
        try {
            const response = await accountservice.saveAccount(payload);

            // Log the full database response
            // console.log('[AccountMaintenance] Save response from database:', response);

            // Extract Account ID from response Details array
            let accountId = '';
            if (response?.Details && Array.isArray(response.Details) && response.Details.length > 0) {
                // Try to get the account ID from the first detail object
                const firstDetail = response.Details[0];
                // The account ID might be in an empty key "" or under AccountID property
                accountId = firstDetail[''] || firstDetail.AccountID || firstDetail.accountId || '';
            }

            // Build the success message with Account ID if available
            let message = 'Account saved successfully.';
            if (accountId) {
                message = `Account added successfully. Account ID: ${accountId}`;
                // console.log('[AccountMaintenance] Account created with ID:', accountId);
            }

            // Show success message in the validation summary area
            showSuccessMessage(message);

            // Populate the AccountID field with the newly created account ID
            if (accountId) {
                const accountIdInput = document.getElementById('AccountID');
                if (accountIdInput) {
                    accountIdInput.value = accountId;
                    accountIdInput.disabled = false; // Keep AccountID enabled
                    // console.log('[AccountMaintenance] Populated AccountID field with:', accountId);
                }
            }

            // Set mode to VIEW and trigger the View button to load the newly created account
            currentMode = 'VIEW';
            // console.log('[AccountMaintenance] Triggering automatic View to display newly created account');
            try {
                await tryGetAccount(0);
            } catch (error) {
                console.error('[AccountMaintenance] Auto-view failed after save', error);
                // Still clear the form even if view fails
                clearMainFormControls();
                disableFormControls();
            }

        } catch (error) {
            console.error('[AccountMaintenance] Save failed', error);
            showErrorMessage(error?.message || 'Unable to save account. Please try again.');
        } finally {
            if (saveBtn) saveBtn.disabled = false;
        }
    }

    function disableFormControls() {
        const formContent = document.querySelector('.form-content');
        if (!formContent) return;

        // Disable all input fields, selects, and buttons (except lookup buttons, action buttons, info buttons, and AccountID)
        const controls = formContent.querySelectorAll('input:not([readonly]), select, button:not(.btn-lookup):not(.btn-nav):not(.btn-action):not(.bts-info-btn)');
        controls.forEach(control => {
            // Keep AccountID always enabled
            if (control.id === 'AccountID') return;
            control.disabled = true;
        });

        // console.log('[AccountMaintenance] Disabled', controls.length, 'form controls (AccountID kept enabled)');
    }

    function clearMainFormControls() {
        const formContent = document.querySelector('.form-content');
        if (!formContent) return;

        // Clear all input fields except BranchID and BranchName
        formContent.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], input[type="tel"]').forEach(input => {
            if (input.id !== 'BranchID' && input.id !== 'BranchName') {
                input.value = '';
            }
        });

        // Clear all textareas
        formContent.querySelectorAll('textarea').forEach(textarea => {
            textarea.value = '';
        });

        // Reset all selects to first option
        formContent.querySelectorAll('select').forEach(select => {
            select.selectedIndex = 0;
        });

        // Uncheck all checkboxes
        formContent.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });

        // console.log('[AccountMaintenance] Cleared main form controls');
    }

    function refreshForm() {
        // console.log('[AccountMaintenance] Refreshing form...');

        // Close any open submodule/child form first
        closeChildForm();

        // Clear all controls except branch
        clearMainFormControls();
        
        // Clear Behind the Scene values
        document.querySelectorAll('.behind-scene-value').forEach(span => {
            span.textContent = '-';
        });
        
        // Clear Audit Trail values
        document.querySelectorAll('.audit-value').forEach(span => {
            span.textContent = '-';
        });

        // Reset to VIEW mode
        currentMode = 'VIEW';

        // Disable all form controls
        disableFormControls();

        // Enable identifier fields for new search/View operations
        ['BranchID', 'ClientID', 'ProductID', 'AccountID'].forEach(function(id) {
            const field = document.getElementById(id);
            if (field) field.disabled = false;
        });

        // Reset action buttons to original state
        const actionButtons = document.querySelectorAll('.btn-action');
        actionButtons.forEach(btn => {
            const action = btn.textContent.trim();
            // Enable View and Add buttons, disable Edit and Save
            if (action === 'View' || action === 'Add') {
                btn.disabled = false;
                btn.classList.add('underline');
            } else if (action === 'Edit' || action === 'Save') {
                btn.disabled = false;
                btn.classList.remove('underline');
            }
        });

        // console.log('[AccountMaintenance] Form refreshed - all controls cleared except branch, buttons reset, mode reset to VIEW');
    }

    // Expose refreshForm to parent window for dashboard refresh button
    window.refreshForm = refreshForm;

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

    function showToast(message, { title = 'Validation', variant = 'danger', timeoutMs = 9000 } = {}) {
        const container = ensureToastContainer();

        const toast = document.createElement('div');
        toast.className = `kairo-toast kairo-toast--${variant}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-atomic', 'true');

        const body = document.createElement('div');
        body.className = 'kairo-toast__body';
        body.textContent = String(message || '');

        const remove = () => {
            try {
                toast.classList.remove('is-show');
                setTimeout(() => toast.remove(), 160);
            } catch {
                // ignore
            }
        };

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'kairo-toast__close';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.innerHTML = '<i class="bi bi-x"></i>';
        closeBtn.addEventListener('click', remove);

        toast.appendChild(body);
        toast.appendChild(closeBtn);
        container.appendChild(toast);

        setTimeout(() => toast.classList.add('is-show'), 0);
        if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
    }

    // =========================================================================
    // INLINE VALIDATION SYSTEM - Enterprise-grade field validation
    // =========================================================================
    
    /**
     * Clear all inline validation errors from the form
     */
    function clearAllFieldErrors() {
        // Remove all field-invalid classes
        document.querySelectorAll('.field-invalid').forEach(el => {
            el.classList.remove('field-invalid');
        });
        
        // Remove all inline error messages
        document.querySelectorAll('.field-error-message').forEach(el => {
            el.remove();
        });
        
        // Hide validation summary
        const summary = document.querySelector('.validation-summary');
        if (summary) {
            summary.classList.remove('is-visible');
        }
        
        // Clear legacy invalid classes
        document.querySelectorAll('.kairo-invalid').forEach(el => {
            el.classList.remove('kairo-invalid');
        });
    }
    
    /**
     * Mark a single field as invalid with inline error message
     * @param {HTMLElement} el - The input/select element
     * @param {string} message - Error message to display
     */
    function showFieldError(el, message) {
        if (!el) return;
        
        // Add invalid class to field
        el.classList.add('field-invalid');
        
        // Also add to parent kairo-control if applicable
        const kairoControl = el.closest('[class*="kairo-"][class*="-control"]');
        if (kairoControl) {
            kairoControl.classList.add('field-invalid');
        }
        
        // Find the container (.col or direct parent)
        const container = el.closest('.col') || el.parentElement;
        if (!container) return;
        
        // Remove any existing error message for this field
        const existingError = container.querySelector('.field-error-message');
        if (existingError) existingError.remove();
        
        // Create inline error message
        const errorEl = document.createElement('span');
        errorEl.className = 'field-error-message';
        errorEl.setAttribute('role', 'alert');
        errorEl.setAttribute('aria-live', 'polite');
        errorEl.textContent = message;
        
        // Insert after the input/control
        const insertAfter = kairoControl || el;
        insertAfter.parentNode.insertBefore(errorEl, insertAfter.nextSibling);
    }
    
    /**
     * Clear error state for a single field
     * @param {HTMLElement} el - The input/select element
     */
    function clearFieldError(el) {
        if (!el) return;
        
        el.classList.remove('field-invalid');
        
        // Also clear from parent kairo-control if applicable
        const kairoControl = el.closest('[class*="kairo-"][class*="-control"]');
        if (kairoControl) {
            kairoControl.classList.remove('field-invalid');
        }
        
        // Remove inline error message
        const container = el.closest('.col') || el.parentElement;
        if (container) {
            const errorEl = container.querySelector('.field-error-message');
            if (errorEl) errorEl.remove();
        }
    }
    
    /**
     * Show validation summary at top of form section
     * @param {string} message - Summary message text
     * @param {HTMLElement} [sectionEl] - Optional section to show summary in
     */
    function showValidationSummary(message, sectionEl) {
        // Find the section content or form card
        const targetSection = sectionEl || document.querySelector('.form-card .section-content');
        if (!targetSection) return;
        
        // Look for existing summary or create one
        let summary = targetSection.querySelector('.validation-summary');
        if (!summary) {
            summary = document.createElement('div');
            summary.className = 'validation-summary';
            summary.setAttribute('role', 'alert');
            summary.setAttribute('aria-live', 'polite');
            
            // Create icon
            const icon = document.createElement('i');
            icon.className = 'bi bi-exclamation-circle validation-summary__icon';
            
            // Create text
            const text = document.createElement('span');
            text.className = 'validation-summary__text';
            
            // Create close button
            const closeBtn = document.createElement('button');
            closeBtn.className = 'validation-summary__close';
            closeBtn.setAttribute('type', 'button');
            closeBtn.setAttribute('aria-label', 'Close notification');
            closeBtn.innerHTML = '<i class="bi bi-x"></i>';
            closeBtn.addEventListener('click', () => hideValidationSummary());
            
            summary.appendChild(icon);
            summary.appendChild(text);
            summary.appendChild(closeBtn);
            
            // Insert at the top of the section
            targetSection.insertBefore(summary, targetSection.firstChild);
        } else {
            // Ensure close button exists and is functional if summary already exists
            let closeBtn = summary.querySelector('.validation-summary__close');
            if (!closeBtn) {
                closeBtn = document.createElement('button');
                closeBtn.className = 'validation-summary__close';
                closeBtn.setAttribute('type', 'button');
                closeBtn.setAttribute('aria-label', 'Close notification');
                closeBtn.innerHTML = '<i class="bi bi-x"></i>';
                closeBtn.addEventListener('click', () => hideValidationSummary());
                summary.appendChild(closeBtn);
            } else {
                // Remove any existing event listeners and reattach to ensure it works
                const newCloseBtn = closeBtn.cloneNode(true);
                closeBtn.replaceWith(newCloseBtn);
                newCloseBtn.addEventListener('click', () => hideValidationSummary());
            }
        }
        
        // Remove success styling for error messages
        summary.classList.remove('validation-summary--success');
        
        // Update icon for error
        const iconEl = summary.querySelector('.validation-summary__icon');
        if (iconEl) {
            iconEl.className = 'bi bi-exclamation-circle validation-summary__icon';
        }
        
        // Update message and show
        const textEl = summary.querySelector('.validation-summary__text');
        if (textEl) textEl.textContent = message;
        summary.classList.add('is-visible');
    }

    /**
     * Show error message in validation summary area (convenience wrapper)
     * @param {string} message - Error message text
     */
    function showErrorMessage(message) {
        showValidationSummary(message);
    }
    
    /**
     * Hide validation summary
     */
    function hideValidationSummary() {
        const summaries = document.querySelectorAll('.validation-summary');
        summaries.forEach(s => {
            s.classList.remove('is-visible');
            s.classList.remove('validation-summary--success');
            // Ensure it's hidden via inline style as well for maximum reliability
            s.style.display = 'none';
        });
    }

    /**
     * Show success message in validation summary area
     * @param {string} message - Success message text
     * @param {HTMLElement} [sectionEl] - Optional section to show summary in
     */
    function showSuccessMessage(message, sectionEl) {
        // Find the section content or form card
        const targetSection = sectionEl || document.querySelector('.form-card .section-content');
        if (!targetSection) return;
        
        // Look for existing summary or create one
        let summary = targetSection.querySelector('.validation-summary');
        if (!summary) {
            summary = document.createElement('div');
            summary.className = 'validation-summary';
            summary.setAttribute('role', 'status');
            summary.setAttribute('aria-live', 'polite');
            
            // Create icon
            const icon = document.createElement('i');
            icon.className = 'bi bi-check-circle validation-summary__icon';
            
            // Create text
            const text = document.createElement('span');
            text.className = 'validation-summary__text';
            
            // Create close button
            const closeBtn = document.createElement('button');
            closeBtn.className = 'validation-summary__close';
            closeBtn.setAttribute('type', 'button');
            closeBtn.setAttribute('aria-label', 'Close notification');
            closeBtn.innerHTML = '<i class="bi bi-x"></i>';
            closeBtn.addEventListener('click', () => hideValidationSummary());
            
            summary.appendChild(icon);
            summary.appendChild(text);
            summary.appendChild(closeBtn);
            
            // Insert at the top of the section
            targetSection.insertBefore(summary, targetSection.firstChild);
        } else {
            // Ensure close button exists and is functional if summary already exists
            let closeBtn = summary.querySelector('.validation-summary__close');
            if (!closeBtn) {
                closeBtn = document.createElement('button');
                closeBtn.className = 'validation-summary__close';
                closeBtn.setAttribute('type', 'button');
                closeBtn.setAttribute('aria-label', 'Close notification');
                closeBtn.innerHTML = '<i class="bi bi-x"></i>';
                closeBtn.addEventListener('click', () => hideValidationSummary());
                summary.appendChild(closeBtn);
            } else {
                // Remove any existing event listeners and reattach to ensure it works
                const newCloseBtn = closeBtn.cloneNode(true);
                closeBtn.replaceWith(newCloseBtn);
                newCloseBtn.addEventListener('click', () => hideValidationSummary());
            }
        }
        
        // Update icon for success
        const iconEl = summary.querySelector('.validation-summary__icon');
        if (iconEl) {
            iconEl.className = 'bi bi-check-circle validation-summary__icon';
        }
        
        // Update message and show with success styling
        const textEl = summary.querySelector('.validation-summary__text');
        if (textEl) textEl.textContent = message;
        summary.classList.add('is-visible', 'validation-summary--success');
    }
    
    /**
     * Display validation errors inline with summary
     * @param {Object} validation - Validation result { ok, messages, invalidEls, fieldMessages }
     */
    function displayValidationErrors(validation) {
        // Clear previous errors first
        clearAllFieldErrors();
        
        if (validation.ok || !validation.invalidEls || validation.invalidEls.length === 0) {
            return;
        }
        
        // Just highlight invalid fields (no inline error messages to avoid layout distortion)
        validation.invalidEls.forEach((el) => {
            highlightInvalidField(el);
        });
        
        // Build list of required field names
        const fieldNames = validation.invalidEls.map(el => {
            // Try to get label text
            const id = el.id || el.name;
            if (id) {
                // Look for associated label
                const label = document.querySelector(`label[for="${id}"]`);
                if (label) {
                    return label.textContent.replace(/[*:]/g, '').trim();
                }
                // Look for label in parent container
                const container = el.closest('.kairo-field, .form-group, [class*="kairo-"][class*="-control"]');
                if (container) {
                    const labelEl = container.querySelector('label, .kairo-field-label');
                    if (labelEl) {
                        return labelEl.textContent.replace(/[*:]/g, '').trim();
                    }
                }
                // Format ID as readable name (e.g., "ProductID" -> "Product ID")
                return id.replace(/([A-Z])/g, ' $1').replace(/ID$/i, ' ID').trim();
            }
            return 'Unknown Field';
        }).filter(Boolean);
        
        // Build summary message with field names
        let summaryMessage;
        if (fieldNames.length === 1) {
            summaryMessage = `Please complete the required field: ${fieldNames[0]}`;
        } else if (fieldNames.length <= 3) {
            summaryMessage = `Please complete the required fields: ${fieldNames.join(', ')}`;
        } else {
            // For many fields, show first 3 and count
            const displayNames = fieldNames.slice(0, 3).join(', ');
            const remaining = fieldNames.length - 3;
            summaryMessage = `Please complete the required fields: ${displayNames} and ${remaining} more`;
        }
        
        // Find the section containing the first invalid field
        const firstInvalidEl = validation.invalidEls[0];
        const section = firstInvalidEl?.closest('.section-content');
        showValidationSummary(summaryMessage, section);
        
        // Focus first invalid field
        if (validation.focusEl && typeof validation.focusEl.focus === 'function') {
            validation.focusEl.focus();
        }
    }
    
    /**
     * Highlight a field as invalid (visual only - no inline error message)
     * @param {HTMLElement} el - The input/select element
     */
    function highlightInvalidField(el) {
        if (!el) return;
        
        // Add invalid class to field
        el.classList.add('field-invalid');
        
        // Also add to parent kairo-control if applicable
        const kairoControl = el.closest('[class*="kairo-"][class*="-control"]');
        if (kairoControl) {
            kairoControl.classList.add('field-invalid');
        }
    }
    
    /**
     * Show system-level toast (only for non-field errors like network, server errors)
     * This is the ONLY place toasts should be used - for system messages, not validation
     */
    function showSystemToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
        // Limit to one toast at a time - remove existing
        const container = ensureToastContainer();
        const existingToasts = container.querySelectorAll('.kairo-toast');
        existingToasts.forEach(t => t.remove());
        
        // Call original toast with shorter timeout for system messages
        showToast(message, { title, variant, timeoutMs });
    }

    // Legacy support functions - redirect to new system
    function clearInvalid(el) {
        clearFieldError(el);
    }

    function markInvalid(el) {
        highlightInvalidField(el);
    }

    // --- Service / Data binding (Loan Maintenance pattern) ---

    const __loadedScripts = new Map();
    function loadScriptOnce(src) {
        const url = String(src || '').trim();
        if (!url) return Promise.reject(new Error('Missing script src'));
        if (__loadedScripts.has(url)) return __loadedScripts.get(url);

        const promise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
            document.head.appendChild(script);
        });

        __loadedScripts.set(url, promise);
        return promise;
    }

    async function ensureaccountserviceLoaded() {
        if (window.accountservice?.getAccount) return window.accountservice;

        // Prefer the shared loader if available; otherwise load it.
        if (!window.ServiceLoader) {
            await loadScriptOnce('/assets/js/services/shared/serviceLoader.js');
        }

        // Load core dependencies needed by accountservice (Environment, CoreBankingConfig, CoreApi)
        await window.ServiceLoader.loadCore();

        // Load accountservice itself
        await loadScriptOnce('/assets/js/services/account/accountservice.js');
        return window.accountservice;
    }

    function getOperatorId() {
        try {
            const session = window.AuthService?.getSession?.();
            return session?.operatorId || session?.operatorID || session?.name || 'web_portal';
        } catch {
            return 'web_portal';
        }
    }

    /** Module ID for Recent Activity Service (Account Maintenance). Client Maintenance uses 1000. */
    const ACCOUNT_MAINTENANCE_MODULE_ID = '2000';

    async function loadRecentActivityService() {
        if (window.RecentActivityService) return window.RecentActivityService;
        if (!window.ServiceLoader) await loadScriptOnce('/assets/js/services/shared/serviceLoader.js');
        await window.ServiceLoader.loadCore();
        await window.ServiceLoader.loadRecentActivityService();
        return window.RecentActivityService;
    }

    async function trackRecentActivity(branchId, accountId) {
        const RecentActivityService = window.RecentActivityService;
        if (!RecentActivityService || !branchId || !accountId) return;
        try {
            const session = window.AuthService?.getSession?.() || {};
            const ourBranchID = session.branchId || session.OurBranchID || branchId || '';
            const loggedInOperator = session.operatorId || session.operatorID || getOperatorId();
            const accessedFields = `BranchID:${branchId},AccountID:${accountId}`;
            const result = await RecentActivityService.addRecentActivity({
                OurBranchID: ourBranchID,
                LoggedInOperator: loggedInOperator,
                ModuleID: ACCOUNT_MAINTENANCE_MODULE_ID,
                AccessedFields: accessedFields
            });
            if (result && result.success) loadRecentActivities();
        } catch (e) {
            console.warn('[AccountMaintenance] trackRecentActivity failed', e);
        }
    }

    async function loadRecentActivities() {
        const RecentActivityService = window.RecentActivityService;
        if (!RecentActivityService) return;
        try {
            const session = window.AuthService?.getSession?.() || {};
            const ourBranchID = session.branchId || session.OurBranchID || findBranchInputs().branchIdInput?.value?.trim() || sessionStorage.getItem('currentBranchID') || '';
            const operatorID = getOperatorId();
            const result = await RecentActivityService.getRecentActivities({
                OurBranchID: ourBranchID,
                OperatorID: operatorID,
                ModuleID: ACCOUNT_MAINTENANCE_MODULE_ID
            });
            if (result && result.success && Array.isArray(result.data)) displayRecentActivities(result.data);
            else displayRecentActivities([]);
        } catch (e) {
            console.warn('[AccountMaintenance] loadRecentActivities failed', e);
            displayRecentActivities([]);
        }
    }

    function displayRecentActivities(activities) {
        const container = document.querySelector('[data-recent-activities-container]');
        if (!container) return;
        if (!Array.isArray(activities) || activities.length === 0) {
            container.innerHTML = `
                <div class="sidebar-item sidebar-item--static sidebar-item--enhanced">
                    <div class="sidebar-item__content">
                        <i class="bi bi-clock sidebar-item__icon"></i>
                        <div class="sidebar-item__text">
                            <div class="sidebar-item__title">No recent activities</div>
                            <div class="sidebar-item__description">View accounts to see them here</div>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        const html = activities.map(function (activity) {
            const accessedFields = activity.AccessedFields || activity.accessedFields || '';
            const parts = accessedFields.split(',').map(function (p) { return p.trim(); });
            let branchId = '', accountId = '';
            parts.forEach(function (p) {
                const [k, v] = p.split(':').map(function (s) { return (s || '').trim(); });
                if (k === 'BranchID') branchId = v || '';
                if (k === 'AccountID') accountId = v || '';
            });
            if (!branchId || !accountId) return '';
            const narration = activity.Narration || activity.narration || 'Recently accessed';
            return (
                '<div class="sidebar-item sidebar-item--static sidebar-item--enhanced" data-activity-branch="' + (branchId || '') + '" data-activity-account="' + (accountId || '') + '" style="cursor:pointer;">' +
                '<div class="sidebar-item__content"><i class="bi bi-bank sidebar-item__icon"></i>' +
                '<div class="sidebar-item__text"><div class="sidebar-item__title">' + (branchId + ' ' + accountId) + '</div>' +
                '<div class="sidebar-item__description">' + (narration || 'Account') + '</div></div></div></div>'
            );
        }).filter(Boolean).join('');
        container.innerHTML = html;
        container.querySelectorAll('[data-activity-branch]').forEach(function (item) {
            const branchId = item.dataset.activityBranch || '';
            const accountId = item.dataset.activityAccount || '';
            item.addEventListener('click', function (e) {
                e.stopPropagation();
                loadRecentRecord(branchId, accountId);
            });
        });
    }

    async function loadRecentRecord(branchId, accountId) {
        const { branchIdInput } = findBranchInputs();
        const accountIdInput = document.getElementById('AccountID');
        if (branchIdInput) {
            branchIdInput.value = branchId;
            branchIdInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (accountIdInput) {
            accountIdInput.value = accountId;
            accountIdInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        clearAllFieldErrors();
        currentMode = 'VIEW';
        try {
            await tryGetAccount(0);
            document.querySelectorAll('[data-recent-activities-container] .sidebar-item').forEach(function (i) { i.classList.remove('active'); });
            const active = document.querySelector('[data-recent-activities-container] [data-activity-branch="' + branchId + '"][data-activity-account="' + accountId + '"]');
            if (active) active.classList.add('active');
            document.querySelectorAll('.btn-action').forEach(function (b) {
                b.classList.remove('underline');
                if (b.textContent.trim() === 'View') b.classList.add('underline');
            });
        } catch (err) {
            console.error('[AccountMaintenance] loadRecentRecord failed', err);
            showErrorMessage('Unable to load account details.');
        }
    }

    function findBranchInputs() {
        const byIdBranch = document.getElementById('BranchID');
        const byIdName = document.getElementById('BranchName');
        if (byIdBranch || byIdName) {
            return { branchIdInput: byIdBranch || null, branchNameInput: byIdName || null };
        }

        return { branchIdInput: null, branchNameInput: null };
    }

    function setCheckboxValue(el, value) {
        if (!el || el.tagName !== 'INPUT' || el.type !== 'checkbox') return;
        el.checked = value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
    }

    function ensureSelectValue(el, value, label) {
        if (!el || el.tagName !== 'SELECT') return;
        const strValue = value == null ? '' : String(value);
        if (!strValue) return;
        const exists = Array.from(el.options).some((o) => o.value === strValue);
        if (!exists) {
            const opt = document.createElement('option');
            opt.value = strValue;
            opt.textContent = label == null ? strValue : String(label);
            el.appendChild(opt);
        }
        el.value = strValue;
    }

    function setControlValue(el, value) {
        if (!el) return;
        if (el.tagName === 'SELECT') {
            ensureSelectValue(el, value);
            return;
        }
        if (el.tagName === 'INPUT' && el.type === 'checkbox') {
            setCheckboxValue(el, value);
            return;
        }
        // Handle span/div display elements (Behind the Scene, audit fields, etc.)
        if (el.tagName === 'SPAN' || el.tagName === 'DIV') {
            const fieldId = el.id || '';
            const strValue = String(value);
            
            // Format based on field type
            // Currency/Balance fields
            const currencyFields = ['ClearBalance', 'UnclearBalance', 'AvailableBalance', 'TotalBalance', 
                'MinimumBalance', 'DepositBalance', 'FreezedAmount', 'PendingCharges', 'DrawingPower',
                'UnSupervisedCredits', 'UnSupervisedDebits', 'CreditInterest', 'DebitInterest', 'SystemLien',
                'Balance', 'FixedAmount'];
            
            // Rate/percentage fields
            const rateFields = ['CreditRate', 'DebitRate', 'PenaltyRate'];
            
            // Date fields
            const dateFields = ['OpenDate', 'CreatedOn', 'ModifiedOn', 'SupervisedOn'];
            
            // Check if value is 0 (zero) for currency/amount fields - show "0.00" instead of "-"
            if (currencyFields.includes(fieldId)) {
                el.setAttribute('data-type', 'currency');
                // Check for null/empty first, but also check if it's actually 0
                if (value == null || value === '' || value === undefined) {
                    el.textContent = '-';
                    el.classList.remove('negative');
                    return;
                }
                const numVal = parseFloat(strValue);
                if (!isNaN(numVal)) {
                    // Format with thousand separators and 2 decimal places
                    // Always show 0.00 for zero values (not "-")
                    const absVal = Math.abs(numVal);
                    const formatted = absVal.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                    });
                    // Negative values in brackets (accounting format)
                    if (numVal < 0) {
                        el.textContent = '(' + formatted + ')';
                        el.classList.add('negative');
                    } else {
                        el.textContent = formatted;
                        el.classList.remove('negative');
                    }
                } else {
                    el.textContent = strValue;
                }
            } else if (rateFields.includes(fieldId)) {
                el.setAttribute('data-type', 'rate');
                // Check for null/empty first, but also check if it's actually 0
                if (value == null || value === '' || value === undefined) {
                    el.textContent = '-';
                    el.classList.remove('negative');
                    return;
                }
                const numVal = parseFloat(strValue);
                if (!isNaN(numVal)) {
                    // Always show 0.00% for zero rates (not "-")
                    el.textContent = numVal.toFixed(2) + '%';
                } else {
                    el.textContent = strValue;
                }
            } else if (dateFields.includes(fieldId)) {
                el.setAttribute('data-type', 'date');
                // Format ISO date to dd-mmm-yyyy format (with time if present)
                if (strValue.includes('T') || strValue.includes('-')) {
                    try {
                        const date = new Date(strValue);
                        if (!isNaN(date.getTime())) {
                            const day = String(date.getDate()).padStart(2, '0');
                            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            const month = months[date.getMonth()];
                            const year = date.getFullYear();
                            
                            // Check if time component exists and is not midnight
                            const hasTime = strValue.includes('T') && 
                                (date.getHours() !== 0 || date.getMinutes() !== 0);
                            
                            if (hasTime) {
                                const hours = date.getHours();
                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                const ampm = hours >= 12 ? 'PM' : 'AM';
                                const hour12 = hours % 12 || 12;
                                el.textContent = `${day}-${month}-${year}, ${hour12}:${minutes} ${ampm}`;
                            } else {
                                el.textContent = `${day}-${month}-${year}`;
                            }
                        } else {
                            el.textContent = strValue;
                        }
                    } catch (e) {
                        el.textContent = strValue;
                    }
                } else {
                    el.textContent = strValue;
                }
            } else {
                // For non-special fields, check if value is null/empty
                if (value == null || value === '') {
                    el.textContent = '-';
                } else {
                    el.textContent = strValue;
                }
            }
            return;
        }
        if ('value' in el) {
            el.value = value == null ? '' : String(value);
        }
    }

    function getPropInsensitive(record, names) {
        if (!record || typeof record !== 'object') return undefined;
        const keys = Object.keys(record);
        const lowerMap = new Map(keys.map((k) => [k.toLowerCase(), k]));
        for (const name of names) {
            if (!name) continue;
            if (Object.prototype.hasOwnProperty.call(record, name)) return record[name];
            const hit = lowerMap.get(String(name).toLowerCase());
            if (hit) return record[hit];
        }
        return undefined;
    }

    function extractFirstRecord(data) {
        if (!data) return null;
        if (Array.isArray(data)) return data[0] || null;
        if (typeof data !== 'object') return null;

        // Start with a merged object to collect all detail arrays
        const merged = {};

        // First, include the main "Details" array if it exists
        const mainDetailsArr = data.Details || data.details;
        if (Array.isArray(mainDetailsArr) && mainDetailsArr.length && mainDetailsArr[0]) {
            // console.log('[AccountMaintenance] Found main Details array:', mainDetailsArr[0]);
            Object.assign(merged, mainDetailsArr[0]);
        }

        // Then, look for Details01, Details02, Details03, etc. up to Details99
        for (let i = 1; i <= 99; i++) {
            const key = `Details${String(i).padStart(2, '0')}`;
            const arr = data[key];
            if (Array.isArray(arr) && arr.length && arr[0]) {
                console.log(`[AccountMaintenance] Found ${key} array:`, arr[0]);
                Object.assign(merged, arr[0]);
            }
        }

        // If we found any detail arrays, return the merged record
        if (Object.keys(merged).length > 0) {
            // console.log('[AccountMaintenance] Merged record from all Details arrays:', merged);
            return merged;
        }

        // Fallback: if no Details or DetailsXX arrays, look for any other array property
        for (const k of Object.keys(data)) {
            const v = data[k];
            if (Array.isArray(v) && v.length && v[0]) {
                console.log(`[AccountMaintenance] Found fallback array ${k}:`, v[0]);
                return v[0];
            }
        }

        return data;
    }

    function normalizeKey(text) {
        return String(text || '')
            .toLowerCase()
            .replace(/\(home\)/g, 'home')
            .replace(/\(work\)/g, 'work')
            .replace(/[^a-z0-9]+/g, '');
    }

    function buildNormalizedRecordMap(record) {
        const map = new Map();
        if (!record || typeof record !== 'object') return map;
        Object.keys(record).forEach((k) => {
            const nk = normalizeKey(k);
            if (!nk) return;
            if (!map.has(nk)) map.set(nk, k);
        });
        return map;
    }


    function findElementByFieldName(fieldName) {
        // Try direct ID match first
        const directEl = document.getElementById(fieldName);
        if (directEl) return directEl;

        // Try normalized ID match
        const normalizedField = normalizeKey(fieldName);
        const allEls = Array.from(document.querySelectorAll('[id]'));
        const byNormId = allEls.find(el => normalizeKey(el.id) === normalizedField);
        if (byNormId) return byNormId;

        // Try finding by label text match
        const labels = Array.from(document.querySelectorAll('label'));
        const matchingLabel = labels.find(label =>
            normalizeKey(label.textContent) === normalizedField
        );
        if (matchingLabel) {
            // Return the next sibling input/select after the label
            let next = matchingLabel.nextElementSibling;
            while (next) {
                if (['INPUT', 'SELECT', 'TEXTAREA'].includes(next.tagName)) return next;
                next = next.nextElementSibling;
            }
            // Or return the input within the same parent row
            const row = matchingLabel.closest('.form-row');
            if (row) {
                const input = row.querySelector('input, select, textarea');
                if (input) return input;
            }
        }

        return null;
    }

    function bindAccountToForm(resultData) {
        const record = extractFirstRecord(resultData);
        if (!record) {
            console.warn('[AccountMaintenance] No record to bind', resultData);
            return { ok: false, boundCount: 0, record: null };
        }

        // console.log('[AccountMaintenance] Starting bind with merged record:', record);
        // console.log('[AccountMaintenance] All available fields:', Object.keys(record));

        let boundCount = 0;
        const boundFields = new Set();

        // Field mappings: API response field name -> HTML element ID
        // This handles cases where API returns different field names than HTML IDs
        const fieldMappings = {
            'UnClearBalance': 'UnclearBalance',
            'OpenedDate': 'OpenDate',
            'DebitIntRate': 'DebitRate',
            'PenaltyIntRate': 'PenaltyRate',
            'CreditIntRate': 'CreditRate'
        };

        // Helper to set a field value (tries both direct ID and mapped ID)
        const setField = (fieldName, value) => {
            // Try direct element ID first
            let el = document.getElementById(fieldName);
            
            // If not found, try the mapped ID
            if (!el && fieldMappings[fieldName]) {
                el = document.getElementById(fieldMappings[fieldName]);
            }
            
            if (!el) {
                console.warn(`[AccountMaintenance] Element not found: ${fieldName}`);
                return false;
            }
            if (value === undefined || value === null) {
                console.log(`[AccountMaintenance] Value is empty for ${fieldName}, skipping`);
                return false;
            }
            console.log(`[AccountMaintenance] Setting ${fieldName} to:`, value);
            setControlValue(el, value);
            boundCount += 1;
            boundFields.add(fieldName);
            return true;
        };

        // Extract and bind header fields
        const branchID = record.OurBranchID || record.BranchID || record.BranchId;
        const branchName = record.BranchName || record.Branch_Name;
        const clientID = record.ClientID || record.ClientId;
        const accountID = record.AccountID || record.AccountId;

        setField('BranchID', branchID);
        setField('BranchName', branchName);
        setField('ClientID', clientID);
        setField('AccountID', accountID);

        // Explicitly bind known fields from Details01, Details02, Details03
        // Includes Behind the Scene fields and Audit Trail fields
        const knownFields = [
            // Behind the Scene - Balance fields
            'ClearBalance', 'UnClearBalance', 'UnclearBalance', 'DrawingPower', 
            'AvailableBalance', 'TotalBalance', 'MinimumBalance', 'DepositBalance',
            'FreezedAmount', 'PendingCharges',
            // Behind the Scene - Supervision fields
            'UnSupervisedCredits', 'UnSupervisedDebits',
            // Behind the Scene - Interest fields
            'CreditInterest', 'DebitInterest', 'InterestSuspended',
            // Behind the Scene - Rate fields
            'CreditRate', 'DebitRate', 'PenaltyRate', 
            'CreditIntRate', 'DebitIntRate', 'PenaltyIntRate',
            // Behind the Scene - Other fields
            'CurrencyID', 'CurrencyName', 'SystemLien', 'Status', 'OpenDate', 'OpenedDate',
            // Product and Account fields
            'ProductTypeID', 'AccountStatusID', 'ClientStatusID', 'NewACCBranch',
            'IsCardAllowed', 'ShortName', 'Address1', 'Address2', 
            'CityID', 'CountryID', 'PhoneHome', 'PhoneWork', 'FaxNo',
            'Mobile', 'EmailID', 'ContactPerson', 'OperatingModeID', 'OperatingInstructions',
            'AccountClassID', 'AccountOfficerID', 'LiquidationAccountID', 'SalesOfficer',
            'PassbookSerialID', 'ProductID', 'ExemptPassBook',
            // Audit Trail fields
            'CreatedBy', 'CreatedOn', 'ModifiedBy', 'ModifiedOn', 
            'SupervisedBy', 'SupervisedOn', 'ApprovedBy', 'ApprovedOn'
        ];

        knownFields.forEach(fieldName => {
            if (record.hasOwnProperty(fieldName)) {
                setField(fieldName, record[fieldName]);
            }
        });

        // Bind ALL remaining fields from the merged record that have matching form inputs
        Object.keys(record).forEach(fieldName => {
            if (boundFields.has(fieldName)) return; // Skip already bound
            if (!fieldName || record[fieldName] === undefined || record[fieldName] === null) return;

            // Try direct element ID first
            let el = document.getElementById(fieldName);
            
            // If not found, try the mapped ID
            if (!el && fieldMappings[fieldName]) {
                el = document.getElementById(fieldMappings[fieldName]);
            }
            
            if (el) {
                console.log(`[AccountMaintenance] Binding extra field: ${fieldName} =`, record[fieldName]);
                setControlValue(el, record[fieldName]);
                boundCount += 1;
                boundFields.add(fieldName);
            }
        });

        // console.log('[AccountMaintenance] Bound fields:', boundCount);
        // console.log('[AccountMaintenance] Bound field names:', Array.from(boundFields));
        // console.log('[AccountMaintenance] Total record keys:', Object.keys(record).length);

        return { ok: true, boundCount, record };
    }

    async function tryGetAccount(direction = 0) {
        // Show page loader
        showPageLoader(true, 'Loading account...');
        
        const accountservice = await ensureaccountserviceLoaded();
        if (!accountservice?.getAccount) {
            showPageLoader(false);
            showErrorMessage('Account service is not available.');
            return;
        }

        const { branchIdInput } = findBranchInputs();
        const clientIdInput = findHeaderTextInput('ClientID');
        const accountIdInput = findHeaderTextInput('AccountID');

        // Sanitize AccountID before using it in payload
        const rawAccountID = accountIdInput ? String(accountIdInput.value || '').trim() : '';
        const sanitizedAccountID = sanitizeAccountID(rawAccountID);
        
        // Update the input field with sanitized value if it changed
        if (accountIdInput && rawAccountID !== sanitizedAccountID) {
            accountIdInput.value = sanitizedAccountID;
        }

        const payload = {
            OurBranchID: branchIdInput ? String(branchIdInput.value || '').trim() : '',
            ClientID: clientIdInput ? String(clientIdInput.value || '').trim() : '',
            AccountID: sanitizedAccountID,
            OperatorID: getOperatorId(),
            Direction: direction,
            DirectionType: direction === 0 ? 'A' : 'N'
        };

        if (!payload.OurBranchID || (!payload.AccountID && currentMode !== 'ADD')) {
            // Show inline errors for missing fields
            // Note: In ADD mode, AccountID is not required (it's generated by the database)
            const viewValidation = {
                ok: false,
                invalidEls: [],
                fieldMessages: [],
                messages: []
            };
            if (!payload.OurBranchID) {
                viewValidation.invalidEls.push(branchIdInput);
                viewValidation.fieldMessages.push('Branch is required');
                viewValidation.messages.push('Branch is required');
            }
            if (!payload.AccountID && currentMode !== 'ADD') {
                viewValidation.invalidEls.push(accountIdInput);
                viewValidation.fieldMessages.push('Account ID is required');
                viewValidation.messages.push('Account ID is required');
            }
            viewValidation.focusEl = viewValidation.invalidEls[0];
            displayValidationErrors(viewValidation);
            showPageLoader(false);
            return;
        }

        // console.log('[AccountMaintenance] Calling dbo.p_GetAccountCustomers', payload);
        const result = await accountservice.getAccount(payload);
        if (!result?.success) {
            console.error('[AccountMaintenance] GetAccount failed', result);
            showPageLoader(false);
            showErrorMessage(result?.message || 'Unable to load account details.');
            return;
        }

        // Check if response contains actual data
        const hasData = result.data && (
            (Array.isArray(result.data) && result.data.length > 0) ||
            (result.data.Details && Array.isArray(result.data.Details) && result.data.Details.length > 0) ||
            (result.data.Details01 && Array.isArray(result.data.Details01) && result.data.Details01.length > 0)
        );
        
        if (!hasData) {
            console.warn('[AccountMaintenance] Account not found - empty response', result);
            showPageLoader(false);
            showErrorMessage(`Account not found. Please verify the Account ID and try again.`);
            window.AccountMaintenanceState.isAccountLoaded = false;
            return;
        }

        // console.log('[AccountMaintenance] GetAccount success', result.data);
        const bindResult = bindAccountToForm(result.data);
        if (!bindResult?.ok) {
            showPageLoader(false);
            showErrorMessage(`Account not found. Please verify the Account ID and try again.`);
            window.AccountMaintenanceState.isAccountLoaded = false;
            return;
        }

        if (!bindResult.boundCount) {
            showPageLoader(false);
            showErrorMessage(`Account data could not be loaded. Please verify the Account ID and try again.`);
            window.AccountMaintenanceState.isAccountLoaded = false;
            return;
        }

        // CRITICAL: Validate that we have ACTUAL account data from the API, not just empty records
        // Check if the record from API actually contains account information
        const recordAccountID = bindResult.record?.AccountID || bindResult.record?.AccountId || '';
        const recordHasAccountData = recordAccountID && 
                                     recordAccountID.trim() !== '' &&
                                     (bindResult.record?.AccountName || 
                                      bindResult.record?.Description || 
                                      bindResult.record?.ShortName ||
                                      bindResult.record?.BranchName ||
                                      bindResult.record?.ClientID ||
                                      bindResult.record?.ProductID);
        
        // Validate that we have a valid AccountID after binding
        const accountIdEl = document.getElementById('AccountID');
        const boundAccountID = accountIdEl?.value?.trim() || '';
        
        // Only validate AccountID if we're not in ADD mode and we had a requested AccountID
        if (currentMode !== 'ADD' && payload.AccountID) {
            // CRITICAL: Check if AccountID was actually bound from API record (not just user input)
            // If record doesn't have AccountID or it doesn't match what we requested, it's invalid
            if (!recordAccountID || recordAccountID.trim() === '') {
                console.warn('[AccountMaintenance] API record does not contain AccountID - account not found');
                showPageLoader(false);
                showErrorMessage(`Account not found. Please verify the Account ID and try again.`);
                window.AccountMaintenanceState.isAccountLoaded = false;
                resetAllFormControls();
                return;
            }
            
            // Check if AccountID from API matches what was requested
            const normalizedRequested = payload.AccountID.replace(/\s+/g, '').toLowerCase();
            const normalizedRecord = recordAccountID.replace(/\s+/g, '').toLowerCase();
            
            if (normalizedRequested !== normalizedRecord && 
                !normalizedRecord.includes(normalizedRequested) &&
                !normalizedRequested.includes(normalizedRecord)) {
                console.warn('[AccountMaintenance] AccountID mismatch - requested:', payload.AccountID, 'API returned:', recordAccountID);
                showPageLoader(false);
                showErrorMessage(`Account not found. Please verify the Account ID and try again.`);
                window.AccountMaintenanceState.isAccountLoaded = false;
                resetAllFormControls();
                return;
            }
            
            // Check if we have meaningful account data (not just AccountID)
            if (!recordHasAccountData) {
                console.warn('[AccountMaintenance] API record has AccountID but no other account data - account may not exist');
                showPageLoader(false);
                showErrorMessage(`Account not found. Please verify the Account ID and try again.`);
                window.AccountMaintenanceState.isAccountLoaded = false;
                resetAllFormControls();
                return;
            }
            
            // If AccountID is completely missing after binding, that's an error
            if (!boundAccountID || boundAccountID === '') {
                console.warn('[AccountMaintenance] AccountID is empty after binding - invalid account data');
                showPageLoader(false);
                showErrorMessage(`Account not found. Please verify the Account ID and try again.`);
                window.AccountMaintenanceState.isAccountLoaded = false;
                resetAllFormControls();
                return;
            }
        }

        // Set default zeros for rate and charge fields if they are empty (before formatting)
        const fieldsWithZeroDefaults = ['CreditRate', 'DebitRate', 'PenaltyRate', 'PendingCharges'];
        fieldsWithZeroDefaults.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && (!field.value || field.value.trim() === '')) {
                field.value = '0';
                // console.log('[AccountMaintenance] Set empty', fieldId, 'to 0');
            }
        });

        // Format all money and date fields after data is loaded
        reformatAllFields();

        // Disable all form controls after data is bound
        disableFormControls();
        
        // Clear any previous validation errors
        clearAllFieldErrors();

        // CHECK FOR REMINDERS AND DISPLAY MODAL
        checkAndDisplayReminder(result.data);

        // Update global state for child forms to access
        // IMPORTANT: Read from form fields AFTER data binding, not from payload
        // Reuse accountIdEl that was already declared above for validation
        const { branchIdInput: branchEl } = findBranchInputs();
        const clientIdEl = document.getElementById('ClientID');
        const operatorIdEl = document.getElementById('OperatorID');
        const operatingModeSelect = document.getElementById('OperatingModeID');
        const operatingModeDescription = operatingModeSelect ? 
            operatingModeSelect.options[operatingModeSelect.selectedIndex]?.text || '' : '';
        
        // Use form field values (after binding) - these are the actual loaded values
        const loadedBranchID = branchEl?.value?.trim() || payload.OurBranchID || '';
        const loadedAccountID = accountIdEl?.value?.trim() || payload.AccountID || '';
        const loadedClientID = clientIdEl?.value?.trim() || payload.ClientID || '';
        const loadedOperatorID = operatorIdEl?.value?.trim() || payload.OperatorID || '';
        
        // Get names and type from form fields or bound record
        const branchNameEl = document.getElementById('BranchName');
        const accountNameEl = document.getElementById('Description') || document.getElementById('AccountName');
        const loadedBranchName = branchNameEl?.value?.trim() || bindResult.record?.BranchName || '';
        const loadedAccountName = accountNameEl?.value?.trim() || bindResult.record?.Description || bindResult.record?.AccountName || bindResult.record?.ShortName || '';
        const loadedAccountTypeID = bindResult.record?.AccountTypeID || bindResult.record?.ProductTypeID || '';
        const loadedProductID = document.getElementById('ProductID')?.value || bindResult.record?.ProductID || '';
        
        window.AccountMaintenanceState = {
            isAccountLoaded: true,
            AccountID: loadedAccountID,
            AccountName: loadedAccountName,
            AccountTypeID: loadedAccountTypeID,
            ProductID: loadedProductID,
            OurBranchID: loadedBranchID,
            BranchName: loadedBranchName,
            ClientID: loadedClientID,
            OperatorID: loadedOperatorID,
            OperatingModeID: document.getElementById('OperatingModeID')?.value || '',
            OperatingModeDescription: operatingModeDescription,
            OperatingInstructions: document.getElementById('OperatingInstructions')?.value || ''
        };
        
        console.log('[AccountMaintenance] Account loaded - state updated:', window.AccountMaintenanceState);

        // Enable Edit, Save, Cancel buttons now that account is loaded
        enableButtonsAfterLoad();
        
        // Enable AccountID field after viewing (so user can view different accounts)
        const accountIdField = document.getElementById('AccountID');
        if (accountIdField) {
            accountIdField.disabled = false;
        }

        showPageLoader(false);

        // Track recent activity (same pattern as Client Maintenance)
        trackRecentActivity(loadedBranchID, loadedAccountID);
        
        // CRITICAL: Only show success message if we have ACTUAL account data loaded
        // All validation above should have caught invalid accounts, but double-check here
        // Reuse recordAccountID that was already declared above for validation
        const hasValidRecordAccountID = recordAccountID && recordAccountID.trim() !== '';
        const hasAccountData = bindResult.boundCount > 0 && 
                               (loadedAccountName || loadedBranchName || loadedAccountTypeID || 
                                document.getElementById('ShortName')?.value?.trim() ||
                                document.getElementById('Address1')?.value?.trim() ||
                                document.getElementById('ClientID')?.value?.trim() ||
                                document.getElementById('ProductID')?.value?.trim());
        
        // Only show success if:
        // 1. We have a valid AccountID from the API record
        // 2. We have actual account data bound (not just empty fields)
        // 3. bindResult indicates successful binding
        // 4. AccountID matches what was requested (or we're in ADD mode)
        const accountIDMatches = currentMode === 'ADD' || 
                                 !payload.AccountID || 
                                 (recordAccountID && (
                                   recordAccountID === payload.AccountID ||
                                   recordAccountID.replace(/\s+/g, '').toLowerCase() === payload.AccountID.replace(/\s+/g, '').toLowerCase()
                                 ));
        
        if (hasValidRecordAccountID && hasAccountData && bindResult.boundCount > 0 && accountIDMatches && window.AccountMaintenanceState.isAccountLoaded) {
            showSuccessMessage(`Account details loaded successfully. Account ID: ${loadedAccountID}`);
        } else {
            // Account was not actually loaded - this should have been caught above, but double-check
            console.error('[AccountMaintenance] Success message validation failed:', {
                hasValidRecordAccountID,
                hasAccountData,
                boundCount: bindResult.boundCount,
                accountIDMatches,
                recordAccountID,
                loadedAccountID,
                requestedAccountID: payload.AccountID
            });
            // Don't show error here as it should have been shown above - just don't show success
            if (!hasValidRecordAccountID || !hasAccountData) {
                showErrorMessage(`Account not found. Please verify the Account ID and try again.`);
                window.AccountMaintenanceState.isAccountLoaded = false;
                resetAllFormControls();
            }
        }
        
        // Re-wire info buttons after form is fully loaded and bound
        wireInfoButtons();
    }

    /**
     * Reset all form controls to empty/default state
     */
    function resetAllFormControls() {
        // Store current BranchID to preserve it
        const branchIdInput = document.getElementById('BranchID');
        const preservedBranchId = branchIdInput ? branchIdInput.value : '';
        
        // Clear all text inputs (except BranchID)
        document.querySelectorAll('input[type="text"], input[type="email"], input[type="number"], textarea').forEach(input => {
            if (input.id !== 'BranchID') {
                input.value = '';
            }
        });
        
        // Reset all selects
        document.querySelectorAll('select').forEach(select => {
            select.value = '';
        });
        
        // Uncheck all checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Restore BranchID if it had a value
        if (branchIdInput && preservedBranchId) {
            branchIdInput.value = preservedBranchId;
        }
        
        // Reset behind-the-scene values to dashes
        document.querySelectorAll('.behind-scene-value').forEach(span => {
            span.textContent = '-';
        });
        
        // Reset audit trail values to dashes
        document.querySelectorAll('.audit-value').forEach(span => {
            span.textContent = '-';
        });
    }

    /**
     * Enable Edit, Save, Cancel buttons after account data is loaded
     */
    function enableButtonsAfterLoad() {
        document.querySelectorAll('.btn-action').forEach(btn => {
            const action = btn.textContent.trim();
            // In VIEW mode: VIEW disabled, ADD enabled, EDIT disabled, SAVE disabled, CANCEL enabled
            if (action === 'View') {
                btn.disabled = true;  // VIEW disabled in VIEW mode
            } else if (action === 'Add') {
                btn.disabled = false; // ADD enabled
            } else if (action === 'Edit') {
                btn.disabled = true;  // EDIT disabled in VIEW mode
            } else if (action === 'Save') {
                btn.disabled = true;  // SAVE disabled in VIEW mode
            } else if (action === 'Cancel') {
                btn.disabled = false; // CANCEL enabled
            }
        });
    }

    async function fetchAccountOpeningDetails() {
        // console.log('[fetchAccountOpeningDetails] Function called');
        const accountservice = await ensureaccountserviceLoaded();
        if (!accountservice?.getAccountOpeningDetails) {
            console.error('[AccountMaintenance] Account service is not available');
            showErrorMessage('Account service is not available.');
            return;
        }

        const { branchIdInput } = findBranchInputs();
        const clientId = document.getElementById('ClientID')?.value?.trim() || '';
        const productId = document.getElementById('ProductID')?.value?.trim() || '';
        const branchId = branchIdInput ? String(branchIdInput.value || '').trim() : '';

        // console.log('[fetchAccountOpeningDetails] Values - ClientID:', clientId, 'ProductID:', productId, 'BranchID:', branchId);

        if (!clientId || !productId) {
            console.warn('[AccountMaintenance] Missing required fields for opening details fetch');
            // Use inline validation for missing fields
            const openingValidation = {
                ok: false,
                invalidEls: [],
                fieldMessages: [],
                messages: []
            };
            if (!clientId) {
                const clientEl = document.getElementById('ClientID');
                if (clientEl) {
                    openingValidation.invalidEls.push(clientEl);
                    openingValidation.fieldMessages.push('Client is required');
                    openingValidation.messages.push('Client is required');
                }
            }
            if (!productId) {
                const productEl = document.getElementById('ProductID');
                if (productEl) {
                    openingValidation.invalidEls.push(productEl);
                    openingValidation.fieldMessages.push('Product is required');
                    openingValidation.messages.push('Product is required');
                }
            }
            openingValidation.focusEl = openingValidation.invalidEls[0];
            displayValidationErrors(openingValidation);
            return;
        }

        try {
            // Pass only the data fields - CoreApi.makeRequestEnvelope will wrap them properly
            const payload = {
                OurBranchID: branchId,
                ClientID: clientId,
                ProductID: productId
            };

            // console.log('[AccountMaintenance] Fetching opening details with payload:', payload);
            const result = await accountservice.getAccountOpeningDetails(payload);

            // console.log('[AccountMaintenance] Opening details raw result:', result);

            if (!result?.success) {
                console.error('[AccountMaintenance] GetAccountOpeningDetails failed:', result);
                showErrorMessage(result?.message || 'Unable to fetch account opening details.');
                return;
            }

            // console.log('[AccountMaintenance] Opening details response:', result.data);

            // Extract the first record from potentially nested response structure
            const record = extractFirstRecord(result.data);
            if (!record) {
                console.warn('[AccountMaintenance] No record found in opening details response');
                return;
            }

            // console.log('[AccountMaintenance] Extracted record:', record);
            // console.log('[AccountMaintenance] Available fields in record:', Object.keys(record));

            // Populate all address and account details fields (from both Details and Details01 arrays)
            // Map response field names to form element IDs
            const fieldMappings = {
                // From Details array (customer information)
                'Name': 'ShortName',
                'Address1': 'Address1',
                'Address2': 'Address2',
                'CityID': 'CityID',
                'CountryID': 'CountryID',
                'Phone1': 'PhoneHome',
                'Phone2': 'PhoneWork',
                'Fax': 'FaxNo',
                'Mobile': 'Mobile',
                'Email': 'EmailID',
                'ClientStatusID': 'ClientStatusID',
                // From Details01 array (product/account information)
                'AccountPrefix': 'AccountPrefix',
                'AccountID': 'AccountID',
                'ProductName': 'ProductName',
                'MinimumBalance': 'MinimumBalance',
                'CurrencyID': 'CurrencyID',
                'ProductTypeID': 'ProductTypeID',
                'ProductClassID': 'ProductClassID',
                'IsRetentionAccount': 'IsRetentionAccount',
                'OpenedDate': 'OpenedDate',
                'Status': 'Status',
                // Additional fields that might exist
                'ClearBalance': 'ClearBalance',
                'UnClearBalance': 'UnClearBalance',
                'DrawingPower': 'DrawingPower',
                'AvailableBalance': 'AvailableBalance',
                'TotalBalance': 'TotalBalance',
                'OperatingModeID': 'OperatingModeID',
                'AccountClassID': 'AccountClassID',
                'AccountOfficerID': 'AccountOfficerID'
            };

            let populatedCount = 0;
            Object.entries(fieldMappings).forEach(([sourceField, targetFieldId]) => {
                const element = document.getElementById(targetFieldId);
                if (!element) {
                    // Field not present in this form, skip silently
                    return;
                }

                // Try the source field name first, then the target name (they're often the same)
                let value = record[sourceField];
                if (value === undefined || value === null) {
                    value = record[targetFieldId];
                }

                if (value !== undefined && value !== null && value !== '') {
                    setControlValue(element, value);
                    populatedCount++;
                    console.log(`[AccountMaintenance] Populated ${targetFieldId} (from ${sourceField}) =`, value);
                }
            });

            console.log(`[AccountMaintenance] Successfully populated ${populatedCount} fields from opening details`);

            // Reformat all fields (dates, currency, etc.)
            reformatAllFields();
            // console.log('[AccountMaintenance] Opening details loaded and formatted successfully');

        } catch (error) {
            console.error('[AccountMaintenance] Exception fetching opening details:', error);
        }
    }

    function enableAddMode() {
        currentMode = 'ADD';
        // Clear all form fields except Branch (which should remain)
        const formContent = document.querySelector('.form-content');
        if (formContent) {
            // Clear all input fields except BranchID and BranchName
            formContent.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], input[type="tel"]').forEach(input => {
                if (input.id !== 'BranchID' && input.id !== 'BranchName') {
                    input.value = '';
                }
            });

            // Clear all textareas
            formContent.querySelectorAll('textarea').forEach(textarea => {
                textarea.value = '';
            });

            // Reset all selects to first option
            formContent.querySelectorAll('select').forEach(select => {
                select.selectedIndex = 0;
            });

            // Uncheck all checkboxes
            formContent.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });
            
            // Clear Behind the Scene display values (span elements)
            formContent.querySelectorAll('.behind-scene-value').forEach(span => {
                span.textContent = '-';
            });
            
            // Clear Audit Trail display values (span elements)
            formContent.querySelectorAll('.audit-value').forEach(span => {
                span.textContent = '-';
            });
        }

        // Enable specific fields for Add mode that user can initially enter
        const fieldsToEnable = [
            'ClientID', 'ProductID', 'LiquidationAccountID', 'SalesOfficer',
            'AccountClassID', 'OperatingModeID', 'AccountOfficerID',
            'CityID', 'CountryID',
            // Add lookup buttons
            'btnClientLookup', 'btnProductLookup'
        ];

        fieldsToEnable.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.disabled = false;
                field.readOnly = false;
            }
        });
        
        // Disable AccountID in Add mode (new account ID will be generated)
        const accountIdField = document.getElementById('AccountID');
        if (accountIdField) {
            accountIdField.disabled = true;
            accountIdField.value = ''; // Clear it as well
        }

        // Set default zeros for rate and charge fields (must be done after clearing)
        const fieldsWithZeroDefaults = ['CreditRate', 'DebitRate', 'PenaltyRate', 'PendingCharges'];
        fieldsWithZeroDefaults.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = '0';
                field.value = formatMoney(field.value);
                // console.log('[AccountMaintenance] Set', fieldId, 'to 0.00');
            }
        });

        // Set current date for OpenDate
        const openDateField = document.getElementById('OpenDate');
        if (openDateField) {
            const today = new Date();
            const formattedDate = (today.getMonth() + 1).toString().padStart(2, '0') + '/' +
                today.getDate().toString().padStart(2, '0') + '/' +
                today.getFullYear();
            openDateField.value = formattedDate;
            // console.log('[AccountMaintenance] Set OpenDate to:', formattedDate);
        }

        // Disable View, Edit, and Add buttons; Enable Save and Cancel for add mode
        const actionButtons = document.querySelectorAll('.btn-action');
        // console.log('[enableAddMode] Found', actionButtons.length, 'action buttons');

        actionButtons.forEach(btn => {
            const action = btn.textContent.trim();
            // console.log('[enableAddMode] Button text:', action);
            if (action === 'View' || action === 'Edit' || action === 'Add') {
                btn.disabled = true;
                // console.log('[enableAddMode] Disabled button:', action);
            }
            if (action === 'Save' || action === 'Cancel') {
                btn.disabled = false;
                // console.log('[enableAddMode] Enabled button:', action);
            }
        });

        // Set focus to Client ID
        const clientIdInput = document.getElementById('ClientID');
        if (clientIdInput) {
            setTimeout(() => {
                clientIdInput.focus();
                clientIdInput.select();
            }, 100);
        }

        // console.log('[AccountMaintenance] Add mode enabled - all fields cleared');
    }

    function wireActionButtons() {
        document.querySelectorAll('.btn-action').forEach(btn => {
            btn.addEventListener('click', async function () {
                const action = this.textContent;
                console.log('Action: ' + action);

                if (action === 'View') {
                    currentMode = 'VIEW';
                    // Clear previous validation errors
                    clearAllFieldErrors();
                    
                    const result = validateViewAction();
                    if (!result.ok) {
                        // Use inline validation display
                        displayValidationErrors(result);
                        return;
                    }

                    try {
                        await tryGetAccount(0);
                    } catch (error) {
                        console.error('[AccountMaintenance] View failed', error);
                        showErrorMessage('Unable to load account details.');
                    }
                }

                if (action === 'Add') {
                    enableAddMode();
                }

                if (action === 'Edit') {
                    currentMode = 'EDIT';
                    // Enable Account Name, City, and Country for editing
                    const editableFields = ['AccountName', 'CityID', 'CountryID'];
                    editableFields.forEach(fieldId => {
                        const field = document.getElementById(fieldId);
                        if (field) {
                            field.disabled = false;
                            field.readOnly = false;
                            // console.log('[AccountMaintenance] Enabled field for editing:', fieldId);
                        }
                    });
                    // console.log('[AccountMaintenance] Edit mode enabled - Account Name, City, and Country can be changed');
                }

                if (action === 'Save') {
                    currentMode = 'VIEW';
                    try {
                        await saveAccount();
                    } catch (error) {
                        console.error('[AccountMaintenance] Save handler failed', error);
                    }
                }
                
                if (action === 'Cancel') {
                    handleCancelAction();
                    return; // Don't change underline state
                }

                // Remove underline from all
                document.querySelectorAll('.btn-action').forEach(b => b.classList.remove('underline'));

                // Add underline to clicked
                if (action === 'View' || action === 'Add' || action === 'Edit') {
                    this.classList.add('underline');
                }
            });
        });
    }
    
    /**
     * Initialize default button behavior
     * - View button receives initial focus
     * - Enter key triggers View action (not Save)
     * - Tab order places View before Save
     */
    function wireDefaultButtonBehavior() {
        const viewBtn = document.querySelector('.btn-action.btn-view, .action-buttons .btn-action:first-child');
        const saveBtn = Array.from(document.querySelectorAll('.btn-action')).find(b => b.textContent.trim() === 'Save');
        
        // Set tabindex to ensure View comes before Save in tab order
        if (viewBtn) {
            viewBtn.setAttribute('tabindex', '1');
        }
        if (saveBtn) {
            saveBtn.setAttribute('tabindex', '2');
        }
        
        // Focus on View button after a short delay to allow DOM to settle
        setTimeout(() => {
            if (viewBtn) {
                viewBtn.focus();
            }
        }, 300);
        
        // Handle Enter key to trigger View action (not Save)
        document.addEventListener('keydown', (e) => {
            // Only handle Enter key
            if (e.key !== 'Enter') return;
            
            // Don't intercept Enter in textareas (allow line breaks)
            if (e.target.tagName === 'TEXTAREA') return;
            
            // Don't intercept if user explicitly focuses a button
            if (e.target.classList.contains('btn-action') || 
                e.target.classList.contains('btn') ||
                e.target.classList.contains('btn-nav') ||
                e.target.classList.contains('btn-lookup')) return;
            
            // Don't intercept if in a modal
            if (document.querySelector('.modal.show') || 
                document.querySelector('.info-detail-overlay') ||
                document.querySelector('[data-child-inline]:not([hidden])')) return;
            
            // Trigger View button if it exists and is enabled
            if (viewBtn && !viewBtn.disabled) {
                e.preventDefault();
                viewBtn.click();
            }
        });
    }
    
    /**
     * Handle Cancel button action
     * In ADD/EDIT mode: Show confirmation, then reset
     * In VIEW mode: Reset to default load state
     */
    function handleCancelAction() {
        if (currentMode === 'ADD' || currentMode === 'EDIT') {
            // Show confirmation dialog
            showConfirmationModal(
                'Cancel Changes',
                `Are you sure you want to cancel? All unsaved changes will be lost.`,
                () => {
                    // User confirmed - reset form
                    resetToDefaultState();
                    showSystemToast('Changes cancelled.', { title: 'Cancelled', variant: 'info' });
                },
                () => {
                    // User declined - do nothing
                }
            );
        } else {
            // VIEW mode - just reset to default
            resetToDefaultState();
        }
    }
    
    /**
     * Reset form to default load state
     */
    /**
     * Set initial button states on page load
     * Only View and Add are enabled, Edit/Save/Cancel are disabled
     */
    function setInitialButtonStates() {
        document.querySelectorAll('.btn-action').forEach(btn => {
            const action = btn.textContent.trim();
            btn.classList.remove('underline');
            
            // Only View and Add are enabled on page load
            if (action === 'View' || action === 'Add') {
                btn.disabled = false;
            } else {
                // Edit, Save, Cancel are disabled on page load
                btn.disabled = true;
            }
        });
    }

    function resetToDefaultState() {
        resetAccountMaintenanceState();

        // Ensure any inline child overlay is closed so reopening starts fresh
        closeChildForm();

        // Clear all form controls
        clearMainFormControls();
        
        // Clear Behind the Scene values
        document.querySelectorAll('.behind-scene-value').forEach(span => {
            span.textContent = '-';
        });
        
        // Clear Audit Trail values
        document.querySelectorAll('.audit-value').forEach(span => {
            span.textContent = '-';
        });
        
        // Reset mode
        currentMode = 'VIEW';
        
        // Disable form controls
        disableFormControls();
        
        // Enable identifier fields for new search/View operations
        ['BranchID', 'ClientID', 'ProductID', 'AccountID'].forEach(function(id) {
            const field = document.getElementById(id);
            if (field) field.disabled = false;
        });
        
        // Reset action buttons state - only View and Add enabled initially
        setInitialButtonStates();
        
        // Clear any validation errors
        clearAllFieldErrors();
    }
    
    /**
     * Show confirmation modal dialog
     * Uses confirm-modal classes from styles.css
     */
    function showConfirmationModal(title, message, onConfirm, onCancel) {
        const modalId = 'confirmModal_' + Date.now();
        
        const modalHtml = `
            <div class="confirm-modal" id="${modalId}" role="dialog" aria-modal="true" aria-labelledby="${modalId}_title">
                <div class="confirm-modal__backdrop"></div>
                <div class="confirm-modal__content">
                    <div class="confirm-modal__header">
                        <div class="confirm-modal__header-left">
                            <div class="confirm-modal__icon-circle">
                                <i class="bi bi-exclamation-triangle confirm-modal__icon"></i>
                            </div>
                            <h2 id="${modalId}_title" class="confirm-modal__title">${title}</h2>
                        </div>
                        <button type="button" class="confirm-modal__close" aria-label="Close"><i class="bi bi-x"></i></button>
                    </div>
                    <div class="confirm-modal__body">
                        <p class="confirm-modal__message">${message}</p>
                    </div>
                    <div class="confirm-modal__footer">
                        <button type="button" class="confirm-modal__btn confirm-modal__btn--no" data-action="cancel-confirm">No, Keep Editing</button>
                        <button type="button" class="confirm-modal__btn confirm-modal__btn--yes" data-action="confirm">Yes, Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = document.getElementById(modalId);
        const backdrop = modal.querySelector('.confirm-modal__backdrop');
        const closeModal = () => {
            modal.classList.add('confirm-modal--closing');
            setTimeout(() => modal.remove(), 150);
        };
        
        modal.querySelector('.confirm-modal__close').addEventListener('click', () => {
            closeModal();
            if (onCancel) onCancel();
        });
        
        modal.querySelector('[data-action="cancel-confirm"]').addEventListener('click', () => {
            closeModal();
            if (onCancel) onCancel();
        });
        
        modal.querySelector('[data-action="confirm"]').addEventListener('click', () => {
            closeModal();
            if (onConfirm) onConfirm();
        });
        
        if (backdrop) {
            backdrop.addEventListener('click', () => {
                closeModal();
                if (onCancel) onCancel();
            });
        }
        
        // ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                if (onCancel) onCancel();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    async function populateDropdowns() {
        const LookupService = window.LookupService;
        if (!LookupService) {
            console.warn('[AccountMaintenance] LookupService not available');
            return;
        }

        try {
            // Populate City dropdown
            const citySelect = document.getElementById('CityID');
            if (citySelect) {
                const cities = await LookupService.getCities();
                cities.forEach(city => {
                    const option = document.createElement('option');
                    option.value = city.value;
                    option.textContent = city.label;
                    citySelect.appendChild(option);
                });
                // console.log('[AccountMaintenance] Populated', cities.length, 'cities');
            }

            // Populate Country dropdown
            const countrySelect = document.getElementById('CountryID');
            if (countrySelect) {
                const countries = await LookupService.getCountries();
                countries.forEach(country => {
                    const option = document.createElement('option');
                    option.value = country.value;
                    option.textContent = country.label;
                    countrySelect.appendChild(option);
                });
                // console.log('[AccountMaintenance] Populated', countries.length, 'countries');
            }

            // Populate Operating Mode dropdown
            const operatingModeSelect = document.getElementById('OperatingModeID');
            if (operatingModeSelect) {
                const operatingModes = await LookupService.getOperatingModes();
                operatingModes.forEach(mode => {
                    const option = document.createElement('option');
                    option.value = mode.value;
                    option.textContent = mode.label;
                    operatingModeSelect.appendChild(option);
                });
                // console.log('[AccountMaintenance] Populated', operatingModes.length, 'operating modes');
            }
        } catch (error) {
            console.error('[AccountMaintenance] Failed to populate dropdowns:', error);
        }
    }

    function applyBsUtilityClasses() {
        const root = document.querySelector('.form-content');
        if (!root) return;

        const shouldSkip = (el) => {
            if (!el) return true;
            const className = el.className || '';
            if (className.includes('kairo-')) return true;
            if (el.closest('[data-kairo-branch-control]')) return true;
            if (el.closest('[data-kairo-client-control]')) return true;
            if (el.closest('[data-kairo-product-control]')) return true;
            if (el.closest('[data-kairo-account-control]')) return true;
            if (el.closest('.audit-section')) return true;
            if (el.dataset && el.dataset.skipBs === 'true') return true;
            return false;
        };

        const inputMappings = [
            { selector: 'input[type="text"]', cls: 'bs-input-text' },
            { selector: 'input[type="email"]', cls: 'bs-input-email' },
            { selector: 'input[type="password"]', cls: 'bs-input-password' },
            { selector: 'input[type="tel"]', cls: 'bs-input-tel' },
            { selector: 'input[type="url"]', cls: 'bs-input-url' },
            { selector: 'input[type="search"]', cls: 'bs-input-search' },
            { selector: 'input[type="number"]', cls: 'bs-input-number' },
            { selector: 'input[type="date"]', cls: 'bs-input-date' },
            { selector: 'input[type="file"]', cls: 'bs-file' }
        ];

        inputMappings.forEach(({ selector, cls }) => {
            root.querySelectorAll(selector).forEach((el) => {
                if (shouldSkip(el)) return;
                el.classList.add(cls);
            });
        });

        root.querySelectorAll('input[type="checkbox"]').forEach((el) => {
            if (shouldSkip(el)) return;
            el.classList.add('bs-checkbox');
        });

        root.querySelectorAll('input[type="radio"]').forEach((el) => {
            if (shouldSkip(el)) return;
            el.classList.add('bs-radio');
        });

        root.querySelectorAll('input[type="hidden"]').forEach((el) => {
            if (shouldSkip(el)) return;
            el.classList.add('bs-hidden');
        });

        root.querySelectorAll('select').forEach((el) => {
            if (shouldSkip(el)) return;
            el.classList.add('bs-select');
        });

        root.querySelectorAll('textarea').forEach((el) => {
            if (shouldSkip(el)) return;
            el.classList.add('bs-textarea');
        });

        root.querySelectorAll('label').forEach((el) => {
            if (shouldSkip(el)) return;
            el.classList.add('bs-label');
        });

        root.querySelectorAll('input[type="button"], button[type="button"], button:not([type])').forEach((el) => {
            if (shouldSkip(el)) return;
            if ((el.className || '').includes('btn-')) return;
            el.classList.add('bs-btn');
        });

        root.querySelectorAll('input[type="submit"]').forEach((el) => {
            if (shouldSkip(el)) return;
            el.classList.add('bs-btn', 'bs-btn--primary');
        });

        root.querySelectorAll('input[type="reset"]').forEach((el) => {
            if (shouldSkip(el)) return;
            el.classList.add('bs-btn', 'bs-btn--danger');
        });
    }
    document.addEventListener('DOMContentLoaded', function () {
        showPageLoader(true, 'Initializing form...');
        
        try {
        // Clear any existing validation summaries on page load/refresh
        hideValidationSummary();
        
        // Reset blur state on page load
        resetBlurState();
        
        // Reset all form controls to empty/clean state
        resetAllFormControls();
        
        // Initialize Behind the Scene and Audit Trail fields with dashes
        document.querySelectorAll('.behind-scene-value, .audit-value').forEach(span => {
            if (!span.textContent || span.textContent.trim() === '') {
                span.textContent = '-';
            }
        });
        
        // Populate title attributes for native browser tooltips
        document.querySelectorAll('.sidebar-item--enhanced').forEach(item => {
            const description = item.querySelector('.sidebar-item__description');
            const title = item.querySelector('.sidebar-item__title');
            if (description && title) {
                // Set native tooltip with title and description
                item.setAttribute('title', `${title.textContent}: ${description.textContent}`);
            }
        });
        
        // applyBsUtilityClasses(); // Disabled - causing kairo control distortion
        wireNavSections();
        wireSidebar();
        wireBlockingConfirmation();
        wireRecentActivities();
        loadRecentActivityService().then(function () { loadRecentActivities(); });
        wireSidebarToggle();
        wireSubmoduleSearch();
        updateBadgeCounts();
        wireOverlayClose();
        wireLookupButtons();
        wireBranchSearchPanel();
        wireClientSearchPanel();
        wireAccountSearchPanel();
        wireProductSearchPanel();
        wireBranchControl();
        wireClientControl();
        wireProductControl();
        wireAccountControl();
        wireMoneyFields();
        wireDateFields();
        wirePlusButtons();
        wireNavButtons();
        wireActionButtons();
        wireDefaultButtonBehavior();
        setInitialButtonStates();
        wireCollapsibleSections();
        wireChildToolbar();

        // Wire reminder modal event handlers
        const reminderModal = document.getElementById('reminderModal');
        if (reminderModal) {
            const backdrop = reminderModal.querySelector('.reminder-modal__backdrop');
            if (backdrop) {
                backdrop.addEventListener('click', () => {
                    reminderModal.hidden = true;
                });
            }

            // Close modal on ESC key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !reminderModal.hidden) {
                    reminderModal.hidden = true;
                }
            });
        }

        const resetForLifecycle = () => resetToDefaultState();
        window.addEventListener('pagehide', resetForLifecycle);
        window.addEventListener('beforeunload', resetForLifecycle);
        window.addEventListener('pageshow', (event) => {
            if (event && event.persisted) {
                resetToDefaultState();
            }
        });

        // Populate City and Country dropdowns
        populateDropdowns();

        // Clear validation styling once the user starts correcting input.
        // This includes all required fields for save and view actions
        const validatedFields = [
            'BranchID', 'ClientID', 'ProductID', 'AccountID', 'CityID', 'CountryID'
        ];
        validatedFields.forEach((fieldId) => {
            const input = document.getElementById(fieldId);
            if (!input) return;
            
            const handleClear = () => {
                clearFieldError(input);
                // Also hide validation summary if all errors are cleared
                const remainingErrors = document.querySelectorAll('.field-invalid');
                if (remainingErrors.length === 0) {
                    hideValidationSummary();
                }
            };
            
            input.addEventListener('input', handleClear);
            input.addEventListener('change', handleClear);
        });

        // If the host app uses KairoTheme, it will dispatch these on the parent window.
        try {
            const host = window.parent && window.parent !== window ? window.parent : window;
            host.addEventListener('kairo-theme-model-changed', applyThemeVarsToChildIframe);
            host.addEventListener('kairo-theme-changed', applyThemeVarsToChildIframe);
        } catch {
            // ignore
        }
        
        } finally {
            // Always reveal form and hide loader (even on error, so user is not stuck)
            document.body.classList.add('page-ready');
            showPageLoader(false);
        }
    });
    
    // =========================================================================
    // COLLAPSIBLE SECTIONS
    // =========================================================================
    function wireCollapsibleSections() {
        document.querySelectorAll('.form-section[data-section]').forEach(section => {
            const header = section.querySelector('[data-section-toggle]');
            const content = section.querySelector('[data-section-content]');
            const toggleBtn = section.querySelector('.section-toggle-btn');
            
            if (!header || !content) return;
            
            header.addEventListener('click', function(e) {
                // Don't toggle if clicking on a button (except the toggle button itself)
                if (e.target.closest('button') && !e.target.closest('.section-toggle-btn')) return;
                
                const isCollapsed = section.classList.contains('collapsed');
                
                if (isCollapsed) {
                    // Expand
                    section.classList.remove('collapsed');
                    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
                } else {
                    // Collapse
                    section.classList.add('collapsed');
                    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
                }
            });
        });

        // Wire mini collapsible cards
        document.querySelectorAll('.mini-card-header[data-toggle-mini-card]').forEach(header => {
            // Make header focusable
            header.setAttribute('role', 'button');
            header.setAttribute('tabindex', '0');
            
            // Click handler
            header.addEventListener('click', function(e) {
                if (e.target.closest('button') && !e.target.closest('.mini-toggle-btn')) return;
                toggleMiniCard(header);
            });

            // Keyboard handlers (Enter and Space)
            header.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleMiniCard(header);
                }
            });

            // Button click handler
            const btn = header.querySelector('.mini-toggle-btn');
            if (btn) {
                btn.setAttribute('tabindex', '-1');
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    header.click();
                });
            }
        });

        function toggleMiniCard(header) {
            const card = header.closest('.mini-collapsible-card');
            const content = card.querySelector('.mini-card-content');
            const btn = card.querySelector('.mini-toggle-btn');
            
            if (!content) return;
            
            const isCollapsed = content.style.display === 'none';
            
            if (isCollapsed) {
                // Expand
                content.style.display = 'block';
                if (btn) {
                    btn.classList.remove('collapsed');
                    btn.setAttribute('aria-expanded', 'true');
                }
            } else {
                // Collapse
                content.style.display = 'none';
                if (btn) {
                    btn.classList.add('collapsed');
                    btn.setAttribute('aria-expanded', 'false');
                }
            }
        }
    }
    
    // =========================================================================
    // TOAST NOTIFICATIONS
    // =========================================================================
    window.showToast = function(type, title, message, duration = 5000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const icons = {
            success: 'bi-check-circle-fill',
            error: 'bi-x-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="bi ${icons[type] || icons.info} toast-icon"></i>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Close"><i class="bi bi-x-lg"></i></button>
        `;
        
        container.appendChild(toast);
        
        // Close button functionality
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        });
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.classList.add('hiding');
                    setTimeout(() => toast.remove(), 300);
                }
            }, duration);
        }
        
        return toast;
    };
    
    // =========================================================================
    // CHILD TOOLBAR (Expand/Close buttons)
    // =========================================================================
    function wireChildToolbar() {
        const maximizeBtn = document.getElementById('maximizeChildBtn');
        
        if (maximizeBtn) {
            maximizeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                toggleChildExpand();
                // Toggle icon between maximize (square) and restore (copy/overlapping squares)
                const icon = this.querySelector('i');
                if (icon) {
                    const isExpanded = document.querySelector('.main-container').classList.contains('child-expanded');
                    icon.className = isExpanded ? 'bi bi-copy' : 'bi bi-square';
                    this.title = isExpanded ? 'Restore' : 'Maximize';
                }
            });
        }
    }
})();

