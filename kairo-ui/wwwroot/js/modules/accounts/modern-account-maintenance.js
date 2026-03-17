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
        isAccountJustCreated: false,
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
        OperatingInstructions: '',
        UpdateCount: 0  // For optimistic concurrency control
    };

    function resetAccountMaintenanceState() {
        window.AccountMaintenanceState = {
            isAccountLoaded: false,
            isAccountJustCreated: false,
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
            OperatingInstructions: '',
            UpdateCount: 0  // For optimistic concurrency control
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

    // ============================================================================
    // SIDEBAR FUNCTIONS (same approach as Client Maintenance)
    // ============================================================================
    
    const MODULE_ID = '1300'; // Account Maintenance module ID
    
    /**
     * Load the entire sidebar via AJAX (same as Client Maintenance)
     * This fetches server-rendered HTML from /SideBar/Index which includes
     * properly formatted recent activities with names
     */
    async function loadSidebar() {
        const sidebarContainer = document.getElementById('sidebarContainer');
        if (!sidebarContainer) {
            console.warn('[AccountMaintenance] sidebarContainer not found, falling back to loadRecentActivities');
            await loadRecentActivities();
            return;
        }
        
        try {
            console.log('[AccountMaintenance] Loading sidebar via /SideBar/Index');
            const params = new URLSearchParams({
                ModuleID: MODULE_ID,
                OurBranchID: ''
            });
            
            const response = await fetch(`/SideBar/Index?${params.toString()}`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'text/html'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load sidebar (${response.status})`);
            }
            
            const html = await response.text();
            sidebarContainer.innerHTML = html;
            
            console.log('[AccountMaintenance] Sidebar loaded successfully');
            
            // Initialize SidebarManager like Client Maintenance does
            // SidebarManager handles data-child-form click events and opens URLs in iframe
            if (window.SidebarManager && typeof window.SidebarManager.init === 'function') {
                window.SidebarManager.init({
                    moduleName: 'Account',
                    isMainRecordLoaded: window.AccountMaintenanceState?.isAccountLoaded || false,
                    primaryRecordId: window.AccountMaintenanceState?.AccountID || null
                });
                console.log('[AccountMaintenance] Initialized SidebarManager');
            }
            
            // Wire recent activities click handlers (specific to Account Maintenance)
            wireRecentActivitiesHandlers();
        } catch (error) {
            console.error('[AccountMaintenance] Error loading sidebar:', error);
            // Fallback to client-side recent activities loading
            await loadRecentActivities();
        }
    }
    
    /**
     * Wire recent activities click handlers after sidebar load
     * SidebarManager handles the submodule items; this handles Account-specific recent activities
     */
    function wireRecentActivitiesHandlers() {
        // Wire recent activities click handlers
        const recentContainer = document.querySelector('[data-recent-activities-container]');
        if (recentContainer) {
            recentContainer.querySelectorAll('[data-accessedfields]').forEach(item => {
                item.addEventListener('click', async function() {
                    const accessedFields = this.getAttribute('data-accessedfields') || '';
                    // Parse AccountID from accessedFields (format: "BranchID:xxxx,AccountID:yyyy")
                    const match = accessedFields.match(/AccountID[:\s]*([^\s,;]+)/i);
                    if (match) {
                        const accountId = match[1];
                        const accountIdInput = document.getElementById('AccountID');
                        if (accountIdInput) accountIdInput.value = accountId;
                        currentMode = 'VIEW';
                        await loadAccountDetails(accountId);
                        updateButtonStates();
                    }
                });
            });
        }
    }

    // ============================================================================
    // RECENT ACTIVITIES FUNCTIONS
    // ============================================================================
    
    /**
     * Track recent activity and refresh the sidebar
     * Uses same approach as Client Maintenance - call loadSidebar() to refresh
     * @param {string} accountId - The account ID to track
     * @param {string} accountName - The account name for display
     */
    async function addRecentActivityAndRefreshSidebar(accountId, accountName) {
        if (!accountId) return;
        
        // Get BranchID from state or input field
        // The SQL function f_GetActivityNarration expects: BranchID:xxxx,AccountID:yyyy
        // So it can call f_GetAccountName(@PARAM1, @PARAM2) where @PARAM1=BranchID, @PARAM2=AccountID
        const branchId = window.AccountMaintenanceState?.OurBranchID || 
                         document.getElementById('BranchID')?.value || '';
        
        // Format: BranchID:xxxx,AccountID:yyyy (same as modules 1300, 1600, 1800, 4000, 4300)
        const accessedFields = `BranchID:${branchId},AccountID:${accountId}`;
        
        console.log('[AccountMaintenance] Adding recent activity:', { branchId, accountId, accountName, accessedFields, moduleId: MODULE_ID });
        
        try {
            const response = await fetch('/SideBar/AddRecentActivity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    ModuleID: MODULE_ID,
                    AccessedFields: accessedFields,
                    Narration: accountName || '' // Fallback if SP doesn't populate it
                })
            });
            
            const result = await response.json();
            console.log('[AccountMaintenance] AddRecentActivity response:', result);
            
            if (response.ok) {
                const success = result.ResponseCode === '00' || result.responseCode === '00' || 
                                result.Success === true || result.success === true;
                
                if (success) {
                    console.log('[AccountMaintenance] Recent activity tracked successfully, reloading sidebar...');
                    // Reload the entire sidebar (same as Client Maintenance)
                    await loadSidebar();
                } else {
                    console.warn('[AccountMaintenance] Recent activity tracking failed:', result);
                }
            } else {
                console.warn('[AccountMaintenance] AddRecentActivity failed:', response.status, result);
            }
        } catch (error) {
            console.warn('[AccountMaintenance] Error tracking recent activity:', error);
        }
    }
    
    /**
     * Render recent activities in the sidebar
     * @param {Array} activities - Array of activity objects
     */
    function renderRecentActivities(activities) {
        // Try multiple possible selectors for the container
        let container = document.querySelector('[data-recent-activities-container]');
        if (!container) {
            container = document.getElementById('nav-recent');
        }
        
        if (!container) {
            console.warn('[AccountMaintenance] Recent activities container not found for rendering');
            return;
        }
        
        console.log('[AccountMaintenance] renderRecentActivities called with', 
            Array.isArray(activities) ? activities.length : 0, 'activities');
        
        if (!Array.isArray(activities) || activities.length === 0) {
            container.innerHTML = '<div class="sidebar-item sidebar-item--enhanced text-muted" style="padding: 8px 12px; font-size: 12px;">No recent activities</div>';
            return;
        }
        
        console.log('[AccountMaintenance] Rendering', activities.length, 'recent activities');
        
        // Remove hidden attribute so activities are visible
        container.removeAttribute('hidden');
        container.classList.add('is-visible');
        container.style.pointerEvents = 'auto';
        
        // Also expand the parent nav-section
        const parentSection = container.closest('[data-nav-section]');
        if (parentSection) {
            parentSection.classList.add('is-open', 'expanded');
            const toggle = parentSection.querySelector('.nav-arrow, .nav-arrow--card');
            if (toggle) toggle.setAttribute('aria-expanded', 'true');
        }
        
        container.innerHTML = activities.map(activity => {
            // Parse AccessedFields if it's in "AccountID:xxxx" format
            let accountId = '';
            
            if (activity.AccessedFields) {
                const match = activity.AccessedFields.match(/AccountID[:\s]*([^\s,;]+)/i);
                if (match) accountId = match[1];
            }
            
            // Fallback to direct properties
            accountId = accountId || activity.AccountID || activity.RecordID || activity.Key || '';
            
            // Get account name from Narration field (where we store it)
            const accountName = activity.Narration || activity.AccountName || activity.Description || '';
            
            // Match exact HTML structure from _SideBarPartial.cshtml (same as Client Maintenance)
            return `
                <div class="sidebar-item sidebar-item--static sidebar-item--enhanced" 
                     style="cursor:pointer;" 
                     data-recent-account="${accountId}"
                     data-accessedfields="AccountID:${accountId}"
                     data-activity-key="AccountID"
                     data-activity-value="${accountId}">
                    <div class="sidebar-item__content">
                        <i class="bi bi-file-earmark-text sidebar-item__icon"></i>
                        <div class="sidebar-item__text">
                            <div class="sidebar-item__title">${accountId}</div>
                            ${accountName ? `<div class="sidebar-item__description"><i class="bi bi-geo-alt me-1"></i>${accountName}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Wire click handlers for recent activities
        container.querySelectorAll('[data-recent-account]').forEach(item => {
            item.addEventListener('click', async function() {
                const accountId = this.getAttribute('data-recent-account');
                if (accountId) {
                    const accountIdInput = document.getElementById('AccountID');
                    if (accountIdInput) accountIdInput.value = accountId;
                    currentMode = 'VIEW';
                    await loadAccountDetails(accountId);
                    updateButtonStates();
                }
            });
        });
    }
    
    /**
     * Load and render recent activities in the sidebar
     */
    async function loadRecentActivities() {
        console.log('[AccountMaintenance] loadRecentActivities() called');
        
        // Try multiple possible selectors for the container
        let container = document.querySelector('[data-recent-activities-container]');
        if (!container) {
            container = document.getElementById('nav-recent');
        }
        
        if (!container) {
            console.warn('[AccountMaintenance] Recent activities container not found in DOM. Available nav-items:', 
                document.querySelectorAll('.nav-items').length);
            return;
        }
        
        console.log('[AccountMaintenance] Found recent activities container:', container.id || container.className);
        
        const moduleId = '1300'; // Account Maintenance module ID
        const url = `/SideBar/GetRecentActivities?moduleId=${moduleId}`;
        
        console.log('[AccountMaintenance] Fetching recent activities from:', url);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            
            console.log('[AccountMaintenance] GetRecentActivities response status:', response.status);
            
            if (!response.ok) {
                console.warn('[AccountMaintenance] Recent activities API returned error:', response.status);
                container.innerHTML = '<div class="sidebar-item sidebar-item--enhanced text-muted" style="padding: 8px 12px; font-size: 12px;">Failed to load activities</div>';
                return;
            }
            
            const result = await response.json();
            console.log('[AccountMaintenance] Recent activities response:', result);
            
            // Handle various response formats - API returns lowercase 'details'
            let activities = result.Activities || result.activities || 
                             result.Data || result.data || 
                             result.Details || result.details || [];
            
            // If activities is a JSON string, parse it
            if (typeof activities === 'string') {
                try {
                    activities = JSON.parse(activities);
                } catch (e) {
                    activities = [];
                }
            }
            
            console.log('[AccountMaintenance] Parsed activities:', activities, 'Count:', Array.isArray(activities) ? activities.length : 0);
            
            // Use shared render function
            renderRecentActivities(activities);
            
        } catch (error) {
            console.error('[AccountMaintenance] Error loading recent activities:', error);
            const container = document.querySelector('[data-recent-activities-container]');
            if (container) {
                container.innerHTML = '<div class="sidebar-item sidebar-item--enhanced text-muted" style="padding: 8px 12px; font-size: 12px;">Error loading activities</div>';
            }
        }
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
    window.addEventListener('message', function (event) {
        if (!event.data) return;

        if (event.data.action === 'submoduleOpened') {
            activeSubmodule = event.data.source;
            console.log('[AccountMaintenance] Submodule opened:', activeSubmodule);
        } else if (event.data.action === 'blockSubmoduleOpen') {
            console.log('[AccountMaintenance] Cannot open ' + event.data.blockedModule + ': ' + event.data.reason);
            showSystemToast('Please close \'' + event.data.source + '\' first');
        } else if (event.data.action === 'submoduleClosed') {
            // A submodule has closed - delegate to SidebarManager
            activeSubmodule = null;
            if (window.SidebarManager && typeof window.SidebarManager.closeChildForm === 'function') {
                window.SidebarManager.closeChildForm();
            }
            console.log('[AccountMaintenance] Submodule closed:', event.data.source);
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
        console.log('[AccountMaintenance] openChildForm called with key:', childKey);
        
        // Check if another submodule is already active
        if (activeSubmodule) {
            showSystemToast('Please close \'' + activeSubmodule + '\' first');
            return;
        }

        const path = CHILD_FORMS[childKey];
        console.log('[AccountMaintenance] Resolved path:', path);
        
        const { iframe } = getOverlayEls();
        if (!path || !iframe) {
            console.error('[AccountMaintenance] Cannot open child form - path:', path, 'iframe:', !!iframe);
            return;
        }

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
    async function loadSubmoduleView(submoduleName) {
        // Migration: Add confirmation when opening critical modules
        if (submoduleName === 'Closing') {
            const confirmed = await AppCore.showConfirmation('Confirm', 'Do you want to Proceed into Account Closing?');
            if (!confirmed) return;
        } else if (submoduleName === 'Blocking') {
            const confirmed = await AppCore.showConfirmation('Confirm', 'Do you want to Block/Unblock this Account?');
            if (!confirmed) return;
        }

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

        fetch(`/AccountsMaintenance/${submoduleName}?_t=${Date.now()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache'
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

                        if (submoduleName === 'Blocking' && window.AccountBlockingModule && window.AccountBlockingModule.init) {
                            window.AccountBlockingModule.init();
                        }
                        if (submoduleName === 'ChargeRates' && window.AccountChargeRatesModule && window.AccountChargeRatesModule.init) {
                            window.AccountChargeRatesModule.init();
                        }
                        if (submoduleName === 'AccountActivation' && window.AccountActivationModule && window.AccountActivationModule.init) {
                            window.AccountActivationModule.init();
                        }
                        if (submoduleName === 'Signatories' && window.AccountSignatoriesModule && window.AccountSignatoriesModule.init) {
                            window.AccountSignatoriesModule.init();
                        }
                        if (submoduleName === 'Documents' && window.AccountDocumentsModule && window.AccountDocumentsModule.init) {
                            window.AccountDocumentsModule.init();
                        }
                        if (submoduleName === 'Reminders' && window.AccountRemindersModule && window.AccountRemindersModule.init) {
                            window.AccountRemindersModule.init();
                        }
                        if (submoduleName === 'CancelStopPayment' && window.CancelStopPaymentModule && window.CancelStopPaymentModule.init) {
                            window.CancelStopPaymentModule.init();
                        }
                        if (submoduleName === 'FreezeRelease' && window.AccountFreezeReleaseModule && window.AccountFreezeReleaseModule.init) {
                            window.AccountFreezeReleaseModule.init();
                        }
                        if (submoduleName === 'ChequeBook' && window.AccountChequeBookModule && window.AccountChequeBookModule.init) {
                            window.AccountChequeBookModule.init();
                        }
                        if (submoduleName === 'Closing' && window.AccountClosingModule && window.AccountClosingModule.init) {
                            window.AccountClosingModule.init();
                        }
                        if (submoduleName === 'StopPaymentVoid' && window.StopPaymentVoidModule && window.StopPaymentVoidModule.init) {
                            window.StopPaymentVoidModule.init();
                        }
                        if (submoduleName === 'AccountTransfer' && window.AccountTransferModule && window.AccountTransferModule.init) {
                            window.AccountTransferModule.init();
                        }
                        if (submoduleName === 'AccountSweeping' && window.AccountSweepingModule && window.AccountSweepingModule.init) {
                            window.AccountSweepingModule.init();
                        }
                        if (submoduleName === 'Nomination' && window.AccountNominationModule && window.AccountNominationModule.init) {
                            window.AccountNominationModule.init();
                        }
                        if (submoduleName === 'ActivateDormant' && window.ActivateDormantModule && window.ActivateDormantModule.init) {
                            window.ActivateDormantModule.init();
                        }
                        if (submoduleName === 'UserDefinedFields' && window.UserDefinedFieldsModule && window.UserDefinedFieldsModule.init) {
                            window.UserDefinedFieldsModule.init();
                        }
                        if (submoduleName === 'AccountClassification' && window.AccountClassificationModule && window.AccountClassificationModule.init) {
                            window.AccountClassificationModule.init();
                        }
                        if (submoduleName === 'AccountNotification' && window.AccountNotificationModule && window.AccountNotificationModule.init) {
                            window.AccountNotificationModule.init();
                        }
                        if (submoduleName === 'SpecialConditions' && window.AccountSpecialConditionsModule && window.AccountSpecialConditionsModule.init) {
                            window.AccountSpecialConditionsModule.init();
                        }
                        if (submoduleName === 'InterestRates' && window.AccountInterestRatesModule && window.AccountInterestRatesModule.init) {
                            window.AccountInterestRatesModule.init();
                        }
                        if (submoduleName === 'CardMaintenance' && window.CardMaintenanceModule && window.CardMaintenanceModule.init) {
                            window.CardMaintenanceModule.init();
                        }
                        if (submoduleName === 'Notes' && window.AccountNotesModule && window.AccountNotesModule.init) {
                            window.AccountNotesModule.init();
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
    async function closeSubmodule() {
        const confirmed = await AppCore.showConfirmation('Close Submodule', 'Are you sure you want to close the current submodule? Any unsaved changes will be lost.');
        if (!confirmed) return;

        const container = document.getElementById('submodule-container');
        if (!container) return;

        // Ask for confirmation before closing
        const ok = await AppCore.showConfirmation('Close Module', 'Are you sure you want to close this module? Any unsaved changes will be lost.');
        if (!ok) return;

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

        // Restore the main action panel to its original state
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

        // Documents module — full original button set (NAVIGATION, SHOW IMAGE, VIEW, ADD, EDIT, DELETE, SAVE, CANCEL, CLEAR, CLOSE)
        if (submoduleName === 'Documents') {
            // NAV group + SHOW IMAGE go BEFORE .action-buttons as siblings (matching original layout)
            // Remove any previously injected siblings
            parentActionPanel.querySelectorAll('.submodule-nav-group, .submodule-show-image').forEach(e => e.remove());

            const navGroupHtml = `<div class="nav-group submodule-nav-group">
                    <button class="btn-nav green" type="button" id="submoduleBtnPrev" aria-label="Previous"><i class="bi bi-chevron-left"></i></button>
                    <span>NAVIGATION</span>
                    <button class="btn-nav green" type="button" id="submoduleBtnNext" aria-label="Next"><i class="bi bi-chevron-right"></i></button>
                </div>`;
            const showImageHtml = `<button class="btn-action submodule-show-image" type="button" id="submoduleBtnShowImage"><i class="bi bi-image me-1"></i>SHOW IMAGE</button>`;

            // Insert before action-buttons container
            actionButtonsContainer.insertAdjacentHTML('beforebegin', navGroupHtml + showImageHtml);

            // Only action buttons inside .action-buttons
            newButtonsHtml = `
                <button class="btn-action" type="button" id="submoduleBtnView"><i class="bi bi-eye me-1"></i>VIEW</button>
                <button class="btn-action" type="button" id="submoduleBtnAdd"><i class="bi bi-plus-circle me-1"></i>ADD</button>
                <button class="btn-action" type="button" id="submoduleBtnEdit"><i class="bi bi-pencil-square me-1"></i>EDIT</button>
                <button class="btn-action" type="button" id="submoduleBtnDelete"><i class="bi bi-trash3 me-1"></i>DELETE</button>
                <button class="btn-action btn-save" type="button" id="submoduleBtnSave"><i class="bi bi-check-lg me-1"></i>SAVE</button>
                <button class="btn-action btn-cancel" type="button" id="submoduleBtnCancel"><i class="bi bi-x-circle me-1"></i>CANCEL</button>
                <button class="btn-action" type="button" id="submoduleBtnClear" style="display:none;"><i class="bi bi-eraser me-1"></i>CLEAR</button>
                <button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose"><i class="bi bi-box-arrow-right me-1"></i>CLOSE</button>
            `;
        }
        else if (submoduleName === 'UserDefinedFields' || submoduleName === 'InterestRates' || submoduleName === 'CardMaintenance' || submoduleName === 'AccountClassification' || submoduleName === 'StopPaymentVoid' || submoduleName === 'CancelStopPayment') {
            newButtonsHtml = `
                <button class="btn-action btn-view" type="button" id="submoduleBtnView"><i class="bi bi-eye me-1"></i>View</button>
                <button class="btn-action btn-add" type="button" id="submoduleBtnAdd"><i class="bi bi-plus-circle me-1"></i>Add</button>
                <button class="btn-action btn-edit" type="button" id="submoduleBtnEdit"><i class="bi bi-pencil-square me-1"></i>Edit</button>
                <button class="btn-action btn-delete" type="button" id="submoduleBtnDelete"><i class="bi bi-trash3 me-1"></i>Delete</button>
                <button class="btn-action btn-save" type="button" id="submoduleBtnSave"><i class="bi bi-check-lg me-1"></i>Save</button>
                <button class="btn-action btn-cancel" type="button" id="submoduleBtnCancel"><i class="bi bi-x-circle me-1"></i>Cancel</button>
                <button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose"><i class="bi bi-box-arrow-right me-1"></i>Close</button>
            `;
        }
        else if (submoduleName === 'AccountNotification' || submoduleName === 'SpecialConditions') {
            newButtonsHtml = `
                <button class="btn-action btn-edit" type="button" id="submoduleBtnEdit"><i class="bi bi-pencil-square me-1"></i>Edit</button>
                <button class="btn-action btn-save" type="button" id="submoduleBtnSave"><i class="bi bi-check-lg me-1"></i>Save</button>
                <button class="btn-action btn-cancel" type="button" id="submoduleBtnCancel"><i class="bi bi-x-circle me-1"></i>Cancel</button>
                <button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose"><i class="bi bi-box-arrow-right me-1"></i>Close</button>
            `;
        }
        else if (submoduleName === 'FreezeRelease') {
            newButtonsHtml = `
                <button class="btn-action" type="button" id="submoduleBtnHistory"><i class="bi bi-clock-history me-1"></i>History</button>
                <button class="btn-action" type="button" id="submoduleBtnRelease"><i class="bi bi-unlock me-1"></i>Release</button>
                <button class="btn-action btn-view" type="button" id="submoduleBtnView"><i class="bi bi-eye me-1"></i>View</button>
                <button class="btn-action btn-add" type="button" id="submoduleBtnAdd"><i class="bi bi-plus-circle me-1"></i>Add</button>
                <button class="btn-action btn-save" type="button" id="submoduleBtnSave"><i class="bi bi-check-lg me-1"></i>Save</button>
                <button class="btn-action btn-cancel" type="button" id="submoduleBtnCancel"><i class="bi bi-x-circle me-1"></i>Cancel</button>
                <button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose"><i class="bi bi-box-arrow-right me-1"></i>Close</button>
            `;
        }
        else if (submoduleName === 'ChequeBook') {
            newButtonsHtml = `
                <button class="btn-action" type="button" id="submoduleBtnApprove"><i class="bi bi-check-circle me-1"></i>Approve</button>
                <button class="btn-action" type="button" id="submoduleBtnDispatch"><i class="bi bi-truck me-1"></i>Dispatch</button>
                <button class="btn-action btn-view" type="button" id="submoduleBtnView"><i class="bi bi-eye me-1"></i>View</button>
                <button class="btn-action btn-add" type="button" id="submoduleBtnAdd"><i class="bi bi-plus-circle me-1"></i>Add</button>
                <button class="btn-action btn-edit" type="button" id="submoduleBtnEdit"><i class="bi bi-pencil-square me-1"></i>Edit</button>
                <button class="btn-action btn-delete" type="button" id="submoduleBtnDelete"><i class="bi bi-trash3 me-1"></i>Delete</button>
                <button class="btn-action btn-save" type="button" id="submoduleBtnSave"><i class="bi bi-check-lg me-1"></i>Save</button>
                <button class="btn-action btn-cancel" type="button" id="submoduleBtnCancel"><i class="bi bi-x-circle me-1"></i>Cancel</button>
                <button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose"><i class="bi bi-box-arrow-right me-1"></i>Close</button>
            `;
        }
        else if (submoduleName === 'Reminders') {
            newButtonsHtml = `
                <button class="btn-action btn-view" type="button" id="submoduleBtnView"><i class="bi bi-eye me-1"></i>View</button>
                <button class="btn-action btn-add" type="button" id="submoduleBtnAdd"><i class="bi bi-plus-circle me-1"></i>Add</button>
                <button class="btn-action btn-edit" type="button" id="submoduleBtnEdit"><i class="bi bi-pencil-square me-1"></i>Edit</button>
                <button class="btn-action btn-delete" type="button" id="submoduleBtnDelete"><i class="bi bi-trash3 me-1"></i>Delete</button>
                <button class="btn-action btn-save" type="button" id="submoduleBtnSave"><i class="bi bi-check-lg me-1"></i>Save</button>
                <button class="btn-action btn-cancel" type="button" id="submoduleBtnCancel"><i class="bi bi-x-circle me-1"></i>Cancel</button>
                <button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose"><i class="bi bi-box-arrow-right me-1"></i>Close</button>
            `;
        }
        else if (submoduleName === 'ActivateDormant') {
            newButtonsHtml = `
                <button class="btn-action btn-view" type="button" id="submoduleBtnView"><i class="bi bi-eye me-1"></i>View</button>
                <button class="btn-action btn-edit" type="button" id="submoduleBtnEdit"><i class="bi bi-pencil-square me-1"></i>Edit</button>
                <button class="btn-action btn-save" type="button" id="submoduleBtnSave"><i class="bi bi-check-lg me-1"></i>Save</button>
                <button class="btn-action btn-cancel" type="button" id="submoduleBtnCancel"><i class="bi bi-x-circle me-1"></i>Cancel</button>
                <div class="action-separator p-1"></div>
                <button class="btn-action" type="button" id="submoduleBtnActivate"><i class="bi bi-lightning-charge me-1"></i>Activate</button>
                <button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose"><i class="bi bi-box-arrow-right me-1"></i>Close</button>
            `;
        }
        else if (submoduleName === 'Signatories') {
            newButtonsHtml = `
                <div class="d-flex flex-column gap-2">
                    <button class="btn-action" type="button" id="submoduleBtnSignature" data-action="signature"><i class="bi bi-pen me-1"></i>Signature</button>
                    <button class="btn-action" type="button" id="submoduleBtnPhoto" data-action="photo"><i class="bi bi-camera me-1"></i>Photo</button>
                    <button class="btn-action" type="button" id="submoduleBtnBoth" data-action="both"><i class="bi bi-collection me-1"></i>Both</button>
                </div>
                <div class="d-flex flex-column gap-2 mt-auto">
                    <button class="btn-action" type="button" id="submoduleBtnAdd" data-action="add"><i class="bi bi-plus-circle me-1"></i>Add</button>
                    <button class="btn-action" type="button" id="submoduleBtnEdit" data-action="edit"><i class="bi bi-pencil-square me-1"></i>Edit</button>
                    <button class="btn-action btn-save" type="button" id="submoduleBtnSave" data-action="save"><i class="bi bi-check-lg me-1"></i>Save</button>
                    <button class="btn-action btn-cancel" type="button" id="submoduleBtnCancel" data-action="cancel"><i class="bi bi-x-circle me-1"></i>Cancel</button>
                    <button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose" data-action="close-submodule"><i class="bi bi-box-arrow-right me-1"></i>Close</button>
                </div>
            `;
        }
        else if (submoduleName === 'AccountSweeping' || submoduleName === 'Nomination' || submoduleName === 'ChargeRates') {
            newButtonsHtml = `
                <button class="btn-action btn-view" type="button" id="submoduleBtnView"><i class="bi bi-eye me-1"></i>View</button>
                <button class="btn-action btn-add" type="button" id="submoduleBtnAdd"><i class="bi bi-plus-circle me-1"></i>Add</button>
                <button class="btn-action btn-edit" type="button" id="submoduleBtnEdit"><i class="bi bi-pencil-square me-1"></i>Edit</button>
                <button class="btn-action btn-save" type="button" id="submoduleBtnSave"><i class="bi bi-check-lg me-1"></i>Save</button>
                <button class="btn-action btn-delete" type="button" id="submoduleBtnDelete"><i class="bi bi-trash3 me-1"></i>Delete</button>
                <button class="btn-action btn-cancel" type="button" id="submoduleBtnCancel"><i class="bi bi-x-circle me-1"></i>Cancel</button>
                <button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose"><i class="bi bi-box-arrow-right me-1"></i>Close</button>
            `;
        }
        else if (submoduleName === 'Closing') {
            newButtonsHtml = `
                <button class="btn-action btn-view" type="button" id="submoduleBtnView"><i class="bi bi-eye me-1"></i>View</button>
                <button class="btn-action btn-add" type="button" id="submoduleBtnAdd"><i class="bi bi-plus-circle me-1"></i>Add</button>
                <button class="btn-action btn-edit" type="button" id="submoduleBtnEdit"><i class="bi bi-pencil-square me-1"></i>Edit</button>
                <button class="btn-action btn-save" type="button" id="submoduleBtnSave"><i class="bi bi-check-lg me-1"></i>Save</button>
                <button class="btn-action btn-cancel" type="button" id="submoduleBtnCancel"><i class="bi bi-x-circle me-1"></i>Cancel</button>
                <button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose"><i class="bi bi-box-arrow-right me-1"></i>Close</button>
            `;
        }
        else if (submoduleName === 'Blocking') {
            newButtonsHtml = `
                <button class="btn-action btn-view" type="button" id="submoduleBtnView"><i class="bi bi-eye me-1"></i>View</button>
                <button class="btn-action btn-edit" type="button" id="submoduleBtnEdit"><i class="bi bi-pencil-square me-1"></i>Edit</button>
                <button class="btn-action btn-save" type="button" id="submoduleBtnSave"><i class="bi bi-check-lg me-1"></i>Save</button>
                <button class="btn-action btn-cancel" type="button" id="submoduleBtnCancel"><i class="bi bi-x-circle me-1"></i>Cancel</button>
                <button class="btn-action btn-history" type="button" id="submoduleBtnHistory"><i class="bi bi-clock-history me-1"></i>History</button>
                <button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose"><i class="bi bi-box-arrow-right me-1"></i>Close</button>
            `;
        }
        else if (submoduleName === 'AccountTransfer') {
            newButtonsHtml = `
                <button class="btn-action btn-view" type="button" id="submoduleBtnView"><i class="bi bi-eye me-1"></i>View</button>
                <button class="btn-action btn-add" type="button" id="submoduleBtnAdd"><i class="bi bi-plus-circle me-1"></i>Add</button>
                <button class="btn-action btn-save" type="button" id="submoduleBtnSave"><i class="bi bi-check-lg me-1"></i>Save</button>
                <button class="btn-action btn-cancel" type="button" id="submoduleBtnCancel"><i class="bi bi-x-circle me-1"></i>Cancel</button>
                <button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose"><i class="bi bi-box-arrow-right me-1"></i>Close</button>
            `;
        }
        // VIEW SUBMODULES - Read-only view modules with Print/Export/Refresh/Close buttons
        else if (submoduleName === 'ClientPortfolio' || submoduleName === 'LoanRepaymentDetails') {
            newButtonsHtml = `
                <button class="btn-action btn-print" type="button" id="submoduleBtnPrint" data-action="print"><i class="bi bi-printer me-1"></i>Print</button>
                <button class="btn-action btn-export" type="button" id="submoduleBtnExport" data-action="export"><i class="bi bi-download me-1"></i>Export</button>
                <button class="btn-action btn-refresh" type="button" id="submoduleBtnRefresh" data-action="refresh"><i class="bi bi-arrow-clockwise me-1"></i>Refresh</button>
                <button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose" data-action="close"><i class="bi bi-box-arrow-right me-1"></i>Close</button>
            `;
        }
        else if (submoduleName === 'SignaturePhoto') {
            newButtonsHtml = `
                <button class="btn-action btn-print" type="button" id="submoduleBtnPrint" data-action="print"><i class="bi bi-printer me-1"></i>Print</button>
                <button class="btn-action btn-export" type="button" id="submoduleBtnExport" data-action="export"><i class="bi bi-download me-1"></i>Export</button>
                <button class="btn-action btn-refresh" type="button" id="submoduleBtnRefresh" data-action="refresh"><i class="bi bi-arrow-clockwise me-1"></i>Refresh</button>
                <button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose" data-action="close"><i class="bi bi-box-arrow-right me-1"></i>Close</button>
            `;
        }
        else if (submoduleName === 'DebitInterestWorksheet' || submoduleName === 'CreditInterestWorksheet') {
            newButtonsHtml = `
                <button class="btn-action btn-view" type="button" id="submoduleBtnView" data-action="view"><i class="bi bi-eye me-1"></i>View</button>
                <button class="btn-action btn-print" type="button" id="submoduleBtnPrint" data-action="print"><i class="bi bi-printer me-1"></i>Print</button>
                <button class="btn-action btn-export" type="button" id="submoduleBtnExport" data-action="export"><i class="bi bi-download me-1"></i>Export</button>
                <button class="btn-action btn-refresh" type="button" id="submoduleBtnRefresh" data-action="refresh"><i class="bi bi-arrow-clockwise me-1"></i>Refresh</button>
                <button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose" data-action="close"><i class="bi bi-box-arrow-right me-1"></i>Close</button>
            `;
        }
        else if (submoduleName === 'StatementView') {
            newButtonsHtml = `
                <button class="btn-action btn-view" type="button" id="submoduleBtnView" data-action="view"><i class="bi bi-eye me-1"></i>View</button>
                <button class="btn-action btn-print" type="button" id="submoduleBtnPrint" data-action="print"><i class="bi bi-printer me-1"></i>Print</button>
                <button class="btn-action btn-export-excel" type="button" id="submoduleBtnExportExcel" data-action="exportExcel"><i class="bi bi-file-earmark-excel me-1"></i>Excel</button>
                <button class="btn-action btn-export-pdf" type="button" id="submoduleBtnExportPdf" data-action="exportPdf"><i class="bi bi-file-earmark-pdf me-1"></i>PDF</button>
                <button class="btn-action btn-reverse" type="button" id="submoduleBtnReverse" data-action="reverse"><i class="bi bi-arrow-counterclockwise me-1"></i>Reverse</button>
                <button class="btn-action btn-refresh" type="button" id="submoduleBtnRefresh" data-action="refresh"><i class="bi bi-arrow-clockwise me-1"></i>Refresh</button>
                <button class="btn-action btn-close-submodule" type="button" id="submoduleBtnClose" data-action="close"><i class="bi bi-box-arrow-right me-1"></i>Close</button>
            `;
        } else {
            // Define standard buttons for other submodules
            newButtonsHtml = `
                <button class="btn-action btn-view" type="button" id="submoduleBtnView"><i class="bi bi-eye me-1"></i>View</button>
                <button class="btn-action" type="button" id="submoduleBtnEdit"><i class="bi bi-pencil-square me-1"></i>Edit</button>
                <button class="btn-action btn-save" type="button" id="submoduleBtnSave"><i class="bi bi-check-lg me-1"></i>Save</button>
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
            const addBtn = document.getElementById('submoduleBtnAdd');
            const editBtn = document.getElementById('submoduleBtnEdit');
            const deleteBtn = document.getElementById('submoduleBtnDelete');
            const saveBtn = document.getElementById('submoduleBtnSave');
            const cancelBtn = document.getElementById('submoduleBtnCancel');
            const closeBtn = document.getElementById('submoduleBtnClose');
            const historyBtn = document.getElementById('submoduleBtnHistory');
            const releaseBtn = document.getElementById('submoduleBtnRelease');

            // Wire Close button globally
            if (closeBtn) closeBtn.addEventListener('click', () => closeSubmodule());

            // UserDefinedFields Wiring
            if (submoduleName === 'UserDefinedFields' && window.UserDefinedFieldsModule) {
                const mod = window.UserDefinedFieldsModule;
                if (viewBtn) viewBtn.addEventListener('click', () => mod.navigate());
                if (addBtn) addBtn.addEventListener('click', () => mod.confirmAdd());
                if (editBtn) editBtn.addEventListener('click', () => mod.confirmEdit());
                if (deleteBtn) deleteBtn.addEventListener('click', () => mod.deleteData());
                if (saveBtn) saveBtn.addEventListener('click', () => mod.saveData());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.confirmCancel());
                return;
            }

            // AccountClassification Wiring
            if (submoduleName === 'AccountClassification' && window.AccountClassificationModule) {
                const mod = window.AccountClassificationModule;
                if (viewBtn) viewBtn.addEventListener('click', () => mod.navigate());
                if (addBtn) addBtn.addEventListener('click', () => mod.confirmAdd());
                if (editBtn) editBtn.addEventListener('click', () => mod.confirmEdit());
                if (deleteBtn) deleteBtn.addEventListener('click', () => mod.deleteData());
                if (saveBtn) saveBtn.addEventListener('click', () => mod.saveData());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.confirmCancel());
                return;
            }

            // AccountNotification Wiring
            if (submoduleName === 'AccountNotification' && window.AccountNotificationModule) {
                const mod = window.AccountNotificationModule;
                if (viewBtn) viewBtn.addEventListener('click', () => mod.navigate());
                if (editBtn) editBtn.addEventListener('click', () => mod.confirmEdit());
                if (saveBtn) saveBtn.addEventListener('click', () => mod.saveData());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.confirmCancel());
                mod.init();
                return;
            }

            // SpecialConditions Wiring
            if (submoduleName === 'SpecialConditions' && window.AccountSpecialConditionsModule) {
                const mod = window.AccountSpecialConditionsModule;
                if (viewBtn) viewBtn.addEventListener('click', () => mod.navigateData());
                if (editBtn) editBtn.addEventListener('click', () => mod.confirmEdit());
                if (saveBtn) saveBtn.addEventListener('click', () => mod.saveData());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.confirmCancel());
                return;
            }

            // InterestRates Wiring
            if (submoduleName === 'InterestRates' && window.AccountInterestRatesModule) {
                const mod = window.AccountInterestRatesModule;
                if (viewBtn) viewBtn.addEventListener('click', () => mod.navigate());
                if (addBtn) addBtn.addEventListener('click', () => mod.confirmAdd());
                if (editBtn) editBtn.addEventListener('click', () => mod.confirmEdit());
                if (deleteBtn) deleteBtn.addEventListener('click', () => mod.deleteData());
                if (saveBtn) saveBtn.addEventListener('click', () => mod.saveData());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.confirmCancel());
                return;
            }

            // CardMaintenance Wiring
            if (submoduleName === 'CardMaintenance' && window.CardMaintenanceModule) {
                const mod = window.CardMaintenanceModule;
                if (viewBtn) viewBtn.addEventListener('click', () => mod.navigate());
                if (addBtn) addBtn.addEventListener('click', () => mod.confirmAdd());
                if (editBtn) editBtn.addEventListener('click', () => mod.confirmEdit());
                if (deleteBtn) deleteBtn.addEventListener('click', () => mod.deleteData());
                if (saveBtn) saveBtn.addEventListener('click', () => mod.saveData());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.confirmCancel());
                return;
            }

            // FreezeRelease Wiring
            if (submoduleName === 'FreezeRelease' && window.AccountFreezeReleaseModule) {
                const mod = window.AccountFreezeReleaseModule;
                if (historyBtn) historyBtn.addEventListener('click', () => mod.showHistory());
                if (releaseBtn) releaseBtn.addEventListener('click', () => mod.showReleaseModal());
                if (viewBtn) viewBtn.addEventListener('click', () => mod.navigate());
                if (addBtn) addBtn.addEventListener('click', () => mod.confirmAdd());
                if (saveBtn) saveBtn.addEventListener('click', () => mod.saveData());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.confirmCancel());
                return;
            }

            // Handle explicitly handled modules (Modernized)
            if (submoduleName === 'AccountNotes' && window.AccountNotesModule) {
                const mod = window.AccountNotesModule;
                if (viewBtn) viewBtn.addEventListener('click', () => mod.loadNotes());
                if (editBtn) editBtn.addEventListener('click', () => mod.setMode('EDIT'));
                if (saveBtn) saveBtn.addEventListener('click', () => mod.saveNotes());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.cancelChanges());
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

            // Documents module — full button wiring matching original
            if (submoduleName === 'Documents' && window.AccountDocumentsModule) {
                const mod = window.AccountDocumentsModule;
                const prevBtn = document.getElementById('submoduleBtnPrev');
                const nextBtn = document.getElementById('submoduleBtnNext');
                const showImgBtn = document.getElementById('submoduleBtnShowImage');
                const addBtn = document.getElementById('submoduleBtnAdd');
                const deleteBtn = document.getElementById('submoduleBtnDelete');
                const clearBtn = document.getElementById('submoduleBtnClear');

                if (prevBtn) prevBtn.addEventListener('click', () => mod.navigate(-1));
                if (nextBtn) nextBtn.addEventListener('click', () => mod.navigate(1));
                if (showImgBtn) showImgBtn.addEventListener('click', () => mod.showImage());
                if (viewBtn) viewBtn.addEventListener('click', () => mod.navigate(0));
                if (addBtn) addBtn.addEventListener('click', () => mod.confirmAdd());
                if (editBtn) editBtn.addEventListener('click', () => mod.confirmEdit());
                if (deleteBtn) deleteBtn.addEventListener('click', () => mod.deleteData());
                if (saveBtn) saveBtn.addEventListener('click', () => mod.saveData());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.confirmCancel());
                if (clearBtn) clearBtn.addEventListener('click', () => mod.clearForm());
                return;
            }

            // Reminders module
            if (submoduleName === 'Reminders' && window.AccountRemindersModule) {
                const mod = window.AccountRemindersModule;
                if (viewBtn) viewBtn.addEventListener('click', () => (mod.viewData ? mod.viewData() : mod.loadData()));
                if (addBtn) addBtn.addEventListener('click', () => (mod.beginAdd ? mod.beginAdd() : mod.setMode('ADD')));
                if (editBtn) editBtn.addEventListener('click', () => mod.setMode('EDIT'));
                if (deleteBtn) deleteBtn.addEventListener('click', () => mod.deleteData());
                if (saveBtn) saveBtn.addEventListener('click', () => mod.saveData());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.cancelChanges());
                return;
            }

            // Cancel Stop Payment module
            if (submoduleName === 'CancelStopPayment' && window.CancelStopPaymentModule) {
                const mod = window.CancelStopPaymentModule;
                if (viewBtn) viewBtn.addEventListener('click', () => mod.navigate());
                if (addBtn) addBtn.addEventListener('click', () => mod.confirmAdd());
                if (editBtn) editBtn.addEventListener('click', () => mod.confirmEdit());
                if (deleteBtn) deleteBtn.addEventListener('click', () => mod.deleteData());
                if (saveBtn) saveBtn.addEventListener('click', () => mod.saveData());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.confirmCancel());
                return;
            }

            // Freeze Release module (Legacy name check - removing duplicate)
            // Handled already above


            // Cheque Book module
            if (submoduleName === 'ChequeBook' && window.AccountChequeBookModule) {
                const mod = window.AccountChequeBookModule;
                const approveBtn = document.getElementById('submoduleBtnApprove');
                const dispatchBtn = document.getElementById('submoduleBtnDispatch');

                if (viewBtn) viewBtn.addEventListener('click', () => mod.view());
                if (addBtn) addBtn.addEventListener('click', () => mod.add());
                if (editBtn) editBtn.addEventListener('click', () => mod.edit());
                if (deleteBtn) deleteBtn.addEventListener('click', () => mod.delete());
                if (saveBtn) saveBtn.addEventListener('click', () => mod.save());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.cancel());
                if (approveBtn) approveBtn.addEventListener('click', () => mod.approve());
                if (dispatchBtn) dispatchBtn.addEventListener('click', () => mod.dispatch());
                return;
            }

            // Account Closing module previously resided here. Moved below.

            // Stop Payment Void module
            if (submoduleName === 'StopPaymentVoid' && window.StopPaymentVoidModule) {
                const mod = window.StopPaymentVoidModule;
                if (viewBtn) viewBtn.addEventListener('click', () => mod.navigate());
                if (addBtn) addBtn.addEventListener('click', () => mod.confirmAdd());
                if (editBtn) editBtn.addEventListener('click', () => mod.confirmEdit());
                if (deleteBtn) deleteBtn.addEventListener('click', () => mod.deleteData());
                if (saveBtn) saveBtn.addEventListener('click', () => mod.saveData());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.confirmCancel());
                return;
            }

            // Activate Dormant module
            if (submoduleName === 'ActivateDormant' && window.ActivateDormantModule) {
                const mod = window.ActivateDormantModule;
                const activateBtn = document.getElementById('submoduleBtnActivate');

                if (viewBtn) viewBtn.addEventListener('click', () => mod.navigate());
                if (editBtn) editBtn.addEventListener('click', () => mod.confirmEdit());
                if (saveBtn) saveBtn.addEventListener('click', () => mod.saveData());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.confirmCancel());
                if (activateBtn) activateBtn.addEventListener('click', () => mod.activateAccount());
                return;
            }

            // Account Transfer module
            if (submoduleName === 'AccountTransfer' && window.AccountTransferModule) {
                const mod = window.AccountTransferModule;
                if (viewBtn) viewBtn.addEventListener('click', () => mod.view());
                if (addBtn) addBtn.addEventListener('click', () => mod.add());
                if (saveBtn) saveBtn.addEventListener('click', () => mod.save());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.cancel());
                return;
            }

            // Account Sweeping module
            if (submoduleName === 'AccountSweeping' && window.AccountSweepingModule) {
                const mod = window.AccountSweepingModule;
                if (viewBtn) viewBtn.addEventListener('click', () => mod.view());
                if (addBtn) addBtn.addEventListener('click', () => mod.add());
                if (editBtn) editBtn.addEventListener('click', () => mod.edit());
                if (saveBtn) saveBtn.addEventListener('click', () => mod.save());
                if (deleteBtn) deleteBtn.addEventListener('click', () => mod.delete());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.cancel());
                return;
            }

            // Account Nomination module
            if (submoduleName === 'Nomination' && window.AccountNominationModule) {
                const mod = window.AccountNominationModule;
                if (viewBtn) viewBtn.addEventListener('click', () => mod.view());
                if (addBtn) addBtn.addEventListener('click', () => mod.add());
                if (editBtn) editBtn.addEventListener('click', () => mod.edit());
                if (saveBtn) saveBtn.addEventListener('click', () => mod.save());
                if (deleteBtn) deleteBtn.addEventListener('click', () => mod.delete());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.cancel());
                return;
            }

            // Account Closing module
            if (submoduleName === 'Closing' && window.AccountClosingModule) {
                const mod = window.AccountClosingModule;
                if (viewBtn) viewBtn.addEventListener('click', () => mod.view());
                if (addBtn) addBtn.addEventListener('click', () => mod.add());
                if (editBtn) editBtn.addEventListener('click', () => mod.edit());
                if (saveBtn) saveBtn.addEventListener('click', () => mod.save());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.cancel());
                return;
            }

            // Account Charge Rates module
            if (submoduleName === 'ChargeRates' && window.AccountChargeRatesModule) {
                const mod = window.AccountChargeRatesModule;
                if (viewBtn) viewBtn.addEventListener('click', () => mod.view());
                if (addBtn) addBtn.addEventListener('click', () => mod.add());
                if (editBtn) editBtn.addEventListener('click', () => mod.edit());
                if (saveBtn) saveBtn.addEventListener('click', () => mod.save());
                if (deleteBtn) deleteBtn.addEventListener('click', () => mod.delete());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.cancel());
                return;
            }

            // Account Blocking module
            if (submoduleName === 'Blocking' && window.AccountBlockingModule) {
                const mod = window.AccountBlockingModule;
                if (viewBtn) viewBtn.addEventListener('click', () => mod.view());
                if (editBtn) editBtn.addEventListener('click', () => mod.edit());
                if (saveBtn) saveBtn.addEventListener('click', () => mod.save());
                if (cancelBtn) cancelBtn.addEventListener('click', () => mod.cancel());
                if (historyBtn) historyBtn.addEventListener('click', () => mod.showHistory());
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

            // ============================================================
            // VIEW SUBMODULES WIRING - Read-only view modules
            // ============================================================
            
            // Client Portfolio module
            if (submoduleName === 'ClientPortfolio' && window.ClientPortfolioModule) {
                const mod = window.ClientPortfolioModule;
                const printBtn = document.getElementById('submoduleBtnPrint');
                const exportBtn = document.getElementById('submoduleBtnExport');
                const refreshBtn = document.getElementById('submoduleBtnRefresh');

                if (printBtn) printBtn.addEventListener('click', () => mod.print());
                if (exportBtn) exportBtn.addEventListener('click', () => mod.exportData());
                if (refreshBtn) refreshBtn.addEventListener('click', () => mod.refresh());
                return;
            }

            // Signature Photo module
            if (submoduleName === 'SignaturePhoto' && window.SignaturePhotoModule) {
                const mod = window.SignaturePhotoModule;
                const printBtn = document.getElementById('submoduleBtnPrint');
                const exportBtn = document.getElementById('submoduleBtnExport');
                const refreshBtn = document.getElementById('submoduleBtnRefresh');

                if (printBtn) printBtn.addEventListener('click', () => mod.print());
                if (exportBtn) exportBtn.addEventListener('click', () => mod.exportData());
                if (refreshBtn) refreshBtn.addEventListener('click', () => mod.refresh());
                return;
            }

            // Loan Repayment Details module
            if (submoduleName === 'LoanRepaymentDetails' && window.LoanRepaymentDetailsModule) {
                const mod = window.LoanRepaymentDetailsModule;
                const printBtn = document.getElementById('submoduleBtnPrint');
                const exportBtn = document.getElementById('submoduleBtnExport');
                const refreshBtn = document.getElementById('submoduleBtnRefresh');

                if (printBtn) printBtn.addEventListener('click', () => mod.print());
                if (exportBtn) exportBtn.addEventListener('click', () => mod.exportData());
                if (refreshBtn) refreshBtn.addEventListener('click', () => mod.refresh());
                return;
            }

            // Debit Interest Worksheet module
            if (submoduleName === 'DebitInterestWorksheet' && window.DebitInterestWorksheetModule) {
                const mod = window.DebitInterestWorksheetModule;
                const printBtn = document.getElementById('submoduleBtnPrint');
                const exportBtn = document.getElementById('submoduleBtnExport');
                const refreshBtn = document.getElementById('submoduleBtnRefresh');

                if (viewBtn) viewBtn.addEventListener('click', () => mod.view());
                if (printBtn) printBtn.addEventListener('click', () => mod.print());
                if (exportBtn) exportBtn.addEventListener('click', () => mod.exportData());
                if (refreshBtn) refreshBtn.addEventListener('click', () => mod.refresh());
                return;
            }

            // Credit Interest Worksheet module
            if (submoduleName === 'CreditInterestWorksheet' && window.CreditInterestWorksheetModule) {
                const mod = window.CreditInterestWorksheetModule;
                const printBtn = document.getElementById('submoduleBtnPrint');
                const exportBtn = document.getElementById('submoduleBtnExport');
                const refreshBtn = document.getElementById('submoduleBtnRefresh');

                if (viewBtn) viewBtn.addEventListener('click', () => mod.view());
                if (printBtn) printBtn.addEventListener('click', () => mod.print());
                if (exportBtn) exportBtn.addEventListener('click', () => mod.exportData());
                if (refreshBtn) refreshBtn.addEventListener('click', () => mod.refresh());
                return;
            }

            // Statement View module - uses proxy clicks since statement-view.js auto-initializes
            if (submoduleName === 'StatementView') {
                const container = document.getElementById('submodule-container');
                const printBtn = document.getElementById('submoduleBtnPrint');
                const exportExcelBtn = document.getElementById('submoduleBtnExportExcel');
                const exportPdfBtn = document.getElementById('submoduleBtnExportPdf');
                const reverseBtn = document.getElementById('submoduleBtnReverse');
                const refreshBtn = document.getElementById('submoduleBtnRefresh');

                // Proxy click to internal buttons
                const proxyClick = (internalId) => {
                    const internalBtn = container?.querySelector('#' + internalId);
                    if (internalBtn) internalBtn.click();
                };

                if (viewBtn) viewBtn.addEventListener('click', () => proxyClick('btn_view'));
                if (printBtn) printBtn.addEventListener('click', () => proxyClick('btn_print'));
                if (exportExcelBtn) exportExcelBtn.addEventListener('click', () => proxyClick('btn_exportExcel'));
                if (exportPdfBtn) exportPdfBtn.addEventListener('click', () => proxyClick('btn_exportPdf'));
                if (reverseBtn) reverseBtn.addEventListener('click', () => proxyClick('btn_reverse'));
                if (refreshBtn) refreshBtn.addEventListener('click', () => proxyClick('btn_refresh'));
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

        // Remove injected submodule siblings (Documents: nav-group + show-image)
        parentActionPanel.querySelectorAll('.submodule-nav-group, .submodule-show-image').forEach(e => e.remove());

        const actionButtonsContainer = parentActionPanel.querySelector('.action-buttons');
        if (actionButtonsContainer && parentActionPanel.dataset.originalButtons) {
            actionButtonsContainer.innerHTML = parentActionPanel.dataset.originalButtons;
            delete parentActionPanel.dataset.originalButtons;
        }

        // Note: Original button event listeners may need to be re-attached if they were not delegated.
        // Assuming global delegation or inline handlers for now.
    }

    /**
     * Wire blur event listeners for ClientID and ProductID inputs
     * When user manually types an ID and tabs out, fetch the details
     */
    function wireManualInputListeners() {
        const clientIdInput = document.getElementById('ClientID');
        const productIdInput = document.getElementById('ProductID');
        const accountIdInput = document.getElementById('AccountID');
        const accountSearchBtn = document.querySelector('[data-kairo-account-control] .btn-lookup');

        // AccountID F2/Enter key handler - open search or load account
        if (accountIdInput) {
            accountIdInput.addEventListener('keydown', async function (event) {
                if (event.key === 'F2') {
                    event.preventDefault();
                    // Open search modal
                    if (accountSearchBtn) accountSearchBtn.click();
                } else if (event.key === 'Enter') {
                    event.preventDefault();
                    const accountId = this.value.trim();
                    if (accountId) {
                        // Load account details directly
                        currentMode = 'VIEW';
                        await loadAccountDetails(accountId);
                        updateButtonStates();
                    } else {
                        // Open search modal if no value entered
                        if (accountSearchBtn) accountSearchBtn.click();
                    }
                }
            });
            
            // AccountID blur handler - auto-load account when user tabs out (if value present)
            accountIdInput.addEventListener('blur', async function () {
                const accountId = this.value.trim();
                if (!accountId) return;
                // Only auto-load if account is not already loaded for this ID
                if (window.AccountMaintenanceState.AccountID !== accountId && !window.AccountMaintenanceState.isAccountLoaded) {
                    currentMode = 'VIEW';
                    await loadAccountDetails(accountId);
                    updateButtonStates();
                }
            });
        }

        // ClientID blur handler - fetch client details when user tabs out
        if (clientIdInput) {
            clientIdInput.addEventListener('blur', async function () {
                const clientId = this.value.trim();
                if (!clientId) return;

                // Only in ADD mode or if client details not already loaded
                if (currentMode !== 'ADD') return;

                // Update state and trigger auto-populate
                window.AccountMaintenanceState.ClientID = clientId;
                console.log('[AccountMaintenance] ClientID entered manually:', clientId);
                checkAndAutoPopulateClientDetails();
            });
        }

        // ProductID blur handler - fetch product details when user tabs out
        if (productIdInput) {
            productIdInput.addEventListener('blur', async function () {
                const productId = this.value.trim();
                if (!productId) return;

                // Only in ADD mode
                if (currentMode !== 'ADD') return;

                // Update state and trigger auto-populate
                window.AccountMaintenanceState.ProductID = productId;
                console.log('[AccountMaintenance] ProductID entered manually:', productId);

                // Fetch product details to get CurrencyID and MinimumBalance
                try {
                    const response = await fetch(`/AccountsMaintenance/get-product-details?productId=${encodeURIComponent(productId)}`, {
                        method: 'GET',
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    });

                    if (response.ok) {
                        const result = await response.json();
                        const product = result.data || result;

                        if (product) {
                            // Update Product Name if available
                            const productNameInput = document.getElementById('ProductName');
                            if (productNameInput && product.ProductName) {
                                productNameInput.value = product.ProductName;
                            }

                            // Update Account Snapshot fields
                            const currencySpan = document.getElementById('CurrencyID') ||
                                document.querySelector('.behind-scene-value[data-field="currencyId"]');
                            const minBalanceSpan = document.getElementById('MinimumBalance') ||
                                document.querySelector('.behind-scene-value[data-field="minimumBalance"]');

                            if (currencySpan && product.CurrencyID) {
                                currencySpan.textContent = product.CurrencyID;
                            }
                            if (minBalanceSpan && product.MinimumBalance !== undefined) {
                                const num = parseFloat(product.MinimumBalance);
                                minBalanceSpan.textContent = !isNaN(num)
                                    ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                    : product.MinimumBalance;
                            }

                            console.log('[AccountMaintenance] Product details loaded:', product);
                        }
                    }
                } catch (error) {
                    console.warn('[AccountMaintenance] Failed to fetch product details:', error);
                }

                // Also trigger client auto-populate if client is already selected
                checkAndAutoPopulateClientDetails();
            });
        }
    }

    async function init() {
        console.log('[AccountMaintenance] Initializing module...');
        wireNavSections();
        wireSidebarToggle();
        wireBlockingConfirmation();
        wireLookups();
        wireActionButtons();
        wireManualInputListeners();

        // Load entire sidebar via AJAX (same as Client Maintenance)
        // This includes submodules AND recent activities with proper Narration
        console.log('[AccountMaintenance] Loading sidebar...');
        try {
            await loadSidebar();
        } catch (err) {
            console.warn('[AccountMaintenance] Failed to load sidebar on init:', err);
        }

        // Hide initial loader
        showPageLoader(false);
        console.log('[AccountMaintenance] Initialization complete');
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

    function wireBlockingConfirmation() {
        const yesBtn = document.getElementById('blockingConfirmYes');
        const noBtn = document.getElementById('blockingConfirmNo');
        const closeBtn = document.getElementById('blockingConfirmClose');

        if (yesBtn) {
            yesBtn.addEventListener('click', function () {
                hideBlockingConfirmation();
                // Use SidebarManager to open the Blocking submodule with MVC route
                if (window.SidebarManager && typeof window.SidebarManager.openChildForm === 'function') {
                    window.SidebarManager.openChildForm('../AccountsMaintenance/Blocking', {
                        requireMainRecord: true,
                        mainRecordName: 'Account'
                    });
                }
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
        'ChargeID': { tableID: 'ChargeID', keyField: 'ChargeID', nameField: 'ChargeName' },
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
        'referenceId': { tableID: 'FreezeID', keyField: 'ReferenceID', nameField: 'Description' },
        'reminderId': { tableID: 'AccountReminderID', keyField: 'ReminderID', nameField: 'Description' },
        'transactionId': { tableID: 'TransactionID', keyField: 'TransactionID', nameField: 'Description' },
        'accountTransferId': { tableID: 'AccountID', keyField: 'AccountID', nameField: 'AccountName' },
        'txnAccountId': { tableID: 'AccountID', keyField: 'AccountID', nameField: 'AccountName' },
        'payableAt': { tableID: 'BranchID', keyField: 'BranchID', nameField: 'BranchName' },
        'documentId': { tableID: 'DocumentID', keyField: 'DocumentID', nameField: 'Description' },
        // Legacy/simple lookup tokens used by some migrated submodule views
        'Branch': { tableID: 'BranchID', keyField: 'BranchID', nameField: 'BranchName' },
        'Account': { tableID: 'AccountID', keyField: 'AccountID', nameField: 'AccountName' }
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
            if (btn.dataset.lookupOwner === 'module') return;

            // Avoid double wiring
            if (btn.dataset.wired) return;
            btn.dataset.wired = 'true';
            
            // Get target input ID 
            const targetInputId = btn.dataset.targetInput || btn.dataset.lookup;
            
            // Wire F2 key on the corresponding input field
            if (targetInputId) {
                const inputEl = document.getElementById(targetInputId);
                if (inputEl && !inputEl.dataset.f2Wired) {
                    inputEl.dataset.f2Wired = 'true';
                    inputEl.addEventListener('keydown', function(event) {
                        if (event.key === 'F2') {
                            event.preventDefault();
                            btn.click(); // Trigger the lookup button click
                        }
                    });
                }
            }

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
                        if (activeSubmodule === 'ActivateDormant') {
                            whereParts.push("AccountStatusID = 'AD'");
                            whereParts.push('IsDormant = 1');
                        }

                    if (whereParts.length > 0) {
                        config.whereStmt = whereParts.join(' AND ');
                        console.log(`[AccountMaintenance] Applying filter to Account Lookup: ${config.whereStmt}`);
                    }
                }

                // Filter Product lookup to show only deposit products (exclude loan products)
                // Loan products typically have ProductTypeID starting with 'LN' or similar
                if (config.tableID === 'ProductID') {
                    // Filter out loan products - show only deposit/savings products
                    config.whereStmt = "ProductTypeID NOT LIKE 'LN%'";
                    console.log(`[AccountMaintenance] Applying filter to Product Lookup (deposits only): ${config.whereStmt}`);
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
                            (idInput && idInput.closest('[data-kairo-branch-control], [data-kairo-account-control], [data-kairo-client-control], [data-kairo-product-control], [data-kairo-user-control], [data-kairo-control]')?.querySelector('[class*="__name"]')) ||
                            (idInput && idInput.closest('.kairo-branch-control, .kairo-account-control, .kairo-client-control, .kairo-product-control, .kairo-user-control, .kairo-control')?.querySelector('[class*="__name"]'));

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

                        document.dispatchEvent(new CustomEvent('kairo:lookup-selected', {
                            detail: {
                                targetInputId,
                                selectedRow
                            }
                        }));

                        // For Documents submodule: lookup just sets ID+description
                        // User uses VIEW button or Enter to navigate after selection
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
                        'FaxNo': ['Fax', 'FaxNo'],              // Form uses FaxNo, API returns Fax
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
                    // Parse FinancialSummary if it's a JSON string
                    let financialSummary = {};
                    if (account.FinancialSummary) {
                        try {
                            financialSummary = typeof account.FinancialSummary === 'string' 
                                ? JSON.parse(account.FinancialSummary) 
                                : account.FinancialSummary;
                        } catch (e) {
                            console.warn('[AccountMaintenance] Failed to parse FinancialSummary:', e);
                        }
                    }
                    
                    // Merge AccountDetails, FinancialSummary, and Supervision into account
                    // IMPORTANT: Preserve AccountDetails audit fields and UpdateCount as authoritative sources
                    // Supervision fields may be empty and should not overwrite actual values
                    const accountDetails = account.AccountDetails || {};
                    const preservedAuditFields = {
                        UpdateCount: accountDetails.UpdateCount,
                        CreatedBy: accountDetails.CreatedBy,
                        CreatedOn: accountDetails.CreatedOn,
                        ModifiedBy: accountDetails.ModifiedBy,
                        ModifiedOn: accountDetails.ModifiedOn,
                        SupervisedBy: accountDetails.SupervisedBy,
                        SupervisedOn: accountDetails.SupervisedOn
                    };
                    
                    const supervision = account.Supervision || {};
                    
                    // Capture root-level fields from Details (e.g., WorkingDate) before merging
                    const rootLevelFields = {
                        WorkingDate: account.WorkingDate,
                        ShowBehindSceneData: account.ShowBehindSceneData,
                        AllowSpecialInterestRate: account.AllowSpecialInterestRate,
                        BankID: account.BankID
                    };
                    
                    account = { ...accountDetails, ...financialSummary, ...supervision, ...rootLevelFields };
                    
                    // Restore audit fields from AccountDetails (Supervision may have empty values)
                    Object.entries(preservedAuditFields).forEach(([key, value]) => {
                        if (value !== undefined && value !== null && value !== '') {
                            account[key] = value;
                        }
                    });
                }

                if (account) {
                    console.log('[AccountMaintenance] Parsed account data:', account);
                    
                    // Update Global State
                    window.AccountMaintenanceState.AccountID = account.AccountID || accountId;
                    window.AccountMaintenanceState.AccountName = account.AccountName || account.AccountTitle || '';
                            window.AccountMaintenanceState.ProductID = account.ProductID || '';
                            window.AccountMaintenanceState.ProductName = account.ProductName || account.Product || '';
                            window.AccountMaintenanceState.ClientID = account.ClientID || '';
                            // Handle fallback or explicit BranchID + description
                            window.AccountMaintenanceState.OurBranchID = account.OurBranchID || account.BranchID || window.AccountMaintenanceState.OurBranchID || '';
                            window.AccountMaintenanceState.BranchName = account.BranchName || account.BranchDescription || '';
                            window.AccountMaintenanceState.CurrencyID = account.CurrencyID || '';
                            window.AccountMaintenanceState.UpdateCount = account.UpdateCount || 0;  // Store for concurrency control
                            window.AccountMaintenanceState.isAccountLoaded = true;
                            
                            console.log('[AccountMaintenance] Stored UpdateCount:', window.AccountMaintenanceState.UpdateCount);

                            // Comprehensive field mapping for UI elements matching API properties
                            const fieldMap = {
                                'BranchID': 'OurBranchID',
                                'AccountTitle': 'AccountName',
                                'Product': 'ProductName',
                                // Note: SalesOfficerID and SalesOfficerName are direct matches in API
                                // AccountOfficerID is a separate field (Account Officer, not Sales Officer)
                                'AccountTypeID': 'AccountClassID',
                                'AccountTypeName': 'AccountClassName',
                                'PhoneHome': 'Phone1',
                                'PhoneWork': 'Phone2',
                                'FaxNo': 'Fax', // UI uses FaxNo, API uses Fax
                                // Financial Summary field mappings (handling case differences)
                                'UnclearBalance': 'UnClearBalance', // UI uses "Unclear", API uses "UnClear"
                                'OpenDate': 'WorkingDate', // UI uses "OpenDate", API uses "WorkingDate"
                                'CreditRate': 'InterestRate', // Map to InterestRate from AccountDetails
                                'DebitRate': 'DebitIntRate',
                                'PenaltyRate': 'PenaltyIntRate',
                                'PendingCharges': 'PendingCharges', // If present in future
                                // Audit Trail field mappings - API uses direct field names
                                // CreatedBy, CreatedOn, ModifiedBy, ModifiedOn are direct matches
                                // Only add fallback mappings if needed
                                'SupervisedBy': 'SupervisorID',
                                'SupervisedOn': 'SupervisorDT'
                            };

                            // Populate Form Fields (Inputs, Selects, and Display Spans)
                            const elements = document.querySelectorAll('input:not([type="hidden"]), select, textarea, .behind-scene-value, .audit-value');

                            elements.forEach(el => {
                                // Use element ID first, then fallback to data-field attribute
                                const fieldName = el.id || el.dataset.field;
                                // Skip if no field identifier or is the search trigger
                                if (!fieldName || fieldName === 'AccountID') return;

                                let key = null;

                                // 1. Check if form field has a mapping to a different API field name
                                if (fieldMap[fieldName]) {
                                    key = Object.keys(account).find(k => k.toLowerCase() === fieldMap[fieldName].toLowerCase());
                                }

                                // 2. Direct case-insensitive match
                                if (!key) {
                                    key = Object.keys(account).find(k => k.toLowerCase() === fieldName.toLowerCase());
                                }

                                // 3. Also check data-field attribute for mapping  
                                if (!key && el.dataset.field && fieldMap[el.id]) {
                                    key = Object.keys(account).find(k => k.toLowerCase() === fieldMap[el.id].toLowerCase());
                                }

                                // 4. Fallback for specific variations if needed
                                if (!key && fieldName.endsWith('ID')) {
                                    key = Object.keys(account).find(k => k.toLowerCase() === fieldName.toLowerCase());
                                }

                                // 5. Special fallback for CreatedOn (try MakerDT, CreatedOn, etc.)
                                if (!key && fieldName === 'CreatedOn') {
                                    key = Object.keys(account).find(k => k.toLowerCase() === 'makerdt')
                                        || Object.keys(account).find(k => k.toLowerCase() === 'createdon');
                                }

                                // 6. Special fallback for ModifiedOn (try CheckerDT, ModifiedOn, etc.)
                                if (!key && fieldName === 'ModifiedOn') {
                                    key = Object.keys(account).find(k => k.toLowerCase() === 'checkerdt')
                                        || Object.keys(account).find(k => k.toLowerCase() === 'modifiedon');
                                }

                                // 7. Special fallback for PendingCharges (try PendingCharges, PendingCharge, etc.)
                                if (!key && fieldName === 'PendingCharges') {
                                    key = Object.keys(account).find(k => k.toLowerCase() === 'pendingcharges')
                                        || Object.keys(account).find(k => k.toLowerCase() === 'pendingcharge');
                                }

                                if (key && account[key] !== null && account[key] !== undefined && account[key] !== '') {
                                    // Detect date fields by field name pattern
                                    const isDateTimeField = /^(Created|Modified|Supervised|Opened|Closed)On$/i.test(fieldName) ||
                                        /^(Created|Modified|Supervised|Opened|Closed)On$/i.test(key) ||
                                        fieldName.toLowerCase() === 'opendate' || key.toLowerCase() === 'workingdate';
                                    const isDateField = /Date$/i.test(fieldName) || /Date$/i.test(key);
                                    
                                    // Detect numeric/balance fields that should be comma-formatted
                                    const isNumericField = /Balance|Amount|Lien|Interest|Charges|Power|Credits|Debits/i.test(fieldName) ||
                                        /Balance|Amount|Lien|Interest|Charges|Power|Credits|Debits/i.test(key);
                                    
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
                                    } else {
                                        // For spans or divs (display only) - apply formatting
                                        let displayValue = account[key];
                                        if (isDateTimeField && window.GlobalUtils?.formatDateTime) {
                                            displayValue = window.GlobalUtils.formatDateTime(account[key]);
                                        } else if (isDateField && window.GlobalUtils?.formatDate) {
                                            displayValue = window.GlobalUtils.formatDate(account[key]);
                                        } else if (isNumericField) {
                                            // Format numbers with commas
                                            const num = parseFloat(account[key]);
                                            if (!isNaN(num)) {
                                                displayValue = num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                                            }
                                        }
                                        el.textContent = displayValue;
                                    }
                                }
                            });

                            // Patch SalesOfficerName and LiquidationAccountName if missing
                            await patchOfficerAndLiquidationNames(account);

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

                    // Notify sidebar that main record is loaded (enables submodule access)
                    const finalAccountId = account.AccountID || accountId;
                    if (window.SidebarManager && typeof window.SidebarManager.setMainRecordLoaded === 'function') {
                        window.SidebarManager.setMainRecordLoaded(true, finalAccountId);
                        console.log('[AccountMaintenance] Sidebar notified - main record loaded:', finalAccountId);
                    }

                    // Track recent activity for quick access later
                    console.log('[AccountMaintenance] About to track recent activity for:', finalAccountId);
                    try {
                        await addRecentActivityAndRefreshSidebar(finalAccountId, account.AccountName || '');
                    } catch (err) {
                        console.warn('[AccountMaintenance] Failed to track recent activity:', err);
                    }

                    // Update button states after successful load
                    updateButtonStates();
                } else {
                    showErrorMessage('Account details empty or invalid', { useInlineAlert: true });
                }
            } else {
                const msg = result.message || (data && data.ResponseMessage) || 'Failed to load account details';
                showErrorMessage(msg, { useInlineAlert: true });
                // Notify sidebar that no valid record is loaded (mirrors CM pattern)
                if (window.SidebarManager && typeof window.SidebarManager.setMainRecordLoaded === 'function') {
                    window.SidebarManager.setMainRecordLoaded(false, null);
                }
            }

        } catch (error) {
            console.error('[AccountMaintenance] Error loading account:', error);
            showErrorMessage('Error loading account details: ' + error.message, { useInlineAlert: true });
            // Notify sidebar that no valid record is loaded (mirrors CM pattern)
            if (window.SidebarManager && typeof window.SidebarManager.setMainRecordLoaded === 'function') {
                window.SidebarManager.setMainRecordLoaded(false, null);
            }
        } finally {
            showPageLoader(false);
        }
    }

    /**
     * Helper to patch SalesOfficerName and LiquidationAccountName if missing
     * Fetches the name from the lookup endpoint using the ID
     * @param {Object} account - The account data object
     */
    async function patchOfficerAndLiquidationNames(account) {
        // Patch SalesOfficerID and SalesOfficerName
        const salesOfficerId = account.SalesOfficerID;
        const salesOfficerName = account.SalesOfficerName;
        
        console.log('[AccountMaintenance] Patching fields - SalesOfficerID:', salesOfficerId, 'SalesOfficerName:', salesOfficerName);
        
        // First, ensure the ID field is set (handle "NULL" string as empty)
        const idInput = document.getElementById('SalesOfficerID');
        if (idInput && salesOfficerId && salesOfficerId !== 'NULL' && salesOfficerId !== 'null') {
            idInput.value = salesOfficerId;
            console.log('[AccountMaintenance] Set SalesOfficerID field to:', salesOfficerId);
        }
        
        // Fetch name if ID exists but name is missing - use SearchModal/Search endpoint
        if (salesOfficerId && salesOfficerId !== 'NULL' && salesOfficerId !== 'null' && 
            (!salesOfficerName || salesOfficerName === 'null' || salesOfficerName === 'NULL' || salesOfficerName === '')) {
            try {
                console.log('[AccountMaintenance] Fetching SalesOfficer name for ID:', salesOfficerId);
                
                // Use AppCore.invokeControllerAsync like SearchModal does
                if (window.AppCore && window.AppCore.invokeControllerAsync) {
                    const response = await window.AppCore.invokeControllerAsync('SearchModal/Search', {
                        TableID: 'OfficerID',
                        WhereStmt: '',
                        SearchKey: salesOfficerId.trim(),
                        ModuleID: '100',
                        PageSize: 50,
                        RefID: '',
                        PrevOrNext: 0
                    });
                    
                    console.log('[AccountMaintenance] SalesOfficer search response:', response);
                    
                    // Extract results - correct path is data.details.SearchResults
                    let results = null;
                    if (response && response.data && response.data.details && response.data.details.SearchResults) {
                        results = response.data.details.SearchResults;
                    } else if (response && response.data && Array.isArray(response.data.Details)) {
                        results = response.data.Details;
                    } else if (response && Array.isArray(response.Details)) {
                        results = response.Details;
                    }
                    
                    console.log('[AccountMaintenance] Extracted results:', results);
                    
                    if (Array.isArray(results) && results.length > 0) {
                        // Normalize the ID by removing leading zeros for comparison
                        const normalizedSearchId = salesOfficerId.replace(/^0+/, '') || '0';
                        
                        // Find a matching officer by normalized ID comparison
                        const officer = results.find(r => {
                            const resultId = (r.OfficerID || r.ID || '').toString().replace(/^0+/, '') || '0';
                            return resultId === normalizedSearchId;
                        });
                        
                        console.log('[AccountMaintenance] Normalized search ID:', normalizedSearchId);
                        console.log('[AccountMaintenance] Found officer:', officer);
                        
                        if (officer) {
                            const officerName = officer.Name || officer.OfficerName || officer.Description || officer.FullName;
                            if (officerName) {
                                const nameInput = document.getElementById('SalesOfficerName');
                                if (nameInput) {
                                    nameInput.value = officerName;
                                    console.log('[AccountMaintenance] Patched SalesOfficerName:', officerName);
                                }
                            }
                        } else {
                            console.warn('[AccountMaintenance] No matching officer found for normalized ID:', normalizedSearchId);
                        }
                    } else {
                        console.warn('[AccountMaintenance] No officer results found');
                    }
                } else {
                    console.warn('[AccountMaintenance] AppCore.invokeControllerAsync not available');
                }
            } catch (e) {
                console.warn('[AccountMaintenance] Failed to fetch SalesOfficerName:', e);
            }
        }
        
        // Patch LiquidationAccountID and LiquidationAccountName
        const liquidationId = account.LiquidationAccountID;
        const liquidationName = account.LiquidationAccountName;
        
        // Ensure ID field is set
        const liqIdInput = document.getElementById('LiquidationAccountID');
        if (liqIdInput && liquidationId) {
            liqIdInput.value = liquidationId;
        }
        
        // Fetch name if ID exists but name is missing
        if (liquidationId && (!liquidationName || liquidationName === 'null' || liquidationName === '')) {
            try {
                const resp = await fetch(`/AccountsMaintenance/get-account?AccountID=${encodeURIComponent(liquidationId)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    body: JSON.stringify({ AccountID: liquidationId })
                });
                if (resp.ok) {
                    const result = await resp.json();
                    const data = result.data || result;
                    let acc = data.Details || data;
                    if (acc.AccountDetails) acc = acc.AccountDetails;
                    if (acc && (acc.AccountName || acc.Name)) {
                        const nameInput = document.getElementById('LiquidationAccountName');
                        if (nameInput) nameInput.value = acc.AccountName || acc.Name;
                    }
                }
            } catch (e) {
                console.warn('[AccountMaintenance] Failed to fetch LiquidationAccountName:', e);
            }
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
            // Contact (Note: HTML uses FaxNo, we map to Fax for API)
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
            } else {
                console.warn(`[AccountMaintenance] collectAccountFormData: Element not found for field: ${fieldId}`);
            }
        });

        // Debug: Log collected contact fields
        console.log('[AccountMaintenance] Collected contact fields:', {
            PhoneHome: formData.PhoneHome,
            PhoneWork: formData.PhoneWork,
            FaxNo: formData.FaxNo,
            Mobile: formData.Mobile,
            EmailID: formData.EmailID
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
        // Note: FaxNo is collected above and mapped to Fax below

        // Map AccountName to Name for database (t_AccountCustomer expects Name column)
        formData.Name = formData.AccountName || '';

        // Get OperatorID from sessionStorage - this is the logged-in user
        const operatorId = sessionStorage.getItem('user_name') ||
            sessionStorage.getItem('UserName') ||
            sessionStorage.getItem('user_id') ||
            sessionStorage.getItem('UserId') ||
            sessionStorage.getItem('UserID') ||
            sessionStorage.getItem('OperatorID') ||
            sessionStorage.getItem('operatorId') ||
            window.AccountMaintenanceState.OperatorID || '';

        // Set OperatorID, CreatedBy, and ModifiedBy to the same value
        formData.OperatorID = operatorId;
        formData.CreatedBy = operatorId;
        formData.ModifiedBy = operatorId;
        formData.OpenedBy = operatorId;

        // Add OpenedDate for account creation (not nullable)
        formData.OpenedDate = window.GlobalUtils?.getCurrentDate
            ? window.GlobalUtils.getCurrentDate()
            : new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

        // Map FaxNo (UI field ID) to Fax (API field name)
        const faxElement = document.getElementById('FaxNo');
        if (faxElement) {
            formData.Fax = faxElement.value || '';
            console.log('[AccountMaintenance] FaxNo element found, value:', faxElement.value);
        } else {
            // Fallback: check if already collected as FaxNo
            formData.Fax = formData.FaxNo || '';
        }
        // Remove FaxNo if it exists (API expects Fax)
        delete formData.FaxNo;

        // Final debug: Log complete formData before return
        console.log('[AccountMaintenance] Final formData keys:', Object.keys(formData));
        console.log('[AccountMaintenance] formData.Fax =', formData.Fax);

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
            // For create: require ClientID, ProductID, AccountName, and OperatingModeID
            if (!formData.ClientID) errors.push('Client ID is required');
            if (!formData.ProductID) errors.push('Product ID is required');
            if (!formData.AccountName && !formData.Name) errors.push('Account Name is required');
            if (!formData.OperatingModeID) errors.push('Operating Mode is required');
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
            // Debug: Log the full payload before sending
            console.log('[AccountMaintenance] createAccount payload:', JSON.stringify(formData, null, 2));
            console.log('[AccountMaintenance] Fax value in payload:', formData.Fax);

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

                // Show success notification in the inline alert area
                showSystemToast(`Account created successfully. Account ID: ${newAccountId}`, {
                    variant: 'success',
                    useInlineAlert: true
                });

                // Set AccountID in the input field for reference
                if (newAccountId) {
                    const accountIdInput = document.getElementById('AccountID');
                    if (accountIdInput) {
                        accountIdInput.value = newAccountId;
                    }
                }

                // Switch back to VIEW mode (user can search for the account if they want to edit it)
                currentMode = 'VIEW';
                // Mark that an account was just created - disables Add until form is cleared
                window.AccountMaintenanceState.isAccountJustCreated = true;
                updateButtonStates();
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

        // Add UpdateCount for optimistic concurrency control
        formData.UpdateCount = window.AccountMaintenanceState.UpdateCount || 0;

        showPageLoader(true, 'Updating account...');

        try {
            // Debug: Log the full payload before sending
            console.log('[AccountMaintenance] updateAccount payload:', JSON.stringify(formData, null, 2));
            console.log('[AccountMaintenance] Fax value in payload:', formData.Fax);
            console.log('[AccountMaintenance] UpdateCount in payload:', formData.UpdateCount);

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

        // Notify sidebar that main record is no longer loaded
        if (window.SidebarManager && typeof window.SidebarManager.setMainRecordLoaded === 'function') {
            window.SidebarManager.setMainRecordLoaded(false, null);
        }

        // Clear all form fields
        const fieldsToClear = [
            'AccountID', 'ClientID', 'ProductID', 'AccountName', 'ShortName',
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
        const isAccountJustCreated = window.AccountMaintenanceState.isAccountJustCreated || false;
        const isAddMode = currentMode === 'ADD';
        const isEditMode = currentMode === 'EDIT';
        const isModifying = isAddMode || isEditMode;

        console.log('[AccountMaintenance] updateButtonStates:', { currentMode, isAccountLoaded, isAccountJustCreated, isAddMode, isEditMode, isModifying });

        // View button: enabled when not in modify mode
        if (btns.view) btns.view.disabled = isModifying;

        // Add button: disabled when modifying OR account is loaded/just created (must clear first)
        if (btns.add) btns.add.disabled = isModifying || isAccountJustCreated || isAccountLoaded;

        // Edit button: enabled only when account is loaded and not in modify mode
        if (btns.edit) btns.edit.disabled = !isAccountLoaded || isModifying;

        // Save button: enabled only in ADD or EDIT mode
        if (btns.save) {
            btns.save.disabled = !isModifying;
            console.log('[AccountMaintenance] Save button disabled:', btns.save.disabled);
        }

        // Cancel button: enabled in ADD/EDIT mode OR when account is loaded/just created (to allow clearing)
        if (btns.cancel) btns.cancel.disabled = !isModifying && !isAccountJustCreated && !isAccountLoaded;

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
            btns.view.addEventListener('click', async function () {
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
            btns.add.addEventListener('click', function () {
                if (this.disabled) return;
                clearFormForAdd();
                updateButtonStates();
            });
        }

        // Edit button - switches to edit mode
        if (btns.edit) {
            btns.edit.addEventListener('click', function () {
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
            btns.save.addEventListener('click', async function () {
                if (this.disabled) return;
                await saveAccount();
                updateButtonStates();
            });
        }

        // Cancel button - discards changes or clears form
        if (btns.cancel) {
            btns.cancel.addEventListener('click', async function () {
                if (this.disabled) return;

                // Determine the context for the dialog
                const isAfterCreate = window.AccountMaintenanceState.isAccountJustCreated || false;
                const isViewingRecord = window.AccountMaintenanceState.isAccountLoaded && !isAfterCreate && currentMode === 'VIEW';
                const isEditingRecord = currentMode === 'EDIT';

                let dialogTitle, dialogMessage;

                if (isAfterCreate) {
                    dialogTitle = 'Clear Form';
                    dialogMessage = 'Clear the form to add a new account?';
                } else if (isViewingRecord) {
                    dialogTitle = 'Clear Form';
                    dialogMessage = 'Clear the current account to start fresh?';
                } else if (isEditingRecord) {
                    dialogTitle = 'Discard Changes';
                    dialogMessage = 'Discard any unsaved changes?';
                } else {
                    dialogTitle = 'Clear Form';
                    dialogMessage = 'Clear the form?';
                }

                // Use showDialog for confirmation
                const confirmed = await AppCore.showDialog({
                    type: 'confirmation',
                    title: dialogTitle,
                    message: dialogMessage
                });

                if (confirmed) {
                    if (isEditingRecord) {
                        // In EDIT mode - reload the current account to discard changes
                        await loadAccountDetails(window.AccountMaintenanceState.AccountID);
                        currentMode = 'VIEW';
                        updateButtonStates();
                    } else {
                        // VIEW mode with record, ADD mode, or after create - clear form completely
                        resetAccountMaintenanceState();
                        clearFormForAdd();
                        currentMode = 'VIEW';
                        updateButtonStates();
                        showSystemToast('Form cleared.', { variant: 'info', useInlineAlert: true });
                    }
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

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

