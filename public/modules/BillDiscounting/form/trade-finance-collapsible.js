/**
 * Trade Finance Collapsible Sections Handler
 * Handles the toggling of .section-content within .form-section
 */
(function () {
    'use strict';

    function initCollapsible() {
        // Use event delegation for section headers
        document.addEventListener('click', function (event) {
            // Handle sidebar toggle (hamburger button)
            const sidebarBtn = event.target.closest('#sidebarToggle');
            if (sidebarBtn) {
                const sidebar = document.getElementById('main-sidebar');
                if (sidebar) {
                    sidebar.classList.toggle('sidebar-mini');
                }
                return;
            }

            // Handle clicking the collapsed sidebar itself to expand it
            const sidebarMini = event.target.closest('.sidebar.sidebar-mini');
            if (sidebarMini) {
                // If clicking content inside the mini sidebar, expand it
                sidebarMini.classList.remove('sidebar-mini');
                return;
            }

            // Handle sidebar navigation accordion
            const navHeader = event.target.closest('.nav-header');
            if (navHeader) {
                const navSection = navHeader.closest('.nav-section');
                if (navSection) {
                    // Close other sections (optional, for true accordion behavior)
                    document.querySelectorAll('.nav-section').forEach(section => {
                        if (section !== navSection) section.classList.remove('expanded');
                    });

                    navSection.classList.toggle('expanded');

                    // Update active state
                    document.querySelectorAll('.nav-header').forEach(h => h.classList.remove('active'));
                    navHeader.classList.add('active');
                }
                return;
            }

            const header = event.target.closest('.section-header');
            if (!header) return;

            const section = header.closest('.form-section');
            if (!section) return;

            // Toggle collapsed class
            section.classList.toggle('collapsed');

            // Find the chevron icon and update if necessary
            // (CSS handles the rotation, but we could add accessibility attributes here)
            const toggleIcon = header.querySelector('.section-toggle');
            if (toggleIcon) {
                const isCollapsed = section.classList.contains('collapsed');
                header.setAttribute('aria-expanded', !isCollapsed);
            }
        });

        // Initialize aria-expanded for all headers
        document.querySelectorAll('.section-header').forEach(header => {
            const section = header.closest('.form-section');
            if (section) {
                const isCollapsed = section.classList.contains('collapsed');
                header.setAttribute('aria-expanded', !isCollapsed);
                header.setAttribute('role', 'button');
                header.setAttribute('tabindex', '0');
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCollapsible);
    } else {
        initCollapsible();
    }
})();
