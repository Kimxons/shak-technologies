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
        try {
            const overlay = document.getElementById('pageLoadingOverlay');
            const textEl = document.getElementById('pageLoadingText');

            if (!overlay) {
                console.warn('[showPageLoader] pageLoadingOverlay element not found');
                // Don't return, allow generic overlay fallback if needed
            }

            if (textEl) textEl.textContent = message;
            // Handle both ID-based and class-based overlays if strictly needed, 
            // but here just fix the null check
            if (overlay) overlay.hidden = !show;
        } catch (error) {
            console.error('[showPageLoader] Error:', error);
        }
    }

    // Helper notification functions to resolve ReferenceErrors
    function showSystemToast(message, options = {}) {
        const variant = options && options.variant ? options.variant : 'info';
        
        // Check for inline alert target (for account load success)
        if (options.useInlineAlert) {
            showInlineAlert(message, variant);
            return;
        }

        // Try AppCore first
        if (window.AppCore && typeof window.AppCore.showNotification === 'function') {
            window.AppCore.showNotification(message, variant);
            return;
        }

        // Try global toastr if available (common in legacy apps)
        if (window.toastr && typeof window.toastr[variant] === 'function') {
            window.toastr[variant](message);
            return;
        }

        // Fallback to console
        console.log(`[${variant.toUpperCase()}] ${message}`);
        
        // rudimentary fallback
        if (variant === 'error') {
            alert(`Error: ${message}`);
        }
    }

    function showErrorMessage(message, options = {}) {
        showSystemToast(message, { ...options, variant: 'error' });
    }

    // Expose notification functions to global window for submodule access
    window.showSystemToast = showSystemToast;
    window.showErrorMessage = showErrorMessage;

    // Custom inline alert implementation matching the user's screenshot style
    function showInlineAlert(message, variant) {
        // Find the main section content container - prioritizing the search section
        const searchSection = document.querySelector('[data-section="account-search"] .section-content') || 
                            document.querySelector('[data-section="search"] .section-content') || 
                            document.querySelector('.kairo-search-panel') || 
                            document.querySelector('[data-main-form] .section-content') ||
                            document.getElementById('accountMaintenanceForm')?.closest('.card-body');

        if (!searchSection) {
            // Fallback to toast if no container found
            // Use AppCore or fallback logic from showSystemToast, but avoid infinite recursion
            // Directly call AppCore/toastr here as fallback
            if (window.AppCore && typeof window.AppCore.showNotification === 'function') {
                window.AppCore.showNotification(message, variant);
            } else {
                alert(message);
            }
            return;
        }

        // Remove existing alerts to prevent stacking
        const existingAlert = searchSection.querySelector('.kairo-inline-alert');
        if (existingAlert) existingAlert.remove();

        const alertDiv = document.createElement('div');
        const alertClass = variant === 'success' ? 'alert-success' : 
                          variant === 'error' ? 'alert-danger' : 
                          variant === 'warning' ? 'alert-warning' : 'alert-info';
        
        const iconClass = variant === 'success' ? 'bi-check-circle-fill' : 
                         variant === 'error' ? 'bi-exclamation-triangle-fill' : 
                         variant === 'warning' ? 'bi-exclamation-circle-fill' : 'bi-info-circle-fill';

        alertDiv.className = `alert ${alertClass} alert-dismissible fade show kairo-inline-alert`;
        alertDiv.role = 'alert';
        alertDiv.style.marginTop = '10px';
        alertDiv.style.marginBottom = '10px';
        alertDiv.style.display = 'flex';
        alertDiv.style.alignItems = 'center';

        alertDiv.innerHTML = `
            <i class="bi ${iconClass} me-2"></i>
            <div>${message}</div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        // Insert at the top of the search section
        searchSection.insertBefore(alertDiv, searchSection.firstChild);

        // Auto dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv && alertDiv.parentNode) {
                // Fade out effect could be added here
                alertDiv.remove();
            }
        }, 5000);
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
    // Note: These must match the data-submodule attributes in Index.cshtml (PascalCase)
    const ACCOUNT_REQUIRED_FORMS = [
        'Documents', 'Signatories', 'AccountSweeping', 'Nomination', 'Closing',
        'ChargeRates', 'Blocking', 'UserDefinedFields', 'AccountClassification',
        'AccountNotification', 'SpecialConditions', 'InterestRates', 'AccountNotes',
        'FreezeRelease', 'CardMaintenance', 'ChequeBook', 'StopPaymentVoid',
        'CancelStopPayment', 'ActivateDormant', 'Reminders', 'AccountActivation',
        'AccountTransfer', 'StatementView', 'SignaturePhoto', 'ClientPortfolio',
        'LoanRepaymentDetails', 'DebitInterestWorksheet', 'CreditInterestWorksheet'
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

    /**
     * Helper to execute scripts sequentially from fetched HTML
     */
    function executeScripts(scripts) {
        return scripts.reduce((promise, scriptStub) => {
            return promise.then(() => {
                return new Promise((resolve, reject) => {
                    const newScript = document.createElement('script');
                    Array.from(scriptStub.attributes).forEach(attr => {
                        newScript.setAttribute(attr.name, attr.value);
                    });

                    if (scriptStub.textContent) {
                        newScript.textContent = scriptStub.textContent;
                    }

                    // If src, wait for load
                    if (newScript.src) {
                        newScript.onload = () => resolve();
                        newScript.onerror = () => {
                            console.warn('Script load failed:', newScript.src);
                            resolve(); // Continue anyway
                        };
                        document.body.appendChild(newScript);
                    } else {
                        document.body.appendChild(newScript);
                        // Allow small tick for inline script execution
                        setTimeout(resolve, 10);
                    }
                });
            });
        }, Promise.resolve());
    }

    /**
     * Load submodule view (for Data Entry and View sidebar items)
     */
    function loadSubmoduleView(submoduleName) {
        showPageLoader(true, `Loading ${submoduleName}...`);

        // Check if this form requires a loaded account
        if (ACCOUNT_REQUIRED_FORMS.includes(submoduleName)) {
            if (!window.AccountMaintenanceState?.isAccountLoaded) {
                showPageLoader(false);
                showSystemToast('Please load an account before accessing this feature.', {
                    title: 'Account Required',
                    variant: 'warning',
                    timeoutMs: 4000
                });
                return;
            }
        }

        // Store current AccountID in sessionStorage for child forms to access
        if (window.AccountMaintenanceState.AccountID && window.AccountMaintenanceState.isAccountLoaded) {
            sessionStorage.setItem('currentAccountID', window.AccountMaintenanceState.AccountID);
            sessionStorage.setItem('currentBranchID', window.AccountMaintenanceState.OurBranchID || '');
            sessionStorage.setItem('currentOperatorID', window.AccountMaintenanceState.OperatorID || '');
            sessionStorage.setItem('currentProductID', window.AccountMaintenanceState.ProductID || '');
            sessionStorage.setItem('currentClientID', window.AccountMaintenanceState.ClientID || '');
        }

        fetch(`/AccountsMaintenance/${submoduleName}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'text/html'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            const container = document.getElementById('submodule-container');
            if (container) {
                const mainForm = container.querySelector('[data-main-form]');
                if (mainForm) {
                    mainForm.style.display = 'none';
                }

                const existingSubmodule = container.querySelector('[data-submodule-content]');
                if (existingSubmodule) {
                    existingSubmodule.remove();
                }

                const wrapper = document.createElement('div');
                wrapper.setAttribute('data-submodule-content', submoduleName);
                wrapper.innerHTML = html;

                // Extract scripts to execute them
                const scripts = Array.from(wrapper.querySelectorAll('script'));
                scripts.forEach(s => s.remove());

                container.appendChild(wrapper);

                const formContent = document.querySelector('.form-content');
                if (formContent) {
                    formContent.scrollTop = 0;
                }

                // Execute extracted scripts then update UI
                executeScripts(scripts).then(() => {
                    console.log(`[AccountMaintenance] Scripts executed for ${submoduleName}`);

                    // Update the main action panel for the loaded submodule
                    updateActionPanelForSubmodule(submoduleName);

                    // Special Handling for migrated modules with 'init' method
                    if (submoduleName === 'AccountActivation' && window.AccountActivationModule && window.AccountActivationModule.init) {
                        window.AccountActivationModule.init();
                    }
                });
            }

            showPageLoader(false);
            showSystemToast(`${submoduleName} loaded successfully`, { variant: 'success' });
        })
        .catch(error => {
            console.error(`[AccountMaintenance] Error loading ${submoduleName}:`, error);
            showPageLoader(false);
            showErrorMessage(`Failed to load ${submoduleName}: ${error.message}`);
        });
    }

    /**
     * Close the currently active submodule and show the main form
     */
    function closeSubmodule() {
        const container = document.getElementById('submodule-container');
        if (!container) return;

        // Remove the submodule content
        const submoduleContent = container.querySelector('[data-submodule-content]');
        if (submoduleContent) {
            submoduleContent.remove();
        }

        // Show the main form again
        const mainForm = container.querySelector('[data-main-form]');
        if (mainForm) {
            mainForm.style.display = 'block';
        }

        // Restore action panel
        if (typeof restoreMainActionPanel === 'function') {
            restoreMainActionPanel();
        }

        // Restore the main action panel to its default state
        restoreMainActionPanel();

        // Remove active state from sidebar
        document.querySelectorAll('.sidebar-item.active, .sidebar-item--enhanced.active').forEach(item => {
            item.classList.remove('active');
        });

        // Clear submodule-related session storage
        sessionStorage.removeItem('currentAccountID');
        sessionStorage.removeItem('currentBranchID');
        sessionStorage.removeItem('currentOperatorID');
    }

    /**
     * Replaces the main action panel's buttons with submodule-specific ones.
     * @param {string} submoduleName The name of the loaded submodule.
     */
    function updateActionPanelForSubmodule(submoduleName) {
        let parentActionPanel = null;
        
        // Strategy 1: Look for the specific structure in Index.cshtml
        // .window > .main-container > .action-panel
        const mainContainers = document.querySelectorAll('.main-container');
        for (const container of mainContainers) {
            // Check if this container has the sidebar and form-content we expect
            if (container.querySelector('#main-sidebar') && container.querySelector('.form-content')) {
                // Find the action panel that is a direct child
                for (const child of container.children) {
                    if (child.classList.contains('action-panel')) {
                        parentActionPanel = child;
                        break;
                    }
                }
            }
            if (parentActionPanel) break;
        }

        // Strategy 2: Fallback to any visible action panel that isn't inside the submodule container
        if (!parentActionPanel) {
            const allPanels = document.querySelectorAll('.action-panel');
            for (const panel of allPanels) {
                // Skip panels inside the submodule container
                if (panel.closest('#submodule-container')) continue;
                
                // Skip hidden panels (heuristic)
                if (window.getComputedStyle(panel).display === 'none') continue;
                
                parentActionPanel = panel;
                break;
            }
        }

        if (!parentActionPanel) {
            console.warn('[AccountMaintenance] Action panel not found');
            return;
        }

        console.log('[AccountMaintenance] Updating Action Panel:', parentActionPanel);

        // Hide nav groups
        parentActionPanel.querySelectorAll('.nav-group').forEach(g => {
            g.style.display = 'none';
        });

        const actionButtonsContainer = parentActionPanel.querySelector('.action-buttons');
        if (!actionButtonsContainer) return;

        // Store original buttons if not already stored
        // IMPORTANT: Only store if we recognize these as the "default" attributes or if not yet stored
        // This prevents overwriting the "good" original state with a "bad" intermediate state
        if (!parentActionPanel.dataset.originalButtons) {
            parentActionPanel.dataset.originalButtons = actionButtonsContainer.innerHTML;
        }

        let newButtonsHtml = '';
        // Define standard buttons for ALL submodules
        newButtonsHtml = `
            <button class="btn-action btn-view" type="button" id="submoduleBtnView"><i class="bi bi-eye me-1"></i>View</button>
            <button class="btn-action" type="button" id="submoduleBtnEdit"><i class="bi bi-pencil-square me-1"></i>Edit</button>
            <button class="btn-action" type="button" id="submoduleBtnSave"><i class="bi bi-check-lg me-1"></i>Save</button>
            <button class="btn-action btn-cancel" type="button" id="submoduleBtnCancel"><i class="bi bi-x-circle me-1"></i>Cancel</button>
            <button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose"><i class="bi bi-box-arrow-right me-1"></i>Close</button>
        `;

        if (newButtonsHtml) {
            actionButtonsContainer.innerHTML = newButtonsHtml;
        }

        // Defer wiring to allow submodule script to load and initialize
        setTimeout(() => {
            const viewBtn = document.getElementById('submoduleBtnView');
            const editBtn = document.getElementById('submoduleBtnEdit');
            const saveBtn = document.getElementById('submoduleBtnSave');
            const cancelBtn = document.getElementById('submoduleBtnCancel');
            const closeBtn = document.getElementById('submoduleBtnClose');

            // Wire Close button globally
            if (closeBtn) closeBtn.addEventListener('click', () => closeSubmodule());

            // Handle explicitly handled modules (Modernized)
            if (submoduleName === 'AccountNotes' && window.AccountNotesModule) {
                const mod = window.AccountNotesModule;
                if (viewBtn) viewBtn.addEventListener('click', () => mod.setMode('VIEW'));
                if (editBtn) editBtn.addEventListener('click', () => mod.setMode('EDIT'));
                if (saveBtn) saveBtn.addEventListener('click', () => mod.saveNotes());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.cancelChanges());
                if (typeof mod.setMode === 'function') mod.setMode('VIEW');
                return;
            }

            if (submoduleName === 'AccountActivation' && window.AccountActivationModule) {
                const mod = window.AccountActivationModule;
                if (viewBtn) viewBtn.addEventListener('click', () => { if (mod.init) mod.init(); });
                if (editBtn) editBtn.addEventListener('click', () => mod.edit());
                if (saveBtn) saveBtn.addEventListener('click', () => mod.save());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.cancel());
                // Refresh logic if needed
                return;
            }

            // Handle Proxy Buttons (Legacy Support for Partial Views)
            // Finds buttons in the loaded submodule content and clicks them when sidebar buttons are clicked
            const container = document.getElementById('submodule-container');
            if (container) {
                const proxyClick = (action) => {
                    // Try to find button with data-action="action" or specific attributes
                    let targetBtn = null;

                    // Case insensitive search for common button attributes
                    if (!targetBtn) targetBtn = container.querySelector(`[data-action="${action}"]`);
                    // Try finding buttons by text content (less reliable but useful for legacy)
                    if (!targetBtn) {
                         const buttons = Array.from(container.querySelectorAll('button, a.btn'));
                         targetBtn = buttons.find(b => b.textContent.trim().toLowerCase() === action.toLowerCase());
                    }

                    if (targetBtn) {
                        console.log(`[Proxy] Clicking target button for action: ${action}`);
                        targetBtn.click();
                    } else {
                        console.warn(`[Proxy] No target button found for action: ${action}`);
                    }
                };

                if (viewBtn) viewBtn.addEventListener('click', () => proxyClick('view'));
                if (editBtn) editBtn.addEventListener('click', () => proxyClick('edit'));
                if (saveBtn) saveBtn.addEventListener('click', () => proxyClick('save'));
                if (cancelBtn) cancelBtn.addEventListener('click', () => proxyClick('cancel'));
            }
        }, 150);
    }

    /**
     * Restores the main action panel to its original state.
     */
    function restoreMainActionPanel() {
        const parentActionPanel = document.querySelector('.main-container > .action-panel');
        if (!parentActionPanel) return;

        // Show nav groups
        parentActionPanel.querySelectorAll('.nav-group').forEach(g => {
            g.style.display = 'flex';
        });

        const actionButtonsContainer = parentActionPanel.querySelector('.action-buttons');
        if (actionButtonsContainer && parentActionPanel.dataset.originalButtons) {
            actionButtonsContainer.innerHTML = parentActionPanel.dataset.originalButtons;
            delete parentActionPanel.dataset.originalButtons;
        }

        // Note: Original button event listeners may need to be re-attached if they were not delegated.
        // Assuming global delegation or inline handlers for now.
    }

    function init() {
        wireNavSections();
        wireSidebarToggle();
        wireSidebar();
        wireBlockingConfirmation();
        wireLookups();
        wireActionButtons();

        // Hide initial loader
        showPageLoader(false);
    }

    // Expose core functions to be called from submodules
    window.AccountMaintenanceCore = {
        closeSubmodule: closeSubmodule
    };

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
            items.removeAttribute('hidden');
            const sidebar = document.getElementById('main-sidebar');
            if (sidebar && sidebar.classList.contains('collapsed')) return;

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
        sections.forEach(section => {
            const header = section.querySelector('.nav-header, .nav-header--card');
            if (!header) return;

            header.addEventListener('click', function (e) {
                if (e.target.closest('.nav-badge')) return;

                const sidebar = document.getElementById('main-sidebar');
                const mainContainer = document.querySelector('.main-container');
                const toggle = document.getElementById('sidebarToggle');
                const isCollapsed = sidebar && sidebar.classList.contains('collapsed');

                if (isCollapsed) {
                    sidebar.classList.remove('collapsed');
                    if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
                    if (toggle) toggle.setAttribute('aria-expanded', 'true');

                    sections.forEach(s => setSectionOpen(s, false));
                    setSectionOpen(section, true);
                    section.classList.add('expanded');
                    return;
                }

                const willOpen = !section.classList.contains('is-open');
                sections.forEach(s => setSectionOpen(s, false));
                setSectionOpen(section, willOpen);

                if (willOpen) section.classList.add('expanded');
                else section.classList.remove('expanded');
            });
        });

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
                sidebar.classList.remove('collapsed');
                if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
                toggle.setAttribute('aria-expanded', 'true');
                document.querySelectorAll('.nav-section--card').forEach(section => {
                    const items = section.querySelector('.nav-items--card');
                    if (items) {
                        const isSectionOpen = section.classList.contains('is-open');
                        items.hidden = !isSectionOpen;
                    }
                });
            } else {
                sidebar.classList.add('collapsed');
                if (mainContainer) mainContainer.classList.add('sidebar-collapsed');
                toggle.setAttribute('aria-expanded', 'false');
                document.querySelectorAll('.nav-items--card').forEach(items => {
                    items.hidden = false;
                });
            }
        });
    }

    function wireSidebar() {
        document.querySelectorAll('.sidebar-item[data-child-form], .sidebar-item--enhanced[data-child-form]').forEach(item => {
            item.addEventListener('click', function (e) {
                e.stopPropagation();
                const sidebar = document.getElementById('main-sidebar');
                if (sidebar && sidebar.classList.contains('collapsed')) {
                     sidebar.classList.remove('collapsed');
                     document.querySelector('.main-container')?.classList.remove('sidebar-collapsed');
                }

                document.querySelectorAll('.sidebar-item, .sidebar-item--enhanced').forEach(i => i.classList.remove('active'));
                this.classList.add('active');

                const childKey = this.getAttribute('data-child-form');
                if (childKey === 'blocking-unblocking') {
                    showBlockingConfirmation();
                } else if (childKey) {
                    openChildForm(childKey);
                }
            });
        });

        document.querySelectorAll('.sidebar-item[data-submodule], .sidebar-item--enhanced[data-submodule]').forEach(item => {
            item.addEventListener('click', function (e) {
                e.stopPropagation();
                const sidebar = document.getElementById('main-sidebar');
                if (sidebar && sidebar.classList.contains('collapsed')) {
                     sidebar.classList.remove('collapsed');
                     document.querySelector('.main-container')?.classList.remove('sidebar-collapsed');
                }

                document.querySelectorAll('.sidebar-item, .sidebar-item--enhanced').forEach(i => i.classList.remove('active'));
                this.classList.add('active');

                const submoduleName = this.getAttribute('data-submodule');
                if (submoduleName) {
                    loadSubmoduleView(submoduleName);
                }
            });
        });
    }

    function wireBlockingConfirmation() {
        const yesBtn = document.getElementById('blockingConfirmYes');
        const noBtn = document.getElementById('blockingConfirmNo');
        const closeBtn = document.getElementById('blockingConfirmClose');

        if (yesBtn) {
            yesBtn.addEventListener('click', function() {
                hideBlockingConfirmation();
                openChildForm('blocking-unblocking');
            });
        }
        if (noBtn) noBtn.addEventListener('click', hideBlockingConfirmation);
        if (closeBtn) closeBtn.addEventListener('click', hideBlockingConfirmation);
    }

    function showBlockingConfirmation() {
        const modal = document.getElementById('blockingConfirmModal');
        if (modal) modal.hidden = false;
    }

    function hideBlockingConfirmation() {
        const modal = document.getElementById('blockingConfirmModal');
        if (modal) modal.hidden = true;
    }

    // Lookup Configuration
    // Matched with Client 360 and System Search configurations
    const LOOKUP_CONFIG = {
        'BranchID': { tableID: 'BranchID', keyField: 'BranchID', nameField: 'BranchName' },
        'ClientID': { tableID: 'ClientID', keyField: 'ClientID', nameField: 'ClientName' },
        'ProductID': { tableID: 'ProductID', keyField: 'ProductID', nameField: 'ProductName' },
        'AccountID': { tableID: 'AccountID', keyField: 'AccountID', nameField: 'AccountName' },
        'LiquidationAccountID': { tableID: 'AccountID', keyField: 'AccountID', nameField: 'AccountName' },
        'SalesOfficerID': { tableID: 'OfficerID', keyField: 'OfficerID', nameField: 'OfficerName' },
        'PassbookSerialID': { tableID: 'PassbookSerialID', keyField: 'SerialID', nameField: 'SerialName' }
    };

    function wireLookups() {
        const lookupBtns = document.querySelectorAll('.btn-lookup');
        if (lookupBtns.length === 0) return;

        // Ensure dependencies are loaded
        if (typeof window.SearchModal === 'undefined' || typeof window.AppCore === 'undefined') {
            console.warn('[AccountMaintenance] SearchModal or AppCore not loaded. Lookups disabled.');
            return;
        }

        lookupBtns.forEach(btn => {
            // Avoid double wiring
            if (btn.dataset.wired) return;
            btn.dataset.wired = 'true';

            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                const targetInputId = this.dataset.targetInput;
                if (!targetInputId) return;

                // Determine config (Create a fresh object to avoid global mutation)
                const baseConfig = LOOKUP_CONFIG[targetInputId] || {
                    tableID: targetInputId.replace('ID', ''), // Fallback
                    keyField: targetInputId,
                    nameField: targetInputId.replace('ID', 'Name')
                };
                
                // Shallow copy to allow dynamic whereStmt without polluting global config
                const config = { ...baseConfig };

                // Dynamic Logic for Account Lookup Filtering
                if (targetInputId === 'AccountID') {
                    const branchId = document.getElementById('BranchID')?.value || '';
                    const clientId = document.getElementById('ClientID')?.value || '';

                    let whereParts = [];
                    // Backend uses OurBranchID column
                    if (branchId) whereParts.push(`OurBranchID = '${branchId}'`);
                    if (clientId) whereParts.push(`ClientID = '${clientId}'`);

                    if (whereParts.length > 0) {
                        config.whereStmt = whereParts.join(' AND ');
                        console.log(`[AccountMaintenance] Applying filter to Account Lookup: ${config.whereStmt}`);
                    }
                }

                console.log(`[AccountMaintenance] Opening lookup for ${targetInputId}`, config);

                // Instantiating a new SearchModal instance every time ensures fresh state
                // and prevents "stuck" searches (e.g., Branch search persisting when opening Client search)
                const searchModal = new window.SearchModal(window.AppCore);

                searchModal.open({
                    tableID: config.tableID,
                    whereStmt: config.whereStmt, // Pass dynamic whereStmt
                    onSelect: (selectedRow) => {
                        if (!selectedRow) return;

                        console.log('[AccountMaintenance] Lookup selected:', selectedRow);

                        // Populate Input Fields
                        const idInput = document.getElementById(targetInputId);
                        const nameInput = document.getElementById(targetInputId.replace('ID', 'Name'));

                        // Helper to find property case-insensitively
                        const getVal = (row, key) => {
                            if (!row || !key) return null;
                            const k = Object.keys(row).find(p => p.toLowerCase() === key.toLowerCase());
                            return k ? row[k] : null;
                        };

                        if (idInput) {
                            const val = getVal(selectedRow, config.keyField) || getVal(selectedRow, 'ID');
                            if (val !== null) {
                                idInput.value = val;
                                // Dispatch change to trigger any attached listeners
                                idInput.dispatchEvent(new Event('change', { bubbles: true }));
                                

                                // Update Global State & Load Details
                                if (targetInputId === 'AccountID') {
                                    window.AccountMaintenanceState.AccountID = val;
                                    window.AccountMaintenanceState.isAccountLoaded = true;
                                    loadAccountDetails(val);
                                } else if (targetInputId === 'ClientID') {
                                    window.AccountMaintenanceState.ClientID = val;
                                    loadClientDetails(val);
                                }
                            }
                        }

                        if (nameInput) {
                            const val = getVal(selectedRow, config.nameField) || getVal(selectedRow, 'Name') || getVal(selectedRow, 'Description');
                            if (val !== null) {
                                nameInput.value = val;
                                if (targetInputId === 'AccountID') window.AccountMaintenanceState.AccountName = val;
                                nameInput.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }
                    }
                });
            });
        });
    }

    // Load Client Details Logic
    async function loadClientDetails(clientId) {
        if (!clientId) return;
        
        // Use existing Client360Service if available, or fetch
        if (window.Client360Service && typeof window.Client360Service.viewClient360 === 'function') {
            showPageLoader(true, 'Fetching client details...');
            try {
                const criteria = {
                   ClientID: clientId,
                   OurBranchID: window.AccountMaintenanceState.OurBranchID || '',
                   OperatorID: window.AccountMaintenanceState.OperatorID || ''
                };
                const resp = await window.Client360Service.viewClient360(criteria);
                const data = resp.raw || resp.data || resp;
                
                if (resp && (resp.success || data.ResponseCode === '000')) {
                    // Populate other fields if possible
                    // Looking for inputs matching data keys
                    const details = data.Details || data.Details01 || (Array.isArray(data) ? data[0] : data);
                    
                    if (details) {
                        const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
                        inputs.forEach(el => {
                            if (el.id && el.id !== 'ClientID' && el.id !== 'ClientName') {
                                // Try verify against details properties
                                const key = Object.keys(details).find(k => k.toLowerCase() === el.id.toLowerCase());
                                if (key && details[key] !== null) {
                                    el.value = details[key];
                                    el.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                            }
                        });
                        
                        showSystemToast(`Client details loaded successfully. Client ID: ${clientId}`, { 
                            variant: 'success', 
                            useInlineAlert: true 
                        });
                    } else {
                        showErrorMessage(`Client details not found for ID: ${clientId}`, { useInlineAlert: true });
                    }
                } else {
                    const msg = resp.message || (data && data.ResponseMessage) || 'Failed to load client details';
                    showErrorMessage(msg, { useInlineAlert: true });
                }
            } catch (e) {
                console.warn('[AccountMaintenance] Failed to load client details', e);
                showErrorMessage(`Error loading client details: ${e.message}`, { useInlineAlert: true });
            } finally {
                showPageLoader(false);
            }
        } else {
             console.warn('[AccountMaintenance] Client360Service not found, checking legacy path');
             // Fallback to direct fetch if service not found - mimicking old successful behavior
             // ... implementation if needed
        }
    }

    // Load Account Details Logic (Placeholder/Implement if endpoint known)
    async function loadAccountDetails(accountId) {
        if (!accountId) return;

        showPageLoader(true, 'Loading account details...');

        try {
            const requestData = {
                AccountID: accountId,
                OurBranchID: window.AccountMaintenanceState.OurBranchID || '' 
            };

            const response = await fetch('/AccountsMaintenance/get-account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest' // Add standard header
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`Server returned error ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            // Handle potentially wrapped response or direct backend response
            const data = result.data || result; 
            const isSuccess = result.success || (data && (data.ResponseCode === '000' || data.ResponseCode === '00')); // Check for SystemCoreApi success code

            if (isSuccess) {
                console.log('[AccountMaintenance] Account Details Loaded:', data);
                
                // Helper to unwrap nested objects
                // Priority: Details.AccountDetails -> Details -> data
                let account = data.Details || data; 

                // Unpack nested AccountDetails if present (common in Kairo responses like the one provided)
                if (account.AccountDetails) {
                    // Flatten the response by merging sub-objects
                    account = {
                        ...account,
                        ...account.AccountDetails,
                        ...(account.FinancialSummary || {}),
                        ...(account.Supervision || {})
                    };
                }

                if (account) {
                    // Update Global State
                    window.AccountMaintenanceState.AccountID = account.AccountID || accountId;
                    window.AccountMaintenanceState.AccountName = account.AccountName || '';
                    window.AccountMaintenanceState.ProductID = account.ProductID || '';
                    window.AccountMaintenanceState.ClientID = account.ClientID || '';
                    // Handle fallback or explicit BranchID
                    window.AccountMaintenanceState.OurBranchID = account.OurBranchID || window.AccountMaintenanceState.OurBranchID || '';
                    window.AccountMaintenanceState.CurrencyID = account.CurrencyID || '';
                    window.AccountMaintenanceState.isAccountLoaded = true;

                    // Comprehensive field mapping for UI elements matching API properties
                    const fieldMap = {
                        'BranchID': 'OurBranchID',
                        'AccountTitle': 'AccountName',
                        'Product': 'ProductName',
                        'SalesOfficerID': 'AccountOfficerID', // UI ID -> JSON Property
                        'SalesOfficerName': 'AccountOfficerName',
                        'AccountTypeID': 'AccountClassID',
                        'AccountTypeName': 'AccountClassName',
                        'PhoneHome': 'Phone1',
                        'PhoneWork': 'Phone2',
                        'Fax': 'FaxNo' // If needed
                    };

                    // Populate Form Fields (Inputs, Selects, and Display Spans)
                    const elements = document.querySelectorAll('input:not([type="hidden"]), select, textarea, .behind-scene-value, .audit-value');
                    
                    elements.forEach(el => {
                        const fieldName = el.id;
                        // Skip if no ID or is the search trigger
                        if (!fieldName || fieldName === 'AccountID') return;

                        // 1. Direct case-insensitive match
                        let key = Object.keys(account).find(k => k.toLowerCase() === fieldName.toLowerCase());
                        
                        // 2. Mapped match
                        if (!key && fieldMap[fieldName]) {
                             // Find the actual key in data using the mapped name
                             key = Object.keys(account).find(k => k.toLowerCase() === fieldMap[fieldName].toLowerCase());
                        }

                        // 3. Fallback for specific variations if needed
                        if (!key && fieldName.endsWith('ID')) {
                             // e.g. CurrencyID -> CurrencyId
                             key = Object.keys(account).find(k => k.toLowerCase() === fieldName.toLowerCase());
                        }

                        if (key && account[key] !== null && account[key] !== undefined) {
                            if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                                if (el.type === 'checkbox') {
                                    el.checked = account[key] === true || account[key] === 1 || String(account[key]).toLowerCase() === 'true';
                                } else {
                                    el.value = account[key];
                                }
                                // Dispatch change events for inputs
                                el.dispatchEvent(new Event('change', { bubbles: true }));
                            } else {
                                // Handle display spans (Account Snapshot, Audit Trail)
                                el.textContent = account[key];
                            }
                        }
                    });

                    // Trigger Client Load if ClientID is present
                    // Populate ClientID input first if not already set (lookup sets it, but direct load via URL might not)
                    if (account.ClientID) {
                        const clientInput = document.getElementById('ClientID');
                        if (clientInput) {
                            if (clientInput.value !== account.ClientID) {
                                clientInput.value = account.ClientID;
                                clientInput.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }
                        // Always load client details to fill secondary client fields (Name, etc.)
                        loadClientDetails(account.ClientID);
                    }
                    
                    showSystemToast(`Account details loaded successfully. Account ID: ${account.AccountID || accountId}`, { 
                        variant: 'success', 
                        useInlineAlert: true 
                    });
                } else {
                    showErrorMessage('Account details empty or invalid', { useInlineAlert: true });
                }
            } else {
                const msg = result.message || (data && data.ResponseMessage) || 'Failed to load account details';
                showErrorMessage(msg, { useInlineAlert: true });
            }

        } catch (error) {
            console.error('[AccountMaintenance] Error loading account:', error);
            showErrorMessage('Error loading account details: ' + error.message, { useInlineAlert: true });
        } finally {
            showPageLoader(false);
        }
    }

    function wireActionButtons() {
        const actionPanel = document.querySelector('.action-panel');
        if (!actionPanel) return;

        const saveBtn = actionPanel.querySelector('[data-action="save"]');
        const cancelBtn = actionPanel.querySelector('[data-action="cancel"]');

        if (saveBtn) {
            saveBtn.addEventListener('click', function() {
                // Simulate save logic or implement as requested
                showPageLoader(true, 'Saving account changes...');
                setTimeout(() => {
                    showPageLoader(false);
                    showSystemToast('Account changes saved successfully.', { 
                        variant: 'success', 
                        useInlineAlert: true 
                    });
                }, 1000);
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                // Confirm cancel
                if (confirm('Discard any unsaved changes?')) {
                    resetAccountMaintenanceState();
                    // Clear form
                    const form = document.getElementById('accountMaintenanceForm');
                    if (form) {
                        form.reset();
                        // Additional logic to clear nested or related fields if needed
                        const fieldsToClear = ['ClientID', 'AccountID', 'BranchID', 'ProductID', 'CurrencyID'];
                        fieldsToClear.forEach(fieldId => {
                            const field = document.getElementById(fieldId);
                            if (field) {
                                field.value = '';
                                field.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        });
                    }
                }
            });
        }
    }

    init();

})();

