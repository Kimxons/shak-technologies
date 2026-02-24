/**
 * Form Initialization Script
 * Common functionality for all standardized forms:
 * - Sidebar toggle (collapse/expand)
 * - Section toggle (collapse/expand)
 * - Sidebar navigation (nav-header expand/collapse)
 * - Sidebar info item modals
 */

(function() {
    'use strict';

    /**
     * Initialize sidebar toggle functionality
     * Handles the hamburger button click to collapse/expand the left sidebar
     */
    function initSidebarToggle() {
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('main-sidebar');
        
        if (!sidebarToggle || !sidebar) return;
        
        sidebarToggle.addEventListener('click', function(e) {
            e.preventDefault();
            sidebar.classList.toggle('collapsed');
            
            // Update aria-expanded attribute
            const isExpanded = !sidebar.classList.contains('collapsed');
            sidebarToggle.setAttribute('aria-expanded', isExpanded);
        });
    }

    /**
     * Initialize sidebar navigation functionality
     * Handles clicking on nav-header to expand/collapse nav sections
     * Handles clicking on nav-items/sidebar-items to open corresponding modals
     */
    function initSidebarNavigation() {
        // Handle nav-header clicks to toggle expand/collapse
        const navHeaders = document.querySelectorAll('.nav-header--card');
        navHeaders.forEach(function(header) {
            header.addEventListener('click', function(e) {
                e.preventDefault();
                
                const section = header.closest('.nav-section--card');
                const items = section ? section.querySelector('.nav-items--card') : null;
                
                if (section && items) {
                    // Toggle the expanded class
                    section.classList.toggle('expanded');
                    items.classList.toggle('is-visible');
                    
                    // Update aria-expanded
                    const isExpanded = section.classList.contains('expanded');
                    header.setAttribute('aria-expanded', isExpanded);
                    
                    // Rotate the arrow
                    const arrow = header.querySelector('.nav-arrow, .nav-arrow--card');
                    if (arrow) {
                        const icon = arrow.querySelector('i') || arrow;
                        if (section.classList.contains('expanded')) {
                            arrow.setAttribute('aria-expanded', 'true');
                        } else {
                            arrow.setAttribute('aria-expanded', 'false');
                        }
                    }
                }
            });
        });
        
        // Handle nav-item clicks to open modals (uses data-modal attribute)
        const navItemsWithModal = document.querySelectorAll('.nav-item[data-modal]');
        navItemsWithModal.forEach(function(item) {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                
                const modalId = item.getAttribute('data-modal');
                if (modalId) {
                    openModal(modalId);
                }
            });
        });
        
        // Handle sidebar-item clicks to open modals (uses data-action attribute)
        // The modal ID is derived from the action name (e.g., "image" -> "imageModal")
        const sidebarItems = document.querySelectorAll('.sidebar-item[data-action]');
        sidebarItems.forEach(function(item) {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                
                const action = item.getAttribute('data-action');
                if (action) {
                    // Try to find a modal with the action name
                    const modalId = action.replace(/-/g, '') + 'Modal';
                    const altModalId = action.replace(/-([a-z])/g, function(m, p1) { 
                        return p1.toUpperCase(); 
                    }) + 'Modal';
                    
                    // Try multiple naming conventions
                    if (openModal(modalId)) return;
                    if (openModal(altModalId)) return;
                    if (openModal(action + 'Modal')) return;
                    if (openModal(action + '-modal')) return;
                    
                    // Dispatch a custom event if no modal found
                    const event = new CustomEvent('sidebar-action', { 
                        detail: { action: action, element: item } 
                    });
                    document.dispatchEvent(event);
                }
            });
        });
    }
    
    /**
     * Open a Bootstrap modal by ID
     * @param {string} modalId - The ID of the modal element
     * @returns {boolean} - True if modal was found and opened
     */
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
            return true;
        }
        return false;
    }

    /**
     * Initialize form section toggle functionality
     * Handles clicking on section-header to collapse/expand form sections
     */
    function initSectionToggles() {
        const sectionToggles = document.querySelectorAll('[data-section-toggle]');
        
        sectionToggles.forEach(function(toggle) {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                
                const section = toggle.closest('.form-section');
                if (!section) return;
                
                // Toggle the collapsed class
                section.classList.toggle('collapsed');
                
                // Update the toggle button icon and aria-expanded
                const toggleBtn = toggle.querySelector('.section-toggle-btn');
                const icon = toggle.querySelector('.section-toggle-btn i');
                const isCollapsed = section.classList.contains('collapsed');
                
                if (toggleBtn) {
                    toggleBtn.setAttribute('aria-expanded', !isCollapsed);
                }
                
                if (icon) {
                    icon.classList.remove('bi-chevron-up', 'bi-chevron-down');
                    icon.classList.add(isCollapsed ? 'bi-chevron-down' : 'bi-chevron-up');
                }
            });
        });
    }

    /**
     * Collapse all sidebar nav sections on page load
     * Nav sections start collapsed and user can expand them
     */
    function collapseAllNavSections() {
        const navSections = document.querySelectorAll('.nav-section--card');
        
        navSections.forEach(function(section) {
            // Remove expanded class
            section.classList.remove('expanded');
            
            // Hide nav items
            const items = section.querySelector('.nav-items--card');
            if (items) {
                items.classList.remove('is-visible');
            }
            
            // Update aria-expanded on arrows
            const arrow = section.querySelector('.nav-arrow, .nav-arrow--card');
            if (arrow) {
                arrow.setAttribute('aria-expanded', 'false');
            }
            
            // Update aria-expanded on header
            const header = section.querySelector('.nav-header--card');
            if (header) {
                header.setAttribute('aria-expanded', 'false');
            }
        });
    }

    /**
     * Toggle a specific nav section (can be called from outside)
     * @param {HTMLElement} header - The nav-header element
     */
    window.toggleNavSection = function(header) {
        if (!header) return;
        
        const section = header.closest('.nav-section--card');
        const items = section ? section.querySelector('.nav-items--card') : null;
        
        if (section && items) {
            section.classList.toggle('expanded');
            items.classList.toggle('is-visible');
            
            const isExpanded = section.classList.contains('expanded');
            header.setAttribute('aria-expanded', isExpanded);
            
            const arrow = header.querySelector('.nav-arrow, .nav-arrow--card');
            if (arrow) {
                arrow.setAttribute('aria-expanded', isExpanded);
            }
        }
    };

    /**
     * Collapse the sidebar on page load
     * Sidebar starts collapsed and user can expand it
     */
    function collapseSidebarOnLoad() {
        const sidebar = document.getElementById('main-sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        
        if (sidebar) {
            sidebar.classList.add('collapsed');
            if (sidebarToggle) {
                sidebarToggle.setAttribute('aria-expanded', 'false');
            }
        }
    }

    /**
     * Initialize all form functionality when DOM is ready
     */
    function initAll() {
        initSidebarToggle();
        initSidebarNavigation();
        initSectionToggles();
        collapseAllNavSections();
        collapseSidebarOnLoad();
    }

    // Run initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }

})();
