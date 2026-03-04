/**
 * Sidebar Management Module
 * Handles sidebar navigation, submodule management, and child form overlay
 * 
 * Features:
 * - Dynamic submodule loading with caching
 * - Search/filter submodules
 * - Section collapse/expand
 * - Child form overlay management
 * - Theme variable propagation to iframes
 * - Badge count updates
 */

(function (global) {
    'use strict';

    // ============================================================================
    // CONSTANTS & CONFIGURATION
    // ============================================================================

    const THEME_VAR_KEYS = [
        '--copilot-bg-gradient',
        '--copilot-primary',
        '--copilot-primary-hover',
        '--copilot-text-main',
        '--copilot-text-muted',
        '--copilot-card-bg',
        '--kairo-border-color',
        '--kairo-font-family',
        '--kairo-font-size',
        '--kairo-form-canvas-bg',
        '--kairo-form-surface-bg',
        '--kairo-form-actions-bg',
        '--color-header',
        '--color-primary',
        '--ktb-bg',
        '--ktb-bg-dark',
        '--am-primary',
        '--am-primary-dark'
    ];

    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================

    let activeSubmodule = null;
    let mainModuleState = {
        isMainRecordLoaded: false,
        primaryRecordId: null,
        moduleName: null
    };

    // ============================================================================
    // DOM HELPERS
    // ============================================================================

    function getOverlayElements() {
        return {
            overlay: document.querySelector('[data-child-inline]'),
            iframe: document.querySelector('[data-child-iframe]'),
            mainForm: document.querySelector('[data-main-form]'),
            mainContainer: document.querySelector('.main-container')
        };
    }

    function showPageLoader(show, message = 'Loading...') {
        const overlay = document.getElementById('pageLoadingOverlay');
        const textEl = document.getElementById('pageLoadingText');

        if (!overlay) return;

        if (textEl) textEl.textContent = message;
        overlay.hidden = !show;
    }

    // ============================================================================
    // THEME MANAGEMENT
    // ============================================================================

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

        // Inject direct CSS rules for headers
        let styleEl = targetDoc.getElementById('kairo-sidebar-theme');
        if (!styleEl) {
            styleEl = targetDoc.createElement('style');
            styleEl.id = 'kairo-sidebar-theme';
            targetDoc.head.appendChild(styleEl);
        }

        const darkerColor = `color-mix(in srgb, ${headerColor} 85%, black 15%)`;
        styleEl.textContent = `
      .am-header, .de-header, .submodule-header { 
      background: linear-gradient(180deg, ${headerColor} 0%, ${darkerColor} 100%) !important; 
      }
  `;
    }

    function applyThemeVarsToChildIframe() {
        const { iframe } = getOverlayElements();
        if (!iframe) return;

        try {
            const doc = iframe.contentDocument;
            if (!doc) return;
            copyThemeVarsToDocument(doc);
        } catch (err) {
            console.warn('[Sidebar] Cannot access iframe document (cross-origin?):', err);
        }
    }

    // ============================================================================
    // OVERLAY MANAGEMENT
    // ============================================================================

    function setOverlayOpen(isOpen) {
        const { overlay, mainForm, mainContainer } = getOverlayElements();
        if (!overlay || !mainContainer) return;

        if (isOpen) {
            // Animate: Hide main form, show child form
            mainContainer.classList.add('child-opening');
            overlay.hidden = false;

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    mainContainer.classList.add('child-open');
                    overlay.classList.add('is-visible');
                    overlay.classList.remove('is-closing');

                    setTimeout(() => {
                        mainContainer.classList.remove('child-opening');
                        if (mainForm) mainForm.hidden = true;
                    }, 350);
                });
            });
        } else {
            // Animate: Hide child form, show main form
            mainContainer.classList.add('child-closing');
            mainContainer.classList.remove('child-expanded');
            overlay.classList.add('is-closing');
            overlay.classList.remove('is-visible');

            // Reset expand button icon
            const expandBtn = document.getElementById('expandChildBtn');
            if (expandBtn) {
                expandBtn.querySelector('i').className = 'bi bi-arrows-fullscreen';
                expandBtn.setAttribute('title', 'Expand');
            }

            if (mainForm) mainForm.hidden = false;

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
            mainContainer.classList.remove('child-expanded');
            if (expandBtn) {
                expandBtn.querySelector('i').className = 'bi bi-arrows-fullscreen';
                expandBtn.setAttribute('title', 'Expand');
            }
        } else {
            mainContainer.classList.add('child-expanded');
            if (expandBtn) {
                expandBtn.querySelector('i').className = 'bi bi-arrows-angle-contract';
                expandBtn.setAttribute('title', 'Collapse');
            }
        }
    }

    // ============================================================================
    // CHILD FORM MANAGEMENT
    // ============================================================================

    function openChildForm(submoduleUrl, options = {}) {
        const {
            requireMainRecord = true,
            mainRecordName = 'record',
            cacheBust = true
        } = options;

        // Check if another submodule is already active
        if (activeSubmodule) {
            showSystemToast(`Please close '${activeSubmodule}' first`);
            return;
        }

        const { iframe } = getOverlayElements();
        if (!submoduleUrl || !iframe) return;

        // Check if main record is required and loaded
        if (requireMainRecord && !mainModuleState.isMainRecordLoaded) {
            showSystemToast(`Please load a ${mainRecordName} before accessing this feature.`, {
                title: `View ${mainRecordName}`,
                variant: 'warning',
                timeoutMs: 4000
            });
            return;
        }

        // Set active submodule
        activeSubmodule = submoduleUrl;

        // Load iframe with cache busting
        showPageLoader(true, 'Loading form...');

        iframe.onload = function () {
            applyThemeVarsToChildIframe();
            showPageLoader(false);
        };

        if (cacheBust) {
            const bust = `v=${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const separator = submoduleUrl.includes('?') ? '&' : '?';
            iframe.src = `${submoduleUrl}${separator}${bust}`;
        } else {
            iframe.src = submoduleUrl;
        }

        setOverlayOpen(true);
    }

    function closeChildForm() {
        const { overlay, iframe } = getOverlayElements();

        activeSubmodule = null;

        // Kill the iframe completely for fresh reload next time
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
    }

    function resetToDefaultState() {
        // Close any open child form
        closeChildForm();

        // Reset main module state
        mainModuleState = {
            isMainRecordLoaded: false,
            primaryRecordId: null,
            moduleName: null
        };

        // Emit event for parent module to handle additional cleanup
        document.dispatchEvent(new CustomEvent('sidebar:reset', {
            detail: { timestamp: Date.now() }
        }));
    }

    // ============================================================================
    // SECTION MANAGEMENT
    // ============================================================================

    function setSectionOpen(sectionEl, isOpen) {
        if (!sectionEl) return;

        sectionEl.classList.toggle('is-open', Boolean(isOpen));
        sectionEl.classList.toggle('expanded', Boolean(isOpen));

        const toggle = sectionEl.querySelector('.nav-arrow, .nav-arrow--card');
        const items = sectionEl.querySelector('.nav-items, .nav-items--card');

        if (toggle) {
            toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }

        if (items) {
            items.removeAttribute('hidden');

            const sidebar = document.getElementById('main-sidebar');
            if (sidebar && sidebar.classList.contains('collapsed')) {
                return;
            }

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

                if (willOpen) {
                    section.classList.add('expanded');
                } else {
                    section.classList.remove('expanded');
                }
            });
        });

        sections.forEach(section => {
            const initiallyOpen = section.classList.contains('is-open');
            setSectionOpen(section, initiallyOpen);
        });
    }

    // ============================================================================
    // SIDEBAR TOGGLE
    // ============================================================================

    function wireSidebarToggle() {
        /*const sidebar = document.getElementById('main-sidebar');*/
        const sidebar = document.getElementById('sidebarContainer');
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

    // ============================================================================
    // SIDEBAR ITEMS
    // ============================================================================

    function wireSidebarItems() {
        document.querySelectorAll('.sidebar-item[data-child-form], .sidebar-item--enhanced[data-child-form]').forEach(item => {
            item.addEventListener('click', function (e) {
                e.stopPropagation();

                const sidebar = document.getElementById('main-sidebar');
                const mainContainer = document.querySelector('.main-container');
                const toggle = document.getElementById('sidebarToggle');
                const isCollapsed = sidebar && sidebar.classList.contains('collapsed');

                if (isCollapsed) {
                    sidebar.classList.remove('collapsed');
                    if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
                    if (toggle) toggle.setAttribute('aria-expanded', 'true');

                    const parentSection = this.closest('.nav-section--card');
                    if (parentSection) {
                        document.querySelectorAll('.nav-section--card').forEach(s => setSectionOpen(s, false));
                        setSectionOpen(parentSection, true);
                        parentSection.classList.add('expanded');
                    }
                }

                document.querySelectorAll('.sidebar-item[data-child-form], .sidebar-item--enhanced[data-child-form]')
                    .forEach(i => i.classList.remove('active'));
                this.classList.add('active');

                const childKey = this.getAttribute('data-child-form');
                if (childKey) {
                    openChildForm(childKey, {
                        requireMainRecord: true,
                        mainRecordName: mainModuleState.moduleName || 'record'
                    });
                }
            });
        });
    }

    // ============================================================================
    // SEARCH FUNCTIONALITY
    // ============================================================================

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

            sections.forEach(section => {
                const items = section.querySelectorAll('.sidebar-item--enhanced[data-child-form]');
                const visibleItems = Array.from(items).filter(item => item.style.display !== 'none');
                const navItems = section.querySelector('.nav-items--card');

                if (searchTerm) {
                    if (visibleItems.length > 0) {
                        setSectionOpen(section, true);
                        section.classList.add('expanded');
                        if (navItems) navItems.style.display = '';
                    } else {
                        setSectionOpen(section, false);
                        section.classList.remove('expanded');
                        if (navItems) navItems.style.display = 'none';
                    }
                } else {
                    if (navItems) navItems.style.display = '';
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

    // ============================================================================
    // BADGE UPDATES
    // ============================================================================

    function updateBadgeCounts() {
        const sections = document.querySelectorAll('.nav-section--card');

        sections.forEach(section => {
            const items = section.querySelectorAll('.sidebar-item--enhanced[data-child-form]');
            const badge = section.querySelector('.nav-badge');

            if (badge && items.length > 0) {
                badge.textContent = items.length;
            }
        });
    }

    // ============================================================================
    // MESSAGE HANDLERS
    // ============================================================================

    function wireMessageHandlers() {
        const { overlay } = getOverlayElements();

        if (overlay) {
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) closeChildForm();
            });
        }

        window.addEventListener('message', function (event) {
            const data = event?.data;
            if (!data || typeof data !== 'object') return;

            if (data.type === 'submoduleClose') {
                closeChildForm();
            } else if (data.type === 'submoduleOpen' && data.submoduleUrl) {
                openChildForm(data.submoduleUrl);
            } else if (data.type === 'submoduleReset') {
                resetToDefaultState();
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && activeSubmodule) {
                closeChildForm();
            }
        });
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    function initSidebar(options = {}) {
        console.log('[Sidebar] Initializing...');

        // Update main module state if provided
        if (options.moduleName) mainModuleState.moduleName = options.moduleName;
        if (options.hasOwnProperty('isMainRecordLoaded')) {
            mainModuleState.isMainRecordLoaded = options.isMainRecordLoaded;
        }
        if (options.primaryRecordId) mainModuleState.primaryRecordId = options.primaryRecordId;

        // Wire up all components
        wireNavSections();
        wireSidebarToggle();
        wireSidebarItems();
        wireSubmoduleSearch();
        wireMessageHandlers();
        updateBadgeCounts();

        console.log('[Sidebar] Initialized successfully');
    }

    // ============================================================================
    // PUBLIC API
    // ============================================================================

    const SidebarManager = {
        init: initSidebar,
        openChildForm,
        closeChildForm,
        resetToDefaultState,
        toggleChildExpand,
        updateBadgeCounts,

        // State management
        setMainRecordLoaded: (isLoaded, primaryRecordId = null) => {
            mainModuleState.isMainRecordLoaded = isLoaded;
            mainModuleState.primaryRecordId = primaryRecordId;
        },

        getState: () => ({ ...mainModuleState, activeSubmodule }),

        // Section management
        setSectionOpen,

        // Theme management
        applyThemeVarsToChildIframe
    };

    // Expose to global scope
    global.SidebarManager = SidebarManager;

    // Auto-initialize on DOMContentLoaded if sidebar exists
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.getElementById('main-sidebar')) {
                initSidebar();
            }
        });
    } else if (document.getElementById('main-sidebar')) {
        initSidebar();
    }

})(window);
