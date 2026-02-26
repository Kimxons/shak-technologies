/**
 * Account Maintenance - Submodule Loader
 * Dynamically loads partial views for submodules
 */

(function () {
    'use strict';

    const SUBMODULE_CONTAINER_SELECTOR = '#submodule-container';
    const SUBMODULE_ITEM_SELECTOR = '[data-submodule]';
    const ACTIVE_CLASS = 'sidebar-item--active';
    const CONTROLLER_BASE_PATH = '/AccountsMaintenance';

    /**
     * Initialize submodule loader
     */
    function init() {
        attachSubmoduleClickHandlers();
        console.log('[SubmoduleLoader] Initialized');
    }

    /**
     * Attach click handlers to all submodule menu items
     */
    function attachSubmoduleClickHandlers() {
        const submoduleItems = document.querySelectorAll(SUBMODULE_ITEM_SELECTOR);

        submoduleItems.forEach(item => {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                const submoduleName = this.dataset.submodule;
                if (!submoduleName) {
                    console.warn('[SubmoduleLoader] No submodule name found');
                    return;
                }

                loadSubmodule(submoduleName, this);
            });
        });
    }

    /**
     * Load a submodule partial view
     * @param {string} submoduleName - Name of the submodule to load
     * @param {HTMLElement} clickedItem - The clicked sidebar item
     */
    function loadSubmodule(submoduleName, clickedItem) {
        const container = document.querySelector(SUBMODULE_CONTAINER_SELECTOR);
        if (!container) {
            console.error('[SubmoduleLoader] Container not found');
            return;
        }

        // Update active state
        updateActiveState(clickedItem);

        // Special case: DataEntry = default Account Search view (no AJAX needed)
        if (submoduleName === 'DataEntry') {
            showDefaultView(container);
            return;
        }

        // Show loading indicator
        showLoadingIndicator(container);

        // Build URL
        const url = `${CONTROLLER_BASE_PATH}/${submoduleName}`;

        // Fetch partial view
        fetch(url, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                // Replace container content with partial view
                container.innerHTML = html;

                // Reinitialize any scripts in the loaded content
                initializeLoadedContent(submoduleName);

                console.log(`[SubmoduleLoader] Loaded: ${submoduleName}`);
            })
            .catch(error => {
                console.error(`[SubmoduleLoader] Error loading ${submoduleName}:`, error);
                showErrorMessage(container, submoduleName, error.message);
            });
    }

    /**
     * Update active state in sidebar
     * @param {HTMLElement} clickedItem - The clicked item
     */
    function updateActiveState(clickedItem) {
        // Remove active from all items
        document.querySelectorAll(SUBMODULE_ITEM_SELECTOR).forEach(item => {
            item.classList.remove(ACTIVE_CLASS);
        });

        // Add active to clicked item
        if (clickedItem) {
            clickedItem.classList.add(ACTIVE_CLASS);
        }
    }

    /**
     * Show the default Account Search view (reload page content)
     * @param {HTMLElement} container
     */
    function showDefaultView(container) {
        window.location.href = `${CONTROLLER_BASE_PATH}/Index`;
    }

    /**
     * Show loading indicator
     * @param {HTMLElement} container
     */
    function showLoadingIndicator(container) {
        container.innerHTML = `
            <div class="form-card text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">Loading submodule...</p>
            </div>
        `;
    }

    /**
     * Show error message
     * @param {HTMLElement} container
     * @param {string} submoduleName
     * @param {string} errorMessage
     */
    function showErrorMessage(container, submoduleName, errorMessage) {
        container.innerHTML = `
            <div class="form-card">
                <div class="alert alert-danger d-flex align-items-center" role="alert">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    <div>
                        <h5 class="alert-heading">Failed to Load ${submoduleName}</h5>
                        <p class="mb-0">${errorMessage}</p>
                        <hr>
                        <p class="mb-0 small">Please check your connection or contact support if the problem persists.</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize content after loading partial view
     * @param {string} submoduleName
     */
    function initializeLoadedContent(submoduleName) {
        // Reinitialize Bootstrap tooltips/popovers if any
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        [...tooltipTriggerList].forEach(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

        // Dispatch custom event for submodule-specific initialization
        const event = new CustomEvent('submodule:loaded', {
            detail: { submoduleName }
        });
        document.dispatchEvent(event);

        console.log(`[SubmoduleLoader] Initialized content for: ${submoduleName}`);
    }

    // Public API
    window.SubmoduleLoader = {
        init,
        loadSubmodule
    };

    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
