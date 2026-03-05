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

        if (options.useInlineAlert) {
            // Check if we already have this same message displayed to avoid duplicate banners
            const container = document.getElementById('accountMaintenanceAlertContainer');
            if (container && container.innerText.includes(message)) {
                console.log(`[Notification] Skipping duplicate alert: ${message}`);
                return;
            }
            showInlineAlert(message, variant);
            return; // Explicitly return to prevent the bubble from also appearing
        }

        if (window.AppCore && typeof window.AppCore.showNotification === 'function') {
            window.AppCore.showNotification(message, variant);
            return;
        }

        // 3. Fallback: Try global toastr if available
        if (window.toastr && typeof window.toastr[variant] === 'function') {
            window.toastr[variant](message);
            return;
        }

        // 4. Last resort - Centralized NotificationService (Client 360 style)
        if (window.NotificationService && typeof window.NotificationService.showToast === 'function') {
            window.NotificationService.showToast(message, variant);
            return;
        }

        // 4. Final Fallback to console
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

    function showInlineAlert(message, variant) {
        // Target the persistent container at the top of form-content
        const container = document.getElementById('accountMaintenanceAlertContainer');

        if (!container) {
            // Fallback for submodules or cases where the main container is missing
            if (window.AppCore && typeof window.AppCore.showNotification === 'function') {
                window.AppCore.showNotification(message, variant);
            } else {
                console.log(`[${variant.toUpperCase()}] ${message}`);
            }
            return;
        }

        // Remove existing alerts to prevent stacking multiple banners
        container.innerHTML = '';

        const alertDiv = document.createElement('div');
        const alertClass = variant === 'success' ? 'alert-success' : 
                          variant === 'error' ? 'alert-danger' : 
                          variant === 'warning' ? 'alert-warning' : 'alert-info';

        const iconClass = variant === 'success' ? 'bi-check-circle' : 
                         variant === 'error' ? 'bi-exclamation-octagon' : 
                         variant === 'warning' ? 'bi-exclamation-triangle' : 'bi-info-circle';

        alertDiv.className = `alert ${alertClass} fade show kairo-inline-alert`;
        alertDiv.role = 'alert';
        alertDiv.style.marginTop = '8px';
        alertDiv.style.marginBottom = '8px';
        alertDiv.style.padding = '0.35rem 0.75rem'; // Narrow strip style
        alertDiv.style.display = 'flex';
        alertDiv.style.alignItems = 'center';
        alertDiv.style.borderWidth = '1px'; 
        alertDiv.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; 
        alertDiv.style.minHeight = 'auto';

        alertDiv.innerHTML = `
            <i class="bi ${iconClass} me-2" style="font-size: 1.1rem;"></i>
            <div style="font-weight: 600; font-size: 13px; line-height: 1.2; flex: 1;">${message}</div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" style="padding: 0.5rem; font-size: 0.65rem; margin: 0;"></button>
        `;

        // Insert into container
        container.appendChild(alertDiv);

        // AUTO-DISMISS REMOVED: Banner stays until user clicks 'X'.
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

                    // Wire up lookup buttons in the loaded submodule
                    wireLookups();

                    // Special Handling for migrated modules with 'init' method
                    if (submoduleName === 'AccountActivation' && window.AccountActivationModule && window.AccountActivationModule.init) {
                        window.AccountActivationModule.init();
                    }
                    if (submoduleName === 'Signatories' && window.AccountSignatoriesModule && window.AccountSignatoriesModule.init) {
                        window.AccountSignatoriesModule.init();
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
        
        // Special action panel for Signatories module
        if (submoduleName === 'Signatories') {
            newButtonsHtml = `
                <button class="btn-action" type="button" id="submoduleBtnSignature"><i class="bi bi-vector-pen me-1"></i>Signature</button>
                <button class="btn-action" type="button" id="submoduleBtnPhoto"><i class="bi bi-camera me-1"></i>Photo</button>
                <button class="btn-action" type="button" id="submoduleBtnBoth"><i class="bi bi-files me-1"></i>Both</button>
                <div class="spacer"></div>
                <button class="btn-action" type="button" id="submoduleBtnAdd"><i class="bi bi-plus-circle me-1"></i>Add</button>
                <button class="btn-action" type="button" id="submoduleBtnEdit"><i class="bi bi-pencil-square me-1"></i>Edit</button>
                <button class="btn-action btn-save" type="button" id="submoduleBtnSave"><i class="bi bi-check-lg me-1"></i>Save</button>
                <button class="btn-action btn-cancel" type="button" id="submoduleBtnCancel"><i class="bi bi-x-circle me-1"></i>Cancel</button>
            `;
        } else {
            // Define standard buttons for other submodules
            newButtonsHtml = `
                <button class="btn-action btn-view" type="button" id="submoduleBtnView"><i class="bi bi-eye me-1"></i>View</button>
                <button class="btn-action" type="button" id="submoduleBtnEdit"><i class="bi bi-pencil-square me-1"></i>Edit</button>
                <button class="btn-action" type="button" id="submoduleBtnSave"><i class="bi bi-check-lg me-1"></i>Save</button>
                <button class="btn-action btn-cancel" type="button" id="submoduleBtnCancel"><i class="bi bi-x-circle me-1"></i>Cancel</button>
                <button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose"><i class="bi bi-box-arrow-right me-1"></i>Close</button>
            `;
        }

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

            // Signatories module: AccountSignatoriesModule.init() binds directly
            // to the parent action panel buttons by ID (uses cloneNode to replace
            // any listeners). No proxy wiring needed here.
            if (submoduleName === 'Signatories') {
                // The module script has already executed and wired everything.
                // Just re-trigger wireLookups so the lookup buttons get connected.
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
        // PascalCase field names (used in main screen)
        'BranchID': { tableID: 'BranchID', keyField: 'BranchID', nameField: 'BranchName' },
        'ClientID': { tableID: 'ClientID', keyField: 'ClientID', nameField: 'ClientName' },
        'ProductID': { tableID: 'ProductID', keyField: 'ProductID', nameField: 'ProductName' },
        'AccountID': { tableID: 'AccountID', keyField: 'AccountID', nameField: 'AccountName' },
        'LiquidationAccountID': { tableID: 'AccountID', keyField: 'AccountID', nameField: 'AccountName' },
        'SalesOfficerID': { tableID: 'OfficerID', keyField: 'OfficerID', nameField: 'OfficerName' },
        'PassbookSerialID': { tableID: 'PassbookSerialID', keyField: 'SerialID', nameField: 'SerialName' },
        // camelCase field names (used in child pages)
        'branchId': { tableID: 'BranchID', keyField: 'BranchID', nameField: 'BranchName' },
        'accountId': { tableID: 'AccountID', keyField: 'AccountID', nameField: 'AccountName' },
        'clientId': { tableID: 'ClientID', keyField: 'ClientID', nameField: 'ClientName' },
        'productId': { tableID: 'ProductID', keyField: 'ProductID', nameField: 'ProductName' },
        'nomineeId': { tableID: 'ClientID', keyField: 'ClientID', nameField: 'ClientName' },
        'signatoryId': { tableID: 'ClientID', keyField: 'ClientID', nameField: 'ClientName' },
        'groupId': { tableID: 'GroupID', keyField: 'GroupID', nameField: 'GroupName' },
        'chargeId': { tableID: 'ChargeID', keyField: 'ChargeID', nameField: 'ChargeName' },
        'requestRef': { tableID: 'StopPaymentID', keyField: 'RequestRef', nameField: 'Description' },
        'referenceId': { tableID: 'FreezeID', keyField: 'ReferenceID', nameField: 'Description' },
        'reminderId': { tableID: 'ReminderID', keyField: 'ReminderID', nameField: 'Description' },
        'transactionId': { tableID: 'TransactionID', keyField: 'TransactionID', nameField: 'Description' },
        'accountTransferId': { tableID: 'AccountID', keyField: 'AccountID', nameField: 'AccountName' },
        'txnAccountId': { tableID: 'AccountID', keyField: 'AccountID', nameField: 'AccountName' },
        'payableAt': { tableID: 'BranchID', keyField: 'BranchID', nameField: 'BranchName' }
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

                // Support both data-target-input (main screen) and data-lookup (child pages)
                const targetInputId = this.dataset.targetInput || this.dataset.lookup;
                if (!targetInputId) return;

                // Determine config (Create a fresh object to avoid global mutation)
                const baseConfig = LOOKUP_CONFIG[targetInputId] || {
                    tableID: targetInputId.replace(/Id$/i, '').replace(/ID$/i, ''), // Fallback
                    keyField: targetInputId,
                    nameField: targetInputId.replace(/Id$/i, 'Name').replace(/ID$/i, 'Name')
                };
                
                // Shallow copy to allow dynamic whereStmt without polluting global config
                const config = { ...baseConfig };

                // Dynamic Logic for Account Lookup Filtering
                if (config.tableID === 'AccountID') {
                    // Support both PascalCase (BranchID) and camelCase (branchId)
                    const branchId = document.getElementById('BranchID')?.value || document.getElementById('branchId')?.value || '';
                    const clientId = document.getElementById('ClientID')?.value || document.getElementById('clientId')?.value || '';

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

                        // Helper to find property case-insensitively
                        const getVal = (row, key) => {
                            if (!row || !key) return null;
                            const k = Object.keys(row).find(p => p.toLowerCase() === key.toLowerCase());
                            return k ? row[k] : null;
                        };

                        // Find the ID input
                        const idInput = document.getElementById(targetInputId);

                        // Find the Name input - handle both branchId -> branchName and BranchID -> BranchName
                        const nameInputId = targetInputId.replace(/Id$/i, 'Name').replace(/ID$/, 'Name');
                        const nameInput = document.getElementById(nameInputId) ||
                            (idInput && idInput.closest('[data-kairo-branch-control], [data-kairo-account-control], [data-kairo-client-control], [data-kairo-product-control], [data-kairo-user-control], [data-kairo-control]')?.querySelector('[class*="__name"]'));

                        if (idInput) {
                            const val = getVal(selectedRow, config.keyField) || getVal(selectedRow, 'ID');
                            if (val !== null) {
                                idInput.value = val;
                                // Dispatch change to trigger any attached listeners
                                idInput.dispatchEvent(new Event('change', { bubbles: true }));
                                idInput.dispatchEvent(new Event('blur', { bubbles: true }));

                                // Update Global State & Load Details (for main screen lookups)
                                if (targetInputId === 'AccountID') {
                                    window.AccountMaintenanceState.AccountID = val;
                                    window.AccountMaintenanceState.isAccountLoaded = true;
                                    loadAccountDetails(val);
                                } else if (targetInputId === 'ClientID') {
                                    window.AccountMaintenanceState.ClientID = val;
                                    // In ADD mode, check if both Client and Product are selected before auto-populating
                                    checkAndAutoPopulateClientDetails();
                                } else if (targetInputId === 'ProductID') {
                                    window.AccountMaintenanceState.ProductID = val;
                                    
                                    // Extract CurrencyID and MinimumBalance from product selection
                                    // and populate Account Snapshot fields
                                    const currencyId = getVal(selectedRow, 'CurrencyID');
                                    const minimumBalance = getVal(selectedRow, 'MinimumBalance');
                                    
                                    if (currencyId !== null) {
                                        const currencyEl = document.getElementById('CurrencyID');
                                        if (currencyEl) {
                                            currencyEl.textContent = currencyId;
                                            console.log('[AccountMaintenance] Set CurrencyID from Product:', currencyId);
                                        }
                                        window.AccountMaintenanceState.CurrencyID = currencyId;
                                    }
                                    
                                    if (minimumBalance !== null) {
                                        const minBalEl = document.getElementById('MinimumBalance');
                                        if (minBalEl) {
                                            // Format as currency if available
                                            const formatted = typeof minimumBalance === 'number' 
                                                ? minimumBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                : minimumBalance;
                                            minBalEl.textContent = formatted;
                                            console.log('[AccountMaintenance] Set MinimumBalance from Product:', formatted);
                                        }
                                        window.AccountMaintenanceState.MinimumBalance = minimumBalance;
                                    }
                                    
                                    // In ADD mode, check if both Client and Product are selected before auto-populating
                                    checkAndAutoPopulateClientDetails();
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

        console.log(`[AccountMaintenance] Wired ${lookupBtns.length} lookup buttons`);
    }

    /**
     * Check if both Client and Product are selected, then auto-populate client details
     * Only triggers in ADD mode
     */
    function checkAndAutoPopulateClientDetails() {
        // Only auto-populate in ADD mode
        if (currentMode !== 'ADD') {
            console.log('[AccountMaintenance] Not in ADD mode, skipping auto-populate');
            return;
        }

        const clientId = document.getElementById('ClientID')?.value || window.AccountMaintenanceState.ClientID;
        const productId = document.getElementById('ProductID')?.value || window.AccountMaintenanceState.ProductID;

        console.log('[AccountMaintenance] Checking auto-populate conditions:', { clientId, productId, mode: currentMode });

        if (clientId && productId) {
            console.log('[AccountMaintenance] Both Client and Product selected, fetching client details...');
            loadClientDetails(clientId);
        } else {
            if (!clientId) {
                console.log('[AccountMaintenance] Waiting for Client selection...');
            }
            if (!productId) {
                console.log('[AccountMaintenance] Waiting for Product selection...');
            }
        }
    }

    /**
     * Load Client Details for Account Creation (auto-populate)
     * Uses the /AccountsMaintenance/get-client-basic-details endpoint
     * @param {string} clientId - The ClientID to fetch details for
     */
    async function loadClientDetails(clientId) {
        if (!clientId) return;
        
        // Only auto-populate in ADD mode to avoid overwriting existing account data
        const isAddMode = currentMode === 'ADD';
        
        showPageLoader(true, 'Fetching client details...');
        
        try {
            const requestData = {
                ClientID: clientId,
                OurBranchID: window.AccountMaintenanceState.OurBranchID || sessionStorage.getItem('branch_code') || '',
                OperatorID: sessionStorage.getItem('UserId') || sessionStorage.getItem('user_name') || ''
            };

            console.log('[AccountMaintenance] Fetching client basic details:', requestData);

            const response = await fetch('/AccountsMaintenance/get-client-basic-details', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`Server returned error ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            const data = result.data || result;
            const isSuccess = result.success || (data && (data.ResponseCode === '00' || data.ResponseCode === '000'));

            if (isSuccess) {
                // Get the client details - could be array or single object
                const details = Array.isArray(data.Details) ? data.Details[0] : (data.Details || data);

                if (details) {
                    console.log('[AccountMaintenance] Client details received:', details);

                    // Update ClientName field
                    const clientNameInput = document.getElementById('ClientName');
                    if (clientNameInput) {
                        clientNameInput.value = details.Name || `${details.FirstName || ''} ${details.MiddleName || ''} ${details.LastName || ''}`.trim();
                    }

                    // In ADD mode, populate AccountName with client name as default
                    if (isAddMode) {
                        const accountNameInput = document.getElementById('AccountName');
                        if (accountNameInput) {
                            accountNameInput.value = details.Name || `${details.FirstName || ''} ${details.MiddleName || ''} ${details.LastName || ''}`.trim();
                        }

                        // Populate ShortName with first name or abbreviated
                        const shortNameInput = document.getElementById('ShortName');
                        if (shortNameInput && !shortNameInput.value) {
                            shortNameInput.value = details.FirstName || (details.Name || '').substring(0, 20);
                        }
                    }

                    // Populate all account detail fields if available and in ADD mode
                    // Map API field names to form field IDs
                    const fieldMappings = {
                        // Text input fields
                        'Address1': ['Address1'],
                        'Address2': ['Address2'],
                        'PhoneHome': ['Phone1', 'PhoneHome'],   // API may return Phone1 or PhoneHome
                        'PhoneWork': ['Phone2', 'PhoneWork'],   // API may return Phone2 or PhoneWork
                        'FaxNo': ['Fax'],
                        'Mobile': ['Mobile', 'MobileNo'],
                        'EmailID': ['Email', 'EmailID'],
                        'ContactPerson': ['ContactPerson']
                    };

                    // Populate input fields
                    Object.entries(fieldMappings).forEach(([formFieldId, apiFields]) => {
                        const input = document.getElementById(formFieldId);
                        if (input && isAddMode) {
                            // Try each API field name until we find a value
                            for (const apiField of apiFields) {
                                if (details[apiField] !== null && details[apiField] !== undefined && details[apiField] !== '') {
                                    input.value = details[apiField];
                                    console.log(`[AccountMaintenance] Populated ${formFieldId} from ${apiField}:`, details[apiField]);
                                    break;
                                }
                            }
                        }
                    });

                    // Handle SELECT dropdown fields (City, Country)
                    if (isAddMode) {
                        // CityID dropdown
                        const citySelect = document.getElementById('CityID');
                        if (citySelect && details.CityID) {
                            citySelect.value = details.CityID;
                            citySelect.dispatchEvent(new Event('change', { bubbles: true }));
                            console.log('[AccountMaintenance] Set CityID:', details.CityID);
                        }

                        // CountryID dropdown
                        const countrySelect = document.getElementById('CountryID');
                        if (countrySelect && details.CountryID) {
                            countrySelect.value = details.CountryID;
                            countrySelect.dispatchEvent(new Event('change', { bubbles: true }));
                            console.log('[AccountMaintenance] Set CountryID:', details.CountryID);
                        }
                    }

                    showSystemToast(`Client details loaded: ${details.Name || clientId}. You can now edit the Account Name.`, { 
                        variant: 'success', 
                        useInlineAlert: true 
                    });

                    // In ADD mode, focus on AccountName to allow editing
                    if (isAddMode) {
                        // Use setTimeout to ensure DOM updates are complete
                        setTimeout(() => {
                            const accountNameInput = document.getElementById('AccountName');
                            if (accountNameInput) {
                                accountNameInput.focus();
                                accountNameInput.select(); // Select the text so user can easily replace or edit
                                // Also remove readonly/disabled if present
                                accountNameInput.readOnly = false;
                                accountNameInput.disabled = false;
                                console.log('[AccountMaintenance] AccountName field focused and ready for editing');
                            }
                        }, 100);
                    }
                } else {
                    console.warn('[AccountMaintenance] No client details in response');
                    showErrorMessage(`Client details not found for ID: ${clientId}`, { useInlineAlert: true });
                }
            } else {
                const msg = result.message || data?.ResponseMessage || 'Failed to load client details';
                showErrorMessage(msg, { useInlineAlert: true });
            }
        } catch (error) {
            console.error('[AccountMaintenance] Error loading client details:', error);
            showErrorMessage(`Error loading client details: ${error.message}`, { useInlineAlert: true });
        } finally {
            showPageLoader(false);
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
                                } else if (el.tagName === 'SELECT') {
                                    // For SELECT elements, ensure the option exists before setting
                                    const value = String(account[key]);
                                    const optionExists = Array.from(el.options).some(opt => opt.value === value);
                                    
                                    if (!optionExists && value) {
                                        // Try to find a corresponding Name field for the label
                                        const nameKey = key.replace(/ID$/i, 'Name');
                                        const label = account[nameKey] || value;
                                        
                                        // Add the missing option
                                        const newOption = document.createElement('option');
                                        newOption.value = value;
                                        newOption.textContent = label;
                                        el.appendChild(newOption);
                                        console.log(`[AccountMaintenance] Added missing option to ${fieldName}: ${value} (${label})`);
                                    }
                                    
                                    el.value = value;
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

                    // Populate ClientID input if not already set
                    if (account.ClientID) {
                        const clientInput = document.getElementById('ClientID');
                        if (clientInput) {
                            if (clientInput.value !== account.ClientID) {
                                clientInput.value = account.ClientID;
                                clientInput.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }
                        // Set ClientName from account data (if available)
                        const clientNameInput = document.getElementById('ClientName');
                        if (clientNameInput && account.ClientName) {
                            clientNameInput.value = account.ClientName;
                        }
                        // Note: loadClientDetails is only called in ADD mode via checkAndAutoPopulateClientDetails
                    }
                    
                    showSystemToast(`Account details loaded successfully. Account ID: ${account.AccountID || accountId}`, { 
                        variant: 'success', 
                        useInlineAlert: true 
                    });

                    // Update button states after successful load
                    updateButtonStates();
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

    // ============================================================================
    // ACCOUNT CREATE / UPDATE LOGIC
    // ============================================================================

    /**
     * Collect all form data from the main account maintenance form
     * @returns {Object} Form data object
     */
    function collectAccountFormData() {
        const formData = {};
        
        // Define the fields to collect (matching form input IDs)
        const fields = [
            // Key identifiers
            'AccountID', 'BranchID', 'ClientID', 'ProductID',
            // Account details  
            'AccountName', 'ShortName', 
            // Address
            'Address1', 'Address2', 'CityID', 'CountryID',
            // Contact
            'PhoneHome', 'PhoneWork', 'FaxNo', 'Mobile', 'EmailID', 'ContactPerson',
            // Operating
            'OperatingModeID', 'OperatingInstructions',
            // Classification
            'AccountClassID', 'AccountOfficerID', 'LiquidationAccountID', 'SalesOfficerID',
            // Passbook
            'PassbookSerialID'
        ];

        fields.forEach(fieldId => {
            const el = document.getElementById(fieldId);
            if (el) {
                formData[fieldId] = el.value || '';
            }
        });

        // Handle checkbox separately
        const exemptPassbook = document.getElementById('ExemptPassBook');
        if (exemptPassbook) {
            formData.ExemptPassBook = exemptPassbook.checked;
        }

        // Map UI field names to API field names where different
        formData.OurBranchID = formData.BranchID || '';
        formData.Phone1 = formData.PhoneHome || '';
        formData.Phone2 = formData.PhoneWork || '';
        
        // Map AccountName to Name for database (t_AccountCustomer expects Name column)
        formData.Name = formData.AccountName || '';

        // Add ModifiedBy/CreatedBy from session (required for update/create)
        const operatorId = sessionStorage.getItem('UserId') || 
                           sessionStorage.getItem('UserID') || 
                           sessionStorage.getItem('OperatorID') || 
                           sessionStorage.getItem('operatorId') ||
                           window.AccountMaintenanceState.OperatorID || '';
        formData.ModifiedBy = operatorId;
        formData.CreatedBy = operatorId;

        // Add OpenedBy and OpenedDate for account creation (not nullable)
        formData.OpenedBy = operatorId;
        formData.OpenedDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

        return formData;
    }

    /**
     * Validate required fields before save
     * @param {Object} formData - The collected form data
     * @param {boolean} isCreate - Whether this is a create (true) or update (false)
     * @returns {Object} { isValid: boolean, errors: string[] }
     */
    function validateAccountForm(formData, isCreate) {
        const errors = [];

        if (isCreate) {
            // For create: require ClientID, ProductID, and AccountName
            if (!formData.ClientID) errors.push('Client ID is required');
            if (!formData.ProductID) errors.push('Product ID is required');
            if (!formData.AccountName && !formData.Name) errors.push('Account Name is required');
        } else {
            // For update: require AccountID and AccountName
            if (!formData.AccountID) errors.push('Account ID is required');
            if (!formData.AccountName && !formData.Name) errors.push('Account Name is required');
        }

        // Common validations
        if (!formData.OurBranchID && !formData.BranchID) {
            errors.push('Branch ID is required');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Create a new account
     */
    async function createAccount() {
        const formData = collectAccountFormData();
        
        // Validate for create
        const validation = validateAccountForm(formData, true);
        if (!validation.isValid) {
            showErrorMessage('Validation failed: ' + validation.errors.join(', '), { useInlineAlert: true });
            return;
        }

        showPageLoader(true, 'Creating account...');

        try {
            const response = await fetch('/AccountsMaintenance/create-account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`Server returned error ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            const data = result.data || result;
            const isSuccess = result.success || (data && (data.ResponseCode === '000' || data.ResponseCode === '00'));

            if (isSuccess) {
                const newAccountId = data.AccountID || data.Details?.AccountID || '';
                
                showSystemToast(`Account created successfully. Account ID: ${newAccountId}`, {
                    variant: 'success',
                    useInlineAlert: true
                });

                // If we got a new AccountID, load it
                if (newAccountId) {
                    const accountIdInput = document.getElementById('AccountID');
                    if (accountIdInput) {
                        accountIdInput.value = newAccountId;
                        accountIdInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    // Load the newly created account
                    await loadAccountDetails(newAccountId);
                }

                // Switch back to VIEW mode
                currentMode = 'VIEW';
            } else {
                const msg = result.message || data?.ResponseMessage || 'Failed to create account';
                showErrorMessage(msg, { useInlineAlert: true });
            }
        } catch (error) {
            console.error('[AccountMaintenance] Error creating account:', error);
            showErrorMessage('Error creating account: ' + error.message, { useInlineAlert: true });
        } finally {
            showPageLoader(false);
        }
    }

    /**
     * Update an existing account
     */
    async function updateAccount() {
        const formData = collectAccountFormData();
        
        // Validate for update
        const validation = validateAccountForm(formData, false);
        if (!validation.isValid) {
            showErrorMessage('Validation failed: ' + validation.errors.join(', '), { useInlineAlert: true });
            return;
        }

        showPageLoader(true, 'Updating account...');

        try {
            const response = await fetch('/AccountsMaintenance/update-account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`Server returned error ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            const data = result.data || result;
            const isSuccess = result.success || (data && (data.ResponseCode === '000' || data.ResponseCode === '00'));

            if (isSuccess) {
                // Reload account to get fresh data first (this will show its own toast)
                await loadAccountDetails(formData.AccountID);

                // Switch back to VIEW mode
                currentMode = 'VIEW';

                // Show success notification AFTER reload so it doesn't get overwritten
                showSystemToast(`Account updated successfully. Account ID: ${formData.AccountID}`, {
                    variant: 'success',
                    useInlineAlert: true
                });
            } else {
                const msg = result.message || data?.ResponseMessage || 'Failed to update account';
                showErrorMessage(msg, { useInlineAlert: true });
            }
        } catch (error) {
            console.error('[AccountMaintenance] Error updating account:', error);
            showErrorMessage('Error updating account: ' + error.message, { useInlineAlert: true });
        } finally {
            showPageLoader(false);
        }
    }

    /**
     * Save account - determines whether to create or update based on mode
     */
    async function saveAccount() {
        if (currentMode === 'ADD') {
            await createAccount();
        } else {
            // Default to update if account is loaded
            if (window.AccountMaintenanceState.isAccountLoaded && window.AccountMaintenanceState.AccountID) {
                await updateAccount();
            } else {
                showErrorMessage('No account loaded. Please load an account first or use Add to create a new one.', { useInlineAlert: true });
            }
        }
    }

    /**
     * Clear the form for adding a new account
     */
    function clearFormForAdd() {
        // Reset global state first (this sets currentMode = 'VIEW')
        resetAccountMaintenanceState();
        
        // Then set to ADD mode AFTER reset
        currentMode = 'ADD';

        // Clear all form fields
        const fieldsToClear = [
            'AccountID', 'AccountName', 'ShortName',
            'Address1', 'Address2', 'CityID', 'CountryID',
            'PhoneHome', 'PhoneWork', 'FaxNo', 'Mobile', 'EmailID', 'ContactPerson',
            'OperatingModeID', 'OperatingInstructions',
            'AccountClassID', 'AccountOfficerID', 'LiquidationAccountID', 'LiquidationAccountName',
            'SalesOfficerID', 'SalesOfficerName', 'PassbookSerialID', 'PassbookSerialName',
            'ClientName', 'ProductName'
        ];

        fieldsToClear.forEach(fieldId => {
            const el = document.getElementById(fieldId);
            if (el) {
                if (el.tagName === 'SELECT') {
                    el.selectedIndex = 0;
                } else {
                    el.value = '';
                }
            }
        });

        // Uncheck checkbox
        const exemptPassbook = document.getElementById('ExemptPassBook');
        if (exemptPassbook) {
            exemptPassbook.checked = false;
        }

        // Clear snapshot values
        document.querySelectorAll('.behind-scene-value, .audit-value').forEach(el => {
            el.textContent = '-';
        });

        // Keep Branch (default from session) and focus on Client
        showSystemToast('Ready to add new account. Enter Client and Product to begin.', {
            variant: 'info',
            useInlineAlert: true
        });

        // Focus on ClientID input
        const clientInput = document.getElementById('ClientID');
        if (clientInput) {
            clientInput.focus();
        }

        // Update button states for ADD mode
        updateButtonStates();
    }

    /**
     * Get references to all action buttons
     */
    function getActionButtons() {
        const actionPanel = document.querySelector('.action-panel');
        if (!actionPanel) return {};
        
        return {
            view: actionPanel.querySelector('[data-action="view"]'),
            add: actionPanel.querySelector('[data-action="add"]'),
            edit: actionPanel.querySelector('[data-action="edit"]'),
            save: actionPanel.querySelector('[data-action="save"]'),
            cancel: actionPanel.querySelector('[data-action="cancel"]')
        };
    }

    /**
     * Update button states based on current mode and account state
     * Button behavior:
     * - VIEW (no account loaded): View, Add enabled; Edit, Save, Cancel disabled
     * - VIEW (account loaded): View, Add, Edit enabled; Save, Cancel disabled
     * - ADD mode: Save, Cancel enabled; View, Add, Edit disabled
     * - EDIT mode: Save, Cancel enabled; View, Add, Edit disabled
     */
    function updateButtonStates() {
        const btns = getActionButtons();
        if (!btns.view) {
            console.warn('[AccountMaintenance] No action panel found for button states');
            return;
        }
        
        const isAccountLoaded = window.AccountMaintenanceState.isAccountLoaded;
        const isAddMode = currentMode === 'ADD';
        const isEditMode = currentMode === 'EDIT';
        const isModifying = isAddMode || isEditMode;

        console.log('[AccountMaintenance] updateButtonStates:', { currentMode, isAccountLoaded, isAddMode, isEditMode, isModifying });

        // View button: enabled when not in modify mode
        if (btns.view) btns.view.disabled = isModifying;
        
        // Add button: enabled when not in modify mode
        if (btns.add) btns.add.disabled = isModifying;
        
        // Edit button: enabled only when account is loaded and not in modify mode
        if (btns.edit) btns.edit.disabled = !isAccountLoaded || isModifying;
        
        // Save button: enabled only in ADD or EDIT mode
        if (btns.save) {
            btns.save.disabled = !isModifying;
            console.log('[AccountMaintenance] Save button disabled:', btns.save.disabled);
        }
        
        // Cancel button: enabled only in ADD or EDIT mode
        if (btns.cancel) btns.cancel.disabled = !isModifying;

        // Visual feedback - add/remove active class
        Object.values(btns).forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        
        if (isAddMode && btns.add) {
            btns.add.classList.add('active');
        } else if (isEditMode && btns.edit) {
            btns.edit.classList.add('active');
        } else if (!isModifying && isAccountLoaded && btns.view) {
            btns.view.classList.add('active');
        }

        console.log('[AccountMaintenance] Button states updated:', { mode: currentMode, isAccountLoaded });
    }

    function wireActionButtons() {
        const btns = getActionButtons();
        if (!btns.view) return;

        // View button - loads account details
        if (btns.view) {
            btns.view.addEventListener('click', async function() {
                if (this.disabled) return;
                const accountId = document.getElementById('AccountID')?.value;
                if (accountId) {
                    currentMode = 'VIEW';
                    await loadAccountDetails(accountId);
                    updateButtonStates();
                } else {
                    showErrorMessage('Please enter an Account ID to view.', { useInlineAlert: true });
                }
            });
        }

        // Add button - clears form for new account
        if (btns.add) {
            btns.add.addEventListener('click', function() {
                if (this.disabled) return;
                clearFormForAdd();
                updateButtonStates();
            });
        }

        // Edit button - switches to edit mode
        if (btns.edit) {
            btns.edit.addEventListener('click', function() {
                if (this.disabled) return;
                if (window.AccountMaintenanceState.isAccountLoaded) {
                    currentMode = 'EDIT';
                    updateButtonStates();
                    enableFormFieldsForEdit();
                    showSystemToast('Edit mode enabled. Make changes and click Save.', {
                        variant: 'info',
                        useInlineAlert: true
                    });
                } else {
                    showErrorMessage('Please load an account first before editing.', { useInlineAlert: true });
                }
            });
        }

        // Save button - creates or updates account
        if (btns.save) {
            btns.save.addEventListener('click', async function() {
                if (this.disabled) return;
                await saveAccount();
                updateButtonStates();
            });
        }

        // Cancel button - discards changes
        if (btns.cancel) {
            btns.cancel.addEventListener('click', async function() {
                if (this.disabled) return;
                if (confirm('Discard any unsaved changes?')) {
                    if (window.AccountMaintenanceState.isAccountLoaded && window.AccountMaintenanceState.AccountID) {
                        // Reload the current account to discard changes
                        await loadAccountDetails(window.AccountMaintenanceState.AccountID);
                    } else {
                        // Reset form completely
                        resetAccountMaintenanceState();
                    }
                    currentMode = 'VIEW';
                    updateButtonStates();
                }
            });
        }

        // Set initial button states
        updateButtonStates();
    }

    /**
     * Enable form fields for editing
     */
    function enableFormFieldsForEdit() {
        const editableFields = [
            'AccountName', 'ShortName',
            'Address1', 'Address2', 'CityID', 'CountryID',
            'PhoneHome', 'PhoneWork', 'FaxNo', 'Mobile', 'EmailID', 'ContactPerson',
            'OperatingModeID', 'OperatingInstructions',
            'AccountClassID', 'AccountOfficerID', 'LiquidationAccountID',
            'SalesOfficerID', 'PassbookSerialID', 'ExemptPassBook'
        ];
        
        editableFields.forEach(fieldId => {
            const el = document.getElementById(fieldId);
            if (el) {
                el.disabled = false;
                el.readOnly = false;
            }
        });
    }

    init();

})();

